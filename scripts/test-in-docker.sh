#!/usr/bin/env bash
#
# Run the suite inside the official Playwright container.
#
# Two reasons this exists rather than being a one-off command someone typed once:
#
#   1. Reproducing CI locally. The container is the same Linux image the GitHub
#      workflow targets, so "works on my Mac, fails in CI" becomes a question you
#      can answer in two minutes instead of by pushing commits and waiting.
#   2. Escaping host interference. Endpoint-protection agents on developer
#      laptops routinely SIGKILL Playwright's browser processes, which surfaces
#      as dozens of "browserType.launch failed" errors that look like test bugs
#      and are not. Running in the container isolates the framework from that.
#
# The repository is copied INTO the container rather than bind-mounted for
# writing, so a Linux `npm ci` never clobbers the host's macOS node_modules.
#
# Usage:
#   ./scripts/test-in-docker.sh                 # ui-chromium
#   ./scripts/test-in-docker.sh ui-webkit       # a specific project
#   ./scripts/test-in-docker.sh ui-firefox 2    # ...with 2 workers
set -uo pipefail

PROJECT="${1:-ui-chromium}"
WORKERS="${2:-1}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Pin the image to the installed Playwright version: a container whose browsers
# differ from the project's is testing something other than what CI will run.
VERSION="$(node -e "process.stdout.write(require('$REPO_ROOT/node_modules/@playwright/test/package.json').version)" 2>/dev/null)"
if [ -z "$VERSION" ]; then
  echo "Could not read the installed Playwright version. Run 'npm ci' first." >&2
  exit 1
fi
IMAGE="mcr.microsoft.com/playwright:v${VERSION}-noble"

echo "image:   $IMAGE"
echo "project: $PROJECT (workers=$WORKERS)"
echo

docker run --rm --ipc=host \
  -v "$REPO_ROOT":/src:ro \
  -w /work \
  -e CI=1 \
  "$IMAGE" \
  bash -lc "
    cp -a /src/. /work/ 2>/dev/null
    rm -rf /work/node_modules /work/test-results /work/playwright-report /work/blob-report /work/.git
    npm ci --no-audit --no-fund >/tmp/install.log 2>&1 || { echo 'npm ci failed:'; tail -20 /tmp/install.log; exit 1; }
    npx playwright test --project=${PROJECT} --workers=${WORKERS} --reporter=line
  "
