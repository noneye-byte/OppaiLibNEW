package net.fourbakers.oppailib.data

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonObject

/**
 * text-generation-webui's Model tab, as arguments — the phone's copy of the web
 * client's LOADER_FIELDS, so a model can be loaded from here with the settings it needs
 * rather than whatever the backend last had.
 *
 * [keys] are the backend's own argument names, the current one first. Where a name
 * moved between releases (n_ctx became ctx_size) every spelling is sent and the backend
 * keeps the one it knows. [loaders] limits a field to the loaders it means anything
 * for; null means every loader.
 */
data class LoaderField(
    val label: String,
    val keys: List<String>,
    val kind: Kind,
    val hint: String = "",
    val options: List<String> = emptyList(),
    val loaders: List<String>? = null,
) {
    enum class Kind { NUMBER, TEXT, CHECK, SELECT }

    val key: String get() = keys.first()
}

const val LOADER_KEY = "loader"

private val LLAMA = listOf("llama.cpp")
private val EXLLAMA = listOf("ExLlamav3_HF", "ExLlamav3", "ExLlamav2_HF", "ExLlamav2")
private val TRANSFORMERS = listOf("Transformers", "HQQ")

/** Ordered as the WebUI lays them out. Keep in step with web/src/views/chat.ts. */
val LOADER_FIELDS = listOf(
    LoaderField("Context length", listOf("ctx_size", "n_ctx", "max_seq_len"), LoaderField.Kind.NUMBER, hint = "model default"),
    LoaderField("GPU layers", listOf("gpu_layers", "n_gpu_layers"), LoaderField.Kind.NUMBER, hint = "0 = CPU only", loaders = LLAMA),
    LoaderField("Batch size", listOf("batch_size", "n_batch"), LoaderField.Kind.NUMBER, loaders = LLAMA),
    LoaderField("Threads", listOf("threads"), LoaderField.Kind.NUMBER, loaders = LLAMA),
    LoaderField("Batch threads", listOf("threads_batch"), LoaderField.Kind.NUMBER, loaders = LLAMA),
    LoaderField("KV cache type", listOf("cache_type"), LoaderField.Kind.SELECT, hint = "q8_0/q4_0 for llama.cpp; q8/q6/q4 for ExLlama", options = listOf("fp16", "q8_0", "q4_0", "q8", "q6", "q4")),
    LoaderField("Tensor split", listOf("tensor_split"), LoaderField.Kind.TEXT, hint = "e.g. 20,10", loaders = LLAMA),
    LoaderField("GPU split (GB)", listOf("gpu_split"), LoaderField.Kind.TEXT, hint = "e.g. 20,7", loaders = EXLLAMA),
    LoaderField("RoPE base", listOf("rope_freq_base"), LoaderField.Kind.NUMBER, hint = "model default"),
    LoaderField("Positional compression", listOf("compress_pos_emb"), LoaderField.Kind.NUMBER, hint = "1"),
    LoaderField("Experts per token", listOf("num_experts_per_token"), LoaderField.Kind.NUMBER, hint = "model default", loaders = EXLLAMA),
    LoaderField("Compute dtype", listOf("compute_dtype"), LoaderField.Kind.SELECT, options = listOf("float16", "bfloat16", "float32"), loaders = TRANSFORMERS),
    LoaderField("Quant type", listOf("quant_type"), LoaderField.Kind.SELECT, options = listOf("nf4", "fp4"), loaders = TRANSFORMERS),
    LoaderField("Flash attention", listOf("flash_attn"), LoaderField.Kind.CHECK),
    LoaderField("mlock", listOf("mlock"), LoaderField.Kind.CHECK, hint = "keep in RAM", loaders = LLAMA),
    LoaderField("No mmap", listOf("no_mmap"), LoaderField.Kind.CHECK, loaders = LLAMA),
    LoaderField("NUMA", listOf("numa"), LoaderField.Kind.CHECK, loaders = LLAMA),
    LoaderField("CPU only", listOf("cpu"), LoaderField.Kind.CHECK),
    LoaderField("Load in 4-bit", listOf("load_in_4bit"), LoaderField.Kind.CHECK, loaders = TRANSFORMERS),
    LoaderField("Load in 8-bit", listOf("load_in_8bit"), LoaderField.Kind.CHECK, loaders = TRANSFORMERS),
    LoaderField("bf16", listOf("bf16"), LoaderField.Kind.CHECK, loaders = TRANSFORMERS),
    LoaderField("Auto devices", listOf("auto_devices"), LoaderField.Kind.CHECK, loaders = TRANSFORMERS),
)

