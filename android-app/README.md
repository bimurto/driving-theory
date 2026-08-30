# RoadReady Class B Android app

This native Android wrapper securely loads the deployed study app at
https://bimurto.github.io/driving-theory/. Its questions, media, and site
updates are served from GitHub Pages, so an internet connection is required.

Changes to this wrapper, including native video fullscreen support, require a
new APK build and installation. Changes limited to the web app deploy through
GitHub Pages and do not require an APK update.

## Build a debug APK

1. Install Android Studio and its Android SDK Platform 36.
2. Create `android-app/local.properties` with your SDK location, for example:

   ```properties
   sdk.dir=/path/to/Android/sdk
   ```

3. Run:

   ```bash
   ./gradlew assembleDebug
   ```

The installable APK is written to
`app/build/outputs/apk/debug/app-debug.apk`.

The first build downloads the Android Gradle Plugin and Kotlin dependencies.
For a release APK, configure a signing keystore and a `release` build type;
do not commit keystores or `local.properties`.
