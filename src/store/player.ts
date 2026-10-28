import { reactive } from "vue";
import type { Song, PlayMode, LyricLine, SongQuality, QualityOption } from "../types";
import { api, DEMO_SONGS } from "../services/api";
import { userState } from "./user";

const audio = new Audio();
audio.preload = "auto";

const STORAGE_KEY_LIKED = "cloudmusic_liked_ids";
const STORAGE_KEY_LIKED_SONGS = "cloudmusic_liked_songs_cache";
const STORAGE_KEY_HISTORY = "cloudmusic_history";
const STORAGE_KEY_QUALITY = "cloudmusic_preferred_quality";

function loadLikedIds(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIKED);
    return new Set(raw ? JSON.parse(raw) : [1330348068]);
  } catch {
    return new Set();
  }
}

function loadLikedSongsCache(): Song[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIKED_SONGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadHistory(): Song[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    return raw ? JSON.parse(raw) : DEMO_SONGS.slice(0, 3);
  } catch {
    return [];
  }
}

export const playerState = reactive({
  currentSong: null as Song | null,
  playlist: [...DEMO_SONGS] as Song[],
  currentIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  playMode: "sequence" as PlayMode,
  lyrics: [] as LyricLine[],
  currentLyricIndex: 0,
  isVinylOpen: false,
  isQueueOpen: false,
  isSettingsOpen: false,
  history: loadHistory(),
  likedIds: loadLikedIds(),
  likedSongs: loadLikedSongsCache(),
  isSyncingLiked: false,
  isLoading: false,
  hasError: false,
  errorMessage: "",
  // 歌曲音质管理
  quality: (localStorage.getItem(STORAGE_KEY_QUALITY) || "lossless") as SongQuality,
  actualQuality: "lossless" as SongQuality,
  currentBitrate: 0,
  availableQualities: [
    { level: "jymaster", label: "超清母带", badge: "MASTER", sub: "Master 24bit/192kHz", available: false },
    { level: "hires", label: "Hi-Res 音质", badge: "HI-RES", sub: "FLAC 24bit/96kHz", available: true },
    { level: "lossless", label: "无损音质", badge: "LOSSLESS", sub: "FLAC 16bit/44.1kHz", available: true },
    { level: "exhigh", label: "极高音质", badge: "320K", sub: "MP3 320kbps", available: true },
    { level: "higher", label: "较高音质", badge: "192K", sub: "MP3 192kbps", available: true },
    { level: "standard", label: "标准音质", badge: "128K", sub: "MP3 128kbps", available: true },
  ] as QualityOption[],
});

audio.volume = playerState.volume;

// Audio Event Listeners
audio.addEventListener("timeupdate", () => {
  playerState.currentTime = audio.currentTime;
  updateLyricIndex(audio.currentTime);
});

audio.addEventListener("loadedmetadata", () => {
  playerState.duration = audio.duration || (playerState.currentSong ? playerState.currentSong.dt / 1000 : 0);
  playerState.isLoading = false;
});

audio.addEventListener("ended", () => {
  if (playerState.playMode === "loop") {
    audio.currentTime = 0;
    audio.play();
  } else {
    playerActions.next();
  }
});

audio.addEventListener("play", () => {
  playerState.isPlaying = true;
});

audio.addEventListener("pause", () => {
  playerState.isPlaying = false;
});

audio.addEventListener("error", (e) => {
  console.warn("Audio playback error, falling back...", e);
  playerState.isLoading = false;
  playerState.isPlaying = false;
  playerState.hasError = true;
  playerState.errorMessage = "音频获取失败或受版权保护，尝试下一首";
});

function updateLyricIndex(time: number) {
  if (!playerState.lyrics.length) return;
  let idx = 0;
  for (let i = 0; i < playerState.lyrics.length; i++) {
    if (time >= playerState.lyrics[i].time) {
      idx = i;
    } else {
      break;
    }
  }
  playerState.currentLyricIndex = idx;
}

