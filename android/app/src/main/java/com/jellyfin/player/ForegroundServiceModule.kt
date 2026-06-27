package com.jellyfin.player

import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ForegroundServiceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "ForegroundServiceModule"

  @ReactMethod
  fun start(title: String, artist: String) {
    val ctx = reactApplicationContext
    val intent = PlaybackService.startIntent(ctx.packageName, title, artist)
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
      ctx.stopService(PlaybackService.stopIntent(ctx.packageName))
    } catch (_: Exception) {}
  }
}
