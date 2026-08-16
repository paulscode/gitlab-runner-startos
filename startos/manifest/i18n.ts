// Marketplace copy. Length limits: short <= 80 chars, long <= 500.
export const short = {
  en_US: 'Runs CI/CD jobs for the GitLab on this server',
}

export const long = {
  en_US:
    'GitLab Runner executes the CI/CD pipelines defined in your projects. It connects itself to the GitLab on this server and runs each job inside its own throwaway container, so a pipeline cannot disturb the runner or anything else on the machine. Jobs run entirely on your own hardware — no external CI service is involved, and nothing about your code leaves the server.',
}

export const dependencyDescription = {
  en_US: 'Provides the projects and pipelines this runner executes jobs for.',
}
