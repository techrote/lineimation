#!/usr/bin/env sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if command -v xdg-open >/dev/null 2>&1; then xdg-open "$HERE/index.html"
elif command -v open >/dev/null 2>&1; then open "$HERE/index.html"
else printf '%s\n' "Open $HERE/index.html in a browser."
fi
