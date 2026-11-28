package net.fourbakers.oppailib

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import net.fourbakers.oppailib.data.LibbyMeter
import net.fourbakers.oppailib.work.ShareIntake

/**
 * Where Android's share sheet sends things: queue them and get out of the way.
 *
 * Sharing used to open the whole app — the library, behind its lock — in the middle of
 * whatever app the share came from, and then queue the upload on a session the app ended
 * the moment you went back. Now the share is queued on this phone's share key, which can
 * only add to the library, and nothing is shown but a line saying it was. No unlock is
 * asked for because nothing is shown.
 *
 * With no share key yet (a phone not signed in since share keys came in, or signed out)
 * the share goes to the main activity instead, which asks for a sign-in first and then
 * handles it the same way; signing in fetches a key, so the next share comes straight here.
 */
class ShareActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val shared = intent
        if (!ShareIntake.isShare(shared)) { finish(); return }
        val repo = OppaiApp.from(this).repository
        if (repo.prefs.shareKey == null && !repo.hasSession) {
            startActivity(Intent(shared).setClass(this, MainActivity::class.java).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
            finish()
            return
        }
        val queued = ShareIntake.accept(applicationContext, shared)
        // Adding to the library warms Libby up, as it does from inside the app.
        if (queued.total > 0) LibbyMeter.bump(if (queued.total > 1) 2 else 1)
        Toast.makeText(applicationContext, ShareIntake.summary(queued), Toast.LENGTH_SHORT).show()
        finish()
    }
}
