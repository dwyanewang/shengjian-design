#!/bin/bash
# Copies the page's files to snap/ so the suites can run on a fixed copy while the work goes on.
cd "$(dirname "$0")"
mkdir -p snap
cp ../../workbench/v12.2/{index.html,bench.js,scenes.js,style.css,icons.js,speech.js} snap/
[ -e snap/ba ] || ln -s ../../../workbench/v12.2/ba snap/ba
echo "snap $(date '+%H:%M:%S')"
