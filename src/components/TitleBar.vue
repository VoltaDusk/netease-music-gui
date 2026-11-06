<script setup lang="ts">
import { computed } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, ChevronLeft, ChevronRight } from "lucide-vue-next";
import type { NavView } from "../types";

const props = withDefaults(
  defineProps<{
    currentView?: NavView;
    canGoBack?: boolean;
    canGoForward?: boolean;
  }>(),
  {
    currentView: "discover",
    canGoBack: false,
    canGoForward: false,
  }
);

const emit = defineEmits<{
  (e: "go-back"): void;
  (e: "go-forward"): void;
}>();

const appWindow = getCurrentWindow();

const viewTitleMap: Record<NavView, string> = {
  discover: "发现音乐",
  toplist: "排行榜",
  search: "搜索音乐",
  "playlist-detail": "歌单详情",
  liked: "我喜欢的音乐",
  history: "最近播放",
  playlists: "全部歌单",
};

const currentTitle = computed(() => {
  return viewTitleMap[props.currentView] || "发现音乐";
});

async function startDrag(event: MouseEvent) {
  if (event.button !== 0) return;
  const target = event.target as HTMLElement;
  if (target.closest("button, input, textarea, a, select, [role='button'], .no-drag")) return;
  try {
    await appWindow.startDragging();
  } catch {
    invoke("drag_window").catch(() => {});
  }
}

async function handleDoubleClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (target.closest("button, input, textarea, a, select, [role='button'], .no-drag")) return;
  try {
    await appWindow.toggleMaximize();
  } catch {
    invoke("toggle_maximize_window").catch(() => {});
  }
}

async function minimize() {
  try {
    await appWindow.minimize();
  } catch {
    invoke("minimize_window").catch(() => {});
  }
}

async function toggleMaximize() {
  try {
    await appWindow.toggleMaximize();
  } catch {
    invoke("toggle_maximize_window").catch(() => {});
  }
}

async function closeWindow() {
  try {
    await appWindow.close();
  } catch {
    invoke("close_window").catch(() => {});
  }
}
</script>

<template>
  <header
    @mousedown="startDrag"
    @dblclick="handleDoubleClick"
    data-tauri-drag-region
    class="app-titlebar h-[44px] w-full flex items-center justify-between px-3 select-none border-b border-[var(--border)] bg-[var(--app-bg)]/90 backdrop-blur-md z-40 relative cursor-default"
  >
    <!-- Left: History Navigation & Breadcrumb -->
    <div class="flex items-center gap-1.5 no-drag">
      <button
        @click="emit('go-back')"
        :disabled="!canGoBack"
        class="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] active:scale-95 transition-all disabled:opacity-25 disabled:pointer-events-none"
        title="后退 (Alt + Left)"
        aria-label="后退"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>

      <button
        @click="emit('go-forward')"
        :disabled="!canGoForward"
        class="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] active:scale-95 transition-all disabled:opacity-25 disabled:pointer-events-none"
        title="前进 (Alt + Right)"
        aria-label="前进"
      >
        <ChevronRight class="w-4 h-4" />
      </button>

      <span class="text-xs font-semibold text-[var(--text-muted)] select-none ml-2 tracking-wide">
        {{ currentTitle }}
      </span>
    </div>

    <!-- Center: Window Dragging Surface -->
    <div data-tauri-drag-region class="flex-1 h-full"></div>

    <!-- Right: Window Action Controls -->
    <div class="window-controls flex items-center no-drag">
      <button
        @click="minimize"
        class="w-10 h-8 rounded-[6px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] transition-colors"
        title="最小化"
        aria-label="最小化"
      >
        <Minus class="w-3.5 h-3.5" :stroke-width="1.8" />
      </button>

      <button
        @click="toggleMaximize"
        class="w-10 h-8 rounded-[6px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] transition-colors"
        title="最大化 / 还原"
        aria-label="最大化或还原"
      >
        <Square class="w-3 h-3" :stroke-width="1.8" />
      </button>

      <button
        @click="closeWindow"
        class="w-10 h-8 rounded-[6px] flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:bg-[#ec4141] transition-colors"
        title="关闭"
        aria-label="关闭"
      >
        <X class="w-4 h-4" :stroke-width="1.8" />
      </button>
    </div>
  </header>
</template>
