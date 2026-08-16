import { i18n } from '../i18n'
import { sdk } from '../sdk'

/**
 * The escape hatch from Configure's automatic path.
 *
 * Automatic registration creates an untagged, generically named runner, because
 * a service can only invoke another service's action when that action takes no
 * input — so nothing can be passed to it. Anyone who wants a name and tags set
 * at creation has to run GitLab's own action, which does take them.
 *
 * This queues that action as a task on GitLab. Queuing a task is the mechanism
 * StartOS provides for exactly this: reaching an action a service is not
 * allowed to invoke itself. The user runs it there, copies the token, and
 * returns to Configure to paste it.
 */
export const customRunner = sdk.Action.withoutInput(
  'custom-runner',

  async ({ effects }) => ({
    name: i18n('Create a Custom Runner in GitLab'),
    description: i18n(
      'Ask GitLab to create a runner with a name and tags of your choosing, instead of the automatic one. Adds a task to GitLab; run it there, then paste the token back here with Configure.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    await effects.action.createTask({
      packageId: 'gitlab',
      actionId: 'create-runner-token',
      severity: 'important',
      reason: i18n(
        'Create a runner for GitLab Runner, choosing its name and tags. Copy the token it returns into GitLab Runner’s Configure action.',
      ),
      replayId: 'gitlab-runner:custom-runner',
    })

    return {
      version: '1',
      title: i18n('Added to GitLab'),
      message: i18n(
        'GitLab now has a task to create the runner. Run it there, copy the token, then return here and use Configure to paste it.',
      ),
      result: null,
    }
  },
)
