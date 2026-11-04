# 🎵 雾岛 FM · 网易云音乐 Rust 桌面客户端 (v0.1.0)

<p align="center">
  <img src="https://img.shields.io/badge/Rust-1.80+-dea584.svg?style=flat-square&logo=rust" alt="Rust" />
  <img src="https://img.shields.io/badge/Tauri-v2-24c8db.svg?style=flat-square&logo=tauri" alt="Tauri" />
  <img src="https://img.shields.io/badge/Vue-3.x-4fc08d.svg?style=flat-square&logo=vue.js" alt="Vue 3" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License" />
</p>

一款追求**极简设计、轻盈体验与纯粹听觉享受**的网易云音乐第三方桌面客户端。  
采用 **Rust + Tauri v2 + Vue 3 + Tailwind CSS v4** 现代原生技术栈构建，内置官方原生 EAPI 直连引擎，**无需安装任何 Node.js 服务或配置端口，双击打开即用**。

---

## ✨ 核心特性

- 🚀 **免外部服务 · 开箱即用**
  - **内置原生直连引擎**：客户端底层采用 Rust 原生 `reqwest` 异步网络栈结合网易官方 PC 客户端 EAPI 协议（AES-128-ECB 签名与 MD5 校验），直接与网易云官方服务器通信。
  - **零外部依赖**：彻底告别原本必须常驻的 Node.js `api-enhanced` 服务，杜绝 3000 端口占用冲突与浏览器 WebView2 CORS 跨域限制。
  - **双模式容灾**：默认开启「内置原生直连」，并在设置中支持配置「自定义远程 API」，随时灵活切换。

- ⚡ **极致轻量与极低资源消耗**
  - 单文件可执行程序打包后仅 **~5.0MB**（传统 Electron 客户端体积普遍超过 150MB+）。
  - 运行时内存占用仅约 **30 ~ 50MB**，冷启动瞬时完成，低功耗、不卡顿。

- 🎨 **双主题极简美学设计**
  - **黑曜石·抹茶 (Obsidian & Matcha)**：沉浸暗色基底配合低饱和抹茶绿点缀，营造深夜录音室级的专注质感。
  - **和纸·晨露 (Washi Paper)**：温润典雅的浅色纸纹触感与清新晨露茶绿，白天办公阅读轻盈不刺眼。
  - 支持在设置界面一键丝滑切换。

- 🎚️ **动态音质自由切换**
  - 底部控制栏提供多档位音质规格菜单：
    - **Master (超清母带)**
    - **Hi-Res (沉浸母带/高解析)**
    - **Lossless (无损 SQ / FLAC)**
    - **320K (极高)** / **192K (较高)** / **128K (标准)**
  - 自动向云端嗅探当前曲目支持的最高音质规格，播放栏音质徽标随用户所选音质实时响应显示。

- 👤 **网易云账号深度同步**
  - **免密扫码登录**：内置客户端本地动态生成专属二维码，网易云手机 App 扫码即可授权，自动提取并维护持久化凭证。
  - **红心歌单双向同步**：登录后自动获取「我喜欢的音乐」全量云端列表，随时随地点击红心秒级双向同步。
  - **个人歌单展示**：完整列出用户创建与收藏的个人歌单，支持无限畅听。

- 🔍 **全网智能搜索与发现**
  - 支持单曲、歌单双模态搜索。
  - 提供实时全网热门搜索词建议。
  - 自动解析曲目原图封面与默认 Braun 唱机矢量占位图。

---

## 📥 普通用户下载使用

1. 前往 GitHub [Releases](https://github.com/VoltaDusk/netease-music-gui/releases) 页面下载最新发布的打包文件，或直接获取编译好的 `CloudMusic-Rust.exe`。
2. 双击运行即可，**无需配置环境、无需开启命令终端**。

---

## 🛠️ 开发者源码构建

如果你希望自行从源码调试或编译打包，请遵循以下流程：

### 前置环境
- [Node.js](https://nodejs.org/) (建议 v18 及以上) & [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/) (建议 1.80 及以上) & `cargo`
- Windows 平台：Visual Studio Build Tools (C++ 生成工具 / MSVC)

### 1. 克隆代码仓库
```bash
git clone https://github.com/VoltaDusk/netease-music-gui.git
cd netease-music-gui
```

### 2. 安装依赖并启动本地开发环境
```bash
pnpm install
pnpm tauri dev
```
启动后将自动运行前端热重载 Vite 服务，并拉起带有原生 Rust IPC 绑定的 Tauri 窗口。

### 3. 构建独立发布版单文件 (.exe)
```bash
pnpm tauri build --no-bundle
```
编译产物将生成于：
`src-tauri/target/release/netease-music-gui.exe`

---

## ⚙️ 架构概览

```
netease-music-gui/
├── src/                          # 前端 Vue 3 + Tailwind v4 界面层
│   ├── components/               # 界面模块 (PlayerBar, Sidebar, SettingsModal 等)
│   ├── services/
│   │   └── api.ts                # 网易官方 EAPI 逆向加密算法与请求分发引擎
│   ├── store/                    # 响应式状态管理 (播放器、用户信息、主题模式)
│   └── types/                    # 全局 TypeScript 接口规范
├── src-tauri/                    # Rust Tauri 桌面后端引擎
│   ├── src/
│   │   ├── lib.rs                # 原生 HTTP 跨域代理与窗口控制 IPC Command
│   │   └── main.rs               # 应用程序入口
│   └── Cargo.toml                # Rust 依赖声明 (tauri, reqwest, serde)
└── package.json                  # 前端依赖配置
```

---

## 🙏 致谢与灵感来源 (Acknowledgments)

本项目在内置官方 EAPI 逆向协议实现及自定义远程服务兼容时，参考了开源社区优秀的逆向成果：

- [NeteaseCloudMusicApiEnhanced/api-enhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)：提供了现代化的接口规范扩展参考，本项目设置界面的「自定义远程服务」全面兼容该规范。
- [Binaryify/NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)：网易云音乐开源 API 逆向研究的基石项目。

在此对开源社区各位开发者的无私探索与奉献致以诚挚敬意！

---

## 📄 免责声明

1. 本项目仅供技术研究、学习交流与桌面客户端架构探索，严禁用于任何商业用途。
2. 音乐数据、音频流媒体、歌词与封面图所有权均归网易云音乐（NetEase Cloud Music）及相关版权方所有。
3. 请在法律法规允许的范围内合理使用，建议支持网易云音乐官方正版服务。

## 📜 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。
