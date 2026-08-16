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

- **A real CI job runs to green.** Clones the repo, pulls the helper image and
  the job image, executes the script in a sandboxed container, and uploads an
  artifact that downloads back intact. `helper_image` needed no pinning.

## Still untested

- [ ] A job with a `services:` block (networking between job containers)
- [ ] A job using the cache across runs
- [ ] Concurrent jobs (`concurrent > 1`)

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
