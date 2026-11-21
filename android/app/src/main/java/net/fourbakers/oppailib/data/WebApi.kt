package net.fourbakers.oppailib.data

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * The endpoints the phone took up when it was brought level with the web: Home's shelves,
 * collections, where you were in a video and the moments you marked in it, a picture's
 * recipe. They live beside [ApiService] rather than in it only to keep that file to what
 * it has always held; both are built on the same client (Repository.rebuild).
 */
interface WebApi {
    // ── Home ─────────────────────────────────────────────────────────────

    /** The library's shape without its rows: Home's counts. */
    @GET("api/media/stats")
    suspend fun libraryStats(): LibraryStats

    @GET("api/tags/top")
    suspend fun topTags(@Query("kind") kind: String? = null, @Query("limit") limit: Int = 12): TagCounts

    /** Home's Libby Suggested row. [seen] is what this phone has opened, which only it knows. */
    @GET("api/media/suggested")
    suspend fun suggested(@Query("seen") seen: String? = null): SuggestedMedia

    /** What to carry on with: items left part-way through, most recent first. */
    @GET("api/resume")
    suspend fun resumeShelf(): ResumeShelf

    // ── where you were ───────────────────────────────────────────────────

    /** 404 when there is no saved position. */
    @GET("api/media/{id}/progress")
    suspend fun progress(@Path("id") id: Long): MediaProgress

    @PUT("api/media/{id}/progress")
    suspend fun setProgress(@Path("id") id: Long, @Body body: ProgressRequest)

    @DELETE("api/media/{id}/progress")
    suspend fun clearProgress(@Path("id") id: Long)

    // ── moments ──────────────────────────────────────────────────────────

    @GET("api/media/{id}/bookmarks")
    suspend fun bookmarks(@Path("id") id: Long): Bookmarks

    @POST("api/media/{id}/bookmarks")
    suspend fun addBookmark(@Path("id") id: Long, @Body body: BookmarkRequest): Bookmark

    @PATCH("api/bookmarks/{id}")
    suspend fun relabelBookmark(@Path("id") id: Long, @Body body: BookmarkRequest): Bookmark

    @DELETE("api/bookmarks/{id}")
    suspend fun deleteBookmark(@Path("id") id: Long)

    /** The latest marks across the library, newest first, titled. */
    @GET("api/bookmarks")
    suspend fun recentBookmarks(@Query("limit") limit: Int = 30): Bookmarks

    // ── collections ──────────────────────────────────────────────────────

    @GET("api/collections")
    suspend fun collections(): Collections

    @POST("api/collections")
    suspend fun createCollection(@Body body: CollectionName): MediaCollection

    @PATCH("api/collections/{id}")
    suspend fun renameCollection(@Path("id") id: Long, @Body body: CollectionName)

    @DELETE("api/collections/{id}")
    suspend fun deleteCollection(@Path("id") id: Long)

    @GET("api/collections/{id}/items")
    suspend fun collectionItems(@Path("id") id: Long, @Query("limit") limit: Int = 60, @Query("offset") offset: Int = 0): CollectionItems

    @POST("api/collections/{id}/items")
    suspend fun addToCollection(@Path("id") id: Long, @Body body: CollectionMediaIds): CollectionAdded

    @DELETE("api/collections/{id}/items/{media}")
    suspend fun removeFromCollection(@Path("id") id: Long, @Path("media") media: Long)

    @PUT("api/collections/{id}/order")
    suspend fun reorderCollection(@Path("id") id: Long, @Body body: CollectionMediaIds)

    /** The collections an item is in. */
    @GET("api/media/{id}/collections")
    suspend fun collectionsOf(@Path("id") id: Long): Collections

    // ── a picture's recipe ───────────────────────────────────────────────

    /** What a studio-made picture was made with, kept when it was saved. */
    @GET("api/media/{id}/generation")
    suspend fun mediaGeneration(@Path("id") id: Long): MediaGeneration

    // ── Civitai, browsed the way the site is ─────────────────────────────

    /**
     * A comment section — a model's discussion, a post's, or one picture's — in reading
     * order: each comment, then the replies the page opened. Needs the Civitai key; with
     * none the server answers 409 with a sentence saying so (never a 401, which would
     * sign the phone out).
     */
    @GET("api/imagegen/civitai/comments")
    suspend fun civitaiThread(
        @Query("entity") entity: String,
        @Query("id") id: Long,
        @Query("sort") sort: String? = null,
        @Query("cursor") cursor: String? = null,
    ): CivitaiCommentsResponse

    /** The install log: InvokeAI's or A1111's downloads, or with target "comfy" ComfyUI's. */
    @GET("api/imagegen/civitai/installs")
    suspend fun civitaiInstalls(@Query("target") target: String? = null): InstallJobsResponse

