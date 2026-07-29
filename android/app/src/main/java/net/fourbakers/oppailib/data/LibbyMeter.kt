package net.fourbakers.oppailib.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** Fractional, session-scoped progression behind Libby's five visible tiers. */
object LibbyMeter {
    const val MAX = 5
    val MULTIPLIERS = listOf(.25f, .5f, 1f, 2f)

    private val _value = MutableStateFlow(1)
    val value: StateFlow<Int> = _value
    private var progress = 1.0

    private val _multiplier = MutableStateFlow(.5f)
    val multiplier: StateFlow<Float> = _multiplier

    fun setMultiplier(value: Float) { _multiplier.value = value.takeIf(MULTIPLIERS::contains) ?: .5f }

    /** Direct slider/model synchronization is immediate. */
    fun set(v: Int) {
        _value.value = v.coerceIn(1, MAX)
        progress = _value.value.toDouble()
    }

    /** Ordinary app events accumulate at the configured speed. */
    fun bump(delta: Int = 1) {
        val next = applyProgression(progress, delta)
        progress = next.first
        _value.value = next.second
    }

    fun applyProgression(from: Double, delta: Int): Pair<Double, Int> {
        val next = (from + delta * _multiplier.value).coerceIn(1.0, MAX.toDouble())
        return next to kotlin.math.floor(next + 1e-6).toInt().coerceIn(1, MAX)
    }

    fun tier(v: Int = _value.value): Int = v.coerceIn(1, MAX) - 1
}
