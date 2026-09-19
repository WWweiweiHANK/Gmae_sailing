# 一方小海 · Windows 桌面景观

在原 Three.js 0.180.0 项目上增量接入 Tauri 2。轮船、海洋截面、海豚、多边形海鸥和四层极光沿用原场景；网页与桌宠使用同一前端和一个渲染器。

当前开发版本含「我的船」展示与个性化，请使用 `npm run preview` 预览。`outputs` 的 EXE 与安装包仍是 2026-09-17 交付版本；源码构建与交付包独立维护。实测与未测项见 [TEST_RESULTS.md](TEST_RESULTS.md)。

## 项目结构与修改入口

当前游戏只有一份可编辑源码：项目根目录的 `main.js`、`template.html` 和各 `.mjs` 模块。Codex 后续修改游戏功能也只修改这些文件，不直接修改生成的 HTML 或 EXE。

- `history/html/`：过去的独立 HTML 快照，纳入 Git，只用于回看。
- `preview/index.html`：由当前源码生成的未打包预览，纳入 Git，便于检查每次修改后的网页效果。
- `desktop-dist/index.html`：由同一份源码临时生成的桌面打包输入；由构建命令维护，不纳入 Git。
- `src-tauri/`：透明窗口、托盘和桌面系统功能。
- `src-tauri/target/release/`：最终 EXE 和安装包构建产物，不纳入 Git。

## 测试未打包效果

开发预览：

```powershell
npm ci
npm run preview
```

打开 http://127.0.0.1:4173/ 。`npm run preview` 会先根据当前源码重建 `preview/index.html`，再启动本地预览；修改源码后重新执行该命令并刷新。音频默认关闭，点击“听海”后播放低音量自然录音。

不要直接编辑 `preview/index.html`。它是可查看、可提交的生成快照，下次构建会覆盖。直接双击 file:// HTML 曾出现停留在加载提示的问题，本地预览地址是标准测试入口。

## Windows 开发与打包

依赖：Windows 10/11、Node.js LTS、Rust MSVC stable、Visual Studio C++ 桌面开发工作负载（MSVC x64/x86 和 Windows SDK）、WebView2。仅安装 Visual Studio 编辑器并不足够。[Tauri 官方前置要求](https://v2.tauri.app/start/prerequisites/)。

本机已安装 Rust stable 到 C:/Users/ww/.cargo/bin，未修改系统 PATH；运行前可将该目录加入当前终端 PATH。用户已通过 Visual Studio Installer 安装 C++ 工作负载与 Windows SDK，此前 link.exe 缺失的构建阻塞已解除。

```powershell
npm ci
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run desktop:dev
npm run desktop:build
```

应用构建产物位于 src-tauri/target/release/tiny-tides-pet.exe，NSIS 安装包位于 src-tauri/target/release/bundle/nsis/。交付目录同时提供改名后的 EXE 与安装包。

`npm run desktop:dev` 和 `npm run desktop:build` 会先生成 `desktop-dist/index.html`，不会读取或修改 `preview/index.html`。应用脚本与音频嵌入 HTML；模型和纹理由本地代码创建，没有在线资源请求。安装包包含离线 WebView2 安装器，因此首次**构建**仍需下载构建依赖及 WebView2 安装器；最终安装和运行不依赖 CDN。直接运行 EXE 需要机器已安装 WebView2，本机已具备。NSIS 安装与卸载流程尚未实测。应用未配置签名证书。

## 桌宠操作

默认 560×540 逻辑像素、透明、无边框、无标题栏、无系统阴影、置顶、不抢焦点。展示状态通常鼠标穿透；当前开发版每 100 ms 检查光标是否命中真实船体，仅命中时接收点击，悬停不抢焦点。先建立托盘再显示窗口，避免无法恢复交互。新增原生命中交互仍需 Windows 实机操作验收。

右键托盘可显示/隐藏、编辑/锁定、切换置顶、暂停/继续、选择 30/20 FPS、开关环境音、重置位置和视角、保存性能诊断、退出。再次启动应用会通过单实例机制打开原窗口的编辑模式。

编辑模式使用“移动窗口”专用按钮拖动窗口；在海面区域拖动仅控制 OrbitControls。结束后点“锁定展示”或按 Escape。观察角度、波幅、位置、置顶和帧率保存在 %APPDATA%/com.tinytides.desktop/settings.json。位置使用物理坐标，支持负坐标显示器；托盘重置回主屏工作区。显示器或缩放变化会触发位置恢复，窗口大于工作区时等比缩小。退出前会保存状态。

隐藏、最小化或暂停时停止绘制和世界时间；恢复不补算历史帧。单纯失去焦点不暂停桌宠。网页预览在标签页隐藏时暂停。

## 我的船 · 第一阶段

点击正在航行的小船，或聚焦画布后按 Enter，进入约 0.85 秒镜头过渡。复用当前 Scene、渲染器和船只对象，只冻结航线时间；水面、天气、昼夜继续。拖动船体水平旋转、上下俯仰限制在 −20°～30°；画布聚焦时也支持方向键。原场景 OrbitControls 在展示过程中禁用。

底部有颜色、徽章、船名三个页签。船体、船顶、装饰线各提供 8 个预设色；3 个可装备测试徽章、3 个不显示名称的锁定占位。徽章和船名绘制在船体两侧的固定铭牌位置，共用并重复更新一张 CanvasTexture。

船名中文最多 6 字、英文数字最多 12 字，混合名称使用宽度预算并按实测文字宽度缩放。确认后应用名称；颜色和徽章点击即应用。外观配置保存在当前来源的 localStorage `tiny-tides-ship-v1`；浏览器预览和 Tauri 各自持久保存，不自动跨来源同步。损坏数据或不可装备的徽章会回退到默认值；写入失败会在面板提示。

关闭或 Escape 平滑返回原镜头和航线，保留外观。如果此前手动暂停了世界，返回后仍保持暂停。展示中不会保存临时近景为正常观察角度。支持减少动态效果设置；没有增加商店、解锁条件、航行值、日志或新天气系统。

实现入口为 `ship-showcase.mjs`（镜头、点击、旋转、面板）、`ship-customization.mjs`（统一外观数据、校验与纹理），通过 `main.js` 接入原场景；UI 样式在 `template.html`。历史 HTML 快照不改。

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

过去的 HTML 已复制到 [history/html](history/html/README.md) 并纳入 Git；原网页基线也保留在 Git 提交 `ddede61`。本次没有更新线上站点。

## 素材许可

录音来源、作者、许可和改编方式见 [SOUND_CREDITS.md](SOUND_CREDITS.md)；Three.js 许可见 [THREE-LICENSE.txt](THREE-LICENSE.txt)。资源均随项目提供，声音来源链接仅用于署名查阅。
