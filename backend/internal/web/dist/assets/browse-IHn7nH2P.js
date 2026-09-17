import{q as w,i as $,N as k,u as n,a as S,e as h,O as I,A as o,b as a,t as z,B as C,P as F,M as q}from"./index-tGtnXIFt.js";import{e as T}from"./query-__j_ZMY6.js";function A(e,t,i,s){const r=t.cursor??"";if(s)return{items:y(t.items),cursor:r,error:""};if(r&&r===i)return{items:e,cursor:"",error:"This source returned the same page cursor twice, so paging was stopped."};const p=new Set(e.map(g=>g.id)),u=y(t.items).filter(g=>!p.has(g.id));return t.items.length>0&&u.length===0?{items:e,cursor:"",error:"This source repeated an earlier page, so paging was stopped."}:{items:[...e,...u],cursor:r,error:""}}function y(e){const t=new Set;return e.filter(i=>t.has(i.id)?!1:(t.add(i.id),!0))}var U=Object.defineProperty,L=Object.getOwnPropertyDescriptor,f=(e,t,i,s)=>{for(var r=s>1?void 0:s?L(t,i):t,p=e.length-1,u;p>=0;p--)(u=e[p])&&(r=(s?u(t,i,r):u(r))||r);return s&&r&&U(t,i,r),r};let m=class extends S{constructor(){super(...arguments),this.existingNames=[],this.url="",this.busy=!1,this.error="",this.proposal=null,this.yaml="",this.showYaml=!1,this.saving=!1,this.analyze=async e=>{e.preventDefault();const t=this.url.trim();if(t){this.busy=!0,this.error="",this.proposal=null;try{const i=await h.analyzeSource(t);this.proposal=i,this.yaml=i.yaml}catch(i){this.error=i.message}finally{this.busy=!1}}},this.save=async()=>{if(this.proposal){this.saving=!0,this.error="";try{const e=await h.saveSource(this.yaml);this.dispatchEvent(new CustomEvent("added",{detail:e,bubbles:!0,composed:!0}))}catch(e){this.error=e.message}finally{this.saving=!1}}},this.close=async()=>{await I(this.sheet),this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}}render(){return a`
      <div class="backdrop" @click=${this.backdropClick}>
        <div class="sheet" role="dialog" aria-modal="true" aria-label="Add a site to browse">
          <header>
            <span class="material-symbols-rounded">travel_explore</span>
            <h3>Add a site</h3>
            <button @click=${()=>void this.close()} aria-label="Close">
              <span class="material-symbols-rounded">close</span>
            </button>
          </header>

          <div class="body">
            ${this.error?a`<div class="banner error">
                  <span class="material-symbols-rounded" style="font-size:18px;">error</span>
                  <span>${this.error}</span>
                </div>`:o}

            <p class="hint">
              Paste the address of a <strong>listing page</strong> — the page showing the
              grid, not one item from it. The server fetches it once and works out how to
              read it.
            </p>

            <form @submit=${this.analyze}>
              <label class="row">
                <span class="material-symbols-rounded" style="font-size:20px; color:var(--oppai-text-dim);">link</span>
                <input
                  type="url"
                  placeholder="https://example.com/gallery"
                  .value=${this.url}
                  ?disabled=${this.busy}
                  @input=${e=>this.url=e.target.value}
                />
                <button class="primary" type="submit" ?disabled=${this.busy||!this.url.trim()}>
                  ${this.busy?"Looking…":"Inspect"}
                </button>
              </label>
            </form>

            ${this.proposal?this.renderProposal(this.proposal):o}
          </div>

          <footer>
            <button @click=${()=>void this.close()}>Cancel</button>
            <button
              class="primary"
              ?disabled=${!this.proposal||this.saving||this.blocked}
              @click=${this.save}
            >
              <span class="material-symbols-rounded" style="font-size:20px;">add</span>
              ${this.saving?"Adding…":"Add site"}
            </button>
          </footer>
        </div>
      </div>
    `}get blocked(){return this.proposal?this.yaml!==this.proposal.yaml?!1:this.proposal.notes.some(e=>e.blocking):!0}renderProposal(e){const t=e.notes.filter(s=>s.blocking),i=e.notes.filter(s=>!s.blocking);return a`
      ${e.existing?a`<div class="banner warn">
            <span class="material-symbols-rounded" style="font-size:18px;">swap_horiz</span>
            <span>This will replace the existing <strong>${e.existing}</strong> source. Its
              definition is overridden, not deleted — remove the new one to get it back.</span>
          </div>`:o}

      ${t.map(s=>a`<div class="banner error">
          <span class="material-symbols-rounded" style="font-size:18px;">block</span>
          <span>${s.field?a`<strong>${s.field}</strong> — `:o}${s.text}</span>
        </div>`)}

      <div>
        <h4>What it found on that page</h4>
        ${e.previewError?a`<div class="banner error" style="margin-top:8px;">
              <span class="material-symbols-rounded" style="font-size:18px;">visibility_off</span>
              <span>${e.previewError}</span>
            </div>`:a`
              <p class="hint" style="margin:4px 0 8px;">
                These are real items the proposed adapter pulled out. If they look right,
                the site will work.
              </p>
              <div class="tiles">
                ${e.preview.map(s=>a`
                  <div class="tile">
                    <img
                      src=${h.sourceStreamURL(s.thumbUrl)}
                      alt=""
                      loading="lazy"
                      @error=${r=>r.target.style.visibility="hidden"}
                    />
                    <div class="cap" title=${s.title||s.id}>${s.title||s.id}</div>
                  </div>
                `)}
              </div>
            `}
      </div>

      ${i.length?a`<div>
            <h4>Worth knowing</h4>
            ${i.map(s=>a`<div class="banner info" style="margin-top:6px;">
                <span class="material-symbols-rounded" style="font-size:18px;">info</span>
                <span>${s.field?a`<strong>${s.field}</strong> — `:o}${s.text}</span>
              </div>`)}
          </div>`:o}

      <div>
        <button @click=${()=>this.showYaml=!this.showYaml}>
          <span class="material-symbols-rounded" style="font-size:20px;">
            ${this.showYaml?"expand_less":"code"}
          </span>
          ${this.showYaml?"Hide the definition":"Show and edit the definition"}
        </button>
        ${this.showYaml?a`
              <p class="hint" style="margin:10px 0 6px;">
                Selectors and a URL template — nothing here is executed as code. Edit it if
                the tiles above are wrong, then add the site.
              </p>
              <textarea
                spellcheck="false"
                .value=${this.yaml}
                @input=${s=>this.yaml=s.target.value}
              ></textarea>
            `:o}
      </div>
    `}backdropClick(e){e.target===e.currentTarget&&this.close()}};m.styles=[w,$`
    :host {
      display: block;
    }
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: grid;
      place-items: center;
      z-index: 60;
      padding: 16px;
      /* Notches and the home indicator: the sheet must not run under either. */
      padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
        max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
    }
    .sheet {
      background: var(--oppai-surface);
      color: var(--oppai-text);
      border-radius: 20px;
      width: min(720px, 100%);
      max-height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
    }
    header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 18px;
      border-bottom: 1px solid var(--oppai-border);
    }
    header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      flex: 1;
    }
    .body {
      padding: 16px 18px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    footer {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding: 14px 18px;
      border-top: 1px solid var(--oppai-border);
    }
    .hint {
      font-size: 13px;
      color: var(--oppai-text-muted);
      margin: 0;
    }
    label.row {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--oppai-surface-2);
      border-radius: 12px;
      padding: 8px 12px;
    }
    label.row input {
      flex: 1;
      background: none;
      border: 0;
      color: inherit;
      font: inherit;
      outline: none;
      min-width: 0;
    }
    button {
      font: inherit;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--oppai-border);
      background: var(--oppai-surface-2);
      color: inherit;
      border-radius: 999px;
      padding: 8px 14px;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    button.primary {
      background: var(--md-sys-color-primary, #7c5cff);
      color: var(--md-sys-color-on-primary, #fff);
      border-color: transparent;
    }
    .banner {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      border-radius: 12px;
      padding: 10px 12px;
      font-size: 13px;
      line-height: 1.45;
    }
    .banner.error {
      background: color-mix(in srgb, var(--md-sys-color-error) 16%, transparent);
    }
    .banner.warn {
      background: color-mix(in srgb, #e0a030 18%, transparent);
    }
    .banner.info {
      background: var(--oppai-surface-2);
    }
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
      gap: 8px;
    }
    .tile {
      background: var(--oppai-surface-2);
      border-radius: 10px;
      overflow: hidden;
    }
    .tile img {
      display: block;
      width: 100%;
      aspect-ratio: 3 / 4;
      object-fit: cover;
      background: var(--oppai-surface-3, #222);
    }
    .tile .cap {
      font-size: 11px;
      padding: 5px 6px;
      color: var(--oppai-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    textarea {
      width: 100%;
      box-sizing: border-box;
      min-height: 260px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      line-height: 1.5;
      background: var(--oppai-surface-2);
      color: inherit;
      border: 1px solid var(--oppai-border);
      border-radius: 12px;
      padding: 10px 12px;
      resize: vertical;
    }
    h4 {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
    }
    @media (prefers-reduced-motion: no-preference) {
      .sheet {
        animation: pop 160ms ease-out;
      }
      @keyframes pop {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.99);
        }
      }
    }
  `];f([k({attribute:!1})],m.prototype,"existingNames",2);f([n()],m.prototype,"url",2);f([n()],m.prototype,"busy",2);f([n()],m.prototype,"error",2);f([n()],m.prototype,"proposal",2);f([n()],m.prototype,"yaml",2);f([n()],m.prototype,"showYaml",2);f([n()],m.prototype,"saving",2);f([T(".sheet")],m.prototype,"sheet",2);m=f([z("oppai-add-source")],m);var N=Object.defineProperty,_=Object.getOwnPropertyDescriptor,l=(e,t,i,s)=>{for(var r=s>1?void 0:s?_(t,i):t,p=e.length-1,u;p>=0;p--)(u=e[p])&&(r=(s?u(t,i,r):u(r))||r);return s&&r&&N(t,i,r),r};let d=class extends S{constructor(){super(...arguments),this.canAddSites=!1,this.sources=[],this.sourceId="",this.iconFailed=new Set,this.addingSite=!1,this.feedId="",this.container=null,this.sort="",this.query="",this.draft="",this.items=[],this.cursor="",this.loading=!1,this.loadingSources=!0,this.error="",this.active=null,this.pages=[],this.pageAt=0,this.saving=!1,this.toast="",this.commentsFor=null,this.comments=[],this.commentsLoading=!1,this.commentsError="",this.commentQuery="",this.threadQuery="",this.threadDraft="",this.feeds=[],this.feedNew=[],this.feedBusy=!1,this.feedsOpen=!1,this.reqId=0,this.onSiteAdded=async e=>{const t=e.detail;this.addingSite=!1,await this.loadSources(!0),t!=null&&t.id&&this.pickSource(t.id),this.toast=`${(t==null?void 0:t.name)??"Site"} added.`},this.removeCurrentSource=async()=>{const e=this.removableSource;if(e)try{await h.deleteSource(e.id),this.toast=`${e.name} removed.`,this.sourceId="",await this.loadSources(!0)}catch(t){this.error=t.message}},this.leaveContainer=()=>{this.container=null,this.reset()},this.close=()=>{this.active=null,this.pages=[]},this.closeComments=()=>{this.commentsFor=null,this.comments=[],this.commentsError=""}}connectedCallback(){super.connectedCallback(),C(this,"browse"),typeof IntersectionObserver<"u"&&(this.pageObserver=new IntersectionObserver(e=>{e.some(t=>t.isIntersecting)&&this.load(!1)},{rootMargin:"500px 0px"})),this.loadSources(),this.loadFeeds()}async loadFeeds(){try{const[{feeds:e},{items:t}]=await Promise.all([h.savedFeeds(),h.newFromFeeds()]);this.feeds=e,this.feedNew=t}catch{}}get watchedHere(){if(!this.isSearch||!this.query)return;const e=this.sort||"";return this.feeds.find(t=>t.source===this.sourceId&&t.feed===this.feedId&&(t.query??"").toLowerCase()===this.query.toLowerCase()&&(t.sort??"")===e)}async watchThisSearch(){if(!(!this.isSearch||!this.query||this.feedBusy)){this.feedBusy=!0;try{const e=await h.saveFeed({source:this.sourceId,feed:this.feedId,query:this.query,sort:this.sort||void 0});this.feeds.some(t=>t.id===e.id)||(this.feeds=[...this.feeds,e]),this.showToast(`Watching “${e.name}” — new results land on the shelf above.`)}catch(e){this.showToast(e.message)}finally{this.feedBusy=!1}}}async unwatch(e){try{await h.deleteFeed(e.id),this.feeds=this.feeds.filter(t=>t.id!==e.id),this.feedNew=this.feedNew.filter(t=>t.feedId!==e.id)}catch(t){this.showToast(t.message)}}async checkFeedsNow(){if(!this.feedBusy){this.feedBusy=!0;try{const{feeds:e}=await h.checkFeeds();this.feeds=e,this.feedNew=(await h.newFromFeeds()).items;const t=this.feedNew.length;this.showToast(t?`${t} new since you last looked.`:"Nothing new yet.")}catch(e){this.showToast(e.message)}finally{this.feedBusy=!1}}}async markFeedsSeen(){try{await h.markFeedsSeen(),this.feedNew=[],this.feeds=this.feeds.map(e=>({...e,newCount:0}))}catch(e){this.showToast(e.message)}}openFeedItem(e){const t=this.feeds.find(i=>i.id===e.feedId);t&&(t.source!==this.sourceId||t.feed!==this.feedId||t.query!==this.query)&&(this.sourceId=t.source,this.feedId=t.feed,this.container=null,this.sort=t.sort??"",this.query=t.query??"",this.draft=this.query,this.reset()),this.open(e)}renderFeedShelf(){if(!this.feeds.length)return o;const e=this.feedNew;return a`
      <section class="feed-shelf">
        <div class="feed-head">
          <span class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-primary-bright);">new_releases</span>
          <h3 class="feed-title">New from your feeds</h3>
          <span class="count">${e.length?`${e.length} new`:"nothing new"}</span>
          <button class="chip" ?disabled=${this.feedBusy} @click=${()=>void this.checkFeedsNow()}>
            <span class="material-symbols-rounded" style="font-size:16px;">refresh</span>${this.feedBusy?"Checking…":"Check now"}
          </button>
          ${e.length?a`<button class="chip" @click=${()=>void this.markFeedsSeen()}>
            <span class="material-symbols-rounded" style="font-size:16px;">check</span>Seen</button>`:o}
          <button class="chip" aria-pressed=${this.feedsOpen} @click=${()=>this.feedsOpen=!this.feedsOpen}>
            ${this.feeds.length} ${this.feeds.length===1?"feed":"feeds"}
          </button>
        </div>
        ${this.feedsOpen?a`<div class="chips tight">
          ${this.feeds.map(t=>a`<span class="chip feed-chip" title=${t.error?`Last check failed: ${t.error}`:t.checkedAt?`Checked ${new Date(t.checkedAt).toLocaleString()}`:"Not checked yet"}>
            ${t.error?a`<span class="material-symbols-rounded" style="font-size:16px;">warning</span>`:o}
            ${t.name}${t.newCount?a` · ${t.newCount}`:o}
            <button class="feed-drop" title="Stop watching" @click=${()=>void this.unwatch(t)}>
              <span class="material-symbols-rounded" style="font-size:16px;">close</span>
            </button>
          </span>`)}
        </div>`:o}
        ${e.length?a`<div class="feed-strip">
          ${e.slice(0,40).map(t=>a`
            <button class="feed-tile" title=${`${t.title} — from ${t.feedName}`} @click=${()=>this.openFeedItem(t)}>
              ${t.thumbUrl?a`<img src=${h.sourceStreamURL(t.thumbUrl)} loading="lazy" alt=${t.title} />`:a`<span class="material-symbols-rounded" style="font-size:36px;">image</span>`}
              ${t.kind==="video"?a`<span class="play material-symbols-rounded" style="font-size:36px;">play_circle</span>`:o}
              <span class="feed-from">${t.feedName}</span>
            </button>`)}
        </div>`:o}
      </section>
    `}disconnectedCallback(){var e;(e=this.pageObserver)==null||e.disconnect(),super.disconnectedCallback()}updated(e){var s,r;super.updated(e);const t=p=>e.has(p);(t("active")||t("items"))&&this.centerCurrentInQueue(),["active","items","sourceId","feedId","container"].some(t)&&this.announceFrame();const i=this.renderRoot.querySelector("[data-page-sentinel]");i!==this.pageSentinel&&(this.pageSentinel&&((s=this.pageObserver)==null||s.unobserve(this.pageSentinel)),this.pageSentinel=i??void 0,i&&((r=this.pageObserver)==null||r.observe(i)))}announceFrame(){var i,s,r;const e=((i=this.source)==null?void 0:i.name)??"Browse",t=((s=this.container)==null?void 0:s.title)??((r=this.feed)==null?void 0:r.label);this.dispatchEvent(new CustomEvent("browse-frame-changed",{detail:{items:this.items.slice(0,16),focused:this.active,where:t?`${e} · ${t}`:e},bubbles:!0,composed:!0}))}centerCurrentInQueue(){const e=this.renderRoot.querySelector(".upnext .strip"),t=e==null?void 0:e.querySelector(".strip-item.on");!e||!t||(e.scrollLeft=Math.max(0,t.offsetLeft-(e.clientWidth-t.offsetWidth)/2))}get source(){return this.sources.find(e=>e.id===this.sourceId)}get feed(){var e;return(e=this.source)==null?void 0:e.feeds.find(t=>t.id===this.feedId)}get isSearch(){var e;return!this.container&&((e=this.feed)==null?void 0:e.query)===!0}get searchTarget(){var i,s;const e=((i=this.source)==null?void 0:i.name)??"",t=((s=this.feed)==null?void 0:s.label.trim())??"";return t&&t.toLowerCase()!=="search"?`${e} ${t.toLowerCase()}`:e}get activeFeed(){var e;return((e=this.container)==null?void 0:e.feedId)??this.feedId}get isFourChan(){return this.sourceId==="4chan"}async loadSources(e=!1){var t;try{const{sources:i}=await h.sources(e);this.sources=i;const s=i.find(p=>p.id===this.sourceId),r=s??i[0];r?(this.sourceId=r.id,s||(this.feedId=((t=r.feeds[0])==null?void 0:t.id)??"")):(this.sourceId="",this.feedId="")}catch(i){this.error=i instanceof Error?i.message:"Couldn't reach the server"}finally{this.loadingSources=!1}this.sourceId&&this.load(!0)}async load(e){var i;if(!this.sourceId||((i=this.source)==null?void 0:i.authentication)==="required"||!e&&(this.loading||!this.cursor)||this.isSearch&&!this.query)return;const t=++this.reqId;this.loading=!0;try{const s=await h.browseSource(this.sourceId,{feed:this.activeFeed,cursor:e?void 0:this.cursor,q:this.container?void 0:this.query||void 0,sort:this.container?void 0:this.sort||void 0});if(t!==this.reqId)return;const r=A(this.items,s,e?"":this.cursor,e);this.items=r.items,this.cursor=r.cursor,this.error=r.error}catch(s){if(t!==this.reqId)return;this.error=s instanceof Error?s.message:"Couldn't load that feed"}finally{t===this.reqId&&(this.loading=!1)}}reset(){this.items=[],this.cursor="",this.error="",this.load(!0)}renderSiteTabs(){return a`
      <div class="site-tabs" role="tablist" aria-label="Sites">
        ${this.sources.map(e=>{const t=e.id===this.sourceId,i=this.iconFailed.has(e.id);return a`
            <button
              class="site-tab ${t?"on":""}"
              role="tab"
              aria-selected=${t}
              title=${e.host?`${e.name} — ${e.host}`:e.name}
              @click=${()=>this.pickSource(e.id)}
            >
              ${i?a`<span class="site-mono" aria-hidden="true">${e.name.slice(0,1).toUpperCase()}</span>`:a`<img
                    class="site-icon"
                    src=${h.sourceIconURL(e.id)}
                    alt=""
                    loading="lazy"
                    @error=${()=>this.markIconFailed(e.id)}
                  />`}
              <span class="site-name">${e.name}</span>
            </button>
          `})}
        ${this.canAddSites?a`<button
              class="site-tab add"
              title="Add another site to browse"
              aria-label="Add a site"
              @click=${()=>this.addingSite=!0}
            >
              <span class="material-symbols-rounded">add</span>
              <span class="site-name">Add</span>
            </button>`:o}
      </div>
      ${this.removableSource?a`<div class="chips tight">
            <button class="chip" @click=${this.removeCurrentSource}>
              <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
              Remove ${this.removableSource.name}
            </button>
          </div>`:o}
      ${this.addingSite?a`<oppai-add-source
            @close=${()=>this.addingSite=!1}
            @added=${this.onSiteAdded}
          ></oppai-add-source>`:o}
    `}get removableSource(){if(!this.canAddSites)return;const e=this.source;return e!=null&&e.userAdded?e:void 0}markIconFailed(e){this.iconFailed=new Set(this.iconFailed).add(e)}pickSource(e){var t,i;e!==this.sourceId&&(this.sourceId=e,this.feedId=((i=(t=this.sources.find(s=>s.id===e))==null?void 0:t.feeds[0])==null?void 0:i.id)??"",this.container=null,this.sort="",this.query="",this.draft="",this.reset())}pickFeed(e){var t,i;e===this.feedId&&!this.container||(this.feedId=e,this.container=null,this.sort="",((i=(t=this.source)==null?void 0:t.feeds.find(s=>s.id===e))==null?void 0:i.query)!==!0&&(this.query="",this.draft=""),this.reset())}addThread(e){var g;e.preventDefault();const t=this.threadDraft.trim(),i=t.match(/^(?:https?:\/\/)?(?:boards\.4chan\.org\/)?\/?([a-z0-9]+)\/?$/i);if(i){this.threadDraft="",this.pickFeed(i[1].toLowerCase());return}const s=t.match(/(?:boards\.4chan\.org\/)?([a-z0-9]+)\/(?:thread\/)?(\d+)/i)??t.match(/^\/?([a-z0-9]+):t?(\d+)$/i);if(!s){this.showToast("Enter a board such as /b/, or a 4chan thread URL");return}const r=s[1].toLowerCase(),p=s[2],u=`${r}:t${p}`;(g=this.source)!=null&&g.feeds.some(b=>b.id===r)&&(this.feedId=r),this.threadDraft="",this.openContainer({id:u,title:`/${r}/ thread No.${p}`,kind:"thread",thumbUrl:"",feedId:u,threadId:u})}pickSort(e){e!==this.sort&&(this.sort=e,this.reset())}openContainer(e){this.container=e,this.threadQuery="",this.reset()}submitSearch(e){e.preventDefault(),this.query=this.draft.trim(),this.container=null,this.reset()}async open(e){var t,i;if(this.active=e,this.pages=[],this.pageAt=0,e.kind==="comic")try{const{pages:s}=await h.sourcePages(this.sourceId,e.id);if(((t=this.active)==null?void 0:t.id)!==e.id)return;this.pages=s,this.warmPages(1)}catch(s){if(((i=this.active)==null?void 0:i.id)!==e.id)return;this.error=s instanceof Error?s.message:"Couldn't open that comic",this.active=null}}warmPages(e){for(let t=e;t<Math.min(e+O,this.pages.length);t++)new Image().src=h.sourceStreamURL(this.pages[t])}goPage(e){const t=Math.min(Math.max(e,0),this.pages.length-1);t!==this.pageAt&&(this.pageAt=t,this.warmPages(t+1))}async openComments(e){var i,s,r;const t=e.threadId;if(t){this.commentsFor=e,this.comments=[],this.commentsError="",this.commentQuery="",this.commentsLoading=!0;try{const{comments:p}=await h.sourceComments(this.sourceId,t);if(((i=this.commentsFor)==null?void 0:i.id)!==e.id)return;this.comments=p}catch(p){if(((s=this.commentsFor)==null?void 0:s.id)!==e.id)return;this.commentsError=p instanceof Error?p.message:"Couldn't load the thread"}finally{((r=this.commentsFor)==null?void 0:r.id)===e.id&&(this.commentsLoading=!1)}}}save(e){if(!e||this.saving)return;const t=e.kind==="comic"||e.kind==="thread";this.saving=!0,F(e.title||"Source download",async i=>{try{i(.08),await h.saveFromSource(this.sourceId,{itemId:t?e.id:void 0,mediaUrl:t?void 0:e.mediaUrl,pageUrl:e.pageUrl,title:e.title,kind:t?"comic":e.kind,tags:e.tags}),i(1),this.dispatchEvent(new CustomEvent("imported",{bubbles:!0,composed:!0}))}finally{this.saving=!1}}),this.showToast(e.kind==="thread"?"Downloading thread in background":"Downloading in background")}showToast(e){this.toast=e,setTimeout(()=>{this.toast=""},2600)}renderTile(e,t){const i=e.kind==="thread",s=i?`${e.count??0}`:e.width&&e.height?`${e.width}×${e.height}`:"";return a`
      <button
        class="tile anim-rise"
        style="animation-delay:${Math.min(t,12)*45}ms;"
        @click=${()=>i?this.openContainer(e):this.open(e)}
        title=${e.title}
      >
        <div class="tile-media">
          ${e.thumbUrl?a`<img src=${h.sourceStreamURL(e.thumbUrl)} loading="lazy" alt=${e.title} />`:a`<div class="tile-blank">
                <span class="material-symbols-rounded" style="font-size:36px;">forum</span>
              </div>`}
          ${e.kind==="video"?a`<span class="play material-symbols-rounded" style="font-size:44px;">play_circle</span>`:o}
          ${s?a`<span class="tile-stat">
                ${i?a`<span class="material-symbols-rounded" style="font-size:13px;">image</span>`:o}
                ${s}
              </span>`:o}
        </div>
        <div class="tile-meta">
          <div class="tile-title">${e.title}</div>
          <div class="tile-tag">
            ${i?"Thread":e.kind==="comic"?"Gallery":e.kind}
          </div>
        </div>
      </button>
    `}renderOverlay(e){const t=e.kind==="comic",i=this.pages[this.pageAt];return a`
      <div class="overlay" @click=${s=>{s.target===s.currentTarget&&this.close()}}>
        <div class="obar">
          <button class="obtn" @click=${this.close}>
            <span class="material-symbols-rounded" style="font-size:18px;">arrow_back</span>Back
          </button>
          <span class="t">${e.title}</span>
          ${e.threadId?a`<button class="obtn" @click=${()=>this.openComments(e)}>
                <span class="material-symbols-rounded" style="font-size:18px;">forum</span>Comments
              </button>`:o}
          ${e.pageUrl?a`<a href=${e.pageUrl} target="_blank" rel="noopener noreferrer">
                <button class="obtn">
                  <span class="material-symbols-rounded" style="font-size:18px;">open_in_new</span>Source
                </button>
              </a>`:o}
          <button class="obtn" ?disabled=${this.saving} @click=${()=>this.save(e)}>
            <span class="material-symbols-rounded" style="font-size:18px;">download</span>
            ${this.saving?"Saving…":"Save to library"}
          </button>
        </div>

        <div class="ostage">
          ${t?i?a`<img src=${h.sourceStreamURL(i)} alt="Page ${this.pageAt+1}" />`:a`<md-circular-progress indeterminate></md-circular-progress>`:e.kind==="video"?a`<video
                  src=${h.sourceStreamURL(e.mediaUrl??"")}
                  controls
                  autoplay
                  loop
                  playsinline
                  preload="metadata"
                ></video>`:a`<img src=${h.sourceStreamURL(e.mediaUrl??e.thumbUrl)} alt=${e.title} />`}
        </div>

        ${e.kind==="video"||e.kind==="image"?this.renderUpNext(e):o}

        ${t&&this.pages.length?a`
              <div class="pager">
                <button
                  class="obtn"
                  ?disabled=${this.pageAt===0}
                  @click=${()=>this.goPage(this.pageAt-1)}
                >
                  <span class="material-symbols-rounded" style="font-size:18px;">chevron_left</span>
                </button>
                <span>${this.pageAt+1} / ${this.pages.length}</span>
                <button
                  class="obtn"
                  ?disabled=${this.pageAt>=this.pages.length-1}
                  @click=${()=>this.goPage(this.pageAt+1)}
                >
                  <span class="material-symbols-rounded" style="font-size:18px;">chevron_right</span>
                </button>
              </div>
            `:o}
      </div>
    `}renderUpNext(e){const t=this.items.filter(s=>s.kind==="video"||s.kind==="image");if(t.some(s=>s.id===e.id)||t.unshift(e),t.length<2)return o;const i=t.findIndex(s=>s.id===e.id);return a`
      <div class="upnext">
        <div class="upnext-label">Videos & images</div>
        <div class="strip">
          ${t.map((s,r)=>a`
              <button
                class="strip-item ${s.id===e.id?"on":""}"
                title=${s.title}
                aria-current=${s.id===e.id}
                @click=${()=>this.open(s)}
              >
                <img src=${h.sourceStreamURL(s.thumbUrl)} loading="lazy" alt=${s.title} />
                ${s.kind==="video"?a`<span class="strip-play material-symbols-rounded">play_circle</span>`:o}
                ${r===i+1?a`<span class="strip-next">Next</span>`:o}
              </button>
            `)}
        </div>
      </div>
    `}renderComments(e){const t=e.postNo,i=this.commentQuery.trim().toLowerCase(),s=i?this.comments.filter(r=>[String(r.no),r.name,r.subject,r.text].some(p=>(p??"").toLowerCase().includes(i))):this.comments;return a`
      <div
        class="overlay comments"
        @click=${r=>{r.target===r.currentTarget&&this.closeComments()}}
      >
        <div class="cpanel">
          <div class="chead">
            <span class="t">${e.title}</span>
            <button class="obtn" @click=${this.closeComments}>
              <span class="material-symbols-rounded" style="font-size:18px;">close</span>Close
            </button>
          </div>

          <div class="comment-search">
            <label class="searchbox">
              <span class="material-symbols-rounded" style="font-size:19px; color:var(--oppai-text-dim);">search</span>
              <input
                type="search"
                placeholder="Search this thread…"
                .value=${this.commentQuery}
                @input=${r=>this.commentQuery=r.target.value}
              />
            </label>
          </div>

          ${this.commentsLoading?a`<div class="cempty"><md-circular-progress indeterminate></md-circular-progress></div>`:this.commentsError?a`<div class="cempty">${this.commentsError}</div>`:s.length?a`<div class="clist">
                    ${s.map(r=>this.renderComment(r,r.no===t))}
                  </div>`:a`<div class="cempty">${i?"No matching posts.":"No posts in this thread."}</div>`}
        </div>
      </div>
    `}renderComment(e,t){return a`
      <article id=${`post-${e.no}`} class="cpost ${t?"here":""} ${e.op?"op":""}">
        <header class="cmeta">
          ${e.op?a`<span class="cbadge">OP</span>`:o}
          ${t?a`<span class="cbadge here-badge">This file</span>`:o}
          <span class="cname">${e.name||"Anonymous"}</span>
          <span class="cno">No.${e.no}</span>
          <span class="ctime">${P(e.time)}</span>
        </header>
        ${e.subject?a`<div class="csub">${e.subject}</div>`:o}
        ${this.renderAttachment(e)}
        ${e.text?a`<div class="ctext">${E(e.text,i=>this.goToPost(i))}</div>`:o}
      </article>
    `}goToPost(e){this.commentQuery="",this.updateComplete.then(()=>{var t;(t=this.renderRoot.querySelector(`#post-${e}`))==null||t.scrollIntoView({behavior:"smooth",block:"center"})})}renderAttachment(e){if(!e.thumbUrl)return o;const t=e.kind==="video";return a`
      <button
        class="cattach"
        title=${t?"Play this video":"Open this file"}
        @click=${()=>this.openAttachment(e)}
      >
        <img class="cthumb" src=${h.sourceStreamURL(e.thumbUrl)} loading="lazy" alt="" />
        ${t?a`<span class="cplay material-symbols-rounded">play_circle</span>`:o}
      </button>
    `}openAttachment(e){var s;const i=(e.itemId?this.items.find(r=>r.id===e.itemId):void 0)??{id:e.itemId??`post-${e.no}`,title:e.subject||`No.${e.no}`,kind:e.kind??"image",thumbUrl:e.thumbUrl??"",mediaUrl:e.mediaUrl,threadId:(s=this.commentsFor)==null?void 0:s.threadId,postNo:e.no};this.closeComments(),this.open(i)}renderContainerHead(e){var t;return a`
      <div class="head">
        <h2 class="title">${e.title}</h2>
        <span class="count">
          ${this.items.length} ${this.items.length===1?"file":"files"}
        </span>
        <div class="head-actions">
          <button class="chip ghost" @click=${this.leaveContainer}>
            <span class="material-symbols-rounded" style="font-size:16px;">arrow_back</span>
            Back to ${((t=this.feed)==null?void 0:t.label)??"the board"}
          </button>
          ${e.threadId?a`<button class="chip ghost" @click=${()=>this.openComments(e)}>
                <span class="material-symbols-rounded" style="font-size:16px;">forum</span>
                Comments
              </button>`:o}
          <button class="chip ghost" ?disabled=${this.saving} @click=${()=>this.save(e)}>
            <span class="material-symbols-rounded" style="font-size:16px;">download</span>
            ${this.saving?"Saving…":"Save whole thread"}
          </button>
        </div>
      </div>
      <div class="thread-tools">
        <label class="searchbox">
          <span class="material-symbols-rounded" style="font-size:20px; color:var(--oppai-text-dim);">search</span>
          <input
            type="search"
            placeholder="Search files in this thread…"
            .value=${this.threadQuery}
            @input=${i=>this.threadQuery=i.target.value}
          />
        </label>
      </div>
    `}render(){var r,p,u,g,b,v;if(this.loadingSources)return a`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`;if(!this.sources.length)return a`<div class="empty">No remote sources are configured.</div>`;const e=((r=this.feed)==null?void 0:r.sorts)??[],t=this.container,i=this.threadQuery.trim().toLowerCase(),s=t&&i?this.items.filter(c=>[c.title,String(c.postNo??""),c.kind].some(x=>x.toLowerCase().includes(i))):this.items;return a`
      ${t?this.renderContainerHead(t):a`
            <div class="head">
              <h2 class="title">${((p=this.source)==null?void 0:p.name)??"Browse"}</h2>
              <span class="count">${this.items.length?`${this.items.length} shown`:""}</span>
            </div>

            ${this.renderFeedShelf()}
            ${this.renderSiteTabs()}

            ${this.isFourChan?a`<div class="thread-tools">
                  <select
                    class="feed-select"
                    aria-label="4chan board"
                    @change=${c=>this.pickFeed(c.target.value)}
                  >
                    ${(((u=this.source)==null?void 0:u.feeds)??[]).map(c=>a`<option value=${c.id} ?selected=${c.id===this.feedId}>${c.label}</option>`)}
					${(g=this.source)!=null&&g.feeds.some(c=>c.id===this.feedId)?o:a`<option value=${this.feedId} selected>/${this.feedId}/ — Custom board</option>`}
                  </select>
                  <form class="thread-tools add-thread" @submit=${this.addThread}>
                    <label class="searchbox">
                      <span class="material-symbols-rounded" style="font-size:20px; color:var(--oppai-text-dim);">add_link</span>
                      <input
                        placeholder="Type /b/ or paste a thread URL"
                        .value=${this.threadDraft}
                        @input=${c=>this.threadDraft=c.target.value}
                      />
                    </label>
                    <button class="chip" type="submit">Open</button>
                  </form>
                </div>`:a`<div class="chips ${this.isSearch?"tight":""}">
                  ${(((b=this.source)==null?void 0:b.feeds)??[]).map(c=>a`<button
                      class="chip"
                      aria-pressed=${c.id===this.feedId}
                      @click=${()=>this.pickFeed(c.id)}
                    >${c.label}</button>`)}
                </div>`}

            ${this.isSearch?a`
                  <form class="searchbar" @submit=${this.submitSearch}>
                    <label class="searchbox">
                      <span class="material-symbols-rounded" style="font-size:20px; color:var(--oppai-text-dim);"
                        >search</span
                      >
                      <input
                        type="search"
                        placeholder="Search ${this.searchTarget}…"
                        .value=${this.draft}
                        @input=${c=>{this.draft=c.target.value}}
                      />
                    </label>
                    <button class="chip" type="submit">Search</button>
                    ${this.query?this.watchedHere?a`<button class="chip" type="button" aria-pressed="true" title="Stop watching this search"
                            @click=${()=>void this.unwatch(this.watchedHere)}>
                            <span class="material-symbols-rounded" style="font-size:16px;">check</span>Watching
                          </button>`:a`<button class="chip" type="button" ?disabled=${this.feedBusy} title="Check this search a few times a day and shelve what is new"
                            @click=${()=>void this.watchThisSearch()}>
                            <span class="material-symbols-rounded" style="font-size:16px;">playlist_add</span>Watch this search
                          </button>`:o}
                  </form>
                  ${e.length?a`<div class="chips tight">
                        ${e.map(c=>a`<button
                            class="chip"
                            aria-pressed=${c.id===(this.sort||e[0].id)}
                            @click=${()=>this.pickSort(c.id)}
                          >${c.label}</button>`)}
                      </div>`:o}
                `:o}
          `}

      ${((v=this.source)==null?void 0:v.authentication)==="required"?a`<div class="empty">
            <span class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;">lock</span>
            <div style="font-size:14px;">This source requires authentication that its adapter has not configured.</div>
          </div>`:this.error&&!this.items.length?a`<div class="empty">
            <span class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;"
            >cloud_off</span
            >
            <div style="font-size:14px;">${this.error}</div>
            <button class="chip" style="margin-top:14px;" @click=${()=>this.load(!0)}>Try again</button>
          </div>`:this.isSearch&&!this.query?a`<div class="empty">
              <span class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;"
                >search</span
              >
              <div style="font-size:14px;">Search ${this.searchTarget} to see results.</div>
            </div>`:this.loading&&!this.items.length?a`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`:s.length?a`
                  <div class="grid">${s.map((c,x)=>this.renderTile(c,x))}</div>
                  ${this.error?a`<div class="feed-error" role="status">
                    <span class="material-symbols-rounded" aria-hidden="true">warning</span><span>${this.error}</span>
                  </div>`:o}
                  ${this.cursor?a`<div class="more" data-page-sentinel>
                        <button class="chip" ?disabled=${this.loading} @click=${()=>this.load(!1)}>
                          ${this.loading?"Loading next page…":"Load more"}
                        </button>
                      </div>`:o}
                `:a`<div class="empty">
                  <span class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;"
                    >search_off</span
                  >
                  <div style="font-size:14px;">
                    ${t?i?a`Nothing in this thread matched “${this.threadQuery.trim()}”.`:"Nothing left in this thread — it may have 404'd.":this.query?a`Nothing matched “${this.query}”.`:"Nothing on this feed."}
                  </div>
                </div>`}

      ${this.active?this.renderOverlay(this.active):o}
      ${this.commentsFor?this.renderComments(this.commentsFor):o}
      ${this.toast?a`<div class="toast">${this.toast}</div>`:o}
    `}};d.styles=[q,w,$`
      :host {
        display: block;
        color: var(--oppai-text);
      }

      /* Header — mirrors the library's grid head. */
      .head {
        display: flex;
        align-items: baseline;
        gap: 12px;
        margin-bottom: 6px;
      }
      .title {
        font-size: 26px;
        font-weight: 400;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .count {
        font-size: 13px;
        color: var(--oppai-text-muted);
        white-space: nowrap;
      }
      .head-actions {
        margin-left: auto;
        display: flex;
        gap: 8px;
      }

      /* Chips — same shape as the library's filter chips. */
      /* The "new from your feeds" shelf above the site tabs. */
      .feed-shelf {
        margin: 0 0 18px;
        padding: 12px 14px;
        border-radius: 16px;
        background: var(--oppai-surface-1);
        border: 1px solid var(--oppai-border, rgba(255,255,255,.08));
      }
      .feed-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .feed-title { margin: 0; font-size: 15px; font-weight: 600; }
      .feed-head .count { font-size: 12px; color: var(--oppai-text-muted); flex: 1; }
      .feed-chip { display: inline-flex; align-items: center; gap: 6px; }
      .feed-drop {
        border: none; background: transparent; color: inherit; padding: 0; margin-left: 2px;
        display: inline-grid; place-items: center; cursor: pointer; opacity: .7;
      }
      .feed-drop:hover { opacity: 1; }
      .feed-strip { display: flex; gap: 10px; overflow-x: auto; padding: 12px 0 4px; }
      .feed-tile {
        position: relative; flex: 0 0 auto; width: 140px; height: 140px; padding: 0;
        border: 1px solid var(--oppai-border, rgba(255,255,255,.1)); border-radius: 12px; overflow: hidden;
        background: var(--oppai-surface-2); color: var(--oppai-text-dim); cursor: pointer;
        display: grid; place-items: center;
      }
      .feed-tile img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .feed-tile .play { position: absolute; color: #fff; filter: drop-shadow(0 2px 6px rgba(0,0,0,.6)); }
      .feed-from {
        position: absolute; left: 0; right: 0; bottom: 0; padding: 4px 8px; font-size: 11px; color: #fff;
        background: linear-gradient(transparent, rgba(0,0,0,.75)); text-align: left;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }

      .chips {
        display: flex;
        gap: 8px;
        margin: 18px 0 24px;
        flex-wrap: wrap;
      }
      .chips.tight {
        margin: 0 0 18px;
      }
      .chip {
        height: 36px;
        padding: 0 16px;
        border-radius: 18px;
        font-size: 13px;
        font-weight: 500;
        font-family: inherit;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        background: transparent;
        color: var(--oppai-text-dim);
        border: 1px solid var(--oppai-border-strong);
        transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
      }
      .chip:hover {
        background: var(--oppai-nav-hover);
      }
      .chip[aria-pressed="true"] {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
        border-color: var(--oppai-accent);
      }
      .chip:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .chip.ghost {
        color: var(--oppai-primary-bright);
        border-color: var(--oppai-border-strong);
      }
      /* Site strip — one tab per source, identified by its favicon.
         Scrolls rather than wraps: adding a tenth site must not push the grid down
         the page. The scrollbar is hidden because the tabs are wide enough to drag
         and a visible bar under six icons looks like a mistake. */
      .site-tabs {
        display: flex;
        gap: 6px;
        margin: 16px 0 18px;
        overflow-x: auto;
        scrollbar-width: none;
        padding-bottom: 2px;
      }
      .site-tabs::-webkit-scrollbar {
        display: none;
      }
      .site-tab {
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        width: 76px;
        padding: 9px 4px 7px;
        border-radius: 14px;
        border: 1px solid transparent;
        background: transparent;
        color: var(--oppai-text-dim);
        font: inherit;
        cursor: pointer;
        transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
      }
      .site-tab:hover {
        background: var(--oppai-nav-hover);
      }
      .site-tab.on {
        background: var(--oppai-surface-2);
        border-color: var(--oppai-border-strong);
        color: var(--oppai-text);
      }
      .site-icon,
      .site-mono {
        width: 26px;
        height: 26px;
        border-radius: 7px;
        object-fit: contain;
        background: var(--oppai-surface-2);
      }
      .site-mono {
        display: grid;
        place-items: center;
        font-size: 14px;
        font-weight: 600;
        color: var(--oppai-text-dim);
      }
      .site-name {
        font-size: 11px;
        line-height: 1.2;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .site-tab.add {
        color: var(--oppai-primary-bright);
      }
      .feed-select {
        min-width: 190px;
        height: 40px;
        padding: 0 38px 0 14px;
        border-radius: 12px;
        border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-surface-2);
        color: var(--oppai-text);
        font: inherit;
        cursor: pointer;
      }
      .thread-tools {
        display: flex;
        gap: 10px;
        align-items: center;
        margin: 14px 0 22px;
        flex-wrap: wrap;
      }
      .thread-tools .searchbox { max-width: 420px; }
      .add-thread { margin-left: auto; margin-top: 0; margin-bottom: 0; }

      /* Search */
      .searchbar {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 20px;
      }
      .searchbox {
        flex: 1;
        max-width: 520px;
        height: 44px;
        background: var(--oppai-surface-2);
        border-radius: 22px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 16px;
      }
      .searchbox input {
        flex: 1;
        background: none;
        border: none;
        outline: none;
        color: var(--oppai-text);
        font: inherit;
        font-size: 14px;
      }
      .searchbox input::placeholder {
        color: var(--oppai-text-muted);
      }

      /* Grid + tiles — the library's tile, with the remote item's badges. */
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 22px;
      }
      .tile {
        cursor: pointer;
        border: none;
        padding: 0;
        background: none;
        text-align: left;
        font: inherit;
        color: inherit;
      }
      .tile-media {
        position: relative;
        width: 100%;
        aspect-ratio: 3 / 4;
        border-radius: 16px;
        overflow: hidden;
        background: var(--oppai-surface-2);
        transition: transform 0.28s var(--oppai-ease-emphasized),
          box-shadow 0.28s var(--oppai-ease-emphasized);
      }
      .tile:hover .tile-media {
        transform: translateY(-4px) scale(1.02);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
      }
      .tile:active .tile-media {
        transform: translateY(-1px) scale(0.99);
      }
      .tile-media img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.4s var(--oppai-ease-emphasized);
      }
      .tile:hover .tile-media img {
        transform: scale(1.06);
      }
      .tile-blank {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        color: var(--oppai-text-muted);
      }
      .tile-stat {
        position: absolute;
        bottom: 6px;
        right: 8px;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        font-weight: 600;
        color: #fff;
        background: rgba(0, 0, 0, 0.5);
        padding: 2px 6px;
        border-radius: 6px;
      }
      .play {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        color: #fff;
        text-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
        opacity: 0.85;
      }
      .tile-meta {
        padding: 10px 2px 0;
      }
      .tile-title {
        font-size: 13px;
        font-weight: 500;
        color: var(--oppai-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tile-tag {
        font-size: 12px;
        color: var(--oppai-text-muted);
        margin-top: 2px;
      }

      .empty {
        text-align: center;
        padding: 80px 0;
        color: var(--oppai-text-muted);
      }
      .more {
        display: grid;
        place-items: center;
        padding: 28px;
      }
      .source-notice, .feed-error {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin: 0 0 18px;
        padding: 11px 13px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 12px;
        color: var(--oppai-text-dim);
        background: var(--oppai-surface-2);
        font-size: 13px;
        line-height: 1.45;
      }
      .source-notice.warning { border-color: color-mix(in srgb, var(--oppai-primary) 50%, var(--oppai-border-strong)); }
      .source-notice.auth { border-color: color-mix(in srgb, #ffb4ab 55%, var(--oppai-border-strong)); }
      .feed-error { color: var(--oppai-error, #ffb4ab); }

      /* Preview overlay */
      .overlay {
        position: fixed;
        inset: 0;
        z-index: 50;
        background: rgba(0, 0, 0, 0.92);
        display: flex;
        flex-direction: column;
        animation: oppai-fade-in 0.2s var(--oppai-ease-standard) both;
      }
      .obar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        color: #fff;
      }
      .obar .t {
        flex: 1;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .obtn {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
        border: none;
        border-radius: 20px;
        height: 36px;
        padding: 0 16px;
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .obtn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      .obtn:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .ostage {
        flex: 1;
        display: grid;
        place-items: center;
        overflow: auto;
        padding: 8px;
        min-height: 0;
      }
      .ostage img,
      .ostage video {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      .pager {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        color: #fff;
        padding: 12px;
        font-size: 13px;
      }

      /* "Up next" — the rest of the feed as a scrubbable strip under the player.

         The rigid flex basis and the top padding are both about the scrubber. The
         player's controls are drawn inside the video along its bottom edge, so the
         strip's top edge is the only thing between them and the pointer — and as a
         shrinkable flex item the strip could be squeezed right up against the video on a
         short viewport. It keeps its size; the stage gives way instead. */
      .upnext {
        flex: 0 0 auto;
        padding: 24px 16px 14px;
        color: #fff;
      }
      .upnext-label {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 8px;
      }
      .strip {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        scroll-snap-type: x proximity;
        padding-bottom: 6px;
        /* A thin rail: this is a filmstrip, not a second grid. */
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.35) transparent;
      }
      .strip::-webkit-scrollbar {
        height: 6px;
      }
      .strip::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.35);
        border-radius: 3px;
      }
      .strip-item {
        position: relative;
        flex: 0 0 auto;
        width: 128px;
        aspect-ratio: 16 / 10;
        border: 2px solid transparent;
        border-radius: 10px;
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
      .strip-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .strip-play {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-size: 28px;
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
      /* Keep landscape playback unobstructed on phones. Items stay in the feed and
         remain preloaded/navigable; portrait restores the visible queue. */
      @media (orientation: landscape) and (max-height: 600px) {
        .upnext { display: none; }
        .obar { padding-left: max(16px, env(safe-area-inset-left)); padding-right: max(16px, env(safe-area-inset-right)); }
        .pager { padding-bottom: max(12px, env(safe-area-inset-bottom)); }
      }

      /* Comments — the thread the file was posted in. */
      .comments {
        justify-content: flex-end;
        align-items: stretch;
        flex-direction: row;
        z-index: 55;
      }
      .cpanel {
        width: min(460px, 100%);
        background: var(--oppai-surface);
        display: flex;
        flex-direction: column;
        box-shadow: -12px 0 40px rgba(0, 0, 0, 0.5);
        animation: oppai-fade-in 0.2s var(--oppai-ease-standard) both;
      }
      .chead {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--oppai-border-strong);
      }
      .chead .t {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
        color: var(--oppai-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chead .obtn {
        background: var(--oppai-surface-2);
        color: var(--oppai-text);
      }
      .clist {
        flex: 1;
        overflow-y: auto;
        padding: 8px 12px 20px;
      }
      .cempty {
        flex: 1;
        display: grid;
        place-items: center;
        color: var(--oppai-text-muted);
        font-size: 14px;
        padding: 40px 20px;
        text-align: center;
      }
      .cpost {
        border-radius: 12px;
        padding: 10px 12px;
        margin-top: 8px;
        background: var(--oppai-surface-2);
      }
      .cpost.op {
        background: var(--oppai-nav-hover);
      }
      /* The post the open file came from. Without this the list is a wall of
         anonymous text with no way to find your place in it. */
      .cpost.here {
        outline: 2px solid var(--oppai-accent);
      }
      .cmeta {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        font-size: 11px;
        color: var(--oppai-text-muted);
        margin-bottom: 6px;
      }
      .cname {
        font-weight: 600;
        color: var(--oppai-primary-bright);
      }
      .cbadge {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.3px;
        background: var(--oppai-surface);
        color: var(--oppai-text-dim);
        padding: 1px 6px;
        border-radius: 6px;
      }
      .cbadge.here-badge {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
      }
      .csub {
        font-size: 13px;
        font-weight: 600;
        color: var(--oppai-text);
        margin-bottom: 4px;
      }
      /* A post's own upload. It is a button, not a link: the file is already something
         this app can play, and sending a .webm out to a raw browser tab was throwing
         away the viewer, the thread it belongs to, and the way back. */
      .cattach {
        position: relative;
        display: block;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
        margin: 4px 0 6px;
        border-radius: 8px;
        line-height: 0;
        transition: transform 0.18s var(--oppai-ease-spring);
      }
      .cattach:hover {
        transform: scale(1.02);
      }
      .cthumb {
        max-width: 140px;
        border-radius: 8px;
        display: block;
      }
      .cplay {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-size: 34px;
        color: #fff;
        text-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
        pointer-events: none;
      }
      .ctext {
        font-size: 13px;
        line-height: 1.5;
        color: var(--oppai-text-dim);
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      /* Greentext is green; a quote points at another post. Flattening both into plain
         text would lose what the post is actually saying. */
      .cgreen {
        color: #789922;
      }
      .cquote {
        color: var(--oppai-primary-bright);
      }
      button.cquote {
        border: 0;
        padding: 0;
        background: none;
        font: inherit;
        cursor: pointer;
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .comment-search { padding: 10px 12px 2px; }
      .comment-search .searchbox { max-width: none; height: 40px; }

      .toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--oppai-surface-2);
        color: var(--oppai-text);
        padding: 12px 20px;
        border-radius: 12px;
        z-index: 60;
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
        animation: oppai-fade-in-up 0.28s var(--oppai-ease-emphasized) both;
      }
      @media (max-width: 600px) {
        .head { align-items: flex-start; flex-wrap: wrap; }
        .head-actions { width: 100%; margin-left: 0; flex-wrap: wrap; }
        .cthumb { width: min(240px, 72vw); max-width: 100%; }
        .thread-tools { align-items: stretch; }
        .thread-tools .searchbox { max-width: none; width: 100%; }
        .add-thread { margin-left: 0; width: 100%; }
      }
    `];l([k({type:Boolean,attribute:"can-add-sites"})],d.prototype,"canAddSites",2);l([n()],d.prototype,"sources",2);l([n()],d.prototype,"sourceId",2);l([n()],d.prototype,"iconFailed",2);l([n()],d.prototype,"addingSite",2);l([n()],d.prototype,"feedId",2);l([n()],d.prototype,"container",2);l([n()],d.prototype,"sort",2);l([n()],d.prototype,"query",2);l([n()],d.prototype,"draft",2);l([n()],d.prototype,"items",2);l([n()],d.prototype,"cursor",2);l([n()],d.prototype,"loading",2);l([n()],d.prototype,"loadingSources",2);l([n()],d.prototype,"error",2);l([n()],d.prototype,"active",2);l([n()],d.prototype,"pages",2);l([n()],d.prototype,"pageAt",2);l([n()],d.prototype,"saving",2);l([n()],d.prototype,"toast",2);l([n()],d.prototype,"commentsFor",2);l([n()],d.prototype,"comments",2);l([n()],d.prototype,"commentsLoading",2);l([n()],d.prototype,"commentsError",2);l([n()],d.prototype,"commentQuery",2);l([n()],d.prototype,"threadQuery",2);l([n()],d.prototype,"threadDraft",2);l([n()],d.prototype,"feeds",2);l([n()],d.prototype,"feedNew",2);l([n()],d.prototype,"feedBusy",2);l([n()],d.prototype,"feedsOpen",2);d=l([z("oppai-browse")],d);const O=4;function P(e){return e?new Date(e*1e3).toLocaleString(void 0,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):""}function E(e,t){return e.split(`
`).map(i=>{const s=!/^>>\d+/.test(i)&&i.startsWith(">"),r=i.split(/(>>\d+)/g);return a`<div class=${s?"cgreen":""}>${r.map(p=>{const u=p.match(/^>>(\d+)$/);return u?a`<button class="cquote" @click=${()=>t(Number(u[1]))}>${p}</button>`:p})}</div>`})}export{d as OppaiBrowse};
