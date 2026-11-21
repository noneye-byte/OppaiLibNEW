package net.fourbakers.oppailib.ui

import android.os.Build
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import net.fourbakers.oppailib.data.MediaTag
import net.fourbakers.oppailib.ui.theme.Appearance
import net.fourbakers.oppailib.ui.theme.LocalInk

/*
 * The darkroom's parts, for Compose: what web/src/views/page-styles.ts is to the web's
 * shadow roots. Each screen used to draw its own bar, its own chips and its own idea of
 * "on"; these are the library's, so a screen built from them reads as the same app.
 */

/**
 * A screen's 64dp bar: an optional way back, the title with its count beside it, and the
 * screen's tools on the right. It pads for the status bar itself, since the places draw
 * edge to edge.
 */
@Composable
fun PageTop(
    title: String,
    modifier: Modifier = Modifier,
    count: String? = null,
    navigation: (@Composable () -> Unit)? = null,
    insets: Boolean = true,
    actions: @Composable RowScope.() -> Unit = {},
) {
    Column0(modifier.fillMaxWidth().background(MaterialTheme.colorScheme.background)) {
        Row(
            Modifier.fillMaxWidth().then(if (insets) Modifier.windowInsetsPadding(WindowInsets.statusBars) else Modifier)
                .height(64.dp).padding(start = if (navigation != null) 4.dp else 16.dp, end = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (navigation != null) {
                navigation()
                Spacer(Modifier.width(4.dp))
            }
            Text(
                title,
                style = MaterialTheme.typography.titleLarge.copy(fontSize = 20.sp),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f, fill = false),
            )
            if (!count.isNullOrEmpty()) {
                Text(
                    count,
                    style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Medium),
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f),
                    maxLines = 1,
                    modifier = Modifier.padding(start = 10.dp),
                )
            }
            Spacer(Modifier.weight(1f))
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically, content = actions)
        }
    }
}

/** A plain column, named so PageTop's layout reads in order. */
@Composable
private fun Column0(modifier: Modifier, content: @Composable () -> Unit) {
    androidx.compose.foundation.layout.Column(modifier) { content() }
}

/**
 * The shell's outlined tool: squared, quiet until pointed at, lit when [on]. With a
 * [label] it is a pill with words; without, a 40dp square.
 */
@Composable
fun ToolButton(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    on: Boolean = false,
    bare: Boolean = false,
    enabled: Boolean = true,
    tint: Color? = null,
) {
    val ink = LocalInk.current
    val c = MaterialTheme.colorScheme
    val shape = RoundedCornerShape(10.dp)
    Row(
        modifier
            .height(40.dp)
            .then(if (label == null) Modifier.width(40.dp) else Modifier)
            .clip(shape)
            .background(if (on) ink.selected else Color.Transparent)
            .then(if (bare || on) Modifier else Modifier.border(1.dp, if (ink.dark) Color(0xFF3A373D) else c.outline, shape))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = if (label == null) 0.dp else 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        val color = when {
            !enabled -> c.onSurface.copy(alpha = 0.38f)
            tint != null -> tint
            on -> ink.primaryBright
            else -> c.onSurfaceVariant
        }
        Icon(icon, contentDescription = if (label == null) contentDescription else null, tint = color, modifier = Modifier.size(20.dp))
        if (label != null) {
            Spacer(Modifier.width(6.dp))
            Text(label, style = MaterialTheme.typography.labelLarge, color = if (on) ink.primaryBright else c.onSurface, maxLines = 1)
        }
    }
}

/**
 * The library's chip. Off, it is a quiet outlined pill; on, it is inverted — the text's
 * colour as its fill — which is how the web says "this one" without spending the accent.
 */
