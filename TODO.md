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

- **Services work.** A job with a `postgres:16-alpine` service reached it by
  alias and ran a query — container-to-container networking under rootless
  Podman, with `FF_NETWORK_PER_BUILD`.
- **Cache is reused across runs.** Second run reported `Successfully extracted
  cache` and read back the marker the first run wrote.
- **Backup and restore round-trips.** Backed up, uninstalled (volume deleted),
  restored: config.toml checksum, registration token, cached images and data
  size all came back identical, the runner reconnected as `online` in GitLab,
  and a pipeline ran green on it.
- **Concurrency works.** With `concurrent = 2`, two jobs overlapped for the full
  25s of their runtime rather than serialising. The entrypoint's rewrite of
  `concurrent` from the store was applied correctly.

- **Configure runs end to end from the UI.** Submitting the form asked GitLab
  for a runner across the service boundary, got a token back, wrote it to the
  store and registered — GitLab's `runners/verify` accepted the token as runner
  6. An untagged job then ran green on it, confirming that a runner minted with
  no tags and `run_untagged` picks up ordinary pipelines.

## Remaining before release


- Decided: `concurrent` stays at 1 (asymmetric failure modes — queuing is
  visible and harmless, over-subscription gets GitLab OOM-killed), and
  `request_concurrency` is pinned to 4, which is what upstream's warning was
  actually about. Both verified on hardware.

## Deferred

- **aarch64.** Not built: cross-building the Podman stack means an emulated apt
  install, and none of it has run on ARM. Revisit once x86_64 job execution is
  proven.
- **Translations.** English only.
