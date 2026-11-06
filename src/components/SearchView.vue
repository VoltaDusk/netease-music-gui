<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { Search, Heart, Clock, Play, X, Headphones } from "lucide-vue-next";
import { api, DEFAULT_COVER_URL } from "../services/api";
import { playerState, playerActions } from "../store/player";
import type { Song, Playlist } from "../types";

const props = defineProps<{
  initialQuery?: string;
}>();

const emit = defineEmits<{
  (e: "select-playlist", playlist: Playlist): void;
}>();

const query = ref(props.initialQuery || "");
const activeTab = ref<"songs" | "playlists">("songs");
const songs = ref<Song[]>([]);
const playlists = ref<Playlist[]>([]);
const isLoading = ref(false);
const hotKeywords = ref<{ searchWord: string }[]>([]);

onMounted(async () => {
  hotKeywords.value = await api.getHotSearch();
  if (query.value) {
    executeSearch();
  }
});

watch(
  () => props.initialQuery,
  (newVal) => {
    if (newVal) {
      query.value = newVal;
      executeSearch();
    }
  }
);

async function executeSearch(keyword?: string) {
  if (keyword) query.value = keyword;
  if (!query.value.trim()) return;

  isLoading.value = true;
  try {
    const type = activeTab.value === "songs" ? 1 : 1000;
    const res = await api.search(query.value, type);
    if (activeTab.value === "songs") {
      songs.value = res.songs || [];
    } else {
      playlists.value = res.playlists || [];
    }
  } catch (err) {
    console.error("Search failed:", err);
  } finally {
    isLoading.value = false;
  }
}

function handleTabChange(tab: "songs" | "playlists") {
  activeTab.value = tab;
  executeSearch();
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatPlayCount(count: number): string {
  if (!count) return "0";
  if (count >= 100000000) {
    return (count / 100000000).toFixed(1) + "亿";
  }
  if (count >= 10000) {
    return Math.floor(count / 10000) + "万";
  }
  return count.toString();
}

function playSong(song: Song) {
  playerActions.playSong(song, songs.value);
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
  <div class="search-page p-8 space-y-6 select-none max-w-[1140px] mx-auto">
    <!-- Search Input & Hot Chips -->
    <div class="space-y-3.5">
      <div class="flex items-center gap-2.5">
        <div class="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-[12px] bg-[var(--card-bg)] border border-[var(--border)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-glow)] transition-all">
          <Search class="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            v-model="query"
            @keydown.enter="executeSearch()"
            type="text"
            placeholder="搜索歌曲、艺人、专辑、歌单..."
            class="bg-transparent border-none outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] w-full"
          />
          <button v-if="query" @click="query = ''" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0">
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          @click="executeSearch()"
          class="px-5 py-2.5 rounded-[11px] bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          搜索
        </button>
      </div>

      <!-- Hot Search Tag Chips -->
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="text-[var(--text-muted)] text-[10px] tracking-wider uppercase font-semibold">热门搜索:</span>
        <button
          v-for="item in hotKeywords"
          :key="item.searchWord"
          @click="executeSearch(item.searchWord)"
          class="px-2.5 py-1 rounded-[7px] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-all text-[11px] cursor-pointer"
        >
          {{ item.searchWord }}
        </button>
      </div>
    </div>

    <!-- Tabs: Songs vs Playlists -->
    <div class="flex items-center gap-6 border-b border-[var(--border)] text-xs font-semibold">
      <button
        @click="handleTabChange('songs')"
        class="pb-3 transition-colors relative cursor-pointer"
        :class="activeTab === 'songs' ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
      >
        <span>单曲搜索</span>
        <div
          v-if="activeTab === 'songs'"
          class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[var(--accent)] rounded-full"
        ></div>
      </button>

      <button
        @click="handleTabChange('playlists')"
        class="pb-3 transition-colors relative cursor-pointer"
        :class="activeTab === 'playlists' ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
      >
        <span>歌单搜索</span>
        <div
          v-if="activeTab === 'playlists'"
          class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[var(--accent)] rounded-full"
        ></div>
      </button>
    </div>

    <!-- Results Area -->
    <div v-if="isLoading" class="py-20 text-center text-xs text-[var(--text-muted)]">
      正在检索全网音乐库...
    </div>

    <!-- Tab 1: Songs Table -->
    <div v-else-if="activeTab === 'songs'" class="space-y-1">
      <div v-if="songs.length === 0" class="py-16 text-center text-xs text-[var(--text-muted)]">
        {{ query ? "未检索到相关单曲，可尝试其他关键词" : "输入关键词后按回车搜索" }}
      </div>

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
          <div class="col-span-1 flex items-center justify-between pr-2">
            <span
              v-if="playerState.currentSong?.id === song.id && playerState.isPlaying"
              class="flex items-end gap-0.5 h-3"
            >
              <span class="w-0.5 bg-[var(--accent)] rounded-full wave-bar-1"></span>
              <span class="w-0.5 bg-[var(--accent)] rounded-full wave-bar-2"></span>
              <span class="w-0.5 bg-[var(--accent)] rounded-full wave-bar-3"></span>
            </span>
            <span v-else class="text-[var(--text-muted)] font-mono text-xs">
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

          <div class="col-span-3 truncate text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] pr-2">
            {{ song.ar.map((a) => a.name).join(" / ") }}
          </div>

          <div class="col-span-2 truncate text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] pr-2">
            {{ song.al.name }}
          </div>

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

    <!-- Tab 2: Playlists Grid -->
    <div v-else class="space-y-4">
      <div v-if="playlists.length === 0" class="py-16 text-center text-xs text-[var(--text-muted)]">
        {{ query ? "未检索到相关歌单" : "输入关键词搜索歌单" }}
      </div>

      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
        <article
          v-for="item in playlists"
          :key="item.id"
          @click="emit('select-playlist', item)"
          class="flex flex-col group cursor-pointer select-none"
        >
          <div class="relative w-full aspect-square rounded-[14px] overflow-hidden bg-[var(--card-bg)] shadow-sm border border-[var(--border)] transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl cover-ring">
            <img
              :src="item.coverImgUrl || DEFAULT_COVER_URL"
              alt="cover"
              @error="handleImgError"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div
              v-if="item.playCount"
              class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md flex items-center gap-1 text-[10px] text-white font-mono shadow-sm"
            >
              <Headphones class="w-2.5 h-2.5 text-[var(--accent)]" />
              <span>{{ formatPlayCount(item.playCount) }}</span>
            </div>
          </div>
          <h3 class="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mt-2.5 line-clamp-2 leading-snug">
            {{ item.name }}
          </h3>
        </article>
      </div>
    </div>
  </div>
</template>
