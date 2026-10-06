#!/bin/sh
# 冷战热斗 · 原曲下载器（真实年代录音，非合成非改编）
# 用法: sh fetch_music.sh
#
# us.mp3   In the Moonlight            1928  Grand Symphony Orchestra / 78rpm 转录
# ussr.mp3 На сопках Маньчжурии         1909  Ilya Shatrov 原始录音
#
# 两首都经 loudnorm 归一到 I=-18 LUFS / TP=-2，切换阵营不跳音量。

set -e
DIR="$(cd "$(dirname "$0")" && pwd)/assets/music"
mkdir -p "$DIR"
UA="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"

US_RAW="$DIR/us.raw.mp3"
USSR_RAW="$DIR/ussr.raw.mp4"

echo "=== 1/4 美国曲：In the Moonlight（78rpm 原始转录） ==="
curl -sSL --max-time 180 -A "$UA" -o "$US_RAW" \
  "https://archive.org/download/78_in-the-moonlight_grand-symphony-orchestra-a-w-ketelbey_gbia3007529a/IN%20THE%20MOONLIGHT%20-%20GRAND%20SYMPHONY%20ORCHESTRA.mp3"
[ -s "$US_RAW" ] || { echo "  下载失败"; exit 1; }
echo "  拿到 $(wc -c < "$US_RAW") 字节"

echo "=== 2/4 苏联曲：На сопках Маньчжурии（1909 录音，mp4 里抽音轨） ==="
curl -sSL --max-time 180 -A "$UA" -o "$USSR_RAW" \
  "https://archive.org/download/youtube-sRa-M7M88Zk/sRa-M7M88Zk.mp4"
[ -s "$USSR_RAW" ] || { echo "  下载失败"; exit 1; }
echo "  拿到 $(wc -c < "$USSR_RAW") 字节"

echo "=== 3/4 提取音轨 ==="
ffmpeg -y -v error -i "$US_RAW" -c:a libmp3lame -q:a 2 "$DIR/us.pre.mp3"
ffmpeg -y -v error -i "$USSR_RAW" -vn -c:a libmp3lame -q:a 2 "$DIR/ussr.pre.mp3"

echo "=== 4/4 响度归一化（-18 LUFS / 峰值 -2 dB） ==="
ffmpeg -y -v error -i "$DIR/us.pre.mp3"   -af "loudnorm=I=-18:TP=-2:LRA=11" -c:a libmp3lame -q:a 2 "$DIR/us.mp3"
ffmpeg -y -v error -i "$DIR/ussr.pre.mp3" -af "loudnorm=I=-18:TP=-2:LRA=11" -c:a libmp3lame -q:a 2 "$DIR/ussr.mp3"

rm -f "$US_RAW" "$USSR_RAW" "$DIR/us.pre.mp3" "$DIR/ussr.pre.mp3"

echo ""
echo "完成："
for f in us.mp3 ussr.mp3; do
  [ -s "$DIR/$f" ] && echo "  $f  $(wc -c < "$DIR/$f") 字节" || echo "  $f  缺失"
done
echo ""
echo "详见 assets/music/SOURCES.md"
