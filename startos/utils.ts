import { sdk } from './sdk'

/** Everything the runner owns lives under one volume mount. */
export const DATA_DIR = '/data'

export const mount = sdk.Mounts.of().mountVolume({
  volumeId: 'main',
  subpath: null,
  mountpoint: DATA_DIR,
  readonly: false,
})

/**
 * Below this a CI job is not worth attempting: every job pulls an image and
 * runs a build inside a nested container. os.totalmem() inside a service
 * container reports what StartOS grants it -- the host's RAM less its own
 * reserve -- so these thresholds sit below the nominal machine size.
 */
export const MIN_MEMORY_BYTES = 1.5 * 1024 ** 3
export const MIN_CPU_CORES = 2
