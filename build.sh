#!/bin/bash
# 把 src/ 下的多文件项目打包成 dist/budget-tracker.html 单文件
# 内联：styles.css、config.js、app.js、dashboard.js、records.json
# 双击 dist 文件即可在浏览器打开，无需起服务

set -e

SRC_DIR="src"
DIST_DIR="dist"
OUTPUT="$DIST_DIR/budget-tracker.html"

mkdir -p "$DIST_DIR"

echo "→ 打包源文件..."

python3 - "$SRC_DIR" "$OUTPUT" <<'PYEOF'
import sys, re, base64, pathlib

src_dir = pathlib.Path(sys.argv[1])
output = pathlib.Path(sys.argv[2])

html      = (src_dir / 'index.html').read_text(encoding='utf-8')
css       = (src_dir / 'styles.css').read_text(encoding='utf-8')
config    = (src_dir / 'config.js').read_text(encoding='utf-8')
app       = (src_dir / 'app.js').read_text(encoding='utf-8')
dashboard = (src_dir / 'dashboard.js').read_text(encoding='utf-8')

# 数据：明文优先（本地开发），没有就用加密版（仓库版本）
plain_path = src_dir / 'data' / 'records.json'
enc_path   = src_dir / 'data' / 'records.enc.json'
if plain_path.exists():
    records = plain_path.read_text(encoding='utf-8')
    records_inject = f'window.__RECORDS__ = {records};'
elif enc_path.exists():
    enc_text = enc_path.read_text(encoding='utf-8')
    records_inject = f'window.__RECORDS_ENC__ = {enc_text};'
else:
    raise SystemExit('找不到 records.json 或 records.enc.json')

# 把 assets/ 下的图片转 base64 data URI 内联，不依赖外部文件
for img in (src_dir / 'assets').glob('*.png'):
    b64 = base64.b64encode(img.read_bytes()).decode('ascii')
    html = html.replace(f'assets/{img.name}', f'data:image/png;base64,{b64}')

# 去掉 ES 模块语法（单文件不用模块系统）
config_inline = re.sub(r'^export\s+', '', config, flags=re.MULTILINE)
app_inline    = re.sub(r"^import\s+.*?from\s+.*?;\s*\n", '', app, flags=re.MULTILINE)
# 单文件版用内联的 CONFIG/SECTIONS，去掉动态 import 行
app_inline    = re.sub(r"^const\s*\{\s*CONFIG\s*,\s*SECTIONS\s*\}\s*=\s*await\s+import\(.+?\);\s*\n", '', app_inline, flags=re.MULTILINE)

# 1) 样式：<link> → <style>
html = html.replace(
    '<link rel="stylesheet" href="styles.css" />',
    f'<style>\n{css}\n</style>',
)

# 2) 主逻辑：<script type="module" src="app.js"> → 内联 config + app
html = html.replace(
    '<script type="module" src="app.js"></script>',
    f'<script>\n{config_inline}\n\n{app_inline}\n</script>',
)

# 3) 看板：<script src="dashboard.js"> → 注入数据 + 内联 dashboard
html = html.replace(
    '<script src="dashboard.js"></script>',
    f'<script>\n{records_inject}\n{dashboard}\n</script>',
)

output.write_text(html, encoding='utf-8')
PYEOF

echo "✓ 构建完成: $OUTPUT"
echo "  文件大小: $(wc -c < "$OUTPUT" | tr -d ' ') bytes"
echo ""
echo "测试: 直接双击 $OUTPUT 或用浏览器打开"
