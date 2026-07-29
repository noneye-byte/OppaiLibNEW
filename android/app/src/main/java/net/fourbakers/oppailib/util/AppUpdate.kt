package net.fourbakers.oppailib.util

import android.content.Context
import android.content.ClipData
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import java.io.File
import java.security.MessageDigest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import net.fourbakers.oppailib.data.ApkInfo
import net.fourbakers.oppailib.data.Repository

/**
 * Updating the app from the server that serves it.
 *
 * There is no store to update through and no version number on the wire — the server
 * just holds an APK file. So "is there an update?" is answered by hashing: if the
 * server's APK differs from the one this process is running, it's a different build
 * and worth offering. Once it's installed the hashes agree and the offer disappears,
 * with no state to keep and nothing to get out of sync.
 *
 * The catch is signing. Android refuses to replace a sideloaded app with an APK
 * carrying a different signature, so an update only installs over CI's signed builds
 * (or an operator's own key — see the server's /api/apk). The install prompt is the
 * one that reports that; we can't detect it beforehand.
 */
object AppUpdate {

    /**
     * The hash of the APK this process is running. `sourceDir` is the installed file
     * itself, byte-for-byte what was handed to the package installer, so it compares
     * directly against what the server reports for its own copy.
     */
    suspend fun installedDigest(context: Context): String = withContext(Dispatchers.IO) {
        runCatching { sha256(File(context.applicationInfo.sourceDir)) }.getOrDefault("")
    }

    /** Whether the server is offering a build that isn't the one we're running. */
    fun isNewer(info: ApkInfo, installedDigest: String): Boolean =
        info.available && info.sha256.isNotEmpty() && installedDigest.isNotEmpty() &&
            !info.sha256.equals(installedDigest, ignoreCase = true)

    /**
     * Pulls the APK into the cache, reporting progress as a 0–1 fraction, and verifies
     * it hashes to what the info endpoint promised.
     *
     * The check is not ceremony: this file is about to be handed to the package
     * installer, and a download truncated by a dropped phone connection would otherwise
     * be offered for install as though it were whole.
     */
    suspend fun download(
        context: Context,
        repo: Repository,
        info: ApkInfo,
        onProgress: (Float) -> Unit,
    ): Result<File> = withContext(Dispatchers.IO) {
        runCatching {
            val dir = File(context.cacheDir, "updates").apply { mkdirs() }
            val out = File(dir, "oppailib.apk")
            repo.api.downloadApk().use { body ->
                // The server sets Content-Length, but a proxy in front of it might not:
                // fall back to what the info endpoint said rather than dividing by zero.
                val total = body.contentLength().takeIf { it > 0 } ?: info.size
                body.byteStream().use { source ->
                    out.outputStream().use { sink ->
                        val buf = ByteArray(DEFAULT_BUFFER_SIZE)
                        var copied = 0L
                        while (true) {
                            val n = source.read(buf)
                            if (n < 0) break
                            sink.write(buf, 0, n)
                            copied += n
                            if (total > 0) onProgress((copied.toFloat() / total).coerceIn(0f, 1f))
                        }
                    }
                }
            }
            if (info.sha256.isNotEmpty() && !sha256(out).equals(info.sha256, ignoreCase = true)) {
                out.delete()
                error("The download didn't match the server's copy. Try again.")
            }
            out
        }
    }

    /**
     * Hands the APK to the system package installer. Android shows its own confirmation
     * — this can't install anything behind the user's back.
     */
    fun install(context: Context, apk: File) {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.updates", apk)
        // A few OEM installers lose a URI grant when an ACTION_INSTALL_PACKAGE intent
        // crosses into their package installer. Supplying both an explicit APK MIME
        // type and ClipData keeps the grant attached through that hand-off.
        val intent = Intent(Intent.ACTION_INSTALL_PACKAGE).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            clipData = ClipData.newRawUri("OppaiLib update", uri)
            putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true)
            putExtra(Intent.EXTRA_RETURN_RESULT, false)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        // Some OEM package installers ignore the transient flag unless their package
        // also receives an explicit grant. Grant only to activities that resolve this
        // install intent, and only for this one content URI.
        context.packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
            .forEach {
                context.grantUriPermission(
                    it.activityInfo.packageName,
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION,
                )
            }
        context.startActivity(intent)
    }

    /**
     * Checks the failures Android's package installer otherwise collapses into the
     * unhelpful “App not installed” message.
     */
    fun validateInstall(context: Context, apk: File): Result<Unit> = runCatching {
        val pm = context.packageManager
        val archive = packageArchive(pm, apk.absolutePath)
            ?: error("The downloaded file is not a valid APK.")
        val installed = installedPackage(pm, context.packageName)

        if (archive.packageName != context.packageName) {
            error("This APK is for ${archive.packageName}, not ${context.packageName}.")
        }
        if (versionCode(archive) < versionCode(installed)) {
            error("The server APK is older than the installed app.")
        }
        val archiveSigners = signerDigests(archive)
        val installedSigners = signerDigests(installed)
        if (
            archiveSigners.isEmpty() || installedSigners.isEmpty() ||
            archiveSigners.intersect(installedSigners).isEmpty()
        ) {
            error(
                "This update was signed with a different key. Uninstall OppaiLib once, " +
                    "install the server copy, and future consistently signed updates will work.",
            )
        }
        val minSdk = archive.applicationInfo?.minSdkVersion ?: 1
        if (minSdk > Build.VERSION.SDK_INT) {
            error("This update needs Android $minSdk, but this device is Android ${Build.VERSION.SDK_INT}.")
        }
    }

    /**
     * Whether the user has allowed this app to install packages. Without it the install
     * intent opens on a dead end, so the UI sends them to the toggle first.
     */
    fun canInstall(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.O || context.packageManager.canRequestPackageInstalls()

    fun requestInstallPermission(context: Context) {
        context.startActivity(
            Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }

    private fun sha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buf = ByteArray(DEFAULT_BUFFER_SIZE)
            while (true) {
                val n = input.read(buf)
                if (n < 0) break
                digest.update(buf, 0, n)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    @Suppress("DEPRECATION")
    private fun packageArchive(pm: PackageManager, path: String): PackageInfo? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            pm.getPackageArchiveInfo(path, PackageManager.GET_SIGNING_CERTIFICATES)
        } else {
            pm.getPackageArchiveInfo(path, PackageManager.GET_SIGNATURES)
        }

    @Suppress("DEPRECATION")
    private fun installedPackage(pm: PackageManager, name: String): PackageInfo =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pm.getPackageInfo(name, PackageManager.PackageInfoFlags.of(PackageManager.GET_SIGNING_CERTIFICATES.toLong()))
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            pm.getPackageInfo(name, PackageManager.GET_SIGNING_CERTIFICATES)
        } else {
            pm.getPackageInfo(name, PackageManager.GET_SIGNATURES)
        }

    @Suppress("DEPRECATION")
    private fun versionCode(info: PackageInfo): Long =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) info.longVersionCode else info.versionCode.toLong()

    @Suppress("DEPRECATION")
    private fun signerDigests(info: PackageInfo): Set<String> {
        val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val signing = info.signingInfo ?: return emptySet()
            if (signing.hasMultipleSigners()) signing.apkContentsSigners else signing.signingCertificateHistory
        } else {
            info.signatures
        }
        return signatures.orEmpty().map { signature ->
            MessageDigest.getInstance("SHA-256").digest(signature.toByteArray())
                .joinToString("") { "%02x".format(it) }
        }.toSet()
    }
}
