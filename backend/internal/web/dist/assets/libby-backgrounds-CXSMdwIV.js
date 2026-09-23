import{M as k,i as $,N as D,u as l,a as S,e as u,b as n,A as g,t as N}from"./index-XPJwO1lq.js";const x="oppai_libby_speak";function R(){try{return localStorage.getItem(x)==="1"}catch{return!1}}function U(e){try{localStorage.setItem(x,e?"1":"0")}catch{}e||I(),window.dispatchEvent(new CustomEvent("oppai-libby-speak",{detail:{on:e}}))}let h=null,v=0;async function P(e=!1){if(!e&&h&&Date.now()-v<6e4)return h;try{const t=await fetch("/api/tts/status",{credentials:"same-origin"});if(!t.ok)throw new Error(String(t.status));h=await t.json(),v=Date.now()}catch{h=null}return h}const m=[];let c=null,y=!1,b=0;function C(e,t=0){const i=e.trim();return i?new Promise(s=>{m.push({text:i,heat:t,done:s}),L()}):Promise.resolve()}function I(){var e;b++;for(const t of m.splice(0))t.done();c&&(c.pause(),c.src="",c=null);try{(e=window.speechSynthesis)==null||e.cancel()}catch{}}async function L(){if(!y){y=!0;try{for(;m.length;){const e=m.shift(),t=b;try{await z(e.text,e.heat,t)}catch{}finally{e.done()}}}finally{y=!1}}}async function z(e,t,i){const s=await B(e,t);if(i===b){if(s){await E(s,i);return}await A(e,i)}}async function B(e,t){const i=await P();if(i&&!i.engine)return null;try{const s=await fetch("/api/tts/speak",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:e,heat:t||void 0})});return s.status===503?(h=null,null):s.ok?await s.blob():null}catch{return null}}function E(e,t){return new Promise(i=>{const s=URL.createObjectURL(e),a=new Audio(s);c=a;const r=()=>{c===a&&(c=null),URL.revokeObjectURL(s),i()};a.addEventListener("ended",r,{once:!0}),a.addEventListener("error",r,{once:!0}),a.play().catch(()=>{r()}),t!==b&&r()})}function A(e,t){const i=window.speechSynthesis;return!i||typeof SpeechSynthesisUtterance>"u"?Promise.resolve():new Promise(s=>{const a=new SpeechSynthesisUtterance(e),r=T(i.getVoices());if(r&&(a.voice=r),a.rate=1.02,a.pitch=1.05,a.onend=()=>s(),a.onerror=()=>s(),t!==b){s();return}i.speak(a)})}function T(e){const t=e.filter(a=>/^en/i.test(a.lang)),i=t.length?t:e,s=a=>{let r=0;const p=a.name.toLowerCase();return/natural|neural|premium|enhanced/.test(p)&&(r+=4),/female|woman|aria|jenny|samantha|zira|karen|moira|tessa|fiona|libby|sonia|ava|allison|susan|emma/.test(p)&&(r+=3),/google/.test(p)&&(r+=1),a.default&&(r+=1),r};return[...i].sort((a,r)=>s(r)-s(a))[0]}var _=Object.defineProperty,j=Object.getOwnPropertyDescriptor,d=(e,t,i,s)=>{for(var a=s>1?void 0:s?j(t,i):t,r=e.length-1,p;r>=0;r--)(p=e[r])&&(a=(s?p(t,i,a):p(a))||a);return s&&a&&_(t,i,a),a};let o=class extends S{constructor(){super(...arguments),this.embedded=!1,this.backgrounds=[],this.defaultID="",this.loading=!0,this.busy=!1,this.note="",this.bad=!1,this.editing=null,this.draftName="",this.draftTags="",this.version=Date.now()}connectedCallback(){super.connectedCallback(),this.reload()}async reload(){this.loading=!0;try{const e=await u.libbyBackgrounds();this.backgrounds=e.backgrounds??[],this.defaultID=e.default??""}catch(e){this.say(e.message,!0)}finally{this.loading=!1}}say(e,t=!1){this.note=e,this.bad=t}changed(){this.dispatchEvent(new CustomEvent("changed",{bubbles:!0,composed:!0}))}startNew(){this.editing="new",this.draftName="",this.draftTags=""}startEdit(e){this.editing=e.id,this.draftName=e.name,this.draftTags=e.tags.join(", ")}async save(e){const t=this.draftName.trim();if(!t){this.say("A background needs a name.",!0);return}this.busy=!0;try{await u.saveLibbyBackground({id:e,name:t,tags:this.draftTags.split(",").map(i=>i.trim()).filter(Boolean)}),this.editing=null,await this.reload(),this.changed(),this.say(e?`Saved ${t}.`:`Added ${t}. Give it a picture so she can go there.`)}catch(i){this.say(i.message,!0)}finally{this.busy=!1}}async uploadPicture(e,t){var a;const i=t.target,s=(a=i.files)==null?void 0:a[0];if(i.value="",!!s){this.busy=!0;try{const r=await new Promise((p,w)=>{const f=new FileReader;f.onload=()=>p(String(f.result)),f.onerror=()=>w(f.error),f.readAsDataURL(s)});await u.setLibbyBackgroundImage(e,r),this.version=Date.now(),await this.reload(),this.changed(),this.say("Picture saved.")}catch(r){this.say(r.message,!0)}finally{this.busy=!1}}}async makeDefault(e){this.busy=!0;try{const t=this.defaultID===e?"":e;await u.setLibbyDefaultBackground(t),this.defaultID=t,this.changed(),this.say(t?"She starts here now.":"No default room — she starts nowhere in particular.")}catch(t){this.say(t.message,!0)}finally{this.busy=!1}}async deleteBackground(e){if(confirm(`Delete ${e.name}?`)){this.busy=!0;try{await u.deleteLibbyBackground(e.id),await this.reload(),this.changed(),this.say(`Deleted ${e.name}.`)}catch(t){this.say(t.message,!0)}finally{this.busy=!1}}}renderEditor(e){return n`<div class="edit">
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
    </div>`}render(){return n`
      ${this.embedded?g:n`<div class="head">
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

      ${this.loading?n`<div class="empty">Loading…</div>`:n`<div class="grid">
            ${this.backgrounds.map(e=>n`
              <div class="card ${e.id===this.defaultID?"is-default":""}">
                <div class="shot">
                  ${e.hasImage?n`<img src=${u.libbyBackgroundURL(e.id,this.version)} alt=${`${e.name} background`} />`:n`<span class="none">No picture yet —<br />she won't go here</span>`}
                  ${e.id===this.defaultID?n`<span class="flag">Default</span>`:g}
                </div>
                <div class="body">
                  <span class="name">${e.name}</span>
                  <span class="tags">${e.tags.length?e.tags.join(", "):"No tags — she can only reach it by name"}</span>
                </div>
                ${this.editing===e.id?this.renderEditor(e.id):n`
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
            ${this.editing==="new"?n`<div class="card">${this.renderEditor()}</div>`:n`<button class="new" ?disabled=${this.busy} @click=${()=>this.startNew()}>
                  <span class="material-symbols-rounded">add_photo_alternate</span>
                  New background</button>`}
          </div>`}

      ${!this.loading&&!this.backgrounds.length&&this.editing!=="new"?n`<div class="empty">No rooms yet. Add one, give it a picture, and she can start moving around.</div>`:g}
      ${this.note?n`<p class="note ${this.bad?"bad":""}">${this.note}</p>`:g}
    `}};o.styles=[k,$`
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
  `];d([D({type:Boolean})],o.prototype,"embedded",2);d([l()],o.prototype,"backgrounds",2);d([l()],o.prototype,"defaultID",2);d([l()],o.prototype,"loading",2);d([l()],o.prototype,"busy",2);d([l()],o.prototype,"note",2);d([l()],o.prototype,"bad",2);d([l()],o.prototype,"editing",2);d([l()],o.prototype,"draftName",2);d([l()],o.prototype,"draftTags",2);d([l()],o.prototype,"version",2);o=d([N("oppai-libby-backgrounds")],o);export{C as a,U as b,R as l,I as s,P as t};
