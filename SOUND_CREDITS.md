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

`assets/journal/pencil-0.wav` 至 `pencil-4.wav`、`page.wav`、`close.wav` 是本项目通过 `node scripts/journal-audio.mjs` 生成的滤波噪声与包络纹理，并非网络采样或实地录音。以很低音量播放；铅笔随机选择五个样本并轻微变化音量／速率。所有声音继承现有声音开关，隐藏时停声。文件随 HTML 和 EXE 打包，无外部素材许可依赖。
