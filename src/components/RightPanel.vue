<script setup lang="ts">
import { ref } from "vue";
import { X } from "lucide-vue-next";
import { playerState, playerActions } from "../store/player";
import type { Song } from "../types";

const activeTab = ref<"queue" | "lyrics">("queue");

function playSong(song: Song) {
  playerActions.playSong(song);
}
</script>

<template>
  <aside
    class="w-[270px] h-full flex flex-col justify-between p-5 select-none border-l border-white/[0.08] bg-[#141612] flex-shrink-0"
  >
    <!-- Top Area -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <!-- Title -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-bold text-[#f1f0e9] tracking-wide">
          正在播放
          <small class="text-[10px] text-[#686d65] font-mono font-normal ml-1">
            {{ playerState.playlist.length }} 首
          </small>
        </h3>

        <button
          v-if="playerState.playlist.length > 0"
          @click="playerActions.clearQueue()"
          class="text-[10px] text-[#686d65] hover:text-[#ff6b6b] transition-colors"
          title="清空队列"
        >
          清空
        </button>
      </div>

      <!-- Tabs: 播放队列 · 歌词 -->
      <div class="flex items-center gap-4 text-[10px] text-[#8d9188] pb-2.5 border-b border-white/[0.08] mb-3">
        <button
          @click="activeTab = 'queue'"
          class="transition-colors pb-1 relative"
          :class="activeTab === 'queue' ? 'text-[#f1f0e9] font-medium' : 'hover:text-[#f1f0e9]'"
        >
          <span>播放队列</span>
          <div
            v-if="activeTab === 'queue'"
            class="absolute -bottom-2.5 left-0 right-0 h-[1px] bg-[#d6f379]"
          ></div>
        </button>

        <button
          @click="activeTab = 'lyrics'"
          class="transition-colors pb-1 relative"
          :class="activeTab === 'lyrics' ? 'text-[#f1f0e9] font-medium' : 'hover:text-[#f1f0e9]'"
        >
          <span>歌词</span>
          <div
            v-if="activeTab === 'lyrics'"
            class="absolute -bottom-2.5 left-0 right-0 h-[1px] bg-[#d6f379]"
          ></div>
        </button>
      </div>

      <!-- Tab Content 1: Queue Items -->
      <div v-if="activeTab === 'queue'" class="flex-1 overflow-y-auto space-y-1 pr-1">
        <div v-if="playerState.playlist.length === 0" class="py-16 text-center text-xs text-[#686d65]">
          队列暂无歌曲
        </div>

        <div
          v-for="(song, idx) in playerState.playlist"
          :key="song.id"
          @dblclick="playSong(song)"
          class="flex items-center justify-between p-2 rounded-[8px] text-xs transition-colors group cursor-pointer"
          :class="
            playerState.currentSong?.id === song.id
              ? 'bg-[#20231d] text-[#d6f379]'
              : 'text-[#a8aca3] hover:bg-[#1b1e19]'
          "
        >
          <div class="flex items-center gap-2.5 overflow-hidden flex-1 pr-2">
            <!-- Thumbnail -->
            <div class="w-[34px] h-[34px] rounded-[6px] overflow-hidden flex-shrink-0 border border-white/[0.08]">
              <img :src="song.al.picUrl" alt="thumb" class="w-full h-full object-cover" />
            </div>

            <div class="truncate">
              <b class="truncate block text-[11px] leading-tight" :class="playerState.currentSong?.id === song.id ? 'text-[#d6f379]' : 'text-[#f1f0e9]'">
                {{ song.name }}
              </b>
              <small class="text-[9px] text-[#8d9188] truncate block mt-0.5">
                {{ song.ar.map((a) => a.name).join(" / ") }}
              </small>
            </div>
          </div>

          <button
            @click.stop="playerActions.removeFromQueue(idx)"
            class="opacity-0 group-hover:opacity-100 p-1 text-[#686d65] hover:text-[#ff6b6b] transition-opacity"
            title="移除"
          >
            <X class="w-3 h-3" />
          </button>
        </div>
      </div>

      <!-- Tab Content 2: Realtime Lyrics Preview -->
      <div v-else class="flex-1 overflow-y-auto space-y-3 py-4 text-center">
        <template v-if="playerState.lyrics && playerState.lyrics.length > 0">
          <p
            v-for="(line, idx) in playerState.lyrics.slice(
              Math.max(0, playerState.currentLyricIndex - 3),
              playerState.currentLyricIndex + 6
            )"
            :key="idx"
            @click="playerActions.seek(line.time)"
            class="text-xs transition-all duration-200 cursor-pointer"
            :class="
              line.time <= playerState.currentTime &&
              (!playerState.lyrics[playerState.currentLyricIndex + 1] ||
                playerState.currentTime < playerState.lyrics[playerState.currentLyricIndex + 1].time)
                ? 'text-[#d6f379] font-bold scale-105'
                : 'text-[#8d9188] opacity-60 hover:opacity-100'
            "
          >
            {{ line.text }}
          </p>
        </template>
        <p v-else class="text-xs text-[#686d65] py-12">暂无歌词</p>
      </div>
    </div>

    <!-- Bottom Note Box (今晚的氛围) -->
    <div class="mt-4 p-3.5 rounded-[10px] bg-[#1b1e19] border border-white/[0.08] text-[10px] text-[#8d9188] leading-[1.7]">
      <strong class="text-[#c4c8bc] font-medium block mb-0.5">今晚的氛围</strong>
      慢一点，听见更多。根据最近播放为你生成。
    </div>
  </aside>
</template>
