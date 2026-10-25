import{z as M,q as R,i as B,u as d,a as I,e as h,m as g,A as l,b as i,t as N,an as U,ao as G,ap as F,aq as A,ar as K,x as W,as as V,at as H,au as j,av as q,aw as Y,ax as J,ay as Q,az as X,aA as Z,aB as C,v as z}from"./index-L68MogQH.js";import{r as ee,p as se}from"./passkeys-C74U8nTa.js";import{l as te,a as ie,s as k,b as S,D as ae,d as oe}from"./launchy-xyl1VS8H.js";const re=160,ne=220;function le(e){var u;const s=e.trim();if(s.length<=re)return s?[s]:[];const t=((u=s.match(/[^.!?…\n]+(?:[.!?…]+["”')]*|\n|$)/g))==null?void 0:u.map(y=>y.trim()).filter(Boolean))??[s],[o,...r]=t,a=[o];let n="";for(const y of r)n&&n.length+y.length+1>ne&&(a.push(n),n=""),n=n?`${n} ${y}`:y;return n&&a.push(n),a}const O="oppai_libby_speak";function Ae(){try{return localStorage.getItem(O)==="1"}catch{return!1}}function Ce(e){try{localStorage.setItem(O,e?"1":"0")}catch{}e||_(),window.dispatchEvent(new CustomEvent("oppai-libby-speak",{detail:{on:e}}))}let $=null,P=0;async function D(e=!1){if(!e&&$&&Date.now()-P<6e4)return $;try{const s=await fetch("/api/tts/status",{credentials:"same-origin"});if(!s.ok)throw new Error(String(s.status));$=await s.json(),P=Date.now()}catch{$=null}return $}const x=[];let m=null,L=!1,w=0,E=Promise.resolve();function de(e,s=0){const t=le(e);if(!t.length)return Promise.resolve();const o=w,r=t.map(a=>new Promise(n=>{const u=E.then(()=>o===w?he(a,s):null);E=u.catch(()=>null),x.push({text:a,heat:s,audio:u,done:n})}));return ce(),Promise.all(r).then(()=>{})}function _(){var e;w++,E=Promise.resolve();for(const s of x.splice(0))s.done();m&&(m.pause(),m.src="",m=null);try{(e=window.speechSynthesis)==null||e.cancel()}catch{}}async function ce(){if(!L){L=!0;try{for(;x.length;){const e=x.shift(),s=w;try{await pe(e,s)}catch{}finally{e.done()}}}finally{L=!1}}}async function pe(e,s){const t=await e.audio.catch(()=>null);if(s===w){if(t){await ue(t,s);return}await ve(e.text,s)}}async function he(e,s){const t=await D();if(t&&!t.engine)return null;try{const o=await fetch("/api/tts/speak",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:e,heat:s||void 0})});return o.status===503?($=null,null):o.ok?await o.blob():null}catch{return null}}function ue(e,s){return new Promise(t=>{const o=URL.createObjectURL(e),r=new Audio(o);m=r;const a=()=>{m===r&&(m=null),URL.revokeObjectURL(o),t()};r.addEventListener("ended",a,{once:!0}),r.addEventListener("error",a,{once:!0}),r.play().catch(()=>{a()}),s!==w&&a()})}function ve(e,s){const t=window.speechSynthesis;return!t||typeof SpeechSynthesisUtterance>"u"?Promise.resolve():new Promise(o=>{const r=new SpeechSynthesisUtterance(e),a=ge(t.getVoices());if(a&&(r.voice=a),r.rate=1.02,r.pitch=1.05,r.onend=()=>o(),r.onerror=()=>o(),s!==w){o();return}t.speak(r)})}function ge(e){const s=e.filter(r=>/^en/i.test(r.lang)),t=s.length?s:e,o=r=>{let a=0;const n=r.name.toLowerCase();return/natural|neural|premium|enhanced/.test(n)&&(a+=4),/female|woman|aria|jenny|samantha|zira|karen|moira|tessa|fiona|libby|sonia|ava|allison|susan|emma/.test(n)&&(a+=3),/google/.test(n)&&(a+=1),r.default&&(a+=1),a};return[...t].sort((r,a)=>o(a)-o(r))[0]}var be=Object.defineProperty,fe=Object.getOwnPropertyDescriptor,f=(e,s,t,o)=>{for(var r=o>1?void 0:o?fe(s,t):s,a=e.length-1,n;a>=0;a--)(n=e[a])&&(r=(o?n(s,t,r):n(r))||r);return o&&r&&be(s,t,r),r};const ye={itch:"itch.io",f95:"F95zone"},me=4e3;let v=class extends I{constructor(){super(...arguments),this.status=null,this.keys=null,this.loadError="",this.link="",this.linkExpires=0,this.linking=!1,this.busy={},this.timer=null,this.linkIssuedAt=0}connectedCallback(){super.connectedCallback(),this.refresh(),this.loadKeys(),this.timer=window.setInterval(()=>void this.refresh(),me)}disconnectedCallback(){super.disconnectedCallback(),this.timer!=null&&clearInterval(this.timer),this.timer=null}async refresh(){try{this.status=await h.launchyStatus(),this.loadError=""}catch(e){this.loadError=e.message}if(this.link)if(Date.now()/1e3>this.linkExpires)this.link="";else{await this.loadKeys();const e=(this.keys??[]).find(s=>s.createdAt>=this.linkIssuedAt);e&&(this.link="",g(`Launchy on ${e.name} is linked.`))}}async loadKeys(){try{this.keys=(await h.launchyKeys()).items}catch(e){this.loadError=e.message}}async makeLink(){this.linking=!0;try{const{code:e,expiresAt:s}=await h.launchyPairing();this.linkIssuedAt=Math.floor(Date.now()/1e3)-5,this.link=te(location.origin,e),this.linkExpires=s,window.location.assign(this.link)}catch(e){g(e.message,"error")}finally{this.linking=!1}}async copyLink(e){var t;const s=(t=e.currentTarget.parentElement)==null?void 0:t.querySelector("input");try{await navigator.clipboard.writeText(this.link),g("Copied the link.")}catch{s==null||s.select(),g("Press Ctrl+C to copy the selected link.")}}async revoke(e){if(confirm(`Unlink Launchy on ${e.name}? It stops syncing until it is linked again.`))try{await h.revokeLaunchyKey(e.id),await this.loadKeys()}catch(s){g(s.message,"error")}}async run(e,s,t){this.busy={...this.busy,[e]:!0};try{const o=await h.launchyRequest(s),r=await ie(h.launchyRequestStatus,o.id,{timeout:s.action==="sync"?18e4:6e4});r.status==="done"?g(r.message||t):g(r.error||"Launchy could not do that.","error")}catch(o){g(o.message,"error")}finally{this.busy={...this.busy,[e]:!1},this.refresh()}}render(){return i`
      ${this.loadError?i`<div class="banner error"><span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.loadError}</div>`:l}
      ${this.renderLink()}
      ${this.renderPC()}
      ${this.renderRunning()}
      ${this.renderDownloads()}
    `}renderLink(){const e=this.keys??[];return i`
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
        ${this.link?i`<div class="linkbox">
              <input readonly .value=${this.link} @focus=${s=>s.target.select()} />
              <a class="btn-inline" href=${this.link}><span class="material-symbols-rounded">open_in_new</span>Open Launchy</a>
              <button class="btn-inline" @click=${s=>void this.copyLink(s)}>
                <span class="material-symbols-rounded">content_copy</span>Copy
              </button>
              <div class="help" style="flex-basis:100%;">
                Nothing happened? Launchy 0.5 or newer registers the link when it is installed — or paste it
                into Launchy under Settings → OppaiLib.
              </div>
            </div>`:l}
        ${e.map(s=>i`<div class="row">
            <span class="material-symbols-rounded" style="font-size:18px; color:var(--oppai-text-muted);">key</span>
            <div class="grow">
              <div class="label">${s.name}</div>
              <div class="help">
                Key …${s.hint} · linked ${new Date(s.createdAt*1e3).toLocaleDateString()} ·
                ${s.lastUsedAt?`last used ${k(s.lastUsedAt)}`:"not used yet"}
              </div>
            </div>
            <button class="btn-inline" @click=${()=>void this.revoke(s)}>
              <span class="material-symbols-rounded">link_off</span>Unlink
            </button>
          </div>`)}
      </section>
    `}renderPC(){var t,o,r,a;const e=this.status;if(!e)return l;const s=!!e.reportedAt;return i`
      <section class="card">
        <h3><span class="material-symbols-rounded">sports_esports</span>The PC</h3>
        <div class="row">
          <span class="dot ${e.connected?"on":""}"></span>
          <div class="grow">
            <div class="label">${e.connected?`Launchy is running on ${e.name||"the PC"}`:"Launchy is offline"}</div>
            <div class="help">
              ${e.version?`Version ${e.version} · `:""}last checked in ${k(e.lastSeen)}
              ${e.connected&&!s?i` · <span class="warn">an older Launchy — update it to control it from here</span>`:l}
            </div>
          </div>
          ${S(e,"sync")?i`<button class="btn-inline" ?disabled=${this.busy.sync||((t=e.sync)==null?void 0:t.running)}
                @click=${()=>void this.run("sync",{action:"sync"},"Synced.")}>
                <span class="material-symbols-rounded">sync</span>${this.busy.sync||(o=e.sync)!=null&&o.running?"Syncing…":"Sync now"}
              </button>`:l}
        </div>
        ${(r=e.sync)!=null&&r.lastSync||(a=e.sync)!=null&&a.lastError?i`<div class="row"><div class="grow">
              <div class="label">Library sync</div>
              <div class="help">
                ${e.sync.lastSync?`Last synced ${k(e.sync.lastSync)}`:"Not synced yet"}
                ${e.sync.lastError?i` · <span class="warn">${e.sync.lastError}</span>`:l}
              </div>
            </div></div>`:l}
        ${(e.accounts??[]).map(n=>i`<div class="row">
            <span class="dot ${n.challenged?"warn":n.signedIn?"on":""}"></span>
            <div class="grow">
              <div class="label">${ye[n.site]??n.site}</div>
              <div class="help">
                ${n.challenged?i`<span class="warn">Wants a person to prove they are one — press Verify next to it in Launchy on the PC.</span>`:n.signedIn?`Signed in${n.user?` as ${n.user}`:""} in Launchy`:"Not signed in in Launchy — sign in there, under Settings → Accounts"}
              </div>
            </div>
          </div>`)}
      </section>
    `}renderRunning(){const e=this.status;if(!(e!=null&&e.connected)||!e.reportedAt)return l;const s=e.sessions??[];return i`
      <section class="card">
        <h3><span class="material-symbols-rounded">play_arrow</span>Running</h3>
        ${s.length===0?i`<div class="empty">Nothing is running on the PC.</div>`:l}
        ${s.map(t=>{const o=`stop:${t.gameId}`;return i`<div class="row">
            <div class="grow">
              <div class="label">${t.title||"A game"}</div>
              <div class="help">Started ${k(t.startedAt)}</div>
            </div>
            ${S(e,"stop")?i`<button class="btn-inline" ?disabled=${this.busy[o]}
                  @click=${()=>{confirm(`Close ${t.title||"this game"} on the PC? Anything unsaved in it is lost.`)&&this.run(o,{action:"stop",gameId:t.gameId},"Closed.")}}>
                  <span class="material-symbols-rounded">stop_circle</span>${this.busy[o]?"Closing…":"Close"}
                </button>`:l}
          </div>`})}
      </section>
    `}renderDownloads(){const e=this.status;if(!(e!=null&&e.connected)||!e.reportedAt)return l;const s=e.downloads??[];return s.length?i`
      <section class="card">
        <h3><span class="material-symbols-rounded">download</span>Downloads on the PC</h3>
        ${s.map(t=>{const o=`cancel:${t.id}`;return i`<div class="row">
            <div class="grow">
              <div class="label">${t.title}${t.label?i` <span class="help">· ${t.label}</span>`:l}</div>
              <div class="help">
                ${ae[t.status]??t.status}${t.message?` — ${t.message}`:""}
              </div>
            </div>
            ${oe(t)&&S(e,"download")?i`<button class="btn-inline" ?disabled=${this.busy[o]}
                  @click=${()=>void this.run(o,{action:"cancel-download",downloadId:t.id},"Cancelled.")}>
                  <span class="material-symbols-rounded">close</span>Cancel
                </button>`:l}
          </div>`})}
      </section>
    `:l}};v.styles=[M,R,B`
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
    `];f([d()],v.prototype,"status",2);f([d()],v.prototype,"keys",2);f([d()],v.prototype,"loadError",2);f([d()],v.prototype,"link",2);f([d()],v.prototype,"linkExpires",2);f([d()],v.prototype,"linking",2);f([d()],v.prototype,"busy",2);v=f([N("oppai-launchy-panel")],v);var we=Object.defineProperty,$e=Object.getOwnPropertyDescriptor,p=(e,s,t,o)=>{for(var r=o>1?void 0:o?$e(s,t):s,a=e.length-1,n;a>=0;a--)(n=e[a])&&(r=(o?n(s,t,r):n(r))||r);return o&&r&&we(s,t,r),r};const ke=[{id:"appearance",label:"Appearance",icon:"palette",group:"You"},{id:"account",label:"Account",icon:"account_circle",group:"You"},{id:"library",label:"Library",icon:"inventory_2",group:"Library"},{id:"scraping",label:"Import & scraping",icon:"travel_explore",group:"Library",server:!0},{id:"ai",label:"Tagging & descriptions",icon:"smart_toy",group:"AI",server:!0},{id:"imagegen",label:"Image generation",icon:"auto_awesome",group:"AI",server:!0},{id:"android",label:"Android app",icon:"android",group:"Apps"},{id:"launchy",label:"Launchy",icon:"sports_esports",group:"Apps"},{id:"storage",label:"Storage",icon:"hard_drive",group:"Server"},{id:"privacy",label:"Privacy",icon:"visibility_off",group:"Server",server:!0,adminOnly:!0},{id:"diagnostics",label:"Diagnostics",icon:"speed",group:"Server",adminOnly:!0},{id:"about",label:"About",icon:"info",group:"Server"}];let c=class extends I{constructor(){super(...arguments),this.only="",this.tab="appearance",this.settings=null,this.info=null,this.stats=null,this.apk=null,this.loadError="",this.passkeyList=null,this.passkeyBusy=!1,this.passkeyError="",this.passkeyMsg="",this.passkeyName="",this.passkeyRenaming=null,this.passkeyRevoking=null,this.passkeyPassword="",this.diag=null,this.uiDiag=null,this.storage=null,this.storageBusy=!1,this.storageErr="",this.diagBusy=!1,this.diagErr="",this.dirty=!1,this.saving=!1,this.saved=!1,this.theme=U(),this.fit=G(),this.hideLibby=F(),this.genModels=[],this.genLoras=[],this.genLoraTriggers={},this.genBoards=[],this.genError="",this.genStatus=null,this.genChecks=null,this.genCheckBusy=!1,this.genCheckErr="",this.pwCurrent="",this.pwNew="",this.pwConfirm="",this.pwBusy=!1,this.pwMsg="",this.pwErr="",this.refs=null,this.refStamp=Date.now(),this.refNote="",this.tts=void 0,this.describe=null,this.describeBusy=!1,this.describeNote="",this.ttsErrors={},this.addPasskey=async()=>{this.passkeyBusy=!0,this.passkeyError="",this.passkeyMsg="";try{const e=await ee(this.passkeyName.trim());this.passkeyName="",this.passkeyMsg=`Added “${e.name}”. You can sign in with it now.`,await this.loadPasskeys()}catch(e){const s=se(e);s&&(this.passkeyError=s)}finally{this.passkeyBusy=!1}},this.cancelRevoke=()=>{this.passkeyRevoking=null,this.passkeyPassword=""},this.loadStorage=async()=>{this.storageBusy=!0,this.storageErr="";try{this.storage=await h.storage()}catch(e){this.storageErr=e.message}finally{this.storageBusy=!1}},this.runCleanup=async()=>{this.storageBusy=!0,this.storageErr="";try{const e=await h.cleanupStorage(["uploads","temp"]);this.storage=e.storage,g(`Reclaimed ${e.freedHuman}.`,"success")}catch(e){this.storageErr=e.message}finally{this.storageBusy=!1}},this.loadDiagnostics=async()=>{this.diagBusy=!0,this.diagErr="";try{this.diag=await h.diagnostics(),this.uiDiag=A()}catch(e){this.diagErr=e.message}finally{this.diagBusy=!1}},this.resetDiagnostics=async()=>{this.diagBusy=!0,this.diagErr="";try{K(),await h.resetDiagnostics(),this.diag=await h.diagnostics(),this.uiDiag=A()}catch(e){this.diagErr=e.message}finally{this.diagBusy=!1}}}connectedCallback(){super.connectedCallback(),W(this,"settings"),this.load(),this.loadGenLists(),this.loadTTS(),this.loadDescribe(),this.loadReferences()}async loadReferences(){try{this.refs=await h.libbyReferences()}catch{this.refs=null}}async setReference(e,s){var r;const t=(r=s.files)==null?void 0:r[0];if(s.value="",!t)return;const o=await new Promise((a,n)=>{const u=new FileReader;u.onload=()=>a(String(u.result)),u.onerror=()=>n(u.error),u.readAsDataURL(t)});try{await h.setLibbyReference(e,o),this.refNote="",this.refStamp=Date.now(),await this.loadReferences()}catch(a){this.refNote=a.message}}async clearReference(e){try{await h.deleteLibbyReference(e),this.refNote="",await this.loadReferences()}catch(s){this.refNote=s.message}}referenceTile(e,s){var o;const t=!!((o=this.refs)!=null&&o[e]);return i`<div style="display:flex;flex-direction:column;gap:6px;align-items:center;width:132px;">
      <div style="width:132px;height:176px;border-radius:12px;overflow:hidden;display:grid;place-items:center;
        background:var(--md-sys-color-surface-container-highest);color:var(--md-sys-color-on-surface-variant);font-size:12px;text-align:center;">
        ${t?i`<img src=${h.libbyReferenceURL(e,this.refStamp)} alt=${`Libby, ${s.toLowerCase()}`} style="width:100%;height:100%;object-fit:cover;"/>`:i`<span>No picture</span>`}
      </div>
      <strong style="font-size:12px;">${s}</strong>
      <div style="display:flex;gap:6px;">
        <label class="btn-inline">
          ${t?"Replace":"Upload"}
          <input type="file" accept="image/*" hidden ?disabled=${!this.canEdit}
            @change=${r=>void this.setReference(e,r.target)}/>
        </label>
        ${t?i`<button class="btn-inline" ?disabled=${!this.canEdit}
          @click=${()=>void this.clearReference(e)}>Remove</button>`:l}
      </div>
    </div>`}async load(){try{const[e,s]=await Promise.all([h.getSettings(),h.stats()]);this.settings=e.settings,this.info=e.readOnly,this.stats=s}catch(e){this.loadError=e.message}try{this.apk=await h.apkInfo()}catch{this.apk={available:!1}}}get canEdit(){var e;return!!((e=this.user)!=null&&e.isAdmin)}openTab(e){V(()=>{this.tab=e}),e==="diagnostics"&&!this.diag&&!this.diagBusy&&this.loadDiagnostics(),e==="storage"&&!this.storage&&!this.storageBusy&&this.loadStorage(),e==="account"&&!this.passkeyList&&this.loadPasskeys()}editLora(e,s){var o;const t=[...((o=this.settings)==null?void 0:o.libbyGenLoras)??[]];t[e]&&(t[e]={...t[e],...s},this.edit({libbyGenLoras:t}))}editCameraLora(e,s){var r;const t=[...((r=this.settings)==null?void 0:r.libbyCameraLoras)??[]];if(!t[e])return;const o={...t[e],...s};s.name&&!t[e].trigger&&(o.trigger=this.genLoraTriggers[s.name]??""),t[e]=o,this.edit({libbyCameraLoras:t})}edit(e){!this.settings||!this.canEdit||(this.settings={...this.settings,...e},this.dirty=!0,this.saved=!1)}async save(){if(this.settings){this.saving=!0;try{const e=await h.saveSettings(this.settings);this.settings=e.settings,this.info=e.readOnly,this.dirty=!1,this.saved=!0,H(!!e.settings.incognito),this.loadTTS(!0),this.loadDescribe(),this.loadGenLists()}catch(e){this.loadError=e.message}finally{this.saving=!1}}}pickTheme(e){this.theme=e,j(e),q(e)}pickFit(e){this.fit=e,Y(e)}async changePassword(){if(this.pwMsg="",this.pwErr="",this.pwNew!==this.pwConfirm){this.pwErr="The new passwords don't match.";return}if(this.pwNew.length<8){this.pwErr="Use at least 8 characters.";return}this.pwBusy=!0;try{await h.changePassword(this.pwCurrent,this.pwNew),this.pwMsg="Password changed.",this.pwCurrent=this.pwNew=this.pwConfirm=""}catch(e){this.pwErr=e.message}finally{this.pwBusy=!1}}render(){if(this.only)return this.renderOnly(this.only);const e=ke.filter(r=>!r.adminOnly||this.canEdit),s=e.find(r=>r.id===this.tab)??e[0],t=this.dirty||this.saved;let o="";return i`
      <div class="shell">
        <nav class="cat-rail" aria-label="Settings categories">
          ${e.map(r=>{const a=r.group===o?l:i`<div class="cat-head">${r.group}</div>`;return o=r.group,i`${a}
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
          <h2 class="panel-title">${s.label}</h2>
          ${this.loadError?i`<div class="banner error">
                <span class="material-symbols-rounded" style="font-size:18px;">error</span>
                ${this.loadError}
              </div>`:l}
          ${!this.canEdit&&this.settings&&s.server?i`<div class="banner info">
                <span class="material-symbols-rounded" style="font-size:18px;">lock</span>
                Server settings are read-only — only an admin can change them.
              </div>`:l}
          ${this.renderTab()}
          ${t?this.renderSaveBar():l}
        </div>
      </div>
    `}renderOnly(e){const s={"libby-general":()=>this.renderLibby(),"libby-model":()=>this.renderLibbyModel(),"libby-voice":()=>this.renderLibbyVoice(),"libby-pictures":()=>i`${this.renderLibbyImageGen()}${this.renderLibbyReferences()}`}[e];return i`<div class="embedded">
      ${this.loadError?i`<div class="banner error"><span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.loadError}</div>`:l}
      ${!this.canEdit&&this.settings&&e!=="libby-general"?i`<div class="banner info"><span class="material-symbols-rounded" style="font-size:18px;">lock</span>Server settings are read-only — only an admin can change them.</div>`:l}
      ${s()}
      ${this.dirty||this.saved?this.renderSaveBar():l}
    </div>`}renderTab(){switch(this.tab){case"appearance":return this.renderAppearance();case"ai":return this.renderAI();case"scraping":return this.renderScraping();case"imagegen":return this.renderImageGen();case"library":return this.renderLibrary();case"android":return this.renderAndroid();case"launchy":return i`<oppai-launchy-panel></oppai-launchy-panel>`;case"account":return this.renderAccount();case"storage":return this.renderStorage();case"diagnostics":return this.renderDiagnostics();case"privacy":return this.renderPrivacy();default:return this.renderAbout()}}renderSaveBar(){return i`
      <div class="savebar">
        <span class="grow">
          ${this.saved&&!this.dirty?"Settings saved — they're live now.":"You have unsaved changes."}
        </span>
        <button class="btn-primary" ?disabled=${this.saving||!this.dirty} @click=${this.save}>
          <span class="material-symbols-rounded" style="font-size:20px;">save</span>
          ${this.saving?"Saving…":"Save"}
        </button>
      </div>
    `}renderAndroid(){const e=this.apk;return i`
      <section class="card">
        <h3><span class="material-symbols-rounded">android</span>Android app</h3>
        <p class="card-sub">
          Install the companion app straight from this server — no app store, no
          sideloading from a third party.
        </p>

        ${e===null?i`<p class="field-help">Checking…</p>`:e.available?i`
                <div class="field">
                  <div class="field-text">
                    <div class="field-label">oppailib.apk</div>
                    <div class="field-help">
                      ${b(e.size??0)} · built
                      ${new Date((e.modified??0)*1e3).toLocaleDateString()}
                      ${e.sha256?i`<br /><span style="font-family:monospace; font-size:11px;"
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
              `:i`<p class="field-help">
                No APK is bundled with this server build. Drop one at
                <code>/config/oppailib.apk</code>, or grab it from the Actions run that
                built this image.
              </p>`}
      </section>
    `}renderAppearance(){return i`
      <section class="card">
        <h3><span class="material-symbols-rounded">palette</span>Appearance</h3>
        <p class="card-sub">Per-device — applies as soon as you pick it.</p>

        <div class="field">
          <div class="field-text">
            <div class="field-label">Theme</div>
            <div class="field-help">"System" follows your OS light/dark setting.</div>
          </div>
          <div class="field-control seg">
            ${[["dark","Dark","dark_mode"],["light","Light","light_mode"],["system","System","contrast"]].map(([e,s,t])=>i`<button
                class=${this.theme===e?"on":""}
                @click=${()=>this.pickTheme(e)}
              >
                <span class="material-symbols-rounded" style="font-size:18px;">${t}</span>${s}
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
            ${[["page","Fit page","fit_screen"],["width","Fit width","fit_width"]].map(([e,s,t])=>i`<button
                class=${this.fit===e?"on":""}
                @click=${()=>this.pickFit(e)}
              >
                <span class="material-symbols-rounded" style="font-size:18px;">${t}</span>${s}
              </button>`)}
          </div>
        </div>
      </section>
    `}renderPrivacy(){const e=this.settings,s=!!(e!=null&&e.incognito);return i`
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
    `}renderLibby(){return i`
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
              @click=${()=>{this.hideLibby=!this.hideLibby,J(this.hideLibby)}}
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
            ${Q.map(e=>i`<button
              class=${X()===e?"on":""}
              @click=${()=>{Z(e),this.requestUpdate()}}
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
    `}renderLibbyVoice(){const e=this.settings;if(!e)return l;const s=this.tts,t=(s==null?void 0:s.voices)??[],o=t.filter(n=>n.installed),r=t.filter(n=>!n.installed),a=new Set((s==null?void 0:s.downloading)??[]);return i`<section class="card">
      <h3><span class="material-symbols-rounded">record_voice_over</span>Libby’s voice</h3>
      <p class="card-sub">
        ${s===void 0?"Checking the server…":s?s.engine==="kokoro"&&s.ready?i`Speaking with <strong>Kokoro</strong>, the natural voice, on the server’s CPU. Turn playback on per device with the speaker button in Chat.`:s.engine==="piper"&&s.ready?i`Speaking with <strong>piper</strong> on the server’s CPU. Turn playback on per device with the speaker button in Chat.`:s.engine==="openai"&&s.ready?i`Speaking through the speech server at <code>${e.ttsUrl}</code>.`:i`Not speaking from the server${s.detail?i` — ${s.detail}`:l}. Devices fall back to their own voices.`:"The server did not answer about speech."}
      </p>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Engine</div>
          <div class="field-help">Auto uses the most natural voice there is — a speech server when one is set below (falling back to this box if it fails), then Kokoro, then piper. Piper is quicker and flatter; Off leaves devices to their own voices.</div>
        </div>
        <div class="field-control">
          <select ?disabled=${!this.canEdit} @change=${n=>this.edit({ttsEngine:n.target.value})}>
            ${[["auto","Auto"],["kokoro",`Kokoro — natural${s&&!s.kokoroInstalled?" (not installed)":""}`],["piper",`Piper — light${s&&!s.piperInstalled?" (not installed)":""}`],["openai","Speech server"],["off","Off"]].map(([n,u])=>i`<option value=${n} ?selected=${e.ttsEngine===n}>${u}</option>`)}
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
            ${o.map(n=>i`<option value=${n.id} ?selected=${n.id===e.ttsVoice}>${n.label}${n.bundled?" · bundled":""}</option>`)}
            ${e.ttsVoice&&!o.some(n=>n.id===e.ttsVoice)?i`<option value=${e.ttsVoice} selected>${e.ttsVoice} (not installed)</option>`:l}
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
            @input=${n=>this.edit({ttsSpeed:Number(n.target.value)})} />
        </div>
      </div>

      ${s!=null&&s.piperInstalled&&s.engine!=="kokoro"?i`<div class="field stack">
        <div class="field-text">
          <div class="field-label">Piper voices</div>
          <div class="field-help">A curated handful from piper’s voice set, fetched from Hugging Face onto the server (20–110 MB each). Any other piper voice dropped into <code>/config/tts</code> is listed too.</div>
        </div>
        <div class="field-control">
          <ul class="voice-list">
            ${o.map(n=>i`<li><span>${n.label}<small>${n.quality??""}${n.bundled?" · bundled":""}</small></span>
              ${!n.bundled&&this.canEdit?i`<button class="btn" @click=${()=>void this.deleteVoice(n.id)}>Remove</button>`:l}</li>`)}
            ${r.map(n=>i`<li><span>${n.label}<small>${n.quality??""}${n.bytes?` · ${Math.round(n.bytes/1e6)} MB`:""}</small></span>
              ${this.ttsErrors[n.id]?i`<em class="voice-error">${this.ttsErrors[n.id]}</em>`:l}
              ${a.has(n.id)?i`<span class="hint">Downloading…</span>`:this.canEdit?i`<button class="btn" @click=${()=>void this.downloadVoice(n.id)}>Download</button>`:l}</li>`)}
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
    </section>`}async loadTTS(e=!1){var s,t;this.tts=await D(e);try{this.ttsErrors=await h.ttsVoiceErrors()}catch{}(t=(s=this.tts)==null?void 0:s.downloading)!=null&&t.length&&window.setTimeout(()=>void this.loadTTS(!0),4e3)}async loadDescribe(){try{this.describe=await h.describeStatus()}catch{this.describe=null}}async probeVision(){this.describeBusy=!0,this.describeNote="";try{const e=await h.describeProbe();this.describeNote=`The model answered: “${e.description}”`}catch(e){this.describeNote=e.message}finally{this.describeBusy=!1}}async toggleBackfill(){var e;this.describeBusy=!0;try{(e=this.describe)!=null&&e.backfilling?await h.describeBackfillStop():await h.describeBackfill(),await this.loadDescribe()}catch(s){this.describeNote=s.message}finally{this.describeBusy=!1}}async testVoice(){_(),await de("Hi. This is what I sound like. Saved to your library, by the way — nice pick.")}async downloadVoice(e){try{await h.downloadTTSVoice(e),await this.loadTTS(!0)}catch(s){this.loadError=s.message}}async deleteVoice(e){if(confirm(`Remove the ${e} voice from the server?`))try{await h.deleteTTSVoice(e),await this.loadTTS(!0)}catch(s){this.loadError=s.message}}renderLibbyModel(){const e=this.settings;return i`
      <section class="card">
        <h3><span class="material-symbols-rounded">memory</span>Her model</h3>
        <p class="card-sub">The chat backend every character talks through. Saved for the whole server.</p>
        ${e?i`
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
                    @change=${s=>this.edit({chatContextTokens:Number(s.target.value)})}
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
                    @change=${s=>this.edit({chatModelTier:s.target.value})}>
                    ${[["","Auto (from the model name)"],["small","Small — 7B to 13B"],["large","Large — 24B and up"]].map(([s,t])=>i`<option value=${s} ?selected=${e.chatModelTier===s}>${t}</option>`)}
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
                    @change=${s=>this.edit({gpuMemoryGb:Number(s.target.value)})}
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
                    @change=${s=>this.edit({chatVision:s.target.value})}>
                    ${[["","Auto (from the model name)"],["on","On — her model can see"],["off","Off — tags only"]].map(([s,t])=>i`<option value=${s} ?selected=${(e.chatVision??"")===s}>${t}</option>`)}
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
                    @change=${s=>this.edit({gpuShare:s.target.value})}>
                    ${[["","Both loaded"],["swap","Swap for pictures"]].map(([s,t])=>i`<option value=${s} ?selected=${(e.gpuShare??"")===s}>${t}</option>`)}
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
                    @change=${s=>this.edit({chatToolMode:s.target.value})}>
                    ${[["","Auto"],["native","Native tool calls"],["json","JSON answers"]].map(([s,t])=>i`<option value=${s} ?selected=${(e.chatToolMode??"")===s}>${t}</option>`)}
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
                    @change=${s=>this.edit({chatModelDir:s.target.value})}
                  />
                </div>
              </div>
            `:i`<div class="field-help">Loading…</div>`}
      </section>
    `}renderLibbyReferences(){return i`
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
                  ${this.refNote?i`<div class="field-help" style="color:var(--md-sys-color-error);">${this.refNote}</div>`:l}
                </div>
                <div class="field-control" style="display:flex;gap:16px;flex-wrap:wrap;">
                  ${this.referenceTile("clothed","Usual outfit")}
                  ${this.referenceTile("nude","Nothing on")}
                </div>
              </div>
      </section>
    `}renderLibbyImageGen(){const e=this.settings;if(!e)return l;if(!e.imageGenEnabled)return i`<section class="card">
        <h3><span class="material-symbols-rounded">auto_awesome</span>Libby’s image generation</h3>
        <p class="card-sub">
          Set an image generator URL under <strong>Settings → Image generation</strong> and Libby can offer to make
          pictures for you in chat. She always asks first — nothing is generated or saved until
          you press Allow.
        </p>
      </section>`;const s=this.genModels,t=this.genLoras,o=e.libbyGenLoras??[],r=this.genBoards;return i`<section class="card">
      <h3><span class="material-symbols-rounded">auto_awesome</span>Libby’s image generation</h3>
      <p class="card-sub">
        What she uses when she offers to make you a picture. She always asks first — nothing is
        generated or saved until you press Allow.
        ${this.genError?i`<br /><span style="color:var(--oppai-danger,#ff6b6b);">${this.genError}</span>`:l}
      </p>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Model</div>
          <div class="field-help">The checkpoint her pictures are made with. Leave on the
            generator’s default to use whatever it loads.</div>
        </div>
        <div class="field-control">
          ${s.length?i`<select ?disabled=${!this.canEdit}
                @change=${a=>this.edit({libbyGenModel:a.target.value})}>
                <option value="" ?selected=${!e.libbyGenModel}>Generator’s default</option>
                ${s.map(a=>i`<option value=${a} ?selected=${a===e.libbyGenModel}>${a}</option>`)}
              </select>`:i`<input type="text" autocomplete="off" placeholder="Generator’s default"
                .value=${e.libbyGenModel} ?disabled=${!this.canEdit}
                @change=${a=>this.edit({libbyGenModel:a.target.value})} />`}
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
          ${o.map((a,n)=>i`<div style="display:flex; gap:8px; align-items:center;">
            ${t.length?i`<select style="flex:1; min-width:0;" ?disabled=${!this.canEdit}
                  aria-label="LoRA ${n+1}"
                  @change=${u=>this.editLora(n,{name:u.target.value})}>
                  ${(t.includes(a.name)?t:[a.name,...t]).map(u=>i`<option value=${u} ?selected=${u===a.name}>${u}</option>`)}
                </select>`:i`<input type="text" autocomplete="off" placeholder="LoRA name" style="flex:1; min-width:0;"
                  aria-label="LoRA ${n+1}"
                  .value=${a.name} ?disabled=${!this.canEdit}
                  @change=${u=>this.editLora(n,{name:u.target.value})} />`}
            <input type="number" step="0.05" min="-2" max="2" style="width:90px;"
              aria-label="LoRA ${n+1} strength"
              .value=${String(a.weight)} ?disabled=${!this.canEdit}
              @change=${u=>this.editLora(n,{weight:Number(u.target.value)})} />
            <button class="btn-inline" title="Remove" aria-label="Remove LoRA ${n+1}" ?disabled=${!this.canEdit}
              @click=${()=>this.edit({libbyGenLoras:o.filter((u,y)=>y!==n)})}>
              <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
            </button>
          </div>`)}
          <button class="btn-inline" style="align-self:flex-start; display:inline-flex; align-items:center; gap:6px;"
            ?disabled=${!this.canEdit||o.length>=8}
            @click=${()=>this.edit({libbyGenLoras:[...o,{name:t.find(a=>!o.some(n=>n.name===a))??"",weight:1}]})}>
            <span class="material-symbols-rounded" style="font-size:18px;">add</span>
            ${o.length?"Add another LoRA":"Add a LoRA"}
          </button>
        </div>
      </div>

      ${r.length?i`<div class="field">
            <div class="field-text">
              <div class="field-label">Board</div>
              <div class="field-help">The InvokeAI board her pictures are filed into, so what she
                makes stays separate from your own generations.</div>
            </div>
            <div class="field-control">
              <select ?disabled=${!this.canEdit}
                @change=${a=>this.edit({libbyGenBoard:a.target.value})}>
                <option value="" ?selected=${!e.libbyGenBoard}>Uncategorized</option>
                ${r.map(a=>i`<option value=${a} ?selected=${a===e.libbyGenBoard}>${a}</option>`)}
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
            @change=${a=>this.edit({libbyGenPrompt:a.target.value})}></textarea>
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
            @change=${a=>this.edit({libbyGenNegativePrompt:a.target.value})}></textarea>
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
            @change=${a=>this.edit({libbyCameraCandidates:Number(a.target.value)})}>
            ${[1,2,3,4].map(a=>i`<option value=${a} ?selected=${(e.libbyCameraCandidates||2)===a}>${a}</option>`)}
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
            @change=${a=>this.edit({libbyPoseModule:a.target.value})}/>
          <input placeholder="control_v11p_sd15_openpose" .value=${e.libbyPoseModel??""} ?disabled=${!this.canEdit}
            @change=${a=>this.edit({libbyPoseModel:a.target.value})}/>
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
            @change=${a=>this.edit({libbyFaceModule:a.target.value})}/>
          <input placeholder="ip-adapter-plus-face_sd15" .value=${e.libbyFaceModel??""} ?disabled=${!this.canEdit}
            @change=${a=>this.edit({libbyFaceModel:a.target.value})}/>
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
            @change=${a=>this.edit({libbyClipUrl:a.target.value})}/>
          <textarea rows="4" style="width:100%;font-family:monospace;font-size:11px;" placeholder='{"3": {"class_type": "KSampler", …}}'
            .value=${e.libbyClipWorkflow??""} ?disabled=${!this.canEdit}
            @change=${a=>this.edit({libbyClipWorkflow:a.target.value})}></textarea>
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
            @change=${a=>this.edit({libbyStoriesPerDay:Number(a.target.value)})}>
            ${[1,2,3,4,6].map(a=>i`<option value=${a} ?selected=${(e.libbyStoriesPerDay||2)===a}>${a} a day</option>`)}
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
    </section>`}async loadGenLists(){this.genError="";try{const e=await h.imageGenStatus();if(this.genStatus=e,!e.enabled||!e.reachable){e.enabled&&(this.genError=e.error||"The image generator isn't reachable.");return}this.genModels=(e.models??[]).map(s=>s.title||s.model_name).filter(Boolean),this.genLoras=(e.loras??[]).map(s=>s.name).filter(Boolean),this.genLoraTriggers=Object.fromEntries((e.loras??[]).map(s=>[s.name,(s.triggerPhrases??[]).join(", ")])),this.genBoards=(e.boards??[]).map(s=>s.name).filter(Boolean)}catch(e){this.genStatus=null,this.genError=e.message}}renderCameraLoras(e){const s=this.genLoras,t=e.libbyCameraLoras??[];return i`<div class="field stack">
      <div class="field-text">
        <div class="field-label">LoRAs she can choose</div>
        <div class="field-help">
          Ones she adds to a single picture when the shot calls for it — a pose, an act, a
          style — on top of the LoRAs above. Say when each one helps; that note is all she
          has to go on. Trigger words are added to the prompt with it.
        </div>
      </div>
      <div class="field-control" style="display:flex; flex-direction:column; gap:12px; align-items:stretch;">
        ${t.map((o,r)=>i`<div style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; gap:8px; align-items:center;">
            ${s.length?i`<select style="flex:1; min-width:0;" ?disabled=${!this.canEdit} aria-label="Optional LoRA ${r+1}"
                  @change=${a=>this.editCameraLora(r,{name:a.target.value})}>
                  ${(s.includes(o.name)?s:[o.name,...s]).map(a=>i`<option value=${a} ?selected=${a===o.name}>${a}</option>`)}
                </select>`:i`<input type="text" autocomplete="off" placeholder="LoRA name" style="flex:1; min-width:0;"
                  aria-label="Optional LoRA ${r+1}" .value=${o.name} ?disabled=${!this.canEdit}
                  @change=${a=>this.editCameraLora(r,{name:a.target.value})} />`}
            <input type="number" step="0.05" min="-2" max="2" style="width:90px;"
              aria-label="Optional LoRA ${r+1} strength" .value=${String(o.weight)} ?disabled=${!this.canEdit}
              @change=${a=>this.editCameraLora(r,{weight:Number(a.target.value)})} />
            <button class="btn-inline" title="Remove" aria-label="Remove optional LoRA ${r+1}" ?disabled=${!this.canEdit}
              @click=${()=>this.edit({libbyCameraLoras:t.filter((a,n)=>n!==r)})}>
              <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
            </button>
          </div>
          <input type="text" autocomplete="off" maxlength="160" placeholder="When it helps — e.g. POV shots from above"
            aria-label="When optional LoRA ${r+1} helps" .value=${o.when} ?disabled=${!this.canEdit}
            @change=${a=>this.editCameraLora(r,{when:a.target.value})} />
          <input type="text" autocomplete="off" maxlength="200" placeholder="Trigger words (optional)"
            aria-label="Optional LoRA ${r+1} trigger words" .value=${o.trigger} ?disabled=${!this.canEdit}
            @change=${a=>this.editCameraLora(r,{trigger:a.target.value})} />
        </div>`)}
        <button class="btn-inline" style="align-self:flex-start; display:inline-flex; align-items:center; gap:6px;"
          ?disabled=${!this.canEdit||t.length>=12}
          @click=${()=>{const o=s.find(r=>!t.some(a=>a.name===r))??"";this.edit({libbyCameraLoras:[...t,{name:o,weight:1,when:"",trigger:this.genLoraTriggers[o]??""}]})}}>
          <span class="material-symbols-rounded" style="font-size:18px;">add</span>
          ${t.length?"Add another":"Add one she can choose"}
        </button>
      </div>
    </div>`}renderAI(){const e=this.settings,s=this.info;return i`
      <section class="card">
        <h3><span class="material-symbols-rounded">auto_awesome</span>AI auto-tagging</h3>
        <p class="card-sub">
          Tagging runs entirely on this box — no image ever leaves it. The heuristic tagger needs no
          model; a real classifier requires an ONNX build with a model in the model directory.
        </p>

        ${e?i`
              ${this.switchField("Enable auto-tagging","Master switch. Off means no tagging at all, including the ✨ button.",e.aiEnabled,t=>this.edit({aiEnabled:t}))}
              ${this.switchField("Tag on import","Tag new uploads and imports automatically. With this off, tagging only happens when you ask for it.",e.aiAutoTag,t=>this.edit({aiAutoTag:t}),!e.aiEnabled)}

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
                    @input=${t=>this.edit({aiMinScore:Number(t.target.value)})}
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
                    @change=${t=>this.edit({aiMaxTags:Number(t.target.value)})}
                  />
                </div>
              </div>

              ${s?i`
                    ${this.readOnlyField("Active tagger","Chosen at startup.",s.aiTagger)}
                    ${this.readOnlyField("Inference device","OPPAI_AI_DEVICE — needs a restart to change.",s.aiDevice)}
                    ${this.readOnlyField("Model directory","OPPAI_AI_MODEL_DIR — needs a restart to change.",s.aiModelDir)}
                  `:l}
            `:i`<div class="field-help">Loading…</div>`}
      </section>
      ${this.renderVision()}
    `}renderVision(){const e=this.settings,s=this.describe;return i`
      <section class="card">
        <h3><span class="material-symbols-rounded">description</span>Describing pictures</h3>
        <p class="card-sub">
          A vision model on your own network writes what each picture or clip shows — who is where,
          doing what, in what style. The prose is stored encrypted, searchable from the library's search box,
          shown in the viewer, and given to Libby when a picture comes up. Any OpenAI-compatible server whose model
          accepts images works: Ollama or LM Studio with a llava, qwen-vl or gemma3 build, llama.cpp server with an mmproj.
        </p>
        ${e?i`
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
                    @change=${t=>this.edit({visionUrl:t.target.value})} />
                </div>
                <div class="field-control">
                  <input type="text" autocomplete="off" placeholder="Model name, e.g. qwen2.5vl:7b or llava" .value=${e.visionModel}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({visionModel:t.target.value})} />
                </div>
                <div class="field-control">
                  <input type="password" autocomplete="new-password"
                    placeholder=${e.visionApiKeySet?"API key saved — enter to replace":"API key (optional)"}
                    .value=${e.visionApiKey} ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({visionApiKey:t.target.value})} />
                </div>
              </div>
              ${this.switchField("Describe on import","Describe every new picture and clip once it has been tagged; the tags steer the model. Off means only when you ask, from the viewer.",e.visionAuto,t=>this.edit({visionAuto:t}),!e.visionUrl)}
              <div class="field">
                <div class="field-text">
                  <div class="field-label">Check the model</div>
                  <div class="field-help">
                    Sends a generated test picture and shows what comes back. Save the URL first.
                    ${this.describeNote?i`<div style="margin-top:6px; color:var(--oppai-text);">${this.describeNote}</div>`:l}
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
                    ${s?s.undescribed?`${s.undescribed.toLocaleString()} ${s.undescribed===1?"item has":"items have"} no description yet.${s.backfilling?" Working through them, one at a time.":""}`:"Everything that can be described has been.":"Loading…"}
                    Runs in the background, one item at a time; leave this page and it carries on.
                  </div>
                </div>
                <div class="field-control" style="display:flex; gap:8px; align-items:center;">
                  <button class="btn" ?disabled=${!e.visionEnabled||this.describeBusy||!s||!s.undescribed&&!s.backfilling}
                    @click=${()=>void this.toggleBackfill()}>
                    ${s!=null&&s.backfilling?"Stop":"Start"}
                  </button>
                  <button class="btn" title="Refresh the count" @click=${()=>void this.loadDescribe()}>
                    <span class="material-symbols-rounded" style="font-size:18px;">refresh</span>
                  </button>
                </div>
              </div>
            `:i`<div class="field-help">Loading…</div>`}
      </section>
    `}renderScraping(){const e=this.settings;return i`
      <section class="card">
        <h3><span class="material-symbols-rounded">travel_explore</span>Import &amp; scraping</h3>
        <p class="card-sub">How OppaiLib behaves toward the sites you import from.</p>

        ${e?i`
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
                ${e.rule34ApiKeySet?i`<div class="field-control">
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

            `:i`<div class="field-help">Loading…</div>`}
      </section>
    `}renderImageGen(){const e=this.settings;return i`
      <section class="card">
        <h3><span class="material-symbols-rounded">auto_awesome</span>Image generation</h3>
        <p class="card-sub">
          The generator behind the Create tab and Libby's pictures. Prompts stay on your own
          hardware — nothing is sent to a cloud service.
        </p>
        ${e?i`
              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Generator</div>
                  <div class="field-help">
                    URL of a local image generator on your network — an InvokeAI server
                    (e.g. <code>http://192.168.1.10:9090</code>) or an Automatic1111 / Forge /
                    SD.Next one (e.g. <code>http://192.168.1.10:7860</code>). Which API it speaks
                    is detected automatically. Blank turns the Create tab off.
                    ${this.genStatusLine(e)}
                  </div>
                </div>
                <div class="field-control">
                  <input type="text" autocomplete="off" placeholder="http://host:7860"
                    .value=${e.imageGenUrl} ?disabled=${!this.canEdit}
                    @change=${s=>this.edit({imageGenUrl:s.target.value})} />
                </div>
              </div>

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Automatic1111 models folder</div>
                  <div class="field-help">
                    Only for Automatic1111, Forge or SD.Next, which have no API to install or
                    delete a model — so installing from Civitai, editing a model's description
                    and trigger words, setting its cover and deleting it are done by writing into
                    its <code>models</code> folder (the one holding <code>Stable-diffusion</code>
                    and <code>Lora</code>). Map that folder into this container at
                    <code>/a1111-models</code> and it is found by itself; give a path here only if
                    you mapped it somewhere else. Without it, models are still listed and linked
                    to Civitai — just never changed.
                    ${this.modelsFolderLine(e)}
                  </div>
                </div>
                <div class="field-control">
                  <input type="text" autocomplete="off" placeholder="/a1111-models"
                    .value=${e.imageGenModelsDir??""} ?disabled=${!this.canEdit}
                    @change=${s=>this.edit({imageGenModelsDir:s.target.value})} />
                </div>
              </div>

              ${this.renderGenCheck()}
            `:i`<div class="field-help">Loading…</div>`}
      </section>

      <section class="card">
        <h3><span class="material-symbols-rounded">download</span>Civitai</h3>
        <p class="card-sub">The model catalogue Create browses, links your models to and installs from.</p>
        ${e?i`
              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Civitai API</div>
                  <div class="field-help">
                    Catalogue API base and optional key. The public mirror works without a key;
                    use <code>https://civitai.com/api/v1</code> with yours to see the prompts behind
                    posted pictures and your own account. The key is stored on this server and is
                    never sent back to the browser.
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
                ${e.civitaiKeySet?i`<div class="field-control">
                  <button type="button" class="btn-inline" ?disabled=${!this.canEdit}
                    @click=${()=>this.edit({civitaiApiKey:"",civitaiKeySet:!1})}>Clear saved key</button>
                </div>`:l}
              </div>
            `:i`<div class="field-help">Loading…</div>`}
      </section>

      <section class="card">
        <h3><span class="material-symbols-rounded">model_training</span>LoRA training</h3>
        <p class="card-sub">The trainer Create's Train screen sends your pictures to. It runs on its own, so a run
          carries on with the browser closed.</p>
        ${e?i`
              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Trainer</div>
                  <div class="field-help">
                    The address of the OppaiLib trainer container (<code>ghcr.io/noneye-byte/oppailib-trainer</code>,
                    on the box with the NVIDIA GPU), e.g. <code>http://192.168.1.10:7870</code>, and the
                    <code>TRAINER_TOKEN</code> it was started with. Blank hides training. Mount the generator's models
                    folder into the trainer at <code>/models</code> and checkpoints are read there; otherwise they are
                    sent from Automatic1111's models folder here. InvokeAI fetches a finished LoRA from this address
                    itself, so it must be reachable from InvokeAI too.
                  </div>
                </div>
                <div class="field-control">
                  <input type="text" autocomplete="off" placeholder="http://trainer:7870"
                    .value=${e.trainerUrl??""} ?disabled=${!this.canEdit}
                    @change=${s=>this.edit({trainerUrl:s.target.value})} />
                </div>
                <div class="field-control">
                  <input type="password" autocomplete="new-password"
                    placeholder=${e.trainerTokenSet?"•••••••• (unchanged)":"Trainer token"}
                    ?disabled=${!this.canEdit}
                    @change=${s=>this.edit({trainerToken:s.target.value})} />
                </div>
                ${e.trainerTokenSet?i`<div class="field-control">
                  <button type="button" class="btn-inline" ?disabled=${!this.canEdit}
                    @click=${()=>this.edit({trainerToken:"",trainerTokenSet:!1})}>Clear saved token</button>
                </div>`:l}
              </div>
            `:i`<div class="field-help">Loading…</div>`}
      </section>
    `}async runGenCheck(){this.genCheckBusy=!0,this.genCheckErr="";try{this.genChecks=(await h.imageGenCheck()).checks}catch(e){this.genCheckErr=e.message}finally{this.genCheckBusy=!1}this.loadGenLists()}renderGenCheck(){return i`<div class="field stack">
      <div class="field-text">
        <div class="field-label">Test everything</div>
        <div class="field-help">
          Tries each step an install from Civitai takes — the generator, its rescan route,
          the models folder and whether it is the one Automatic1111 reads, the Civitai API,
          the key, and the start of a real download (no file is kept). Save first.
        </div>
      </div>
      <div class="field-control">
        <button class="btn" ?disabled=${!this.canEdit||this.genCheckBusy||this.dirty} @click=${()=>void this.runGenCheck()}>
          ${this.genCheckBusy?"Testing…":"Test"}
        </button>
      </div>
      ${this.genCheckErr?i`<div class="field-status bad">${this.genCheckErr}</div>`:l}
      ${this.genChecks?i`<ul class="checks">
            ${this.genChecks.map(e=>i`<li class=${e.skipped?"skip":e.ok?"ok":"bad"}>
              <span class="material-symbols-rounded">${e.skipped?"info":e.ok?"check_circle":"error"}</span>
              <span><strong>${e.label}</strong> — ${e.detail}</span>
            </li>`)}
          </ul>`:l}
    </div>`}genStatusLine(e){const s=this.genStatus;if(!e.imageGenUrl.trim())return l;let t,o=!1;if(this.dirty)t="Save to check it.";else if(s)if(!s.reachable)t=`Not reachable${s.error?`: ${s.error}`:"."}`,o=!0;else{const r=s.backend==="invokeai"?"InvokeAI":"Automatic1111",a=(s.models??[]).length,n=(s.loras??[]).length;t=`Connected to ${r} — ${a} ${a===1?"model":"models"}, ${n} ${n===1?"LoRA":"LoRAs"}.`}else{if(!this.genError)return i`<div class="field-status">Checking…</div>`;t=this.genError,o=!0}return i`<div class="field-status ${o?"bad":""}">${t}</div>`}modelsFolderLine(e){const s=this.genStatus;if(this.dirty)return i`<div class="field-status">Save to check it.</div>`;if(!(s!=null&&s.reachable))return l;if(s.backend==="invokeai")return i`<div class="field-status">Not needed: InvokeAI installs and edits models itself.</div>`;if(s.manageModels){const t=!(e.imageGenModelsDir??"").trim();return i`<div class="field-status ok">
        Using <code>${s.modelsDir}</code>${t?" — found mounted, so there is nothing to set":""}. Models can be installed, edited and deleted.
      </div>`}return s.modelsDirProblem?i`<div class="field-status bad">${s.modelsDirProblem}.</div>`:i`<div class="field-status">Nothing is mounted at <code>/a1111-models</code> and no path is set.</div>`}renderLibrary(){const e=this.stats;if(!e)return l;const s=new Map(e.kinds.map(t=>[t.kind,t]));return i`
      <section class="card">
        <h3><span class="material-symbols-rounded">inventory_2</span>Library</h3>
        <p class="card-sub">
          ${e.items} ${e.items===1?"item":"items"} · ${b(e.bytes)} stored ·
          ${e.tags} ${e.tags===1?"tag":"tags"}
        </p>
        <div class="stat-grid">
          ${Object.keys(C).map(t=>{const o=s.get(t);return i`<div class="stat">
              <div class="stat-num">${(o==null?void 0:o.count)??0}</div>
              <div class="stat-label">${C[t].label} · ${b((o==null?void 0:o.bytes)??0)}</div>
            </div>`})}
        </div>
      </section>
    `}renderPasskeys(){const e=this.passkeyList;return i`
      <section class="card">
        <h3><span class="material-symbols-rounded">passkey</span>Passkeys</h3>
        <p class="card-sub">
          Sign in with your device's fingerprint, face or PIN instead of typing a password.
          Nothing guessable crosses the network and the server only ever stores a public
          key — your device keeps the private half.
        </p>

        ${this.passkeyError?i`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.passkeyError}
            </div>`:l}
        ${this.passkeyMsg?i`<div class="banner ok">
              <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span>${this.passkeyMsg}
            </div>`:l}

        ${e&&!e.available?i`<div class="banner info">
              <span class="material-symbols-rounded" style="font-size:18px;">lock</span>
              ${e.reason}
            </div>`:l}

        ${e===null?i`<p class="field-help">Checking…</p>`:e.passkeys.length===0?i`<p class="field-help">
                No passkeys yet. Your password keeps working either way — it's also how you
                get back in if you lose a device.
              </p>`:i`
                <div class="pk-list">
                  ${e.passkeys.map(s=>this.renderPasskeyRow(s))}
                </div>
              `}

        ${e!=null&&e.available?i`
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
            `:l}

        ${e!=null&&e.relyingPartyId?i`<p class="field-help">
              Passkeys added here are tied to <code>${e.relyingPartyId}</code>. That's how
              WebAuthn works — reach OppaiLib at a different address and your device won't
              offer them, so add one per address you actually use.
            </p>`:l}
      </section>
    `}renderPasskeyRow(e){const s=this.passkeyRenaming===e.id,t=this.passkeyRevoking===e.id;return i`
      <div class="pk-row">
        <span class="material-symbols-rounded pk-icon">${e.synced?"cloud_sync":"key"}</span>
        <div class="pk-body">
          ${s?i`<div class="pk-rename">
                <input
                  type="text"
                  .value=${this.passkeyName}
                  @input=${o=>this.passkeyName=o.target.value}
                />
                <button @click=${()=>void this.savePasskeyName(e)}>Save</button>
                <button @click=${()=>this.passkeyRenaming=null}>Cancel</button>
              </div>`:i`<div class="pk-name">${e.name}</div>`}
          <div class="pk-meta">
            ${e.synced?"Synced to your account":"This device only"}
            · added ${T(e.createdAt)}
            · ${e.lastUsedAt?`last used ${T(e.lastUsedAt)}`:"never used"}
          </div>
          ${t?i`<div class="pk-revoke">
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
        ${s||t?l:i`<div class="pk-actions">
              <button title="Rename" @click=${()=>this.startRename(e)}>
                <span class="material-symbols-rounded" style="font-size:18px;">edit</span>
              </button>
              <button title="Remove" @click=${()=>this.startRevoke(e)}>
                <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
              </button>
            </div>`}
      </div>
    `}async loadPasskeys(){try{this.passkeyList=await h.passkeys()}catch(e){this.passkeyError=e.message}}startRename(e){this.passkeyRenaming=e.id,this.passkeyRevoking=null,this.passkeyName=e.name}async savePasskeyName(e){const s=this.passkeyName.trim();if(s)try{await h.renamePasskey(e.id,s),this.passkeyRenaming=null,this.passkeyName="",await this.loadPasskeys()}catch(t){this.passkeyError=t.message}}startRevoke(e){this.passkeyRevoking=e.id,this.passkeyRenaming=null,this.passkeyPassword="",this.passkeyError=""}async revokePasskey(e){this.passkeyBusy=!0,this.passkeyError="";try{await h.revokePasskey(e.id,this.passkeyPassword),this.passkeyRevoking=null,this.passkeyPassword="",this.passkeyMsg=`Removed “${e.name}”.`,await this.loadPasskeys()}catch(s){this.passkeyError=s.message}finally{this.passkeyBusy=!1}}renderAccount(){var e,s;return i`
      ${this.renderPasskeys()}
      <section class="card">
        <h3><span class="material-symbols-rounded">account_circle</span>Account</h3>
        <p class="card-sub">
          Signed in as <strong>${(e=this.user)==null?void 0:e.username}</strong>${(s=this.user)!=null&&s.isAdmin?" (admin)":""}.
        </p>

        ${this.pwErr?i`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.pwErr}
            </div>`:l}
        ${this.pwMsg?i`<div class="banner ok">
              <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span>${this.pwMsg}
            </div>`:l}

        <div class="pw">
          <input
            type="password"
            placeholder="Current password"
            autocomplete="current-password"
            .value=${this.pwCurrent}
            @input=${t=>this.pwCurrent=t.target.value}
          />
          <input
            type="password"
            placeholder="New password (8+ characters)"
            autocomplete="new-password"
            .value=${this.pwNew}
            @input=${t=>this.pwNew=t.target.value}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            autocomplete="new-password"
            .value=${this.pwConfirm}
            @input=${t=>this.pwConfirm=t.target.value}
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
    `}renderStorage(){var s;const e=this.storage;return i`
      <section class="card">
        <h3><span class="material-symbols-rounded">hard_drive</span>Storage</h3>
        <p class="card-sub">
          Where OppaiLib keeps things, and how much room is left. Nothing here lives
          inside the container image unless you left a mapping unset — which is what
          the warnings are for.
        </p>

        ${this.storageErr?i`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.storageErr}
            </div>`:l}

        ${((e==null?void 0:e.warnings)??[]).map(t=>i`<div class="banner error">
          <span class="material-symbols-rounded" style="font-size:18px;">warning</span>${t}
        </div>`)}

        <div class="diag-actions">
          <button class="btn-primary" ?disabled=${this.storageBusy} @click=${this.loadStorage}>
            <span class="material-symbols-rounded" style="font-size:20px;">refresh</span>
            ${this.storageBusy?"Reading…":"Refresh"}
          </button>
          ${(s=this.user)!=null&&s.isAdmin?i`<button ?disabled=${this.storageBusy} @click=${this.runCleanup}>
                <span class="material-symbols-rounded" style="font-size:20px;">mop</span>
                Reclaim space
              </button>`:l}
          <span class="field-help grow">
            Reclaiming removes only what can be recreated: chunks of uploads nobody
            came back to finish, and scratch files from jobs that have ended. It never
            touches your media, Libby's memories or model files.
          </span>
        </div>

        ${e?i`
              ${e.pendingBytes>0?i`<p class="field-help">
                    Uploads in progress still need about ${b(e.pendingBytes)}.
                  </p>`:l}
              ${e.mappings.map(t=>this.renderMapping(t))}
              <h4 style="margin:18px 0 6px;">Reclaimable now</h4>
              ${e.reclaimable.map(t=>i`<p class="field-help">
                ${t.label}: <strong>${b(t.bytes)}</strong>${t.note?i` — ${t.note}`:l}
              </p>`)}
            `:i`<p class="field-help">${this.storageBusy?"Reading…":"No reading yet."}</p>`}
      </section>
    `}renderMapping(e){const s=e.totalBytes>0?Math.round(e.usedBytes/e.totalBytes*100):0;return i`
      <div class="setting-row" style="display:block;">
        <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
          <strong>${e.label}</strong>
          <code style="font-size:12px; opacity:.8;">${e.path}</code>
          ${e.exists?l:i`<span class="field-help" style="color:var(--oppai-error);">not mapped</span>`}
          ${e.exists&&!e.writable?i`<span class="field-help" style="color:var(--oppai-error);">read-only</span>`:l}
        </div>
        <div style="height:6px; border-radius:999px; background:var(--oppai-surface-2); overflow:hidden; margin:6px 0;">
          <span style="display:block; height:100%; width:${s}%; background:${s>=90?"var(--oppai-error)":"var(--oppai-primary)"};"></span>
        </div>
        <p class="field-help">
          ${e.error?e.error:i`${b(e.freeBytes)} free of ${b(e.totalBytes)} (${s}% used)`}
          ${(e.contents??[]).map(t=>i` · ${t.label}: ${b(t.bytes)}${t.count?i` (${t.count})`:l}`)}
        </p>
        <p class="field-help">${e.purpose} Set with <code>${e.env}</code>.</p>
      </div>
    `}renderDiagnostics(){const e=this.diag,s=this.uiDiag;return i`
      <section class="card">
        <h3><span class="material-symbols-rounded">speed</span>Performance</h3>
        <p class="card-sub">
          Counters and latencies since the server started, or since you last reset them.
          Nothing here is sent anywhere — it's read straight off this box.
        </p>

        ${this.diagErr?i`<div class="banner error">
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

        ${e?i`
              ${e.dbWal?l:i`<div class="banner error">
                    <span class="material-symbols-rounded" style="font-size:18px;">warning</span>
                    The database isn't in WAL mode, so every query runs one at a time.
                    This is usually because it lives on a network share — move it to a
                    local disk and restart.
                  </div>`}

              <div class="stat-grid">
                ${this.diagStat("Uptime",xe(e.uptimeSeconds))}
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
              ${e.metrics.timings.length===0?i`<p class="field-help">Nothing measured in this window yet.</p>`:i`
                    <div class="diag-scroll">
                      <table class="diag-table">
                        <thead>
                          <tr>
                            <th>What</th><th>Calls</th><th>Avg</th><th>p95</th><th>Worst</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${e.metrics.timings.slice(0,25).map(t=>i`<tr>
                              <td class="diag-name">${t.name}</td>
                              <td>${t.count}</td>
                              <td>${t.avgMs} ms</td>
                              <td>${t.p95Ms} ms</td>
                              <td class=${t.maxMs>=3e3?"diag-bad":""}>${t.maxMs} ms</td>
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
              ${s?i`
                    <div class="stat-grid">
                      ${this.diagStat("UI updates",String(s.updates))}
                      ${this.diagStat("Slow updates",String(s.slowUpdates))}
                      ${this.diagStat("Long tasks",`${s.longTasks} · ${Math.round(s.longTaskMs)} ms`)}
                      ${this.diagStat("Layout shift",`${s.layoutShifts} · ${s.layoutShiftScore}`)}
                    </div>
                    ${s.timings.length===0?i`<p class="field-help">No profiled component has updated in this window yet.</p>`:i`
                          <div class="diag-scroll">
                            <table class="diag-table">
                              <thead>
                                <tr><th>Component</th><th>Updates</th><th>Avg</th><th>p95</th><th>Slow</th><th>Worst</th></tr>
                              </thead>
                              <tbody>
                                ${s.timings.map(t=>i`<tr>
                                  <td class="diag-name">${t.name}</td>
                                  <td>${t.count}</td>
                                  <td>${t.avgMs} ms</td>
                                  <td>${t.p95Ms} ms</td>
                                  <td class=${t.slow?"diag-bad":""}>${t.slow}</td>
                                  <td class=${t.maxMs>16?"diag-bad":""}>${t.maxMs} ms</td>
                                </tr>`)}
                              </tbody>
                            </table>
                          </div>
                        `}
                  `:i`<p class="field-help">Refresh to read browser timings.</p>`}
            `:i`<p class="field-help">${this.diagBusy?"Reading…":"No snapshot yet."}</p>`}
      </section>
    `}renderFetchHealth(e){const s=e.metrics.counters,t=[["Fetches completed",s["scrape.fetch.ok"]??0,"Pages and listings fetched successfully."],["Retried",s["scrape.fetch.retry"]??0,"A site failed transiently and we tried again."],["Gave up",s["scrape.fetch.exhausted"]??0,"Still failing after every retry."],["Queued behind another request",s["scrape.host_queued"]??0,"A steady number here means we're fanning out wider than the site allows."],["Asked to back off",s["scrape.fetch.backoff_too_long"]??0,"A site asked for a longer wait than we'll hold a click open for."]];return t.every(([,o])=>o===0)?l:i`
      <h4 class="diag-head">Outbound fetches</h4>
      ${t.map(([o,r,a])=>r===0?l:i`<div class="diag-row"><strong>${r}</strong> ${o} <span class="field-help">— ${a}</span></div>`)}
    `}diagStat(e,s){return i`<div class="stat">
      <div class="stat-num diag-stat-num">${s}</div>
      <div class="stat-label">${e}</div>
    </div>`}renderAbout(){const e=this.info;return e?i`
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
    `:l}switchField(e,s,t,o,r=!1){const a=!this.canEdit||r;return i`
      <div class="field">
        <div class="field-text">
          <div class="field-label">${e}</div>
          <div class="field-help">${s}</div>
        </div>
        <div class="field-control">
          <button
            class="switch ${t?"on":""}"
            role="switch"
            aria-checked=${t?"true":"false"}
            aria-label=${e}
            ?disabled=${a}
            @click=${()=>o(!t)}
          ></button>
        </div>
      </div>
    `}readOnlyField(e,s,t){return i`
      <div class="field">
        <div class="field-text">
          <div class="field-label">${e}</div>
          <div class="field-help">${s}</div>
        </div>
        <div class="field-control"><span class="ro">${t}</span></div>
      </div>
    `}};c.styles=[M,R,B`
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
      /* What the server found for a field, under its help: a fact, not advice, so it
         reads in the body colour and only turns red or green when it is a verdict. */
      .field-status {
        margin-top: 6px;
        color: var(--oppai-text);
      }
      .field-status.ok { color: var(--oppai-primary-bright); }
      .field-status.bad { color: var(--oppai-error); }
      .checks {
        list-style: none;
        margin: 10px 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 13px;
      }
      .checks li { display: flex; gap: 8px; align-items: flex-start; overflow-wrap: anywhere; }
      .checks .material-symbols-rounded { font-size: 18px; flex-shrink: 0; }
      .checks .ok .material-symbols-rounded { color: var(--oppai-primary-bright); }
      .checks .bad .material-symbols-rounded { color: var(--oppai-error); }
      .checks .skip .material-symbols-rounded { color: var(--oppai-text-muted); }
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
    `];p([z({attribute:!1})],c.prototype,"user",2);p([z({attribute:!1})],c.prototype,"only",2);p([d()],c.prototype,"tab",2);p([d()],c.prototype,"settings",2);p([d()],c.prototype,"info",2);p([d()],c.prototype,"stats",2);p([d()],c.prototype,"apk",2);p([d()],c.prototype,"loadError",2);p([d()],c.prototype,"passkeyList",2);p([d()],c.prototype,"passkeyBusy",2);p([d()],c.prototype,"passkeyError",2);p([d()],c.prototype,"passkeyMsg",2);p([d()],c.prototype,"passkeyName",2);p([d()],c.prototype,"passkeyRenaming",2);p([d()],c.prototype,"passkeyRevoking",2);p([d()],c.prototype,"passkeyPassword",2);p([d()],c.prototype,"diag",2);p([d()],c.prototype,"uiDiag",2);p([d()],c.prototype,"storage",2);p([d()],c.prototype,"storageBusy",2);p([d()],c.prototype,"storageErr",2);p([d()],c.prototype,"diagBusy",2);p([d()],c.prototype,"diagErr",2);p([d()],c.prototype,"dirty",2);p([d()],c.prototype,"saving",2);p([d()],c.prototype,"saved",2);p([d()],c.prototype,"theme",2);p([d()],c.prototype,"fit",2);p([d()],c.prototype,"hideLibby",2);p([d()],c.prototype,"genModels",2);p([d()],c.prototype,"genLoras",2);p([d()],c.prototype,"genLoraTriggers",2);p([d()],c.prototype,"genBoards",2);p([d()],c.prototype,"genError",2);p([d()],c.prototype,"genStatus",2);p([d()],c.prototype,"genChecks",2);p([d()],c.prototype,"genCheckBusy",2);p([d()],c.prototype,"genCheckErr",2);p([d()],c.prototype,"pwCurrent",2);p([d()],c.prototype,"pwNew",2);p([d()],c.prototype,"pwConfirm",2);p([d()],c.prototype,"pwBusy",2);p([d()],c.prototype,"pwMsg",2);p([d()],c.prototype,"pwErr",2);p([d()],c.prototype,"refs",2);p([d()],c.prototype,"refStamp",2);p([d()],c.prototype,"refNote",2);p([d()],c.prototype,"tts",2);p([d()],c.prototype,"describe",2);p([d()],c.prototype,"describeBusy",2);p([d()],c.prototype,"describeNote",2);p([d()],c.prototype,"ttsErrors",2);c=p([N("oppai-settings")],c);function T(e){if(!e)return"never";const s=Math.max(0,(Date.now()-e)/1e3);if(s<90)return"just now";const t=Math.round(s/60);if(t<60)return`${t} min ago`;const o=Math.round(t/60);if(o<24)return`${o}h ago`;const r=Math.round(o/24);return r<=30?`${r} day${r===1?"":"s"} ago`:new Date(e).toLocaleDateString()}function xe(e){const s=Math.max(0,Math.floor(e)),t=Math.floor(s/86400),o=Math.floor(s%86400/3600),r=Math.floor(s%3600/60);return t>0?`${t}d ${o}h`:o>0?`${o}h ${r}m`:r>0?`${r}m ${s%60}s`:`${s}s`}function b(e){if(!e)return"0 B";const s=["B","KB","MB","GB","TB"];let t=e,o=0;for(;t>=1024&&o<s.length-1;)t/=1024,o++;return`${t<10&&o>0?t.toFixed(1):Math.round(t)} ${s[o]}`}const Pe=Object.freeze(Object.defineProperty({__proto__:null,get OppaiSettings(){return c}},Symbol.toStringTag,{value:"Module"}));export{Ce as a,_ as b,Pe as c,Ae as l,de as s};
