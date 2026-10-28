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

function handleImgError(e: Event) {
  const target = e.target as HTMLImageElement;
  target.src = DEFAULT_COVER_URL;
}
</script>

<template>
  <div class="p-8 space-y-6 select-none max-w-[1100px] mx-auto">
    <!-- Back Button -->
    <button
      @click="emit('back')"
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-white/[0.06] hover:bg-white/[0.12] text-[#8d9188] hover:text-[#f1f0e9] transition-all text-xs border border-white/[0.08]"
    >
      <ArrowLeft class="w-3.5 h-3.5" />
      <span>返回上一页</span>
    </button>

    <!-- Playlist Hero Header -->
    <header class="flex flex-col sm:flex-row items-start gap-6 p-6 rounded-[19px] bg-[#171916] border border-white/[0.08]">
      <!-- Big Cover Image -->
      <div class="relative w-44 h-44 rounded-[14px] overflow-hidden shadow-2xl flex-shrink-0 border border-white/[0.1] cover-ring">
        <img
          :src="fullPlaylist.coverImgUrl"
          alt="playlist cover"
          class="w-full h-full object-cover"
        />
      </div>

      <!-- Playlist Details -->
      <div class="flex-1 flex flex-col justify-between h-44 py-1">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-[6px] text-[10px] font-bold font-mono tracking-wider uppercase bg-[#23261f] text-[#d6f379] border border-[#d6f379]/30">
              歌单
            </span>
            <h1 class="text-xl font-bold text-[#f1f0e9] tracking-tight">
              {{ fullPlaylist.name }}
            </h1>
          </div>

          <!-- Creator Info -->
          <div v-if="fullPlaylist.creator" class="flex items-center gap-2 mt-2.5 text-xs text-[#8d9188]">
            <img
              :src="fullPlaylist.creator.avatarUrl"
              alt="creator avatar"
              class="w-5 h-5 rounded-full object-cover border border-white/[0.1]"
            />
            <span class="text-[#a8aca3] font-medium">{{ fullPlaylist.creator.nickname }}</span>
            <span>·</span>
            <span>共 {{ tracks.length }} 首歌曲</span>
          </div>

          <!-- Description -->
          <p class="text-xs text-[#8d9188] mt-2.5 line-clamp-2 leading-relaxed">
            {{ fullPlaylist.description || "在静谧里倾听旋律的呼吸" }}
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-3 pt-3">
          <button
            @click="playAll"
            class="flex items-center gap-2 px-5 py-2 rounded-[9px] bg-[#d6f379] hover:bg-[#e4f796] text-[#1a1d13] text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <Play class="w-3.5 h-3.5 fill-[#1a1d13]" />
            <span>播放全部</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Track List Table -->
    <section class="space-y-1">
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

      <!-- Loading State -->
      <div v-if="isLoading" class="py-16 text-center text-xs text-[#686d65]">
        正在加载歌曲列表...
      </div>

      <!-- Song Rows -->
      <div v-else class="space-y-0.5">
        <div
          v-for="(song, idx) in tracks"
          :key="song.id"
          @dblclick="playSong(song)"
          class="h-14 px-3 grid grid-cols-12 items-center gap-2 rounded-[8px] text-xs transition-colors group cursor-pointer border-b border-white/[0.04]"
          :class="
            playerState.currentSong?.id === song.id
              ? 'bg-[#1b1e19] text-[#d6f379]'
              : 'text-[#8d9188] hover:bg-[#1b1e19]'
          "
        >
          <!-- Index / Equalizer -->
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

          <!-- Title & Cover -->
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
    </section>
  </div>
</template>
