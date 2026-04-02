# ============================================================================
# ProGuard Rules — SISAM Capacitor App
# ============================================================================

# Capacitor WebView Bridge — NÃO remover
-keep class com.getcapacitor.** { *; }
-keep class br.com.educacaossbv.sisam.** { *; }

# JavaScript interface para WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preservar annotations usadas pelo Capacitor
-keepattributes *Annotation*
-keepattributes JavascriptInterface

# AndroidX
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# Manter source file e line numbers para crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Google Services (se Firebase for adicionado no futuro)
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
