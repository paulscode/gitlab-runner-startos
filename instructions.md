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

**Runner Name** — how it is labelled in GitLab. Only matters if you run more than one.

**Tags** — leave blank unless you have a reason not to. Tags let a job ask for a particular runner (`tags: [gpu]` in `.gitlab-ci.yml`). With tags set, this runner still accepts untagged jobs, but a job asking for a tag you have not set will wait forever.

**Default Job Image** — used for jobs whose `.gitlab-ci.yml` does not name one. Most projects specify their own.

**Concurrent Jobs** — how many jobs run at once. Each is a full build competing for the same memory and CPU, so raise this only if your server has room to spare.

## Connecting to a different GitLab

You can point this runner at a GitLab somewhere else — a group runner, a project runner, or another server entirely. Choose *A different GitLab* in Configure, and supply its URL along with a runner authentication token.

To get that token: in the other GitLab, go to the settings for the instance, group, or project, open **CI/CD → Runners**, create a new runner, and copy the token it shows. It begins with `glrt-`. GitLab shows it once.

## Things to know

- **Changes need a restart.** Configure saves immediately, but the runner only picks up its settings when it starts.
- **Jobs need internet.** Each job pulls its container image from a public registry unless it has already been pulled once.
- **The first job is slow.** It downloads a helper image and your job image. Later jobs reusing the same image are much quicker.
- **Docker-in-Docker will not work.** Jobs run unprivileged, so pipelines that build container images with `docker:dind` are not supported here.
- **Re-running Configure creates a new runner** in GitLab each time you use *The GitLab on this server*. The old entries stay in the Runners list and can be deleted there.
