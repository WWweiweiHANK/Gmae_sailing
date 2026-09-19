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

打开 http://127.0.0.1:4173/ 。`npm run preview` 会先根据当前源码重建 `preview/index.html`，再启动本地预览；修改源码后重新执行该命令并刷新。环境音默认开启，使用原有低音量自然录音；若浏览器限制自动播放，首次点击页面或按键时恢复播放，也可点击“听海”。点击“静音”后本次运行不再自动打开；桌面已有明确保存的静音设置继续保留。

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

点击正在航行的小船，或聚焦画布后按 Enter，进入约 0.85 秒镜头过渡。复用当前 Scene、渲染器和船只对象；小船继续沿原航线前进、起伏、转弯并产生尾流，近景相机持续跟随。拖动画布任意位置可水平环绕、上下调整观察角度，带惯性和俯仰限制；画布聚焦时也支持方向键。旋转改变真实相机，海面和周围环境同步产生视差，不改变船的自然航向。原场景 OrbitControls 在展示过程中禁用，避免两个输入控制器争抢操作。

底部有颜色、徽章、船名三个页签。船体、船顶、装饰线共用 8 个可解锁颜色，切换部位后选择色卡；另有 10 个体验徽章，分为已拥有、已知未解锁和未发现三类。徽章和船名绘制在船体两侧的固定铭牌位置，共用并重复更新一张 CanvasTexture。

船名中文最多 6 字、英文数字最多 12 字，混合名称使用宽度预算并按实测文字宽度缩放。确认后应用名称；已拥有颜色和徽章点击即应用，未拥有颜色先确认解锁。外观、航行和颜色归属统一保存在当前来源的 localStorage `tiny-tides-game-v1`（键名保留，内部版本为 5）；自动迁移原 `tiny-tides-ship-v1` 外观并保留旧键。浏览器预览和 Tauri 各自持久保存，不自动跨来源同步。非法字段会回退到默认值；无法解析或版本不兼容的存档禁止覆盖，保存失败会在面板提示。

关闭或 Escape 平滑返回进入前的相机位置和观察目标，小船从当前航行位置继续，不倒退航线；有待确认的颜色时 Escape 先取消确认。进入时清除残余视角惯性，返回后不发生角度漂移。如果此前手动暂停了世界，展示和返回后都保持暂停。展示中不会保存临时近景为正常观察角度。支持减少动态效果设置，沿用原天气和徽章逻辑。

实现入口为 `ship-showcase.mjs`（镜头、点击、旋转、面板）、`ship-customization.mjs`（统一外观数据、校验与纹理），通过 `main.js` 接入原场景；UI 样式在 `template.html`。历史 HTML 快照不改。

## 航海日志 · 第六阶段

刷新本地预览，点击小船进入「我的船」，在船名下方的累计航行时间旁点击「航海日志」。小船继续航行，镜头平滑后退并移到左边；较窄竖屏改为上方小船、下方日志。开书约 1.05 秒，合书约 0.78 秒，翻页约 0.76 秒。纸页边缘、底部箭头、方向键和 PageUp/PageDown 可翻页；Home/End 到首末页，滚轮有 950 毫秒冷却。Escape 先合上书并回到「我的船」，再次按才返回海洋。支持系统减少动画设置，无翻页声音。首版按要求采用点击翻页，未加入拖角翻页。

日志只接收导演的 `encounter_completed`：未实际看见、中断及 GM 预览不写日志，也不会为了测试伪造玩家历史。现有 10 种见闻均有独立文案，鲸影保持悬念、浮出后接续故事，粉色来客重复相遇轮换文字。解锁的纪念物直接记在页脚，无领取按钮。`quiet_day` 也由导演安排：45–90 分钟活动时间检查一次，最近至少安静 10 分钟、没有在场事件且非暴雨时以 35% 概率记录；每个本地日期最多一次。参数位于 `encounter-catalog.mjs` 的 `QUIET_JOURNAL_PACING`。

第一次打开从第一页开始，此后优先首条未读所在双页，无未读时打开最后一页；打开时清除已有未读，阅读过程中新增记录只更新轻量提示，不强行跳页。旧日志保留当时船名。统一存档内部升级为版本 5，增加 `journalEntries` 和 `journalState`，保留航行值、外观、徽章、纪念物及见闻历史；旧历史缺少完整逐次内容，因此不会追溯编造旧日志。浏览器和 EXE 存档仍按来源隔离。回退到旧版前请备份统一存档；旧版本不识别版本 5。

实现入口：`journal/journal-store.mjs`（记录、校验、未读与统一存档）、`journal/journal-templates.mjs`（见闻文案）、`journal/journal-view.mjs`（复用纸页与翻页状态）、`journal/journal.html` / `journal/journal.css`（书本结构和动画）。`build.mjs` 将这些本地内容嵌入预览和桌面前端。只维护四个纸页容器，沿用原来的一个 WebGL 渲染器；不加载外部纹理或字体。实测截图、浏览器检查脚本与性能样本位于 `qa/journal-*`，限制见 `TEST_RESULTS.md`。

