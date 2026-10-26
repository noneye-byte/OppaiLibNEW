import{z as re,i as ie,u as d,a as ne,B as Ht,e as u,m as R,C as ot,A as c,b as r,D as Vt,l as ve,t as le,q as Ie,v as E,x as Kt,E as Ge,F as Xt,G as Yt,H as Zt,I as Jt,J as Qt,w as ei}from"./index-C6DXTUOe.js";import{e as Et}from"./query-__j_ZMY6.js";function Bt(e){return e.faces*e.tiers}function ti(e,t){const i=Bt(t);if(e>=i){const a=Math.min(e-i,t.miscIds.length-1);return{tier:0,face:0,misc:t.miscIds[Math.max(0,a)]??""}}const s=Math.max(0,Math.min(e,i-1));return{tier:Math.floor(s/t.faces),face:s%t.faces,misc:""}}function ii(e,t,i,s){const a=i?s.miscIds.indexOf(i):-1;return a>=0?Bt(s)+a:t+e*s.faces}function W(e){return`${e.emotion}:${e.tier}`}function se(e,t,i,s){if(e.trim()==="")return s;const a=Number(e);return Number.isFinite(a)?Math.min(i,Math.max(t,Math.round(a))):s}function we(e,t,i,s){if(e.trim()==="")return s;const a=Number(e);return Number.isFinite(a)?Math.min(i,Math.max(t,a)):s}function si(e,t){var i,s;return{prompt:e.prompt,negativePrompt:e.negativePrompt??"",model:e.checkpoint??"",modelHash:t.modelHash||void 0,vae:e.vae??"",vaePrecision:e.vaePrecision??"fp32",sampler:e.sampler??"",seed:t.seed,steps:e.steps??0,cfgScale:e.cfgScale??0,cfgRescale:e.cfgRescale??0,clipSkip:e.clipSkip??0,width:e.width??0,height:e.height??0,seamlessX:!!e.seamlessX,seamlessY:!!e.seamlessY,cpuNoise:e.cpuNoise!==!1,loras:(e.loras??[]).map(a=>{var o;return{name:a.name,weight:a.weight,hash:((o=t.loraHashes)==null?void 0:o[a.name])||void 0}}),triggers:t.triggers??[],characters:t.characters??[],poses:(i=t.poses)!=null&&i.length?t.poses:void 0,outfit:t.outfit||void 0,controlImage:t.controlImage||void 0,refiner:(s=e.detailer)!=null&&s.enabled?{model:e.detailer.model??"",prompt:e.detailer.prompt??"",negativePrompt:e.detailer.negativePrompt??"",confidence:e.detailer.confidence??0,denoise:e.detailer.denoise??0,maskBlur:e.detailer.maskBlur??0}:void 0,board:e.board&&e.board!=="none"?e.board:void 0,backend:t.backend,seconds:t.seconds,at:Date.now()}}function oe(e){const t=e.loras.filter(l=>!e.prompt.includes(`<lora:${l.name}:`)).map(l=>`<lora:${l.name}:${l.weight}>`).join(" "),s=[[e.prompt,t].filter(Boolean).join(" ")];e.negativePrompt&&s.push(`Negative prompt: ${e.negativePrompt}`);const a=[`Steps: ${e.steps}`,`Sampler: ${e.sampler||"default"}`,`CFG scale: ${e.cfgScale}`,`Seed: ${e.seed}`,`Size: ${e.width}x${e.height}`];e.model&&a.push(`Model: ${e.model}`),e.modelHash&&a.push(`Model hash: ${e.modelHash}`),e.vae&&a.push(`VAE: ${e.vae}`),e.clipSkip>0&&a.push(`Clip skip: ${e.clipSkip}`),e.cfgRescale>0&&a.push(`CFG Rescale: ${e.cfgRescale}`);const o=e.loras.filter(l=>l.hash);return o.length&&a.push(`Lora hashes: "${o.map(l=>`${l.name}: ${l.hash}`).join(", ")}"`),(e.seamlessX||e.seamlessY)&&a.push(`Seamless: ${[e.seamlessX?"x":"",e.seamlessY?"y":""].filter(Boolean).join("+")}`),e.vaePrecision&&a.push(`VAE precision: ${e.vaePrecision}`),e.cpuNoise||a.push("Noise device: gpu"),e.refiner&&(a.push(`ADetailer model: ${e.refiner.model}`),a.push(`ADetailer confidence: ${e.refiner.confidence}`),a.push(`ADetailer denoising strength: ${e.refiner.denoise}`),a.push(`ADetailer mask blur: ${e.refiner.maskBlur}`),e.refiner.prompt&&a.push(`ADetailer prompt: ${e.refiner.prompt}`),e.refiner.negativePrompt&&a.push(`ADetailer negative prompt: ${e.refiner.negativePrompt}`)),e.triggers.length&&a.push(`Trigger phrases: ${e.triggers.join(" ")}`),e.characters.length&&a.push(`Characters: ${e.characters.join(", ")}`),e.controlImage&&a.push(`Control image: ${e.controlImage}`),e.board&&a.push(`Board: ${e.board}`),a.push(`Backend: ${e.backend}`),e.seconds!==void 0&&a.push(`Generation time: ${e.seconds.toFixed(1)}s`),s.push(a.join(", ")),s.join(`
`)}function be(e){return JSON.stringify(e,null,2)}function ai(e){return{prompt:e.prompt,negativePrompt:e.negativePrompt??"",model:e.model??"",modelHash:e.modelHash||void 0,vae:e.vae??"",vaePrecision:"fp32",sampler:e.sampler??"",seed:e.seed,steps:e.steps,cfgScale:e.cfgScale,cfgRescale:e.cfgRescale,clipSkip:e.clipSkip,width:e.width,height:e.height,seamlessX:e.seamlessX,seamlessY:e.seamlessY,cpuNoise:e.cpuNoise,loras:e.loras??[],triggers:[],characters:[],backend:e.backend||"invokeai",at:Date.now()}}function oi(e){return{prompt:e.prompt,negativePrompt:e.negativePrompt||void 0,checkpoint:e.model||void 0,vae:e.vae||void 0,sampler:e.sampler||void 0,seed:e.seed,steps:e.steps,cfgScale:e.cfgScale,cfgRescale:e.cfgRescale,clipSkip:e.clipSkip,width:e.width,height:e.height,seamlessX:e.seamlessX,seamlessY:e.seamlessY,vaePrecision:e.vaePrecision==="fp16"?"fp16":"fp32",cpuNoise:e.cpuNoise,count:1,loras:e.loras.map(({name:t,weight:i})=>({name:t,weight:i})),detailer:e.refiner?{enabled:!0,...e.refiner}:void 0,board:e.board}}async function _t(e){var t;try{if((t=navigator.clipboard)!=null&&t.writeText)return await navigator.clipboard.writeText(e),!0}catch{}try{const i=document.createElement("textarea");i.value=e,i.setAttribute("readonly",""),i.style.position="fixed",i.style.top="-1000px",document.body.appendChild(i),i.select();const s=document.execCommand("copy");return document.body.removeChild(i),s}catch{return!1}}const it="oppai_gen_draft",We=1,ri=720*60*60*1e3;function ni(e){try{const t={...e,version:We,at:Date.now()};localStorage.setItem(it,JSON.stringify(t))}catch{}}function li(){let e=null;try{e=localStorage.getItem(it)}catch{return null}if(!e)return null;let t;try{t=JSON.parse(e)}catch{return Te(),null}if(!t||typeof t!="object")return null;const i=t;if(i.version!==We)return Te(),null;const s=typeof i.at=="number"?i.at:0;if(!s||Date.now()-s>ri)return Te(),null;const a={version:We,at:s},o=p=>{const h=i[p];typeof h=="string"&&(a[p]=h)},l=p=>{const h=i[p];typeof h=="boolean"&&(a[p]=h)},n=p=>{const h=i[p];typeof h=="number"&&Number.isFinite(h)&&(a[p]=h)};if(["prompt","negative","checkpoint","vae","templateId","scheduler","board","outfitText","outfitMisc","outfitUnderwearColor","outfitPubicHairColor","outfitLoadoutId","outfitWardrobeId","detailerModel","detailerPrompt","detailerNegative"].forEach(o),["width","height","steps","cfg","cfgRescale","clipSkip","count","seed","outfitFace","outfitTier","detailerConfidence","detailerDenoise","detailerMaskBlur","scrollTop"].forEach(n),["seamlessX","seamlessY","cpuNoise","outfitOn","outfitCutout","outfitPubicHair","outfitLockColors","outfitMiscBatch","detailerEnabled","showOptions"].forEach(l),(i.vaePrecision==="fp16"||i.vaePrecision==="fp32")&&(a.vaePrecision=i.vaePrecision),(i.outfitBackground==="black"||i.outfitBackground==="white")&&(a.outfitBackground=i.outfitBackground),i.camera&&typeof i.camera=="object"&&!Array.isArray(i.camera)){const p={};for(const[h,f]of Object.entries(i.camera))(typeof f=="string"||typeof f=="boolean")&&(p[h]=f);Object.keys(p).length&&(a.camera=p)}return ci(i.selectedLoras)&&(a.selectedLoras=i.selectedLoras),hi(i.open)&&(a.open=i.open),Re(i.selectedTriggers)&&(a.selectedTriggers=i.selectedTriggers),Re(i.selectedChars)&&(a.selectedChars=i.selectedChars),Re(i.selectedPoses)&&(a.selectedPoses=i.selectedPoses),di(i.outfitGear)&&(a.outfitGear=i.outfitGear),Array.isArray(i.shots)&&(a.shots=i.shots.filter(p=>!!p&&typeof p=="object"&&typeof p.id=="string"&&typeof p.seed=="number").map(p=>({id:p.id,seed:p.seed,saved:!!p.saved,info:p.info,...typeof p.outfitFilename=="string"?{outfitFilename:p.outfitFilename}:{},...pi(p.outfitSlot)?{outfitSlot:p.outfitSlot}:{},...typeof p.outfitConfig=="string"?{outfitConfig:p.outfitConfig}:{},...typeof p.cutoutReviewed=="boolean"?{cutoutReviewed:p.cutoutReviewed}:{},...typeof p.wipOutfitId=="string"?{wipOutfitId:p.wipOutfitId}:{},...typeof p.previewVersion=="number"&&Number.isFinite(p.previewVersion)?{previewVersion:p.previewVersion}:{},...typeof p.workspaceX=="number"&&Number.isFinite(p.workspaceX)?{workspaceX:Math.max(0,p.workspaceX)}:{},...typeof p.workspaceY=="number"&&Number.isFinite(p.workspaceY)?{workspaceY:Math.max(0,p.workspaceY)}:{}}))),a}function di(e){return!!e&&typeof e=="object"&&!Array.isArray(e)}function pi(e){if(!e||typeof e!="object"||Array.isArray(e))return!1;const t=e;return typeof t.emotion=="string"&&typeof t.emotionLabel=="string"&&typeof t.tier=="number"&&Number.isInteger(t.tier)&&typeof t.tierLabel=="string"&&typeof t.index=="number"&&Number.isInteger(t.index)}function Te(){try{localStorage.removeItem(it)}catch{}}function Re(e){return Array.isArray(e)&&e.every(t=>typeof t=="string")}function ci(e){return!!e&&typeof e=="object"&&!Array.isArray(e)&&Object.values(e).every(t=>typeof t=="number"&&Number.isFinite(t))}function hi(e){return!!e&&typeof e=="object"&&!Array.isArray(e)&&Object.values(e).every(t=>typeof t=="boolean")}const ce=new Uint8Array([137,80,78,71,13,10,26,10]),qe=new TextEncoder;function ui(e,t){return(e[t]<<24|e[t+1]<<16|e[t+2]<<8|e[t+3])>>>0}function rt(e,t,i){e[t]=i>>>24&255,e[t+1]=i>>>16&255,e[t+2]=i>>>8&255,e[t+3]=i&255}let $e;function gi(e){if(!$e){$e=new Uint32Array(256);for(let i=0;i<256;i++){let s=i;for(let a=0;a<8;a++)s=s&1?3988292384^s>>>1:s>>>1;$e[i]=s>>>0}}let t=4294967295;for(const i of e)t=$e[(t^i)&255]^t>>>8;return(t^4294967295)>>>0}function nt(e,t){const i=qe.encode(e),s=new Uint8Array(12+t.length);rt(s,0,t.length),s.set(i,4),s.set(t,8);const a=new Uint8Array(i.length+t.length);return a.set(i),a.set(t,i.length),rt(s,s.length-4,gi(a)),s}function lt(e,t){const i=[...t].every(l=>(l.codePointAt(0)??256)<=255),s=qe.encode(e);if(i){const l=Uint8Array.from([...t],p=>p.codePointAt(0)??0),n=new Uint8Array(s.length+1+l.length);return n.set(s),n.set(l,s.length+1),nt("tEXt",n)}const a=qe.encode(t),o=new Uint8Array(s.length+5+a.length);return o.set(s),o.set(a,s.length+5),nt("iTXt",o)}function He(e,t,i){const s=e instanceof Uint8Array?e:new Uint8Array(e);if(s.length<20||!ce.every((k,S)=>s[S]===k))throw new Error("The generated image is not a PNG.");let a=ce.length,o=-1;const l=[];for(;a+12<=s.length;){const k=ui(s,a),S=a+12+k;if(S>s.length)throw new Error("The PNG is truncated.");const M=String.fromCharCode(...s.subarray(a+4,a+8));if(M==="IEND"){o=a;break}const z=s.subarray(a+8,a+8+k),L=z.indexOf(0),D=L<0?"":String.fromCharCode(...z.subarray(0,L));(M==="tEXt"||M==="iTXt")&&(D==="parameters"||D==="oppailib")||l.push(s.subarray(a,S)),a=S}if(o<0)throw new Error("The PNG has no IEND chunk.");const n=[lt("parameters",t)];i&&n.push(lt("oppailib",i));const p=l.reduce((k,S)=>k+S.length,0),h=n.reduce((k,S)=>k+S.length,0),f=s.subarray(o),g=new Uint8Array(ce.length+p+h+f.length);g.set(ce);let y=ce.length;for(const k of l)g.set(k,y),y+=k.length;for(const k of n)g.set(k,y),y+=k.length;return g.set(f,y),g}async function Nt(e,t,i,s){const a=await fetch(e,{credentials:"same-origin"});if(!a.ok)throw new Error(`Couldn't export image (${a.status}).`);const l=He(await a.arrayBuffer(),i,s).slice().buffer,n=URL.createObjectURL(new Blob([l],{type:"image/png"}));try{const p=document.createElement("a");p.href=n,p.download=t.toLowerCase().endsWith(".png")?t:`${t}.png`,p.click()}finally{setTimeout(()=>URL.revokeObjectURL(n),0)}}const dt={shot:"full-body",angle:"eye",view:"front",framing:"portrait",lens:"none",lockIdentity:!0},xe={"extreme-closeup":{label:"Extreme close-up",hint:"Eyes and mouth fill the frame",prompt:"extreme close-up, face filling the frame, macro detail on the eyes",not:["full body","wide shot","long shot","cowboy shot","upper body"]},closeup:{label:"Close-up",hint:"The face, little else",prompt:"close-up portrait, face and hair fill the frame",not:["full body","wide shot","long shot","cowboy shot"]},"head-shoulders":{label:"Head and shoulders",hint:"The classic portrait crop",prompt:"head and shoulders portrait, shoulders visible at the frame edge",not:["full body","wide shot","long shot","waist visible"]},bust:{label:"Bust shot",hint:"Head to upper chest",prompt:"bust shot, framed from the chest up",not:["full body","wide shot","long shot","legs","feet"]},"waist-up":{label:"Waist-up",hint:"Head to waist, hands usable",prompt:"waist-up shot, upper body, cropped at the waist",not:["full body","long shot","legs","feet","knees"]},"three-quarter":{label:"Three-quarter body",hint:"Head to mid-thigh",prompt:"three-quarter body shot, cowboy shot, cropped at mid-thigh",not:["extreme close-up","feet","shoes"]},"full-body":{label:"Full body",hint:"Head to feet, whole figure",prompt:"full body shot, entire figure in frame, head to feet visible",not:["close-up","cropped legs","out of frame","cropped head"]}};function mi(e){return xe[e].prompt}const Ve={eye:{label:"Eye level",prompt:"eye level perspective, natural straight-on viewpoint",not:[]},low:{label:"Low angle",prompt:"low angle shot, viewed from below, looking upward",not:["from above","high angle","distorted proportions","giant"]},high:{label:"High angle",prompt:"high angle shot, viewed from above, looking downward",not:["from below","low angle","distorted proportions"]}},Ke={front:{label:"Front",prompt:"front view, facing viewer",not:["from behind","back view"]},"three-quarter":{label:"Three-quarter",prompt:"three-quarter view, body turned at a slight angle",not:["from behind"]},side:{label:"Side",prompt:"side view, profile, from the side",not:["front view","facing viewer"]},rear:{label:"Rear",prompt:"from behind, back view, facing away from viewer",not:["front view","facing viewer","looking at viewer","face visible"]}},Xe={none:{label:"Unspecified",prompt:""},"wide-24":{label:"24mm wide",prompt:"24mm wide angle lens, deep focus"},"normal-50":{label:"50mm normal",prompt:"50mm lens, natural perspective"},"portrait-85":{label:"85mm portrait",prompt:"85mm portrait lens, shallow depth of field, blurred background"},"tele-135":{label:"135mm telephoto",prompt:"135mm telephoto lens, compressed perspective, bokeh"}},fi="consistent character design, same face, consistent facial features, consistent body proportions, anatomically consistent",bi="inconsistent face, different person, face morphing, deformed proportions, distorted anatomy, extra limbs, malformed hands, changed body type, altered hairstyle",vi="camera, camera body, camera lens, photography equipment, tripod, photographer, studio equipment, boom microphone",Ft={portrait:{sd:[512,768],xl:[832,1216]},landscape:{sd:[768,512],xl:[1216,832]},square:{sd:[512,512],xl:[1024,1024]}};function xi(e,t="sd"){const i=xe[e.shot],s=Ve[e.angle],a=Ke[e.view],o=Xe[e.lens],l=pt([...e.lockIdentity?[fi]:[],i.prompt,a.prompt,s.prompt,o.prompt]),n=pt([...e.lockIdentity?[bi]:[],vi,...i.not,...a.not,...s.not]),[p,h]=Ft[e.framing][t];return{prompt:l,negative:n,width:p,height:h}}function pt(e){const t=new Set,i=[];for(const s of e)for(const a of s.split(",")){const o=a.trim();if(!o)continue;const l=o.toLowerCase();t.has(l)||(t.add(l),i.push(o))}return i.join(", ")}function yi(e,t){return e*t>=800*800?"xl":"sd"}const Ae={shots:Object.keys(xe).map(e=>({id:e,label:xe[e].label,hint:xe[e].hint})),angles:Object.keys(Ve).map(e=>({id:e,label:Ve[e].label})),views:Object.keys(Ke).map(e=>({id:e,label:Ke[e].label})),lenses:Object.keys(Xe).map(e=>({id:e,label:Xe[e].label})),framings:Object.keys(Ft).map(e=>({id:e,label:e==="portrait"?"Portrait":e==="landscape"?"Landscape":"Square"}))},ct={feather:2,spill:.5},te=255,X=0,wi=20;class $i{constructor(t){if(this.undoStack=[],this.redoStack=[],"data"in t)this.width=t.width,this.height=t.height,this.source={data:t.data,width:t.width,height:t.height};else{this.width="naturalWidth"in t?t.naturalWidth:t.width,this.height="naturalHeight"in t?t.naturalHeight:t.height;const i=document.createElement("canvas");i.width=this.width,i.height=this.height;const s=i.getContext("2d",{willReadFrequently:!0});if(!s)throw new Error("This browser wouldn't give us a canvas to work on.");s.drawImage(t,0,0),this.source=s.getImageData(0,0,this.width,this.height)}this.mask=new Uint8Array(this.width*this.height).fill(te),this.key=ut(this.source.data,this.width,this.height)}get canUndo(){return this.undoStack.length>0}get canRedo(){return this.redoStack.length>0}get cutFraction(){let t=0;for(let i=0;i<this.mask.length;i++)this.mask[i]===X&&t++;return t/this.mask.length}checkpoint(){this.undoStack.push(this.mask.slice()),this.undoStack.length>wi&&this.undoStack.shift(),this.redoStack=[]}undo(){const t=this.undoStack.pop();return t?(this.redoStack.push(this.mask),this.mask=t,!0):!1}redo(){const t=this.redoStack.pop();return t?(this.undoStack.push(this.mask),this.mask=t,!0):!1}reset(){this.checkpoint(),this.mask.fill(te)}autoRemove(t){this.checkpoint(),this.mask.fill(te),this.key=ut(this.source.data,this.width,this.height);const i=[];for(let s=0;s<this.width;s++)i.push(s,s+(this.height-1)*this.width);for(let s=0;s<this.height;s++)i.push(s*this.width,this.width-1+s*this.width);this.flood(i,this.key,t),this.removeEnclosedBackdrop(t)}removeEnclosedBackdrop(t){const i=this.source.data,s=new Uint8Array(this.mask.length),[a,o,l]=this.key,n=Math.max(1,t),p=ht(a,o,l),h=Math.max(a,o,l)-Math.min(a,o,l)<28,f=Math.max(16,Math.floor(this.mask.length*.08));for(let g=0;g<this.mask.length;g++){if(s[g]||this.mask[g]===X||he(i,g*4,a,o,l)>n)continue;const y=[],k=new Set,S=[g];for(s[g]=1;S.length;){const D=S.pop();y.push(D);const P=D%this.width,de=(D-P)/this.width,ye=[P>0?D-1:-1,P<this.width-1?D+1:-1,de>0?D-this.width:-1,de<this.height-1?D+this.width:-1];for(const V of ye)V<0||this.mask[V]===X||(he(i,V*4,a,o,l)<=n?s[V]||(s[V]=1,S.push(V)):k.add(V))}if(!k.size||y.length>f)continue;let M=0,z=0;for(const D of k){const P=D*4;M+=ht(i[P],i[P+1],i[P+2]),z+=he(i,P,a,o,l)}if(M/=k.size,z/=k.size,h&&p>=200?p-M>=110:h&&p<=55?M-p>=110:z>=Math.max(90,n*2.25))for(const D of y)this.mask[D]=X}}removeAt(t,i,s){const a=ze(Math.round(t),0,this.width-1),o=ze(Math.round(i),0,this.height-1),l=(o*this.width+a)*4,n=[this.source.data[l],this.source.data[l+1],this.source.data[l+2]];if(this.checkpoint(),this.key=n,s.contiguous){this.flood([o*this.width+a],n,s.tolerance);return}const p=Math.max(1,s.tolerance);for(let h=0;h<this.mask.length;h++)this.mask[h]!==X&&he(this.source.data,h*4,n[0],n[1],n[2])<=p&&(this.mask[h]=X)}paint(t,i,s,a){const o=a==="add"?te:X,l=Math.max(1,Math.round(s)),n=Math.round(t),p=Math.round(i),h=l*l,f=Math.max(0,n-l),g=Math.min(this.width-1,n+l),y=Math.max(0,p-l),k=Math.min(this.height-1,p+l);for(let S=y;S<=k;S++){const M=S-p;for(let z=f;z<=g;z++){const L=z-n;L*L+M*M>h||(this.mask[S*this.width+z]=o)}}}beginStroke(){this.checkpoint()}compose(t,i=!1){const s=document.createElement("canvas");s.width=this.width,s.height=this.height;const a=s.getContext("2d");if(!a)return s;const o=this.composePixels(t,i);return a.putImageData(new ImageData(o.data,o.width,o.height),0,0),s}composePixels(t,i=!1){const s={data:new Uint8ClampedArray(this.source.data),width:this.width,height:this.height};if(i)return s;const a=this.featheredAlpha(Math.max(0,Math.round(t.feather))),o=ze(t.spill,0,1),[l,n,p]=this.key;for(let h=0;h<a.length;h++){const f=h*4,g=a[h];if(s.data[f+3]=g,g===0||g===te||o===0)continue;const y=o*(1-g/te);s.data[f]=Ee(s.data[f],l,y),s.data[f+1]=Ee(s.data[f+1],n,y),s.data[f+2]=Ee(s.data[f+2],p,y)}return s}featheredAlpha(t){const i=new Uint8Array(this.mask.length);if(t<=0)return i.set(this.mask),i;const s=1e6,a=new Float32Array(this.mask.length);for(let n=0;n<this.mask.length;n++)a[n]=this.mask[n]===X?0:s;const o=this.width,l=this.height;for(let n=0;n<l;n++)for(let p=0;p<o;p++){const h=n*o+p;let f=a[h];p>0&&(f=Math.min(f,a[h-1]+1)),n>0&&(f=Math.min(f,a[h-o]+1)),p>0&&n>0&&(f=Math.min(f,a[h-o-1]+1.414)),p<o-1&&n>0&&(f=Math.min(f,a[h-o+1]+1.414)),a[h]=f}for(let n=l-1;n>=0;n--)for(let p=o-1;p>=0;p--){const h=n*o+p;let f=a[h];p<o-1&&(f=Math.min(f,a[h+1]+1)),n<l-1&&(f=Math.min(f,a[h+o]+1)),p<o-1&&n<l-1&&(f=Math.min(f,a[h+o+1]+1.414)),p>0&&n<l-1&&(f=Math.min(f,a[h+o-1]+1.414)),a[h]=f}for(let n=0;n<i.length;n++){if(this.mask[n]===X){i[n]=0;continue}const p=a[n];i[n]=p>=t?te:Math.round(p/t*te)}return i}flood(t,i,s){const a=Math.max(1,s),o=this.source.data,l=new Uint8Array(this.mask.length),n=t.slice(),[p,h,f]=i;for(;n.length;){const g=n.pop();if(l[g]||(l[g]=1,he(o,g*4,p,h,f)>a))continue;this.mask[g]=X;const y=g%this.width,k=(g-y)/this.width;y>0&&n.push(g-1),y<this.width-1&&n.push(g+1),k>0&&n.push(g-this.width),k<this.height-1&&n.push(g+this.width)}}}function he(e,t,i,s,a){const o=e[t]-i,l=e[t+1]-s,n=e[t+2]-a;return Math.sqrt(o*o+l*l+n*n)}function ht(e,t,i){return e*.2126+t*.7152+i*.0722}function ut(e,t,i){const s=[0,(t-1)*4,(i-1)*t*4,((i-1)*t+(t-1))*4];let a=0,o=0,l=0;for(const n of s)a+=e[n],o+=e[n+1],l+=e[n+2];return[a/4,o/4,l/4]}function Ee(e,t,i){return ze(Math.round(e+(e-t)*i),0,255)}function ze(e,t,i){return Math.min(i,Math.max(t,e))}function ki(e){return new Promise((t,i)=>{const s=new Image;s.crossOrigin="anonymous",s.onload=()=>t(s),s.onerror=()=>i(new Error("Couldn't load that image.")),s.src=e})}function gt(e){return new Promise((t,i)=>{e.toBlob(s=>s?t(s):i(new Error("Couldn't encode the PNG.")),"image/png")})}function Le(e,t,i=48){return e.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,i).replace(/-+$/g,"")||t}function Si(e,t,i){return`${Le(e,"outfit")}-${Le(t,"calm",20)}-${Le(i,"neutral",24)}.png`}function Ci(e){return`${Le(e,"outfit")}-wardrobe.zip`}function mt(e){return!e||e.manageModels||e.backend!=="a1111"?"":e.modelsDirProblem?`${e.modelsDirProblem}. Until then Automatic1111's models are listed and linked to Civitai, but can't be installed, edited or deleted from here.`:"Automatic1111 has no API to install, edit or delete models, so OppaiLib does it in its models folder. Map that folder into the OppaiLib container at /a1111-models (or set where it is under Settings → Image generation) and those work here too, Civitai installs included."}function ee(e){return e.split(",").map(t=>t.trim()).filter(Boolean)}const q=e=>e.toLowerCase().replace(/\s+/g," ");function Ti(e,t){const i=new Set(ee(e).map(q)),s=ee(t);return s.length>0&&s.every(a=>i.has(q(a)))}function ft(e,t,i,s){let a=ee(e);if(t&&Ti(e,t)){const p=new Set(ee(t).map(q));a=a.filter(h=>!p.has(q(h)))}const o=new Set(a.map(q)),l=ee(i??"").filter(p=>!o.has(q(p)));return(s==="start"?[...l,...a]:[...a,...l]).join(", ")}function zi(e,t){const i=new Set(ee(e).map(q)),s=[];for(const a of t)for(const o of ee(a??""))i.has(q(o))||(i.add(q(o)),s.push(o));return s.join(", ")}function Li(e,t,i,s){const a={...e},o=[],l=(f,g,y)=>{g===void 0||g===""||g===0||(a[f]!==g&&o.push(y),a[f]=g)};s?(l("weight",i.weight,"weight"),i.weightMin&&i.weightMax&&(l("weightMin",i.weightMin,"weight range"),a.weightMax=i.weightMax)):(l("positive",i.positive,"positive prompt"),l("steps",i.steps,"steps"),l("cfgScale",i.cfgScale,"CFG"),l("scheduler",i.scheduler,"sampler"),l("clipSkip",i.clipSkip,"clip skip"),i.width&&i.height&&(l("width",i.width,"size"),a.height=i.height)),l("negative",i.negative,"negative prompt");const n=ee(t),p=new Set(n.map(q));let h=0;for(const f of i.triggerWords??[])for(const g of ee(f))p.has(q(g))||(p.add(q(g)),n.push(g),h++);return h&&o.unshift("trigger words"),{defaults:a,triggerText:n.join(", "),applied:o}}const Y=[{key:"head",label:"Head",hint:"Hats, glasses, etc.",prompt:"head item",noun:"headwear",icon:"face"},{key:"top",label:"Top",hint:"Shirt, dress, jacket…",prompt:"top",noun:"top",icon:"apparel"},{key:"bottoms",label:"Bottoms",hint:"Skirt, shorts, pants…",prompt:"bottoms",noun:"bottoms",icon:"styler"},{key:"shoes",label:"Shoes",hint:"Boots, heels, socks…",prompt:"footwear",noun:"footwear",icon:"steps"},{key:"panties",label:"Panties",hint:"Style and material",prompt:"panties",noun:"panties",icon:"apparel"},{key:"bra",label:"Bra",hint:"Style and material",prompt:"bra",noun:"bra",icon:"apparel"},{key:"hand1",label:"Hand 1",hint:"Held or worn item",prompt:"left-hand item",noun:"glove",icon:"front_hand"},{key:"hand2",label:"Hand 2",hint:"Held or worn item",prompt:"right-hand item",noun:"glove",icon:"back_hand"},{key:"extra1",label:"Extra 1",hint:"Accessory or layer",prompt:"extra accessory",noun:"accessory",icon:"diamond"},{key:"extra2",label:"Extra 2",hint:"Accessory or layer",prompt:"second extra accessory",noun:"accessory",icon:"diamond"}];function J(e){return!!e.item.trim()&&!e.off}const Be={head:{color:"",item:""},top:{color:"cream white",item:"fitted top"},bottoms:{color:"charcoal",item:"pleated skirt"},shoes:{color:"black",item:"ankle boots"},panties:{color:"black",item:"lace panties"},bra:{color:"black",item:"lace bra"},hand1:{color:"",item:""},hand2:{color:"",item:""},extra1:{color:"",item:""},extra2:{color:"",item:""}},Ut=Object.fromEntries(Y.map(({key:e})=>[e,{color:"",item:""}])),jt=[{name:"red",words:["red","crimson","scarlet","ruby","burgundy","maroon","wine"]},{name:"pink",words:["pink","rose","blush","magenta","fuchsia","salmon"]},{name:"orange",words:["orange","peach","apricot","coral","amber","rust"]},{name:"yellow",words:["yellow","gold","golden","mustard","lemon","blonde"]},{name:"green",words:["green","emerald","olive","mint","jade","teal","sage"]},{name:"blue",words:["blue","navy","azure","cobalt","indigo","denim","cyan","turquoise"]},{name:"purple",words:["purple","violet","lavender","lilac","plum","mauve"]},{name:"brown",words:["brown","tan","beige","chocolate","caramel","khaki","bronze","copper"]},{name:"white",words:["white","cream","ivory","pearl","off-white"]},{name:"black",words:["black","charcoal","onyx","jet"]},{name:"grey",words:["grey","gray","silver","slate","ash","steel"]}];function Pi(e){const t=e.toLowerCase();return jt.filter(({words:i})=>i.some(s=>new RegExp(`\\b${s}\\b`).test(t))).map(({name:i})=>i)}function Mi(e,t,i){if(!e.trim())return"";const s=t.toFixed(2).replace(/0+$/,"").replace(/\.$/,"");return i==="a1111"?`(${e}:${s})`:i==="invokeai"?`(${e})${s}`:e}const Ii=1.25;function bt(e,t,i,s){const a=t.item.trim();if(!a||t.off)return"";const o=st(e,t),l=De(e,t),n=t.color.trim();if(!n)return`${o}: ${a}`;const p=`${n} ${a}`;return s?`${o}: ${Mi(p,Ii,i)}, ${n} ${l}`:`${o}: ${p}`}function st(e,t){var i;return((i=t.prompt)==null?void 0:i.trim())||e.prompt}function De(e,t){var i,s;return((i=t.noun)==null?void 0:i.trim())||((s=t.prompt)==null?void 0:s.trim())||e.noun}function Di(e,t){const i=t.color.trim();if(!J(t)||!i)return[];const s=new Set(Pi(i));if(!s.size)return[];const a=De(e,t);return jt.filter(({name:o})=>!s.has(o)).map(({name:o})=>`${o} ${a}`)}const Ye=[{description:"Clothes on; bra and panties hidden.",clothes:[["on",100]],bra:[["hidden",100]],panties:[["hidden",100]]},{description:"Usually covered, with an occasional underwear glimpse.",clothes:[["on",88],["displaced",12]],bra:[["hidden",88],["showing",12]],panties:[["hidden",94],["showing",6]]},{description:"Mixed neat, slipped, and rare clothes-off results.",clothes:[["on",58],["displaced",34],["off",8]],bra:[["hidden",52],["showing",38],["off",10]],panties:[["hidden",60],["showing",33],["off",7]]},{description:"Strong variation: clothes and underwear may be on, showing, or off.",clothes:[["on",28],["displaced",44],["off",28]],bra:[["hidden",22],["showing",46],["off",32]],panties:[["hidden",30],["showing",45],["off",25]]},{description:"Maximum variation, weighted toward displaced or removed clothing.",clothes:[["on",14],["displaced",28],["off",58]],bra:[["hidden",10],["showing",27],["off",63]],panties:[["hidden",14],["showing",31],["off",55]]}];function _e(e,t){const i=Math.max(0,Math.min(.999999,t()))*100;let s=0;for(const[a,o]of e)if(s+=o,i<s)return a;return e[e.length-1][0]}function Oi(e,t=Math.random){const i=Ye[Math.max(0,Math.min(Ye.length-1,Math.round(e)))],s=_e(i.clothes,t);let a=_e(i.bra,t),o=_e(i.panties,t);return s==="off"&&(a==="hidden"&&(a="showing"),o==="hidden"&&(o="showing")),{clothes:s,bra:a,panties:o}}function Ri(e){if(!e||typeof e!="object"||Array.isArray(e))return!1;const t=e;return typeof t.color=="string"&&typeof t.item=="string"}function vt(e){if(!e||typeof e!="object"||Array.isArray(e))return{...Ut};const t=e;return Object.fromEntries(Y.map(({key:i})=>{var a,o;const s=t[i];return typeof s=="string"?[i,{color:"",item:s}]:Ri(s)?[i,{color:s.color,item:s.item,...s.off?{off:!0}:{},...(a=s.prompt)!=null&&a.trim()?{prompt:s.prompt.trim()}:{},...(o=s.noun)!=null&&o.trim()?{noun:s.noun.trim()}:{}}]:[i,{color:"",item:""}]}))}function Ai(e){return JSON.stringify(Object.fromEntries(Y.map(t=>{const i=e[t.key];return[t.key,J(i)?`${i.color.trim().toLowerCase()}|${i.item.trim().toLowerCase()}|${st(t,i).toLowerCase()}|${De(t,i).toLowerCase()}`:"|"]})))}var Ei=Object.defineProperty,Bi=Object.getOwnPropertyDescriptor,G=(e,t,i,s)=>{for(var a=s>1?void 0:s?Bi(t,i):t,o=e.length-1,l;o>=0;o--)(l=e[o])&&(a=(s?l(t,i,a):l(a))||a);return s&&a&&Ei(t,i,a),a};const Ze=[{id:"neutral",label:"Neutral",hint:"Login screen and error popups"},{id:"happy",label:"Happy",hint:"Chat · Sweet mode"},{id:"mischievous",label:"Mischievous",hint:"Chat · Playful mode"},{id:"surprised",label:"Surprised",hint:"Chat · Bold mode"},{id:"thinking",label:"Thinking",hint:"Chat · Roleplay mode"},{id:"shy",label:"Shy",hint:"Bashful, flustered, caught out",borrows:"Surprised"},{id:"smug",label:"Smug",hint:"Proud of herself, vindicated",borrows:"Mischievous"},{id:"sad",label:"Sad",hint:"Hurt, wistful, let down",borrows:"Thinking"},{id:"annoyed",label:"Annoyed",hint:"Irritated, pouty, impatient",borrows:"Thinking"},{id:"sleepy",label:"Sleepy",hint:"Tired, dozy, winding down",borrows:"Neutral"},{id:"loving",label:"Loving",hint:"Tender, adoring, soft on you",borrows:"Happy"},{id:"excited",label:"Excited",hint:"Thrilled, eager, buzzing",borrows:"Happy"}],Pe=["Calm","Warm","Flirty","Heated","Peak"],_i=Ze.length*Pe.length,ue=(e,t)=>`${e}:${t}`;let N=class extends ne{constructor(){super(...arguments),this.outfits=[],this.activities=[],this.backgrounds=[],this.defaultBackground="",this.backgroundDraft=null,this.backgroundBusy=!1,this.backgroundVersion=0,this.wornOutfit=Ht(),this.outfitDraft=null,this.outfitBusy=!1,this.outfitError="",this.outfitCoverVersion=0}connectedCallback(){super.connectedCallback(),this.loadOutfits()}async refresh(){await this.loadOutfits()}async loadBackgrounds(){try{const e=await u.libbyBackgrounds();this.backgrounds=e.backgrounds,this.defaultBackground=e.default??""}catch{}}async setDefaultBackground(e){try{const t=await u.setLibbyDefaultBackground(e);this.defaultBackground=t.default,R(e?"That's where she'll be unless a conversation moves her.":"No default room — the plain stage until she moves.","success")}catch(t){R(t.message||"Couldn't set the default background.","error")}}async loadOutfits(){this.loadBackgrounds();try{const e=await u.libbyOutfits();this.outfits=e.outfits,this.activities=e.activities??[],this.outfitError="",this.wornOutfit&&!e.outfits.some(t=>t.id===this.wornOutfit)&&(this.wornOutfit="",ot(""))}catch(e){this.outfitError=e.message||"Couldn't load your wardrobes."}}render(){return r`
      <div class="wardrobe-intro">
        An outfit swaps Libby's artwork: one sprite per expression, per heat tier —
        ${_i} in all for a complete wardrobe — plus one picture for each of the
        optional Misc states she can put herself into. An empty expression falls back to
        the calmer art, then to the bundled default; an empty Misc state falls back to
        the bundled Libby doing the same thing, then to her expression. Which outfit
        she wears is per-device. Click a card to wear it; Build opens it on the board.
      </div>
      ${this.outfitError?r`<div class="wardrobe-error" role="alert">${this.outfitError}</div>`:c}
      <div class="outfit-cards">
        <!-- The bundled wardrobe is a card like any other, shown in its own art rather
             than as a "none" row: it is a look you choose, not the absence of one. -->
        <button
          class="outfit-card ${this.wornOutfit===""?"on":""}"
          @click=${()=>this.wearOutfit("")}
          title="Wear Libby's default artwork"
        >
          <img class="cover" src=${Vt("happy",1)} alt="Default Libby" />
          ${this.wornOutfit===""?r`<span class="worn-badge">Wearing</span>`:c}
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
    `}renderBackgrounds(){const e=this.backgroundDraft;return r`
      <div class="scene-head"><h3>Backgrounds</h3><span class="wardrobe-intro" style="margin:0">Rooms for the video call. Tag them so she can choose where she is; mark one as the default and every conversation starts there. A generated picture can become one from its right-click menu.</span></div>
      <div class="scene-cards">
        ${this.backgrounds.map(t=>r`<button class="scene-card" title="Edit ${t.name}" @click=${()=>this.openBackgroundEditor(t)}>
          ${t.hasImage?r`<img class="cover" src=${u.libbyBackgroundURL(t.id,this.backgroundVersion)} alt=${t.name} loading="lazy" />`:r`<div class="cover-empty">No picture yet</div>`}
          ${t.id===this.defaultBackground?r`<span class="default-badge">Default</span>`:c}
          <div class="card-body"><div class="card-name">${t.name}</div><div class="card-meta">${t.tags.length?t.tags.join(", "):"No tags — she can only pick it by name"}</div></div>
        </button>`)}
        <button class="scene-card" title="Add a background" @click=${()=>this.backgroundDraft={name:"",tags:""}}>
          <div class="cover-empty"><span><span class="material-symbols-rounded" style="font-size:26px; display:block;">add</span>New background</span></div>
          <div class="card-body"><div class="card-name">New background</div><div class="card-meta">A room, a bed, a balcony…</div></div>
        </button>
      </div>
      ${e?r`<div class="scene-editor">
        <label class="drop"
          @dragover=${t=>{t.preventDefault(),t.currentTarget.classList.add("dragover")}}
          @dragleave=${t=>t.currentTarget.classList.remove("dragover")}
          @drop=${t=>{var i,s;t.preventDefault(),t.currentTarget.classList.remove("dragover"),this.stageBackground((s=(i=t.dataTransfer)==null?void 0:i.files)==null?void 0:s[0])}}>
          ${e.image?r`<img src=${e.image} alt="" />`:e.id&&e.hasImage?r`<img src=${u.libbyBackgroundURL(e.id,this.backgroundVersion)} alt="" />`:r`<span>Drop a picture here<br />or click to browse<br /><small>Landscape works best</small></span>`}
          <input type="file" accept="image/*" style="display:none;" @change=${t=>{var s;const i=t.target;this.stageBackground((s=i.files)==null?void 0:s[0]),i.value=""}} />
        </label>
        <div class="scene-fields">
          <label>Name<input .value=${e.name} placeholder="Bedroom" maxlength="60" @input=${t=>this.backgroundDraft={...e,name:t.target.value}} /></label>
          <label>Tags — what it is, comma separated<input .value=${e.tags} placeholder="bedroom, night, lamp, cosy" @input=${t=>this.backgroundDraft={...e,tags:t.target.value}} /></label>
          <span class="wardrobe-intro" style="margin:0">She reads the name and the tags when deciding where to be: "going to bed" finds a room tagged bed, "somewhere darker" one tagged night.</span>
        </div>
        <div class="scene-actions">
          <button class="outfit-btn on" ?disabled=${this.backgroundBusy||!e.name.trim()} @click=${()=>void this.saveBackground()}>${e.id?"Save":"Add background"}</button>
          <button class="outfit-btn" ?disabled=${this.backgroundBusy} @click=${()=>this.backgroundDraft=null}>Cancel</button>
          ${e.id&&e.hasImage?r`<button class="outfit-btn ${e.id===this.defaultBackground?"on":""}" ?disabled=${this.backgroundBusy}
            title="Where she is when a conversation has not moved her"
            @click=${()=>void this.setDefaultBackground(e.id===this.defaultBackground?"":e.id)}>
            ${e.id===this.defaultBackground?"Default room ✓":"Make this the default"}
          </button>`:c}
          ${e.id?r`<button class="outfit-btn danger" ?disabled=${this.backgroundBusy} @click=${()=>void this.deleteBackground()}>Delete</button>`:c}
        </div>
      </div>`:c}
    `}openBackgroundEditor(e){this.backgroundDraft={id:e.id,name:e.name,tags:e.tags.join(", "),hasImage:e.hasImage}}stageBackground(e){if(!e||!this.backgroundDraft)return;const t=new FileReader;t.onload=()=>{this.backgroundDraft&&(this.backgroundDraft={...this.backgroundDraft,image:String(t.result)})},t.readAsDataURL(e)}async saveBackground(){const e=this.backgroundDraft;if(!(!e||!e.name.trim())){this.backgroundBusy=!0;try{const t=await u.saveLibbyBackground({id:e.id,name:e.name.trim(),tags:e.tags.split(",").map(i=>i.trim()).filter(Boolean)});e.image&&await u.setLibbyBackgroundImage(t.id,e.image),this.backgroundVersion++,this.backgroundDraft=null,await this.loadBackgrounds(),!e.image&&!e.hasImage&&R("Saved — add a picture and she can go there.","success")}catch(t){R(t.message||"Couldn't save that background.","error")}finally{this.backgroundBusy=!1}}}async deleteBackground(){const e=this.backgroundDraft;if(!(!(e!=null&&e.id)||!confirm(`Delete "${e.name}"?`))){this.backgroundBusy=!0;try{await u.deleteLibbyBackground(e.id),this.backgroundDraft=null,await this.loadBackgrounds()}catch(t){R(t.message||"Couldn't delete that background.","error")}finally{this.backgroundBusy=!1}}}wearOutfit(e){this.wornOutfit=e,ot(e)}openOutfitEditor(e){const t=[];if(e.emotionLevels)for(const[i,s]of Object.entries(e.emotionLevels))for(const a of s)t.push(ue(i,a));else for(const i of e.emotions)t.push(ue(i,0));for(const[i,s]of Object.entries(e.activityLevels??{}))for(const a of s)t.push(ue(i,a));this.outfitDraft={id:e.id,name:e.name,existing:t,staged:{},removed:[],level:0,hasCover:e.hasThumb!==!1}}isActivity(e){return this.activities.some(t=>t.id===e)}toggleRemove(e){const t=this.outfitDraft;if(!t)return;const i=t.removed.includes(e)?t.removed.filter(a=>a!==e):[...t.removed,e],s={...t.staged};t.removed.includes(e)||delete s[e],this.outfitDraft={...t,removed:i,staged:s}}renderSlot(e,t,i,s){const a=this.isActivity(t)?0:e.level,o=ue(t,a),l=e.staged[o],n=e.removed.includes(o),p=!l&&e.id&&e.existing.includes(o)?u.libbyEmotionURL(e.id,t,a,this.outfitCoverVersion):"";return r`
      <label
        class="slot ${n?"removed":""}"
        @dragover=${h=>{h.preventDefault(),h.currentTarget.classList.add("dragover")}}
        @dragleave=${h=>h.currentTarget.classList.remove("dragover")}
        @drop=${h=>{var f,g;h.preventDefault(),h.currentTarget.classList.remove("dragover"),this.stageEmotion(t,(g=(f=h.dataTransfer)==null?void 0:f.files)==null?void 0:g[0])}}
      >
        ${l?r`<img src=${l} alt=${i} />`:p?r`<img src=${p} alt=${i} />`:r`<div class="drop-hint">Drop an image here<br />or click to browse</div>`}
        ${p||l?r`<span class="slot-actions">
          ${p&&e.id?r`<button type="button" class="slot-act" title="Edit this sprite in the studio — adjust the cutout, redo it, or replace it"
            @click=${h=>{h.preventDefault(),h.stopPropagation(),this.requestEdit(e.id,t,a)}}>
            <span class="material-symbols-rounded" style="font-size:16px;">edit</span></button>`:c}
          <button type="button" class="slot-act danger" title=${n?"Keep this sprite after all":l?"Discard the dropped picture":"Remove this sprite on save"}
            @click=${h=>{h.preventDefault(),h.stopPropagation(),l?this.unstage(o):this.toggleRemove(o)}}>
            <span class="material-symbols-rounded" style="font-size:16px;">${n?"undo":"delete"}</span></button>
        </span>`:c}
        <div class="slot-label">${i}${n?" — removing":""}</div>
        <div class="slot-hint">${s}</div>
        <input
          type="file"
          accept="image/*"
          style="display:none;"
          @change=${h=>{var g;const f=h.target;this.stageEmotion(t,(g=f.files)==null?void 0:g[0]),f.value=""}}
        />
      </label>
    `}renderCoverPicker(e){const t=e.cover||(e.id&&e.hasCover?u.libbyOutfitThumbURL(e.id,this.outfitCoverVersion):"");return r`<div class="cover-picker">
      ${t?r`<img src=${t} alt="Outfit cover" />`:r`<div class="cover-blank">No cover</div>`}
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
              @change=${i=>{var a;const s=i.target;this.stageCover((a=s.files)==null?void 0:a[0]),s.value=""}}
            />
          </label>
          ${e.cover||e.hasCover?r`<button class="outfit-btn" @click=${()=>this.clearCover()}>Use outfit art</button>`:c}
        </div>
      </div>
    </div>`}stageCover(e){if(!e||!e.type.startsWith("image/")||!this.outfitDraft)return;const t=new FileReader;t.onload=()=>{this.outfitDraft&&(this.outfitDraft={...this.outfitDraft,cover:String(t.result)})},t.readAsDataURL(e)}async clearCover(){const e=this.outfitDraft;if(e&&(this.outfitDraft={...e,cover:void 0,hasCover:!1},!!e.id))try{await u.clearLibbyOutfitThumb(e.id),this.outfitCoverVersion=Date.now(),await this.loadOutfits()}catch(t){this.outfitError=t.message}}stageEmotion(e,t){if(!t||!t.type.startsWith("image/")||!this.outfitDraft)return;const i=ue(e,this.isActivity(e)?0:this.outfitDraft.level),s=new FileReader;s.onload=()=>{this.outfitDraft&&(this.outfitDraft={...this.outfitDraft,staged:{...this.outfitDraft.staged,[i]:String(s.result)},removed:this.outfitDraft.removed.filter(a=>a!==i)})},s.readAsDataURL(t)}unstage(e){const t=this.outfitDraft;if(!t)return;const i={...t.staged};delete i[e],this.outfitDraft={...t,staged:i}}requestEdit(e,t,i){this.outfitDraft=null,this.dispatchEvent(new CustomEvent("edit-slot",{detail:{outfitId:e,slot:t,level:i},bubbles:!0,composed:!0}))}async saveOutfit(){const e=this.outfitDraft;if(!(!e||!e.name.trim()||this.outfitBusy)){this.outfitBusy=!0;try{const t=await u.saveLibbyOutfit({id:e.id,name:e.name.trim()});for(const i of e.removed){const[s,a]=i.split(":");await u.deleteLibbyEmotion(t.id,s,Number(a)).catch(()=>{})}for(const[i,s]of Object.entries(e.staged)){const[a,o]=i.split(":");await u.setLibbyEmotion(t.id,a,s,Number(o))}this.outfitCoverVersion=Date.now(),e.cover&&(await u.setLibbyOutfitThumb(t.id,e.cover),this.outfitCoverVersion=Date.now()),this.outfitDraft=null,await this.loadOutfits()}catch(t){this.outfitError=t.message}finally{this.outfitBusy=!1}}}async deleteOutfit(){var s;const e=this.outfitDraft;if(!(e!=null&&e.id)||this.outfitBusy)return;const t=((s=this.outfits.find(a=>a.id===e.id))==null?void 0:s.wip)??0,i=t?`

This also deletes ${t} generated square${t===1?"":"s"} the outfit studio is holding for it.`:"";if(confirm(`Delete the “${e.name}” outfit?${i}`)){this.outfitBusy=!0;try{await u.deleteLibbyOutfit(e.id);const a=ve("libraryDelete");R(a.message,"success",{emotion:a.emotion,intensity:a.intensity}),this.wornOutfit===e.id&&this.wearOutfit(""),this.outfitDraft=null,await this.loadOutfits()}catch(a){this.outfitError=a.message}finally{this.outfitBusy=!1}}}renderOutfitCard(e){const t=this.wornOutfit===e.id,i=e.slots??e.emotions.length;return r`<button
      class="outfit-card ${t?"on":""}"
      @click=${()=>this.wearOutfit(t?"":e.id)}
      title=${t?`Take off “${e.name}”`:`Wear “${e.name}”`}
    >
      ${e.hasThumb===!1?r`<div class="cover-empty">No art yet</div>`:r`<img
            class="cover"
            src=${u.libbyOutfitThumbURL(e.id,this.outfitCoverVersion)}
            alt=${e.name}
            loading="lazy"
            @error=${s=>{s.target.replaceWith(Object.assign(document.createElement("div"),{className:"cover-empty",textContent:"No art yet"}))}}
          />`}
      ${t?r`<span class="worn-badge">Wearing</span>`:c}
      <span
        class="card-build"
        role="button"
        tabindex="0"
        title=${`Open “${e.name}” on the board to generate or fix its squares`}
        @click=${s=>{s.stopPropagation(),this.requestBuild(e.id)}}
        @keydown=${s=>{s.key!=="Enter"&&s.key!==" "||(s.preventDefault(),s.stopPropagation(),this.requestBuild(e.id))}}
      >Build</span>
      <span
        class="card-edit"
        role="button"
        tabindex="0"
        title=${`Edit “${e.name}”`}
        @click=${s=>{s.stopPropagation(),this.openOutfitEditor(e)}}
        @keydown=${s=>{s.key!=="Enter"&&s.key!==" "||(s.preventDefault(),s.stopPropagation(),this.openOutfitEditor(e))}}
      >Edit</span>
      <div class="card-body">
        <div class="card-name">${e.name}</div>
        <div class="card-meta">
          ${e.emotions.length}/${Ze.length} emotions${i>e.emotions.length?r` · ${i} images`:c}${e.activitySlots?r` · ${e.activitySlots} misc`:c}
          <!-- Unfinished squares are the reason a wardrobe with no sprites is not an
               empty wardrobe: they are hours of generation the studio is holding. -->
          ${e.wip?r`<br />${e.wip} in progress`:c}
        </div>
      </div>
    </button>`}requestBuild(e){this.dispatchEvent(new CustomEvent("build-outfit",{detail:{outfitId:e},bubbles:!0,composed:!0}))}renderOutfitEditor(e){return r`
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
            ${Pe.map((t,i)=>r`<button
                class="tier-tab ${e.level===i?"on":""}"
                @click=${()=>this.outfitDraft={...e,level:i}}
                title="Shown as the horniness meter reaches this tier"
              >${t}</button>`)}
          </div>
          <p class="tier-note">
            ${e.level===0?"Baseline art — worn when the meter is low, and the fallback for any tier you leave empty.":`Shown as Libby’s horniness meter climbs into the “${Pe[e.level]}” range.`}
          </p>
          ${this.renderCoverPicker(e)}
          <div class="slots">
            ${Ze.map(t=>this.renderSlot(e,t.id,t.label,t.borrows?`${t.hint} · Optional, borrows ${t.borrows}`:t.hint))}
          </div>
          ${this.activities.length?r`
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
              ${this.activities.map(t=>this.renderSlot(e,t.id,t.auto?`${t.label} — while she writes`:t.label,t.auto?"Shown with a speech bubble while a reply is on its way; she never picks it herself":t.minIntensity>1?`${t.says} · from tier ${Pe[t.minIntensity-1]}`:t.says))}
            </div>
          `:c}
          <div class="outfit-actions">
            ${e.id?r`<button class="outfit-btn danger" ?disabled=${this.outfitBusy} @click=${()=>this.deleteOutfit()}>
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
    `}};N.styles=[re,ie`
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
  `];G([d()],N.prototype,"outfits",2);G([d()],N.prototype,"activities",2);G([d()],N.prototype,"backgrounds",2);G([d()],N.prototype,"defaultBackground",2);G([d()],N.prototype,"backgroundDraft",2);G([d()],N.prototype,"backgroundBusy",2);G([d()],N.prototype,"backgroundVersion",2);G([d()],N.prototype,"wornOutfit",2);G([d()],N.prototype,"outfitDraft",2);G([d()],N.prototype,"outfitBusy",2);G([d()],N.prototype,"outfitError",2);G([d()],N.prototype,"outfitCoverVersion",2);N=G([le("oppai-outfit-wardrobe")],N);const Ni=new TextEncoder;function I(e,t,i){e.setUint16(t,i,!0)}function U(e,t,i){e.setUint32(t,i>>>0,!0)}let ke;function Fi(e){if(!ke){ke=new Uint32Array(256);for(let i=0;i<256;i++){let s=i;for(let a=0;a<8;a++)s=s&1?3988292384^s>>>1:s>>>1;ke[i]=s>>>0}}let t=4294967295;for(const i of e)t=ke[(t^i)&255]^t>>>8;return(t^4294967295)>>>0}function Ui(e){return{date:Math.min(2107,Math.max(1980,e.getFullYear()))-1980<<9|e.getMonth()+1<<5|e.getDate(),time:e.getHours()<<11|e.getMinutes()<<5|Math.floor(e.getSeconds()/2)}}function ji(e){return e.buffer instanceof ArrayBuffer?e.byteOffset===0&&e.byteLength===e.buffer.byteLength?e.buffer:e.buffer.slice(e.byteOffset,e.byteOffset+e.byteLength):e.slice().buffer}async function Gi(e){return e instanceof Uint8Array?e:e instanceof ArrayBuffer?new Uint8Array(e):new Uint8Array(await e.arrayBuffer())}async function Wi(e,t=new Date){if(e.length>65535)throw new Error("Too many files for one ZIP archive.");const i=Ui(t),s=[],a=[];let o=0;for(const g of e){const y=g.name.replaceAll("\\","_").replaceAll("/","_")||"file",k=Ni.encode(y),S=await Gi(g.data);if(k.length>65535||S.length>4294967295)throw new Error(`File is too large for ZIP: ${y}`);const M=Fi(S),z=new Uint8Array(30+k.length),L=new DataView(z.buffer);U(L,0,67324752),I(L,4,20),I(L,6,2048),I(L,8,0),I(L,10,i.time),I(L,12,i.date),U(L,14,M),U(L,18,S.length),U(L,22,S.length),I(L,26,k.length),I(L,28,0),z.set(k,30),s.push({header:z,data:S});const D=new Uint8Array(46+k.length),P=new DataView(D.buffer);U(P,0,33639248),I(P,4,20),I(P,6,20),I(P,8,2048),I(P,10,0),I(P,12,i.time),I(P,14,i.date),U(P,16,M),U(P,20,S.length),U(P,24,S.length),I(P,28,k.length),I(P,30,0),I(P,32,0),I(P,34,0),I(P,36,0),U(P,38,0),U(P,42,o),D.set(k,46),a.push(D),o+=z.length+S.length}const l=a.reduce((g,y)=>g+y.length,0),n=new Uint8Array(22),p=new DataView(n.buffer);U(p,0,101010256),I(p,4,0),I(p,6,0),I(p,8,e.length),I(p,10,e.length),U(p,12,l),U(p,16,o),I(p,20,0);const f=[...s.flatMap(g=>[g.header,g.data]),...a,n].map(ji);return new Blob(f,{type:"application/zip"})}var qi=Object.defineProperty,Hi=Object.getOwnPropertyDescriptor,B=(e,t,i,s)=>{for(var a=s>1?void 0:s?Hi(t,i):t,o=e.length-1,l;o>=0;o--)(l=e[o])&&(a=(s?l(t,i,a):l(a))||a);return s&&a&&qi(t,i,a),a};const Vi=40,Ki=[{id:"newest",label:"Newest first"},{id:"oldest",label:"Oldest first"},{id:"name",label:"By name",a1111Only:!0},{id:"largest",label:"Largest first",a1111Only:!0}];let O=class extends ne{constructor(){super(...arguments),this.backend="invokeai",this.boards=[],this.sort="newest",this.info=null,this.infoError="",this.board="none",this.items=[],this.total=0,this.loading=!1,this.error="",this.expanded=null,this.busy=!1,this.newBoard="",this.savedNames=new Set,this.selecting=!1,this.selected=new Set,this.metadata=new Map,this.onKey=e=>{if(this.expanded){if(e.key==="ArrowLeft")this.step(-1);else if(e.key==="ArrowRight")this.step(1);else if(e.key==="Escape")this.expanded=null;else return;e.preventDefault()}}}connectedCallback(){super.connectedCallback(),Kt(this,"generation gallery"),window.addEventListener("keydown",this.onKey),this.refresh()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("keydown",this.onKey)}get a1111(){return this.backend==="a1111"}labelOf(e){return e.label||e.name}open(e){this.expanded=e,this.info=this.metadata.get(e.name)??null,this.infoError="",!this.info&&this.imageInfo(e).then(t=>{var i;((i=this.expanded)==null?void 0:i.name)===e.name&&(this.info=t)},t=>{var i;((i=this.expanded)==null?void 0:i.name)===e.name&&(this.infoError=t.message)})}async step(e){const t=this.items.findIndex(s=>{var a;return s.name===((a=this.expanded)==null?void 0:a.name)});if(t<0)return;let i=this.items[t+e];!i&&e>0&&this.items.length<this.total&&(await this.loadPage(!1),i=this.items[t+e]),i&&this.open(i)}pickSort(e){e!==this.sort&&(this.sort=e,this.items=[],this.loadPage(!0))}get selectedBoard(){return this.board}announceBoard(){this.dispatchEvent(new CustomEvent("board-changed",{detail:{board:this.board},bubbles:!0,composed:!0}))}async refresh(){this.error="";try{const e=await u.galleryBoards();this.boards=e.boards,!this.boards.some(t=>t.id===this.board)&&this.boards.length&&(this.board=this.boards[0].id),this.announceBoard()}catch(e){this.error=e.message;return}await this.loadPage(!0)}async loadPage(e){if(!this.loading){this.loading=!0;try{const t=e?0:this.items.length,i=await u.galleryImages(this.board,t,Vi,this.sort);this.items=e?i.items:[...this.items,...i.items],this.total=i.total}catch(t){this.error=t.message}finally{this.loading=!1}}}pickBoard(e){this.board!==e&&(this.board=e,this.items=[],this.announceBoard(),this.loadPage(!0))}async createBoard(){const e=this.newBoard.trim();if(!(!e||this.busy)){this.busy=!0,this.error="";try{const t=await u.createGalleryBoard(e);this.newBoard="",await this.refresh(),this.pickBoard(t.id),this.dispatchEvent(new CustomEvent("boards-changed",{bubbles:!0,composed:!0}))}catch(t){this.error=t.message}finally{this.busy=!1}}}async deleteBoard(){const e=this.boards.find(t=>t.id===this.board);if(!(!e||e.id==="none"||this.busy)&&confirm(`Delete the “${e.name}” gallery? Its images move back to Uncategorized.`)){this.busy=!0,this.error="";try{await u.deleteGalleryBoard(e.id);const t=ve("galleryDelete");R(t.message,"success",{emotion:t.emotion,intensity:t.intensity}),this.board="none",this.items=[],await this.refresh(),this.dispatchEvent(new CustomEvent("boards-changed",{bubbles:!0,composed:!0}))}catch(t){this.error=t.message}finally{this.busy=!1}}}async deleteImage(e){var t;if(!this.busy){this.busy=!0;try{await u.deleteGalleryImage(e.name);const i=ve("galleryDelete");R(i.message,"success",{emotion:i.emotion,intensity:i.intensity}),this.items=this.items.filter(s=>s.name!==e.name),this.total=Math.max(0,this.total-1),this.boards=this.boards.map(s=>s.id===this.board?{...s,count:Math.max(0,s.count-1)}:s),((t=this.expanded)==null?void 0:t.name)===e.name&&(this.expanded=null)}catch(i){this.error=i.message}finally{this.busy=!1}}}async saveToLibrary(e){if(!(this.busy||this.savedNames.has(e.name))){this.busy=!0;try{await u.saveGalleryImage({name:e.name}),this.savedNames=new Set(this.savedNames).add(e.name),this.dispatchEvent(new CustomEvent("imported",{detail:{count:1,kind:"image",title:e.name},bubbles:!0,composed:!0}))}catch(t){this.error=t.message}finally{this.busy=!1}}}async openShareMenu(e,t,i){let s=[];try{s=(await u.chatWorkspace()).characters??[]}catch(a){R(a.message||"Couldn't load your chat characters.","error");return}if(!s.length){R("No chat characters yet — add one in Chat first.","error");return}Ge({x:t,y:i,title:"Show this to",items:s.map(a=>({label:a.name,icon:"person",run:()=>void this.share(e,a)}))})}async imageInfo(e){const t=this.metadata.get(e.name);if(t)return t;const i=ai(await u.galleryImageMetadata(e.name));return this.metadata.set(e.name,i),i}openImageMenu(e,t){t.preventDefault(),Ge({x:t.clientX,y:t.clientY,title:this.labelOf(e),items:[{label:"Copy generation metadata",icon:"content_copy",run:()=>void this.copyMetadata(e)},{label:"Use same generation parameters",icon:"replay",run:()=>void this.reuseMetadata(e)},{label:"Export PNG for Civitai",icon:"download",run:()=>void this.exportImage(e)},{label:"Send to chat",icon:"forum",run:()=>void this.openShareMenu(e,t.clientX,t.clientY)}]})}async copyMetadata(e){try{if(!await _t(oe(await this.imageInfo(e))))throw new Error("Clipboard permission was denied.");R("Generation metadata copied.","success")}catch(t){R(t.message||"Couldn't copy generation metadata.","error")}}async reuseMetadata(e){try{const t=await this.imageInfo(e);this.dispatchEvent(new CustomEvent("reuse-generation",{detail:t,bubbles:!0,composed:!0})),this.expanded=null}catch(t){R(t.message||"Couldn't load generation metadata.","error")}}async exportImage(e){try{const t=await this.imageInfo(e),i=this.labelOf(e).replace(/\.[a-z0-9]+$/i,"")||"generated-image";await Nt(u.galleryFullURL(e.name),`${i}-civitai.png`,oe(t),be(t)),R("PNG exported with Civitai metadata.","success")}catch(t){R(t.message||"Couldn't export that image.","error")}}async share(e,t){try{await Xt(u.galleryFullURL(e.name),t.id,this.labelOf(e)),this.expanded=null,this.dispatchEvent(new CustomEvent("open-chat",{bubbles:!0,composed:!0}))}catch(i){R(i.message||`Couldn't share with ${t.name}.`,"error")}}toggleSelecting(){this.selecting=!this.selecting,this.selecting||(this.selected=new Set)}toggleSelected(e){const t=new Set(this.selected);t.has(e)?t.delete(e):t.add(e),this.selected=t}async deleteSelected(){const e=[...this.selected];if(!(!e.length||this.busy)){this.busy=!0;try{await u.deleteGalleryImages(e);const t=ve("galleryDelete",{count:e.length});R(t.message,"success",{emotion:t.emotion,intensity:t.intensity});const i=this.selected;this.items=this.items.filter(s=>!i.has(s.name)),this.total=Math.max(0,this.total-e.length),this.boards=this.boards.map(s=>s.id===this.board?{...s,count:Math.max(0,s.count-e.length)}:s),this.selected=new Set,this.selecting=!1}catch(t){this.error=t.message}finally{this.busy=!1}}}async addSelectedToBoard(e){const t=[...this.selected];if(!(!t.length||!e||e===this.board||this.busy)){this.busy=!0;try{await u.addGalleryImagesToBoard(e,t);const i=this.selected;this.items=this.items.filter(s=>!i.has(s.name)),this.total=Math.max(0,this.total-t.length),this.selected=new Set,this.selecting=!1,await this.refresh()}catch(i){this.error=i.message}finally{this.busy=!1}}}render(){const e=this.boards.find(t=>t.id===this.board);return r`
      <div class="panel">
        <div class="head">
          <span class="material-symbols-rounded" style="font-size:18px;">photo_library</span>
          ${this.a1111?"A1111 outputs":"Invoke gallery"}
          <span class="count">${e?`${this.total||e.count} images`:""}</span>
          ${this.items.length?r`<button class="sel-toggle ${this.selecting?"on":""}"
                @click=${()=>this.toggleSelecting()}>
                ${this.selecting?"Done":"Select"}
              </button>`:c}
        </div>
        ${this.selecting?r`<div class="sel-bar">
              <span class="sel-count">${this.selected.size} selected</span>
              ${this.a1111?c:r`<select class="sel-move" aria-label="Move to gallery" .value=${""}
                ?disabled=${this.busy||!this.selected.size}
                @change=${t=>{const i=t.target;this.addSelectedToBoard(i.value),i.value=""}}>
                <option value="">Add to gallery…</option>
                ${this.boards.filter(t=>t.id!==this.board).map(t=>r`<option value=${t.id}>${t.name}</option>`)}
              </select>`}
              <button class="sel-del" ?disabled=${this.busy||!this.selected.size}
                @click=${()=>this.deleteSelected()}>
                <span class="material-symbols-rounded" style="font-size:15px; vertical-align:-3px;">delete</span>
                Delete
              </button>
            </div>`:c}
        ${this.boards.length?r`
              <div class="sort-row">
                <select class="board-select" aria-label="Gallery" .value=${this.board}
                  @change=${t=>this.pickBoard(t.target.value)}>
                  ${this.boards.map(t=>r`<option value=${t.id} ?selected=${t.id===this.board}>${t.name}${t.count?` · ${t.count}`:""}</option>`)}
                </select>
                <select class="board-select" aria-label="Order" style="flex:none;width:auto;"
                  @change=${t=>this.pickSort(t.target.value)}>
                  ${Ki.filter(t=>this.a1111||!t.a1111Only).map(t=>r`<option value=${t.id} ?selected=${t.id===this.sort}>${t.label}</option>`)}
                </select>
              </div>
              ${this.boards.length<=6?r`<div class="boards">
                ${this.boards.map(t=>r`<button class="board ${t.id===this.board?"on":""}"
                    @click=${()=>this.pickBoard(t.id)}>${t.name}${t.count?` · ${t.count}`:""}</button>`)}
              </div>`:c}
              ${this.board!=="none"&&!this.a1111?r`<button class="board-del" ?disabled=${this.busy}
                    title="Delete this gallery (its images move to Uncategorized)"
                    @click=${()=>this.deleteBoard()}>
                    <span class="material-symbols-rounded" style="font-size:15px; vertical-align:-3px;">delete</span>
                    Delete gallery
                  </button>`:c}
            `:c}
        ${this.a1111?r`<div class="note">What Automatic1111 saved to its outputs folder — each folder it writes into is a board.</div>`:r`<div class="note">New generations are filed into ${(e==null?void 0:e.name)??"this gallery"}.</div>
            <div class="new-board">
              <input maxlength="300" placeholder="New Invoke gallery" .value=${this.newBoard}
                @input=${t=>this.newBoard=t.target.value}
                @keydown=${t=>{t.key==="Enter"&&this.createBoard()}} />
              <button ?disabled=${this.busy||!this.newBoard.trim()} @click=${()=>this.createBoard()}>Create</button>
            </div>`}
        ${this.error?r`<div class="err">${this.error}</div>`:c}
        ${this.items.length?r`<div class="grid">
              ${this.items.map(t=>{const i=this.selected.has(t.name);return r`
                  <button
                    class="tile ${this.selecting?"selectable":""} ${i?"picked":""}"
                    title=${this.labelOf(t)}
                    @contextmenu=${s=>{this.selecting||(s.preventDefault(),this.openImageMenu(t,s))}}
                    @click=${()=>this.selecting?this.toggleSelected(t.name):this.open(t)}
                  >
                    <img src=${u.galleryThumbURL(t.name)} alt="Generated image" loading="lazy" />
                    ${this.selecting?r`<span class="check">
                          <span class="material-symbols-rounded" style="font-size:15px;">
                            ${i?"check_circle":"radio_button_unchecked"}
                          </span>
                        </span>`:r`<span
                          class="del"
                          role="button"
                          title=${this.a1111?"Delete from the outputs folder":"Delete from InvokeAI"}
                          @click=${s=>{s.stopPropagation(),this.deleteImage(t)}}
                        >
                          <span class="material-symbols-rounded" style="font-size:14px;">delete</span>
                        </span>`}
                  </button>
                `})}
            </div>`:this.loading?c:r`<div class="note">${this.a1111?"No pictures in this folder.":"Nothing here yet — generated images land in this gallery."}</div>`}
        ${this.loading?r`<div class="note">Loading…</div>`:c}
        ${!this.loading&&this.items.length<this.total?r`<button class="more" @click=${()=>this.loadPage(!1)}>
              Load more (${this.total-this.items.length} left)
            </button>`:c}
      </div>
      ${this.expanded?this.renderExpanded(this.expanded):c}
    `}renderExpanded(e){const t=this.savedNames.has(e.name),i=this.items.findIndex(a=>a.name===e.name),s=i+1<this.items.length||this.items.length<this.total;return r`
      <div class="overlay" @click=${a=>{a.target===a.currentTarget&&(this.expanded=null)}}>
        <div class="viewer">
          <div class="stage">
            <img src=${u.galleryFullURL(e.name)} alt="Generated image"
              @contextmenu=${a=>this.openImageMenu(e,a)} />
            <button class="nav prev" title="Previous (←)" ?disabled=${i<=0} @click=${()=>this.step(-1)}>
              <span class="material-symbols-rounded">chevron_left</span></button>
            <button class="nav next" title="Next (→)" ?disabled=${!s} @click=${()=>this.step(1)}>
              <span class="material-symbols-rounded">chevron_right</span></button>
          </div>
          ${this.renderInfo(e,i)}
        </div>
        <div class="overlay-actions">
          <button class="obtn primary" ?disabled=${this.busy||t} @click=${()=>this.saveToLibrary(e)}>
            <span class="material-symbols-rounded" style="font-size:17px;">${t?"check":"save"}</span>
            ${t?"In library":"Save to library"}
          </button>
          <button class="obtn" ?disabled=${this.busy}
            @click=${a=>void this.openShareMenu(e,a.clientX,a.clientY)}>
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
    `}renderInfo(e,t){const i=this.info,s=e.width&&e.height?`${e.width}×${e.height}`:i!=null&&i.width?`${i.width}×${i.height}`:"",a=e.created?new Date(e.created).toLocaleString():"";return r`<div class="meta">
      <h4>${this.labelOf(e)}<small>${t+1} of ${this.total}</small></h4>
      ${i?r`
            ${i.prompt?r`<div><div class="k">Prompt</div><div class="prompt">${i.prompt}</div></div>`:r`<div class="note">No generation settings were saved with this picture.</div>`}
            ${i.negativePrompt?r`<div><div class="k">Negative</div><div class="prompt">${i.negativePrompt}</div></div>`:c}
            <dl>
              ${i.model?r`<dt>Model</dt><dd>${i.model}</dd>`:c}
              ${i.seed?r`<dt>Seed</dt><dd>${i.seed}</dd>`:c}
              ${i.steps?r`<dt>Steps</dt><dd>${i.steps}</dd>`:c}
              ${i.cfgScale?r`<dt>CFG</dt><dd>${i.cfgScale}</dd>`:c}
              ${i.sampler?r`<dt>Sampler</dt><dd>${i.sampler}</dd>`:c}
              ${i.clipSkip?r`<dt>Clip skip</dt><dd>${i.clipSkip}</dd>`:c}
              ${i.loras.length?r`<dt>LoRAs</dt><dd>${i.loras.map(o=>`${o.name} ${o.weight}`).join(", ")}</dd>`:c}
              ${s?r`<dt>Size</dt><dd>${s}</dd>`:c}
              ${e.size?r`<dt>File</dt><dd>${e.size<1048576?`${Math.max(1,Math.round(e.size/1024))} KB`:`${(e.size/1048576).toFixed(1)} MB`}</dd>`:c}
              ${a?r`<dt>Made</dt><dd>${a}</dd>`:c}
            </dl>
            ${i.prompt?r`<div class="acts">
                  <button @click=${()=>void this.reuseMetadata(e)}><span class="material-symbols-rounded" style="font-size:15px;">replay</span> Use these settings</button>
                  <button @click=${()=>void this.copyMetadata(e)}><span class="material-symbols-rounded" style="font-size:15px;">content_copy</span> Copy</button>
                </div>`:c}`:r`<div class="note">${this.infoError||"Reading its settings…"}</div>`}
    </div>`}};O.styles=[re,Ie,ie`
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
      /* The picture fills its side of the viewer whatever its own size: a 512px
         render shown at 512px leaves most of the screen to the scrim. */
      .overlay img {
        width: 100%;
        height: 78vh;
        object-fit: contain;
        border-radius: 10px;
      }
      @media (max-width: 900px) { .overlay img { height: 60vh; } }
      .viewer {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 16px;
        width: min(96vw, 1500px);
        align-items: center;
      }
      .viewer .stage { position: relative; display: grid; place-items: center; min-height: 0; }
      .viewer .nav {
        position: absolute; top: 50%; transform: translateY(-50%);
        width: 44px; height: 44px; border-radius: 22px; border: none; cursor: pointer;
        background: rgba(0, 0, 0, 0.55); color: #fff; display: grid; place-items: center;
      }
      .viewer .nav.prev { left: 6px; }
      .viewer .nav.next { right: 6px; }
      .viewer .nav:disabled { opacity: 0.3; cursor: default; }
      .meta {
        background: var(--oppai-surface); color: var(--oppai-text); border-radius: 14px; padding: 14px;
        max-height: 78vh; overflow: auto; font-size: 12.5px; display: flex; flex-direction: column; gap: 10px;
      }
      .meta h4 { margin: 0; font-size: 13px; display: flex; align-items: center; gap: 6px; }
      .meta h4 small { margin-left: auto; font-weight: 400; color: var(--oppai-text-muted); }
      .meta .k { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--oppai-text-muted); margin-bottom: 3px; }
      .meta .prompt { white-space: pre-wrap; word-break: break-word; line-height: 1.45; background: var(--oppai-surface-2); border-radius: 9px; padding: 8px 10px; }
      .meta dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px 12px; margin: 0; }
      .meta dt { color: var(--oppai-text-muted); }
      .meta dd { margin: 0; overflow-wrap: anywhere; }
      .meta .acts { display: flex; gap: 6px; flex-wrap: wrap; }
      .meta .acts button {
        border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text); border-radius: 9px;
        font: inherit; font-size: 12px; padding: 6px 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;
      }
      @media (max-width: 900px) {
        .viewer { grid-template-columns: minmax(0, 1fr); }
        .overlay { justify-content: flex-start; overflow-y: auto; }
        .meta { max-height: none; }
      }
      .sort-row { display: flex; gap: 6px; }
      .sort-row .board-select { flex: 1; min-width: 0; }
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
    `];B([E()],O.prototype,"backend",2);B([d()],O.prototype,"boards",2);B([d()],O.prototype,"sort",2);B([d()],O.prototype,"info",2);B([d()],O.prototype,"infoError",2);B([d()],O.prototype,"board",2);B([d()],O.prototype,"items",2);B([d()],O.prototype,"total",2);B([d()],O.prototype,"loading",2);B([d()],O.prototype,"error",2);B([d()],O.prototype,"expanded",2);B([d()],O.prototype,"busy",2);B([d()],O.prototype,"newBoard",2);B([d()],O.prototype,"savedNames",2);B([d()],O.prototype,"selecting",2);B([d()],O.prototype,"selected",2);O=B([le("oppai-invoke-gallery")],O);const Je=[{label:"Portrait",hint:"512×768",w:512,h:768},{label:"Square",hint:"512×512",w:512,h:512},{label:"Landscape",hint:"768×512",w:768,h:512},{label:"Tall",hint:"640×960",w:640,h:960},{label:"XL Portrait",hint:"832×1216",w:832,h:1216},{label:"XL Square",hint:"1024×1024",w:1024,h:1024},{label:"XL Landscape",hint:"1216×832",w:1216,h:832}],Gt=[{id:"",label:"Default (Euler a)"},...[["ddim","DDIM"],["ddpm","DDPM"],["deis","DEIS"],["deis_k","DEIS Karras"],["dpmpp_2s","DPM++ 2S"],["dpmpp_2s_k","DPM++ 2S Karras"],["dpmpp_2m","DPM++ 2M"],["dpmpp_2m_k","DPM++ 2M Karras"],["dpmpp_2m_sde","DPM++ 2M SDE"],["dpmpp_2m_sde_k","DPM++ 2M SDE Karras"],["dpmpp_3m","DPM++ 3M"],["dpmpp_3m_k","DPM++ 3M Karras"],["dpmpp_sde","DPM++ SDE"],["dpmpp_sde_k","DPM++ SDE Karras"],["er_sde","ER-SDE"],["euler","Euler"],["euler_k","Euler Karras"],["euler_a","Euler Ancestral"],["heun","Heun"],["heun_k","Heun Karras"],["kdpm_2","KDPM 2"],["kdpm_2_k","KDPM 2 Karras"],["kdpm_2_a","KDPM 2 Ancestral"],["kdpm_2_a_k","KDPM 2 Ancestral Karras"],["lcm","LCM"],["lms","LMS"],["lms_k","LMS Karras"],["pndm","PNDM"],["tcd","TCD"],["unipc","UniPC"],["unipc_k","UniPC Karras"]].map(([e,t])=>({id:e,label:t}))];/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Qe extends Yt{constructor(t){if(super(t),this.it=c,t.type!==Zt.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===c||t==null)return this._t=void 0,this.it=t;if(t===Jt)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const i=[t];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}}Qe.directiveName="unsafeHTML",Qe.resultType=1;const xt=Qt(Qe);function Xi(e,t){if(e.length===0)return t.slice();const i=e.slice(),s=new Set(e.map(a=>a.id));for(const a of t){if(!s.has(a.id)){s.add(a.id),i.push(a);continue}const o=i[i.length-1];if(o.id===a.id){const l=new Set(o.images.map(n=>n.id));i[i.length-1]={...o,images:[...o.images,...a.images.filter(n=>!l.has(n.id))]}}}return i}function Ne(e){var s;const t=e.createdAt??((s=e.images[0])==null?void 0:s.createdAt)??"";if(!t)return"";const i=new Date(t);return Number.isNaN(i.getTime())?"":i.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}const ge={"euler a":"euler_a",euler:"euler","euler karras":"euler_k",lms:"lms","lms karras":"lms_k",heun:"heun","heun karras":"heun_k",dpm2:"kdpm_2","dpm2 karras":"kdpm_2_k","dpm2 a":"kdpm_2_a","dpm2 a karras":"kdpm_2_a_k","dpm++ 2s a":"dpmpp_2s","dpm++ 2s a karras":"dpmpp_2s_k","dpm++ 2m":"dpmpp_2m","dpm++ 2m karras":"dpmpp_2m_k","dpm++ 2m sde":"dpmpp_2m_sde","dpm++ 2m sde karras":"dpmpp_2m_sde_k","dpm++ 3m sde":"dpmpp_3m","dpm++ 3m sde karras":"dpmpp_3m_k","dpm++ sde":"dpmpp_sde","dpm++ sde karras":"dpmpp_sde_k",ddim:"ddim",ddpm:"ddpm",deis:"deis",unipc:"unipc",lcm:"lcm",pndm:"pndm",tcd:"tcd"};function Yi(e){if(!e)return"";const t=e.trim().toLowerCase().replace(/\s+/g," ");if(ge[t])return ge[t];if(Object.values(ge).includes(t))return t;const i=t.split(" ");for(let s=i.length-1;s>=1;s--){const a=i.slice(0,s).join(" ");if(ge[a])return ge[a]}return""}function Zi(e){const t=/^\s*(\d{2,5})\s*[x×]\s*(\d{2,5})\s*$/i.exec(e??"");if(!t)return null;const i=Number(t[1]),s=Number(t[2]);return i>=64&&s>=64?[i,s]:null}function yt(e){var o;const t=(e.prompt??"").trim();if(!t)return null;const i={prompt:t};(o=e.negativePrompt)!=null&&o.trim()&&(i.negativePrompt=e.negativePrompt.trim());const s=Yi(e.sampler);s&&(i.sampler=s),e.steps&&e.steps>0&&e.steps<=150&&(i.steps=Math.round(e.steps)),e.cfgScale&&e.cfgScale>0&&e.cfgScale<=30&&(i.cfgScale=e.cfgScale),e.seed&&e.seed>0&&(i.seed=e.seed);const a=Zi(e.size)??(e.width>=64&&e.height>=64?[e.width,e.height]:null);return a&&([i.width,i.height]=a),i}var Ji=Object.defineProperty,Qi=Object.getOwnPropertyDescriptor,x=(e,t,i,s)=>{for(var a=s>1?void 0:s?Qi(t,i):t,o=e.length-1,l;o>=0;o--)(l=e[o])&&(a=(s?l(t,i,a):l(a))||a);return s&&a&&Ji(t,i,a),a};const es=[{id:"",label:"All"},{id:"checkpoint",label:"Checkpoints"},{id:"lora",label:"LoRAs"},{id:"embedding",label:"Embeddings"},{id:"vae",label:"VAEs"},{id:"controlnet",label:"ControlNet"},{id:"upscaler",label:"Upscalers"}],ts=[{id:"",label:"Most downloaded"},{id:"rated",label:"Highest rated"},{id:"liked",label:"Most liked"},{id:"newest",label:"Newest"},{id:"collected",label:"Most collected"},{id:"discussed",label:"Most discussed"},{id:"images",label:"Most images"}],is=[{id:"",label:"All time"},{id:"year",label:"This year"},{id:"month",label:"This month"},{id:"week",label:"This week"},{id:"day",label:"Today"}],ss=["SD 1.5","SD 2.1","SDXL 1.0","Pony","Illustrious","NoobAI","Flux.1 D","Flux.1 S","SD 3.5","Kolors","Hunyuan 1","Wan Video"];let v=class extends ne{constructor(){super(...arguments),this.backend="invokeai",this.canManage=!0,this.manageNote="",this.tab="browse",this.q="",this.type="",this.sort="",this.period="",this.base="",this.category="",this.creator="",this.nsfw=!0,this.categories=[],this.items=[],this.cursor="",this.loading=!1,this.error="",this.detail=null,this.detailLoading=!1,this.versionId=0,this.shownImage="",this.zoomed="",this.galleryOpen=!1,this.gallery=[],this.galleryCursor="",this.galleryLoading=!1,this.gallerySort="",this.picked=null,this.copied=!1,this.promptsNeedKey=!1,this.jobs=[],this.installing=!1,this.jobsOpen=!1,this.me=null,this.meError="",this.meLoading=!1,this.accountTab="models",this.myImages=[],this.myImagesCursor="",this.myModels=[],this.myModelsCursor="",this.myModelsLoading=!1,this.posts=[],this.postsCursor="",this.postsLoading=!1,this.openPost=null,this.collections=[],this.collectionsCursor="",this.collectionsLoading=!1,this.collectionQuery="",this.collectionSort="newest",this.openCollection=null,this.collectionImages=[],this.collectionImagesCursor="",this.installed=[],this.installedLoading=!1,this.installedError="",this.installedFilter="all",this.syncing="",this.syncNote="",this.pinning="",this.pinVersion="",this.manageKey="",this.managePage=null,this.manageVersion=0,this.manageBusy=!1}get genName(){return this.backend==="invokeai"?"InvokeAI":"Automatic1111"}connectedCallback(){super.connectedCallback(),this.search(!0),this.loadCategories(),this.pollJobs(),this.jobTimer=window.setInterval(()=>void this.pollJobs(),5e3)}disconnectedCallback(){super.disconnectedCallback(),this.jobTimer&&clearInterval(this.jobTimer)}async loadCategories(){try{this.categories=(await u.civitaiCategories()).categories}catch{this.categories=[]}}async pollJobs(){try{const t=(await u.civitaiInstalls()).jobs.filter(s=>s.status!=="cancelled").slice(0,5),i=t.some(s=>s.status==="completed")&&!this.jobs.some(s=>s.status==="completed");this.jobs=t,i&&this.tab==="installed"&&this.loadInstalled(!1)}catch{}}async search(e){if(!this.loading){this.loading=!0,this.error="";try{const t=await u.civitaiSearch({q:this.q||void 0,type:this.type||void 0,category:this.category||void 0,sort:this.sort||void 0,period:this.period||void 0,base:this.base||void 0,creator:this.creator||void 0,nsfw:this.nsfw,cursor:e?void 0:this.cursor||void 0});this.items=e?t.items:[...this.items,...t.items],this.cursor=t.nextCursor??""}catch(t){this.error=t.message}finally{this.loading=!1}}}setAnd(e,t){switch(e){case"type":this.type=t;break;case"sort":this.sort=t;break;case"period":this.period=t;break;case"base":this.base=t;break;case"category":this.category=t;break;case"creator":this.creator=t;break}this.tab="browse",this.search(!0)}async openDetail(e){const t=typeof e=="number"?e:e.id;if(typeof e!="number"){this.detail=e;const i=e.versions[0];this.versionId=(i==null?void 0:i.id)??0,this.shownImage=(i==null?void 0:i.images[0])??""}else this.detail=null;this.galleryOpen=!1,this.gallery=[],this.galleryCursor="",this.detailLoading=!0;try{const i=await u.civitaiModel(t);this.detail=i;const s=i.versions.find(a=>a.id===this.versionId)??i.versions[0];this.versionId=(s==null?void 0:s.id)??0,this.shownImage=(s==null?void 0:s.images[0])??this.shownImage}catch(i){this.error=i.message,this.detail||(this.detail=null)}finally{this.detailLoading=!1}}closeDetail(){this.detail=null,this.galleryOpen=!1,this.picked=null}currentVersion(){var e;return(e=this.detail)==null?void 0:e.versions.find(t=>t.id===this.versionId)}pickVersion(e){this.versionId=e.id,this.shownImage=e.images[0]??"",this.galleryOpen&&(this.gallery=[],this.galleryCursor="",this.loadGallery(!0))}async install(e){if(!(this.installing||!e.downloadUrl||!this.detail)){this.installing=!0,this.error="";try{await u.civitaiInstall(e.downloadUrl,{modelId:this.detail.id,versionId:e.id}),await this.pollJobs()}catch(t){this.error=t.message}finally{this.installing=!1}}}async loadGallery(e,t){if(!this.galleryLoading){this.galleryLoading=!0;try{const i=await u.civitaiImages({versionId:t?void 0:this.versionId||void 0,username:t,sort:this.gallerySort||void 0,nsfw:this.nsfw,cursor:e?void 0:this.galleryCursor||void 0});t?(this.myImages=e?i.items:[...this.myImages,...i.items],this.myImagesCursor=i.nextCursor??""):(this.gallery=e?i.items:[...this.gallery,...i.items],this.galleryCursor=i.nextCursor??"",this.promptsNeedKey=i.items.length>0&&i.withPrompts===0&&!i.keySet)}catch(i){this.error=i.message}finally{this.galleryLoading=!1}}}toggleGallery(){this.galleryOpen=!this.galleryOpen,this.galleryOpen&&this.gallery.length===0&&this.loadGallery(!0)}usePrompt(e){const t=yt(e);t&&(this.dispatchEvent(new CustomEvent("use-prompt",{detail:t,bubbles:!0,composed:!0})),this.picked=null,this.zoomed="")}async copyPrompt(e){try{await navigator.clipboard.writeText(e.prompt??""),this.copied=!0,setTimeout(()=>this.copied=!1,1500)}catch{}}async loadMe(){if(!this.meLoading){if(this.me){this.loadAccountTab(!1);return}this.meLoading=!0,this.meError="";try{this.me=await u.civitaiMe(),this.myImages=[],this.myImagesCursor="",this.loadMyImages(!0).then(()=>this.loadAccountTab(!1))}catch(e){this.meError=e.message}finally{this.meLoading=!1}}}selectAccountTab(e){this.accountTab=e,this.openPost=null,this.openCollection=null,this.loadAccountTab(!1)}loadAccountTab(e){if(!this.me)return Promise.resolve();switch(this.accountTab){case"models":return e||this.myModels.length===0?this.loadMyModels(!e):Promise.resolve();case"posts":return e||this.posts.length===0?this.loadPosts(!e):Promise.resolve();case"images":return e||this.myImages.length===0?this.loadMyImages(!e):Promise.resolve();case"collections":return e||this.collections.length===0?this.loadCollections(!e):Promise.resolve()}}async loadMyImages(e){if(!(!this.me||this.galleryLoading)){this.galleryLoading=!0;try{const t=await u.civitaiImages({username:this.me.username,sort:"newest",nsfw:this.nsfw,cursor:e?void 0:this.myImagesCursor||void 0});this.myImages=e?t.items:[...this.myImages,...t.items],this.myImagesCursor=t.nextCursor??""}catch(t){this.meError=t.message}finally{this.galleryLoading=!1}}}async loadMyModels(e){if(!(!this.me||this.myModelsLoading)){this.myModelsLoading=!0;try{const t=await u.civitaiSearch({creator:this.me.username,sort:"newest",nsfw:this.nsfw,cursor:e?void 0:this.myModelsCursor||void 0});this.myModels=e?t.items:[...this.myModels,...t.items],this.myModelsCursor=t.nextCursor??""}catch(t){this.meError=t.message}finally{this.myModelsLoading=!1}}}async loadPosts(e){if(!(!this.me||this.postsLoading)){this.postsLoading=!0;try{const t=await u.civitaiPosts({username:this.me.username,nsfw:this.nsfw,cursor:e?void 0:this.postsCursor||void 0});this.posts=e?t.items:Xi(this.posts,t.items),this.postsCursor=t.nextCursor??""}catch(t){this.meError=t.message}finally{this.postsLoading=!1}}}async loadCollections(e){if(!this.collectionsLoading){this.collectionsLoading=!0;try{const t=await u.civitaiCollections({q:this.collectionQuery||void 0,sort:this.collectionSort,cursor:e?void 0:this.collectionsCursor||void 0});this.collections=e?t.items:[...this.collections,...t.items],this.collectionsCursor=t.nextCursor??""}catch(t){this.meError=t.message}finally{this.collectionsLoading=!1}}}async openCollectionPictures(e,t){if(!this.galleryLoading){t&&(this.openCollection=e,this.collectionImages=[],this.collectionImagesCursor=""),this.galleryLoading=!0;try{const i=await u.civitaiImages({collectionId:e.id,sort:"newest",nsfw:this.nsfw,cursor:t?void 0:this.collectionImagesCursor||void 0});this.collectionImages=t?i.items:[...this.collectionImages,...i.items],this.collectionImagesCursor=i.nextCursor??""}catch(i){this.meError=i.message}finally{this.galleryLoading=!1}}}async loadInstalled(e){if(!this.installedLoading){this.installedLoading=!0,this.installedError="";try{this.installed=(await u.civitaiInstalled(e)).models}catch(t){this.installedError=t.message}finally{this.installedLoading=!1}}}async sync(e,t){if(!this.syncing){this.syncing=e.key,this.syncNote="";try{const i=await u.civitaiSync(e.key,t),s="modelId"in i&&i.modelId;this.syncNote=s?`${e.name}: cover, description and trigger words set from “${i.modelName}”.`:`${e.name}: Civitai does not know this file. Paste a version id to link it by hand.`,this.pinning="",this.pinVersion="",await this.loadInstalled(!1)}catch(i){this.syncNote=`${e.name}: ${i.message}`}finally{this.syncing=""}}}async manage(e){if(this.manageKey===e.key){this.manageKey="",this.managePage=null;return}const t=e.civitai;if(t){this.manageKey=e.key,this.managePage=null,this.manageVersion=t.versionId;try{const i=await u.civitaiModel(t.modelId);this.manageKey===e.key&&(this.managePage=i)}catch(i){this.syncNote=`${e.name}: ${i.message}`}}}async chooseCover(e,t){if(!this.manageBusy){this.manageBusy=!0;try{await u.civitaiCover(e.key,t),this.syncNote=`${e.name}: cover set.`,await this.loadInstalled(!1)}catch(i){this.syncNote=`${e.name}: ${i.message}`}finally{this.manageBusy=!1}}}async updateModel(e,t){var a;if(this.manageBusy)return;const i=(a=this.managePage)==null?void 0:a.versions.find(o=>{var l;return o.id===(t??((l=e.civitai)==null?void 0:l.latestVersionId))}),s=i?`version ${i.name}`:"the newest version";if(confirm(`Update “${e.name}” to ${s}? It is downloaded into ${this.genName}, then the current file is deleted.`)){this.manageBusy=!0;try{await u.civitaiUpdate(e.key,t),this.syncNote=`${e.name}: downloading ${s}; the current file goes once it is in.`,this.manageKey="",this.managePage=null,await this.pollJobs()}catch(o){this.syncNote=`${e.name}: ${o.message}`}finally{this.manageBusy=!1}}}async deleteInstalled(e){if(!this.manageBusy&&confirm(`Delete “${e.name}” from ${this.genName}? The file goes with it.`)){this.manageBusy=!0;try{await u.deleteModel(e.key),this.syncNote=`${e.name}: deleted.`,this.manageKey===e.key&&(this.manageKey="",this.managePage=null),this.installed=this.installed.filter(t=>t.key!==e.key)}catch(t){this.syncNote=`${e.name}: ${t.message}`}finally{this.manageBusy=!1}}}selectTab(e){this.tab=e,this.closeDetail(),e==="account"&&this.loadMe(),e==="installed"&&this.installed.length===0&&this.loadInstalled(!1)}jobLabel(e){return e.status==="downloading"&&e.totalBytes?`downloading ${Math.round((e.bytes??0)/e.totalBytes*100)}%`:e.status}render(){return r`
      <div class="wrap">
        <div class="topbar">
          <h2><span class="material-symbols-rounded">travel_explore</span> Civitai</h2>
          <div class="tabs" role="tablist">
            ${["browse","account","installed"].map(e=>r`<button role="tab" aria-selected=${this.tab===e?"true":"false"}
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
        ${this.jobs.length&&this.jobsOpen?r`<div class="jobs">
              ${this.jobs.map(e=>r`<div class="job">
                  <span class="material-symbols-rounded" style="font-size:15px;">download</span>
                  <span class="st ${e.status}">${this.jobLabel(e)}</span>
                  <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${e.error||e.source}</span>
                </div>`)}
            </div>`:c}
        ${this.tab==="browse"?this.renderBrowse():this.tab==="account"?this.renderAccount():this.renderInstalled()}
      </div>
      ${this.detail?this.renderDetail(this.detail):c}
      ${this.picked?this.renderPicked(this.picked):this.zoomed?r`<div class="zoom plain" @click=${()=>this.zoomed=""}>
            <img src=${u.civitaiImageURL(this.zoomed)} alt="Preview" />
          </div>`:c}
    `}renderJobsChip(){const e=this.jobs.filter(s=>s.status==="downloading"||s.status==="running"||s.status==="waiting"),t=this.jobs.some(s=>s.status==="error"),i=e.length?e.length===1?this.jobLabel(e[0]):`${e.length} downloading`:`${this.jobs.length} download${this.jobs.length===1?"":"s"}`;return r`<button class="chip small jobs-chip ${this.jobsOpen?"on":""}"
      title=${this.jobsOpen?"Hide the install log":"Show the install log"} aria-expanded=${this.jobsOpen?"true":"false"}
      @click=${()=>this.jobsOpen=!this.jobsOpen}>
      <span class="material-symbols-rounded" style="font-size:15px;">${t?"error":"download"}</span> ${i}
      ${e.length?r`<span class="dot"></span>`:c}
    </button>`}renderBrowse(){return r`
      <div class="controls">
        <input
          type="search"
          placeholder="Search models…"
          .value=${this.q}
          @input=${e=>this.q=e.target.value}
          @keydown=${e=>{e.key==="Enter"&&this.search(!0)}}
        />
        <select aria-label="Sort" .value=${this.sort} @change=${e=>this.setAnd("sort",e.target.value)}>
          ${ts.map(e=>r`<option value=${e.id} ?selected=${e.id===this.sort}>${e.label}</option>`)}
        </select>
        <select aria-label="Period" .value=${this.period} @change=${e=>this.setAnd("period",e.target.value)}>
          ${is.map(e=>r`<option value=${e.id} ?selected=${e.id===this.period}>${e.label}</option>`)}
        </select>
        <select aria-label="Base model" .value=${this.base} @change=${e=>this.setAnd("base",e.target.value)}>
          <option value="">Any base model</option>
          ${ss.map(e=>r`<option value=${e} ?selected=${e===this.base}>${e}</option>`)}
        </select>
        <select aria-label="Category" .value=${this.category} @change=${e=>this.setAnd("category",e.target.value)}>
          <option value="">All categories</option>
          ${this.categories.map(e=>r`<option value=${e.name} ?selected=${e.name===this.category}>${e.name} (${Se(e.count)})</option>`)}
        </select>
        <button class="chip ${this.nsfw?"on":""}" title="Show adult models" aria-pressed=${this.nsfw?"true":"false"}
          @click=${()=>{this.nsfw=!this.nsfw,this.search(!0)}}>
          <span class="material-symbols-rounded" style="font-size:15px;">explicit</span> NSFW
        </button>
      </div>
      <div class="controls">
        ${es.map(e=>r`<button class="chip ${this.type===e.id?"on":""}" @click=${()=>this.setAnd("type",e.id)}>${e.label}</button>`)}
        ${this.creator?r`<button class="chip on" title="Showing one creator's models" @click=${()=>this.setAnd("creator","")}>
              <span class="material-symbols-rounded" style="font-size:15px;">person</span> ${this.creator}
              <span class="material-symbols-rounded" style="font-size:15px;">close</span>
            </button>`:c}
      </div>
      ${this.error?r`<div class="err">${this.error}</div>`:c}
      <div class="grid">${this.items.map(e=>this.renderCard(e))}</div>
      ${this.loading?r`<div class="note">Searching Civitai…</div>`:this.items.length?this.cursor?r`<button class="more" @click=${()=>this.search(!1)}>Load more</button>`:c:r`<div class="note">No models matched. Try another search.</div>`}
    `}renderCard(e){var i,s;const t=(i=e.versions[0])==null?void 0:i.images[0];return r`
      <button class="card" @click=${()=>this.openDetail(e)}>
        ${t?r`<img src=${u.civitaiImageURL(t)} alt=${e.name} loading="lazy" />`:r`<div class="noimg"><span class="material-symbols-rounded" style="font-size:34px;">image</span></div>`}
        ${e.installed?r`<span class="badge ok"><span class="material-symbols-rounded" style="font-size:13px;">check</span> Installed</span>`:c}
        ${e.nsfw?r`<span class="badge right">18+</span>`:c}
        <div class="meta">
          <div class="name">${e.name}</div>
          <div class="sub">
            <span>${wt(e.type)}</span>
            ${(s=e.versions[0])!=null&&s.base?r`<span>${e.versions[0].base}</span>`:c}
            <span>⤓ ${Se(e.downloads)}</span>
          </div>
        </div>
      </button>
    `}renderDetail(e){var i;const t=this.currentVersion();return r`
      <div class="overlay" @click=${s=>{s.target===s.currentTarget&&this.closeDetail()}}>
        <div class="detail" role="dialog" aria-label=${e.name}>
          <div>
            ${this.shownImage?r`<img class="big" src=${u.civitaiImageURL(this.shownImage)} alt=${e.name}
                  @click=${()=>this.zoomed=this.shownImage} />`:r`<div class="big" style="display:grid; place-items:center;">
                  <span class="material-symbols-rounded" style="font-size:40px; color:var(--oppai-text-muted);">image</span>
                </div>`}
            ${t&&t.images.length>1?r`<div class="thumbs">
                  ${t.images.map(s=>r`<img src=${u.civitaiImageURL(s)} class=${s===this.shownImage?"on":""}
                      alt="Preview" loading="lazy" @click=${()=>this.shownImage=s} />`)}
                </div>`:c}
            ${(i=t==null?void 0:t.files)!=null&&i.length?r`<div class="vlabel">Files</div>
                  <div class="files">
                    ${t.files.map(s=>r`<div class="f">
                        <span>${s.name}</span>
                        <span>${$t(s.sizeMB)}</span>
                        ${s.format?r`<span>${s.format}</span>`:c}
                        ${s.precision?r`<span>${s.precision}</span>`:c}
                        ${s.primary?r`<span class="material-symbols-rounded" title="Primary file" style="font-size:14px;">star</span>`:c}
                      </div>`)}
                  </div>`:c}
          </div>
          <div>
            <h3>${e.name}</h3>
            <div class="sub">
              <span>${wt(e.type)}</span>
              ${e.creator?r`<button class="creator" title="Show this creator's models" @click=${()=>{this.closeDetail(),this.setAnd("creator",e.creator??"")}}>
                    ${e.creatorImage?r`<img src=${u.civitaiImageURL(e.creatorImage)} alt="" />`:r`<span class="material-symbols-rounded" style="font-size:16px;">person</span>`}
                    ${e.creator}
                  </button>`:c}
              <span>⤓ ${Se(e.downloads)}</span>
              <span>♥ ${Se(e.likes)}</span>
              ${e.nsfw?r`<span>18+</span>`:c}
              <a class="ghost" style="padding:3px 8px; font-size:12px; text-decoration:none;" target="_blank" rel="noopener noreferrer"
                href=${`https://civitai.com/models/${e.id}${t?`?modelVersionId=${t.id}`:""}`}>
                <span class="material-symbols-rounded" style="font-size:14px;">open_in_new</span> civitai.com
              </a>
            </div>
            ${e.versions.length>1?r`<div class="vlabel">Version</div>
                  <div class="versions">
                    ${e.versions.map(s=>r`<button class="chip small ${s.id===this.versionId?"on":""}" @click=${()=>this.pickVersion(s)}>
                        ${s.installed?r`<span class="material-symbols-rounded" style="font-size:14px;">check</span>`:c}
                        ${s.name}<span style="opacity:.7;"> · ${s.base}</span>
                      </button>`)}
                  </div>`:t?r`<div class="vlabel">Version ${t.name} · ${t.base}${t.publishedAt?` · ${as(t.publishedAt)}`:""}</div>`:c}
            ${t!=null&&t.trainedWords.length?r`<div class="vlabel">Trigger words</div>
                  <div class="words">
                    <span>${t.trainedWords.join(", ")}</span>
                    <button class="ghost" style="padding:3px 8px; font-size:12px; flex-shrink:0;" title="Copy the trigger words"
                      @click=${()=>{var s;return void((s=navigator.clipboard)==null?void 0:s.writeText(t.trainedWords.join(", ")))}}>
                      <span class="material-symbols-rounded" style="font-size:14px;">content_copy</span>
                    </button>
                  </div>`:c}
            ${e.tags.length?r`<div class="vlabel">Tags</div>
                  <div class="tags">
                    ${e.tags.slice(0,14).map(s=>r`<button class="chip small" @click=${()=>{this.closeDetail(),this.setAnd("category",s)}}>${s}</button>`)}
                  </div>`:c}
            ${this.detailLoading&&!e.description?r`<div class="note" style="padding:14px 0;">Loading the model page…</div>`:c}
            ${e.description?r`<div class="vlabel">About</div>
                  <div class="desc">${xt(e.description)}</div>`:c}
            ${t!=null&&t.description&&t.description!==e.description?r`<div class="vlabel">About this version</div>
                  <div class="desc">${xt(t.description)}</div>`:c}
            <div class="actions">
              ${t?t.installed?r`<button class="primary" disabled>
                      <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span> Installed in ${this.genName}
                    </button>`:this.canManage?r`<button class="primary" ?disabled=${this.installing||!t.downloadUrl} @click=${()=>this.install(t)}>
                        <span class="material-symbols-rounded" style="font-size:18px;">download</span>
                        Install to ${this.genName}${t.sizeMB?` (${$t(t.sizeMB)})`:""}
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
    `}renderGallery(){return r`
      <div class="controls" style="margin-top:10px;">
        ${[["","Most reactions"],["newest","Newest"],["comments","Most comments"]].map(([e,t])=>r`<button class="chip small ${this.gallerySort===e?"on":""}"
            @click=${()=>{this.gallerySort=e,this.gallery=[],this.galleryCursor="",this.loadGallery(!0)}}>${t}</button>`)}
      </div>
      ${this.promptsNeedKey?r`<div class="sub" style="margin-top:8px;">
            Civitai only shares the prompts behind pictures with an API key — add yours under Settings → Image generation to see them here.
          </div>`:c}
      ${this.gallery.length?r`<div class="gal-grid">
            ${this.gallery.map(e=>r`<button title=${e.prompt?"Has a prompt":"No prompt kept"} @click=${()=>this.picked=e}>
                <img src=${u.civitaiImageURL(e.url)} alt="" loading="lazy" />
                ${e.prompt?r`<span class="has">prompt</span>`:c}
              </button>`)}
          </div>`:c}
      ${this.galleryLoading?r`<div class="note" style="padding:12px 0;">Loading pictures…</div>`:this.gallery.length?this.galleryCursor?r`<button class="more" style="margin-top:8px;" @click=${()=>this.loadGallery(!1)}>More pictures</button>`:c:r`<div class="note" style="padding:12px 0;">Nobody has posted a picture with this version.</div>`}
    `}renderPicked(e){const t=yt(e);return r`
      <div class="zoom ${t?"":"plain"}" @click=${i=>{i.target===i.currentTarget&&(this.picked=null)}}>
        <img src=${u.civitaiImageURL(e.url)} alt="" @click=${()=>this.picked=null} />
        ${t?r`<div class="pane">
              <div style="display:flex; align-items:center; gap:8px; justify-content:space-between;">
                <h4>Prompt${e.username?` · by ${e.username}`:""}</h4>
                <button class="ghost" style="padding:4px 8px;" @click=${()=>this.picked=null}>
                  <span class="material-symbols-rounded" style="font-size:16px;">close</span>
                </button>
              </div>
              <div class="p">${t.prompt}</div>
              ${t.negativePrompt?r`<h4>Negative</h4><div class="p">${t.negativePrompt}</div>`:c}
              <div class="kv">
                ${e.model?r`<span>Model</span><span>${e.model}</span>`:c}
                ${e.sampler?r`<span>Sampler</span><span>${e.sampler}${t.sampler?"":" (not in the studio's list)"}</span>`:c}
                ${t.steps?r`<span>Steps</span><span>${t.steps}</span>`:c}
                ${t.cfgScale?r`<span>CFG</span><span>${t.cfgScale}</span>`:c}
                ${t.seed?r`<span>Seed</span><span>${t.seed}</span>`:c}
                ${t.width?r`<span>Size</span><span>${t.width}×${t.height}</span>`:c}
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
    `}renderAccount(){var i;if(this.meLoading)return r`<div class="note">Asking Civitai whose key this is…</div>`;if(!this.me)return r`<div class="note">
        ${this.meError||"No account to show."}
        <div style="margin-top:8px; font-size:12px;">
          Add your Civitai API key under Settings → Image generation and this page shows your models, posts, pictures and collections.
        </div>
      </div>`;const e=this.me,t=e.cover||((i=this.myImages[0])==null?void 0:i.url)||"";return r`
      <div class="banner">
        <div class="art">
          ${t?r`<img class="cover" src=${u.civitaiImageURL(t)} alt="" />`:c}
          <div class="fade"></div>
          <a class="ghost profile-link" style="text-decoration:none; background:rgba(0,0,0,.4);" target="_blank" rel="noopener noreferrer"
            href=${`https://civitai.com/user/${encodeURIComponent(e.username)}`}>
            <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span> Profile on civitai.com
          </a>
        </div>
        <div class="who">
          ${e.image?r`<img src=${u.civitaiImageURL(e.image)} alt="" />`:r`<div class="noface"><span class="material-symbols-rounded" style="font-size:44px;">account_circle</span></div>`}
          <div class="n">${e.username}</div>
        </div>
      </div>
      <div class="subtabs" role="tablist">
        ${[["models","Models"],["posts","Posts"],["images","Images"],["collections","Collections"]].map(([s,a])=>r`<button role="tab" aria-selected=${this.accountTab===s?"true":"false"}
            class=${this.accountTab===s?"on":""} @click=${()=>this.selectAccountTab(s)}>${a}</button>`)}
      </div>
      ${this.meError?r`<div class="err">${this.meError}</div>`:c}
      ${this.accountTab==="models"?this.renderMyModels():this.accountTab==="posts"?this.renderPosts():this.accountTab==="images"?this.renderMyImages():this.renderCollections()}
    `}renderMyModels(){return r`
      <div class="grid">${this.myModels.map(e=>this.renderCard(e))}</div>
      ${this.myModelsLoading?r`<div class="note">Loading models…</div>`:this.myModels.length?this.myModelsCursor?r`<button class="more" @click=${()=>this.loadMyModels(!1)}>More models</button>`:c:r`<div class="note">No models published.
              <div style="margin-top:6px; font-size:12px;">Uploading goes through civitai.com itself — the site has no public API for it.</div>
            </div>`}
    `}renderPosts(){if(this.openPost){const e=this.openPost;return r`
        <div class="controls">
          <button class="ghost" @click=${()=>this.openPost=null}>
            <span class="material-symbols-rounded" style="font-size:16px;">arrow_back</span> All posts
          </button>
          <span style="font-size:12px; color:var(--oppai-text-muted);">
            ${e.images.length} picture${e.images.length===1?"":"s"}${Ne(e)?` · ${Ne(e)}`:""}
          </span>
          ${e.id>0?r`<a class="ghost" style="margin-left:auto; text-decoration:none;" target="_blank" rel="noopener noreferrer" href=${`https://civitai.com/posts/${e.id}`}>
                <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span> civitai.com
              </a>`:c}
        </div>
        ${this.renderImageGrid(e.images)}
      `}return r`
      <div class="post-grid">
        ${this.posts.map(e=>r`<button class="post" @click=${()=>this.openPost=e}>
            ${e.images[0]?r`<img src=${u.civitaiImageURL(e.images[0].url)} alt="" loading="lazy" />`:c}
            ${e.images.length>1?r`<span class="badge right"><span class="material-symbols-rounded" style="font-size:13px;">photo_library</span> ${e.images.length}</span>`:c}
            <div class="pm"><span>${Ne(e)}</span>${e.images.some(t=>t.prompt)?r`<span>prompt</span>`:c}</div>
          </button>`)}
      </div>
      ${this.postsLoading?r`<div class="note">Loading posts…</div>`:this.posts.length?this.postsCursor?r`<button class="more" @click=${()=>this.loadPosts(!1)}>More posts</button>`:c:r`<div class="note">No posts.</div>`}
    `}renderMyImages(){return r`
      ${this.renderImageGrid(this.myImages)}
      ${this.galleryLoading?r`<div class="note" style="padding:12px 0;">Loading pictures…</div>`:this.myImages.length?this.myImagesCursor?r`<button class="more" @click=${()=>this.loadMyImages(!1)}>More pictures</button>`:c:r`<div class="note" style="padding:12px 0;">No posted pictures.</div>`}
    `}renderImageGrid(e){return e.length?r`<div class="gal-grid">
      ${e.map(t=>r`<button title=${t.prompt?"Has a prompt":"No prompt kept"} @click=${()=>this.picked=t}>
          <img src=${u.civitaiImageURL(t.url)} alt="" loading="lazy" />
          ${t.prompt?r`<span class="has">prompt</span>`:c}
        </button>`)}
    </div>`:c}renderCollections(){var e;if(this.openCollection){const t=this.openCollection;return r`
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
        ${t.description?r`<div class="sub" style="margin-bottom:8px;">${t.description}</div>`:c}
        ${this.renderImageGrid(this.collectionImages)}
        ${this.galleryLoading?r`<div class="note" style="padding:12px 0;">Loading pictures…</div>`:this.collectionImages.length?this.collectionImagesCursor?r`<button class="more" @click=${()=>this.openCollectionPictures(t,!1)}>More pictures</button>`:c:r`<div class="note" style="padding:12px 0;">Nothing the feed will show for this collection.</div>`}
      `}return r`
      <div class="controls">
        <input type="search" placeholder="Search public collections…" .value=${this.collectionQuery}
          @input=${t=>this.collectionQuery=t.target.value}
          @keydown=${t=>{t.key==="Enter"&&this.loadCollections(!0)}} />
        ${[["newest","Newest"],["followers","Most followed"]].map(([t,i])=>r`<button class="chip ${this.collectionSort===t?"on":""}"
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
        ${this.collections.map(t=>r`<button class="coll" ?disabled=${t.type!=="Image"&&t.type!=="Post"} @click=${()=>this.openCollectionPictures(t,!0)}>
            ${t.cover?r`<img src=${u.civitaiImageURL(t.cover)} alt="" loading="lazy" />`:r`<div class="noimg"><span class="material-symbols-rounded" style="font-size:26px;">collections_bookmark</span></div>`}
            <div style="min-width:0;">
              <div class="t">${t.name}${t.nsfw?r` <span style="font-weight:400; color:var(--oppai-text-muted);">18+</span>`:c}</div>
              <div class="d">${t.type} · ${t.count} item${t.count===1?"":"s"}${t.username?` · by ${t.username}`:""}</div>
            </div>
            <span class="material-symbols-rounded" style="font-size:18px; color:var(--oppai-text-muted);">${t.type==="Image"||t.type==="Post"?"chevron_right":"block"}</span>
          </button>`)}
      </div>
      ${this.collectionsLoading?r`<div class="note">Loading collections…</div>`:this.collections.length?this.collectionsCursor?r`<button class="more" @click=${()=>this.loadCollections(!1)}>More collections</button>`:c:r`<div class="note">No collections matched.</div>`}
    `}renderInstalled(){const e=this.installed.filter(i=>{var s;switch(this.installedFilter){case"linked":return!!i.civitai;case"unlinked":return!i.civitai;case"updates":return!!((s=i.civitai)!=null&&s.updateAvailable);default:return!0}}),t=this.installed.filter(i=>{var s;return(s=i.civitai)==null?void 0:s.updateAvailable}).length;return r`
      <div class="controls">
        ${[["all","All"],["linked","On Civitai"],["unlinked","Not matched"],["updates",`Updates${t?` (${t})`:""}`]].map(([i,s])=>r`<button class="chip ${this.installedFilter===i?"on":""}" @click=${()=>this.installedFilter=i}>${s}</button>`)}
        <button class="ghost" style="margin-left:auto;" ?disabled=${this.installedLoading} @click=${()=>this.loadInstalled(!0)}>
          <span class="material-symbols-rounded" style="font-size:16px;">refresh</span> Check Civitai again
        </button>
      </div>
      <p class="sync-note">
        ${this.genName}'s models matched to Civitai by file hash. “Fetch from Civitai” writes the catalogue's cover,
        description and trigger words onto the model — the same dressing an install from here gets${this.canManage?"":". Until OppaiLib can write into A1111's models folder they are only linked: the picker shows Civitai's cover, but nothing is written to A1111"}.
        ${this.backend==="invokeai"?c:r`A1111 knows a file by a short hash until it has been read once, so a model may take a minute to match after it first appears.`}
      </p>
      ${this.syncNote?r`<div class="sync-note" style="color:var(--oppai-text);">${this.syncNote}</div>`:c}
      ${this.installedError?r`<div class="err">${this.installedError}</div>`:c}
      ${this.installedLoading&&!this.installed.length?r`<div class="note">Reading the studio's models and asking Civitai about the new ones…</div>`:c}
      <div class="rows">
        ${e.map(i=>this.renderInstalledRow(i))}
      </div>
      ${!this.installedLoading&&this.installed.length&&!e.length?r`<div class="note">Nothing here.</div>`:c}
    `}renderInstalledRow(e){const t=e.civitai,i=e.hasCover?e.type==="lora"?u.loraThumbURL(e.name):u.modelThumbURL(e.key):"",s=this.manageKey===e.key;return r`
      <div class="row">
        ${i?r`<img src=${i} alt="" loading="lazy" />`:r`<div class="noimg"><span class="material-symbols-rounded" style="font-size:26px;">deployed_code</span></div>`}
        <div style="min-width:0;">
          <div class="t">${e.name}</div>
          <div class="d">
            <span>${e.type}</span>
            ${e.base?r`<span>${e.base}</span>`:c}
            ${t?r`<span>· ${t.modelName}${t.versionName?` (${t.versionName})`:""}${t.creator?` by ${t.creator}`:""}</span>
                  ${t.updateAvailable?r`<span class="upd"><span class="material-symbols-rounded" style="font-size:14px;">new_releases</span> newer version</span>`:c}`:r`<span>· not found on Civitai by hash</span>`}
          </div>
          ${t!=null&&t.previews.length&&!s?r`<div class="previews">
                ${t.previews.slice(0,6).map(a=>r`<img src=${u.civitaiImageURL(a)} alt="" loading="lazy" @click=${()=>this.zoomed=a} />`)}
              </div>`:c}
          ${this.pinning===e.key?r`<div class="pin">
                <input type="text" placeholder="Civitai version id" .value=${this.pinVersion}
                  @input=${a=>this.pinVersion=a.target.value} />
                <button class="ghost" ?disabled=${!/^\d+$/.test(this.pinVersion.trim())} @click=${()=>this.sync(e,Number(this.pinVersion.trim()))}>Link</button>
                <button class="ghost" @click=${()=>this.pinning=""}>Cancel</button>
              </div>`:c}
        </div>
        <div class="rb">
          ${t?r`<button class="ghost" title="Open the model page" @click=${()=>this.openDetail(t.modelId)}>
                <span class="material-symbols-rounded" style="font-size:16px;">travel_explore</span> Page
              </button>`:c}
          ${t!=null&&t.updateAvailable&&this.canManage?r`<button class="ghost" title="Download the newest version and delete this one once it is in"
                ?disabled=${this.manageBusy} @click=${()=>this.updateModel(e)}>
                <span class="material-symbols-rounded" style="font-size:16px;">published_with_changes</span> Update
              </button>`:c}
          <button class="ghost" ?disabled=${this.syncing===e.key} title="Write the cover, description and trigger words from Civitai onto this model"
            @click=${()=>this.sync(e)}>
            <span class="material-symbols-rounded" style="font-size:16px;">${this.syncing===e.key?"downloading":"sync"}</span>
            ${t?"Fetch again":"Fetch from Civitai"}
          </button>
          ${t?r`<button class="ghost ${s?"on":""}" title="Choose the version and the cover picture" aria-expanded=${s?"true":"false"}
                @click=${()=>this.manage(e)}>
                <span class="material-symbols-rounded" style="font-size:16px;">tune</span> ${s?"Close":"Version & cover"}
              </button>`:r`<button class="ghost" title="Link by a version id from the site" @click=${()=>{this.pinning=e.key,this.pinVersion=""}}>
                <span class="material-symbols-rounded" style="font-size:16px;">link</span>
              </button>`}
          ${this.canManage?r`<button class="ghost danger" title=${`Delete from ${this.genName}, file included`} ?disabled=${this.manageBusy} @click=${()=>this.deleteInstalled(e)}>
            <span class="material-symbols-rounded" style="font-size:16px;">delete</span>
          </button>`:c}
        </div>
        ${s&&t?this.renderManage(e):c}
      </div>
    `}renderManage(e){const t=e.civitai,i=this.managePage;if(!i)return r`<div class="manage"><div class="note" style="padding:8px 0;">Loading the model page…</div></div>`;const s=i.versions.find(l=>l.id===this.manageVersion)??i.versions[0],a=(s==null?void 0:s.id)===t.versionId,o=t.coverUrl||t.previews[0]||"";return r`
      <div class="manage">
        <div class="vlabel" style="margin-top:0;">Version</div>
        <div class="versions">
          ${i.versions.map(l=>r`<button class="chip small ${l.id===(s==null?void 0:s.id)?"on":""}" @click=${()=>this.manageVersion=l.id}>
              ${l.id===t.versionId?r`<span class="material-symbols-rounded" style="font-size:14px;">check</span>`:c}
              ${l.name}<span style="opacity:.7;"> · ${l.base}</span>
            </button>`)}
        </div>
        ${s&&!a?r`<div class="actions" style="margin-top:8px;">
              ${this.canManage?r`<button class="ghost" ?disabled=${this.manageBusy} title="Download this version and delete the current file once it is in"
                @click=${()=>this.updateModel(e,s.id)}>
                <span class="material-symbols-rounded" style="font-size:16px;">published_with_changes</span> Install ${s.name}, replacing the current file
              </button>`:c}
              <button class="ghost" ?disabled=${this.syncing===e.key} title="Keep the current file, but take this version's description, trigger words and pictures"
                @click=${()=>this.sync(e,s.id)}>
                <span class="material-symbols-rounded" style="font-size:16px;">link</span> Link to ${s.name} without downloading
              </button>
            </div>`:c}
        ${s!=null&&s.images.length?r`<div class="vlabel">Cover${a?"":` (from ${s.name})`}</div>
              <div class="covers">
                ${s.images.map(l=>r`<button class=${l===o?"on":""} title="Use as the cover" ?disabled=${this.manageBusy} @click=${()=>this.chooseCover(e,l)}>
                    <img src=${u.civitaiImageURL(l)} alt="" loading="lazy" />
                    ${l===o?r`<span class="tick"><span class="material-symbols-rounded" style="font-size:13px;">check</span></span>`:c}
                  </button>`)}
              </div>`:r`<div class="sub" style="margin-top:8px;">This version has no showcase pictures.</div>`}
      </div>
    `}};v.styles=[re,Ie,ie`
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
    `];x([E()],v.prototype,"backend",2);x([E({type:Boolean})],v.prototype,"canManage",2);x([E()],v.prototype,"manageNote",2);x([d()],v.prototype,"tab",2);x([d()],v.prototype,"q",2);x([d()],v.prototype,"type",2);x([d()],v.prototype,"sort",2);x([d()],v.prototype,"period",2);x([d()],v.prototype,"base",2);x([d()],v.prototype,"category",2);x([d()],v.prototype,"creator",2);x([d()],v.prototype,"nsfw",2);x([d()],v.prototype,"categories",2);x([d()],v.prototype,"items",2);x([d()],v.prototype,"cursor",2);x([d()],v.prototype,"loading",2);x([d()],v.prototype,"error",2);x([d()],v.prototype,"detail",2);x([d()],v.prototype,"detailLoading",2);x([d()],v.prototype,"versionId",2);x([d()],v.prototype,"shownImage",2);x([d()],v.prototype,"zoomed",2);x([d()],v.prototype,"galleryOpen",2);x([d()],v.prototype,"gallery",2);x([d()],v.prototype,"galleryCursor",2);x([d()],v.prototype,"galleryLoading",2);x([d()],v.prototype,"gallerySort",2);x([d()],v.prototype,"picked",2);x([d()],v.prototype,"copied",2);x([d()],v.prototype,"promptsNeedKey",2);x([d()],v.prototype,"jobs",2);x([d()],v.prototype,"installing",2);x([d()],v.prototype,"jobsOpen",2);x([d()],v.prototype,"me",2);x([d()],v.prototype,"meError",2);x([d()],v.prototype,"meLoading",2);x([d()],v.prototype,"accountTab",2);x([d()],v.prototype,"myImages",2);x([d()],v.prototype,"myImagesCursor",2);x([d()],v.prototype,"myModels",2);x([d()],v.prototype,"myModelsCursor",2);x([d()],v.prototype,"myModelsLoading",2);x([d()],v.prototype,"posts",2);x([d()],v.prototype,"postsCursor",2);x([d()],v.prototype,"postsLoading",2);x([d()],v.prototype,"openPost",2);x([d()],v.prototype,"collections",2);x([d()],v.prototype,"collectionsCursor",2);x([d()],v.prototype,"collectionsLoading",2);x([d()],v.prototype,"collectionQuery",2);x([d()],v.prototype,"collectionSort",2);x([d()],v.prototype,"openCollection",2);x([d()],v.prototype,"collectionImages",2);x([d()],v.prototype,"collectionImagesCursor",2);x([d()],v.prototype,"installed",2);x([d()],v.prototype,"installedLoading",2);x([d()],v.prototype,"installedError",2);x([d()],v.prototype,"installedFilter",2);x([d()],v.prototype,"syncing",2);x([d()],v.prototype,"syncNote",2);x([d()],v.prototype,"pinning",2);x([d()],v.prototype,"pinVersion",2);x([d()],v.prototype,"manageKey",2);x([d()],v.prototype,"managePage",2);x([d()],v.prototype,"manageVersion",2);x([d()],v.prototype,"manageBusy",2);v=x([le("oppai-civitai")],v);function wt(e){switch(e){case"Checkpoint":return"Checkpoint";case"LORA":return"LoRA";case"LoCon":return"LoCon";case"DoRA":return"DoRA";case"TextualInversion":return"Embedding";case"Controlnet":return"ControlNet";default:return e}}function Se(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}k`:String(e)}function $t(e){return e>=1024?`${(e/1024).toFixed(1)} GB`:`${e} MB`}function as(e){const t=new Date(e);return Number.isNaN(t.getTime())?"":t.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}const os={waiting:"Waiting for the GPU",receiving:"Receiving the pictures",loading:"Loading the checkpoint",caching:"Preparing the pictures",training:"Training",sampling:"Rendering a sample",saving:"Saving",done:"Finished — installing next",error:"Stopping",cancelled:"Stopping"},rs={preparing:"Sending the pictures",queued:"Waiting for the GPU",training:"Training",installing:"Installing into the generator",done:"Ready to use",failed:"Failed",cancelled:"Cancelled"};function Fe(e){return e.status==="preparing"||e.status==="queued"||e.status==="training"||e.status==="installing"}function ns(e){return e.status==="done"||e.status==="installing"?1:!e.total||e.total<=0||e.step===void 0?null:Math.max(0,Math.min(1,e.step/e.total))}function ls(e){if(e.status==="failed")return e.error?`Failed: ${e.error}`:"Failed";if(e.status!=="training")return rs[e.status]??e.status;const t=os[e.phase??""]??"Training";if(e.phase!=="training"||!e.total)return t;const i=[`Step ${e.step??0} of ${e.total}`];return e.epoch&&e.epochs&&i.push(`epoch ${e.epoch}/${e.epochs}`),e.eta&&e.eta!=="?"&&e.eta!=="00:00"&&i.push(`${e.eta} left`),e.loss&&i.push(`loss ${e.loss.toFixed(3)}`),i.join(" · ")}function ds(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"")}function ps(e,t){const i=t.trim().toLowerCase();return e.some(s=>s.trim().toLowerCase()===i)?e.filter(s=>s.trim().toLowerCase()!==i):[...e,t.trim()]}const me={captions:"tags",epochs:10,repeats:0,rank:0,alpha:0,resolution:0,learningRate:1e-4,textEncoderLr:0,optimizer:"AdamW8bit",noiseOffset:0,flip:!1},cs=/\b(hair|bangs|ahoge|sidelocks|ponytail|twintails|braids?|bun|eyes|pupils|heterochromia|eyebrows|eyelashes|skin|skinned|freckles|mole|scar|breasts|ears|tail|horns|wings|halo|fangs?|lips|muscular|tan|tanlines|body)\b/i,hs=/\b(style|medium|traditional|digital|painting|watercolor|watercolour|oil|acrylic|sketch|lineart|line art|ink|inking|monochrome|greyscale|grayscale|sepia|realistic|photorealistic|3d|cel|shading|flat color|flat colour|pixel art|retro|oekaki|pastel|limited palette|halftone|screentone|chibi|anime coloring|painterly|impasto|chromatic aberration|film grain|bokeh)\b/i,us=/\b(dress|shirt|blouse|skirt|shorts|pants|jeans|jacket|coat|hoodie|sweater|cardigan|vest|uniform|suit|armor|armour|kimono|yukata|apron|cape|cloak|robe|bodysuit|leotard|swimsuit|bikini|lingerie|bra|panties|thighhighs|pantyhose|stockings|socks|boots|shoes|heels|sandals|gloves|sleeves|collar|choker|necklace|earrings|ribbon|bow|hat|cap|helmet|headband|hairband|hair ornament|belt|tie|necktie|scarf|frills|lace|buttons|zipper|hood|mask|glasses|eyewear|bag|weapon|sword|staff)\b/i,Me=[{id:"character",icon:"face",title:"A character or person",blurb:"One face and body, in whatever outfit or pose the prompt asks for.",examples:"Your OC, a game character, yourself",pictures:{min:8,ideal:[15,40]},tips:["Vary everything except who it is: outfits, poses, backgrounds, lighting.","Mix close-ups of the face with half- and full-body pictures.","Leave out pictures with other people in them, or crop them away first."],captionsWhy:"Each picture is captioned with its tags, minus her hair, eyes and build — so those go into the trigger word, and her clothes and pose stay up to the prompt.",settings:{...me,textEncoderLr:5e-5},absorb:cs},{id:"style",icon:"palette",title:"An art style",blurb:"A way of drawing or rendering, applied to anything you prompt.",examples:"An artist's look, a medium, a game's art",pictures:{min:20,ideal:[30,100]},tips:["Many different subjects drawn the same way — the style is what they share.","Avoid one character dominating the set, or the style comes with her face.","Skip pictures with text, watermarks or signatures where you can."],captionsWhy:"Each picture is captioned with what is in it, minus the tags about how it is drawn — so the subject stays promptable and the look goes into the trigger word.",settings:{...me,epochs:12,flip:!0,noiseOffset:.05,textEncoderLr:5e-5},absorb:hs},{id:"concept",icon:"directions_walk",title:"A pose or concept",blurb:"An action, a composition, an effect — on anyone.",examples:"A pose, a camera angle, a lighting effect",pictures:{min:10,ideal:[20,60]},tips:["The concept is the only thing every picture should have in common.","Use different characters, outfits and places so none of them sticks."],captionsWhy:"Each picture is captioned with its tags. Strike out the ones that describe the concept itself, so the trigger word comes to mean it.",settings:{...me,flip:!0}},{id:"outfit",icon:"checkroom",title:"An outfit or object",blurb:"A piece of clothing or a thing, worn or held by anyone.",examples:"A uniform, a dress, a weapon, a prop",pictures:{min:10,ideal:[15,50]},tips:["Show it from several angles, on different people if you can.","Leave mirroring off if it has text, a logo or a one-sided detail."],captionsWhy:"Each picture is captioned with its tags, minus the parts of the outfit every picture shares — those go into the trigger word, everything else stays promptable.",settings:{...me,flip:!0},absorb:us},{id:"custom",icon:"tune",title:"Something else",blurb:"The trainer's defaults, with every setting yours to change.",examples:"For when you know what you want",pictures:{min:5,ideal:[15,60]},tips:["Pictures that share what you want learnt, and differ in everything else."],captionsWhy:"Each picture is captioned with its tags. Strike out what the trigger word should stand for.",settings:{...me}}];function Z(e){return Me.find(t=>t.id===e)??Me[Me.length-1]}const et=[{id:"quick",title:"Quick test",blurb:"About half as long — to see whether the set works",scale:.5},{id:"balanced",title:"Balanced",blurb:"The preset's own length",scale:1},{id:"thorough",title:"Thorough",blurb:"Half as long again, for a large or subtle set",scale:1.5}];function kt(e,t){var s;const i=((s=et.find(a=>a.id===t))==null?void 0:s.scale)??1;return Math.max(2,Math.round(e.settings.epochs*i))}function gs(e){return e<=0?10:Math.max(1,Math.min(Math.floor((200+Math.floor(e/2))/e),40))}function ms(e,t,i=0){return e<=0?0:e*(i>0?i:gs(e))*Math.max(1,t)}function fs(e,t,i){if(!e.absorb||i<=0)return[];const s=Math.max(2,Math.ceil(i/2));return t.filter(a=>a.count>=Math.min(s,i)&&e.absorb.test(a.name.replace(/_/g," "))).map(a=>a.name)}function bs(e,t){const i=[],{min:s,ideal:a}=e.pictures,o=e.title.toLowerCase().replace(/^an? /,"");return t.count===0?[{level:"bad",text:"No pictures yet. Add some from the library, your computer or an X account."}]:(t.count<s?i.push({level:"bad",text:`${t.count} picture${t.count===1?"":"s"} is too few for ${o} — aim for ${a[0]}–${a[1]}, and at least ${s}.`}):t.count<a[0]?i.push({level:"warn",text:`${t.count} pictures will work, but ${a[0]}–${a[1]} train a steadier LoRA.`}):t.count>a[1]*3&&i.push({level:"warn",text:`${t.count} pictures is more than ${o} needs — it will train slower, not better. The best ${a[1]} or so are plenty.`}),t.captions==="tags"&&t.untagged>0&&i.push({level:"warn",text:`${t.untagged} picture${t.untagged===1?" has":"s have"} no tags, so ${t.untagged===1?"it":"they"} would be captioned with the trigger word alone. Tag them in the next step.`}),t.small>0&&i.push({level:"warn",text:`${t.small} picture${t.small===1?" is":"s are"} small for this checkpoint and will come out soft. Drop ${t.small===1?"it":"them"} if you have larger ones.`}),i.length===0&&i.push({level:"good",text:`${t.count} pictures — a good size for ${o}.`}),i)}function Q(e){let t=e.trim();return/[a-z]/i.test(t)&&(t=t.replace(/_/g," ")),t.toLowerCase().split(/\s+/).filter(Boolean).join(" ")}function vs(e,t,i,s){const a=e.trim(),o=a?[a]:[];if(s==="trigger")return o.join(", ");const l=new Set(i.map(Q)),n=new Set([Q(a)]);for(const p of t){const h=Q(p);if(!(!h||n.has(h)||l.has(h))&&(n.add(h),o.push(p),o.length>40))break}return o.join(", ")}function tt(e){return/xl|pony|illustrious|noob/i.test(e??"")?768:448}function xs(e,t){return e?tt(t)>448?e<12*1024:e<6*1024:!1}const at=ie`
  .btn {
    border: none; background: var(--oppai-surface-2); color: var(--oppai-text); border-radius: 999px;
    font: inherit; font-size: 13px; padding: 8px 16px; cursor: pointer; min-height: 36px; box-sizing: border-box;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap;
    transition: background 0.15s ease, opacity 0.15s ease;
  }
  .btn:hover:not(:disabled) { background: color-mix(in srgb, var(--oppai-surface-2) 80%, var(--oppai-text) 8%); }
  .btn:disabled { opacity: 0.45; cursor: default; }
  .btn.primary { background: var(--oppai-primary); color: var(--oppai-on-primary, #1d1b20); font-weight: 600; }
  .btn.primary:hover:not(:disabled) { background: var(--oppai-primary-bright, var(--oppai-primary)); }
  .btn.tonal { background: var(--oppai-primary-container); color: var(--oppai-on-accent, var(--oppai-text)); }
  .btn.ghost { background: transparent; color: var(--oppai-text-dim); }
  .btn.ghost:hover:not(:disabled) { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .btn.danger { color: var(--oppai-error, #f2b8b5); }
  .btn.small { padding: 5px 12px; min-height: 30px; font-size: 12px; }
  .btn .material-symbols-rounded { font-size: 18px; }
  .btn.small .material-symbols-rounded { font-size: 16px; }

  .card {
    background: var(--oppai-surface); border: 1px solid var(--oppai-border); border-radius: var(--oppai-radius, 16px);
    padding: 18px;
  }
  .card + .card { margin-top: 14px; }
  .card h3 { margin: 0 0 4px; font-size: 16px; display: flex; align-items: center; gap: 8px; }
  .card h3 .material-symbols-rounded { font-size: 20px; color: var(--oppai-primary); }
  .card .sub { margin: 0 0 14px; font-size: 13px; color: var(--oppai-text-dim); line-height: 1.45; }

  label.field { display: block; font-size: 12px; font-weight: 600; color: var(--oppai-text-dim); margin: 14px 0 6px; }
  label.field:first-child { margin-top: 0; }
  input[type="text"], input[type="number"], input[type="search"], select, textarea {
    width: 100%; box-sizing: border-box; background: var(--oppai-bg, #141218);
    border: 1px solid var(--oppai-border-strong); border-radius: 12px; color: var(--oppai-text);
    font: inherit; font-size: 14px; padding: 9px 12px; outline: none; min-height: 40px;
  }
  textarea { resize: vertical; min-height: 64px; line-height: 1.4; }
  input:focus, select:focus, textarea:focus { border-color: var(--oppai-primary); }
  .row { display: flex; gap: 12px; flex-wrap: wrap; }
  .row > * { flex: 1; min-width: 140px; }

  .seg { display: inline-flex; background: var(--oppai-bg, #141218); border-radius: 999px; padding: 3px; gap: 2px; flex-wrap: wrap; }
  .seg button {
    border: none; background: none; color: var(--oppai-text-dim); font: inherit; font-size: 13px;
    padding: 6px 14px; border-radius: 999px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
  }
  .seg button .material-symbols-rounded { font-size: 17px; }
  .seg button.on { background: var(--oppai-surface-2); color: var(--oppai-text); font-weight: 600; }

  .check { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; margin-top: 12px; cursor: pointer; }
  .check input { margin-top: 2px; accent-color: var(--oppai-primary); width: 16px; height: 16px; flex: none; }
  .check small { display: block; color: var(--oppai-text-dim); font-size: 12px; margin-top: 2px; line-height: 1.4; }

  .note { font-size: 12px; color: var(--oppai-text-dim); line-height: 1.5; margin-top: 8px; }
  .muted { color: var(--oppai-text-muted, var(--oppai-text-dim)); }
  .banner {
    display: flex; gap: 10px; align-items: flex-start;
    background: color-mix(in srgb, var(--oppai-error, #f2b8b5) 16%, transparent);
    color: var(--oppai-text); border-radius: 12px; padding: 10px 12px; font-size: 13px; margin: 10px 0; line-height: 1.45;
  }
  .banner .material-symbols-rounded { font-size: 18px; flex: none; }
  .banner.info { background: color-mix(in srgb, var(--oppai-primary) 12%, transparent); }
  .banner.good { background: color-mix(in srgb, #7fcf8a 16%, transparent); }

  .bar { height: 6px; border-radius: 3px; background: var(--oppai-surface-2); overflow: hidden; }
  .bar > div { height: 100%; background: var(--oppai-primary); transition: width 0.6s ease; border-radius: 3px; }
  .bar.unknown > div { width: 30%; animation: slide 1.4s ease-in-out infinite; }
  @keyframes slide { from { margin-left: -30%; } to { margin-left: 100%; } }

  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text);
    border-radius: 999px; font: inherit; font-size: 12px; padding: 4px 10px; cursor: pointer;
    display: inline-flex; align-items: center; gap: 4px; line-height: 1.3;
  }
  .chip b { color: var(--oppai-text-dim); font-weight: 400; }
  .chip.out { text-decoration: line-through; color: var(--oppai-text-dim); border-style: dashed; }
  .chip.manual { border-color: var(--oppai-primary); }
  .chip .material-symbols-rounded { font-size: 14px; }

  .picks { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; }
  .pick {
    position: relative; border: none; padding: 0; background: var(--oppai-surface-2); border-radius: 12px;
    overflow: hidden; aspect-ratio: 1; cursor: pointer; display: block; width: 100%;
    outline: 2px solid transparent; outline-offset: -2px; transition: outline-color 0.12s ease, opacity 0.12s ease;
  }
  .pick img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pick.on { outline-color: var(--oppai-primary); }
  .pick.off img { opacity: 0.35; filter: grayscale(0.6); }
  .pick .mark {
    position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border-radius: 50%;
    background: rgba(0, 0, 0, 0.55); color: #fff; display: grid; place-items: center;
  }
  .pick.on .mark { background: var(--oppai-primary); color: var(--oppai-on-primary, #1d1b20); }
  .pick .mark .material-symbols-rounded { font-size: 16px; }
  .pick .badge {
    position: absolute; left: 6px; bottom: 6px; font-size: 10px; padding: 2px 6px; border-radius: 999px;
    background: rgba(0, 0, 0, 0.6); color: #fff;
  }

  .empty { text-align: center; color: var(--oppai-text-dim); padding: 36px 16px; font-size: 14px; line-height: 1.55; }
  .empty .material-symbols-rounded { font-size: 40px; display: block; margin-bottom: 8px; color: var(--oppai-text-muted, var(--oppai-text-dim)); }

  @media (max-width: 600px) {
    .card { padding: 14px; }
    .picks { grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 6px; }
  }
`;var ys=Object.defineProperty,ws=Object.getOwnPropertyDescriptor,_=(e,t,i,s)=>{for(var a=s>1?void 0:s?ws(t,i):t,o=e.length-1,l;o>=0;o--)(l=e[o])&&(a=(s?l(t,i,a):l(a))||a);return s&&a&&ys(t,i,a),a};const $s=/^image\/(jpeg|png|webp|bmp)$/,ks=3;let A=class extends ne{constructor(){super(...arguments),this.mode="upload",this.setId=0,this.setName="",this.files=[],this.dragging=!1,this.progress=null,this.user="",this.page=null,this.pictures=[],this.dropped=new Set,this.cursor="",this.loading=!1,this.reposts=!1,this.task=null,this.error=""}disconnectedCallback(){super.disconnectedCallback();for(const e of this.files)URL.revokeObjectURL(e.url)}render(){return this.mode==="upload"?this.renderUpload():this.renderX()}addFiles(e){if(!e)return;const t=new Set(this.files.map(a=>a.key)),i=[];let s=0;for(const a of Array.from(e)){if(!$s.test(a.type)){s++;continue}const o=`${a.name}:${a.size}:${a.lastModified}`;t.has(o)||(t.add(o),i.push({key:o,file:a,url:URL.createObjectURL(a),keep:!0}))}this.files=[...this.files,...i],this.error=s?`${s} file${s===1?" isn't a still picture":"s aren't still pictures"} (GIFs and videos can't be trained on) and ${s===1?"was":"were"} left out.`:""}toggleFile(e){this.files=this.files.map(t=>t.key===e?{...t,keep:!t.keep}:t)}setAllFiles(e){this.files=this.files.map(t=>({...t,keep:e}))}clearFiles(){for(const e of this.files)URL.revokeObjectURL(e.url);this.files=[],this.error=""}async target(){if(this.setId>0)return this.setId;const e=await u.trainSetCreate(this.setName.trim()||"Training set");return this.setId=e.id,e.id}async uploadKept(){const e=this.files.filter(t=>t.keep);if(!(!e.length||this.progress)){this.error="",this.progress={done:0,total:e.length,failed:0};try{const t=await this.target();let i=0,s="";const a=async()=>{for(;i<e.length;){const l=e[i++];try{await u.trainSetUpload(t,l.file),this.progress={...this.progress,done:this.progress.done+1}}catch(n){s=n.message,this.progress={...this.progress,failed:this.progress.failed+1}}}};if(await Promise.all(Array.from({length:Math.min(ks,e.length)},a)),!this.progress.done)throw new Error(s||"None of the pictures could be uploaded.");const o=this.progress.failed;this.clearFiles(),o&&(this.error=`${o} picture${o===1?"":"s"} couldn't be added (${s}).`),this.dispatchEvent(new CustomEvent("gathered",{detail:{setId:t}}))}catch(t){this.error=t.message}finally{this.progress=null}}}renderUpload(){const e=this.files.filter(t=>t.keep).length;return r`
      <div class="drop ${this.dragging?"over":""}"
        @dragover=${t=>{t.preventDefault(),this.dragging=!0}}
        @dragleave=${()=>this.dragging=!1}
        @drop=${t=>{var i;t.preventDefault(),this.dragging=!1,this.addFiles(((i=t.dataTransfer)==null?void 0:i.files)??null)}}>
        <span class="material-symbols-rounded">upload_file</span>
        Drop pictures here, or choose them.<br />
        <span class="muted">JPEG, PNG or WebP. You'll pick which to keep before anything is uploaded.</span>
        <div class="btns">
          <button class="btn tonal" @click=${()=>{var t;return(t=this.renderRoot.querySelector("#files"))==null?void 0:t.click()}}>
            <span class="material-symbols-rounded">image</span> Choose pictures
          </button>
          <button class="btn" @click=${()=>{var t;return(t=this.renderRoot.querySelector("#folder"))==null?void 0:t.click()}}>
            <span class="material-symbols-rounded">folder</span> Choose a folder
          </button>
        </div>
        <input id="files" type="file" accept="image/jpeg,image/png,image/webp,image/bmp" multiple
          @change=${t=>{const i=t.target;this.addFiles(i.files),i.value=""}} />
        <input id="folder" type="file" webkitdirectory multiple
          @change=${t=>{const i=t.target;this.addFiles(i.files),i.value=""}} />
      </div>
      ${this.error?r`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>`:c}
      ${this.files.length?r`
            <div class="toolbar">
              <span class="count">${e} of ${this.files.length} kept</span>
              <button class="btn small ghost" @click=${()=>this.setAllFiles(!0)}>Keep all</button>
              <button class="btn small ghost" @click=${()=>this.setAllFiles(!1)}>Keep none</button>
              <button class="btn small ghost" @click=${()=>this.clearFiles()}><span class="material-symbols-rounded">delete</span> Clear</button>
            </div>
            <div class="picks">
              ${this.files.map(t=>r`<button class="pick ${t.keep?"on":"off"}" title=${t.file.name} @click=${()=>this.toggleFile(t.key)}>
                <img src=${t.url} alt="" loading="lazy" />
                <span class="mark"><span class="material-symbols-rounded">${t.keep?"check":"close"}</span></span>
              </button>`)}
            </div>
            <div class="footer">
              ${this.progress?r`<div class="what">Uploading ${this.progress.done+this.progress.failed} of ${this.progress.total}…</div>
                    <div class="bar"><div style="width:${(this.progress.done+this.progress.failed)/this.progress.total*100}%"></div></div>`:r`<div class="what">Kept pictures go into the training set <b>${this.setName||"Training set"}</b>, not your library.</div>
                    <button class="btn primary" ?disabled=${!e} @click=${()=>this.uploadKept()}>
                      <span class="material-symbols-rounded">upload</span> Add ${e} to the set
                    </button>`}
            </div>`:c}
    `}get shown(){return this.reposts?this.pictures:this.pictures.filter(e=>!e.repost)}get kept(){return this.shown.filter(e=>!this.dropped.has(e.id))}async find(){const e=this.user.trim();if(!(!e||this.loading)){this.loading=!0,this.error="",this.page=null,this.pictures=[],this.dropped=new Set,this.cursor="";try{const t=await u.trainTwitter(e);this.page=t,this.pictures=t.pictures,this.cursor=t.cursor??"",t.pictures.length&&t.pictures.every(i=>i.repost)&&(this.reposts=!0),this.cursor&&await this.more(2)}catch(t){this.error=t.message}finally{this.loading=!1}}}async more(e=3){var i;if(!((i=this.page)!=null&&i.account)||!this.cursor)return;const t=this.page.account.screenName;this.loading=!0,this.error="";try{for(let s=0;s<e&&this.cursor;s++){const a=await u.trainTwitter(t,this.cursor),o=new Set(this.pictures.map(l=>l.id));this.pictures=[...this.pictures,...a.pictures.filter(l=>!o.has(l.id))],this.cursor=a.cursor??""}}catch(s){this.error=`${s.message}`}finally{this.loading=!1}}togglePicture(e){const t=new Set(this.dropped);t.has(e)?t.delete(e):t.add(e),this.dropped=t}async importKept(){var i,s;const e=this.kept;if(!e.length||this.task)return;const t=((s=(i=this.page)==null?void 0:i.account)==null?void 0:s.screenName)??"";this.error="";try{let a=await u.trainImport({items:e.map(o=>({url:o.url,source:o.tweetUrl,title:`@${t}${o.text?` — ${o.text.split(`
`)[0]}`:""}`})),setId:this.setId||void 0,setName:this.setName||`@${t}`});for(this.task=a;!a.finished;){if(await new Promise(o=>setTimeout(o,1e3)),!this.isConnected)return;a=await u.trainTask(a.id),this.task=a}if(a.error)throw new Error(a.error);a.failed&&(this.error=`${a.failed} picture${a.failed===1?"":"s"} couldn't be downloaded and ${a.failed===1?"was":"were"} skipped.`),this.setId=a.setId??this.setId,this.pictures=[],this.page=null,this.dispatchEvent(new CustomEvent("gathered",{detail:{setId:a.setId}}))}catch(a){this.error=a.message}finally{this.task=null}}renderX(){var a;const e=this.shown,t=this.kept.length,i=this.pictures.filter(o=>o.repost).length,s=(a=this.page)==null?void 0:a.account;return r`
      <form class="search" @submit=${o=>{o.preventDefault(),this.find()}}>
        <input type="text" placeholder="@artist, or a link to their profile" .value=${this.user}
          @input=${o=>this.user=o.target.value} />
        <button class="btn primary" type="submit" ?disabled=${!this.user.trim()||this.loading}>
          <span class="material-symbols-rounded">search</span> ${this.loading&&!this.pictures.length?"Looking…":"Find pictures"}
        </button>
      </form>
      <div class="note">Reads the account's Media tab through a public mirror — no X account needed. Only the pictures you keep are downloaded.</div>
      ${this.error?r`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>`:c}
      ${s?r`<div class="account">
            ${s.avatar?r`<img src=${u.proxyURL(s.avatar)} alt="" />`:c}
            <div class="who">${s.name}<small>@${s.screenName} · ${s.mediaCount.toLocaleString()} posts with media</small></div>
          </div>
          ${s.protected?r`<div class="banner info"><span class="material-symbols-rounded">lock</span>This account is protected, so its posts can't be seen from outside.</div>`:c}`:c}
      ${this.pictures.length?r`
            <div class="toolbar">
              <span class="count">${t} of ${e.length} kept</span>
              ${i?r`<label class="check" style="margin:0;"><input type="checkbox" .checked=${this.reposts}
                    @change=${o=>this.reposts=o.target.checked} />Show ${i} repost${i===1?"":"s"}</label>`:c}
              <button class="btn small ghost" @click=${()=>this.dropped=new Set}>Keep all</button>
              <button class="btn small ghost" @click=${()=>this.dropped=new Set(e.map(o=>o.id))}>Keep none</button>
            </div>
            <div class="picks">
              ${e.map(o=>{const l=!this.dropped.has(o.id),n=o.width&&o.height&&Math.min(o.width,o.height)<640;return r`<button class="pick ${l?"on":"off"}" title=${o.text??""} @click=${()=>this.togglePicture(o.id)}>
                  <img src=${u.proxyURL(o.thumb)} alt="" loading="lazy" />
                  <span class="mark"><span class="material-symbols-rounded">${l?"check":"close"}</span></span>
                  ${o.repost?r`<span class="badge">repost</span>`:n?r`<span class="badge">small</span>`:c}
                </button>`})}
            </div>
            ${this.cursor?r`<div class="more"><button class="btn" ?disabled=${this.loading} @click=${()=>this.more()}>
                  <span class="material-symbols-rounded">${this.loading?"hourglass_top":"expand_more"}</span> ${this.loading?"Loading…":"Load more"}
                </button></div>`:r`<div class="note" style="text-align:center;">That's everything the mirror shows for this account.</div>`}
            <div class="footer">
              ${this.task?r`<div class="what">Downloading ${this.task.done+this.task.failed} of ${this.task.total}…</div>
                    <div class="bar"><div style="width:${this.task.total?(this.task.done+this.task.failed)/this.task.total*100:0}%"></div></div>`:r`<div class="what">Kept pictures go into the training set <b>${this.setName||`@${(s==null?void 0:s.screenName)??""}`}</b>, not your library.</div>
                    <button class="btn primary" ?disabled=${!t} @click=${()=>this.importKept()}>
                      <span class="material-symbols-rounded">download</span> Keep ${t}
                    </button>`}
            </div>`:s&&!this.loading&&!s.protected?r`<div class="empty"><span class="material-symbols-rounded">image</span>No pictures on this account's Media tab.</div>`:c}
    `}};A.styles=[re,at,ie`
      :host { display: block; }
      .drop {
        border: 2px dashed var(--oppai-border-strong); border-radius: 16px; padding: 28px 16px; text-align: center;
        color: var(--oppai-text-dim); font-size: 14px; line-height: 1.5; transition: border-color 0.15s ease, background 0.15s ease;
      }
      .drop.over { border-color: var(--oppai-primary); background: color-mix(in srgb, var(--oppai-primary) 8%, transparent); }
      .drop > .material-symbols-rounded { font-size: 40px; display: block; margin: 0 auto 6px; color: var(--oppai-primary); }
      .drop .btns { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
      input[type="file"] { display: none; }
      .toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 14px 0 10px; font-size: 13px; }
      .toolbar .count { font-weight: 600; margin-right: auto; }
      .search { display: flex; gap: 8px; }
      .search input { flex: 1; }
      .account { display: flex; align-items: center; gap: 12px; margin: 14px 0 4px; }
      .account img { width: 44px; height: 44px; border-radius: 50%; background: var(--oppai-surface-2); }
      .account .who { font-weight: 600; font-size: 14px; }
      .account .who small { display: block; font-weight: 400; color: var(--oppai-text-dim); font-size: 12px; }
      .footer {
        position: sticky; bottom: 0; margin: 14px -18px -18px; padding: 12px 18px;
        background: color-mix(in srgb, var(--oppai-surface) 92%, transparent); backdrop-filter: blur(6px);
        border-top: 1px solid var(--oppai-border); border-radius: 0 0 16px 16px;
        display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      }
      .footer .bar { flex: 1; min-width: 120px; }
      .footer .what { font-size: 13px; color: var(--oppai-text-dim); flex: 1; min-width: 160px; }
      .more { display: flex; justify-content: center; margin-top: 12px; }
      @media (max-width: 600px) { .footer { margin: 14px -14px -14px; padding: 10px 14px; } }
    `];_([E()],A.prototype,"mode",2);_([E({type:Number})],A.prototype,"setId",2);_([E()],A.prototype,"setName",2);_([d()],A.prototype,"files",2);_([d()],A.prototype,"dragging",2);_([d()],A.prototype,"progress",2);_([d()],A.prototype,"user",2);_([d()],A.prototype,"page",2);_([d()],A.prototype,"pictures",2);_([d()],A.prototype,"dropped",2);_([d()],A.prototype,"cursor",2);_([d()],A.prototype,"loading",2);_([d()],A.prototype,"reposts",2);_([d()],A.prototype,"task",2);_([d()],A.prototype,"error",2);A=_([le("oppai-lora-gather")],A);const Wt=4,Ss=4,Cs=/\{trigger\}/gi;function St(e,t){const i=(t??"").trim();return e.toLowerCase().includes("{trigger}")?Ts(e.replace(Cs,i)):!i||new RegExp(`(^|[\\s,(])${i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}($|[\\s,):])`,"i").test(e)?e.trim():e.trim()?`${i}, ${e.trim()}`:i}function Ts(e){return e.replace(/\s*,\s*(,\s*)+/g,", ").replace(/^\s*,\s*|\s*,\s*$/g,"").replace(/\s{2,}/g," ").trim()}function Ct(e){const t=[];for(const i of e.split(/[\s,;]+/)){if(!i)continue;const s=Number(i);if(!Number.isFinite(s))continue;const a=Math.round(Math.max(-2,Math.min(2,s))*100)/100;if(a!==0&&!t.includes(a)&&t.push(a),t.length===5)break}return t.length?t:[1]}function zs(e,t){const i=Math.max(1,Math.min(Wt,Math.floor(t)||1));return Array.from({length:i},(s,a)=>e+a)}function Tt(e,t){const i=t.split(`
`).map(s=>s.trim()).filter(Boolean);return[e,...i].slice(0,Ss)}function Ls(e,t,i){const s=[];for(let a=0;a<Math.max(1,i);a++)for(const o of t)for(const l of e){const n=[];i>1&&n.push(`Prompt ${a+1}`),t.length>1&&n.push(`Seed ${o}`),(e.length>1||!n.length)&&n.push(`Weight ${l}`),s.push({key:`p${a}s${o}w${l}`,weight:l,seed:o,prompt:a,label:n.join(" · ")})}return s}function Ps(e){const t=e.prompts.length?e.prompts:[""],i=Ls(e.weights,e.seeds,t.length),s=e.weights[0],a=[];e.baseline&&a.push({lora:null,cells:i.map(o=>o.weight===s?{key:`base:${o.key}`,lora:null,weight:0,seed:o.seed,prompt:St(t[o.prompt],""),checkpoint:e.checkpoint}:null)});for(const o of e.loras){const l=e.ownCheckpoint&&o.checkpoint?o.checkpoint:e.checkpoint,n=e.triggers===!1?"":o.trigger;a.push({lora:o,cells:i.map(p=>({key:`${o.name}:${p.key}`,lora:o,weight:p.weight,seed:p.seed,prompt:St(t[p.prompt],n),checkpoint:l}))})}return{columns:i,rows:a}}function zt(e){return e.rows.reduce((t,i)=>t+i.cells.filter(Boolean).length,0)}function Ms(e,t,i){const s=Math.round(i/32),a=Math.round(i*.75),o=Math.round(i/6);return{width:a+e*(i+s)+s,height:o+t*(i+s)+s,label:a,header:o,gap:s,x:l=>a+s+l*(i+s),y:l=>o+s+l*(i+s)}}var Is=Object.defineProperty,Ds=Object.getOwnPropertyDescriptor,T=(e,t,i,s)=>{for(var a=s>1?void 0:s?Ds(t,i):t,o=e.length-1,l;o>=0;o--)(l=e[o])&&(a=(s?l(t,i,a):l(a))||a);return s&&a&&Is(t,i,a),a};const Os={s:130,m:200,l:300},Rs="masterpiece, best quality, {trigger}, solo, looking at viewer, upper body",As="lowres, worst quality, bad anatomy, bad hands, watermark, text";function Lt(){return Math.floor(Math.random()*2**31)}let C=class extends ne{constructor(){super(...arguments),this.models=[],this.loras=[],this.runs=[],this.checkpoint="",this.focusLora="",this.prompt=Rs,this.extraPrompts="",this.negative=As,this.seed=Lt(),this.seedCount=1,this.weightsText="0.6, 0.8, 1",this.triggers=!0,this.baseline=!0,this.ownCheckpoint=!0,this.base="",this.sampler="",this.steps=0,this.cfg=0,this.size="",this.clipSkip=0,this.more=!1,this.selected=new Set,this.picked=!1,this.showOthers=!1,this.filter="",this.plan=null,this.results=new Map,this.running=!1,this.error="",this.cellSize="m",this.open="",this.saved=new Set,this.exporting=!1,this.jobId="",this.stopped=!1,this.onKey=e=>{if(this.open){if(e.key==="ArrowLeft")this.stepOpen(-1);else if(e.key==="ArrowRight")this.stepOpen(1);else if(e.key==="Escape")this.open="";else return;e.preventDefault()}}}connectedCallback(){super.connectedCallback(),window.addEventListener("keydown",this.onKey)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("keydown",this.onKey),this.stop()}willUpdate(e){var t;if((e.has("checkpoint")||e.has("models"))&&!this.base&&(this.base=this.checkpoint||((t=this.models[0])==null?void 0:t.title)||""),(e.has("loras")||e.has("runs")||e.has("focusLora"))&&this.loras.length)if(this.picked)e.has("focusLora")&&this.focusLora&&this.loras.some(i=>i.name===this.focusLora)&&(this.selected=new Set([...this.selected,this.focusLora]));else{const i=this.trained().map(a=>a.lora.name).slice(0,6),s=this.focusLora&&this.loras.some(a=>a.name===this.focusLora)?[this.focusLora]:[];this.selected=new Set([...s,...i])}}trained(){const e=[],t=new Set;for(const i of this.runs){if(i.status!=="done")continue;const s=this.loras.find(a=>i.modelKey&&a.key===i.modelKey||a.name===i.name);s&&!t.has(s.name)&&(t.add(s.name),e.push({lora:s,run:i}))}return e}compareLora(e){var s,a,o;const t=(s=this.trained().find(l=>l.lora.name===e.name))==null?void 0:s.run,i=(a=t==null?void 0:t.request)==null?void 0:a.base;return{name:e.name,trigger:(t==null?void 0:t.trigger)||((o=e.triggerPhrases)==null?void 0:o[0])||"",checkpoint:i&&this.models.some(l=>l.title===i)?i:void 0}}toggle(e){this.picked=!0;const t=new Set(this.selected);t.has(e)?t.delete(e):t.add(e),this.selected=t}selectAll(e,t){this.picked=!0;const i=new Set(this.selected);for(const s of e)t?i.add(s):i.delete(s);this.selected=i}currentPlan(){const e=this.loras.filter(t=>this.selected.has(t.name)).map(t=>this.compareLora(t));return Ps({loras:e,weights:Ct(this.weightsText),seeds:zs(this.seed,this.seedCount),prompts:Tt(this.prompt,this.extraPrompts),baseline:this.baseline,checkpoint:this.base,ownCheckpoint:this.ownCheckpoint,triggers:this.triggers})}cells(e=this.plan){return((e==null?void 0:e.rows)??[]).flatMap(t=>t.cells.filter(i=>!!i))}setResult(e,t){const i=new Map(this.results);i.set(e,t),this.results=i}async run(){if(this.running)return;const e=this.currentPlan();zt(e)&&(this.plan=e,this.saved=new Set,this.results=new Map(this.cells(e).map(t=>[t.key,{state:"waiting"}])),await this.drawAll(this.cells(e)))}async retry(){if(this.running||!this.plan)return;const e=this.cells().filter(t=>{var i;return((i=this.results.get(t.key))==null?void 0:i.state)!=="done"});for(const t of e)this.setResult(t.key,{state:"waiting"});await this.drawAll(e)}async drawAll(e){this.error="",this.stopped=!1,this.running=!0;try{for(const t of e){if(this.stopped)return;await this.draw(t)}}finally{this.running=!1,this.jobId=""}}async draw(e){var i;this.setResult(e.key,{state:"drawing"}),this.jobId=`cmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;const t=Je.find(s=>s.hint===this.size);try{const a=(i=(await u.generate({jobId:this.jobId,prompt:e.prompt,negativePrompt:this.negative,checkpoint:e.checkpoint||void 0,sampler:this.sampler||void 0,steps:this.steps||void 0,cfgScale:this.cfg||void 0,width:t==null?void 0:t.w,height:t==null?void 0:t.h,clipSkip:this.clipSkip||void 0,seed:e.seed,count:1,loras:e.lora?[{name:e.lora.name,weight:e.weight}]:[]})).images[0])==null?void 0:i.id;this.setResult(e.key,a?{state:"done",preview:a}:{state:"failed",error:"No picture came back"})}catch(s){const a=s.message;this.setResult(e.key,{state:"failed",error:this.stopped?"Stopped":a}),!this.stopped&&/not configured|unreachable|refused/i.test(a)&&(this.error=a,this.stopped=!0)}}stop(){this.stopped=!0,this.jobId&&u.cancelGenerate(this.jobId).catch(()=>{})}label(e){return e.lora?`${e.lora.name} at ${e.weight}`:"Without a LoRA"}doneCells(){return this.cells().filter(e=>{var t;return((t=this.results.get(e.key))==null?void 0:t.state)==="done"})}stepOpen(e){const t=this.doneCells(),i=t.findIndex(a=>a.key===this.open),s=t[i+e];s&&(this.open=s.key)}async keep(e){const t=this.results.get(e.key);if(!(!(t!=null&&t.preview)||this.saved.has(e.key)))try{await u.saveGenerated({id:t.preview,title:`${this.label(e)} · seed ${e.seed}`,tags:e.lora?["lora-comparison",e.lora.name]:["lora-comparison"]}),this.saved=new Set(this.saved).add(e.key)}catch(i){this.error=i.message}}async downloadSheet(){var t;const e=this.plan;if(!(!e||this.exporting)){this.exporting=!0;try{const s=Ms(e.columns.length,e.rows.length,384),a=document.createElement("canvas");a.width=s.width,a.height=s.height;const o=a.getContext("2d");o.fillStyle="#16121a",o.fillRect(0,0,s.width,s.height),o.fillStyle="#e8e0ea",o.textBaseline="middle";const l=(f,g=600)=>`${g} ${f}px Roboto, system-ui, sans-serif`;o.font=l(Math.round(384/22)),o.textAlign="center",e.columns.forEach((f,g)=>o.fillText(f.label,s.x(g)+384/2,s.header/2+s.gap/2,384)),o.textAlign="left";const n=f=>new Promise((g,y)=>{const k=new Image;k.onload=()=>g(k),k.onerror=()=>y(new Error("a picture couldn't be read")),k.src=f});for(const[f,g]of e.rows.entries()){const y=s.y(f);o.fillStyle="#e8e0ea",o.font=l(Math.round(384/18)),o.fillText(g.lora?g.lora.name:"No LoRA",s.gap,y+384/2-384/28,s.label-s.gap*2),(t=g.lora)!=null&&t.trigger&&this.triggers&&(o.fillStyle="#a89cae",o.font=l(Math.round(384/24),400),o.fillText(g.lora.trigger,s.gap,y+384/2+384/22,s.label-s.gap*2));for(const[k,S]of g.cells.entries()){const M=S&&this.results.get(S.key);if(!(M!=null&&M.preview))continue;const z=await n(u.genPreviewURL(M.preview)),L=Math.min(z.naturalWidth,z.naturalHeight);o.drawImage(z,(z.naturalWidth-L)/2,(z.naturalHeight-L)/2,L,L,s.x(k),y,384,384)}}const p=await new Promise(f=>a.toBlob(f,"image/png"));if(!p)throw new Error("The sheet couldn't be made");const h=document.createElement("a");h.href=URL.createObjectURL(p),h.download=`lora-comparison-${this.seed}.png`,h.click(),setTimeout(()=>URL.revokeObjectURL(h.href),1e4)}catch(i){this.error=i.message}finally{this.exporting=!1}}}render(){return this.loras.length?r`<div class="layout">${this.renderSetup()}${this.renderSheet()}</div>${this.renderLightbox()}`:r`<div class="card empty"><span class="material-symbols-rounded">compare</span>
        No LoRAs installed yet. Once a run has finished, it can be compared here with the others.</div>`}renderLora(e,t){return r`<label class="lora">
      <input type="checkbox" .checked=${this.selected.has(e.name)} @change=${()=>this.toggle(e.name)} />
      <img src=${u.loraThumbURL(e.name)} alt="" loading="lazy" @error=${i=>i.target.style.opacity="0"} />
      <span class="nm">${e.alias||e.name}${t?r`<small>${t}</small>`:c}</span>
    </label>`}renderSetup(){const e=this.trained(),t=new Set(e.map(p=>p.lora.name)),i=this.filter.trim().toLowerCase(),s=this.loras.filter(p=>!t.has(p.name)&&(!i||p.name.toLowerCase().includes(i))),a=this.currentPlan(),o=zt(a),l=Ct(this.weightsText).length,n=Tt(this.prompt,this.extraPrompts).length;return r`<div class="side"><div class="card">
      <h3><span class="material-symbols-rounded">compare</span> Compare LoRAs</h3>
      <p class="sub">The same prompt and seed for each, so the only difference between two pictures is the LoRA.</p>

      ${e.length?r`<div class="group">Trained here</div>
            <div class="loras">${e.map(p=>this.renderLora(p.lora,`${p.run.images} pictures · ${new Date(p.run.createdAt*1e3).toLocaleDateString()}`))}</div>
            <div class="quick">
              <button class="btn small ghost" @click=${()=>this.selectAll(e.map(p=>p.lora.name),!0)}>All trained</button>
              <button class="btn small ghost" @click=${()=>this.selectAll([...this.selected],!1)}>None</button>
            </div>`:r`<div class="note">None of the installed LoRAs were trained here yet — pick any below.</div>`}
      <button class="btn small ghost" style="margin-top:8px;" @click=${()=>this.showOthers=!this.showOthers}>
        <span class="material-symbols-rounded">${this.showOthers?"expand_less":"expand_more"}</span>
        ${this.showOthers?"Hide":"Show"} other LoRAs (${this.loras.length-e.length})
      </button>
      ${this.showOthers||!e.length?r`<input type="search" style="margin-top:8px;" placeholder="Filter" .value=${this.filter}
              @input=${p=>this.filter=p.target.value} />
            <div class="loras" style="margin-top:6px;">${s.map(p=>this.renderLora(p,p.base??""))}</div>`:c}

      <label class="field">Prompt</label>
      <textarea .value=${this.prompt} @input=${p=>this.prompt=p.target.value}></textarea>
      <div class="note">Each LoRA's trigger word goes where <b>{trigger}</b> is, or first if it isn't there.</div>
      <label class="field">More prompts <span class="muted" style="font-weight:400;">— optional, one per line</span></label>
      <textarea rows="2" placeholder="1girl, {trigger}, full body, beach&#10;{trigger}, portrait, night city" .value=${this.extraPrompts}
        @input=${p=>this.extraPrompts=p.target.value}></textarea>
      <div class="note">Each one is another set of columns. A LoRA that only looks right on one prompt has learnt the prompt.</div>
      <label class="field">Negative prompt</label>
      <textarea .value=${this.negative} @input=${p=>this.negative=p.target.value}></textarea>
      <label class="check">
        <input type="checkbox" .checked=${this.triggers} @change=${p=>this.triggers=p.target.checked} />
        <span>Use each LoRA's trigger word<small>Off shows how much of a LoRA comes through without being asked for.</small></span>
      </label>

      <div class="row">
        <div>
          <label class="field">Weights</label>
          <input type="text" .value=${this.weightsText} placeholder="0.6, 0.8, 1"
            @input=${p=>this.weightsText=p.target.value} />
        </div>
        <div>
          <label class="field">Seed</label>
          <div class="seedrow">
            <input type="number" .value=${String(this.seed)} @input=${p=>this.seed=Number(p.target.value)||0} />
            <button class="btn" title="Another seed" @click=${()=>this.seed=Lt()}><span class="material-symbols-rounded">casino</span></button>
          </div>
        </div>
      </div>
      <label class="field">Seeds per LoRA</label>
      <div class="seg small">
        ${Array.from({length:Wt},(p,h)=>h+1).map(p=>r`<button class=${this.seedCount===p?"on":""} @click=${()=>this.seedCount=p}>${p}</button>`)}
      </div>
      <div class="note">More than one draws the seeds after this one too: a LoRA that's only good on one seed was lucky.</div>

      <label class="field">Checkpoint</label>
      <select @change=${p=>this.base=p.target.value}>
        ${this.models.map(p=>r`<option value=${p.title} ?selected=${p.title===this.base}>${p.model_name||p.title}</option>`)}
      </select>
      <label class="check">
        <input type="checkbox" .checked=${this.ownCheckpoint} @change=${p=>this.ownCheckpoint=p.target.checked} />
        <span>Draw each trained LoRA on its own checkpoint<small>A LoRA only works on the family it was trained on.</small></span>
      </label>
      <label class="check">
        <input type="checkbox" .checked=${this.baseline} @change=${p=>this.baseline=p.target.checked} />
        <span>Include a picture without any LoRA<small>What the checkpoint draws on its own, to compare against.</small></span>
      </label>

      <button class="btn small ghost" style="margin-top:10px;" @click=${()=>this.more=!this.more}>
        <span class="material-symbols-rounded">${this.more?"expand_less":"tune"}</span> ${this.more?"Fewer settings":"Generation settings"}
      </button>
      ${this.more?r`
            <div class="row">
              <div>
                <label class="field">Sampler</label>
                <select @change=${p=>this.sampler=p.target.value}>
                  ${Gt.map(p=>r`<option value=${p.id} ?selected=${p.id===this.sampler}>${p.label}</option>`)}
                </select>
              </div>
              <div>
                <label class="field">Size</label>
                <select @change=${p=>this.size=p.target.value}>
                  <option value="" ?selected=${!this.size}>Generator's default</option>
                  ${Je.map(p=>r`<option value=${p.hint} ?selected=${p.hint===this.size}>${p.label} · ${p.hint}</option>`)}
                </select>
              </div>
            </div>
            <div class="row">
              <div>
                <label class="field">Steps</label>
                <input type="number" min="0" max="150" placeholder="Default" .value=${this.steps?String(this.steps):""}
                  @input=${p=>this.steps=Math.max(0,Math.min(150,Number(p.target.value)||0))} />
              </div>
              <div>
                <label class="field">CFG</label>
                <input type="number" min="0" max="30" step="0.5" placeholder="Default" .value=${this.cfg?String(this.cfg):""}
                  @input=${p=>this.cfg=Math.max(0,Math.min(30,Number(p.target.value)||0))} />
              </div>
              <div>
                <label class="field">Clip skip</label>
                <input type="number" min="0" max="12" placeholder="Default" .value=${this.clipSkip?String(this.clipSkip):""}
                  @input=${p=>this.clipSkip=Math.max(0,Math.min(12,Number(p.target.value)||0))} />
              </div>
            </div>
            <div class="note">Left empty, each is the generator's (or the checkpoint's recommended) setting.</div>`:c}

      ${this.error?r`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>`:c}
      <div class="go">
        ${this.running?r`<button class="btn danger" @click=${()=>this.stop()}><span class="material-symbols-rounded">stop</span> Stop</button>`:r`<button class="btn primary" ?disabled=${!o||!this.prompt.trim()} @click=${()=>this.run()}>
              <span class="material-symbols-rounded">play_arrow</span> Make ${o} picture${o===1?"":"s"}
            </button>`}
        <span class="count">${this.selected.size} LoRA${this.selected.size===1?"":"s"} × ${l} weight${l===1?"":"s"}${this.seedCount>1?` × ${this.seedCount} seeds`:""}${n>1?` × ${n} prompts`:""}</span>
      </div>
    </div></div>`}renderSheet(){const e=this.plan;if(!e)return r`<div class="card empty"><span class="material-symbols-rounded">grid_view</span>
        Tick the LoRAs to compare and press <b>Make</b>.<br />The pictures appear here in a grid, a row per LoRA.</div>`;const t=[...this.results.values()],i=t.filter(o=>o.state==="done").length,s=t.filter(o=>o.state==="failed").length,a=[...new Set(e.columns.map(o=>o.seed))];return r`<div class="card">
      <div class="toolbar">
        <h3>${a.length>1?`Seeds ${a[0]}–${a[a.length-1]}`:`Seed ${a[0]}`}</h3>
        <span class="note" style="margin:0;">${this.running?`Drawing ${Math.min(i+s+1,this.results.size)} of ${this.results.size}…`:`${i} of ${this.results.size} drawn`}</span>
        <span class="spacer"></span>
        ${!this.running&&s?r`<button class="btn small" @click=${()=>this.retry()}><span class="material-symbols-rounded">refresh</span> Retry ${s}</button>`:c}
        <div class="seg small" title="Picture size">
          ${["s","m","l"].map(o=>r`<button class=${this.cellSize===o?"on":""} @click=${()=>this.cellSize=o}>${o.toUpperCase()}</button>`)}
        </div>
        <button class="btn small" ?disabled=${!i||this.running||this.exporting} @click=${()=>this.downloadSheet()}>
          <span class="material-symbols-rounded">download</span> ${this.exporting?"Making…":"Save sheet"}
        </button>
      </div>
      <div class="sheet" style="--cell:${Os[this.cellSize]}px"><table>
        <thead><tr><th></th>${e.columns.map(o=>r`<th>${o.label}</th>`)}</tr></thead>
        <tbody>${e.rows.map(o=>{var l;return r`<tr>
          <th class="rowhead">
            <span class="nm">${o.lora?o.lora.name:"No LoRA"}</span>
            ${(l=o.lora)!=null&&l.trigger&&this.triggers?r`<small>${o.lora.trigger}</small>`:c}
          </th>
          ${o.cells.map(n=>r`<td>${n?this.renderCell(n):r`<div class="cell empty"></div>`}</td>`)}
        </tr>`})}</tbody>
      </table></div>
    </div>`}renderCell(e){const t=this.results.get(e.key)??{state:"waiting"};return t.state==="done"&&t.preview?r`<button class="cell done" title=${e.prompt} @click=${()=>this.open=e.key}>
        <img src=${u.genPreviewURL(t.preview)} alt=${this.label(e)} />
      </button>`:t.state==="drawing"?r`<div class="cell"><md-circular-progress indeterminate></md-circular-progress></div>`:t.state==="failed"?r`<div class="cell"><span class="err">${t.error??"Failed"}</span></div>`:r`<div class="cell"><span class="material-symbols-rounded">hourglass_empty</span></div>`}renderLightbox(){if(!this.open)return c;const e=this.doneCells(),t=e.findIndex(o=>o.key===this.open),i=e[t],s=i&&this.results.get(i.key);if(!i||!(s!=null&&s.preview))return c;const a=this.saved.has(i.key);return r`<div class="lightbox" @click=${o=>{o.target===o.currentTarget&&(this.open="")}}>
      <figure>
        <img src=${u.genPreviewURL(s.preview)} alt="" />
        ${t>0?r`<button class="nav prev" title="Previous (←)" @click=${()=>this.stepOpen(-1)}><span class="material-symbols-rounded">chevron_left</span></button>`:c}
        ${t<e.length-1?r`<button class="nav next" title="Next (→)" @click=${()=>this.stepOpen(1)}><span class="material-symbols-rounded">chevron_right</span></button>`:c}
        <figcaption>${this.label(i)} · seed ${i.seed}<small>${i.prompt}</small></figcaption>
        <div class="acts">
          <button class="btn tonal" ?disabled=${a} @click=${()=>this.keep(i)}>
            <span class="material-symbols-rounded">${a?"check":"save"}</span> ${a?"In library":"Save to library"}
          </button>
          <button class="btn" @click=${()=>this.open=""}><span class="material-symbols-rounded">close</span> Close</button>
        </div>
      </figure>
    </div>`}};C.styles=[re,at,ie`
      :host { display: block; }
      .layout { display: grid; grid-template-columns: minmax(280px, 360px) minmax(0, 1fr); gap: 16px; align-items: start; }
      @media (max-width: 900px) { .layout { grid-template-columns: minmax(0, 1fr); } }
      .side { position: sticky; top: 72px; max-height: calc(100vh - 88px); overflow-y: auto; border-radius: 16px; }
      @media (max-width: 900px) { .side { position: static; max-height: none; } }
      .loras { display: flex; flex-direction: column; gap: 4px; max-height: 280px; overflow-y: auto; margin: 0 -6px; padding: 0 6px; }
      .lora {
        display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 10px; cursor: pointer; font-size: 13px;
      }
      .lora:hover { background: var(--oppai-surface-2); }
      .lora input { accent-color: var(--oppai-primary); width: 16px; height: 16px; flex: none; }
      .lora img { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; background: var(--oppai-surface-2); flex: none; }
      .lora .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .lora .nm small { display: block; color: var(--oppai-text-dim); font-size: 11px; }
      .group { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--oppai-text-muted, var(--oppai-text-dim)); margin: 14px 0 6px; }
      .quick { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
      .seedrow { display: flex; gap: 8px; }
      .seedrow input { flex: 1; min-width: 0; }
      .seedrow select { width: auto; flex: none; }
      .go {
        display: flex; gap: 8px; margin-top: 16px; align-items: center; flex-wrap: wrap;
        position: sticky; bottom: -18px; background: var(--oppai-surface); padding: 10px 0 2px;
      }
      .go .count { font-size: 12px; color: var(--oppai-text-dim); margin-left: auto; }
      .toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
      .toolbar h3 { margin: 0; }
      .toolbar .spacer { flex: 1; }
      .sheet { overflow-x: auto; }
      table { border-collapse: separate; border-spacing: 8px; margin: -8px; }
      th { font-size: 12px; font-weight: 600; color: var(--oppai-text-dim); text-align: center; padding: 0 0 2px; }
      th.rowhead { text-align: left; vertical-align: middle; width: 140px; max-width: 160px; }
      th.rowhead .nm { display: block; color: var(--oppai-text); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      th.rowhead small { display: block; font-weight: 400; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      td { padding: 0; vertical-align: top; }
      .cell {
        width: var(--cell, 200px); aspect-ratio: 1; border-radius: 12px; background: var(--oppai-surface-2); overflow: hidden;
        display: grid; place-items: center; position: relative; border: none; padding: 0; cursor: default; color: var(--oppai-text-dim);
        font: inherit; font-size: 12px; text-align: center;
      }
      .cell.empty { background: transparent; }
      .cell.done { cursor: zoom-in; }
      .cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .cell .err { padding: 10px; color: var(--oppai-error, #f2b8b5); line-height: 1.35; }
      md-circular-progress { --md-circular-progress-size: 32px; }
      @media (max-width: 600px) { th.rowhead { width: 90px; } }
      .lightbox {
        position: fixed; inset: 0; z-index: 10; background: var(--oppai-scrim, rgba(0,0,0,0.78));
        display: grid; place-items: center; padding: 16px;
      }
      .lightbox figure { margin: 0; max-width: min(1100px, 100%); max-height: 100%; display: flex; flex-direction: column; gap: 10px; position: relative; }
      .lightbox img { max-width: 100%; max-height: calc(100vh - 140px); object-fit: contain; border-radius: 12px; }
      .lightbox figcaption { color: #fff; font-size: 13px; text-align: center; line-height: 1.4; }
      .lightbox figcaption small { display: block; opacity: 0.7; font-size: 12px; }
      .lightbox .acts { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
      .lightbox .nav {
        position: absolute; top: calc(50% - 40px); width: 44px; height: 44px; border-radius: 22px; border: none; cursor: pointer;
        background: rgba(0, 0, 0, 0.55); color: #fff; display: grid; place-items: center;
      }
      .lightbox .nav.prev { left: 8px; }
      .lightbox .nav.next { right: 8px; }
    `];T([E({attribute:!1})],C.prototype,"models",2);T([E({attribute:!1})],C.prototype,"loras",2);T([E({attribute:!1})],C.prototype,"runs",2);T([E()],C.prototype,"checkpoint",2);T([E()],C.prototype,"focusLora",2);T([d()],C.prototype,"prompt",2);T([d()],C.prototype,"extraPrompts",2);T([d()],C.prototype,"negative",2);T([d()],C.prototype,"seed",2);T([d()],C.prototype,"seedCount",2);T([d()],C.prototype,"weightsText",2);T([d()],C.prototype,"triggers",2);T([d()],C.prototype,"baseline",2);T([d()],C.prototype,"ownCheckpoint",2);T([d()],C.prototype,"base",2);T([d()],C.prototype,"sampler",2);T([d()],C.prototype,"steps",2);T([d()],C.prototype,"cfg",2);T([d()],C.prototype,"size",2);T([d()],C.prototype,"clipSkip",2);T([d()],C.prototype,"more",2);T([d()],C.prototype,"selected",2);T([d()],C.prototype,"picked",2);T([d()],C.prototype,"showOthers",2);T([d()],C.prototype,"filter",2);T([d()],C.prototype,"plan",2);T([d()],C.prototype,"results",2);T([d()],C.prototype,"running",2);T([d()],C.prototype,"error",2);T([d()],C.prototype,"cellSize",2);T([d()],C.prototype,"open",2);T([d()],C.prototype,"saved",2);T([d()],C.prototype,"exporting",2);C=T([le("oppai-lora-comparison")],C);var Es=Object.defineProperty,Bs=Object.getOwnPropertyDescriptor,$=(e,t,i,s)=>{for(var a=s>1?void 0:s?Bs(t,i):t,o=e.length-1,l;o>=0;o--)(l=e[o])&&(a=(s?l(t,i,a):l(a))||a);return s&&a&&Es(t,i,a),a};const Pt=[{n:1,title:"Kind",icon:"category"},{n:2,title:"Pictures",icon:"photo_library"},{n:3,title:"Tags",icon:"sell"},{n:4,title:"Train",icon:"model_training"}],_s=[{id:"upload",title:"Upload",icon:"upload_file"},{id:"x",title:"An X account",icon:"public"},{id:"library",title:"From the library",icon:"photo_library"}],Ns=/^LoRA · /;let w=class extends ne{constructor(){super(...arguments),this.models=[],this.loras=[],this.checkpoint="",this.tab="new",this.step=1,this.configured=!0,this.trainer=null,this.trainerError="",this.tagger=!1,this.runs=[],this.loaded=!1,this.preset="",this.effort="balanced",this.name="",this.trigger="",this.triggerTouched=!1,this.base="",this.sets=[],this.setId=0,this.addMode="upload",this.exclude=[],this.collections=[],this.libKind="collection",this.libCollection=0,this.libTag="",this.libMove=!1,this.copying=!1,this.copyNote="",this.captions="tags",this.leaveOut=[],this.leaveOutTouched=!1,this.suggested=[],this.preview=null,this.previewing=!1,this.tagTask=null,this.tagNote="",this.editing=0,this.newTag="",this.advanced=!1,this.epochs=10,this.repeats=0,this.rank=0,this.alpha=0,this.resolution=0,this.learningRate=1e-4,this.textEncoderLr=0,this.optimizer="AdamW8bit",this.noiseOffset=0,this.lowVram=!1,this.lowVramTouched=!1,this.flip=!1,this.freeGpu=!0,this.samples=!0,this.starting=!1,this.error="",this.openLog=0,this.compareFocus="",this.timer=0,this.previewTimer=0,this.previewAbort=null,this.installed=new Set}connectedCallback(){super.connectedCallback(),this.refresh(),this.loadSets(),this.loadCollections()}willUpdate(e){var i;e.has("checkpoint")&&!this.base&&(this.base=this.checkpoint);const t=e;(t.has("base")||t.has("trainer"))&&!this.lowVramTouched&&(this.lowVram=xs((i=this.trainer)==null?void 0:i.vramMB,this.baseFamily()))}disconnectedCallback(){var e;super.disconnectedCallback(),window.clearTimeout(this.timer),window.clearTimeout(this.previewTimer),(e=this.previewAbort)==null||e.abort()}async loadCollections(){var e;try{const t=await u.listCollections();this.collections=t.items,t.items.some(i=>i.id===this.libCollection)||this.pickLibCollection(((e=t.items[0])==null?void 0:e.id)??0)}catch{}}pickLibCollection(e){var t;this.libCollection=e,this.libMove=Ns.test(((t=this.collections.find(i=>i.id===e))==null?void 0:t.name)??"")}async loadSets(){try{this.sets=(await u.trainSets()).sets,this.setId&&!this.sets.some(e=>e.id===this.setId)&&this.useSet(0)}catch{}}matchSetToName(){if(this.setId)return;const e=this.name.trim().toLowerCase(),t=e&&this.sets.find(i=>i.name.toLowerCase()===e);t&&this.useSet(t.id)}useSet(e){e!==this.setId&&(this.setId=e,this.sourceChanged())}async refresh(){window.clearTimeout(this.timer);try{const t=await u.trainList();this.configured=t.configured,this.trainer=t.trainer??null,this.trainerError=t.trainerError??"",this.tagger=!!t.tagger,this.runs=t.trainings;for(const i of t.trainings)i.status==="done"&&!this.installed.has(i.id)&&(this.loaded&&i.finishedAt&&Date.now()/1e3-i.finishedAt<120&&this.dispatchEvent(new CustomEvent("trained",{detail:{name:i.name}})),this.installed.add(i.id))}catch(t){this.trainerError=t.message}finally{this.loaded=!0}if(!this.isConnected)return;const e=this.runs.some(Fe);this.timer=window.setTimeout(()=>void this.refresh(),e?3e3:2e4)}source(){return this.setId>0?{setId:this.setId,exclude:this.exclude}:null}thumb(e){return u.trainPictureURL(this.setId,e,!0)}sourceChanged(){this.exclude=[],this.leaveOutTouched=!1,this.leaveOut=[],this.suggested=[],this.preview=null,this.tagNote="",this.schedulePreview()}schedulePreview(e=0){window.clearTimeout(this.previewTimer),this.previewTimer=window.setTimeout(()=>void this.loadPreview(),e)}async loadPreview(){var i;const e=this.source();if(!e){this.preview=null;return}(i=this.previewAbort)==null||i.abort();const t=new AbortController;this.previewAbort=t,this.previewing=!0;try{const s=await u.trainPreview({source:e,trigger:this.trigger,captions:this.captions,leaveOut:this.leaveOut},t.signal);if(t.signal.aborted)return;this.preview=s,this.error="",this.leaveOutTouched||this.applySuggestions()}catch(s){if(t.signal.aborted)return;this.error=s.message,this.preview=null}finally{this.previewAbort===t&&(this.previewing=!1)}}applySuggestions(){const e=this.preview;!e||!this.preset||(this.suggested=fs(Z(this.preset),e.commonTags,e.count),this.leaveOut=[...this.suggested])}dropPicture(e){if(this.exclude=[...this.exclude,e],this.preview){const t=this.preview.items.filter(i=>i.id!==e);this.preview={...this.preview,items:t,count:t.length}}this.editing===e&&(this.editing=0),this.schedulePreview(600)}bringBack(){this.exclude=[],this.schedulePreview()}caption(e){return vs(this.trigger,e.tags.map(t=>t.name),this.leaveOut,this.captions)}smallCount(){var t;const e=tt(this.baseFamily());return(((t=this.preview)==null?void 0:t.items)??[]).filter(i=>i.width&&i.height&&Math.min(i.width,i.height)<e).length}baseFamily(){const e=this.models.find(t=>t.title===this.base);return`${(e==null?void 0:e.base)??""} ${(e==null?void 0:e.model_name)??""}`}async autotag(e){var i,s;const t=this.source();if(!(!t||this.tagTask)){this.tagNote="";try{const a=((i=this.preview)==null?void 0:i.untagged)??0;let o=await u.trainAutotag({source:t,redo:e});for(this.tagTask=o;!o.finished;){if(await new Promise(l=>setTimeout(l,1200)),!this.isConnected)return;o=await u.trainTask(o.id),this.tagTask=o}o.failed&&(this.tagNote=`The tagger couldn't read ${o.failed} picture${o.failed===1?"":"s"}.`),this.leaveOutTouched=!1,await this.loadPreview(),!e&&o.done&&(((s=this.preview)==null?void 0:s.untagged)??0)>=a&&(this.tagNote="The tagger looked at every picture but found nothing to caption them with — this install may only have the simple fallback tagger. Tag them by hand below, or caption with the trigger word alone.")}catch(a){this.tagNote=a.message}finally{this.tagTask=null}}}editedItem(e,t){this.preview&&(this.preview={...this.preview,items:this.preview.items.map(i=>i.id===e?{...i,tags:t}:i)})}async removeTag(e,t){this.editedItem(e.id,e.tags.filter(i=>i.name!==t));try{await u.trainPictureTags(this.setId,e.id,{removeTags:[t]})}catch(i){this.error=i.message,this.editedItem(e.id,e.tags)}}async addTag(e){const t=this.newTag.split(",").map(a=>a.trim()).filter(Boolean);if(!t.length)return;const i=new Set(e.tags.map(a=>Q(a.name))),s=t.filter(a=>!i.has(Q(a)));if(this.newTag="",!!s.length){this.editedItem(e.id,[...s.map(a=>({name:a.replace(/_/g," ").toLowerCase(),manual:!0})),...e.tags]);try{await u.trainPictureTags(this.setId,e.id,{addTags:s})}catch(a){this.error=a.message,this.editedItem(e.id,e.tags)}}}async deletePicture(e){var a;if(!confirm("Delete this picture from the training set? Dropping it only leaves it out of this LoRA; deleting removes it from the set."))return;const t=((a=this.preview)==null?void 0:a.items)??[],i=t.findIndex(o=>o.id===e.id),s=t[i+1]??t[i-1];try{if(await u.trainPictureDelete(this.setId,e.id),this.preview){const o=this.preview.items.filter(l=>l.id!==e.id);this.preview={...this.preview,items:o,count:o.length}}this.editing=s&&s.id!==e.id?s.id:0,this.schedulePreview(400),this.loadSets()}catch(o){this.error=o.message}}closeEditor(){this.editing=0,this.schedulePreview(200)}choosePreset(e){const t=Z(e);this.preset=e;const i=t.settings;this.captions=i.captions,this.epochs=kt(t,this.effort),this.repeats=i.repeats,this.rank=i.rank,this.alpha=i.alpha,this.resolution=i.resolution,this.learningRate=i.learningRate,this.textEncoderLr=i.textEncoderLr,this.optimizer=i.optimizer,this.noiseOffset=i.noiseOffset,this.flip=i.flip,e==="custom"&&(this.advanced=!0),this.leaveOutTouched||this.applySuggestions()}chooseEffort(e){this.effort=e,this.preset&&(this.epochs=kt(Z(this.preset),e))}stepReady(e){var t;switch(e){case 1:return!0;case 2:return!!this.preset&&!!this.name.trim();case 3:case 4:return this.stepReady(2)&&!!((t=this.preview)!=null&&t.count)}}goTo(e){var t;this.stepReady(e)&&(this.step=e,e>=2&&this.matchSetToName(),e>=2&&!this.preview&&this.setId&&this.schedulePreview(),(t=this.renderRoot.querySelector(".wrap"))==null||t.scrollIntoView({block:"start"}),this.scrollTop=0)}async start(){const e=this.source();if(this.starting||!e)return;this.starting=!0,this.error="";const t={name:this.name.trim(),trigger:this.trigger.trim(),base:this.base,source:e,captions:this.captions,leaveOut:this.leaveOut,preset:this.preset||void 0,epochs:this.epochs||void 0,repeats:this.repeats||void 0,rank:this.rank||void 0,alpha:this.alpha||void 0,resolution:this.resolution||void 0,learningRate:this.learningRate||void 0,textEncoderLr:this.textEncoderLr||void 0,optimizer:this.optimizer,noiseOffset:this.noiseOffset||void 0,lowVram:this.lowVram,flip:this.flip,freeGpu:this.freeGpu,samples:this.samples};try{await u.trainStart(t),await this.refresh(),this.tab="runs",this.step=1,this.preset="",this.name="",this.trigger="",this.triggerTouched=!1,this.setId=0,this.exclude=[],this.preview=null}catch(i){this.error=i.message}finally{this.starting=!1}}again(e){const t=e.request;t&&(this.preset=t.preset||"custom",this.name=t.name,this.trigger=t.trigger,this.triggerTouched=!0,this.models.some(i=>i.title===t.base)&&(this.base=t.base),this.setId=t.source.setId??0,this.exclude=t.source.setId?t.source.exclude??[]:[],t.source.setId||(this.addMode="library",t.source.collectionId?(this.libKind="collection",this.pickLibCollection(t.source.collectionId)):t.source.tag&&(this.libKind="tag",this.libTag=t.source.tag)),this.captions=t.captions??"tags",this.leaveOut=t.leaveOut??[],this.leaveOutTouched=!0,this.suggested=[],this.epochs=t.epochs??10,this.repeats=t.repeats??0,this.rank=t.rank??0,this.alpha=t.alpha??0,this.resolution=t.resolution??0,this.learningRate=t.learningRate??1e-4,this.textEncoderLr=t.textEncoderLr??0,this.optimizer=t.optimizer??"AdamW8bit",this.noiseOffset=t.noiseOffset??0,this.lowVram=!!t.lowVram,this.lowVramTouched=!0,this.flip=!!t.flip,this.freeGpu=t.freeGpu??!0,this.samples=t.samples??!0,this.preview=null,this.tab="new",this.loadPreview().then(()=>{var i;(i=this.preview)!=null&&i.count?this.step=4:this.step=2}),this.step=2)}async cancel(e){try{await u.trainCancel(e.id)}catch(t){this.error=t.message}await this.refresh()}async forget(e){try{await u.trainDelete(e.id),this.runs=this.runs.filter(t=>t.id!==e.id)}catch(t){this.error=t.message}}compare(e){const t=this.loras.find(i=>e.modelKey&&i.key===e.modelKey||i.name===e.name);this.compareFocus=(t==null?void 0:t.name)??"",this.tab="compare"}render(){const e=this.runs.filter(Fe).length;return r`
      <div class="wrap">
        <div class="topbar">
          <h2><span class="material-symbols-rounded">model_training</span> LoRA trainer</h2>
          ${this.renderTrainer()}
          <div class="tabs" role="tablist">
            <button class=${this.tab==="new"?"on":""} @click=${()=>this.tab="new"}>
              <span class="material-symbols-rounded">add</span> New LoRA
            </button>
            <button class=${this.tab==="runs"?"on":""} @click=${()=>this.tab="runs"}>
              <span class="material-symbols-rounded">history</span> Runs ${e?r`<span class="n">${e}</span>`:c}
            </button>
            <button class=${this.tab==="compare"?"on":""} @click=${()=>this.tab="compare"}>
              <span class="material-symbols-rounded">compare</span> Compare
            </button>
          </div>
          <button class="btn ghost close" @click=${()=>this.dispatchEvent(new CustomEvent("close"))}>
            <span class="material-symbols-rounded">close</span> Studio
          </button>
        </div>
        ${this.loaded?this.tab==="compare"?r`<oppai-lora-comparison .models=${this.models} .loras=${this.loras} .runs=${this.runs}
                .checkpoint=${this.checkpoint} .focusLora=${this.compareFocus}></oppai-lora-comparison>`:this.configured?this.tab==="runs"?this.renderRuns():this.renderWizard():this.renderNotSetUp():r`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`}
      </div>
      ${this.editing?this.renderEditor():c}
    `}renderTrainer(){if(!this.configured)return c;if(this.trainerError)return r`<span class="trainer" title=${this.trainerError}><span class="dot off"></span>Trainer unreachable</span>`;const e=this.trainer;if(!e)return c;const t=e.vramMB?` · ${Math.round(e.vramMB/1024)} GB`:"",i=e.busy?`training${e.queued?`, ${e.queued} waiting`:""}`:e.queued?`${e.queued} waiting`:"idle";return r`<span class="trainer"><span class="dot ${e.busy?"busy":""}"></span>${e.gpu||"Trainer"}${t} · ${i}</span>`}renderNotSetUp(){return r`<div class="card empty">
      <span class="material-symbols-rounded">model_training</span>
      LoRAs are trained by the OppaiLib trainer, a container of its own on the box with the GPU<br />
      (<code>ghcr.io/noneye-byte/oppailib-trainer</code>; setup is in <code>trainer/README.md</code>).<br />
      Once it is running, put its address and token under <strong>Settings → Image generation</strong>.
    </div>`}renderWizard(){const e=this.preview,t={1:this.preset?Z(this.preset).title:"What it learns",2:e?`${e.count} picture${e.count===1?"":"s"}`:"What it learns from",3:this.captions==="trigger"?"Trigger word only":this.leaveOut.length?`${this.leaveOut.length} struck`:"Captions",4:"Checkpoint and length"};return r`
      <nav class="stepper">
        ${Pt.map(i=>r`<button class="${this.step===i.n?"on":""} ${this.step>i.n?"done":""}"
          ?disabled=${!this.stepReady(i.n)} @click=${()=>this.goTo(i.n)}>
          <span class="num">${this.step>i.n?r`<span class="material-symbols-rounded">check</span>`:i.n}</span>
          <span class="t">${i.title}<small>${t[i.n]}</small></span>
        </button>`)}
      </nav>
      ${this.trainerError?r`<div class="banner"><span class="material-symbols-rounded">warning</span>The trainer didn't answer: ${this.trainerError}</div>`:c}
      ${this.step===1?this.renderKind():this.step===2?this.renderPictures():this.step===3?this.renderTags():this.renderTrain()}
      ${this.error&&this.step!==4?r`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>`:c}
      ${this.renderNav()}
    `}renderNav(){var i;const e=this.step+1,t={1:this.preset?this.name.trim()?"":"Give it a name to go on":"Pick a kind to go on",2:this.previewing?"Looking at the set…":(i=this.preview)!=null&&i.count?"":"Add some pictures to go on",3:""};return r`<div class="navbar">
      ${this.step>1?r`<button class="btn" @click=${()=>this.goTo(this.step-1)}><span class="material-symbols-rounded">arrow_back</span> Back</button>`:c}
      <span class="spacer"></span>
      ${this.step<4?r`${t[this.step]?r`<span class="hint">${t[this.step]}</span>`:c}
            <button class="btn primary" ?disabled=${!this.stepReady(e)} @click=${()=>this.goTo(e)}>
              Next: ${Pt[this.step].title} <span class="material-symbols-rounded">arrow_forward</span>
            </button>`:c}
    </div>`}renderKind(){const e=this.preset?Z(this.preset):null;return r`
      <div class="card">
        <h3><span class="material-symbols-rounded">category</span> What should it learn?</h3>
        <p class="sub">Pick the closest. It sets everything technical for you — how the pictures are captioned, how long it trains — and all of it can be changed later.</p>
        <div class="presets">
          ${Me.map(t=>r`<button class="preset ${this.preset===t.id?"on":""}" @click=${()=>this.choosePreset(t.id)}>
            <span class="ic"><span class="material-symbols-rounded">${t.icon}</span></span>
            <b>${t.title}</b>
            <span class="d">${t.blurb}</span>
            <span class="e">${t.examples} · ${t.pictures.ideal[0]}–${t.pictures.ideal[1]} pictures</span>
          </button>`)}
        </div>
        ${e?r`<div class="banner info" style="margin-top:14px;"><span class="material-symbols-rounded">info</span>
              <div><b>Good pictures for ${e.title.toLowerCase().replace(/^an? /,"")}</b><ul class="tips" style="margin-top:4px;">${e.tips.map(t=>r`<li>${t}</li>`)}</ul></div>
            </div>`:c}
      </div>
      ${e?r`<div class="card">
            <h3><span class="material-symbols-rounded">edit</span> Name it</h3>
            <p class="sub">The name is the file the generator lists it under. The trigger word is what you put in a prompt to call it up — one made-up word works best, so it means nothing to the checkpoint yet.</p>
            <div class="row">
              <div>
                <label class="field">Name</label>
                <input type="text" .value=${this.name} placeholder=${e.id==="style"?"ink_style":e.id==="character"?"my_character":"my_lora"}
                  @input=${t=>{this.name=t.target.value,this.triggerTouched||(this.trigger=ds(this.name))}} />
              </div>
              <div>
                <label class="field">Trigger word</label>
                <input type="text" .value=${this.trigger} placeholder="mychar"
                  @input=${t=>{this.trigger=t.target.value,this.triggerTouched=!0}} />
              </div>
            </div>
          </div>`:c}
    `}async gathered(e){await this.loadSets(),e===this.setId?this.schedulePreview():this.useSet(e)}async copyFromLibrary(){if(this.copying)return;const e=this.libKind==="tag"?{tag:this.libTag.trim(),move:this.libMove}:{collectionId:this.libCollection,move:this.libMove};if(!("tag"in e&&!e.tag||"collectionId"in e&&!e.collectionId)){this.copying=!0,this.copyNote="";try{const t=this.setId||(await u.trainSetCreate(this.name.trim()||"Training set")).id,i=await u.trainSetFromLibrary(t,e);this.copyNote=i.added||i.moved?`${i.added} picture${i.added===1?"":"s"} added to the set${i.moved?`, ${i.moved} taken out of the library`:""}.`:"Those pictures are in the set already.",i.moved&&this.loadCollections(),await this.gathered(t)}catch(t){this.copyNote=t.message}finally{this.copying=!1}}}async deleteSet(){const e=this.sets.find(t=>t.id===this.setId);if(!(!e||!confirm(`Delete the training set “${e.name}” and its ${e.count} picture${e.count===1?"":"s"}? LoRAs already trained on it keep working.`)))try{await u.trainSetDelete(e.id),this.useSet(0),await this.loadSets()}catch(t){this.error=t.message}}renderPictures(){const e=this.preview,t=Z(this.preset||"custom"),i=e?bs(t,{count:e.count,untagged:e.untagged,small:this.smallCount(),captions:this.captions}):[],s=this.sets.find(o=>o.id===this.setId),a=this.name.trim()||"Training set";return r`
      <div class="card">
        <h3><span class="material-symbols-rounded">photo_library</span> The training set</h3>
        <p class="sub">A LoRA learns from a training set: pictures kept for it, apart from your library — they never show up in a grid or a search, and nothing tags them but you, here.</p>
        <div class="sets">
          <button class="settile ${this.setId===0?"on":""}" @click=${()=>this.useSet(0)}>
            <span class="cover"><span class="material-symbols-rounded">add_photo_alternate</span></span>
            <span class="t">New set<small>“${a}”</small></span>
          </button>
          ${this.sets.map(o=>r`<button class="settile ${o.id===this.setId?"on":""}" @click=${()=>this.useSet(o.id)}>
            <span class="cover">${o.coverId?r`<img src=${u.trainPictureURL(o.id,o.coverId,!0)} alt="" loading="lazy" />`:r`<span class="material-symbols-rounded">image</span>`}</span>
            <span class="t" title=${o.name}>${o.name}<small>${o.count} picture${o.count===1?"":"s"}</small></span>
          </button>`)}
        </div>
      </div>
      <div class="card">
        <h3><span class="material-symbols-rounded">add_photo_alternate</span> Add pictures${s?r` to “${s.name}”`:c}</h3>
        <div class="seg">
          ${_s.map(o=>r`<button class=${this.addMode===o.id?"on":""} @click=${()=>this.addMode=o.id}>
            <span class="material-symbols-rounded">${o.icon}</span>${o.title}
          </button>`)}
        </div>
        <div style="margin-top:14px;">${this.renderAdd((s==null?void 0:s.name)??a)}</div>
      </div>
      ${this.setId&&(e||this.previewing)?r`<div class="card">
            <div class="sethead">
              <h4>${(s==null?void 0:s.name)??"The set"} ${e?r`· ${e.count} picture${e.count===1?"":"s"}${e.count>=e.limit?r` <span class="muted">(the first ${e.limit})</span>`:c}`:c}</h4>
              ${this.previewing?r`<md-circular-progress indeterminate style="--md-circular-progress-size:22px;"></md-circular-progress>`:c}
              ${this.exclude.length?r`<button class="btn small ghost" @click=${()=>this.bringBack()}><span class="material-symbols-rounded">undo</span> Bring back ${this.exclude.length} dropped</button>`:c}
              <button class="btn small ghost" title="Delete this set and its pictures" @click=${()=>this.deleteSet()}><span class="material-symbols-rounded">delete</span> Delete set</button>
            </div>
            <div class="advice">${i.map(o=>r`<div class="banner ${o.level==="good"?"good":o.level==="warn"?"info":""}">
              <span class="material-symbols-rounded">${o.level==="good"?"check_circle":o.level==="warn"?"info":"error"}</span>${o.text}</div>`)}</div>
            ${e!=null&&e.items.length?r`<div class="note">Drop anything that doesn't fit — blurry, cropped badly, or with someone else in it. A dropped picture stays in the set for the next LoRA.</div>
                  <div class="picks" style="margin-top:10px;">${e.items.map(o=>this.renderSetPicture(o))}</div>`:r`<div class="note">Nothing in this set yet — add pictures above.</div>`}
          </div>`:c}
    `}renderAdd(e){switch(this.addMode){case"upload":return r`<oppai-lora-gather mode="upload" .setId=${this.setId} .setName=${e}
          @gathered=${t=>this.gathered(t.detail.setId)}></oppai-lora-gather>`;case"x":return r`<oppai-lora-gather mode="x" .setId=${this.setId} .setName=${this.setId||this.name.trim()?e:""}
          @gathered=${t=>this.gathered(t.detail.setId)}></oppai-lora-gather>`;case"library":{const t=this.libKind==="tag"?!!this.libTag.trim():!!this.libCollection;return r`
          <div class="seg small">
            <button class=${this.libKind==="collection"?"on":""} @click=${()=>this.libKind="collection"}>A collection</button>
            <button class=${this.libKind==="tag"?"on":""} @click=${()=>this.libKind="tag"}>Everything with a tag</button>
          </div>
          <div style="margin-top:10px;">
            ${this.libKind==="collection"?this.collections.length?r`<select @change=${i=>this.pickLibCollection(Number(i.target.value))}>
                    ${this.collections.map(i=>r`<option value=${String(i.id)} ?selected=${i.id===this.libCollection}>${i.name} (${i.count})</option>`)}
                  </select>`:r`<div class="note">Your library has no collections.</div>`:r`<input type="text" .value=${this.libTag} placeholder="A tag in your library: a character's name, an artist, a style…"
                  @input=${i=>this.libTag=i.target.value} />`}
          </div>
          <label class="check"><input type="checkbox" .checked=${this.libMove} @change=${i=>this.libMove=i.target.checked} />
            Take them out of the library once they're in the set</label>
          <div class="note">${this.libMove?"They move: the set keeps the pictures and their tags, and the library no longer lists them. For pictures that were only ever for this LoRA.":"They're copied with their tags; the library keeps its own. A copy costs no space — it's the same file."}</div>
          <div class="row" style="margin-top:10px;">
            <button class="btn primary" style="flex:none;" ?disabled=${!t||this.copying} @click=${()=>this.copyFromLibrary()}>
              <span class="material-symbols-rounded">${this.libMove?"drive_file_move":"content_copy"}</span>
              ${this.copying?"Working…":this.libMove?`Move into “${e}”`:`Copy into “${e}”`}
            </button>
          </div>
          ${this.copyNote?r`<div class="banner info"><span class="material-symbols-rounded">info</span>${this.copyNote}</div>`:c}`}}}renderSetPicture(e){const t=tt(this.baseFamily()),i=e.width&&e.height&&Math.min(e.width,e.height)<t;return r`<div class="pick on" style="outline-color:transparent;cursor:default;">
      <img src=${this.thumb(e.id)} alt="" loading="lazy" />
      <button class="drop" title="Drop from the set" @click=${()=>this.dropPicture(e.id)}><span class="material-symbols-rounded">close</span></button>
      ${i?r`<span class="badge">${e.width}×${e.height}</span>`:c}
    </div>`}renderTags(){const e=this.preview;if(!e)return c;const t=Z(this.preset||"custom"),i=this.tagTask;return r`
      <div class="two">
        <div class="card">
          <h3><span class="material-symbols-rounded">auto_awesome</span> Auto-tag</h3>
          <p class="sub">Every picture is captioned from its tags, so a picture with none teaches almost nothing. The tagger looks at each one and writes its tags onto the picture in the set.</p>
          ${this.tagger?i?r`<div class="note">Tagging ${i.done+i.failed} of ${i.total}…</div>
                  <div class="bar" style="margin-top:8px;"><div style="width:${i.total?(i.done+i.failed)/i.total*100:100}%"></div></div>`:r`<div class="banner ${e.untagged?"info":"good"}"><span class="material-symbols-rounded">${e.untagged?"info":"check_circle"}</span>
                    ${e.untagged?`${e.untagged} of ${e.count} picture${e.count===1?" has":"s have"} no tags yet.`:"Every picture has tags."}</div>
                  <div class="row" style="margin-top:10px;flex-wrap:wrap;">
                    ${e.untagged?r`<button class="btn primary" style="flex:none;" @click=${()=>this.autotag(!1)}><span class="material-symbols-rounded">auto_awesome</span> Tag ${e.untagged} picture${e.untagged===1?"":"s"}</button>`:c}
                    <button class="btn" style="flex:none;" @click=${()=>this.autotag(!0)}><span class="material-symbols-rounded">refresh</span> Re-tag all ${e.count}</button>
                  </div>
                  <div class="note">Re-tagging replaces what the tagger said before. Tags you typed yourself are kept.</div>`:r`<div class="banner info"><span class="material-symbols-rounded">info</span>The tagger is off. Turn on AI tagging under Settings → AI, or tag pictures by hand below${this.captions==="tags"?", or caption with the trigger word alone":""}.</div>`}
          ${this.tagNote?r`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.tagNote}</div>`:c}
        </div>
        <div class="card">
          <h3><span class="material-symbols-rounded">text_fields</span> Captions</h3>
          <div class="seg">
            <button class=${this.captions==="tags"?"on":""} @click=${()=>this.captions="tags"}>Trigger + tags</button>
            <button class=${this.captions==="trigger"?"on":""} @click=${()=>this.captions="trigger"}>Trigger only</button>
          </div>
          <div class="note">${this.captions==="trigger"?"Every picture is captioned with the trigger word alone, so everything the pictures share — and much of what they don't — goes into it. Simple, but less flexible.":t.captionsWhy}</div>
          ${e.items[0]?r`<div class="caption">${this.caption(e.items[0])}</div>`:c}
        </div>
      </div>
      ${this.captions==="tags"&&e.commonTags.length?r`<div class="card">
            <h3><span class="material-symbols-rounded">label_off</span> What the trigger word stands for</h3>
            <p class="sub">The tags these pictures share, with how many have each. A struck tag is left out of every caption, so the trigger word learns it instead — strike what should always come with the LoRA, keep what you want to be able to change with the prompt.</p>
            ${this.suggested.length&&!this.leaveOutTouched?r`<div class="banner info"><span class="material-symbols-rounded">auto_fix_high</span>
                  <div>Struck for you: <b>${this.suggested.join(", ")}</b>. Click a tag to change it.</div></div>`:c}
            <div class="chips" style="margin-top:8px;">${e.commonTags.map(s=>{const a=this.leaveOut.some(o=>Q(o)===Q(s.name));return r`<button class="chip ${a?"out":""}" @click=${()=>{this.leaveOut=ps(this.leaveOut,s.name),this.leaveOutTouched=!0}}>
                ${s.name} <b>${s.count}</b></button>`})}</div>
          </div>`:c}
      <div class="card">
        <h3><span class="material-symbols-rounded">edit_note</span> Every picture</h3>
        <p class="sub">Each caption as it will be written. Click a picture to fix its tags or drop it from the set.</p>
        <div class="picks captions-grid">${e.items.map(s=>{const a=this.caption(s);return r`<button class="pick cap ${s.tags.length?"":"bare"}" @click=${()=>{this.editing=s.id,this.newTag=""}}>
            <img src=${this.thumb(s.id)} alt="" loading="lazy" />
            <span class="c">${s.tags.length||this.captions==="trigger"?a:"No tags"}</span>
          </button>`})}</div>
      </div>
    `}renderEditor(){var a;const e=((a=this.preview)==null?void 0:a.items)??[],t=e.findIndex(o=>o.id===this.editing),i=e[t];if(!i)return c;const s=o=>{const l=e[(t+o+e.length)%e.length];l&&(this.editing=l.id,this.newTag="")};return r`<div class="editor" @click=${o=>{o.target===o.currentTarget&&this.closeEditor()}}
      @keydown=${o=>{o.key==="Escape"&&this.closeEditor()}}>
      <div class="panel">
        <div class="pic"><img src=${u.trainPictureURL(this.setId,i.id)} alt="" /></div>
        <div class="side">
          <div class="head">
            <b>Picture ${t+1} of ${e.length}</b>
            <button class="btn small ghost" title="Previous" @click=${()=>s(-1)}><span class="material-symbols-rounded">chevron_left</span></button>
            <button class="btn small ghost" title="Next" @click=${()=>s(1)}><span class="material-symbols-rounded">chevron_right</span></button>
            <button class="btn small ghost" title="Close" @click=${()=>this.closeEditor()}><span class="material-symbols-rounded">close</span></button>
          </div>
          <label class="field">Tags <span class="muted" style="font-weight:400;">— outlined ones you typed; struck ones are left out of every caption</span></label>
          <div class="chips">
            ${i.tags.length?i.tags.map(o=>{const l=this.leaveOut.some(n=>Q(n)===Q(o.name));return r`<span class="chip ${o.manual?"manual":""} ${l?"out":""}">${o.name}
                    <button class="x" title="Remove this tag" @click=${()=>this.removeTag(i,o.name)}><span class="material-symbols-rounded">close</span></button></span>`}):r`<span class="note" style="margin:0;">No tags yet.</span>`}
          </div>
          <form @submit=${o=>{o.preventDefault(),this.addTag(i)}}>
            <input type="text" placeholder="Add tags, separated by commas" .value=${this.newTag}
              @input=${o=>this.newTag=o.target.value} />
            <button class="btn tonal" type="submit" ?disabled=${!this.newTag.trim()}><span class="material-symbols-rounded">add</span> Add</button>
          </form>
          <label class="field">Caption</label>
          <div class="caption" style="margin:0;">${this.caption(i)||r`<span class="muted">empty</span>`}</div>
          <div class="note">Tags are saved to the picture in the set as you change them.</div>
          <div style="margin-top:auto;display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn" @click=${()=>{const o=e[t+1]??e[t-1];this.dropPicture(i.id),o&&o.id!==i.id&&(this.editing=o.id)}}>
              <span class="material-symbols-rounded">remove_circle</span> Leave out of this LoRA
            </button>
            <button class="btn danger" @click=${()=>this.deletePicture(i)}>
              <span class="material-symbols-rounded">delete</span> Delete from the set
            </button>
          </div>
        </div>
      </div>
    </div>`}renderTrain(){var o,l;const e=this.preview,t=Z(this.preset||"custom"),i=ms((e==null?void 0:e.count)??0,this.epochs,this.repeats),s=!!this.name.trim()&&!!this.base&&!this.starting&&!this.trainerError&&!!(e!=null&&e.count),a=(o=this.trainer)!=null&&o.vramMB?Math.round(this.trainer.vramMB/1024):0;return r`
      <div class="two">
        <div class="card">
          <h3><span class="material-symbols-rounded">deployed_code</span> Train against</h3>
          <p class="sub">A LoRA works on the family it was trained on: one trained on a Pony checkpoint suits Pony and its merges, not SD 1.5. Pick the checkpoint you'll generate with.</p>
          <select @change=${n=>this.base=n.target.value}>
            ${this.base?c:r`<option value="">Choose a checkpoint</option>`}
            ${this.models.map(n=>r`<option value=${n.title} ?selected=${n.title===this.base}>${n.model_name||n.title}${n.base?` · ${n.base}`:""}</option>`)}
          </select>

          <label class="field">How long</label>
          <div class="seg">
            ${et.map(n=>r`<button class=${this.effort===n.id?"on":""} title=${n.blurb} @click=${()=>this.chooseEffort(n.id)}>${n.title}</button>`)}
          </div>
          <div class="note">${(l=et.find(n=>n.id===this.effort))==null?void 0:l.blurb}.</div>

          <label class="check">
            <input type="checkbox" .checked=${this.freeGpu} @change=${n=>this.freeGpu=n.target.checked} />
            <span>Free the generator's GPU while training<small>Asks the generator to unload its checkpoint when training starts, and to load it again after. Leave on if they share a card.</small></span>
          </label>
          <label class="check">
            <input type="checkbox" .checked=${this.samples} @change=${n=>this.samples=n.target.checked} />
            <span>Render a sample at the end<small>A picture made with the new LoRA, which becomes its cover.</small></span>
          </label>
          <label class="check">
            <input type="checkbox" .checked=${this.lowVram} @change=${n=>{this.lowVram=n.target.checked,this.lowVramTouched=!0}} />
            <span>Low VRAM${a?` (the trainer's card has ${a} GB)`:""}<small>For a card under 12 GB with SDXL: trains at 768 and leaves the text encoder alone.</small></span>
          </label>
        </div>
        <div class="card">
          <h3><span class="material-symbols-rounded">steps</span> Summary</h3>
          <div class="summary">
            <div class="stat"><small>Kind</small><b>${t.title.replace(/^An? /,"").replace(/^./,n=>n.toUpperCase())}</b></div>
            <div class="stat"><small>Pictures</small><b>${(e==null?void 0:e.count)??0}</b></div>
            <div class="stat"><small>Trigger word</small><b>${this.trigger||"—"}</b></div>
            <div class="stat"><small>Training steps</small><b>≈ ${i.toLocaleString()}</b></div>
          </div>
          ${e!=null&&e.items[0]?r`<label class="field">A caption</label><div class="caption" style="margin:0;">${this.caption(e.items[0])}</div>`:c}
          <div class="note">${this.epochs} passes over the set (epochs), each picture shown ${this.repeats||(e?Math.max(1,Math.round(i/Math.max(1,e.count*this.epochs))):0)}× a pass.</div>
          <button class="btn ghost" style="margin-top:10px;" @click=${()=>this.advanced=!this.advanced}>
            <span class="material-symbols-rounded">${this.advanced?"expand_less":"tune"}</span> ${this.advanced?"Hide":"Show"} the settings
          </button>
          ${this.advanced?this.renderAdvanced():c}
        </div>
      </div>
      ${this.error?r`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>`:c}
      <div class="card" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <div class="note" style="margin:0;flex:1;min-width:220px;">The pictures are decrypted and sent to the trainer, which deletes them the moment training ends. The finished LoRA installs itself into the generator — this screen can be closed while it trains.</div>
        <button class="btn primary" style="padding:10px 22px;font-size:14px;" ?disabled=${!s} @click=${()=>this.start()}>
          <span class="material-symbols-rounded">model_training</span> ${this.starting?"Starting…":"Start training"}
        </button>
      </div>
    `}renderAdvanced(){const e=(t,i,s)=>r`<input type="number" min=${s.min} max=${s.max} step=${s.step??1} .value=${t?String(t):""}
        placeholder=${s.placeholder??"Auto"} @input=${a=>i(Number(a.target.value)||0)} />`;return r`
      <div class="row" style="margin-top:6px;">
        <div><label class="field">Epochs</label>${e(this.epochs,t=>this.epochs=t,{min:1,max:100,placeholder:"10"})}</div>
        <div><label class="field">Repeats</label>${e(this.repeats,t=>this.repeats=t,{min:1,max:100})}</div>
      </div>
      <div class="row">
        <div><label class="field">Rank</label>${e(this.rank,t=>this.rank=t,{min:1,max:128,placeholder:"16 (SDXL) / 32"})}</div>
        <div><label class="field">Alpha</label>${e(this.alpha,t=>this.alpha=t,{min:0,max:128,step:.5,placeholder:"Half the rank"})}</div>
      </div>
      <div class="row">
        <div><label class="field">Learning rate</label>${e(this.learningRate,t=>this.learningRate=t,{min:0,max:1,step:1e-5,placeholder:"0.0001"})}</div>
        <div><label class="field">Text encoder rate</label>${e(this.textEncoderLr,t=>this.textEncoderLr=t,{min:0,max:1,step:1e-5,placeholder:"Half the rate"})}</div>
      </div>
      <div class="row">
        <div><label class="field">Resolution</label>${e(this.resolution,t=>this.resolution=t,{min:256,max:2048,step:64,placeholder:"1024 (SDXL) / 512"})}</div>
        <div><label class="field">Noise offset</label>${e(this.noiseOffset,t=>this.noiseOffset=t,{min:0,max:1,step:.01,placeholder:"None"})}</div>
      </div>
      <label class="field">Optimizer</label>
      <select @change=${t=>this.optimizer=t.target.value}>
        ${["AdamW8bit","AdamW","Prodigy","Adafactor","Lion"].map(t=>r`<option value=${t} ?selected=${t===this.optimizer}>${t}</option>`)}
      </select>
      <label class="check">
        <input type="checkbox" .checked=${this.flip} @change=${t=>this.flip=t.target.checked} />
        <span>Mirror the pictures<small>Doubles a small set; leave off for anything asymmetric — a scar, a side parting, text.</small></span>
      </label>
      <div class="note">Prodigy sets its own learning rate. Repeats are worked out from the number of pictures when left blank — some two hundred steps a pass. Noise offset helps a style with very dark or very bright pictures.</div>
    `}renderRuns(){return this.runs.length?r`
      ${this.error?r`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>`:c}
      <div class="runs">${this.runs.map(e=>this.renderRun(e))}</div>`:r`<div class="card empty">
        <span class="material-symbols-rounded">history</span>No runs yet. Set one up under <b>New LoRA</b>; it carries on with this screen closed.
        <div style="margin-top:12px;"><button class="btn primary" @click=${()=>this.tab="new"}><span class="material-symbols-rounded">add</span> New LoRA</button></div>
      </div>`}renderRun(e){var o,l,n,p;const t=ns(e),i=Fe(e),s=(o=e.samples)!=null&&o.length?[...e.samples].sort()[e.samples.length-1]:"",a=(l=e.request)!=null&&l.preset?Z(e.request.preset):null;return r`<div class="run">
      ${s?r`<img src=${u.trainSampleURL(e.id,s)} alt="Sample" />`:e.status==="done"?r`<div class="ph"><span class="material-symbols-rounded">${(a==null?void 0:a.icon)??"model_training"}</span>
              <img src=${u.loraThumbURL(e.name)} alt="" @error=${h=>h.target.remove()} /></div>`:r`<div class="ph"><span class="material-symbols-rounded">${(a==null?void 0:a.icon)??"model_training"}</span></div>`}
      <div class="body">
        <div class="run-head">
          <span class="name" title=${e.name}>${e.name}</span>
          <span class="spacer"></span>
          <span class="status ${e.status}">${e.status}</span>
        </div>
        <div class="line">${ls(e)}</div>
        ${i?r`<div class="bar ${t===null?"unknown":""}"><div style=${t===null?"":`width:${(t*100).toFixed(1)}%`}></div></div>`:c}
        <div class="meta">
          ${a?r`<span>${a.title}</span>`:c}
          ${e.trigger?r`<span>Trigger <b>${e.trigger}</b></span>`:c}
          <span>${e.images} pictures</span>
          <span>${e.baseModel}${e.family?` (${e.family==="sdxl"?"SDXL":"SD 1.5"})`:""}</span>
          <span>${new Date(e.createdAt*1e3).toLocaleString()}</span>
        </div>
        ${e.status==="done"?r`<div class="note">Installed — pick it under LoRAs in the studio${e.trigger?r`, and put <b>${e.trigger}</b> in the prompt`:""}.</div>`:c}
        ${this.openLog===e.id&&((n=e.log)!=null&&n.length)?r`<pre class="log">${e.log.join(`
`)}</pre>`:c}
        <div class="run-actions">
          ${i&&e.status!=="installing"?r`<button class="btn small danger" @click=${()=>this.cancel(e)}><span class="material-symbols-rounded">stop</span> Stop</button>`:c}
          ${e.status==="done"?r`<button class="btn small tonal" @click=${()=>this.compare(e)}><span class="material-symbols-rounded">compare</span> Compare</button>`:c}
          ${(p=e.log)!=null&&p.length?r`<button class="btn small" @click=${()=>this.openLog=this.openLog===e.id?0:e.id}>
                <span class="material-symbols-rounded">terminal</span> ${this.openLog===e.id?"Hide log":"Log"}</button>`:c}
          ${!i&&e.request?r`<button class="btn small" @click=${()=>this.again(e)}><span class="material-symbols-rounded">replay</span> Train again</button>`:c}
          ${i?c:r`<button class="btn small ghost" @click=${()=>this.forget(e)}><span class="material-symbols-rounded">delete</span> Remove</button>`}
        </div>
      </div>
    </div>`}};w.styles=[re,Ie,at,ie`
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
      .wrap { max-width: 1240px; margin: 0 auto; padding: 0 16px 80px; }
      .topbar {
        position: sticky; top: 0; z-index: 3; background: var(--oppai-bg, #141218);
        display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 0;
        border-bottom: 1px solid var(--oppai-border); margin-bottom: 18px;
      }
      .topbar h2 { margin: 0; font-size: 18px; display: inline-flex; align-items: center; gap: 8px; }
      .topbar h2 .material-symbols-rounded { color: var(--oppai-primary); }
      .trainer {
        font-size: 12px; color: var(--oppai-text-dim); display: inline-flex; align-items: center; gap: 6px;
        background: var(--oppai-surface); border: 1px solid var(--oppai-border); border-radius: 999px; padding: 4px 10px;
      }
      .trainer .dot { width: 8px; height: 8px; border-radius: 50%; background: #7fcf8a; }
      .trainer .dot.busy { background: #e8b04a; }
      .trainer .dot.off { background: var(--oppai-error, #f2b8b5); }
      .tabs { display: inline-flex; gap: 4px; margin-left: auto; }
      .tabs button {
        border: none; background: none; color: var(--oppai-text-dim); font: inherit; font-size: 14px; cursor: pointer;
        padding: 8px 14px; border-radius: 999px; display: inline-flex; align-items: center; gap: 6px;
      }
      .tabs button .material-symbols-rounded { font-size: 18px; }
      .tabs button.on { background: var(--oppai-primary-container); color: var(--oppai-on-accent, var(--oppai-text)); font-weight: 600; }
      .tabs .n {
        font-size: 11px; background: var(--oppai-primary); color: var(--oppai-on-primary, #1d1b20); border-radius: 999px;
        padding: 0 6px; min-width: 16px; text-align: center;
      }
      @media (max-width: 760px) {
        /* Title and the way out on one row, the trainer under them, the tabs last. */
        .close { order: 1; margin-left: auto; }
        .trainer { order: 2; }
        .tabs { margin-left: 0; order: 3; width: 100%; justify-content: space-between; }
        .tabs button { flex: 1; justify-content: center; padding: 8px 6px; }
      }

      .stepper { display: flex; gap: 6px; margin-bottom: 18px; }
      .stepper button {
        flex: 1; border: none; background: var(--oppai-surface); color: var(--oppai-text-dim); font: inherit; cursor: pointer;
        border-radius: 14px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; text-align: left;
        border: 1px solid var(--oppai-border); min-width: 0;
      }
      .stepper button:disabled { cursor: default; opacity: 0.55; }
      .stepper .num {
        width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; flex: none;
        background: var(--oppai-surface-2); font-size: 13px; font-weight: 700;
      }
      .stepper .num .material-symbols-rounded { font-size: 17px; }
      .stepper .t { font-size: 13px; font-weight: 600; color: var(--oppai-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .stepper .t small { display: block; font-weight: 400; font-size: 11px; color: var(--oppai-text-dim); overflow: hidden; text-overflow: ellipsis; }
      .stepper button.on { border-color: var(--oppai-primary); background: color-mix(in srgb, var(--oppai-primary) 8%, var(--oppai-surface)); }
      .stepper button.on .num, .stepper button.done .num { background: var(--oppai-primary); color: var(--oppai-on-primary, #1d1b20); }
      @media (max-width: 760px) {
        .stepper button { flex-direction: column; gap: 4px; padding: 8px 4px; text-align: center; }
        .stepper .t small { display: none; }
      }

      .presets { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
      .preset {
        border: 1px solid var(--oppai-border-strong); background: var(--oppai-bg, #141218); color: var(--oppai-text);
        border-radius: 16px; padding: 14px; text-align: left; font: inherit; cursor: pointer; display: flex; flex-direction: column; gap: 6px;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .preset:hover { border-color: var(--oppai-primary); }
      .preset.on { border-color: var(--oppai-primary); background: color-mix(in srgb, var(--oppai-primary) 10%, var(--oppai-bg, #141218)); box-shadow: 0 0 0 1px var(--oppai-primary) inset; }
      .preset .ic {
        width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center;
        background: var(--oppai-primary-container); color: var(--oppai-on-accent, var(--oppai-text));
      }
      .preset .ic .material-symbols-rounded { font-size: 22px; }
      .preset b { font-size: 14px; }
      .preset span.d { font-size: 12px; color: var(--oppai-text-dim); line-height: 1.4; }
      .preset span.e { font-size: 11px; color: var(--oppai-text-muted, var(--oppai-text-dim)); }
      .tips { margin: 10px 0 0; padding-left: 18px; font-size: 13px; color: var(--oppai-text-dim); line-height: 1.6; }

      .navbar {
        position: sticky; bottom: 0; z-index: 2; margin-top: 18px; padding: 12px 0;
        background: linear-gradient(to top, var(--oppai-bg, #141218) 70%, transparent);
        display: flex; gap: 10px; align-items: center;
      }
      .navbar .spacer { flex: 1; }
      .navbar .hint { font-size: 12px; color: var(--oppai-text-dim); }

      .two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; align-items: start; }
      @media (max-width: 900px) { .two { grid-template-columns: minmax(0, 1fr); } }
      .two > .card + .card { margin-top: 0; }
      .two + .card, .card + .two, .two + .two { margin-top: 14px; }

      .advice { display: flex; flex-direction: column; gap: 6px; margin: 12px 0 0; }
      .advice .banner { margin: 0; }
      .sets { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
      .settile {
        display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 14px; text-align: left;
        border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text); font: inherit; cursor: pointer;
      }
      .settile:hover { background: var(--oppai-surface-2); }
      .settile.on { border-color: var(--oppai-primary); background: color-mix(in srgb, var(--oppai-primary) 10%, transparent); }
      .settile .cover {
        flex: none; width: 48px; height: 48px; border-radius: 10px; overflow: hidden; display: grid; place-items: center;
        background: var(--oppai-surface-2); color: var(--oppai-text-dim);
      }
      .settile .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .settile .t { min-width: 0; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .settile .t small { display: block; font-weight: 400; font-size: 12px; color: var(--oppai-text-dim); overflow: hidden; text-overflow: ellipsis; }
      .seg.small button { font-size: 12.5px; padding: 6px 12px; }
      .sethead { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 16px 0 10px; }
      .card > .sethead:first-child { margin-top: 0; }
      .sethead h4 { margin: 0; font-size: 14px; margin-right: auto; }
      .pick .drop {
        position: absolute; top: 6px; right: 6px; width: 26px; height: 26px; border-radius: 50%; border: none; cursor: pointer;
        background: rgba(0, 0, 0, 0.6); color: #fff; display: grid; place-items: center; padding: 0;
        opacity: 0; transition: opacity 0.12s ease;
      }
      .pick:hover .drop, .pick:focus-within .drop { opacity: 1; }
      @media (hover: none) { .pick .drop { opacity: 1; } }
      .pick .drop .material-symbols-rounded { font-size: 16px; }
      .pick.cap { aspect-ratio: auto; display: flex; flex-direction: column; text-align: left; background: var(--oppai-bg, #141218); border: 1px solid var(--oppai-border); }
      .pick.cap img { aspect-ratio: 1; height: auto; }
      .pick.cap .c {
        font-family: ui-monospace, monospace; font-size: 10.5px; color: var(--oppai-text-dim); padding: 6px 8px; line-height: 1.35;
        display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word;
      }
      .pick.cap.bare .c { color: var(--oppai-error, #f2b8b5); }
      .captions-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }

      .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-top: 4px; }
      .stat { background: var(--oppai-bg, #141218); border-radius: 12px; padding: 10px 12px; }
      .stat small { display: block; font-size: 11px; color: var(--oppai-text-dim); margin-bottom: 2px; }
      .stat b { font-size: 15px; }
      .caption {
        font-family: ui-monospace, monospace; font-size: 12px; background: var(--oppai-bg, #141218);
        border-radius: 10px; padding: 8px 10px; margin-top: 8px; word-break: break-word; line-height: 1.45;
      }

      .runs { display: flex; flex-direction: column; gap: 12px; }
      .run { background: var(--oppai-surface); border: 1px solid var(--oppai-border); border-radius: 16px; padding: 14px 16px; display: flex; gap: 14px; }
      .run > img, .run > .ph { width: 112px; height: 112px; object-fit: cover; border-radius: 12px; flex: none; background: var(--oppai-surface-2); }
      .run > .ph { display: grid; place-items: center; color: var(--oppai-text-muted, var(--oppai-text-dim)); position: relative; overflow: hidden; }
      .run > .ph img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .run > .ph .material-symbols-rounded { font-size: 36px; }
      .run .body { flex: 1; min-width: 0; }
      .run-head { display: flex; align-items: center; gap: 10px; }
      .run-head .name { font-weight: 600; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .run-head .spacer { flex: 1; }
      .status { font-size: 11px; padding: 3px 10px; border-radius: 999px; background: var(--oppai-surface-2); white-space: nowrap; font-weight: 600; }
      .status.done { background: color-mix(in srgb, #7fcf8a 25%, transparent); }
      .status.failed { background: color-mix(in srgb, var(--oppai-error, #f2b8b5) 25%, transparent); }
      .status.training, .status.installing { background: color-mix(in srgb, var(--oppai-primary) 25%, transparent); }
      .line { font-size: 13px; color: var(--oppai-text-dim); margin-top: 6px; word-break: break-word; }
      .meta { font-size: 12px; color: var(--oppai-text-muted, var(--oppai-text-dim)); margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px 12px; }
      .run .bar { margin-top: 10px; }
      .run-actions { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
      pre.log {
        font-size: 11px; background: var(--oppai-bg, #141218); border-radius: 10px; padding: 8px 10px;
        max-height: 220px; overflow: auto; white-space: pre-wrap; word-break: break-word; margin: 10px 0 0;
      }
      @media (max-width: 600px) {
        .run { flex-direction: column; }
        .run > img, .run > .ph { width: 100%; height: 180px; }
      }

      .editor {
        position: fixed; inset: 0; z-index: 5; background: var(--oppai-scrim, rgba(0, 0, 0, 0.6));
        display: grid; place-items: center; padding: 16px;
      }
      .editor .panel {
        background: var(--oppai-surface); border-radius: 20px; width: min(920px, 100%); max-height: calc(100vh - 32px);
        overflow: auto; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0;
      }
      @media (max-width: 760px) { .editor .panel { grid-template-columns: minmax(0, 1fr); } }
      .editor .pic { background: #000; display: grid; place-items: center; min-height: 280px; }
      .editor .pic img { max-width: 100%; max-height: 70vh; object-fit: contain; display: block; }
      .editor .side { padding: 18px; display: flex; flex-direction: column; gap: 10px; }
      .editor .side .head { display: flex; align-items: center; gap: 6px; }
      .editor .side .head b { margin-right: auto; font-size: 14px; }
      .editor .chip .x { border: none; background: none; color: inherit; padding: 0; cursor: pointer; display: inline-flex; }
      .editor form { display: flex; gap: 8px; }
      .editor form input { flex: 1; }
    `];$([E({attribute:!1})],w.prototype,"models",2);$([E({attribute:!1})],w.prototype,"loras",2);$([E()],w.prototype,"checkpoint",2);$([d()],w.prototype,"tab",2);$([d()],w.prototype,"step",2);$([d()],w.prototype,"configured",2);$([d()],w.prototype,"trainer",2);$([d()],w.prototype,"trainerError",2);$([d()],w.prototype,"tagger",2);$([d()],w.prototype,"runs",2);$([d()],w.prototype,"loaded",2);$([d()],w.prototype,"preset",2);$([d()],w.prototype,"effort",2);$([d()],w.prototype,"name",2);$([d()],w.prototype,"trigger",2);$([d()],w.prototype,"triggerTouched",2);$([d()],w.prototype,"base",2);$([d()],w.prototype,"sets",2);$([d()],w.prototype,"setId",2);$([d()],w.prototype,"addMode",2);$([d()],w.prototype,"exclude",2);$([d()],w.prototype,"collections",2);$([d()],w.prototype,"libKind",2);$([d()],w.prototype,"libCollection",2);$([d()],w.prototype,"libTag",2);$([d()],w.prototype,"libMove",2);$([d()],w.prototype,"copying",2);$([d()],w.prototype,"copyNote",2);$([d()],w.prototype,"captions",2);$([d()],w.prototype,"leaveOut",2);$([d()],w.prototype,"leaveOutTouched",2);$([d()],w.prototype,"suggested",2);$([d()],w.prototype,"preview",2);$([d()],w.prototype,"previewing",2);$([d()],w.prototype,"tagTask",2);$([d()],w.prototype,"tagNote",2);$([d()],w.prototype,"editing",2);$([d()],w.prototype,"newTag",2);$([d()],w.prototype,"advanced",2);$([d()],w.prototype,"epochs",2);$([d()],w.prototype,"repeats",2);$([d()],w.prototype,"rank",2);$([d()],w.prototype,"alpha",2);$([d()],w.prototype,"resolution",2);$([d()],w.prototype,"learningRate",2);$([d()],w.prototype,"textEncoderLr",2);$([d()],w.prototype,"optimizer",2);$([d()],w.prototype,"noiseOffset",2);$([d()],w.prototype,"lowVram",2);$([d()],w.prototype,"lowVramTouched",2);$([d()],w.prototype,"flip",2);$([d()],w.prototype,"freeGpu",2);$([d()],w.prototype,"samples",2);$([d()],w.prototype,"starting",2);$([d()],w.prototype,"error",2);$([d()],w.prototype,"openLog",2);$([d()],w.prototype,"compareFocus",2);w=$([le("oppai-lora-train")],w);const Fs=new Set([",",`
`,"|","(",")","[","]","{","}"]);function Mt(e,t){return Fs.has(e[t])?!(t>0&&e[t-1]==="\\"&&"()[]{}".includes(e[t])):!1}function Us(e,t){t=Math.max(0,Math.min(t,e.length));const i=e.slice(0,t),s=/<lora:([^:>]*)$/i.exec(i);if(s){const g=s.index;let y=t;const k=e.indexOf(">",t),S=e.indexOf("<",t);return k>=0&&(S<0||k<S)&&(y=k+1),{start:g,end:y,query:s[1].trim(),mode:"lora"}}let a=t;for(;a>0&&!Mt(e,a-1);)a--;let o=t;for(;o<e.length&&!Mt(e,o);)o++;const l=e.slice(a,t),n=l.length-l.trimStart().length;if(a+=n,e.slice(a,t).includes(":")||/<[^>]*$/.test(e.slice(a,t)))return null;const p=e.slice(t,o).indexOf(":");for(p>=0&&(o=t+p);o>t&&/\s/.test(e[o-1]);)o--;const h=e.slice(a,t),f=/^__([^_]*(?:_[^_]+)*)_{0,2}$/.exec(h);if(h.startsWith("__")&&f){let g=o;const y=e.indexOf("__",a+2);return y>=0&&y+2<=o&&(g=y+2),{start:a,end:g,query:f[1],mode:"wildcard"}}return{start:a,end:o,query:js(h).trim(),mode:"tag"}}function It(e){return e.replace(/([()[\]{}])/g,"\\$1")}function js(e){return e.replace(/\\([()[\]{}])/g,"$1")}function Dt(e,t,i){const s=e.slice(t.end);let a="";return t.mode!=="lora"&&s.trim()===""&&(a=", "),{text:e.slice(0,t.start)+i+a+s.replace(/^\s+$/,""),caret:t.start+i.length+a.length}}function Gs(e,t){const i=e.toLowerCase();return t?i===t?0:i.startsWith(t)?1:i.split(/[\s_\-.]+/).some(s=>s.startsWith(t))?2:i.includes(t)?3:-1:2}function Ue(e,t,i,s){return e.map(a=>({t:a,s:Gs(t(a),i)})).filter(a=>a.s>=0).sort((a,o)=>a.s-o.s||t(a.t).localeCompare(t(o.t))).slice(0,s).map(a=>a.t)}function Ws(e,t,i=8){const s=e.query.toLowerCase();return e.mode==="lora"?Ue(t.loras,a=>a.alias||a.name,s,i).map(a=>({kind:"lora",label:a.alias||a.name,insert:`<lora:${a.name}:${qs(a.weight??1)}>`,detail:a.alias&&a.alias!==a.name?a.name:void 0})):e.mode==="wildcard"?Ue(t.wildcards,a=>a.name,s,i).map(a=>({kind:"wildcard",label:`__${a.name}__`,insert:`__${a.name}__`,detail:a.lines?`${a.lines} line${a.lines===1?"":"s"}`:void 0})):s.length<1?[]:Ue(t.triggers,a=>a,s,Math.min(3,i)).map(a=>({kind:"trigger",label:a,insert:a,detail:"trigger word"}))}function qs(e){return Number.isInteger(e)?String(e):String(Math.round(e*100)/100)}function Hs(e,t,i=10){const s=new Set,a=[];for(const o of[...e,...t]){const l=o.insert.toLowerCase();if(!s.has(l)&&(s.add(l),a.push(o),a.length>=i))break}return a}function Vs(e){return e?e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e4?`${Math.round(e/1e3)}k`:e>=1e3?`${(e/1e3).toFixed(1)}k`:String(e):""}function Ks(e,t,i){return t<=0?-1:e<0?i>0?0:t-1:(e+i+t)%t}var Xs=Object.defineProperty,Ys=Object.getOwnPropertyDescriptor,b=(e,t,i,s)=>{for(var a=s>1?void 0:s?Ys(t,i):t,o=e.length-1,l;o>=0;o--)(l=e[o])&&(a=(s?l(t,i,a):l(a))||a);return s&&a&&Xs(t,i,a),a};function Ot(){const e=window;return e.SpeechRecognition??e.webkitSpeechRecognition??null}const je=[{id:"models",label:"Models",icon:"deployed_code"},{id:"loras",label:"LoRAs",icon:"style"},{id:"look",label:"Look",icon:"face"},{id:"wildcards",label:"Wildcards",icon:"category"},{id:"templates",label:"Styles",icon:"palette"},{id:"settings",label:"Settings",icon:"tune"}],F=[{id:"neutral",label:"Neutral",face:"calm neutral expression, relaxed face, looking at viewer",pose:"both arms hanging naturally at her sides, relaxed hands"},{id:"happy",label:"Happy",face:"warm genuine smile, bright eyes, cheerful expression",pose:"hands loosely clasped behind her lower back, open cheerful posture"},{id:"mischievous",label:"Mischievous",face:"smirk, half-lidded eyes, teasing knowing expression",pose:"one hand resting on her hip, other arm relaxed at her side"},{id:"surprised",label:"Surprised",face:"surprised expression, wide eyes, slightly open mouth",pose:"hands open near her waist, elbows bent slightly in surprise"},{id:"thinking",label:"Thinking",face:"thoughtful expression, looking to the side",pose:"one fingertip resting at her chin, other arm folded gently across her waist"},{id:"shy",label:"Shy",face:"bashful shy expression, blushing cheeks, averted eyes, hesitant small smile",pose:"hands clasped low in front of her skirt, shoulders tucked slightly inward"},{id:"smug",label:"Smug",face:"self-satisfied smug expression, raised eyebrow, confident knowing smirk",pose:"one hand planted on her hip, other arm loose, confident stance"},{id:"sad",label:"Sad",face:"sad wistful expression, downcast eyes, slight frown, vulnerable face",pose:"arms hanging softly at her sides, shoulders slightly slumped"},{id:"annoyed",label:"Annoyed",face:"annoyed irritated expression, furrowed brows, impatient pout",pose:"arms crossed low beneath her chest, weight shifted impatiently"},{id:"sleepy",label:"Sleepy",face:"sleepy drowsy expression, heavy half-closed eyes, relaxed tired face",pose:"arms loose at her sides, languid slouched posture"},{id:"loving",label:"Loving",face:"tender loving expression, soft adoring eyes, affectionate gentle smile",pose:"hands gently clasped low over her abdomen, body leaning affectionately forward"},{id:"excited",label:"Excited",face:"excited thrilled expression, sparkling wide eyes, eager open smile",pose:"hands held eagerly near her hips, lively forward-leaning stance"}],j=[{id:"typing",label:"Typing",heat:0,face:"focused expression, eyes on a screen, faint smile",pose:"sitting at a desk, both hands on a keyboard, leaning slightly toward the monitor"},{id:"reading",label:"Reading",heat:0,face:"absorbed expression, eyes lowered to the page",pose:"curled up holding an open book, one leg tucked under her"},{id:"gaming",label:"Gaming",heat:0,face:"intent expression, eyes wide on the screen, tongue at the corner of her mouth",pose:"sitting cross-legged holding a game controller in both hands"},{id:"lounging",label:"Lounging",heat:0,face:"relaxed expression, eyes half closed, easy smile",pose:"sprawled back across a sofa, arms loose, one knee raised"},{id:"drinking",label:"Drinking",heat:0,face:"contented expression, eyes closed over the rim",pose:"holding a steaming mug in both hands near her chest"},{id:"eating",label:"Eating",heat:0,face:"cheeks slightly full, pleased expression",pose:"holding food up to her mouth mid-bite, other hand cupped beneath it"},{id:"stretching",label:"Stretching",heat:0,face:"eyes shut, mouth open in a small yawn",pose:"arms stretched overhead, back arched, rising onto her toes"},{id:"napping",label:"Napping",heat:0,face:"sleeping, eyes closed, lips parted, peaceful",pose:"curled on her side asleep, hands tucked under her cheek"},{id:"dancing",label:"Dancing",heat:0,face:"eyes closed, delighted open smile",pose:"mid-step with hips turned, one arm raised loosely, hair in motion"},{id:"tidying",label:"Tidying",heat:0,face:"mildly absorbed expression, glancing at what she is holding",pose:"reaching to shelve something, weight on one foot"},{id:"drawing",label:"Drawing",heat:0,face:"concentrating, brow faintly furrowed, tongue between her teeth",pose:"hunched over a sketchbook, pencil in hand, other arm steadying the page"},{id:"waving",label:"Waving",heat:0,face:"bright welcoming smile, eyes on the viewer",pose:"one arm raised waving at the viewer, weight on one hip"},{id:"undressing",label:"Undressing",heat:2,intimate:!0,face:"half-lidded eyes, small knowing smile, watching the viewer",pose:"peeling clothing off one shoulder, other hand at her waistband"},{id:"teasing",label:"Teasing",heat:2,intimate:!0,face:"smirking, heavy-lidded eyes locked on the viewer",pose:"posing for the viewer, back arched, hands framing her hips"},{id:"touching",label:"Touching herself",heat:2,intimate:!0,face:"flushed, lips parted, eyes on the viewer",pose:"one hand pressed between her thighs over her clothes, other hand at her chest"},{id:"rubbing",label:"Rubbing",heat:3,intimate:!0,face:"deep blush, mouth open, eyes unfocused",pose:"reclining with one hand rubbing between her spread thighs"},{id:"fingering",label:"Fingering",heat:4,intimate:!0,face:"flushed, head tipped back, brow drawn, panting",pose:"lying back with her fingers inside herself, knees fallen open"},{id:"spread",label:"Spread",heat:4,intimate:!0,face:"flushed, watching the viewer, mouth open",pose:"lying back holding herself open with both hands, legs spread wide"},{id:"vibrator",label:"Vibrator",heat:3,intimate:!0,face:"eyes squeezed shut, mouth open, deep blush",pose:"holding a vibrator against herself, thighs tensed together"},{id:"dildo",label:"Dildo",heat:4,intimate:!0,face:"flushed, half-lidded, biting her lip",pose:"using a dildo on herself, one hand braced behind her"},{id:"riding",label:"Riding",heat:4,intimate:!0,face:"flushed, head thrown back, mouth open",pose:"straddling and riding a toy, hands braced on her thighs, back arched"},{id:"grinding",label:"Grinding",heat:3,intimate:!0,face:"flushed, eyes shut, teeth in her lip",pose:"straddling a pillow, hips rolling forward, hands gripping it"},{id:"climax",label:"Climax",heat:4,intimate:!0,face:"eyes rolled up, mouth wide open, whole face flushed",pose:"body arched taut mid-orgasm, toes curled, hands fisted"},{id:"afterglow",label:"Afterglow",heat:3,intimate:!0,face:"dazed exhausted smile, heavy-lidded eyes, deep blush",pose:"collapsed limp on her back, limbs loose, chest heaving"}],H=[{label:"Calm",mood:"composed posture"},{label:"Warm",mood:"soft light blush, inviting posture, slight lean forward"},{label:"Flirty",mood:"flirty confident stance, visible blush"},{label:"Heated",mood:"heavy blush, sultry posture, parted lips, heavy-lidded eyes"},{label:"Peak",mood:"deep blush, flushed skin, breathless needy expression"}],ae=F.length*H.length,fe=j.length,qt={faces:F.length,tiers:H.length,miscIds:j.map(e=>e.id)};function Rt(e){return ti(e,qt)}function Zs(e,t,i){return ii(e,t,i,qt)}const At=[0,96,128];function Js(){const e=new Uint8Array(12);return crypto.getRandomValues(e),Array.from(e,t=>t.toString(16).padStart(2,"0")).join("")}let m=class extends ne{constructor(){super(...arguments),this.studio=!1,this.status=null,this.checkpoint="",this.vae="",this.templateId="",this.showBuiltInTemplates=!1,this.selectedLoras={},this.selectedTriggers=[],this.loraPage=0,this.outfitOn=!1,this.outfitText="",this.outfitGear={...Be},this.outfitFace=0,this.outfitMisc="",this.outfitMiscBatch=!1,this.outfitTier=0,this.outfitBackground="white",this.outfitUnderwearColor="black",this.outfitPubicHair=!1,this.outfitPubicHairColor="dark brown",this.outfitLockColors=!0,this.gearPromptOpen=null,this.outfitBatchRunning=!1,this.outfitExporting=!1,this.outfitProgress="",this.stopOutfitBatch=!1,this.loadouts=[],this.outfitLoadoutId="",this.loadoutBusy=!1,this.loadoutCoverVersion=0,this.wardrobes=[],this.outfitWardrobeId="",this.studioLoaded=!1,this.studioView="build",this.sheetTab="faces",this.sheetZoom=1,this.showSquarePrompt=!1,this.camera={...dt},this.cutout=null,this.cutoutTolerance=42,this.cutoutBusy=!1,this.cutoutError="",this.cutoutCanvas=null,this.session=null,this.cutoutTool="remove",this.cutoutFeather=ct.feather,this.cutoutSpill=ct.spill,this.cutoutZoom=1,this.cutoutContrast=!1,this.contiguous=!0,this.brushSize=24,this.showOriginal=!1,this.canUndo=!1,this.canRedo=!1,this.cutFraction=0,this.painting=!1,this.characters=[],this.selectedChars=[],this.charDraft=null,this.charBusy=!1,this.scanBusy=!1,this.poses=[],this.selectedPoses=[],this.poseDraft=null,this.poseBusy=!1,this.wildcards=[],this.wildcardDraft=null,this.wildcardBusy=!1,this.editMedia=0,this.editing=null,this.open={models:!0,settings:!0},this.speech="",this.listening=!1,this.optimizing=!1,this.prompt="",this.completions=[],this.completionIndex=-1,this.completionToken=null,this.completionField="prompt",this.completionSeq=0,this.completionTimer=0,this.createTab=typeof matchMedia=="function"&&matchMedia("(max-width: 900px)").matches?"":"models",this.pickerFilter="",this.flatSections=!1,this.negative="",this.showOptions=!1,this.width=512,this.height=768,this.steps=25,this.cfg=7,this.cfgRescale=0,this.clipSkip=0,this.seamlessX=!1,this.seamlessY=!1,this.vaePrecision="fp32",this.cpuNoise=!0,this.board="none",this.scheduler="",this.count=1,this.seed=-1,this.detailerEnabled=!1,this.detailerModel="face_yolov8n.pt",this.detailerPrompt="",this.detailerNegative="",this.detailerConfidence=.3,this.detailerDenoise=.4,this.detailerMaskBlur=4,this.generating=!1,this.jobId="",this.progress=null,this.progressTimer=0,this.progressSeen=0,this.shots=[],this.activeNodeId=null,this.draggingNode=null,this.restoredNotice=!1,this.infoFor=null,this.draftRestored=!1,this.pendingScroll=0,this.error="",this.toast="",this.thumbVersion=0,this.failedThumbs=new Set,this.expandedShot=null,this.metaDraft=null,this.metaBusy=!1,this.metaTriggerText="",this.civitaiOpen=!1,this.trainOpen=!1,this.recognition=null,this.startFresh=()=>{Te(),this.prompt="",this.negative="",this.selectedLoras={},this.selectedTriggers=[],this.selectedChars=[],this.outfitOn=!1,this.outfitText="",this.outfitGear={...Be},this.outfitFace=0,this.outfitTier=0,this.outfitBackground="white",this.outfitUnderwearColor="black",this.outfitPubicHair=!1,this.outfitPubicHairColor="dark brown",this.outfitLockColors=!0,this.outfitLoadoutId="",this.outfitWardrobeId="",this.outfitProgress="",this.shots=[],this.activeNodeId=null,this.seed=-1,this.restoredNotice=!1}}connectedCallback(){super.connectedCallback(),this.restoreDraft(),this.loadStatus(),this.loadCharacters(),this.loadPoses(),this.loadWildcards(),this.studio&&this.enterStudio()}enterStudio(){this.outfitOn=!0,this.open={...this.open,outfit:!0,loadouts:!0,models:!1,settings:!1},this.loadStudio()}disconnectedCallback(){super.disconnectedCallback(),this.stopOutfitBatch=!0,this.stopListening(),this.flushDraft()}get scrollHost(){let e=this;for(;e;){if(e instanceof HTMLElement&&e!==this){const i=getComputedStyle(e);if(/(auto|scroll|overlay)/.test(i.overflowY)&&e.scrollHeight>e.clientHeight+1)return e}if(e=e.parentNode??(e instanceof ShadowRoot?e.host:null),e===document.documentElement)break}return null}updated(e){var t;e.has("editMedia")&&this.editMedia>0&&((t=this.editing)==null?void 0:t.id)!==this.editMedia&&this.loadFromMedia(this.editMedia),this.pendingScroll&&this.scrollHost&&(this.scrollHost.scrollTop=this.pendingScroll,this.pendingScroll=0);for(const i of e.keys())if(m.DRAFT_FIELDS.has(String(i))){this.persistDraft();break}}persistDraft(){this.draftTimer!==void 0&&clearTimeout(this.draftTimer),this.draftTimer=window.setTimeout(()=>{this.draftTimer=void 0,this.flushDraft()},600)}flushDraft(){var e;this.draftTimer!==void 0&&(clearTimeout(this.draftTimer),this.draftTimer=void 0),this.draftRestored&&ni({prompt:this.prompt,negative:this.negative,checkpoint:this.checkpoint,vae:this.vae,templateId:this.templateId,scheduler:this.scheduler,width:this.width,height:this.height,steps:this.steps,cfg:this.cfg,cfgRescale:this.cfgRescale,clipSkip:this.clipSkip,seamlessX:this.seamlessX,seamlessY:this.seamlessY,vaePrecision:this.vaePrecision,cpuNoise:this.cpuNoise,count:this.count,seed:this.seed,board:this.board,selectedLoras:this.selectedLoras,selectedTriggers:this.selectedTriggers,selectedChars:this.selectedChars,selectedPoses:this.selectedPoses,outfitOn:this.outfitOn,outfitText:this.outfitText,outfitGear:this.outfitGear,outfitFace:this.outfitFace,outfitMisc:this.outfitMisc,outfitMiscBatch:this.outfitMiscBatch,outfitTier:this.outfitTier,outfitBackground:this.outfitBackground,outfitUnderwearColor:this.outfitUnderwearColor,outfitPubicHair:this.outfitPubicHair,outfitPubicHairColor:this.outfitPubicHairColor,outfitLockColors:this.outfitLockColors,outfitLoadoutId:this.outfitLoadoutId,outfitWardrobeId:this.outfitWardrobeId,camera:this.camera,detailerEnabled:this.detailerEnabled,detailerModel:this.detailerModel,detailerPrompt:this.detailerPrompt,detailerNegative:this.detailerNegative,detailerConfidence:this.detailerConfidence,detailerDenoise:this.detailerDenoise,detailerMaskBlur:this.detailerMaskBlur,open:this.open,showOptions:this.showOptions,shots:this.shots.map(t=>({id:t.id,seed:t.seed,saved:t.saved,info:t.info,outfitFilename:t.outfitFilename,outfitSlot:t.outfitSlot,outfitConfig:t.outfitConfig,cutoutReviewed:t.cutoutReviewed,previewVersion:t.previewVersion,workspaceX:t.workspaceX,workspaceY:t.workspaceY})),scrollTop:((e=this.scrollHost)==null?void 0:e.scrollTop)??0})}restoreDraft(){const e=li();this.draftRestored=!0,e&&(e.prompt!==void 0&&(this.prompt=e.prompt),e.negative!==void 0&&(this.negative=e.negative),e.checkpoint!==void 0&&(this.checkpoint=e.checkpoint),e.vae!==void 0&&(this.vae=e.vae),e.templateId!==void 0&&(this.templateId=e.templateId),e.scheduler!==void 0&&(this.scheduler=e.scheduler),e.width!==void 0&&(this.width=e.width),e.height!==void 0&&(this.height=e.height),e.steps!==void 0&&(this.steps=e.steps),e.cfg!==void 0&&(this.cfg=e.cfg),e.cfgRescale!==void 0&&(this.cfgRescale=e.cfgRescale),e.clipSkip!==void 0&&(this.clipSkip=e.clipSkip),e.seamlessX!==void 0&&(this.seamlessX=e.seamlessX),e.seamlessY!==void 0&&(this.seamlessY=e.seamlessY),e.vaePrecision!==void 0&&(this.vaePrecision=e.vaePrecision),e.cpuNoise!==void 0&&(this.cpuNoise=e.cpuNoise),e.count!==void 0&&(this.count=e.count),e.seed!==void 0&&(this.seed=e.seed),e.board!==void 0&&(this.board=e.board),e.selectedLoras&&(this.selectedLoras=e.selectedLoras),e.selectedTriggers&&(this.selectedTriggers=e.selectedTriggers),e.selectedChars&&(this.selectedChars=e.selectedChars),e.selectedPoses&&(this.selectedPoses=e.selectedPoses),e.outfitOn!==void 0&&(this.outfitOn=e.outfitOn),e.outfitText!==void 0&&(this.outfitText=e.outfitText),e.outfitGear!==void 0&&(this.outfitGear=vt(e.outfitGear)),e.outfitFace!==void 0&&(this.outfitFace=Math.max(0,Math.min(F.length-1,Math.round(e.outfitFace)))),e.outfitMisc!==void 0&&(this.outfitMisc=j.some(t=>t.id===e.outfitMisc)?e.outfitMisc:""),e.outfitMiscBatch!==void 0&&(this.outfitMiscBatch=e.outfitMiscBatch),e.outfitTier!==void 0&&(this.outfitTier=Math.max(0,Math.min(H.length-1,Math.round(e.outfitTier)))),e.outfitBackground!==void 0&&(this.outfitBackground=e.outfitBackground),e.outfitUnderwearColor!==void 0&&(this.outfitUnderwearColor=e.outfitUnderwearColor),e.outfitPubicHair!==void 0&&(this.outfitPubicHair=e.outfitPubicHair),e.outfitPubicHairColor!==void 0&&(this.outfitPubicHairColor=e.outfitPubicHairColor),e.outfitLockColors!==void 0&&(this.outfitLockColors=e.outfitLockColors),e.outfitLoadoutId!==void 0&&(this.outfitLoadoutId=e.outfitLoadoutId),e.outfitWardrobeId!==void 0&&(this.outfitWardrobeId=e.outfitWardrobeId),e.camera&&(this.camera={...dt,...e.camera}),e.detailerEnabled!==void 0&&(this.detailerEnabled=e.detailerEnabled),e.detailerModel!==void 0&&(this.detailerModel=e.detailerModel),e.detailerPrompt!==void 0&&(this.detailerPrompt=e.detailerPrompt),e.detailerNegative!==void 0&&(this.detailerNegative=e.detailerNegative),e.detailerConfidence!==void 0&&(this.detailerConfidence=e.detailerConfidence),e.detailerDenoise!==void 0&&(this.detailerDenoise=e.detailerDenoise),e.detailerMaskBlur!==void 0&&(this.detailerMaskBlur=e.detailerMaskBlur),e.open&&(this.open=e.open),e.showOptions!==void 0&&(this.showOptions=e.showOptions),e.shots&&(this.shots=e.shots.map(t=>({...t}))),e.scrollTop&&(this.pendingScroll=e.scrollTop),this.restoredNotice=!0)}async loadStatus(){this.status=null,this.error="";try{const e=await u.imageGenStatus();this.status=e,!this.checkpoint&&e.models&&e.models.length&&this.pickModel(e.models[0])}catch(e){this.status={enabled:!0,reachable:!1,error:e.message}}}async loadCharacters(){try{const e=await u.characters();this.characters=e.characters;const t=new Set(e.characters.map(i=>i.id));this.selectedChars=this.selectedChars.filter(i=>t.has(i))}catch{}}async loadPoses(){try{const e=await u.poses();this.poses=e.poses;const t=new Set(e.poses.map(i=>i.id));this.selectedPoses=this.selectedPoses.filter(i=>t.has(i))}catch{}}async loadWildcards(){try{this.wildcards=(await u.wildcards()).wildcards}catch{}}async loadFromMedia(e){try{const t=await u.mediaGeneration(e),i=t.info;if(i&&typeof i.prompt=="string"&&Array.isArray(i.loras))this.reuseGenInfo({...i,loras:i.loras.filter(s=>s&&typeof s.name=="string")});else{const s={},a=(t.prompt||"").replace(/<lora:([^:>]+):([-\d.]+)>/g,(o,l,n)=>(s[l]=Number(n)||1,"")).replace(/\s{2,}/g," ").trim();this.prompt=a||t.title,this.selectedLoras=s,this.templateId="",this.selectedChars=[],this.selectedPoses=[],this.outfitOn=!1,this.showOptions=!0}this.editing={id:e,title:t.title,tags:t.tags??[]},this.showToast(`Editing “${t.title}” — generate, then save beside it or in its place.`)}catch(t){this.showToast(`Couldn't open that picture here: ${t.message}`)}}get editingLibby(){var e;return!!((e=this.editing)!=null&&e.tags.some(t=>t==="character:libby"||t==="libby"))}pickModel(e){var s,a;const t=(a=(((s=this.status)==null?void 0:s.models)??[]).find(o=>o.title===this.checkpoint))==null?void 0:a.defaults;this.checkpoint=e.title;const i=e.defaults;(t!=null&&t.positive||i!=null&&i.positive)&&(this.prompt=ft(this.prompt,t==null?void 0:t.positive,i==null?void 0:i.positive,"start")),(t!=null&&t.negative||i!=null&&i.negative)&&(this.negative=ft(this.negative,t==null?void 0:t.negative,i==null?void 0:i.negative,"end")),i&&(i.clipSkip&&(this.clipSkip=i.clipSkip),i.steps&&(this.steps=i.steps),i.cfgScale&&(this.cfg=i.cfgScale),i.cfgRescale!==void 0&&(this.cfgRescale=i.cfgRescale),i.scheduler&&(this.scheduler=i.scheduler),i.width&&(this.width=i.width),i.height&&(this.height=i.height),i.vae&&(this.vae=i.vae),this.vaePrecision="fp32")}get speechSupported(){return Ot()!=null}toggleListening(){if(this.listening){this.stopListening();return}const e=Ot();if(!e)return;const t=new e;t.lang=navigator.language||"en-US",t.continuous=!1,t.interimResults=!0,t.onresult=i=>{let s="";for(let a=0;a<i.results.length;a++)s+=i.results[a][0].transcript;this.speech=s},t.onerror=i=>{this.error=i.error==="not-allowed"?"Microphone permission was denied.":`Speech error: ${i.error}`,this.stopListening()},t.onend=()=>{this.listening=!1,this.speech.trim()&&this.optimize(this.speech)},this.recognition=t,this.listening=!0,this.error="";try{t.start()}catch{this.listening=!1}}stopListening(){if(this.listening=!1,this.recognition){try{this.recognition.stop()}catch{}this.recognition=null}}async optimize(e){this.optimizing=!0;try{const{prompt:t,negativePrompt:i}=await u.optimizePrompt(e);this.prompt=t,this.negative||(this.negative=i)}catch(t){this.error=t.message}finally{this.optimizing=!1}}equippedOutfitTerms(){var t;const e=((t=this.status)==null?void 0:t.backend)??"";return Y.flatMap(i=>{const s=bt(i,this.pieceFor(i.key),e,this.outfitLockColors);return s?[s]:[]})}pieceFor(e){const t=this.outfitGear[e];return t.off?{color:"",item:""}:t.color.trim()||e!=="bra"&&e!=="panties"?t:{color:this.outfitUnderwearColor.trim()||"black",item:t.item}}outfitColorNegatives(){if(!this.outfitLockColors)return[];const e=new Set;for(const t of Y)for(const i of Di(t,this.pieceFor(t.key)))e.add(i);return[...e]}outfitExposurePrompt(e){const t=this.pieceFor("bra").color,i=this.pieceFor("panties").color,s=J(this.outfitGear.top),a=J(this.outfitGear.bottoms),o=J(this.outfitGear.bra),l=J(this.outfitGear.panties),n=[];return!s&&!a?n.push("no outer top or bottoms equipped"):e.clothes==="on"?n.push("equipped outer clothes fully on and properly worn"):e.clothes==="displaced"?n.push("equipped outer clothes loosened and partly displaced, clothing slipping or pulled aside"):n.push("equipped outer clothes removed or mostly off her body"),o?e.bra==="hidden"&&s&&e.clothes==="on"?n.push(`${t} bra completely covered, bra not showing`):e.bra==="off"?n.push(s&&e.clothes==="on"?"bra removed but breasts covered by the top":"bra removed, bare breasts and nipples visible"):n.push(`${t} bra clearly showing, top shifted enough to reveal it`):n.push(s&&e.clothes==="on"?"no bra equipped, breasts covered by the top":"no bra equipped, bare breasts and nipples visible"),l?e.panties==="hidden"&&a&&e.clothes==="on"?n.push(`${i} panties completely covered, panties not showing`):e.panties==="off"?n.push(a&&e.clothes==="on"?"panties removed but vulva covered by the bottoms":"panties removed, vulva visible"):n.push(`${i} panties clearly showing, bottoms shifted enough to reveal them`):n.push(a&&e.clothes==="on"?"no panties equipped, vulva covered by the bottoms":"no panties equipped, vulva visible"),n.join(", ")}outfitFragment(){if(!this.outfitOn)return{prompt:"",negative:""};const e=F[this.outfitFace],t=j.find(h=>h.id===this.outfitMisc),i=t?t.heat:this.outfitTier,s=H[i],a=Oi(i),o=this.outfitBackground==="black"?"perfectly solid pure black studio background, seamless black backdrop, background evenly lit with no texture":"perfectly solid pure white studio background, seamless white backdrop, background evenly lit with no texture",l=J(this.outfitGear.bottoms)&&a.clothes==="on",n=i===H.length-1?this.outfitPubicHair?l?`${this.outfitPubicHairColor.trim()||"dark brown"} pubic hair present beneath the bottoms`:`${this.outfitPubicHairColor.trim()||"dark brown"} pubic hair visible`:"clean-shaven pubic area, no pubic hair":"";return{prompt:["solo, one person, single subject",mi(this.camera.shot),t?t.face:e.face,t?t.pose:e.pose,s.mood,...this.equippedOutfitTerms(),this.outfitExposurePrompt(a),n,this.outfitText.trim(),o].filter(Boolean).join(", "),negative:["multiple people, two people, group, crowd, 2girls, 2boys, extra person, duplicate person",t?"":"arms raised, hands above head, arms behind head, hands in hair, both hands near face","detailed background, scenery, gradient background, patterned background, background shadows",this.outfitBackground==="black"?"white background":"black background",this.outfitPubicHair?"":"pubic hair",...this.outfitColorNegatives(),this.outfitLockColors?"recolored clothing, wrong clothing color, color bleed":""].filter(Boolean).join(", ")}}applyCameraFraming(){const{width:e,height:t}=xi(this.camera,yi(this.width,this.height));this.width=e,this.height=t}editCamera(e){this.camera={...this.camera,...e},e.framing&&this.applyCameraFraming()}nextOutfitPose(){if(this.outfitMisc){const t=j.findIndex(i=>i.id===this.outfitMisc)+1;this.outfitMisc=j[t%j.length].id;return}const e=this.outfitFace+1;if(e<F.length){this.outfitFace=e;return}this.outfitFace=0,this.outfitTier=(this.outfitTier+1)%H.length}assemblePrompts(){var l,n,p,h;const e=this.outfitFragment(),t=[this.prompt.trim(),...this.selectedTriggers,e.prompt],i=[this.negative.trim(),e.negative];for(const f of this.selectedChars){const g=this.characters.find(y=>y.id===f);g&&(g.prompt.trim()&&t.push(g.prompt.trim()),(l=g.negativePrompt)!=null&&l.trim()&&i.push(g.negativePrompt.trim()))}if(!this.outfitOn)for(const f of this.selectedPoses){const g=this.poses.find(y=>y.id===f);g&&(g.prompt.trim()&&t.push(g.prompt.trim()),(n=g.negativePrompt)!=null&&n.trim()&&i.push(g.negativePrompt.trim()))}i.push(zi(i.join(", "),(((p=this.status)==null?void 0:p.loras)??[]).filter(f=>f.name in this.selectedLoras).map(f=>f.negative)));let s=t.filter(Boolean).join(", "),a=i.filter(Boolean).join(", ");const o=(((h=this.status)==null?void 0:h.templates)??[]).find(f=>f.id===this.templateId);return o&&(o.prompt.includes("{prompt}")?s=o.prompt.replaceAll("{prompt}",s):o.prompt.trim()&&(s=`${s}, ${o.prompt.trim()}`),o.negativePrompt.includes("{prompt}")?a=o.negativePrompt.replaceAll("{prompt}",a):o.negativePrompt.trim()&&(a=a?`${a}, ${o.negativePrompt.trim()}`:o.negativePrompt.trim())),{prompt:s,negative:a}}outfitSlot(e=this.outfitTier,t=this.outfitFace,i=this.outfitMisc){const s=j.find(p=>p.id===i),a=s??F[t],o=s?0:e,l=s?{label:"Misc"}:H[e];return{slot:{emotion:a.id,emotionLabel:a.label,tier:o,tierLabel:l.label,index:Zs(o,t,s?s.id:"")},filename:Si(this.outfitText,l.label,a.id)}}shotAt(e){const t=W(e);return this.shots.find(i=>i.outfitSlot&&W(i.outfitSlot)===t)}staleShots(){return this.currentOutfitShots().filter(e=>!this.shotMatchesCurrentOutfit(e))}currentOutfitShots(){const e=new Map;for(const i of this.shots)i.outfitSlot&&e.set(W(i.outfitSlot),i);const t=[];for(let i=0;i<ae+fe;i++){const{tier:s,face:a,misc:o}=Rt(i),l=e.get(W(this.outfitSlot(s,a,o).slot));l&&t.push(l)}return t}outfitConfigKey(){const e=this.outfitPubicHair;return JSON.stringify({v:2,background:this.outfitBackground,underwear:this.outfitUnderwearColor.trim().toLowerCase()||"black",pubicHair:e,pubicHairColor:e?this.outfitPubicHairColor.trim().toLowerCase()||"dark brown":"",lockColors:this.outfitLockColors,gear:Ai(this.outfitGear)})}shotMatchesCurrentOutfit(e){return e.outfitConfig?e.outfitConfig===this.outfitConfigKey():this.outfitBackground==="white"&&(this.outfitUnderwearColor.trim().toLowerCase()||"black")==="black"&&!this.outfitPubicHair&&Y.every(({key:t})=>this.outfitGear[t].item.trim()===Be[t].item)}previewURL(e){if(e.wipOutfitId&&e.outfitSlot)return u.libbyOutfitWipImageURL(e.wipOutfitId,e.outfitSlot.emotion,e.outfitSlot.tier,e.previewVersion);const t=u.genPreviewURL(e.id);return e.previewVersion?`${t}?v=${e.previewVersion}`:t}async ensureWardrobe(){var i;if(this.outfitWardrobeId)return this.outfitWardrobeId;const e=this.outfitText.trim()||"Work in progress",t=await u.saveLibbyOutfit({name:e});return this.outfitWardrobeId=t.id,this.wardrobes=(await u.libbyOutfits()).outfits,(i=this.renderRoot.querySelector("oppai-outfit-wardrobe"))==null||i.refresh(),this.persistDraft(),this.showToast(`Keeping this outfit in a new wardrobe, “${t.name}”.`),t.id}async storeOutfitWip(e,t,i,s=!1){if(!e.outfitSlot)return"";try{const a=await fetch(t,{credentials:"same-origin"});if(!a.ok)throw new Error(`preview returned ${a.status}`);const o=await Ce(await a.blob());return await u.putLibbyOutfitWip(i,e.outfitSlot.emotion,e.outfitSlot.tier,{imageData:o,filename:e.outfitFilename,seed:e.seed,reviewed:s,config:e.outfitConfig,info:e.info,clothing:[...this.equippedOutfitTerms(),this.outfitText.trim()].filter(Boolean).join(", ")}),i}catch(a){return this.showToast(`Couldn't keep this square: ${a.message}`),""}}async loadWipBoard(e){if(!e)return;let t;try{t=(await u.libbyOutfitWip(e)).squares}catch{return}const i=t.map(a=>{const o=F.findIndex(h=>h.id===a.emotion),l=j.some(h=>h.id===a.emotion)?a.emotion:"",n=l?0:Math.max(0,Math.min(H.length-1,a.level)),p=this.outfitSlot(n,Math.max(0,o),l);return{id:`wip-${e}-${a.emotion}-${a.level}`,seed:a.seed??-1,saved:!1,info:a.info,outfitFilename:a.filename||p.filename,outfitSlot:p.slot,outfitConfig:a.config,cutoutReviewed:a.reviewed,previewVersion:a.updatedAt,wipOutfitId:e}}),s=new Set(i.map(a=>`${a.outfitSlot.emotion}:${a.outfitSlot.tier}`));this.shots=[...this.shots.filter(a=>a.outfitSlot?a.wipOutfitId&&a.wipOutfitId!==e?!1:!s.has(`${a.outfitSlot.emotion}:${a.outfitSlot.tier}`):!0),...i],this.persistDraft()}defaultNodePosition(e){return{workspaceX:18+e%4*282,workspaceY:18+Math.floor(e/4)*430}}selectOutfitSlot(e){const{tier:t,face:i,misc:s}=Rt(e);this.outfitMisc=s,s?this.sheetTab="misc":(this.outfitTier=t,this.outfitFace=i,this.sheetTab="faces")}renderGenerating(e){const t=this.progress,i=(t==null?void 0:t.total)??0,s=t?Math.max(0,Math.min(1,t.percent)):0,a=t!=null&&t.cancelled?"Stopping…":i>0?`Step ${t.step} of ${i}`:e?"Invoking generation…":"Generating image…";return r`<div class="generating-overlay">
      <div class="generating-card ${t!=null&&t.image?"with-preview":""}">
        ${t!=null&&t.image?r`<img class="progress-preview" src=${t.image} alt="The picture so far" />`:c}
        <div class="progress-row">
          <md-circular-progress indeterminate style="--md-circular-progress-size:22px;"></md-circular-progress>
          <span class="progress-label">${a}</span>
          <button class="progress-cancel" type="button" ?disabled=${t==null?void 0:t.cancelled} title="Stop this generation" @click=${()=>void this.cancelGeneration()}>
            <span class="material-symbols-rounded" style="font-size:18px;">close</span>Cancel
          </button>
        </div>
        <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(s*100)}>
          <span style=${`width:${Math.round(s*100)}%`}></span>
        </div>
      </div>
    </div>`}async generateOne(e){var k,S;const{prompt:t,negative:i}=this.assemblePrompts(),s=this.outfitText.trim(),a=this.outfitOn?this.outfitSlot():void 0,o=a?this.outfitConfigKey():void 0,l=a?this.shotAt(a.slot):void 0,n=l?this.nodePosition(l,this.shots.indexOf(l)):void 0,p=performance.now(),h={prompt:t,negativePrompt:i||void 0,checkpoint:this.checkpoint||void 0,vae:this.vae||void 0,sampler:this.scheduler||void 0,steps:this.steps,width:this.width,height:this.height,cfgScale:this.cfg,cfgRescale:this.cfgRescale,clipSkip:this.clipSkip,seamlessX:this.seamlessX,seamlessY:this.seamlessY,vaePrecision:this.vaePrecision,cpuNoise:this.cpuNoise,board:this.board,count:this.outfitOn?1:this.count,seed:this.seed,loras:Object.entries(this.selectedLoras).map(([M,z])=>({name:M,weight:z})),detailer:(k=this.status)!=null&&k.detailerAvailable&&this.detailerEnabled?{enabled:!0,model:this.detailerModel,prompt:this.detailerPrompt||void 0,negativePrompt:this.detailerNegative||void 0,confidence:this.detailerConfidence,denoise:this.detailerDenoise,maskBlur:this.detailerMaskBlur}:void 0};h.jobId=Js(),this.startProgressWatch(h.jobId,h.count??1);let f;try{f=await u.generate(h)}finally{this.stopProgressWatch()}f.rolled&&typeof f.positive=="string"&&(h.prompt=f.positive,h.negativePrompt=f.negative||void 0);const g=(performance.now()-p)/1e3,y=f.images.map((M,z)=>{var L,D,P,de,ye,V;return{...M,saved:!1,outfitFilename:a==null?void 0:a.filename,outfitSlot:a==null?void 0:a.slot,outfitConfig:o,...n&&a?{workspaceX:n.x,workspaceY:n.y}:this.defaultNodePosition((e?this.shots.length:0)+z),info:si(h,{seed:M.seed,backend:((L=this.status)==null?void 0:L.backend)??"unknown",modelHash:(de=(P=(D=this.status)==null?void 0:D.models)==null?void 0:P.find(K=>K.title===h.checkpoint))==null?void 0:de.hash,loraHashes:Object.fromEntries((((ye=this.status)==null?void 0:ye.loras)??[]).filter(K=>K.hash).map(K=>[K.name,K.hash])),triggers:this.selectedTriggers,characters:this.selectedChars.map(K=>{var pe;return((pe=this.characters.find(Oe=>Oe.id===K))==null?void 0:pe.name)??""}).filter(Boolean),poses:this.outfitOn?[]:this.selectedPoses.map(K=>{var pe;return((pe=this.poses.find(Oe=>Oe.id===K))==null?void 0:pe.name)??""}).filter(Boolean),outfit:this.outfitOn?s:"",controlImage:(V=this.cutout)==null?void 0:V.name,seconds:g})}});if(e&&a){if(y.length)try{const z=await this.ensureWardrobe(),L=await this.storeOutfitWip(y[0],this.previewURL(y[0]),z);L&&(y[0].wipOutfitId=L,y[0].previewVersion=Date.now())}catch(z){this.showToast(`Couldn't keep this square: ${z.message}`)}l&&y.length&&!l.id.startsWith("wip-")&&await u.deleteGenPreview(l.id);const M=W(a.slot);this.shots=[...this.shots.filter(z=>!z.outfitSlot||W(z.outfitSlot)!==M),...y]}else this.shots=y;return(S=this.galleryPanel)==null||S.refresh(),y.length}startProgressWatch(e,t){this.stopProgressWatch(),this.jobId=e,this.progress={index:0,step:0,total:0,percent:0,seq:0,done:!1,cancelled:!1},this.progressSeen=0;const i=async()=>{var s,a;if(this.jobId===e){try{const o=await u.genProgress(e,this.progressSeen);if(this.jobId!==e)return;const l=o.image??(o.seq===this.progressSeen?(s=this.progress)==null?void 0:s.image:void 0);if(this.progress={...o,image:l,total:o.total||((a=this.progress)==null?void 0:a.total)||0},this.progressSeen=o.seq,o.done)return}catch{}this.progressTimer=window.setTimeout(()=>void i(),1e3)}};this.progressTimer=window.setTimeout(()=>void i(),600)}stopProgressWatch(){window.clearTimeout(this.progressTimer),this.progressTimer=0,this.jobId="",this.progress=null}async cancelGeneration(){const e=this.jobId;if(e){this.progress&&(this.progress={...this.progress,cancelled:!0});try{await u.cancelGenerate(e)}catch(t){this.showToast(`Couldn't cancel: ${t.message}`)}}}async generate(){if(!(this.generating||!this.assemblePrompts().prompt.trim())){this.generating=!0,this.error="";try{await this.generateOne(this.outfitOn)}catch(e){/cancelled/i.test(e.message)?this.showToast("Generation cancelled."):this.error=e.message}finally{this.generating=!1,this.persistDraft()}}}async generateOutfitAndNext(){if(!(this.generating||!this.outfitOn||!this.assemblePrompts().prompt.trim())){this.generating=!0,this.error="";try{await this.generateOne(!0)&&this.nextOutfitPose()}catch(e){this.error=e.message}finally{this.generating=!1,this.persistDraft()}}}async generateAllOutfit(){if(this.generating||!this.outfitOn||!this.assemblePrompts().prompt.trim())return;this.generating=!0,this.outfitBatchRunning=!0,this.stopOutfitBatch=!1,this.error="";const e=ae+(this.outfitMiscBatch?fe:0);try{for(let i=0;i<e&&!this.stopOutfitBatch;i++){this.selectOutfitSlot(i);const{slot:s}=this.outfitSlot();this.shotAt(s)||(this.outfitProgress=`Generating ${i+1} of ${e} · ${s.tierLabel} · ${s.emotionLabel}`,await this.generateOne(!0),this.persistDraft())}const t=this.currentOutfitShots().length;this.outfitProgress=this.stopOutfitBatch?`Stopped with ${t} of ${e} ready.`:`Outfit complete · ${t} of ${e} ready.`}catch(t){this.error=t.message,this.outfitProgress=`Paused with ${this.currentOutfitShots().length} of ${e} ready. Run missing images to resume.`}finally{this.generating=!1,this.outfitBatchRunning=!1,this.persistDraft()}}async regenerateStale(){if(this.generating||!this.outfitOn||!this.assemblePrompts().prompt.trim())return;const e=this.staleShots();if(e.length){this.generating=!0,this.outfitBatchRunning=!0,this.stopOutfitBatch=!1,this.error="";try{for(let i=0;i<e.length&&!this.stopOutfitBatch;i++){const s=e[i].outfitSlot;this.selectOutfitSlot(s.index),this.outfitProgress=`Redoing ${i+1} of ${e.length} · ${s.tierLabel} · ${s.emotionLabel}`,await this.generateOne(!0),this.persistDraft()}const t=this.staleShots().length;this.outfitProgress=t?`Stopped with ${t} square${t===1?"":"s"} still on the old recipe.`:"Every square is on the current recipe."}catch(t){this.error=t.message}finally{this.generating=!1,this.outfitBatchRunning=!1,this.persistDraft()}}}cancelOutfitBatch(){this.stopOutfitBatch=!0,this.outfitProgress="Stopping after the current image…"}async copyGenInfo(e,t){if(!e.info){this.showToast("No generation data was recorded for this image.");return}const i=t==="json"?be(e.info):oe(e.info);await _t(i)?this.showToast(t==="json"?"Full data copied as JSON":"Generation data copied"):this.showToast("Couldn't reach the clipboard — this needs HTTPS or a permission.")}reuseGenInfo(e){var i;const t=oi(e);this.prompt=t.prompt,this.negative=t.negativePrompt??"",this.checkpoint=t.checkpoint??"",this.vae=t.vae??"",this.scheduler=t.sampler??"",this.seed=t.seed??-1,this.steps=t.steps??25,this.cfg=t.cfgScale??7,this.cfgRescale=t.cfgRescale??0,this.clipSkip=t.clipSkip??0,this.width=t.width??512,this.height=t.height??768,this.seamlessX=!!t.seamlessX,this.seamlessY=!!t.seamlessY,this.vaePrecision=t.vaePrecision??"fp32",this.cpuNoise=t.cpuNoise!==!1,this.count=1,this.selectedLoras=Object.fromEntries((t.loras??[]).map(s=>[s.name,s.weight])),this.board=t.board??"none",this.detailerEnabled=!!((i=t.detailer)!=null&&i.enabled),t.detailer&&(this.detailerModel=t.detailer.model??"face_yolov8n.pt",this.detailerPrompt=t.detailer.prompt??"",this.detailerNegative=t.detailer.negativePrompt??"",this.detailerConfidence=t.detailer.confidence??.3,this.detailerDenoise=t.detailer.denoise??.4,this.detailerMaskBlur=t.detailer.maskBlur??4),this.templateId="",this.selectedTriggers=[],this.selectedChars=[],this.selectedPoses=[],this.outfitOn=!1,this.showOptions=!0,this.showToast("Generation parameters loaded")}async exportShot(e){if(!e.info){this.showToast("No generation data was recorded for this image.");return}try{await Nt(this.previewURL(e),e.outfitFilename??`oppailib-seed-${e.seed}.png`,oe(e.info),be(e.info)),this.showToast("PNG exported with Civitai metadata")}catch(t){this.showToast(t.message)}}async exportOutfitZip(){const e=this.currentOutfitShots();if(!e.length||this.outfitExporting)return;const t=e.filter(a=>!a.cutoutReviewed);if(t.length){this.error=`Review the automatic background cutout for all ${t.length} remaining outfit image${t.length===1?"":"s"} before exporting.`;return}this.outfitExporting=!0;const i=[],s=[];try{for(let p=0;p<e.length;p++){const h=e[p];this.outfitProgress=`Preparing ${p+1} of ${e.length} for the outfit ZIP…`;try{const f=await fetch(this.previewURL(h),{credentials:"same-origin"});if(!f.ok)throw new Error(`preview returned ${f.status}`);let g=new Uint8Array(await f.arrayBuffer());h.info&&(g=He(g,oe(h.info),be(h.info))),i.push({name:h.outfitFilename,data:g})}catch{s.push(h.outfitFilename??`seed-${h.seed}.png`)}}if(s.length){const p=new Set(s);this.shots=this.shots.filter(h=>!h.outfitFilename||!p.has(h.outfitFilename)),this.persistDraft()}if(!i.length)throw new Error("The generated previews expired. Generate the missing outfit images again.");const a={outfit:this.outfitText.trim(),loadout:this.outfitGear,expected:F.length*H.length,exported:i.length,generationBackground:this.outfitBackground,colorsLocked:this.outfitLockColors,underwearColor:this.outfitUnderwearColor.trim()||"black",pubicHair:this.outfitPubicHair,pubicHairColor:this.outfitPubicHair?this.outfitPubicHairColor.trim()||"dark brown":void 0,backgroundRemoved:!0,cutoutReviewed:!0,images:e.filter(p=>!s.includes(p.outfitFilename??"")).map(p=>({file:p.outfitFilename,...p.outfitSlot}))};i.push({name:"outfit-manifest.json",data:new TextEncoder().encode(JSON.stringify(a,null,2))});const o=await Wi(i),l=URL.createObjectURL(o),n=document.createElement("a");n.href=l,n.download=Ci(this.outfitText),n.click(),setTimeout(()=>URL.revokeObjectURL(l),0),this.outfitProgress=s.length?`Exported ${i.length-1} images; ${s.length} expired preview${s.length===1?"":"s"} need regenerating.`:`Exported ${i.length-1} correctly named outfit images in one ZIP.`,this.showToast(s.length?"Outfit ZIP exported with missing previews.":"Outfit ZIP exported.")}catch(a){this.error=a.message}finally{this.outfitExporting=!1}}openShotMenu(e,t){t.preventDefault(),Ge({x:t.clientX,y:t.clientY,title:`Seed ${e.seed}`,items:[{label:"Copy generation metadata",icon:"content_copy",run:()=>void this.copyGenInfo(e,"text")},{label:"Use same generation parameters",icon:"replay",disabled:!e.info,run:()=>{e.info&&this.reuseGenInfo(e.info)}},{label:"Export PNG for Civitai",icon:"download",disabled:!e.info,run:()=>void this.exportShot(e)},{label:"Use as a Libby background",icon:"wallpaper",run:()=>void this.useAsBackground(e)},{label:"Save as a pose…",icon:"accessibility_new",run:()=>this.poseFromShot(e)},{label:"Send in chat as Libby…",icon:"send",run:()=>void this.sendAsLibby(e)},...this.editing?[{label:`Replace “${this.editing.title}” in the library`,icon:"published_with_changes",run:()=>void this.replaceOriginal(e)}]:[]]})}poseFromShot(e){var t;this.poseDraft={name:"",prompt:((t=e.info)==null?void 0:t.prompt)??this.prompt,negativePrompt:"",previewId:e.id.startsWith("wip-")?void 0:e.id}}async sendAsLibby(e){const t=window.prompt("What does she say with it? (leave blank for just the picture)","");if(t!==null)try{const i=await this.saveShot(e,["libby"]),s=await u.libbySend({mediaId:i,text:t.trim()});this.showToast("She sent it — it's in her chat."),this.dispatchEvent(new CustomEvent("libby-sent",{bubbles:!0,composed:!0,detail:s}))}catch(i){this.showToast(`Couldn't send that: ${i.message}`)}}async replaceOriginal(e){const t=this.editing;if(t&&confirm(`Replace “${t.title}” with this picture? The original is deleted.`))try{const i=t.tags.filter(a=>a!=="ai-generated"),s=await this.saveShot(e,i,t.title);s!==t.id&&await u.deleteMedia(t.id),this.editing={...t,id:s},this.showToast(`Replaced “${t.title}”.`),this.dispatchEvent(new CustomEvent("imported",{bubbles:!0,composed:!0}))}catch(i){this.showToast(`Couldn't replace it: ${i.message}`)}}async saveShot(e,t=[],i){var o,l;const s=i??((((l=(o=e.info)==null?void 0:o.prompt)==null?void 0:l.trim())||this.prompt.trim()||this.outfitText.trim()).slice(0,80)||"Generated image"),a=await u.saveGenerated({id:e.id,title:s,tags:t,info:e.info});return this.shots=this.shots.map(n=>n.id===e.id?{...n,saved:!0}:n),this.dispatchEvent(new CustomEvent("imported",{bubbles:!0,composed:!0})),a.id}async exportOutfitSquare(e){const t=e.outfitFilename??`oppailib-seed-${e.seed}.png`;try{const i=await fetch(this.previewURL(e),{credentials:"same-origin"});if(!i.ok)throw new Error(`preview returned ${i.status}`);let s=new Uint8Array(await i.arrayBuffer());if(e.info)try{s=He(s,oe(e.info),be(e.info))}catch{}const a=URL.createObjectURL(new Blob([s],{type:"image/png"})),o=document.createElement("a");o.href=a,o.download=t,o.click(),setTimeout(()=>URL.revokeObjectURL(a),0),this.showToast(e.cutoutReviewed?`Exported ${t}`:`Exported ${t} — its cutout hasn't been reviewed yet.`)}catch(i){this.showToast(`Couldn't export that square: ${i.message}`)}}async useAsBackground(e){var p,h,f;const t=((p=e.info)==null?void 0:p.prompt)??this.prompt,s=(t.split(/[,\n]/).map(g=>g.trim()).filter(Boolean).find(g=>/^[a-z][a-z ]{2,40}$/i.test(g)&&!/masterpiece|quality|detailed|resolution|score_/i.test(g))??"Generated room").replace(/\b\w/g,g=>g.toUpperCase()).slice(0,60),a=(h=window.prompt("Name this background",s))==null?void 0:h.trim();if(!a)return;const o=new Set(["masterpiece","best","quality","detailed","highly","ultra","high","resolution","the","and","with","very","background","scenery","score","absurdres"]),l=[...new Set(t.toLowerCase().match(/[a-z]{4,}/g)??[])].filter(g=>!o.has(g)).slice(0,8),n=window.prompt("Tags — what it is, comma separated (she reads these to pick a room)",l.join(", "));if(n!==null)try{const g=await fetch(this.previewURL(e),{credentials:"same-origin"});if(!g.ok)throw new Error(`preview returned ${g.status}`);const y=await Ce(await g.blob()),k=await u.saveLibbyBackground({name:a,tags:n.split(",").map(S=>S.trim()).filter(Boolean)});await u.setLibbyBackgroundImage(k.id,y),this.showToast(`Added “${a}” to the rooms Libby can be in.`),(f=this.renderRoot.querySelector("oppai-outfit-wardrobe"))==null||f.refresh()}catch(g){this.showToast(`Couldn't add that background: ${g.message}`)}}async save(e){if(!e.saved)try{await this.saveShot(e,this.editingLibby?["libby"]:[]),this.showToast("Saved to library")}catch(t){this.showToast(t.message)}}bumpThumbs(){this.thumbVersion++,this.failedThumbs=new Set}renderArt(e,t,i){return this.failedThumbs.has(e)?r`<div class="card-blank">
        <span class="material-symbols-rounded" style="font-size:34px;">${i}</span>
      </div>`:r`<img
      class="card-art"
      src=${e}
      alt=${t}
      loading="lazy"
      @error=${()=>{this.failedThumbs=new Set(this.failedThumbs).add(e)}}
    />`}async useAsModelThumb(e){if(!this.checkpoint){this.showToast("Pick a model first");return}try{await u.setModelThumb({model:this.checkpoint,previewId:e.id}),this.bumpThumbs(),this.showToast("Set as the model's cover")}catch(t){this.showToast(t.message)}}async openMetaEditor(e){this.metaBusy=!0;try{const t=await u.modelMeta(e);this.metaDraft=t,this.metaTriggerText=t.triggerPhrases.join(", ")}catch(t){this.showToast(t.message)}finally{this.metaBusy=!1}}setMetaDefaults(e){const t=this.metaDraft;t&&(this.metaDraft={...t,defaults:{...t.defaults??{},...e}})}async importCivitaiDefaults(){const e=this.metaDraft;if(!(!e||this.metaBusy)){this.metaBusy=!0;try{const{suggestion:t,keySet:i}=await u.civitaiSuggest({key:e.key}),s=this.metaDraft;if(!s)return;const a=Li(s.defaults??{},this.metaTriggerText,t,s.type==="lora");this.metaDraft={...s,defaults:a.defaults},this.metaTriggerText=a.triggerText;const o=a.applied.length?`Imported ${a.applied.join(", ")} — check them and Save`:"The Civitai page recommends nothing new";this.showToast(i?o:`${o}. A Civitai API key adds what the showcase pictures used.`)}catch(t){this.showToast(t.message)}finally{this.metaBusy=!1}}}async saveMeta(){const e=this.metaDraft;if(!(!e||this.metaBusy)){this.metaBusy=!0;try{await u.patchModelMeta({key:e.key,name:e.name,description:e.description??"",triggerPhrases:this.metaTriggerText.split(",").map(t=>t.trim()).filter(Boolean),defaults:e.defaults}),this.metaDraft=null,this.showToast("Model updated"),await this.loadStatus()}catch(t){this.showToast(t.message)}finally{this.metaBusy=!1}}}async deleteMetaModel(){const e=this.metaDraft;if(!e||this.metaBusy)return;const t=e.type==="lora"?"LoRA":"model";if(confirm(`Delete the ${t} “${e.name}” from InvokeAI? The file goes with it.`)){this.metaBusy=!0;try{if(await u.deleteModel(e.key),this.metaDraft=null,e.type==="lora"){const i={...this.selectedLoras};delete i[e.name],delete i[e.key],this.selectedLoras=i}else this.checkpoint===e.key&&(this.checkpoint="");this.showToast(`${t} deleted`),await this.loadStatus()}catch(i){this.showToast(i.message)}finally{this.metaBusy=!1}}}toggleLora(e){var i,s,a,o,l;const t={...this.selectedLoras};if(e in t){delete t[e];const n=new Set(((s=(((i=this.status)==null?void 0:i.loras)??[]).find(h=>h.name===e))==null?void 0:s.triggerPhrases)??[]),p=new Set((((a=this.status)==null?void 0:a.loras)??[]).filter(h=>h.name in t).flatMap(h=>h.triggerPhrases??[]));this.selectedTriggers=this.selectedTriggers.filter(h=>!n.has(h)||p.has(h))}else{const n=(l=(((o=this.status)==null?void 0:o.loras)??[]).find(p=>p.name===e))==null?void 0:l.weight;t[e]=n&&Number.isFinite(n)?n:1}this.selectedLoras=t}toggleTrigger(e){this.selectedTriggers=this.selectedTriggers.includes(e)?this.selectedTriggers.filter(t=>t!==e):[...this.selectedTriggers,e]}toggleCharacter(e){this.selectedChars=this.selectedChars.includes(e)?this.selectedChars.filter(t=>t!==e):[...this.selectedChars,e]}toggleSection(e){this.open={...this.open,[e]:!this.open[e]}}onCharThumbFile(e){var a;const t=e.target,i=(a=t.files)==null?void 0:a[0];if(t.value="",!i||!this.charDraft)return;const s=new FileReader;s.onload=()=>{this.charDraft&&(this.charDraft={...this.charDraft,imageData:String(s.result)})},s.readAsDataURL(i)}onCharScanFile(e){var a;const t=e.target,i=(a=t.files)==null?void 0:a[0];if(t.value="",!i||!this.charDraft||this.scanBusy)return;const s=new FileReader;s.onload=()=>void this.scanCharImage(String(s.result)),s.readAsDataURL(i)}async scanCharImage(e){if(!(!this.charDraft||this.scanBusy)){this.scanBusy=!0;try{const i=(await u.scanImage(e)).tags.filter(p=>p.category!=="rating").map(p=>p.tag.replace(/_/g," ").trim()).filter(Boolean),s=this.charDraft;if(!s)return;const a=s.prompt.trim(),o=new Set(a.split(",").map(p=>p.trim().toLowerCase()).filter(Boolean)),l=i.filter(p=>!o.has(p.toLowerCase()));if(!l.length){this.showToast("No new tags found");return}const n=a?`${a}, ${l.join(", ")}`:l.join(", ");this.charDraft={...s,prompt:n},this.showToast(`Added ${l.length} tag${l.length===1?"":"s"}`)}catch(t){this.showToast(t.message)}finally{this.scanBusy=!1}}}async saveCharacter(){const e=this.charDraft;if(!(!e||!e.name.trim()||this.charBusy)){this.charBusy=!0;try{await u.saveCharacter({id:e.id,name:e.name.trim(),prompt:e.prompt,negativePrompt:e.negativePrompt,imageData:e.imageData}),this.charDraft=null,this.bumpThumbs(),await this.loadCharacters(),this.showToast("Character saved")}catch(t){this.showToast(t.message)}finally{this.charBusy=!1}}}async deleteCharacter(){const e=this.charDraft;if(!(!(e!=null&&e.id)||this.charBusy)&&confirm(`Delete “${e.name}” from the character library?`)){this.charBusy=!0;try{await u.deleteCharacter(e.id);const t=ve("libraryDelete");R(t.message,"success",{emotion:t.emotion,intensity:t.intensity}),this.charDraft=null,await this.loadCharacters(),this.showToast("Character deleted")}catch(t){this.showToast(t.message)}finally{this.charBusy=!1}}}showToast(e){this.toast=e,setTimeout(()=>this.toast="",2600)}render(){var e,t;return r`<div class="wrap">
        ${this.restoredNotice?this.renderRestoredNotice():c}
        ${this.renderBody()}
      </div>
      ${this.charDraft?this.renderCharEditor(this.charDraft):c}
      ${this.poseDraft?this.renderPoseEditor(this.poseDraft):c}
      ${this.wildcardDraft?this.renderWildcardEditor(this.wildcardDraft):c}
      ${this.metaDraft?this.renderMetaEditor(this.metaDraft):c}
      ${this.expandedShot?this.renderLightbox(this.expandedShot):c}
      ${this.renderCutoutDialog()}
      ${this.trainOpen?r`<oppai-lora-train .models=${((e=this.status)==null?void 0:e.models)??[]} .loras=${((t=this.status)==null?void 0:t.loras)??[]} .checkpoint=${this.checkpoint}
            @close=${()=>this.trainOpen=!1}
            @trained=${i=>{this.showToast(`${i.detail.name} is trained and installed`),this.loadStatus()}}></oppai-lora-train>`:c}
      ${this.toast?r`<div class="toast">${this.toast}</div>`:c}`}renderRestoredNotice(){return r`
      <div class="restored">
        <span class="material-symbols-rounded" style="font-size:18px;">history</span>
        <span class="grow">Picked up where you left off.</span>
        <button class="act" @click=${()=>this.restoredNotice=!1}>Keep it</button>
        <button class="act" @click=${this.startFresh}>Start fresh</button>
      </div>
    `}renderLightbox(e){var a;const t=this.shots.find(o=>o.id===e.id)??e,i=!t.id.startsWith("wip-"),s="This square was restored from the wardrobe — regenerate it to save it elsewhere.";return r`
      <div class="lightbox" @click=${o=>{o.target===o.currentTarget&&(this.expandedShot=null)}}>
        <img src=${this.previewURL(t)} alt="Generated image"
          @contextmenu=${o=>this.openShotMenu(t,o)} />
        <div class="row">
          <button class="btn primary" ?disabled=${t.saved||!i}
            title=${i?"Keep this image in the library":s}
            @click=${()=>this.save(t)}>
            <span class="material-symbols-rounded" style="font-size:17px;">${t.saved?"check":"save"}</span>
            ${t.saved?"Saved":"Save to library"}
          </button>
          ${((a=this.status)==null?void 0:a.backend)==="invokeai"?r`<button class="btn" ?disabled=${!i}
            title=${i?"Set as this model's preview in InvokeAI":s}
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
    `}renderMetaEditor(e){var s,a,o,l;const t=e.defaults??{},i=e.type==="lora";return r`
      <div class="overlay" @click=${n=>{n.target===n.currentTarget&&(this.metaDraft=null)}}>
        <div class="dialog">
          <h3>Edit ${i?"LoRA":"model"} — saved on ${((s=this.status)==null?void 0:s.backend)==="invokeai"?"InvokeAI":"Automatic1111"}</h3>
          <div>
            <label class="field">Name</label>
            <!-- Automatic1111 names a model by its file, so the name is not edited there. -->
            <input type="text" .value=${e.name} ?readonly=${((a=this.status)==null?void 0:a.backend)!=="invokeai"}
              title=${((o=this.status)==null?void 0:o.backend)!=="invokeai"?"Automatic1111 names a model by its file":""}
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
          ${i?r`<div class="meta-grid">
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
              </div>`:r`
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
                      ${["euler_a","euler","dpmpp_2m","dpmpp_2m_k","dpmpp_2m_sde_k","dpmpp_sde_k","unipc"].map(n=>r`<option value=${n} ?selected=${n===t.scheduler}>${n}</option>`)}
                    </select>
                  </div>
                  <div class="full">
                    <label class="field">Default VAE</label>
                    <select class="num" .value=${t.vae??""}
                      @change=${n=>this.setMetaDefaults({vae:n.target.value})}>
                      <option value="">Model's own</option>
                      ${(((l=this.status)==null?void 0:l.vaes)??[]).map(n=>r`<option value=${n.key} ?selected=${n.key===t.vae}>${n.name}</option>`)}
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
    `}renderBody(){var l,n,p;const e=this.status;if(e===null)return r`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`;if(!e.enabled)return r`<div class="empty">
        <span class="material-symbols-rounded">auto_awesome</span>
        <div style="font-size:15px; margin-bottom:6px;">Image generation isn't set up yet.</div>
        <div style="font-size:13px;">
          Add the URL of your local InvokeAI or Automatic1111 / SD.Next server under
          <strong>Settings → Image generation</strong>, then come back here.
        </div>
      </div>`;if(!e.reachable)return r`<div class="empty">
        <span class="material-symbols-rounded">cloud_off</span>
        <div style="font-size:15px; margin-bottom:6px;">Can't reach the image generator.</div>
        <div style="font-size:13px; margin-bottom:14px;">${e.error??"It didn't answer."}</div>
        <button class="chip" @click=${()=>this.loadStatus()}>Retry</button>
      </div>`;const t=e.backend==="invokeai",i=e.gallery??(t?"invokeai":void 0),s=(e.models??[]).find(h=>h.title===this.checkpoint),a=(s==null?void 0:s.model_name)||this.checkpoint||"Choose a model";if(this.studio)return this.renderStudio(e,t,a);const o=this.createTab;return r`
      <div class="workspace create">
        <div class="create-shell ${o?"drawer-open":""} ${i?"with-gallery":""}">
          ${this.renderCreateRail()}
          ${o?r`<div class="drawer-scrim" @click=${()=>this.createTab=""}></div>
                <aside class="create-drawer" aria-label=${((l=je.find(h=>h.id===o))==null?void 0:l.label)??""}>
                  ${this.renderCreateDrawer(e,t)}
                </aside>`:c}
          <section class="create-stage">
            ${this.renderRecipeStrip(e,t)}
            <div class="canvas-stage">
              ${this.renderResults()}
              ${this.error?r`<div class="banner">${this.error}</div>`:c}
              ${this.generating?this.renderGenerating(t):c}
            </div>
            <div class="prompt-dock">${this.renderPrompt()}</div>
          </section>
          ${i?r`<aside class="right create-gallery">
                <oppai-invoke-gallery workspace backend=${i}
                  @boards-changed=${()=>this.loadStatus()}
                  @board-changed=${h=>{t&&(this.board=h.detail.board)}}
                  @cut-out=${h=>void this.openCutout(h.detail.url,h.detail.name)}
                  @reuse-generation=${h=>this.reuseGenInfo(h.detail)}
                ></oppai-invoke-gallery>
              </aside>`:c}
        </div>
      </div>
      ${this.civitaiOpen?r`<oppai-civitai backend=${((n=this.status)==null?void 0:n.backend)??"invokeai"} .canManage=${!!((p=this.status)!=null&&p.manageModels)}
            .manageNote=${mt(this.status)}
            @close=${()=>this.onCivitaiClose()}
            @use-prompt=${h=>this.onCivitaiPrompt(h.detail)}></oppai-civitai>`:c}
    `}openCreateTab(e,t=!1){const i=t&&this.createTab===e?"":e;i!==this.createTab&&(this.pickerFilter=""),this.createTab=i}renderCreateRail(){const e={loras:Object.keys(this.selectedLoras).length,look:this.selectedChars.length+this.selectedPoses.length,templates:this.templateId?1:0};return r`<nav class="create-rail" aria-label="Generation setup">
      ${je.map(t=>r`<button class="rail-tab ${this.createTab===t.id?"on":""}"
          aria-pressed=${this.createTab===t.id?"true":"false"} title=${t.label}
          @click=${()=>this.openCreateTab(t.id,!0)}>
          <span class="material-symbols-rounded rail-icon">${t.icon}</span>
          <span class="rail-label">${t.label}</span>
          ${e[t.id]?r`<span class="rail-badge">${e[t.id]}</span>`:c}
        </button>`)}
    </nav>`}renderPickerSearch(e){return r`<label class="picker-search">
      <span class="material-symbols-rounded">search</span>
      <input type="search" .value=${this.pickerFilter} placeholder=${e} aria-label=${e}
        @input=${t=>this.pickerFilter=t.target.value} />
    </label>`}renderManageNote(e,t){const i=t?"":mt(e);return i?r`<div class="manage-note">
      <span class="material-symbols-rounded">info</span>
      <span>${i}</span>
    </div>`:c}renderCreateDrawer(e,t){const i=this.createTab,s=je.find(o=>o.id===i);this.flatSections=!0;let a=c;try{switch(i){case"models":a=r`${this.renderPickerSearch("Search models")}
            ${this.renderModelSection(e.models??[])}
            ${this.renderManageNote(e,t)}`;break;case"loras":a=r`${this.renderPickerSearch("Search LoRAs")}
            ${this.renderLoraSection(e.loras??[],e.loraError)}`;break;case"look":a=r`<div class="pane-title">Characters</div>${this.renderCharacterSection()}
            <div class="pane-title">Poses</div>${this.renderPoseSection()}`;break;case"wildcards":a=this.renderWildcardSection();break;case"templates":a=this.renderTemplateSection(e.templates??[]);break;case"settings":a=r`<div class="pane-title">Size</div><div class="pane">${this.renderPromptOptions()}</div>
            <div class="pane-title">Sampling</div>${this.renderSettingsSection(t,e.boards??[])}
            <div class="pane-title">VAE</div>${this.renderVaeSection(e.vaes??[])}`;break}}finally{this.flatSections=!1}return r`
      <div class="drawer-head">
        <span class="material-symbols-rounded">${s.icon}</span>
        ${s.label}
        <span class="toolbar-spacer"></span>
        ${i==="loras"?r`<button class="drawer-action" title="Train a LoRA on your own pictures" @click=${()=>this.trainOpen=!0}>
              <span class="material-symbols-rounded">model_training</span>
            </button>`:c}
        ${i==="models"||i==="loras"?r`<button class="drawer-action" title="Find more on Civitai" @click=${()=>this.civitaiOpen=!0}>
              <span class="material-symbols-rounded">travel_explore</span>
            </button>`:c}
        <button class="drawer-action" title="Close" aria-label="Close" @click=${()=>this.createTab=""}>
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
      <div class="drawer-scroll">${a}</div>
    `}renderRecipeStrip(e,t){const i=(e.models??[]).find(o=>o.title===this.checkpoint),s=(e.loras??[]).filter(o=>o.name in this.selectedLoras),a=i?`${u.modelThumbURL(i.title)}&v=${this.thumbVersion}`:"";return r`<div class="recipe">
      <button class="recipe-model" title=${(i==null?void 0:i.title)??"Choose a model"} @click=${()=>this.openCreateTab("models")}>
        ${a&&!this.failedThumbs.has(a)?r`<img src=${a} alt="" @error=${()=>this.failedThumbs=new Set(this.failedThumbs).add(a)} />`:r`<span class="recipe-model-icon"><span class="material-symbols-rounded">deployed_code</span></span>`}
        <span class="recipe-model-text">
          <span class="recipe-kicker"><span class="status-dot"></span>${t?"InvokeAI":"Automatic1111"}${i!=null&&i.base?r` · ${i.base}`:c}</span>
          <span class="recipe-model-name">${(i==null?void 0:i.model_name)||this.checkpoint||"Choose a model"}</span>
        </span>
        <span class="material-symbols-rounded recipe-caret">expand_more</span>
      </button>
      <div class="recipe-chips">
        ${s.map(o=>r`<span class="recipe-chip lora">
          <button class="recipe-chip-main" title="Change the weight in the LoRAs drawer" @click=${()=>this.openCreateTab("loras")}>
            <span class="material-symbols-rounded">style</span>${o.alias||o.name}<b>${this.selectedLoras[o.name]}</b>
          </button>
          <button class="recipe-chip-x" title="Take this LoRA off" aria-label=${`Remove ${o.alias||o.name}`} @click=${()=>this.toggleLora(o.name)}>
            <span class="material-symbols-rounded">close</span>
          </button>
        </span>`)}
        ${s.length?c:r`<button class="recipe-chip add" @click=${()=>this.openCreateTab("loras")}>
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
      ${this.shots.length?r`<button class="recipe-ghost" title="Clear the canvas" @click=${()=>this.clearWorkspace()}>
        <span class="material-symbols-rounded">delete_sweep</span>
      </button>`:c}
      ${e.civitai?r`<button class="recipe-civitai" @click=${()=>this.civitaiOpen=!0}>
        <span class="material-symbols-rounded">travel_explore</span><span>Civitai</span>
      </button>`:c}
      <button class="recipe-civitai" title="Train a LoRA on your own pictures" @click=${()=>this.trainOpen=!0}>
        <span class="material-symbols-rounded">model_training</span><span>Train</span>
      </button>
    </div>`}toggleSeedLock(){var t;if(this.seed>=0){this.seed=-1;return}const e=(t=this.shots[0])==null?void 0:t.seed;if(e===void 0||e<0){this.showToast("Generate a picture first — its seed is the one kept");return}this.seed=e}renderStudio(e,t,i){const s=this.wardrobes.find(a=>a.id===this.outfitWardrobeId);return r`
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
              Build${s?r` <span class="studio-view-sub">· ${s.name}</span>`:c}
            </button>
            <button class="studio-view ${this.studioView==="wardrobe"?"on":""}" role="tab" aria-selected=${this.studioView==="wardrobe"?"true":"false"}
              @click=${()=>{var a;this.studioView="wardrobe",(a=this.renderRoot.querySelector("oppai-outfit-wardrobe"))==null||a.refresh()}}>
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
        ${this.studioView==="wardrobe"?r`<div class="studio-wardrobe">
              <oppai-outfit-wardrobe
                @edit-slot=${a=>void this.editWardrobeSlot(a.detail.outfitId,a.detail.slot,a.detail.level)}
                @build-outfit=${a=>{this.outfitWardrobeId=a.detail.outfitId,this.persistDraft(),this.studioView="build",this.loadWipBoard(a.detail.outfitId)}}
              ></oppai-outfit-wardrobe>
            </div>`:r`<div class="layout studio">
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
                  ${this.error?r`<div class="banner">${this.error}</div>`:c}
                </div>
                ${this.renderBatchBar()}
              </section>
              <aside class="right studio-focus">${this.renderFocusPanel()}</aside>
            </div>`}
      </div>
    `}renderStudioToolbar(){const e=this.currentOutfitShots(),t=e.filter(s=>{var a;return(((a=s.outfitSlot)==null?void 0:a.index)??0)<ae}).length,i=e.length-t;return r`<div class="canvas-toolbar studio-toolbar">
      <label class="wardrobe-pick" title="Every square is saved into this wardrobe as it is generated">
        <span class="material-symbols-rounded" style="font-size:16px;">inventory_2</span>
        <select ?disabled=${this.outfitBatchRunning}
          @change=${s=>{this.outfitWardrobeId=s.target.value,this.persistDraft(),this.loadWipBoard(this.outfitWardrobeId)}}>
          <!-- Selected per option rather than .value on the select: the list arrives
               after the first render, and a value that has not changed is not re-applied. -->
          <option value="" ?selected=${!this.outfitWardrobeId}>New wardrobe on first square</option>
          ${this.wardrobes.map(s=>r`<option value=${s.id} ?selected=${s.id===this.outfitWardrobeId}>${s.name}</option>`)}
        </select>
      </label>
      <button class="toolbar-clear" title="Start a new wardrobe" ?disabled=${this.outfitBatchRunning} @click=${()=>void this.createWardrobe()}>
        <span class="material-symbols-rounded" style="font-size:15px;">add</span>
      </button>
      <div class="sheet-tabs" role="tablist">
        <button class="sheet-tab ${this.sheetTab==="faces"?"on":""}" role="tab" @click=${()=>this.sheetTab="faces"}>
          Expressions <span class="sheet-tab-count">${t}/${ae}</span>
        </button>
        <button class="sheet-tab ${this.sheetTab==="misc"?"on":""}" role="tab" @click=${()=>this.sheetTab="misc"}>
          Misc <span class="sheet-tab-count">${i}/${fe}</span>
        </button>
      </div>
      <span class="toolbar-spacer"></span>
      <div class="zoom-tabs" title="Square size">
        ${At.map((s,a)=>r`<button class="zoom-tab ${this.sheetZoom===a?"on":""}"
          title=${["Fit the row to the screen","Medium squares","Large squares"][a]}
          @click=${()=>{this.sheetZoom=a,this.persistDraft()}}>${["Fit","M","L"][a]}</button>`)}
      </div>
    </div>`}renderStudioSheet(){if(!this.outfitOn)return r`<div class="canvas-empty">
        <span class="material-symbols-rounded">checkroom</span>
        <strong>Outfit terms are switched off</strong>
        <span>Turn them back on in the recipe to build a wardrobe.</span>
      </div>`;const e=At[this.sheetZoom],t=e?`--cell:${e}px`:"";return this.sheetTab==="misc"?this.renderMiscGrid(t):this.renderFaceMatrix(t,!e)}renderFaceMatrix(e,t){const i=W(this.outfitSlot().slot);return r`<div class="face-matrix ${t?"fit":""}" style=${e}>
      <div class="matrix-corner"></div>
      ${F.map(s=>r`<div class="matrix-col-head" title=${s.face}>${s.label}</div>`)}
      ${H.map((s,a)=>{const o=F.map((n,p)=>this.outfitSlot(a,p,"").slot),l=o.filter(n=>this.shotAt(n)).length;return r`
          <div class="matrix-row-head">
            <span class="material-symbols-rounded" style="font-size:14px;">local_fire_department</span>
            <span class="matrix-row-name">${s.label}</span>
            <span class="matrix-row-count">${l}/${o.length}</span>
          </div>
          ${o.map(n=>this.renderSheetCell(n,W(n)===i,this.sheetTab==="faces"&&!this.outfitMisc))}
        `})}
    </div>`}renderMiscGrid(e){const t=W(this.outfitSlot().slot),i=(s,a,o)=>r`
      <section class="sheet-tier misc">
        <header class="sheet-tier-head">
          <span class="material-symbols-rounded" style="font-size:15px;">interests</span>
          ${s}
          <span class="tier-count">${o.filter(l=>this.shotAt(this.outfitSlot(0,0,l.id).slot)).length}/${o.length} generated</span>
        </header>
        <p class="sheet-note">${a}</p>
        <div class="sheet-grid" style=${e}>
          ${o.map(l=>{const n=this.outfitSlot(0,0,l.id).slot;return this.renderSheetCell(n,W(n)===t,!!this.outfitMisc)})}
        </div>
      </section>`;return r`<div class="outfit-sheet" style=${e}>
      ${i("Around the place","One picture per state, whatever the heat — a state with no square falls back to her expression. Typing is shown while she writes to you.",j.filter(s=>!s.intimate))}
      ${i("With them","Drawn at their own heat. She can only put herself into these once a conversation has got there.",j.filter(s=>s.intimate))}
    </div>`}renderSheetCell(e,t,i){const s=this.shotAt(e),a=s?!this.shotMatchesCurrentOutfit(s):!1,o=e.tier===0&&e.tierLabel==="Misc"?e.emotionLabel:`${e.tierLabel} · ${e.emotionLabel}`;return r`<button
      class="sheet-cell ${t?"current":""} ${s?"":"empty"}"
      title=${s?`${o}${a?" — older recipe":s.cutoutReviewed?" — reviewed":" — needs a cutout review"}`:`${o} — not generated yet`}
      @click=${()=>this.selectOutfitSlot(e.index)}
      @dblclick=${()=>{this.selectOutfitSlot(e.index),this.generateOutfitAndNext()}}
    >
      ${s?r`<img class="art" src=${this.previewURL(s)} alt=${o} loading="lazy" />`:r`<span class="art-empty"><span class="material-symbols-rounded">add_photo_alternate</span></span>`}
      <span class="cell-foot">
        <span class="cell-name">${e.tierLabel==="Misc",e.emotionLabel}</span>
        ${s?r`<span class="cell-state ${a?"stale":s.cutoutReviewed?"ready":"needs"}"></span>`:c}
      </span>
    </button>`}squareStatus(e){return e?this.shotMatchesCurrentOutfit(e)?e.cutoutReviewed?{label:"Reviewed and filed — she can wear it",tone:"ready"}:{label:"Generated — the cutout needs a look",tone:"needs"}:{label:"Generated with an older recipe",tone:"stale"}:{label:"Not generated yet",tone:"none"}}renderFocusPanel(){var h;const{slot:e}=this.outfitSlot(),t=this.shotAt(e),i=this.squareStatus(t),s=e.tierLabel==="Misc",a=s?j.find(f=>f.id===e.emotion):void 0,o=s?void 0:F[this.outfitFace],{prompt:l,negative:n}=this.assemblePrompts(),p=this.generating;return r`
      <div class="panel-heading">
        <span class="material-symbols-rounded" style="font-size:16px;">crop_square</span>
        Selected square
      </div>
      <div class="panel-scroll focus-scroll">
        <div class="focus-art">
          ${t?r`<img src=${this.previewURL(t)} alt=${e.emotionLabel} style="cursor:zoom-in" title="Expand"
                @click=${()=>this.expandedShot=t} @contextmenu=${f=>this.openShotMenu(t,f)} />`:r`<span class="focus-empty"><span class="material-symbols-rounded">add_photo_alternate</span>Nothing here yet</span>`}
        </div>
        <div class="focus-title">
          <strong>${s?e.emotionLabel:`${e.tierLabel} · ${e.emotionLabel}`}</strong>
          <span class="focus-status ${i.tone}">${i.label}</span>
        </div>
        <div class="sec-note">${a?`${a.face}; ${a.pose}.`:o?`${o.face}; ${o.pose}.`:c}</div>
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
              @change=${f=>{var y;const g=f.target;this.uploadSquare((y=g.files)==null?void 0:y[0]),g.value=""}} />
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
        ${t?r`<div class="focus-meta">
          <span title="Seed"><span class="material-symbols-rounded" style="font-size:14px;">casino</span>${t.seed}</span>
          ${(h=t.info)!=null&&h.model?r`<span title="Model"><span class="material-symbols-rounded" style="font-size:14px;">deployed_code</span>${t.info.model}</span>`:c}
          <button class="link-btn" ?disabled=${!t.info} @click=${()=>void this.copyGenInfo(t,"text")}>Copy generation data</button>
          ${this.outfitLoadoutId?r`<button class="link-btn" ?disabled=${this.loadoutBusy} @click=${()=>void this.setLoadoutCoverFromSelection()}>Use as loadout cover</button>`:c}
        </div>`:c}
        <button class="adv-toggle" @click=${()=>this.showSquarePrompt=!this.showSquarePrompt}>
          <span class="material-symbols-rounded" style="font-size:17px;">${this.showSquarePrompt?"expand_less":"code"}</span>
          ${this.showSquarePrompt?"Hide the prompt":"The prompt this square gets"}
        </button>
        ${this.showSquarePrompt?r`<div class="focus-prompt">
          <span class="focus-tag">Positive</span>
          <pre>${l}</pre>
          <span class="focus-tag negative">Negative</span>
          <pre>${n}</pre>
          <div class="sec-note">Exposure is rolled fresh for every generation, so the undress clauses change between takes.</div>
        </div>`:c}
      </div>
    `}renderBatchBar(){const e=this.currentOutfitShots(),t=e.filter(h=>{var f;return(((f=h.outfitSlot)==null?void 0:f.index)??0)<ae}).length,i=e.length-t,s=e.filter(h=>h.cutoutReviewed).length,a=this.staleShots().length,o=ae+(this.outfitMiscBatch?fe:0),l=t+(this.outfitMiscBatch?i:0),n=Math.max(0,o-l),p=!this.generating&&this.outfitOn&&!!this.assemblePrompts().prompt.trim();return r`<div class="batch-bar">
      <div class="batch-progress" title=${`${s} of ${e.length} generated squares reviewed`}>
        <div class="batch-track">
          <div class="batch-fill reviewed" style=${`width:${o?Math.min(100,s/o*100):0}%`}></div>
          <div class="batch-fill made" style=${`width:${o?Math.min(100,l/o*100):0}%`}></div>
        </div>
        <span class="batch-count">${t}/${ae} expressions · ${i}/${fe} misc · ${s} reviewed${a?r` · <em>${a} on an older recipe</em>`:c}</span>
      </div>
      <label class="switch compact" title="Whether Generate missing also renders the Misc states">
        <input type="checkbox" .checked=${this.outfitMiscBatch} ?disabled=${this.outfitBatchRunning}
          @change=${h=>{this.outfitMiscBatch=h.target.checked,this.persistDraft()}} />
        Include Misc
      </label>
      ${this.outfitBatchRunning?r`<button class="btn" @click=${()=>this.cancelOutfitBatch()}>
            <span class="material-symbols-rounded" style="font-size:17px;">stop_circle</span>
            Stop after this one
          </button>`:r`<button class="btn primary" ?disabled=${!p||!n} @click=${()=>void this.generateAllOutfit()}>
            <span class="material-symbols-rounded" style="font-size:17px;">auto_awesome</span>
            Generate ${n} missing
          </button>
          ${a?r`<button class="btn" ?disabled=${!p} @click=${()=>void this.regenerateStale()}>
            <span class="material-symbols-rounded" style="font-size:17px;">history</span>
            Redo ${a} stale
          </button>`:c}`}
      <button class="btn" ?disabled=${this.generating||this.outfitExporting||!e.length||s!==e.length}
        title=${s!==e.length?"Review every cutout first":"Every square, correctly named, in one ZIP"}
        @click=${()=>void this.exportOutfitZip()}>
        <span class="material-symbols-rounded" style="font-size:17px;">folder_zip</span>
        ${this.outfitExporting?"Building ZIP…":"Export ZIP"}
      </button>
      ${this.outfitProgress?r`<span class="batch-note">${this.outfitProgress}</span>`:c}
    </div>`}async uploadSquare(e){if(!e||!e.type.startsWith("image/")||this.generating)return;const{slot:t,filename:i}=this.outfitSlot();try{const s=await new Promise((p,h)=>{const f=new FileReader;f.onload=()=>p(String(f.result)),f.onerror=()=>h(new Error("couldn't read that file")),f.readAsDataURL(e)}),a=await this.ensureWardrobe();await u.putLibbyOutfitWip(a,t.emotion,t.tier,{imageData:s,filename:i,seed:-1,reviewed:!1,config:this.outfitConfigKey()});const o=this.shotAt(t);o&&!o.id.startsWith("wip-")&&await u.deleteGenPreview(o.id).catch(()=>{});const l=W(t),n={id:`wip-${a}-${t.emotion}-${t.tier}`,seed:-1,saved:!1,outfitFilename:i,outfitSlot:t,outfitConfig:this.outfitConfigKey(),cutoutReviewed:!1,previewVersion:Date.now(),wipOutfitId:a};this.shots=[...this.shots.filter(p=>!p.outfitSlot||W(p.outfitSlot)!==l),n],this.persistDraft(),this.openCutout(this.previewURL(n),e.name,i,n.id)}catch(s){this.showToast(`Couldn't use that image: ${s.message}`)}}async editWardrobeSlot(e,t,i){const s=F.findIndex(p=>p.id===t),a=j.some(p=>p.id===t)?t:"";if(s<0&&!a)return;this.outfitWardrobeId!==e&&(this.outfitWardrobeId=e,this.persistDraft(),await this.loadWipBoard(e)),this.outfitOn=!0;const{slot:o,filename:l}=this.outfitSlot(a?0:i,Math.max(0,s),a);this.selectOutfitSlot(o.index),this.studioView="build";let n=this.shotAt(o);if(!n)try{const p=await fetch(u.libbyEmotionURL(e,t,i,Date.now()),{credentials:"same-origin"});if(!p.ok)throw new Error(`the sprite returned ${p.status}`);const h=await Ce(await p.blob());await u.putLibbyOutfitWip(e,o.emotion,o.tier,{imageData:h,filename:l,seed:-1,reviewed:!0,config:this.outfitConfigKey()}),n={id:`wip-${e}-${o.emotion}-${o.tier}`,seed:-1,saved:!1,outfitFilename:l,outfitSlot:o,outfitConfig:this.outfitConfigKey(),cutoutReviewed:!0,previewVersion:Date.now(),wipOutfitId:e},this.shots=[...this.shots,n],this.persistDraft()}catch(p){this.showToast(`Couldn't open that sprite: ${p.message}`);return}this.openCutout(this.previewURL(n),t,n.outfitFilename,n.id)}renderDressSection(){const e=Y.filter(({key:i})=>J(this.outfitGear[i])).length,t=r`
      ${this.selectedChars.length>1?r`<div class="banner">
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
          <span class="equipped-count">${e}/${Y.length} worn</span>
          <button class="loadout-clear" ?disabled=${this.outfitBatchRunning||!e}
            @click=${()=>this.clearOutfitLoadout()}>Unequip all</button>
        </div>
        <div class="sec-note">Switch a piece off to keep it in the recipe without wearing it.</div>
        <div class="loadout-slots">
          ${Y.map(i=>this.renderGearSlot(i.key))}
        </div>
      </div>
    `;return this.section("outfit","Clothes",`${e} worn`,t)}renderLookSection(){const e=r`
      <div>
        <label class="field">Solid generation background</label>
        <div class="chips">
          ${["white","black"].map(t=>r`<button
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
      ${this.outfitPubicHair?r`<div>
        <label class="field">Pubic hair colour</label>
        <input class="num" type="text" .value=${this.outfitPubicHairColor}
          ?disabled=${this.outfitBatchRunning} placeholder="dark brown, blonde…"
          @input=${t=>this.outfitPubicHairColor=t.target.value} />
      </div>`:c}
      ${this.renderCameraControls()}
      <div>
        <label class="field">Exposure by tier</label>
        <div class="sec-note">${H.map((t,i)=>r`<div><strong>${t.label}:</strong> ${Ye[i].description}</div>`)}</div>
      </div>
    `;return this.section("look","Look & framing",this.outfitBackground,e)}renderPromptExtrasSection(){const e=r`
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
    `;return this.section("extras","Prompt extras",this.prompt.trim()||this.negative.trim()?"set":"none",e)}onCivitaiClose(){this.civitaiOpen=!1,this.loadStatus()}onCivitaiPrompt(e){this.prompt=e.prompt,this.negative=e.negativePrompt??"",e.sampler&&(this.scheduler=e.sampler),e.steps&&(this.steps=e.steps),e.cfgScale&&(this.cfg=e.cfgScale),e.seed&&(this.seed=e.seed),e.width&&e.height&&(this.width=e.width,this.height=e.height),this.templateId="",this.selectedTriggers=[],this.onCivitaiClose()}section(e,t,i,s){if(this.flatSections)return r`<div class="pane sec-${e}">${s}</div>`;const a=!!this.open[e];return r`
      <div class="sec sec-${e}">
        <button class="sec-head" @click=${()=>this.toggleSection(e)}>
          <span class="material-symbols-rounded sec-chevron ${a?"open":""}" style="font-size:18px;"
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
        <div class="collapsible ${a?"open":""}">
          <div class="sec-body" ?inert=${!a} aria-hidden=${a?"false":"true"}>${s}</div>
        </div>
      </div>
    `}renderModelSection(e){if(!e.length)return this.section("models","Models","0",r`<div class="sec-note">
          Connected, but the generator lists no checkpoints. Add a model to it and reload.
        </div>`);const t=this.flatSections?this.pickerFilter.trim().toLowerCase():"",i=t?e.filter(a=>`${a.model_name} ${a.title} ${a.base??""}`.toLowerCase().includes(t)):e,s=r`
      ${t&&!i.length?r`<div class="sec-note">No model matches “${this.pickerFilter}”.</div>`:c}
      <div class="cards">
        ${i.map(a=>{var n;const o=a.title===this.checkpoint,l=`${u.modelThumbURL(a.title)}&v=${this.thumbVersion}`;return r`
            <div class="card-wrap">
              <button class="card ${o?"on":""}" title=${a.title} @click=${()=>this.pickModel(a)}>
                ${this.renderArt(l,a.model_name,"texture")}
                <div class="card-name">${a.model_name}${a.base?r`<span class="row-sub">${a.base}</span>`:c}</div>
              </button>
              ${(n=this.status)!=null&&n.manageModels?r`<button class="card-edit left" title="Edit model settings" @click=${()=>this.openMetaEditor(a.title)}>
                <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
              </button>`:c}
            </div>
          `})}
      </div>
    `;return this.section("models","Models",String(e.length),s)}renderLoraSection(e,t){if(!e.length)return this.section("loras","LoRAs","0",r`<div class="sec-note">
          ${t?`LoRAs aren't available from this generator: ${t}`:"No LoRAs installed."}
        </div>`);const i=this.flatSections?this.pickerFilter.trim().toLowerCase():"",s=i?e.filter(h=>`${h.name} ${h.alias??""} ${(h.triggerPhrases??[]).join(" ")}`.toLowerCase().includes(i)):e,a=this.flatSections?60:6,o=Math.max(1,Math.ceil(s.length/a)),l=Math.min(this.loraPage,o-1),n=s.slice(l*a,l*a+a),p=r`
      ${i&&!s.length?r`<div class="sec-note">No LoRA matches “${this.pickerFilter}”.</div>`:c}
      <div class="cards">
        ${n.map(h=>{var y;const f=h.name in this.selectedLoras,g=`${u.loraThumbURL(h.name)}&v=${this.thumbVersion}`;return r`
            <div class="card-wrap">
              <button class="card ${f?"on":""}" title=${h.name} @click=${()=>this.toggleLora(h.name)}>
                ${this.renderArt(g,h.alias||h.name,"style")}
                <div class="card-name">${h.alias||h.name}</div>
              </button>
              ${(y=this.status)!=null&&y.manageModels?r`<button class="card-edit left" title="Edit LoRA settings" @click=${()=>this.openMetaEditor(h.name)}>
                <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
              </button>`:c}
              ${f?r`<input class="lora-weight" type="number" min="-2" max="2" step="0.05"
                aria-label=${`${h.alias||h.name} weight`}
                title=${h.weightMin&&h.weightMax?`Works at ${h.weightMin}–${h.weightMax}`:""}
                .value=${String(this.selectedLoras[h.name])}
                @input=${k=>{const S=Number(k.target.value);this.selectedLoras={...this.selectedLoras,[h.name]:Number.isFinite(S)?Math.max(-2,Math.min(2,S)):1}}} />`:c}
            </div>
          `})}
      </div>
      ${o>1?r`<div class="pager">
        <button ?disabled=${l===0} @click=${()=>this.loraPage=l-1}>Previous</button>
        <span>${l+1} / ${o}</span>
        <button ?disabled=${l>=o-1} @click=${()=>this.loraPage=l+1}>Next</button>
      </div>`:c}
    `;return this.section("loras","LoRAs",String(Object.keys(this.selectedLoras).length||e.length),p)}renderVaeSection(e){const t=e.length?r`
          <div class="rows">
            <button class="row-pick ${this.vae===""?"on":""}" @click=${()=>this.vae=""}>
              Model default
            </button>
            ${e.map(i=>r`<button
                class="row-pick ${this.vae===i.key?"on":""}"
                @click=${()=>this.vae=this.vae===i.key?"":i.key}
              >
                ${i.name}
                ${i.base?r`<span class="row-sub">${i.base}</span>`:c}
              </button>`)}
          </div>
        `:r`<div class="sec-note">The generator lists no standalone VAEs; the model's own is used.</div>`;return this.section("vaes","VAEs",this.vae?"1 picked":"default",t)}renderSettingsSection(e,t){var s,a;const i=r`
      <div class="settings">
        <div class="full">
          <label class="field">Scheduler</label>
          <select
            class="num"
            .value=${this.scheduler}
            @change=${o=>this.scheduler=o.target.value}
          >
            ${Gt.map(o=>r`<option value=${o.id} ?selected=${o.id===this.scheduler}>${o.label}</option>`)}
          </select>
        </div>
        <div>
          <label class="field">Steps</label>
          <input class="num" type="number" min="1" max="80" .value=${String(this.steps)}
            @input=${o=>this.steps=se(o.target.value,1,80,25)} />
        </div>
        <div>
          <label class="field">CFG scale</label>
          <input class="num" type="number" min="1" max="30" step="0.5" .value=${String(this.cfg)}
            @input=${o=>this.cfg=we(o.target.value,1,30,7)} />
        </div>
        ${e?r`
          <div>
            <label class="field">CFG rescale</label>
            <input class="num" type="number" min="0" max="0.99" step="0.05" .value=${String(this.cfgRescale)}
              @input=${o=>this.cfgRescale=we(o.target.value,0,.99,0)} />
          </div>
          <div>
            <label class="field">CLIP skip</label>
            <input class="num" type="number" min="0" max="12" .value=${String(this.clipSkip)}
              @input=${o=>this.clipSkip=se(o.target.value,0,12,0)} />
          </div>
        `:c}
        <div>
          <label class="field">Count</label>
          <input class="num" type="number" min="1" max="8" .value=${String(this.count)}
            @input=${o=>this.count=se(o.target.value,1,8,1)} />
        </div>
        <div>
          <label class="field">Seed (-1 random)</label>
          <input class="num" type="number" .value=${String(this.seed)}
            @input=${o=>this.seed=se(o.target.value,-1,2147483648,-1)} />
        </div>
        ${e?r`
          <!-- Which gallery a generation lands in is no longer a second setting here:
               it follows whichever gallery the Invoke gallery panel has open, so the
               place you're looking at is the place new images appear. -->
          <div class="full" style="font-size:12px; color:var(--oppai-text-muted);">
            Generations are added to <b>${((s=t.find(o=>o.id===this.board))==null?void 0:s.name)??"the open gallery"}</b> —
            switch galleries in the Invoke gallery panel.
          </div>
          <label class="switch-row"><input type="checkbox" .checked=${this.cpuNoise}
            @change=${o=>this.cpuNoise=o.target.checked} /> CPU noise</label>
          <label class="switch-row"><input type="checkbox" .checked=${this.seamlessX}
            @change=${o=>this.seamlessX=o.target.checked} /> Seamless X</label>
          <label class="switch-row"><input type="checkbox" .checked=${this.seamlessY}
            @change=${o=>this.seamlessY=o.target.checked} /> Seamless Y</label>
        `:c}
        ${(a=this.status)!=null&&a.detailerAvailable?r`
          <label class="switch-row full"><input type="checkbox" .checked=${this.detailerEnabled}
            @change=${o=>this.detailerEnabled=o.target.checked} />
            ADetailer face/hand pass</label>
          ${this.detailerEnabled?r`
            <div class="full">
              <label class="field">ADetailer detector</label>
              <select class="num" .value=${this.detailerModel}
                @change=${o=>this.detailerModel=o.target.value}>
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
                @input=${o=>this.detailerPrompt=o.target.value} />
            </div>
            <div class="full">
              <label class="field">Detail negative prompt</label>
              <input class="num" .value=${this.detailerNegative}
                @input=${o=>this.detailerNegative=o.target.value} />
            </div>
            <div>
              <label class="field">Confidence</label>
              <input class="num" type="number" min="0.05" max="1" step="0.05" .value=${String(this.detailerConfidence)}
                @input=${o=>this.detailerConfidence=we(o.target.value,.05,1,.3)} />
            </div>
            <div>
              <label class="field">Denoise</label>
              <input class="num" type="number" min="0.05" max="1" step="0.05" .value=${String(this.detailerDenoise)}
                @input=${o=>this.detailerDenoise=we(o.target.value,.05,1,.4)} />
            </div>
            <div>
              <label class="field">Mask blur</label>
              <input class="num" type="number" min="0" max="64" .value=${String(this.detailerMaskBlur)}
                @input=${o=>this.detailerMaskBlur=se(o.target.value,0,64,4)} />
            </div>
          `:c}
        `:c}
      </div>
    `;return this.section("settings","Model settings",`${this.steps} steps`,i)}renderTemplateSection(e){var l;const t=e.filter(n=>n.builtIn).length,i=this.showBuiltInTemplates?e:e.filter(n=>!n.builtIn),s=i.length?r`
          <div class="rows">
            ${i.map(n=>r`<button
                class="row-pick ${this.templateId===n.id?"on":""}"
                title=${n.prompt}
                @click=${()=>this.templateId=this.templateId===n.id?"":n.id}
              >
                ${n.name}
                <span class="row-sub">${n.prompt}</span>
              </button>`)}
          </div>
        `:r`<div class="sec-note">
          ${e.length?"No templates you created. Built-in presets are hidden — turn them on below.":((l=this.status)==null?void 0:l.backend)==="invokeai"?"No style presets in InvokeAI yet; add some there and reload.":"No styles saved in Automatic1111 yet; save one from its Styles menu and reload."}
        </div>`,a=r`
      ${s}
      ${t?r`<button
            class="link-toggle"
            @click=${()=>this.showBuiltInTemplates=!this.showBuiltInTemplates}
          >
            ${this.showBuiltInTemplates?"Hide built-in presets":`Show built-in presets (${t})`}
          </button>`:c}
    `,o=e.find(n=>n.id===this.templateId);return this.section("templates","Styles",o?o.name:"none",a)}renderCharacterSection(){const e=r`
      ${this.characters.length?r`<div class="cards">
            ${this.characters.map(i=>{const s=this.selectedChars.includes(i.id),a=`${u.characterThumbURL(i.id)}?v=${this.thumbVersion}`;return r`
                <div class="card-wrap">
                  <button class="card ${s?"on":""}" title=${i.prompt} @click=${()=>this.toggleCharacter(i.id)}>
                    ${i.hasThumb?this.renderArt(a,i.name,"person"):r`<div class="card-blank">
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
          </div>`:r`<div class="sec-note">
            Save the people you keep drawing: a character bundles a prompt fragment and a
            portrait, and clicking one adds them to the next generation.
          </div>`}
      <button
        class="side-add"
        @click=${()=>this.charDraft={name:"",prompt:"",negativePrompt:""}}
      >
        <span class="material-symbols-rounded" style="font-size:17px;">person_add</span> New character
      </button>
    `,t=this.selectedChars.length;return this.section("characters","Characters",t?`${t} picked`:String(this.characters.length),e)}renderPoseSection(){const e=r`
      ${this.outfitOn?r`<div class="sec-note">
        The outfit board sets a pose per square, so picked poses sit out while it is on.
      </div>`:c}
      ${this.poses.length?r`<div class="cards">
            ${this.poses.map(i=>{const s=this.selectedPoses.includes(i.id),a=`${u.poseThumbURL(i.id)}?v=${this.thumbVersion}`;return r`
                <div class="card-wrap">
                  <button class="card ${s?"on":""}" title=${i.prompt} @click=${()=>this.togglePose(i.id)}>
                    ${i.hasThumb?this.renderArt(a,i.name,"accessibility_new"):r`<div class="card-blank">
                          <span class="material-symbols-rounded" style="font-size:34px;">accessibility_new</span>
                        </div>`}
                    <div class="card-name">${i.name}</div>
                  </button>
                  <button class="card-edit" title="Edit ${i.name}"
                    @click=${()=>this.poseDraft={id:i.id,name:i.name,prompt:i.prompt,negativePrompt:i.negativePrompt??""}}>
                    <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
                  </button>
                </div>`})}
          </div>`:r`<div class="sec-note">
            Save the poses you keep asking for: a pose is a prompt fragment with a
            picture, and clicking one adds it to the next generation. Right-click any
            result for "Save as a pose" to start one from a picture you like.
          </div>`}
      <button class="side-add" @click=${()=>this.poseDraft={name:"",prompt:"",negativePrompt:""}}>
        <span class="material-symbols-rounded" style="font-size:17px;">add</span> New pose
      </button>
    `,t=this.selectedPoses.length;return this.section("poses","Poses",t?`${t} picked`:String(this.poses.length),e)}renderWildcardSection(){const e=r`
      <div class="sec-note">
        Write <code>__name__</code> in a prompt to draw a random line from that list on
        every generate, or <code>{red|blue|green}</code> to pick one of a few words in
        place. Click a list to insert it.
      </div>
      ${this.wildcards.length?r`<div class="wildcard-chips">
            ${this.wildcards.map(t=>r`
              <span class="wildcard-chip">
                <button class="wildcard-name" title=${`${t.entries.length} line${t.entries.length===1?"":"s"} — insert __${t.name}__`}
                  @click=${()=>this.insertWildcard(t.name)}>__${t.name}__</button>
                ${t.readOnly?r`<span class="wildcard-ro" title="A .txt file in the server's wildcards folder — edit the file to change it">
                      <span class="material-symbols-rounded" style="font-size:14px;">lock</span></span>`:r`<button class="wildcard-edit" title="Edit ${t.name}"
                      @click=${()=>this.wildcardDraft={id:t.id,name:t.name,text:t.entries.join(`
`)}}>
                      <span class="material-symbols-rounded" style="font-size:14px;">edit</span></button>`}
              </span>`)}
          </div>`:c}
      <button class="side-add" @click=${()=>this.wildcardDraft={name:"",text:""}}>
        <span class="material-symbols-rounded" style="font-size:17px;">add</span> New wildcard list
      </button>
    `;return this.section("wildcards","Wildcards",String(this.wildcards.length),e)}insertWildcard(e){const t=`__${e}__`,i=this.renderRoot.querySelector(".prompt-area"),s=i&&document.activeElement===i?i.selectionStart:this.prompt.length,a=this.prompt.slice(0,s).replace(/\s+$/,""),o=this.prompt.slice(s).replace(/^\s+/,""),l=a&&!a.endsWith(",")?`${a}, `:a,n=o?o.startsWith(",")?o:`, ${o}`:"";this.prompt=`${l}${t}${n}`}togglePose(e){this.selectedPoses=this.selectedPoses.includes(e)?this.selectedPoses.filter(t=>t!==e):[...this.selectedPoses,e]}onPoseThumbFile(e){var a;const t=e.target,i=(a=t.files)==null?void 0:a[0];if(t.value="",!i||!this.poseDraft)return;const s=new FileReader;s.onload=()=>{this.poseDraft&&(this.poseDraft={...this.poseDraft,imageData:String(s.result),previewId:void 0})},s.readAsDataURL(i)}async savePose(){const e=this.poseDraft;if(!(!e||!e.name.trim()||this.poseBusy)){this.poseBusy=!0;try{const t=await u.savePose({id:e.id,name:e.name.trim(),prompt:e.prompt,negativePrompt:e.negativePrompt,imageData:e.imageData,previewId:e.previewId});this.poseDraft=null,this.bumpThumbs(),await this.loadPoses(),e.id||(this.selectedPoses=[...this.selectedPoses,t.id]),this.showToast("Pose saved")}catch(t){this.showToast(t.message)}finally{this.poseBusy=!1}}}async deletePose(){const e=this.poseDraft;if(!(!(e!=null&&e.id)||this.poseBusy)&&confirm(`Delete “${e.name}” from the pose library?`)){this.poseBusy=!0;try{await u.deletePose(e.id),this.poseDraft=null,await this.loadPoses(),this.showToast("Pose deleted")}catch(t){this.showToast(t.message)}finally{this.poseBusy=!1}}}async saveWildcard(){const e=this.wildcardDraft;if(!(!e||!e.name.trim()||!e.text.trim()||this.wildcardBusy)){this.wildcardBusy=!0;try{await u.saveWildcard({id:e.id,name:e.name.trim(),text:e.text}),this.wildcardDraft=null,await this.loadWildcards(),this.showToast("Wildcard list saved")}catch(t){this.showToast(t.message)}finally{this.wildcardBusy=!1}}}async deleteWildcard(){const e=this.wildcardDraft;if(!(!(e!=null&&e.id)||this.wildcardBusy)&&confirm(`Delete the wildcard list “${e.name}”?`)){this.wildcardBusy=!0;try{await u.deleteWildcard(e.id),this.wildcardDraft=null,await this.loadWildcards(),this.showToast("Wildcard list deleted")}catch(t){this.showToast(t.message)}finally{this.wildcardBusy=!1}}}renderPoseEditor(e){var i;const t=e.imageData??(e.previewId?u.genPreviewURL(e.previewId):e.id&&((i=this.poses.find(s=>s.id===e.id))!=null&&i.hasThumb)?`${u.poseThumbURL(e.id)}?v=${this.thumbVersion}`:void 0);return r`
      <div class="overlay" @click=${s=>{s.target===s.currentTarget&&(this.poseDraft=null)}}>
        <div class="dialog">
          <h3>${e.id?"Edit pose":"New pose"}</h3>
          <div>
            <label class="field">Name</label>
            <input type="text" .value=${e.name} placeholder="Sitting with a mug"
              @input=${s=>this.poseDraft={...e,name:s.target.value}} />
          </div>
          <div>
            <label class="field">Prompt fragment</label>
            <textarea .value=${e.prompt} placeholder="sitting cross-legged, holding a steaming mug in both hands, …"
              @input=${s=>this.poseDraft={...e,prompt:s.target.value}}></textarea>
          </div>
          <div>
            <label class="field">Negative fragment (optional)</label>
            <textarea .value=${e.negativePrompt} placeholder="standing, …"
              @input=${s=>this.poseDraft={...e,negativePrompt:s.target.value}}></textarea>
          </div>
          <div class="dialog-thumb">
            ${t?r`<img src=${t} alt="Thumbnail" />`:r`<div class="card-blank" style="width:72px; height:96px; aspect-ratio:auto; border-radius:10px;">
                  <span class="material-symbols-rounded">accessibility_new</span>
                </div>`}
            <label class="btn">
              Choose thumbnail…
              <input class="hidden-file" type="file" accept="image/*" @change=${s=>this.onPoseThumbFile(s)} />
            </label>
          </div>
          <div class="dialog-actions">
            ${e.id?r`<button class="btn danger" ?disabled=${this.poseBusy} @click=${()=>this.deletePose()}>Delete</button>`:c}
            <button class="btn" @click=${()=>this.poseDraft=null}>Cancel</button>
            <button class="btn primary" ?disabled=${!e.name.trim()||this.poseBusy} @click=${()=>this.savePose()}>Save</button>
          </div>
        </div>
      </div>
    `}renderWildcardEditor(e){const t=e.text.split(`
`).map(i=>i.trim()).filter(i=>i&&!i.startsWith("#")).length;return r`
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
            ${e.id?r`<button class="btn danger" ?disabled=${this.wildcardBusy} @click=${()=>this.deleteWildcard()}>Delete</button>`:c}
            <button class="btn" @click=${()=>this.wildcardDraft=null}>Cancel</button>
            <button class="btn primary" ?disabled=${!e.name.trim()||!e.text.trim()||this.wildcardBusy} @click=${()=>this.saveWildcard()}>Save</button>
          </div>
        </div>
      </div>
    `}renderGearSlot(e){var p,h,f;const t=Y.find(g=>g.key===e),i=this.outfitGear[e],s=!!i.item.trim(),a=J(i),o=g=>{this.outfitGear={...this.outfitGear,[e]:{...i,...g}}},l=!!((p=i.prompt)!=null&&p.trim())||!!((h=i.noun)!=null&&h.trim()),n=this.gearPromptOpen===e;return r`<div class="gear-slot ${a?"filled":""} ${i.off?"off":""}" title=${t.hint}>
      <button class="gear-slot-icon material-symbols-rounded ${s?"":"inert"}" aria-hidden=${s?"false":"true"}
        title=${i.off?`Wear the ${t.label.toLowerCase()} again`:s?`Take the ${t.label.toLowerCase()} off without clearing it`:t.hint}
        ?disabled=${this.outfitBatchRunning||!s}
        @click=${()=>o({off:!i.off})}>${i.off?"visibility_off":t.icon}</button>
      <span class="gear-slot-name">${t.label}${i.off?" · off":""}</span>
      <button class="gear-slot-prompt ${l?"on":""} ${n?"open":""}"
        title=${`What the generator calls this slot — currently "${st(t,i)}"`}
        aria-label=${`Edit the prompt wording for ${t.label}`} aria-expanded=${n?"true":"false"}
        ?disabled=${this.outfitBatchRunning}
        @click=${()=>this.gearPromptOpen=n?null:e}>
        <span class="material-symbols-rounded">text_fields</span></button>
      <div class="gear-slot-fields">
        <input class="gear-color" type="text" .value=${i.color}
          ?disabled=${this.outfitBatchRunning}
          aria-label=${`${t.label} colour`} placeholder="colour"
          @input=${g=>o({color:g.target.value})} />
        <input class="gear-item" type="text" .value=${i.item}
          ?disabled=${this.outfitBatchRunning}
          aria-label=${`${t.label}: ${t.hint}`} placeholder=${t.hint}
          @input=${g=>o({item:g.target.value})} />
      </div>
      ${n?r`<div class="gear-prompt-edit">
        <label>Prompt word
          <input type="text" .value=${i.prompt??""} placeholder=${t.prompt}
            ?disabled=${this.outfitBatchRunning}
            aria-label=${`Prompt word for ${t.label}`}
            @input=${g=>o({prompt:g.target.value})} /></label>
        <label>Colour-lock noun
          <input type="text" .value=${i.noun??""} placeholder=${De(t,i)}
            ?disabled=${this.outfitBatchRunning}
            aria-label=${`Colour-lock noun for ${t.label}`}
            @input=${g=>o({noun:g.target.value})} /></label>
        <p class="gear-prompt-preview">
          ${a?r`Sends: <code>${bt(t,i,((f=this.status)==null?void 0:f.backend)??"",this.outfitLockColors)}</code>`:r`Describe something in this slot to see the phrase it sends.`}
        </p>
        ${l?r`<button class="gear-prompt-reset" ?disabled=${this.outfitBatchRunning}
          @click=${()=>o({prompt:"",noun:""})}>Reset to "${t.prompt}"</button>`:c}
      </div>`:c}
    </div>`}clearOutfitLoadout(){this.outfitGear={...Ut}}renderLoadoutSection(){const e=this.loadouts.find(i=>i.id===this.outfitLoadoutId),t=r`
      <div class="sec-note">
        A loadout is the recipe — every slot, colour and studio setting on the board.
        Save one to come back to it, or to render the same clothes again on another model.
      </div>
      <div class="loadout-cards">
        ${this.loadouts.map(i=>r`<div
          class="loadout-card ${i.id===this.outfitLoadoutId?"on":""}"
          title=${i.name}>
          <button class="card-hit" ?disabled=${this.outfitBatchRunning}
            aria-label=${`Equip ${i.name}`} @click=${()=>this.applyLoadout(i)}>
            ${i.hasThumb?r`<img class="cover" src=${u.libbyLoadoutThumbURL(i.id,this.loadoutCoverVersion)} alt="" />`:r`<span class="cover cover-empty material-symbols-rounded">checkroom</span>`}
            <span class="card-name">${i.name}</span>
          </button>
          ${i.id===this.outfitLoadoutId?r`<span class="worn-badge">Equipped</span>`:c}
          <button class="card-del" title=${`Delete ${i.name}`} aria-label=${`Delete ${i.name}`}
            ?disabled=${this.loadoutBusy} @click=${()=>void this.deleteLoadout(i)}>
            <span class="material-symbols-rounded" style="font-size:15px;">delete</span>
          </button>
        </div>`)}
        ${this.loadouts.length?c:r`<div class="sec-note">No saved loadouts yet.</div>`}
      </div>
      <div class="outfit-actions">
        <button class="side-add" ?disabled=${this.loadoutBusy||this.outfitBatchRunning}
          @click=${()=>void this.saveLoadout(!1)}>
          <span class="material-symbols-rounded" style="font-size:17px;">save</span>
          ${e?`Save over “${e.name}”`:"Save this loadout"}
        </button>
        ${e?r`
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
    `;return this.section("loadouts","Saved loadouts",String(this.loadouts.length),t)}renderCameraControls(){const e=Ae.shots.find(t=>t.id===this.camera.shot);return r`
      <div>
        <label class="field">Shot</label>
        <select class="num" .value=${this.camera.shot} ?disabled=${this.outfitBatchRunning}
          @change=${t=>this.editCamera({shot:t.target.value})}>
          ${Ae.shots.map(t=>r`<option value=${t.id}>${t.label}</option>`)}
        </select>
      </div>
      ${e!=null&&e.hint?r`<div class="sec-note">${e.hint}.</div>`:c}
    `}async openCutout(e,t,i,s){this.cutout={url:e,name:t,outputName:i,outfitShotId:s},this.cutoutError="",this.cutoutBusy=!0,this.showOriginal=!1,this.cutoutZoom=1,this.cutoutContrast=!1;try{const a=await ki(e);this.session=new $i(a),this.session.autoRemove(this.cutoutTolerance),this.cutoutTool="remove",await this.paintCutout()}catch(a){this.cutoutError=a.message}finally{this.cutoutBusy=!1}}async paintCutout(){const e=this.session;if(!e)return;this.cutoutCanvas=e.compose({feather:this.cutoutFeather,spill:this.cutoutSpill},this.showOriginal),this.cutFraction=e.cutFraction,this.canUndo=e.canUndo,this.canRedo=e.canRedo,await this.updateComplete;const t=this.cutoutHost;t&&this.cutoutCanvas&&(t.replaceChildren(this.cutoutCanvas),this.applyCutoutZoom())}applyCutoutZoom(){const e=this.cutoutCanvas,t=this.cutoutHost;if(!e||!t)return;const i=Math.max(1,t.clientWidth),s=Math.max(280,Math.min(window.innerHeight*.62,e.height)),o=Math.min(1,i/e.width,s/e.height)*this.cutoutZoom;e.style.width=`${Math.max(1,Math.round(e.width*o))}px`,e.style.height=`${Math.max(1,Math.round(e.height*o))}px`}setCutoutZoom(e){this.cutoutZoom=Math.max(.25,Math.min(4,e)),this.updateComplete.then(()=>this.applyCutoutZoom())}async autoCutout(){this.session&&(this.session.autoRemove(this.cutoutTolerance),await this.paintCutout())}cutoutPoint(e){const t=this.cutoutCanvas;if(!t)return null;const i=t.getBoundingClientRect();return!i.width||!i.height?null:{x:(e.clientX-i.left)/i.width*t.width,y:(e.clientY-i.top)/i.height*t.height}}async onCutoutPointerDown(e){var s,a;const t=this.session,i=this.cutoutPoint(e);if(!(!t||!i)&&!this.showOriginal){if(e.preventDefault(),this.cutoutTool==="remove"){t.removeAt(i.x,i.y,{tolerance:this.cutoutTolerance,contiguous:this.contiguous}),await this.paintCutout();return}t.beginStroke(),this.painting=!0,(a=(s=e.target).setPointerCapture)==null||a.call(s,e.pointerId),t.paint(i.x,i.y,this.brushSize,this.cutoutTool==="add"?"add":"subtract"),await this.paintCutout()}}async onCutoutPointerMove(e){if(!this.painting||!this.session)return;const t=this.cutoutPoint(e);t&&(this.session.paint(t.x,t.y,this.brushSize,this.cutoutTool==="add"?"add":"subtract"),await this.paintCutout())}onCutoutPointerUp(){this.painting=!1}async undoCutout(){var e;(e=this.session)!=null&&e.undo()&&await this.paintCutout()}async redoCutout(){var e;(e=this.session)!=null&&e.redo()&&await this.paintCutout()}async resetCutout(){var e;(e=this.session)==null||e.reset(),await this.paintCutout()}async toggleOriginal(e){this.showOriginal=e,await this.paintCutout()}async closeCutout(){await ei(this.renderRoot.querySelector(".cutout-dialog")),this.cutout=null,this.cutoutCanvas=null,this.cutoutError="",this.session=null,this.painting=!1,this.showOriginal=!1,this.cutoutZoom=1,this.cutoutContrast=!1}cutoutName(){var t,i;return(t=this.cutout)!=null&&t.outputName?this.cutout.outputName:`${(((i=this.cutout)==null?void 0:i.name)??"cutout").replace(/\.[a-z0-9]+$/i,"").slice(0,60)||"cutout"}-cutout.png`}exportCanvas(){return this.session?this.session.compose({feather:this.cutoutFeather,spill:this.cutoutSpill}):null}async downloadCutout(){const e=this.exportCanvas();if(e)try{const t=await gt(e),i=URL.createObjectURL(t),s=document.createElement("a");s.href=i,s.download=this.cutoutName(),s.click(),setTimeout(()=>URL.revokeObjectURL(i),0)}catch(t){this.cutoutError=t.message}}async saveCutout(){const e=this.exportCanvas();if(!(!e||this.cutoutBusy)){this.cutoutBusy=!0;try{const t=await gt(e),i=this.cutoutName();await u.upload(new File([t],i,{type:"image/png"}),i),this.dispatchEvent(new CustomEvent("imported",{detail:{count:1,kind:"image",title:i},bubbles:!0,composed:!0})),this.showToast("Cut-out saved to your library."),this.closeCutout()}catch(t){this.cutoutError=t.message}finally{this.cutoutBusy=!1}}}renderCutoutDialog(){if(!this.cutout)return c;const e=this.cutoutTool!=="remove",t=Math.round(this.cutFraction*100),i=!!this.cutout.outfitShotId;return r`
      <div class="overlay" @click=${s=>{s.target===s.currentTarget&&this.closeCutout()}}>
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
              @input=${s=>this.setCutoutZoom(Number(s.target.value)/100)} />
            <output>${Math.round(this.cutoutZoom*100)}%</output>
          </div>

          <div
            class="cutout-canvas ${e?"brushing":"picking"} ${this.showOriginal?"before":""} ${this.cutoutContrast?"contrast":""}"
            @pointerdown=${s=>void this.onCutoutPointerDown(s)}
            @pointermove=${s=>void this.onCutoutPointerMove(s)}
            @pointerup=${()=>this.onCutoutPointerUp()}
            @pointercancel=${()=>this.onCutoutPointerUp()}
          ></div>

          ${this.cutoutError?r`<div class="banner">${this.cutoutError}</div>`:c}

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
            ${[["remove","colorize","Remove colour"],["subtract","ink_eraser","Erase"],["add","brush","Restore"]].map(([s,a,o])=>r`<button
                class="btn ${this.cutoutTool===s?"primary":""}"
                @click=${()=>this.cutoutTool=s}
              >
                <span class="material-symbols-rounded" style="font-size:17px;">${a}</span>
                ${o}
              </button>`)}
          </div>

          ${e?r`<div>
                <label class="field">Brush size · ${this.brushSize} px</label>
                <input type="range" min="4" max="160" step="2" .value=${String(this.brushSize)}
                  @input=${s=>this.brushSize=Number(s.target.value)} />
              </div>`:r`
                <div>
                  <label class="field">Colour tolerance · ${this.cutoutTolerance}</label>
                  <input type="range" min="4" max="140" step="2" .value=${String(this.cutoutTolerance)}
                    @input=${s=>this.cutoutTolerance=Number(s.target.value)} />
                </div>
                <label class="cut-check">
                  <input type="checkbox" .checked=${this.contiguous}
                    @change=${s=>this.contiguous=s.target.checked} />
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
              @input=${s=>{this.cutoutFeather=Number(s.target.value),this.paintCutout()}} />
          </div>
          <div>
            <label class="field">
              Spill suppression · ${Math.round(this.cutoutSpill*100)}%
            </label>
            <input type="range" min="0" max="100" step="5" .value=${String(Math.round(this.cutoutSpill*100))}
              @input=${s=>{this.cutoutSpill=Number(s.target.value)/100,this.paintCutout()}} />
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
    `}renderCharEditor(e){var i;const t=e.imageData??(e.id&&((i=this.characters.find(s=>s.id===e.id))!=null&&i.hasThumb)?`${u.characterThumbURL(e.id)}?v=${this.thumbVersion}`:void 0);return r`
      <div class="overlay" @click=${s=>{s.target===s.currentTarget&&(this.charDraft=null)}}>
        <div class="dialog">
          <h3>${e.id?"Edit character":"New character"}</h3>
          <div>
            <label class="field">Name</label>
            <input type="text" .value=${e.name} placeholder="Rin"
              @input=${s=>this.charDraft={...e,name:s.target.value}} />
          </div>
          <div>
            <label class="field">Prompt fragment</label>
            <textarea .value=${e.prompt} placeholder="1girl, red hair, green eyes, …"
              @input=${s=>this.charDraft={...e,prompt:s.target.value}}></textarea>
          </div>
          <div>
            <label class="field">Negative fragment (optional)</label>
            <textarea .value=${e.negativePrompt} placeholder="blonde, …"
              @input=${s=>this.charDraft={...e,negativePrompt:s.target.value}}></textarea>
          </div>
          <div class="dialog-thumb">
            ${t?r`<img src=${t} alt="Thumbnail" />`:r`<div class="card-blank" style="width:72px; height:96px; aspect-ratio:auto; border-radius:10px;">
                  <span class="material-symbols-rounded">person</span>
                </div>`}
            <label class="btn">
              Choose thumbnail…
              <input class="hidden-file" type="file" accept="image/*" @change=${s=>this.onCharThumbFile(s)} />
            </label>
            <label class="btn ${this.scanBusy?"disabled":""}"
              title="Read booru tags off an image and add them to the prompt">
              <span class="material-symbols-rounded" style="font-size:16px; vertical-align:-3px;">
                ${this.scanBusy?"hourglass_top":"auto_awesome"}
              </span>
              ${this.scanBusy?"Scanning…":"Scan image for tags"}
              <input class="hidden-file" type="file" accept="image/*"
                ?disabled=${this.scanBusy}
                @change=${s=>this.onCharScanFile(s)} />
            </label>
          </div>
          <div class="dialog-actions">
            ${e.id?r`<button class="btn danger" ?disabled=${this.charBusy} @click=${()=>this.deleteCharacter()}>
                  Delete
                </button>`:c}
            <button class="btn" @click=${()=>this.charDraft=null}>Cancel</button>
            <button class="btn primary" ?disabled=${!e.name.trim()||this.charBusy} @click=${()=>this.saveCharacter()}>
              Save
            </button>
          </div>
        </div>
      </div>
    `}renderPrompt(){var i,s,a,o;const e=this.outfitOn?1:this.count,t=this.activeTriggerPhrases();return r`
      <div class="prompt-card composer">
        ${this.editing?r`<div class="editing-bar">
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

        ${t.length?r`<div class="trigger-row">
          <span class="trigger-label">Trigger words</span>
          ${t.map(l=>r`<button
            class="chip small ${this.selectedTriggers.includes(l)?"on":""}"
            title="Add or remove this LoRA trigger phrase"
            @click=${()=>this.toggleTrigger(l)}>${l}</button>`)}
        </div>`:c}

        <div class="composer-bar">
          ${this.speechSupported?r`<button
                class="mic ${this.listening?"live":""}"
                title=${this.listening?"Stop listening":"Speak your idea"}
                @click=${()=>this.toggleListening()}
              >
                <span class="material-symbols-rounded">${this.listening?"stop":"mic"}</span>
              </button>`:c}
          ${this.listening||this.optimizing?r`<span class="speech-hint">${this.listening?this.speech||"Listening…":"Turning that into a prompt…"}</span>`:r`<div class="count-seg" role="group" aria-label="Pictures per run" title=${this.outfitOn?"The outfit board makes one square at a time":"Pictures per run"}>
                ${[1,2,3,4].map(l=>r`<button class=${e===l?"on":""} ?disabled=${this.outfitOn}
                  aria-pressed=${e===l?"true":"false"} @click=${()=>this.count=l}>${l}</button>`)}
              </div>
              <span class="prompt-summary">${e} picture${e===1?"":"s"} · ${this.width}×${this.height}</span>`}
          ${this.generating?r`<button class="generate cancel" type="button" ?disabled=${(i=this.progress)==null?void 0:i.cancelled} title="Stop this generation" @click=${()=>void this.cancelGeneration()}>
                <span class="material-symbols-rounded" style="font-size:19px;">close</span>
                ${(s=this.progress)!=null&&s.cancelled?"Stopping…":(a=this.progress)!=null&&a.total?`Cancel · ${this.progress.step}/${this.progress.total}`:"Cancel"}
              </button>`:r`<button class="generate" title="Generate (Ctrl+Enter)" ?disabled=${!this.assemblePrompts().prompt.trim()} @click=${()=>this.generate()}>
                <span class="material-symbols-rounded" style="font-size:20px;">auto_awesome</span>
                ${((o=this.status)==null?void 0:o.backend)==="invokeai"?"Invoke":"Generate"}
              </button>`}
        </div>
      </div>
    `}activeTriggerPhrases(){var e;return[...new Set((((e=this.status)==null?void 0:e.loras)??[]).filter(t=>t.name in this.selectedLoras).flatMap(t=>t.triggerPhrases??[]))]}renderCompletions(){return this.completions.length?r`<div class="complete" role="listbox" aria-label="Suggestions"
      @mousedown=${e=>e.preventDefault()}>
      ${this.completions.map((e,t)=>r`<button class="complete-row ${t===this.completionIndex?"on":""}"
          role="option" aria-selected=${t===this.completionIndex?"true":"false"}
          @mouseenter=${()=>this.completionIndex=t}
          @click=${()=>void this.acceptCompletion(t)}>
          <span class="complete-dot cat-${e.kind==="tag"?String(e.category??0):e.kind}"></span>
          <span class="complete-label">${e.label}</span>
          ${e.detail?r`<span class="complete-detail">${e.detail}</span>`:c}
          <span class="complete-count">${Vs(e.count)}</span>
        </button>`)}
      <div class="complete-hint">↑ ↓ choose · Tab or Enter inserts · Esc closes</div>
    </div>`:c}async applyOutfitCutout(){var s;const e=this.exportCanvas(),t=(s=this.cutout)==null?void 0:s.outfitShotId,i=this.shots.find(a=>a.id===t);if(!(!e||!t||!i||this.cutoutBusy)){this.cutoutBusy=!0;try{const a=e.toDataURL("image/png"),o=i.wipOutfitId||await this.ensureWardrobe();if(await u.putLibbyOutfitWip(o,i.outfitSlot.emotion,i.outfitSlot.tier,{imageData:a,filename:i.outfitFilename,seed:i.seed,reviewed:!0,config:i.outfitConfig,info:i.info}),!t.startsWith("wip-"))try{await u.replaceGenPreview(t,a)}catch{}const l=Date.now();this.shots=this.shots.map(n=>n.id===t?{...n,cutoutReviewed:!0,previewVersion:l,wipOutfitId:o}:n),this.persistDraft(),this.showToast("Reviewed cutout applied to this outfit state."),this.closeCutout(),this.fileSpriteToWardrobe(t,e,o)}catch(a){this.cutoutError=a.message}finally{this.cutoutBusy=!1}}}async fileSpriteToWardrobe(e,t,i){var o,l,n;const s=i||this.outfitWardrobeId;if(!s)return;const a=(o=this.shots.find(p=>p.id===e))==null?void 0:o.outfitSlot;if(a)try{await u.setLibbyEmotion(s,a.emotion,t.toDataURL("image/png"),a.tier),this.wardrobes=await u.libbyOutfits().then(h=>h.outfits),(l=this.renderRoot.querySelector("oppai-outfit-wardrobe"))==null||l.refresh();const p=((n=this.wardrobes.find(h=>h.id===s))==null?void 0:n.name)??"the wardrobe";this.showToast(`Filed ${a.tierLabel} · ${a.emotionLabel} into ${p}.`)}catch(p){this.showToast(`Saved the cutout, but filing it failed: ${p.message}`)}}async loadStudio(){if(!this.studioLoaded){this.studioLoaded=!0;try{const[e,t]=await Promise.all([u.libbyLoadouts(),u.libbyOutfits()]);if(this.loadouts=e.loadouts,this.wardrobes=t.outfits,this.outfitWardrobeId&&!this.wardrobes.some(i=>i.id===this.outfitWardrobeId)&&(this.outfitWardrobeId=""),this.outfitLoadoutId&&!this.loadouts.some(i=>i.id===this.outfitLoadoutId)&&(this.outfitLoadoutId=""),!this.outfitWardrobeId){const i=[...this.wardrobes].sort((s,a)=>(a.wip??0)-(s.wip??0))[0];i!=null&&i.wip&&(this.outfitWardrobeId=i.id)}await this.loadWipBoard(this.outfitWardrobeId)}catch(e){this.showToast(`Couldn't load your saved outfits: ${e.message}`),this.studioLoaded=!1}}}loadoutBody(){return{version:1,gear:this.outfitGear,theme:this.outfitText.trim(),background:this.outfitBackground,underwearColor:this.outfitUnderwearColor,pubicHair:this.outfitPubicHair,pubicHairColor:this.outfitPubicHairColor,lockColors:this.outfitLockColors,shot:this.camera.shot}}applyLoadout(e){const t=e.loadout??{},i=(a,o)=>typeof t[a]=="string"?t[a]:o;this.outfitGear=vt(t.gear),this.outfitText=i("theme",e.name),this.outfitBackground=t.background==="black"?"black":"white",this.outfitUnderwearColor=i("underwearColor",this.outfitUnderwearColor),this.outfitPubicHair=t.pubicHair===!0,this.outfitPubicHairColor=i("pubicHairColor",this.outfitPubicHairColor),this.outfitLockColors=t.lockColors!==!1;const s=i("shot","");s&&Ae.shots.some(a=>a.id===s)&&this.editCamera({shot:s}),this.outfitLoadoutId=e.id,this.outfitOn=!0,this.persistDraft(),this.showToast(`Equipped “${e.name}”.`)}async saveLoadout(e){var o;if(this.loadoutBusy)return;const t=this.outfitText.trim(),i=this.loadouts.find(l=>l.id===this.outfitLoadoutId),s=e?t:(i==null?void 0:i.name)??t,a=(o=window.prompt("Name this loadout",s||"New loadout"))==null?void 0:o.trim();if(a){this.loadoutBusy=!0;try{const l=await u.saveLibbyLoadout({id:e?void 0:this.outfitLoadoutId||void 0,name:a,loadout:this.loadoutBody()});this.outfitLoadoutId=l.id,this.loadouts=(await u.libbyLoadouts()).loadouts,this.persistDraft(),this.showToast(`Saved “${l.name}”.`)}catch(l){this.showToast(l.message)}finally{this.loadoutBusy=!1}}}async deleteLoadout(e){if(!(this.loadoutBusy||!window.confirm(`Delete the loadout “${e.name}”?`))){this.loadoutBusy=!0;try{await u.deleteLibbyLoadout(e.id),this.loadouts=this.loadouts.filter(t=>t.id!==e.id),this.outfitLoadoutId===e.id&&(this.outfitLoadoutId=""),this.showToast(`Deleted “${e.name}”.`)}catch(t){this.showToast(t.message)}finally{this.loadoutBusy=!1}}}async setLoadoutCoverFromSelection(){const e=this.loadouts.find(i=>i.id===this.outfitLoadoutId);if(!e||this.loadoutBusy)return;const t=this.shotAt(this.outfitSlot().slot)??this.currentOutfitShots()[0];if(!t){this.showToast("Generate a square first — its picture becomes the cover.");return}this.loadoutBusy=!0;try{const i=await fetch(this.previewURL(t),{credentials:"same-origin"});if(!i.ok)throw new Error(`preview returned ${i.status}`);const s=await Ce(await i.blob());await u.setLibbyLoadoutThumb(e.id,s),this.loadoutCoverVersion=Date.now(),this.loadouts=(await u.libbyLoadouts()).loadouts,this.showToast("Cover updated.")}catch(i){this.showToast(i.message)}finally{this.loadoutBusy=!1}}async createWardrobe(){var t;const e=(t=window.prompt("Name the wardrobe these sprites go into",this.outfitText.trim()||"New wardrobe"))==null?void 0:t.trim();if(e)try{const i=await u.saveLibbyOutfit({name:e});this.wardrobes=(await u.libbyOutfits()).outfits,this.outfitWardrobeId=i.id,this.persistDraft(),await this.loadWipBoard(i.id),this.showToast(`Squares will be kept in “${i.name}”.`)}catch(i){this.showToast(i.message)}}promptArea(e){return this.renderRoot.querySelector(e==="prompt"?".prompt-area":".negative-area")}onPromptTyping(e){var l;const t=this.promptArea(e);if(!t)return;const i=Us(t.value,t.selectionStart??t.value.length),s=++this.completionSeq;if(window.clearTimeout(this.completionTimer),this.completionField=e,this.completionToken=i,!i){this.closeCompletions();return}const a={loras:(((l=this.status)==null?void 0:l.loras)??[]).map(n=>({name:n.name,alias:n.alias,weight:n.weight})),wildcards:this.wildcards.map(n=>({name:n.name,lines:n.entries.length})),triggers:e==="prompt"?this.activeTriggerPhrases():[]},o=Ws(i,a);if(i.mode!=="tag"||i.query.length<2){this.showCompletions(o);return}o.length&&this.showCompletions(o),this.completionTimer=window.setTimeout(async()=>{try{const n=await u.booruTags(i.query,10);if(s!==this.completionSeq)return;const h=(n.items??n.suggestions.map(f=>({tag:f,category:0,count:0}))).map(f=>({kind:"tag",label:f.tag,insert:It(f.tag),category:f.category,count:f.count,detail:"alias"in f&&f.alias?`“${f.alias}”`:void 0}));!h.length&&n.correction&&h.push({kind:"tag",label:n.correction,insert:It(n.correction),detail:"did you mean"}),this.showCompletions(Hs(o,h,10))}catch{s===this.completionSeq&&this.showCompletions(o)}},110)}showCompletions(e){const t=this.completionToken,i=this.promptArea(this.completionField),s=t&&i?i.value.slice(t.start,t.end).trim().toLowerCase():"";e.length===1&&e[0].insert.toLowerCase()===s&&(e=[]),this.completions=e,this.completionIndex=e.length?0:-1}closeCompletions(){this.completionSeq++,window.clearTimeout(this.completionTimer),this.completions=[],this.completionIndex=-1}closeCompletionsSoon(){window.setTimeout(()=>{this.renderRoot.activeElement!==this.promptArea(this.completionField)&&this.closeCompletions()},120)}onPromptKey(e,t){if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault(),this.closeCompletions(),!this.generating&&this.assemblePrompts().prompt.trim()&&this.generate();return}if(!(!this.completions.length||this.completionField!==t))switch(e.key){case"ArrowDown":case"ArrowUp":e.preventDefault(),this.completionIndex=Ks(this.completionIndex,this.completions.length,e.key==="ArrowDown"?1:-1);break;case"Tab":case"Enter":if(e.shiftKey||e.altKey||this.completionIndex<0)return;e.preventDefault(),this.acceptCompletion(this.completionIndex);break;case"Escape":e.preventDefault(),e.stopPropagation(),this.closeCompletions();break}}async acceptCompletion(e){var l;const t=this.completions[e],i=this.completionToken,s=this.completionField,a=this.promptArea(s);if(!t||!i||!a)return;let o=Dt(a.value,i,t.insert);if(t.kind==="lora"){const n=((l=/^<lora:(.*):[^:]*>$/.exec(t.insert))==null?void 0:l[1])??"";o=Dt(a.value,i,""),n&&!(n in this.selectedLoras)&&this.toggleLora(n),this.showToast(`${t.label} is on — its weight is in the recipe above`)}s==="prompt"?this.prompt=o.text:this.negative=o.text,this.closeCompletions(),await this.updateComplete,a.value=o.text,a.focus(),a.setSelectionRange(o.caret,o.caret)}renderPromptOptions(){return r`
      <div>
        <label class="field">Resolution</label>
        <div class="chips">
          ${Je.map(e=>{const t=e.w===this.width&&e.h===this.height;return r`<button
              class="chip ${t?"on":""}"
              @click=${()=>{this.width=e.w,this.height=e.h}}
            >${e.label}<span class="hint">${e.hint}</span></button>`})}
        </div>
      </div>
      <div class="custom-size">
        <div>
          <label class="field">Width</label>
          <input class="num" type="number" min="64" max="2048" step="8" .value=${String(this.width)}
            @input=${e=>this.width=se(e.target.value,64,2048,512)} />
        </div>
        <span class="material-symbols-rounded" style="margin-top:22px; color:var(--oppai-text-muted);">close</span>
        <div>
          <label class="field">Height</label>
          <input class="num" type="number" min="64" max="2048" step="8" .value=${String(this.height)}
            @input=${e=>this.height=se(e.target.value,64,2048,768)} />
        </div>
      </div>
    `}renderGenInfo(e){const t=e.info;return t?r`
      <div class="geninfo">
        <pre class="geninfo-text">${oe(t)}</pre>
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
    `:r`<div class="geninfo">
        <p class="geninfo-note">
          No data was recorded for this image — it was restored from a saved draft by an
          older build. Generate again to capture it.
        </p>
      </div>`}nodePosition(e,t){const i=this.defaultNodePosition(t);return{x:e.workspaceX??i.workspaceX,y:e.workspaceY??i.workspaceY}}beginNodeDrag(e,t,i){var a,o;if(i.button!==0)return;i.preventDefault();const s=this.nodePosition(e,t);this.activeNodeId=e.id,this.draggingNode={id:e.id,pointerId:i.pointerId,clientX:i.clientX,clientY:i.clientY,x:s.x,y:s.y},(o=(a=i.currentTarget).setPointerCapture)==null||o.call(a,i.pointerId)}moveNode(e){const t=this.draggingNode;if(!t||t.pointerId!==e.pointerId)return;e.preventDefault();const i=Math.max(0,Math.round(t.x+e.clientX-t.clientX)),s=Math.max(0,Math.round(t.y+e.clientY-t.clientY));this.shots=this.shots.map(a=>a.id===t.id?{...a,workspaceX:i,workspaceY:s}:a)}endNodeDrag(e){!this.draggingNode||this.draggingNode.pointerId!==e.pointerId||(this.draggingNode=null,this.persistDraft())}clearWorkspace(){!this.shots.length||!confirm("Clear every generated image from this workspace? Unsaved previews will no longer be shown.")||(this.shots=[],this.expandedShot=null,this.infoFor=null,this.activeNodeId=null,this.outfitProgress="",this.persistDraft())}async deleteOutfitSquare(e){const t=e.outfitSlot;if(t&&confirm(`Delete the ${t.tierLabel} · ${t.emotionLabel} square? It will need generating again.`))try{e.wipOutfitId&&await u.deleteLibbyOutfitWip(e.wipOutfitId,t.emotion,t.tier),e.id.startsWith("wip-")||await u.deleteGenPreview(e.id).catch(()=>{}),this.shots=this.shots.filter(i=>i.id!==e.id),this.persistDraft(),this.showToast(`Deleted ${t.tierLabel} · ${t.emotionLabel}.`)}catch(i){this.showToast(i.message)}}renderResults(){var s;if(!this.shots.length)return r`<div class="canvas-empty">
        <span class="material-symbols-rounded">image</span>
        <strong>Your generation canvas</strong>
        <span>Pick a model, write a prompt, and press ${((s=this.status)==null?void 0:s.backend)==="invokeai"?"Invoke":"Generate"} — or Ctrl+Enter from the prompt.</span>
      </div>`;const e=this.shots.map((a,o)=>this.nodePosition(a,o)),t=Math.max(600,...e.map(a=>a.x+290)),i=Math.max(480,...e.map(a=>a.y+450));return r`
      <div class="results" style=${`width:${t}px;height:${i}px;`}>
        ${this.shots.map((a,o)=>{var n;const l=e[o];return r`
            <div class="shot ${this.activeNodeId===a.id?"active":""}"
              style=${`left:${l.x}px;top:${l.y}px;`}>
              <div class="node-handle"
                title="Drag to move this image"
                @pointerdown=${p=>this.beginNodeDrag(a,o,p)}
                @pointermove=${p=>this.moveNode(p)}
                @pointerup=${p=>this.endNodeDrag(p)}
                @pointercancel=${p=>this.endNodeDrag(p)}>
                <span class="material-symbols-rounded" style="font-size:16px;">drag_indicator</span>
                <span class="node-title">${a.outfitSlot?`${a.outfitSlot.tierLabel} · ${a.outfitSlot.emotionLabel}`:`Seed ${a.seed}`}</span>
              </div>
              <img
                src=${this.previewURL(a)}
                alt="Generated image"
                loading="lazy"
                style="cursor: zoom-in;"
                title="Expand"
                @click=${()=>this.expandedShot=a}
                @contextmenu=${p=>this.openShotMenu(a,p)}
              />
              ${a.outfitSlot?r`<div class="shot-slot">
                ${a.outfitSlot.tierLabel} · ${a.outfitSlot.emotionLabel}
              </div>`:c}
              <div class="shot-actions">
                <button class="act primary" ?disabled=${a.saved} @click=${()=>this.save(a)}>
                  <span class="material-symbols-rounded" style="font-size:16px;"
                    >${a.saved?"check":"save"}</span
                  >
                  ${a.saved?"Saved":"Save"}
                </button>
                <button class="act" title=${a.outfitSlot?a.cutoutReviewed?"Review or adjust this outfit cutout again":"Review the automatic cutout by hand":"Cut the background out"}
                  @click=${()=>void this.openCutout(this.previewURL(a),`seed-${a.seed}`,a.outfitFilename,a.outfitSlot?a.id:void 0)}>
                  <span class="material-symbols-rounded" style="font-size:16px;">background_replace</span>
                  ${a.outfitSlot?a.cutoutReviewed?"Reviewed":"Review cutout":c}
                </button>
                ${(n=this.status)!=null&&n.manageModels?r`<button class="act"
                  title="Use as this model's cover" @click=${()=>this.useAsModelThumb(a)}>
                  <span class="material-symbols-rounded" style="font-size:16px;">photo_camera</span>
                </button>`:c}
                <button class="act" title="Copy this image's generation data"
                  @click=${()=>this.infoFor=this.infoFor===a.id?null:a.id}>
                  <span class="material-symbols-rounded" style="font-size:16px;">content_copy</span>
                </button>
                <button class="act" title="Export PNG with Civitai-compatible metadata"
                  @click=${()=>void this.exportShot(a)}>
                  <span class="material-symbols-rounded" style="font-size:16px;">download</span>
                </button>
              </div>
              ${this.infoFor===a.id?this.renderGenInfo(a):c}
            </div>
          `})}
      </div>
    `}};m.styles=[re,Ie,ie`
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
        grid-template-columns: 92px repeat(${F.length}, var(--cell, 88px));
        gap: 6px;
        align-items: stretch;
        width: max-content;
        min-width: 100%;
      }
      .face-matrix.fit { grid-template-columns: 92px repeat(${F.length}, minmax(0, 1fr)); width: 100%; min-width: 0; }
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
    `];m.DRAFT_FIELDS=new Set(["prompt","negative","checkpoint","vae","templateId","scheduler","width","height","steps","cfg","cfgRescale","clipSkip","seamlessX","seamlessY","vaePrecision","cpuNoise","count","seed","board","selectedLoras","selectedTriggers","selectedChars","selectedPoses","outfitOn","outfitText","outfitGear","outfitFace","outfitMisc","outfitMiscBatch","outfitTier","outfitBackground","outfitLockColors","outfitLoadoutId","outfitWardrobeId","sheetZoom","outfitUnderwearColor","outfitPubicHair","outfitPubicHairColor","camera","detailerEnabled","detailerModel","detailerPrompt","detailerNegative","detailerConfidence","detailerDenoise","detailerMaskBlur","open","showOptions","shots"]);b([E({type:Boolean})],m.prototype,"studio",2);b([d()],m.prototype,"status",2);b([d()],m.prototype,"checkpoint",2);b([d()],m.prototype,"vae",2);b([d()],m.prototype,"templateId",2);b([d()],m.prototype,"showBuiltInTemplates",2);b([d()],m.prototype,"selectedLoras",2);b([d()],m.prototype,"selectedTriggers",2);b([d()],m.prototype,"loraPage",2);b([d()],m.prototype,"outfitOn",2);b([d()],m.prototype,"outfitText",2);b([d()],m.prototype,"outfitGear",2);b([d()],m.prototype,"outfitFace",2);b([d()],m.prototype,"outfitMisc",2);b([d()],m.prototype,"outfitMiscBatch",2);b([d()],m.prototype,"outfitTier",2);b([d()],m.prototype,"outfitBackground",2);b([d()],m.prototype,"outfitUnderwearColor",2);b([d()],m.prototype,"outfitPubicHair",2);b([d()],m.prototype,"outfitPubicHairColor",2);b([d()],m.prototype,"outfitLockColors",2);b([d()],m.prototype,"gearPromptOpen",2);b([d()],m.prototype,"outfitBatchRunning",2);b([d()],m.prototype,"outfitExporting",2);b([d()],m.prototype,"outfitProgress",2);b([d()],m.prototype,"loadouts",2);b([d()],m.prototype,"outfitLoadoutId",2);b([d()],m.prototype,"loadoutBusy",2);b([d()],m.prototype,"loadoutCoverVersion",2);b([d()],m.prototype,"wardrobes",2);b([d()],m.prototype,"outfitWardrobeId",2);b([d()],m.prototype,"studioView",2);b([d()],m.prototype,"sheetTab",2);b([d()],m.prototype,"sheetZoom",2);b([d()],m.prototype,"showSquarePrompt",2);b([d()],m.prototype,"camera",2);b([d()],m.prototype,"cutout",2);b([d()],m.prototype,"cutoutTolerance",2);b([d()],m.prototype,"cutoutBusy",2);b([d()],m.prototype,"cutoutError",2);b([Et(".cutout-canvas")],m.prototype,"cutoutHost",2);b([d()],m.prototype,"cutoutTool",2);b([d()],m.prototype,"cutoutFeather",2);b([d()],m.prototype,"cutoutSpill",2);b([d()],m.prototype,"cutoutZoom",2);b([d()],m.prototype,"cutoutContrast",2);b([d()],m.prototype,"contiguous",2);b([d()],m.prototype,"brushSize",2);b([d()],m.prototype,"showOriginal",2);b([d()],m.prototype,"canUndo",2);b([d()],m.prototype,"canRedo",2);b([d()],m.prototype,"cutFraction",2);b([d()],m.prototype,"characters",2);b([d()],m.prototype,"selectedChars",2);b([d()],m.prototype,"charDraft",2);b([d()],m.prototype,"charBusy",2);b([d()],m.prototype,"scanBusy",2);b([d()],m.prototype,"poses",2);b([d()],m.prototype,"selectedPoses",2);b([d()],m.prototype,"poseDraft",2);b([d()],m.prototype,"poseBusy",2);b([d()],m.prototype,"wildcards",2);b([d()],m.prototype,"wildcardDraft",2);b([d()],m.prototype,"wildcardBusy",2);b([E({type:Number})],m.prototype,"editMedia",2);b([d()],m.prototype,"editing",2);b([d()],m.prototype,"open",2);b([d()],m.prototype,"speech",2);b([d()],m.prototype,"listening",2);b([d()],m.prototype,"optimizing",2);b([d()],m.prototype,"prompt",2);b([d()],m.prototype,"completions",2);b([d()],m.prototype,"completionIndex",2);b([d()],m.prototype,"completionField",2);b([d()],m.prototype,"createTab",2);b([d()],m.prototype,"pickerFilter",2);b([d()],m.prototype,"negative",2);b([d()],m.prototype,"showOptions",2);b([d()],m.prototype,"width",2);b([d()],m.prototype,"height",2);b([d()],m.prototype,"steps",2);b([d()],m.prototype,"cfg",2);b([d()],m.prototype,"cfgRescale",2);b([d()],m.prototype,"clipSkip",2);b([d()],m.prototype,"seamlessX",2);b([d()],m.prototype,"seamlessY",2);b([d()],m.prototype,"vaePrecision",2);b([d()],m.prototype,"cpuNoise",2);b([d()],m.prototype,"board",2);b([d()],m.prototype,"scheduler",2);b([d()],m.prototype,"count",2);b([d()],m.prototype,"seed",2);b([d()],m.prototype,"detailerEnabled",2);b([d()],m.prototype,"detailerModel",2);b([d()],m.prototype,"detailerPrompt",2);b([d()],m.prototype,"detailerNegative",2);b([d()],m.prototype,"detailerConfidence",2);b([d()],m.prototype,"detailerDenoise",2);b([d()],m.prototype,"detailerMaskBlur",2);b([d()],m.prototype,"generating",2);b([d()],m.prototype,"progress",2);b([d()],m.prototype,"shots",2);b([d()],m.prototype,"activeNodeId",2);b([d()],m.prototype,"restoredNotice",2);b([d()],m.prototype,"infoFor",2);b([d()],m.prototype,"error",2);b([d()],m.prototype,"toast",2);b([d()],m.prototype,"thumbVersion",2);b([d()],m.prototype,"failedThumbs",2);b([d()],m.prototype,"expandedShot",2);b([d()],m.prototype,"metaDraft",2);b([d()],m.prototype,"metaBusy",2);b([d()],m.prototype,"metaTriggerText",2);b([d()],m.prototype,"civitaiOpen",2);b([d()],m.prototype,"trainOpen",2);b([Et("oppai-invoke-gallery")],m.prototype,"galleryPanel",2);m=b([le("oppai-imagegen")],m);function Ce(e){return new Promise((t,i)=>{const s=new FileReader;s.onload=()=>t(String(s.result)),s.onerror=()=>i(new Error("couldn't read the image")),s.readAsDataURL(e)})}export{m as OppaiImageGen};
