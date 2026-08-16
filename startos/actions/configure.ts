import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { mount } from '../utils'

const { InputSpec, Value, Variants } = sdk

const inputSpec = InputSpec.of({
  target: Value.union({
    name: i18n('GitLab Instance'),
    description: i18n(
      'Which GitLab this runner serves. The one on this server can create its own token; anything else needs a token you supply.',
    ),
    default: 'local',
    variants: Variants.of({
      local: {
        name: i18n('The GitLab on this server'),
        spec: InputSpec.of({}),
      },
      external: {
        name: i18n('A different GitLab'),
        spec: InputSpec.of({
          url: Value.text({
            name: i18n('GitLab URL'),
            description: i18n(
              'Base URL of the GitLab instance, for example https://gitlab.example.com',
            ),
            required: true,
            default: null,
          }),
          token: Value.text({
            name: i18n('Runner Authentication Token'),
            description: i18n(
              'Create a runner in that GitLab under Settings → CI/CD → Runners, and paste the token it shows. It begins with glrt-.',
            ),
            required: true,
            default: null,
            masked: true,
          }),
        }),
      },
    }),
  }),
  name: Value.text({
    name: i18n('Runner Name'),
    description: i18n('How this runner is labelled in the GitLab UI.'),
    required: false,
    default: 'startos-runner',
  }),
  tags: Value.text({
    name: i18n('Tags'),
    description: i18n(
      'Comma-separated tags. Jobs can target a runner by tag; leave blank to accept any job.',
    ),
    required: false,
    default: null,
  }),
  defaultImage: Value.text({
    name: i18n('Default Job Image'),
    description: i18n(
      'Container image used for jobs whose .gitlab-ci.yml does not name one.',
    ),
    required: true,
    default: 'alpine:latest',
  }),
  concurrent: Value.number({
    name: i18n('Concurrent Jobs'),
    description: i18n(
      'How many jobs run at once. Each one is a full build, so raise this only if the server has headroom.',
    ),
    required: true,
    default: 1,
    min: 1,
    max: 16,
    integer: true,
  }),
})

export const configure = sdk.Action.withInput(
  'configure',

  async ({ effects }) => ({
    name: i18n('Configure'),
    description: i18n(
      'Connect this runner to GitLab and set how it runs jobs.',
    ),
    warning: i18n(
      'Saving re-registers the runner on the next restart. The old registration is left behind in GitLab and can be deleted there.',
    ),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => {
    const s = await storeJson.read().once()
    if (!s) return {}
    return {
      name: s.name || undefined,
      tags: s.tags || undefined,
      defaultImage: s.defaultImage,
      concurrent: s.concurrent,
    }
  },

  async ({ effects, input }) => {
    const local = input.target.selection === 'local'
    let token: string
    let externalUrl = ''

    if (local) {
      // Ask GitLab to mint a runner for us. This is the whole point of the
      // integration: runner *registration* tokens were removed upstream, so a
      // runner must be created server-side first, and doing that by hand means
      // the user copying a token between two pages of the same server.
      const tags = (input.tags ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const res = await effects.action.run<{
        description: string
        tags: string
        runUntagged: boolean
      }>({
        packageId: 'gitlab',
        actionId: 'create-runner-token',
        input: {
          description: input.name || 'startos-runner',
          tags: tags.join(','),
          // A tagged runner that refuses untagged jobs silently ignores most
          // pipelines, which reads as the runner being broken.
          runUntagged: true,
        },
      })

      // ActionResult is a versioned union; only v1 carries `result`.
      const payload =
        res && res.version === '1' && res.result?.type === 'single'
          ? String(res.result.value)
          : ''
      const minted = payload
      if (!minted.startsWith('glrt-')) {
        throw new Error(
          i18n(
            'GitLab did not return a runner token. Check that GitLab is running, then try again.',
          ),
        )
      }
      token = minted
    } else {
      const ext = input.target.value as { url: string; token: string }
      externalUrl = ext.url.replace(/\/+$/, '')
      token = ext.token.trim()
      if (!token.startsWith('glrt-')) {
        throw new Error(
          i18n(
            'That does not look like a runner authentication token — it should begin with glrt-.',
          ),
        )
      }
    }

    await storeJson.merge(effects, {
      token,
      useLocalGitlab: local,
      externalUrl,
      name: input.name ?? 'startos-runner',
      tags: input.tags ?? '',
      defaultImage: input.defaultImage,
      concurrent: input.concurrent,
    })

    // Drop the existing registration so the next start re-registers with these
    // settings. gitlab-runner treats config.toml as authoritative and will not
    // re-register while it exists.
    await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'main' },
      mount,
      'reset-registration',
      async (sub) => {
        await sub.exec(['rm', '-f', '/data/runner/config.toml'])
      },
    )

    return {
      version: '1',
      title: i18n('Saved'),
      message: local
        ? i18n(
            'A runner has been created in GitLab. Restart this service to connect it.',
          )
        : i18n('Settings saved. Restart this service to connect the runner.'),
      result: null,
    }
  },
)
