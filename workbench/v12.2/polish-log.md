# v12.2 polish log

Scope: the canvas gestures only (direction-approved.md, 2026-11-23, "继续").

## Building (found by the new gesture suite and fixed, or the test corrected)

- After a swipe passes the 8 dp slop the view follows the finger from there (the slop is eaten, as on Android and
  iOS), so the view does not jump by 8 dp when a swipe is recognised. The test's expected distance now subtracts it.
- Zoomed in, the overview strip sits above the ruler; a swipe there drags the overview window (as before), so the
  test's "air" point moved above the strip.
- The playback follow: the view pages after the playhead when it reaches the last twentieth of the view, except while
  a finger is on the canvas or a fling runs; a swipe that leaves the playhead out of view stops the following until the
  playhead is back in view. (The first test never let the playhead reach the paging point.)

## Round 1 (shots/g1: the hint, the anchor, a double-tapped sentence; 390 and 360, light and dark)

1. **The double-tapped sentence at the fitted zoom** (「其实是碰巧。」, 1.9 s) is about 4 dp wide; it reads through its
   grips and the time tag. Kept: the look is out of scope, and a sentence is that short at half a second a pixel.
2. **The anchor line** is the selection's colour and height with a dot and a soft ring on the horizon at the press
   point; at both sizes and themes it reads as "a range starts here", not as a second playhead. Kept.
3. **The hint** sits in the air 14 dp above the time pill, pointing down at the sound; it does not touch the bar's
   example sentence (they are at opposite ends of the screen). Kept.

Nothing found worth changing; this round's changes are the gestures themselves.
