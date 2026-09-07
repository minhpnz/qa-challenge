#!/usr/bin/env bash
#
# Regenerate docs/images/*.png from a real Chromium run inside the Playwright
# container, so the README always shows the suite as it actually stands.
#
#   ./scripts/capture-report-images.sh
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(node -e "process.stdout.write(require('$REPO_ROOT/node_modules/@playwright/test/package.json').version)" 2>/dev/null)"
[ -z "$VERSION" ] && { echo "Run 'npm ci' first." >&2; exit 1; }

mkdir -p "$REPO_ROOT/docs/images"
docker run --rm --ipc=host \
  -v "$REPO_ROOT":/src:ro \
  -v "$REPO_ROOT/docs/images":/out \
  -w /work -e CI=1 \
  "mcr.microsoft.com/playwright:v${VERSION}-noble" \
  bash -lc '
    cp -a /src/. /work/ 2>/dev/null
    rm -rf /work/node_modules /work/test-results /work/playwright-report /work/.git
    npm ci --no-audit --no-fund >/tmp/i.log 2>&1 || { echo "npm ci failed"; tail -5 /tmp/i.log; exit 1; }
    # Two workers, matching the CI matrix, so the captured report reflects the
    # configuration the suite is actually graded in rather than a gentler one.
    npx playwright test --project=ui-chromium --workers=2 --reporter=html 2>&1 | tail -3
    npx playwright show-report --host 127.0.0.1 --port 9323 >/tmp/serve.log 2>&1 &
    sleep 8
    node /work/scripts/screenshot-report.js && echo "captured" || { echo "capture failed"; tail -5 /tmp/serve.log; }
  '
