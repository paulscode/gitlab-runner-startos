import { FileHelper } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

/**
 * The runner's own config, written by `gitlab-runner register`.
 *
 * Read only to answer "has this runner been registered yet?". Its presence is
 * the right signal rather than our stored token: a runner registered out of
 * band is equally valid and would have no token on our side, and a token that
 * GitLab has since revoked would still be sitting in our store.
 *
 * Modelled as text rather than TOML because nothing here parses it -- the file
 * belongs to gitlab-runner, and reading it structurally would invite writing
 * it, which would fight the tool that owns it.
 */
export const runnerConfig = FileHelper.string({
  base: sdk.volumes.main,
  subpath: './runner/config.toml',
})