@Composable
fun InkChip(
    label: String,
    on: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    small: Boolean = false,
    count: String? = null,
) {
    val c = MaterialTheme.colorScheme
    val ink = LocalInk.current
    val shape = RoundedCornerShape(999.dp)
    Row(
        modifier
            .height(if (small) 30.dp else 34.dp)
            .clip(shape)
            .background(if (on) c.onSurface else c.surfaceContainer)
            .then(if (on) Modifier else Modifier.border(1.dp, if (ink.dark) Color(0xFF2C2A2E) else c.outlineVariant, shape))
            .clickable(onClick = onClick)
            .padding(horizontal = if (small) 11.dp else 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        val ink2 = if (on) c.surface else c.onSurfaceVariant
        if (icon != null) {
            Icon(icon, contentDescription = null, tint = ink2, modifier = Modifier.size(if (small) 15.dp else 17.dp))
            Spacer(Modifier.width(6.dp))
        }
        Text(
            label,
            style = MaterialTheme.typography.labelLarge.copy(fontSize = if (small) 12.5.sp else 13.5.sp, fontWeight = if (on) FontWeight.SemiBold else FontWeight.Medium),
            color = if (on) c.surface else c.onSurface,
            maxLines = 1,
        )
        if (count != null) {
            Spacer(Modifier.width(6.dp))
            Text(count, style = MaterialTheme.typography.labelMedium, color = ink2.copy(alpha = 0.8f), maxLines = 1)
        }
    }
}

/** A row of [InkChip]s that scrolls sideways. */
@Composable
fun InkChipRow(modifier: Modifier = Modifier, padding: PaddingValues = PaddingValues(horizontal = 16.dp), content: @Composable RowScope.() -> Unit) {
    Row(
        modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(padding),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
        content = content,
    )
}

/**
 * The search box: the library's, a rounded field on the raised ink whose edge takes the
 * accent while it has the caret.
 */
@Composable
fun SearchBox(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    focusRequester: FocusRequester? = null,
    onSearch: (() -> Unit)? = null,
    trailing: (@Composable () -> Unit)? = null,
) {
    val c = MaterialTheme.colorScheme
    val ink = LocalInk.current
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    val shape = RoundedCornerShape(12.dp)
    Row(
        modifier.height(44.dp).clip(shape)
            .background(if (focused) c.surfaceContainerHigh else c.surfaceContainer)
            .border(1.dp, if (focused) c.primary.copy(alpha = 0.55f) else if (ink.dark) Color(0xFF2C2A2E) else c.outlineVariant, shape)
            .padding(start = 12.dp, end = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Filled.Search, contentDescription = null, tint = c.onSurfaceVariant.copy(alpha = 0.8f), modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(10.dp))
        Box(Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
            if (value.isEmpty()) {
                Text(placeholder, style = MaterialTheme.typography.bodyLarge.copy(fontSize = 15.sp), color = c.onSurfaceVariant.copy(alpha = 0.7f), maxLines = 1)
            }
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                singleLine = true,
                textStyle = MaterialTheme.typography.bodyLarge.copy(fontSize = 15.sp, color = c.onSurface),
                cursorBrush = SolidColor(c.primary),
                interactionSource = interaction,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { onSearch?.invoke() }),
                modifier = Modifier.fillMaxWidth().then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier),
            )
        }
        if (value.isNotEmpty()) {
            Box(
                Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).clickable { onValueChange("") },
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Filled.Close, contentDescription = "Clear the search", tint = c.onSurfaceVariant, modifier = Modifier.size(18.dp)) }
        }
        trailing?.invoke()
    }
}

/** The one coral button a screen gets: what it is for. */
@Composable
fun PrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    enabled: Boolean = true,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = 44.dp),
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary),
        contentPadding = PaddingValues(horizontal = 18.dp),
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
        }
        Text(text, fontWeight = FontWeight.SemiBold)
    }
}

/**
 * The web's `.seg`: two to four choices in one rounded track, the chosen one raised.
 * For a switch between views of the same thing (Pictures / Video, The card / Greetings).
 */
