# 一方小海 · Windows 桌面景观

在原 Three.js 0.180.0 项目上增量接入 Tauri 2。轮船、海洋截面、海豚、多边形海鸥和四层极光沿用原场景；网页与桌宠使用同一前端和一个渲染器。

**交付状态：离线网页可运行；Tauri 工程已实现，但当前机器缺少 MSVC 的 link.exe，尚未生成或验证 Windows 可执行文件。** 实测与未测项见 [TEST_RESULTS.md](TEST_RESULTS.md)，原生构建错误见 [qa/native-build.log](qa/native-build.log)。

## 网页预览

直接打开 [dist/index.html](dist/index.html)，无需网络、Node 或 CDN。网页默认显示编辑工具；“锁定展示”隐藏工具，“编辑预览”可恢复。鼠标穿透与托盘只在 Windows 应用中提供。

开发预览：

```powershell
npm ci
npm run build
npm run preview
```

打开 http://127.0.0.1:4173/ 。修改前端后重新构建并刷新。音频默认关闭，点击“听海”后播放低音量自然录音。

## Windows 开发与打包

依赖：Windows 10/11、Node.js LTS、Rust MSVC stable、Visual Studio C++ 桌面开发工作负载（MSVC x64/x86 和 Windows SDK）、WebView2。仅安装 Visual Studio 编辑器并不足够。[Tauri 官方前置要求](https://v2.tauri.app/start/prerequisites/)。

本机已安装 Rust stable 到 C:/Users/ww/.cargo/bin，未修改系统 PATH；运行前可将该目录加入当前终端 PATH。自动安装 C++ 工具被审批策略阻止，需要在 Visual Studio Installer 中安装上述工作负载后继续。

```powershell
npm ci
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run desktop:dev
npm run desktop:build
```

成功后应用位于 src-tauri/target/release/tiny-tides-pet.exe，NSIS 安装包位于 src-tauri/target/release/bundle/nsis/。这是预期输出路径，当前交付不含这些文件。

应用脚本与音频嵌入 HTML；模型和纹理由本地代码创建，没有在线资源请求。安装包配置包含离线 WebView2 安装器，因此首次**构建**仍需下载构建依赖及 WebView2 安装器；最终安装和运行不依赖 CDN。当前构建及安装路径尚待实机验证。应用未配置签名证书。

## 桌宠操作

默认 560×540 逻辑像素、透明、无边框、无标题栏、无系统阴影、置顶、不抢焦点且整窗鼠标穿透。先建立托盘再显示窗口，避免无法恢复交互。

右键托盘可显示/隐藏、编辑/锁定、切换置顶、暂停/继续、选择 30/20 FPS、开关环境音、重置位置和视角、保存性能诊断、退出。再次启动应用会通过单实例机制打开原窗口的编辑模式。

编辑模式使用“移动窗口”专用按钮拖动窗口；在海面区域拖动仅控制 OrbitControls。结束后点“锁定展示”或按 Escape。观察角度、波幅、位置、置顶和帧率保存在 %APPDATA%/com.tinytides.desktop/settings.json。位置使用物理坐标，支持负坐标显示器；托盘重置回主屏工作区。显示器或缩放变化会触发位置恢复，窗口大于工作区时等比缩小。退出前会保存状态。

隐藏、最小化或暂停时停止绘制和世界时间；恢复不补算历史帧。单纯失去焦点不暂停桌宠。网页预览在标签页隐藏时暂停。

## 自动环境与性能

手动天气按钮已移除。时段按白天 → 黄昏 → 夜晚 → 晨光循环，天气独立沿晴朗 ↔ 阴云 ↔ 小雨 ↔ 暴雨加权随机变化。所有时间为可见且未暂停的世界时间。配置集中于 [environment-config.mjs](environment-config.mjs)：

- 白天/夜晚每段 240–480 秒，黄昏/晨光 90–150 秒；天气持续时间独立随机。
- 过渡 12–25 秒；暴雨只从小雨进入，权重较低，至少间隔 1200 秒；提前 9 秒让海鸥离场。
- 暴雨、夜晚无海鸥。适合的晴朗/阴云夜晚有 45% 概率出现极光，延迟 25–55 秒；星星、月亮、极光和闪电均限于模型附近。
- 水面和极光形变在顶点着色器中完成，保留同一波高公式使船、尾流、海豚和涟漪贴合水面。极光使用正常透明混合，不使用依赖黑底的加法合成。
- 尾流为固定 200 实例的一次批量绘制；雨为固定 1100 线段缓冲。天气变化只改可见性、灯光和材质参数，不重建场景。
- 30 FPS 档像素倍率上限 1.5、像素数上限 921600、最长边 1280；20 FPS 档分别为 1、480000、960。动画按秒推进。
- 无后处理链、无限地面或整屏天空；只保留模型光影和局部环境效果。

## 验证与维护

```powershell
npm test
npm run qa
node scripts/preview.mjs --qa
```

QA 预览可用 ?scenario=storm 或 ?scenario=aurora 固定极端场景；无参数为晴天。仅 QA 构建固定天气并显示底色测试与诊断面板，正式构建自动随机环境。诊断记录每 5 秒一条，最多 360 条；CPU 数值仅表示 JavaScript/渲染提交时间，不是 GPU 完成时间。原生托盘“保存性能诊断”写入应用配置目录 diagnostics.json。

主要文件：main.js（原场景整合）；environment*.mjs（环境状态）；render-budget.mjs（调度和分辨率）；water-shader.mjs、aurora.mjs、wake-pool.mjs（GPU 动画与批量尾流）；desktop-bridge.mjs（托盘状态桥）；src-tauri/src/main.rs（窗口、托盘、持久化）；src-tauri/src/placement.rs（多屏恢复）。

原网页基线保留在 Git 提交 ddede61。需要回看时可在单独目录检出该版本，避免覆盖当前修改。本次没有更新线上站点。

## 素材许可

录音来源、作者、许可和改编方式见 [SOUND_CREDITS.md](SOUND_CREDITS.md)；Three.js 许可见 [THREE-LICENSE.txt](THREE-LICENSE.txt)。资源均随项目提供，声音来源链接仅用于署名查阅。
