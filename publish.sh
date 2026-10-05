#!/usr/bin/env bash
# Copies the built apps from the private problem-solving repo into this site,
# adds the install/offline hooks to every page, then commits and pushes so
# GitHub Pages redeploys.
#
#   ./publish.sh               copy, commit and push
#   ./publish.sh --no-push     copy and commit only
#
# Source repo defaults to ../problem-solving; override with SRC=/path/to/repo.
set -euo pipefail
cd "$(dirname "$0")"

SRC="${SRC:-../problem-solving}"
PUSH=1
[ "${1:-}" = "--no-push" ] && PUSH=0

# site folder  <-  built page in the source repo
APPS=(
  "frontend:interview-bank/question-bank.html"
  "backend:backend-bank/backend-bank.html"
  "code-drill:code-drill/code-drill.html"
)

# The block each page gets before </head>: manifest, icons and the service
# worker. $1 is the path from the page back to the site root ("." or "..").
pwa_block() {
  local p="$1"
  cat <<EOF
<!-- PWA:START (added by publish.sh) -->
<link rel="manifest" href="$p/manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="$p/icons/favicon-32.png">
<link rel="apple-touch-icon" href="$p/icons/apple-touch-icon.png">
<meta name="theme-color" content="#11151C">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Interview Prep">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<script>
if ("serviceWorker" in navigator) {
  addEventListener("load", function () {
    navigator.serviceWorker.register("$p/sw.js", { scope: "$p/" }).catch(function () {});
    // Ask the browser not to clear saved progress when storage runs low.
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  });
}
</script>
<!-- PWA:END -->
EOF
}

# Replace any existing block, then insert a fresh one before the first </head>.
add_pwa() {
  local file="$1" block
  block="$(pwa_block "$2")"
  awk -v block="$block" '
    /<!-- PWA:START/ { skip = 1 }
    skip { if (/<!-- PWA:END -->/) skip = 0; next }
    !done && /<\/head>/ { print block; done = 1 }
    { print }
  ' "$file" > "$file.tmp"
  mv "$file.tmp" "$file"
}

for entry in "${APPS[@]}"; do
  dir="${entry%%:*}"
  file="$SRC/${entry#*:}"
  [ -f "$file" ] || { echo "Missing $file: build it first." >&2; exit 1; }
  mkdir -p "$dir"
  cp "$file" "$dir/index.html"
  add_pwa "$dir/index.html" ".."
  echo "copied $file -> $dir/index.html"
done
add_pwa index.html "."

# A new service worker version makes installed copies fetch the new pages.
version="$(cat index.html manifest.webmanifest frontend/index.html backend/index.html code-drill/index.html | sha1sum | cut -c1-12)"
sed -i "s/^const VERSION = .*/const VERSION = \"$version\";/" sw.js

git add -A
if git diff --cached --quiet; then
  echo "Nothing changed; the site is already up to date."
  exit 0
fi

git commit -m "update apps from problem-solving $(git -C "$SRC" rev-parse --short HEAD)"
if [ "$PUSH" = 1 ]; then
  git push
  echo "Pushed. GitHub Pages redeploys in about a minute."
fi
