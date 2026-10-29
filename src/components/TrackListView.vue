<script setup lang="ts">
import { Play, Heart, Clock, Music } from "lucide-vue-next";
import { playerState, playerActions } from "../store/player";
import { DEFAULT_COVER_URL } from "../services/api";
import type { Song } from "../types";

const props = defineProps<{
  title: string;
  subtitle?: string;
  songs: Song[];
  emptyText: string;
}>();

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function playAll() {
  if (props.songs.length > 0) {
    playerActions.playSong(props.songs[0], props.songs);
  }
}

function playSong(song: Song) {
  playerActions.playSong(song, props.songs);
}

function handleImgError(e: Event) {
  const target = e.target as HTMLImageElement;
  if (target.src !== DEFAULT_COVER_URL) {
    target.src = DEFAULT_COVER_URL;
  }
}
</script>

<template>
  <div class="p-8 space-y-6 select-none max-w-[1100px] mx-auto">
    <!-- Header -->
    <header class="flex items-center justify-between pb-4 border-b border-white/[0.08]">
      <div>
        <h1 class="text-xl font-bold text-[#f1f0e9] tracking-tight">{{ title }}</h1>
        <p class="text-xs text-[#8d9188] mt-1">
          {{ subtitle || `共 ${songs.length} 首歌曲` }}
        </p>
      </div>

      <button
        v-if="songs.length > 0"
        @click="playAll"
        class="flex items-center gap-2 px-5 py-2 rounded-[9px] bg-[#d6f379] hover:bg-[#e4f796] text-[#1a1d13] text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
      >
        <Play class="w-3.5 h-3.5 fill-[#1a1d13]" />
        <span>播放全部</span>
      </button>
    </header>

    <!-- Empty State -->
    <div
      v-if="songs.length === 0"
      class="py-24 flex flex-col items-center justify-center text-[#686d65] gap-3"
    >
      <Music class="w-8 h-8 opacity-40 text-[#d6f379]" />
      <p class="text-xs">{{ emptyText }}</p>
    </div>

    <!-- Song Table -->
    <div v-else class="space-y-0.5">
      <!-- Table Header -->
      <div class="grid grid-cols-12 px-3 py-2 text-[10px] font-bold text-[#686d65] uppercase tracking-[1.5px] border-b border-white/[0.08]">
        <div class="col-span-1">#</div>
        <div class="col-span-5">歌曲</div>
        <div class="col-span-3">艺人</div>
        <div class="col-span-2">专辑</div>
        <div class="col-span-1 text-right flex items-center justify-end gap-1">
          <Clock class="w-3.5 h-3.5" />
        </div>
      </div>

      <!-- Song Rows -->
      <div
        v-for="(song, idx) in songs"
        :key="song.id"
        @dblclick="playSong(song)"
        class="h-14 px-3 grid grid-cols-12 items-center gap-2 rounded-[8px] text-xs transition-colors group cursor-pointer border-b border-white/[0.04]"
        :class="
          playerState.currentSong?.id === song.id
            ? 'bg-[#1b1e19] text-[#d6f379]'
            : 'text-[#8d9188] hover:bg-[#1b1e19]'
        "
      >
        <!-- Index / Wave -->
        <div class="col-span-1 flex items-center">
          <span
            v-if="playerState.currentSong?.id === song.id && playerState.isPlaying"
            class="flex items-end gap-0.5 h-3"
          >
            <span class="w-0.5 bg-[#d6f379] rounded-full wave-bar-1"></span>
            <span class="w-0.5 bg-[#d6f379] rounded-full wave-bar-2"></span>
            <span class="w-0.5 bg-[#d6f379] rounded-full wave-bar-3"></span>
          </span>
          <span v-else class="font-mono text-[#686d65] text-xs">
            {{ (idx + 1).toString().padStart(2, "0") }}
          </span>
        </div>

        <!-- Cover & Title -->
        <div class="col-span-5 flex items-center gap-3 overflow-hidden pr-3">
          <img
            :src="song.al.picUrl || DEFAULT_COVER_URL"
            alt="cover"
            @error="handleImgError"
            class="w-9 h-9 rounded-[8px] object-cover flex-shrink-0 border border-white/[0.08]"
          />
          <div class="truncate">
            <span
              class="truncate font-semibold block transition-colors"
              :class="playerState.currentSong?.id === song.id ? 'text-[#d6f379]' : 'text-[#f1f0e9]'"
            >
              {{ song.name }}
            </span>
          </div>
        </div>

        <!-- Artist -->
        <div class="col-span-3 truncate text-[#8d9188] group-hover:text-[#a8aca3] pr-2">
          {{ song.ar.map((a) => a.name).join(" / ") }}
        </div>

        <!-- Album -->
        <div class="col-span-2 truncate text-[#686d65] group-hover:text-[#8d9188] pr-2">
          {{ song.al.name }}
        </div>

        <!-- Duration & Like -->
        <div class="col-span-1 flex items-center justify-end gap-3 font-mono text-[11px] text-[#686d65]">
          <button
            @click.stop="playerActions.toggleLike(song.id, song)"
            class="text-[#686d65] hover:text-[#d6f379] transition-colors"
          >
            <Heart
              class="w-3.5 h-3.5"
              :class="playerActions.isLiked(song.id) ? 'text-[#d6f379] fill-[#d6f379]' : ''"
            />
          </button>
          <span>{{ formatTime(song.dt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