## 航行值 · 第二阶段

正常航行累计 60 秒获得 1 点，不足一分钟的余数保留；新存档从零开始。`main.js` 的 `isSailingActive()` 统一判断有效收益时间：展示进出动画、展示界面、暂停、隐藏、最小化、图形上下文丢失均停止累计。随船预览中航线和尾流继续推进，但航行值沿用个性化界面暂停累计的既有规则。网页标签隐藏时停止，原生桌宠单纯失焦仍累计。昼夜和天气不影响收益。

`sailing.mjs` 使用真实单调时间差计时，独立于绘制帧率；5 秒卡顿一次结算，超过 30 秒的单次执行间隔丢弃并重置时间基准。墙钟只辅助识别 Windows 休眠，不用于计算收益。当前不支持离线收益，也不保存可用于补算离线收益的时间戳。`sailingConfig()` 集中配置 60 秒兑换、25 秒自动保存、30 秒异常阈值。

`game-save.mjs` 统一管理 `{version:5, shipCustomization, sailingData, ownedColors, colorHintSeen, ownedBadges, seenBadgeNotifications, badgeProgress, encounterHistory, ownedSouvenirs, encounterDirectorState, journalEntries, journalState}`；航行字段为 `points`、`accumulatedSeconds`、`totalSailingSeconds`。在周期、整数变化、停止航行、外观修改、退出展示、网页关闭时保存；托盘退出先通知前端保存，最多等待 2 秒后退出。强制结束进程或写入失败仍可能丢失尚未落盘的进度。存档不每帧写入，界面也不每帧更新。

航行值仅在「我的船」底部面板上方显示小波浪图标和数值，悬停或点击可读说明，无桌面常驻资源栏、提示音或弹窗。管理器公开 `addSailingPoints(amount)`、`spendSailingPoints(amount)`、`canAffordSailingPoints(amount)`，仅接受正安全整数；余额不足返回 false，消费不减少历史航行秒数。颜色解锁通过这些接口扣款。

开发预览默认仍为 60 秒。需要加速验证时打开 `http://127.0.0.1:4173/?sailingDebug=fast`，变为 5 秒一点，并使用独立测试键 `tiny-tides-game-debug-v1`，不会污染正式航行值。开发控制台在保存时输出数值、余数、总时间和活动状态；桌面打包强制关闭加速与开发输出。浏览器可用页面只读诊断查看实时航行状态。

测试入口仍为 `npm run preview`，游戏代码改根目录源码，生成预览在 `preview/index.html`。若服务已运行，修改后执行 `npm run build` 并刷新即可，不需重启服务。正式打包仍执行 `npm run desktop:build`。回退第二阶段可在独立工作区检出 `d9146bc`；旧外观键保留迁移时的快照，若要保留新外观和航行数据，回退前备份新版统一存档。

## 颜色解锁 · 第三阶段

`color-catalog.mjs` 为唯一颜色配置，包含 id、名称、HEX、价格、默认归属与适用部位。奶油白、海军蓝、天空蓝默认拥有；薄荷绿 60、淡黄色 80、珊瑚橙 100、灰蓝 120、墨绿色 160 航行值。一次解锁，全船通用，没有出售或回收。

「颜色」页签先选船体、船顶或装饰线。色卡显示当前 / 已拥有 / 价格，未拥有颜色点击后在面板内出现取消和解锁确认，切换部位或页签会取消待确认操作。余额不足仅显示 1.8 秒柔和文字；成功后自动装备、更新余额，船身材质在 0.3 秒内插值至新颜色，不新建材质或纹理。首次进入显示一句说明，并在整体存档中记录已读。

`color-purchases.mjs` 每次操作都校验颜色、部位和所有权，已拥有颜色重复装备不收费。扣款通过 `spendSailingPoints` 的持久化回调，把余额、归属和装备一次写入同一存档，成功后才提交内存扣款与模型更新；写入失败保持原余额、归属与装备，避免半笔交易。初次升级自动迁移版本 1，保留船名、徽章、航行值，并把正在使用的非基础颜色加入拥有列表。

开发购买测试可打开 `http://127.0.0.1:4173/?sailingDebug=fast&debugPoints=1000`：独立测试存档首次创建时加 1000 点（1～10000 的整数），刷新不会重复加点；此存档从基础外观开始，不迁移真实外观。正式桌面构建忽略这些参数，无调试按钮。已有测试存档不会再次发放初始测试点数。

第四阶段回退基点为 `5ab8762`。升级会把原统一存档原地迁为版本 3；旧代码不识别版本 3，回退旧代码时需要使用升级前的存档备份。历史 HTML 与 outputs 中旧安装包不随开发预览自动更新。

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

