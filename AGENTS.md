# AGENTS.md — Jellyfin Player (React Native)

## 项目概览

Jellyfin 音乐播放器 — Expo 单包应用，支持 iOS / Android / Web。

## 命令

```bash
npx expo start           # 启动开发服务器
npx expo run:android     # 构建并运行 Android
npx expo run:ios         # 构建并运行 iOS
npx expo start --web     # Web 模式
npx expo lint            # 检查
npx tsc --noEmit         # TypeScript 类型检查
```

## 架构

```
app/                       # 路由入口 (expo-router 文件路由)
  _layout.tsx              # 根布局：初始化 API、锁屏处理、NowPlayingBar/PlaylistPanel
  index.tsx                # 认证路由：已登录→tabs，未登录→login
  login.tsx                # 登录页
  (tabs)/_layout.tsx       # Tab 导航（底部 TabBar，6 个 tab）
  (tabs)/index.tsx         # 首页（推荐、最近播放、每日推荐）
  (tabs)/songs.tsx         # 全部歌曲列表
  (tabs)/albums.tsx        # 专辑列表 + 专辑详情 Overlay
  (tabs)/artists.tsx       # 歌手列表 + 歌手详情 Overlay
  (tabs)/genres.tsx        # 流派列表 + 流派歌曲 Overlay
  (tabs)/favorites.tsx     # 收藏歌曲
  (tabs)/playlists.tsx     # 用户歌单列表 + 歌单详情 Overlay
  player.tsx               # 全屏播放器（黑胶旋转动画、歌词、进度条、控制按钮）

src/
  api/jellyfin.ts          # Jellyfin REST API 封装（单例 jellyfinApi）
  store/playerStore.ts     # Zustand 播放器状态（队列、播放控制、歌词同步、原生音频桥接）
  services/                # Android 原生模块桥接
    foregroundService.ts   # 前台服务通知 + 媒体按钮事件
    mediaButtonListener.ts # 物理媒体按钮监听
    downloadService.ts     # 歌曲下载到本地
  components/              # 共享 UI 组件
    SafeImage.tsx          # 封面图（失败时降级到 DefaultImage）
    DefaultImage.tsx       # SVG 占位图（album/artist/song 三种样式）
    NowPlayingBar.tsx      # 底部迷你播放条
    PlaylistPanel.tsx      # 右侧播放列表面板
    BackButton.tsx         # 返回按钮
  types/jellyfin.ts        # Jellyfin API 类型定义
  utils/
    theme.ts               # 颜色常量 + 共享 StyleSheet
    format.ts              # 时间/时长/比特率/计数格式化
    trackPlayer.ts         # 音频播放桥接（原生 expo-audio / Web HTMLAudioElement）
```

## 关键约定

- **路径别名**: `@/` → `src/`（tsconfig `paths` 配置）
- **路由**: expo-router 文件路由，`app/` 下每个 `.tsx` 是一个页面
- **Tab 路由**: `(tabs)/` 目录是 expo-router 的 tab group
- **状态管理**: 仅使用 Zustand 管理播放器状态（`playerStore.ts`），页面数据用本地 `useState`
- **认证**: 服务端地址、access token、userId 存储在 AsyncStorage（key: `jellyfin_server`, `jellyfin_token`, `jellyfin_userId`）
- **API 认证头**: `X-Emby-Authorization` + `X-Emby-Token`（非标准 Bearer）
- **音频播放**: 原生用 `expo-audio` AudioPlayer，Web 用 HTML Audio 元素，播放器状态在 `playerStore.ts` 中统一协调
- **原生模块**: Android 通过 `NativeModules.ForegroundServiceModule` 和 `NativeModules.MediaButtonModule` 桥接
- **深色模式**: 全局深色主题，主色 `#00A4DC`（accent），背景 `#1a1a2e`
- **图片**: 封面通过 `jellyfinApi.getImageUrl()` 构建带参 URL，加载失败自动降级
- **歌词**: 歌词数据存储在 playerStore 中，通过 250ms 定时器轮询进度同步当前行
- **下载**: Android 用 `react-native-blob-util` 下载到 Downloads 目录，Android 10+ 走 MediaStore

## 注意事项

- `expo` 文件为空，不需要处理
- 没有测试文件、CI 配置、lint 配置文件
- 没有 `.env` 文件（gitignore 中排除）
- 没有 `AGENTS.md` / `CLAUDE.md` / `opencode.json` 等指令文件
- 新代码遵循 TypeScript strict 模式，允许 `noUnusedLocals` 和 `noUnusedParameters` 为 false
- 修改 `src/types/jellyfin.ts` 时注意与 Jellyfin API 响应结构保持一致
- 修改播放器逻辑时注意 `playerStore.ts` 中的平台分支（`Platform.OS === 'web'` vs 原生路径）
- 前台服务和媒体按钮仅在 Android 上生效（`Platform.OS !== 'android'` 时直接 return）