    // ── chub.ai, read before it is added ─────────────────────────────────

    /** A card's page: its notes, fields, greetings, lorebook and expression pack. */
    @GET("api/chub/details")
    suspend fun chubDetails(@Query("path") path: String): ChubDetails

    /** The pictures people posted to a card's gallery on chub, 24 a page, by its numeric id. */
    @GET("api/chub/gallery")
    suspend fun chubGallery(@Query("id") id: Long, @Query("page") page: Int = 1): ChubGalleryPage

    // ── chat ─────────────────────────────────────────────────────────────

    /** Stops the reply the model is writing; the turn returns what it had. */
    @POST("api/chat/stop")
    suspend fun stopChat(): ChatStopped

    /** Counts tokens with the loaded model's own tokenizer, or estimates. */
    @POST("api/chat/tokens")
    suspend fun countTokens(@Body body: TokenCountRequest): TokenCount

    /** Summarises the older part of a conversation into its notes; the caller drops the
     *  messages the summary stands for. Minutes on a slow model. */
    @POST("api/chat/compress")
    suspend fun compressChat(@Body body: CompressRequest): CompressResult

    /** One character's gallery as a zip with a manifest of tags and recipes: "hers",
     *  "others" or "all". Decrypted by the server straight into the response. */
    @retrofit2.http.Streaming
    @GET("api/chat/images/export")
    suspend fun chatImagesExport(@Query("character") character: String, @Query("shelf") shelf: String): okhttp3.ResponseBody

    /** A zip of the studio's pictures and clips with their parameters written in and
     *  beside them, for Civitai: the names given, or a whole board. */
    @retrofit2.http.Streaming
    @GET("api/imagegen/gallery/export")
    suspend fun galleryExport(@Query("names") names: String? = null, @Query("board") board: String? = null): okhttp3.ResponseBody

    // ── her speaking first ───────────────────────────────────────────────

    @GET("api/libby/auto")
    suspend fun libbyAuto(): LibbyAutoState

    @PUT("api/libby/auto")
    suspend fun saveLibbyAuto(@Body body: LibbyAutoSettings): LibbyAutoSaved

    /** Asks whether she may start something now. Changes nothing. */
    @POST("api/libby/auto/check")
    suspend fun libbyAutoCheck(@Body body: AutoTrigger): LibbyAutoDecision

    /** Tells the server she did speak first, for the back-off and the log. */
    @POST("api/libby/auto/sent")
    suspend fun libbyAutoSent(@Body body: AutoTrigger)

    /** You answered: her back-off resets. */
    @POST("api/libby/auto/answered")
    suspend fun libbyAutoAnswered()

    /** Anything she has been meaning to say that the server noticed on its own. */
    @GET("api/libby/auto/pending")
    suspend fun libbyAutoPending(): LibbyAutoPending

    // ── her mind ─────────────────────────────────────────────────────────

    @GET("api/libby/wants")
    suspend fun libbyWants(): LibbyWants

    @DELETE("api/libby/wants")
    suspend fun clearLibbyWants()

    @DELETE("api/libby/wants/{id}")
    suspend fun forgetLibbyWant(@Path("id") id: String)

    @GET("api/libby/journal")
    suspend fun libbyJournal(): LibbyJournal

    /** Has her write about the latest conversation now. */
    @POST("api/libby/journal/reflect")
    suspend fun reflectLibby(): LibbyReflection

    @DELETE("api/libby/journal/{id}")
    suspend fun forgetJournalEntry(@Path("id") id: String)

    @DELETE("api/libby/journal")
    suspend fun clearLibbyJournal()

    @GET("api/libby/bond")
    suspend fun libbyBond(): LibbyBond

    @DELETE("api/libby/bond")
    suspend fun resetLibbyBond()

    // ── her reaction shelf ───────────────────────────────────────────────

    @GET("api/libby/stickers")
    suspend fun libbyStickers(): LibbyStickers

    /** One file, kept byte for byte: the body is the file. */
    @POST("api/libby/stickers")
    suspend fun uploadLibbySticker(@Query("filename") filename: String, @Query("label") label: String?, @Body body: okhttp3.RequestBody): LibbySticker

    @PATCH("api/libby/stickers/{id}")
    suspend fun updateLibbySticker(@Path("id") id: String, @Body body: StickerPatch): LibbySticker

    @DELETE("api/libby/stickers/{id}")
    suspend fun deleteLibbySticker(@Path("id") id: String)

    // ── her on Discord ───────────────────────────────────────────────────

    @GET("api/discord")
    suspend fun discord(): DiscordState