## 体验徽章 · 第四阶段

刷新开发预览，点击小船 → 徽章。事件徽章未发现时仅显示 ???，名称、图案、描述及条件不会进入可见文本或无障碍标签；时间类徽章可点击查看累计进度。已拥有徽章点击即佩戴，下方显示获得日期和一句描述，也可选“无徽章”。左右船身共用原铭牌图集，约 0.3 秒淡出/切换/淡入，不新增渲染器或每次创建材质。

所有获得与佩戴都不消耗航行值。正常航行中没有弹窗、声音或强提示；下次打开徽章页可看到淡蓝 NEW，并记录为已查看，后续打开不再重复。新玩家没有默认特殊徽章。旧版实际佩戴的测试徽章保留为已拥有，获得日期标注“旧版保留 · 日期未记录”；不会编造过去发生过的事件。

配置与统一入口在 badgeCatalog / badges.mjs：

| 徽章 | 当前解锁来源 |
| --- | --- |
| 海豚同行 | 海豚真实浮出水面 |
| 极光之夜 | 至少一层真实极光光幕渐显到可见程度 |
| 穿过风雨 | 暴雨层进入且雨势实际达到 75% |
| 金色海面 | 黄昏光照过渡超过 90%，且不处于阴暗天气 |
| 星夜航行 | 星夜下累计有效航行 10 分钟 |
| 初次远航 / 老水手 | totalSailingSeconds 累计 1 小时 / 10 小时 |
| 远鲸 | 第五阶段的巨鲸轮廓实际出现；浮出事件也可幂等补领 |
| 海玻璃 / 未知徽章 | 配置和接口占位；荧光海的海玻璃是纪念物归属，不是此徽章 |

夜间进度复用有效航行时间增量，并保存在 badgeProgress.nightSailingSeconds；进入个性化、暂停、隐藏和休眠沿用原航行计时规则，不计离线收益。事件判断在场景完成绘制之后，随机排程本身不发徽章。无需用户盯着屏幕或及时领取。

worldEventBus 提供 subscribe 和 emitWorldEvent；支持 aurora_started、storm_started、sunset_started、dolphin_seen、whale_seen、sea_glass_found、sailing_milestone。解锁统一调用 unlockBadge(id, context)，永久保存 badgeId、unlockedAt、sourceEventId，重复事件不改首次记录。写入失败时保留本次运行中的待保存经历并限频重试；未保存成功不开放佩戴。

开发测试建议使用独立存档 http://127.0.0.1:4173/?sailingDebug=fast 。此模式的初次远航/老水手/星夜阈值为 30/120/10 秒，正常模式仍为 3600/36000/600 秒。在开发预览控制台可运行：

```js
debugUnlockBadge('aurora_night');
emitWorldEvent('aurora_started');
emitWorldEvent('storm_started');
emitWorldEvent('dolphin_seen');
```

正常开发地址中的控制台命令会修改该地址的正常存档，因此测试请使用上述独立地址。只有独立测试页额外暴露 debug_badge_event WebMCP 工具；正式桌面构建不导出控制台调试入口、测试工具或加速配置。徽章没有商店、等级、稀有度和日志页面；sourceEventId 供以后连接日志使用。

## 自动见闻 · 第五阶段

继续使用根目录源码开发；`npm run build` 后刷新 http://127.0.0.1:4173/ 即可查看未打包效果。没有新增常驻界面、任务领取、日志页或纪念物装备页。普通海豚也由同一个 EncounterDirector 调度，旧的独立循环不再驱动实际场景。

- `encounter-catalog.mjs`：10 项配置、条件、权重、奖励、后续链与集中节奏。日常尝试窗口 5–12 分钟，特殊 15–35 分钟，奇观 45–120 分钟；窗口是抽取机会，并非必定发生。初次日常窗口 45–90 秒；空牌、同类降权、冷却和大事件后的 90–180 秒安静期共同控制频率。
- `encounter-director.mjs`：随机牌组、至多一个主要事件加一个日常事件、极光预留、天气退出、历史与奖励。所有计时只消耗可见且未暂停的世界时间；隐藏不补算。暴雨预警即阻止动物事件并淡出。巨鲸浮出要求巨鲸之影正常完成，单纯安排或中断不满足前置。
- `encounter-visuals.mjs`：统一 prepare（启动创建）、enter/play/exit（按秒的包络）与 cleanup（隐藏复用）。48 条鱼和光迹、32 只迁徙鸟、12 条流星、14 个鲸喷水点、80 个海面光点均为固定容量；结束后停止更新这些对象。复用原海豚模型和同一水面。为保持原哑光海水，水下鱼群和鲸影使用贴合波高的风格化轮廓投影，不增加透明水体或第二套海面。
- 只在场景实际绘制到可见阶段后发现，无需点击或领取；奖励不扣航行值。重复发现增加次数，但不会重复获得纪念物或改写首次徽章日期。粉色来客具有固定 visitor ID、不同体型比例和绕船头的伴游路径。

