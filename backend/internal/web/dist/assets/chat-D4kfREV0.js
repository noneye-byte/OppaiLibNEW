import{a as Xe,Z as Ve,$ as fe,a0 as W,T as ye,a1 as ve,Q as X,B as Je,a2 as we,a3 as Qe,e as g,a4 as Ze,a5 as M,a6 as et,l as xe,n as N,a7 as tt,g as ae,a8 as ke,a9 as at,aa as st,ab as it,ac as ot,ad as nt,ae as rt,af as $e,ag as lt,b as n,h as V,ah as dt,f as ct,A as d,j as se,k as ie,ai as oe,aj as Ce,ak as J,al as pt,am as ce,R as ht,an as B,ao as ut,ap as gt,aq as mt,ar as Se,M as bt,q as ft,as as yt,at as vt,au as wt,r as xt,i as kt,N as $t,u,t as Ct}from"./index-DufD-B2G.js";import{e as je}from"./query-__j_ZMY6.js";import{l as St,a as Te,b as Tt,s as Ie}from"./libby-backgrounds-BR5oLgfe.js";function It(e){var a;return(((a=/(?:https?:\/\/|www\.)[^\s<>"'`]{2,}/i.exec(e))==null?void 0:a[0])??"").replace(/[.,;:!?)\]}'"]+$/,"")}const Q=5,Lt=160,Dt=200;function Le(e){var s;const t=e.trim();if(!t)return[t];let a=t.split(/\n{2,}/).map(o=>o.trim()).filter(Boolean);if(a.length<2){if(t.length<Lt)return[t];const o=(s=t.match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g))==null?void 0:s.map(r=>r.trim()).filter(Boolean);if(!o||o.length<2)return[t];a=[];let i="";for(const r of o)i&&i.length+r.length>Dt&&a.length<Q-1?(a.push(i.trim()),i=r):i=i?`${i} ${r}`:r;i.trim()&&a.push(i.trim())}return a.length<=Q?a:[...a.slice(0,Q-1),a.slice(Q-1).join(`

`)]}function Pt(e,t,a=Math.random){const s=i=>i*(.7+a()*.6);let o=s(700+e*28);return t>10*6e4&&(o+=s(1500)),Math.min(6500,o)}function De(e){return e.replace(/\*\*|~~|`|\*/g,"").replace(/\s+/g," ").trim()}function At(e){return e.replace(/\[[^\]\n]{0,200}\]/g," ").replace(/\*\*|__|~~|\*|`/g,"").replace(/\s+/g," ").trim()}function Pe(e,t=Date.now()){const a=Math.max(0,(t-e)/1e3);return a<90?"just now":a<5400?`${Math.round(a/60)} minutes ago`:a<172800?`${Math.round(a/3600)} hours ago`:`${Math.round(a/86400)} days ago`}function Ot(e){return e<.15?"Still getting to know each other":e<.5?"Comfortable with each other by now":e<.85?"Close — you know each other well":"Deeply close after all this time"}function ne(e,t=140){let a=e.trim();const s=a.indexOf(`
`);if(s>=0&&a.slice(0,s).trim()&&(a=a.slice(0,s).trim()),a.length<=t)return a;let o=a.slice(0,t);const i=o.lastIndexOf(" ");return i>t/2&&(o=o.slice(0,i)),o.trim()+"…"}function I(e,...t){for(const a of t){const s=e[a];if(typeof s=="string"&&s.trim()!=="")return s}return""}function Ae(e,...t){for(const a of t){const s=e[a];if(Array.isArray(s)){const o=s.filter(i=>typeof i=="string"&&i.trim()!=="");if(o.length)return o}}return[]}function Ue(e,t){if(!e||typeof e!="object"||Array.isArray(e))throw new Error("that file isn't a character card (expected a JSON object)");const a=e,s=typeof a.spec=="string"?a.spec.toLowerCase():"",o=a.data&&typeof a.data=="object"&&!Array.isArray(a.data)?a.data:null,i=o??a,r=s.includes("v3")?"v3":s.includes("v2")||o?"v2":"v1",l=I(i,"name","char_name","charName")||t,h=I(i,"description","char_persona","persona"),m=I(i,"personality","personalitySummary"),f=I(i,"scenario","world_scenario"),b=I(i,"first_mes","firstMessage","char_greeting","greeting"),$=I(i,"mes_example","exampleDialogue","example_dialogue"),y=I(i,"creator_notes","creatorNotes","creatorcomment","creator_comment"),k=[I(i,"system_prompt","systemPrompt"),I(i,"post_history_instructions","postHistoryInstructions")].filter(Boolean).join(`

`),x=Ae(i,"alternate_greetings","alternateGreetings"),T=Ae(i,"tags"),v=i.extensions&&typeof i.extensions=="object"?i.extensions:{},S=v.oppailib&&typeof v.oppailib=="object"?v.oppailib:{},O={name:l,description:h,personality:m,scenario:f,firstMessage:b,exampleDialogue:$,systemPrompt:k,creatorNotes:y,appearance:I(S,"appearance"),kinks:I(S,"kinks"),promptWeight:typeof S.promptWeight=="number"&&Number.isFinite(S.promptWeight)?S.promptWeight:1,defaultMode:I(S,"defaultMode")||"roleplay"};return x.length&&(O.altGreetings=x),{character:O,spec:r,leftovers:{alternateGreetings:x.length,characterBook:!!i.character_book||!!i.characterBook,tags:T,creator:I(i,"creator"),characterVersion:I(i,"character_version","characterVersion")}}}function _t(e){const t=atob(e.replace(/\s+/g,"")),a=Uint8Array.from(t,s=>s.charCodeAt(0));return new TextDecoder("utf-8").decode(a)}async function Oe(e){const t=new Blob([e]).stream().pipeThrough(new DecompressionStream("deflate"));return new Uint8Array(await new Response(t).arrayBuffer())}async function zt(e){const t=[137,80,78,71,13,10,26,10];if(e.length<8||t.some((l,h)=>e[h]!==l))return[];const a=new DataView(e.buffer,e.byteOffset,e.byteLength),s=new TextDecoder("latin1"),o=new TextDecoder("utf-8"),i=[];let r=8;for(;r+12<=e.length;){const l=a.getUint32(r),h=s.decode(e.subarray(r+4,r+8));if(h==="IEND")break;const m=r+8,f=m+l;if(f+4>e.length)break;const b=e.subarray(m,f);if(h==="tEXt"||h==="zTXt"||h==="iTXt"){const $=b.indexOf(0);if($>0){const y=s.decode(b.subarray(0,$));try{if(h==="tEXt")i.push({keyword:y,text:s.decode(b.subarray($+1))});else if(h==="zTXt")i.push({keyword:y,text:s.decode(await Oe(b.subarray($+2)))});else{let k=$+1;const x=b[k]===1;k+=2;const T=b.indexOf(0,k);if(T<0)throw new Error("bad iTXt");const v=b.indexOf(0,T+1);if(v<0)throw new Error("bad iTXt");const S=b.subarray(v+1);i.push({keyword:y,text:x?o.decode(await Oe(S)):o.decode(S)})}}catch{}}}r=f+4}return i}async function Mt(e,t){const a=await zt(e),s=l=>a.find(h=>h.keyword.toLowerCase()===l),o=s("ccv3")??s("chara");if(!o)return null;let i;try{i=_t(o.text)}catch{throw new Error("the card data inside that PNG is not valid base64")}let r;try{r=JSON.parse(i)}catch{throw new Error("the card data inside that PNG is not valid JSON")}return Ue(r,t)}async function Rt(e){const t=e.name.replace(/\.[^.]+$/,"")||"New friend";if(e.name.toLowerCase().endsWith(".png")||e.type==="image/png")return Mt(new Uint8Array(await e.arrayBuffer()),t);if(e.type.startsWith("image/"))return null;let s;try{s=JSON.parse(await e.text())}catch{throw new Error("that file is neither a PNG card nor valid JSON")}return Ue(s,t)}function Et(e){const t={name:e.name,description:e.description??"",personality:e.personality??"",scenario:e.scenario??"",first_mes:e.firstMessage??"",mes_example:e.exampleDialogue??"",system_prompt:e.systemPrompt??"",post_history_instructions:"",creator_notes:e.creatorNotes??"",alternate_greetings:e.altGreetings??[],tags:[],creator:"",character_version:"",extensions:{oppailib:{appearance:e.appearance??"",kinks:e.kinks??"",defaultMode:e.defaultMode,promptWeight:e.promptWeight}}};return{spec:"chara_card_v2",spec_version:"2.0",data:t,...t}}var Wt=Object.defineProperty,Nt=Object.getOwnPropertyDescriptor,p=(e,t,a,s)=>{for(var o=s>1?void 0:s?Nt(t,a):t,i=e.length-1,r;i>=0;i--)(r=e[i])&&(o=(s?r(t,a,o):r(o))||o);return s&&o&&Wt(t,a,o),o};const R=[{id:"sweet",label:"sweet",emotion:"happy",topic:"Soft, warm, and unhurried."},{id:"playful",label:"playful",emotion:"mischievous",topic:"Teasing and quick on their feet."},{id:"bold",label:"bold",emotion:"surprised",topic:"Blunt, uninhibited, and direct."},{id:"roleplay",label:"roleplay",emotion:"thinking",topic:"In character, in scene, in detail."},{id:"horny",label:"horny",emotion:"mischievous",topic:"Explicit, leading, and sending pictures."}],Bt=[{id:"character",label:"Character card",icon:"badge",group:"Friend"},{id:"images",label:"Images",icon:"image",group:"Friend"},{id:"model",label:"Model & generation",icon:"memory",group:"Chat"},{id:"profile",label:"Your profile",icon:"person",group:"Chat"}],jt=[{id:"character",label:"Libby",icon:"badge",group:"Libby"},{id:"world",label:"Her world",icon:"public",group:"Libby"},{id:"mind",label:"Her mind",icon:"psychology",group:"Libby"},{id:"images",label:"Her pictures",icon:"image",group:"Libby"},{id:"model",label:"Model & generation",icon:"memory",group:"Chat"},{id:"profile",label:"Your profile",icon:"person",group:"Chat"}],Ut=14e3,Z=8,qt=40,_e="oppai_chat_autopilot",re=21e4,Ft=4e4,Yt=["❤️","😂","😮","😢","🔥","👍","👀","😘"],ze=56,Ht=72,Me=e=>`avatar:${e}`,_=()=>typeof crypto.randomUUID=="function"?crypto.randomUUID().replaceAll("-",""):[...crypto.getRandomValues(new Uint8Array(16))].map(e=>e.toString(16).padStart(2,"0")).join(""),pe=e=>new Date(e).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});function Gt(e){return e?e<0?-1:ce.map(a=>a.value).filter(a=>a>0).reduce((a,s)=>Math.abs(s-e)<Math.abs(a-e)?s:a,1):1}function te(e){const t=new Date(e),a=new Date,s=i=>new Date(i.getFullYear(),i.getMonth(),i.getDate()).getTime(),o=Math.round((s(a)-s(t))/864e5);return o===0?"Today":o===1?"Yesterday":o<7?t.toLocaleDateString([],{weekday:"long"}):t.toLocaleDateString([],{month:"short",day:"numeric",year:t.getFullYear()===a.getFullYear()?void 0:"numeric"})}function Kt(e){const t=te(e);return t==="Today"?pe(e):t==="Yesterday"?t:new Date(e).toLocaleDateString([],{month:"short",day:"numeric"})}const le=()=>({}),Re="oppai_stage_width",Xt={label:"Loader",keys:["loader"],kind:"select"},A=["llama.cpp"],j=["ExLlamav3_HF","ExLlamav3","ExLlamav2_HF","ExLlamav2"],z=["Transformers","HQQ"],de=[{label:"Context length",keys:["ctx_size","n_ctx","max_seq_len"],kind:"number",placeholder:"model default"},{label:"GPU layers",keys:["gpu_layers","n_gpu_layers"],kind:"number",hint:"0 = CPU only",loaders:A},{label:"Batch size",keys:["batch_size","n_batch"],kind:"number",loaders:A},{label:"Threads",keys:["threads"],kind:"number",loaders:A},{label:"Batch threads",keys:["threads_batch"],kind:"number",loaders:A},{label:"KV cache type",keys:["cache_type"],kind:"select",options:["fp16","q8_0","q4_0","q8","q6","q4"],hint:"q8_0/q4_0 for llama.cpp; q8/q6/q4 for ExLlama"},{label:"Tensor split",keys:["tensor_split"],kind:"text",placeholder:"e.g. 20,10",loaders:A},{label:"GPU split (GB)",keys:["gpu_split"],kind:"text",placeholder:"e.g. 20,7",loaders:j},{label:"RoPE base",keys:["rope_freq_base"],kind:"number",placeholder:"model default"},{label:"Positional compression",keys:["compress_pos_emb"],kind:"number",placeholder:"1"},{label:"Experts per token",keys:["num_experts_per_token"],kind:"number",placeholder:"model default",loaders:j},{label:"Compute dtype",keys:["compute_dtype"],kind:"select",options:["float16","bfloat16","float32"],loaders:z},{label:"Quant type",keys:["quant_type"],kind:"select",options:["nf4","fp4"],loaders:z},{label:"Flash attention",keys:["flash_attn"],kind:"check"},{label:"mlock",keys:["mlock"],kind:"check",hint:"keep in RAM",loaders:A},{label:"No mmap",keys:["no_mmap"],kind:"check",loaders:A},{label:"NUMA",keys:["numa"],kind:"check",loaders:A},{label:"CPU only",keys:["cpu"],kind:"check"},{label:"Load in 4-bit",keys:["load_in_4bit"],kind:"check",loaders:z},{label:"Load in 8-bit",keys:["load_in_8bit"],kind:"check",loaders:z},{label:"bf16",keys:["bf16"],kind:"check",loaders:z},{label:"Auto devices",keys:["auto_devices"],kind:"check",loaders:z},{label:"Disk offload",keys:["disk"],kind:"check",loaders:z},{label:"Trust remote code",keys:["trust_remote_code"],kind:"check",loaders:z},{label:"No flash attention",keys:["no_flash_attn"],kind:"check",loaders:j},{label:"CFG cache",keys:["cfg_cache"],kind:"check",loaders:j},{label:"Tensor parallel",keys:["enable_tp"],kind:"check",loaders:j},{label:"Streaming LLM",keys:["streaming_llm"],kind:"check",loaders:A}],Ee={boundary:"boundary",relationship:"us",preference:"likes",user:"about you",libby:"about her",emotional:"feelings",shared:"together"},Vt="two";function qe(){return{profile:{displayName:"",persona:""},characters:[],conversations:[],images:[]}}function Jt(){return{...qe(),characters:[{id:"libby",name:"Libby",builtIn:!0,promptWeight:1,defaultMode:"sweet",description:"OppaiLib's librarian and resident mascot."}]}}function We(e){return{...e,profile:e.profile??{displayName:"",persona:""},characters:(e.characters??[]).filter(t=>t&&t.id),images:(e.images??[]).map(t=>({...t,tags:t.tags??[]})),conversations:(e.conversations??[]).map(t=>({...t,messages:(t.messages??[]).filter(a=>a&&typeof a.content=="string")}))}}function Ne(e,t,a){const s=e==null?void 0:e[t];return typeof s=="number"&&Number.isFinite(s)?s:a}function Be(e,t,a){const s=/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|~~[^~\n]+~~|`[^`\n]+`|"[^"\n]+")/g,o=e.split(s);return n`${o.map(i=>i.startsWith("**")&&i.endsWith("**")?n`<strong class="action">${ee(i.slice(2,-2),t,a)}</strong>`:i.startsWith("*")&&i.endsWith("*")?n`<em>${ee(i.slice(1,-1),t,a)}</em>`:i.startsWith("~~")&&i.endsWith("~~")?n`<s>${i.slice(2,-2)}</s>`:i.startsWith("`")&&i.endsWith("`")?n`<code>${i.slice(1,-1)}</code>`:i.startsWith('"')&&i.endsWith('"')?n`<span class="speech">${ee(i,t,a)}</span>`:ee(i,t,a))}`}const Qt=e=>e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");function ee(e,t,a){if(!(t!=null&&t.length)||!a||!e)return e;const s=t.filter(r=>r.title.trim().length>=3);if(!s.length)return e;const o=new RegExp(`(${s.map(r=>Qt(r.title)).join("|")})`,"i"),i=e.split(o);return i.length===1?e:n`${i.map(r=>{const l=s.find(m=>m.title.toLowerCase()===r.toLowerCase());if(!l)return r;const h=m=>{m.stopPropagation(),a(l.id)};return n`<a class="inline-link" role="link" tabindex="0" title=${`Open ${l.title}`} @click=${h}
      @keydown=${m=>{(m.key==="Enter"||m.key===" ")&&(m.preventDefault(),h(m))}}>${r}</a>`})}`}let c=class extends Xe{constructor(){super(...arguments),this.status=null,this.workspace=qe(),this.characterID="libby",this.conversationID="",this.draft="",this.busy=!1,this.loading=!0,this.workspaceLoaded=!0,this.loadError="",this.settingsOpen=!1,this.speakOn=St(),this.editorTab="character",this.outfits=null,this.activities=[],this.outfitsLoading=!1,this.notice="",this.noticeError=!1,this.imageTags="",this.memories=null,this.memoryKinds=[],this.memoryLimit=0,this.memoryDraft="",this.editingMemory=null,this.memoryDraftEdit="",this.memoryKindEdit="",this.autoState=null,this.wants=null,this.identity=void 0,this.pendingLink=null,this.pendingLinkURL="",this.discord=void 0,this.discordPlaces=null,this.discordToken="",this.discordUserDraft="",this.bond=null,this.openingBond=null,this.models=null,this.modelChoice="",this.modelBusy=!1,this.backend=null,this.loadArgs={},this.loadExtra="",this.loadSettings="",this.loraPicks=[],this.cardTokens=null,this.deleteTarget=null,this.deleteConfirm="",this.deletePermanent=!1,this.deleteError="",this.mobileNavOpen=!1,this.chatSearch="",this.pickerOpen=!1,this.captureTurns=!1,this.turnLog=new Map,this.cardDrop=!1,this.cardNote=null,this.autopilot=localStorage.getItem(_e)==="1",this.autoPaused=!1,this.autoTurns=0,this.stageOpen=!0,this.stageWidth=(()=>{try{return Number(localStorage.getItem(Re))||0}catch{return 0}})(),this.stageDragging=!1,this.pendingPhoto=null,this.typingPhase="idle",this.callOpen=!1,this.callSeconds=0,this.incomingCall=!1,this.ringTimer=0,this.backgrounds=[],this.defaultBackground="",this.scenePickerOpen=!1,this.callCaptions=!0,this.replyTarget=null,this.reactionPicker=null,this.snapOpen=null,this.weightTagDraft="",this.readTimer=0,this.turnOptions={},this.pendingReply=!1,this.swipe=null,this.pendingItems=[],this.picker=null,this.pickerSeq=0,this.callTimer=0,this.autoTimer=0,this.facts=null,this.factsAt=0,this.saveTimer=0,this.editSeq=0,this.idleTimer=0,this.idleNudged=!1,this.noticeTimer=0,this.imageSubject="self",this.approvals=new Ve(()=>this.requestUpdate(),()=>this.actContext()),this.onShared=()=>{this.claimShare()},this.onGlobalKey=e=>{e.key==="Escape"&&this.callOpen&&(e.stopPropagation(),this.endCall())},this.lastArrivalID="",this.memoriesLoading=!1,this.wantsLoading=!1,this.bondLoading=!1,this.armIdle=()=>{window.clearTimeout(this.idleTimer),this.idleNudged=!1,this.characterID==="libby"&&(this.idleTimer=window.setTimeout(()=>void this.idleNudge(),re))},this.pendingAsked=0,this.stageDragStart=e=>{var i,r;e.preventDefault();const t=e.clientX,a=this.stageWidth||((r=(i=this.shadowRoot)==null?void 0:i.querySelector(".stage"))==null?void 0:r.offsetWidth)||300;this.stageDragging=!0;const s=l=>{const h=Math.round(Math.max(220,Math.min(window.innerWidth*.5,a+(t-l.clientX))));this.stageWidth=h},o=()=>{window.removeEventListener("pointermove",s),window.removeEventListener("pointerup",o),this.stageDragging=!1;try{localStorage.setItem(Re,String(this.stageWidth))}catch{}};window.addEventListener("pointermove",s),window.addEventListener("pointerup",o)},this.cancelDeleteModel=()=>{this.deleteTarget=null,this.deleteConfirm="",this.deleteError=""},this.autoStateLoading=!1,this.discordLoading=!1,this.identityLoading=!1,this.chatMenu=e=>{if(fe(e))return;e.preventDefault();const t=this.activeCharacter,a=this.activeConversation,o=e.composedPath().find(l=>{var h,m;return(m=(h=l==null?void 0:l.classList)==null?void 0:h.contains)==null?void 0:m.call(h,"convo-wrap")}),i=o==null?void 0:o.dataset.id,r=i?[{label:"Open",icon:"forum",run:()=>this.activateConversation(i)},{label:"New conversation",icon:"add_comment",run:()=>this.newConversation()},{label:"Export conversation…",icon:"download",run:()=>this.exportConversation(i)},W,{label:"Delete conversation",icon:"delete",danger:!0,run:()=>this.deleteConversation(i)}]:[{label:"Re-respond",icon:"refresh",disabled:this.busy||!(a!=null&&a.messages.some(l=>l.role==="assistant")),run:()=>void this.regenerate()},{label:"Retry with a note…",icon:"edit_note",disabled:this.busy||!(a!=null&&a.messages.some(l=>l.role==="assistant")),run:()=>void this.regenerateWithNote()},{label:this.callOpen?"End video call":"Video call",icon:this.callOpen?"call_end":"videocam",run:()=>this.callOpen?this.endCall():this.startCall()},{label:"Share a photo",icon:"add_photo_alternate",disabled:this.busy,run:()=>this.pickPhoto()},{label:"Attach from the library",icon:"collections_bookmark",disabled:this.busy,run:()=>this.openPicker()},{label:this.autopilot?"Turn off autopilot":"Let the AI continue on its own",icon:"smart_toy",run:()=>this.toggleAutopilot()},{label:this.stageOpen?"Hide portrait":"Show portrait",icon:"wallpaper",run:()=>this.stageOpen=!this.stageOpen},{label:this.speakOn?"Stop reading aloud":"Read replies aloud",icon:this.speakOn?"volume_off":"volume_up",run:()=>this.toggleSpeak()},W,{label:"New conversation",icon:"add_comment",run:()=>this.newConversation()},{label:"Chat settings",icon:"tune",run:()=>{this.settingsOpen=!0,this.editorTab="character"}},{label:"Refresh model status",icon:"sync",run:()=>void this.refreshModels()},W,{label:this.captureTurns?"Stop capturing turns":"Capture turns (prompt + raw reply)",icon:this.captureTurns?"bug_report":"pest_control",run:()=>{this.captureTurns=!this.captureTurns,this.say(this.captureTurns?"Capturing every turn's prompt and raw reply. Export the conversation to read them.":"Stopped capturing turns.")}},{label:"Export conversation…",icon:"download",run:()=>this.exportConversation()},W,{label:"Clear messages",icon:"delete_sweep",danger:!0,run:()=>this.clearConversation()}];ye({x:e.clientX,y:e.clientY,title:t==null?void 0:t.name,items:r})}}get canManageModels(){var e;return!!((e=this.user)!=null&&e.isAdmin)}actContext(){const e=this.activeConversation;return!e||e.characterId!=="libby"?{}:{outfit:X()||void 0,activity:e.activity||void 0,intensity:e.intensity,recentMediaIds:ve(e.messages)}}connectedCallback(){super.connectedCallback(),Je(this,"chat"),this.load().then(()=>void this.claimShare()),window.addEventListener("keydown",this.onGlobalKey),window.addEventListener(we,this.onShared)}disconnectedCallback(){var e;window.clearTimeout(this.ringTimer),super.disconnectedCallback(),window.clearTimeout(this.saveTimer),window.clearTimeout(this.idleTimer),window.clearTimeout(this.noticeTimer),window.clearTimeout(this.autoTimer),window.clearInterval(this.callTimer),window.clearTimeout(this.readTimer),window.removeEventListener("keydown",this.onGlobalKey),window.removeEventListener(we,this.onShared),(e=this.resize)==null||e.disconnect()}async claimShare(){const e=Qe();if(!e)return;const t=this.workspace.characters.find(a=>a.id===e.characterId);if(!t){this.say("That character no longer exists.",!0);return}this.characterID!==t.id&&this.activateCharacter(t.id);try{this.say(`Scanning ${e.name} locally…`);const a=await g.uploadChatImage({characterId:t.id,name:e.name,imageData:e.imageData,tags:[]});this.workspace.images.push(a),this.pendingPhoto={imageId:a.id,tags:a.tags??[],name:a.name},this.touchWorkspace(),this.say(`Ready to show ${t.name} — add a message and send.`),this.focusComposer()}catch(a){this.say(a.message,!0)}}firstUpdated(){this.resize=new ResizeObserver(()=>void this.scrollToEnd(!1)),this.log&&this.resize.observe(this.log),this.focusComposer()}focusComposer(){this.settingsOpen||this.updateComplete.then(()=>{const e=this.callOpen?this.renderRoot.querySelector(".call-input"):this.composer;!e||e.disabled||(e.focus({preventScroll:!0}),e.setSelectionRange(e.value.length,e.value.length))})}updated(e){e.has("busy")&&!this.busy&&this.focusComposer(),(e.has("conversationID")||e.has("characterID"))&&this.focusComposer(),e.has("settingsOpen")&&!this.settingsOpen&&this.focusComposer(),e.has("callOpen")&&this.focusComposer(),this.animateArrival()}animateArrival(){var s;const e=(s=this.activeConversation)==null?void 0:s.messages,t=e==null?void 0:e[e.length-1];if(!t){this.lastArrivalID="";return}if(t.id===this.lastArrivalID)return;const a=!this.lastArrivalID;this.lastArrivalID=t.id,!a&&Ze(this.renderRoot.querySelector(".log article.msg:last-of-type"))}get activeCharacter(){const e=this.visibleCharacters;return e.find(t=>t.id===this.characterID)??e[0]}get visibleCharacters(){return this.workspace.characters}get spoken(){var e;return((e=this.activeConversation)==null?void 0:e.messages.reduce((t,a)=>t+(a.role==="assistant"?1:0),0))??0}get activeConversation(){return this.workspace.conversations.find(e=>e.id===this.conversationID)}conversationsFor(e=this.characterID){return this.workspace.conversations.filter(t=>t.characterId===e).sort((t,a)=>a.updatedAt-t.updatedAt)}async load(){var s,o,i;const[e,t,a]=await Promise.allSettled([g.chatStatus(),g.chatWorkspace(),g.libbyBond(),this.loadBackgrounds()]);try{e.status==="fulfilled"&&(this.status=e.value),t.status==="fulfilled"?(this.workspace=We(t.value),this.workspaceLoaded=!0):(this.workspace=Jt(),this.workspaceLoaded=!1,this.loadError=((s=t.reason)==null?void 0:s.message)||"Couldn't load your chat workspace."),a.status==="fulfilled"&&a.value.lastSeenAt&&(this.openingBond=a.value,M(Math.min(Math.max(1,Math.round(a.value.heatNow||1)),et))),this.characterID=((o=this.workspace.characters[0])==null?void 0:o.id)??"libby";const r=this.conversationsFor(this.characterID)[0];r?this.activateConversation(r.id):this.newConversation(!1),(i=this.status)!=null&&i.modelBackend&&this.refreshModels(!0)}catch(r){this.loadError=r.message||"Chat failed to start."}finally{this.loading=!1}}async retryLoad(){this.loading||(this.loadError="",this.loading=!0,await this.load())}say(e,t=!1){this.notice=e,this.noticeError=t,window.clearTimeout(this.noticeTimer),this.noticeTimer=window.setTimeout(()=>this.notice="",4200)}async libraryFacts(){if(this.facts&&Date.now()-this.factsAt<6e4)return this.facts;try{this.facts=await g.libbyContext(),this.factsAt=Date.now()}catch{}return this.facts}async loadMemories(e=!1){if(!this.memoriesLoading){this.memoriesLoading=!0;try{const t=await g.libbyMemory();this.memories=t.memories,this.memoryKinds=t.kinds??[],this.memoryLimit=t.limit??0}catch{e||(this.memories=[])}finally{this.memoriesLoading=!1}}}async forgetMemory(e){try{await g.forgetLibbyMemory(e),this.memories=(this.memories??[]).filter(t=>t.id!==e)}catch(t){this.say(t instanceof Error?t.message:"Couldn't forget that.",!0)}}async addMemory(){const e=this.memoryDraft.trim();if(!(e.length<8))try{await g.addLibbyMemory({text:e}),this.memoryDraft="",await this.loadMemories(!0),this.say("She'll remember that.")}catch(t){this.say(t instanceof Error?t.message:"Couldn't save that.",!0)}}async togglePin(e){try{const t=await g.updateLibbyMemory(e.id,{pinned:!e.pinned});this.memories=(this.memories??[]).map(a=>a.id===e.id?t:a)}catch(t){this.say(t instanceof Error?t.message:"Couldn't pin that.",!0)}}async saveMemoryEdit(e){const t=this.memoryDraftEdit.trim();if(t.length<8){this.say("A memory needs to be a sentence, not a fragment.",!0);return}try{const a=await g.updateLibbyMemory(e.id,{text:t,kind:this.memoryKindEdit&&this.memoryKindEdit!==e.kind?this.memoryKindEdit:void 0});this.memories=(this.memories??[]).map(s=>s.id===e.id?a:s),this.editingMemory=null}catch(a){this.say(a instanceof Error?a.message:"Couldn't save that.",!0)}}async clearMemories(){if(confirm("Clear everything Libby remembers about you? This can't be undone."))try{await g.clearLibbyMemory(),this.memories=[]}catch(e){this.say(e instanceof Error?e.message:"Couldn't clear her memory.",!0)}}async loadWants(){if(!this.wantsLoading){this.wantsLoading=!0;try{this.wants=(await g.libbyWants()).wants}catch{this.wants=[]}finally{this.wantsLoading=!1}}}async forgetWant(e){try{await g.forgetLibbyWant(e),this.wants=(this.wants??[]).filter(t=>t.id!==e)}catch(t){this.say(t instanceof Error?t.message:"Couldn't drop that.",!0)}}async clearWants(){if(confirm("Clear everything Libby has been wanting? This can't be undone."))try{await g.clearLibbyWants(),this.wants=[]}catch(e){this.say(e instanceof Error?e.message:"Couldn't clear her wants.",!0)}}async loadBond(){if(!this.bondLoading){this.bondLoading=!0;try{this.bond=await g.libbyBond()}catch{this.bond=null}finally{this.bondLoading=!1}}}async resetBond(){if(confirm("Start fresh with Libby? She'll forget where you left off — the time, the mood, how close you've grown. Your memories and her wants are kept."))try{await g.resetLibbyBond(),this.bond=null,this.openingBond=null,M(1),this.say("Reset. Your next chat with Libby starts fresh.")}catch(e){this.say(e instanceof Error?e.message:"Couldn't reset that.",!0)}}async refreshModels(e=!1){try{const[t,a]=await Promise.all([g.chatModels(),g.chatStatus()]);this.models=t,this.status=a,e||this.say(a.enabled?`Connected to ${a.model||"the loaded model"}.`:a.message||"No model is loaded.",!a.enabled),t.supported?this.refreshBackend():this.backend=null}catch(t){e||this.say(t.message,!0)}}async refreshBackend(){var e,t,a;try{this.backend=await g.chatBackendInfo(),this.loraPicks=[...((e=this.backend.loras)==null?void 0:e.loaded)??[]],this.seedLoadArgs(this.modelChoice||((t=this.models)==null?void 0:t.loaded)||((a=this.models)==null?void 0:a.models[0])||"")}catch{this.backend=null}}seedLoadArgs(e){var i,r;const t=(r=(i=this.backend)==null?void 0:i.loads)==null?void 0:r[e],a={...(t==null?void 0:t.args)??{}},s=new Set(de.flatMap(l=>l.keys)),o={};for(const[l,h]of Object.entries(a))s.has(l)||(o[l]=h);for(const l of Object.keys(o))delete a[l];this.loadArgs=a,this.loadExtra=Object.keys(o).length?JSON.stringify(o,null,2):"",this.loadSettings=t!=null&&t.settings&&Object.keys(t.settings).length?JSON.stringify(t.settings,null,2):""}composeLoadArgs(){const e={};for(const a of de){const s=this.loadArgs[a.keys[0]];if(!(s===void 0||s===""||s===null)&&!(a.kind==="check"&&!s))for(const o of a.keys)e[o]=s}this.loadExtra.trim()&&Object.assign(e,JSON.parse(this.loadExtra));const t=this.loadSettings.trim()?JSON.parse(this.loadSettings):{};return{args:e,settings:t}}setLoadArg(e,t){const a={...this.loadArgs},s=e.keys[0];if(e.kind==="check")t?a[s]=!0:delete a[s];else if(e.kind==="number"){const o=Number(t);t===""||Number.isNaN(o)?delete a[s]:a[s]=o}else t===""?delete a[s]:a[s]=t;this.loadArgs=a}async applyLoras(){if(!this.modelBusy){this.modelBusy=!0;try{const e=await g.setChatLoras(this.loraPicks);this.backend&&(this.backend={...this.backend,loras:e}),this.loraPicks=[...e.loaded],this.say(e.loaded.length?`Applied ${e.loaded.join(", ")}.`:"LoRAs cleared.")}catch(e){this.say(e.message,!0)}finally{this.modelBusy=!1}}}async stopGeneration(){try{await g.stopChat(),this.say("Stopping…")}catch(e){this.say(e.message,!0)}}async measureCard(e){const t=[e.description,e.personality,e.scenario,e.kinks,e.systemPrompt,e.exampleDialogue,e.firstMessage].filter(Boolean).join(`

