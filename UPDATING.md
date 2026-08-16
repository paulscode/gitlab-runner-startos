# Updating GitLab Runner

## Tracking upstream

GitLab Runner releases in lockstep with GitLab itself, so its version should
follow whatever the `gitlab-startos` package is on. Running a runner older than
its GitLab is supported upstream; running one *newer* is not.

Find the current tags:

```sh
T=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:gitlab/gitlab-runner:pull" | jq -r .token)
curl -s -H "Authorization: Bearer $T" \
  "https://registry.hub.docker.com/v2/repositories/gitlab/gitlab-runner/tags?page_size=50&ordering=last_updated" \
  | jq -r '.results[].name' | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head
```

## What to change

Three places, and they must move together:

1. `Dockerfile` — the `FROM gitlab/gitlab-runner:vX.Y.Z AS upstream` tag
2. `startos/versions/current.ts` — `version`
3. `startos/dependencies.ts` — the `versionRange` for GitLab, if the floor moves

## Before releasing a bump

**Run a real pipeline.** The runner's own plumbing is where this package has
broken before, and none of it shows up without executing a job. At minimum:

- a plain job that clones, runs a script, and uploads an artifact
- a job with a `services:` block (container-to-container networking)
- a job using `cache:` run twice (the second must extract the cache)

Watch particularly for anything registration writes into `config.toml` and then
assumes forever — the clone URL and the Podman socket have both bitten already.
Both are re-asserted on every start; if a bump adds a third such value, it needs
the same treatment.

**Check the Podman stack still builds.** The image installs `podman`,
`fuse-overlayfs`, `passt`/`slirp4netns`, `nftables` and `aardvark-dns` from
Debian. A Debian base bump can change their versions independently of the
runner, so a job run after a base change is testing Podman, not GitLab Runner.

**Confirm the executor still talks to Podman.** GitLab Runner targets Docker's
API; Podman implements it compatibly, but that compatibility is a moving target
on both sides. A failure here looks like "getting docker info: failed to connect
to the docker API" or an executor error during `prepare_executor`.
