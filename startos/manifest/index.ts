import { setupManifest } from '@start9labs/start-sdk'
import { dependencyDescription, long, short } from './i18n'

export const manifest = setupManifest({
  id: 'gitlab-runner',
  title: 'GitLab Runner',
  license: 'MIT',
  packageRepo: 'https://github.com/paulscode/gitlab-runner-startos',
  upstreamRepo: 'https://gitlab.com/gitlab-org/gitlab-runner',
  marketingUrl: 'https://docs.gitlab.com/runner/',
  donationUrl: null,
  description: { short, long },
  volumes: ['main'],
  images: {
    main: {
      // Built here rather than pulled: upstream's image carries the runner but
      // not the rootless Podman engine needed to sandbox jobs inside a StartOS
      // service. The runner binary itself is copied from that image unmodified.
      source: { dockerBuild: { workdir: '.' } },
      // aarch64 is deliberately absent. Cross-building this image means an
      // emulated apt install of the whole Podman stack, and none of it has run
      // on ARM hardware. Add it once the x86_64 executor is proven.
      arch: ['x86_64'],
    },
  },
  dependencies: {
    gitlab: {
      description: dependencyDescription,
      optional: false,
      metadata: {
        title: 'GitLab',
        icon: 'https://raw.githubusercontent.com/paulscode/gitlab-startos/master/icon.svg',
      },
    },
  },
  // Runs a nested OCI engine to isolate each CI job:
  //   userspaceFilesystems -> /dev/fuse, for fuse-overlayfs storage
  //   virtualNetworking    -> /dev/net/tun, for slirp4netns/pasta job networking
  userspaceFilesystems: true,
  virtualNetworking: true,
  // A CI job is a full build: compilers, image pulls, nested containers. Below
  // this there is no point starting.
  hardwareRequirements: {
    ram: 2048,
  },
})
