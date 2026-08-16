import { sdk } from './sdk'

/**
 * The runner registers and polls over GitLab's HTTP API, so GitLab must be both
 * installed and actually serving -- not merely present. Gating on its `primary`
 * health check means main starts only once the API will answer.
 *
 * A hard dependency even when the user points this at an external GitLab: the
 * package exists to serve the instance on this box, and a runner attached
 * elsewhere is the exception rather than the design.
 */
export const setDependencies = sdk.setupDependencies(async ({ effects }) => ({
  gitlab: {
    kind: 'running',
    versionRange: '>=19.2.2:0',
    healthChecks: ['primary'],
  },
}))
