#!/bin/bash
# One polish round's shots: the states the brief names, 390 light and 360 dark, plus montages. Usage: polish.sh N
cd "$(dirname "$0")"
N=~/.local/share/mise/installs/node/22.23.4/bin/node; export WORK_TMP=$PWD
O=shots/p$1; S=t6a,t1b,t4b,t6b,t8a,t8d,t4d,kTracks5,t5c,kFsRange,kEnExport,t3c
$N shots.mjs ../../workbench/v12 $O 390 844 m light $S | tail -1
$N shots.mjs ../../workbench/v12 $O 360 780 m dark $S | tail -1
$N states.mjs ../../workbench/v12 $O 390 844 | tail -1
cd $O
python3 ../../mont.py A-390l.png 390l-t6a.png 390l-t1b.png 390l-t4b.png 390l-t6b.png 390l-t8a.png 390l-t8d.png
python3 ../../mont.py B-390l.png 390l-t4d.png 390l-kTracks5.png 390l-t5c.png 390l-t3c.png 390l-kFsRange.png 390l-kEnExport.png
python3 ../../mont.py C-360d.png 360d-t6a.png 360d-t1b.png 360d-t4b.png 360d-t6b.png 360d-t8a.png 360d-kTracks5.png
python3 ../../mont.py D-grips.png 390l-short.png 390l-start.png 390l-held.png 390l-held-moved.png 390l-released.png
