<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import {
  Play,
  ArrowLeft,
  Heart,
  Clock,
} from "lucide-vue-next";
import { api, DEFAULT_COVER_URL } from "../services/api";
import { playerState, playerActions } from "../store/player";
import type { Playlist, Song } from "../types";

const props = defineProps<{
  playlist: Playlist;
}>();

const emit = defineEmits<{
  (e: "back"): void;
}>();

const fullPlaylist = ref<Playlist>(props.playlist);
const tracks = ref<Song[]>([]);
const isLoading = ref(true);

async function loadDetail() {
  isLoading.value = true;
  try {
    const res = await api.getPlaylistDetail(props.playlist.id);
    fullPlaylist.value = res.playlist;
    tracks.value = res.tracks;
  } catch (err) {
    console.error("Failed to load playlist detail:", err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadDetail();
});

watch(
  () => props.playlist.id,
  () => {
    loadDetail();
  }
);

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function playAll() {
  if (tracks.value.length > 0) {
    playerActions.playSong(tracks.value[0], tracks.value);
  }
}

function playSong(song: Song) {
  playerActions.playSong(song, tracks.value);
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
  <div class="playlist-detail-page p-8 space-y-6 select-none max-w-[1140px] mx-auto">
    <!-- Back Button -->
    <div>
      <button
        @click="emit('back')"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-xs border border-[var(--border)] cursor-pointer"
      >
        <ArrowLeft class="w-3.5 h-3.5" />
        <span>返回上一页</span>
      </button>
    </div>

    <!-- Playlist Hero Header -->
    <header class="flex flex-col sm:flex-row items-start gap-6 p-6 rounded-[20px] bg-[var(--card-bg)] border border-[var(--border)] shadow-sm">
      <!-- Big Cover Image -->
      <div class="relative w-44 h-44 rounded-[14px] overflow-hidden shadow-xl shrink-0 border border-[var(--border)] cover-ring">
        <img
          :src="fullPlaylist.coverImgUrl"
          alt="playlist cover"
          @error="handleImgError"
          class="w-full h-full object-cover"
        />
      </div>

      <!-- Playlist Details -->
      <div class="flex-1 flex flex-col justify-between min-h-[176px] py-0.5">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-[5px] text-[10px] font-bold font-mono tracking-wider uppercase bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]">
              歌单
            </span>
            <h1 class="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              {{ fullPlaylist.name }}
            </h1>
          </div>

          <!-- Creator Info -->
          <div v-if="fullPlaylist.creator" class="flex items-center gap-2 mt-2.5 text-xs text-[var(--text-muted)]">
            <img
              :src="fullPlaylist.creator.avatarUrl"
              alt="creator avatar"
              class="w-5 h-5 rounded-full object-cover border border-[var(--border)]"
            />
            <span class="text-[var(--text-secondary)] font-medium">{{ fullPlaylist.creator.nickname }}</span>
            <span>·</span>
            <span>共 {{ tracks.length }} 首歌曲</span>
          </div>

          <!-- Description -->
          <p class="text-xs text-[var(--text-muted)] mt-2.5 line-clamp-2 leading-relaxed">
            {{ fullPlaylist.description || "在静谧里倾听旋律的呼吸，享受慢节奏的舒适" }}
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 pt-3">
          <button
            @click="playAll"
            class="flex items-center gap-2 px-5 py-2 rounded-[9px] bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Play class="w-3.5 h-3.5 fill-current" />
            <span>播放全部</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Track List Table -->
    <section class="space-y-1">
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

      <!-- Loading State -->
      <div v-if="isLoading" class="py-16 text-center text-xs text-[var(--text-muted)]">
        正在加载歌曲列表...
      </div>

      <!-- Song Rows -->
      <div v-else class="space-y-0.5">
        <div
          v-for="(song, idx) in tracks"
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
          <!-- Index / Equalizer -->
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

          <!-- Title & Cover -->
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
    </section>
  </div>
</template>
