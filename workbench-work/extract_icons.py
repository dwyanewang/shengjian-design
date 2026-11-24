import re, json, sys
src = open(sys.argv[1], encoding='utf-8').read()
icons = {}
for m in re.finditer(r'val (\w+): ImageVector by lazy \{ symbol\("(\w+)", (true|false), "([^"]+)"\) \}', src):
    icons[m.group(1)] = m.group(4)
want = sys.argv[3].split(',')
out = {k: icons[k] for k in want if k in icons}
missing = [k for k in want if k not in icons]
open(sys.argv[2], 'w', encoding='utf-8').write('// Material Symbols Rounded paths (Apache 2.0), copied from ui/AppIcons.kt. viewBox 0 -960 960 960.\nwindow.ICONS = ' + json.dumps(out, ensure_ascii=False, indent=0) + ';\n')
print(len(out), 'icons; missing:', missing)