/** The fields worth asking about for [loader]; all of them while the backend decides. */
fun loaderFieldsFor(loader: String): List<LoaderField> =
    LOADER_FIELDS.filter { it.loaders == null || loader.isEmpty() || loader in it.loaders }

/**
 * The form as typed: each field's text by its first key (a ticked box is "true"), the
 * loader, and the two JSON boxes for everything the form doesn't name.
 */
data class LoaderForm(
    val values: Map<String, String> = emptyMap(),
    val extra: String = "",
    val settings: String = "",
) {
    val loader: String get() = values[LOADER_KEY].orEmpty()

    fun with(key: String, raw: String): LoaderForm =
        copy(values = if (raw.isBlank() || raw == "false") values - key else values + (key to raw))

    /** Whether anything is set, i.e. whether a load sends more than the backend's defaults. */
    val isSet: Boolean get() = values.isNotEmpty() || extra.isNotBlank() || settings.isNotBlank()
}

private val pretty = Json { prettyPrint = true }

/**
 * Starts the form from what [model] was last loaded with, as the server remembers it.
 * A model never loaded from a client starts blank, which means "the backend's defaults".
 * Remembered arguments the form has no field for go into the extra JSON rather than
 * being dropped, so a load from the phone doesn't quietly lose one the web set.
 */
fun seedLoaderForm(remembered: TextgenLoad?): LoaderForm {
    if (remembered == null) return LoaderForm()
    val known = LOADER_FIELDS.flatMap { it.keys }.toSet() + LOADER_KEY
    val firstKey = LOADER_FIELDS.flatMap { f -> f.keys.map { it to f.key } }.toMap() + (LOADER_KEY to LOADER_KEY)
    val values = mutableMapOf<String, String>()
    val extra = mutableMapOf<String, JsonElement>()
    for ((key, value) in remembered.args) {
        if (key !in known) { extra[key] = value; continue }
        val text = (value as? JsonPrimitive)?.content ?: continue
        if (text == "false" || text.isBlank()) continue
        values[firstKey.getValue(key)] = text
    }
    return LoaderForm(
        values = values,
        extra = if (extra.isEmpty()) "" else pretty.encodeToString(JsonObject.serializer(), JsonObject(extra)),
        settings = if (remembered.settings.isEmpty()) "" else pretty.encodeToString(JsonObject.serializer(), remembered.settings),
    )
}

/**
 * The arguments and settings a load sends: the form, with the extra JSON laid over it.
 * Throws when either JSON box isn't an object, which the caller turns into a message
 * rather than a load with half the settings missing.
 */
fun composeLoadArgs(form: LoaderForm): Pair<JsonObject, JsonObject> {
    val args = mutableMapOf<String, JsonElement>()
    form.values[LOADER_KEY]?.takeIf { it.isNotBlank() }?.let { args[LOADER_KEY] = JsonPrimitive(it) }
    for (field in LOADER_FIELDS) {
        val raw = form.values[field.key]?.trim().orEmpty()
        if (raw.isEmpty()) continue
        val value = when (field.kind) {
            LoaderField.Kind.CHECK -> if (JsonPrimitive(raw).booleanOrNull == true) JsonPrimitive(true) else continue
            LoaderField.Kind.NUMBER -> numberOrNull(raw) ?: continue
            else -> JsonPrimitive(raw)
        }
        for (key in field.keys) args[key] = value
    }
    if (form.extra.isNotBlank()) args.putAll(Json.parseToJsonElement(form.extra).jsonObject)
    val settings = if (form.settings.isNotBlank()) Json.parseToJsonElement(form.settings).jsonObject else JsonObject(emptyMap())
    return JsonObject(args) to settings
}

/** A whole number goes as one — "8192", not "8192.0", which some loaders refuse. */
private fun numberOrNull(raw: String): JsonPrimitive? {
    raw.toLongOrNull()?.let { return JsonPrimitive(it) }
    return raw.toDoubleOrNull()?.let { JsonPrimitive(it) }
}
