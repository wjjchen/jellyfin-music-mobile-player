package com.jellyfin.player

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class PlaybackService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val action = intent?.action ?: return START_NOT_STICKY
    when (action) {
      ACTION_START -> {
        val title = intent.getStringExtra("title") ?: "Jellyfin Player"
        val artist = intent.getStringExtra("artist") ?: ""
        startForeground(NOTIFICATION_ID, buildNotification(title, artist))
      }
      ACTION_STOP -> {
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
      }
    }
    return START_NOT_STICKY
  }

  private fun buildNotification(title: String, artist: String): Notification {
    createChannel()
    val pendingIntent = PendingIntent.getActivity(
      this, 0, packageManager.getLaunchIntentForPackage(packageName),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentTitle(title)
      .setContentText(artist.ifEmpty { null })
      .setContentIntent(pendingIntent)
      .setOngoing(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .build()
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val mgr = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
      if (mgr.getNotificationChannel(CHANNEL_ID) == null) {
        mgr.createNotificationChannel(
          NotificationChannel(CHANNEL_ID, "播放控制", NotificationManager.IMPORTANCE_LOW).apply {
            setShowBadge(false)
          }
        )
      }
    }
  }

  companion object {
    private const val CHANNEL_ID = "jellyfin_playback"
    private const val NOTIFICATION_ID = 1001
    const val ACTION_START = "com.jellyfin.player.START"
    const val ACTION_STOP = "com.jellyfin.player.STOP"

    fun startIntent(pkg: String, title: String, artist: String): Intent {
      return Intent(ACTION_START).setClassName(pkg, "${pkg}.PlaybackService").apply {
        putExtra("title", title)
        putExtra("artist", artist)
      }
    }

    fun stopIntent(pkg: String): Intent {
      return Intent(ACTION_STOP).setClassName(pkg, "${pkg}.PlaybackService")
    }
  }
}
