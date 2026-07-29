package net.fourbakers.oppailib.data

import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Streaming

interface ApiService {
    @GET("api/health")
    suspend fun health(): HealthResponse

    @GET("api/chat/status")
    suspend fun chatStatus(): ChatStatus

    @POST("api/chat")
    suspend fun chat(@Body body: ChatRequest): ChatResponse

    @GET("api/chat/models")
    suspend fun chatModels(): ChatModels

    @POST("api/chat/models/load")
    suspend fun loadChatModel(@Body body: LoadChatModelRequest): LoadChatModelResponse

    @POST("api/chat/models/unload")
    suspend fun unloadChatModel()

    @GET("api/chat/workspace")
    suspend fun chatWorkspace(): ChatWorkspace

    @PUT("api/chat/workspace")
    suspend fun saveChatWorkspace(@Body body: ChatWorkspace): ChatWorkspace

    @POST("api/chat/images")
    suspend fun uploadChatImage(@Body body: ChatImageUpload): ChatImage

    @DELETE("api/chat/images/{id}")
    suspend fun deleteChatImage(@Path("id") id: String)

    @GET("api/imagegen/tags")
    suspend fun booruTags(@Query("q") query: String): TagSuggestions

    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @GET("api/auth/me")
    suspend fun me(): User

    @POST("api/auth/logout")
    suspend fun logout()

    @GET("api/media")
    suspend fun listMedia(
        @Query("kind") kind: String? = null,
        @Query("limit") limit: Int = 60,
        @Query("offset") offset: Int = 0,
    ): MediaListResponse

    @GET("api/media/{id}")
    suspend fun getMedia(@Path("id") id: Long): Media

    /** Raw library bytes for an explicit export or chat handoff. Callers must close
        the body; @Streaming keeps large videos out of the app's heap. */
    @Streaming
    @GET("api/media/{id}/stream")
    suspend fun streamMedia(@Path("id") id: Long): ResponseBody

    /** The representative still used when a non-image item is shared into chat. */
    @Streaming
    @GET("api/media/{id}/thumb")
    suspend fun mediaThumb(@Path("id") id: Long): ResponseBody

    /** Returns the item as it now stands, tags included — no need to re-fetch it. */
    @PATCH("api/media/{id}")
    suspend fun patchMedia(@Path("id") id: Long, @Body body: MediaPatch): Media

    /** One action over many ids. Capped at 500 by the server. */
    @POST("api/media/bulk")
    suspend fun bulkMedia(@Body body: BulkRequest): BulkResponse

    @GET("api/stats")
    suspend fun stats(): Stats

    /** Admin-only server performance snapshot. */
    @GET("api/diagnostics")
    suspend fun diagnostics(): Diagnostics

    @POST("api/diagnostics/reset")
    suspend fun resetDiagnostics()

    /** Storage paths and free-space readings are available to every signed-in user. */
    @GET("api/storage")
    suspend fun storage(): StorageReport

    /** Admin-only cleanup of recreatable staging and scratch data. */
    @POST("api/storage/cleanup")
    suspend fun cleanupStorage(@Body body: StorageCleanupRequest): StorageCleanupResponse

    @POST("api/auth/password")
    suspend fun changePassword(@Body body: PasswordRequest)

    @Multipart
    @POST("api/media")
    suspend fun upload(
        @Part file: MultipartBody.Part,
        @Part("title") title: RequestBody? = null,
    ): UploadResponse

    // ── resumable uploads ──────────────────────────────────────────────
    // The multipart POST above stays the path for a picture. A video goes through
    // these: the server owns the session and this app sends the chunks it does not
    // already have, so an upload survives the screen going off, the app being swapped
    // away, and the process being killed. See work/UploadWorker.kt.

    @GET("api/uploads")
    suspend fun uploadSessions(): UploadSessionList

    @POST("api/uploads")
    suspend fun createUploadSession(@Body body: CreateUploadRequest): UploadSession

    @GET("api/uploads/{id}")
    suspend fun uploadSession(@Path("id") id: String): UploadSession

    @PUT("api/uploads/{id}/chunk/{idx}")
    suspend fun putUploadChunk(
        @Path("id") id: String,
        @Path("idx") index: Int,
        @Body body: RequestBody,
        @Header("X-Chunk-SHA256") checksum: String? = null,
    ): UploadSession

    @POST("api/uploads/{id}/complete")
    suspend fun completeUploadSession(
        @Path("id") id: String,
        @Body body: CompleteUploadRequest,
    ): CompleteUploadResponse

