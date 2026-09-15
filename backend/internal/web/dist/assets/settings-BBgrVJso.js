import{t as f,s as m,a as w}from"./libby-backgrounds-n1qcLQ-w.js";import{a as $,v as x,w as k,x as S,e as c,m as E,y as v,z as A,B as L,C as M,D as P,E as B,F as T,G as R,A as d,b as t,H as z,L as I,I as N,J as C,K as g,M as D,q as O,i as _,N as U,u as p,t as F}from"./index-CsG9DGtL.js";import{r as G,p as V}from"./passkeys-rN4gfhLm.js";var W=Object.defineProperty,K=Object.getOwnPropertyDescriptor,l=(e,s,a,o)=>{for(var i=o>1?void 0:o?K(s,a):s,h=e.length-1,r;h>=0;h--)(r=e[h])&&(i=(o?r(s,a,i):r(i))||i);return o&&i&&W(s,a,i),i};const H=[{id:"appearance",label:"Appearance",icon:"palette",group:"You"},{id:"libby",label:"Libby",icon:"auto_awesome",group:"You"},{id:"backgrounds",label:"Her backgrounds",icon:"wallpaper",group:"You"},{id:"account",label:"Account",icon:"account_circle",group:"You"},{id:"ai",label:"AI tagging",icon:"smart_toy",group:"Server",server:!0},{id:"scraping",label:"Scraping",icon:"travel_explore",group:"Server",server:!0},{id:"library",label:"Library",icon:"inventory_2",group:"Server"},{id:"android",label:"Android app",icon:"android",group:"Server"},{id:"storage",label:"Storage",icon:"hard_drive",group:"Server"},{id:"diagnostics",label:"Diagnostics",icon:"speed",group:"Server",adminOnly:!0},{id:"privacy",label:"Privacy",icon:"visibility_off",group:"Server",server:!0,adminOnly:!0},{id:"about",label:"About",icon:"info",group:"Server"}];let n=class extends ${constructor(){super(...arguments),this.tab="appearance",this.settings=null,this.info=null,this.stats=null,this.apk=null,this.loadError="",this.passkeyList=null,this.passkeyBusy=!1,this.passkeyError="",this.passkeyMsg="",this.passkeyName="",this.passkeyRenaming=null,this.passkeyRevoking=null,this.passkeyPassword="",this.diag=null,this.uiDiag=null,this.storage=null,this.storageBusy=!1,this.storageErr="",this.diagBusy=!1,this.diagErr="",this.dirty=!1,this.saving=!1,this.saved=!1,this.theme=x(),this.fit=k(),this.hideLibby=S(),this.genModels=[],this.genLoras=[],this.genBoards=[],this.genError="",this.pwCurrent="",this.pwNew="",this.pwConfirm="",this.pwBusy=!1,this.pwMsg="",this.pwErr="",this.tts=void 0,this.ttsErrors={},this.addPasskey=async()=>{this.passkeyBusy=!0,this.passkeyError="",this.passkeyMsg="";try{const e=await G(this.passkeyName.trim());this.passkeyName="",this.passkeyMsg=`Added “${e.name}”. You can sign in with it now.`,await this.loadPasskeys()}catch(e){const s=V(e);s&&(this.passkeyError=s)}finally{this.passkeyBusy=!1}},this.cancelRevoke=()=>{this.passkeyRevoking=null,this.passkeyPassword=""},this.loadStorage=async()=>{this.storageBusy=!0,this.storageErr="";try{this.storage=await c.storage()}catch(e){this.storageErr=e.message}finally{this.storageBusy=!1}},this.runCleanup=async()=>{this.storageBusy=!0,this.storageErr="";try{const e=await c.cleanupStorage(["uploads","temp"]);this.storage=e.storage,E(`Reclaimed ${e.freedHuman}.`,"success")}catch(e){this.storageErr=e.message}finally{this.storageBusy=!1}},this.loadDiagnostics=async()=>{this.diagBusy=!0,this.diagErr="";try{this.diag=await c.diagnostics(),this.uiDiag=v()}catch(e){this.diagErr=e.message}finally{this.diagBusy=!1}},this.resetDiagnostics=async()=>{this.diagBusy=!0,this.diagErr="";try{A(),await c.resetDiagnostics(),this.diag=await c.diagnostics(),this.uiDiag=v()}catch(e){this.diagErr=e.message}finally{this.diagBusy=!1}}}connectedCallback(){super.connectedCallback(),L(this,"settings"),this.load(),this.loadGenLists(),this.loadTTS()}async load(){try{const[e,s]=await Promise.all([c.getSettings(),c.stats()]);this.settings=e.settings,this.info=e.readOnly,this.stats=s}catch(e){this.loadError=e.message}try{this.apk=await c.apkInfo()}catch{this.apk={available:!1}}}get canEdit(){var e;return!!((e=this.user)!=null&&e.isAdmin)}openTab(e){M(()=>{this.tab=e}),e==="diagnostics"&&!this.diag&&!this.diagBusy&&this.loadDiagnostics(),e==="storage"&&!this.storage&&!this.storageBusy&&this.loadStorage(),e==="account"&&!this.passkeyList&&this.loadPasskeys()}edit(e){!this.settings||!this.canEdit||(this.settings={...this.settings,...e},this.dirty=!0,this.saved=!1)}async save(){if(this.settings){this.saving=!0;try{const e=await c.saveSettings(this.settings);this.settings=e.settings,this.info=e.readOnly,this.dirty=!1,this.saved=!0,P(!!e.settings.incognito),this.loadTTS(!0)}catch(e){this.loadError=e.message}finally{this.saving=!1}}}pickTheme(e){this.theme=e,B(e),T(e)}pickFit(e){this.fit=e,R(e)}async changePassword(){if(this.pwMsg="",this.pwErr="",this.pwNew!==this.pwConfirm){this.pwErr="The new passwords don't match.";return}if(this.pwNew.length<8){this.pwErr="Use at least 8 characters.";return}this.pwBusy=!0;try{await c.changePassword(this.pwCurrent,this.pwNew),this.pwMsg="Password changed.",this.pwCurrent=this.pwNew=this.pwConfirm=""}catch(e){this.pwErr=e.message}finally{this.pwBusy=!1}}render(){const e=H.filter(i=>!i.adminOnly||this.canEdit),s=e.find(i=>i.id===this.tab)??e[0],a=this.dirty||this.saved;let o="";return t`
      <div class="shell">
        <nav class="cat-rail" aria-label="Settings categories">
          ${e.map(i=>{const h=i.group===o?d:t`<div class="cat-head">${i.group}</div>`;return o=i.group,t`${h}
              <button
                class="cat-row ${i.id===this.tab?"on":""}"
                aria-current=${i.id===this.tab?"page":"false"}
                @click=${()=>this.openTab(i.id)}
              >
                <span class="material-symbols-rounded">${i.icon}</span>
                <span class="cat-label">${i.label}</span>
              </button>`})}
          <div class="cat-sep"></div>
          <button class="cat-row danger" @click=${()=>this.dispatchEvent(new CustomEvent("logout",{bubbles:!0,composed:!0}))}>
            <span class="material-symbols-rounded">logout</span>
            <span class="cat-label">Sign out</span>
          </button>
        </nav>

        <div class="panel-col">
          <h2 class="panel-title">${s.label}</h2>
          ${this.loadError?t`<div class="banner error">
                <span class="material-symbols-rounded" style="font-size:18px;">error</span>
                ${this.loadError}
              </div>`:d}
          ${!this.canEdit&&this.settings&&s.server?t`<div class="banner info">
                <span class="material-symbols-rounded" style="font-size:18px;">lock</span>
                Server settings are read-only — only an admin can change them.
              </div>`:d}
          ${this.renderTab()}
          ${a?this.renderSaveBar():d}
        </div>
      </div>
    `}renderTab(){switch(this.tab){case"appearance":return this.renderAppearance();case"libby":return this.renderLibby();case"backgrounds":return t`<section class="card"><oppai-libby-backgrounds></oppai-libby-backgrounds></section>`;case"ai":return this.renderAI();case"scraping":return this.renderScraping();case"library":return this.renderLibrary();case"android":return this.renderAndroid();case"account":return this.renderAccount();case"storage":return this.renderStorage();case"diagnostics":return this.renderDiagnostics();case"privacy":return this.renderPrivacy();default:return this.renderAbout()}}renderSaveBar(){return t`
      <div class="savebar">
        <span class="grow">
          ${this.saved&&!this.dirty?"Settings saved — they're live now.":"You have unsaved changes."}
        </span>
        <button class="btn-primary" ?disabled=${this.saving||!this.dirty} @click=${this.save}>
          <span class="material-symbols-rounded" style="font-size:20px;">save</span>
          ${this.saving?"Saving…":"Save"}
        </button>
      </div>
    `}renderAndroid(){const e=this.apk;return t`
      <section class="card">
        <h3><span class="material-symbols-rounded">android</span>Android app</h3>
        <p class="card-sub">
          Install the companion app straight from this server — no app store, no
          sideloading from a third party.
        </p>

        ${e===null?t`<p class="field-help">Checking…</p>`:e.available?t`
                <div class="field">
                  <div class="field-text">
                    <div class="field-label">oppailib.apk</div>
                    <div class="field-help">
                      ${u(e.size??0)} · built
                      ${new Date((e.modified??0)*1e3).toLocaleDateString()}
                      ${e.sha256?t`<br /><span style="font-family:monospace; font-size:11px;"
                            >sha256 ${e.sha256.slice(0,16)}…</span
                          >`:d}
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
              `:t`<p class="field-help">
                No APK is bundled with this server build. Drop one at
                <code>/config/oppailib.apk</code>, or grab it from the Actions run that
                built this image.
              </p>`}
      </section>
    `}renderAppearance(){return t`
      <section class="card">
        <h3><span class="material-symbols-rounded">palette</span>Appearance</h3>
        <p class="card-sub">Per-device — applies as soon as you pick it.</p>

        <div class="field">
          <div class="field-text">
            <div class="field-label">Theme</div>
            <div class="field-help">"System" follows your OS light/dark setting.</div>
          </div>
          <div class="field-control seg">
            ${[["dark","Dark","dark_mode"],["light","Light","light_mode"],["system","System","contrast"]].map(([e,s,a])=>t`<button
                class=${this.theme===e?"on":""}
                @click=${()=>this.pickTheme(e)}
              >
                <span class="material-symbols-rounded" style="font-size:18px;">${a}</span>${s}
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
            ${[["page","Fit page","fit_screen"],["width","Fit width","fit_width"]].map(([e,s,a])=>t`<button
                class=${this.fit===e?"on":""}
                @click=${()=>this.pickFit(e)}
              >
                <span class="material-symbols-rounded" style="font-size:18px;">${a}</span>${s}
              </button>`)}
          </div>
        </div>
      </section>
    `}renderPrivacy(){const e=this.settings,s=!!(e!=null&&e.incognito);return t`
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
              class="switch ${s?"on":""}"
              role="switch"
              aria-checked=${s?"true":"false"}
              aria-label="Appear as a Nextcloud instance"
              ?disabled=${!e||!this.canEdit}
              @click=${()=>this.edit({incognito:!s})}
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
    `}renderLibby(){return t`
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
              @click=${()=>{this.hideLibby=!this.hideLibby,z(this.hideLibby)}}
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
            ${I.map(e=>t`<button
              class=${N()===e?"on":""}
              @click=${()=>{C(e),this.requestUpdate()}}
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
      ${this.renderLibbyVoice()}
      ${this.renderLibbyImageGen()}
    `}renderLibbyVoice(){const e=this.settings;if(!e)return d;const s=this.tts,a=(s==null?void 0:s.voices)??[],o=a.filter(r=>r.installed),i=a.filter(r=>!r.installed),h=new Set((s==null?void 0:s.downloading)??[]);return t`<section class="card">
      <h3><span class="material-symbols-rounded">record_voice_over</span>Libby’s voice</h3>
      <p class="card-sub">
        ${s===void 0?"Checking the server…":s?s.engine==="piper"&&s.ready?t`Speaking with <strong>piper</strong> on the server’s CPU. Turn playback on per device with the speaker button in Chat.`:s.engine==="openai"&&s.ready?t`Speaking through the speech server at <code>${e.ttsUrl}</code>.`:t`Not speaking from the server${s.detail?t` — ${s.detail}`:d}. Devices fall back to their own voices.`:"The server did not answer about speech."}
      </p>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Engine</div>
          <div class="field-help">Auto prefers piper on the server and falls back to the speech server. Off leaves devices to their own voices.</div>
        </div>
        <div class="field-control">
          <select ?disabled=${!this.canEdit} @change=${r=>this.edit({ttsEngine:r.target.value})}>
            ${[["auto","Auto"],["piper",`Piper on the server${s&&!s.piperInstalled?" (not installed)":""}`],["openai","Speech server"],["off","Off"]].map(([r,b])=>t`<option value=${r} ?selected=${e.ttsEngine===r}>${b}</option>`)}
          </select>
        </div>
      </div>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Voice</div>
          <div class="field-help">${o.length?"Installed voices. Downloaded ones can be removed below.":"No voice is installed yet — download one below."}</div>
        </div>
        <div class="field-control" style="display:flex; gap:8px; align-items:center;">
          <select ?disabled=${!this.canEdit} @change=${r=>this.edit({ttsVoice:r.target.value})}>
            <option value="" ?selected=${!e.ttsVoice}>Engine’s default</option>
            ${o.map(r=>t`<option value=${r.id} ?selected=${r.id===e.ttsVoice}>${r.label}${r.bundled?" · bundled":""}</option>`)}
            ${e.ttsVoice&&!o.some(r=>r.id===e.ttsVoice)?t`<option value=${e.ttsVoice} selected>${e.ttsVoice} (not installed)</option>`:d}
          </select>
          <button class="btn" ?disabled=${!(s!=null&&s.ready)} title="Hear the current voice" @click=${()=>void this.testVoice()}>Test</button>
        </div>
      </div>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Pace</div>
          <div class="field-help">${e.ttsSpeed.toFixed(2)}× — under 1 is slower, over 1 quicker.</div>
        </div>
        <div class="field-control">
          <input type="range" min="0.5" max="2" step="0.05" .value=${String(e.ttsSpeed)} ?disabled=${!this.canEdit}
            @input=${r=>this.edit({ttsSpeed:Number(r.target.value)})} />
        </div>
      </div>

      ${s!=null&&s.piperInstalled?t`<div class="field stack">
        <div class="field-text">
          <div class="field-label">Piper voices</div>
          <div class="field-help">A curated handful from piper’s voice set, fetched from Hugging Face onto the server (20–110 MB each). Any other piper voice dropped into <code>/config/tts</code> is listed too.</div>
        </div>
        <div class="field-control">
          <ul class="voice-list">
            ${o.map(r=>t`<li><span>${r.label}<small>${r.quality??""}${r.bundled?" · bundled":""}</small></span>
              ${!r.bundled&&this.canEdit?t`<button class="btn" @click=${()=>void this.deleteVoice(r.id)}>Remove</button>`:d}</li>`)}
            ${i.map(r=>t`<li><span>${r.label}<small>${r.quality??""}${r.bytes?` · ${Math.round(r.bytes/1e6)} MB`:""}</small></span>
              ${this.ttsErrors[r.id]?t`<em class="voice-error">${this.ttsErrors[r.id]}</em>`:d}
              ${h.has(r.id)?t`<span class="hint">Downloading…</span>`:this.canEdit?t`<button class="btn" @click=${()=>void this.downloadVoice(r.id)}>Download</button>`:d}</li>`)}
          </ul>
        </div>
      </div>`:d}

      <div class="field stack">
        <div class="field-text">
          <div class="field-label">Speech server (optional)</div>
          <div class="field-help">An OpenAI-compatible <code>/v1/audio/speech</code> server — Kokoro-FastAPI, openedai-speech — such as <code>http://host:8880</code>. Model and key as the server wants them.</div>
        </div>
        <div class="field-control">
          <input type="text" autocomplete="off" placeholder="http://host:8880" .value=${e.ttsUrl} ?disabled=${!this.canEdit}
            @change=${r=>this.edit({ttsUrl:r.target.value})} />
        </div>
        <div class="field-control">
          <input type="text" autocomplete="off" placeholder="Model (default tts-1)" .value=${e.ttsModel} ?disabled=${!this.canEdit}
            @change=${r=>this.edit({ttsModel:r.target.value})} />
        </div>
        <div class="field-control">
          <input type="password" autocomplete="new-password" placeholder=${e.ttsApiKeySet?"API key saved — enter to replace":"API key (optional)"}
            .value=${e.ttsApiKey} ?disabled=${!this.canEdit}
            @change=${r=>this.edit({ttsApiKey:r.target.value})} />
        </div>
      </div>
    </section>`}async loadTTS(e=!1){var s,a;this.tts=await f(e);try{this.ttsErrors=await c.ttsVoiceErrors()}catch{}(a=(s=this.tts)==null?void 0:s.downloading)!=null&&a.length&&window.setTimeout(()=>void this.loadTTS(!0),4e3)}async testVoice(){m(),await w("Hi. This is what I sound like. Saved to your library, by the way — nice pick.")}async downloadVoice(e){try{await c.downloadTTSVoice(e),await this.loadTTS(!0)}catch(s){this.loadError=s.message}}async deleteVoice(e){if(confirm(`Remove the ${e} voice from the server?`))try{await c.deleteTTSVoice(e),await this.loadTTS(!0)}catch(s){this.loadError=s.message}}renderLibbyImageGen(){const e=this.settings;if(!e)return d;if(!e.imageGenEnabled)return t`<section class="card">
        <h3><span class="material-symbols-rounded">auto_awesome</span>Libby’s image generation</h3>
        <p class="card-sub">
          Set an image generator URL under <strong>Library</strong> and Libby can offer to make
          pictures for you in chat. She always asks first — nothing is generated or saved until
          you press Allow.
        </p>
      </section>`;const s=this.genModels,a=this.genLoras,o=this.genBoards;return t`<section class="card">
      <h3><span class="material-symbols-rounded">auto_awesome</span>Libby’s image generation</h3>
      <p class="card-sub">
        What she uses when she offers to make you a picture. She always asks first — nothing is
        generated or saved until you press Allow.
        ${this.genError?t`<br /><span style="color:var(--oppai-danger,#ff6b6b);">${this.genError}</span>`:d}
      </p>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Model</div>
          <div class="field-help">The checkpoint her pictures are made with. Leave on the
            generator’s default to use whatever it loads.</div>
        </div>
        <div class="field-control">
          ${s.length?t`<select ?disabled=${!this.canEdit}
                @change=${i=>this.edit({libbyGenModel:i.target.value})}>
                <option value="" ?selected=${!e.libbyGenModel}>Generator’s default</option>
                ${s.map(i=>t`<option value=${i} ?selected=${i===e.libbyGenModel}>${i}</option>`)}
              </select>`:t`<input type="text" autocomplete="off" placeholder="Generator’s default"
                .value=${e.libbyGenModel} ?disabled=${!this.canEdit}
                @change=${i=>this.edit({libbyGenModel:i.target.value})} />`}
        </div>
      </div>

      <div class="field">
        <div class="field-text">
          <div class="field-label">LoRA</div>
          <div class="field-help">One LoRA applied to everything she makes — usually the one
            that makes the picture look like her.</div>
        </div>
        <div class="field-control" style="display:flex; gap:8px; align-items:center;">
          ${a.length?t`<select ?disabled=${!this.canEdit}
                @change=${i=>this.edit({libbyGenLora:i.target.value})}>
                <option value="" ?selected=${!e.libbyGenLora}>None</option>
                ${a.map(i=>t`<option value=${i} ?selected=${i===e.libbyGenLora}>${i}</option>`)}
              </select>`:t`<input type="text" autocomplete="off" placeholder="None"
                .value=${e.libbyGenLora} ?disabled=${!this.canEdit}
                @change=${i=>this.edit({libbyGenLora:i.target.value})} />`}
          <input type="number" step="0.05" min="-2" max="2" style="width:90px;"
            aria-label="LoRA strength"
            .value=${String(e.libbyGenLoraWeight||1)} ?disabled=${!this.canEdit||!e.libbyGenLora}
            @change=${i=>this.edit({libbyGenLoraWeight:Number(i.target.value)})} />
        </div>
      </div>

      ${o.length?t`<div class="field">
            <div class="field-text">
              <div class="field-label">Board</div>
              <div class="field-help">The InvokeAI board her pictures are filed into, so what she
                makes stays separate from your own generations.</div>
            </div>
            <div class="field-control">
              <select ?disabled=${!this.canEdit}
                @change=${i=>this.edit({libbyGenBoard:i.target.value})}>
                <option value="" ?selected=${!e.libbyGenBoard}>Uncategorized</option>
                ${o.map(i=>t`<option value=${i} ?selected=${i===e.libbyGenBoard}>${i}</option>`)}
              </select>
            </div>
          </div>`:d}

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
    </section>`}async loadGenLists(){try{const e=await c.imageGenStatus();if(!e.enabled||!e.reachable){e.enabled&&(this.genError=e.error||"The image generator isn't reachable.");return}this.genModels=(e.models??[]).map(s=>s.title||s.model_name).filter(Boolean),this.genLoras=(e.loras??[]).map(s=>s.name).filter(Boolean),this.genBoards=(e.boards??[]).map(s=>s.name).filter(Boolean)}catch(e){this.genError=e.message}}renderAI(){const e=this.settings,s=this.info;return t`
      <section class="card">
        <h3><span class="material-symbols-rounded">auto_awesome</span>AI auto-tagging</h3>
        <p class="card-sub">
          Tagging runs entirely on this box — no image ever leaves it. The heuristic tagger needs no
          model; a real classifier requires an ONNX build with a model in the model directory.
        </p>

        ${e?t`
              ${this.switchField("Enable auto-tagging","Master switch. Off means no tagging at all, including the ✨ button.",e.aiEnabled,a=>this.edit({aiEnabled:a}))}
              ${this.switchField("Tag on import","Tag new uploads and imports automatically. With this off, tagging only happens when you ask for it.",e.aiAutoTag,a=>this.edit({aiAutoTag:a}),!e.aiEnabled)}

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
                    @input=${a=>this.edit({aiMinScore:Number(a.target.value)})}
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
                    @change=${a=>this.edit({aiMaxTags:Number(a.target.value)})}
                  />
                </div>
              </div>

              ${s?t`
                    ${this.readOnlyField("Active tagger","Chosen at startup.",s.aiTagger)}
                    ${this.readOnlyField("Inference device","OPPAI_AI_DEVICE — needs a restart to change.",s.aiDevice)}
                    ${this.readOnlyField("Model directory","OPPAI_AI_MODEL_DIR — needs a restart to change.",s.aiModelDir)}
                  `:d}
            `:t`<div class="field-help">Loading…</div>`}
      </section>
    `}renderScraping(){const e=this.settings;return t`
      <section class="card">
        <h3><span class="material-symbols-rounded">travel_explore</span>Import &amp; scraping</h3>
        <p class="card-sub">How OppaiLib behaves toward the sites you import from.</p>

        ${e?t`
              ${this.switchField("Respect robots.txt","Skip URLs a site asks crawlers not to fetch.",e.scrapeRespectRobots,s=>this.edit({scrapeRespectRobots:s}))}

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
                    @change=${s=>this.edit({scrapeDelayMs:Number(s.target.value)})}
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
                    @change=${s=>this.edit({scrapeUserAgent:s.target.value})}
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
                    @change=${s=>this.edit({civitaiApiUrl:s.target.value})} />
                </div>
                <div class="field-control">
                  <input type="password" autocomplete="new-password"
                    placeholder=${e.civitaiKeySet?"•••••••• (unchanged)":"Civitai API key (optional)"}
                    ?disabled=${!this.canEdit}
                    @change=${s=>this.edit({civitaiApiKey:s.target.value})} />
                </div>
                ${e.civitaiKeySet?t`<div class="field-control">
                  <button type="button" class="btn-inline" ?disabled=${!this.canEdit}
                    @click=${()=>this.edit({civitaiApiKey:"",civitaiKeySet:!1})}>Clear saved key</button>
                </div>`:d}
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
                    @change=${s=>this.edit({rule34UserId:s.target.value})} />
                </div>
                <div class="field-control">
                  <input type="password" autocomplete="new-password"
                    placeholder=${e.rule34ApiKeySet?"•••••••• (unchanged)":"Rule34 API key"}
                    ?disabled=${!this.canEdit}
                    @change=${s=>this.edit({rule34ApiKey:s.target.value})} />
                </div>
                ${e.rule34ApiKeySet?t`<div class="field-control">
                  <button type="button" class="btn-inline" ?disabled=${!this.canEdit}
                    @click=${()=>this.edit({rule34ApiKey:"",rule34ApiKeySet:!1})}>Clear saved key</button>
                </div>`:d}
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
                    @change=${s=>this.edit({f95Username:s.target.value})}
                  />
                </div>
                <div class="field-control">
                  <input
                    type="password"
                    autocomplete="new-password"
                    placeholder=${e.f95PasswordSet?"•••••••• (unchanged)":"F95 password"}
                    ?disabled=${!this.canEdit}
                    @change=${s=>this.edit({f95Password:s.target.value})}
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
                    @change=${s=>this.edit({imageGenUrl:s.target.value})}
                  />
                </div>
              </div>

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
                    @change=${s=>this.edit({chatUrl:s.target.value})}
                  />
                </div>
                <div class="field-control">
                  <input
                    type="text"
                    autocomplete="off"
                    placeholder="Optional fallback model name"
                    .value=${e.chatModel}
                    ?disabled=${!this.canEdit}
                    @change=${s=>this.edit({chatModel:s.target.value})}
                  />
                </div>
                <div class="field-control">
                  <input
                    type="password"
                    autocomplete="new-password"
                    placeholder=${e.chatApiKeySet?"API key saved — enter to replace":"API key (optional)"}
                    .value=${e.chatApiKey}
                    ?disabled=${!this.canEdit}
                    @change=${s=>this.edit({chatApiKey:s.target.value})}
                  />
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
                    @change=${s=>this.edit({chatModelDir:s.target.value})}
                  />
                </div>
              </div>
            `:t`<div class="field-help">Loading…</div>`}
      </section>
    `}renderLibrary(){const e=this.stats;if(!e)return d;const s=new Map(e.kinds.map(a=>[a.kind,a]));return t`
      <section class="card">
        <h3><span class="material-symbols-rounded">inventory_2</span>Library</h3>
        <p class="card-sub">
          ${e.items} ${e.items===1?"item":"items"} · ${u(e.bytes)} stored ·
          ${e.tags} ${e.tags===1?"tag":"tags"}
        </p>
        <div class="stat-grid">
          ${Object.keys(g).map(a=>{const o=s.get(a);return t`<div class="stat">
              <div class="stat-num">${(o==null?void 0:o.count)??0}</div>
              <div class="stat-label">${g[a].label} · ${u((o==null?void 0:o.bytes)??0)}</div>
            </div>`})}
        </div>
      </section>
    `}renderPasskeys(){const e=this.passkeyList;return t`
      <section class="card">
        <h3><span class="material-symbols-rounded">passkey</span>Passkeys</h3>
        <p class="card-sub">
          Sign in with your device's fingerprint, face or PIN instead of typing a password.
          Nothing guessable crosses the network and the server only ever stores a public
          key — your device keeps the private half.
        </p>

        ${this.passkeyError?t`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.passkeyError}
            </div>`:d}
        ${this.passkeyMsg?t`<div class="banner ok">
              <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span>${this.passkeyMsg}
            </div>`:d}

        ${e&&!e.available?t`<div class="banner info">
              <span class="material-symbols-rounded" style="font-size:18px;">lock</span>
              ${e.reason}
            </div>`:d}

        ${e===null?t`<p class="field-help">Checking…</p>`:e.passkeys.length===0?t`<p class="field-help">
                No passkeys yet. Your password keeps working either way — it's also how you
                get back in if you lose a device.
              </p>`:t`
                <div class="pk-list">
                  ${e.passkeys.map(s=>this.renderPasskeyRow(s))}
                </div>
              `}

        ${e!=null&&e.available?t`
              <div class="pk-add">
                <input
                  type="text"
                  placeholder="Name this device — e.g. “Work laptop”"
                  .value=${this.passkeyName}
                  ?disabled=${this.passkeyBusy}
                  @input=${s=>this.passkeyName=s.target.value}
                />
                <button class="btn-primary" ?disabled=${this.passkeyBusy} @click=${this.addPasskey}>
                  <span class="material-symbols-rounded" style="font-size:20px;">add</span>
                  ${this.passkeyBusy?"Waiting for your device…":"Add a passkey"}
                </button>
              </div>
            `:d}

        ${e!=null&&e.relyingPartyId?t`<p class="field-help">
              Passkeys added here are tied to <code>${e.relyingPartyId}</code>. That's how
              WebAuthn works — reach OppaiLib at a different address and your device won't
              offer them, so add one per address you actually use.
            </p>`:d}
      </section>
    `}renderPasskeyRow(e){const s=this.passkeyRenaming===e.id,a=this.passkeyRevoking===e.id;return t`
      <div class="pk-row">
        <span class="material-symbols-rounded pk-icon">${e.synced?"cloud_sync":"key"}</span>
        <div class="pk-body">
          ${s?t`<div class="pk-rename">
                <input
                  type="text"
                  .value=${this.passkeyName}
                  @input=${o=>this.passkeyName=o.target.value}
                />
                <button @click=${()=>void this.savePasskeyName(e)}>Save</button>
                <button @click=${()=>this.passkeyRenaming=null}>Cancel</button>
              </div>`:t`<div class="pk-name">${e.name}</div>`}
          <div class="pk-meta">
            ${e.synced?"Synced to your account":"This device only"}
            · added ${y(e.createdAt)}
            · ${e.lastUsedAt?`last used ${y(e.lastUsedAt)}`:"never used"}
          </div>
          ${a?t`<div class="pk-revoke">
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
              </div>`:d}
        </div>
        ${s||a?d:t`<div class="pk-actions">
              <button title="Rename" @click=${()=>this.startRename(e)}>
                <span class="material-symbols-rounded" style="font-size:18px;">edit</span>
              </button>
              <button title="Remove" @click=${()=>this.startRevoke(e)}>
                <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
              </button>
            </div>`}
      </div>
    `}async loadPasskeys(){try{this.passkeyList=await c.passkeys()}catch(e){this.passkeyError=e.message}}startRename(e){this.passkeyRenaming=e.id,this.passkeyRevoking=null,this.passkeyName=e.name}async savePasskeyName(e){const s=this.passkeyName.trim();if(s)try{await c.renamePasskey(e.id,s),this.passkeyRenaming=null,this.passkeyName="",await this.loadPasskeys()}catch(a){this.passkeyError=a.message}}startRevoke(e){this.passkeyRevoking=e.id,this.passkeyRenaming=null,this.passkeyPassword="",this.passkeyError=""}async revokePasskey(e){this.passkeyBusy=!0,this.passkeyError="";try{await c.revokePasskey(e.id,this.passkeyPassword),this.passkeyRevoking=null,this.passkeyPassword="",this.passkeyMsg=`Removed “${e.name}”.`,await this.loadPasskeys()}catch(s){this.passkeyError=s.message}finally{this.passkeyBusy=!1}}renderAccount(){var e,s;return t`
      ${this.renderPasskeys()}
      <section class="card">
        <h3><span class="material-symbols-rounded">account_circle</span>Account</h3>
        <p class="card-sub">
          Signed in as <strong>${(e=this.user)==null?void 0:e.username}</strong>${(s=this.user)!=null&&s.isAdmin?" (admin)":""}.
        </p>

        ${this.pwErr?t`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.pwErr}
            </div>`:d}
        ${this.pwMsg?t`<div class="banner ok">
              <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span>${this.pwMsg}
            </div>`:d}

        <div class="pw">
          <input
            type="password"
            placeholder="Current password"
            autocomplete="current-password"
            .value=${this.pwCurrent}
            @input=${a=>this.pwCurrent=a.target.value}
          />
          <input
            type="password"
            placeholder="New password (8+ characters)"
            autocomplete="new-password"
            .value=${this.pwNew}
            @input=${a=>this.pwNew=a.target.value}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            autocomplete="new-password"
            .value=${this.pwConfirm}
            @input=${a=>this.pwConfirm=a.target.value}
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
    `}renderStorage(){var s;const e=this.storage;return t`
      <section class="card">
        <h3><span class="material-symbols-rounded">hard_drive</span>Storage</h3>
        <p class="card-sub">
          Where OppaiLib keeps things, and how much room is left. Nothing here lives
          inside the container image unless you left a mapping unset — which is what
          the warnings are for.
        </p>

        ${this.storageErr?t`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.storageErr}
            </div>`:d}

        ${((e==null?void 0:e.warnings)??[]).map(a=>t`<div class="banner error">
          <span class="material-symbols-rounded" style="font-size:18px;">warning</span>${a}
        </div>`)}

        <div class="diag-actions">
          <button class="btn-primary" ?disabled=${this.storageBusy} @click=${this.loadStorage}>
            <span class="material-symbols-rounded" style="font-size:20px;">refresh</span>
            ${this.storageBusy?"Reading…":"Refresh"}
          </button>
          ${(s=this.user)!=null&&s.isAdmin?t`<button ?disabled=${this.storageBusy} @click=${this.runCleanup}>
                <span class="material-symbols-rounded" style="font-size:20px;">mop</span>
                Reclaim space
              </button>`:d}
          <span class="field-help grow">
            Reclaiming removes only what can be recreated: chunks of uploads nobody
            came back to finish, and scratch files from jobs that have ended. It never
            touches your media, Libby's memories or model files.
          </span>
        </div>

        ${e?t`
              ${e.pendingBytes>0?t`<p class="field-help">
                    Uploads in progress still need about ${u(e.pendingBytes)}.
                  </p>`:d}
              ${e.mappings.map(a=>this.renderMapping(a))}
              <h4 style="margin:18px 0 6px;">Reclaimable now</h4>
              ${e.reclaimable.map(a=>t`<p class="field-help">
                ${a.label}: <strong>${u(a.bytes)}</strong>${a.note?t` — ${a.note}`:d}
              </p>`)}
            `:t`<p class="field-help">${this.storageBusy?"Reading…":"No reading yet."}</p>`}
      </section>
    `}renderMapping(e){const s=e.totalBytes>0?Math.round(e.usedBytes/e.totalBytes*100):0;return t`
      <div class="setting-row" style="display:block;">
        <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
          <strong>${e.label}</strong>
          <code style="font-size:12px; opacity:.8;">${e.path}</code>
          ${e.exists?d:t`<span class="field-help" style="color:var(--oppai-error);">not mapped</span>`}
          ${e.exists&&!e.writable?t`<span class="field-help" style="color:var(--oppai-error);">read-only</span>`:d}
        </div>
        <div style="height:6px; border-radius:999px; background:var(--oppai-surface-2); overflow:hidden; margin:6px 0;">
          <span style="display:block; height:100%; width:${s}%; background:${s>=90?"var(--oppai-error)":"var(--oppai-primary)"};"></span>
        </div>
        <p class="field-help">
          ${e.error?e.error:t`${u(e.freeBytes)} free of ${u(e.totalBytes)} (${s}% used)`}
          ${(e.contents??[]).map(a=>t` · ${a.label}: ${u(a.bytes)}${a.count?t` (${a.count})`:d}`)}
        </p>
        <p class="field-help">${e.purpose} Set with <code>${e.env}</code>.</p>
      </div>
    `}renderDiagnostics(){const e=this.diag,s=this.uiDiag;return t`
      <section class="card">
        <h3><span class="material-symbols-rounded">speed</span>Performance</h3>
        <p class="card-sub">
          Counters and latencies since the server started, or since you last reset them.
          Nothing here is sent anywhere — it's read straight off this box.
        </p>

        ${this.diagErr?t`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.diagErr}
            </div>`:d}

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

        ${e?t`
              ${e.dbWal?d:t`<div class="banner error">
                    <span class="material-symbols-rounded" style="font-size:18px;">warning</span>
                    The database isn't in WAL mode, so every query runs one at a time.
                    This is usually because it lives on a network share — move it to a
                    local disk and restart.
                  </div>`}

              <div class="stat-grid">
                ${this.diagStat("Uptime",q(e.uptimeSeconds))}
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
              ${e.metrics.timings.length===0?t`<p class="field-help">Nothing measured in this window yet.</p>`:t`
                    <div class="diag-scroll">
                      <table class="diag-table">
                        <thead>
                          <tr>
                            <th>What</th><th>Calls</th><th>Avg</th><th>p95</th><th>Worst</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${e.metrics.timings.slice(0,25).map(a=>t`<tr>
                              <td class="diag-name">${a.name}</td>
                              <td>${a.count}</td>
                              <td>${a.avgMs} ms</td>
                              <td>${a.p95Ms} ms</td>
                              <td class=${a.maxMs>=3e3?"diag-bad":""}>${a.maxMs} ms</td>
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
              ${s?t`
                    <div class="stat-grid">
                      ${this.diagStat("UI updates",String(s.updates))}
                      ${this.diagStat("Slow updates",String(s.slowUpdates))}
                      ${this.diagStat("Long tasks",`${s.longTasks} · ${Math.round(s.longTaskMs)} ms`)}
                      ${this.diagStat("Layout shift",`${s.layoutShifts} · ${s.layoutShiftScore}`)}
                    </div>
                    ${s.timings.length===0?t`<p class="field-help">No profiled component has updated in this window yet.</p>`:t`
                          <div class="diag-scroll">
                            <table class="diag-table">
                              <thead>
                                <tr><th>Component</th><th>Updates</th><th>Avg</th><th>p95</th><th>Slow</th><th>Worst</th></tr>
                              </thead>
                              <tbody>
                                ${s.timings.map(a=>t`<tr>
                                  <td class="diag-name">${a.name}</td>
                                  <td>${a.count}</td>
                                  <td>${a.avgMs} ms</td>
                                  <td>${a.p95Ms} ms</td>
                                  <td class=${a.slow?"diag-bad":""}>${a.slow}</td>
                                  <td class=${a.maxMs>16?"diag-bad":""}>${a.maxMs} ms</td>
                                </tr>`)}
                              </tbody>
                            </table>
                          </div>
                        `}
                  `:t`<p class="field-help">Refresh to read browser timings.</p>`}
            `:t`<p class="field-help">${this.diagBusy?"Reading…":"No snapshot yet."}</p>`}
      </section>
    `}renderFetchHealth(e){const s=e.metrics.counters,a=[["Fetches completed",s["scrape.fetch.ok"]??0,"Pages and listings fetched successfully."],["Retried",s["scrape.fetch.retry"]??0,"A site failed transiently and we tried again."],["Gave up",s["scrape.fetch.exhausted"]??0,"Still failing after every retry."],["Queued behind another request",s["scrape.host_queued"]??0,"A steady number here means we're fanning out wider than the site allows."],["Asked to back off",s["scrape.fetch.backoff_too_long"]??0,"A site asked for a longer wait than we'll hold a click open for."]];return a.every(([,o])=>o===0)?d:t`
      <h4 class="diag-head">Outbound fetches</h4>
      ${a.map(([o,i,h])=>i===0?d:t`<div class="diag-row"><strong>${i}</strong> ${o} <span class="field-help">— ${h}</span></div>`)}
    `}diagStat(e,s){return t`<div class="stat">
      <div class="stat-num diag-stat-num">${s}</div>
      <div class="stat-label">${e}</div>
    </div>`}renderAbout(){const e=this.info;return e?t`
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
    `:d}switchField(e,s,a,o,i=!1){const h=!this.canEdit||i;return t`
      <div class="field">
        <div class="field-text">
          <div class="field-label">${e}</div>
          <div class="field-help">${s}</div>
        </div>
        <div class="field-control">
          <button
            class="switch ${a?"on":""}"
            role="switch"
            aria-checked=${a?"true":"false"}
            aria-label=${e}
            ?disabled=${h}
            @click=${()=>o(!a)}
          ></button>
        </div>
      </div>
    `}readOnlyField(e,s,a){return t`
      <div class="field">
        <div class="field-text">
          <div class="field-label">${e}</div>
          <div class="field-help">${s}</div>
        </div>
        <div class="field-control"><span class="ro">${a}</span></div>
      </div>
    `}};n.styles=[D,O,_`
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
    `];l([U({attribute:!1})],n.prototype,"user",2);l([p()],n.prototype,"tab",2);l([p()],n.prototype,"settings",2);l([p()],n.prototype,"info",2);l([p()],n.prototype,"stats",2);l([p()],n.prototype,"apk",2);l([p()],n.prototype,"loadError",2);l([p()],n.prototype,"passkeyList",2);l([p()],n.prototype,"passkeyBusy",2);l([p()],n.prototype,"passkeyError",2);l([p()],n.prototype,"passkeyMsg",2);l([p()],n.prototype,"passkeyName",2);l([p()],n.prototype,"passkeyRenaming",2);l([p()],n.prototype,"passkeyRevoking",2);l([p()],n.prototype,"passkeyPassword",2);l([p()],n.prototype,"diag",2);l([p()],n.prototype,"uiDiag",2);l([p()],n.prototype,"storage",2);l([p()],n.prototype,"storageBusy",2);l([p()],n.prototype,"storageErr",2);l([p()],n.prototype,"diagBusy",2);l([p()],n.prototype,"diagErr",2);l([p()],n.prototype,"dirty",2);l([p()],n.prototype,"saving",2);l([p()],n.prototype,"saved",2);l([p()],n.prototype,"theme",2);l([p()],n.prototype,"fit",2);l([p()],n.prototype,"hideLibby",2);l([p()],n.prototype,"genModels",2);l([p()],n.prototype,"genLoras",2);l([p()],n.prototype,"genBoards",2);l([p()],n.prototype,"genError",2);l([p()],n.prototype,"pwCurrent",2);l([p()],n.prototype,"pwNew",2);l([p()],n.prototype,"pwConfirm",2);l([p()],n.prototype,"pwBusy",2);l([p()],n.prototype,"pwMsg",2);l([p()],n.prototype,"pwErr",2);l([p()],n.prototype,"tts",2);l([p()],n.prototype,"ttsErrors",2);n=l([F("oppai-settings")],n);function y(e){if(!e)return"never";const s=Math.max(0,(Date.now()-e)/1e3);if(s<90)return"just now";const a=Math.round(s/60);if(a<60)return`${a} min ago`;const o=Math.round(a/60);if(o<24)return`${o}h ago`;const i=Math.round(o/24);return i<=30?`${i} day${i===1?"":"s"} ago`:new Date(e).toLocaleDateString()}function q(e){const s=Math.max(0,Math.floor(e)),a=Math.floor(s/86400),o=Math.floor(s%86400/3600),i=Math.floor(s%3600/60);return a>0?`${a}d ${o}h`:o>0?`${o}h ${i}m`:i>0?`${i}m ${s%60}s`:`${s}s`}function u(e){if(!e)return"0 B";const s=["B","KB","MB","GB","TB"];let a=e,o=0;for(;a>=1024&&o<s.length-1;)a/=1024,o++;return`${a<10&&o>0?a.toFixed(1):Math.round(a)} ${s[o]}`}export{n as OppaiSettings};