`);try{this.cardTokens=await g.countChatTokens(t)}catch(a){this.say(a.message,!0)}}touchWorkspace(){this.workspace={...this.workspace,profile:{...this.workspace.profile},characters:[...this.workspace.characters],conversations:[...this.workspace.conversations],images:[...this.workspace.images]},this.editSeq++,window.clearTimeout(this.saveTimer),this.saveTimer=window.setTimeout(()=>void this.saveWorkspace(),450)}async saveWorkspace(){if(window.clearTimeout(this.saveTimer),!this.workspaceLoaded)return;const e=this.editSeq;try{const t=await g.saveChatWorkspace(this.workspace);e===this.editSeq&&(this.workspace=We(t))}catch(t){this.say(`Couldn't save chat: ${t.message}`,!0)}}liveConversation(e){return this.workspace.conversations.find(t=>t.id===e)}liveCharacter(e){return this.workspace.characters.find(t=>t.id===e)}async scrollToEnd(e=!0){await this.updateComplete,requestAnimationFrame(()=>{this.log&&this.log.scrollTo({top:this.log.scrollHeight,behavior:e?"smooth":"auto"})})}async idleNudge(){var i;if(this.busy||document.visibilityState!=="visible"||this.autoRunning){window.clearTimeout(this.idleTimer),this.idleTimer=window.setTimeout(()=>void this.idleNudge(),re);return}if(this.idleNudged)return;const e=this.activeConversation;if(!e||e.characterId!=="libby")return;const t=e.messages[e.messages.length-1];if(!t||t.role!=="assistant")return;const a=await this.mayLibbySpeak("idle");if(!(a!=null&&a.allow)){window.clearTimeout(this.idleTimer);const r=a!=null&&a.retryAfterSec?Math.min(a.retryAfterSec*1e3,30*6e4):re;this.idleTimer=window.setTimeout(()=>void this.idleNudge(),r);return}if(this.idleNudged=!0,(i=this.status)!=null&&i.enabled){await this.generateReply(e.id,"",{continuation:!0})&&this.recordLibbySpoke("idle","the conversation went quiet after her message");return}const s=xe("idle",{intensity:e.intensity}),o=this.liveConversation(e.id);o&&(o.emotion=s.emotion,await this.typeAndPushBubbles(o.id,[s.message],0),this.recordLibbySpoke("idle","the conversation went quiet (no model loaded)"))}async mayLibbySpeak(e){try{return await g.libbyAutoCheck({trigger:e})}catch{return}}async recordLibbySpoke(e,t){try{await g.libbyAutoSent({trigger:e,detail:t})}catch{}}activateCharacter(e){this.characterID=e,this.mobileNavOpen=!1;const t=this.conversationsFor(e)[0];t?this.activateConversation(t.id):this.newConversation()}activateConversation(e){const t=this.workspace.conversations.find(a=>a.id===e);t&&(this.conversationID=e,this.characterID=t.characterId,this.mobileNavOpen=!1,this.autoTurns=Z,M(t.intensity),this.armIdle(),this.scheduleAuto(),this.scrollToEnd(!1),this.sayWhatIsPending())}async sayWhatIsPending(){var o;const e=this.activeConversation;if(!e||e.characterId!=="libby"||!((o=this.status)!=null&&o.enabled)||Date.now()-this.pendingAsked<6e4)return;this.pendingAsked=Date.now();let t;try{t=(await g.libbyAutoPending()).pending}catch{return}const a=t.find(i=>i.decision.allow);if(!a||this.busy||this.conversationID!==e.id)return;await this.generateReply(e.id,"",{continuation:!0,task:a.trigger})&&this.recordLibbySpoke(a.trigger,a.detail)}newConversation(e=!0){var r,l,h;const t=this.activeCharacter;if(!t)return;const a=Date.now();let s=((r=t.firstMessage)==null?void 0:r.trim())??"",o=N((l=R.find(m=>m.id===t.defaultMode))==null?void 0:l.emotion);if(t.id==="libby"&&((h=this.openingBond)!=null&&h.mood&&(o=N(this.openingBond.mood)),!s)){const m=tt(t.defaultMode,ae());s=m.message,o=m.emotion}const i={id:_(),characterId:t.id,title:"New conversation",mode:t.defaultMode||"sweet",emotion:o,intensity:t.id==="libby"?ae():1,progress:t.id==="libby"?ae():1,options:{...this.workspace.defaults??le()},messages:s?[{id:_(),role:"assistant",content:s,at:a}]:[],createdAt:a,updatedAt:a};this.workspace.conversations.push(i),this.conversationID=i.id,this.mobileNavOpen=!1,this.touchWorkspace(),e&&this.say(`Started a new chat with ${t.name}.`),this.armIdle(),this.scrollToEnd(!1)}clearConversation(){const e=this.activeConversation;!e||!confirm("Clear every message in this conversation?")||(e.messages=[],e.title="New conversation",e.updatedAt=Date.now(),this.touchWorkspace(),this.say("Conversation cleared."))}deleteConversation(e){if(!confirm("Delete this conversation?"))return;this.workspace.conversations=this.workspace.conversations.filter(a=>a.id!==e);const t=this.conversationsFor()[0];t?this.conversationID=t.id:this.newConversation(!1),this.touchWorkspace()}updateConversation(e){const t=this.activeConversation;t&&(Object.assign(t,e,{updatedAt:Date.now()}),e.intensity!=null&&(t.progress=e.intensity,M(e.intensity)),this.touchWorkspace())}updateOption(e,t){this.updateOptionValue(e,t)}updateOptionValue(e,t){const a=this.activeConversation;if(!a)return;const s={...a.options??{}};t===void 0?delete s[e]:s[e]=t,a.options=s,a.updatedAt=Date.now(),this.touchWorkspace()}onKey(e){e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),this.send())}noticeLink(){const e=It(this.draft);e!==this.pendingLinkURL&&(this.pendingLinkURL=e,this.pendingLink=null,e&&(async()=>{try{const t=await g.libbyLink(e);this.pendingLinkURL===e&&(this.pendingLink=t)}catch{this.pendingLinkURL===e&&(this.pendingLinkURL="")}})())}dropLink(){this.pendingLink=null,this.pendingLinkURL=""}async send(){const e=this.pendingPhoto,t=this.pendingItems,a=this.activeConversation,s=this.draft.trim()||(e?"*shares a photo with you*":"")||(t.length?`*shares ${t.length===1?t[0].title:`${t.length} things`} from the library*`:"");if(!s||!a)return;const o=a.id,i=this.replyTarget,r={id:_(),role:"user",content:s,at:Date.now(),imageId:e==null?void 0:e.imageId,attachments:t.length?t:void 0,replyTo:i?{id:i.id,role:i.role,excerpt:ne(i.content)}:void 0};a.messages.push(r),a.updatedAt=Date.now(),a.title==="New conversation"&&(a.title=s.slice(0,42));const l=this.pendingLink&&!this.pendingLink.failed&&this.pendingLinkURL?this.pendingLinkURL:"";this.draft="",this.pendingPhoto=null,this.pendingItems=[],this.replyTarget=null,this.dropLink(),this.notice="";const h=this.renderRoot.querySelector("textarea");h&&(h.value=""),this.touchWorkspace(),this.armIdle(),this.scrollToEnd(),this.autoTurns=Z,a.characterId==="libby"&&g.libbyAutoAnswered().catch(()=>{});const m=this.turnOptions;this.turnOptions={photoTags:e?e.tags:m.photoTags,photoImageID:e?e.imageId:m.photoImageID,link:l||m.link,sharedMediaIds:[...m.sharedMediaIds??[],...t.map(f=>f.id)]},this.scheduleReply(o,s.length)}scheduleReply(e,t){window.clearTimeout(this.readTimer);const a=this.liveConversation(e),s=a?[...a.messages].reverse().find(i=>i.role==="assistant"):void 0,o=s?Date.now()-s.at:0;if(this.busy){this.pendingReply=!0;return}this.readTimer=window.setTimeout(()=>void this.runTurn(e),Pt(t,o))}async runTurn(e){if(this.busy){this.pendingReply=!0;return}const t=this.liveConversation(e);if(!t)return;const a=Date.now();let s="";for(const l of t.messages)l.role==="user"&&!l.readAt&&(l.readAt=a,s=l.content);if(!s)return;this.touchWorkspace(),await this.pause(250+Math.random()*500);const o=this.turnOptions;this.turnOptions={},await this.generateReply(e,s,{photoTags:o.photoTags??[],photoImageID:o.photoImageID??"",link:o.link??"",sharedMediaIds:o.sharedMediaIds??[]}),this.scheduleAuto();const i=this.liveConversation(e),r=(i==null?void 0:i.messages.some(l=>l.role==="user"&&!l.readAt))??!1;(this.pendingReply||r)&&(this.pendingReply=!1,r&&this.scheduleReply(e,40))}receiptFor(e,t){if(e.role!=="user")return"";const a=t.messages.filter(o=>o.role==="user");if(a[a.length-1]!==e)return"";if(e.readAt)return`Read ${pe(e.readAt)}`;const s=t.messages.indexOf(e);return t.messages.slice(s+1).some(o=>o.role==="assistant"&&!o.thought)?"Read":"Sent"}react(e,t){const a=this.activeConversation;if(!a)return;const s=(e.reactions??[]).find(i=>i.by==="user"),o=(e.reactions??[]).filter(i=>i.by!=="user");e.reactions=(s==null?void 0:s.emoji)===t?o:[...o,{emoji:t,by:"user"}],e.reactions.length||delete e.reactions,this.reactionPicker=null,a.updatedAt=Date.now(),this.touchWorkspace()}applyReaction(e,t,a){const s=a&&e.messages.find(i=>i.id===a)||[...e.messages].reverse().find(i=>i.role==="user");if(!s)return;const o=(s.reactions??[]).filter(i=>i.by!=="assistant");s.reactions=[...o,{emoji:t,by:"assistant"}]}openSnap(e){e.opened||(this.snapOpen=e)}closeSnap(){const e=this.snapOpen;if(this.snapOpen=null,!e)return;e.opened=!0;const t=this.activeConversation;t&&(t.updatedAt=Date.now(),this.touchWorkspace())}swipeStart(e,t){if(t.pointerType==="mouse"||e.thought)return;const a=t.currentTarget.querySelector(".bubble-wrap");a&&(this.swipe={id:e.id,startX:t.clientX,startY:t.clientY,dx:0,live:!1,el:a})}swipeMove(e){const t=this.swipe;if(!t)return;const a=e.clientX-t.startX,s=e.clientY-t.startY;if(!t.live){if(Math.abs(s)>8&&Math.abs(s)>Math.abs(a)){this.swipe=null;return}if(a<10)return;t.live=!0,t.el.classList.add("swiping");try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}}t.dx=Math.max(0,Math.min(Ht,a)),t.el.style.transform=`translateX(${t.dx}px)`,t.el.classList.toggle("will-reply",t.dx>=ze),e.preventDefault()}swipeEnd(e){const t=this.swipe;this.swipe=null,t&&(t.el.classList.remove("swiping","will-reply"),t.el.style.transform="",t.live&&t.dx>=ze&&this.replyTo(e))}replyTo(e){e.thought||(this.replyTarget=e,this.focusComposer())}jumpTo(e){if(!(e!=null&&e.id))return;const t=this.renderRoot.querySelector(`[data-message-id="${e.id}"]`);if(!t){this.say("That message isn't in this conversation any more.");return}t.scrollIntoView({block:"center",behavior:"smooth"}),t.classList.remove("flash"),t.offsetWidth,t.classList.add("flash")}openPicker(){this.picker={query:"",items:[],loading:!0},this.searchLibrary(""),window.setTimeout(()=>{var e;return(e=this.renderRoot.querySelector(".picker-head input"))==null?void 0:e.focus()},30)}closePicker(){this.picker=null,this.focusComposer()}async searchLibrary(e){var s;if(!this.picker)return;const t=++this.pickerSeq;(s=this.pickerAbort)==null||s.abort();const a=new AbortController;this.pickerAbort=a,this.picker={...this.picker,query:e,loading:!0};try{const{items:o}=await g.listMedia({q:e,limit:120,signal:a.signal});if(t!==this.pickerSeq||!this.picker)return;this.picker={query:e,items:o,loading:!1}}catch(o){if(a.signal.aborted||t!==this.pickerSeq||!this.picker)return;this.picker={...this.picker,loading:!1},this.say(o.message,!0)}}toggleItem(e){this.pendingItems.some(a=>a.id===e.id)?this.pendingItems=this.pendingItems.filter(a=>a.id!==e.id):this.pendingItems.length<6?this.pendingItems=[...this.pendingItems,{id:e.id,title:e.title||`Item ${e.id}`,kind:e.kind,hasThumb:e.hasThumb===!0}]:this.say("Six at a time is plenty.")}removeItem(e){this.pendingItems=this.pendingItems.filter(t=>t.id!==e)}async attachPhoto(e){var o,i;const t=e.target,a=(o=t.files)==null?void 0:o[0],s=this.activeCharacter;if(!(!a||!s))try{this.say("Scanning photo locally…");const r=await g.uploadChatImage({characterId:s.id,name:a.name,imageData:await this.readDataURL(a),tags:[]});this.workspace.images.push(r),this.pendingPhoto={imageId:r.id,tags:r.tags??[],name:r.name},this.touchWorkspace(),this.say((i=r.tags)!=null&&i.length?`Photo ready: ${r.tags.slice(0,6).join(", ")}.`:"Photo ready to send."),this.focusComposer()}catch(r){this.say(r.message,!0)}finally{t.value=""}}pickPhoto(){var e;(e=this.renderRoot.querySelector(".attach-btn input"))==null||e.click()}async discardPhoto(){const e=this.pendingPhoto;if(e){this.pendingPhoto=null,this.workspace.images=this.workspace.images.filter(t=>t.id!==e.imageId),this.touchWorkspace(),this.focusComposer();try{await g.deleteChatImage(e.imageId)}catch{}}}pause(e){return new Promise(t=>setTimeout(t,e))}async typeLikeAPerson(e,t){const a=r=>r*(.7+Math.random()*.6),s=Math.min(7e3,a(420+e.length*45));let o=Math.max(0,s-t);if(o<120)return;this.typingPhase="thinking";const i=Math.min(o,a(500));if(await this.pause(i),o-=i,e.length>90&&o>900&&Math.random()<.35){const r=o*(.3+Math.random()*.3);this.typingPhase="typing",await this.pause(r),this.typingPhase="thinking";const l=a(650);await this.pause(l),o-=r+l}o>0&&(this.typingPhase="typing",await this.pause(o)),this.typingPhase="idle"}async typeAndPushBubbles(e,t,a,s={},o={}){for(let i=0;i<t.length;i++){await this.typeLikeAPerson(t[i],i===0?a:0);const r=this.liveConversation(e);if(!r)return!1;const l=i===t.length-1;r.messages.push({id:_(),role:"assistant",content:t[i],at:Date.now(),...i===0?o:{},...l?s:{}}),r.updatedAt=Date.now(),this.touchWorkspace(),this.scrollToEnd(),this.speakOn&&e===this.conversationID&&Te(t[i],r.intensity)}return!0}toggleSpeak(){this.speakOn=!this.speakOn,Tt(this.speakOn),this.say(this.speakOn?"She'll read her replies aloud on this device.":"Voice off.")}pushThoughts(e,t){if(!(t!=null&&t.length))return!0;const a=this.liveConversation(e);if(!a)return!1;for(const{kind:s,text:o}of t)o.trim()&&a.messages.push({id:_(),role:"assistant",content:o,at:Date.now(),thought:s});return a.updatedAt=Date.now(),this.touchWorkspace(),this.scrollToEnd(),!0}async generateReply(e,t,a={}){var $,y,k,x,T,v,S,O,U,E,q,he,ue,ge,me,be;const{continuation:s=!1,photoTags:o=[],photoImageID:i="",link:r="",sharedMediaIds:l=[],nudge:h="",task:m=""}=a,f=this.liveConversation(e),b=f&&this.liveCharacter(f.characterId);if(!f||!b||this.busy)return!1;if(this.busy=!0,!(($=this.status)!=null&&$.enabled)&&((y=this.status)!=null&&y.configured||(k=this.status)!=null&&k.modelBackend))try{this.status=await g.chatStatus()}catch{}if(!((x=this.status)!=null&&x.enabled)){if(b.id!=="libby")return this.busy=!1,this.say(((T=this.status)==null?void 0:T.message)||"Load a model in text-generation-webui, then refresh backend status.",!0),!1;const L=ke(f.progress??f.intensity,s?0:at(t,f.mode)),F=f.mode,w=N(f.emotion);let C;if(s)C=xe("idle",{intensity:L.intensity});else{const H=await this.libraryFacts();C=(H&&st(t,H,{intensity:L.intensity}))??it(t,F,w,L.intensity,!1)}const D=this.liveConversation(e);if(!D)return this.busy=!1,this.typingPhase="idle",!1;D.emotion=C.emotion,D.progress=L.progress,D.intensity=M(L.intensity),D.updatedAt=Date.now(),this.touchWorkspace();const Y=await this.typeAndPushBubbles(e,Le(C.message),0);return this.busy=!1,this.typingPhase="idle",Y}try{const L=f.messages.filter(P=>!P.thought).map(({id:P,role:Fe,content:Ye,replyTo:He,imageId:Ge,attachments:G,reactions:K})=>({id:P,role:Fe,content:Ye,replyTo:He,imageId:Ge||void 0,mediaIds:G!=null&&G.length?G.map(Ke=>Ke.id):void 0,reactions:K!=null&&K.length?K:void 0}));s?L.push({role:"user",content:"(Continue the scene on your own. Speak or act again without waiting for a reply, and do not answer for me.)"}):h&&L.push({role:"user",content:`(Try that reply again. ${h} Do not mention this note.)`});const F=Date.now();this.typingPhase="typing";const w=await g.chat({mode:f.mode,messages:L,emotion:f.emotion,intensity:f.intensity,options:f.options,characterId:b.id,conversationId:f.id,photoTags:o,photoImageId:i,recentImageIds:rt(f.messages),recentMediaIds:ve(f.messages),recentMoods:nt(f.messages),recentHeat:ot(f.messages),activity:f.activity||void 0,background:f.background||void 0,sharedMediaIds:l.length?l:void 0,call:this.callOpen||void 0,outfit:b.id==="libby"?X():"",link:r||void 0,task:m||(s?"autonomous":void 0),debug:this.captureTurns||void 0});if(w.debug){const P=this.turnLog.get(e)??[];P.push({at:F,request:{photoTags:o,photoImageId:i,task:s?"autonomous":""},debug:w.debug}),this.turnLog.set(e,P.slice(-qt))}this.lastSampling=w.sampling,this.lastPhoto=w.photo,(v=w.context)!=null&&v.note&&this.say(w.context.note);const C=this.liveConversation(e);if(!C)return!1;C.emotion=N(w.emotion??C.emotion),w.activity!==void 0&&(C.activity=w.activity),w.background!==void 0&&(C.background=w.background);const D=$e(w.intensity??C.intensity);if(w.declared)C.progress=D,C.intensity=M(D);else{const P=ke(C.progress??C.intensity,D-C.intensity);C.progress=P.progress,C.intensity=M(P.intensity)}if(C.updatedAt=Date.now(),this.touchWorkspace(),w.callRequest&&!this.callOpen&&this.ring(),w.callEnd&&this.callOpen&&(this.endCall(),this.say(`${b.name} ended the call.`)),!this.pushThoughts(e,w.thoughts))return!1;(S=w.reaction)!=null&&S.emoji&&(this.applyReaction(C,w.reaction.emoji,w.reaction.to),this.touchWorkspace());const Y=!!(w.imageId||(O=w.attachments)!=null&&O.length);if(!w.message.trim()&&!Y)return(((U=w.thoughts)==null?void 0:U.length)??0)>0||!!w.reaction;const H=w.message.trim()||(w.snap?"*sends a snap*":"*sends a picture*");return await this.typeAndPushBubbles(e,Le(H),Date.now()-F,{mood:C.emotion,heat:C.intensity,imageId:w.imageId||void 0,snap:w.snap&&Y?!0:void 0,links:(E=w.links)!=null&&E.length?w.links:void 0,attachments:(q=w.attachments)!=null&&q.length?w.attachments:void 0,actions:(he=w.actions)!=null&&he.length?w.actions:void 0},{replyTo:w.replyTo??void 0})}catch(L){if((ue=this.status)!=null&&ue.configured||(ge=this.status)!=null&&ge.modelBackend)try{this.status=await g.chatStatus()}catch{}return this.typingPhase="idle",this.say(!((me=this.status)!=null&&me.enabled)&&((be=this.status)!=null&&be.message)?this.status.message:L.message,!0),!1}finally{this.busy=!1,this.typingPhase="idle"}}async regenerate(e=""){const t=this.activeConversation;if(!t||this.busy)return;const a=t.messages;let s=a.length;for(;s>0&&a[s-1].role==="assistant";)s--;if(s===a.length){this.say("There is no reply to redo yet.",!0);return}const o=t.id,i=s>0?a[s-1].content:"";t.messages=a.slice(0,s),t.updatedAt=Date.now(),this.touchWorkspace(),this.scrollToEnd();const r=s>0?a[s-1]:void 0;await this.generateReply(o,i,{continuation:s===0,nudge:e,sharedMediaIds:(r==null?void 0:r.role)==="user"?(r.attachments??[]).map(l=>l.id):[]})}async regenerateWithNote(){var t;const e=(t=prompt("Ask her to try again — what should be different?",""))==null?void 0:t.trim();e!==void 0&&await this.regenerate(e?e.endsWith(".")?e:e+".":"")}async retryFrom(e){const t=this.activeConversation;if(!t||this.busy||e.role!=="user")return;const a=t.messages.indexOf(e);if(a<0)return;const s=t.id;t.messages=t.messages.slice(0,a+1),t.updatedAt=Date.now(),this.touchWorkspace(),this.scrollToEnd(),await this.generateReply(s,e.content,{sharedMediaIds:(e.attachments??[]).map(o=>o.id)})}toggleAutopilot(){var e;this.autopilot=!this.autopilot,this.autoPaused=!1,this.autoTurns=Z;try{localStorage.setItem(_e,this.autopilot?"1":"0")}catch{}this.autopilot&&!((e=this.status)!=null&&e.enabled)&&this.say("Autopilot needs a connected model — it stays off until one is loaded.",!0),this.scheduleAuto()}pauseAutopilot(e){this.autoPaused=e,e?window.clearTimeout(this.autoTimer):(this.autoTurns=Math.max(this.autoTurns,1),this.scheduleAuto())}refillAutopilot(){this.autoTurns=Z,this.pauseAutopilot(!1)}get autoRunning(){var e;return this.autopilot&&!this.autoPaused&&!!((e=this.status)!=null&&e.enabled)&&this.autoTurns>0}scheduleAuto(){window.clearTimeout(this.autoTimer),this.autoRunning&&(this.autoTimer=window.setTimeout(()=>void this.autoTick(),Ut))}async autoTick(){if(this.busy||document.visibilityState!=="visible"){this.scheduleAuto();return}const e=this.activeConversation;if(!e||!this.autoRunning)return;this.autoTurns--,await this.generateReply(e.id,"",{continuation:!0})?this.scheduleAuto():this.autoPaused=!0}editMessage(e){var s;const t=(s=prompt("Edit message",e.content))==null?void 0:s.trim();if(!t||t===e.content)return;e.content=t;const a=this.activeConversation;a&&(a.updatedAt=Date.now()),this.touchWorkspace()}deleteMessage(e){const t=this.activeConversation;t&&(t.messages=t.messages.filter(a=>a.id!==e),t.updatedAt=Date.now(),this.touchWorkspace())}updateCharacter(e,t){const a=this.activeCharacter;a&&(a[e]=t,this.touchWorkspace())}addCharacter(){const e={id:_(),name:"New friend",promptWeight:1,defaultMode:"sweet",firstMessage:"Hey! It's nice to meet you."};this.workspace.characters.push(e),this.characterID=e.id,this.touchWorkspace(),this.newConversation(!1),this.settingsOpen=!0,this.editorTab="character"}deleteCharacter(){var a;const e=this.activeCharacter;if(!e||e.builtIn||!confirm(`Remove ${e.name} and all of their conversations?`))return;this.workspace.characters=this.workspace.characters.filter(s=>s.id!==e.id),this.workspace.conversations=this.workspace.conversations.filter(s=>s.characterId!==e.id),this.characterID=((a=this.workspace.characters[0])==null?void 0:a.id)??"libby";const t=this.conversationsFor()[0];t?this.conversationID=t.id:this.newConversation(!1),this.touchWorkspace()}async importCard(e){const t=e.target,a=Array.from(t.files??[]);a.length&&await this.ingestCards(a),t.value=""}async ingestCards(e){const t=[],a=[],s=[];for(const i of e)try{const r=await Rt(i),l=i.name.toLowerCase().endsWith(".png")||i.type==="image/png";if(!r){if(!l&&!i.type.startsWith("image/")){s.push(`${i.name}: no character card inside`);continue}s.push(`${i.name}: no card data in that image — add a friend first, then set their picture`);continue}if(this.workspace.characters.length>=40){s.push(`${i.name}: workspace is full`);break}const h={...r.character,id:_()};if(this.workspace.characters.push(h),this.characterID=h.id,t.push(h.name),r.leftovers.alternateGreetings>0&&a.push(`${h.name}: kept ${r.leftovers.alternateGreetings} alternate greeting${r.leftovers.alternateGreetings===1?"":"s"}`),r.leftovers.characterBook&&a.push(`${h.name}: the card's lorebook was dropped — this app has nowhere to put one`),l){await this.saveWorkspace();try{const m=await g.uploadChatImage({characterId:h.id,name:`${h.name} avatar`,imageData:await this.readDataURL(i),tags:["portrait"]});this.workspace.images.push(m);const f=this.liveCharacter(h.id);f&&(f.avatarImageId=m.id)}catch(m){a.push(`${h.name}: card imported, but the portrait didn't upload (${m.message})`)}}}catch(r){s.push(`${i.name}: ${r.message}`)}t.length&&(this.touchWorkspace(),this.newConversation(!1));const o=[t.length?`Imported ${t.join(", ")}.`:"",...a,...s.map(i=>`Couldn't import ${i}.`)].filter(Boolean).join(" ");this.cardNote=o?{text:o,bad:!t.length}:null,o&&this.say(o,!t.length)}readDataURL(e){return new Promise((t,a)=>{const s=new FileReader;s.onload=()=>t(String(s.result)),s.onerror=()=>a(s.error),s.readAsDataURL(e)})}async uploadImage(e){var s;const t=(s=e.target.files)==null?void 0:s[0],a=this.activeCharacter;if(!(!t||!a))try{this.say("Scanning image locally…");const o=this.imageTags.split(",").map(l=>l.trim()).filter(Boolean),i=await g.uploadChatImage({characterId:a.id,name:t.name,imageData:await this.readDataURL(t),tags:o,subject:this.imageSubject||void 0});this.workspace.images.push(i);const r=this.liveCharacter(a.id);r&&!r.avatarImageId&&(r.avatarImageId=i.id),this.imageTags="",this.touchWorkspace(),this.say(`Image scanned: ${i.tags.join(", ")||"no content tags found"}.`)}catch(o){this.say(o.message,!0)}finally{e.target.value=""}}async uploadProfilePicture(e){var s;const t=(s=e.target.files)==null?void 0:s[0];if(!t)return;const a=this.workspace.profile.avatarImageId;try{this.say("Uploading profile picture…");const o=await g.uploadChatImage({characterId:lt,name:t.name,imageData:await this.readDataURL(t),tags:[]});this.workspace.images.push(o),this.editProfile({avatarImageId:o.id}),await this.saveWorkspace(),a&&await this.discardProfileImage(a),this.say("Profile picture updated.")}catch(o){this.say(o.message,!0)}finally{e.target.value=""}}async removeProfilePicture(){const e=this.workspace.profile.avatarImageId;e&&(this.editProfile({avatarImageId:""}),await this.saveWorkspace(),await this.discardProfileImage(e),this.say("Profile picture removed."))}async uploadCharacterPicture(e){var i;const t=(i=e.target.files)==null?void 0:i[0],a=this.activeCharacter;if(!t||!a)return;const s=a.id,o=a.avatarImageId;try{this.say("Uploading picture…");const r=await g.uploadChatImage({characterId:Me(s),name:`${a.name} avatar`,imageData:await this.readDataURL(t),tags:[]});this.workspace.images.push(r);const l=this.liveCharacter(s);l&&(l.avatarImageId=r.id),this.touchWorkspace(),await this.saveWorkspace(),o&&this.isAvatarUpload(o,s)&&await this.discardProfileImage(o),this.say("Picture updated.")}catch(r){this.say(r.message,!0)}finally{e.target.value=""}}async removeCharacterPicture(){const e=this.activeCharacter,t=e==null?void 0:e.avatarImageId;if(!e||!t)return;const a=e.id;e.avatarImageId="",this.touchWorkspace(),await this.saveWorkspace(),this.isAvatarUpload(t,a)&&await this.discardProfileImage(t),this.say("Picture removed.")}isAvatarUpload(e,t){var a;return((a=this.workspace.images.find(s=>s.id===e))==null?void 0:a.characterId)===Me(t)}async discardProfileImage(e){try{await g.deleteChatImage(e),this.workspace.images=this.workspace.images.filter(t=>t.id!==e),this.touchWorkspace()}catch{}}async deleteImage(e){if(confirm(`Delete ${e.name}?`))try{await g.deleteChatImage(e.id),this.workspace.images=this.workspace.images.filter(a=>a.id!==e.id);const t=this.activeCharacter;(t==null?void 0:t.avatarImageId)===e.id&&(t.avatarImageId=""),this.touchWorkspace()}catch(t){this.say(t.message,!0)}}avatar(e,t){return e.avatarImageId?n`<span class=${t}><img src=${g.chatImageURL(e.avatarImageId)} alt="" /></span>`:e.id==="libby"&&!V()?n`<span class=${t}><img src=${dt} alt="Libby" /></span>`:n`<span class="${t} initial">${e.name.slice(0,2).toUpperCase()}</span>`}profileAvatar(e,t){const a=this.workspace.profile.avatarImageId;return a?n`<span class=${t}><img src=${g.chatImageURL(a)} alt="" /></span>`:n`<span class="${t} initial">${e.slice(0,2).toUpperCase()}</span>`}spriteFor(e,t,a,s){return e.id==="libby"?ct(t,a,X(),s):[]}startCall(){const e=this.activeCharacter;if(e){if(!this.spriteFor(e,"neutral",1).length){this.say(`${e.name} has no picture to show — set one on their character card first.`,!0);return}this.stopRinging(),this.callOpen=!0,this.callSeconds=0,this.settingsOpen=!1,this.scenePickerOpen=!1,window.clearInterval(this.callTimer),this.callTimer=window.setInterval(()=>this.callSeconds+=1,1e3),this.loadBackgrounds(),this.focusComposer()}}endCall(){Ie(),this.callOpen=!1,this.scenePickerOpen=!1,window.clearInterval(this.callTimer),this.focusComposer()}ring(){var e;if(!(this.callOpen||V())){this.incomingCall=!0,window.clearTimeout(this.ringTimer),this.ringTimer=window.setTimeout(()=>this.declineCall(!0),Ft);try{(e=navigator.vibrate)==null||e.call(navigator,[220,120,220])}catch{}}}stopRinging(){this.incomingCall=!1,window.clearTimeout(this.ringTimer)}acceptCall(){this.stopRinging(),this.startCall()}declineCall(e=!1){var t;this.incomingCall&&(this.stopRinging(),e&&this.say("Missed a call from "+(((t=this.activeCharacter)==null?void 0:t.name)??"her")+"."))}async loadBackgrounds(){try{const e=await g.libbyBackgrounds();this.backgrounds=e.backgrounds,this.defaultBackground=e.default??""}catch{this.backgrounds=[]}}setBackground(e){const t=this.activeConversation;t&&(t.background=e,t.updatedAt=Date.now(),this.touchWorkspace(),this.scenePickerOpen=!1)}toggleScenePicker(){this.scenePickerOpen=!this.scenePickerOpen,this.scenePickerOpen&&this.loadBackgrounds()}renderCall(e,t){if(!this.callOpen)return d;const a=this.poseOf(e,t);if(!a)return d;const{emotion:s,intensity:o,typing:i,activity:r,assets:l}=a,h=this.backgrounds.find(b=>b.id===(t.background||this.defaultBackground)&&b.hasImage),m=t.messages.filter(b=>!b.thought).slice(-3),f=`${Math.floor(this.callSeconds/60)}:${String(this.callSeconds%60).padStart(2,"0")}`;return n`<div class="call" role="dialog" aria-modal="true" aria-label=${`Video call with ${e.name}`}>
      <div class="call-scene" @click=${()=>{this.scenePickerOpen&&(this.scenePickerOpen=!1)}}>
        <div class="call-bg ${h?"":"plain"}" style=${h?`background-image:url("${g.libbyBackgroundURL(h.id)}")`:""}></div>
        <div class="call-veil"></div>
        <!-- Keyed on the pose: a mood change replaces the element instead of
             mutating src, so the fade-in replays and the fallback chain restarts
             from the top for the new emotion's art. -->
        <span class="call-hold libby-breathe">${se(`${s}-${o}-${r}-${this.spoken}`,n`<img
          class="call-sprite" src=${l[0]} data-fallback-index="0"
          alt=${`${e.name} looking ${s}`}
          @error=${b=>ie(b.target,l)} />`)}</span>
        <div class="call-top">
          <span class="call-who">${this.avatar(e,"avatar")}<span><strong>${e.name}</strong><span><i class="call-live"></i>${i?"typing…":this.busy?"thinking…":f}</span></span></span>
          <span class="call-mood" title=${`Feeling ${s}`}>
            <span class="material-symbols-rounded">mood</span>${s}
            ${t.activity?n`<span class="call-doing" title=${`She is ${t.activity}`}>${oe(t.activity)}</span>`:d}
            ${h?n`<span class="call-place" title="Where she is">${h.name}</span>`:d}
          </span>
        </div>
        ${this.callCaptions?n`<div class="call-captions" aria-live="polite">
          ${m.map((b,$)=>n`<p class="call-caption ${b.role==="user"?"mine":""} ${$<m.length-1?"older":""}">${Be(b.content,b.links,y=>B(this,y))}</p>`)}
          ${i?n`<p class="call-caption typing" aria-label="${e.name} is typing"><span class="dots"><i></i><i></i><i></i></span></p>`:d}
        </div>`:d}
        ${this.scenePickerOpen?this.renderScenePicker(t):d}
      </div>
      <div class="call-bar">
        <input class="call-input" placeholder=${`Say something to ${e.name}…`} aria-label=${`Message ${e.name}`}
          .value=${this.draft} @input=${b=>this.draft=b.target.value}
          @keydown=${b=>{b.key==="Enter"&&(b.preventDefault(),this.send())}} />
        <button class="call-btn send" title="Send" aria-label="Send" ?disabled=${!this.draft.trim()||this.busy} @click=${()=>void this.send()}><span class="material-symbols-rounded">send</span></button>
        <button class="call-btn ${this.scenePickerOpen?"on":""}" title="Change where she is" aria-label="Change the background" @click=${()=>this.toggleScenePicker()}><span class="material-symbols-rounded">wallpaper</span></button>
        <button class="call-btn captions ${this.callCaptions?"on":""}" title=${this.callCaptions?"Hide captions":"Show captions"} aria-pressed=${this.callCaptions?"true":"false"} @click=${()=>this.callCaptions=!this.callCaptions}><span class="material-symbols-rounded">closed_caption</span></button>
        <button class="call-btn" title="Re-respond" aria-label="Ask for a different reply" ?disabled=${this.busy} @click=${()=>void this.regenerate()}><span class="material-symbols-rounded">refresh</span></button>
        <button class="call-btn end" title="End call" aria-label="End call" @click=${()=>this.endCall()}><span class="material-symbols-rounded">call_end</span></button>
      </div>
    </div>`}renderScenePicker(e){const t=this.backgrounds.filter(a=>a.hasImage);return n`<div class="call-tray" @click=${a=>a.stopPropagation()}>
      <h4>Where she is</h4>
      <div class="call-scenes">
        ${this.defaultBackground?d:n`<button class="call-scene-btn ${e.background?"":"on"}" title="No background" @click=${()=>this.setBackground("")}>
          <span class="scene-icon material-symbols-rounded">blur_on</span><span class="scene-name">Plain</span>
        </button>`}
        ${t.map(a=>n`<button class="call-scene-btn ${(e.background||this.defaultBackground)===a.id?"on":""}" title=${a.tags.join(", ")||a.name} @click=${()=>this.setBackground(a.id)}>
          <img src=${g.libbyBackgroundURL(a.id)} alt="" loading="lazy"/><span class="scene-name">${a.name}${a.id===this.defaultBackground?" · default":""}</span>
        </button>`)}
      </div>
      <p>${t.length?"She picks a room herself when the scene moves; this overrides her until she moves again.":"No backgrounds yet — add and tag some in the outfit studio, and she'll choose between them."}</p>
    </div>`}poseOf(e,t){if(e.id==="libby"&&V())return null;const a=N(t.emotion),s=$e(t.intensity),o=this.busy&&this.typingPhase==="typing",i=t.activity||(o?"typing":""),r=this.spriteFor(e,a,s,i);return r.length?{emotion:a,intensity:s,typing:o,activity:i,assets:r,key:`${a}-${s}-${i}-${this.spoken}`}:null}renderHero(e,t){var m;const a=this.poseOf(e,t);if(!a)return d;const{emotion:s,typing:o,activity:i,assets:r,key:l}=a,h=this.busy?"Typing…":this.autoRunning?"Talking on their own":(m=this.status)!=null&&m.enabled?this.status.model:"Local replies";return n`<div class="hero" role="button" tabindex="0" aria-label=${`${e.name} — open the call`} title="Open the call"
      @click=${()=>this.startCall()} @keydown=${f=>{(f.key==="Enter"||f.key===" ")&&(f.preventDefault(),this.startCall())}}>
      <span class="hero-hold libby-breathe">${se(l,n`<img
        class="hero-sprite ${this.busy?"":"libby-speak"}" src=${r[0]} data-fallback-index="0"
        alt=${i?`${e.name} ${i}, looking ${s}`:`${e.name} looking ${s}`}
        @error=${f=>ie(f.target,r)} />`)}</span>
      ${o?n`<div class="hero-bubble" aria-hidden="true"><span class="dots"><i></i><i></i><i></i></span></div>`:d}
      <div class="hero-copy">
        <span class="hero-name">${e.name}</span>
        <span class="hero-status">${h}${e.id==="libby"?` · ${s}`:""}</span>
        ${t.activity?n`<div class="stage-doing" role="status">${oe(t.activity)}</div>`:d}
      </div>
      <span class="hero-open"><span class="material-symbols-rounded">videocam</span>Call</span>
    </div>`}renderStage(e,t){var y,k;const a=this.poseOf(e,t);if(!a)return d;const{emotion:s,intensity:o,typing:i,activity:r,assets:l}=a,h=this.busy?"Typing…":this.autoRunning?"Talking on their own":(y=this.status)!=null&&y.enabled?this.status.model:"Local replies",m=this.backgrounds.find(x=>x.id===(t.background||this.defaultBackground)&&x.hasImage),f=i?void 0:[...t.messages].reverse().find(x=>x.role==="assistant"&&!x.thought&&x.content.trim()),b=f?ne(At(f.content),110):"",$=!!((k=this.status)!=null&&k.enabled);return n`<aside class="stage" aria-label="${e.name} portrait">
      <div class="stage-grip ${this.stageDragging?"dragging":""}" title="Drag to resize" @pointerdown=${this.stageDragStart}></div>
      <div class="stage-scene" @click=${()=>{this.scenePickerOpen&&(this.scenePickerOpen=!1)}}>
        <div class="stage-bg ${m?"room":"plain"}" style=${m?`background-image:url("${g.libbyBackgroundURL(m.id)}")`:""}></div>
        <div class="stage-veil"></div>
        <div class="stage-floor"></div>
        <div class="stage-ground"></div>
        <div class="stage-art">
          <!-- Keyed on the pose *and* on how many things have been said, so the sprite
               rocks into every new line rather than only when her mood changes — and
               so a mood change still replaces the element, restarting the artwork
               fallback chain for the new pose. -->
          <span class="sprite-hold libby-breathe">${se(`${s}-${o}-${r}-${this.spoken}`,n`<img
            class="sprite ${this.busy?"":"libby-speak"}" src=${l[0]} data-fallback-index="0"
            alt=${r?`${e.name} ${r}, looking ${s}`:`${e.name} looking ${s}`}
            @error=${x=>ie(x.target,l)} />`)}</span>
        </div>
        ${i?n`<div class="stage-bubble" aria-hidden="true"><span class="dots"><i></i><i></i><i></i></span></div>`:b?n`<div class="stage-bubble quote" aria-hidden="true">${b}</div>`:d}
        <div class="stage-tools">
          ${e.id==="libby"?n`<button class="icon-btn" title="Video call" aria-label="Start a video call" @click=${()=>this.startCall()}><span class="material-symbols-rounded">videocam</span></button>
          <button class="icon-btn ${this.scenePickerOpen?"on":""}" title="Change where she is" aria-label="Change the background" @click=${x=>{x.stopPropagation(),this.toggleScenePicker()}}><span class="material-symbols-rounded">wallpaper</span></button>`:d}
          <button class="icon-btn ${this.speakOn?"on":""}" title=${this.speakOn?"Stop reading replies aloud":"Read replies aloud"} aria-label="Voice" @click=${()=>this.toggleSpeak()}><span class="material-symbols-rounded">${this.speakOn?"volume_up":"volume_off"}</span></button>
          <button class="icon-btn" title="Hide portrait" aria-label="Hide portrait" @click=${()=>this.stageOpen=!1}><span class="material-symbols-rounded">close</span></button>
        </div>
        ${this.scenePickerOpen&&!this.callOpen?this.renderScenePicker(t):d}
        <div class="stage-glass">
          <div class="stage-who">
            <span class="stage-name">${e.name}</span>
            <span class="stage-status"><span class="status-dot ${$?"online":""}"></span> ${h}</span>
          </div>
          <div class="stage-chips">
            <span class="stage-chip" title="How she feels"><span class="material-symbols-rounded">mood</span>${Ce[s]??s}</span>
            ${t.activity?n`<span class="stage-chip doing" role="status" title=${`She is ${t.activity}`}><span class="material-symbols-rounded">directions_walk</span>${oe(t.activity)}</span>`:d}
            ${m?n`<span class="stage-chip" title="Where she is"><span class="material-symbols-rounded">location_on</span>${m.name}</span>`:d}
          </div>
          ${e.id==="libby"?n`<div class="stage-heat h${o}" title=${`Heat ${o} of 5`}>
            <span>Heat</span><span class="segs">${[1,2,3,4,5].map(x=>n`<i class=${x<=o?"on":""}></i>`)}</span>
          </div>`:d}
        </div>
      </div>
    </aside>`}renderAutopilotBar(e){var s,o,i;if(!this.autopilot)return d;const t=this.autoTurns<=0,a=(s=this.status)!=null&&s.enabled?this.autoPaused?"Autopilot paused.":t?`${e.name} is waiting for you to say something.`:`${e.name} keeps the conversation going · ${this.autoTurns} turn${this.autoTurns===1?"":"s"} left`:"Autopilot is waiting for a model.";return n`<div class="autobar ${this.autoPaused||t||!((o=this.status)!=null&&o.enabled)?"idle":""}" role="status">
      <span class="material-symbols-rounded">${this.autoPaused?"pause_circle":"smart_toy"}</span>
      <span class="autobar-copy">${a}</span>
      ${(i=this.status)!=null&&i.enabled?n`<button class="autobar-btn" @click=${()=>t?this.refillAutopilot():this.pauseAutopilot(!this.autoPaused)}>
        ${t?"Continue":this.autoPaused?"Resume":"Pause"}
      </button>`:d}
      <button class="autobar-btn" @click=${()=>this.toggleAutopilot()}>Turn off</button>
    </div>`}renderSidebar(){var t;const e=this.workspace.profile.displayName||((t=this.user)==null?void 0:t.username)||"You";return n`<aside class="side">
      <div class="side-head">
        <h1>${this.pickerOpen?"New chat":"Chats"}</h1>
        ${this.pickerOpen?n`<button class="icon-btn" title="Back to chats" aria-label="Back to chats" @click=${()=>this.pickerOpen=!1}><span class="material-symbols-rounded">close</span></button>`:n`<button class="icon-btn" title="New chat" aria-label="New chat" @click=${()=>this.pickerOpen=!0}><span class="material-symbols-rounded">edit_square</span></button>
            <button class="me-btn" title="Your profile" aria-label="Your profile" @click=${()=>{this.settingsOpen=!0,this.editorTab="profile",this.mobileNavOpen=!1}}>${this.profileAvatar(e,"me-avatar")}</button>`}
      </div>
      ${this.pickerOpen?this.renderFriends():n`
        <label class="search"><span class="material-symbols-rounded" style="font-size:18px">search</span>
          <input type="search" placeholder="Search" aria-label="Search chats" .value=${this.chatSearch} @input=${a=>this.chatSearch=a.target.value} /></label>
        <div class="chats">${this.renderChatRows()}</div>`}
    </aside>`}renderChatRows(){const e=this.chatSearch.trim().toLowerCase(),t=new Map;for(const s of this.workspace.conversations)t.set(s.characterId,(t.get(s.characterId)??0)+1);const a=[...this.workspace.conversations].map(s=>({conversation:s,character:this.visibleCharacters.find(o=>o.id===s.characterId)})).filter(s=>!!s.character).sort((s,o)=>o.conversation.updatedAt-s.conversation.updatedAt).filter(({conversation:s,character:o})=>!e||o.name.toLowerCase().includes(e)||s.title.toLowerCase().includes(e)||De(this.lastLine(s)).toLowerCase().includes(e));return a.length?a.map(({conversation:s,character:o})=>{var l;const i=[...s.messages].reverse().find(h=>!h.thought),r=(t.get(o.id)??0)>1;return n`<div class="chat-wrap ${s.id===this.conversationID?"on":""}" data-id=${s.id}>
        <button class="chat-row" @click=${()=>this.activateConversation(s.id)} aria-current=${s.id===this.conversationID?"page":"false"}>
          ${this.avatar(o,"chat-avatar")}
          <span class="chat-name">${o.name}${r?n` <small>· ${s.title}</small>`:d}</span>
          <span class="chat-time">${Kt(s.updatedAt)}</span>
          <span class="chat-preview">${i?n`${i.role==="user"?"You: ":""}${i.imageId&&!i.content.trim()?n`<span class="material-symbols-rounded">photo_camera</span>Photo`:De(i.content)}`:n`<em>${(l=o.firstMessage)!=null&&l.trim()?"Say hello":"No messages yet"}</em>`}</span>
        </button>
        <button class="chat-delete" title="Delete chat" aria-label="Delete chat with ${o.name}" @click=${()=>this.deleteConversation(s.id)}><span class="material-symbols-rounded" style="font-size:16px">delete</span></button>
      </div>`}):n`<div class="chats-empty">${e?"No chats match that.":"No chats yet — start one."}</div>`}lastLine(e){var t;return((t=[...e.messages].reverse().find(a=>!a.thought))==null?void 0:t.content)??""}renderFriends(){const e=this.visibleCharacters;return n`<div class="friends"
      @dragover=${t=>{t.preventDefault(),this.cardDrop=!0}}
      @dragleave=${()=>this.cardDrop=!1}
      @drop=${this.dropCard}>
      <div class="pick-cat">Friends</div>
      ${e.map(t=>{var a;return n`
        <div class="pick-wrap">
          <button class="pick" @click=${()=>this.startChatWith(t.id)}>
            ${this.avatar(t,"pick-avatar")}
            <span class="pick-name">${t.name}</span>
            <span class="pick-sub">${((a=t.description)==null?void 0:a.trim())||(t.id==="libby"?"Your library's companion":"Custom character")}</span>
          </button>
          <div class="pick-acts">
            <button class="pick-act" title="Duplicate ${t.name}" aria-label="Duplicate ${t.name}"
              @click=${()=>this.duplicateCharacter(t.id)}><span class="material-symbols-rounded">content_copy</span></button>
            <button class="pick-act" title="Export ${t.name} as a card" aria-label="Export ${t.name} as a card"
              @click=${()=>this.exportCharacter(t.id)}><span class="material-symbols-rounded">download</span></button>
            ${t.builtIn?d:n`<button class="pick-act danger" title="Remove ${t.name}" aria-label="Remove ${t.name}"
              @click=${()=>this.removeCharacter(t.id)}><span class="material-symbols-rounded">delete</span></button>`}
          </div>
        </div>`})}
      <div class="pick-cat">Add someone</div>
      <button class="pick add" @click=${()=>{this.pickerOpen=!1,this.addCharacter()}}>
        <span class="pick-avatar"><span class="material-symbols-rounded">person_add</span></span>
        <span class="pick-name">Write a new card</span>
        <span class="pick-sub">Start from a blank character</span>
      </button>
      <label class="dropzone ${this.cardDrop?"over":""}">
        <input type="file" accept=".json,.png,application/json,image/png" multiple @change=${this.importCard} />
        <span class="material-symbols-rounded">upload_file</span>
        <strong>Import a character card</strong>
        <span>Drop a .png or .json here, or click to choose. SillyTavern V1, V2 and V3 cards all work.</span>
      </label>
      ${this.cardNote?n`<div class="card-note ${this.cardNote.bad?"bad":""}">${this.cardNote.text}</div>`:d}
    </div>`}exportConversation(e){const t=e?this.workspace.conversations.find(m=>m.id===e):this.activeConversation;if(!t)return;const a=this.workspace.characters.find(m=>m.id===t.characterId),s=this.turnLog.get(t.id)??[],o={exportedAt:new Date().toISOString(),app:"oppailib",format:1,conversation:{id:t.id,title:t.title,characterId:t.characterId,mode:t.mode,emotion:t.emotion,intensity:t.intensity,activity:t.activity??"",background:t.background??"",options:t.options??{},updatedAt:t.updatedAt,messages:t.messages},character:a??null,images:this.workspace.images.filter(m=>t.messages.some(f=>f.imageId===m.id)),profile:this.workspace.profile,turns:s,capture:s.length?`${s.length} turn(s) captured with full prompts`:"No turns captured — switch on 'Capture turns' in the chat menu and send a message first"},i=new Blob([JSON.stringify(o,null,2)],{type:"application/json"}),r=URL.createObjectURL(i),l=document.createElement("a"),h=new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);l.href=r,l.download=`oppailib-chat-${((a==null?void 0:a.name)??"chat").replace(/[^\w.-]+/g,"-").toLowerCase()}-${h}.json`,l.click(),setTimeout(()=>URL.revokeObjectURL(r),1e3),this.say(s.length?`Exported ${t.messages.length} messages and ${s.length} captured turn(s).`:`Exported ${t.messages.length} messages. Turn capture was off, so no prompts are included.`)}dropCard(e){var a;e.preventDefault(),this.cardDrop=!1;const t=Array.from(((a=e.dataTransfer)==null?void 0:a.files)??[]);t.length&&this.ingestCards(t)}duplicateCharacter(e){const t=this.workspace.characters.find(s=>s.id===e);if(!t)return;if(this.workspace.characters.length>=40){this.say("That's as many friends as a workspace holds.",!0);return}const a={...t,id:_(),name:`${t.name} (copy)`,builtIn:!1};this.workspace.characters.push(a),this.touchWorkspace(),this.say(`${a.name} added.`)}exportCharacter(e){const t=this.workspace.characters.find(r=>r.id===e);if(!t)return;const a=Et(t),s=new Blob([JSON.stringify(a,null,2)],{type:"application/json"}),o=URL.createObjectURL(s),i=document.createElement("a");i.href=o,i.download=`${t.name.replace(/[^\w.-]+/g,"-").toLowerCase()||"character"}.card.json`,i.click(),setTimeout(()=>URL.revokeObjectURL(o),1e3),this.say(`Exported ${t.name}.`)}removeCharacter(e){var s;const t=this.workspace.characters.find(o=>o.id===e);if(!t||t.builtIn||!confirm(`Remove ${t.name} and every chat with them?`))return;this.workspace.characters=this.workspace.characters.filter(o=>o.id!==e),this.workspace.conversations=this.workspace.conversations.filter(o=>o.characterId!==e),this.characterID===e&&(this.characterID=((s=this.workspace.characters[0])==null?void 0:s.id)??"libby");const a=this.conversationsFor()[0];a?this.conversationID=a.id:this.newConversation(!1),this.touchWorkspace(),this.say(`${t.name} removed.`)}startChatWith(e){this.pickerOpen=!1,this.characterID=e,this.newConversation()}renderSettings(){const e=this.activeCharacter,t=this.activeConversation;if(!e||!t)return d;const a=e.id==="libby"?jt:Bt,s=a.find(i=>i.id===this.editorTab)??a[0];let o="";return n`<section class="settings">
      <nav class="settings-nav" aria-label="Chat settings">
        ${a.map(i=>{const r=i.group===o?d:n`<div class="nav-cat">${i.group}</div>`;return o=i.group,n`${r}
            <button class="nav-row ${i.id===s.id?"on":""}" aria-current=${i.id===s.id?"page":"false"} @click=${()=>this.editorTab=i.id}>
              <span class="material-symbols-rounded">${i.icon}</span>
              <span>${i.id==="character"?e.name:i.label}</span>
            </button>`})}
        <div class="nav-sep"></div>
        <button class="nav-row close" @click=${()=>this.settingsOpen=!1}>
          <span class="material-symbols-rounded">arrow_back</span><span>Back to chat</span>
        </button>
      </nav>
      <div class="settings-body">
        <div class="settings-head">
          <strong>${s.id==="character"?e.name:s.label}<span>Changes sync between WebUI and Android</span></strong>
          <button class="icon-btn" title="Close settings" aria-label="Close settings" @click=${()=>this.settingsOpen=!1}><span class="material-symbols-rounded">close</span></button>
        </div>
        ${s.id==="character"?this.renderCharacterPanel(e):d}
        ${s.id==="world"?this.renderWorldPanel():d}
        ${s.id==="mind"?this.renderMindPanel():d}
        ${s.id==="model"?this.renderModelPanel(t,e):d}
        ${s.id==="images"?this.renderImagesPanel(e):d}
        ${s.id==="profile"?this.renderProfilePanel():d}
      </div>
    </section>`}field(e,t,a,s=1){return n`<label>${e}${s>1?n`<textarea class="field" rows=${s} .value=${a} @change=${o=>this.updateCharacter(t,o.target.value)}></textarea>`:n`<input class="field" .value=${a} @change=${o=>this.updateCharacter(t,o.target.value)} />`}</label>`}renderCharacterPanel(e){const t=e.id==="libby"&&!V();return n`<div class="panel">
      <section class="group">
        <h3>Picture<span>Their face in the chat list, the header, and every message.</span></h3>
        <div class="pfp-row">
          ${this.avatar(e,"pfp")}
          <div class="pfp-actions">
            <strong>${e.name}</strong>
            <span class="empty">${t?"Libby wears her artwork by default. A picture set here replaces it everywhere.":"Kept apart from this character's images — a face is never offered as a photo to send."}</span>
            <div class="panel-actions">
              <span class="file-btn">${e.avatarImageId?"Replace picture":"Upload picture"}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change=${this.uploadCharacterPicture}/></span>
              ${e.avatarImageId?n`<button class="secondary" @click=${()=>void this.removeCharacterPicture()}>Remove</button>`:d}
            </div>
          </div>
        </div>
      </section>
      <div class="grid">${this.field("Name","name",e.name)}${e.id==="libby"?d:n`<label>Default mode<select .value=${e.defaultMode} @change=${a=>this.updateCharacter("defaultMode",a.target.value)}>${R.map(a=>n`<option value=${a.id}>${a.label}</option>`)}</select></label>`}</div>
      ${this.field("Description","description",e.description??"",2)}
      ${this.field("Appearance — written as picture tags. Also how they recognise a photo of themselves.","appearance",e.appearance??"",2)}
      <div class="grid">${this.field("Personality","personality",e.personality??"",3)}${this.field("Scenario","scenario",e.scenario??"",3)}</div>
      ${this.field("Kinks and turn-ons — colours how they flirt; never recited as a list.","kinks",e.kinks??"",3)}
      ${this.field("First message","firstMessage",e.firstMessage??"",2)}
      ${this.field("System prompt / card instructions","systemPrompt",e.systemPrompt??"",3)}
      ${this.field("Example dialogue","exampleDialogue",e.exampleDialogue??"",3)}
      ${this.field("Creator notes (not sent to model)","creatorNotes",e.creatorNotes??"",2)}
      ${t?n`<section class="group">
        <h3>Her life<span>Beyond the card: what she is usually up to, what she reaches for, what you are to each other, how she writes, and where her own line is. All of it reaches her every turn.</span></h3>
        ${this.field("Around the place — what she is usually doing. Her states (reading, gaming, lounging…) draw on this.","routine",e.routine??"",3)}
        ${this.field("Her taste — what she likes on the shelves. Tips the balance when she picks something for you.","tastes",e.tastes??"",3)}
        ${this.field("What you are to each other — partner, flatmate, someone she is still circling.","relationship",e.relationship??"",3)}
        ${this.field("How she writes — length, case, texting habits.","style",e.style??"",3)}
        ${this.field("Her own limits — what she will not do or be talked into. Yours are under Your profile.","limits",e.limits??"",3)}
      </section>`:d}
      <label>Character-card weight <span class="range"><input type="range" min="0.1" max="2" step="0.05" .value=${String(e.promptWeight||1)} @input=${a=>this.updateCharacter("promptWeight",Number(a.target.value))}/><output>${(e.promptWeight||1).toFixed(2)}</output></span></label>
      <div class="panel-actions"><button class="primary" @click=${()=>void this.saveWorkspace()}>Save card</button><span class="file-btn">Import a card<input type="file" accept=".json,.png,application/json,image/png" multiple @change=${this.importCard}/></span><button @click=${()=>this.exportCharacter(e.id)}>Export card</button>${e.builtIn?n`<span class="empty">Libby's built-in card is editable.</span>`:n`<button class="danger" @click=${this.deleteCharacter}>Remove friend</button>`}</div>
    </div>`}async loadModel(){var a,s;const e=this.modelChoice||((a=this.models)==null?void 0:a.models[0]);if(!e||this.modelBusy)return;let t;try{t=this.composeLoadArgs()}catch{this.say("Extra loader arguments and settings must be valid JSON.",!0);return}this.modelBusy=!0,this.say(`Loading ${e}… this can take a few minutes.`);try{await g.loadChatModel(e,t.args,t.settings,!0),await this.refreshModels(!0),this.say(`Loaded ${((s=this.models)==null?void 0:s.loaded)||e}.`)}catch(o){this.say(o.message,!0)}finally{this.modelBusy=!1}}async unloadModel(){if(!(this.modelBusy||!confirm("Unload the current model? Chat stops working until a model is loaded again."))){this.modelBusy=!0,this.say("Unloading…");try{await g.unloadChatModel(),await this.refreshModels(!0),this.say("Model unloaded.")}catch(e){this.say(e.message,!0)}finally{this.modelBusy=!1}}}renderModelControls(){var a,s,o,i,r;const e=((a=this.models)==null?void 0:a.models)??[],t=((s=this.models)==null?void 0:s.loaded)||((o=this.status)==null?void 0:o.model)||"";return n`<label>Text-generation backend
      <div class="model-row">
        <strong>${t||"No model loaded"}${(i=this.status)!=null&&i.contextLimit?` · ${this.status.contextLimit.toLocaleString()} token context`:""}</strong>
        <button class="secondary" ?disabled=${this.modelBusy} @click=${()=>void this.refreshModels()}>Refresh</button>
      </div>
    </label>
    ${((r=this.models)==null?void 0:r.supported)===!1?n`<div class="empty">This backend serves an OpenAI-compatible API but does not expose model load/unload. Manage the model where it runs.</div>`:n`
        <label>Model
          <select class="field" ?disabled=${this.modelBusy||!e.length}
            .value=${this.modelChoice||t}
            @change=${l=>{this.modelChoice=l.target.value,this.seedLoadArgs(this.modelChoice)}}>
            ${e.length?d:n`<option value="">No models found</option>`}
            ${e.map(l=>n`<option value=${l} ?selected=${l===(this.modelChoice||t)}>${l}</option>`)}
          </select>
        </label>
        ${this.renderLoaderForm()}
        <div class="panel-actions">
          <button class="primary" ?disabled=${this.modelBusy||!e.length} @click=${()=>void this.loadModel()}>
            ${this.modelBusy?"Working…":"Load model"}
          </button>
          <button class="danger" ?disabled=${this.modelBusy||!t} @click=${()=>void this.unloadModel()}>Unload</button>
          ${this.canManageModels?n`<button class="secondary" ?disabled=${this.modelBusy||!e.length}
                title="See what deleting the selected model would remove"
                @click=${()=>void this.inspectModel()}>Delete…</button>`:d}
        </div>
        ${this.modelBusy?n`<div class="empty">Loading a large model can take several minutes. Leaving this page will not cancel it.</div>`:d}
        ${this.deleteTarget?this.renderDeleteModel(this.deleteTarget):d}
        ${this.deleteError?n`<div class="empty error">${this.deleteError}</div>`:d}
        ${this.renderLoras()}`}`}renderLoaderForm(){var a;if(!((a=this.backend)!=null&&a.supported))return d;const e=String(this.loadArgs.loader??""),t=de.filter(s=>!s.loaders||!e||s.loaders.includes(e));return n`<details class="loader" open>
      <summary>Loader settings<span class="hint">${Object.keys(this.loadArgs).length||this.loadExtra.trim()?"set":"backend defaults"}</span></summary>
      <div class="grid loader-grid">
        <label>Loader<select class="field" .value=${e} ?disabled=${this.modelBusy}
          @change=${s=>this.setLoadArg(Xt,s.target.value)}>
          <option value="">Backend decides</option>
          ${(this.backend.loaders??[]).map(s=>n`<option value=${s} ?selected=${s===e}>${s}</option>`)}
        </select></label>
        ${t.map(s=>s.kind==="check"?n`<label class="inline-check loader-check"><input type="checkbox" .checked=${!!this.loadArgs[s.keys[0]]} ?disabled=${this.modelBusy}
              @change=${o=>this.setLoadArg(s,o.target.checked)}/>${s.label}${s.hint?n`<span class="hint">${s.hint}</span>`:d}</label>`:s.kind==="select"?n`<label>${s.label}<select class="field" .value=${String(this.loadArgs[s.keys[0]]??"")} ?disabled=${this.modelBusy}
              @change=${o=>this.setLoadArg(s,o.target.value)}>
              <option value="">Default</option>${(s.options??[]).map(o=>n`<option value=${o} ?selected=${o===String(this.loadArgs[s.keys[0]]??"")}>${o}</option>`)}
            </select></label>`:n`<label>${s.label}${s.hint?n`<span class="hint">${s.hint}</span>`:d}<input class="field" type=${s.kind==="number"?"number":"text"} placeholder=${s.placeholder??"default"}
              .value=${String(this.loadArgs[s.keys[0]]??"")} ?disabled=${this.modelBusy}
              @change=${o=>this.setLoadArg(s,o.target.value)}/></label>`)}
      </div>
      <details>
        <summary>More arguments and generation defaults</summary>
        <label>Extra loader arguments (JSON) — anything text-generation-webui's <code>--help</code> lists, by its argument name
          <textarea class="field" rows="3" placeholder='{"rope_freq_base": 1000000, "numa": true}' .value=${this.loadExtra} ?disabled=${this.modelBusy}
            @change=${s=>this.loadExtra=s.target.value}></textarea></label>
        <label>Generation defaults applied at load (JSON) — <code>truncation_length</code>, <code>instruction_template</code>, <code>custom_stopping_strings</code>…
          <textarea class="field" rows="3" placeholder='{"instruction_template": "ChatML"}' .value=${this.loadSettings} ?disabled=${this.modelBusy}
            @change=${s=>this.loadSettings=s.target.value}></textarea></label>
      </details>
      <div class="empty">Names that moved between releases (<code>n_ctx</code>/<code>ctx_size</code>, <code>n_gpu_layers</code>/<code>gpu_layers</code>) are sent both ways; the backend keeps the one it knows. Settings are remembered per model once a load succeeds.</div>
    </details>`}renderLoras(){var o;if(!((o=this.backend)!=null&&o.supported))return d;if(this.backend.lorasError)return n`<div class="empty">LoRAs: ${this.backend.lorasError}</div>`;const e=this.backend.loras;if(!e||!e.available.length)return d;const t=new Set(e.loaded),a=new Set(this.loraPicks),s=e.available.some(i=>t.has(i)!==a.has(i));return n`<label>LoRAs<span class="hint">${e.loaded.length?`${e.loaded.length} applied`:"none applied"}</span>
      <div class="lora-list">${e.available.map(i=>n`<label class="inline-check"><input type="checkbox" .checked=${a.has(i)} ?disabled=${this.modelBusy}
        @change=${r=>{const l=r.target.checked;this.loraPicks=l?[...new Set([...this.loraPicks,i])]:this.loraPicks.filter(h=>h!==i)}}/>${i}${t.has(i)?n`<span class="hint">applied</span>`:d}</label>`)}</div>
    </label>
    <div class="panel-actions">
      <button class="secondary" ?disabled=${this.modelBusy||!s} @click=${()=>void this.applyLoras()}>${this.loraPicks.length?"Apply LoRAs":"Clear LoRAs"}</button>
    </div>`}renderDeleteModel(e){const t=this.deleteConfirm.trim()===e.name;return n`
      <div class="model-delete">
        <strong>Delete ${e.name}?</strong>
        ${e.loaded?n`<div class="empty error">
              This model is loaded right now. Unload it first — deleting the weights under
              a running model leaves the backend serving something whose files are gone.
            </div>`:d}
        <div class="model-delete-facts">
          <div><span>Path</span><code>${e.path}</code></div>
          <div><span>Frees</span>${J(e.bytes)}${e.freeBytes?` · ${J(e.freeBytes)} free now`:""}</div>
          <div><span>Files</span>${e.files.length}${e.split?" · a split model, every shard goes together":""}</div>
        </div>
        <details>
          <summary>Show the ${e.files.length} file${e.files.length===1?"":"s"}</summary>
          <ul class="model-delete-files">${e.files.map(a=>n`<li>${a}</li>`)}</ul>
        </details>
        <label>Type <code>${e.name}</code> to confirm
          <input class="field" .value=${this.deleteConfirm} ?disabled=${this.modelBusy}
            @input=${a=>this.deleteConfirm=a.target.value} />
        </label>
        <label class="inline-check">
          <input type="checkbox" .checked=${this.deletePermanent}
            @change=${a=>this.deletePermanent=a.target.checked} />
          Delete permanently instead of moving it to
          <code>${e.trashPath}</code>
        </label>
        <div class="panel-actions">
          <button class="secondary" @click=${this.cancelDeleteModel}>Cancel</button>
          <button class="danger" ?disabled=${!t||e.loaded||this.modelBusy}
            @click=${()=>void this.confirmDeleteModel()}>
            ${this.modelBusy?"Deleting…":this.deletePermanent?"Delete permanently":"Move to trash"}
          </button>
        </div>
      </div>
    `}async inspectModel(){var t;const e=this.modelChoice||((t=this.models)==null?void 0:t.models[0]);if(e){this.deleteError="",this.deleteConfirm="",this.deletePermanent=!1;try{this.deleteTarget=await g.inspectChatModel(e)}catch(a){this.deleteError=a.message}}}async confirmDeleteModel(){const e=this.deleteTarget;if(!(!e||this.modelBusy)){this.modelBusy=!0,this.deleteError="";try{const t=await g.deleteChatModel(e.name,this.deleteConfirm.trim(),this.deletePermanent);this.models&&(this.models={...this.models,models:t.models}),this.modelChoice="",this.deleteTarget=null,this.deleteConfirm="",this.say(t.movedTo?`${t.name} moved to the trash — ${J(t.bytes)} recoverable at ${t.movedTo}.`:`${t.name} deleted permanently — ${J(t.bytes)} freed.`)}catch(t){this.deleteError=t.message}finally{this.modelBusy=!1}}}async copySampling(){var t;const e=(t=this.lastSampling)==null?void 0:t.summary;if(e)try{await navigator.clipboard.writeText(e),this.say("Generation settings copied.")}catch{this.say(e,!0)}}saveOptionsGlobally(e){this.workspace.defaults={...e.options??le()},this.touchWorkspace(),this.saveWorkspace(),this.say("Saved as the default for new conversations.")}renderModelPanel(e,t){var i,r,l,h,m,f,b,$;const a=(y,k)=>{var x;return Ne((x=this.lastSampling)==null?void 0:x.values,y,k)},s=(y,k,x,T,v,S)=>{var E;const O=Ne(e.options,k,a(k,S)),U=((E=e.options)==null?void 0:E[k])!=null;return n`<label>${y}${U?d:n`<span class="hint">auto</span>`}<span class="range"><input type="range" min=${x} max=${T} step=${v} .value=${String(O)} @input=${q=>this.updateOption(k,Number(q.target.value))}/><output>${O}</output></span></label>`},o=!!this.workspace.defaults;return n`<div class="panel">
      <section class="group">
        <h3>Backend</h3>
        ${this.renderModelControls()}
      </section>

      <section class="group">
        <h3>Generation<span>Tuned automatically for each kind of turn. Anything you set here overrides that for this conversation.</span></h3>
        <div class="grid">
          ${s("Temperature","temperature",0,2,.05,.85)}${s("Top P","top_p",.05,1,.05,.92)}
          ${s("Repetition penalty","repetition_penalty",1,2,.05,1.1)}${s("Max reply tokens","max_tokens",64,1536,32,512)}
          ${s("Min P","min_p",0,.5,.01,.05)}${s("Top K","top_k",0,200,1,40)}
        </div>
        ${(i=this.status)!=null&&i.modelManagement?n`<details class="samplers">
          <summary>All text-generation-webui samplers<span class="hint">${Object.keys(e.options??{}).length?`${Object.keys(e.options??{}).length} set`:"auto"}</span></summary>
          <div class="grid">
            ${s("Typical P","typical_p",0,1,.05,1)}${s("Repetition range","repetition_penalty_range",0,4096,128,1024)}
            ${s("Presence penalty","presence_penalty",-2,2,.05,0)}${s("Frequency penalty","frequency_penalty",-2,2,.05,0)}
            ${s("Smoothing factor","smoothing_factor",0,5,.05,0)}${s("No-repeat n-gram","no_repeat_ngram_size",0,20,1,0)}
            ${s("DRY multiplier","dry_multiplier",0,5,.05,0)}${s("DRY base","dry_base",1,4,.05,1.75)}${s("DRY allowed length","dry_allowed_length",1,20,1,2)}
            ${s("XTC threshold","xtc_threshold",0,.5,.01,.1)}${s("XTC probability","xtc_probability",0,1,.05,0)}
            ${s("Mirostat mode","mirostat_mode",0,2,1,0)}${s("Mirostat tau","mirostat_tau",0,10,.1,5)}${s("Mirostat eta","mirostat_eta",0,1,.01,.1)}
            ${s("Dynatemp low","dynatemp_low",0,2,.05,1)}${s("Dynatemp high","dynatemp_high",0,2,.05,1)}${s("Dynatemp exponent","dynatemp_exponent",0,5,.05,1)}
            ${s("Seed (-1 random)","seed",-1,99999,1,-1)}
          </div>
          <div class="grid">
            ${["dynamic_temperature","temperature_last","do_sample","ban_eos_token","add_bos_token","skip_special_tokens","auto_max_new_tokens"].map(y=>{var k,x,T;return n`<label class="inline-check">
              <input type="checkbox" .checked=${((k=e.options)==null?void 0:k[y])===!0} .indeterminate=${((x=e.options)==null?void 0:x[y])==null}
                @change=${v=>this.updateOptionValue(y,v.target.checked)}/>${y.replace(/_/g," ")}${((T=e.options)==null?void 0:T[y])==null?n`<span class="hint">auto</span>`:d}</label>`})}
          </div>
          <label>Grammar (GBNF)<textarea class="field" rows="2" .value=${String(((r=e.options)==null?void 0:r.grammar_string)??"")} @change=${y=>this.updateOptionValue("grammar_string",y.target.value||void 0)}></textarea></label>
          <label>Custom stop strings (one per line)<textarea class="field" rows="2" .value=${Array.isArray((l=e.options)==null?void 0:l.stop)?e.options.stop.join(`
`):""} @change=${y=>{const k=y.target.value.split(`
`).map(x=>x.trim()).filter(Boolean);this.updateOptionValue("stop",k.length?k:void 0)}}></textarea></label>
          <div class="panel-actions">
            <button class="secondary" ?disabled=${!((h=this.status)!=null&&h.enabled)} @click=${()=>void this.stopGeneration()}>Stop generating now</button>
            <button class="secondary" @click=${()=>void this.measureCard(t)}>Measure the card</button>
            ${this.cardTokens?n`<span class="empty">Card: ${this.cardTokens.tokens.toLocaleString()} tokens${this.cardTokens.exact?"":" (estimated)"}${(m=this.status)!=null&&m.contextLimit?` of ${this.status.contextLimit.toLocaleString()}`:""}</span>`:d}
          </div>
        </details>`:d}
        ${this.lastSampling?n`<div class="sampling">
          <span>Last reply sampled as <strong>${this.lastSampling.task}</strong>${(f=this.lastSampling.overridden)!=null&&f.length?n` — you overrode ${this.lastSampling.overridden.join(", ")}`:d}</span>
          <button class="secondary" @click=${()=>void this.copySampling()}>Copy settings</button>
        </div>`:d}
        ${(b=this.lastPhoto)!=null&&b.source?n`<div class="sampling">
          <span>Last picture chosen <strong>${Zt(this.lastPhoto.source)}</strong> — fit ${this.lastPhoto.fit} of ${this.lastPhoto.candidates} candidate${this.lastPhoto.candidates===1?"":"s"}${($=this.lastPhoto.tags)!=null&&$.length?n`; it shows ${this.lastPhoto.tags.slice(0,6).join(", ")}`:d}</span>
        </div>`:d}
        <details>
          <summary>Advanced API options</summary>
          <textarea class="field" rows="5" .value=${JSON.stringify(e.options??{},null,2)} @change=${y=>{try{const k=JSON.parse(y.target.value);this.updateConversation({options:k})}catch{this.say("Advanced options must be valid JSON.",!0)}}}></textarea>
        </details>
        <div class="panel-actions">
          <button class="primary" @click=${()=>void this.saveWorkspace()}>Save for this chat</button>
          <button class="secondary" @click=${()=>this.saveOptionsGlobally(e)}>Save as global default</button>
          <button class="secondary" @click=${()=>{e.options={...this.workspace.defaults??le()},this.touchWorkspace()}}>Reset${o?" to global":""}</button>
        </div>
      </section>

      ${t.id==="libby"?n`<section class="group">
        <h3>Her mood<span>Libby chooses her own tone, emotion, and intensity from the conversation. There is no user preset.</span></h3>
      </section>`:n`<section class="group">
        <h3>This conversation<span>Mood and pacing for the current chat only.</span></h3>
        <div class="grid">
          <label>Conversation mode<select .value=${e.mode} @change=${y=>this.updateConversation({mode:y.target.value})}>${R.map(y=>n`<option value=${y.id}>${y.label}</option>`)}</select></label>
          <label>Displayed emotion<select .value=${e.emotion} @change=${y=>this.updateConversation({emotion:y.target.value})}>${pt.map(y=>n`<option value=${y}>${Ce[y]}</option>`)}</select></label>
        </div>
        <label>Intensity <span class="range"><input type="range" min="1" max="5" step="1" .value=${String(e.intensity)} @input=${y=>this.updateConversation({intensity:Number(y.target.value)})}/><output>${e.intensity}/5</output></span></label>
      </section>`}
    </div>`}renderImagesPanel(e){const t=this.workspace.images.filter(o=>o.characterId===e.id),a=t.filter(o=>o.subject!=="other"),s=t.filter(o=>o.subject==="other");return n`<div class="panel">
      <p class="empty">Images are scanned locally. ${e.name} may attach one when its tags match the current exchange. Your own profile picture is set under Profile and is kept separate from these.</p>
      <div class="upload-row">
        <label>Extra matching tags<input class="field" placeholder="beach, happy, bedroom" .value=${this.imageTags} @input=${o=>this.imageTags=o.target.value}/></label>
        <label>Who it shows<select class="field" aria-label="Who the uploaded picture shows" .value=${this.imageSubject} @change=${o=>this.imageSubject=o.target.value}>
          <option value="self" ?selected=${this.imageSubject==="self"}>${e.name}</option>
          <option value="other" ?selected=${this.imageSubject==="other"}>Someone or something else</option>
          <option value="" ?selected=${this.imageSubject===""}>Let the scanner decide</option>
        </select></label>
        <span class="file-btn">Upload and scan<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change=${this.uploadImage}/></span>
      </div>
      <h3 class="shelf">Pictures of ${e.name}<span>What she can send as a selfie.</span></h3>
      <div class="image-grid">${a.map(o=>this.renderImageCard(e,o))}</div>
      ${a.length?d:n`<div class="empty">No pictures of ${e.name} yet.</div>`}
      ${s.length?n`
        <h3 class="shelf">Someone or something else<span>Photos shared with her. She remembers these but never sends them as herself. Wrong shelf? Tap “That's her”.</span></h3>
        <div class="image-grid">${s.map(o=>this.renderImageCard(e,o))}</div>`:d}
      ${e.id==="libby"?this.renderWeightsPanel(a):d}
    </div>`}renderImageCard(e,t){const a=t.subject!=="other";return n`<article class="image-card">
      <img src=${g.chatImageURL(t.id)} alt=${t.name}/>
      <button class="remove" title="Delete ${t.name}" aria-label="Delete ${t.name}" @click=${()=>void this.deleteImage(t)}>×</button>
      <div class="card-body">
        <span class="card-name">${t.name}</span>
        <span class="card-tags">${t.tags.join(", ")||"No tags"}</span>
        ${a?n`<label class="weight">Sends<select aria-label=${`How often to send ${t.name}`} .value=${String(t.weight||1)} @change=${s=>this.setImageWeight(t,Number(s.target.value))}>
          ${ce.map(s=>n`<option value=${String(s.value)} ?selected=${(t.weight||1)===s.value}>${s.label}</option>`)}
        </select></label>`:d}
        <button title=${a?`Move ${t.name} to the other shelf: not a picture of ${e.name}`:`Move ${t.name} to her shelf: this is ${e.name}`}
          @click=${()=>this.setImageSubject(t,a?"other":"self")}>${a?"Not her":"That's her"}</button>
        ${a?e.avatarImageId===t.id?n`<span class="badge">Avatar</span>`:n`<button @click=${()=>this.updateCharacter("avatarImageId",t.id)}>Use as avatar</button>`:d}
      </div>
    </article>`}setImageSubject(e,t){const a=this.workspace.images.find(s=>s.id===e.id);a&&(a.subject=t,this.touchWorkspace())}setImageWeight(e,t){const a=this.workspace.images.find(s=>s.id===e.id);a&&(t===1?delete a.weight:a.weight=t,this.touchWorkspace())}renderWeightsPanel(e){const t=this.workspace.sendWeights??{},a=Object.keys(t).sort(),s=new Map;for(const i of e)for(const r of i.tags)s.set(r.toLowerCase(),(s.get(r.toLowerCase())??0)+1);const o=[...s.entries()].filter(([i])=>!(i in t)).sort((i,r)=>r[1]-i[1]).slice(0,14).map(([i])=>i);return n`<section class="group weights">
      <h3>What she reaches for<span>Weight a tag and it applies to every picture and library item carrying it — more of this, less of that, none of the other. It steers her choice; it never overrides what you actually asked for.</span></h3>
      ${a.length?n`<div class="weight-rows">${a.map(i=>n`<div class="weight-row">
        <span class="weight-tag">${i}</span>
        <select aria-label=${`Weight for ${i}`} @change=${r=>this.setTagWeight(i,Number(r.target.value))}>
          ${ce.map(r=>n`<option value=${String(r.value)} ?selected=${Gt(t[i])===r.value}>${r.label}</option>`)}
        </select>
        <button type="button" class="icon-btn" title=${`Forget the weight for ${i}`} aria-label=${`Forget the weight for ${i}`} @click=${()=>this.setTagWeight(i,1)}><span class="material-symbols-rounded" style="font-size:18px">close</span></button>
      </div>`)}</div>`:n`<div class="empty">No tag weights yet. Everything is at normal odds.</div>`}
      <form class="weight-add" @submit=${i=>{i.preventDefault(),this.addTagWeight(this.weightTagDraft,2.5)}}>
        <input class="field" placeholder="tag, e.g. lingerie" .value=${this.weightTagDraft} @input=${i=>this.weightTagDraft=i.target.value}/>
        <button type="button" class="secondary" ?disabled=${!this.weightTagDraft.trim()} @click=${()=>this.addTagWeight(this.weightTagDraft,2.5)}>More</button>
        <button type="button" class="secondary" ?disabled=${!this.weightTagDraft.trim()} @click=${()=>this.addTagWeight(this.weightTagDraft,.35)}>Less</button>
        <button type="button" class="secondary" ?disabled=${!this.weightTagDraft.trim()} @click=${()=>this.addTagWeight(this.weightTagDraft,-1)}>Never</button>
      </form>
      ${o.length?n`<div class="weight-suggest">${o.map(i=>n`<button type="button" class="chip" title=${`Weight ${i}`} @click=${()=>{this.weightTagDraft=i}}>${i}</button>`)}</div>`:d}
    </section>`}addTagWeight(e,t){const a=e.trim().toLowerCase().replace(/\s+/g," ");a&&(this.setTagWeight(a,t),this.weightTagDraft="")}setTagWeight(e,t){const a={...this.workspace.sendWeights??{}};t===1?delete a[e]:a[e]=t,this.workspace.sendWeights=Object.keys(a).length?a:void 0,this.touchWorkspace()}renderProfilePanel(){var a;const e=this.workspace.profile,t=e.displayName||((a=this.user)==null?void 0:a.username)||"You";return n`<div class="panel"><p class="empty">This profile is shared by WebUI and APK and is included in character context.</p>
      <div class="pfp-row">
        <span class="pfp">${e.avatarImageId?n`<img src=${g.chatImageURL(e.avatarImageId)} alt="Your profile picture"/>`:n`<span class="pfp-initial">${t.slice(0,2).toUpperCase()}</span>`}</span>
        <div class="pfp-actions">
          <strong>Profile picture</strong>
          <span class="empty">Yours alone — it is never offered as a character image or attached to a reply.</span>
          <div class="panel-actions">
            <span class="file-btn">${e.avatarImageId?"Replace picture":"Upload picture"}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change=${this.uploadProfilePicture}/></span>
            ${e.avatarImageId?n`<button class="danger" @click=${()=>void this.removeProfilePicture()}>Remove</button>`:d}
          </div>
        </div>
      </div>
      <label>Display name<input class="field" .value=${e.displayName}
        @change=${s=>this.editProfile({displayName:s.target.value})}/></label>
      <label>Pronouns or how to address you <span class="empty">— optional; left blank, nothing is assumed</span>
        <input class="field" placeholder="she/her · “sir” · just my name" .value=${e.address??""}
          @change=${s=>this.editProfile({address:s.target.value})}/></label>
      <label>Your persona<textarea class="field" rows="4" placeholder="How friends should know and address you…" .value=${e.persona}
        @change=${s=>this.editProfile({persona:s.target.value})}></textarea></label>

      <label>Content boundaries <span class="empty">— treated as hard rules, above any character card</span>
        <textarea class="field" rows="3" placeholder="Nothing involving… · don't bring up…" .value=${e.boundaries??""}
          @change=${s=>this.editProfile({boundaries:s.target.value})}></textarea></label>
      <label>How you like to be talked to
        <textarea class="field" rows="2" placeholder="Short replies · don't ask lots of questions · take the lead" .value=${e.communication??""}
          @change=${s=>this.editProfile({communication:s.target.value})}></textarea></label>
      <div class="grid">
        <label>Interests
          <textarea class="field" rows="3" placeholder="Horror films, mechanical keyboards, cooking…" .value=${e.interests??""}
            @change=${s=>this.editProfile({interests:s.target.value})}></textarea></label>
        <label>Preferences
          <textarea class="field" rows="3" placeholder="Subs over dubs, physical media, no spoilers…" .value=${e.preferences??""}
            @change=${s=>this.editProfile({preferences:s.target.value})}></textarea></label>
      </div>

      <label class="inline-check">
        <input type="checkbox" .checked=${e.memoryConsent!==!1}
          @change=${s=>this.editProfile({memoryConsent:s.target.checked})}/>
        <span>
          Libby may remember things about me
          <span class="empty">
            — off, she stops keeping notes entirely and isn't asked to. What she already
            remembers stays until you clear it below.
          </span>
        </span>
      </label>

      <div class="panel-actions"><button class="primary" @click=${()=>void this.saveWorkspace()}>Save profile</button></div>
      <p class="empty">
        Everything above is what <strong>you</strong> said. What Libby worked out on her
        own — what she remembers and wants, where you stand — is kept separately under
        <button class="link-btn" @click=${()=>{this.editorTab="mind",this.characterID!=="libby"&&this.activateCharacter("libby")}}>Her mind</button>,
        labelled as hers. You can correct or delete any of it, and nothing there ever changes this.
      </p></div>`}renderMindPanel(){return n`<div class="panel">
      <p class="empty">What Libby has worked out for herself, across every conversation. All of it is hers — you can correct or delete any of it, and none of it changes what you wrote under Your profile.</p>
      ${this.renderBondPanel()}
      ${this.renderMemoryPanel()}
      ${this.renderWantsPanel()}
      ${this.renderIdentityPanel()}
      ${this.renderAutoPanel()}
      ${this.renderDiscordPanel()}</div>`}async loadOutfits(){if(!this.outfitsLoading){this.outfitsLoading=!0;try{const e=await g.libbyOutfits();this.outfits=e.outfits??[],this.activities=e.activities??[]}catch{this.outfits=[]}finally{this.outfitsLoading=!1}}}wearOutfit(e){ht(e),this.requestUpdate()}openSection(e){this.dispatchEvent(new CustomEvent("open-section",{detail:{section:e},bubbles:!0,composed:!0}))}renderWorldPanel(){var r;this.outfits===null&&!this.outfitsLoading&&this.loadOutfits();const e=X(),t=(r=this.outfits)==null?void 0:r.find(l=>l.id===e),a=this.activities.filter(l=>l.group==="idle"),s=this.activities.filter(l=>l.group!=="idle"),o=l=>{var h,m;return!t||!!((m=(h=t.activityLevels)==null?void 0:h[l.id])!=null&&m.length)},i=l=>n`<span class="state-chip ${o(l)?"":"default-art"}" title=${`${l.says}${l.minIntensity>1?` — from heat ${l.minIntensity}`:""}${o(l)?"":" · default art in this outfit"}`}>
      ${l.label}${l.minIntensity>1?n`<i>${l.minIntensity}</i>`:d}</span>`;return n`<div class="panel">
      <section class="group">
        <h3>What she wears<span>The outfit she is drawn in on this device — the stage, the banner and the call. Draw new ones in the studio; the default wardrobe covers every mood and state.</span></h3>
        <div class="grid">
          <label>Outfit
            <select .value=${e} @change=${l=>this.wearOutfit(l.target.value)}>
              <option value="" ?selected=${!e}>Default wardrobe</option>
              ${(this.outfits??[]).map(l=>n`<option value=${l.id} ?selected=${l.id===e}>${l.name}${l.slots?` · ${l.slots} squares`:""}</option>`)}
            </select></label>
          <div class="panel-actions" style="align-self:end">
            <button class="secondary" @click=${()=>this.openSection("studio")}><span class="material-symbols-rounded" style="font-size:16px;vertical-align:-3px">checkroom</span> Open the outfit studio</button>
          </div>
        </div>
        ${this.outfits===null?n`<p class="empty">Loading her wardrobes…</p>`:d}
      </section>
      <section class="group">
        <h3>Where she is<span>The rooms behind her. She moves between them herself as the conversation goes; the one marked default is where a conversation starts.</span></h3>
        <oppai-libby-backgrounds embedded @changed=${()=>void this.loadBackgrounds()}></oppai-libby-backgrounds>
      </section>
      <section class="group">
        <h3>What she can be doing<span>Her states — what she is doing, as opposed to what she is feeling. She chooses them herself and stays in one until she changes it; a number is the heat she needs before she will. Typing is shown by the app while a reply is on its way.</span></h3>
        ${this.activities.length?n`
          <div class="state-row">${a.filter(l=>!l.auto).map(i)}</div>
          <div class="state-row intimate">${s.map(i)}</div>
          ${t&&s.concat(a).some(l=>!o(l))?n`<p class="empty">Greyed states have no picture in ${t.name} yet, so she wears the default art for them. Draw them in the studio.</p>`:d}`:n`<p class="empty">${this.outfits===null?"Loading…":"This server has no state vocabulary yet."}</p>`}
      </section>
      <section class="group">
        <h3>How she sounds<span>Her voice — which engine reads her lines, in what voice, how fast — is under Settings › Libby, beside hiding her and how quickly she warms up.</span></h3>
        <div class="panel-actions"><button class="secondary" @click=${()=>this.openSection("settings")}><span class="material-symbols-rounded" style="font-size:16px;vertical-align:-3px">record_voice_over</span> Open Libby's settings</button></div>
      </section>
    </div>`}editProfile(e){this.workspace={...this.workspace,profile:{...this.workspace.profile,...e}},this.touchWorkspace()}async loadAutoState(){if(!this.autoStateLoading){this.autoStateLoading=!0;try{this.autoState=await g.libbyAuto()}catch{this.autoState=void 0}finally{this.autoStateLoading=!1}}}async saveAutoSettings(e){var a;const t=(a=this.autoState)==null?void 0:a.settings;if(t)try{await g.saveLibbyAuto({...t,...e}),await this.loadAutoState()}catch(s){this.say(s instanceof Error?s.message:"Couldn't save that.",!0)}}renderAutoPanel(){this.autoState===null&&this.loadAutoState();const e=this.autoState;if(!e)return n`<div class="mem-panel"><strong>When Libby messages first</strong>
        <p class="empty">${this.autoState===null?"Loading…":"This server doesn't support messaging controls yet."}</p></div>`;const t=e.settings,a=Array.from({length:24},(s,o)=>o);return n`<div class="mem-panel">
      <strong>When Libby messages first</strong>
      <p class="empty">She'll start a conversation on her own now and then. These are the limits on that: she stops after ${Vt} unanswered messages, waits out your quiet hours, and never replies to herself.</p>
      <label class="mem-toggle">
        <input type="checkbox" .checked=${t.enabled} @change=${s=>void this.saveAutoSettings({enabled:s.target.checked})}/>
        <span>Let her message me first</span>
      </label>
      ${t.enabled?n`
        <div class="grid">
          <label>Quiet from
            <select class="field" .value=${String(t.quietFrom)} @change=${s=>void this.saveAutoSettings({quietFrom:Number(s.target.value)})}>
              ${a.map(s=>n`<option value=${s} ?selected=${s===t.quietFrom}>${String(s).padStart(2,"0")}:00</option>`)}
            </select>
          </label>
          <label>Quiet until
            <select class="field" .value=${String(t.quietTo)} @change=${s=>void this.saveAutoSettings({quietTo:Number(s.target.value)})}>
              ${a.map(s=>n`<option value=${s} ?selected=${s===t.quietTo}>${String(s).padStart(2,"0")}:00</option>`)}
            </select>
          </label>
          <label>At least this far apart
            <select class="field" .value=${String(t.minGapMinutes)} @change=${s=>void this.saveAutoSettings({minGapMinutes:Number(s.target.value)})}>
              ${[20,30,60,120,240,480].map(s=>n`<option value=${s} ?selected=${s===t.minGapMinutes}>${s<60?`${s} minutes`:`${s/60} hour${s===60?"":"s"}`}</option>`)}
            </select>
          </label>
          <label>Most per day
            <select class="field" .value=${String(t.maxPerDay)} @change=${s=>void this.saveAutoSettings({maxPerDay:Number(s.target.value)})}>
              ${[0,2,4,6,10,20].map(s=>n`<option value=${s} ?selected=${s===t.maxPerDay}>${s===0?"No limit":s}</option>`)}
            </select>
          </label>
        </div>
        <label class="mem-toggle">
          <input type="checkbox" .checked=${t.allowImportant} @change=${s=>void this.saveAutoSettings({allowImportant:s.target.checked})}/>
          <span>Let something genuinely worth saying through anyway</span>
        </label>
        <p class="empty"><strong>Right now:</strong> ${e.idle.reason}</p>
      `:d}
      ${e.log.length?n`
        <details>
          <summary>Why she messaged (${e.log.length})</summary>
          <ul class="mem-list">${[...e.log].reverse().map(s=>n`
            <li><span>
              ${s.detail||s.trigger}
              <span class="mem-tags">
                <em class="mem-kind">${s.trigger}</em>
                ${s.importance>=2?n`<em class="mem-kind mine">important</em>`:d}
                ${s.answered?d:n`<em class="mem-kind unsure">no reply</em>`}
              </span>
            </span><span class="empty">${Pe(s.at)}</span></li>`)}</ul>
        </details>`:d}
    </div>`}renderBondPanel(){this.bond===null&&!this.bondLoading&&this.loadBond();const e=this.bond,t=!!e&&e.lastSeenAt>0;return n`<div class="mem-panel">
      <strong>Where you stand with Libby</strong>
      <p class="empty">Libby carries a sense of the two of you between chats — how long it's been, the mood she left off in, and how close you've grown. Reset it to start fresh; your memories and her wants are kept.</p>
      ${this.bond===null&&this.bondLoading?n`<p class="empty">Loading…</p>`:t?n`<ul class="mem-list">
              <li><span>Last talked ${Pe(e.lastSeenAt)}</span></li>
              ${e.mood?n`<li><span>She left off feeling ${e.mood}</span></li>`:d}
              <li><span>${Ot(e.warmth)}</span></li>
              ${e.petname?n`<li><span>She calls you “${e.petname}”</span></li>`:d}
            </ul>`:n`<p class="empty">Nothing yet. This fills in as you talk.</p>`}
      ${t?n`<div class="panel-actions"><button class="danger" @click=${()=>void this.resetBond()}>Start fresh</button></div>`:d}
    </div>`}renderMemoryPanel(){this.memories===null&&this.loadMemories();const e=this.memories??[];return n`<div class="mem-panel">
      <strong>What Libby remembers</strong>
      <p class="empty">Libby quietly keeps things you tell her and carries them into later chats. Correct anything she got wrong, pin what she must never forget, or add something she hasn't picked up on.${this.memoryLimit?n` She holds up to ${this.memoryLimit}; past that the least important fade, but pinned notes and boundaries never do.`:d}</p>
      ${this.memories===null?n`<p class="empty">Loading…</p>`:e.length===0?n`<p class="empty">Nothing yet. She'll start remembering as you talk.</p>`:n`<ul class="mem-list">${e.map(t=>this.renderMemory(t))}</ul>`}
      <div class="mem-add">
        <input class="field" placeholder="Tell her something to remember…" .value=${this.memoryDraft}
          @input=${t=>this.memoryDraft=t.target.value}
          @keydown=${t=>{t.key==="Enter"&&(t.preventDefault(),this.addMemory())}}/>
        <button class="secondary" ?disabled=${this.memoryDraft.trim().length<8} @click=${()=>void this.addMemory()}>Remember</button>
      </div>
      ${e.length>0?n`<div class="panel-actions"><button class="danger" @click=${()=>void this.clearMemories()}>Clear all memories</button></div>`:d}
    </div>`}renderMemory(e){return this.editingMemory===e.id?n`<li class="mem-editing">
        <input class="field" .value=${this.memoryDraftEdit}
          @input=${a=>this.memoryDraftEdit=a.target.value}
          @keydown=${a=>{a.key==="Enter"&&(a.preventDefault(),this.saveMemoryEdit(e)),a.key==="Escape"&&(this.editingMemory=null)}}/>
        <select class="field" .value=${e.kind??"user"}
          @change=${a=>this.memoryKindEdit=a.target.value}>
          ${(this.memoryKinds.length?this.memoryKinds:[e.kind??"user"]).map(a=>n`<option value=${a} ?selected=${a===(e.kind??"user")}>${Ee[a]??a}</option>`)}
        </select>
        <div class="panel-actions">
          <button class="primary" @click=${()=>void this.saveMemoryEdit(e)}>Save</button>
          <button class="secondary" @click=${()=>this.editingMemory=null}>Cancel</button>
        </div>
      </li>`:n`<li>
      <span>
        ${e.text}
        <span class="mem-tags">
          ${e.kind?n`<em class="mem-kind ${e.kind}">${Ee[e.kind]??e.kind}</em>`:d}
          ${e.uncertain?n`<em class="mem-kind unsure" title="She wrote this as a guess, so she'll offer it rather than assert it">unsure</em>`:d}
          ${e.source==="user"?n`<em class="mem-kind mine" title="You told her this, so she treats it as certain">yours</em>`:d}
          ${(e.recalls??0)>0?n`<em class="mem-kind" title="She has learned this ${(e.recalls??0)+1} times">×${(e.recalls??0)+1}</em>`:d}
        </span>
      </span>
      <button class="mem-forget ${e.pinned?"pinned":""}" title=${e.pinned?"Let this fade normally":"Never forget this"}
        aria-label=${e.pinned?`Unpin: ${e.text}`:`Pin: ${e.text}`}
        aria-pressed=${e.pinned?"true":"false"}
        @click=${()=>void this.togglePin(e)}>
        <span class="material-symbols-rounded" style="font-size:16px">${e.pinned?"push_pin":"keep"}</span>
      </button>
      <button class="mem-forget" title="Correct this" aria-label="Edit: ${e.text}"
        @click=${()=>{this.editingMemory=e.id,this.memoryDraftEdit=e.text,this.memoryKindEdit=e.kind??""}}>
        <span class="material-symbols-rounded" style="font-size:16px">edit</span>
      </button>
      <button class="mem-forget" title="Forget this" aria-label="Forget: ${e.text}" @click=${()=>void this.forgetMemory(e.id)}>
        <span class="material-symbols-rounded" style="font-size:16px">close</span>
      </button>
    </li>`}renderWantsPanel(){this.wants===null&&this.loadWants();const e=this.wants??[];return n`<div class="mem-panel">
      <strong>What Libby wants</strong>
      <p class="empty">Libby has wants of her own — an outfit she'd like, something she wishes were on the shelves, how she wants a night to go — and she'll bring them up herself. This is what she's been wanting lately; drop any of it, or clear it all.</p>
      ${this.wants===null?n`<p class="empty">Loading…</p>`:e.length===0?n`<p class="empty">Nothing yet. She'll let you know when she's wanting something.</p>`:n`<ul class="mem-list">${e.map(t=>n`
              <li><span>${t.text}</span>
                <button class="mem-forget" title="Drop this" aria-label="Drop: ${t.text}" @click=${()=>void this.forgetWant(t.id)}><span class="material-symbols-rounded" style="font-size:16px">close</span></button>
              </li>`)}</ul>`}
      ${e.length>0?n`<div class="panel-actions"><button class="danger" @click=${()=>void this.clearWants()}>Clear all wants</button></div>`:d}
    </div>`}async loadDiscord(){if(!this.discordLoading){this.discordLoading=!0;try{this.discord=await g.discord()}catch{this.discord=void 0}finally{this.discordLoading=!1}}}async connectDiscord(){const e=this.discordToken.trim();if(e)try{this.discord=await g.connectDiscord(e),this.discordToken="",this.say(`Connected to Discord as ${this.discord.botName}.`)}catch(t){this.discordToken="",this.say(t instanceof Error?t.message:"Couldn't connect to Discord.",!0)}}async disconnectDiscord(){try{const e=await g.disconnectDiscord();this.say(e.note),this.discordPlaces=null,await this.loadDiscord()}catch(e){this.say(e instanceof Error?e.message:"Couldn't disconnect.",!0)}}async saveDiscord(e){try{this.discord=await g.saveDiscordSettings(e)}catch(t){this.say(t instanceof Error?t.message:"Couldn't save that.",!0)}}async loadDiscordPlaces(){try{this.discordPlaces=(await g.discordPlaces()).servers}catch(e){this.say(e instanceof Error?e.message:"Couldn't ask Discord which servers it's in.",!0)}}setDiscordChannel(e,t,a,s){var h;const o=((h=this.discord)==null?void 0:h.channels)??[],i=o.find(m=>m.channelId===t),r={guildId:e.guildId,guildName:e.name,channelId:t,name:a,read:!1,write:!1,...i,...s},l=o.filter(m=>m.channelId!==t);this.saveDiscord({channels:r.read||r.write?[...l,r]:l})}addDiscordUser(){var t;const e=this.discordUserDraft.trim();if(!/^\d{5,24}$/.test(e)){this.say("That doesn't look like a Discord user id — turn on Developer Mode in Discord and copy the id.",!0);return}this.discordUserDraft="",this.saveDiscord({users:[...new Set([...((t=this.discord)==null?void 0:t.users)??[],e])]})}renderDiscordPanel(){this.discord===void 0&&!this.discordLoading&&this.loadDiscord();const e=this.discord;return n`<div class="mem-panel">
      <strong>Libby on Discord</strong>
      <p class="empty">An optional bot connection, so she can talk to you outside OppaiLib. She reads only the channels you list, posts only where you allow it, and answers only the people you name. Everything she does is logged below.</p>
      ${e===void 0?n`<p class="empty">Loading…</p>`:n`
        <p class="empty"><strong>${e.note}</strong></p>
        ${e.hasToken?n`
          <label class="mem-toggle">
            <input type="checkbox" .checked=${e.enabled} @change=${t=>void this.saveDiscord({enabled:t.target.checked})}/>
            <span>Let her read and post on Discord</span>
          </label>
          <div class="grid">
            <label>What she remembers from Discord
              <select class="field" .value=${e.memory} @change=${t=>void this.saveDiscord({memory:t.target.value})}>
                <option value="shared" ?selected=${e.memory==="shared"}>One memory — same her, both places</option>
                <option value="none" ?selected=${e.memory==="none"}>Keep Discord out of her memory</option>
              </select>
            </label>
            <label>Checks for new messages every
              <input class="field" type="number" min="10" max="600" .value=${String(e.pollSeconds)}
                @change=${t=>void this.saveDiscord({pollSeconds:Number(t.target.value)})}/>
            </label>
            <label>Most messages per channel per hour
              <input class="field" type="number" min="1" max="60" .value=${String(e.perHour)}
                @change=${t=>void this.saveDiscord({perHour:Number(t.target.value)})}/>
            </label>
          </div>

          <p class="empty">Who she'll answer. Nobody else gets a reply, even in a channel she's reading.</p>
          ${e.users.length===0?n`<p class="empty">Nobody yet.</p>`:n`<ul class="mem-list">${e.users.map(t=>n`
            <li><span>${t}</span>
              <button class="mem-forget" title="Remove" aria-label="Remove ${t}" @click=${()=>void this.saveDiscord({users:e.users.filter(a=>a!==t)})}><span class="material-symbols-rounded" style="font-size:16px">close</span></button>
            </li>`)}</ul>`}
          <label>Add a Discord user id<input class="field" placeholder="e.g. 123456789012345678" .value=${this.discordUserDraft}
            @change=${t=>this.discordUserDraft=t.target.value}/></label>
          <div class="panel-actions"><button class="secondary" @click=${()=>this.addDiscordUser()}>Add person</button></div>

          <p class="empty">Where she may read and post. Being in a server isn't permission to read it — every channel is off until you say otherwise.</p>
          ${this.discordPlaces===null?n`<div class="panel-actions"><button class="secondary" @click=${()=>void this.loadDiscordPlaces()}>Show her servers and channels</button></div>`:n`${this.discordPlaces.map(t=>n`
                <p class="empty"><strong>${t.name}</strong></p>
                ${t.channels.length===0?n`<p class="empty">No channels it can see here — check the bot's permissions in that server.</p>`:n`
                  <ul class="mem-list">${t.channels.map(a=>{const s=e.channels.find(o=>o.channelId===a.channelId);return n`<li><span>#${a.name}</span>
                      <label class="mem-toggle"><input type="checkbox" .checked=${!!(s!=null&&s.read)} @change=${o=>this.setDiscordChannel(t,a.channelId,a.name,{read:o.target.checked})}/><span>read</span></label>
                      <label class="mem-toggle"><input type="checkbox" .checked=${!!(s!=null&&s.write)} @change=${o=>this.setDiscordChannel(t,a.channelId,a.name,{write:o.target.checked})}/><span>post</span></label>
                    </li>`})}</ul>`}`)}`}

          ${e.log.length===0?d:n`
            <p class="empty">What she's done on Discord, and what was refused and why.</p>
            <ul class="mem-list">${[...e.log].reverse().slice(0,25).map(t=>n`
              <li><span><strong>${t.kind}</strong>${t.channel?` · ${t.channel}`:""}${t.user?` · ${t.user}`:""} — ${t.detail??""}</span></li>`)}</ul>`}

          <div class="panel-actions"><button class="danger" @click=${()=>void this.disconnectDiscord()}>Disconnect and delete the token</button></div>`:n`
          <p class="empty">Create an application at discord.com/developers, add a bot to it, and paste its token here. Invite it to your server with the fewest permissions that work: View Channel, Read Message History, and Send Messages.</p>
          <label>Bot token<input class="field" type="password" autocomplete="off" placeholder="Paste the bot token…" .value=${this.discordToken}
            @change=${t=>this.discordToken=t.target.value}/></label>
          <div class="panel-actions"><button class="primary" @click=${()=>void this.connectDiscord()}>Connect</button></div>`}`}
    </div>`}async loadIdentity(){if(!this.identityLoading){this.identityLoading=!0;try{this.identity=await g.libbyIdentity()}catch{this.identity=void 0}finally{this.identityLoading=!1}}}async saveIdentity(e){try{this.identity=await g.saveLibbyIdentity(e)}catch(t){this.say(t instanceof Error?t.message:"Couldn't save that.",!0)}}async markIdentity(e,t,a=!1){try{this.identity=await g.markLibbyIdentity({mediaId:e,isLibby:t,reference:a}),this.say(t?"Kept as her, without being a reference.":"Noted — that one isn't her.")}catch(s){this.say(s instanceof Error?s.message:"Couldn't save that.",!0)}}async scanForHerself(){this.say("Looking through the library…");try{const e=await g.scanLibbyIdentity();this.say(e.tagged>0?`Found ${e.tagged} more picture${e.tagged===1?"":"s"} of her in ${e.checked}.`:`Checked ${e.checked} items and found nothing new.`),await this.loadIdentity()}catch(e){this.say(e instanceof Error?e.message:"The sweep failed.",!0)}}renderIdentityPanel(){this.identity===void 0&&!this.identityLoading&&this.loadIdentity();const e=this.identity;return n`<div class="mem-panel">
      <strong>Pictures of Libby</strong>
      <p class="empty">A picture judged to be her is labelled <code>${(e==null?void 0:e.tag)??"character:libby"}</code> in the library itself, so she knows herself when you open one, and you can search for them. Right-click any picture and use "Is this Libby?" to say so yourself — including saying no, which she remembers.</p>
      ${e===void 0?n`<p class="empty">Loading…</p>`:n`
          <p class="empty">${e.tagged} picture${e.tagged===1?"":"s"} labelled as her${e.rejected>0?`, ${e.rejected} ruled out by hand`:""}.</p>
          <label class="mem-toggle">
            <input type="checkbox" .checked=${e.auto} @change=${t=>void this.saveIdentity({auto:t.target.checked})}/>
            <span>Recognise her in new pictures automatically</span>
          </label>
          <label>How sure she has to be — matching features required
            <input class="field" type="number" min="2" max="6" .value=${String(e.floor)}
              @change=${t=>void this.saveIdentity({floor:Number(t.target.value)})}/></label>
          <p class="empty">Matched against how her card says she looks: ${e.features.length?e.features.join(", "):"nothing yet — fill in her appearance"}.</p>
          ${e.references.length?n`<p class="empty">Reference pictures — what she looks like across outfits, poses and expressions. Open one to see it, drop it from the references, or say it isn't her after all:</p>
              <ul class="mem-list">${e.references.map(t=>n`<li>
                <button class="link-btn" title="Open ${t.title}" @click=${()=>B(this,t.id)}>${t.title}</button>
                <span class="mem-acts">
                  <button class="mem-act" title="Keep it as her, but not as a reference" @click=${()=>void this.markIdentity(t.id,!0,!1)}>Not a reference</button>
                  <button class="mem-act danger" title="This isn't her — the label comes off" @click=${()=>void this.markIdentity(t.id,!1)}>Not her</button>
                </span>
              </li>`)}</ul>`:n`<p class="empty">No reference pictures yet. Mark a few from the library and she has more than one angle to go on.</p>`}
          <div class="panel-actions"><button class="secondary" @click=${()=>void this.scanForHerself()}>Look through the library now</button></div>`}
    </div>`}renderLinkPreview(){if(!this.pendingLinkURL)return d;const e=this.pendingLink;return n`<div class="attachment link-preview">
      <span class="material-symbols-rounded link-icon">${e!=null&&e.failed?"link_off":e!=null&&e.internal?"collections_bookmark":"link"}</span>
      <span class="attachment-copy">
        <strong>${e?e.title||e.host:"Reading that link…"}</strong>
        <span>${e!=null&&e.failed?e.error:e!=null&&e.internal?"In your library — she'll talk about it as one of your own items.":(e==null?void 0:e.text)||this.pendingLinkURL}</span>
        ${e&&!e.failed&&!e.internal?n`<span class="link-host">${e.host}${e.media?` · ${e.media} file${e.media===1?"":"s"}`:""}</span>`:d}
      </span>
      <button type="button" class="icon-btn" title="Don't send this link" aria-label="Don't send this link" @click=${()=>this.dropLink()}><span class="material-symbols-rounded">close</span></button>
    </div>`}canRedo(e){var s;const t=((s=this.activeConversation)==null?void 0:s.messages)??[];if(e.role!=="assistant")return!1;const a=t.indexOf(e);return a>=0&&t.slice(a+1).every(o=>o.role==="assistant")}messageMenu(e,t){if(fe(t))return;t.preventDefault(),t.stopPropagation();const a=this.canRedo(e),s=[...e.thought?[]:[{label:"Reply",icon:"reply",run:()=>this.replyTo(e)}],...e.thought||e.role!=="assistant"?[]:[{label:"React…",icon:"add_reaction",run:()=>this.reactionPicker=e.id}],{label:"Copy text",icon:"content_copy",run:()=>void navigator.clipboard.writeText(e.content)},{label:"Edit message",icon:"edit",run:()=>this.editMessage(e)},...a?[{label:"Retry",icon:"refresh",disabled:this.busy,run:()=>void this.regenerate()},{label:"Retry with a note…",icon:"edit_note",disabled:this.busy,run:()=>void this.regenerateWithNote()}]:[],...e.role==="user"&&!e.thought?[{label:"Retry from here",icon:"replay",disabled:this.busy,run:()=>void this.retryFrom(e)}]:[],W,{label:"Delete message",icon:"delete",danger:!0,run:()=>this.deleteMessage(e.id)}];ye({x:t.clientX,y:t.clientY,title:e.role==="assistant"?"Message":"Your message",items:s})}renderThought(e,t){const a=e.thought==="aside";return n`<div class="thought ${a?"aloud":""}" @contextmenu=${s=>this.messageMenu(e,s)}>
      <span class="thought-label"><span class="material-symbols-rounded" aria-hidden="true">${a?"graphic_eq":"psychology_alt"}</span>${a?`${t.name}, to herself`:`${t.name} thinks`}</span>
      <div>${e.content}</div>
    </div>`}sameRun(e,t){return!!e&&!!t&&!e.thought&&!t.thought&&e.role===t.role&&Math.abs(t.at-e.at)<5*6e4}renderEntry(e,t,a){var k,x,T;const s=this.activeCharacter,o=this.activeConversation;if(!s||!o)return d;const i=!t||te(t.at)!==te(e.at)?n`<div class="day">${te(e.at)}</div>`:d;if(e.thought)return n`${i}${this.renderThought(e,s)}`;const r=!this.sameRun(t,e)||i!==d,l=!this.sameRun(e,a),h=e.role==="assistant",m=h?s.name:this.workspace.profile.displayName||((k=this.user)==null?void 0:k.username)||"You",f=l?this.receiptFor(e,o):"",b=e.reactions??[],$=this.reactionPicker===e.id,y=(x=b.find(v=>v.by==="user"))==null?void 0:x.emoji;return n`${i}<article class="msg ${h?"theirs":"mine"} ${r?"first":""} ${l?"last":""}" data-message-id=${e.id}
      @contextmenu=${v=>this.messageMenu(e,v)}
      @pointerdown=${v=>this.swipeStart(e,v)}
      @pointermove=${v=>this.swipeMove(v)}
      @pointerup=${()=>this.swipeEnd(e)} @pointercancel=${()=>this.swipeEnd(e)}>
      ${h?this.avatar(s,"avatar"):d}
      <div class="bubble-wrap">
        <span class="swipe-hint material-symbols-rounded" aria-hidden="true">reply</span>
        ${$?n`<div class="react-row" role="menu" aria-label="React">${Yt.map(v=>n`<button type="button" class=${y===v?"on":""} @click=${()=>this.react(e,v)}>${v}</button>`)}<button type="button" class="close" title="Close" aria-label="Close" @click=${()=>this.reactionPicker=null}><span class="material-symbols-rounded" style="font-size:16px">close</span></button></div>`:d}
        <div class="bubble ${e.snap?"has-snap":""}">
          ${e.replyTo?n`<button type="button" class="quote" title="Go to that message" @click=${()=>this.jumpTo(e.replyTo)}>
            <strong>${e.replyTo.role==="assistant"?s.name:this.workspace.profile.displayName||((T=this.user)==null?void 0:T.username)||"You"}</strong>
            <span>${e.replyTo.excerpt}</span></button>`:d}
          ${e.content.trim()?n`<div class="text">${Be(e.content,e.links,v=>B(this,v))}</div>`:d}
          ${e.snap?this.renderSnapTile(e,m):n`
            ${e.imageId?n`<img class="sent-image" src=${g.chatImageURL(e.imageId)} alt="Image sent by ${m}"/>`:d}
            ${ut(e.attachments,(v,S)=>B(this,v,S),m)}`}
          ${gt(e.links,v=>B(this,v))}
          ${mt(e.actions,this.approvals.stateOf,this.approvals.decide)}
          <div class="meta"><span>${pe(e.at)}</span></div>
          ${b.length?n`<div class="reactions">${b.map(v=>n`<button type="button" class="reaction ${v.by}" title=${v.by==="assistant"?`${s.name} reacted ${v.emoji}`:`You reacted ${v.emoji}`}
            @click=${()=>h&&v.by==="user"?this.react(e,v.emoji):void 0}>${v.emoji}</button>`)}</div>`:d}
        </div>
        ${f?n`<span class="receipt ${e.readAt?"read":""}">${f}</span>`:d}
        <span class="msg-actions"><button title="Reply" aria-label="Reply to this message" @click=${()=>this.replyTo(e)}><span class="material-symbols-rounded" style="font-size:16px">reply</span></button>${h?n`<button title="React" aria-label="React to this message" @click=${()=>this.reactionPicker=$?null:e.id}><span class="material-symbols-rounded" style="font-size:16px">add_reaction</span></button><button title="Read aloud" aria-label="Read this message aloud" @click=${()=>{Ie(),Te(e.content)}}><span class="material-symbols-rounded" style="font-size:16px">volume_up</span></button>`:d}${this.canRedo(e)?n`<button title="Retry" aria-label="Ask for a different reply" ?disabled=${this.busy} @click=${()=>void this.regenerate()}><span class="material-symbols-rounded" style="font-size:16px">refresh</span></button>`:d}${e.role==="user"?n`<button title="Retry from here" aria-label="Retry from this message" ?disabled=${this.busy} @click=${()=>void this.retryFrom(e)}><span class="material-symbols-rounded" style="font-size:16px">replay</span></button>`:d}<button title="Copy" @click=${()=>void navigator.clipboard.writeText(e.content)}><span class="material-symbols-rounded" style="font-size:16px">content_copy</span></button><button title="Edit" @click=${()=>this.editMessage(e)}><span class="material-symbols-rounded" style="font-size:16px">edit</span></button><button title="Delete" @click=${()=>this.deleteMessage(e.id)}><span class="material-symbols-rounded" style="font-size:16px">delete</span></button></span>
      </div>
    </article>`}renderSnapTile(e,t){return e.opened?n`<div class="snap opened" aria-label="Snap from ${t}, opened"><span class="material-symbols-rounded">check_box_outline_blank</span><span>Opened</span></div>`:n`<button type="button" class="snap" title="Tap to view — you only get to see it once" @click=${()=>this.openSnap(e)}>
      <span class="material-symbols-rounded">photo_camera</span><span>Tap to view</span><em>Snap from ${t}</em>
    </button>`}renderSnapViewer(){var a;const e=this.snapOpen;if(!e)return d;const t=e.imageId?g.chatImageURL(e.imageId):(a=e.attachments)!=null&&a[0]?g.streamURL(e.attachments[0].id):"";return n`<div class="snap-viewer" role="dialog" aria-modal="true" aria-label="Snap" @click=${()=>this.closeSnap()}>
      ${t?n`<img src=${t} alt="Snap"/>`:n`<p>This snap is gone.</p>`}
      <span class="snap-close">Tap anywhere to close — it won't open again</span>
    </div>`}render(){try{return this.renderClient()}catch(e){return console.error("chat render failed",e),n`<div class="client"><section class="main load-failed">
        <h2>Chat couldn't be drawn.</h2>
        <p>${(e==null?void 0:e.message)||String(e)}</p>
        <p class="hint">This is a bug — the detail above and the browser console say which part of the workspace is malformed.</p>
        <button class="autobar-btn" @click=${()=>void this.retryLoad()}>Reload chat</button>
      </section></div>`}}renderClient(){var h,m,f;const e=this.activeCharacter,t=this.activeConversation;if(this.loading)return n`<div class="client"><section class="main" style="grid-column:1/-1;place-items:center;display:grid"><md-circular-progress indeterminate></md-circular-progress></section></div>`;if(!e||!t)return n`<div class="client"><section class="main" style="grid-column:1/-1;padding:24px">Chat workspace is unavailable.</section></div>`;const a=R.find(b=>b.id===t.mode)??R[0],s=this.stageOpen?this.renderStage(e,t):d,o=!!((h=this.status)!=null&&h.enabled),i=o?this.status.model:e.id==="libby"?"Local replies":"Model offline",r=t.messages,l=this.stageOpen?this.renderHero(e,t):d;return n`<div class="client ${this.mobileNavOpen?"nav-open":""} ${s!==d?"with-stage":""} ${this.callOpen?"in-call":""}" style=${this.stageWidth?`--stage-w:${this.stageWidth}px`:""} @pointerdown=${this.armIdle} @contextmenu=${this.chatMenu}>${this.renderSidebar()}
      <main class="main"><header class="top">
        <button class="icon-btn mobile-nav" title="Chats" aria-label="Back to chats" @click=${()=>this.mobileNavOpen=!0}><span class="material-symbols-rounded">arrow_back</span></button>
        ${this.avatar(e,"top-avatar")}
        <span class="top-title"><span class="name">${e.name}</span><span class="presence"><span class="status-dot ${o?"online":""}"></span>${i}${e.id==="libby"?` · ${t.emotion}${t.activity?`, ${t.activity}`:""}`:` · ${a.topic}`}</span></span>
        ${e.id==="libby"?d:n`<select class="quick-mode" aria-label="Conversation mode" title="Conversation mode" .value=${t.mode} @change=${b=>this.updateConversation({mode:b.target.value})}>${R.map(b=>n`<option value=${b.id}>${b.label}</option>`)}</select>`}
        <span class="top-actions"><button class="icon-btn ${this.callOpen?"on":""}" title=${this.callOpen?"End call":"Video call"} aria-label=${this.callOpen?"End call":"Video call"} @click=${()=>this.callOpen?this.endCall():this.startCall()}><span class="material-symbols-rounded">${this.callOpen?"call_end":"videocam"}</span></button><button class="icon-btn ${this.autopilot?"on":""}" title=${this.autopilot?"Turn off autopilot":"Let the AI continue on its own"} aria-label="Autopilot" aria-pressed=${this.autopilot?"true":"false"} @click=${()=>this.toggleAutopilot()}><span class="material-symbols-rounded">smart_toy</span></button><button class="icon-btn stage-toggle ${this.stageOpen?"on":""}" title=${this.stageOpen?"Hide portrait":"Show portrait"} aria-label="Portrait" aria-pressed=${this.stageOpen?"true":"false"} @click=${()=>this.stageOpen=!this.stageOpen}><span class="material-symbols-rounded">wallpaper</span></button><button class="icon-btn ${this.speakOn?"on":""}" title=${this.speakOn?"Stop reading replies aloud":"Read replies aloud"} aria-label="Voice" aria-pressed=${this.speakOn?"true":"false"} @click=${()=>this.toggleSpeak()}><span class="material-symbols-rounded">${this.speakOn?"volume_up":"volume_off"}</span></button><button class="icon-btn destructive-action" title="Clear messages" aria-label="Clear messages" @click=${this.clearConversation}><span class="material-symbols-rounded">delete_sweep</span></button><button class="icon-btn ${this.settingsOpen?"on":""}" title="Chat settings" aria-label="Chat settings" @click=${()=>this.settingsOpen=!this.settingsOpen}><span class="material-symbols-rounded">tune</span></button></span>
      </header>
        ${this.settingsOpen?this.renderSettings():d}
        ${this.loadError?n`<div class="backend-state load-error" role="alert"><strong>Chat didn't load.</strong> ${this.loadError}
          ${this.workspaceLoaded?d:n` Your saved characters and conversations aren't shown, and nothing is being saved until this succeeds.`}
          <button class="autobar-btn" @click=${()=>void this.retryLoad()}>Retry</button></div>`:d}
        ${(m=this.status)!=null&&m.modelBackend&&!this.status.enabled?n`<div class="backend-state" role="status"><strong>Text generation offline.</strong> ${this.status.message||"Load a model in text-generation-webui, then refresh status."}</div>`:d}
        ${l}
        ${this.renderAutopilotBar(e)}
        <section class="log">${r.length?d:n`<div class="intro">${this.avatar(e,"intro-avatar")}<h2>${e.name}</h2><p>${e.description||`This is the beginning of your conversation with ${e.name}.`}</p><p>${o?`Running on ${this.status.model}.`:e.id==="libby"?"Libby is using built-in local replies.":"Connect a local model to start chatting."}</p></div>`}
          ${r.map((b,$)=>this.renderEntry(b,r[$-1],r[$+1]))}${this.busy&&this.typingPhase==="typing"?n`<div class="msg theirs last typing-row">${this.avatar(e,"avatar")}<div class="bubble-wrap"><div class="bubble" aria-label="${e.name} is typing"><span class="dots"><i></i><i></i><i></i></span></div></div></div>`:d}
        </section>${this.notice?n`<div class="notice ${this.noticeError?"error":""}" role=${this.noticeError?"alert":"status"}>${this.notice}</div>`:d}
        <form class="composer-form" @submit=${b=>{b.preventDefault(),this.send()}}>
          ${this.pendingPhoto?n`<div class="attachment"><img src=${g.chatImageURL(this.pendingPhoto.imageId)} alt=${`Attached photo: ${this.pendingPhoto.name}`}/>
            <span class="attachment-copy"><strong>${this.pendingPhoto.name}</strong><span>${this.pendingPhoto.tags.length?this.pendingPhoto.tags.slice(0,8).join(", "):"No content tags found"}</span></span>
            <button type="button" class="icon-btn" title="Remove photo" aria-label="Remove photo" @click=${()=>void this.discardPhoto()}><span class="material-symbols-rounded">close</span></button></div>`:d}
          ${this.renderLinkPreview()}
          ${this.replyTarget?n`<div class="attachment reply-preview">
            <span class="material-symbols-rounded link-icon">reply</span>
            <span class="attachment-copy"><strong>Replying to ${this.replyTarget.role==="assistant"?e.name:"yourself"}</strong><span>${ne(this.replyTarget.content)}</span></span>
            <button type="button" class="icon-btn" title="Cancel reply" aria-label="Cancel reply" @click=${()=>this.replyTarget=null}><span class="material-symbols-rounded">close</span></button></div>`:d}
          ${this.pendingItems.length?n`<div class="items-preview">${this.pendingItems.map(b=>n`<span class="item-chip">
            ${b.hasThumb?n`<img src=${g.thumbURL(b.id)} alt=""/>`:n`<span class="chip-icon"><span class="material-symbols-rounded">${Se[b.kind]??"folder"}</span></span>`}
            <strong>${b.title}</strong>
            <button type="button" title="Remove" aria-label=${`Remove ${b.title}`} @click=${()=>this.removeItem(b.id)}><span class="material-symbols-rounded" style="font-size:16px">close</span></button>
          </span>`)}</div>`:d}
          <div class="composer">
            <div class="box">
              <span class="attach-btn" title="Share a photo"><span class="material-symbols-rounded">add_photo_alternate</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Share a photo" @change=${b=>void this.attachPhoto(b)}/></span>
              <button type="button" class="attach-btn" style="border:0;background:transparent" title="Attach from the library" aria-label="Attach from the library" @click=${()=>this.openPicker()}><span class="material-symbols-rounded">collections_bookmark</span></button>
              <textarea rows="1" aria-label=${`Message ${e.name}`} placeholder=${this.busy?`${e.name} is replying — you can keep going…`:`Message ${e.name}…`} .value=${this.draft} @input=${b=>{this.draft=b.target.value,this.noticeLink()}} @keydown=${this.onKey}></textarea>
            </div>
            ${this.busy&&((f=this.status)!=null&&f.modelManagement)?n`<button class="send stop" type="button" title="Stop the reply" aria-label="Stop the reply" @click=${()=>void this.stopGeneration()}><span class="material-symbols-rounded">stop</span></button>`:d}
            <button class="send" type="submit" title="Send message" aria-label="Send message" ?disabled=${!this.draft.trim()&&!this.pendingPhoto&&!this.pendingItems.length}><span class="material-symbols-rounded">send</span></button>
          </div><div class="format-help"><span>"speech" · **action** · *emphasis* · ~~strike~~ · &#96;code&#96;</span><span class="send-help"></span></div></form>
      </main>${s}${this.renderPicker2()}${this.renderIncomingCall(e)}${this.renderCall(e,t)}${this.renderSnapViewer()}
    </div>`}renderPicker2(){const e=this.picker;if(!e)return d;const t=new Set(this.pendingItems.map(a=>a.id));return n`<div class="picker" @click=${()=>this.closePicker()}>
      <div class="picker-card" role="dialog" aria-modal="true" aria-label="Attach from the library" @click=${a=>a.stopPropagation()}>
        <div class="picker-head">
          <span class="material-symbols-rounded" style="color:var(--muted)">search</span>
          <input placeholder="Search your library…" .value=${e.query}
            @input=${a=>void this.searchLibrary(a.target.value)}
            @keydown=${a=>{a.key==="Escape"&&this.closePicker()}} />
          <button type="button" class="icon-btn" title="Close" aria-label="Close" @click=${()=>this.closePicker()}><span class="material-symbols-rounded">close</span></button>
        </div>
        <div class="picker-grid">
          ${e.loading&&!e.items.length?n`<div class="picker-empty">Looking…</div>`:d}
          ${!e.loading&&!e.items.length?n`<div class="picker-empty">Nothing matches.</div>`:d}
          ${e.items.map(a=>n`<button type="button" class="picker-tile ${t.has(a.id)?"on":""}" title=${a.title} @click=${()=>this.toggleItem(a)}>
            ${a.hasThumb||a.kind==="image"||a.kind==="gif"?n`<img src=${g.thumbURL(a.id)} alt="" loading="lazy"/>`:n`<span class="tile-kind material-symbols-rounded">${Se[a.kind]??"folder"}</span>`}
            <span class="tile-name">${a.title||`Item ${a.id}`}</span>
          </button>`)}
        </div>
        <div class="picker-foot">
          <span>${t.size?`${t.size} chosen`:"Pick videos, pictures, gifs, comics or games to show her."}</span>
          <button type="button" class="autobar-btn" @click=${()=>this.closePicker()}>${t.size?"Done":"Close"}</button>
        </div>
      </div>
    </div>`}renderIncomingCall(e){return this.incomingCall?n`<div class="incoming" role="alertdialog" aria-label=${`${e.name} is calling`}>
      ${this.avatar(e,"avatar")}
      <span class="incoming-copy"><strong>${e.name} is calling</strong><span>Video call</span></span>
      <button type="button" class="incoming-btn no" title="Decline" aria-label="Decline" @click=${()=>this.declineCall()}><span class="material-symbols-rounded">call_end</span></button>
      <button type="button" class="incoming-btn yes" title="Answer" aria-label="Answer" @click=${()=>this.acceptCall()}><span class="material-symbols-rounded">videocam</span></button>
    </div>`:d}};c.styles=[bt,ft,yt,vt,wt,xt,kt`
    :host { display:block; height:100%; color:var(--md-sys-color-on-surface);
      font:400 15px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans",system-ui,sans-serif;
      --side:var(--md-sys-color-surface-container-low); --main:var(--md-sys-color-surface);
      --hover:var(--md-sys-color-surface-container-high); --input:var(--md-sys-color-surface-container-highest);
      --bubble:var(--md-sys-color-surface-container-high); --muted:var(--md-sys-color-on-surface-variant);
      --line:var(--md-sys-color-outline-variant); --accent:var(--md-sys-color-primary); --on-accent:var(--md-sys-color-on-primary);
      --side-w:340px; --bar:60px;
      /* The portrait column. Sized to the viewport rather than fixed, so a wide screen
         shows more of her and a narrow one keeps room for the conversation. */
      --stage-w:clamp(236px,26vw,400px); --call-side-w:clamp(340px,32vw,460px); }
    button,input,textarea,select { font:inherit; }
    button { color:inherit; }
    /* Two panes, the way every messenger is laid out: the list of chats and the open
       chat. The portrait is a third pane that exists only when there is art to show. */
    .client { position:relative; display:grid; grid-template-columns:var(--side-w) minmax(0,1fr); height:100%; min-height:0;
      overflow:hidden; background:var(--main); }
    .client.with-stage { grid-template-columns:var(--side-w) minmax(0,1fr) var(--stage-w); }
    .avatar img,.chat-avatar img,.top-avatar img,.me-avatar img,.intro-avatar img,.pick-avatar img {
      width:100%; height:100%; object-fit:cover; object-position:top center; display:block; }
    .initial { font-weight:700; color:var(--on-accent); background:var(--accent); display:grid; place-items:center; }
    .icon-btn { border:0; background:transparent; border-radius:50%; width:38px; height:38px; display:grid; place-items:center;
      cursor:pointer; color:var(--muted); transition:background .12s ease,color .12s ease; }
    .icon-btn:hover,.icon-btn.on { background:var(--hover); color:var(--md-sys-color-on-surface); }
    .icon-btn.on { color:var(--accent); }
    .icon-btn:disabled { opacity:.4; cursor:default; }

    /* ── the chat list ───────────────────────────────────────────────────── */
    .side { min-width:0; display:flex; flex-direction:column; background:var(--side); border-right:1px solid var(--line); }
    .side-head { min-height:var(--bar); flex:0 0 var(--bar); display:flex; align-items:center; gap:4px; padding:0 8px 0 18px; }
    .side-head h1 { flex:1; min-width:0; margin:0; font-size:22px; font-weight:750; letter-spacing:-.01em; }
    .me-avatar { width:34px; height:34px; flex:0 0 34px; border-radius:50%; overflow:hidden; display:grid; place-items:center; font-size:12px; }
    .me-btn { border:0; background:transparent; padding:2px; border-radius:50%; cursor:pointer; }
    .search { margin:2px 12px 10px; display:flex; align-items:center; gap:8px; padding:7px 12px; border-radius:999px; background:var(--input); color:var(--muted); }
    .search input { flex:1; min-width:0; border:0; outline:0; background:transparent; color:var(--md-sys-color-on-surface); }
    .search input::placeholder { color:var(--muted); }
    .chats { flex:1; min-height:0; overflow-y:auto; padding:0 8px 10px; }
    .chat-wrap { position:relative; }
    .chat-row { width:100%; display:grid; grid-template-columns:52px minmax(0,1fr) auto; grid-template-rows:auto auto; gap:1px 12px; align-items:center;
      padding:9px 10px; border:0; border-radius:14px; background:transparent; color:inherit; text-align:left; cursor:pointer;
      transition:background .12s ease; }
    .chat-row:hover { background:var(--hover); }
    .chat-wrap.on .chat-row { background:color-mix(in srgb,var(--accent) 14%,transparent); }
    .chat-avatar { grid-row:1/3; width:52px; height:52px; border-radius:50%; overflow:hidden; display:grid; place-items:center; background:var(--input); font-size:16px; }
    .chat-name { font-weight:650; font-size:15px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .chat-name small { font-weight:500; color:var(--muted); }
    .chat-time { grid-column:3; font-size:11px; color:var(--muted); white-space:nowrap; align-self:start; padding-top:3px; }
    .chat-preview { grid-column:2/4; font-size:13px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .chat-preview .material-symbols-rounded { font-size:14px; vertical-align:-2px; margin-right:3px; }
    .chat-delete { position:absolute; right:10px; bottom:8px; opacity:0; border:0; border-radius:50%; width:28px; height:28px; display:grid;
      place-items:center; background:var(--main); color:var(--muted); cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,.25); }
    .chat-wrap:hover .chat-delete,.chat-wrap:focus-within .chat-delete { opacity:1; }
    .chat-delete:hover { color:var(--md-sys-color-error); }
    .chats-empty { padding:32px 18px; color:var(--muted); font-size:13px; text-align:center; }
    /* Starting a chat: who with. Replaces the list rather than floating over it, so
       it works identically as a phone screen and as a desktop pane.
       NOT called .picker — that is the library picker's full-screen scrim further
       down this same stylesheet, and the later rule won: this panel rendered as a
       dark sheet across the whole app. One stylesheet, one shadow root, so a class
       name used twice here is a collision, not two scopes. */
    .friends { flex:1; min-height:0; overflow-y:auto; padding:0 8px 10px; display:flex; flex-direction:column; gap:2px; }
    .pick-wrap { position:relative; display:flex; align-items:center; border-radius:12px; }
    .pick-wrap:hover { background:var(--hover); }
    .pick { width:100%; display:grid; grid-template-columns:44px minmax(0,1fr); gap:0 12px; align-items:center; padding:8px 10px;
      border:0; border-radius:12px; background:transparent; color:inherit; text-align:left; cursor:pointer; }
    .pick:hover { background:var(--hover); }
    .pick-wrap .pick:hover { background:transparent; }
    /* The row's own actions. Hidden until the row is touched, so a roster of twelve
       is a list of people rather than a toolbar; always shown on coarse pointers,
       which have no hover to reveal them with. */
    .pick-acts { position:absolute; right:6px; display:flex; gap:2px; opacity:0; transition:opacity .12s ease; }
    .pick-wrap:hover .pick-acts, .pick-wrap:focus-within .pick-acts { opacity:1; }
    @media (hover:none) { .pick-acts { opacity:1; } }
    .pick-act { border:0; background:var(--side); color:var(--muted); cursor:pointer; display:grid; place-items:center;
      width:28px; height:28px; border-radius:8px; }
    .pick-act:hover { color:inherit; background:var(--input); }
    .pick-act.danger:hover { color:#f2b8b5; }
    .pick-act .material-symbols-rounded { font-size:16px; }
    /* Importing: a real target you can drop onto, not a file input hidden in a
       button's label. */
    .dropzone { margin:10px 2px 4px; padding:16px 14px; border:1.5px dashed var(--line); border-radius:14px;
      display:flex; flex-direction:column; align-items:center; gap:4px; text-align:center; cursor:pointer;
      color:var(--muted); font-size:12px; transition:border-color .12s ease, background .12s ease; }
    .dropzone:hover, .dropzone.over { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 8%,transparent); }
    .dropzone input { display:none; }
    .dropzone strong { color:var(--text); font-size:13px; }
    .dropzone .material-symbols-rounded { font-size:26px; color:var(--accent); }
    .card-note { margin:2px; padding:9px 11px; border-radius:10px; background:var(--input); font-size:12px; line-height:1.45; }
    .card-note.bad { background:color-mix(in srgb,#f2b8b5 16%,transparent); color:#f2b8b5; }
    .pick-avatar { grid-row:1/3; width:44px; height:44px; border-radius:50%; overflow:hidden; display:grid; place-items:center; background:var(--input); font-size:14px; }
    .pick-name { font-weight:650; }
    .pick-sub { font-size:12px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .pick.add .pick-avatar { background:color-mix(in srgb,var(--accent) 18%,transparent); color:var(--accent); }
    .pick-cat { padding:14px 12px 6px; color:var(--muted); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }

    /* ── the open chat ───────────────────────────────────────────────────── */
    .main { display:flex; min-width:0; min-height:0; flex-direction:column; background:var(--main); position:relative; }
    .top { min-height:var(--bar); flex:0 0 var(--bar); display:flex; align-items:center; gap:12px; padding:0 10px 0 16px; border-bottom:1px solid var(--line); }
    .mobile-nav { display:none!important; }
    .top-avatar { width:40px; height:40px; flex:0 0 40px; border-radius:50%; overflow:hidden; display:grid; place-items:center; background:var(--input); font-size:13px; }
    .top-title { min-width:0; flex:1; display:grid; gap:1px; }
    .top .name { font-weight:700; font-size:16px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .presence { display:flex; align-items:center; gap:6px; color:var(--muted); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .status-dot { width:8px; height:8px; flex:0 0 8px; border-radius:50%; background:#8a8f98; }
    .status-dot.online { background:#35c46a; }
    .quick-mode { width:auto; max-width:124px; border-radius:999px; padding:6px 28px 6px 10px; font-size:12px; font-weight:650; background-color:var(--input); }
    .top-actions { display:flex; gap:2px; }

    .log { min-height:0; flex:1 1 0; overflow-y:auto; overflow-anchor:auto; padding:14px 18px 10px; display:flex; flex-direction:column; scroll-behavior:smooth; }
    .log > :first-child { margin-top:auto; } /* a short chat sits at the bottom, like a phone */
    .day { align-self:center; margin:12px 0 6px; padding:3px 11px; border-radius:999px; background:var(--input); color:var(--muted);
      font-size:11px; font-weight:650; }
    .intro { align-self:center; margin:auto 0 28px; padding:12px; display:grid; justify-items:center; gap:6px; max-width:460px; text-align:center; }
    .intro-avatar { width:92px; height:92px; border-radius:50%; overflow:hidden; display:grid; place-items:center; background:var(--input); font-size:28px; margin-bottom:6px; }
    .intro h2 { margin:0; font-size:20px; font-weight:750; }
    .intro p { margin:0; color:var(--muted); font-size:13px; line-height:1.5; }

    /* A message is a bubble. Theirs sit left with their avatar closing the run; yours
       sit right in the accent, with no avatar — you know who you are. Radii tighten on
       the side where a run continues, so a run reads as one voice speaking. */
    .msg { position:relative; display:grid; grid-template-columns:34px minmax(0,min(76%,680px)); gap:0 8px; align-items:end; margin-top:2px; }
    .msg.mine { grid-template-columns:minmax(0,min(76%,680px)); justify-content:end; }
    .msg.first { margin-top:10px; }
    .msg .avatar { width:34px; height:34px; border-radius:50%; overflow:hidden; display:grid; place-items:center; visibility:hidden; background:var(--input); font-size:11px; }
    .msg.last .avatar { visibility:visible; }
    .bubble-wrap { position:relative; min-width:0; display:grid; justify-items:start; }
    .msg.mine .bubble-wrap { justify-items:end; }
    .bubble { position:relative; min-width:0; max-width:100%; padding:8px 13px 6px; border-radius:18px; background:var(--bubble); }
    .msg.mine .bubble { background:var(--accent); color:var(--on-accent); }
    .msg.theirs:not(.last) .bubble { border-bottom-left-radius:6px; }
    .msg.theirs:not(.first) .bubble { border-top-left-radius:6px; }
    .msg.mine:not(.last) .bubble { border-bottom-right-radius:6px; }
    .msg.mine:not(.first) .bubble { border-top-right-radius:6px; }
    .text { white-space:pre-wrap; overflow-wrap:anywhere; }
    /* Roleplay prose is read by scanning for its parts — who spoke, what they did,
       what was stressed — so each keeps a hue of its own in their bubbles. In yours
       the bubble is already the accent, so the parts separate by weight instead. */
    .text .speech { color:var(--accent); font-weight:500; }
    .text .action { font-style:italic; font-weight:700;
      color:var(--md-sys-color-tertiary,color-mix(in srgb,var(--accent) 45%,var(--md-sys-color-on-surface))); }
    .text em { color:var(--md-sys-color-secondary,var(--muted)); font-style:italic; }
    .text code { background:var(--input); color:var(--md-sys-color-tertiary,var(--accent));
      padding:1px 4px; border-radius:3px; font-family:ui-monospace,"Cascadia Code",Consolas,monospace; font-size:.92em; }
    .text s { opacity:.55; }
    .msg.mine .text .speech,.msg.mine .text .action,.msg.mine .text em { color:inherit; }
    .msg.mine .text .speech { font-weight:600; }
    .msg.mine .text em { opacity:.85; }
    .msg.mine .text code { background:rgba(0,0,0,.18); color:inherit; }
    .meta { display:flex; justify-content:flex-end; align-items:center; gap:5px; margin-top:2px; font-size:10px; opacity:.6; line-height:1; }
    .sent-image { display:block; max-width:min(420px,100%); max-height:420px; border-radius:12px; margin-top:6px; object-fit:contain; background:var(--input); }
    /* A quoted reply: the earlier line sits above the new one on a bar, the way every
       messenger draws it. Clickable, because the point of a quote is to find what it
       quotes. In your own bubble the accent is the bubble, so the bar goes white. */
    .quote { display:grid; gap:1px; margin:0 0 6px; padding:5px 9px; border-left:3px solid var(--accent); border-radius:6px;
      background:color-mix(in srgb,var(--md-sys-color-on-surface) 7%,transparent); font-size:12.5px; cursor:pointer; text-align:left; border-top:0; border-right:0; border-bottom:0; color:inherit; width:100%; }
    .quote strong { font-size:11px; color:var(--accent); }
    .quote span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:.85; }
    .msg.mine .quote { border-left-color:rgba(255,255,255,.75); background:rgba(0,0,0,.16); }
    .msg.mine .quote strong { color:rgba(255,255,255,.9); }
    .msg.flash .bubble { animation:chat-flash 1.2s ease both; }
    /* Swipe to reply: the bubble follows the finger; the arrow behind it brightens
       when letting go will quote the message. */
    .msg { touch-action:pan-y; }
    .bubble-wrap.swiping { transition:none; }
    .bubble-wrap:not(.swiping) { transition:transform .18s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)); }
    .swipe-hint { position:absolute; left:-30px; top:50%; transform:translateY(-50%); font-size:20px; color:var(--muted); opacity:0; transition:opacity .15s; pointer-events:none; }
    .msg.mine .swipe-hint { left:-30px; }
    .bubble-wrap.swiping .swipe-hint { opacity:.5; }
    .bubble-wrap.will-reply .swipe-hint { opacity:1; color:var(--accent); }
    /* Receipts under your latest message. */
    .receipt { font-size:10.5px; color:var(--muted); margin:2px 6px 0; line-height:1; }
    .receipt.read { color:var(--accent); }
    /* Reactions: emoji tucked into the bubble's lower corner, overlapping the edge. */
    .reactions { position:absolute; bottom:-10px; right:8px; display:flex; gap:2px; }
    .msg.mine .reactions { right:auto; left:8px; }
    .reaction { border:1px solid var(--line); background:var(--surface,var(--bubble)); color:inherit; border-radius:999px; font-size:13px; line-height:1; padding:2px 6px; cursor:default; box-shadow:0 1px 2px rgba(0,0,0,.18); }
    .msg.theirs .reaction.user { cursor:pointer; }
    .msg:has(.reactions) .bubble { margin-bottom:8px; }
    .react-row { position:absolute; bottom:calc(100% + 6px); left:0; z-index:2; display:flex; gap:2px; padding:4px; border:1px solid var(--line); border-radius:999px; background:var(--surface,var(--bubble)); box-shadow:0 6px 18px rgba(0,0,0,.24); animation:chat-rise .18s ease both; }
    .msg.mine .react-row { left:auto; right:0; }
    .react-row button { border:0; background:transparent; font-size:20px; line-height:1; padding:5px 6px; border-radius:999px; cursor:pointer; transition:transform .12s; }
    .react-row button:hover { transform:scale(1.3); background:var(--hover); }
    .react-row button.on { background:var(--hover); }
    .react-row button.close { color:var(--muted); display:grid; place-items:center; }
    /* Snaps: a tile, never the picture. */
    .snap { display:grid; grid-template-columns:auto 1fr; grid-template-rows:auto auto; column-gap:10px; align-items:center; margin-top:6px; padding:10px 14px 10px 12px; border:0; border-radius:12px; cursor:pointer; text-align:left; font:inherit; color:inherit;
      background:linear-gradient(135deg,rgba(255,255,255,.14),rgba(255,255,255,.04)); box-shadow:inset 0 0 0 1.5px var(--accent); min-width:180px; }
    .snap .material-symbols-rounded { grid-row:1/3; font-size:28px; color:var(--accent); }
    .snap > span:not(.material-symbols-rounded) { font-weight:700; font-size:13px; }
    .snap em { font-style:normal; font-size:11px; opacity:.7; }
    .snap.opened { cursor:default; box-shadow:inset 0 0 0 1.5px var(--line); opacity:.6; grid-template-rows:auto; }
    .snap.opened .material-symbols-rounded { color:var(--muted); grid-row:auto; }
    .snap-viewer { position:fixed; inset:0; z-index:40; display:grid; place-items:center; background:rgba(0,0,0,.92); cursor:pointer; animation:chat-fade .2s ease both; }
    .snap-viewer img { max-width:100vw; max-height:100vh; object-fit:contain; }
    .snap-viewer p { color:#fff; }
    .snap-close { position:absolute; bottom:24px; left:0; right:0; text-align:center; color:rgba(255,255,255,.7); font-size:12px; }
    /* Send weights. */
    .image-card .weight { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--muted); }
    .shelf { margin:14px 0 8px; font-size:13px; font-weight:650; display:grid; gap:2px; }
    .shelf span { font-size:11px; font-weight:400; color:var(--muted); }
    .upload-row select.field { min-width:0; width:100%; }
    .image-card .weight select { font:inherit; font-size:11px; background:var(--surface,var(--input)); color:inherit; border:1px solid var(--line); border-radius:6px; padding:2px 4px; }
    .weights { margin-top:14px; }
    .weight-rows { display:grid; gap:4px; }
    .weight-row { display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:8px; padding:4px 0 4px 8px; border-radius:8px; background:var(--input); }
    .weight-tag { font-weight:600; overflow-wrap:anywhere; }
    .weight-row select { font:inherit; background:var(--surface,var(--bubble)); color:inherit; border:1px solid var(--line); border-radius:6px; padding:3px 6px; }
    .weight-add { display:flex; gap:6px; align-items:center; margin-top:8px; flex-wrap:wrap; }
    .weight-add .field { flex:1 1 90px; min-width:0; }
    .weight-suggest { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
    .weight-suggest .chip { border:1px solid var(--line); background:transparent; color:var(--muted); border-radius:999px; padding:3px 9px; font:inherit; font-size:11px; cursor:pointer; }
    .weight-suggest .chip:hover { color:inherit; background:var(--hover); }
    @keyframes chat-flash { 0%,100% { box-shadow:0 0 0 0 transparent; } 25% { box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 70%,transparent); } }
    /* Hover actions sit just above the bubble, on the side away from the edge. */
    .msg-actions { opacity:0; position:absolute; top:-14px; right:6px; z-index:1; display:flex; border:1px solid var(--line); border-radius:8px;
      overflow:hidden; background:var(--main); box-shadow:0 2px 8px rgba(0,0,0,.18); transition:opacity .12s ease; }
    .msg.mine .msg-actions { right:auto; left:6px; }
    .msg:hover .msg-actions,.msg:focus-within .msg-actions { opacity:1; }
    .msg-actions button { border:0; background:transparent; padding:5px; cursor:pointer; color:var(--muted); display:grid; }
    .msg-actions button:hover { color:inherit; background:var(--hover); }
    /* Something she thought, or muttered to herself. It has to be impossible to read
       as a message to you, so it shares none of a message's furniture: no bubble, no
       avatar, and it sits in the middle the way a system line does. An overheard
       mutter is drawn warmer than a private thought, since one of them reached you. */
    .thought { align-self:center; max-width:min(72%,560px); margin:8px 0 2px; text-align:center; font-size:13px; font-style:italic;
      color:color-mix(in srgb,var(--md-sys-color-on-surface) 68%,transparent);
      animation:chat-rise .3s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; }
    .thought-label { display:flex; justify-content:center; align-items:center; gap:5px; font-style:normal; font-size:11px; color:var(--muted); margin-bottom:2px; }
    .thought-label .material-symbols-rounded { font-size:15px; }
    .thought.aloud { font-style:normal; color:color-mix(in srgb,var(--md-sys-color-on-surface) 84%,transparent); }
    .thought.aloud .thought-label .material-symbols-rounded { color:var(--md-sys-color-tertiary,var(--accent)); }
    .typing-row .bubble { padding:11px 14px; }
    .dots { display:inline-flex; gap:4px; }
    .dots i { width:7px; height:7px; border-radius:50%; background:var(--muted); animation:chat-bounce 1.1s infinite ease-in-out; }
    .dots i:nth-child(2) { animation-delay:.16s; } .dots i:nth-child(3) { animation-delay:.32s; }
    @keyframes chat-bounce { 0%,60%,100% { transform:translateY(0); opacity:.55; } 30% { transform:translateY(-4px); opacity:1; } }
    @keyframes chat-rise { from { opacity:0; transform:translateY(8px); } }
    @keyframes chat-fade { from { opacity:0; } }
    @keyframes chat-sprite-in { from { opacity:0; transform:translateY(10px) scale(.985); } }
    /* Only the run-opening row animates. Lit reuses a row's DOM across renders, so
       this fires when a message is appended and not on every state change. */
    .msg.first,.typing-row { animation:chat-rise .26s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; }
    .sent-image { animation:chat-fade .35s ease both; }
    .intro { animation:chat-rise .34s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; }

    /* ── composer ────────────────────────────────────────────────────────── */
    form.composer-form { padding:8px 14px 12px; border-top:1px solid var(--line); background:var(--main); }
    .composer { display:flex; align-items:flex-end; gap:8px; }
    .box { flex:1; min-width:0; display:flex; align-items:flex-end; gap:4px; background:var(--input); border:1px solid transparent; border-radius:22px; padding:6px 6px 6px 8px; }
    .box:focus-within { border-color:color-mix(in srgb,var(--accent) 55%,transparent); }
    .composer textarea { resize:none; border:0; outline:0; background:transparent; color:inherit; max-height:160px; min-height:24px; line-height:24px; flex:1; padding:6px 6px; }
    .attach-btn { position:relative; width:36px; height:36px; flex:0 0 36px; display:grid; place-items:center; border-radius:50%; color:var(--muted); cursor:pointer; }
    .attach-btn:hover { color:var(--md-sys-color-on-surface); background:var(--hover); }
    .attach-btn.off { opacity:.4; pointer-events:none; }
    .attach-btn input { position:absolute; inset:0; opacity:0; cursor:pointer; }
    .attach-btn.off input { cursor:default; }
    .send { width:42px; height:42px; flex:0 0 42px; border:0; border-radius:50%; background:var(--accent); color:var(--on-accent); display:grid; place-items:center; cursor:pointer;
      transition:transform .12s var(--oppai-ease-spring,cubic-bezier(.34,1.4,.64,1)),opacity .12s ease; }
    .send:disabled { opacity:.35; cursor:default; }
    .send:not(:disabled):active { transform:scale(.9); }
    .format-help { color:var(--muted); font-size:10px; padding:5px 6px 0; display:flex; justify-content:space-between; }
    .send-help::after { content:"Enter to send · Shift+Enter for a new line"; }
    /* Attached photo, held in the composer until the message is sent. */
    .attachment { display:flex; align-items:center; gap:10px; margin:0 0 8px; padding:8px; border:1px solid var(--line);
      border-radius:14px; background:var(--input); }
    .attachment img { width:44px; height:44px; flex:0 0 44px; border-radius:9px; object-fit:cover; }
    .attachment-copy { min-width:0; flex:1; display:grid; }
    .attachment-copy strong { font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .attachment-copy span { color:var(--muted); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    /* The link found in the box, previewed before the message goes. Deliberately text
       only: nothing here renders the page, and the address is shown plainly so where
       the link goes is visible rather than hidden behind whatever it called itself. */
    .link-preview .link-icon { width:44px; flex:0 0 44px; text-align:center; color:var(--muted); }
    .link-preview .link-host { color:var(--muted); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    /* What the next message answers, and what it carries. Both sit above the box the
       way a messenger stacks them, each with its own close. */
    .reply-preview { border-left:3px solid var(--accent); }
    .reply-preview .link-icon { color:var(--accent); }
    .items-preview { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 8px; }
    .item-chip { display:flex; align-items:center; gap:6px; padding:4px 6px 4px 4px; border:1px solid var(--line); border-radius:10px; background:var(--side); font-size:12px; max-width:100%; }
    .item-chip img,.item-chip .chip-icon { width:28px; height:28px; border-radius:6px; object-fit:cover; flex:0 0 28px; display:grid; place-items:center; background:var(--input); color:var(--muted); }
    .item-chip .chip-icon .material-symbols-rounded { font-size:18px; }
    .item-chip strong { font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px; }
    .item-chip button { border:0; background:transparent; color:var(--muted); cursor:pointer; display:grid; padding:2px; border-radius:50%; }
    .item-chip button:hover { color:inherit; background:var(--hover); }
    /* The library picker: a sheet over the log, search on top, a grid of what matched. */
    .picker { position:absolute; inset:0; z-index:55; display:grid; place-items:center; background:rgba(0,0,0,.45); animation:chat-fade .15s ease both; }
    .picker-card { width:min(720px,94%); max-height:min(80%,640px); display:flex; flex-direction:column; border-radius:18px; background:var(--main); box-shadow:0 20px 60px rgba(0,0,0,.4); overflow:hidden; }
    .picker-head { display:flex; align-items:center; gap:8px; padding:12px 12px 8px 16px; }
    .picker-head input { flex:1; min-width:0; border:0; outline:0; border-radius:999px; padding:9px 14px; background:var(--input); color:inherit; }
    .picker-grid { flex:1; min-height:0; overflow:auto; display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:8px; padding:6px 16px 16px; }
    .picker-tile { position:relative; border:2px solid transparent; border-radius:12px; overflow:hidden; background:var(--input); cursor:pointer; aspect-ratio:1; display:grid; padding:0; color:inherit; }
    .picker-tile img { width:100%; height:100%; object-fit:cover; grid-area:1/1; }
    .picker-tile .tile-kind { grid-area:1/1; place-self:center; color:var(--muted); font-size:34px; }
    .picker-tile .tile-name { grid-area:1/1; align-self:end; padding:18px 7px 6px; font-size:11px; text-align:left; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      background:linear-gradient(to top,rgba(0,0,0,.75),transparent); }
    .picker-tile.on { border-color:var(--accent); }
    .picker-tile.on::after { content:"check"; font-family:"Material Symbols Rounded"; position:absolute; top:6px; right:6px; width:22px; height:22px; border-radius:50%; background:var(--accent); color:var(--on-accent); display:grid; place-items:center; font-size:16px; }
    .picker-foot { display:flex; align-items:center; gap:8px; padding:10px 16px; border-top:1px solid var(--line); color:var(--muted); font-size:12px; }
    .picker-foot .autobar-btn { margin-left:auto; }
    .picker-empty { grid-column:1/-1; padding:30px; text-align:center; color:var(--muted); font-size:13px; }

    /* ── autopilot ───────────────────────────────────────────────────────── */
    .autobar { display:flex; align-items:center; gap:9px; padding:8px 16px; font-size:12px;
      border-bottom:1px solid var(--line); background:color-mix(in srgb,var(--accent) 12%,var(--side));
      animation:chat-rise .24s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; }
    .autobar.idle { background:var(--side); color:var(--muted); }
    .autobar .material-symbols-rounded { font-size:18px; color:var(--accent); }
    .autobar.idle .material-symbols-rounded { color:var(--muted); animation:none; }
    .autobar:not(.idle) .material-symbols-rounded { animation:chat-bounce 2.4s infinite ease-in-out; }
    .autobar-copy { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .autobar-btn { border:1px solid var(--line); border-radius:999px; padding:3px 11px; background:transparent;
      color:inherit; font-size:11px; font-weight:650; cursor:pointer; }
    .autobar-btn:hover { background:var(--hover); }

    /* ── portrait stage ──────────────────────────────────────────────────── */
    /* The column is a scene, not a strip with a picture at the top of it. The room
       she is in (the call's background, when there is one) fills it behind her, the
       sprite stands in it as large as the column allows, and what there is to say
       about her — who she is, what she is feeling and doing, where, how warm the
       conversation has run — sits on a frosted card at the foot, the way a video
       call overlays the person rather than putting a caption under a frame. */
    .stage { position:relative; min-width:0; display:flex; flex-direction:column; background:var(--side); border-left:1px solid var(--line); overflow:hidden; }
    .stage-scene { position:relative; flex:1; min-height:0; isolation:isolate; overflow:hidden; }
    .stage-bg { position:absolute; inset:-3%; background-size:cover; background-position:center; z-index:0; }
    .stage-bg.room { filter:blur(10px) saturate(1.05) brightness(.7); transform:scale(1.04); }
    /* No room chosen: a drawn one rather than a gradient void. A wall lit from above,
       a floor line two-thirds down with a darker floor beneath, and a window's worth
       of light off to one side — enough that she stands *somewhere* rather than
       hanging in brown fog, without competing with the art. */
    .stage-bg.plain { background:
      radial-gradient(80% 42% at 50% 6%,color-mix(in srgb,var(--accent) 34%,transparent),transparent 72%),
      radial-gradient(55% 30% at 22% 72%,color-mix(in srgb,var(--accent) 22%,transparent),transparent 70%),
      linear-gradient(to bottom,color-mix(in srgb,var(--main) 78%,var(--side)) 0%,color-mix(in srgb,var(--main) 30%,var(--side)) 71%,
        color-mix(in srgb,#000 24%,var(--side)) 71.2%,color-mix(in srgb,#000 42%,var(--side)) 100%); }
    .stage-bg.plain::before { content:""; position:absolute; left:8%; top:8%; width:28%; height:48%; border-radius:8px 8px 3px 3px;
      background:linear-gradient(170deg,rgba(255,222,184,.62) 0%,rgba(255,196,150,.28) 48%,rgba(255,255,255,.05) 100%);
      box-shadow:inset 0 0 0 2px rgba(255,255,255,.16),inset 0 0 40px rgba(255,255,255,.1),0 0 80px rgba(255,190,140,.22); }
    /* The veil is for a photographed room; the drawn one is dim enough already. */
    .stage-bg.plain + .stage-veil { opacity:.55; }
    .stage-bg.plain::after { content:""; position:absolute; left:0; right:0; top:71%; height:2px;
      background:linear-gradient(to right,transparent,color-mix(in srgb,var(--accent) 50%,transparent) 25%,color-mix(in srgb,var(--accent) 50%,transparent) 75%,transparent); opacity:.7; }
    .stage-veil { position:absolute; inset:0; z-index:0; pointer-events:none;
      background:linear-gradient(to bottom,rgba(0,0,0,.28),transparent 22%,transparent 58%,rgba(0,0,0,.55)); }
    /* A soft pool of light where she stands, so she reads as *in* the room. */
    .stage-floor { position:absolute; left:0; right:0; bottom:40px; height:46%; z-index:0; pointer-events:none;
      background:radial-gradient(60% 70% at 50% 100%,color-mix(in srgb,var(--accent) 32%,transparent),transparent 72%); opacity:.9; }
    /* Where she stands: a pool of shadow on the floor under her, so the figure has
       weight. It breathes with her, faintly, through the same wrapper animation. */
    .stage-ground { position:absolute; left:50%; bottom:96px; width:62%; height:26px; transform:translateX(-50%); z-index:0; pointer-events:none;
      background:radial-gradient(50% 50% at 50% 50%,rgba(0,0,0,.55),rgba(0,0,0,.25) 45%,transparent 72%); filter:blur(2px); }
    /* The sprite wrapper carries the idle breathing and the sprite itself carries the
       per-line reaction, so a rock into a new message does not cancel the idle loop.
       The art is a cowboy shot — head to mid-thigh, 1024×1344 — kept whole (contain)
       and as large as the scene allows, standing on the card rather than behind it:
       the card overlaps her thighs, which the shot ends at anyway. */
    .stage-art { position:absolute; inset:36px 8px 74px; z-index:1; display:grid; place-items:end center; }
    .stage-art .sprite-hold { display:grid; place-items:end center; width:100%; height:100%; transform-origin:50% 100%; }
    /* Stood on the floor line, and the cut edge of the shot dissolved into the card
       rather than ending in a hard line — that hard line is what made her float. */
    .stage-art .sprite { width:100%; height:100%; object-fit:contain; object-position:center bottom;
      transform-origin:50% 100%; filter:drop-shadow(0 14px 30px rgba(0,0,0,.5));
      -webkit-mask-image:linear-gradient(to bottom,#000 82%,transparent 99%); mask-image:linear-gradient(to bottom,#000 82%,transparent 99%); }
    .stage-art.empty-art { place-items:center; gap:8px; align-content:center; padding:16px; text-align:center; color:var(--muted); font-size:12px; }
    .stage-art.empty-art .material-symbols-rounded { font-size:44px; opacity:.5; }
    /* Her typing, shown on her rather than only in the log: a speech bubble of dots
       up by her head, with a tail — and, between replies, her last line in the same
       place, so the column reads as her talking rather than a still. */
    .stage-bubble { position:absolute; top:10px; right:10px; max-width:70%; padding:9px 12px; border-radius:16px; border-bottom-left-radius:4px; background:var(--bubble);
      box-shadow:0 3px 10px rgba(0,0,0,.22); animation:chat-rise .2s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; z-index:2; }
    .stage-bubble::after { content:""; position:absolute; left:-6px; bottom:6px; border:7px solid transparent; border-right-color:var(--bubble); border-left:0; }
    .stage-bubble.quote { font-size:12px; line-height:1.35; color:var(--md-sys-color-on-surface); }
    /* The card at the foot. */
    .stage-glass { position:absolute; left:10px; right:10px; bottom:10px; z-index:3; display:grid; gap:7px; padding:10px 12px 11px; border-radius:16px;
      background:color-mix(in srgb,var(--main) 72%,transparent); backdrop-filter:blur(12px) saturate(1.2); border:1px solid color-mix(in srgb,var(--line) 70%,transparent);
      box-shadow:0 10px 30px rgba(0,0,0,.3); }
    .stage-who { display:flex; align-items:center; gap:8px; min-width:0; }
    .stage-name { font-weight:750; font-size:15px; color:var(--md-sys-color-on-surface); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .stage-status { flex:1; min-width:0; color:var(--muted); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .stage-chips { display:flex; flex-wrap:wrap; gap:5px; }
    .stage-chip { display:inline-flex; align-items:center; gap:4px; padding:3px 9px 3px 7px; border-radius:999px; background:var(--input); font-size:11px; font-weight:650; letter-spacing:.01em; color:var(--md-sys-color-on-surface); }
    .stage-chip .material-symbols-rounded { font-size:14px; color:var(--accent); }
    .stage-chip.doing { background:color-mix(in srgb,var(--accent) 18%,var(--input)); }
    /* The heat run: five segments, filled to the meter, warming in colour as it climbs. */
    .stage-heat { display:flex; align-items:center; gap:6px; font-size:10.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; }
    .stage-heat .segs { display:flex; gap:3px; flex:1; }
    .stage-heat i { flex:1; height:4px; border-radius:2px; background:var(--line); transition:background .3s ease; }
    .stage-heat i.on { background:var(--accent); }
    .stage-heat.h4 i.on { background:color-mix(in srgb,var(--accent) 60%,#ff7a3d); }
    .stage-heat.h5 i.on { background:color-mix(in srgb,var(--accent) 35%,#ff3d5a); }
    /* Tools, shown on hover: the actions the column is for. */
    .stage-tools { position:absolute; top:8px; right:8px; z-index:4; display:flex; gap:2px; padding:3px; border-radius:999px;
      background:color-mix(in srgb,var(--main) 70%,transparent); backdrop-filter:blur(8px); opacity:0; transition:opacity .15s ease; }
    .stage:hover .stage-tools,.stage:focus-within .stage-tools { opacity:1; }
    .stage-tools .icon-btn { width:32px; height:32px; }
    .stage-tools .icon-btn .material-symbols-rounded { font-size:19px; }
    .stage .call-tray { right:10px; left:10px; bottom:118px; width:auto; }
    /* Drag the column's edge to size it; the width is kept per device. */
    .stage-grip { position:absolute; left:-3px; top:0; bottom:0; width:7px; cursor:col-resize; z-index:5; }
    .stage-grip:hover,.stage-grip.dragging { background:color-mix(in srgb,var(--accent) 40%,transparent); }
    /* Under this width the column goes and the banner below takes over: same art,
       same reactions, along the top of the conversation instead of beside it. */
    @media(max-width:960px){ .client.with-stage { grid-template-columns:var(--side-w) minmax(0,1fr); } .stage { display:none; } .client.with-stage .hero { display:block; } }

    /* ── the banner ──────────────────────────────────────────────────────── */
    /* Her bust along the top of the chat, for screens with no room for the column.
       The sprite is drawn at a fixed width and the box crops it at the chest, which
       on a cowboy shot is a head-and-shoulders framing rather than a figure shrunk to
       fit. Tapping it opens the call, where all of her fits. */
    .hero { position:relative; display:none; height:124px; flex:0 0 auto; overflow:hidden; border-bottom:1px solid var(--line); cursor:pointer;
      background:radial-gradient(120% 160% at 84% 10%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 62%),var(--side); }
    .hero-hold { position:absolute; right:10px; top:4px; width:156px; height:100%; transform-origin:50% 100%; }
    .hero-sprite { width:100%; height:auto; display:block; object-fit:contain; object-position:top center;
      transform-origin:50% 100%; filter:drop-shadow(0 6px 16px rgba(0,0,0,.4)); }
    .hero-copy { position:absolute; left:16px; right:180px; bottom:12px; display:grid; gap:3px; min-width:0; }
    .hero-name { font-weight:750; font-size:16px; color:var(--accent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .hero-status { font-size:12px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .stage-doing { margin:0 auto; padding:3px 11px; border-radius:999px; background:var(--input); font-size:11px; font-weight:650; letter-spacing:.02em; opacity:.85; }
    .hero .stage-doing { margin:0; justify-self:start; }
    .hero-bubble { position:absolute; right:168px; top:16px; padding:8px 11px; border-radius:16px; border-bottom-right-radius:4px; background:var(--bubble);
      box-shadow:0 3px 10px rgba(0,0,0,.22); animation:chat-rise .2s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; z-index:2; }
    .hero-bubble::after { content:""; position:absolute; right:-6px; bottom:6px; border:7px solid transparent; border-left-color:var(--bubble); border-right:0; }
    .hero-open { position:absolute; right:10px; bottom:8px; z-index:2; display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:999px;
      background:rgba(0,0,0,.35); color:#fff; font-size:11px; font-weight:650; backdrop-filter:blur(4px); }
    .hero-open .material-symbols-rounded { font-size:14px; }
    .notice { margin:0 16px 8px; padding:9px 12px; border-left:3px solid var(--accent); background:var(--side); border-radius:9px; font-size:13px; }
    .notice.error { border-color:var(--md-sys-color-error); color:var(--md-sys-color-error); }
    .backend-state { padding:9px 16px; border-bottom:1px solid var(--line); background:var(--side); color:var(--muted); font-size:12px; }
    .backend-state strong { color:var(--md-sys-color-error); }
    .backend-state.load-error { display:flex; align-items:center; flex-wrap:wrap; gap:8px;
      border-left:3px solid var(--md-sys-color-error); }
    .backend-state.load-error .autobar-btn { margin-left:auto; }
    .load-failed { grid-column:1/-1; padding:24px; display:grid; gap:10px; justify-items:start; align-content:start; }
    .load-failed h2 { margin:0; font-size:18px; }
    .load-failed p { margin:0; color:var(--muted); overflow-wrap:anywhere; }
    .load-failed .hint { font-size:12px; }
    /* Settings read as their own room, the way Discord's do: a category rail on the
       left, one panel on the right, and no tab strip competing with the header. */
    .settings { position:absolute; inset:var(--bar) 0 0 0; z-index:5; display:grid; grid-template-columns:212px minmax(0,1fr);
      overflow:hidden; background:var(--main); box-shadow:0 10px 28px rgba(0,0,0,.28);
      animation:chat-fade .16s ease both; }
    .settings-nav { display:flex; flex-direction:column; gap:2px; padding:14px 8px; overflow-y:auto; background:var(--side); }
    .nav-cat { padding:12px 10px 4px; color:var(--muted); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
    .nav-row { display:flex; align-items:center; gap:10px; border:0; border-radius:5px; padding:8px 10px; background:transparent;
      color:var(--muted); font-size:14px; font-weight:550; text-align:left; cursor:pointer; transition:background .12s ease,color .12s ease; }
    .nav-row span:last-child { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .nav-row .material-symbols-rounded { font-size:18px; }
    .nav-row:hover { background:var(--hover); color:var(--md-sys-color-on-surface); }
    .nav-row.on { background:var(--hover); color:var(--md-sys-color-on-surface); }
    .nav-sep { height:1px; margin:8px 10px; background:var(--line); }
    .settings-body { min-width:0; overflow-y:auto; background:var(--main); }
    .settings-head { position:sticky; top:0; z-index:2; display:flex; align-items:center; gap:8px; padding:16px 16px 10px; background:var(--main); }
    .settings-head strong { flex:1; font-size:19px; }.settings-head span { display:block; color:var(--muted); font-size:11px; font-weight:400; }
    /* Capped rather than full-bleed: settings are a reading column, and stretched
       across a wide desktop the label/control pairs drift far apart. */
    .panel { padding:14px 16px 22px; display:grid; gap:16px; max-width:760px; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .group { display:grid; gap:11px; padding:14px; border:1px solid var(--line); border-radius:10px; background:var(--main); }
    .group h3 { margin:0; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); display:grid; gap:3px; }
    .group h3 span { font-size:11px; font-weight:400; text-transform:none; letter-spacing:0; }
    details summary { cursor:pointer; color:var(--muted); font-size:12px; padding:2px 0; }
    details[open] summary { margin-bottom:6px; }
    label { display:grid; gap:4px; color:var(--muted); font-size:11px; font-weight:650; text-transform:uppercase; }.field,select { box-sizing:border-box; width:100%; color:var(--md-sys-color-on-surface);
      background:var(--input); border:1px solid var(--line); border-radius:5px; padding:8px; outline:0; text-transform:none; font-weight:400; }
    textarea.field { min-height:66px; resize:vertical; }.range { display:grid; grid-template-columns:1fr 48px; gap:8px; align-items:center; }.range input { accent-color:var(--accent); }.range output { text-align:right; color:inherit; }
    /* "auto" beside a slider the server is still choosing for. Inline so it sits on the
       caption line rather than becoming a second grid row under it. */
    .grid label .hint { display:inline; margin-left:5px; color:var(--accent); font-weight:600; letter-spacing:.02em; }
    .sampling { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px;
      font-size:12px; color:var(--muted); text-transform:none; }
    .sampling strong { color:var(--md-sys-color-on-surface); font-weight:650; }
    .mem-panel { display:grid; gap:8px; border-top:1px solid var(--line); padding-top:16px; }
    /* Her states, on the world panel: a chip a state, the heat floor as a small
       number, and greyed where the worn outfit has not drawn it. */
    .state-row { display:flex; flex-wrap:wrap; gap:6px; }
    .state-row.intimate { padding-top:6px; border-top:1px dashed var(--line); }
    .state-chip { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:999px; background:var(--input); font-size:12px; font-weight:600; color:var(--md-sys-color-on-surface); }
    .state-chip i { font-style:normal; font-size:10px; font-weight:700; padding:0 5px; border-radius:999px; background:color-mix(in srgb,var(--accent) 22%,transparent); color:var(--accent); }
    .state-chip.default-art { opacity:.55; }
    .panel .link-btn { border:0; background:none; padding:0; color:var(--accent); font:inherit; cursor:pointer; text-decoration:underline; }
    .panel oppai-libby-backgrounds { --oppai-surface: var(--input); --oppai-surface-2: var(--side); --oppai-border: var(--line); --oppai-border-strong: var(--muted);
      --oppai-text: var(--md-sys-color-on-surface); --oppai-text-dim: var(--md-sys-color-on-surface); --oppai-text-muted: var(--muted);
      --oppai-primary: var(--accent); --oppai-on-primary: var(--on-accent); }
    .mem-list { list-style:none; margin:0; padding:0; display:grid; gap:6px; }
    .mem-list li { display:flex; align-items:flex-start; gap:8px; background:var(--side); border-radius:8px; padding:8px 10px; font-size:13px; }
    .mem-list li span { flex:1; }
    /* The reference pictures: a title that opens the picture, and two quiet actions. */
    .mem-list .link-btn { flex:1; min-width:0; text-align:left; border:0; background:none; padding:0; color:inherit; font:inherit; cursor:pointer;
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .mem-list .link-btn:hover { color:var(--accent); text-decoration:underline; }
    .mem-list .mem-acts { flex:none; display:inline-flex; gap:4px; }
    .mem-act { border:1px solid var(--line); border-radius:999px; padding:2px 8px; background:transparent; color:var(--muted); font-size:11px; cursor:pointer; }
    .mem-act:hover { color:var(--accent); border-color:var(--accent); }
    .mem-act.danger:hover { color:var(--md-sys-color-error); border-color:var(--md-sys-color-error); }
    .mem-forget { flex:none; border:0; border-radius:6px; padding:3px; background:transparent; color:var(--muted); cursor:pointer; display:flex; }
    .mem-forget:hover { color:var(--md-sys-color-error); background:var(--main); }
    /* Only the last of the three per-memory buttons is destructive, so the error colour is
       scoped to it — a pin turning red on hover reads as "this will delete it". */
    .mem-forget:not(:last-child):hover { color:var(--accent); }
    /* A pinned memory shows it at rest, not only on hover: it is a state, not an action. */
    .mem-forget.pinned { color:var(--accent); }
    .mem-tags { display:inline-flex; flex-wrap:wrap; gap:4px; margin-left:6px; vertical-align:middle; }
    .mem-kind { font-style:normal; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em;
      border-radius:4px; padding:1px 5px; background:var(--main); color:var(--muted); }
    .mem-kind.boundary { color:var(--md-sys-color-error); }
    .mem-kind.unsure { color:var(--muted); font-style:italic; }
    .mem-kind.mine { color:var(--accent); }
    .mem-list li.mem-editing { display:grid; gap:6px; }
    .mem-add { display:grid; grid-template-columns:1fr auto; gap:6px; align-items:center; }
    /* A checkbox and its wording on one line — the generic label rule stacks them. */
    .mem-toggle { display:flex; align-items:center; gap:8px; text-transform:none; font-size:13px; font-weight:400;
      color:var(--md-sys-color-on-surface); cursor:pointer; }
    .mem-toggle input { accent-color:var(--accent); margin:0; }
    details summary { cursor:pointer; color:var(--muted); font-size:12px; padding:4px 0; }
    .panel-actions { display:flex; flex-wrap:wrap; gap:7px; }.primary,.secondary,.danger { border:1px solid var(--line); border-radius:5px; padding:7px 11px; cursor:pointer; background:transparent; }
    .primary { background:var(--accent); border-color:var(--accent); color:var(--on-accent); }.danger { color:var(--md-sys-color-error); }    /* A span, not a label: the generic label rule sets display:grid and an
       uppercase caption, which fought the button styling and misaligned the old
       upload control. The transparent input covers the span, so a click on the
       chip is a click on the input. */
    .pfp-row { display:grid; grid-template-columns:80px minmax(0,1fr); gap:14px; align-items:center; }
    .pfp { width:80px; height:80px; border-radius:50%; overflow:hidden; background:var(--input); display:grid; place-items:center; }
    .pfp img { width:100%; height:100%; object-fit:cover; object-position:top center; display:block; }
    .pfp-initial { font-size:24px; font-weight:700; color:var(--on-accent); background:var(--accent); width:100%; height:100%; display:grid; place-items:center; }
    /* The character card reuses avatar() for its preview, which brings its own
       .initial fallback rather than the .pfp-initial span the profile panel uses. */
    .pfp.initial { font-size:24px; }
    .pfp-actions { display:grid; gap:5px; justify-items:start; }.pfp-actions strong { font-size:14px; }
    /* Three cells that wrap: the tags field and the subject select share a row when
       there is room, and the upload button takes a row of its own when there is not.
       The panel is narrow whenever the portrait is open, which is most of the time. */
    .upload-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; align-items:end; }
    .upload-row label { display:grid; gap:4px; min-width:0; }
    .file-btn { position:relative; overflow:hidden; display:inline-grid; place-items:center; white-space:nowrap;
      border:1px solid var(--line); border-radius:5px; padding:9px 12px; cursor:pointer; font-size:13px; }
    .file-btn:hover { background:var(--hover); }
    .file-btn input { position:absolute; inset:0; opacity:0; cursor:pointer; font-size:0; }
    @media(max-width:700px){ .upload-row { grid-template-columns:1fr; } }
    .image-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:9px; }.image-card { background:var(--input); border-radius:7px; overflow:hidden; position:relative; }
    .image-card img { width:100%; height:110px; object-fit:cover; display:block; }
    .image-card .card-body { padding:6px; font-size:11px; overflow-wrap:anywhere; display:grid; gap:5px; justify-items:start; }
    .image-card .card-name { font-weight:600; overflow-wrap:anywhere; }.image-card .card-tags { color:var(--muted); }
    /* Scoped to the remove control. This used to select .image-card button, which
       also caught the "Use avatar" button in the card body and stacked it on top
       of the delete control in the same absolute corner. */
    .image-card .remove { position:absolute; right:4px; top:4px; width:22px; height:22px; display:grid; place-items:center;
      border:0; border-radius:50%; background:rgba(0,0,0,.7); color:white; cursor:pointer; line-height:1; }
    .image-card .remove:hover { background:var(--md-sys-color-error); }
    .image-card .card-body button { border:1px solid var(--line); border-radius:5px; padding:4px 8px; background:transparent; cursor:pointer; }
    .badge { background:var(--accent); color:var(--on-accent); border-radius:3px; padding:1px 5px; font-size:10px; font-weight:700; }
    .empty { color:var(--muted); font-size:13px; }
    /* Model deletion. Deliberately shows facts rather than asking "are you sure": a
       model is gigabytes over someone's connection, and that is not a question anyone
       can answer without the path, the size and the file list. */
    .model-delete { margin-top:10px; padding:12px; border-radius:12px; background:var(--oppai-surface-2); display:flex; flex-direction:column; gap:10px; }
    .model-delete > strong { font-size:13px; }
    .model-delete-facts { display:flex; flex-direction:column; gap:5px; font-size:12px; }
    .model-delete-facts > div { display:flex; gap:8px; align-items:baseline; }
    .model-delete-facts span { min-width:46px; color:var(--oppai-text-muted); text-transform:uppercase; font-size:10px; letter-spacing:.05em; }
    /* A model path can be long and there is no useful way to shorten one, so it wraps
       rather than making the panel scroll sideways. */
    .model-delete code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11px; word-break:break-all; }
    .model-delete-files { margin:8px 0 0; padding-left:18px; max-height:150px; overflow-y:auto; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11px; line-height:1.6; }
    /* A checkbox with its explanation beside it, used by the profile's memory consent
       and the model-delete confirmation. Text-transform is reset because these sit
       inside <label>s the panel otherwise uppercases. */
    .inline-check { display:flex; gap:8px; align-items:flex-start; font-size:12px; text-transform:none; letter-spacing:normal; }
    .inline-check input { margin-top:2px; flex-shrink:0; }
    .empty.error { color:var(--md-sys-color-error); }
    .send.stop { background:var(--md-sys-color-error); color:var(--md-sys-color-on-error); }
    .loader,.samplers { border:1px solid var(--line); border-radius:12px; padding:8px 12px; display:grid; gap:10px; }
    .loader summary,.samplers summary { cursor:pointer; font-size:12px; font-weight:650; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); display:flex; gap:8px; align-items:center; }
    .loader summary .hint,.samplers summary .hint { margin-left:auto; text-transform:none; letter-spacing:normal; font-weight:500; }
    .loader details { display:grid; gap:10px; }
    .loader details summary { font-weight:600; }
    .loader-grid { grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); }
    .loader-check { align-self:end; padding-bottom:8px; }
    .loader code,.samplers code { font-size:11px; }
    .lora-list { display:grid; gap:4px; }
    .model-row { display:flex; align-items:center; gap:9px; }.model-row strong { min-width:0; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; text-transform:none; }
    @media(max-width:1000px){ :host { --side-w:300px; } }
    @media(max-width:700px){
      /* A phone shows one screen at a time: the list, or the chat with a back arrow. */
      .client{display:block;height:100%;min-height:0}.main{height:100%}
      .side{display:none;position:absolute;inset:0;z-index:12;width:100%;border-right:0}
      .client.nav-open .side{display:flex}
      .mobile-nav{display:grid!important}.top{padding-left:6px;gap:8px}.quick-mode{max-width:96px;padding-left:8px}.grid{grid-template-columns:1fr}
      .msg{grid-template-columns:28px minmax(0,84%)}.msg.mine{grid-template-columns:minmax(0,84%)}.msg .avatar{width:28px;height:28px}
      .log{padding:10px 10px 8px}.destructive-action{display:none}.format-help{display:none}
      /* Long-press opens the message menu on a phone; a row of buttons under every bubble is noise. */
      .msg-actions{display:none}
      .intro{margin-bottom:16px}.panel{padding-left:12px;padding-right:12px}
      /* No room for a rail: the categories become a scrolling strip above the panel. */
      .settings{inset:var(--bar) 0 0;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr)}
      .settings-nav{flex-direction:row;align-items:center;gap:4px;padding:8px;overflow-x:auto;overflow-y:hidden;border-bottom:1px solid var(--line)}
      .nav-cat,.nav-sep,.nav-row.close{display:none}
      .nav-row{flex:0 0 auto;padding:7px 12px;border-radius:999px}
      .pfp-row{grid-template-columns:64px minmax(0,1fr)}.pfp{width:64px;height:64px}
      .call-caption{max-width:100%}
    }
    /* She is ringing you. A notification, not a screen: it floats over whatever you
       were doing, rings for a while, and either you pick up or it stops. */
    .incoming { position:absolute; top:14px; left:50%; transform:translateX(-50%); z-index:70; display:flex; align-items:center; gap:12px;
      padding:10px 12px 10px 10px; border-radius:20px; background:var(--side); border:1px solid var(--line); box-shadow:0 14px 40px rgba(0,0,0,.35);
      animation:chat-rise .25s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; max-width:calc(100% - 28px); }
    .incoming .avatar { width:46px; height:46px; flex:0 0 46px; border-radius:50%; overflow:hidden; display:grid; place-items:center; animation:call-ring 1.3s ease-out infinite; }
    @keyframes call-ring { 0% { box-shadow:0 0 0 0 color-mix(in srgb,var(--accent) 60%,transparent); } 100% { box-shadow:0 0 0 14px transparent; } }
    .incoming-copy { display:grid; gap:1px; min-width:0; }
    .incoming-copy strong { font-size:14px; }
    .incoming-copy span { font-size:12px; color:var(--muted); }
    .incoming-btn { width:42px; height:42px; flex:0 0 42px; border:0; border-radius:50%; display:grid; place-items:center; cursor:pointer; color:#fff; }
    .incoming-btn.yes { background:#2fb35a; animation:call-nudge 1.3s ease-in-out infinite; }
    .incoming-btn.no { background:var(--md-sys-color-error); color:var(--md-sys-color-on-error,#fff); }
    @keyframes call-nudge { 0%,100% { transform:rotate(0); } 15% { transform:rotate(-12deg); } 30% { transform:rotate(10deg); } 45% { transform:rotate(0); } }

    /* ── video call ──────────────────────────────────────────────────────── */
    /* Covers the whole client. The room she is in fills the frame, she stands in it,
       and everything else — who, how long, how she feels, what was said — is laid
       over it in the thinnest chrome that still reads. */
    .call { position:absolute; inset:0; z-index:60; display:grid; grid-template-rows:minmax(0,1fr) auto; grid-template-columns:minmax(0,1fr);
      background:#000; color:#fff; animation:chat-fade .2s ease both; }
    .call-scene { position:relative; min-width:0; min-height:0; overflow:hidden; isolation:isolate; }
    .call-bg { position:absolute; inset:-2%; background-size:cover; background-position:center; transform:scale(1.02);
      transition:background-image .4s ease, filter .4s ease; }
    .call-bg.plain { background:radial-gradient(120% 90% at 50% 12%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 68%),
      linear-gradient(180deg,#1a1620,#0b0a0d); }
    .call-bg.blurred { filter:blur(14px) saturate(1.1) brightness(.85); }
    .call-veil { position:absolute; inset:0; background:linear-gradient(to bottom,rgba(0,0,0,.55),transparent 22%,transparent 62%,rgba(0,0,0,.6)); pointer-events:none; }
    /* Same two-layer arrangement as the stage: the hold breathes, the sprite reacts. */
    /* The hold's one row is sized 1fr rather than auto. That is what makes the
       sprite's percentage max-height mean anything: a grid item's percentage
       resolves against its grid area, and an auto row is indefinite, so
       "max-height:100%" was being treated as none — which is why she overflowed the
       scene and stood far too close on every screen. */
    .call-hold { position:absolute; inset:0; display:grid; grid-template-rows:minmax(0,1fr); grid-template-columns:minmax(0,1fr);
      place-items:end center; transform-origin:50% 100%; padding-top:52px; box-sizing:border-box; }
    .call-sprite { max-height:100%; max-width:min(100%,720px); object-fit:contain; object-position:bottom center; transform-origin:50% 100%;
      filter:drop-shadow(0 14px 26px rgba(0,0,0,.5)); animation:call-pose .32s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; }
    @keyframes call-pose { from { opacity:0; transform:translateY(10px) scale(.99); } }
    .call-top { position:absolute; top:0; left:0; right:0; z-index:2; display:flex; align-items:center; gap:10px; padding:12px 14px; }
    .call-who { display:flex; align-items:center; gap:10px; padding:6px 12px 6px 6px; border-radius:999px; background:rgba(0,0,0,.42); backdrop-filter:blur(8px); }
    .call-who .avatar { width:32px; height:32px; flex:0 0 32px; border-radius:50%; overflow:hidden; display:grid; place-items:center; font-size:12px; }
    .call-who strong { font-size:14px; display:block; line-height:1.15; }
    .call-who span { font-size:11px; opacity:.8; display:flex; align-items:center; gap:5px; }
    .call-live { width:7px; height:7px; border-radius:50%; background:#f04747; animation:call-blink 1.6s ease-in-out infinite; }
    @keyframes call-blink { 50% { opacity:.25; } }
    .call-mood { margin-left:auto; display:flex; align-items:center; gap:7px; padding:6px 11px; border-radius:999px;
      background:rgba(0,0,0,.42); backdrop-filter:blur(8px); font-size:12px; font-weight:650; text-transform:capitalize; }
    .call-mood .material-symbols-rounded { font-size:16px; }
    .call-doing { padding-left:7px; border-left:1px solid rgba(255,255,255,.22); opacity:.85; font-weight:600; }
    .call-place { font-size:11px; opacity:.85; font-weight:500; text-transform:none; padding-left:7px; border-left:1px solid rgba(255,255,255,.22); }
    /* Subtitles: the last few lines, hers and yours, newest at the bottom and
       brightest, older ones dimmer above it. Yours are tinted so a glance tells who
       said what without a name on each. */
    .call-captions { position:absolute; left:0; right:0; bottom:12px; z-index:2; display:grid; gap:6px; justify-items:center; padding:0 14px; pointer-events:none; }
    .call-caption { max-width:min(680px,92%); margin:0; padding:9px 14px; border-radius:14px; background:rgba(0,0,0,.56); backdrop-filter:blur(6px);
      font-size:15px; line-height:1.4; white-space:pre-wrap; overflow-wrap:anywhere; animation:chat-rise .25s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; }
    .call-caption.older { opacity:.62; font-size:13px; }
    .call-caption.mine { background:color-mix(in srgb,var(--accent) 62%,rgba(0,0,0,.6)); }
    .call-caption .speech { color:color-mix(in srgb,var(--accent) 70%,#fff); }
    .call-caption.mine .speech { color:#fff; }
    .call-caption .action { color:rgba(255,255,255,.82); }
    .call-caption.typing { padding:11px 16px; }
    .call-caption.typing .dots i { background:rgba(255,255,255,.8); }
    /* The scene picker: a tray over the bar with the rooms she can be in, plus the plain
       stage, plus letting her choose. */
    .call-tray { position:absolute; right:12px; bottom:76px; z-index:3; width:min(420px,calc(100% - 24px)); padding:12px; border-radius:16px; background:rgba(14,14,18,.94); backdrop-filter:blur(10px);
      box-shadow:0 14px 40px rgba(0,0,0,.5); animation:chat-rise .18s var(--oppai-ease-standard,cubic-bezier(.2,0,0,1)) both; }
    .call-tray h4 { margin:0 0 8px; font-size:12px; font-weight:650; color:rgba(255,255,255,.7); text-transform:uppercase; letter-spacing:.06em; }
    .call-scenes { display:grid; grid-template-columns:repeat(auto-fill,minmax(96px,1fr)); gap:8px; max-height:240px; overflow:auto; }
    .call-scene-btn { position:relative; aspect-ratio:16/10; border:2px solid transparent; border-radius:10px; overflow:hidden; background:#26242c; padding:0; cursor:pointer; color:#fff; display:grid; }
    .call-scene-btn img { width:100%; height:100%; object-fit:cover; grid-area:1/1; }
    .call-scene-btn .scene-name { grid-area:1/1; align-self:end; padding:14px 6px 5px; font-size:11px; text-align:left; background:linear-gradient(to top,rgba(0,0,0,.8),transparent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .call-scene-btn .scene-icon { grid-area:1/1; place-self:center; font-size:26px; opacity:.7; }
    .call-scene-btn.on { border-color:var(--accent); }
    .call-tray p { margin:8px 0 0; font-size:12px; color:rgba(255,255,255,.6); }
    .call-tray p a { color:var(--accent); cursor:pointer; }
    .call-bar { display:flex; align-items:center; gap:8px; min-width:0; padding:10px 14px; background:#0c0c10; }
    .call-input { flex:1; width:0; min-width:0; border:0; border-radius:999px; padding:11px 16px; background:rgba(255,255,255,.1); color:#fff; }
    .call-input::placeholder { color:rgba(255,255,255,.5); }
    .call-input:focus { outline:2px solid var(--accent); outline-offset:-2px; }
    .call-btn { width:44px; height:44px; flex:0 0 44px; border:0; border-radius:50%; background:rgba(255,255,255,.1); color:#fff;
      display:grid; place-items:center; cursor:pointer; transition:background .12s ease; }
    .call-btn:hover:not(:disabled) { background:rgba(255,255,255,.2); }
    .call-btn.on { background:color-mix(in srgb,var(--accent) 80%,#000); }
    .call-btn:disabled { opacity:.45; cursor:default; }
    .call-btn.send { background:var(--accent); color:var(--on-accent); }
    .call-btn.end { background:#e5484d; color:#fff; }
    .call-note { position:absolute; top:64px; left:50%; transform:translateX(-50%); z-index:3; padding:6px 12px; border-radius:999px; background:rgba(0,0,0,.6); font-size:12px; animation:chat-rise .2s ease both; }
    @media (max-width:640px) { .call-mood .call-place,.call-mood .call-doing { display:none; } .call-btn.captions { display:none; } }
    /* On a screen with the room for it the call is the screen: she and her room take
       the main pane and the conversation moves into a sidebar on the right — the same
       log, composer and attachments as before, so nothing is lost by picking up. The
       chat list and the portrait column step aside; the call bar keeps only what the
       sidebar does not already do. Narrower than this it stays a full-screen overlay
       with subtitles and its own input, since there is no room for both. */
    @media (min-width:901px) {
      .client.in-call { grid-template-columns:minmax(0,1fr) var(--call-side-w); }
      .client.in-call .side,.client.in-call .stage,.client.in-call .hero,.client.in-call .mobile-nav { display:none; }
      .client.in-call .call { position:relative; inset:auto; order:-1; z-index:auto; min-height:0; animation:none; }
      .client.in-call .main { border-left:1px solid var(--line); }
      .client.in-call .call-input,.client.in-call .call-btn.send { display:none; }
      /* The log is right there: the subtitles keep only her latest line, under her. */
      .client.in-call .call-caption.older,.client.in-call .call-caption.mine { display:none; }
      .client.in-call .call-bar { justify-content:center; }
      /* On a desktop the call fills a large window, and a sprite scaled to its full
         height was a woman standing far too close to the camera. She is framed at a
         conversational distance instead: about four fifths of the room, with air
         above her and room either side, the way a webcam actually frames a person. */
      .client.in-call .call-hold { padding-top:72px; }
      .client.in-call .call-sprite { max-height:min(82%,900px); max-width:min(50%,600px); }
      .client.in-call .msg { grid-template-columns:28px minmax(0,88%); }
      .client.in-call .msg.mine { grid-template-columns:minmax(0,88%); }
      .client.in-call .msg .avatar { width:28px; height:28px; }
      .client.in-call .log { padding:10px 12px 8px; }
      .client.in-call .format-help,.client.in-call .destructive-action { display:none; }
      /* Settings opened from the sidebar get the phone treatment: no room for a rail. */
      .client.in-call .settings { grid-template-columns:minmax(0,1fr); grid-template-rows:auto minmax(0,1fr); }
      .client.in-call .settings-nav { flex-direction:row; align-items:center; gap:4px; padding:8px; overflow-x:auto; overflow-y:hidden; border-bottom:1px solid var(--line); }
      .client.in-call .nav-cat,.client.in-call .nav-sep,.client.in-call .nav-row.close { display:none; }
      .client.in-call .nav-row { flex:0 0 auto; padding:7px 12px; border-radius:999px; }
    }
    /* A linked title in the prose. Underlined the way a link is, in the accent on her
       side and in the bubble's own ink on yours. */
    .inline-link { color:var(--accent); text-decoration:underline; text-decoration-style:dotted; text-decoration-thickness:1.5px; text-underline-offset:3px; cursor:pointer; font-weight:600; }
    .inline-link:hover { text-decoration-style:solid; }
    .msg.mine .inline-link,.call-caption .inline-link { color:inherit; }
    @media (prefers-reduced-motion:reduce) { .call,.call-sprite { animation:none; } }
  `];p([$t({attribute:!1})],c.prototype,"user",2);p([u()],c.prototype,"status",2);p([u()],c.prototype,"workspace",2);p([u()],c.prototype,"characterID",2);p([u()],c.prototype,"conversationID",2);p([u()],c.prototype,"draft",2);p([u()],c.prototype,"busy",2);p([u()],c.prototype,"loading",2);p([u()],c.prototype,"workspaceLoaded",2);p([u()],c.prototype,"loadError",2);p([u()],c.prototype,"settingsOpen",2);p([u()],c.prototype,"speakOn",2);p([u()],c.prototype,"editorTab",2);p([u()],c.prototype,"outfits",2);p([u()],c.prototype,"activities",2);p([u()],c.prototype,"notice",2);p([u()],c.prototype,"noticeError",2);p([u()],c.prototype,"imageTags",2);p([u()],c.prototype,"memories",2);p([u()],c.prototype,"memoryKinds",2);p([u()],c.prototype,"memoryLimit",2);p([u()],c.prototype,"memoryDraft",2);p([u()],c.prototype,"editingMemory",2);p([u()],c.prototype,"memoryDraftEdit",2);p([u()],c.prototype,"memoryKindEdit",2);p([u()],c.prototype,"autoState",2);p([u()],c.prototype,"wants",2);p([u()],c.prototype,"identity",2);p([u()],c.prototype,"pendingLink",2);p([u()],c.prototype,"discord",2);p([u()],c.prototype,"discordPlaces",2);p([u()],c.prototype,"discordToken",2);p([u()],c.prototype,"discordUserDraft",2);p([u()],c.prototype,"bond",2);p([u()],c.prototype,"models",2);p([u()],c.prototype,"modelChoice",2);p([u()],c.prototype,"modelBusy",2);p([u()],c.prototype,"backend",2);p([u()],c.prototype,"loadArgs",2);p([u()],c.prototype,"loadExtra",2);p([u()],c.prototype,"loadSettings",2);p([u()],c.prototype,"loraPicks",2);p([u()],c.prototype,"cardTokens",2);p([u()],c.prototype,"deleteTarget",2);p([u()],c.prototype,"deleteConfirm",2);p([u()],c.prototype,"deletePermanent",2);p([u()],c.prototype,"deleteError",2);p([u()],c.prototype,"mobileNavOpen",2);p([u()],c.prototype,"chatSearch",2);p([u()],c.prototype,"pickerOpen",2);p([u()],c.prototype,"captureTurns",2);p([u()],c.prototype,"cardDrop",2);p([u()],c.prototype,"cardNote",2);p([u()],c.prototype,"autopilot",2);p([u()],c.prototype,"autoPaused",2);p([u()],c.prototype,"autoTurns",2);p([u()],c.prototype,"stageOpen",2);p([u()],c.prototype,"stageWidth",2);p([u()],c.prototype,"stageDragging",2);p([u()],c.prototype,"pendingPhoto",2);p([u()],c.prototype,"typingPhase",2);p([u()],c.prototype,"callOpen",2);p([u()],c.prototype,"callSeconds",2);p([u()],c.prototype,"incomingCall",2);p([u()],c.prototype,"backgrounds",2);p([u()],c.prototype,"defaultBackground",2);p([u()],c.prototype,"scenePickerOpen",2);p([u()],c.prototype,"callCaptions",2);p([u()],c.prototype,"replyTarget",2);p([u()],c.prototype,"reactionPicker",2);p([u()],c.prototype,"snapOpen",2);p([u()],c.prototype,"weightTagDraft",2);p([u()],c.prototype,"pendingItems",2);p([u()],c.prototype,"picker",2);p([je(".log")],c.prototype,"log",2);p([je(".composer textarea")],c.prototype,"composer",2);p([u()],c.prototype,"lastSampling",2);p([u()],c.prototype,"lastPhoto",2);p([u()],c.prototype,"imageSubject",2);c=p([Ct("oppai-chat")],c);function Zt(e){switch(e){case"ready":return"from your words, before she wrote";case"model":return"from the tags she wrote";case"rescue":return"as a rescue: she said she was sending one and nothing fitted";case"inferred":return"unprompted, because her words matched it";default:return e}}export{c as OppaiChat};
