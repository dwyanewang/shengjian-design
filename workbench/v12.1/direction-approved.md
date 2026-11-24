# v12 · direction

Iteration inside the approved direction (三方向门 exempt: same project, direction already chosen).

- Structure: one canvas + one floating dock (approved since v7/v8).
- Visual direction: 清水 (approved 2026-11-21, user: "我同意清水方向").
- Dock: v10's fixed-height dock, an opened setting or a task covers it (user, 2026-11-22: "保留 v10的参数/工具替换结构").

v12 brief, approved by the user on 2026-11-22: "好，按这个顺序做 v12", after a review of v11
(user's questions: "你觉得v11版本如何，是否符合一个产品？是否能够吸引用户？用户操作是否便捷？"). In this order:

1. Real speech waveform: you can see where speech is and where the pauses are.
2. Single audio: taller waveform, lower and nearer the play button, no empty middle; a thinner, lighter playhead drawn only as far as the last line with sound; times in the UI font with tabular figures.
3. Holding a selection handle magnifies locally; handles larger and apart.
4. While recording, play gives way. Export asks the purpose first; format and bitrate default from the purpose and fold into one "音质" row.
5. First run only: the 说一句 bar shows one example sentence. Tool names in the user's words (e.g. 统一音量).

## v12.1 · 2026-11-23 · a narrow fix round

The user approved exactly two layout fixes to v12: "好，按这两项修". Nothing else changes. Scope:

1. The ruler belongs to the sound. At rest the ruler and the time pill sat under the title while the tallest bars began
   about 130 dp lower, and the playhead line began far below its marker on the ruler. The ruler (ticks, labels, time
   pill, playhead marker) sits just above the main line's top, derived from where the main line actually is; the
   leftover height goes above the ruler as air under the title, never between the ruler and its sound; the playhead
   marker and line read as one object. Everything the ruler did (tap or drag to seek, zoom labels) still works.
2. No reserved grip row with tracks. With background tracks and nothing selected an empty ~44 dp strip sat between the
   main line's reflection and the first track. The grips are drawn over the main line's reflection (decoration, may be
   covered), so tracks sit up under the main line and do not move when a selection appears or goes. The grips keep
   v12's rules: at least 48 × 44 dp touch area, outward, never overlapping, the 260 ms hold magnify; a grip never covers
   the first track's label chip or loses its touches to the track.
