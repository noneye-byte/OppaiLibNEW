import{z as de,i as pe,u as d,a as ce,B as Ct,e as u,m as M,C as He,A as c,b as o,D as Tt,l as ne,t as he,q as ke,x as zt,E as Oe,F as Pt,G as Lt,H as It,I as Mt,J as Dt,v as J,w as Bt}from"./index-DY0_NBZy.js";import{e as bt}from"./query-__j_ZMY6.js";function vt(e){return e.faces*e.tiers}function Ot(e,t){const i=vt(t);if(e>=i){const s=Math.min(e-i,t.miscIds.length-1);return{tier:0,face:0,misc:t.miscIds[Math.max(0,s)]??""}}const a=Math.max(0,Math.min(e,i-1));return{tier:Math.floor(a/t.faces),face:a%t.faces,misc:""}}function Rt(e,t,i,a){const s=i?a.miscIds.indexOf(i):-1;return s>=0?vt(a)+s:t+e*a.faces}function N(e){return`${e.emotion}:${e.tier}`}function Y(e,t,i,a){if(e.trim()==="")return a;const s=Number(e);return Number.isFinite(s)?Math.min(i,Math.max(t,Math.round(s))):a}function ge(e,t,i,a){if(e.trim()==="")return a;const s=Number(e);return Number.isFinite(s)?Math.min(i,Math.max(t,s)):a}function Et(e,t){var i,a;return{prompt:e.prompt,negativePrompt:e.negativePrompt??"",model:e.checkpoint??"",modelHash:t.modelHash||void 0,vae:e.vae??"",vaePrecision:e.vaePrecision??"fp32",sampler:e.sampler??"",seed:t.seed,steps:e.steps??0,cfgScale:e.cfgScale??0,cfgRescale:e.cfgRescale??0,clipSkip:e.clipSkip??0,width:e.width??0,height:e.height??0,seamlessX:!!e.seamlessX,seamlessY:!!e.seamlessY,cpuNoise:e.cpuNoise!==!1,loras:(e.loras??[]).map(s=>{var r;return{name:s.name,weight:s.weight,hash:((r=t.loraHashes)==null?void 0:r[s.name])||void 0}}),triggers:t.triggers??[],characters:t.characters??[],poses:(i=t.poses)!=null&&i.length?t.poses:void 0,outfit:t.outfit||void 0,controlImage:t.controlImage||void 0,refiner:(a=e.detailer)!=null&&a.enabled?{model:e.detailer.model??"",prompt:e.detailer.prompt??"",negativePrompt:e.detailer.negativePrompt??"",confidence:e.detailer.confidence??0,denoise:e.detailer.denoise??0,maskBlur:e.detailer.maskBlur??0}:void 0,board:e.board&&e.board!=="none"?e.board:void 0,backend:t.backend,seconds:t.seconds,at:Date.now()}}function Z(e){const t=e.loras.filter(l=>!e.prompt.includes(`<lora:${l.name}:`)).map(l=>`<lora:${l.name}:${l.weight}>`).join(" "),a=[[e.prompt,t].filter(Boolean).join(" ")];e.negativePrompt&&a.push(`Negative prompt: ${e.negativePrompt}`);const s=[`Steps: ${e.steps}`,`Sampler: ${e.sampler||"default"}`,`CFG scale: ${e.cfgScale}`,`Seed: ${e.seed}`,`Size: ${e.width}x${e.height}`];e.model&&s.push(`Model: ${e.model}`),e.modelHash&&s.push(`Model hash: ${e.modelHash}`),e.vae&&s.push(`VAE: ${e.vae}`),e.clipSkip>0&&s.push(`Clip skip: ${e.clipSkip}`),e.cfgRescale>0&&s.push(`CFG Rescale: ${e.cfgRescale}`);const r=e.loras.filter(l=>l.hash);return r.length&&s.push(`Lora hashes: "${r.map(l=>`${l.name}: ${l.hash}`).join(", ")}"`),(e.seamlessX||e.seamlessY)&&s.push(`Seamless: ${[e.seamlessX?"x":"",e.seamlessY?"y":""].filter(Boolean).join("+")}`),e.vaePrecision&&s.push(`VAE precision: ${e.vaePrecision}`),e.cpuNoise||s.push("Noise device: gpu"),e.refiner&&(s.push(`ADetailer model: ${e.refiner.model}`),s.push(`ADetailer confidence: ${e.refiner.confidence}`),s.push(`ADetailer denoising strength: ${e.refiner.denoise}`),s.push(`ADetailer mask blur: ${e.refiner.maskBlur}`),e.refiner.prompt&&s.push(`ADetailer prompt: ${e.refiner.prompt}`),e.refiner.negativePrompt&&s.push(`ADetailer negative prompt: ${e.refiner.negativePrompt}`)),e.triggers.length&&s.push(`Trigger phrases: ${e.triggers.join(" ")}`),e.characters.length&&s.push(`Characters: ${e.characters.join(", ")}`),e.controlImage&&s.push(`Control image: ${e.controlImage}`),e.board&&s.push(`Board: ${e.board}`),s.push(`Backend: ${e.backend}`),e.seconds!==void 0&&s.push(`Generation time: ${e.seconds.toFixed(1)}s`),a.push(s.join(", ")),a.join(`
`)}function re(e){return JSON.stringify(e,null,2)}function At(e){return{prompt:e.prompt,negativePrompt:e.negativePrompt??"",model:e.model??"",modelHash:e.modelHash||void 0,vae:e.vae??"",vaePrecision:"fp32",sampler:e.sampler??"",seed:e.seed,steps:e.steps,cfgScale:e.cfgScale,cfgRescale:e.cfgRescale,clipSkip:e.clipSkip,width:e.width,height:e.height,seamlessX:e.seamlessX,seamlessY:e.seamlessY,cpuNoise:e.cpuNoise,loras:e.loras??[],triggers:[],characters:[],backend:e.backend||"invokeai",at:Date.now()}}function _t(e){return{prompt:e.prompt,negativePrompt:e.negativePrompt||void 0,checkpoint:e.model||void 0,vae:e.vae||void 0,sampler:e.sampler||void 0,seed:e.seed,steps:e.steps,cfgScale:e.cfgScale,cfgRescale:e.cfgRescale,clipSkip:e.clipSkip,width:e.width,height:e.height,seamlessX:e.seamlessX,seamlessY:e.seamlessY,vaePrecision:e.vaePrecision==="fp16"?"fp16":"fp32",cpuNoise:e.cpuNoise,count:1,loras:e.loras.map(({name:t,weight:i})=>({name:t,weight:i})),detailer:e.refiner?{enabled:!0,...e.refiner}:void 0,board:e.board}}async function xt(e){var t;try{if((t=navigator.clipboard)!=null&&t.writeText)return await navigator.clipboard.writeText(e),!0}catch{}try{const i=document.createElement("textarea");i.value=e,i.setAttribute("readonly",""),i.style.position="fixed",i.style.top="-1000px",document.body.appendChild(i),i.select();const a=document.execCommand("copy");return document.body.removeChild(i),a}catch{return!1}}const We="oppai_gen_draft",Re=1,Nt=720*60*60*1e3;function Ft(e){try{const t={...e,version:Re,at:Date.now()};localStorage.setItem(We,JSON.stringify(t))}catch{}}function Ut(){let e=null;try{e=localStorage.getItem(We)}catch{return null}if(!e)return null;let t;try{t=JSON.parse(e)}catch{return xe(),null}if(!t||typeof t!="object")return null;const i=t;if(i.version!==Re)return xe(),null;const a=typeof i.at=="number"?i.at:0;if(!a||Date.now()-a>Nt)return xe(),null;const s={version:Re,at:a},r=p=>{const h=i[p];typeof h=="string"&&(s[p]=h)},l=p=>{const h=i[p];typeof h=="boolean"&&(s[p]=h)},n=p=>{const h=i[p];typeof h=="number"&&Number.isFinite(h)&&(s[p]=h)};if(["prompt","negative","checkpoint","vae","templateId","scheduler","board","outfitText","outfitMisc","outfitUnderwearColor","outfitPubicHairColor","outfitLoadoutId","outfitWardrobeId","detailerModel","detailerPrompt","detailerNegative"].forEach(r),["width","height","steps","cfg","cfgRescale","clipSkip","count","seed","outfitFace","outfitTier","detailerConfidence","detailerDenoise","detailerMaskBlur","scrollTop"].forEach(n),["seamlessX","seamlessY","cpuNoise","outfitOn","outfitCutout","outfitPubicHair","outfitLockColors","outfitMiscBatch","detailerEnabled","showOptions"].forEach(l),(i.vaePrecision==="fp16"||i.vaePrecision==="fp32")&&(s.vaePrecision=i.vaePrecision),(i.outfitBackground==="black"||i.outfitBackground==="white")&&(s.outfitBackground=i.outfitBackground),i.camera&&typeof i.camera=="object"&&!Array.isArray(i.camera)){const p={};for(const[h,f]of Object.entries(i.camera))(typeof f=="string"||typeof f=="boolean")&&(p[h]=f);Object.keys(p).length&&(s.camera=p)}return Wt(i.selectedLoras)&&(s.selectedLoras=i.selectedLoras),qt(i.open)&&(s.open=i.open),Te(i.selectedTriggers)&&(s.selectedTriggers=i.selectedTriggers),Te(i.selectedChars)&&(s.selectedChars=i.selectedChars),Te(i.selectedPoses)&&(s.selectedPoses=i.selectedPoses),jt(i.outfitGear)&&(s.outfitGear=i.outfitGear),Array.isArray(i.shots)&&(s.shots=i.shots.filter(p=>!!p&&typeof p=="object"&&typeof p.id=="string"&&typeof p.seed=="number").map(p=>({id:p.id,seed:p.seed,saved:!!p.saved,info:p.info,...typeof p.outfitFilename=="string"?{outfitFilename:p.outfitFilename}:{},...Gt(p.outfitSlot)?{outfitSlot:p.outfitSlot}:{},...typeof p.outfitConfig=="string"?{outfitConfig:p.outfitConfig}:{},...typeof p.cutoutReviewed=="boolean"?{cutoutReviewed:p.cutoutReviewed}:{},...typeof p.wipOutfitId=="string"?{wipOutfitId:p.wipOutfitId}:{},...typeof p.previewVersion=="number"&&Number.isFinite(p.previewVersion)?{previewVersion:p.previewVersion}:{},...typeof p.workspaceX=="number"&&Number.isFinite(p.workspaceX)?{workspaceX:Math.max(0,p.workspaceX)}:{},...typeof p.workspaceY=="number"&&Number.isFinite(p.workspaceY)?{workspaceY:Math.max(0,p.workspaceY)}:{}}))),s}function jt(e){return!!e&&typeof e=="object"&&!Array.isArray(e)}function Gt(e){if(!e||typeof e!="object"||Array.isArray(e))return!1;const t=e;return typeof t.emotion=="string"&&typeof t.emotionLabel=="string"&&typeof t.tier=="number"&&Number.isInteger(t.tier)&&typeof t.tierLabel=="string"&&typeof t.index=="number"&&Number.isInteger(t.index)}function xe(){try{localStorage.removeItem(We)}catch{}}function Te(e){return Array.isArray(e)&&e.every(t=>typeof t=="string")}function Wt(e){return!!e&&typeof e=="object"&&!Array.isArray(e)&&Object.values(e).every(t=>typeof t=="number"&&Number.isFinite(t))}function qt(e){return!!e&&typeof e=="object"&&!Array.isArray(e)&&Object.values(e).every(t=>typeof t=="boolean")}const te=new Uint8Array([137,80,78,71,13,10,26,10]),Ee=new TextEncoder;function Ht(e,t){return(e[t]<<24|e[t+1]<<16|e[t+2]<<8|e[t+3])>>>0}function Ve(e,t,i){e[t]=i>>>24&255,e[t+1]=i>>>16&255,e[t+2]=i>>>8&255,e[t+3]=i&255}let me;function Vt(e){if(!me){me=new Uint32Array(256);for(let i=0;i<256;i++){let a=i;for(let s=0;s<8;s++)a=a&1?3988292384^a>>>1:a>>>1;me[i]=a>>>0}}let t=4294967295;for(const i of e)t=me[(t^i)&255]^t>>>8;return(t^4294967295)>>>0}function Ke(e,t){const i=Ee.encode(e),a=new Uint8Array(12+t.length);Ve(a,0,t.length),a.set(i,4),a.set(t,8);const s=new Uint8Array(i.length+t.length);return s.set(i),s.set(t,i.length),Ve(a,a.length-4,Vt(s)),a}function Ye(e,t){const i=[...t].every(l=>(l.codePointAt(0)??256)<=255),a=Ee.encode(e);if(i){const l=Uint8Array.from([...t],p=>p.codePointAt(0)??0),n=new Uint8Array(a.length+1+l.length);return n.set(a),n.set(l,a.length+1),Ke("tEXt",n)}const s=Ee.encode(t),r=new Uint8Array(a.length+5+s.length);return r.set(a),r.set(s,a.length+5),Ke("iTXt",r)}function Ae(e,t,i){const a=e instanceof Uint8Array?e:new Uint8Array(e);if(a.length<20||!te.every((w,$)=>a[$]===w))throw new Error("The generated image is not a PNG.");let s=te.length,r=-1;const l=[];for(;s+12<=a.length;){const w=Ht(a,s),$=s+12+w;if($>a.length)throw new Error("The PNG is truncated.");const L=String.fromCharCode(...a.subarray(s+4,s+8));if(L==="IEND"){r=s;break}const T=a.subarray(s+8,s+8+w),z=T.indexOf(0),I=z<0?"":String.fromCharCode(...T.subarray(0,z));(L==="tEXt"||L==="iTXt")&&(I==="parameters"||I==="oppailib")||l.push(a.subarray(s,$)),s=$}if(r<0)throw new Error("The PNG has no IEND chunk.");const n=[Ye("parameters",t)];i&&n.push(Ye("oppailib",i));const p=l.reduce((w,$)=>w+$.length,0),h=n.reduce((w,$)=>w+$.length,0),f=a.subarray(r),b=new Uint8Array(te.length+p+h+f.length);b.set(te);let y=te.length;for(const w of l)b.set(w,y),y+=w.length;for(const w of n)b.set(w,y),y+=w.length;return b.set(f,y),b}async function yt(e,t,i,a){const s=await fetch(e,{credentials:"same-origin"});if(!s.ok)throw new Error(`Couldn't export image (${s.status}).`);const l=Ae(await s.arrayBuffer(),i,a).slice().buffer,n=URL.createObjectURL(new Blob([l],{type:"image/png"}));try{const p=document.createElement("a");p.href=n,p.download=t.toLowerCase().endsWith(".png")?t:`${t}.png`,p.click()}finally{setTimeout(()=>URL.revokeObjectURL(n),0)}}const Xe={shot:"full-body",angle:"eye",view:"front",framing:"portrait",lens:"none",lockIdentity:!0},le={"extreme-closeup":{label:"Extreme close-up",hint:"Eyes and mouth fill the frame",prompt:"extreme close-up, face filling the frame, macro detail on the eyes",not:["full body","wide shot","long shot","cowboy shot","upper body"]},closeup:{label:"Close-up",hint:"The face, little else",prompt:"close-up portrait, face and hair fill the frame",not:["full body","wide shot","long shot","cowboy shot"]},"head-shoulders":{label:"Head and shoulders",hint:"The classic portrait crop",prompt:"head and shoulders portrait, shoulders visible at the frame edge",not:["full body","wide shot","long shot","waist visible"]},bust:{label:"Bust shot",hint:"Head to upper chest",prompt:"bust shot, framed from the chest up",not:["full body","wide shot","long shot","legs","feet"]},"waist-up":{label:"Waist-up",hint:"Head to waist, hands usable",prompt:"waist-up shot, upper body, cropped at the waist",not:["full body","long shot","legs","feet","knees"]},"three-quarter":{label:"Three-quarter body",hint:"Head to mid-thigh",prompt:"three-quarter body shot, cowboy shot, cropped at mid-thigh",not:["extreme close-up","feet","shoes"]},"full-body":{label:"Full body",hint:"Head to feet, whole figure",prompt:"full body shot, entire figure in frame, head to feet visible",not:["close-up","cropped legs","out of frame","cropped head"]}};function Kt(e){return le[e].prompt}const _e={eye:{label:"Eye level",prompt:"eye level perspective, natural straight-on viewpoint",not:[]},low:{label:"Low angle",prompt:"low angle shot, viewed from below, looking upward",not:["from above","high angle","distorted proportions","giant"]},high:{label:"High angle",prompt:"high angle shot, viewed from above, looking downward",not:["from below","low angle","distorted proportions"]}},Ne={front:{label:"Front",prompt:"front view, facing viewer",not:["from behind","back view"]},"three-quarter":{label:"Three-quarter",prompt:"three-quarter view, body turned at a slight angle",not:["from behind"]},side:{label:"Side",prompt:"side view, profile, from the side",not:["front view","facing viewer"]},rear:{label:"Rear",prompt:"from behind, back view, facing away from viewer",not:["front view","facing viewer","looking at viewer","face visible"]}},Fe={none:{label:"Unspecified",prompt:""},"wide-24":{label:"24mm wide",prompt:"24mm wide angle lens, deep focus"},"normal-50":{label:"50mm normal",prompt:"50mm lens, natural perspective"},"portrait-85":{label:"85mm portrait",prompt:"85mm portrait lens, shallow depth of field, blurred background"},"tele-135":{label:"135mm telephoto",prompt:"135mm telephoto lens, compressed perspective, bokeh"}},Yt="consistent character design, same face, consistent facial features, consistent body proportions, anatomically consistent",Xt="inconsistent face, different person, face morphing, deformed proportions, distorted anatomy, extra limbs, malformed hands, changed body type, altered hairstyle",Zt="camera, camera body, camera lens, photography equipment, tripod, photographer, studio equipment, boom microphone",wt={portrait:{sd:[512,768],xl:[832,1216]},landscape:{sd:[768,512],xl:[1216,832]},square:{sd:[512,512],xl:[1024,1024]}};function Jt(e,t="sd"){const i=le[e.shot],a=_e[e.angle],s=Ne[e.view],r=Fe[e.lens],l=Ze([...e.lockIdentity?[Yt]:[],i.prompt,s.prompt,a.prompt,r.prompt]),n=Ze([...e.lockIdentity?[Xt]:[],Zt,...i.not,...s.not,...a.not]),[p,h]=wt[e.framing][t];return{prompt:l,negative:n,width:p,height:h}}function Ze(e){const t=new Set,i=[];for(const a of e)for(const s of a.split(",")){const r=s.trim();if(!r)continue;const l=r.toLowerCase();t.has(l)||(t.add(l),i.push(r))}return i.join(", ")}function Qt(e,t){return e*t>=800*800?"xl":"sd"}const ze={shots:Object.keys(le).map(e=>({id:e,label:le[e].label,hint:le[e].hint})),angles:Object.keys(_e).map(e=>({id:e,label:_e[e].label})),views:Object.keys(Ne).map(e=>({id:e,label:Ne[e].label})),lenses:Object.keys(Fe).map(e=>({id:e,label:Fe[e].label})),framings:Object.keys(wt).map(e=>({id:e,label:e==="portrait"?"Portrait":e==="landscape"?"Landscape":"Square"}))},Je={feather:2,spill:.5},K=255,W=0,ei=20;class ti{constructor(t){if(this.undoStack=[],this.redoStack=[],"data"in t)this.width=t.width,this.height=t.height,this.source={data:t.data,width:t.width,height:t.height};else{this.width="naturalWidth"in t?t.naturalWidth:t.width,this.height="naturalHeight"in t?t.naturalHeight:t.height;const i=document.createElement("canvas");i.width=this.width,i.height=this.height;const a=i.getContext("2d",{willReadFrequently:!0});if(!a)throw new Error("This browser wouldn't give us a canvas to work on.");a.drawImage(t,0,0),this.source=a.getImageData(0,0,this.width,this.height)}this.mask=new Uint8Array(this.width*this.height).fill(K),this.key=et(this.source.data,this.width,this.height)}get canUndo(){return this.undoStack.length>0}get canRedo(){return this.redoStack.length>0}get cutFraction(){let t=0;for(let i=0;i<this.mask.length;i++)this.mask[i]===W&&t++;return t/this.mask.length}checkpoint(){this.undoStack.push(this.mask.slice()),this.undoStack.length>ei&&this.undoStack.shift(),this.redoStack=[]}undo(){const t=this.undoStack.pop();return t?(this.redoStack.push(this.mask),this.mask=t,!0):!1}redo(){const t=this.redoStack.pop();return t?(this.undoStack.push(this.mask),this.mask=t,!0):!1}reset(){this.checkpoint(),this.mask.fill(K)}autoRemove(t){this.checkpoint(),this.mask.fill(K),this.key=et(this.source.data,this.width,this.height);const i=[];for(let a=0;a<this.width;a++)i.push(a,a+(this.height-1)*this.width);for(let a=0;a<this.height;a++)i.push(a*this.width,this.width-1+a*this.width);this.flood(i,this.key,t),this.removeEnclosedBackdrop(t)}removeEnclosedBackdrop(t){const i=this.source.data,a=new Uint8Array(this.mask.length),[s,r,l]=this.key,n=Math.max(1,t),p=Qe(s,r,l),h=Math.max(s,r,l)-Math.min(s,r,l)<28,f=Math.max(16,Math.floor(this.mask.length*.08));for(let b=0;b<this.mask.length;b++){if(a[b]||this.mask[b]===W||ie(i,b*4,s,r,l)>n)continue;const y=[],w=new Set,$=[b];for(a[b]=1;$.length;){const I=$.pop();y.push(I);const C=I%this.width,Q=(I-C)/this.width,ue=[C>0?I-1:-1,C<this.width-1?I+1:-1,Q>0?I-this.width:-1,Q<this.height-1?I+this.width:-1];for(const j of ue)j<0||this.mask[j]===W||(ie(i,j*4,s,r,l)<=n?a[j]||(a[j]=1,$.push(j)):w.add(j))}if(!w.size||y.length>f)continue;let L=0,T=0;for(const I of w){const C=I*4;L+=Qe(i[C],i[C+1],i[C+2]),T+=ie(i,C,s,r,l)}if(L/=w.size,T/=w.size,h&&p>=200?p-L>=110:h&&p<=55?L-p>=110:T>=Math.max(90,n*2.25))for(const I of y)this.mask[I]=W}}removeAt(t,i,a){const s=ye(Math.round(t),0,this.width-1),r=ye(Math.round(i),0,this.height-1),l=(r*this.width+s)*4,n=[this.source.data[l],this.source.data[l+1],this.source.data[l+2]];if(this.checkpoint(),this.key=n,a.contiguous){this.flood([r*this.width+s],n,a.tolerance);return}const p=Math.max(1,a.tolerance);for(let h=0;h<this.mask.length;h++)this.mask[h]!==W&&ie(this.source.data,h*4,n[0],n[1],n[2])<=p&&(this.mask[h]=W)}paint(t,i,a,s){const r=s==="add"?K:W,l=Math.max(1,Math.round(a)),n=Math.round(t),p=Math.round(i),h=l*l,f=Math.max(0,n-l),b=Math.min(this.width-1,n+l),y=Math.max(0,p-l),w=Math.min(this.height-1,p+l);for(let $=y;$<=w;$++){const L=$-p;for(let T=f;T<=b;T++){const z=T-n;z*z+L*L>h||(this.mask[$*this.width+T]=r)}}}beginStroke(){this.checkpoint()}compose(t,i=!1){const a=document.createElement("canvas");a.width=this.width,a.height=this.height;const s=a.getContext("2d");if(!s)return a;const r=this.composePixels(t,i);return s.putImageData(new ImageData(r.data,r.width,r.height),0,0),a}composePixels(t,i=!1){const a={data:new Uint8ClampedArray(this.source.data),width:this.width,height:this.height};if(i)return a;const s=this.featheredAlpha(Math.max(0,Math.round(t.feather))),r=ye(t.spill,0,1),[l,n,p]=this.key;for(let h=0;h<s.length;h++){const f=h*4,b=s[h];if(a.data[f+3]=b,b===0||b===K||r===0)continue;const y=r*(1-b/K);a.data[f]=Pe(a.data[f],l,y),a.data[f+1]=Pe(a.data[f+1],n,y),a.data[f+2]=Pe(a.data[f+2],p,y)}return a}featheredAlpha(t){const i=new Uint8Array(this.mask.length);if(t<=0)return i.set(this.mask),i;const a=1e6,s=new Float32Array(this.mask.length);for(let n=0;n<this.mask.length;n++)s[n]=this.mask[n]===W?0:a;const r=this.width,l=this.height;for(let n=0;n<l;n++)for(let p=0;p<r;p++){const h=n*r+p;let f=s[h];p>0&&(f=Math.min(f,s[h-1]+1)),n>0&&(f=Math.min(f,s[h-r]+1)),p>0&&n>0&&(f=Math.min(f,s[h-r-1]+1.414)),p<r-1&&n>0&&(f=Math.min(f,s[h-r+1]+1.414)),s[h]=f}for(let n=l-1;n>=0;n--)for(let p=r-1;p>=0;p--){const h=n*r+p;let f=s[h];p<r-1&&(f=Math.min(f,s[h+1]+1)),n<l-1&&(f=Math.min(f,s[h+r]+1)),p<r-1&&n<l-1&&(f=Math.min(f,s[h+r+1]+1.414)),p>0&&n<l-1&&(f=Math.min(f,s[h+r-1]+1.414)),s[h]=f}for(let n=0;n<i.length;n++){if(this.mask[n]===W){i[n]=0;continue}const p=s[n];i[n]=p>=t?K:Math.round(p/t*K)}return i}flood(t,i,a){const s=Math.max(1,a),r=this.source.data,l=new Uint8Array(this.mask.length),n=t.slice(),[p,h,f]=i;for(;n.length;){const b=n.pop();if(l[b]||(l[b]=1,ie(r,b*4,p,h,f)>s))continue;this.mask[b]=W;const y=b%this.width,w=(b-y)/this.width;y>0&&n.push(b-1),y<this.width-1&&n.push(b+1),w>0&&n.push(b-this.width),w<this.height-1&&n.push(b+this.width)}}}function ie(e,t,i,a,s){const r=e[t]-i,l=e[t+1]-a,n=e[t+2]-s;return Math.sqrt(r*r+l*l+n*n)}function Qe(e,t,i){return e*.2126+t*.7152+i*.0722}function et(e,t,i){const a=[0,(t-1)*4,(i-1)*t*4,((i-1)*t+(t-1))*4];let s=0,r=0,l=0;for(const n of a)s+=e[n],r+=e[n+1],l+=e[n+2];return[s/4,r/4,l/4]}function Pe(e,t,i){return ye(Math.round(e+(e-t)*i),0,255)}function ye(e,t,i){return Math.min(i,Math.max(t,e))}function ii(e){return new Promise((t,i)=>{const a=new Image;a.crossOrigin="anonymous",a.onload=()=>t(a),a.onerror=()=>i(new Error("Couldn't load that image.")),a.src=e})}function tt(e){return new Promise((t,i)=>{e.toBlob(a=>a?t(a):i(new Error("Couldn't encode the PNG.")),"image/png")})}function we(e,t,i=48){return e.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,i).replace(/-+$/g,"")||t}function ai(e,t,i){return`${we(e,"outfit")}-${we(t,"calm",20)}-${we(i,"neutral",24)}.png`}function si(e){return`${we(e,"outfit")}-wardrobe.zip`}function it(e){return!e||e.manageModels||e.backend!=="a1111"?"":e.modelsDirProblem?`${e.modelsDirProblem}. Until then Automatic1111's models are listed and linked to Civitai, but can't be installed, edited or deleted from here.`:"Automatic1111 has no API to install, edit or delete models, so OppaiLib does it in its models folder. Map that folder into the OppaiLib container at /a1111-models (or set where it is under Settings → Image generation) and those work here too, Civitai installs included."}function V(e){return e.split(",").map(t=>t.trim()).filter(Boolean)}const F=e=>e.toLowerCase().replace(/\s+/g," ");function oi(e,t){const i=new Set(V(e).map(F)),a=V(t);return a.length>0&&a.every(s=>i.has(F(s)))}function at(e,t,i,a){let s=V(e);if(t&&oi(e,t)){const p=new Set(V(t).map(F));s=s.filter(h=>!p.has(F(h)))}const r=new Set(s.map(F)),l=V(i??"").filter(p=>!r.has(F(p)));return(a==="start"?[...l,...s]:[...s,...l]).join(", ")}function ri(e,t){const i=new Set(V(e).map(F)),a=[];for(const s of t)for(const r of V(s??""))i.has(F(r))||(i.add(F(r)),a.push(r));return a.join(", ")}function ni(e,t,i,a){const s={...e},r=[],l=(f,b,y)=>{b===void 0||b===""||b===0||(s[f]!==b&&r.push(y),s[f]=b)};a?(l("weight",i.weight,"weight"),i.weightMin&&i.weightMax&&(l("weightMin",i.weightMin,"weight range"),s.weightMax=i.weightMax)):(l("positive",i.positive,"positive prompt"),l("steps",i.steps,"steps"),l("cfgScale",i.cfgScale,"CFG"),l("scheduler",i.scheduler,"sampler"),l("clipSkip",i.clipSkip,"clip skip"),i.width&&i.height&&(l("width",i.width,"size"),s.height=i.height)),l("negative",i.negative,"negative prompt");const n=V(t),p=new Set(n.map(F));let h=0;for(const f of i.triggerWords??[])for(const b of V(f))p.has(F(b))||(p.add(F(b)),n.push(b),h++);return h&&r.unshift("trigger words"),{defaults:s,triggerText:n.join(", "),applied:r}}const q=[{key:"head",label:"Head",hint:"Hats, glasses, etc.",prompt:"head item",noun:"headwear",icon:"face"},{key:"top",label:"Top",hint:"Shirt, dress, jacket…",prompt:"top",noun:"top",icon:"apparel"},{key:"bottoms",label:"Bottoms",hint:"Skirt, shorts, pants…",prompt:"bottoms",noun:"bottoms",icon:"styler"},{key:"shoes",label:"Shoes",hint:"Boots, heels, socks…",prompt:"footwear",noun:"footwear",icon:"steps"},{key:"panties",label:"Panties",hint:"Style and material",prompt:"panties",noun:"panties",icon:"apparel"},{key:"bra",label:"Bra",hint:"Style and material",prompt:"bra",noun:"bra",icon:"apparel"},{key:"hand1",label:"Hand 1",hint:"Held or worn item",prompt:"left-hand item",noun:"glove",icon:"front_hand"},{key:"hand2",label:"Hand 2",hint:"Held or worn item",prompt:"right-hand item",noun:"glove",icon:"back_hand"},{key:"extra1",label:"Extra 1",hint:"Accessory or layer",prompt:"extra accessory",noun:"accessory",icon:"diamond"},{key:"extra2",label:"Extra 2",hint:"Accessory or layer",prompt:"second extra accessory",noun:"accessory",icon:"diamond"}];function H(e){return!!e.item.trim()&&!e.off}const Le={head:{color:"",item:""},top:{color:"cream white",item:"fitted top"},bottoms:{color:"charcoal",item:"pleated skirt"},shoes:{color:"black",item:"ankle boots"},panties:{color:"black",item:"lace panties"},bra:{color:"black",item:"lace bra"},hand1:{color:"",item:""},hand2:{color:"",item:""},extra1:{color:"",item:""},extra2:{color:"",item:""}},$t=Object.fromEntries(q.map(({key:e})=>[e,{color:"",item:""}])),kt=[{name:"red",words:["red","crimson","scarlet","ruby","burgundy","maroon","wine"]},{name:"pink",words:["pink","rose","blush","magenta","fuchsia","salmon"]},{name:"orange",words:["orange","peach","apricot","coral","amber","rust"]},{name:"yellow",words:["yellow","gold","golden","mustard","lemon","blonde"]},{name:"green",words:["green","emerald","olive","mint","jade","teal","sage"]},{name:"blue",words:["blue","navy","azure","cobalt","indigo","denim","cyan","turquoise"]},{name:"purple",words:["purple","violet","lavender","lilac","plum","mauve"]},{name:"brown",words:["brown","tan","beige","chocolate","caramel","khaki","bronze","copper"]},{name:"white",words:["white","cream","ivory","pearl","off-white"]},{name:"black",words:["black","charcoal","onyx","jet"]},{name:"grey",words:["grey","gray","silver","slate","ash","steel"]}];function li(e){const t=e.toLowerCase();return kt.filter(({words:i})=>i.some(a=>new RegExp(`\\b${a}\\b`).test(t))).map(({name:i})=>i)}function di(e,t,i){if(!e.trim())return"";const a=t.toFixed(2).replace(/0+$/,"").replace(/\.$/,"");return i==="a1111"?`(${e}:${a})`:i==="invokeai"?`(${e})${a}`:e}const pi=1.25;function st(e,t,i,a){const s=t.item.trim();if(!s||t.off)return"";const r=qe(e,t),l=Se(e,t),n=t.color.trim();if(!n)return`${r}: ${s}`;const p=`${n} ${s}`;return a?`${r}: ${di(p,pi,i)}, ${n} ${l}`:`${r}: ${p}`}function qe(e,t){var i;return((i=t.prompt)==null?void 0:i.trim())||e.prompt}function Se(e,t){var i,a;return((i=t.noun)==null?void 0:i.trim())||((a=t.prompt)==null?void 0:a.trim())||e.noun}function ci(e,t){const i=t.color.trim();if(!H(t)||!i)return[];const a=new Set(li(i));if(!a.size)return[];const s=Se(e,t);return kt.filter(({name:r})=>!a.has(r)).map(({name:r})=>`${r} ${s}`)}const Ue=[{description:"Clothes on; bra and panties hidden.",clothes:[["on",100]],bra:[["hidden",100]],panties:[["hidden",100]]},{description:"Usually covered, with an occasional underwear glimpse.",clothes:[["on",88],["displaced",12]],bra:[["hidden",88],["showing",12]],panties:[["hidden",94],["showing",6]]},{description:"Mixed neat, slipped, and rare clothes-off results.",clothes:[["on",58],["displaced",34],["off",8]],bra:[["hidden",52],["showing",38],["off",10]],panties:[["hidden",60],["showing",33],["off",7]]},{description:"Strong variation: clothes and underwear may be on, showing, or off.",clothes:[["on",28],["displaced",44],["off",28]],bra:[["hidden",22],["showing",46],["off",32]],panties:[["hidden",30],["showing",45],["off",25]]},{description:"Maximum variation, weighted toward displaced or removed clothing.",clothes:[["on",14],["displaced",28],["off",58]],bra:[["hidden",10],["showing",27],["off",63]],panties:[["hidden",14],["showing",31],["off",55]]}];function Ie(e,t){const i=Math.max(0,Math.min(.999999,t()))*100;let a=0;for(const[s,r]of e)if(a+=r,i<a)return s;return e[e.length-1][0]}function hi(e,t=Math.random){const i=Ue[Math.max(0,Math.min(Ue.length-1,Math.round(e)))],a=Ie(i.clothes,t);let s=Ie(i.bra,t),r=Ie(i.panties,t);return a==="off"&&(s==="hidden"&&(s="showing"),r==="hidden"&&(r="showing")),{clothes:a,bra:s,panties:r}}function ui(e){if(!e||typeof e!="object"||Array.isArray(e))return!1;const t=e;return typeof t.color=="string"&&typeof t.item=="string"}function ot(e){if(!e||typeof e!="object"||Array.isArray(e))return{...$t};const t=e;return Object.fromEntries(q.map(({key:i})=>{var s,r;const a=t[i];return typeof a=="string"?[i,{color:"",item:a}]:ui(a)?[i,{color:a.color,item:a.item,...a.off?{off:!0}:{},...(s=a.prompt)!=null&&s.trim()?{prompt:a.prompt.trim()}:{},...(r=a.noun)!=null&&r.trim()?{noun:a.noun.trim()}:{}}]:[i,{color:"",item:""}]}))}function gi(e){return JSON.stringify(Object.fromEntries(q.map(t=>{const i=e[t.key];return[t.key,H(i)?`${i.color.trim().toLowerCase()}|${i.item.trim().toLowerCase()}|${qe(t,i).toLowerCase()}|${Se(t,i).toLowerCase()}`:"|"]})))}var mi=Object.defineProperty,fi=Object.getOwnPropertyDescriptor,A=(e,t,i,a)=>{for(var s=a>1?void 0:a?fi(t,i):t,r=e.length-1,l;r>=0;r--)(l=e[r])&&(s=(a?l(t,i,s):l(s))||s);return a&&s&&mi(t,i,s),s};const je=[{id:"neutral",label:"Neutral",hint:"Login screen and error popups"},{id:"happy",label:"Happy",hint:"Chat · Sweet mode"},{id:"mischievous",label:"Mischievous",hint:"Chat · Playful mode"},{id:"surprised",label:"Surprised",hint:"Chat · Bold mode"},{id:"thinking",label:"Thinking",hint:"Chat · Roleplay mode"},{id:"shy",label:"Shy",hint:"Bashful, flustered, caught out",borrows:"Surprised"},{id:"smug",label:"Smug",hint:"Proud of herself, vindicated",borrows:"Mischievous"},{id:"sad",label:"Sad",hint:"Hurt, wistful, let down",borrows:"Thinking"},{id:"annoyed",label:"Annoyed",hint:"Irritated, pouty, impatient",borrows:"Thinking"},{id:"sleepy",label:"Sleepy",hint:"Tired, dozy, winding down",borrows:"Neutral"},{id:"loving",label:"Loving",hint:"Tender, adoring, soft on you",borrows:"Happy"},{id:"excited",label:"Excited",hint:"Thrilled, eager, buzzing",borrows:"Happy"}],$e=["Calm","Warm","Flirty","Heated","Peak"],bi=je.length*$e.length,ae=(e,t)=>`${e}:${t}`;let D=class extends ce{constructor(){super(...arguments),this.outfits=[],this.activities=[],this.backgrounds=[],this.defaultBackground="",this.backgroundDraft=null,this.backgroundBusy=!1,this.backgroundVersion=0,this.wornOutfit=Ct(),this.outfitDraft=null,this.outfitBusy=!1,this.outfitError="",this.outfitCoverVersion=0}connectedCallback(){super.connectedCallback(),this.loadOutfits()}async refresh(){await this.loadOutfits()}async loadBackgrounds(){try{const e=await u.libbyBackgrounds();this.backgrounds=e.backgrounds,this.defaultBackground=e.default??""}catch{}}async setDefaultBackground(e){try{const t=await u.setLibbyDefaultBackground(e);this.defaultBackground=t.default,M(e?"That's where she'll be unless a conversation moves her.":"No default room — the plain stage until she moves.","success")}catch(t){M(t.message||"Couldn't set the default background.","error")}}async loadOutfits(){this.loadBackgrounds();try{const e=await u.libbyOutfits();this.outfits=e.outfits,this.activities=e.activities??[],this.outfitError="",this.wornOutfit&&!e.outfits.some(t=>t.id===this.wornOutfit)&&(this.wornOutfit="",He(""))}catch(e){this.outfitError=e.message||"Couldn't load your wardrobes."}}render(){return o`
      <div class="wardrobe-intro">
        An outfit swaps Libby's artwork: one sprite per expression, per heat tier —
        ${bi} in all for a complete wardrobe — plus one picture for each of the
        optional Misc states she can put herself into. An empty expression falls back to
        the calmer art, then to the bundled default; an empty Misc state falls back to
        the bundled Libby doing the same thing, then to her expression. Which outfit
        she wears is per-device. Click a card to wear it; Build opens it on the board.
      </div>
      ${this.outfitError?o`<div class="wardrobe-error" role="alert">${this.outfitError}</div>`:c}
      <div class="outfit-cards">
        <!-- The bundled wardrobe is a card like any other, shown in its own art rather
             than as a "none" row: it is a look you choose, not the absence of one. -->
        <button
          class="outfit-card ${this.wornOutfit===""?"on":""}"
          @click=${()=>this.wearOutfit("")}
          title="Wear Libby's default artwork"
        >
          <img class="cover" src=${Tt("happy",1)} alt="Default Libby" />
          ${this.wornOutfit===""?o`<span class="worn-badge">Wearing</span>`:c}
          <div class="card-body">
            <div class="card-name">Default Libby</div>
            <div class="card-meta">Bundled artwork</div>
          </div>
        </button>
        ${this.outfits.map(e=>this.renderOutfitCard(e))}
        <button
          class="outfit-card"
          @click=${()=>this.outfitDraft={name:"",existing:[],staged:{},removed:[],level:0}}
          title="Create a new outfit"
        >
          <div class="cover-empty">
            <span>
              <span class="material-symbols-rounded" style="font-size:26px; display:block;">add</span>
              New outfit
            </span>
          </div>
          <div class="card-body">
            <div class="card-name">New outfit</div>
            <div class="card-meta">Drop in your own art</div>
          </div>
        </button>
      </div>
      ${this.outfitDraft?this.renderOutfitEditor(this.outfitDraft):c}
      ${this.renderBackgrounds()}
    `}renderBackgrounds(){const e=this.backgroundDraft;return o`
      <div class="scene-head"><h3>Backgrounds</h3><span class="wardrobe-intro" style="margin:0">Rooms for the video call. Tag them so she can choose where she is; mark one as the default and every conversation starts there. A generated picture can become one from its right-click menu.</span></div>
      <div class="scene-cards">
        ${this.backgrounds.map(t=>o`<button class="scene-card" title="Edit ${t.name}" @click=${()=>this.openBackgroundEditor(t)}>
          ${t.hasImage?o`<img class="cover" src=${u.libbyBackgroundURL(t.id,this.backgroundVersion)} alt=${t.name} loading="lazy" />`:o`<div class="cover-empty">No picture yet</div>`}
          ${t.id===this.defaultBackground?o`<span class="default-badge">Default</span>`:c}
          <div class="card-body"><div class="card-name">${t.name}</div><div class="card-meta">${t.tags.length?t.tags.join(", "):"No tags — she can only pick it by name"}</div></div>
        </button>`)}
        <button class="scene-card" title="Add a background" @click=${()=>this.backgroundDraft={name:"",tags:""}}>
          <div class="cover-empty"><span><span class="material-symbols-rounded" style="font-size:26px; display:block;">add</span>New background</span></div>
          <div class="card-body"><div class="card-name">New background</div><div class="card-meta">A room, a bed, a balcony…</div></div>
        </button>
      </div>
      ${e?o`<div class="scene-editor">
        <label class="drop"
          @dragover=${t=>{t.preventDefault(),t.currentTarget.classList.add("dragover")}}
          @dragleave=${t=>t.currentTarget.classList.remove("dragover")}
          @drop=${t=>{var i,a;t.preventDefault(),t.currentTarget.classList.remove("dragover"),this.stageBackground((a=(i=t.dataTransfer)==null?void 0:i.files)==null?void 0:a[0])}}>
          ${e.image?o`<img src=${e.image} alt="" />`:e.id&&e.hasImage?o`<img src=${u.libbyBackgroundURL(e.id,this.backgroundVersion)} alt="" />`:o`<span>Drop a picture here<br />or click to browse<br /><small>Landscape works best</small></span>`}
          <input type="file" accept="image/*" style="display:none;" @change=${t=>{var a;const i=t.target;this.stageBackground((a=i.files)==null?void 0:a[0]),i.value=""}} />
        </label>
        <div class="scene-fields">
          <label>Name<input .value=${e.name} placeholder="Bedroom" maxlength="60" @input=${t=>this.backgroundDraft={...e,name:t.target.value}} /></label>
          <label>Tags — what it is, comma separated<input .value=${e.tags} placeholder="bedroom, night, lamp, cosy" @input=${t=>this.backgroundDraft={...e,tags:t.target.value}} /></label>
          <span class="wardrobe-intro" style="margin:0">She reads the name and the tags when deciding where to be: "going to bed" finds a room tagged bed, "somewhere darker" one tagged night.</span>
        </div>
        <div class="scene-actions">
          <button class="outfit-btn on" ?disabled=${this.backgroundBusy||!e.name.trim()} @click=${()=>void this.saveBackground()}>${e.id?"Save":"Add background"}</button>
          <button class="outfit-btn" ?disabled=${this.backgroundBusy} @click=${()=>this.backgroundDraft=null}>Cancel</button>
          ${e.id&&e.hasImage?o`<button class="outfit-btn ${e.id===this.defaultBackground?"on":""}" ?disabled=${this.backgroundBusy}
            title="Where she is when a conversation has not moved her"
            @click=${()=>void this.setDefaultBackground(e.id===this.defaultBackground?"":e.id)}>
            ${e.id===this.defaultBackground?"Default room ✓":"Make this the default"}
          </button>`:c}
          ${e.id?o`<button class="outfit-btn danger" ?disabled=${this.backgroundBusy} @click=${()=>void this.deleteBackground()}>Delete</button>`:c}
        </div>
      </div>`:c}
    `}openBackgroundEditor(e){this.backgroundDraft={id:e.id,name:e.name,tags:e.tags.join(", "),hasImage:e.hasImage}}stageBackground(e){if(!e||!this.backgroundDraft)return;const t=new FileReader;t.onload=()=>{this.backgroundDraft&&(this.backgroundDraft={...this.backgroundDraft,image:String(t.result)})},t.readAsDataURL(e)}async saveBackground(){const e=this.backgroundDraft;if(!(!e||!e.name.trim())){this.backgroundBusy=!0;try{const t=await u.saveLibbyBackground({id:e.id,name:e.name.trim(),tags:e.tags.split(",").map(i=>i.trim()).filter(Boolean)});e.image&&await u.setLibbyBackgroundImage(t.id,e.image),this.backgroundVersion++,this.backgroundDraft=null,await this.loadBackgrounds(),!e.image&&!e.hasImage&&M("Saved — add a picture and she can go there.","success")}catch(t){M(t.message||"Couldn't save that background.","error")}finally{this.backgroundBusy=!1}}}async deleteBackground(){const e=this.backgroundDraft;if(!(!(e!=null&&e.id)||!confirm(`Delete "${e.name}"?`))){this.backgroundBusy=!0;try{await u.deleteLibbyBackground(e.id),this.backgroundDraft=null,await this.loadBackgrounds()}catch(t){M(t.message||"Couldn't delete that background.","error")}finally{this.backgroundBusy=!1}}}wearOutfit(e){this.wornOutfit=e,He(e)}openOutfitEditor(e){const t=[];if(e.emotionLevels)for(const[i,a]of Object.entries(e.emotionLevels))for(const s of a)t.push(ae(i,s));else for(const i of e.emotions)t.push(ae(i,0));for(const[i,a]of Object.entries(e.activityLevels??{}))for(const s of a)t.push(ae(i,s));this.outfitDraft={id:e.id,name:e.name,existing:t,staged:{},removed:[],level:0,hasCover:e.hasThumb!==!1}}isActivity(e){return this.activities.some(t=>t.id===e)}toggleRemove(e){const t=this.outfitDraft;if(!t)return;const i=t.removed.includes(e)?t.removed.filter(s=>s!==e):[...t.removed,e],a={...t.staged};t.removed.includes(e)||delete a[e],this.outfitDraft={...t,removed:i,staged:a}}renderSlot(e,t,i,a){const s=this.isActivity(t)?0:e.level,r=ae(t,s),l=e.staged[r],n=e.removed.includes(r),p=!l&&e.id&&e.existing.includes(r)?u.libbyEmotionURL(e.id,t,s,this.outfitCoverVersion):"";return o`
      <label
        class="slot ${n?"removed":""}"
        @dragover=${h=>{h.preventDefault(),h.currentTarget.classList.add("dragover")}}
        @dragleave=${h=>h.currentTarget.classList.remove("dragover")}
        @drop=${h=>{var f,b;h.preventDefault(),h.currentTarget.classList.remove("dragover"),this.stageEmotion(t,(b=(f=h.dataTransfer)==null?void 0:f.files)==null?void 0:b[0])}}
      >
        ${l?o`<img src=${l} alt=${i} />`:p?o`<img src=${p} alt=${i} />`:o`<div class="drop-hint">Drop an image here<br />or click to browse</div>`}
        ${p||l?o`<span class="slot-actions">
          ${p&&e.id?o`<button type="button" class="slot-act" title="Edit this sprite in the studio — adjust the cutout, redo it, or replace it"
            @click=${h=>{h.preventDefault(),h.stopPropagation(),this.requestEdit(e.id,t,s)}}>
            <span class="material-symbols-rounded" style="font-size:16px;">edit</span></button>`:c}
          <button type="button" class="slot-act danger" title=${n?"Keep this sprite after all":l?"Discard the dropped picture":"Remove this sprite on save"}
            @click=${h=>{h.preventDefault(),h.stopPropagation(),l?this.unstage(r):this.toggleRemove(r)}}>
            <span class="material-symbols-rounded" style="font-size:16px;">${n?"undo":"delete"}</span></button>
        </span>`:c}
        <div class="slot-label">${i}${n?" — removing":""}</div>
        <div class="slot-hint">${a}</div>
        <input
          type="file"
          accept="image/*"
          style="display:none;"
          @change=${h=>{var b;const f=h.target;this.stageEmotion(t,(b=f.files)==null?void 0:b[0]),f.value=""}}
        />
      </label>
    `}renderCoverPicker(e){const t=e.cover||(e.id&&e.hasCover?u.libbyOutfitThumbURL(e.id,this.outfitCoverVersion):"");return o`<div class="cover-picker">
      ${t?o`<img src=${t} alt="Outfit cover" />`:o`<div class="cover-blank">No cover</div>`}
      <div class="cover-copy">
        Card art for the wardrobe. Leave it empty and the card uses this outfit’s own
        artwork.
        <div class="row">
          <label class="outfit-btn">
            Choose cover
            <input
              type="file"
              accept="image/*"
              style="display:none;"
              @change=${i=>{var s;const a=i.target;this.stageCover((s=a.files)==null?void 0:s[0]),a.value=""}}
            />
          </label>
          ${e.cover||e.hasCover?o`<button class="outfit-btn" @click=${()=>this.clearCover()}>Use outfit art</button>`:c}
        </div>
      </div>
    </div>`}stageCover(e){if(!e||!e.type.startsWith("image/")||!this.outfitDraft)return;const t=new FileReader;t.onload=()=>{this.outfitDraft&&(this.outfitDraft={...this.outfitDraft,cover:String(t.result)})},t.readAsDataURL(e)}async clearCover(){const e=this.outfitDraft;if(e&&(this.outfitDraft={...e,cover:void 0,hasCover:!1},!!e.id))try{await u.clearLibbyOutfitThumb(e.id),this.outfitCoverVersion=Date.now(),await this.loadOutfits()}catch(t){this.outfitError=t.message}}stageEmotion(e,t){if(!t||!t.type.startsWith("image/")||!this.outfitDraft)return;const i=ae(e,this.isActivity(e)?0:this.outfitDraft.level),a=new FileReader;a.onload=()=>{this.outfitDraft&&(this.outfitDraft={...this.outfitDraft,staged:{...this.outfitDraft.staged,[i]:String(a.result)},removed:this.outfitDraft.removed.filter(s=>s!==i)})},a.readAsDataURL(t)}unstage(e){const t=this.outfitDraft;if(!t)return;const i={...t.staged};delete i[e],this.outfitDraft={...t,staged:i}}requestEdit(e,t,i){this.outfitDraft=null,this.dispatchEvent(new CustomEvent("edit-slot",{detail:{outfitId:e,slot:t,level:i},bubbles:!0,composed:!0}))}async saveOutfit(){const e=this.outfitDraft;if(!(!e||!e.name.trim()||this.outfitBusy)){this.outfitBusy=!0;try{const t=await u.saveLibbyOutfit({id:e.id,name:e.name.trim()});for(const i of e.removed){const[a,s]=i.split(":");await u.deleteLibbyEmotion(t.id,a,Number(s)).catch(()=>{})}for(const[i,a]of Object.entries(e.staged)){const[s,r]=i.split(":");await u.setLibbyEmotion(t.id,s,a,Number(r))}this.outfitCoverVersion=Date.now(),e.cover&&(await u.setLibbyOutfitThumb(t.id,e.cover),this.outfitCoverVersion=Date.now()),this.outfitDraft=null,await this.loadOutfits()}catch(t){this.outfitError=t.message}finally{this.outfitBusy=!1}}}async deleteOutfit(){var a;const e=this.outfitDraft;if(!(e!=null&&e.id)||this.outfitBusy)return;const t=((a=this.outfits.find(s=>s.id===e.id))==null?void 0:a.wip)??0,i=t?`

This also deletes ${t} generated square${t===1?"":"s"} the outfit studio is holding for it.`:"";if(confirm(`Delete the “${e.name}” outfit?${i}`)){this.outfitBusy=!0;try{await u.deleteLibbyOutfit(e.id);const s=ne("libraryDelete");M(s.message,"success",{emotion:s.emotion,intensity:s.intensity}),this.wornOutfit===e.id&&this.wearOutfit(""),this.outfitDraft=null,await this.loadOutfits()}catch(s){this.outfitError=s.message}finally{this.outfitBusy=!1}}}renderOutfitCard(e){const t=this.wornOutfit===e.id,i=e.slots??e.emotions.length;return o`<button
      class="outfit-card ${t?"on":""}"
      @click=${()=>this.wearOutfit(t?"":e.id)}
      title=${t?`Take off “${e.name}”`:`Wear “${e.name}”`}
    >
      ${e.hasThumb===!1?o`<div class="cover-empty">No art yet</div>`:o`<img
            class="cover"
            src=${u.libbyOutfitThumbURL(e.id,this.outfitCoverVersion)}
            alt=${e.name}
            loading="lazy"
            @error=${a=>{a.target.replaceWith(Object.assign(document.createElement("div"),{className:"cover-empty",textContent:"No art yet"}))}}
          />`}
      ${t?o`<span class="worn-badge">Wearing</span>`:c}
      <span
        class="card-build"
        role="button"
        tabindex="0"
        title=${`Open “${e.name}” on the board to generate or fix its squares`}
        @click=${a=>{a.stopPropagation(),this.requestBuild(e.id)}}
        @keydown=${a=>{a.key!=="Enter"&&a.key!==" "||(a.preventDefault(),a.stopPropagation(),this.requestBuild(e.id))}}
      >Build</span>
      <span
        class="card-edit"
        role="button"
        tabindex="0"
        title=${`Edit “${e.name}”`}
        @click=${a=>{a.stopPropagation(),this.openOutfitEditor(e)}}
        @keydown=${a=>{a.key!=="Enter"&&a.key!==" "||(a.preventDefault(),a.stopPropagation(),this.openOutfitEditor(e))}}
      >Edit</span>
      <div class="card-body">
        <div class="card-name">${e.name}</div>
        <div class="card-meta">
          ${e.emotions.length}/${je.length} emotions${i>e.emotions.length?o` · ${i} images`:c}${e.activitySlots?o` · ${e.activitySlots} misc`:c}
          <!-- Unfinished squares are the reason a wardrobe with no sprites is not an
               empty wardrobe: they are hours of generation the studio is holding. -->
          ${e.wip?o`<br />${e.wip} in progress`:c}
        </div>
      </div>
    </button>`}requestBuild(e){this.dispatchEvent(new CustomEvent("build-outfit",{detail:{outfitId:e},bubbles:!0,composed:!0}))}renderOutfitEditor(e){return o`
      <div class="outfit-overlay" @click=${t=>{t.target===t.currentTarget&&(this.outfitDraft=null)}}>
        <div class="outfit-dialog">
          <h3>${e.id?"Edit outfit":"New outfit"}</h3>
          <input
            type="text"
            placeholder="Outfit name (Summer dress, Maid, …)"
            .value=${e.name}
            @input=${t=>this.outfitDraft={...e,name:t.target.value}}
          />
          <div class="tier-tabs">
            ${$e.map((t,i)=>o`<button
                class="tier-tab ${e.level===i?"on":""}"
                @click=${()=>this.outfitDraft={...e,level:i}}
                title="Shown as the horniness meter reaches this tier"
              >${t}</button>`)}
          </div>
          <p class="tier-note">
            ${e.level===0?"Baseline art — worn when the meter is low, and the fallback for any tier you leave empty.":`Shown as Libby’s horniness meter climbs into the “${$e[e.level]}” range.`}
          </p>
          ${this.renderCoverPicker(e)}
          <div class="slots">
            ${je.map(t=>this.renderSlot(e,t.id,t.label,t.borrows?`${t.hint} · Optional, borrows ${t.borrows}`:t.hint))}
          </div>
          ${this.activities.length?o`
            <h4 class="slot-group">Misc — what she is doing</h4>
            <p class="tier-note">
              Optional, and separate from her expressions: these are the states she can
              put herself into — curled up reading, dozing, or a good deal less idle. One
              picture each, whatever the heat tier above says. She chooses one to fit the
              scene, and a state you have not drawn simply falls back to her expression,
              so there is no wrong number to leave empty. The intimate ones only become
              available to her as the heat climbs. Typing is the exception: the app shows
              it while she is writing you a reply.
            </p>
            <div class="slots">
              ${this.activities.map(t=>this.renderSlot(e,t.id,t.auto?`${t.label} — while she writes`:t.label,t.auto?"Shown with a speech bubble while a reply is on its way; she never picks it herself":t.minIntensity>1?`${t.says} · from tier ${$e[t.minIntensity-1]}`:t.says))}
            </div>
          `:c}
          <div class="outfit-actions">
            ${e.id?o`<button class="outfit-btn danger" ?disabled=${this.outfitBusy} @click=${()=>this.deleteOutfit()}>
                  Delete outfit
                </button>`:c}
            <button class="outfit-btn" @click=${()=>this.outfitDraft=null}>Cancel</button>
            <button
              class="btn-primary"
              ?disabled=${!e.name.trim()||this.outfitBusy}
              @click=${()=>this.saveOutfit()}
            >
              ${this.outfitBusy?"Saving…":"Save outfit"}
            </button>
          </div>
        </div>
      </div>
    `}};D.styles=[de,pe`
    :host { display: block; }
    .wardrobe-intro {
      margin-bottom: 10px;
      color: var(--oppai-text-muted);
      font-size: 13px;
      line-height: 1.45;
    }
    .wardrobe-error { color: var(--oppai-error, #f2b8b5); font-size: 13px; margin-bottom: 8px; }
    /* The rooms, as cards like the outfits — wider, because they are rooms. */
    .scene-head { display: flex; align-items: baseline; gap: 10px; margin: 26px 0 4px; }
    .scene-head h3 { margin: 0; font-size: 16px; }
    .scene-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 12px; margin-top: 10px; }
    .scene-card { position: relative; display: flex; flex-direction: column; border: 1px solid var(--oppai-border); border-radius: 14px; overflow: hidden;
      background: var(--oppai-surface-2, rgba(255, 255, 255, 0.03)); text-align: left; cursor: pointer; padding: 0; font: inherit; color: inherit;
      transition: border-color 0.12s, transform 0.12s; }
    .scene-card:hover { transform: translateY(-2px); border-color: var(--oppai-border-strong); }
    .scene-card .cover, .scene-card .cover-empty { aspect-ratio: 16 / 10; width: 100%; object-fit: cover; display: block; background: var(--oppai-surface); }
    .scene-card .cover-empty { display: grid; place-items: center; color: var(--oppai-text-muted); font-size: 13px; text-align: center; }
    .scene-card .card-body { padding: 8px 10px 10px; display: grid; gap: 2px; }
    .scene-card .card-name { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .scene-card .card-meta { font-size: 12px; color: var(--oppai-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .scene-editor { margin-top: 12px; padding: 14px; border: 1px solid var(--oppai-border); border-radius: 14px; display: grid; gap: 10px;
      grid-template-columns: 220px minmax(0, 1fr); align-items: start; }
    .scene-editor .drop { aspect-ratio: 16 / 10; border: 1px dashed var(--oppai-border-strong); border-radius: 10px; display: grid; place-items: center;
      overflow: hidden; cursor: pointer; color: var(--oppai-text-muted); font-size: 12px; text-align: center; padding: 8px; background: var(--oppai-surface); }
    .scene-editor .drop img { width: 100%; height: 100%; object-fit: cover; grid-area: 1 / 1; }
    .scene-editor .drop.dragover { border-color: var(--oppai-accent); }
    .scene-fields { display: grid; gap: 8px; }
    .scene-fields label { display: grid; gap: 3px; font-size: 12px; color: var(--oppai-text-muted); }
    .scene-fields input { font: inherit; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--oppai-border-strong); background: var(--oppai-surface); color: inherit; }
    .scene-actions { display: flex; gap: 8px; flex-wrap: wrap; grid-column: 1 / -1; }
    .outfit-btn.danger { color: var(--oppai-error, #f2b8b5); border-color: var(--oppai-error, #f2b8b5); }
    @media (max-width: 640px) { .scene-editor { grid-template-columns: 1fr; } }
      .outfit-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 0;
        border-top: 1px solid var(--oppai-border);
        font-size: 14px;
      }
      .outfit-row .name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .outfit-row .meta {
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .outfit-btn {
        border: 1px solid var(--oppai-border-strong);
        background: transparent;
        color: var(--oppai-text-dim);
        border-radius: 999px;
        font: inherit;
        font-size: 12px;
        padding: 5px 12px;
        cursor: pointer;
      }
      .outfit-btn.on {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
        border-color: var(--oppai-accent);
      }
      /* The wardrobe, as cards. A list of names could not answer the only question
         being asked here — "which one is this?" — and outfits are pictures. */
      .outfit-cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
        gap: 12px;
        margin-top: 10px;
      }
      .outfit-card {
        position: relative;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--oppai-border);
        border-radius: 14px;
        overflow: hidden;
        background: var(--oppai-surface-2, rgba(255, 255, 255, 0.03));
        text-align: left;
        cursor: pointer;
        padding: 0;
        font: inherit;
        color: inherit;
        transition: border-color 0.12s, transform 0.12s;
      }
      .outfit-card:hover { transform: translateY(-2px); border-color: var(--oppai-border-strong); }
      .outfit-card.on { border-color: var(--oppai-accent); }
      /* Portraits are tall; 3:4 shows the pose without letterboxing the common case. */
      .outfit-card .cover {
        aspect-ratio: 3 / 4;
        width: 100%;
        object-fit: cover;
        display: block;
        background: var(--oppai-surface);
      }
      .outfit-card .cover-empty {
        aspect-ratio: 3 / 4;
        display: grid;
        place-items: center;
        color: var(--oppai-text-muted);
        font-size: 12px;
        text-align: center;
        padding: 8px;
      }
      .outfit-card .card-body { padding: 8px 10px 10px; }
      .outfit-card .card-name {
        font-size: 13px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .outfit-card .card-meta { font-size: 11px; color: var(--oppai-text-muted); margin-top: 2px; }
      /* "Wearing" sits on the art, because that is the one fact you scan a grid for. */
      .outfit-card .worn-badge {
        position: absolute;
        top: 8px;
        left: 8px;
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 3px 8px;
      }
      .outfit-card .card-edit {
        position: absolute;
        top: 6px;
        right: 6px;
        border: 0;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        font: inherit;
        font-size: 11px;
        padding: 4px 8px;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.12s;
      }
      .outfit-card:hover .card-edit,
      .outfit-card:focus-within .card-edit { opacity: 1; }
      /* The cover picker inside the editor. */
      .cover-picker {
        display: flex;
        gap: 12px;
        align-items: center;
        margin: 10px 0 4px;
      }
      .cover-picker img,
      .cover-picker .cover-blank {
        width: 84px;
        aspect-ratio: 3 / 4;
        object-fit: cover;
        border-radius: 10px;
        border: 1px solid var(--oppai-border);
        background: var(--oppai-surface-2, rgba(255, 255, 255, 0.03));
        display: grid;
        place-items: center;
        font-size: 11px;
        color: var(--oppai-text-muted);
        text-align: center;
      }
      .cover-picker .cover-copy { flex: 1; min-width: 0; font-size: 12px; color: var(--oppai-text-muted); }
      .cover-picker .cover-copy .row { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
      .outfit-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        display: grid;
        place-items: center;
        z-index: 50;
        padding: 20px;
      }
      .outfit-dialog {
        background: var(--oppai-surface);
        border: 1px solid var(--oppai-border);
        border-radius: 18px;
        padding: 18px;
        width: min(640px, 100%);
        max-height: 92vh;
        overflow-y: auto;
      }
      .outfit-dialog h3 {
        margin: 0 0 12px;
        font-size: 16px;
      }
      /* Horniness tier picker across the top of the editor. */
      .tier-tabs {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 12px;
      }
      .tier-tab {
        border: 1px solid var(--oppai-border-strong);
        background: transparent;
        color: var(--oppai-text-dim);
        border-radius: 999px;
        font: inherit;
        font-size: 12px;
        padding: 5px 12px;
        cursor: pointer;
      }
      .tier-tab.on {
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        border-color: var(--oppai-primary);
      }
      .tier-note {
        margin: 8px 0 0;
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .slots {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
        margin-top: 14px;
      }
      .slot {
        border: 2px dashed var(--oppai-border-strong);
        border-radius: 14px;
        padding: 10px;
        text-align: center;
        cursor: pointer;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .slot.dragover {
        border-color: var(--oppai-primary);
        background: var(--oppai-surface-2);
      }
      .slot img {
        width: 100%;
        aspect-ratio: 3 / 4;
        object-fit: contain;
        border-radius: 10px;
        background: var(--oppai-surface-2);
      }
      .slot .drop-hint {
        aspect-ratio: 3 / 4;
        display: grid;
        place-items: center;
        color: var(--oppai-text-muted);
        font-size: 12px;
        padding: 6px;
      }
      .slot .slot-label {
        font-size: 13px;
        font-weight: 600;
        margin-top: 6px;
      }
      .slot .slot-hint {
        font-size: 11px;
        color: var(--oppai-text-muted);
      }
      .slot { position: relative; }
      .slot.removed img { opacity: 0.3; filter: grayscale(1); }
      /* Edit and remove sit on the art and appear on hover, like the card's Edit:
         the common case is dropping a picture on the square, and two permanent
         buttons under every one of sixty squares would bury that. */
      .slot .slot-actions {
        position: absolute; top: 14px; right: 14px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.12s;
      }
      .slot:hover .slot-actions, .slot:focus-within .slot-actions { opacity: 1; }
      .slot-act {
        width: 26px; height: 26px; border: 0; border-radius: 7px; display: grid; place-items: center; cursor: pointer;
        background: rgba(0, 0, 0, 0.6); color: #fff; font: inherit;
      }
      .slot-act.danger { color: #f2b8b5; }
      .default-badge {
        position: absolute; top: 8px; left: 8px; background: var(--oppai-accent); color: var(--oppai-on-accent);
        border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 8px;
      }
      .outfit-card .card-build {
        position: absolute; top: 6px; right: 52px; border: 0; border-radius: 8px; background: rgba(0, 0, 0, 0.55); color: #fff;
        font: inherit; font-size: 11px; padding: 4px 8px; cursor: pointer; opacity: 0; transition: opacity 0.12s;
      }
      .outfit-card:hover .card-build, .outfit-card:focus-within .card-build { opacity: 1; }
      /* The heading over the MISC grid. A heading rather than a second panel: these
         squares upload through the same endpoint and save with the same button, so
         framing them as a separate thing would be lying about how they work. */
      .slot-group {
        margin: 22px 0 4px;
        font-size: 13px;
        font-weight: 650;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        color: var(--oppai-text-muted);
      }
      .outfit-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 16px;
      }
      .outfit-actions .danger {
        margin-right: auto;
        color: var(--oppai-error, #f2b8b5);
      }
  `];A([d()],D.prototype,"outfits",2);A([d()],D.prototype,"activities",2);A([d()],D.prototype,"backgrounds",2);A([d()],D.prototype,"defaultBackground",2);A([d()],D.prototype,"backgroundDraft",2);A([d()],D.prototype,"backgroundBusy",2);A([d()],D.prototype,"backgroundVersion",2);A([d()],D.prototype,"wornOutfit",2);A([d()],D.prototype,"outfitDraft",2);A([d()],D.prototype,"outfitBusy",2);A([d()],D.prototype,"outfitError",2);A([d()],D.prototype,"outfitCoverVersion",2);D=A([he("oppai-outfit-wardrobe")],D);const vi=new TextEncoder;function P(e,t,i){e.setUint16(t,i,!0)}function R(e,t,i){e.setUint32(t,i>>>0,!0)}let fe;function xi(e){if(!fe){fe=new Uint32Array(256);for(let i=0;i<256;i++){let a=i;for(let s=0;s<8;s++)a=a&1?3988292384^a>>>1:a>>>1;fe[i]=a>>>0}}let t=4294967295;for(const i of e)t=fe[(t^i)&255]^t>>>8;return(t^4294967295)>>>0}function yi(e){return{date:Math.min(2107,Math.max(1980,e.getFullYear()))-1980<<9|e.getMonth()+1<<5|e.getDate(),time:e.getHours()<<11|e.getMinutes()<<5|Math.floor(e.getSeconds()/2)}}function wi(e){return e.buffer instanceof ArrayBuffer?e.byteOffset===0&&e.byteLength===e.buffer.byteLength?e.buffer:e.buffer.slice(e.byteOffset,e.byteOffset+e.byteLength):e.slice().buffer}async function $i(e){return e instanceof Uint8Array?e:e instanceof ArrayBuffer?new Uint8Array(e):new Uint8Array(await e.arrayBuffer())}async function ki(e,t=new Date){if(e.length>65535)throw new Error("Too many files for one ZIP archive.");const i=yi(t),a=[],s=[];let r=0;for(const b of e){const y=b.name.replaceAll("\\","_").replaceAll("/","_")||"file",w=vi.encode(y),$=await $i(b.data);if(w.length>65535||$.length>4294967295)throw new Error(`File is too large for ZIP: ${y}`);const L=xi($),T=new Uint8Array(30+w.length),z=new DataView(T.buffer);R(z,0,67324752),P(z,4,20),P(z,6,2048),P(z,8,0),P(z,10,i.time),P(z,12,i.date),R(z,14,L),R(z,18,$.length),R(z,22,$.length),P(z,26,w.length),P(z,28,0),T.set(w,30),a.push({header:T,data:$});const I=new Uint8Array(46+w.length),C=new DataView(I.buffer);R(C,0,33639248),P(C,4,20),P(C,6,20),P(C,8,2048),P(C,10,0),P(C,12,i.time),P(C,14,i.date),R(C,16,L),R(C,20,$.length),R(C,24,$.length),P(C,28,w.length),P(C,30,0),P(C,32,0),P(C,34,0),P(C,36,0),R(C,38,0),R(C,42,r),I.set(w,46),s.push(I),r+=T.length+$.length}const l=s.reduce((b,y)=>b+y.length,0),n=new Uint8Array(22),p=new DataView(n.buffer);R(p,0,101010256),P(p,4,0),P(p,6,0),P(p,8,e.length),P(p,10,e.length),R(p,12,l),R(p,16,r),P(p,20,0);const f=[...a.flatMap(b=>[b.header,b.data]),...s,n].map(wi);return new Blob(f,{type:"application/zip"})}var Si=Object.defineProperty,Ci=Object.getOwnPropertyDescriptor,_=(e,t,i,a)=>{for(var s=a>1?void 0:a?Ci(t,i):t,r=e.length-1,l;r>=0;r--)(l=e[r])&&(s=(a?l(t,i,s):l(s))||s);return a&&s&&Si(t,i,s),s};const Ti=40;let B=class extends ce{constructor(){super(...arguments),this.boards=[],this.board="none",this.items=[],this.total=0,this.loading=!1,this.error="",this.expanded=null,this.busy=!1,this.newBoard="",this.savedNames=new Set,this.selecting=!1,this.selected=new Set,this.metadata=new Map}connectedCallback(){super.connectedCallback(),zt(this,"generation gallery"),this.refresh()}get selectedBoard(){return this.board}announceBoard(){this.dispatchEvent(new CustomEvent("board-changed",{detail:{board:this.board},bubbles:!0,composed:!0}))}async refresh(){this.error="";try{const e=await u.galleryBoards();this.boards=e.boards,!this.boards.some(t=>t.id===this.board)&&this.boards.length&&(this.board=this.boards[0].id),this.announceBoard()}catch(e){this.error=e.message;return}await this.loadPage(!0)}async loadPage(e){if(!this.loading){this.loading=!0;try{const t=e?0:this.items.length,i=await u.galleryImages(this.board,t,Ti);this.items=e?i.items:[...this.items,...i.items],this.total=i.total}catch(t){this.error=t.message}finally{this.loading=!1}}}pickBoard(e){this.board!==e&&(this.board=e,this.items=[],this.announceBoard(),this.loadPage(!0))}async createBoard(){const e=this.newBoard.trim();if(!(!e||this.busy)){this.busy=!0,this.error="";try{const t=await u.createGalleryBoard(e);this.newBoard="",await this.refresh(),this.pickBoard(t.id),this.dispatchEvent(new CustomEvent("boards-changed",{bubbles:!0,composed:!0}))}catch(t){this.error=t.message}finally{this.busy=!1}}}async deleteBoard(){const e=this.boards.find(t=>t.id===this.board);if(!(!e||e.id==="none"||this.busy)&&confirm(`Delete the “${e.name}” gallery? Its images move back to Uncategorized.`)){this.busy=!0,this.error="";try{await u.deleteGalleryBoard(e.id);const t=ne("galleryDelete");M(t.message,"success",{emotion:t.emotion,intensity:t.intensity}),this.board="none",this.items=[],await this.refresh(),this.dispatchEvent(new CustomEvent("boards-changed",{bubbles:!0,composed:!0}))}catch(t){this.error=t.message}finally{this.busy=!1}}}async deleteImage(e){var t;if(!this.busy){this.busy=!0;try{await u.deleteGalleryImage(e.name);const i=ne("galleryDelete");M(i.message,"success",{emotion:i.emotion,intensity:i.intensity}),this.items=this.items.filter(a=>a.name!==e.name),this.total=Math.max(0,this.total-1),this.boards=this.boards.map(a=>a.id===this.board?{...a,count:Math.max(0,a.count-1)}:a),((t=this.expanded)==null?void 0:t.name)===e.name&&(this.expanded=null)}catch(i){this.error=i.message}finally{this.busy=!1}}}async saveToLibrary(e){if(!(this.busy||this.savedNames.has(e.name))){this.busy=!0;try{await u.saveGalleryImage({name:e.name}),this.savedNames=new Set(this.savedNames).add(e.name),this.dispatchEvent(new CustomEvent("imported",{detail:{count:1,kind:"image",title:e.name},bubbles:!0,composed:!0}))}catch(t){this.error=t.message}finally{this.busy=!1}}}async openShareMenu(e,t,i){let a=[];try{a=(await u.chatWorkspace()).characters??[]}catch(s){M(s.message||"Couldn't load your chat characters.","error");return}if(!a.length){M("No chat characters yet — add one in Chat first.","error");return}Oe({x:t,y:i,title:"Show this to",items:a.map(s=>({label:s.name,icon:"person",run:()=>void this.share(e,s)}))})}async imageInfo(e){const t=this.metadata.get(e.name);if(t)return t;const i=At(await u.galleryImageMetadata(e.name));return this.metadata.set(e.name,i),i}openImageMenu(e,t){t.preventDefault(),Oe({x:t.clientX,y:t.clientY,title:e.name,items:[{label:"Copy generation metadata",icon:"content_copy",run:()=>void this.copyMetadata(e)},{label:"Use same generation parameters",icon:"replay",run:()=>void this.reuseMetadata(e)},{label:"Export PNG for Civitai",icon:"download",run:()=>void this.exportImage(e)},{label:"Send to chat",icon:"forum",run:()=>void this.openShareMenu(e,t.clientX,t.clientY)}]})}async copyMetadata(e){try{if(!await xt(Z(await this.imageInfo(e))))throw new Error("Clipboard permission was denied.");M("Generation metadata copied.","success")}catch(t){M(t.message||"Couldn't copy generation metadata.","error")}}async reuseMetadata(e){try{const t=await this.imageInfo(e);this.dispatchEvent(new CustomEvent("reuse-generation",{detail:t,bubbles:!0,composed:!0}))}catch(t){M(t.message||"Couldn't load generation metadata.","error")}}async exportImage(e){try{const t=await this.imageInfo(e),i=e.name.replace(/\.[a-z0-9]+$/i,"")||"generated-image";await yt(u.galleryFullURL(e.name),`${i}-civitai.png`,Z(t),re(t)),M("PNG exported with Civitai metadata.","success")}catch(t){M(t.message||"Couldn't export that image.","error")}}async share(e,t){try{await Pt(u.galleryFullURL(e.name),t.id,e.name),this.expanded=null,this.dispatchEvent(new CustomEvent("open-chat",{bubbles:!0,composed:!0}))}catch(i){M(i.message||`Couldn't share with ${t.name}.`,"error")}}toggleSelecting(){this.selecting=!this.selecting,this.selecting||(this.selected=new Set)}toggleSelected(e){const t=new Set(this.selected);t.has(e)?t.delete(e):t.add(e),this.selected=t}async deleteSelected(){const e=[...this.selected];if(!(!e.length||this.busy)){this.busy=!0;try{await u.deleteGalleryImages(e);const t=ne("galleryDelete",{count:e.length});M(t.message,"success",{emotion:t.emotion,intensity:t.intensity});const i=this.selected;this.items=this.items.filter(a=>!i.has(a.name)),this.total=Math.max(0,this.total-e.length),this.boards=this.boards.map(a=>a.id===this.board?{...a,count:Math.max(0,a.count-e.length)}:a),this.selected=new Set,this.selecting=!1}catch(t){this.error=t.message}finally{this.busy=!1}}}async addSelectedToBoard(e){const t=[...this.selected];if(!(!t.length||!e||e===this.board||this.busy)){this.busy=!0;try{await u.addGalleryImagesToBoard(e,t);const i=this.selected;this.items=this.items.filter(a=>!i.has(a.name)),this.total=Math.max(0,this.total-t.length),this.selected=new Set,this.selecting=!1,await this.refresh()}catch(i){this.error=i.message}finally{this.busy=!1}}}render(){const e=this.boards.find(t=>t.id===this.board);return o`
      <div class="panel">
        <div class="head">
          <span class="material-symbols-rounded" style="font-size:18px;">photo_library</span>
          Invoke gallery
          <span class="count">${e?`${this.total||e.count} images`:""}</span>
          ${this.items.length?o`<button class="sel-toggle ${this.selecting?"on":""}"
                @click=${()=>this.toggleSelecting()}>
                ${this.selecting?"Done":"Select"}
              </button>`:c}
        </div>
        ${this.selecting?o`<div class="sel-bar">
              <span class="sel-count">${this.selected.size} selected</span>
              <select class="sel-move" aria-label="Move to gallery" .value=${""}
                ?disabled=${this.busy||!this.selected.size}
                @change=${t=>{const i=t.target;this.addSelectedToBoard(i.value),i.value=""}}>
                <option value="">Add to gallery…</option>
                ${this.boards.filter(t=>t.id!==this.board).map(t=>o`<option value=${t.id}>${t.name}</option>`)}
              </select>
              <button class="sel-del" ?disabled=${this.busy||!this.selected.size}
                @click=${()=>this.deleteSelected()}>
                <span class="material-symbols-rounded" style="font-size:15px; vertical-align:-3px;">delete</span>
                Delete
              </button>
            </div>`:c}
        ${this.boards.length?o`
              <select class="board-select" aria-label="Gallery" .value=${this.board}
                @change=${t=>this.pickBoard(t.target.value)}>
                ${this.boards.map(t=>o`<option value=${t.id}>${t.name}${t.count?` · ${t.count}`:""}</option>`)}
              </select>
              ${this.boards.length<=6?o`<div class="boards">
                ${this.boards.map(t=>o`<button class="board ${t.id===this.board?"on":""}"
                    @click=${()=>this.pickBoard(t.id)}>${t.name}${t.count?` · ${t.count}`:""}</button>`)}
              </div>`:c}
              ${this.board!=="none"?o`<button class="board-del" ?disabled=${this.busy}
                    title="Delete this gallery (its images move to Uncategorized)"
                    @click=${()=>this.deleteBoard()}>
                    <span class="material-symbols-rounded" style="font-size:15px; vertical-align:-3px;">delete</span>
                    Delete gallery
                  </button>`:c}
            `:c}
        <div class="note">New generations are filed into ${(e==null?void 0:e.name)??"this gallery"}.</div>
        <div class="new-board">
          <input maxlength="300" placeholder="New Invoke gallery" .value=${this.newBoard}
            @input=${t=>this.newBoard=t.target.value}
            @keydown=${t=>{t.key==="Enter"&&this.createBoard()}} />
          <button ?disabled=${this.busy||!this.newBoard.trim()} @click=${()=>this.createBoard()}>Create</button>
        </div>
        ${this.error?o`<div class="err">${this.error}</div>`:c}
        ${this.items.length?o`<div class="grid">
              ${this.items.map(t=>{const i=this.selected.has(t.name);return o`
                  <button
                    class="tile ${this.selecting?"selectable":""} ${i?"picked":""}"
                    title=${t.name}
                    @contextmenu=${a=>{this.selecting||(a.preventDefault(),this.openImageMenu(t,a))}}
                    @click=${()=>this.selecting?this.toggleSelected(t.name):this.expanded=t}
                  >
                    <img src=${u.galleryThumbURL(t.name)} alt="Generated image" loading="lazy" />
                    ${this.selecting?o`<span class="check">
                          <span class="material-symbols-rounded" style="font-size:15px;">
                            ${i?"check_circle":"radio_button_unchecked"}
                          </span>
                        </span>`:o`<span
                          class="del"
                          role="button"
                          title="Delete from InvokeAI"
                          @click=${a=>{a.stopPropagation(),this.deleteImage(t)}}
                        >
                          <span class="material-symbols-rounded" style="font-size:14px;">delete</span>
                        </span>`}
                  </button>
                `})}
            </div>`:this.loading?c:o`<div class="note">Nothing here yet — generated images land in this gallery.</div>`}
        ${this.loading?o`<div class="note">Loading…</div>`:c}
        ${!this.loading&&this.items.length<this.total?o`<button class="more" @click=${()=>this.loadPage(!1)}>
              Load more (${this.total-this.items.length} left)
            </button>`:c}
      </div>
      ${this.expanded?this.renderExpanded(this.expanded):c}
    `}renderExpanded(e){const t=this.savedNames.has(e.name);return o`
      <div class="overlay" @click=${i=>{i.target===i.currentTarget&&(this.expanded=null)}}>
        <img src=${u.galleryFullURL(e.name)} alt="Generated image"
          @contextmenu=${i=>this.openImageMenu(e,i)} />
        <div class="overlay-actions">
          <button class="obtn primary" ?disabled=${this.busy||t} @click=${()=>this.saveToLibrary(e)}>
            <span class="material-symbols-rounded" style="font-size:17px;">${t?"check":"save"}</span>
            ${t?"In library":"Save to library"}
          </button>
          <button class="obtn" ?disabled=${this.busy}
            @click=${i=>void this.openShareMenu(e,i.clientX,i.clientY)}>
            <span class="material-symbols-rounded" style="font-size:17px;">forum</span> Send to chat
          </button>
          <button class="obtn" @click=${()=>this.dispatchEvent(new CustomEvent("cut-out",{detail:{url:u.galleryFullURL(e.name),name:e.name},bubbles:!0,composed:!0}))}>
            <span class="material-symbols-rounded" style="font-size:17px;">background_replace</span> Cut out
          </button>
          <button class="obtn" ?disabled=${this.busy} @click=${()=>void this.exportImage(e)}>
            <span class="material-symbols-rounded" style="font-size:17px;">download</span> Export for Civitai
          </button>
          <button class="obtn danger" ?disabled=${this.busy} @click=${()=>this.deleteImage(e)}>
            <span class="material-symbols-rounded" style="font-size:17px;">delete</span> Delete
          </button>
          <button class="obtn" @click=${()=>this.expanded=null}>
            <span class="material-symbols-rounded" style="font-size:17px;">close</span> Close
          </button>
        </div>
      </div>
    `}};B.styles=[de,ke,pe`
      :host {
        display: block;
        color: var(--oppai-text);
      }
      .panel {
        background: var(--oppai-surface-2);
        border-radius: 14px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .head {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
      .head .count {
        margin-left: auto;
        font-weight: 400;
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .boards {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .board-select {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 10px;
        background: var(--oppai-surface);
        color: var(--oppai-text);
        font: inherit;
        font-size: 12px;
        padding: 8px 10px;
      }
      .new-board {
        display: flex;
        gap: 6px;
      }
      .new-board input {
        min-width: 0;
        flex: 1;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 9px;
        background: var(--oppai-surface);
        color: var(--oppai-text);
        font: inherit;
        font-size: 12px;
        padding: 7px 9px;
      }
      .new-board button {
        border: none;
        border-radius: 9px;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        font: inherit;
        padding: 7px 10px;
        cursor: pointer;
      }
      .board {
        border: 1px solid var(--oppai-border-strong);
        background: transparent;
        color: var(--oppai-text-dim);
        border-radius: 999px;
        font: inherit;
        font-size: 12px;
        padding: 4px 10px;
        cursor: pointer;
      }
      .board.on {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
        border-color: var(--oppai-accent);
      }
      .board-del {
        margin-top: 6px;
        border: 1px solid var(--oppai-border-strong);
        background: transparent;
        color: var(--oppai-error, #f2b8b5);
        border-radius: 9px;
        font: inherit;
        font-size: 12px;
        padding: 5px 10px;
        cursor: pointer;
      }
      .board-del:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
        gap: 8px;
      }
      .tile {
        position: relative;
        border: none;
        padding: 0;
        border-radius: 10px;
        overflow: hidden;
        cursor: pointer;
        background: var(--oppai-surface);
        aspect-ratio: 1;
      }
      .tile img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .tile .del {
        position: absolute;
        top: 3px;
        right: 3px;
        width: 22px;
        height: 22px;
        border: none;
        border-radius: 11px;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        display: none;
        place-items: center;
        cursor: pointer;
      }
      .tile:hover .del {
        display: grid;
      }
      .tile.picked {
        outline: 2px solid var(--oppai-primary);
        outline-offset: -2px;
      }
      .tile.picked img {
        opacity: 0.8;
      }
      /* The selection tick sits where the delete button would; always visible in
         select mode so tapping a tile toggles it. */
      .tile .check {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 22px;
        height: 22px;
        border-radius: 11px;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        display: grid;
        place-items: center;
      }
      .tile.picked .check {
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
      }
      /* Head "Select" toggle and the selection action bar. */
      .sel-toggle {
        margin-left: 8px;
        border: 1px solid var(--oppai-border-strong);
        background: transparent;
        color: var(--oppai-text-dim);
        border-radius: 999px;
        font: inherit;
        font-size: 12px;
        padding: 3px 10px;
        cursor: pointer;
      }
      .sel-toggle.on {
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        border-color: var(--oppai-primary);
      }
      .sel-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .sel-count {
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .sel-move {
        border: 1px solid var(--oppai-border-strong);
        border-radius: 9px;
        background: var(--oppai-surface);
        color: var(--oppai-text);
        font: inherit;
        font-size: 12px;
        padding: 6px 8px;
      }
      .sel-move:disabled {
        opacity: 0.5;
      }
      .sel-del {
        margin-left: auto;
        border: none;
        border-radius: 9px;
        background: var(--oppai-surface);
        color: var(--oppai-error, #f2b8b5);
        font: inherit;
        font-size: 12px;
        font-weight: 600;
        padding: 6px 12px;
        cursor: pointer;
      }
      .sel-del:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .note {
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .more {
        border: 1px dashed var(--oppai-border-strong);
        background: none;
        color: var(--oppai-text-dim);
        border-radius: 10px;
        font: inherit;
        font-size: 13px;
        padding: 8px;
        cursor: pointer;
      }
      .err {
        font-size: 12px;
        color: var(--oppai-error, #f2b8b5);
      }

      /* Expanded (lightbox) overlay. */
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.82);
        z-index: 70;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 14px;
        padding: 20px;
      }
      .overlay img {
        max-width: min(96vw, 1400px);
        max-height: 82vh;
        object-fit: contain;
        border-radius: 10px;
      }
      .overlay-actions {
        display: flex;
        gap: 10px;
      }
      .obtn {
        border: none;
        border-radius: 10px;
        background: var(--oppai-surface-2);
        color: var(--oppai-text);
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        padding: 10px 16px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .obtn.primary {
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
      }
      .obtn.danger {
        color: var(--oppai-error, #f2b8b5);
      }
      .obtn:disabled {
        opacity: 0.55;
        cursor: default;
      }

      /* Full-height gallery rail in the generation workspace. The host attribute keeps
         the component reusable while matching Invoke's always-present board browser. */
      :host([workspace]) {
        height: 100%;
        min-height: 0;
      }
      :host([workspace]) .panel {
        height: 100%;
        min-height: 0;
        box-sizing: border-box;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        border-radius: 0;
        background: transparent;
        padding: 0 10px 12px;
        gap: 9px;
      }
      :host([workspace]) .head {
        position: sticky;
        top: 0;
        z-index: 2;
        min-height: 42px;
        margin: 0 -10px;
        padding: 0 10px;
        background: var(--oppai-surface-2);
        border-bottom: 1px solid var(--oppai-border);
        text-transform: uppercase;
        letter-spacing: .65px;
        font-size: 11px;
      }
      :host([workspace]) .board-select {
        height: 34px;
        border-radius: 8px;
        padding: 5px 8px;
      }
      :host([workspace]) .boards { display: none; }
      :host([workspace]) .note { line-height: 1.4; }
      :host([workspace]) .new-board input,
      :host([workspace]) .new-board button { height: 32px; box-sizing: border-box; }
      :host([workspace]) .grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
      }
      :host([workspace]) .tile {
        border-radius: 6px;
        outline-offset: -2px;
      }
      @media (max-width: 1240px) {
        :host([workspace]) .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (max-width: 1020px) {
        :host([workspace]) .panel { overflow-y: visible; }
        :host([workspace]) .grid { grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); }
      }
    `];_([d()],B.prototype,"boards",2);_([d()],B.prototype,"board",2);_([d()],B.prototype,"items",2);_([d()],B.prototype,"total",2);_([d()],B.prototype,"loading",2);_([d()],B.prototype,"error",2);_([d()],B.prototype,"expanded",2);_([d()],B.prototype,"busy",2);_([d()],B.prototype,"newBoard",2);_([d()],B.prototype,"savedNames",2);_([d()],B.prototype,"selecting",2);_([d()],B.prototype,"selected",2);B=_([he("oppai-invoke-gallery")],B);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Ge extends Lt{constructor(t){if(super(t),this.it=c,t.type!==It.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===c||t==null)return this._t=void 0,this.it=t;if(t===Mt)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const i=[t];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}}Ge.directiveName="unsafeHTML",Ge.resultType=1;const rt=Dt(Ge);function zi(e,t){if(e.length===0)return t.slice();const i=e.slice(),a=new Set(e.map(s=>s.id));for(const s of t){if(!a.has(s.id)){a.add(s.id),i.push(s);continue}const r=i[i.length-1];if(r.id===s.id){const l=new Set(r.images.map(n=>n.id));i[i.length-1]={...r,images:[...r.images,...s.images.filter(n=>!l.has(n.id))]}}}return i}function Me(e){var a;const t=e.createdAt??((a=e.images[0])==null?void 0:a.createdAt)??"";if(!t)return"";const i=new Date(t);return Number.isNaN(i.getTime())?"":i.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}const se={"euler a":"euler_a",euler:"euler","euler karras":"euler_k",lms:"lms","lms karras":"lms_k",heun:"heun","heun karras":"heun_k",dpm2:"kdpm_2","dpm2 karras":"kdpm_2_k","dpm2 a":"kdpm_2_a","dpm2 a karras":"kdpm_2_a_k","dpm++ 2s a":"dpmpp_2s","dpm++ 2s a karras":"dpmpp_2s_k","dpm++ 2m":"dpmpp_2m","dpm++ 2m karras":"dpmpp_2m_k","dpm++ 2m sde":"dpmpp_2m_sde","dpm++ 2m sde karras":"dpmpp_2m_sde_k","dpm++ 3m sde":"dpmpp_3m","dpm++ 3m sde karras":"dpmpp_3m_k","dpm++ sde":"dpmpp_sde","dpm++ sde karras":"dpmpp_sde_k",ddim:"ddim",ddpm:"ddpm",deis:"deis",unipc:"unipc",lcm:"lcm",pndm:"pndm",tcd:"tcd"};function Pi(e){if(!e)return"";const t=e.trim().toLowerCase().replace(/\s+/g," ");if(se[t])return se[t];if(Object.values(se).includes(t))return t;const i=t.split(" ");for(let a=i.length-1;a>=1;a--){const s=i.slice(0,a).join(" ");if(se[s])return se[s]}return""}function Li(e){const t=/^\s*(\d{2,5})\s*[x×]\s*(\d{2,5})\s*$/i.exec(e??"");if(!t)return null;const i=Number(t[1]),a=Number(t[2]);return i>=64&&a>=64?[i,a]:null}function nt(e){var r;const t=(e.prompt??"").trim();if(!t)return null;const i={prompt:t};(r=e.negativePrompt)!=null&&r.trim()&&(i.negativePrompt=e.negativePrompt.trim());const a=Pi(e.sampler);a&&(i.sampler=a),e.steps&&e.steps>0&&e.steps<=150&&(i.steps=Math.round(e.steps)),e.cfgScale&&e.cfgScale>0&&e.cfgScale<=30&&(i.cfgScale=e.cfgScale),e.seed&&e.seed>0&&(i.seed=e.seed);const s=Li(e.size)??(e.width>=64&&e.height>=64?[e.width,e.height]:null);return s&&([i.width,i.height]=s),i}var Ii=Object.defineProperty,Mi=Object.getOwnPropertyDescriptor,x=(e,t,i,a)=>{for(var s=a>1?void 0:a?Mi(t,i):t,r=e.length-1,l;r>=0;r--)(l=e[r])&&(s=(a?l(t,i,s):l(s))||s);return a&&s&&Ii(t,i,s),s};const Di=[{id:"",label:"All"},{id:"checkpoint",label:"Checkpoints"},{id:"lora",label:"LoRAs"},{id:"embedding",label:"Embeddings"},{id:"vae",label:"VAEs"},{id:"controlnet",label:"ControlNet"},{id:"upscaler",label:"Upscalers"}],Bi=[{id:"",label:"Most downloaded"},{id:"rated",label:"Highest rated"},{id:"liked",label:"Most liked"},{id:"newest",label:"Newest"},{id:"collected",label:"Most collected"},{id:"discussed",label:"Most discussed"},{id:"images",label:"Most images"}],Oi=[{id:"",label:"All time"},{id:"year",label:"This year"},{id:"month",label:"This month"},{id:"week",label:"This week"},{id:"day",label:"Today"}],Ri=["SD 1.5","SD 2.1","SDXL 1.0","Pony","Illustrious","NoobAI","Flux.1 D","Flux.1 S","SD 3.5","Kolors","Hunyuan 1","Wan Video"];let v=class extends ce{constructor(){super(...arguments),this.backend="invokeai",this.canManage=!0,this.manageNote="",this.tab="browse",this.q="",this.type="",this.sort="",this.period="",this.base="",this.category="",this.creator="",this.nsfw=!0,this.categories=[],this.items=[],this.cursor="",this.loading=!1,this.error="",this.detail=null,this.detailLoading=!1,this.versionId=0,this.shownImage="",this.zoomed="",this.galleryOpen=!1,this.gallery=[],this.galleryCursor="",this.galleryLoading=!1,this.gallerySort="",this.picked=null,this.copied=!1,this.promptsNeedKey=!1,this.jobs=[],this.installing=!1,this.jobsOpen=!1,this.me=null,this.meError="",this.meLoading=!1,this.accountTab="models",this.myImages=[],this.myImagesCursor="",this.myModels=[],this.myModelsCursor="",this.myModelsLoading=!1,this.posts=[],this.postsCursor="",this.postsLoading=!1,this.openPost=null,this.collections=[],this.collectionsCursor="",this.collectionsLoading=!1,this.collectionQuery="",this.collectionSort="newest",this.openCollection=null,this.collectionImages=[],this.collectionImagesCursor="",this.installed=[],this.installedLoading=!1,this.installedError="",this.installedFilter="all",this.syncing="",this.syncNote="",this.pinning="",this.pinVersion="",this.manageKey="",this.managePage=null,this.manageVersion=0,this.manageBusy=!1}get genName(){return this.backend==="invokeai"?"InvokeAI":"Automatic1111"}connectedCallback(){super.connectedCallback(),this.search(!0),this.loadCategories(),this.pollJobs(),this.jobTimer=window.setInterval(()=>void this.pollJobs(),5e3)}disconnectedCallback(){super.disconnectedCallback(),this.jobTimer&&clearInterval(this.jobTimer)}async loadCategories(){try{this.categories=(await u.civitaiCategories()).categories}catch{this.categories=[]}}async pollJobs(){try{const t=(await u.civitaiInstalls()).jobs.filter(a=>a.status!=="cancelled").slice(0,5),i=t.some(a=>a.status==="completed")&&!this.jobs.some(a=>a.status==="completed");this.jobs=t,i&&this.tab==="installed"&&this.loadInstalled(!1)}catch{}}async search(e){if(!this.loading){this.loading=!0,this.error="";try{const t=await u.civitaiSearch({q:this.q||void 0,type:this.type||void 0,category:this.category||void 0,sort:this.sort||void 0,period:this.period||void 0,base:this.base||void 0,creator:this.creator||void 0,nsfw:this.nsfw,cursor:e?void 0:this.cursor||void 0});this.items=e?t.items:[...this.items,...t.items],this.cursor=t.nextCursor??""}catch(t){this.error=t.message}finally{this.loading=!1}}}setAnd(e,t){switch(e){case"type":this.type=t;break;case"sort":this.sort=t;break;case"period":this.period=t;break;case"base":this.base=t;break;case"category":this.category=t;break;case"creator":this.creator=t;break}this.tab="browse",this.search(!0)}async openDetail(e){const t=typeof e=="number"?e:e.id;if(typeof e!="number"){this.detail=e;const i=e.versions[0];this.versionId=(i==null?void 0:i.id)??0,this.shownImage=(i==null?void 0:i.images[0])??""}else this.detail=null;this.galleryOpen=!1,this.gallery=[],this.galleryCursor="",this.detailLoading=!0;try{const i=await u.civitaiModel(t);this.detail=i;const a=i.versions.find(s=>s.id===this.versionId)??i.versions[0];this.versionId=(a==null?void 0:a.id)??0,this.shownImage=(a==null?void 0:a.images[0])??this.shownImage}catch(i){this.error=i.message,this.detail||(this.detail=null)}finally{this.detailLoading=!1}}closeDetail(){this.detail=null,this.galleryOpen=!1,this.picked=null}currentVersion(){var e;return(e=this.detail)==null?void 0:e.versions.find(t=>t.id===this.versionId)}pickVersion(e){this.versionId=e.id,this.shownImage=e.images[0]??"",this.galleryOpen&&(this.gallery=[],this.galleryCursor="",this.loadGallery(!0))}async install(e){if(!(this.installing||!e.downloadUrl||!this.detail)){this.installing=!0,this.error="";try{await u.civitaiInstall(e.downloadUrl,{modelId:this.detail.id,versionId:e.id}),await this.pollJobs()}catch(t){this.error=t.message}finally{this.installing=!1}}}async loadGallery(e,t){if(!this.galleryLoading){this.galleryLoading=!0;try{const i=await u.civitaiImages({versionId:t?void 0:this.versionId||void 0,username:t,sort:this.gallerySort||void 0,nsfw:this.nsfw,cursor:e?void 0:this.galleryCursor||void 0});t?(this.myImages=e?i.items:[...this.myImages,...i.items],this.myImagesCursor=i.nextCursor??""):(this.gallery=e?i.items:[...this.gallery,...i.items],this.galleryCursor=i.nextCursor??"",this.promptsNeedKey=i.items.length>0&&i.withPrompts===0&&!i.keySet)}catch(i){this.error=i.message}finally{this.galleryLoading=!1}}}toggleGallery(){this.galleryOpen=!this.galleryOpen,this.galleryOpen&&this.gallery.length===0&&this.loadGallery(!0)}usePrompt(e){const t=nt(e);t&&(this.dispatchEvent(new CustomEvent("use-prompt",{detail:t,bubbles:!0,composed:!0})),this.picked=null,this.zoomed="")}async copyPrompt(e){try{await navigator.clipboard.writeText(e.prompt??""),this.copied=!0,setTimeout(()=>this.copied=!1,1500)}catch{}}async loadMe(){if(!this.meLoading){if(this.me){this.loadAccountTab(!1);return}this.meLoading=!0,this.meError="";try{this.me=await u.civitaiMe(),this.myImages=[],this.myImagesCursor="",this.loadMyImages(!0).then(()=>this.loadAccountTab(!1))}catch(e){this.meError=e.message}finally{this.meLoading=!1}}}selectAccountTab(e){this.accountTab=e,this.openPost=null,this.openCollection=null,this.loadAccountTab(!1)}loadAccountTab(e){if(!this.me)return Promise.resolve();switch(this.accountTab){case"models":return e||this.myModels.length===0?this.loadMyModels(!e):Promise.resolve();case"posts":return e||this.posts.length===0?this.loadPosts(!e):Promise.resolve();case"images":return e||this.myImages.length===0?this.loadMyImages(!e):Promise.resolve();case"collections":return e||this.collections.length===0?this.loadCollections(!e):Promise.resolve()}}async loadMyImages(e){if(!(!this.me||this.galleryLoading)){this.galleryLoading=!0;try{const t=await u.civitaiImages({username:this.me.username,sort:"newest",nsfw:this.nsfw,cursor:e?void 0:this.myImagesCursor||void 0});this.myImages=e?t.items:[...this.myImages,...t.items],this.myImagesCursor=t.nextCursor??""}catch(t){this.meError=t.message}finally{this.galleryLoading=!1}}}async loadMyModels(e){if(!(!this.me||this.myModelsLoading)){this.myModelsLoading=!0;try{const t=await u.civitaiSearch({creator:this.me.username,sort:"newest",nsfw:this.nsfw,cursor:e?void 0:this.myModelsCursor||void 0});this.myModels=e?t.items:[...this.myModels,...t.items],this.myModelsCursor=t.nextCursor??""}catch(t){this.meError=t.message}finally{this.myModelsLoading=!1}}}async loadPosts(e){if(!(!this.me||this.postsLoading)){this.postsLoading=!0;try{const t=await u.civitaiPosts({username:this.me.username,nsfw:this.nsfw,cursor:e?void 0:this.postsCursor||void 0});this.posts=e?t.items:zi(this.posts,t.items),this.postsCursor=t.nextCursor??""}catch(t){this.meError=t.message}finally{this.postsLoading=!1}}}async loadCollections(e){if(!this.collectionsLoading){this.collectionsLoading=!0;try{const t=await u.civitaiCollections({q:this.collectionQuery||void 0,sort:this.collectionSort,cursor:e?void 0:this.collectionsCursor||void 0});this.collections=e?t.items:[...this.collections,...t.items],this.collectionsCursor=t.nextCursor??""}catch(t){this.meError=t.message}finally{this.collectionsLoading=!1}}}async openCollectionPictures(e,t){if(!this.galleryLoading){t&&(this.openCollection=e,this.collectionImages=[],this.collectionImagesCursor=""),this.galleryLoading=!0;try{const i=await u.civitaiImages({collectionId:e.id,sort:"newest",nsfw:this.nsfw,cursor:t?void 0:this.collectionImagesCursor||void 0});this.collectionImages=t?i.items:[...this.collectionImages,...i.items],this.collectionImagesCursor=i.nextCursor??""}catch(i){this.meError=i.message}finally{this.galleryLoading=!1}}}async loadInstalled(e){if(!this.installedLoading){this.installedLoading=!0,this.installedError="";try{this.installed=(await u.civitaiInstalled(e)).models}catch(t){this.installedError=t.message}finally{this.installedLoading=!1}}}async sync(e,t){if(!this.syncing){this.syncing=e.key,this.syncNote="";try{const i=await u.civitaiSync(e.key,t),a="modelId"in i&&i.modelId;this.syncNote=a?`${e.name}: cover, description and trigger words set from “${i.modelName}”.`:`${e.name}: Civitai does not know this file. Paste a version id to link it by hand.`,this.pinning="",this.pinVersion="",await this.loadInstalled(!1)}catch(i){this.syncNote=`${e.name}: ${i.message}`}finally{this.syncing=""}}}async manage(e){if(this.manageKey===e.key){this.manageKey="",this.managePage=null;return}const t=e.civitai;if(t){this.manageKey=e.key,this.managePage=null,this.manageVersion=t.versionId;try{const i=await u.civitaiModel(t.modelId);this.manageKey===e.key&&(this.managePage=i)}catch(i){this.syncNote=`${e.name}: ${i.message}`}}}async chooseCover(e,t){if(!this.manageBusy){this.manageBusy=!0;try{await u.civitaiCover(e.key,t),this.syncNote=`${e.name}: cover set.`,await this.loadInstalled(!1)}catch(i){this.syncNote=`${e.name}: ${i.message}`}finally{this.manageBusy=!1}}}async updateModel(e,t){var s;if(this.manageBusy)return;const i=(s=this.managePage)==null?void 0:s.versions.find(r=>{var l;return r.id===(t??((l=e.civitai)==null?void 0:l.latestVersionId))}),a=i?`version ${i.name}`:"the newest version";if(confirm(`Update “${e.name}” to ${a}? It is downloaded into ${this.genName}, then the current file is deleted.`)){this.manageBusy=!0;try{await u.civitaiUpdate(e.key,t),this.syncNote=`${e.name}: downloading ${a}; the current file goes once it is in.`,this.manageKey="",this.managePage=null,await this.pollJobs()}catch(r){this.syncNote=`${e.name}: ${r.message}`}finally{this.manageBusy=!1}}}async deleteInstalled(e){if(!this.manageBusy&&confirm(`Delete “${e.name}” from ${this.genName}? The file goes with it.`)){this.manageBusy=!0;try{await u.deleteModel(e.key),this.syncNote=`${e.name}: deleted.`,this.manageKey===e.key&&(this.manageKey="",this.managePage=null),this.installed=this.installed.filter(t=>t.key!==e.key)}catch(t){this.syncNote=`${e.name}: ${t.message}`}finally{this.manageBusy=!1}}}selectTab(e){this.tab=e,this.closeDetail(),e==="account"&&this.loadMe(),e==="installed"&&this.installed.length===0&&this.loadInstalled(!1)}jobLabel(e){return e.status==="downloading"&&e.totalBytes?`downloading ${Math.round((e.bytes??0)/e.totalBytes*100)}%`:e.status}render(){return o`
      <div class="wrap">
        <div class="topbar">
          <h2><span class="material-symbols-rounded">travel_explore</span> Civitai</h2>
          <div class="tabs" role="tablist">
            ${["browse","account","installed"].map(e=>o`<button role="tab" aria-selected=${this.tab===e?"true":"false"}
                class=${this.tab===e?"on":""} @click=${()=>this.selectTab(e)}>
                ${e==="browse"?"Browse":e==="account"?"My account":"Installed"}
              </button>`)}
          </div>
          <div style="margin-left:auto; display:flex; gap:8px; align-items:center;">
            ${this.jobs.length?this.renderJobsChip():c}
            <button class="close" style="margin-left:0;" @click=${()=>this.dispatchEvent(new CustomEvent("close"))}>
              <span class="material-symbols-rounded" style="font-size:17px;">close</span> Back to studio
            </button>
          </div>
        </div>
        ${this.jobs.length&&this.jobsOpen?o`<div class="jobs">
              ${this.jobs.map(e=>o`<div class="job">
                  <span class="material-symbols-rounded" style="font-size:15px;">download</span>
                  <span class="st ${e.status}">${this.jobLabel(e)}</span>
                  <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${e.error||e.source}</span>
                </div>`)}
            </div>`:c}
        ${this.tab==="browse"?this.renderBrowse():this.tab==="account"?this.renderAccount():this.renderInstalled()}
      </div>
      ${this.detail?this.renderDetail(this.detail):c}
      ${this.picked?this.renderPicked(this.picked):this.zoomed?o`<div class="zoom plain" @click=${()=>this.zoomed=""}>
            <img src=${u.civitaiImageURL(this.zoomed)} alt="Preview" />
          </div>`:c}
    `}renderJobsChip(){const e=this.jobs.filter(a=>a.status==="downloading"||a.status==="running"||a.status==="waiting"),t=this.jobs.some(a=>a.status==="error"),i=e.length?e.length===1?this.jobLabel(e[0]):`${e.length} downloading`:`${this.jobs.length} download${this.jobs.length===1?"":"s"}`;return o`<button class="chip small jobs-chip ${this.jobsOpen?"on":""}"
      title=${this.jobsOpen?"Hide the install log":"Show the install log"} aria-expanded=${this.jobsOpen?"true":"false"}
      @click=${()=>this.jobsOpen=!this.jobsOpen}>
      <span class="material-symbols-rounded" style="font-size:15px;">${t?"error":"download"}</span> ${i}
      ${e.length?o`<span class="dot"></span>`:c}
    </button>`}renderBrowse(){return o`
      <div class="controls">
        <input
          type="search"
          placeholder="Search models…"
          .value=${this.q}
          @input=${e=>this.q=e.target.value}
          @keydown=${e=>{e.key==="Enter"&&this.search(!0)}}
        />
        <select aria-label="Sort" .value=${this.sort} @change=${e=>this.setAnd("sort",e.target.value)}>
          ${Bi.map(e=>o`<option value=${e.id} ?selected=${e.id===this.sort}>${e.label}</option>`)}
        </select>
        <select aria-label="Period" .value=${this.period} @change=${e=>this.setAnd("period",e.target.value)}>
          ${Oi.map(e=>o`<option value=${e.id} ?selected=${e.id===this.period}>${e.label}</option>`)}
        </select>
        <select aria-label="Base model" .value=${this.base} @change=${e=>this.setAnd("base",e.target.value)}>
          <option value="">Any base model</option>
          ${Ri.map(e=>o`<option value=${e} ?selected=${e===this.base}>${e}</option>`)}
        </select>
        <select aria-label="Category" .value=${this.category} @change=${e=>this.setAnd("category",e.target.value)}>
          <option value="">All categories</option>
          ${this.categories.map(e=>o`<option value=${e.name} ?selected=${e.name===this.category}>${e.name} (${be(e.count)})</option>`)}
        </select>
        <button class="chip ${this.nsfw?"on":""}" title="Show adult models" aria-pressed=${this.nsfw?"true":"false"}
          @click=${()=>{this.nsfw=!this.nsfw,this.search(!0)}}>
          <span class="material-symbols-rounded" style="font-size:15px;">explicit</span> NSFW
        </button>
      </div>
      <div class="controls">
        ${Di.map(e=>o`<button class="chip ${this.type===e.id?"on":""}" @click=${()=>this.setAnd("type",e.id)}>${e.label}</button>`)}
        ${this.creator?o`<button class="chip on" title="Showing one creator's models" @click=${()=>this.setAnd("creator","")}>
              <span class="material-symbols-rounded" style="font-size:15px;">person</span> ${this.creator}
              <span class="material-symbols-rounded" style="font-size:15px;">close</span>
            </button>`:c}
      </div>
      ${this.error?o`<div class="err">${this.error}</div>`:c}
      <div class="grid">${this.items.map(e=>this.renderCard(e))}</div>
      ${this.loading?o`<div class="note">Searching Civitai…</div>`:this.items.length?this.cursor?o`<button class="more" @click=${()=>this.search(!1)}>Load more</button>`:c:o`<div class="note">No models matched. Try another search.</div>`}
    `}renderCard(e){var i,a;const t=(i=e.versions[0])==null?void 0:i.images[0];return o`
      <button class="card" @click=${()=>this.openDetail(e)}>
        ${t?o`<img src=${u.civitaiImageURL(t)} alt=${e.name} loading="lazy" />`:o`<div class="noimg"><span class="material-symbols-rounded" style="font-size:34px;">image</span></div>`}
        ${e.installed?o`<span class="badge ok"><span class="material-symbols-rounded" style="font-size:13px;">check</span> Installed</span>`:c}
        ${e.nsfw?o`<span class="badge right">18+</span>`:c}
        <div class="meta">
          <div class="name">${e.name}</div>
          <div class="sub">
            <span>${lt(e.type)}</span>
            ${(a=e.versions[0])!=null&&a.base?o`<span>${e.versions[0].base}</span>`:c}
            <span>⤓ ${be(e.downloads)}</span>
          </div>
        </div>
      </button>
    `}renderDetail(e){var i;const t=this.currentVersion();return o`
      <div class="overlay" @click=${a=>{a.target===a.currentTarget&&this.closeDetail()}}>
        <div class="detail" role="dialog" aria-label=${e.name}>
          <div>
            ${this.shownImage?o`<img class="big" src=${u.civitaiImageURL(this.shownImage)} alt=${e.name}
                  @click=${()=>this.zoomed=this.shownImage} />`:o`<div class="big" style="display:grid; place-items:center;">
                  <span class="material-symbols-rounded" style="font-size:40px; color:var(--oppai-text-muted);">image</span>
                </div>`}
            ${t&&t.images.length>1?o`<div class="thumbs">
                  ${t.images.map(a=>o`<img src=${u.civitaiImageURL(a)} class=${a===this.shownImage?"on":""}
                      alt="Preview" loading="lazy" @click=${()=>this.shownImage=a} />`)}
                </div>`:c}
            ${(i=t==null?void 0:t.files)!=null&&i.length?o`<div class="vlabel">Files</div>
                  <div class="files">
                    ${t.files.map(a=>o`<div class="f">
                        <span>${a.name}</span>
                        <span>${dt(a.sizeMB)}</span>
                        ${a.format?o`<span>${a.format}</span>`:c}
                        ${a.precision?o`<span>${a.precision}</span>`:c}
                        ${a.primary?o`<span class="material-symbols-rounded" title="Primary file" style="font-size:14px;">star</span>`:c}
                      </div>`)}
                  </div>`:c}
          </div>
          <div>
            <h3>${e.name}</h3>
            <div class="sub">
              <span>${lt(e.type)}</span>
              ${e.creator?o`<button class="creator" title="Show this creator's models" @click=${()=>{this.closeDetail(),this.setAnd("creator",e.creator??"")}}>
                    ${e.creatorImage?o`<img src=${u.civitaiImageURL(e.creatorImage)} alt="" />`:o`<span class="material-symbols-rounded" style="font-size:16px;">person</span>`}
                    ${e.creator}
                  </button>`:c}
              <span>⤓ ${be(e.downloads)}</span>
              <span>♥ ${be(e.likes)}</span>
              ${e.nsfw?o`<span>18+</span>`:c}
              <a class="ghost" style="padding:3px 8px; font-size:12px; text-decoration:none;" target="_blank" rel="noopener noreferrer"
                href=${`https://civitai.com/models/${e.id}${t?`?modelVersionId=${t.id}`:""}`}>
                <span class="material-symbols-rounded" style="font-size:14px;">open_in_new</span> civitai.com
              </a>
            </div>
            ${e.versions.length>1?o`<div class="vlabel">Version</div>
                  <div class="versions">
                    ${e.versions.map(a=>o`<button class="chip small ${a.id===this.versionId?"on":""}" @click=${()=>this.pickVersion(a)}>
                        ${a.installed?o`<span class="material-symbols-rounded" style="font-size:14px;">check</span>`:c}
                        ${a.name}<span style="opacity:.7;"> · ${a.base}</span>
                      </button>`)}
                  </div>`:t?o`<div class="vlabel">Version ${t.name} · ${t.base}${t.publishedAt?` · ${Ei(t.publishedAt)}`:""}</div>`:c}
            ${t!=null&&t.trainedWords.length?o`<div class="vlabel">Trigger words</div>
                  <div class="words">
                    <span>${t.trainedWords.join(", ")}</span>
                    <button class="ghost" style="padding:3px 8px; font-size:12px; flex-shrink:0;" title="Copy the trigger words"
                      @click=${()=>{var a;return void((a=navigator.clipboard)==null?void 0:a.writeText(t.trainedWords.join(", ")))}}>
                      <span class="material-symbols-rounded" style="font-size:14px;">content_copy</span>
                    </button>
                  </div>`:c}
            ${e.tags.length?o`<div class="vlabel">Tags</div>
                  <div class="tags">
                    ${e.tags.slice(0,14).map(a=>o`<button class="chip small" @click=${()=>{this.closeDetail(),this.setAnd("category",a)}}>${a}</button>`)}
                  </div>`:c}
            ${this.detailLoading&&!e.description?o`<div class="note" style="padding:14px 0;">Loading the model page…</div>`:c}
            ${e.description?o`<div class="vlabel">About</div>
                  <div class="desc">${rt(e.description)}</div>`:c}
            ${t!=null&&t.description&&t.description!==e.description?o`<div class="vlabel">About this version</div>
                  <div class="desc">${rt(t.description)}</div>`:c}
            <div class="actions">
              ${t?t.installed?o`<button class="primary" disabled>
                      <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span> Installed in ${this.genName}
                    </button>`:this.canManage?o`<button class="primary" ?disabled=${this.installing||!t.downloadUrl} @click=${()=>this.install(t)}>
                        <span class="material-symbols-rounded" style="font-size:18px;">download</span>
                        Install to ${this.genName}${t.sizeMB?` (${dt(t.sizeMB)})`:""}
                      </button>`:c:c}
              <button class="ghost" @click=${()=>this.toggleGallery()}>
                <span class="material-symbols-rounded" style="font-size:16px;">photo_library</span>
                ${this.galleryOpen?"Hide posted pictures":"Posted pictures & prompts"}
              </button>
            </div>
            ${this.galleryOpen?this.renderGallery():c}
            <div class="sub" style="margin-top:10px;">
              ${this.canManage?this.backend==="invokeai"?"InvokeAI downloads the file itself; the cover, description and trigger words follow once it is in.":"The server downloads the file into Automatic1111's models folder and asks it to rescan; the cover, description and trigger words follow as A1111's own sidecar files.":this.manageNote||"Automatic1111 has no API that takes a download, so installing from here needs its models folder mapped into the OppaiLib container."}
            </div>
          </div>
        </div>
      </div>
    `}renderGallery(){return o`
      <div class="controls" style="margin-top:10px;">
        ${[["","Most reactions"],["newest","Newest"],["comments","Most comments"]].map(([e,t])=>o`<button class="chip small ${this.gallerySort===e?"on":""}"
            @click=${()=>{this.gallerySort=e,this.gallery=[],this.galleryCursor="",this.loadGallery(!0)}}>${t}</button>`)}
      </div>
      ${this.promptsNeedKey?o`<div class="sub" style="margin-top:8px;">
            Civitai only shares the prompts behind pictures with an API key — add yours under Settings → Image generation to see them here.
          </div>`:c}
      ${this.gallery.length?o`<div class="gal-grid">
            ${this.gallery.map(e=>o`<button title=${e.prompt?"Has a prompt":"No prompt kept"} @click=${()=>this.picked=e}>
                <img src=${u.civitaiImageURL(e.url)} alt="" loading="lazy" />
                ${e.prompt?o`<span class="has">prompt</span>`:c}
              </button>`)}
          </div>`:c}
      ${this.galleryLoading?o`<div class="note" style="padding:12px 0;">Loading pictures…</div>`:this.gallery.length?this.galleryCursor?o`<button class="more" style="margin-top:8px;" @click=${()=>this.loadGallery(!1)}>More pictures</button>`:c:o`<div class="note" style="padding:12px 0;">Nobody has posted a picture with this version.</div>`}
    `}renderPicked(e){const t=nt(e);return o`
      <div class="zoom ${t?"":"plain"}" @click=${i=>{i.target===i.currentTarget&&(this.picked=null)}}>
        <img src=${u.civitaiImageURL(e.url)} alt="" @click=${()=>this.picked=null} />
        ${t?o`<div class="pane">
              <div style="display:flex; align-items:center; gap:8px; justify-content:space-between;">
                <h4>Prompt${e.username?` · by ${e.username}`:""}</h4>
                <button class="ghost" style="padding:4px 8px;" @click=${()=>this.picked=null}>
                  <span class="material-symbols-rounded" style="font-size:16px;">close</span>
                </button>
              </div>
              <div class="p">${t.prompt}</div>
              ${t.negativePrompt?o`<h4>Negative</h4><div class="p">${t.negativePrompt}</div>`:c}
              <div class="kv">
                ${e.model?o`<span>Model</span><span>${e.model}</span>`:c}
                ${e.sampler?o`<span>Sampler</span><span>${e.sampler}${t.sampler?"":" (not in the studio's list)"}</span>`:c}
                ${t.steps?o`<span>Steps</span><span>${t.steps}</span>`:c}
                ${t.cfgScale?o`<span>CFG</span><span>${t.cfgScale}</span>`:c}
                ${t.seed?o`<span>Seed</span><span>${t.seed}</span>`:c}
                ${t.width?o`<span>Size</span><span>${t.width}×${t.height}</span>`:c}
              </div>
              <div class="actions" style="margin-top:4px;">
                <button class="primary" @click=${()=>this.usePrompt(e)}>
                  <span class="material-symbols-rounded" style="font-size:18px;">auto_awesome</span> Use in the studio
                </button>
                <button class="ghost" @click=${()=>this.copyPrompt(e)}>
                  <span class="material-symbols-rounded" style="font-size:16px;">content_copy</span> ${this.copied?"Copied":"Copy prompt"}
                </button>
              </div>
            </div>`:c}
      </div>
    `}renderAccount(){var i;if(this.meLoading)return o`<div class="note">Asking Civitai whose key this is…</div>`;if(!this.me)return o`<div class="note">
        ${this.meError||"No account to show."}
        <div style="margin-top:8px; font-size:12px;">
          Add your Civitai API key under Settings → Image generation and this page shows your models, posts, pictures and collections.
        </div>
      </div>`;const e=this.me,t=e.cover||((i=this.myImages[0])==null?void 0:i.url)||"";return o`
      <div class="banner">
        <div class="art">
          ${t?o`<img class="cover" src=${u.civitaiImageURL(t)} alt="" />`:c}
          <div class="fade"></div>
          <a class="ghost profile-link" style="text-decoration:none; background:rgba(0,0,0,.4);" target="_blank" rel="noopener noreferrer"
            href=${`https://civitai.com/user/${encodeURIComponent(e.username)}`}>
            <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span> Profile on civitai.com
          </a>
        </div>
        <div class="who">
          ${e.image?o`<img src=${u.civitaiImageURL(e.image)} alt="" />`:o`<div class="noface"><span class="material-symbols-rounded" style="font-size:44px;">account_circle</span></div>`}
          <div class="n">${e.username}</div>
        </div>
      </div>
      <div class="subtabs" role="tablist">
        ${[["models","Models"],["posts","Posts"],["images","Images"],["collections","Collections"]].map(([a,s])=>o`<button role="tab" aria-selected=${this.accountTab===a?"true":"false"}
            class=${this.accountTab===a?"on":""} @click=${()=>this.selectAccountTab(a)}>${s}</button>`)}
      </div>
      ${this.meError?o`<div class="err">${this.meError}</div>`:c}
      ${this.accountTab==="models"?this.renderMyModels():this.accountTab==="posts"?this.renderPosts():this.accountTab==="images"?this.renderMyImages():this.renderCollections()}
    `}renderMyModels(){return o`
      <div class="grid">${this.myModels.map(e=>this.renderCard(e))}</div>
      ${this.myModelsLoading?o`<div class="note">Loading models…</div>`:this.myModels.length?this.myModelsCursor?o`<button class="more" @click=${()=>this.loadMyModels(!1)}>More models</button>`:c:o`<div class="note">No models published.
              <div style="margin-top:6px; font-size:12px;">Uploading goes through civitai.com itself — the site has no public API for it.</div>
            </div>`}
    `}renderPosts(){if(this.openPost){const e=this.openPost;return o`
        <div class="controls">
          <button class="ghost" @click=${()=>this.openPost=null}>
            <span class="material-symbols-rounded" style="font-size:16px;">arrow_back</span> All posts
          </button>
          <span style="font-size:12px; color:var(--oppai-text-muted);">
            ${e.images.length} picture${e.images.length===1?"":"s"}${Me(e)?` · ${Me(e)}`:""}
          </span>
          ${e.id>0?o`<a class="ghost" style="margin-left:auto; text-decoration:none;" target="_blank" rel="noopener noreferrer" href=${`https://civitai.com/posts/${e.id}`}>
                <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span> civitai.com
              </a>`:c}
        </div>
        ${this.renderImageGrid(e.images)}
      `}return o`
      <div class="post-grid">
        ${this.posts.map(e=>o`<button class="post" @click=${()=>this.openPost=e}>
            ${e.images[0]?o`<img src=${u.civitaiImageURL(e.images[0].url)} alt="" loading="lazy" />`:c}
            ${e.images.length>1?o`<span class="badge right"><span class="material-symbols-rounded" style="font-size:13px;">photo_library</span> ${e.images.length}</span>`:c}
            <div class="pm"><span>${Me(e)}</span>${e.images.some(t=>t.prompt)?o`<span>prompt</span>`:c}</div>
          </button>`)}
      </div>
      ${this.postsLoading?o`<div class="note">Loading posts…</div>`:this.posts.length?this.postsCursor?o`<button class="more" @click=${()=>this.loadPosts(!1)}>More posts</button>`:c:o`<div class="note">No posts.</div>`}
    `}renderMyImages(){return o`
      ${this.renderImageGrid(this.myImages)}
      ${this.galleryLoading?o`<div class="note" style="padding:12px 0;">Loading pictures…</div>`:this.myImages.length?this.myImagesCursor?o`<button class="more" @click=${()=>this.loadMyImages(!1)}>More pictures</button>`:c:o`<div class="note" style="padding:12px 0;">No posted pictures.</div>`}
    `}renderImageGrid(e){return e.length?o`<div class="gal-grid">
      ${e.map(t=>o`<button title=${t.prompt?"Has a prompt":"No prompt kept"} @click=${()=>this.picked=t}>
          <img src=${u.civitaiImageURL(t.url)} alt="" loading="lazy" />
          ${t.prompt?o`<span class="has">prompt</span>`:c}
        </button>`)}
    </div>`:c}renderCollections(){var e;if(this.openCollection){const t=this.openCollection;return o`
        <div class="controls">
          <button class="ghost" @click=${()=>this.openCollection=null}>
            <span class="material-symbols-rounded" style="font-size:16px;">arrow_back</span> Collections
          </button>
          <span style="font-size:13px; font-weight:600;">${t.name}</span>
          <span style="font-size:12px; color:var(--oppai-text-muted);">${t.username?`by ${t.username} · `:""}${t.count} item${t.count===1?"":"s"}</span>
          <a class="ghost" style="margin-left:auto; text-decoration:none;" target="_blank" rel="noopener noreferrer" href=${`https://civitai.com/collections/${t.id}`}>
            <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span> civitai.com
          </a>
        </div>
        ${t.description?o`<div class="sub" style="margin-bottom:8px;">${t.description}</div>`:c}
        ${this.renderImageGrid(this.collectionImages)}
        ${this.galleryLoading?o`<div class="note" style="padding:12px 0;">Loading pictures…</div>`:this.collectionImages.length?this.collectionImagesCursor?o`<button class="more" @click=${()=>this.openCollectionPictures(t,!1)}>More pictures</button>`:c:o`<div class="note" style="padding:12px 0;">Nothing the feed will show for this collection.</div>`}
      `}return o`
      <div class="controls">
        <input type="search" placeholder="Search public collections…" .value=${this.collectionQuery}
          @input=${t=>this.collectionQuery=t.target.value}
          @keydown=${t=>{t.key==="Enter"&&this.loadCollections(!0)}} />
        ${[["newest","Newest"],["followers","Most followed"]].map(([t,i])=>o`<button class="chip ${this.collectionSort===t?"on":""}"
            @click=${()=>{this.collectionSort=t,this.loadCollections(!0)}}>${i}</button>`)}
        <button class="ghost" @click=${()=>this.loadCollections(!0)}>
          <span class="material-symbols-rounded" style="font-size:16px;">search</span> Search
        </button>
      </div>
      <div class="sub" style="margin-bottom:10px;">
        Civitai's public API lists collections by name only, never by owner — your own are on
        <a style="color:var(--oppai-primary-bright);" target="_blank" rel="noopener noreferrer"
          href=${`https://civitai.com/user/${encodeURIComponent(((e=this.me)==null?void 0:e.username)??"")}/collections`}>civitai.com</a>.
        Image and post collections open here; model collections the API will not list.
      </div>
      <div class="rows">
        ${this.collections.map(t=>o`<button class="coll" ?disabled=${t.type!=="Image"&&t.type!=="Post"} @click=${()=>this.openCollectionPictures(t,!0)}>
            ${t.cover?o`<img src=${u.civitaiImageURL(t.cover)} alt="" loading="lazy" />`:o`<div class="noimg"><span class="material-symbols-rounded" style="font-size:26px;">collections_bookmark</span></div>`}
            <div style="min-width:0;">
              <div class="t">${t.name}${t.nsfw?o` <span style="font-weight:400; color:var(--oppai-text-muted);">18+</span>`:c}</div>
              <div class="d">${t.type} · ${t.count} item${t.count===1?"":"s"}${t.username?` · by ${t.username}`:""}</div>
            </div>
            <span class="material-symbols-rounded" style="font-size:18px; color:var(--oppai-text-muted);">${t.type==="Image"||t.type==="Post"?"chevron_right":"block"}</span>
          </button>`)}
      </div>
      ${this.collectionsLoading?o`<div class="note">Loading collections…</div>`:this.collections.length?this.collectionsCursor?o`<button class="more" @click=${()=>this.loadCollections(!1)}>More collections</button>`:c:o`<div class="note">No collections matched.</div>`}
    `}renderInstalled(){const e=this.installed.filter(i=>{var a;switch(this.installedFilter){case"linked":return!!i.civitai;case"unlinked":return!i.civitai;case"updates":return!!((a=i.civitai)!=null&&a.updateAvailable);default:return!0}}),t=this.installed.filter(i=>{var a;return(a=i.civitai)==null?void 0:a.updateAvailable}).length;return o`
      <div class="controls">
        ${[["all","All"],["linked","On Civitai"],["unlinked","Not matched"],["updates",`Updates${t?` (${t})`:""}`]].map(([i,a])=>o`<button class="chip ${this.installedFilter===i?"on":""}" @click=${()=>this.installedFilter=i}>${a}</button>`)}
        <button class="ghost" style="margin-left:auto;" ?disabled=${this.installedLoading} @click=${()=>this.loadInstalled(!0)}>
          <span class="material-symbols-rounded" style="font-size:16px;">refresh</span> Check Civitai again
        </button>
      </div>
      <p class="sync-note">
        ${this.genName}'s models matched to Civitai by file hash. “Fetch from Civitai” writes the catalogue's cover,
        description and trigger words onto the model — the same dressing an install from here gets${this.canManage?"":". Until OppaiLib can write into A1111's models folder they are only linked: the picker shows Civitai's cover, but nothing is written to A1111"}.
        ${this.backend==="invokeai"?c:o`A1111 knows a file by a short hash until it has been read once, so a model may take a minute to match after it first appears.`}
      </p>
      ${this.syncNote?o`<div class="sync-note" style="color:var(--oppai-text);">${this.syncNote}</div>`:c}
      ${this.installedError?o`<div class="err">${this.installedError}</div>`:c}
      ${this.installedLoading&&!this.installed.length?o`<div class="note">Reading the studio's models and asking Civitai about the new ones…</div>`:c}
      <div class="rows">
        ${e.map(i=>this.renderInstalledRow(i))}
      </div>
      ${!this.installedLoading&&this.installed.length&&!e.length?o`<div class="note">Nothing here.</div>`:c}
    `}renderInstalledRow(e){const t=e.civitai,i=e.hasCover?e.type==="lora"?u.loraThumbURL(e.name):u.modelThumbURL(e.key):"",a=this.manageKey===e.key;return o`
      <div class="row">
        ${i?o`<img src=${i} alt="" loading="lazy" />`:o`<div class="noimg"><span class="material-symbols-rounded" style="font-size:26px;">deployed_code</span></div>`}
        <div style="min-width:0;">
          <div class="t">${e.name}</div>
          <div class="d">
            <span>${e.type}</span>
            ${e.base?o`<span>${e.base}</span>`:c}
            ${t?o`<span>· ${t.modelName}${t.versionName?` (${t.versionName})`:""}${t.creator?` by ${t.creator}`:""}</span>
                  ${t.updateAvailable?o`<span class="upd"><span class="material-symbols-rounded" style="font-size:14px;">new_releases</span> newer version</span>`:c}`:o`<span>· not found on Civitai by hash</span>`}
          </div>
          ${t!=null&&t.previews.length&&!a?o`<div class="previews">
                ${t.previews.slice(0,6).map(s=>o`<img src=${u.civitaiImageURL(s)} alt="" loading="lazy" @click=${()=>this.zoomed=s} />`)}
              </div>`:c}
          ${this.pinning===e.key?o`<div class="pin">
                <input type="text" placeholder="Civitai version id" .value=${this.pinVersion}
                  @input=${s=>this.pinVersion=s.target.value} />
                <button class="ghost" ?disabled=${!/^\d+$/.test(this.pinVersion.trim())} @click=${()=>this.sync(e,Number(this.pinVersion.trim()))}>Link</button>
                <button class="ghost" @click=${()=>this.pinning=""}>Cancel</button>
              </div>`:c}
        </div>
        <div class="rb">
          ${t?o`<button class="ghost" title="Open the model page" @click=${()=>this.openDetail(t.modelId)}>
                <span class="material-symbols-rounded" style="font-size:16px;">travel_explore</span> Page
              </button>`:c}
          ${t!=null&&t.updateAvailable&&this.canManage?o`<button class="ghost" title="Download the newest version and delete this one once it is in"
                ?disabled=${this.manageBusy} @click=${()=>this.updateModel(e)}>
                <span class="material-symbols-rounded" style="font-size:16px;">published_with_changes</span> Update
              </button>`:c}
          <button class="ghost" ?disabled=${this.syncing===e.key} title="Write the cover, description and trigger words from Civitai onto this model"
            @click=${()=>this.sync(e)}>
            <span class="material-symbols-rounded" style="font-size:16px;">${this.syncing===e.key?"downloading":"sync"}</span>
            ${t?"Fetch again":"Fetch from Civitai"}
          </button>
          ${t?o`<button class="ghost ${a?"on":""}" title="Choose the version and the cover picture" aria-expanded=${a?"true":"false"}
                @click=${()=>this.manage(e)}>
                <span class="material-symbols-rounded" style="font-size:16px;">tune</span> ${a?"Close":"Version & cover"}
              </button>`:o`<button class="ghost" title="Link by a version id from the site" @click=${()=>{this.pinning=e.key,this.pinVersion=""}}>
                <span class="material-symbols-rounded" style="font-size:16px;">link</span>
              </button>`}
          ${this.canManage?o`<button class="ghost danger" title=${`Delete from ${this.genName}, file included`} ?disabled=${this.manageBusy} @click=${()=>this.deleteInstalled(e)}>
            <span class="material-symbols-rounded" style="font-size:16px;">delete</span>
          </button>`:c}
        </div>
        ${a&&t?this.renderManage(e):c}
      </div>
    `}renderManage(e){const t=e.civitai,i=this.managePage;if(!i)return o`<div class="manage"><div class="note" style="padding:8px 0;">Loading the model page…</div></div>`;const a=i.versions.find(l=>l.id===this.manageVersion)??i.versions[0],s=(a==null?void 0:a.id)===t.versionId,r=t.coverUrl||t.previews[0]||"";return o`
      <div class="manage">
        <div class="vlabel" style="margin-top:0;">Version</div>
        <div class="versions">
          ${i.versions.map(l=>o`<button class="chip small ${l.id===(a==null?void 0:a.id)?"on":""}" @click=${()=>this.manageVersion=l.id}>
              ${l.id===t.versionId?o`<span class="material-symbols-rounded" style="font-size:14px;">check</span>`:c}
              ${l.name}<span style="opacity:.7;"> · ${l.base}</span>
            </button>`)}
        </div>
        ${a&&!s?o`<div class="actions" style="margin-top:8px;">
              ${this.canManage?o`<button class="ghost" ?disabled=${this.manageBusy} title="Download this version and delete the current file once it is in"
                @click=${()=>this.updateModel(e,a.id)}>
                <span class="material-symbols-rounded" style="font-size:16px;">published_with_changes</span> Install ${a.name}, replacing the current file
              </button>`:c}
              <button class="ghost" ?disabled=${this.syncing===e.key} title="Keep the current file, but take this version's description, trigger words and pictures"
                @click=${()=>this.sync(e,a.id)}>
                <span class="material-symbols-rounded" style="font-size:16px;">link</span> Link to ${a.name} without downloading
              </button>
            </div>`:c}
        ${a!=null&&a.images.length?o`<div class="vlabel">Cover${s?"":` (from ${a.name})`}</div>
              <div class="covers">
                ${a.images.map(l=>o`<button class=${l===r?"on":""} title="Use as the cover" ?disabled=${this.manageBusy} @click=${()=>this.chooseCover(e,l)}>
                    <img src=${u.civitaiImageURL(l)} alt="" loading="lazy" />
                    ${l===r?o`<span class="tick"><span class="material-symbols-rounded" style="font-size:13px;">check</span></span>`:c}
                  </button>`)}
              </div>`:o`<div class="sub" style="margin-top:8px;">This version has no showcase pictures.</div>`}
      </div>
    `}};v.styles=[de,ke,pe`
      :host {
        position: fixed;
        inset: 0;
        /* Above the studio's drawer, which on a phone is a sheet at 91 and is where
           "Find more on Civitai" is clicked from. */
        z-index: 95;
        display: block;
        background: var(--oppai-bg, #141218);
        color: var(--oppai-text);
        overflow-y: auto;
      }
      .wrap {
        max-width: 1240px;
        margin: 0 auto;
        padding: 18px 16px 60px;
      }
      .topbar {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        position: sticky;
        top: 0;
        background: var(--oppai-bg, #141218);
        padding: 8px 0 12px;
        z-index: 2;
      }
      .topbar h2 {
        margin: 0;
        font-size: 17px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .tabs { display: flex; gap: 4px; margin-left: 8px; }
      .tabs button {
        border: none; background: none; color: var(--oppai-text-dim); font: inherit; font-size: 13px;
        padding: 8px 12px; border-radius: 10px; cursor: pointer;
      }
      .tabs button.on { background: var(--oppai-surface-2); color: var(--oppai-text); font-weight: 600; }
      .close {
        margin-left: auto;
        border: none;
        background: var(--oppai-surface-2);
        color: var(--oppai-text);
        border-radius: 10px;
        font: inherit;
        padding: 8px 14px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .controls {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
        margin-bottom: 10px;
      }
      input[type="search"], input[type="text"] {
        flex: 1;
        min-width: 200px;
        background: var(--oppai-surface);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 12px;
        color: var(--oppai-text);
        font: inherit;
        font-size: 14px;
        padding: 9px 12px;
        outline: none;
      }
      input:focus { border-color: var(--oppai-primary); }
      .chip {
        border: 1px solid var(--oppai-border-strong);
        background: transparent;
        color: var(--oppai-text-dim);
        border-radius: 999px;
        font: inherit;
        font-size: 13px;
        padding: 6px 13px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .chip.on {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
        border-color: var(--oppai-accent);
      }
      .chip.small { font-size: 12px; padding: 4px 10px; }
      select {
        background: var(--oppai-surface);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 10px;
        color: var(--oppai-text);
        font: inherit;
        font-size: 13px;
        padding: 7px 10px;
      }
      .jobs {
        background: var(--oppai-surface-2);
        border-radius: 12px;
        padding: 10px 12px;
        margin-bottom: 14px;
        font-size: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .job { display: flex; gap: 8px; align-items: center; color: var(--oppai-text-dim); }
      .job .st { font-weight: 600; }
      .job .st.error { color: var(--oppai-error, #f2b8b5); }
      .job .st.completed { color: var(--oppai-primary-bright); }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 14px;
      }
      .card {
        border: none;
        padding: 0;
        text-align: left;
        background: var(--oppai-surface-2);
        border-radius: 14px;
        overflow: hidden;
        cursor: pointer;
        color: var(--oppai-text);
        font: inherit;
        transition: transform 0.18s var(--oppai-ease-spring);
        position: relative;
      }
      .card:hover { transform: translateY(-2px); }
      .card img,
      .card .noimg {
        width: 100%;
        aspect-ratio: 3 / 4;
        object-fit: cover;
        display: block;
        background: var(--oppai-surface);
      }
      .card .noimg { display: grid; place-items: center; color: var(--oppai-text-muted); }
      .card .meta { padding: 8px 10px 10px; }
      .card .name {
        font-size: 13px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      .card .sub {
        font-size: 11px;
        color: var(--oppai-text-muted);
        margin-top: 3px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .badge {
        position: absolute; top: 8px; left: 8px;
        background: rgba(0, 0, 0, .62); color: #fff; font-size: 11px; font-weight: 600;
        border-radius: 999px; padding: 3px 8px; display: inline-flex; align-items: center; gap: 4px;
        backdrop-filter: blur(4px);
      }
      .badge.right { left: auto; right: 8px; }
      .badge.ok { background: var(--oppai-primary); color: var(--oppai-on-primary); }
      .more {
        margin-top: 16px;
        width: 100%;
        border: 1px dashed var(--oppai-border-strong);
        background: none;
        color: var(--oppai-text-dim);
        border-radius: 12px;
        font: inherit;
        font-size: 14px;
        padding: 12px;
        cursor: pointer;
      }
      .note { color: var(--oppai-text-muted); font-size: 13px; padding: 30px 0; text-align: center; }
      .err { color: var(--oppai-error, #f2b8b5); font-size: 13px; margin-bottom: 12px; }
      .ghost {
        border: 1px solid var(--oppai-border-strong); background: none; color: var(--oppai-text);
        border-radius: 10px; font: inherit; font-size: 13px; padding: 7px 12px; cursor: pointer;
        display: inline-flex; align-items: center; gap: 6px;
      }
      .ghost:disabled { opacity: .55; cursor: default; }
      .primary {
        border: none; border-radius: 12px; background: var(--oppai-primary); color: var(--oppai-on-primary);
        font: inherit; font-size: 14px; font-weight: 600; padding: 12px 18px; cursor: pointer;
        display: inline-flex; align-items: center; gap: 8px;
      }
      .primary:disabled { opacity: 0.6; cursor: default; }

      /* The model page. */
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.65);
        z-index: 80;
        display: grid;
        place-items: center;
        padding: 18px;
      }
      .detail {
        background: var(--oppai-surface-2);
        border-radius: 18px;
        width: min(1000px, 100%);
        max-height: 92vh;
        overflow-y: auto;
        padding: 18px;
        display: grid;
        grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
        gap: 18px;
      }
      @media (max-width: 760px) {
        .detail { grid-template-columns: minmax(0, 1fr); }
      }
      .detail .big {
        width: 100%;
        border-radius: 12px;
        background: var(--oppai-surface);
        aspect-ratio: 3 / 4;
        object-fit: cover;
        cursor: zoom-in;
      }
      .thumbs { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
      .thumbs img {
        width: 52px; height: 68px; object-fit: cover; border-radius: 8px; cursor: pointer; opacity: 0.7;
      }
      .thumbs img.on { opacity: 1; outline: 2px solid var(--oppai-accent); }
      .detail h3 { margin: 0 0 4px; font-size: 18px; }
      .detail .sub { font-size: 12px; color: var(--oppai-text-muted); margin-bottom: 10px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
      .creator { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; color: var(--oppai-text-dim); border: none; background: none; font: inherit; font-size: 12px; padding: 0; }
      .creator img { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; }
      .vlabel { font-size: 12px; font-weight: 600; color: var(--oppai-text-dim); margin: 12px 0 6px; }
      .versions, .tags { display: flex; flex-wrap: wrap; gap: 6px; }
      .words {
        font-size: 12px; color: var(--oppai-text-dim); background: var(--oppai-surface);
        border-radius: 10px; padding: 8px 10px; word-break: break-word;
        display: flex; align-items: flex-start; gap: 8px; justify-content: space-between;
      }
      .desc {
        font-size: 13px; line-height: 1.5; color: var(--oppai-text-dim);
        max-height: 260px; overflow-y: auto; padding-right: 6px; word-break: break-word;
      }
      .desc.open { max-height: none; }
      .desc h1, .desc h2, .desc h3, .desc h4 { font-size: 14px; margin: 10px 0 4px; color: var(--oppai-text); }
      .desc p { margin: 0 0 8px; }
      .desc a { color: var(--oppai-primary-bright); }
      .desc pre, .desc code { font-size: 12px; background: var(--oppai-surface); border-radius: 6px; padding: 2px 5px; white-space: pre-wrap; }
      .desc ul, .desc ol { padding-left: 20px; margin: 4px 0 8px; }
      .desc table { border-collapse: collapse; font-size: 12px; }
      .desc td, .desc th { border: 1px solid var(--oppai-border); padding: 3px 6px; }
      .files { font-size: 12px; color: var(--oppai-text-dim); display: flex; flex-direction: column; gap: 4px; }
      .files .f { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .files code { font-size: 11px; color: var(--oppai-text-muted); }
      .actions { margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

      /* The gallery of posted pictures. */
      .gal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-top: 8px; }
      .gal-grid button { border: none; padding: 0; background: var(--oppai-surface); border-radius: 10px; overflow: hidden; cursor: pointer; position: relative; }
      .gal-grid img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block; }
      .gal-grid .has { position: absolute; right: 6px; bottom: 6px; background: rgba(0,0,0,.6); color: #fff; border-radius: 6px; font-size: 10px; padding: 2px 6px; }

      /* Zoomed picture, with its prompt when there is one. */
      .zoom {
        position: fixed; inset: 0; z-index: 90; background: rgba(0, 0, 0, 0.9);
        display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 360px); cursor: zoom-out;
      }
      .zoom.plain { grid-template-columns: minmax(0, 1fr); place-items: center; }
      .zoom img { max-width: 100%; max-height: 100vh; object-fit: contain; margin: auto; display: block; }
      .zoom .pane {
        background: var(--oppai-surface-2); color: var(--oppai-text); padding: 16px; overflow-y: auto; cursor: default;
        font-size: 13px; display: flex; flex-direction: column; gap: 10px;
      }
      @media (max-width: 760px) {
        .zoom { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; }
        .zoom .pane { max-height: 45vh; }
      }
      .pane h4 { margin: 0; font-size: 12px; color: var(--oppai-text-muted); text-transform: uppercase; letter-spacing: .04em; }
      .pane .p { white-space: pre-wrap; word-break: break-word; background: var(--oppai-surface); border-radius: 8px; padding: 8px 10px; }
      .pane .kv { display: grid; grid-template-columns: auto 1fr; gap: 3px 10px; font-size: 12px; color: var(--oppai-text-dim); }

      /* Account: a banner with the profile picture over its bottom edge, the way
         the site lays it out, then the profile's own tabs. */
      .banner { position: relative; margin: 4px 0 52px; }
      /* The picture clips to its rounded corners; the profile picture, hanging
         over the bottom edge, is a sibling so the clip does not cut it. */
      .banner .art {
        position: relative; border-radius: 16px; overflow: hidden; background: var(--oppai-surface-2);
        aspect-ratio: 4 / 1; min-height: 120px; max-height: 260px;
      }
      .banner img.cover { width: 100%; height: 100%; object-fit: cover; display: block; }
      .banner .fade { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,.55), transparent 60%); }
      .who {
        position: absolute; left: 18px; bottom: -44px; display: flex; align-items: flex-end; gap: 14px;
      }
      .who img, .who .noface {
        width: 88px; height: 88px; border-radius: 50%; object-fit: cover; background: var(--oppai-surface);
        border: 4px solid var(--oppai-bg, #141218); display: grid; place-items: center; color: var(--oppai-text-muted);
      }
      .who .n { font-size: 18px; font-weight: 700; padding-bottom: 10px; }
      .who .s { font-size: 12px; color: var(--oppai-text-muted); }
      .banner .profile-link { position: absolute; right: 12px; bottom: 12px; }
      h3.sec { font-size: 14px; margin: 18px 0 8px; color: var(--oppai-text-dim); }
      .subtabs { display: flex; gap: 4px; margin: 0 0 12px; border-bottom: 1px solid var(--oppai-border); }
      .subtabs button {
        border: none; background: none; color: var(--oppai-text-dim); font: inherit; font-size: 13px;
        padding: 9px 12px; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px;
      }
      .subtabs button.on { color: var(--oppai-text); font-weight: 600; border-bottom-color: var(--oppai-accent); }
      .post-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
      .post {
        border: none; padding: 0; background: var(--oppai-surface-2); border-radius: 12px; overflow: hidden;
        cursor: pointer; position: relative; text-align: left; color: var(--oppai-text); font: inherit;
      }
      .post img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block; background: var(--oppai-surface); }
      .post .pm { padding: 6px 9px 8px; font-size: 11px; color: var(--oppai-text-muted); display: flex; justify-content: space-between; gap: 6px; }
      .coll {
        display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 12px; align-items: center;
        background: var(--oppai-surface-2); border-radius: 12px; padding: 8px 10px; border: none; color: inherit; font: inherit;
        text-align: left; width: 100%; cursor: pointer;
      }
      .coll img, .coll .noimg { width: 64px; height: 64px; border-radius: 8px; object-fit: cover; background: var(--oppai-surface); display: grid; place-items: center; color: var(--oppai-text-muted); }
      .coll .t { font-size: 13px; font-weight: 600; }
      .coll .d { font-size: 12px; color: var(--oppai-text-muted); margin-top: 2px; }
      .coll:disabled { cursor: default; }
      .jobs-chip { position: relative; }
      .jobs-chip .dot {
        position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; border-radius: 50%;
        background: var(--oppai-primary-bright); animation: pulse 1.2s ease-in-out infinite;
      }
      @keyframes pulse { 50% { opacity: .3; } }

      /* Managing an installed model: its versions and the pictures to choose a cover from. */
      .manage { grid-column: 1 / -1; background: var(--oppai-surface); border-radius: 10px; padding: 10px 12px; margin-top: 4px; }
      .manage .vlabel { margin-top: 8px; }
      .covers { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 6px; }
      .covers button { border: 2px solid transparent; padding: 0; border-radius: 10px; overflow: hidden; background: var(--oppai-surface-2); cursor: pointer; position: relative; }
      .covers button.on { border-color: var(--oppai-accent); }
      .covers img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block; }
      .covers .tick { position: absolute; top: 4px; right: 4px; background: var(--oppai-accent); color: var(--oppai-on-accent); border-radius: 50%; width: 18px; height: 18px; display: grid; place-items: center; }
      .ghost.danger { color: var(--oppai-error, #f2b8b5); }

      /* Installed. */
      .rows { display: flex; flex-direction: column; gap: 8px; }
      .row {
        display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 12px; align-items: center;
        background: var(--oppai-surface-2); border-radius: 12px; padding: 8px 10px;
      }
      .row .ghost.on { background: var(--oppai-surface); }
      @media (max-width: 600px) { .row { grid-template-columns: 64px minmax(0, 1fr); } .row .rb { grid-column: 1 / -1; } }
      .row img, .row .noimg { width: 64px; height: 84px; border-radius: 8px; object-fit: cover; background: var(--oppai-surface); display: grid; place-items: center; color: var(--oppai-text-muted); }
      .row .t { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .row .d { font-size: 12px; color: var(--oppai-text-muted); margin-top: 2px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .row .rb { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
      .upd { color: var(--oppai-primary-bright); font-weight: 600; display: inline-flex; align-items: center; gap: 3px; }
      .previews { display: flex; gap: 4px; margin-top: 6px; }
      .previews img { width: 34px; height: 44px; border-radius: 6px; object-fit: cover; cursor: zoom-in; }
      .pin { display: flex; gap: 6px; align-items: center; margin-top: 6px; }
      .pin input { min-width: 0; width: 140px; padding: 6px 8px; font-size: 12px; }
      .sync-note { font-size: 12px; color: var(--oppai-text-dim); margin: 0 0 10px; }
    `];x([J()],v.prototype,"backend",2);x([J({type:Boolean})],v.prototype,"canManage",2);x([J()],v.prototype,"manageNote",2);x([d()],v.prototype,"tab",2);x([d()],v.prototype,"q",2);x([d()],v.prototype,"type",2);x([d()],v.prototype,"sort",2);x([d()],v.prototype,"period",2);x([d()],v.prototype,"base",2);x([d()],v.prototype,"category",2);x([d()],v.prototype,"creator",2);x([d()],v.prototype,"nsfw",2);x([d()],v.prototype,"categories",2);x([d()],v.prototype,"items",2);x([d()],v.prototype,"cursor",2);x([d()],v.prototype,"loading",2);x([d()],v.prototype,"error",2);x([d()],v.prototype,"detail",2);x([d()],v.prototype,"detailLoading",2);x([d()],v.prototype,"versionId",2);x([d()],v.prototype,"shownImage",2);x([d()],v.prototype,"zoomed",2);x([d()],v.prototype,"galleryOpen",2);x([d()],v.prototype,"gallery",2);x([d()],v.prototype,"galleryCursor",2);x([d()],v.prototype,"galleryLoading",2);x([d()],v.prototype,"gallerySort",2);x([d()],v.prototype,"picked",2);x([d()],v.prototype,"copied",2);x([d()],v.prototype,"promptsNeedKey",2);x([d()],v.prototype,"jobs",2);x([d()],v.prototype,"installing",2);x([d()],v.prototype,"jobsOpen",2);x([d()],v.prototype,"me",2);x([d()],v.prototype,"meError",2);x([d()],v.prototype,"meLoading",2);x([d()],v.prototype,"accountTab",2);x([d()],v.prototype,"myImages",2);x([d()],v.prototype,"myImagesCursor",2);x([d()],v.prototype,"myModels",2);x([d()],v.prototype,"myModelsCursor",2);x([d()],v.prototype,"myModelsLoading",2);x([d()],v.prototype,"posts",2);x([d()],v.prototype,"postsCursor",2);x([d()],v.prototype,"postsLoading",2);x([d()],v.prototype,"openPost",2);x([d()],v.prototype,"collections",2);x([d()],v.prototype,"collectionsCursor",2);x([d()],v.prototype,"collectionsLoading",2);x([d()],v.prototype,"collectionQuery",2);x([d()],v.prototype,"collectionSort",2);x([d()],v.prototype,"openCollection",2);x([d()],v.prototype,"collectionImages",2);x([d()],v.prototype,"collectionImagesCursor",2);x([d()],v.prototype,"installed",2);x([d()],v.prototype,"installedLoading",2);x([d()],v.prototype,"installedError",2);x([d()],v.prototype,"installedFilter",2);x([d()],v.prototype,"syncing",2);x([d()],v.prototype,"syncNote",2);x([d()],v.prototype,"pinning",2);x([d()],v.prototype,"pinVersion",2);x([d()],v.prototype,"manageKey",2);x([d()],v.prototype,"managePage",2);x([d()],v.prototype,"manageVersion",2);x([d()],v.prototype,"manageBusy",2);v=x([he("oppai-civitai")],v);function lt(e){switch(e){case"Checkpoint":return"Checkpoint";case"LORA":return"LoRA";case"LoCon":return"LoCon";case"DoRA":return"DoRA";case"TextualInversion":return"Embedding";case"Controlnet":return"ControlNet";default:return e}}function be(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}k`:String(e)}function dt(e){return e>=1024?`${(e/1024).toFixed(1)} GB`:`${e} MB`}function Ei(e){const t=new Date(e);return Number.isNaN(t.getTime())?"":t.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}const Ai={waiting:"Waiting for the GPU",receiving:"Receiving the pictures",loading:"Loading the checkpoint",caching:"Preparing the pictures",training:"Training",sampling:"Rendering a sample",saving:"Saving",done:"Finished — installing next",error:"Stopping",cancelled:"Stopping"},_i={preparing:"Sending the pictures",queued:"Waiting for the GPU",training:"Training",installing:"Installing into the generator",done:"Ready to use",failed:"Failed",cancelled:"Cancelled"};function pt(e){return e.status==="preparing"||e.status==="queued"||e.status==="training"||e.status==="installing"}function Ni(e){return e.status==="done"||e.status==="installing"?1:!e.total||e.total<=0||e.step===void 0?null:Math.max(0,Math.min(1,e.step/e.total))}function Fi(e){if(e.status==="failed")return e.error?`Failed: ${e.error}`:"Failed";if(e.status!=="training")return _i[e.status]??e.status;const t=Ai[e.phase??""]??"Training";if(e.phase!=="training"||!e.total)return t;const i=[`Step ${e.step??0} of ${e.total}`];return e.epoch&&e.epochs&&i.push(`epoch ${e.epoch}/${e.epochs}`),e.eta&&e.eta!=="?"&&e.eta!=="00:00"&&i.push(`${e.eta} left`),e.loss&&i.push(`loss ${e.loss.toFixed(3)}`),i.join(" · ")}function Ui(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"")}function ji(e,t){const i=t.trim().toLowerCase();return e.some(a=>a.trim().toLowerCase()===i)?e.filter(a=>a.trim().toLowerCase()!==i):[...e,t.trim()]}var Gi=Object.defineProperty,Wi=Object.getOwnPropertyDescriptor,S=(e,t,i,a)=>{for(var s=a>1?void 0:a?Wi(t,i):t,r=e.length-1,l;r>=0;r--)(l=e[r])&&(s=(a?l(t,i,s):l(s))||s);return a&&s&&Gi(t,i,s),s};let k=class extends ce{constructor(){super(...arguments),this.models=[],this.checkpoint="",this.configured=!0,this.trainer=null,this.trainerError="",this.runs=[],this.loaded=!1,this.name="",this.trigger="",this.triggerTouched=!1,this.base="",this.sourceKind="collection",this.collections=[],this.collectionId=0,this.tag="",this.captions="tags",this.leaveOut=[],this.preview=null,this.previewing=!1,this.advanced=!1,this.epochs=10,this.repeats=0,this.rank=0,this.resolution=0,this.learningRate=1e-4,this.optimizer="AdamW8bit",this.lowVram=!1,this.flip=!1,this.freeGpu=!0,this.samples=!0,this.starting=!1,this.error="",this.openLog=0,this.timer=0,this.installed=new Set}connectedCallback(){super.connectedCallback(),this.refresh(),u.listCollections().then(e=>{this.collections=e.items,!this.collectionId&&e.items.length&&(this.collectionId=e.items[0].id)}).catch(()=>{})}willUpdate(e){e.has("checkpoint")&&!this.base&&(this.base=this.checkpoint)}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this.timer)}async refresh(){window.clearTimeout(this.timer);try{const t=await u.trainList();this.configured=t.configured,this.trainer=t.trainer??null,this.trainerError=t.trainerError??"",this.runs=t.trainings;for(const i of t.trainings)i.status==="done"&&!this.installed.has(i.id)&&(this.loaded&&i.finishedAt&&Date.now()/1e3-i.finishedAt<120&&this.dispatchEvent(new CustomEvent("trained",{detail:{name:i.name}})),this.installed.add(i.id))}catch(t){this.trainerError=t.message}finally{this.loaded=!0}if(!this.isConnected)return;const e=this.runs.some(pt);this.timer=window.setTimeout(()=>void this.refresh(),e?3e3:2e4)}source(){return this.sourceKind==="collection"?{collectionId:this.collectionId}:{tag:this.tag.trim()}}async loadPreview(){if(!this.previewing){if(this.sourceKind==="tag"&&!this.tag.trim()){this.error="Type the tag to train on";return}this.previewing=!0,this.error="";try{this.preview=await u.trainPreview({source:this.source(),trigger:this.trigger,captions:this.captions,leaveOut:this.leaveOut})}catch(e){this.error=e.message,this.preview=null}finally{this.previewing=!1}}}async start(){if(this.starting)return;this.starting=!0,this.error="";const e={name:this.name.trim(),trigger:this.trigger.trim(),base:this.base,source:this.source(),captions:this.captions,leaveOut:this.leaveOut,epochs:this.epochs||void 0,repeats:this.repeats||void 0,rank:this.rank||void 0,resolution:this.resolution||void 0,learningRate:this.learningRate||void 0,optimizer:this.optimizer,lowVram:this.lowVram,flip:this.flip,freeGpu:this.freeGpu,samples:this.samples};try{await u.trainStart(e),this.preview=null,await this.refresh()}catch(t){this.error=t.message}finally{this.starting=!1}}again(e){var i;const t=e.request;t&&(this.name=t.name,this.trigger=t.trigger,this.triggerTouched=!0,this.models.some(a=>a.title===t.base)&&(this.base=t.base),t.source.collectionId?(this.sourceKind="collection",this.collectionId=t.source.collectionId):t.source.tag&&(this.sourceKind="tag",this.tag=t.source.tag),this.captions=t.captions??"tags",this.leaveOut=t.leaveOut??[],this.epochs=t.epochs??10,this.repeats=t.repeats??0,this.rank=t.rank??0,this.resolution=t.resolution??0,this.learningRate=t.learningRate??1e-4,this.optimizer=t.optimizer??"AdamW8bit",this.lowVram=!!t.lowVram,this.flip=!!t.flip,this.freeGpu=t.freeGpu??!0,this.samples=t.samples??!0,this.preview=null,(i=this.renderRoot.querySelector(".wrap"))==null||i.scrollIntoView({behavior:"smooth"}))}async cancel(e){try{await u.trainCancel(e.id)}catch(t){this.error=t.message}await this.refresh()}async forget(e){try{await u.trainDelete(e.id),this.runs=this.runs.filter(t=>t.id!==e.id)}catch(t){this.error=t.message}}render(){return o`
      <div class="wrap">
        <div class="topbar">
          <h2><span class="material-symbols-rounded">model_training</span> Train a LoRA</h2>
          ${this.renderTrainer()}
          <button class="btn close" @click=${()=>this.dispatchEvent(new CustomEvent("close"))}>
            <span class="material-symbols-rounded">close</span> Back to studio
          </button>
        </div>
        ${this.loaded?this.configured?o`<div class="grid">${this.renderForm()}${this.renderRuns()}</div>`:this.renderNotSetUp():o`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`}
      </div>
    `}renderTrainer(){if(!this.configured)return c;if(this.trainerError)return o`<span class="trainer" title=${this.trainerError}><span class="dot off"></span>Trainer unreachable</span>`;const e=this.trainer;if(!e)return c;const t=e.vramMB?` · ${Math.round(e.vramMB/1024)} GB`:"",i=e.busy?`training${e.queued?`, ${e.queued} waiting`:""}`:e.queued?`${e.queued} waiting`:"idle";return o`<span class="trainer"><span class="dot ${e.busy?"busy":""}"></span>${e.gpu||"Trainer"}${t} · ${i}</span>`}renderNotSetUp(){return o`<div class="empty">
      <span class="material-symbols-rounded">model_training</span>
      LoRAs are trained by the OppaiLib trainer, a container of its own on the box with the GPU<br />
      (<code>ghcr.io/noneye-byte/oppailib-trainer</code>; the Unraid template is <code>oppailib-trainer.xml</code>).<br />
      Once it is running, put its address and token under <strong>Settings → Image generation</strong>.
    </div>`}renderForm(){const e=this.models,t=!!this.name.trim()&&!!this.base&&!this.starting&&!this.trainerError&&(this.sourceKind==="collection"?this.collectionId>0:!!this.tag.trim());return o`<div class="card">
      <h3>New LoRA</h3>
      ${this.trainerError?o`<div class="banner">The trainer didn't answer: ${this.trainerError}</div>`:c}
      <div class="row">
        <div>
          <label class="field">Name</label>
          <input type="text" .value=${this.name} placeholder="ink_style"
            @input=${i=>{this.name=i.target.value,this.triggerTouched||(this.trigger=Ui(this.name))}} />
        </div>
        <div>
          <label class="field">Trigger word</label>
          <input type="text" .value=${this.trigger} placeholder="inkstyle"
            @input=${i=>{this.trigger=i.target.value,this.triggerTouched=!0}} />
        </div>
      </div>
      <label class="field">Train against</label>
      <select .value=${this.base} @change=${i=>this.base=i.target.value}>
        ${this.base?c:o`<option value="">Choose a checkpoint</option>`}
        ${e.map(i=>o`<option value=${i.title} ?selected=${i.title===this.base}>${i.model_name||i.title}</option>`)}
      </select>
      <div class="note">A LoRA works on the family it was trained on: one trained on a Pony checkpoint suits Pony and its merges.</div>

      <label class="field">Pictures</label>
      <div class="seg">
        <button class=${this.sourceKind==="collection"?"on":""} @click=${()=>{this.sourceKind="collection",this.preview=null}}>A collection</button>
        <button class=${this.sourceKind==="tag"?"on":""} @click=${()=>{this.sourceKind="tag",this.preview=null}}>Everything tagged</button>
      </div>
      <div style="margin-top:8px;">
        ${this.sourceKind==="collection"?this.collections.length?o`<select .value=${String(this.collectionId)}
                @change=${i=>{this.collectionId=Number(i.target.value),this.preview=null}}>
                ${this.collections.map(i=>o`<option value=${String(i.id)} ?selected=${i.id===this.collectionId}>${i.name} (${i.count})</option>`)}
              </select>`:o`<div class="note">No collections yet — gather the pictures into one in the library first, or train on a tag.</div>`:o`<input type="text" .value=${this.tag} placeholder="character name, style, …"
              @input=${i=>{this.tag=i.target.value,this.preview=null}} />`}
      </div>

      <label class="field">Captions</label>
      <div class="seg">
        <button class=${this.captions==="tags"?"on":""} @click=${()=>{this.captions="tags",this.preview=null}}>Trigger + tags</button>
        <button class=${this.captions==="trigger"?"on":""} @click=${()=>{this.captions="trigger",this.preview=null}}>Trigger only</button>
      </div>
      <div class="note">Trigger + tags suits a character or a concept; trigger only folds everything the pictures share into the word, which suits a style.</div>

      <div class="actions" style="justify-content:flex-start;">
        <button class="btn" ?disabled=${this.previewing} @click=${()=>this.loadPreview()}>
          <span class="material-symbols-rounded">visibility</span> ${this.previewing?"Looking…":this.preview?"Look again":"See what it trains on"}
        </button>
      </div>
      ${this.preview?this.renderPreview(this.preview):c}

      <label class="check">
        <input type="checkbox" .checked=${this.freeGpu} @change=${i=>this.freeGpu=i.target.checked} />
        <span>Free the generator's GPU while training<small>Asks the generator to unload its checkpoint when training starts, and to load it again after.</small></span>
      </label>
      <label class="check">
        <input type="checkbox" .checked=${this.samples} @change=${i=>this.samples=i.target.checked} />
        <span>Render a sample at the end<small>A picture made with the new LoRA, which becomes its cover.</small></span>
      </label>
      <label class="check">
        <input type="checkbox" .checked=${this.lowVram} @change=${i=>this.lowVram=i.target.checked} />
        <span>Low VRAM<small>For a card under 12 GB: trains at 768 and leaves the text encoder alone.</small></span>
      </label>

      <button class="btn" style="margin-top:12px;" @click=${()=>this.advanced=!this.advanced}>
        <span class="material-symbols-rounded">${this.advanced?"expand_less":"expand_more"}</span> Training settings
      </button>
      ${this.advanced?this.renderAdvanced():c}

      ${this.error?o`<div class="banner">${this.error}</div>`:c}
      <div class="actions">
        <button class="btn primary" ?disabled=${!t} @click=${()=>this.start()}>
          <span class="material-symbols-rounded">model_training</span> ${this.starting?"Starting…":"Start training"}
        </button>
      </div>
      <div class="note">The pictures are decrypted and sent to the trainer, which deletes them the moment training ends. The finished LoRA is installed into the generator by itself — this screen can be closed.</div>
    </div>`}renderPreview(e){return e.count?o`
      <div class="note">${e.count} picture${e.count===1?"":"s"}${e.count>=e.limit?` (the first ${e.limit})`:""}.
        Each is shown ${this.repeats||e.suggestedRepeats}× an epoch.${e.count<10?" Ten or more train a steadier LoRA.":""}</div>
      <div class="thumbs">${e.mediaIds.map(t=>o`<img loading="lazy" src=${u.thumbURL(t)} alt="" />`)}</div>
      ${this.captions==="tags"&&e.commonTags.length?o`<div class="note">The tags they share. Strike out what the trigger word should stand for — her hair, her eyes, the style's medium — and it is learnt as the trigger rather than as the tag:</div>
            <div class="tags">${e.commonTags.map(t=>{const i=this.leaveOut.some(a=>a.toLowerCase()===t.name.toLowerCase());return o`<button class="tag ${i?"out":""}" @click=${()=>{this.leaveOut=ji(this.leaveOut,t.name),this.loadPreview()}}>
                ${t.name}<b>${t.count}</b></button>`})}</div>`:c}
      ${e.exampleCaption?o`<div class="caption">${e.exampleCaption}</div>`:c}
    `:o`<div class="banner">There are no pictures there to train on (GIFs and videos are left out).</div>`}renderAdvanced(){const e=(t,i,a)=>o`<input type="number" min=${a.min} max=${a.max} step=${a.step??1} .value=${t?String(t):""}
        placeholder=${a.placeholder??"Auto"} @input=${s=>i(Number(s.target.value)||0)} />`;return o`
      <div class="row" style="margin-top:6px;">
        <div><label class="field">Epochs</label>${e(this.epochs,t=>this.epochs=t,{min:1,max:100,placeholder:"10"})}</div>
        <div><label class="field">Repeats</label>${e(this.repeats,t=>this.repeats=t,{min:1,max:100})}</div>
        <div><label class="field">Rank</label>${e(this.rank,t=>this.rank=t,{min:1,max:128,placeholder:"16 (SDXL) / 32"})}</div>
      </div>
      <div class="row">
        <div><label class="field">Resolution</label>${e(this.resolution,t=>this.resolution=t,{min:256,max:2048,step:64,placeholder:"1024 (SDXL) / 512"})}</div>
        <div><label class="field">Learning rate</label>${e(this.learningRate,t=>this.learningRate=t,{min:0,max:1,step:1e-5,placeholder:"0.0001"})}</div>
        <div>
          <label class="field">Optimizer</label>
          <select .value=${this.optimizer} @change=${t=>this.optimizer=t.target.value}>
            ${["AdamW8bit","AdamW","Prodigy","Adafactor","Lion"].map(t=>o`<option value=${t} ?selected=${t===this.optimizer}>${t}</option>`)}
          </select>
        </div>
      </div>
      <label class="check">
        <input type="checkbox" .checked=${this.flip} @change=${t=>this.flip=t.target.checked} />
        <span>Mirror the pictures<small>Doubles a small set; leave off for anything asymmetric — a scar, a side parting, text.</small></span>
      </label>
      <div class="note">Prodigy sets its own learning rate. Some two hundred steps an epoch is the aim: repeats are worked out from the number of pictures when left blank.</div>
    `}renderRuns(){return o`<div>
      <div class="runs">
        ${this.runs.length===0?o`<div class="card empty" style="padding:30px 16px;">
              <span class="material-symbols-rounded">history</span>Runs appear here, and carry on with this screen closed.
            </div>`:this.runs.map(e=>this.renderRun(e))}
      </div>
    </div>`}renderRun(e){var s,r,l;const t=Ni(e),i=pt(e),a=(s=e.samples)!=null&&s.length?e.samples[e.samples.length-1]:"";return o`<div class="run">
      <div class="run-head">
        <span class="name" title=${e.name}>${e.name}</span>
        ${e.trigger?o`<span class="meta" style="margin:0;">${e.trigger}</span>`:c}
        <span class="spacer"></span>
        <span class="status ${e.status}">${e.status}</span>
      </div>
      <div class="line">${Fi(e)}</div>
      ${i?o`<div class="bar ${t===null?"unknown":""}"><div style=${t===null?"":`width:${(t*100).toFixed(1)}%`}></div></div>`:c}
      <div class="meta">${e.images} pictures · ${e.baseModel}${e.family?` (${e.family==="sdxl"?"SDXL":"SD 1.5"})`:""} · ${new Date(e.createdAt*1e3).toLocaleString()}</div>
      ${a||e.status==="done"&&e.modelKey?o`<div class="run-body">
            ${a?o`<img src=${u.trainSampleURL(e.id,a)} alt="Sample" />`:c}
            ${e.status==="done"?o`<div class="note" style="margin:0;">Installed — pick it under LoRAs${e.trigger?o`, and put <b>${e.trigger}</b> in the prompt`:""}.</div>`:c}
          </div>`:c}
      ${this.openLog===e.id&&((r=e.log)!=null&&r.length)?o`<pre class="log">${e.log.join(`
`)}</pre>`:c}
      <div class="run-actions">
        ${i&&e.status!=="installing"?o`<button class="btn danger" @click=${()=>this.cancel(e)}><span class="material-symbols-rounded">stop</span> Stop</button>`:c}
        ${(l=e.log)!=null&&l.length?o`<button class="btn" @click=${()=>this.openLog=this.openLog===e.id?0:e.id}>
              <span class="material-symbols-rounded">terminal</span> ${this.openLog===e.id?"Hide log":"Log"}</button>`:c}
        ${!i&&e.request?o`<button class="btn" @click=${()=>this.again(e)}><span class="material-symbols-rounded">replay</span> Train again</button>`:c}
        ${i?c:o`<button class="btn" @click=${()=>this.forget(e)}><span class="material-symbols-rounded">delete</span> Remove</button>`}
      </div>
    </div>`}};k.styles=[de,ke,pe`
      :host {
        position: fixed;
        inset: 0;
        /* Above the studio's drawer, which on a phone is a sheet at 91. */
        z-index: 95;
        display: block;
        background: var(--oppai-bg, #141218);
        color: var(--oppai-text);
        overflow-y: auto;
      }
      .wrap { max-width: 1240px; margin: 0 auto; padding: 18px 16px 60px; }
      .topbar {
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        position: sticky; top: 0; z-index: 2;
        background: var(--oppai-bg, #141218); padding: 8px 0 12px;
      }
      .topbar h2 { margin: 0; font-size: 17px; display: inline-flex; align-items: center; gap: 8px; }
      .trainer { font-size: 12px; color: var(--oppai-text-dim); display: inline-flex; align-items: center; gap: 6px; }
      .trainer .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--oppai-primary); }
      .trainer .dot.busy { background: #e8b04a; }
      .trainer .dot.off { background: var(--oppai-error, #f2b8b5); }
      .btn {
        border: none; background: var(--oppai-surface-2); color: var(--oppai-text); border-radius: 10px;
        font: inherit; font-size: 13px; padding: 8px 14px; cursor: pointer;
        display: inline-flex; align-items: center; gap: 6px;
      }
      .btn:disabled { opacity: 0.5; cursor: default; }
      .btn.primary { background: var(--oppai-primary); color: var(--oppai-on-primary, #1d1b20); font-weight: 600; }
      .btn.danger { color: var(--oppai-error, #f2b8b5); }
      .btn .material-symbols-rounded { font-size: 17px; }
      .close { margin-left: auto; }
      .grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 18px; align-items: start; }
      @media (max-width: 900px) { .grid { grid-template-columns: minmax(0, 1fr); } }
      .card { background: var(--oppai-surface); border: 1px solid var(--oppai-border); border-radius: 16px; padding: 16px; }
      .card h3 { margin: 0 0 12px; font-size: 15px; }
      label.field { display: block; font-size: 12px; color: var(--oppai-text-dim); margin: 12px 0 5px; }
      .card h3 + .row label.field, .card h3 + .banner + .row label.field { margin-top: 0; }
      input[type="text"], input[type="number"], select {
        width: 100%; box-sizing: border-box; background: var(--oppai-bg, #141218);
        border: 1px solid var(--oppai-border-strong); border-radius: 10px; color: var(--oppai-text);
        font: inherit; font-size: 14px; padding: 8px 10px; outline: none;
      }
      input:focus, select:focus { border-color: var(--oppai-primary); }
      .row { display: flex; gap: 10px; flex-wrap: wrap; }
      .row > * { flex: 1; min-width: 120px; }
      .seg { display: inline-flex; background: var(--oppai-bg, #141218); border-radius: 10px; padding: 3px; gap: 2px; }
      .seg button {
        border: none; background: none; color: var(--oppai-text-dim); font: inherit; font-size: 13px;
        padding: 6px 12px; border-radius: 8px; cursor: pointer;
      }
      .seg button.on { background: var(--oppai-surface-2); color: var(--oppai-text); font-weight: 600; }
      .check { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; margin-top: 10px; cursor: pointer; }
      .check input { margin-top: 2px; }
      .check small { display: block; color: var(--oppai-text-dim); font-size: 12px; }
      .note { font-size: 12px; color: var(--oppai-text-dim); line-height: 1.45; margin-top: 8px; }
      .banner {
        background: color-mix(in srgb, var(--oppai-error, #f2b8b5) 16%, transparent);
        color: var(--oppai-text); border-radius: 12px; padding: 10px 12px; font-size: 13px; margin: 10px 0;
      }
      .thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 6px; margin: 10px 0; }
      .thumbs img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; background: var(--oppai-surface-2); }
      .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
      .tag {
        border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text);
        border-radius: 999px; font: inherit; font-size: 12px; padding: 4px 10px; cursor: pointer;
      }
      .tag b { color: var(--oppai-text-dim); font-weight: 400; margin-left: 4px; }
      .tag.out { text-decoration: line-through; color: var(--oppai-text-dim); border-style: dashed; }
      .caption {
        font-family: ui-monospace, monospace; font-size: 12px; background: var(--oppai-bg, #141218);
        border-radius: 10px; padding: 8px 10px; margin-top: 8px; word-break: break-word;
      }
      .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; flex-wrap: wrap; }
      .runs { display: flex; flex-direction: column; gap: 10px; }
      .run { background: var(--oppai-surface); border: 1px solid var(--oppai-border); border-radius: 14px; padding: 12px 14px; }
      .run-head { display: flex; align-items: center; gap: 10px; }
      .run-head .name { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .run-head .spacer { flex: 1; }
      .status { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--oppai-surface-2); white-space: nowrap; }
      .status.done { background: color-mix(in srgb, var(--oppai-primary) 25%, transparent); }
      .status.failed { background: color-mix(in srgb, var(--oppai-error, #f2b8b5) 25%, transparent); }
      .line { font-size: 12px; color: var(--oppai-text-dim); margin-top: 6px; word-break: break-word; }
      .meta { font-size: 11px; color: var(--oppai-text-dim); margin-top: 4px; }
      .bar { height: 6px; border-radius: 3px; background: var(--oppai-surface-2); overflow: hidden; margin-top: 8px; }
      .bar > div { height: 100%; background: var(--oppai-primary); transition: width 0.6s ease; }
      .bar.unknown > div { width: 30%; animation: slide 1.4s ease-in-out infinite; }
      @keyframes slide { from { margin-left: -30%; } to { margin-left: 100%; } }
      .run-body { display: flex; gap: 12px; margin-top: 10px; align-items: flex-start; }
      .run-body img { width: 96px; height: 96px; object-fit: cover; border-radius: 10px; flex: none; }
      .run-actions { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
      .run-actions .btn { padding: 6px 10px; font-size: 12px; }
      pre.log {
        font-size: 11px; background: var(--oppai-bg, #141218); border-radius: 10px; padding: 8px 10px;
        max-height: 220px; overflow: auto; white-space: pre-wrap; word-break: break-word; margin: 8px 0 0;
      }
      .empty { text-align: center; color: var(--oppai-text-dim); padding: 40px 16px; font-size: 14px; line-height: 1.5; }
      .empty .material-symbols-rounded { font-size: 40px; display: block; margin-bottom: 8px; }
    `];S([J({attribute:!1})],k.prototype,"models",2);S([J()],k.prototype,"checkpoint",2);S([d()],k.prototype,"configured",2);S([d()],k.prototype,"trainer",2);S([d()],k.prototype,"trainerError",2);S([d()],k.prototype,"runs",2);S([d()],k.prototype,"loaded",2);S([d()],k.prototype,"name",2);S([d()],k.prototype,"trigger",2);S([d()],k.prototype,"triggerTouched",2);S([d()],k.prototype,"base",2);S([d()],k.prototype,"sourceKind",2);S([d()],k.prototype,"collections",2);S([d()],k.prototype,"collectionId",2);S([d()],k.prototype,"tag",2);S([d()],k.prototype,"captions",2);S([d()],k.prototype,"leaveOut",2);S([d()],k.prototype,"preview",2);S([d()],k.prototype,"previewing",2);S([d()],k.prototype,"advanced",2);S([d()],k.prototype,"epochs",2);S([d()],k.prototype,"repeats",2);S([d()],k.prototype,"rank",2);S([d()],k.prototype,"resolution",2);S([d()],k.prototype,"learningRate",2);S([d()],k.prototype,"optimizer",2);S([d()],k.prototype,"lowVram",2);S([d()],k.prototype,"flip",2);S([d()],k.prototype,"freeGpu",2);S([d()],k.prototype,"samples",2);S([d()],k.prototype,"starting",2);S([d()],k.prototype,"error",2);S([d()],k.prototype,"openLog",2);k=S([he("oppai-lora-train")],k);const qi=new Set([",",`
`,"|","(",")","[","]","{","}"]);function ct(e,t){return qi.has(e[t])?!(t>0&&e[t-1]==="\\"&&"()[]{}".includes(e[t])):!1}function Hi(e,t){t=Math.max(0,Math.min(t,e.length));const i=e.slice(0,t),a=/<lora:([^:>]*)$/i.exec(i);if(a){const b=a.index;let y=t;const w=e.indexOf(">",t),$=e.indexOf("<",t);return w>=0&&($<0||w<$)&&(y=w+1),{start:b,end:y,query:a[1].trim(),mode:"lora"}}let s=t;for(;s>0&&!ct(e,s-1);)s--;let r=t;for(;r<e.length&&!ct(e,r);)r++;const l=e.slice(s,t),n=l.length-l.trimStart().length;if(s+=n,e.slice(s,t).includes(":")||/<[^>]*$/.test(e.slice(s,t)))return null;const p=e.slice(t,r).indexOf(":");for(p>=0&&(r=t+p);r>t&&/\s/.test(e[r-1]);)r--;const h=e.slice(s,t),f=/^__([^_]*(?:_[^_]+)*)_{0,2}$/.exec(h);if(h.startsWith("__")&&f){let b=r;const y=e.indexOf("__",s+2);return y>=0&&y+2<=r&&(b=y+2),{start:s,end:b,query:f[1],mode:"wildcard"}}return{start:s,end:r,query:Vi(h).trim(),mode:"tag"}}function ht(e){return e.replace(/([()[\]{}])/g,"\\$1")}function Vi(e){return e.replace(/\\([()[\]{}])/g,"$1")}function ut(e,t,i){const a=e.slice(t.end);let s="";return t.mode!=="lora"&&a.trim()===""&&(s=", "),{text:e.slice(0,t.start)+i+s+a.replace(/^\s+$/,""),caret:t.start+i.length+s.length}}function Ki(e,t){const i=e.toLowerCase();return t?i===t?0:i.startsWith(t)?1:i.split(/[\s_\-.]+/).some(a=>a.startsWith(t))?2:i.includes(t)?3:-1:2}function De(e,t,i,a){return e.map(s=>({t:s,s:Ki(t(s),i)})).filter(s=>s.s>=0).sort((s,r)=>s.s-r.s||t(s.t).localeCompare(t(r.t))).slice(0,a).map(s=>s.t)}function Yi(e,t,i=8){const a=e.query.toLowerCase();return e.mode==="lora"?De(t.loras,s=>s.alias||s.name,a,i).map(s=>({kind:"lora",label:s.alias||s.name,insert:`<lora:${s.name}:${Xi(s.weight??1)}>`,detail:s.alias&&s.alias!==s.name?s.name:void 0})):e.mode==="wildcard"?De(t.wildcards,s=>s.name,a,i).map(s=>({kind:"wildcard",label:`__${s.name}__`,insert:`__${s.name}__`,detail:s.lines?`${s.lines} line${s.lines===1?"":"s"}`:void 0})):a.length<1?[]:De(t.triggers,s=>s,a,Math.min(3,i)).map(s=>({kind:"trigger",label:s,insert:s,detail:"trigger word"}))}function Xi(e){return Number.isInteger(e)?String(e):String(Math.round(e*100)/100)}function Zi(e,t,i=10){const a=new Set,s=[];for(const r of[...e,...t]){const l=r.insert.toLowerCase();if(!a.has(l)&&(a.add(l),s.push(r),s.length>=i))break}return s}function Ji(e){return e?e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e4?`${Math.round(e/1e3)}k`:e>=1e3?`${(e/1e3).toFixed(1)}k`:String(e):""}function Qi(e,t,i){return t<=0?-1:e<0?i>0?0:t-1:(e+i+t)%t}var ea=Object.defineProperty,ta=Object.getOwnPropertyDescriptor,m=(e,t,i,a)=>{for(var s=a>1?void 0:a?ta(t,i):t,r=e.length-1,l;r>=0;r--)(l=e[r])&&(s=(a?l(t,i,s):l(s))||s);return a&&s&&ea(t,i,s),s};function gt(){const e=window;return e.SpeechRecognition??e.webkitSpeechRecognition??null}const Be=[{id:"models",label:"Models",icon:"deployed_code"},{id:"loras",label:"LoRAs",icon:"style"},{id:"look",label:"Look",icon:"face"},{id:"wildcards",label:"Wildcards",icon:"category"},{id:"templates",label:"Styles",icon:"palette"},{id:"settings",label:"Settings",icon:"tune"}],ia=[{label:"Portrait",hint:"512×768",w:512,h:768},{label:"Square",hint:"512×512",w:512,h:512},{label:"Landscape",hint:"768×512",w:768,h:512},{label:"Tall",hint:"640×960",w:640,h:960},{label:"XL Portrait",hint:"832×1216",w:832,h:1216},{label:"XL Square",hint:"1024×1024",w:1024,h:1024},{label:"XL Landscape",hint:"1216×832",w:1216,h:832}],aa=[{id:"",label:"Default (Euler a)"},...[["ddim","DDIM"],["ddpm","DDPM"],["deis","DEIS"],["deis_k","DEIS Karras"],["dpmpp_2s","DPM++ 2S"],["dpmpp_2s_k","DPM++ 2S Karras"],["dpmpp_2m","DPM++ 2M"],["dpmpp_2m_k","DPM++ 2M Karras"],["dpmpp_2m_sde","DPM++ 2M SDE"],["dpmpp_2m_sde_k","DPM++ 2M SDE Karras"],["dpmpp_3m","DPM++ 3M"],["dpmpp_3m_k","DPM++ 3M Karras"],["dpmpp_sde","DPM++ SDE"],["dpmpp_sde_k","DPM++ SDE Karras"],["er_sde","ER-SDE"],["euler","Euler"],["euler_k","Euler Karras"],["euler_a","Euler Ancestral"],["heun","Heun"],["heun_k","Heun Karras"],["kdpm_2","KDPM 2"],["kdpm_2_k","KDPM 2 Karras"],["kdpm_2_a","KDPM 2 Ancestral"],["kdpm_2_a_k","KDPM 2 Ancestral Karras"],["lcm","LCM"],["lms","LMS"],["lms_k","LMS Karras"],["pndm","PNDM"],["tcd","TCD"],["unipc","UniPC"],["unipc_k","UniPC Karras"]].map(([e,t])=>({id:e,label:t}))],O=[{id:"neutral",label:"Neutral",face:"calm neutral expression, relaxed face, looking at viewer",pose:"both arms hanging naturally at her sides, relaxed hands"},{id:"happy",label:"Happy",face:"warm genuine smile, bright eyes, cheerful expression",pose:"hands loosely clasped behind her lower back, open cheerful posture"},{id:"mischievous",label:"Mischievous",face:"smirk, half-lidded eyes, teasing knowing expression",pose:"one hand resting on her hip, other arm relaxed at her side"},{id:"surprised",label:"Surprised",face:"surprised expression, wide eyes, slightly open mouth",pose:"hands open near her waist, elbows bent slightly in surprise"},{id:"thinking",label:"Thinking",face:"thoughtful expression, looking to the side",pose:"one fingertip resting at her chin, other arm folded gently across her waist"},{id:"shy",label:"Shy",face:"bashful shy expression, blushing cheeks, averted eyes, hesitant small smile",pose:"hands clasped low in front of her skirt, shoulders tucked slightly inward"},{id:"smug",label:"Smug",face:"self-satisfied smug expression, raised eyebrow, confident knowing smirk",pose:"one hand planted on her hip, other arm loose, confident stance"},{id:"sad",label:"Sad",face:"sad wistful expression, downcast eyes, slight frown, vulnerable face",pose:"arms hanging softly at her sides, shoulders slightly slumped"},{id:"annoyed",label:"Annoyed",face:"annoyed irritated expression, furrowed brows, impatient pout",pose:"arms crossed low beneath her chest, weight shifted impatiently"},{id:"sleepy",label:"Sleepy",face:"sleepy drowsy expression, heavy half-closed eyes, relaxed tired face",pose:"arms loose at her sides, languid slouched posture"},{id:"loving",label:"Loving",face:"tender loving expression, soft adoring eyes, affectionate gentle smile",pose:"hands gently clasped low over her abdomen, body leaning affectionately forward"},{id:"excited",label:"Excited",face:"excited thrilled expression, sparkling wide eyes, eager open smile",pose:"hands held eagerly near her hips, lively forward-leaning stance"}],E=[{id:"typing",label:"Typing",heat:0,face:"focused expression, eyes on a screen, faint smile",pose:"sitting at a desk, both hands on a keyboard, leaning slightly toward the monitor"},{id:"reading",label:"Reading",heat:0,face:"absorbed expression, eyes lowered to the page",pose:"curled up holding an open book, one leg tucked under her"},{id:"gaming",label:"Gaming",heat:0,face:"intent expression, eyes wide on the screen, tongue at the corner of her mouth",pose:"sitting cross-legged holding a game controller in both hands"},{id:"lounging",label:"Lounging",heat:0,face:"relaxed expression, eyes half closed, easy smile",pose:"sprawled back across a sofa, arms loose, one knee raised"},{id:"drinking",label:"Drinking",heat:0,face:"contented expression, eyes closed over the rim",pose:"holding a steaming mug in both hands near her chest"},{id:"eating",label:"Eating",heat:0,face:"cheeks slightly full, pleased expression",pose:"holding food up to her mouth mid-bite, other hand cupped beneath it"},{id:"stretching",label:"Stretching",heat:0,face:"eyes shut, mouth open in a small yawn",pose:"arms stretched overhead, back arched, rising onto her toes"},{id:"napping",label:"Napping",heat:0,face:"sleeping, eyes closed, lips parted, peaceful",pose:"curled on her side asleep, hands tucked under her cheek"},{id:"dancing",label:"Dancing",heat:0,face:"eyes closed, delighted open smile",pose:"mid-step with hips turned, one arm raised loosely, hair in motion"},{id:"tidying",label:"Tidying",heat:0,face:"mildly absorbed expression, glancing at what she is holding",pose:"reaching to shelve something, weight on one foot"},{id:"drawing",label:"Drawing",heat:0,face:"concentrating, brow faintly furrowed, tongue between her teeth",pose:"hunched over a sketchbook, pencil in hand, other arm steadying the page"},{id:"waving",label:"Waving",heat:0,face:"bright welcoming smile, eyes on the viewer",pose:"one arm raised waving at the viewer, weight on one hip"},{id:"undressing",label:"Undressing",heat:2,intimate:!0,face:"half-lidded eyes, small knowing smile, watching the viewer",pose:"peeling clothing off one shoulder, other hand at her waistband"},{id:"teasing",label:"Teasing",heat:2,intimate:!0,face:"smirking, heavy-lidded eyes locked on the viewer",pose:"posing for the viewer, back arched, hands framing her hips"},{id:"touching",label:"Touching herself",heat:2,intimate:!0,face:"flushed, lips parted, eyes on the viewer",pose:"one hand pressed between her thighs over her clothes, other hand at her chest"},{id:"rubbing",label:"Rubbing",heat:3,intimate:!0,face:"deep blush, mouth open, eyes unfocused",pose:"reclining with one hand rubbing between her spread thighs"},{id:"fingering",label:"Fingering",heat:4,intimate:!0,face:"flushed, head tipped back, brow drawn, panting",pose:"lying back with her fingers inside herself, knees fallen open"},{id:"spread",label:"Spread",heat:4,intimate:!0,face:"flushed, watching the viewer, mouth open",pose:"lying back holding herself open with both hands, legs spread wide"},{id:"vibrator",label:"Vibrator",heat:3,intimate:!0,face:"eyes squeezed shut, mouth open, deep blush",pose:"holding a vibrator against herself, thighs tensed together"},{id:"dildo",label:"Dildo",heat:4,intimate:!0,face:"flushed, half-lidded, biting her lip",pose:"using a dildo on herself, one hand braced behind her"},{id:"riding",label:"Riding",heat:4,intimate:!0,face:"flushed, head thrown back, mouth open",pose:"straddling and riding a toy, hands braced on her thighs, back arched"},{id:"grinding",label:"Grinding",heat:3,intimate:!0,face:"flushed, eyes shut, teeth in her lip",pose:"straddling a pillow, hips rolling forward, hands gripping it"},{id:"climax",label:"Climax",heat:4,intimate:!0,face:"eyes rolled up, mouth wide open, whole face flushed",pose:"body arched taut mid-orgasm, toes curled, hands fisted"},{id:"afterglow",label:"Afterglow",heat:3,intimate:!0,face:"dazed exhausted smile, heavy-lidded eyes, deep blush",pose:"collapsed limp on her back, limbs loose, chest heaving"}],U=[{label:"Calm",mood:"composed posture"},{label:"Warm",mood:"soft light blush, inviting posture, slight lean forward"},{label:"Flirty",mood:"flirty confident stance, visible blush"},{label:"Heated",mood:"heavy blush, sultry posture, parted lips, heavy-lidded eyes"},{label:"Peak",mood:"deep blush, flushed skin, breathless needy expression"}],X=O.length*U.length,oe=E.length,St={faces:O.length,tiers:U.length,miscIds:E.map(e=>e.id)};function mt(e){return Ot(e,St)}function sa(e,t,i){return Rt(e,t,i,St)}const ft=[0,96,128];function oa(){const e=new Uint8Array(12);return crypto.getRandomValues(e),Array.from(e,t=>t.toString(16).padStart(2,"0")).join("")}let g=class extends ce{constructor(){super(...arguments),this.studio=!1,this.status=null,this.checkpoint="",this.vae="",this.templateId="",this.showBuiltInTemplates=!1,this.selectedLoras={},this.selectedTriggers=[],this.loraPage=0,this.outfitOn=!1,this.outfitText="",this.outfitGear={...Le},this.outfitFace=0,this.outfitMisc="",this.outfitMiscBatch=!1,this.outfitTier=0,this.outfitBackground="white",this.outfitUnderwearColor="black",this.outfitPubicHair=!1,this.outfitPubicHairColor="dark brown",this.outfitLockColors=!0,this.gearPromptOpen=null,this.outfitBatchRunning=!1,this.outfitExporting=!1,this.outfitProgress="",this.stopOutfitBatch=!1,this.loadouts=[],this.outfitLoadoutId="",this.loadoutBusy=!1,this.loadoutCoverVersion=0,this.wardrobes=[],this.outfitWardrobeId="",this.studioLoaded=!1,this.studioView="build",this.sheetTab="faces",this.sheetZoom=1,this.showSquarePrompt=!1,this.camera={...Xe},this.cutout=null,this.cutoutTolerance=42,this.cutoutBusy=!1,this.cutoutError="",this.cutoutCanvas=null,this.session=null,this.cutoutTool="remove",this.cutoutFeather=Je.feather,this.cutoutSpill=Je.spill,this.cutoutZoom=1,this.cutoutContrast=!1,this.contiguous=!0,this.brushSize=24,this.showOriginal=!1,this.canUndo=!1,this.canRedo=!1,this.cutFraction=0,this.painting=!1,this.characters=[],this.selectedChars=[],this.charDraft=null,this.charBusy=!1,this.scanBusy=!1,this.poses=[],this.selectedPoses=[],this.poseDraft=null,this.poseBusy=!1,this.wildcards=[],this.wildcardDraft=null,this.wildcardBusy=!1,this.editMedia=0,this.editing=null,this.open={models:!0,settings:!0},this.speech="",this.listening=!1,this.optimizing=!1,this.prompt="",this.completions=[],this.completionIndex=-1,this.completionToken=null,this.completionField="prompt",this.completionSeq=0,this.completionTimer=0,this.createTab=typeof matchMedia=="function"&&matchMedia("(max-width: 900px)").matches?"":"models",this.pickerFilter="",this.flatSections=!1,this.negative="",this.showOptions=!1,this.width=512,this.height=768,this.steps=25,this.cfg=7,this.cfgRescale=0,this.clipSkip=0,this.seamlessX=!1,this.seamlessY=!1,this.vaePrecision="fp32",this.cpuNoise=!0,this.board="none",this.scheduler="",this.count=1,this.seed=-1,this.detailerEnabled=!1,this.detailerModel="face_yolov8n.pt",this.detailerPrompt="",this.detailerNegative="",this.detailerConfidence=.3,this.detailerDenoise=.4,this.detailerMaskBlur=4,this.generating=!1,this.jobId="",this.progress=null,this.progressTimer=0,this.progressSeen=0,this.shots=[],this.activeNodeId=null,this.draggingNode=null,this.restoredNotice=!1,this.infoFor=null,this.draftRestored=!1,this.pendingScroll=0,this.error="",this.toast="",this.thumbVersion=0,this.failedThumbs=new Set,this.expandedShot=null,this.metaDraft=null,this.metaBusy=!1,this.metaTriggerText="",this.civitaiOpen=!1,this.trainOpen=!1,this.recognition=null,this.startFresh=()=>{xe(),this.prompt="",this.negative="",this.selectedLoras={},this.selectedTriggers=[],this.selectedChars=[],this.outfitOn=!1,this.outfitText="",this.outfitGear={...Le},this.outfitFace=0,this.outfitTier=0,this.outfitBackground="white",this.outfitUnderwearColor="black",this.outfitPubicHair=!1,this.outfitPubicHairColor="dark brown",this.outfitLockColors=!0,this.outfitLoadoutId="",this.outfitWardrobeId="",this.outfitProgress="",this.shots=[],this.activeNodeId=null,this.seed=-1,this.restoredNotice=!1}}connectedCallback(){super.connectedCallback(),this.restoreDraft(),this.loadStatus(),this.loadCharacters(),this.loadPoses(),this.loadWildcards(),this.studio&&this.enterStudio()}enterStudio(){this.outfitOn=!0,this.open={...this.open,outfit:!0,loadouts:!0,models:!1,settings:!1},this.loadStudio()}disconnectedCallback(){super.disconnectedCallback(),this.stopOutfitBatch=!0,this.stopListening(),this.flushDraft()}get scrollHost(){let e=this;for(;e;){if(e instanceof HTMLElement&&e!==this){const i=getComputedStyle(e);if(/(auto|scroll|overlay)/.test(i.overflowY)&&e.scrollHeight>e.clientHeight+1)return e}if(e=e.parentNode??(e instanceof ShadowRoot?e.host:null),e===document.documentElement)break}return null}updated(e){var t;e.has("editMedia")&&this.editMedia>0&&((t=this.editing)==null?void 0:t.id)!==this.editMedia&&this.loadFromMedia(this.editMedia),this.pendingScroll&&this.scrollHost&&(this.scrollHost.scrollTop=this.pendingScroll,this.pendingScroll=0);for(const i of e.keys())if(g.DRAFT_FIELDS.has(String(i))){this.persistDraft();break}}persistDraft(){this.draftTimer!==void 0&&clearTimeout(this.draftTimer),this.draftTimer=window.setTimeout(()=>{this.draftTimer=void 0,this.flushDraft()},600)}flushDraft(){var e;this.draftTimer!==void 0&&(clearTimeout(this.draftTimer),this.draftTimer=void 0),this.draftRestored&&Ft({prompt:this.prompt,negative:this.negative,checkpoint:this.checkpoint,vae:this.vae,templateId:this.templateId,scheduler:this.scheduler,width:this.width,height:this.height,steps:this.steps,cfg:this.cfg,cfgRescale:this.cfgRescale,clipSkip:this.clipSkip,seamlessX:this.seamlessX,seamlessY:this.seamlessY,vaePrecision:this.vaePrecision,cpuNoise:this.cpuNoise,count:this.count,seed:this.seed,board:this.board,selectedLoras:this.selectedLoras,selectedTriggers:this.selectedTriggers,selectedChars:this.selectedChars,selectedPoses:this.selectedPoses,outfitOn:this.outfitOn,outfitText:this.outfitText,outfitGear:this.outfitGear,outfitFace:this.outfitFace,outfitMisc:this.outfitMisc,outfitMiscBatch:this.outfitMiscBatch,outfitTier:this.outfitTier,outfitBackground:this.outfitBackground,outfitUnderwearColor:this.outfitUnderwearColor,outfitPubicHair:this.outfitPubicHair,outfitPubicHairColor:this.outfitPubicHairColor,outfitLockColors:this.outfitLockColors,outfitLoadoutId:this.outfitLoadoutId,outfitWardrobeId:this.outfitWardrobeId,camera:this.camera,detailerEnabled:this.detailerEnabled,detailerModel:this.detailerModel,detailerPrompt:this.detailerPrompt,detailerNegative:this.detailerNegative,detailerConfidence:this.detailerConfidence,detailerDenoise:this.detailerDenoise,detailerMaskBlur:this.detailerMaskBlur,open:this.open,showOptions:this.showOptions,shots:this.shots.map(t=>({id:t.id,seed:t.seed,saved:t.saved,info:t.info,outfitFilename:t.outfitFilename,outfitSlot:t.outfitSlot,outfitConfig:t.outfitConfig,cutoutReviewed:t.cutoutReviewed,previewVersion:t.previewVersion,workspaceX:t.workspaceX,workspaceY:t.workspaceY})),scrollTop:((e=this.scrollHost)==null?void 0:e.scrollTop)??0})}restoreDraft(){const e=Ut();this.draftRestored=!0,e&&(e.prompt!==void 0&&(this.prompt=e.prompt),e.negative!==void 0&&(this.negative=e.negative),e.checkpoint!==void 0&&(this.checkpoint=e.checkpoint),e.vae!==void 0&&(this.vae=e.vae),e.templateId!==void 0&&(this.templateId=e.templateId),e.scheduler!==void 0&&(this.scheduler=e.scheduler),e.width!==void 0&&(this.width=e.width),e.height!==void 0&&(this.height=e.height),e.steps!==void 0&&(this.steps=e.steps),e.cfg!==void 0&&(this.cfg=e.cfg),e.cfgRescale!==void 0&&(this.cfgRescale=e.cfgRescale),e.clipSkip!==void 0&&(this.clipSkip=e.clipSkip),e.seamlessX!==void 0&&(this.seamlessX=e.seamlessX),e.seamlessY!==void 0&&(this.seamlessY=e.seamlessY),e.vaePrecision!==void 0&&(this.vaePrecision=e.vaePrecision),e.cpuNoise!==void 0&&(this.cpuNoise=e.cpuNoise),e.count!==void 0&&(this.count=e.count),e.seed!==void 0&&(this.seed=e.seed),e.board!==void 0&&(this.board=e.board),e.selectedLoras&&(this.selectedLoras=e.selectedLoras),e.selectedTriggers&&(this.selectedTriggers=e.selectedTriggers),e.selectedChars&&(this.selectedChars=e.selectedChars),e.selectedPoses&&(this.selectedPoses=e.selectedPoses),e.outfitOn!==void 0&&(this.outfitOn=e.outfitOn),e.outfitText!==void 0&&(this.outfitText=e.outfitText),e.outfitGear!==void 0&&(this.outfitGear=ot(e.outfitGear)),e.outfitFace!==void 0&&(this.outfitFace=Math.max(0,Math.min(O.length-1,Math.round(e.outfitFace)))),e.outfitMisc!==void 0&&(this.outfitMisc=E.some(t=>t.id===e.outfitMisc)?e.outfitMisc:""),e.outfitMiscBatch!==void 0&&(this.outfitMiscBatch=e.outfitMiscBatch),e.outfitTier!==void 0&&(this.outfitTier=Math.max(0,Math.min(U.length-1,Math.round(e.outfitTier)))),e.outfitBackground!==void 0&&(this.outfitBackground=e.outfitBackground),e.outfitUnderwearColor!==void 0&&(this.outfitUnderwearColor=e.outfitUnderwearColor),e.outfitPubicHair!==void 0&&(this.outfitPubicHair=e.outfitPubicHair),e.outfitPubicHairColor!==void 0&&(this.outfitPubicHairColor=e.outfitPubicHairColor),e.outfitLockColors!==void 0&&(this.outfitLockColors=e.outfitLockColors),e.outfitLoadoutId!==void 0&&(this.outfitLoadoutId=e.outfitLoadoutId),e.outfitWardrobeId!==void 0&&(this.outfitWardrobeId=e.outfitWardrobeId),e.camera&&(this.camera={...Xe,...e.camera}),e.detailerEnabled!==void 0&&(this.detailerEnabled=e.detailerEnabled),e.detailerModel!==void 0&&(this.detailerModel=e.detailerModel),e.detailerPrompt!==void 0&&(this.detailerPrompt=e.detailerPrompt),e.detailerNegative!==void 0&&(this.detailerNegative=e.detailerNegative),e.detailerConfidence!==void 0&&(this.detailerConfidence=e.detailerConfidence),e.detailerDenoise!==void 0&&(this.detailerDenoise=e.detailerDenoise),e.detailerMaskBlur!==void 0&&(this.detailerMaskBlur=e.detailerMaskBlur),e.open&&(this.open=e.open),e.showOptions!==void 0&&(this.showOptions=e.showOptions),e.shots&&(this.shots=e.shots.map(t=>({...t}))),e.scrollTop&&(this.pendingScroll=e.scrollTop),this.restoredNotice=!0)}async loadStatus(){this.status=null,this.error="";try{const e=await u.imageGenStatus();this.status=e,!this.checkpoint&&e.models&&e.models.length&&this.pickModel(e.models[0])}catch(e){this.status={enabled:!0,reachable:!1,error:e.message}}}async loadCharacters(){try{const e=await u.characters();this.characters=e.characters;const t=new Set(e.characters.map(i=>i.id));this.selectedChars=this.selectedChars.filter(i=>t.has(i))}catch{}}async loadPoses(){try{const e=await u.poses();this.poses=e.poses;const t=new Set(e.poses.map(i=>i.id));this.selectedPoses=this.selectedPoses.filter(i=>t.has(i))}catch{}}async loadWildcards(){try{this.wildcards=(await u.wildcards()).wildcards}catch{}}async loadFromMedia(e){try{const t=await u.mediaGeneration(e),i=t.info;if(i&&typeof i.prompt=="string"&&Array.isArray(i.loras))this.reuseGenInfo({...i,loras:i.loras.filter(a=>a&&typeof a.name=="string")});else{const a={},s=(t.prompt||"").replace(/<lora:([^:>]+):([-\d.]+)>/g,(r,l,n)=>(a[l]=Number(n)||1,"")).replace(/\s{2,}/g," ").trim();this.prompt=s||t.title,this.selectedLoras=a,this.templateId="",this.selectedChars=[],this.selectedPoses=[],this.outfitOn=!1,this.showOptions=!0}this.editing={id:e,title:t.title,tags:t.tags??[]},this.showToast(`Editing “${t.title}” — generate, then save beside it or in its place.`)}catch(t){this.showToast(`Couldn't open that picture here: ${t.message}`)}}get editingLibby(){var e;return!!((e=this.editing)!=null&&e.tags.some(t=>t==="character:libby"||t==="libby"))}pickModel(e){var a,s;const t=(s=(((a=this.status)==null?void 0:a.models)??[]).find(r=>r.title===this.checkpoint))==null?void 0:s.defaults;this.checkpoint=e.title;const i=e.defaults;(t!=null&&t.positive||i!=null&&i.positive)&&(this.prompt=at(this.prompt,t==null?void 0:t.positive,i==null?void 0:i.positive,"start")),(t!=null&&t.negative||i!=null&&i.negative)&&(this.negative=at(this.negative,t==null?void 0:t.negative,i==null?void 0:i.negative,"end")),i&&(i.clipSkip&&(this.clipSkip=i.clipSkip),i.steps&&(this.steps=i.steps),i.cfgScale&&(this.cfg=i.cfgScale),i.cfgRescale!==void 0&&(this.cfgRescale=i.cfgRescale),i.scheduler&&(this.scheduler=i.scheduler),i.width&&(this.width=i.width),i.height&&(this.height=i.height),i.vae&&(this.vae=i.vae),this.vaePrecision="fp32")}get speechSupported(){return gt()!=null}toggleListening(){if(this.listening){this.stopListening();return}const e=gt();if(!e)return;const t=new e;t.lang=navigator.language||"en-US",t.continuous=!1,t.interimResults=!0,t.onresult=i=>{let a="";for(let s=0;s<i.results.length;s++)a+=i.results[s][0].transcript;this.speech=a},t.onerror=i=>{this.error=i.error==="not-allowed"?"Microphone permission was denied.":`Speech error: ${i.error}`,this.stopListening()},t.onend=()=>{this.listening=!1,this.speech.trim()&&this.optimize(this.speech)},this.recognition=t,this.listening=!0,this.error="";try{t.start()}catch{this.listening=!1}}stopListening(){if(this.listening=!1,this.recognition){try{this.recognition.stop()}catch{}this.recognition=null}}async optimize(e){this.optimizing=!0;try{const{prompt:t,negativePrompt:i}=await u.optimizePrompt(e);this.prompt=t,this.negative||(this.negative=i)}catch(t){this.error=t.message}finally{this.optimizing=!1}}equippedOutfitTerms(){var t;const e=((t=this.status)==null?void 0:t.backend)??"";return q.flatMap(i=>{const a=st(i,this.pieceFor(i.key),e,this.outfitLockColors);return a?[a]:[]})}pieceFor(e){const t=this.outfitGear[e];return t.off?{color:"",item:""}:t.color.trim()||e!=="bra"&&e!=="panties"?t:{color:this.outfitUnderwearColor.trim()||"black",item:t.item}}outfitColorNegatives(){if(!this.outfitLockColors)return[];const e=new Set;for(const t of q)for(const i of ci(t,this.pieceFor(t.key)))e.add(i);return[...e]}outfitExposurePrompt(e){const t=this.pieceFor("bra").color,i=this.pieceFor("panties").color,a=H(this.outfitGear.top),s=H(this.outfitGear.bottoms),r=H(this.outfitGear.bra),l=H(this.outfitGear.panties),n=[];return!a&&!s?n.push("no outer top or bottoms equipped"):e.clothes==="on"?n.push("equipped outer clothes fully on and properly worn"):e.clothes==="displaced"?n.push("equipped outer clothes loosened and partly displaced, clothing slipping or pulled aside"):n.push("equipped outer clothes removed or mostly off her body"),r?e.bra==="hidden"&&a&&e.clothes==="on"?n.push(`${t} bra completely covered, bra not showing`):e.bra==="off"?n.push(a&&e.clothes==="on"?"bra removed but breasts covered by the top":"bra removed, bare breasts and nipples visible"):n.push(`${t} bra clearly showing, top shifted enough to reveal it`):n.push(a&&e.clothes==="on"?"no bra equipped, breasts covered by the top":"no bra equipped, bare breasts and nipples visible"),l?e.panties==="hidden"&&s&&e.clothes==="on"?n.push(`${i} panties completely covered, panties not showing`):e.panties==="off"?n.push(s&&e.clothes==="on"?"panties removed but vulva covered by the bottoms":"panties removed, vulva visible"):n.push(`${i} panties clearly showing, bottoms shifted enough to reveal them`):n.push(s&&e.clothes==="on"?"no panties equipped, vulva covered by the bottoms":"no panties equipped, vulva visible"),n.join(", ")}outfitFragment(){if(!this.outfitOn)return{prompt:"",negative:""};const e=O[this.outfitFace],t=E.find(h=>h.id===this.outfitMisc),i=t?t.heat:this.outfitTier,a=U[i],s=hi(i),r=this.outfitBackground==="black"?"perfectly solid pure black studio background, seamless black backdrop, background evenly lit with no texture":"perfectly solid pure white studio background, seamless white backdrop, background evenly lit with no texture",l=H(this.outfitGear.bottoms)&&s.clothes==="on",n=i===U.length-1?this.outfitPubicHair?l?`${this.outfitPubicHairColor.trim()||"dark brown"} pubic hair present beneath the bottoms`:`${this.outfitPubicHairColor.trim()||"dark brown"} pubic hair visible`:"clean-shaven pubic area, no pubic hair":"";return{prompt:["solo, one person, single subject",Kt(this.camera.shot),t?t.face:e.face,t?t.pose:e.pose,a.mood,...this.equippedOutfitTerms(),this.outfitExposurePrompt(s),n,this.outfitText.trim(),r].filter(Boolean).join(", "),negative:["multiple people, two people, group, crowd, 2girls, 2boys, extra person, duplicate person",t?"":"arms raised, hands above head, arms behind head, hands in hair, both hands near face","detailed background, scenery, gradient background, patterned background, background shadows",this.outfitBackground==="black"?"white background":"black background",this.outfitPubicHair?"":"pubic hair",...this.outfitColorNegatives(),this.outfitLockColors?"recolored clothing, wrong clothing color, color bleed":""].filter(Boolean).join(", ")}}applyCameraFraming(){const{width:e,height:t}=Jt(this.camera,Qt(this.width,this.height));this.width=e,this.height=t}editCamera(e){this.camera={...this.camera,...e},e.framing&&this.applyCameraFraming()}nextOutfitPose(){if(this.outfitMisc){const t=E.findIndex(i=>i.id===this.outfitMisc)+1;this.outfitMisc=E[t%E.length].id;return}const e=this.outfitFace+1;if(e<O.length){this.outfitFace=e;return}this.outfitFace=0,this.outfitTier=(this.outfitTier+1)%U.length}assemblePrompts(){var l,n,p,h;const e=this.outfitFragment(),t=[this.prompt.trim(),...this.selectedTriggers,e.prompt],i=[this.negative.trim(),e.negative];for(const f of this.selectedChars){const b=this.characters.find(y=>y.id===f);b&&(b.prompt.trim()&&t.push(b.prompt.trim()),(l=b.negativePrompt)!=null&&l.trim()&&i.push(b.negativePrompt.trim()))}if(!this.outfitOn)for(const f of this.selectedPoses){const b=this.poses.find(y=>y.id===f);b&&(b.prompt.trim()&&t.push(b.prompt.trim()),(n=b.negativePrompt)!=null&&n.trim()&&i.push(b.negativePrompt.trim()))}i.push(ri(i.join(", "),(((p=this.status)==null?void 0:p.loras)??[]).filter(f=>f.name in this.selectedLoras).map(f=>f.negative)));let a=t.filter(Boolean).join(", "),s=i.filter(Boolean).join(", ");const r=(((h=this.status)==null?void 0:h.templates)??[]).find(f=>f.id===this.templateId);return r&&(r.prompt.includes("{prompt}")?a=r.prompt.replaceAll("{prompt}",a):r.prompt.trim()&&(a=`${a}, ${r.prompt.trim()}`),r.negativePrompt.includes("{prompt}")?s=r.negativePrompt.replaceAll("{prompt}",s):r.negativePrompt.trim()&&(s=s?`${s}, ${r.negativePrompt.trim()}`:r.negativePrompt.trim())),{prompt:a,negative:s}}outfitSlot(e=this.outfitTier,t=this.outfitFace,i=this.outfitMisc){const a=E.find(p=>p.id===i),s=a??O[t],r=a?0:e,l=a?{label:"Misc"}:U[e];return{slot:{emotion:s.id,emotionLabel:s.label,tier:r,tierLabel:l.label,index:sa(r,t,a?a.id:"")},filename:ai(this.outfitText,l.label,s.id)}}shotAt(e){const t=N(e);return this.shots.find(i=>i.outfitSlot&&N(i.outfitSlot)===t)}staleShots(){return this.currentOutfitShots().filter(e=>!this.shotMatchesCurrentOutfit(e))}currentOutfitShots(){const e=new Map;for(const i of this.shots)i.outfitSlot&&e.set(N(i.outfitSlot),i);const t=[];for(let i=0;i<X+oe;i++){const{tier:a,face:s,misc:r}=mt(i),l=e.get(N(this.outfitSlot(a,s,r).slot));l&&t.push(l)}return t}outfitConfigKey(){const e=this.outfitPubicHair;return JSON.stringify({v:2,background:this.outfitBackground,underwear:this.outfitUnderwearColor.trim().toLowerCase()||"black",pubicHair:e,pubicHairColor:e?this.outfitPubicHairColor.trim().toLowerCase()||"dark brown":"",lockColors:this.outfitLockColors,gear:gi(this.outfitGear)})}shotMatchesCurrentOutfit(e){return e.outfitConfig?e.outfitConfig===this.outfitConfigKey():this.outfitBackground==="white"&&(this.outfitUnderwearColor.trim().toLowerCase()||"black")==="black"&&!this.outfitPubicHair&&q.every(({key:t})=>this.outfitGear[t].item.trim()===Le[t].item)}previewURL(e){if(e.wipOutfitId&&e.outfitSlot)return u.libbyOutfitWipImageURL(e.wipOutfitId,e.outfitSlot.emotion,e.outfitSlot.tier,e.previewVersion);const t=u.genPreviewURL(e.id);return e.previewVersion?`${t}?v=${e.previewVersion}`:t}async ensureWardrobe(){var i;if(this.outfitWardrobeId)return this.outfitWardrobeId;const e=this.outfitText.trim()||"Work in progress",t=await u.saveLibbyOutfit({name:e});return this.outfitWardrobeId=t.id,this.wardrobes=(await u.libbyOutfits()).outfits,(i=this.renderRoot.querySelector("oppai-outfit-wardrobe"))==null||i.refresh(),this.persistDraft(),this.showToast(`Keeping this outfit in a new wardrobe, “${t.name}”.`),t.id}async storeOutfitWip(e,t,i,a=!1){if(!e.outfitSlot)return"";try{const s=await fetch(t,{credentials:"same-origin"});if(!s.ok)throw new Error(`preview returned ${s.status}`);const r=await ve(await s.blob());return await u.putLibbyOutfitWip(i,e.outfitSlot.emotion,e.outfitSlot.tier,{imageData:r,filename:e.outfitFilename,seed:e.seed,reviewed:a,config:e.outfitConfig,info:e.info,clothing:[...this.equippedOutfitTerms(),this.outfitText.trim()].filter(Boolean).join(", ")}),i}catch(s){return this.showToast(`Couldn't keep this square: ${s.message}`),""}}async loadWipBoard(e){if(!e)return;let t;try{t=(await u.libbyOutfitWip(e)).squares}catch{return}const i=t.map(s=>{const r=O.findIndex(h=>h.id===s.emotion),l=E.some(h=>h.id===s.emotion)?s.emotion:"",n=l?0:Math.max(0,Math.min(U.length-1,s.level)),p=this.outfitSlot(n,Math.max(0,r),l);return{id:`wip-${e}-${s.emotion}-${s.level}`,seed:s.seed??-1,saved:!1,info:s.info,outfitFilename:s.filename||p.filename,outfitSlot:p.slot,outfitConfig:s.config,cutoutReviewed:s.reviewed,previewVersion:s.updatedAt,wipOutfitId:e}}),a=new Set(i.map(s=>`${s.outfitSlot.emotion}:${s.outfitSlot.tier}`));this.shots=[...this.shots.filter(s=>s.outfitSlot?s.wipOutfitId&&s.wipOutfitId!==e?!1:!a.has(`${s.outfitSlot.emotion}:${s.outfitSlot.tier}`):!0),...i],this.persistDraft()}defaultNodePosition(e){return{workspaceX:18+e%4*282,workspaceY:18+Math.floor(e/4)*430}}selectOutfitSlot(e){const{tier:t,face:i,misc:a}=mt(e);this.outfitMisc=a,a?this.sheetTab="misc":(this.outfitTier=t,this.outfitFace=i,this.sheetTab="faces")}renderGenerating(e){const t=this.progress,i=(t==null?void 0:t.total)??0,a=t?Math.max(0,Math.min(1,t.percent)):0,s=t!=null&&t.cancelled?"Stopping…":i>0?`Step ${t.step} of ${i}`:e?"Invoking generation…":"Generating image…";return o`<div class="generating-overlay">
      <div class="generating-card ${t!=null&&t.image?"with-preview":""}">
        ${t!=null&&t.image?o`<img class="progress-preview" src=${t.image} alt="The picture so far" />`:c}
        <div class="progress-row">
          <md-circular-progress indeterminate style="--md-circular-progress-size:22px;"></md-circular-progress>
          <span class="progress-label">${s}</span>
          <button class="progress-cancel" type="button" ?disabled=${t==null?void 0:t.cancelled} title="Stop this generation" @click=${()=>void this.cancelGeneration()}>
            <span class="material-symbols-rounded" style="font-size:18px;">close</span>Cancel
          </button>
        </div>
        <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(a*100)}>
          <span style=${`width:${Math.round(a*100)}%`}></span>
        </div>
      </div>
    </div>`}async generateOne(e){var w,$;const{prompt:t,negative:i}=this.assemblePrompts(),a=this.outfitText.trim(),s=this.outfitOn?this.outfitSlot():void 0,r=s?this.outfitConfigKey():void 0,l=s?this.shotAt(s.slot):void 0,n=l?this.nodePosition(l,this.shots.indexOf(l)):void 0,p=performance.now(),h={prompt:t,negativePrompt:i||void 0,checkpoint:this.checkpoint||void 0,vae:this.vae||void 0,sampler:this.scheduler||void 0,steps:this.steps,width:this.width,height:this.height,cfgScale:this.cfg,cfgRescale:this.cfgRescale,clipSkip:this.clipSkip,seamlessX:this.seamlessX,seamlessY:this.seamlessY,vaePrecision:this.vaePrecision,cpuNoise:this.cpuNoise,board:this.board,count:this.outfitOn?1:this.count,seed:this.seed,loras:Object.entries(this.selectedLoras).map(([L,T])=>({name:L,weight:T})),detailer:(w=this.status)!=null&&w.detailerAvailable&&this.detailerEnabled?{enabled:!0,model:this.detailerModel,prompt:this.detailerPrompt||void 0,negativePrompt:this.detailerNegative||void 0,confidence:this.detailerConfidence,denoise:this.detailerDenoise,maskBlur:this.detailerMaskBlur}:void 0};h.jobId=oa(),this.startProgressWatch(h.jobId,h.count??1);let f;try{f=await u.generate(h)}finally{this.stopProgressWatch()}f.rolled&&typeof f.positive=="string"&&(h.prompt=f.positive,h.negativePrompt=f.negative||void 0);const b=(performance.now()-p)/1e3,y=f.images.map((L,T)=>{var z,I,C,Q,ue,j;return{...L,saved:!1,outfitFilename:s==null?void 0:s.filename,outfitSlot:s==null?void 0:s.slot,outfitConfig:r,...n&&s?{workspaceX:n.x,workspaceY:n.y}:this.defaultNodePosition((e?this.shots.length:0)+T),info:Et(h,{seed:L.seed,backend:((z=this.status)==null?void 0:z.backend)??"unknown",modelHash:(Q=(C=(I=this.status)==null?void 0:I.models)==null?void 0:C.find(G=>G.title===h.checkpoint))==null?void 0:Q.hash,loraHashes:Object.fromEntries((((ue=this.status)==null?void 0:ue.loras)??[]).filter(G=>G.hash).map(G=>[G.name,G.hash])),triggers:this.selectedTriggers,characters:this.selectedChars.map(G=>{var ee;return((ee=this.characters.find(Ce=>Ce.id===G))==null?void 0:ee.name)??""}).filter(Boolean),poses:this.outfitOn?[]:this.selectedPoses.map(G=>{var ee;return((ee=this.poses.find(Ce=>Ce.id===G))==null?void 0:ee.name)??""}).filter(Boolean),outfit:this.outfitOn?a:"",controlImage:(j=this.cutout)==null?void 0:j.name,seconds:b})}});if(e&&s){if(y.length)try{const T=await this.ensureWardrobe(),z=await this.storeOutfitWip(y[0],this.previewURL(y[0]),T);z&&(y[0].wipOutfitId=z,y[0].previewVersion=Date.now())}catch(T){this.showToast(`Couldn't keep this square: ${T.message}`)}l&&y.length&&!l.id.startsWith("wip-")&&await u.deleteGenPreview(l.id);const L=N(s.slot);this.shots=[...this.shots.filter(T=>!T.outfitSlot||N(T.outfitSlot)!==L),...y]}else this.shots=y;return($=this.galleryPanel)==null||$.refresh(),y.length}startProgressWatch(e,t){this.stopProgressWatch(),this.jobId=e,this.progress={index:0,step:0,total:0,percent:0,seq:0,done:!1,cancelled:!1},this.progressSeen=0;const i=async()=>{var a,s;if(this.jobId===e){try{const r=await u.genProgress(e,this.progressSeen);if(this.jobId!==e)return;const l=r.image??(r.seq===this.progressSeen?(a=this.progress)==null?void 0:a.image:void 0);if(this.progress={...r,image:l,total:r.total||((s=this.progress)==null?void 0:s.total)||0},this.progressSeen=r.seq,r.done)return}catch{}this.progressTimer=window.setTimeout(()=>void i(),1e3)}};this.progressTimer=window.setTimeout(()=>void i(),600)}stopProgressWatch(){window.clearTimeout(this.progressTimer),this.progressTimer=0,this.jobId="",this.progress=null}async cancelGeneration(){const e=this.jobId;if(e){this.progress&&(this.progress={...this.progress,cancelled:!0});try{await u.cancelGenerate(e)}catch(t){this.showToast(`Couldn't cancel: ${t.message}`)}}}async generate(){if(!(this.generating||!this.assemblePrompts().prompt.trim())){this.generating=!0,this.error="";try{await this.generateOne(this.outfitOn)}catch(e){/cancelled/i.test(e.message)?this.showToast("Generation cancelled."):this.error=e.message}finally{this.generating=!1,this.persistDraft()}}}async generateOutfitAndNext(){if(!(this.generating||!this.outfitOn||!this.assemblePrompts().prompt.trim())){this.generating=!0,this.error="";try{await this.generateOne(!0)&&this.nextOutfitPose()}catch(e){this.error=e.message}finally{this.generating=!1,this.persistDraft()}}}async generateAllOutfit(){if(this.generating||!this.outfitOn||!this.assemblePrompts().prompt.trim())return;this.generating=!0,this.outfitBatchRunning=!0,this.stopOutfitBatch=!1,this.error="";const e=X+(this.outfitMiscBatch?oe:0);try{for(let i=0;i<e&&!this.stopOutfitBatch;i++){this.selectOutfitSlot(i);const{slot:a}=this.outfitSlot();this.shotAt(a)||(this.outfitProgress=`Generating ${i+1} of ${e} · ${a.tierLabel} · ${a.emotionLabel}`,await this.generateOne(!0),this.persistDraft())}const t=this.currentOutfitShots().length;this.outfitProgress=this.stopOutfitBatch?`Stopped with ${t} of ${e} ready.`:`Outfit complete · ${t} of ${e} ready.`}catch(t){this.error=t.message,this.outfitProgress=`Paused with ${this.currentOutfitShots().length} of ${e} ready. Run missing images to resume.`}finally{this.generating=!1,this.outfitBatchRunning=!1,this.persistDraft()}}async regenerateStale(){if(this.generating||!this.outfitOn||!this.assemblePrompts().prompt.trim())return;const e=this.staleShots();if(e.length){this.generating=!0,this.outfitBatchRunning=!0,this.stopOutfitBatch=!1,this.error="";try{for(let i=0;i<e.length&&!this.stopOutfitBatch;i++){const a=e[i].outfitSlot;this.selectOutfitSlot(a.index),this.outfitProgress=`Redoing ${i+1} of ${e.length} · ${a.tierLabel} · ${a.emotionLabel}`,await this.generateOne(!0),this.persistDraft()}const t=this.staleShots().length;this.outfitProgress=t?`Stopped with ${t} square${t===1?"":"s"} still on the old recipe.`:"Every square is on the current recipe."}catch(t){this.error=t.message}finally{this.generating=!1,this.outfitBatchRunning=!1,this.persistDraft()}}}cancelOutfitBatch(){this.stopOutfitBatch=!0,this.outfitProgress="Stopping after the current image…"}async copyGenInfo(e,t){if(!e.info){this.showToast("No generation data was recorded for this image.");return}const i=t==="json"?re(e.info):Z(e.info);await xt(i)?this.showToast(t==="json"?"Full data copied as JSON":"Generation data copied"):this.showToast("Couldn't reach the clipboard — this needs HTTPS or a permission.")}reuseGenInfo(e){var i;const t=_t(e);this.prompt=t.prompt,this.negative=t.negativePrompt??"",this.checkpoint=t.checkpoint??"",this.vae=t.vae??"",this.scheduler=t.sampler??"",this.seed=t.seed??-1,this.steps=t.steps??25,this.cfg=t.cfgScale??7,this.cfgRescale=t.cfgRescale??0,this.clipSkip=t.clipSkip??0,this.width=t.width??512,this.height=t.height??768,this.seamlessX=!!t.seamlessX,this.seamlessY=!!t.seamlessY,this.vaePrecision=t.vaePrecision??"fp32",this.cpuNoise=t.cpuNoise!==!1,this.count=1,this.selectedLoras=Object.fromEntries((t.loras??[]).map(a=>[a.name,a.weight])),this.board=t.board??"none",this.detailerEnabled=!!((i=t.detailer)!=null&&i.enabled),t.detailer&&(this.detailerModel=t.detailer.model??"face_yolov8n.pt",this.detailerPrompt=t.detailer.prompt??"",this.detailerNegative=t.detailer.negativePrompt??"",this.detailerConfidence=t.detailer.confidence??.3,this.detailerDenoise=t.detailer.denoise??.4,this.detailerMaskBlur=t.detailer.maskBlur??4),this.templateId="",this.selectedTriggers=[],this.selectedChars=[],this.selectedPoses=[],this.outfitOn=!1,this.showOptions=!0,this.showToast("Generation parameters loaded")}async exportShot(e){if(!e.info){this.showToast("No generation data was recorded for this image.");return}try{await yt(this.previewURL(e),e.outfitFilename??`oppailib-seed-${e.seed}.png`,Z(e.info),re(e.info)),this.showToast("PNG exported with Civitai metadata")}catch(t){this.showToast(t.message)}}async exportOutfitZip(){const e=this.currentOutfitShots();if(!e.length||this.outfitExporting)return;const t=e.filter(s=>!s.cutoutReviewed);if(t.length){this.error=`Review the automatic background cutout for all ${t.length} remaining outfit image${t.length===1?"":"s"} before exporting.`;return}this.outfitExporting=!0;const i=[],a=[];try{for(let p=0;p<e.length;p++){const h=e[p];this.outfitProgress=`Preparing ${p+1} of ${e.length} for the outfit ZIP…`;try{const f=await fetch(this.previewURL(h),{credentials:"same-origin"});if(!f.ok)throw new Error(`preview returned ${f.status}`);let b=new Uint8Array(await f.arrayBuffer());h.info&&(b=Ae(b,Z(h.info),re(h.info))),i.push({name:h.outfitFilename,data:b})}catch{a.push(h.outfitFilename??`seed-${h.seed}.png`)}}if(a.length){const p=new Set(a);this.shots=this.shots.filter(h=>!h.outfitFilename||!p.has(h.outfitFilename)),this.persistDraft()}if(!i.length)throw new Error("The generated previews expired. Generate the missing outfit images again.");const s={outfit:this.outfitText.trim(),loadout:this.outfitGear,expected:O.length*U.length,exported:i.length,generationBackground:this.outfitBackground,colorsLocked:this.outfitLockColors,underwearColor:this.outfitUnderwearColor.trim()||"black",pubicHair:this.outfitPubicHair,pubicHairColor:this.outfitPubicHair?this.outfitPubicHairColor.trim()||"dark brown":void 0,backgroundRemoved:!0,cutoutReviewed:!0,images:e.filter(p=>!a.includes(p.outfitFilename??"")).map(p=>({file:p.outfitFilename,...p.outfitSlot}))};i.push({name:"outfit-manifest.json",data:new TextEncoder().encode(JSON.stringify(s,null,2))});const r=await ki(i),l=URL.createObjectURL(r),n=document.createElement("a");n.href=l,n.download=si(this.outfitText),n.click(),setTimeout(()=>URL.revokeObjectURL(l),0),this.outfitProgress=a.length?`Exported ${i.length-1} images; ${a.length} expired preview${a.length===1?"":"s"} need regenerating.`:`Exported ${i.length-1} correctly named outfit images in one ZIP.`,this.showToast(a.length?"Outfit ZIP exported with missing previews.":"Outfit ZIP exported.")}catch(s){this.error=s.message}finally{this.outfitExporting=!1}}openShotMenu(e,t){t.preventDefault(),Oe({x:t.clientX,y:t.clientY,title:`Seed ${e.seed}`,items:[{label:"Copy generation metadata",icon:"content_copy",run:()=>void this.copyGenInfo(e,"text")},{label:"Use same generation parameters",icon:"replay",disabled:!e.info,run:()=>{e.info&&this.reuseGenInfo(e.info)}},{label:"Export PNG for Civitai",icon:"download",disabled:!e.info,run:()=>void this.exportShot(e)},{label:"Use as a Libby background",icon:"wallpaper",run:()=>void this.useAsBackground(e)},{label:"Save as a pose…",icon:"accessibility_new",run:()=>this.poseFromShot(e)},{label:"Send in chat as Libby…",icon:"send",run:()=>void this.sendAsLibby(e)},...this.editing?[{label:`Replace “${this.editing.title}” in the library`,icon:"published_with_changes",run:()=>void this.replaceOriginal(e)}]:[]]})}poseFromShot(e){var t;this.poseDraft={name:"",prompt:((t=e.info)==null?void 0:t.prompt)??this.prompt,negativePrompt:"",previewId:e.id.startsWith("wip-")?void 0:e.id}}async sendAsLibby(e){const t=window.prompt("What does she say with it? (leave blank for just the picture)","");if(t!==null)try{const i=await this.saveShot(e,["libby"]),a=await u.libbySend({mediaId:i,text:t.trim()});this.showToast("She sent it — it's in her chat."),this.dispatchEvent(new CustomEvent("libby-sent",{bubbles:!0,composed:!0,detail:a}))}catch(i){this.showToast(`Couldn't send that: ${i.message}`)}}async replaceOriginal(e){const t=this.editing;if(t&&confirm(`Replace “${t.title}” with this picture? The original is deleted.`))try{const i=t.tags.filter(s=>s!=="ai-generated"),a=await this.saveShot(e,i,t.title);a!==t.id&&await u.deleteMedia(t.id),this.editing={...t,id:a},this.showToast(`Replaced “${t.title}”.`),this.dispatchEvent(new CustomEvent("imported",{bubbles:!0,composed:!0}))}catch(i){this.showToast(`Couldn't replace it: ${i.message}`)}}async saveShot(e,t=[],i){var r,l;const a=i??((((l=(r=e.info)==null?void 0:r.prompt)==null?void 0:l.trim())||this.prompt.trim()||this.outfitText.trim()).slice(0,80)||"Generated image"),s=await u.saveGenerated({id:e.id,title:a,tags:t,info:e.info});return this.shots=this.shots.map(n=>n.id===e.id?{...n,saved:!0}:n),this.dispatchEvent(new CustomEvent("imported",{bubbles:!0,composed:!0})),s.id}async exportOutfitSquare(e){const t=e.outfitFilename??`oppailib-seed-${e.seed}.png`;try{const i=await fetch(this.previewURL(e),{credentials:"same-origin"});if(!i.ok)throw new Error(`preview returned ${i.status}`);let a=new Uint8Array(await i.arrayBuffer());if(e.info)try{a=Ae(a,Z(e.info),re(e.info))}catch{}const s=URL.createObjectURL(new Blob([a],{type:"image/png"})),r=document.createElement("a");r.href=s,r.download=t,r.click(),setTimeout(()=>URL.revokeObjectURL(s),0),this.showToast(e.cutoutReviewed?`Exported ${t}`:`Exported ${t} — its cutout hasn't been reviewed yet.`)}catch(i){this.showToast(`Couldn't export that square: ${i.message}`)}}async useAsBackground(e){var p,h,f;const t=((p=e.info)==null?void 0:p.prompt)??this.prompt,a=(t.split(/[,\n]/).map(b=>b.trim()).filter(Boolean).find(b=>/^[a-z][a-z ]{2,40}$/i.test(b)&&!/masterpiece|quality|detailed|resolution|score_/i.test(b))??"Generated room").replace(/\b\w/g,b=>b.toUpperCase()).slice(0,60),s=(h=window.prompt("Name this background",a))==null?void 0:h.trim();if(!s)return;const r=new Set(["masterpiece","best","quality","detailed","highly","ultra","high","resolution","the","and","with","very","background","scenery","score","absurdres"]),l=[...new Set(t.toLowerCase().match(/[a-z]{4,}/g)??[])].filter(b=>!r.has(b)).slice(0,8),n=window.prompt("Tags — what it is, comma separated (she reads these to pick a room)",l.join(", "));if(n!==null)try{const b=await fetch(this.previewURL(e),{credentials:"same-origin"});if(!b.ok)throw new Error(`preview returned ${b.status}`);const y=await ve(await b.blob()),w=await u.saveLibbyBackground({name:s,tags:n.split(",").map($=>$.trim()).filter(Boolean)});await u.setLibbyBackgroundImage(w.id,y),this.showToast(`Added “${s}” to the rooms Libby can be in.`),(f=this.renderRoot.querySelector("oppai-outfit-wardrobe"))==null||f.refresh()}catch(b){this.showToast(`Couldn't add that background: ${b.message}`)}}async save(e){if(!e.saved)try{await this.saveShot(e,this.editingLibby?["libby"]:[]),this.showToast("Saved to library")}catch(t){this.showToast(t.message)}}bumpThumbs(){this.thumbVersion++,this.failedThumbs=new Set}renderArt(e,t,i){return this.failedThumbs.has(e)?o`<div class="card-blank">
        <span class="material-symbols-rounded" style="font-size:34px;">${i}</span>
      </div>`:o`<img
      class="card-art"
      src=${e}
      alt=${t}
      loading="lazy"
      @error=${()=>{this.failedThumbs=new Set(this.failedThumbs).add(e)}}
    />`}async useAsModelThumb(e){if(!this.checkpoint){this.showToast("Pick a model first");return}try{await u.setModelThumb({model:this.checkpoint,previewId:e.id}),this.bumpThumbs(),this.showToast("Set as the model's cover")}catch(t){this.showToast(t.message)}}async openMetaEditor(e){this.metaBusy=!0;try{const t=await u.modelMeta(e);this.metaDraft=t,this.metaTriggerText=t.triggerPhrases.join(", ")}catch(t){this.showToast(t.message)}finally{this.metaBusy=!1}}setMetaDefaults(e){const t=this.metaDraft;t&&(this.metaDraft={...t,defaults:{...t.defaults??{},...e}})}async importCivitaiDefaults(){const e=this.metaDraft;if(!(!e||this.metaBusy)){this.metaBusy=!0;try{const{suggestion:t,keySet:i}=await u.civitaiSuggest({key:e.key}),a=this.metaDraft;if(!a)return;const s=ni(a.defaults??{},this.metaTriggerText,t,a.type==="lora");this.metaDraft={...a,defaults:s.defaults},this.metaTriggerText=s.triggerText;const r=s.applied.length?`Imported ${s.applied.join(", ")} — check them and Save`:"The Civitai page recommends nothing new";this.showToast(i?r:`${r}. A Civitai API key adds what the showcase pictures used.`)}catch(t){this.showToast(t.message)}finally{this.metaBusy=!1}}}async saveMeta(){const e=this.metaDraft;if(!(!e||this.metaBusy)){this.metaBusy=!0;try{await u.patchModelMeta({key:e.key,name:e.name,description:e.description??"",triggerPhrases:this.metaTriggerText.split(",").map(t=>t.trim()).filter(Boolean),defaults:e.defaults}),this.metaDraft=null,this.showToast("Model updated"),await this.loadStatus()}catch(t){this.showToast(t.message)}finally{this.metaBusy=!1}}}async deleteMetaModel(){const e=this.metaDraft;if(!e||this.metaBusy)return;const t=e.type==="lora"?"LoRA":"model";if(confirm(`Delete the ${t} “${e.name}” from InvokeAI? The file goes with it.`)){this.metaBusy=!0;try{if(await u.deleteModel(e.key),this.metaDraft=null,e.type==="lora"){const i={...this.selectedLoras};delete i[e.name],delete i[e.key],this.selectedLoras=i}else this.checkpoint===e.key&&(this.checkpoint="");this.showToast(`${t} deleted`),await this.loadStatus()}catch(i){this.showToast(i.message)}finally{this.metaBusy=!1}}}toggleLora(e){var i,a,s,r,l;const t={...this.selectedLoras};if(e in t){delete t[e];const n=new Set(((a=(((i=this.status)==null?void 0:i.loras)??[]).find(h=>h.name===e))==null?void 0:a.triggerPhrases)??[]),p=new Set((((s=this.status)==null?void 0:s.loras)??[]).filter(h=>h.name in t).flatMap(h=>h.triggerPhrases??[]));this.selectedTriggers=this.selectedTriggers.filter(h=>!n.has(h)||p.has(h))}else{const n=(l=(((r=this.status)==null?void 0:r.loras)??[]).find(p=>p.name===e))==null?void 0:l.weight;t[e]=n&&Number.isFinite(n)?n:1}this.selectedLoras=t}toggleTrigger(e){this.selectedTriggers=this.selectedTriggers.includes(e)?this.selectedTriggers.filter(t=>t!==e):[...this.selectedTriggers,e]}toggleCharacter(e){this.selectedChars=this.selectedChars.includes(e)?this.selectedChars.filter(t=>t!==e):[...this.selectedChars,e]}toggleSection(e){this.open={...this.open,[e]:!this.open[e]}}onCharThumbFile(e){var s;const t=e.target,i=(s=t.files)==null?void 0:s[0];if(t.value="",!i||!this.charDraft)return;const a=new FileReader;a.onload=()=>{this.charDraft&&(this.charDraft={...this.charDraft,imageData:String(a.result)})},a.readAsDataURL(i)}onCharScanFile(e){var s;const t=e.target,i=(s=t.files)==null?void 0:s[0];if(t.value="",!i||!this.charDraft||this.scanBusy)return;const a=new FileReader;a.onload=()=>void this.scanCharImage(String(a.result)),a.readAsDataURL(i)}async scanCharImage(e){if(!(!this.charDraft||this.scanBusy)){this.scanBusy=!0;try{const i=(await u.scanImage(e)).tags.filter(p=>p.category!=="rating").map(p=>p.tag.replace(/_/g," ").trim()).filter(Boolean),a=this.charDraft;if(!a)return;const s=a.prompt.trim(),r=new Set(s.split(",").map(p=>p.trim().toLowerCase()).filter(Boolean)),l=i.filter(p=>!r.has(p.toLowerCase()));if(!l.length){this.showToast("No new tags found");return}const n=s?`${s}, ${l.join(", ")}`:l.join(", ");this.charDraft={...a,prompt:n},this.showToast(`Added ${l.length} tag${l.length===1?"":"s"}`)}catch(t){this.showToast(t.message)}finally{this.scanBusy=!1}}}async saveCharacter(){const e=this.charDraft;if(!(!e||!e.name.trim()||this.charBusy)){this.charBusy=!0;try{await u.saveCharacter({id:e.id,name:e.name.trim(),prompt:e.prompt,negativePrompt:e.negativePrompt,imageData:e.imageData}),this.charDraft=null,this.bumpThumbs(),await this.loadCharacters(),this.showToast("Character saved")}catch(t){this.showToast(t.message)}finally{this.charBusy=!1}}}async deleteCharacter(){const e=this.charDraft;if(!(!(e!=null&&e.id)||this.charBusy)&&confirm(`Delete “${e.name}” from the character library?`)){this.charBusy=!0;try{await u.deleteCharacter(e.id);const t=ne("libraryDelete");M(t.message,"success",{emotion:t.emotion,intensity:t.intensity}),this.charDraft=null,await this.loadCharacters(),this.showToast("Character deleted")}catch(t){this.showToast(t.message)}finally{this.charBusy=!1}}}showToast(e){this.toast=e,setTimeout(()=>this.toast="",2600)}render(){var e;return o`<div class="wrap">
        ${this.restoredNotice?this.renderRestoredNotice():c}
        ${this.renderBody()}
      </div>
      ${this.charDraft?this.renderCharEditor(this.charDraft):c}
      ${this.poseDraft?this.renderPoseEditor(this.poseDraft):c}
      ${this.wildcardDraft?this.renderWildcardEditor(this.wildcardDraft):c}
      ${this.metaDraft?this.renderMetaEditor(this.metaDraft):c}
      ${this.expandedShot?this.renderLightbox(this.expandedShot):c}
      ${this.renderCutoutDialog()}
      ${this.trainOpen?o`<oppai-lora-train .models=${((e=this.status)==null?void 0:e.models)??[]} .checkpoint=${this.checkpoint}
            @close=${()=>this.trainOpen=!1}
            @trained=${t=>{this.showToast(`${t.detail.name} is trained and installed`),this.loadStatus()}}></oppai-lora-train>`:c}
      ${this.toast?o`<div class="toast">${this.toast}</div>`:c}`}renderRestoredNotice(){return o`
      <div class="restored">
        <span class="material-symbols-rounded" style="font-size:18px;">history</span>
        <span class="grow">Picked up where you left off.</span>
        <button class="act" @click=${()=>this.restoredNotice=!1}>Keep it</button>
        <button class="act" @click=${this.startFresh}>Start fresh</button>
      </div>
    `}renderLightbox(e){var s;const t=this.shots.find(r=>r.id===e.id)??e,i=!t.id.startsWith("wip-"),a="This square was restored from the wardrobe — regenerate it to save it elsewhere.";return o`
      <div class="lightbox" @click=${r=>{r.target===r.currentTarget&&(this.expandedShot=null)}}>
        <img src=${this.previewURL(t)} alt="Generated image"
          @contextmenu=${r=>this.openShotMenu(t,r)} />
        <div class="row">
          <button class="btn primary" ?disabled=${t.saved||!i}
            title=${i?"Keep this image in the library":a}
            @click=${()=>this.save(t)}>
            <span class="material-symbols-rounded" style="font-size:17px;">${t.saved?"check":"save"}</span>
            ${t.saved?"Saved":"Save to library"}
          </button>
          ${((s=this.status)==null?void 0:s.backend)==="invokeai"?o`<button class="btn" ?disabled=${!i}
            title=${i?"Set as this model's preview in InvokeAI":a}
            @click=${()=>this.useAsModelThumb(t)}>
            <span class="material-symbols-rounded" style="font-size:17px;">photo_camera</span> Sync model preview
          </button>`:c}
          <button class="btn" @click=${()=>void this.exportShot(t)}>
            <span class="material-symbols-rounded" style="font-size:17px;">download</span> Export for Civitai
          </button>
          <button class="btn" @click=${()=>this.expandedShot=null}>
            <span class="material-symbols-rounded" style="font-size:17px;">close</span> Close
          </button>
        </div>
      </div>
    `}renderMetaEditor(e){var a,s,r,l;const t=e.defaults??{},i=e.type==="lora";return o`
      <div class="overlay" @click=${n=>{n.target===n.currentTarget&&(this.metaDraft=null)}}>
        <div class="dialog">
          <h3>Edit ${i?"LoRA":"model"} — saved on ${((a=this.status)==null?void 0:a.backend)==="invokeai"?"InvokeAI":"Automatic1111"}</h3>
          <div>
            <label class="field">Name</label>
            <!-- Automatic1111 names a model by its file, so the name is not edited there. -->
            <input type="text" .value=${e.name} ?readonly=${((s=this.status)==null?void 0:s.backend)!=="invokeai"}
              title=${((r=this.status)==null?void 0:r.backend)!=="invokeai"?"Automatic1111 names a model by its file":""}
              @input=${n=>this.metaDraft={...e,name:n.target.value}} />
          </div>
          <div>
            <label class="field">Description</label>
            <textarea .value=${e.description??""}
              @input=${n=>this.metaDraft={...e,description:n.target.value}}></textarea>
          </div>
          <div>
            <label class="field">Trigger phrases (comma-separated)</label>
            <input type="text" .value=${this.metaTriggerText} placeholder="my-style, detailed face"
              @input=${n=>this.metaTriggerText=n.target.value} />
          </div>
          ${i?o`<div class="meta-grid">
                <div class="full">
                  <label class="field">Recommended weight</label>
                  <input class="num" type="number" min="-2" max="2" step="0.05"
                    .value=${String(t.weight??"")} placeholder="1"
                    @input=${n=>this.setMetaDefaults({weight:Number(n.target.value)||0})} />
                </div>
                <div>
                  <label class="field">Works from</label>
                  <input class="num" type="number" min="-5" max="5" step="0.05" .value=${String(t.weightMin||"")}
                    @input=${n=>this.setMetaDefaults({weightMin:Number(n.target.value)||0})} />
                </div>
                <div>
                  <label class="field">to</label>
                  <input class="num" type="number" min="-5" max="5" step="0.05" .value=${String(t.weightMax||"")}
                    @input=${n=>this.setMetaDefaults({weightMax:Number(n.target.value)||0})} />
                </div>
                <div class="full">
                  <label class="field">Negative prompt while it's on</label>
                  <textarea rows="2" .value=${t.negative??""} placeholder="3d, realistic"
                    @input=${n=>this.setMetaDefaults({negative:n.target.value})}></textarea>
                </div>
              </div>`:o`
                <div>
                  <label class="field">Recommended positive (put at the front of the prompt)</label>
                  <textarea rows="2" .value=${t.positive??""} placeholder="masterpiece, best quality"
                    @input=${n=>this.setMetaDefaults({positive:n.target.value})}></textarea>
                </div>
                <div>
                  <label class="field">Recommended negative</label>
                  <textarea rows="2" .value=${t.negative??""} placeholder="lowres, worst quality"
                    @input=${n=>this.setMetaDefaults({negative:n.target.value})}></textarea>
                </div>
                <div class="meta-grid">
                  <div>
                    <label class="field">Steps</label>
                    <input class="num" type="number" min="1" max="80" .value=${String(t.steps??"")}
                      @input=${n=>this.setMetaDefaults({steps:Number(n.target.value)||0})} />
                  </div>
                  <div>
                    <label class="field">CFG scale</label>
                    <input class="num" type="number" min="1" max="30" step="0.5" .value=${String(t.cfgScale??"")}
                      @input=${n=>this.setMetaDefaults({cfgScale:Number(n.target.value)||0})} />
                  </div>
                  <div>
                    <label class="field">CFG rescale</label>
                    <input class="num" type="number" min="0" max="0.99" step="0.05"
                      .value=${String(t.cfgRescale??"")}
                      @input=${n=>this.setMetaDefaults({cfgRescale:Number(n.target.value)||0})} />
                  </div>
                  <div>
                    <label class="field">Width</label>
                    <input class="num" type="number" min="64" max="2048" step="8" .value=${String(t.width??"")}
                      @input=${n=>this.setMetaDefaults({width:Number(n.target.value)||0})} />
                  </div>
                  <div>
                    <label class="field">Height</label>
                    <input class="num" type="number" min="64" max="2048" step="8" .value=${String(t.height??"")}
                      @input=${n=>this.setMetaDefaults({height:Number(n.target.value)||0})} />
                  </div>
                  <div class="full">
                    <label class="field">Clip skip</label>
                    <input class="num" type="number" min="0" max="12" .value=${String(t.clipSkip||"")} placeholder="Model's own"
                      @input=${n=>this.setMetaDefaults({clipSkip:Number(n.target.value)||0})} />
                  </div>
                  <div class="full">
                    <label class="field">Scheduler</label>
                    <select class="num" .value=${t.scheduler??""}
                      @change=${n=>this.setMetaDefaults({scheduler:n.target.value})}>
                      <option value="">No preference</option>
                      ${["euler_a","euler","dpmpp_2m","dpmpp_2m_k","dpmpp_2m_sde_k","dpmpp_sde_k","unipc"].map(n=>o`<option value=${n} ?selected=${n===t.scheduler}>${n}</option>`)}
                    </select>
                  </div>
                  <div class="full">
                    <label class="field">Default VAE</label>
                    <select class="num" .value=${t.vae??""}
                      @change=${n=>this.setMetaDefaults({vae:n.target.value})}>
                      <option value="">Model's own</option>
                      ${(((l=this.status)==null?void 0:l.vaes)??[]).map(n=>o`<option value=${n.key} ?selected=${n.key===t.vae}>${n.name}</option>`)}
                    </select>
                  </div>
                  <div class="full">
                    <label class="field">VAE precision</label>
                    <select class="num" .value=${t.vaePrecision??""}
                      @change=${n=>this.setMetaDefaults({vaePrecision:n.target.value})}>
                      <option value="">No preference</option>
                      <option value="fp32">fp32</option>
                      <option value="fp16">fp16</option>
                    </select>
                  </div>
                </div>
              `}
          <div class="dialog-actions">
            <button class="btn danger" ?disabled=${this.metaBusy} title="Remove from the generator, file included"
              @click=${()=>this.deleteMetaModel()}>Delete</button>
            <button class="btn" ?disabled=${this.metaBusy}
              title="Fill in the trigger words, prompts and settings the model's Civitai page recommends"
              @click=${()=>this.importCivitaiDefaults()}>
              <span class="material-symbols-rounded" style="font-size:17px;">download</span> Import from Civitai
            </button>
            <button class="btn" @click=${()=>this.metaDraft=null}>Cancel</button>
            <button class="btn primary" ?disabled=${this.metaBusy||!e.name.trim()} @click=${()=>this.saveMeta()}>
              Save
            </button>
          </div>
        </div>
      </div>
    `}renderBody(){var r,l,n;const e=this.status;if(e===null)return o`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`;if(!e.enabled)return o`<div class="empty">
        <span class="material-symbols-rounded">auto_awesome</span>
        <div style="font-size:15px; margin-bottom:6px;">Image generation isn't set up yet.</div>
        <div style="font-size:13px;">
          Add the URL of your local InvokeAI or Automatic1111 / SD.Next server under
          <strong>Settings → Image generation</strong>, then come back here.
        </div>
      </div>`;if(!e.reachable)return o`<div class="empty">
        <span class="material-symbols-rounded">cloud_off</span>
        <div style="font-size:15px; margin-bottom:6px;">Can't reach the image generator.</div>
        <div style="font-size:13px; margin-bottom:14px;">${e.error??"It didn't answer."}</div>
        <button class="chip" @click=${()=>this.loadStatus()}>Retry</button>
      </div>`;const t=e.backend==="invokeai",i=(e.models??[]).find(p=>p.title===this.checkpoint),a=(i==null?void 0:i.model_name)||this.checkpoint||"Choose a model";if(this.studio)return this.renderStudio(e,t,a);const s=this.createTab;return o`
      <div class="workspace create">
        <div class="create-shell ${s?"drawer-open":""} ${t?"with-gallery":""}">
          ${this.renderCreateRail()}
          ${s?o`<div class="drawer-scrim" @click=${()=>this.createTab=""}></div>
                <aside class="create-drawer" aria-label=${((r=Be.find(p=>p.id===s))==null?void 0:r.label)??""}>
                  ${this.renderCreateDrawer(e,t)}
                </aside>`:c}
          <section class="create-stage">
            ${this.renderRecipeStrip(e,t)}
            <div class="canvas-stage">
              ${this.renderResults()}
              ${this.error?o`<div class="banner">${this.error}</div>`:c}
              ${this.generating?this.renderGenerating(t):c}
            </div>
            <div class="prompt-dock">${this.renderPrompt()}</div>
          </section>
          ${t?o`<aside class="right create-gallery">
                <oppai-invoke-gallery workspace
                  @boards-changed=${()=>this.loadStatus()}
                  @board-changed=${p=>this.board=p.detail.board}
                  @cut-out=${p=>void this.openCutout(p.detail.url,p.detail.name)}
                  @reuse-generation=${p=>this.reuseGenInfo(p.detail)}
                ></oppai-invoke-gallery>
              </aside>`:c}
        </div>
      </div>
      ${this.civitaiOpen?o`<oppai-civitai backend=${((l=this.status)==null?void 0:l.backend)??"invokeai"} .canManage=${!!((n=this.status)!=null&&n.manageModels)}
            .manageNote=${it(this.status)}
            @close=${()=>this.onCivitaiClose()}
            @use-prompt=${p=>this.onCivitaiPrompt(p.detail)}></oppai-civitai>`:c}
    `}openCreateTab(e,t=!1){const i=t&&this.createTab===e?"":e;i!==this.createTab&&(this.pickerFilter=""),this.createTab=i}renderCreateRail(){const e={loras:Object.keys(this.selectedLoras).length,look:this.selectedChars.length+this.selectedPoses.length,templates:this.templateId?1:0};return o`<nav class="create-rail" aria-label="Generation setup">
      ${Be.map(t=>o`<button class="rail-tab ${this.createTab===t.id?"on":""}"
          aria-pressed=${this.createTab===t.id?"true":"false"} title=${t.label}
          @click=${()=>this.openCreateTab(t.id,!0)}>
          <span class="material-symbols-rounded rail-icon">${t.icon}</span>
          <span class="rail-label">${t.label}</span>
          ${e[t.id]?o`<span class="rail-badge">${e[t.id]}</span>`:c}
        </button>`)}
    </nav>`}renderPickerSearch(e){return o`<label class="picker-search">
      <span class="material-symbols-rounded">search</span>
      <input type="search" .value=${this.pickerFilter} placeholder=${e} aria-label=${e}
        @input=${t=>this.pickerFilter=t.target.value} />
    </label>`}renderManageNote(e,t){const i=t?"":it(e);return i?o`<div class="manage-note">
      <span class="material-symbols-rounded">info</span>
      <span>${i}</span>
    </div>`:c}renderCreateDrawer(e,t){const i=this.createTab,a=Be.find(r=>r.id===i);this.flatSections=!0;let s=c;try{switch(i){case"models":s=o`${this.renderPickerSearch("Search models")}
            ${this.renderModelSection(e.models??[])}
            ${this.renderManageNote(e,t)}`;break;case"loras":s=o`${this.renderPickerSearch("Search LoRAs")}
            ${this.renderLoraSection(e.loras??[],e.loraError)}`;break;case"look":s=o`<div class="pane-title">Characters</div>${this.renderCharacterSection()}
            <div class="pane-title">Poses</div>${this.renderPoseSection()}`;break;case"wildcards":s=this.renderWildcardSection();break;case"templates":s=this.renderTemplateSection(e.templates??[]);break;case"settings":s=o`<div class="pane-title">Size</div><div class="pane">${this.renderPromptOptions()}</div>
            <div class="pane-title">Sampling</div>${this.renderSettingsSection(t,e.boards??[])}
            <div class="pane-title">VAE</div>${this.renderVaeSection(e.vaes??[])}`;break}}finally{this.flatSections=!1}return o`
      <div class="drawer-head">
        <span class="material-symbols-rounded">${a.icon}</span>
        ${a.label}
        <span class="toolbar-spacer"></span>
        ${i==="loras"?o`<button class="drawer-action" title="Train a LoRA on your own pictures" @click=${()=>this.trainOpen=!0}>
              <span class="material-symbols-rounded">model_training</span>
            </button>`:c}
        ${i==="models"||i==="loras"?o`<button class="drawer-action" title="Find more on Civitai" @click=${()=>this.civitaiOpen=!0}>
              <span class="material-symbols-rounded">travel_explore</span>
            </button>`:c}
        <button class="drawer-action" title="Close" aria-label="Close" @click=${()=>this.createTab=""}>
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
      <div class="drawer-scroll">${s}</div>
    `}renderRecipeStrip(e,t){const i=(e.models??[]).find(r=>r.title===this.checkpoint),a=(e.loras??[]).filter(r=>r.name in this.selectedLoras),s=i?`${u.modelThumbURL(i.title)}&v=${this.thumbVersion}`:"";return o`<div class="recipe">
      <button class="recipe-model" title=${(i==null?void 0:i.title)??"Choose a model"} @click=${()=>this.openCreateTab("models")}>
        ${s&&!this.failedThumbs.has(s)?o`<img src=${s} alt="" @error=${()=>this.failedThumbs=new Set(this.failedThumbs).add(s)} />`:o`<span class="recipe-model-icon"><span class="material-symbols-rounded">deployed_code</span></span>`}
        <span class="recipe-model-text">
          <span class="recipe-kicker"><span class="status-dot"></span>${t?"InvokeAI":"Automatic1111"}${i!=null&&i.base?o` · ${i.base}`:c}</span>
          <span class="recipe-model-name">${(i==null?void 0:i.model_name)||this.checkpoint||"Choose a model"}</span>
        </span>
        <span class="material-symbols-rounded recipe-caret">expand_more</span>
      </button>
      <div class="recipe-chips">
        ${a.map(r=>o`<span class="recipe-chip lora">
          <button class="recipe-chip-main" title="Change the weight in the LoRAs drawer" @click=${()=>this.openCreateTab("loras")}>
            <span class="material-symbols-rounded">style</span>${r.alias||r.name}<b>${this.selectedLoras[r.name]}</b>
          </button>
          <button class="recipe-chip-x" title="Take this LoRA off" aria-label=${`Remove ${r.alias||r.name}`} @click=${()=>this.toggleLora(r.name)}>
            <span class="material-symbols-rounded">close</span>
          </button>
        </span>`)}
        ${a.length?c:o`<button class="recipe-chip add" @click=${()=>this.openCreateTab("loras")}>
          <span class="material-symbols-rounded">add</span>LoRA
        </button>`}
        <button class="recipe-chip" title="Output size" @click=${()=>this.openCreateTab("settings")}>
          <span class="material-symbols-rounded">aspect_ratio</span>${this.width}×${this.height}
        </button>
        <button class="recipe-chip" title="Sampling settings" @click=${()=>this.openCreateTab("settings")}>
          <span class="material-symbols-rounded">tune</span>${this.steps} steps · CFG ${this.cfg}
        </button>
        <button class="recipe-chip ${this.seed>=0?"on":""}"
          title=${this.seed<0?"A new seed every time — click to keep the last picture's":"This seed is kept — click to go back to random"}
          @click=${()=>this.toggleSeedLock()}>
          <span class="material-symbols-rounded">${this.seed<0?"casino":"lock"}</span>${this.seed<0?"Random seed":this.seed}
        </button>
      </div>
      ${this.shots.length?o`<button class="recipe-ghost" title="Clear the canvas" @click=${()=>this.clearWorkspace()}>
        <span class="material-symbols-rounded">delete_sweep</span>
      </button>`:c}
      ${e.civitai?o`<button class="recipe-civitai" @click=${()=>this.civitaiOpen=!0}>
        <span class="material-symbols-rounded">travel_explore</span><span>Civitai</span>
      </button>`:c}
      <button class="recipe-civitai" title="Train a LoRA on your own pictures" @click=${()=>this.trainOpen=!0}>
        <span class="material-symbols-rounded">model_training</span><span>Train</span>
      </button>
    </div>`}toggleSeedLock(){var t;if(this.seed>=0){this.seed=-1;return}const e=(t=this.shots[0])==null?void 0:t.seed;if(e===void 0||e<0){this.showToast("Generate a picture first — its seed is the one kept");return}this.seed=e}renderStudio(e,t,i){const a=this.wardrobes.find(s=>s.id===this.outfitWardrobeId);return o`
      <div class="workspace">
        <div class="workspace-bar">
          <div class="workspace-tab">
            <span class="material-symbols-rounded" style="font-size:18px;">checkroom</span>
            Outfit studio
          </div>
          <div class="studio-views" role="tablist">
            <button class="studio-view ${this.studioView==="build"?"on":""}" role="tab" aria-selected=${this.studioView==="build"?"true":"false"}
              @click=${()=>this.studioView="build"}>
              <span class="material-symbols-rounded" style="font-size:16px;">grid_view</span>
              Build${a?o` <span class="studio-view-sub">· ${a.name}</span>`:c}
            </button>
            <button class="studio-view ${this.studioView==="wardrobe"?"on":""}" role="tab" aria-selected=${this.studioView==="wardrobe"?"true":"false"}
              @click=${()=>{var s;this.studioView="wardrobe",(s=this.renderRoot.querySelector("oppai-outfit-wardrobe"))==null||s.refresh()}}>
              <span class="material-symbols-rounded" style="font-size:16px;">styler</span>
              Wardrobe &amp; rooms
            </button>
          </div>
          <div class="workspace-context">
            <div class="backend-pill" title="Connected generation backend">
              <span class="status-dot"></span>
              ${t?"InvokeAI":"A1111 / SD.Next"}
            </div>
            <div class="model-pill" title=${i}>
              <span class="material-symbols-rounded" style="font-size:15px;">deployed_code</span>
              <span>${i}</span>
            </div>
          </div>
        </div>
        ${this.studioView==="wardrobe"?o`<div class="studio-wardrobe">
              <oppai-outfit-wardrobe
                @edit-slot=${s=>void this.editWardrobeSlot(s.detail.outfitId,s.detail.slot,s.detail.level)}
                @build-outfit=${s=>{this.outfitWardrobeId=s.detail.outfitId,this.persistDraft(),this.studioView="build",this.loadWipBoard(s.detail.outfitId)}}
              ></oppai-outfit-wardrobe>
            </div>`:o`<div class="layout studio">
              <aside class="side">
                <div class="panel-heading">
                  <span class="material-symbols-rounded" style="font-size:16px;">checkroom</span>
                  The recipe
                </div>
                <div class="panel-scroll">
                  ${this.renderDressSection()}
                  ${this.renderLookSection()}
                  ${this.renderLoadoutSection()}
                  ${this.renderPromptExtrasSection()}
                  <div class="side-divider"><span>Generator</span></div>
                  ${this.renderModelSection(e.models??[])}
                  ${this.renderLoraSection(e.loras??[],e.loraError)}
                  ${this.renderVaeSection(e.vaes??[])}
                  ${this.renderSettingsSection(t,e.boards??[])}
                  ${this.renderTemplateSection(e.templates??[])}
                  ${this.renderCharacterSection()}
                </div>
              </aside>
              <section class="workbench">
                ${this.renderStudioToolbar()}
                <div class="canvas-stage sheet">
                  ${this.renderStudioSheet()}
                  ${this.error?o`<div class="banner">${this.error}</div>`:c}
                </div>
                ${this.renderBatchBar()}
              </section>
              <aside class="right studio-focus">${this.renderFocusPanel()}</aside>
            </div>`}
      </div>
    `}renderStudioToolbar(){const e=this.currentOutfitShots(),t=e.filter(a=>{var s;return(((s=a.outfitSlot)==null?void 0:s.index)??0)<X}).length,i=e.length-t;return o`<div class="canvas-toolbar studio-toolbar">
      <label class="wardrobe-pick" title="Every square is saved into this wardrobe as it is generated">
        <span class="material-symbols-rounded" style="font-size:16px;">inventory_2</span>
        <select ?disabled=${this.outfitBatchRunning}
          @change=${a=>{this.outfitWardrobeId=a.target.value,this.persistDraft(),this.loadWipBoard(this.outfitWardrobeId)}}>
          <!-- Selected per option rather than .value on the select: the list arrives
               after the first render, and a value that has not changed is not re-applied. -->
          <option value="" ?selected=${!this.outfitWardrobeId}>New wardrobe on first square</option>
          ${this.wardrobes.map(a=>o`<option value=${a.id} ?selected=${a.id===this.outfitWardrobeId}>${a.name}</option>`)}
        </select>
      </label>
      <button class="toolbar-clear" title="Start a new wardrobe" ?disabled=${this.outfitBatchRunning} @click=${()=>void this.createWardrobe()}>
        <span class="material-symbols-rounded" style="font-size:15px;">add</span>
      </button>
      <div class="sheet-tabs" role="tablist">
        <button class="sheet-tab ${this.sheetTab==="faces"?"on":""}" role="tab" @click=${()=>this.sheetTab="faces"}>
          Expressions <span class="sheet-tab-count">${t}/${X}</span>
        </button>
        <button class="sheet-tab ${this.sheetTab==="misc"?"on":""}" role="tab" @click=${()=>this.sheetTab="misc"}>
          Misc <span class="sheet-tab-count">${i}/${oe}</span>
        </button>
      </div>
      <span class="toolbar-spacer"></span>
      <div class="zoom-tabs" title="Square size">
        ${ft.map((a,s)=>o`<button class="zoom-tab ${this.sheetZoom===s?"on":""}"
          title=${["Fit the row to the screen","Medium squares","Large squares"][s]}
          @click=${()=>{this.sheetZoom=s,this.persistDraft()}}>${["Fit","M","L"][s]}</button>`)}
      </div>
    </div>`}renderStudioSheet(){if(!this.outfitOn)return o`<div class="canvas-empty">
        <span class="material-symbols-rounded">checkroom</span>
        <strong>Outfit terms are switched off</strong>
        <span>Turn them back on in the recipe to build a wardrobe.</span>
      </div>`;const e=ft[this.sheetZoom],t=e?`--cell:${e}px`:"";return this.sheetTab==="misc"?this.renderMiscGrid(t):this.renderFaceMatrix(t,!e)}renderFaceMatrix(e,t){const i=N(this.outfitSlot().slot);return o`<div class="face-matrix ${t?"fit":""}" style=${e}>
      <div class="matrix-corner"></div>
      ${O.map(a=>o`<div class="matrix-col-head" title=${a.face}>${a.label}</div>`)}
      ${U.map((a,s)=>{const r=O.map((n,p)=>this.outfitSlot(s,p,"").slot),l=r.filter(n=>this.shotAt(n)).length;return o`
          <div class="matrix-row-head">
            <span class="material-symbols-rounded" style="font-size:14px;">local_fire_department</span>
            <span class="matrix-row-name">${a.label}</span>
            <span class="matrix-row-count">${l}/${r.length}</span>
          </div>
          ${r.map(n=>this.renderSheetCell(n,N(n)===i,this.sheetTab==="faces"&&!this.outfitMisc))}
        `})}
    </div>`}renderMiscGrid(e){const t=N(this.outfitSlot().slot),i=(a,s,r)=>o`
      <section class="sheet-tier misc">
        <header class="sheet-tier-head">
          <span class="material-symbols-rounded" style="font-size:15px;">interests</span>
          ${a}
          <span class="tier-count">${r.filter(l=>this.shotAt(this.outfitSlot(0,0,l.id).slot)).length}/${r.length} generated</span>
        </header>
        <p class="sheet-note">${s}</p>
        <div class="sheet-grid" style=${e}>
          ${r.map(l=>{const n=this.outfitSlot(0,0,l.id).slot;return this.renderSheetCell(n,N(n)===t,!!this.outfitMisc)})}
        </div>
      </section>`;return o`<div class="outfit-sheet" style=${e}>
      ${i("Around the place","One picture per state, whatever the heat — a state with no square falls back to her expression. Typing is shown while she writes to you.",E.filter(a=>!a.intimate))}
      ${i("With them","Drawn at their own heat. She can only put herself into these once a conversation has got there.",E.filter(a=>a.intimate))}
    </div>`}renderSheetCell(e,t,i){const a=this.shotAt(e),s=a?!this.shotMatchesCurrentOutfit(a):!1,r=e.tier===0&&e.tierLabel==="Misc"?e.emotionLabel:`${e.tierLabel} · ${e.emotionLabel}`;return o`<button
      class="sheet-cell ${t?"current":""} ${a?"":"empty"}"
      title=${a?`${r}${s?" — older recipe":a.cutoutReviewed?" — reviewed":" — needs a cutout review"}`:`${r} — not generated yet`}
      @click=${()=>this.selectOutfitSlot(e.index)}
      @dblclick=${()=>{this.selectOutfitSlot(e.index),this.generateOutfitAndNext()}}
    >
      ${a?o`<img class="art" src=${this.previewURL(a)} alt=${r} loading="lazy" />`:o`<span class="art-empty"><span class="material-symbols-rounded">add_photo_alternate</span></span>`}
      <span class="cell-foot">
        <span class="cell-name">${e.tierLabel==="Misc",e.emotionLabel}</span>
        ${a?o`<span class="cell-state ${s?"stale":a.cutoutReviewed?"ready":"needs"}"></span>`:c}
      </span>
    </button>`}squareStatus(e){return e?this.shotMatchesCurrentOutfit(e)?e.cutoutReviewed?{label:"Reviewed and filed — she can wear it",tone:"ready"}:{label:"Generated — the cutout needs a look",tone:"needs"}:{label:"Generated with an older recipe",tone:"stale"}:{label:"Not generated yet",tone:"none"}}renderFocusPanel(){var h;const{slot:e}=this.outfitSlot(),t=this.shotAt(e),i=this.squareStatus(t),a=e.tierLabel==="Misc",s=a?E.find(f=>f.id===e.emotion):void 0,r=a?void 0:O[this.outfitFace],{prompt:l,negative:n}=this.assemblePrompts(),p=this.generating;return o`
      <div class="panel-heading">
        <span class="material-symbols-rounded" style="font-size:16px;">crop_square</span>
        Selected square
      </div>
      <div class="panel-scroll focus-scroll">
        <div class="focus-art">
          ${t?o`<img src=${this.previewURL(t)} alt=${e.emotionLabel} style="cursor:zoom-in" title="Expand"
                @click=${()=>this.expandedShot=t} @contextmenu=${f=>this.openShotMenu(t,f)} />`:o`<span class="focus-empty"><span class="material-symbols-rounded">add_photo_alternate</span>Nothing here yet</span>`}
        </div>
        <div class="focus-title">
          <strong>${a?e.emotionLabel:`${e.tierLabel} · ${e.emotionLabel}`}</strong>
          <span class="focus-status ${i.tone}">${i.label}</span>
        </div>
        <div class="sec-note">${s?`${s.face}; ${s.pose}.`:r?`${r.face}; ${r.pose}.`:c}</div>
        <div class="focus-actions">
          <button class="btn primary" ?disabled=${p||!this.outfitOn||!l.trim()} @click=${()=>void this.generateOutfitAndNext()}>
            <span class="material-symbols-rounded" style="font-size:17px;">${t?"refresh":"auto_awesome"}</span>
            ${t?"Redo, then next":"Generate, then next"}
          </button>
          <button class="btn" ?disabled=${p||!this.outfitOn||!l.trim()} @click=${()=>void this.generate()}>
            <span class="material-symbols-rounded" style="font-size:17px;">${t?"replay":"add"}</span>
            ${t?"Redo, stay here":"Generate this one"}
          </button>
          <button class="btn" ?disabled=${!t||p}
            @click=${()=>{t&&this.openCutout(this.previewURL(t),`seed-${t.seed}`,t.outfitFilename,t.id)}}>
            <span class="material-symbols-rounded" style="font-size:17px;">background_replace</span>
            ${t!=null&&t.cutoutReviewed?"Adjust the cutout":"Review the cutout"}
          </button>
          <label class="btn ${p?"disabled":""}" title="Use a picture of your own for this square">
            <span class="material-symbols-rounded" style="font-size:17px;">upload</span>
            ${t?"Replace with my own image":"Use my own image"}
            <input type="file" accept="image/*" style="display:none;" ?disabled=${p}
              @change=${f=>{var y;const b=f.target;this.uploadSquare((y=b.files)==null?void 0:y[0]),b.value=""}} />
          </label>
          <button class="btn" ?disabled=${!t||p} title="Just this square, as a PNG under its wardrobe filename"
            @click=${()=>{t&&this.exportOutfitSquare(t)}}>
            <span class="material-symbols-rounded" style="font-size:17px;">download</span>
            Export this square
          </button>
          <button class="btn danger" ?disabled=${!t||p} @click=${()=>{t&&this.deleteOutfitSquare(t)}}>
            <span class="material-symbols-rounded" style="font-size:17px;">delete</span>
            Delete this square
          </button>
        </div>
        ${t?o`<div class="focus-meta">
          <span title="Seed"><span class="material-symbols-rounded" style="font-size:14px;">casino</span>${t.seed}</span>
          ${(h=t.info)!=null&&h.model?o`<span title="Model"><span class="material-symbols-rounded" style="font-size:14px;">deployed_code</span>${t.info.model}</span>`:c}
          <button class="link-btn" ?disabled=${!t.info} @click=${()=>void this.copyGenInfo(t,"text")}>Copy generation data</button>
          ${this.outfitLoadoutId?o`<button class="link-btn" ?disabled=${this.loadoutBusy} @click=${()=>void this.setLoadoutCoverFromSelection()}>Use as loadout cover</button>`:c}
        </div>`:c}
        <button class="adv-toggle" @click=${()=>this.showSquarePrompt=!this.showSquarePrompt}>
          <span class="material-symbols-rounded" style="font-size:17px;">${this.showSquarePrompt?"expand_less":"code"}</span>
          ${this.showSquarePrompt?"Hide the prompt":"The prompt this square gets"}
        </button>
        ${this.showSquarePrompt?o`<div class="focus-prompt">
          <span class="focus-tag">Positive</span>
          <pre>${l}</pre>
          <span class="focus-tag negative">Negative</span>
          <pre>${n}</pre>
          <div class="sec-note">Exposure is rolled fresh for every generation, so the undress clauses change between takes.</div>
        </div>`:c}
      </div>
    `}renderBatchBar(){const e=this.currentOutfitShots(),t=e.filter(h=>{var f;return(((f=h.outfitSlot)==null?void 0:f.index)??0)<X}).length,i=e.length-t,a=e.filter(h=>h.cutoutReviewed).length,s=this.staleShots().length,r=X+(this.outfitMiscBatch?oe:0),l=t+(this.outfitMiscBatch?i:0),n=Math.max(0,r-l),p=!this.generating&&this.outfitOn&&!!this.assemblePrompts().prompt.trim();return o`<div class="batch-bar">
      <div class="batch-progress" title=${`${a} of ${e.length} generated squares reviewed`}>
        <div class="batch-track">
          <div class="batch-fill reviewed" style=${`width:${r?Math.min(100,a/r*100):0}%`}></div>
          <div class="batch-fill made" style=${`width:${r?Math.min(100,l/r*100):0}%`}></div>
        </div>
        <span class="batch-count">${t}/${X} expressions · ${i}/${oe} misc · ${a} reviewed${s?o` · <em>${s} on an older recipe</em>`:c}</span>
      </div>
      <label class="switch compact" title="Whether Generate missing also renders the Misc states">
        <input type="checkbox" .checked=${this.outfitMiscBatch} ?disabled=${this.outfitBatchRunning}
          @change=${h=>{this.outfitMiscBatch=h.target.checked,this.persistDraft()}} />
        Include Misc
      </label>
      ${this.outfitBatchRunning?o`<button class="btn" @click=${()=>this.cancelOutfitBatch()}>
            <span class="material-symbols-rounded" style="font-size:17px;">stop_circle</span>
            Stop after this one
          </button>`:o`<button class="btn primary" ?disabled=${!p||!n} @click=${()=>void this.generateAllOutfit()}>
            <span class="material-symbols-rounded" style="font-size:17px;">auto_awesome</span>
            Generate ${n} missing
          </button>
          ${s?o`<button class="btn" ?disabled=${!p} @click=${()=>void this.regenerateStale()}>
            <span class="material-symbols-rounded" style="font-size:17px;">history</span>
            Redo ${s} stale
          </button>`:c}`}
      <button class="btn" ?disabled=${this.generating||this.outfitExporting||!e.length||a!==e.length}
        title=${a!==e.length?"Review every cutout first":"Every square, correctly named, in one ZIP"}
        @click=${()=>void this.exportOutfitZip()}>
        <span class="material-symbols-rounded" style="font-size:17px;">folder_zip</span>
        ${this.outfitExporting?"Building ZIP…":"Export ZIP"}
      </button>
      ${this.outfitProgress?o`<span class="batch-note">${this.outfitProgress}</span>`:c}
    </div>`}async uploadSquare(e){if(!e||!e.type.startsWith("image/")||this.generating)return;const{slot:t,filename:i}=this.outfitSlot();try{const a=await new Promise((p,h)=>{const f=new FileReader;f.onload=()=>p(String(f.result)),f.onerror=()=>h(new Error("couldn't read that file")),f.readAsDataURL(e)}),s=await this.ensureWardrobe();await u.putLibbyOutfitWip(s,t.emotion,t.tier,{imageData:a,filename:i,seed:-1,reviewed:!1,config:this.outfitConfigKey()});const r=this.shotAt(t);r&&!r.id.startsWith("wip-")&&await u.deleteGenPreview(r.id).catch(()=>{});const l=N(t),n={id:`wip-${s}-${t.emotion}-${t.tier}`,seed:-1,saved:!1,outfitFilename:i,outfitSlot:t,outfitConfig:this.outfitConfigKey(),cutoutReviewed:!1,previewVersion:Date.now(),wipOutfitId:s};this.shots=[...this.shots.filter(p=>!p.outfitSlot||N(p.outfitSlot)!==l),n],this.persistDraft(),this.openCutout(this.previewURL(n),e.name,i,n.id)}catch(a){this.showToast(`Couldn't use that image: ${a.message}`)}}async editWardrobeSlot(e,t,i){const a=O.findIndex(p=>p.id===t),s=E.some(p=>p.id===t)?t:"";if(a<0&&!s)return;this.outfitWardrobeId!==e&&(this.outfitWardrobeId=e,this.persistDraft(),await this.loadWipBoard(e)),this.outfitOn=!0;const{slot:r,filename:l}=this.outfitSlot(s?0:i,Math.max(0,a),s);this.selectOutfitSlot(r.index),this.studioView="build";let n=this.shotAt(r);if(!n)try{const p=await fetch(u.libbyEmotionURL(e,t,i,Date.now()),{credentials:"same-origin"});if(!p.ok)throw new Error(`the sprite returned ${p.status}`);const h=await ve(await p.blob());await u.putLibbyOutfitWip(e,r.emotion,r.tier,{imageData:h,filename:l,seed:-1,reviewed:!0,config:this.outfitConfigKey()}),n={id:`wip-${e}-${r.emotion}-${r.tier}`,seed:-1,saved:!1,outfitFilename:l,outfitSlot:r,outfitConfig:this.outfitConfigKey(),cutoutReviewed:!0,previewVersion:Date.now(),wipOutfitId:e},this.shots=[...this.shots,n],this.persistDraft()}catch(p){this.showToast(`Couldn't open that sprite: ${p.message}`);return}this.openCutout(this.previewURL(n),t,n.outfitFilename,n.id)}renderDressSection(){const e=q.filter(({key:i})=>H(this.outfitGear[i])).length,t=o`
      ${this.selectedChars.length>1?o`<div class="banner">
        ${this.selectedChars.length} characters are selected. Use one character for a
        reliable outfit set; the solo prompt will still discourage extra people.
      </div>`:c}
      <label class="switch">
        <input type="checkbox" .checked=${this.outfitOn} ?disabled=${this.outfitBatchRunning}
          @change=${i=>this.outfitOn=i.target.checked} />
        Add outfit terms to the prompt
      </label>
      <div>
        <label class="field">Theme</label>
        <input class="num" type="text" .value=${this.outfitText} ?disabled=${this.outfitBatchRunning}
          placeholder="Midnight rogue, beach date, office uniform…"
          @input=${i=>this.outfitText=i.target.value} />
      </div>
      <div class="loadout-board">
        <div class="loadout-heading">
          <span>Equipment</span>
          <span class="equipped-count">${e}/${q.length} worn</span>
          <button class="loadout-clear" ?disabled=${this.outfitBatchRunning||!e}
            @click=${()=>this.clearOutfitLoadout()}>Unequip all</button>
        </div>
        <div class="sec-note">Switch a piece off to keep it in the recipe without wearing it.</div>
        <div class="loadout-slots">
          ${q.map(i=>this.renderGearSlot(i.key))}
        </div>
      </div>
    `;return this.section("outfit","Clothes",`${e} worn`,t)}renderLookSection(){const e=o`
      <div>
        <label class="field">Solid generation background</label>
        <div class="chips">
          ${["white","black"].map(t=>o`<button
            class="chip ${this.outfitBackground===t?"on":""}"
            ?disabled=${this.outfitBatchRunning}
            @click=${()=>this.outfitBackground=t}>
            ${t==="white"?"White":"Black"}
          </button>`)}
        </div>
        <div class="sec-note">Pick whichever contrasts most with her hair and clothes — it is what the cutout removes.</div>
      </div>
      <div>
        <label class="field">Default underwear colour</label>
        <input class="num" type="text" .value=${this.outfitUnderwearColor}
          ?disabled=${this.outfitBatchRunning} placeholder="black, red, pale pink…"
          @input=${t=>this.outfitUnderwearColor=t.target.value} />
        <div class="sec-note">Used for the bra and panties when those slots have no colour of their own.</div>
      </div>
      <label class="switch">
        <input type="checkbox" .checked=${this.outfitLockColors} ?disabled=${this.outfitBatchRunning}
          @change=${t=>this.outfitLockColors=t.target.checked} />
        Lock equipped colours
      </label>
      <div class="sec-note">Weights each colour and names every colour the garment is <em>not</em> in the negative. Leave on unless a piece is meant to be multicoloured.</div>
      <label class="switch">
        <input type="checkbox" .checked=${this.outfitPubicHair} ?disabled=${this.outfitBatchRunning}
          @change=${t=>this.outfitPubicHair=t.target.checked} />
        Pubic hair at Peak
      </label>
      ${this.outfitPubicHair?o`<div>
        <label class="field">Pubic hair colour</label>
        <input class="num" type="text" .value=${this.outfitPubicHairColor}
          ?disabled=${this.outfitBatchRunning} placeholder="dark brown, blonde…"
          @input=${t=>this.outfitPubicHairColor=t.target.value} />
      </div>`:c}
      ${this.renderCameraControls()}
      <div>
        <label class="field">Exposure by tier</label>
        <div class="sec-note">${U.map((t,i)=>o`<div><strong>${t.label}:</strong> ${Ue[i].description}</div>`)}</div>
      </div>
    `;return this.section("look","Look & framing",this.outfitBackground,e)}renderPromptExtrasSection(){const e=o`
      <div class="sec-note">Added to every square alongside the recipe: quality tags, a style, the character's name.</div>
      <div>
        <label class="field">Extra positive</label>
        <textarea class="num extras" rows="3" .value=${this.prompt} placeholder="masterpiece, best quality, …"
          @input=${t=>this.prompt=t.target.value}></textarea>
      </div>
      <div>
        <label class="field">Extra negative</label>
        <textarea class="num extras" rows="2" .value=${this.negative} placeholder="lowres, bad anatomy, …"
          @input=${t=>this.negative=t.target.value}></textarea>
      </div>
    `;return this.section("extras","Prompt extras",this.prompt.trim()||this.negative.trim()?"set":"none",e)}onCivitaiClose(){this.civitaiOpen=!1,this.loadStatus()}onCivitaiPrompt(e){this.prompt=e.prompt,this.negative=e.negativePrompt??"",e.sampler&&(this.scheduler=e.sampler),e.steps&&(this.steps=e.steps),e.cfgScale&&(this.cfg=e.cfgScale),e.seed&&(this.seed=e.seed),e.width&&e.height&&(this.width=e.width,this.height=e.height),this.templateId="",this.selectedTriggers=[],this.onCivitaiClose()}section(e,t,i,a){if(this.flatSections)return o`<div class="pane sec-${e}">${a}</div>`;const s=!!this.open[e];return o`
      <div class="sec sec-${e}">
        <button class="sec-head" @click=${()=>this.toggleSection(e)}>
          <span class="material-symbols-rounded sec-chevron ${s?"open":""}" style="font-size:18px;"
            >chevron_right</span
          >
          ${t}
          <span class="count">${i}</span>
        </button>
        <!-- The body stays in the tree and is collapsed by a 0fr grid row rather than
             being removed. That is what makes the open/close animate at all, and it
             animates without measuring a height or reflowing everything below on each
             frame. See .collapsible in theme.ts. Kept out of the tab order and out of
             the accessibility tree while shut, since it is still rendered. -->
        <div class="collapsible ${s?"open":""}">
          <div class="sec-body" ?inert=${!s} aria-hidden=${s?"false":"true"}>${a}</div>
        </div>
      </div>
    `}renderModelSection(e){if(!e.length)return this.section("models","Models","0",o`<div class="sec-note">
          Connected, but the generator lists no checkpoints. Add a model to it and reload.
        </div>`);const t=this.flatSections?this.pickerFilter.trim().toLowerCase():"",i=t?e.filter(s=>`${s.model_name} ${s.title} ${s.base??""}`.toLowerCase().includes(t)):e,a=o`
      ${t&&!i.length?o`<div class="sec-note">No model matches “${this.pickerFilter}”.</div>`:c}
      <div class="cards">
        ${i.map(s=>{var n;const r=s.title===this.checkpoint,l=`${u.modelThumbURL(s.title)}&v=${this.thumbVersion}`;return o`
            <div class="card-wrap">
              <button class="card ${r?"on":""}" title=${s.title} @click=${()=>this.pickModel(s)}>
                ${this.renderArt(l,s.model_name,"texture")}
                <div class="card-name">${s.model_name}${s.base?o`<span class="row-sub">${s.base}</span>`:c}</div>
              </button>
              ${(n=this.status)!=null&&n.manageModels?o`<button class="card-edit left" title="Edit model settings" @click=${()=>this.openMetaEditor(s.title)}>
                <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
              </button>`:c}
            </div>
          `})}
      </div>
    `;return this.section("models","Models",String(e.length),a)}renderLoraSection(e,t){if(!e.length)return this.section("loras","LoRAs","0",o`<div class="sec-note">
          ${t?`LoRAs aren't available from this generator: ${t}`:"No LoRAs installed."}
        </div>`);const i=this.flatSections?this.pickerFilter.trim().toLowerCase():"",a=i?e.filter(h=>`${h.name} ${h.alias??""} ${(h.triggerPhrases??[]).join(" ")}`.toLowerCase().includes(i)):e,s=this.flatSections?60:6,r=Math.max(1,Math.ceil(a.length/s)),l=Math.min(this.loraPage,r-1),n=a.slice(l*s,l*s+s),p=o`
      ${i&&!a.length?o`<div class="sec-note">No LoRA matches “${this.pickerFilter}”.</div>`:c}
      <div class="cards">
        ${n.map(h=>{var y;const f=h.name in this.selectedLoras,b=`${u.loraThumbURL(h.name)}&v=${this.thumbVersion}`;return o`
            <div class="card-wrap">
              <button class="card ${f?"on":""}" title=${h.name} @click=${()=>this.toggleLora(h.name)}>
                ${this.renderArt(b,h.alias||h.name,"style")}
                <div class="card-name">${h.alias||h.name}</div>
              </button>
              ${(y=this.status)!=null&&y.manageModels?o`<button class="card-edit left" title="Edit LoRA settings" @click=${()=>this.openMetaEditor(h.name)}>
                <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
              </button>`:c}
              ${f?o`<input class="lora-weight" type="number" min="-2" max="2" step="0.05"
                aria-label=${`${h.alias||h.name} weight`}
                title=${h.weightMin&&h.weightMax?`Works at ${h.weightMin}–${h.weightMax}`:""}
                .value=${String(this.selectedLoras[h.name])}
                @input=${w=>{const $=Number(w.target.value);this.selectedLoras={...this.selectedLoras,[h.name]:Number.isFinite($)?Math.max(-2,Math.min(2,$)):1}}} />`:c}
            </div>
          `})}
      </div>
      ${r>1?o`<div class="pager">
        <button ?disabled=${l===0} @click=${()=>this.loraPage=l-1}>Previous</button>
        <span>${l+1} / ${r}</span>
        <button ?disabled=${l>=r-1} @click=${()=>this.loraPage=l+1}>Next</button>
      </div>`:c}
    `;return this.section("loras","LoRAs",String(Object.keys(this.selectedLoras).length||e.length),p)}renderVaeSection(e){const t=e.length?o`
          <div class="rows">
            <button class="row-pick ${this.vae===""?"on":""}" @click=${()=>this.vae=""}>
              Model default
            </button>
            ${e.map(i=>o`<button
                class="row-pick ${this.vae===i.key?"on":""}"
                @click=${()=>this.vae=this.vae===i.key?"":i.key}
              >
                ${i.name}
                ${i.base?o`<span class="row-sub">${i.base}</span>`:c}
              </button>`)}
          </div>
        `:o`<div class="sec-note">The generator lists no standalone VAEs; the model's own is used.</div>`;return this.section("vaes","VAEs",this.vae?"1 picked":"default",t)}renderSettingsSection(e,t){var a,s;const i=o`
      <div class="settings">
        <div class="full">
          <label class="field">Scheduler</label>
          <select
            class="num"
            .value=${this.scheduler}
            @change=${r=>this.scheduler=r.target.value}
          >
            ${aa.map(r=>o`<option value=${r.id} ?selected=${r.id===this.scheduler}>${r.label}</option>`)}
          </select>
        </div>
        <div>
          <label class="field">Steps</label>
          <input class="num" type="number" min="1" max="80" .value=${String(this.steps)}
            @input=${r=>this.steps=Y(r.target.value,1,80,25)} />
        </div>
        <div>
          <label class="field">CFG scale</label>
          <input class="num" type="number" min="1" max="30" step="0.5" .value=${String(this.cfg)}
            @input=${r=>this.cfg=ge(r.target.value,1,30,7)} />
        </div>
        ${e?o`
          <div>
            <label class="field">CFG rescale</label>
            <input class="num" type="number" min="0" max="0.99" step="0.05" .value=${String(this.cfgRescale)}
              @input=${r=>this.cfgRescale=ge(r.target.value,0,.99,0)} />
          </div>
          <div>
            <label class="field">CLIP skip</label>
            <input class="num" type="number" min="0" max="12" .value=${String(this.clipSkip)}
              @input=${r=>this.clipSkip=Y(r.target.value,0,12,0)} />
          </div>
        `:c}
        <div>
          <label class="field">Count</label>
          <input class="num" type="number" min="1" max="8" .value=${String(this.count)}
            @input=${r=>this.count=Y(r.target.value,1,8,1)} />
        </div>
        <div>
          <label class="field">Seed (-1 random)</label>
          <input class="num" type="number" .value=${String(this.seed)}
            @input=${r=>this.seed=Y(r.target.value,-1,2147483648,-1)} />
        </div>
        ${e?o`
          <!-- Which gallery a generation lands in is no longer a second setting here:
               it follows whichever gallery the Invoke gallery panel has open, so the
               place you're looking at is the place new images appear. -->
          <div class="full" style="font-size:12px; color:var(--oppai-text-muted);">
            Generations are added to <b>${((a=t.find(r=>r.id===this.board))==null?void 0:a.name)??"the open gallery"}</b> —
            switch galleries in the Invoke gallery panel.
          </div>
          <label class="switch-row"><input type="checkbox" .checked=${this.cpuNoise}
            @change=${r=>this.cpuNoise=r.target.checked} /> CPU noise</label>
          <label class="switch-row"><input type="checkbox" .checked=${this.seamlessX}
            @change=${r=>this.seamlessX=r.target.checked} /> Seamless X</label>
          <label class="switch-row"><input type="checkbox" .checked=${this.seamlessY}
            @change=${r=>this.seamlessY=r.target.checked} /> Seamless Y</label>
        `:c}
        ${(s=this.status)!=null&&s.detailerAvailable?o`
          <label class="switch-row full"><input type="checkbox" .checked=${this.detailerEnabled}
            @change=${r=>this.detailerEnabled=r.target.checked} />
            ADetailer face/hand pass</label>
          ${this.detailerEnabled?o`
            <div class="full">
              <label class="field">ADetailer detector</label>
              <select class="num" .value=${this.detailerModel}
                @change=${r=>this.detailerModel=r.target.value}>
                <option value="face_yolov8n.pt">Face (fast)</option>
                <option value="face_yolov8s.pt">Face (accurate)</option>
                <option value="hand_yolov8n.pt">Hands</option>
                <option value="person_yolov8n-seg.pt">Person</option>
                <option value="mediapipe_face_full">MediaPipe face</option>
              </select>
            </div>
            <div class="full">
              <label class="field">Detail prompt (blank reuses prompt)</label>
              <input class="num" .value=${this.detailerPrompt}
                @input=${r=>this.detailerPrompt=r.target.value} />
            </div>
            <div class="full">
              <label class="field">Detail negative prompt</label>
              <input class="num" .value=${this.detailerNegative}
                @input=${r=>this.detailerNegative=r.target.value} />
            </div>
            <div>
              <label class="field">Confidence</label>
              <input class="num" type="number" min="0.05" max="1" step="0.05" .value=${String(this.detailerConfidence)}
                @input=${r=>this.detailerConfidence=ge(r.target.value,.05,1,.3)} />
            </div>
            <div>
              <label class="field">Denoise</label>
              <input class="num" type="number" min="0.05" max="1" step="0.05" .value=${String(this.detailerDenoise)}
                @input=${r=>this.detailerDenoise=ge(r.target.value,.05,1,.4)} />
            </div>
            <div>
              <label class="field">Mask blur</label>
              <input class="num" type="number" min="0" max="64" .value=${String(this.detailerMaskBlur)}
                @input=${r=>this.detailerMaskBlur=Y(r.target.value,0,64,4)} />
            </div>
          `:c}
        `:c}
      </div>
    `;return this.section("settings","Model settings",`${this.steps} steps`,i)}renderTemplateSection(e){var l;const t=e.filter(n=>n.builtIn).length,i=this.showBuiltInTemplates?e:e.filter(n=>!n.builtIn),a=i.length?o`
          <div class="rows">
            ${i.map(n=>o`<button
                class="row-pick ${this.templateId===n.id?"on":""}"
                title=${n.prompt}
                @click=${()=>this.templateId=this.templateId===n.id?"":n.id}
              >
                ${n.name}
                <span class="row-sub">${n.prompt}</span>
              </button>`)}
          </div>
        `:o`<div class="sec-note">
          ${e.length?"No templates you created. Built-in presets are hidden — turn them on below.":((l=this.status)==null?void 0:l.backend)==="invokeai"?"No style presets in InvokeAI yet; add some there and reload.":"No styles saved in Automatic1111 yet; save one from its Styles menu and reload."}
        </div>`,s=o`
      ${a}
      ${t?o`<button
            class="link-toggle"
            @click=${()=>this.showBuiltInTemplates=!this.showBuiltInTemplates}
          >
            ${this.showBuiltInTemplates?"Hide built-in presets":`Show built-in presets (${t})`}
          </button>`:c}
    `,r=e.find(n=>n.id===this.templateId);return this.section("templates","Styles",r?r.name:"none",s)}renderCharacterSection(){const e=o`
      ${this.characters.length?o`<div class="cards">
            ${this.characters.map(i=>{const a=this.selectedChars.includes(i.id),s=`${u.characterThumbURL(i.id)}?v=${this.thumbVersion}`;return o`
                <div class="card-wrap">
                  <button class="card ${a?"on":""}" title=${i.prompt} @click=${()=>this.toggleCharacter(i.id)}>
                    ${i.hasThumb?this.renderArt(s,i.name,"person"):o`<div class="card-blank">
                          <span class="material-symbols-rounded" style="font-size:34px;">person</span>
                        </div>`}
                    <div class="card-name">${i.name}</div>
                  </button>
                  <button
                    class="card-edit"
                    title="Edit ${i.name}"
                    @click=${()=>this.charDraft={id:i.id,name:i.name,prompt:i.prompt,negativePrompt:i.negativePrompt??""}}
                  >
                    <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
                  </button>
                </div>
              `})}
          </div>`:o`<div class="sec-note">
            Save the people you keep drawing: a character bundles a prompt fragment and a
            portrait, and clicking one adds them to the next generation.
          </div>`}
      <button
        class="side-add"
        @click=${()=>this.charDraft={name:"",prompt:"",negativePrompt:""}}
      >
        <span class="material-symbols-rounded" style="font-size:17px;">person_add</span> New character
      </button>
    `,t=this.selectedChars.length;return this.section("characters","Characters",t?`${t} picked`:String(this.characters.length),e)}renderPoseSection(){const e=o`
      ${this.outfitOn?o`<div class="sec-note">
        The outfit board sets a pose per square, so picked poses sit out while it is on.
      </div>`:c}
      ${this.poses.length?o`<div class="cards">
            ${this.poses.map(i=>{const a=this.selectedPoses.includes(i.id),s=`${u.poseThumbURL(i.id)}?v=${this.thumbVersion}`;return o`
                <div class="card-wrap">
                  <button class="card ${a?"on":""}" title=${i.prompt} @click=${()=>this.togglePose(i.id)}>
                    ${i.hasThumb?this.renderArt(s,i.name,"accessibility_new"):o`<div class="card-blank">
                          <span class="material-symbols-rounded" style="font-size:34px;">accessibility_new</span>
                        </div>`}
                    <div class="card-name">${i.name}</div>
                  </button>
                  <button class="card-edit" title="Edit ${i.name}"
                    @click=${()=>this.poseDraft={id:i.id,name:i.name,prompt:i.prompt,negativePrompt:i.negativePrompt??""}}>
                    <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
                  </button>
                </div>`})}
          </div>`:o`<div class="sec-note">
            Save the poses you keep asking for: a pose is a prompt fragment with a
            picture, and clicking one adds it to the next generation. Right-click any
            result for "Save as a pose" to start one from a picture you like.
          </div>`}
      <button class="side-add" @click=${()=>this.poseDraft={name:"",prompt:"",negativePrompt:""}}>
        <span class="material-symbols-rounded" style="font-size:17px;">add</span> New pose
      </button>
    `,t=this.selectedPoses.length;return this.section("poses","Poses",t?`${t} picked`:String(this.poses.length),e)}renderWildcardSection(){const e=o`
      <div class="sec-note">
        Write <code>__name__</code> in a prompt to draw a random line from that list on
        every generate, or <code>{red|blue|green}</code> to pick one of a few words in
        place. Click a list to insert it.
      </div>
      ${this.wildcards.length?o`<div class="wildcard-chips">
            ${this.wildcards.map(t=>o`
              <span class="wildcard-chip">
                <button class="wildcard-name" title=${`${t.entries.length} line${t.entries.length===1?"":"s"} — insert __${t.name}__`}
                  @click=${()=>this.insertWildcard(t.name)}>__${t.name}__</button>
                ${t.readOnly?o`<span class="wildcard-ro" title="A .txt file in the server's wildcards folder — edit the file to change it">
                      <span class="material-symbols-rounded" style="font-size:14px;">lock</span></span>`:o`<button class="wildcard-edit" title="Edit ${t.name}"
                      @click=${()=>this.wildcardDraft={id:t.id,name:t.name,text:t.entries.join(`
`)}}>
                      <span class="material-symbols-rounded" style="font-size:14px;">edit</span></button>`}
              </span>`)}
          </div>`:c}
      <button class="side-add" @click=${()=>this.wildcardDraft={name:"",text:""}}>
        <span class="material-symbols-rounded" style="font-size:17px;">add</span> New wildcard list
      </button>
    `;return this.section("wildcards","Wildcards",String(this.wildcards.length),e)}insertWildcard(e){const t=`__${e}__`,i=this.renderRoot.querySelector(".prompt-area"),a=i&&document.activeElement===i?i.selectionStart:this.prompt.length,s=this.prompt.slice(0,a).replace(/\s+$/,""),r=this.prompt.slice(a).replace(/^\s+/,""),l=s&&!s.endsWith(",")?`${s}, `:s,n=r?r.startsWith(",")?r:`, ${r}`:"";this.prompt=`${l}${t}${n}`}togglePose(e){this.selectedPoses=this.selectedPoses.includes(e)?this.selectedPoses.filter(t=>t!==e):[...this.selectedPoses,e]}onPoseThumbFile(e){var s;const t=e.target,i=(s=t.files)==null?void 0:s[0];if(t.value="",!i||!this.poseDraft)return;const a=new FileReader;a.onload=()=>{this.poseDraft&&(this.poseDraft={...this.poseDraft,imageData:String(a.result),previewId:void 0})},a.readAsDataURL(i)}async savePose(){const e=this.poseDraft;if(!(!e||!e.name.trim()||this.poseBusy)){this.poseBusy=!0;try{const t=await u.savePose({id:e.id,name:e.name.trim(),prompt:e.prompt,negativePrompt:e.negativePrompt,imageData:e.imageData,previewId:e.previewId});this.poseDraft=null,this.bumpThumbs(),await this.loadPoses(),e.id||(this.selectedPoses=[...this.selectedPoses,t.id]),this.showToast("Pose saved")}catch(t){this.showToast(t.message)}finally{this.poseBusy=!1}}}async deletePose(){const e=this.poseDraft;if(!(!(e!=null&&e.id)||this.poseBusy)&&confirm(`Delete “${e.name}” from the pose library?`)){this.poseBusy=!0;try{await u.deletePose(e.id),this.poseDraft=null,await this.loadPoses(),this.showToast("Pose deleted")}catch(t){this.showToast(t.message)}finally{this.poseBusy=!1}}}async saveWildcard(){const e=this.wildcardDraft;if(!(!e||!e.name.trim()||!e.text.trim()||this.wildcardBusy)){this.wildcardBusy=!0;try{await u.saveWildcard({id:e.id,name:e.name.trim(),text:e.text}),this.wildcardDraft=null,await this.loadWildcards(),this.showToast("Wildcard list saved")}catch(t){this.showToast(t.message)}finally{this.wildcardBusy=!1}}}async deleteWildcard(){const e=this.wildcardDraft;if(!(!(e!=null&&e.id)||this.wildcardBusy)&&confirm(`Delete the wildcard list “${e.name}”?`)){this.wildcardBusy=!0;try{await u.deleteWildcard(e.id),this.wildcardDraft=null,await this.loadWildcards(),this.showToast("Wildcard list deleted")}catch(t){this.showToast(t.message)}finally{this.wildcardBusy=!1}}}renderPoseEditor(e){var i;const t=e.imageData??(e.previewId?u.genPreviewURL(e.previewId):e.id&&((i=this.poses.find(a=>a.id===e.id))!=null&&i.hasThumb)?`${u.poseThumbURL(e.id)}?v=${this.thumbVersion}`:void 0);return o`
      <div class="overlay" @click=${a=>{a.target===a.currentTarget&&(this.poseDraft=null)}}>
        <div class="dialog">
          <h3>${e.id?"Edit pose":"New pose"}</h3>
          <div>
            <label class="field">Name</label>
            <input type="text" .value=${e.name} placeholder="Sitting with a mug"
              @input=${a=>this.poseDraft={...e,name:a.target.value}} />
          </div>
          <div>
            <label class="field">Prompt fragment</label>
            <textarea .value=${e.prompt} placeholder="sitting cross-legged, holding a steaming mug in both hands, …"
              @input=${a=>this.poseDraft={...e,prompt:a.target.value}}></textarea>
          </div>
          <div>
            <label class="field">Negative fragment (optional)</label>
            <textarea .value=${e.negativePrompt} placeholder="standing, …"
              @input=${a=>this.poseDraft={...e,negativePrompt:a.target.value}}></textarea>
          </div>
          <div class="dialog-thumb">
            ${t?o`<img src=${t} alt="Thumbnail" />`:o`<div class="card-blank" style="width:72px; height:96px; aspect-ratio:auto; border-radius:10px;">
                  <span class="material-symbols-rounded">accessibility_new</span>
                </div>`}
            <label class="btn">
              Choose thumbnail…
              <input class="hidden-file" type="file" accept="image/*" @change=${a=>this.onPoseThumbFile(a)} />
            </label>
          </div>
          <div class="dialog-actions">
            ${e.id?o`<button class="btn danger" ?disabled=${this.poseBusy} @click=${()=>this.deletePose()}>Delete</button>`:c}
            <button class="btn" @click=${()=>this.poseDraft=null}>Cancel</button>
            <button class="btn primary" ?disabled=${!e.name.trim()||this.poseBusy} @click=${()=>this.savePose()}>Save</button>
          </div>
        </div>
      </div>
    `}renderWildcardEditor(e){const t=e.text.split(`
`).map(i=>i.trim()).filter(i=>i&&!i.startsWith("#")).length;return o`
      <div class="overlay" @click=${i=>{i.target===i.currentTarget&&(this.wildcardDraft=null)}}>
        <div class="dialog">
          <h3>${e.id?"Edit wildcard list":"New wildcard list"}</h3>
          <div>
            <label class="field">Name — used as <code>__name__</code></label>
            <input type="text" .value=${e.name} placeholder="hair_colour" ?disabled=${!!e.id}
              @input=${i=>this.wildcardDraft={...e,name:i.target.value}} />
          </div>
          <div>
            <label class="field">One line per option${t?` — ${t}`:""}</label>
            <textarea class="wildcard-text" .value=${e.text} placeholder="red hair&#10;blue hair&#10;silver hair, {braid|ponytail}"
              @input=${i=>this.wildcardDraft={...e,text:i.target.value}}></textarea>
            <div class="sec-note">A line can itself hold <code>{a|b}</code> choices or another <code>__list__</code>. Lines starting with # are ignored.</div>
          </div>
          <div class="dialog-actions">
            ${e.id?o`<button class="btn danger" ?disabled=${this.wildcardBusy} @click=${()=>this.deleteWildcard()}>Delete</button>`:c}
            <button class="btn" @click=${()=>this.wildcardDraft=null}>Cancel</button>
            <button class="btn primary" ?disabled=${!e.name.trim()||!e.text.trim()||this.wildcardBusy} @click=${()=>this.saveWildcard()}>Save</button>
          </div>
        </div>
      </div>
    `}renderGearSlot(e){var p,h,f;const t=q.find(b=>b.key===e),i=this.outfitGear[e],a=!!i.item.trim(),s=H(i),r=b=>{this.outfitGear={...this.outfitGear,[e]:{...i,...b}}},l=!!((p=i.prompt)!=null&&p.trim())||!!((h=i.noun)!=null&&h.trim()),n=this.gearPromptOpen===e;return o`<div class="gear-slot ${s?"filled":""} ${i.off?"off":""}" title=${t.hint}>
      <button class="gear-slot-icon material-symbols-rounded ${a?"":"inert"}" aria-hidden=${a?"false":"true"}
        title=${i.off?`Wear the ${t.label.toLowerCase()} again`:a?`Take the ${t.label.toLowerCase()} off without clearing it`:t.hint}
        ?disabled=${this.outfitBatchRunning||!a}
        @click=${()=>r({off:!i.off})}>${i.off?"visibility_off":t.icon}</button>
      <span class="gear-slot-name">${t.label}${i.off?" · off":""}</span>
      <button class="gear-slot-prompt ${l?"on":""} ${n?"open":""}"
        title=${`What the generator calls this slot — currently "${qe(t,i)}"`}
        aria-label=${`Edit the prompt wording for ${t.label}`} aria-expanded=${n?"true":"false"}
        ?disabled=${this.outfitBatchRunning}
        @click=${()=>this.gearPromptOpen=n?null:e}>
        <span class="material-symbols-rounded">text_fields</span></button>
      <div class="gear-slot-fields">
        <input class="gear-color" type="text" .value=${i.color}
          ?disabled=${this.outfitBatchRunning}
          aria-label=${`${t.label} colour`} placeholder="colour"
          @input=${b=>r({color:b.target.value})} />
        <input class="gear-item" type="text" .value=${i.item}
          ?disabled=${this.outfitBatchRunning}
          aria-label=${`${t.label}: ${t.hint}`} placeholder=${t.hint}
          @input=${b=>r({item:b.target.value})} />
      </div>
      ${n?o`<div class="gear-prompt-edit">
        <label>Prompt word
          <input type="text" .value=${i.prompt??""} placeholder=${t.prompt}
            ?disabled=${this.outfitBatchRunning}
            aria-label=${`Prompt word for ${t.label}`}
            @input=${b=>r({prompt:b.target.value})} /></label>
        <label>Colour-lock noun
          <input type="text" .value=${i.noun??""} placeholder=${Se(t,i)}
            ?disabled=${this.outfitBatchRunning}
            aria-label=${`Colour-lock noun for ${t.label}`}
            @input=${b=>r({noun:b.target.value})} /></label>
        <p class="gear-prompt-preview">
          ${s?o`Sends: <code>${st(t,i,((f=this.status)==null?void 0:f.backend)??"",this.outfitLockColors)}</code>`:o`Describe something in this slot to see the phrase it sends.`}
        </p>
        ${l?o`<button class="gear-prompt-reset" ?disabled=${this.outfitBatchRunning}
          @click=${()=>r({prompt:"",noun:""})}>Reset to "${t.prompt}"</button>`:c}
      </div>`:c}
    </div>`}clearOutfitLoadout(){this.outfitGear={...$t}}renderLoadoutSection(){const e=this.loadouts.find(i=>i.id===this.outfitLoadoutId),t=o`
      <div class="sec-note">
        A loadout is the recipe — every slot, colour and studio setting on the board.
        Save one to come back to it, or to render the same clothes again on another model.
      </div>
      <div class="loadout-cards">
        ${this.loadouts.map(i=>o`<div
          class="loadout-card ${i.id===this.outfitLoadoutId?"on":""}"
          title=${i.name}>
          <button class="card-hit" ?disabled=${this.outfitBatchRunning}
            aria-label=${`Equip ${i.name}`} @click=${()=>this.applyLoadout(i)}>
            ${i.hasThumb?o`<img class="cover" src=${u.libbyLoadoutThumbURL(i.id,this.loadoutCoverVersion)} alt="" />`:o`<span class="cover cover-empty material-symbols-rounded">checkroom</span>`}
            <span class="card-name">${i.name}</span>
          </button>
          ${i.id===this.outfitLoadoutId?o`<span class="worn-badge">Equipped</span>`:c}
          <button class="card-del" title=${`Delete ${i.name}`} aria-label=${`Delete ${i.name}`}
            ?disabled=${this.loadoutBusy} @click=${()=>void this.deleteLoadout(i)}>
            <span class="material-symbols-rounded" style="font-size:15px;">delete</span>
          </button>
        </div>`)}
        ${this.loadouts.length?c:o`<div class="sec-note">No saved loadouts yet.</div>`}
      </div>
      <div class="outfit-actions">
        <button class="side-add" ?disabled=${this.loadoutBusy||this.outfitBatchRunning}
          @click=${()=>void this.saveLoadout(!1)}>
          <span class="material-symbols-rounded" style="font-size:17px;">save</span>
          ${e?`Save over “${e.name}”`:"Save this loadout"}
        </button>
        ${e?o`
          <button class="side-add" ?disabled=${this.loadoutBusy||this.outfitBatchRunning}
            @click=${()=>void this.saveLoadout(!0)}>
            <span class="material-symbols-rounded" style="font-size:17px;">content_copy</span>
            Save as a new loadout
          </button>
          <button class="side-add" ?disabled=${this.loadoutBusy}
            @click=${()=>void this.setLoadoutCoverFromSelection()}>
            <span class="material-symbols-rounded" style="font-size:17px;">image</span>
            Use the selected square as its cover
          </button>`:c}
      </div>
    `;return this.section("loadouts","Saved loadouts",String(this.loadouts.length),t)}renderCameraControls(){const e=ze.shots.find(t=>t.id===this.camera.shot);return o`
      <div>
        <label class="field">Shot</label>
        <select class="num" .value=${this.camera.shot} ?disabled=${this.outfitBatchRunning}
          @change=${t=>this.editCamera({shot:t.target.value})}>
          ${ze.shots.map(t=>o`<option value=${t.id}>${t.label}</option>`)}
        </select>
      </div>
      ${e!=null&&e.hint?o`<div class="sec-note">${e.hint}.</div>`:c}
    `}async openCutout(e,t,i,a){this.cutout={url:e,name:t,outputName:i,outfitShotId:a},this.cutoutError="",this.cutoutBusy=!0,this.showOriginal=!1,this.cutoutZoom=1,this.cutoutContrast=!1;try{const s=await ii(e);this.session=new ti(s),this.session.autoRemove(this.cutoutTolerance),this.cutoutTool="remove",await this.paintCutout()}catch(s){this.cutoutError=s.message}finally{this.cutoutBusy=!1}}async paintCutout(){const e=this.session;if(!e)return;this.cutoutCanvas=e.compose({feather:this.cutoutFeather,spill:this.cutoutSpill},this.showOriginal),this.cutFraction=e.cutFraction,this.canUndo=e.canUndo,this.canRedo=e.canRedo,await this.updateComplete;const t=this.cutoutHost;t&&this.cutoutCanvas&&(t.replaceChildren(this.cutoutCanvas),this.applyCutoutZoom())}applyCutoutZoom(){const e=this.cutoutCanvas,t=this.cutoutHost;if(!e||!t)return;const i=Math.max(1,t.clientWidth),a=Math.max(280,Math.min(window.innerHeight*.62,e.height)),r=Math.min(1,i/e.width,a/e.height)*this.cutoutZoom;e.style.width=`${Math.max(1,Math.round(e.width*r))}px`,e.style.height=`${Math.max(1,Math.round(e.height*r))}px`}setCutoutZoom(e){this.cutoutZoom=Math.max(.25,Math.min(4,e)),this.updateComplete.then(()=>this.applyCutoutZoom())}async autoCutout(){this.session&&(this.session.autoRemove(this.cutoutTolerance),await this.paintCutout())}cutoutPoint(e){const t=this.cutoutCanvas;if(!t)return null;const i=t.getBoundingClientRect();return!i.width||!i.height?null:{x:(e.clientX-i.left)/i.width*t.width,y:(e.clientY-i.top)/i.height*t.height}}async onCutoutPointerDown(e){var a,s;const t=this.session,i=this.cutoutPoint(e);if(!(!t||!i)&&!this.showOriginal){if(e.preventDefault(),this.cutoutTool==="remove"){t.removeAt(i.x,i.y,{tolerance:this.cutoutTolerance,contiguous:this.contiguous}),await this.paintCutout();return}t.beginStroke(),this.painting=!0,(s=(a=e.target).setPointerCapture)==null||s.call(a,e.pointerId),t.paint(i.x,i.y,this.brushSize,this.cutoutTool==="add"?"add":"subtract"),await this.paintCutout()}}async onCutoutPointerMove(e){if(!this.painting||!this.session)return;const t=this.cutoutPoint(e);t&&(this.session.paint(t.x,t.y,this.brushSize,this.cutoutTool==="add"?"add":"subtract"),await this.paintCutout())}onCutoutPointerUp(){this.painting=!1}async undoCutout(){var e;(e=this.session)!=null&&e.undo()&&await this.paintCutout()}async redoCutout(){var e;(e=this.session)!=null&&e.redo()&&await this.paintCutout()}async resetCutout(){var e;(e=this.session)==null||e.reset(),await this.paintCutout()}async toggleOriginal(e){this.showOriginal=e,await this.paintCutout()}async closeCutout(){await Bt(this.renderRoot.querySelector(".cutout-dialog")),this.cutout=null,this.cutoutCanvas=null,this.cutoutError="",this.session=null,this.painting=!1,this.showOriginal=!1,this.cutoutZoom=1,this.cutoutContrast=!1}cutoutName(){var t,i;return(t=this.cutout)!=null&&t.outputName?this.cutout.outputName:`${(((i=this.cutout)==null?void 0:i.name)??"cutout").replace(/\.[a-z0-9]+$/i,"").slice(0,60)||"cutout"}-cutout.png`}exportCanvas(){return this.session?this.session.compose({feather:this.cutoutFeather,spill:this.cutoutSpill}):null}async downloadCutout(){const e=this.exportCanvas();if(e)try{const t=await tt(e),i=URL.createObjectURL(t),a=document.createElement("a");a.href=i,a.download=this.cutoutName(),a.click(),setTimeout(()=>URL.revokeObjectURL(i),0)}catch(t){this.cutoutError=t.message}}async saveCutout(){const e=this.exportCanvas();if(!(!e||this.cutoutBusy)){this.cutoutBusy=!0;try{const t=await tt(e),i=this.cutoutName();await u.upload(new File([t],i,{type:"image/png"}),i),this.dispatchEvent(new CustomEvent("imported",{detail:{count:1,kind:"image",title:i},bubbles:!0,composed:!0})),this.showToast("Cut-out saved to your library."),this.closeCutout()}catch(t){this.cutoutError=t.message}finally{this.cutoutBusy=!1}}}renderCutoutDialog(){if(!this.cutout)return c;const e=this.cutoutTool!=="remove",t=Math.round(this.cutFraction*100),i=!!this.cutout.outfitShotId;return o`
      <div class="overlay" @click=${a=>{a.target===a.currentTarget&&this.closeCutout()}}>
        <div class="dialog cutout-dialog">
          <h3>Cut out the background</h3>
          <div class="sec-note">
            The automatic pass clears the outer backdrop and strongly contrasted gaps
            through hair while protecting skin-toned reflections. Inspect it by hand,
            repair ambiguous edges with the tools, and zoom in for fine details.
          </div>

          <div class="cut-zoom">
            <button class="btn" title="Zoom out" @click=${()=>this.setCutoutZoom(this.cutoutZoom-.25)}>
              <span class="material-symbols-rounded" style="font-size:17px;">zoom_out</span>
            </button>
            <input aria-label="Cutout zoom" type="range" min="25" max="400" step="25"
              .value=${String(Math.round(this.cutoutZoom*100))}
              @input=${a=>this.setCutoutZoom(Number(a.target.value)/100)} />
            <output>${Math.round(this.cutoutZoom*100)}%</output>
          </div>

          <div
            class="cutout-canvas ${e?"brushing":"picking"} ${this.showOriginal?"before":""} ${this.cutoutContrast?"contrast":""}"
            @pointerdown=${a=>void this.onCutoutPointerDown(a)}
            @pointermove=${a=>void this.onCutoutPointerMove(a)}
            @pointerup=${()=>this.onCutoutPointerUp()}
            @pointercancel=${()=>this.onCutoutPointerUp()}
          ></div>

          ${this.cutoutError?o`<div class="banner">${this.cutoutError}</div>`:c}

          <div class="cut-row">
            <span class="cut-stat">
              ${this.showOriginal?"Showing the original":`${t}% removed`}
            </span>
            <button
              class="btn"
              title="Hold to see the untouched image"
              @pointerdown=${()=>void this.toggleOriginal(!0)}
              @pointerup=${()=>void this.toggleOriginal(!1)}
              @pointerleave=${()=>this.showOriginal&&void this.toggleOriginal(!1)}
            >
              <span class="material-symbols-rounded" style="font-size:17px;">compare</span> Before
            </button>
            <button class="btn ${this.cutoutContrast?"primary":""}"
              title="Put vivid magenta behind transparency so leftover background and missing subject pixels stand out"
              @click=${()=>this.cutoutContrast=!this.cutoutContrast}>
              <span class="material-symbols-rounded" style="font-size:17px;">contrast</span>
              Contrast layer
            </button>
            <button class="btn" ?disabled=${!this.canUndo} title="Undo (one step per stroke)"
              @click=${()=>void this.undoCutout()}>
              <span class="material-symbols-rounded" style="font-size:17px;">undo</span>
            </button>
            <button class="btn" ?disabled=${!this.canRedo} title="Redo"
              @click=${()=>void this.redoCutout()}>
              <span class="material-symbols-rounded" style="font-size:17px;">redo</span>
            </button>
            <button class="btn" title="Put every pixel back" @click=${()=>void this.resetCutout()}>
              <span class="material-symbols-rounded" style="font-size:17px;">restart_alt</span>
            </button>
          </div>

          <div class="cut-row">
            ${[["remove","colorize","Remove colour"],["subtract","ink_eraser","Erase"],["add","brush","Restore"]].map(([a,s,r])=>o`<button
                class="btn ${this.cutoutTool===a?"primary":""}"
                @click=${()=>this.cutoutTool=a}
              >
                <span class="material-symbols-rounded" style="font-size:17px;">${s}</span>
                ${r}
              </button>`)}
          </div>

          ${e?o`<div>
                <label class="field">Brush size · ${this.brushSize} px</label>
                <input type="range" min="4" max="160" step="2" .value=${String(this.brushSize)}
                  @input=${a=>this.brushSize=Number(a.target.value)} />
              </div>`:o`
                <div>
                  <label class="field">Colour tolerance · ${this.cutoutTolerance}</label>
                  <input type="range" min="4" max="140" step="2" .value=${String(this.cutoutTolerance)}
                    @input=${a=>this.cutoutTolerance=Number(a.target.value)} />
                </div>
                <label class="cut-check">
                  <input type="checkbox" .checked=${this.contiguous}
                    @change=${a=>this.contiguous=a.target.checked} />
                  <span>
                    Contiguous only
                    <span class="cut-hint">
                      — takes just the patch you clicked. Turn it off to remove that colour
                      everywhere, which is what a broken-up backdrop needs and what will
                      also take the subject's eyes if they happen to match.
                    </span>
                  </span>
                </label>
                <div class="cut-row">
                  <button class="btn" ?disabled=${this.cutoutBusy} @click=${()=>void this.autoCutout()}>
                    <span class="material-symbols-rounded" style="font-size:17px;">auto_fix_high</span>
                    Re-run automatic pass
                  </button>
                </div>
              `}

          <div>
            <label class="field">Edge feather · ${this.cutoutFeather} px</label>
            <input type="range" min="0" max="12" step="1" .value=${String(this.cutoutFeather)}
              @input=${a=>{this.cutoutFeather=Number(a.target.value),this.paintCutout()}} />
          </div>
          <div>
            <label class="field">
              Spill suppression · ${Math.round(this.cutoutSpill*100)}%
            </label>
            <input type="range" min="0" max="100" step="5" .value=${String(Math.round(this.cutoutSpill*100))}
              @input=${a=>{this.cutoutSpill=Number(a.target.value)/100,this.paintCutout()}} />
            <div class="cut-hint">
              Pulls the backdrop's colour out of the soft rim, so hair cut off a green
              screen stops looking green. Feather and spill are re-applied from the mask
              every time, so neither is a one-way door.
            </div>
          </div>

          <div class="dialog-actions">
            <button class="btn" @click=${()=>void this.closeCutout()}>Close</button>
            <button class="btn" ?disabled=${this.cutoutBusy||!this.session}
              @click=${()=>void this.downloadCutout()}>
              <span class="material-symbols-rounded" style="font-size:17px;">download</span> Download PNG
            </button>
            <button class="btn primary" ?disabled=${this.cutoutBusy||!this.session}
              @click=${()=>void(i?this.applyOutfitCutout():this.saveCutout())}>
              <span class="material-symbols-rounded" style="font-size:17px;">${i?"check":"save"}</span>
              ${this.cutoutBusy?"Working…":i?"Use for outfit":"Save to library"}
            </button>
          </div>
        </div>
      </div>
    `}renderCharEditor(e){var i;const t=e.imageData??(e.id&&((i=this.characters.find(a=>a.id===e.id))!=null&&i.hasThumb)?`${u.characterThumbURL(e.id)}?v=${this.thumbVersion}`:void 0);return o`
      <div class="overlay" @click=${a=>{a.target===a.currentTarget&&(this.charDraft=null)}}>
        <div class="dialog">
          <h3>${e.id?"Edit character":"New character"}</h3>
          <div>
            <label class="field">Name</label>
            <input type="text" .value=${e.name} placeholder="Rin"
              @input=${a=>this.charDraft={...e,name:a.target.value}} />
          </div>
          <div>
            <label class="field">Prompt fragment</label>
            <textarea .value=${e.prompt} placeholder="1girl, red hair, green eyes, …"
              @input=${a=>this.charDraft={...e,prompt:a.target.value}}></textarea>
          </div>
          <div>
            <label class="field">Negative fragment (optional)</label>
            <textarea .value=${e.negativePrompt} placeholder="blonde, …"
              @input=${a=>this.charDraft={...e,negativePrompt:a.target.value}}></textarea>
          </div>
          <div class="dialog-thumb">
            ${t?o`<img src=${t} alt="Thumbnail" />`:o`<div class="card-blank" style="width:72px; height:96px; aspect-ratio:auto; border-radius:10px;">
                  <span class="material-symbols-rounded">person</span>
                </div>`}
            <label class="btn">
              Choose thumbnail…
              <input class="hidden-file" type="file" accept="image/*" @change=${a=>this.onCharThumbFile(a)} />
            </label>
            <label class="btn ${this.scanBusy?"disabled":""}"
              title="Read booru tags off an image and add them to the prompt">
              <span class="material-symbols-rounded" style="font-size:16px; vertical-align:-3px;">
                ${this.scanBusy?"hourglass_top":"auto_awesome"}
              </span>
              ${this.scanBusy?"Scanning…":"Scan image for tags"}
              <input class="hidden-file" type="file" accept="image/*"
                ?disabled=${this.scanBusy}
                @change=${a=>this.onCharScanFile(a)} />
            </label>
          </div>
          <div class="dialog-actions">
            ${e.id?o`<button class="btn danger" ?disabled=${this.charBusy} @click=${()=>this.deleteCharacter()}>
                  Delete
                </button>`:c}
            <button class="btn" @click=${()=>this.charDraft=null}>Cancel</button>
            <button class="btn primary" ?disabled=${!e.name.trim()||this.charBusy} @click=${()=>this.saveCharacter()}>
              Save
            </button>
          </div>
        </div>
      </div>
    `}renderPrompt(){var i,a,s,r;const e=this.outfitOn?1:this.count,t=this.activeTriggerPhrases();return o`
      <div class="prompt-card composer">
        ${this.editing?o`<div class="editing-bar">
          <span class="material-symbols-rounded" style="font-size:17px;">brush</span>
          <span class="editing-copy">Editing <strong>${this.editing.title}</strong>${this.editingLibby?" — one of Libby's pictures":""}.
            Generate, then Save to keep it beside the original, or right-click a result to replace it.</span>
          <button class="chip" @click=${()=>this.editing=null}>Done</button>
        </div>`:c}

        <div class="composer-fields">
          <div class="prompt-field positive">
            <textarea
              class="prompt-area"
              aria-label="Positive prompt"
              aria-autocomplete="list"
              .value=${this.prompt}
              placeholder="Describe what you want to create — tags complete as you type, and so do <lora: and __wildcards__"
              @input=${l=>{this.prompt=l.target.value,this.onPromptTyping("prompt")}}
              @click=${()=>this.onPromptTyping("prompt")}
              @keydown=${l=>this.onPromptKey(l,"prompt")}
              @blur=${()=>this.closeCompletionsSoon()}
            ></textarea>
            ${this.completionField==="prompt"?this.renderCompletions():c}
          </div>
          <div class="prompt-field negative">
            <span class="field-tag negative">Negative</span>
            <textarea
              class="negative-area"
              aria-label="Negative prompt"
              aria-autocomplete="list"
              .value=${this.negative}
              placeholder="What to leave out…"
              @input=${l=>{this.negative=l.target.value,this.onPromptTyping("negative")}}
              @click=${()=>this.onPromptTyping("negative")}
              @keydown=${l=>this.onPromptKey(l,"negative")}
              @blur=${()=>this.closeCompletionsSoon()}
            ></textarea>
            ${this.completionField==="negative"?this.renderCompletions():c}
          </div>
        </div>

        ${t.length?o`<div class="trigger-row">
          <span class="trigger-label">Trigger words</span>
          ${t.map(l=>o`<button
            class="chip small ${this.selectedTriggers.includes(l)?"on":""}"
            title="Add or remove this LoRA trigger phrase"
            @click=${()=>this.toggleTrigger(l)}>${l}</button>`)}
        </div>`:c}

        <div class="composer-bar">
          ${this.speechSupported?o`<button
                class="mic ${this.listening?"live":""}"
                title=${this.listening?"Stop listening":"Speak your idea"}
                @click=${()=>this.toggleListening()}
              >
                <span class="material-symbols-rounded">${this.listening?"stop":"mic"}</span>
              </button>`:c}
          ${this.listening||this.optimizing?o`<span class="speech-hint">${this.listening?this.speech||"Listening…":"Turning that into a prompt…"}</span>`:o`<div class="count-seg" role="group" aria-label="Pictures per run" title=${this.outfitOn?"The outfit board makes one square at a time":"Pictures per run"}>
                ${[1,2,3,4].map(l=>o`<button class=${e===l?"on":""} ?disabled=${this.outfitOn}
                  aria-pressed=${e===l?"true":"false"} @click=${()=>this.count=l}>${l}</button>`)}
              </div>
              <span class="prompt-summary">${e} picture${e===1?"":"s"} · ${this.width}×${this.height}</span>`}
          ${this.generating?o`<button class="generate cancel" type="button" ?disabled=${(i=this.progress)==null?void 0:i.cancelled} title="Stop this generation" @click=${()=>void this.cancelGeneration()}>
                <span class="material-symbols-rounded" style="font-size:19px;">close</span>
                ${(a=this.progress)!=null&&a.cancelled?"Stopping…":(s=this.progress)!=null&&s.total?`Cancel · ${this.progress.step}/${this.progress.total}`:"Cancel"}
              </button>`:o`<button class="generate" title="Generate (Ctrl+Enter)" ?disabled=${!this.assemblePrompts().prompt.trim()} @click=${()=>this.generate()}>
                <span class="material-symbols-rounded" style="font-size:20px;">auto_awesome</span>
                ${((r=this.status)==null?void 0:r.backend)==="invokeai"?"Invoke":"Generate"}
              </button>`}
        </div>
      </div>
    `}activeTriggerPhrases(){var e;return[...new Set((((e=this.status)==null?void 0:e.loras)??[]).filter(t=>t.name in this.selectedLoras).flatMap(t=>t.triggerPhrases??[]))]}renderCompletions(){return this.completions.length?o`<div class="complete" role="listbox" aria-label="Suggestions"
      @mousedown=${e=>e.preventDefault()}>
      ${this.completions.map((e,t)=>o`<button class="complete-row ${t===this.completionIndex?"on":""}"
          role="option" aria-selected=${t===this.completionIndex?"true":"false"}
          @mouseenter=${()=>this.completionIndex=t}
          @click=${()=>void this.acceptCompletion(t)}>
          <span class="complete-dot cat-${e.kind==="tag"?String(e.category??0):e.kind}"></span>
          <span class="complete-label">${e.label}</span>
          ${e.detail?o`<span class="complete-detail">${e.detail}</span>`:c}
          <span class="complete-count">${Ji(e.count)}</span>
        </button>`)}
      <div class="complete-hint">↑ ↓ choose · Tab or Enter inserts · Esc closes</div>
    </div>`:c}async applyOutfitCutout(){var a;const e=this.exportCanvas(),t=(a=this.cutout)==null?void 0:a.outfitShotId,i=this.shots.find(s=>s.id===t);if(!(!e||!t||!i||this.cutoutBusy)){this.cutoutBusy=!0;try{const s=e.toDataURL("image/png"),r=i.wipOutfitId||await this.ensureWardrobe();if(await u.putLibbyOutfitWip(r,i.outfitSlot.emotion,i.outfitSlot.tier,{imageData:s,filename:i.outfitFilename,seed:i.seed,reviewed:!0,config:i.outfitConfig,info:i.info}),!t.startsWith("wip-"))try{await u.replaceGenPreview(t,s)}catch{}const l=Date.now();this.shots=this.shots.map(n=>n.id===t?{...n,cutoutReviewed:!0,previewVersion:l,wipOutfitId:r}:n),this.persistDraft(),this.showToast("Reviewed cutout applied to this outfit state."),this.closeCutout(),this.fileSpriteToWardrobe(t,e,r)}catch(s){this.cutoutError=s.message}finally{this.cutoutBusy=!1}}}async fileSpriteToWardrobe(e,t,i){var r,l,n;const a=i||this.outfitWardrobeId;if(!a)return;const s=(r=this.shots.find(p=>p.id===e))==null?void 0:r.outfitSlot;if(s)try{await u.setLibbyEmotion(a,s.emotion,t.toDataURL("image/png"),s.tier),this.wardrobes=await u.libbyOutfits().then(h=>h.outfits),(l=this.renderRoot.querySelector("oppai-outfit-wardrobe"))==null||l.refresh();const p=((n=this.wardrobes.find(h=>h.id===a))==null?void 0:n.name)??"the wardrobe";this.showToast(`Filed ${s.tierLabel} · ${s.emotionLabel} into ${p}.`)}catch(p){this.showToast(`Saved the cutout, but filing it failed: ${p.message}`)}}async loadStudio(){if(!this.studioLoaded){this.studioLoaded=!0;try{const[e,t]=await Promise.all([u.libbyLoadouts(),u.libbyOutfits()]);if(this.loadouts=e.loadouts,this.wardrobes=t.outfits,this.outfitWardrobeId&&!this.wardrobes.some(i=>i.id===this.outfitWardrobeId)&&(this.outfitWardrobeId=""),this.outfitLoadoutId&&!this.loadouts.some(i=>i.id===this.outfitLoadoutId)&&(this.outfitLoadoutId=""),!this.outfitWardrobeId){const i=[...this.wardrobes].sort((a,s)=>(s.wip??0)-(a.wip??0))[0];i!=null&&i.wip&&(this.outfitWardrobeId=i.id)}await this.loadWipBoard(this.outfitWardrobeId)}catch(e){this.showToast(`Couldn't load your saved outfits: ${e.message}`),this.studioLoaded=!1}}}loadoutBody(){return{version:1,gear:this.outfitGear,theme:this.outfitText.trim(),background:this.outfitBackground,underwearColor:this.outfitUnderwearColor,pubicHair:this.outfitPubicHair,pubicHairColor:this.outfitPubicHairColor,lockColors:this.outfitLockColors,shot:this.camera.shot}}applyLoadout(e){const t=e.loadout??{},i=(s,r)=>typeof t[s]=="string"?t[s]:r;this.outfitGear=ot(t.gear),this.outfitText=i("theme",e.name),this.outfitBackground=t.background==="black"?"black":"white",this.outfitUnderwearColor=i("underwearColor",this.outfitUnderwearColor),this.outfitPubicHair=t.pubicHair===!0,this.outfitPubicHairColor=i("pubicHairColor",this.outfitPubicHairColor),this.outfitLockColors=t.lockColors!==!1;const a=i("shot","");a&&ze.shots.some(s=>s.id===a)&&this.editCamera({shot:a}),this.outfitLoadoutId=e.id,this.outfitOn=!0,this.persistDraft(),this.showToast(`Equipped “${e.name}”.`)}async saveLoadout(e){var r;if(this.loadoutBusy)return;const t=this.outfitText.trim(),i=this.loadouts.find(l=>l.id===this.outfitLoadoutId),a=e?t:(i==null?void 0:i.name)??t,s=(r=window.prompt("Name this loadout",a||"New loadout"))==null?void 0:r.trim();if(s){this.loadoutBusy=!0;try{const l=await u.saveLibbyLoadout({id:e?void 0:this.outfitLoadoutId||void 0,name:s,loadout:this.loadoutBody()});this.outfitLoadoutId=l.id,this.loadouts=(await u.libbyLoadouts()).loadouts,this.persistDraft(),this.showToast(`Saved “${l.name}”.`)}catch(l){this.showToast(l.message)}finally{this.loadoutBusy=!1}}}async deleteLoadout(e){if(!(this.loadoutBusy||!window.confirm(`Delete the loadout “${e.name}”?`))){this.loadoutBusy=!0;try{await u.deleteLibbyLoadout(e.id),this.loadouts=this.loadouts.filter(t=>t.id!==e.id),this.outfitLoadoutId===e.id&&(this.outfitLoadoutId=""),this.showToast(`Deleted “${e.name}”.`)}catch(t){this.showToast(t.message)}finally{this.loadoutBusy=!1}}}async setLoadoutCoverFromSelection(){const e=this.loadouts.find(i=>i.id===this.outfitLoadoutId);if(!e||this.loadoutBusy)return;const t=this.shotAt(this.outfitSlot().slot)??this.currentOutfitShots()[0];if(!t){this.showToast("Generate a square first — its picture becomes the cover.");return}this.loadoutBusy=!0;try{const i=await fetch(this.previewURL(t),{credentials:"same-origin"});if(!i.ok)throw new Error(`preview returned ${i.status}`);const a=await ve(await i.blob());await u.setLibbyLoadoutThumb(e.id,a),this.loadoutCoverVersion=Date.now(),this.loadouts=(await u.libbyLoadouts()).loadouts,this.showToast("Cover updated.")}catch(i){this.showToast(i.message)}finally{this.loadoutBusy=!1}}async createWardrobe(){var t;const e=(t=window.prompt("Name the wardrobe these sprites go into",this.outfitText.trim()||"New wardrobe"))==null?void 0:t.trim();if(e)try{const i=await u.saveLibbyOutfit({name:e});this.wardrobes=(await u.libbyOutfits()).outfits,this.outfitWardrobeId=i.id,this.persistDraft(),await this.loadWipBoard(i.id),this.showToast(`Squares will be kept in “${i.name}”.`)}catch(i){this.showToast(i.message)}}promptArea(e){return this.renderRoot.querySelector(e==="prompt"?".prompt-area":".negative-area")}onPromptTyping(e){var l;const t=this.promptArea(e);if(!t)return;const i=Hi(t.value,t.selectionStart??t.value.length),a=++this.completionSeq;if(window.clearTimeout(this.completionTimer),this.completionField=e,this.completionToken=i,!i){this.closeCompletions();return}const s={loras:(((l=this.status)==null?void 0:l.loras)??[]).map(n=>({name:n.name,alias:n.alias,weight:n.weight})),wildcards:this.wildcards.map(n=>({name:n.name,lines:n.entries.length})),triggers:e==="prompt"?this.activeTriggerPhrases():[]},r=Yi(i,s);if(i.mode!=="tag"||i.query.length<2){this.showCompletions(r);return}r.length&&this.showCompletions(r),this.completionTimer=window.setTimeout(async()=>{try{const n=await u.booruTags(i.query,10);if(a!==this.completionSeq)return;const h=(n.items??n.suggestions.map(f=>({tag:f,category:0,count:0}))).map(f=>({kind:"tag",label:f.tag,insert:ht(f.tag),category:f.category,count:f.count,detail:"alias"in f&&f.alias?`“${f.alias}”`:void 0}));!h.length&&n.correction&&h.push({kind:"tag",label:n.correction,insert:ht(n.correction),detail:"did you mean"}),this.showCompletions(Zi(r,h,10))}catch{a===this.completionSeq&&this.showCompletions(r)}},110)}showCompletions(e){const t=this.completionToken,i=this.promptArea(this.completionField),a=t&&i?i.value.slice(t.start,t.end).trim().toLowerCase():"";e.length===1&&e[0].insert.toLowerCase()===a&&(e=[]),this.completions=e,this.completionIndex=e.length?0:-1}closeCompletions(){this.completionSeq++,window.clearTimeout(this.completionTimer),this.completions=[],this.completionIndex=-1}closeCompletionsSoon(){window.setTimeout(()=>{this.renderRoot.activeElement!==this.promptArea(this.completionField)&&this.closeCompletions()},120)}onPromptKey(e,t){if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault(),this.closeCompletions(),!this.generating&&this.assemblePrompts().prompt.trim()&&this.generate();return}if(!(!this.completions.length||this.completionField!==t))switch(e.key){case"ArrowDown":case"ArrowUp":e.preventDefault(),this.completionIndex=Qi(this.completionIndex,this.completions.length,e.key==="ArrowDown"?1:-1);break;case"Tab":case"Enter":if(e.shiftKey||e.altKey||this.completionIndex<0)return;e.preventDefault(),this.acceptCompletion(this.completionIndex);break;case"Escape":e.preventDefault(),e.stopPropagation(),this.closeCompletions();break}}async acceptCompletion(e){var l;const t=this.completions[e],i=this.completionToken,a=this.completionField,s=this.promptArea(a);if(!t||!i||!s)return;let r=ut(s.value,i,t.insert);if(t.kind==="lora"){const n=((l=/^<lora:(.*):[^:]*>$/.exec(t.insert))==null?void 0:l[1])??"";r=ut(s.value,i,""),n&&!(n in this.selectedLoras)&&this.toggleLora(n),this.showToast(`${t.label} is on — its weight is in the recipe above`)}a==="prompt"?this.prompt=r.text:this.negative=r.text,this.closeCompletions(),await this.updateComplete,s.value=r.text,s.focus(),s.setSelectionRange(r.caret,r.caret)}renderPromptOptions(){return o`
      <div>
        <label class="field">Resolution</label>
        <div class="chips">
          ${ia.map(e=>{const t=e.w===this.width&&e.h===this.height;return o`<button
              class="chip ${t?"on":""}"
              @click=${()=>{this.width=e.w,this.height=e.h}}
            >${e.label}<span class="hint">${e.hint}</span></button>`})}
        </div>
      </div>
      <div class="custom-size">
        <div>
          <label class="field">Width</label>
          <input class="num" type="number" min="64" max="2048" step="8" .value=${String(this.width)}
            @input=${e=>this.width=Y(e.target.value,64,2048,512)} />
        </div>
        <span class="material-symbols-rounded" style="margin-top:22px; color:var(--oppai-text-muted);">close</span>
        <div>
          <label class="field">Height</label>
          <input class="num" type="number" min="64" max="2048" step="8" .value=${String(this.height)}
            @input=${e=>this.height=Y(e.target.value,64,2048,768)} />
        </div>
      </div>
    `}renderGenInfo(e){const t=e.info;return t?o`
      <div class="geninfo">
        <pre class="geninfo-text">${Z(t)}</pre>
        <div class="geninfo-row">
          <button class="act primary" @click=${()=>void this.copyGenInfo(e,"text")}>
            <span class="material-symbols-rounded" style="font-size:16px;">content_copy</span>
            Copy parameters
          </button>
          <button class="act" title="Everything, including the fields A1111's format has no room for"
            @click=${()=>void this.copyGenInfo(e,"json")}>
            <span class="material-symbols-rounded" style="font-size:16px;">data_object</span>
            Copy JSON
          </button>
          <button class="act" @click=${()=>this.infoFor=null}>
            <span class="material-symbols-rounded" style="font-size:16px;">close</span>
          </button>
        </div>
      </div>
    `:o`<div class="geninfo">
        <p class="geninfo-note">
          No data was recorded for this image — it was restored from a saved draft by an
          older build. Generate again to capture it.
        </p>
      </div>`}nodePosition(e,t){const i=this.defaultNodePosition(t);return{x:e.workspaceX??i.workspaceX,y:e.workspaceY??i.workspaceY}}beginNodeDrag(e,t,i){var s,r;if(i.button!==0)return;i.preventDefault();const a=this.nodePosition(e,t);this.activeNodeId=e.id,this.draggingNode={id:e.id,pointerId:i.pointerId,clientX:i.clientX,clientY:i.clientY,x:a.x,y:a.y},(r=(s=i.currentTarget).setPointerCapture)==null||r.call(s,i.pointerId)}moveNode(e){const t=this.draggingNode;if(!t||t.pointerId!==e.pointerId)return;e.preventDefault();const i=Math.max(0,Math.round(t.x+e.clientX-t.clientX)),a=Math.max(0,Math.round(t.y+e.clientY-t.clientY));this.shots=this.shots.map(s=>s.id===t.id?{...s,workspaceX:i,workspaceY:a}:s)}endNodeDrag(e){!this.draggingNode||this.draggingNode.pointerId!==e.pointerId||(this.draggingNode=null,this.persistDraft())}clearWorkspace(){!this.shots.length||!confirm("Clear every generated image from this workspace? Unsaved previews will no longer be shown.")||(this.shots=[],this.expandedShot=null,this.infoFor=null,this.activeNodeId=null,this.outfitProgress="",this.persistDraft())}async deleteOutfitSquare(e){const t=e.outfitSlot;if(t&&confirm(`Delete the ${t.tierLabel} · ${t.emotionLabel} square? It will need generating again.`))try{e.wipOutfitId&&await u.deleteLibbyOutfitWip(e.wipOutfitId,t.emotion,t.tier),e.id.startsWith("wip-")||await u.deleteGenPreview(e.id).catch(()=>{}),this.shots=this.shots.filter(i=>i.id!==e.id),this.persistDraft(),this.showToast(`Deleted ${t.tierLabel} · ${t.emotionLabel}.`)}catch(i){this.showToast(i.message)}}renderResults(){var a;if(!this.shots.length)return o`<div class="canvas-empty">
        <span class="material-symbols-rounded">image</span>
        <strong>Your generation canvas</strong>
        <span>Pick a model, write a prompt, and press ${((a=this.status)==null?void 0:a.backend)==="invokeai"?"Invoke":"Generate"} — or Ctrl+Enter from the prompt.</span>
      </div>`;const e=this.shots.map((s,r)=>this.nodePosition(s,r)),t=Math.max(600,...e.map(s=>s.x+290)),i=Math.max(480,...e.map(s=>s.y+450));return o`
      <div class="results" style=${`width:${t}px;height:${i}px;`}>
        ${this.shots.map((s,r)=>{var n;const l=e[r];return o`
            <div class="shot ${this.activeNodeId===s.id?"active":""}"
              style=${`left:${l.x}px;top:${l.y}px;`}>
              <div class="node-handle"
                title="Drag to move this image"
                @pointerdown=${p=>this.beginNodeDrag(s,r,p)}
                @pointermove=${p=>this.moveNode(p)}
                @pointerup=${p=>this.endNodeDrag(p)}
                @pointercancel=${p=>this.endNodeDrag(p)}>
                <span class="material-symbols-rounded" style="font-size:16px;">drag_indicator</span>
                <span class="node-title">${s.outfitSlot?`${s.outfitSlot.tierLabel} · ${s.outfitSlot.emotionLabel}`:`Seed ${s.seed}`}</span>
              </div>
              <img
                src=${this.previewURL(s)}
                alt="Generated image"
                loading="lazy"
                style="cursor: zoom-in;"
                title="Expand"
                @click=${()=>this.expandedShot=s}
                @contextmenu=${p=>this.openShotMenu(s,p)}
              />
              ${s.outfitSlot?o`<div class="shot-slot">
                ${s.outfitSlot.tierLabel} · ${s.outfitSlot.emotionLabel}
              </div>`:c}
              <div class="shot-actions">
                <button class="act primary" ?disabled=${s.saved} @click=${()=>this.save(s)}>
                  <span class="material-symbols-rounded" style="font-size:16px;"
                    >${s.saved?"check":"save"}</span
                  >
                  ${s.saved?"Saved":"Save"}
                </button>
                <button class="act" title=${s.outfitSlot?s.cutoutReviewed?"Review or adjust this outfit cutout again":"Review the automatic cutout by hand":"Cut the background out"}
                  @click=${()=>void this.openCutout(this.previewURL(s),`seed-${s.seed}`,s.outfitFilename,s.outfitSlot?s.id:void 0)}>
                  <span class="material-symbols-rounded" style="font-size:16px;">background_replace</span>
                  ${s.outfitSlot?s.cutoutReviewed?"Reviewed":"Review cutout":c}
                </button>
                ${(n=this.status)!=null&&n.manageModels?o`<button class="act"
                  title="Use as this model's cover" @click=${()=>this.useAsModelThumb(s)}>
                  <span class="material-symbols-rounded" style="font-size:16px;">photo_camera</span>
                </button>`:c}
                <button class="act" title="Copy this image's generation data"
                  @click=${()=>this.infoFor=this.infoFor===s.id?null:s.id}>
                  <span class="material-symbols-rounded" style="font-size:16px;">content_copy</span>
                </button>
                <button class="act" title="Export PNG with Civitai-compatible metadata"
                  @click=${()=>void this.exportShot(s)}>
                  <span class="material-symbols-rounded" style="font-size:16px;">download</span>
                </button>
              </div>
              ${this.infoFor===s.id?this.renderGenInfo(s):c}
            </div>
          `})}
      </div>
    `}};g.styles=[de,ke,pe`
      :host {
        display: block;
        color: var(--oppai-text);
      }
      .wrap {
        max-width: 1240px;
        margin: 0 auto;
        padding-bottom: 40px;
      }
      /* Camera controls. Two columns in a 300px sidebar: five short selects stacked
         would push everything below them off the screen. */
      .cam-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .cam-wide {
        grid-column: 1 / -1;
      }
      .cam-grid select {
        width: 100%;
        min-width: 0;
      }
      .cam-terms {
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .cam-terms summary {
        cursor: pointer;
      }
      .cam-terms-body {
        display: grid;
        gap: 8px;
        margin-top: 8px;
      }
      .cam-terms pre {
        margin: 3px 0 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 11px;
        line-height: 1.45;
        white-space: pre-wrap;
        word-break: break-word;
        background: var(--oppai-surface-2);
        border-radius: 8px;
        padding: 6px 8px;
      }
      /* Draft-restored notice. */
      .restored {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--oppai-surface-2);
        border-radius: 12px;
        padding: 9px 12px;
        margin: 0 0 16px;
        font-size: 13px;
      }
      .restored .grow {
        flex: 1;
      }
      /* Generation data, under the shot it belongs to. */
      .geninfo {
        margin-top: 8px;
        background: var(--oppai-surface-2);
        border-radius: 12px;
        padding: 10px 12px;
      }
      .geninfo-text {
        margin: 0 0 10px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 11px;
        line-height: 1.5;
        /* The parameters line is long and its line breaks are load-bearing for other
           readers, so it wraps here rather than scrolling — this is for reading a
           value out of, and the copied text keeps the real shape either way. */
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 220px;
        overflow-y: auto;
        user-select: text;
      }
      .geninfo-note {
        margin: 0;
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .geninfo-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .layout {
        display: grid;
        grid-template-columns: 300px minmax(0, 1fr) 300px;
        gap: 20px;
        align-items: start;
      }
      @media (max-width: 1220px) {
        .layout {
          grid-template-columns: 300px minmax(0, 1fr);
        }
        /* The gallery drops under the main column rather than vanishing. */
        .layout > .right {
          grid-column: 2;
        }
      }
      @media (max-width: 940px) {
        .layout {
          grid-template-columns: minmax(0, 1fr);
        }
        .layout > .right {
          grid-column: 1;
        }
      }
      .empty {
        text-align: center;
        padding: 70px 20px;
        color: var(--oppai-text-muted);
      }
      .empty .material-symbols-rounded {
        font-size: 44px;
        display: block;
        margin-bottom: 12px;
      }

      /* Sidebar: stacked, collapsible sections. */
      .side {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .sec {
        background: var(--oppai-surface-2);
        border-radius: 14px;
        overflow: hidden;
      }
      .sec-head {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        border: none;
        background: none;
        color: var(--oppai-text);
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.3px;
        padding: 12px 14px;
        cursor: pointer;
        text-align: left;
      }
      .sec-head .count {
        margin-left: auto;
        font-weight: 400;
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .sec-body {
        padding: 0 12px 12px;
      }
      /* The chevron rotates rather than being swapped for a different glyph: swapping
         the icon replaces the element, which restarts the font's own paint and reads as
         a flicker at the exact moment the section is moving. */
      .sec-chevron {
        transition: transform 0.22s var(--oppai-ease-emphasized);
      }
      .sec-chevron.open {
        transform: rotate(90deg);
      }
      .sec-note {
        font-size: 12px;
        color: var(--oppai-text-muted);
        padding: 0 2px 4px;
      }
      /* A quiet text-button used for reveal toggles (e.g. showing built-in presets). */
      .link-toggle {
        align-self: flex-start;
        margin-top: 6px;
        border: none;
        background: none;
        padding: 2px;
        font: inherit;
        font-size: 12px;
        color: var(--oppai-primary-bright);
        cursor: pointer;
      }
      .link-toggle:hover {
        text-decoration: underline;
      }

      /* Picker cards (models, LoRAs, characters) — a 2-up grid in the sidebar. */
      .cards {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .card-wrap {
        position: relative;
        min-width: 0;
        max-width: 100%;
      }
      .card {
        width: 100%;
        border: 2px solid transparent;
        border-radius: 12px;
        overflow: hidden;
        background: var(--oppai-surface);
        cursor: pointer;
        padding: 0;
        text-align: left;
        transition: transform 0.18s var(--oppai-ease-spring), border-color 0.18s ease;
        min-width: 0;
        max-width: 100%;
        color: var(--oppai-text);
      }
      .card:hover {
        transform: translateY(-2px);
      }
      .card.on {
        border-color: var(--oppai-accent);
      }
      .card-art {
        width: 100%;
        aspect-ratio: 3 / 4;
        object-fit: cover;
        display: block;
        background: var(--oppai-surface-3, var(--oppai-surface-2));
      }
      .card-blank {
        width: 100%;
        aspect-ratio: 3 / 4;
        display: grid;
        place-items: center;
        color: var(--oppai-text-muted);
        background: var(--oppai-surface-3, var(--oppai-surface-2));
      }
      .card-name {
        font-size: 11px;
        padding: 6px 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .card-edit {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 26px;
        height: 26px;
        border-radius: 13px;
        border: none;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        display: grid;
        place-items: center;
        cursor: pointer;
      }
      .card-edit.left {
        right: auto;
        left: 4px;
      }
      .lora-weight {
        width: 100%;
        box-sizing: border-box;
        margin-top: 5px;
        padding: 5px 7px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 8px;
        background: var(--oppai-surface);
        color: var(--oppai-text);
      }
      .pager {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 10px;
        font-size: 12px;
        color: var(--oppai-text-muted);
      }
      .pager button {
        border: 1px solid var(--oppai-border-strong);
        border-radius: 8px;
        background: var(--oppai-surface);
        color: var(--oppai-text);
        padding: 6px 9px;
        cursor: pointer;
      }
      .pager button:disabled { opacity: 0.4; cursor: default; }
      .switch-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 34px;
        font-size: 12px;
        color: var(--oppai-text-dim);
      }

      /* Compact settings rows in the sidebar. */
      .settings {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      .settings .full {
        grid-column: 1 / -1;
      }
      label.field {
        font-size: 12px;
        font-weight: 600;
        color: var(--oppai-text-dim);
        display: block;
        margin-bottom: 6px;
      }
      .num,
      select.num {
        width: 100%;
        box-sizing: border-box;
        background: var(--oppai-surface);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 10px;
        color: var(--oppai-text);
        font: inherit;
        font-size: 13px;
        padding: 8px 10px;
        outline: none;
      }

      /* Template / VAE rows. */
      .rows {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .row-pick {
        border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-surface);
        color: var(--oppai-text);
        border-radius: 10px;
        font: inherit;
        font-size: 13px;
        text-align: left;
        padding: 8px 10px;
        cursor: pointer;
      }
      .row-pick.on {
        border-color: var(--oppai-accent);
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
      }
      .row-sub {
        display: block;
        font-size: 11px;
        opacity: 0.75;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .side-add {
        margin-top: 10px;
        width: 100%;
        height: 36px;
        border: 1px dashed var(--oppai-border-strong);
        border-radius: 10px;
        background: none;
        color: var(--oppai-text-dim);
        font: inherit;
        font-size: 13px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      /* Wildcard lists: a chip per list, the name inserting its reference. */
      .wildcard-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
      .wildcard-chip {
        display: inline-flex; align-items: center; border: 1px solid var(--oppai-border-strong);
        border-radius: 999px; background: var(--oppai-surface-2, rgba(255,255,255,0.04)); overflow: hidden;
      }
      .wildcard-name, .wildcard-edit, .wildcard-ro {
        border: 0; background: none; color: inherit; font: inherit; font-size: 12px; cursor: pointer;
        display: inline-flex; align-items: center; padding: 4px 9px;
      }
      .wildcard-name { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .wildcard-name:hover { background: var(--oppai-hover, rgba(255,255,255,0.06)); }
      .wildcard-edit { padding: 4px 7px 4px 4px; opacity: 0.7; border-left: 1px solid var(--oppai-border-strong); }
      .wildcard-edit:hover { opacity: 1; }
      .wildcard-ro { padding: 4px 7px 4px 4px; opacity: 0.5; cursor: default; }
      .wildcard-text { min-height: 180px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .sec-note code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; }

      /* Prompt block. */
      .prompt-card {
        background: var(--oppai-surface-2);
        border-radius: 18px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .speech-row {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .mic {
        flex: 0 0 auto;
        width: 46px;
        height: 46px;
        border-radius: 23px;
        border: none;
        cursor: pointer;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        display: grid;
        place-items: center;
        transition: transform 0.15s var(--oppai-ease-spring), filter 0.15s ease;
      }
      .mic.live {
        background: var(--oppai-error, #f2b8b5);
        color: #000;
        animation: oppai-pulse 1.1s ease-in-out infinite;
      }
      @keyframes oppai-pulse {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.35); }
      }
      .speech-hint {
        font-size: 13px;
        color: var(--oppai-text-muted);
        flex: 1;
      }
      textarea {
        width: 100%;
        box-sizing: border-box;
        background: var(--oppai-surface);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 12px;
        color: var(--oppai-text);
        font: inherit;
        font-size: 14px;
        padding: 10px 12px;
        resize: vertical;
        min-height: 64px;
        outline: none;
      }
      textarea:focus {
        border-color: var(--oppai-primary);
      }
      .adv-toggle {
        background: none;
        border: none;
        color: var(--oppai-primary-bright);
        font: inherit;
        font-size: 13px;
        cursor: pointer;
        padding: 0;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .chip {
        min-height: 34px;
        padding: 4px 14px;
        border-radius: 17px;
        font-size: 13px;
        font-family: inherit;
        cursor: pointer;
        background: transparent;
        color: var(--oppai-text-dim);
        border: 1px solid var(--oppai-border-strong);
        text-align: center;
      }
      .chip.on {
        background: var(--oppai-accent);
        color: var(--oppai-on-accent);
        border-color: var(--oppai-accent);
      }
      .chip .hint {
        display: block;
        font-size: 10px;
        opacity: 0.75;
      }
      .custom-size {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .custom-size .num {
        width: 90px;
      }
      .generate {
        margin-top: 16px;
        height: 50px;
        width: 100%;
        border: none;
        border-radius: 25px;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .generate:disabled {
        opacity: 0.6;
        cursor: default;
      }

      /* Results. */
      .results {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
        margin-top: 14px;
      }
      .shot {
        border-radius: 16px;
        overflow: hidden;
        background: var(--oppai-surface-2);
        position: relative;
      }
      .shot img {
        width: 100%;
        display: block;
        aspect-ratio: 3 / 4;
        object-fit: cover;
        background: #000;
      }
      .shot-actions {
        display: flex;
        gap: 6px;
        padding: 8px;
      }
      .act {
        flex: 1;
        height: 36px;
        border: none;
        border-radius: 10px;
        background: var(--oppai-surface-3, var(--oppai-surface));
        color: var(--oppai-text);
        font: inherit;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
      .act.primary {
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
      }
      .act:disabled {
        opacity: 0.55;
        cursor: default;
      }
      .editing-bar {
        display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding: 8px 12px;
        border-radius: 10px; border: 1px solid var(--oppai-border-strong);
        background: color-mix(in srgb, var(--oppai-accent, #c58af9) 12%, var(--oppai-surface-2));
        font-size: 12.5px; color: var(--oppai-text-dim);
      }
      .editing-bar .editing-copy { flex: 1; min-width: 0; }
      .editing-bar strong { color: var(--oppai-text); }

      .banner {
        background: var(--oppai-surface-2);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 12px;
        padding: 12px 14px;
        font-size: 13px;
        color: var(--oppai-text-dim);
        margin-top: 12px;
      }
      .section-label {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        color: var(--oppai-text-muted);
        margin: 22px 0 10px;
      }
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
      .hidden-file {
        display: none;
      }

      /* Character editor dialog. */
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        display: grid;
        place-items: center;
        z-index: 50;
        padding: 20px;
      }
      .dialog {
        background: var(--oppai-surface-2);
        border-radius: 18px;
        padding: 18px;
        width: min(440px, 100%);
        max-height: 90vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .dialog h3 {
        margin: 0;
        font-size: 16px;
      }
      .dialog input[type="text"] {
        width: 100%;
        box-sizing: border-box;
        background: var(--oppai-surface);
        border: 1px solid var(--oppai-border-strong);
        border-radius: 10px;
        color: var(--oppai-text);
        font: inherit;
        font-size: 14px;
        padding: 9px 11px;
        outline: none;
      }
      .dialog-thumb {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .dialog-thumb img {
        width: 72px;
        height: 96px;
        object-fit: cover;
        border-radius: 10px;
        background: var(--oppai-surface);
      }
      .dialog-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .dialog-actions .danger {
        margin-right: auto;
        color: var(--oppai-error, #f2b8b5);
      }
      /* Outfit helper: plain checkbox rows, wide enough to hit on a phone. */
      .switch {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: var(--oppai-text-dim);
        cursor: pointer;
      }
      .switch input {
        accent-color: var(--oppai-primary);
        width: 16px;
        height: 16px;
      }
      /* ── The equipment loadout ─────────────────────────────────────────────
         Ten slots, built from the same materials as every other panel in the
         app: its surfaces, its radii, its accent for the equipped state.

         It used to be drawn as a 16-bit console menu — fixed palette, monospace
         type, square bevels, a paper doll between two columns of cells. That
         cannot survive a sidebar. The three-column grid needed ~280px before
         padding, so it overflowed the panel it lives in, and the borrowed
         palette made the one part of the studio you actually type into look
         like a different program embedded in the page.

         So each slot is one row instead: icon, name, then colour and garment
         side by side. Colour leads because that is the order the prompt is
         built in, and it is narrower because it is a modifier on the garment
         beside it. Ten rows stack in any sidebar width without a media query. */
      .loadout-board {
        margin-top: 4px;
        padding: 10px;
        border: 1px solid var(--oppai-border);
        border-radius: 12px;
        background: var(--oppai-surface);
      }
      .loadout-heading {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 9px;
        color: var(--oppai-text-dim);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.7px;
        text-transform: uppercase;
      }
      .loadout-heading .equipped-count {
        margin-left: auto;
        color: var(--oppai-text-muted);
        font-weight: 600;
        letter-spacing: 0.3px;
        font-variant-numeric: tabular-nums;
      }
      .loadout-clear {
        border: 1px solid var(--oppai-border-strong);
        border-radius: 999px;
        padding: 3px 10px;
        background: transparent;
        color: var(--oppai-text-dim);
        font: inherit;
        font-size: 11px;
        letter-spacing: 0.2px;
        text-transform: none;
        cursor: pointer;
      }
      .loadout-clear:hover:not(:disabled) {
        border-color: var(--oppai-primary);
        color: var(--oppai-primary-bright);
      }
      .loadout-clear:disabled { opacity: 0.45; cursor: default; }
      .loadout-slots { display: grid; gap: 6px; }
      /* One equipped piece. The whole row tints when it holds something, which is
         the single fact worth reading at a glance down ten of them. */
      .gear-slot {
        display: grid;
        /* Three columns now: the icon, the fields, and the button that opens the
           prompt-wording editor. The editor itself spans the lot on its own row. */
        grid-template-columns: 28px minmax(0, 1fr) 22px;
        gap: 3px 8px;
        min-width: 0;
        padding: 6px 8px;
        border: 1px solid var(--oppai-border);
        border-radius: 10px;
        background: var(--oppai-surface-2);
        transition: border-color 0.14s, background 0.14s;
      }
      .gear-slot.filled {
        border-color: color-mix(in srgb, var(--oppai-primary) 55%, transparent);
        background: color-mix(in srgb, var(--oppai-primary-container) 30%, var(--oppai-surface-2));
      }
      .gear-slot-icon {
        grid-row: 1 / 3;
        align-self: center;
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: var(--oppai-surface);
        color: var(--oppai-text-muted);
        font-size: 17px;
      }
      .gear-slot.filled .gear-slot-icon {
        background: color-mix(in srgb, var(--oppai-primary) 22%, transparent);
        color: var(--oppai-primary-bright);
      }
      .gear-slot-name {
        overflow: hidden;
        color: var(--oppai-text-muted);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.6px;
        line-height: 1.2;
        text-overflow: ellipsis;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .gear-slot.filled .gear-slot-name { color: var(--oppai-text-dim); }
      /* The prompt-wording toggle. Quiet until the slot has actually been renamed,
         because for most wardrobes the built-in words are right and a lit button on
         all ten slots would read as ten things needing attention. */
      .gear-slot-prompt {
        grid-column: 3;
        grid-row: 1;
        display: grid;
        place-items: center;
        width: 22px;
        height: 20px;
        padding: 0;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--oppai-text-muted);
        cursor: pointer;
        opacity: 0.55;
        transition: opacity 0.14s, color 0.14s, background 0.14s;
      }
      .gear-slot-prompt .material-symbols-rounded { font-size: 15px; }
      .gear-slot-prompt:hover:not(:disabled) { opacity: 1; background: var(--oppai-surface); }
      .gear-slot-prompt.on { opacity: 1; color: var(--oppai-primary-bright); }
      .gear-slot-prompt.open { opacity: 1; background: var(--oppai-surface); color: var(--oppai-text); }
      .gear-slot-prompt:disabled { opacity: 0.25; cursor: default; }
      .gear-prompt-edit {
        grid-column: 1 / -1;
        display: grid;
        gap: 6px;
        margin-top: 5px;
        padding-top: 7px;
        border-top: 1px dashed var(--oppai-border);
      }
      .gear-prompt-edit label {
        display: grid;
        gap: 2px;
        color: var(--oppai-text-muted);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      .gear-prompt-edit input {
        min-width: 0;
        padding: 5px 7px;
        border: 1px solid var(--oppai-border);
        border-radius: 7px;
        background: var(--oppai-surface);
        color: var(--oppai-text);
        font: inherit;
        font-size: 12px;
        letter-spacing: normal;
        text-transform: none;
      }
      .gear-prompt-preview {
        margin: 0;
        color: var(--oppai-text-muted);
        font-size: 11px;
        line-height: 1.45;
        overflow-wrap: anywhere;
      }
      .gear-prompt-preview code {
        padding: 1px 4px;
        border-radius: 4px;
        background: var(--oppai-surface);
        color: var(--oppai-text-dim);
        font-size: 10.5px;
      }
      .gear-prompt-reset {
        justify-self: start;
        padding: 4px 9px;
        border: 1px solid var(--oppai-border);
        border-radius: 999px;
        background: transparent;
        color: var(--oppai-text-muted);
        cursor: pointer;
        font-size: 11px;
      }
      .gear-prompt-reset:hover:not(:disabled) { color: var(--oppai-text); border-color: var(--oppai-border-strong); }
      /* Colour is the narrower of the two fields for the same reason it comes
         first: it modifies the garment named beside it. */
      .gear-slot-fields {
        display: grid;
        grid-template-columns: minmax(0, 0.68fr) minmax(0, 1fr);
        gap: 6px;
        min-width: 0;
      }
      .gear-slot input {
        min-width: 0;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--oppai-border);
        border-radius: 8px;
        outline: 0;
        background: var(--oppai-surface);
        color: var(--oppai-text);
        font: inherit;
        font-size: 12px;
        padding: 5px 7px;
      }
      .gear-color { color: var(--oppai-primary-bright); }
      .gear-slot input::placeholder { color: var(--oppai-text-muted); }
      .gear-slot input:focus { border-color: var(--oppai-primary); }
      .gear-slot input:disabled { opacity: 0.5; }
      /* Saved recipes, as a picture grid. Text cannot tell ten garment descriptions
         apart at a glance; a thumbnail of the outfit can, which is the entire reason
         a loadout carries one. */
      .loadout-cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
        gap: 8px;
        margin: 8px 0;
      }
      .loadout-card {
        position: relative;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 10px;
        background: var(--oppai-surface);
        overflow: hidden;
      }
      .loadout-card.on { border-color: var(--oppai-primary); }
      .loadout-card .card-hit {
        display: block;
        width: 100%;
        padding: 0 0 6px;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .loadout-card .card-hit:disabled { cursor: default; opacity: 0.6; }
      .loadout-card .cover {
        display: block;
        width: 100%;
        aspect-ratio: 3 / 4;
        object-fit: cover;
        object-position: top center;
        background: var(--oppai-surface-2);
      }
      .loadout-card .cover-empty {
        display: grid;
        place-items: center;
        font-size: 30px;
        color: var(--oppai-text-muted);
      }
      .loadout-card .card-name {
        display: block;
        padding: 6px 8px 0;
        font-size: 11px;
        line-height: 1.25;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .loadout-card .worn-badge {
        position: absolute;
        top: 5px;
        left: 5px;
        padding: 2px 6px;
        border-radius: 6px;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        font-size: 9px;
        font-weight: 700;
      }
      .loadout-card .card-del {
        position: absolute;
        top: 4px;
        right: 4px;
        display: grid;
        place-items: center;
        padding: 3px;
        border: 0;
        border-radius: 6px;
        background: color-mix(in srgb, var(--oppai-surface) 78%, transparent);
        color: var(--oppai-text-muted);
        cursor: pointer;
        opacity: 0;
      }
      .loadout-card:hover .card-del,
      .loadout-card:focus-within .card-del { opacity: 1; }
      .loadout-card .card-del:hover { color: var(--oppai-error, #f2b8b5); }
      .exposure-note {
        margin-top: 8px;
        padding: 8px 9px;
        border-left: 3px solid #bd67ee;
        background: color-mix(in srgb, var(--oppai-surface) 84%, #6c267c);
        color: var(--oppai-text-dim);
        font-size: 11px;
        line-height: 1.35;
      }
      .outfit-actions { display: grid; gap: 7px; margin-top: 8px; }
      .outfit-actions .side-add { margin-top: 0; }
      .outfit-actions .primary {
        border-style: solid;
        border-color: var(--oppai-primary);
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
      }
      .outfit-actions button:disabled { opacity: 0.5; cursor: default; }
      .cutout-dialog {
        width: min(980px, 100%);
        max-height: 96vh;
      }
      /* The checkerboard is the point: transparency has to be visible to be judged. */
      .cutout-canvas {
        display: grid;
        place-items: center;
        min-height: min(560px, 60vh);
        max-height: 68vh;
        overflow: auto;
        border-radius: 12px;
        background-color: #6b6b6b;
        background-image:
          linear-gradient(45deg, #4a4a4a 25%, transparent 25%, transparent 75%, #4a4a4a 75%),
          linear-gradient(45deg, #4a4a4a 25%, transparent 25%, transparent 75%, #4a4a4a 75%);
        background-size: 20px 20px;
        background-position: 0 0, 10px 10px;
      }
      .cutout-canvas.contrast {
        background-color: #ff00d4;
        background-image: none;
      }
      .cutout-canvas canvas {
        max-width: none;
        max-height: none;
        object-fit: contain;
      }
      .cut-zoom {
        display: grid;
        grid-template-columns: auto minmax(100px, 1fr) auto;
        gap: 8px;
        align-items: center;
        width: 100%;
      }
      .cut-zoom output {
        min-width: 44px;
        text-align: right;
        color: var(--oppai-text-muted);
        font-size: 12px;
        font-variant-numeric: tabular-nums;
      }
      .cutout-dialog input[type="range"] {
        width: 100%;
        accent-color: var(--oppai-primary);
      }
      /* The cursor is the only affordance saying what a click will do, so it changes
         with the tool: an eyedropper for sampling a colour, a crosshair for painting. */
      .cutout-canvas.picking canvas {
        cursor: crosshair;
      }
      .cutout-canvas.brushing canvas {
        cursor: cell;
      }
      /* While the "before" is held, the canvas is read-only — showing it as such stops
         a click from feeling ignored. */
      .cutout-canvas.before canvas {
        cursor: not-allowed;
        outline: 2px solid var(--oppai-primary-bright);
        outline-offset: -2px;
      }
      /* Painting drags across the canvas; without this the browser starts a text or
         image selection instead and the stroke breaks up. */
      .cutout-canvas canvas {
        touch-action: none;
        user-select: none;
        -webkit-user-drag: none;
      }
      .cut-row {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }
      .cut-stat {
        flex: 1;
        font-size: 12px;
        color: var(--oppai-text-muted);
        font-variant-numeric: tabular-nums;
      }
      .cut-check {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        font-size: 13px;
      }
      .cut-check input {
        margin-top: 2px;
        accent-color: var(--oppai-primary);
        flex-shrink: 0;
      }
      .cut-hint {
        font-size: 12px;
        color: var(--oppai-text-muted);
        line-height: 1.45;
      }
      .btn {
        border: none;
        border-radius: 10px;
        background: var(--oppai-surface-3, var(--oppai-surface));
        color: var(--oppai-text);
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        padding: 9px 14px;
        cursor: pointer;
      }
      .btn.primary {
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
      }
      .btn:disabled {
        opacity: 0.55;
        cursor: default;
      }

      /* ── The studio ───────────────────────────────────────────────────────── */
      .studio-views { display: flex; gap: 4px; margin-left: 4px; }
      .studio-view {
        display: inline-flex; align-items: center; gap: 6px;
        border: 1px solid transparent; border-radius: 999px; padding: 5px 12px;
        background: transparent; color: var(--oppai-text-muted); font: inherit; font-size: 12px; font-weight: 650; cursor: pointer;
      }
      .studio-view:hover { color: var(--oppai-text); }
      .studio-view.on { background: var(--oppai-surface); border-color: var(--oppai-border-strong); color: var(--oppai-text); }
      .studio-view-sub { font-weight: 500; color: var(--oppai-text-muted); }
      .studio-wardrobe { flex: 1; min-height: 0; overflow: auto; padding: 18px 22px 40px; }
      .side-divider {
        display: flex; align-items: center; gap: 8px; padding: 14px 12px 4px;
        color: var(--oppai-text-muted); font-size: 10px; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase;
      }
      .side-divider::before, .side-divider::after { content: ""; flex: 1; height: 1px; background: var(--oppai-border); }
      .gear-slot .gear-slot-icon { border: 0; cursor: pointer; font: inherit; font-family: "Material Symbols Rounded"; }
      .gear-slot .gear-slot-icon.inert { cursor: default; }
      .gear-slot.off { opacity: 0.55; }
      .gear-slot.off input { text-decoration: line-through; }
      textarea.num.extras { resize: vertical; min-height: 54px; font-size: 12px; line-height: 1.4; }
      .studio-toolbar { gap: 10px; }
      .wardrobe-pick { display: inline-flex; align-items: center; gap: 6px; min-width: 0; color: var(--oppai-text-dim); }
      .wardrobe-pick select {
        max-width: 220px; min-width: 0; border: 1px solid var(--oppai-border); border-radius: 8px; padding: 5px 8px;
        background: var(--oppai-surface-2); color: var(--oppai-text); font: inherit; font-size: 12px;
      }
      .sheet-tabs { display: inline-flex; gap: 2px; padding: 2px; border-radius: 999px; background: var(--oppai-surface-2); }
      .sheet-tab {
        border: 0; border-radius: 999px; padding: 4px 12px; background: transparent; color: var(--oppai-text-muted);
        font: inherit; font-size: 12px; font-weight: 650; cursor: pointer;
      }
      .sheet-tab.on { background: var(--oppai-primary); color: var(--oppai-on-primary); }
      .sheet-tab-count { font-weight: 500; opacity: 0.8; font-variant-numeric: tabular-nums; }
      .zoom-tabs { display: inline-flex; gap: 2px; }
      .zoom-tab {
        min-width: 26px; padding: 0 6px; height: 24px; border: 1px solid var(--oppai-border); border-radius: 6px; background: transparent;
        color: var(--oppai-text-muted); font: inherit; font-size: 11px; font-weight: 700; cursor: pointer;
      }
      .zoom-tab.on { background: var(--oppai-surface); color: var(--oppai-text); border-color: var(--oppai-border-strong); }
      /* The expression matrix: rows are heat tiers, columns are expressions, both
         headers sticky so a wide sheet scrolled to the edge still says where you are. */
      .face-matrix {
        display: grid;
        grid-template-columns: 92px repeat(${O.length}, var(--cell, 88px));
        gap: 6px;
        align-items: stretch;
        width: max-content;
        min-width: 100%;
      }
      .face-matrix.fit { grid-template-columns: 92px repeat(${O.length}, minmax(0, 1fr)); width: 100%; min-width: 0; }
      .face-matrix.fit .matrix-col-head { font-size: 10px; padding: 4px 2px; }
      .face-matrix.fit .cell-foot { padding: 3px 4px; font-size: 9px; }
      .matrix-corner { position: sticky; top: 0; left: 0; z-index: 3; background: color-mix(in srgb, var(--oppai-bg) 82%, #000); }
      .matrix-col-head {
        position: sticky; top: 0; z-index: 2; padding: 6px 4px; text-align: center;
        background: color-mix(in srgb, var(--oppai-bg) 82%, #000);
        color: var(--oppai-text-dim); font-size: 11px; font-weight: 700; letter-spacing: 0.3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .matrix-row-head {
        position: sticky; left: 0; z-index: 2; display: flex; flex-direction: column; justify-content: center; gap: 2px; padding: 8px;
        border-radius: 10px; background: var(--oppai-surface); border: 1px solid var(--oppai-border);
        color: var(--oppai-text-dim); font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
      }
      .matrix-row-count { color: var(--oppai-text-muted); font-weight: 600; font-variant-numeric: tabular-nums; text-transform: none; }
      .sheet-note { margin: 0; padding: 8px 12px 0; color: var(--oppai-text-muted); font-size: 12px; }
      .sheet-cell.empty .art-empty { color: var(--oppai-text-muted); }
      .sheet-cell.current .art-empty { color: var(--oppai-primary-bright); }
      .sheet-cell .cell-foot { display: flex; align-items: center; gap: 4px; padding: 4px 6px; font-size: 10px; font-weight: 650; }
      .sheet-cell .cell-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .cell-state.stale { background: #d9a441; }
      .sheet-grid { grid-template-columns: repeat(auto-fill, minmax(calc(var(--cell, 88px) + 30px), 1fr)); }
      /* The focus panel. */
      .studio-focus { display: flex; flex-direction: column; }
      .focus-scroll { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
      .focus-art {
        flex: 0 0 auto; width: 100%; aspect-ratio: 3 / 4; box-sizing: border-box; border-radius: 12px; overflow: hidden; display: grid; place-items: center;
        border: 1px solid var(--oppai-border); background-color: #6b6b6b;
        background-image: linear-gradient(45deg, #5a5a5a 25%, transparent 25%), linear-gradient(-45deg, #5a5a5a 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #5a5a5a 75%), linear-gradient(-45deg, transparent 75%, #5a5a5a 75%);
        background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0;
      }
      .focus-art img { width: 100%; height: 100%; object-fit: contain; display: block; }
      .focus-empty { display: grid; place-items: center; gap: 6px; color: rgba(255,255,255,.7); font-size: 12px; text-align: center; }
      .focus-empty .material-symbols-rounded { font-size: 30px; }
      .focus-title { display: grid; gap: 3px; }
      .focus-title strong { font-size: 14px; }
      .focus-status { font-size: 12px; color: var(--oppai-text-muted); }
      .focus-status.ready { color: #6fcf8a; }
      .focus-status.needs { color: #d9a441; }
      .focus-status.stale { color: #d9a441; }
      .focus-actions { display: grid; gap: 6px; }
      .focus-actions .btn { justify-content: flex-start; width: 100%; box-sizing: border-box; }
      .focus-actions .btn.danger { color: var(--oppai-error, #f2b8b5); }
      .focus-actions label.btn.disabled { opacity: 0.55; pointer-events: none; }
      .focus-meta { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; color: var(--oppai-text-muted); font-size: 11px; }
      .focus-meta span { display: inline-flex; align-items: center; gap: 3px; }
      .link-btn { border: 0; background: none; padding: 0; color: var(--oppai-primary-bright); font: inherit; font-size: 11px; cursor: pointer; }
      .link-btn:disabled { opacity: 0.5; cursor: default; }
      .focus-prompt { display: grid; gap: 6px; }
      .focus-tag { font-size: 10px; font-weight: 700; letter-spacing: .55px; text-transform: uppercase; color: var(--oppai-text-muted); }
      .focus-tag.negative { color: var(--oppai-error, #f2b8b5); }
      .focus-prompt pre { margin: 0; padding: 8px; border-radius: 8px; background: var(--oppai-surface); font-size: 11px; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 220px; overflow: auto; }
      /* The batch bar. */
      .batch-bar {
        flex: 0 0 auto; display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; padding: 10px 12px;
        background: var(--oppai-surface-2); border-top: 1px solid var(--oppai-border-strong);
      }
      .batch-progress { flex: 1 1 260px; min-width: 200px; display: grid; gap: 4px; }
      .batch-track { position: relative; height: 6px; border-radius: 3px; background: var(--oppai-surface); overflow: hidden; }
      .batch-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 3px; transition: width .3s ease; }
      .batch-fill.made { background: color-mix(in srgb, var(--oppai-primary) 45%, transparent); }
      .batch-fill.reviewed { background: var(--oppai-primary); z-index: 1; }
      .batch-count { color: var(--oppai-text-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
      .batch-count em { font-style: normal; color: #d9a441; }
      .batch-note { flex-basis: 100%; color: var(--oppai-text-muted); font-size: 11px; }
      .switch.compact { margin: 0; font-size: 12px; white-space: nowrap; }

      /* ── The outfit contact sheet ──────────────────────────────────────────
         Sixty squares are a set, not sixty independent pictures, so the studio
         lays them out as the wardrobe grid they will become: one row per heat
         tier, expressions in the same order everywhere else uses them, and a
         cell for every slot whether or not it has art yet.

         The free-floating draggable nodes the Create screen uses are right for
         a handful of variations and wrong for this — twelve columns of them
         had to be dragged into place by hand to be compared at all, and the
         gaps in a set are exactly what you need to see. Here an empty cell is
         a real cell: it says which square is missing and clicking it aims the
         generator at that slot. */
      .outfit-sheet { display: grid; gap: 12px; }
      .sheet-tier {
        border: 1px solid var(--oppai-border);
        border-radius: 14px;
        background: var(--oppai-surface);
        overflow: hidden;
      }
      .sheet-tier-head {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-bottom: 1px solid var(--oppai-border);
        color: var(--oppai-text-dim);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.7px;
        text-transform: uppercase;
      }
      .sheet-tier-head .tier-count {
        margin-left: auto;
        color: var(--oppai-text-muted);
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.2px;
        text-transform: none;
      }
      /* The MISC block: a framed group of its own tiers under the sixty. Its rows
         reuse the tier styling so a square reads the same wherever it sits; only the
         frame says these are the optional ones. */
      .sheet-block {
        display: grid;
        gap: 12px;
        padding: 12px;
        margin-top: 6px;
        border: 1px dashed var(--oppai-border);
        border-radius: 16px;
      }
      .sheet-block-head {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        color: var(--oppai-text);
        font-size: 13px;
        font-weight: 700;
      }
      .sheet-block-head .sheet-block-note {
        flex-basis: 100%;
        color: var(--oppai-text-muted);
        font-size: 12px;
        font-weight: 400;
      }
      .sheet-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
        gap: 10px;
        padding: 12px;
      }
      .sheet-cell {
        position: relative;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--oppai-border);
        border-radius: 10px;
        background: var(--oppai-surface-2);
        overflow: hidden;
      }
      .sheet-cell.current {
        border-color: var(--oppai-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--oppai-primary) 28%, transparent);
      }
      .sheet-hit {
        display: block;
        width: 100%;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      /* Reviewed squares are transparent PNGs. A checkerboard behind them is the
         only way the cut edge is visible at thumbnail size. */
      .sheet-cell .art {
        display: block;
        width: 100%;
        aspect-ratio: 3 / 4;
        object-fit: contain;
        background-color: #6b6b6b;
        background-image:
          linear-gradient(45deg, #565656 25%, transparent 25%, transparent 75%, #565656 75%),
          linear-gradient(45deg, #565656 25%, transparent 25%, transparent 75%, #565656 75%);
        background-size: 14px 14px;
        background-position: 0 0, 7px 7px;
      }
      .sheet-cell .art-empty {
        display: grid;
        place-items: center;
        aspect-ratio: 3 / 4;
        border-radius: 9px;
        border: 1px dashed var(--oppai-border-strong);
        margin: 4px;
        color: var(--oppai-text-muted);
        font-size: 11px;
      }
      .sheet-cell .cell-label {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 6px 8px;
        border-top: 1px solid var(--oppai-border);
        color: var(--oppai-text-dim);
        font-size: 11px;
      }
      .sheet-cell .cell-label span:first-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Two states worth distinguishing, and only two: a square that still needs
         its cutout looked at, and one that is finished. */
      .cell-state {
        flex: 0 0 auto;
        margin-left: auto;
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .cell-state.needs { background: #f5c469; }
      .cell-state.ready { background: #6ef7a5; }
      .sheet-actions {
        position: absolute;
        top: 5px;
        right: 5px;
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.12s;
      }
      .sheet-cell:hover .sheet-actions,
      .sheet-cell:focus-within .sheet-actions { opacity: 1; }
      .sheet-act {
        display: grid;
        place-items: center;
        padding: 4px;
        border: 0;
        border-radius: 7px;
        background: rgba(0, 0, 0, 0.62);
        color: #fff;
        cursor: pointer;
      }
      .sheet-act:hover { background: rgba(0, 0, 0, 0.85); }
      .sheet-act.danger:hover { color: var(--oppai-error, #f2b8b5); }
      /* The sheet scrolls as a document; the blueprint grid belongs to the free
         canvas it replaces. */
      .canvas-stage.sheet {
        display: block;
        padding: 14px;
        background-image: none;
      }

      /* Result lightbox. */
      .lightbox {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.85);
        z-index: 60;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 14px;
        padding: 20px;
      }
      .lightbox img {
        max-width: min(96vw, 1400px);
        max-height: 82vh;
        object-fit: contain;
        border-radius: 10px;
      }
      .lightbox .row {
        display: flex;
        gap: 10px;
      }

      /* Model/LoRA edit dialog fields. */
      .meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .meta-grid .full {
        grid-column: 1 / -1;
      }
      .topline {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 14px;
      }
      .topline .spacer {
        flex: 1;
      }
      .ghost {
        border: 1px solid var(--oppai-border-strong);
        background: transparent;
        color: var(--oppai-text-dim);
        border-radius: 12px;
        font: inherit;
        font-size: 13px;
        padding: 8px 14px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      /* Invoke-style generation workspace. OppaiLib still owns the palette, type and
         controls; this only adopts the productive three-pane studio geometry. */
      .wrap {
        width: 100%;
        max-width: none;
        height: 100%;
        min-height: 0;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      :host {
        height: 100%;
        min-height: 0;
        overflow: hidden;
      }
      .workspace {
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: var(--oppai-bg);
      }
      .workspace-bar {
        height: 48px;
        flex: 0 0 48px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 12px;
        box-sizing: border-box;
        background: var(--oppai-surface-2);
        border-bottom: 1px solid var(--oppai-border-strong);
      }
      .workspace-tab {
        align-self: stretch;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 0 8px;
        border-bottom: 2px solid var(--oppai-primary);
        color: var(--oppai-text);
        font-size: 13px;
        font-weight: 700;
      }
      .workspace-context {
        margin-left: auto;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .backend-pill,
      .model-pill {
        min-width: 0;
        height: 30px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 0 10px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 8px;
        color: var(--oppai-text-dim);
        font-size: 11px;
        white-space: nowrap;
      }
      .model-pill {
        max-width: 280px;
      }
      .model-pill span:last-child {
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--oppai-primary);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--oppai-primary) 18%, transparent);
      }
      .workspace-bar .ghost {
        height: 32px;
        padding: 0 10px;
        border-radius: 8px;
        font-size: 12px;
      }
      .layout {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: 296px minmax(420px, 1fr) 316px;
        gap: 0;
        align-items: stretch;
      }
      .layout.no-gallery {
        grid-template-columns: 296px minmax(420px, 1fr);
      }
      /* The studio's panels carry more than the Create screen's: ten equipment rows
         with two fields each on the left, and a gallery being picked over on the
         right. Both get room here rather than being asked to wrap inside 296px. */
      .layout.studio { grid-template-columns: 350px minmax(380px, 1fr) 300px; }
      .side,
      .right {
        min-width: 0;
        min-height: 0;
        background: var(--oppai-surface-2);
      }
      .side {
        display: flex;
        flex-direction: column;
        gap: 0;
        border-right: 1px solid var(--oppai-border-strong);
      }
      .right {
        grid-column: auto;
        border-left: 1px solid var(--oppai-border-strong);
        overflow: hidden;
      }
      .panel-heading {
        height: 42px;
        flex: 0 0 42px;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        border-bottom: 1px solid var(--oppai-border);
        color: var(--oppai-text-dim);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.7px;
        text-transform: uppercase;
      }
      .panel-scroll {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
      }
      .sec {
        border-radius: 0;
        background: transparent;
        border-bottom: 1px solid var(--oppai-border);
      }
      .sec-head {
        min-height: 42px;
        padding: 9px 12px;
      }
      .sec-body {
        padding: 0 12px 14px;
      }
      .sec-models .cards {
        grid-template-columns: 1fr;
        gap: 7px;
      }
      .sec-models .card {
        display: grid;
        grid-template-columns: 52px minmax(0, 1fr);
        align-items: center;
        border-width: 1px;
        border-color: var(--oppai-border);
        border-radius: 9px;
      }
      .sec-models .card-art,
      .sec-models .card-blank {
        width: 52px;
        height: 52px;
        aspect-ratio: 1;
      }
      .sec-models .card-name {
        padding: 7px 9px;
        font-size: 12px;
      }
      .sec-models .card:hover {
        transform: none;
        border-color: var(--oppai-border-strong);
      }
      .sec-models .card.on {
        border-color: var(--oppai-primary);
        background: color-mix(in srgb, var(--oppai-primary-container) 48%, var(--oppai-surface));
      }
      .workbench {
        min-width: 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: color-mix(in srgb, var(--oppai-bg) 82%, #000);
      }
      .canvas-toolbar {
        height: 42px;
        flex: 0 0 42px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        box-sizing: border-box;
        border-bottom: 1px solid var(--oppai-border);
        background: var(--oppai-surface);
        color: var(--oppai-text-muted);
        font-size: 11px;
        font-variant-numeric: tabular-nums;
      }
      .canvas-toolbar .canvas-name {
        color: var(--oppai-text);
        font-weight: 700;
      }
      .toolbar-spacer { flex: 1; }
      .toolbar-stat {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }
      .toolbar-clear {
        border: 0;
        background: transparent;
        color: var(--oppai-text-muted);
        font: inherit;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        padding: 5px 7px;
        border-radius: 7px;
      }
      .toolbar-clear:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .canvas-stage {
        position: relative;
        flex: 1;
        min-height: 260px;
        overflow: auto;
        display: grid;
        place-items: start;
        padding: 22px;
        box-sizing: border-box;
        background-image:
          linear-gradient(color-mix(in srgb, var(--oppai-border) 34%, transparent) 1px, transparent 1px),
          linear-gradient(90deg, color-mix(in srgb, var(--oppai-border) 34%, transparent) 1px, transparent 1px);
        background-size: 24px 24px;
      }
      .canvas-empty {
        width: min(420px, 88%);
        min-height: 260px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 1px dashed var(--oppai-border-strong);
        border-radius: 14px;
        background: color-mix(in srgb, var(--oppai-surface) 78%, transparent);
        color: var(--oppai-text-muted);
        text-align: center;
        padding: 28px;
        box-sizing: border-box;
        place-self: center;
      }
      .canvas-empty .material-symbols-rounded { font-size: 38px; }
      .canvas-empty strong { color: var(--oppai-text-dim); font-size: 14px; }
      .canvas-empty span:last-child { max-width: 300px; font-size: 12px; line-height: 1.5; }
      .generating-overlay {
        position: absolute;
        inset: 0;
        z-index: 3;
        display: grid;
        place-items: center;
        background: color-mix(in srgb, var(--oppai-bg) 58%, transparent);
        backdrop-filter: blur(2px);
      }
      .generating-card {
        display: grid;
        gap: 10px;
        padding: 12px 16px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 12px;
        background: var(--oppai-surface-2);
        box-shadow: 0 10px 30px rgba(0,0,0,.3);
        font-size: 13px;
        font-weight: 600;
        max-width: min(92%, 420px);
      }
      .generating-card.with-preview { padding: 10px; }
      .progress-preview {
        display: block;
        width: 100%;
        max-height: 52vh;
        object-fit: contain;
        border-radius: 8px;
        background: #000;
        image-rendering: auto;
      }
      .progress-row { display: flex; align-items: center; gap: 10px; }
      .progress-label { flex: 1; min-width: 0; }
      .progress-cancel {
        display: inline-flex; align-items: center; gap: 4px;
        border: 1px solid var(--oppai-border-strong); border-radius: 999px;
        padding: 5px 12px 5px 8px; background: transparent; color: inherit;
        font: inherit; font-size: 12px; cursor: pointer;
      }
      .progress-cancel:hover:not(:disabled) { background: color-mix(in srgb, var(--oppai-error, #f66) 18%, transparent); }
      .progress-cancel:disabled { opacity: .5; cursor: default; }
      .progress-bar { height: 4px; border-radius: 2px; background: var(--oppai-border); overflow: hidden; }
      .progress-bar span { display: block; height: 100%; background: var(--oppai-primary); transition: width .4s ease; }
      .prompt-dock {
        flex: 0 0 auto;
        padding: 10px 12px 12px;
        background: var(--oppai-surface-2);
        border-top: 1px solid var(--oppai-border-strong);
      }
      .prompt-card {
        border: 1px solid var(--oppai-border-strong);
        border-radius: 12px;
        background: var(--oppai-surface);
        padding: 10px;
        gap: 9px;
        box-shadow: 0 5px 18px rgba(0,0,0,.16);
      }
      .prompt-head {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 24px;
      }
      .prompt-title {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .65px;
        text-transform: uppercase;
        color: var(--oppai-text-dim);
      }
      .prompt-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.45fr) minmax(180px, .75fr);
        gap: 8px;
      }
      .prompt-field {
        position: relative;
      }
      .prompt-field textarea {
        min-height: 76px;
        max-height: 180px;
        resize: vertical;
        border-radius: 8px;
        padding-top: 25px;
        font-size: 13px;
      }
      .field-tag {
        position: absolute;
        z-index: 1;
        top: 7px;
        left: 10px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .55px;
        text-transform: uppercase;
        color: var(--oppai-text-muted);
        pointer-events: none;
      }
      .field-tag.negative { color: var(--oppai-error, #f2b8b5); }
      .prompt-footer {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .prompt-summary {
        color: var(--oppai-text-muted);
        font-size: 11px;
        white-space: nowrap;
      }
      .prompt-footer .generate.cancel { background: var(--oppai-surface-3, var(--oppai-surface-2)); color: var(--oppai-text); border: 1px solid var(--oppai-border-strong); }
      .prompt-footer .generate {
        width: auto;
        min-width: 142px;
        height: 40px;
        margin: 0 0 0 auto;
        padding: 0 18px;
        border-radius: 9px;
        font-size: 13px;
      }
      .speech-row { min-height: 24px; gap: 7px; }
      .speech-hint { font-size: 11px; }
      .mic {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        background: var(--oppai-surface-3, var(--oppai-surface-2));
        color: var(--oppai-text-dim);
      }
      .mic .material-symbols-rounded { font-size: 18px; }
      .prompt-options {
        max-height: 220px;
        overflow-y: auto;
        padding: 9px;
        border: 1px solid var(--oppai-border);
        border-radius: 8px;
        background: var(--oppai-surface-2);
      }
      .results {
        width: 100%;
        min-width: 100%;
        min-height: 100%;
        position: relative;
        margin: 0;
      }
      .shot {
        position: absolute;
        width: min(260px, calc(100vw - 56px));
        border: 1px solid var(--oppai-border-strong);
        border-radius: 10px;
        box-shadow: 0 12px 38px rgba(0,0,0,.32);
      }
      .shot.active { z-index: 2; box-shadow: 0 18px 48px rgba(0,0,0,.46); }
      .node-handle {
        height: 30px;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 9px;
        border-bottom: 1px solid var(--oppai-border);
        background: var(--oppai-surface-3, var(--oppai-surface-2));
        color: var(--oppai-text-muted);
        font-size: 11px;
        cursor: grab;
        touch-action: none;
        user-select: none;
      }
      .node-handle:active { cursor: grabbing; }
      .node-handle .node-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .shot img {
        width: 100%;
        height: auto;
        max-height: 360px;
        min-height: 140px;
        margin: 0 auto;
        aspect-ratio: auto;
        object-fit: contain;
      }
      .shot-actions {
        justify-content: center;
        flex-wrap: wrap;
        border-top: 1px solid var(--oppai-border);
        background: var(--oppai-surface-2);
      }
      .shot-slot {
        padding: 8px 10px 0;
        color: var(--oppai-text-dim);
        font-size: 12px;
        font-weight: 600;
      }
      .shot-actions .act { flex: 0 1 auto; min-width: 36px; }
      .canvas-stage > .banner {
        position: absolute;
        top: 10px;
        left: 50%;
        z-index: 4;
        transform: translateX(-50%);
        margin: 0;
        max-width: min(560px, 90%);
        background: var(--oppai-surface-2);
      }
      .restored {
        position: absolute;
        top: 56px;
        left: 50%;
        z-index: 8;
        width: min(520px, calc(100% - 24px));
        transform: translateX(-50%);
        box-sizing: border-box;
        margin: 0;
        border: 1px solid var(--oppai-border-strong);
        box-shadow: 0 10px 30px rgba(0,0,0,.35);
      }
      @media (max-width: 1240px) {
        .layout { grid-template-columns: 270px minmax(380px, 1fr) 270px; }
        .layout.no-gallery { grid-template-columns: 270px minmax(380px, 1fr); }
        /* Still wider than the Create screen's, but the workbench keeps a usable
           middle: the equipment rows tolerate 330px, a 20-square grid does not
           tolerate 300. */
        .layout.studio { grid-template-columns: 320px minmax(340px, 1fr) 270px; }
        .model-pill { display: none; }
      }
      @media (max-width: 1020px) {
        .wrap { overflow-y: auto; }
        .workspace { height: auto; min-height: 100%; }
        .layout,
        .layout.no-gallery,
        .layout.studio {
          min-height: 0;
          grid-template-columns: 280px minmax(0, 1fr);
        }
        .side { min-height: 720px; }
        .workbench { min-height: 720px; }
        .right {
          grid-column: 1 / -1;
          min-height: 420px;
          border-left: 0;
          border-top: 1px solid var(--oppai-border-strong);
        }
      }
      @media (max-width: 700px) {
        .workspace-bar { padding: 0 8px; }
        .backend-pill { display: none; }
        .workspace-bar .ghost span:last-child { display: none; }
        .layout,
        .layout.no-gallery,
        .layout.studio { display: flex; flex-direction: column; }
        .studio-views { margin-left: 0; }
        .studio-view { padding: 5px 8px; }
        .studio-view-sub { display: none; }
        .side,
        .workbench,
        .right { min-height: 0; border: 0; }
        .side { max-height: 52vh; border-bottom: 1px solid var(--oppai-border-strong); }
        .panel-scroll { max-height: calc(52vh - 42px); }
        .workbench { min-height: 700px; }
        .canvas-stage { min-height: 310px; padding: 12px; }
        .prompt-grid { grid-template-columns: 1fr; }
        .prompt-footer { flex-wrap: wrap; }
        .prompt-summary { order: 3; width: 100%; }
        .prompt-footer .generate { min-width: 126px; }
        .right { min-height: 430px; border-top: 1px solid var(--oppai-border-strong); }
        .shot img { max-height: 52vh; }
      }

      /* ── Create ─────────────────────────────────────────────────────────────
         The rail, a drawer beside the canvas, the recipe over it and the composer
         under it. Declared last so it wins over the shared .layout rules above,
         which still shape the outfit studio. */
      .create-shell {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: 84px minmax(0, 1fr);
        background: var(--oppai-bg);
      }
      .create-shell.drawer-open { grid-template-columns: 84px 340px minmax(0, 1fr); }
      .create-shell.with-gallery { grid-template-columns: 84px minmax(0, 1fr) 300px; }
      .create-shell.drawer-open.with-gallery { grid-template-columns: 84px 340px minmax(0, 1fr) 300px; }
      .drawer-scrim { display: none; }

      .create-rail {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 12px 6px;
        background: var(--oppai-surface);
        border-right: 1px solid var(--oppai-border-strong);
        overflow-y: auto;
        scrollbar-width: none;
      }
      .rail-tab {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 4px 0 6px;
        border: 0;
        background: transparent;
        color: var(--oppai-text-muted);
        font: inherit;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      }
      .rail-icon {
        width: 56px;
        height: 32px;
        display: grid;
        place-items: center;
        border-radius: 16px;
        font-size: 22px;
        transition: background 0.2s var(--oppai-ease-emphasized), color 0.2s ease;
      }
      .rail-tab:hover { color: var(--oppai-text); }
      .rail-tab:hover .rail-icon { background: var(--oppai-surface-2); }
      .rail-tab.on { color: var(--oppai-text); }
      .rail-tab.on .rail-icon {
        background: var(--oppai-primary-container);
        color: var(--oppai-on-primary-container, var(--oppai-text));
      }
      .rail-badge {
        position: absolute;
        top: 0;
        right: 10px;
        min-width: 17px;
        height: 17px;
        padding: 0 5px;
        box-sizing: border-box;
        border-radius: 9px;
        background: var(--oppai-primary);
        color: var(--oppai-on-primary);
        font-size: 10px;
        font-weight: 700;
        line-height: 17px;
        text-align: center;
      }

      .create-drawer {
        min-width: 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: var(--oppai-surface-2);
        border-right: 1px solid var(--oppai-border-strong);
        animation: create-drawer-in 0.22s var(--oppai-ease-emphasized) both;
      }
      @keyframes create-drawer-in {
        from { opacity: 0; transform: translateX(-14px); }
        to { opacity: 1; transform: none; }
      }
      .drawer-head {
        height: 56px;
        flex: 0 0 56px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 8px 0 18px;
        box-sizing: border-box;
        font-size: 16px;
        font-weight: 700;
        border-bottom: 1px solid var(--oppai-border);
      }
      .drawer-head > .material-symbols-rounded { color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .drawer-action {
        width: 36px;
        height: 36px;
        border-radius: 18px;
        border: 0;
        background: transparent;
        color: var(--oppai-text-muted);
        display: grid;
        place-items: center;
        cursor: pointer;
      }
      .drawer-action:hover { background: var(--oppai-surface-3, var(--oppai-surface)); color: var(--oppai-text); }
      .drawer-scroll {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        padding: 14px 16px 24px;
      }
      .pane { margin-bottom: 18px; }
      .pane-title {
        margin: 4px 0 10px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.7px;
        text-transform: uppercase;
        color: var(--oppai-text-muted);
      }
      .picker-search {
        position: relative;
        display: block;
        margin-bottom: 14px;
      }
      .picker-search input {
        width: 100%;
        height: 40px;
        box-sizing: border-box;
        padding: 0 14px 0 38px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 20px;
        background: var(--oppai-surface);
        color: var(--oppai-text);
        font: inherit;
        font-size: 13px;
        outline: none;
      }
      .picker-search input:focus { border-color: var(--oppai-primary); }
      .picker-search .material-symbols-rounded {
        position: absolute;
        left: 12px;
        top: 10px;
        font-size: 20px;
        color: var(--oppai-text-muted);
        pointer-events: none;
      }
      /* Cover cards, two up: a checkpoint or a LoRA is recognised by its picture
         long before its file name. */
      .create-drawer .cards,
      .create-drawer .sec-models .cards {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .create-drawer .card,
      .create-drawer .sec-models .card {
        display: block;
        border: 2px solid transparent;
        border-radius: 16px;
        background: var(--oppai-surface);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
      }
      .create-drawer .card:hover { transform: translateY(-2px); border-color: var(--oppai-border-strong); }
      .create-drawer .card.on,
      .create-drawer .sec-models .card.on {
        border-color: var(--oppai-primary);
        background: var(--oppai-surface);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--oppai-primary) 24%, transparent);
      }
      .create-drawer .card-art,
      .create-drawer .card-blank,
      .create-drawer .sec-models .card-art,
      .create-drawer .sec-models .card-blank {
        width: 100%;
        height: auto;
        aspect-ratio: 3 / 4;
      }
      .create-drawer .card-name,
      .create-drawer .sec-models .card-name {
        padding: 8px 10px 9px;
        font-size: 12px;
        font-weight: 600;
      }
      .create-drawer .lora-weight { border-radius: 10px; }
      .manage-note {
        display: flex;
        gap: 9px;
        margin-top: 14px;
        padding: 11px 12px;
        border-radius: 12px;
        background: color-mix(in srgb, var(--oppai-primary) 10%, var(--oppai-surface));
        border: 1px solid color-mix(in srgb, var(--oppai-primary) 30%, transparent);
        font-size: 12px;
        line-height: 1.5;
        color: var(--oppai-text-dim);
      }
      .manage-note .material-symbols-rounded { font-size: 18px; color: var(--oppai-primary-bright, var(--oppai-primary)); }

      .create-stage {
        min-width: 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: color-mix(in srgb, var(--oppai-bg) 86%, #000);
      }
      .create-gallery { border-left: 1px solid var(--oppai-border-strong); }

      .recipe {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        padding: 10px 14px;
        background: var(--oppai-surface);
        border-bottom: 1px solid var(--oppai-border);
      }
      .recipe-model {
        flex: 0 1 auto;
        min-width: 0;
        max-width: 320px;
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 5px 12px 5px 5px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 16px;
        background: var(--oppai-surface-2);
        color: var(--oppai-text);
        font: inherit;
        text-align: left;
        cursor: pointer;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .recipe-model:hover { border-color: var(--oppai-primary); }
      .recipe-model img,
      .recipe-model-icon {
        flex: 0 0 44px;
        width: 44px;
        height: 44px;
        border-radius: 11px;
        object-fit: cover;
        display: grid;
        place-items: center;
        background: var(--oppai-surface-3, var(--oppai-surface));
        color: var(--oppai-text-muted);
      }
      .recipe-model-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .recipe-kicker {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.55px;
        text-transform: uppercase;
        color: var(--oppai-text-muted);
        white-space: nowrap;
      }
      .recipe-model-name {
        font-size: 14px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .recipe-caret { color: var(--oppai-text-muted); font-size: 20px; }
      .recipe-chips {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 7px;
        overflow-x: auto;
        scrollbar-width: none;
        padding: 2px 0;
      }
      .recipe-chip,
      .recipe-civitai,
      .recipe-ghost {
        flex: 0 0 auto;
        height: 34px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 0 12px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 17px;
        background: transparent;
        color: var(--oppai-text-dim);
        font: inherit;
        font-size: 12.5px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        cursor: pointer;
      }
      .recipe-chip .material-symbols-rounded,
      .recipe-civitai .material-symbols-rounded,
      .recipe-ghost .material-symbols-rounded { font-size: 17px; }
      .recipe-chip:hover,
      .recipe-ghost:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .recipe-chip.on { border-color: var(--oppai-primary); color: var(--oppai-text); }
      .recipe-chip.add { border-style: dashed; }
      .recipe-chip.lora {
        padding: 0;
        gap: 0;
        border-color: color-mix(in srgb, var(--oppai-primary) 50%, transparent);
        background: color-mix(in srgb, var(--oppai-primary) 14%, transparent);
        color: var(--oppai-text);
      }
      .recipe-chip-main,
      .recipe-chip-x {
        height: 100%;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        cursor: pointer;
      }
      .recipe-chip-main { padding: 0 4px 0 11px; }
      .recipe-chip-main b { font-weight: 700; opacity: 0.75; }
      .recipe-chip-x { padding: 0 9px 0 3px; opacity: 0.65; }
      .recipe-chip-x:hover { opacity: 1; }
      .recipe-ghost { width: 34px; padding: 0; justify-content: center; }
      .recipe-civitai {
        border-color: transparent;
        background: var(--oppai-primary-container);
        color: var(--oppai-on-primary-container, var(--oppai-text));
        font-weight: 600;
      }
      .recipe-civitai:hover { filter: brightness(1.08); }

      .create-stage .canvas-stage { padding: 26px; }
      .create-stage .canvas-empty {
        border-radius: 22px;
        border-style: solid;
        border-color: var(--oppai-border);
        background: color-mix(in srgb, var(--oppai-surface) 70%, transparent);
      }

      .create-stage .prompt-dock {
        padding: 12px 16px 16px;
        background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--oppai-surface) 65%, transparent) 40%);
        border-top: 0;
      }
      .composer {
        gap: 10px;
        padding: 12px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 22px;
        background: var(--oppai-surface-2);
        box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.22);
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .composer:focus-within {
        border-color: color-mix(in srgb, var(--oppai-primary) 65%, var(--oppai-border-strong));
        box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.22), 0 0 0 3px color-mix(in srgb, var(--oppai-primary) 14%, transparent);
      }
      .composer-fields {
        display: grid;
        grid-template-columns: minmax(0, 1.7fr) minmax(200px, 0.8fr);
        gap: 10px;
      }
      .composer .prompt-field textarea {
        min-height: 96px;
        max-height: 240px;
        padding: 12px 14px;
        border-radius: 15px;
        border-color: var(--oppai-border);
        background: var(--oppai-surface);
        font-size: 14px;
        line-height: 1.55;
      }
      .composer .prompt-field textarea:focus { border-color: var(--oppai-primary); }
      .composer .prompt-field.negative textarea { padding-top: 29px; font-size: 13px; }
      .composer .field-tag { top: 9px; left: 14px; }
      .trigger-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }
      .trigger-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: var(--oppai-text-muted);
        margin-right: 4px;
      }
      .chip.small { min-height: 28px; padding: 2px 11px; font-size: 12px; border-radius: 14px; }
      .composer-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 46px;
      }
      .composer .mic {
        width: 40px;
        height: 40px;
        border-radius: 20px;
        background: var(--oppai-surface);
        border: 1px solid var(--oppai-border-strong);
      }
      .composer .mic.live { border-color: transparent; }
      .composer .speech-hint { font-size: 13px; }
      .count-seg {
        display: inline-flex;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 13px;
        overflow: hidden;
      }
      .count-seg button {
        width: 38px;
        height: 36px;
        border: 0;
        background: transparent;
        color: var(--oppai-text-dim);
        font: inherit;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }
      .count-seg button + button { border-left: 1px solid var(--oppai-border); }
      .count-seg button:hover:not(:disabled) { background: var(--oppai-surface); }
      .count-seg button.on {
        background: var(--oppai-primary-container);
        color: var(--oppai-on-primary-container, var(--oppai-text));
      }
      .count-seg button:disabled { cursor: default; opacity: 0.5; }
      .composer .prompt-summary { font-size: 12px; }
      .composer .generate {
        width: auto;
        min-width: 176px;
        height: 48px;
        margin: 0 0 0 auto;
        padding: 0 26px;
        border-radius: 24px;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.2px;
        background: linear-gradient(135deg, var(--oppai-primary), color-mix(in srgb, var(--oppai-primary) 62%, var(--oppai-accent, #c58af9)));
        box-shadow: 0 8px 22px color-mix(in srgb, var(--oppai-primary) 34%, transparent);
        transition: transform 0.16s var(--oppai-ease-spring), box-shadow 0.16s ease, filter 0.16s ease;
      }
      .composer .generate:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.06); }
      .composer .generate:disabled { box-shadow: none; }
      .composer .generate.cancel {
        background: var(--oppai-surface);
        color: var(--oppai-text);
        border: 1px solid var(--oppai-border-strong);
        box-shadow: none;
      }

      /* The suggestion list opens upward: the composer sits at the bottom of the
         screen, and a list that opened down would be off it. */
      .complete {
        position: absolute;
        left: 0;
        right: 0;
        bottom: calc(100% + 8px);
        z-index: 20;
        max-height: 340px;
        overflow-y: auto;
        padding: 6px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 16px;
        background: var(--oppai-surface-2);
        box-shadow: 0 16px 44px rgba(0, 0, 0, 0.45);
        animation: oppai-fade-in-up 0.14s ease both;
      }
      .complete-row {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border: 0;
        border-radius: 10px;
        background: transparent;
        color: var(--oppai-text);
        font: inherit;
        font-size: 13px;
        text-align: left;
        cursor: pointer;
      }
      .complete-row.on { background: color-mix(in srgb, var(--oppai-primary) 22%, transparent); }
      /* Danbooru's own colours for its categories, so a character or an artist reads
         as one before its name does. */
      .complete-dot { flex: 0 0 9px; width: 9px; height: 9px; border-radius: 50%; background: #8ab4f8; }
      .complete-dot.cat-1 { background: #f28b82; }
      .complete-dot.cat-3 { background: #c58af9; }
      .complete-dot.cat-4 { background: #81c995; }
      .complete-dot.cat-5 { background: #fdd663; }
      .complete-dot.cat-100 { background: var(--oppai-primary); }
      .complete-dot.cat-lora,
      .complete-dot.cat-wildcard,
      .complete-dot.cat-trigger { border-radius: 3px; }
      .complete-dot.cat-lora { background: var(--oppai-primary); }
      .complete-dot.cat-wildcard { background: #78d9ec; }
      .complete-dot.cat-trigger { background: #fdd663; }
      .complete-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .complete-detail { color: var(--oppai-text-muted); font-size: 11.5px; white-space: nowrap; }
      .complete-count {
        min-width: 38px;
        color: var(--oppai-text-muted);
        font-size: 11.5px;
        font-variant-numeric: tabular-nums;
        text-align: right;
      }
      .complete-hint {
        margin-top: 4px;
        padding: 7px 10px 3px;
        border-top: 1px solid var(--oppai-border);
        color: var(--oppai-text-muted);
        font-size: 11px;
      }

      /* Narrower than a drawer, a canvas and a gallery side by side: the drawer
         floats over the canvas instead of pushing it. */
      @media (max-width: 1240px) {
        .create-shell,
        .create-shell.drawer-open { grid-template-columns: 84px minmax(0, 1fr); position: relative; }
        .create-shell.with-gallery,
        .create-shell.drawer-open.with-gallery { grid-template-columns: 84px minmax(0, 1fr) 280px; }
        .create-drawer {
          position: absolute;
          z-index: 30;
          top: 0;
          bottom: 0;
          left: 84px;
          width: 340px;
          box-shadow: 18px 0 46px rgba(0, 0, 0, 0.42);
        }
      }
      /* A tablet or a phone: one column that scrolls — the rail across the top, the
         canvas and composer, then the gallery — and the drawer a sheet from below. */
      @media (max-width: 900px) {
        .workspace.create { height: auto; min-height: 100%; }
        .create-shell,
        .create-shell.drawer-open,
        .create-shell.with-gallery,
        .create-shell.drawer-open.with-gallery { display: flex; flex-direction: column; }
        .create-rail {
          position: sticky;
          top: 0;
          z-index: 25;
          flex-direction: row;
          gap: 2px;
          padding: 6px 8px;
          overflow-x: auto;
          border-right: 0;
          border-bottom: 1px solid var(--oppai-border-strong);
        }
        .rail-tab { flex: 1 0 64px; }
        .rail-icon { width: 48px; height: 28px; font-size: 20px; }
        .rail-badge { right: calc(50% - 26px); }
        .create-stage { min-height: 0; }
        /* The composer stays in reach while the canvas scrolls under it: on a phone
           the picture fills the screen, and the prompt is what is changed next. */
        .create-stage .prompt-dock {
          position: sticky;
          bottom: 0;
          z-index: 6;
          padding: 8px 10px 10px;
          background: linear-gradient(to bottom, transparent, var(--oppai-bg) 22%);
        }
        .create-gallery { min-height: 440px; border-left: 0; border-top: 1px solid var(--oppai-border-strong); }
        .drawer-scrim {
          display: block;
          position: fixed;
          inset: 0;
          z-index: 90;
          background: rgba(0, 0, 0, 0.5);
          animation: oppai-fade-in 0.2s ease both;
        }
        .create-drawer {
          position: fixed;
          z-index: 91;
          left: 0;
          right: 0;
          top: auto;
          bottom: 0;
          width: auto;
          max-height: 78vh;
          border: 1px solid var(--oppai-border-strong);
          border-bottom: 0;
          border-radius: 26px 26px 0 0;
          box-shadow: 0 -18px 50px rgba(0, 0, 0, 0.5);
          animation: create-sheet-in 0.28s var(--oppai-ease-emphasized) both;
        }
        @keyframes create-sheet-in {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: none; opacity: 1; }
        }
        .drawer-scroll { padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px)); }
        .create-drawer .cards,
        .create-drawer .sec-models .cards { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
        .recipe { flex-wrap: wrap; padding: 10px 12px; gap: 8px; }
        .recipe-model { flex: 1 1 auto; max-width: none; }
        .recipe-chips { flex: 1 1 100%; order: 3; }
        .create-stage .canvas-stage { min-height: 52vh; padding: 14px; }
        .composer { gap: 8px; padding: 9px; border-radius: 18px; }
        .composer-fields { grid-template-columns: 1fr; gap: 6px; }
        .composer .prompt-field textarea { min-height: 58px; font-size: 14px; }
        .composer .prompt-field.negative textarea { min-height: 40px; height: 40px; padding-top: 22px; }
        .composer .field-tag { top: 6px; }
        .composer .prompt-summary { display: none; }
        .composer .mic { width: 38px; height: 38px; }
        .count-seg button { width: 32px; }
        .composer .generate { flex: 1 1 auto; min-width: 0; height: 44px; margin: 0; padding: 0 16px; }
      }
    `];g.DRAFT_FIELDS=new Set(["prompt","negative","checkpoint","vae","templateId","scheduler","width","height","steps","cfg","cfgRescale","clipSkip","seamlessX","seamlessY","vaePrecision","cpuNoise","count","seed","board","selectedLoras","selectedTriggers","selectedChars","selectedPoses","outfitOn","outfitText","outfitGear","outfitFace","outfitMisc","outfitMiscBatch","outfitTier","outfitBackground","outfitLockColors","outfitLoadoutId","outfitWardrobeId","sheetZoom","outfitUnderwearColor","outfitPubicHair","outfitPubicHairColor","camera","detailerEnabled","detailerModel","detailerPrompt","detailerNegative","detailerConfidence","detailerDenoise","detailerMaskBlur","open","showOptions","shots"]);m([J({type:Boolean})],g.prototype,"studio",2);m([d()],g.prototype,"status",2);m([d()],g.prototype,"checkpoint",2);m([d()],g.prototype,"vae",2);m([d()],g.prototype,"templateId",2);m([d()],g.prototype,"showBuiltInTemplates",2);m([d()],g.prototype,"selectedLoras",2);m([d()],g.prototype,"selectedTriggers",2);m([d()],g.prototype,"loraPage",2);m([d()],g.prototype,"outfitOn",2);m([d()],g.prototype,"outfitText",2);m([d()],g.prototype,"outfitGear",2);m([d()],g.prototype,"outfitFace",2);m([d()],g.prototype,"outfitMisc",2);m([d()],g.prototype,"outfitMiscBatch",2);m([d()],g.prototype,"outfitTier",2);m([d()],g.prototype,"outfitBackground",2);m([d()],g.prototype,"outfitUnderwearColor",2);m([d()],g.prototype,"outfitPubicHair",2);m([d()],g.prototype,"outfitPubicHairColor",2);m([d()],g.prototype,"outfitLockColors",2);m([d()],g.prototype,"gearPromptOpen",2);m([d()],g.prototype,"outfitBatchRunning",2);m([d()],g.prototype,"outfitExporting",2);m([d()],g.prototype,"outfitProgress",2);m([d()],g.prototype,"loadouts",2);m([d()],g.prototype,"outfitLoadoutId",2);m([d()],g.prototype,"loadoutBusy",2);m([d()],g.prototype,"loadoutCoverVersion",2);m([d()],g.prototype,"wardrobes",2);m([d()],g.prototype,"outfitWardrobeId",2);m([d()],g.prototype,"studioView",2);m([d()],g.prototype,"sheetTab",2);m([d()],g.prototype,"sheetZoom",2);m([d()],g.prototype,"showSquarePrompt",2);m([d()],g.prototype,"camera",2);m([d()],g.prototype,"cutout",2);m([d()],g.prototype,"cutoutTolerance",2);m([d()],g.prototype,"cutoutBusy",2);m([d()],g.prototype,"cutoutError",2);m([bt(".cutout-canvas")],g.prototype,"cutoutHost",2);m([d()],g.prototype,"cutoutTool",2);m([d()],g.prototype,"cutoutFeather",2);m([d()],g.prototype,"cutoutSpill",2);m([d()],g.prototype,"cutoutZoom",2);m([d()],g.prototype,"cutoutContrast",2);m([d()],g.prototype,"contiguous",2);m([d()],g.prototype,"brushSize",2);m([d()],g.prototype,"showOriginal",2);m([d()],g.prototype,"canUndo",2);m([d()],g.prototype,"canRedo",2);m([d()],g.prototype,"cutFraction",2);m([d()],g.prototype,"characters",2);m([d()],g.prototype,"selectedChars",2);m([d()],g.prototype,"charDraft",2);m([d()],g.prototype,"charBusy",2);m([d()],g.prototype,"scanBusy",2);m([d()],g.prototype,"poses",2);m([d()],g.prototype,"selectedPoses",2);m([d()],g.prototype,"poseDraft",2);m([d()],g.prototype,"poseBusy",2);m([d()],g.prototype,"wildcards",2);m([d()],g.prototype,"wildcardDraft",2);m([d()],g.prototype,"wildcardBusy",2);m([J({type:Number})],g.prototype,"editMedia",2);m([d()],g.prototype,"editing",2);m([d()],g.prototype,"open",2);m([d()],g.prototype,"speech",2);m([d()],g.prototype,"listening",2);m([d()],g.prototype,"optimizing",2);m([d()],g.prototype,"prompt",2);m([d()],g.prototype,"completions",2);m([d()],g.prototype,"completionIndex",2);m([d()],g.prototype,"completionField",2);m([d()],g.prototype,"createTab",2);m([d()],g.prototype,"pickerFilter",2);m([d()],g.prototype,"negative",2);m([d()],g.prototype,"showOptions",2);m([d()],g.prototype,"width",2);m([d()],g.prototype,"height",2);m([d()],g.prototype,"steps",2);m([d()],g.prototype,"cfg",2);m([d()],g.prototype,"cfgRescale",2);m([d()],g.prototype,"clipSkip",2);m([d()],g.prototype,"seamlessX",2);m([d()],g.prototype,"seamlessY",2);m([d()],g.prototype,"vaePrecision",2);m([d()],g.prototype,"cpuNoise",2);m([d()],g.prototype,"board",2);m([d()],g.prototype,"scheduler",2);m([d()],g.prototype,"count",2);m([d()],g.prototype,"seed",2);m([d()],g.prototype,"detailerEnabled",2);m([d()],g.prototype,"detailerModel",2);m([d()],g.prototype,"detailerPrompt",2);m([d()],g.prototype,"detailerNegative",2);m([d()],g.prototype,"detailerConfidence",2);m([d()],g.prototype,"detailerDenoise",2);m([d()],g.prototype,"detailerMaskBlur",2);m([d()],g.prototype,"generating",2);m([d()],g.prototype,"progress",2);m([d()],g.prototype,"shots",2);m([d()],g.prototype,"activeNodeId",2);m([d()],g.prototype,"restoredNotice",2);m([d()],g.prototype,"infoFor",2);m([d()],g.prototype,"error",2);m([d()],g.prototype,"toast",2);m([d()],g.prototype,"thumbVersion",2);m([d()],g.prototype,"failedThumbs",2);m([d()],g.prototype,"expandedShot",2);m([d()],g.prototype,"metaDraft",2);m([d()],g.prototype,"metaBusy",2);m([d()],g.prototype,"metaTriggerText",2);m([d()],g.prototype,"civitaiOpen",2);m([d()],g.prototype,"trainOpen",2);m([bt("oppai-invoke-gallery")],g.prototype,"galleryPanel",2);g=m([he("oppai-imagegen")],g);function ve(e){return new Promise((t,i)=>{const a=new FileReader;a.onload=()=>t(String(a.result)),a.onerror=()=>i(new Error("couldn't read the image")),a.readAsDataURL(e)})}export{g as OppaiImageGen};
