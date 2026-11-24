# v12.1 polish log

Scope (approved 2026-11-23, "好，按这两项修"): the ruler belongs to the sound; no reserved grip row with tracks.
Shots in `workbench-work/v12.1/shots/p1, p1b, p2` (390 light, 360 dark, 360 light for eight tracks).

## Building

- The band's top used the loudest single 10 ms frame, but the drawn columns are averages lifted toward their peak, so
  a ruler placed on that top still floated about 50 dp above the tallest bar. The band's top is now the tallest column
  the audio draws at the current zoom, measured over the whole audio (cached per zoom level), so the ruler sits 13–16 dp
  above the tallest bar at rest and does not bob while the view scrolls.
- Zoomed in, the overview strip goes above the ruler (the ruler stays on its sound); the playhead line starts at its
  marker on the ruler, one object down to the foot of the reflection or the last track.
- The tags (降噪, 统一音量…) sit above the ruler when there is air for them; with eight tracks there is none, and they
  float under it over the sound's top, as before.
- A grip pushed to the top corner now hangs inside the top of the sound (above it is the ruler now).

## Round 1 (p1, after: p1b)

1. **Holding a grip still (magnify)**: the magnified view draws taller columns, so the ruler and the time pill jumped up
   about 50 dp in the middle of the gesture. Fix: while a grip magnifies (and while it springs back) the sound's top
   and its ruler stay where they were and the bars scale to fit under it; only time moves.
2. **Eight tracks**: there is no air above the ruler, so the tags sit under it, over the top of the sound. Kept: it is
   v12's place for them when there is no room, and moving them would push the tracks down.
3. **The first-run hint 拖动选一段** was placed by the main line's top, so with the ruler moved it landed on the bars.
   Fix: it sits in the air above the ruler, pointing down at it, about where it was on screen in v12.

## Round 2 (p2): the careful look

Beats on the ruler, the annotated edges, lifting and moving a stretch (zoomed, with the overview strip), the volume
curve, a marker's name with the keyboard up, the sentence plan at font scale 1.3, English, five tracks with a selection
in dark, eight tracks at 360. Nothing found worth changing: the ruler rides on its sound in all of them, the tracks
follow the main line, and no grip covers a track or its label.
