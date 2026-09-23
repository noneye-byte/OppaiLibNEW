package net.fourbakers.oppailib.data

import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Response
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

    /** Range-capable form used by the persistent download worker. */
    @Streaming
    @GET("api/media/{id}/stream")
    suspend fun streamMediaRange(
        @Path("id") id: Long,
        @Header("Range") range: String? = null,
    ): Response<ResponseBody>

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

    // ── Game save backup ─────────────────────────────────────────────────
    // A save is an attachment on a game, not a library item, so it has its own
    // endpoints rather than appearing in the media list.

    @GET("api/media/{id}/saves")
    suspend fun gameSaves(@Path("id") gameId: Long): GameSaveListResponse

    @Multipart
    @POST("api/media/{id}/saves")
    suspend fun uploadGameSave(
        @Path("id") gameId: Long,
        @Part file: MultipartBody.Part,
        // Several games write every save under the same filename, so the label is
        // what makes a list of them tellable apart.
        @Part("label") label: RequestBody? = null,
    ): GameSave

    @DELETE("api/media/{id}/saves/{save}")
    suspend fun deleteGameSave(@Path("id") gameId: Long, @Path("save") saveId: Long)

    /** Streams a save's bytes back so it can be written to a user-picked file. */
    @Streaming
    @GET("api/media/{id}/saves/{save}")
    suspend fun downloadGameSave(
        @Path("id") gameId: Long,
        @Path("save") saveId: Long,
    ): ResponseBody

    // ── Game updates and Launchy ──────────────────────────────────────────
    // A game that came from itch.io or F95zone remembers its page; the server reads
    // it again on request and says whether a newer version is posted. Launchy is
    // the desktop launcher: a launch is a request queued on the server, picked up on
    // the launcher's next poll, so the phone never has to reach the PC itself.

    @POST("api/media/{id}/remote/check")
    suspend fun checkGameRemote(@Path("id") gameId: Long): GameCheckResponse

    @POST("api/media/{id}/remote/acknowledge")
    suspend fun acknowledgeGameRemote(@Path("id") gameId: Long): GameRemote

    // ── Browsing the catalogues ───────────────────────────────────────────
    // itch.io and F95zone, read through the server because the server is what holds
    // a session on either. Every one of these is slow by phone standards — each is
    // an HTTP fetch of somebody else's site, parsed — so they sit inside the same
    // ten-minute read timeout the rest of the client uses rather than having their
    // own. See the backend's gamesites package.

    @GET("api/games/sites")
    suspend fun gameSites(): GameSitesResponse

    /** Refused with 502, never 401: a rejected F95zone password is an upstream
     *  refusal, and a 401 from anywhere signs this app out of the library. */
    @POST("api/games/sites/{site}/login")
    suspend fun gameSiteLogin(@Path("site") site: String, @Body body: GameSiteLoginRequest): GameSiteAccount

    @POST("api/games/sites/{site}/logout")
    suspend fun gameSiteLogout(@Path("site") site: String): GameSiteAccount

    /** 409 when the site is not signed in — a precondition of the request, not a
     *  statement about this session. */
    @GET("api/games/browse")
    suspend fun gameBrowse(
        @Query("site") site: String,
        @Query("q") query: String,
        @Query("sort") sort: String,
        @Query("page") page: Int,
    ): GameSiteListing

    @POST("api/games/browse/detail")
    suspend fun gameBrowseDetail(@Body body: GameBrowseDetailRequest): GameBrowseDetailResponse

    /** Minutes of downloading, which the server finishes even if the phone gives up
     *  waiting for the answer. A timeout here is not a failed import. */
    @POST("api/games/browse/add")
    suspend fun gameBrowseAdd(@Body body: GameBrowseAddRequest): GameBrowseAddResponse

    @GET("api/games/updates")
    suspend fun gameUpdates(): GameUpdatesResponse

    @POST("api/games/updates/check")
    suspend fun gameUpdatesCheck(): GameUpdatesCheckResponse

    @GET("api/launchy")
    suspend fun launchyStatus(): LaunchyStatus

    @POST("api/launchy/launch")
    suspend fun launchyLaunch(@Body body: LaunchRequest): LaunchCommand

    @GET("api/launchy/launch/{cmd}")
    suspend fun launchyLaunchStatus(@Path("cmd") cmdId: String): LaunchCommand

    /** 404s when a game has no browser build, which is how the viewer decides
     *  whether to offer Play at all. */
    @GET("api/media/{id}/play")
    suspend fun gamePlayInfo(@Path("id") gameId: Long): GamePlayInfo

    @POST("api/media/{id}/autotag")
    suspend fun autotag(@Path("id") id: Long): AutotagResponse

    /** Asks the server's vision model what a picture or clip shows. Slow: a CPU model. */
    @POST("api/media/{id}/describe")
    suspend fun describe(@Path("id") id: Long): DescribeResponse

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

    /** Libby's voice: one line as audio (WAV from piper), or 503 when the server has
     * no engine and the phone should use its own. */
    @POST("api/tts/speak")
    suspend fun ttsSpeak(@Body body: SpeakRequest): ResponseBody

    @GET("api/imagegen/status")
    suspend fun imageGenStatus(): ImageGenStatus

    @POST("api/imagegen/generate")
    suspend fun imageGenGenerate(@Body body: GenerateRequest): GenerateResponse

    /** What the generator has drawn so far of a named run; an unchanged preview is
     * withheld when [seen] is the last seq the caller had. */
    @GET("api/imagegen/progress/{id}")
    suspend fun imageGenProgress(@Path("id") id: String, @Query("seen") seen: Long): GenProgress

    /** Stops a named run; the generate call then fails with "cancelled". */
    @POST("api/imagegen/cancel/{id}")
    suspend fun imageGenCancel(@Path("id") id: String): Map<String, Boolean>

    @POST("api/imagegen/save")
    suspend fun imageGenSave(@Body body: GenSaveRequest): GenSaveResponse

    /** A saved picture, sent into her chat as hers. */
    @POST("api/libby/send")
    suspend fun libbySend(@Body body: LibbySendRequest): LibbySendResponse

    @GET("api/imagegen/characters")
    suspend fun imageGenCharacters(): GenCharacterListResponse

    /** Creates a character (empty id) or updates one; returns the saved record. */
    @POST("api/imagegen/characters")
    suspend fun saveCharacter(@Body body: SaveCharacterRequest): GenCharacter

    @DELETE("api/imagegen/characters/{id}")
    suspend fun deleteCharacter(@Path("id") id: String)

    // The pose library: the same shape as characters, for what the subject is doing.
    @GET("api/imagegen/poses")
    suspend fun imageGenPoses(): GenPoseListResponse

    @POST("api/imagegen/poses")
    suspend fun savePose(@Body body: SaveCharacterRequest): GenCharacter

    @DELETE("api/imagegen/poses/{id}")
    suspend fun deletePose(@Path("id") id: String)

    /** The wildcard lists a prompt can draw from with __name__. */
    @GET("api/imagegen/wildcards")
    suspend fun imageGenWildcards(): GenWildcardListResponse

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

    /** Removes a model or LoRA from InvokeAI, file included when InvokeAI manages it. */
    @DELETE("api/imagegen/model")
    suspend fun deleteModel(@Query("key") key: String)

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
        @Query("period") period: String? = null,
        @Query("base") base: String? = null,
        @Query("creator") creator: String? = null,
        @Query("nsfw") nsfw: String? = null,
        @Query("cursor") cursor: String? = null,
    ): CivitaiSearchResponse

    /** One model's page: description, every version with files, what is installed. */
    @GET("api/imagegen/civitai/models/{id}")
    suspend fun civitaiModel(@Path("id") id: Long): CivitaiModel

    /** Pictures posted with a version, in a post or collection, or by a user, with
        their prompts. */
    @GET("api/imagegen/civitai/images")
    suspend fun civitaiImages(
        @Query("versionId") versionId: Long? = null,
        @Query("username") username: String? = null,
        @Query("postId") postId: Long? = null,
        @Query("collectionId") collectionId: Long? = null,
        @Query("sort") sort: String? = null,
        @Query("nsfw") nsfw: String? = null,
        @Query("cursor") cursor: String? = null,
    ): CivitaiImagesResponse

    /** Someone's posts, newest first: a page of their pictures grouped by post. */
    @GET("api/imagegen/civitai/posts")
    suspend fun civitaiPosts(
        @Query("username") username: String,
        @Query("nsfw") nsfw: String? = null,
        @Query("cursor") cursor: String? = null,
    ): CivitaiPostsResponse

    /** Public collections by name — the only filter the catalogue honours. */
    @GET("api/imagegen/civitai/collections")
    suspend fun civitaiCollections(
        @Query("q") q: String? = null,
        @Query("sort") sort: String? = null,
        @Query("cursor") cursor: String? = null,
    ): CivitaiCollectionsResponse

    @GET("api/imagegen/civitai/categories")
    suspend fun civitaiCategories(): CivitaiCategoriesResponse

    /** Who the configured API key belongs to; fails when there is no key. */
    @GET("api/imagegen/civitai/me")
    suspend fun civitaiMe(): CivitaiMe

    /** The studio's models with their Civitai records, matched by file hash. */
    @GET("api/imagegen/civitai/installed")
    suspend fun civitaiInstalled(@Query("refresh") refresh: String? = null): CivitaiInstalledResponse

    /** Writes the catalogue's cover, description and trigger words onto one model now. */
    @POST("api/imagegen/civitai/sync")
    suspend fun civitaiSync(@Body body: CivitaiSyncRequest): CivitaiLink

    /** Makes one of the catalogue's pictures the model's cover; the choice survives
        a later fetch of the same version. */
    @POST("api/imagegen/civitai/cover")
    suspend fun civitaiCover(@Body body: CivitaiCoverRequest)

    /** Installs another version (the newest when unsaid) and deletes the current
        record once the new file is in and dressed. */
    @POST("api/imagegen/civitai/update")
    suspend fun civitaiUpdate(@Body body: CivitaiUpdateRequest): InstallJob

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

    /**
     * Says whether a library item is a picture of Libby, or is not.
     *
     * The verdict is written onto the item as the `character:libby` tag, which is what
     * makes it a picture she can send back to you — her photographs live in the library
     * as well as in her chat gallery. "No" is a real answer and is remembered as one,
     * so automatic recognition does not put the label straight back.
     */
    @POST("api/libby/identity/mark")
    suspend fun markLibbyIdentity(@Body body: LibbyIdentityMark)

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

    // ── Libby backgrounds ────────────────────────────────────────────────
    // The rooms she can be in on a call. Same storage scheme as the outfits.

    @GET("api/libby/backgrounds")
    suspend fun libbyBackgrounds(): LibbyBackgroundsResponse

    @POST("api/libby/backgrounds")
    suspend fun saveLibbyBackground(@Body body: LibbyBackgroundSaveRequest): LibbyBackground

    @DELETE("api/libby/backgrounds/{id}")
    suspend fun deleteLibbyBackground(@Path("id") id: String)

    @PUT("api/libby/backgrounds/{id}/image")
    suspend fun setLibbyBackgroundImage(@Path("id") id: String, @Body body: LibbyEmotionRequest)

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
