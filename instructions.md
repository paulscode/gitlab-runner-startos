# GitLab Runner

## Documentation

- [GitLab CI/CD](https://docs.gitlab.com/ci/) — writing the `.gitlab-ci.yml` files that define your pipelines.
- [GitLab Runner documentation](https://docs.gitlab.com/runner/) — how runners work and every configuration option.
- [Runner advanced configuration](https://docs.gitlab.com/runner/configuration/advanced-configuration.html) — reference for `config.toml`.

## What this gives you

Pipelines that actually run. GitLab defines your CI/CD jobs, but something has to execute them — that is this. Without a runner, every pipeline sits at "pending" forever.

Each job runs inside its own fresh container that is thrown away afterwards, so one job cannot affect the next, the runner, or anything else on your server. Everything happens on your own hardware; no external CI service is involved and nothing about your code leaves the machine.

## Getting set up

1. Run the **Configure** action.
2. Leave **GitLab Instance** set to *The GitLab on this server*. A runner is created in GitLab for you — there is no token to copy.
3. Adjust the other settings if you want to (see below), and save.
4. **Restart the service.** The runner connects when it starts, so the change does not take effect until you do.

That is it. Push a project containing a `.gitlab-ci.yml` and its pipelines will start running.

You can confirm it worked in GitLab under **Admin Area → CI/CD → Runners**, where it should appear online.

## The settings

**Runner Name** — how it is labelled in GitLab. Only matters if you run more than one. Note that this labels the *service*, not the runner entry GitLab creates for you: that one is always called "StartOS Runner", and you can rename it in GitLab.

**Default Job Image** — used for jobs whose `.gitlab-ci.yml` does not name one. Most projects specify their own.

**Concurrent Jobs** — how many jobs run at once. Each is a full build competing for the same memory and CPU as GitLab itself, so raise this only once you know what your own pipelines cost. If the server runs short of memory it will shut down whichever service is using the most, and that is usually GitLab.

If pipelines feel slow to *start* rather than slow to run, that is a different thing and is already handled — the runner is configured to keep several job requests open to GitLab rather than upstream's default of one.

## Tags

The runner created for you has no tags and accepts every job, which is what you want unless you run several runners and need jobs to pick between them.

Tags cannot be set from here, because of how the two services talk to each other — one service can ask another to do something, but cannot pass it any details. There are two ways round it:

- Create the runner as usual, then add tags to it in GitLab under **Admin Area → CI/CD → Runners**. Nothing needs restarting.
- Or run the **Create a Custom Runner in GitLab** action, which adds a task to GitLab where you can set the name and tags yourself. Run it there, copy the token, then come back and paste it into Configure under *A different GitLab*, using this server's GitLab URL.

Once a runner has tags it still accepts untagged jobs, but a job asking for a tag you have not set will wait forever.

## Connecting to a different GitLab

You can point this runner at a GitLab somewhere else — a group runner, a project runner, or another server entirely. Choose *A different GitLab* in Configure, and supply its URL along with a runner authentication token.

To get that token: in the other GitLab, go to the settings for the instance, group, or project, open **CI/CD → Runners**, create a new runner, and copy the token it shows. It begins with `glrt-`. GitLab shows it once.

## Things to know

- **Changes need a restart.** Configure saves immediately, but the runner only picks up its settings when it starts.
- **Jobs need internet.** Each job pulls its container image from a public registry unless it has already been pulled once.
- **The first job is slow.** It downloads a helper image and your job image. Later jobs reusing the same image are much quicker.
- **Docker-in-Docker will not work.** Jobs run unprivileged, so pipelines that build container images with `docker:dind` are not supported here.
- **On ARM hardware this is untested.** The ARM build has never been run. If your server is ARM, take a backup before depending on it.
- **Re-running Configure creates a new runner** in GitLab each time you use *The GitLab on this server*. The old entries stay in the Runners list and can be deleted there.
- **GitLab has to be running** when you use *The GitLab on this server*, since it is GitLab that creates the runner.
