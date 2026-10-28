import type { Banner, Playlist, Song, LyricLine, SongQuality, QualityOption } from "../types";
import { userState } from "../store/user";

const STORAGE_KEY_API_URL = "cloudmusic_api_base_url";
const DEFAULT_API_URL = "http://localhost:3000";

export class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = localStorage.getItem(STORAGE_KEY_API_URL) || DEFAULT_API_URL;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, "");
    localStorage.setItem(STORAGE_KEY_API_URL, this.baseUrl);
  }

  public async checkConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.baseUrl}/banner?type=0`, {
        signal: controller.signal,
      });
      clearTimeout(id);
      return res.ok;
    } catch {
      return false;
    }
  }

  private async request<T>(endpoint: string, fallbackData?: T): Promise<T> {
    try {
      const sep = endpoint.includes("?") ? "&" : "?";
      let fullEndpoint = endpoint;
      if (userState.cookie && !endpoint.includes("cookie=")) {
        fullEndpoint += `${sep}cookie=${encodeURIComponent(userState.cookie)}`;
      }
      const url = `${this.baseUrl}${fullEndpoint.startsWith("/") ? "" : "/"}${fullEndpoint}`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (fallbackData !== undefined) {
        console.warn(`[API] "${endpoint}" failed, using demo fallback data.`, err);
        return fallbackData;
      }
      throw err;
    }
  }

  // 1. 获取轮播图
  public async getBanners(): Promise<Banner[]> {
    const fallback: Banner[] = [
      {
        imageUrl: "https://p1.music.126.net/4W6sHhT-sI4G2hN4aYt6kg==/109951169389274932.jpg",
        typeTitle: "独家首发",
        targetId: 186016,
      },
      {
        imageUrl: "https://p1.music.126.net/cWw5F8pG1jQ4_oJv8aZ8kg==/109951168571439243.jpg",
        typeTitle: "新歌首发",
        targetId: 1901371647,
      },
      {
        imageUrl: "https://p1.music.126.net/zZ8eF8_d3I5J1K4M4_oK9g==/109951167732918234.jpg",
        typeTitle: "热播推荐",
        targetId: 1363948882,
      },
    ];

    try {
      const res = await this.request<{ banners: Banner[] }>("/banner?type=0", { banners: fallback });
      return res.banners && res.banners.length > 0 ? res.banners : fallback;
    } catch {
      return fallback;
    }
  }

  // 2. 推荐歌单
  public async getPersonalizedPlaylists(limit = 10): Promise<Playlist[]> {
    const fallback: Playlist[] = [
      {
        id: 3778678,
        name: "云音乐热歌榜",
        coverImgUrl: "https://p1.music.126.net/GhhuF6Ep5Tq9IEvLldK3TQ==/109951167009419409.jpg",
        playCount: 987654321,
        trackCount: 100,
        description: "云音乐热歌榜，汇聚全网最热最新潮音乐流行风向标！",
        creator: { nickname: "网易云音乐", avatarUrl: "https://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", userId: 1 },
      },
      {
        id: 3779629,
        name: "云音乐新歌榜",
        coverImgUrl: "https://p1.music.126.net/N2HO1XM2idaJR6Z7bhNjhQ==/109951166952388464.jpg",
        playCount: 567891234,
        trackCount: 100,
        description: "新鲜出炉的新歌速递，捕捉第一抹音律。",
        creator: { nickname: "网易云音乐", avatarUrl: "https://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", userId: 1 },
      },
      {
        id: 2884035,
        name: "网易原创歌曲榜",
        coverImgUrl: "https://p1.music.126.net/sBzD11nforcuh1jdLSgX7g==/18740076185638788.jpg",
        playCount: 345678912,
        trackCount: 100,
        description: "展示最具潜力的原创独立音乐人与天马行空的创作作品。",
        creator: { nickname: "网易原创", avatarUrl: "https://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", userId: 1 },
      },
      {
        id: 19723756,
        name: "云音乐飙升榜",
        coverImgUrl: "https://p1.music.126.net/vqe1vOqZ7jP8e3jEa6Xl_g==/109951166952713766.jpg",
        playCount: 887654321,
        trackCount: 100,
        description: "每天100首热度飙升最快的单曲！",
        creator: { nickname: "网易云音乐", avatarUrl: "https://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", userId: 1 },
      },
      {
        id: 2809513713,
        name: "华语流行 | 岁月静好，戴上耳机沉浸自己的世界",
        coverImgUrl: "https://p1.music.126.net/5_mYFp2_G3m7n6A5B2vXQw==/109951165431872198.jpg",
        playCount: 12450000,
        trackCount: 65,
        description: "静静地听，慢慢地品，那是流淌在岁月里最温柔的风景。",
        creator: { nickname: "音乐拾光者", avatarUrl: "https://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", userId: 2 },
      },
      {
        id: 2809513714,
        name: "轻音乐纯音乐 | 适合工作、学习与深夜放空的私享曲目",
        coverImgUrl: "https://p1.music.126.net/rV3F8j6v6vO2n7Q1b8XmQw==/109951165431875189.jpg",
        playCount: 28900000,
        trackCount: 80,
        description: "沉浸在静谧的音符之中，专注每一个当下。",
        creator: { nickname: "治愈实验室", avatarUrl: "https://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", userId: 3 },
      },
    ];

    try {
      const res = await this.request<{ result?: Playlist[]; playlists?: Playlist[] }>(
        `/personalized?limit=${limit}`,
        { result: fallback }
      );
      const list = res.result || res.playlists || fallback;
      return list.map((item) => ({
        id: item.id,
        name: item.name,
        coverImgUrl: item.coverImgUrl || (item as any).picUrl || fallback[0].coverImgUrl,
        playCount: item.playCount || 0,
        trackCount: item.trackCount || 50,
        description: item.description,
        creator: item.creator,
      }));
    } catch {
      return fallback;
    }
  }

  // 3. 所有官方排行榜
  public async getToplist(): Promise<Playlist[]> {
    try {
      const res = await this.request<{ list: Playlist[] }>("/toplist");
      if (res && res.list) {
        return res.list.map((item) => ({
          id: item.id,
          name: item.name,
          coverImgUrl: item.coverImgUrl,
          playCount: item.playCount,
          trackCount: item.trackCount,
          description: item.description,
        }));
      }
      return await this.getPersonalizedPlaylists(4);
    } catch {
      return await this.getPersonalizedPlaylists(4);
    }
  }

  // 4. 获取歌单详情与歌曲
  public async getPlaylistDetail(id: number): Promise<{ playlist: Playlist; tracks: Song[] }> {
    try {
      // 优先获取歌单所有单曲
      const detailRes = await this.request<{ playlist: any }>(`/playlist/detail?id=${id}`);
      const playlist = detailRes.playlist;

      let tracks: Song[] = [];
      try {
        const trackRes = await this.request<{ songs: any[] }>(`/playlist/track/all?id=${id}&limit=50`);
        if (trackRes.songs && trackRes.songs.length > 0) {
          tracks = trackRes.songs.map(formatSong);
        }
      } catch {
        if (playlist.tracks) {
          tracks = playlist.tracks.map(formatSong);
        }
      }

      return {
        playlist: {
          id: playlist.id,
          name: playlist.name,
          coverImgUrl: playlist.coverImgUrl || playlist.picUrl,
          description: playlist.description,
          playCount: playlist.playCount,
          trackCount: playlist.trackCount || tracks.length,
          creator: playlist.creator,
          tags: playlist.tags,
        },
        tracks,
      };
    } catch (err) {
      console.warn("Failed to get remote playlist, falling back to demo tracks", err);
      return {
        playlist: {
          id,
          name: "推荐热门音乐精选",
          coverImgUrl: "https://p1.music.126.net/GhhuF6Ep5Tq9IEvLldK3TQ==/109951167009419409.jpg",
          description: "精选华语与流行品质歌曲，体验极致声学魅力。",
          playCount: 1000000,
          trackCount: DEMO_SONGS.length,
        },
        tracks: DEMO_SONGS,
      };
    }
  }

  // 5. 获取歌曲真实播放链接（支持音质切换与 API 比特率解析）
  public async getSongUrl(
    id: number,
    level: SongQuality = "lossless"
  ): Promise<{ url: string; br?: number; level?: SongQuality; size?: number }> {
    try {
      const res = await this.request<{
        data: { url: string; br?: number; level?: string; size?: number }[];
      }>(`/song/url/v1?id=${id}&level=${level}`);
      if (res.data && res.data[0] && res.data[0].url) {
        return {
          url: res.data[0].url,
          br: res.data[0].br,
          level: (res.data[0].level as SongQuality) || level,
          size: res.data[0].size,
        };
      }
    } catch {
      // ignore
    }

    try {
      const brMap: Record<SongQuality, number> = {
        jymaster: 1920000,
        hires: 1800000,
        lossless: 999000,
        exhigh: 320000,
        higher: 192000,
        standard: 128000,
      };
      const res2 = await this.request<{ data: { url: string; br?: number }[] }>(
        `/song/url?id=${id}&br=${brMap[level] || 320000}`
      );
      if (res2.data && res2.data[0] && res2.data[0].url) {
        return {
          url: res2.data[0].url,
          br: res2.data[0].br,
          level: level,
        };
      }
    } catch {
      // ignore
    }

    // 网易云外链直链兜底
    return {
      url: `https://music.163.com/song/media/outer/url?id=${id}.mp3`,
      br: 128000,
      level: "standard",
    };
  }

  // 5.1 获取歌曲支持的全部音质列表（从 /song/detail API 获取）
  public async getSongQualities(songId: number): Promise<QualityOption[]> {
    const defaultQualities: QualityOption[] = [
      { level: "jymaster", label: "超清母带", badge: "MASTER", sub: "Master 24bit/192kHz", available: false },
      { level: "hires", label: "Hi-Res 音质", badge: "HI-RES", sub: "FLAC 24bit/96kHz", available: true },
      { level: "lossless", label: "无损音质", badge: "LOSSLESS", sub: "FLAC 16bit/44.1kHz", available: true },
      { level: "exhigh", label: "极高音质", badge: "320K", sub: "MP3 320kbps", available: true },
      { level: "higher", label: "较高音质", badge: "192K", sub: "MP3 192kbps", available: true },
      { level: "standard", label: "标准音质", badge: "128K", sub: "MP3 128kbps", available: true },
    ];

    try {
      const res = await this.request<{ songs?: any[]; privileges?: any[] }>(`/song/detail?ids=${songId}`);
      if (res && res.songs && res.songs.length > 0) {
        const song = res.songs[0];
        const priv = res.privileges && res.privileges[0] ? res.privileges[0] : null;
        const maxbr = priv?.maxbr || 0;

        return [
          {
            level: "jymaster",
            label: "超清母带",
            badge: "MASTER",
            sub: "Master 24bit/192kHz",
            available: !!(song.jm || maxbr > 1800000),
          },
          {
            level: "hires",
            label: "Hi-Res 音质",
            badge: "HI-RES",
            sub: "FLAC 24bit/96kHz",
            available: !!(song.hr || maxbr >= 1800000),
          },
          {
            level: "lossless",
            label: "无损音质",
            badge: "LOSSLESS",
            sub: "FLAC 16bit/44.1kHz",
            available: !!(song.sq || maxbr >= 999000),
          },
          {
            level: "exhigh",
            label: "极高音质",
            badge: "320K",
            sub: "MP3 320kbps",
            available: !!(song.h || maxbr >= 320000),
          },
          {
            level: "higher",
            label: "较高音质",
            badge: "192K",
            sub: "MP3 192kbps",
            available: !!(song.m || maxbr >= 192000),
          },
          {
            level: "standard",
            label: "标准音质",
            badge: "128K",
            sub: "MP3 128kbps",
            available: true,
          },
        ];
      }
    } catch (err) {
      console.warn("Failed to query song qualities from API:", err);
    }

    return defaultQualities;
  }

  // 6. 获取歌词
  public async getLyric(id: number): Promise<{ lrc: LyricLine[]; rawLrc?: string }> {
    try {
      const res = await this.request<{
        lrc?: { lyric: string };
        tlyric?: { lyric: string };
      }>(`/lyric?id=${id}`);

      const rawLrc = res.lrc?.lyric || "";
      const rawTLrc = res.tlyric?.lyric || "";
      return {
        lrc: parseLyrics(rawLrc, rawTLrc),
        rawLrc,
      };
    } catch {
      return {
        lrc: [
          { time: 0, text: "正在欣赏动人旋律..." },
          { time: 5, text: "纯音乐，请静心聆听" },
          { time: 15, text: "♪ ♫ ♩ ♬" },
        ],
      };
    }
  }

  // 7. 搜索（优先使用 /cloudsearch 获取完整信息，缺少封面时自动批量请求 /song/detail 补全）
  public async search(keywords: string, type = 1, limit = 30): Promise<{ songs?: Song[]; playlists?: Playlist[] }> {
    try {
      let rawSongs: any[] = [];
      let rawPlaylists: any[] = [];

      // 优先使用 /cloudsearch，它是网易云更现代的全量搜索接口，返回包含 al.picUrl 封面的完整数据
      try {
        const cloudRes = await this.request<{
          result?: {
            songs?: any[];
            playlists?: any[];
          };
        }>(`/cloudsearch?keywords=${encodeURIComponent(keywords)}&type=${type}&limit=${limit}`);
        if (cloudRes.result) {
          rawSongs = cloudRes.result.songs || [];
          rawPlaylists = cloudRes.result.playlists || [];
        }
      } catch {
        // ignore and fallback
      }

      // 若 /cloudsearch 未返回结果，兜底使用 /search
      if (type === 1 && rawSongs.length === 0) {
        try {
          const searchRes = await this.request<{
            result?: {
              songs?: any[];
            };
          }>(`/search?keywords=${encodeURIComponent(keywords)}&type=1&limit=${limit}`);
          rawSongs = searchRes.result?.songs || [];
        } catch {
          // ignore
        }
      } else if (type === 1000 && rawPlaylists.length === 0) {
        try {
          const plRes = await this.request<{
            result?: {
              playlists?: any[];
            };
          }>(`/search?keywords=${encodeURIComponent(keywords)}&type=1000&limit=${limit}`);
          rawPlaylists = plRes.result?.playlists || [];
        } catch {
          // ignore
        }
      }

      if (type === 1) {
        // 关键修复：/search 接口通常只返回 album.id / album.name，不包含 picUrl 封面链接
        // 批量调用 /song/detail 获取各单曲高质量专辑封面
        const needsCover = rawSongs.some((s) => !s.al?.picUrl && !s.album?.picUrl);
        if (needsCover && rawSongs.length > 0) {
          try {
            const ids = rawSongs.map((s) => s.id).join(",");
            const detailRes = await this.request<{ songs?: any[] }>(`/song/detail?ids=${ids}`);
            if (detailRes && detailRes.songs && detailRes.songs.length > 0) {
              const detailMap = new Map<number, any>();
              for (const ds of detailRes.songs) {
                detailMap.set(ds.id, ds);
              }
              rawSongs = rawSongs.map((s) => {
                const detail = detailMap.get(s.id);
                if (detail) {
                  return {
                    ...s,
                    al: detail.al || detail.album || s.album,
                    ar: detail.ar || detail.artists || s.artists,
                  };
                }
                return s;
              });
            }
          } catch (err) {
            console.warn("Failed to batch fetch song details for covers:", err);
          }
        }

        const songs = rawSongs.map(formatSong);
        return { songs };
      } else {
        const playlists = rawPlaylists.map((p: any) => ({
          id: p.id,
          name: p.name,
          coverImgUrl: p.coverImgUrl || p.picUrl || DEFAULT_COVER_URL,
          playCount: p.playCount || 0,
          trackCount: p.trackCount || 0,
          description: p.description,
          creator: p.creator,
        }));
        return { playlists };
      }
    } catch {
      const filtered = DEMO_SONGS.filter(
        (s) => s.name.includes(keywords) || s.ar.some((a) => a.name.includes(keywords))
      );
      return { songs: filtered.length > 0 ? filtered : DEMO_SONGS };
    }
  }

  // 8. 热搜榜
  public async getHotSearch(): Promise<{ searchWord: string; content?: string; score: number }[]> {
    try {
      const res = await this.request<{ data: any[] }>("/search/hot/detail");
      if (res.data) {
        return res.data.map((item) => ({
          searchWord: item.searchWord,
          content: item.content,
          score: item.score,
        }));
      }
    } catch {
      // ignore
    }
    return [
      { searchWord: "周杰伦", content: "经典金曲永不过时", score: 99999 },
      { searchWord: "起风了", content: "从前初识这世间，万般流连", score: 87654 },
      { searchWord: "陈奕迅", content: "孤勇者 / 富士山下", score: 76543 },
      { searchWord: "林俊杰", content: "江南 / 修炼爱情", score: 65432 },
      { searchWord: "华语流行榜", content: "实时热门流行榜单", score: 54321 },
      { searchWord: "纯音乐", content: "治愈放空工作伴随", score: 43210 },
    ];
  }

  // 9. 二维码登录系列 (api-enhanced)
  public async getQrKey(): Promise<string> {
    try {
      const res = await this.request<{ data?: { unikey: string } }>(`/login/qr/key?timestamp=${Date.now()}`);
      return res.data?.unikey || "";
    } catch {
      return "demo-qr-key-" + Date.now();
    }
  }

  public async getQrImg(key: string): Promise<string> {
    try {
      const res = await this.request<{ data?: { qrimg: string } }>(
        `/login/qr/create?key=${key}&qrimg=true&timestamp=${Date.now()}`
      );
      return res.data?.qrimg || "";
    } catch {
      return "";
    }
  }

  public async checkQrStatus(key: string): Promise<{ code: number; message: string; cookie?: string }> {
    try {
      const res = await this.request<{ code: number; message: string; cookie?: string }>(
        `/login/qr/check?key=${key}&timestamp=${Date.now()}`
      );
      return res;
    } catch {
      return { code: 801, message: "等待扫码中" };
    }
  }

  // 10. 用户信息获取
  public async getUserAccount(cookie?: string): Promise<any> {
    const q = cookie ? `?cookie=${encodeURIComponent(cookie)}` : "";
    return await this.request<any>(`/user/account${q}`);
  }

  public async getUserPlaylists(uid: number): Promise<Playlist[]> {
    try {
      const res = await this.request<{ playlist: any[] }>(`/user/playlist?uid=${uid}&timestamp=${Date.now()}`);
      return (res.playlist || []).map((p) => ({
        id: p.id,
        name: p.name,
        coverImgUrl: p.coverImgUrl,
        playCount: p.playCount || 0,
        trackCount: p.trackCount || 0,
        description: p.description,
      }));
    } catch {
      return [];
    }
  }

  // 11. 获取用户喜欢的音乐 ID 列表 (likelist)
  public async getUserLikelist(uid: number): Promise<number[]> {
    try {
      const res = await this.request<{ ids?: number[]; code: number }>(`/likelist?uid=${uid}&timestamp=${Date.now()}`);
      if (res && res.ids && Array.isArray(res.ids)) {
        return res.ids;
      }
    } catch (err) {
      console.warn("Failed to get likelist from API:", err);
    }
    return [];
  }

  // 12. 获取用户“我喜欢的音乐”歌单及完整歌曲列表
  public async getUserLikedSongs(uid: number): Promise<{ songs: Song[]; playlistId?: number }> {
    try {
      const res = await this.request<{ playlist?: any[] }>(`/user/playlist?uid=${uid}&timestamp=${Date.now()}`);
      const playlists = res.playlist || [];
      if (playlists.length > 0) {
        // 用户第一个歌单通常为“喜欢的音乐” (specialType === 5 或 名称包含喜欢的音乐)
        const likedPlaylist = playlists.find((p: any) => p.specialType === 5 || (p.name && p.name.includes("喜欢的音乐"))) || playlists[0];
        const playlistId = likedPlaylist.id;

        try {
          const trackRes = await this.request<{ songs?: any[] }>(
            `/playlist/track/all?id=${playlistId}&limit=500&timestamp=${Date.now()}`
          );
          if (trackRes && trackRes.songs && trackRes.songs.length > 0) {
            return {
              songs: trackRes.songs.map(formatSong),
              playlistId,
            };
          }
        } catch {
          const detailRes = await this.request<{ playlist?: any }>(`/playlist/detail?id=${playlistId}&timestamp=${Date.now()}`);
          if (detailRes.playlist?.tracks) {
            return {
              songs: detailRes.playlist.tracks.map(formatSong),
              playlistId,
            };
          }
        }
        return { songs: [], playlistId };
      }
    } catch (err) {
      console.warn("Failed to get user liked songs:", err);
    }
    return { songs: [] };
  }

  // 13. 喜欢 / 取消喜欢歌曲（红心同步到网易云云端）
  public async likeSong(id: number, like = true): Promise<boolean> {
    try {
      const res = await this.request<{ code: number }>(`/like?id=${id}&like=${like}&timestamp=${Date.now()}`);
      return res && res.code === 200;
    } catch (err) {
      console.warn("Failed to update like status on API:", err);
      return false;
    }
  }

  public async logout(): Promise<void> {
    try {
      await this.request("/logout");
    } catch {
      // ignore
    }
  }
}

