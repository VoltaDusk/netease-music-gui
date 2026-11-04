import CryptoJS from "crypto-js";
import QRCode from "qrcode";
import { invoke } from "@tauri-apps/api/core";
import type { Banner, Playlist, Song, LyricLine, SongQuality, QualityOption } from "../types";
import { userState } from "../store/user";

const STORAGE_KEY_API_MODE = "cloudmusic_api_mode"; // "builtin" | "custom"
const STORAGE_KEY_API_URL = "cloudmusic_api_base_url";
const STORAGE_KEY_DEVICE_ID = "cloudmusic_device_id";

const DEFAULT_API_URL = "http://localhost:3000";
const EAPI_BASE = "https://interfacepc.music.163.com";
const EAPI_KEY = CryptoJS.enc.Utf8.parse("e82ckenh8dichen8");

export const DEFAULT_COVER_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='12' fill='%23191c16'/%3E%3Ccircle cx='60' cy='60' r='48' fill='%2322271d' stroke='%23383e30' stroke-width='1.5'/%3E%3Ccircle cx='60' cy='60' r='38' fill='none' stroke='%232b3124' stroke-width='1'/%3E%3Ccircle cx='60' cy='60' r='28' fill='none' stroke='%23383e30' stroke-width='1'/%3E%3Ccircle cx='60' cy='60' r='18' fill='%23d6f379' fill-opacity='0.25' stroke='%23d6f379' stroke-width='1.5'/%3E%3Ccircle cx='60' cy='60' r='6' fill='%23191c16'/%3E%3C/svg%3E";
export const DEFAULT_AVATAR_URL = "https://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg";

function getOrInitDeviceId(): string {
  let devId = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
  if (!devId) {
    devId = CryptoJS.lib.WordArray.random(16).toString();
    localStorage.setItem(STORAGE_KEY_DEVICE_ID, devId);
  }
  return devId;
}

/**
 * 网易云官方 EAPI 逆向签名加密
 */
export function eapiEncrypt(url: string, data: any): string {
  const text = typeof data === "object" ? JSON.stringify(data) : String(data);
  const message = `nobody${url}use${text}md5forencrypt`;
  const digest = CryptoJS.MD5(message).toString();
  const raw = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;

  const encrypted = CryptoJS.AES.encrypt(raw, EAPI_KEY, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });

  return encrypted.ciphertext.toString().toUpperCase();
}

export class ApiService {
  private apiMode: "builtin" | "custom";
  private baseUrl: string;

  constructor() {
    this.apiMode = (localStorage.getItem(STORAGE_KEY_API_MODE) as "builtin" | "custom") || "builtin";
    this.baseUrl = localStorage.getItem(STORAGE_KEY_API_URL) || DEFAULT_API_URL;
  }

  public getApiMode(): "builtin" | "custom" {
    return this.apiMode;
  }