export const playerActions = {
  async playSong(song: Song, newPlaylist?: Song[]) {
    if (newPlaylist && newPlaylist.length > 0) {
      playerState.playlist = [...newPlaylist];
      const idx = playerState.playlist.findIndex((s) => s.id === song.id);
      playerState.currentIndex = idx !== -1 ? idx : 0;
    } else {
      const idx = playerState.playlist.findIndex((s) => s.id === song.id);
      if (idx === -1) {
        playerState.playlist.push(song);
        playerState.currentIndex = playerState.playlist.length - 1;
      } else {
        playerState.currentIndex = idx;
      }
    }

    playerState.currentSong = song;
    playerState.isLoading = true;
    playerState.hasError = false;
    playerState.currentTime = 0;
    playerState.duration = song.dt / 1000;

    // Record History
    const existsIdx = playerState.history.findIndex((s) => s.id === song.id);
    if (existsIdx !== -1) {
      playerState.history.splice(existsIdx, 1);
    }
    playerState.history.unshift(song);
    if (playerState.history.length > 50) playerState.history.pop();
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(playerState.history));

    // Fetch Lyrics in parallel
    api.getLyric(song.id).then((res) => {
      playerState.lyrics = res.lrc;
      playerState.currentLyricIndex = 0;
    });

    // 异步查询该歌曲从 API 支持的全部音质等级
    api.getSongQualities(song.id).then((qualities) => {
      playerState.availableQualities = qualities;
    });

    try {
      const res = await api.getSongUrl(song.id, playerState.quality);
      playerState.currentBitrate = res.br || 0;
      if (res.level) {
        playerState.actualQuality = res.level;
      }
      audio.src = res.url;
      audio.play().catch((err) => {
        console.warn("Autoplay blocked or error:", err);
      });
    } catch (err) {
      console.error("Failed to load audio:", err);
      playerState.isLoading = false;
    }
  },

  async setQuality(level: SongQuality) {
    playerState.quality = level;
    localStorage.setItem(STORAGE_KEY_QUALITY, level);

    if (!playerState.currentSong) return;

    const currentPos = audio.currentTime;
    const wasPlaying = playerState.isPlaying;

    playerState.isLoading = true;
    try {
      const res = await api.getSongUrl(playerState.currentSong.id, level);
      playerState.currentBitrate = res.br || 0;
      if (res.level) {
        playerState.actualQuality = res.level;
      }

      if (res.url) {
        let isHandled = false;
        const handleCanPlay = () => {
          if (isHandled) return;
          isHandled = true;
          if (Number.isFinite(currentPos) && currentPos > 0) {
            audio.currentTime = currentPos;
            playerState.currentTime = currentPos;
          }
          if (wasPlaying) {
            audio.play().catch(console.warn);
          }
          audio.removeEventListener("canplay", handleCanPlay);
        };

        audio.addEventListener("canplay", handleCanPlay);
        audio.src = res.url;
        audio.load();
      }
    } catch (err) {
      console.warn("Failed to switch quality:", err);
    } finally {
      playerState.isLoading = false;
    }
  },

  togglePlay() {
    if (!playerState.currentSong) {
      if (playerState.playlist.length > 0) {
        this.playSong(playerState.playlist[0]);
      }
      return;
    }

    if (playerState.isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => console.warn("Play error:", err));
    }
  },

  next() {
    if (!playerState.playlist.length) return;

    if (playerState.playMode === "shuffle") {
      let nextIdx = Math.floor(Math.random() * playerState.playlist.length);
      if (nextIdx === playerState.currentIndex && playerState.playlist.length > 1) {
        nextIdx = (nextIdx + 1) % playerState.playlist.length;
      }
      playerState.currentIndex = nextIdx;
    } else {
      playerState.currentIndex = (playerState.currentIndex + 1) % playerState.playlist.length;
    }

    const song = playerState.playlist[playerState.currentIndex];
    this.playSong(song);
  },

  prev() {
    if (!playerState.playlist.length) return;

    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    if (playerState.playMode === "shuffle") {
      playerState.currentIndex = Math.floor(Math.random() * playerState.playlist.length);
    } else {
      playerState.currentIndex =
        (playerState.currentIndex - 1 + playerState.playlist.length) % playerState.playlist.length;
    }

    const song = playerState.playlist[playerState.currentIndex];
    this.playSong(song);
  },

  seek(seconds: number) {
    if (Number.isFinite(seconds)) {
      audio.currentTime = seconds;
      playerState.currentTime = seconds;
      updateLyricIndex(seconds);
    }
  },

  setVolume(vol: number) {
    playerState.volume = Math.max(0, Math.min(1, vol));
    audio.volume = playerState.volume;
    playerState.isMuted = playerState.volume === 0;
  },

  toggleMute() {
    playerState.isMuted = !playerState.isMuted;
    audio.muted = playerState.isMuted;
  },

  async syncLikedFromCloud(userId: number) {
    if (!userId) return;
    playerState.isSyncingLiked = true;

    try {
      // 并行请求：获取所有红心歌曲ID，以及用户“我喜欢的音乐”完整歌曲列表
      const idsPromise = api.getUserLikelist(userId);
      const songsPromise = api.getUserLikedSongs(userId);

      const [ids, { songs }] = await Promise.all([idsPromise, songsPromise]);

      if (ids && ids.length > 0) {
        ids.forEach((id) => playerState.likedIds.add(id));
      }

      if (songs && songs.length > 0) {
        playerState.likedSongs = songs;
        songs.forEach((s) => playerState.likedIds.add(s.id));
      }

      localStorage.setItem(STORAGE_KEY_LIKED, JSON.stringify(Array.from(playerState.likedIds)));
      localStorage.setItem(STORAGE_KEY_LIKED_SONGS, JSON.stringify(playerState.likedSongs));
    } catch (err) {
      console.warn("Failed to sync liked songs from cloud:", err);
    } finally {
      playerState.isSyncingLiked = false;
    }
  },

  clearLiked() {
    playerState.likedIds.clear();
    playerState.likedSongs = [];
    localStorage.removeItem(STORAGE_KEY_LIKED);
    localStorage.removeItem(STORAGE_KEY_LIKED_SONGS);
  },

  toggleLike(songId: number, songObj?: Song) {
    const isCurrentlyLiked = playerState.likedIds.has(songId);
    const willLike = !isCurrentlyLiked;

    if (willLike) {
      playerState.likedIds.add(songId);
      if (songObj) {
        const exists = playerState.likedSongs.some((s) => s.id === songId);
        if (!exists) {
          playerState.likedSongs.unshift(songObj);
        }
      } else if (playerState.currentSong && playerState.currentSong.id === songId) {
        const exists = playerState.likedSongs.some((s) => s.id === songId);
        if (!exists) {
          playerState.likedSongs.unshift(playerState.currentSong);
        }
      }
    } else {
      playerState.likedIds.delete(songId);
      playerState.likedSongs = playerState.likedSongs.filter((s) => s.id !== songId);
    }

    localStorage.setItem(STORAGE_KEY_LIKED, JSON.stringify(Array.from(playerState.likedIds)));
    localStorage.setItem(STORAGE_KEY_LIKED_SONGS, JSON.stringify(playerState.likedSongs));

    // 如果用户已登录，向 API 提交云端红心状态
    if (userState.isLoggedIn) {
      api.likeSong(songId, willLike).catch(console.warn);
    }
  },

  isLiked(songId: number): boolean {
    return playerState.likedIds.has(songId);
  },

  togglePlayMode() {
    const modes: PlayMode[] = ["sequence", "loop", "shuffle"];
    const currentIdx = modes.indexOf(playerState.playMode);
    playerState.playMode = modes[(currentIdx + 1) % modes.length];
  },

  removeFromQueue(index: number) {
    playerState.playlist.splice(index, 1);
    if (index < playerState.currentIndex) {
      playerState.currentIndex--;
    } else if (index === playerState.currentIndex && playerState.playlist.length > 0) {
      this.playSong(playerState.playlist[playerState.currentIndex % playerState.playlist.length]);
    }
  },

  clearQueue() {
    playerState.playlist = [];
    audio.pause();
    playerState.currentSong = null;
    playerState.isPlaying = false;
  },
};
