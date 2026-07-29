package net.fourbakers.oppailib

import android.app.Application
import android.content.Context
import net.fourbakers.oppailib.data.Prefs
import net.fourbakers.oppailib.data.Repository
import net.fourbakers.oppailib.work.Notifications
import net.fourbakers.oppailib.work.UploadQueue
import net.fourbakers.oppailib.work.UploadWorker

/** Application-scoped service locator holding the singleton [Repository]. */
class OppaiApp : Application() {
    lateinit var repository: Repository
        private set

    override fun onCreate() {
        super.onCreate()
        repository = Repository(this, Prefs(this))
        // Not only for the app's own sake: an import worker can be started by
        // WorkManager into a process with no Activity in it, and it needs the channel
        // to already exist before it posts its foreground notification.
        Notifications.ensureChannels(this)

        // Uploads outlive this process by design, so the queue is read back here
        // rather than by whichever screen happens to open first — the worker can be
        // started by WorkManager into a process with no Activity in it at all.
        val prefs = repository.prefs
        UploadQueue.attach(prefs)
        // Anything recorded as mid-flight belonged to a worker that no longer exists,
        // because the process was killed. It goes back to queued rather than paused:
        // the user did not stop it, and it picks up from the chunks the server has.
        UploadQueue.requeueInterrupted()
        if (prefs.token != null && UploadQueue.hasPending()) UploadWorker.start(this)
    }

    companion object {
        fun from(context: Context): OppaiApp = context.applicationContext as OppaiApp
    }
}