| 见闻 ID | 表现 | 纪念物 |
| --- | --- | --- |
| underwater_fish_school | 白天鱼群穿过水下 | 无 |
| dolphin_companion | 1–3 只海豚适应船线伴游 | dolphin_charm |
| pink_dolphin | 粉色来客绕船头、伴游、离开 | pink_dolphin_charm |
| giant_whale_shadow | 远大于小船的水下鲸影 | 无；远鲸徽章 |
| giant_whale_surface | 鲸影后续，背部浮出、轻翻与呼吸、下潜 | whale_tail_charm |
| massive_bird_migration | 局部天空 V 形鸟群及淡影 | migration_feather |
| bioluminescent_sea | 夜间局部海光、船与鱼的荧光尾迹 | glowing_sea_glass |
| meteor_shower | 小天空内错落出现的流星 | meteor_star_charm |
| polar_bear_ice | 北极熊随浮冰沿海域边缘经过 | ice_bear_charm |
| fog_lighthouse | 薄雾中的临时灯塔及旋转暖光 | tiny_lighthouse |

开发测试使用独立存档地址 http://127.0.0.1:4173/?encounterDebug=fast ，自动尝试窗口缩至 10–60 秒，正常存档和航行值兑换速度不受影响。开发控制台可运行：

```js
DEBUG_ENCOUNTER_SPEED = false; // 单独看演出时先关闭自动加速
triggerEncounter('pink_dolphin');
// 夜晚且没有极光时：
triggerEncounter('bioluminescent_sea');
```

手动触发跳过冷却与等待，仍检查天气、时段、前置和事件槽；返回 started / conditions / prerequisite / slot 等结果。正常开发地址中的调试命令会写入该地址的存档，所以请用独立测试地址。正式桌面构建移除控制台入口和测试参数，并恢复正式节奏。

若需要固定环境，停止普通预览服务后执行 `npm run qa`、`node scripts/preview.mjs --qa`，打开 `http://127.0.0.1:4173/?encounterDebug=fast&encounterPreview=meteor_shower`；QA 按这个 ID 设置合适的固定天气、关闭极光，再在控制台触发。可换为表中其他 ID。先完整观看 giant_whale_shadow，才能测试 giant_whale_surface。QA 诊断也可切换浅色/深色底。完成后用 `npm run preview` 返回普通预览。

存档版本 4 新增 encounterHistory、ownedSouvenirs、encounterDirectorState，保留原进度、配色与徽章。历史包括 firstSeenAt、lastSeenAt、seenCount、completedCount；保存世界时钟、牌组与冷却，不保存进行中的演出。重载回到安静海面，历史、前置和归属继续保留。统一入口 `unlockSouvenir(id)` 校验配置、去重写入。自然完成发出 `encounter_completed`，包含 encounterId、startTime、endTime、weather、timeOfDay、shipName、firstTime、seenCount、souvenirUnlocked、badgeUnlocked，以及 visitor ID / logTemplate；天气中断使用独立的 encounter_interrupted，不冒充完整经历。

本阶段回退基点 `1d538aa`。如需回退，先备份升级前版本 3 存档；旧程序不支持版本 4，不能用版本 4 数据覆盖旧存档。本次未替换历史 HTML、旧 EXE 或安装包。

## GM 见闻模式

GM 是构建期开关，默认正式构建关闭。开启后，在网页点“编辑预览”，或在桌面托盘进入编辑模式，工具栏会出现 GM 事件选择器；可选择任意一项见闻，或选择“随机见闻”，再点“立即出现”。GM 会立即切换到该见闻适合的时段和天气，结束当前演出并播放所选事件，不受自然冷却、事件链前置或天气条件限制。

GM 演出只用于观看和测试：不会写入首次发现、重复次数、徽章、纪念物或完成日志，也不扣航行值。退出和重开后仍使用原来的正式进度。

```powershell
# 开启 GM 的网页预览
npm run preview:gm

# 开启 GM 的桌面开发窗口
$env:TINY_TIDES_GM='1'
npm run desktop:dev
Remove-Item Env:TINY_TIDES_GM

# 开启 GM 的正式 EXE 构建
$env:TINY_TIDES_GM='1'
npm run desktop:build
Remove-Item Env:TINY_TIDES_GM
```

需要关闭 GM 时，直接使用原有命令重新构建：`npm run preview`、`npm run desktop:dev` 或 `npm run desktop:build`。关闭构建会从最终 HTML 中删除 GM 面板和触发逻辑，不依赖运行时隐藏按钮。
