<script setup lang="ts">
import { ref } from "vue";
import { X, Server, CheckCircle2, AlertCircle, Sun, Moon, Zap, Globe } from "lucide-vue-next";
import { api } from "../services/api";
import { playerState, playerActions } from "../store/player";
import { themeState, themeActions } from "../store/theme";
import type { SongQuality } from "../types";

const apiMode = ref<"builtin" | "custom">(api.getApiMode());
const apiUrl = ref(api.getBaseUrl());
const testStatus = ref<"idle" | "testing" | "success" | "error">("idle");
const testMessage = ref("");
const latency = ref(0);

function close() {
  playerState.isSettingsOpen = false;
}

function selectApiMode(mode: "builtin" | "custom") {
  apiMode.value = mode;
  api.setApiMode(mode);
  testStatus.value = "idle";
}

async function handleSaveAndTest() {
  if (apiMode.value === "custom") {
    api.setBaseUrl(apiUrl.value);
  }
  api.setApiMode(apiMode.value);

  testStatus.value = "testing";
  testMessage.value = "正在测试网络连通性...";

  const startTime = Date.now();
  const ok = await api.checkConnection();
  latency.value = Date.now() - startTime;

  if (ok) {
    testStatus.value = "success";
    if (apiMode.value === "builtin") {
      testMessage.value = `官方服务器直连成功！响应延迟: ${latency.value}ms (原生EAPI直通，无需后台服务)`;
    } else {
      testMessage.value = `自定义服务连接成功！响应延迟: ${latency.value}ms`;
    }
  } else {
    testStatus.value = "error";
    if (apiMode.value === "builtin") {
      testMessage.value = "连接超时，请检查网络连接或稍后重试";
    } else {
      testMessage.value = `连接失败，请确认自定义服务 (${apiUrl.value}) 已启动`;
    }
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
        <!-- 1. API 引擎运行模式切换 -->
        <div class="space-y-3">
          <label class="block text-xs font-semibold text-[#f1f0e9]">
            API 服务模式
          </label>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <!-- Mode 1: Built-in Native EAPI (Default & Recommended) -->
            <button
              @click="selectApiMode('builtin')"
              class="p-3 rounded-[10px] border text-left transition-all relative flex flex-col justify-between"
              :class="
                apiMode === 'builtin'
                  ? 'bg-[#23261f] border-[#d6f379]/40 text-[#f1f0e9]'
                  : 'bg-[#141612] border-white/[0.06] text-[#8d9188] hover:text-[#f1f0e9]'
              "
            >
              <div>
                <div class="flex items-center gap-1.5">
                  <Zap class="w-3.5 h-3.5 text-[#d6f379]" />
                  <span class="font-bold">内置原生直连</span>
                </div>
                <p class="text-[10px] text-[#8d9188] mt-1 leading-relaxed">
                  集成网易云 EAPI 原生协议，免启动 Node 服务，打开即用
                </p>
              </div>
              <span
                class="self-start mt-2 px-1.5 py-0.5 rounded text-[9px] font-mono"
                :class="
                  apiMode === 'builtin'
                    ? 'bg-[#d6f379]/20 text-[#d6f379]'
                    : 'bg-white/5 text-[#8d9188]'
                "
              >
                推荐 · 开箱即用
              </span>
            </button>

            <!-- Mode 2: Custom Remote/Local Server -->
            <button
              @click="selectApiMode('custom')"
              class="p-3 rounded-[10px] border text-left transition-all relative flex flex-col justify-between"
              :class="
                apiMode === 'custom'
                  ? 'bg-[#23261f] border-[#d6f379]/40 text-[#f1f0e9]'
                  : 'bg-[#141612] border-white/[0.06] text-[#8d9188] hover:text-[#f1f0e9]'
              "
            >
              <div>
                <div class="flex items-center gap-1.5">
                  <Globe class="w-3.5 h-3.5 text-[#8d9188]" />
                  <span class="font-bold">自定义远程服务</span>
                </div>
                <p class="text-[10px] text-[#8d9188] mt-1 leading-relaxed">
                  对接外部 api-enhanced 节点或私有部署地址
                </p>
              </div>
              <span
                class="self-start mt-2 px-1.5 py-0.5 rounded text-[9px] font-mono"
                :class="
                  apiMode === 'custom'
                    ? 'bg-[#d6f379]/20 text-[#d6f379]'
                    : 'bg-white/5 text-[#8d9188]'
                "
              >
                自建节点
              </span>
            </button>
          </div>

          <!-- Configuration Panel Based on Mode -->
          <div v-if="apiMode === 'builtin'" class="p-3.5 rounded-[10px] bg-[#141612] border border-white/[0.08] flex items-center justify-between gap-3">
            <div class="space-y-0.5">
              <span class="text-xs font-semibold text-[#f1f0e9]">网易云音乐官方原生集群</span>
              <p class="text-[10px] font-mono text-[#8d9188]">interfacepc.music.163.com (已内置驱动)</p>
            </div>
            <button
              @click="handleSaveAndTest"
              :disabled="testStatus === 'testing'"
              class="px-3.5 py-1.5 rounded-[8px] bg-[#d6f379] hover:bg-[#e4f796] text-[#1a1d13] text-xs font-bold shadow-md disabled:opacity-50 transition-all flex-shrink-0"
            >
              {{ testStatus === "testing" ? "测试中..." : "测试连接" }}
            </button>
          </div>

          <div v-else class="space-y-2">
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

        <!-- 2. Audio Quality -->
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

        <!-- 3. Appearance Theme Selection -->
        <div class="space-y-2">
          <label class="block text-xs font-semibold text-[#f1f0e9]">
            界面外观主题
          </label>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <button
              @click="themeActions.setTheme('dark')"
              class="p-3 rounded-[10px] border text-left transition-all flex items-center justify-between"
              :class="
                themeState.mode === 'dark'
                  ? 'bg-[#23261f] border-[#d6f379]/40 text-[#d6f379] font-bold'
                  : 'bg-[#141612] border-white/[0.06] text-[#8d9188] hover:text-[#f1f0e9]'
              "
            >
              <div class="flex items-center gap-2">
                <Moon class="w-4 h-4 text-[#d6f379]" />
                <span>黑曜石 · 抹茶绿 (暗色)</span>
              </div>
              <span v-if="themeState.mode === 'dark'">✓</span>
            </button>

            <button
              @click="themeActions.setTheme('light')"
              class="p-3 rounded-[10px] border text-left transition-all flex items-center justify-between"
              :class="
                themeState.mode === 'light'
                  ? 'bg-[#23261f] border-[#d6f379]/40 text-[#d6f379] font-bold'
                  : 'bg-[#141612] border-white/[0.06] text-[#8d9188] hover:text-[#f1f0e9]'
              "
            >
              <div class="flex items-center gap-2">
                <Sun class="w-4 h-4 text-[#ffc83b]" />
                <span>和纸 · 晨光 (亮色)</span>
              </div>
              <span v-if="themeState.mode === 'light'">✓</span>
            </button>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="h-14 px-6 flex items-center justify-between border-t border-white/[0.08] bg-white/[0.01]">
        <span class="text-[10px] text-[#686d65] font-mono">
          雾岛 FM · Rust Aurora v0.1.0 · 内置 EAPI 引擎
        </span>
        <button
          @click="close"
          class="px-4 py-1.5 rounded-[8px] bg-white/[0.08] hover:bg-white/[0.12] text-xs text-[#f1f0e9] transition-colors"
        >
          完成
        </button>
      </footer>
    </div>
  </div>
</template>
