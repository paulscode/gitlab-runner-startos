#!/usr/bin/env bash
# Brings up a rootless Podman engine, registers the runner if it has not been
# registered yet, then runs it. main.ts supplies the connection details via env.
set -euo pipefail

: "${GITLAB_URL:=}"
: "${RUNNER_TOKEN:=}"
: "${RUNNER_NAME:=startos-runner}"
: "${RUNNER_TAGS:=}"
: "${RUNNER_CONCURRENT:=1}"
: "${RUNNER_IMAGE:=alpine:latest}"

DATA=/data/runner
CONFIG="$DATA/config.toml"
mkdir -p "$DATA"

# Podman needs a writable runtime dir for its socket and transient state, and a
# storage root that survives restarts so job images are not re-pulled every time.
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-$DATA/run}"
STORAGE="$DATA/containers/storage"
mkdir -p "$XDG_RUNTIME_DIR/podman" "$XDG_RUNTIME_DIR/containers" "$STORAGE"
chmod 700 "$XDG_RUNTIME_DIR"
SOCK="$XDG_RUNTIME_DIR/podman/podman.sock"

# --cgroup-manager=cgroupfs because there is no user systemd session in a
# subcontainer, so podman cannot ask systemd to create cgroups for it.
podman --root "$STORAGE" --runroot "$XDG_RUNTIME_DIR/containers" \
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
  gitlab-runner register \
    --non-interactive \
    --config "$CONFIG" \
    --url "$GITLAB_URL" \
    --token "$RUNNER_TOKEN" \
    --name "$RUNNER_NAME" \
    --executor docker \
    --docker-image "$RUNNER_IMAGE" \
    --docker-host "$DOCKER_HOST" \
    --docker-privileged=false \
    --docker-volumes /certs/client
fi

# Concurrency is a top-level config key, not a register flag, so it is applied
# on every start to let the Configure action change it without re-registering.
if command -v sed >/dev/null && [ -f "$CONFIG" ]; then
  if grep -q '^concurrent = ' "$CONFIG"; then
    sed -i "s/^concurrent = .*/concurrent = ${RUNNER_CONCURRENT}/" "$CONFIG"
  else
    sed -i "1i concurrent = ${RUNNER_CONCURRENT}" "$CONFIG"
  fi
fi

exec gitlab-runner run --config "$CONFIG" --working-directory "$DATA"
