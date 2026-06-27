import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AuthenticationResult,
  BaseItemDto,
  BaseItemDtoQueryResult,
  LyricDto,
  NameIdPair,
  PlaybackInfoResponse,
  SearchHintResult,
} from '@/types/jellyfin';

let onAuthFailure: (() => void) | null = null;

export function setOnAuthFailure(cb: () => void) {
  onAuthFailure = cb;
}

const APP_NAME = 'Jellyfin Player';
const APP_VERSION = '1.0.0';
const DEVICE_NAME = 'JellyfinPlayer-RN';
const DEVICE_ID = 'jellyfin-player-rn-mobile';

class JellyfinApi {
  private baseUrl = '';
  private accessToken = '';
  private userId = '';
  private musicLibraryId: string | null = null;

  async init() {
    const saved = await AsyncStorage.getItem('jellyfin_server');
    const token = await AsyncStorage.getItem('jellyfin_token');
    const uid = await AsyncStorage.getItem('jellyfin_userId');
    if (saved) this.baseUrl = saved;
    if (token) this.accessToken = token;
    if (uid) this.userId = uid;
  }

  async setServer(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
    await AsyncStorage.setItem('jellyfin_server', this.baseUrl);
  }

  getServer(): string {
    return this.baseUrl;
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.accessToken || !this.baseUrl) {
      await this.init();
    }
    return !!this.accessToken && !!this.baseUrl;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Emby-Authorization': `MediaBrowser Client="${APP_NAME}", Device="${DEVICE_NAME}", DeviceId="${DEVICE_ID}", Version="${APP_VERSION}"`,
    };
    if (this.accessToken) {
      h['X-Emby-Token'] = this.accessToken;
    }
    return h;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...this.headers(),
        ...(options.headers as Record<string, string>),
      },
    });
    if (!res.ok) {
      if (res.status === 401) {
        this.accessToken = '';
        this.userId = '';
        await AsyncStorage.multiRemove(['jellyfin_token', 'jellyfin_userId']);
        onAuthFailure?.();
        return undefined as T;
      }
      const text = await res.text().catch(() => '');
      throw new Error(`API Error ${res.status}: ${text}`);
    }
    if (res.status === 204) {
      return undefined as T;
    }
    const text = await res.text();
    if (!text) {
      return undefined as T;
    }
    return JSON.parse(text) as T;
  }

  async login(username: string, password: string): Promise<AuthenticationResult> {
    const result = await this.request<AuthenticationResult>('/Users/AuthenticateByName', {
      method: 'POST',
      body: JSON.stringify({ Username: username, Pw: password }),
    });
    this.accessToken = result.AccessToken;
    this.userId = result.User.Id;
    await AsyncStorage.setItem('jellyfin_token', this.accessToken);
    await AsyncStorage.setItem('jellyfin_userId', this.userId);
    return result;
  }

  async logout() {
    this.accessToken = '';
    this.userId = '';
    await AsyncStorage.multiRemove(['jellyfin_token', 'jellyfin_userId']);
  }

  getUserId(): string {
    return this.userId;
  }

  getAccessToken(): string {
    return this.accessToken;
  }

  getImageUrl(itemId: string, imageType = 'Primary', width?: number, height?: number, quality = 90, imageTag?: string): string {
    if (!itemId) return '';
    let url = `${this.baseUrl}/Items/${itemId}/Images/${imageType}`;
    const params = new URLSearchParams({ quality: String(quality) });
    if (width) params.set('width', String(width));
    if (height) params.set('height', String(height));
    if (imageTag) params.set('tag', imageTag);
    if (this.accessToken) params.set('api_key', this.accessToken);
    return `${url}?${params.toString()}`;
  }

  async getLatestAlbums(limit = 20): Promise<BaseItemDto[]> {
    return this.request<BaseItemDto[]>(
      `/Users/${this.userId}/Items/Latest?Limit=${limit}&IncludeItemTypes=MusicAlbum&Fields=PrimaryImageAspectRatio,SortName`
    );
  }

  async getRecentlyPlayed(limit = 20): Promise<BaseItemDto[]> {
    return this.request<BaseItemDto[]>(
      `/Users/${this.userId}/Items/Resume?Limit=${limit}&IncludeItemTypes=Audio,MusicAlbum&Fields=PrimaryImageAspectRatio,SortName,MediaSourceCount`
    );
  }

  async getItems(params: {
    includeItemTypes?: string;
    sortBy?: string;
    sortOrder?: string;
    startIndex?: number;
    limit?: number;
    parentId?: string;
    searchTerm?: string;
    recursive?: boolean;
    fields?: string;
    filters?: string;
    isFavorite?: boolean;
    mediaTypes?: string;
    genreIds?: string;
  }): Promise<BaseItemDtoQueryResult> {
    const q = new URLSearchParams();
    if (params.includeItemTypes) q.set('IncludeItemTypes', params.includeItemTypes);
    if (params.sortBy) q.set('SortBy', params.sortBy);
    if (params.sortOrder) q.set('SortOrder', params.sortOrder);
    if (params.startIndex !== undefined) q.set('StartIndex', String(params.startIndex));
    if (params.limit !== undefined) q.set('Limit', String(params.limit));
    if (params.parentId) q.set('ParentId', params.parentId);
    if (params.searchTerm) q.set('SearchTerm', params.searchTerm);
    if (params.recursive) q.set('Recursive', 'true');
    if (params.fields) q.set('Fields', params.fields);
    if (params.filters) q.set('Filters', params.filters);
    if (params.isFavorite !== undefined) q.set('IsFavorite', String(params.isFavorite));
    if (params.mediaTypes) q.set('MediaTypes', params.mediaTypes);
    if (params.genreIds) q.set('GenreIds', params.genreIds);
    q.set('EnableUserData', 'true');
    q.set('EnableImages', 'true');
    q.set('ImageTypeLimit', '1');
    q.set('EnableTotalRecordCount', 'true');
    return this.request<BaseItemDtoQueryResult>(`/Users/${this.userId}/Items?${q.toString()}`);
  }

  async getItem(itemId: string): Promise<BaseItemDto> {
    return this.request<BaseItemDto>(
      `/Users/${this.userId}/Items/${itemId}?Fields=PrimaryImageAspectRatio,SortName,Genres,Overview,People,MediaSourceCount,RecursiveItemCount`
    );
  }

  async getAlbumTracks(albumId: string): Promise<BaseItemDtoQueryResult> {
    return this.getItems({
      includeItemTypes: 'Audio',
      parentId: albumId,
      sortBy: 'ParentIndexNumber,IndexNumber,SortName',
      sortOrder: 'Ascending',
      fields: 'PrimaryImageAspectRatio,SortName,MediaSourceCount,MediaStreams',
      limit: 200,
    });
  }

  async getArtists(params?: {
    startIndex?: number;
    limit?: number;
    searchTerm?: string;
    sortBy?: string;
  }): Promise<BaseItemDtoQueryResult> {
    const q = new URLSearchParams();
    if (params?.startIndex !== undefined) q.set('StartIndex', String(params.startIndex));
    if (params?.limit !== undefined) q.set('Limit', String(params.limit));
    if (params?.searchTerm) q.set('SearchTerm', params.searchTerm);
    q.set('SortBy', params?.sortBy || 'SortName');
    q.set('SortOrder', 'Ascending');
    q.set('EnableUserData', 'true');
    q.set('EnableImages', 'true');
    q.set('ImageTypeLimit', '1');
    q.set('EnableTotalRecordCount', 'true');
    return this.request<BaseItemDtoQueryResult>(`/Artists?${q.toString()}`);
  }

  async getAlbumArtists(params?: {
    startIndex?: number;
    limit?: number;
    searchTerm?: string;
  }): Promise<BaseItemDtoQueryResult> {
    const q = new URLSearchParams();
    if (params?.startIndex !== undefined) q.set('StartIndex', String(params.startIndex));
    if (params?.limit !== undefined) q.set('Limit', String(params.limit));
    if (params?.searchTerm) q.set('SearchTerm', params.searchTerm);
    q.set('SortBy', 'SortName');
    q.set('SortOrder', 'Ascending');
    q.set('EnableUserData', 'true');
    q.set('EnableImages', 'true');
    q.set('ImageTypeLimit', '1');
    q.set('EnableTotalRecordCount', 'true');
    return this.request<BaseItemDtoQueryResult>(`/Artists/AlbumArtists?${q.toString()}`);
  }

  async getArtistAlbums(artistId: string): Promise<BaseItemDtoQueryResult> {
    return this.getItems({
      includeItemTypes: 'MusicAlbum',
      sortBy: 'ProductionYear,SortName',
      sortOrder: 'Descending',
      fields: 'PrimaryImageAspectRatio,SortName,DateCreated',
      limit: 100,
      recursive: true,
    }).then((result): BaseItemDtoQueryResult => {
      const filtered = result.Items.filter(
        (item: BaseItemDto) =>
          item.AlbumArtists?.some((a: NameIdPair) => a.Id === artistId) ||
          item.ArtistItems?.some((a: NameIdPair) => a.Id === artistId)
      );
      return { ...result, Items: filtered };
    });
  }

  async getArtistSongs(artistId: string, artistName: string): Promise<BaseItemDtoQueryResult> {
    return this.getItems({
      includeItemTypes: 'Audio',
      sortBy: 'ProductionYear,Album,SortName',
      sortOrder: 'Descending',
      fields: 'PrimaryImageAspectRatio,SortName,MediaSourceCount,MediaStreams',
      limit: 500,
      recursive: true,
    }).then((result): BaseItemDtoQueryResult => {
      const filtered = result.Items.filter(
        (item: BaseItemDto) =>
          item.Artists?.includes(artistName) ||
          item.ArtistItems?.some((a: NameIdPair) => a.Id === artistId)
      );
      return { ...result, Items: filtered, TotalRecordCount: filtered.length };
    });
  }

  getAudioStreamUrl(itemId: string, container?: string, mediaSourceId?: string): string {
    let url = `${this.baseUrl}/Audio/${itemId}/universal?UserId=${this.userId}&DeviceId=${DEVICE_ID}&MaxStreamingBitrate=140000000&Container=mp3,aac,m4a,flac,wav,ogg&TranscodingContainer=mp3&TranscodingProtocol=http&AudioCodec=aac&api_key=${this.accessToken}`;
    if (mediaSourceId) url += `&MediaSourceId=${mediaSourceId}`;
    return url;
  }

  async getLyrics(itemId: string): Promise<LyricDto | null> {
    try {
      return await this.request<LyricDto>(`/Audio/${itemId}/Lyrics`);
    } catch {
      return null;
    }
  }

  async search(term: string, limit = 20): Promise<SearchHintResult> {
    return this.request<SearchHintResult>(
      `/Search/Hints?SearchTerm=${encodeURIComponent(term)}&Limit=${limit}&IncludeItemTypes=Audio,MusicAlbum,MusicArtist`
    );
  }

  async toggleFavorite(itemId: string): Promise<void> {
    const item = await this.getItem(itemId);
    const isFav = item.UserData?.IsFavorite ?? false;
    await this.request(`/UserItems/${itemId}/UserData`, {
      method: 'POST',
      body: JSON.stringify({ IsFavorite: !isFav }),
    });
  }

  async getGenres(): Promise<BaseItemDtoQueryResult> {
    let parentId = '';
    if (!this.musicLibraryId) {
      try {
        const views = await this.request<any>(`/Users/${this.userId}/Views`);
        const musicLib = views.Items?.find((v: any) => v.CollectionType === 'music');
        if (musicLib) {
          this.musicLibraryId = musicLib.Id;
        }
      } catch {
        void 0;
      }
    }
    if (this.musicLibraryId) {
      parentId = `&ParentId=${this.musicLibraryId}`;
    }
    return this.request<BaseItemDtoQueryResult>(
      `/Genres?SortBy=SortName&SortOrder=Ascending&Recursive=true&Fields=PrimaryImageAspectRatio,ItemCounts&StartIndex=0${parentId}&userId=${this.userId}`
    );
  }

  async getPlaylists(): Promise<BaseItemDtoQueryResult> {
    return this.getItems({
      includeItemTypes: 'Playlist',
      mediaTypes: 'Audio',
      recursive: true,
      sortBy: 'SortName',
      sortOrder: 'Ascending',
      fields: 'PrimaryImageAspectRatio,SortName,DateCreated,ChildCount',
    });
  }

  async getPlaylistItems(playlistId: string): Promise<BaseItemDtoQueryResult> {
    return this.getItems({
      includeItemTypes: 'Audio',
      parentId: playlistId,
      sortBy: 'PlaylistIndex',
      sortOrder: 'Ascending',
      fields: 'PrimaryImageAspectRatio,SortName,MediaSourceCount,MediaStreams',
      limit: 1000,
    });
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.request(`/Items/${itemId}`, { method: 'DELETE' });
  }

  async addToPlaylist(playlistId: string, itemId: string): Promise<void> {
    await this.request(`/Playlists/${playlistId}/Items?Ids=${itemId}&UserId=${this.userId}`, { method: 'POST' });
  }

  async removeFromPlaylist(playlistId: string, itemIds: string[]): Promise<void> {
    await this.request(`/Playlists/${playlistId}/Items?EntryIds=${itemIds.join(',')}&UserId=${this.userId}`, { method: 'DELETE' });
  }
}

export const jellyfinApi = new JellyfinApi();
