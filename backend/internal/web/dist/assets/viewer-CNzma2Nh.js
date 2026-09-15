import{a as x,w,e as n,m as u,ar as $,B as k,as as T,at as E,G as P,A as d,au as g,b as s,l as y,av as z,K as f,aw as m,ag as S,ax as R,ay as G,M as C,q as U,i as _,N as b,u as p,t as L}from"./index-CsG9DGtL.js";var N=Object.defineProperty,F=Object.getOwnPropertyDescriptor,l=(e,t,i,a)=>{for(var r=a>1?void 0:a?F(t,i):t,c=e.length-1,h;c>=0;c--)(h=e[c])&&(r=(a?h(t,i,r):h(r))||r);return a&&r&&N(t,i,r),r};let o=class extends x{constructor(){super(...arguments),this.favorite=!1,this.queue=[],this.full=null,this.activeTag=null,this.tagging=!1,this.editing=!1,this.saving=!1,this.editTitle="",this.editNotes="",this.editKind="image",this.editTags=[],this.newTag="",this.screenshot="",this.userGallery=[],this.galleryUploading=!1,this.saves=[],this.saveUploading=!1,this.saveError="",this.play=null,this.playing=!1,this.posterFrames=[],this.posterLoading=!1,this.posterSaving=-1,this.posterChosen=-1,this.posterError="",this.posterVersion=0,this.comic=null,this.page=1,this.fit=w(),this.lastReported=0,this.onVideoReady=async e=>{const t=e.target,i=this.media.id;this.lastReported=0;try{const a=await n.getProgress(i);if(this.media.id!==i||a.position<o.PROGRESS_FLOOR)return;const r=t.duration||a.duration;if(r>0&&a.position>r*o.PROGRESS_DONE)return;t.currentTime=a.position,u("Picking up where you left off.")}catch{}},this.onVideoTime=e=>{const t=e.target,i=t.currentTime;Math.abs(i-this.lastReported)<o.PROGRESS_INTERVAL||(this.lastReported=i,this.saveProgress(i,t.duration))},this.flushProgress=e=>{const t=e.target;this.lastReported=t.currentTime,this.saveProgress(t.currentTime,t.duration)},this.onVideoEnded=()=>{this.lastReported=0,n.clearProgress(this.media.id).catch(()=>{})},this.onKey=e=>{var a;if($(e))return;const t=this.full??this.media;if(t.kind==="comic"){this.onComicKey(e);return}if(t.kind!=="video")return;const i=this.videoEl();if(i)switch(e.key){case" ":case"k":e.preventDefault(),i.paused?i.play():i.pause();break;case"j":i.currentTime=Math.max(0,i.currentTime-10);break;case"l":i.currentTime=Math.min(i.duration||1/0,i.currentTime+10);break;case"m":i.muted=!i.muted;break;case"f":e.preventDefault(),document.fullscreenElement?document.exitFullscreen():(a=i.requestFullscreen)==null||a.call(i);break}},this.cancelEdit=()=>{this.editing=!1}}connectedCallback(){super.connectedCallback(),k(this,"viewer"),this.loadItem(),window.addEventListener("keydown",this.onKey)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("keydown",this.onKey),this.clearMediaSession()}updated(e){if(e.has("media")){const t=e.get("media");t&&t.id!==this.media.id&&(this.editing=!1,this.activeTag=null,this.loadItem())}(e.has("media")||e.has("queue"))&&this.centerCurrentInQueue(),this.setupMediaSession()}centerCurrentInQueue(){const e=this.renderRoot.querySelector(".upnext .strip"),t=e==null?void 0:e.querySelector(".strip-item.on");!e||!t||(e.scrollLeft=Math.max(0,t.offsetLeft-(e.clientWidth-t.offsetWidth)/2))}loadItem(){const e=this.media;this.full=e,n.getMedia(e.id).then(t=>this.full=t).catch(()=>this.full=e),this.comic=null,e.kind==="comic"&&this.loadComic(e.id),this.userGallery=[],this.saves=[],this.saveError="",this.play=null,this.playing=!1,e.kind==="game"&&(this.loadGameGallery(e.id),this.loadSaves(e.id),this.probePlayable(e.id))}async loadSaves(e){try{const t=await n.gameSaves(e);this.media.id===e&&(this.saves=t.items)}catch{this.media.id===e&&(this.saves=[])}}async probePlayable(e){try{const t=await n.gamePlayInfo(e);this.media.id===e&&(this.play=t.playable?t:null)}catch{this.media.id===e&&(this.play=null)}}async uploadSave(e,t){const i=e.target,a=[...i.files??[]];if(i.value="",!(!a.length||this.saveUploading)){this.saveUploading=!0,this.saveError="";try{for(const r of a){const c=await n.uploadGameSave(t,r);this.saves=[c,...this.saves]}}catch(r){this.saveError=r instanceof Error?r.message:"Couldn't upload that save."}finally{this.saveUploading=!1}}}async deleteSave(e,t){try{await n.deleteGameSave(e,t),this.saves=this.saves.filter(i=>i.id!==t)}catch(i){this.saveError=i instanceof Error?i.message:"Couldn't delete that save."}}async loadGameGallery(e){try{const t=await n.gameGallery(e);this.media.id===e&&(this.userGallery=t.items)}catch{this.userGallery=[]}}async uploadGameGallery(e,t){const i=e.target,a=[...i.files??[]];if(i.value="",!(!a.length||this.galleryUploading)){this.galleryUploading=!0;try{for(const r of a)this.userGallery=[...this.userGallery,await n.uploadGameGallery(t,r)]}finally{this.galleryUploading=!1}}}async removeGameGallery(e,t){await n.removeGameGallery(e,t),this.userGallery=this.userGallery.filter(i=>i.id!==t)}async loadComic(e){try{const t=await n.comicInfo(e);if(this.media.id!==e)return;if(this.comic=t,t.readable&&t.pages>0){this.page=Math.min(Math.max(T(e),1),t.pages),this.preloadPage(e,this.page+1);try{const i=await n.getProgress(e),a=Math.round(i.position);this.media.id===e&&a>=1&&a<=t.pages&&a!==this.page&&(this.page=a,this.preloadPage(e,a+1))}catch{}}}catch(t){if(this.media.id!==e)return;this.comic={readable:!1,pages:0,reason:t.message}}}preloadPage(e,t){var i;!((i=this.comic)!=null&&i.readable)||t<1||t>this.comic.pages||(new Image().src=n.pageURL(e,t))}goPage(e){var a,r;if(!((a=this.comic)!=null&&a.readable))return;const t=this.full??this.media,i=Math.min(Math.max(e,1),this.comic.pages);i!==this.page&&(this.page=i,E(t.id,i),n.setProgress(t.id,i).catch(()=>{}),this.preloadPage(t.id,i+1),this.fit==="width"&&((r=this.renderRoot.querySelector(".reader-stage"))==null||r.scrollIntoView({block:"start"})))}setFit(e){this.fit=e,P(e)}saveProgress(e,t){const i=this.media.id;if(e<o.PROGRESS_FLOOR||t>0&&e>t*o.PROGRESS_DONE){n.clearProgress(i).catch(()=>{});return}n.setProgress(i,e).catch(()=>{})}videoEl(){var e;return((e=this.renderRoot)==null?void 0:e.querySelector("video"))??null}onComicKey(e){var t;if((t=this.comic)!=null&&t.readable)switch(e.key){case"ArrowRight":case"PageDown":case" ":e.preventDefault(),this.goPage(this.page+1);break;case"ArrowLeft":case"PageUp":e.preventDefault(),this.goPage(this.page-1);break;case"Home":e.preventDefault(),this.goPage(1);break;case"End":e.preventDefault(),this.goPage(this.comic.pages);break}}emitNavigate(e){this.dispatchEvent(new CustomEvent("navigate",{detail:{dir:e},bubbles:!0,composed:!0}))}setupMediaSession(){const e=this.full??this.media;if(e.kind!=="video"||!("mediaSession"in navigator))return;const t=this.videoEl();if(!t)return;const i=navigator.mediaSession;try{i.metadata=new MediaMetadata({title:e.title,artist:"OppaiLib"})}catch{}const a=(r,c)=>{try{i.setActionHandler(r,c)}catch{}};a("play",()=>void t.play()),a("pause",()=>t.pause()),a("seekbackward",r=>{t.currentTime=Math.max(0,t.currentTime-(r.seekOffset??10))}),a("seekforward",r=>{t.currentTime=Math.min(t.duration||1/0,t.currentTime+(r.seekOffset??10))}),a("seekto",r=>{r.seekTime!=null&&(t.currentTime=r.seekTime)}),a("previoustrack",()=>this.emitNavigate(-1)),a("nexttrack",()=>this.emitNavigate(1))}clearMediaSession(){if(!("mediaSession"in navigator))return;const e=navigator.mediaSession,t=["play","pause","seekbackward","seekforward","seekto","previoustrack","nexttrack"];for(const i of t)try{e.setActionHandler(i,null)}catch{}e.metadata=null}toggleFav(){this.dispatchEvent(new CustomEvent("toggle-favorite",{bubbles:!0,composed:!0}))}async retag(){this.tagging=!0;try{const e=await n.autotag(this.media.id);this.full&&(this.full={...this.full,tags:e.tags}),this.activeTag=null,this.dispatchEvent(new CustomEvent("changed",{bubbles:!0,composed:!0})),u(e.tags.length?`Tags refreshed — ${e.tags.length} found.`:"Tagging finished, but nothing cleared your confidence threshold.","success")}catch(e){console.error("autotag",e),u(`Auto-tagging failed: ${e.message}`,"error")}finally{this.tagging=!1}}hasTimeline(e){var i;const t=this.full??this.media;return t.kind==="video"&&!!t.duration&&!!((i=e.moments)!=null&&i.length)}toggleTagTimeline(e){this.hasTimeline(e)&&(this.activeTag=this.activeTag===e.id?null:e.id)}seekTo(e){const t=this.videoEl();t&&(t.currentTime=e,t.play())}renderTimeline(e){var a;if(e.kind!=="video"||!e.duration)return d;const t=(e.tags??[]).find(r=>r.id===this.activeTag);if(!((a=t==null?void 0:t.moments)!=null&&a.length))return d;const i=e.duration;return s`
      <div class="timeline">
        <div class="rail">
          ${t.moments.map(r=>s`<button
              class="marker"
              style="left:${Math.min(100,r/i*100)}%"
              title="Jump to ${g(r)}"
              aria-label="Jump to ${g(r)}"
              @click=${()=>this.seekTo(r)}
            ></button>`)}
        </div>
        <div class="rail-legend">
          <span class="material-symbols-rounded" style="font-size:16px;">auto_awesome</span>
          <span
            >“${t.name}” detected at ${t.moments.map(r=>g(r)).join(", ")} — click a
            marker to jump.</span
          >
        </div>
      </div>
    `}startEdit(){const e=this.full??this.media;this.editTitle=e.title,this.editNotes=e.notes??"",this.editKind=e.kind,this.editTags=(e.tags??[]).map(t=>t.name),this.newTag="",this.editing=!0}removeEditTag(e){this.editTags=this.editTags.filter(t=>t!==e)}commitNewTag(){const e=this.newTag.trim();e&&!this.editTags.includes(e)&&(this.editTags=[...this.editTags,e]),this.newTag=""}onTagKeydown(e){(e.key==="Enter"||e.key===",")&&(e.preventDefault(),this.commitNewTag())}async saveEdit(){const e=this.full??this.media;this.commitNewTag();const t=(e.tags??[]).map(r=>r.name),i=this.editTags.filter(r=>!t.includes(r)),a=t.filter(r=>!this.editTags.includes(r));this.saving=!0;try{const r=await n.updateMedia(e.id,{title:this.editTitle,notes:this.editNotes,kind:this.editKind,addTags:i,removeTags:a});this.full=r,this.editing=!1,this.dispatchEvent(new CustomEvent("changed",{bubbles:!0,composed:!0}))}catch(r){console.error("save edit",r)}finally{this.saving=!1}}async doDelete(){const e=this.full??this.media;if(confirm(`Delete "${e.title}"? This cannot be undone.`))try{await n.deleteMedia(e.id);const t=y("libraryDelete");u(t.message,"success",{emotion:t.emotion,intensity:t.intensity}),this.dispatchEvent(new CustomEvent("deleted",{detail:{id:e.id},bubbles:!0,composed:!0}))}catch(t){console.error("delete",t)}}renderEdit(){return s`
      <div class="edit">
        <div>
          <label>Title</label>
          <input
            .value=${this.editTitle}
            @input=${e=>this.editTitle=e.target.value}
          />
        </div>
        <div>
          <label>Type</label>
          <select
            .value=${this.editKind}
            @change=${e=>this.editKind=e.target.value}
          >
            ${z.map(e=>s`<option value=${e} ?selected=${e===this.editKind}>${f[e].label}</option>`)}
          </select>
        </div>
        <div>
          <label>Notes</label>
          <textarea
            .value=${this.editNotes}
            @input=${e=>this.editNotes=e.target.value}
          ></textarea>
        </div>
        <div>
          <label>Tags</label>
          <div class="tag-edit">
            ${this.editTags.map(e=>s`<span class="tag-pill"
                >${e}
                <button title="Remove" @click=${()=>this.removeEditTag(e)}>
                  <span class="material-symbols-rounded" style="font-size:16px;">close</span>
                </button></span
              >`)}
            <input
              class="tag-add"
              placeholder="Add tag…"
              .value=${this.newTag}
              @input=${e=>this.newTag=e.target.value}
              @keydown=${this.onTagKeydown}
              @blur=${()=>this.commitNewTag()}
            />
          </div>
        </div>
        ${(this.full??this.media).kind==="video"?this.renderPosterPicker():d}
        <div class="edit-actions">
          <button class="btn-primary" @click=${this.saveEdit} ?disabled=${this.saving}>
            <span class="material-symbols-rounded" style="font-size:20px;">save</span>
            ${this.saving?"Saving…":"Save"}
          </button>
          <button class="btn-outline" @click=${this.cancelEdit} ?disabled=${this.saving}>Cancel</button>
        </div>
      </div>
    `}async loadPosterFrames(){const e=this.full??this.media;if(!this.posterLoading){this.posterLoading=!0,this.posterError="";try{const t=await n.posterFrames(e.id);if((this.full??this.media).id!==e.id)return;this.posterFrames=t.frames}catch(t){this.posterError=t.message||"Couldn't read frames from this video."}finally{this.posterLoading=!1}}}async choosePoster(e){const t=this.full??this.media,i=this.posterFrames[e];if(!(!i||this.posterSaving>=0)){this.posterSaving=e,this.posterError="";try{await n.setPoster(t.id,i.at),this.posterChosen=e,this.posterVersion=Date.now();const a=y("save");u("New thumbnail set.","success",{emotion:a.emotion,intensity:a.intensity})}catch(a){this.posterError=a.message||"Couldn't set that frame as the thumbnail."}finally{this.posterSaving=-1}}}renderPosterPicker(){const e=this.full??this.media;return s`<div class="poster-picker">
      <label>Thumbnail</label>
      <div class="poster-head">
        <img
          class="poster-current"
          src=${`${n.thumbURL(e.id)}${this.posterVersion?`?v=${this.posterVersion}`:""}`}
          alt="Current thumbnail"
          @error=${t=>t.target.style.visibility="hidden"}
        />
        <div class="poster-copy">
          <span>Pick the frame this video shows in the library.</span>
          ${this.posterFrames.length?d:s`<button class="btn-outline" ?disabled=${this.posterLoading} @click=${()=>this.loadPosterFrames()}>
                ${this.posterLoading?"Reading frames…":"Choose a frame"}
              </button>`}
        </div>
      </div>
      ${this.posterError?s`<div class="poster-error" role="alert">${this.posterError}</div>`:d}
      ${this.posterFrames.length?s`<div class="poster-strip">
            ${this.posterFrames.map((t,i)=>s`<button
              class="poster-frame ${this.posterChosen===i?"on":""}"
              title=${`Use the frame at ${g(t.at)}`}
              ?disabled=${this.posterSaving>=0}
              @click=${()=>this.choosePoster(i)}
            >
              <img src=${t.image} alt="" loading="lazy" />
              <span class="poster-time">
                ${this.posterSaving===i?"Saving…":g(t.at)}
              </span>
            </button>`)}
          </div>`:d}
    </div>`}favIcon(){return s`<span
      class="material-symbols-rounded fill-icon"
      style="font-size:22px; color:${this.favorite?"var(--oppai-fav)":"var(--oppai-text)"};"
      >${this.favorite?"favorite":"favorite_border"}</span
    >`}render(){const e=this.full??this.media,t=n.streamURL(e.id);return s`
      <div class="wrap">
        ${this.renderStage(e,t)}
        ${e.kind==="video"||e.kind==="image"?this.renderUpNext(e):d}
        ${this.renderTimeline(e)}
        ${e.kind==="game"?d:this.renderMeta(e)}
      </div>
      ${this.screenshot?s`<button class="shot-lightbox" aria-label="Close screenshot" @click=${()=>this.screenshot=""}>
            <img src=${this.screenshot} alt="Full-size game screenshot" />
          </button>`:d}
    `}renderUpNext(e){const t=this.queue.filter(a=>a.kind==="video"||a.kind==="image");if(t.some(a=>a.id===e.id)||t.unshift(e),t.length<2)return d;const i=t.findIndex(a=>a.id===e.id);return s`
      <div class="upnext">
        <div class="upnext-label">Videos & images</div>
        <div class="strip">
          ${t.map((a,r)=>s`
              <button
                class="strip-item ${a.id===e.id?"on":""}"
                title=${a.title}
                aria-current=${a.id===e.id}
                @click=${()=>this.jumpTo(a.id)}
              >
                ${a.hasThumb?s`<img src=${n.thumbURL(a.id)} loading="lazy" alt=${a.title} />`:s`<span class="strip-blank" style="background:${m(a)};"></span>`}
                ${a.kind==="video"?s`<span class="strip-play material-symbols-rounded">play_circle</span>`:d}
                ${r===i+1?s`<span class="strip-next">Next</span>`:d}
              </button>
            `)}
        </div>
      </div>
    `}jumpTo(e){e!==this.media.id&&this.dispatchEvent(new CustomEvent("jump",{detail:{id:e},bubbles:!0,composed:!0}))}renderStage(e,t){switch(e.kind){case"video":const i=e.width&&e.height?e.width/e.height:1.7777777777777777;return s`<div
          class="stage video-stage"
          style="aspect-ratio:${i}; width:100%; max-width:${76*i}vh; background:${m(e)};"
        >
          <video
            src=${t}
            poster=${e.hasThumb?n.thumbURL(e.id):d}
            controls
            autoplay
            playsinline
            preload="metadata"
            @loadedmetadata=${this.onVideoReady}
            @timeupdate=${this.onVideoTime}
            @pause=${this.flushProgress}
            @ended=${this.onVideoEnded}
          ></video>
        </div>`;case"gif":case"image":return s`<div class="stage-fit">
          <img src=${t} alt=${e.title} />
        </div>`;case"comic":return this.renderComic(e);case"game":return this.renderGame(e,t);default:return d}}renderComic(e){return s`
      <div class="reader">
        ${this.comic===null?s`<div class="reader-fallback" style="background:${m(e)};">
              <span class="mono" style="color:#fff;">OPENING…</span>
            </div>`:this.comic.readable?this.renderReader(e,this.comic):this.renderComicFallback(e,this.comic)}
      </div>
    `}renderReader(e,t){const i=this.page<=1,a=this.page>=t.pages;return s`
      <div class="reader-stage">
        <img
          class="page-img ${this.fit==="width"?"fit-width":"fit-page"}"
          src=${n.pageURL(e.id,this.page)}
          alt="Page ${this.page} of ${e.title}"
        />
        <button
          class="turn prev"
          title="Previous page"
          ?disabled=${i}
          @click=${()=>this.goPage(this.page-1)}
        >
          ${i?d:s`<span class="material-symbols-rounded" style="font-size:28px;">chevron_left</span>`}
        </button>
        <button
          class="turn next"
          title="Next page"
          ?disabled=${a}
          @click=${()=>this.goPage(this.page+1)}
        >
          ${a?d:s`<span class="material-symbols-rounded" style="font-size:28px;">chevron_right</span>`}
        </button>
      </div>

      <div class="reader-bar">
        <button class="round-btn" title="Previous page" ?disabled=${i} @click=${()=>this.goPage(this.page-1)}>
          <span class="material-symbols-rounded" style="font-size:22px;">chevron_left</span>
        </button>
        <input
          type="range"
          min="1"
          max=${t.pages}
          .value=${String(this.page)}
          @input=${r=>this.goPage(Number(r.target.value))}
          aria-label="Page"
        />
        <span class="mono">${this.page} / ${t.pages}</span>
        <button class="round-btn" title="Next page" ?disabled=${a} @click=${()=>this.goPage(this.page+1)}>
          <span class="material-symbols-rounded" style="font-size:22px;">chevron_right</span>
        </button>
        <button
          class="round-btn"
          title=${this.fit==="width"?"Fit whole page":"Fit to width"}
          @click=${()=>this.setFit(this.fit==="width"?"page":"width")}
        >
          <span class="material-symbols-rounded" style="font-size:22px;"
            >${this.fit==="width"?"fit_screen":"fit_width"}</span
          >
        </button>
      </div>
    `}renderComicFallback(e,t){return s`
      <div class="reader-fallback" style="background:${m(e)};">
        <span class="material-symbols-rounded" style="font-size:40px; color:#fff;">auto_stories</span>
        <span class="mono" style="color:#fff;">CAN'T READ IN APP</span>
        <span style="font-size:12px; color:rgba(255,255,255,0.75);">
          ${t.reason??"Unsupported archive."} Only .cbz / .zip comics can be paged through here.
        </span>
        <a href=${n.streamURL(e.id)} download style="color:#fff; font-size:12px; font-weight:600; margin-top:6px;"
          >Download the file</a
        >
      </div>
    `}renderGame(e,t){const i=e.download?this.hostOf(e.download):"";return s`
      <div class="game">
        <div class="game-cover" style="background:${m(e)};">
          ${e.hasThumb?s`<img
                src=${n.thumbURL(e.id)}
                alt=${e.title}
                style="width:100%; height:100%; object-fit:cover;"
              />`:s`<span class="material-symbols-rounded" style="font-size:48px; color:#fff;">sports_esports</span>`}
        </div>
        <div style="flex:1; min-width:260px; padding-top:8px;">
          <div class="meta-head">
            <h2 class="meta-title">${e.title}</h2>
            ${this.renderActions(!1)}
          </div>
          ${this.editing?this.renderEdit():s`
                <div class="sub">${f.game.label.replace(/s$/,"")}</div>
                <div class="actions">
                  ${this.play?s`<button class="btn-primary" @click=${()=>this.playing=!0}>
                        <span class="material-symbols-rounded fill-icon" style="font-size:20px;">play_arrow</span>
                        Play in browser
                      </button>`:d}
                  ${e.download?s`<a class="btn-primary" href=${e.download} target="_blank" rel="noreferrer">
                        <span class="material-symbols-rounded fill-icon" style="font-size:20px;">open_in_new</span>
                        ${i?`Get it on ${i}`:"Get it"}
                      </a>`:s`<a class="btn-primary" href=${t} download>
                        <span class="material-symbols-rounded fill-icon" style="font-size:20px;">download</span>
                        Download
                      </a>`}
                  <button class="btn-outline" @click=${this.toggleFav}>
                    <span
                      class="material-symbols-rounded"
                      style="font-size:20px; color:${this.favorite?"var(--oppai-fav)":"var(--oppai-text)"};"
                      >${this.favorite?"favorite":"favorite_border"}</span
                    >
                    Favorite
                  </button>
                </div>
                ${this.playing?this.renderPlayer(e):d}
                ${e.notes?s`<p class="desc">${e.notes}</p>`:s`<p class="desc">A title from your library.</p>`}
                ${this.renderTags(e)}
                ${this.renderSaves(e)}
                ${e.gallery&&e.gallery.length?s`<div class="shots">
                      ${e.gallery.map(a=>s`<button
                        class="shot"
                        title="Open full-size screenshot"
                        @click=${()=>this.screenshot=n.proxyURL(a)}
                      ><img loading="lazy" src=${n.proxyURL(a)} alt="screenshot" /></button>`)}
                    </div>`:d}
                <div class="section-label">User gallery</div>
                <div class="shots">
                  ${this.userGallery.map(a=>s`<div class="shot user-shot">
                    ${a.kind==="video"?s`<video controls preload="metadata" src=${n.streamURL(a.id)}></video>`:s`<button class="shot" title="Open full-size upload"
                          @click=${()=>this.screenshot=n.streamURL(a.id)}>
                          <img loading="lazy" src=${n.thumbURL(a.id)} alt=${a.title} />
                        </button>`}
                    <button class="remove-shot" title="Remove from game gallery"
                      @click=${()=>void this.removeGameGallery(e.id,a.id)}>×</button>
                  </div>`)}
                </div>
                <label class="btn-outline gallery-upload">
                  <span class="material-symbols-rounded">add_photo_alternate</span>
                  ${this.galleryUploading?"Uploading…":"Add photos or videos"}
                  <input type="file" accept="image/*,video/*" multiple hidden ?disabled=${this.galleryUploading}
                    @change=${a=>void this.uploadGameGallery(a,e.id)} />
                </label>
                ${e.source?s`<div class="meta-note">
                      Source:
                      <a href=${e.source} target="_blank" rel="noreferrer" style="color:var(--oppai-primary-bright);">link</a>
                    </div>`:d}
              `}
        </div>
      </div>
    `}renderPlayer(e){const t=this.play;if(!t)return d;const i=t.mode==="embed"&&t.embedUrl;return s`
      <div class="play-stage">
        <button class="play-close" title="Stop playing" @click=${()=>this.playing=!1}>×</button>
        ${i?s`<iframe
              src=${t.embedUrl}
              title=${e.title}
              allow="fullscreen; gamepad; autoplay; cross-origin-isolated"
              sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
              referrerpolicy="no-referrer"
            ></iframe>`:s`<iframe
              src=${n.gamePlayURL(e.id)}
              title=${e.title}
              allow="fullscreen; gamepad; autoplay"
              sandbox="allow-scripts allow-pointer-lock allow-popups"
            ></iframe>`}
      </div>
      <p class="play-note">
        ${i?s`Streaming from itch.io — this game has no downloadable build, so it
              isn't stored in your library and needs a connection to play.`:s`Running sandboxed, so the game can't reach the rest of your library —
              which also means it can't save to browser storage. Back its saves up below.`}
      </p>
    `}renderSaves(e){return s`
      <div class="section-label">Save files</div>
      ${this.saves.length?s`<div class="saves">
            ${this.saves.map(t=>s`<div class="save-row">
                <span class="save-name" title=${t.label}>${t.label}</span>
                <span class="save-meta">${S(t.size)} · ${O(t.createdAt)}</span>
                <a class="save-act" title="Download this save" href=${n.gameSaveURL(e.id,t.id)} download>
                  <span class="material-symbols-rounded" style="font-size:20px;">download</span>
                </a>
                <button class="save-act" title="Delete this save"
                  @click=${()=>void this.deleteSave(e.id,t.id)}>
                  <span class="material-symbols-rounded" style="font-size:20px;">delete</span>
                </button>
              </div>`)}
          </div>`:s`<div class="save-empty">No saves backed up yet.</div>`}
      ${this.saveError?s`<div class="save-error">${this.saveError}</div>`:d}
      <label class="btn-outline gallery-upload">
        <span class="material-symbols-rounded">backup</span>
        ${this.saveUploading?"Uploading…":"Back up a save"}
        <input type="file" multiple hidden ?disabled=${this.saveUploading}
          @change=${t=>void this.uploadSave(t,e.id)} />
      </label>
    `}hostOf(e){try{return new URL(e).hostname.replace(/^www\./,"")}catch{return""}}renderActions(e=!0){return s`
      ${e?s`<button class="icon-round" title="Auto-tag" @click=${this.retag} ?disabled=${this.tagging}>
            <span class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-text-dim);"
              >${this.tagging?"hourglass_empty":"auto_awesome"}</span
            >
          </button>`:d}
      ${R(this.media)?s`<button class="icon-round" title="Edit in the studio — regenerate it with its own settings"
            @click=${()=>this.dispatchEvent(new CustomEvent("edit-in-studio",{detail:{id:this.media.id},bubbles:!0,composed:!0}))}>
            <span class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-text-dim);">brush</span>
          </button>`:d}
      <button class="icon-round" title="Edit" @click=${()=>this.startEdit()}>
        <span class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-text-dim);">edit</span>
      </button>
      <button class="icon-round" title="Delete" @click=${this.doDelete}>
        <span class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-error, #f2b8b5);">delete</span>
      </button>
      <button class="icon-round" title="Favorite" @click=${this.toggleFav}>${this.favIcon()}</button>
    `}renderMeta(e){const t=f[e.kind];return s`
      <div class="meta">
        <div class="meta-head">
          <h2 class="meta-title">${e.title}</h2>
          ${this.renderActions()}
        </div>
        ${this.editing?this.renderEdit():s`
              <div class="chips">
                <span class="chip chip-accent">${G(e)||t.label}</span>
                <span class="chip chip-muted">${t.typeLabel}</span>
              </div>
              ${this.renderTags(e)}
              ${e.notes?s`<p class="desc" style="margin-top:16px;">${e.notes}</p>`:d}
              ${e.source?s`<div class="meta-note">
                    Source:
                    <a href=${e.source} target="_blank" rel="noreferrer" style="color:var(--oppai-primary-bright);">link</a>
                  </div>`:d}
            `}
      </div>
    `}renderTags(e){const t=[...e.tags??[]].sort((a,r)=>v(r)-v(a));if(t.length===0)return s`<div class="meta-note" style="margin-top:14px;">
        No tags yet — use the ✨ auto-tag button.
      </div>`;const i=t.some(a=>this.hasTimeline(a));return s`
      <div class="chips">
        ${t.map(a=>this.renderTagChip(a))}
      </div>
      ${i&&this.activeTag==null?s`<div class="meta-note" style="margin-top:10px;">
            Tap a ✨ tag to see where it appears in this video.
          </div>`:d}
    `}renderTagChip(e){const t=v(e),i=t<1,a=i?`${Math.max(1,Math.round(t*100))}%`:"",r=`${e.category}${e.source?" · "+e.source:""}${i?` · in about ${a} of the sampled frames`:""}`;if(!this.hasTimeline(e))return s`<span class="chip chip-muted" title=${r}>${e.name}${i?s`<span class="chip-share">${a}</span>`:d}</span>`;const c=this.activeTag===e.id,h=e.moments.length;return s`<button
      class="chip ${c?"on":"chip-muted"}"
      title="${r} · seen at ${h} point${h===1?"":"s"}"
      aria-pressed=${c}
      @click=${()=>this.toggleTagTimeline(e)}
    >
      <span class="material-symbols-rounded" style="font-size:14px;">auto_awesome</span>
      ${e.name}${i?s`<span class="chip-share">${a}</span>`:d}
    </button>`}};o.styles=[C,U,_`
      :host {
        display: block;
      }
      .wrap {
        max-width: 1100px;
        margin: 0 auto;
        animation: oppai-fade-in-up 0.4s var(--oppai-ease-emphasized) both;
      }
      .round-btn,
      .icon-round,
      .btn-primary,
      .btn-outline {
        transition: transform 0.18s var(--oppai-ease-spring), filter 0.15s ease,
          background 0.2s ease;
      }
      .round-btn:hover:not([disabled]),
      .icon-round:hover,
      .btn-outline:hover {
        transform: translateY(-1px);
        filter: brightness(1.08);
      }
      .btn-primary:hover {
        transform: translateY(-1px);
        filter: brightness(1.05);
      }
      .btn-primary:active,
      .btn-outline:active,
      .icon-round:active {
        transform: scale(0.96);
      }
      .stage {
        border-radius: 20px;
        overflow: hidden;
        position: relative;
      }
      .stage video {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;
      }
      .video-stage { margin-inline: auto; max-height: 76vh; }
      /* Photos and GIFs are laid out around the image rather than inside a fixed
         frame: the picture keeps its own aspect ratio and the container shrinks
         to it, so nothing is letterboxed and no filler bars are drawn. */
      .stage-fit {
        display: flex;
        justify-content: center;
      }
      .stage-fit img {
        display: block;
        width: auto;
        height: auto;
        max-width: 100%;
        max-height: 76vh;
        border-radius: 20px;
        /* A hold opens the app's menu on the picture (long-press.ts); the
           browser's own save-image callout would sit on top of it. */
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }
      .placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 8px;
        color: #fff;
      }
      .mono {
        font: 600 12px ui-monospace, monospace;
        color: var(--oppai-text-dim);
        letter-spacing: 1px;
      }

      /* Comic reader */
      .reader {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
      }
      .reader-stage {
        position: relative;
        width: 100%;
        display: flex;
        justify-content: center;
        min-height: 240px;
      }
      .page-img {
        display: block;
        width: auto;
        height: auto;
        border-radius: 12px;
      }
      .page-img.fit-page {
        max-width: 100%;
        max-height: 74vh;
      }
      .page-img.fit-width {
        width: 100%;
        max-width: 1000px;
      }
      /* Click the left/right of the page to turn it, like any reader. The zones
         sit over the image and only show their chevron on hover. */
      .turn {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 30%;
        border: none;
        background: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.18s ease;
      }
      .turn:hover:not([disabled]) {
        opacity: 1;
      }
      .turn[disabled] {
        cursor: default;
      }
      .turn.prev {
        left: 0;
        justify-content: flex-start;
      }
      .turn.next {
        right: 0;
        justify-content: flex-end;
      }
      .turn span {
        background: rgba(0, 0, 0, 0.45);
        border-radius: 50%;
        padding: 8px;
        color: #fff;
        backdrop-filter: blur(2px);
      }
      .reader-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        max-width: 640px;
      }
      .reader-bar input[type="range"] {
        flex: 1;
        accent-color: var(--oppai-primary);
      }
      .reader-fallback {
        width: 340px;
        max-width: 60vw;
        aspect-ratio: 2 / 3;
        border-radius: 16px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 8px;
        text-align: center;
        padding: 0 20px;
      }
      .round-btn {
        width: 44px;
        height: 44px;
        border-radius: 22px;
        background: var(--oppai-surface-2);
        border: none;
        color: var(--oppai-text);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
      }
      .game {
        display: flex;
        gap: 32px;
        flex-wrap: wrap;
      }
      .game-cover {
        width: 260px;
        aspect-ratio: 3 / 4;
        border-radius: 20px;
        overflow: hidden;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .game h2 {
        font-size: 26px;
        font-weight: 500;
        margin: 0 0 8px;
      }
      .sub {
        font-size: 13px;
        color: var(--oppai-text-muted);
        margin-bottom: 18px;
      }
      .actions {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
      .btn-primary {
        height: 44px;
        padding: 0 24px;
        border-radius: 22px;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        border: none;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        text-decoration: none;
      }
      .btn-outline {
        height: 44px;
        padding: 0 20px;
        border-radius: 22px;
        background: none;
        color: var(--oppai-text);
        border: 1px solid var(--oppai-border-strong);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .desc {
        font-size: 14px;
        line-height: 1.6;
        color: var(--oppai-text-dim);
        max-width: 640px;
      }
      .meta {
        margin-top: 24px;
      }
      .meta-head {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .meta-title {
        font-size: 24px;
        font-weight: 500;
        margin: 0;
        flex: 1;
      }
      .icon-round {
        width: 44px;
        height: 44px;
        border-radius: 22px;
        background: var(--oppai-surface-2);
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .chips {
        display: flex;
        gap: 8px;
        margin-top: 14px;
        flex-wrap: wrap;
      }
      .chip {
        font-size: 12px;
        font-weight: 500;
        padding: 6px 14px;
        border-radius: 14px;
      }
      .chip-accent {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
      }
      .chip-muted {
        background: var(--oppai-surface-2);
        color: var(--oppai-text-dim);
      }
      /* How much of a clip a tag describes, when it is less than all of it. */
      .chip-share {
        margin-left: 6px;
        font-size: 10px;
        font-weight: 600;
        opacity: 0.7;
        letter-spacing: 0.02em;
      }
      /* A tag whose detections can be shown on the timeline. */
      button.chip {
        border: none;
        font: inherit;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: background 0.18s ease, color 0.18s ease, transform 0.18s var(--oppai-ease-spring);
      }
      button.chip:hover {
        transform: translateY(-1px);
      }
      button.chip.on {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
      }

      /* Timeline of AI detections for the selected tag. */
      .timeline {
        margin-top: 12px;
        animation: oppai-fade-in 0.3s var(--oppai-ease-standard) both;
      }
      .rail {
        position: relative;
        height: 22px;
        border-radius: 11px;
        background: var(--oppai-surface-2);
        overflow: hidden;
      }
      .marker {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 8px;
        margin-left: -4px; /* centre the marker on its timestamp */
        padding: 0;
        border: none;
        border-radius: 4px;
        background: var(--oppai-accent);
        cursor: pointer;
        transition: transform 0.15s var(--oppai-ease-spring), filter 0.15s ease;
      }
      .marker:hover,
      .marker:focus-visible {
        transform: scaleX(1.6);
        filter: brightness(1.2);
        outline: none;
      }
      .rail-legend {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--oppai-text-muted);
        margin-top: 8px;
      }
      .meta-note {
        font-size: 12px;
        color: var(--oppai-text-muted);
        margin-top: 12px;
      }

      /* Edit form */
      .edit {
        margin-top: 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        max-width: 560px;
      }
      .edit label {
        font-size: 12px;
        font-weight: 600;
        color: var(--oppai-text-dim);
        display: block;
        margin-bottom: 6px;
      }
      .edit input,
      .edit textarea,
      .edit select {
        width: 100%;
        box-sizing: border-box;
        background: var(--oppai-surface-2);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 12px;
        color: var(--oppai-text);
        font: inherit;
        font-size: 14px;
        padding: 10px 12px;
        outline: none;
      }
      .edit input:focus,
      .edit textarea:focus,
      .edit select:focus {
        border-color: var(--oppai-primary);
      }
      .edit textarea {
        resize: vertical;
        min-height: 72px;
      }
      .tag-edit {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .tag-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: var(--oppai-surface-2);
        color: var(--oppai-text-dim);
        border-radius: 14px;
        padding: 6px 8px 6px 12px;
        font-size: 12px;
        font-weight: 500;
      }
      .tag-pill button {
        background: none;
        border: none;
        color: var(--oppai-text-muted);
        cursor: pointer;
        display: flex;
        padding: 0;
      }
      .tag-add {
        flex: 1;
        min-width: 120px;
      }
      .edit-actions {
        display: flex;
        gap: 10px;
        margin-top: 4px;
      }
      /* Poster picker: the current thumbnail, and a horizontal strip of candidate
         frames laid out in time order so it reads as a timeline you scrub. */
      .poster-picker {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .poster-head {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .poster-current {
        width: 108px;
        aspect-ratio: 16 / 9;
        object-fit: cover;
        border-radius: 8px;
        background: var(--oppai-surface-2, rgba(255, 255, 255, 0.05));
      }
      .poster-copy {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: flex-start;
        font-size: 13px;
        color: var(--oppai-text-muted);
      }
      .poster-error {
        font-size: 12px;
        color: var(--oppai-danger, #ff6b6b);
      }
      .poster-strip {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 6px;
        scroll-snap-type: x proximity;
      }
      .poster-frame {
        flex: 0 0 auto;
        position: relative;
        width: 132px;
        padding: 0;
        border: 2px solid transparent;
        border-radius: 10px;
        overflow: hidden;
        background: none;
        cursor: pointer;
        scroll-snap-align: start;
        transition: border-color 0.12s;
      }
      .poster-frame:hover:not(:disabled) { border-color: var(--oppai-border-strong); }
      .poster-frame.on { border-color: var(--oppai-accent); }
      .poster-frame:disabled { cursor: default; opacity: 0.6; }
      .poster-frame img {
        display: block;
        width: 100%;
        aspect-ratio: 16 / 9;
        object-fit: cover;
      }
      /* The timestamp sits on the frame: it is what tells you where in the video you
         are looking, and a strip of unlabelled stills is a guessing game. */
      .poster-time {
        position: absolute;
        right: 4px;
        bottom: 4px;
        background: rgba(0, 0, 0, 0.66);
        color: #fff;
        font-size: 11px;
        padding: 1px 5px;
        border-radius: 5px;
      }
      /* "Up next" — the rest of the queue as a scrubbable strip under the player.
         The gap is deliberately larger than it looks like it needs to be: the
         player's control bar is drawn *inside* the video, along its bottom edge, so
         the strip's top edge and the scrubber are only ever this far apart. At 14px
         reaching for the scrubber meant crossing the tiles — and the tiles lifted on
         hover, into the very gap you were aiming through. Hence both the clearance
         and the lift being a scale rather than a translate. */
      .upnext {
        margin-top: 32px;
      }
      .upnext-label {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        color: var(--oppai-text-muted);
        margin-bottom: 8px;
      }
      .strip {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        scroll-snap-type: x proximity;
        padding-bottom: 6px;
        scrollbar-width: thin;
      }
      .strip-item {
        position: relative;
        flex: 0 0 auto;
        width: 140px;
        aspect-ratio: 16 / 10;
        border: 2px solid transparent;
        border-radius: 12px;
        overflow: hidden;
        padding: 0;
        background: var(--oppai-surface-2);
        cursor: pointer;
        scroll-snap-align: start;
        transition: transform 0.18s var(--oppai-ease-spring), border-color 0.18s ease;
      }
      .strip-item:hover {
        transform: scale(1.03);
      }
      .strip-item.on {
        border-color: var(--oppai-accent);
      }
      .strip-item img,
      .strip-blank {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .strip-play {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-size: 30px;
        color: #fff;
        text-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
      }
      .strip-next {
        position: absolute;
        left: 4px;
        bottom: 4px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.3px;
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
        padding: 1px 6px;
        border-radius: 6px;
      }
      /* A phone held sideways has room for the film, not a second filmstrip. The
         queue remains intact for arrow/swipe navigation and returns in portrait;
         only its visual chrome is suppressed. */
      @media (orientation: landscape) and (max-height: 600px) {
        .upnext { display: none; }
        .video-stage { max-height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom)); }
      }

      /* Game gallery */
      .shots {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 10px;
        margin-top: 18px;
        max-width: 640px;
      }
      .shot {
        border: 0;
        padding: 0;
        background: none;
        cursor: zoom-in;
      }
      .shots img {
        width: 100%;
        aspect-ratio: 16 / 9;
        object-fit: cover;
        border-radius: 10px;
        background: var(--oppai-surface-2);
      }
      .shot-lightbox {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: grid;
        place-items: center;
        padding: 24px;
        border: 0;
        background: rgba(0, 0, 0, 0.92);
        cursor: zoom-out;
      }
      .shot-lightbox img {
        display: block;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      .gallery-upload { margin-top:12px; display:inline-flex; align-items:center; gap:6px; cursor:pointer; }
      .user-shot { position:relative; }
      .user-shot video { width:100%; height:100%; object-fit:cover; background:#000; }
      .remove-shot { position:absolute; right:4px; top:4px; border:0; border-radius:50%; color:#fff;
        background:rgba(0,0,0,.7); width:26px; height:26px; cursor:pointer; }

      /* Save files */
      .saves { margin-top:10px; max-width:640px; display:flex; flex-direction:column; gap:6px; }
      .save-row {
        display:flex; align-items:center; gap:10px;
        padding:8px 10px; border-radius:10px; background:var(--oppai-surface-2);
      }
      .save-name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .save-meta { color:var(--oppai-text-dim); font-size:12px; white-space:nowrap; }
      .save-act {
        border:0; background:none; cursor:pointer; color:var(--oppai-text-dim);
        display:inline-flex; align-items:center; padding:4px; border-radius:8px;
      }
      .save-act:hover { color:var(--oppai-text); background:rgba(255,255,255,.08); }
      .save-empty { color:var(--oppai-text-dim); font-size:13px; margin-top:8px; }
      .save-error { color:var(--oppai-danger, #ff6b6b); font-size:13px; margin-top:8px; }

      /* HTML5 game player */
      .play-stage {
        position:relative; margin-top:14px; width:100%; max-width:960px;
        aspect-ratio:16 / 9; border-radius:12px; overflow:hidden;
        background:#000; border:1px solid var(--oppai-surface-2);
      }
      .play-stage iframe { width:100%; height:100%; border:0; display:block; background:#000; }
      .play-close {
        position:absolute; right:8px; top:8px; z-index:2;
        border:0; border-radius:50%; width:32px; height:32px; cursor:pointer;
        color:#fff; background:rgba(0,0,0,.75);
      }
      .play-note { color:var(--oppai-text-dim); font-size:12px; margin-top:6px; max-width:640px; }
    `];o.PROGRESS_INTERVAL=10;o.PROGRESS_FLOOR=15;o.PROGRESS_DONE=.97;l([b({attribute:!1})],o.prototype,"media",2);l([b({type:Boolean})],o.prototype,"favorite",2);l([b({attribute:!1})],o.prototype,"queue",2);l([p()],o.prototype,"full",2);l([p()],o.prototype,"activeTag",2);l([p()],o.prototype,"tagging",2);l([p()],o.prototype,"editing",2);l([p()],o.prototype,"saving",2);l([p()],o.prototype,"editTitle",2);l([p()],o.prototype,"editNotes",2);l([p()],o.prototype,"editKind",2);l([p()],o.prototype,"editTags",2);l([p()],o.prototype,"newTag",2);l([p()],o.prototype,"screenshot",2);l([p()],o.prototype,"userGallery",2);l([p()],o.prototype,"galleryUploading",2);l([p()],o.prototype,"saves",2);l([p()],o.prototype,"saveUploading",2);l([p()],o.prototype,"saveError",2);l([p()],o.prototype,"play",2);l([p()],o.prototype,"playing",2);l([p()],o.prototype,"posterFrames",2);l([p()],o.prototype,"posterLoading",2);l([p()],o.prototype,"posterSaving",2);l([p()],o.prototype,"posterChosen",2);l([p()],o.prototype,"posterError",2);l([p()],o.prototype,"posterVersion",2);l([p()],o.prototype,"comic",2);l([p()],o.prototype,"page",2);l([p()],o.prototype,"fit",2);o=l([L("oppai-viewer")],o);function v(e){return e.weight&&e.weight>0?Math.min(1,e.weight):1}function O(e){return e?new Date(e*1e3).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):""}export{o as OppaiViewer,R as studioEditable};
