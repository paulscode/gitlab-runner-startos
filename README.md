<p align="center">
  <img src="icon.svg" alt="GitLab Runner Logo" width="21%">
</p>

# GitLab Runner on StartOS

> Everything not listed in this document should behave the same as upstream
> GitLab Runner. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

GitLab Runner executes the CI/CD jobs defined in a GitLab instance's projects ([gitlab-org/gitlab-runner](https://gitlab.com/gitlab-org/gitlab-runner)). This package pairs it with a rootless Podman engine so each job runs in its own throwaway container, and wires it to the GitLab package on the same server.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Troubleshooting](#troubleshooting)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The image is built here rather than pulled, because upstream's image carries the runner but not a container engine — and a runner with no engine cannot execute anything. The runner binary itself is copied unmodified out of upstream's official image; everything added around it exists to make a container engine work *inside* a container.

| | |
| --- | --- |
| Image source | Custom Dockerfile: Debian + rootless Podman + upstream's `gitlab-runner` binary |
| Architectures | x86_64 |
| Entrypoint | Custom (`assets/entrypoint.sh`) |

The package declares two manifest flags that StartOS provides specifically for a nested OCI runtime: `userspaceFilesystems` (grants `/dev/fuse`, since kernel overlayfs-on-overlayfs is denied to unprivileged users) and `virtualNetworking` (grants `/dev/net/tun` for rootless job networking). The service's own container remains user-namespaced and AppArmor-confined; nothing about the host's posture changes.

**Podman rather than Docker.** GitLab's `docker` executor talks to a Docker-compatible API, which Podman provides, and rootless Podman needs no workaround to run inside a StartOS service. Rootful Docker would require patching around a sysctl that `runc` cannot apply across a nested user namespace.

The package runs a single subcontainer, **`gitlab-runner-sub`**, hosting both the Podman engine and the runner. Attach with:

```
start-cli package attach gitlab-runner
```

Job containers are children of the Podman engine inside that subcontainer; they are not StartOS subcontainers and do not appear in StartOS tooling.

## Volume and Data Layout

One volume, mounted at `/data`. What matters here is which parts of Podman's state live on it, because getting that wrong breaks jobs in ways that only appear after a restart.

| Path | Persistent | Contents |
| --- | --- | --- |
| `/data/store.json` | yes | StartOS-side settings (see File Models) |
| `/data/runner/config.toml` | yes | The runner's registration, written by `gitlab-runner register` |
| `/data/runner/containers/storage` | yes | Podman's **image store** — cached job images |
| `/data/runner/builds` | yes | Job working directories |
| `/tmp/podman-run` | **no** | Podman's **runroot** — locks and transient container state |

The split is deliberate. The image store must persist, or every job re-pulls its image. The runroot must **not**: it holds lock state that is only valid for the lifetime of one boot, and a stale copy makes the next job fail while creating its cache volume. It therefore lives in the container's own filesystem, which StartOS rebuilds on each start.

## File Models

Two files are modelled, and the division between them is the thing to understand: one is owned by this package, the other by `gitlab-runner`.

**`store.json`** (`/data/store.json`) is StartOS-side state only: the runner authentication token, whether it targets the GitLab on this server or an external one, the runner's name and tags, the default job image, and the concurrency limit. It is created at install with defaults and written only by the Configure action.

**`config.toml`** (`/data/runner/config.toml`) belongs to `gitlab-runner`, which writes it at registration. This package reads it to answer one question — *has this runner registered?* — and rewrites exactly two keys on every start:

- `concurrent`, so the Configure action can change it without re-registering
- `url` and `clone_url`, because StartOS reassigns external ports whenever a package is reinstalled or restored, and a stale address here does not announce itself — the runner simply stops collecting jobs, which looks like GitLab having no runner
- the Podman socket under `[runners.docker]`, because it is baked in at registration and would otherwise leave the runner dialling a socket that no longer exists after the runtime directory moves

Everything else in that file is left alone, including anything you edit by hand. A hand edit to those four keys will not survive a restart.

Because registration data lives in `config.toml`, the Configure action **deletes it** so the next start re-registers with the new settings.

## Dependencies

**GitLab** — required, and enforced as `kind: 'running'` gated on its `primary` health check, so this service starts only once GitLab's API will actually answer.

No volume of GitLab's is mounted. The two communicate over the network, not the filesystem.

The dependency holds even when the runner is pointed at an external GitLab. The package exists to serve the instance on this server; attaching it elsewhere is a supported exception rather than the design.

## Network Access and Interfaces

**None.** The runner makes outbound long-poll requests to GitLab and accepts no inbound connections, so it binds no port and exposes no interface.

It reaches the GitLab on this server over the internal bridge on plain HTTP. That is deliberate: there is no certificate for the runner to trust, and it does not depend on which gateways the user has enabled for GitLab.

Jobs themselves need outbound internet to pull images from public registries.

## Installation and First-Run Flow

The runner starts before it is configured, and this is intentional. With no token it stays running and reports that it needs configuring, rather than exiting — a crash-looping service tells the user nothing about what to do.

