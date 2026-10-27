#!/usr/bin/env bash
# Enforce kebab-case file and folder names under TS/JS app and package src trees.
# Allows Next.js / Expo Router special segments: (groups), [params], @slots, _private.
# Skips Python (ai-api) and Rust — those use language-native naming.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

msg() {
    printf '[naming] %s\n' "$*"
}

failed=0
checked=0

SCOPES=(
    apps/web/src
    apps/nest-api/src
    apps/mobile/src
    apps/docs/src
    packages/ui/src
    packages/logger/src
)

# Whole stem is one or more kebab segments joined by dots
# (Nest/Angular style: auth.service.ts, users.module.ts, icon.web.tsx).
is_kebab_stem() {
    [[ "$1" =~ ^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*$ ]]
}

is_route_special() {
    local name="$1"
    [[ "$name" =~ ^\([a-z0-9]+(-[a-z0-9]+)*\)$ ]] && return 0
    [[ "$name" =~ ^@[a-z0-9]+(-[a-z0-9]+)*$ ]] && return 0
    [[ "$name" =~ ^\[(\.\.\.)?[a-zA-Z0-9_-]+\]$ ]] && return 0
    [[ "$name" =~ ^\[\[(\.\.\.)?[a-zA-Z0-9_-]+\]\]$ ]] && return 0
    [[ "$name" =~ ^_[a-z0-9]+(-[a-z0-9]+)*$ ]] && return 0
    return 1
}

# Strip route / source suffixes (files and Next "extension" folders like llms.txt/).
strip_known_suffix() {
    local base="$1"
    base="${base%.d.ts}"
    base="${base%.d.mts}"
    base="${base%.d.cts}"
    for ext in \
        .integration-spec.ts .e2e-spec.ts .spec.ts .spec.tsx .test.ts .test.tsx \
        .stories.ts .stories.tsx .module.css .css .ts .tsx .js .jsx .mjs .cjs \
        .mdx .md .txt .json .svg .png .jpg .jpeg .webp .gif .ico; do
        if [[ "$base" == *"$ext" ]]; then
            base="${base%"$ext"}"
            printf '%s' "$base"
            return 0
        fi
    done
    if [[ "$base" == *.* ]]; then
        base="${base%.*}"
    fi
    printf '%s' "$base"
}

is_framework_file_stem() {
    case "$1" in
    page | layout | loading | error | not-found | template | default | route | \
        middleware | proxy | global-error | forbidden | unauthorized | \
        icon | apple-icon | opengraph-image | twitter-image | robots | sitemap | \
        manifest | favicon)
        return 0
        ;;
    *)
        return 1
        ;;
    esac
}

check_name() {
    local kind="$1"
    local path="$2"
    local raw="$3"
    local name
    name="$(strip_known_suffix "$raw")"
    checked=$((checked + 1))

    if [[ -z "$name" ]]; then
        return 0
    fi
    if is_route_special "$raw" || is_route_special "$name"; then
        return 0
    fi
    if [[ "$kind" == file ]] && is_framework_file_stem "$name"; then
        return 0
    fi
    if is_kebab_stem "$name"; then
        return 0
    fi

    msg "error: $kind must be kebab-case (optionally dotted): $path"
    failed=1
}

for scope in "${SCOPES[@]}"; do
    [ -d "$scope" ] || continue

    while IFS= read -r dir; do
        [ -d "$dir" ] || continue
        rel="${dir#./}"
        case "$rel" in
        */node_modules/* | */.next/* | */dist/* | */.git/* | */__pycache__/*)
            continue
            ;;
        esac
        base="$(basename "$dir")"
        if [[ "$rel" == "$scope" ]]; then
            continue
        fi
        check_name dir "$rel" "$base"
    done < <(find "$scope" -type d 2>/dev/null || true)

    while IFS= read -r file; do
        [ -f "$file" ] || continue
        rel="${file#./}"
        case "$rel" in
        */node_modules/* | */.next/* | */dist/* | */.git/*)
            continue
            ;;
        esac
        case "$file" in
        *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.css | *.md | *.mdx) ;;
        *) continue ;;
        esac
        check_name file "$rel" "$(basename "$file")"
    done < <(find "$scope" -type f 2>/dev/null || true)
done

if [[ "$failed" -ne 0 ]]; then
    msg "FAILED — use kebab-case for files and folders under TS/JS src trees."
    exit 1
fi

msg "OK ($checked path(s) checked)"
exit 0
