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
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-200"
  >
    <div
      class="w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border)] rounded-[18px] shadow-2xl overflow-hidden flex flex-col text-[var(--text-primary)]"
    >
      <!-- Header -->
      <header class="h-14 px-6 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card-hover)]/50">
        <div class="flex items-center gap-2">
          <Server class="w-4 h-4 text-[var(--accent)]" />
          <h2 class="text-xs font-bold text-[var(--text-primary)] tracking-wide">系统与服务设置</h2>
        </div>
        <button
          @click="close"
          class="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] rounded-[7px] transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </header>

      <!-- Body Content -->
      <main class="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
        <!-- 1. API 引擎运行模式切换 -->
        <div class="space-y-3">
          <label class="block text-xs font-semibold text-[var(--text-primary)]">
            API 服务模式
          </label>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <!-- Mode 1: Built-in Native EAPI (Default & Recommended) -->
            <button
              @click="selectApiMode('builtin')"
              class="p-3.5 rounded-[12px] border text-left transition-all relative flex flex-col justify-between cursor-pointer"
              :class="[
                apiMode === 'builtin'
                  ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--text-primary)]'
                  : 'bg-[var(--card-hover)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              ]"
            >
              <div>
                <div class="flex items-center gap-1.5">
                  <Zap class="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span class="font-bold">内置原生直连</span>
                </div>
                <p class="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  集成网易云 EAPI 原生协议，免启动 Node 服务，打开即用
                </p>
              </div>
              <span
                class="self-start mt-2 px-1.5 py-0.5 rounded text-[9px] font-mono"
                :class="
                  apiMode === 'builtin'
                    ? 'bg-[var(--accent)] text-[var(--accent-text)] font-semibold'
                    : 'bg-black/5 dark:bg-white/5 text-[var(--text-muted)]'
                "
              >
                推荐 · 开箱即用
              </span>
            </button>

            <!-- Mode 2: Custom Remote/Local Server -->
            <button
              @click="selectApiMode('custom')"
              class="p-3.5 rounded-[12px] border text-left transition-all relative flex flex-col justify-between cursor-pointer"
              :class="[
                apiMode === 'custom'
                  ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--text-primary)]'
                  : 'bg-[var(--card-hover)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              ]"
            >
              <div>
                <div class="flex items-center gap-1.5">
                  <Globe class="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span class="font-bold">自定义远程服务</span>
                </div>
                <p class="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  对接外部 api-enhanced 节点或私有部署地址
                </p>
              </div>
              <span
                class="self-start mt-2 px-1.5 py-0.5 rounded text-[9px] font-mono"
                :class="
                  apiMode === 'custom'
                    ? 'bg-[var(--accent)] text-[var(--accent-text)] font-semibold'
                    : 'bg-black/5 dark:bg-white/5 text-[var(--text-muted)]'
                "
              >
                自建节点
              </span>
            </button>
          </div>

          <!-- Configuration Panel Based on Mode -->
          <div v-if="apiMode === 'builtin'" class="p-3.5 rounded-[10px] bg-[var(--card-hover)] border border-[var(--border)] flex items-center justify-between gap-3">
            <div class="space-y-0.5 min-w-0">
              <span class="text-xs font-semibold text-[var(--text-primary)] block">网易云音乐官方原生集群</span>
              <p class="text-[10px] font-mono text-[var(--text-muted)] truncate">interfacepc.music.163.com (已内置驱动)</p>
            </div>
            <button
              @click="handleSaveAndTest"
              :disabled="testStatus === 'testing'"
              class="px-3.5 py-1.5 rounded-[8px] bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold shadow-md disabled:opacity-50 transition-all shrink-0 cursor-pointer"
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
                class="flex-1 px-3 py-2 rounded-[9px] bg-[var(--card-hover)] border border-[var(--border)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--accent)] font-mono transition-colors"
              />
              <button
                @click="handleSaveAndTest"
                :disabled="testStatus === 'testing'"
                class="px-4 py-2 rounded-[9px] bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold shadow-md disabled:opacity-50 transition-all shrink-0 cursor-pointer"
              >
                {{ testStatus === "testing" ? "测试中..." : "保存并测试" }}
              </button>
            </div>
          </div>

          <!-- Status Alert -->
          <div
            v-if="testStatus === 'success'"
            class="flex items-center gap-2 p-3 rounded-[9px] bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] text-xs font-medium"
          >
            <CheckCircle2 class="w-4 h-4 shrink-0" />
            <span>{{ testMessage }}</span>
          </div>
          <div
            v-else-if="testStatus === 'error'"
            class="flex items-center gap-2 p-3 rounded-[9px] bg-[#ec4141]/10 border border-[#ec4141]/30 text-[#ec4141] text-xs font-medium"
          >
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{{ testMessage }}</span>
          </div>
        </div>

        <!-- 2. Audio Quality -->
        <div class="space-y-2.5">
          <label class="block text-xs font-semibold text-[var(--text-primary)]">
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
              class="py-2.5 px-2 rounded-[9px] border text-center transition-all font-mono text-[11px] cursor-pointer"
              :class="[
                playerState.quality === q.id
                  ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)] font-bold'
                  : 'bg-[var(--card-hover)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              ]"
            >
              {{ q.label }}
            </button>
          </div>
        </div>

        <!-- 3. Appearance Theme Selection -->
        <div class="space-y-2.5">
          <label class="block text-xs font-semibold text-[var(--text-primary)]">
            界面外观主题
          </label>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <button
              @click="themeActions.setTheme('dark')"
              class="p-3 rounded-[10px] border text-left transition-all flex items-center justify-between cursor-pointer"
              :class="[
                themeState.mode === 'dark'
                  ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)] font-bold'
                  : 'bg-[var(--card-hover)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              ]"
            >
              <div class="flex items-center gap-2">
                <Moon class="w-4 h-4 text-[#d6f379]" />
                <span>黑曜石 · 抹茶绿 (暗色)</span>
              </div>
              <span v-if="themeState.mode === 'dark'">✓</span>
            </button>

            <button
              @click="themeActions.setTheme('light')"
              class="p-3 rounded-[10px] border text-left transition-all flex items-center justify-between cursor-pointer"
              :class="[
                themeState.mode === 'light'
                  ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)] font-bold'
                  : 'bg-[var(--card-hover)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              ]"
            >
              <div class="flex items-center gap-2">
                <Sun class="w-4 h-4 text-[#f59e0b]" />
                <span>和纸 · 晨光 (亮色)</span>
              </div>
              <span v-if="themeState.mode === 'light'">✓</span>
            </button>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="h-14 px-6 flex items-center justify-between border-t border-[var(--border)] bg-[var(--card-hover)]/30">
        <span class="text-[10px] text-[var(--text-muted)] font-mono">
          雾岛 FM · Rust Aurora v0.1.0 · 内置 EAPI 引擎
        </span>
        <button
          @click="close"
          class="px-4 py-1.5 rounded-[8px] bg-[var(--card-hover)] hover:bg-[var(--card-active)] text-xs text-[var(--text-primary)] font-semibold transition-colors cursor-pointer"
        >
          完成
        </button>
      </footer>
    </div>
  </div>
</template>