    @DELETE("api/uploads/{id}")
    suspend fun cancelUploadSession(@Path("id") id: String)

    @GET("api/media/{id}/gallery")
    suspend fun gameGallery(@Path("id") gameId: Long): MediaListResponse

    @Multipart
    @POST("api/media/{id}/gallery")
    suspend fun uploadGameGallery(
        @Path("id") gameId: Long,
        @Part file: MultipartBody.Part,
    ): Media

    @DELETE("api/media/{id}/gallery/{media}")
    suspend fun removeGameGallery(@Path("id") gameId: Long, @Path("media") mediaId: Long)

    @POST("api/media/{id}/autotag")
    suspend fun autotag(@Path("id") id: Long): AutotagResponse

    /** Probes a comic's archive. Page images come from [Repository.pageUrl]. */
    @GET("api/media/{id}/comic")
    suspend fun comicInfo(@Path("id") id: Long): ComicInfo

    @DELETE("api/media/{id}")
    suspend fun deleteMedia(@Path("id") id: Long)

    // ── remote sources ───────────────────────────────────────────────────
    // Browsing streams straight from the origin and stores nothing. Only save()
    // pulls an item into the library.

    @GET("api/sources")
    suspend fun sources(): SourceListResponse

    @GET("api/sources/{id}/browse")
    suspend fun browseSource(
        @Path("id") id: String,
        @Query("feed") feed: String,
        @Query("cursor") cursor: String? = null,
        // Search feeds only: the term, and which of the feed's orderings to use.
        @Query("q") q: String? = null,
        @Query("sort") sort: String? = null,
    ): SourceListing

    @GET("api/sources/{id}/item/{item}/pages")
    suspend fun sourcePages(@Path("id") id: String, @Path("item") item: String): SourcePagesResponse

    /**
     * The conversation an item was posted in — [SourceItem.threadId], not the item's
     * own id. Sources with no discussions answer 404.
     */
    @GET("api/sources/{id}/item/{item}/comments")
    suspend fun sourceComments(
        @Path("id") id: String,
        @Path("item") item: String,
    ): SourceCommentsResponse

    @POST("api/sources/{id}/save")
    suspend fun saveFromSource(@Path("id") id: String, @Body body: SourceSaveRequest): ImportResponse

    // ── image generation ─────────────────────────────────────────────────
    // Talks to the local generator through the server; generated images live in the
    // server's memory until save() files one into the library.

    @GET("api/imagegen/status")
    suspend fun imageGenStatus(): ImageGenStatus

    @POST("api/imagegen/generate")
    suspend fun imageGenGenerate(@Body body: GenerateRequest): GenerateResponse

    @POST("api/imagegen/save")
    suspend fun imageGenSave(@Body body: GenSaveRequest): GenSaveResponse

    @GET("api/imagegen/characters")
    suspend fun imageGenCharacters(): GenCharacterListResponse

    /** Creates a character (empty id) or updates one; returns the saved record. */
    @POST("api/imagegen/characters")
    suspend fun saveCharacter(@Body body: SaveCharacterRequest): GenCharacter

    @DELETE("api/imagegen/characters/{id}")
    suspend fun deleteCharacter(@Path("id") id: String)

    /** Runs the AI tagger over an uploaded image (never stored) and returns the
        booru tags it finds — used to pre-fill a character's prompt. */
    @POST("api/ai/scan-image")
    suspend fun scanImage(@Body body: ScanImageRequest): ScanImageResponse

    /** The generator's own model record: name, description, triggers, defaults. */
    @GET("api/imagegen/model")
    suspend fun modelMeta(@Query("name") name: String): GenModelMeta

    /** Writes the record back — the same edit InvokeAI's model manager would make. */
    @PATCH("api/imagegen/model")
    suspend fun patchModelMeta(@Body body: GenModelMetaPatch): GenModelMeta

    // ── InvokeAI gallery ─────────────────────────────────────────────────
    // The generator keeps every finished image in its own gallery; these browse
    // and prune it. Images stream via Repository.galleryThumbUrl/galleryFullUrl.

    @GET("api/imagegen/gallery/boards")
    suspend fun galleryBoards(): GalleryBoardsResponse

    /** Deletes a gallery board; its images survive, moved back to Uncategorized. */
    @DELETE("api/imagegen/gallery/boards/{id}")
    suspend fun deleteGalleryBoard(@Path("id") id: String)

    @GET("api/imagegen/gallery/images")
    suspend fun galleryImages(
        @Query("board") board: String,
        @Query("offset") offset: Int = 0,
        @Query("limit") limit: Int = 60,
    ): GalleryPageResponse

