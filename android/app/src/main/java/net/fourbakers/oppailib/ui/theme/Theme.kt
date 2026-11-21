package net.fourbakers.oppailib.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em

/**
 * The darkroom: near-neutral ink and one coral-apricot accent, the web's palette
 * (web/src/theme.ts) in Material's names.
 *
 * The app used to follow the wallpaper by default (Material You), which on most phones
 * meant a lilac or green app beside a coral website, and tinted every surface so that no
 * thumbnail was shown on a neutral ground. The ink is neutral on purpose — a library of
 * photos is the colour on screen, and the accent is kept for where you are. Material You
 * is still there, as an opt-in in Settings, the way it is on the web.
 *
 * The scheme's "container" roles are drawn as the web's lit state (the accent at 15–24%
 * over the ink) rather than Material's brown fill, since every selected chip, nav item
 * and FAB reads them.
 */
private val DarkInk = darkColorScheme(
    primary = Color(0xFFFFAA8C),
    onPrimary = Color(0xFF561F0C),
    primaryContainer = Color(0xFF49332E),
    onPrimaryContainer = Color(0xFFFFCDBB),
    inversePrimary = Color(0xFFA23F22),
    secondary = Color(0xFFE2C3B9),
    onSecondary = Color(0xFF3B2D29),
    secondaryContainer = Color(0xFF332523),
    onSecondaryContainer = Color(0xFFFFCDBB),
    tertiary = Color(0xFFFF8FA3),
    onTertiary = Color(0xFF5C1126),
    tertiaryContainer = Color(0xFF4A2530),
    onTertiaryContainer = Color(0xFFFFD9DF),
    background = Color(0xFF0F0E10),
    onBackground = Color(0xFFF2EDEF),
    surface = Color(0xFF0F0E10),
    onSurface = Color(0xFFF2EDEF),
    surfaceVariant = Color(0xFF222024),
    onSurfaceVariant = Color(0xFFC9C1C6),
    // Elevation lightens toward the text colour, so a raised sheet is lighter ink and
    // never a tinted one.
    surfaceTint = Color(0xFFF2EDEF),
    inverseSurface = Color(0xFFF2EDEF),
    inverseOnSurface = Color(0xFF0F0E10),
    outline = Color(0xFF48444B),
    outlineVariant = Color(0xFF232125),
    scrim = Color(0xFF040305),
    surfaceBright = Color(0xFF2A282C),
    surfaceDim = Color(0xFF0F0E10),
    surfaceContainerLowest = Color(0xFF0B0A0C),
    surfaceContainerLow = Color(0xFF131214),
    surfaceContainer = Color(0xFF19181B),
    surfaceContainerHigh = Color(0xFF222024),
    surfaceContainerHighest = Color(0xFF2A282C),
)

private val LightInk = lightColorScheme(
    primary = Color(0xFFA23F22),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFE5CCC5),
    onPrimaryContainer = Color(0xFF3A1508),
    inversePrimary = Color(0xFFFFAA8C),
    secondary = Color(0xFF77574D),
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFEDDCD8),
    onSecondaryContainer = Color(0xFF6B2A16),
    tertiary = Color(0xFFC9184A),
    onTertiary = Color(0xFFFFFFFF),
    tertiaryContainer = Color(0xFFFFD9DF),
    onTertiaryContainer = Color(0xFF3F0016),
    background = Color(0xFFFAF8F8),
    onBackground = Color(0xFF1C1A1D),
    surface = Color(0xFFFAF8F8),
    onSurface = Color(0xFF1C1A1D),
    surfaceVariant = Color(0xFFE9E5E7),
    onSurfaceVariant = Color(0xFF4C464B),
    surfaceTint = Color(0xFF1C1A1D),
    inverseSurface = Color(0xFF1C1A1D),
    inverseOnSurface = Color(0xFFFAF8F8),
    outline = Color(0xFFB5AEB3),
    outlineVariant = Color(0xFFE6E1E3),
    scrim = Color(0xFF1C1418),
    surfaceBright = Color(0xFFFFFFFF),
    surfaceDim = Color(0xFFE2DDE0),
    surfaceContainerLowest = Color(0xFFFFFFFF),
    surfaceContainerLow = Color(0xFFF3F0F1),
    surfaceContainer = Color(0xFFF1EEEF),
    surfaceContainerHigh = Color(0xFFE9E5E7),
    surfaceContainerHighest = Color(0xFFE2DDE0),
)

/**
 * The darkroom's own names for what Material's scheme has no role for: the lit state,
 * the brighter accent the lit state's text uses, the favourite's pink, and the status
 * colours. Derived from the scheme, so they follow Material You when it is on.
 */
@Immutable
data class Ink(
    /** Where you are: the accent at 15% over the ink. */
    val selected: Color,
    /** A pressed or strongly lit state: the accent at 24%. */
    val selectedStrong: Color,
    /** The accent's lighter step, for text and icons on [selected]. */
    val primaryBright: Color,
    /** The sidebar's ink, a step off the page: bars, rails and sheets. */
    val nav: Color,
    val fav: Color,
    val success: Color,
    val warning: Color,
    /** The top bar over content that scrolls under it. */
    val glass: Color,
    val dark: Boolean,
)

private fun inkFor(c: ColorScheme, dark: Boolean) = Ink(
    selected = c.primary.copy(alpha = 0.15f).compositeOver(c.background),
    selectedStrong = c.primary.copy(alpha = 0.24f).compositeOver(c.background),
    primaryBright = if (dark) c.onPrimaryContainer else c.primary,
    nav = c.surfaceContainerLow,
    fav = if (dark) Color(0xFFFF8FA3) else Color(0xFFC9184A),
    success = if (dark) Color(0xFF7DD3A8) else Color(0xFF1F7A4D),
    warning = if (dark) Color(0xFFF2C266) else Color(0xFF8A5A00),
    glass = c.background.copy(alpha = 0.86f),
    dark = dark,
)

val LocalInk = staticCompositionLocalOf { inkFor(DarkInk, true) }

/**
 * Device-level appearance, read by the theme and written by Settings. Kept as state so a
 * change in Settings redraws the app without a restart; seeded from the stored prefs
 * once at start-up by MainActivity.
 */
object Appearance {
    /** Follow the wallpaper's colours (Android 12+) instead of the darkroom's. */
    var materialYou by mutableStateOf(false)
    /** Safe view: explicit tiles veiled and Libby off screen. See SafeView.kt. */
    var safe by mutableStateOf(false)
}

private val DarkroomShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

/** Material's type scale with the web's heavier, tighter titles. */
private val DarkroomType = Typography().let { t ->
    t.copy(
        headlineSmall = t.headlineSmall.copy(fontWeight = FontWeight.SemiBold, letterSpacing = (-0.01).em),
        titleLarge = t.titleLarge.copy(fontWeight = FontWeight.SemiBold, letterSpacing = (-0.01).em),
        titleMedium = t.titleMedium.copy(fontWeight = FontWeight.SemiBold),
        titleSmall = t.titleSmall.copy(fontWeight = FontWeight.SemiBold),
        labelLarge = t.labelLarge.copy(fontWeight = FontWeight.SemiBold),
    )
}

@Composable
fun OppaiTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val context = LocalContext.current
    val colors = when {
        Appearance.materialYou && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        darkTheme -> DarkInk
        else -> LightInk
    }
    CompositionLocalProvider(LocalInk provides inkFor(colors, darkTheme)) {
        MaterialTheme(colorScheme = colors, shapes = DarkroomShapes, typography = DarkroomType, content = content)
    }
}
