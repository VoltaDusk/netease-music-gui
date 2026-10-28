# 🎵 雾岛 FM · 网易云音乐 Rust 桌面客户端 (v0.1.0)

基于 [NeteaseCloudMusicApiEnhanced/api-enhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced) 打造的高颜值、轻量级网易云音乐桌面客户端。

采用 **Rust 1.98 + Tauri v2 + Vue 3 + Tailwind CSS v4** 现代极简原生技术栈，颠覆传统 Electron 客户端的臃肿与高内存占用：
- 📦 **编译单文件仅 ~4.4MB**（传统客户端通常 150MB+）
- ⚡ **运行内存仅约 30~45MB**（极速瞬时冷启动，低资源消耗）
- 🎨 **双主题设计**：沉浸式「黑曜石·抹茶绿 (Obsidian & Matcha)」暗色模式 + 清新雅致「和纸·晨光 (Washi Paper)」亮色模式一键无缝切换

---

## ✨ 核心特性与设计亮点



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

