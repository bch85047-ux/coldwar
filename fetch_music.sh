#!/bin/sh
# 冷战热斗 · 原曲下载器
# 用法: sh fetch_music.sh
# 下载目标: assets/music/us.mp3 和 assets/music/ussr.mp3
# 来源: archive.org (78rpm 库 + 苏联歌曲库)

set -e
DIR="$(cd "$(dirname "$0")" && pwd)/assets/music"
mkdir -p "$DIR"

US_ITEMS="78_in-the-moonlight_art-mooney-and-his-orchestra-j"
USSR_ITEMS="in-the-far-manchurian-hills:soviet-1940s-war-songs:manchurian-hills"

echo "=== 美国曲: In the Moonlight (1928) ==="
for item in $US_ITEMS; do
  for f in "$item.mp3" "track1.mp3"; do
    url="https://archive.org/download/$item/$f"
    echo "  尝试 $url"
    if curl -sSL --max-time 60 --max-filesize 15000000 -o "$DIR/us.mp3" "$url" 2>/dev/null; then
      if [ -s "$DIR/us.mp3" ] && head -c 2 "$DIR/us.mp3" | grep -q "ID3"; then
        echo "  ✓ 成功 $url"
        exit 0
      fi
    fi
  done
  sleep 3
done

echo "=== 苏联曲: В далёкой Маньчжурии (1945) ==="
for item in $USSR_ITEMS; do
  for f in "$item.mp3" "track1.mp3"; do
    url="https://archive.org/download/$item/$f"
    echo "  尝试 $url"
    if curl -sSL --max-time 60 --max-filesize 15000000 -o "$DIR/ussr.mp3" "$url" 2>/dev/null; then
      if [ -s "$DIR/ussr.mp3" ] && head -c 2 "$DIR/ussr.mp3" | grep -q "ID3"; then
        echo "  ✓ 成功 $url"
        exit 0
      fi
    fi
  done
  sleep 3
done

echo ""
echo "下载失败。手动流程:"
echo "  1. 浏览器打开 https://archive.org/search?query=in+the+moonlight&sin=TGQyYzYzN2NjMjBjLmVjZTk3OTM%3D"
echo "  2. 选一个 78rpm 版本，下载 mp3"
echo "  3. 改名为 us.mp3 放到 assets/music/"
echo "  4. 苏联曲同理 (搜 'В далёкой Маньчжурии')"
echo ""
echo "没有 mp3 也能玩 —— music.js 会用 Web Audio 合成兜底旋律。"
