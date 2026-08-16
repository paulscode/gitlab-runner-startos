# GitLab Runner with a rootless Podman engine to sandbox each CI job.
#
# The runner binary is lifted from upstream's official image rather than
# rebuilt, so what runs here is the same artifact GitLab publishes. Everything
# else in this image exists to let a container engine run *inside* the service's
# own container -- see the StartOS nested-OCI-runtime recipe.
#
# Bump the tag here and the version in startos/versions/current.ts together.
FROM gitlab/gitlab-runner:v19.2.2 AS upstream

FROM debian:trixie-slim

# Rootless Podman and its prerequisites:
#   fuse-overlayfs  layered storage; kernel overlayfs-on-overlayfs is denied to
#                   unprivileged users, so this is the only workable driver here
#   uidmap          newuidmap/newgidmap for the nested user namespace
#   passt/slirp4netns  rootless networking for job containers
#   nftables, aardvark-dns  netavark's backend and DNS between job containers
#   git             the runner shells out to git to fetch sources; without it
#                   every job fails at the clone step
#   ca-certificates so jobs and the runner can verify TLS
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      podman fuse-overlayfs uidmap iproute2 iptables nftables aardvark-dns \
      passt slirp4netns git ca-certificates \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

COPY --from=upstream /usr/bin/gitlab-runner /usr/bin/gitlab-runner

# Unqualified image names in .gitlab-ci.yml (`image: alpine`) must resolve
# somewhere; Docker Hub matches what CI authors expect.
RUN mkdir -p /etc/containers \
 && printf 'unqualified-search-registries = ["docker.io"]\n' \
      > /etc/containers/registries.conf

# Non-root user plus subordinate ranges for the nested user namespace. The range
# must sit inside the subcontainer's own userns (0..65535) and must not overlap
# the user's own uid, so it starts at 1001 rather than 1.
RUN useradd --create-home --uid 1000 --shell /bin/bash runner \
 && echo 'runner:1001:64535' > /etc/subuid \
 && echo 'runner:1001:64535' > /etc/subgid

COPY assets/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER runner
WORKDIR /home/runner
