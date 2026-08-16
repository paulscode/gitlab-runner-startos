import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

/**
 * StartOS-side state. The runner's own configuration lives in config.toml,
 * which `gitlab-runner register` owns; this holds only what StartOS needs to
 * decide *what* to register.
 */
const shape = z
  .object({
    /**
     * A `glrt-` runner authentication token. Either minted by GitLab on this
     * server (via its create-runner-token action) or pasted by the user for a
     * runner belonging to a group, a project, or another instance entirely.
     */
    token: z.string().catch(''),

    /**
     * Set when the token came from the GitLab on this box, so the runner knows
     * to resolve that instance over the internal bridge rather than expecting
     * a user-supplied URL.
     */
    useLocalGitlab: z.boolean().catch(true),

    /** Only meaningful when useLocalGitlab is false. */
    externalUrl: z.string().catch(''),

    name: z.string().catch('startos-runner'),
    tags: z.string().catch(''),
    concurrent: z.number().int().catch(1),
    /** Image used for jobs that do not specify one. */
    defaultImage: z.string().catch('alpine:latest'),
  })
  .strip()

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: './store.json' },
  shape,
)
