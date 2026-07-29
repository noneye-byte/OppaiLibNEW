package net.fourbakers.oppailib.ui

/**
 * The playback speeds we offer, shared by the viewer's speed button and the
 * settings screen's stepper so the two can't drift apart.
 */
internal val SPEEDS = floatArrayOf(0.5f, 0.75f, 1f, 1.25f, 1.5f, 2f)

/** The next speed up the ladder, wrapping back to the slowest past the top. */
internal fun nextSpeed(current: Float): Float {
    val i = SPEEDS.indexOfFirst { it > current + 0.01f }
    return if (i < 0) SPEEDS.first() else SPEEDS[i]
}

/** Moves [delta] rungs along the ladder, clamped at both ends rather than wrapping. */
internal fun stepSpeed(current: Float, delta: Int): Float {
    val nearest = SPEEDS.indices.minBy { kotlin.math.abs(SPEEDS[it] - current) }
    return SPEEDS[(nearest + delta).coerceIn(0, SPEEDS.lastIndex)]
}

/** "1×", "1.5×" — no trailing zeros. */
internal fun formatSpeedLabel(speed: Float): String =
    if (speed % 1f == 0f) "${speed.toInt()}×" else "${speed.toString().trimEnd('0').trimEnd('.')}×"
