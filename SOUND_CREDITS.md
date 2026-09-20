# 自然环境音来源

下列环境音均为网络实地录音，经剪辑、均衡、响度归一化和转码后嵌入 HTML，打开网页无需再次联网下载。作者没有为本作品背书。

| 本地文件 | 原作品与作者 | 许可 | 本次处理 |
| --- | --- | --- | --- |
| audio/sea.mp3 | [Oceanwavescrushing — Luftrum](https://commons.wikimedia.org/wiki/File:Oceanwavescrushing.ogg)，原始[录音页](https://freesound.org/people/Luftrum/sounds/48412/) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | 20–68 秒片段；65Hz高通、2500Hz低通、-24 LUFS目标、96kbps MP3；1.5秒交叠循环 |
| audio/rain.mp3 | [Rain (1) — ezwa / PDSounds](https://commons.wikimedia.org/wiki/File:Rain_(1).ogg) | 公共领域 | 前42秒；100Hz高通、4200Hz低通、-24 LUFS目标、80kbps MP3；1.5秒交叠循环 |
| audio/gull.mp3 | [Larus atricilla — Tony Phillips](https://commons.wikimedia.org/wiki/File:Larus_atricilla.ogg) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | 250Hz高通、3200Hz低通、-27 LUFS目标、两端淡化、64kbps MP3；仅晴天和黄昏间歇播放 |
| audio/thunder.mp3 | [Thunder — Bidgee](https://commons.wikimedia.org/wiki/File:Thunder.ogg) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)（选择该许可） | 45Hz高通、850Hz低通、-28 LUFS目标、缓入缓出、64kbps MP3；闪电后1.4–2.2秒轻声播放 |

环境音默认请求开启，受浏览器自动播放限制时首次交互后恢复；已有静音偏好保留。总音量22%。夜间降低海浪音量，不播放海鸥鸣叫。页面「声音来源」中包含同样的作者、来源、改编说明及许可链接。


## 手账纸笔声音

当前手账改用网络真实近距离录音，替代此前程序合成的纸笔噪声。选择无对白、短促的纸面摩擦片段，按轻柔 ASMR 方向处理；是否舒适仍取决于听者和设备，不宣称具有治疗或助眠效果。

| 本地文件 | 原作品与作者 | 许可 | 处理 |
| --- | --- | --- | --- |
| assets/journal/page.wav、close.wav | [Page Turn (1) — OwlStorm / Ashe Kirk](https://freesound.org/people/OwlStorm/sounds/151220/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 取公开 HQ MP3 预览；150Hz 高通、2600Hz 低通、首尾淡化、峰值不高于 -10dBFS；合书复用降速纸张声 |
| assets/journal/pencil-0.wav 至 pencil-4.wav | [Pencil, Writing, Close, A.wav — InspectorJ](https://freesound.org/people/InspectorJ/sounds/398271/) ([www.jshaw.co.uk](https://www.jshaw.co.uk/))，来自 Freesound.org | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 取公开 HQ MP3 预览的 1.2／3.3／5.4／7.5／9.6 秒处短片段；150Hz 高通、3400Hz 低通、首尾淡化与响度调整，转单声道 22050Hz PCM |

原 HQ 预览保存在 `assets/journal/source/`，用于离线重制，不另外加载到运行时。运行 `node scripts/journal-audio.mjs` 可用本机 FFmpeg 重建七段 WAV。平均响度目标 -25dBFS，同时受 -10dBFS 峰值上限约束，再以纸声 0.55／铅笔 0.32–0.38 音量播放；不并发堆叠铅笔片段。原录音版权与许可不变，作者未为本应用背书。应用“声音来源”同步包含署名、原作品、许可及改编说明。

声音继承总开关、隐藏与暂停状态，不依赖海浪初始化成功；以 `audio/wav` 随 HTML 和 EXE 离线打包。铅笔仅随自动书写／绘画播放，普通阅读不连续发声。