    @POST("api/discord/connect")
    suspend fun connectDiscord(@Body body: DiscordToken): DiscordState

    @POST("api/discord/disconnect")
    suspend fun disconnectDiscord()

    @PUT("api/discord/settings")
    suspend fun saveDiscord(@Body body: DiscordPatch): DiscordState

    // ── the Sprites board ────────────────────────────────────────────────

    /** Every square drawn into a wardrobe so far, without the pictures. */
    @GET("api/libby/outfits/{id}/wip")
    suspend fun outfitWip(@Path("id") id: String): LibbyWipSquares

    @PUT("api/libby/outfits/{id}/wip/{emotion}")
    suspend fun putOutfitWip(@Path("id") id: String, @Path("emotion") emotion: String, @Query("level") level: Int?, @Body body: PutWipRequest): LibbyWipSquare

    @DELETE("api/libby/outfits/{id}/wip/{emotion}")
    suspend fun deleteOutfitWip(@Path("id") id: String, @Path("emotion") emotion: String, @Query("level") level: Int?)

    @retrofit2.http.Streaming
    @GET("api/libby/outfits/{id}/wip/{emotion}")
    suspend fun outfitWipImage(@Path("id") id: String, @Path("emotion") emotion: String, @Query("level") level: Int?): okhttp3.ResponseBody

    @DELETE("api/libby/outfits/{id}/emotions/{emotion}")
    suspend fun deleteOutfitEmotion(@Path("id") id: String, @Path("emotion") emotion: String, @Query("level") level: Int?)

    /** The board's rewrites of its squares' words, by slot. */
    @GET("api/libby/sprite-words")
    suspend fun spriteWords(): SpriteWords

    /** One square, drawn. */
    @POST("api/imagegen/generate")
    suspend fun generateSprite(@Body body: SpriteGenerateRequest): GenerateResponse

    @retrofit2.http.Streaming
    @GET("api/imagegen/preview/{id}")
    suspend fun genPreview(@Path("id") id: String): okhttp3.ResponseBody

    /** The picture with its background cut away (cut=1), by the server's matte model. */
    @POST("api/imagegen/matte")
    suspend fun matteCut(@Body body: okhttp3.RequestBody, @Query("cut") cut: Int = 1): okhttp3.ResponseBody

    // ── settings ─────────────────────────────────────────────────────────

    /** The server's settings, as the web's Settings reads them. Secrets come back blank
     *  with a "…Set" flag beside them. */
    @GET("api/settings")
    suspend fun serverSettings(): kotlinx.serialization.json.JsonObject

    /** Admin. Decoded onto the current settings, so only the fields sent change. */
    @PUT("api/settings")
    suspend fun saveServerSettings(@Body body: kotlinx.serialization.json.JsonObject): kotlinx.serialization.json.JsonObject

    /** Keys for MCP clients, and the tools /api/mcp serves. */
    @GET("api/mcp/keys")
    suspend fun mcpKeys(): McpKeys

    /** The key is in this answer and nowhere else, ever. */
    @POST("api/mcp/keys")
    suspend fun createMcpKey(@Body body: CollectionName): NewKey

    @DELETE("api/mcp/keys/{id}")
    suspend fun revokeMcpKey(@Path("id") id: Long)

    /** A short code the desktop launcher links with. */
    @POST("api/launchy/pairing")
    suspend fun launchyPairing(): LaunchyPairing

    @GET("api/launchy/keys")
    suspend fun launchyKeys(): AccessKeys

    @DELETE("api/launchy/keys/{id}")
    suspend fun revokeLaunchyKey(@Path("id") id: Long)

    @GET("api/auth/passkeys")
    suspend fun passkeys(): Passkeys

    @PATCH("api/auth/passkeys/{id}")
    suspend fun renamePasskey(@Path("id") id: Long, @Body body: CollectionName)

    @POST("api/auth/passkeys/{id}/revoke")
    suspend fun revokePasskey(@Path("id") id: Long, @Body body: PasswordConfirm)

    // ── the graphics card ────────────────────────────────────────────────

    /** Who has the card: her chat model, the image generator, or ComfyUI. */
    @GET("api/gpu")
    suspend fun gpuState(): GpuState

    /** Gives the card to one program; waits for her model to load when it is hers. */
    @POST("api/gpu")
    suspend fun gpuSwitch(@Body body: GpuSwitchRequest): GpuSwitchResult

    /** Every AI tool, and how each could be restarted. */
    @GET("api/ai/restart")
    suspend fun aiRestartState(): AiRestartState

    @POST("api/ai/restart/{id}")
    suspend fun aiRestart(@Path("id") id: String): AiRestartResult
}
