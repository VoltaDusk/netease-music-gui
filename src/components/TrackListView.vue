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

function isSongPlaying(song: Song) {
  return playerState.currentSong?.id === song.id && playerState.isPlaying;
}

function toggleSongPlayback(song: Song) {
  if (playerState.currentSong?.id === song.id) {
    playerActions.togglePlay();
    return;
  }
  playSong(song);
}

function handleImgError(e: Event) {
  const target = e.target as HTMLImageElement;
  if (target.src !== DEFAULT_COVER_URL) {
    target.src = DEFAULT_COVER_URL;
  }
}
</script>

<template>
  <div class="tracklist-page p-8 space-y-6 select-none max-w-[1140px] mx-auto">
    <!-- Header -->
    <header class="flex items-center justify-between pb-5 border-b border-[var(--border)]">
      <div>
        <h1 class="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{{ title }}</h1>
        <p class="text-xs text-[var(--text-muted)] mt-1 font-medium">
          {{ subtitle || `共 ${songs.length} 首歌曲` }}
        </p>
      </div>

      <button
        v-if="songs.length > 0"
        @click="playAll"
        class="flex items-center gap-2 px-5 py-2 rounded-[9px] bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <Play class="w-3.5 h-3.5 fill-current" />
        <span>播放全部</span>
      </button>
    </header>

    <!-- Empty State -->
    <div
      v-if="songs.length === 0"
      class="py-24 flex flex-col items-center justify-center text-[var(--text-muted)] gap-3"
    >
      <div class="w-14 h-14 rounded-full bg-[var(--card-hover)] flex items-center justify-center text-[var(--accent)]">
        <Music class="w-7 h-7" />
      </div>
      <p class="text-xs text-[var(--text-secondary)]">{{ emptyText }}</p>
    </div>

    <!-- Song Table -->
    <div v-else class="space-y-0.5">
      <!-- Table Header -->
      <div class="grid grid-cols-12 px-3 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border)]">
        <div class="col-span-1">#</div>
        <div class="col-span-5">歌曲标题</div>
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
        @click="playSong(song)"
        class="h-14 px-3 grid grid-cols-12 items-center gap-2 rounded-[9px] text-xs transition-colors group cursor-pointer border-b border-[var(--border-subtle)]"
        :class="[
          playerState.currentSong?.id === song.id
            ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
            : 'text-[var(--text-secondary)] hover:bg-[var(--card-hover)]'
        ]"
      >
        <!-- Index / Wave / Play Action -->
        <div class="col-span-1 flex items-center justify-between pr-2">
          <span
            v-if="playerState.currentSong?.id === song.id && playerState.isPlaying"
            class="flex items-end gap-0.5 h-3"
          >
            <span class="w-0.5 bg-[var(--accent)] rounded-full wave-bar-1"></span>
            <span class="w-0.5 bg-[var(--accent)] rounded-full wave-bar-2"></span>
            <span class="w-0.5 bg-[var(--accent)] rounded-full wave-bar-3"></span>
          </span>
          <span v-else class="font-mono text-[var(--text-muted)] text-xs">
            {{ (idx + 1).toString().padStart(2, "0") }}
          </span>

          <button
            @click.stop="toggleSongPlayback(song)"
            class="opacity-0 group-hover:opacity-100 p-1 text-[var(--accent)] hover:scale-110 transition-all"
            :title="isSongPlaying(song) ? `暂停 ${song.name}` : `播放 ${song.name}`"
          >
            <Play class="w-3.5 h-3.5 fill-current" />
          </button>
        </div>

        <!-- Cover & Title -->
        <div class="col-span-5 flex items-center gap-3 overflow-hidden pr-3">
          <img
            :src="song.al.picUrl || DEFAULT_COVER_URL"
            alt="cover"
            @error="handleImgError"
            class="w-9 h-9 rounded-[7px] object-cover shrink-0 border border-[var(--border-subtle)]"
          />
          <div class="truncate">
            <span
              class="truncate font-medium block transition-colors"
              :class="playerState.currentSong?.id === song.id ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-primary)]'"
            >
              {{ song.name }}
            </span>
          </div>
        </div>

        <!-- Artist -->
        <div class="col-span-3 truncate text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] pr-2">
          {{ song.ar.map((a) => a.name).join(" / ") }}
        </div>

        <!-- Album -->
        <div class="col-span-2 truncate text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] pr-2">
          {{ song.al.name }}
        </div>

        <!-- Duration & Like -->
        <div class="col-span-1 flex items-center justify-end gap-3 font-mono text-[11px] text-[var(--text-muted)]">
          <button
            @click.stop="playerActions.toggleLike(song.id, song)"
            class="text-[var(--text-muted)] hover:text-[#ec4141] transition-colors"
            title="收藏"
          >
            <Heart
              class="w-3.5 h-3.5"
              :class="playerActions.isLiked(song.id) ? 'text-[#ec4141] fill-[#ec4141]' : ''"
            />
          </button>
          <span>{{ formatTime(song.dt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
