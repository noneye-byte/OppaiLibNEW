plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

// Release signing material, supplied by CI through the environment (see
// .github/workflows/android.yml). Android refuses to update a sideloaded app
// in place unless the new APK carries the same signature as the installed one,
// so releases must be signed with one persistent key — not the throwaway debug
// key, which is regenerated per machine. When these are unset, local release builds
// use that machine's debug key so the APK remains installable; CI does not publish it.
//
// Blank counts as unset: a workflow step that has no keystore secret to offer
// still exports the variable, just empty. Testing only for null would take the
// empty string as a path and fail the build with "path may not be null or empty".
val keystoreFile: String? = System.getenv("ANDROID_KEYSTORE_FILE")?.takeIf { it.isNotBlank() }

android {
    namespace = "net.fourbakers.oppailib"
    compileSdk = 35

    defaultConfig {
        applicationId = "net.fourbakers.oppailib"
        // Compose and WorkManager support API 23 here. Keeping this at 26 made older
        // phones end at Android's unhelpful "Cannot install" screen.
        minSdk = 23
        targetSdk = 35
        // Overridable by CI so a tagged build gets a monotonically increasing
        // code — Android rejects an update whose versionCode isn't higher.
        versionCode = (System.getenv("ANDROID_VERSION_CODE") ?: "37").toInt()
        versionName = System.getenv("ANDROID_VERSION_NAME") ?: "0.24.0"
    }

    signingConfigs {
        if (keystoreFile != null) {
            create("release") {
                storeFile = file(keystoreFile)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            if (keystoreFile != null) {
                signingConfig = signingConfigs.getByName("release")
            } else {
                // A locally built app-release.apk must still be installable. Using the
                // machine's stable debug key also lets it update a local/debug install;
                // CI never publishes this fallback as the hosted server APK.
                signingConfig = signingConfigs.getByName("debug")
            }
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true }
    // Reuse the web mascot directly instead of maintaining a second binary copy.
    sourceSets.getByName("main").assets.srcDir("../../web/public")
    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)

    val composeBom = platform(libs.androidx.compose.bom)
    implementation(composeBom)
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.navigation.compose)
    debugImplementation(libs.androidx.ui.tooling)

    implementation(libs.retrofit)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.retrofit.kotlinx.serialization)

    implementation(libs.coil.compose)
    implementation(libs.coil.gif)
    implementation(libs.media3.exoplayer)
    implementation(libs.media3.ui)

    implementation(libs.androidx.security.crypto)
    implementation(libs.androidx.biometric)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.androidx.work.runtime.ktx)
}
