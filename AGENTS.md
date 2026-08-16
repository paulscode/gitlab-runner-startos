# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (the package's technical reference — the only one an AI support or administering agent reads) and `instructions.md` (end-user docs) in sync with your changes.

## This repo


This package runs a rootless Podman engine inside the service container so each
CI job is sandboxed. Three things about that are easy to break and expensive to
discover, because none of them fail until a job actually runs:

- **Podman's runroot must not be on the volume.** It holds locks valid only for
  one boot; a stale copy makes the next job fail creating its cache volume.
  Only the image store belongs on `/data`.
- **Values baked into `config.toml` at registration go stale.** The clone URL
  and the Podman socket are both written once by `gitlab-runner register` and
  then trusted forever. Both are re-asserted on every start; anything similar
  added later needs the same treatment.
- **The clone URL cannot be GitLab's own external URL.** That is an mDNS
  `.local` name with a certificate from the server's own CA, and a job container
  can resolve neither. Registration passes the internal bridge address instead.

Testing means running a real pipeline. Nothing above is visible from
inspection, and the health check only reports whether the runner registered.

