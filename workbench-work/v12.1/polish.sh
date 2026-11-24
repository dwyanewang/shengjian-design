#!/bin/bash
# One v12.1 polish round: the states where the main line's top moves, 390 light and 360 dark, plus montages. Usage: polish.sh N
cd "$(dirname "$0")"
N=~/.local/share/mise/installs/node/22.23.4/bin/node; export WORK_TMP=$PWD
O=shots/p$1; S=t6a,kTracks5,kTracks5Sel,kTracks8,t6b,t4b,t1b,kBrowse,kLong,t4d,t8d,t5c,kGripsStart,kGripsHeld,kNew,kFsRange,kEnRest
$N shots.mjs ../../workbench/v12.1 $O 390 844 m light $S | tail -1
$N shots.mjs ../../workbench/v12.1 $O 360 780 m dark $S | tail -1
$N shots.mjs ../../workbench/v12.1 $O 360 780 m light kTracks8,kTracks5Sel | tail -1
cd $O
python3 ../../mont.py A-390l.png 390l-t6a.png 390l-kTracks5.png 390l-kTracks5Sel.png 390l-kTracks8.png 390l-t6b.png 390l-t4b.png
python3 ../../mont.py B-390l.png 390l-t1b.png 390l-kBrowse.png 390l-kLong.png 390l-t4d.png 390l-t8d.png 390l-t5c.png
python3 ../../mont.py C-mix.png 390l-kGripsStart.png 390l-kGripsHeld.png 390l-kNew.png 390l-kFsRange.png 360l-kTracks8.png 360l-kTracks5Sel.png
python3 ../../mont.py D-360d.png 360d-t6a.png 360d-kTracks5.png 360d-t6b.png 360d-t4b.png 360d-kLong.png 360d-kEnRest.png
