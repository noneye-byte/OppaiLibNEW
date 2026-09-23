import{a as m,e as p,m as c,b as i,A as l,an as g,M as b,q as x,i as v,N as f,u as o,t as y}from"./index-DufD-B2G.js";var w=Object.defineProperty,$=Object.getOwnPropertyDescriptor,r=(e,t,s,n)=>{for(var d=n>1?void 0:n?$(t,s):t,h=e.length-1,u;h>=0;h--)(u=e[h])&&(d=(n?u(t,s,d):u(d))||d);return n&&d&&w(t,s,d),d};let a=class extends m{constructor(){super(...arguments),this.site="itch",this.sites=null,this.sitesError="",this.username="",this.password="",this.cookie="",this.signingIn=!1,this.signInError="",this.query="",this.draft="",this.sort="",this.items=[],this.page=1,this.hasMore=!1,this.loading=!1,this.error="",this.detail=null,this.detailLoading=!1,this.adding=!1,this.shot="",this.updates=null,this.updatesLoading=!1,this.sweepTimer=null}connectedCallback(){super.connectedCallback(),this.loadSites(),this.site==="updates"&&this.loadUpdates()}disconnectedCallback(){super.disconnectedCallback(),this.stopSweepPoll()}updated(e){var t;e.has("site")&&(this.items=[],this.query="",this.draft="",this.sort="",this.error="",this.detail=null,this.site==="updates"?this.loadUpdates():(t=this.account)!=null&&t.signedIn&&this.search(1))}get account(){return!this.sites||this.site==="updates"?null:this.sites.sites.find(e=>e.site===this.site)??null}async loadSites(){var e;try{this.sites=await p.gameSites(),this.sitesError="",this.site!=="updates"&&((e=this.account)!=null&&e.signedIn)&&!this.items.length&&this.search(1)}catch(t){this.sitesError=t.message}}async signIn(){if(this.site==="updates")return;const e=this.site;this.signingIn=!0,this.signInError="";try{const t=this.cookie.trim()?{cookie:this.cookie.trim()}:{username:this.username.trim(),password:this.password},s=await p.gameSiteLogin(e,t);this.sites=this.sites?{...this.sites,sites:this.sites.sites.map(n=>n.site===e?s:n)}:this.sites,this.password="",this.cookie="",s.signedIn&&this.search(1)}catch(t){this.signInError=t.message}finally{this.signingIn=!1}}async signOut(){if(this.site==="updates")return;const e=this.site;try{const t=await p.gameSiteLogout(e);this.sites=this.sites?{...this.sites,sites:this.sites.sites.map(s=>s.site===e?t:s)}:this.sites,this.items=[]}catch(t){c(t.message,"error")}}async toggleNsfw(){if(!this.sites)return;const e=!this.sites.itchNsfw;try{await p.saveSettings({itchNsfw:e}),this.sites={...this.sites,itchNsfw:e},this.search(1)}catch(t){c(t.message,"error")}}async search(e){if(this.site==="updates")return;const t=this.site;this.loading=!0,this.error="",e===1&&(this.items=[]);try{const s=await p.gameBrowse(t,this.query,this.sort,e);if(this.site!==t)return;this.items=e===1?s.items:[...this.items,...s.items],this.page=s.page,this.hasMore=s.hasMore}catch(s){this.error=s.message,/sign in/i.test(this.error)&&this.loadSites()}finally{this.loading=!1}}submit(e){e.preventDefault(),this.query=this.draft.trim(),this.search(1)}async open(e){var t;this.detail=e,this.shot="",this.detailLoading=!0;try{const{item:s}=await p.gameBrowseDetail(e);((t=this.detail)==null?void 0:t.id)===e.id&&(this.detail=s)}catch{}finally{this.detailLoading=!1}}async add(){const e=this.detail;if(e){this.adding=!0;try{const t=await p.gameBrowseAdd({url:e.url,id:e.id,version:e.version});this.items=this.items.map(s=>s.id===e.id&&s.site===e.site?{...s,libraryId:t.id}:s),this.detail={...e,libraryId:t.id},c(t.created?`Added ${e.title} to the library.`:`${e.title} was already in the library.`),this.dispatchEvent(new CustomEvent("imported",{bubbles:!0,composed:!0}))}catch(t){c(t.message,"error")}finally{this.adding=!1}}}async loadUpdates(){this.updatesLoading=!0;try{this.updates=await p.gameUpdates(),this.updates.sweep.running?this.startSweepPoll():this.stopSweepPoll()}catch(e){c(e.message,"error")}finally{this.updatesLoading=!1}}async checkAll(){try{await p.gameUpdatesCheck(),this.startSweepPoll(),this.loadUpdates()}catch(e){c(e.message,"error")}}startSweepPoll(){this.sweepTimer==null&&(this.sweepTimer=window.setInterval(()=>void this.loadUpdates(),2500))}stopSweepPoll(){this.sweepTimer!=null&&(clearInterval(this.sweepTimer),this.sweepTimer=null)}async acknowledge(e){try{await p.acknowledgeGameRemote(e),this.loadUpdates(),this.dispatchEvent(new CustomEvent("imported",{bubbles:!0,composed:!0}))}catch(t){c(t.message,"error")}}render(){if(this.site==="updates")return this.renderUpdates();if(this.sitesError)return i`<div class="empty">${this.sitesError}</div>`;if(!this.sites)return i`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`;const e=this.account;return e!=null&&e.signedIn?i`
      ${this.renderBar(e)}
      ${this.renderChips()}
      ${this.renderGrid()}
      ${this.detail?this.renderDetail(this.detail):l}
      ${this.shot?i`<div class="lightbox" @click=${()=>this.shot=""}><img src=${p.proxyURL(this.shot)} alt="" /></div>`:l}
    `:this.renderSignIn(e)}renderSignIn(e){const t=(e==null?void 0:e.label)??this.site,s=this.site==="itch";return i`
      <div class="signin">
        <h3>Sign in to ${t}</h3>
        ${s?i`<p>
              itch.io only shows adult games to an account that has asked for them, and
              its login page sits behind a browser check that a server cannot pass — so
              sign in here with the session cookie from a browser where you are already
              signed in. Open itch.io, open the developer tools (F12 → Application →
              Cookies) and copy the value of the <code>itchio</code> cookie. If Launchy is
              paired and signed in to itch.io, it hands its sign-in over on its own.
            </p>
            <label>itchio cookie</label>
            <textarea .value=${this.cookie} placeholder="itchio=…  (or just the value)"
              @input=${n=>this.cookie=n.target.value}></textarea>`:i`<p>
              F95zone hides most game threads and every download link from guests.
              Sign in with your F95zone account; the login is kept on the server and
              used only for reading the site.
            </p>
            <form @submit=${n=>{n.preventDefault(),this.signIn()}}>
              <label>Username</label>
              <input type="text" autocomplete="username" .value=${this.username}
                @input=${n=>this.username=n.target.value} />
              <label>Password</label>
              <input type="password" autocomplete="current-password" .value=${this.password}
                @input=${n=>this.password=n.target.value} />
              <button type="submit" hidden></button>
            </form>
            <div class="or">or, for an account with two-step verification</div>
            <label>xf_user cookie</label>
            <textarea .value=${this.cookie} placeholder="xf_user=…; xf_session=…  (or just the xf_user value)"
              @input=${n=>this.cookie=n.target.value}></textarea>`}
        <div class="row">
          <button class="btn-primary" ?disabled=${this.signingIn||!this.cookie.trim()&&(s||!this.username.trim()||!this.password)}
            @click=${()=>void this.signIn()}>
            <span class="material-symbols-rounded" style="font-size:20px;">login</span>
            ${this.signingIn?"Signing in…":"Sign in"}
          </button>
        </div>
        ${this.signInError?i`<div class="err">${this.signInError}</div>`:l}
      </div>
    `}renderBar(e){return i`
      <form class="bar" @submit=${this.submit}>
        <label class="searchbox">
          <span class="material-symbols-rounded" style="font-size:19px; color:var(--oppai-text-dim);">search</span>
          <input type="search" placeholder=${`Search ${e.label}…`} .value=${this.draft}
            @input=${t=>this.draft=t.target.value} />
        </label>
        <button class="btn-outline" type="submit" ?disabled=${this.loading}>Search</button>
        <div class="account">
          <span class="material-symbols-rounded" style="font-size:18px;">account_circle</span>
          ${e.user||"Signed in"}
          <button class="chip ghost" type="button" @click=${()=>void this.signOut()}>
            <span class="material-symbols-rounded" style="font-size:16px;">logout</span>Sign out
          </button>
        </div>
      </form>
    `}renderChips(){var n;if(!this.sites||this.site==="updates")return l;const e=this.sites.sorts[this.site]??[],t=this.sort||((n=e[0])==null?void 0:n.key)||"",s=this.site==="itch"&&this.query!=="";return i`
      <div class="chips" role="group" aria-label="Sort">
        ${s?i`<span class="chip" aria-pressed="true">Search results</span>`:e.map(d=>i`<button class="chip" aria-pressed=${t===d.key?"true":"false"}
              @click=${()=>{this.sort=d.key,this.search(1)}}>${d.label}</button>`)}
        ${this.site==="itch"?i`<button class="chip" style="margin-left:auto" aria-pressed=${this.sites.itchNsfw?"true":"false"}
              title="Ask itch.io for its adult listing" @click=${()=>void this.toggleNsfw()}>
              <span class="material-symbols-rounded" style="font-size:16px;">explicit</span>Adult
            </button>`:l}
      </div>
    `}renderGrid(){return this.error?i`<div class="empty">${this.error}</div>`:this.items.length?i`
      <div class="grid" role="list">
        ${this.items.map(e=>i`<button class="tile" role="listitem" @click=${()=>void this.open(e)}>
          <div class="tile-media">
            ${e.thumbnail?i`<img loading="lazy" src=${p.proxyURL(e.thumbnail)} alt="" />`:i`<div class="tile-blank"><span class="material-symbols-rounded" style="font-size:40px;">sports_esports</span></div>`}
            ${e.libraryId?i`<span class="badge owned"><span class="material-symbols-rounded" style="font-size:14px;">check</span>In library</span>`:e.webPlayable?i`<span class="badge"><span class="material-symbols-rounded" style="font-size:14px;">play_arrow</span>Browser</span>`:l}
          </div>
          <div class="tile-meta">
            <div class="tile-title" title=${e.title}>${e.title}</div>
            <div class="tile-sub">${[e.developer,e.version?`v${e.version}`:""].filter(Boolean).join(" · ")||e.tags.join(", ")}</div>
          </div>
        </button>`)}
      </div>
      <div class="more">
        ${this.loading?i`<md-circular-progress indeterminate></md-circular-progress>`:this.hasMore?i`<button class="btn-outline" @click=${()=>void this.search(this.page+1)}>Load more</button>`:l}
      </div>
    `:this.loading?i`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`:i`<div class="empty"><span class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;">search_off</span>Nothing here.</div>`}renderDetail(e){return i`
      <div class="sheet-backdrop" @click=${t=>{t.target===t.currentTarget&&(this.detail=null)}}>
        <div class="sheet" role="dialog" aria-label=${e.title}>
          <div class="sheet-head">
            <h2>${e.title}</h2>
            <button class="close" title="Close" @click=${()=>this.detail=null}>
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <div class="sheet-sub">
            ${[e.developer,e.version?`v${e.version}`:"",e.rating?`★ ${e.rating.toFixed(1)}`:"",e.nsfw?"Adult":""].filter(Boolean).join(" · ")}
            ${this.detailLoading?i` · reading the page…`:l}
          </div>
          ${e.images.length?i`<div class="shots">${e.images.map(t=>i`<button class="shot" @click=${()=>this.shot=t}>
                <img loading="lazy" src=${p.proxyURL(t)} alt="" /></button>`)}</div>`:l}
          ${e.description?i`<p class="desc">${e.description}</p>`:l}
          ${e.tags.length?i`<div class="tags">${e.tags.map(t=>i`<span class="tag">${t}</span>`)}</div>`:l}
          <div class="actions">
            ${e.libraryId?i`<button class="btn-primary" @click=${()=>{g(this,e.libraryId),this.detail=null}}>
                  <span class="material-symbols-rounded" style="font-size:20px;">check_circle</span>In library — open
                </button>`:i`<button class="btn-primary" ?disabled=${this.adding} @click=${()=>void this.add()}>
                  <span class="material-symbols-rounded" style="font-size:20px;">library_add</span>
                  ${this.adding?"Adding…":"Add to library"}
                </button>`}
            <a class="btn-outline" href=${e.url} target="_blank" rel="noreferrer">
              <span class="material-symbols-rounded" style="font-size:20px;">open_in_new</span>Open page
            </a>
          </div>
        </div>
      </div>
    `}renderUpdates(){const e=this.updates,t=e==null?void 0:e.sweep;return i`
      <div class="sweep">
        <button class="btn-primary" ?disabled=${t==null?void 0:t.running} @click=${()=>void this.checkAll()}>
          <span class="material-symbols-rounded" style="font-size:20px;">update</span>
          ${t!=null&&t.running?`Checking ${t.done}/${t.total}…`:"Check for updates"}
        </button>
        ${t!=null&&t.running&&t.current?i`<span>${t.current}</span>`:l}
        ${!(t!=null&&t.running)&&(t!=null&&t.lastRun)?i`<span>Last checked ${new Date(t.lastRun*1e3).toLocaleString()} · ${(e==null?void 0:e.tracked)??0} tracked${t.errors?` · ${t.errors} could not be read`:""}</span>`:l}
      </div>
      ${this.updatesLoading&&!e?i`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`:!e||!e.items.length?i`<div class="empty">
              <span class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;">check_circle</span>
              ${e&&e.tracked?"Everything is up to date.":"No game here came from itch.io or F95zone yet — add one from those tabs and its version will be watched."}
            </div>`:e.items.map(s=>i`<div class="urow">
              ${s.hasThumb?i`<img src=${p.thumbURL(s.id)} alt="" />`:i`<div class="cover-blank"><span class="material-symbols-rounded">sports_esports</span></div>`}
              <div class="body">
                <div class="t">${s.title}</div>
                <div class="v">${s.remote.knownVersion||"unknown"} → <b>${s.remote.latestVersion}</b> on ${s.remote.label}</div>
                ${s.remote.changelog?i`<div class="log">${s.remote.changelog}</div>`:l}
              </div>
              <div class="acts">
                <button class="icon-btn" title="Open in the library" @click=${()=>g(this,s.id)}>
                  <span class="material-symbols-rounded">sports_esports</span>
                </button>
                <a class="icon-btn" title="Open the page" href=${s.remote.url} target="_blank" rel="noreferrer">
                  <span class="material-symbols-rounded">open_in_new</span>
                </a>
                <button class="icon-btn" title="I have this version now" @click=${()=>void this.acknowledge(s.id)}>
                  <span class="material-symbols-rounded">done</span>
                </button>
              </div>
            </div>`)}
    `}};a.styles=[b,x,v`
      :host { display: block; color: var(--oppai-text); }

      .bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
      .searchbox {
        flex: 1; min-width: 220px; max-width: 520px; height: 44px;
        background: var(--oppai-surface-2); border-radius: 22px;
        display: flex; align-items: center; gap: 10px; padding: 0 16px;
      }
      .searchbox input {
        flex: 1; background: none; border: none; outline: none; color: var(--oppai-text);
        font: inherit; font-size: 14px; min-width: 0;
      }
      .account { margin-left: auto; display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--oppai-text-muted); }

      .chips { display: flex; gap: 8px; margin: 0 0 18px; flex-wrap: wrap; }
      .chip {
        height: 36px; padding: 0 16px; border-radius: 18px; font-size: 13px; font-weight: 500;
        font-family: inherit; cursor: pointer; display: flex; align-items: center; gap: 6px;
        background: transparent; color: var(--oppai-text-dim); border: 1px solid var(--oppai-border-strong);
        transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
      }
      .chip:hover { background: var(--oppai-nav-hover); }
      .chip[aria-pressed="true"] { background: var(--oppai-accent); color: var(--oppai-on-accent); border-color: var(--oppai-accent); }
      .chip:disabled { opacity: 0.5; cursor: default; }
      .chip.ghost { color: var(--oppai-primary-bright); }

      .btn-primary, .btn-outline {
        display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 20px;
        border-radius: 20px; font: inherit; font-size: 14px; font-weight: 500; cursor: pointer;
        text-decoration: none; white-space: nowrap;
      }
      .btn-primary { background: var(--oppai-accent); color: var(--oppai-on-accent); border: none; }
      .btn-outline { background: transparent; color: var(--oppai-text); border: 1px solid var(--oppai-border-strong); }
      .btn-primary:disabled, .btn-outline:disabled { opacity: 0.5; cursor: default; }

      /* The sign-in card. */
      .signin {
        max-width: 560px; margin: 24px auto; padding: 22px 24px; border-radius: 18px;
        background: var(--oppai-surface-1); border: 1px solid var(--oppai-border, rgba(255,255,255,.08));
      }
      .signin h3 { margin: 0 0 6px; font-size: 18px; font-weight: 500; }
      .signin p { margin: 0 0 14px; font-size: 13px; color: var(--oppai-text-muted); line-height: 1.5; }
      .signin label { display: block; font-size: 12px; color: var(--oppai-text-muted); margin: 10px 0 4px; }
      .signin input, .signin textarea {
        width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 10px; font: inherit;
        background: var(--oppai-surface-2); color: var(--oppai-text); border: 1px solid var(--oppai-border-strong);
      }
      .signin textarea { min-height: 72px; resize: vertical; font-family: ui-monospace, monospace; font-size: 12px; }
      .signin .row { display: flex; gap: 10px; align-items: center; margin-top: 16px; flex-wrap: wrap; }
      .err { color: var(--oppai-error, #ff6b6b); font-size: 13px; margin-top: 8px; }
      .or { margin: 18px 0 4px; font-size: 12px; color: var(--oppai-text-muted); text-transform: uppercase; letter-spacing: .06em; }

      /* Result cards. */
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 20px; }
      .tile { cursor: pointer; border: none; padding: 0; background: none; text-align: left; font: inherit; color: inherit; }
      .tile-media {
        position: relative; width: 100%; aspect-ratio: 4 / 3; border-radius: 14px; overflow: hidden;
        background: var(--oppai-surface-2);
        transition: transform 0.28s var(--oppai-ease-emphasized), box-shadow 0.28s var(--oppai-ease-emphasized);
      }
      .tile:hover .tile-media { transform: translateY(-4px) scale(1.02); box-shadow: 0 12px 28px rgba(0,0,0,.4); }
      .tile-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .tile-blank { position: absolute; inset: 0; display: grid; place-items: center; color: var(--oppai-text-muted); }
      .badge {
        position: absolute; top: 8px; left: 8px; display: inline-flex; align-items: center; gap: 4px;
        font-size: 11px; font-weight: 600; color: #fff; background: rgba(0,0,0,.55); padding: 3px 8px; border-radius: 8px;
      }
      .badge.owned { background: var(--oppai-accent); color: var(--oppai-on-accent); }
      .tile-meta { padding: 10px 2px 0; }
      .tile-title { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .tile-sub { font-size: 12px; color: var(--oppai-text-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

      .empty { text-align: center; padding: 80px 0; color: var(--oppai-text-muted); }
      .more { display: grid; place-items: center; padding: 28px 0 8px; }

      /* Detail sheet. */
      .sheet-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 40; display: grid; place-items: center; padding: 24px; }
      .sheet {
        width: min(860px, 100%); max-height: 90vh; overflow: auto; border-radius: 22px;
        background: var(--oppai-surface-1); border: 1px solid var(--oppai-border, rgba(255,255,255,.1));
        padding: 22px 24px;
      }
      .sheet-head { display: flex; align-items: flex-start; gap: 12px; }
      .sheet-head h2 { margin: 0; font-size: 22px; font-weight: 500; flex: 1; }
      .sheet-sub { font-size: 13px; color: var(--oppai-text-muted); margin: 4px 0 14px; }
      .close { border: none; background: transparent; color: var(--oppai-text-dim); cursor: pointer; padding: 4px; border-radius: 50%; }
      .close:hover { background: var(--oppai-nav-hover); }
      .shots { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; margin: 0 0 14px; }
      .shot { flex: 0 0 auto; height: 130px; border-radius: 10px; overflow: hidden; border: none; padding: 0; background: var(--oppai-surface-2); cursor: pointer; }
      .shot img { height: 100%; width: auto; display: block; }
      .desc { white-space: pre-wrap; font-size: 14px; line-height: 1.55; color: var(--oppai-text-dim); margin: 0 0 14px; }
      .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
      .tag { font-size: 12px; padding: 4px 10px; border-radius: 10px; background: var(--oppai-surface-2); color: var(--oppai-text-dim); }
      .actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
      .lightbox { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,.9); display: grid; place-items: center; cursor: zoom-out; }
      .lightbox img { max-width: 96vw; max-height: 96vh; object-fit: contain; }

      /* Updates list. */
      .sweep { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; font-size: 13px; color: var(--oppai-text-muted); flex-wrap: wrap; }
      .urow {
        display: flex; gap: 14px; align-items: center; padding: 12px; border-radius: 14px;
        background: var(--oppai-surface-1); border: 1px solid var(--oppai-border, rgba(255,255,255,.08)); margin-bottom: 10px;
      }
      .urow img { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; background: var(--oppai-surface-2); flex: 0 0 auto; }
      .urow .cover-blank { width: 56px; height: 56px; border-radius: 10px; display: grid; place-items: center; background: var(--oppai-surface-2); color: var(--oppai-text-muted); flex: 0 0 auto; }
      .urow .body { flex: 1; min-width: 0; }
      .urow .t { font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .urow .v { font-size: 13px; color: var(--oppai-text-muted); margin-top: 2px; }
      .urow .log { font-size: 12px; color: var(--oppai-text-dim); margin-top: 6px; white-space: pre-wrap; max-height: 96px; overflow: hidden; }
      .urow .acts { display: flex; gap: 6px; flex: 0 0 auto; }
      .icon-btn { border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text); border-radius: 50%; width: 38px; height: 38px; display: grid; place-items: center; cursor: pointer; }
      .icon-btn:hover { background: var(--oppai-nav-hover); }
    `];r([f()],a.prototype,"site",2);r([o()],a.prototype,"sites",2);r([o()],a.prototype,"sitesError",2);r([o()],a.prototype,"username",2);r([o()],a.prototype,"password",2);r([o()],a.prototype,"cookie",2);r([o()],a.prototype,"signingIn",2);r([o()],a.prototype,"signInError",2);r([o()],a.prototype,"query",2);r([o()],a.prototype,"draft",2);r([o()],a.prototype,"sort",2);r([o()],a.prototype,"items",2);r([o()],a.prototype,"page",2);r([o()],a.prototype,"hasMore",2);r([o()],a.prototype,"loading",2);r([o()],a.prototype,"error",2);r([o()],a.prototype,"detail",2);r([o()],a.prototype,"detailLoading",2);r([o()],a.prototype,"adding",2);r([o()],a.prototype,"shot",2);r([o()],a.prototype,"updates",2);r([o()],a.prototype,"updatesLoading",2);a=r([y("oppai-game-browse")],a);export{a as OppaiGameBrowse};
