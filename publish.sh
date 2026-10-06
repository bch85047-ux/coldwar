#!/usr/bin/env sh
# 冷战中台发布脚本
# 静态托管对子资源带 max-age=600，只刷新 index.html 刷不到 JS/CSS。
# 本脚本给 index.html 里所有 js/css 引用重打版本戳，再提交推送。
# 幂等：可以反复执行，重复执行只会刷新时间戳。
set -e
cd "$(dirname "$0")"

python3 - <<'PY'
import re, time
p = 'index.html'
s = open(p, encoding='utf-8').read()
# 1) 清掉上一版的 ?v<时间戳>
s = re.sub(r'\?v\d+(?=["\'])', '', s)
# 2) 打上新的
ver = '?v' + str(int(time.time()))
s = re.sub(r'(src|href)="([^"<>]+\.(?:js|css))"',
           lambda m: m.group(1) + '="' + m.group(2) + ver + '"', s)
open(p, 'w', encoding='utf-8').write(s)
print('version stamp:', ver)
PY

git add -A
git commit -q -m "发布：重打资源版本戳 $(date +%Y%m%d-%H%M)" --allow-empty
git push origin HEAD:main
