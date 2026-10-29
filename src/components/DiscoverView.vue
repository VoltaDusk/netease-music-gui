<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { Play, Headphones, Heart } from "lucide-vue-next";
import { api, DEMO_SONGS, DEFAULT_COVER_URL } from "../services/api";
import { playerState, playerActions, sanitizeSongCover } from "../store/player";
import type { Banner, Playlist, Song } from "../types";

const emit = defineEmits<{
  (e: "select-playlist", playlist: Playlist): void;
  (e: "view-all-playlists"): void;
}>();

const banners = ref<Banner[]>([]);
const playlists = ref<Playlist[]>([]);
const newSongs = ref<Song[]>(DEMO_SONGS.map(sanitizeSongCover));
const isLoading = ref(true);

const todayWeekday = computed(() => {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return days[new Date().getDay()];
});

// "最近常听" 列表：优先使用用户真实的播放历史（已全部修正专辑封面），未播放时展示精选推荐
const recentSongs = computed(() => {
  if (playerState.history && playerState.history.length > 0) {
    return playerState.history.slice(0, 8);
  }
  return newSongs.value;
});

onMounted(async () => {
  try {
    const [bannerRes, playlistRes, recSongsRes] = await Promise.allSettled([
      api.getBanners(),
      api.getPersonalizedPlaylists(8),
      api.getPersonalizedNewsongs(8),
    ]);
    if (bannerRes.status === "fulfilled") banners.value = bannerRes.value;
    if (playlistRes.status === "fulfilled") playlists.value = playlistRes.value;
    if (recSongsRes.status === "fulfilled" && recSongsRes.value.length > 0) {
      newSongs.value = recSongsRes.value.map(sanitizeSongCover);
    }
  } catch (err) {
    console.error("Discover load error:", err);
  } finally {
    isLoading.value = false;
  }
});

