export const DEFAULT_LANG = 'en_US'

const dict = {
  'A different GitLab': 0,
  'A runner has been created in GitLab. Restart this service to connect it.': 1,
  'Added to GitLab': 2,
  'Ask GitLab to create a runner with a name and tags of your choosing, instead of the automatic one. Adds a task to GitLab; run it there, then paste the token back here with Configure.': 3,
  'Base URL of the GitLab instance, for example https://gitlab.example.com': 4,
  'Concurrent Jobs': 5,
  'Configure': 6,
  'Connect this runner to GitLab and set how it runs jobs.': 7,
  'Connect this runner to GitLab so it can run jobs': 8,
  'Container image used for jobs whose .gitlab-ci.yml does not name one.': 9,
  'Create a Custom Runner in GitLab': 10,
  'Create a runner for GitLab Runner, choosing its name and tags. Copy the token it returns into GitLab Runner’s Configure action.': 11,
  'Create a runner in that GitLab under Settings → CI/CD → Runners, and paste the token it shows. It begins with glrt-.': 12,
  'Default Job Image': 13,
  'GitLab Instance': 14,
  'GitLab URL': 15,
  'GitLab did not return a runner token. Check that GitLab is running, then try again.': 16,
  'GitLab is not reachable on the internal network yet. The runner will connect once GitLab is running.': 17,
  'GitLab now has a task to create the runner. Run it there, copy the token, then return here and use Configure to paste it.': 18,
  'How many jobs run at once. Each one is a full build, so raise this only if the server has headroom.': 19,
  'How this runner is labelled in the GitLab UI.': 20,
  'Not connected to GitLab yet. Run the Configure action.': 21,
  'Registered and waiting for jobs': 22,
  'Runner': 23,
  'Runner Authentication Token': 24,
  'Runner Name': 25,
  'Saved': 26,
  'Saving re-registers the runner on the next restart. The old registration is left behind in GitLab and can be deleted there.': 27,
  'Settings saved. Restart this service to connect the runner.': 28,
  'Starting GitLab Runner!': 29,
  'Store not found': 30,
  'That does not look like a runner authentication token — it should begin with glrt-.': 31,
  'The GitLab on this server': 32,
  'This device does not meet the minimum requirements to run CI/CD jobs (4 GB of RAM and 2 CPU cores).': 33,
  'Which GitLab this runner serves. The one on this server can create its own token; anything else needs a token you supply.': 34,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
