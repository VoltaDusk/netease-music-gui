# 🎵 雾岛 FM · 网易云音乐 Rust 桌面客户端 (v0.1.0)

基于 [NeteaseCloudMusicApiEnhanced/api-enhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced) 打造的高颜值、轻量级网易云音乐桌面客户端。

采用 **Rust 1.98 + Tauri v2 + Vue 3 + Tailwind CSS v4** 现代极简原生技术栈，颠覆传统 Electron 客户端的臃肿与高内存占用：
- 📦 **编译单文件仅 ~4.4MB**（传统客户端通常 150MB+）
- ⚡ **运行内存仅约 30~45MB**（极速瞬时冷启动，低资源消耗）
- 🎨 **双主题设计**：沉浸式「黑曜石·抹茶绿 (Obsidian & Matcha)」暗色模式 + 清新雅致「和纸·晨光 (Washi Paper)」亮色模式一键无缝切换

---

## ✨ 核心特性与设计亮点

### 🎨 极简工业美学与双模式主题
- **双模态无缝切换**：顶栏与设置面板一键切换日间/夜间模式，支持系统偏好记忆与本地持久化。
- **动态专辑氛围流光 (Ambient Light Glow)**：根据当前播放歌曲封面主色，实时柔和渲染弥散流光背景。
- **原生无边框窗口交互**：原生 Rust 事件接管窗口移动拖拽、双击最大化与智能恢复，无延迟高帧率响应。

### 🎚️ 实时动态音质无缝切换
- 底部播放栏集成 **多档位音质切换引擎**：
  - **Master (超清母带)**
  - **Hi-Res (沉浸母带/高解析)**
  - **Lossless (无损 SQ / FLAC)**
  - **320K (极高)** / **192K (较高)** / **128K (标准)**
- 智能调用 `/song/detail` 与 `/song/url/v1` 实时获取歌曲最高可用音质规格，切换音质时保持当前播放进度不断流。

### 👤 账号与云端音乐库深度同步
- **扫码与快捷登录**：支持网易云二维码扫码授权、账号状态实时监听与头像昵称显示。
- **「我喜欢的音乐」云端实时双向同步**：
  - 登录后自动获取云端红心歌单与全量歌曲 ID 列表。
  - 在任何视图点击红心，实时调用 `/like` API 实现云端与本地歌单双向秒级同步更新。

### 💽 拟真黑胶唱机与全屏沉浸播放
- **拟真唱针 (Tonearm) 物理回弹**：播放时唱针平滑旋转并精准落到唱片上，暂停时平稳抬起归位；黑胶唱片以拟真光泽度 360° 匀速自旋。
- **Apple Music 级动态滚动歌词**：
  - 毫秒级时间轴匹配，焦点歌词行放大且高亮发光。
  - 非焦点歌词自然虚化衰减，支持双语/翻译歌词实时对照。
  - **点击任意歌词行**即可无缝跳转至该时间节点即时播放。

### 🔍 智能深度搜索与媒体展示
- 采用 `/cloudsearch` 增强搜索协议，配合批量 `/song/detail` 补全元数据与超清专辑封面。
- 内置高可用 CDN 封面智能重试与优雅占位降级策略，彻底告别封面加载失败。

---

## 🚀 技术规格与性能对比

| 衡量维度 | 传统 Electron 音乐客户端 | 雾岛 FM · Rust Client (v0.1.0) | 提升表现 |
| :--- | :--- | :--- | :--- |
| **内存占用 (RAM)** | 250MB ~ 600MB+ | **~35MB** | 📉 **内存消耗降低 85% 以上** |
| **打包体积 (Binary)** | 120MB ~ 200MB+ | **4.4MB (无额外依赖单文件)** | 📉 **体积缩减 97%** |
| **冷启动速度** | 2.5s ~ 5.0s | **< 300ms** | ⚡ **近乎瞬时启动** |
| **底层核心** | 完整 Chromium + Node.js 运行时 | **Rust 核心 + 原生操作系统 Webview** | 🛡️ **内存安全且超轻量** |

---

## 🛠️ 编译与运行指南

### 前置环境需求
- [Node.js](https://nodejs.org/) (建议 v18+) & `pnpm`
- [Rust](https://www.rust-lang.org/) (建议 1.80+)
- Windows: C++ 生成工具 (Visual Studio Build Tools / MSVC)
- [api-enhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced) API 服务（默认运行在 `http://localhost:3000`）

### 1. 运行 API 服务
```bash
git clone https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced.git
cd api-enhanced
npm install
npm start
```
> 提示：客户端内置离线演示例曲与离线降级方案，未启动 API 时亦可体验界面与播放交互。

### 2. 客户端开发调试
```bash
cd netease-music-gui
pnpm install
pnpm tauri dev
```

### 3. 构建独立发布可执行文件 (.exe)
```bash
cd netease-music-gui
pnpm tauri build --no-bundle
```
编译生成的单文件可执行程序将位于：
`src-tauri/target/release/netease-music-gui.exe`

---

## 📂 源码目录结构

```
netease-music-gui/
├── src-tauri/                # Rust 核心后端 (Tauri v2)
│   ├── Cargo.toml            # Rust 依赖配置
│   ├── tauri.conf.json       # 窗口透明度、无边框、尺寸等配置
│   └── src/
│       ├── lib.rs            # 原生窗口移动、窗口控制桥接命令
│       └── main.rs           # Rust 入口
├── src/                      # 前端 UI (Vue 3 + Tailwind CSS v4)
│   ├── components/
│   │   ├── TitleBar.vue      # 顶栏窗口拖拽、日夜主题切换、登录与状态
│   │   ├── Sidebar.vue       # 极简导航侧边栏
│   │   ├── PlayerBar.vue     # 底部全功能播放控制器、实时音质切换、音量滑块
│   │   ├── VinylPlayer.vue   # 拟真黑胶唱机、唱针联动、毛玻璃背景与滚动歌词
│   │   ├── DiscoverView.vue  # 轮播海报、精选歌单瀑布流、新歌推荐
│   │   ├── PlaylistView.vue  # 歌单详情页与歌曲列表
│   │   ├── ToplistView.vue   # 官方榜单矩阵 (飙升榜、新歌榜、热歌榜)
│   │   ├── SearchView.vue    # 云搜索热词与单曲/歌单检索结果
│   │   ├── TrackListView.vue # 我喜欢的音乐 (云端同步)、最近播放
│   │   ├── QueueDrawer.vue   # 侧拉播放队列抽屉
│   │   └── SettingsModal.vue # 主题外观选择、API 节点配置与网络诊断
│   ├── services/
│   │   └── api.ts            # api-enhanced REST 客户端封装与离线降级
│   ├── store/
│   │   ├── player.ts         # 音频播放核心状态机、歌词解析、喜欢云同步
│   │   └── theme.ts          # 暗黑黑曜石 / 和纸晨光主题状态机
│   ├── types/
│   │   └── index.ts          # 歌曲、歌单、音质、用户数据类型
│   ├── style.css             # 极客暗黑与和纸亮色两套完整设计变量与动效
│   └── App.vue               # 顶层布局容器
├── package.json
└── vite.config.ts
```
