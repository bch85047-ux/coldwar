assets/music/ 里的两首都是真实年代录音，不是合成也不是改编。

us.mp3 — In the Moonlight（1928，Paul Rubens 曲 / Harold Adamson 词）
  版本：Grand Symphony Orchestra / A. W. Ketelbey，78rpm 转录
  来源：archive.org 条目
    78_in-the-moonlight_grand-symphony-orchestra-a-w-ketelbey_gbia3007529a
  下载：https://archive.org/download/78_in-the-moonlight_grand-symphony-orchestra-a-w-ketelbey_gbia3007529a/IN%20THE%20MOONLIGHT%20-%20GRAND%20SYMPHONY%20ORCHESTRA.mp3

ussr.mp3 — На сопках Маньчжурии（在满洲的山岗上）
  版本：Ilya Shatrov，1909 年原始录音
  来源：archive.org 条目 youtube-sRa-M7M88Zk
  下载：https://archive.org/download/youtube-sRa-M7M88Zk/sRa-M7M88Zk.mp4
  音轨用 ffmpeg 从 mp4 抽出（-vn -acodec libmp3lame -q:a 4）

两首都用 loudnorm 归一到 I=-18 LUFS / TP=-2，
保证切换阵营不跳音量：
  ffmpeg -i in.mp3 -af "loudnorm=I=-18:TP=-2:LRA=11" -c:a libmp3lame -q:a 2 out.mp3

归一后再降到 112 kbps CBR（78rpm 与 1909 年录音频带本来就只有 3-10kHz，
112k 完全够，还能让移动端加载快一半）：
  ffmpeg -i in.mp3 -b:a 112k -c:a libmp3lame out.mp3

最终实测：
  us.mp3   188.8s  RMS -21.8 dBFS  峰值 -5.5 dBFS   3,278,029 字节
  ussr.mp3 186.3s  RMS -20.3 dBFS  峰值 -4.7 dBFS   2,609,313 字节
  合计 5.6 MB

关于做旧：music.js 里的黑胶做旧链（低通 / 底噪 / 磁带抖动）现在默认关闭。
理由——这两首本来就是真·年代录音，音色自带那味儿，再叠做旧只会把音质糊掉。
music.js 里 `let aged = false` 改成 true 可以开。
