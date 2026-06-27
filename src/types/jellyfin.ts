// Jellyfin API types - identical to Electron version
// WindowControls removed (Electron-specific)

export interface JellyfinServer {
  url: string;
  name?: string;
}

export interface UserDto {
  Id: string;
  Name: string;
  ServerId?: string;
}

export interface AuthenticationResult {
  User: UserDto;
  AccessToken: string;
  ServerId: string;
}

export interface ImageInfo {
  ImageType: string;
  ImageIndex?: number;
  ImageTag?: string;
  Width?: number;
  Height?: number;
}

export interface UserDataDto {
  PlaybackPositionTicks?: number;
  PlayCount?: number;
  IsFavorite?: boolean;
  Played?: boolean;
  LastPlayedDate?: string;
}

export interface BaseItemDto {
  Id: string;
  Name: string;
  Type?: string;
  ServerId?: string;
  Container?: string;
  SortName?: string;
  ForcedSortName?: string;
  Album?: string;
  AlbumId?: string;
  AlbumArtist?: string;
  AlbumArtists?: NameIdPair[];
  Artists?: string[];
  ArtistItems?: NameIdPair[];
  ProductionYear?: number;
  PremiereDate?: string;
  RunTimeTicks?: number;
  Genres?: string[];
  GenreItems?: NameIdPair[];
  ParentId?: string;
  ParentIndexNumber?: number;
  IndexNumber?: number;
  UserData?: UserDataDto;
  ImageTags?: Record<string, string>;
  ImageBlurHashes?: Record<string, Record<string, string>>;
  AlbumPrimaryImageTag?: string;
  AlbumPrimaryImageItemId?: string;
  Overview?: string;
  MediaType?: string;
  IsFolder?: boolean;
  ChildCount?: number;
  RecursiveItemCount?: number;
  SongCount?: number;
  People?: BaseItemPerson[];
  MediaSources?: MediaSourceInfo[];
  MediaStreams?: MediaStream[];
  SourceType?: string;
  DateCreated?: string;
  DateLastMediaAdded?: string;
  PresentationUniqueKey?: string;
  OriginalTitle?: string;
}

export interface BaseItemDtoQueryResult {
  Items: BaseItemDto[];
  TotalRecordCount: number;
  StartIndex: number;
}

export interface NameIdPair {
  Name: string;
  Id: string;
}

export interface BaseItemPerson {
  Name: string;
  Id: string;
  Role?: string;
  Type: string;
  PrimaryImageTag?: string;
}

export interface MediaSourceInfo {
  Id: string;
  Container: string;
  Size?: number;
  Name?: string;
  IsRemote: boolean;
  RunTimeTicks?: number;
  SupportsTranscoding: boolean;
  SupportsDirectStream: boolean;
  SupportsDirectPlay: boolean;
  IsInfiniteStream: boolean;
  RequiresOpening: boolean;
  RequiresClosing: boolean;
  RequiresLooping: boolean;
  SupportsProbing: boolean;
  MediaStreams: MediaStream[];
  TranscodingUrl?: string;
  DirectStreamUrl?: string;
  TranscodingSubProtocol?: string;
}

export interface MediaStream {
  Codec: string;
  Language?: string;
  DisplayTitle?: string;
  ChannelLayout?: string;
  BitRate?: number;
  BitDepth?: number;
  Channels?: number;
  SampleRate?: number;
  IsDefault: boolean;
  IsForced: boolean;
  Type: string;
  Index: number;
  IsExternal: boolean;
  IsExternalUrl: boolean;
  IsTextSubtitleStream: boolean;
  SupportsExternalStream: boolean;
  Path?: string;
}

export interface LyricDto {
  Lyrics: LyricLine[];
}

export interface LyricLine {
  Text: string;
  Start: number;
}

export interface SearchHintResult {
  SearchHints: SearchHint[];
  TotalRecordCount: number;
}

export interface SearchHint {
  Id: string;
  Name: string;
  Type: string;
  Album?: string;
  AlbumArtist?: string;
  Artist?: string;
  MediaType?: string;
}

export interface PlaybackInfoResponse {
  MediaSources: MediaSourceInfo[];
  PlaySessionId: string;
}
