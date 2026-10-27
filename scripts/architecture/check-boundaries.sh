#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

failed=0

echo "Running architecture boundary checks..."

# packages/* must stay framework-agnostic and never import app aliases.
if rg -n "from\\s+\"@/" packages -g "*.ts" -g "*.tsx" >/dev/null 2>&1; then
    echo "error: packages must not import app alias '@/...'."
    rg -n "from\\s+\"@/" packages -g "*.ts" -g "*.tsx" || true
    failed=1
fi

# Outside a module, consumers must import public entrypoints only (not deep paths).
# Files inside apps/web/src/modules/** may use deep @/modules/... paths or relatives.
if rg -n "from\\s+\"@/modules/[^\\\"]+/[^\\\"]+/[^\\\"]+\"" apps/web/src/app apps/web/src/components apps/web/src/context apps/web/src/lib -g "*.ts" -g "*.tsx" >/dev/null 2>&1; then
    echo "error: deep module imports outside modules/ are forbidden; import from module public entrypoints."
    rg -n "from\\s+\"@/modules/[^\\\"]+/[^\\\"]+/[^\\\"]+\"" apps/web/src/app apps/web/src/components apps/web/src/context apps/web/src/lib -g "*.ts" -g "*.tsx" || true
    failed=1
fi

# apps should not import each other via relative cross-app paths.
if rg -n "\\.\\./\\.\\./apps/" apps -g "*.ts" -g "*.tsx" >/dev/null 2>&1; then
    echo "error: cross-app relative imports are forbidden."
    rg -n "\\.\\./\\.\\./apps/" apps -g "*.ts" -g "*.tsx" || true
    failed=1
fi

if [[ "$failed" -ne 0 ]]; then
    echo "Architecture checks failed."
    exit 1
fi

echo "Architecture checks passed."

echo "Running kebab-case naming checks..."
bash scripts/architecture/check-naming.sh
