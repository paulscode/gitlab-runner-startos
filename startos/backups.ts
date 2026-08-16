import { sdk } from './sdk'

/**
 * Backs up the runner's registration and settings.
 *
 * Deliberately includes the cached job images and build directories under
 * /data/runner as well -- excluding them would mean a second volume and more
 * moving parts than the data is worth. They are rebuildable, so a restore that
 * dropped them would still be correct, just slower on the first job afterwards.
 */
export const { createBackup, restoreInit } = sdk.setupBackups(
  async ({ effects }) => sdk.Backups.ofVolumes('main'),
)
