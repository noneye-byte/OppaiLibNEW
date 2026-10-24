import{z as C,i as T,v as R,u as d,a as M,e as h,b as a,A as l,t as B,q as O,m as f,an as G,ao as K,ap as W,aq as N,ar as V,x as j,as as H,at as q,au as Y,av as J,aw as Q,ax as X,ay as Z,az as ee,aA as te,aB as z}from"./index-DWF3mBvk.js";import{r as se,p as ae}from"./passkeys-CoW_61gX.js";import{l as ie,a as oe,s as S,b as E,D as re,d as ne}from"./launchy-xyl1VS8H.js";const le=160,de=220;function ce(e){var u;const t=e.trim();if(t.length<=le)return t?[t]:[];const s=((u=t.match(/[^.!?…\n]+(?:[.!?…]+["”')]*|\n|$)/g))==null?void 0:u.map(g=>g.trim()).filter(Boolean))??[t],[o,...r]=s,i=[o];let n="";for(const g of r)n&&n.length+g.length+1>de&&(i.push(n),n=""),n=n?`${n} ${g}`:g;return n&&i.push(n),i}const _="oppai_libby_speak";function Re(){try{return localStorage.getItem(_)==="1"}catch{return!1}}function Me(e){try{localStorage.setItem(_,e?"1":"0")}catch{}e||F(),window.dispatchEvent(new CustomEvent("oppai-libby-speak",{detail:{on:e}}))}let k=null,I=0;async function U(e=!1){if(!e&&k&&Date.now()-I<6e4)return k;try{const t=await fetch("/api/tts/status",{credentials:"same-origin"});if(!t.ok)throw new Error(String(t.status));k=await t.json(),I=Date.now()}catch{k=null}return k}const L=[];let $=null,A=!1,x=0,P=Promise.resolve();function pe(e,t=0){const s=ce(e);if(!s.length)return Promise.resolve();const o=x,r=s.map(i=>new Promise(n=>{const u=P.then(()=>o===x?ve(i,t):null);P=u.catch(()=>null),L.push({text:i,heat:t,audio:u,done:n})}));return he(),Promise.all(r).then(()=>{})}function F(){var e;x++,P=Promise.resolve();for(const t of L.splice(0))t.done();$&&($.pause(),$.src="",$=null);try{(e=window.speechSynthesis)==null||e.cancel()}catch{}}async function he(){if(!A){A=!0;try{for(;L.length;){const e=L.shift(),t=x;try{await ue(e,t)}catch{}finally{e.done()}}}finally{A=!1}}}async function ue(e,t){const s=await e.audio.catch(()=>null);if(t===x){if(s){await ge(s,t);return}await be(e.text,t)}}async function ve(e,t){const s=await U();if(s&&!s.engine)return null;try{const o=await fetch("/api/tts/speak",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:e,heat:t||void 0})});return o.status===503?(k=null,null):o.ok?await o.blob():null}catch{return null}}function ge(e,t){return new Promise(s=>{const o=URL.createObjectURL(e),r=new Audio(o);$=r;const i=()=>{$===r&&($=null),URL.revokeObjectURL(o),s()};r.addEventListener("ended",i,{once:!0}),r.addEventListener("error",i,{once:!0}),r.play().catch(()=>{i()}),t!==x&&i()})}function be(e,t){const s=window.speechSynthesis;return!s||typeof SpeechSynthesisUtterance>"u"?Promise.resolve():new Promise(o=>{const r=new SpeechSynthesisUtterance(e),i=ye(s.getVoices());if(i&&(r.voice=i),r.rate=1.02,r.pitch=1.05,r.onend=()=>o(),r.onerror=()=>o(),t!==x){o();return}s.speak(r)})}function ye(e){const t=e.filter(r=>/^en/i.test(r.lang)),s=t.length?t:e,o=r=>{let i=0;const n=r.name.toLowerCase();return/natural|neural|premium|enhanced/.test(n)&&(i+=4),/female|woman|aria|jenny|samantha|zira|karen|moira|tessa|fiona|libby|sonia|ava|allison|susan|emma/.test(n)&&(i+=3),/google/.test(n)&&(i+=1),r.default&&(i+=1),i};return[...s].sort((r,i)=>o(i)-o(r))[0]}var fe=Object.defineProperty,me=Object.getOwnPropertyDescriptor,b=(e,t,s,o)=>{for(var r=o>1?void 0:o?me(t,s):t,i=e.length-1,n;i>=0;i--)(n=e[i])&&(r=(o?n(t,s,r):n(r))||r);return o&&r&&fe(t,s,r),r};let v=class extends M{constructor(){super(...arguments),this.embedded=!1,this.backgrounds=[],this.defaultID="",this.loading=!0,this.busy=!1,this.note="",this.bad=!1,this.editing=null,this.draftName="",this.draftTags="",this.version=Date.now()}connectedCallback(){super.connectedCallback(),this.reload()}async reload(){this.loading=!0;try{const e=await h.libbyBackgrounds();this.backgrounds=e.backgrounds??[],this.defaultID=e.default??""}catch(e){this.say(e.message,!0)}finally{this.loading=!1}}say(e,t=!1){this.note=e,this.bad=t}changed(){this.dispatchEvent(new CustomEvent("changed",{bubbles:!0,composed:!0}))}startNew(){this.editing="new",this.draftName="",this.draftTags=""}startEdit(e){this.editing=e.id,this.draftName=e.name,this.draftTags=e.tags.join(", ")}async save(e){const t=this.draftName.trim();if(!t){this.say("A background needs a name.",!0);return}this.busy=!0;try{await h.saveLibbyBackground({id:e,name:t,tags:this.draftTags.split(",").map(s=>s.trim()).filter(Boolean)}),this.editing=null,await this.reload(),this.changed(),this.say(e?`Saved ${t}.`:`Added ${t}. Give it a picture so she can go there.`)}catch(s){this.say(s.message,!0)}finally{this.busy=!1}}async uploadPicture(e,t){var r;const s=t.target,o=(r=s.files)==null?void 0:r[0];if(s.value="",!!o){this.busy=!0;try{const i=await new Promise((n,u)=>{const g=new FileReader;g.onload=()=>n(String(g.result)),g.onerror=()=>u(g.error),g.readAsDataURL(o)});await h.setLibbyBackgroundImage(e,i),this.version=Date.now(),await this.reload(),this.changed(),this.say("Picture saved.")}catch(i){this.say(i.message,!0)}finally{this.busy=!1}}}async makeDefault(e){this.busy=!0;try{const t=this.defaultID===e?"":e;await h.setLibbyDefaultBackground(t),this.defaultID=t,this.changed(),this.say(t?"She starts here now.":"No default room — she starts nowhere in particular.")}catch(t){this.say(t.message,!0)}finally{this.busy=!1}}async deleteBackground(e){if(confirm(`Delete ${e.name}?`)){this.busy=!0;try{await h.deleteLibbyBackground(e.id),await this.reload(),this.changed(),this.say(`Deleted ${e.name}.`)}catch(t){this.say(t.message,!0)}finally{this.busy=!1}}}renderEditor(e){return a`<div class="edit">
      <label>Name
        <input type="text" .value=${this.draftName} placeholder="Bedroom" ?disabled=${this.busy}
          @input=${t=>this.draftName=t.target.value} /></label>
      <label>Tags, comma separated
        <input type="text" .value=${this.draftTags} placeholder="bedroom, night, lamp, cosy" ?disabled=${this.busy}
          @input=${t=>this.draftTags=t.target.value} /></label>
      <div class="row">
        <button class="primary" ?disabled=${this.busy} @click=${()=>void this.save(e)}>${e?"Save":"Add"}</button>
        <button ?disabled=${this.busy} @click=${()=>this.editing=null}>Cancel</button>
      </div>
    </div>`}render(){return a`
      ${this.embedded?l:a`<div class="head">
        <div>
          <h3><span class="material-symbols-rounded">wallpaper</span>Backgrounds</h3>
          <p>
            The rooms behind her on a video call. Tag each one with what it is —
            "bedroom, night, cosy" — and she moves herself between them as the
            conversation goes, the same way she picks an expression. A background with
            no picture is never used.
          </p>
        </div>
        <div class="spacer"></div>
      </div>`}

      ${this.loading?a`<div class="empty">Loading…</div>`:a`<div class="grid">
            ${this.backgrounds.map(e=>a`
              <div class="card ${e.id===this.defaultID?"is-default":""}">
                <div class="shot">
                  ${e.hasImage?a`<img src=${h.libbyBackgroundURL(e.id,this.version)} alt=${`${e.name} background`} />`:a`<span class="none">No picture yet —<br />she won't go here</span>`}
                  ${e.id===this.defaultID?a`<span class="flag">Default</span>`:l}
                </div>
                <div class="body">
                  <span class="name">${e.name}</span>
                  <span class="tags">${e.tags.length?e.tags.join(", "):"No tags — she can only reach it by name"}</span>
                </div>
                ${this.editing===e.id?this.renderEditor(e.id):a`
                  <div class="acts">
                    <label class="file">
                      <input type="file" accept="image/*" @change=${t=>void this.uploadPicture(e.id,t)} />
                      <span class="material-symbols-rounded">image</span>${e.hasImage?"Replace":"Add picture"}
                    </label>
                    <button ?disabled=${this.busy} @click=${()=>this.startEdit(e)}>
                      <span class="material-symbols-rounded">edit</span>Rename</button>
                    <button ?disabled=${this.busy||!e.hasImage}
                      title=${e.hasImage?"Where she is when nobody has said":"Needs a picture first"}
                      @click=${()=>void this.makeDefault(e.id)}>
                      <span class="material-symbols-rounded">${e.id===this.defaultID?"star":"star_outline"}</span>
                      ${e.id===this.defaultID?"Default":"Make default"}</button>
                    <button class="danger" ?disabled=${this.busy} @click=${()=>void this.deleteBackground(e)}>
                      <span class="material-symbols-rounded">delete</span>Delete</button>
                  </div>`}
              </div>`)}
            ${this.editing==="new"?a`<div class="card">${this.renderEditor()}</div>`:a`<button class="new" ?disabled=${this.busy} @click=${()=>this.startNew()}>
                  <span class="material-symbols-rounded">add_photo_alternate</span>
                  New background</button>`}
          </div>`}

      ${!this.loading&&!this.backgrounds.length&&this.editing!=="new"?a`<div class="empty">No rooms yet. Add one, give it a picture, and she can start moving around.</div>`:l}
      ${this.note?a`<p class="note ${this.bad?"bad":""}">${this.note}</p>`:l}
    `}};v.styles=[C,T`
    :host { display: block; }
    .head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
    .head h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 15px; }
    .head p { margin: 0; color: var(--oppai-text-muted); font-size: 12.5px; line-height: 1.5; max-width: 62ch; }
    .head .spacer { flex: 1; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
    .card {
      display: flex; flex-direction: column; min-width: 0;
      border: 1px solid var(--oppai-border); border-radius: 14px;
      background: var(--oppai-surface-2); overflow: hidden;
    }
    .card.is-default { border-color: var(--oppai-primary); }
    .shot { position: relative; aspect-ratio: 16 / 10; background: var(--oppai-surface); display: grid; place-items: center; }
    .shot img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .shot .none { color: var(--oppai-text-muted); font-size: 12px; text-align: center; padding: 8px; }
    .flag {
      position: absolute; top: 8px; left: 8px; padding: 3px 8px; border-radius: 999px;
      background: var(--oppai-primary); color: var(--oppai-on-primary); font-size: 10.5px; font-weight: 700;
      letter-spacing: .04em; text-transform: uppercase;
    }
    .body { display: grid; gap: 4px; padding: 10px 12px; }
    .name { font-weight: 650; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tags { color: var(--oppai-text-muted); font-size: 11.5px; line-height: 1.4; min-height: 1.4em; }
    .acts { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 8px 9px; }
    button, .file {
      display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px;
      border: 1px solid var(--oppai-border); border-radius: 999px;
      background: transparent; color: var(--oppai-text-dim); cursor: pointer; font: inherit; font-size: 11.5px;
    }
    button:hover:not(:disabled), .file:hover { color: var(--oppai-text); border-color: var(--oppai-border-strong); }
    button:disabled { opacity: .5; cursor: default; }
    button.primary { background: var(--oppai-primary); border-color: var(--oppai-primary); color: var(--oppai-on-primary); }
    button.danger:hover:not(:disabled) { color: #f2b8b5; border-color: #f2b8b5; }
    .file input { display: none; }
    .material-symbols-rounded { font-size: 15px; }
    .edit { display: grid; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--oppai-border); }
    .edit label { display: grid; gap: 3px; font-size: 11px; font-weight: 700; letter-spacing: .04em;
      text-transform: uppercase; color: var(--oppai-text-muted); }
    .edit input {
      padding: 7px 9px; border: 1px solid var(--oppai-border); border-radius: 8px;
      background: var(--oppai-surface); color: var(--oppai-text); font: inherit; font-size: 13px;
      letter-spacing: normal; text-transform: none;
    }
    .edit .row { display: flex; gap: 6px; }
    .new {
      display: grid; place-items: center; gap: 6px; min-height: 150px;
      border: 1.5px dashed var(--oppai-border); border-radius: 14px;
      background: transparent; color: var(--oppai-text-muted); cursor: pointer; font-size: 12.5px;
    }
    .new:hover { border-color: var(--oppai-primary); color: var(--oppai-text); }
    .new .material-symbols-rounded { font-size: 28px; }
    .note { margin: 12px 0 0; padding: 9px 12px; border-radius: 10px; background: var(--oppai-surface-2); font-size: 12.5px; }
    .note.bad { background: color-mix(in srgb, #f2b8b5 16%, transparent); color: #f2b8b5; }
    .empty { padding: 26px; text-align: center; color: var(--oppai-text-muted); font-size: 13px; }
  `];b([R({type:Boolean})],v.prototype,"embedded",2);b([d()],v.prototype,"backgrounds",2);b([d()],v.prototype,"defaultID",2);b([d()],v.prototype,"loading",2);b([d()],v.prototype,"busy",2);b([d()],v.prototype,"note",2);b([d()],v.prototype,"bad",2);b([d()],v.prototype,"editing",2);b([d()],v.prototype,"draftName",2);b([d()],v.prototype,"draftTags",2);b([d()],v.prototype,"version",2);v=b([B("oppai-libby-backgrounds")],v);var we=Object.defineProperty,$e=Object.getOwnPropertyDescriptor,w=(e,t,s,o)=>{for(var r=o>1?void 0:o?$e(t,s):t,i=e.length-1,n;i>=0;i--)(n=e[i])&&(r=(o?n(t,s,r):n(r))||r);return o&&r&&we(t,s,r),r};const xe={itch:"itch.io",f95:"F95zone"},ke=4e3;let y=class extends M{constructor(){super(...arguments),this.status=null,this.keys=null,this.loadError="",this.link="",this.linkExpires=0,this.linking=!1,this.busy={},this.timer=null,this.linkIssuedAt=0}connectedCallback(){super.connectedCallback(),this.refresh(),this.loadKeys(),this.timer=window.setInterval(()=>void this.refresh(),ke)}disconnectedCallback(){super.disconnectedCallback(),this.timer!=null&&clearInterval(this.timer),this.timer=null}async refresh(){try{this.status=await h.launchyStatus(),this.loadError=""}catch(e){this.loadError=e.message}if(this.link)if(Date.now()/1e3>this.linkExpires)this.link="";else{await this.loadKeys();const e=(this.keys??[]).find(t=>t.createdAt>=this.linkIssuedAt);e&&(this.link="",f(`Launchy on ${e.name} is linked.`))}}async loadKeys(){try{this.keys=(await h.launchyKeys()).items}catch(e){this.loadError=e.message}}async makeLink(){this.linking=!0;try{const{code:e,expiresAt:t}=await h.launchyPairing();this.linkIssuedAt=Math.floor(Date.now()/1e3)-5,this.link=ie(location.origin,e),this.linkExpires=t,window.location.assign(this.link)}catch(e){f(e.message,"error")}finally{this.linking=!1}}async copyLink(e){var s;const t=(s=e.currentTarget.parentElement)==null?void 0:s.querySelector("input");try{await navigator.clipboard.writeText(this.link),f("Copied the link.")}catch{t==null||t.select(),f("Press Ctrl+C to copy the selected link.")}}async revoke(e){if(confirm(`Unlink Launchy on ${e.name}? It stops syncing until it is linked again.`))try{await h.revokeLaunchyKey(e.id),await this.loadKeys()}catch(t){f(t.message,"error")}}async run(e,t,s){this.busy={...this.busy,[e]:!0};try{const o=await h.launchyRequest(t),r=await oe(h.launchyRequestStatus,o.id,{timeout:t.action==="sync"?18e4:6e4});r.status==="done"?f(r.message||s):f(r.error||"Launchy could not do that.","error")}catch(o){f(o.message,"error")}finally{this.busy={...this.busy,[e]:!1},this.refresh()}}render(){return a`
      ${this.loadError?a`<div class="banner error"><span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.loadError}</div>`:l}
      ${this.renderLink()}
      ${this.renderPC()}
      ${this.renderRunning()}
      ${this.renderDownloads()}
    `}renderLink(){const e=this.keys??[];return a`
      <section class="card">
        <h3><span class="material-symbols-rounded">link</span>Link</h3>
        <p class="sub">
          Launchy is the desktop launcher. Linked, it keeps its games and this library in step,
          backs saves up here, and lets this app start, close and download games on the PC —
          and OppaiLib reads F95zone through it, because that site now only shows itself to a
          person at a real browser. Open this page on the PC and press the button; Launchy asks
          there before it links.
        </p>
        <div class="row">
          <div class="grow">
            <div class="label">${e.length?"Link another PC, or this one again":"Link Launchy"}</div>
            <div class="help">The link works once, for ten minutes. Linking a PC again replaces its old key.</div>
          </div>
          <button class="btn-primary" ?disabled=${this.linking} @click=${()=>void this.makeLink()}>
            <span class="material-symbols-rounded">link</span>${this.linking?"Making a link…":"Link Launchy"}
          </button>
        </div>
        ${this.link?a`<div class="linkbox">
              <input readonly .value=${this.link} @focus=${t=>t.target.select()} />
              <a class="btn-inline" href=${this.link}><span class="material-symbols-rounded">open_in_new</span>Open Launchy</a>
              <button class="btn-inline" @click=${t=>void this.copyLink(t)}>
                <span class="material-symbols-rounded">content_copy</span>Copy
              </button>
              <div class="help" style="flex-basis:100%;">
                Nothing happened? Launchy 0.5 or newer registers the link when it is installed — or paste it
                into Launchy under Settings → OppaiLib.
              </div>
            </div>`:l}
        ${e.map(t=>a`<div class="row">
            <span class="material-symbols-rounded" style="font-size:18px; color:var(--oppai-text-muted);">key</span>
            <div class="grow">
              <div class="label">${t.name}</div>
              <div class="help">
                Key …${t.hint} · linked ${new Date(t.createdAt*1e3).toLocaleDateString()} ·
                ${t.lastUsedAt?`last used ${S(t.lastUsedAt)}`:"not used yet"}
              </div>
            </div>
            <button class="btn-inline" @click=${()=>void this.revoke(t)}>
              <span class="material-symbols-rounded">link_off</span>Unlink
            </button>
          </div>`)}
      </section>
    `}renderPC(){var s,o,r,i;const e=this.status;if(!e)return l;const t=!!e.reportedAt;return a`
      <section class="card">
        <h3><span class="material-symbols-rounded">sports_esports</span>The PC</h3>
        <div class="row">
          <span class="dot ${e.connected?"on":""}"></span>
          <div class="grow">
            <div class="label">${e.connected?`Launchy is running on ${e.name||"the PC"}`:"Launchy is offline"}</div>
            <div class="help">
              ${e.version?`Version ${e.version} · `:""}last checked in ${S(e.lastSeen)}
              ${e.connected&&!t?a` · <span class="warn">an older Launchy — update it to control it from here</span>`:l}
            </div>
          </div>
          ${E(e,"sync")?a`<button class="btn-inline" ?disabled=${this.busy.sync||((s=e.sync)==null?void 0:s.running)}
                @click=${()=>void this.run("sync",{action:"sync"},"Synced.")}>
                <span class="material-symbols-rounded">sync</span>${this.busy.sync||(o=e.sync)!=null&&o.running?"Syncing…":"Sync now"}
              </button>`:l}
        </div>
        ${(r=e.sync)!=null&&r.lastSync||(i=e.sync)!=null&&i.lastError?a`<div class="row"><div class="grow">
              <div class="label">Library sync</div>
              <div class="help">
                ${e.sync.lastSync?`Last synced ${S(e.sync.lastSync)}`:"Not synced yet"}
                ${e.sync.lastError?a` · <span class="warn">${e.sync.lastError}</span>`:l}
              </div>
            </div></div>`:l}
        ${(e.accounts??[]).map(n=>a`<div class="row">
            <span class="dot ${n.challenged?"warn":n.signedIn?"on":""}"></span>
            <div class="grow">
              <div class="label">${xe[n.site]??n.site}</div>
              <div class="help">
                ${n.challenged?a`<span class="warn">Wants a person to prove they are one — press Verify next to it in Launchy on the PC.</span>`:n.signedIn?`Signed in${n.user?` as ${n.user}`:""} in Launchy`:"Not signed in in Launchy — sign in there, under Settings → Accounts"}
              </div>
            </div>
          </div>`)}
      </section>
    `}renderRunning(){const e=this.status;if(!(e!=null&&e.connected)||!e.reportedAt)return l;const t=e.sessions??[];return a`
      <section class="card">
        <h3><span class="material-symbols-rounded">play_arrow</span>Running</h3>
        ${t.length===0?a`<div class="empty">Nothing is running on the PC.</div>`:l}
        ${t.map(s=>{const o=`stop:${s.gameId}`;return a`<div class="row">
            <div class="grow">
              <div class="label">${s.title||"A game"}</div>
              <div class="help">Started ${S(s.startedAt)}</div>
            </div>
            ${E(e,"stop")?a`<button class="btn-inline" ?disabled=${this.busy[o]}
                  @click=${()=>{confirm(`Close ${s.title||"this game"} on the PC? Anything unsaved in it is lost.`)&&this.run(o,{action:"stop",gameId:s.gameId},"Closed.")}}>
                  <span class="material-symbols-rounded">stop_circle</span>${this.busy[o]?"Closing…":"Close"}
                </button>`:l}
          </div>`})}
      </section>
    `}renderDownloads(){const e=this.status;if(!(e!=null&&e.connected)||!e.reportedAt)return l;const t=e.downloads??[];return t.length?a`
      <section class="card">
        <h3><span class="material-symbols-rounded">download</span>Downloads on the PC</h3>
        ${t.map(s=>{const o=`cancel:${s.id}`;return a`<div class="row">
            <div class="grow">
              <div class="label">${s.title}${s.label?a` <span class="help">· ${s.label}</span>`:l}</div>
              <div class="help">
                ${re[s.status]??s.status}${s.message?` — ${s.message}`:""}
              </div>
            </div>
            ${ne(s)&&E(e,"download")?a`<button class="btn-inline" ?disabled=${this.busy[o]}
                  @click=${()=>void this.run(o,{action:"cancel-download",downloadId:s.id},"Cancelled.")}>
                  <span class="material-symbols-rounded">close</span>Cancel
                </button>`:l}
          </div>`})}
      </section>
    `:l}};y.styles=[C,O,T`
      :host { display: block; }
      .card {
        border-top: 1px solid var(--oppai-border);
        padding: 20px 0 4px;
        margin-bottom: 12px;
        animation: oppai-fade-in-up 0.28s var(--oppai-ease-emphasized) both;
      }
      .card:first-of-type { border-top: 0; padding-top: 0; }
      h3 {
        display: flex; align-items: center; gap: 10px;
        font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
        color: var(--oppai-text-dim); margin: 0 0 4px;
      }
      h3 .material-symbols-rounded { font-size: 17px; color: var(--oppai-primary-bright); }
      .sub { font-size: 13px; color: var(--oppai-text-muted); margin: 0 0 14px; }
      .row {
        display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
        padding: 10px 0; border-top: 1px solid var(--oppai-border);
      }
      .row:first-of-type { border-top: 0; }
      .row .grow { flex: 1; min-width: 180px; }
      .label { font-size: 14px; font-weight: 500; }
      .help { font-size: 12px; color: var(--oppai-text-muted); margin-top: 2px; }
      .warn { color: var(--oppai-fav); }
      .dot {
        width: 9px; height: 9px; border-radius: 50%; flex: 0 0 auto;
        background: var(--oppai-text-muted);
      }
      .dot.on { background: var(--oppai-primary-bright); }
      .dot.warn { background: var(--oppai-fav); }
      .btn-primary, .btn-inline {
        display: inline-flex; align-items: center; gap: 6px;
        font: inherit; cursor: pointer; text-decoration: none;
      }
      .btn-primary {
        height: 40px; padding: 0 20px; border-radius: 20px; border: none;
        background: var(--oppai-primary); color: var(--oppai-on-primary);
        font-size: 14px; font-weight: 600;
      }
      .btn-inline {
        border: 1px solid var(--oppai-border-strong); border-radius: 10px;
        background: transparent; color: var(--oppai-text-dim);
        font-size: 12px; padding: 7px 10px;
      }
      .btn-primary[disabled], .btn-inline[disabled] { opacity: 0.5; cursor: default; }
      .btn-primary .material-symbols-rounded, .btn-inline .material-symbols-rounded { font-size: 17px; }
      .linkbox {
        display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
        margin: 12px 0 4px; padding: 12px; border-radius: 12px; background: var(--oppai-surface-2);
      }
      .linkbox input {
        flex: 1; min-width: 200px;
        background: var(--oppai-surface); border: 1px solid var(--oppai-border-strong);
        border-radius: 10px; color: var(--oppai-text); font: inherit; font-size: 12px; padding: 8px 10px;
      }
      .banner {
        display: flex; align-items: center; gap: 8px; font-size: 13px;
        border-radius: 12px; padding: 10px 14px; margin-bottom: 16px;
      }
      .banner.error { background: color-mix(in srgb, var(--oppai-fav) 18%, transparent); color: var(--oppai-fav); }
      .banner.info { background: var(--oppai-surface-2); color: var(--oppai-text-dim); }
      .empty { font-size: 13px; color: var(--oppai-text-muted); padding: 6px 0 10px; }
    `];w([d()],y.prototype,"status",2);w([d()],y.prototype,"keys",2);w([d()],y.prototype,"loadError",2);w([d()],y.prototype,"link",2);w([d()],y.prototype,"linkExpires",2);w([d()],y.prototype,"linking",2);w([d()],y.prototype,"busy",2);y=w([B("oppai-launchy-panel")],y);var Se=Object.defineProperty,Le=Object.getOwnPropertyDescriptor,p=(e,t,s,o)=>{for(var r=o>1?void 0:o?Le(t,s):t,i=e.length-1,n;i>=0;i--)(n=e[i])&&(r=(o?n(t,s,r):n(r))||r);return o&&r&&Se(t,s,r),r};const Ee=[{id:"appearance",label:"Appearance",icon:"palette",group:"You"},{id:"account",label:"Account",icon:"account_circle",group:"You"},{id:"ai",label:"AI tagging",icon:"smart_toy",group:"Server",server:!0},{id:"scraping",label:"Scraping",icon:"travel_explore",group:"Server",server:!0},{id:"library",label:"Library",icon:"inventory_2",group:"Server"},{id:"android",label:"Android app",icon:"android",group:"Server"},{id:"launchy",label:"Launchy",icon:"sports_esports",group:"Server"},{id:"storage",label:"Storage",icon:"hard_drive",group:"Server"},{id:"diagnostics",label:"Diagnostics",icon:"speed",group:"Server",adminOnly:!0},{id:"privacy",label:"Privacy",icon:"visibility_off",group:"Server",server:!0,adminOnly:!0},{id:"about",label:"About",icon:"info",group:"Server"}];let c=class extends M{constructor(){super(...arguments),this.only="",this.tab="appearance",this.settings=null,this.info=null,this.stats=null,this.apk=null,this.loadError="",this.passkeyList=null,this.passkeyBusy=!1,this.passkeyError="",this.passkeyMsg="",this.passkeyName="",this.passkeyRenaming=null,this.passkeyRevoking=null,this.passkeyPassword="",this.diag=null,this.uiDiag=null,this.storage=null,this.storageBusy=!1,this.storageErr="",this.diagBusy=!1,this.diagErr="",this.dirty=!1,this.saving=!1,this.saved=!1,this.theme=G(),this.fit=K(),this.hideLibby=W(),this.genModels=[],this.genLoras=[],this.genLoraTriggers={},this.genBoards=[],this.genError="",this.pwCurrent="",this.pwNew="",this.pwConfirm="",this.pwBusy=!1,this.pwMsg="",this.pwErr="",this.refs=null,this.refStamp=Date.now(),this.refNote="",this.tts=void 0,this.describe=null,this.describeBusy=!1,this.describeNote="",this.ttsErrors={},this.addPasskey=async()=>{this.passkeyBusy=!0,this.passkeyError="",this.passkeyMsg="";try{const e=await se(this.passkeyName.trim());this.passkeyName="",this.passkeyMsg=`Added “${e.name}”. You can sign in with it now.`,await this.loadPasskeys()}catch(e){const t=ae(e);t&&(this.passkeyError=t)}finally{this.passkeyBusy=!1}},this.cancelRevoke=()=>{this.passkeyRevoking=null,this.passkeyPassword=""},this.loadStorage=async()=>{this.storageBusy=!0,this.storageErr="";try{this.storage=await h.storage()}catch(e){this.storageErr=e.message}finally{this.storageBusy=!1}},this.runCleanup=async()=>{this.storageBusy=!0,this.storageErr="";try{const e=await h.cleanupStorage(["uploads","temp"]);this.storage=e.storage,f(`Reclaimed ${e.freedHuman}.`,"success")}catch(e){this.storageErr=e.message}finally{this.storageBusy=!1}},this.loadDiagnostics=async()=>{this.diagBusy=!0,this.diagErr="";try{this.diag=await h.diagnostics(),this.uiDiag=N()}catch(e){this.diagErr=e.message}finally{this.diagBusy=!1}},this.resetDiagnostics=async()=>{this.diagBusy=!0,this.diagErr="";try{V(),await h.resetDiagnostics(),this.diag=await h.diagnostics(),this.uiDiag=N()}catch(e){this.diagErr=e.message}finally{this.diagBusy=!1}}}connectedCallback(){super.connectedCallback(),j(this,"settings"),this.load(),this.loadGenLists(),this.loadTTS(),this.loadDescribe(),this.loadReferences()}async loadReferences(){try{this.refs=await h.libbyReferences()}catch{this.refs=null}}async setReference(e,t){var r;const s=(r=t.files)==null?void 0:r[0];if(t.value="",!s)return;const o=await new Promise((i,n)=>{const u=new FileReader;u.onload=()=>i(String(u.result)),u.onerror=()=>n(u.error),u.readAsDataURL(s)});try{await h.setLibbyReference(e,o),this.refNote="",this.refStamp=Date.now(),await this.loadReferences()}catch(i){this.refNote=i.message}}async clearReference(e){try{await h.deleteLibbyReference(e),this.refNote="",await this.loadReferences()}catch(t){this.refNote=t.message}}referenceTile(e,t){var o;const s=!!((o=this.refs)!=null&&o[e]);return a`<div style="display:flex;flex-direction:column;gap:6px;align-items:center;width:132px;">
      <div style="width:132px;height:176px;border-radius:12px;overflow:hidden;display:grid;place-items:center;
        background:var(--md-sys-color-surface-container-highest);color:var(--md-sys-color-on-surface-variant);font-size:12px;text-align:center;">
        ${s?a`<img src=${h.libbyReferenceURL(e,this.refStamp)} alt=${`Libby, ${t.toLowerCase()}`} style="width:100%;height:100%;object-fit:cover;"/>`:a`<span>No picture</span>`}
      </div>
      <strong style="font-size:12px;">${t}</strong>
      <div style="display:flex;gap:6px;">
        <label class="btn-inline">
          ${s?"Replace":"Upload"}
          <input type="file" accept="image/*" hidden ?disabled=${!this.canEdit}
            @change=${r=>void this.setReference(e,r.target)}/>
        </label>
        ${s?a`<button class="btn-inline" ?disabled=${!this.canEdit}
          @click=${()=>void this.clearReference(e)}>Remove</button>`:l}
      </div>
    </div>`}async load(){try{const[e,t]=await Promise.all([h.getSettings(),h.stats()]);this.settings=e.settings,this.info=e.readOnly,this.stats=t}catch(e){this.loadError=e.message}try{this.apk=await h.apkInfo()}catch{this.apk={available:!1}}}get canEdit(){var e;return!!((e=this.user)!=null&&e.isAdmin)}openTab(e){H(()=>{this.tab=e}),e==="diagnostics"&&!this.diag&&!this.diagBusy&&this.loadDiagnostics(),e==="storage"&&!this.storage&&!this.storageBusy&&this.loadStorage(),e==="account"&&!this.passkeyList&&this.loadPasskeys()}editLora(e,t){var o;const s=[...((o=this.settings)==null?void 0:o.libbyGenLoras)??[]];s[e]&&(s[e]={...s[e],...t},this.edit({libbyGenLoras:s}))}editCameraLora(e,t){var r;const s=[...((r=this.settings)==null?void 0:r.libbyCameraLoras)??[]];if(!s[e])return;const o={...s[e],...t};t.name&&!s[e].trigger&&(o.trigger=this.genLoraTriggers[t.name]??""),s[e]=o,this.edit({libbyCameraLoras:s})}edit(e){!this.settings||!this.canEdit||(this.settings={...this.settings,...e},this.dirty=!0,this.saved=!1)}async save(){if(this.settings){this.saving=!0;try{const e=await h.saveSettings(this.settings);this.settings=e.settings,this.info=e.readOnly,this.dirty=!1,this.saved=!0,q(!!e.settings.incognito),this.loadTTS(!0),this.loadDescribe()}catch(e){this.loadError=e.message}finally{this.saving=!1}}}pickTheme(e){this.theme=e,Y(e),J(e)}pickFit(e){this.fit=e,Q(e)}async changePassword(){if(this.pwMsg="",this.pwErr="",this.pwNew!==this.pwConfirm){this.pwErr="The new passwords don't match.";return}if(this.pwNew.length<8){this.pwErr="Use at least 8 characters.";return}this.pwBusy=!0;try{await h.changePassword(this.pwCurrent,this.pwNew),this.pwMsg="Password changed.",this.pwCurrent=this.pwNew=this.pwConfirm=""}catch(e){this.pwErr=e.message}finally{this.pwBusy=!1}}render(){if(this.only)return this.renderOnly(this.only);const e=Ee.filter(r=>!r.adminOnly||this.canEdit),t=e.find(r=>r.id===this.tab)??e[0],s=this.dirty||this.saved;let o="";return a`
      <div class="shell">
        <nav class="cat-rail" aria-label="Settings categories">
          ${e.map(r=>{const i=r.group===o?l:a`<div class="cat-head">${r.group}</div>`;return o=r.group,a`${i}
              <button
                class="cat-row ${r.id===this.tab?"on":""}"
                aria-current=${r.id===this.tab?"page":"false"}
                @click=${()=>this.openTab(r.id)}
              >
                <span class="material-symbols-rounded">${r.icon}</span>
                <span class="cat-label">${r.label}</span>
              </button>`})}
          <div class="cat-sep"></div>
          <button class="cat-row danger" @click=${()=>this.dispatchEvent(new CustomEvent("logout",{bubbles:!0,composed:!0}))}>
            <span class="material-symbols-rounded">logout</span>
            <span class="cat-label">Sign out</span>
          </button>
        </nav>

        <div class="panel-col">
          <h2 class="panel-title">${t.label}</h2>
          ${this.loadError?a`<div class="banner error">
                <span class="material-symbols-rounded" style="font-size:18px;">error</span>
                ${this.loadError}
              </div>`:l}
          ${!this.canEdit&&this.settings&&t.server?a`<div class="banner info">
                <span class="material-symbols-rounded" style="font-size:18px;">lock</span>
                Server settings are read-only — only an admin can change them.
              </div>`:l}
          ${this.renderTab()}
          ${s?this.renderSaveBar():l}
        </div>
      </div>
    `}renderOnly(e){const t={"libby-general":()=>this.renderLibby(),"libby-model":()=>this.renderLibbyModel(),"libby-voice":()=>this.renderLibbyVoice(),"libby-pictures":()=>a`${this.renderLibbyImageGen()}${this.renderLibbyReferences()}`}[e];return a`<div class="embedded">
      ${this.loadError?a`<div class="banner error"><span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.loadError}</div>`:l}
      ${!this.canEdit&&this.settings&&e!=="libby-general"?a`<div class="banner info"><span class="material-symbols-rounded" style="font-size:18px;">lock</span>Server settings are read-only — only an admin can change them.</div>`:l}
      ${t()}
      ${this.dirty||this.saved?this.renderSaveBar():l}
    </div>`}renderTab(){switch(this.tab){case"appearance":return this.renderAppearance();case"libby":return this.renderLibby();case"backgrounds":return a`<section class="card"><oppai-libby-backgrounds></oppai-libby-backgrounds></section>`;case"ai":return this.renderAI();case"scraping":return this.renderScraping();case"library":return this.renderLibrary();case"android":return this.renderAndroid();case"launchy":return a`<oppai-launchy-panel></oppai-launchy-panel>`;case"account":return this.renderAccount();case"storage":return this.renderStorage();case"diagnostics":return this.renderDiagnostics();case"privacy":return this.renderPrivacy();default:return this.renderAbout()}}renderSaveBar(){return a`
      <div class="savebar">
        <span class="grow">
          ${this.saved&&!this.dirty?"Settings saved — they're live now.":"You have unsaved changes."}
        </span>
        <button class="btn-primary" ?disabled=${this.saving||!this.dirty} @click=${this.save}>
          <span class="material-symbols-rounded" style="font-size:20px;">save</span>
          ${this.saving?"Saving…":"Save"}
        </button>
      </div>
    `}renderAndroid(){const e=this.apk;return a`
      <section class="card">
        <h3><span class="material-symbols-rounded">android</span>Android app</h3>
        <p class="card-sub">
          Install the companion app straight from this server — no app store, no
          sideloading from a third party.
        </p>

        ${e===null?a`<p class="field-help">Checking…</p>`:e.available?a`
                <div class="field">
                  <div class="field-text">
                    <div class="field-label">oppailib.apk</div>
                    <div class="field-help">
                      ${m(e.size??0)} · built
                      ${new Date((e.modified??0)*1e3).toLocaleDateString()}
                      ${e.sha256?a`<br /><span style="font-family:monospace; font-size:11px;"
                            >sha256 ${e.sha256.slice(0,16)}…</span
                          >`:l}
                    </div>
                  </div>
                  <div class="field-control">
                    <a href="/api/apk" download="oppailib.apk">
                      <button class="btn-primary">
                        <span class="material-symbols-rounded" style="font-size:20px;">download</span>
                        Download
                      </button>
                    </a>
                  </div>
                </div>

                <div class="field">
                  <div class="field-text">
                    <div class="field-label">Install on a phone</div>
                    <div class="field-help">
                      Open this page on the phone, sign in, and tap Download. Android
                      asks you to allow installing from the browser the first time.
                    </div>
                  </div>
                  <div class="field-control">
                    <code style="font-size:12px; opacity:0.8;">${location.origin}/api/apk</code>
                  </div>
                </div>
              `:a`<p class="field-help">
                No APK is bundled with this server build. Drop one at
                <code>/config/oppailib.apk</code>, or grab it from the Actions run that
                built this image.
              </p>`}
      </section>
    `}renderAppearance(){return a`
      <section class="card">
        <h3><span class="material-symbols-rounded">palette</span>Appearance</h3>
        <p class="card-sub">Per-device — applies as soon as you pick it.</p>

        <div class="field">
          <div class="field-text">
            <div class="field-label">Theme</div>
            <div class="field-help">"System" follows your OS light/dark setting.</div>
          </div>
          <div class="field-control seg">
            ${[["dark","Dark","dark_mode"],["light","Light","light_mode"],["system","System","contrast"]].map(([e,t,s])=>a`<button
                class=${this.theme===e?"on":""}
                @click=${()=>this.pickTheme(e)}
              >
                <span class="material-symbols-rounded" style="font-size:18px;">${s}</span>${t}
              </button>`)}
          </div>
        </div>

        <div class="field">
          <div class="field-text">
            <div class="field-label">Comic page size</div>
            <div class="field-help">
              How pages are sized in the reader. Fit page shows the whole page; fit width fills the
              column and scrolls.
            </div>
          </div>
          <div class="field-control seg">
            ${[["page","Fit page","fit_screen"],["width","Fit width","fit_width"]].map(([e,t,s])=>a`<button
                class=${this.fit===e?"on":""}
                @click=${()=>this.pickFit(e)}
              >
                <span class="material-symbols-rounded" style="font-size:18px;">${s}</span>${t}
              </button>`)}
          </div>
        </div>
      </section>
    `}renderPrivacy(){const e=this.settings,t=!!(e!=null&&e.incognito);return a`
      <section class="card">
        <h3><span class="material-symbols-rounded">visibility_off</span>Incognito</h3>
        <p class="card-sub">Server-wide — every browser and device sees it.</p>

        <div class="field">
          <div class="field-text">
            <div class="field-label">Appear as a Nextcloud instance</div>
            <div class="field-help">
              The sign-in page becomes a Nextcloud login, the tab is titled
              <strong>Nextcloud</strong> with a cloud icon, and the server answers
              <code>/status.php</code>, the OCS and DAV endpoints and its response
              headers the way a Nextcloud behind Apache does. The public, signed-out
              surface stays in character. Your real username and password still sign
              you in; after authentication the full library opens and Libby, Chat,
              Studio, and normal reactions remain available.
            </div>
          </div>
          <div class="field-control">
            <button
              class="switch ${t?"on":""}"
              role="switch"
              aria-checked=${t?"true":"false"}
              aria-label="Appear as a Nextcloud instance"
              ?disabled=${!e||!this.canEdit}
              @click=${()=>this.edit({incognito:!t})}
            ></button>
          </div>
        </div>

        <!-- Stated because the failure mode of a disguise is being trusted for more
             than it does. Everything below is true of any such skin, and none of it
             is fixable from inside the app. -->
        <div class="banner info">
          <span class="material-symbols-rounded" style="font-size:18px;">info</span>
          <div>
            <strong>What this doesn't do.</strong> It is a disguise, not encryption or
            anonymity. Over HTTPS the hostname is still visible to your network and to
            DNS, so point a matching subdomain at this server. Anyone who signs in sees
            the real library, and anyone with your browser sees its history. Media
            filenames, page titles and any file you download are unchanged.
          </div>
        </div>
      </section>
    `}renderLibby(){return a`
      <section class="card">
        <h3><span class="material-symbols-rounded">face_3</span>Libby</h3>
        <p class="card-sub">Per-device — applies as soon as you pick it.</p>

        <div class="field">
          <div class="field-text">
            <div class="field-label">Hide Libby</div>
            <div class="field-help">
              Take the mascot off the login screen, error popups, and the Chat tab.
              Errors still show as plain messages, and Chat keeps working — just without
              the artwork.
            </div>
          </div>
          <div class="field-control">
            <button
              class="switch ${this.hideLibby?"on":""}"
              role="switch"
              aria-checked=${this.hideLibby?"true":"false"}
              aria-label="Hide Libby"
              @click=${()=>{this.hideLibby=!this.hideLibby,X(this.hideLibby)}}
            ></button>
          </div>
        </div>

        <div class="field">
          <div class="field-text">
            <div class="field-label">Mood progression speed</div>
            <div class="field-help">
              Controls how quickly normal app activity moves Libby between tiers. Chat tabs keep
              their own progress. Manual mood changes still apply immediately.
            </div>
          </div>
          <div class="field-control seg">
            ${Z.map(e=>a`<button
              class=${ee()===e?"on":""}
              @click=${()=>{te(e),this.requestUpdate()}}
            >${e}×</button>`)}
          </div>
        </div>

        <div class="field stack">
          <div class="field-text">
            <div class="field-label">Outfits</div>
            <div class="field-help">
              Dressing Libby up now lives in the <strong>Studio</strong>, beside the board
              that generates the artwork — building a wardrobe is creative work rather
              than a preference, and it belongs next to the thing that makes the sprites.
            </div>
          </div>
          <div class="field-control">
            <button class="btn" @click=${()=>this.dispatchEvent(new CustomEvent("open-studio",{bubbles:!0,composed:!0}))}>
              Open the outfit studio
            </button>
          </div>
        </div>
      </section>
    `}renderLibbyVoice(){const e=this.settings;if(!e)return l;const t=this.tts,s=(t==null?void 0:t.voices)??[],o=s.filter(n=>n.installed),r=s.filter(n=>!n.installed),i=new Set((t==null?void 0:t.downloading)??[]);return a`<section class="card">
      <h3><span class="material-symbols-rounded">record_voice_over</span>Libby’s voice</h3>
      <p class="card-sub">
        ${t===void 0?"Checking the server…":t?t.engine==="kokoro"&&t.ready?a`Speaking with <strong>Kokoro</strong>, the natural voice, on the server’s CPU. Turn playback on per device with the speaker button in Chat.`:t.engine==="piper"&&t.ready?a`Speaking with <strong>piper</strong> on the server’s CPU. Turn playback on per device with the speaker button in Chat.`:t.engine==="openai"&&t.ready?a`Speaking through the speech server at <code>${e.ttsUrl}</code>.`:a`Not speaking from the server${t.detail?a` — ${t.detail}`:l}. Devices fall back to their own voices.`:"The server did not answer about speech."}
      </p>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Engine</div>
          <div class="field-help">Auto uses the most natural voice there is — a speech server when one is set below (falling back to this box if it fails), then Kokoro, then piper. Piper is quicker and flatter; Off leaves devices to their own voices.</div>
        </div>
        <div class="field-control">
          <select ?disabled=${!this.canEdit} @change=${n=>this.edit({ttsEngine:n.target.value})}>
            ${[["auto","Auto"],["kokoro",`Kokoro — natural${t&&!t.kokoroInstalled?" (not installed)":""}`],["piper",`Piper — light${t&&!t.piperInstalled?" (not installed)":""}`],["openai","Speech server"],["off","Off"]].map(([n,u])=>a`<option value=${n} ?selected=${e.ttsEngine===n}>${u}</option>`)}
          </select>
        </div>
      </div>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Voice</div>
          <div class="field-help">${o.length?"Installed voices. Downloaded ones can be removed below.":"No voice is installed yet — download one below."}</div>
        </div>
        <div class="field-control" style="display:flex; gap:8px; align-items:center;">
          <select ?disabled=${!this.canEdit} @change=${n=>this.edit({ttsVoice:n.target.value})}>
            <option value="" ?selected=${!e.ttsVoice}>Engine’s default</option>
            ${o.map(n=>a`<option value=${n.id} ?selected=${n.id===e.ttsVoice}>${n.label}${n.bundled?" · bundled":""}</option>`)}
            ${e.ttsVoice&&!o.some(n=>n.id===e.ttsVoice)?a`<option value=${e.ttsVoice} selected>${e.ttsVoice} (not installed)</option>`:l}
          </select>
          <button class="btn" ?disabled=${!(t!=null&&t.ready)} title="Hear the current voice" @click=${()=>void this.testVoice()}>Test</button>
        </div>
      </div>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Pace</div>
          <div class="field-help">${e.ttsSpeed.toFixed(2)}× — under 1 is slower, over 1 quicker.</div>
        </div>
        <div class="field-control">
          <input type="range" min="0.5" max="2" step="0.05" .value=${String(e.ttsSpeed)} ?disabled=${!this.canEdit}
            @input=${n=>this.edit({ttsSpeed:Number(n.target.value)})} />
        </div>
      </div>

      ${t!=null&&t.piperInstalled&&t.engine!=="kokoro"?a`<div class="field stack">
        <div class="field-text">
          <div class="field-label">Piper voices</div>
          <div class="field-help">A curated handful from piper’s voice set, fetched from Hugging Face onto the server (20–110 MB each). Any other piper voice dropped into <code>/config/tts</code> is listed too.</div>
        </div>
        <div class="field-control">
          <ul class="voice-list">
            ${o.map(n=>a`<li><span>${n.label}<small>${n.quality??""}${n.bundled?" · bundled":""}</small></span>
              ${!n.bundled&&this.canEdit?a`<button class="btn" @click=${()=>void this.deleteVoice(n.id)}>Remove</button>`:l}</li>`)}
            ${r.map(n=>a`<li><span>${n.label}<small>${n.quality??""}${n.bytes?` · ${Math.round(n.bytes/1e6)} MB`:""}</small></span>
              ${this.ttsErrors[n.id]?a`<em class="voice-error">${this.ttsErrors[n.id]}</em>`:l}
              ${i.has(n.id)?a`<span class="hint">Downloading…</span>`:this.canEdit?a`<button class="btn" @click=${()=>void this.downloadVoice(n.id)}>Download</button>`:l}</li>`)}
          </ul>
        </div>
      </div>`:l}

      <div class="field stack">
        <div class="field-text">
          <div class="field-label">Speech server (optional)</div>
          <div class="field-help">An OpenAI-compatible <code>/v1/audio/speech</code> server on a GPU — Chatterbox, Orpheus-FastAPI, Kokoro-FastAPI — such as <code>http://host:8004</code>. Set the model to <code>chatterbox</code> or <code>orpheus</code> and her laughs and sighs are performed as sounds rather than dropped.</div>
        </div>
        <div class="field-control">
          <input type="text" autocomplete="off" placeholder="http://host:8880" .value=${e.ttsUrl} ?disabled=${!this.canEdit}
            @change=${n=>this.edit({ttsUrl:n.target.value})} />
        </div>
        <div class="field-control">
          <input type="text" autocomplete="off" placeholder="Model (default tts-1)" .value=${e.ttsModel} ?disabled=${!this.canEdit}
            @change=${n=>this.edit({ttsModel:n.target.value})} />
        </div>
        <div class="field-control">
          <input type="password" autocomplete="new-password" placeholder=${e.ttsApiKeySet?"API key saved — enter to replace":"API key (optional)"}
            .value=${e.ttsApiKey} ?disabled=${!this.canEdit}
            @change=${n=>this.edit({ttsApiKey:n.target.value})} />
        </div>
      </div>
    </section>`}async loadTTS(e=!1){var t,s;this.tts=await U(e);try{this.ttsErrors=await h.ttsVoiceErrors()}catch{}(s=(t=this.tts)==null?void 0:t.downloading)!=null&&s.length&&window.setTimeout(()=>void this.loadTTS(!0),4e3)}async loadDescribe(){try{this.describe=await h.describeStatus()}catch{this.describe=null}}async probeVision(){this.describeBusy=!0,this.describeNote="";try{const e=await h.describeProbe();this.describeNote=`The model answered: “${e.description}”`}catch(e){this.describeNote=e.message}finally{this.describeBusy=!1}}async toggleBackfill(){var e;this.describeBusy=!0;try{(e=this.describe)!=null&&e.backfilling?await h.describeBackfillStop():await h.describeBackfill(),await this.loadDescribe()}catch(t){this.describeNote=t.message}finally{this.describeBusy=!1}}async testVoice(){F(),await pe("Hi. This is what I sound like. Saved to your library, by the way — nice pick.")}async downloadVoice(e){try{await h.downloadTTSVoice(e),await this.loadTTS(!0)}catch(t){this.loadError=t.message}}async deleteVoice(e){if(confirm(`Remove the ${e} voice from the server?`))try{await h.deleteTTSVoice(e),await this.loadTTS(!0)}catch(t){this.loadError=t.message}}renderLibbyModel(){const e=this.settings;return a`
      <section class="card">
        <h3><span class="material-symbols-rounded">memory</span>Her model</h3>
        <p class="card-sub">The chat backend every character talks through. Saved for the whole server.</p>
        ${e?a`
              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Libby chat</div>
                  <div class="field-help">
                    OpenAI-compatible API base URL for your local LLM, such as
                    <code>http://host:5000/v1</code>. The model name is an optional fallback;
                    OppaiLib detects the model actually loaded by text-generation-webui.
                    Load and unload models in that backend's own WebUI—OppaiLib never changes its model lifecycle.
                  </div>
                </div>
                <div class="field-control">
                  <input
                    type="text"
                    autocomplete="off"
                    placeholder="http://host:5000/v1"
                    .value=${e.chatUrl}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({chatUrl:t.target.value})}
                  />
                </div>
                <div class="field-control">
                  <input
                    type="text"
                    autocomplete="off"
                    placeholder="Optional fallback model name"
                    .value=${e.chatModel}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({chatModel:t.target.value})}
                  />
                </div>
                <div class="field-control">
                  <input
                    type="password"
                    autocomplete="new-password"
                    placeholder=${e.chatApiKeySet?"API key saved — enter to replace":"API key (optional)"}
                    .value=${e.chatApiKey}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({chatApiKey:t.target.value})}
                  />
                </div>
              </div>

              <div class="field">
                <div class="field-text">
                  <div class="field-label">Context window</div>
                  <div class="field-help">
                    How much of the model's context Libby may fill, in tokens. Leave at
                    <strong>0</strong> and OppaiLib uses the context length the model was
                    last loaded with from here, what text-generation-webui saved for it (<em>Save
                    settings</em> on its Model tab — read from the model folder below, when set), or what
                    llama.cpp server reports — and 8192 when it knows none of those, because
                    text-generation-webui's API never says. Otherwise a number here is
                    the only way to tell her she has room: a bigger window is memory, bond and library context she
                    keeps instead of shedding to fit. Never set it above what the model is
                    actually loaded with — past that the backend drops the front of the
                    prompt, which is her character card.
                  </div>
                </div>
                <div class="field-control">
                  <input
                    type="number"
                    min="0"
                    max="131072"
                    step="1024"
                    .value=${String(e.chatContextTokens)}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({chatContextTokens:Number(t.target.value)})}
                  />
                </div>
              </div>

              <div class="field">
                <div class="field-text">
                  <div class="field-label">Model size</div>
                  <div class="field-help">
                    Her sampler presets were written for a 7B, where a heavy repetition
                    penalty is what stops a looping reply. On a 24B and up the same numbers
                    flatten the prose and cost her the tags written at the end of it, so
                    that penalty is eased and a scene is allowed to run longer. Auto reads
                    the parameter count out of the loaded model's name.
                  </div>
                </div>
                <div class="field-control">
                  <select ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({chatModelTier:t.target.value})}>
                    ${[["","Auto (from the model name)"],["small","Small — 7B to 13B"],["large","Large — 24B and up"]].map(([t,s])=>a`<option value=${t} ?selected=${e.chatModelTier===t}>${s}</option>`)}
                  </select>
                </div>
              </div>

              <div class="field">
                <div class="field-text">
                  <div class="field-label">Graphics card memory</div>
                  <div class="field-help">
                    In GB, so Libby can say what she runs on when you ask about the box. Nothing
                    on the network reports it; at <strong>0</strong> she says she doesn't know
                    rather than guessing one from her model.
                  </div>
                </div>
                <div class="field-control">
                  <input
                    type="number"
                    min="0"
                    max="256"
                    step="1"
                    .value=${String(e.gpuMemoryGb??0)}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({gpuMemoryGb:Number(t.target.value)})}
                  />
                </div>
              </div>

              <div class="field">
                <div class="field-text">
                  <div class="field-label">Her eyes</div>
                  <div class="field-help">
                    Most of the 24B–32B models a big card runs can see — Mistral&#8209;Small&#8209;3.2,
                    Gemma&nbsp;3, the Qwen&#8209;VL family. When hers can, a photo you send and the
                    picture you ask about go to her as pictures, not just as the tagger's words.
                    Auto reads it off the model's name; a backend that turns out not to take images
                    (a GGUF loaded without its mmproj) is answered from the tags instead, so leaving
                    this on is safe.
                  </div>
                </div>
                <div class="field-control">
                  <select ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({chatVision:t.target.value})}>
                    ${[["","Auto (from the model name)"],["on","On — her model can see"],["off","Off — tags only"]].map(([t,s])=>a`<option value=${t} ?selected=${(e.chatVision??"")===t}>${s}</option>`)}
                  </select>
                </div>
              </div>

              <div class="field">
                <div class="field-text">
                  <div class="field-label">Sharing the graphics card</div>
                  <div class="field-help">
                    For one GPU running both her and the image generator. <strong>Both loaded</strong>
                    keeps them side by side — fine when they fit. <strong>Swap</strong> unloads her
                    while a picture is being made and loads her back, with the loader settings she was
                    last loaded with, a minute after the generator goes quiet (sooner if you message
                    her). Needs text-generation-webui, which is the backend that can load and unload.
                  </div>
                </div>
                <div class="field-control">
                  <select ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({gpuShare:t.target.value})}>
                    ${[["","Both loaded"],["swap","Swap for pictures"]].map(([t,s])=>a`<option value=${t} ?selected=${(e.gpuShare??"")===t}>${s}</option>`)}
                  </select>
                </div>
              </div>

              <div class="field">
                <div class="field-text">
                  <div class="field-label">How she acts</div>
                  <div class="field-help">
                    Her pictures, moods, rooms and memories are tool calls. <strong>Auto</strong>
                    sends them as native tools and falls back to a JSON answer for a backend that
                    refuses tools, remembering which it was. Pin one if your backend fails in a way
                    that does not look like a refusal.
                  </div>
                </div>
                <div class="field-control">
                  <select ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({chatToolMode:t.target.value})}>
                    ${[["","Auto"],["native","Native tool calls"],["json","JSON answers"]].map(([t,s])=>a`<option value=${t} ?selected=${(e.chatToolMode??"")===t}>${s}</option>`)}
                  </select>
                </div>
              </div>

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Model folder (for deleting models)</div>
                  <div class="field-help">
                    Where text-generation-webui keeps its models, <em>as this container sees
                    it</em> — map the same host folder into both. Needed only so a model can
                    be deleted from here; that backend exposes no delete API, so it is a
                    file operation. Leave blank and the delete control is simply absent.
                    Deleting moves a model to a recoverable folder inside this directory
                    unless you ask for a permanent delete, and never touches the model that
                    is currently loaded.
                  </div>
                </div>
                <div class="field-control">
                  <input
                    type="text"
                    autocomplete="off"
                    placeholder="/models"
                    .value=${e.chatModelDir}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({chatModelDir:t.target.value})}
                  />
                </div>
              </div>
            `:a`<div class="field-help">Loading…</div>`}
      </section>
    `}renderLibbyReferences(){return a`
      <section class="card">
              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">What she looks like</div>
                  <div class="field-help">
                    Two pictures of her for her own eyes: one in her usual outfit, one in nothing.
                    When a message is about how she looks — what she's wearing, her body, whether a
                    photo is of her — the one that fits is shown to her beside yours, so she describes
                    herself from the picture rather than from her card. She never sends these; they
                    only reach a model that can see (Her eyes, under Model &amp; generation). If the bare one is missing she uses the
                    clothed one.
                  </div>
                  ${this.refNote?a`<div class="field-help" style="color:var(--md-sys-color-error);">${this.refNote}</div>`:l}
                </div>
                <div class="field-control" style="display:flex;gap:16px;flex-wrap:wrap;">
                  ${this.referenceTile("clothed","Usual outfit")}
                  ${this.referenceTile("nude","Nothing on")}
                </div>
              </div>
      </section>
    `}renderLibbyImageGen(){const e=this.settings;if(!e)return l;if(!e.imageGenEnabled)return a`<section class="card">
        <h3><span class="material-symbols-rounded">auto_awesome</span>Libby’s image generation</h3>
        <p class="card-sub">
          Set an image generator URL under <strong>Library</strong> and Libby can offer to make
          pictures for you in chat. She always asks first — nothing is generated or saved until
          you press Allow.
        </p>
      </section>`;const t=this.genModels,s=this.genLoras,o=e.libbyGenLoras??[],r=this.genBoards;return a`<section class="card">
      <h3><span class="material-symbols-rounded">auto_awesome</span>Libby’s image generation</h3>
      <p class="card-sub">
        What she uses when she offers to make you a picture. She always asks first — nothing is
        generated or saved until you press Allow.
        ${this.genError?a`<br /><span style="color:var(--oppai-danger,#ff6b6b);">${this.genError}</span>`:l}
      </p>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Model</div>
          <div class="field-help">The checkpoint her pictures are made with. Leave on the
            generator’s default to use whatever it loads.</div>
        </div>
        <div class="field-control">
          ${t.length?a`<select ?disabled=${!this.canEdit}
                @change=${i=>this.edit({libbyGenModel:i.target.value})}>
                <option value="" ?selected=${!e.libbyGenModel}>Generator’s default</option>
                ${t.map(i=>a`<option value=${i} ?selected=${i===e.libbyGenModel}>${i}</option>`)}
              </select>`:a`<input type="text" autocomplete="off" placeholder="Generator’s default"
                .value=${e.libbyGenModel} ?disabled=${!this.canEdit}
                @change=${i=>this.edit({libbyGenModel:i.target.value})} />`}
        </div>
      </div>

      <div class="field">
        <div class="field-text">
          <div class="field-label">LoRAs</div>
          <div class="field-help">Applied to everything she makes, each at its own strength —
            usually the one that makes the picture look like her, plus any style or detail
            LoRAs you like her drawn with.</div>
        </div>
        <div class="field-control" style="display:flex; flex-direction:column; gap:8px; align-items:stretch;">
          ${o.map((i,n)=>a`<div style="display:flex; gap:8px; align-items:center;">
            ${s.length?a`<select style="flex:1; min-width:0;" ?disabled=${!this.canEdit}
                  aria-label="LoRA ${n+1}"
                  @change=${u=>this.editLora(n,{name:u.target.value})}>
                  ${(s.includes(i.name)?s:[i.name,...s]).map(u=>a`<option value=${u} ?selected=${u===i.name}>${u}</option>`)}
                </select>`:a`<input type="text" autocomplete="off" placeholder="LoRA name" style="flex:1; min-width:0;"
                  aria-label="LoRA ${n+1}"
                  .value=${i.name} ?disabled=${!this.canEdit}
                  @change=${u=>this.editLora(n,{name:u.target.value})} />`}
            <input type="number" step="0.05" min="-2" max="2" style="width:90px;"
              aria-label="LoRA ${n+1} strength"
              .value=${String(i.weight)} ?disabled=${!this.canEdit}
              @change=${u=>this.editLora(n,{weight:Number(u.target.value)})} />
            <button class="btn-inline" title="Remove" aria-label="Remove LoRA ${n+1}" ?disabled=${!this.canEdit}
              @click=${()=>this.edit({libbyGenLoras:o.filter((u,g)=>g!==n)})}>
              <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
            </button>
          </div>`)}
          <button class="btn-inline" style="align-self:flex-start; display:inline-flex; align-items:center; gap:6px;"
            ?disabled=${!this.canEdit||o.length>=8}
            @click=${()=>this.edit({libbyGenLoras:[...o,{name:s.find(i=>!o.some(n=>n.name===i))??"",weight:1}]})}>
            <span class="material-symbols-rounded" style="font-size:18px;">add</span>
            ${o.length?"Add another LoRA":"Add a LoRA"}
          </button>
        </div>
      </div>

      ${r.length?a`<div class="field">
            <div class="field-text">
              <div class="field-label">Board</div>
              <div class="field-help">The InvokeAI board her pictures are filed into, so what she
                makes stays separate from your own generations.</div>
            </div>
            <div class="field-control">
              <select ?disabled=${!this.canEdit}
                @change=${i=>this.edit({libbyGenBoard:i.target.value})}>
                <option value="" ?selected=${!e.libbyGenBoard}>Uncategorized</option>
                ${r.map(i=>a`<option value=${i} ?selected=${i===e.libbyGenBoard}>${i}</option>`)}
              </select>
            </div>
          </div>`:l}

      <div class="field stack">
        <div class="field-text">
          <div class="field-label">Her prompt</div>
          <div class="field-help">
            Who she is, in generator words — the tokens that make the picture look like Libby
            rather than a stranger. This goes in front of whatever she describes, so her offer
            only has to say what is happening in the picture.
          </div>
        </div>
        <div class="field-control">
          <textarea rows="3" style="width:100%;"
            placeholder="1girl, long orange hair, red eyes, glasses, …"
            .value=${e.libbyGenPrompt} ?disabled=${!this.canEdit}
            @change=${i=>this.edit({libbyGenPrompt:i.target.value})}></textarea>
        </div>
      </div>

      <div class="field stack">
        <div class="field-text">
          <div class="field-label">Negative prompt</div>
          <div class="field-help">What to keep out of every picture she makes.</div>
        </div>
        <div class="field-control">
          <textarea rows="2" style="width:100%;"
            placeholder="lowres, bad anatomy, watermark, …"
            .value=${e.libbyGenNegativePrompt} ?disabled=${!this.canEdit}
            @change=${i=>this.edit({libbyGenNegativePrompt:i.target.value})}></textarea>
        </div>
      </div>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Also save her pictures to the library</div>
          <div class="field-help">
            A picture she makes is sent to you in the conversation and kept with her chat
            photos. Turn this on to file a copy in the library as well.
          </div>
        </div>
        <div class="field-control">
          <button
            class="switch ${e.libbyGenToLibrary?"on":""}"
            role="switch"
            aria-checked=${e.libbyGenToLibrary?"true":"false"}
            aria-label="Also save her pictures to the library"
            ?disabled=${!this.canEdit}
            @click=${()=>this.edit({libbyGenToLibrary:!e.libbyGenToLibrary})}
          ></button>
        </div>
      </div>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Candidates per picture</div>
          <div class="field-help">
            Her camera takes this many of each shot and a model that can see — the vision
            model, or hers — picks the one that is most her, in what she was asked to wear,
            with nothing broken, and clears everyone in it as an adult. One sends the first
            as it comes; more is slower and better. Without a model that can see, only one
            is ever taken.
          </div>
        </div>
        <div class="field-control">
          <select ?disabled=${!this.canEdit}
            @change=${i=>this.edit({libbyCameraCandidates:Number(i.target.value)})}>
            ${[1,2,3,4].map(i=>a`<option value=${i} ?selected=${(e.libbyCameraCandidates||2)===i}>${i}</option>`)}
          </select>
        </div>
      </div>

      ${this.renderCameraLoras(e)}

      <div class="field stack">
        <div class="field-text">
          <div class="field-label">Copying your pose</div>
          <div class="field-help">
            Send her a photo and ask her to pose like it: Automatic1111 or Forge with the
            ControlNet extension reads the pose with this preprocessor and model. Leave the
            model blank to switch it off. InvokeAI cannot do this from here.
          </div>
        </div>
        <div class="field-control" style="display:grid;gap:6px;grid-template-columns:1fr 1fr;">
          <input placeholder="openpose_full" .value=${e.libbyPoseModule??""} ?disabled=${!this.canEdit}
            @change=${i=>this.edit({libbyPoseModule:i.target.value})}/>
          <input placeholder="control_v11p_sd15_openpose" .value=${e.libbyPoseModel??""} ?disabled=${!this.canEdit}
            @change=${i=>this.edit({libbyPoseModel:i.target.value})}/>
        </div>
      </div>

      <div class="field stack">
        <div class="field-text">
          <div class="field-label">Keeping her face</div>
          <div class="field-help">
            Every picture she takes is steered towards her reference picture (set in her
            settings) with an IP-Adapter through ControlNet — a face model such as
            ip-adapter-plus-face keeps her face without copying the reference's clothes.
            Blank model is off.
          </div>
        </div>
        <div class="field-control" style="display:grid;gap:6px;grid-template-columns:1fr 1fr;">
          <input placeholder="ip-adapter-auto" .value=${e.libbyFaceModule??""} ?disabled=${!this.canEdit}
            @change=${i=>this.edit({libbyFaceModule:i.target.value})}/>
          <input placeholder="ip-adapter-plus-face_sd15" .value=${e.libbyFaceModel??""} ?disabled=${!this.canEdit}
            @change=${i=>this.edit({libbyFaceModel:i.target.value})}/>
        </div>
      </div>

      <div class="field stack">
        <div class="field-text">
          <div class="field-label">Clips</div>
          <div class="field-help">
            She can turn the last picture she sent into a few seconds of video through
            ComfyUI. Export the image-to-video workflow you already use (Wan, LTX,
            AnimateDiff) with <em>Save (API Format)</em> and paste it below, with
            <code>{{image}}</code> in its Load Image node, <code>{{prompt}}</code> and
            <code>{{negative}}</code> in its text nodes, and <code>{{seed}}</code> as the seed.
            Both blank is off.
          </div>
        </div>
        <div class="field-control" style="display:grid;gap:6px;">
          <input placeholder="http://comfyui:8188" .value=${e.libbyClipUrl??""} ?disabled=${!this.canEdit}
            @change=${i=>this.edit({libbyClipUrl:i.target.value})}/>
          <textarea rows="4" style="width:100%;font-family:monospace;font-size:11px;" placeholder='{"3": {"class_type": "KSampler", …}}'
            .value=${e.libbyClipWorkflow??""} ?disabled=${!this.canEdit}
            @change=${i=>this.edit({libbyClipWorkflow:i.target.value})}></textarea>
        </div>
      </div>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Her stories</div>
          <div class="field-help">
            While you are away she posts a picture and a line about her day, at most this
            many a day, never at night or within hours of the last. They wait around her
            avatar in the chat for a day.
          </div>
        </div>
        <div class="field-control" style="display:flex;gap:8px;align-items:center;">
          <select ?disabled=${!this.canEdit||!e.libbyStories}
            @change=${i=>this.edit({libbyStoriesPerDay:Number(i.target.value)})}>
            ${[1,2,3,4,6].map(i=>a`<option value=${i} ?selected=${(e.libbyStoriesPerDay||2)===i}>${i} a day</option>`)}
          </select>
          <button
            class="switch ${e.libbyStories?"on":""}"
            role="switch"
            aria-checked=${e.libbyStories?"true":"false"}
            aria-label="Let her post stories"
            ?disabled=${!this.canEdit}
            @click=${()=>this.edit({libbyStories:!e.libbyStories})}
          ></button>
        </div>
      </div>
    </section>`}async loadGenLists(){try{const e=await h.imageGenStatus();if(!e.enabled||!e.reachable){e.enabled&&(this.genError=e.error||"The image generator isn't reachable.");return}this.genModels=(e.models??[]).map(t=>t.title||t.model_name).filter(Boolean),this.genLoras=(e.loras??[]).map(t=>t.name).filter(Boolean),this.genLoraTriggers=Object.fromEntries((e.loras??[]).map(t=>[t.name,(t.triggerPhrases??[]).join(", ")])),this.genBoards=(e.boards??[]).map(t=>t.name).filter(Boolean)}catch(e){this.genError=e.message}}renderCameraLoras(e){const t=this.genLoras,s=e.libbyCameraLoras??[];return a`<div class="field stack">
      <div class="field-text">
        <div class="field-label">LoRAs she can choose</div>
        <div class="field-help">
          Ones she adds to a single picture when the shot calls for it — a pose, an act, a
          style — on top of the LoRAs above. Say when each one helps; that note is all she
          has to go on. Trigger words are added to the prompt with it.
        </div>
      </div>
      <div class="field-control" style="display:flex; flex-direction:column; gap:12px; align-items:stretch;">
        ${s.map((o,r)=>a`<div style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; gap:8px; align-items:center;">
            ${t.length?a`<select style="flex:1; min-width:0;" ?disabled=${!this.canEdit} aria-label="Optional LoRA ${r+1}"
                  @change=${i=>this.editCameraLora(r,{name:i.target.value})}>
                  ${(t.includes(o.name)?t:[o.name,...t]).map(i=>a`<option value=${i} ?selected=${i===o.name}>${i}</option>`)}
                </select>`:a`<input type="text" autocomplete="off" placeholder="LoRA name" style="flex:1; min-width:0;"
                  aria-label="Optional LoRA ${r+1}" .value=${o.name} ?disabled=${!this.canEdit}
                  @change=${i=>this.editCameraLora(r,{name:i.target.value})} />`}
            <input type="number" step="0.05" min="-2" max="2" style="width:90px;"
              aria-label="Optional LoRA ${r+1} strength" .value=${String(o.weight)} ?disabled=${!this.canEdit}
              @change=${i=>this.editCameraLora(r,{weight:Number(i.target.value)})} />
            <button class="btn-inline" title="Remove" aria-label="Remove optional LoRA ${r+1}" ?disabled=${!this.canEdit}
              @click=${()=>this.edit({libbyCameraLoras:s.filter((i,n)=>n!==r)})}>
              <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
            </button>
          </div>
          <input type="text" autocomplete="off" maxlength="160" placeholder="When it helps — e.g. POV shots from above"
            aria-label="When optional LoRA ${r+1} helps" .value=${o.when} ?disabled=${!this.canEdit}
            @change=${i=>this.editCameraLora(r,{when:i.target.value})} />
          <input type="text" autocomplete="off" maxlength="200" placeholder="Trigger words (optional)"
            aria-label="Optional LoRA ${r+1} trigger words" .value=${o.trigger} ?disabled=${!this.canEdit}
            @change=${i=>this.editCameraLora(r,{trigger:i.target.value})} />
        </div>`)}
        <button class="btn-inline" style="align-self:flex-start; display:inline-flex; align-items:center; gap:6px;"
          ?disabled=${!this.canEdit||s.length>=12}
          @click=${()=>{const o=t.find(r=>!s.some(i=>i.name===r))??"";this.edit({libbyCameraLoras:[...s,{name:o,weight:1,when:"",trigger:this.genLoraTriggers[o]??""}]})}}>
          <span class="material-symbols-rounded" style="font-size:18px;">add</span>
          ${s.length?"Add another":"Add one she can choose"}
        </button>
      </div>
    </div>`}renderAI(){const e=this.settings,t=this.info;return a`
      <section class="card">
        <h3><span class="material-symbols-rounded">auto_awesome</span>AI auto-tagging</h3>
        <p class="card-sub">
          Tagging runs entirely on this box — no image ever leaves it. The heuristic tagger needs no
          model; a real classifier requires an ONNX build with a model in the model directory.
        </p>

        ${e?a`
              ${this.switchField("Enable auto-tagging","Master switch. Off means no tagging at all, including the ✨ button.",e.aiEnabled,s=>this.edit({aiEnabled:s}))}
              ${this.switchField("Tag on import","Tag new uploads and imports automatically. With this off, tagging only happens when you ask for it.",e.aiAutoTag,s=>this.edit({aiAutoTag:s}),!e.aiEnabled)}

              <div class="field">
                <div class="field-text">
                  <div class="field-label">Minimum confidence</div>
                  <div class="field-help">Suggestions the tagger is less sure of than this are dropped.</div>
                </div>
                <div class="field-control">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    .value=${String(e.aiMinScore)}
                    ?disabled=${!this.canEdit||!e.aiEnabled}
                    @input=${s=>this.edit({aiMinScore:Number(s.target.value)})}
                  />
                  <span class="value">${e.aiMinScore.toFixed(2)}</span>
                </div>
              </div>

              <div class="field">
                <div class="field-text">
                  <div class="field-label">Maximum tags per item</div>
                  <div class="field-help">Only the highest-scoring suggestions are kept (1–100).</div>
                </div>
                <div class="field-control">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    .value=${String(e.aiMaxTags)}
                    ?disabled=${!this.canEdit||!e.aiEnabled}
                    @change=${s=>this.edit({aiMaxTags:Number(s.target.value)})}
                  />
                </div>
              </div>

              ${t?a`
                    ${this.readOnlyField("Active tagger","Chosen at startup.",t.aiTagger)}
                    ${this.readOnlyField("Inference device","OPPAI_AI_DEVICE — needs a restart to change.",t.aiDevice)}
                    ${this.readOnlyField("Model directory","OPPAI_AI_MODEL_DIR — needs a restart to change.",t.aiModelDir)}
                  `:l}
            `:a`<div class="field-help">Loading…</div>`}
      </section>
      ${this.renderVision()}
    `}renderVision(){const e=this.settings,t=this.describe;return a`
      <section class="card">
        <h3><span class="material-symbols-rounded">description</span>Describing pictures</h3>
        <p class="card-sub">
          A vision model on your own network writes what each picture or clip shows — who is where,
          doing what, in what style. The prose is stored encrypted, searchable from the library's search box,
          shown in the viewer, and given to Libby when a picture comes up. Any OpenAI-compatible server whose model
          accepts images works: Ollama or LM Studio with a llava, qwen-vl or gemma3 build, llama.cpp server with an mmproj.
        </p>
        ${e?a`
              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Vision model</div>
                  <div class="field-help">
                    The server's base URL, such as <code>http://host:11434/v1</code>, and the model to ask for.
                    Blank turns describing off.
                  </div>
                </div>
                <div class="field-control">
                  <input type="text" autocomplete="off" placeholder="http://host:11434/v1" .value=${e.visionUrl}
                    ?disabled=${!this.canEdit}
                    @change=${s=>this.edit({visionUrl:s.target.value})} />
                </div>
                <div class="field-control">
                  <input type="text" autocomplete="off" placeholder="Model name, e.g. qwen2.5vl:7b or llava" .value=${e.visionModel}
                    ?disabled=${!this.canEdit}
                    @change=${s=>this.edit({visionModel:s.target.value})} />
                </div>
                <div class="field-control">
                  <input type="password" autocomplete="new-password"
                    placeholder=${e.visionApiKeySet?"API key saved — enter to replace":"API key (optional)"}
                    .value=${e.visionApiKey} ?disabled=${!this.canEdit}
                    @change=${s=>this.edit({visionApiKey:s.target.value})} />
                </div>
              </div>
              ${this.switchField("Describe on import","Describe every new picture and clip once it has been tagged; the tags steer the model. Off means only when you ask, from the viewer.",e.visionAuto,s=>this.edit({visionAuto:s}),!e.visionUrl)}
              <div class="field">
                <div class="field-text">
                  <div class="field-label">Check the model</div>
                  <div class="field-help">
                    Sends a generated test picture and shows what comes back. Save the URL first.
                    ${this.describeNote?a`<div style="margin-top:6px; color:var(--oppai-text);">${this.describeNote}</div>`:l}
                  </div>
                </div>
                <div class="field-control">
                  <button class="btn" ?disabled=${!e.visionEnabled||this.describeBusy||this.dirty} @click=${()=>void this.probeVision()}>
                    ${this.describeBusy?"Asking…":"Test"}
                  </button>
                </div>
              </div>
              <div class="field">
                <div class="field-text">
                  <div class="field-label">Describe what has none</div>
                  <div class="field-help">
                    ${t?t.undescribed?`${t.undescribed.toLocaleString()} ${t.undescribed===1?"item has":"items have"} no description yet.${t.backfilling?" Working through them, one at a time.":""}`:"Everything that can be described has been.":"Loading…"}
                    Runs in the background, one item at a time; leave this page and it carries on.
                  </div>
                </div>
                <div class="field-control" style="display:flex; gap:8px; align-items:center;">
                  <button class="btn" ?disabled=${!e.visionEnabled||this.describeBusy||!t||!t.undescribed&&!t.backfilling}
                    @click=${()=>void this.toggleBackfill()}>
                    ${t!=null&&t.backfilling?"Stop":"Start"}
                  </button>
                  <button class="btn" title="Refresh the count" @click=${()=>void this.loadDescribe()}>
                    <span class="material-symbols-rounded" style="font-size:18px;">refresh</span>
                  </button>
                </div>
              </div>
            `:a`<div class="field-help">Loading…</div>`}
      </section>
    `}renderScraping(){const e=this.settings;return a`
      <section class="card">
        <h3><span class="material-symbols-rounded">travel_explore</span>Import &amp; scraping</h3>
        <p class="card-sub">How OppaiLib behaves toward the sites you import from.</p>

        ${e?a`
              ${this.switchField("Respect robots.txt","Skip URLs a site asks crawlers not to fetch.",e.scrapeRespectRobots,t=>this.edit({scrapeRespectRobots:t}))}

              <div class="field">
                <div class="field-text">
                  <div class="field-label">Delay between requests</div>
                  <div class="field-help">
                    Minimum gap between two requests to the same host, in milliseconds (250–60000).
                  </div>
                </div>
                <div class="field-control">
                  <input
                    type="number"
                    min="250"
                    max="60000"
                    step="250"
                    .value=${String(e.scrapeDelayMs)}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({scrapeDelayMs:Number(t.target.value)})}
                  />
                  <span class="value">ms</span>
                </div>
              </div>

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">User agent</div>
                  <div class="field-help">
                    Sent with every scrape. The default impersonates a browser because many sites only
                    serve metadata to one; clear it back to that default by leaving it blank.
                  </div>
                </div>
                <div class="field-control">
                  <input
                    type="text"
                    .value=${e.scrapeUserAgent}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({scrapeUserAgent:t.target.value})}
                  />
                </div>
              </div>

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Civitai API</div>
                  <div class="field-help">
                    Catalogue API base and optional token. The public mirror works without a token;
                    use <code>https://civitai.com/api/v1</code> with your key for authenticated access.
                    The key is stored on this server and is never sent back to the browser.
                  </div>
                </div>
                <div class="field-control">
                  <input type="text" autocomplete="off" placeholder="https://civitai.red/api/v1"
                    .value=${e.civitaiApiUrl} ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({civitaiApiUrl:t.target.value})} />
                </div>
                <div class="field-control">
                  <input type="password" autocomplete="new-password"
                    placeholder=${e.civitaiKeySet?"•••••••• (unchanged)":"Civitai API key (optional)"}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({civitaiApiKey:t.target.value})} />
                </div>
                ${e.civitaiKeySet?a`<div class="field-control">
                  <button type="button" class="btn-inline" ?disabled=${!this.canEdit}
                    @click=${()=>this.edit({civitaiApiKey:"",civitaiKeySet:!1})}>Clear saved key</button>
                </div>`:l}
              </div>

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Rule34.xxx API</div>
                  <div class="field-help">
                    The authenticated JSON API makes browsing faster and supplies original media URLs,
                    dimensions, and reliable video types. Find the user id and API key in your Rule34 account options.
                    The key is write-only.
                  </div>
                </div>
                <div class="field-control">
                  <input type="text" inputmode="numeric" autocomplete="off" placeholder="Rule34 user id"
                    .value=${e.rule34UserId} ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({rule34UserId:t.target.value})} />
                </div>
                <div class="field-control">
                  <input type="password" autocomplete="new-password"
                    placeholder=${e.rule34ApiKeySet?"•••••••• (unchanged)":"Rule34 API key"}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({rule34ApiKey:t.target.value})} />
                </div>
                ${e.rule34ApiKeySet?a`<div class="field-control">
                  <button type="button" class="btn-inline" ?disabled=${!this.canEdit}
                    @click=${()=>this.edit({rule34ApiKey:"",rule34ApiKeySet:!1})}>Clear saved key</button>
                </div>`:l}
              </div>

              <div class="field">
                <div class="field-text">
                  <div class="field-label">F95zone</div>
                  <div class="field-help">
                    F95zone now asks every visitor to prove they are a person before it shows any
                    page, which a server cannot do — so OppaiLib reads it through Launchy on your PC,
                    signed in there. There is no login to enter here any more.
                  </div>
                </div>
                <div class="field-control">
                  <button type="button" class="btn-inline" @click=${()=>this.tab="launchy"}>Launchy settings</button>
                </div>
              </div>

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Image generation</div>
                  <div class="field-help">
                    URL of a local image generator on your network — an InvokeAI server
                    (e.g. <code>http://192.168.1.10:9090</code>) or an Automatic1111 / SD.Next
                    one (e.g. <code>http://192.168.1.10:7860</code>). Which API it speaks is
                    detected automatically. Set it to turn on the <strong>Create</strong> tab;
                    leave blank to keep it off. Prompts stay on your own hardware — nothing is
                    sent to a cloud service.
                  </div>
                </div>
                <div class="field-control">
                  <input
                    type="text"
                    autocomplete="off"
                    placeholder="http://host:7860"
                    .value=${e.imageGenUrl}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({imageGenUrl:t.target.value})}
                  />
                </div>
              </div>

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Automatic1111 models folder</div>
                  <div class="field-help">
                    Only for Automatic1111, Forge or SD.Next. They have no API to install or
                    delete a model, so installing from Civitai, editing a model's description
                    and trigger words, setting its cover and deleting it are done by writing
                    into its <code>models</code> folder (the one holding
                    <code>Stable-diffusion</code> and <code>Lora</code>). Map that folder into
                    this container and give the path here, e.g. <code>/a1111-models</code>.
                    Blank still lists models and links them to Civitai — it just changes none.
                    InvokeAI ignores this.
                  </div>
                </div>
                <div class="field-control">
                  <input
                    type="text"
                    autocomplete="off"
                    placeholder="/a1111-models"
                    .value=${e.imageGenModelsDir??""}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({imageGenModelsDir:t.target.value})}
                  />
                </div>
              </div>
            `:a`<div class="field-help">Loading…</div>`}
      </section>
    `}renderLibrary(){const e=this.stats;if(!e)return l;const t=new Map(e.kinds.map(s=>[s.kind,s]));return a`
      <section class="card">
        <h3><span class="material-symbols-rounded">inventory_2</span>Library</h3>
        <p class="card-sub">
          ${e.items} ${e.items===1?"item":"items"} · ${m(e.bytes)} stored ·
          ${e.tags} ${e.tags===1?"tag":"tags"}
        </p>
        <div class="stat-grid">
          ${Object.keys(z).map(s=>{const o=t.get(s);return a`<div class="stat">
              <div class="stat-num">${(o==null?void 0:o.count)??0}</div>
              <div class="stat-label">${z[s].label} · ${m((o==null?void 0:o.bytes)??0)}</div>
            </div>`})}
        </div>
      </section>
    `}renderPasskeys(){const e=this.passkeyList;return a`
      <section class="card">
        <h3><span class="material-symbols-rounded">passkey</span>Passkeys</h3>
        <p class="card-sub">
          Sign in with your device's fingerprint, face or PIN instead of typing a password.
          Nothing guessable crosses the network and the server only ever stores a public
          key — your device keeps the private half.
        </p>

        ${this.passkeyError?a`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.passkeyError}
            </div>`:l}
        ${this.passkeyMsg?a`<div class="banner ok">
              <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span>${this.passkeyMsg}
            </div>`:l}

        ${e&&!e.available?a`<div class="banner info">
              <span class="material-symbols-rounded" style="font-size:18px;">lock</span>
              ${e.reason}
            </div>`:l}

        ${e===null?a`<p class="field-help">Checking…</p>`:e.passkeys.length===0?a`<p class="field-help">
                No passkeys yet. Your password keeps working either way — it's also how you
                get back in if you lose a device.
              </p>`:a`
                <div class="pk-list">
                  ${e.passkeys.map(t=>this.renderPasskeyRow(t))}
                </div>
              `}

        ${e!=null&&e.available?a`
              <div class="pk-add">
                <input
                  type="text"
                  placeholder="Name this device — e.g. “Work laptop”"
                  .value=${this.passkeyName}
                  ?disabled=${this.passkeyBusy}
                  @input=${t=>this.passkeyName=t.target.value}
                />
                <button class="btn-primary" ?disabled=${this.passkeyBusy} @click=${this.addPasskey}>
                  <span class="material-symbols-rounded" style="font-size:20px;">add</span>
                  ${this.passkeyBusy?"Waiting for your device…":"Add a passkey"}
                </button>
              </div>
            `:l}

        ${e!=null&&e.relyingPartyId?a`<p class="field-help">
              Passkeys added here are tied to <code>${e.relyingPartyId}</code>. That's how
              WebAuthn works — reach OppaiLib at a different address and your device won't
              offer them, so add one per address you actually use.
            </p>`:l}
      </section>
    `}renderPasskeyRow(e){const t=this.passkeyRenaming===e.id,s=this.passkeyRevoking===e.id;return a`
      <div class="pk-row">
        <span class="material-symbols-rounded pk-icon">${e.synced?"cloud_sync":"key"}</span>
        <div class="pk-body">
          ${t?a`<div class="pk-rename">
                <input
                  type="text"
                  .value=${this.passkeyName}
                  @input=${o=>this.passkeyName=o.target.value}
                />
                <button @click=${()=>void this.savePasskeyName(e)}>Save</button>
                <button @click=${()=>this.passkeyRenaming=null}>Cancel</button>
              </div>`:a`<div class="pk-name">${e.name}</div>`}
          <div class="pk-meta">
            ${e.synced?"Synced to your account":"This device only"}
            · added ${D(e.createdAt)}
            · ${e.lastUsedAt?`last used ${D(e.lastUsedAt)}`:"never used"}
          </div>
          ${s?a`<div class="pk-revoke">
                <p class="field-help">
                  Confirm with your password. A signed-in browser isn't proof of who's at
                  the keyboard, and this is the first thing someone taking over an account
                  would do.
                </p>
                <input
                  type="password"
                  autocomplete="current-password"
                  placeholder="Your password"
                  .value=${this.passkeyPassword}
                  @input=${o=>this.passkeyPassword=o.target.value}
                />
                <div class="pk-revoke-actions">
                  <button @click=${this.cancelRevoke}>Cancel</button>
                  <button class="danger" ?disabled=${this.passkeyBusy||!this.passkeyPassword}
                    @click=${()=>void this.revokePasskey(e)}>
                    ${this.passkeyBusy?"Removing…":"Remove it"}
                  </button>
                </div>
              </div>`:l}
        </div>
        ${t||s?l:a`<div class="pk-actions">
              <button title="Rename" @click=${()=>this.startRename(e)}>
                <span class="material-symbols-rounded" style="font-size:18px;">edit</span>
              </button>
              <button title="Remove" @click=${()=>this.startRevoke(e)}>
                <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
              </button>
            </div>`}
      </div>
    `}async loadPasskeys(){try{this.passkeyList=await h.passkeys()}catch(e){this.passkeyError=e.message}}startRename(e){this.passkeyRenaming=e.id,this.passkeyRevoking=null,this.passkeyName=e.name}async savePasskeyName(e){const t=this.passkeyName.trim();if(t)try{await h.renamePasskey(e.id,t),this.passkeyRenaming=null,this.passkeyName="",await this.loadPasskeys()}catch(s){this.passkeyError=s.message}}startRevoke(e){this.passkeyRevoking=e.id,this.passkeyRenaming=null,this.passkeyPassword="",this.passkeyError=""}async revokePasskey(e){this.passkeyBusy=!0,this.passkeyError="";try{await h.revokePasskey(e.id,this.passkeyPassword),this.passkeyRevoking=null,this.passkeyPassword="",this.passkeyMsg=`Removed “${e.name}”.`,await this.loadPasskeys()}catch(t){this.passkeyError=t.message}finally{this.passkeyBusy=!1}}renderAccount(){var e,t;return a`
      ${this.renderPasskeys()}
      <section class="card">
        <h3><span class="material-symbols-rounded">account_circle</span>Account</h3>
        <p class="card-sub">
          Signed in as <strong>${(e=this.user)==null?void 0:e.username}</strong>${(t=this.user)!=null&&t.isAdmin?" (admin)":""}.
        </p>

        ${this.pwErr?a`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.pwErr}
            </div>`:l}
        ${this.pwMsg?a`<div class="banner ok">
              <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span>${this.pwMsg}
            </div>`:l}

        <div class="pw">
          <input
            type="password"
            placeholder="Current password"
            autocomplete="current-password"
            .value=${this.pwCurrent}
            @input=${s=>this.pwCurrent=s.target.value}
          />
          <input
            type="password"
            placeholder="New password (8+ characters)"
            autocomplete="new-password"
            .value=${this.pwNew}
            @input=${s=>this.pwNew=s.target.value}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            autocomplete="new-password"
            .value=${this.pwConfirm}
            @input=${s=>this.pwConfirm=s.target.value}
          />
          <div>
            <button
              class="btn-primary"
              ?disabled=${this.pwBusy||!this.pwCurrent||!this.pwNew}
              @click=${this.changePassword}
            >
              <span class="material-symbols-rounded" style="font-size:20px;">key</span>
              ${this.pwBusy?"Changing…":"Change password"}
            </button>
          </div>
        </div>
      </section>
    `}renderStorage(){var t;const e=this.storage;return a`
      <section class="card">
        <h3><span class="material-symbols-rounded">hard_drive</span>Storage</h3>
        <p class="card-sub">
          Where OppaiLib keeps things, and how much room is left. Nothing here lives
          inside the container image unless you left a mapping unset — which is what
          the warnings are for.
        </p>

        ${this.storageErr?a`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.storageErr}
            </div>`:l}

        ${((e==null?void 0:e.warnings)??[]).map(s=>a`<div class="banner error">
          <span class="material-symbols-rounded" style="font-size:18px;">warning</span>${s}
        </div>`)}

        <div class="diag-actions">
          <button class="btn-primary" ?disabled=${this.storageBusy} @click=${this.loadStorage}>
            <span class="material-symbols-rounded" style="font-size:20px;">refresh</span>
            ${this.storageBusy?"Reading…":"Refresh"}
          </button>
          ${(t=this.user)!=null&&t.isAdmin?a`<button ?disabled=${this.storageBusy} @click=${this.runCleanup}>
                <span class="material-symbols-rounded" style="font-size:20px;">mop</span>
                Reclaim space
              </button>`:l}
          <span class="field-help grow">
            Reclaiming removes only what can be recreated: chunks of uploads nobody
            came back to finish, and scratch files from jobs that have ended. It never
            touches your media, Libby's memories or model files.
          </span>
        </div>

        ${e?a`
              ${e.pendingBytes>0?a`<p class="field-help">
                    Uploads in progress still need about ${m(e.pendingBytes)}.
                  </p>`:l}
              ${e.mappings.map(s=>this.renderMapping(s))}
              <h4 style="margin:18px 0 6px;">Reclaimable now</h4>
              ${e.reclaimable.map(s=>a`<p class="field-help">
                ${s.label}: <strong>${m(s.bytes)}</strong>${s.note?a` — ${s.note}`:l}
              </p>`)}
            `:a`<p class="field-help">${this.storageBusy?"Reading…":"No reading yet."}</p>`}
      </section>
    `}renderMapping(e){const t=e.totalBytes>0?Math.round(e.usedBytes/e.totalBytes*100):0;return a`
      <div class="setting-row" style="display:block;">
        <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
          <strong>${e.label}</strong>
          <code style="font-size:12px; opacity:.8;">${e.path}</code>
          ${e.exists?l:a`<span class="field-help" style="color:var(--oppai-error);">not mapped</span>`}
          ${e.exists&&!e.writable?a`<span class="field-help" style="color:var(--oppai-error);">read-only</span>`:l}
        </div>
        <div style="height:6px; border-radius:999px; background:var(--oppai-surface-2); overflow:hidden; margin:6px 0;">
          <span style="display:block; height:100%; width:${t}%; background:${t>=90?"var(--oppai-error)":"var(--oppai-primary)"};"></span>
        </div>
        <p class="field-help">
          ${e.error?e.error:a`${m(e.freeBytes)} free of ${m(e.totalBytes)} (${t}% used)`}
          ${(e.contents??[]).map(s=>a` · ${s.label}: ${m(s.bytes)}${s.count?a` (${s.count})`:l}`)}
        </p>
        <p class="field-help">${e.purpose} Set with <code>${e.env}</code>.</p>
      </div>
    `}renderDiagnostics(){const e=this.diag,t=this.uiDiag;return a`
      <section class="card">
        <h3><span class="material-symbols-rounded">speed</span>Performance</h3>
        <p class="card-sub">
          Counters and latencies since the server started, or since you last reset them.
          Nothing here is sent anywhere — it's read straight off this box.
        </p>

        ${this.diagErr?a`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.diagErr}
            </div>`:l}

        <div class="diag-actions">
          <button class="btn-primary" ?disabled=${this.diagBusy} @click=${this.loadDiagnostics}>
            <span class="material-symbols-rounded" style="font-size:20px;">refresh</span>
            ${this.diagBusy?"Reading…":"Refresh"}
          </button>
          <button ?disabled=${this.diagBusy||!e} @click=${this.resetDiagnostics}>
            <span class="material-symbols-rounded" style="font-size:20px;">restart_alt</span>
            Reset counters
          </button>
          <span class="field-help grow">
            Reset, reproduce the slow thing, then refresh — totals for the whole
            uptime are hard to read anything out of.
          </span>
        </div>

        ${e?a`
              ${e.dbWal?l:a`<div class="banner error">
                    <span class="material-symbols-rounded" style="font-size:18px;">warning</span>
                    The database isn't in WAL mode, so every query runs one at a time.
                    This is usually because it lives on a network share — move it to a
                    local disk and restart.
                  </div>`}

              <div class="stat-grid">
                ${this.diagStat("Uptime",Ae(e.uptimeSeconds))}
                ${this.diagStat("Requests",String(e.metrics.counters["http.requests"]??0))}
                ${this.diagStat("Server errors",String(e.metrics.counters["http.status.5xx"]??0))}
                ${this.diagStat("Memory",`${e.heapMB} MB heap · ${e.sysMB} MB total`)}
                ${this.diagStat("Goroutines",`${e.goroutines} on ${e.numCpu} CPUs`)}
                ${this.diagStat("Database",e.dbWal?`WAL · ${e.dbInUse}/${e.dbOpenConns} in use`:"serialized (no WAL)")}
              </div>

              <h4 class="diag-head">Slowest by total time</h4>
              <p class="field-help">
                <code>http.…</code> is this server handling a request;
                <code>scrape.fetch.…</code> is it waiting on someone else's site.
                Percentiles are estimates from fixed buckets.
              </p>
              ${e.metrics.timings.length===0?a`<p class="field-help">Nothing measured in this window yet.</p>`:a`
                    <div class="diag-scroll">
                      <table class="diag-table">
                        <thead>
                          <tr>
                            <th>What</th><th>Calls</th><th>Avg</th><th>p95</th><th>Worst</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${e.metrics.timings.slice(0,25).map(s=>a`<tr>
                              <td class="diag-name">${s.name}</td>
                              <td>${s.count}</td>
                              <td>${s.avgMs} ms</td>
                              <td>${s.p95Ms} ms</td>
                              <td class=${s.maxMs>=3e3?"diag-bad":""}>${s.maxMs} ms</td>
                            </tr>`)}
                        </tbody>
                      </table>
                    </div>
                  `}

              ${this.renderFetchHealth(e)}

              <h4 class="diag-head">This browser</h4>
              <p class="field-help">
                Complete Lit component updates include template work and the DOM commit.
                A slow update takes over one 16 ms frame. Long tasks are browser main-thread
                stalls over 50 ms; layout shift excludes movement caused by your input.
              </p>
              ${t?a`
                    <div class="stat-grid">
                      ${this.diagStat("UI updates",String(t.updates))}
                      ${this.diagStat("Slow updates",String(t.slowUpdates))}
                      ${this.diagStat("Long tasks",`${t.longTasks} · ${Math.round(t.longTaskMs)} ms`)}
                      ${this.diagStat("Layout shift",`${t.layoutShifts} · ${t.layoutShiftScore}`)}
                    </div>
                    ${t.timings.length===0?a`<p class="field-help">No profiled component has updated in this window yet.</p>`:a`
                          <div class="diag-scroll">
                            <table class="diag-table">
                              <thead>
                                <tr><th>Component</th><th>Updates</th><th>Avg</th><th>p95</th><th>Slow</th><th>Worst</th></tr>
                              </thead>
                              <tbody>
                                ${t.timings.map(s=>a`<tr>
                                  <td class="diag-name">${s.name}</td>
                                  <td>${s.count}</td>
                                  <td>${s.avgMs} ms</td>
                                  <td>${s.p95Ms} ms</td>
                                  <td class=${s.slow?"diag-bad":""}>${s.slow}</td>
                                  <td class=${s.maxMs>16?"diag-bad":""}>${s.maxMs} ms</td>
                                </tr>`)}
                              </tbody>
                            </table>
                          </div>
                        `}
                  `:a`<p class="field-help">Refresh to read browser timings.</p>`}
            `:a`<p class="field-help">${this.diagBusy?"Reading…":"No snapshot yet."}</p>`}
      </section>
    `}renderFetchHealth(e){const t=e.metrics.counters,s=[["Fetches completed",t["scrape.fetch.ok"]??0,"Pages and listings fetched successfully."],["Retried",t["scrape.fetch.retry"]??0,"A site failed transiently and we tried again."],["Gave up",t["scrape.fetch.exhausted"]??0,"Still failing after every retry."],["Queued behind another request",t["scrape.host_queued"]??0,"A steady number here means we're fanning out wider than the site allows."],["Asked to back off",t["scrape.fetch.backoff_too_long"]??0,"A site asked for a longer wait than we'll hold a click open for."]];return s.every(([,o])=>o===0)?l:a`
      <h4 class="diag-head">Outbound fetches</h4>
      ${s.map(([o,r,i])=>r===0?l:a`<div class="diag-row"><strong>${r}</strong> ${o} <span class="field-help">— ${i}</span></div>`)}
    `}diagStat(e,t){return a`<div class="stat">
      <div class="stat-num diag-stat-num">${t}</div>
      <div class="stat-label">${e}</div>
    </div>`}renderAbout(){const e=this.info;return e?a`
      <section class="card">
        <h3><span class="material-symbols-rounded">info</span>About this server</h3>
        <p class="card-sub">Set by environment variables; changing them needs a restart.</p>
        ${this.readOnlyField("Version","The running build.",e.version)}
        ${this.readOnlyField("Libby features","Included in this exact server build.",(e.features??[]).join(" · ")||"legacy build")}
        ${this.readOnlyField("Video thumbnails","Posters need ffmpeg on the server's PATH.",e.ffmpeg?"ffmpeg available":"ffmpeg missing — posters disabled")}
        ${this.readOnlyField("Media directory","Where encrypted blobs live.",e.mediaDir)}
        ${this.readOnlyField("Database","SQLite metadata store.",e.dbPath)}
        ${this.readOnlyField("Session length","How long a login stays valid.",`${e.sessionHours} hours`)}
      </section>
    `:l}switchField(e,t,s,o,r=!1){const i=!this.canEdit||r;return a`
      <div class="field">
        <div class="field-text">
          <div class="field-label">${e}</div>
          <div class="field-help">${t}</div>
        </div>
        <div class="field-control">
          <button
            class="switch ${s?"on":""}"
            role="switch"
            aria-checked=${s?"true":"false"}
            aria-label=${e}
            ?disabled=${i}
            @click=${()=>o(!s)}
          ></button>
        </div>
      </div>
    `}readOnlyField(e,t,s){return a`
      <div class="field">
        <div class="field-text">
          <div class="field-label">${e}</div>
          <div class="field-help">${t}</div>
        </div>
        <div class="field-control"><span class="ro">${s}</span></div>
      </div>
    `}};c.styles=[C,O,T`
      :host {
        display: block;
      }

      /* Discord's settings shape: a grouped category rail on the left, one panel on
         the right. Sections inside a panel are flat and separated by rules rather
         than floated as cards — with only one panel visible, card edges are noise. */
      .shell {
        display: grid;
        grid-template-columns: 218px minmax(0, 1fr);
        gap: 8px;
        align-items: start;
      }
      .cat-rail {
        position: sticky;
        top: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 4px 8px 24px;
      }
      .cat-head {
        padding: 14px 10px 4px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--oppai-text-muted);
      }
      .cat-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--oppai-text-muted);
        font: inherit;
        font-size: 14px;
        font-weight: 500;
        text-align: left;
        cursor: pointer;
        transition: background 0.12s ease, color 0.12s ease;
      }
      .cat-row .material-symbols-rounded {
        font-size: 19px;
      }
      .cat-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cat-row:hover,
      .cat-row.on {
        background: var(--oppai-nav-hover);
        color: var(--oppai-text);
      }
      .cat-row.danger {
        color: var(--oppai-fav);
      }
      .cat-sep {
        height: 1px;
        margin: 10px;
        background: var(--oppai-border);
      }
      .panel-col {
        min-width: 0;
        max-width: 760px;
        padding: 4px 8px 48px;
      }
      .panel-title {
        margin: 0 0 18px;
        font-size: 20px;
        font-weight: 600;
      }
      .card {
        background: transparent;
        border: 0;
        border-top: 1px solid var(--oppai-border);
        border-radius: 0;
        padding: 20px 0 4px;
        margin-bottom: 12px;
        animation: oppai-fade-in-up 0.28s var(--oppai-ease-emphasized) both;
      }
      /* The first section sits directly under the panel title, so its rule would be
         a line under a heading that already reads as one. */
      .card:first-of-type {
        border-top: 0;
        padding-top: 0;
      }
      .card h3 {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--oppai-text-dim);
        margin: 0 0 4px;
      }
      .card h3 .material-symbols-rounded {
        font-size: 17px;
        color: var(--oppai-primary-bright);
      }
      @media (max-width: 860px) {
        /* The rail becomes a scrolling strip above the panel; a 218px column and a
           readable panel do not both fit. */
        .shell {
          grid-template-columns: minmax(0, 1fr);
        }
        .cat-rail {
          position: static;
          flex-direction: row;
          overflow-x: auto;
          gap: 4px;
          padding: 4px 4px 12px;
          border-bottom: 1px solid var(--oppai-border);
        }
        .cat-head,
        .cat-sep {
          display: none;
        }
        .cat-row {
          flex: 0 0 auto;
          border-radius: 999px;
          padding: 7px 12px;
        }
      }
      .card-sub {
        font-size: 13px;
        color: var(--oppai-text-muted);
        margin: 0 0 18px;
      }
      .field {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 0;
        border-top: 1px solid var(--oppai-border);
      }
      .field:first-of-type {
        border-top: none;
      }
      .field-text {
        flex: 1;
        min-width: 0;
      }
      .field-label {
        font-size: 14px;
        font-weight: 500;
      }
      .field-help {
        font-size: 12px;
        color: var(--oppai-text-muted);
        margin-top: 2px;
      }
      .field-control {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      /* Stacked variant for controls too wide to sit beside their label. */
      .field.stack {
        display: block;
      }
      .field.stack .field-control {
        margin-top: 10px;
      }
      /* Libby's voices: one row per voice, installed first. */
      .voice-list {
        list-style: none; margin: 0; padding: 0; width: 100%;
        display: grid; gap: 6px;
      }
      .voice-list li {
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        padding: 8px 10px; border: 1px solid var(--md-sys-color-outline-variant); border-radius: 10px;
        font-size: 13px;
      }
      .voice-list li > span:first-child { flex: 1; min-width: 0; display: grid; }
      .voice-list small, .voice-list .hint { color: var(--md-sys-color-on-surface-variant); font-size: 11px; }
      .voice-list .voice-error { flex-basis: 100%; color: var(--md-sys-color-error); font-size: 11px; font-style: normal; }

      input[type="text"],
      input[type="number"],
      input[type="password"] {
        background: var(--oppai-surface-2);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 12px;
        color: var(--oppai-text);
        font: inherit;
        font-size: 14px;
        padding: 10px 12px;
        outline: none;
        width: 100%;
        box-sizing: border-box;
      }
      input:focus {
        border-color: var(--oppai-primary);
      }
      input[disabled] {
        opacity: 0.55;
      }
      input[type="number"] {
        width: 110px;
      }
      input[type="range"] {
        width: 160px;
        accent-color: var(--oppai-primary);
      }

      /* Switch */
      .switch {
        width: 52px;
        height: 30px;
        border-radius: 15px;
        border: none;
        background: var(--oppai-surface-2);
        position: relative;
        cursor: pointer;
        transition: background 0.2s ease;
        flex-shrink: 0;
      }
      .switch.on {
        background: var(--oppai-primary);
      }
      .switch[disabled] {
        opacity: 0.5;
        cursor: default;
      }
      .switch::after {
        content: "";
        position: absolute;
        top: 4px;
        left: 4px;
        width: 22px;
        height: 22px;
        border-radius: 11px;
        background: var(--oppai-text-muted);
        transition: transform 0.22s var(--oppai-ease-spring), background 0.2s ease;
      }
      .switch.on::after {
        transform: translateX(22px);
        background: var(--oppai-on-primary);
      }

      /* Segmented choice */
      .seg {
        display: flex;
        gap: 6px;
      }
      .seg button {
        height: 36px;
        padding: 0 14px;
        border-radius: 18px;
        border: 1px solid var(--oppai-border-strong);
        background: none;
        color: var(--oppai-text-dim);
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .seg button.on {
        background: var(--oppai-accent);
        border-color: var(--oppai-accent);
        color: var(--oppai-on-accent);
      }

      .value {
        font: 600 13px ui-monospace, monospace;
        color: var(--oppai-text-dim);
        min-width: 40px;
        text-align: right;
      }
      .ro {
        font: 500 12px ui-monospace, monospace;
        color: var(--oppai-text-muted);
        word-break: break-all;
        text-align: right;
      }

      .btn-primary {
        height: 44px;
        padding: 0 24px;
        border-radius: 22px;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        border: none;
        font: inherit;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .btn-primary[disabled] {
        opacity: 0.5;
        cursor: default;
      }
      .btn-inline {
        border: 1px solid var(--oppai-border-strong);
        border-radius: 10px;
        background: transparent;
        color: var(--oppai-text-dim);
        font: inherit;
        font-size: 12px;
        padding: 7px 10px;
        cursor: pointer;
      }

      .banner {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        border-radius: 12px;
        padding: 10px 14px;
        margin-bottom: 20px;
      }
      .banner.info {
        background: var(--oppai-surface-2);
        color: var(--oppai-text-dim);
      }
      .banner.error {
        background: color-mix(in srgb, var(--oppai-fav) 18%, transparent);
        color: var(--oppai-fav);
      }
      .banner.ok {
        background: var(--oppai-primary-container);
        color: var(--oppai-primary-bright);
      }

      /* Sticky save bar for the server-side settings. */
      .savebar {
        position: sticky;
        bottom: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 22px;
        background: var(--oppai-surface-2);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
        animation: oppai-scale-in 0.28s var(--oppai-ease-spring) both;
      }
      .savebar .grow {
        flex: 1;
        font-size: 13px;
        color: var(--oppai-text-dim);
      }

      .stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 12px;
      }
      .stat {
        background: var(--oppai-surface-2);
        border-radius: 14px;
        padding: 12px 14px;
      }
      .stat-num {
        font-size: 20px;
        font-weight: 500;
      }
      .stat-label {
        font-size: 12px;
        color: var(--oppai-text-muted);
        margin-top: 2px;
      }
      /* Passkeys. Each row has to read as a physical thing you either still have or have
         lost, since this list is the revocation screen as much as an inventory. */
      .pk-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 14px;
      }
      .pk-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: var(--oppai-surface-2);
        border-radius: 14px;
        padding: 11px 13px;
      }
      .pk-icon {
        font-size: 22px;
        color: var(--oppai-text-dim);
        flex-shrink: 0;
      }
      .pk-body {
        flex: 1;
        min-width: 0;
      }
      .pk-name {
        font-size: 14px;
        font-weight: 500;
      }
      .pk-meta {
        font-size: 12px;
        color: var(--oppai-text-muted);
        margin-top: 2px;
      }
      .pk-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
      }
      .pk-rename {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .pk-rename input {
        flex: 1;
        min-width: 0;
      }
      .pk-revoke {
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .pk-revoke-actions {
        display: flex;
        gap: 8px;
      }
      .pk-revoke-actions .danger,
      .pk-row .danger {
        color: var(--md-sys-color-error);
      }
      .pk-add {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .pk-add input {
        flex: 1 1 220px;
        min-width: 0;
      }
      /* Diagnostics panel. */
      .diag-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }
      .diag-actions .grow {
        flex: 1 1 200px;
      }
      .diag-head {
        margin: 22px 0 4px;
        font-size: 14px;
        font-weight: 600;
      }
      /* A metric name can be long (a route plus a hostname) and there is no useful
         way to shorten one. The table scrolls inside its own box so the panel
         itself never scrolls sideways. */
      .diag-scroll {
        overflow-x: auto;
        margin-top: 10px;
        border-radius: 12px;
        background: var(--oppai-surface-2);
      }
      .diag-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        font-variant-numeric: tabular-nums;
      }
      .diag-table th,
      .diag-table td {
        padding: 7px 12px;
        text-align: right;
        white-space: nowrap;
      }
      .diag-table th {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--oppai-text-muted);
        font-weight: 600;
      }
      .diag-table tbody tr + tr td {
        border-top: 1px solid var(--oppai-border);
      }
      .diag-name {
        text-align: left !important;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
      }
      .diag-bad {
        color: var(--md-sys-color-error);
        font-weight: 600;
      }
      .diag-stat-num {
        font-size: 15px;
      }
      .diag-row {
        font-size: 13px;
        padding: 4px 0;
      }
      .pw {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 360px;
      }
    `];p([R({attribute:!1})],c.prototype,"user",2);p([R({attribute:!1})],c.prototype,"only",2);p([d()],c.prototype,"tab",2);p([d()],c.prototype,"settings",2);p([d()],c.prototype,"info",2);p([d()],c.prototype,"stats",2);p([d()],c.prototype,"apk",2);p([d()],c.prototype,"loadError",2);p([d()],c.prototype,"passkeyList",2);p([d()],c.prototype,"passkeyBusy",2);p([d()],c.prototype,"passkeyError",2);p([d()],c.prototype,"passkeyMsg",2);p([d()],c.prototype,"passkeyName",2);p([d()],c.prototype,"passkeyRenaming",2);p([d()],c.prototype,"passkeyRevoking",2);p([d()],c.prototype,"passkeyPassword",2);p([d()],c.prototype,"diag",2);p([d()],c.prototype,"uiDiag",2);p([d()],c.prototype,"storage",2);p([d()],c.prototype,"storageBusy",2);p([d()],c.prototype,"storageErr",2);p([d()],c.prototype,"diagBusy",2);p([d()],c.prototype,"diagErr",2);p([d()],c.prototype,"dirty",2);p([d()],c.prototype,"saving",2);p([d()],c.prototype,"saved",2);p([d()],c.prototype,"theme",2);p([d()],c.prototype,"fit",2);p([d()],c.prototype,"hideLibby",2);p([d()],c.prototype,"genModels",2);p([d()],c.prototype,"genLoras",2);p([d()],c.prototype,"genLoraTriggers",2);p([d()],c.prototype,"genBoards",2);p([d()],c.prototype,"genError",2);p([d()],c.prototype,"pwCurrent",2);p([d()],c.prototype,"pwNew",2);p([d()],c.prototype,"pwConfirm",2);p([d()],c.prototype,"pwBusy",2);p([d()],c.prototype,"pwMsg",2);p([d()],c.prototype,"pwErr",2);p([d()],c.prototype,"refs",2);p([d()],c.prototype,"refStamp",2);p([d()],c.prototype,"refNote",2);p([d()],c.prototype,"tts",2);p([d()],c.prototype,"describe",2);p([d()],c.prototype,"describeBusy",2);p([d()],c.prototype,"describeNote",2);p([d()],c.prototype,"ttsErrors",2);c=p([B("oppai-settings")],c);function D(e){if(!e)return"never";const t=Math.max(0,(Date.now()-e)/1e3);if(t<90)return"just now";const s=Math.round(t/60);if(s<60)return`${s} min ago`;const o=Math.round(s/60);if(o<24)return`${o}h ago`;const r=Math.round(o/24);return r<=30?`${r} day${r===1?"":"s"} ago`:new Date(e).toLocaleDateString()}function Ae(e){const t=Math.max(0,Math.floor(e)),s=Math.floor(t/86400),o=Math.floor(t%86400/3600),r=Math.floor(t%3600/60);return s>0?`${s}d ${o}h`:o>0?`${o}h ${r}m`:r>0?`${r}m ${t%60}s`:`${t}s`}function m(e){if(!e)return"0 B";const t=["B","KB","MB","GB","TB"];let s=e,o=0;for(;s>=1024&&o<t.length-1;)s/=1024,o++;return`${s<10&&o>0?s.toFixed(1):Math.round(s)} ${t[o]}`}const Be=Object.freeze(Object.defineProperty({__proto__:null,get OppaiSettings(){return c}},Symbol.toStringTag,{value:"Module"}));export{Me as a,F as b,Be as c,Re as l,pe as s};
