#!/bin/bash
# Every suite on the final files, one after another; times and results in final.log.
cd "$(dirname "$0")"
./snap.sh > /dev/null
N=~/.local/share/mise/installs/node/22.23.4/bin/node
R=snap
L=final.log
export WORK_TMP=$PWD
echo "last edit to the five files: $(stat -c '%y' $R/index.html $R/bench.js $R/scenes.js $R/style.css $R/icons.js | sort | tail -1 | cut -c1-19)" > $L
run() { local name=$1; shift; local t0=$(date '+%H:%M:%S'); timeout 1200 "$@" > $name.log 2>&1; local ex=$?; echo "$name  start $t0  end $(date '+%H:%M:%S')  exit $ex  pass $(grep -c '^PASS' $name.log)  $(grep -E 'ALL PASSED|FAILED' $name.log | tail -1)" >> $L; }
run layout $N layout.mjs $R
run touch $N interact.mjs $R shots touch
run mouse $N interact.mjs $R shots mouse
run reduced $N interact.mjs $R shots reduced
run gestures $N gestures.mjs $R
run sweep390 $N sweep.mjs $R 390 844
run sweep360 $N sweep.mjs $R 360 780
run v9checks $N v9checks.mjs $R
run v10checks $N v10checks.mjs $R
run v11checks $N v11checks.mjs $R
run v12checks $N v12checks.mjs $R
t0=$(date '+%H:%M:%S'); timeout 900 $N sep.mjs $R > sep.log 2>&1; python3 sep.py >> sep.log 2>&1; echo "sep  start $t0  end $(date '+%H:%M:%S')  pass $(grep -c '^PASS' sep.log)  $(tail -1 sep.log)" >> $L
t0=$(date '+%H:%M:%S'); timeout 900 $N squint.mjs $R shots/squint v12 > squint.log 2>&1; python3 squint.py shots/squint/v12-squint.json shots/squint/pairs > squint12.log 2>&1; echo "squint  start $t0  end $(date '+%H:%M:%S')  pass $(grep -c "^PASS" squint12.log)  $(tail -1 squint12.log)" >> $L
echo "all done" >> $L
