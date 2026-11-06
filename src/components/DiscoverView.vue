<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Play, UserRound, Headphones, Heart, ArrowRight } from "lucide-vue-next";
import { api, DEFAULT_COVER_URL, DEMO_SONGS } from "../services/api";
import { playerState, playerActions, sanitizeSongCover } from "../store/player";
import { userState, userActions } from "../store/user";
import type { Playlist, Song } from "../types";

const emit = defineEmits<{
  (e: "select-playlist", playlist: Playlist): void;
  (e: "view-toplists"): void;
}>();

const playlists = ref<Playlist[]>([]);
const newSongs = ref<Song[]>(DEMO_SONGS.map(sanitizeSongCover));
const toplists = ref<Playlist[]>([]);
const chartTracks = ref<Record<number, Song[]>>({});
const isLoading = ref(true);

const dateLabel = computed(() => {
  const date = new Date();
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了";
  if (hour < 11) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
});

const featuredSongs = computed(() => {
  if (playerState.history.length) return playerState.history.slice(0, 8);
  return newSongs.value;
});

const featuredArtists = computed(() => {
  const names = featuredSongs.value
    .slice(0, 4)
    .flatMap((song) => song.ar.map((artist) => artist.name));
  return Array.from(new Set(names)).slice(0, 3).join("、");
});

const featureCovers = computed(() => {
  const covers = [
    ...featuredSongs.value.map((song) => song.al.picUrl),
    ...playlists.value.map((playlist) => playlist.coverImgUrl),
  ].filter(Boolean);
  return Array.from(new Set(covers)).slice(0, 3);
});

onMounted(async () => {
  try {
    const [playlistResult, songResult, toplistResult] = await Promise.allSettled([
      api.getPersonalizedPlaylists(8),
      api.getPersonalizedNewsongs(8),
      api.getToplist(),
    ]);

    if (playlistResult.status === "fulfilled" && playlistResult.value.length) {
      playlists.value = playlistResult.value;
    }
    if (songResult.status === "fulfilled" && songResult.value.length) {
      newSongs.value = songResult.value.map(sanitizeSongCover);
    }
    if (toplistResult.status === "fulfilled") {
      toplists.value = toplistResult.value.slice(0, 4);
      const details = await Promise.allSettled(
        toplists.value.map(async (chart) => {
          const result = await api.getPlaylistDetail(chart.id, 3);
          return [chart.id, result.tracks.slice(0, 3)] as const;
        })
      );
      for (const detail of details) {
        if (detail.status === "fulfilled") {
          chartTracks.value[detail.value[0]] = detail.value[1];
        }
      }
    }
  } catch (error) {
    console.error("Discover load error:", error);
  } finally {
    isLoading.value = false;
  }
});

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

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function startListening() {
  if (featuredSongs.value.length) {
    playerActions.playSong(featuredSongs.value[0], featuredSongs.value);
  }
}

async function playPlaylistImmediately(playlist: Playlist) {
  try {
    const res = await api.getPlaylistDetail(playlist.id, 30);
    if (res.tracks && res.tracks.length > 0) {
      playerActions.playSong(res.tracks[0], res.tracks);
    }
  } catch {
    emit("select-playlist", playlist);
  }
}

function playSong(song: Song) {
  playerActions.playSong(song, newSongs.value);
}

function playChartSong(song: Song, chart: Playlist) {
  playerActions.playSong(song, chartTracks.value[chart.id] || [song]);
}

function handleCoverError(event: Event) {
  const image = event.target as HTMLImageElement;
  if (image.src !== DEFAULT_COVER_URL) image.src = DEFAULT_COVER_URL;
}
</script>

