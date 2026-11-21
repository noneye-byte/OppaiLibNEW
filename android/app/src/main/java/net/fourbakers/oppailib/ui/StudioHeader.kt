package net.fourbakers.oppailib.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FaceRetouchingNatural
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.ModelTraining
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.TravelExplore
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import net.fourbakers.oppailib.ui.theme.LocalInk

private data class StudioMode(val id: String, val label: String, val icon: ImageVector)

private val MODES = listOf(
    StudioMode("image", "Image", Icons.Filled.Image),
    StudioMode("video", "Video", Icons.Filled.Movie),
    StudioMode("sprites", "Sprites", Icons.Filled.FaceRetouchingNatural),
)

/**
 * The studios' header: Image, Video and Sprites behind one switch, as on the web, and the
 * pages every studio shares — the gallery, Civitai and training — as the buttons beside
 * it. A dot on a mode says something is drawing there; Video's counts its clips.
 */
@Composable
internal fun StudioHeader(
    mode: String,
    onMode: (String) -> Unit,
    page: String?,
    onPage: (String?) -> Unit,
    civitai: Boolean,
    busy: Boolean,
    clipsBusy: Int,
) {
    val c = MaterialTheme.colorScheme
    val ink = LocalInk.current
    Column(Modifier.fillMaxWidth().background(c.background)) {
        Row(
            Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars).height(60.dp).padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                Modifier.clip(RoundedCornerShape(12.dp)).background(c.surfaceContainer).padding(3.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                MODES.forEach { m ->
                    val on = mode == m.id && page == null
                    Row(
                        Modifier.height(36.dp).clip(RoundedCornerShape(9.dp))
                            .background(if (on) ink.selected else Color.Transparent)
                            .clickable { onMode(m.id) }.padding(horizontal = 11.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(m.icon, contentDescription = null, tint = if (on) ink.primaryBright else c.onSurfaceVariant, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(
                            m.label,
                            style = MaterialTheme.typography.labelLarge.copy(fontSize = 13.5.sp, fontWeight = if (on) FontWeight.SemiBold else FontWeight.Medium),
                            color = if (on) c.onSurface else c.onSurfaceVariant,
                        )
                        val working = when (m.id) { "video" -> clipsBusy > 0; "image" -> busy && mode != "sprites"; else -> busy && mode == "sprites" }
                        if (m.id == "video" && clipsBusy > 0) {
                            Spacer(Modifier.width(6.dp))
                            Box(Modifier.size(18.dp).clip(CircleShape).background(c.primary), Alignment.Center) {
                                Text("$clipsBusy", style = MaterialTheme.typography.labelSmall, color = c.onPrimary)
                            }
                        } else if (working) {
                            Spacer(Modifier.width(6.dp))
                            Box(Modifier.size(7.dp).clip(CircleShape).background(c.primary))
                        }
                    }
                }
            }
            Spacer(Modifier.weight(1f))
        }
        Row(
            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(start = 12.dp, end = 12.dp, bottom = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            fun toggle(id: String) = onPage(if (page == id) null else id)
            ToolButton(Icons.Filled.PhotoLibrary, "Gallery", { toggle("gallery") }, label = "Gallery", on = page == "gallery")
            if (civitai) ToolButton(Icons.Filled.TravelExplore, "Civitai", { toggle("civitai") }, label = "Civitai", on = page == "civitai")
            if (mode != "video") ToolButton(Icons.Filled.ModelTraining, "Train", { toggle("train") }, label = "Train", on = page == "train")
            GpuSwitchChip()
        }
        Hairline()
    }
}
