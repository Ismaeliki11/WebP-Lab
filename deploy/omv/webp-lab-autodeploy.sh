#!/usr/bin/env bash

set -Eeuo pipefail

export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

DEPLOY_ROOT="/docker-compose/webp-lab"
REPO_DIR="${DEPLOY_ROOT}/repo"
RUNTIME_DIR="${DEPLOY_ROOT}/runtime"
STATE_DIR="${RUNTIME_DIR}/state"
ENV_FILE="${RUNTIME_DIR}/webp-lab.env"
LOCK_FILE="/run/lock/webp-lab-autodeploy.lock"
REPO_URL="https://github.com/Ismaeliki11/WebP-Lab.git"
BRANCH="master"
COMPOSE_FILE="${REPO_DIR}/docker-compose.omv.yml"

mkdir -p "${DEPLOY_ROOT}" "${RUNTIME_DIR}" "${STATE_DIR}" "$(dirname "${LOCK_FILE}")"

exec 9>"${LOCK_FILE}"
flock -n 9 || exit 0

if [ ! -d "${REPO_DIR}/.git" ]; then
  git clone --branch "${BRANCH}" "${REPO_URL}" "${REPO_DIR}"
fi

if [ ! -f "${ENV_FILE}" ]; then
  cp "${REPO_DIR}/deploy/omv/webp-lab.env.example" "${ENV_FILE}"
fi

git -C "${REPO_DIR}" fetch --depth 1 origin "${BRANCH}"

REMOTE_COMMIT="$(git -C "${REPO_DIR}" rev-parse "origin/${BRANCH}")"
LAST_DEPLOYED_COMMIT="$(cat "${STATE_DIR}/last_deployed_commit" 2>/dev/null || true)"

if [ "${REMOTE_COMMIT}" = "${LAST_DEPLOYED_COMMIT}" ]; then
  exit 0
fi

git -C "${REPO_DIR}" checkout -B "${BRANCH}" "origin/${BRANCH}"

BASE_PATH="$(awk -F= '/^NEXT_PUBLIC_BASE_PATH=/{print $2}' "${ENV_FILE}" | tail -n 1)"
BASE_PATH="${BASE_PATH%/}"
HEALTH_URL="http://127.0.0.1:3001${BASE_PATH}/api/health"

WEBP_LAB_RUNTIME_ENV_FILE="${ENV_FILE}" docker compose -f "${COMPOSE_FILE}" up -d --build --remove-orphans

for _ in $(seq 1 45); do
  if curl -fsS "${HEALTH_URL}" >/dev/null; then
    printf '%s\n' "${REMOTE_COMMIT}" > "${STATE_DIR}/last_deployed_commit"
    exit 0
  fi
  sleep 2
done

echo "WebP Lab did not become healthy after deployment: ${HEALTH_URL}" >&2
exit 1
