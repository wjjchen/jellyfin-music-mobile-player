package com.jellyfin.player

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Binder
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat.MediaStyle

class JellyfinPlaybackService : Service() {

  private var mediaSession: MediaSessionCompat? = null
  private var currentTitle: String = "Jellyfin Player"
  private var currentArtist: String = ""
  private var currentAlbum: String = ""
  private var currentArtworkUrl: String = ""
  private var isPlayingState = false
  private var eventReceiver: BroadcastReceiver? = null

  private val binder = LocalBinder()

  inner class LocalBinder : Binder() {
    fun getService(): JellyfinPlaybackService = this@JellyfinPlaybackService
  }

  override fun onBind(intent: Intent?): IBinder = binder

  override fun onCreate() {
    super.onCreate()
    createChannel()
    initMediaSession()

    eventReceiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action == "com.jellyfin.player.UPDATE_STATE") {
          isPlayingState = intent.getBooleanExtra("isPlaying", false)
          updateMediaSessionState()
          updateNotification()
        }
      }
    }
    try {
      registerReceiver(eventReceiver, IntentFilter("com.jellyfin.player.UPDATE_STATE"))
    } catch (_: Exception) {}
  }

  override fun onDestroy() {
    super.onDestroy()
    try { unregisterReceiver(eventReceiver) } catch (_: Exception) {}
    mediaSession?.release()
    mediaSession = null
    stopForeground(true)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> {
        currentTitle = intent.getStringExtra("title") ?: "Jellyfin Player"
        currentArtist = intent.getStringExtra("artist") ?: ""
        currentAlbum = intent.getStringExtra("album") ?: ""
        currentArtworkUrl = intent.getStringExtra("artwork") ?: ""
        isPlayingState = true
        updateMediaSessionMetadata()
        updateMediaSessionState()
        startForeground(NOTIFICATION_ID, buildNotification())
      }
      ACTION_STOP -> {
        isPlayingState = false
        updateMediaSessionState()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
      }
      ACTION_TOGGLE -> {
        sendEvent(EVENT_TOGGLE)
      }
      ACTION_PREV -> {
        sendEvent(EVENT_PREV)
      }
      ACTION_NEXT -> {
        sendEvent(EVENT_NEXT)
      }
    }
    return START_STICKY
  }

  private fun initMediaSession() {
    mediaSession = MediaSessionCompat(this, "JellyfinPlayer").apply {
      setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS)
      setCallback(object : MediaSessionCompat.Callback() {
        override fun onPlay() { sendEvent(EVENT_TOGGLE) }
        override fun onPause() { sendEvent(EVENT_TOGGLE) }
        override fun onSkipToNext() { sendEvent(EVENT_NEXT) }
        override fun onSkipToPrevious() { sendEvent(EVENT_PREV) }
        override fun onSeekTo(pos: Long) { }
      })
      isActive = true
    }
  }

  private fun updateMediaSessionMetadata() {
    mediaSession?.setMetadata(
      MediaMetadataCompat.Builder()
        .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
        .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
        .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, currentAlbum)
        .build()
    )
  }

  private fun updateMediaSessionState() {
    val state = if (isPlayingState) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED
    mediaSession?.setPlaybackState(
      PlaybackStateCompat.Builder()
        .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f)
        .setActions(
          PlaybackStateCompat.ACTION_PLAY_PAUSE or
          PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
          PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
        )
        .build()
    )
  }

  private fun sendEvent(event: String) {
    try {
      sendBroadcast(Intent("com.jellyfin.player.EVENT").putExtra("event", event))
    } catch (_: Exception) {}
    try {
      eventCallback?.invoke(event)
    } catch (_: Exception) {}
  }

  private fun updateNotification() {
    val mgr = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    mgr.notify(NOTIFICATION_ID, buildNotification())
  }

  private fun buildNotification(): Notification {
    val pendingIntent = PendingIntent.getActivity(
      this, 0, packageManager.getLaunchIntentForPackage(packageName),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val toggleIcon = if (isPlayingState) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
    val toggleTitle = if (isPlayingState) "Pause" else "Play"
    val toggleAction = NotificationCompat.Action.Builder(toggleIcon, toggleTitle, buildActionIntent(ACTION_TOGGLE)).build()

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentTitle(currentTitle)
      .setContentText(currentArtist.ifEmpty { null })
      .setSubText(currentAlbum.ifEmpty { null })
      .setContentIntent(pendingIntent)
      .setOngoing(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
      .addAction(NotificationCompat.Action.Builder(android.R.drawable.ic_media_previous, "Previous", buildActionIntent(ACTION_PREV)).build())
      .addAction(toggleAction)
      .addAction(NotificationCompat.Action.Builder(android.R.drawable.ic_media_next, "Next", buildActionIntent(ACTION_NEXT)).build())
      .setStyle(MediaStyle().setMediaSession(mediaSession?.sessionToken))
      .setShowWhen(false)
      .build()
  }

  private fun buildActionIntent(action: String): PendingIntent {
    return PendingIntent.getService(
      this, action.hashCode() and 0x7FFFFFFF,
      Intent(this, JellyfinPlaybackService::class.java).setAction(action),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val mgr = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
      if (mgr.getNotificationChannel(CHANNEL_ID) == null) {
        mgr.createNotificationChannel(
          NotificationChannel(CHANNEL_ID, "Jellyfin 播放", NotificationManager.IMPORTANCE_LOW).apply {
            setShowBadge(false)
          }
        )
      }
    }
  }

  companion object {
    private const val CHANNEL_ID = "jellyfin_media_channel"
    private const val NOTIFICATION_ID = 3001
    const val ACTION_START = "com.jellyfin.player.START_MEDIA"
    const val ACTION_STOP = "com.jellyfin.player.STOP_MEDIA"
    const val ACTION_TOGGLE = "com.jellyfin.player.TOGGLE"
    const val ACTION_PREV = "com.jellyfin.player.PREV"
    const val ACTION_NEXT = "com.jellyfin.player.NEXT"
    const val EVENT_TOGGLE = "TOGGLE"
    const val EVENT_PREV = "PREV"
    const val EVENT_NEXT = "NEXT"

    @JvmStatic
    var eventCallback: ((String) -> Unit)? = null
  }
}
