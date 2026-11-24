# 声剪 · 设计稿

**声剪**是一款 Android 音频编辑 App：剪辑和处理都在手机本机完成，原音频不会被改动（每次处理都存成新版本）。只有在线音色、声音克隆、在线音乐库、AI 理解一句话、账号与会员这几项要联网。

这个仓库放的是声剪的**交互设计稿**，不是 App 源码。所有稿子都是能直接在浏览器里操作的 HTML 原型，分两条线：

| 目录 | 内容 |
| --- | --- |
| [`workbench/`](workbench/) | 编辑页（工作台）的逐轮迭代，从 v2 到 v12.2 |
| [`redesign/`](redesign/) | 不受现有设计约束、面向商业化的整体重新设计，三个方向 |
| [`workbench-work/`](workbench-work/) | 截图、点击测试、生成演示音频用的脚本 |

## 怎么看

**在线预览：https://dwyanewang.github.io/shengjian-design/**（GitHub Pages，首页列出了所有原型的入口）

也可以在本地看，不用安装任何东西。直接用浏览器打开 HTML 文件就行（`file://` 下也能用）：

- 工作台最新一轮：[`workbench/v12.2/index.html`](workbench/v12.2/index.html)
- 商业化重新设计的三个方向：[`redesign/design-demos/dir-1.html`](redesign/design-demos/dir-1.html)、[`dir-2.html`](redesign/design-demos/dir-2.html)、[`dir-3.html`](redesign/design-demos/dir-3.html)
如果想用手机在局域网里看，可以在项目目录下起一个静态服务器：

```bash
cd workbench          # 或者 redesign
python3 -m http.server 8000
# 手机浏览器打开 http://<这台电脑的局域网 IP>:8000/v12.2/
```

`workbench/redesign` 是指向 `../redesign` 的软链接，所以在 `workbench/` 下起服务器也能打开 `redesign/` 里的稿子。

## workbench/ · 工作台迭代

工作台是声剪的编辑页。每一轮是一个独立目录，打开里面的 `index.html` 就是那一轮的完整原型，和上一轮相比的改动截图放在 `ba/` 里。

- `workbench/index.html`：最早的「工作台重排」稿（移动一段、平静的默认工作台、原地处理、创作任务的去处）
- `v2`–`v9`：工作台重做。工具都放在底部，随你点的东西变化；每一轮都有能操作的原型、八个任务、关键画面和功能清单
- `v10`–`v11`：工具坞变成一个固定大小的「舞台」，工具栏、打开的设置和要拍板的事轮流上台；播放放在水线上
- `v12`：波形来自真的说话声，停顿看得见；选区两头是按住会放大的把手；导出先问用途
- `v12.1`：两处布局修正（标尺贴住声音；有背景轨时不再留空的把手行）
- `v12.2`：画布手势改成手机编辑文字的那一套：单指滚动、双指缩放，音频像一行字，播放头就是光标

已定下的方向：**一块画布 + 一个浮动工具坞**的结构（v7/v8 起），视觉方向为**「清水」**（2026-11-21 确认）。每一轮的范围和打磨记录写在该轮目录下的 `direction-approved.md` 和 `polish-log.md` 里。

## redesign/ · 商业化重新设计

这条线不参考现有界面和文案，唯一的硬约束是**93 项功能一项都不能少**，目标是让人愿意用、愿意付费。共同输入：

- [`spec.md`](redesign/spec.md)：设计 spec。说明用户是谁、商业目标、必须覆盖的功能、输出格式和约束
- [`directions.md`](redesign/directions.md)：六张方向卡，其中三张做成了完整版
- [`product-facts.md`](redesign/product-facts.md)、[`brand-spec.md`](redesign/brand-spec.md)：核实过的产品事实和品牌约束
- [`assets/demo-data.js`](redesign/assets/demo-data.js)：三个方向共用的演示内容（音频库、语音包络、一句话计划、音色、音乐库、会员价格、完整功能清单 `FEATURES`）

三个方向：

| 方向 | 想法 |
| --- | --- |
| [方向一 · 说一句，落在声音上](redesign/design-demos/dir-1.html) | 用户说的一句话是全屏最大的字。这句话被拆成几步，每一步用同一种荧光色连到波形上的对应区域 |
| [方向二 · 一个字一件事](redesign/design-demos/dir-2.html) | 每件活儿就是一个汉字（剪、铃、配、净、串……）。首页是汉字墙，点一个字进入一屏只做一件事的引导流程 |
| [方向三 · 竖着的声音](redesign/design-demos/dir-3.html) | 时间沿一条竖直的脊线往下流，录音像文字稿一样往下滚。停顿就是句子之间的空档，捏合一下就能删掉 |

每个方向都有一个 1600px 宽的展示板，上面有 6–9 台都能点着操作的手机（360×780），还有一张功能覆盖图。打磨记录见 [`polish-log.md`](redesign/polish-log.md)，截图在 `design-demos/shots/`。

## workbench-work/ · 工具脚本

这里是 Node 和 Python 脚本，用来通过 Chrome DevTools 协议驱动无头 Chrome 截图、做点击和手势测试、检查布局，以及生成演示用的语音包络和音频。脚本里写死了作者本机的 Chrome 和 Node 路径，换一台机器要先改路径。

这些脚本生成的截图、录音和日志（约 700MB）以及临时的 Chrome 配置目录都没有放进仓库，见 [`.gitignore`](.gitignore)。

## 说明

- 原型里的曲目、音频、价格都是示例数据。价格以 Google Play 为准。
- 音乐封面、音色声纹是程序生成的图形。原型本身不出声，试听时只有播放头在动。
- 第三方资源：`redesign/vendor/` 里有 React 18 和 Babel（供内联 JSX 使用）。Google 标志取自 [svgl](https://svgl.app)，只用在「用 Google 账号登录」按钮上。
- 现实参照用的 App Store 商店截图（`redesign/directions.md` 里提到的 `refs/appstore/`）版权归各自的开发商所有，没有放进仓库。
