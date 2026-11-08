import{z as Oe,q as dt,i as Ne,u,a as ze,e as C,m as Y,A as c,b as n,t as _e,v as Ce,ad as He,ap as Lt,aq as je,ar as Mt,as as St,at as Je,au as Et,x as Tt,av as Xe,aw as It,ax as Rt,ay as Dt,az as Bt,aA as Ft,aB as Ot,aC as Nt,aD as zt,aE as _t,aF as Ut,aG as Qe}from"./index-DEVp1m1r.js";import{r as Vt,p as Gt}from"./passkeys-B6bwfQgp.js";import{k as Kt,h as Wt,i as Ze,l as ke,n as et,o as qt,S as tt}from"./model-manage-CgHSouqh.js";import{l as Yt,a as Ht,s as $e,b as Ee,D as jt,d as Jt}from"./launchy-xyl1VS8H.js";const Xt=160,Qt=220;function Zt(e){var d;const t=e.trim();if(t.length<=Xt)return t?[t]:[];const a=((d=t.match(/[^.!?…\n]+(?:[.!?…]+["”')]*|\n|$)/g))==null?void 0:d.map(h=>h.trim()).filter(Boolean))??[t],[s,...i]=a,o=[s];let r="";for(const h of i)r&&r.length+h.length+1>Qt&&(o.push(r),r=""),r=r?`${r} ${h}`:h;return r&&o.push(r),o}const ct="oppai_libby_speak";function Ja(){try{return localStorage.getItem(ct)==="1"}catch{return!1}}function Xa(e){try{localStorage.setItem(ct,e?"1":"0")}catch{}e||pt(),window.dispatchEvent(new CustomEvent("oppai-libby-speak",{detail:{on:e}}))}let pe=null,at=0;async function ht(e=!1){if(!e&&pe&&Date.now()-at<6e4)return pe;try{const t=await fetch("/api/tts/status",{credentials:"same-origin"});if(!t.ok)throw new Error(String(t.status));pe=await t.json(),at=Date.now()}catch{pe=null}return pe}const xe=[];let de=null,Te=!1,he=0,Re=Promise.resolve();function ea(e,t=0){const a=Zt(e);if(!a.length)return Promise.resolve();const s=he,i=a.map(o=>new Promise(r=>{const d=Re.then(()=>s===he?sa(o,t):null);Re=d.catch(()=>null),xe.push({text:o,heat:t,audio:d,done:r})}));return ta(),Promise.all(i).then(()=>{})}let De=!1;function Ue(e){De!==e&&(De=e,window.dispatchEvent(new CustomEvent("oppai-libby-speaking",{detail:{on:e}})))}function Qa(){return De}function pt(){var e;Ue(!1),he++,Re=Promise.resolve();for(const t of xe.splice(0))t.done();de&&(de.pause(),de.src="",de=null);try{(e=window.speechSynthesis)==null||e.cancel()}catch{}}async function ta(){if(!Te){Te=!0;try{for(;xe.length;){const e=xe.shift(),t=he;try{await aa(e,t)}catch{}finally{e.done()}}}finally{Te=!1,Ue(!1)}}}async function aa(e,t){const a=await e.audio.catch(()=>null);if(t===he){if(Ue(!0),a){await ia(a,t);return}await ra(e.text,t)}}async function sa(e,t){const a=await ht();if(a&&!a.engine)return null;try{const s=await fetch("/api/tts/speak",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:e,heat:t||void 0})});return s.status===503?(pe=null,null):s.ok?await s.blob():null}catch{return null}}function ia(e,t){return new Promise(a=>{const s=URL.createObjectURL(e),i=new Audio(s);de=i;const o=()=>{de===i&&(de=null),URL.revokeObjectURL(s),a()};i.addEventListener("ended",o,{once:!0}),i.addEventListener("error",o,{once:!0}),i.play().catch(()=>{o()}),t!==he&&o()})}function ra(e,t){const a=window.speechSynthesis;return!a||typeof SpeechSynthesisUtterance>"u"?Promise.resolve():new Promise(s=>{const i=new SpeechSynthesisUtterance(e),o=oa(a.getVoices());if(o&&(i.voice=o),i.rate=1.02,i.pitch=1.05,i.onend=()=>s(),i.onerror=()=>s(),t!==he){s();return}a.speak(i)})}function oa(e){const t=e.filter(i=>/^en/i.test(i.lang)),a=t.length?t:e,s=i=>{let o=0;const r=i.name.toLowerCase();return/natural|neural|premium|enhanced/.test(r)&&(o+=4),/female|woman|aria|jenny|samantha|zira|karen|moira|tessa|fiona|libby|sonia|ava|allison|susan|emma/.test(r)&&(o+=3),/google/.test(r)&&(o+=1),i.default&&(o+=1),o};return[...a].sort((i,o)=>s(o)-s(i))[0]}var na=Object.defineProperty,la=Object.getOwnPropertyDescriptor,se=(e,t,a,s)=>{for(var i=s>1?void 0:s?la(t,a):t,o=e.length-1,r;o>=0;o--)(r=e[o])&&(i=(s?r(t,a,i):r(i))||i);return s&&i&&na(t,a,i),i};const da={itch:"itch.io",f95:"F95zone"},ca=4e3;let j=class extends ze{constructor(){super(...arguments),this.status=null,this.keys=null,this.loadError="",this.link="",this.linkExpires=0,this.linking=!1,this.busy={},this.removals=null,this.timer=null,this.linkIssuedAt=0}connectedCallback(){super.connectedCallback(),this.refresh(),this.loadKeys(),this.timer=window.setInterval(()=>void this.refresh(),ca)}disconnectedCallback(){super.disconnectedCallback(),this.timer!=null&&clearInterval(this.timer),this.timer=null}async refresh(){try{this.status=await C.launchyStatus(),this.loadError=""}catch(e){this.loadError=e.message}if(this.removals=await C.launchyRemovals().catch(()=>this.removals),this.link)if(Date.now()/1e3>this.linkExpires)this.link="";else{await this.loadKeys();const e=(this.keys??[]).find(t=>t.createdAt>=this.linkIssuedAt);e&&(this.link="",Y(`Launchy on ${e.name} is linked.`))}}async letRemovalsBack(){this.busy={...this.busy,removals:!0};try{await C.forgetLaunchyRemovals(),this.removals={removed:0,declined:0},Y("They'll come back with the next sync.")}catch(e){Y(`Couldn't do that: ${e.message}`,"error")}finally{this.busy={...this.busy,removals:!1}}}async loadKeys(){try{this.keys=(await C.launchyKeys()).items}catch(e){this.loadError=e.message}}async makeLink(){this.linking=!0;try{const{code:e,expiresAt:t}=await C.launchyPairing();this.linkIssuedAt=Math.floor(Date.now()/1e3)-5,this.link=Yt(location.origin,e),this.linkExpires=t,window.location.assign(this.link)}catch(e){Y(e.message,"error")}finally{this.linking=!1}}async copyLink(e){var a;const t=(a=e.currentTarget.parentElement)==null?void 0:a.querySelector("input");try{await navigator.clipboard.writeText(this.link),Y("Copied the link.")}catch{t==null||t.select(),Y("Press Ctrl+C to copy the selected link.")}}async revoke(e){if(confirm(`Unlink Launchy on ${e.name}? It stops syncing until it is linked again.`))try{await C.revokeLaunchyKey(e.id),await this.loadKeys()}catch(t){Y(t.message,"error")}}async run(e,t,a){this.busy={...this.busy,[e]:!0};try{const s=await C.launchyRequest(t),i=await Ht(C.launchyRequestStatus,s.id,{timeout:t.action==="sync"?18e4:6e4});i.status==="done"?Y(i.message||a):Y(i.error||"Launchy could not do that.","error")}catch(s){Y(s.message,"error")}finally{this.busy={...this.busy,[e]:!1},this.refresh()}}render(){return n`
      ${this.loadError?n`<div class="banner error"><span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.loadError}</div>`:c}
      ${this.renderLink()}
      ${this.renderPC()}
      ${this.renderRunning()}
      ${this.renderDownloads()}
    `}renderLink(){const e=this.keys??[];return n`
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
        ${this.link?n`<div class="linkbox">
              <input readonly .value=${this.link} @focus=${t=>t.target.select()} />
              <a class="btn-inline" href=${this.link}><span class="material-symbols-rounded">open_in_new</span>Open Launchy</a>
              <button class="btn-inline" @click=${t=>void this.copyLink(t)}>
                <span class="material-symbols-rounded">content_copy</span>Copy
              </button>
              <div class="help" style="flex-basis:100%;">
                Nothing happened? Launchy 0.5 or newer registers the link when it is installed — or paste it
                into Launchy under Settings → OppaiLib.
              </div>
            </div>`:c}
        ${e.map(t=>n`<div class="row">
            <span class="material-symbols-rounded" style="font-size:18px; color:var(--oppai-text-muted);">key</span>
            <div class="grow">
              <div class="label">${t.name}</div>
              <div class="help">
                Key …${t.hint} · linked ${new Date(t.createdAt*1e3).toLocaleDateString()} ·
                ${t.lastUsedAt?`last used ${$e(t.lastUsedAt)}`:"not used yet"}
              </div>
            </div>
            <button class="btn-inline" @click=${()=>void this.revoke(t)}>
              <span class="material-symbols-rounded">link_off</span>Unlink
            </button>
          </div>`)}
      </section>
    `}renderPC(){var a,s,i,o;const e=this.status;if(!e)return c;const t=!!e.reportedAt;return n`
      <section class="card">
        <h3><span class="material-symbols-rounded">sports_esports</span>The PC</h3>
        <div class="row">
          <span class="dot ${e.connected?"on":""}"></span>
          <div class="grow">
            <div class="label">${e.connected?`Launchy is running on ${e.name||"the PC"}`:"Launchy is offline"}</div>
            <div class="help">
              ${e.version?`Version ${e.version} · `:""}last checked in ${$e(e.lastSeen)}
              ${e.connected&&!t?n` · <span class="warn">an older Launchy — update it to control it from here</span>`:c}
            </div>
          </div>
          ${Ee(e,"sync")?n`<button class="btn-inline" ?disabled=${this.busy.sync||((a=e.sync)==null?void 0:a.running)}
                @click=${()=>void this.run("sync",{action:"sync"},"Synced.")}>
                <span class="material-symbols-rounded">sync</span>${this.busy.sync||(s=e.sync)!=null&&s.running?"Syncing…":"Sync now"}
              </button>`:c}
        </div>
        ${(i=e.sync)!=null&&i.lastSync||(o=e.sync)!=null&&o.lastError?n`<div class="row"><div class="grow">
              <div class="label">Library sync</div>
              <div class="help">
                ${e.sync.lastSync?`Last synced ${$e(e.sync.lastSync)}`:"Not synced yet"}
                ${e.sync.lastError?n` · <span class="warn">${e.sync.lastError}</span>`:c}
              </div>
            </div></div>`:c}
        ${this.renderRemovals()}
        ${(e.accounts??[]).map(r=>n`<div class="row">
            <span class="dot ${r.challenged?"warn":r.signedIn?"on":""}"></span>
            <div class="grow">
              <div class="label">${da[r.site]??r.site}</div>
              <div class="help">
                ${r.challenged?n`<span class="warn">Wants a person to prove they are one — press Verify next to it in Launchy on the PC.</span>`:r.signedIn?`Signed in${r.user?` as ${r.user}`:""} in Launchy`:"Not signed in in Launchy — sign in there, under Settings → Accounts"}
              </div>
            </div>
          </div>`)}
      </section>
    `}renderRemovals(){const e=this.removals;if(!e||!e.removed&&!e.declined)return c;const t=[e.removed?`${e.removed} deleted here`:"",e.declined?`${e.declined} removed from Launchy`:""].filter(Boolean);return n`<div class="row">
      <div class="grow">
        <div class="label">Kept out of the sync</div>
        <div class="help">${t.join(" · ")} — the sync won't bring ${e.removed+e.declined===1?"it":"them"} back</div>
      </div>
      <button class="btn-inline" ?disabled=${this.busy.removals} @click=${()=>void this.letRemovalsBack()}>
        <span class="material-symbols-rounded">undo</span>Let them back
      </button>
    </div>`}renderRunning(){const e=this.status;if(!(e!=null&&e.connected)||!e.reportedAt)return c;const t=e.sessions??[];return n`
      <section class="card">
        <h3><span class="material-symbols-rounded">play_arrow</span>Running</h3>
        ${t.length===0?n`<div class="empty">Nothing is running on the PC.</div>`:c}
        ${t.map(a=>{const s=`stop:${a.gameId}`;return n`<div class="row">
            <div class="grow">
              <div class="label">${a.title||"A game"}</div>
              <div class="help">Started ${$e(a.startedAt)}</div>
            </div>
            ${Ee(e,"stop")?n`<button class="btn-inline" ?disabled=${this.busy[s]}
                  @click=${()=>{confirm(`Close ${a.title||"this game"} on the PC? Anything unsaved in it is lost.`)&&this.run(s,{action:"stop",gameId:a.gameId},"Closed.")}}>
                  <span class="material-symbols-rounded">stop_circle</span>${this.busy[s]?"Closing…":"Close"}
                </button>`:c}
          </div>`})}
      </section>
    `}renderDownloads(){const e=this.status;if(!(e!=null&&e.connected)||!e.reportedAt)return c;const t=e.downloads??[];return t.length?n`
      <section class="card">
        <h3><span class="material-symbols-rounded">download</span>Downloads on the PC</h3>
        ${t.map(a=>{const s=`cancel:${a.id}`;return n`<div class="row">
            <div class="grow">
              <div class="label">${a.title}${a.label?n` <span class="help">· ${a.label}</span>`:c}</div>
              <div class="help">
                ${jt[a.status]??a.status}${a.message?` — ${a.message}`:""}
              </div>
            </div>
            ${Jt(a)&&Ee(e,"download")?n`<button class="btn-inline" ?disabled=${this.busy[s]}
                  @click=${()=>void this.run(s,{action:"cancel-download",downloadId:a.id},"Cancelled.")}>
                  <span class="material-symbols-rounded">close</span>Cancel
                </button>`:c}
          </div>`})}
      </section>
    `:c}};j.styles=[Oe,dt,Ne`
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
    `];se([u()],j.prototype,"status",2);se([u()],j.prototype,"keys",2);se([u()],j.prototype,"loadError",2);se([u()],j.prototype,"link",2);se([u()],j.prototype,"linkExpires",2);se([u()],j.prototype,"linking",2);se([u()],j.prototype,"busy",2);se([u()],j.prototype,"removals",2);j=se([_e("oppai-launchy-panel")],j);const Ve=[{id:"checkpoints",label:"Checkpoints",one:"checkpoint"},{id:"loras",label:"LoRAs",one:"LoRA"},{id:"vae",label:"VAEs",one:"VAE"}],ue=(e,t,a=`${t}s`)=>`${e} ${e===1?t:a}`;function ha(e){var t;return((t=Ve.find(a=>a.id===e))==null?void 0:t.label)??e}function pa(e){return e.files>0}function ua(e,t){const a=[];if(e.files>0){const s=Ve.filter(i=>e.byKind[i.id]).map(i=>ue(e.byKind[i.id],i.one));a.push(`${s.join(", ")} to bring across, ${t(e.bytes)}.`)}else a.push("Nothing to bring across.");e.have>0&&a.push(`${ue(e.have,"file")} already there.`),e.clashes>0&&a.push(`${ue(e.clashes,"file")} there by the same name but a different size, left alone.`);for(const s of e.missing)a.push(`${ha(s)} are skipped: the other side has no folder for them.`);return a.join(" ")}function fa(e,t){return!e.free||e.bytes<=e.free?"":`That is more than the ${t(e.free)} free there. It only fits if both folders are on one disk, where files are linked and take no room.`}function ma(e){return e.bytes>0?Math.min(1,e.doneBytes/e.bytes):e.files>0?Math.min(1,e.done/e.files):1}function ga(e){const t=`${e.from} to ${e.to}`;switch(e.state){case"running":return`${e.done} of ${ue(e.files,"file")} from ${t}`;case"failed":return`${t} stopped at ${e.done} of ${ue(e.files,"file")}: ${e.error??"something went wrong"}`;case"stopped":return`${t} stopped at ${e.done} of ${ue(e.files,"file")}. Running it again carries on from there.`}const a=[e.linked?`${e.linked} linked, taking no room`:"",e.copied?`${e.copied} copied`:"",e.have?`${e.have} already there`:"",e.clashes?`${e.clashes} left alone, a different file by that name`:""].filter(Boolean).join(", ");return`${t} finished${a?`: ${a}`:""}. The originals are still where they were.`}var ya=Object.defineProperty,ba=Object.getOwnPropertyDescriptor,Q=(e,t,a,s)=>{for(var i=s>1?void 0:s?ba(t,a):t,o=e.length-1,r;o>=0;o--)(r=e[o])&&(i=(s?r(t,a,i):r(i))||i);return s&&i&&ya(t,a,i),i};const va=2e3;let K=class extends ze{constructor(){super(...arguments),this.canEdit=!1,this.places=[],this.job=null,this.from="models",this.to="comfy",this.kinds=new Set(["checkpoints","loras","vae"]),this.plan=null,this.busy=!1,this.error="",this.timer=0}connectedCallback(){super.connectedCallback(),this.load()}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this.timer)}async load(){var e;try{const t=await C.modelTransfer();this.places=t.places,this.job=t.job,this.error="",window.clearTimeout(this.timer),((e=t.job)==null?void 0:e.state)==="running"&&(this.timer=window.setTimeout(()=>void this.load(),va))}catch(t){this.error=t.message}}place(e){return this.places.find(t=>t.id===e)}get request(){return{from:this.from,to:this.to,kinds:[...this.kinds]}}pick(e,t){var s;this[e]=t;const a=e==="from"?"to":"from";this[a]===t&&(this[a]=((s=this.places.find(i=>i.id!==t))==null?void 0:s.id)??this[a]),this.plan=null,this.error=""}toggleKind(e){const t=new Set(this.kinds);t.delete(e)||t.add(e),this.kinds=t,this.plan=null}async look(){this.busy=!0,this.error="";try{this.plan=await C.planModelTransfer(this.request)}catch(e){this.plan=null,this.error=e.message}finally{this.busy=!1}}async start(){this.busy=!0,this.error="";try{this.job=await C.startModelTransfer(this.request),this.plan=null,this.load()}catch(e){this.error=e.message}finally{this.busy=!1}}async stop(){try{await C.stopModelTransfer(),this.load()}catch(e){this.error=e.message}}renderSide(e,t){const a=this.place(this[e]),s=a?Object.values(a.dirs)[0]:"";return n`<label>${t}
      <select aria-label=${t} ?disabled=${!this.canEdit} .value=${this[e]}
        @change=${i=>this.pick(e,i.target.value)}>
        ${this.places.map(i=>n`<option value=${i.id} ?selected=${i.id===this[e]}>${i.label}</option>`)}
      </select>
      ${a!=null&&a.problem?n`<span class="dir bad">${a.problem}</span>`:n`<span class="dir">${s??""}</span>`}
    </label>`}render(){var i,o;const e=this.job,t=(e==null?void 0:e.state)==="running",a=!((i=this.place(this.from))!=null&&i.problem)&&!((o=this.place(this.to))!=null&&o.problem),s=this.plan?fa(this.plan,He):"";return n`
      <div class="route">
        ${this.renderSide("from","From")}
        <span class="material-symbols-rounded">arrow_forward</span>
        ${this.renderSide("to","To")}
      </div>
      <div class="kinds" role="group" aria-label="What to transfer">
        ${Ve.map(r=>n`<label><input type="checkbox" .checked=${this.kinds.has(r.id)} ?disabled=${!this.canEdit}
          @change=${()=>this.toggleKind(r.id)} />${r.label}</label>`)}
      </div>
      ${this.plan?n`<div class="note">${ua(this.plan,He)}</div>`:c}
      ${s?n`<div class="note warn">${s}</div>`:c}
      ${this.error?n`<div class="note bad">${this.error}</div>`:c}
      ${t?n`<div class="bar"><span style=${`width:${Math.round(ma(e)*100)}%`}></span></div>`:c}
      ${e?n`<div class="note ${e.state==="failed"?"bad":""}" role="status">${ga(e)}</div>`:c}
      ${t&&e.current?n`<div class="current">${e.current}</div>`:c}
      <div class="actions">
        ${t?n`<button @click=${()=>void this.stop()}><span class="material-symbols-rounded">stop_circle</span>Stop</button>`:n`
            <button ?disabled=${!this.canEdit||this.busy||!a||!this.kinds.size} @click=${()=>void this.look()}>
              <span class="material-symbols-rounded">swap_horiz</span>See what would move</button>
            ${this.plan&&pa(this.plan)?n`<button class="primary" ?disabled=${!this.canEdit||this.busy} @click=${()=>void this.start()}>
              <span class="material-symbols-rounded">drive_file_move</span>Transfer</button>`:c}`}
      </div>`}};K.styles=[Oe,Ne`
    :host { display: block; }
    .route { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; }
    .route label { display: grid; gap: 4px; flex: 1 1 180px; min-width: 0; font-size: 12px; color: var(--oppai-text-muted); }
    .route .material-symbols-rounded { color: var(--oppai-text-muted); margin-top: 18px; }
    select { height: 38px; border-radius: 10px; border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text); font: inherit; font-size: 13px; padding: 0 8px; min-width: 0; width: 100%; }
    select option { background: var(--oppai-surface, #1b1512); color: var(--oppai-text); }
    .dir { font-size: 11.5px; color: var(--oppai-text-muted); overflow-wrap: anywhere; min-height: 15px; }
    .dir.bad { color: var(--oppai-error); }
    .kinds { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 12px; font-size: 13px; color: var(--oppai-text-dim); }
    .kinds label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    button { border: 1px solid var(--oppai-border-strong); border-radius: 10px; background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 13px; padding: 8px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    button.primary { background: var(--oppai-primary); color: var(--oppai-on-primary); border-color: transparent; font-weight: 600; }
    button[disabled] { opacity: 0.5; cursor: default; }
    button .material-symbols-rounded { font-size: 17px; }
    .note { margin-top: 10px; font-size: 12.5px; line-height: 1.45; color: var(--oppai-text-dim); }
    .note.warn { color: var(--oppai-primary-bright); }
    .note.bad { color: var(--oppai-error); }
    .bar { height: 6px; border-radius: 3px; background: var(--oppai-border-strong); overflow: hidden; margin-top: 12px; }
    .bar span { display: block; height: 100%; background: var(--oppai-primary); transition: width 0.4s; }
    .current { font-size: 11.5px; color: var(--oppai-text-muted); margin-top: 4px; overflow-wrap: anywhere; }
  `];Q([Ce({type:Boolean})],K.prototype,"canEdit",2);Q([u()],K.prototype,"places",2);Q([u()],K.prototype,"job",2);Q([u()],K.prototype,"from",2);Q([u()],K.prototype,"to",2);Q([u()],K.prototype,"kinds",2);Q([u()],K.prototype,"plan",2);Q([u()],K.prototype,"busy",2);Q([u()],K.prototype,"error",2);K=Q([_e("oppai-model-transfer")],K);/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function U(e){return e<0?-1:e===0?0:1}function ge(e,t,a){return(1-a)*e+a*t}function wa(e,t,a){return a<e?e:a>t?t:a}function Ae(e,t,a){return a<e?e:a>t?t:a}function le(e){return e=e%360,e<0&&(e=e+360),e}function Be(e,t){const a=e[0]*t[0][0]+e[1]*t[0][1]+e[2]*t[0][2],s=e[0]*t[1][0]+e[1]*t[1][1]+e[2]*t[1][2],i=e[0]*t[2][0]+e[1]*t[2][1]+e[2]*t[2][2];return[a,s,i]}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ka=[[.41233895,.35762064,.18051042],[.2126,.7152,.0722],[.01932141,.11916382,.95034478]],$a=[[3.2413774792388685,-1.5376652402851851,-.49885366846268053],[-.9691452513005321,1.8758853451067872,.04156585616912061],[.05562093689691305,-.20395524564742123,1.0571799111220335]],xa=[95.047,100,108.883];function Ge(e,t,a){return(255<<24|(e&255)<<16|(t&255)<<8|a&255)>>>0}function st(e){const t=ce(e[0]),a=ce(e[1]),s=ce(e[2]);return Ge(t,a,s)}function ut(e){return e>>16&255}function ft(e){return e>>8&255}function mt(e){return e&255}function Aa(e,t,a){const s=$a,i=s[0][0]*e+s[0][1]*t+s[0][2]*a,o=s[1][0]*e+s[1][1]*t+s[1][2]*a,r=s[2][0]*e+s[2][1]*t+s[2][2]*a,d=ce(i),h=ce(o),f=ce(r);return Ge(d,h,f)}function Ca(e){const t=fe(ut(e)),a=fe(ft(e)),s=fe(mt(e));return Be([t,a,s],ka)}function Pa(e){const t=ne(e),a=ce(t);return Ge(a,a,a)}function it(e){const t=Ca(e)[1];return 116*gt(t/100)-16}function ne(e){return 100*Ma((e+16)/116)}function Fe(e){return gt(e/100)*116-16}function fe(e){const t=e/255;return t<=.040449936?t/12.92*100:Math.pow((t+.055)/1.055,2.4)*100}function ce(e){const t=e/100;let a=0;return t<=.0031308?a=t*12.92:a=1.055*Math.pow(t,1/2.4)-.055,wa(0,255,Math.round(a*255))}function La(){return xa}function gt(e){const t=.008856451679035631,a=24389/27;return e>t?Math.pow(e,1/3):(a*e+16)/116}function Ma(e){const t=.008856451679035631,a=24389/27,s=e*e*e;return s>t?s:(116*e-16)/a}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class X{static make(t=La(),a=200/Math.PI*ne(50)/100,s=50,i=2,o=!1){const r=t,d=r[0]*.401288+r[1]*.650173+r[2]*-.051461,h=r[0]*-.250268+r[1]*1.204414+r[2]*.045854,f=r[0]*-.002079+r[1]*.048952+r[2]*.953127,y=.8+i/10,x=y>=.9?ge(.59,.69,(y-.9)*10):ge(.525,.59,(y-.8)*10);let A=o?1:y*(1-1/3.6*Math.exp((-a-42)/92));A=A>1?1:A<0?0:A;const E=y,S=[A*(100/d)+1-A,A*(100/h)+1-A,A*(100/f)+1-A],L=1/(5*a+1),T=L*L*L*L,R=1-T,p=T*a+.1*R*R*Math.cbrt(5*a),b=ne(s)/t[1],M=1.48+Math.sqrt(b),k=.725/Math.pow(b,.2),B=k,I=[Math.pow(p*S[0]*d/100,.42),Math.pow(p*S[1]*h/100,.42),Math.pow(p*S[2]*f/100,.42)],O=[400*I[0]/(I[0]+27.13),400*I[1]/(I[1]+27.13),400*I[2]/(I[2]+27.13)],z=(2*O[0]+O[1]+.05*O[2])*k;return new X(b,z,k,B,x,E,S,p,Math.pow(p,.25),M)}constructor(t,a,s,i,o,r,d,h,f,y){this.n=t,this.aw=a,this.nbb=s,this.ncb=i,this.c=o,this.nc=r,this.rgbD=d,this.fl=h,this.fLRoot=f,this.z=y}}X.DEFAULT=X.make();/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class G{constructor(t,a,s,i,o,r,d,h,f){this.hue=t,this.chroma=a,this.j=s,this.q=i,this.m=o,this.s=r,this.jstar=d,this.astar=h,this.bstar=f}distance(t){const a=this.jstar-t.jstar,s=this.astar-t.astar,i=this.bstar-t.bstar,o=Math.sqrt(a*a+s*s+i*i);return 1.41*Math.pow(o,.63)}static fromInt(t){return G.fromIntInViewingConditions(t,X.DEFAULT)}static fromIntInViewingConditions(t,a){const s=(t&16711680)>>16,i=(t&65280)>>8,o=t&255,r=fe(s),d=fe(i),h=fe(o),f=.41233895*r+.35762064*d+.18051042*h,y=.2126*r+.7152*d+.0722*h,x=.01932141*r+.11916382*d+.95034478*h,A=.401288*f+.650173*y-.051461*x,E=-.250268*f+1.204414*y+.045854*x,S=-.002079*f+.048952*y+.953127*x,L=a.rgbD[0]*A,T=a.rgbD[1]*E,R=a.rgbD[2]*S,p=Math.pow(a.fl*Math.abs(L)/100,.42),b=Math.pow(a.fl*Math.abs(T)/100,.42),M=Math.pow(a.fl*Math.abs(R)/100,.42),k=U(L)*400*p/(p+27.13),B=U(T)*400*b/(b+27.13),I=U(R)*400*M/(M+27.13),O=(11*k+-12*B+I)/11,z=(k+B-2*I)/9,F=(20*k+20*B+21*I)/20,Z=(40*k+20*B+I)/20,J=Math.atan2(z,O)*180/Math.PI,q=J<0?J+360:J>=360?J-360:J,ye=q*Math.PI/180,be=Z*a.nbb,re=100*Math.pow(be/a.aw,a.c*a.z),ve=4/a.c*Math.sqrt(re/100)*(a.aw+4)*a.fLRoot,Pe=q<20.14?q+360:q,Le=.25*(Math.cos(Pe*Math.PI/180+2)+3.8),Se=5e4/13*Le*a.nc*a.ncb*Math.sqrt(O*O+z*z)/(F+.305),we=Math.pow(Se,.9)*Math.pow(1.64-Math.pow(.29,a.n),.73),We=we*Math.sqrt(re/100),qe=We*a.fLRoot,xt=50*Math.sqrt(we*a.c/(a.aw+4)),At=(1+100*.007)*re/(1+.007*re),Ye=1/.0228*Math.log(1+.0228*qe),Ct=Ye*Math.cos(ye),Pt=Ye*Math.sin(ye);return new G(q,We,re,ve,qe,xt,At,Ct,Pt)}static fromJch(t,a,s){return G.fromJchInViewingConditions(t,a,s,X.DEFAULT)}static fromJchInViewingConditions(t,a,s,i){const o=4/i.c*Math.sqrt(t/100)*(i.aw+4)*i.fLRoot,r=a*i.fLRoot,d=a/Math.sqrt(t/100),h=50*Math.sqrt(d*i.c/(i.aw+4)),f=s*Math.PI/180,y=(1+100*.007)*t/(1+.007*t),x=1/.0228*Math.log(1+.0228*r),A=x*Math.cos(f),E=x*Math.sin(f);return new G(s,a,t,o,r,h,y,A,E)}static fromUcs(t,a,s){return G.fromUcsInViewingConditions(t,a,s,X.DEFAULT)}static fromUcsInViewingConditions(t,a,s,i){const o=a,r=s,d=Math.sqrt(o*o+r*r),f=(Math.exp(d*.0228)-1)/.0228/i.fLRoot;let y=Math.atan2(r,o)*(180/Math.PI);y<0&&(y+=360);const x=t/(1-(t-100)*.007);return G.fromJchInViewingConditions(x,f,y,i)}toInt(){return this.viewed(X.DEFAULT)}viewed(t){const a=this.chroma===0||this.j===0?0:this.chroma/Math.sqrt(this.j/100),s=Math.pow(a/Math.pow(1.64-Math.pow(.29,t.n),.73),1/.9),i=this.hue*Math.PI/180,o=.25*(Math.cos(i+2)+3.8),r=t.aw*Math.pow(this.j/100,1/t.c/t.z),d=o*(5e4/13)*t.nc*t.ncb,h=r/t.nbb,f=Math.sin(i),y=Math.cos(i),x=23*(h+.305)*s/(23*d+11*s*y+108*s*f),A=x*y,E=x*f,S=(460*h+451*A+288*E)/1403,L=(460*h-891*A-261*E)/1403,T=(460*h-220*A-6300*E)/1403,R=Math.max(0,27.13*Math.abs(S)/(400-Math.abs(S))),p=U(S)*(100/t.fl)*Math.pow(R,1/.42),b=Math.max(0,27.13*Math.abs(L)/(400-Math.abs(L))),M=U(L)*(100/t.fl)*Math.pow(b,1/.42),k=Math.max(0,27.13*Math.abs(T)/(400-Math.abs(T))),B=U(T)*(100/t.fl)*Math.pow(k,1/.42),I=p/t.rgbD[0],O=M/t.rgbD[1],z=B/t.rgbD[2],F=1.86206786*I-1.01125463*O+.14918677*z,Z=.38752654*I+.62144744*O-.00897398*z,ie=-.0158415*I-.03412294*O+1.04996444*z;return Aa(F,Z,ie)}static fromXyzInViewingConditions(t,a,s,i){const o=.401288*t+.650173*a-.051461*s,r=-.250268*t+1.204414*a+.045854*s,d=-.002079*t+.048952*a+.953127*s,h=i.rgbD[0]*o,f=i.rgbD[1]*r,y=i.rgbD[2]*d,x=Math.pow(i.fl*Math.abs(h)/100,.42),A=Math.pow(i.fl*Math.abs(f)/100,.42),E=Math.pow(i.fl*Math.abs(y)/100,.42),S=U(h)*400*x/(x+27.13),L=U(f)*400*A/(A+27.13),T=U(y)*400*E/(E+27.13),R=(11*S+-12*L+T)/11,p=(S+L-2*T)/9,b=(20*S+20*L+21*T)/20,M=(40*S+20*L+T)/20,B=Math.atan2(p,R)*180/Math.PI,I=B<0?B+360:B>=360?B-360:B,O=I*Math.PI/180,z=M*i.nbb,F=100*Math.pow(z/i.aw,i.c*i.z),Z=4/i.c*Math.sqrt(F/100)*(i.aw+4)*i.fLRoot,ie=I<20.14?I+360:I,J=1/4*(Math.cos(ie*Math.PI/180+2)+3.8),ye=5e4/13*J*i.nc*i.ncb*Math.sqrt(R*R+p*p)/(b+.305),be=Math.pow(ye,.9)*Math.pow(1.64-Math.pow(.29,i.n),.73),re=be*Math.sqrt(F/100),ve=re*i.fLRoot,Pe=50*Math.sqrt(be*i.c/(i.aw+4)),Le=(1+100*.007)*F/(1+.007*F),Me=Math.log(1+.0228*ve)/.0228,Se=Me*Math.cos(O),we=Me*Math.sin(O);return new G(I,re,F,Z,ve,Pe,Le,Se,we)}xyzInViewingConditions(t){const a=this.chroma===0||this.j===0?0:this.chroma/Math.sqrt(this.j/100),s=Math.pow(a/Math.pow(1.64-Math.pow(.29,t.n),.73),1/.9),i=this.hue*Math.PI/180,o=.25*(Math.cos(i+2)+3.8),r=t.aw*Math.pow(this.j/100,1/t.c/t.z),d=o*(5e4/13)*t.nc*t.ncb,h=r/t.nbb,f=Math.sin(i),y=Math.cos(i),x=23*(h+.305)*s/(23*d+11*s*y+108*s*f),A=x*y,E=x*f,S=(460*h+451*A+288*E)/1403,L=(460*h-891*A-261*E)/1403,T=(460*h-220*A-6300*E)/1403,R=Math.max(0,27.13*Math.abs(S)/(400-Math.abs(S))),p=U(S)*(100/t.fl)*Math.pow(R,1/.42),b=Math.max(0,27.13*Math.abs(L)/(400-Math.abs(L))),M=U(L)*(100/t.fl)*Math.pow(b,1/.42),k=Math.max(0,27.13*Math.abs(T)/(400-Math.abs(T))),B=U(T)*(100/t.fl)*Math.pow(k,1/.42),I=p/t.rgbD[0],O=M/t.rgbD[1],z=B/t.rgbD[2],F=1.86206786*I-1.01125463*O+.14918677*z,Z=.38752654*I+.62144744*O-.00897398*z,ie=-.0158415*I-.03412294*O+1.04996444*z;return[F,Z,ie]}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class w{static sanitizeRadians(t){return(t+Math.PI*8)%(Math.PI*2)}static trueDelinearized(t){const a=t/100;let s=0;return a<=.0031308?s=a*12.92:s=1.055*Math.pow(a,1/2.4)-.055,s*255}static chromaticAdaptation(t){const a=Math.pow(Math.abs(t),.42);return U(t)*400*a/(a+27.13)}static hueOf(t){const a=Be(t,w.SCALED_DISCOUNT_FROM_LINRGB),s=w.chromaticAdaptation(a[0]),i=w.chromaticAdaptation(a[1]),o=w.chromaticAdaptation(a[2]),r=(11*s+-12*i+o)/11,d=(s+i-2*o)/9;return Math.atan2(d,r)}static areInCyclicOrder(t,a,s){const i=w.sanitizeRadians(a-t),o=w.sanitizeRadians(s-t);return i<o}static intercept(t,a,s){return(a-t)/(s-t)}static lerpPoint(t,a,s){return[t[0]+(s[0]-t[0])*a,t[1]+(s[1]-t[1])*a,t[2]+(s[2]-t[2])*a]}static setCoordinate(t,a,s,i){const o=w.intercept(t[i],a,s[i]);return w.lerpPoint(t,o,s)}static isBounded(t){return 0<=t&&t<=100}static nthVertex(t,a){const s=w.Y_FROM_LINRGB[0],i=w.Y_FROM_LINRGB[1],o=w.Y_FROM_LINRGB[2],r=a%4<=1?0:100,d=a%2===0?0:100;if(a<4){const h=r,f=d,y=(t-h*i-f*o)/s;return w.isBounded(y)?[y,h,f]:[-1,-1,-1]}else if(a<8){const h=r,f=d,y=(t-f*s-h*o)/i;return w.isBounded(y)?[f,y,h]:[-1,-1,-1]}else{const h=r,f=d,y=(t-h*s-f*i)/o;return w.isBounded(y)?[h,f,y]:[-1,-1,-1]}}static bisectToSegment(t,a){let s=[-1,-1,-1],i=s,o=0,r=0,d=!1,h=!0;for(let f=0;f<12;f++){const y=w.nthVertex(t,f);if(y[0]<0)continue;const x=w.hueOf(y);if(!d){s=y,i=y,o=x,r=x,d=!0;continue}(h||w.areInCyclicOrder(o,x,r))&&(h=!1,w.areInCyclicOrder(o,a,x)?(i=y,r=x):(s=y,o=x))}return[s,i]}static midpoint(t,a){return[(t[0]+a[0])/2,(t[1]+a[1])/2,(t[2]+a[2])/2]}static criticalPlaneBelow(t){return Math.floor(t-.5)}static criticalPlaneAbove(t){return Math.ceil(t-.5)}static bisectToLimit(t,a){const s=w.bisectToSegment(t,a);let i=s[0],o=w.hueOf(i),r=s[1];for(let d=0;d<3;d++)if(i[d]!==r[d]){let h=-1,f=255;i[d]<r[d]?(h=w.criticalPlaneBelow(w.trueDelinearized(i[d])),f=w.criticalPlaneAbove(w.trueDelinearized(r[d]))):(h=w.criticalPlaneAbove(w.trueDelinearized(i[d])),f=w.criticalPlaneBelow(w.trueDelinearized(r[d])));for(let y=0;y<8&&!(Math.abs(f-h)<=1);y++){const x=Math.floor((h+f)/2),A=w.CRITICAL_PLANES[x],E=w.setCoordinate(i,A,r,d),S=w.hueOf(E);w.areInCyclicOrder(o,a,S)?(r=E,f=x):(i=E,o=S,h=x)}}return w.midpoint(i,r)}static inverseChromaticAdaptation(t){const a=Math.abs(t),s=Math.max(0,27.13*a/(400-a));return U(t)*Math.pow(s,1/.42)}static findResultByJ(t,a,s){let i=Math.sqrt(s)*11;const o=X.DEFAULT,r=1/Math.pow(1.64-Math.pow(.29,o.n),.73),h=.25*(Math.cos(t+2)+3.8)*(5e4/13)*o.nc*o.ncb,f=Math.sin(t),y=Math.cos(t);for(let x=0;x<5;x++){const A=i/100,E=a===0||i===0?0:a/Math.sqrt(A),S=Math.pow(E*r,1/.9),T=o.aw*Math.pow(A,1/o.c/o.z)/o.nbb,R=23*(T+.305)*S/(23*h+11*S*y+108*S*f),p=R*y,b=R*f,M=(460*T+451*p+288*b)/1403,k=(460*T-891*p-261*b)/1403,B=(460*T-220*p-6300*b)/1403,I=w.inverseChromaticAdaptation(M),O=w.inverseChromaticAdaptation(k),z=w.inverseChromaticAdaptation(B),F=Be([I,O,z],w.LINRGB_FROM_SCALED_DISCOUNT);if(F[0]<0||F[1]<0||F[2]<0)return 0;const Z=w.Y_FROM_LINRGB[0],ie=w.Y_FROM_LINRGB[1],J=w.Y_FROM_LINRGB[2],q=Z*F[0]+ie*F[1]+J*F[2];if(q<=0)return 0;if(x===4||Math.abs(q-s)<.002)return F[0]>100.01||F[1]>100.01||F[2]>100.01?0:st(F);i=i-(q-s)*i/(2*q)}return 0}static solveToInt(t,a,s){if(a<1e-4||s<1e-4||s>99.9999)return Pa(s);t=le(t);const i=t/180*Math.PI,o=ne(s),r=w.findResultByJ(i,a,o);if(r!==0)return r;const d=w.bisectToLimit(o,i);return st(d)}static solveToCam(t,a,s){return G.fromInt(w.solveToInt(t,a,s))}}w.SCALED_DISCOUNT_FROM_LINRGB=[[.001200833568784504,.002389694492170889,.0002795742885861124],[.0005891086651375999,.0029785502573438758,.0003270666104008398],[.00010146692491640572,.0005364214359186694,.0032979401770712076]];w.LINRGB_FROM_SCALED_DISCOUNT=[[1373.2198709594231,-1100.4251190754821,-7.278681089101213],[-271.815969077903,559.6580465940733,-32.46047482791194],[1.9622899599665666,-57.173814538844006,308.7233197812385]];w.Y_FROM_LINRGB=[.2126,.7152,.0722];w.CRITICAL_PLANES=[.015176349177441876,.045529047532325624,.07588174588720938,.10623444424209313,.13658714259697685,.16693984095186062,.19729253930674434,.2276452376616281,.2579979360165119,.28835063437139563,.3188300904430532,.350925934958123,.3848314933096426,.42057480301049466,.458183274052838,.4976837250274023,.5391024159806381,.5824650784040898,.6277969426914107,.6751227633498623,.7244668422128921,.775853049866786,.829304845476233,.8848452951698498,.942497089126609,1.0022825574869039,1.0642236851973577,1.1283421258858297,1.1946592148522128,1.2631959812511864,1.3339731595349034,1.407011200216447,1.4823302800086415,1.5599503113873272,1.6398909516233677,1.7221716113234105,1.8068114625156377,1.8938294463134073,1.9832442801866852,2.075074464868551,2.1693382909216234,2.2660538449872063,2.36523901573795,2.4669114995532007,2.5710888059345764,2.6777882626779785,2.7870270208169257,2.898822059350997,3.0131901897720907,3.1301480604002863,3.2497121605402226,3.3718988244681087,3.4967242352587946,3.624204428461639,3.754355295633311,3.887192587735158,4.022731918402185,4.160988767090289,4.301978482107941,4.445716283538092,4.592217266055746,4.741496401646282,4.893568542229298,5.048448422192488,5.20615066083972,5.3666897647573375,5.5300801301023865,5.696336044816294,5.865471690767354,6.037501145825082,6.212438385869475,6.390297286737924,6.571091626112461,6.7548350853498045,6.941541251256611,7.131223617812143,7.323895587840543,7.5195704746346665,7.7182615035334345,7.919981813454504,8.124744458384042,8.332562408825165,8.543448553206703,8.757415699253682,8.974476575321063,9.194643831691977,9.417930041841839,9.644347703669503,9.873909240696694,10.106627003236781,10.342513269534024,10.58158024687427,10.8238400726681,11.069304815507364,11.317986476196008,11.569896988756009,11.825048221409341,12.083451977536606,12.345119996613247,12.610063955123938,12.878295467455942,13.149826086772048,13.42466730586372,13.702830557985108,13.984327217668513,14.269168601521828,14.55736596900856,14.848930523210871,15.143873411576273,15.44220572664832,15.743938506781891,16.04908273684337,16.35764934889634,16.66964922287304,16.985093187232053,17.30399201960269,17.62635644741625,17.95219714852476,18.281524751807332,18.614349837764564,18.95068293910138,19.290534541298456,19.633915083172692,19.98083495742689,20.331304511189067,20.685334046541502,21.042933821039977,21.404114048223256,21.76888489811322,22.137256497705877,22.50923893145328,22.884842241736916,23.264076429332462,23.6469514538663,24.033477234264016,24.42366364919083,24.817520537484558,25.21505769858089,25.61628489293138,26.021211842414342,26.429848230738664,26.842203703840827,27.258287870275353,27.678110301598522,28.10168053274597,28.529008062403893,28.96010235337422,29.39497283293396,29.83362889318845,30.276079891419332,30.722335150426627,31.172403958865512,31.62629557157785,32.08401920991837,32.54558406207592,33.010999283389665,33.4802739966603,33.953417292456834,34.430438229418264,34.911345834551085,35.39614910352207,35.88485700094671,36.37747846067349,36.87402238606382,37.37449765026789,37.87891309649659,38.38727753828926,38.89959975977785,39.41588851594697,39.93615253289054,40.460400508064545,40.98864111053629,41.520882981230194,42.05713473317016,42.597404951718396,43.141702194811224,43.6900349931913,44.24241185063697,44.798841244188324,45.35933162437017,45.92389141541209,46.49252901546552,47.065252796817916,47.64207110610409,48.22299226451468,48.808024568002054,49.3971762874833,49.9904556690408,50.587870934119984,51.189430279724725,51.79514187861014,52.40501387947288,53.0190544071392,53.637271562750364,54.259673423945976,54.88626804504493,55.517063457223934,56.15206766869424,56.79128866487574,57.43473440856916,58.08241284012621,58.734331877617365,59.39049941699807,60.05092333227251,60.715611475655585,61.38457167773311,62.057811747619894,62.7353394731159,63.417162620860914,64.10328893648692,64.79372614476921,65.48848194977529,66.18756403501224,66.89098006357258,67.59873767827808,68.31084450182222,69.02730813691093,69.74813616640164,70.47333615344107,71.20291564160104,71.93688215501312,72.67524319850172,73.41800625771542,74.16517879925733,74.9167682708136,75.67278210128072,76.43322770089146,77.1981124613393,77.96744375590167,78.74122893956174,79.51947534912904,80.30219030335869,81.08938110306934,81.88105503125999,82.67721935322541,83.4778813166706,84.28304815182372,85.09272707154808,85.90692527145302,86.72564993000343,87.54890820862819,88.3767072518277,89.2090541872801,90.04595612594655,90.88742016217518,91.73345337380438,92.58406282226491,93.43925555268066,94.29903859396902,95.16341895893969,96.03240364439274,96.9059996312159,97.78421388448044,98.6670533535366,99.55452497210776];/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _{static from(t,a,s){return new _(w.solveToInt(t,a,s))}static fromInt(t){return new _(t)}toInt(){return this.argb}get hue(){return this.internalHue}set hue(t){this.setInternalState(w.solveToInt(t,this.internalChroma,this.internalTone))}get chroma(){return this.internalChroma}set chroma(t){this.setInternalState(w.solveToInt(this.internalHue,t,this.internalTone))}get tone(){return this.internalTone}set tone(t){this.setInternalState(w.solveToInt(this.internalHue,this.internalChroma,t))}constructor(t){this.argb=t;const a=G.fromInt(t);this.internalHue=a.hue,this.internalChroma=a.chroma,this.internalTone=it(t),this.argb=t}setInternalState(t){const a=G.fromInt(t);this.internalHue=a.hue,this.internalChroma=a.chroma,this.internalTone=it(t),this.argb=t}inViewingConditions(t){const s=G.fromInt(this.toInt()).xyzInViewingConditions(t),i=G.fromXyzInViewingConditions(s[0],s[1],s[2],X.make());return _.from(i.hue,i.chroma,Fe(s[1]))}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class N{static ratioOfTones(t,a){return t=Ae(0,100,t),a=Ae(0,100,a),N.ratioOfYs(ne(t),ne(a))}static ratioOfYs(t,a){const s=t>a?t:a,i=s===a?t:a;return(s+5)/(i+5)}static lighter(t,a){if(t<0||t>100)return-1;const s=ne(t),i=a*(s+5)-5,o=N.ratioOfYs(i,s),r=Math.abs(o-a);if(o<a&&r>.04)return-1;const d=Fe(i)+.4;return d<0||d>100?-1:d}static darker(t,a){if(t<0||t>100)return-1;const s=ne(t),i=(s+5)/a-5,o=N.ratioOfYs(s,i),r=Math.abs(o-a);if(o<a&&r>.04)return-1;const d=Fe(i)-.4;return d<0||d>100?-1:d}static lighterUnsafe(t,a){const s=N.lighter(t,a);return s<0?100:s}static darkerUnsafe(t,a){const s=N.darker(t,a);return s<0?0:s}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ke{static isDisliked(t){const a=Math.round(t.hue)>=90&&Math.round(t.hue)<=111,s=Math.round(t.chroma)>16,i=Math.round(t.tone)<65;return a&&s&&i}static fixIfDisliked(t){return Ke.isDisliked(t)?_.from(t.hue,t.chroma,70):t}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class m{static fromPalette(t){return new m(t.name??"",t.palette,t.tone,t.isBackground??!1,t.background,t.secondBackground,t.contrastCurve,t.toneDeltaPair)}constructor(t,a,s,i,o,r,d,h){if(this.name=t,this.palette=a,this.tone=s,this.isBackground=i,this.background=o,this.secondBackground=r,this.contrastCurve=d,this.toneDeltaPair=h,this.hctCache=new Map,!o&&r)throw new Error(`Color ${t} has secondBackgrounddefined, but background is not defined.`);if(!o&&d)throw new Error(`Color ${t} has contrastCurvedefined, but background is not defined.`);if(o&&!d)throw new Error(`Color ${t} has backgrounddefined, but contrastCurve is not defined.`)}getArgb(t){return this.getHct(t).toInt()}getHct(t){const a=this.hctCache.get(t);if(a!=null)return a;const s=this.getTone(t),i=this.palette(t).getHct(s);return this.hctCache.size>4&&this.hctCache.clear(),this.hctCache.set(t,i),i}getTone(t){const a=t.contrastLevel<0;if(this.toneDeltaPair){const s=this.toneDeltaPair(t),i=s.roleA,o=s.roleB,r=s.delta,d=s.polarity,h=s.stayTogether,y=this.background(t).getTone(t),x=d==="nearer"||d==="lighter"&&!t.isDark||d==="darker"&&t.isDark,A=x?i:o,E=x?o:i,S=this.name===A.name,L=t.isDark?1:-1,T=A.contrastCurve.get(t.contrastLevel),R=E.contrastCurve.get(t.contrastLevel),p=A.tone(t);let b=N.ratioOfTones(y,p)>=T?p:m.foregroundTone(y,T);const M=E.tone(t);let k=N.ratioOfTones(y,M)>=R?M:m.foregroundTone(y,R);return a&&(b=m.foregroundTone(y,T),k=m.foregroundTone(y,R)),(k-b)*L>=r||(k=Ae(0,100,b+r*L),(k-b)*L>=r||(b=Ae(0,100,k-r*L))),50<=b&&b<60?L>0?(b=60,k=Math.max(k,b+r*L)):(b=49,k=Math.min(k,b+r*L)):50<=k&&k<60&&(h?L>0?(b=60,k=Math.max(k,b+r*L)):(b=49,k=Math.min(k,b+r*L)):L>0?k=60:k=49),S?b:k}else{let s=this.tone(t);if(this.background==null)return s;const i=this.background(t).getTone(t),o=this.contrastCurve.get(t.contrastLevel);if(N.ratioOfTones(i,s)>=o||(s=m.foregroundTone(i,o)),a&&(s=m.foregroundTone(i,o)),this.isBackground&&50<=s&&s<60&&(N.ratioOfTones(49,i)>=o?s=49:s=60),this.secondBackground){const[r,d]=[this.background,this.secondBackground],[h,f]=[r(t).getTone(t),d(t).getTone(t)],[y,x]=[Math.max(h,f),Math.min(h,f)];if(N.ratioOfTones(y,s)>=o&&N.ratioOfTones(x,s)>=o)return s;const A=N.lighter(y,o),E=N.darker(x,o),S=[];return A!==-1&&S.push(A),E!==-1&&S.push(E),m.tonePrefersLightForeground(h)||m.tonePrefersLightForeground(f)?A<0?100:A:S.length===1?S[0]:E<0?0:E}return s}}static foregroundTone(t,a){const s=N.lighterUnsafe(t,a),i=N.darkerUnsafe(t,a),o=N.ratioOfTones(s,t),r=N.ratioOfTones(i,t);if(m.tonePrefersLightForeground(t)){const h=Math.abs(o-r)<.1&&o<a&&r<a;return o>=a||o>=r||h?s:i}else return r>=a||r>=o?i:s}static tonePrefersLightForeground(t){return Math.round(t)<60}static toneAllowsLightForeground(t){return Math.round(t)<=49}static enableLightForeground(t){return m.tonePrefersLightForeground(t)&&!m.toneAllowsLightForeground(t)?49:t}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class P{static fromInt(t){const a=_.fromInt(t);return P.fromHct(a)}static fromHct(t){return new P(t.hue,t.chroma,t)}static fromHueAndChroma(t,a){const s=new Sa(t,a).create();return new P(t,a,s)}constructor(t,a,s){this.hue=t,this.chroma=a,this.keyColor=s,this.cache=new Map}tone(t){let a=this.cache.get(t);return a===void 0&&(a=_.from(this.hue,this.chroma,t).toInt(),this.cache.set(t,a)),a}getHct(t){return _.fromInt(this.tone(t))}}class Sa{constructor(t,a){this.hue=t,this.requestedChroma=a,this.chromaCache=new Map,this.maxChromaValue=200}create(){let i=0,o=100;for(;i<o;){const r=Math.floor((i+o)/2),d=this.maxChroma(r)<this.maxChroma(r+1);if(this.maxChroma(r)>=this.requestedChroma-.01)if(Math.abs(i-50)<Math.abs(o-50))o=r;else{if(i===r)return _.from(this.hue,this.requestedChroma,i);i=r}else d?i=r+1:o=r}return _.from(this.hue,this.requestedChroma,i)}maxChroma(t){if(this.chromaCache.has(t))return this.chromaCache.get(t);const a=_.from(this.hue,this.maxChromaValue,t).chroma;return this.chromaCache.set(t,a),a}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ${constructor(t,a,s,i){this.low=t,this.normal=a,this.medium=s,this.high=i}get(t){return t<=-1?this.low:t<0?ge(this.low,this.normal,(t- -1)/1):t<.5?ge(this.normal,this.medium,(t-0)/.5):t<1?ge(this.medium,this.high,(t-.5)/.5):this.high}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class V{constructor(t,a,s,i,o){this.roleA=t,this.roleB=a,this.delta=s,this.polarity=i,this.stayTogether=o}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var W;(function(e){e[e.MONOCHROME=0]="MONOCHROME",e[e.NEUTRAL=1]="NEUTRAL",e[e.TONAL_SPOT=2]="TONAL_SPOT",e[e.VIBRANT=3]="VIBRANT",e[e.EXPRESSIVE=4]="EXPRESSIVE",e[e.FIDELITY=5]="FIDELITY",e[e.CONTENT=6]="CONTENT",e[e.RAINBOW=7]="RAINBOW",e[e.FRUIT_SALAD=8]="FRUIT_SALAD"})(W||(W={}));/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function me(e){return e.variant===W.FIDELITY||e.variant===W.CONTENT}function D(e){return e.variant===W.MONOCHROME}function Ea(e,t,a,s){let i=a,o=_.from(e,t,a);if(o.chroma<t){let r=o.chroma;for(;o.chroma<t;){i+=s?-1:1;const d=_.from(e,t,i);if(r>d.chroma||Math.abs(d.chroma-t)<.4)break;const h=Math.abs(d.chroma-t),f=Math.abs(o.chroma-t);h<f&&(o=d),r=Math.max(r,d.chroma)}}return i}class l{static highestSurface(t){return t.isDark?l.surfaceBright:l.surfaceDim}}l.contentAccentToneDelta=15;l.primaryPaletteKeyColor=m.fromPalette({name:"primary_palette_key_color",palette:e=>e.primaryPalette,tone:e=>e.primaryPalette.keyColor.tone});l.secondaryPaletteKeyColor=m.fromPalette({name:"secondary_palette_key_color",palette:e=>e.secondaryPalette,tone:e=>e.secondaryPalette.keyColor.tone});l.tertiaryPaletteKeyColor=m.fromPalette({name:"tertiary_palette_key_color",palette:e=>e.tertiaryPalette,tone:e=>e.tertiaryPalette.keyColor.tone});l.neutralPaletteKeyColor=m.fromPalette({name:"neutral_palette_key_color",palette:e=>e.neutralPalette,tone:e=>e.neutralPalette.keyColor.tone});l.neutralVariantPaletteKeyColor=m.fromPalette({name:"neutral_variant_palette_key_color",palette:e=>e.neutralVariantPalette,tone:e=>e.neutralVariantPalette.keyColor.tone});l.background=m.fromPalette({name:"background",palette:e=>e.neutralPalette,tone:e=>e.isDark?6:98,isBackground:!0});l.onBackground=m.fromPalette({name:"on_background",palette:e=>e.neutralPalette,tone:e=>e.isDark?90:10,background:e=>l.background,contrastCurve:new $(3,3,4.5,7)});l.surface=m.fromPalette({name:"surface",palette:e=>e.neutralPalette,tone:e=>e.isDark?6:98,isBackground:!0});l.surfaceDim=m.fromPalette({name:"surface_dim",palette:e=>e.neutralPalette,tone:e=>e.isDark?6:new $(87,87,80,75).get(e.contrastLevel),isBackground:!0});l.surfaceBright=m.fromPalette({name:"surface_bright",palette:e=>e.neutralPalette,tone:e=>e.isDark?new $(24,24,29,34).get(e.contrastLevel):98,isBackground:!0});l.surfaceContainerLowest=m.fromPalette({name:"surface_container_lowest",palette:e=>e.neutralPalette,tone:e=>e.isDark?new $(4,4,2,0).get(e.contrastLevel):100,isBackground:!0});l.surfaceContainerLow=m.fromPalette({name:"surface_container_low",palette:e=>e.neutralPalette,tone:e=>e.isDark?new $(10,10,11,12).get(e.contrastLevel):new $(96,96,96,95).get(e.contrastLevel),isBackground:!0});l.surfaceContainer=m.fromPalette({name:"surface_container",palette:e=>e.neutralPalette,tone:e=>e.isDark?new $(12,12,16,20).get(e.contrastLevel):new $(94,94,92,90).get(e.contrastLevel),isBackground:!0});l.surfaceContainerHigh=m.fromPalette({name:"surface_container_high",palette:e=>e.neutralPalette,tone:e=>e.isDark?new $(17,17,21,25).get(e.contrastLevel):new $(92,92,88,85).get(e.contrastLevel),isBackground:!0});l.surfaceContainerHighest=m.fromPalette({name:"surface_container_highest",palette:e=>e.neutralPalette,tone:e=>e.isDark?new $(22,22,26,30).get(e.contrastLevel):new $(90,90,84,80).get(e.contrastLevel),isBackground:!0});l.onSurface=m.fromPalette({name:"on_surface",palette:e=>e.neutralPalette,tone:e=>e.isDark?90:10,background:e=>l.highestSurface(e),contrastCurve:new $(4.5,7,11,21)});l.surfaceVariant=m.fromPalette({name:"surface_variant",palette:e=>e.neutralVariantPalette,tone:e=>e.isDark?30:90,isBackground:!0});l.onSurfaceVariant=m.fromPalette({name:"on_surface_variant",palette:e=>e.neutralVariantPalette,tone:e=>e.isDark?80:30,background:e=>l.highestSurface(e),contrastCurve:new $(3,4.5,7,11)});l.inverseSurface=m.fromPalette({name:"inverse_surface",palette:e=>e.neutralPalette,tone:e=>e.isDark?90:20});l.inverseOnSurface=m.fromPalette({name:"inverse_on_surface",palette:e=>e.neutralPalette,tone:e=>e.isDark?20:95,background:e=>l.inverseSurface,contrastCurve:new $(4.5,7,11,21)});l.outline=m.fromPalette({name:"outline",palette:e=>e.neutralVariantPalette,tone:e=>e.isDark?60:50,background:e=>l.highestSurface(e),contrastCurve:new $(1.5,3,4.5,7)});l.outlineVariant=m.fromPalette({name:"outline_variant",palette:e=>e.neutralVariantPalette,tone:e=>e.isDark?30:80,background:e=>l.highestSurface(e),contrastCurve:new $(1,1,3,4.5)});l.shadow=m.fromPalette({name:"shadow",palette:e=>e.neutralPalette,tone:e=>0});l.scrim=m.fromPalette({name:"scrim",palette:e=>e.neutralPalette,tone:e=>0});l.surfaceTint=m.fromPalette({name:"surface_tint",palette:e=>e.primaryPalette,tone:e=>e.isDark?80:40,isBackground:!0});l.primary=m.fromPalette({name:"primary",palette:e=>e.primaryPalette,tone:e=>D(e)?e.isDark?100:0:e.isDark?80:40,isBackground:!0,background:e=>l.highestSurface(e),contrastCurve:new $(3,4.5,7,7),toneDeltaPair:e=>new V(l.primaryContainer,l.primary,10,"nearer",!1)});l.onPrimary=m.fromPalette({name:"on_primary",palette:e=>e.primaryPalette,tone:e=>D(e)?e.isDark?10:90:e.isDark?20:100,background:e=>l.primary,contrastCurve:new $(4.5,7,11,21)});l.primaryContainer=m.fromPalette({name:"primary_container",palette:e=>e.primaryPalette,tone:e=>me(e)?e.sourceColorHct.tone:D(e)?e.isDark?85:25:e.isDark?30:90,isBackground:!0,background:e=>l.highestSurface(e),contrastCurve:new $(1,1,3,4.5),toneDeltaPair:e=>new V(l.primaryContainer,l.primary,10,"nearer",!1)});l.onPrimaryContainer=m.fromPalette({name:"on_primary_container",palette:e=>e.primaryPalette,tone:e=>me(e)?m.foregroundTone(l.primaryContainer.tone(e),4.5):D(e)?e.isDark?0:100:e.isDark?90:30,background:e=>l.primaryContainer,contrastCurve:new $(3,4.5,7,11)});l.inversePrimary=m.fromPalette({name:"inverse_primary",palette:e=>e.primaryPalette,tone:e=>e.isDark?40:80,background:e=>l.inverseSurface,contrastCurve:new $(3,4.5,7,7)});l.secondary=m.fromPalette({name:"secondary",palette:e=>e.secondaryPalette,tone:e=>e.isDark?80:40,isBackground:!0,background:e=>l.highestSurface(e),contrastCurve:new $(3,4.5,7,7),toneDeltaPair:e=>new V(l.secondaryContainer,l.secondary,10,"nearer",!1)});l.onSecondary=m.fromPalette({name:"on_secondary",palette:e=>e.secondaryPalette,tone:e=>D(e)?e.isDark?10:100:e.isDark?20:100,background:e=>l.secondary,contrastCurve:new $(4.5,7,11,21)});l.secondaryContainer=m.fromPalette({name:"secondary_container",palette:e=>e.secondaryPalette,tone:e=>{const t=e.isDark?30:90;return D(e)?e.isDark?30:85:me(e)?Ea(e.secondaryPalette.hue,e.secondaryPalette.chroma,t,!e.isDark):t},isBackground:!0,background:e=>l.highestSurface(e),contrastCurve:new $(1,1,3,4.5),toneDeltaPair:e=>new V(l.secondaryContainer,l.secondary,10,"nearer",!1)});l.onSecondaryContainer=m.fromPalette({name:"on_secondary_container",palette:e=>e.secondaryPalette,tone:e=>D(e)?e.isDark?90:10:me(e)?m.foregroundTone(l.secondaryContainer.tone(e),4.5):e.isDark?90:30,background:e=>l.secondaryContainer,contrastCurve:new $(3,4.5,7,11)});l.tertiary=m.fromPalette({name:"tertiary",palette:e=>e.tertiaryPalette,tone:e=>D(e)?e.isDark?90:25:e.isDark?80:40,isBackground:!0,background:e=>l.highestSurface(e),contrastCurve:new $(3,4.5,7,7),toneDeltaPair:e=>new V(l.tertiaryContainer,l.tertiary,10,"nearer",!1)});l.onTertiary=m.fromPalette({name:"on_tertiary",palette:e=>e.tertiaryPalette,tone:e=>D(e)?e.isDark?10:90:e.isDark?20:100,background:e=>l.tertiary,contrastCurve:new $(4.5,7,11,21)});l.tertiaryContainer=m.fromPalette({name:"tertiary_container",palette:e=>e.tertiaryPalette,tone:e=>{if(D(e))return e.isDark?60:49;if(!me(e))return e.isDark?30:90;const t=e.tertiaryPalette.getHct(e.sourceColorHct.tone);return Ke.fixIfDisliked(t).tone},isBackground:!0,background:e=>l.highestSurface(e),contrastCurve:new $(1,1,3,4.5),toneDeltaPair:e=>new V(l.tertiaryContainer,l.tertiary,10,"nearer",!1)});l.onTertiaryContainer=m.fromPalette({name:"on_tertiary_container",palette:e=>e.tertiaryPalette,tone:e=>D(e)?e.isDark?0:100:me(e)?m.foregroundTone(l.tertiaryContainer.tone(e),4.5):e.isDark?90:30,background:e=>l.tertiaryContainer,contrastCurve:new $(3,4.5,7,11)});l.error=m.fromPalette({name:"error",palette:e=>e.errorPalette,tone:e=>e.isDark?80:40,isBackground:!0,background:e=>l.highestSurface(e),contrastCurve:new $(3,4.5,7,7),toneDeltaPair:e=>new V(l.errorContainer,l.error,10,"nearer",!1)});l.onError=m.fromPalette({name:"on_error",palette:e=>e.errorPalette,tone:e=>e.isDark?20:100,background:e=>l.error,contrastCurve:new $(4.5,7,11,21)});l.errorContainer=m.fromPalette({name:"error_container",palette:e=>e.errorPalette,tone:e=>e.isDark?30:90,isBackground:!0,background:e=>l.highestSurface(e),contrastCurve:new $(1,1,3,4.5),toneDeltaPair:e=>new V(l.errorContainer,l.error,10,"nearer",!1)});l.onErrorContainer=m.fromPalette({name:"on_error_container",palette:e=>e.errorPalette,tone:e=>D(e)?e.isDark?90:10:e.isDark?90:30,background:e=>l.errorContainer,contrastCurve:new $(3,4.5,7,11)});l.primaryFixed=m.fromPalette({name:"primary_fixed",palette:e=>e.primaryPalette,tone:e=>D(e)?40:90,isBackground:!0,background:e=>l.highestSurface(e),contrastCurve:new $(1,1,3,4.5),toneDeltaPair:e=>new V(l.primaryFixed,l.primaryFixedDim,10,"lighter",!0)});l.primaryFixedDim=m.fromPalette({name:"primary_fixed_dim",palette:e=>e.primaryPalette,tone:e=>D(e)?30:80,isBackground:!0,background:e=>l.highestSurface(e),contrastCurve:new $(1,1,3,4.5),toneDeltaPair:e=>new V(l.primaryFixed,l.primaryFixedDim,10,"lighter",!0)});l.onPrimaryFixed=m.fromPalette({name:"on_primary_fixed",palette:e=>e.primaryPalette,tone:e=>D(e)?100:10,background:e=>l.primaryFixedDim,secondBackground:e=>l.primaryFixed,contrastCurve:new $(4.5,7,11,21)});l.onPrimaryFixedVariant=m.fromPalette({name:"on_primary_fixed_variant",palette:e=>e.primaryPalette,tone:e=>D(e)?90:30,background:e=>l.primaryFixedDim,secondBackground:e=>l.primaryFixed,contrastCurve:new $(3,4.5,7,11)});l.secondaryFixed=m.fromPalette({name:"secondary_fixed",palette:e=>e.secondaryPalette,tone:e=>D(e)?80:90,isBackground:!0,background:e=>l.highestSurface(e),contrastCurve:new $(1,1,3,4.5),toneDeltaPair:e=>new V(l.secondaryFixed,l.secondaryFixedDim,10,"lighter",!0)});l.secondaryFixedDim=m.fromPalette({name:"secondary_fixed_dim",palette:e=>e.secondaryPalette,tone:e=>D(e)?70:80,isBackground:!0,background:e=>l.highestSurface(e),contrastCurve:new $(1,1,3,4.5),toneDeltaPair:e=>new V(l.secondaryFixed,l.secondaryFixedDim,10,"lighter",!0)});l.onSecondaryFixed=m.fromPalette({name:"on_secondary_fixed",palette:e=>e.secondaryPalette,tone:e=>10,background:e=>l.secondaryFixedDim,secondBackground:e=>l.secondaryFixed,contrastCurve:new $(4.5,7,11,21)});l.onSecondaryFixedVariant=m.fromPalette({name:"on_secondary_fixed_variant",palette:e=>e.secondaryPalette,tone:e=>D(e)?25:30,background:e=>l.secondaryFixedDim,secondBackground:e=>l.secondaryFixed,contrastCurve:new $(3,4.5,7,11)});l.tertiaryFixed=m.fromPalette({name:"tertiary_fixed",palette:e=>e.tertiaryPalette,tone:e=>D(e)?40:90,isBackground:!0,background:e=>l.highestSurface(e),contrastCurve:new $(1,1,3,4.5),toneDeltaPair:e=>new V(l.tertiaryFixed,l.tertiaryFixedDim,10,"lighter",!0)});l.tertiaryFixedDim=m.fromPalette({name:"tertiary_fixed_dim",palette:e=>e.tertiaryPalette,tone:e=>D(e)?30:80,isBackground:!0,background:e=>l.highestSurface(e),contrastCurve:new $(1,1,3,4.5),toneDeltaPair:e=>new V(l.tertiaryFixed,l.tertiaryFixedDim,10,"lighter",!0)});l.onTertiaryFixed=m.fromPalette({name:"on_tertiary_fixed",palette:e=>e.tertiaryPalette,tone:e=>D(e)?100:10,background:e=>l.tertiaryFixedDim,secondBackground:e=>l.tertiaryFixed,contrastCurve:new $(4.5,7,11,21)});l.onTertiaryFixedVariant=m.fromPalette({name:"on_tertiary_fixed_variant",palette:e=>e.tertiaryPalette,tone:e=>D(e)?90:30,background:e=>l.tertiaryFixedDim,secondBackground:e=>l.tertiaryFixed,contrastCurve:new $(3,4.5,7,11)});/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class H{constructor(t){this.sourceColorArgb=t.sourceColorArgb,this.variant=t.variant,this.contrastLevel=t.contrastLevel,this.isDark=t.isDark,this.sourceColorHct=_.fromInt(t.sourceColorArgb),this.primaryPalette=t.primaryPalette,this.secondaryPalette=t.secondaryPalette,this.tertiaryPalette=t.tertiaryPalette,this.neutralPalette=t.neutralPalette,this.neutralVariantPalette=t.neutralVariantPalette,this.errorPalette=P.fromHueAndChroma(25,84)}static getRotatedHue(t,a,s){const i=t.hue;if(a.length!==s.length)throw new Error(`mismatch between hue length ${a.length} & rotations ${s.length}`);if(s.length===1)return le(t.hue+s[0]);const o=a.length;for(let r=0;r<=o-2;r++){const d=a[r],h=a[r+1];if(d<i&&i<h)return le(i+s[r])}return i}getArgb(t){return t.getArgb(this)}getHct(t){return t.getHct(this)}get primaryPaletteKeyColor(){return this.getArgb(l.primaryPaletteKeyColor)}get secondaryPaletteKeyColor(){return this.getArgb(l.secondaryPaletteKeyColor)}get tertiaryPaletteKeyColor(){return this.getArgb(l.tertiaryPaletteKeyColor)}get neutralPaletteKeyColor(){return this.getArgb(l.neutralPaletteKeyColor)}get neutralVariantPaletteKeyColor(){return this.getArgb(l.neutralVariantPaletteKeyColor)}get background(){return this.getArgb(l.background)}get onBackground(){return this.getArgb(l.onBackground)}get surface(){return this.getArgb(l.surface)}get surfaceDim(){return this.getArgb(l.surfaceDim)}get surfaceBright(){return this.getArgb(l.surfaceBright)}get surfaceContainerLowest(){return this.getArgb(l.surfaceContainerLowest)}get surfaceContainerLow(){return this.getArgb(l.surfaceContainerLow)}get surfaceContainer(){return this.getArgb(l.surfaceContainer)}get surfaceContainerHigh(){return this.getArgb(l.surfaceContainerHigh)}get surfaceContainerHighest(){return this.getArgb(l.surfaceContainerHighest)}get onSurface(){return this.getArgb(l.onSurface)}get surfaceVariant(){return this.getArgb(l.surfaceVariant)}get onSurfaceVariant(){return this.getArgb(l.onSurfaceVariant)}get inverseSurface(){return this.getArgb(l.inverseSurface)}get inverseOnSurface(){return this.getArgb(l.inverseOnSurface)}get outline(){return this.getArgb(l.outline)}get outlineVariant(){return this.getArgb(l.outlineVariant)}get shadow(){return this.getArgb(l.shadow)}get scrim(){return this.getArgb(l.scrim)}get surfaceTint(){return this.getArgb(l.surfaceTint)}get primary(){return this.getArgb(l.primary)}get onPrimary(){return this.getArgb(l.onPrimary)}get primaryContainer(){return this.getArgb(l.primaryContainer)}get onPrimaryContainer(){return this.getArgb(l.onPrimaryContainer)}get inversePrimary(){return this.getArgb(l.inversePrimary)}get secondary(){return this.getArgb(l.secondary)}get onSecondary(){return this.getArgb(l.onSecondary)}get secondaryContainer(){return this.getArgb(l.secondaryContainer)}get onSecondaryContainer(){return this.getArgb(l.onSecondaryContainer)}get tertiary(){return this.getArgb(l.tertiary)}get onTertiary(){return this.getArgb(l.onTertiary)}get tertiaryContainer(){return this.getArgb(l.tertiaryContainer)}get onTertiaryContainer(){return this.getArgb(l.onTertiaryContainer)}get error(){return this.getArgb(l.error)}get onError(){return this.getArgb(l.onError)}get errorContainer(){return this.getArgb(l.errorContainer)}get onErrorContainer(){return this.getArgb(l.onErrorContainer)}get primaryFixed(){return this.getArgb(l.primaryFixed)}get primaryFixedDim(){return this.getArgb(l.primaryFixedDim)}get onPrimaryFixed(){return this.getArgb(l.onPrimaryFixed)}get onPrimaryFixedVariant(){return this.getArgb(l.onPrimaryFixedVariant)}get secondaryFixed(){return this.getArgb(l.secondaryFixed)}get secondaryFixedDim(){return this.getArgb(l.secondaryFixedDim)}get onSecondaryFixed(){return this.getArgb(l.onSecondaryFixed)}get onSecondaryFixedVariant(){return this.getArgb(l.onSecondaryFixedVariant)}get tertiaryFixed(){return this.getArgb(l.tertiaryFixed)}get tertiaryFixedDim(){return this.getArgb(l.tertiaryFixedDim)}get onTertiaryFixed(){return this.getArgb(l.onTertiaryFixed)}get onTertiaryFixedVariant(){return this.getArgb(l.onTertiaryFixedVariant)}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class te extends H{constructor(t,a,s){super({sourceColorArgb:t.toInt(),variant:W.EXPRESSIVE,contrastLevel:s,isDark:a,primaryPalette:P.fromHueAndChroma(le(t.hue+240),40),secondaryPalette:P.fromHueAndChroma(H.getRotatedHue(t,te.hues,te.secondaryRotations),24),tertiaryPalette:P.fromHueAndChroma(H.getRotatedHue(t,te.hues,te.tertiaryRotations),32),neutralPalette:P.fromHueAndChroma(t.hue+15,8),neutralVariantPalette:P.fromHueAndChroma(t.hue+15,12)})}}te.hues=[0,21,51,121,151,191,271,321,360];te.secondaryRotations=[45,95,45,20,45,90,45,45,45];te.tertiaryRotations=[120,120,20,45,20,15,20,120,120];/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ta extends H{constructor(t,a,s){super({sourceColorArgb:t.toInt(),variant:W.FRUIT_SALAD,contrastLevel:s,isDark:a,primaryPalette:P.fromHueAndChroma(le(t.hue-50),48),secondaryPalette:P.fromHueAndChroma(le(t.hue-50),36),tertiaryPalette:P.fromHueAndChroma(t.hue,36),neutralPalette:P.fromHueAndChroma(t.hue,10),neutralVariantPalette:P.fromHueAndChroma(t.hue,16)})}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ia extends H{constructor(t,a,s){super({sourceColorArgb:t.toInt(),variant:W.MONOCHROME,contrastLevel:s,isDark:a,primaryPalette:P.fromHueAndChroma(t.hue,0),secondaryPalette:P.fromHueAndChroma(t.hue,0),tertiaryPalette:P.fromHueAndChroma(t.hue,0),neutralPalette:P.fromHueAndChroma(t.hue,0),neutralVariantPalette:P.fromHueAndChroma(t.hue,0)})}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ra extends H{constructor(t,a,s){super({sourceColorArgb:t.toInt(),variant:W.NEUTRAL,contrastLevel:s,isDark:a,primaryPalette:P.fromHueAndChroma(t.hue,12),secondaryPalette:P.fromHueAndChroma(t.hue,8),tertiaryPalette:P.fromHueAndChroma(t.hue,16),neutralPalette:P.fromHueAndChroma(t.hue,2),neutralVariantPalette:P.fromHueAndChroma(t.hue,2)})}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Da extends H{constructor(t,a,s){super({sourceColorArgb:t.toInt(),variant:W.RAINBOW,contrastLevel:s,isDark:a,primaryPalette:P.fromHueAndChroma(t.hue,48),secondaryPalette:P.fromHueAndChroma(t.hue,16),tertiaryPalette:P.fromHueAndChroma(le(t.hue+60),24),neutralPalette:P.fromHueAndChroma(t.hue,0),neutralVariantPalette:P.fromHueAndChroma(t.hue,0)})}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ba extends H{constructor(t,a,s){super({sourceColorArgb:t.toInt(),variant:W.TONAL_SPOT,contrastLevel:s,isDark:a,primaryPalette:P.fromHueAndChroma(t.hue,36),secondaryPalette:P.fromHueAndChroma(t.hue,16),tertiaryPalette:P.fromHueAndChroma(le(t.hue+60),24),neutralPalette:P.fromHueAndChroma(t.hue,6),neutralVariantPalette:P.fromHueAndChroma(t.hue,8)})}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ae extends H{constructor(t,a,s){super({sourceColorArgb:t.toInt(),variant:W.VIBRANT,contrastLevel:s,isDark:a,primaryPalette:P.fromHueAndChroma(t.hue,200),secondaryPalette:P.fromHueAndChroma(H.getRotatedHue(t,ae.hues,ae.secondaryRotations),24),tertiaryPalette:P.fromHueAndChroma(H.getRotatedHue(t,ae.hues,ae.tertiaryRotations),32),neutralPalette:P.fromHueAndChroma(t.hue,10),neutralVariantPalette:P.fromHueAndChroma(t.hue,12)})}}ae.hues=[0,41,61,101,131,181,251,301,360];ae.secondaryRotations=[18,15,10,12,15,18,15,12,12];ae.tertiaryRotations=[35,30,20,25,30,35,30,25,25];/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yt(e){const t=ut(e),a=ft(e),s=mt(e),i=[t.toString(16),a.toString(16),s.toString(16)];for(const[o,r]of i.entries())r.length===1&&(i[o]="0"+r);return"#"+i.join("")}function Fa(e){e=e.replace("#","");const t=e.length===3,a=e.length===6,s=e.length===8;if(!t&&!a&&!s)throw new Error("unexpected hex "+e);let i=0,o=0,r=0;return t?(i=ee(e.slice(0,1).repeat(2)),o=ee(e.slice(1,2).repeat(2)),r=ee(e.slice(2,3).repeat(2))):a?(i=ee(e.slice(0,2)),o=ee(e.slice(2,4)),r=ee(e.slice(4,6))):s&&(i=ee(e.slice(2,4)),o=ee(e.slice(4,6)),r=ee(e.slice(6,8))),(255<<24|(i&255)<<16|(o&255)<<8|r&255)>>>0}function ee(e){return parseInt(e,16)}const bt=[{id:"tonal",label:"Tonal spot"},{id:"vibrant",label:"Vibrant"},{id:"expressive",label:"Expressive"},{id:"neutral",label:"Neutral"},{id:"rainbow",label:"Rainbow"},{id:"fruit",label:"Fruit salad"},{id:"mono",label:"Monochrome"}],rt={seed:null,style:"tonal"},ot=[{name:"Red",hex:"#e53935"},{name:"Pink",hex:"#d81b60"},{name:"Purple",hex:"#6750a4"},{name:"Indigo",hex:"#3f51b5"},{name:"Blue",hex:"#1e88e5"},{name:"Teal",hex:"#00897b"},{name:"Green",hex:"#43a047"},{name:"Olive",hex:"#9e9d24"},{name:"Amber",hex:"#ffb300"},{name:"Brown",hex:"#795548"}];function vt(e){if(typeof e!="string")return null;const t=e.trim().toLowerCase();return/^#[0-9a-f]{6}$/.test(t)?t:null}function Oa(e){try{const t=JSON.parse(e??"null"),a=bt.some(s=>s.id===(t==null?void 0:t.style))?t.style:rt.style;return{seed:vt(t==null?void 0:t.seed),style:a}}catch{return{...rt}}}function wt(e,t,a){const s=_.fromInt(Fa(e));switch(t){case"vibrant":return new ae(s,a,0);case"expressive":return new te(s,a,0);case"neutral":return new Ra(s,a,0);case"rainbow":return new Da(s,a,0);case"fruit":return new Ta(s,a,0);case"mono":return new Ia(s,a,0);default:return new Ba(s,a,0)}}function Na(e,t,a){const s=wt(e,t,a),i=h=>yt(h).toUpperCase(),o={primary:s.primary,"on-primary":s.onPrimary,"primary-container":s.primaryContainer,"on-primary-container":s.onPrimaryContainer,secondary:s.secondary,"on-secondary":s.onSecondary,"secondary-container":s.secondaryContainer,"on-secondary-container":s.onSecondaryContainer,tertiary:s.tertiary,"on-tertiary":s.onTertiary,surface:s.surface,"surface-dim":s.surfaceDim,"surface-bright":s.surfaceBright,"surface-container-lowest":s.surfaceContainerLowest,"surface-container-low":s.surfaceContainerLow,"surface-container":s.surfaceContainer,"surface-container-high":s.surfaceContainerHigh,"surface-container-highest":s.surfaceContainerHighest,"on-surface":s.onSurface,"on-surface-variant":s.onSurfaceVariant,outline:s.outline,"outline-variant":s.outlineVariant,error:s.error,"on-error":s.onError,background:s.background,"on-background":s.onBackground},r={};for(const[h,f]of Object.entries(o))r[`--md-sys-color-${h}`]=i(f);const d=a?{bg:s.surface,nav:s.surfaceContainerLow,"nav-hover":s.neutralPalette.tone(17),surface:s.surfaceContainer,"surface-2":s.surfaceContainerHigh,accent:s.secondaryContainer,"on-accent":s.onSecondaryContainer,primary:s.primary,"primary-bright":s.primaryPalette.tone(90),"primary-container":s.primaryContainer,"on-primary":s.onPrimary,text:s.onSurface,"text-dim":s.onSurfaceVariant,"text-muted":s.neutralVariantPalette.tone(65),border:s.neutralPalette.tone(17),"border-strong":s.outlineVariant,fav:s.error}:{bg:s.surface,nav:s.surfaceContainerLow,"nav-hover":s.surfaceContainerHigh,surface:s.surfaceContainer,"surface-2":s.surfaceContainerHigh,accent:s.secondaryContainer,"on-accent":s.onSecondaryContainer,primary:s.primary,"primary-bright":s.primary,"primary-container":s.primaryContainer,"on-primary":s.onPrimary,text:s.onSurface,"text-dim":s.onSurfaceVariant,"text-muted":s.outline,border:s.neutralVariantPalette.tone(88),"border-strong":s.outlineVariant,fav:s.error};for(const[h,f]of Object.entries(d))r[`--oppai-${h}`]=i(f);return r}const kt=1;function za(e){return JSON.stringify({...e,css:$t(e),v:kt})}function _a(e){try{const t=JSON.parse(e??"null");return!!vt(t==null?void 0:t.seed)&&(t==null?void 0:t.v)!==kt}catch{return!1}}function $t(e){if(!e.seed)return"";const t=(a,s)=>`${a} {
${Object.entries(Na(e.seed,e.style,s)).map(([i,o])=>`  ${i}: ${o};`).join(`
`)}
}`;return`${t(":root",!0)}
${t(':root[data-theme="light"]',!1)}
`}function Ie(e,t){const a=wt(e,t,!1);return[a.primaryPalette.tone(70),a.secondaryPalette.tone(80),a.tertiaryPalette.tone(70)].map(s=>yt(s))}function Ua(e){const t=/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)$/.exec(e.trim());return!t||t[4]!==void 0&&Number(t[4])===0?null:"#"+[t[1],t[2],t[3]].map(a=>Number(a).toString(16).padStart(2,"0")).join("")}var Va=Object.defineProperty,Ga=Object.getOwnPropertyDescriptor,v=(e,t,a,s)=>{for(var i=s>1?void 0:s?Ga(t,a):t,o=e.length-1,r;o>=0;o--)(r=e[o])&&(i=(s?r(t,a,i):r(i))||i);return s&&i&&Va(t,a,i),i};const Ka=[{id:"appearance",label:"Appearance",icon:"palette",group:"You"},{id:"account",label:"Account",icon:"account_circle",group:"You"},{id:"library",label:"Library",icon:"inventory_2",group:"Library"},{id:"scraping",label:"Import & scraping",icon:"travel_explore",group:"Library",server:!0},{id:"ai",label:"Tagging & descriptions",icon:"smart_toy",group:"AI",server:!0},{id:"imagegen",label:"Image generation",icon:"auto_awesome",group:"AI",server:!0},{id:"android",label:"Android app",icon:"android",group:"Apps"},{id:"launchy",label:"Launchy",icon:"sports_esports",group:"Apps"},{id:"storage",label:"Storage",icon:"hard_drive",group:"Server"},{id:"privacy",label:"Privacy",icon:"visibility_off",group:"Server",server:!0,adminOnly:!0},{id:"diagnostics",label:"Diagnostics",icon:"speed",group:"Server",adminOnly:!0},{id:"about",label:"About",icon:"info",group:"Server"}];let g=class extends ze{constructor(){super(...arguments),this.only="",this.startTab="",this.tab="appearance",this.settings=null,this.info=null,this.stats=null,this.apk=null,this.loadError="",this.passkeyList=null,this.passkeyBusy=!1,this.passkeyError="",this.passkeyMsg="",this.passkeyName="",this.passkeyRenaming=null,this.passkeyRevoking=null,this.passkeyPassword="",this.diag=null,this.uiDiag=null,this.storage=null,this.storageBusy=!1,this.storageErr="",this.diagBusy=!1,this.diagErr="",this.dirty=!1,this.saving=!1,this.saved=!1,this.theme=Lt(),this.you=Oa(je()),this.fit=Mt(),this.hideLibby=St(),this.genModels=[],this.genLoras=[],this.genLoraTriggers={},this.genBoards=[],this.genError="",this.genStatus=null,this.genChecks=null,this.genCheckBusy=!1,this.genRestart="",this.genCheckErr="",this.comfy=null,this.comfyErr="",this.comfyBusy=!1,this.comfyFolder=null,this.comfyChecks=null,this.comfyCheckBusy=!1,this.comfyCheckErr="",this.pwCurrent="",this.pwNew="",this.pwConfirm="",this.pwBusy=!1,this.pwMsg="",this.pwErr="",this.refs=null,this.refStamp=Date.now(),this.refNote="",this.tts=void 0,this.describe=null,this.describeBusy=!1,this.describeNote="",this.ttsErrors={},this.addPasskey=async()=>{this.passkeyBusy=!0,this.passkeyError="",this.passkeyMsg="";try{const e=await Vt(this.passkeyName.trim());this.passkeyName="",this.passkeyMsg=`Added “${e.name}”. You can sign in with it now.`,await this.loadPasskeys()}catch(e){const t=Gt(e);t&&(this.passkeyError=t)}finally{this.passkeyBusy=!1}},this.cancelRevoke=()=>{this.passkeyRevoking=null,this.passkeyPassword=""},this.loadStorage=async()=>{this.storageBusy=!0,this.storageErr="";try{this.storage=await C.storage()}catch(e){this.storageErr=e.message}finally{this.storageBusy=!1}},this.runCleanup=async()=>{this.storageBusy=!0,this.storageErr="";try{const e=await C.cleanupStorage(["uploads","temp"]);this.storage=e.storage,Y(`Reclaimed ${e.freedHuman}.`,"success")}catch(e){this.storageErr=e.message}finally{this.storageBusy=!1}},this.loadDiagnostics=async()=>{this.diagBusy=!0,this.diagErr="";try{this.diag=await C.diagnostics(),this.uiDiag=Je()}catch(e){this.diagErr=e.message}finally{this.diagBusy=!1}},this.resetDiagnostics=async()=>{this.diagBusy=!0,this.diagErr="";try{Et(),await C.resetDiagnostics(),this.diag=await C.diagnostics(),this.uiDiag=Je()}catch(e){this.diagErr=e.message}finally{this.diagBusy=!1}}}willUpdate(e){e.has("startTab")&&this.startTab&&(this.tab=this.startTab)}connectedCallback(){super.connectedCallback(),_a(je())&&this.pickYou(this.you),Tt(this,"settings"),this.load(),this.loadGenLists(),this.loadComfy(),this.loadTTS(),this.loadDescribe(),this.loadReferences()}async loadReferences(){try{this.refs=await C.libbyReferences()}catch{this.refs=null}}async setReference(e,t){var i;const a=(i=t.files)==null?void 0:i[0];if(t.value="",!a)return;const s=await new Promise((o,r)=>{const d=new FileReader;d.onload=()=>o(String(d.result)),d.onerror=()=>r(d.error),d.readAsDataURL(a)});try{await C.setLibbyReference(e,s),this.refNote="",this.refStamp=Date.now(),await this.loadReferences()}catch(o){this.refNote=o.message}}async clearReference(e){try{await C.deleteLibbyReference(e),this.refNote="",await this.loadReferences()}catch(t){this.refNote=t.message}}referenceTile(e,t){var s;const a=!!((s=this.refs)!=null&&s[e]);return n`<div style="display:flex;flex-direction:column;gap:6px;align-items:center;width:132px;">
      <div style="width:132px;height:176px;border-radius:12px;overflow:hidden;display:grid;place-items:center;
        background:var(--md-sys-color-surface-container-highest);color:var(--md-sys-color-on-surface-variant);font-size:12px;text-align:center;">
        ${a?n`<img src=${C.libbyReferenceURL(e,this.refStamp)} alt=${`Libby, ${t.toLowerCase()}`} style="width:100%;height:100%;object-fit:cover;"/>`:n`<span>No picture</span>`}
      </div>
      <strong style="font-size:12px;">${t}</strong>
      <div style="display:flex;gap:6px;">
        <label class="btn-inline">
          ${a?"Replace":"Upload"}
          <input type="file" accept="image/*" hidden ?disabled=${!this.canEdit}
            @change=${i=>void this.setReference(e,i.target)}/>
        </label>
        ${a?n`<button class="btn-inline" ?disabled=${!this.canEdit}
          @click=${()=>void this.clearReference(e)}>Remove</button>`:c}
      </div>
    </div>`}async load(){try{const[e,t]=await Promise.all([C.getSettings(),C.stats()]);this.settings=e.settings,this.info=e.readOnly,this.stats=t}catch(e){this.loadError=e.message}try{this.apk=await C.apkInfo()}catch{this.apk={available:!1}}}get canEdit(){var e;return!!((e=this.user)!=null&&e.isAdmin)}openTab(e){Xe(()=>{this.tab=e}),e==="diagnostics"&&!this.diag&&!this.diagBusy&&this.loadDiagnostics(),e==="storage"&&!this.storage&&!this.storageBusy&&this.loadStorage(),e==="account"&&!this.passkeyList&&this.loadPasskeys()}editLora(e,t){var s;const a=[...((s=this.settings)==null?void 0:s.libbyGenLoras)??[]];a[e]&&(a[e]={...a[e],...t},this.edit({libbyGenLoras:a}))}editCameraLora(e,t){var i;const a=[...((i=this.settings)==null?void 0:i.libbyCameraLoras)??[]];if(!a[e])return;const s={...a[e],...t};t.name&&!a[e].trigger&&(s.trigger=this.genLoraTriggers[t.name]??""),a[e]=s,this.edit({libbyCameraLoras:a})}edit(e){!this.settings||!this.canEdit||(this.settings={...this.settings,...e},this.dirty=!0,this.saved=!1)}async save(){if(this.settings){this.saving=!0;try{const e=await C.saveSettings(this.settings);this.settings=e.settings,this.info=e.readOnly,this.dirty=!1,this.saved=!0,It(!!e.settings.incognito),this.loadTTS(!0),this.loadDescribe(),this.loadGenLists(),this.loadComfy()}catch(e){this.loadError=e.message}finally{this.saving=!1}}}pickTheme(e){this.theme=e,Rt(e),Dt(e)}pickYou(e){this.you=e,Bt(za(e)),Xe(()=>Ft($t(e)))}systemAccent(){if(!CSS.supports("color","AccentColor"))return null;const e=document.createElement("span");e.style.color="AccentColor",document.body.appendChild(e);const t=Ua(getComputedStyle(e).color);return e.remove(),t}pickFit(e){this.fit=e,Ot(e)}async changePassword(){if(this.pwMsg="",this.pwErr="",this.pwNew!==this.pwConfirm){this.pwErr="The new passwords don't match.";return}if(this.pwNew.length<8){this.pwErr="Use at least 8 characters.";return}this.pwBusy=!0;try{await C.changePassword(this.pwCurrent,this.pwNew),this.pwMsg="Password changed.",this.pwCurrent=this.pwNew=this.pwConfirm=""}catch(e){this.pwErr=e.message}finally{this.pwBusy=!1}}render(){if(this.only)return this.renderOnly(this.only);const e=Ka.filter(i=>!i.adminOnly||this.canEdit),t=e.find(i=>i.id===this.tab)??e[0],a=this.dirty||this.saved;let s="";return n`
      <div class="shell">
        <nav class="cat-rail" aria-label="Settings categories">
          ${e.map(i=>{const o=i.group===s?c:n`<div class="cat-head">${i.group}</div>`;return s=i.group,n`${o}
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
          <h2 class="panel-title">${t.label}</h2>
          ${this.loadError?n`<div class="banner error">
                <span class="material-symbols-rounded" style="font-size:18px;">error</span>
                ${this.loadError}
              </div>`:c}
          ${!this.canEdit&&this.settings&&t.server?n`<div class="banner info">
                <span class="material-symbols-rounded" style="font-size:18px;">lock</span>
                Server settings are read-only — only an admin can change them.
              </div>`:c}
          ${this.renderTab()}
          ${a?this.renderSaveBar():c}
        </div>
      </div>
    `}renderOnly(e){const t={"libby-general":()=>this.renderLibby(),"libby-model":()=>this.renderLibbyModel(),"libby-voice":()=>this.renderLibbyVoice(),"libby-pictures":()=>n`${this.renderLibbyImageGen()}${this.renderLibbyReferences()}`}[e];return n`<div class="embedded">
      ${this.loadError?n`<div class="banner error"><span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.loadError}</div>`:c}
      ${!this.canEdit&&this.settings&&e!=="libby-general"?n`<div class="banner info"><span class="material-symbols-rounded" style="font-size:18px;">lock</span>Server settings are read-only — only an admin can change them.</div>`:c}
      ${t()}
      ${this.dirty||this.saved?this.renderSaveBar():c}
    </div>`}renderTab(){switch(this.tab){case"appearance":return this.renderAppearance();case"ai":return this.renderAI();case"scraping":return this.renderScraping();case"imagegen":return this.renderImageGen();case"library":return this.renderLibrary();case"android":return this.renderAndroid();case"launchy":return n`<oppai-launchy-panel></oppai-launchy-panel>`;case"account":return this.renderAccount();case"storage":return this.renderStorage();case"diagnostics":return this.renderDiagnostics();case"privacy":return this.renderPrivacy();default:return this.renderAbout()}}renderSaveBar(){return n`
      <div class="savebar">
        <span class="grow">
          ${this.saved&&!this.dirty?"Settings saved — they're live now.":"You have unsaved changes."}
        </span>
        <button class="btn-primary" ?disabled=${this.saving||!this.dirty} @click=${this.save}>
          <span class="material-symbols-rounded" style="font-size:20px;">save</span>
          ${this.saving?"Saving…":"Save"}
        </button>
      </div>
    `}renderAndroid(){const e=this.apk;return n`
      <section class="card">
        <h3><span class="material-symbols-rounded">android</span>Android app</h3>
        <p class="card-sub">
          Install the companion app straight from this server — no app store, no
          sideloading from a third party.
        </p>

        ${e===null?n`<p class="field-help">Checking…</p>`:e.available?n`
                <div class="field">
                  <div class="field-text">
                    <div class="field-label">oppailib.apk</div>
                    <div class="field-help">
                      ${oe(e.size??0)} · built
                      ${new Date((e.modified??0)*1e3).toLocaleDateString()}
                      ${e.sha256?n`<br /><span style="font-family:monospace; font-size:11px;"
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
              `:n`<p class="field-help">
                No APK is bundled with this server build. Drop one at
                <code>/config/oppailib.apk</code>, or grab it from the Actions run that
                built this image.
              </p>`}
      </section>
    `}renderSwatches(){const{seed:e,style:t}=this.you,a=this.systemAccent(),s=new Set([...ot.map(o=>o.hex),a??""]),i=(o,r,d)=>n`<button
      class="swatch ${e===r?"on":""}" title=${o} aria-label=${o} aria-pressed=${e===r?"true":"false"}
      @click=${()=>this.pickYou({seed:r,style:t})}>
      <span class="dot">${d.map(h=>n`<i style="background:${h}"></i>`)}</span>
      ${e===r?n`<span class="material-symbols-rounded check">check</span>`:c}
    </button>`;return n`
      ${i("OppaiLib (the original orange)",null,["#FFB77C","#E4C0A4","#D2C78C"])}
      ${ot.map(o=>i(o.name,o.hex,Ie(o.hex,t)))}
      ${a?i("Your system's accent colour",a,Ie(a,t)):c}
      ${e&&!s.has(e)?i("Your colour",e,Ie(e,t)):c}
      <label class="swatch custom" title="Pick any colour">
        <span class="dot"></span>
        <span class="material-symbols-rounded check">colorize</span>
        <input type="color" aria-label="Pick any colour" .value=${e??"#ffb77c"}
          @change=${o=>this.pickYou({seed:o.target.value.toLowerCase(),style:t})} />
      </label>`}renderAppearance(){return n`
      <section class="card">
        <h3><span class="material-symbols-rounded">palette</span>Appearance</h3>
        <p class="card-sub">Per-device — applies as soon as you pick it.</p>

        <div class="field">
          <div class="field-text">
            <div class="field-label">Theme</div>
            <div class="field-help">"System" follows your OS light/dark setting.</div>
          </div>
          <div class="field-control seg">
            ${[["dark","Dark","dark_mode"],["light","Light","light_mode"],["system","System","contrast"]].map(([e,t,a])=>n`<button
                class=${this.theme===e?"on":""}
                @click=${()=>this.pickTheme(e)}
              >
                <span class="material-symbols-rounded" style="font-size:18px;">${a}</span>${t}
              </button>`)}
          </div>
        </div>

        <div class="field">
          <div class="field-text">
            <div class="field-label">Colours</div>
            <div class="field-help">
              Material You: the whole palette worked out from one colour, as Android does from your
              wallpaper. The app on your phone follows the phone's own.
            </div>
          </div>
          <div class="field-control you">${this.renderSwatches()}</div>
        </div>
        ${this.you.seed?n`<div class="field">
              <div class="field-text">
                <div class="field-label">Palette style</div>
                <div class="field-help">Android's styles: how far the other colours stray from the one you picked.</div>
              </div>
              <div class="field-control seg wrap">
                ${bt.map(e=>n`<button class=${this.you.style===e.id?"on":""}
                  @click=${()=>this.pickYou({...this.you,style:e.id})}>${e.label}</button>`)}
              </div>
            </div>`:c}

        <div class="field">
          <div class="field-text">
            <div class="field-label">Comic page size</div>
            <div class="field-help">
              How pages are sized in the reader. Fit page shows the whole page; fit width fills the
              column and scrolls.
            </div>
          </div>
          <div class="field-control seg">
            ${[["page","Fit page","fit_screen"],["width","Fit width","fit_width"]].map(([e,t,a])=>n`<button
                class=${this.fit===e?"on":""}
                @click=${()=>this.pickFit(e)}
              >
                <span class="material-symbols-rounded" style="font-size:18px;">${a}</span>${t}
              </button>`)}
          </div>
        </div>
      </section>
    `}renderPrivacy(){const e=this.settings,t=!!(e!=null&&e.incognito);return n`
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
    `}renderLibby(){return n`
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
              @click=${()=>{this.hideLibby=!this.hideLibby,Nt(this.hideLibby)}}
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
            ${zt.map(e=>n`<button
              class=${_t()===e?"on":""}
              @click=${()=>{Ut(e),this.requestUpdate()}}
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
              Open the Sprite studio
            </button>
          </div>
        </div>
      </section>
    `}renderLibbyVoice(){const e=this.settings;if(!e)return c;const t=this.tts,a=(t==null?void 0:t.voices)??[],s=a.filter(r=>r.installed),i=a.filter(r=>!r.installed),o=new Set((t==null?void 0:t.downloading)??[]);return n`<section class="card">
      <h3><span class="material-symbols-rounded">record_voice_over</span>Libby’s voice</h3>
      <p class="card-sub">
        ${t===void 0?"Checking the server…":t?t.engine==="kokoro"&&t.ready?n`Speaking with <strong>Kokoro</strong>, the natural voice, on the server’s CPU. Turn playback on per device with the speaker button in Chat.`:t.engine==="piper"&&t.ready?n`Speaking with <strong>piper</strong> on the server’s CPU. Turn playback on per device with the speaker button in Chat.`:t.engine==="openai"&&t.ready?n`Speaking through the speech server at <code>${e.ttsUrl}</code>.`:n`Not speaking from the server${t.detail?n` — ${t.detail}`:c}. Devices fall back to their own voices.`:"The server did not answer about speech."}
      </p>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Engine</div>
          <div class="field-help">Auto uses the most natural voice there is — a speech server when one is set below (falling back to this box if it fails), then Kokoro, then piper. Piper is quicker and flatter; Off leaves devices to their own voices.</div>
        </div>
        <div class="field-control">
          <select ?disabled=${!this.canEdit} @change=${r=>this.edit({ttsEngine:r.target.value})}>
            ${[["auto","Auto"],["kokoro",`Kokoro — natural${t&&!t.kokoroInstalled?" (not installed)":""}`],["piper",`Piper — light${t&&!t.piperInstalled?" (not installed)":""}`],["openai","Speech server"],["off","Off"]].map(([r,d])=>n`<option value=${r} ?selected=${e.ttsEngine===r}>${d}</option>`)}
          </select>
        </div>
      </div>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Voice</div>
          <div class="field-help">${s.length?"Installed voices. Downloaded ones can be removed below.":"No voice is installed yet — download one below."}</div>
        </div>
        <div class="field-control" style="display:flex; gap:8px; align-items:center;">
          <select ?disabled=${!this.canEdit} @change=${r=>this.edit({ttsVoice:r.target.value})}>
            <option value="" ?selected=${!e.ttsVoice}>Engine’s default</option>
            ${s.map(r=>n`<option value=${r.id} ?selected=${r.id===e.ttsVoice}>${r.label}${r.bundled?" · bundled":""}</option>`)}
            ${e.ttsVoice&&!s.some(r=>r.id===e.ttsVoice)?n`<option value=${e.ttsVoice} selected>${e.ttsVoice} (not installed)</option>`:c}
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
            @input=${r=>this.edit({ttsSpeed:Number(r.target.value)})} />
        </div>
      </div>

      ${t!=null&&t.piperInstalled&&t.engine!=="kokoro"?n`<div class="field stack">
        <div class="field-text">
          <div class="field-label">Piper voices</div>
          <div class="field-help">A curated handful from piper’s voice set, fetched from Hugging Face onto the server (20–110 MB each). Any other piper voice dropped into <code>/config/tts</code> is listed too.</div>
        </div>
        <div class="field-control">
          <ul class="voice-list">
            ${s.map(r=>n`<li><span>${r.label}<small>${r.quality??""}${r.bundled?" · bundled":""}</small></span>
              ${!r.bundled&&this.canEdit?n`<button class="btn" @click=${()=>void this.deleteVoice(r.id)}>Remove</button>`:c}</li>`)}
            ${i.map(r=>n`<li><span>${r.label}<small>${r.quality??""}${r.bytes?` · ${Math.round(r.bytes/1e6)} MB`:""}</small></span>
              ${this.ttsErrors[r.id]?n`<em class="voice-error">${this.ttsErrors[r.id]}</em>`:c}
              ${o.has(r.id)?n`<span class="hint">Downloading…</span>`:this.canEdit?n`<button class="btn" @click=${()=>void this.downloadVoice(r.id)}>Download</button>`:c}</li>`)}
          </ul>
        </div>
      </div>`:c}

      <div class="field stack">
        <div class="field-text">
          <div class="field-label">Speech server (optional)</div>
          <div class="field-help">An OpenAI-compatible <code>/v1/audio/speech</code> server on a GPU — Chatterbox, Orpheus-FastAPI, Kokoro-FastAPI — such as <code>http://host:8004</code>. Set the model to <code>chatterbox</code> or <code>orpheus</code> and her laughs and sighs are performed as sounds rather than dropped.</div>
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
    </section>`}async loadTTS(e=!1){var t,a;this.tts=await ht(e);try{this.ttsErrors=await C.ttsVoiceErrors()}catch{}(a=(t=this.tts)==null?void 0:t.downloading)!=null&&a.length&&window.setTimeout(()=>void this.loadTTS(!0),4e3)}async loadDescribe(){try{this.describe=await C.describeStatus()}catch{this.describe=null}}async probeVision(){this.describeBusy=!0,this.describeNote="";try{const e=await C.describeProbe();this.describeNote=`The model answered: “${e.description}”`}catch(e){this.describeNote=e.message}finally{this.describeBusy=!1}}async toggleBackfill(){var e;this.describeBusy=!0;try{(e=this.describe)!=null&&e.backfilling?await C.describeBackfillStop():await C.describeBackfill(),await this.loadDescribe()}catch(t){this.describeNote=t.message}finally{this.describeBusy=!1}}async testVoice(){pt(),await ea("Hi. This is what I sound like. Saved to your library, by the way — nice pick.")}async downloadVoice(e){try{await C.downloadTTSVoice(e),await this.loadTTS(!0)}catch(t){this.loadError=t.message}}async deleteVoice(e){if(confirm(`Remove the ${e} voice from the server?`))try{await C.deleteTTSVoice(e),await this.loadTTS(!0)}catch(t){this.loadError=t.message}}renderLibbyModel(){const e=this.settings;return n`
      <section class="card">
        <h3><span class="material-symbols-rounded">memory</span>Her model</h3>
        <p class="card-sub">The chat backend every character talks through. Saved for the whole server.</p>
        ${e?n`
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
                    ${[["","Auto (from the model name)"],["small","Small — 7B to 13B"],["large","Large — 24B and up"]].map(([t,a])=>n`<option value=${t} ?selected=${e.chatModelTier===t}>${a}</option>`)}
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
                    ${[["","Auto (from the model name)"],["on","On — her model can see"],["off","Off — tags only"]].map(([t,a])=>n`<option value=${t} ?selected=${(e.chatVision??"")===t}>${a}</option>`)}
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
                    ${[["","Both loaded"],["swap","Swap for pictures"]].map(([t,a])=>n`<option value=${t} ?selected=${(e.gpuShare??"")===t}>${a}</option>`)}
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
                    ${[["","Auto"],["native","Native tool calls"],["json","JSON answers"]].map(([t,a])=>n`<option value=${t} ?selected=${(e.chatToolMode??"")===t}>${a}</option>`)}
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
            `:n`<div class="field-help">Loading…</div>`}
      </section>
    `}renderLibbyReferences(){return n`
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
                  ${this.refNote?n`<div class="field-help" style="color:var(--md-sys-color-error);">${this.refNote}</div>`:c}
                </div>
                <div class="field-control" style="display:flex;gap:16px;flex-wrap:wrap;">
                  ${this.referenceTile("clothed","Usual outfit")}
                  ${this.referenceTile("nude","Nothing on")}
                </div>
              </div>
      </section>
    `}renderLibbyImageGen(){var o;const e=this.settings;if(!e)return c;if(!e.imageGenEnabled)return n`<section class="card">
        <h3><span class="material-symbols-rounded">auto_awesome</span>Libby’s image generation</h3>
        <p class="card-sub">
          Set an image generator URL under <strong>Settings → Image generation</strong> and Libby can offer to make
          pictures for you in chat. She always asks first — nothing is generated or saved until
          you press Allow.
        </p>
      </section>`;const t=this.genModels,a=this.genLoras,s=e.libbyGenLoras??[],i=this.genBoards;return n`<section class="card">
      <h3><span class="material-symbols-rounded">auto_awesome</span>Libby’s image generation</h3>
      <p class="card-sub">
        What she uses when she offers to make you a picture. She always asks first — nothing is
        generated or saved until you press Allow.
        ${this.genError?n`<br /><span style="color:var(--oppai-danger,#ff6b6b);">${this.genError}</span>`:c}
      </p>

      <div class="field">
        <div class="field-text">
          <div class="field-label">Model</div>
          <div class="field-help">The checkpoint her pictures are made with. Leave on the
            generator’s default to use whatever it loads.</div>
        </div>
        <div class="field-control">
          ${t.length?n`<select ?disabled=${!this.canEdit}
                @change=${r=>this.edit({libbyGenModel:r.target.value})}>
                <option value="" ?selected=${!e.libbyGenModel}>Generator’s default</option>
                ${t.map(r=>n`<option value=${r} ?selected=${r===e.libbyGenModel}>${r}</option>`)}
              </select>`:n`<input type="text" autocomplete="off" placeholder="Generator’s default"
                .value=${e.libbyGenModel} ?disabled=${!this.canEdit}
                @change=${r=>this.edit({libbyGenModel:r.target.value})} />`}
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
          ${s.map((r,d)=>n`<div style="display:flex; gap:8px; align-items:center;">
            ${a.length?n`<select style="flex:1; min-width:0;" ?disabled=${!this.canEdit}
                  aria-label="LoRA ${d+1}"
                  @change=${h=>this.editLora(d,{name:h.target.value})}>
                  ${(a.includes(r.name)?a:[r.name,...a]).map(h=>n`<option value=${h} ?selected=${h===r.name}>${h}</option>`)}
                </select>`:n`<input type="text" autocomplete="off" placeholder="LoRA name" style="flex:1; min-width:0;"
                  aria-label="LoRA ${d+1}"
                  .value=${r.name} ?disabled=${!this.canEdit}
                  @change=${h=>this.editLora(d,{name:h.target.value})} />`}
            <input type="number" step="0.05" min="-2" max="2" style="width:90px;"
              aria-label="LoRA ${d+1} strength"
              .value=${String(r.weight)} ?disabled=${!this.canEdit}
              @change=${h=>this.editLora(d,{weight:Number(h.target.value)})} />
            <button class="btn-inline" title="Remove" aria-label="Remove LoRA ${d+1}" ?disabled=${!this.canEdit}
              @click=${()=>this.edit({libbyGenLoras:s.filter((h,f)=>f!==d)})}>
              <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
            </button>
          </div>`)}
          <button class="btn-inline" style="align-self:flex-start; display:inline-flex; align-items:center; gap:6px;"
            ?disabled=${!this.canEdit||s.length>=8}
            @click=${()=>this.edit({libbyGenLoras:[...s,{name:a.find(r=>!s.some(d=>d.name===r))??"",weight:1}]})}>
            <span class="material-symbols-rounded" style="font-size:18px;">add</span>
            ${s.length?"Add another LoRA":"Add a LoRA"}
          </button>
        </div>
      </div>

      ${i.length?n`<div class="field">
            <div class="field-text">
              <div class="field-label">Board</div>
              <div class="field-help">The InvokeAI board her pictures are filed into, so what she
                makes stays separate from your own generations.</div>
            </div>
            <div class="field-control">
              <select ?disabled=${!this.canEdit}
                @change=${r=>this.edit({libbyGenBoard:r.target.value})}>
                <option value="" ?selected=${!e.libbyGenBoard}>Uncategorized</option>
                ${i.map(r=>n`<option value=${r} ?selected=${r===e.libbyGenBoard}>${r}</option>`)}
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
            @change=${r=>this.edit({libbyGenPrompt:r.target.value})}></textarea>
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
            @change=${r=>this.edit({libbyGenNegativePrompt:r.target.value})}></textarea>
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
            @change=${r=>this.edit({libbyCameraCandidates:Number(r.target.value)})}>
            ${[1,2,3,4].map(r=>n`<option value=${r} ?selected=${(e.libbyCameraCandidates||2)===r}>${r}</option>`)}
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
            @change=${r=>this.edit({libbyPoseModule:r.target.value})}/>
          <input placeholder="control_v11p_sd15_openpose" .value=${e.libbyPoseModel??""} ?disabled=${!this.canEdit}
            @change=${r=>this.edit({libbyPoseModel:r.target.value})}/>
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
            @change=${r=>this.edit({libbyFaceModule:r.target.value})}/>
          <input placeholder="ip-adapter-plus-face_sd15" .value=${e.libbyFaceModel??""} ?disabled=${!this.canEdit}
            @change=${r=>this.edit({libbyFaceModel:r.target.value})}/>
        </div>
      </div>

      <div class="field stack">
        <div class="field-text">
          <div class="field-label">Clips</div>
          <div class="field-help">
            She can turn the last picture she sent into a few seconds of video, with the
            picture-to-video workflow under <b>Image generation → Video</b> — the same one
            the Video studio uses. ${e.libbyClipUrl&&(e.libbyClipWorkflow||(o=e.clipImageModels)!=null&&o.model)?n`It is set up, so she can.`:n`It is not set up yet, so she can't.`}
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
            @change=${r=>this.edit({libbyStoriesPerDay:Number(r.target.value)})}>
            ${[1,2,3,4,6].map(r=>n`<option value=${r} ?selected=${(e.libbyStoriesPerDay||2)===r}>${r} a day</option>`)}
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
    </section>`}async loadGenLists(){this.genError="";try{const e=await C.imageGenStatus();if(this.genStatus=e,!e.enabled||!e.reachable){e.enabled&&(this.genError=e.error||"The image generator isn't reachable.");return}this.genModels=(e.models??[]).map(t=>t.title||t.model_name).filter(Boolean),this.genLoras=(e.loras??[]).map(t=>t.name).filter(Boolean),this.genLoraTriggers=Object.fromEntries((e.loras??[]).map(t=>[t.name,(t.triggerPhrases??[]).join(", ")])),this.genBoards=(e.boards??[]).map(t=>t.name).filter(Boolean)}catch(e){this.genStatus=null,this.genError=e.message}}renderCameraLoras(e){const t=this.genLoras,a=e.libbyCameraLoras??[];return n`<div class="field stack">
      <div class="field-text">
        <div class="field-label">LoRAs she can choose</div>
        <div class="field-help">
          Ones she adds to a single picture when the shot calls for it — a pose, an act, a
          style — on top of the LoRAs above. Say when each one helps; that note is all she
          has to go on. Trigger words are added to the prompt with it.
        </div>
      </div>
      <div class="field-control" style="display:flex; flex-direction:column; gap:12px; align-items:stretch;">
        ${a.map((s,i)=>n`<div style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; gap:8px; align-items:center;">
            ${t.length?n`<select style="flex:1; min-width:0;" ?disabled=${!this.canEdit} aria-label="Optional LoRA ${i+1}"
                  @change=${o=>this.editCameraLora(i,{name:o.target.value})}>
                  ${(t.includes(s.name)?t:[s.name,...t]).map(o=>n`<option value=${o} ?selected=${o===s.name}>${o}</option>`)}
                </select>`:n`<input type="text" autocomplete="off" placeholder="LoRA name" style="flex:1; min-width:0;"
                  aria-label="Optional LoRA ${i+1}" .value=${s.name} ?disabled=${!this.canEdit}
                  @change=${o=>this.editCameraLora(i,{name:o.target.value})} />`}
            <input type="number" step="0.05" min="-2" max="2" style="width:90px;"
              aria-label="Optional LoRA ${i+1} strength" .value=${String(s.weight)} ?disabled=${!this.canEdit}
              @change=${o=>this.editCameraLora(i,{weight:Number(o.target.value)})} />
            <button class="btn-inline" title="Remove" aria-label="Remove optional LoRA ${i+1}" ?disabled=${!this.canEdit}
              @click=${()=>this.edit({libbyCameraLoras:a.filter((o,r)=>r!==i)})}>
              <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
            </button>
          </div>
          <input type="text" autocomplete="off" maxlength="160" placeholder="When it helps — e.g. POV shots from above"
            aria-label="When optional LoRA ${i+1} helps" .value=${s.when} ?disabled=${!this.canEdit}
            @change=${o=>this.editCameraLora(i,{when:o.target.value})} />
          <input type="text" autocomplete="off" maxlength="200" placeholder="Trigger words (optional)"
            aria-label="Optional LoRA ${i+1} trigger words" .value=${s.trigger} ?disabled=${!this.canEdit}
            @change=${o=>this.editCameraLora(i,{trigger:o.target.value})} />
        </div>`)}
        <button class="btn-inline" style="align-self:flex-start; display:inline-flex; align-items:center; gap:6px;"
          ?disabled=${!this.canEdit||a.length>=12}
          @click=${()=>{const s=t.find(i=>!a.some(o=>o.name===i))??"";this.edit({libbyCameraLoras:[...a,{name:s,weight:1,when:"",trigger:this.genLoraTriggers[s]??""}]})}}>
          <span class="material-symbols-rounded" style="font-size:18px;">add</span>
          ${a.length?"Add another":"Add one she can choose"}
        </button>
      </div>
    </div>`}renderAI(){const e=this.settings,t=this.info;return n`
      <section class="card">
        <h3><span class="material-symbols-rounded">auto_awesome</span>AI auto-tagging</h3>
        <p class="card-sub">
          Tagging runs entirely on this box — no image ever leaves it. The heuristic tagger needs no
          model; a real classifier requires an ONNX build with a model in the model directory.
        </p>

        ${e?n`
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

              ${t?n`
                    ${this.readOnlyField("Active tagger","Chosen at startup.",t.aiTagger)}
                    ${this.readOnlyField("Inference device","OPPAI_AI_DEVICE — needs a restart to change.",t.aiDevice)}
                    ${this.readOnlyField("Model directory","OPPAI_AI_MODEL_DIR — needs a restart to change.",t.aiModelDir)}
                  `:c}
            `:n`<div class="field-help">Loading…</div>`}
      </section>
      ${this.renderVision()}
    `}renderVision(){const e=this.settings,t=this.describe;return n`
      <section class="card">
        <h3><span class="material-symbols-rounded">description</span>Describing pictures</h3>
        <p class="card-sub">
          A vision model on your own network writes what each picture or clip shows — who is where,
          doing what, in what style. The prose is stored encrypted, searchable from the library's search box,
          shown in the viewer, and given to Libby when a picture comes up. Any OpenAI-compatible server whose model
          accepts images works: Ollama or LM Studio with a llava, qwen-vl or gemma3 build, llama.cpp server with an mmproj.
        </p>
        ${e?n`
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
                    @change=${a=>this.edit({visionUrl:a.target.value})} />
                </div>
                <div class="field-control">
                  <input type="text" autocomplete="off" placeholder="Model name, e.g. qwen2.5vl:7b or llava" .value=${e.visionModel}
                    ?disabled=${!this.canEdit}
                    @change=${a=>this.edit({visionModel:a.target.value})} />
                </div>
                <div class="field-control">
                  <input type="password" autocomplete="new-password"
                    placeholder=${e.visionApiKeySet?"API key saved — enter to replace":"API key (optional)"}
                    .value=${e.visionApiKey} ?disabled=${!this.canEdit}
                    @change=${a=>this.edit({visionApiKey:a.target.value})} />
                </div>
              </div>
              ${this.switchField("Describe on import","Describe every new picture and clip once it has been tagged; the tags steer the model. Off means only when you ask, from the viewer.",e.visionAuto,a=>this.edit({visionAuto:a}),!e.visionUrl)}
              <div class="field">
                <div class="field-text">
                  <div class="field-label">Check the model</div>
                  <div class="field-help">
                    Sends a generated test picture and shows what comes back. Save the URL first.
                    ${this.describeNote?n`<div style="margin-top:6px; color:var(--oppai-text);">${this.describeNote}</div>`:c}
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
            `:n`<div class="field-help">Loading…</div>`}
      </section>
    `}renderScraping(){const e=this.settings;return n`
      <section class="card">
        <h3><span class="material-symbols-rounded">travel_explore</span>Import &amp; scraping</h3>
        <p class="card-sub">How OppaiLib behaves toward the sites you import from.</p>

        ${e?n`
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
                ${e.rule34ApiKeySet?n`<div class="field-control">
                  <button type="button" class="btn-inline" ?disabled=${!this.canEdit}
                    @click=${()=>this.edit({rule34ApiKey:"",rule34ApiKeySet:!1})}>Clear saved key</button>
                </div>`:c}
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

            `:n`<div class="field-help">Loading…</div>`}
      </section>
    `}renderImageGen(){const e=this.settings;return n`
      <section class="card">
        <h3><span class="material-symbols-rounded">auto_awesome</span>Image generation</h3>
        <p class="card-sub">
          The generator behind the Create tab and Libby's pictures. Prompts stay on your own
          hardware — nothing is sent to a cloud service.
        </p>
        ${e?n`
              ${this.switchField("Draw pictures with ComfyUI","Sends the Create tab, sprites and Libby's pictures to the ComfyUI set under Video below, instead of the generator here, which is kept for turning this off again. There are no nodes to set up: OppaiLib builds what each picture needs from what comes with ComfyUI, so a checkpoint and a prompt are all it takes, with LoRAs, a VAE, image to image, paint to fix and upscaling working as they do now. Fix faces, people in parts of the picture and reference squares need custom nodes in ComfyUI, so they aren't offered in this mode.",!!e.imageGenComfy,t=>this.edit({imageGenComfy:t}))}

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

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Forge Neo models folder</div>
                  <div class="field-help">
                    Only for moving models to Forge Neo while Automatic1111 is still the generator above.
                    Map its <code>models</code> folder into this container at <code>/forge-models</code> and
                    it is found by itself. Once Forge Neo is the generator, give its address above and this
                    folder as the models folder: it speaks Automatic1111's language, and everything else
                    follows.
                  </div>
                </div>
                <div class="field-control">
                  <input type="text" autocomplete="off" placeholder="/forge-models"
                    .value=${e.forgeModelsDir??""} ?disabled=${!this.canEdit}
                    @change=${t=>this.edit({forgeModelsDir:t.target.value})} />
                </div>
              </div>

              <div class="field stack">
                <div class="field-text">
                  <div class="field-label">Transfer models</div>
                  <div class="field-help">
                    Brings checkpoints, LoRAs and VAEs across from one generator's folders to another's,
                    with their descriptions and covers, so what is linked and set for each file comes with
                    it. Nothing is moved: the originals stay until you remove them. Files on one disk are
                    linked and take no room; anything already there is skipped, so a transfer can be stopped
                    and run again. It goes on if you leave this screen. Save a changed folder first.
                  </div>
                  <oppai-model-transfer .canEdit=${this.canEdit}></oppai-model-transfer>
                </div>
              </div>

              ${this.renderGenCheck()}
              ${this.renderGenRestart()}
            `:n`<div class="field-help">Loading…</div>`}
      </section>

      ${this.renderVideoGen()}

      <section class="card">
        <h3><span class="material-symbols-rounded">download</span>Civitai</h3>
        <p class="card-sub">The model catalogue Create browses, links your models to and installs from.</p>
        ${e?n`
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
                ${e.civitaiKeySet?n`<div class="field-control">
                  <button type="button" class="btn-inline" ?disabled=${!this.canEdit}
                    @click=${()=>this.edit({civitaiApiKey:"",civitaiKeySet:!1})}>Clear saved key</button>
                </div>`:c}
              </div>
            `:n`<div class="field-help">Loading…</div>`}
      </section>

      <section class="card">
        <h3><span class="material-symbols-rounded">model_training</span>LoRA training</h3>
        <p class="card-sub">The trainer Create's Train screen sends your pictures to. It runs on its own, so a run
          carries on with the browser closed.</p>
        ${e?n`
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
                ${e.trainerTokenSet?n`<div class="field-control">
                  <button type="button" class="btn-inline" ?disabled=${!this.canEdit}
                    @click=${()=>this.edit({trainerToken:"",trainerTokenSet:!1})}>Clear saved token</button>
                </div>`:c}
              </div>
            `:n`<div class="field-help">Loading…</div>`}
      </section>
    `}renderVideoGen(){const e=this.settings,t=(i,o,r)=>n`
      <details class="clip-paste" ?open=${r&&!!i}>
        <summary>Or paste a workflow of your own${i?r?" (in use)":" (not used while a model is picked)":""}</summary>
        <div class="field-help" style="margin:8px 0 6px;">
          For a model OppaiLib doesn't wire itself (LTX-Video, AnimateDiff, Hunyuan…): build it in ComfyUI, export it
          with <em>Workflow → Export (API)</em> and paste it here, with placeholders where a run varies, each as a whole
          value in quotes — <code>"{{prompt}}"</code>, <code>"{{negative}}"</code>, <code>"{{seed}}"</code>,
          <code>"{{image}}"</code> in a Load Image node, and optionally <code>"{{width}}"</code>, <code>"{{height}}"</code>,
          <code>"{{frames}}"</code>, <code>"{{fps}}"</code>, <code>"{{steps}}"</code>.
        </div>
        <textarea rows="4" style="width:100%;font-family:monospace;font-size:11px;" placeholder='{"3": {"class_type": "KSampler", …}}'
          .value=${i} ?disabled=${!this.canEdit}
          @change=${d=>o(d.target.value)}></textarea>
      </details>`,a=e==null?void 0:e.clipImageModels,s=e==null?void 0:e.clipTextModels;return n`
      <section class="card">
        <h3><span class="material-symbols-rounded">movie</span>Video</h3>
        <p class="card-sub">
          A few seconds of video, from words or from a picture, made by ComfyUI — the Video
          studio, and Libby's clips of herself. Neither Automatic1111 nor InvokeAI makes video.
        </p>
        ${e?n`
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
                    @change=${i=>this.edit({libbyClipUrl:i.target.value})} />
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
              ${this.renderComfyFolder("diffusion_models","Wan models folder",n`Wan diffusion models: ComfyUI's
                  <code>models/diffusion_models</code> (<code>unet</code> on an older install), or wherever its
                  <code>extra_model_paths.yaml</code> points.`,e.comfyDiffusionDir,i=>this.edit({comfyDiffusionDir:i}))}
              ${this.renderComfyFolder("checkpoints","Checkpoints folder",n`All-in-one checkpoints, which carry their
                  own text encoder and VAE: <code>models/checkpoints</code>.`,e.comfyCheckpointDir,i=>this.edit({comfyCheckpointDir:i}))}
              ${this.renderComfyFolder("loras","LoRA folder",n`Wan LoRAs: <code>models/loras</code>.`,e.comfyLoraDir,i=>this.edit({comfyLoraDir:i}))}
              ${this.renderComfyFolder("vae","VAE folder",n`VAEs: <code>models/vae</code>.`,e.comfyVaeDir,i=>this.edit({comfyVaeDir:i}))}
              <div class="field-help" style="margin:0 0 4px;">
                Wan is wired here: pick its files and OppaiLib builds the workflow. Wan 2.2's 14B models come as a
                pair — a <b>high-noise</b> model that sets out the motion over the first half of the steps and a
                <b>low-noise</b> one that finishes the detail — and each direction has its own pair
                (<code>i2v</code> from a picture, <code>t2v</code> from words). Beside them go the text encoder
                (<code>umt5_xxl</code>) and the VAE (<code>wan_2.1_vae</code>; only the 5B model uses
                <code>wan2.2_vae</code>). An all-in-one checkpoint has both inside and needs nothing beside it.
              </div>
              <div class="field">
                <div class="field-text">
                  <div class="field-label">Give clips the whole card</div>
                  <div class="field-help">
                    Before a clip renders, the image generator lets go of its checkpoint, and the next picture asks
                    ComfyUI to let go of Wan and loads it back. A 14B Wan pair wants every gigabyte there is; beside a
                    checkpoint ComfyUI offloads to system memory, and a ten-minute clip takes an hour. Off when the two
                    are on different cards, or the card has room for both.
                  </div>
                </div>
                <div class="field-control">
                  <button class="switch ${e.clipKeepImageModel?"":"on"}" role="switch"
                    aria-checked=${e.clipKeepImageModel?"false":"true"} aria-label="Unload the image model while a clip renders"
                    ?disabled=${!this.canEdit} @click=${()=>this.edit({clipKeepImageModel:!e.clipKeepImageModel})}></button>
                </div>
              </div>
              <div class="field-help" style="margin:0 0 4px;">
                The files below are where the Video studio starts and what Libby's clips run; the studio picks its own
                over them for each clip, as the Image studio picks a checkpoint.
              </div>
              ${this.renderClipModels("From a picture",n`Image to video: brings a still to life — what Animate on a
                picture and Libby's clips run.`,!0,a,i=>this.edit({clipImageModels:i}))}
              ${t(e.libbyClipWorkflow??"",i=>this.edit({libbyClipWorkflow:i}),!(a!=null&&a.model))}
              ${this.renderClipModels("From words",n`Text to video: a clip from a description alone. Optional.`,!1,s,i=>this.edit({clipTextModels:i}))}
              ${t(e.clipTextWorkflow??"",i=>this.edit({clipTextWorkflow:i}),!(s!=null&&s.model))}
              ${this.renderComfyCheck()}
            `:n`<div class="field-help">Loading…</div>`}
      </section>
    `}comfyLine(){if(this.comfyErr)return n`<div class="field-status bad">${this.comfyErr}</div>`;const e=this.comfy;if(!e)return c;if(e.missing.length)return n`<div class="field-status bad">This ComfyUI has no ${e.missing.join(", ")} — it is older than Wan 2.2.
        Update it (<em>Manager → Update ComfyUI</em>, or <code>git pull</code> in its folder) and press Refresh.</div>`;const t=e.diffusion.length+e.checkpoints.length;return n`<div class="field-status ok">Found ${t} model${t===1?"":"s"}, ${e.textEncoders.length} text
      encoder${e.textEncoders.length===1?"":"s"}, ${e.vaes.length} VAE${e.vaes.length===1?"":"s"} and
      ${e.loras.length} LoRA${e.loras.length===1?"":"s"}.</div>`}async loadComfy(){var e;this.comfyBusy=!0,this.comfyErr="",C.comfyInstalls().then(({places:t})=>this.comfyFolder=t,()=>{});try{this.comfy=await C.comfyModels()}catch(t){this.comfy=null,(e=this.settings)!=null&&e.libbyClipUrl&&(this.comfyErr=t.message)}finally{this.comfyBusy=!1}}renderComfyFolder(e,t,a,s,i){var r;const o=(r=this.comfyFolder)==null?void 0:r[e];return n`<div class="field stack">
      <div class="field-text">
        <div class="field-label">${t}</div>
        <div class="field-help">
          ${a}
          ${o!=null&&o.dir?n`<div class="field-status ok">Installing into ${o.dir}.</div>`:o!=null&&o.problem?n`<div class="field-status bad">${o.problem}</div>`:c}
        </div>
      </div>
      <div class="field-control">
        <input type="text" autocomplete="off" placeholder="Not installed into"
          .value=${s??""} ?disabled=${!this.canEdit}
          @change=${d=>i(d.target.value)} />
      </div>
    </div>`}async runComfyCheck(){this.comfyCheckBusy=!0,this.comfyCheckErr="";try{this.comfyChecks=(await C.comfyCheck()).checks}catch(e){this.comfyCheckErr=e.message}finally{this.comfyCheckBusy=!1}this.loadComfy()}renderComfyCheck(){return n`<div class="field stack">
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
      ${this.comfyCheckErr?n`<div class="field-status bad">${this.comfyCheckErr}</div>`:c}
      ${this.comfyChecks?lt(this.comfyChecks):c}
    </div>`}renderClipModels(e,t,a,s,i){const o=s??{model:"",checkpoint:!1,lowModel:"",textEncoder:"",vae:"",loras:[],steps:0,cfg:0,shift:0},r=this.comfy,d=p=>i({...o,...p}),h=(p,b,M)=>n`
      <option value="" ?selected=${!b}>${M}</option>
      ${(b&&!p.includes(b)?[b,...p]:p).map(k=>n`<option value=${k} ?selected=${k===b}>${k}</option>`)}`,f=(p,b,M,k,B)=>n`
      <select aria-label=${p} ?disabled=${!this.canEdit}
        @change=${I=>B(I.target.value)}>${h(b,M,k)}</select>`,y=(r==null?void 0:r.diffusion)??[],x=(r==null?void 0:r.checkpoints)??[],A=(r==null?void 0:r.loras)??[],E=!!o.lowModel&&!o.checkpoint,S=p=>{const b=x.includes(p)&&!y.includes(p),M=!b&&ke(p)==="high";d({model:p,checkpoint:b,lowModel:M?et(p,y)||o.lowModel:""})},L=(p,b)=>d({loras:o.loras.map((M,k)=>k===p?{...M,...b}:M)}),T=p=>{const b=[{name:p,weight:1,stage:ke(p)}],M=et(p,A);M&&!o.loras.some(B=>B.name===M)&&b.push({name:M,weight:1,stage:ke(M)});const k=qt(p)&&!o.steps&&!o.cfg?tt:{};d({loras:[...o.loras,...b],...k})},R=r?Kt(r,a):null;return n`<div class="field stack">
      <div class="field-text">
        <div class="field-label">${e}</div>
        <div class="field-help">${t}</div>
      </div>
      <div class="clip-grid">
        <span>Model${E?n`<small>high noise</small>`:c}</span>
        <select aria-label="${e}: model" ?disabled=${!this.canEdit} @change=${p=>S(p.target.value)}>
          <option value="" ?selected=${!o.model}>None — ${a?"a pasted workflow, or no clips":"no clips from words"}</option>
          ${o.model&&!y.includes(o.model)&&!x.includes(o.model)?n`<option value=${o.model} selected>${o.model}</option>`:c}
          ${y.length?n`<optgroup label="Diffusion models">${y.map(p=>n`<option value=${p} ?selected=${p===o.model}>${p}</option>`)}</optgroup>`:c}
          ${x.length?n`<optgroup label="Checkpoints (all-in-one)">${x.map(p=>n`<option value=${p} ?selected=${p===o.model}>${p}</option>`)}</optgroup>`:c}
        </select>
        ${o.model&&!o.checkpoint?n`
          <span>Low noise</span>
          ${f(`${e}: low-noise model`,y,o.lowModel,"None — one model does it all (Wan 2.1, 5B)",p=>d({lowModel:p}))}
          <span>Text encoder</span>
          ${f(`${e}: text encoder`,(r==null?void 0:r.textEncoders)??[],o.textEncoder,"Pick one (umt5_xxl)",p=>d({textEncoder:p}))}
          <span>VAE</span>
          ${f(`${e}: VAE`,(r==null?void 0:r.vaes)??[],o.vae,"Pick one (wan_2.1_vae)",p=>d({vae:p}))}`:c}
        ${o.model&&o.checkpoint?n`
          <span>Text encoder</span>
          ${f(`${e}: text encoder`,(r==null?void 0:r.textEncoders)??[],o.textEncoder,"The checkpoint's own",p=>d({textEncoder:p}))}
          <span>VAE</span>
          ${f(`${e}: VAE`,(r==null?void 0:r.vaes)??[],o.vae,"The checkpoint's own",p=>d({vae:p}))}`:c}
        ${o.model?n`
          <span>LoRAs</span>
          <div class="clip-loras">
            ${o.loras.map((p,b)=>n`<div class="clip-lora">
              ${f(`${e}: LoRA ${b+1}`,A,p.name,"Pick a LoRA",M=>L(b,{name:M,stage:ke(M)}))}
              <input type="number" step="0.05" min="-2" max="2" aria-label="${e}: LoRA ${b+1} strength"
                .value=${String(p.weight)} ?disabled=${!this.canEdit}
                @change=${M=>L(b,{weight:Number(M.target.value)})} />
              ${E?n`<select class="stage" aria-label="${e}: LoRA ${b+1} goes on" ?disabled=${!this.canEdit}
                @change=${M=>L(b,{stage:M.target.value})}>
                <option value="" ?selected=${!p.stage}>Both</option>
                <option value="high" ?selected=${p.stage==="high"}>High noise</option>
                <option value="low" ?selected=${p.stage==="low"}>Low noise</option>
              </select>`:c}
              <button class="btn-inline" title="Remove" aria-label="Remove LoRA ${b+1}" ?disabled=${!this.canEdit}
                @click=${()=>d({loras:o.loras.filter((M,k)=>k!==b)})}>
                <span class="material-symbols-rounded" style="font-size:18px;">delete</span></button>
            </div>`)}
            ${A.length?n`<select aria-label="${e}: add a LoRA" ?disabled=${!this.canEdit||o.loras.length>=8}
              @change=${p=>{const b=p.target;b.value&&T(b.value),b.value=""}}>
              <option value="" selected>${o.loras.length?"Add another LoRA…":"Add a LoRA…"}</option>
              ${A.filter(p=>!o.loras.some(b=>b.name===p)).map(p=>n`<option value=${p}>${p}</option>`)}
            </select>`:n`<span class="field-help">${r?"ComfyUI has no LoRAs in models/loras.":"LoRAs are listed once ComfyUI answers."}</span>`}
          </div>
          <span>Steps · CFG · shift</span>
          <div class="clip-lora">
            <input type="number" min="0" max="100" step="1" placeholder="20" aria-label="${e}: steps"
              .value=${o.steps?String(o.steps):""} ?disabled=${!this.canEdit}
              @change=${p=>d({steps:Number(p.target.value)||0})} />
            <input type="number" min="0" max="30" step="0.5" placeholder="3.5" aria-label="${e}: CFG"
              .value=${o.cfg?String(o.cfg):""} ?disabled=${!this.canEdit}
              @change=${p=>d({cfg:Number(p.target.value)||0})} />
            <input type="number" min="0" max="50" step="0.5" placeholder="8" aria-label="${e}: shift"
              .value=${o.shift?String(o.shift):""} ?disabled=${!this.canEdit}
              @change=${p=>d({shift:Number(p.target.value)||0})} />
          </div>
          <span>Sampler · scheduler</span>
          <div class="clip-lora">
            ${f(`${e}: sampler`,(r==null?void 0:r.samplers)??[],o.sampler??"","euler",p=>d({sampler:p}))}
            ${f(`${e}: scheduler`,(r==null?void 0:r.schedulers)??[],o.scheduler??"","simple",p=>d({scheduler:p}))}
          </div>
          <span></span>
          <div class="field-help" style="margin:0;">Blank is Wan's own: 20 steps, CFG 3.5, shift 8 — or 4 steps at
            CFG 1 when a speed LoRA (lightx2v, Lightning) or a Rapid AIO is picked, which is all they work at.</div>
          ${Wt(o)?n`<span></span>
            <div class="field-status bad" style="margin:0;">A speed file at CFG ${o.cfg} comes out burned and takes many
              times as long.
              <button type="button" class="btn-inline" ?disabled=${!this.canEdit} @click=${()=>d(tt)}>Use 4 steps, CFG 1</button>
            </div>`:c}`:c}
      </div>
      ${R&&!o.model?n`<div class="field-control">
        <button type="button" class="btn-inline" ?disabled=${!this.canEdit} @click=${()=>i(R)}>
          Pick from what's installed: ${R.model}${R.lowModel?" + its low-noise twin":""}</button>
      </div>`:c}
    </div>`}async runGenCheck(){this.genCheckBusy=!0,this.genCheckErr="";try{this.genChecks=(await C.imageGenCheck()).checks}catch(e){this.genCheckErr=e.message}finally{this.genCheckBusy=!1}this.loadGenLists()}renderGenCheck(){return n`<div class="field stack">
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
      ${this.genCheckErr?n`<div class="field-status bad">${this.genCheckErr}</div>`:c}
      ${this.genChecks?lt(this.genChecks):c}
    </div>`}renderGenRestart(){const e=this.genStatus;if(!(e!=null&&e.reachable)||e.backend!=="a1111")return c;const t=this.genRestart==="Restarting…";return n`<div class="field">
      <div class="field-text">
        <div class="field-label">Restart ${Ze(e)}</div>
        <div class="field-help">
          ${e.canRestart?"It reads ADetailer's detectors and its extensions only when it starts. Back in a minute or two; a picture it is drawing is lost.":n`It can only be restarted from here when it is started with <code>--api-server-stop</code> — add that to
                COMMANDLINE_ARGS beside <code>--api</code> and restart it by hand once.`}
        </div>
        ${this.genRestart&&!t?n`<div class="field-status">${this.genRestart}</div>`:c}
      </div>
      <div class="field-control">
        <button class="btn" ?disabled=${!this.canEdit||t} @click=${()=>void this.restartGen()}>
          ${t?"Restarting…":"Restart"}
        </button>
      </div>
    </div>`}async restartGen(){if(!confirm("Restart Automatic1111? It takes a minute or two, and a picture it is drawing now is lost."))return;this.genRestart="Restarting…";try{await C.restartGenerator()}catch(a){this.genRestart=a.message;return}const e=Date.now();let t=!1;for(;this.isConnected&&Date.now()-e<5*6e4;){await new Promise(s=>setTimeout(s,3e3));const a=await C.imageGenStatus().catch(()=>null);if(!(a!=null&&a.reachable)){t=!0;continue}if(t||Date.now()-e>45e3){this.genRestart="Automatic1111 is back.",this.loadGenLists();return}}this.genRestart="It hasn't come back yet — look at it where it runs."}genStatusLine(e){const t=this.genStatus;if(!e.imageGenUrl.trim()&&!e.imageGenComfy)return c;let a,s=!1;if(this.dirty)a="Save to check it.";else if(t)if(!t.reachable)a=`Not reachable${t.error?`: ${t.error}`:"."}`,s=!0;else{const i=Ze(t),o=(t.models??[]).length,r=(t.loras??[]).length;a=`Connected to ${i} — ${o} ${o===1?"model":"models"}, ${r} ${r===1?"LoRA":"LoRAs"}.`}else{if(!this.genError)return n`<div class="field-status">Checking…</div>`;a=this.genError,s=!0}return n`<div class="field-status ${s?"bad":""}">${a}</div>`}modelsFolderLine(e){const t=this.genStatus;if(this.dirty)return n`<div class="field-status">Save to check it.</div>`;if(!(t!=null&&t.reachable))return c;if(t.backend==="invokeai")return n`<div class="field-status">Not needed: InvokeAI installs and edits models itself.</div>`;if(t.backend==="comfyui")return n`<div class="field-status">Not used in ComfyUI mode: its folders are the ones set under Video.</div>`;if(t.manageModels){const a=!(e.imageGenModelsDir??"").trim();return n`<div class="field-status ok">
        Using <code>${t.modelsDir}</code>${a?" — found mounted, so there is nothing to set":""}. Models can be installed, edited and deleted.
      </div>`}return t.modelsDirProblem?n`<div class="field-status bad">${t.modelsDirProblem}.</div>`:n`<div class="field-status">Nothing is mounted at <code>/a1111-models</code> and no path is set.</div>`}renderLibrary(){const e=this.stats;if(!e)return c;const t=new Map(e.kinds.map(a=>[a.kind,a]));return n`
      <section class="card">
        <h3><span class="material-symbols-rounded">inventory_2</span>Library</h3>
        <p class="card-sub">
          ${e.items} ${e.items===1?"item":"items"} · ${oe(e.bytes)} stored ·
          ${e.tags} ${e.tags===1?"tag":"tags"}
        </p>
        <div class="stat-grid">
          ${Object.keys(Qe).map(a=>{const s=t.get(a);return n`<div class="stat">
              <div class="stat-num">${(s==null?void 0:s.count)??0}</div>
              <div class="stat-label">${Qe[a].label} · ${oe((s==null?void 0:s.bytes)??0)}</div>
            </div>`})}
        </div>
      </section>
    `}renderPasskeys(){const e=this.passkeyList;return n`
      <section class="card">
        <h3><span class="material-symbols-rounded">passkey</span>Passkeys</h3>
        <p class="card-sub">
          Sign in with your device's fingerprint, face or PIN instead of typing a password.
          Nothing guessable crosses the network and the server only ever stores a public
          key — your device keeps the private half.
        </p>

        ${this.passkeyError?n`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.passkeyError}
            </div>`:c}
        ${this.passkeyMsg?n`<div class="banner ok">
              <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span>${this.passkeyMsg}
            </div>`:c}

        ${e&&!e.available?n`<div class="banner info">
              <span class="material-symbols-rounded" style="font-size:18px;">lock</span>
              ${e.reason}
            </div>`:c}

        ${e===null?n`<p class="field-help">Checking…</p>`:e.passkeys.length===0?n`<p class="field-help">
                No passkeys yet. Your password keeps working either way — it's also how you
                get back in if you lose a device.
              </p>`:n`
                <div class="pk-list">
                  ${e.passkeys.map(t=>this.renderPasskeyRow(t))}
                </div>
              `}

        ${e!=null&&e.available?n`
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

        ${e!=null&&e.relyingPartyId?n`<p class="field-help">
              Passkeys added here are tied to <code>${e.relyingPartyId}</code>. That's how
              WebAuthn works — reach OppaiLib at a different address and your device won't
              offer them, so add one per address you actually use.
            </p>`:c}
      </section>
    `}renderPasskeyRow(e){const t=this.passkeyRenaming===e.id,a=this.passkeyRevoking===e.id;return n`
      <div class="pk-row">
        <span class="material-symbols-rounded pk-icon">${e.synced?"cloud_sync":"key"}</span>
        <div class="pk-body">
          ${t?n`<div class="pk-rename">
                <input
                  type="text"
                  .value=${this.passkeyName}
                  @input=${s=>this.passkeyName=s.target.value}
                />
                <button @click=${()=>void this.savePasskeyName(e)}>Save</button>
                <button @click=${()=>this.passkeyRenaming=null}>Cancel</button>
              </div>`:n`<div class="pk-name">${e.name}</div>`}
          <div class="pk-meta">
            ${e.synced?"Synced to your account":"This device only"}
            · added ${nt(e.createdAt)}
            · ${e.lastUsedAt?`last used ${nt(e.lastUsedAt)}`:"never used"}
          </div>
          ${a?n`<div class="pk-revoke">
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
                  @input=${s=>this.passkeyPassword=s.target.value}
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
        ${t||a?c:n`<div class="pk-actions">
              <button title="Rename" @click=${()=>this.startRename(e)}>
                <span class="material-symbols-rounded" style="font-size:18px;">edit</span>
              </button>
              <button title="Remove" @click=${()=>this.startRevoke(e)}>
                <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
              </button>
            </div>`}
      </div>
    `}async loadPasskeys(){try{this.passkeyList=await C.passkeys()}catch(e){this.passkeyError=e.message}}startRename(e){this.passkeyRenaming=e.id,this.passkeyRevoking=null,this.passkeyName=e.name}async savePasskeyName(e){const t=this.passkeyName.trim();if(t)try{await C.renamePasskey(e.id,t),this.passkeyRenaming=null,this.passkeyName="",await this.loadPasskeys()}catch(a){this.passkeyError=a.message}}startRevoke(e){this.passkeyRevoking=e.id,this.passkeyRenaming=null,this.passkeyPassword="",this.passkeyError=""}async revokePasskey(e){this.passkeyBusy=!0,this.passkeyError="";try{await C.revokePasskey(e.id,this.passkeyPassword),this.passkeyRevoking=null,this.passkeyPassword="",this.passkeyMsg=`Removed “${e.name}”.`,await this.loadPasskeys()}catch(t){this.passkeyError=t.message}finally{this.passkeyBusy=!1}}renderAccount(){var e,t;return n`
      ${this.renderPasskeys()}
      <section class="card">
        <h3><span class="material-symbols-rounded">account_circle</span>Account</h3>
        <p class="card-sub">
          Signed in as <strong>${(e=this.user)==null?void 0:e.username}</strong>${(t=this.user)!=null&&t.isAdmin?" (admin)":""}.
        </p>

        ${this.pwErr?n`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.pwErr}
            </div>`:c}
        ${this.pwMsg?n`<div class="banner ok">
              <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span>${this.pwMsg}
            </div>`:c}

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
    `}renderStorage(){var t;const e=this.storage;return n`
      <section class="card">
        <h3><span class="material-symbols-rounded">hard_drive</span>Storage</h3>
        <p class="card-sub">
          Where OppaiLib keeps things, and how much room is left. Nothing here lives
          inside the container image unless you left a mapping unset — which is what
          the warnings are for.
        </p>

        ${this.storageErr?n`<div class="banner error">
              <span class="material-symbols-rounded" style="font-size:18px;">error</span>${this.storageErr}
            </div>`:c}

        ${((e==null?void 0:e.warnings)??[]).map(a=>n`<div class="banner error">
          <span class="material-symbols-rounded" style="font-size:18px;">warning</span>${a}
        </div>`)}

        <div class="diag-actions">
          <button class="btn-primary" ?disabled=${this.storageBusy} @click=${this.loadStorage}>
            <span class="material-symbols-rounded" style="font-size:20px;">refresh</span>
            ${this.storageBusy?"Reading…":"Refresh"}
          </button>
          ${(t=this.user)!=null&&t.isAdmin?n`<button ?disabled=${this.storageBusy} @click=${this.runCleanup}>
                <span class="material-symbols-rounded" style="font-size:20px;">mop</span>
                Reclaim space
              </button>`:c}
          <span class="field-help grow">
            Reclaiming removes only what can be recreated: chunks of uploads nobody
            came back to finish, and scratch files from jobs that have ended. It never
            touches your media, Libby's memories or model files.
          </span>
        </div>

        ${e?n`
              ${e.pendingBytes>0?n`<p class="field-help">
                    Uploads in progress still need about ${oe(e.pendingBytes)}.
                  </p>`:c}
              ${e.mappings.map(a=>this.renderMapping(a))}
              <h4 style="margin:18px 0 6px;">Reclaimable now</h4>
              ${e.reclaimable.map(a=>n`<p class="field-help">
                ${a.label}: <strong>${oe(a.bytes)}</strong>${a.note?n` — ${a.note}`:c}
              </p>`)}
            `:n`<p class="field-help">${this.storageBusy?"Reading…":"No reading yet."}</p>`}
      </section>
    `}renderMapping(e){const t=e.totalBytes>0?Math.round(e.usedBytes/e.totalBytes*100):0;return n`
      <div class="setting-row" style="display:block;">
        <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
          <strong>${e.label}</strong>
          <code style="font-size:12px; opacity:.8;">${e.path}</code>
          ${e.exists?c:n`<span class="field-help" style="color:var(--oppai-error);">not mapped</span>`}
          ${e.exists&&!e.writable?n`<span class="field-help" style="color:var(--oppai-error);">read-only</span>`:c}
        </div>
        <div style="height:6px; border-radius:999px; background:var(--oppai-surface-2); overflow:hidden; margin:6px 0;">
          <span style="display:block; height:100%; width:${t}%; background:${t>=90?"var(--oppai-error)":"var(--oppai-primary)"};"></span>
        </div>
        <p class="field-help">
          ${e.error?e.error:n`${oe(e.freeBytes)} free of ${oe(e.totalBytes)} (${t}% used)`}
          ${(e.contents??[]).map(a=>n` · ${a.label}: ${oe(a.bytes)}${a.count?n` (${a.count})`:c}`)}
        </p>
        <p class="field-help">${e.purpose} Set with <code>${e.env}</code>.</p>
      </div>
    `}renderDiagnostics(){const e=this.diag,t=this.uiDiag;return n`
      <section class="card">
        <h3><span class="material-symbols-rounded">speed</span>Performance</h3>
        <p class="card-sub">
          Counters and latencies since the server started, or since you last reset them.
          Nothing here is sent anywhere — it's read straight off this box.
        </p>

        ${this.diagErr?n`<div class="banner error">
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

        ${e?n`
              ${e.dbWal?c:n`<div class="banner error">
                    <span class="material-symbols-rounded" style="font-size:18px;">warning</span>
                    The database isn't in WAL mode, so every query runs one at a time.
                    This is usually because it lives on a network share — move it to a
                    local disk and restart.
                  </div>`}

              <div class="stat-grid">
                ${this.diagStat("Uptime",Wa(e.uptimeSeconds))}
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
              ${e.metrics.timings.length===0?n`<p class="field-help">Nothing measured in this window yet.</p>`:n`
                    <div class="diag-scroll">
                      <table class="diag-table">
                        <thead>
                          <tr>
                            <th>What</th><th>Calls</th><th>Avg</th><th>p95</th><th>Worst</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${e.metrics.timings.slice(0,25).map(a=>n`<tr>
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
              ${t?n`
                    <div class="stat-grid">
                      ${this.diagStat("UI updates",String(t.updates))}
                      ${this.diagStat("Slow updates",String(t.slowUpdates))}
                      ${this.diagStat("Long tasks",`${t.longTasks} · ${Math.round(t.longTaskMs)} ms`)}
                      ${this.diagStat("Layout shift",`${t.layoutShifts} · ${t.layoutShiftScore}`)}
                    </div>
                    ${t.timings.length===0?n`<p class="field-help">No profiled component has updated in this window yet.</p>`:n`
                          <div class="diag-scroll">
                            <table class="diag-table">
                              <thead>
                                <tr><th>Component</th><th>Updates</th><th>Avg</th><th>p95</th><th>Slow</th><th>Worst</th></tr>
                              </thead>
                              <tbody>
                                ${t.timings.map(a=>n`<tr>
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
                  `:n`<p class="field-help">Refresh to read browser timings.</p>`}
            `:n`<p class="field-help">${this.diagBusy?"Reading…":"No snapshot yet."}</p>`}
      </section>
    `}renderFetchHealth(e){const t=e.metrics.counters,a=[["Fetches completed",t["scrape.fetch.ok"]??0,"Pages and listings fetched successfully."],["Retried",t["scrape.fetch.retry"]??0,"A site failed transiently and we tried again."],["Gave up",t["scrape.fetch.exhausted"]??0,"Still failing after every retry."],["Queued behind another request",t["scrape.host_queued"]??0,"A steady number here means we're fanning out wider than the site allows."],["Asked to back off",t["scrape.fetch.backoff_too_long"]??0,"A site asked for a longer wait than we'll hold a click open for."]];return a.every(([,s])=>s===0)?c:n`
      <h4 class="diag-head">Outbound fetches</h4>
      ${a.map(([s,i,o])=>i===0?c:n`<div class="diag-row"><strong>${i}</strong> ${s} <span class="field-help">— ${o}</span></div>`)}
    `}diagStat(e,t){return n`<div class="stat">
      <div class="stat-num diag-stat-num">${t}</div>
      <div class="stat-label">${e}</div>
    </div>`}renderAbout(){const e=this.info;return e?n`
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
    `:c}switchField(e,t,a,s,i=!1){const o=!this.canEdit||i;return n`
      <div class="field">
        <div class="field-text">
          <div class="field-label">${e}</div>
          <div class="field-help">${t}</div>
        </div>
        <div class="field-control">
          <button
            class="switch ${a?"on":""}"
            role="switch"
            aria-checked=${a?"true":"false"}
            aria-label=${e}
            ?disabled=${o}
            @click=${()=>s(!a)}
          ></button>
        </div>
      </div>
    `}readOnlyField(e,t,a){return n`
      <div class="field">
        <div class="field-text">
          <div class="field-label">${e}</div>
          <div class="field-help">${t}</div>
        </div>
        <div class="field-control"><span class="ro">${a}</span></div>
      </div>
    `}};g.styles=[Oe,dt,Ne`
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

      /* Material You swatches: Android's three-colour circles. */
      .you { display: flex; flex-wrap: wrap; gap: 8px; max-width: 360px; justify-content: flex-end; }
      .swatch {
        position: relative; width: 40px; height: 40px; border-radius: 50%; padding: 0; cursor: pointer;
        border: 2px solid transparent; background: none; display: grid; place-items: center;
      }
      .swatch.on { border-color: var(--oppai-text); }
      .swatch .dot { width: 32px; height: 32px; border-radius: 50%; overflow: hidden; display: grid; grid-template: 1fr 1fr / 1fr 1fr; }
      .swatch .dot i:first-child { grid-column: 1 / 3; }
      .swatch .check {
        position: absolute; inset: 0; display: grid; place-items: center; font-size: 18px;
        color: #fff; text-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
      }
      .swatch input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
      .swatch.custom .dot { background: conic-gradient(#e53935, #ffb300, #43a047, #1e88e5, #6750a4, #e53935); }
      .seg.wrap { flex-wrap: wrap; justify-content: flex-end; max-width: 420px; }

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
    `];v([Ce({attribute:!1})],g.prototype,"user",2);v([Ce({attribute:!1})],g.prototype,"only",2);v([Ce({attribute:!1})],g.prototype,"startTab",2);v([u()],g.prototype,"tab",2);v([u()],g.prototype,"settings",2);v([u()],g.prototype,"info",2);v([u()],g.prototype,"stats",2);v([u()],g.prototype,"apk",2);v([u()],g.prototype,"loadError",2);v([u()],g.prototype,"passkeyList",2);v([u()],g.prototype,"passkeyBusy",2);v([u()],g.prototype,"passkeyError",2);v([u()],g.prototype,"passkeyMsg",2);v([u()],g.prototype,"passkeyName",2);v([u()],g.prototype,"passkeyRenaming",2);v([u()],g.prototype,"passkeyRevoking",2);v([u()],g.prototype,"passkeyPassword",2);v([u()],g.prototype,"diag",2);v([u()],g.prototype,"uiDiag",2);v([u()],g.prototype,"storage",2);v([u()],g.prototype,"storageBusy",2);v([u()],g.prototype,"storageErr",2);v([u()],g.prototype,"diagBusy",2);v([u()],g.prototype,"diagErr",2);v([u()],g.prototype,"dirty",2);v([u()],g.prototype,"saving",2);v([u()],g.prototype,"saved",2);v([u()],g.prototype,"theme",2);v([u()],g.prototype,"you",2);v([u()],g.prototype,"fit",2);v([u()],g.prototype,"hideLibby",2);v([u()],g.prototype,"genModels",2);v([u()],g.prototype,"genLoras",2);v([u()],g.prototype,"genLoraTriggers",2);v([u()],g.prototype,"genBoards",2);v([u()],g.prototype,"genError",2);v([u()],g.prototype,"genStatus",2);v([u()],g.prototype,"genChecks",2);v([u()],g.prototype,"genCheckBusy",2);v([u()],g.prototype,"genRestart",2);v([u()],g.prototype,"genCheckErr",2);v([u()],g.prototype,"comfy",2);v([u()],g.prototype,"comfyErr",2);v([u()],g.prototype,"comfyBusy",2);v([u()],g.prototype,"comfyFolder",2);v([u()],g.prototype,"comfyChecks",2);v([u()],g.prototype,"comfyCheckBusy",2);v([u()],g.prototype,"comfyCheckErr",2);v([u()],g.prototype,"pwCurrent",2);v([u()],g.prototype,"pwNew",2);v([u()],g.prototype,"pwConfirm",2);v([u()],g.prototype,"pwBusy",2);v([u()],g.prototype,"pwMsg",2);v([u()],g.prototype,"pwErr",2);v([u()],g.prototype,"refs",2);v([u()],g.prototype,"refStamp",2);v([u()],g.prototype,"refNote",2);v([u()],g.prototype,"tts",2);v([u()],g.prototype,"describe",2);v([u()],g.prototype,"describeBusy",2);v([u()],g.prototype,"describeNote",2);v([u()],g.prototype,"ttsErrors",2);g=v([_e("oppai-settings")],g);function nt(e){if(!e)return"never";const t=Math.max(0,(Date.now()-e)/1e3);if(t<90)return"just now";const a=Math.round(t/60);if(a<60)return`${a} min ago`;const s=Math.round(a/60);if(s<24)return`${s}h ago`;const i=Math.round(s/24);return i<=30?`${i} day${i===1?"":"s"} ago`:new Date(e).toLocaleDateString()}function Wa(e){const t=Math.max(0,Math.floor(e)),a=Math.floor(t/86400),s=Math.floor(t%86400/3600),i=Math.floor(t%3600/60);return a>0?`${a}d ${s}h`:s>0?`${s}h ${i}m`:i>0?`${i}m ${t%60}s`:`${t}s`}function oe(e){if(!e)return"0 B";const t=["B","KB","MB","GB","TB"];let a=e,s=0;for(;a>=1024&&s<t.length-1;)a/=1024,s++;return`${a<10&&s>0?a.toFixed(1):Math.round(a)} ${t[s]}`}function lt(e){return n`<ul class="checks">
    ${e.map(t=>n`<li class=${t.skipped?"skip":t.ok?"ok":"bad"}>
      <span class="material-symbols-rounded">${t.skipped?"info":t.ok?"check_circle":"error"}</span>
      <span><strong>${t.label}</strong> — ${t.detail}</span>
    </li>`)}
  </ul>`}const Za=Object.freeze(Object.defineProperty({__proto__:null,get OppaiSettings(){return g}},Symbol.toStringTag,{value:"Module"}));export{Xa as a,pt as b,Za as c,Qa as i,Ja as l,ea as s};