<template>
  <div class="discover-page mx-auto w-full max-w-[1140px] px-8 py-6 select-none space-y-10">
    <!-- 1. Header Greeting -->
    <header class="flex items-baseline justify-between">
      <div>
        <div class="text-xs font-semibold text-[var(--text-muted)] tracking-wider">{{ dateLabel }}</div>
        <h1 class="text-2xl font-extrabold text-[var(--text-primary)] mt-1 tracking-tight">{{ greeting }}，开启今日音乐时光</h1>
      </div>
      <div v-if="userState.isLoggedIn && userState.profile" class="text-right hidden sm:block">
        <span class="text-xs text-[var(--text-muted)]">欢迎回来，</span>
        <span class="text-xs font-bold text-[var(--accent)]">{{ userState.profile.nickname }}</span>
      </div>
    </header>

    <!-- 2. Hero Section: 每日推荐 -->
    <section class="daily-hero relative overflow-hidden rounded-[24px] min-h-[220px] flex items-center px-8 py-7 bg-gradient-to-r from-[#2a3826] via-[#384a32] to-[#455c3c] text-white shadow-xl border border-white/10">
      <div class="daily-hero-copy relative z-10 max-w-[500px]">
        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-white/90 text-[11px] font-semibold backdrop-blur-sm">
          <span>每日专属</span>
          <span>·</span>
          <span>{{ dateLabel }}</span>
        </div>
        <h2 class="text-3xl font-extrabold mt-3 tracking-tight">每日音乐推荐</h2>
        <p class="text-sm text-white/80 mt-2 line-clamp-2 leading-relaxed">
          {{ featuredArtists ? `${featuredArtists} 等，为你精心甄选的 ${featuredSongs.length} 首心动旋律` : "在静谧里倾听旋律的呼吸，享受慢节奏的舒适" }}
        </p>

        <div class="flex items-center gap-3 mt-5">
          <button
            @click="startListening"
            class="flex items-center gap-2 px-6 h-10 rounded-full font-bold text-xs bg-white text-[#1f291c] hover:bg-white/95 active:scale-95 shadow-md transition-all cursor-pointer"
          >
            <Play class="w-3.5 h-3.5 fill-current" />
            <span>播放全部</span>
          </button>
          <button
            v-if="!userState.isLoggedIn"
            @click="userActions.openLoginModal()"
            class="flex items-center gap-1.5 px-4 h-10 rounded-full font-medium text-xs bg-white/15 hover:bg-white/25 active:scale-95 text-white backdrop-blur-sm border border-white/20 transition-all cursor-pointer"
          >
            <UserRound class="w-3.5 h-3.5" />
            <span>登录同步云音乐</span>
          </button>
        </div>
      </div>

      <!-- Hero Visual: Stack of album covers and vinyl disc -->
      <div class="hidden sm:block absolute right-[6%] top-1/2 -translate-y-1/2" aria-hidden="true">
        <div class="relative w-[220px] h-[170px]">
          <!-- Vinyl Disc sticking out -->
          <div
            class="absolute right-0 top-1/2 -translate-y-1/2 w-[148px] h-[148px] rounded-full shadow-2xl border border-white/10"
            style="background: repeating-radial-gradient(circle, #1a1c18 0 3px, #262922 4px 7px);"
          >
            <div class="absolute inset-[26%] rounded-full bg-gradient-to-tr from-[#9d795e] to-[#ddc396] shadow-inner"></div>
            <div class="absolute inset-[44%] rounded-full bg-[#111] border-2 border-white/20"></div>
          </div>

          <!-- Featured Album Cover -->
          <div
            v-if="featureCovers.length"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-[140px] h-[140px] rounded-[16px] overflow-hidden shadow-2xl border border-white/20 transform -rotate-3 hover:rotate-0 transition-transform duration-300"
          >
            <img :src="featureCovers[0]" alt="" @error="handleCoverError" class="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Recommended Playlists (推荐歌单) - The primary focal point of Discover -->
    <section class="space-y-4">
      <div class="flex items-end justify-between">
        <div>
          <h2 class="text-lg font-bold text-[var(--text-primary)] tracking-tight">推荐歌单</h2>
          <p class="text-xs text-[var(--text-muted)] mt-0.5">为你量身定制的专属音乐灵感</p>
        </div>
      </div>

      <!-- Loading Skeleton -->
      <div v-if="isLoading && !playlists.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <div v-for="i in 8" :key="i" class="space-y-2">
          <div class="w-full aspect-square rounded-[14px] bg-[var(--card-hover)] animate-shimmer"></div>
          <div class="h-3.5 w-4/5 rounded bg-[var(--card-hover)] animate-shimmer"></div>
          <div class="h-3 w-1/2 rounded bg-[var(--card-hover)] animate-shimmer"></div>
        </div>
      </div>

      <!-- Playlist Cards Grid -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
        <article
          v-for="item in playlists"
          :key="item.id"
          @click="emit('select-playlist', item)"
          class="group flex flex-col cursor-pointer select-none"
        >
          <!-- Cover Image Container -->
          <div class="relative w-full aspect-square rounded-[14px] overflow-hidden bg-[var(--card-bg)] border border-[var(--border)] shadow-sm group-hover:shadow-xl group-hover:-translate-y-1.5 transition-all duration-300 cover-ring">
            <img
              :src="item.coverImgUrl"
              :alt="item.name"
              loading="lazy"
              @error="handleCoverError"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />

            <!-- Play Count Badge -->
            <div class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md flex items-center gap-1 text-[10px] text-white font-mono z-10 shadow-sm">
              <Headphones class="w-2.5 h-2.5 text-[var(--accent)]" />
              <span>{{ formatPlayCount(item.playCount) }}</span>
            </div>

            <!-- Hover Play Button Overlay -->
            <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <button
                @click.stop="playPlaylistImmediately(item)"
                class="w-11 h-11 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center shadow-2xl transform translate-y-2 group-hover:translate-y-0 active:scale-90 transition-all duration-300 cursor-pointer"
                title="立即播放歌单"
                aria-label="立即播放"
              >
                <Play class="w-5 h-5 fill-current ml-0.5" />
              </button>
            </div>
          </div>

          <!-- Playlist Title -->
          <h3 class="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] line-clamp-2 mt-2.5 leading-snug transition-colors">
            {{ item.name }}
          </h3>
        </article>
      </div>
    </section>

    <!-- 4. New Releases / Hot Tracks (新歌速递) -->
    <section class="space-y-4">
      <div class="flex items-end justify-between">
        <div>
          <h2 class="text-lg font-bold text-[var(--text-primary)] tracking-tight">新歌精选</h2>
          <p class="text-xs text-[var(--text-muted)] mt-0.5">热歌新曲 · 抢先聆听</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div
          v-for="song in newSongs.slice(0, 8)"
          :key="song.id"
          @dblclick="playSong(song)"
          @click="playSong(song)"
          class="flex items-center justify-between p-2 rounded-[11px] bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--card-hover)] transition-all cursor-pointer group"
          :class="{ 'bg-[var(--card-active)] border-[var(--accent-border)]': playerState.currentSong?.id === song.id }"
        >
          <div class="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <!-- Thumbnail with hover play -->
            <div class="relative w-11 h-11 rounded-[8px] overflow-hidden bg-[var(--card-hover)] border border-[var(--border-subtle)] shrink-0">
              <img
                :src="song.al.picUrl || DEFAULT_COVER_URL"
                alt="cover"
                loading="lazy"
                @error="handleCoverError"
                class="w-full h-full object-cover"
              />
              <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play class="w-4 h-4 fill-[var(--accent)] text-[var(--accent)]" />
              </div>
            </div>

            <!-- Title & Artist -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <span
                  class="text-xs font-semibold truncate block transition-colors"
                  :class="playerState.currentSong?.id === song.id ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-primary)]'"
                >
                  {{ song.name }}
                </span>
                <!-- Equalizer wave when playing -->
                <span
                  v-if="playerState.currentSong?.id === song.id && playerState.isPlaying"
                  class="flex items-end gap-0.5 h-2.5 shrink-0"
                >
                  <span class="w-0.5 bg-[var(--accent)] rounded-full wave-bar-1"></span>
                  <span class="w-0.5 bg-[var(--accent)] rounded-full wave-bar-2"></span>
                  <span class="w-0.5 bg-[var(--accent)] rounded-full wave-bar-3"></span>
                </span>
              </div>
              <span class="text-[11px] text-[var(--text-muted)] truncate block mt-0.5">
                {{ song.ar.map((a) => a.name).join(" / ") }} · {{ song.al.name }}
              </span>
            </div>
          </div>

          <!-- Duration & Like -->
          <div class="flex items-center gap-2.5 shrink-0 text-xs font-mono text-[var(--text-muted)]">
            <button
              @click.stop="playerActions.toggleLike(song.id, song)"
              class="p-1 text-[var(--text-muted)] hover:text-[#ec4141] transition-colors"
              title="收藏"
            >
              <Heart
                class="w-3.5 h-3.5"
                :class="playerActions.isLiked(song.id) ? 'text-[#ec4141] fill-[#ec4141]' : ''"
              />
            </button>
            <span class="w-10 text-right">{{ formatDuration(song.dt) }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 5. Official Charts Preview (官方榜单) -->
    <section class="space-y-4">
      <div class="flex items-end justify-between">
        <div>
          <h2 class="text-lg font-bold text-[var(--text-primary)] tracking-tight">官方权威榜</h2>
          <p class="text-xs text-[var(--text-muted)] mt-0.5">实时更新 · 网罗当下最热潮流</p>
        </div>
        <button
          @click="emit('view-toplists')"
          class="flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
        >
          <span>查看全部榜单</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <article
          v-for="chart in toplists"
          :key="chart.id"
          @click="emit('select-playlist', chart)"
          class="flex items-center gap-4 p-3.5 rounded-[16px] bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--card-hover)] hover:shadow-md transition-all cursor-pointer group"
        >
          <!-- Chart Cover -->
          <div class="relative w-24 h-24 rounded-[12px] overflow-hidden bg-[var(--card-hover)] border border-[var(--border-subtle)] shrink-0 cover-ring">
            <img :src="chart.coverImgUrl" :alt="chart.name" @error="handleCoverError" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <div class="absolute inset-0 bg-black/25"></div>
            <div class="absolute inset-0 flex items-center justify-center p-2 text-center">
              <span class="text-xs font-bold text-white drop-shadow leading-tight">{{ chart.name }}</span>
            </div>
          </div>

          <!-- Chart Songs Preview -->
          <div class="min-w-0 flex-1 space-y-1.5">
            <div class="flex items-center justify-between mb-1">
              <h3 class="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                {{ chart.name }}
              </h3>
              <span class="text-[10px] text-[var(--text-muted)] font-mono">实时</span>
            </div>

            <div v-if="chartTracks[chart.id]?.length" class="space-y-1">
              <button
                v-for="(song, sIdx) in chartTracks[chart.id]"
                :key="song.id"
                @click.stop="playChartSong(song, chart)"
                class="w-full flex items-center gap-2 text-left text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 px-1.5 py-0.5 rounded transition-colors"
              >
                <span class="w-3 font-bold text-[11px]" :class="sIdx === 0 ? 'text-[#ec4141]' : sIdx === 1 ? 'text-[#f59e0b]' : sIdx === 2 ? 'text-[#3b82f6]' : 'text-[var(--text-muted)]'">
                  {{ sIdx + 1 }}
                </span>
                <span class="truncate font-medium flex-1">{{ song.name }}</span>
                <span class="truncate text-[10px] text-[var(--text-muted)] max-w-[80px]">{{ song.ar.map((a) => a.name).join(" / ") }}</span>
              </button>
            </div>
            <div v-else class="text-xs text-[var(--text-muted)]">榜单曲目加载中...</div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
