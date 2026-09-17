import{a as z,w as E,e as l,m as h,av as P,B as R,aw as L,ax as _,G as C,A as n,b as a,ay as f,az as m,l as $,aA as U,K as v,aB as g,ak as O,aC as G,aD as D,M as N,q as M,i as F,N as b,u as p,t as A}from"./index-tGtnXIFt.js";const k="oppai.slideshow",w={dwellSec:8,shuffle:!1},j=2,I=120;function V(){try{const e=localStorage.getItem(k);if(!e)return{...w};const t=JSON.parse(e);return T(t)}catch{return{...w}}}function K(e){const t=T(e);try{localStorage.setItem(k,JSON.stringify(t))}catch{}return t}function T(e){const t=Number(e.dwellSec);return{dwellSec:Number.isFinite(t)?Math.min(I,Math.max(j,Math.round(t))):w.dwellSec,shuffle:!!e.shuffle}}function B(e,t,i,s=Math.random){const o=e.filter(u=>u!==t);if(o.length===0)return null;if(i)return o[Math.floor(s()*o.length)]??null;const c=e.indexOf(t);return c<0?e[0]??null:e[c+1]??null}var q=Object.defineProperty,W=Object.getOwnPropertyDescriptor,d=(e,t,i,s)=>{for(var o=s>1?void 0:s?W(t,i):t,c=e.length-1,u;c>=0;c--)(u=e[c])&&(o=(s?u(t,i,o):u(o))||o);return s&&o&&q(t,i,o),o};let r=class extends z{constructor(){super(...arguments),this.favorite=!1,this.queue=[],this.startAt=0,this.full=null,this.bookmarks=[],this.marking=!1,this.slideshow=V(),this.slideshowOn=!1,this.slideTimer=0,this.activeTag=null,this.tagging=!1,this.editing=!1,this.saving=!1,this.editTitle="",this.editNotes="",this.editDescription="",this.describing=!1,this.editKind="image",this.editTags=[],this.newTag="",this.screenshot="",this.userGallery=[],this.galleryUploading=!1,this.saves=[],this.saveUploading=!1,this.saveError="",this.play=null,this.playing=!1,this.launchy=null,this.launching="",this.checking=!1,this.sources=null,this.sourcesLoading=!1,this.posterFrames=[],this.posterLoading=!1,this.posterSaving=-1,this.posterChosen=-1,this.posterError="",this.posterVersion=0,this.comic=null,this.page=1,this.fit=E(),this.lastReported=0,this.onVideoReady=async e=>{const t=e.target,i=this.media.id;if(this.lastReported=0,this.startAt>0){t.currentTime=this.startAt,this.startAt=0;return}try{const s=await l.getProgress(i);if(this.media.id!==i||s.position<r.PROGRESS_FLOOR)return;const o=t.duration||s.duration;if(o>0&&s.position>o*r.PROGRESS_DONE)return;t.currentTime=s.position,h("Picking up where you left off.")}catch{}},this.onVideoTime=e=>{const t=e.target,i=t.currentTime;Math.abs(i-this.lastReported)<r.PROGRESS_INTERVAL||(this.lastReported=i,this.saveProgress(i,t.duration))},this.flushProgress=e=>{const t=e.target;this.lastReported=t.currentTime,this.saveProgress(t.currentTime,t.duration)},this.onVideoEnded=()=>{this.lastReported=0,l.clearProgress(this.media.id).catch(()=>{}),this.slideshowOn&&this.advanceSlide()},this.onKey=e=>{var s;if(P(e))return;const t=this.full??this.media;if(t.kind==="comic"){this.onComicKey(e);return}if(t.kind!=="video")return;const i=this.videoEl();if(i)switch(e.key){case" ":case"k":e.preventDefault(),i.paused?i.play():i.pause();break;case"j":i.currentTime=Math.max(0,i.currentTime-10);break;case"l":i.currentTime=Math.min(i.duration||1/0,i.currentTime+10);break;case"m":i.muted=!i.muted;break;case"b":this.markMoment();break;case"f":e.preventDefault(),document.fullscreenElement?document.exitFullscreen():(s=i.requestFullscreen)==null||s.call(i);break}},this.cancelEdit=()=>{this.editing=!1}}connectedCallback(){super.connectedCallback(),R(this,"viewer"),this.loadItem(),window.addEventListener("keydown",this.onKey)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("keydown",this.onKey),this.clearMediaSession(),this.stopSlideshow()}playback(){const e=this.videoEl();return e?{position:e.currentTime,duration:Number.isFinite(e.duration)?e.duration:0,paused:e.paused}:null}updated(e){if(e.has("media")){const t=e.get("media");t&&t.id!==this.media.id&&(this.editing=!1,this.activeTag=null,this.loadItem())}(e.has("media")||e.has("queue"))&&this.centerCurrentInQueue(),this.setupMediaSession(),e.has("media")&&this.slideshowOn&&this.armSlide()}centerCurrentInQueue(){const e=this.renderRoot.querySelector(".upnext .strip"),t=e==null?void 0:e.querySelector(".strip-item.on");!e||!t||(e.scrollLeft=Math.max(0,t.offsetLeft-(e.clientWidth-t.offsetWidth)/2))}loadItem(){const e=this.media;this.full=e,l.getMedia(e.id).then(t=>this.full=t).catch(()=>this.full=e),this.comic=null,e.kind==="comic"&&this.loadComic(e.id),this.bookmarks=[],(e.kind==="video"||e.kind==="gif")&&l.bookmarks(e.id).then(t=>{this.media.id===e.id&&(this.bookmarks=t.bookmarks)}).catch(()=>{}),this.userGallery=[],this.saves=[],this.saveError="",this.play=null,this.playing=!1,this.sources=null,this.launching="",e.kind==="game"&&(this.loadGameGallery(e.id),this.loadSaves(e.id),this.probePlayable(e.id),l.launchyStatus().then(t=>this.launchy=t).catch(()=>this.launchy=null))}async checkRemote(e){this.checking=!0;try{const t=await l.checkGameRemote(e);t.error?h(t.error,"error"):h(t.changed?`A newer version is out: ${t.remote.latestVersion}.`:"You have the latest version."),this.full&&this.full.id===e&&(this.full={...this.full,remote:t.remote}),this.dispatchEvent(new CustomEvent("changed",{bubbles:!0,composed:!0}))}catch(t){h(t.message,"error")}finally{this.checking=!1}}async acknowledgeRemote(e){try{const t=await l.acknowledgeGameRemote(e);this.full&&this.full.id===e&&(this.full={...this.full,remote:t}),this.dispatchEvent(new CustomEvent("changed",{bubbles:!0,composed:!0}))}catch(t){h(t.message,"error")}}async loadSources(e){this.sourcesLoading=!0;try{this.sources=await l.gameSources(e)}catch(t){h(t.message,"error")}finally{this.sourcesLoading=!1}}async launchOnPC(e){try{const t=await l.launchyLaunch(e);this.launching=t.id;const i=Date.now();for(;this.launching===t.id&&Date.now()-i<3e4;){await new Promise(o=>setTimeout(o,1500));const s=await l.launchyLaunchStatus(t.id);if(s.status==="done"){h("Launchy started it.");break}if(s.status==="failed"){h(s.error||"Launchy could not start it.","error");break}}}catch(t){h(t.message,"error")}finally{this.launching="",l.launchyStatus().then(t=>this.launchy=t).catch(()=>{})}}async loadSaves(e){try{const t=await l.gameSaves(e);this.media.id===e&&(this.saves=t.items)}catch{this.media.id===e&&(this.saves=[])}}async probePlayable(e){try{const t=await l.gamePlayInfo(e);this.media.id===e&&(this.play=t.playable?t:null)}catch{this.media.id===e&&(this.play=null)}}async uploadSave(e,t){const i=e.target,s=[...i.files??[]];if(i.value="",!(!s.length||this.saveUploading)){this.saveUploading=!0,this.saveError="";try{for(const o of s){const c=await l.uploadGameSave(t,o);this.saves=[c,...this.saves]}}catch(o){this.saveError=o instanceof Error?o.message:"Couldn't upload that save."}finally{this.saveUploading=!1}}}async deleteSave(e,t){try{await l.deleteGameSave(e,t),this.saves=this.saves.filter(i=>i.id!==t)}catch(i){this.saveError=i instanceof Error?i.message:"Couldn't delete that save."}}async loadGameGallery(e){try{const t=await l.gameGallery(e);this.media.id===e&&(this.userGallery=t.items)}catch{this.userGallery=[]}}async uploadGameGallery(e,t){const i=e.target,s=[...i.files??[]];if(i.value="",!(!s.length||this.galleryUploading)){this.galleryUploading=!0;try{for(const o of s)this.userGallery=[...this.userGallery,await l.uploadGameGallery(t,o)]}finally{this.galleryUploading=!1}}}async removeGameGallery(e,t){await l.removeGameGallery(e,t),this.userGallery=this.userGallery.filter(i=>i.id!==t)}async loadComic(e){try{const t=await l.comicInfo(e);if(this.media.id!==e)return;if(this.comic=t,t.readable&&t.pages>0){this.page=Math.min(Math.max(L(e),1),t.pages),this.preloadPage(e,this.page+1);try{const i=await l.getProgress(e),s=Math.round(i.position);this.media.id===e&&s>=1&&s<=t.pages&&s!==this.page&&(this.page=s,this.preloadPage(e,s+1))}catch{}}}catch(t){if(this.media.id!==e)return;this.comic={readable:!1,pages:0,reason:t.message}}}preloadPage(e,t){var i;!((i=this.comic)!=null&&i.readable)||t<1||t>this.comic.pages||(new Image().src=l.pageURL(e,t))}goPage(e){var s,o;if(!((s=this.comic)!=null&&s.readable))return;const t=this.full??this.media,i=Math.min(Math.max(e,1),this.comic.pages);i!==this.page&&(this.page=i,_(t.id,i),l.setProgress(t.id,i).catch(()=>{}),this.preloadPage(t.id,i+1),this.fit==="width"&&((o=this.renderRoot.querySelector(".reader-stage"))==null||o.scrollIntoView({block:"start"})))}setFit(e){this.fit=e,C(e)}toggleSlideshow(){this.slideshowOn?this.stopSlideshow():(this.slideshowOn=!0,this.armSlide(),h(this.slideshow.shuffle?"Shuffling through.":"Playing through, in order."))}stopSlideshow(){window.clearTimeout(this.slideTimer),this.slideTimer=0,this.slideshowOn=!1}setSlideshow(e){this.slideshow=K({...this.slideshow,...e}),this.slideshowOn&&this.armSlide()}armSlide(){window.clearTimeout(this.slideTimer),this.slideTimer=0,(this.full??this.media).kind!=="video"&&(this.slideTimer=window.setTimeout(()=>this.advanceSlide(),this.slideshow.dwellSec*1e3))}advanceSlide(){if(!this.slideshowOn)return;const e=B(this.queue.map(t=>t.id),this.media.id,this.slideshow.shuffle);if(e==null){this.stopSlideshow(),h("That's the end of the run.");return}this.jumpTo(e)}renderSlideshowBar(){const e=this.full??this.media;return e.kind==="comic"||e.kind==="game"||this.queue.length<2?n:a`
      <div class="slidebar ${this.slideshowOn?"on":""}">
        <button class="icon-round" title=${this.slideshowOn?"Stop the slideshow":"Play through from here"} @click=${()=>this.toggleSlideshow()}>
          <span class="material-symbols-rounded" style="font-size:22px;">${this.slideshowOn?"pause":"play_arrow"}</span>
        </button>
        <button class="icon-round ${this.slideshow.shuffle?"lit":""}" title=${this.slideshow.shuffle?"Shuffling — click for in order":"In order — click to shuffle"}
          @click=${()=>this.setSlideshow({shuffle:!this.slideshow.shuffle})}>
          <span class="material-symbols-rounded" style="font-size:22px;">casino</span>
        </button>
        <label class="dwell">Stills for
          <select .value=${String(this.slideshow.dwellSec)} @change=${t=>this.setSlideshow({dwellSec:Number(t.target.value)})}>
            ${[3,5,8,12,20,30].map(t=>a`<option value=${t} ?selected=${t===this.slideshow.dwellSec}>${t}s</option>`)}
          </select>
        </label>
        ${this.slideshowOn?a`<span class="slide-note">videos play through, then the next one comes on</span>`:n}
      </div>
    `}async markMoment(){var o;const e=this.videoEl(),t=this.full??this.media,i=e?e.currentTime:0,s=(o=window.prompt(`Bookmark ${f(i)} of “${t.title}” as…`,""))==null?void 0:o.trim();if(s!==void 0){this.marking=!0;try{const c=await l.addBookmark(t.id,i,s);this.media.id===t.id&&(this.bookmarks=[...this.bookmarks,c].sort((u,S)=>u.position-S.position)),h(`Marked ${f(i)}.`)}catch(c){h(c.message,"error")}finally{this.marking=!1}}}async dropBookmark(e){try{await l.deleteBookmark(e.id),this.bookmarks=this.bookmarks.filter(t=>t.id!==e.id)}catch(t){h(t.message,"error")}}renderBookmarks(e){return e.kind!=="video"||this.bookmarks.length===0?n:a`
      <div class="section-label">Moments</div>
      <div class="moments">
        ${this.bookmarks.map(t=>a`
          <div class="moment">
            <button class="moment-open" title="Jump to ${f(t.position)}" @click=${()=>this.seekTo(t.position)}>
              <img src=${l.bookmarkThumbURL(t.id)} alt="" loading="lazy" @error=${i=>i.target.style.visibility="hidden"} />
              <span class="moment-time">${f(t.position)}</span>
              ${t.label?a`<span class="moment-label">${t.label}</span>`:n}
            </button>
            <button class="moment-drop" title="Remove this bookmark" @click=${()=>void this.dropBookmark(t)}>
              <span class="material-symbols-rounded" style="font-size:16px;">close</span>
            </button>
          </div>`)}
      </div>
    `}saveProgress(e,t){const i=this.media.id;if(e<r.PROGRESS_FLOOR||t>0&&e>t*r.PROGRESS_DONE){l.clearProgress(i).catch(()=>{});return}l.setProgress(i,e).catch(()=>{})}videoEl(){var e;return((e=this.renderRoot)==null?void 0:e.querySelector("video"))??null}onComicKey(e){var t;if((t=this.comic)!=null&&t.readable)switch(e.key){case"ArrowRight":case"PageDown":case" ":e.preventDefault(),this.goPage(this.page+1);break;case"ArrowLeft":case"PageUp":e.preventDefault(),this.goPage(this.page-1);break;case"Home":e.preventDefault(),this.goPage(1);break;case"End":e.preventDefault(),this.goPage(this.comic.pages);break}}emitNavigate(e){this.dispatchEvent(new CustomEvent("navigate",{detail:{dir:e},bubbles:!0,composed:!0}))}setupMediaSession(){const e=this.full??this.media;if(e.kind!=="video"||!("mediaSession"in navigator))return;const t=this.videoEl();if(!t)return;const i=navigator.mediaSession;try{i.metadata=new MediaMetadata({title:e.title,artist:"OppaiLib"})}catch{}const s=(o,c)=>{try{i.setActionHandler(o,c)}catch{}};s("play",()=>void t.play()),s("pause",()=>t.pause()),s("seekbackward",o=>{t.currentTime=Math.max(0,t.currentTime-(o.seekOffset??10))}),s("seekforward",o=>{t.currentTime=Math.min(t.duration||1/0,t.currentTime+(o.seekOffset??10))}),s("seekto",o=>{o.seekTime!=null&&(t.currentTime=o.seekTime)}),s("previoustrack",()=>this.emitNavigate(-1)),s("nexttrack",()=>this.emitNavigate(1))}clearMediaSession(){if(!("mediaSession"in navigator))return;const e=navigator.mediaSession,t=["play","pause","seekbackward","seekforward","seekto","previoustrack","nexttrack"];for(const i of t)try{e.setActionHandler(i,null)}catch{}e.metadata=null}toggleFav(){this.dispatchEvent(new CustomEvent("toggle-favorite",{bubbles:!0,composed:!0}))}async describe(){this.describing=!0;try{const e=await l.describe(this.media.id);this.full&&(this.full={...this.full,description:e.description}),this.dispatchEvent(new CustomEvent("changed",{bubbles:!0,composed:!0})),h("Described.","success")}catch(e){console.error("describe",e),h(`Describing failed: ${e.message}`,"error")}finally{this.describing=!1}}async retag(){this.tagging=!0;try{const e=await l.autotag(this.media.id);this.full&&(this.full={...this.full,tags:e.tags}),this.activeTag=null,this.dispatchEvent(new CustomEvent("changed",{bubbles:!0,composed:!0})),h(e.tags.length?`Tags refreshed — ${e.tags.length} found.`:"Tagging finished, but nothing cleared your confidence threshold.","success")}catch(e){console.error("autotag",e),h(`Auto-tagging failed: ${e.message}`,"error")}finally{this.tagging=!1}}hasTimeline(e){var i;const t=this.full??this.media;return t.kind==="video"&&!!t.duration&&!!((i=e.moments)!=null&&i.length)}toggleTagTimeline(e){this.hasTimeline(e)&&(this.activeTag=this.activeTag===e.id?null:e.id)}seekTo(e){const t=this.videoEl();t&&(t.currentTime=e,t.play())}renderTimeline(e){var s;if(e.kind!=="video"||!e.duration)return n;const t=(e.tags??[]).find(o=>o.id===this.activeTag);if(!((s=t==null?void 0:t.moments)!=null&&s.length))return n;const i=e.duration;return a`
      <div class="timeline">
        <div class="rail">
          ${t.moments.map(o=>a`<button
              class="marker"
              style="left:${Math.min(100,o/i*100)}%"
              title="Jump to ${m(o)}"
              aria-label="Jump to ${m(o)}"
              @click=${()=>this.seekTo(o)}
            ></button>`)}
        </div>
        <div class="rail-legend">
          <span class="material-symbols-rounded" style="font-size:16px;">auto_awesome</span>
          <span
            >“${t.name}” detected at ${t.moments.map(o=>m(o)).join(", ")} — click a
            marker to jump.</span
          >
        </div>
      </div>
    `}startEdit(){const e=this.full??this.media;this.editTitle=e.title,this.editNotes=e.notes??"",this.editDescription=e.description??"",this.editKind=e.kind,this.editTags=(e.tags??[]).map(t=>t.name),this.newTag="",this.editing=!0}removeEditTag(e){this.editTags=this.editTags.filter(t=>t!==e)}commitNewTag(){const e=this.newTag.trim();e&&!this.editTags.includes(e)&&(this.editTags=[...this.editTags,e]),this.newTag=""}onTagKeydown(e){(e.key==="Enter"||e.key===",")&&(e.preventDefault(),this.commitNewTag())}async saveEdit(){const e=this.full??this.media;this.commitNewTag();const t=(e.tags??[]).map(o=>o.name),i=this.editTags.filter(o=>!t.includes(o)),s=t.filter(o=>!this.editTags.includes(o));this.saving=!0;try{const o=await l.updateMedia(e.id,{title:this.editTitle,notes:this.editNotes,...this.editDescription!==(e.description??"")?{description:this.editDescription}:{},kind:this.editKind,addTags:i,removeTags:s});this.full=o,this.editing=!1,this.dispatchEvent(new CustomEvent("changed",{bubbles:!0,composed:!0}))}catch(o){console.error("save edit",o)}finally{this.saving=!1}}async doDelete(){const e=this.full??this.media;if(confirm(`Delete "${e.title}"? This cannot be undone.`))try{await l.deleteMedia(e.id);const t=$("libraryDelete");h(t.message,"success",{emotion:t.emotion,intensity:t.intensity}),this.dispatchEvent(new CustomEvent("deleted",{detail:{id:e.id},bubbles:!0,composed:!0}))}catch(t){console.error("delete",t)}}renderEdit(){const e=this.full??this.media;return a`
      <div class="edit">
        <div>
          <label>Title</label>
          <input
            .value=${this.editTitle}
            @input=${t=>this.editTitle=t.target.value}
          />
        </div>
        <div>
          <label>Type</label>
          <select
            .value=${this.editKind}
            @change=${t=>this.editKind=t.target.value}
          >
            ${U.map(t=>a`<option value=${t} ?selected=${t===this.editKind}>${v[t].label}</option>`)}
          </select>
        </div>
        <div>
          <label>Notes</label>
          <textarea
            .value=${this.editNotes}
            @input=${t=>this.editNotes=t.target.value}
          ></textarea>
        </div>
        ${e.kind!=="comic"&&e.kind!=="game"?a`<div>
              <label>Description</label>
              <textarea
                placeholder="What the picture shows — written by the vision model, or by you"
                .value=${this.editDescription}
                @input=${t=>this.editDescription=t.target.value}
              ></textarea>
            </div>`:n}
        <div>
          <label>Tags</label>
          <div class="tag-edit">
            ${this.editTags.map(t=>a`<span class="tag-pill"
                >${t}
                <button title="Remove" @click=${()=>this.removeEditTag(t)}>
                  <span class="material-symbols-rounded" style="font-size:16px;">close</span>
                </button></span
              >`)}
            <input
              class="tag-add"
              placeholder="Add tag…"
              .value=${this.newTag}
              @input=${t=>this.newTag=t.target.value}
              @keydown=${this.onTagKeydown}
              @blur=${()=>this.commitNewTag()}
            />
          </div>
        </div>
        ${(this.full??this.media).kind==="video"?this.renderPosterPicker():n}
        <div class="edit-actions">
          <button class="btn-primary" @click=${this.saveEdit} ?disabled=${this.saving}>
            <span class="material-symbols-rounded" style="font-size:20px;">save</span>
            ${this.saving?"Saving…":"Save"}
          </button>
          <button class="btn-outline" @click=${this.cancelEdit} ?disabled=${this.saving}>Cancel</button>
        </div>
      </div>
    `}async loadPosterFrames(){const e=this.full??this.media;if(!this.posterLoading){this.posterLoading=!0,this.posterError="";try{const t=await l.posterFrames(e.id);if((this.full??this.media).id!==e.id)return;this.posterFrames=t.frames}catch(t){this.posterError=t.message||"Couldn't read frames from this video."}finally{this.posterLoading=!1}}}async choosePoster(e){const t=this.full??this.media,i=this.posterFrames[e];if(!(!i||this.posterSaving>=0)){this.posterSaving=e,this.posterError="";try{await l.setPoster(t.id,i.at),this.posterChosen=e,this.posterVersion=Date.now();const s=$("save");h("New thumbnail set.","success",{emotion:s.emotion,intensity:s.intensity})}catch(s){this.posterError=s.message||"Couldn't set that frame as the thumbnail."}finally{this.posterSaving=-1}}}renderPosterPicker(){const e=this.full??this.media;return a`<div class="poster-picker">
      <label>Thumbnail</label>
      <div class="poster-head">
        <img
          class="poster-current"
          src=${`${l.thumbURL(e.id)}${this.posterVersion?`?v=${this.posterVersion}`:""}`}
          alt="Current thumbnail"
          @error=${t=>t.target.style.visibility="hidden"}
        />
        <div class="poster-copy">
          <span>Pick the frame this video shows in the library.</span>
          ${this.posterFrames.length?n:a`<button class="btn-outline" ?disabled=${this.posterLoading} @click=${()=>this.loadPosterFrames()}>
                ${this.posterLoading?"Reading frames…":"Choose a frame"}
              </button>`}
        </div>
      </div>
      ${this.posterError?a`<div class="poster-error" role="alert">${this.posterError}</div>`:n}
      ${this.posterFrames.length?a`<div class="poster-strip">
            ${this.posterFrames.map((t,i)=>a`<button
              class="poster-frame ${this.posterChosen===i?"on":""}"
              title=${`Use the frame at ${m(t.at)}`}
              ?disabled=${this.posterSaving>=0}
              @click=${()=>this.choosePoster(i)}
            >
              <img src=${t.image} alt="" loading="lazy" />
              <span class="poster-time">
                ${this.posterSaving===i?"Saving…":m(t.at)}
              </span>
            </button>`)}
          </div>`:n}
    </div>`}favIcon(){return a`<span
      class="material-symbols-rounded fill-icon"
      style="font-size:22px; color:${this.favorite?"var(--oppai-fav)":"var(--oppai-text)"};"
      >${this.favorite?"favorite":"favorite_border"}</span
    >`}render(){const e=this.full??this.media,t=l.streamURL(e.id);return a`
      <div class="wrap">
        ${this.renderStage(e,t)}
        ${this.renderSlideshowBar()}
        ${e.kind==="video"||e.kind==="image"?this.renderUpNext(e):n}
        ${this.renderTimeline(e)}
        ${this.renderBookmarks(e)}
        ${e.kind==="game"?n:this.renderMeta(e)}
      </div>
      ${this.screenshot?a`<button class="shot-lightbox" aria-label="Close screenshot" @click=${()=>this.screenshot=""}>
            <img src=${this.screenshot} alt="Full-size game screenshot" />
          </button>`:n}
    `}renderUpNext(e){const t=this.queue.filter(s=>s.kind==="video"||s.kind==="image");if(t.some(s=>s.id===e.id)||t.unshift(e),t.length<2)return n;const i=t.findIndex(s=>s.id===e.id);return a`
      <div class="upnext">
        <div class="upnext-label">Videos & images</div>
        <div class="strip">
          ${t.map((s,o)=>a`
              <button
                class="strip-item ${s.id===e.id?"on":""}"
                title=${s.title}
                aria-current=${s.id===e.id}
                @click=${()=>this.jumpTo(s.id)}
              >
                ${s.hasThumb?a`<img src=${l.thumbURL(s.id)} loading="lazy" alt=${s.title} />`:a`<span class="strip-blank" style="background:${g(s)};"></span>`}
                ${s.kind==="video"?a`<span class="strip-play material-symbols-rounded">play_circle</span>`:n}
                ${o===i+1?a`<span class="strip-next">Next</span>`:n}
              </button>
            `)}
        </div>
      </div>
    `}jumpTo(e){e!==this.media.id&&this.dispatchEvent(new CustomEvent("jump",{detail:{id:e},bubbles:!0,composed:!0}))}renderStage(e,t){switch(e.kind){case"video":const i=e.width&&e.height?e.width/e.height:1.7777777777777777;return a`<div
          class="stage video-stage"
          style="aspect-ratio:${i}; width:100%; max-width:${76*i}vh; background:${g(e)};"
        >
          <video
            src=${t}
            poster=${e.hasThumb?l.thumbURL(e.id):n}
            controls
            autoplay
            playsinline
            preload="metadata"
            @loadedmetadata=${this.onVideoReady}
            @timeupdate=${this.onVideoTime}
            @pause=${this.flushProgress}
            @ended=${this.onVideoEnded}
          ></video>
        </div>`;case"gif":case"image":return a`<div class="stage-fit">
          <img src=${t} alt=${e.title} />
        </div>`;case"comic":return this.renderComic(e);case"game":return this.renderGame(e,t);default:return n}}renderComic(e){return a`
      <div class="reader">
        ${this.comic===null?a`<div class="reader-fallback" style="background:${g(e)};">
              <span class="mono" style="color:#fff;">OPENING…</span>
            </div>`:this.comic.readable?this.renderReader(e,this.comic):this.renderComicFallback(e,this.comic)}
      </div>
    `}renderReader(e,t){const i=this.page<=1,s=this.page>=t.pages;return a`
      <div class="reader-stage">
        <img
          class="page-img ${this.fit==="width"?"fit-width":"fit-page"}"
          src=${l.pageURL(e.id,this.page)}
          alt="Page ${this.page} of ${e.title}"
        />
        <button
          class="turn prev"
          title="Previous page"
          ?disabled=${i}
          @click=${()=>this.goPage(this.page-1)}
        >
          ${i?n:a`<span class="material-symbols-rounded" style="font-size:28px;">chevron_left</span>`}
        </button>
        <button
          class="turn next"
          title="Next page"
          ?disabled=${s}
          @click=${()=>this.goPage(this.page+1)}
        >
          ${s?n:a`<span class="material-symbols-rounded" style="font-size:28px;">chevron_right</span>`}
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
          @input=${o=>this.goPage(Number(o.target.value))}
          aria-label="Page"
        />
        <span class="mono">${this.page} / ${t.pages}</span>
        <button class="round-btn" title="Next page" ?disabled=${s} @click=${()=>this.goPage(this.page+1)}>
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
    `}renderComicFallback(e,t){return a`
      <div class="reader-fallback" style="background:${g(e)};">
        <span class="material-symbols-rounded" style="font-size:40px; color:#fff;">auto_stories</span>
        <span class="mono" style="color:#fff;">CAN'T READ IN APP</span>
        <span style="font-size:12px; color:rgba(255,255,255,0.75);">
          ${t.reason??"Unsupported archive."} Only .cbz / .zip comics can be paged through here.
        </span>
        <a href=${l.streamURL(e.id)} download style="color:#fff; font-size:12px; font-weight:600; margin-top:6px;"
          >Download the file</a
        >
      </div>
    `}renderGame(e,t){var s,o;const i=e.download?this.hostOf(e.download):"";return a`
      <div class="game">
        <div class="game-cover" style="background:${g(e)};">
          ${e.hasThumb?a`<img
                src=${l.thumbURL(e.id)}
                alt=${e.title}
                style="width:100%; height:100%; object-fit:cover;"
              />`:a`<span class="material-symbols-rounded" style="font-size:48px; color:#fff;">sports_esports</span>`}
        </div>
        <div style="flex:1; min-width:260px; padding-top:8px;">
          <div class="meta-head">
            <h2 class="meta-title">${e.title}</h2>
            ${this.renderActions(!1)}
          </div>
          ${this.editing?this.renderEdit():a`
                <div class="sub">${v.game.label.replace(/s$/,"")}</div>
                <div class="actions">
                  ${this.play?a`<button class="btn-primary" @click=${()=>this.playing=!0}>
                        <span class="material-symbols-rounded fill-icon" style="font-size:20px;">play_arrow</span>
                        Play in browser
                      </button>`:n}
                  ${e.download?a`<a class="btn-primary" href=${e.download} target="_blank" rel="noreferrer">
                        <span class="material-symbols-rounded fill-icon" style="font-size:20px;">open_in_new</span>
                        ${i?`Get it on ${i}`:"Get it"}
                      </a>`:a`<a class="btn-primary" href=${t} download>
                        <span class="material-symbols-rounded fill-icon" style="font-size:20px;">download</span>
                        Download
                      </a>`}
                  ${(s=e.launchy)!=null&&s.installed&&((o=this.launchy)!=null&&o.connected)?a`<button class="btn-primary" ?disabled=${!!this.launching} title="Start it in Launchy on your PC"
                        @click=${()=>void this.launchOnPC(e.id)}>
                        <span class="material-symbols-rounded fill-icon" style="font-size:20px;">${this.launching?"hourglass_top":"play_arrow"}</span>
                        ${this.launching?"Starting…":this.launchy.running.includes(e.id)?"Running on PC":"Launch on PC"}
                      </button>`:n}
                  <button class="btn-outline" @click=${this.toggleFav}>
                    <span
                      class="material-symbols-rounded"
                      style="font-size:20px; color:${this.favorite?"var(--oppai-fav)":"var(--oppai-text)"};"
                      >${this.favorite?"favorite":"favorite_border"}</span
                    >
                    Favorite
                  </button>
                </div>
                ${this.playing?this.renderPlayer(e):n}
                ${this.renderRemote(e)}
                ${this.renderLaunchy(e)}
                ${e.description?a`<p class="desc described">${e.description}</p>`:n}
                ${e.notes?a`<p class="desc">${e.notes}</p>`:e.description?n:a`<p class="desc">A title from your library.</p>`}
                ${this.renderTags(e)}
                ${this.renderSaves(e)}
                ${e.gallery&&e.gallery.length?a`<div class="shots">
                      ${e.gallery.map(c=>a`<button
                        class="shot"
                        title="Open full-size screenshot"
                        @click=${()=>this.screenshot=l.proxyURL(c)}
                      ><img loading="lazy" src=${l.proxyURL(c)} alt="screenshot" /></button>`)}
                    </div>`:n}
                <div class="section-label">User gallery</div>
                <div class="shots">
                  ${this.userGallery.map(c=>a`<div class="shot user-shot">
                    ${c.kind==="video"?a`<video controls preload="metadata" src=${l.streamURL(c.id)}></video>`:a`<button class="shot" title="Open full-size upload"
                          @click=${()=>this.screenshot=l.streamURL(c.id)}>
                          <img loading="lazy" src=${l.thumbURL(c.id)} alt=${c.title} />
                        </button>`}
                    <button class="remove-shot" title="Remove from game gallery"
                      @click=${()=>void this.removeGameGallery(e.id,c.id)}>×</button>
                  </div>`)}
                </div>
                <label class="btn-outline gallery-upload">
                  <span class="material-symbols-rounded">add_photo_alternate</span>
                  ${this.galleryUploading?"Uploading…":"Add photos or videos"}
                  <input type="file" accept="image/*,video/*" multiple hidden ?disabled=${this.galleryUploading}
                    @change=${c=>void this.uploadGameGallery(c,e.id)} />
                </label>
                ${e.source?a`<div class="meta-note">
                      Source:
                      <a href=${e.source} target="_blank" rel="noreferrer" style="color:var(--oppai-primary-bright);">link</a>
                    </div>`:n}
              `}
        </div>
      </div>
    `}renderPlayer(e){const t=this.play;if(!t)return n;const i=t.mode==="embed"&&t.embedUrl;return a`
      <div class="play-stage">
        <button class="play-close" title="Stop playing" @click=${()=>this.playing=!1}>×</button>
        ${i?a`<iframe
              src=${t.embedUrl}
              title=${e.title}
              allow="fullscreen; gamepad; autoplay; cross-origin-isolated"
              sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
              referrerpolicy="no-referrer"
            ></iframe>`:a`<iframe
              src=${l.gamePlayURL(e.id)}
              title=${e.title}
              allow="fullscreen; gamepad; autoplay"
              sandbox="allow-scripts allow-pointer-lock allow-popups"
            ></iframe>`}
      </div>
      <p class="play-note">
        ${i?a`Streaming from itch.io — this game has no downloadable build, so it
              isn't stored in your library and needs a connection to play.`:a`Running sandboxed, so the game can't reach the rest of your library —
              which also means it can't save to browser storage. Back its saves up below.`}
      </p>
    `}renderSaves(e){return a`
      <div class="section-label">Save files</div>
      ${this.saves.length?a`<div class="saves">
            ${this.saves.map(t=>a`<div class="save-row">
                <span class="save-name" title=${t.label}>${t.label}</span>
                <span class="save-meta">${O(t.size)} · ${x(t.createdAt)}</span>
                <a class="save-act" title="Download this save" href=${l.gameSaveURL(e.id,t.id)} download>
                  <span class="material-symbols-rounded" style="font-size:20px;">download</span>
                </a>
                <button class="save-act" title="Delete this save"
                  @click=${()=>void this.deleteSave(e.id,t.id)}>
                  <span class="material-symbols-rounded" style="font-size:20px;">delete</span>
                </button>
              </div>`)}
          </div>`:a`<div class="save-empty">No saves backed up yet.</div>`}
      ${this.saveError?a`<div class="save-error">${this.saveError}</div>`:n}
      <label class="btn-outline gallery-upload">
        <span class="material-symbols-rounded">backup</span>
        ${this.saveUploading?"Uploading…":"Back up a save"}
        <input type="file" multiple hidden ?disabled=${this.saveUploading}
          @change=${t=>void this.uploadSave(t,e.id)} />
      </label>
    `}renderRemote(e){const t=e.remote;return t?a`
      <div class="remote ${t.hasUpdate?"update":""}">
        <div class="remote-head">
          <span class="material-symbols-rounded" style="font-size:18px; color:${t.hasUpdate?"var(--oppai-accent)":"inherit"};"
            >${t.hasUpdate?"new_releases":"check_circle"}</span>
          ${t.hasUpdate?a`<b>Update available:</b> ${t.knownVersion||"your version"} → ${t.latestVersion}`:a`<b>${t.knownVersion||t.latestVersion||"Version unknown"}</b> on ${t.label}${t.checkedAt?a` · checked ${x(t.checkedAt)}`:n}`}
          <div class="remote-acts">
            <button class="icon-round" title="Check for a new version" ?disabled=${this.checking} @click=${()=>void this.checkRemote(e.id)}>
              <span class="material-symbols-rounded" style="font-size:20px; color:var(--oppai-text-dim);">${this.checking?"hourglass_empty":"update"}</span>
            </button>
            ${t.hasUpdate?a`<button class="icon-round" title="I have this version now" @click=${()=>void this.acknowledgeRemote(e.id)}>
                  <span class="material-symbols-rounded" style="font-size:20px; color:var(--oppai-text-dim);">done</span>
                </button>`:n}
            <button class="icon-round" title="Where to get it" ?disabled=${this.sourcesLoading} @click=${()=>void this.loadSources(e.id)}>
              <span class="material-symbols-rounded" style="font-size:20px; color:var(--oppai-text-dim);">${this.sourcesLoading?"hourglass_empty":"download"}</span>
            </button>
          </div>
        </div>
        ${t.hasUpdate&&t.changelog?a`<div class="log">${t.changelog}</div>`:n}
        ${this.sources?this.sources.degraded?a`<div class="log">The page could not be read just now — <a href=${t.url} target="_blank" rel="noreferrer" style="color:var(--oppai-primary-bright);">open it yourself</a>.</div>`:a`<div class="srcs">
                ${this.sources.sources.map(i=>a`<a class="src" href=${i.url} target="_blank" rel="noreferrer" title=${i.url}>
                  <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span>${i.label}
                </a>`)}
                ${this.sources.sources.length?n:this.sources.signedIn?a`<span>No downloads are listed on the page.</span>`:a`<span>${t.label} hides its download links from guests — sign in on the Games tab to see them.</span>`}
              </div>`:n}
      </div>
    `:n}renderLaunchy(e){var s,o;const t=e.launchy;if(!t)return n;const i=t.playSeconds>=3600?`${(t.playSeconds/3600).toFixed(1)} h`:`${Math.round(t.playSeconds/60)} min`;return a`
      <div class="remote">
        <div class="remote-head">
          <span class="material-symbols-rounded" style="font-size:18px;">${(s=this.launchy)!=null&&s.connected?"cloud_done":"cloud_off"}</span>
          <b>${(o=this.launchy)!=null&&o.connected?"Launchy is connected":"Launchy is offline"}</b>
          <span>· ${t.installed?"installed on the PC":"in Launchy, not installed"}${t.version?` · v${t.version}`:""}</span>
        </div>
        <div style="margin-top:6px;">
          <span class="pc-stat"><span class="material-symbols-rounded" style="font-size:16px;">history</span>${i} played</span>
          <span class="pc-stat"><span class="material-symbols-rounded" style="font-size:16px;">play_circle</span>${t.launchCount} launches</span>
          ${t.lastPlayed?a`<span class="pc-stat">last played ${x(t.lastPlayed)}</span>`:n}
        </div>
      </div>
    `}hostOf(e){try{return new URL(e).hostname.replace(/^www\./,"")}catch{return""}}renderActions(e=!0){var t;return a`
      ${e?a`<button class="icon-round" title="Auto-tag" @click=${this.retag} ?disabled=${this.tagging}>
            <span class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-text-dim);"
              >${this.tagging?"hourglass_empty":"auto_awesome"}</span
            >
          </button>`:n}
      ${e&&this.media.kind!=="comic"&&this.media.kind!=="game"?a`<button class="icon-round" title=${(t=this.full)!=null&&t.description?"Describe again with the vision model":"Describe with the vision model"}
            @click=${this.describe} ?disabled=${this.describing}>
            <span class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-text-dim);"
              >${this.describing?"hourglass_empty":"description"}</span
            >
          </button>`:n}
      ${G(this.media)?a`<button class="icon-round" title="Edit in the studio — regenerate it with its own settings"
            @click=${()=>this.dispatchEvent(new CustomEvent("edit-in-studio",{detail:{id:this.media.id},bubbles:!0,composed:!0}))}>
            <span class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-text-dim);">brush</span>
          </button>`:n}
      ${this.media.kind==="video"?a`<button class="icon-round" title="Bookmark this moment" @click=${()=>void this.markMoment()} ?disabled=${this.marking}>
            <span class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-text-dim);">${this.marking?"hourglass_empty":"bookmarks"}</span>
          </button>`:n}
      <button class="icon-round" title="Edit" @click=${()=>this.startEdit()}>
        <span class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-text-dim);">edit</span>
      </button>
      <button class="icon-round" title="Delete" @click=${this.doDelete}>
        <span class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-error, #f2b8b5);">delete</span>
      </button>
      <button class="icon-round" title="Favorite" @click=${this.toggleFav}>${this.favIcon()}</button>
    `}renderMeta(e){const t=v[e.kind];return a`
      <div class="meta">
        <div class="meta-head">
          <h2 class="meta-title">${e.title}</h2>
          ${this.renderActions()}
        </div>
        ${this.editing?this.renderEdit():a`
              <div class="chips">
                <span class="chip chip-accent">${D(e)||t.label}</span>
                <span class="chip chip-muted">${t.typeLabel}</span>
              </div>
              ${this.renderTags(e)}
              ${e.description?a`<p class="desc described" style="margin-top:16px;" title="What the vision model saw">${e.description}</p>`:n}
              ${e.notes?a`<p class="desc" style="margin-top:16px;">${e.notes}</p>`:n}
              ${e.source?a`<div class="meta-note">
                    Source:
                    <a href=${e.source} target="_blank" rel="noreferrer" style="color:var(--oppai-primary-bright);">link</a>
                  </div>`:n}
            `}
      </div>
    `}renderTags(e){const t=[...e.tags??[]].sort((s,o)=>y(o)-y(s));if(t.length===0)return a`<div class="meta-note" style="margin-top:14px;">
        No tags yet — use the ✨ auto-tag button.
      </div>`;const i=t.some(s=>this.hasTimeline(s));return a`
      <div class="chips">
        ${t.map(s=>this.renderTagChip(s))}
      </div>
      ${i&&this.activeTag==null?a`<div class="meta-note" style="margin-top:10px;">
            Tap a ✨ tag to see where it appears in this video.
          </div>`:n}
    `}renderTagChip(e){const t=y(e),i=t<1,s=i?`${Math.max(1,Math.round(t*100))}%`:"",o=`${e.category}${e.source?" · "+e.source:""}${i?` · in about ${s} of the sampled frames`:""}`;if(!this.hasTimeline(e))return a`<span class="chip chip-muted" title=${o}>${e.name}${i?a`<span class="chip-share">${s}</span>`:n}</span>`;const c=this.activeTag===e.id,u=e.moments.length;return a`<button
      class="chip ${c?"on":"chip-muted"}"
      title="${o} · seen at ${u} point${u===1?"":"s"}"
      aria-pressed=${c}
      @click=${()=>this.toggleTagTimeline(e)}
    >
      <span class="material-symbols-rounded" style="font-size:14px;">auto_awesome</span>
      ${e.name}${i?a`<span class="chip-share">${s}</span>`:n}
    </button>`}};r.styles=[N,M,F`
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
      /* The vision model's prose, set off from a hand-written note by a rule. */
      .desc.described {
        border-left: 3px solid var(--oppai-primary);
        padding-left: 12px;
        color: var(--oppai-text);
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

      /* Slideshow controls, under the stage. */
      .slidebar {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .slidebar.on .icon-round:first-child { color: var(--oppai-accent); }
      .slidebar .icon-round.lit { color: var(--oppai-accent); }
      .slidebar .dwell { display: inline-flex; align-items: center; gap: 6px; }
      .slidebar select {
        background: var(--oppai-surface-2);
        color: var(--oppai-text);
        border: 1px solid var(--oppai-outline, rgba(255,255,255,.14));
        border-radius: 8px;
        padding: 4px 6px;
        font: inherit;
      }
      .slide-note { opacity: .7; }

      /* Bookmarked moments: a row of frames you can jump to. */
      .moments {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        padding-bottom: 6px;
      }
      .moment { position: relative; flex: 0 0 auto; }
      .moment-open {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        width: 150px;
        padding: 0;
        border: 1px solid var(--oppai-outline, rgba(255,255,255,.14));
        border-radius: 12px;
        overflow: hidden;
        background: var(--oppai-surface-2);
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .moment-open:hover { border-color: var(--oppai-accent); }
      .moment-open img { display: block; width: 150px; height: 84px; object-fit: cover; background: #000; }
      .moment-time { padding: 0 8px; font-size: 12px; font-weight: 600; }
      .moment-label {
        padding: 0 8px 8px;
        font-size: 12px;
        color: var(--oppai-text-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 150px;
      }
      .moment-drop {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 24px;
        height: 24px;
        border: none;
        border-radius: 12px;
        background: rgba(0,0,0,.6);
        color: #fff;
        display: grid;
        place-items: center;
        cursor: pointer;
        padding: 0;
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

      /* Where the game came from, and the PC it lives on. */
      .remote {
        margin: 4px 0 18px; padding: 12px 14px; border-radius: 14px; max-width: 640px;
        background: var(--oppai-surface-1); border: 1px solid var(--oppai-border, rgba(255,255,255,.08));
        font-size: 13px; color: var(--oppai-text-dim);
      }
      .remote.update { border-color: var(--oppai-accent); }
      .remote-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .remote-head b { color: var(--oppai-text); font-weight: 500; }
      .remote-acts { margin-left: auto; display: flex; gap: 4px; }
      .remote .log { white-space: pre-wrap; margin-top: 8px; max-height: 160px; overflow: auto; font-size: 12px; }
      .remote .srcs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .remote .src {
        display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 10px;
        background: var(--oppai-surface-2); color: var(--oppai-text); text-decoration: none; font-size: 12px;
        border: 1px solid var(--oppai-border-strong);
      }
      .remote .src:hover { background: var(--oppai-nav-hover); }
      .pc-stat { display: inline-flex; align-items: center; gap: 4px; margin-right: 12px; }

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
    `];r.PROGRESS_INTERVAL=10;r.PROGRESS_FLOOR=15;r.PROGRESS_DONE=.97;d([b({attribute:!1})],r.prototype,"media",2);d([b({type:Boolean})],r.prototype,"favorite",2);d([b({attribute:!1})],r.prototype,"queue",2);d([b({type:Number})],r.prototype,"startAt",2);d([p()],r.prototype,"full",2);d([p()],r.prototype,"bookmarks",2);d([p()],r.prototype,"marking",2);d([p()],r.prototype,"slideshow",2);d([p()],r.prototype,"slideshowOn",2);d([p()],r.prototype,"activeTag",2);d([p()],r.prototype,"tagging",2);d([p()],r.prototype,"editing",2);d([p()],r.prototype,"saving",2);d([p()],r.prototype,"editTitle",2);d([p()],r.prototype,"editNotes",2);d([p()],r.prototype,"editDescription",2);d([p()],r.prototype,"describing",2);d([p()],r.prototype,"editKind",2);d([p()],r.prototype,"editTags",2);d([p()],r.prototype,"newTag",2);d([p()],r.prototype,"screenshot",2);d([p()],r.prototype,"userGallery",2);d([p()],r.prototype,"galleryUploading",2);d([p()],r.prototype,"saves",2);d([p()],r.prototype,"saveUploading",2);d([p()],r.prototype,"saveError",2);d([p()],r.prototype,"play",2);d([p()],r.prototype,"playing",2);d([p()],r.prototype,"launchy",2);d([p()],r.prototype,"launching",2);d([p()],r.prototype,"checking",2);d([p()],r.prototype,"sources",2);d([p()],r.prototype,"sourcesLoading",2);d([p()],r.prototype,"posterFrames",2);d([p()],r.prototype,"posterLoading",2);d([p()],r.prototype,"posterSaving",2);d([p()],r.prototype,"posterChosen",2);d([p()],r.prototype,"posterError",2);d([p()],r.prototype,"posterVersion",2);d([p()],r.prototype,"comic",2);d([p()],r.prototype,"page",2);d([p()],r.prototype,"fit",2);r=d([A("oppai-viewer")],r);function y(e){return e.weight&&e.weight>0?Math.min(1,e.weight):1}function x(e){return e?new Date(e*1e3).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):""}export{r as OppaiViewer,G as studioEditable};