@Composable
fun <T> Segmented(
    options: List<Pair<T, String>>,
    selected: T,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
    icons: Map<T, ImageVector> = emptyMap(),
) {
    val c = MaterialTheme.colorScheme
    val ink = LocalInk.current
    Row(
        modifier.height(38.dp).clip(RoundedCornerShape(11.dp)).background(c.surfaceContainer)
            .border(1.dp, if (ink.dark) Color(0xFF2C2A2E) else c.outlineVariant, RoundedCornerShape(11.dp)).padding(3.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        options.forEach { (value, label) ->
            val on = value == selected
            Row(
                Modifier.fillMaxHeightSafe().clip(RoundedCornerShape(8.dp))
                    .background(if (on) c.surfaceContainerHighest else Color.Transparent)
                    .clickable { onSelect(value) }.padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                icons[value]?.let {
                    Icon(it, contentDescription = null, tint = if (on) ink.primaryBright else c.onSurfaceVariant, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                }
                Text(
                    label,
                    style = MaterialTheme.typography.labelLarge.copy(fontSize = 13.sp, fontWeight = if (on) FontWeight.SemiBold else FontWeight.Medium),
                    color = if (on) c.onSurface else c.onSurfaceVariant,
                    maxLines = 1,
                )
            }
        }
    }
}

private fun Modifier.fillMaxHeightSafe() = this.then(Modifier.height(32.dp))

/** A section's small capitals heading: "LIBRARY", "FILES", "TRIGGER WORDS". */
@Composable
fun Kicker(text: String, modifier: Modifier = Modifier, color: Color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f)) {
    Text(
        text.uppercase(),
        style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.08.em),
        color = color,
        modifier = modifier,
    )
}

/**
 * A section heading with an optional line under it and an action on the right: Home's
 * rows, the model page's sections.
 */
@Composable
fun SectionHead(
    title: String,
    modifier: Modifier = Modifier,
    sub: String? = null,
    leading: (@Composable () -> Unit)? = null,
    action: (@Composable () -> Unit)? = null,
) {
    Row(modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        leading?.let { it(); Spacer(Modifier.width(10.dp)) }
        androidx.compose.foundation.layout.Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium.copy(fontSize = 17.sp))
            if (!sub.isNullOrEmpty()) {
                Text(sub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        action?.invoke()
    }
}

/** A card on the raised ink with the darkroom's hairline: the panel every side card is. */
@Composable
fun InkPanel(modifier: Modifier = Modifier, padding: PaddingValues = PaddingValues(16.dp), content: @Composable () -> Unit) {
    val ink = LocalInk.current
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceContainer,
        border = BorderStroke(1.dp, if (ink.dark) Color(0xFF232125) else MaterialTheme.colorScheme.outlineVariant),
    ) {
        Box(Modifier.padding(padding)) { content() }
    }
}

/**
 * A place in a list — a nav row, a settings section, a sheet item — lit when it is where
 * you are, with the accent's mark at its leading edge.
 */
@Composable
fun LitRow(
    icon: ImageVector?,
    label: String,
    on: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    note: String? = null,
    danger: Boolean = false,
) {
    val c = MaterialTheme.colorScheme
    val ink = LocalInk.current
    Row(
        modifier.fillMaxWidth().heightIn(min = 48.dp).clip(RoundedCornerShape(10.dp))
            .background(if (on) ink.selected else Color.Transparent)
            .drawBehind {
                if (on) drawRoundRect(
                    color = c.primary,
                    topLeft = Offset(0f, size.height * 0.25f),
                    size = Size(3.dp.toPx(), size.height * 0.5f),
                    cornerRadius = CornerRadius(3.dp.toPx()),
                )
            }
            .clickable(onClick = onClick).padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, tint = when {
                danger -> c.error
                on -> c.primary
                else -> c.onSurfaceVariant
            }, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(16.dp))
        }
        Text(
            label,
            style = MaterialTheme.typography.bodyLarge.copy(fontWeight = if (on) FontWeight.SemiBold else FontWeight.Normal),
            color = if (danger) c.error else c.onSurface,
            modifier = Modifier.weight(1f),
        )
        if (note != null) Text(note, style = MaterialTheme.typography.labelMedium, color = c.onSurfaceVariant)
    }
}

