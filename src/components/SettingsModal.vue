<script setup lang="ts">
import { ref } from "vue";
import { X, Server, CheckCircle2, AlertCircle, Terminal, Sun, Moon } from "lucide-vue-next";
import { api } from "../services/api";
import { playerState, playerActions } from "../store/player";
import { themeState, themeActions } from "../store/theme";
import type { SongQuality } from "../types";

const apiUrl = ref(api.getBaseUrl());
const testStatus = ref<"idle" | "testing" | "success" | "error">("idle");
const testMessage = ref("");
const latency = ref(0);

function close() {
  playerState.isSettingsOpen = false;
}

async function handleSaveAndTest() {
  api.setBaseUrl(apiUrl.value);
  testStatus.value = "testing";
  testMessage.value = "正在连接 API 服务器...";

  const startTime = Date.now();
  const ok = await api.checkConnection();
  latency.value = Date.now() - startTime;

  if (ok) {
    testStatus.value = "success";
    testMessage.value = `连接成功！响应延迟: ${latency.value}ms`;
  } else {
    testStatus.value = "error";
    testMessage.value = "连接失败，请确认本地 api-enhanced 服务已启动 (默认端口3000)";
  }
}
</script>

<template>
  <div
    v-if="playerState.isSettingsOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none animate-in fade-in duration-200"
  >
    <div
      class="w-full max-w-lg bg-[#171916] border border-white/[0.08] rounded-[16px] shadow-2xl overflow-hidden flex flex-col"
    >
      <!-- Header -->
      <header class="h-14 px-6 flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02]">
        <div class="flex items-center gap-2">
          <Server class="w-4 h-4 text-[#d6f379]" />
          <h2 class="text-xs font-bold text-[#f1f0e9] tracking-wide">系统与服务设置</h2>
        </div>
        <button
          @click="close"
          class="p-1.5 text-[#8d9188] hover:text-[#f1f0e9] rounded-[7px] transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </header>

      <!-- Body Content -->
      <main class="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
        <!-- 1. API Endpoint Configuration -->
        <div class="space-y-3">
          <label class="block text-xs font-semibold text-[#f1f0e9]">
            网易云音乐 API 服务地址 (api-enhanced)
          </label>
          <div class="flex items-center gap-2">
            <input
              v-model="apiUrl"
              type="text"
              placeholder="http://localhost:3000"
              class="flex-1 px-3 py-2 rounded-[9px] bg-[#141612] border border-white/[0.08] text-[#f1f0e9] text-xs outline-none focus:border-[#d6f379]/60 transition-colors font-mono"
            />
            <button
              @click="handleSaveAndTest"
              :disabled="testStatus === 'testing'"
              class="px-4 py-2 rounded-[9px] bg-[#d6f379] hover:bg-[#e4f796] text-[#1a1d13] text-xs font-bold shadow-md disabled:opacity-50 transition-all flex-shrink-0"
            >
              {{ testStatus === "testing" ? "测试中..." : "保存并测试" }}
            </button>
          </div>

          <!-- Status Alert -->
          <div
            v-if="testStatus === 'success'"
            class="flex items-center gap-2 p-3 rounded-[9px] bg-[#23261f] border border-[#d6f379]/30 text-[#d6f379] text-xs"
          >
            <CheckCircle2 class="w-4 h-4 flex-shrink-0" />
            <span>{{ testMessage }}</span>
          </div>
          <div
            v-else-if="testStatus === 'error'"
            class="flex items-center gap-2 p-3 rounded-[9px] bg-[#28251c] border border-[#e0bb78]/30 text-[#e0bb78] text-xs"
          >
            <AlertCircle class="w-4 h-4 flex-shrink-0" />
            <span>{{ testMessage }}</span>
          </div>
        </div>

        <!-- 2. Quick Deploy Instructions -->
        <div class="p-4 rounded-[10px] bg-[#141612] border border-white/[0.08] space-y-2">
          <div class="flex items-center gap-2 text-xs font-semibold text-[#f1f0e9]">
            <Terminal class="w-3.5 h-3.5 text-[#d6f379]" />
            <span>api-enhanced 快速启动提示</span>
          </div>
          <p class="text-[11px] text-[#8d9188] leading-relaxed">
            本项目完全适配 <code class="text-[#d6f379]">NeteaseCloudMusicApiEnhanced/api-enhanced</code>。如需连接在线官方服务，请在终端执行：
          </p>
          <pre class="p-2.5 rounded-[8px] bg-[#10110f] text-[#a8aca3] font-mono text-[11px] overflow-x-auto leading-normal border border-white/[0.04]">
git clone https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced.git
cd api-enhanced
pnpm install
pnpm start</pre>
          <p class="text-[10px] text-[#686d65]">
            启动后默认监听端口为 3000，即可在客户端无缝体验完整曲库！
          </p>
        </div>

        <!-- 3. Audio Quality -->
        <div class="space-y-2">
          <label class="block text-xs font-semibold text-[#f1f0e9]">
            默认播放音质等级
          </label>
          <div class="grid grid-cols-3 gap-2 text-xs">
            <button
              v-for="q in [
                { id: 'standard', label: '标准 (128K)' },
                { id: 'higher', label: '较高 (192K)' },
                { id: 'exhigh', label: '极高 (320K)' },
                { id: 'lossless', label: '无损 (SQ)' },
                { id: 'hires', label: 'Hi-Res' },
                { id: 'jymaster', label: '超清母带' },
              ]"
              :key="q.id"
              @click="playerActions.setQuality(q.id as SongQuality)"
              class="py-2 px-2.5 rounded-[9px] border text-center transition-all font-mono text-[11px]"
              :class="
                playerState.quality === q.id
                  ? 'bg-[#23261f] border-[#d6f379]/40 text-[#d6f379] font-bold'
                  : 'bg-[#141612] border-white/[0.06] text-[#8d9188] hover:text-[#f1f0e9]'
              "
            >
              {{ q.label }}
            </button>
          </div>
        </div>

        <!-- 4. Appearance Theme Selection -->
        <div class="space-y-2">
          <label class="block text-xs font-semibold text-[#f1f0e9]">
            界面外观主题
          </label>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <button
              @click="themeActions.setTheme('dark')"
              class="py-2.5 px-3 rounded-[9px] border flex items-center justify-center gap-2 transition-all font-mono"
              :class="
                themeState.mode === 'dark'
                  ? 'bg-[#23261f] border-[#d6f379]/40 text-[#d6f379] font-bold shadow-sm'
                  : 'bg-[#141612] border-white/[0.06] text-[#8d9188] hover:text-[#f1f0e9]'
              "
            >
              <Moon class="w-3.5 h-3.5" />
              <span>极夜暗黑 (默认)</span>
            </button>
            <button
              @click="themeActions.setTheme('light')"
              class="py-2.5 px-3 rounded-[9px] border flex items-center justify-center gap-2 transition-all font-mono"
              :class="
                themeState.mode === 'light'
                  ? 'bg-[#23261f] border-[#d6f379]/40 text-[#d6f379] font-bold shadow-sm'
                  : 'bg-[#141612] border-white/[0.06] text-[#8d9188] hover:text-[#f1f0e9]'
              "
            >
              <Sun class="w-3.5 h-3.5 text-[#d97706]" />
              <span>和纸晨光 (亮色)</span>
            </button>
          </div>
        </div>

        <!-- 5. Architecture Info -->
        <div class="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-[#686d65]">
          <span>雾岛 FM · Rust Aurora Edition</span>
          <span>Rust 1.98 · Tauri v2 · 轻量化运行</span>
        </div>
      </main>
    </div>
  </div>
</template>
