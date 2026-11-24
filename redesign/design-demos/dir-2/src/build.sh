#!/bin/sh
# 把 src/ 里的分块拼成 ../../dir-2.html（JSX 内联，双击即可打开）
cd "$(dirname "$0")"
OUT=../../dir-2.html
{
  cat 00-head.html
  echo '</style>'
  echo '<style>'
  cat 05-screens.css
  sed '1,3d' 09-body.html
  echo '<script type="text/babel" data-presets="react">'
  cat 10-core.jsx 20-home.jsx 30-flows.jsx 40-edit.jsx 50-app.jsx
  echo '</script>'
  echo '</body>'
  echo '</html>'
} > "$OUT"
echo "built $OUT ($(wc -c < "$OUT") bytes)"
