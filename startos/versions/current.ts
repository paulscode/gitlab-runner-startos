import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '19.2.2:0',
  releaseNotes: {
    en_US:
      'Initial release of GitLab Runner for StartOS. Connects itself to the GitLab on this server and runs each CI/CD job in its own throwaway container via a rootless Podman engine.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
