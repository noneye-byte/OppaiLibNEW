package net.fourbakers.oppailib.ui

import android.content.Context
import android.content.ContextWrapper
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContract
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.platform.LocalContext
import net.fourbakers.oppailib.MainActivity

/**
 * Launches Android's document UI without treating it as the user leaving OppaiLib.
 *
 * A document provider is a separate activity, so opening one drives [MainActivity]
 * through `ON_STOP`. The privacy lock normally closes the session there. Marking the
 * picker as active keeps that lock armed but deferred until the picker returns; an
 * ordinary Home/app-switch event from OppaiLib still locks immediately.
 */
internal class SystemPickerLauncher<I>(private val launchPicker: (I) -> Unit) {
    fun launch(input: I) = launchPicker(input)
}

@Composable
internal fun <I, O> rememberSystemPickerLauncher(
    contract: ActivityResultContract<I, O>,
    onResult: (O) -> Unit,
): SystemPickerLauncher<I> {
    val context = LocalContext.current
    val activity = remember(context) { context.findMainActivity() }
    val currentOnResult by rememberUpdatedState(onResult)
    val launcher = rememberLauncherForActivityResult(contract) { result ->
        activity?.systemPickerFinished()
        currentOnResult(result)
    }

    return remember(activity, launcher) {
        SystemPickerLauncher { input ->
            activity?.systemPickerStarted()
            try {
                launcher.launch(input)
            } catch (failure: Exception) {
                // A provider may be unavailable or the activity may already be tearing
                // down. Never leave the privacy lock permanently suppressed after a
                // failed launch.
                activity?.systemPickerFinished()
                throw failure
            }
        }
    }
}

private tailrec fun Context.findMainActivity(): MainActivity? = when (this) {
    is MainActivity -> this
    is ContextWrapper -> baseContext.findMainActivity()
    else -> null
}
