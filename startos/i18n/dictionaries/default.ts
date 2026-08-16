export const DEFAULT_LANG = 'en_US'

const dict = {
  'A different GitLab': 0,
  'A runner has been created in GitLab. Restart this service to connect it.': 1,
  'Base URL of the GitLab instance, for example https://gitlab.example.com': 2,
  'Comma-separated tags. Jobs can target a runner by tag; leave blank to accept any job.': 3,
  'Concurrent Jobs': 4,
  'Configure': 5,
  'Connect this runner to GitLab and set how it runs jobs.': 6,
  'Connect this runner to GitLab so it can run jobs': 7,
  'Container image used for jobs whose .gitlab-ci.yml does not name one.': 8,
  'Create a runner in that GitLab under Settings → CI/CD → Runners, and paste the token it shows. It begins with glrt-.': 9,
  'Default Job Image': 10,
  'GitLab Instance': 11,
  'GitLab URL': 12,
  'GitLab did not return a runner token. Check that GitLab is running, then try again.': 13,
  'GitLab is not reachable on the internal network yet. The runner will connect once GitLab is running.': 14,
  'How many jobs run at once. Each one is a full build, so raise this only if the server has headroom.': 15,
  'How this runner is labelled in the GitLab UI.': 16,
  'Not connected to GitLab yet. Run the Configure action.': 17,
  'Registered and waiting for jobs': 18,
  'Runner': 19,
  'Runner Authentication Token': 20,
  'Runner Name': 21,
  'Saved': 22,
  'Saving re-registers the runner on the next restart. The old registration is left behind in GitLab and can be deleted there.': 23,
  'Settings saved. Restart this service to connect the runner.': 24,
  'Starting GitLab Runner!': 25,
  'Store not found': 26,
  'Tags': 27,
  'That does not look like a runner authentication token — it should begin with glrt-.': 28,
  'The GitLab on this server': 29,
  'This device does not meet the minimum requirements to run CI/CD jobs (4 GB of RAM and 2 CPU cores).': 30,
  'Which GitLab this runner serves. The one on this server can create its own token; anything else needs a token you supply.': 31,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