function formatPlayCount(count: number): string {
  if (count >= 100000000) {
    return (count / 100000000).toFixed(1) + "亿";
  }
  if (count >= 10000) {
    return Math.floor(count / 10000) + "万";
  }
  return count.toString();
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function startListening() {
  if (recentSongs.value.length > 0) {
    playerActions.playSong(recentSongs.value[0], recentSongs.value);
  }
}

function playSong(song: Song) {
  playerActions.playSong(song, recentSongs.value);
}

function handleImgError(e: Event) {
  const target = e.target as HTMLImageElement;
  if (target.src !== DEFAULT_COVER_URL) {
    target.src = DEFAULT_COVER_URL;
  }
}
</script>

<template>
  <div class="p-8 space-y-8 select-none max-w-[1100px] mx-auto">
    <!-- 1. Hero Feature Banner (雾岛 FM 慢节律灵感展区) -->
    <section
      class="relative overflow-hidden p-8 md:p-10 rounded-[19px] min-h-[250px] flex flex-col justify-between border border-white/[0.08]"
      style="background: radial-gradient(ellipse at 78% 50%, rgba(152, 169, 107, 0.25), transparent 40%), linear-gradient(110deg, #252c22, #1d231d 55%, #292a20);"
    >
      <div class="relative z-10 max-w-md">
        <!-- Eyebrow Tag -->
        <span class="text-[10px] tracking-[2px] text-[#d6f379] font-mono font-semibold uppercase">
          {{ todayWeekday }} · 为你精选
        </span>

        <!-- Poetic Headline -->
        <h1 class="text-3xl md:text-4xl font-bold text-[#f1f0e9] tracking-[-1.5px] leading-tight my-3.5">
          让音乐，陪你<br />慢下来。
        </h1>

        <!-- Subtitle Paragraph -->
        <p class="text-xs text-[#b3b7aa] leading-relaxed mb-6">
          从熟悉的旋律，到还没听过的好歌。今天的灵感歌单，已经为你准备好了。
        </p>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2.5">
          <button
            @click="startListening"
            class="px-4 py-2.5 rounded-[9px] bg-[#d6f379] hover:bg-[#e4f796] text-[#1a1d13] font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <span>▶</span>
            <span>开始聆听</span>
          </button>
          <button
            @click="emit('view-all-playlists')"
            class="px-4 py-2.5 rounded-[9px] bg-white/[0.1] hover:bg-white/[0.15] text-[#eee] text-xs font-medium transition-all active:scale-95 border border-white/[0.06]"
          >
            全部歌单
          </button>
        </div>
      </div>

      <!-- Real Interactive Grooved Vinyl Disc in Hero Banner -->
      <div
        class="hero-disc animate-spin-slow pointer-events-none hidden sm:block"
        :class="{ paused: !playerState.isPlaying }"
      ></div>
    </section>

    <!-- 2. "今日灵感" Playlist Cards Grid (4 Columns) -->
    <section class="space-y-4">
      <div class="flex items-end justify-between">
        <div>
          <h2 class="text-[17px] font-bold text-[#f1f0e9]">今日灵感</h2>
          <p class="text-[10px] text-[#8d9188] mt-1">根据你的聆听习惯，为你精心挑选</p>
        </div>
        <button
          @click="emit('view-all-playlists')"
          class="text-[11px] text-[#8d9188] hover:text-[#d6f379] transition-colors"
        >
          全部歌单　›
        </button>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <div
          v-for="item in playlists.slice(0, 4)"
          :key="item.id"
          @click="emit('select-playlist', item)"
          class="flex flex-col group cursor-pointer"
        >
          <!-- Cover Container with Concentric Ring Overlay -->
          <div
            class="relative w-full aspect-square rounded-[12px] overflow-hidden bg-[#171916] shadow-md border border-white/[0.08] transition-transform duration-200 group-hover:-translate-y-1 cover-ring flex items-center justify-center"
          >
            <img
              :src="item.coverImgUrl"
              alt="cover"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />

            <!-- Play Count Badge -->
            <div
              class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md flex items-center gap-1 text-[9px] text-[#f1f0e9] font-mono"
            >
              <Headphones class="w-2.5 h-2.5 text-[#d6f379]" />
              <span>{{ formatPlayCount(item.playCount) }}</span>
            </div>

            <!-- Hover Play Button -->
            <div
              class="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <div
                class="w-10 h-10 rounded-full bg-[#d6f379] text-[#1a1d13] flex items-center justify-center shadow-lg shadow-black/40 transform scale-75 group-hover:scale-100 transition-transform duration-200"
              >
                <Play class="w-4 h-4 fill-[#1a1d13] translate-x-0.5" />
              </div>
            </div>
          </div>

          <!-- Playlist Name & Metadata -->
          <b class="text-xs text-[#f1f0e9] group-hover:text-[#d6f379] transition-colors mt-2.5 truncate leading-snug">
            {{ item.name }}
          </b>
          <span class="text-[10px] text-[#8d9188] truncate mt-1">
            推荐 · {{ item.trackCount || 30 }} 首曲目
          </span>
        </div>
      </div>
    </section>

    <!-- 3. "最近常听" / Song list rows -->
    <section class="space-y-3">
      <div class="flex items-end justify-between">
        <div>
          <h2 class="text-[17px] font-bold text-[#f1f0e9]">最近常听</h2>
          <p class="text-[10px] text-[#8d9188] mt-1">熟悉的声音，随时可以重逢</p>
        </div>
      </div>

      <div class="space-y-0.5">
        <div
          v-for="(song, idx) in recentSongs"
          :key="song.id"
          @dblclick="playSong(song)"
          class="h-14 px-3 grid grid-cols-12 items-center gap-2 border-b border-white/[0.08] text-xs text-[#8d9188] hover:bg-[#1b1e19] transition-colors cursor-pointer group rounded-lg"
          :class="playerState.currentSong?.id === song.id ? 'bg-[#1b1e19]' : ''"
        >
          <!-- Col 1: Index / Soundwave -->
          <div class="col-span-1 flex items-center justify-center">
            <span
              v-if="playerState.currentSong?.id === song.id && playerState.isPlaying"
              class="flex items-end gap-0.5 h-3"
            >
              <span class="w-0.5 bg-[#d6f379] rounded-full wave-bar-1"></span>
              <span class="w-0.5 bg-[#d6f379] rounded-full wave-bar-2"></span>
              <span class="w-0.5 bg-[#d6f379] rounded-full wave-bar-3"></span>
            </span>
            <span
              v-else
              class="font-mono text-xs text-[#686d65]"
              :class="playerState.currentSong?.id === song.id ? 'text-[#d6f379] font-bold' : ''"
            >
              {{ (idx + 1).toString().padStart(2, "0") }}
            </span>
          </div>

          <!-- Col 2: Thumbnail & Title & Artist -->
          <div class="col-span-6 flex items-center gap-3 overflow-hidden pr-2">
            <div
              @click="playSong(song)"
              class="relative w-9 h-9 rounded-[8px] overflow-hidden flex-shrink-0 border border-white/[0.08]"
            >
              <img
                :src="song.al.picUrl || DEFAULT_COVER_URL"
                alt="thumb"
                @error="handleImgError"
                class="w-full h-full object-cover"
              />
              <div
                class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Play class="w-3.5 h-3.5 fill-[#d6f379] text-[#d6f379]" />
              </div>
            </div>

            <div class="truncate">
              <span
                class="text-xs font-semibold truncate block transition-colors"
                :class="playerState.currentSong?.id === song.id ? 'text-[#d6f379]' : 'text-[#f1f0e9]'"
              >
                {{ song.name }}
              </span>
              <span class="text-[10px] text-[#8d9188] truncate block mt-0.5">
                {{ song.ar.map((a) => a.name).join(" / ") }}
              </span>
            </div>
          </div>

          <!-- Col 3: Album -->
          <div class="col-span-3 text-[11px] text-[#8d9188] truncate">
            {{ song.al.name }}
          </div>

          <!-- Col 4: Duration -->
          <div class="col-span-1 text-[11px] font-mono text-[#686d65] text-right">
            {{ formatDuration(song.dt) }}
          </div>

          <!-- Col 5: Like Action -->
          <div class="col-span-1 flex items-center justify-end">
            <button
              @click.stop="playerActions.toggleLike(song.id, song)"
              class="text-[#686d65] hover:text-[#d6f379] transition-colors"
            >
              <Heart
                class="w-3.5 h-3.5"
                :class="playerActions.isLiked(song.id) ? 'text-[#d6f379] fill-[#d6f379]' : ''"
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