Registration is a two-step handshake with GitLab that the package performs for you. GitLab removed shared registration tokens, so a runner must now be created server-side first and handed its own authentication token. The Configure action invokes an action on the **GitLab package** to create that runner and return its token, then stores it. Doing it by hand means copying a token between two pages of the same server.

Registration happens on the next **restart** after configuring, not at the moment you save.

## Actions

One action.

**Configure** — Run after installing, and again whenever you want to change how jobs run. Choose the GitLab on this server (a token is created for you) or a different instance (paste a token beginning with `glrt-`), and set the runner's name, tags, default job image, and concurrency.

Writes `store.json` and **deletes `config.toml`** so the next start re-registers. Instant, but **requires a restart to take effect**. Safe to repeat, with one consequence worth knowing: each run against the local GitLab creates a **new** runner server-side, so repeated use leaves stale runner entries in GitLab's admin area to delete.

## Tasks

One task, raised once when the runner starts with no token and no existing registration — the state a fresh install is in. Severity `important`, so it is prominent without blocking the service. Running Configure and restarting clears it. It does not return once the runner is registered.

## Health Checks

One check, `Runner`, with a two-minute grace period covering Podman starting and registration completing.

It reports healthy when `config.toml` exists. That file — rather than the stored token — is the signal deliberately: a runner registered out of band is equally valid and would have no token on this side, and a token that GitLab has since revoked would still be sitting in the store.

So a **failing** check means "not registered", which is a configuration state, not a fault. It does not tell you whether jobs are succeeding; GitLab is the place to see that. A runner that is healthy here but never picks up jobs is usually a tag mismatch — see Troubleshooting.

## Backups and Restore

The strategy is a wholesale volume copy (`ofVolumes`) of the single `main` volume, taken with the service stopped.

That captures the registration and settings — what actually matters — along with cached job images and build directories, which are rebuildable and included only because separating them would cost a second volume for no real benefit. Expect the backup to be larger than the runner's useful state, growing with the number of distinct job images pulled.

A restored runner reconnects on its own: the registration in `config.toml` is still valid, provided the runner still exists in GitLab. If it was deleted there, run Configure to create a new one.

## Limitations and Differences

1. **Only the `docker` executor is available.** `shell`, `kubernetes`, and the VM executors are not configured and have no engine behind them here.
2. **Privileged jobs are not supported.** Containers run unprivileged, so Docker-in-Docker (`docker:dind`) and anything else requiring privileged mode will not work.
3. **Jobs cannot bind host ports.** Nothing a job runs is reachable from outside the service.
4. **One runner per install.** The package registers a single runner; upstream supports several in one `config.toml`.
5. **`concurrent` is capped at 16** by the Configure action, and defaults to 1. Every concurrent job is a full build competing for the same RAM and CPU.
6. **`request_concurrency` is not exposed.** The runner logs advice about raising it to reduce job-start latency against GitLab's long polling; there is currently no way to do so through this package.
7. **aarch64 is not built.** Cross-building the Podman stack requires emulation and has not been validated on ARM hardware.
8. **Nested containers cannot use IPv6** by default — rootless networking is IPv4-only.

## Troubleshooting

**Health check says "Not connected to GitLab yet".**
The runner has no registration. Run Configure, then restart. If you already did, check the service logs for a registration error — a token GitLab has revoked will fail here.

**Jobs stay "pending" in GitLab forever.**
GitLab has no runner willing to take them. Check Admin Area → CI/CD → Runners: if this runner is offline, look at the service logs; if it is online, the cause is almost always tags — a job with tags will only run on a runner carrying them. Clearing this runner's tags in Configure makes it accept any job.

**Job fails with "Could not resolve host" while cloning.**
The runner is cloning from an address the job container cannot resolve. This package registers with a clone URL pointing at the internal bridge specifically to avoid that; if you see it, the registration predates that setting — run Configure and restart to re-register.

**Job fails preparing with "deadlock due to lock mismatch".**
Podman's lock state is inconsistent with its image store. Restarting the service clears it: the runtime directory is rebuilt on each start, and the image store resets itself when it finds a stale reference.

**Job fails to pull any image.**
The job container has no working DNS or no internet. Confirm the server itself can resolve — a resolver advertised by a VPN interface that no longer works will break every container on the box, not just this one.

**Jobs are slow to start.**
Each job pulls its image unless it is already in the local store, and the first job after an install pulls the helper image too. Repeated jobs on the same image are much faster.

---

## Quick Reference for AI Consumers

```yaml
package_id: gitlab-runner
image: custom (debian + podman + upstream gitlab-runner binary)
architectures: [x86_64]
subcontainers: [gitlab-runner-sub]
volumes:
  main: /data
file_models:
  - store.json
  - runner/config.toml
startos_managed_env_vars:
  - GITLAB_URL
  - RUNNER_TOKEN
  - RUNNER_NAME
  - RUNNER_TAGS
  - RUNNER_CONCURRENT
  - RUNNER_IMAGE
  - XDG_RUNTIME_DIR
dependencies: [gitlab]
interfaces: none
actions:
  - configure
tasks:
  - { action: configure, severity: important }
health_checks:
  - primary
```
