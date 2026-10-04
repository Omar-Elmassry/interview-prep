#!/usr/bin/env bash
# Copies the built apps from the private problem-solving repo into this site,
# then commits and pushes so GitHub Pages redeploys.
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

for entry in "${APPS[@]}"; do
  dir="${entry%%:*}"
  file="$SRC/${entry#*:}"
  [ -f "$file" ] || { echo "Missing $file: build it first." >&2; exit 1; }
  mkdir -p "$dir"
  cp "$file" "$dir/index.html"
  echo "copied $file -> $dir/index.html"
done

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
