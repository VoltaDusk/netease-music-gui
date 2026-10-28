<script setup lang="ts">
import { playerState } from "../store/player";
import type { NavView } from "../types";

defineProps<{
  currentView: NavView;
}>();

const emit = defineEmits<{
  (e: "navigate", view: NavView): void;
}>();

const mainNavItems = [
  { id: "discover", label: "为你推荐", symbol: "⌂" },
  { id: "playlists", label: "探索音乐", symbol: "⌕" },
  { id: "toplist", label: "权威榜单", symbol: "〽" },
];

const myMusicItems = [
  { id: "liked", label: "我喜欢的音乐", symbol: "♡" },
  { id: "history", label: "最近播放", symbol: "◷" },
];
</script>

<template>
  <aside class="w-[218px] h-full flex flex-col justify-between p-5 select-none border-r border-white/[0.08] bg-[#141612]">
    <!-- Top Navigation Links -->
    <div class="space-y-6">
      <!-- Brand Title -->
      <div class="flex items-center gap-2 px-1 mb-6">
        <span class="text-xl font-serif text-[#d6f379] italic font-bold">♫</span>
        <span class="text-[17px] font-bold tracking-wide text-[#f1f0e9]">雾岛 FM</span>
        <span class="text-[9px] px-1.5 py-0.5 rounded bg-[#23261f] text-[#d6f379] border border-[#d6f379]/30 font-mono">
          NCM
        </span>
      </div>

      <!-- Section 1: 发 现 -->
      <div>
        <div class="px-2 text-[10px] font-bold text-[#686d65] tracking-[2px] mb-2 uppercase">
          发 现
        </div>
        <div class="space-y-1">
          <button
            v-for="item in mainNavItems"
            :key="item.id"
            @click="emit('navigate', item.id as NavView)"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-xs transition-all duration-200"
            :class="
              currentView === item.id
                ? 'text-[#d6f379] bg-[#23261f] font-medium shadow-sm'
                : 'text-[#a8aca3] hover:text-[#f1f0e9] hover:bg-[#1b1e19]'
            "
          >
            <span class="font-mono text-sm leading-none opacity-80">{{ item.symbol }}</span>
            <span>{{ item.label }}</span>
          </button>
        </div>
      </div>

      <!-- Divider -->
      <div class="h-[1px] bg-white/[0.08] mx-1"></div>

      <!-- Section 2: 我 的 音 乐 -->
      <div>
        <div class="px-2 text-[10px] font-bold text-[#686d65] tracking-[2px] mb-2 uppercase">
          我 的 音 乐
        </div>
        <div class="space-y-1">
          <button
            v-for="item in myMusicItems"
            :key="item.id"
            @click="emit('navigate', item.id as NavView)"
            class="w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] text-xs transition-all duration-200"
            :class="
              currentView === item.id
                ? 'text-[#d6f379] bg-[#23261f] font-medium shadow-sm'
                : 'text-[#a8aca3] hover:text-[#f1f0e9] hover:bg-[#1b1e19]'
            "
          >
            <div class="flex items-center gap-2.5">
              <span class="font-mono text-sm leading-none opacity-80">{{ item.symbol }}</span>
              <span>{{ item.label }}</span>
            </div>
            <span
              v-if="item.id === 'liked' && (playerState.likedSongs.length > 0 || playerState.likedIds.size > 0)"
              class="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-[#8d9188] font-mono"
            >
              {{ playerState.likedSongs.length || playerState.likedIds.size }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>
