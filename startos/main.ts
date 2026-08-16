import { cpus, totalmem } from 'os'
import { mainHostId as gitlabHostId, uiPort } from 'gitlab-startos/startos/utils'
import { configure } from './actions/configure'
import { runnerConfig } from './fileModels/runnerConfig'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { DATA_DIR, MIN_CPU_CORES, MIN_MEMORY_BYTES, mount } from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting GitLab Runner!'))

  // Refuse hardware that cannot run a build rather than accepting jobs and
  // failing them one by one, which looks like a GitLab fault rather than a
  // capacity one.
  if (totalmem() < MIN_MEMORY_BYTES || cpus().length < MIN_CPU_CORES) {
    throw new Error(
      i18n(
        'This device does not meet the minimum requirements to run CI/CD jobs (4 GB of RAM and 2 CPU cores).',
      ),
    )
  }

  const store = await storeJson.read().const(effects)
  if (!store) throw new Error(i18n('Store not found'))

  /**
   * Where to reach GitLab.
   *
   * For the instance on this box, that is the internal bridge: plain HTTP, so
   * there is no certificate for the runner to trust, and independent of which
   * gateways the user has enabled. `.const()` re-runs main exactly when
   * GitLab's binding changes -- install, uninstall, port reassignment -- and
   * not on its updates.
   *
   * The host id and port are imported from the GitLab package rather than
   * duplicated, so a change there is a compile error here rather than a
   * silently dead address.
   */
  const bridgeAddr = await sdk.host
    .getBridgeAddress(effects, {
      packageId: 'gitlab',
      hostId: gitlabHostId,
      internalPort: uiPort,
      ssl: false,
    })
    .const()

  const gitlabUrl = store.useLocalGitlab
    ? bridgeAddr
      ? `http://${bridgeAddr}`
      : null
    : store.externalUrl || null

  if (store.useLocalGitlab && !gitlabUrl) {
    throw new Error(
      i18n(
        'GitLab is not reachable on the internal network yet. The runner will connect once GitLab is running.',
      ),
    )
  }

  const subcontainer = sdk.SubContainer.of(
    effects,
    { imageId: 'main' },
    mount,
    'gitlab-runner-sub',
  )

  return sdk.Daemons.of(effects)
    .addOneshot('own-data', {
      subcontainer,
      exec: {
        // The runner and Podman run as an unprivileged user, so they need to
        // own their working area on the volume. StartOS's own store.json sits
        // at the volume root and is deliberately left alone.
        command: [
          'sh',
          '-c',
          `mkdir -p ${DATA_DIR}/runner && chown -R runner:runner ${DATA_DIR}/runner`,
        ],
        user: 'root',
      },
      requires: [],
    })
    .addDaemon('primary', {
      subcontainer,
      exec: {
        command: ['/usr/local/bin/entrypoint.sh'],
        user: 'runner',
        env: {
          GITLAB_URL: gitlabUrl ?? '',
          RUNNER_TOKEN: store.token,
          RUNNER_NAME: store.name || 'startos-runner',
          RUNNER_TAGS: store.tags,
          RUNNER_CONCURRENT: String(store.concurrent),
          // Not user-facing: this governs how many job-request connections the
          // runner keeps open to GitLab, not how many jobs run. Leaving it at
          // the upstream default of 1 makes pipelines sit pending for the whole
          // long-poll timeout even when the runner is idle.
          RUNNER_REQUEST_CONCURRENCY: '4',
          RUNNER_IMAGE: store.defaultImage,
          // Deliberately the container's own rootfs, not the volume: this
          // holds Podman's locks and transient state, which must not survive a
          // restart. See the note in assets/entrypoint.sh.
          XDG_RUNTIME_DIR: '/tmp/podman-run',
        },
      },
      ready: {
        display: i18n('Runner'),
        // Podman has to come up and the runner has to register before this can
        // pass; neither is instant on a cold start.
        gracePeriod: 120_000,
        // Registration state is steady rather than flapping, so poll slowly.
        trigger: sdk.trigger.cooldownTrigger(30_000),
        fn: async () =>
          (await runnerConfig.read().const(effects))
            ? {
                result: 'success' as const,
                message: i18n('Registered and waiting for jobs'),
              }
            : {
                result: 'failure' as const,
                message: i18n(
                  'Not connected to GitLab yet. Run the Configure action.',
                ),
              },
      },
      requires: ['own-data'],
    })
    .addOneshot('prompt-configure', {
      subcontainer,
      exec: {
        fn: async () => {
          // Nudge the user only when there is genuinely nothing to run with.
          // Once registered, config.toml exists and this stays quiet.
          if (!store.token && !(await runnerConfig.read().once())) {
            await sdk.action.createOwnTask(effects, configure, 'important', {
              reason: i18n('Connect this runner to GitLab so it can run jobs'),
            })
          }
          return null
        },
      },
      requires: ['primary'],
    })
})
