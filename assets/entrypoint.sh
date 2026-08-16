#!/usr/bin/env bash
# Brings up a rootless Podman engine, registers the runner if it has not been
# registered yet, then runs it. main.ts supplies the connection details via env.
set -euo pipefail

: "${GITLAB_URL:=}"
: "${RUNNER_TOKEN:=}"
: "${RUNNER_NAME:=startos-runner}"
: "${RUNNER_CONCURRENT:=1}"
: "${RUNNER_REQUEST_CONCURRENCY:=4}"
: "${RUNNER_IMAGE:=alpine:latest}"

DATA=/data/runner
CONFIG="$DATA/config.toml"
mkdir -p "$DATA"

# Two Podman directories with opposite lifetimes, and getting this wrong is
# subtle: the *storage* root holds images and must persist so every job does not
# re-pull them, but the *runroot* holds locks and transient container state and
# must NOT. Left on the volume, stale locks survive a restart and the next job
# dies with "deadlock due to lock mismatch" while creating its cache volume.
#
# So runroot lives in the container's own rootfs, which StartOS rebuilds on each
# start, and only the image store is on the volume.
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp/podman-run}"
STORAGE="$DATA/containers/storage"
RUNROOT="$XDG_RUNTIME_DIR/containers"
mkdir -p "$XDG_RUNTIME_DIR/podman" "$RUNROOT" "$STORAGE"
chmod 700 "$XDG_RUNTIME_DIR"
SOCK="$XDG_RUNTIME_DIR/podman/podman.sock"

# --cgroup-manager=cgroupfs because there is no user systemd session in a
# subcontainer, so podman cannot ask systemd to create cgroups for it.
# Podman records the runroot it was last used with inside the image store and
# refuses to start if the two disagree. That can only happen when the runroot
# has moved, which makes the recorded state stale rather than valuable -- and
# the store holds nothing but re-pullable images. Detect it by asking the store
# directly rather than by parsing an error, and clear it.
if [ -f "$STORAGE/db.sql" ] && ! grep -qa -- "$RUNROOT" "$STORAGE/db.sql" 2>/dev/null; then
  echo "Podman image store references a stale runroot; resetting it." >&2
  rm -rf "${STORAGE:?}"/* 2>/dev/null || true
fi

podman --root "$STORAGE" --runroot "$RUNROOT" \
       --cgroup-manager=cgroupfs system service -t 0 "unix://$SOCK" &
PODMAN_PID=$!

# gitlab-runner's docker executor talks to this socket. Podman's API is
# Docker-compatible, which is what makes the substitution work at all.
export DOCKER_HOST="unix://$SOCK"

# Wait for the API to actually answer rather than for the socket file to exist,
# so the runner does not race a half-started engine.
ready=0
for _ in $(seq 1 60); do
  if podman --remote --url "unix://$SOCK" info >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  echo "podman did not become ready; CI jobs cannot run" >&2
  exit 1
fi

shutdown() { kill "$PODMAN_PID" 2>/dev/null || true; }
trap shutdown EXIT

# Register once. config.toml is the marker: a runner registered out of band is
# equally valid, so its presence -- not our stored token -- decides.
if [ ! -f "$CONFIG" ]; then
  if [ -z "$GITLAB_URL" ] || [ -z "$RUNNER_TOKEN" ]; then
    echo "Not configured yet. Run the Configure action to connect this runner" >&2
    echo "to GitLab, then restart the service." >&2
    # Stay up so the health check can report "needs configuring" rather than
    # crash-looping, which would tell the user nothing.
    exec sleep infinity
  fi

  echo "Registering '$RUNNER_NAME' with $GITLAB_URL ..."
  # --token takes a glrt- runner authentication token. Registration tokens were
  # removed upstream; the runner is created server-side first and handed this.
  # --clone-url is not optional here. GitLab hands each job its own
  # external_url to clone from, which on StartOS is an mDNS .local name with a
  # certificate signed by the server's own CA. A job container can resolve
  # neither, so without this every job dies at "Could not resolve host". The
  # bridge address is plain HTTP and reachable from inside the job's network.
  gitlab-runner register \
    --non-interactive \
    --config "$CONFIG" \
    --url "$GITLAB_URL" \
    --clone-url "$GITLAB_URL" \
    --token "$RUNNER_TOKEN" \
    --name "$RUNNER_NAME" \
    --executor docker \
    --docker-image "$RUNNER_IMAGE" \
    --docker-host "$DOCKER_HOST" \
    --docker-privileged=false \
    --docker-volumes /certs/client \
    --request-concurrency "$RUNNER_REQUEST_CONCURRENCY"
fi

# Concurrency is a top-level config key, not a register flag, so it is applied
# on every start to let the Configure action change it without re-registering.
if [ -f "$CONFIG" ]; then
  # Re-assert where GitLab is. StartOS reassigns external ports whenever a
  # package is reinstalled or restored, so the address captured at registration
  # goes stale -- and nothing reports it: the runner simply stops collecting
  # jobs, which reads as GitLab having no runner rather than a bad address.
  if [ -n "$GITLAB_URL" ]; then
    sed -i -E "s|^([[:space:]]*)url = \".*\"|\1url = \"$GITLAB_URL\"|" "$CONFIG"
    if grep -qE '^[[:space:]]*clone_url = ' "$CONFIG"; then
      sed -i -E "s|^([[:space:]]*)clone_url = \".*\"|\1clone_url = \"$GITLAB_URL\"|" "$CONFIG"
    fi
  fi

  # Limits how many job-request connections the runner holds open to GitLab --
  # distinct from `concurrent`, which limits how many jobs actually run. At 1 a
  # pipeline can sit pending for GitLab's whole long-poll timeout even with an
  # idle runner, which is what most "CI is slow" complaints actually are. Costs
  # a couple of idle HTTP connections to a GitLab on the same box.
  if grep -qE '^[[:space:]]*request_concurrency = ' "$CONFIG"; then
    sed -i -E "s|^([[:space:]]*)request_concurrency = .*|\1request_concurrency = ${RUNNER_REQUEST_CONCURRENCY}|" "$CONFIG"
  else
    sed -i -E "0,/^\[\[runners\]\]/s||[[runners]]\n  request_concurrency = ${RUNNER_REQUEST_CONCURRENCY}|" "$CONFIG"
  fi

  # Re-assert the podman socket. `--docker-host` is written into the
  # [runners.docker] section as `host`, at registration time, so a change to the
  # runtime dir leaves the runner dialling a socket that no longer exists -- and
  # nothing reports it until a job is picked up and fails to prepare.
  if grep -qE '^[[:space:]]*host = "unix://.*podman\.sock"' "$CONFIG"; then
    sed -i -E "s|^([[:space:]]*)host = \"unix://.*podman\.sock\"|\1host = \"$DOCKER_HOST\"|" "$CONFIG"
  fi
fi

if command -v sed >/dev/null && [ -f "$CONFIG" ]; then
  if grep -q '^concurrent = ' "$CONFIG"; then
    sed -i "s/^concurrent = .*/concurrent = ${RUNNER_CONCURRENT}/" "$CONFIG"
  else
    sed -i "1i concurrent = ${RUNNER_CONCURRENT}" "$CONFIG"
  fi
fi

exec gitlab-runner run --config "$CONFIG" --working-directory "$DATA"
