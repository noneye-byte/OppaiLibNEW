import{z as H,q as j,i as q,u as d,a as Y,e as v,m as $,A as l,b as s,t as J,ap as ae,aq as oe,ar as ne,as as U,at as re,x as le,au as de,av as ce,aw as pe,ax as he,ay as ue,az as ve,aA as fe,aB as ge,aC as me,aD as G,v as Q}from"./index-BEFN2Gyr.js";import{r as ye,p as be}from"./passkeys-ciXgQjG7.js";import{s as $e,l as T,a as F,i as we,S as ke}from"./clip-models-C_2_HC7J.js";import{l as xe,a as Le,s as M,b as D,D as Ee,d as Se}from"./launchy-xyl1VS8H.js";const Ae=160,Ce=220;function Re(e){var u;const t=e.trim();if(t.length<=Ae)return t?[t]:[];const i=((u=t.match(/[^.!?…\n]+(?:[.!?…]+["”')]*|\n|$)/g))==null?void 0:u.map(m=>m.trim()).filter(Boolean))??[t],[n,...o]=i,r=[n];let a="";for(const m of o)a&&a.length+m.length+1>Ce&&(r.push(a),a=""),a=a?`${a} ${m}`:m;return a&&r.push(a),r}const X="oppai_libby_speak";function Ye(){try{return localStorage.getItem(X)==="1"}catch{return!1}}function Je(e){try{localStorage.setItem(X,e?"1":"0")}catch{}e||ee(),window.dispatchEvent(new CustomEvent("oppai-libby-speak",{detail:{on:e}}))}let A=null,V=0;async function Z(e=!1){if(!e&&A&&Date.now()-V<6e4)return A;try{const t=await fetch("/api/tts/status",{credentials:"same-origin"});if(!t.ok)throw new Error(String(t.status));A=await t.json(),V=Date.now()}catch{A=null}return A}const I=[];let L=null,z=!1,E=0,O=Promise.resolve();function Pe(e,t=0){const i=Re(e);if(!i.length)return Promise.resolve();const n=E,o=i.map(r=>new Promise(a=>{const u=O.then(()=>n===E?Ie(r,t):null);O=u.catch(()=>null),I.push({text:r,heat:t,audio:u,done:a})}));return Te(),Promise.all(o).then(()=>{})}function ee(){var e;E++,O=Promise.resolve();for(const t of I.splice(0))t.done();L&&(L.pause(),L.src="",L=null);try{(e=window.speechSynthesis)==null||e.cancel()}catch{}}async function Te(){if(!z){z=!0;try{for(;I.length;){const e=I.shift(),t=E;try{await Me(e,t)}catch{}finally{e.done()}}}finally{z=!1}}}async function Me(e,t){const i=await e.audio.catch(()=>null);if(t===E){if(i){await Be(i,t);return}await Ne(e.text,t)}}async function Ie(e,t){const i=await Z();if(i&&!i.engine)return null;try{const n=await fetch("/api/tts/speak",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:e,heat:t||void 0})});return n.status===503?(A=null,null):n.ok?await n.blob():null}catch{return null}}function Be(e,t){return new Promise(i=>{const n=URL.createObjectURL(e),o=new Audio(n);L=o;const r=()=>{L===o&&(L=null),URL.revokeObjectURL(n),i()};o.addEventListener("ended",r,{once:!0}),o.addEventListener("error",r,{once:!0}),o.play().catch(()=>{r()}),t!==E&&r()})}function Ne(e,t){const i=window.speechSynthesis;return!i||typeof SpeechSynthesisUtterance>"u"?Promise.resolve():new Promise(n=>{const o=new SpeechSynthesisUtterance(e),r=De(i.getVoices());if(r&&(o.voice=r),o.rate=1.02,o.pitch=1.05,o.onend=()=>n(),o.onerror=()=>n(),t!==E){n();return}i.speak(o)})}function De(e){const t=e.filter(o=>/^en/i.test(o.lang)),i=t.length?t:e,n=o=>{let r=0;const a=o.name.toLowerCase();return/natural|neural|premium|enhanced/.test(a)&&(r+=4),/female|woman|aria|jenny|samantha|zira|karen|moira|tessa|fiona|libby|sonia|ava|allison|susan|emma/.test(a)&&(r+=3),/google/.test(a)&&(r+=1),o.default&&(r+=1),r};return[...i].sort((o,r)=>n(r)-n(o))[0]}var ze=Object.defineProperty,Oe=Object.getOwnPropertyDescriptor,x=(e,t,i,n)=>{for(var o=n>1?void 0:n?Oe(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(n?a(t,i,o):a(o))||o);return n&&o&&ze(t,i,o),o};const _e={itch:"itch.io",f95:"F95zone"},Ue=4e3;let b=class extends Y{constructor(){super(...arguments),this.status=null,this.keys=null,this.loadError="",this.link="",this.linkExpires=0,this.linking=!1,this.busy={},this.timer=null,this.linkIssuedAt=0}connectedCallback(){super.connectedCallback(),this.refresh(),this.loadKeys(),this.timer=window.setInterval(()=>void this.refresh(),Ue)}disconnectedCallback(){super.disconnectedCallback(),this.timer!=null&&clearInterval(this.timer),this.timer=null}async refresh(){try{this.status=await v.launchyStatus(),this.loadError=""}catch(e){this.loadError=e.message}if(this.link)if(Date.now()/1e3>this.linkExpires)this.link="";else{await this.loadKeys();const e=(this.keys??[]).find(t=>t.createdAt>=this.linkIssuedAt);e&&(this.link="",$(`Launchy on ${e.name} is linked.`))}}async loadKeys(){try{this.keys=(await v.launchyKeys()).items}catch(e){this.loadError=e.message}}async makeLink(){this.linking=!0;try{const{code:e,expiresAt:t}=await v.launchyPairing();this.linkIssuedAt=Math.floor(Date.now()/1e3)-5,this.link=xe(location.origin,e),this.linkExpires=t,window.location.assign(this.link)}catch(e){$(e.message,"error")}finally{this.linking=!1}}async copyLink(e){var i;const t=(i=e.currentTarget.parentElement)==null?void 0:i.querySelector("input");try{await navigator.clipboard.writeText(this.link),$("Copied the link.")}catch{t==null||t.select(),$("Press Ctrl+C to copy the selected link.")}}async revoke(e){if(confirm(`Unlink Launchy on ${e.name}? It stops syncing until it is linked again.`))try{await v.revokeLaunchyKey(e.id),await this.loadKeys()}catch(t){$(t.message,"error")}}async run(e,t,i){this.busy={...this.busy,[e]:!0};try{const n=await v.launchyRequest(t),o=await Le(v.launchyRequestStatus,n.id,{timeout:t.action==="sync"?18e4:6e4});o.status==="done"?$(o.message||i):$(o.error||"Launchy could not do that.","error")}catch(n){$(n.message,"error")}finally{this.busy={...this.busy,[e]:!1},this.refresh()}}render(){return s`
      ${this.loadError?s`<div class="banner error"><span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.loadError}</div>`:l}
      ${this.renderLink()}
      ${this.renderPC()}
      ${this.renderRunning()}
      ${this.renderDownloads()}
    `}renderLink(){const e=this.keys??[];return s`
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
        ${this.link?s`<div class="linkbox">
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
        ${e.map(t=>s`<div class="row">
            <span class="material-symbols-rounded" style="font-size:18px; color:var(--oppai-text-muted);">key</span>
            <div class="grow">
              <div class="label">${t.name}</div>
              <div class="help">
                Key …${t.hint} · linked ${new Date(t.createdAt*1e3).toLocaleDateString()} ·
                ${t.lastUsedAt?`last used ${M(t.lastUsedAt)}`:"not used yet"}
              </div>
            </div>
            <button class="btn-inline" @click=${()=>void this.revoke(t)}>
              <span class="material-symbols-rounded">link_off</span>Unlink
            </button>
          </div>`)}
      </section>
    `}renderPC(){var i,n,o,r;const e=this.status;if(!e)return l;const t=!!e.reportedAt;return s`
      <section class="card">
        <h3><span class="material-symbols-rounded">sports_esports</span>The PC</h3>
        <div class="row">
          <span class="dot ${e.connected?"on":""}"></span>
          <div class="grow">
            <div class="label">${e.connected?`Launchy is running on ${e.name||"the PC"}`:"Launchy is offline"}</div>
            <div class="help">
              ${e.version?`Version ${e.version} · `:""}last checked in ${M(e.lastSeen)}
              ${e.connected&&!t?s` · <span class="warn">an older Launchy — update it to control it from here</span>`:l}
            </div>
          </div>
          ${D(e,"sync")?s`<button class="btn-inline" ?disabled=${this.busy.sync||((i=e.sync)==null?void 0:i.running)}
                @click=${()=>void this.run("sync",{action:"sync"},"Synced.")}>
                <span class="material-symbols-rounded">sync</span>${this.busy.sync||(n=e.sync)!=null&&n.running?"Syncing…":"Sync now"}
              </button>`:l}
        </div>
        ${(o=e.sync)!=null&&o.lastSync||(r=e.sync)!=null&&r.lastError?s`<div class="row"><div class="grow">
              <div class="label">Library sync</div>
              <div class="help">
                ${e.sync.lastSync?`Last synced ${M(e.sync.lastSync)}`:"Not synced yet"}
                ${e.sync.lastError?s` · <span class="warn">${e.sync.lastError}</span>`:l}
              </div>
            </div></div>`:l}
        ${(e.accounts??[]).map(a=>s`<div class="row">
            <span class="dot ${a.challenged?"warn":a.signedIn?"on":""}"></span>
            <div class="grow">
              <div class="label">${_e[a.site]??a.site}</div>
              <div class="help">
                ${a.challenged?s`<span class="warn">Wants a person to prove they are one — press Verify next to it in Launchy on the PC.</span>`:a.signedIn?`Signed in${a.user?` as ${a.user}`:""} in Launchy`:"Not signed in in Launchy — sign in there, under Settings → Accounts"}
              </div>
            </div>
          </div>`)}
      </section>
    `}renderRunning(){const e=this.status;if(!(e!=null&&e.connected)||!e.reportedAt)return l;const t=e.sessions??[];return s`
      <section class="card">
        <h3><span class="material-symbols-rounded">play_arrow</span>Running</h3>
        ${t.length===0?s`<div class="empty">Nothing is running on the PC.</div>`:l}
        ${t.map(i=>{const n=`stop:${i.gameId}`;return s`<div class="row">
            <div class="grow">
              <div class="label">${i.title||"A game"}</div>
              <div class="help">Started ${M(i.startedAt)}</div>
            </div>
            ${D(e,"stop")?s`<button class="btn-inline" ?disabled=${this.busy[n]}
                  @click=${()=>{confirm(`Close ${i.title||"this game"} on the PC? Anything unsaved in it is lost.`)&&this.run(n,{action:"stop",gameId:i.gameId},"Closed.")}}>
                  <span class="material-symbols-rounded">stop_circle</span>${this.busy[n]?"Closing…":"Close"}
                </button>`:l}
          </div>`})}
      </section>
    `}renderDownloads(){const e=this.status;if(!(e!=null&&e.connected)||!e.reportedAt)return l;const t=e.downloads??[];return t.length?s`
      <section class="card">
        <h3><span class="material-symbols-rounded">download</span>Downloads on the PC</h3>
        ${t.map(i=>{const n=`cancel:${i.id}`;return s`<div class="row">
            <div class="grow">
              <div class="label">${i.title}${i.label?s` <span class="help">· ${i.label}</span>`:l}</div>
              <div class="help">
                ${Ee[i.status]??i.status}${i.message?` — ${i.message}`:""}
              </div>
            </div>
            ${Se(i)&&D(e,"download")?s`<button class="btn-inline" ?disabled=${this.busy[n]}
                  @click=${()=>void this.run(n,{action:"cancel-download",downloadId:i.id},"Cancelled.")}>
                  <span class="material-symbols-rounded">close</span>Cancel
                </button>`:l}
          </div>`})}
      </section>
    `:l}};b.styles=[H,j,q`
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
    `];x([d()],b.prototype,"status",2);x([d()],b.prototype,"keys",2);x([d()],b.prototype,"loadError",2);x([d()],b.prototype,"link",2);x([d()],b.prototype,"linkExpires",2);x([d()],b.prototype,"linking",2);x([d()],b.prototype,"busy",2);b=x([J("oppai-launchy-panel")],b);var Ge=Object.defineProperty,Fe=Object.getOwnPropertyDescriptor,p=(e,t,i,n)=>{for(var o=n>1?void 0:n?Fe(t,i):t,r=e.length-1,a;r>=0;r--)(a=e[r])&&(o=(n?a(t,i,o):a(o))||o);return n&&o&&Ge(t,i,o),o};const Ve=[{id:"appearance",label:"Appearance",icon:"palette",group:"You"},{id:"account",label:"Account",icon:"account_circle",group:"You"},{id:"library",label:"Library",icon:"inventory_2",group:"Library"},{id:"scraping",label:"Import & scraping",icon:"travel_explore",group:"Library",server:!0},{id:"ai",label:"Tagging & descriptions",icon:"smart_toy",group:"AI",server:!0},{id:"imagegen",label:"Image generation",icon:"auto_awesome",group:"AI",server:!0},{id:"android",label:"Android app",icon:"android",group:"Apps"},{id:"launchy",label:"Launchy",icon:"sports_esports",group:"Apps"},{id:"storage",label:"Storage",icon:"hard_drive",group:"Server"},{id:"privacy",label:"Privacy",icon:"visibility_off",group:"Server",server:!0,adminOnly:!0},{id:"diagnostics",label:"Diagnostics",icon:"speed",group:"Server",adminOnly:!0},{id:"about",label:"About",icon:"info",group:"Server"}];let c=class extends Y{constructor(){super(...arguments),this.only="",this.tab="appearance",this.settings=null,this.info=null,this.stats=null,this.apk=null,this.loadError="",this.passkeyList=null,this.passkeyBusy=!1,this.passkeyError="",this.passkeyMsg="",this.passkeyName="",this.passkeyRenaming=null,this.passkeyRevoking=null,this.passkeyPassword="",this.diag=null,this.uiDiag=null,this.storage=null,this.storageBusy=!1,this.storageErr="",this.diagBusy=!1,this.diagErr="",this.dirty=!1,this.saving=!1,this.saved=!1,this.theme=ae(),this.fit=oe(),this.hideLibby=ne(),this.genModels=[],this.genLoras=[],this.genLoraTriggers={},this.genBoards=[],this.genError="",this.genStatus=null,this.genChecks=null,this.genCheckBusy=!1,this.genRestart="",this.genCheckErr="",this.comfy=null,this.comfyErr="",this.comfyBusy=!1,this.comfyFolder=null,this.comfyChecks=null,this.comfyCheckBusy=!1,this.comfyCheckErr="",this.pwCurrent="",this.pwNew="",this.pwConfirm="",this.pwBusy=!1,this.pwMsg="",this.pwErr="",this.refs=null,this.refStamp=Date.now(),this.refNote="",this.tts=void 0,this.describe=null,this.describeBusy=!1,this.describeNote="",this.ttsErrors={},this.addPasskey=async()=>{this.passkeyBusy=!0,this.passkeyError="",this.passkeyMsg="";try{const e=await ye(this.passkeyName.trim());this.passkeyName="",this.passkeyMsg=`Added “${e.name}”. You can sign in with it now.`,await this.loadPasskeys()}catch(e){const t=be(e);t&&(this.passkeyError=t)}finally{this.passkeyBusy=!1}},this.cancelRevoke=()=>{this.passkeyRevoking=null,this.passkeyPassword=""},this.loadStorage=async()=>{this.storageBusy=!0,this.storageErr="";try{this.storage=await v.storage()}catch(e){this.storageErr=e.message}finally{this.storageBusy=!1}},this.runCleanup=async()=>{this.storageBusy=!0,this.storageErr="";try{const e=await v.cleanupStorage(["uploads","temp"]);this.storage=e.storage,$(`Reclaimed ${e.freedHuman}.`,"success")}catch(e){this.storageErr=e.message}finally{this.storageBusy=!1}},this.loadDiagnostics=async()=>{this.diagBusy=!0,this.diagErr="";try{this.diag=await v.diagnostics(),this.uiDiag=U()}catch(e){this.diagErr=e.message}finally{this.diagBusy=!1}},this.resetDiagnostics=async()=>{this.diagBusy=!0,this.diagErr="";try{re(),await v.resetDiagnostics(),this.diag=await v.diagnostics(),this.uiDiag=U()}catch(e){this.diagErr=e.message}finally{this.diagBusy=!1}}}connectedCallback(){super.connectedCallback(),le(this,"settings"),this.load(),this.loadGenLists(),this.loadComfy(),this.loadTTS(),this.loadDescribe(),this.loadReferences()}async loadReferences(){try{this.refs=await v.libbyReferences()}catch{this.refs=null}}async setReference(e,t){var o;const i=(o=t.files)==null?void 0:o[0];if(t.value="",!i)return;const n=await new Promise((r,a)=>{const u=new FileReader;u.onload=()=>r(String(u.result)),u.onerror=()=>a(u.error),u.readAsDataURL(i)});try{await v.setLibbyReference(e,n),this.refNote="",this.refStamp=Date.now(),await this.loadReferences()}catch(r){this.refNote=r.message}}async clearReference(e){try{await v.deleteLibbyReference(e),this.refNote="",await this.loadReferences()}catch(t){this.refNote=t.message}}referenceTile(e,t){var n;const i=!!((n=this.refs)!=null&&n[e]);return s`<div style="display:flex;flex-direction:column;gap:6px;align-items:center;width:132px;">
      <div style="width:132px;height:176px;border-radius:12px;overflow:hidden;display:grid;place-items:center;
        background:var(--md-sys-color-surface-container-highest);color:var(--md-sys-color-on-surface-variant);font-size:12px;text-align:center;">
        ${i?s`<img src=${v.libbyReferenceURL(e,this.refStamp)} alt=${`Libby, ${t.toLowerCase()}`} style="width:100%;height:100%;object-fit:cover;"/>`:s`<span>No picture</span>`}
      </div>
      <strong style="font-size:12px;">${t}</strong>
      <div style="display:flex;gap:6px;">
        <label class="btn-inline">
          ${i?"Replace":"Upload"}
          <input type="file" accept="image/*" hidden ?disabled=${!this.canEdit}
            @change=${o=>void this.setReference(e,o.target)}/>
        </label>
        ${i?s`<button class="btn-inline" ?disabled=${!this.canEdit}
          @click=${()=>void this.clearReference(e)}>Remove</button>`:l}
      </div>
    </div>`}async load(){try{const[e,t]=await Promise.all([v.getSettings(),v.stats()]);this.settings=e.settings,this.info=e.readOnly,this.stats=t}catch(e){this.loadError=e.message}try{this.apk=await v.apkInfo()}catch{this.apk={available:!1}}}get canEdit(){var e;return!!((e=this.user)!=null&&e.isAdmin)}openTab(e){de(()=>{this.tab=e}),e==="diagnostics"&&!this.diag&&!this.diagBusy&&this.loadDiagnostics(),e==="storage"&&!this.storage&&!this.storageBusy&&this.loadStorage(),e==="account"&&!this.passkeyList&&this.loadPasskeys()}editLora(e,t){var n;const i=[...((n=this.settings)==null?void 0:n.libbyGenLoras)??[]];i[e]&&(i[e]={...i[e],...t},this.edit({libbyGenLoras:i}))}editCameraLora(e,t){var o;const i=[...((o=this.settings)==null?void 0:o.libbyCameraLoras)??[]];if(!i[e])return;const n={...i[e],...t};t.name&&!i[e].trigger&&(n.trigger=this.genLoraTriggers[t.name]??""),i[e]=n,this.edit({libbyCameraLoras:i})}edit(e){!this.settings||!this.canEdit||(this.settings={...this.settings,...e},this.dirty=!0,this.saved=!1)}async save(){if(this.settings){this.saving=!0;try{const e=await v.saveSettings(this.settings);this.settings=e.settings,this.info=e.readOnly,this.dirty=!1,this.saved=!0,ce(!!e.settings.incognito),this.loadTTS(!0),this.loadDescribe(),this.loadGenLists(),this.loadComfy()}catch(e){this.loadError=e.message}finally{this.saving=!1}}}pickTheme(e){this.theme=e,pe(e),he(e)}pickFit(e){this.fit=e,ue(e)}async changePassword(){if(this.pwMsg="",this.pwErr="",this.pwNew!==this.pwConfirm){this.pwErr="The new passwords don't match.";return}if(this.pwNew.length<8){this.pwErr="Use at least 8 characters.";return}this.pwBusy=!0;try{await v.changePassword(this.pwCurrent,this.pwNew),this.pwMsg="Password changed.",this.pwCurrent=this.pwNew=this.pwConfirm=""}catch(e){this.pwErr=e.message}finally{this.pwBusy=!1}}render(){if(this.only)return this.renderOnly(this.only);const e=Ve.filter(o=>!o.adminOnly||this.canEdit),t=e.find(o=>o.id===this.tab)??e[0],i=this.dirty||this.saved;let n="";return s`
      <div class="shell">
        <nav class="cat-rail" aria-label="Settings categories">
          ${e.map(o=>{const r=o.group===n?l:s`<div class="cat-head">${o.group}</div>`;return n=o.group,s`${r}
              <button
                class="cat-row ${o.id===this.tab?"on":""}"
                aria-current=${o.id===this.tab?"page":"false"}
                @click=${()=>this.openTab(o.id)}
              >
                <span class="material-symbols-rounded">${o.icon}</span>
                <span class="cat-label">${o.label}</span>
              </button>`})}
          <div class="cat-sep"></div>
          <button class="cat-row danger" @click=${()=>this.dispatchEvent(new CustomEvent("logout",{bubbles:!0,composed:!0}))}>
            <span class="material-symbols-rounded">logout</span>
            <span class="cat-label">Sign out</span>
          </button>
        </nav>

        <div class="panel-col">
          <h2 class="panel-title">${t.label}</h2>
          ${this.loadError?s`<div class="banner error">
                <span class="material-symbols-rounded" style="font-size:18px;">error</span>
                ${this.loadError}
              </div>`:l}
          ${!this.canEdit&&this.settings&&t.server?s`<div class="banner info">
                <span class="material-symbols-rounded" style="font-size:18px;">lock</span>
                Server settings are read-only — only an admin can change them.
              </div>`:l}
          ${this.renderTab()}
          ${i?this.renderSaveBar():l}
        </div>
      </div>
    `}renderOnly(e){const t={"libby-general":()=>this.renderLibby(),"libby-model":()=>this.renderLibbyModel(),"libby-voice":()=>this.renderLibbyVoice(),"libby-pictures":()=>s`${this.renderLibbyImageGen()}${this.renderLibbyReferences()}`}[e];return s`<div class="embedded">
      ${this.loadError?s`<div class="banner error"><span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.loadError}</div>`:l}
      ${!this.canEdit&&this.settings&&e!=="libby-general"?s`<div class="banner info"><span class="material-symbols-rounded" style="font-size:18px;">lock</span>Server settings are read-only — only an admin can change them.</div>`:l}
      ${t()}
      ${this.dirty||this.saved?this.renderSaveBar():l}
    </div>`}renderTab(){switch(this.tab){case"appearance":return this.renderAppearance();case"ai":return this.renderAI();case"scraping":return this.renderScraping();case"imagegen":return this.renderImageGen();case"library":return this.renderLibrary();case"android":return this.renderAndroid();case"launchy":return s`<oppai-launchy-panel></oppai-launchy-panel>`;case"account":return this.renderAccount();case"storage":return this.renderStorage();case"diagnostics":return this.renderDiagnostics();case"privacy":return this.renderPrivacy();default:return this.renderAbout()}}renderSaveBar(){return s`
      <div class="savebar">
        <span class="grow">
          ${this.saved&&!this.dirty?"Settings saved — they're live now.":"You have unsaved changes."}
        </span>
        <button class="btn-primary" ?disabled=${this.saving||!this.dirty} @click=${this.save}>
          <span class="material-symbols-rounded" style="font-size:20px;">save</span>
          ${this.saving?"Saving…":"Save"}
        </button>
      </div>
    `}renderAndroid(){const e=this.apk;return s`
      <section class="card">
        <h3><span class="material-symbols-rounded">android</span>Android app</h3>
        <p class="card-sub">
          Install the companion app straight from this server — no app store, no
          sideloading from a third party.
        </p>

        ${e===null?s`<p class="field-help">Checking…</p>`:e.available?s`
                <div class="field">
                  <div class="field-text">
                    <div class="field-label">oppailib.apk</div>
                    <div class="field-help">
                      ${k(e.size??0)} · built
                      ${new Date((e.modified??0)*1e3).toLocaleDateString()}
                      ${e.sha256?s`<br /><span style="font-family:monospace; font-size:11px;"
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
              `:s`<p class="field-help">
                No APK is bundled with this server build. Drop one at
                <code>/config/oppailib.apk</code>, or grab it from the Actions run that
                built this image.
              </p>`}
      </section>
    `}renderAppearance(){return s`
      <section class="card">
        <h3><span class="material-symbols-rounded">palette</span>Appearance</h3>
        <p class="card-sub">Per-device — applies as soon as you pick it.</p>

        <div class="field">
          <div class="field-text">
            <div class="field-label">Theme</div>
            <div class="field-help">"System" follows your OS light/dark setting.</div>
          </div>
          <div class="field-control seg">
            ${[["dark","Dark","dark_mode"],["light","Light","light_mode"],["system","System","contrast"]].map(([e,t,i])=>s`<button
                class=${this.theme===e?"on":""}
                @click=${()=>this.pickTheme(e)}
              >
                <span class="material-symbols-rounded" style="font-size:18px;">${i}</span>${t}
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
            ${[["page","Fit page","fit_screen"],["width","Fit width","fit_width"]].map(([e,t,i])=>s`<button
                class=${this.fit===e?"on":""}
                @click=${()=>this.pickFit(e)}
              >
                <span class="material-symbols-rounded" style="font-size:18px;">${i}</span>${t}
              </button>`)}
          </div>
        </div>
      </section>
    `}renderPrivacy(){const e=this.settings,t=!!(e!=null&&e.incognito);return s`
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
    `}renderLibby(){return s`
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
              @click=${()=>{this.hideLibby=!this.hideLibby,ve(this.hideLibby)}}
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
            ${fe.map(e=>s`<button
              class=${ge()===e?"on":""}
              @click=${()=>{me(e),this.requestUpdate()}}
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
    `}renderLibbyVoice(){const e=this.settings;if(!e)return l;const t=this.tts,i=(t==null?void 0:t.voices)??[],n=i.filter(a=>a.installed),o=i.filter(a=>!a.installed),r=new Set((t==null?void 0:t.downloading)??[]);return s`<section class="card">
      <h3><span class="material-symbols-rounded">record_voice_over</span>Libby’s voice</h3>
      <p class="card-sub">
        ${t===void 0?"Checking the server…":t?t.engine==="kokoro"&&t.ready?s`Speaking with <strong>Kokoro</strong>, the natural voice, on the server’s CPU. Turn playback on per device with the speaker button in Chat.`:t.engine==="piper"&&t.ready?s`Speaking with <strong>piper</strong> on the server’s CPU. Turn playback on per device with the speaker button in Chat.`:t.engine==="openai"&&t.ready?s`Speaking through the speech server at <code>${e.ttsUrl}</code>.`:s`Not speaking from the server${t.detail?s` — ${t.detail}`:l}. Devices fall back to their own voices.`:"The server did not answer about speech."}
      </p>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Engine</div>
          <div class="field-help">Auto uses the most natural voice there is — a speech server when one is set below (falling back to this box if it fails), then Kokoro, then piper. Piper is quicker and flatter; Off leaves devices to their own voices.</div>
        </div>
        <div class="field-control">
          <select ?disabled=${!this.canEdit} @change=${a=>this.edit({ttsEngine:a.target.value})}>
            ${[["auto","Auto"],["kokoro",`Kokoro — natural${t&&!t.kokoroInstalled?" (not installed)":""}`],["piper",`Piper — light${t&&!t.piperInstalled?" (not installed)":""}`],["openai","Speech server"],["off","Off"]].map(([a,u])=>s`<option value=${a} ?selected=${e.ttsEngine===a}>${u}</option>`)}
          </select>
        </div>
      </div>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Voice</div>
          <div class="field-help">${n.length?"Installed voices. Downloaded ones can be removed below.":"No voice is installed yet — download one below."}</div>
        </div>
        <div class="field-control" style="display:flex; gap:8px; align-items:center;">
          <select ?disabled=${!this.canEdit} @change=${a=>this.edit({ttsVoice:a.target.value})}>
            <option value="" ?selected=${!e.ttsVoice}>Engine’s default</option>
            ${n.map(a=>s`<option value=${a.id} ?selected=${a.id===e.ttsVoice}>${a.label}${a.bundled?" · bundled":""}</option>`)}
            ${e.ttsVoice&&!n.some(a=>a.id===e.ttsVoice)?s`<option value=${e.ttsVoice} selected>${e.ttsVoice} (not installed)</option>`:l}
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
            @input=${a=>this.edit({ttsSpeed:Number(a.target.value)})} />
        </div>
      </div>

      ${t!=null&&t.piperInstalled&&t.engine!=="kokoro"?s`<div class="field stack">
        <div class="field-text">
          <div class="field-label">Piper voices</div>
          <div class="field-help">A curated handful from piper’s voice set, fetched from Hugging Face onto the server (20–110 MB each). Any other piper voice dropped into <code>/config/tts</code> is listed too.</div>
        </div>
        <div class="field-control">
          <ul class="voice-list">
            ${n.map(a=>s`<li><span>${a.label}<small>${a.quality??""}${a.bundled?" · bundled":""}</small></span>
              ${!a.bundled&&this.canEdit?s`<button class="btn" @click=${()=>void this.deleteVoice(a.id)}>Remove</button>`:l}</li>`)}
            ${o.map(a=>s`<li><span>${a.label}<small>${a.quality??""}${a.bytes?` · ${Math.round(a.bytes/1e6)} MB`:""}</small></span>
              ${this.ttsErrors[a.id]?s`<em class="voice-error">${this.ttsErrors[a.id]}</em>`:l}
              ${r.has(a.id)?s`<span class="hint">Downloading…</span>`:this.canEdit?s`<button class="btn" @click=${()=>void this.downloadVoice(a.id)}>Download</button>`:l}</li>`)}
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
            @change=${a=>this.edit({ttsUrl:a.target.value})} />
        </div>
        <div class="field-control">
          <input type="text" autocomplete="off" placeholder="Model (default tts-1)" .value=${e.ttsModel} ?disabled=${!this.canEdit}
            @change=${a=>this.edit({ttsModel:a.target.value})} />
        </div>
        <div class="field-control">
          <input type="password" autocomplete="new-password" placeholder=${e.ttsApiKeySet?"API key saved — enter to replace":"API key (optional)"}
            .value=${e.ttsApiKey} ?disabled=${!this.canEdit}
            @change=${a=>this.edit({ttsApiKey:a.target.value})} />
        </div>
      </div>
    </section>`}async loadTTS(e=!1){var t,i;this.tts=await Z(e);try{this.ttsErrors=await v.ttsVoiceErrors()}catch{}(i=(t=this.tts)==null?void 0:t.downloading)!=null&&i.length&&window.setTimeout(()=>void this.loadTTS(!0),4e3)}async loadDescribe(){try{this.describe=await v.describeStatus()}catch{this.describe=null}}async probeVision(){this.describeBusy=!0,this.describeNote="";try{const e=await v.describeProbe();this.describeNote=`The model answered: “${e.description}”`}catch(e){this.describeNote=e.message}finally{this.describeBusy=!1}}async toggleBackfill(){var e;this.describeBusy=!0;try{(e=this.describe)!=null&&e.backfilling?await v.describeBackfillStop():await v.describeBackfill(),await this.loadDescribe()}catch(t){this.describeNote=t.message}finally{this.describeBusy=!1}}async testVoice(){ee(),await Pe("Hi. This is what I sound like. Saved to your library, by the way — nice pick.")}async downloadVoice(e){try{await v.downloadTTSVoice(e),await this.loadTTS(!0)}catch(t){this.loadError=t.message}}async deleteVoice(e){if(confirm(`Remove the ${e} voice from the server?`))try{await v.deleteTTSVoice(e),await this.loadTTS(!0)}catch(t){this.loadError=t.message}}renderLibbyModel(){const e=this.settings;return s`
      <section class="card">
        <h3><span class="material-symbols-rounded">memory</span>Her model</h3>
        <p class="card-sub">The chat backend every character talks through. Saved for the whole server.</p>
        ${e?s`
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
                    ${[["","Auto (from the model name)"],["small","Small — 7B to 13B"],["large","Large — 24B and up"]].map(([t,i])=>s`<option value=${t} ?selected=${e.chatModelTier===t}>${i}</option>`)}
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
                    ${[["","Auto (from the model name)"],["on","On — her model can see"],["off","Off — tags only"]].map(([t,i])=>s`<option value=${t} ?selected=${(e.chatVision??"")===t}>${i}</option>`)}
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
                    ${[["","Both loaded"],["swap","Swap for pictures"]].map(([t,i])=>s`<option value=${t} ?selected=${(e.gpuShare??"")===t}>${i}</option>`)}
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
                    ${[["","Auto"],["native","Native tool calls"],["json","JSON answers"]].map(([t,i])=>s`<option value=${t} ?selected=${(e.chatToolMode??"")===t}>${i}</option>`)}
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
            `:s`<div class="field-help">Loading…</div>`}
      </section>
    `}renderLibbyReferences(){return s`
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
                  ${this.refNote?s`<div class="field-help" style="color:var(--md-sys-color-error);">${this.refNote}</div>`:l}
                </div>
                <div class="field-control" style="display:flex;gap:16px;flex-wrap:wrap;">
                  ${this.referenceTile("clothed","Usual outfit")}
                  ${this.referenceTile("nude","Nothing on")}
                </div>
              </div>
      </section>
    `}renderLibbyImageGen(){var r;const e=this.settings;if(!e)return l;if(!e.imageGenEnabled)return s`<section class="card">
        <h3><span class="material-symbols-rounded">auto_awesome</span>Libby’s image generation</h3>
        <p class="card-sub">
          Set an image generator URL under <strong>Settings → Image generation</strong> and Libby can offer to make
          pictures for you in chat. She always asks first — nothing is generated or saved until
          you press Allow.
        </p>
      </section>`;const t=this.genModels,i=this.genLoras,n=e.libbyGenLoras??[],o=this.genBoards;return s`<section class="card">
      <h3><span class="material-symbols-rounded">auto_awesome</span>Libby’s image generation</h3>
      <p class="card-sub">
        What she uses when she offers to make you a picture. She always asks first — nothing is
        generated or saved until you press Allow.
        ${this.genError?s`<br /><span style="color:var(--oppai-danger,#ff6b6b);">${this.genError}</span>`:l}
      </p>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Model</div>
          <div class="field-help">The checkpoint her pictures are made with. Leave on the
            generator’s default to use whatever it loads.</div>
        </div>
        <div class="field-control">
          ${t.length?s`<select ?disabled=${!this.canEdit}
                @change=${a=>this.edit({libbyGenModel:a.target.value})}>
                <option value="" ?selected=${!e.libbyGenModel}>Generator’s default</option>
                ${t.map(a=>s`<option value=${a} ?selected=${a===e.libbyGenModel}>${a}</option>`)}
              </select>`:s`<input type="text" autocomplete="off" placeholder="Generator’s default"
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
          ${n.map((a,u)=>s`<div style="display:flex; gap:8px; align-items:center;">
            ${i.length?s`<select style="flex:1; min-width:0;" ?disabled=${!this.canEdit}
                  aria-label="LoRA ${u+1}"
                  @change=${m=>this.editLora(u,{name:m.target.value})}>
                  ${(i.includes(a.name)?i:[a.name,...i]).map(m=>s`<option value=${m} ?selected=${m===a.name}>${m}</option>`)}
                </select>`:s`<input type="text" autocomplete="off" placeholder="LoRA name" style="flex:1; min-width:0;"
                  aria-label="LoRA ${u+1}"
                  .value=${a.name} ?disabled=${!this.canEdit}
                  @change=${m=>this.editLora(u,{name:m.target.value})} />`}
            <input type="number" step="0.05" min="-2" max="2" style="width:90px;"
              aria-label="LoRA ${u+1} strength"
              .value=${String(a.weight)} ?disabled=${!this.canEdit}
              @change=${m=>this.editLora(u,{weight:Number(m.target.value)})} />
            <button class="btn-inline" title="Remove" aria-label="Remove LoRA ${u+1}" ?disabled=${!this.canEdit}
              @click=${()=>this.edit({libbyGenLoras:n.filter((m,w)=>w!==u)})}>
              <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
            </button>
          </div>`)}
          <button class="btn-inline" style="align-self:flex-start; display:inline-flex; align-items:center; gap:6px;"
            ?disabled=${!this.canEdit||n.length>=8}
            @click=${()=>this.edit({libbyGenLoras:[...n,{name:i.find(a=>!n.some(u=>u.name===a))??"",weight:1}]})}>
            <span class="material-symbols-rounded" style="font-size:18px;">add</span>
            ${n.length?"Add another LoRA":"Add a LoRA"}
          </button>
        </div>
      </div>

      ${o.length?s`<div class="field">
            <div class="field-text">
              <div class="field-label">Board</div>
              <div class="field-help">The InvokeAI board her pictures are filed into, so what she
                makes stays separate from your own generations.</div>
            </div>
            <div class="field-control">
              <select ?disabled=${!this.canEdit}
                @change=${a=>this.edit({libbyGenBoard:a.target.value})}>
                <option value="" ?selected=${!e.libbyGenBoard}>Uncategorized</option>
                ${o.map(a=>s`<option value=${a} ?selected=${a===e.libbyGenBoard}>${a}</option>`)}
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
            ${[1,2,3,4].map(a=>s`<option value=${a} ?selected=${(e.libbyCameraCandidates||2)===a}>${a}</option>`)}
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
            She can turn the last picture she sent into a few seconds of video, with the
            picture-to-video workflow under <b>Image generation → Video</b> — the same one
            Create's Video drawer uses. ${e.libbyClipUrl&&(e.libbyClipWorkflow||(r=e.clipImageModels)!=null&&r.model)?s`It is set up, so she can.`:s`It is not set up yet, so she can't.`}
          </div>
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
            ${[1,2,3,4,6].map(a=>s`<option value=${a} ?selected=${(e.libbyStoriesPerDay||2)===a}>${a} a day</option>`)}
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
    </section>`}async loadGenLists(){this.genError="";try{const e=await v.imageGenStatus();if(this.genStatus=e,!e.enabled||!e.reachable){e.enabled&&(this.genError=e.error||"The image generator isn't reachable.");return}this.genModels=(e.models??[]).map(t=>t.title||t.model_name).filter(Boolean),this.genLoras=(e.loras??[]).map(t=>t.name).filter(Boolean),this.genLoraTriggers=Object.fromEntries((e.loras??[]).map(t=>[t.name,(t.triggerPhrases??[]).join(", ")])),this.genBoards=(e.boards??[]).map(t=>t.name).filter(Boolean)}catch(e){this.genStatus=null,this.genError=e.message}}renderCameraLoras(e){const t=this.genLoras,i=e.libbyCameraLoras??[];return s`<div class="field stack">
      <div class="field-text">
        <div class="field-label">LoRAs she can choose</div>
        <div class="field-help">
          Ones she adds to a single picture when the shot calls for it — a pose, an act, a
          style — on top of the LoRAs above. Say when each one helps; that note is all she
          has to go on. Trigger words are added to the prompt with it.
        </div>
      </div>
      <div class="field-control" style="display:flex; flex-direction:column; gap:12px; align-items:stretch;">
        ${i.map((n,o)=>s`<div style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; gap:8px; align-items:center;">
            ${t.length?s`<select style="flex:1; min-width:0;" ?disabled=${!this.canEdit} aria-label="Optional LoRA ${o+1}"
                  @change=${r=>this.editCameraLora(o,{name:r.target.value})}>
                  ${(t.includes(n.name)?t:[n.name,...t]).map(r=>s`<option value=${r} ?selected=${r===n.name}>${r}</option>`)}
                </select>`:s`<input type="text" autocomplete="off" placeholder="LoRA name" style="flex:1; min-width:0;"
                  aria-label="Optional LoRA ${o+1}" .value=${n.name} ?disabled=${!this.canEdit}
                  @change=${r=>this.editCameraLora(o,{name:r.target.value})} />`}
            <input type="number" step="0.05" min="-2" max="2" style="width:90px;"
              aria-label="Optional LoRA ${o+1} strength" .value=${String(n.weight)} ?disabled=${!this.canEdit}
              @change=${r=>this.editCameraLora(o,{weight:Number(r.target.value)})} />
            <button class="btn-inline" title="Remove" aria-label="Remove optional LoRA ${o+1}" ?disabled=${!this.canEdit}
              @click=${()=>this.edit({libbyCameraLoras:i.filter((r,a)=>a!==o)})}>
              <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
            </button>
          </div>
          <input type="text" autocomplete="off" maxlength="160" placeholder="When it helps — e.g. POV shots from above"
            aria-label="When optional LoRA ${o+1} helps" .value=${n.when} ?disabled=${!this.canEdit}
            @change=${r=>this.editCameraLora(o,{when:r.target.value})} />
          <input type="text" autocomplete="off" maxlength="200" placeholder="Trigger words (optional)"
            aria-label="Optional LoRA ${o+1} trigger words" .value=${n.trigger} ?disabled=${!this.canEdit}
            @change=${r=>this.editCameraLora(o,{trigger:r.target.value})} />
        </div>`)}
        <button class="btn-inline" style="align-self:flex-start; display:inline-flex; align-items:center; gap:6px;"
          ?disabled=${!this.canEdit||i.length>=12}
          @click=${()=>{const n=t.find(o=>!i.some(r=>r.name===o))??"";this.edit({libbyCameraLoras:[...i,{name:n,weight:1,when:"",trigger:this.genLoraTriggers[n]??""}]})}}>
          <span class="material-symbols-rounded" style="font-size:18px;">add</span>
          ${i.length?"Add another":"Add one she can choose"}
        </button>
      </div>
    </div>`}renderAI(){const e=this.settings,t=this.info;return s`
      <section class="card">
        <h3><span class="material-symbols-rounded">auto_awesome</span>AI auto-tagging</h3>
        <p class="card-sub">
          Tagging runs entirely on this box — no image ever leaves it. The heuristic tagger needs no
          model; a real classifier requires an ONNX build with a model in the model directory.
        </p>

        ${e?s`
              ${this.switchField("Enable auto-tagging","Master switch. Off means no tagging at all, including the ✨ button.",e.aiEnabled,i=>this.edit({aiEnabled:i}))}
              ${this.switchField("Tag on import","Tag new uploads and imports automatically. With this off, tagging only happens when you ask for it.",e.aiAutoTag,i=>this.edit({aiAutoTag:i}),!e.aiEnabled)}

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
                    @input=${i=>this.edit({aiMinScore:Number(i.target.value)})}
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
                    @change=${i=>this.edit({aiMaxTags:Number(i.target.value)})}
                  />
                </div>
              </div>

              ${t?s`
                    ${this.readOnlyField("Active tagger","Chosen at startup.",t.aiTagger)}
                    ${this.readOnlyField("Inference device","OPPAI_AI_DEVICE — needs a restart to change.",t.aiDevice)}
                    ${this.readOnlyField("Model directory","OPPAI_AI_MODEL_DIR — needs a restart to change.",t.aiModelDir)}
                  `:l}
            `:s`<div class="field-help">Loading…</div>`}
      </section>
      ${this.renderVision()}
    `}renderVision(){const e=this.settings,t=this.describe;return s`
      <section class="card">
        <h3><span class="material-symbols-rounded">description</span>Describing pictures</h3>
        <p class="card-sub">
          A vision model on your own network writes what each picture or clip shows — who is where,
          doing what, in what style. The prose is stored encrypted, searchable from the library's search box,
          shown in the viewer, and given to Libby when a picture comes up. Any OpenAI-compatible server whose model
          accepts images works: Ollama or LM Studio with a llava, qwen-vl or gemma3 build, llama.cpp server with an mmproj.
        </p>
        ${e?s`
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
                    @change=${i=>this.edit({visionUrl:i.target.value})} />
                </div>
                <div class="field-control">
                  <input type="text" autocomplete="off" placeholder="Model name, e.g. qwen2.5vl:7b or llava" .value=${e.visionModel}
                    ?disabled=${!this.canEdit}
                    @change=${i=>this.edit({visionModel:i.target.value})} />
                </div>
                <div class="field-control">
                  <input type="password" autocomplete="new-password"
                    placeholder=${e.visionApiKeySet?"API key saved — enter to replace":"API key (optional)"}
                    .value=${e.visionApiKey} ?disabled=${!this.canEdit}
                    @change=${i=>this.edit({visionApiKey:i.target.value})} />
                </div>
              </div>
              ${this.switchField("Describe on import","Describe every new picture and clip once it has been tagged; the tags steer the model. Off means only when you ask, from the viewer.",e.visionAuto,i=>this.edit({visionAuto:i}),!e.visionUrl)}
              <div class="field">
                <div class="field-text">
                  <div class="field-label">Check the model</div>
                  <div class="field-help">
                    Sends a generated test picture and shows what comes back. Save the URL first.
                    ${this.describeNote?s`<div style="margin-top:6px; color:var(--oppai-text);">${this.describeNote}</div>`:l}
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
            `:s`<div class="field-help">Loading…</div>`}
      </section>
    `}renderScraping(){const e=this.settings;return s`
      <section class="card">
        <h3><span class="material-symbols-rounded">travel_explore</span>Import &amp; scraping</h3>
        <p class="card-sub">How OppaiLib behaves toward the sites you import from.</p>

        ${e?s`
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
                ${e.rule34ApiKeySet?s`<div class="field-control">
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

            `:s`<div class="field-help">Loading…</div>`}
      </section>
    `}renderImageGen(){const e=this.settings;return s`
      <section class="card">
        <h3><span class="material-symbols-rounded">auto_awesome</span>Image generation</h3>
        <p class="card-sub">
          The generator behind the Create tab and Libby's pictures. Prompts stay on your own
          hardware — nothing is sent to a cloud service.
        </p>
        ${e?s`
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
                    @change=${t=>this.edit({imageGenUrl:t.target.value})} />
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
                    @change=${t=>this.edit({imageGenModelsDir:t.target.value})} />
                </div>
              </div>

              ${this.renderGenCheck()}
              ${this.renderGenRestart()}
            `:s`<div class="field-help">Loading…</div>`}
      </section>

      ${this.renderVideoGen()}

      <section class="card">
        <h3><span class="material-symbols-rounded">download</span>Civitai</h3>
        <p class="card-sub">The model catalogue Create browses, links your models to and installs from.</p>
        ${e?s`
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
                    @change=${t=>this.edit({civitaiApiUrl:t.target.value})} />
                </div>
                <div class="field-control">
                  <input type="password" autocomplete="new-password"
                    placeholder=${e.civitaiKeySet?"•••••••• (unchanged)":"Civitai API key (optional)"}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({civitaiApiKey:t.target.value})} />
                </div>
                ${e.civitaiKeySet?s`<div class="field-control">
                  <button type="button" class="btn-inline" ?disabled=${!this.canEdit}
                    @click=${()=>this.edit({civitaiApiKey:"",civitaiKeySet:!1})}>Clear saved key</button>
                </div>`:l}
              </div>
            `:s`<div class="field-help">Loading…</div>`}
      </section>

      <section class="card">
        <h3><span class="material-symbols-rounded">model_training</span>LoRA training</h3>
        <p class="card-sub">The trainer Create's Train screen sends your pictures to. It runs on its own, so a run
          carries on with the browser closed.</p>
        ${e?s`
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
                    @change=${t=>this.edit({trainerUrl:t.target.value})} />
                </div>
                <div class="field-control">
                  <input type="password" autocomplete="new-password"
                    placeholder=${e.trainerTokenSet?"•••••••• (unchanged)":"Trainer token"}
                    ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({trainerToken:t.target.value})} />
                </div>
                ${e.trainerTokenSet?s`<div class="field-control">
                  <button type="button" class="btn-inline" ?disabled=${!this.canEdit}
                    @click=${()=>this.edit({trainerToken:"",trainerTokenSet:!1})}>Clear saved token</button>
                </div>`:l}
              </div>
            `:s`<div class="field-help">Loading…</div>`}
      </section>
    `}renderVideoGen(){const e=this.settings,t=(o,r,a)=>s`
      <details class="clip-paste" ?open=${a&&!!o}>
        <summary>Or paste a workflow of your own${o?a?" (in use)":" (not used while a model is picked)":""}</summary>
        <div class="field-help" style="margin:8px 0 6px;">
          For a model OppaiLib doesn't wire itself (LTX-Video, AnimateDiff, Hunyuan…): build it in ComfyUI, export it
          with <em>Workflow → Export (API)</em> and paste it here, with placeholders where a run varies, each as a whole
          value in quotes — <code>"{{prompt}}"</code>, <code>"{{negative}}"</code>, <code>"{{seed}}"</code>,
          <code>"{{image}}"</code> in a Load Image node, and optionally <code>"{{width}}"</code>, <code>"{{height}}"</code>,
          <code>"{{frames}}"</code>, <code>"{{fps}}"</code>, <code>"{{steps}}"</code>.
        </div>
        <textarea rows="4" style="width:100%;font-family:monospace;font-size:11px;" placeholder='{"3": {"class_type": "KSampler", …}}'
          .value=${o} ?disabled=${!this.canEdit}
          @change=${u=>r(u.target.value)}></textarea>
      </details>`,i=e==null?void 0:e.clipImageModels,n=e==null?void 0:e.clipTextModels;return s`
      <section class="card">
        <h3><span class="material-symbols-rounded">movie</span>Video</h3>
        <p class="card-sub">
          A few seconds of video, from words or from a picture, made by ComfyUI — Create's Video
          drawer, and Libby's clips of herself. Neither Automatic1111 nor InvokeAI makes video.
        </p>
        ${e?s`
              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">ComfyUI</div>
                  <div class="field-help">
                    The address of a ComfyUI server on your network, e.g. <code>http://192.168.1.10:8188</code>.
                    Blank turns clips off. Save it, and the files ComfyUI has are offered below.
                    ${this.comfyLine()}
                  </div>
                </div>
                <div class="field-control">
                  <input type="text" autocomplete="off" placeholder="http://comfyui:8188"
                    .value=${e.libbyClipUrl??""} ?disabled=${!this.canEdit}
                    @change=${o=>this.edit({libbyClipUrl:o.target.value})} />
                  <button type="button" class="btn-inline" ?disabled=${this.comfyBusy||!e.libbyClipUrl}
                    title="Read the lists again, after putting new files in ComfyUI's models folders"
                    @click=${()=>void this.loadComfy()}>${this.comfyBusy?"Reading…":"Refresh"}</button>
                </div>
              </div>
              <div class="field-help" style="margin:0 0 4px;">
                Where Civitai's video mode (Create → Video → <em>Find on Civitai</em>) installs to. ComfyUI has no API that
                takes a download, so the file is written straight into the folder ComfyUI loads that kind from. Map each
                folder into the OppaiLib container and give the container's side of the mapping — the folder itself, such
                as <code>…/models/loras</code>, not the models folder above it. A blank folder is not installed into.
              </div>
              ${this.renderComfyFolder("diffusion_models","Wan models folder",s`Wan diffusion models: ComfyUI's
                  <code>models/diffusion_models</code> (<code>unet</code> on an older install), or wherever its
                  <code>extra_model_paths.yaml</code> points.`,e.comfyDiffusionDir,o=>this.edit({comfyDiffusionDir:o}))}
              ${this.renderComfyFolder("checkpoints","Checkpoints folder",s`All-in-one checkpoints, which carry their
                  own text encoder and VAE: <code>models/checkpoints</code>.`,e.comfyCheckpointDir,o=>this.edit({comfyCheckpointDir:o}))}
              ${this.renderComfyFolder("loras","LoRA folder",s`Wan LoRAs: <code>models/loras</code>.`,e.comfyLoraDir,o=>this.edit({comfyLoraDir:o}))}
              ${this.renderComfyFolder("vae","VAE folder",s`VAEs: <code>models/vae</code>.`,e.comfyVaeDir,o=>this.edit({comfyVaeDir:o}))}
              <div class="field-help" style="margin:0 0 4px;">
                Wan is wired here: pick its files and OppaiLib builds the workflow. Wan 2.2's 14B models come as a
                pair — a <b>high-noise</b> model that sets out the motion over the first half of the steps and a
                <b>low-noise</b> one that finishes the detail — and each direction has its own pair
                (<code>i2v</code> from a picture, <code>t2v</code> from words). Beside them go the text encoder
                (<code>umt5_xxl</code>) and the VAE (<code>wan_2.1_vae</code>; only the 5B model uses
                <code>wan2.2_vae</code>). An all-in-one checkpoint has both inside and needs nothing beside it.
              </div>
              ${this.renderClipModels("From a picture",s`Image to video: brings a still to life — what Animate on a
                picture and Libby's clips run.`,!0,i,o=>this.edit({clipImageModels:o}))}
              ${t(e.libbyClipWorkflow??"",o=>this.edit({libbyClipWorkflow:o}),!(i!=null&&i.model))}
              ${this.renderClipModels("From words",s`Text to video: a clip from a description alone. Optional.`,!1,n,o=>this.edit({clipTextModels:o}))}
              ${t(e.clipTextWorkflow??"",o=>this.edit({clipTextWorkflow:o}),!(n!=null&&n.model))}
              ${this.renderComfyCheck()}
            `:s`<div class="field-help">Loading…</div>`}
      </section>
    `}comfyLine(){if(this.comfyErr)return s`<div class="field-status bad">${this.comfyErr}</div>`;const e=this.comfy;if(!e)return l;if(e.missing.length)return s`<div class="field-status bad">This ComfyUI has no ${e.missing.join(", ")} — it is older than Wan 2.2.
        Update it (<em>Manager → Update ComfyUI</em>, or <code>git pull</code> in its folder) and press Refresh.</div>`;const t=e.diffusion.length+e.checkpoints.length;return s`<div class="field-status ok">Found ${t} model${t===1?"":"s"}, ${e.textEncoders.length} text
      encoder${e.textEncoders.length===1?"":"s"}, ${e.vaes.length} VAE${e.vaes.length===1?"":"s"} and
      ${e.loras.length} LoRA${e.loras.length===1?"":"s"}.</div>`}async loadComfy(){var e;this.comfyBusy=!0,this.comfyErr="",v.comfyInstalls().then(({places:t})=>this.comfyFolder=t,()=>{});try{this.comfy=await v.comfyModels()}catch(t){this.comfy=null,(e=this.settings)!=null&&e.libbyClipUrl&&(this.comfyErr=t.message)}finally{this.comfyBusy=!1}}renderComfyFolder(e,t,i,n,o){var a;const r=(a=this.comfyFolder)==null?void 0:a[e];return s`<div class="field stack">
      <div class="field-text">
        <div class="field-label">${t}</div>
        <div class="field-help">
          ${i}
          ${r!=null&&r.dir?s`<div class="field-status ok">Installing into ${r.dir}.</div>`:r!=null&&r.problem?s`<div class="field-status bad">${r.problem}</div>`:l}
        </div>
      </div>
      <div class="field-control">
        <input type="text" autocomplete="off" placeholder="Not installed into"
          .value=${n??""} ?disabled=${!this.canEdit}
          @change=${u=>o(u.target.value)} />
      </div>
    </div>`}async runComfyCheck(){this.comfyCheckBusy=!0,this.comfyCheckErr="";try{this.comfyChecks=(await v.comfyCheck()).checks}catch(e){this.comfyCheckErr=e.message}finally{this.comfyCheckBusy=!1}this.loadComfy()}renderComfyCheck(){return s`<div class="field stack">
      <div class="field-text">
        <div class="field-label">Test ComfyUI</div>
        <div class="field-help">
          Asks ComfyUI what it runs on and how busy it is, checks each direction's picked files (or pasted
          workflow) against what it has, and each folder above against the files ComfyUI lists. Nothing is
          rendered or written. Save first.
        </div>
      </div>
      <div class="field-control">
        <button class="btn" ?disabled=${!this.canEdit||this.comfyCheckBusy||this.dirty} @click=${()=>void this.runComfyCheck()}>
          ${this.comfyCheckBusy?"Testing…":"Test"}
        </button>
      </div>
      ${this.comfyCheckErr?s`<div class="field-status bad">${this.comfyCheckErr}</div>`:l}
      ${this.comfyChecks?K(this.comfyChecks):l}
    </div>`}renderClipModels(e,t,i,n,o){const r=n??{model:"",checkpoint:!1,lowModel:"",textEncoder:"",vae:"",loras:[],steps:0,cfg:0,shift:0},a=this.comfy,u=h=>o({...r,...h}),m=(h,f,g)=>s`
      <option value="" ?selected=${!f}>${g}</option>
      ${(f&&!h.includes(f)?[f,...h]:h).map(y=>s`<option value=${y} ?selected=${y===f}>${y}</option>`)}`,w=(h,f,g,y,N)=>s`
      <select aria-label=${h} ?disabled=${!this.canEdit}
        @change=${ie=>N(ie.target.value)}>${m(f,g,y)}</select>`,S=(a==null?void 0:a.diffusion)??[],C=(a==null?void 0:a.checkpoints)??[],R=(a==null?void 0:a.loras)??[],_=!!r.lowModel&&!r.checkpoint,te=h=>{const f=C.includes(h)&&!S.includes(h),g=!f&&T(h)==="high";u({model:h,checkpoint:f,lowModel:g?F(h,S)||r.lowModel:""})},B=(h,f)=>u({loras:r.loras.map((g,y)=>y===h?{...g,...f}:g)}),se=h=>{const f=[{name:h,weight:1,stage:T(h)}],g=F(h,R);g&&!r.loras.some(N=>N.name===g)&&f.push({name:g,weight:1,stage:T(g)});const y=we(h)&&!r.steps&&!r.cfg?ke:{};u({loras:[...r.loras,...f],...y})},P=a?$e(a,i):null;return s`<div class="field stack">
      <div class="field-text">
        <div class="field-label">${e}</div>
        <div class="field-help">${t}</div>
      </div>
      <div class="clip-grid">
        <span>Model${_?s`<small>high noise</small>`:l}</span>
        <select aria-label="${e}: model" ?disabled=${!this.canEdit} @change=${h=>te(h.target.value)}>
          <option value="" ?selected=${!r.model}>None — ${i?"a pasted workflow, or no clips":"no clips from words"}</option>
          ${r.model&&!S.includes(r.model)&&!C.includes(r.model)?s`<option value=${r.model} selected>${r.model}</option>`:l}
          ${S.length?s`<optgroup label="Diffusion models">${S.map(h=>s`<option value=${h} ?selected=${h===r.model}>${h}</option>`)}</optgroup>`:l}
          ${C.length?s`<optgroup label="Checkpoints (all-in-one)">${C.map(h=>s`<option value=${h} ?selected=${h===r.model}>${h}</option>`)}</optgroup>`:l}
        </select>
        ${r.model&&!r.checkpoint?s`
          <span>Low noise</span>
          ${w(`${e}: low-noise model`,S,r.lowModel,"None — one model does it all (Wan 2.1, 5B)",h=>u({lowModel:h}))}
          <span>Text encoder</span>
          ${w(`${e}: text encoder`,(a==null?void 0:a.textEncoders)??[],r.textEncoder,"Pick one (umt5_xxl)",h=>u({textEncoder:h}))}
          <span>VAE</span>
          ${w(`${e}: VAE`,(a==null?void 0:a.vaes)??[],r.vae,"Pick one (wan_2.1_vae)",h=>u({vae:h}))}`:l}
        ${r.model&&r.checkpoint?s`
          <span>Text encoder</span>
          ${w(`${e}: text encoder`,(a==null?void 0:a.textEncoders)??[],r.textEncoder,"The checkpoint's own",h=>u({textEncoder:h}))}
          <span>VAE</span>
          ${w(`${e}: VAE`,(a==null?void 0:a.vaes)??[],r.vae,"The checkpoint's own",h=>u({vae:h}))}`:l}
        ${r.model?s`
          <span>LoRAs</span>
          <div class="clip-loras">
            ${r.loras.map((h,f)=>s`<div class="clip-lora">
              ${w(`${e}: LoRA ${f+1}`,R,h.name,"Pick a LoRA",g=>B(f,{name:g,stage:T(g)}))}
              <input type="number" step="0.05" min="-2" max="2" aria-label="${e}: LoRA ${f+1} strength"
                .value=${String(h.weight)} ?disabled=${!this.canEdit}
                @change=${g=>B(f,{weight:Number(g.target.value)})} />
              ${_?s`<select class="stage" aria-label="${e}: LoRA ${f+1} goes on" ?disabled=${!this.canEdit}
                @change=${g=>B(f,{stage:g.target.value})}>
                <option value="" ?selected=${!h.stage}>Both</option>
                <option value="high" ?selected=${h.stage==="high"}>High noise</option>
                <option value="low" ?selected=${h.stage==="low"}>Low noise</option>
              </select>`:l}
              <button class="btn-inline" title="Remove" aria-label="Remove LoRA ${f+1}" ?disabled=${!this.canEdit}
                @click=${()=>u({loras:r.loras.filter((g,y)=>y!==f)})}>
                <span class="material-symbols-rounded" style="font-size:18px;">delete</span></button>
            </div>`)}
            ${R.length?s`<select aria-label="${e}: add a LoRA" ?disabled=${!this.canEdit||r.loras.length>=8}
              @change=${h=>{const f=h.target;f.value&&se(f.value),f.value=""}}>
              <option value="" selected>${r.loras.length?"Add another LoRA…":"Add a LoRA…"}</option>
              ${R.filter(h=>!r.loras.some(f=>f.name===h)).map(h=>s`<option value=${h}>${h}</option>`)}
            </select>`:s`<span class="field-help">${a?"ComfyUI has no LoRAs in models/loras.":"LoRAs are listed once ComfyUI answers."}</span>`}
          </div>
          <span>Steps · CFG · shift</span>
          <div class="clip-lora">
            <input type="number" min="0" max="100" step="1" placeholder="20" aria-label="${e}: steps"
              .value=${r.steps?String(r.steps):""} ?disabled=${!this.canEdit}
              @change=${h=>u({steps:Number(h.target.value)||0})} />
            <input type="number" min="0" max="30" step="0.5" placeholder="3.5" aria-label="${e}: CFG"
              .value=${r.cfg?String(r.cfg):""} ?disabled=${!this.canEdit}
              @change=${h=>u({cfg:Number(h.target.value)||0})} />
            <input type="number" min="0" max="50" step="0.5" placeholder="8" aria-label="${e}: shift"
              .value=${r.shift?String(r.shift):""} ?disabled=${!this.canEdit}
              @change=${h=>u({shift:Number(h.target.value)||0})} />
          </div>
          <span></span>
          <div class="field-help" style="margin:0;">Blank is Wan's own: 20 steps, CFG 3.5, shift 8. A speed LoRA
            (lightx2v, Lightning) wants 4 steps and CFG 1 — adding one sets them.</div>`:l}
      </div>
      ${P&&!r.model?s`<div class="field-control">
        <button type="button" class="btn-inline" ?disabled=${!this.canEdit} @click=${()=>o(P)}>
          Pick from what's installed: ${P.model}${P.lowModel?" + its low-noise twin":""}</button>
      </div>`:l}
    </div>`}async runGenCheck(){this.genCheckBusy=!0,this.genCheckErr="";try{this.genChecks=(await v.imageGenCheck()).checks}catch(e){this.genCheckErr=e.message}finally{this.genCheckBusy=!1}this.loadGenLists()}renderGenCheck(){return s`<div class="field stack">
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
      ${this.genCheckErr?s`<div class="field-status bad">${this.genCheckErr}</div>`:l}
      ${this.genChecks?K(this.genChecks):l}
    </div>`}renderGenRestart(){const e=this.genStatus;if(!(e!=null&&e.reachable)||e.backend!=="a1111")return l;const t=this.genRestart==="Restarting…";return s`<div class="field">
      <div class="field-text">
        <div class="field-label">Restart Automatic1111</div>
        <div class="field-help">
          ${e.canRestart?"It reads ADetailer's detectors and its extensions only when it starts. Back in a minute or two; a picture it is drawing is lost.":s`It can only be restarted from here when it is started with <code>--api-server-stop</code> — add that to
                COMMANDLINE_ARGS beside <code>--api</code> and restart it by hand once.`}
        </div>
        ${this.genRestart&&!t?s`<div class="field-status">${this.genRestart}</div>`:l}
      </div>
      <div class="field-control">
        <button class="btn" ?disabled=${!this.canEdit||t} @click=${()=>void this.restartGen()}>
          ${t?"Restarting…":"Restart"}
        </button>
      </div>
    </div>`}async restartGen(){if(!confirm("Restart Automatic1111? It takes a minute or two, and a picture it is drawing now is lost."))return;this.genRestart="Restarting…";try{await v.restartGenerator()}catch(i){this.genRestart=i.message;return}const e=Date.now();let t=!1;for(;this.isConnected&&Date.now()-e<5*6e4;){await new Promise(n=>setTimeout(n,3e3));const i=await v.imageGenStatus().catch(()=>null);if(!(i!=null&&i.reachable)){t=!0;continue}if(t||Date.now()-e>45e3){this.genRestart="Automatic1111 is back.",this.loadGenLists();return}}this.genRestart="It hasn't come back yet — look at it where it runs."}genStatusLine(e){const t=this.genStatus;if(!e.imageGenUrl.trim())return l;let i,n=!1;if(this.dirty)i="Save to check it.";else if(t)if(!t.reachable)i=`Not reachable${t.error?`: ${t.error}`:"."}`,n=!0;else{const o=t.backend==="invokeai"?"InvokeAI":"Automatic1111",r=(t.models??[]).length,a=(t.loras??[]).length;i=`Connected to ${o} — ${r} ${r===1?"model":"models"}, ${a} ${a===1?"LoRA":"LoRAs"}.`}else{if(!this.genError)return s`<div class="field-status">Checking…</div>`;i=this.genError,n=!0}return s`<div class="field-status ${n?"bad":""}">${i}</div>`}modelsFolderLine(e){const t=this.genStatus;if(this.dirty)return s`<div class="field-status">Save to check it.</div>`;if(!(t!=null&&t.reachable))return l;if(t.backend==="invokeai")return s`<div class="field-status">Not needed: InvokeAI installs and edits models itself.</div>`;if(t.manageModels){const i=!(e.imageGenModelsDir??"").trim();return s`<div class="field-status ok">
        Using <code>${t.modelsDir}</code>${i?" — found mounted, so there is nothing to set":""}. Models can be installed, edited and deleted.
      </div>`}return t.modelsDirProblem?s`<div class="field-status bad">${t.modelsDirProblem}.</div>`:s`<div class="field-status">Nothing is mounted at <code>/a1111-models</code> and no path is set.</div>`}renderLibrary(){const e=this.stats;if(!e)return l;const t=new Map(e.kinds.map(i=>[i.kind,i]));return s`
      <section class="card">
        <h3><span class="material-symbols-rounded">inventory_2</span>Library</h3>
        <p class="card-sub">
          ${e.items} ${e.items===1?"item":"items"} · ${k(e.bytes)} stored ·
          ${e.tags} ${e.tags===1?"tag":"tags"}
        </p>
        <div class="stat-grid">
          ${Object.keys(G).map(i=>{const n=t.get(i);return s`<div class="stat">
              <div class="stat-num">${(n==null?void 0:n.count)??0}</div>
              <div class="stat-label">${G[i].label} · ${k((n==null?void 0:n.bytes)??0)}</div>
            </div>`})}
        </div>
      </section>
    `}renderPasskeys(){const e=this.passkeyList;return s`
      <section class="card">
        <h3><span class="material-symbols-rounded">passkey</span>Passkeys</h3>
        <p class="card-sub">
          Sign in with your device's fingerprint, face or PIN instead of typing a password.
          Nothing guessable crosses the network and the server only ever stores a public
          key — your device keeps the private half.
        </p>

        ${this.passkeyError?s`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.passkeyError}
            </div>`:l}
        ${this.passkeyMsg?s`<div class="banner ok">
              <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span>${this.passkeyMsg}
            </div>`:l}

        ${e&&!e.available?s`<div class="banner info">
              <span class="material-symbols-rounded" style="font-size:18px;">lock</span>
              ${e.reason}
            </div>`:l}

        ${e===null?s`<p class="field-help">Checking…</p>`:e.passkeys.length===0?s`<p class="field-help">
                No passkeys yet. Your password keeps working either way — it's also how you
                get back in if you lose a device.
              </p>`:s`
                <div class="pk-list">
                  ${e.passkeys.map(t=>this.renderPasskeyRow(t))}
                </div>
              `}

        ${e!=null&&e.available?s`
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

        ${e!=null&&e.relyingPartyId?s`<p class="field-help">
              Passkeys added here are tied to <code>${e.relyingPartyId}</code>. That's how
              WebAuthn works — reach OppaiLib at a different address and your device won't
              offer them, so add one per address you actually use.
            </p>`:l}
      </section>
    `}renderPasskeyRow(e){const t=this.passkeyRenaming===e.id,i=this.passkeyRevoking===e.id;return s`
      <div class="pk-row">
        <span class="material-symbols-rounded pk-icon">${e.synced?"cloud_sync":"key"}</span>
        <div class="pk-body">
          ${t?s`<div class="pk-rename">
                <input
                  type="text"
                  .value=${this.passkeyName}
                  @input=${n=>this.passkeyName=n.target.value}
                />
                <button @click=${()=>void this.savePasskeyName(e)}>Save</button>
                <button @click=${()=>this.passkeyRenaming=null}>Cancel</button>
              </div>`:s`<div class="pk-name">${e.name}</div>`}
          <div class="pk-meta">
            ${e.synced?"Synced to your account":"This device only"}
            · added ${W(e.createdAt)}
            · ${e.lastUsedAt?`last used ${W(e.lastUsedAt)}`:"never used"}
          </div>
          ${i?s`<div class="pk-revoke">
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
                  @input=${n=>this.passkeyPassword=n.target.value}
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
        ${t||i?l:s`<div class="pk-actions">
              <button title="Rename" @click=${()=>this.startRename(e)}>
                <span class="material-symbols-rounded" style="font-size:18px;">edit</span>
              </button>
              <button title="Remove" @click=${()=>this.startRevoke(e)}>
                <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
              </button>
            </div>`}
      </div>
    `}async loadPasskeys(){try{this.passkeyList=await v.passkeys()}catch(e){this.passkeyError=e.message}}startRename(e){this.passkeyRenaming=e.id,this.passkeyRevoking=null,this.passkeyName=e.name}async savePasskeyName(e){const t=this.passkeyName.trim();if(t)try{await v.renamePasskey(e.id,t),this.passkeyRenaming=null,this.passkeyName="",await this.loadPasskeys()}catch(i){this.passkeyError=i.message}}startRevoke(e){this.passkeyRevoking=e.id,this.passkeyRenaming=null,this.passkeyPassword="",this.passkeyError=""}async revokePasskey(e){this.passkeyBusy=!0,this.passkeyError="";try{await v.revokePasskey(e.id,this.passkeyPassword),this.passkeyRevoking=null,this.passkeyPassword="",this.passkeyMsg=`Removed “${e.name}”.`,await this.loadPasskeys()}catch(t){this.passkeyError=t.message}finally{this.passkeyBusy=!1}}renderAccount(){var e,t;return s`
      ${this.renderPasskeys()}
      <section class="card">
        <h3><span class="material-symbols-rounded">account_circle</span>Account</h3>
        <p class="card-sub">
          Signed in as <strong>${(e=this.user)==null?void 0:e.username}</strong>${(t=this.user)!=null&&t.isAdmin?" (admin)":""}.
        </p>

        ${this.pwErr?s`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.pwErr}
            </div>`:l}
        ${this.pwMsg?s`<div class="banner ok">
              <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span>${this.pwMsg}
            </div>`:l}

        <div class="pw">
          <input
            type="password"
            placeholder="Current password"
            autocomplete="current-password"
            .value=${this.pwCurrent}
            @input=${i=>this.pwCurrent=i.target.value}
          />
          <input
            type="password"
            placeholder="New password (8+ characters)"
            autocomplete="new-password"
            .value=${this.pwNew}
            @input=${i=>this.pwNew=i.target.value}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            autocomplete="new-password"
            .value=${this.pwConfirm}
            @input=${i=>this.pwConfirm=i.target.value}
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
    `}renderStorage(){var t;const e=this.storage;return s`
      <section class="card">
        <h3><span class="material-symbols-rounded">hard_drive</span>Storage</h3>
        <p class="card-sub">
          Where OppaiLib keeps things, and how much room is left. Nothing here lives
          inside the container image unless you left a mapping unset — which is what
          the warnings are for.
        </p>

        ${this.storageErr?s`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.storageErr}
            </div>`:l}

        ${((e==null?void 0:e.warnings)??[]).map(i=>s`<div class="banner error">
          <span class="material-symbols-rounded" style="font-size:18px;">warning</span>${i}
        </div>`)}

        <div class="diag-actions">
          <button class="btn-primary" ?disabled=${this.storageBusy} @click=${this.loadStorage}>
            <span class="material-symbols-rounded" style="font-size:20px;">refresh</span>
            ${this.storageBusy?"Reading…":"Refresh"}
          </button>
          ${(t=this.user)!=null&&t.isAdmin?s`<button ?disabled=${this.storageBusy} @click=${this.runCleanup}>
                <span class="material-symbols-rounded" style="font-size:20px;">mop</span>
                Reclaim space
              </button>`:l}
          <span class="field-help grow">
            Reclaiming removes only what can be recreated: chunks of uploads nobody
            came back to finish, and scratch files from jobs that have ended. It never
            touches your media, Libby's memories or model files.
          </span>
        </div>

        ${e?s`
              ${e.pendingBytes>0?s`<p class="field-help">
                    Uploads in progress still need about ${k(e.pendingBytes)}.
                  </p>`:l}
              ${e.mappings.map(i=>this.renderMapping(i))}
              <h4 style="margin:18px 0 6px;">Reclaimable now</h4>
              ${e.reclaimable.map(i=>s`<p class="field-help">
                ${i.label}: <strong>${k(i.bytes)}</strong>${i.note?s` — ${i.note}`:l}
              </p>`)}
            `:s`<p class="field-help">${this.storageBusy?"Reading…":"No reading yet."}</p>`}
      </section>
    `}renderMapping(e){const t=e.totalBytes>0?Math.round(e.usedBytes/e.totalBytes*100):0;return s`
      <div class="setting-row" style="display:block;">
        <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
          <strong>${e.label}</strong>
          <code style="font-size:12px; opacity:.8;">${e.path}</code>
          ${e.exists?l:s`<span class="field-help" style="color:var(--oppai-error);">not mapped</span>`}
          ${e.exists&&!e.writable?s`<span class="field-help" style="color:var(--oppai-error);">read-only</span>`:l}
        </div>
        <div style="height:6px; border-radius:999px; background:var(--oppai-surface-2); overflow:hidden; margin:6px 0;">
          <span style="display:block; height:100%; width:${t}%; background:${t>=90?"var(--oppai-error)":"var(--oppai-primary)"};"></span>
        </div>
        <p class="field-help">
          ${e.error?e.error:s`${k(e.freeBytes)} free of ${k(e.totalBytes)} (${t}% used)`}
          ${(e.contents??[]).map(i=>s` · ${i.label}: ${k(i.bytes)}${i.count?s` (${i.count})`:l}`)}
        </p>
        <p class="field-help">${e.purpose} Set with <code>${e.env}</code>.</p>
      </div>
    `}renderDiagnostics(){const e=this.diag,t=this.uiDiag;return s`
      <section class="card">
        <h3><span class="material-symbols-rounded">speed</span>Performance</h3>
        <p class="card-sub">
          Counters and latencies since the server started, or since you last reset them.
          Nothing here is sent anywhere — it's read straight off this box.
        </p>

        ${this.diagErr?s`<div class="banner error">
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

        ${e?s`
              ${e.dbWal?l:s`<div class="banner error">
                    <span class="material-symbols-rounded" style="font-size:18px;">warning</span>
                    The database isn't in WAL mode, so every query runs one at a time.
                    This is usually because it lives on a network share — move it to a
                    local disk and restart.
                  </div>`}

              <div class="stat-grid">
                ${this.diagStat("Uptime",We(e.uptimeSeconds))}
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
              ${e.metrics.timings.length===0?s`<p class="field-help">Nothing measured in this window yet.</p>`:s`
                    <div class="diag-scroll">
                      <table class="diag-table">
                        <thead>
                          <tr>
                            <th>What</th><th>Calls</th><th>Avg</th><th>p95</th><th>Worst</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${e.metrics.timings.slice(0,25).map(i=>s`<tr>
                              <td class="diag-name">${i.name}</td>
                              <td>${i.count}</td>
                              <td>${i.avgMs} ms</td>
                              <td>${i.p95Ms} ms</td>
                              <td class=${i.maxMs>=3e3?"diag-bad":""}>${i.maxMs} ms</td>
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
              ${t?s`
                    <div class="stat-grid">
                      ${this.diagStat("UI updates",String(t.updates))}
                      ${this.diagStat("Slow updates",String(t.slowUpdates))}
                      ${this.diagStat("Long tasks",`${t.longTasks} · ${Math.round(t.longTaskMs)} ms`)}
                      ${this.diagStat("Layout shift",`${t.layoutShifts} · ${t.layoutShiftScore}`)}
                    </div>
                    ${t.timings.length===0?s`<p class="field-help">No profiled component has updated in this window yet.</p>`:s`
                          <div class="diag-scroll">
                            <table class="diag-table">
                              <thead>
                                <tr><th>Component</th><th>Updates</th><th>Avg</th><th>p95</th><th>Slow</th><th>Worst</th></tr>
                              </thead>
                              <tbody>
                                ${t.timings.map(i=>s`<tr>
                                  <td class="diag-name">${i.name}</td>
                                  <td>${i.count}</td>
                                  <td>${i.avgMs} ms</td>
                                  <td>${i.p95Ms} ms</td>
                                  <td class=${i.slow?"diag-bad":""}>${i.slow}</td>
                                  <td class=${i.maxMs>16?"diag-bad":""}>${i.maxMs} ms</td>
                                </tr>`)}
                              </tbody>
                            </table>
                          </div>
                        `}
                  `:s`<p class="field-help">Refresh to read browser timings.</p>`}
            `:s`<p class="field-help">${this.diagBusy?"Reading…":"No snapshot yet."}</p>`}
      </section>
    `}renderFetchHealth(e){const t=e.metrics.counters,i=[["Fetches completed",t["scrape.fetch.ok"]??0,"Pages and listings fetched successfully."],["Retried",t["scrape.fetch.retry"]??0,"A site failed transiently and we tried again."],["Gave up",t["scrape.fetch.exhausted"]??0,"Still failing after every retry."],["Queued behind another request",t["scrape.host_queued"]??0,"A steady number here means we're fanning out wider than the site allows."],["Asked to back off",t["scrape.fetch.backoff_too_long"]??0,"A site asked for a longer wait than we'll hold a click open for."]];return i.every(([,n])=>n===0)?l:s`
      <h4 class="diag-head">Outbound fetches</h4>
      ${i.map(([n,o,r])=>o===0?l:s`<div class="diag-row"><strong>${o}</strong> ${n} <span class="field-help">— ${r}</span></div>`)}
    `}diagStat(e,t){return s`<div class="stat">
      <div class="stat-num diag-stat-num">${t}</div>
      <div class="stat-label">${e}</div>
    </div>`}renderAbout(){const e=this.info;return e?s`
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
    `:l}switchField(e,t,i,n,o=!1){const r=!this.canEdit||o;return s`
      <div class="field">
        <div class="field-text">
          <div class="field-label">${e}</div>
          <div class="field-help">${t}</div>
        </div>
        <div class="field-control">
          <button
            class="switch ${i?"on":""}"
            role="switch"
            aria-checked=${i?"true":"false"}
            aria-label=${e}
            ?disabled=${r}
            @click=${()=>n(!i)}
          ></button>
        </div>
      </div>
    `}readOnlyField(e,t,i){return s`
      <div class="field">
        <div class="field-text">
          <div class="field-label">${e}</div>
          <div class="field-help">${t}</div>
        </div>
        <div class="field-control"><span class="ro">${i}</span></div>
      </div>
    `}};c.styles=[H,j,q`
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

      /* Video: one direction's Wan files, a label beside each picker. */
      .clip-grid {
        display: grid; grid-template-columns: 136px minmax(0, 1fr); gap: 8px 12px; align-items: center;
        margin-top: 10px; font-size: 13px;
      }
      .clip-grid > span { color: var(--oppai-text-dim); }
      .clip-grid > span small { display: block; font-size: 11px; color: var(--oppai-text-muted); }
      .clip-grid select {
        min-width: 0; width: 100%; height: 40px; padding: 0 10px; border-radius: 12px; font: inherit; font-size: 13px;
        background: var(--oppai-surface-2); border: 1px solid var(--oppai-border-strong); color: var(--oppai-text);
      }
      .clip-grid select:focus { outline: none; border-color: var(--oppai-primary); }
      .clip-loras { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
      .clip-lora { display: flex; gap: 6px; align-items: center; min-width: 0; }
      .clip-lora select { flex: 1; min-width: 0; }
      .clip-lora select.stage { flex: none; width: auto; }
      .clip-lora input[type="number"] { width: 80px; flex: none; }
      @media (max-width: 560px) {
        .clip-grid { grid-template-columns: minmax(0, 1fr); gap: 4px; }
        .clip-grid > span:not(:first-child) { margin-top: 6px; }
        /* A LoRA's file name is the part worth reading; its own line, the controls under it. */
        .clip-lora { flex-wrap: wrap; }
        .clip-lora select:first-child { flex-basis: 100%; }
      }
      .clip-paste { margin: 2px 0 14px; font-size: 12px; color: var(--oppai-text-muted); }
      .clip-paste summary { cursor: pointer; padding: 4px 0; }

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
    `];p([Q({attribute:!1})],c.prototype,"user",2);p([Q({attribute:!1})],c.prototype,"only",2);p([d()],c.prototype,"tab",2);p([d()],c.prototype,"settings",2);p([d()],c.prototype,"info",2);p([d()],c.prototype,"stats",2);p([d()],c.prototype,"apk",2);p([d()],c.prototype,"loadError",2);p([d()],c.prototype,"passkeyList",2);p([d()],c.prototype,"passkeyBusy",2);p([d()],c.prototype,"passkeyError",2);p([d()],c.prototype,"passkeyMsg",2);p([d()],c.prototype,"passkeyName",2);p([d()],c.prototype,"passkeyRenaming",2);p([d()],c.prototype,"passkeyRevoking",2);p([d()],c.prototype,"passkeyPassword",2);p([d()],c.prototype,"diag",2);p([d()],c.prototype,"uiDiag",2);p([d()],c.prototype,"storage",2);p([d()],c.prototype,"storageBusy",2);p([d()],c.prototype,"storageErr",2);p([d()],c.prototype,"diagBusy",2);p([d()],c.prototype,"diagErr",2);p([d()],c.prototype,"dirty",2);p([d()],c.prototype,"saving",2);p([d()],c.prototype,"saved",2);p([d()],c.prototype,"theme",2);p([d()],c.prototype,"fit",2);p([d()],c.prototype,"hideLibby",2);p([d()],c.prototype,"genModels",2);p([d()],c.prototype,"genLoras",2);p([d()],c.prototype,"genLoraTriggers",2);p([d()],c.prototype,"genBoards",2);p([d()],c.prototype,"genError",2);p([d()],c.prototype,"genStatus",2);p([d()],c.prototype,"genChecks",2);p([d()],c.prototype,"genCheckBusy",2);p([d()],c.prototype,"genRestart",2);p([d()],c.prototype,"genCheckErr",2);p([d()],c.prototype,"comfy",2);p([d()],c.prototype,"comfyErr",2);p([d()],c.prototype,"comfyBusy",2);p([d()],c.prototype,"comfyFolder",2);p([d()],c.prototype,"comfyChecks",2);p([d()],c.prototype,"comfyCheckBusy",2);p([d()],c.prototype,"comfyCheckErr",2);p([d()],c.prototype,"pwCurrent",2);p([d()],c.prototype,"pwNew",2);p([d()],c.prototype,"pwConfirm",2);p([d()],c.prototype,"pwBusy",2);p([d()],c.prototype,"pwMsg",2);p([d()],c.prototype,"pwErr",2);p([d()],c.prototype,"refs",2);p([d()],c.prototype,"refStamp",2);p([d()],c.prototype,"refNote",2);p([d()],c.prototype,"tts",2);p([d()],c.prototype,"describe",2);p([d()],c.prototype,"describeBusy",2);p([d()],c.prototype,"describeNote",2);p([d()],c.prototype,"ttsErrors",2);c=p([J("oppai-settings")],c);function W(e){if(!e)return"never";const t=Math.max(0,(Date.now()-e)/1e3);if(t<90)return"just now";const i=Math.round(t/60);if(i<60)return`${i} min ago`;const n=Math.round(i/60);if(n<24)return`${n}h ago`;const o=Math.round(n/24);return o<=30?`${o} day${o===1?"":"s"} ago`:new Date(e).toLocaleDateString()}function We(e){const t=Math.max(0,Math.floor(e)),i=Math.floor(t/86400),n=Math.floor(t%86400/3600),o=Math.floor(t%3600/60);return i>0?`${i}d ${n}h`:n>0?`${n}h ${o}m`:o>0?`${o}m ${t%60}s`:`${t}s`}function k(e){if(!e)return"0 B";const t=["B","KB","MB","GB","TB"];let i=e,n=0;for(;i>=1024&&n<t.length-1;)i/=1024,n++;return`${i<10&&n>0?i.toFixed(1):Math.round(i)} ${t[n]}`}function K(e){return s`<ul class="checks">
    ${e.map(t=>s`<li class=${t.skipped?"skip":t.ok?"ok":"bad"}>
      <span class="material-symbols-rounded">${t.skipped?"info":t.ok?"check_circle":"error"}</span>
      <span><strong>${t.label}</strong> — ${t.detail}</span>
    </li>`)}
  </ul>`}const Qe=Object.freeze(Object.defineProperty({__proto__:null,get OppaiSettings(){return c}},Symbol.toStringTag,{value:"Module"}));export{Je as a,ee as b,Qe as c,Ye as l,Pe as s};
