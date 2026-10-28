<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { Search, Heart } from "lucide-vue-next";
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

function playSong(song: Song) {
  playerActions.playSong(song, songs.value);
}

function handleImgError(e: Event) {
  const target = e.target as HTMLImageElement;
  target.src = DEFAULT_COVER_URL;
}
</script>

<template>
  <div class="p-8 space-y-6 select-none max-w-[1100px] mx-auto">
    <!-- Search Input & Hot Chips -->
    <div class="space-y-4">
      <div class="flex items-center gap-2.5">
        <div class="flex-1 flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-[#171916] border border-white/[0.08] focus-within:border-[#d6f379]/60 transition-all text-xs">
          <Search class="w-4 h-4 text-[#8d9188]" />
          <input
            v-model="query"
            @keydown.enter="executeSearch()"
            type="text"
            placeholder="搜索歌曲、艺人、专辑..."
            class="bg-transparent border-none outline-none text-[#f1f0e9] text-xs w-full placeholder-[#8d9188]"
          />
        </div>
        <button
          @click="executeSearch()"
          class="px-4 py-2 rounded-[9px] bg-[#d6f379] hover:bg-[#e4f796] text-[#1a1d13] text-xs font-bold transition-all"
        >
          搜索
        </button>
      </div>

      <!-- Hot Search Tag Chips -->
      <div class="flex flex-wrap items-center gap-1.5 text-xs">
        <span class="text-[#686d65] text-[10px] tracking-wider uppercase">热门:</span>
        <button
          v-for="item in hotKeywords"
          :key="item.searchWord"
          @click="executeSearch(item.searchWord)"
          class="px-2.5 py-0.5 rounded-[6px] bg-[#171916] hover:bg-[#20231d] text-[#8d9188] hover:text-[#f1f0e9] border border-white/[0.06] transition-all text-[11px]"
        >
          {{ item.searchWord }}
        </button>
      </div>
    </div>

    <!-- Tabs: Songs vs Playlists -->
    <div class="flex items-center gap-6 border-b border-white/[0.08] text-xs font-medium">
      <button
        @click="handleTabChange('songs')"
        class="pb-2.5 transition-colors relative"
        :class="activeTab === 'songs' ? 'text-[#f1f0e9] font-bold' : 'text-[#8d9188] hover:text-[#f1f0e9]'"
      >
        <span>单曲</span>
        <div
          v-if="activeTab === 'songs'"
          class="absolute bottom-0 left-0 right-0 h-[2px] bg-[#d6f379] rounded-full"
        ></div>
      </button>

      <button
        @click="handleTabChange('playlists')"
        class="pb-2.5 transition-colors relative"
        :class="activeTab === 'playlists' ? 'text-[#f1f0e9] font-bold' : 'text-[#8d9188] hover:text-[#f1f0e9]'"
      >
        <span>歌单</span>
        <div
          v-if="activeTab === 'playlists'"
          class="absolute bottom-0 left-0 right-0 h-[2px] bg-[#d6f379] rounded-full"
        ></div>
      </button>
    </div>

    <!-- Results Area -->
    <div v-if="isLoading" class="py-20 text-center text-xs text-[#686d65]">
      正在检索音乐库...
    </div>

    <!-- Tab 1: Songs Table -->
    <div v-else-if="activeTab === 'songs'" class="space-y-0.5">
      <div v-if="songs.length === 0" class="py-16 text-center text-xs text-[#686d65]">
        {{ query ? "未检索到相关单曲" : "输入关键词后按回车搜索" }}
      </div>

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
        <div class="col-span-1 text-[#686d65] font-mono text-xs">
          {{ (idx + 1).toString().padStart(2, "0") }}
        </div>

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

        <div class="col-span-3 truncate text-[#8d9188] group-hover:text-[#a8aca3] pr-2">
          {{ song.ar.map((a) => a.name).join(" / ") }}
        </div>

        <div class="col-span-2 truncate text-[#686d65] group-hover:text-[#8d9188] pr-2">
          {{ song.al.name }}
        </div>

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

    <!-- Tab 2: Playlists Grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      <div
        v-for="item in playlists"
        :key="item.id"
        @click="emit('select-playlist', item)"
        class="flex flex-col group cursor-pointer"
      >
        <div class="relative w-full aspect-square rounded-[12px] overflow-hidden bg-[#171916] shadow-md border border-white/[0.08] transition-transform duration-200 group-hover:-translate-y-1 cover-ring">
          <img
            :src="item.coverImgUrl || DEFAULT_COVER_URL"
            alt="cover"
            @error="handleImgError"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <b class="text-xs text-[#f1f0e9] group-hover:text-[#d6f379] transition-colors mt-2.5 line-clamp-2">
          {{ item.name }}
        </b>
      </div>
    </div>
  </div>
</template>
