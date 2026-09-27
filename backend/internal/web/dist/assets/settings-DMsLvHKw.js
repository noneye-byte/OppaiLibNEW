import{z as P,i as B,v as k,u as l,a as M,e as h,b as a,A as c,t as R,ag as z,ah as I,ai as O,m as C,aj as S,ak as _,x as U,al as G,am as F,an as V,ao as K,ap as W,aq as j,ar as H,as as q,at as Y,au as E,q as Q}from"./index-BlMifOrT.js";import{r as J,p as X}from"./passkeys-D__WvwRN.js";const T="oppai_libby_speak";function ve(){try{return localStorage.getItem(T)==="1"}catch{return!1}}function ge(e){try{localStorage.setItem(T,e?"1":"0")}catch{}e||D(),window.dispatchEvent(new CustomEvent("oppai-libby-speak",{detail:{on:e}}))}let m=null,A=0;async function N(e=!1){if(!e&&m&&Date.now()-A<6e4)return m;try{const t=await fetch("/api/tts/status",{credentials:"same-origin"});if(!t.ok)throw new Error(String(t.status));m=await t.json(),A=Date.now()}catch{m=null}return m}const $=[];let y=null,x=!1,w=0;function Z(e,t=0){const s=e.trim();return s?new Promise(i=>{$.push({text:s,heat:t,done:i}),ee()}):Promise.resolve()}function D(){var e;w++;for(const t of $.splice(0))t.done();y&&(y.pause(),y.src="",y=null);try{(e=window.speechSynthesis)==null||e.cancel()}catch{}}async function ee(){if(!x){x=!0;try{for(;$.length;){const e=$.shift(),t=w;try{await te(e.text,e.heat,t)}catch{}finally{e.done()}}}finally{x=!1}}}async function te(e,t,s){const i=await se(e,t);if(s===w){if(i){await ae(i,s);return}await ie(e,s)}}async function se(e,t){const s=await N();if(s&&!s.engine)return null;try{const i=await fetch("/api/tts/speak",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:e,heat:t||void 0})});return i.status===503?(m=null,null):i.ok?await i.blob():null}catch{return null}}function ae(e,t){return new Promise(s=>{const i=URL.createObjectURL(e),r=new Audio(i);y=r;const n=()=>{y===r&&(y=null),URL.revokeObjectURL(i),s()};r.addEventListener("ended",n,{once:!0}),r.addEventListener("error",n,{once:!0}),r.play().catch(()=>{n()}),t!==w&&n()})}function ie(e,t){const s=window.speechSynthesis;return!s||typeof SpeechSynthesisUtterance>"u"?Promise.resolve():new Promise(i=>{const r=new SpeechSynthesisUtterance(e),n=re(s.getVoices());if(n&&(r.voice=n),r.rate=1.02,r.pitch=1.05,r.onend=()=>i(),r.onerror=()=>i(),t!==w){i();return}s.speak(r)})}function re(e){const t=e.filter(r=>/^en/i.test(r.lang)),s=t.length?t:e,i=r=>{let n=0;const o=r.name.toLowerCase();return/natural|neural|premium|enhanced/.test(o)&&(n+=4),/female|woman|aria|jenny|samantha|zira|karen|moira|tessa|fiona|libby|sonia|ava|allison|susan|emma/.test(o)&&(n+=3),/google/.test(o)&&(n+=1),r.default&&(n+=1),n};return[...s].sort((r,n)=>i(n)-i(r))[0]}var oe=Object.defineProperty,ne=Object.getOwnPropertyDescriptor,g=(e,t,s,i)=>{for(var r=i>1?void 0:i?ne(t,s):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(r=(i?o(t,s,r):o(r))||r);return i&&r&&oe(t,s,r),r};let v=class extends M{constructor(){super(...arguments),this.embedded=!1,this.backgrounds=[],this.defaultID="",this.loading=!0,this.busy=!1,this.note="",this.bad=!1,this.editing=null,this.draftName="",this.draftTags="",this.version=Date.now()}connectedCallback(){super.connectedCallback(),this.reload()}async reload(){this.loading=!0;try{const e=await h.libbyBackgrounds();this.backgrounds=e.backgrounds??[],this.defaultID=e.default??""}catch(e){this.say(e.message,!0)}finally{this.loading=!1}}say(e,t=!1){this.note=e,this.bad=t}changed(){this.dispatchEvent(new CustomEvent("changed",{bubbles:!0,composed:!0}))}startNew(){this.editing="new",this.draftName="",this.draftTags=""}startEdit(e){this.editing=e.id,this.draftName=e.name,this.draftTags=e.tags.join(", ")}async save(e){const t=this.draftName.trim();if(!t){this.say("A background needs a name.",!0);return}this.busy=!0;try{await h.saveLibbyBackground({id:e,name:t,tags:this.draftTags.split(",").map(s=>s.trim()).filter(Boolean)}),this.editing=null,await this.reload(),this.changed(),this.say(e?`Saved ${t}.`:`Added ${t}. Give it a picture so she can go there.`)}catch(s){this.say(s.message,!0)}finally{this.busy=!1}}async uploadPicture(e,t){var r;const s=t.target,i=(r=s.files)==null?void 0:r[0];if(s.value="",!!i){this.busy=!0;try{const n=await new Promise((o,u)=>{const f=new FileReader;f.onload=()=>o(String(f.result)),f.onerror=()=>u(f.error),f.readAsDataURL(i)});await h.setLibbyBackgroundImage(e,n),this.version=Date.now(),await this.reload(),this.changed(),this.say("Picture saved.")}catch(n){this.say(n.message,!0)}finally{this.busy=!1}}}async makeDefault(e){this.busy=!0;try{const t=this.defaultID===e?"":e;await h.setLibbyDefaultBackground(t),this.defaultID=t,this.changed(),this.say(t?"She starts here now.":"No default room — she starts nowhere in particular.")}catch(t){this.say(t.message,!0)}finally{this.busy=!1}}async deleteBackground(e){if(confirm(`Delete ${e.name}?`)){this.busy=!0;try{await h.deleteLibbyBackground(e.id),await this.reload(),this.changed(),this.say(`Deleted ${e.name}.`)}catch(t){this.say(t.message,!0)}finally{this.busy=!1}}}renderEditor(e){return a`<div class="edit">
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
      ${this.embedded?c:a`<div class="head">
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
                  ${e.id===this.defaultID?a`<span class="flag">Default</span>`:c}
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

      ${!this.loading&&!this.backgrounds.length&&this.editing!=="new"?a`<div class="empty">No rooms yet. Add one, give it a picture, and she can start moving around.</div>`:c}
      ${this.note?a`<p class="note ${this.bad?"bad":""}">${this.note}</p>`:c}
    `}};v.styles=[P,B`
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
  `];g([k({type:Boolean})],v.prototype,"embedded",2);g([l()],v.prototype,"backgrounds",2);g([l()],v.prototype,"defaultID",2);g([l()],v.prototype,"loading",2);g([l()],v.prototype,"busy",2);g([l()],v.prototype,"note",2);g([l()],v.prototype,"bad",2);g([l()],v.prototype,"editing",2);g([l()],v.prototype,"draftName",2);g([l()],v.prototype,"draftTags",2);g([l()],v.prototype,"version",2);v=g([R("oppai-libby-backgrounds")],v);var le=Object.defineProperty,de=Object.getOwnPropertyDescriptor,p=(e,t,s,i)=>{for(var r=i>1?void 0:i?de(t,s):t,n=e.length-1,o;n>=0;n--)(o=e[n])&&(r=(i?o(t,s,r):o(r))||r);return i&&r&&le(t,s,r),r};const ce=[{id:"appearance",label:"Appearance",icon:"palette",group:"You"},{id:"account",label:"Account",icon:"account_circle",group:"You"},{id:"ai",label:"AI tagging",icon:"smart_toy",group:"Server",server:!0},{id:"scraping",label:"Scraping",icon:"travel_explore",group:"Server",server:!0},{id:"library",label:"Library",icon:"inventory_2",group:"Server"},{id:"android",label:"Android app",icon:"android",group:"Server"},{id:"storage",label:"Storage",icon:"hard_drive",group:"Server"},{id:"diagnostics",label:"Diagnostics",icon:"speed",group:"Server",adminOnly:!0},{id:"privacy",label:"Privacy",icon:"visibility_off",group:"Server",server:!0,adminOnly:!0},{id:"about",label:"About",icon:"info",group:"Server"}];let d=class extends M{constructor(){super(...arguments),this.only="",this.tab="appearance",this.settings=null,this.info=null,this.stats=null,this.apk=null,this.loadError="",this.passkeyList=null,this.passkeyBusy=!1,this.passkeyError="",this.passkeyMsg="",this.passkeyName="",this.passkeyRenaming=null,this.passkeyRevoking=null,this.passkeyPassword="",this.diag=null,this.uiDiag=null,this.storage=null,this.storageBusy=!1,this.storageErr="",this.diagBusy=!1,this.diagErr="",this.dirty=!1,this.saving=!1,this.saved=!1,this.theme=z(),this.fit=I(),this.hideLibby=O(),this.genModels=[],this.genLoras=[],this.genBoards=[],this.genError="",this.pwCurrent="",this.pwNew="",this.pwConfirm="",this.pwBusy=!1,this.pwMsg="",this.pwErr="",this.refs=null,this.refStamp=Date.now(),this.refNote="",this.tts=void 0,this.describe=null,this.describeBusy=!1,this.describeNote="",this.ttsErrors={},this.addPasskey=async()=>{this.passkeyBusy=!0,this.passkeyError="",this.passkeyMsg="";try{const e=await J(this.passkeyName.trim());this.passkeyName="",this.passkeyMsg=`Added “${e.name}”. You can sign in with it now.`,await this.loadPasskeys()}catch(e){const t=X(e);t&&(this.passkeyError=t)}finally{this.passkeyBusy=!1}},this.cancelRevoke=()=>{this.passkeyRevoking=null,this.passkeyPassword=""},this.loadStorage=async()=>{this.storageBusy=!0,this.storageErr="";try{this.storage=await h.storage()}catch(e){this.storageErr=e.message}finally{this.storageBusy=!1}},this.runCleanup=async()=>{this.storageBusy=!0,this.storageErr="";try{const e=await h.cleanupStorage(["uploads","temp"]);this.storage=e.storage,C(`Reclaimed ${e.freedHuman}.`,"success")}catch(e){this.storageErr=e.message}finally{this.storageBusy=!1}},this.loadDiagnostics=async()=>{this.diagBusy=!0,this.diagErr="";try{this.diag=await h.diagnostics(),this.uiDiag=S()}catch(e){this.diagErr=e.message}finally{this.diagBusy=!1}},this.resetDiagnostics=async()=>{this.diagBusy=!0,this.diagErr="";try{_(),await h.resetDiagnostics(),this.diag=await h.diagnostics(),this.uiDiag=S()}catch(e){this.diagErr=e.message}finally{this.diagBusy=!1}}}connectedCallback(){super.connectedCallback(),U(this,"settings"),this.load(),this.loadGenLists(),this.loadTTS(),this.loadDescribe(),this.loadReferences()}async loadReferences(){try{this.refs=await h.libbyReferences()}catch{this.refs=null}}async setReference(e,t){var r;const s=(r=t.files)==null?void 0:r[0];if(t.value="",!s)return;const i=await new Promise((n,o)=>{const u=new FileReader;u.onload=()=>n(String(u.result)),u.onerror=()=>o(u.error),u.readAsDataURL(s)});try{await h.setLibbyReference(e,i),this.refNote="",this.refStamp=Date.now(),await this.loadReferences()}catch(n){this.refNote=n.message}}async clearReference(e){try{await h.deleteLibbyReference(e),this.refNote="",await this.loadReferences()}catch(t){this.refNote=t.message}}referenceTile(e,t){var i;const s=!!((i=this.refs)!=null&&i[e]);return a`<div style="display:flex;flex-direction:column;gap:6px;align-items:center;width:132px;">
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
          @click=${()=>void this.clearReference(e)}>Remove</button>`:c}
      </div>
    </div>`}async load(){try{const[e,t]=await Promise.all([h.getSettings(),h.stats()]);this.settings=e.settings,this.info=e.readOnly,this.stats=t}catch(e){this.loadError=e.message}try{this.apk=await h.apkInfo()}catch{this.apk={available:!1}}}get canEdit(){var e;return!!((e=this.user)!=null&&e.isAdmin)}openTab(e){G(()=>{this.tab=e}),e==="diagnostics"&&!this.diag&&!this.diagBusy&&this.loadDiagnostics(),e==="storage"&&!this.storage&&!this.storageBusy&&this.loadStorage(),e==="account"&&!this.passkeyList&&this.loadPasskeys()}editLora(e,t){var i;const s=[...((i=this.settings)==null?void 0:i.libbyGenLoras)??[]];s[e]&&(s[e]={...s[e],...t},this.edit({libbyGenLoras:s}))}edit(e){!this.settings||!this.canEdit||(this.settings={...this.settings,...e},this.dirty=!0,this.saved=!1)}async save(){if(this.settings){this.saving=!0;try{const e=await h.saveSettings(this.settings);this.settings=e.settings,this.info=e.readOnly,this.dirty=!1,this.saved=!0,F(!!e.settings.incognito),this.loadTTS(!0),this.loadDescribe()}catch(e){this.loadError=e.message}finally{this.saving=!1}}}pickTheme(e){this.theme=e,V(e),K(e)}pickFit(e){this.fit=e,W(e)}async changePassword(){if(this.pwMsg="",this.pwErr="",this.pwNew!==this.pwConfirm){this.pwErr="The new passwords don't match.";return}if(this.pwNew.length<8){this.pwErr="Use at least 8 characters.";return}this.pwBusy=!0;try{await h.changePassword(this.pwCurrent,this.pwNew),this.pwMsg="Password changed.",this.pwCurrent=this.pwNew=this.pwConfirm=""}catch(e){this.pwErr=e.message}finally{this.pwBusy=!1}}render(){if(this.only)return this.renderOnly(this.only);const e=ce.filter(r=>!r.adminOnly||this.canEdit),t=e.find(r=>r.id===this.tab)??e[0],s=this.dirty||this.saved;let i="";return a`
      <div class="shell">
        <nav class="cat-rail" aria-label="Settings categories">
          ${e.map(r=>{const n=r.group===i?c:a`<div class="cat-head">${r.group}</div>`;return i=r.group,a`${n}
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
              </div>`:c}
          ${!this.canEdit&&this.settings&&t.server?a`<div class="banner info">
                <span class="material-symbols-rounded" style="font-size:18px;">lock</span>
                Server settings are read-only — only an admin can change them.
              </div>`:c}
          ${this.renderTab()}
          ${s?this.renderSaveBar():c}
        </div>
      </div>
    `}renderOnly(e){const t={"libby-general":()=>this.renderLibby(),"libby-model":()=>this.renderLibbyModel(),"libby-voice":()=>this.renderLibbyVoice(),"libby-pictures":()=>a`${this.renderLibbyImageGen()}${this.renderLibbyReferences()}`}[e];return a`<div class="embedded">
      ${this.loadError?a`<div class="banner error"><span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.loadError}</div>`:c}
      ${!this.canEdit&&this.settings&&e!=="libby-general"?a`<div class="banner info"><span class="material-symbols-rounded" style="font-size:18px;">lock</span>Server settings are read-only — only an admin can change them.</div>`:c}
      ${t()}
      ${this.dirty||this.saved?this.renderSaveBar():c}
    </div>`}renderTab(){switch(this.tab){case"appearance":return this.renderAppearance();case"libby":return this.renderLibby();case"backgrounds":return a`<section class="card"><oppai-libby-backgrounds></oppai-libby-backgrounds></section>`;case"ai":return this.renderAI();case"scraping":return this.renderScraping();case"library":return this.renderLibrary();case"android":return this.renderAndroid();case"account":return this.renderAccount();case"storage":return this.renderStorage();case"diagnostics":return this.renderDiagnostics();case"privacy":return this.renderPrivacy();default:return this.renderAbout()}}renderSaveBar(){return a`
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
                      ${b(e.size??0)} · built
                      ${new Date((e.modified??0)*1e3).toLocaleDateString()}
                      ${e.sha256?a`<br /><span style="font-family:monospace; font-size:11px;"
                            >sha256 ${e.sha256.slice(0,16)}…</span
                          >`:c}
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
              @click=${()=>{this.hideLibby=!this.hideLibby,j(this.hideLibby)}}
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
            ${H.map(e=>a`<button
              class=${q()===e?"on":""}
              @click=${()=>{Y(e),this.requestUpdate()}}
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
    `}renderLibbyVoice(){const e=this.settings;if(!e)return c;const t=this.tts,s=(t==null?void 0:t.voices)??[],i=s.filter(o=>o.installed),r=s.filter(o=>!o.installed),n=new Set((t==null?void 0:t.downloading)??[]);return a`<section class="card">
      <h3><span class="material-symbols-rounded">record_voice_over</span>Libby’s voice</h3>
      <p class="card-sub">
        ${t===void 0?"Checking the server…":t?t.engine==="kokoro"&&t.ready?a`Speaking with <strong>Kokoro</strong>, the natural voice, on the server’s CPU. Turn playback on per device with the speaker button in Chat.`:t.engine==="piper"&&t.ready?a`Speaking with <strong>piper</strong> on the server’s CPU. Turn playback on per device with the speaker button in Chat.`:t.engine==="openai"&&t.ready?a`Speaking through the speech server at <code>${e.ttsUrl}</code>.`:a`Not speaking from the server${t.detail?a` — ${t.detail}`:c}. Devices fall back to their own voices.`:"The server did not answer about speech."}
      </p>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Engine</div>
          <div class="field-help">Auto uses the most natural voice the server has — Kokoro, then piper, then the speech server. Piper is quicker and flatter; Off leaves devices to their own voices.</div>
        </div>
        <div class="field-control">
          <select ?disabled=${!this.canEdit} @change=${o=>this.edit({ttsEngine:o.target.value})}>
            ${[["auto","Auto"],["kokoro",`Kokoro — natural${t&&!t.kokoroInstalled?" (not installed)":""}`],["piper",`Piper — light${t&&!t.piperInstalled?" (not installed)":""}`],["openai","Speech server"],["off","Off"]].map(([o,u])=>a`<option value=${o} ?selected=${e.ttsEngine===o}>${u}</option>`)}
          </select>
        </div>
      </div>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Voice</div>
          <div class="field-help">${i.length?"Installed voices. Downloaded ones can be removed below.":"No voice is installed yet — download one below."}</div>
        </div>
        <div class="field-control" style="display:flex; gap:8px; align-items:center;">
          <select ?disabled=${!this.canEdit} @change=${o=>this.edit({ttsVoice:o.target.value})}>
            <option value="" ?selected=${!e.ttsVoice}>Engine’s default</option>
            ${i.map(o=>a`<option value=${o.id} ?selected=${o.id===e.ttsVoice}>${o.label}${o.bundled?" · bundled":""}</option>`)}
            ${e.ttsVoice&&!i.some(o=>o.id===e.ttsVoice)?a`<option value=${e.ttsVoice} selected>${e.ttsVoice} (not installed)</option>`:c}
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
            @input=${o=>this.edit({ttsSpeed:Number(o.target.value)})} />
        </div>
      </div>

      ${t!=null&&t.piperInstalled&&t.engine!=="kokoro"?a`<div class="field stack">
        <div class="field-text">
          <div class="field-label">Piper voices</div>
          <div class="field-help">A curated handful from piper’s voice set, fetched from Hugging Face onto the server (20–110 MB each). Any other piper voice dropped into <code>/config/tts</code> is listed too.</div>
        </div>
        <div class="field-control">
          <ul class="voice-list">
            ${i.map(o=>a`<li><span>${o.label}<small>${o.quality??""}${o.bundled?" · bundled":""}</small></span>
              ${!o.bundled&&this.canEdit?a`<button class="btn" @click=${()=>void this.deleteVoice(o.id)}>Remove</button>`:c}</li>`)}
            ${r.map(o=>a`<li><span>${o.label}<small>${o.quality??""}${o.bytes?` · ${Math.round(o.bytes/1e6)} MB`:""}</small></span>
              ${this.ttsErrors[o.id]?a`<em class="voice-error">${this.ttsErrors[o.id]}</em>`:c}
              ${n.has(o.id)?a`<span class="hint">Downloading…</span>`:this.canEdit?a`<button class="btn" @click=${()=>void this.downloadVoice(o.id)}>Download</button>`:c}</li>`)}
          </ul>
        </div>
      </div>`:c}

      <div class="field stack">
        <div class="field-text">
          <div class="field-label">Speech server (optional)</div>
          <div class="field-help">An OpenAI-compatible <code>/v1/audio/speech</code> server — Kokoro-FastAPI, openedai-speech — such as <code>http://host:8880</code>. Model and key as the server wants them.</div>
        </div>
        <div class="field-control">
          <input type="text" autocomplete="off" placeholder="http://host:8880" .value=${e.ttsUrl} ?disabled=${!this.canEdit}
            @change=${o=>this.edit({ttsUrl:o.target.value})} />
        </div>
        <div class="field-control">
          <input type="text" autocomplete="off" placeholder="Model (default tts-1)" .value=${e.ttsModel} ?disabled=${!this.canEdit}
            @change=${o=>this.edit({ttsModel:o.target.value})} />
        </div>
        <div class="field-control">
          <input type="password" autocomplete="new-password" placeholder=${e.ttsApiKeySet?"API key saved — enter to replace":"API key (optional)"}
            .value=${e.ttsApiKey} ?disabled=${!this.canEdit}
            @change=${o=>this.edit({ttsApiKey:o.target.value})} />
        </div>
      </div>
    </section>`}async loadTTS(e=!1){var t,s;this.tts=await N(e);try{this.ttsErrors=await h.ttsVoiceErrors()}catch{}(s=(t=this.tts)==null?void 0:t.downloading)!=null&&s.length&&window.setTimeout(()=>void this.loadTTS(!0),4e3)}async loadDescribe(){try{this.describe=await h.describeStatus()}catch{this.describe=null}}async probeVision(){this.describeBusy=!0,this.describeNote="";try{const e=await h.describeProbe();this.describeNote=`The model answered: “${e.description}”`}catch(e){this.describeNote=e.message}finally{this.describeBusy=!1}}async toggleBackfill(){var e;this.describeBusy=!0;try{(e=this.describe)!=null&&e.backfilling?await h.describeBackfillStop():await h.describeBackfill(),await this.loadDescribe()}catch(t){this.describeNote=t.message}finally{this.describeBusy=!1}}async testVoice(){D(),await Z("Hi. This is what I sound like. Saved to your library, by the way — nice pick.")}async downloadVoice(e){try{await h.downloadTTSVoice(e),await this.loadTTS(!0)}catch(t){this.loadError=t.message}}async deleteVoice(e){if(confirm(`Remove the ${e} voice from the server?`))try{await h.deleteTTSVoice(e),await this.loadTTS(!0)}catch(t){this.loadError=t.message}}renderLibbyModel(){const e=this.settings;return a`
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
                  ${this.refNote?a`<div class="field-help" style="color:var(--md-sys-color-error);">${this.refNote}</div>`:c}
                </div>
                <div class="field-control" style="display:flex;gap:16px;flex-wrap:wrap;">
                  ${this.referenceTile("clothed","Usual outfit")}
                  ${this.referenceTile("nude","Nothing on")}
                </div>
              </div>
      </section>
    `}renderLibbyImageGen(){const e=this.settings;if(!e)return c;if(!e.imageGenEnabled)return a`<section class="card">
        <h3><span class="material-symbols-rounded">auto_awesome</span>Libby’s image generation</h3>
        <p class="card-sub">
          Set an image generator URL under <strong>Library</strong> and Libby can offer to make
          pictures for you in chat. She always asks first — nothing is generated or saved until
          you press Allow.
        </p>
      </section>`;const t=this.genModels,s=this.genLoras,i=e.libbyGenLoras??[],r=this.genBoards;return a`<section class="card">
      <h3><span class="material-symbols-rounded">auto_awesome</span>Libby’s image generation</h3>
      <p class="card-sub">
        What she uses when she offers to make you a picture. She always asks first — nothing is
        generated or saved until you press Allow.
        ${this.genError?a`<br /><span style="color:var(--oppai-danger,#ff6b6b);">${this.genError}</span>`:c}
      </p>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Model</div>
          <div class="field-help">The checkpoint her pictures are made with. Leave on the
            generator’s default to use whatever it loads.</div>
        </div>
        <div class="field-control">
          ${t.length?a`<select ?disabled=${!this.canEdit}
                @change=${n=>this.edit({libbyGenModel:n.target.value})}>
                <option value="" ?selected=${!e.libbyGenModel}>Generator’s default</option>
                ${t.map(n=>a`<option value=${n} ?selected=${n===e.libbyGenModel}>${n}</option>`)}
              </select>`:a`<input type="text" autocomplete="off" placeholder="Generator’s default"
                .value=${e.libbyGenModel} ?disabled=${!this.canEdit}
                @change=${n=>this.edit({libbyGenModel:n.target.value})} />`}
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
          ${i.map((n,o)=>a`<div style="display:flex; gap:8px; align-items:center;">
            ${s.length?a`<select style="flex:1; min-width:0;" ?disabled=${!this.canEdit}
                  aria-label="LoRA ${o+1}"
                  @change=${u=>this.editLora(o,{name:u.target.value})}>
                  ${(s.includes(n.name)?s:[n.name,...s]).map(u=>a`<option value=${u} ?selected=${u===n.name}>${u}</option>`)}
                </select>`:a`<input type="text" autocomplete="off" placeholder="LoRA name" style="flex:1; min-width:0;"
                  aria-label="LoRA ${o+1}"
                  .value=${n.name} ?disabled=${!this.canEdit}
                  @change=${u=>this.editLora(o,{name:u.target.value})} />`}
            <input type="number" step="0.05" min="-2" max="2" style="width:90px;"
              aria-label="LoRA ${o+1} strength"
              .value=${String(n.weight)} ?disabled=${!this.canEdit}
              @change=${u=>this.editLora(o,{weight:Number(u.target.value)})} />
            <button class="btn-inline" title="Remove" aria-label="Remove LoRA ${o+1}" ?disabled=${!this.canEdit}
              @click=${()=>this.edit({libbyGenLoras:i.filter((u,f)=>f!==o)})}>
              <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
            </button>
          </div>`)}
          <button class="btn-inline" style="align-self:flex-start; display:inline-flex; align-items:center; gap:6px;"
            ?disabled=${!this.canEdit||i.length>=8}
            @click=${()=>this.edit({libbyGenLoras:[...i,{name:s.find(n=>!i.some(o=>o.name===n))??"",weight:1}]})}>
            <span class="material-symbols-rounded" style="font-size:18px;">add</span>
            ${i.length?"Add another LoRA":"Add a LoRA"}
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
                @change=${n=>this.edit({libbyGenBoard:n.target.value})}>
                <option value="" ?selected=${!e.libbyGenBoard}>Uncategorized</option>
                ${r.map(n=>a`<option value=${n} ?selected=${n===e.libbyGenBoard}>${n}</option>`)}
              </select>
            </div>
          </div>`:c}

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
            @change=${n=>this.edit({libbyGenPrompt:n.target.value})}></textarea>
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
            @change=${n=>this.edit({libbyGenNegativePrompt:n.target.value})}></textarea>
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
    </section>`}async loadGenLists(){try{const e=await h.imageGenStatus();if(!e.enabled||!e.reachable){e.enabled&&(this.genError=e.error||"The image generator isn't reachable.");return}this.genModels=(e.models??[]).map(t=>t.title||t.model_name).filter(Boolean),this.genLoras=(e.loras??[]).map(t=>t.name).filter(Boolean),this.genBoards=(e.boards??[]).map(t=>t.name).filter(Boolean)}catch(e){this.genError=e.message}}renderAI(){const e=this.settings,t=this.info;return a`
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
                  `:c}
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
                    ${this.describeNote?a`<div style="margin-top:6px; color:var(--oppai-text);">${this.describeNote}</div>`:c}
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
                </div>`:c}
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
                </div>`:c}
              </div>

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">F95zone login</div>
                  <div class="field-help">
                    Most f95zone.to game threads are members-only. Sign in with your F95 account and
                    OppaiLib can fetch those when you scrape a thread URL. Leave blank to scrape only
                    public threads. Stored on your server; the password is never sent back to this page.
                  </div>
                </div>
                <div class="field-control">
                  <input
                    type="text"
                    autocomplete="off"
                    placeholder="F95 username"
                    .value=${e.f95Username}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({f95Username:t.target.value})}
                  />
                </div>
                <div class="field-control">
                  <input
                    type="password"
                    autocomplete="new-password"
                    placeholder=${e.f95PasswordSet?"•••••••• (unchanged)":"F95 password"}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({f95Password:t.target.value})}
                  />
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
            `:a`<div class="field-help">Loading…</div>`}
      </section>
    `}renderLibrary(){const e=this.stats;if(!e)return c;const t=new Map(e.kinds.map(s=>[s.kind,s]));return a`
      <section class="card">
        <h3><span class="material-symbols-rounded">inventory_2</span>Library</h3>
        <p class="card-sub">
          ${e.items} ${e.items===1?"item":"items"} · ${b(e.bytes)} stored ·
          ${e.tags} ${e.tags===1?"tag":"tags"}
        </p>
        <div class="stat-grid">
          ${Object.keys(E).map(s=>{const i=t.get(s);return a`<div class="stat">
              <div class="stat-num">${(i==null?void 0:i.count)??0}</div>
              <div class="stat-label">${E[s].label} · ${b((i==null?void 0:i.bytes)??0)}</div>
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
            </div>`:c}
        ${this.passkeyMsg?a`<div class="banner ok">
              <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span>${this.passkeyMsg}
            </div>`:c}

        ${e&&!e.available?a`<div class="banner info">
              <span class="material-symbols-rounded" style="font-size:18px;">lock</span>
              ${e.reason}
            </div>`:c}

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
            `:c}

        ${e!=null&&e.relyingPartyId?a`<p class="field-help">
              Passkeys added here are tied to <code>${e.relyingPartyId}</code>. That's how
              WebAuthn works — reach OppaiLib at a different address and your device won't
              offer them, so add one per address you actually use.
            </p>`:c}
      </section>
    `}renderPasskeyRow(e){const t=this.passkeyRenaming===e.id,s=this.passkeyRevoking===e.id;return a`
      <div class="pk-row">
        <span class="material-symbols-rounded pk-icon">${e.synced?"cloud_sync":"key"}</span>
        <div class="pk-body">
          ${t?a`<div class="pk-rename">
                <input
                  type="text"
                  .value=${this.passkeyName}
                  @input=${i=>this.passkeyName=i.target.value}
                />
                <button @click=${()=>void this.savePasskeyName(e)}>Save</button>
                <button @click=${()=>this.passkeyRenaming=null}>Cancel</button>
              </div>`:a`<div class="pk-name">${e.name}</div>`}
          <div class="pk-meta">
            ${e.synced?"Synced to your account":"This device only"}
            · added ${L(e.createdAt)}
            · ${e.lastUsedAt?`last used ${L(e.lastUsedAt)}`:"never used"}
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
                  @input=${i=>this.passkeyPassword=i.target.value}
                />
                <div class="pk-revoke-actions">
                  <button @click=${this.cancelRevoke}>Cancel</button>
                  <button class="danger" ?disabled=${this.passkeyBusy||!this.passkeyPassword}
                    @click=${()=>void this.revokePasskey(e)}>
                    ${this.passkeyBusy?"Removing…":"Remove it"}
                  </button>
                </div>
              </div>`:c}
        </div>
        ${t||s?c:a`<div class="pk-actions">
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
            </div>`:c}
        ${this.pwMsg?a`<div class="banner ok">
              <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span>${this.pwMsg}
            </div>`:c}

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
            </div>`:c}

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
              </button>`:c}
          <span class="field-help grow">
            Reclaiming removes only what can be recreated: chunks of uploads nobody
            came back to finish, and scratch files from jobs that have ended. It never
            touches your media, Libby's memories or model files.
          </span>
        </div>

        ${e?a`
              ${e.pendingBytes>0?a`<p class="field-help">
                    Uploads in progress still need about ${b(e.pendingBytes)}.
                  </p>`:c}
              ${e.mappings.map(s=>this.renderMapping(s))}
              <h4 style="margin:18px 0 6px;">Reclaimable now</h4>
              ${e.reclaimable.map(s=>a`<p class="field-help">
                ${s.label}: <strong>${b(s.bytes)}</strong>${s.note?a` — ${s.note}`:c}
              </p>`)}
            `:a`<p class="field-help">${this.storageBusy?"Reading…":"No reading yet."}</p>`}
      </section>
    `}renderMapping(e){const t=e.totalBytes>0?Math.round(e.usedBytes/e.totalBytes*100):0;return a`
      <div class="setting-row" style="display:block;">
        <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
          <strong>${e.label}</strong>
          <code style="font-size:12px; opacity:.8;">${e.path}</code>
          ${e.exists?c:a`<span class="field-help" style="color:var(--oppai-error);">not mapped</span>`}
          ${e.exists&&!e.writable?a`<span class="field-help" style="color:var(--oppai-error);">read-only</span>`:c}
        </div>
        <div style="height:6px; border-radius:999px; background:var(--oppai-surface-2); overflow:hidden; margin:6px 0;">
          <span style="display:block; height:100%; width:${t}%; background:${t>=90?"var(--oppai-error)":"var(--oppai-primary)"};"></span>
        </div>
        <p class="field-help">
          ${e.error?e.error:a`${b(e.freeBytes)} free of ${b(e.totalBytes)} (${t}% used)`}
          ${(e.contents??[]).map(s=>a` · ${s.label}: ${b(s.bytes)}${s.count?a` (${s.count})`:c}`)}
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
            </div>`:c}

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
              ${e.dbWal?c:a`<div class="banner error">
                    <span class="material-symbols-rounded" style="font-size:18px;">warning</span>
                    The database isn't in WAL mode, so every query runs one at a time.
                    This is usually because it lives on a network share — move it to a
                    local disk and restart.
                  </div>`}

              <div class="stat-grid">
                ${this.diagStat("Uptime",pe(e.uptimeSeconds))}
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
    `}renderFetchHealth(e){const t=e.metrics.counters,s=[["Fetches completed",t["scrape.fetch.ok"]??0,"Pages and listings fetched successfully."],["Retried",t["scrape.fetch.retry"]??0,"A site failed transiently and we tried again."],["Gave up",t["scrape.fetch.exhausted"]??0,"Still failing after every retry."],["Queued behind another request",t["scrape.host_queued"]??0,"A steady number here means we're fanning out wider than the site allows."],["Asked to back off",t["scrape.fetch.backoff_too_long"]??0,"A site asked for a longer wait than we'll hold a click open for."]];return s.every(([,i])=>i===0)?c:a`
      <h4 class="diag-head">Outbound fetches</h4>
      ${s.map(([i,r,n])=>r===0?c:a`<div class="diag-row"><strong>${r}</strong> ${i} <span class="field-help">— ${n}</span></div>`)}
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
    `:c}switchField(e,t,s,i,r=!1){const n=!this.canEdit||r;return a`
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
            ?disabled=${n}
            @click=${()=>i(!s)}
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
    `}};d.styles=[P,Q,B`
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
    `];p([k({attribute:!1})],d.prototype,"user",2);p([k({attribute:!1})],d.prototype,"only",2);p([l()],d.prototype,"tab",2);p([l()],d.prototype,"settings",2);p([l()],d.prototype,"info",2);p([l()],d.prototype,"stats",2);p([l()],d.prototype,"apk",2);p([l()],d.prototype,"loadError",2);p([l()],d.prototype,"passkeyList",2);p([l()],d.prototype,"passkeyBusy",2);p([l()],d.prototype,"passkeyError",2);p([l()],d.prototype,"passkeyMsg",2);p([l()],d.prototype,"passkeyName",2);p([l()],d.prototype,"passkeyRenaming",2);p([l()],d.prototype,"passkeyRevoking",2);p([l()],d.prototype,"passkeyPassword",2);p([l()],d.prototype,"diag",2);p([l()],d.prototype,"uiDiag",2);p([l()],d.prototype,"storage",2);p([l()],d.prototype,"storageBusy",2);p([l()],d.prototype,"storageErr",2);p([l()],d.prototype,"diagBusy",2);p([l()],d.prototype,"diagErr",2);p([l()],d.prototype,"dirty",2);p([l()],d.prototype,"saving",2);p([l()],d.prototype,"saved",2);p([l()],d.prototype,"theme",2);p([l()],d.prototype,"fit",2);p([l()],d.prototype,"hideLibby",2);p([l()],d.prototype,"genModels",2);p([l()],d.prototype,"genLoras",2);p([l()],d.prototype,"genBoards",2);p([l()],d.prototype,"genError",2);p([l()],d.prototype,"pwCurrent",2);p([l()],d.prototype,"pwNew",2);p([l()],d.prototype,"pwConfirm",2);p([l()],d.prototype,"pwBusy",2);p([l()],d.prototype,"pwMsg",2);p([l()],d.prototype,"pwErr",2);p([l()],d.prototype,"refs",2);p([l()],d.prototype,"refStamp",2);p([l()],d.prototype,"refNote",2);p([l()],d.prototype,"tts",2);p([l()],d.prototype,"describe",2);p([l()],d.prototype,"describeBusy",2);p([l()],d.prototype,"describeNote",2);p([l()],d.prototype,"ttsErrors",2);d=p([R("oppai-settings")],d);function L(e){if(!e)return"never";const t=Math.max(0,(Date.now()-e)/1e3);if(t<90)return"just now";const s=Math.round(t/60);if(s<60)return`${s} min ago`;const i=Math.round(s/60);if(i<24)return`${i}h ago`;const r=Math.round(i/24);return r<=30?`${r} day${r===1?"":"s"} ago`:new Date(e).toLocaleDateString()}function pe(e){const t=Math.max(0,Math.floor(e)),s=Math.floor(t/86400),i=Math.floor(t%86400/3600),r=Math.floor(t%3600/60);return s>0?`${s}d ${i}h`:i>0?`${i}h ${r}m`:r>0?`${r}m ${t%60}s`:`${t}s`}function b(e){if(!e)return"0 B";const t=["B","KB","MB","GB","TB"];let s=e,i=0;for(;s>=1024&&i<t.length-1;)s/=1024,i++;return`${s<10&&i>0?s.toFixed(1):Math.round(s)} ${t[i]}`}const be=Object.freeze(Object.defineProperty({__proto__:null,get OppaiSettings(){return d}},Symbol.toStringTag,{value:"Module"}));export{ge as a,D as b,be as c,ve as l,Z as s};
