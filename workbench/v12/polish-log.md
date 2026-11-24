# v12 polish log

Shots per round: rest, range with handles, the pauses plan, record, export, denoise, tracks; 390 light and 360 dark
(`workbench-work/v12/shots/p1…`). Each round: the three worst problems, where, what is wrong; then the fix.

## Before the rounds (while building items 1–5)

What the first renders showed and was fixed on the way, so the rounds start from a working build:

- At a 2 dp pitch a pause of 1.5 s was one short bar: speech still read as an even comb. Now 1 dp columns (mean of the
  10 ms frames lifted toward their peak), and a column that is mostly room noise is drawn in the pale water without its
  reflection, so every pause over a second is a visible break at half a second a pixel.
- The room's noise drew as a 12 dp slab under everything, so pauses only dipped to the slab. The level curve is now a
  0.7 power: the floor is 4–5 dp, quiet speech still shows, the interviewer reads quieter than the guest.
- The plan's dashed orange columns covered the very gaps they marked. A short deletion is now a pin above the sound, a
  line down its own gap and a dot on the horizon.
- The selection rose far above the tallest bar (the band was sized for the loudest possible sound). It now reaches as
  high as this audio's loudest moment.

## Round 1 (shots/p1; after: p1b)

1. **Every screen with a selection, the ruler**: the time flag sat on the ruler and cut its labels into fragments
   ("0:0(" peeking out beside "0:39.8–0:58.5"). Fix: a ruler label the flag would cover is left out.
2. **Range (0:39.8–0:58.5), the start edge**: the playhead sat exactly on the selection's start and painted over the
   orange edge, so the edge read brown. Fix: the playhead line keeps under a selection edge it sits on (its ring on
   the horizon stays); it also ends at the foot of the reflection now, not below it.
3. **Tracks (one music track; five tracks, dark)**: music turned down under the voice read as a flat line, its own
   shape too faint to say "music". Fix: the music's own shape at 55 % above the turned-down level; tracks are drawn
   at 2 dp from their frames, and a speech track (the dubbing) shows its pauses pale like the main line.

Also in this round: the grip's magnify got its own quick spring (it used the slow view spring and took 0.6 s to open),
the export's purposes stack their icon above the word where a word and icon do not fit side by side (English at
360 dp, font scale 1.3: "Ringtone" ran out of its third), the main line with one or two tracks takes what the tracks
leave (it was capped at 46 % and left a quarter-screen empty under one music track), and the recording's meter is
the take's own level.

## Round 2 (shots/p2; after: p2b)

1. **Subtitle dubbing, the list of lines**: each line's time used the canvas time flag's class, so all of them were
   drawn as glass tags stacked over the first line ("2:38" sitting on "大家好…"). Fix: a plain time label of its own.
2. **Cleanup plan, after it, denoise open**: the sound's tags (降噪, 统一音量) floated at the top of the main line, now
   about 150 dp above the sound they belong to. Fix: they sit just above the sound's tallest point (with tracks, at
   the top of the main line, as before).
3. **The sentence plan (剪掉开头5秒…)**: anything under 14 dp was drawn like a pause (pin and line), so a 5-second cut
   at the start read the same as a pause. Fix: only a mark a few dp wide (a pause at the fitted zoom) is a line in
   its gap; a stretch is hatched, with the pin when it is short.

## Round 3 (shots/p3, p3b): the careful look

Rest, range, the pauses plan, record, export (file, share, ringtone, with a selection, details open), denoise, one and
five tracks, the song, subtitles, a new recording, moving a stretch, the two-hour meeting, English and font scale 1.3,
in light and dark. Nothing structural is left. What a careful look still finds, and why it stays:

- With tracks and no selection there is an empty row (44 dp) between the main line's reflection and the first track.
  It is the grips' row; making it smaller makes a grip's touch area shorter than 44 dp, and making it come and go with
  the selection would move the tracks under the finger. Kept.
- The playhead needle rises above the bars near it (to the audio's loudest moment). It is a 1.2 dp line at 62 %; the
  squint test does not pick it out. Kept.

Found by the suites in this round and fixed (they are interaction, not looks):

- A tap that places the playhead jumped up to 3.6 s to the middle of a pause. Pause snapping now applies only to a
  selection's ends (dragging a selection or a grip); a tap goes where the finger is.
- A selection from the very start (0–20 s) sent its start grip to the top although the two grips' bodies were apart.
  Now grips in one row share it when their bodies are apart (the boundary between them, each box still 48 dp); only
  when the bodies would meet does the one turned inward go to the top.
- Reading the time flag's width in the ruler forced a second layout of the whole page per frame. It uses the width
  the flag already measured.
- Text on the dock's glass over eight tracks scrolled under it fell to 4.4:1 (360 dp, font scale 1.3; it needs 4.5):
  the water deepened all the way under the glass and the tracks are denser. The water now ends just under the dock's
  edge (the glass is its own material over the plain ground), the music's own shape is drawn at 50 %, and the light
  dock's tint went from 0.66 to 0.70.
