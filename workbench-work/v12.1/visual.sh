#!/bin/bash
# The visual suites only (v9checks, sep, squint) on a fresh snapshot; appends to final.log.
cd "$(dirname "$0")"
./snap.sh > /dev/null
N=~/.local/share/mise/installs/node/22.23.4/bin/node; R=snap; L=final.log; export WORK_TMP=$PWD
echo "--- visual rerun after the water fade, snapshot $(date '+%H:%M:%S')" >> $L
t0=$(date '+%H:%M:%S'); timeout 1200 $N v9checks.mjs $R > v9checks.log 2>&1; echo "v9checks  start $t0  end $(date '+%H:%M:%S')  pass $(grep -c '^PASS' v9checks.log)  $(grep -E 'ALL PASSED|FAILED' v9checks.log | tail -1)" >> $L
t0=$(date '+%H:%M:%S'); timeout 900 $N sep.mjs $R > sep.log 2>&1; python3 sep.py >> sep.log 2>&1; echo "sep  start $t0  end $(date '+%H:%M:%S')  pass $(grep -c '^PASS' sep.log)  $(tail -1 sep.log)" >> $L
t0=$(date '+%H:%M:%S'); timeout 900 $N squint.mjs $R shots/squint v12 > squint.log 2>&1; python3 squint.py shots/squint/v12-squint.json shots/squint/pairs > squint12.log 2>&1; echo "squint  start $t0  end $(date '+%H:%M:%S')  pass $(grep -c '^PASS' squint12.log)  $(tail -1 squint12.log)" >> $L
echo "visual done" >> $L
