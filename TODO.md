# TODO — GitLab Runner on StartOS

## Verified on hardware

- Builds (132 MB s9pk), installs, declares a hard dependency on GitLab
- **Rootless Podman runs inside the StartOS LXC** — rootless=true,
  networking=pasta, overlay storage driver. This was the project's main
  remaining unknown.
- Registers against the GitLab on this box over the internal bridge and shows
  `online` in GitLab's admin area
- Health check reports "Registered and waiting for jobs"
- Unconfigured state degrades gracefully (stays up, reports needs-configuring)
  rather than crash-looping

## Blocked on the environment, not the package

- [ ] **Run an actual CI job.** Requires pulling a job image, which needs DNS.
      The test box's local resolver is broken — `ping 1.1.1.1` succeeds and
      `nslookup github.com 1.1.1.1` resolves, but the system resolver at
      127.0.0.1 does not answer, so every container inherits a resolver that
      fails. Affects GitLab's container equally, so it is box-level.
      Until that is fixed the following are untested:
        - a plain job
        - a job with a `services:` block (networking between job containers)
        - a job using the cache
        - whether `helper_image` needs pinning

## Remaining before release

- [ ] **Exercise the Configure action through the UI.** The data path it writes
      is verified (token minted by GitLab, stored, runner registered), but the
      form itself and the cross-package `action.run` call have not been driven
      end to end — the CLI cannot supply action input without the UI handshake.
- [ ] README and instructions.md
- [ ] Backup/restore round trip
- [ ] Decide `concurrent` default — gitlab-runner warns that
      `request_concurrency=1` causes job delays against long polling
- [ ] Replace icon.svg

## Deferred

- **aarch64.** Not built: cross-building the Podman stack means an emulated apt
  install, and none of it has run on ARM. Revisit once x86_64 job execution is
  proven.
- **Translations.** English only.
