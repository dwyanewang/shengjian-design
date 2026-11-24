#!/bin/bash
# The functional suites on a fresh snapshot of the final files; appends to final.log and ends with "func done".
cd "$(dirname "$0")"
./snap.sh > /dev/null
N=~/.local/share/mise/installs/node/22.23.4/bin/node; R=snap; L=final.log; export WORK_TMP=$PWD
echo "--- functional rerun on the final files, snapshot $(date '+%H:%M:%S'), last edit $(stat -c '%y' ../../workbench/v12.2/{bench.js,scenes.js,style.css,speech.js,icons.js,index.html} | sort | tail -1 | cut -c1-19)" >> $L
run() { local name=$1; shift; local t0=$(date '+%H:%M:%S'); timeout 1200 "$@" > $name.log 2>&1; local ex=$?; echo "$name  start $t0  end $(date '+%H:%M:%S')  exit $ex  pass $(grep -c '^PASS' $name.log)  $(grep -E 'ALL PASSED|FAILED' $name.log | tail -1)" >> $L; }
run layout $N layout.mjs $R
run touch $N interact.mjs $R shots touch
run mouse $N interact.mjs $R shots mouse
run reduced $N interact.mjs $R shots reduced
run sweep390 $N sweep.mjs $R 390 844
run sweep360 $N sweep.mjs $R 360 780
run v10checks $N v10checks.mjs $R
run v12checks $N v12checks.mjs $R
echo "func done" >> $L
