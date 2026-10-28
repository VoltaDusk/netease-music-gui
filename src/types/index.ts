export interface Artist {
  id: number;
  name: string;
  picUrl?: string;
}

export interface Album {
  id: number;
  name: string;
  picUrl: string;
}

export interface Song {
  id: number;
  name: string;
  ar: Artist[];
  al: Album;
  dt: number; // Duration in milliseconds
  url?: string;
  liked?: boolean;
}

export interface Creator {
  nickname: string;
  avatarUrl: string;
  userId: number;
}

export interface Playlist {
  id: number;
  name: string;
  coverImgUrl: string;
  description?: string;
  playCount: number;
  trackCount: number;
  creator?: Creator;
  tags?: string[];
  tracks?: Song[];
}

export interface Banner {
  imageUrl: string;
  typeTitle: string;
  targetId: number;
  url?: string;
}

export interface LyricLine {
  time: number; // in seconds
  text: string;
  translation?: string;
}

export type PlayMode = "sequence" | "loop" | "shuffle";

export type NavView = "discover" | "playlists" | "toplist" | "search" | "playlist-detail" | "history" | "liked";

export type SongQuality = "standard" | "higher" | "exhigh" | "lossless" | "hires" | "jymaster";

export interface QualityOption {
  level: SongQuality;
  label: string;
  badge: string;
  sub: string;
  available?: boolean;
}