/** The hairline between a bar and what scrolls under it. */
@Composable
fun Hairline(modifier: Modifier = Modifier) {
    HorizontalDivider(modifier, thickness = 1.dp, color = if (LocalInk.current.dark) Color(0xFF232125) else MaterialTheme.colorScheme.outlineVariant)
}

/** A short line in place of content that is not there: no results, not set up. */
@Composable
fun EmptyNote(text: String, modifier: Modifier = Modifier, icon: ImageVector? = null, action: (@Composable () -> Unit)? = null) {
    androidx.compose.foundation.layout.Column(
        modifier.fillMaxWidth().padding(horizontal = 32.dp, vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (icon != null) {
            Box(
                Modifier.size(56.dp).clip(RoundedCornerShape(16.dp)).background(LocalInk.current.selected),
                contentAlignment = Alignment.Center,
            ) { Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(28.dp)) }
        }
        Text(text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        action?.invoke()
    }
}

// ── safe view ────────────────────────────────────────────────────────────────

/** The ratings a veiled tile hides. "sensitive" is left visible on purpose, as on the
 *  web (safe-mode.ts): blurring half the library makes the toggle useless. */
private val VEILED = setOf("questionable", "explicit", "rating:questionable", "rating:explicit", "q", "e")

/** Whether an item's tags rate it as something to veil. Untagged items are shown. */
fun isExplicit(tags: List<MediaTag>?): Boolean {
    if (tags.isNullOrEmpty()) return false
    return tags.any { t ->
        val name = t.name.lowercase()
        if (t.category == "rating") name in VEILED else name in VEILED && name.startsWith("rating:")
    }
}

/** Whether a tile for these tags is veiled right now. */
fun veiled(tags: List<MediaTag>?): Boolean = Appearance.safe && isExplicit(tags)

/**
 * The veil over a tile's picture. A blur where the platform has one (Android 12+), and
 * a solid scrim below it, which hides as well and only looks plainer.
 */
fun Modifier.veil(on: Boolean): Modifier =
    if (!on) this else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) this.blur(28.dp) else this

/** Drawn over a veiled tile: the scrim for old phones and the glyph that says why. */
@Composable
fun BoxScope.VeilMark(on: Boolean, iconSize: Dp = 28.dp) {
    if (!on) return
    Box(
        Modifier.matchParentSize().background(
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) Color(0x55000000) else Color(0xFF1A181B),
        ),
        contentAlignment = Alignment.Center,
    ) {
        Icon(Icons.Filled.VisibilityOff, contentDescription = "Hidden by safe view", tint = Color.White.copy(alpha = 0.85f), modifier = Modifier.size(iconSize))
    }
}

/** A small badge on a tile's corner: a duration, a kind, "Android". */
@Composable
fun TileBadge(text: String, modifier: Modifier = Modifier, icon: ImageVector? = null, color: Color = Color(0xB3000000)) {
    Row(
        modifier.clip(RoundedCornerShape(6.dp)).background(color).padding(horizontal = 6.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(12.dp))
            Spacer(Modifier.width(3.dp))
        }
        Text(text, style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold), color = Color.White, maxLines = 1)
    }
}

/** A round avatar of initials, for accounts and posters without a picture. */
@Composable
fun Initials(name: String, modifier: Modifier = Modifier, size: Dp = 36.dp) {
    Box(
        modifier.size(size).clip(CircleShape).background(LocalInk.current.selectedStrong),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            name.take(2).uppercase().ifEmpty { "?" },
            style = MaterialTheme.typography.labelLarge.copy(fontSize = (size.value * 0.36f).sp),
            color = LocalInk.current.primaryBright,
        )
    }
}

/** Fills its box: for a [Box] child that should cover the parent. */
fun Modifier.cover() = this.fillMaxSize()
