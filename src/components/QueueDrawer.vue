<script setup lang="ts">
import { X, Trash2 } from "lucide-vue-next";
import { playerState, playerActions } from "../store/player";
import type { Song } from "../types";

function close() {
  playerState.isQueueOpen = false;
}

function playSong(song: Song) {
  playerActions.playSong(song);
}
</script>

<template>
  <div
    v-if="playerState.isQueueOpen"
    class="fixed inset-y-0 right-0 w-80 bg-[#15161c]/95 backdrop-blur-2xl border-l border-white/10 z-40 shadow-2xl flex flex-col select-none animate-in slide-in-from-right duration-200"
  >
    <!-- Drawer Header -->
    <header class="h-14 px-4 flex items-center justify-between border-b border-white/[0.08]">
      <div class="flex items-center gap-2">
        <h3 class="text-xs font-bold text-[#f1f0e9] tracking-wide">当前播放队列</h3>
        <span class="text-[10px] text-[#686d65] font-mono">
          ({{ playerState.playlist.length }} 首)
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="playerState.playlist.length > 0"
          @click="playerActions.clearQueue()"
          class="flex items-center gap-1 text-[11px] text-[#8d9188] hover:text-[#ff6b6b] transition-colors"
          title="清空队列"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>清空</span>
        </button>
        <button
          @click="close"
          class="p-1.5 text-[#8d9188] hover:text-[#f1f0e9] rounded-lg transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </header>

    <!-- Queue List -->
    <main class="flex-1 overflow-y-auto p-2 space-y-1">
      <div v-if="playerState.playlist.length === 0" class="py-20 text-center text-xs text-[#686d65]">
        播放列表为空
      </div>

      <div
        v-for="(song, idx) in playerState.playlist"
        :key="song.id"
        @dblclick="playSong(song)"
        class="flex items-center justify-between p-2 rounded-[9px] text-xs transition-colors group cursor-pointer"
        :class="
          playerState.currentSong?.id === song.id
            ? 'bg-[#23261f] text-[#d6f379] font-medium'
            : 'text-[#a8aca3] hover:bg-white/[0.04]'
        "
      >
        <div class="flex items-center gap-2.5 overflow-hidden flex-1 pr-2">
          <div
            v-if="playerState.currentSong?.id === song.id && playerState.isPlaying"
            class="flex items-end gap-0.5 h-3 w-4 flex-shrink-0"
          >
            <span class="w-0.5 bg-[#d6f379] rounded-full wave-bar-1"></span>
            <span class="w-0.5 bg-[#d6f379] rounded-full wave-bar-2"></span>
            <span class="w-0.5 bg-[#d6f379] rounded-full wave-bar-3"></span>
          </div>
          <span v-else class="text-[10px] font-mono text-[#686d65] w-4 flex-shrink-0">
            {{ (idx + 1).toString().padStart(2, "0") }}
          </span>

          <div class="truncate">
            <p class="truncate font-medium">{{ song.name }}</p>
            <p class="text-[10px] text-[#8d9188] truncate mt-0.5">
              {{ song.ar.map((a) => a.name).join(" / ") }}
            </p>
          </div>
        </div>

        <button
          @click.stop="playerActions.removeFromQueue(idx)"
          class="opacity-0 group-hover:opacity-100 p-1 text-[#686d65] hover:text-[#ff6b6b] transition-opacity"
          title="从列表移除"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </main>
  </div>
</template>