export const DEFAULT_COVER_URL = "https://p2.music.126.net/a4KYp477snGHe3ZyjVpe1w==/109951165351505570.jpg";
export const DEFAULT_AVATAR_URL = "https://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg";

function formatSong(raw: any): Song {
  let picUrl =
    raw.al?.picUrl ||
    raw.album?.picUrl ||
    raw.picUrl ||
    "";

  if (picUrl && picUrl.startsWith("http://")) {
    picUrl = picUrl.replace("http://", "https://");
  }

  if (!picUrl) {
    picUrl = DEFAULT_COVER_URL;
  }

  return {
    id: raw.id,
    name: raw.name || "未知歌曲",
    ar: (raw.ar || raw.artists || []).map((a: any) => ({ id: a.id, name: a.name || "未知艺人" })),
    al: {
      id: raw.al?.id || raw.album?.id || 0,
      name: raw.al?.name || raw.album?.name || "未知专辑",
      picUrl,
    },
    dt: raw.dt || raw.duration || 210000,
  };
}

export function parseLyrics(lrcStr: string, tLrcStr = ""): LyricLine[] {
  if (!lrcStr) return [];

  const timeExp = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  const lines = lrcStr.split("\n");
  const result: LyricLine[] = [];

  const transMap = new Map<number, string>();
  if (tLrcStr) {
    const tLines = tLrcStr.split("\n");
    for (const tLine of tLines) {
      timeExp.lastIndex = 0;
      const match = timeExp.exec(tLine);
      if (match) {
        const min = parseInt(match[1]);
        const sec = parseInt(match[2]);
        const ms = match[3] ? parseInt(match[3].padEnd(3, "0").slice(0, 3)) : 0;
        const totalSec = Math.round((min * 60 + sec + ms / 1000) * 10) / 10;
        const text = tLine.replace(timeExp, "").trim();
        if (text) {
          transMap.set(totalSec, text);
        }
      }
    }
  }

  for (const line of lines) {
    timeExp.lastIndex = 0;
    const match = timeExp.exec(line);
    if (match) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      const ms = match[3] ? parseInt(match[3].padEnd(3, "0").slice(0, 3)) : 0;
      const totalSec = Math.round((min * 60 + sec + ms / 1000) * 10) / 10;
      const text = line.replace(timeExp, "").trim();
      if (text) {
        result.push({
          time: totalSec,
          text,
          translation: transMap.get(totalSec),
        });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

export const DEMO_SONGS: Song[] = [
  {
    id: 1330348068,
    name: "起风了",
    ar: [{ id: 12085562, name: "买辣椒也用券" }],
    al: {
      id: 74715426,
      name: "起风了",
      picUrl: "https://p1.music.126.net/diGAyEmpymHgQIsnRHnm Hewitt==/109951163699673355.jpg",
    },
    dt: 325851,
  },
  {
    id: 186016,
    name: "晴天",
    ar: [{ id: 6452, name: "周杰伦" }],
    al: {
      id: 18896,
      name: "叶惠美",
      picUrl: "https://p1.music.126.net/wCTPt49wh19Bq0zI97vWqw==/109951167874744158.jpg",
    },
    dt: 269000,
  },
  {
    id: 1901371647,
    name: "孤勇者",
    ar: [{ id: 2116, name: "陈奕迅" }],
    al: {
      id: 137142551,
      name: "孤勇者",
      picUrl: "https://p1.music.126.net/aG5dp9aTpan19V5Cf2Sy2A==/109951166595697817.jpg",
    },
    dt: 256000,
  },
  {
    id: 347230,
    name: "海阔天空",
    ar: [{ id: 11127, name: "Beyond" }],
    al: {
      id: 34209,
      name: "海阔天空",
      picUrl: "https://p1.music.126.net/r9p4A6qFf1X4o021n4d-tA==/109951163111197825.jpg",
    },
    dt: 324000,
  },
];

export const api = new ApiService();