  public setApiMode(mode: "builtin" | "custom") {
    this.apiMode = mode;
    localStorage.setItem(STORAGE_KEY_API_MODE, mode);
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, "");
    localStorage.setItem(STORAGE_KEY_API_URL, this.baseUrl);
  }

  /**
   * 核心请求调度器：
   * 优先使用内置原生 EAPI 引擎（Rust reqwest 直连网易云官方服务器，零 CORS 限制，开箱即用）
   * 若用户指定自定义第三方 API 地址，则回退调用外部服务
   */
  private async request<T>(uri: string, data: any = {}, customCookie?: string): Promise<T> {
    if (this.apiMode === "custom") {
      try {
        return await this.customRequest<T>(uri, data, customCookie);
      } catch (err) {
        console.warn(`[API] 自定义服务 ${uri} 失败，自动尝试内置原生引擎降级:`, err);
      }
    }

    return await this.nativeEapiRequest<T>(uri, data, customCookie);
  }

  /**
   * 内置原生 EAPI 请求实现
   */
  private async nativeEapiRequest<T>(uri: string, data: any = {}, customCookie?: string): Promise<T> {
    const now = Date.now();
    const deviceId = getOrInitDeviceId();

    const header = {
      osver: "Microsoft-Windows-10",
      deviceId,
      os: "pc",
      appver: "3.0.1",
      versioncode: "140",
      buildver: "1690000000",
      resolution: "1920x1080",
      channel: "netease",
      requestId: `${now}_0001`,
    };

    const activeCookie = customCookie || userState.cookie || "";
    let cookieHeader = `os=pc; appver=3.0.1; osver=Microsoft-Windows-10; deviceId=${deviceId}; channel=netease; __remember_me=true`;
    if (activeCookie) {
      cookieHeader += `; ${activeCookie}`;
    }

    const payload = {
      ...data,
      header,
    };

    const eapiParams = eapiEncrypt(uri, payload);
    const bodyStr = `params=${encodeURIComponent(eapiParams)}`;
    const sub = uri.startsWith("/api/") ? uri.slice(5) : uri;
    const fullUrl = `${EAPI_BASE}/eapi/${sub}`;

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
      Referer: "https://music.163.com/",
    };

    // 1. 尝试通过 Tauri Rust 后端直接发起原生网络请求（无浏览器跨域阻拦）
    try {
      const resp = await invoke<{ status: number; body: string; cookies: string[] }>("ncm_http_request", {
        url: fullUrl,
        method: "POST",
        headers,
        body: bodyStr,
      });

      if (resp && resp.body) {
        const parsed = JSON.parse(resp.body);
        if (resp.cookies && resp.cookies.length > 0) {
          (parsed as any)._setCookies = resp.cookies;
        }
        return parsed as T;
      }
    } catch (tauriError) {
      // 若处于普通网页预览或调试模式下，回退到 fetch
      console.warn("[API] Tauri 原生请求失败，尝试前端直接 fetch:", tauriError);
    }

    // 2. 网页调试模式 fetch 直连
    const res = await fetch(fullUrl, {
      method: "POST",
      headers,
      body: bodyStr,
    });
    return (await res.json()) as T;
  }

  /**
   * 自定义外部 API 请求（如本地另开的 api-enhanced 服务）
   */
  private async customRequest<T>(endpoint: string, _queryParams: any = {}, customCookie?: string): Promise<T> {
    const sep = endpoint.includes("?") ? "&" : "?";
    let fullEndpoint = endpoint;
    const cookie = customCookie || userState.cookie;
    if (cookie && !endpoint.includes("cookie=")) {
      fullEndpoint += `${sep}cookie=${encodeURIComponent(cookie)}`;
    }
    const url = `${this.baseUrl}${fullEndpoint.startsWith("/") ? "" : "/"}${fullEndpoint}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  }

  /**
   * 诊断连接可用性
   */
  public async checkConnection(): Promise<boolean> {
    try {
      if (this.apiMode === "custom") {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${this.baseUrl}/banner?type=0`, {
          signal: controller.signal,
        });
        clearTimeout(id);
        return res.ok;
      }

      // 内置原生直连测试
      const res = await this.nativeEapiRequest<{ code?: number }>("/api/v2/banner/get", { clientType: "pc" });
      return res && (res.code === 200 || !!(res as any).banners);
    } catch {
      return false;
    }
  }

  // 1. 获取首页 Banner
  public async getBanners(): Promise<Banner[]> {
    try {
      const res = await this.request<{ code: number; banners?: any[] }>("/api/v2/banner/get", { clientType: "pc" });
      if (res && res.banners && res.banners.length > 0) {
        return res.banners.map((item: any) => ({
          imageUrl: item.pic || item.imageUrl,
          typeTitle: item.typeTitle || "推荐",
          url: item.url,
          targetId: item.targetId,
        }));
      }
    } catch (err) {
      console.warn("getBanners failed:", err);
    }

    return [
      {
        imageUrl: "https://p1.music.126.net/GhhuF6Ep5Tq9IEvLldK3TQ==/109951167009419409.jpg",
        typeTitle: "慢节律灵感",
        targetId: 0,
      },
      {
        imageUrl: "https://p1.music.126.net/x_Wk9t-nC6Gf_2X_x6v9fA==/109951168128362624.jpg",
        typeTitle: "和纸晨光",
        targetId: 0,
      },
    ];
  }

  // 2. 精选推荐歌单
  public async getPersonalizedPlaylists(limit = 8): Promise<Playlist[]> {
    try {
      const res = await this.request<{ code: number; result?: any[] }>("/api/personalized/playlist", { limit });
      if (res && res.result && res.result.length > 0) {
        return res.result.map((item: any) => ({
          id: item.id,
          name: item.name,
          coverImgUrl: item.picUrl || item.coverImgUrl || DEFAULT_COVER_URL,
          playCount: item.playCount || 0,
          trackCount: item.trackCount || 0,
          description: item.copywriter || item.description,
        }));
      }
    } catch (err) {
      console.warn("getPersonalizedPlaylists failed:", err);
    }

    return [
      {
        id: 24381616,
        name: "「轻音乐」静谧流光·阅读与专注伴侣",
        coverImgUrl: "https://p1.music.126.net/diGAyEmpymX8G7JcnElncQ==/109951163699673355.jpg?param=200y200",
        playCount: 1250000,
        trackCount: 45,
        description: "慢节律的声音，陪你在繁杂日常中找回呼吸的节奏。",
      },
      {
        id: 19723756,
        name: "华语经典回顾：那一曲刻在青春里的回音",
        coverImgUrl: "https://p1.music.126.net/ZGffiDQZrGj5s_hnR1CNbg==/109951165566379710.jpg?param=200y200",
        playCount: 3680000,
        trackCount: 60,
        description: "周杰伦、陈奕迅、Beyond与经典老歌合辑。",
      },
    ];
  }

  // 2.1 推荐新音乐 / 推荐单曲
  public async getPersonalizedNewsongs(limit = 10): Promise<Song[]> {
    try {
      const res = await this.request<{ code: number; result?: any[] }>("/api/personalized/newsong", { limit });
      if (res && res.result && res.result.length > 0) {
        return res.result.map((item: any) => formatSong(item.song || item));
      }
    } catch {
      // ignore
    }
    return DEMO_SONGS;
  }

  // 3. 所有官方排行榜
  public async getToplist(): Promise<Playlist[]> {
    try {
      const res = await this.request<{ code: number; list?: any[] }>("/api/toplist");
      if (res && res.list && res.list.length > 0) {
        return res.list.map((item: any) => ({
          id: item.id,
          name: item.name,
          coverImgUrl: item.coverImgUrl || DEFAULT_COVER_URL,
          playCount: item.playCount || 0,
          trackCount: item.trackCount || 0,
          description: item.description,
        }));
      }
    } catch (err) {
      console.warn("getToplist failed:", err);
    }

    return [
      { id: 19723756, name: "飙升榜", coverImgUrl: DEFAULT_COVER_URL, playCount: 888888, trackCount: 100 },
      { id: 3779629, name: "新歌榜", coverImgUrl: DEFAULT_COVER_URL, playCount: 999999, trackCount: 100 },
      { id: 3778678, name: "热歌榜", coverImgUrl: DEFAULT_COVER_URL, playCount: 1200000, trackCount: 100 },
      { id: 2884035, name: "原创榜", coverImgUrl: DEFAULT_COVER_URL, playCount: 666666, trackCount: 100 },
    ];
  }

  // 4. 歌单详情及歌曲列表
  public async getPlaylistDetail(id: number): Promise<{ playlist: Playlist; tracks: Song[] }> {
    try {
      const res = await this.request<{
        code: number;
        playlist?: any;
      }>("/api/v6/playlist/detail", { id, n: 1000, s: 8 });

      if (res && res.playlist) {
        const p = res.playlist;
        const tracks: Song[] = (p.tracks || []).map(formatSong);

        const playlist: Playlist = {
          id: p.id,
          name: p.name,
          coverImgUrl: p.coverImgUrl || DEFAULT_COVER_URL,
          description: p.description,
          playCount: p.playCount || 0,
          trackCount: p.trackCount || tracks.length,
          creator: p.creator
            ? {
                userId: p.creator.userId || 0,
                nickname: p.creator.nickname || "云音乐达人",
                avatarUrl: p.creator.avatarUrl || DEFAULT_AVATAR_URL,
              }
            : undefined,
        };

        return { playlist, tracks };
      }
    } catch (err) {
      console.warn("getPlaylistDetail failed:", err);
    }

    return {
      playlist: {
        id,
        name: "精选音乐专辑",
        coverImgUrl: DEFAULT_COVER_URL,
        description: "精选好歌慢节奏播放",
        playCount: 1000000,
        trackCount: DEMO_SONGS.length,
      },
      tracks: DEMO_SONGS,
    };
  }

  // 5. 获取歌曲真实播放链接（支持音质切换与 API 比特率解析）
  public async getSongUrl(
    id: number,
    level: SongQuality = "lossless"
  ): Promise<{ url: string; br?: number; level?: SongQuality; size?: number }> {
    try {
      const res = await this.request<{
        code: number;
        data?: { id: number; url: string; br?: number; level?: string; size?: number }[];
      }>("/api/song/enhance/player/url/v1", {
        ids: [id],
        level,
        encodeType: "flac",
      });

      if (res && res.data && res.data[0] && res.data[0].url) {
        return {
          url: res.data[0].url,
          br: res.data[0].br,
          level: (res.data[0].level as SongQuality) || level,
          size: res.data[0].size,
        };
      }
    } catch (err) {
      console.warn("getSongUrl via EAPI failed:", err);
    }

    // 网易云外链直链兜底
    return {
      url: `https://music.163.com/song/media/outer/url?id=${id}.mp3`,
      br: 128000,
      level: level,
    };
  }

  // 5.1 获取歌曲支持的全部音质列表（从 /api/v3/song/detail 获取）
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
      const res = await this.request<{ code: number; songs?: any[]; privileges?: any[] }>("/api/v3/song/detail", {
        c: JSON.stringify([{ id: songId }]),
      });

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
      console.warn("Failed to query song qualities from EAPI:", err);
    }

    return defaultQualities;
  }

  // 6. 获取歌词
  public async getLyric(id: number): Promise<{ lrc: LyricLine[]; rawLrc?: string }> {
    try {
      const res = await this.request<{
        code: number;
        lrc?: { lyric: string };
        tlyric?: { lyric: string };
      }>("/api/song/lyric", { id, lv: -1, tv: -1 });

      if (res && res.lrc && res.lrc.lyric) {
        return {
          lrc: parseLyrics(res.lrc.lyric, res.tlyric?.lyric),
          rawLrc: res.lrc.lyric,
        };
      }
    } catch (err) {
      console.warn("getLyric failed:", err);
    }

    return {
      lrc: [
        { time: 0, text: "正在伴随旋律起伏..." },
        { time: 5, text: "（纯音乐，请静心欣赏）" },
      ],
      rawLrc: "",
    };
  }

  // 7. 云搜索（单曲与歌单双模态）
  public async search(
    keywords: string,
    type = 1,
    limit = 30
  ): Promise<{ songs?: Song[]; playlists?: Playlist[] }> {
    try {
      const res = await this.request<{
        code: number;
        result?: {
          songs?: any[];
          playlists?: any[];
        };
      }>("/api/cloudsearch/pc", {
        s: keywords,
        type,
        limit,
        offset: 0,
      });

      if (res && res.result) {
        if (type === 1 && res.result.songs) {
          const songs = res.result.songs.map(formatSong);
          return { songs };
        }

        if (type === 1000 && res.result.playlists) {
          const playlists = res.result.playlists.map((p: any) => ({
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
      }
    } catch (err) {
      console.warn("search failed:", err);
    }

    // 搜索回退
    const filtered = DEMO_SONGS.filter(
      (s) => s.name.includes(keywords) || s.ar.some((a) => a.name.includes(keywords))
    );
    return { songs: filtered.length > 0 ? filtered : DEMO_SONGS };
  }

  // 8. 热门搜索榜
  public async getHotSearch(): Promise<{ searchWord: string; content?: string; score: number }[]> {
    try {
      const res = await this.request<{
        code: number;
        data?: any[];
      }>("/api/hotsearchlist/get");

      if (res && res.data && res.data.length > 0) {
        return res.data.map((item) => ({
          searchWord: item.searchWord,
          content: item.content || item.alg,
          score: item.score || 0,
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

  // 9. 二维码登录系列（原生纯前端渲染 + 网易云授权轮询）
  public async getQrKey(): Promise<string> {
    try {
      const res = await this.request<{ code: number; unikey?: string }>("/api/login/qrcode/unikey", { type: 1 });
      return res.unikey || "";
    } catch {
      return "qr-key-" + Date.now();
    }
  }

  public async getQrImg(key: string): Promise<string> {
    try {
      const qrUrl = `https://music.163.com/login?codekey=${encodeURIComponent(key)}`;
      const dataUrl = await QRCode.toDataURL(qrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      return dataUrl;
    } catch {
      return "";
    }
  }

  public async checkQrStatus(key: string): Promise<{ code: number; message: string; cookie?: string }> {
    try {
      const res = await this.request<{
        code: number;
        message?: string;
        cookie?: string;
        _setCookies?: string[];
      }>("/api/login/qrcode/client/login", { type: 1, key });

      let cookieStr = res.cookie || "";
      if (res._setCookies && res._setCookies.length > 0) {
        const extracted = res._setCookies
          .map((c) => c.split(";")[0])
          .filter((c) => c.includes("="))
          .join("; ");
        if (extracted) {
          cookieStr = cookieStr ? `${cookieStr}; ${extracted}` : extracted;
        }
      }

      return {
        code: res.code,
        message: res.message || (res.code === 803 ? "授权成功" : "等待扫码"),
        cookie: cookieStr,
      };
    } catch {
      return { code: 801, message: "等待扫码..." };
    }
  }

  // 10. 用户信息获取
  public async getUserAccount(cookie?: string): Promise<any> {
    return await this.request("/api/nuser/account/get", {}, cookie);
  }

  // 11. 获取用户歌单
  public async getUserPlaylists(uid: number): Promise<Playlist[]> {
    try {
      const res = await this.request<{ code: number; playlist?: any[] }>("/api/user/playlist", {
        uid,
        limit: 30,
        offset: 0,
      });

      if (res && res.playlist && res.playlist.length > 0) {
        return res.playlist.map((p) => ({
          id: p.id,
          name: p.name,
          coverImgUrl: p.coverImgUrl || DEFAULT_COVER_URL,
          playCount: p.playCount || 0,
          trackCount: p.trackCount || 0,
          description: p.description,
        }));
      }
    } catch (err) {
      console.warn("getUserPlaylists error:", err);
    }
    return [];
  }

  // 12. 获取用户喜欢的音乐 ID 列表
  public async getUserLikelist(uid: number): Promise<number[]> {
    try {
      const res = await this.request<{ code: number; ids?: number[] }>("/api/song/like/get", { uid });
      if (res && res.ids && Array.isArray(res.ids)) {
        return res.ids;
      }
    } catch (err) {
      console.warn("getUserLikelist error:", err);
    }
    return [];
  }

  // 13. 获取用户喜欢的全量歌曲列表
  public async getUserLikedSongs(uid: number): Promise<{ songs: Song[]; playlistId?: number }> {
    try {
      const playlists = await this.getUserPlaylists(uid);
      if (playlists.length > 0) {
        const likedPlaylist = playlists.find((p) => p.name.includes("喜欢的音乐")) || playlists[0];
        const detail = await this.getPlaylistDetail(likedPlaylist.id);
        return {
          songs: detail.tracks,
          playlistId: likedPlaylist.id,
        };
      }
    } catch (err) {
      console.warn("getUserLikedSongs error:", err);
    }
    return { songs: [] };
  }

  // 14. 喜欢/取消喜欢歌曲
  public async likeSong(id: number, like = true): Promise<boolean> {
    try {
      const res = await this.request<{ code: number }>("/api/radio/like", {
        alg: "itembased",
        trackId: id,
        like,
        time: "3",
      });
      return res && res.code === 200;
    } catch (err) {
      console.warn("likeSong error:", err);
      return false;
    }
  }

  // 15. 退出登录
  public async logout(): Promise<void> {
    try {
      await this.request("/api/logout", {});
    } catch {
      // ignore
    }
  }
}

function formatSong(raw: any): Song {
  let picUrl = raw.al?.picUrl || raw.album?.picUrl || raw.picUrl || "";

  if (picUrl && picUrl.startsWith("http://")) {
    picUrl = picUrl.replace("http://", "https://");
  }

  if (picUrl && !picUrl.includes("?param=")) {
    picUrl = `${picUrl}?param=200y200`;
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
      picUrl: "https://p2.music.126.net/diGAyEmpymX8G7JcnElncQ==/109951163699673355.jpg?param=200y200",
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
      picUrl: "https://p2.music.126.net/ZGffiDQZrGj5s_hnR1CNbg==/109951165566379710.jpg?param=200y200",
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
      picUrl: "https://p2.music.126.net/HXfXIIBCk5w96MiY1Wdsqw==/109951171836610847.jpg?param=200y200",
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
      picUrl: "https://p1.music.126.net/iAwVf8ag_45csIUuh1wSZg==/109951168912558470.jpg?param=200y200",
    },
    dt: 324000,
  },
];

export const api = new ApiService();
