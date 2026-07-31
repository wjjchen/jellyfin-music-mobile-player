package com.jellyfin.player

import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter

class ForegroundServiceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ForegroundServiceModule"

  init {
    JellyfinPlaybackService.eventCallback = { event ->
      sendEventToJs(event)
    }
  }

  private fun sendEventToJs(event: String) {
    try {
      reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("PlaybackEvent", event)
    } catch (_: Exception) {}
  }

  @ReactMethod
  fun start(title: String, artist: String, album: String, artwork: String, duration: Double) {
    val ctx = reactApplicationContext
    val intent = Intent(ctx, JellyfinPlaybackService::class.java).apply {
      action = JellyfinPlaybackService.ACTION_START
      putExtra("isPlaying", true)
      putExtra("title", title)
      putExtra("artist", artist)
      putExtra("album", album)
      putExtra("artwork", artwork)
      putExtra("duration", (duration * 1000).toLong())
    }
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ctx.startForegroundService(intent)
      } else {
        ctx.startService(intent)
      }
    } catch (_: Exception) {}
  }

  @ReactMethod
  fun stop() {
    val ctx = reactApplicationContext
    try {
      ctx.stopService(Intent(ctx, JellyfinPlaybackService::class.java).apply {
        action = JellyfinPlaybackService.ACTION_STOP
      })
    } catch (_: Exception) {}
  }

  @ReactMethod
  fun updatePlaybackState(isPlaying: Boolean, position: Double, duration: Double) {
    JellyfinPlaybackService.instance?.onUpdatePlaybackState(
      isPlaying,
      (position * 1000).toLong(),
      (duration * 1000).toLong()
    )
  }

  @ReactMethod
  fun updateMetadata(title: String, artist: String, album: String, artwork: String) {
    JellyfinPlaybackService.instance?.onUpdateMetadata(title, artist, album, artwork)
  }

  @ReactMethod
  fun sendEvent(action: String) {
    val ctx = reactApplicationContext
    try {
      val serviceIntent = Intent(ctx, JellyfinPlaybackService::class.java).setAction(action)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ctx.startForegroundService(serviceIntent)
      } else {
        ctx.startService(serviceIntent)
      }
    } catch (_: Exception) {}
  }

  @ReactMethod
  override fun invalidate() {
    super.invalidate()
  }
}