    @DELETE("api/imagegen/gallery/image/{name}")
    suspend fun deleteGalleryImage(@Path("name") name: String)

    /** Batch delete for a multi-select. */
    @POST("api/imagegen/gallery/delete")
    suspend fun deleteGalleryImages(@Body body: GalleryNamesRequest)

    /** Files a multi-select onto a board ("none" clears their board). */
    @POST("api/imagegen/gallery/board")
    suspend fun addGalleryImagesToBoard(@Body body: GalleryBoardRequest)

    /** Copies one gallery image into the library (the only crossing point). */
    @POST("api/imagegen/gallery/save")
    suspend fun saveGalleryImage(@Body body: GallerySaveRequest): GenSaveResponse

    // ── Civitai catalogue (proxied through the server) ───────────────────

    @GET("api/imagegen/civitai/search")
    suspend fun civitaiSearch(
        @Query("q") q: String? = null,
        @Query("type") type: String? = null,
        @Query("category") category: String? = null,
        @Query("sort") sort: String? = null,
        @Query("cursor") cursor: String? = null,
    ): CivitaiSearchResponse

    @GET("api/imagegen/civitai/categories")
    suspend fun civitaiCategories(): CivitaiCategoriesResponse

    /** Hands a Civitai download URL to InvokeAI; the box downloads it itself. */
    @POST("api/imagegen/civitai/install")
    suspend fun civitaiInstall(@Body body: CivitaiInstallRequest): InstallJob

    @GET("api/imagegen/civitai/installs")
    suspend fun civitaiInstalls(): InstallJobsResponse

    // ── Video poster frames ──────────────────────────────────────────────

    @GET("api/media/{id}/frames")
    suspend fun posterFrames(@Path("id") id: Long, @Query("count") count: Int = 20): PosterFramesResponse

    @PUT("api/media/{id}/thumb")
    suspend fun setPoster(@Path("id") id: Long, @Body body: SetPosterRequest)

    /** Performs one action the user has approved. The only call in the app that acts
        on something Libby said, and it exists solely to be made by an Allow button. */
    @POST("api/libby/act")
    suspend fun libbyAct(@Body body: LibbyActRequest)

    // ── Libby memory ─────────────────────────────────────────────────────
    // The durable facts Libby keeps about you between conversations. Written from her
    // own replies server-side; these only read and clear it, for chat settings.

    @GET("api/libby/memory")
    suspend fun libbyMemory(): LibbyMemoryResponse

    @DELETE("api/libby/memory")
    suspend fun clearLibbyMemory()

    @DELETE("api/libby/memory/{id}")
    suspend fun forgetLibbyMemory(@Path("id") id: String)

    // ── Libby outfits ────────────────────────────────────────────────────

    @GET("api/libby/outfits")
    suspend fun libbyOutfits(): LibbyOutfitsResponse

    @POST("api/libby/outfits")
    suspend fun saveLibbyOutfit(@Body body: LibbyOutfitSaveRequest): LibbyOutfit

    @DELETE("api/libby/outfits/{id}")
    suspend fun deleteLibbyOutfit(@Path("id") id: String)

    @PUT("api/libby/outfits/{id}/emotions/{emotion}")
    suspend fun setLibbyEmotion(
        @Path("id") id: String,
        @Path("emotion") emotion: String,
        @Body body: LibbyEmotionRequest,
        @Query("level") level: Int = 0,
    )

    /** An outfit's card art. Optional — without one the server falls back to the
        outfit's own slot art, so this is an override rather than a required step. */
    @PUT("api/libby/outfits/{id}/thumb")
    suspend fun setLibbyOutfitThumb(@Path("id") id: String, @Body body: LibbyEmotionRequest)

    @DELETE("api/libby/outfits/{id}/thumb")
    suspend fun clearLibbyOutfitThumb(@Path("id") id: String)

    @POST("api/scrape")
    suspend fun scrape(@Body body: UrlRequest): ScrapeResult

    @POST("api/scrape/import")
    suspend fun scrapeImport(@Body body: ScrapeImportRequest): ImportResponse

    // ── the app updating itself ──────────────────────────────────────────

    @GET("api/apk/info")
    suspend fun apkInfo(): ApkInfo

    /**
     * The APK itself — tens of megabytes, so @Streaming: the body is handed over as
     * an open stream to write to disk, rather than being built up in memory first.
     */
    @Streaming
    @GET("api/apk")
    suspend fun downloadApk(): ResponseBody
}
