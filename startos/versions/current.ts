import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '19.2.2:0',
  releaseNotes: {
    en_US:
      `Initial release of GitLab Runner for StartOS. Connects itself to the GitLab on this server and runs each CI/CD job in its own throwaway container via a rootless Podman engine.

Requires GitLab 19.2.2:1 or later, which is the version that lets this package register itself.

**On ARM (aarch64) this build is untested.** It is published so ARM users can try it, but it has never run on ARM hardware, and every job it executes is a nested rootless container — the part most likely to differ by architecture. Take a backup before relying on it, and please report what you find. The x86_64 build has been tested.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
