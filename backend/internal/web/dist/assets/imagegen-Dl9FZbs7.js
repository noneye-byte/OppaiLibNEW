import{z as ue,i as re,u as c,a as me,B as ha,e as m,m as F,C as Ri,A as d,b as r,D as ua,l as nt,t as ge,q as Oe,v as z,x as ma,E as ye,F as ot,G as ga,H as js,I as qs,j as fa,J as ba,K as va,L as xa,M as ya,w as wa}from"./index-_4WzDYMd.js";import{e as Pt}from"./query-__j_ZMY6.js";import{c as $a,a as ka,b as Sa,s as Ca,d as za,e as Ve,w as Ta,f as Pa,g as La,S as qe,h as Ma,i as Ia}from"./clip-models-B1Bs0TTp.js";function Ws(e){return e.faces*e.tiers}function Da(e,t){const i=Ws(t);if(e>=i){const a=Math.min(e-i,t.miscIds.length-1);return{tier:0,face:0,misc:t.miscIds[Math.max(0,a)]??""}}const s=Math.max(0,Math.min(e,i-1));return{tier:Math.floor(s/t.faces),face:s%t.faces,misc:""}}function Ra(e,t,i,s){const a=i?s.miscIds.indexOf(i):-1;return a>=0?Ws(s)+a:t+e*s.faces}function be(e){return`${e.emotion}:${e.tier}`}function Ee(e,t,i,s){if(e.trim()==="")return s;const a=Number(e);return Number.isFinite(a)?Math.min(i,Math.max(t,Math.round(a))):s}function We(e,t,i,s){if(e.trim()==="")return s;const a=Number(e);return Number.isFinite(a)?Math.min(i,Math.max(t,a)):s}function Oa(e,t){var i,s,a,o,n,l,p;return{prompt:e.prompt,negativePrompt:e.negativePrompt??"",model:e.checkpoint??"",modelHash:t.modelHash||void 0,vae:e.vae??"",vaePrecision:e.vaePrecision??"fp32",sampler:e.sampler??"",seed:t.seed,steps:e.steps??0,cfgScale:e.cfgScale??0,cfgRescale:e.cfgRescale??0,clipSkip:e.clipSkip??0,width:e.width??0,height:e.height??0,seamlessX:!!e.seamlessX,seamlessY:!!e.seamlessY,cpuNoise:e.cpuNoise!==!1,loras:(e.loras??[]).map(u=>{var h;return{name:u.name,weight:u.weight,hash:((h=t.loraHashes)==null?void 0:h[u.name])||void 0}}),triggers:t.triggers??[],characters:t.characters??[],poses:(i=t.poses)!=null&&i.length?t.poses:void 0,outfit:t.outfit||void 0,controlImage:t.controlImage||void 0,startedFrom:e.initImage||e.initGallery?t.startedFrom:void 0,denoise:(e.initImage||e.initGallery)&&!e.detailOnly?e.denoise:void 0,refiner:(s=e.detailer)!=null&&s.enabled&&!e.upscaleOnly?{model:((a=e.detailer.models)==null?void 0:a[0])??e.detailer.model??"",models:(((o=e.detailer.models)==null?void 0:o.length)??0)>1?e.detailer.models:void 0,prompt:e.detailer.prompt??"",negativePrompt:e.detailer.negativePrompt??"",confidence:e.detailer.confidence??0,denoise:e.detailer.denoise??0,maskBlur:e.detailer.maskBlur??0,custom:(n=e.detailer.custom)!=null&&n.length?e.detailer.custom:void 0}:void 0,regions:(l=e.regions)!=null&&l.enabled&&!e.initImage&&!e.initGallery?e.regions:void 0,hires:(p=e.upscale)!=null&&p.enabled&&!e.upscaleOnly&&!e.initImage&&!e.initGallery?{upscaler:e.upscale.upscaler??"",scale:e.upscale.scale??2,denoise:e.upscale.denoise,steps:e.upscale.steps||void 0}:void 0,upscaled:e.upscaleOnly&&e.upscale?{upscaler:e.upscale.upscaler??"",scale:e.upscale.scale??2}:void 0,board:e.board&&e.board!=="none"?e.board:void 0,backend:t.backend,seconds:t.seconds,at:Date.now()}}function Ne(e){const t=e.loras.filter(n=>!e.prompt.includes(`<lora:${n.name}:`)).map(n=>`<lora:${n.name}:${n.weight}>`).join(" "),s=[[e.prompt,t].filter(Boolean).join(" ")];e.negativePrompt&&s.push(`Negative prompt: ${e.negativePrompt}`);const a=[`Steps: ${e.steps}`,`Sampler: ${e.sampler||"default"}`,`CFG scale: ${e.cfgScale}`,`Seed: ${e.seed}`,`Size: ${e.width}x${e.height}`];e.model&&a.push(`Model: ${e.model}`),e.modelHash&&a.push(`Model hash: ${e.modelHash}`),e.vae&&a.push(`VAE: ${e.vae}`),e.clipSkip>0&&a.push(`Clip skip: ${e.clipSkip}`),e.cfgRescale>0&&a.push(`CFG Rescale: ${e.cfgRescale}`);const o=e.loras.filter(n=>n.hash);if(o.length&&a.push(`Lora hashes: "${o.map(n=>`${n.name}: ${n.hash}`).join(", ")}"`),(e.seamlessX||e.seamlessY)&&a.push(`Seamless: ${[e.seamlessX?"x":"",e.seamlessY?"y":""].filter(Boolean).join("+")}`),e.clip){const n=e.clip;n.frames&&a.push(`Frames: ${n.frames}`),n.fps&&a.push(`FPS: ${n.fps}`),n.shift&&a.push(`Shift: ${n.shift}`),n.scheduler&&a.push(`Schedule type: ${n.scheduler}`),n.lowModel&&a.push(`Low noise model: ${n.lowModel}`),n.textEncoder&&a.push(`Text encoder: ${n.textEncoder}`),n.from&&a.push(`Video from: ${n.from}`),n.loop&&a.push("Loop: true")}else e.vaePrecision&&a.push(`VAE precision: ${e.vaePrecision}`),e.cpuNoise||a.push("Noise device: gpu");return e.hires&&(a.push(`Hires upscale: ${e.hires.scale}`),e.hires.steps&&a.push(`Hires steps: ${e.hires.steps}`),a.push(`Hires upscaler: ${e.hires.upscaler}`),e.hires.denoise!==void 0&&e.denoise===void 0&&a.push(`Denoising strength: ${e.hires.denoise}`)),e.upscaled&&a.push(`Upscaled: ${e.upscaled.scale}x with ${e.upscaled.upscaler}`),e.refiner&&(a.push(`ADetailer model: ${e.refiner.model}`),(e.refiner.models??[]).slice(1).forEach((n,l)=>a.push(`ADetailer model ${Aa(l+2)}: ${n}`)),a.push(`ADetailer confidence: ${e.refiner.confidence}`),a.push(`ADetailer denoising strength: ${e.refiner.denoise}`),a.push(`ADetailer mask blur: ${e.refiner.maskBlur}`),e.refiner.prompt&&a.push(`ADetailer prompt: ${e.refiner.prompt}`),e.refiner.negativePrompt&&a.push(`ADetailer negative prompt: ${e.refiner.negativePrompt}`)),e.triggers.length&&a.push(`Trigger phrases: ${e.triggers.join(" ")}`),e.characters.length&&a.push(`Characters: ${e.characters.join(", ")}`),e.controlImage&&a.push(`Control image: ${e.controlImage}`),e.denoise!==void 0&&a.push(`Denoising strength: ${e.denoise}`),e.startedFrom&&a.push(`Started from: ${e.startedFrom.name} (${e.startedFrom.mode})`),e.board&&a.push(`Board: ${e.board}`),a.push(`Backend: ${e.backend}`),e.seconds!==void 0&&a.push(`Generation time: ${e.seconds.toFixed(1)}s`),s.push(a.join(", ")),s.join(`
`)}function Aa(e){return e===2?"2nd":e===3?"3rd":`${e}th`}function rt(e){return JSON.stringify(e,null,2)}function Gs(e){var t,i;return{prompt:e.prompt??"",negativePrompt:e.negativePrompt??"",model:e.model??"",modelHash:e.modelHash||void 0,vae:e.vae??"",vaePrecision:e.vaePrecision||"fp32",sampler:e.sampler??"",seed:e.seed??0,steps:e.steps??0,cfgScale:e.cfgScale??0,cfgRescale:e.cfgRescale??0,clipSkip:e.clipSkip??0,width:e.width??0,height:e.height??0,seamlessX:!!e.seamlessX,seamlessY:!!e.seamlessY,cpuNoise:e.cpuNoise!==!1,loras:e.loras??[],triggers:e.triggers??[],characters:e.characters??[],denoise:e.denoise||void 0,refiner:e.refiner,regions:(i=(t=e.regions)==null?void 0:t.parts)!=null&&i.length?e.regions:void 0,hires:e.hires,upscaled:e.upscaled,startedFrom:e.startedFrom,clip:e.clip,backend:e.backend||"invokeai",at:e.at||Date.now()}}function Ea(e,t){var s;const i=Math.round(t.scale*(((s=e.upscaled)==null?void 0:s.scale)??1)*100)/100;return{...e,width:t.width,height:t.height,upscaled:{upscaler:t.upscaler,scale:i},startedFrom:{name:t.name,mode:"upscale"},seconds:t.seconds,at:Date.now()}}function _a(e){var t,i;return{prompt:e.prompt,negativePrompt:e.negativePrompt||void 0,checkpoint:e.model||void 0,vae:e.vae||void 0,sampler:e.sampler||void 0,seed:e.seed,steps:e.steps,cfgScale:e.cfgScale,cfgRescale:e.cfgRescale,clipSkip:e.clipSkip,width:e.width,height:e.height,seamlessX:e.seamlessX,seamlessY:e.seamlessY,vaePrecision:e.vaePrecision==="fp16"?"fp16":"fp32",cpuNoise:e.cpuNoise,count:1,loras:e.loras.map(({name:s,weight:a})=>({name:s,weight:a})),detailer:e.refiner?{enabled:!0,...e.refiner}:void 0,upscale:e.hires?{enabled:!0,...e.hires}:void 0,regions:(i=(t=e.regions)==null?void 0:t.parts)!=null&&i.length?{...e.regions,enabled:!0}:void 0,board:e.board}}async function si(e){var t;try{if((t=navigator.clipboard)!=null&&t.writeText)return await navigator.clipboard.writeText(e),!0}catch{}try{const i=document.createElement("textarea");i.value=e,i.setAttribute("readonly",""),i.style.position="fixed",i.style.top="-1000px",document.body.appendChild(i),i.select();const s=document.execCommand("copy");return document.body.removeChild(i),s}catch{return!1}}const Ti="oppai_gen_draft",ai=1,Ba=720*60*60*1e3;function Fa(e){try{const t={...e,version:ai,at:Date.now()};localStorage.setItem(Ti,JSON.stringify(t))}catch{}}function Na(){let e=null;try{e=localStorage.getItem(Ti)}catch{return null}if(!e)return null;let t;try{t=JSON.parse(e)}catch{return wt(),null}if(!t||typeof t!="object")return null;const i=t;if(i.version!==ai)return wt(),null;const s=typeof i.at=="number"?i.at:0;if(!s||Date.now()-s>Ba)return wt(),null;const a={version:ai,at:s},o=p=>{const u=i[p];typeof u=="string"&&(a[p]=u)},n=p=>{const u=i[p];typeof u=="boolean"&&(a[p]=u)},l=p=>{const u=i[p];typeof u=="number"&&Number.isFinite(u)&&(a[p]=u)};if(["prompt","negative","checkpoint","vae","templateId","scheduler","board","outfitText","outfitMisc","outfitUnderwearColor","outfitPubicHairColor","outfitLoadoutId","outfitWardrobeId","detailerModel","detailerPrompt","detailerNegative","hiresUpscaler","upscaleUpscaler"].forEach(o),["width","height","steps","cfg","cfgRescale","clipSkip","count","seed","outfitFace","outfitTier","detailerConfidence","detailerDenoise","detailerMaskBlur","hiresScale","hiresDenoise","hiresSteps","upscaleBy","scrollTop"].forEach(l),["seamlessX","seamlessY","cpuNoise","outfitOn","outfitCutout","outfitPubicHair","outfitLockColors","outfitMiscBatch","detailerEnabled","detailerFaces","detailerHands","hiresEnabled","showOptions"].forEach(n),(i.vaePrecision==="fp16"||i.vaePrecision==="fp32")&&(a.vaePrecision=i.vaePrecision),(i.outfitBackground==="black"||i.outfitBackground==="white")&&(a.outfitBackground=i.outfitBackground),i.camera&&typeof i.camera=="object"&&!Array.isArray(i.camera)){const p={};for(const[u,h]of Object.entries(i.camera))(typeof h=="string"||typeof h=="boolean")&&(p[u]=h);Object.keys(p).length&&(a.camera=p)}return qa(i.selectedLoras)&&(a.selectedLoras=i.selectedLoras),It(i.selectedTriggers)&&(a.selectedTriggers=i.selectedTriggers),It(i.selectedChars)&&(a.selectedChars=i.selectedChars),It(i.selectedPoses)&&(a.selectedPoses=i.selectedPoses),Ua(i.outfitGear)&&(a.outfitGear=i.outfitGear),Array.isArray(i.shots)&&(a.shots=i.shots.filter(p=>!!p&&typeof p=="object"&&typeof p.id=="string"&&typeof p.seed=="number").map(p=>({id:p.id,seed:p.seed,saved:!!p.saved,info:p.info,...typeof p.outfitFilename=="string"?{outfitFilename:p.outfitFilename}:{},...ja(p.outfitSlot)?{outfitSlot:p.outfitSlot}:{},...typeof p.outfitConfig=="string"?{outfitConfig:p.outfitConfig}:{},...typeof p.cutoutReviewed=="boolean"?{cutoutReviewed:p.cutoutReviewed}:{},...typeof p.wipOutfitId=="string"?{wipOutfitId:p.wipOutfitId}:{},...typeof p.previewVersion=="number"&&Number.isFinite(p.previewVersion)?{previewVersion:p.previewVersion}:{}}))),a}function Ua(e){return!!e&&typeof e=="object"&&!Array.isArray(e)}function ja(e){if(!e||typeof e!="object"||Array.isArray(e))return!1;const t=e;return typeof t.emotion=="string"&&typeof t.emotionLabel=="string"&&typeof t.tier=="number"&&Number.isInteger(t.tier)&&typeof t.tierLabel=="string"&&typeof t.index=="number"&&Number.isInteger(t.index)}function wt(){try{localStorage.removeItem(Ti)}catch{}}function It(e){return Array.isArray(e)&&e.every(t=>typeof t=="string")}function qa(e){return!!e&&typeof e=="object"&&!Array.isArray(e)&&Object.values(e).every(t=>typeof t=="number"&&Number.isFinite(t))}const Ke=new Uint8Array([137,80,78,71,13,10,26,10]),oi=new TextEncoder;function Wa(e,t){return(e[t]<<24|e[t+1]<<16|e[t+2]<<8|e[t+3])>>>0}function Oi(e,t,i){e[t]=i>>>24&255,e[t+1]=i>>>16&255,e[t+2]=i>>>8&255,e[t+3]=i&255}let ct;function Ga(e){if(!ct){ct=new Uint32Array(256);for(let i=0;i<256;i++){let s=i;for(let a=0;a<8;a++)s=s&1?3988292384^s>>>1:s>>>1;ct[i]=s>>>0}}let t=4294967295;for(const i of e)t=ct[(t^i)&255]^t>>>8;return(t^4294967295)>>>0}function Ai(e,t){const i=oi.encode(e),s=new Uint8Array(12+t.length);Oi(s,0,t.length),s.set(i,4),s.set(t,8);const a=new Uint8Array(i.length+t.length);return a.set(i),a.set(t,i.length),Oi(s,s.length-4,Ga(a)),s}function Ei(e,t){const i=[...t].every(n=>(n.codePointAt(0)??256)<=255),s=oi.encode(e);if(i){const n=Uint8Array.from([...t],p=>p.codePointAt(0)??0),l=new Uint8Array(s.length+1+n.length);return l.set(s),l.set(n,s.length+1),Ai("tEXt",l)}const a=oi.encode(t),o=new Uint8Array(s.length+5+a.length);return o.set(s),o.set(a,s.length+5),Ai("iTXt",o)}function ri(e,t,i){const s=e instanceof Uint8Array?e:new Uint8Array(e);if(s.length<20||!Ke.every((x,y)=>s[y]===x))throw new Error("The generated image is not a PNG.");let a=Ke.length,o=-1;const n=[];for(;a+12<=s.length;){const x=Wa(s,a),y=a+12+x;if(y>s.length)throw new Error("The PNG is truncated.");const T=String.fromCharCode(...s.subarray(a+4,a+8));if(T==="IEND"){o=a;break}const P=s.subarray(a+8,a+8+x),L=P.indexOf(0),U=L<0?"":String.fromCharCode(...P.subarray(0,L));(T==="tEXt"||T==="iTXt")&&(U==="parameters"||U==="oppailib")||n.push(s.subarray(a,y)),a=y}if(o<0)throw new Error("The PNG has no IEND chunk.");const l=[Ei("parameters",t)];i&&l.push(Ei("oppailib",i));const p=n.reduce((x,y)=>x+y.length,0),u=l.reduce((x,y)=>x+y.length,0),h=s.subarray(o),g=new Uint8Array(Ke.length+p+u+h.length);g.set(Ke);let w=Ke.length;for(const x of n)g.set(x,w),w+=x.length;for(const x of l)g.set(x,w),w+=x.length;return g.set(h,w),g}async function Hs(e,t,i,s){const a=await fetch(e,{credentials:"same-origin"});if(!a.ok)throw new Error(`Couldn't export image (${a.status}).`);const n=ri(await a.arrayBuffer(),i,s).slice().buffer,l=URL.createObjectURL(new Blob([n],{type:"image/png"}));try{const p=document.createElement("a");p.href=l,p.download=t.toLowerCase().endsWith(".png")?t:`${t}.png`,p.click()}finally{setTimeout(()=>URL.revokeObjectURL(l),0)}}const _i={shot:"full-body",angle:"eye",view:"front",framing:"portrait",lens:"none",lockIdentity:!0},lt={"extreme-closeup":{label:"Extreme close-up",hint:"Eyes and mouth fill the frame",prompt:"extreme close-up, face filling the frame, macro detail on the eyes",not:["full body","wide shot","long shot","cowboy shot","upper body"]},closeup:{label:"Close-up",hint:"The face, little else",prompt:"close-up portrait, face and hair fill the frame",not:["full body","wide shot","long shot","cowboy shot"]},"head-shoulders":{label:"Head and shoulders",hint:"The classic portrait crop",prompt:"head and shoulders portrait, shoulders visible at the frame edge",not:["full body","wide shot","long shot","waist visible"]},bust:{label:"Bust shot",hint:"Head to upper chest",prompt:"bust shot, framed from the chest up",not:["full body","wide shot","long shot","legs","feet"]},"waist-up":{label:"Waist-up",hint:"Head to waist, hands usable",prompt:"waist-up shot, upper body, cropped at the waist",not:["full body","long shot","legs","feet","knees"]},"three-quarter":{label:"Three-quarter body",hint:"Head to mid-thigh",prompt:"three-quarter body shot, cowboy shot, cropped at mid-thigh",not:["extreme close-up","feet","shoes"]},"full-body":{label:"Full body",hint:"Head to feet, whole figure",prompt:"full body shot, entire figure in frame, head to feet visible",not:["close-up","cropped legs","out of frame","cropped head"]}};function Ha(e){return lt[e].prompt}const ni={eye:{label:"Eye level",prompt:"eye level perspective, natural straight-on viewpoint",not:[]},low:{label:"Low angle",prompt:"low angle shot, viewed from below, looking upward",not:["from above","high angle","distorted proportions","giant"]},high:{label:"High angle",prompt:"high angle shot, viewed from above, looking downward",not:["from below","low angle","distorted proportions"]}},li={front:{label:"Front",prompt:"front view, facing viewer",not:["from behind","back view"]},"three-quarter":{label:"Three-quarter",prompt:"three-quarter view, body turned at a slight angle",not:["from behind"]},side:{label:"Side",prompt:"side view, profile, from the side",not:["front view","facing viewer"]},rear:{label:"Rear",prompt:"from behind, back view, facing away from viewer",not:["front view","facing viewer","looking at viewer","face visible"]}},pi={none:{label:"Unspecified",prompt:""},"wide-24":{label:"24mm wide",prompt:"24mm wide angle lens, deep focus"},"normal-50":{label:"50mm normal",prompt:"50mm lens, natural perspective"},"portrait-85":{label:"85mm portrait",prompt:"85mm portrait lens, shallow depth of field, blurred background"},"tele-135":{label:"135mm telephoto",prompt:"135mm telephoto lens, compressed perspective, bokeh"}},Va="consistent character design, same face, consistent facial features, consistent body proportions, anatomically consistent",Ka="inconsistent face, different person, face morphing, deformed proportions, distorted anatomy, extra limbs, malformed hands, changed body type, altered hairstyle",Ya="camera, camera body, camera lens, photography equipment, tripod, photographer, studio equipment, boom microphone",Vs={portrait:{sd:[512,768],xl:[832,1216]},landscape:{sd:[768,512],xl:[1216,832]},square:{sd:[512,512],xl:[1024,1024]}};function Xa(e,t="sd"){const i=lt[e.shot],s=ni[e.angle],a=li[e.view],o=pi[e.lens],n=Bi([...e.lockIdentity?[Va]:[],i.prompt,a.prompt,s.prompt,o.prompt]),l=Bi([...e.lockIdentity?[Ka]:[],Ya,...i.not,...a.not,...s.not]),[p,u]=Vs[e.framing][t];return{prompt:n,negative:l,width:p,height:u}}function Bi(e){const t=new Set,i=[];for(const s of e)for(const a of s.split(",")){const o=a.trim();if(!o)continue;const n=o.toLowerCase();t.has(n)||(t.add(n),i.push(o))}return i.join(", ")}function Za(e,t){return e*t>=800*800?"xl":"sd"}const Dt={shots:Object.keys(lt).map(e=>({id:e,label:lt[e].label,hint:lt[e].hint})),angles:Object.keys(ni).map(e=>({id:e,label:ni[e].label})),views:Object.keys(li).map(e=>({id:e,label:li[e].label})),lenses:Object.keys(pi).map(e=>({id:e,label:pi[e].label})),framings:Object.keys(Vs).map(e=>({id:e,label:e==="portrait"?"Portrait":e==="landscape"?"Landscape":"Square"}))},Fi={feather:2,spill:.5},Ie=255,ke=0,Ja=20;class Qa{constructor(t){if(this.undoStack=[],this.redoStack=[],"data"in t)this.width=t.width,this.height=t.height,this.source={data:t.data,width:t.width,height:t.height};else{this.width="naturalWidth"in t?t.naturalWidth:t.width,this.height="naturalHeight"in t?t.naturalHeight:t.height;const i=document.createElement("canvas");i.width=this.width,i.height=this.height;const s=i.getContext("2d",{willReadFrequently:!0});if(!s)throw new Error("This browser wouldn't give us a canvas to work on.");s.drawImage(t,0,0),this.source=s.getImageData(0,0,this.width,this.height)}this.mask=new Uint8Array(this.width*this.height).fill(Ie),this.key=Ui(this.source.data,this.width,this.height)}get canUndo(){return this.undoStack.length>0}get canRedo(){return this.redoStack.length>0}get cutFraction(){let t=0;for(let i=0;i<this.mask.length;i++)this.mask[i]===ke&&t++;return t/this.mask.length}checkpoint(){this.undoStack.push(this.mask.slice()),this.undoStack.length>Ja&&this.undoStack.shift(),this.redoStack=[]}undo(){const t=this.undoStack.pop();return t?(this.redoStack.push(this.mask),this.mask=t,!0):!1}redo(){const t=this.redoStack.pop();return t?(this.undoStack.push(this.mask),this.mask=t,!0):!1}reset(){this.checkpoint(),this.mask.fill(Ie)}autoRemove(t){this.checkpoint(),this.mask.fill(Ie),this.key=Ui(this.source.data,this.width,this.height);const i=[];for(let s=0;s<this.width;s++)i.push(s,s+(this.height-1)*this.width);for(let s=0;s<this.height;s++)i.push(s*this.width,this.width-1+s*this.width);this.flood(i,this.key,t),this.removeEnclosedBackdrop(t)}removeEnclosedBackdrop(t){const i=this.source.data,s=new Uint8Array(this.mask.length),[a,o,n]=this.key,l=Math.max(1,t),p=Ni(a,o,n),u=Math.max(a,o,n)-Math.min(a,o,n)<28,h=Math.max(16,Math.floor(this.mask.length*.08));for(let g=0;g<this.mask.length;g++){if(s[g]||this.mask[g]===ke||Ye(i,g*4,a,o,n)>l)continue;const w=[],x=new Set,y=[g];for(s[g]=1;y.length;){const U=y.pop();w.push(U);const I=U%this.width,pe=(U-I)/this.width,Ae=[I>0?U-1:-1,I<this.width-1?U+1:-1,pe>0?U-this.width:-1,pe<this.height-1?U+this.width:-1];for(const xe of Ae)xe<0||this.mask[xe]===ke||(Ye(i,xe*4,a,o,n)<=l?s[xe]||(s[xe]=1,y.push(xe)):x.add(xe))}if(!x.size||w.length>h)continue;let T=0,P=0;for(const U of x){const I=U*4;T+=Ni(i[I],i[I+1],i[I+2]),P+=Ye(i,I,a,o,n)}if(T/=x.size,P/=x.size,u&&p>=200?p-T>=110:u&&p<=55?T-p>=110:P>=Math.max(90,l*2.25))for(const U of w)this.mask[U]=ke}}removeAt(t,i,s){const a=$t(Math.round(t),0,this.width-1),o=$t(Math.round(i),0,this.height-1),n=(o*this.width+a)*4,l=[this.source.data[n],this.source.data[n+1],this.source.data[n+2]];if(this.checkpoint(),this.key=l,s.contiguous){this.flood([o*this.width+a],l,s.tolerance);return}const p=Math.max(1,s.tolerance);for(let u=0;u<this.mask.length;u++)this.mask[u]!==ke&&Ye(this.source.data,u*4,l[0],l[1],l[2])<=p&&(this.mask[u]=ke)}paint(t,i,s,a){const o=a==="add"?Ie:ke,n=Math.max(1,Math.round(s)),l=Math.round(t),p=Math.round(i),u=n*n,h=Math.max(0,l-n),g=Math.min(this.width-1,l+n),w=Math.max(0,p-n),x=Math.min(this.height-1,p+n);for(let y=w;y<=x;y++){const T=y-p;for(let P=h;P<=g;P++){const L=P-l;L*L+T*T>u||(this.mask[y*this.width+P]=o)}}}beginStroke(){this.checkpoint()}compose(t,i=!1){const s=document.createElement("canvas");s.width=this.width,s.height=this.height;const a=s.getContext("2d");if(!a)return s;const o=this.composePixels(t,i);return a.putImageData(new ImageData(o.data,o.width,o.height),0,0),s}composePixels(t,i=!1){const s={data:new Uint8ClampedArray(this.source.data),width:this.width,height:this.height};if(i)return s;const a=this.featheredAlpha(Math.max(0,Math.round(t.feather))),o=$t(t.spill,0,1),[n,l,p]=this.key;for(let u=0;u<a.length;u++){const h=u*4,g=a[u];if(s.data[h+3]=g,g===0||g===Ie||o===0)continue;const w=o*(1-g/Ie);s.data[h]=Rt(s.data[h],n,w),s.data[h+1]=Rt(s.data[h+1],l,w),s.data[h+2]=Rt(s.data[h+2],p,w)}return s}featheredAlpha(t){const i=new Uint8Array(this.mask.length);if(t<=0)return i.set(this.mask),i;const s=1e6,a=new Float32Array(this.mask.length);for(let l=0;l<this.mask.length;l++)a[l]=this.mask[l]===ke?0:s;const o=this.width,n=this.height;for(let l=0;l<n;l++)for(let p=0;p<o;p++){const u=l*o+p;let h=a[u];p>0&&(h=Math.min(h,a[u-1]+1)),l>0&&(h=Math.min(h,a[u-o]+1)),p>0&&l>0&&(h=Math.min(h,a[u-o-1]+1.414)),p<o-1&&l>0&&(h=Math.min(h,a[u-o+1]+1.414)),a[u]=h}for(let l=n-1;l>=0;l--)for(let p=o-1;p>=0;p--){const u=l*o+p;let h=a[u];p<o-1&&(h=Math.min(h,a[u+1]+1)),l<n-1&&(h=Math.min(h,a[u+o]+1)),p<o-1&&l<n-1&&(h=Math.min(h,a[u+o+1]+1.414)),p>0&&l<n-1&&(h=Math.min(h,a[u+o-1]+1.414)),a[u]=h}for(let l=0;l<i.length;l++){if(this.mask[l]===ke){i[l]=0;continue}const p=a[l];i[l]=p>=t?Ie:Math.round(p/t*Ie)}return i}flood(t,i,s){const a=Math.max(1,s),o=this.source.data,n=new Uint8Array(this.mask.length),l=t.slice(),[p,u,h]=i;for(;l.length;){const g=l.pop();if(n[g]||(n[g]=1,Ye(o,g*4,p,u,h)>a))continue;this.mask[g]=ke;const w=g%this.width,x=(g-w)/this.width;w>0&&l.push(g-1),w<this.width-1&&l.push(g+1),x>0&&l.push(g-this.width),x<this.height-1&&l.push(g+this.width)}}}function Ye(e,t,i,s,a){const o=e[t]-i,n=e[t+1]-s,l=e[t+2]-a;return Math.sqrt(o*o+n*n+l*l)}function Ni(e,t,i){return e*.2126+t*.7152+i*.0722}function Ui(e,t,i){const s=[0,(t-1)*4,(i-1)*t*4,((i-1)*t+(t-1))*4];let a=0,o=0,n=0;for(const l of s)a+=e[l],o+=e[l+1],n+=e[l+2];return[a/4,o/4,n/4]}function Rt(e,t,i){return $t(Math.round(e+(e-t)*i),0,255)}function $t(e,t,i){return Math.min(i,Math.max(t,e))}function Ue(e){return new Promise((t,i)=>{const s=new Image;s.crossOrigin="anonymous",s.onload=()=>t(s),s.onerror=()=>i(new Error("Couldn't load that image.")),s.src=e})}function ji(e){return new Promise((t,i)=>{e.toBlob(s=>s?t(s):i(new Error("Couldn't encode the PNG.")),"image/png")})}function kt(e,t,i=48){return e.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,i).replace(/-+$/g,"")||t}function eo(e,t,i){return`${kt(e,"outfit")}-${kt(t,"calm",20)}-${kt(i,"neutral",24)}.png`}function to(e){return`${kt(e,"outfit")}-wardrobe.zip`}function Ot(e){return!e||e.manageModels||e.backend!=="a1111"?"":e.modelsDirProblem?`${e.modelsDirProblem}. Until then Automatic1111's models are listed and linked to Civitai, but can't be installed, edited or deleted from here.`:"Automatic1111 has no API to install, edit or delete models, so OppaiLib does it in its models folder. Map that folder into the OppaiLib container at /a1111-models (or set where it is under Settings → Image generation) and those work here too, Civitai installs included."}function Me(e){return e.split(",").map(t=>t.trim()).filter(Boolean)}const ve=e=>e.toLowerCase().replace(/\s+/g," ");function io(e,t){const i=new Set(Me(e).map(ve)),s=Me(t);return s.length>0&&s.every(a=>i.has(ve(a)))}function qi(e,t,i,s){let a=Me(e);if(t&&io(e,t)){const p=new Set(Me(t).map(ve));a=a.filter(u=>!p.has(ve(u)))}const o=new Set(a.map(ve)),n=Me(i??"").filter(p=>!o.has(ve(p)));return(s==="start"?[...n,...a]:[...a,...n]).join(", ")}function so(e,t){const i=new Set(Me(e).map(ve)),s=[];for(const a of t)for(const o of Me(a??""))i.has(ve(o))||(i.add(ve(o)),s.push(o));return s.join(", ")}function ao(e,t,i,s){const a={...e},o=[],n=(h,g,w)=>{g===void 0||g===""||g===0||(a[h]!==g&&o.push(w),a[h]=g)};s?(n("weight",i.weight,"weight"),i.weightMin&&i.weightMax&&(n("weightMin",i.weightMin,"weight range"),a.weightMax=i.weightMax)):(n("positive",i.positive,"positive prompt"),n("steps",i.steps,"steps"),n("cfgScale",i.cfgScale,"CFG"),n("scheduler",i.scheduler,"sampler"),n("clipSkip",i.clipSkip,"clip skip"),i.width&&i.height&&(n("width",i.width,"size"),a.height=i.height)),n("negative",i.negative,"negative prompt");const l=Me(t),p=new Set(l.map(ve));let u=0;for(const h of i.triggerWords??[])for(const g of Me(h))p.has(ve(g))||(p.add(ve(g)),l.push(g),u++);return u&&o.unshift("trigger words"),{defaults:a,triggerText:l.join(", "),applied:o}}const Se=[{key:"head",label:"Head",hint:"Hats, glasses, etc.",prompt:"head item",noun:"headwear",icon:"face"},{key:"top",label:"Top",hint:"Shirt, dress, jacket…",prompt:"top",noun:"top",icon:"apparel"},{key:"bottoms",label:"Bottoms",hint:"Skirt, shorts, pants…",prompt:"bottoms",noun:"bottoms",icon:"styler"},{key:"shoes",label:"Shoes",hint:"Boots, heels, socks…",prompt:"footwear",noun:"footwear",icon:"steps"},{key:"panties",label:"Panties",hint:"Style and material",prompt:"panties",noun:"panties",icon:"apparel"},{key:"bra",label:"Bra",hint:"Style and material",prompt:"bra",noun:"bra",icon:"apparel"},{key:"hand1",label:"Hand 1",hint:"Held or worn item",prompt:"left-hand item",noun:"glove",icon:"front_hand"},{key:"hand2",label:"Hand 2",hint:"Held or worn item",prompt:"right-hand item",noun:"glove",icon:"back_hand"},{key:"extra1",label:"Extra 1",hint:"Accessory or layer",prompt:"extra accessory",noun:"accessory",icon:"diamond"},{key:"extra2",label:"Extra 2",hint:"Accessory or layer",prompt:"second extra accessory",noun:"accessory",icon:"diamond"}];function Pe(e){return!!e.item.trim()&&!e.off}const At={head:{color:"",item:""},top:{color:"cream white",item:"fitted top"},bottoms:{color:"charcoal",item:"pleated skirt"},shoes:{color:"black",item:"ankle boots"},panties:{color:"black",item:"lace panties"},bra:{color:"black",item:"lace bra"},hand1:{color:"",item:""},hand2:{color:"",item:""},extra1:{color:"",item:""},extra2:{color:"",item:""}},Ks=Object.fromEntries(Se.map(({key:e})=>[e,{color:"",item:""}])),Ys=[{name:"red",words:["red","crimson","scarlet","ruby","burgundy","maroon","wine"]},{name:"pink",words:["pink","rose","blush","magenta","fuchsia","salmon"]},{name:"orange",words:["orange","peach","apricot","coral","amber","rust"]},{name:"yellow",words:["yellow","gold","golden","mustard","lemon","blonde"]},{name:"green",words:["green","emerald","olive","mint","jade","teal","sage"]},{name:"blue",words:["blue","navy","azure","cobalt","indigo","denim","cyan","turquoise"]},{name:"purple",words:["purple","violet","lavender","lilac","plum","mauve"]},{name:"brown",words:["brown","tan","beige","chocolate","caramel","khaki","bronze","copper"]},{name:"white",words:["white","cream","ivory","pearl","off-white"]},{name:"black",words:["black","charcoal","onyx","jet"]},{name:"grey",words:["grey","gray","silver","slate","ash","steel"]}];function oo(e){const t=e.toLowerCase();return Ys.filter(({words:i})=>i.some(s=>new RegExp(`\\b${s}\\b`).test(t))).map(({name:i})=>i)}function ro(e,t,i){if(!e.trim())return"";const s=t.toFixed(2).replace(/0+$/,"").replace(/\.$/,"");return i==="a1111"?`(${e}:${s})`:i==="invokeai"?`(${e})${s}`:e}const no=1.25;function Wi(e,t,i,s){const a=t.item.trim();if(!a||t.off)return"";const o=Pi(e,t),n=Lt(e,t),l=t.color.trim();if(!l)return`${o}: ${a}`;const p=`${l} ${a}`;return s?`${o}: ${ro(p,no,i)}, ${l} ${n}`:`${o}: ${p}`}function Pi(e,t){var i;return((i=t.prompt)==null?void 0:i.trim())||e.prompt}function Lt(e,t){var i,s;return((i=t.noun)==null?void 0:i.trim())||((s=t.prompt)==null?void 0:s.trim())||e.noun}function lo(e,t){const i=t.color.trim();if(!Pe(t)||!i)return[];const s=new Set(oo(i));if(!s.size)return[];const a=Lt(e,t);return Ys.filter(({name:o})=>!s.has(o)).map(({name:o})=>`${o} ${a}`)}const di=[{description:"Clothes on; bra and panties hidden.",clothes:[["on",100]],bra:[["hidden",100]],panties:[["hidden",100]]},{description:"Usually covered, with an occasional underwear glimpse.",clothes:[["on",88],["displaced",12]],bra:[["hidden",88],["showing",12]],panties:[["hidden",94],["showing",6]]},{description:"Mixed neat, slipped, and rare clothes-off results.",clothes:[["on",58],["displaced",34],["off",8]],bra:[["hidden",52],["showing",38],["off",10]],panties:[["hidden",60],["showing",33],["off",7]]},{description:"Strong variation: clothes and underwear may be on, showing, or off.",clothes:[["on",28],["displaced",44],["off",28]],bra:[["hidden",22],["showing",46],["off",32]],panties:[["hidden",30],["showing",45],["off",25]]},{description:"Maximum variation, weighted toward displaced or removed clothing.",clothes:[["on",14],["displaced",28],["off",58]],bra:[["hidden",10],["showing",27],["off",63]],panties:[["hidden",14],["showing",31],["off",55]]}];function Et(e,t){const i=Math.max(0,Math.min(.999999,t()))*100;let s=0;for(const[a,o]of e)if(s+=o,i<s)return a;return e[e.length-1][0]}function po(e,t=Math.random){const i=di[Math.max(0,Math.min(di.length-1,Math.round(e)))],s=Et(i.clothes,t);let a=Et(i.bra,t),o=Et(i.panties,t);return s==="off"&&(a==="hidden"&&(a="showing"),o==="hidden"&&(o="showing")),{clothes:s,bra:a,panties:o}}function co(e){if(!e||typeof e!="object"||Array.isArray(e))return!1;const t=e;return typeof t.color=="string"&&typeof t.item=="string"}function Gi(e){if(!e||typeof e!="object"||Array.isArray(e))return{...Ks};const t=e;return Object.fromEntries(Se.map(({key:i})=>{var a,o;const s=t[i];return typeof s=="string"?[i,{color:"",item:s}]:co(s)?[i,{color:s.color,item:s.item,...s.off?{off:!0}:{},...(a=s.prompt)!=null&&a.trim()?{prompt:s.prompt.trim()}:{},...(o=s.noun)!=null&&o.trim()?{noun:s.noun.trim()}:{}}]:[i,{color:"",item:""}]}))}function ho(e){return JSON.stringify(Object.fromEntries(Se.map(t=>{const i=e[t.key];return[t.key,Pe(i)?`${i.color.trim().toLowerCase()}|${i.item.trim().toLowerCase()}|${Pi(t,i).toLowerCase()}|${Lt(t,i).toLowerCase()}`:"|"]})))}var uo=Object.defineProperty,mo=Object.getOwnPropertyDescriptor,fe=(e,t,i,s)=>{for(var a=s>1?void 0:s?mo(t,i):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(a=(s?n(t,i,a):n(a))||a);return s&&a&&uo(t,i,a),a};const ci=[{id:"neutral",label:"Neutral",hint:"Login screen and error popups"},{id:"happy",label:"Happy",hint:"Chat · Sweet mode"},{id:"mischievous",label:"Mischievous",hint:"Chat · Playful mode"},{id:"surprised",label:"Surprised",hint:"Chat · Bold mode"},{id:"thinking",label:"Thinking",hint:"Chat · Roleplay mode"},{id:"shy",label:"Shy",hint:"Bashful, flustered, caught out",borrows:"Surprised"},{id:"smug",label:"Smug",hint:"Proud of herself, vindicated",borrows:"Mischievous"},{id:"sad",label:"Sad",hint:"Hurt, wistful, let down",borrows:"Thinking"},{id:"annoyed",label:"Annoyed",hint:"Irritated, pouty, impatient",borrows:"Thinking"},{id:"sleepy",label:"Sleepy",hint:"Tired, dozy, winding down",borrows:"Neutral"},{id:"loving",label:"Loving",hint:"Tender, adoring, soft on you",borrows:"Happy"},{id:"excited",label:"Excited",hint:"Thrilled, eager, buzzing",borrows:"Happy"}],St=["Calm","Warm","Flirty","Heated","Peak"],go=ci.length*St.length,Xe=(e,t)=>`${e}:${t}`;let oe=class extends me{constructor(){super(...arguments),this.outfits=[],this.activities=[],this.backgrounds=[],this.defaultBackground="",this.backgroundDraft=null,this.backgroundBusy=!1,this.backgroundVersion=0,this.wornOutfit=ha(),this.outfitDraft=null,this.outfitBusy=!1,this.outfitError="",this.outfitCoverVersion=0}connectedCallback(){super.connectedCallback(),this.loadOutfits()}async refresh(){await this.loadOutfits()}async loadBackgrounds(){try{const e=await m.libbyBackgrounds();this.backgrounds=e.backgrounds,this.defaultBackground=e.default??""}catch{}}async setDefaultBackground(e){try{const t=await m.setLibbyDefaultBackground(e);this.defaultBackground=t.default,F(e?"That's where she'll be unless a conversation moves her.":"No default room — the plain stage until she moves.","success")}catch(t){F(t.message||"Couldn't set the default background.","error")}}async loadOutfits(){this.loadBackgrounds();try{const e=await m.libbyOutfits();this.outfits=e.outfits,this.activities=e.activities??[],this.outfitError="",this.wornOutfit&&!e.outfits.some(t=>t.id===this.wornOutfit)&&(this.wornOutfit="",Ri(""))}catch(e){this.outfitError=e.message||"Couldn't load your wardrobes."}}render(){return r`
      <div class="wardrobe-intro">
        An outfit swaps Libby's artwork: one sprite per expression, per heat tier —
        ${go} in all for a complete wardrobe — plus one picture for each of the
        optional Misc states she can put herself into. An empty expression falls back to
        the calmer art, then to the bundled default; an empty Misc state falls back to
        the bundled Libby doing the same thing, then to her expression. Which outfit
        she wears is per-device. Click a card to wear it; Build opens it on the board.
      </div>
      ${this.outfitError?r`<div class="wardrobe-error" role="alert">${this.outfitError}</div>`:d}
      <div class="outfit-cards">
        <!-- The bundled wardrobe is a card like any other, shown in its own art rather
             than as a "none" row: it is a look you choose, not the absence of one. -->
        <button
          class="outfit-card ${this.wornOutfit===""?"on":""}"
          @click=${()=>this.wearOutfit("")}
          title="Wear Libby's default artwork"
        >
          <img class="cover" src=${ua("happy",1)} alt="Default Libby" />
          ${this.wornOutfit===""?r`<span class="worn-badge">Wearing</span>`:d}
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
      ${this.outfitDraft?this.renderOutfitEditor(this.outfitDraft):d}
      ${this.renderBackgrounds()}
    `}renderBackgrounds(){const e=this.backgroundDraft;return r`
      <div class="scene-head"><h3>Backgrounds</h3><span class="wardrobe-intro" style="margin:0">Rooms for the video call. Tag them so she can choose where she is; mark one as the default and every conversation starts there. A generated picture can become one from its right-click menu.</span></div>
      <div class="scene-cards">
        ${this.backgrounds.map(t=>r`<button class="scene-card" title="Edit ${t.name}" @click=${()=>this.openBackgroundEditor(t)}>
          ${t.hasImage?r`<img class="cover" src=${m.libbyBackgroundURL(t.id,this.backgroundVersion)} alt=${t.name} loading="lazy" />`:r`<div class="cover-empty">No picture yet</div>`}
          ${t.id===this.defaultBackground?r`<span class="default-badge">Default</span>`:d}
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
          ${e.image?r`<img src=${e.image} alt="" />`:e.id&&e.hasImage?r`<img src=${m.libbyBackgroundURL(e.id,this.backgroundVersion)} alt="" />`:r`<span>Drop a picture here<br />or click to browse<br /><small>Landscape works best</small></span>`}
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
          </button>`:d}
          ${e.id?r`<button class="outfit-btn danger" ?disabled=${this.backgroundBusy} @click=${()=>void this.deleteBackground()}>Delete</button>`:d}
        </div>
      </div>`:d}
    `}openBackgroundEditor(e){this.backgroundDraft={id:e.id,name:e.name,tags:e.tags.join(", "),hasImage:e.hasImage}}stageBackground(e){if(!e||!this.backgroundDraft)return;const t=new FileReader;t.onload=()=>{this.backgroundDraft&&(this.backgroundDraft={...this.backgroundDraft,image:String(t.result)})},t.readAsDataURL(e)}async saveBackground(){const e=this.backgroundDraft;if(!(!e||!e.name.trim())){this.backgroundBusy=!0;try{const t=await m.saveLibbyBackground({id:e.id,name:e.name.trim(),tags:e.tags.split(",").map(i=>i.trim()).filter(Boolean)});e.image&&await m.setLibbyBackgroundImage(t.id,e.image),this.backgroundVersion++,this.backgroundDraft=null,await this.loadBackgrounds(),!e.image&&!e.hasImage&&F("Saved — add a picture and she can go there.","success")}catch(t){F(t.message||"Couldn't save that background.","error")}finally{this.backgroundBusy=!1}}}async deleteBackground(){const e=this.backgroundDraft;if(!(!(e!=null&&e.id)||!confirm(`Delete "${e.name}"?`))){this.backgroundBusy=!0;try{await m.deleteLibbyBackground(e.id),this.backgroundDraft=null,await this.loadBackgrounds()}catch(t){F(t.message||"Couldn't delete that background.","error")}finally{this.backgroundBusy=!1}}}wearOutfit(e){this.wornOutfit=e,Ri(e)}openOutfitEditor(e){const t=[];if(e.emotionLevels)for(const[i,s]of Object.entries(e.emotionLevels))for(const a of s)t.push(Xe(i,a));else for(const i of e.emotions)t.push(Xe(i,0));for(const[i,s]of Object.entries(e.activityLevels??{}))for(const a of s)t.push(Xe(i,a));this.outfitDraft={id:e.id,name:e.name,existing:t,staged:{},removed:[],level:0,hasCover:e.hasThumb!==!1}}isActivity(e){return this.activities.some(t=>t.id===e)}toggleRemove(e){const t=this.outfitDraft;if(!t)return;const i=t.removed.includes(e)?t.removed.filter(a=>a!==e):[...t.removed,e],s={...t.staged};t.removed.includes(e)||delete s[e],this.outfitDraft={...t,removed:i,staged:s}}renderSlot(e,t,i,s){const a=this.isActivity(t)?0:e.level,o=Xe(t,a),n=e.staged[o],l=e.removed.includes(o),p=!n&&e.id&&e.existing.includes(o)?m.libbyEmotionURL(e.id,t,a,this.outfitCoverVersion):"";return r`
      <label
        class="slot ${l?"removed":""}"
        @dragover=${u=>{u.preventDefault(),u.currentTarget.classList.add("dragover")}}
        @dragleave=${u=>u.currentTarget.classList.remove("dragover")}
        @drop=${u=>{var h,g;u.preventDefault(),u.currentTarget.classList.remove("dragover"),this.stageEmotion(t,(g=(h=u.dataTransfer)==null?void 0:h.files)==null?void 0:g[0])}}
      >
        ${n?r`<img src=${n} alt=${i} />`:p?r`<img src=${p} alt=${i} />`:r`<div class="drop-hint">Drop an image here<br />or click to browse</div>`}
        ${p||n?r`<span class="slot-actions">
          ${p&&e.id?r`<button type="button" class="slot-act" title="Edit this sprite in the studio — adjust the cutout, redo it, or replace it"
            @click=${u=>{u.preventDefault(),u.stopPropagation(),this.requestEdit(e.id,t,a)}}>
            <span class="material-symbols-rounded" style="font-size:16px;">edit</span></button>`:d}
          <button type="button" class="slot-act danger" title=${l?"Keep this sprite after all":n?"Discard the dropped picture":"Remove this sprite on save"}
            @click=${u=>{u.preventDefault(),u.stopPropagation(),n?this.unstage(o):this.toggleRemove(o)}}>
            <span class="material-symbols-rounded" style="font-size:16px;">${l?"undo":"delete"}</span></button>
        </span>`:d}
        <div class="slot-label">${i}${l?" — removing":""}</div>
        <div class="slot-hint">${s}</div>
        <input
          type="file"
          accept="image/*"
          style="display:none;"
          @change=${u=>{var g;const h=u.target;this.stageEmotion(t,(g=h.files)==null?void 0:g[0]),h.value=""}}
        />
      </label>
    `}renderCoverPicker(e){const t=e.cover||(e.id&&e.hasCover?m.libbyOutfitThumbURL(e.id,this.outfitCoverVersion):"");return r`<div class="cover-picker">
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
          ${e.cover||e.hasCover?r`<button class="outfit-btn" @click=${()=>this.clearCover()}>Use outfit art</button>`:d}
        </div>
      </div>
    </div>`}stageCover(e){if(!e||!e.type.startsWith("image/")||!this.outfitDraft)return;const t=new FileReader;t.onload=()=>{this.outfitDraft&&(this.outfitDraft={...this.outfitDraft,cover:String(t.result)})},t.readAsDataURL(e)}async clearCover(){const e=this.outfitDraft;if(e&&(this.outfitDraft={...e,cover:void 0,hasCover:!1},!!e.id))try{await m.clearLibbyOutfitThumb(e.id),this.outfitCoverVersion=Date.now(),await this.loadOutfits()}catch(t){this.outfitError=t.message}}stageEmotion(e,t){if(!t||!t.type.startsWith("image/")||!this.outfitDraft)return;const i=Xe(e,this.isActivity(e)?0:this.outfitDraft.level),s=new FileReader;s.onload=()=>{this.outfitDraft&&(this.outfitDraft={...this.outfitDraft,staged:{...this.outfitDraft.staged,[i]:String(s.result)},removed:this.outfitDraft.removed.filter(a=>a!==i)})},s.readAsDataURL(t)}unstage(e){const t=this.outfitDraft;if(!t)return;const i={...t.staged};delete i[e],this.outfitDraft={...t,staged:i}}requestEdit(e,t,i){this.outfitDraft=null,this.dispatchEvent(new CustomEvent("edit-slot",{detail:{outfitId:e,slot:t,level:i},bubbles:!0,composed:!0}))}async saveOutfit(){const e=this.outfitDraft;if(!(!e||!e.name.trim()||this.outfitBusy)){this.outfitBusy=!0;try{const t=await m.saveLibbyOutfit({id:e.id,name:e.name.trim()});for(const i of e.removed){const[s,a]=i.split(":");await m.deleteLibbyEmotion(t.id,s,Number(a)).catch(()=>{})}for(const[i,s]of Object.entries(e.staged)){const[a,o]=i.split(":");await m.setLibbyEmotion(t.id,a,s,Number(o))}this.outfitCoverVersion=Date.now(),e.cover&&(await m.setLibbyOutfitThumb(t.id,e.cover),this.outfitCoverVersion=Date.now()),this.outfitDraft=null,await this.loadOutfits()}catch(t){this.outfitError=t.message}finally{this.outfitBusy=!1}}}async deleteOutfit(){var s;const e=this.outfitDraft;if(!(e!=null&&e.id)||this.outfitBusy)return;const t=((s=this.outfits.find(a=>a.id===e.id))==null?void 0:s.wip)??0,i=t?`

This also deletes ${t} generated square${t===1?"":"s"} the outfit studio is holding for it.`:"";if(confirm(`Delete the “${e.name}” outfit?${i}`)){this.outfitBusy=!0;try{await m.deleteLibbyOutfit(e.id);const a=nt("libraryDelete");F(a.message,"success",{emotion:a.emotion,intensity:a.intensity}),this.wornOutfit===e.id&&this.wearOutfit(""),this.outfitDraft=null,await this.loadOutfits()}catch(a){this.outfitError=a.message}finally{this.outfitBusy=!1}}}renderOutfitCard(e){const t=this.wornOutfit===e.id,i=e.slots??e.emotions.length;return r`<button
      class="outfit-card ${t?"on":""}"
      @click=${()=>this.wearOutfit(t?"":e.id)}
      title=${t?`Take off “${e.name}”`:`Wear “${e.name}”`}
    >
      ${e.hasThumb===!1?r`<div class="cover-empty">No art yet</div>`:r`<img
            class="cover"
            src=${m.libbyOutfitThumbURL(e.id,this.outfitCoverVersion)}
            alt=${e.name}
            loading="lazy"
            @error=${s=>{s.target.replaceWith(Object.assign(document.createElement("div"),{className:"cover-empty",textContent:"No art yet"}))}}
          />`}
      ${t?r`<span class="worn-badge">Wearing</span>`:d}
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
          ${e.emotions.length}/${ci.length} emotions${i>e.emotions.length?r` · ${i} images`:d}${e.activitySlots?r` · ${e.activitySlots} misc`:d}
          <!-- Unfinished squares are the reason a wardrobe with no sprites is not an
               empty wardrobe: they are hours of generation the studio is holding. -->
          ${e.wip?r`<br />${e.wip} in progress`:d}
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
            ${St.map((t,i)=>r`<button
                class="tier-tab ${e.level===i?"on":""}"
                @click=${()=>this.outfitDraft={...e,level:i}}
                title="Shown as the horniness meter reaches this tier"
              >${t}</button>`)}
          </div>
          <p class="tier-note">
            ${e.level===0?"Baseline art — worn when the meter is low, and the fallback for any tier you leave empty.":`Shown as Libby’s horniness meter climbs into the “${St[e.level]}” range.`}
          </p>
          ${this.renderCoverPicker(e)}
          <div class="slots">
            ${ci.map(t=>this.renderSlot(e,t.id,t.label,t.borrows?`${t.hint} · Optional, borrows ${t.borrows}`:t.hint))}
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
              ${this.activities.map(t=>this.renderSlot(e,t.id,t.auto?`${t.label} — while she writes`:t.label,t.auto?"Shown with a speech bubble while a reply is on its way; she never picks it herself":t.minIntensity>1?`${t.says} · from tier ${St[t.minIntensity-1]}`:t.says))}
            </div>
          `:d}
          <div class="outfit-actions">
            ${e.id?r`<button class="outfit-btn danger" ?disabled=${this.outfitBusy} @click=${()=>this.deleteOutfit()}>
                  Delete outfit
                </button>`:d}
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
    `}};oe.styles=[ue,re`
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
  `];fe([c()],oe.prototype,"outfits",2);fe([c()],oe.prototype,"activities",2);fe([c()],oe.prototype,"backgrounds",2);fe([c()],oe.prototype,"defaultBackground",2);fe([c()],oe.prototype,"backgroundDraft",2);fe([c()],oe.prototype,"backgroundBusy",2);fe([c()],oe.prototype,"backgroundVersion",2);fe([c()],oe.prototype,"wornOutfit",2);fe([c()],oe.prototype,"outfitDraft",2);fe([c()],oe.prototype,"outfitBusy",2);fe([c()],oe.prototype,"outfitError",2);fe([c()],oe.prototype,"outfitCoverVersion",2);oe=fe([ge("oppai-outfit-wardrobe")],oe);const fo=new TextEncoder;function H(e,t,i){e.setUint16(t,i,!0)}function de(e,t,i){e.setUint32(t,i>>>0,!0)}let ht;function bo(e){if(!ht){ht=new Uint32Array(256);for(let i=0;i<256;i++){let s=i;for(let a=0;a<8;a++)s=s&1?3988292384^s>>>1:s>>>1;ht[i]=s>>>0}}let t=4294967295;for(const i of e)t=ht[(t^i)&255]^t>>>8;return(t^4294967295)>>>0}function vo(e){return{date:Math.min(2107,Math.max(1980,e.getFullYear()))-1980<<9|e.getMonth()+1<<5|e.getDate(),time:e.getHours()<<11|e.getMinutes()<<5|Math.floor(e.getSeconds()/2)}}function xo(e){return e.buffer instanceof ArrayBuffer?e.byteOffset===0&&e.byteLength===e.buffer.byteLength?e.buffer:e.buffer.slice(e.byteOffset,e.byteOffset+e.byteLength):e.slice().buffer}async function yo(e){return e instanceof Uint8Array?e:e instanceof ArrayBuffer?new Uint8Array(e):new Uint8Array(await e.arrayBuffer())}async function wo(e,t=new Date){if(e.length>65535)throw new Error("Too many files for one ZIP archive.");const i=vo(t),s=[],a=[];let o=0;for(const g of e){const w=g.name.replaceAll("\\","_").replaceAll("/","_")||"file",x=fo.encode(w),y=await yo(g.data);if(x.length>65535||y.length>4294967295)throw new Error(`File is too large for ZIP: ${w}`);const T=bo(y),P=new Uint8Array(30+x.length),L=new DataView(P.buffer);de(L,0,67324752),H(L,4,20),H(L,6,2048),H(L,8,0),H(L,10,i.time),H(L,12,i.date),de(L,14,T),de(L,18,y.length),de(L,22,y.length),H(L,26,x.length),H(L,28,0),P.set(x,30),s.push({header:P,data:y});const U=new Uint8Array(46+x.length),I=new DataView(U.buffer);de(I,0,33639248),H(I,4,20),H(I,6,20),H(I,8,2048),H(I,10,0),H(I,12,i.time),H(I,14,i.date),de(I,16,T),de(I,20,y.length),de(I,24,y.length),H(I,28,x.length),H(I,30,0),H(I,32,0),H(I,34,0),H(I,36,0),de(I,38,0),de(I,42,o),U.set(x,46),a.push(U),o+=P.length+y.length}const n=a.reduce((g,w)=>g+w.length,0),l=new Uint8Array(22),p=new DataView(l.buffer);de(p,0,101010256),H(p,4,0),H(p,6,0),H(p,8,e.length),H(p,10,e.length),de(p,12,n),de(p,16,o),H(p,20,0);const h=[...s.flatMap(g=>[g.header,g.data]),...a,l].map(xo);return new Blob(h,{type:"application/zip"})}function $o(e){const t=String(e.getMonth()+1).padStart(2,"0"),i=String(e.getDate()).padStart(2,"0");return`${e.getFullYear()}-${t}-${i}`}function ko(e,t){const i=new Date(e.getFullYear(),e.getMonth(),e.getDate()).getTime(),s=new Date(t.getFullYear(),t.getMonth(),t.getDate()).getTime();return Math.round((s-i)/864e5)}function So(e,t,i){const s=ko(e,t);if(s===0)return"Today";if(s===1)return"Yesterday";if(s>1&&s<7)return e.toLocaleDateString(i,{weekday:"long"});const a=e.getFullYear()===t.getFullYear();return e.toLocaleDateString(i,a?{weekday:"short",day:"numeric",month:"long"}:{day:"numeric",month:"long",year:"numeric"})}function Co(e,t,i){const s=[];for(const a of e){const o=a.created?new Date(a.created):null,n=o&&!Number.isNaN(o.getTime()),l=n?$o(o):"undated",p=s[s.length-1];if(p&&p.key===l){p.items.push(a);continue}s.push({key:l,label:n?So(o,t,i):"Undated",items:[a]})}return s}var zo=Object.defineProperty,To=Object.getOwnPropertyDescriptor,_=(e,t,i,s)=>{for(var a=s>1?void 0:s?To(t,i):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(a=(s?n(t,i,a):n(a))||a);return s&&a&&zo(t,i,a),a};const Po=40,je="application/x-oppai-gallery",_t=je,Hi="oppai.gallerySize",Bt=[{id:"newest",label:"Newest first"},{id:"oldest",label:"Oldest first"},{id:"largest",label:"Largest first",ownOnly:!0}],ut=[{id:"",label:"Everything",icon:"apps",empty:""},{id:"pictures",label:"Pictures",icon:"image",empty:"No pictures here — only upscales and clips."},{id:"upscaled",label:"Upscaled",icon:"open_in_full",empty:"Nothing here has been upscaled yet."},{id:"videos",label:"Videos",icon:"movie",empty:"No clips here yet — make one in the Video studio."}],Ze=[{id:"s",px:120},{id:"m",px:170},{id:"l",px:250}];let A=class extends me{constructor(){super(...arguments),this.backend="invokeai",this.canPaint=!1,this.canFixFaces=!1,this.fixLabel="Fix faces",this.upscaleLabel="",this.canAnimate=!1,this.loras=[],this.canSetCovers=!1,this.startBoard="",this.boards=[],this.sort="newest",this.type="",this.info=null,this.infoError="",this.board="none",this.items=[],this.total=0,this.loading=!1,this.error="",this.viewing=null,this.browsing=!1,this.tileSize="m",this.busy=!1,this.naming=!1,this.newBoard="",this.failedCovers=new Set,this.savedNames=new Set,this.selecting=!1,this.selected=new Set,this.pickAnchor=null,this.dropOn="",this.dragging=!1,this.coverOpen=!1,this.coverFor="",this.metadata=new Map,this.onKey=e=>{if(!(!this.viewing&&!this.browsing)&&!e.composedPath().some(t=>t instanceof HTMLSelectElement||t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement)){if(this.viewing)if(e.key==="ArrowLeft")this.step(-1);else if(e.key==="ArrowRight")this.step(1);else if(e.key==="Escape")this.viewing=null;else if(e.key==="Delete")this.deleteImage(this.viewing,!0);else return;else if(e.key==="Escape")this.selecting?this.toggleSelecting():this.browsing=!1;else return;e.preventDefault()}}}connectedCallback(){super.connectedCallback(),ma(this,"generation gallery"),window.addEventListener("keydown",this.onKey),this.startBoard&&(this.board=this.startBoard);try{const e=localStorage.getItem(Hi);Ze.some(t=>t.id===e)&&(this.tileSize=e)}catch{}this.refresh()}disconnectedCallback(){var e;super.disconnectedCallback(),window.removeEventListener("keydown",this.onKey),(e=this.more)==null||e.disconnect()}updated(e){var i;super.updated(e);const t=this.renderRoot.querySelector(this.browsing?".browse .sentinel":".panel .sentinel");(i=this.more)==null||i.disconnect(),!(!t||this.loading||this.items.length>=this.total)&&(this.more??(this.more=new IntersectionObserver(s=>{s.some(a=>a.isIntersecting)&&!this.loading&&this.items.length<this.total&&this.loadPage(!1)},{rootMargin:"400px"})),this.more.observe(t))}get own(){return this.backend==="oppailib"}labelOf(e){return e.label||e.name}isClip(e){return e.kind==="video"}openClip(e,t=!1){this.viewing=null,this.dispatchEvent(new CustomEvent("open-clip",{detail:{gallery:e.name,name:this.labelOf(e),width:e.width,height:e.height,upscale:t},bubbles:!0,composed:!0}))}still(e,t){return this.isClip(e)&&!e.tile?r`<span class="film"><span class="material-symbols-rounded">movie</span></span>`:r`<img src=${m.galleryThumbURL(e.name)} alt=${t} loading="lazy" draggable="false" />`}open(e){this.viewing=e,this.coverOpen=!1,this.info=this.metadata.get(e.name)??null,this.infoError="",!this.info&&this.imageInfo(e).then(t=>{var i;((i=this.viewing)==null?void 0:i.name)===e.name&&(this.info=t)},t=>{var i;((i=this.viewing)==null?void 0:i.name)===e.name&&(this.infoError=t.message)})}async step(e){const t=this.items.findIndex(s=>{var a;return s.name===((a=this.viewing)==null?void 0:a.name)});if(t<0)return;let i=this.items[t+e];!i&&e>0&&this.items.length<this.total&&(await this.loadPage(!1),i=this.items[t+e]),i&&this.open(i)}neighbour(e){const t=this.items.findIndex(i=>i.name===e);return t<0?void 0:this.items[t+1]??this.items[t-1]}pickSort(e){e!==this.sort&&(this.sort=e,this.items=[],this.loadPage(!0))}pickType(e){e!==this.type&&(this.type=e,this.items=[],this.selected=new Set,this.loadPage(!0))}setTileSize(e){this.tileSize=e;try{localStorage.setItem(Hi,e)}catch{}}get selectedBoard(){return this.board}announceBoard(){this.dispatchEvent(new CustomEvent("board-changed",{detail:{board:this.board},bubbles:!0,composed:!0}))}async refresh(){this.error="",await this.reloadBoards()&&(this.announceBoard(),await this.loadPage(!0))}async reloadBoards(){try{const e=await m.galleryBoards();return this.boards=e.boards,!this.boards.some(t=>t.id===this.board)&&this.boards.length&&(this.board=this.boards[0].id),!0}catch(e){return this.error=e.message,!1}}async loadPage(e){if(!this.loading){this.loading=!0;try{const t=e?0:this.items.length,i=await m.galleryImages(this.board,t,Po,this.sort,this.own&&this.type?this.type:void 0);this.items=e?i.items:[...this.items,...i.items.filter(s=>!this.items.some(a=>a.name===s.name))],this.total=i.total}catch(t){this.error=t.message}finally{this.loading=!1}}}pickBoard(e){this.board!==e&&(this.board=e,this.items=[],this.selected=new Set,this.selecting=!1,this.announceBoard(),this.loadPage(!0))}async createBoard(){const e=this.newBoard.trim();if(!(!e||this.busy)){this.busy=!0,this.error="";try{const t=await m.createGalleryBoard(e);this.newBoard="",this.naming=!1,await this.reloadBoards(),this.pickBoard(t.id),this.own||this.dispatchEvent(new CustomEvent("boards-changed",{bubbles:!0,composed:!0}))}catch(t){this.error=t.message}finally{this.busy=!1}}}async deleteBoard(e){if(!this.isFolder(e.id)||this.busy)return;const t=this.own?"Unsorted":"Uncategorized";if(confirm(`Delete the “${e.name}” ${this.own?"folder":"gallery"}? Its pictures move back to ${t}.`)){this.busy=!0,this.error="";try{await m.deleteGalleryBoard(e.id);const i=nt("galleryDelete");F(i.message,"success",{emotion:i.emotion,intensity:i.intensity}),this.board===e.id&&(this.board="none",this.items=[]),await this.refresh(),this.own||this.dispatchEvent(new CustomEvent("boards-changed",{bubbles:!0,composed:!0}))}catch(i){this.error=i.message}finally{this.busy=!1}}}isFolder(e){return e!=="none"&&e!=="all"}async renameBoard(e){var i;if(!this.isFolder(e.id)||this.busy)return;const t=(i=window.prompt("Rename this folder",e.name))==null?void 0:i.trim();if(!(!t||t===e.name)){this.busy=!0;try{await m.renameGalleryBoard(e.id,t),await this.reloadBoards()}catch(s){this.error=s.message}finally{this.busy=!1}}}openBoardMenu(e,t){e.preventDefault(),e.stopPropagation();const i=[{label:"Open",icon:"folder_open",run:()=>this.pickBoard(t.id)}];this.isFolder(t.id)&&(this.own&&i.push({label:"Rename",icon:"edit",run:()=>void this.renameBoard(t)}),i.push({label:this.own?"Delete folder":"Delete gallery",icon:"delete",danger:!0,run:()=>void this.deleteBoard(t)})),ye({x:e.clientX,y:e.clientY,title:t.name,items:i})}dropFromView(e){const t=this.items.length;this.items=this.items.filter(s=>!e.has(s.name));const i=t-this.items.length;this.total=Math.max(0,this.total-i),this.boards=this.boards.map(s=>s.id===this.board?{...s,count:Math.max(0,s.count-i)}:s),this.selected=new Set([...this.selected].filter(s=>!e.has(s))),this.viewing&&e.has(this.viewing.name)&&(this.viewing=null)}async deleteImage(e,t=!1){if(this.busy)return;this.busy=!0;const i=t?this.neighbour(e.name):void 0;try{await m.deleteGalleryImage(e.name);const s=nt("galleryDelete");F(s.message,"success",{emotion:s.emotion,intensity:s.intensity}),this.dropFromView(new Set([e.name])),i&&this.open(i)}catch(s){this.error=s.message}finally{this.busy=!1}}async saveToLibrary(e){var t;if(!(this.busy||this.savedNames.has(e.name))){this.busy=!0;try{if(await m.saveGalleryImage({name:e.name}),this.own){const i=((t=this.viewing)==null?void 0:t.name)===e.name?this.neighbour(e.name):void 0;this.dropFromView(new Set([e.name])),this.boards=this.boards.map(s=>s.id==="all"&&this.board!=="all"?{...s,count:Math.max(0,s.count-1)}:s),i&&this.open(i),F("Moved to the library.","success")}else this.savedNames=new Set(this.savedNames).add(e.name);this.dispatchEvent(new CustomEvent("imported",{detail:{count:1,kind:this.isClip(e)?"video":"image",title:this.labelOf(e)},bubbles:!0,composed:!0}))}catch(i){this.error=i.message}finally{this.busy=!1}}}async moveSelectedToLibrary(){const e=[...this.selected];if(!(!e.length||this.busy)){this.busy=!0;try{await m.saveGalleryImage({names:e}),this.dropFromView(new Set(e)),this.selected=new Set,this.selecting=!1,F(e.length===1?"Moved to the library.":`Moved ${e.length} pictures to the library.`,"success"),this.dispatchEvent(new CustomEvent("imported",{detail:{count:e.length,kind:"image"},bubbles:!0,composed:!0})),await this.refresh()}catch(t){this.error=t.message}finally{this.busy=!1}}}async moveNames(e,t){var s;if(!e.length||!t||t===this.board||t==="all"||this.busy)return;this.busy=!0;const i=this.viewing&&e.includes(this.viewing.name)&&this.board!=="all"?this.neighbour(this.viewing.name):void 0;try{await m.addGalleryImagesToBoard(t,e),this.board!=="all"&&this.dropFromView(new Set(e)),this.selected.size||(this.selecting=!1),await this.reloadBoards(),i&&this.open(i);const a=((s=this.boards.find(o=>o.id===t))==null?void 0:s.name)??"the folder";F(`${e.length===1?"Moved":`Moved ${e.length} pictures`} to ${a}.`,"success")}catch(a){this.error=a.message}finally{this.busy=!1}}dragStart(e,t){var s;const i=this.selected.has(t.name)?[...this.selected]:[t.name];if((s=e.dataTransfer)==null||s.setData(_t,JSON.stringify(i)),e.dataTransfer){e.dataTransfer.effectAllowed="move";const a=e.currentTarget.querySelector("img");a&&e.dataTransfer.setDragImage(a,30,30)}this.dragging=!0}dragEnd(){this.dragging=!1,this.dropOn=""}dropTarget(e){const t=e.id!=="all"&&e.id!==this.board;return{over:i=>{var s;!t||!((s=i.dataTransfer)!=null&&s.types.includes(_t))||(i.preventDefault(),i.dataTransfer.dropEffect="move",this.dropOn=e.id)},leave:()=>{this.dropOn===e.id&&(this.dropOn="")},drop:i=>{var a;this.dropOn="";const s=(a=i.dataTransfer)==null?void 0:a.getData(_t);if(!(!t||!s)){i.preventDefault();try{this.moveNames(JSON.parse(s),e.id)}catch{}}}}}coverChoices(e){const t=[...new Set(((e==null?void 0:e.loras)??[]).map(s=>s.name).filter(Boolean))],i=this.loras.filter(s=>!t.includes(s)).sort((s,a)=>s.localeCompare(a));return{used:t,rest:i}}openCover(e){var t;((t=this.viewing)==null?void 0:t.name)!==e.name&&this.open(e),this.coverOpen=!0,this.coverFor="",this.imageInfo(e).then(i=>{var s;((s=this.viewing)==null?void 0:s.name)===e.name&&!this.coverFor&&(this.coverFor=this.coverChoices(i).used[0]??"")},()=>{})}async setCover(e){const t=this.coverFor;if(!(!t||this.busy)){this.busy=!0;try{t.startsWith("model:")?await m.setModelThumb({model:t.slice(6),galleryName:e.name}):await m.setLoraThumb({model:t,galleryName:e.name}),this.coverOpen=!1,F(`Set as ${t.startsWith("model:")?"the model's":`${t}'s`} cover.`,"success"),this.dispatchEvent(new CustomEvent("covers-changed",{bubbles:!0,composed:!0}))}catch(i){F(i.message||"Couldn't set that cover.","error")}finally{this.busy=!1}}}async setFolderCover(e){const t=this.board;if(!this.isFolder(t))return;const i=this.boards;this.boards=this.boards.map(s=>s.id===t?{...s,cover:e.name}:s);try{await m.setGalleryBoardCover(t,e.name),F("That's the folder's cover now.","success")}catch(s){this.boards=i,F(s.message||"Couldn't set the cover.","error")}}async openShareMenu(e,t,i){let s=[];try{s=(await m.chatWorkspace()).characters??[]}catch(a){F(a.message||"Couldn't load your chat characters.","error");return}if(!s.length){F("No chat characters yet — add one in Chat first.","error");return}ye({x:t,y:i,title:"Show this to",items:s.map(a=>({label:a.name,icon:"person",run:()=>void this.share(e,a)}))})}async imageInfo(e){const t=this.metadata.get(e.name);if(t)return t;const i=Gs(await m.galleryImageMetadata(e.name));return this.metadata.set(e.name,i),i}moveTargets(){return this.boards.filter(e=>e.id!==this.board&&e.id!=="all")}openImageMenu(e,t){t.preventDefault(),t.stopPropagation();const s=[...this.moveTargets().map(a=>({label:`Move to ${a.name}`,icon:a.id==="none"?"inbox":"drive_file_move",run:()=>void this.moveNames([e.name],a.id)})),...this.isFolder(this.board)?[{label:"Set as folder cover",icon:"folder_special",run:()=>void this.setFolderCover(e)}]:[]];if(this.isClip(e)){ye({x:t.clientX,y:t.clientY,title:this.labelOf(e),items:[{label:"Play",icon:"play_arrow",run:()=>this.open(e)},{label:"Open in the Video studio",icon:"movie",run:()=>this.openClip(e)},{label:"Upscale…",icon:"open_in_full",run:()=>this.openClip(e,!0)},{label:"Copy prompt",icon:"content_copy",run:()=>void this.copyField(e,"prompt")},ot,...s,{label:"Move to library",icon:"save",run:()=>void this.saveToLibrary(e)},{label:"Download",icon:"download",run:()=>this.downloadClip(e)},{label:"Export for Civitai",icon:"folder_zip",run:()=>this.exportForCivitai([e.name])},ot,{label:"Delete",icon:"delete",danger:!0,run:()=>void this.deleteImage(e)}]});return}ye({x:t.clientX,y:t.clientY,title:this.labelOf(e),items:[{label:"Open",icon:"open_in_full",run:()=>this.open(e)},{label:"Copy prompt",icon:"content_copy",run:()=>void this.copyField(e,"prompt")},{label:"Copy generation metadata",icon:"content_copy",run:()=>void this.copyMetadata(e)},{label:"Use same generation parameters",icon:"replay",run:()=>void this.reuseMetadata(e)},{label:"Start from this picture",icon:"add_photo_alternate",run:()=>this.usePicture(e,"img2img")},...this.canPaint?[{label:"Paint to fix",icon:"brush",run:()=>this.usePicture(e,"inpaint")}]:[],...this.canFixFaces?[{label:this.fixLabel,icon:"face_retouching_natural",run:()=>this.usePicture(e,"faces")}]:[],...this.upscaleLabel?[{label:this.upscaleLabel,icon:"open_in_full",run:()=>this.usePicture(e,"upscale")}]:[],...this.canAnimate?[{label:"Animate",icon:"animation",run:()=>this.usePicture(e,"animate")}]:[],ot,...s,...this.canSetCovers?[{label:"Use as a LoRA's cover…",icon:"photo_library",run:()=>this.openCover(e)}]:[],...this.own?[{label:"Move to library",icon:"save",run:()=>void this.saveToLibrary(e)}]:[],{label:"Export PNG for Civitai",icon:"download",run:()=>void this.exportImage(e)},{label:"Send to chat",icon:"forum",run:()=>void this.openShareMenu(e,t.clientX,t.clientY)},ot,{label:"Delete",icon:"delete",danger:!0,run:()=>void this.deleteImage(e)}]})}exportForCivitai(e){const t=document.createElement("a");t.href=m.galleryExportURL(e!=null&&e.length?{names:e}:{board:this.board,type:this.own&&this.type?this.type:void 0}),t.download="",t.click();const i=(e==null?void 0:e.length)??this.total;F(`Exporting ${i} for Civitai — the zip downloads as it's written, each with its prompt and settings inside and in a .txt beside it.`,"success")}downloadClip(e){const t=document.createElement("a");t.href=m.galleryFullURL(e.name),t.download=`${this.labelOf(e).replace(/\s+/g,"-").toLowerCase()}.mp4`,t.click()}async copyMetadata(e){try{if(!await si(Ne(await this.imageInfo(e))))throw new Error("Clipboard permission was denied.");F("Generation metadata copied.","success")}catch(t){F(t.message||"Couldn't copy generation metadata.","error")}}async copyField(e,t){try{const i=(await this.imageInfo(e))[t];if(!i)throw new Error(t==="prompt"?"This picture has no prompt saved with it.":"This picture has no negative prompt.");if(!await si(i))throw new Error("Clipboard permission was denied.");F(t==="prompt"?"Prompt copied.":"Negative prompt copied.","success")}catch(i){F(i.message||"Couldn't copy that.","error")}}usePicture(e,t){this.dispatchEvent(new CustomEvent("use-picture",{detail:{url:m.galleryFullURL(e.name),name:this.labelOf(e),mode:t,gallery:e.name},bubbles:!0,composed:!0})),this.viewing=null,this.browsing=!1}async reuseMetadata(e){try{const t=await this.imageInfo(e);this.dispatchEvent(new CustomEvent("reuse-generation",{detail:t,bubbles:!0,composed:!0})),this.viewing=null,this.browsing=!1}catch(t){F(t.message||"Couldn't load generation metadata.","error")}}async exportImage(e){try{const t=await this.imageInfo(e),i=this.labelOf(e).replace(/\.[a-z0-9]+$/i,"")||"generated-image";await Hs(m.galleryFullURL(e.name),`${i}-civitai.png`,Ne(t),rt(t)),F("PNG exported with Civitai metadata.","success")}catch(t){F(t.message||"Couldn't export that image.","error")}}async share(e,t){try{await ga(m.galleryFullURL(e.name),t.id,this.labelOf(e)),this.viewing=null,this.browsing=!1,this.dispatchEvent(new CustomEvent("open-chat",{bubbles:!0,composed:!0}))}catch(i){F(i.message||`Couldn't share with ${t.name}.`,"error")}}toggleSelecting(){this.selecting=!this.selecting,this.selecting||(this.selected=new Set),this.pickAnchor=null}clickTile(e,t){if(!this.selecting&&!js(e)){this.open(t);return}this.pick(e,t)}pick(e,t){var s;e.stopPropagation(),e.shiftKey&&((s=window.getSelection())==null||s.removeAllRanges()),this.selecting=!0;const i=qs(this.items.map(a=>a.name),{selected:this.selected,anchor:this.pickAnchor},t.name,e);this.selected=i.selected,this.pickAnchor=i.anchor,this.selected.size||(this.selecting=!1)}selectAll(){this.selected=new Set(this.items.map(e=>e.name))}async deleteSelected(){const e=[...this.selected];if(!(!e.length||this.busy)&&!(this.own&&!confirm(`Delete ${e.length===1?"this picture":`these ${e.length} pictures`}? They are only kept here.`))){this.busy=!0;try{await m.deleteGalleryImages(e);const t=nt("galleryDelete",{count:e.length});F(t.message,"success",{emotion:t.emotion,intensity:t.intensity}),this.dropFromView(new Set(e)),this.selected=new Set,this.selecting=!1}catch(t){this.error=t.message}finally{this.busy=!1}}}folderIcon(e){return e.id==="all"?"photo_library":this.isFolder(e.id)?"folder":"inbox"}renderCover(e){return e.cover&&!this.failedCovers.has(e.cover)?r`<img src=${m.galleryThumbURL(e.cover)} alt="" loading="lazy" draggable="false"
          @error=${()=>this.failedCovers=new Set(this.failedCovers).add(e.cover)} />`:r`<span class="material-symbols-rounded">${this.folderIcon(e)}</span>`}renderNaming(e){return r`<div class=${e}>
      <input maxlength="120" placeholder=${this.own?"Folder name":"Gallery name"} aria-label="New folder's name" .value=${this.newBoard}
        @input=${t=>this.newBoard=t.target.value}
        @keydown=${t=>{t.key==="Enter"&&this.createBoard(),t.key==="Escape"&&(t.stopPropagation(),this.naming=!1)}} />
      <div class="row">
        <button @click=${()=>{this.naming=!1,this.newBoard=""}}>Cancel</button>
        <button class="ok" ?disabled=${this.busy||!this.newBoard.trim()} @click=${()=>void this.createBoard()}>Create</button>
      </div>
    </div>`}renderFolderCards(){const e=t=>{const i=t.currentTarget;Math.abs(t.deltaY)<=Math.abs(t.deltaX)||i.scrollWidth<=i.clientWidth||(i.scrollLeft+=t.deltaY,t.preventDefault())};return r`<div class="folders" role="listbox" aria-label=${this.own?"Folders":"Galleries"} @wheel=${e}>
      ${this.boards.map(t=>{const i=this.dropTarget(t);return r`<button class="folder ${t.id===this.board?"on":""} ${this.dropOn===t.id?"drop":""}" role="option"
          aria-selected=${t.id===this.board?"true":"false"} title=${t.name} @click=${()=>this.pickBoard(t.id)}
          @contextmenu=${s=>this.openBoardMenu(s,t)}
          @dragover=${i.over} @dragleave=${i.leave} @drop=${i.drop}>
          <span class="folder-cover">${this.renderCover(t)}</span>
          <span class="folder-name">${t.name}</span>
          <span class="folder-count">${t.count}</span>
        </button>`})}
      ${this.naming?this.renderNaming("naming"):r`<button class="folder add" title=${this.own?"New folder":"New Invoke gallery"} @click=${()=>this.naming=!0}>
            <span class="material-symbols-rounded">create_new_folder</span>New
          </button>`}
    </div>`}renderSide(){return r`<nav class="side" aria-label=${this.own?"Folders":"Galleries"}>
      <div class="k">${this.own?"Folders":"Galleries"}</div>
      ${this.boards.map(e=>{const t=this.dropTarget(e);return r`<button class="side-item ${e.id===this.board?"on":""} ${this.dropOn===e.id?"drop":""}"
          @click=${()=>this.pickBoard(e.id)} @contextmenu=${i=>this.openBoardMenu(i,e)}
          @dragover=${t.over} @dragleave=${t.leave} @drop=${t.drop}>
          <span class="thumb">${this.renderCover(e)}</span><span class="nm">${e.name}</span><span class="ct">${e.count}</span>
        </button>`})}
      ${this.naming?this.renderNaming("side-naming"):r`<button class="side-item side-new" @click=${()=>this.naming=!0}>
            <span class="thumb"><span class="material-symbols-rounded">add</span></span><span class="nm">New folder</span>
          </button>`}
    </nav>`}openSortMenu(e){const t=e.currentTarget.getBoundingClientRect();ye({x:t.left,y:t.bottom+4,title:"Order",items:Bt.filter(i=>this.own||!i.ownOnly).map(i=>({label:i.label,icon:i.id===this.sort?"check":"",run:()=>this.pickSort(i.id)}))})}openTypeMenu(e){const t=e.currentTarget.getBoundingClientRect();ye({x:t.left,y:t.bottom+4,title:"Show",items:ut.map(i=>({label:i.label,icon:i.id===this.type?"check":i.icon,run:()=>this.pickType(i.id)}))})}renderTypePill(e){if(!this.own)return d;const t=ut.find(i=>i.id===this.type)??ut[0];return r`<button class="pill ${this.type?"on":""}" title="Show pictures, upscales or clips"
      @click=${i=>this.openTypeMenu(i)}>
      <span class="material-symbols-rounded">${this.type?t.icon:"filter_alt"}</span>${e&&!this.type?"All":t.label}</button>`}filingNote(e){if(!this.own)return r`New pictures go to <b>${(e==null?void 0:e.name)??"this gallery"}</b>`;const t=e&&this.isFolder(e.id)?e.name:"Unsorted";return r`New pictures go to <b>${t}</b>`}renderTile(e){const t=this.selected.has(e.name);return r`<div class="tile ${t?"picked":""} ${this.dragging&&t?"dragged":""}" draggable="true"
      title=${this.labelOf(e)} role="button" tabindex="0" aria-pressed=${this.selecting?t?"true":"false":d}
      @click=${i=>this.clickTile(i,e)}
      @keydown=${i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),this.selecting?this.pick(i,e):this.open(e))}}
      @contextmenu=${i=>{this.selecting||this.openImageMenu(e,i)}}
      @dragstart=${i=>this.dragStart(i,e)} @dragend=${()=>this.dragEnd()}>
      ${this.still(e,this.isClip(e)?"Generated clip":"Generated image")}
      ${this.isClip(e)?r`<span class="play"><span class="material-symbols-rounded">play_arrow</span>Clip${e.upscaled?" · HD":""}</span>`:e.upscaled?r`<span class="play" title="Upscaled"><span class="material-symbols-rounded">open_in_full</span>Upscaled</span>`:d}
      <span class="shade"></span>
      <button class="tick" title=${t?"Unpick":"Pick — then drag onto a folder, or use the bar below"} aria-label="Pick"
        @click=${i=>this.pick(i,e)}>
        <span class="material-symbols-rounded">${t?"check":"radio_button_unchecked"}</span>
      </button>
      <span class="acts">
        ${this.own?r`<button title="Move to the library" aria-label="Move to the library"
          @click=${i=>{i.stopPropagation(),this.saveToLibrary(e)}}><span class="material-symbols-rounded">save</span></button>`:d}
        <button title="More" aria-label="More" @click=${i=>this.openImageMenu(e,i)}>
          <span class="material-symbols-rounded">more_horiz</span></button>
      </span>
    </div>`}renderGrid(){if(!this.items.length){if(this.loading)return r`<div class="loading">Loading…</div>`;const i=ut.find(s=>s.id&&s.id===this.type);return i?r`<div class="empty"><span class="material-symbols-rounded">${i.icon}</span>${i.empty}</div>`:r`<div class="empty"><span class="material-symbols-rounded">${this.board==="none"||this.board==="all"?"image":"folder_open"}</span>
        ${this.own&&this.board!=="none"&&this.board!=="all"?"Nothing in here yet. Drag pictures onto this folder, or pick some and use Move.":"Nothing here yet — every picture you make lands here."}</div>`}const t=this.sort!=="largest"?Co(this.items,new Date):[{key:"all",label:"",items:this.items}];return r`
      ${t.map(i=>r`
        ${i.label?r`<div class="day">${i.label}<small>${i.items.length}</small></div>`:d}
        <div class="grid">${i.items.map(s=>this.renderTile(s))}</div>`)}
      ${this.items.length<this.total?r`<div class="sentinel"></div>`:d}
      ${this.loading?r`<div class="loading">Loading more…</div>`:d}
    `}renderSelBar(){if(!this.selecting)return d;const e=this.selected.size;return r`<div class="selbar">
      <span class="n">${e} picked</span>
      ${e<this.items.length?r`<button class="link" @click=${()=>this.selectAll()}>All ${this.items.length}</button>`:d}
      <button class="sbtn" ?disabled=${this.busy||!e} @click=${t=>{const i=t.currentTarget.getBoundingClientRect();ye({x:i.left,y:i.top-8,title:this.own?"Move to folder":"Add to gallery",items:this.moveTargets().map(s=>({label:s.name,icon:s.id==="none"?"inbox":"folder",run:()=>void this.moveNames([...this.selected],s.id)}))})}}><span class="material-symbols-rounded">drive_file_move</span>Move</button>
      ${this.own?r`<button class="sbtn primary" ?disabled=${this.busy||!e} title="Move them into the library; they leave the gallery"
        @click=${()=>void this.moveSelectedToLibrary()}><span class="material-symbols-rounded">save</span>Library</button>`:d}
      <button class="sbtn" ?disabled=${!e} title="Download them as a zip for Civitai, each with its prompt and settings"
        @click=${()=>this.exportForCivitai([...this.selected])}><span class="material-symbols-rounded">folder_zip</span>Civitai</button>
      <button class="sbtn danger" ?disabled=${this.busy||!e} @click=${()=>void this.deleteSelected()}>
        <span class="material-symbols-rounded">delete</span>Delete</button>
      ${this.browsing&&e?r`<span class="drag-hint">Or drag them onto a folder.</span>`:d}
      <button class="sbtn x" title="Stop picking" aria-label="Stop picking" @click=${()=>this.toggleSelecting()}>
        <span class="material-symbols-rounded">close</span></button>
    </div>`}render(){var i;const e=this.boards.find(s=>s.id===this.board),t=this.total||(e==null?void 0:e.count)||0;return r`
      <div class="panel ${this.selecting?"selecting":""}">
        <div class="head">
          <span class="title"><span class="material-symbols-rounded">photo_library</span>${this.own?"Gallery":"Invoke gallery"}</span>
          <span class="count">${t||""}</span>
          <span class="grow"></span>
          ${this.items.length?r`<button class="hbtn ${this.selecting?"on":""}" title=${this.selecting?"Stop picking":"Pick pictures"}
            aria-pressed=${this.selecting?"true":"false"} @click=${()=>this.toggleSelecting()}>
            <span class="material-symbols-rounded">checklist</span></button>`:d}
          ${this.items.length?r`<button class="hbtn" title="Export what's shown here for Civitai, as a zip" aria-label="Export for Civitai"
            @click=${()=>this.exportForCivitai()}><span class="material-symbols-rounded">folder_zip</span></button>`:d}
          <button class="hbtn" title="Open the gallery full screen" aria-label="Open the gallery full screen" @click=${()=>this.browsing=!0}>
            <span class="material-symbols-rounded">open_in_full</span></button>
        </div>
        ${this.boards.length?this.renderFolderCards():d}
        <div class="bar">
          <div class="where"><b>${(e==null?void 0:e.name)??""}</b><span>${this.filingNote(e)}</span></div>
          ${this.renderTypePill(!0)}
          <button class="pill" title="Order" @click=${s=>this.openSortMenu(s)}>
            <span class="material-symbols-rounded">sort</span>${(i=Bt.find(s=>s.id===this.sort))==null?void 0:i.label.replace(" first","")}
          </button>
          ${e&&this.isFolder(e.id)?r`<button class="hbtn" title="Folder options" aria-label="Folder options"
            @click=${s=>this.openBoardMenu(s,e)}><span class="material-symbols-rounded">more_vert</span></button>`:d}
        </div>
        ${this.error?r`<div class="err">${this.error}</div>`:d}
        ${this.browsing?r`<div class="note">The gallery is open full screen.</div>`:this.renderGrid()}
        ${this.browsing?d:this.renderSelBar()}
      </div>
      ${this.browsing?this.renderBrowse(e,t):d}
      ${this.viewing?this.renderViewer(this.viewing):d}
    `}renderBrowse(e,t){var s;const i=Ze.find(a=>a.id===this.tileSize)??Ze[1];return r`<div class="browse ${this.selecting?"selecting":""}" role="dialog" aria-label="Gallery">
      <div class="browse-top">
        <button class="hbtn" title="Back to the studio (Esc)" aria-label="Back to the studio" @click=${()=>this.browsing=!1}>
          <span class="material-symbols-rounded">arrow_back</span></button>
        <div class="where"><b>${(e==null?void 0:e.name)??"Gallery"}</b><span>${t} ${this.type==="videos"?t===1?"clip":"clips":t===1?"picture":"pictures"} · ${this.filingNote(e)}</span></div>
        <span class="grow"></span>
        <label class="size" title="Tile size">
          <span class="material-symbols-rounded">photo_size_select_small</span>
          <input type="range" min="0" max="2" step="1" .value=${String(Ze.indexOf(i))} aria-label="Tile size"
            @input=${a=>this.setTileSize(Ze[Number(a.target.value)].id)} />
          <span class="material-symbols-rounded">photo_size_select_large</span>
        </label>
        ${this.renderTypePill(!1)}
        <button class="pill" @click=${a=>this.openSortMenu(a)}>
          <span class="material-symbols-rounded">sort</span>${(s=Bt.find(a=>a.id===this.sort))==null?void 0:s.label}</button>
        ${this.items.length?r`<button class="pill" title="Download everything shown here as a zip for Civitai, each with its prompt and settings"
          @click=${()=>this.exportForCivitai()}><span class="material-symbols-rounded">folder_zip</span>Export for Civitai</button>`:d}
        ${this.items.length?r`<button class="pill" @click=${()=>this.toggleSelecting()}>
          <span class="material-symbols-rounded">checklist</span>${this.selecting?"Done":"Select"}</button>`:d}
        ${e&&this.isFolder(e.id)?r`<button class="hbtn" title="Folder options" aria-label="Folder options"
          @click=${a=>this.openBoardMenu(a,e)}><span class="material-symbols-rounded">more_vert</span></button>`:d}
      </div>
      ${this.renderSide()}
      <div class="browse-main" style="--tile:${i.px}px">
        ${this.error?r`<div class="err">${this.error}</div>`:d}
        ${this.renderGrid()}
        <div style="flex:1; min-height:18px;"></div>
        ${this.renderSelBar()}
      </div>
    </div>`}renderViewer(e){const t=this.savedNames.has(e.name),i=this.items.findIndex(l=>l.name===e.name),s=i+1<this.items.length||this.items.length<this.total,a=this.items.slice(Math.max(0,i-6),i+7),o=this.moveTargets(),n=(l,p,u,h)=>r`<button title=${u} @click=${h}><span class="material-symbols-rounded">${l}</span>${p}</button>`;return r`
      <div class="viewer" role="dialog" aria-label=${this.labelOf(e)}>
        <div class="stage" @click=${l=>{l.target===l.currentTarget&&(this.viewing=null)}}>
          <div class="stage-top">
            <span class="pos">${i+1} of ${this.total}</span>
            <span class="nm">${this.labelOf(e)}</span>
            <span class="grow"></span>
            <button class="vbtn" title="More" aria-label="More" @click=${l=>this.openImageMenu(e,l)}>
              <span class="material-symbols-rounded">more_horiz</span></button>
            <button class="vbtn" title="Close (Esc)" aria-label="Close" @click=${()=>this.viewing=null}>
              <span class="material-symbols-rounded">close</span></button>
          </div>
          <div class="picture" @click=${l=>{l.target===l.currentTarget&&(this.viewing=null)}}>
            ${fa(e.name,this.isClip(e)?r`<video src=${m.galleryFullURL(e.name)} controls autoplay loop muted playsinline
                  @contextmenu=${l=>this.openImageMenu(e,l)}></video>`:r`<img src=${m.galleryFullURL(e.name)} alt="Generated image"
                  @contextmenu=${l=>this.openImageMenu(e,l)} />`)}
            <button class="vbtn nav prev" title="Previous (←)" aria-label="Previous" ?disabled=${i<=0} @click=${()=>void this.step(-1)}>
              <span class="material-symbols-rounded">chevron_left</span></button>
            <button class="vbtn nav next" title="Next (→)" aria-label="Next" ?disabled=${!s} @click=${()=>void this.step(1)}>
              <span class="material-symbols-rounded">chevron_right</span></button>
          </div>
          <div class="strip">
            ${a.map(l=>r`<button class=${l.name===e.name?"on":""} title=${this.labelOf(l)} @click=${()=>this.open(l)}>
              ${this.still(l,"")}</button>`)}
          </div>
        </div>
        <aside class="info">
          <button class="big" ?disabled=${this.busy||t} @click=${()=>void this.saveToLibrary(e)}
            title=${this.own?"Move it into the library; it leaves the gallery and the next one opens":"Copy it into the library"}>
            <span class="material-symbols-rounded">${t?"check":"save"}</span>
            ${t?"In the library":this.own?"Move to library":"Save to library"}
          </button>
          ${this.isClip(e)?r`<div>
            <div class="k">Carry on with it</div>
            <div class="uses">
              ${n("movie","Video studio","Put it on the Video studio's stage: carry on from its last frame, take a frame, compare",()=>this.openClip(e))}
              ${n("open_in_full","Upscale","Enlarge it through ComfyUI; the enlarged clip lands beside it",()=>this.openClip(e,!0))}
            </div>
          </div>`:r`<div>
            <div class="k">Make another from it</div>
            <div class="uses">
              ${n("add_photo_alternate","Start from","Start the next picture from this one",()=>this.usePicture(e,"img2img"))}
              ${n("replay","Same settings","Put its settings back into the form",()=>void this.reuseMetadata(e))}
              ${this.canPaint?n("brush","Paint to fix","Paint over a part to redo it",()=>this.usePicture(e,"inpaint")):d}
              ${this.canFixFaces?n("face_retouching_natural",this.fixLabel,"Redo it with ADetailer's passes, and nothing else",()=>this.usePicture(e,"faces")):d}
              ${this.upscaleLabel?n("open_in_full",this.upscaleLabel,"Enlarge it without redrawing; the copy lands in the gallery",()=>this.usePicture(e,"upscale")):d}
              ${this.canAnimate?n("animation","Animate","Make a few seconds of video from it",()=>this.usePicture(e,"animate")):d}
              ${n("background_replace","Cut out","Cut the figure out of its background",()=>this.dispatchEvent(new CustomEvent("cut-out",{detail:{url:m.galleryFullURL(e.name),name:e.name},bubbles:!0,composed:!0})))}
            </div>
          </div>`}
          <div>
            <div class="k">File it</div>
            <div class="rowbtns">
              ${o.length?r`<select aria-label="Move to folder" .value=${""} ?disabled=${this.busy}
                @change=${l=>{const p=l.target,u=p.value;p.value="",this.moveNames([e.name],u)}}>
                <option value="">${this.own?"Move to folder…":"Add to gallery…"}</option>
                ${o.map(l=>r`<option value=${l.id}>${l.name}</option>`)}
              </select>`:d}
              ${this.isFolder(this.board)?r`<button title="Show it on this folder's card" @click=${()=>void this.setFolderCover(e)}>
                <span class="material-symbols-rounded">folder_special</span>Folder cover</button>`:d}
              ${this.canSetCovers&&!this.isClip(e)?r`<button title="Make it a LoRA's or a model's cover" @click=${()=>this.openCover(e)}>
                <span class="material-symbols-rounded">photo_library</span>LoRA cover</button>`:d}
            </div>
          </div>
          ${this.coverOpen?this.renderCoverPicker(e,this.info):d}
          <div>
            <div class="k">Share</div>
            <div class="rowbtns">
              ${this.isClip(e)?r`<button @click=${()=>this.downloadClip(e)}>
                <span class="material-symbols-rounded">download</span>Download</button>
              <button title="A zip of the clip with its prompt and settings in it and in a .txt beside it" @click=${()=>this.exportForCivitai([e.name])}>
                <span class="material-symbols-rounded">folder_zip</span>Export for Civitai</button>`:r`
              <button ?disabled=${this.busy} @click=${l=>void this.openShareMenu(e,l.clientX,l.clientY)}>
                <span class="material-symbols-rounded">forum</span>Send to chat</button>
              <button ?disabled=${this.busy} @click=${()=>void this.exportImage(e)}>
                <span class="material-symbols-rounded">download</span>Export for Civitai</button>`}
            </div>
          </div>
          ${this.renderInfo(e)}
          <div class="rowbtns danger-row">
            <button ?disabled=${this.busy} title="Delete it (Del); the next one opens" @click=${()=>void this.deleteImage(e,!0)}>
              <span class="material-symbols-rounded">delete</span>Delete</button>
          </div>
        </aside>
      </div>
    `}copyButton(e,t){return r`<button class="copy" title=${t==="prompt"?"Copy the prompt":"Copy the negative prompt"}
      @click=${()=>void this.copyField(e,t)}>
      <span class="material-symbols-rounded">content_copy</span> Copy
    </button>`}renderCoverPicker(e,t){const{used:i,rest:s}=this.coverChoices(t),a=t==null?void 0:t.model;return r`<div class="cover-pick">
      <div class="k">Use as the cover of</div>
      <select aria-label="Cover of" .value=${this.coverFor}
        @change=${o=>this.coverFor=o.target.value}>
        <option value="" ?selected=${!this.coverFor}>Choose a LoRA…</option>
        ${i.length?r`<optgroup label="Made with">
          ${i.map(o=>r`<option value=${o} ?selected=${o===this.coverFor}>${o}</option>`)}
        </optgroup>`:d}
        ${a?r`<optgroup label="Its model">
          <option value=${`model:${a}`} ?selected=${this.coverFor===`model:${a}`}>${a}</option>
        </optgroup>`:d}
        ${s.length?r`<optgroup label="Every LoRA">
          ${s.map(o=>r`<option value=${o} ?selected=${o===this.coverFor}>${o}</option>`)}
        </optgroup>`:d}
      </select>
      <div class="rowbtns">
        <button ?disabled=${this.busy||!this.coverFor} @click=${()=>void this.setCover(e)}>
          <span class="material-symbols-rounded">check</span>Set cover
        </button>
        <button @click=${()=>this.coverOpen=!1}>Cancel</button>
      </div>
    </div>`}renderInfo(e){const t=this.info,i=e.width&&e.height?`${e.width}×${e.height}`:t!=null&&t.width?`${t.width}×${t.height}`:"",s=e.created?new Date(e.created).toLocaleString():"";return t?r`
      ${t.prompt?r`<div><div class="k">Prompt ${this.copyButton(e,"prompt")}</div><div class="prompt">${t.prompt}</div></div>`:r`<div class="note">No generation settings were saved with this picture.</div>`}
      ${t.negativePrompt?r`<div><div class="k">Negative ${this.copyButton(e,"negativePrompt")}</div><div class="prompt">${t.negativePrompt}</div></div>`:d}
      <div>
        <div class="k">Settings ${t.prompt?r`<button class="copy" title="Copy everything, as A1111 writes it" @click=${()=>void this.copyMetadata(e)}>
          <span class="material-symbols-rounded">content_copy</span> Copy all</button>`:d}</div>
        <dl>
          ${t.model?r`<dt>Model</dt><dd>${t.model}</dd>`:d}
          ${t.seed?r`<dt>Seed</dt><dd>${t.seed}</dd>`:d}
          ${t.steps?r`<dt>Steps</dt><dd>${t.steps}</dd>`:d}
          ${t.cfgScale?r`<dt>CFG</dt><dd>${t.cfgScale}</dd>`:d}
          ${t.sampler?r`<dt>Sampler</dt><dd>${t.sampler}</dd>`:d}
          ${t.clipSkip?r`<dt>Clip skip</dt><dd>${t.clipSkip}</dd>`:d}
          ${t.loras.length?r`<dt>LoRAs</dt><dd>${t.loras.map(a=>`${a.name} ${a.weight}`).join(", ")}</dd>`:d}
          ${i?r`<dt>Size</dt><dd>${i}</dd>`:d}
          ${e.size?r`<dt>File</dt><dd>${e.size<1048576?`${Math.max(1,Math.round(e.size/1024))} KB`:`${(e.size/1048576).toFixed(1)} MB`}</dd>`:d}
          ${s?r`<dt>Made</dt><dd>${s}</dd>`:d}
        </dl>
      </div>`:r`<div class="note">${this.infoError||"Reading its settings…"}</div>`}};A.styles=[ue,Oe,re`
      :host { display: block; color: var(--oppai-text); }
      button { font: inherit; }

      /* ── the rail ─────────────────────────────────────────────────────────── */
      .panel {
        display: flex; flex-direction: column; gap: 10px; padding: 0 10px 12px; box-sizing: border-box;
        background: var(--oppai-surface-2); border-radius: 14px;
      }
      :host([workspace]) { height: 100%; min-height: 0; }
      :host([workspace]) .panel {
        height: 100%; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; border-radius: 0; background: transparent;
      }
      .head {
        position: sticky; top: 0; z-index: 4; display: flex; align-items: center; gap: 4px; min-height: 46px; margin: 0 -10px; padding: 0 6px 0 12px;
        background: var(--oppai-surface-2); border-bottom: 1px solid var(--oppai-border);
      }
      .head .title { font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 7px; }
      .head .title .material-symbols-rounded { font-size: 19px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .head .count { margin-left: 4px; font-size: 11.5px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
      .grow { flex: 1; }
      .hbtn {
        width: 34px; height: 34px; border-radius: 17px; border: none; background: transparent; color: var(--oppai-text-muted);
        display: grid; place-items: center; cursor: pointer; flex: none;
      }
      .hbtn:hover { background: var(--oppai-surface); color: var(--oppai-text); }
      .hbtn.on { background: var(--oppai-primary); color: var(--oppai-on-primary); }
      .hbtn .material-symbols-rounded { font-size: 20px; }

      /* Not shrinkable: the rail is a flex column of fixed height, and a row that
         scrolls sideways is a scroll container, whose least height is nothing — so
         once a few days of pictures overflowed the rail, the folders were squeezed
         out of sight entirely. */
      .folders {
        flex: none; display: grid; grid-auto-flow: column; grid-auto-columns: 96px; gap: 8px; overflow-x: auto; overscroll-behavior-x: contain;
        scrollbar-width: thin; padding: 2px 0 4px; scroll-snap-type: x proximity;
      }
      .folder {
        position: relative; display: flex; flex-direction: column; gap: 2px; padding: 0 0 7px; border: none; border-radius: 13px; cursor: pointer;
        background: var(--oppai-surface); color: var(--oppai-text); text-align: left; overflow: hidden; scroll-snap-align: start;
        outline: 2px solid transparent; outline-offset: -2px; transition: outline-color 0.12s ease, transform 0.15s var(--oppai-ease-spring, ease);
      }
      .folder:hover { transform: translateY(-1px); }
      .folder.on { outline-color: var(--oppai-primary); }
      .folder.drop { outline-color: var(--oppai-accent); transform: scale(1.05); }
      .folder-cover { display: grid; place-items: center; aspect-ratio: 4 / 3; background: var(--oppai-surface-2); color: var(--oppai-text-muted); overflow: hidden; }
      .folder-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .folder-cover .material-symbols-rounded { font-size: 26px; }
      .folder-name { padding: 0 8px; font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .folder-count { padding: 0 8px; font-size: 11px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
      .folder.add { justify-content: center; align-items: center; gap: 4px; padding: 0; border: 1.5px dashed var(--oppai-border-strong); background: none; color: var(--oppai-text-muted); font-size: 11.5px; font-weight: 600; }
      .folder.add .material-symbols-rounded { font-size: 24px; }
      .naming { display: flex; flex-direction: column; gap: 5px; padding: 8px; border-radius: 13px; background: var(--oppai-surface); grid-column: span 2; }
      .naming input, .side-naming input {
        min-width: 0; border: 1px solid var(--oppai-primary); border-radius: 8px; background: var(--oppai-surface-2); color: var(--oppai-text);
        font: inherit; font-size: 12px; padding: 6px 8px; outline: none;
      }
      .naming .row, .side-naming .row { display: flex; gap: 5px; }
      .naming button, .side-naming button { flex: 1; height: 28px; border-radius: 8px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; background: var(--oppai-surface-2); color: var(--oppai-text); }
      .naming button.ok, .side-naming button.ok { background: var(--oppai-primary); color: var(--oppai-on-primary); }

      .bar { display: flex; align-items: center; gap: 6px; min-width: 0; }
      .bar .where { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .bar .where b { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .bar .where span { font-size: 11px; color: var(--oppai-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .bar .where span b { font-size: 11px; color: var(--oppai-text-dim); }
      .pill {
        flex: none; display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 10px; border-radius: 15px;
        border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text-dim); font-size: 12px; cursor: pointer;
      }
      .pill:hover { color: var(--oppai-text); border-color: var(--oppai-text-muted); }
      .pill .material-symbols-rounded { font-size: 17px; }
      /* Narrowed to one kind: said in the primary colour, so a half-empty grid is not
         mistaken for a missing picture. */
      .pill.on { color: var(--oppai-primary); border-color: color-mix(in srgb, var(--oppai-primary) 60%, transparent); }

      .day { display: flex; align-items: baseline; gap: 8px; margin: 6px 2px 6px; font-size: 12px; font-weight: 700; color: var(--oppai-text-dim); }
      .day small { font-weight: 500; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
      .tile {
        position: relative; border-radius: 8px; overflow: hidden; background: var(--oppai-surface); aspect-ratio: 1; cursor: pointer;
        outline: 2px solid transparent; outline-offset: -2px; transition: outline-color 0.12s ease;
      }
      .tile img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.25s var(--oppai-ease-emphasized, ease); }
      .tile:hover img { transform: scale(1.04); }
      .tile.picked { outline-color: var(--oppai-primary); }
      .tile.picked img { transform: scale(0.88); border-radius: 6px; }
      .tile.dragged { opacity: 0.45; }
      /* A clip: a play mark over its still, or a film where it has none. */
      .film { width: 100%; height: 100%; display: grid; place-items: center; color: var(--oppai-text-muted);
        background: linear-gradient(135deg, var(--oppai-surface-2), var(--oppai-surface)); }
      .film .material-symbols-rounded { font-size: 34px; }
      .play {
        position: absolute; top: 4px; right: 4px; display: inline-flex; align-items: center; gap: 2px; padding: 1px 6px 1px 3px;
        border-radius: 9px; background: rgba(0, 0, 0, 0.6); color: #fff; font-size: 10px; font-weight: 700; pointer-events: none;
      }
      .play .material-symbols-rounded { font-size: 15px; }
      .tile .shade {
        position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.15s ease;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.45), transparent 35%, transparent 60%, rgba(0, 0, 0, 0.55));
      }
      .tile:hover .shade, .tile:focus-within .shade, .selecting .tile .shade { opacity: 1; }
      .tick {
        position: absolute; top: 4px; left: 4px; width: 24px; height: 24px; border-radius: 12px; border: none; padding: 0;
        background: rgba(0, 0, 0, 0.35); color: #fff; display: grid; place-items: center; cursor: pointer; opacity: 0; transition: opacity 0.15s ease;
      }
      .tick .material-symbols-rounded { font-size: 18px; }
      .tile:hover .tick, .tile:focus-within .tick, .selecting .tick, .tile.picked .tick { opacity: 1; }
      .tile.picked .tick { background: var(--oppai-primary); color: var(--oppai-on-primary); }
      .acts { position: absolute; right: 4px; bottom: 4px; display: flex; gap: 3px; opacity: 0; transition: opacity 0.15s ease; }
      .tile:hover .acts, .tile:focus-within .acts { opacity: 1; }
      .selecting .acts { display: none; }
      .acts button {
        width: 26px; height: 26px; border-radius: 13px; border: none; padding: 0; background: rgba(0, 0, 0, 0.55); color: #fff;
        display: grid; place-items: center; cursor: pointer;
      }
      .acts button:hover { background: rgba(0, 0, 0, 0.8); }
      .acts .material-symbols-rounded { font-size: 15px; }
      .note { font-size: 12px; color: var(--oppai-text-muted); line-height: 1.45; }
      .empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 12px; text-align: center; font-size: 12.5px; color: var(--oppai-text-muted); }
      .empty .material-symbols-rounded { font-size: 36px; opacity: 0.6; }
      .err { font-size: 12px; color: var(--oppai-error, #f2b8b5); }
      .sentinel { height: 1px; }
      .loading { display: flex; justify-content: center; padding: 10px; font-size: 12px; color: var(--oppai-text-muted); }

      /* What is picked, and what to do with it: along the bottom, over the grid. */
      .selbar {
        position: sticky; bottom: 0; z-index: 5; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 -10px -12px;
        padding: 9px 10px 11px; background: color-mix(in srgb, var(--oppai-surface-2) 94%, transparent); backdrop-filter: blur(10px);
        border-top: 1px solid var(--oppai-border-strong); animation: oppai-fade-in-up 0.18s var(--oppai-ease-emphasized, ease) both;
      }
      .selbar .n { font-size: 12.5px; font-weight: 700; margin-right: 2px; }
      .selbar .link { border: none; background: none; color: var(--oppai-primary-bright, var(--oppai-primary)); font-size: 12px; cursor: pointer; padding: 3px 4px; }
      .sbtn {
        display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 10px; border-radius: 15px; border: none;
        background: var(--oppai-surface); color: var(--oppai-text); font-size: 12px; font-weight: 600; cursor: pointer;
      }
      .sbtn .material-symbols-rounded { font-size: 16px; }
      .sbtn.primary { background: var(--oppai-primary); color: var(--oppai-on-primary); }
      .sbtn.danger { color: var(--oppai-error, #f2b8b5); }
      .sbtn:disabled { opacity: 0.45; cursor: default; }
      .sbtn.x { width: 30px; padding: 0; justify-content: center; margin-left: auto; }
      .drag-hint { margin-left: auto; font-size: 11.5px; color: var(--oppai-text-muted); }
      .drag-hint + .sbtn.x { margin-left: 0; }

      /* ── expanded ─────────────────────────────────────────────────────────── */
      .browse {
        position: fixed; inset: 0; z-index: 65; display: grid; grid-template-columns: 230px minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr);
        background: var(--oppai-bg); animation: oppai-fade-in 0.18s ease both;
      }
      .browse-top {
        grid-column: 1 / 3; display: flex; align-items: center; gap: 8px; height: 58px; padding: 0 12px 0 8px; box-sizing: border-box;
        background: var(--oppai-surface); border-bottom: 1px solid var(--oppai-border-strong);
      }
      .browse-top .where { display: flex; flex-direction: column; min-width: 0; }
      .browse-top .where b { font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .browse-top .where span { font-size: 12px; color: var(--oppai-text-muted); }
      .browse-top .where span b { font-size: inherit; color: var(--oppai-text-dim); }
      .size { display: inline-flex; align-items: center; gap: 6px; color: var(--oppai-text-muted); }
      .size input { width: 90px; accent-color: var(--oppai-primary); }
      .side { overflow-y: auto; padding: 12px 8px; background: var(--oppai-surface); border-right: 1px solid var(--oppai-border); display: flex; flex-direction: column; gap: 2px; }
      .side .k { margin: 4px 10px 8px; font-size: 11px; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase; color: var(--oppai-text-muted); }
      .side-item {
        display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 12px; border: none; background: none; color: var(--oppai-text-dim);
        text-align: left; cursor: pointer; outline: 2px solid transparent; outline-offset: -2px;
      }
      .side-item:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .side-item.on { background: var(--oppai-primary-container); color: var(--oppai-text); }
      .side-item.drop { outline-color: var(--oppai-accent); background: color-mix(in srgb, var(--oppai-accent) 15%, transparent); }
      .side-item .thumb { width: 38px; height: 38px; flex: none; border-radius: 9px; overflow: hidden; display: grid; place-items: center; background: var(--oppai-surface-2); color: var(--oppai-text-muted); }
      .side-item .thumb img { width: 100%; height: 100%; object-fit: cover; }
      .side-item .thumb .material-symbols-rounded { font-size: 20px; }
      .side-item .nm { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .side-item .ct { font-size: 11.5px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
      .side-naming { display: flex; flex-direction: column; gap: 5px; padding: 8px; }
      .side-new { margin-top: 6px; color: var(--oppai-text-muted); }
      .side-new .thumb { border: 1.5px dashed var(--oppai-border-strong); background: none; }
      .browse-main { overflow-y: auto; overscroll-behavior: contain; padding: 14px 18px 0; display: flex; flex-direction: column; gap: 8px; }
      .browse .grid { grid-template-columns: repeat(auto-fill, minmax(var(--tile, 170px), 1fr)); gap: 8px; }
      .browse .tile { border-radius: 12px; }
      .browse .day { font-size: 14px; margin: 14px 2px 4px; }
      .browse .selbar { margin: 8px -18px 0; padding: 12px 18px 14px; }
      @media (max-width: 760px) {
        .browse { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr); }
        .browse-top { grid-column: 1; }
        .side { flex-direction: row; overflow-x: auto; overflow-y: hidden; padding: 8px; border-right: none; border-bottom: 1px solid var(--oppai-border); }
        .side .k, .side-item .ct { display: none; }
        .side-item { flex-direction: column; gap: 3px; flex: none; width: 74px; padding: 4px; }
        .side-item .nm { font-size: 11px; width: 100%; text-align: center; }
        .size { display: none; }
        .browse-main { padding: 10px 10px 0; }
        .browse .selbar { margin: 8px -10px 0; }
      }

      /* ── the viewer ───────────────────────────────────────────────────────── */
      .viewer {
        position: fixed; inset: 0; z-index: 70; display: grid; grid-template-columns: minmax(0, 1fr) 340px; background: rgb(8, 8, 12);
        animation: oppai-fade-in 0.16s ease both;
      }
      .stage { position: relative; min-width: 0; min-height: 0; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; }
      .stage-top { display: flex; align-items: center; gap: 8px; padding: 10px 12px; color: #fff; }
      .stage-top .pos { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
      .stage-top .nm { font-size: 12px; opacity: 0.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
      .vbtn {
        flex: none; width: 40px; height: 40px; border-radius: 20px; border: none; background: rgba(255, 255, 255, 0.08); color: #fff;
        display: grid; place-items: center; cursor: pointer;
      }
      .vbtn:hover { background: rgba(255, 255, 255, 0.18); }
      .vbtn:disabled { opacity: 0.25; cursor: default; }
      .picture { position: relative; min-height: 0; overflow: hidden; }
      /* Laid over its row rather than sized by it: a percentage height on a grid
         item has nothing to resolve against, and a tall picture ran on under the
         filmstrip. */
      .picture img, .picture video {
        position: absolute; inset: 0; width: 100%; height: 100%; padding: 0 64px; box-sizing: border-box; object-fit: contain;
        animation: oppai-fade-in 0.2s ease both;
      }
      .picture video { background: transparent; }
      .picture .nav { position: absolute; top: 50%; transform: translateY(-50%); }
      .picture .nav.prev { left: 12px; }
      .picture .nav.next { right: 12px; }
      .strip { display: flex; gap: 6px; justify-content: center; padding: 10px 12px 14px; overflow-x: auto; scrollbar-width: none; }
      .strip button { flex: none; width: 54px; height: 54px; padding: 0; border-radius: 9px; overflow: hidden; border: 2px solid transparent; background: #111; cursor: pointer; opacity: 0.55; transition: opacity 0.15s ease; }
      .strip button:hover { opacity: 0.9; }
      .strip button.on { border-color: var(--oppai-primary); opacity: 1; }
      .strip img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .info {
        min-height: 0; overflow-y: auto; background: var(--oppai-surface); color: var(--oppai-text); padding: 16px; box-sizing: border-box;
        display: flex; flex-direction: column; gap: 14px; font-size: 12.5px; border-left: 1px solid var(--oppai-border-strong);
      }
      .info .big {
        display: flex; align-items: center; justify-content: center; gap: 7px; height: 44px; border-radius: 14px; border: none;
        background: var(--oppai-primary); color: var(--oppai-on-primary); font-size: 14px; font-weight: 700; cursor: pointer;
      }
      .info .big:disabled { opacity: 0.6; cursor: default; }
      .info .k { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--oppai-text-muted); margin-bottom: 6px; }
      .uses { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
      .uses button {
        display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 4px 9px; border-radius: 12px; border: none;
        background: var(--oppai-surface-2); color: var(--oppai-text); font-size: 11.5px; font-weight: 600; cursor: pointer; text-align: center; line-height: 1.2;
      }
      .uses button:hover { background: var(--oppai-primary-container); }
      .uses .material-symbols-rounded { font-size: 21px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .rowbtns { display: flex; flex-wrap: wrap; gap: 6px; }
      .rowbtns button, .rowbtns select {
        display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 11px; border-radius: 16px; border: 1px solid var(--oppai-border-strong);
        background: transparent; color: var(--oppai-text); font-size: 12px; cursor: pointer;
      }
      .rowbtns select { padding: 0 8px; max-width: 100%; }
      .rowbtns .material-symbols-rounded { font-size: 16px; }
      .prompt { white-space: pre-wrap; word-break: break-word; line-height: 1.45; background: var(--oppai-surface-2); border-radius: 10px; padding: 8px 10px; max-height: 180px; overflow-y: auto; }
      .copy { margin-left: auto; border: none; background: none; color: var(--oppai-primary-bright, var(--oppai-primary)); font-size: 11px; letter-spacing: 0; text-transform: none; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; padding: 2px 4px; border-radius: 6px; }
      .copy:hover { background: var(--oppai-surface-2); }
      .copy .material-symbols-rounded { font-size: 14px; }
      dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 5px 12px; margin: 0; }
      dt { color: var(--oppai-text-muted); }
      dd { margin: 0; overflow-wrap: anywhere; }
      .cover-pick { display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 12px; background: var(--oppai-surface-2); }
      .cover-pick select { border: 1px solid var(--oppai-border-strong); border-radius: 9px; background: var(--oppai-surface); color: var(--oppai-text); font: inherit; font-size: 12px; padding: 7px 8px; }
      .danger-row { margin-top: auto; padding-top: 6px; border-top: 1px solid var(--oppai-border); }
      .danger-row button { width: 100%; justify-content: center; color: var(--oppai-error, #f2b8b5); border-color: color-mix(in srgb, var(--oppai-error, #f2b8b5) 40%, transparent); }
      @media (max-width: 900px) {
        .viewer { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(55vh, 1fr) auto; overflow-y: auto; }
        .stage { min-height: 55vh; }
        .picture img, .picture video { padding: 0 8px; }
        .picture .nav { display: none; }
        .info { border-left: none; overflow: visible; }
      }
    `];_([z()],A.prototype,"backend",2);_([z({type:Boolean})],A.prototype,"canPaint",2);_([z({type:Boolean})],A.prototype,"canFixFaces",2);_([z()],A.prototype,"fixLabel",2);_([z()],A.prototype,"upscaleLabel",2);_([z({type:Boolean})],A.prototype,"canAnimate",2);_([z({attribute:!1})],A.prototype,"loras",2);_([z({type:Boolean})],A.prototype,"canSetCovers",2);_([z({attribute:!1})],A.prototype,"startBoard",2);_([c()],A.prototype,"boards",2);_([c()],A.prototype,"sort",2);_([c()],A.prototype,"type",2);_([c()],A.prototype,"info",2);_([c()],A.prototype,"infoError",2);_([c()],A.prototype,"board",2);_([c()],A.prototype,"items",2);_([c()],A.prototype,"total",2);_([c()],A.prototype,"loading",2);_([c()],A.prototype,"error",2);_([c()],A.prototype,"viewing",2);_([c()],A.prototype,"browsing",2);_([c()],A.prototype,"tileSize",2);_([c()],A.prototype,"busy",2);_([c()],A.prototype,"naming",2);_([c()],A.prototype,"newBoard",2);_([c()],A.prototype,"failedCovers",2);_([c()],A.prototype,"savedNames",2);_([c()],A.prototype,"selecting",2);_([c()],A.prototype,"selected",2);_([c()],A.prototype,"dropOn",2);_([c()],A.prototype,"dragging",2);_([c()],A.prototype,"coverOpen",2);_([c()],A.prototype,"coverFor",2);A=_([ge("oppai-invoke-gallery")],A);const Ce=[{key:"character",label:"Character",icon:"person"},{key:"style",label:"Style",icon:"brush"},{key:"concept",label:"Concept",icon:"lightbulb"},{key:"tools",label:"Tools",icon:"build"},{key:"poses",label:"Poses",icon:"accessibility_new"},{key:"background",label:"Background",icon:"landscape"},{key:"etc",label:"ETC",icon:"more_horiz"}];function Re(e){var t;return(t=Ce.find(i=>i.key===e.categoryKey))==null?void 0:t.key}function Lo(e,t){return t==="all"?!0:t==="none"?!Re(e):Re(e)===t}function Vi(e){const t={all:e.length,none:0};for(const i of Ce)t[i.key]=0;for(const i of e)t[Re(i)??"none"]++;return t}function Ki(e,t,i){const s=new Set(t);return e.map(a=>!s.has(a.name)||(a.categoryKey??"")===i?a:{...a,categoryKey:i||void 0})}function De(e){const t=(e??"").toLowerCase().replace(/[\s_.-]+/g,"");return!t||t==="unknown"||t==="other"||t==="any"?"":t.startsWith("flux")?"flux":t.startsWith("sd3")?"sd3":t.includes("xl")||t.startsWith("pony")||t.startsWith("illustrious")||t.startsWith("noob")?"sdxl":t.startsWith("sd2")?"sd2":t.startsWith("sd1")?"sd1":""}function _e(e){return{sd1:"SD 1.5",sd2:"SD 2",sdxl:"SDXL",sd3:"SD 3",flux:"Flux","":""}[e]}function pt(e,t){const i=De(e),s=De(t);return!i||!s||i===s}const Ft=[{id:"name",label:"Name, A to Z"},{id:"name-desc",label:"Name, Z to A"},{id:"category",label:"Category"},{id:"base",label:"Base model"}];function Le(e){return e.alias||e.name}const Yi=new Map(Ce.map((e,t)=>[e.key,t])),Xi=["sd1","sd2","sdxl","sd3","flux",""];function Mo(e,t){const i=(a,o)=>Le(a).localeCompare(Le(o),void 0,{sensitivity:"base",numeric:!0}),s=[...e];switch(t){case"name-desc":return s.sort((a,o)=>i(o,a));case"category":return s.sort((a,o)=>(Yi.get(Re(a)??"")??99)-(Yi.get(Re(o)??"")??99)||i(a,o));case"base":return s.sort((a,o)=>Xi.indexOf(De(a.base))-Xi.indexOf(De(o.base))||i(a,o));default:return s.sort(i)}}function Io(e,t){const i=t.toLowerCase().split(/\s+/).filter(Boolean);if(!i.length)return!0;const s=`${e.name} ${e.alias??""} ${(e.triggerPhrases??[]).join(" ")}`.toLowerCase();return i.every(a=>s.includes(a))}function Do(e,t){const i=e.filter(s=>Lo(s,t.category)&&Io(s,t.query)&&(!t.fitOnly||pt(s.base,t.modelBase)));return Mo(i,t.order)}function Ro(e,t){return e.filter(i=>!pt(i.base,t)).length}function Zi(e){const t=a=>e.filter(o=>o.outcome===a).length,i=t("filed"),s=[];return s.push(i?`Filed ${i} ${i===1?"LoRA":"LoRAs"}`:"Nothing could be filed"),t("untagged")&&s.push(`${t("untagged")} on Civitai under no category`),t("unknown")&&s.push(`${t("unknown")} not on Civitai`),t("unhashed")&&s.push(`${t("unhashed")} not hashed yet — try again in a few minutes`),t("error")&&s.push(`${t("error")} couldn't be looked up`),s.join(" · ")}function Oo(e){var i;const t=new Map;for(const s of e){const a=(i=Ce.find(o=>o.key===s.category))==null?void 0:i.key;s.outcome!=="filed"||!a||t.set(a,[...t.get(a)??[],s.lora])}return t}var Ao=Object.defineProperty,Eo=Object.getOwnPropertyDescriptor,Q=(e,t,i,s)=>{for(var a=s>1?void 0:s?Eo(t,i):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(a=(s?n(t,i,a):n(a))||a);return s&&a&&Ao(t,i,a),a};const mt=60,hi="application/x-oppai-lora",Xs="oppai.loraPicker";function _o(){try{return JSON.parse(localStorage.getItem(Xs)??"{}")}catch{return{}}}let Y=class extends me{constructor(){super(...arguments),this.loras=[],this.selected={},this.modelBase="",this.thumbVersion=0,this.canEdit=!1,this.civitai=!1,this.error="",this.canRename=!1,this.people=[],this.query="",this.category="all",this.order="name",this.fitOnly=!0,this.limit=mt,this.sorting=!1,this.picked=new Set,this.anchor=null,this.civitaiRun=null,this.civitaiNote="",this.failedThumbs=new Set}connectedCallback(){super.connectedCallback();const e=_o();e.order&&Ft.some(t=>t.id===e.order)&&(this.order=e.order),typeof e.fitOnly=="boolean"&&(this.fitOnly=e.fitOnly),e.category&&(e.category==="all"||e.category==="none"||Ce.some(t=>t.key===e.category))&&(this.category=e.category)}savePrefs(){try{localStorage.setItem(Xs,JSON.stringify({order:this.order,fitOnly:this.fitOnly,category:this.category}))}catch{}}emit(e,t){this.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!0}))}pickCategory(e){this.category=e,this.limit=mt,this.savePrefs()}file(e,t){e.length&&(this.emit("lora-file",{names:e,category:t}),this.picked=new Set([...this.picked].filter(i=>!e.includes(i))))}setSorting(e){this.sorting=e,this.picked=new Set,this.anchor=null}clickCard(e,t,i){var a;if(!this.sorting&&!js(e)){this.emit("lora-toggle",{name:t.name});return}e.shiftKey&&((a=window.getSelection())==null||a.removeAllRanges()),this.sorting=!0;const s=qs(i,{selected:this.picked,anchor:this.anchor},t.name,e);this.picked=s.selected,this.anchor=s.anchor}dragStart(e,t){e.dataTransfer&&(e.dataTransfer.setData(hi,t.name),e.dataTransfer.effectAllowed="copy",setTimeout(()=>this.emit("lora-drag",{name:t.name})))}async sortWithCivitai(){const e=this.loras.filter(i=>!Re(i)).map(i=>i.name);if(!e.length||this.civitaiRun)return;this.civitaiNote="",this.civitaiRun={done:0,total:e.length};const t=[];try{for(let i=0;i<e.length;i+=24){const{results:s}=await m.loraCategoryCivitai(e.slice(i,i+24));t.push(...s),this.emit("loras-sorted",{results:s}),this.civitaiRun={done:Math.min(e.length,i+24),total:e.length}}this.civitaiNote=Zi(t)}catch(i){this.civitaiNote=`${t.length?`${Zi(t)}. `:""}Civitai stopped answering: ${i.message}`}finally{this.civitaiRun=null}}openOrderMenu(e){const t=e.currentTarget.getBoundingClientRect();ye({x:t.left,y:t.bottom+4,title:"Order",items:Ft.map(i=>({label:i.label,icon:i.id===this.order?"check":"",run:()=>{this.order=i.id,this.savePrefs()}}))})}openCardMenu(e,t){var n;e.preventDefault(),e.stopPropagation();const i=t.name in this.selected,s=Re(t),a=this.picked.has(t.name)&&this.picked.size>1?[...this.picked]:[t.name],o=[{label:i?"Take it off":this.people.length>1?"Put it on everyone":"Put it on",icon:i?"remove_circle":"add_circle",run:()=>this.emit("lora-toggle",{name:t.name})},...this.people.map((l,p)=>({label:`Put it on person ${p+1}`,icon:"person",hint:l===t.name?"on":"",disabled:l===t.name,run:()=>this.emit("lora-person",{name:t.name,person:p})})),...this.canEdit?[{label:"Edit its settings",icon:"edit",run:()=>this.emit("lora-edit",{name:t.name})}]:[],...this.canRename?[{label:a.length>1?`Rename ${a.length}…`:"Rename…",icon:"edit_note",run:()=>this.emit("lora-rename",{names:a})}]:[],...(n=t.triggerPhrases)!=null&&n.length?[{label:"Copy trigger words",icon:"content_copy",run:()=>{var l;return void((l=navigator.clipboard)==null?void 0:l.writeText(t.triggerPhrases.join(", ")))}}]:[],ot,...Ce.map(l=>({label:l.label,icon:l.icon,hint:l.key===s?"here":"",disabled:a.length===1&&l.key===s,run:()=>this.file(a,l.key)})),{label:"Unsorted",icon:"inbox",hint:s?"":"here",disabled:a.length===1&&!s,run:()=>this.file(a,"")}];ye({x:e.clientX,y:e.clientY,title:a.length>1?`File ${a.length} LoRAs under`:Le(t),items:o})}thumb(e){return`${m.loraThumbURL(e.name)}&v=${this.thumbVersion}`}renderArt(e,t="style"){const i=this.thumb(e);return this.failedThumbs.has(i)?r`<span class="material-symbols-rounded blank">${t}</span>`:r`<img src=${i} alt="" loading="lazy"
          @error=${()=>this.failedThumbs=new Set(this.failedThumbs).add(i)} />`}renderCategoryPicker(){const e=Vi(this.loras),t=[{id:"all",label:"All",icon:"apps"},...e.none||this.category==="none"?[{id:"none",label:"Unsorted",icon:"inbox"}]:[],...Ce.map(a=>({id:a.key,label:a.label,icon:a.icon}))],i=t.find(a=>a.id===this.category)??t[0];return r`<button class="cat" aria-haspopup="menu" title="Show one category" @click=${a=>{const o=a.currentTarget.getBoundingClientRect();ye({x:o.left,y:o.bottom+4,title:"Category",items:t.map(n=>({label:n.label,icon:n.icon,hint:`${e[n.id]}${n.id===this.category?" ✓":""}`,disabled:!e[n.id]&&n.id!=="all",run:()=>this.pickCategory(n.id)}))})}}>
      <span class="material-symbols-rounded">${i.icon}</span>${i.label}<span class="n">${e[i.id]}</span>
      <span class="material-symbols-rounded caret">expand_more</span>
    </button>`}renderInUse(){const e=this.loras.filter(t=>t.name in this.selected);return e.length?r`<div class="section-k">In use · ${e.length}<span class="grow"></span>
        ${e.length>1?r`<button @click=${()=>e.forEach(t=>this.emit("lora-toggle",{name:t.name}))}>Take all off</button>`:d}
      </div>
      <div class="inuse">
        ${e.map(t=>{const i=this.selected[t.name],s=o=>this.emit("lora-weight",{name:t.name,weight:Number.isFinite(o)?Math.max(-2,Math.min(2,o)):1}),a=t.weightMin&&t.weightMax?`Works at ${t.weightMin}–${t.weightMax}`:"";return r`<div class="inuse-row">
            <span class="thumb">${this.renderArt(t)}</span>
            <span class="name" title=${t.name}>${Le(t)}</span>
            <button class="x" title="Take it off" aria-label=${`Take ${Le(t)} off`} @click=${()=>this.emit("lora-toggle",{name:t.name})}>
              <span class="material-symbols-rounded">close</span>
            </button>
            <div class="weight">
              <input type="range" min="-1" max="2" step="0.05" .value=${String(i)} aria-label=${`${Le(t)} weight`}
                @input=${o=>s(Number(o.target.value))} />
              <input type="number" min="-2" max="2" step="0.05" .value=${String(i)} aria-label=${`${Le(t)} weight`}
                @input=${o=>s(Number(o.target.value))} />
            </div>
            ${a||!pt(t.base,this.modelBase)?r`<span class="hint">${pt(t.base,this.modelBase)?a:`Made for ${_e(De(t.base))}, not this model's ${_e(De(this.modelBase))}`}</span>`:d}
          </div>`})}
      </div>`:d}renderUnsortedCallout(e){if(!e||this.category!=="none"&&this.category!=="all")return d;if(this.category==="all"&&!this.civitai&&!this.civitaiNote)return d;const t=this.civitaiRun;return r`<div class="callout">
      <span><b>${e} ${e===1?"LoRA isn't":"LoRAs aren't"} filed yet.</b>
        ${this.civitai?"Civitai can file the ones it knows by what they are there; the rest can be picked and filed by hand.":"Pick them in Sort mode and file them with one tap."}</span>
      ${t?r`<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax=${t.total} aria-valuenow=${t.done}>
          <span style="width:${Math.round(t.done/Math.max(1,t.total)*100)}%"></span></div>
        <span>Asking Civitai… ${t.done} of ${t.total}</span>`:d}
      ${this.civitaiNote?r`<span>${this.civitaiNote}</span>`:d}
      <div class="acts">
        ${this.civitai?r`<button class="primary" ?disabled=${!!t} @click=${()=>void this.sortWithCivitai()}>
          <span class="material-symbols-rounded">travel_explore</span>Sort with Civitai</button>`:d}
        <button @click=${()=>{this.pickCategory("none"),this.setSorting(!0)}}>
          <span class="material-symbols-rounded">checklist</span>Sort by hand</button>
      </div>
    </div>`}renderCard(e,t){const i=e.name in this.selected,s=this.picked.has(e.name),a=Ce.find(l=>l.key===Re(e)),o=De(e.base),n=pt(e.base,this.modelBase);return r`<div class="card ${i?"on":""} ${s?"picked":""} ${n?"":"unfit"}"
      draggable=${this.sorting?"false":"true"}
      @dragstart=${l=>this.dragStart(l,e)}
      @dragend=${()=>this.emit("lora-drag",{name:""})}
      @contextmenu=${l=>this.openCardMenu(l,e)}>
      <button class="card-main" title=${e.name} aria-pressed=${this.sorting?s?"true":"false":i?"true":"false"}
        @click=${l=>this.clickCard(l,e,t)}>
        <span class="art">
          ${this.renderArt(e)}
          ${o?r`<span class="badge base ${n?"":"warn"}" title=${n?_e(o):`Made for ${_e(o)} — not this model`}>${_e(o)}</span>`:d}
          ${this.sorting?r`<span class="pick"><span class="material-symbols-rounded">${s?"check":"radio_button_unchecked"}</span></span>`:i?r`<span class="badge on"><span class="material-symbols-rounded">check</span>${this.selected[e.name]}</span>`:d}
        </span>
        <span class="card-text">
          <span class="card-name">${Le(e)}</span>
          <span class="card-cat ${a?"":"none"}">
            <span class="material-symbols-rounded">${(a==null?void 0:a.icon)??"inbox"}</span>${(a==null?void 0:a.label)??"Unsorted"}
          </span>
        </span>
      </button>
      <button class="more" title="More — file it, edit it" aria-label=${`More for ${Le(e)}`} @click=${l=>this.openCardMenu(l,e)}>
        <span class="material-symbols-rounded">more_vert</span>
      </button>
    </div>`}renderSortBar(e){if(!this.sorting)return d;const t=[...this.picked];return r`<div class="sortbar">
      <div class="sortbar-head">
        <span><b>${t.length}</b> picked</span>
        ${t.length<e.length?r`<button @click=${()=>this.picked=new Set(e.map(i=>i.name))}>Pick all ${e.length}</button>`:d}
        ${t.length?r`<button @click=${()=>this.picked=new Set}>Clear</button>`:d}
        <span class="grow"></span>
        ${this.canRename&&t.length?r`<button @click=${()=>this.emit("lora-rename",{names:t})}>Rename</button>`:d}
        <button class="done" @click=${()=>this.setSorting(!1)}>Done</button>
      </div>
      <div class="file-to" role="group" aria-label="File the picked LoRAs under">
        ${Ce.map(i=>r`<button ?disabled=${!t.length} @click=${()=>this.file(t,i.key)}>
          <span class="material-symbols-rounded">${i.icon}</span>${i.label}</button>`)}
        <button ?disabled=${!t.length} @click=${()=>this.file(t,"")}>
          <span class="material-symbols-rounded">inbox</span>Unsorted</button>
      </div>
    </div>`}render(){var l;if(!this.loras.length)return r`<div class="note">${this.error?`LoRAs aren't available from this generator: ${this.error}`:"No LoRAs installed."}</div>`;const e=De(this.modelBase),t=this.fitOnly&&!!e,i=Do(this.loras,{category:this.category,query:this.query,fitOnly:t,modelBase:this.modelBase,order:this.order}),s=i.map(p=>p.name),a=e?Ro(this.loras,this.modelBase):0,o=Vi(this.loras).none,n=((l=Ft.find(p=>p.id===this.order))==null?void 0:l.label)??"";return r`
      <div class="bar">
        <label class="search">
          <span class="material-symbols-rounded">search</span>
          <input type="search" placeholder="Search names and trigger words" aria-label="Search LoRAs" .value=${this.query}
            @input=${p=>{this.query=p.target.value,this.limit=mt}} />
        </label>
        <button class="icon-btn" title=${`Order: ${n}`} aria-label="Order" @click=${p=>this.openOrderMenu(p)}>
          <span class="material-symbols-rounded">sort</span>
        </button>
        <button class="icon-btn ${this.sorting?"on":""}" aria-pressed=${this.sorting?"true":"false"}
          title="Sort mode: pick LoRAs and file them under a category" @click=${()=>this.setSorting(!this.sorting)}>
          <span class="material-symbols-rounded">checklist</span>Sort
        </button>
        ${this.canRename&&this.civitai?r`<button class="icon-btn" title="Name the LoRAs shown here after Civitai" aria-label="Name after Civitai"
              ?disabled=${!i.length} @click=${()=>this.emit("lora-rename",{names:s})}>
              <span class="material-symbols-rounded">edit_note</span>
            </button>`:d}
      </div>
      <div class="filters">
        ${this.renderCategoryPicker()}
        ${e&&a?r`<button class="toggle ${t?"on":""}" aria-pressed=${t?"true":"false"}
              @click=${()=>{this.fitOnly=!this.fitOnly,this.savePrefs()}}>
              <span class="material-symbols-rounded">${t?"filter_alt":"filter_alt_off"}</span>
              ${t?`Only ${_e(e)} · ${a} hidden`:`All · ${a} not ${_e(e)}`}
            </button>`:d}
        ${this.order!=="name"?r`<span>${n}</span>`:d}
      </div>
      ${this.sorting?d:this.renderInUse()}
      ${this.renderUnsortedCallout(o)}
      ${i.length?r`<div class="section-k">${this.sorting?"Pick the ones to file":"Library"}<span class="grow"></span>
            ${this.sorting?d:r`<span class="drag-hint"><span class="material-symbols-rounded">drag_indicator</span>${this.people.length>1?"Drag one onto a person":"Drag one onto the picture"}</span>`}
          </div>
          <div class="grid">${i.slice(0,this.limit).map(p=>this.renderCard(p,s))}</div>
          ${i.length>this.limit?r`<button class="more-btn" @click=${()=>this.limit+=mt}>Show more (${i.length-this.limit} left)</button>`:d}`:r`<div class="note">${this.query.trim()?`No LoRA here matches “${this.query.trim()}”.`:this.category==="none"?"Every LoRA is filed.":"Nothing filed here yet — use Sort, or a card's ⋯ menu, to file LoRAs here."}</div>`}
      ${this.renderSortBar(i)}
    `}};Y.styles=[ue,Oe,re`
      :host { display: block; color: var(--oppai-text); }
      .bar { display: flex; gap: 6px; align-items: center; margin-bottom: 10px; }
      .search { position: relative; flex: 1; min-width: 0; }
      .search input {
        width: 100%; height: 38px; box-sizing: border-box; padding: 0 12px 0 36px;
        border: 1px solid var(--oppai-border-strong); border-radius: 19px; background: var(--oppai-surface);
        color: var(--oppai-text); font: inherit; font-size: 13px; outline: none;
      }
      .search input:focus { border-color: var(--oppai-primary); }
      .search .material-symbols-rounded { position: absolute; left: 11px; top: 9px; font-size: 20px; color: var(--oppai-text-muted); pointer-events: none; }
      .icon-btn {
        flex: none; height: 38px; min-width: 38px; padding: 0 10px; box-sizing: border-box; border-radius: 19px;
        border: 1px solid var(--oppai-border-strong); background: var(--oppai-surface); color: var(--oppai-text-dim);
        display: inline-flex; align-items: center; justify-content: center; gap: 5px; font: inherit; font-size: 12px;
        font-weight: 600; cursor: pointer;
      }
      .icon-btn:hover { color: var(--oppai-text); border-color: var(--oppai-text-muted); }
      .icon-btn.on { background: var(--oppai-primary); border-color: var(--oppai-primary); color: var(--oppai-on-primary); }
      .icon-btn .material-symbols-rounded { font-size: 19px; }

      .cat {
        flex: none; display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 10px 0 12px; border-radius: 17px;
        border: none; background: var(--oppai-primary-container); color: var(--oppai-text); font: inherit; font-size: 12.5px;
        font-weight: 600; cursor: pointer; max-width: 100%;
      }
      .cat .material-symbols-rounded { font-size: 17px; }
      .cat .n { font-weight: 500; color: var(--oppai-text-dim); font-variant-numeric: tabular-nums; }
      .cat .caret { margin-left: 2px; color: var(--oppai-text-dim); }
      .filters { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 12px; font-size: 12px; color: var(--oppai-text-muted); }
      .toggle {
        display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 10px; border-radius: 14px;
        border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text-dim);
        font: inherit; font-size: 12px; cursor: pointer;
      }
      .toggle .material-symbols-rounded { font-size: 15px; }
      .toggle.on { border-color: color-mix(in srgb, var(--oppai-primary) 60%, transparent); color: var(--oppai-text); background: color-mix(in srgb, var(--oppai-primary) 12%, transparent); }

      .section-k {
        display: flex; align-items: center; gap: 8px; margin: 2px 0 8px; font-size: 11px; font-weight: 700;
        letter-spacing: 0.7px; text-transform: uppercase; color: var(--oppai-text-muted);
      }
      .section-k .grow { flex: 1; }
      .drag-hint { display: inline-flex; align-items: center; gap: 2px; font-weight: 500; letter-spacing: 0; text-transform: none; }
      .drag-hint .material-symbols-rounded { font-size: 15px; }
      .card[draggable="true"] { cursor: grab; }
      .icon-btn:disabled { opacity: 0.45; cursor: default; }
      /* A phone has no dragging to do; the card's menu puts a LoRA on a person. */
      @media (hover: none) { .drag-hint { display: none; } }
      .section-k button { border: none; background: none; color: var(--oppai-primary-bright, var(--oppai-primary)); font: inherit; font-size: 11px; letter-spacing: 0; text-transform: none; cursor: pointer; padding: 2px 4px; }

      .inuse { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
      .inuse-row {
        display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; grid-template-rows: auto auto; column-gap: 10px; row-gap: 2px;
        align-items: center; padding: 8px 8px 8px 8px; border-radius: 14px; background: var(--oppai-surface);
        border: 1px solid color-mix(in srgb, var(--oppai-primary) 35%, transparent);
        animation: oppai-fade-in-up 0.2s var(--oppai-ease-emphasized, ease) both;
      }
      .inuse-row .thumb { grid-column: 1; grid-row: 1 / 4; width: 40px; height: 52px; border-radius: 9px; overflow: hidden; background: var(--oppai-surface-2); display: grid; place-items: center; color: var(--oppai-text-muted); }
      .inuse-row .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .inuse-row .name { grid-column: 2; grid-row: 1; font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .inuse-row .x { grid-column: 3; grid-row: 1; border: none; background: none; color: var(--oppai-text-muted); width: 28px; height: 28px; border-radius: 14px; cursor: pointer; display: grid; place-items: center; }
      .inuse-row .x:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .weight { grid-column: 2 / 4; grid-row: 2; display: flex; align-items: center; gap: 8px; }
      .weight input[type="range"] { flex: 1; min-width: 0; accent-color: var(--oppai-primary); }
      .weight input[type="number"] {
        width: 58px; box-sizing: border-box; height: 28px; padding: 0 6px; border-radius: 8px; border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-surface-2); color: var(--oppai-text); font: inherit; font-size: 12px; font-variant-numeric: tabular-nums;
      }
      .hint { grid-column: 2 / 4; grid-row: 3; font-size: 11px; color: var(--oppai-text-muted); }

      .callout {
        display: flex; flex-direction: column; gap: 8px; padding: 12px; margin-bottom: 14px; border-radius: 14px;
        background: color-mix(in srgb, var(--oppai-accent) 9%, var(--oppai-surface));
        border: 1px solid color-mix(in srgb, var(--oppai-accent) 30%, transparent); font-size: 12.5px; line-height: 1.45; color: var(--oppai-text-dim);
      }
      .callout b { color: var(--oppai-text); }
      .callout .acts { display: flex; gap: 6px; flex-wrap: wrap; }
      .callout button {
        display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 12px; border-radius: 15px; border: none;
        background: var(--oppai-surface-2); color: var(--oppai-text); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
      }
      .callout button.primary { background: var(--oppai-primary); color: var(--oppai-on-primary); }
      .callout button:disabled { opacity: 0.55; cursor: default; }
      .callout button .material-symbols-rounded { font-size: 16px; }
      .progress { height: 4px; border-radius: 2px; background: var(--oppai-surface-2); overflow: hidden; }
      .progress span { display: block; height: 100%; background: var(--oppai-primary); transition: width 0.3s ease; }

      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .card {
        position: relative; border-radius: 14px; background: var(--oppai-surface); border: 2px solid transparent;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.16); transition: transform 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
      }
      .card:hover { transform: translateY(-2px); border-color: var(--oppai-border-strong); }
      .card.on { border-color: var(--oppai-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--oppai-primary) 22%, transparent); }
      .card.picked { border-color: var(--oppai-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--oppai-accent) 25%, transparent); }
      .card.unfit { opacity: 0.55; }
      .card-main { display: block; width: 100%; padding: 0; border: none; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; border-radius: 12px; overflow: hidden; }
      .art { position: relative; aspect-ratio: 3 / 4; background: var(--oppai-surface-2); display: grid; place-items: center; color: var(--oppai-text-muted); }
      .art img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .art .material-symbols-rounded.blank { font-size: 34px; }
      .badge {
        position: absolute; display: inline-flex; align-items: center; gap: 3px; height: 20px; padding: 0 7px; border-radius: 10px;
        background: rgba(0, 0, 0, 0.6); color: #fff; font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px; backdrop-filter: blur(4px);
      }
      .badge .material-symbols-rounded { font-size: 13px; }
      .badge.base { left: 6px; top: 6px; }
      .badge.warn { background: color-mix(in srgb, var(--oppai-error, #f2b8b5) 80%, #000); }
      .badge.on { right: 6px; top: 6px; background: var(--oppai-primary); color: var(--oppai-on-primary); }
      .pick {
        position: absolute; right: 6px; top: 6px; width: 24px; height: 24px; border-radius: 12px; display: grid; place-items: center;
        background: rgba(0, 0, 0, 0.55); color: #fff;
      }
      .card.picked .pick { background: var(--oppai-accent); color: var(--oppai-on-accent); }
      .pick .material-symbols-rounded { font-size: 17px; }
      .card-text { padding: 7px 34px 8px 10px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .card-name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .card-cat { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: var(--oppai-text-muted); white-space: nowrap; overflow: hidden; }
      .card-cat .material-symbols-rounded { font-size: 13px; }
      .card-cat.none { color: color-mix(in srgb, var(--oppai-accent) 75%, var(--oppai-text-muted)); }
      .more {
        position: absolute; right: 4px; bottom: 6px; width: 28px; height: 28px; border-radius: 14px; border: none; background: none;
        color: var(--oppai-text-muted); display: grid; place-items: center; cursor: pointer;
      }
      .more:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .more .material-symbols-rounded { font-size: 18px; }

      .note { font-size: 12.5px; color: var(--oppai-text-muted); line-height: 1.45; padding: 6px 2px 12px; }
      .more-btn {
        width: 100%; margin-top: 12px; height: 36px; border-radius: 12px; border: 1px dashed var(--oppai-border-strong);
        background: none; color: var(--oppai-text-dim); font: inherit; font-size: 12.5px; cursor: pointer;
      }

      /* Sort mode's bar: what is picked, and a button per category to file it under. */
      .sortbar {
        position: sticky; bottom: -24px; z-index: 3; margin: 14px -16px -24px; padding: 10px 12px 14px;
        background: color-mix(in srgb, var(--oppai-surface-2) 92%, transparent); backdrop-filter: blur(10px);
        border-top: 1px solid var(--oppai-border-strong); display: flex; flex-direction: column; gap: 8px;
        animation: oppai-fade-in-up 0.2s var(--oppai-ease-emphasized, ease) both;
      }
      .sortbar-head { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--oppai-text-dim); }
      .sortbar-head b { color: var(--oppai-text); }
      .sortbar-head .grow { flex: 1; }
      .sortbar-head button { border: none; background: none; color: var(--oppai-primary-bright, var(--oppai-primary)); font: inherit; font-size: 12px; cursor: pointer; padding: 3px 6px; border-radius: 6px; }
      .sortbar-head button.done { background: var(--oppai-primary); color: var(--oppai-on-primary); font-weight: 600; padding: 4px 12px; border-radius: 12px; }
      .file-to { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; }
      .file-to button {
        display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 2px; border-radius: 10px; border: none;
        background: var(--oppai-surface); color: var(--oppai-text); font: inherit; font-size: 10.5px; font-weight: 600; cursor: pointer;
      }
      .file-to button .material-symbols-rounded { font-size: 18px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .file-to button:hover:not(:disabled) { background: var(--oppai-primary-container); }
      .file-to button:disabled { opacity: 0.4; cursor: default; }
    `];Q([z({attribute:!1})],Y.prototype,"loras",2);Q([z({attribute:!1})],Y.prototype,"selected",2);Q([z()],Y.prototype,"modelBase",2);Q([z({type:Number})],Y.prototype,"thumbVersion",2);Q([z({type:Boolean})],Y.prototype,"canEdit",2);Q([z({type:Boolean})],Y.prototype,"civitai",2);Q([z()],Y.prototype,"error",2);Q([z({type:Boolean})],Y.prototype,"canRename",2);Q([z({attribute:!1})],Y.prototype,"people",2);Q([c()],Y.prototype,"query",2);Q([c()],Y.prototype,"category",2);Q([c()],Y.prototype,"order",2);Q([c()],Y.prototype,"fitOnly",2);Q([c()],Y.prototype,"limit",2);Q([c()],Y.prototype,"sorting",2);Q([c()],Y.prototype,"picked",2);Q([c()],Y.prototype,"civitaiRun",2);Q([c()],Y.prototype,"civitaiNote",2);Q([c()],Y.prototype,"failedThumbs",2);Y=Q([ge("oppai-lora-picker")],Y);function Ji(e){const t=e.replace(/[^\p{L}\p{N} ._-]+/gu," ").split(/\s+/).filter(Boolean).join(" ").replace(/^[ ._-]+|[ ._-]+$/g,""),i=[...t];return i.length>100?i.slice(0,100).join("").replace(/[ ._-]+$/,""):t}function He(e,t){if(e!=="detector")return Ji(t);const i=Ji(t.replace(/\.pt$/i,""));return i?`${i}.pt`:""}function Bo(e,t,i){if(!i.has(t.toLowerCase()))return t;const s=e==="detector"?t.replace(/\.pt$/i,""):t;for(let a=2;;a++){const o=e==="detector"?`${s}_${a}.pt`:`${s} ${a}`;if(!i.has(o.toLowerCase()))return o}}function Fo(e,t,i){const s=new Set(t.map(o=>o.name)),a=new Set(i.filter(o=>!s.has(o)).map(o=>o.toLowerCase()));for(const o of t)o.outcome!=="named"&&a.add(o.name.toLowerCase());return t.map(o=>{let n=o.to?He(e,o.to):"";if(n&&o.outcome==="named"){const l=new Set(a);l.delete(o.name.toLowerCase()),n=n.toLowerCase()===o.name.toLowerCase()?n:Bo(e,n,l),a.add(n.toLowerCase())}return{name:o.name,to:n,civitai:o.civitai,outcome:o.outcome,error:o.error,pick:o.outcome==="named"&&n!==o.name}})}function Qi(e,t){return t.filter(i=>i.pick).map(i=>({name:i.name,to:He(e,i.to)})).filter(i=>i.to&&i.to!==i.name)}function Zs(e){return new Map(e.map(t=>[t.oldName,t.newName]))}function No(e,t){return Object.fromEntries(Object.entries(e).map(([i,s])=>[t.get(i)??i,s]))}const Uo=e=>e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");function gt(e,t){let i=e;for(const[s,a]of t)i=i.replace(new RegExp(`<lora:${Uo(s)}(?=[:>])`,"g"),`<lora:${a}`);return i}var jo=Object.defineProperty,qo=Object.getOwnPropertyDescriptor,we=(e,t,i,s)=>{for(var a=s>1?void 0:s?qo(t,i):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(a=(s?n(t,i,a):n(a))||a);return s&&a&&jo(t,i,a),a};const es=24;let ce=class extends me{constructor(){super(...arguments),this.kind="lora",this.names=[],this.existing=[],this.suggestions=[],this.rows=[],this.asked=0,this.askError="",this.showAll=!1,this.applying=!1,this.failed=[],this.cancelled=!1,this.onKey=e=>{e.key==="Escape"&&!this.applying&&this.close()}}connectedCallback(){super.connectedCallback(),window.addEventListener("keydown",this.onKey)}firstUpdated(){this.showAll=this.names.length<=3,this.ask()}disconnectedCallback(){super.disconnectedCallback(),this.cancelled=!0,window.removeEventListener("keydown",this.onKey)}close(){this.dispatchEvent(new CustomEvent("close"))}async ask(){for(let e=0;e<this.names.length&&!this.cancelled;e+=es){try{const{suggestions:t}=await m.suggestNames(this.kind,this.names.slice(e,e+es));this.suggestions=[...this.suggestions,...t]}catch(t){this.askError=`Civitai stopped answering: ${t.message}`,this.suggestions=[...this.suggestions,...this.names.slice(e).map(i=>({name:i,outcome:"error"}))],e=this.names.length}this.asked=this.suggestions.length,this.mergeRows()}}mergeRows(){const e=new Map(this.rows.map(t=>[t.name,t]));this.rows=Fo(this.kind,this.suggestions,this.existing).map(t=>{const i=e.get(t.name);return i?{...t,to:i.to,pick:i.pick}:{...t,to:t.to||t.name}})}edit(e,t){this.rows=this.rows.map(i=>i.name===e?{...i,to:t,pick:He(this.kind,t)!==i.name&&!!He(this.kind,t)}:i)}tick(e,t){this.rows=this.rows.map(i=>i.name===e?{...i,pick:t}:i)}async apply(){const e=Qi(this.kind,this.rows);if(!e.length)return;this.applying=!0,this.failed=[];const t=[];try{for(let s=0;s<e.length;s+=100){const a=await m.renameModels(this.kind,e.slice(s,s+100));t.push(...a.renamed),this.failed=[...this.failed,...a.failed]}}catch(s){this.failed=[...this.failed,{name:"",error:s.message}]}finally{this.applying=!1}if(t.length&&this.dispatchEvent(new CustomEvent("renamed",{detail:{renamed:t}})),!this.failed.length){this.close();return}const i=new Set(t.map(s=>s.oldName));this.rows=this.rows.filter(s=>!i.has(s.name))}why(e){switch(e.outcome){case"named":return e.civitai?`on Civitai as “${e.civitai}”`:"";case"same":return"already named after Civitai";case"unknown":return"Civitai doesn't know it";case"unhashed":return"not hashed yet — try again in a minute";default:return e.error?`couldn't ask: ${e.error}`:"couldn't ask Civitai"}}render(){const e=this.names.length,t=this.asked<e&&!this.askError,i=this.showAll?this.rows:this.rows.filter(n=>n.outcome==="named"||n.pick),s=this.rows.length-i.length,a=Qi(this.kind,this.rows).length,o=this.kind==="detector"?"detector":"LoRA";return r`
      <div class="scrim" @click=${()=>!this.applying&&this.close()}></div>
      <div class="card" role="dialog" aria-modal="true" aria-label=${`Name ${o}s after Civitai`}>
        <div class="head">
          <span class="material-symbols-rounded">edit_note</span>
          <h2>${e===1?`Rename this ${o}`:`Name ${e} ${o}s after Civitai`}</h2>
          <button class="x" title="Close" aria-label="Close" ?disabled=${this.applying} @click=${()=>this.close()}>
            <span class="material-symbols-rounded">close</span></button>
        </div>
        <div class="intro">
          ${this.kind==="detector"?"Each detector is named for what it finds and which YOLO it is, as ADetailer's own are. ADetailer reads the new names when Automatic1111 restarts.":"Each LoRA is named after its model and version on Civitai. Its cover, trigger words and category go with it, and the LoRAs that are on follow the new name."}
        </div>
        ${t?r`<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax=${e} aria-valuenow=${this.asked}>
          <span style="width:${Math.round(this.asked/Math.max(1,e)*100)}%"></span></div>`:d}
        <div class="list">
          ${i.map(n=>r`<div class="row ${n.pick?"":"off"}">
            <input type="checkbox" .checked=${n.pick} aria-label=${`Rename ${n.name}`}
              ?disabled=${!He(this.kind,n.to)||He(this.kind,n.to)===n.name}
              @change=${l=>this.tick(n.name,l.target.checked)} />
            <span class="old" title=${n.name}>${n.name}${this.why(n)?r` <span class="why">· ${this.why(n)}</span>`:d}</span>
            <input class="new" .value=${n.to} aria-label=${`New name for ${n.name}`} spellcheck="false"
              @input=${l=>this.edit(n.name,l.target.value)} />
          </div>`)}
          ${i.length?d:r`<div class="empty">${t?"Asking Civitai…":this.rows.length?"Civitai has no new names for these.":""}</div>`}
        </div>
        <div class="summary">
          ${t?r`<span>Asking Civitai… ${this.asked} of ${e}</span>`:d}
          ${s?r`<span>${s} more without a new name</span>`:d}
          ${s||this.showAll&&e>3?r`<button @click=${()=>this.showAll=!this.showAll}>${this.showAll?"Only the ones to rename":"Show them to name by hand"}</button>`:d}
        </div>
        ${this.askError?r`<div class="error">${this.askError}</div>`:d}
        ${this.failed.length?r`<div class="error">${this.failed.map(n=>r`<div>${n.name?r`<b>${n.name}</b>: `:d}${n.error}</div>`)}</div>`:d}
        <div class="foot">
          <span class="grow">${a?`${a} to rename`:""}</span>
          <button class="btn" ?disabled=${this.applying} @click=${()=>this.close()}>Cancel</button>
          <button class="btn primary" ?disabled=${!a||this.applying} @click=${()=>void this.apply()}>
            ${this.applying?"Renaming…":a===1?"Rename":`Rename ${a||""}`}</button>
        </div>
      </div>
    `}};ce.styles=[ue,Oe,re`
      :host { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 16px; box-sizing: border-box; }
      .scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.55); animation: oppai-fade-in 0.15s ease both; }
      .card {
        position: relative; width: min(640px, 100%); max-height: min(720px, calc(100vh - 32px)); display: flex; flex-direction: column;
        border-radius: 20px; background: var(--oppai-surface); color: var(--oppai-text); border: 1px solid var(--oppai-border-strong);
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45); animation: oppai-fade-in-up 0.2s var(--oppai-ease-emphasized, ease) both;
      }
      .head { display: flex; align-items: center; gap: 10px; padding: 16px 18px 10px; }
      .head .material-symbols-rounded { color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .head h2 { margin: 0; font-size: 16px; font-weight: 650; flex: 1; }
      .x { border: none; background: none; color: var(--oppai-text-muted); width: 32px; height: 32px; border-radius: 16px; cursor: pointer; display: grid; place-items: center; }
      .x:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .intro { padding: 0 18px 10px; font-size: 12.5px; line-height: 1.45; color: var(--oppai-text-dim); }
      .progress { height: 4px; margin: 0 18px 10px; border-radius: 2px; background: var(--oppai-surface-2); overflow: hidden; }
      .progress span { display: block; height: 100%; background: var(--oppai-primary); transition: width 0.3s ease; }
      .list { flex: 1; min-height: 80px; overflow-y: auto; padding: 0 18px; display: flex; flex-direction: column; gap: 6px; }
      .row {
        display: grid; grid-template-columns: 24px minmax(0, 1fr); column-gap: 8px; row-gap: 3px; align-items: center;
        padding: 8px 10px; border-radius: 12px; background: var(--oppai-surface-2);
      }
      .row.off { opacity: 0.65; }
      .row input[type="checkbox"] { grid-row: 1 / 3; width: 18px; height: 18px; accent-color: var(--oppai-primary); margin: 0; }
      .old { font-size: 11.5px; color: var(--oppai-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .old .why { color: var(--oppai-text-dim); }
      .new {
        width: 100%; box-sizing: border-box; height: 32px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-surface); color: var(--oppai-text); font: inherit; font-size: 13px; outline: none;
      }
      .new:focus { border-color: var(--oppai-primary); }
      .summary { padding: 10px 18px 0; font-size: 12px; color: var(--oppai-text-muted); display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .summary button { border: none; background: none; color: var(--oppai-primary-bright, var(--oppai-primary)); font: inherit; font-size: 12px; cursor: pointer; padding: 2px 4px; }
      .error { margin: 8px 18px 0; padding: 8px 10px; border-radius: 10px; font-size: 12px; line-height: 1.4;
        background: color-mix(in srgb, var(--oppai-error, #f2b8b5) 16%, transparent); color: var(--oppai-text); }
      .foot { display: flex; align-items: center; gap: 8px; padding: 14px 18px 16px; }
      .foot .grow { flex: 1; font-size: 12px; color: var(--oppai-text-dim); }
      .btn {
        height: 36px; padding: 0 16px; border-radius: 18px; border: 1px solid var(--oppai-border-strong); background: none;
        color: var(--oppai-text); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
      }
      .btn.primary { background: var(--oppai-primary); border-color: var(--oppai-primary); color: var(--oppai-on-primary); }
      .btn:disabled { opacity: 0.5; cursor: default; }
      .empty { padding: 18px 2px; font-size: 12.5px; color: var(--oppai-text-muted); text-align: center; }
    `];we([z()],ce.prototype,"kind",2);we([z({attribute:!1})],ce.prototype,"names",2);we([z({attribute:!1})],ce.prototype,"existing",2);we([c()],ce.prototype,"suggestions",2);we([c()],ce.prototype,"rows",2);we([c()],ce.prototype,"asked",2);we([c()],ce.prototype,"askError",2);we([c()],ce.prototype,"showAll",2);we([c()],ce.prototype,"applying",2);we([c()],ce.prototype,"failed",2);ce=we([ge("oppai-rename-dialog")],ce);const dt="hand_yolov8n.pt",ui="face_yolov8n.pt",Li=[{id:"face_yolov8n.pt",label:"Face (fast)"},{id:"face_yolov8s.pt",label:"Face (accurate)"},{id:"mediapipe_face_full",label:"MediaPipe face"},{id:"person_yolov8n-seg.pt",label:"Whole person"}];function Nt(e){const t=[];return e.faces&&t.push(e.faceModel||ui),e.hands&&t.push(dt),t}function ts(e,t){const i=e!=null&&e.length?e:t?[t]:[ui],s=i.includes(dt),a=i.find(o=>o!==dt);return{faces:!!a,faceModel:a??ui,hands:s}}function Je(e){return e.faces&&e.hands?"Fix faces & hands":e.hands?"Fix hands":"Fix faces"}const is=new Set([dt,...Li.map(e=>e.id)]);function Wo(e){const t=[...new Set(e??[])];return[...t.filter(i=>!is.has(i)),...t.filter(i=>is.has(i))]}function mi(e){const t=Li.find(o=>o.id===e);if(t)return t.label;if(e===dt)return"Hands";const i=e.replace(/\.(pt|pth|safetensors|onnx)$/i,""),s=i.match(/^(.*?)[_\- ]?(yolo\w*(?:[-_ ]seg)?)$/i),a=o=>o.replace(/[_\-]+/g," ").trim();return s&&s[1]?`${a(s[1])} (${a(s[2])})`:a(i)||e}function Ut(e){return e.filter(t=>t.model.trim()).map(t=>({model:t.model.trim(),prompt:t.prompt.trim()||void 0,loras:t.lora?[{name:t.lora,weight:t.loraWeight}]:void 0,denoise:t.denoise>0?t.denoise:void 0}))}function Go(e){return(e??[]).filter(t=>t.model).map(t=>{const[i,...s]=t.loras??[],a=s.map(o=>`<lora:${o.name}:${o.weight}>`).join(" ");return{model:t.model,prompt:[t.prompt??"",a].filter(Boolean).join(" "),lora:(i==null?void 0:i.name)??"",loraWeight:(i==null?void 0:i.weight)??.8,denoise:t.denoise??0}})}function jt(e){const t=Qs(e);return Js.find(i=>i.id===t).icon}const Js=[{id:"face",label:"Faces & heads",icon:"face"},{id:"eyes",label:"Eyes",icon:"visibility"},{id:"mouth",label:"Mouths",icon:"sentiment_satisfied"},{id:"hands",label:"Hands",icon:"back_hand"},{id:"feet",label:"Feet",icon:"footprint"},{id:"body",label:"Whole bodies",icon:"person"},{id:"intimate",label:"Intimate",icon:"accessibility_new"},{id:"text",label:"Text & bubbles",icon:"chat_bubble"},{id:"other",label:"Other",icon:"center_focus_strong"}];function Qs(e){const t=e.toLowerCase();return t.includes("hand")?"hands":t.includes("eye")?"eyes":t.includes("face")||t.includes("head")?"face":t.includes("person")||t.includes("body")?"body":t.includes("foot")||t.includes("feet")||t.includes("shoe")?"feet":t.includes("text")||t.includes("bubble")||t.includes("watermark")?"text":t.includes("lip")||t.includes("mouth")||t.includes("teeth")?"mouth":/breast|booba|nipple|pussy|vagina|vulva|penis|anus|ass|butt/.test(t)?"intimate":"other"}function Ho(e,t){return Js.map(i=>({kind:i,items:e.filter(s=>t(s)===i.id)})).filter(i=>i.items.length)}function Vo(e,t,i=mi){const s=[];e.faces&&s.push(e.faceModel==="person_yolov8n-seg.pt"?"Whole person":"Faces"),e.hands&&s.push("Hands");for(const a of t)a.model.trim()&&s.push(i(a.model));return s.join(" · ")}var Ko=Object.defineProperty,Yo=Object.getOwnPropertyDescriptor,W=(e,t,i,s)=>{for(var a=s>1?void 0:s?Yo(t,i):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(a=(s?n(t,i,a):n(a))||a);return s&&a&&Ko(t,i,a),a};let j=class extends me{constructor(){super(...arguments),this.invoke=!1,this.available=!1,this.detectors=[],this.loras=[],this.civitai=!1,this.canInstall=!1,this.manageNote="",this.canRename=!1,this.restarting=!1,this.renaming=null,this.view="passes",this.files=null,this.picking=!1,this.q="",this.nsfw=!0,this.items=[],this.cursor="",this.loading=!1,this.shopError="",this.shopLoaded=!1,this.jobs=new Map,this.versionOf=new Map,this.failedCovers=new Set,this.searchTimer=0,this.pollTimer=0}connectedCallback(){super.connectedCallback(),!this.invoke&&this.available&&this.loadFiles()}updated(e){e.has("detectors")&&e.get("detectors")!==void 0&&!this.invoke&&this.available&&this.loadFiles()}disconnectedCallback(){super.disconnectedCallback(),window.clearTimeout(this.searchTimer),window.clearTimeout(this.pollTimer)}set(e){this.dispatchEvent(new CustomEvent("detailer-change",{detail:e,bubbles:!0,composed:!0}))}setPass(e,t){this.set({custom:this.value.custom.map((i,s)=>s===e?{...i,...t}:i)})}async loadFiles(){try{this.files=(await m.detectors()).detectors}catch{this.files=null}}get allDetectors(){const e=new Map;for(const i of this.files??[])e.set(i.name,i);return Wo([...this.detectors,...(this.files??[]).map(i=>i.name)]).map(i=>{var a,o;const s=e.get(i);return{name:i,label:((a=s==null?void 0:s.civitai)==null?void 0:a.name)||mi(i),icon:jt(i),cover:(o=s==null?void 0:s.civitai)==null?void 0:o.cover,key:s==null?void 0:s.key,size:s==null?void 0:s.size,listed:s?s.listed:this.detectors.includes(i),builtIn:!(s!=null&&s.key)}})}detector(e){return this.allDetectors.find(t=>t.name===e)??{name:e,label:mi(e),icon:jt(e),listed:!1,builtIn:!1}}addPass(e){this.set({custom:[...this.value.custom,{model:e,prompt:"",lora:"",loraWeight:.8,denoise:0}]}),this.picking=!1}renderSwitch(e,t,i,s=!1){return r`<label class="switch ${s?"small":""}" title=${t}>
      <input type="checkbox" role="switch" aria-label=${t} .checked=${e}
        @change=${a=>i(a.target.checked)} />
      <span class="track"></span>
    </label>`}renderIcon(e){return e.cover&&!this.failedCovers.has(e.cover)?r`<img src=${m.civitaiImageURL(e.cover)} alt="" loading="lazy"
          @error=${()=>this.failedCovers=new Set(this.failedCovers).add(e.cover)} />`:r`<span class="material-symbols-rounded">${e.icon}</span>`}renderSlider(e,t,i,s,a,o,n,l=""){const p=`s-${e.replace(/\W+/g,"-").toLowerCase()}`;return r`<div class="slider">
      <label for=${p}>${e}</label>
      <output for=${p}>${n(t)}</output>
      <input id=${p} type="range" min=${i} max=${s} step=${a} .value=${String(t)}
        @input=${u=>o(Number(u.target.value))} />
      ${l?r`<small>${l}</small>`:d}
    </div>`}renderHero(){const e=this.value,t=Vo(e,this.invoke?[]:e.custom,i=>this.detector(i).label);return r`<div class="hero ${e.enabled?"on":""}">
      <span class="material-symbols-rounded hero-icon">face_retouching_natural</span>
      <div class="hero-text">
        <b>${e.enabled?"On after every picture":"Off"}</b>
        <span>${e.enabled?t?`Redoes ${t.toLowerCase().replace(/ · /g,", ")} once a picture is drawn.`:"No pass is on, so pictures are left as drawn. Turn one on below.":"Pictures are left as drawn. Turn it on to redo faces, hands or anything a detector finds."}</span>
      </div>
      ${this.renderSwitch(e.enabled,"ADetailer after every picture",i=>this.set({enabled:i}))}
    </div>`}renderFacePass(e){const t=this.value,i=t.faceModel==="person_yolov8n-seg.pt";return r`<div class="pass ${t.faces?"on":""}">
      <div class="pass-head">
        <span class="pass-step">${t.faces?e:""}</span>
        <span class="pass-icon"><span class="material-symbols-rounded">${i?"person":"face"}</span></span>
        <div class="pass-title"><b>${i?"Whole person":"Faces"}</b>
          <span>${i?"Redraws each figure — for people drawn small":"Redraws every face it finds, sharper"}</span></div>
        ${this.renderSwitch(t.faces,"Faces pass",s=>this.set({faces:s}),!0)}
      </div>
      ${t.faces?r`<div class="pass-body">
        <div class="seg" role="radiogroup" aria-label="Face detector">
          ${Li.map(s=>r`<button class=${s.id===t.faceModel?"on":""} role="radio"
            aria-checked=${s.id===t.faceModel?"true":"false"} @click=${()=>this.set({faceModel:s.id})}>${s.label}</button>`)}
        </div>
      </div>`:d}
    </div>`}renderHandPass(e){const t=this.value;return r`<div class="pass ${t.hands?"on":""}">
      <div class="pass-head">
        <span class="pass-step">${t.hands?e:""}</span>
        <span class="pass-icon"><span class="material-symbols-rounded">back_hand</span></span>
        <div class="pass-title"><b>Hands</b><span>Redraws hands, for the extra and missing fingers</span></div>
        ${this.renderSwitch(t.hands,"Hands pass",i=>this.set({hands:i}),!0)}
      </div>
    </div>`}renderCustomPass(e,t,i){const s=this.detector(e.model),a=this.allDetectors;return r`<div class="pass on">
      <div class="pass-head">
        <span class="pass-step">${i}</span>
        <span class="pass-icon">${this.renderIcon(s)}</span>
        <div class="pass-title"><b title=${s.label}>${s.label}</b><span title=${e.model}>${e.model}</span></div>
        <button class="icon-x" title="Remove this pass" aria-label="Remove this pass"
          @click=${()=>this.set({custom:this.value.custom.filter((o,n)=>n!==t)})}>
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
      <div class="pass-body">
        ${!s.listed&&this.files?r`<div class="callout warn"><span class="material-symbols-rounded">restart_alt</span>
          <span class="callout-text"><span>ADetailer hasn't read this detector yet — restart Automatic1111, or this pass is skipped.</span>
            ${this.renderRestartButton()}</span></div>`:d}
        <label class="field"><span>Detector</span>
          <select class="text" @change=${o=>this.setPass(t,{model:o.target.value})}>
            ${a.some(o=>o.name===e.model)?d:r`<option value=${e.model} selected>${s.label} — not in ADetailer now</option>`}
            ${a.map(o=>r`<option value=${o.name} ?selected=${o.name===e.model}>${o.label}${o.listed?"":" (restart A1111)"}</option>`)}
          </select>
        </label>
        <label class="field"><span>Words for what it finds</span>
          <textarea class="text" rows="2" .value=${e.prompt} placeholder="Blank: the words every pass shares"
            @input=${o=>this.setPass(t,{prompt:o.target.value})}></textarea>
        </label>
        <div class="field"><span>A LoRA that draws it well</span>
          <div class="row">
            <select class="text" aria-label="LoRA for this pass" @change=${o=>this.setPass(t,{lora:o.target.value})}>
              <option value="" ?selected=${!e.lora}>No LoRA</option>
              ${this.loras.map(o=>r`<option value=${o.name} ?selected=${o.name===e.lora}>${o.alias||o.name}</option>`)}
            </select>
            ${e.lora?r`<input class="text num" type="number" min="-2" max="2" step="0.05" aria-label="LoRA weight" title="LoRA weight"
              .value=${String(e.loraWeight)}
              @input=${o=>{const n=Number(o.target.value);this.setPass(t,{loraWeight:Number.isFinite(n)?Math.max(-2,Math.min(2,n)):.8})}} />`:d}
          </div>
        </div>
        ${this.renderSlider("Redraw strength",e.denoise,0,1,.05,o=>this.setPass(t,{denoise:o}),o=>o>0?o.toFixed(2):"Shared",e.denoise>0?"":"At the left end it uses the strength every pass shares.")}
      </div>
    </div>`}renderPicker(){const e=new Set(this.value.custom.map(i=>i.model)),t=this.allDetectors.filter(i=>!e.has(i.name));return r`<div class="picker">
      <div class="picker-grid">
        ${t.map(i=>r`<button class="tile ${i.listed?"":"wait"}" title=${i.listed?i.name:`${i.name} — restart Automatic1111 to use it`}
          @click=${()=>this.addPass(i.name)}>
          <span class="ico">${this.renderIcon(i)}</span><span class="lbl">${i.label}</span>
        </button>`)}
        ${this.civitai?r`<button class="tile shop" @click=${()=>this.openShop()}>
          <span class="ico"><span class="material-symbols-rounded">travel_explore</span></span><span class="lbl">More on Civitai</span>
        </button>`:d}
      </div>
      <div class="picker-foot">
        <span>${t.length?"Pick what this pass looks for.":"Every detector already has a pass."}</span>
        <button class="link" @click=${()=>this.picking=!1}>Cancel</button>
      </div>
    </div>`}renderRestartButton(){return r`<button class="restart-btn" ?disabled=${this.restarting}
      @click=${()=>this.dispatchEvent(new CustomEvent("restart-generator",{bubbles:!0,composed:!0}))}>
      <span class="material-symbols-rounded">restart_alt</span>${this.restarting?"Restarting…":"Restart Automatic1111"}</button>`}get renamable(){return this.allDetectors.filter(e=>e.key)}onRenamed(e){const t=Zs(e);this.value.custom.some(i=>t.has(i.model))&&this.set({custom:this.value.custom.map(i=>({...i,model:t.get(i.model)??i.model}))}),this.loadFiles(),this.dispatchEvent(new CustomEvent("detectors-changed",{bubbles:!0,composed:!0}))}renderDetectorList(){const e=this.allDetectors,t=a=>a?`${(a/1048576).toFixed(a<10485760?1:0)} MB`:"",i=Ho(e,a=>Qs(`${a.name} ${a.label}`)),s=this.canRename&&this.civitai?this.renamable:[];return r`<div class="k">Detectors ADetailer has<span class="grow"></span>
        ${s.length?r`<button class="k-btn" title="Name the detectors in the folder after what Civitai says they find"
          @click=${()=>this.renaming=s.map(a=>a.name)}><span class="material-symbols-rounded">edit_note</span>Name after Civitai</button>`:d}
        <small>${e.length}</small></div>
      ${e.length?r`<div class="dets">
        ${i.map(a=>r`${i.length>1?r`<div class="kind-k"><span class="material-symbols-rounded">${a.kind.icon}</span>${a.kind.label}</div>`:d}
        ${a.items.map(o=>r`<div class="det">
          <span class="ico">${this.renderIcon(o)}</span>
          <div class="det-text"><b title=${o.label}>${o.label}</b>
            <span title=${o.name}>${[o.name,t(o.size)].filter(Boolean).join(" · ")}</span></div>
          ${o.builtIn?r`<span class="chip">Built in</span>`:o.listed?r`<span class="chip ready">Ready</span>`:r`<span class="chip restart" title="ADetailer reads its folder when Automatic1111 starts">Restart A1111</span>`}
          <button class="icon-x" title="Add a pass with it" aria-label=${`Add a pass with ${o.label}`} @click=${()=>this.addPass(o.name)}>
            <span class="material-symbols-rounded">add</span></button>
          ${o.key&&this.canRename?r`<button class="icon-x" title="Rename it" aria-label=${`Rename ${o.label}`}
            @click=${()=>this.renaming=[o.name]}><span class="material-symbols-rounded">edit_note</span></button>`:d}
          ${o.key&&this.canInstall?r`<button class="icon-x" title="Delete it from ADetailer's folder" aria-label=${`Delete ${o.label}`}
            @click=${()=>void this.deleteDetector(o)}><span class="material-symbols-rounded">delete</span></button>`:d}
        </div>`)}`)}
      </div>`:r`<div class="note">ADetailer didn't list its detectors — it may be an old version; update it under Extensions in Automatic1111.</div>`}
      ${this.civitai?r`<button class="big-btn" @click=${()=>this.openShop()}>
            <span class="material-symbols-rounded">travel_explore</span>Get detectors from Civitai</button>`:r`<div class="note" style="margin-top:8px;">Detectors for other parts of a body are YOLO .pt files: drop one into A1111's
            models/adetailer folder and restart it — or set Civitai up under Settings to browse them here.</div>`}`}async deleteDetector(e){if(!(!e.key||!confirm(`Delete ${e.label} (${e.name}) from ADetailer's folder?`)))try{await m.deleteDetector(e.key),this.value.custom.some(t=>t.model===e.name)&&this.set({custom:this.value.custom.filter(t=>t.model!==e.name)}),await this.loadFiles(),this.dispatchEvent(new CustomEvent("detectors-changed",{bubbles:!0,composed:!0}))}catch(t){alert(t.message)}}renderPasses(){const e=this.value;if(!this.available&&this.invoke)return r`<div class="note">This InvokeAI has no detailer node, so pictures can't have their faces or hands redone here.</div>`;if(!this.available)return r`<div class="callout"><span class="material-symbols-rounded">face_retouching_natural</span>
        <span>The passes that redo faces, hands and anything else a detector finds show up here once the ADetailer
          extension is installed in Automatic1111 — Extensions → Available → ADetailer, then restart it. It also lets a
          finished picture's faces be redone on their own.</span></div>`;let t=0;const i=(this.files??[]).filter(s=>!s.listed).length;return r`
      ${this.renderHero()}
      ${i&&!this.invoke?r`<div class="callout warn" style="margin-top:10px;"><span class="material-symbols-rounded">restart_alt</span>
        <span class="callout-text"><span>${i===1?"A new or renamed detector is":`${i} new or renamed detectors are`} in ADetailer's folder.
          It reads the folder when Automatic1111 starts — restart it to use ${i===1?"it":"them"}.</span>
          ${this.renderRestartButton()}</span></div>`:d}
      <div class="k">Passes<span class="grow"></span><small>run top to bottom</small></div>
      <div class="passes ${e.enabled?"":"off"}">
        ${this.renderFacePass(e.faces?++t:0)}
        ${this.renderHandPass(e.hands?++t:0)}
        ${this.invoke?d:r`
          ${e.custom.map((s,a)=>this.renderCustomPass(s,a,++t))}
          ${this.picking?this.renderPicker():r`<button class="add" ?disabled=${e.custom.length>=6} @click=${()=>this.picking=!0}
                title=${e.custom.length>=6?"Six passes of your own is the most":"Redo another part — eyes, feet, anything a detector finds"}>
                <span class="material-symbols-rounded">add</span>Add a pass</button>`}`}
      </div>

      <div class="k">Words every pass shares</div>
      <div class="words">
        <label class="field"><span>Detail prompt</span>
          <textarea class="text" rows="2" .value=${e.prompt} placeholder="Blank: the picture's own prompt"
            @input=${s=>this.set({prompt:s.target.value})}></textarea></label>
        <label class="field"><span>Negative</span>
          <textarea class="text" rows="2" .value=${e.negative} placeholder="What the redone parts should not have"
            @input=${s=>this.set({negative:s.target.value})}></textarea></label>
      </div>

      <div class="k">Strength and mask</div>
      <div class="sliders">
        ${this.renderSlider("Redraw strength",e.denoise,.05,1,.05,s=>this.set({denoise:s}),s=>s.toFixed(2),"How far a pass may move from what was drawn. 0.3–0.45 keeps the likeness; higher invents more.")}
        ${this.renderSlider("Detection confidence",e.confidence,.05,1,.05,s=>this.set({confidence:s}),s=>s.toFixed(2),"Lower finds more, including things that aren't there; raise it if a pass redraws the wrong part.")}
        ${this.renderSlider("Mask blur",e.maskBlur,0,64,1,s=>this.set({maskBlur:Math.round(s)}),s=>`${Math.round(s)} px`,"Softens the edge where the redone part meets the rest.")}
      </div>
      ${this.invoke?d:this.renderDetectorList()}
    `}openShop(){this.view="shop",this.picking=!1,this.shopLoaded||this.search(!0)}queueSearch(){window.clearTimeout(this.searchTimer),this.searchTimer=window.setTimeout(()=>void this.search(!0),350)}async search(e){if(this.loading&&!e)return;this.loading=!0,this.shopError="";const t=this.q.trim();try{const i=await m.detectorShop({q:t,nsfw:this.nsfw,cursor:e?"":this.cursor});if(t!==this.q.trim())return;this.items=e?i.items:[...this.items,...i.items.filter(s=>!this.items.some(a=>a.id===s.id))],this.cursor=i.nextCursor??"",this.shopLoaded=!0}catch(i){this.shopError=i.message}finally{this.loading=!1}}async install(e){var i;const t=this.versionOf.get(e.id)??((i=e.versions[0])==null?void 0:i.id)??0;this.jobs=new Map(this.jobs).set(t,{id:0,status:"waiting",source:""});try{const s=await m.installDetector(e.id,t);this.jobs=new Map(this.jobs).set(t,s),this.poll()}catch(s){this.jobs=new Map(this.jobs).set(t,{id:0,status:"error",source:"",error:s.message})}}poll(){window.clearTimeout(this.pollTimer),this.pollTimer=window.setTimeout(async()=>{let e=!1,t=!1;try{const{jobs:i}=await m.civitaiInstalls(),s=new Map(this.jobs);for(const[a,o]of this.jobs){const n=i.find(l=>l.id===o.id);!n||!o.id||(o.status!==n.status&&n.status==="completed"&&(t=!0),s.set(a,n),(n.status==="waiting"||n.status==="downloading"||n.status==="running")&&(e=!0))}this.jobs=s}catch{e=!0}t&&(await this.loadFiles(),this.dispatchEvent(new CustomEvent("detectors-changed",{bubbles:!0,composed:!0}))),e&&this.isConnected&&this.poll()},1200)}renderInstall(e){var a,o,n;const t=this.versionOf.get(e.id)??((a=e.versions[0])==null?void 0:a.id)??0,i=this.jobs.get(t),s=e.installedVersions.includes(t)||(i==null?void 0:i.status)==="completed";if(i&&(i.status==="waiting"||i.status==="downloading"||i.status==="running")){const l=i.totalBytes?Math.round((i.bytes??0)/i.totalBytes*100):0;return r`<div class="bar" role="progressbar" aria-valuenow=${l} aria-valuemin="0" aria-valuemax="100"><span style="width:${Math.max(4,l)}%"></span></div>
        <span class="note">${l?`${l}%`:"Starting…"}</span>`}if(s){const l=((o=i==null?void 0:i.files)==null?void 0:o[0])??((n=i==null?void 0:i.modelKey)==null?void 0:n.split("/").pop());return r`<button class="install ghost" disabled><span class="material-symbols-rounded">check</span>In ADetailer</button>
        ${l&&!this.value.custom.some(p=>p.model===l)?r`<button class="install ghost" @click=${()=>{this.addPass(l),this.view="passes"}} title="Add a pass with it">
              <span class="material-symbols-rounded">add</span>Pass</button>`:d}`}return r`<button class="install" ?disabled=${!this.canInstall} title=${this.canInstall?"Download it into ADetailer's folder":this.manageNote}
      @click=${()=>void this.install(e)}><span class="material-symbols-rounded">download</span>Install</button>`}renderShop(){const e=i=>i>=1e3?`${(i/1e3).toFixed(i>=1e4?0:1)}k`:String(i),t=["eyes","hands","feet","nipples","pussy","penis","face","text"];return r`
      <div class="shop-head">
        <button class="icon-x" title="Back to the passes" aria-label="Back" @click=${()=>this.view="passes"}>
          <span class="material-symbols-rounded">arrow_back</span></button>
        <b>Detectors on Civitai</b>
      </div>
      <div class="row">
        <label class="search"><span class="material-symbols-rounded">search</span>
          <input type="search" placeholder="What should it find?" aria-label="Search detectors" .value=${this.q}
            @input=${i=>{this.q=i.target.value,this.queueSearch()}} /></label>
        <button class="toggle ${this.nsfw?"on":""}" aria-pressed=${this.nsfw?"true":"false"} title="Show adult detectors"
          @click=${()=>{this.nsfw=!this.nsfw,this.search(!0)}}>18+</button>
      </div>
      <div class="quick">
        ${t.map(i=>r`<button class=${this.q.trim().toLowerCase()===i?"on":""}
          @click=${()=>{this.q=this.q.trim().toLowerCase()===i?"":i,this.search(!0)}}>${i}</button>`)}
      </div>
      ${this.canInstall?d:r`<div class="callout warn" style="margin-bottom:10px;"><span class="material-symbols-rounded">folder_off</span>
        <span>${this.manageNote||"Installing needs Automatic1111's models folder."}</span></div>`}
      ${this.shopError?r`<div class="err" style="margin-bottom:8px;">${this.shopError}</div>`:d}
      <div class="shop">
        ${this.items.map(i=>{var l;const s=this.versionOf.get(i.id)??((l=i.versions[0])==null?void 0:l.id)??0,a=i.versions.find(p=>p.id===s),o=this.jobs.get(s),n=i.cover;return r`<div class="item">
            <div class="item-art">${n&&!this.failedCovers.has(n)?r`<img src=${m.civitaiImageURL(n)} alt="" loading="lazy" @error=${()=>this.failedCovers=new Set(this.failedCovers).add(n)} />`:r`<span class="material-symbols-rounded">${jt(i.name)}</span>`}</div>
            <div class="item-body">
              <b title=${i.name}>${i.name}</b>
              <div class="item-meta">
                ${i.creator?r`<span>${i.creator}</span>`:d}
                <span><span class="material-symbols-rounded">download</span>${e(i.downloads)}</span>
                ${i.likes?r`<span><span class="material-symbols-rounded">thumb_up</span>${e(i.likes)}</span>`:d}
                ${a!=null&&a.sizeMB?r`<span>${a.sizeMB} MB</span>`:d}
              </div>
              <div class="item-acts">
                ${i.versions.length>1?r`<select class="text" aria-label="Version"
                  @change=${p=>this.versionOf=new Map(this.versionOf).set(i.id,Number(p.target.value))}>
                  ${i.versions.map(p=>r`<option value=${p.id} ?selected=${p.id===s}>${p.name}${i.installedVersions.includes(p.id)?" ✓":""}</option>`)}
                </select>`:d}
                ${this.renderInstall(i)}
              </div>
              ${(o==null?void 0:o.status)==="error"?r`<div class="err">${o.error}</div>`:d}
            </div>
          </div>`})}
      </div>
      ${this.loading?r`<div class="note" style="padding:12px 2px;">Asking Civitai…</div>`:d}
      ${!this.loading&&this.shopLoaded&&!this.items.length?r`<div class="note" style="padding:12px 2px;">Nothing on Civitai matches that.</div>`:d}
      ${!this.loading&&this.cursor?r`<button class="more-btn" style="width:100%; margin-top:10px;" @click=${()=>void this.search(!1)}>Show more</button>`:d}
      <div class="note" style="margin-top:14px;">A detector arrives in A1111's models/adetailer folder, unpacked if it comes as a .zip.
        ADetailer reads that folder when Automatic1111 starts, so restart it before a new one can be used.</div>
    `}render(){return this.value?r`${this.view==="shop"&&!this.invoke?this.renderShop():this.renderPasses()}
      ${this.renaming?r`<oppai-rename-dialog kind="detector" .names=${this.renaming} .existing=${this.renamable.map(e=>e.name)}
            @renamed=${e=>this.onRenamed(e.detail.renamed)}
            @close=${()=>this.renaming=null}></oppai-rename-dialog>`:d}`:d}};j.styles=[ue,Oe,re`
      :host { display: block; color: var(--oppai-text); }
      .k {
        display: flex; align-items: center; gap: 8px; margin: 20px 0 9px; font-size: 11px; font-weight: 700;
        letter-spacing: 0.7px; text-transform: uppercase; color: var(--oppai-text-muted);
      }
      .k .grow { flex: 1; }
      .k small { font-weight: 500; letter-spacing: 0; text-transform: none; }
      .note { font-size: 12px; line-height: 1.5; color: var(--oppai-text-muted); }
      .callout {
        display: flex; gap: 9px; padding: 11px 12px; border-radius: 12px; font-size: 12px; line-height: 1.5; color: var(--oppai-text-dim);
        background: color-mix(in srgb, var(--oppai-primary) 10%, var(--oppai-surface));
        border: 1px solid color-mix(in srgb, var(--oppai-primary) 30%, transparent);
      }
      .callout.warn { background: color-mix(in srgb, var(--oppai-accent) 10%, var(--oppai-surface)); border-color: color-mix(in srgb, var(--oppai-accent) 35%, transparent); }
      .callout > .material-symbols-rounded { font-size: 18px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .callout.warn > .material-symbols-rounded { color: var(--oppai-accent); }
      .callout .callout-text { flex: 1; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
      .restart-btn {
        display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 12px; border-radius: 15px; border: none;
        background: var(--oppai-accent); color: var(--oppai-on-accent, #000); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
      }
      .restart-btn:disabled { opacity: 0.6; cursor: default; }
      .restart-btn .material-symbols-rounded { font-size: 16px; }
      .kind-k { display: flex; align-items: center; gap: 6px; padding: 8px 10px 4px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.6px;
        text-transform: uppercase; color: var(--oppai-text-muted); border-top: 1px solid var(--oppai-border); background: var(--oppai-surface-2); }
      .kind-k:first-child { border-top: none; }
      .kind-k .material-symbols-rounded { font-size: 14px; }
      .kind-k + .det { border-top: none; }
      .det { gap: 6px; }
      .det .icon-x { width: 26px; height: 26px; }
      .det .icon-x .material-symbols-rounded { font-size: 17px; }
      .k .k-btn { border: none; background: none; display: inline-flex; align-items: center; gap: 3px; color: var(--oppai-primary-bright, var(--oppai-primary));
        font: inherit; font-size: 11px; letter-spacing: 0; text-transform: none; cursor: pointer; padding: 2px 4px; }
      .k .k-btn .material-symbols-rounded { font-size: 15px; }

      /* The switch: a checkbox drawn as a track and thumb. */
      .switch { position: relative; flex: none; width: 44px; height: 26px; cursor: pointer; }
      .switch input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
      .switch .track { position: absolute; inset: 0; border-radius: 13px; background: var(--oppai-surface-2); border: 2px solid var(--oppai-border-strong); box-sizing: border-box; transition: background 0.18s ease, border-color 0.18s ease; }
      .switch .track::after {
        content: ""; position: absolute; top: 4px; left: 4px; width: 14px; height: 14px; border-radius: 7px; background: var(--oppai-text-muted);
        transition: transform 0.2s var(--oppai-ease-spring, ease), background 0.18s ease, width 0.18s ease;
      }
      .switch input:checked + .track { background: var(--oppai-primary); border-color: var(--oppai-primary); }
      .switch input:checked + .track::after { transform: translateX(18px); background: var(--oppai-on-primary); }
      .switch input:focus-visible + .track { outline: 2px solid var(--oppai-primary); outline-offset: 2px; }
      .switch.small { width: 38px; height: 22px; }
      .switch.small .track::after { width: 10px; height: 10px; }
      .switch.small input:checked + .track::after { transform: translateX(16px); }

      .hero {
        display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 18px; background: var(--oppai-surface);
        border: 1px solid var(--oppai-border); transition: background 0.2s ease, border-color 0.2s ease;
      }
      .hero.on {
        background: linear-gradient(135deg, color-mix(in srgb, var(--oppai-primary) 22%, var(--oppai-surface)), var(--oppai-surface) 70%);
        border-color: color-mix(in srgb, var(--oppai-primary) 40%, transparent);
      }
      .hero-icon {
        flex: none; width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; font-size: 24px;
        background: var(--oppai-surface-2); color: var(--oppai-text-muted); transition: background 0.2s ease, color 0.2s ease;
      }
      .hero.on .hero-icon { background: var(--oppai-primary); color: var(--oppai-on-primary); }
      .hero-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .hero-text b { font-size: 15px; }
      .hero-text span { font-size: 12px; color: var(--oppai-text-dim); line-height: 1.4; }

      .passes { display: flex; flex-direction: column; gap: 8px; transition: opacity 0.2s ease; }
      .passes.off { opacity: 0.55; }
      .pass {
        border-radius: 16px; background: var(--oppai-surface); border: 1px solid var(--oppai-border); overflow: hidden;
        animation: oppai-fade-in-up 0.2s var(--oppai-ease-emphasized, ease) both;
      }
      .pass.on { border-color: color-mix(in srgb, var(--oppai-primary) 35%, var(--oppai-border)); }
      .pass-head { display: flex; align-items: center; gap: 10px; padding: 10px 10px 10px 10px; }
      .pass-icon {
        flex: none; width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; overflow: hidden;
        background: var(--oppai-surface-2); color: var(--oppai-text-muted);
      }
      .pass.on .pass-icon { background: color-mix(in srgb, var(--oppai-primary) 22%, var(--oppai-surface-2)); color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .pass-icon img { width: 100%; height: 100%; object-fit: cover; }
      .pass-icon .material-symbols-rounded { font-size: 21px; }
      .pass-title { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
      .pass-title b { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .pass-title span { font-size: 11.5px; color: var(--oppai-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .pass-step { flex: none; font-size: 11px; font-weight: 700; color: var(--oppai-text-muted); width: 16px; text-align: center; }
      .pass-body { display: flex; flex-direction: column; gap: 8px; padding: 0 10px 12px; }
      .seg { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; }
      .seg button {
        height: 30px; border-radius: 9px; border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text-dim);
        font: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer;
      }
      .seg button.on { background: var(--oppai-primary-container); border-color: transparent; color: var(--oppai-text); }
      .icon-x {
        flex: none; width: 30px; height: 30px; border-radius: 15px; border: none; background: none; color: var(--oppai-text-muted);
        display: grid; place-items: center; cursor: pointer;
      }
      .icon-x:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .icon-x .material-symbols-rounded { font-size: 18px; }

      .field { display: flex; flex-direction: column; gap: 4px; }
      .field > span { font-size: 11px; color: var(--oppai-text-muted); }
      input.text, select.text, textarea.text {
        width: 100%; box-sizing: border-box; border: 1px solid var(--oppai-border-strong); border-radius: 10px; background: var(--oppai-surface-2);
        color: var(--oppai-text); font: inherit; font-size: 12.5px; padding: 7px 9px; outline: none;
      }
      textarea.text { resize: vertical; min-height: 54px; line-height: 1.4; }
      input.text:focus, select.text:focus, textarea.text:focus { border-color: var(--oppai-primary); }
      .row { display: flex; gap: 6px; align-items: center; }
      .row select.text { flex: 1; min-width: 0; }
      .row input.num { width: 64px; flex: none; }

      .slider { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 10px; align-items: center; }
      .slider label { font-size: 12.5px; color: var(--oppai-text); }
      .slider output { font-size: 12px; font-variant-numeric: tabular-nums; color: var(--oppai-text-dim); text-align: right; min-width: 38px; }
      .slider input { grid-column: 1 / 3; width: 100%; accent-color: var(--oppai-primary); margin: 2px 0 0; }
      .slider small { grid-column: 1 / 3; font-size: 11px; color: var(--oppai-text-muted); line-height: 1.35; }
      .sliders { display: flex; flex-direction: column; gap: 14px; padding: 12px; border-radius: 16px; background: var(--oppai-surface); border: 1px solid var(--oppai-border); }
      .words { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 16px; background: var(--oppai-surface); border: 1px solid var(--oppai-border); }

      .add {
        display: flex; align-items: center; justify-content: center; gap: 6px; height: 42px; border-radius: 14px;
        border: 1.5px dashed var(--oppai-border-strong); background: none; color: var(--oppai-text-dim); font: inherit; font-size: 13px;
        font-weight: 600; cursor: pointer;
      }
      .add:hover { border-color: var(--oppai-primary); color: var(--oppai-text); }
      .add .material-symbols-rounded { font-size: 19px; }
      .picker { padding: 10px; border-radius: 16px; background: var(--oppai-surface); border: 1px solid var(--oppai-border-strong); animation: oppai-fade-in-up 0.18s var(--oppai-ease-emphasized, ease) both; }
      .picker-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
      .tile {
        display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 9px 4px 8px; border-radius: 12px; border: 1px solid transparent;
        background: var(--oppai-surface-2); color: var(--oppai-text); font: inherit; font-size: 11px; font-weight: 600; text-align: center; cursor: pointer; min-width: 0;
      }
      .tile:hover { border-color: var(--oppai-primary); }
      .tile .ico { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; overflow: hidden; background: var(--oppai-surface); color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .tile .ico img { width: 100%; height: 100%; object-fit: cover; }
      .tile .ico .material-symbols-rounded { font-size: 19px; }
      .tile .lbl { width: 100%; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.25; }
      .tile.wait { opacity: 0.6; }
      .tile.shop { border: 1px dashed var(--oppai-border-strong); background: none; color: var(--oppai-text-dim); }
      .picker-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 11.5px; color: var(--oppai-text-muted); }
      .link { border: none; background: none; color: var(--oppai-primary-bright, var(--oppai-primary)); font: inherit; font-size: 12px; cursor: pointer; padding: 3px 4px; }

      .dets { display: flex; flex-direction: column; border-radius: 16px; background: var(--oppai-surface); border: 1px solid var(--oppai-border); overflow: hidden; }
      .det { display: flex; align-items: center; gap: 10px; padding: 8px 8px 8px 10px; border-top: 1px solid var(--oppai-border); }
      .det:first-child { border-top: none; }
      .det .ico { flex: none; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; overflow: hidden; background: var(--oppai-surface-2); color: var(--oppai-text-muted); }
      .det .ico img { width: 100%; height: 100%; object-fit: cover; }
      .det .ico .material-symbols-rounded { font-size: 19px; }
      .det-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
      .det-text b { font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .det-text span { font-size: 11px; color: var(--oppai-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .chip { flex: none; display: inline-flex; align-items: center; gap: 3px; height: 20px; padding: 0 7px; border-radius: 10px; font-size: 10.5px; font-weight: 700; background: var(--oppai-surface-2); color: var(--oppai-text-dim); }
      .chip.ready { background: color-mix(in srgb, #4caf50 22%, var(--oppai-surface-2)); color: color-mix(in srgb, #81c784 80%, var(--oppai-text)); }
      .chip.restart { background: color-mix(in srgb, var(--oppai-accent) 25%, var(--oppai-surface-2)); color: var(--oppai-text); }
      .big-btn {
        display: flex; align-items: center; justify-content: center; gap: 7px; width: 100%; height: 42px; margin-top: 10px; border-radius: 14px; border: none;
        background: var(--oppai-primary); color: var(--oppai-on-primary); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
      }
      .big-btn .material-symbols-rounded { font-size: 19px; }

      /* The shop. */
      .shop-head { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
      .shop-head b { font-size: 14px; flex: 1; }
      .search { position: relative; flex: 1; min-width: 0; }
      .search input {
        width: 100%; height: 38px; box-sizing: border-box; padding: 0 12px 0 36px; border-radius: 19px; border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-surface); color: var(--oppai-text); font: inherit; font-size: 13px; outline: none;
      }
      .search input:focus { border-color: var(--oppai-primary); }
      .search .material-symbols-rounded { position: absolute; left: 11px; top: 9px; font-size: 20px; color: var(--oppai-text-muted); pointer-events: none; }
      .toggle {
        flex: none; height: 38px; padding: 0 11px; border-radius: 19px; border: 1px solid var(--oppai-border-strong); background: transparent;
        color: var(--oppai-text-dim); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
      }
      .toggle.on { background: color-mix(in srgb, var(--oppai-primary) 14%, transparent); border-color: color-mix(in srgb, var(--oppai-primary) 55%, transparent); color: var(--oppai-text); }
      .quick { display: flex; flex-wrap: wrap; gap: 5px; margin: 10px 0 12px; }
      .quick button {
        flex: none; height: 28px; padding: 0 10px; border-radius: 14px; border: none; background: var(--oppai-surface); color: var(--oppai-text-dim);
        font: inherit; font-size: 12px; cursor: pointer;
      }
      .quick button.on { background: var(--oppai-primary-container); color: var(--oppai-text); }
      .shop { display: flex; flex-direction: column; gap: 8px; }
      .item {
        display: grid; grid-template-columns: 74px minmax(0, 1fr); gap: 10px; padding: 8px; border-radius: 16px; background: var(--oppai-surface);
        border: 1px solid var(--oppai-border); animation: oppai-fade-in-up 0.2s var(--oppai-ease-emphasized, ease) both;
      }
      .item-art { position: relative; width: 74px; height: 92px; border-radius: 11px; overflow: hidden; background: var(--oppai-surface-2); display: grid; place-items: center; color: var(--oppai-text-muted); }
      .item-art img { width: 100%; height: 100%; object-fit: cover; }
      .item-art .material-symbols-rounded { font-size: 26px; }
      .item-body { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
      .item-body b { font-size: 12.5px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .item-meta { display: flex; flex-wrap: wrap; gap: 4px 8px; font-size: 11px; color: var(--oppai-text-muted); }
      .item-meta span { display: inline-flex; align-items: center; gap: 2px; }
      .item-meta .material-symbols-rounded { font-size: 13px; }
      .item-acts { margin-top: auto; display: flex; gap: 6px; align-items: center; }
      .item-acts select { flex: 1; min-width: 0; height: 30px; padding: 0 6px; font-size: 11.5px; }
      .install {
        flex: none; display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 12px; border-radius: 15px; border: none;
        background: var(--oppai-primary); color: var(--oppai-on-primary); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
      }
      .install:disabled { opacity: 0.5; cursor: default; }
      .install.ghost { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .install .material-symbols-rounded { font-size: 16px; }
      .bar { flex: 1; height: 6px; border-radius: 3px; background: var(--oppai-surface-2); overflow: hidden; }
      .bar span { display: block; height: 100%; background: var(--oppai-primary); transition: width 0.4s ease; }
      .err { font-size: 11.5px; color: var(--oppai-error, #f2b8b5); line-height: 1.35; }
      .more-btn { height: 38px; border-radius: 12px; border: 1px dashed var(--oppai-border-strong); background: none; color: var(--oppai-text-dim); font: inherit; font-size: 12.5px; cursor: pointer; }
    `];W([z({attribute:!1})],j.prototype,"value",2);W([z({type:Boolean})],j.prototype,"invoke",2);W([z({type:Boolean})],j.prototype,"available",2);W([z({attribute:!1})],j.prototype,"detectors",2);W([z({attribute:!1})],j.prototype,"loras",2);W([z({type:Boolean})],j.prototype,"civitai",2);W([z({type:Boolean})],j.prototype,"canInstall",2);W([z()],j.prototype,"manageNote",2);W([z({type:Boolean})],j.prototype,"canRename",2);W([z({type:Boolean})],j.prototype,"restarting",2);W([c()],j.prototype,"renaming",2);W([c()],j.prototype,"view",2);W([c()],j.prototype,"files",2);W([c()],j.prototype,"picking",2);W([c()],j.prototype,"q",2);W([c()],j.prototype,"nsfw",2);W([c()],j.prototype,"items",2);W([c()],j.prototype,"cursor",2);W([c()],j.prototype,"loading",2);W([c()],j.prototype,"shopError",2);W([c()],j.prototype,"shopLoaded",2);W([c()],j.prototype,"jobs",2);W([c()],j.prototype,"versionOf",2);W([c()],j.prototype,"failedCovers",2);j=W([ge("oppai-detailer-panel")],j);const Xo=[480,640,832,1024,1280],qt=[{id:"portrait",label:"Portrait",w:9,h:16},{id:"square",label:"Square",w:1,h:1},{id:"landscape",label:"Landscape",w:16,h:9}];function ss(e,t,i){const s=o=>Math.max(64,Math.round(o/16)*16);if(!(e>0)||!(t>0))return{width:s(i),height:s(i)};const a=i*Math.min(e,t)/Math.max(e,t);return e>=t?{width:s(i),height:s(a)}:{width:s(a),height:s(i)}}function as(e,t){const i=Math.round(Math.max(0,e)*Math.max(1,t)/8);return Math.max(1,i)*8+1}function Zo(e,t){return e>0?Math.max(0,e-.5/Math.max(1,t)):0}const Jo=1536;function Qo(e,t,i=Jo){const s=Math.max(e,t);if(!(s>i))return{width:e,height:t,shrunk:!1};const a=i/s;return{width:Math.max(1,Math.round(e*a)),height:Math.max(1,Math.round(t*a)),shrunk:!0}}const ea=[{id:"push",label:"Push in",phrase:"The camera slowly pushes in toward her face",group:"camera"},{id:"pull",label:"Pull back",phrase:"The camera slowly pulls back to reveal more of the scene",group:"camera"},{id:"orbit",label:"Orbit",phrase:"The camera orbits slowly around her",group:"camera"},{id:"pan",label:"Pan",phrase:"The camera pans gently from left to right",group:"camera"},{id:"still",label:"Locked off",phrase:"The camera stays perfectly still",group:"camera"},{id:"handheld",label:"Handheld",phrase:"Subtle handheld camera sway",group:"camera"},{id:"look",label:"Looks at you",phrase:"She turns her head to look straight at the camera",group:"her"},{id:"smile",label:"Smiles",phrase:"She breaks into a warm smile",group:"her"},{id:"blink",label:"Blinks",phrase:"She blinks naturally",group:"her"},{id:"wave",label:"Waves",phrase:"She raises a hand and waves",group:"her"},{id:"breathe",label:"Breathing",phrase:"Her chest rises and falls with slow breathing",group:"her"},{id:"hair",label:"Hair in the wind",phrase:"Her hair flows and moves softly in the breeze",group:"her"},{id:"pose",label:"Holds her pose",phrase:"She holds her pose and moves only a little",group:"her"},{id:"walk",label:"Walks closer",phrase:"She walks slowly toward the camera",group:"her"},{id:"dance",label:"Sways",phrase:"She sways her hips gently to music",group:"her"},{id:"light",label:"Flickering light",phrase:"Warm light flickers across the scene",group:"scene"},{id:"rain",label:"Rain",phrase:"Rain falls steadily in the background",group:"scene"},{id:"petals",label:"Petals",phrase:"Petals drift through the air",group:"scene"},{id:"cloth",label:"Fabric moves",phrase:"Her clothes sway and ripple gently as she moves",group:"scene"}],er=["still","pose","blink","breathe","hair","cloth"];function ta(){return er.map(e=>ea.find(t=>t.id===e).phrase)}function Ct(e){return ta().every(t=>ia(e,t))}function tr(e){const t=ta(),i=Mi(e).filter(a=>!t.some(o=>Ii(a,o))),s=Ct(e)?i:[...t,...i];return s.length?`${s.join(". ")}.`:""}function Mi(e){return e.split(new RegExp("(?<=[.!?])\\s+|\\n+")).map(t=>t.trim().replace(/[.!?]+$/,"").trim()).filter(Boolean)}const Ii=(e,t)=>e.toLowerCase()===t.toLowerCase();function ia(e,t){return Mi(e).some(i=>Ii(i,t))}function ir(e,t){const i=Mi(e),s=i.filter(o=>!Ii(o,t)),a=s.length===i.length?[...i,t]:s;return a.length?`${a.join(". ")}.`:""}var sr=Object.defineProperty,ar=Object.getOwnPropertyDescriptor,$e=(e,t,i,s)=>{for(var a=s>1?void 0:s?ar(t,i):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(a=(s?n(t,i,a):n(a))||a);return s&&a&&sr(t,i,a),a};function ft(e){return e.id?m.genPreviewURL(e.id):m.galleryFullURL(e.gallery??"")}function gi(){return`clip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}const v={from:"image",picture:null,prompt:"",negative:"",aspect:"portrait",long:832,seconds:5,fps:16,steps:20,variations:1,keepSeed:!1,makeLoop:!1,recipes:{},loraQuery:"",upscaler:"",upscaleBy:2,runs:[],selected:"",loop:!0,speed:1},fi=new Set;function ae(){for(const e of fi)e()}function sa(e){return fi.add(e),()=>fi.delete(e)}function bi(){return v.runs.filter(e=>!e.done).length}const vi=new Set;function or(e){return vi.add(e),()=>vi.delete(e)}function rr(e,t=!1){let i=v.runs.find(s=>{var a;return((a=s.clip)==null?void 0:a.gallery)===e.gallery});i||(i={jobId:gi(),from:"image",prompt:e.name,fps:yi,percent:1,done:!0,startedAt:Date.now(),endedAt:Date.now(),thumb:m.galleryThumbURL(e.gallery),clip:{id:"",mime:"video/mp4",seed:0,gallery:e.gallery,width:e.width,height:e.height}},v.runs=[i,...v.runs]),v.selected=i.jobId,xi=t,ae()}let xi=!1;function zt(e){const t=v.picture;t!=null&&t.objectURL&&t.url!==e.url&&!v.runs.some(i=>i.thumb===t.url)&&URL.revokeObjectURL(t.url),v.picture=e,v.from="image",ae()}const O={lists:null,loras:null,models:[],loading:!1,error:""};async function os(){if(!O.loading){O.loading=!0,O.error="",ae();try{const e=await m.comfyModels();O.lists=e,O.loras=ka(e.loras),O.models=Sa(e)}catch(e){O.error=e.message}finally{O.loading=!1,ae()}}}const Wt=40,yi=16,nr=[.5,1,2],lr=[1.5,2,3,4];function Gt(e){const t=Math.max(0,Math.round(e/1e3));return`${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`}let he=class extends me{constructor(){super(...arguments),this.clips={},this.board="",this.negOpen=!1,this.upscaleOpen=!1,this.error="",this.dropping=!1,this.playing=!0,this.time=0,this.duration=0,this.grabbing=!1,this.ticker=0}connectedCallback(){super.connectedCallback(),this.unsubscribe=sa(()=>this.requestUpdate()),v.from==="image"&&!this.clips.image&&this.clips.text&&(v.from="text"),!O.lists&&(this.clips.image||this.clips.text)&&os(),this.ticker=window.setInterval(()=>{bi()&&this.requestUpdate()},1e3)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.unsubscribe)==null||e.call(this),window.clearInterval(this.ticker)}updated(){xi&&(xi=!1,this.upscaleOpen=!0)}get workflow(){return v.from==="image"?this.clips.image:this.clips.text}recipe(){var t;const e=v.recipes[v.from];return e||(O.loras?Ca((t=this.workflow)==null?void 0:t.models,O.loras):null)}get built(){var e;return!!((e=this.recipe())!=null&&e.models.model)}takes(e){var i;const t=this.workflow;return!!((i=this.built?(t==null?void 0:t.built)??(t==null?void 0:t.takes):t==null?void 0:t.takes)!=null&&i.includes(e))}get loopable(){var e,t;return v.from==="image"&&this.takes("loop")&&$a(((e=this.recipe())==null?void 0:e.models)??((t=this.workflow)==null?void 0:t.models))}toggleShowcase(){const e=!Ct(v.prompt);v.prompt=tr(v.prompt),e&&this.loopable&&(v.makeLoop=!0),ae()}edit(e){const t=this.recipe();if(!t||!O.loras)return;const i=e(t),s=za(Ve(t,O.loras),Ve(i,O.loras));v.recipes={...v.recipes,[v.from]:{...i,models:{...i.models,steps:s.steps,cfg:s.cfg}}},ae()}editModels(e){this.edit(t=>({...t,models:{...t.models,...e}}))}pickModel(e){if(!e){this.edit(a=>({...a,models:{...a.models,model:"",lowModel:"",checkpoint:!1}}));return}const t=O.models.find(a=>`${a.kind}:${a.key}`===e);if(!t||!O.lists||!O.loras)return;const i=O.loras,s=O.lists;this.edit(a=>({...a,models:{...Ta(Ve(a,i),t,s),loras:[]}}))}resetRecipe(){const e={...v.recipes};delete e[v.from],v.recipes=e,ae()}set(e,t){v[e]=t,ae()}get selectedRun(){return v.runs.find(e=>e.jobId===v.selected)??v.runs[0]}size(){const e=v.picture;if(v.from==="image"&&e)return ss(e.width,e.height,v.long);const t=qt.find(i=>i.id===v.aspect)??qt[0];return ss(t.w,t.h,v.long)}fps(){return this.takes("fps")?v.fps:yi}pickFile(e){if(!e)return;if(!e.type.startsWith("image/")){this.error="That file isn't a picture.";return}const t=URL.createObjectURL(e),i=new Image;i.onload=()=>zt({url:t,name:e.name,width:i.naturalWidth,height:i.naturalHeight,objectURL:!0}),i.onerror=()=>{URL.revokeObjectURL(t),this.error="That file isn't a picture this browser can read."},i.src=t}onDragOver(e){var i;const t=((i=e.dataTransfer)==null?void 0:i.types)??[];!t.includes("Files")&&!t.includes(je)||(e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect=t.includes(je)?"move":"copy"),this.dropping=!0)}onDrop(e){var i,s,a;e.preventDefault(),this.dropping=!1;const t=(i=e.dataTransfer)==null?void 0:i.getData(je);if(t){try{const o=JSON.parse(t)[0];o&&this.useGalleryPicture(o)}catch{}return}this.pickFile((a=(s=e.dataTransfer)==null?void 0:s.files)==null?void 0:a[0])}async useGalleryPicture(e){const t=m.galleryFullURL(e),i=new Image;i.onload=()=>zt({url:t,name:e,width:i.naturalWidth,height:i.naturalHeight,gallery:e}),i.onerror=()=>this.error="Couldn't read that picture from the gallery.",i.src=t}async make(){var n,l,p;this.error="";const e=v.from,t=v.picture;if(e==="image"&&!t){this.error="Pick a picture to animate first — drop one here, or press Animate on one in the gallery.";return}if(e==="text"&&!v.prompt.trim()){this.error="Say what the clip should show.";return}const i=this.recipe();if((n=this.workflow)!=null&&n.needsModel&&!(i!=null&&i.models.model)){this.error=O.error?`ComfyUI didn't list its models, so there is nothing to pick from: ${O.error}`:"Pick a model under Model first.";return}let s;try{e==="image"&&t&&!t.gallery&&(s=await cr(t.url))}catch(u){this.error=u.message;return}const a=v.keepSeed?(p=(l=this.selectedRun)==null?void 0:l.clip)==null?void 0:p.seed:void 0,o=[];for(let u=0;u<Math.max(1,v.variations);u++){const h={jobId:gi(),from:e,prompt:v.prompt.trim(),negativePrompt:v.negative.trim(),board:this.board,detach:!0};(this.takes("width")||this.takes("height"))&&Object.assign(h,this.size()),this.takes("frames")&&(h.frames=as(v.seconds,this.fps())),this.takes("fps")&&(h.fps=v.fps),this.takes("steps")&&(h.steps=v.steps),i!=null&&i.models.model&&O.loras&&(h.models=Ve(i,O.loras)),a&&(h.seed=a+u),e==="image"&&t&&(t.gallery?h.initGallery=t.gallery:h.initImage=s),v.makeLoop&&this.loopable&&(h.loop=!0);const g={jobId:h.jobId,from:e,prompt:h.prompt,thumb:e==="image"?t==null?void 0:t.url:void 0,fps:this.fps(),percent:0,done:!1,startedAt:Date.now()};o.push(g),rs(g,()=>m.makeClip(h))}v.runs=[...o.reverse(),...v.runs],v.selected=v.runs[0].jobId,ae()}upscale(e){if(!e.clip)return;const t={jobId:gi(),upscaler:v.upscaler,scale:v.upscaleBy,board:this.board,detach:!0};e.clip.gallery?t.gallery=e.clip.gallery:t.id=e.clip.id;const i={jobId:t.jobId,from:e.from,prompt:e.prompt,thumb:e.thumb,fps:e.fps,percent:0,done:!1,startedAt:Date.now(),upscaleOf:v.runs.length-v.runs.indexOf(e)};v.runs=[i,...v.runs],v.selected=i.jobId,this.upscaleOpen=!1,ae(),rs(i,()=>m.upscaleClip(t))}async save(e){if(!(!e.clip||e.saving||e.savedId)){e.saving=!0,ae();try{const t=e.prompt?`Clip: ${e.prompt.slice(0,80)}`:"Generated clip";e.savedId=e.clip.id?(await m.saveGenerated({id:e.clip.id,title:t,tags:["clip"]})).id:(await m.saveGalleryImage({name:e.clip.gallery??"",tags:["clip"]})).id}catch(t){e.error=t.message}finally{e.saving=!1,ae()}}}dismiss(e){var i,s;(i=e.clip)!=null&&i.id&&!e.savedId&&m.deleteGenPreview(e.clip.id).catch(()=>{});const t=v.runs.indexOf(e);v.runs=v.runs.filter(a=>a!==e),v.selected===e.jobId&&(v.selected=((s=v.runs[Math.min(t,v.runs.length-1)])==null?void 0:s.jobId)??""),ae()}get video(){return this.renderRoot.querySelector(".player video")}async grabFrame(e,t){const i=this.video;if(!i||!i.videoWidth)return null;this.grabbing=!0;try{if(i.pause(),this.playing=!1,e==="last"){const n=Zo(i.duration,t.fps);Math.abs(i.currentTime-n)>.01&&await new Promise(l=>{i.addEventListener("seeked",()=>l(),{once:!0}),i.currentTime=n})}const s=document.createElement("canvas");s.width=i.videoWidth,s.height=i.videoHeight,s.getContext("2d").drawImage(i,0,0);const a=await new Promise(n=>s.toBlob(n,"image/png"));if(!a)return null;const o=v.runs.length-v.runs.indexOf(t);return{url:URL.createObjectURL(a),objectURL:!0,width:s.width,height:s.height,name:`clip ${o} · ${e==="last"?"last frame":`${i.currentTime.toFixed(1)}s`}`}}catch(s){return this.error=`Couldn't take that frame: ${s.message}`,null}finally{this.grabbing=!1}}async continueFrom(e){var i;const t=await this.grabFrame("last",e);t&&(zt(t),(i=this.renderRoot.querySelector(".motion"))==null||i.focus())}async frameToImage(e){const t=await this.grabFrame("current",e);t&&this.dispatchEvent(new CustomEvent("use-frame",{detail:t,bubbles:!0,composed:!0}))}togglePlay(){const e=this.video;e&&(e.paused?e.play():e.pause(),this.playing=!e.paused)}render(){const{image:e,text:t}=this.clips;return!e&&!t?this.renderSetup():r`${this.renderInspector()}
      <section class="main">
        <div class="stage">${this.renderStage()}</div>
        ${this.renderTransport()}
        ${v.runs.length?this.renderReel():d}
      </section>`}renderSetup(){return r`<div class="main" style="grid-column:1 / -1">
      <div class="stage"><div class="hero">
        <span class="glyph"><span class="material-symbols-rounded">movie</span></span>
        <strong>Video needs ComfyUI</strong>
        <span>Neither Automatic1111 nor InvokeAI makes video, so clips are made by a ComfyUI running Wan.</span>
        <div class="steps">
          <div><b>1</b><span>Open <b>Settings → Image generation → Video</b> and give ComfyUI's address.</span></div>
          <div><b>2</b><span>Pick the Wan model, text encoder and VAE it has — or paste a workflow of your own.</span></div>
          <div><b>3</b><span>Press <b>Test ComfyUI</b>, then come back here.</span></div>
        </div>
        <div class="row" style="justify-content:center">
          <button class="chip primary" @click=${()=>this.dispatchEvent(new CustomEvent("open-settings",{bubbles:!0,composed:!0}))}>
            <span class="material-symbols-rounded">settings</span>Open Settings</button>
          <button class="chip" @click=${()=>this.dispatchEvent(new CustomEvent("find-video-models",{bubbles:!0,composed:!0}))}>
            <span class="material-symbols-rounded">travel_explore</span>Find Wan models on Civitai</button>
        </div>
      </div></div>
    </div>`}renderInspector(){var l,p,u;const{image:e,text:t}=this.clips,i=v.from,s=this.size(),a=as(v.seconds,this.fps()),o=bi(),n=(p=(l=this.selectedRun)==null?void 0:l.clip)==null?void 0:p.seed;return r`<aside class="inspector">
      <div class="ins-scroll">
        <div class="modes" role="tablist" aria-label="What the clip starts from">
          <button role="tab" class=${i==="image"?"on":""} aria-selected=${i==="image"?"true":"false"} ?disabled=${!e}
            title=${e?"Bring a picture to life":"No picture-to-video workflow is set up"} @click=${()=>this.set("from","image")}>
            <span class="material-symbols-rounded">animation</span>From a picture</button>
          <button role="tab" class=${i==="text"?"on":""} aria-selected=${i==="text"?"true":"false"} ?disabled=${!t}
            title=${t?"Make a clip from words alone":"No words-to-video workflow is set up"} @click=${()=>this.set("from","text")}>
            <span class="material-symbols-rounded">text_fields</span>From words</button>
        </div>

        ${i==="image"?this.renderFrame():d}

        ${this.takes("prompt")?r`
          <div class="k">${i==="image"?"What happens":"What it shows"}</div>
          <textarea class="motion" .value=${v.prompt}
            @input=${h=>this.set("prompt",h.target.value)}
            @keydown=${h=>{h.key==="Enter"&&(h.ctrlKey||h.metaKey)&&(h.preventDefault(),this.make())}}
            placeholder=${i==="image"?"She turns to the camera, smiles and waves; her hair moves in the breeze":"A woman with silver hair in a red dress turns to the camera and waves, soft evening light"}></textarea>
          ${i==="image"?r`<button class="showcase ${Ct(v.prompt)?"on":""}"
            aria-pressed=${Ct(v.prompt)?"true":"false"} @click=${()=>this.toggleShowcase()}>
            <span class="material-symbols-rounded">auto_awesome</span>
            <span class="sc-copy"><b>Showcase</b><small>She stays put and comes alive: blinks, breathes, her hair flows and her clothes move,
              the camera holds still${this.loopable?" — and it loops":""}.</small></span>
          </button>`:d}
          <div class="presets">
            ${["camera","her","scene"].map(h=>r`<div class="row">
              <span class="preset-group">${h==="her"?"Her":h==="camera"?"Camera":"Scene"}</span>
              ${ea.filter(g=>g.group===h).map(g=>r`<button class="chip ${ia(v.prompt,g.phrase)?"on":""}"
                title=${g.phrase} @click=${()=>this.set("prompt",ir(v.prompt,g.phrase))}>${g.label}</button>`)}
            </div>`)}
          </div>
          ${this.takes("negative")?this.negOpen||v.negative?r`
            <div class="k">What it should avoid</div>
            <textarea style="min-height:56px" .value=${v.negative} placeholder="blurry, distorted hands, flicker, static"
              @input=${h=>this.set("negative",h.target.value)}></textarea>`:r`<button class="link" @click=${()=>this.negOpen=!0}>+ What it should avoid</button>`:d}
        `:d}

        ${this.renderModel()}
        ${this.takes("loras")?this.renderLoras():d}

        ${this.takes("width")||this.takes("height")?r`
          <div class="k">Shape<small>${s.width}×${s.height}</small></div>
          <div class="row">
            ${i==="text"?qt.map(h=>r`<button class="chip ${v.aspect===h.id?"on":""}"
              @click=${()=>this.set("aspect",h.id)}>${h.label}</button>`):d}
            <select aria-label="Longer side" @change=${h=>this.set("long",Number(h.target.value))}>
              ${Xo.map(h=>r`<option value=${h} ?selected=${h===v.long}>${h}px long side</option>`)}
            </select>
          </div>
          ${i==="image"?r`<div class="note" style="margin-top:6px">In the picture's shape. Bigger is slower, by a lot.</div>`:d}
        `:d}

        ${this.takes("frames")?r`
          <div class="k">Length<small>${a} frames${this.takes("fps")?"":` at ${yi} fps`}</small></div>
          <label class="slider">
            <input type="range" min="1" max="10" step="0.5" .value=${String(v.seconds)} aria-label="Length in seconds"
              @input=${h=>this.set("seconds",Number(h.target.value))} />
            <b>${v.seconds}s</b>
          </label>
        `:d}

        ${i==="image"&&this.takes("loop")?r`
          <label class="switch" title=${this.loopable?"The clip ends on the picture it starts from, so it plays round without a jump":"Wan 2.2's 5B model can't be given a last frame — pick the 14B pair or Wan 2.1 to loop"}>
            <input type="checkbox" .checked=${v.makeLoop&&this.loopable} ?disabled=${!this.loopable}
              @change=${h=>this.set("makeLoop",h.target.checked)} />
            <span class="material-symbols-rounded" style="font-size:17px">loop</span>Seamless loop
            <span style="opacity:.7">${this.loopable?"· ends where it starts":"· not on the 5B model"}</span>
          </label>`:d}

        ${this.takes("fps")?r`
          <div class="k">Frame rate</div>
          <div class="seg" role="group" aria-label="Frame rate">${[8,12,16,24].map(h=>r`<button class=${v.fps===h?"on":""}
            aria-pressed=${v.fps===h?"true":"false"} @click=${()=>this.set("fps",h)}>${h}</button>`)}</div>
        `:d}

        ${this.takes("steps")?r`
          <div class="k">Steps</div>
          <label class="slider">
            <input type="range" min="2" max="50" step="1" .value=${String(v.steps)} aria-label="Steps"
              @input=${h=>this.set("steps",Number(h.target.value))} />
            <b>${v.steps}</b>
          </label>
        `:d}

        <div class="k">Takes</div>
        <div class="seg" role="group" aria-label="Clips per press">${[1,2,3].map(h=>r`<button class=${v.variations===h?"on":""}
          aria-pressed=${v.variations===h?"true":"false"} @click=${()=>this.set("variations",h)}>${h}</button>`)}</div>
        ${this.takes("seed")?r`<label class="switch" title=${n?`Seed ${n}`:"Make a clip first — the selected clip's seed is the one kept"}>
          <input type="checkbox" .checked=${v.keepSeed&&!!n} ?disabled=${!n}
            @change=${h=>this.set("keepSeed",h.target.checked)} />
          Keep the selected clip's seed${n?r` <span style="opacity:.7;font-variant-numeric:tabular-nums">· ${n}</span>`:d}
        </label>`:d}
        ${this.error?r`<div class="err">${this.error}</div>`:d}
      </div>
      <div class="ins-foot">
        <button class="make" ?disabled=${i==="image"&&!v.picture||!!((u=this.workflow)!=null&&u.needsModel)&&!this.built}
          title="Make the clip (Ctrl+Enter)" @click=${()=>void this.make()}>
          <span class="material-symbols-rounded">movie</span>${v.variations>1?`Make ${v.variations} clips`:"Make the clip"}</button>
        <div class="make-sub">${o?`${o} clip${o===1?"":"s"} in the works · `:""}${v.seconds}s at ${s.width}×${s.height} · takes minutes</div>
      </div>
    </aside>`}renderModel(){const e=this.workflow;if(!e)return d;const t=this.recipe(),i=!e.needsModel&&!e.models,s=!!v.recipes[v.from],a=r`<div class="k">Model
      <span class="k-btns">
        ${s?r`<button class="link" title="Back to the files in Settings → Image generation → Video" @click=${()=>this.resetRecipe()}>Settings'</button>`:d}
        <button class="k-btn" title="Read ComfyUI's models again" aria-label="Read ComfyUI's models again" ?disabled=${O.loading}
          @click=${()=>void os()}><span class="material-symbols-rounded">refresh</span></button>
      </span></div>`;if(!t||!O.lists)return r`${a}<div class=${O.error?"err":"note"}>${O.error?`ComfyUI didn't list its models: ${O.error}. ${e.needsModel?"":"Clips run on Settings' files meanwhile."}`:"Asking ComfyUI what it has…"}</div>`;const o=t.models,n=O.lists,l=Pa(o,O.models),p=l?`${l.kind}:${l.key}`:o.model?"current":"",u=(y,T)=>{const P=O.models.filter(L=>L.kind===T);return P.length?r`<optgroup label=${y}>${P.map(L=>r`<option value="${L.kind}:${L.key}" ?selected=${`${L.kind}:${L.key}`===p}>${L.label}${L.speed?" ⚡":""}</option>`)}</optgroup>`:d},h=(y,T,P,L,U)=>r`
      <select aria-label=${y} @change=${I=>U(I.target.value)}>
        <option value="" ?selected=${!P}>${L}</option>
        ${(P&&!T.includes(P)?[P,...T]:T).map(I=>r`<option value=${I} ?selected=${I===P}>${I}</option>`)}
      </select>`,g=Ve(t,O.loras??[]),w=La(g),x=(y,T,P)=>y?String(y):`${w?T:P}`;return r`${a}
      <select class="model-pick" aria-label="Model" @change=${y=>this.pickModel(y.target.value)}>
        ${!o.model||i?r`<option value="" ?selected=${!o.model}>${i?"Settings' pasted workflow":"Pick a model…"}</option>`:d}
        ${o.model&&!l?r`<option value="current" selected>${o.model} (not listed)</option>`:d}
        ${u("Wan 2.2 pairs — high + low noise","pair")}
        ${u("Single models","single")}
        ${u("All-in-one checkpoints","checkpoint")}
      </select>
      ${O.models.length?d:r`<div class="note" style="margin-top:6px">ComfyUI has no Wan models yet.
        <button class="link" @click=${()=>this.dispatchEvent(new CustomEvent("find-video-models",{bubbles:!0,composed:!0}))}>Find them on Civitai</button></div>`}
      ${o.model?r`
        ${(l==null?void 0:l.kind)==="pair"?r`<div class="model-note"><span class="material-symbols-rounded">animation</span>
          High noise lays out the motion, then ${pr(o.lowModel)} finishes it</div>`:d}
        ${w?r`<div class="model-note speed"><span class="material-symbols-rounded">bolt</span>A speed file is in: ${qe.steps} steps at CFG 1, several times faster</div>`:d}
        <details class="files">
          <summary><span class="material-symbols-rounded" style="font-size:16px">description</span>Encoder · VAE
            <span class="nm">${o.checkpoint&&!o.textEncoder&&!o.vae?"the checkpoint's own":[o.textEncoder||"—",o.vae||"—"].join(" · ")}</span>
            <span class="material-symbols-rounded chev" style="font-size:18px">expand_more</span></summary>
          <div class="files-grid">
            <span>Text encoder</span>${h("Text encoder",n.textEncoders,o.textEncoder,o.checkpoint?"The checkpoint's own":"Pick one (umt5_xxl)",y=>this.editModels({textEncoder:y}))}
            <span>VAE</span>${h("VAE",n.vaes,o.vae,o.checkpoint?"The checkpoint's own":"Pick one (wan_2.1_vae)",y=>this.editModels({vae:y}))}
          </div>
        </details>
        ${!o.checkpoint&&(!o.textEncoder||!o.vae)?r`<div class="err">A model from diffusion_models needs a text encoder and a VAE beside it.</div>`:d}

        <div class="k">Sampling<small>0 is Wan's own</small></div>
        <div class="sampling">
          <span>Steps</span>
          <input type="range" min="0" max="40" step="1" .value=${String(o.steps)} aria-label="Steps"
            @input=${y=>this.editModels({steps:Number(y.target.value)})} />
          <b class=${o.steps?"":"auto"}>${x(o.steps,qe.steps,20)}</b>
          <span>CFG</span>
          <input type="range" min="0" max="10" step="0.5" .value=${String(o.cfg)} aria-label="CFG"
            @input=${y=>this.editModels({cfg:Number(y.target.value)})} />
          <b class=${o.cfg?"":"auto"}>${x(o.cfg,qe.cfg,3.5)}</b>
          <span>Shift</span>
          <input type="range" min="0" max="20" step="0.5" .value=${String(o.shift)} aria-label="Shift"
            @input=${y=>this.editModels({shift:Number(y.target.value)})} />
          <b class=${o.shift?"":"auto"}>${o.shift||8}</b>
          <span>Sampler</span>
          <div class="two">
            ${h("Sampler",n.samplers??[],o.sampler??"","euler",y=>this.editModels({sampler:y}))}
            ${h("Scheduler",n.schedulers??[],o.scheduler??"","simple",y=>this.editModels({scheduler:y}))}
          </div>
        </div>
        ${Ma(g)?r`<div class="warn">A speed file at CFG ${o.cfg} comes out burned, and takes many times as long.
          <button class="link" @click=${()=>this.editModels({steps:qe.steps,cfg:qe.cfg})}>Use ${qe.steps} steps at CFG 1</button></div>`:d}
      `:d}`}renderLoras(){const e=this.recipe();if(!e)return d;const t=O.loras??[],i=t.filter(p=>e.loras[p.key]!==void 0),s=v.loraQuery.trim().toLowerCase(),a=t.filter(p=>e.loras[p.key]===void 0&&(!s||p.label.toLowerCase().includes(s)||p.key.toLowerCase().includes(s))),o=i.length,n=(p,u)=>this.edit(h=>({...h,loras:{...h.loras,[p]:u}})),l=p=>this.edit(u=>{const h={...u.loras};return delete h[p],{...u,loras:h}});return r`
      <div class="k">LoRAs<small>${o?`${o} on`:""}</small></div>
      ${o?r`<div class="loras-on">
        ${i.map(p=>{const u=e.loras[p.key];return r`<div class="lora-row ${p.speed?"speed":""}">
            <span class="lora-ic material-symbols-rounded">${p.speed?"bolt":"style"}</span>
            <span class="lora-name" title=${p.files.map(h=>h.name).join(`
`)}>${p.label}${p.files.length>1?r`<span class="lora-tag">high + low</span>`:d}</span>
            <button class="lora-x" title="Take it off" aria-label="Take ${p.label} off" @click=${()=>l(p.key)}>
              <span class="material-symbols-rounded">close</span></button>
            <label class="lora-weight">
              <input type="range" min="-1" max="2" step="0.05" .value=${String(u)} aria-label="${p.label} strength"
                @input=${h=>n(p.key,Number(h.target.value))} />
              <b>${u.toFixed(2)}</b>
            </label>
          </div>`})}
      </div>`:d}
      ${t.length?r`
          ${t.length>6?r`<label class="lora-search"><span class="material-symbols-rounded">search</span>
            <input type="search" placeholder="Search ${t.length} LoRAs" .value=${v.loraQuery} aria-label="Search LoRAs"
              @input=${p=>this.set("loraQuery",p.target.value)} /></label>`:d}
          ${a.length?r`<div class="lora-list">
            ${a.slice(0,Wt).map(p=>r`<button class="lora-pick" title=${p.files.map(u=>u.name).join(`
`)} @click=${()=>n(p.key,1)}>
              <span class="material-symbols-rounded">${p.speed?"bolt":"add"}</span>
              <span class="lora-name">${p.label}</span>
              ${p.files.length>1?r`<span class="lora-tag">pair</span>`:d}
            </button>`)}
          </div>
          ${a.length>Wt?r`<div class="note" style="margin-top:6px">${a.length-Wt} more — search to find them.</div>`:d}`:r`<div class="note">${s?"No LoRA by that name.":"Every LoRA ComfyUI has is on."}</div>`}`:r`<div class="note">ComfyUI has no LoRAs in models/loras.
            <button class="link" @click=${()=>this.dispatchEvent(new CustomEvent("find-video-models",{bubbles:!0,composed:!0}))}>Find Wan LoRAs on Civitai</button></div>`}
    `}renderFrame(){const e=v.picture,t=r`<input type="file" accept="image/*" @change=${s=>{var o;const a=s.target;this.pickFile((o=a.files)==null?void 0:o[0]),a.value=""}} />`,i=()=>{var s;return(s=this.renderRoot.querySelector(".frame input[type=file]"))==null?void 0:s.click()};return r`<div class="k">Starts from</div>
      <div class="frame ${e?"has":""} ${this.dropping?"drop":""}"
        @dragover=${s=>this.onDragOver(s)} @dragleave=${()=>this.dropping=!1} @drop=${s=>this.onDrop(s)}>
        ${t}
        ${e?r`<img src=${e.url} alt="" />
              <div class="frame-bar">
                <span class="nm">${e.name}<small>${e.width}×${e.height}</small></span>
                <button title="Choose another picture" aria-label="Choose another picture" @click=${i}><span class="material-symbols-rounded">upload</span></button>
                <button title="Let it go" aria-label="Let the picture go" @click=${()=>this.set("picture",null)}><span class="material-symbols-rounded">close</span></button>
              </div>`:r`<div class="frame-empty">
              <span class="material-symbols-rounded">add_photo_alternate</span>
              <span>Drag a picture here from the gallery or your desktop, or press <b>Animate</b> on one.</span>
              <button class="chip" @click=${i}><span class="material-symbols-rounded">upload</span>Choose a picture</button>
            </div>`}
      </div>`}renderStage(){const e=this.selectedRun;if(!e){const t=v.from==="image"?v.picture:null;return t?r`<div class="hero">
            <div class="hero-frame"><img src=${t.url} alt="" /></div>
            <span>Say what happens under <b>What happens</b>, then <b>Make the clip</b>. It takes a few minutes and carries on while you do other things.</span>
          </div>`:r`<div class="hero">
            <span class="glyph"><span class="material-symbols-rounded">theaters</span></span>
            <strong>${v.from==="image"?"Bring a picture to life":"A clip from words"}</strong>
            <span>${v.from==="image"?"Drop a picture on Starts from, or press Animate on one in the gallery, the Image studio or a clip's frame.":"Describe the scene and what moves in it, in sentences — video models read words better than tags."}</span>
          </div>`}if(e.clip){const t=ft(e.clip);return e.clip.mime.startsWith("video/")?r`<div class="player"><video src=${t} autoplay playsinline muted .loop=${v.loop} .playbackRate=${v.speed}
            @click=${()=>this.togglePlay()}
            @play=${()=>this.playing=!0} @pause=${()=>this.playing=!1}
            @loadedmetadata=${i=>{const s=i.target;this.duration=s.duration,s.playbackRate=v.speed}}
            @timeupdate=${i=>this.time=i.target.currentTime}></video></div>`:r`<div class="player"><img class="still" src=${t} alt="Generated clip" /></div>`}if(!e.done){const t=Math.round(e.percent*100),i=2*Math.PI*60;return r`<div class="waiting">
        ${e.thumb?r`<img src=${e.thumb} alt="" />`:d}
        <div class="ring">
          <svg viewBox="0 0 132 132"><circle class="track" cx="66" cy="66" r="60" /><circle class="fill" cx="66" cy="66" r="60"
            stroke-dasharray=${i} stroke-dashoffset=${i*(1-e.percent)} /></svg>
          <span class="pct"><b>${t}%</b>${Gt(Date.now()-e.startedAt)}</span>
        </div>
        <span class="what">${e.upscaleOf?`Enlarging take ${e.upscaleOf} ${v.upscaleBy}×…`:e.prompt||"Animating the picture…"}</span>
      </div>`}return r`<div class="failed"><span class="material-symbols-rounded">error</span>
      <span>${e.error??"ComfyUI finished without a clip."}</span>
      <button class="chip" @click=${()=>this.dismiss(e)}><span class="material-symbols-rounded">close</span>Dismiss</button></div>`}renderTransport(){var s;const e=this.selectedRun;if(!e)return d;const t=!!((s=e.clip)!=null&&s.mime.startsWith("video/")),i=e.endedAt?Gt(e.endedAt-e.startedAt):"";return r`${this.upscaleOpen&&t?this.renderUpscale(e):d}<div class="transport">
      ${t?r`
        <button class="icon-btn" title=${this.playing?"Pause":"Play"} aria-label=${this.playing?"Pause":"Play"} @click=${()=>this.togglePlay()}>
          <span class="material-symbols-rounded">${this.playing?"pause":"play_arrow"}</span></button>
        <label class="scrub">
          <span>${this.time.toFixed(1)}s</span>
          <input type="range" min="0" max=${this.duration||1} step="0.01" .value=${String(this.time)} aria-label="Position in the clip"
            @input=${a=>{const o=this.video;o&&(o.pause(),o.currentTime=Number(a.target.value))}} />
          <span>${this.duration?`${this.duration.toFixed(1)}s`:""}</span>
        </label>
        <button class="icon-btn ${v.loop?"on":""}" title="Loop" aria-pressed=${v.loop?"true":"false"} @click=${()=>this.set("loop",!v.loop)}>
          <span class="material-symbols-rounded">replay</span></button>
        <div class="seg" role="group" aria-label="Playback speed">${nr.map(a=>r`<button class=${v.speed===a?"on":""}
          @click=${()=>{this.set("speed",a);const o=this.video;o&&(o.playbackRate=a)}}>${a}×</button>`)}</div>
        <span class="t-sep"></span>
        <button class="chip" ?disabled=${this.grabbing||!this.clips.image} title="Start the next clip from this one's last frame — how a few seconds become longer"
          @click=${()=>void this.continueFrom(e)}><span class="material-symbols-rounded">start</span>Continue from last frame</button>
        <button class="chip" ?disabled=${this.grabbing} title="Start a picture in the Image studio from the frame on screen"
          @click=${()=>void this.frameToImage(e)}><span class="material-symbols-rounded">screenshot</span>Frame to Image</button>
        <button class="chip ${this.upscaleOpen?"on":""}" title="Enlarge this clip through ComfyUI; the enlarged one is a new take beside it"
          aria-expanded=${this.upscaleOpen?"true":"false"} @click=${()=>this.upscaleOpen=!this.upscaleOpen}>
          <span class="material-symbols-rounded">open_in_full</span>Upscale</button>
      `:r`<span class="t-meta" style="flex:1">${e.done?e.error?"Didn't finish":"":`Started ${Gt(Date.now()-e.startedAt)} ago`}</span>`}
      <span class="toolbar-spacer" style="flex:1"></span>
      ${e.clip?r`<span class="t-meta">${e.clip.seed?`seed ${e.clip.seed}`:"from the gallery"}${e.clip.recipe?` · ${e.clip.recipe}`:""}${i&&e.clip.id?` · ${i}`:""}</span>`:d}
      ${e.done?d:r`<button class="chip" @click=${()=>void m.cancelGenerate(e.jobId).catch(()=>{})}>
        <span class="material-symbols-rounded">stop</span>Stop</button>`}
      ${e.clip?r`
        <a class="chip" href=${ft(e.clip)} download="clip-${e.clip.seed||e.clip.gallery}" title="Download">
          <span class="material-symbols-rounded">download</span></a>
        <button class="chip ${e.savedId?"":"primary"}" ?disabled=${e.saving||!!e.savedId} @click=${()=>void this.save(e)}>
          <span class="material-symbols-rounded">${e.savedId?"check":"save"}</span>${e.savedId?"In the library":e.clip.gallery?"Move to library":"Save"}</button>`:d}
      ${e.done?r`<button class="icon-btn" title="Dismiss this clip" aria-label="Dismiss this clip" @click=${()=>this.dismiss(e)}>
        <span class="material-symbols-rounded">delete</span></button>`:d}
    </div>`}renderUpscale(e){var a;const t=((a=O.lists)==null?void 0:a.upscalers)??[],i=e.clip,s=i.width&&i.height?`→ ${Math.round(i.width*v.upscaleBy/16)*16}×${Math.round(i.height*v.upscaleBy/16)*16}`:"";return r`<div class="upscale" role="group" aria-label="Upscale the clip">
      <span class="lbl"><span class="material-symbols-rounded">open_in_full</span>Upscale with</span>
      <select aria-label="Upscaler" @change=${o=>this.set("upscaler",o.target.value)}>
        <option value="" ?selected=${!v.upscaler}>Lanczos — quick, softer</option>
        ${t.map(o=>r`<option value=${o} ?selected=${o===v.upscaler}>${o}</option>`)}
      </select>
      <div class="seg" role="group" aria-label="How much larger">${lr.map(o=>r`<button class=${v.upscaleBy===o?"on":""}
        aria-pressed=${v.upscaleBy===o?"true":"false"} @click=${()=>this.set("upscaleBy",o)}>${o}×</button>`)}</div>
      ${s?r`<span class="to" title="From ${i.width}×${i.height}">${s}</span>`:d}
      <span style="flex:1"></span>
      ${!t.length&&O.lists?r`<span class="to" title="Put ESRGAN-style models (4x-UltraSharp, RealESRGAN) in ComfyUI's models/upscale_models">No upscale models in ComfyUI</span>`:d}
      <button class="chip primary" @click=${()=>this.upscale(e)}><span class="material-symbols-rounded">auto_awesome</span>Upscale</button>
      <button class="icon-btn" title="Close" aria-label="Close" @click=${()=>this.upscaleOpen=!1}><span class="material-symbols-rounded">close</span></button>
    </div>`}renderReel(){var i;const e=(i=this.selectedRun)==null?void 0:i.jobId,t=v.runs.length;return r`<div class="reel" role="listbox" aria-label="Clips this session">
      <span class="reel-label">Takes</span>
      ${v.runs.map((s,a)=>{const o=Math.round(s.percent*100),n=s.clip?s.clip.mime.startsWith("video/")?r`<video src=${`${ft(s.clip)}#t=0.1`} muted playsinline preload="metadata"></video>`:r`<img src=${ft(s.clip)} alt="" />`:s.thumb?r`<img src=${s.thumb} alt="" />`:d;return r`<button class="take ${s.jobId===e?"on":""} ${s.done?"":"running"}" role="option"
          aria-selected=${s.jobId===e?"true":"false"} title=${s.prompt||"Clip"}
          @click=${()=>this.set("selected",s.jobId)}>
          ${n}
          <span class="take-n">${t-a}${s.upscaleOf?r` · ${s.upscaleOf}↑`:d}</span>
          ${s.done?s.savedId?r`<span class="badge saved"><span class="material-symbols-rounded">check</span>Saved</span>`:s.error&&!s.clip?r`<span class="badge err"><span class="material-symbols-rounded">error</span></span>`:d:r`<span class="badge">${o}%</span><span class="mini-bar"><span style="width:${o}%"></span></span>`}
        </button>`})}
    </div>`}};he.styles=[ue,Oe,re`
      :host {
        display: grid;
        grid-template-columns: 340px minmax(0, 1fr);
        height: 100%;
        min-height: 0;
        color: var(--oppai-text);
      }
      button, textarea, select, input { font: inherit; }
      .material-symbols-rounded { font-size: 18px; }

      /* ── inspector ── */
      .inspector {
        min-height: 0; display: flex; flex-direction: column;
        background: var(--oppai-surface); border-right: 1px solid var(--oppai-border-strong);
      }
      .ins-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; padding: 14px 16px 18px; }
      .ins-foot { flex: none; padding: 12px 16px 14px; border-top: 1px solid var(--oppai-border); background: var(--oppai-surface); }
      .k {
        display: flex; align-items: center; gap: 8px; margin: 20px 0 8px; font-size: 11px; font-weight: 700;
        letter-spacing: 0.7px; text-transform: uppercase; color: var(--oppai-text-muted);
      }
      .k:first-child { margin-top: 2px; }
      .k small { margin-left: auto; font-weight: 500; letter-spacing: 0; text-transform: none; font-variant-numeric: tabular-nums; }
      .note { font-size: 12px; line-height: 1.5; color: var(--oppai-text-muted); }
      .err { margin-top: 8px; font-size: 12px; line-height: 1.45; color: var(--oppai-error, #f2b8b5); }

      .modes { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 14px; background: var(--oppai-bg); }
      .modes button {
        display: flex; align-items: center; justify-content: center; gap: 6px; height: 36px; border-radius: 10px; border: none;
        background: none; color: var(--oppai-text-dim); font-size: 12.5px; font-weight: 650; cursor: pointer;
      }
      .modes button.on { background: var(--oppai-surface-2); color: var(--oppai-text); box-shadow: 0 1px 0 var(--oppai-border-strong) inset, 0 2px 8px rgba(0,0,0,.25); }
      .modes button:disabled { opacity: 0.4; cursor: default; }

      /* The start frame is a drop target: a file from the desktop or a tile from the
         gallery beside it. */
      .frame {
        position: relative; display: grid; place-items: center; min-height: 168px; border-radius: 16px; overflow: hidden;
        border: 1.5px dashed var(--oppai-border-strong); background: var(--oppai-bg); text-align: center;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .frame.drop { border-color: var(--oppai-primary); background: color-mix(in srgb, var(--oppai-primary) 12%, var(--oppai-bg)); }
      .frame.has { border-style: solid; border-color: var(--oppai-border); min-height: 0; }
      .frame img { display: block; width: 100%; max-height: 260px; object-fit: contain; background: #000; }
      .frame-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 22px 16px; color: var(--oppai-text-muted); font-size: 12px; line-height: 1.5; }
      .frame-empty .material-symbols-rounded { font-size: 32px; opacity: 0.75; }
      .frame-bar {
        position: absolute; left: 8px; right: 8px; bottom: 8px; display: flex; align-items: center; gap: 6px; padding: 6px 6px 6px 10px;
        border-radius: 12px; background: rgba(0,0,0,.62); backdrop-filter: blur(8px); color: #fff; font-size: 11.5px; text-align: left;
      }
      .frame-bar .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .frame-bar .nm small { opacity: 0.7; margin-left: 6px; font-variant-numeric: tabular-nums; }
      .frame-bar button { width: 28px; height: 28px; border-radius: 9px; border: none; background: rgba(255,255,255,.12); color: #fff; cursor: pointer; display: grid; place-items: center; }
      .frame-bar button:hover { background: rgba(255,255,255,.24); }
      input[type="file"] { display: none; }

      .chip {
        display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 11px; border-radius: 15px; flex: none;
        border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text-dim); font-size: 12px; cursor: pointer;
        transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
      }
      .chip:hover { border-color: var(--oppai-text-muted); color: var(--oppai-text); }
      .chip.on { background: var(--oppai-primary-container); border-color: transparent; color: var(--oppai-on-primary-container, var(--oppai-text)); }
      .chip .material-symbols-rounded { font-size: 16px; }
      .chip.primary { background: var(--oppai-primary); color: var(--oppai-on-primary); border-color: transparent; font-weight: 650; }
      .chip:disabled { opacity: 0.5; cursor: default; }
      .row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
      .presets { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
      /* Showcase is one press for a whole kind of clip, so it reads as more than a chip. */
      .showcase {
        display: flex; align-items: center; gap: 10px; width: 100%; margin-top: 10px; padding: 9px 12px; text-align: left;
        border-radius: 12px; border: 1px dashed var(--oppai-border-strong); background: transparent; color: var(--oppai-text-dim);
        font: inherit; cursor: pointer; transition: background 0.12s ease, border-color 0.12s ease;
      }
      .showcase:hover { border-color: var(--oppai-text-muted); color: var(--oppai-text); }
      .showcase.on { border-style: solid; border-color: transparent; background: var(--oppai-primary-container); color: var(--oppai-on-primary-container, var(--oppai-text)); }
      .showcase > .material-symbols-rounded { font-size: 22px; color: var(--oppai-primary); }
      .showcase .sc-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .showcase b { font-size: 12.5px; }
      .showcase small { font-size: 11px; line-height: 1.35; opacity: 0.85; }
      .presets .row { gap: 5px; }
      .preset-group { font-size: 10.5px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: var(--oppai-text-muted); width: 52px; flex: none; }
      .presets .chip { height: 26px; padding: 0 9px; font-size: 11.5px; }

      textarea {
        width: 100%; box-sizing: border-box; min-height: 92px; resize: vertical; padding: 10px 12px; border-radius: 12px;
        border: 1px solid var(--oppai-border-strong); background: var(--oppai-bg); color: var(--oppai-text); font-size: 13px; line-height: 1.5;
      }
      textarea:focus { outline: none; border-color: var(--oppai-primary); }
      .link { border: none; background: none; padding: 6px 0 0; color: var(--oppai-primary-bright, var(--oppai-primary)); font-size: 12px; cursor: pointer; }

      /* LoRAs, laid out as the Image studio's picker lays them: the ones on, with their
         weights, above the rest. ComfyUI keeps no pictures of its LoRAs, so the rest
         are a list of names rather than cards. */
      .k-btn { border: none; background: none; padding: 0; width: 22px; height: 22px; border-radius: 11px; color: var(--oppai-text-muted); cursor: pointer; display: grid; place-items: center; }
      .k-btn:hover { color: var(--oppai-text); background: var(--oppai-surface-2); }
      .k-btn .material-symbols-rounded { font-size: 16px; }
      .loras-on { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
      .lora-row {
        display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; column-gap: 8px; row-gap: 2px; align-items: center;
        padding: 7px 6px 7px 8px; border-radius: 12px; background: var(--oppai-bg); border: 1px solid var(--oppai-border);
      }
      .lora-row.fixed { opacity: 0.75; }
      .lora-ic { grid-row: 1 / 3; width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center; font-size: 17px; background: var(--oppai-surface-2); color: var(--oppai-text-muted); }
      .lora-row.speed .lora-ic { color: var(--oppai-primary-bright, var(--oppai-primary)); }
      .lora-name { min-width: 0; font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .lora-tag { margin-left: 6px; font-size: 10.5px; font-weight: 600; color: var(--oppai-text-muted); }
      .lora-x { border: none; background: none; width: 26px; height: 26px; border-radius: 13px; color: var(--oppai-text-muted); cursor: pointer; display: grid; place-items: center; }
      .lora-x:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .lora-x .material-symbols-rounded { font-size: 17px; }
      .lora-weight { grid-column: 2 / 4; display: flex; align-items: center; gap: 8px; }
      .lora-weight input { flex: 1; min-width: 0; accent-color: var(--oppai-primary); }
      .lora-weight b { min-width: 34px; text-align: right; font-size: 11.5px; font-variant-numeric: tabular-nums; }
      .lora-search { position: relative; display: block; margin-bottom: 6px; }
      .lora-search input {
        width: 100%; box-sizing: border-box; height: 32px; padding: 0 10px 0 32px; border-radius: 16px;
        border: 1px solid var(--oppai-border-strong); background: var(--oppai-bg); color: var(--oppai-text); font-size: 12.5px; outline: none;
      }
      .lora-search input:focus { border-color: var(--oppai-primary); }
      .lora-search .material-symbols-rounded { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); font-size: 18px; color: var(--oppai-text-muted); pointer-events: none; }
      .lora-list { display: flex; flex-direction: column; max-height: 232px; overflow-y: auto; scrollbar-width: thin; border-radius: 12px; border: 1px solid var(--oppai-border); }
      .lora-pick {
        display: flex; align-items: center; gap: 8px; min-height: 34px; padding: 4px 10px; border: none; border-bottom: 1px solid var(--oppai-border);
        background: none; color: var(--oppai-text-dim); font-size: 12.5px; text-align: left; cursor: pointer;
      }
      .lora-pick:last-child { border-bottom: none; }
      .lora-pick:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .lora-pick .material-symbols-rounded { font-size: 17px; flex: none; }
      .lora-pick .lora-name { flex: 1; font-weight: 500; }
      select {
        height: 30px; padding: 0 8px; border-radius: 15px; border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-bg); color: var(--oppai-text); font-size: 12px;
      }
      /* The model, as the Image studio's checkpoint: one picker, the files beside it
         folded away, since they follow from the model nearly always. */
      .model-pick { width: 100%; height: 38px; border-radius: 12px; padding: 0 10px; font-size: 12.5px; }
      .model-note { display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 11.5px; color: var(--oppai-text-muted); }
      .model-note .material-symbols-rounded { font-size: 15px; }
      .model-note.speed { color: var(--oppai-primary-bright, var(--oppai-primary)); }
      details.files { margin-top: 8px; border-radius: 12px; border: 1px solid var(--oppai-border); background: var(--oppai-bg); }
      details.files summary {
        display: flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 10px; font-size: 12px; color: var(--oppai-text-dim);
        cursor: pointer; list-style: none;
      }
      details.files summary::-webkit-details-marker { display: none; }
      details.files summary .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--oppai-text-muted); }
      details.files[open] summary .chev { transform: rotate(180deg); }
      .files-grid { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 6px 8px; align-items: center; padding: 4px 10px 10px; font-size: 11.5px; color: var(--oppai-text-muted); }
      .files-grid select, .sampling select { width: 100%; min-width: 0; }
      .sampling { display: grid; grid-template-columns: 52px minmax(0, 1fr) 54px; gap: 6px 8px; align-items: center; font-size: 12px; color: var(--oppai-text-dim); }
      .sampling input[type="range"] { width: 100%; accent-color: var(--oppai-primary); }
      .sampling b { text-align: right; font-size: 12px; font-variant-numeric: tabular-nums; }
      .sampling b.auto { color: var(--oppai-text-muted); font-weight: 500; }
      .sampling .two { grid-column: 2 / 4; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      .warn { margin-top: 8px; padding: 8px 10px; border-radius: 10px; font-size: 12px; line-height: 1.45;
        background: color-mix(in srgb, var(--oppai-error, #f2b8b5) 14%, transparent); color: var(--oppai-text); }
      .warn .link { padding: 4px 0 0; display: block; }
      .k-btns { margin-left: auto; display: flex; align-items: center; gap: 2px; }
      .k-btns .link { padding: 0 6px; font-size: 11px; font-weight: 600; letter-spacing: 0; text-transform: none; }
      .k-btns + small { margin-left: 6px; }

      /* Enlarging the clip on the stage: a bar over the transport. */
      .upscale {
        flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; padding: 10px 16px;
        border-top: 1px solid var(--oppai-border); background: color-mix(in srgb, var(--oppai-primary) 7%, var(--oppai-surface));
        animation: oppai-fade-in 0.16s ease both;
      }
      .upscale .lbl { font-size: 12px; font-weight: 650; color: var(--oppai-text-dim); display: flex; align-items: center; gap: 6px; }
      .upscale select { flex: 0 1 200px; min-width: 120px; }
      .upscale .to { font-size: 11.5px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }

      .slider { display: flex; align-items: center; gap: 10px; }
      .slider input { flex: 1; accent-color: var(--oppai-primary); }
      .slider b { min-width: 44px; text-align: right; font-size: 12.5px; font-variant-numeric: tabular-nums; }
      .seg { display: inline-flex; border: 1px solid var(--oppai-border-strong); border-radius: 12px; overflow: hidden; }
      .seg button { min-width: 34px; height: 30px; border: none; background: none; color: var(--oppai-text-dim); font-size: 12px; font-weight: 650; cursor: pointer; padding: 0 8px; }
      .seg button + button { border-left: 1px solid var(--oppai-border); }
      .seg button.on { background: var(--oppai-primary-container); color: var(--oppai-on-primary-container, var(--oppai-text)); }
      .switch { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--oppai-text-dim); cursor: pointer; margin-top: 10px; }
      .switch input { accent-color: var(--oppai-primary); width: 16px; height: 16px; }
      .switch:has(input:disabled) { opacity: 0.5; cursor: default; }

      .make {
        width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; height: 48px; border-radius: 24px;
        border: none; color: var(--oppai-on-primary); font-size: 14.5px; font-weight: 700; cursor: pointer;
        background: linear-gradient(135deg, var(--oppai-primary), color-mix(in srgb, var(--oppai-primary) 62%, #c58af9));
        box-shadow: 0 8px 22px color-mix(in srgb, var(--oppai-primary) 30%, transparent);
        transition: transform 0.16s var(--oppai-ease-spring), filter 0.16s ease;
      }
      .make:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.06); }
      .make:disabled { opacity: 0.5; cursor: default; box-shadow: none; }
      .make .material-symbols-rounded { font-size: 20px; }
      .make-sub { margin-top: 7px; text-align: center; font-size: 11.5px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }

      /* ── stage ── */
      .main { min-width: 0; min-height: 0; display: flex; flex-direction: column; background: color-mix(in srgb, var(--oppai-bg) 86%, #000); }
      /* Sized as a container so the clip fits whatever room the transport and the
         reel leave it, rather than guessing from the window's height. */
      .stage { position: relative; flex: 1; min-height: 0; display: grid; place-items: center; padding: 18px; overflow: hidden; container-type: size; }
      .player { position: relative; max-width: 100%; max-height: 100%; display: grid; place-items: center; }
      .player video, .player img.still {
        display: block; max-width: 100cqw; max-height: 100cqh; min-height: 160px; border-radius: 14px; background: #000;
        box-shadow: 0 20px 60px rgba(0,0,0,.5); cursor: pointer;
      }
      .waiting {
        position: relative; height: min(100cqh, 640px); max-width: 100cqw; aspect-ratio: 4 / 5; border-radius: 18px; overflow: hidden;
        display: grid; place-items: center; background: var(--oppai-surface); box-shadow: 0 20px 60px rgba(0,0,0,.45);
      }
      .waiting img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(14px) brightness(0.55); transform: scale(1.1); }
      .waiting .ring { position: relative; display: grid; place-items: center; width: 132px; height: 132px; }
      .waiting svg { position: absolute; inset: 0; transform: rotate(-90deg); }
      .waiting circle { fill: none; stroke-width: 6; }
      .waiting .track { stroke: rgba(255,255,255,.14); }
      .waiting .fill { stroke: var(--oppai-primary); stroke-linecap: round; transition: stroke-dashoffset 0.6s ease; }
      .waiting .pct { position: relative; display: flex; flex-direction: column; align-items: center; color: #fff; font-size: 11.5px; gap: 2px; }
      .waiting .pct b { font-size: 28px; font-variant-numeric: tabular-nums; }
      .waiting .what { position: absolute; left: 18px; right: 18px; bottom: 18px; color: rgba(255,255,255,.85); font-size: 12.5px; text-align: center; line-height: 1.45;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .failed { max-width: 420px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; color: var(--oppai-text-dim); font-size: 13px; line-height: 1.5; }
      .failed .material-symbols-rounded { font-size: 36px; color: var(--oppai-error, #f2b8b5); }

      .hero { max-width: 460px; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; color: var(--oppai-text-muted); font-size: 13px; line-height: 1.55; }
      .hero strong { color: var(--oppai-text); font-size: 17px; }
      .hero .glyph {
        width: 76px; height: 76px; border-radius: 24px; display: grid; place-items: center;
        background: color-mix(in srgb, var(--oppai-primary) 16%, var(--oppai-surface)); color: var(--oppai-primary-bright, var(--oppai-primary));
      }
      .hero .glyph .material-symbols-rounded { font-size: 38px; }
      /* A picture waiting to be animated breathes slowly, as a promise of the motion. */
      .hero-frame { width: min(300px, 70vw); border-radius: 18px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.45); }
      .hero-frame img { display: block; width: 100%; animation: vs-breathe 7s ease-in-out infinite alternate; }
      @keyframes vs-breathe { from { transform: scale(1); } to { transform: scale(1.07) translateY(-1.5%); } }
      @media (prefers-reduced-motion: reduce) { .hero-frame img { animation: none; } }
      .steps { display: grid; gap: 8px; text-align: left; width: 100%; margin-top: 4px; }
      .steps div { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 12px; background: var(--oppai-surface); border: 1px solid var(--oppai-border); }
      .steps b { flex: none; width: 22px; height: 22px; border-radius: 11px; display: grid; place-items: center; font-size: 11px; background: var(--oppai-primary-container); color: var(--oppai-text); }

      /* ── transport ── */
      .transport {
        flex: none; display: flex; align-items: center; flex-wrap: wrap; gap: 8px 10px; padding: 10px 16px;
        border-top: 1px solid var(--oppai-border); background: var(--oppai-surface);
      }
      .icon-btn {
        width: 34px; height: 34px; border-radius: 17px; border: none; background: none; color: var(--oppai-text-dim);
        cursor: pointer; display: grid; place-items: center; flex: none;
      }
      .icon-btn:hover:not(:disabled) { background: var(--oppai-surface-2); color: var(--oppai-text); }
      .icon-btn.on { color: var(--oppai-primary-bright, var(--oppai-primary)); background: color-mix(in srgb, var(--oppai-primary) 14%, transparent); }
      .icon-btn:disabled { opacity: 0.4; cursor: default; }
      .scrub { flex: 1 1 180px; min-width: 120px; display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
      .scrub input { flex: 1; accent-color: var(--oppai-primary); }
      .t-sep { width: 1px; height: 22px; background: var(--oppai-border-strong); flex: none; }
      .t-meta { font-size: 11.5px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
      a.chip { text-decoration: none; }

      /* ── reel ── */
      .reel {
        flex: none; display: flex; gap: 10px; padding: 10px 16px 14px; overflow-x: auto; scrollbar-width: thin;
        border-top: 1px solid var(--oppai-border); background: var(--oppai-surface);
      }
      .reel-label { flex: none; writing-mode: vertical-rl; transform: rotate(180deg); align-self: center; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--oppai-text-muted); }
      .take {
        position: relative; flex: none; width: 96px; height: 120px; border-radius: 12px; overflow: hidden; padding: 0; cursor: pointer;
        border: 2px solid transparent; background: var(--oppai-bg); color: #fff;
        animation: oppai-scale-in 0.22s var(--oppai-ease-emphasized) both;
      }
      .take.on { border-color: var(--oppai-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--oppai-primary) 22%, transparent); }
      .take video, .take img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
      .take.running img { filter: blur(3px) brightness(0.55); }
      .take .badge {
        position: absolute; left: 6px; bottom: 6px; display: inline-flex; align-items: center; gap: 3px; padding: 2px 6px; border-radius: 8px;
        background: rgba(0,0,0,.6); font-size: 10.5px; font-weight: 650; font-variant-numeric: tabular-nums;
      }
      .take .badge .material-symbols-rounded { font-size: 13px; }
      .take .badge.saved { background: color-mix(in srgb, #2e7d4f 85%, transparent); }
      .take .badge.err { background: color-mix(in srgb, #b3261e 85%, transparent); }
      .take .mini-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: rgba(255,255,255,.15); }
      .take .mini-bar span { display: block; height: 100%; background: var(--oppai-primary); transition: width 0.6s ease; }
      .take-n { position: absolute; top: 5px; left: 7px; font-size: 10.5px; font-weight: 700; text-shadow: 0 1px 3px rgba(0,0,0,.7); }

      @media (max-width: 900px) {
        :host { display: flex; flex-direction: column; height: auto; }
        .main { order: -1; }
        /* flex: 1 is a basis of 0%, which wins over a height in a column of auto height. */
        .stage { flex: none; height: 56vh; padding: 12px; }
        .inspector { border-right: 0; border-top: 1px solid var(--oppai-border-strong); }
        .ins-scroll { overflow: visible; }
        .ins-foot { position: sticky; bottom: 0; z-index: 4; padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)); box-shadow: 0 -10px 30px rgba(0,0,0,.3); }
        .transport { padding: 8px 10px; }
      }
    `];$e([z({attribute:!1})],he.prototype,"clips",2);$e([z()],he.prototype,"board",2);$e([c()],he.prototype,"negOpen",2);$e([c()],he.prototype,"upscaleOpen",2);$e([c()],he.prototype,"error",2);$e([c()],he.prototype,"dropping",2);$e([c()],he.prototype,"playing",2);$e([c()],he.prototype,"time",2);$e([c()],he.prototype,"duration",2);$e([c()],he.prototype,"grabbing",2);he=$e([ge("oppai-video-studio")],he);async function rs(e,t){var a;const i=o=>{e.done||(e.percent=o,ae())};let s;try{let o;try{o=await t()}catch(n){o=await ns(e.jobId,i,n)}s=o.clip||!o.accepted?o:await ns(e.jobId,i)}catch(o){const n=o.message;e.error=/cancelled/i.test(n)?"Stopped.":n}if(e.done=!0,e.percent=1,e.endedAt=Date.now(),s!=null&&s.clip?e.clip=s.clip:e.error||(e.error="ComfyUI finished without a clip."),ae(),(a=s==null?void 0:s.clip)!=null&&a.gallery)for(const o of vi)o()}function pr(e){return e.split(/[\\/]/).pop().replace(/\.(safetensors|gguf|ckpt|pt)$/i,"")||"the low-noise model"}const dr=2*6e4;async function ns(e,t,i){if((i==null?void 0:i.name)==="AbortError")throw i;const s=Date.now()+20*6e4;let a=!1,o=Date.now();for(;Date.now()<s;){let n;try{n=await m.genProgress(e,-1),a=!0,o=Date.now()}catch(l){const p=l.message;if(/no such generation/i.test(p))throw!a&&i?i:new Error(a?"The server restarted while the clip was being made and lost track of it. If ComfyUI finished it, it isn't in the gallery — make it again.":"The server never started the clip.");if(Date.now()-o>dr)throw new Error(`Lost touch with the server while the clip was being made (${p}). If it finishes, it lands in the gallery.`)}if(n!=null&&n.done){if(n.result)return n.result;throw new Error(n.error||(i==null?void 0:i.message)||"ComfyUI finished without a clip.")}n&&t(n.percent),await new Promise(l=>setTimeout(l,2500))}throw new Error("The clip ran past twenty minutes without finishing. If it does finish, it lands in the gallery.")}async function cr(e){const t=await fetch(e,{credentials:"same-origin"}).catch(()=>{throw new Error("Couldn't read the picture to start from any more — pick it again.")});if(!t.ok)throw new Error("Couldn't read the picture — a result on the canvas expires after a while; pick it again.");const i=await hr(await t.blob());return new Promise((s,a)=>{const o=new FileReader;o.onload=()=>s(String(o.result)),o.onerror=()=>a(new Error("couldn't read the picture")),o.readAsDataURL(i)})}async function hr(e){let t;try{t=await createImageBitmap(e)}catch{return e}const i=Qo(t.width,t.height);if(!i.shrunk)return t.close(),e;const s=document.createElement("canvas");s.width=i.width,s.height=i.height;const a=s.getContext("2d");if(!a)return e;a.imageSmoothingQuality="high",a.drawImage(t,0,0,i.width,i.height),t.close();const o=e.type==="image/jpeg"||e.type==="image/webp";return await new Promise(l=>s.toBlob(l,o?"image/jpeg":"image/png",.92))??e}const ur=60;function ls(e,t,i=ur){const s=new Set(t.map(a=>a.id));return[...t,...e.filter(a=>!s.has(a.id))].slice(0,Math.max(0,i))}function mr(e,t,i){let s=!1;const a=e.map(o=>o.id!==t?o:(s=!0,{...o,...i}));return s?a:e}function Ht(e,t,i){if(!e.length)return null;const s=e.findIndex(a=>a.id===t);return s<0?e[0].id:e[Math.min(e.length-1,Math.max(0,s+i))].id}function gr(e,t,i){const s=[...e];if(t<0||t>=s.length)return s;const[a]=s.splice(t,1);return s.splice(Math.min(s.length,Math.max(0,i)),0,a),s}const aa="oppai.studio.prompts.v1",oa=20;function fr(e,t,i=oa){const s=t.prompt.trim();if(!s)return e;const a=t.negative.trim(),o=e.filter(n=>n.prompt.trim()!==s||n.negative.trim()!==a);return[{prompt:s,negative:a,at:t.at},...o].slice(0,i)}function br(){try{const e=JSON.parse(localStorage.getItem(aa)??"[]");return Array.isArray(e)?e.filter(t=>!!t&&typeof t=="object"&&typeof t.prompt=="string"&&typeof t.negative=="string"&&typeof t.at=="number").slice(0,oa):[]}catch{return[]}}function vr(e){try{localStorage.setItem(aa,JSON.stringify(e))}catch{}}const ra="oppai.studio.layout.v1",Qe={inspector:!0,gallery:!0,mode:"image",tab:"models"};function bt(){try{const e=JSON.parse(localStorage.getItem(ra)??"null");return!e||typeof e!="object"?{...Qe}:{inspector:typeof e.inspector=="boolean"?e.inspector:Qe.inspector,gallery:typeof e.gallery=="boolean"?e.gallery:Qe.gallery,mode:e.mode==="video"?"video":"image",tab:typeof e.tab=="string"?e.tab:Qe.tab}}catch{return{...Qe}}}function ps(e){try{localStorage.setItem(ra,JSON.stringify(e))}catch{}}const xr=[{id:"all",label:"All"},{id:"missing",label:"Missing"},{id:"review",label:"To review"},{id:"stale",label:"Stale"}];function na(e,t){switch(e){case"all":return!0;case"missing":return t==="none";case"review":return t==="needs";case"stale":return t==="stale"}}function yr(e){const t={all:e.length,missing:0,review:0,stale:0};for(const i of e)for(const s of["missing","review","stale"])na(s,i)&&t[s]++;return t}function wr(e,t,i,s,a){const o=n=>Math.min(a-1,Math.max(0,n));switch(i){case"ArrowUp":return{face:e,tier:o(t-1)};case"ArrowDown":return{face:e,tier:o(t+1)};case"ArrowLeft":return e>0?{face:e-1,tier:t}:t>0?{face:s-1,tier:t-1}:{face:e,tier:t};case"ArrowRight":return e<s-1?{face:e+1,tier:t}:t<a-1?{face:0,tier:t+1}:{face:e,tier:t}}}function $r(e,t){for(let i=1;i<=e.length;i++){const s=(t+i)%e.length;if(e[s])return s}return-1}const kr={neutral:"Okay. What are we looking at today?",happy:"That's honestly the best thing I've heard all day.",mischievous:"I have an idea, and you're not going to like it. Probably.",surprised:"Wait — you did what?",thinking:"Hmm. Give me a second with that one.",shy:"You don't have to keep looking at me like that…",smug:"Told you so. I always tell you so.",sad:"Oh. I thought you'd stay a bit longer.",annoyed:"Really? That's the third time.",sleepy:"Mm… five more minutes. Then I'm all yours.",loving:"I'm really glad it's you I get to talk to.",excited:"Okay okay okay — show me. Show me right now!"};function Sr(e,t){return kr[e]??`*${t.toLowerCase()}* …don't mind me.`}const wi=[{label:"Portrait",hint:"512×768",w:512,h:768},{label:"Square",hint:"512×512",w:512,h:512},{label:"Landscape",hint:"768×512",w:768,h:512},{label:"Tall",hint:"640×960",w:640,h:960},{label:"XL Portrait",hint:"832×1216",w:832,h:1216},{label:"XL Square",hint:"1024×1024",w:1024,h:1024},{label:"XL Landscape",hint:"1216×832",w:1216,h:832}],la=[{id:"",label:"Default (Euler a)"},...[["ddim","DDIM"],["ddpm","DDPM"],["deis","DEIS"],["deis_k","DEIS Karras"],["dpmpp_2s","DPM++ 2S"],["dpmpp_2s_k","DPM++ 2S Karras"],["dpmpp_2m","DPM++ 2M"],["dpmpp_2m_k","DPM++ 2M Karras"],["dpmpp_2m_sde","DPM++ 2M SDE"],["dpmpp_2m_sde_k","DPM++ 2M SDE Karras"],["dpmpp_3m","DPM++ 3M"],["dpmpp_3m_k","DPM++ 3M Karras"],["dpmpp_sde","DPM++ SDE"],["dpmpp_sde_k","DPM++ SDE Karras"],["er_sde","ER-SDE"],["euler","Euler"],["euler_k","Euler Karras"],["euler_a","Euler Ancestral"],["heun","Heun"],["heun_k","Heun Karras"],["kdpm_2","KDPM 2"],["kdpm_2_k","KDPM 2 Karras"],["kdpm_2_a","KDPM 2 Ancestral"],["kdpm_2_a_k","KDPM 2 Ancestral Karras"],["lcm","LCM"],["lms","LMS"],["lms_k","LMS Karras"],["pndm","PNDM"],["tcd","TCD"],["unipc","UniPC"],["unipc_k","UniPC Karras"]].map(([e,t])=>({id:e,label:t}))],Cr=re`
  /* ── the frame ─────────────────────────────────────────────────────────── */
  :host { height: 100%; min-height: 0; overflow: hidden; }
  .wrap { width: 100%; max-width: none; height: 100%; min-height: 0; margin: 0; padding: 0; overflow: hidden; }
  .studio { height: 100%; min-height: 0; display: flex; flex-direction: column; background: var(--oppai-bg); }
  .workspace { flex: 1; min-height: 0; display: flex; flex-direction: column; background: var(--oppai-bg); }
  .status-dot {
    flex: none; width: 7px; height: 7px; border-radius: 50%; background: #6fcf8a;
    box-shadow: 0 0 0 3px color-mix(in srgb, #6fcf8a 20%, transparent);
  }
  .status-dot.off { background: var(--oppai-text-muted); box-shadow: none; }
  .toolbar-spacer { flex: 1; }
  /* Tinted from the text colour rather than a surface token, so a secondary button is
     visible on the panel, the dialog and the stage alike. */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--oppai-border-strong);
    background: color-mix(in srgb, var(--oppai-text) 6%, transparent); transition: background 0.12s ease, border-color 0.12s ease;
  }
  .btn:hover:not(:disabled) { background: color-mix(in srgb, var(--oppai-text) 11%, transparent); }
  .btn.primary { border-color: transparent; background: linear-gradient(135deg, var(--oppai-primary), color-mix(in srgb, var(--oppai-primary) 70%, #c58af9)); }
  .btn.primary:hover:not(:disabled) { background: linear-gradient(135deg, var(--oppai-primary), color-mix(in srgb, var(--oppai-primary) 70%, #c58af9)); filter: brightness(1.07); }
  .btn.danger { color: var(--oppai-error, #f2b8b5); }
  .toast { bottom: auto; top: 142px; }
  .icon-btn {
    width: 32px; height: 32px; border-radius: 16px; border: none; background: none; color: var(--oppai-text-muted);
    display: grid; place-items: center; cursor: pointer; flex: none;
  }
  .icon-btn:hover:not(:disabled) { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .icon-btn .material-symbols-rounded { font-size: 18px; }

  /* ── the header ── */
  .studio-head {
    position: relative; z-index: 20; flex: 0 0 auto; height: 58px; display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; box-sizing: border-box; background: var(--oppai-surface); border-bottom: 1px solid var(--oppai-border-strong);
  }
  .mode-switch { display: inline-flex; gap: 2px; padding: 3px; border-radius: 14px; background: var(--oppai-bg); border: 1px solid var(--oppai-border); flex: none; }
  .mode {
    position: relative; display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 14px 0 11px; border: none;
    border-radius: 11px; background: transparent; color: var(--oppai-text-muted); font: inherit; font-size: 13px; font-weight: 650; cursor: pointer;
    transition: background 0.18s var(--oppai-ease-emphasized), color 0.15s ease;
  }
  .mode .material-symbols-rounded { font-size: 19px; }
  .mode:hover { color: var(--oppai-text); }
  .mode.on {
    background: linear-gradient(135deg, var(--oppai-primary), color-mix(in srgb, var(--oppai-primary) 70%, #c58af9));
    color: var(--oppai-on-primary); box-shadow: 0 4px 14px color-mix(in srgb, var(--oppai-primary) 28%, transparent);
  }
  .mode-badge {
    min-width: 17px; height: 17px; padding: 0 5px; box-sizing: border-box; border-radius: 9px; font-size: 10px; font-weight: 800; line-height: 17px;
    text-align: center; background: var(--oppai-primary); color: var(--oppai-on-primary);
  }
  .mode.on .mode-badge { background: var(--oppai-on-primary); color: var(--oppai-primary); }
  .mode-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--oppai-primary); animation: studio-pulse 1.2s ease-in-out infinite; }
  .mode.on .mode-dot { background: var(--oppai-on-primary); }
  @keyframes studio-pulse { 50% { opacity: 0.35; transform: scale(0.8); } }
  .sub-switch { display: inline-flex; gap: 2px; margin-left: 6px; flex: none; }
  .sub-switch button {
    display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1px solid transparent; border-radius: 10px;
    background: transparent; color: var(--oppai-text-muted); font: inherit; font-size: 12.5px; font-weight: 650; cursor: pointer;
  }
  .sub-switch button .material-symbols-rounded { font-size: 17px; }
  .sub-switch button:hover { color: var(--oppai-text); }
  .sub-switch button.on { background: var(--oppai-surface-2); border-color: var(--oppai-border-strong); color: var(--oppai-text); }
  .sub-note { font-weight: 500; color: var(--oppai-text-muted); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sub-note::before { content: "· "; }
  .head-spacer { flex: 1; min-width: 4px; }
  .gen-pill {
    min-width: 0; max-width: 300px; height: 40px; display: inline-flex; align-items: center; gap: 9px; padding: 3px 10px 3px 3px; flex: 0 1 auto;
    border: 1px solid var(--oppai-border-strong); border-radius: 12px; background: var(--oppai-bg); color: var(--oppai-text);
    font: inherit; text-align: left; cursor: pointer; transition: border-color 0.15s ease;
  }
  .gen-pill:not(.static):hover { border-color: var(--oppai-primary); }
  .gen-pill.static { cursor: default; }
  .gen-pill img, .gen-icon {
    flex: 0 0 32px; width: 32px; height: 32px; border-radius: 9px; object-fit: cover; display: grid; place-items: center;
    background: var(--oppai-surface-2); color: var(--oppai-text-muted);
  }
  .gen-icon .material-symbols-rounded { font-size: 18px; }
  .gen-text { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .gen-kicker { display: flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.55px; text-transform: uppercase; color: var(--oppai-text-muted); white-space: nowrap; }
  .gen-kicker .status-dot { width: 6px; height: 6px; box-shadow: none; }
  .gen-name { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gen-caret { color: var(--oppai-text-muted); font-size: 18px; flex: none; }
  .head-btn {
    position: relative; height: 36px; display: inline-flex; align-items: center; gap: 6px; padding: 0 12px; flex: none;
    border: 1px solid var(--oppai-border-strong); border-radius: 10px; background: transparent; color: var(--oppai-text-dim);
    font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
  }
  .head-btn .material-symbols-rounded { font-size: 18px; }
  .head-btn:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .head-btn.lit { border-color: color-mix(in srgb, var(--oppai-primary) 60%, transparent); color: var(--oppai-text); }
  .head-count {
    min-width: 18px; height: 18px; padding: 0 5px; box-sizing: border-box; border-radius: 9px; background: var(--oppai-primary);
    color: var(--oppai-on-primary); font-size: 10.5px; font-weight: 800; line-height: 18px; text-align: center;
  }
  .head-sep { width: 1px; height: 24px; background: var(--oppai-border-strong); margin: 0 2px; flex: none; }
  .head-icon {
    width: 36px; height: 36px; border-radius: 10px; border: none; background: transparent; color: var(--oppai-text-muted);
    display: grid; place-items: center; cursor: pointer; flex: none;
  }
  .head-icon:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .head-icon.on { color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .head-icon .material-symbols-rounded { font-size: 20px; }

  /* Popovers off the header and the composer. */
  .pop {
    position: absolute; z-index: 40; width: min(440px, calc(100vw - 24px)); max-height: min(460px, 70vh); display: flex; flex-direction: column;
    border: 1px solid var(--oppai-border-strong); border-radius: 16px; background: var(--oppai-surface-2);
    box-shadow: 0 22px 60px rgba(0,0,0,.5); animation: oppai-scale-in 0.16s var(--oppai-ease-emphasized) both; overflow: hidden;
  }
  .queue-pop { top: calc(100% + 6px); right: 12px; transform-origin: top right; }
  .prompts-pop { left: 0; bottom: calc(100% + 8px); transform-origin: bottom left; width: min(560px, 100%); }
  .pop-head {
    display: flex; align-items: center; gap: 8px; padding: 12px 10px 12px 14px; border-bottom: 1px solid var(--oppai-border);
    font-size: 13px; font-weight: 700;
  }
  .pop-head > .material-symbols-rounded { font-size: 18px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .pop-note { margin-left: auto; font-size: 11.5px; font-weight: 500; color: var(--oppai-text-muted); }
  .pop-x { width: 28px; height: 28px; border-radius: 14px; border: none; background: none; color: var(--oppai-text-muted); display: grid; place-items: center; cursor: pointer; }
  .pop-x:hover { background: var(--oppai-surface); color: var(--oppai-text); }
  .pop-x .material-symbols-rounded { font-size: 17px; }
  .pop-empty { margin: 0; padding: 18px 16px; font-size: 12.5px; line-height: 1.55; color: var(--oppai-text-muted); }
  .queue-list { list-style: none; margin: 0; padding: 6px; overflow-y: auto; }
  .queue-list li { display: flex; align-items: center; gap: 6px; padding: 8px 6px 8px 8px; border-radius: 10px; }
  .queue-list li:hover { background: var(--oppai-surface); }
  .q-n {
    flex: none; width: 22px; height: 22px; border-radius: 11px; display: grid; place-items: center; font-size: 11px; font-weight: 800;
    background: var(--oppai-primary-container); color: var(--oppai-text);
  }
  .q-what { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .q-what small { font-size: 11px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
  .q-btn { flex: none; width: 28px; height: 28px; border-radius: 8px; border: none; background: none; color: var(--oppai-text-muted); display: grid; place-items: center; cursor: pointer; }
  .q-btn:hover:not(:disabled) { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .q-btn:disabled { opacity: 0.3; cursor: default; }
  .q-btn .material-symbols-rounded { font-size: 17px; }
  .recent-list { overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 2px; }
  .recent-row {
    display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 10px; padding: 9px 10px; border: none; border-radius: 10px;
    background: transparent; color: var(--oppai-text); font: inherit; text-align: left; cursor: pointer;
  }
  .recent-row:hover { background: color-mix(in srgb, var(--oppai-primary) 14%, transparent); }
  .recent-text { font-size: 12.5px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .recent-when { grid-column: 2; grid-row: 1; font-size: 11px; color: var(--oppai-text-muted); white-space: nowrap; }
  .recent-neg { grid-column: 1; font-size: 11px; color: color-mix(in srgb, var(--oppai-error, #f2b8b5) 80%, var(--oppai-text-muted)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* The shortcuts sheet. */
  .dialog.shortcuts { width: min(480px, 100%); }
  .dialog.shortcuts h3 { display: flex; align-items: center; gap: 8px; }
  .keys { display: grid; gap: 4px; }
  .key-row { display: flex; align-items: center; gap: 12px; padding: 6px 4px; font-size: 13px; color: var(--oppai-text-dim); border-bottom: 1px solid var(--oppai-border); }
  .key-caps { flex: 0 0 150px; display: flex; gap: 4px; flex-wrap: wrap; }
  kbd {
    min-width: 22px; padding: 2px 7px; box-sizing: border-box; border-radius: 6px; border: 1px solid var(--oppai-border-strong);
    border-bottom-width: 2px; background: var(--oppai-surface); color: var(--oppai-text); font: 600 11.5px/1.4 ui-monospace, Consolas, monospace; text-align: center;
  }

  /* ── the Image and Video studios ───────────────────────────────────────── */
  .create-shell { flex: 1; min-height: 0; display: grid; grid-template-columns: 72px minmax(0, 1fr); background: var(--oppai-bg); }
  .create-shell.drawer-open { grid-template-columns: 72px 340px minmax(0, 1fr); }
  .create-shell.with-gallery { grid-template-columns: 72px minmax(0, 1fr) 320px; }
  .create-shell.drawer-open.with-gallery { grid-template-columns: 72px 340px minmax(0, 1fr) 320px; }
  .create-shell.video { grid-template-columns: minmax(0, 1fr); }
  .create-shell.video.with-gallery { grid-template-columns: minmax(0, 1fr) 320px; }
  .create-shell > oppai-video-studio { min-width: 0; min-height: 0; }
  .create-gallery.stowed { display: none; }
  .drawer-scrim { display: none; }
  .right { min-width: 0; min-height: 0; background: var(--oppai-surface); border-left: 1px solid var(--oppai-border-strong); overflow: hidden; }

  /* The rail. */
  .create-rail {
    display: flex; flex-direction: column; gap: 4px; padding: 10px 6px; background: var(--oppai-surface);
    border-right: 1px solid var(--oppai-border-strong); overflow-y: auto; scrollbar-width: none;
  }
  .rail-tab {
    position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 4px 0 6px; border: 0;
    background: transparent; color: var(--oppai-text-muted); font: inherit; font-size: 10.5px; font-weight: 650; cursor: pointer;
  }
  .rail-icon {
    width: 48px; height: 32px; display: grid; place-items: center; border-radius: 12px; font-size: 21px;
    transition: background 0.2s var(--oppai-ease-emphasized), color 0.2s ease;
  }
  .rail-tab:hover { color: var(--oppai-text); }
  .rail-tab:hover .rail-icon { background: var(--oppai-surface-2); }
  .rail-tab.on { color: var(--oppai-text); }
  .rail-tab.on .rail-icon { background: var(--oppai-primary-container); color: var(--oppai-on-primary-container, var(--oppai-text)); }
  .rail-badge {
    position: absolute; top: 0; right: 6px; min-width: 16px; height: 16px; padding: 0 4px; box-sizing: border-box; border-radius: 8px;
    background: var(--oppai-primary); color: var(--oppai-on-primary); font-size: 9.5px; font-weight: 800; line-height: 16px; text-align: center;
  }

  /* The inspector, docked beside the stage. */
  .create-drawer {
    min-width: 0; min-height: 0; display: flex; flex-direction: column; background: var(--oppai-surface);
    border-right: 1px solid var(--oppai-border-strong); animation: studio-drawer-in 0.22s var(--oppai-ease-emphasized) both;
  }
  @keyframes studio-drawer-in { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: none; } }
  .drawer-head {
    height: 50px; flex: 0 0 50px; display: flex; align-items: center; gap: 9px; padding: 0 8px 0 16px; box-sizing: border-box;
    font-size: 14.5px; font-weight: 700; border-bottom: 1px solid var(--oppai-border);
  }
  .drawer-head > .material-symbols-rounded { font-size: 19px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .drawer-action { width: 34px; height: 34px; border-radius: 17px; border: 0; background: transparent; color: var(--oppai-text-muted); display: grid; place-items: center; cursor: pointer; }
  .drawer-action:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .drawer-action .material-symbols-rounded { font-size: 19px; }
  .drawer-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; padding: 14px 14px 24px; }
  .pane { margin-bottom: 18px; }
  .pane-title {
    display: flex; align-items: center; gap: 8px; margin: 4px 0 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.7px;
    text-transform: uppercase; color: var(--oppai-text-muted);
  }
  .pane-title::after { content: ""; flex: 1; height: 1px; background: var(--oppai-border); order: 2; }
  .pane-count { order: 3; font-weight: 600; letter-spacing: 0; text-transform: none; font-variant-numeric: tabular-nums; }
  .picker-search { position: relative; display: block; margin-bottom: 14px; }
  .picker-search input {
    width: 100%; height: 38px; box-sizing: border-box; padding: 0 14px 0 36px; border: 1px solid var(--oppai-border-strong);
    border-radius: 19px; background: var(--oppai-bg); color: var(--oppai-text); font: inherit; font-size: 13px; outline: none;
  }
  .picker-search input:focus { border-color: var(--oppai-primary); }
  .picker-search .material-symbols-rounded { position: absolute; left: 11px; top: 9px; font-size: 20px; color: var(--oppai-text-muted); pointer-events: none; }
  /* Cover cards, two up: a checkpoint or a LoRA is recognised by its picture long
     before its file name. */
  .create-drawer .cards, .sprite-inspector .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .create-drawer .card, .sprite-inspector .card {
    display: block; border: 2px solid transparent; border-radius: 14px; background: var(--oppai-bg); box-shadow: 0 2px 10px rgba(0,0,0,.16);
  }
  .create-drawer .card:hover, .sprite-inspector .card:hover { transform: translateY(-2px); border-color: var(--oppai-border-strong); }
  .create-drawer .card.on, .sprite-inspector .card.on {
    border-color: var(--oppai-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--oppai-primary) 22%, transparent);
  }
  .create-drawer .card-art, .create-drawer .card-blank, .sprite-inspector .card-art, .sprite-inspector .card-blank { width: 100%; height: auto; aspect-ratio: 3 / 4; }
  .create-drawer .card-name, .sprite-inspector .card-name { padding: 7px 9px 8px; font-size: 12px; font-weight: 600; }
  .sprite-inspector .sec-models .cards { grid-template-columns: 1fr; gap: 6px; }
  .sprite-inspector .sec-models .card { display: grid; grid-template-columns: 46px minmax(0, 1fr); align-items: center; border-width: 1px; border-color: var(--oppai-border); border-radius: 10px; }
  .sprite-inspector .sec-models .card-art, .sprite-inspector .sec-models .card-blank { width: 46px; height: 46px; aspect-ratio: 1; }
  .sprite-inspector .sec-models .card-blank .material-symbols-rounded { font-size: 22px !important; }
  .sprite-inspector .sec-models .card:hover { transform: none; }
  .sprite-inspector .sec-models .card.on { border-color: var(--oppai-primary); background: color-mix(in srgb, var(--oppai-primary-container) 45%, var(--oppai-bg)); box-shadow: none; }
  .manage-note {
    display: flex; gap: 9px; margin-top: 14px; padding: 11px 12px; border-radius: 12px; font-size: 12px; line-height: 1.5; color: var(--oppai-text-dim);
    background: color-mix(in srgb, var(--oppai-primary) 10%, var(--oppai-surface)); border: 1px solid color-mix(in srgb, var(--oppai-primary) 30%, transparent);
  }
  .manage-note .material-symbols-rounded { font-size: 18px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .restart-pane { display: flex; align-items: center; gap: 12px; font-size: 12.5px; line-height: 1.45; color: var(--oppai-text-dim); }
  .restart-pane > span { flex: 1; }
  .restart-pane .chip { flex: none; display: inline-flex; align-items: center; gap: 5px; }
  .restart-pane .chip .material-symbols-rounded { font-size: 17px; }
  .custom-passes, .people { display: flex; flex-direction: column; gap: 8px; }
  .pass-card {
    display: flex; flex-direction: column; gap: 6px; padding: 9px; border-radius: 12px;
    border: 1px solid var(--oppai-border); background: color-mix(in srgb, var(--oppai-surface-2) 60%, transparent);
  }
  .pass-row { display: flex; gap: 6px; align-items: center; }
  .pass-row select { flex: 1; min-width: 0; }
  .pass-row .lora-weight { width: 84px; flex: none; }
  .pass-row .lora-weight.share { width: 58px; }
  .pass-remove { flex: none; width: 30px; height: 30px; display: grid; place-items: center; border-radius: 8px; border: none; background: none; color: var(--oppai-text-dim); cursor: pointer; }
  .pass-remove:hover:not(:disabled) { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .pass-remove:disabled { opacity: 0.35; cursor: default; }
  .pass-remove .material-symbols-rounded { font-size: 18px; }
  .person-n { width: 18px; text-align: center; color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .people-layout { display: flex; height: 54px; gap: 3px; border-radius: 10px; overflow: hidden; border: 1px solid var(--oppai-border); }
  .people-layout.rows { flex-direction: column; height: 84px; }
  .people-layout span {
    display: grid; place-items: center; font-size: 12px; font-weight: 600; color: var(--oppai-text-dim);
    background: color-mix(in srgb, var(--oppai-primary) 14%, var(--oppai-surface));
  }
  .people-strip {
    display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 14px;
    border: 1px solid var(--oppai-border); background: color-mix(in srgb, var(--oppai-primary) 5%, transparent);
  }
  .people-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .people-head .people-layout { width: 64px; height: 40px; flex: none; }
  .people-head .people-layout.rows { height: 48px; width: 48px; }
  .people-hint { font-size: 12px; color: var(--oppai-text-dim); flex: 1; min-width: 200px; line-height: 1.4; }
  .people-grid { display: grid; grid-template-columns: repeat(var(--people, 2), minmax(0, 1fr)); gap: 8px; }
  .person-words { resize: vertical; min-height: 44px; font: inherit; font-size: 13px; line-height: 1.35; }
  .people-advice { display: flex; flex-direction: column; gap: 6px; }
  .advice-row {
    display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 10px; font-size: 12px; line-height: 1.4; color: var(--oppai-text-dim);
    background: color-mix(in srgb, var(--oppai-accent) 12%, var(--oppai-surface)); border: 1px solid color-mix(in srgb, var(--oppai-accent) 35%, transparent);
  }
  .advice-row > span:nth-child(2) { flex: 1; min-width: 0; }
  .advice-row b { color: var(--oppai-text); }
  .advice-row > .material-symbols-rounded { font-size: 18px; color: var(--oppai-accent); }
  .advice-row .chip { flex: none; }
  .people-seg { flex: none; align-items: center; }
  .people-cycle {
    display: none; align-items: center; gap: 4px; flex: none; height: 38px; padding: 0 12px; border: 1px solid var(--oppai-border-strong);
    border-radius: 999px; background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
  }
  .people-cycle .material-symbols-rounded { font-size: 18px; }
  .people-cycle.on { background: var(--oppai-primary-container); color: var(--oppai-text); border-color: transparent; }
  .people-seg > .material-symbols-rounded { font-size: 17px; color: var(--oppai-text-dim); padding: 0 4px 0 6px; }

  /* The stage column. */
  .create-stage { min-width: 0; min-height: 0; display: flex; flex-direction: column; background: color-mix(in srgb, var(--oppai-bg) 84%, #000); }
  .recipe {
    flex: 0 0 auto; display: flex; align-items: center; min-width: 0; padding: 8px 12px;
    background: color-mix(in srgb, var(--oppai-surface) 70%, transparent); border-bottom: 1px solid var(--oppai-border);
  }
  .recipe-chips { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 1px 0; }
  .recipe-sep { flex: none; width: 1px; height: 20px; background: var(--oppai-border-strong); margin: 0 2px; }
  .recipe-chip {
    flex: 0 0 auto; height: 30px; display: inline-flex; align-items: center; gap: 6px; padding: 0 11px; border: 1px solid var(--oppai-border-strong);
    border-radius: 15px; background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 12px; font-variant-numeric: tabular-nums;
    white-space: nowrap; cursor: pointer;
  }
  .recipe-chip .material-symbols-rounded { font-size: 16px; }
  .recipe-chip:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .recipe-chip.on { border-color: color-mix(in srgb, var(--oppai-primary) 70%, transparent); color: var(--oppai-text); }
  .recipe-chip.add { border-style: dashed; }
  .recipe-chip.lora { padding: 0; gap: 0; border-color: color-mix(in srgb, var(--oppai-primary) 50%, transparent); background: color-mix(in srgb, var(--oppai-primary) 14%, transparent); color: var(--oppai-text); }
  .recipe-chip-main, .recipe-chip-x { height: 100%; display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
  .recipe-chip-main { padding: 0 4px 0 10px; }
  .recipe-chip-main b { font-weight: 700; opacity: 0.75; }
  .recipe-chip-x { padding: 0 8px 0 3px; opacity: 0.65; }
  .recipe-chip-x:hover { opacity: 1; }

  .canvas-wrap { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .canvas-stage {
    position: relative; flex: 1; min-height: 240px; overflow: auto; display: grid; place-items: center; padding: 18px; box-sizing: border-box;
    background-image: radial-gradient(color-mix(in srgb, var(--oppai-border-strong) 55%, transparent) 1px, transparent 1px);
    background-size: 22px 22px;
  }
  .viewer-stage { overflow: hidden; container-type: size; }
  .viewer-stage.drop::after {
    content: "Drop to start the next picture from it"; position: absolute; inset: 12px; z-index: 9; display: grid; place-items: center;
    border: 2px dashed var(--oppai-primary); border-radius: 18px; background: color-mix(in srgb, var(--oppai-primary) 12%, transparent);
    color: var(--oppai-text); font-size: 14px; font-weight: 650; pointer-events: none;
  }
  .canvas-stage > .banner {
    position: absolute; top: 10px; left: 50%; z-index: 4; transform: translateX(-50%); margin: 0; max-width: min(560px, 90%); background: var(--oppai-surface-2);
  }
  .canvas-empty {
    width: min(420px, 88%); min-height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
    border: 1px dashed var(--oppai-border-strong); border-radius: 18px; background: color-mix(in srgb, var(--oppai-surface) 78%, transparent);
    color: var(--oppai-text-muted); text-align: center; padding: 28px; box-sizing: border-box; place-self: center;
  }
  .canvas-empty .material-symbols-rounded { font-size: 36px; }
  .canvas-empty strong { color: var(--oppai-text-dim); font-size: 14px; }
  .canvas-empty > span:last-child { max-width: 300px; font-size: 12px; line-height: 1.5; }
  .canvas-empty.welcome { width: min(480px, 92%); border-style: solid; border-color: var(--oppai-border); gap: 10px; padding: 30px 26px; }
  .canvas-empty.welcome strong { font-size: 18px; color: var(--oppai-text); }
  .welcome-glyph {
    width: 64px; height: 64px; border-radius: 20px; display: grid; place-items: center; margin-bottom: 2px;
    background: linear-gradient(135deg, color-mix(in srgb, var(--oppai-primary) 26%, var(--oppai-surface)), color-mix(in srgb, #c58af9 18%, var(--oppai-surface)));
    color: var(--oppai-primary-bright, var(--oppai-primary));
  }
  .canvas-empty .welcome-glyph .material-symbols-rounded { font-size: 32px; }
  .welcome-tips { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; width: 100%; }
  .welcome-tips > span {
    display: flex; align-items: center; gap: 9px; padding: 8px 12px; border-radius: 10px; background: var(--oppai-bg); font-size: 12px; color: var(--oppai-text-dim); text-align: left;
  }
  .canvas-empty .welcome-tips .material-symbols-rounded { font-size: 17px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .welcome-recent { width: 100%; display: flex; flex-direction: column; gap: 4px; margin-top: 8px; text-align: left; }
  .welcome-k { font-size: 10.5px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--oppai-text-muted); margin-bottom: 2px; }
  .recent-line {
    display: flex; align-items: center; gap: 8px; padding: 7px 10px; border: 1px solid var(--oppai-border); border-radius: 10px;
    background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 12px; text-align: left; cursor: pointer; min-width: 0;
  }
  .recent-line span:last-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .recent-line:hover { border-color: var(--oppai-primary); color: var(--oppai-text); }
  .canvas-empty .recent-line .material-symbols-rounded { font-size: 16px; }

  /* The viewer: one picture, fitted to the stage, its tools floating under it. */
  .viewer { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
  .view-frame { position: relative; margin: 0; display: grid; place-items: center; min-height: 0; }
  .view-img {
    display: block; max-width: calc(100cqw - 104px); max-height: calc(100cqh - 74px); min-width: 120px; border-radius: 12px; object-fit: contain;
    background: #000; box-shadow: 0 22px 70px rgba(0,0,0,.55); cursor: zoom-in; animation: oppai-fade-in 0.2s ease both;
  }
  .view-cap {
    position: absolute; left: 10px; top: 10px; display: flex; flex-wrap: wrap; gap: 6px; pointer-events: none;
  }
  .view-cap > span {
    display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 8px; background: rgba(0,0,0,.55); backdrop-filter: blur(6px);
    color: #fff; font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums;
  }
  .view-cap .material-symbols-rounded { font-size: 13px; }
  .view-cap .cap-saved { background: color-mix(in srgb, #2e7d4f 85%, transparent); }
  .view-nav {
    position: absolute; top: 50%; z-index: 2; width: 40px; height: 64px; margin-top: -38px; border-radius: 14px; border: 1px solid var(--oppai-border);
    background: color-mix(in srgb, var(--oppai-surface) 80%, transparent); backdrop-filter: blur(8px); color: var(--oppai-text);
    display: grid; place-items: center; cursor: pointer; transition: opacity 0.15s ease;
  }
  .view-nav.prev { left: 6px; }
  .view-nav.next { right: 6px; }
  .view-nav:disabled { opacity: 0.2; cursor: default; }
  .view-nav .material-symbols-rounded { font-size: 26px; }
  .view-bar {
    flex: none; display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: 16px; border: 1px solid var(--oppai-border-strong);
    background: color-mix(in srgb, var(--oppai-surface-2) 88%, transparent); backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,.35);
    max-width: calc(100% - 24px); overflow-x: auto; scrollbar-width: none;
  }
  .vb {
    flex: none; height: 36px; min-width: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 8px;
    border: none; border-radius: 12px; background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 12.5px; font-weight: 650; cursor: pointer;
  }
  .vb:hover:not(:disabled) { background: var(--oppai-surface); color: var(--oppai-text); }
  .vb.on { background: color-mix(in srgb, var(--oppai-primary) 18%, transparent); color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .vb .material-symbols-rounded { font-size: 19px; }
  .vb.save { padding: 0 14px 0 11px; background: var(--oppai-primary); color: var(--oppai-on-primary); }
  .vb.save:hover:not(:disabled) { background: var(--oppai-primary); filter: brightness(1.08); color: var(--oppai-on-primary); }
  .vb.save.done { background: color-mix(in srgb, #2e7d4f 70%, var(--oppai-surface)); color: #fff; opacity: 1; cursor: default; }
  .vb-sep { flex: none; width: 1px; height: 20px; background: var(--oppai-border-strong); margin: 0 3px; }
  .vb-note { padding: 0 8px; font-size: 12px; color: var(--oppai-text-muted); white-space: nowrap; }
  .view-info { position: absolute; right: 12px; top: 12px; z-index: 5; width: min(420px, calc(100% - 24px)); animation: oppai-fade-in-up 0.18s ease both; }
  .view-info .geninfo { margin: 0; border: 1px solid var(--oppai-border-strong); box-shadow: 0 16px 40px rgba(0,0,0,.45); }

  /* Compare: picture B under picture A, A clipped at the divider. */
  .cmp-frame { cursor: ew-resize; touch-action: none; user-select: none; }
  .cmp-frame > .view-img { grid-area: 1 / 1; cursor: ew-resize; animation: none; }
  .cmp-a { clip-path: inset(0 calc(100% - var(--split, 50%)) 0 0); box-shadow: none; }
  .cmp-line { position: absolute; top: 0; bottom: 0; left: var(--split, 50%); width: 2px; margin-left: -1px; background: #fff; box-shadow: 0 0 10px rgba(0,0,0,.6); pointer-events: none; }
  .cmp-knob {
    position: absolute; top: 50%; left: 50%; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 17px; display: grid; place-items: center;
    background: #fff; color: #222; box-shadow: 0 4px 14px rgba(0,0,0,.45);
  }
  .cmp-knob .material-symbols-rounded { font-size: 20px; }
  .cmp-tag {
    position: absolute; top: 10px; padding: 3px 9px; border-radius: 8px; background: rgba(0,0,0,.6); color: #fff;
    font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; pointer-events: none;
  }
  .cmp-tag.left { left: 10px; }
  .cmp-tag.right { right: 10px; top: auto; bottom: 10px; }

  /* The generating overlay: the picture forming, over the stage. */
  .generating-overlay {
    position: absolute; inset: 0; z-index: 3; display: grid; place-items: center;
    background: color-mix(in srgb, var(--oppai-bg) 55%, transparent); backdrop-filter: blur(3px);
  }
  .generating-card {
    display: grid; gap: 10px; padding: 12px 16px; border: 1px solid var(--oppai-border-strong); border-radius: 16px; background: var(--oppai-surface-2);
    box-shadow: 0 16px 44px rgba(0,0,0,.4); font-size: 13px; font-weight: 600; max-width: min(92%, 420px);
  }
  .generating-card.with-preview { padding: 10px; }
  .progress-preview { display: block; width: 100%; max-height: 52vh; object-fit: contain; border-radius: 10px; background: #000; }
  .progress-row { display: flex; align-items: center; gap: 10px; }
  .progress-label { flex: 1; min-width: 0; }
  .progress-cancel {
    display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--oppai-border-strong); border-radius: 999px;
    padding: 5px 12px 5px 8px; background: transparent; color: inherit; font: inherit; font-size: 12px; cursor: pointer;
  }
  .progress-cancel:hover:not(:disabled) { background: color-mix(in srgb, var(--oppai-error, #f66) 18%, transparent); }
  .progress-cancel:disabled { opacity: .5; cursor: default; }
  .progress-bar { height: 4px; border-radius: 2px; background: var(--oppai-border); overflow: hidden; }
  .progress-bar span { display: block; height: 100%; background: var(--oppai-primary); transition: width .4s ease; }

  /* The session strip. */
  .session-strip {
    flex: none; display: flex; align-items: center; gap: 10px; padding: 8px 12px; min-width: 0;
    border-top: 1px solid var(--oppai-border); background: color-mix(in srgb, var(--oppai-surface) 80%, transparent);
  }
  .strip-label {
    flex: none; display: flex; flex-direction: column; align-items: center; gap: 1px; width: 52px; font-size: 9.5px; font-weight: 700;
    letter-spacing: 0.5px; text-transform: uppercase; color: var(--oppai-text-muted); text-align: center; line-height: 1.2;
  }
  .strip-label b { font-size: 15px; color: var(--oppai-text); letter-spacing: 0; font-variant-numeric: tabular-nums; }
  .strip-scroll { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; overflow-x: auto; scrollbar-width: thin; padding: 3px 2px; }
  .strip-thumb, .strip-live, .strip-q {
    position: relative; flex: none; width: 54px; height: 66px; border-radius: 10px; overflow: hidden; padding: 0; border: 2px solid transparent;
    background: var(--oppai-bg); cursor: pointer;
  }
  .strip-thumb img, .strip-live img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .strip-thumb { opacity: 0.72; transition: opacity 0.12s ease, transform 0.15s var(--oppai-ease-spring); animation: oppai-scale-in 0.2s var(--oppai-ease-emphasized) both; }
  .strip-thumb:hover { opacity: 1; transform: translateY(-2px); }
  .strip-thumb.on { opacity: 1; border-color: var(--oppai-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--oppai-primary) 22%, transparent); }
  .strip-thumb.cmp { opacity: 1; border-color: #8ab4f8; }
  .strip-saved {
    position: absolute; right: 3px; bottom: 3px; width: 16px; height: 16px; border-radius: 8px; display: grid; place-items: center;
    background: #2e7d4f; color: #fff;
  }
  .strip-saved .material-symbols-rounded { font-size: 12px; }
  .strip-b {
    position: absolute; left: 3px; top: 3px; padding: 0 5px; border-radius: 6px; background: #8ab4f8; color: #10213f; font-size: 10px; font-weight: 800;
  }
  .strip-gone { width: 100%; height: 100%; display: grid; place-items: center; color: var(--oppai-text-muted); }
  .strip-gone .material-symbols-rounded { font-size: 18px; }
  .strip-live { cursor: default; border-style: dashed; border-color: var(--oppai-primary); display: grid; place-items: center; }
  .strip-live img { position: absolute; inset: 0; filter: brightness(0.6); }
  .strip-live span { position: relative; font-size: 12px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; text-shadow: 0 1px 3px rgba(0,0,0,.6); }
  .strip-q {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border: 1.5px dashed var(--oppai-border-strong);
    color: var(--oppai-text-dim); font: inherit; font-size: 13px; font-weight: 800;
  }
  .strip-q .material-symbols-rounded { font-size: 18px; }
  .strip-clear { flex: none; width: 34px; height: 34px; border-radius: 17px; border: none; background: none; color: var(--oppai-text-muted); display: grid; place-items: center; cursor: pointer; }
  .strip-clear:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }

  /* The composer. */
  .prompt-dock { flex: 0 0 auto; position: relative; padding: 10px 14px 14px; background: color-mix(in srgb, var(--oppai-surface) 80%, transparent); container-type: inline-size; }
  .composer {
    position: relative; display: flex; flex-direction: column; gap: 9px; padding: 11px; border: 1px solid var(--oppai-border-strong); border-radius: 20px;
    background: var(--oppai-surface-2); box-shadow: 0 -4px 30px rgba(0,0,0,.2); transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .composer:focus-within {
    border-color: color-mix(in srgb, var(--oppai-primary) 65%, var(--oppai-border-strong));
    box-shadow: 0 -4px 30px rgba(0,0,0,.2), 0 0 0 3px color-mix(in srgb, var(--oppai-primary) 14%, transparent);
  }
  .composer-fields { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(200px, 0.8fr); gap: 9px; }
  .prompt-field { position: relative; }
  .composer .prompt-field textarea {
    min-height: 74px; max-height: 220px; padding: 11px 13px; border-radius: 14px; border-color: var(--oppai-border); background: var(--oppai-bg);
    font-size: 14px; line-height: 1.55; resize: vertical;
  }
  .composer .prompt-field textarea:focus { border-color: var(--oppai-primary); }
  .composer .prompt-field.negative textarea { padding-top: 28px; font-size: 13px; }
  .field-tag {
    position: absolute; z-index: 1; top: 9px; left: 13px; font-size: 10px; font-weight: 700; letter-spacing: .55px; text-transform: uppercase;
    color: var(--oppai-text-muted); pointer-events: none;
  }
  .field-tag.negative { color: var(--oppai-error, #f2b8b5); }
  .trigger-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .trigger-label { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: var(--oppai-text-muted); margin-right: 4px; }
  .chip.small { min-height: 28px; padding: 2px 11px; font-size: 12px; border-radius: 14px; }
  .composer-bar { display: flex; align-items: center; gap: 8px; min-height: 44px; }
  .composer .mic {
    flex: none; width: 38px; height: 38px; border-radius: 19px; background: var(--oppai-bg); border: 1px solid var(--oppai-border-strong);
    color: var(--oppai-text-dim); display: grid; place-items: center; cursor: pointer;
  }
  .composer .mic:hover { color: var(--oppai-text); border-color: var(--oppai-text-muted); }
  .composer .mic.on { color: var(--oppai-primary-bright, var(--oppai-primary)); border-color: var(--oppai-primary); }
  .composer .mic .material-symbols-rounded { font-size: 19px; }
  .composer .mic.live { border-color: transparent; background: var(--oppai-error, #f2b8b5); color: #000; }
  .composer .speech-hint { font-size: 13px; }
  .count-seg { flex: none; display: inline-flex; border: 1px solid var(--oppai-border-strong); border-radius: 12px; overflow: hidden; }
  .count-seg button {
    width: 34px; height: 34px; border: 0; background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
  }
  .count-seg button + button { border-left: 1px solid var(--oppai-border); }
  .count-seg button:hover:not(:disabled) { background: var(--oppai-surface); }
  .count-seg button.on { background: var(--oppai-primary-container); color: var(--oppai-on-primary-container, var(--oppai-text)); }
  .count-seg button:disabled { cursor: default; opacity: 0.5; }
  .prompt-summary { min-width: 0; flex: 0 1 auto; color: var(--oppai-text-muted); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @container (max-width: 860px) {
    .prompt-summary { display: none; }
  }
  @container (max-width: 720px) {
    .queue-label { display: none; }
    .people-seg { display: none; }
    .people-cycle { display: inline-flex; }
    .composer .generate { min-width: 0; padding: 0 18px; }
  }
  @container (max-width: 560px) {
    .composer-fields { grid-template-columns: 1fr; }
    .composer .prompt-field.negative textarea { min-height: 40px; height: 40px; padding-top: 22px; }
    /* The tools on one row and Generate on its own below, full width: squeezed onto
       one row, Generate was the thing pushed off the edge. */
    .composer-bar { flex-wrap: wrap; row-gap: 8px; }
    .composer .generate { order: 5; flex: 1 1 auto; margin: 0; }
    .queue-btn { order: 6; }
  }
  .composer .generate {
    width: auto; min-width: 160px; height: 46px; margin: 0 0 0 auto; padding: 0 24px; border: none; border-radius: 23px; flex: none;
    font-size: 15px; font-weight: 700; letter-spacing: 0.2px; color: var(--oppai-on-primary); display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;
    background: linear-gradient(135deg, var(--oppai-primary), color-mix(in srgb, var(--oppai-primary) 62%, #c58af9));
    box-shadow: 0 8px 22px color-mix(in srgb, var(--oppai-primary) 34%, transparent);
    transition: transform 0.16s var(--oppai-ease-spring), box-shadow 0.16s ease, filter 0.16s ease;
  }
  .composer .generate:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.06); }
  .composer .generate:disabled { box-shadow: none; opacity: 0.55; cursor: default; }
  .composer .generate.cancel { background: var(--oppai-surface); color: var(--oppai-text); border: 1px solid var(--oppai-border-strong); box-shadow: none; }
  .queue-btn {
    flex: none; height: 46px; display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; border-radius: 23px;
    border: 1px solid var(--oppai-border-strong); background: var(--oppai-bg); color: var(--oppai-text-dim); font: inherit; font-size: 13px; font-weight: 650; cursor: pointer;
  }
  .queue-btn:hover:not(:disabled) { color: var(--oppai-text); border-color: var(--oppai-text-muted); }
  .queue-btn.hot:not(:disabled) { border-color: var(--oppai-primary); color: var(--oppai-text); background: color-mix(in srgb, var(--oppai-primary) 12%, var(--oppai-bg)); }
  .queue-btn:disabled { opacity: 0.45; cursor: default; }
  .queue-btn b {
    min-width: 18px; height: 18px; padding: 0 5px; box-sizing: border-box; border-radius: 9px; background: var(--oppai-primary); color: var(--oppai-on-primary);
    font-size: 10.5px; line-height: 18px; text-align: center;
  }
  .queue-btn .material-symbols-rounded { font-size: 19px; }

  /* The suggestion list opens upward: the composer sits at the bottom of the screen. */
  .complete {
    position: absolute; left: 0; right: 0; bottom: calc(100% + 8px); z-index: 20; max-height: 340px; overflow-y: auto; padding: 6px;
    border: 1px solid var(--oppai-border-strong); border-radius: 16px; background: var(--oppai-surface-2); box-shadow: 0 16px 44px rgba(0,0,0,.45);
    animation: oppai-fade-in-up 0.14s ease both;
  }
  .complete-row {
    width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 0; border-radius: 10px; background: transparent;
    color: var(--oppai-text); font: inherit; font-size: 13px; text-align: left; cursor: pointer;
  }
  .complete-row.on { background: color-mix(in srgb, var(--oppai-primary) 22%, transparent); }
  /* Danbooru's own colours for its categories, so a character or an artist reads as
     one before its name does. */
  .complete-dot { flex: 0 0 9px; width: 9px; height: 9px; border-radius: 50%; background: #8ab4f8; }
  .complete-dot.cat-1 { background: #f28b82; }
  .complete-dot.cat-3 { background: #c58af9; }
  .complete-dot.cat-4 { background: #81c995; }
  .complete-dot.cat-5 { background: #fdd663; }
  .complete-dot.cat-100 { background: var(--oppai-primary); }
  .complete-dot.cat-lora, .complete-dot.cat-wildcard, .complete-dot.cat-trigger { border-radius: 3px; }
  .complete-dot.cat-lora { background: var(--oppai-primary); }
  .complete-dot.cat-wildcard { background: #78d9ec; }
  .complete-dot.cat-trigger { background: #fdd663; }
  .complete-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .complete-detail { color: var(--oppai-text-muted); font-size: 11.5px; white-space: nowrap; }
  .complete-count { min-width: 38px; color: var(--oppai-text-muted); font-size: 11.5px; font-variant-numeric: tabular-nums; text-align: right; }
  .complete-hint { margin-top: 4px; padding: 7px 10px 3px; border-top: 1px solid var(--oppai-border); color: var(--oppai-text-muted); font-size: 11px; }
  .prompt-options { max-height: 220px; overflow-y: auto; padding: 9px; border: 1px solid var(--oppai-border); border-radius: 8px; background: var(--oppai-surface-2); }

  /* A LoRA dragged over the stage. */
  .lora-drop {
    position: absolute; inset: 0; z-index: 12; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px; padding: 18px; box-sizing: border-box; background: color-mix(in srgb, var(--oppai-bg) 74%, transparent);
    backdrop-filter: blur(3px); animation: oppai-fade-in 0.12s ease both; container-type: size; overflow: hidden;
  }
  .drop-title { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: center; font-size: 13px; color: var(--oppai-text-dim); }
  .drop-title b { color: var(--oppai-text); }
  .drop-title .material-symbols-rounded { font-size: 18px; color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .drop-all {
    flex: 1 1 auto; width: 100%; max-width: 560px; max-height: 320px; display: flex; align-items: center; justify-content: center; gap: 8px;
    border: 2px dashed color-mix(in srgb, var(--oppai-primary) 50%, var(--oppai-border-strong)); border-radius: 18px;
    color: var(--oppai-text-dim); font-size: 15px; font-weight: 600; transition: background 0.12s ease, border-color 0.12s ease;
  }
  .drop-all.slim { flex: none; height: 52px; font-size: 13px; }
  .drop-all.over, .drop-part.over {
    border-style: solid; border-color: var(--oppai-primary); color: var(--oppai-text); background: color-mix(in srgb, var(--oppai-primary) 16%, transparent);
  }
  .people-frame {
    display: flex; gap: 6px; padding: 6px; box-sizing: border-box; max-height: 100%; border-radius: 14px;
    border: 1px solid var(--oppai-border-strong); background: color-mix(in srgb, var(--oppai-surface) 72%, transparent);
  }
  .people-frame.rows { flex-direction: column; }
  .drop-part {
    position: relative; min-width: 0; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 6px; padding: 26px 6px 8px; box-sizing: border-box; border-radius: 10px; text-align: center; font-size: 12px;
    color: var(--oppai-text-muted); border: 2px dashed color-mix(in srgb, var(--oppai-primary) 45%, var(--oppai-border-strong));
    transition: background 0.12s ease, border-color 0.12s ease;
  }
  .drop-n { position: absolute; top: 5px; left: 9px; font-size: 13px; font-weight: 700; color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .drop-lora {
    display: inline-flex; align-items: center; gap: 4px; max-width: 100%; box-sizing: border-box; padding: 4px 4px 4px 8px;
    border-radius: 14px; background: var(--oppai-primary-container); color: var(--oppai-text); font-size: 12px; font-weight: 600;
  }
  .drop-lora .nm { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .drop-lora .material-symbols-rounded { font-size: 15px; }
  .drop-lora button { flex: none; width: 20px; height: 20px; padding: 0; border: none; border-radius: 10px; background: none; color: inherit; display: grid; place-items: center; cursor: pointer; }
  .people-empty { place-self: center; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .people-empty .hint { max-width: 360px; font-size: 12px; line-height: 1.5; color: var(--oppai-text-muted); text-align: center; }

  .restored {
    position: absolute; top: 64px; left: 50%; z-index: 30; width: min(520px, calc(100% - 24px)); transform: translateX(-50%); box-sizing: border-box;
    margin: 0; border: 1px solid var(--oppai-border-strong); box-shadow: 0 10px 30px rgba(0,0,0,.35);
  }

  /* ── the Sprites studio ────────────────────────────────────────────────── */
  .sprite-shell { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); }
  .sprite-shell.with-inspector { grid-template-columns: 360px minmax(0, 1fr); }
  .sprite-shell.with-focus { grid-template-columns: minmax(0, 1fr) 340px; }
  .sprite-shell.with-inspector.with-focus { grid-template-columns: 360px minmax(0, 1fr) 340px; }
  .sprite-inspector {
    min-width: 0; min-height: 0; display: flex; flex-direction: column; background: var(--oppai-surface); border-right: 1px solid var(--oppai-border-strong);
  }
  .ins-tabs { flex: none; display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; padding: 8px; border-bottom: 1px solid var(--oppai-border); }
  .ins-tabs button {
    display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 7px 2px 6px; border: none; border-radius: 10px;
    background: transparent; color: var(--oppai-text-muted); font: inherit; font-size: 11px; font-weight: 650; cursor: pointer;
  }
  .ins-tabs button .material-symbols-rounded { font-size: 20px; }
  .ins-tabs button:hover { color: var(--oppai-text); background: var(--oppai-surface-2); }
  .ins-tabs button.on { color: var(--oppai-text); background: var(--oppai-primary-container); }
  .panel-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
  .ins-body { padding: 14px 14px 26px; }
  .gear-slot .gear-slot-icon { border: 0; cursor: pointer; font: inherit; font-family: "Material Symbols Rounded"; }
  .gear-slot .gear-slot-icon.inert { cursor: default; }
  .gear-slot.off { opacity: 0.55; }
  .gear-slot.off input { text-decoration: line-through; }
  textarea.num.extras { resize: vertical; min-height: 54px; font-size: 12px; line-height: 1.4; }
  .studio-wardrobe { flex: 1; min-height: 0; overflow: auto; padding: 20px 24px 40px; }

  .workbench { position: relative; min-width: 0; min-height: 0; display: flex; flex-direction: column; background: color-mix(in srgb, var(--oppai-bg) 84%, #000); }
  .canvas-toolbar {
    flex: 0 0 auto; min-height: 48px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px 10px; padding: 7px 12px; box-sizing: border-box;
    border-bottom: 1px solid var(--oppai-border); background: var(--oppai-surface); color: var(--oppai-text-muted); font-size: 11px; font-variant-numeric: tabular-nums;
  }
  .toolbar-clear {
    border: 0; background: transparent; color: var(--oppai-text-muted); font: inherit; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
    padding: 6px; border-radius: 8px;
  }
  .toolbar-clear:hover { background: var(--oppai-surface-2); color: var(--oppai-text); }
  .wardrobe-pick { display: inline-flex; align-items: center; gap: 6px; min-width: 0; color: var(--oppai-text-dim); }
  .wardrobe-pick select {
    max-width: 210px; min-width: 0; height: 32px; border: 1px solid var(--oppai-border-strong); border-radius: 10px; padding: 0 8px;
    background: var(--oppai-bg); color: var(--oppai-text); font: inherit; font-size: 12.5px; font-weight: 600;
  }
  .sheet-tabs { display: inline-flex; gap: 2px; padding: 3px; border-radius: 12px; background: var(--oppai-bg); border: 1px solid var(--oppai-border); }
  .sheet-tab { border: 0; border-radius: 9px; padding: 5px 11px; background: transparent; color: var(--oppai-text-muted); font: inherit; font-size: 12px; font-weight: 650; cursor: pointer; }
  .sheet-tab.on { background: var(--oppai-primary); color: var(--oppai-on-primary); }
  .sheet-tab-count { font-weight: 500; opacity: 0.8; font-variant-numeric: tabular-nums; }
  .board-filters { display: inline-flex; gap: 4px; flex-wrap: wrap; }
  .bf {
    display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: 14px; border: 1px solid var(--oppai-border-strong);
    background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
  }
  .bf b { font-weight: 800; font-variant-numeric: tabular-nums; }
  .bf:hover:not(:disabled) { color: var(--oppai-text); border-color: var(--oppai-text-muted); }
  .bf.on { background: var(--oppai-surface-2); border-color: var(--oppai-text-dim); color: var(--oppai-text); }
  .bf:disabled { opacity: 0.4; cursor: default; }
  .bf-dot { width: 8px; height: 8px; border-radius: 50%; }
  .bf-missing .bf-dot { background: transparent; border: 1.5px dashed var(--oppai-text-muted); box-sizing: border-box; }
  .bf-review .bf-dot { background: #f5c469; }
  .bf-stale .bf-dot { background: #d9a441; box-shadow: inset 0 0 0 2px var(--oppai-surface); border: 1px solid #d9a441; box-sizing: border-box; }
  .zoom-tabs { display: inline-flex; gap: 2px; padding: 2px; border-radius: 9px; border: 1px solid var(--oppai-border); }
  .zoom-tab { min-width: 26px; padding: 0 6px; height: 24px; border: none; border-radius: 7px; background: transparent; color: var(--oppai-text-muted); font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
  .zoom-tab.on { background: var(--oppai-surface-2); color: var(--oppai-text); }

  /* place-items back to normal too: block layout honours justify-items now, and a
     centred matrix wider than the stage overflows off its left edge, out of reach. */
  .canvas-stage.sheet { display: block; place-items: normal; padding: 14px; background-image: none; }
  /* The expression matrix: rows are heat tiers, columns are expressions, both headers
     sticky so a wide sheet scrolled to the edge still says where you are. */
  .face-matrix { display: grid; grid-template-columns: 96px repeat(12, var(--cell, 88px)); gap: 6px; align-items: stretch; width: max-content; min-width: 100%; }
  .face-matrix.fit { grid-template-columns: 96px repeat(12, minmax(0, 1fr)); width: 100%; min-width: 0; }
  .face-matrix.fit .matrix-col-head { font-size: 10px; padding: 4px 2px; }
  .face-matrix.fit .cell-foot { padding: 3px 4px; font-size: 9px; }
  .matrix-corner { position: sticky; top: 0; left: 0; z-index: 3; background: color-mix(in srgb, var(--oppai-bg) 84%, #000); }
  .matrix-col-head {
    position: sticky; top: 0; z-index: 2; padding: 8px 4px 6px; text-align: center; background: color-mix(in srgb, var(--oppai-bg) 84%, #000);
    color: var(--oppai-text-muted); font-size: 11px; font-weight: 700; letter-spacing: 0.3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .matrix-col-head.on { color: var(--oppai-primary-bright, var(--oppai-primary)); }
  .matrix-row-head {
    position: sticky; left: 0; z-index: 2; display: flex; flex-direction: column; justify-content: center; gap: 4px; padding: 8px 9px;
    border-radius: 12px; background: var(--oppai-surface); border: 1px solid var(--oppai-border); color: var(--oppai-text-dim); font-size: 11px; font-weight: 700;
  }
  .matrix-row-head.on { border-color: color-mix(in srgb, var(--oppai-primary) 55%, var(--oppai-border)); }
  .row-heat { display: flex; gap: 2px; }
  .row-heat i { width: 9px; height: 4px; border-radius: 2px; background: var(--oppai-border-strong); }
  .row-heat i.lit { background: linear-gradient(90deg, #f5c469, #e8705a); }
  .matrix-row-name { letter-spacing: 0.5px; text-transform: uppercase; }
  .matrix-row-count { color: var(--oppai-text-muted); font-weight: 600; font-variant-numeric: tabular-nums; }
  .row-bar { height: 3px; border-radius: 2px; background: var(--oppai-border); overflow: hidden; }
  .row-bar span { display: block; height: 100%; background: var(--oppai-primary); }
  .outfit-sheet { display: grid; gap: 12px; }
  .sheet-tier { border: 1px solid var(--oppai-border); border-radius: 16px; background: var(--oppai-surface); overflow: hidden; }
  .sheet-tier-head {
    display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-bottom: 1px solid var(--oppai-border); color: var(--oppai-text-dim);
    font-size: 11px; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase;
  }
  .sheet-tier-head .tier-count { margin-left: auto; color: var(--oppai-text-muted); font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: 0.2px; text-transform: none; }
  .sheet-note { margin: 0; padding: 8px 12px 0; color: var(--oppai-text-muted); font-size: 12px; }
  .sheet-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(calc(var(--cell, 88px) + 30px), 1fr)); gap: 10px; padding: 12px; }
  .sheet-cell {
    position: relative; display: flex; flex-direction: column; padding: 0; border: 1px solid var(--oppai-border); border-radius: 12px;
    background: var(--oppai-surface); color: var(--oppai-text); font: inherit; text-align: left; overflow: hidden; cursor: pointer;
    transition: opacity 0.18s ease, transform 0.15s var(--oppai-ease-spring), border-color 0.15s ease;
  }
  .sheet-cell:hover { transform: translateY(-2px); border-color: var(--oppai-border-strong); }
  .sheet-cell.current { border-color: var(--oppai-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--oppai-primary) 34%, transparent); }
  .sheet-cell.dim { opacity: 0.18; }
  .sheet-cell.dim:hover { opacity: 0.6; }
  .sheet-cell.st-stale .art { filter: saturate(0.4) brightness(0.85); }
  /* Reviewed squares are transparent PNGs. A checkerboard behind them is the only way
     the cut edge is visible at thumbnail size. */
  .sheet-cell .art {
    display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: contain; background-color: #6b6b6b;
    background-image: linear-gradient(45deg, #565656 25%, transparent 25%, transparent 75%, #565656 75%), linear-gradient(45deg, #565656 25%, transparent 25%, transparent 75%, #565656 75%);
    background-size: 14px 14px; background-position: 0 0, 7px 7px;
  }
  .sheet-cell .art-empty {
    display: grid; place-items: center; aspect-ratio: 3 / 4; border-radius: 9px; border: 1.5px dashed var(--oppai-border-strong); margin: 4px;
    color: var(--oppai-text-muted); transition: color 0.15s ease, border-color 0.15s ease;
  }
  .sheet-cell .art-empty .material-symbols-rounded { font-size: 20px; opacity: 0.6; }
  .sheet-cell:hover .art-empty, .sheet-cell.current .art-empty { color: var(--oppai-primary-bright, var(--oppai-primary)); border-color: color-mix(in srgb, var(--oppai-primary) 55%, transparent); }
  .sheet-cell .cell-foot { display: flex; align-items: center; gap: 4px; padding: 4px 6px; font-size: 10px; font-weight: 650; color: var(--oppai-text-dim); }
  .sheet-cell .cell-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* Two states worth distinguishing at a glance: a square that still needs its cutout
     looked at, and one that is finished; stale is a ring rather than a fill. */
  .cell-state { flex: 0 0 auto; margin-left: auto; width: 8px; height: 8px; border-radius: 50%; box-sizing: border-box; }
  .cell-state.needs { background: #f5c469; }
  .cell-state.ready { background: #6ef7a5; }
  .cell-state.stale { background: transparent; border: 2px solid #d9a441; }
  .sheet-progress {
    position: absolute; top: 58px; left: 50%; z-index: 6; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 6px;
    border-radius: 16px; border: 1px solid var(--oppai-border-strong); background: color-mix(in srgb, var(--oppai-surface-2) 94%, transparent);
    backdrop-filter: blur(8px); box-shadow: 0 12px 34px rgba(0,0,0,.45); animation: oppai-fade-in-up 0.2s ease both; max-width: calc(100% - 24px);
  }
  .sheet-progress img { width: 44px; height: 56px; border-radius: 10px; object-fit: cover; background: #000; }
  .sheet-progress md-circular-progress { margin: 0 8px; }
  .sp-text { display: flex; flex-direction: column; gap: 3px; min-width: 150px; font-size: 11.5px; color: var(--oppai-text-muted); font-variant-numeric: tabular-nums; }
  .sp-text b { color: var(--oppai-text); font-size: 12.5px; }
  .sp-bar { height: 3px; border-radius: 2px; background: var(--oppai-border); overflow: hidden; }
  .sp-bar span { display: block; height: 100%; background: var(--oppai-primary); transition: width .4s ease; }

  /* The batch bar. */
  .batch-bar {
    flex: 0 0 auto; display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; padding: 10px 14px;
    background: var(--oppai-surface); border-top: 1px solid var(--oppai-border-strong);
  }
  .batch-ring { position: relative; flex: none; width: 44px; height: 44px; display: grid; place-items: center; }
  .batch-ring svg { position: absolute; inset: 0; transform: rotate(-90deg); }
  .batch-ring circle { fill: none; stroke-width: 4; }
  .r-track { stroke: var(--oppai-border-strong); }
  .r-made { stroke: color-mix(in srgb, var(--oppai-primary) 45%, transparent); stroke-linecap: round; transition: stroke-dashoffset .4s ease; }
  .r-done { stroke: var(--oppai-primary); stroke-linecap: round; transition: stroke-dashoffset .4s ease; }
  .batch-ring b { position: relative; font-size: 12px; font-variant-numeric: tabular-nums; }
  .batch-ring b small { font-size: 8px; opacity: 0.7; }
  .batch-progress { flex: 1 1 220px; min-width: 180px; display: grid; gap: 2px; }
  .batch-head { font-size: 13px; font-weight: 700; color: var(--oppai-text); }
  .batch-count { color: var(--oppai-text-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
  .batch-count em { font-style: normal; color: #d9a441; }
  .batch-note { flex-basis: 100%; color: var(--oppai-text-muted); font-size: 11px; }
  .switch.compact { margin: 0; font-size: 12px; white-space: nowrap; }

  /* The selected square. */
  .studio-focus { display: flex; flex-direction: column; }
  .focus-head { flex: none; display: flex; align-items: flex-start; gap: 10px; padding: 12px 12px 10px 14px; border-bottom: 1px solid var(--oppai-border); }
  .focus-title { flex: 1; min-width: 0; display: grid; gap: 4px; }
  .focus-title strong { font-size: 15px; }
  .focus-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--oppai-text-muted); }
  .focus-status i { width: 7px; height: 7px; border-radius: 50%; background: var(--oppai-text-muted); flex: none; }
  .focus-status.ready { color: #6fcf8a; }
  .focus-status.ready i { background: #6ef7a5; }
  .focus-status.needs, .focus-status.stale { color: #d9a441; }
  .focus-status.needs i { background: #f5c469; }
  .focus-status.stale i { background: transparent; border: 2px solid #d9a441; box-sizing: border-box; }
  .seg { display: inline-flex; border: 1px solid var(--oppai-border-strong); border-radius: 10px; overflow: hidden; flex: none; }
  .seg button { height: 28px; padding: 0 10px; border: none; background: none; color: var(--oppai-text-dim); font: inherit; font-size: 11.5px; font-weight: 650; cursor: pointer; }
  .seg button + button { border-left: 1px solid var(--oppai-border); }
  .seg button.on { background: var(--oppai-primary-container); color: var(--oppai-on-primary-container, var(--oppai-text)); }
  .focus-scroll { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
  .focus-art {
    position: relative; flex: 0 0 auto; width: 100%; aspect-ratio: 3 / 4; box-sizing: border-box; border-radius: 14px; overflow: hidden;
    display: grid; place-items: center; border: 1px solid var(--oppai-border); background-color: #6b6b6b;
    background-image: linear-gradient(45deg, #5a5a5a 25%, transparent 25%), linear-gradient(-45deg, #5a5a5a 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #5a5a5a 75%), linear-gradient(-45deg, transparent 75%, #5a5a5a 75%);
    background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  }
  .focus-art img { width: 100%; height: 100%; object-fit: contain; display: block; }
  /* As she appears in chat: standing in a warm room, her speech box above her in the
     peach pixel style the app's own pop-up uses (app.ts). */
  .focus-art.scene {
    background: radial-gradient(120% 70% at 50% 100%, #5b3a2c 0%, transparent 60%),
      linear-gradient(180deg, #2a2233 0%, #3d2b36 55%, #4a3128 100%);
  }
  .focus-art.scene img { align-self: end; height: 82%; object-position: bottom center; filter: drop-shadow(0 6px 8px rgba(0,0,0,.45)); }
  .scene-speech {
    position: absolute; top: 12px; left: 12px; right: 12px; padding: 10px 12px 13px; border: 3px solid #29262a; border-radius: 6px;
    background: linear-gradient(180deg, #f7c994, #f3bd86); color: #35282a;
    box-shadow: inset 0 0 0 2px rgba(255,225,183,.42), inset 0 -5px 0 #c96f5b, 0 3px 0 #c96f5b;
    font: 500 12px/1.45 ui-monospace, "Cascadia Mono", Consolas, monospace; letter-spacing: .02em;
    animation: oppai-fade-in-up 0.25s ease both;
  }
  .focus-empty { display: grid; place-items: center; gap: 6px; color: rgba(255,255,255,.75); font-size: 12px; text-align: center; }
  .focus-empty .material-symbols-rounded { font-size: 30px; }
  .flip-btn {
    position: absolute; right: 8px; bottom: 8px; display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 11px 0 8px;
    border: none; border-radius: 15px; background: rgba(0,0,0,.6); backdrop-filter: blur(6px); color: #fff; font: inherit; font-size: 11.5px; font-weight: 650; cursor: pointer;
  }
  .flip-btn.on { background: var(--oppai-primary); color: var(--oppai-on-primary); }
  .flip-btn .material-symbols-rounded { font-size: 17px; }
  .heat-ladder { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; }
  .rung {
    position: relative; padding: 0; border: 1.5px solid var(--oppai-border); border-radius: 9px; overflow: hidden; background: var(--oppai-bg);
    aspect-ratio: 3 / 4; cursor: pointer;
  }
  .rung img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
  .rung-empty { position: absolute; inset: 4px; border: 1px dashed var(--oppai-border-strong); border-radius: 6px; }
  .rung.on { border-color: var(--oppai-primary); }
  .rung-label {
    position: absolute; left: 0; right: 0; bottom: 0; padding: 8px 2px 2px; font-size: 9px; font-weight: 700; color: #fff; text-align: center;
    background: linear-gradient(transparent, rgba(0,0,0,.7)); letter-spacing: 0.2px;
  }
  .focus-primary { display: grid; grid-template-columns: 1.5fr 1fr; gap: 6px; }
  .focus-primary .btn { justify-content: center; }
  .focus-tools { display: grid; grid-template-columns: repeat(auto-fill, minmax(58px, 1fr)); gap: 4px; }
  .tool {
    display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 2px 6px; border: 1px solid var(--oppai-border); border-radius: 10px;
    background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 10.5px; font-weight: 600; cursor: pointer;
  }
  .tool .material-symbols-rounded { font-size: 19px; }
  .tool:hover:not(:disabled):not(.disabled) { background: var(--oppai-surface-2); color: var(--oppai-text); border-color: var(--oppai-border-strong); }
  .tool:disabled, .tool.disabled { opacity: 0.4; cursor: default; pointer-events: none; }
  .tool.danger:hover:not(:disabled) { color: var(--oppai-error, #f2b8b5); }
  .focus-desc { line-height: 1.5; }
  .focus-meta { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; color: var(--oppai-text-muted); font-size: 11px; }
  .focus-meta span { display: inline-flex; align-items: center; gap: 3px; }
  .link-btn { border: 0; background: none; padding: 0; color: var(--oppai-primary-bright); font: inherit; font-size: 11px; cursor: pointer; }
  .link-btn:disabled { opacity: 0.5; cursor: default; }
  .focus-prompt { display: grid; gap: 6px; }
  .focus-tag { font-size: 10px; font-weight: 700; letter-spacing: .55px; text-transform: uppercase; color: var(--oppai-text-muted); }
  .focus-tag.negative { color: var(--oppai-error, #f2b8b5); }
  .focus-prompt pre { margin: 0; padding: 8px; border-radius: 8px; background: var(--oppai-bg); font-size: 11px; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 220px; overflow: auto; }

  /* ── narrower screens ──────────────────────────────────────────────────── */
  @media (max-width: 1360px) {
    .create-shell.drawer-open.with-gallery { grid-template-columns: 72px 320px minmax(0, 1fr) 290px; }
    .sprite-shell.with-inspector { grid-template-columns: 330px minmax(0, 1fr); }
    .sprite-shell.with-inspector.with-focus { grid-template-columns: 330px minmax(0, 1fr) 300px; }
    .sprite-shell.with-focus { grid-template-columns: minmax(0, 1fr) 300px; }
    .head-label { display: none; }
    .head-btn { padding: 0 9px; }
  }
  /* Narrower than an inspector, a stage and a gallery side by side: the inspector
     floats over the stage instead of pushing it. */
  @media (max-width: 1180px) {
    .create-shell, .create-shell.drawer-open { grid-template-columns: 72px minmax(0, 1fr); position: relative; }
    .create-shell.with-gallery, .create-shell.drawer-open.with-gallery { grid-template-columns: 72px minmax(0, 1fr) 280px; }
    .create-shell.video.with-gallery { grid-template-columns: minmax(0, 1fr) 280px; }
    .create-drawer { position: absolute; z-index: 30; top: 0; bottom: 0; left: 72px; width: 340px; box-shadow: 18px 0 46px rgba(0,0,0,.42); }
    /* filter, not opacity: the drawer's entrance animation fills forwards and would
       hold its opacity at 1. */
    .create-shell.lora-dragging .create-drawer { filter: opacity(0.35); pointer-events: none; transition: filter 0.15s ease; }
    .sprite-shell.with-inspector.with-focus { grid-template-columns: 290px minmax(0, 1fr) 270px; }
    .gen-pill { max-width: 220px; }
    .sub-note { display: none; }
  }
  /* Below this the square panel is what goes when the recipe is out: the recipe can be
     put away with [ and the panel comes back, but three columns would leave the board
     no room to show a row. */
  @media (max-width: 1000px) and (min-width: 901px) {
    .sprite-shell.with-inspector.with-focus { grid-template-columns: 290px minmax(0, 1fr); }
    .sprite-shell.with-inspector.with-focus .studio-focus { display: none; }
  }
  /* A tablet or a phone: one column that scrolls, the panels as sheets or below. */
  @media (max-width: 900px) {
    :host, .wrap { overflow: visible; height: auto; }
    .studio, .workspace { height: auto; min-height: 100%; }
    .studio-head { flex-wrap: wrap; position: sticky; top: 0; height: auto; gap: 6px; padding: 8px 10px; }
    .toast { top: 12px; bottom: auto; }
    .mode-switch { order: -2; flex: 1 1 100%; }
    .mode { flex: 1; justify-content: center; padding: 0 8px; }
    .sub-switch { order: -1; margin: 0; }
    .gen-pill { max-width: none; flex: 1 1 auto; }
    .head-spacer { display: none; }
    /* No panels to toggle beside a one-column page, and no keyboard to list. */
    .head-sep, .head-icon { display: none; }
    .create-shell, .create-shell.drawer-open, .create-shell.with-gallery, .create-shell.drawer-open.with-gallery,
    .create-shell.video, .create-shell.video.with-gallery { display: flex; flex-direction: column; }
    .create-rail {
      flex-direction: row; gap: 2px; padding: 6px 8px; overflow-x: auto; flex: none;
      border-right: 0; border-bottom: 1px solid var(--oppai-border-strong);
    }
    .rail-tab { flex: 1 0 58px; }
    .rail-icon { width: 44px; height: 28px; font-size: 20px; }
    .rail-badge { right: calc(50% - 24px); }
    .create-stage { min-height: 0; }
    .canvas-wrap { flex: none; }
    .viewer-stage { flex: none; height: 56vh; padding: 10px; }
    .view-img { max-width: calc(100cqw - 20px); max-height: calc(100cqh - 70px); }
    .view-nav { display: none; }
    .view-bar { max-width: 100%; }
    .vb-sep { display: none; }
    /* The composer stays in reach while the page scrolls under it: on a phone the
       picture fills the screen, and the prompt is what is changed next. */
    .prompt-dock { position: sticky; bottom: 0; z-index: 6; padding: 8px 10px 10px; background: linear-gradient(to bottom, transparent, var(--oppai-bg) 22%); }
    .create-gallery { min-height: 440px; border-left: 0; border-top: 1px solid var(--oppai-border-strong); }
    .drawer-scrim { display: block; position: fixed; inset: 0; z-index: 90; background: rgba(0,0,0,.5); animation: oppai-fade-in 0.2s ease both; }
    .create-drawer {
      position: fixed; z-index: 91; left: 0; right: 0; top: auto; bottom: 0; width: auto; max-height: 78vh; border: 1px solid var(--oppai-border-strong);
      border-bottom: 0; border-radius: 24px 24px 0 0; box-shadow: 0 -18px 50px rgba(0,0,0,.5); animation: studio-sheet-in 0.28s var(--oppai-ease-emphasized) both;
    }
    @keyframes studio-sheet-in { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
    .drawer-scroll { padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px)); }
    .create-drawer .cards { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    .composer { gap: 7px; padding: 9px; border-radius: 18px; }
    .composer-fields { grid-template-columns: 1fr; gap: 6px; }
    /* A row to scroll sideways, one person tall: stacked, three of them pushed the
       canvas off a phone's screen. */
    .people-grid {
      grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: 86%;
      overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; padding-bottom: 2px;
    }
    .people-grid > .pass-card { scroll-snap-align: start; }
    .people-hint { display: none; }
    .people-seg { display: none; }
    .people-cycle { display: inline-flex; }
    .composer .prompt-field textarea { min-height: 58px; font-size: 14px; }
    .composer .prompt-field.negative textarea { min-height: 40px; height: 40px; padding-top: 22px; }
    .composer .field-tag { top: 6px; }
    .prompt-summary { display: none; }
    .composer .mic { width: 36px; height: 36px; }
    .count-seg button { width: 30px; }
    .composer .generate { flex: 1 1 auto; min-width: 0; height: 44px; margin: 0; padding: 0 14px; }
    .queue-btn { height: 44px; padding: 0 11px; }
    .queue-label { display: none; }
    .session-strip { padding: 6px 10px; }
    .strip-label { display: none; }
    .queue-pop { position: fixed; top: auto; bottom: 12px; left: 12px; right: 12px; width: auto; }

    .sprite-shell, .sprite-shell.with-inspector, .sprite-shell.with-focus, .sprite-shell.with-inspector.with-focus { display: flex; flex-direction: column; }
    .sprite-shell .workbench { order: -2; }
    .sprite-shell .studio-focus, .sprite-shell.with-inspector.with-focus .studio-focus { display: flex; order: -1; border-left: 0; border-top: 1px solid var(--oppai-border-strong); }
    .sprite-inspector { border-right: 0; border-top: 1px solid var(--oppai-border-strong); }
    .ins-tabs { background: var(--oppai-surface); }
    .panel-scroll { overflow: visible; }
    .canvas-stage.sheet { max-height: 62vh; overflow: auto; }
    .studio-wardrobe { padding: 14px 12px 40px; }
  }
`,zr=1280;function Tr(e,t){for(;t;)[e,t]=[t,e%t];return e}const Pr=[{w:1,h:1,name:"square"},{w:2,h:3,name:"portrait photo"},{w:3,h:2,name:"landscape photo"},{w:3,h:4,name:"portrait"},{w:4,h:3,name:"classic screen"},{w:9,h:16,name:"phone screen"},{w:16,h:9,name:"widescreen"},{w:9,h:21,name:"tall phone"},{w:21,h:9,name:"ultrawide"},{w:4,h:5,name:"portrait post"},{w:5,h:4,name:"landscape print"}];function Lr(e,t){if(e<=0||t<=0)return{ratio:"",name:""};const i=e/t,s=Pr.find(l=>Math.abs(i/(l.w/l.h)-1)<=.03);if(s)return{ratio:`${s.w}:${s.h}`,name:s.name};const a=Tr(e,t),o=e/a,n=t/a;return o>32||n>32?i>=1?{ratio:`${i.toFixed(2)}:1`,name:""}:{ratio:`1:${(1/i).toFixed(2)}`,name:""}:{ratio:`${o}:${n}`,name:""}}function Mr(e,t){return`${(e*t/1e6).toFixed(1)} MP`}function ds(e,t,i){const s=Math.max(e,t,1),a=i/Math.max(zr,s);return{width:Math.max(4,Math.round(e*a)),height:Math.max(4,Math.round(t*a))}}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class $i extends ba{constructor(t){if(super(t),this.it=d,t.type!==va.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===d||t==null)return this._t=void 0,this.it=t;if(t===xa)return t;if(typeof t!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const i=[t];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}}$i.directiveName="unsafeHTML",$i.resultType=1;const cs=ya($i);function Ir(e,t){if(e.length===0)return t.slice();const i=e.slice(),s=new Set(e.map(a=>a.id));for(const a of t){if(!s.has(a.id)){s.add(a.id),i.push(a);continue}const o=i[i.length-1];if(o.id===a.id){const n=new Set(o.images.map(l=>l.id));i[i.length-1]={...o,images:[...o.images,...a.images.filter(l=>!n.has(l.id))]}}}return i}function Vt(e){var s;const t=e.createdAt??((s=e.images[0])==null?void 0:s.createdAt)??"";if(!t)return"";const i=new Date(t);return Number.isNaN(i.getTime())?"":i.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}const et={"euler a":"euler_a",euler:"euler","euler karras":"euler_k",lms:"lms","lms karras":"lms_k",heun:"heun","heun karras":"heun_k",dpm2:"kdpm_2","dpm2 karras":"kdpm_2_k","dpm2 a":"kdpm_2_a","dpm2 a karras":"kdpm_2_a_k","dpm++ 2s a":"dpmpp_2s","dpm++ 2s a karras":"dpmpp_2s_k","dpm++ 2m":"dpmpp_2m","dpm++ 2m karras":"dpmpp_2m_k","dpm++ 2m sde":"dpmpp_2m_sde","dpm++ 2m sde karras":"dpmpp_2m_sde_k","dpm++ 3m sde":"dpmpp_3m","dpm++ 3m sde karras":"dpmpp_3m_k","dpm++ sde":"dpmpp_sde","dpm++ sde karras":"dpmpp_sde_k",ddim:"ddim",ddpm:"ddpm",deis:"deis",unipc:"unipc",lcm:"lcm",pndm:"pndm",tcd:"tcd"};function Dr(e){if(!e)return"";const t=e.trim().toLowerCase().replace(/\s+/g," ");if(et[t])return et[t];if(Object.values(et).includes(t))return t;const i=t.split(" ");for(let s=i.length-1;s>=1;s--){const a=i.slice(0,s).join(" ");if(et[a])return et[a]}return""}function Rr(e){const t=/^\s*(\d{2,5})\s*[x×]\s*(\d{2,5})\s*$/i.exec(e??"");if(!t)return null;const i=Number(t[1]),s=Number(t[2]);return i>=64&&s>=64?[i,s]:null}function hs(e){var o;const t=(e.prompt??"").trim();if(!t)return null;const i={prompt:t};(o=e.negativePrompt)!=null&&o.trim()&&(i.negativePrompt=e.negativePrompt.trim());const s=Dr(e.sampler);s&&(i.sampler=s),e.steps&&e.steps>0&&e.steps<=150&&(i.steps=Math.round(e.steps)),e.cfgScale&&e.cfgScale>0&&e.cfgScale<=30&&(i.cfgScale=e.cfgScale),e.seed&&e.seed>0&&(i.seed=e.seed);const a=Rr(e.size)??(e.width>=64&&e.height>=64?[e.width,e.height]:null);return a&&([i.width,i.height]=a),i}var Or=Object.defineProperty,Ar=Object.getOwnPropertyDescriptor,k=(e,t,i,s)=>{for(var a=s>1?void 0:s?Ar(t,i):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(a=(s?n(t,i,a):n(a))||a);return s&&a&&Or(t,i,a),a};const Er=[{id:"",label:"All"},{id:"checkpoint",label:"Checkpoints"},{id:"lora",label:"LoRAs"},{id:"embedding",label:"Embeddings"},{id:"vae",label:"VAEs"},{id:"controlnet",label:"ControlNet"},{id:"upscaler",label:"Upscalers"},{id:"detection",label:"Detectors"}],_r=[{id:"video",label:"Models & LoRAs"},{id:"checkpoint",label:"Models"},{id:"lora",label:"LoRAs"}],us=[{id:"Wan Video 2.2 I2V-A14B",label:"Wan 2.2 · picture to video"},{id:"Wan Video 2.2 T2V-A14B",label:"Wan 2.2 · words to video"},{id:"Wan Video 2.2 TI2V-5B",label:"Wan 2.2 5B"},{id:"Wan Video 14B i2v 480p",label:"Wan 2.1 · picture to video, 480p"},{id:"Wan Video 14B i2v 720p",label:"Wan 2.1 · picture to video, 720p"},{id:"Wan Video 14B t2v",label:"Wan 2.1 · words to video"},{id:"Wan Video",label:"Wan, unspecified"}],Br=[{id:"",label:"Most downloaded"},{id:"rated",label:"Highest rated"},{id:"liked",label:"Most liked"},{id:"newest",label:"Newest"},{id:"collected",label:"Most collected"},{id:"discussed",label:"Most discussed"},{id:"images",label:"Most images"}],Fr=[{id:"",label:"All time"},{id:"year",label:"This year"},{id:"month",label:"This month"},{id:"week",label:"This week"},{id:"day",label:"Today"}],Nr=["SD 1.5","SD 2.1","SDXL 1.0","Pony","Illustrious","NoobAI","Flux.1 D","Flux.1 S","SD 3.5","Kolors","Hunyuan 1","Wan Video"];let $=class extends me{constructor(){super(...arguments),this.backend="invokeai",this.canManage=!0,this.manageNote="",this.mode="pictures",this.tab="browse",this.q="",this.type="",this.sort="",this.period="",this.base="",this.category="",this.creator="",this.nsfw=!0,this.categories=[],this.items=[],this.cursor="",this.loading=!1,this.error="",this.detail=null,this.detailLoading=!1,this.versionId=0,this.shownImage="",this.zoomed="",this.galleryOpen=!1,this.gallery=[],this.galleryCursor="",this.galleryLoading=!1,this.gallerySort="",this.picked=null,this.copied=!1,this.promptsNeedKey=!1,this.jobs=[],this.installing=!1,this.jobsOpen=!1,this.comfyPlaces=null,this.shownMode="",this.searchGen=0,this.me=null,this.meError="",this.meLoading=!1,this.accountTab="models",this.myImages=[],this.myImagesCursor="",this.myModels=[],this.myModelsCursor="",this.myModelsLoading=!1,this.posts=[],this.postsCursor="",this.postsLoading=!1,this.openPost=null,this.collections=[],this.collectionsCursor="",this.collectionsLoading=!1,this.collectionQuery="",this.collectionSort="newest",this.openCollection=null,this.collectionImages=[],this.collectionImagesCursor="",this.installed=[],this.installedLoading=!1,this.installedError="",this.installedFilter="all",this.syncing="",this.syncNote="",this.pinning="",this.pinVersion="",this.manageKey="",this.managePage=null,this.manageVersion=0,this.manageBusy=!1}get genName(){return this.backend==="invokeai"?"InvokeAI":"Automatic1111"}connectedCallback(){super.connectedCallback(),this.loadCategories(),this.jobTimer=window.setInterval(()=>void this.pollJobs(),5e3)}disconnectedCallback(){super.disconnectedCallback(),this.jobTimer&&clearInterval(this.jobTimer)}async loadCategories(){try{this.categories=(await m.civitaiCategories()).categories}catch{this.categories=[]}}willUpdate(){this.mode!==this.shownMode&&this.applyMode()}get video(){return this.mode==="video"}applyMode(){this.shownMode=this.mode,this.type=this.video?"video":"",this.base="",this.category="",this.tab="browse",this.items=[],this.cursor="",this.jobs=[],this.closeDetail(),this.search(!0),this.pollJobs()}async pollJobs(){if(this.video){try{const{jobs:e,places:t}=await m.comfyInstalls();this.comfyPlaces=t,this.jobs=e.slice(0,5)}catch{}return}try{const t=(await m.civitaiInstalls()).jobs.filter(s=>s.status!=="cancelled").slice(0,5),i=t.some(s=>s.status==="completed")&&!this.jobs.some(s=>s.status==="completed");this.jobs=t,i&&this.tab==="installed"&&this.loadInstalled(!1)}catch{}}async search(e){if(this.loading&&!e)return;const t=e?++this.searchGen:this.searchGen;this.loading=!0,this.error="";try{const i=await m.civitaiSearch({q:this.q||void 0,type:this.type||void 0,category:this.category||void 0,sort:this.sort||void 0,period:this.period||void 0,base:this.base||(this.video?us.map(s=>s.id):void 0),creator:this.creator||void 0,nsfw:this.nsfw,cursor:e?void 0:this.cursor||void 0});if(t!==this.searchGen)return;this.items=e?i.items:[...this.items,...i.items],this.cursor=i.nextCursor??""}catch(i){t===this.searchGen&&(this.error=i.message)}finally{t===this.searchGen&&(this.loading=!1)}}setAnd(e,t){switch(e){case"type":this.type=t;break;case"sort":this.sort=t;break;case"period":this.period=t;break;case"base":this.base=t;break;case"category":this.category=t;break;case"creator":this.creator=t;break}this.tab="browse",this.search(!0)}async openDetail(e){const t=typeof e=="number"?e:e.id;if(typeof e!="number"){this.detail=e;const i=e.versions[0];this.versionId=(i==null?void 0:i.id)??0,this.shownImage=(i==null?void 0:i.images[0])??""}else this.detail=null;this.galleryOpen=!1,this.gallery=[],this.galleryCursor="",this.detailLoading=!0;try{const i=await m.civitaiModel(t);this.detail=i;const s=i.versions.find(a=>a.id===this.versionId)??i.versions[0];this.versionId=(s==null?void 0:s.id)??0,this.shownImage=(s==null?void 0:s.images[0])??this.shownImage}catch(i){this.error=i.message,this.detail||(this.detail=null)}finally{this.detailLoading=!1}}closeDetail(){this.detail=null,this.galleryOpen=!1,this.picked=null}currentVersion(){var e;return(e=this.detail)==null?void 0:e.versions.find(t=>t.id===this.versionId)}pickVersion(e){this.versionId=e.id,this.shownImage=e.images[0]??"",this.galleryOpen&&(this.gallery=[],this.galleryCursor="",this.loadGallery(!0))}async install(e){if(!(this.installing||!e.downloadUrl||!this.detail)){this.installing=!0,this.error="";try{await m.civitaiInstall(e.downloadUrl,this.video?{modelId:this.detail.id,versionId:e.id,target:"comfy",pair:!0}:{modelId:this.detail.id,versionId:e.id}),await this.pollJobs()}catch(t){this.error=t.message}finally{this.installing=!1}}}async loadGallery(e,t){if(!this.galleryLoading){this.galleryLoading=!0;try{const i=await m.civitaiImages({versionId:t?void 0:this.versionId||void 0,username:t,sort:this.gallerySort||void 0,nsfw:this.nsfw,cursor:e?void 0:this.galleryCursor||void 0});t?(this.myImages=e?i.items:[...this.myImages,...i.items],this.myImagesCursor=i.nextCursor??""):(this.gallery=e?i.items:[...this.gallery,...i.items],this.galleryCursor=i.nextCursor??"",this.promptsNeedKey=i.items.length>0&&i.withPrompts===0&&!i.keySet)}catch(i){this.error=i.message}finally{this.galleryLoading=!1}}}toggleGallery(){this.galleryOpen=!this.galleryOpen,this.galleryOpen&&this.gallery.length===0&&this.loadGallery(!0)}usePrompt(e){const t=hs(e);t&&(this.dispatchEvent(new CustomEvent("use-prompt",{detail:t,bubbles:!0,composed:!0})),this.picked=null,this.zoomed="")}async copyPrompt(e){try{await navigator.clipboard.writeText(e.prompt??""),this.copied=!0,setTimeout(()=>this.copied=!1,1500)}catch{}}async loadMe(){if(!this.meLoading){if(this.me){this.loadAccountTab(!1);return}this.meLoading=!0,this.meError="";try{this.me=await m.civitaiMe(),this.myImages=[],this.myImagesCursor="",this.loadMyImages(!0).then(()=>this.loadAccountTab(!1))}catch(e){this.meError=e.message}finally{this.meLoading=!1}}}selectAccountTab(e){this.accountTab=e,this.openPost=null,this.openCollection=null,this.loadAccountTab(!1)}loadAccountTab(e){if(!this.me)return Promise.resolve();switch(this.accountTab){case"models":return e||this.myModels.length===0?this.loadMyModels(!e):Promise.resolve();case"posts":return e||this.posts.length===0?this.loadPosts(!e):Promise.resolve();case"images":return e||this.myImages.length===0?this.loadMyImages(!e):Promise.resolve();case"collections":return e||this.collections.length===0?this.loadCollections(!e):Promise.resolve()}}async loadMyImages(e){if(!(!this.me||this.galleryLoading)){this.galleryLoading=!0;try{const t=await m.civitaiImages({username:this.me.username,sort:"newest",nsfw:this.nsfw,cursor:e?void 0:this.myImagesCursor||void 0});this.myImages=e?t.items:[...this.myImages,...t.items],this.myImagesCursor=t.nextCursor??""}catch(t){this.meError=t.message}finally{this.galleryLoading=!1}}}async loadMyModels(e){if(!(!this.me||this.myModelsLoading)){this.myModelsLoading=!0;try{const t=await m.civitaiSearch({creator:this.me.username,sort:"newest",nsfw:this.nsfw,cursor:e?void 0:this.myModelsCursor||void 0});this.myModels=e?t.items:[...this.myModels,...t.items],this.myModelsCursor=t.nextCursor??""}catch(t){this.meError=t.message}finally{this.myModelsLoading=!1}}}async loadPosts(e){if(!(!this.me||this.postsLoading)){this.postsLoading=!0;try{const t=await m.civitaiPosts({username:this.me.username,nsfw:this.nsfw,cursor:e?void 0:this.postsCursor||void 0});this.posts=e?t.items:Ir(this.posts,t.items),this.postsCursor=t.nextCursor??""}catch(t){this.meError=t.message}finally{this.postsLoading=!1}}}async loadCollections(e){if(!this.collectionsLoading){this.collectionsLoading=!0;try{const t=await m.civitaiCollections({q:this.collectionQuery||void 0,sort:this.collectionSort,cursor:e?void 0:this.collectionsCursor||void 0});this.collections=e?t.items:[...this.collections,...t.items],this.collectionsCursor=t.nextCursor??""}catch(t){this.meError=t.message}finally{this.collectionsLoading=!1}}}async openCollectionPictures(e,t){if(!this.galleryLoading){t&&(this.openCollection=e,this.collectionImages=[],this.collectionImagesCursor=""),this.galleryLoading=!0;try{const i=await m.civitaiImages({collectionId:e.id,sort:"newest",nsfw:this.nsfw,cursor:t?void 0:this.collectionImagesCursor||void 0});this.collectionImages=t?i.items:[...this.collectionImages,...i.items],this.collectionImagesCursor=i.nextCursor??""}catch(i){this.meError=i.message}finally{this.galleryLoading=!1}}}async loadInstalled(e){if(!this.installedLoading){this.installedLoading=!0,this.installedError="";try{this.installed=(await m.civitaiInstalled(e)).models}catch(t){this.installedError=t.message}finally{this.installedLoading=!1}}}async sync(e,t){if(!this.syncing){this.syncing=e.key,this.syncNote="";try{const i=await m.civitaiSync(e.key,t),s="modelId"in i&&i.modelId;this.syncNote=s?`${e.name}: cover, description and trigger words set from “${i.modelName}”.`:`${e.name}: Civitai does not know this file. Paste a version id to link it by hand.`,this.pinning="",this.pinVersion="",await this.loadInstalled(!1)}catch(i){this.syncNote=`${e.name}: ${i.message}`}finally{this.syncing=""}}}async manage(e){if(this.manageKey===e.key){this.manageKey="",this.managePage=null;return}const t=e.civitai;if(t){this.manageKey=e.key,this.managePage=null,this.manageVersion=t.versionId;try{const i=await m.civitaiModel(t.modelId);this.manageKey===e.key&&(this.managePage=i)}catch(i){this.syncNote=`${e.name}: ${i.message}`}}}async chooseCover(e,t){if(!this.manageBusy){this.manageBusy=!0;try{await m.civitaiCover(e.key,t),this.syncNote=`${e.name}: cover set.`,await this.loadInstalled(!1)}catch(i){this.syncNote=`${e.name}: ${i.message}`}finally{this.manageBusy=!1}}}async updateModel(e,t){var a;if(this.manageBusy)return;const i=(a=this.managePage)==null?void 0:a.versions.find(o=>{var n;return o.id===(t??((n=e.civitai)==null?void 0:n.latestVersionId))}),s=i?`version ${i.name}`:"the newest version";if(confirm(`Update “${e.name}” to ${s}? It is downloaded into ${this.genName}, then the current file is deleted.`)){this.manageBusy=!0;try{await m.civitaiUpdate(e.key,t),this.syncNote=`${e.name}: downloading ${s}; the current file goes once it is in.`,this.manageKey="",this.managePage=null,await this.pollJobs()}catch(o){this.syncNote=`${e.name}: ${o.message}`}finally{this.manageBusy=!1}}}async deleteInstalled(e){if(!this.manageBusy&&confirm(`Delete “${e.name}” from ${this.genName}? The file goes with it.`)){this.manageBusy=!0;try{await m.deleteModel(e.key),this.syncNote=`${e.name}: deleted.`,this.manageKey===e.key&&(this.manageKey="",this.managePage=null),this.installed=this.installed.filter(t=>t.key!==e.key)}catch(t){this.syncNote=`${e.name}: ${t.message}`}finally{this.manageBusy=!1}}}selectTab(e){this.tab=e,this.closeDetail(),e==="account"&&this.loadMe(),e==="installed"&&this.installed.length===0&&this.loadInstalled(!1)}jobLabel(e){return e.status==="downloading"&&e.totalBytes?`downloading ${Math.round((e.bytes??0)/e.totalBytes*100)}%`:e.status}render(){return r`
      <div class="wrap">
        <div class="topbar">
          <h2><span class="material-symbols-rounded">travel_explore</span> Civitai</h2>
          <div class="tabs" role="radiogroup" aria-label="What for">
            ${["pictures","video"].map(e=>r`<button role="radio" aria-checked=${this.mode===e?"true":"false"}
                class=${this.mode===e?"on":""} title=${e==="video"?"Wan models and LoRAs for ComfyUI's clips":`Models for ${this.genName}`}
                @click=${()=>this.mode=e}>
                <span class="material-symbols-rounded" style="font-size:16px; vertical-align:-3px;">${e==="video"?"movie":"image"}</span>
                ${e==="video"?"Video":"Pictures"}
              </button>`)}
          </div>
          <div class="tabs" role="tablist">
            ${(this.video?["browse","account"]:["browse","account","installed"]).map(e=>r`<button role="tab" aria-selected=${this.tab===e?"true":"false"}
                class=${this.tab===e?"on":""} @click=${()=>this.selectTab(e)}>
                ${e==="browse"?"Browse":e==="account"?"My account":"Installed"}
              </button>`)}
          </div>
          <div style="margin-left:auto; display:flex; gap:8px; align-items:center;">
            ${this.jobs.length?this.renderJobsChip():d}
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
            </div>`:d}
        ${this.tab==="browse"?this.renderBrowse():this.tab==="account"?this.renderAccount():this.renderInstalled()}
      </div>
      ${this.detail?this.renderDetail(this.detail):d}
      ${this.picked?this.renderPicked(this.picked):this.zoomed?r`<div class="zoom plain" @click=${()=>this.zoomed=""}>
            <img src=${m.civitaiImageURL(this.zoomed)} alt="Preview" />
          </div>`:d}
    `}renderJobsChip(){const e=this.jobs.filter(s=>s.status==="downloading"||s.status==="running"||s.status==="waiting"),t=this.jobs.some(s=>s.status==="error"),i=e.length?e.length===1?this.jobLabel(e[0]):`${e.length} downloading`:`${this.jobs.length} download${this.jobs.length===1?"":"s"}`;return r`<button class="chip small jobs-chip ${this.jobsOpen?"on":""}"
      title=${this.jobsOpen?"Hide the install log":"Show the install log"} aria-expanded=${this.jobsOpen?"true":"false"}
      @click=${()=>this.jobsOpen=!this.jobsOpen}>
      <span class="material-symbols-rounded" style="font-size:15px;">${t?"error":"download"}</span> ${i}
      ${e.length?r`<span class="dot"></span>`:d}
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
          ${Br.map(e=>r`<option value=${e.id} ?selected=${e.id===this.sort}>${e.label}</option>`)}
        </select>
        <select aria-label="Period" .value=${this.period} @change=${e=>this.setAnd("period",e.target.value)}>
          ${Fr.map(e=>r`<option value=${e.id} ?selected=${e.id===this.period}>${e.label}</option>`)}
        </select>
        <select aria-label="Base model" .value=${this.base} @change=${e=>this.setAnd("base",e.target.value)}>
          ${this.video?r`<option value="">Any Wan</option>
                ${us.map(e=>r`<option value=${e.id} ?selected=${e.id===this.base}>${e.label}</option>`)}`:r`<option value="">Any base model</option>
                ${Nr.map(e=>r`<option value=${e} ?selected=${e===this.base}>${e}</option>`)}`}
        </select>
        <select aria-label="Category" .value=${this.category} @change=${e=>this.setAnd("category",e.target.value)}>
          <option value="">All categories</option>
          ${this.categories.map(e=>r`<option value=${e.name} ?selected=${e.name===this.category}>${e.name} (${vt(e.count)})</option>`)}
        </select>
        <button class="chip ${this.nsfw?"on":""}" title="Show adult models" aria-pressed=${this.nsfw?"true":"false"}
          @click=${()=>{this.nsfw=!this.nsfw,this.search(!0)}}>
          <span class="material-symbols-rounded" style="font-size:15px;">explicit</span> NSFW
        </button>
      </div>
      <div class="controls">
        ${(this.video?_r:Er).map(e=>r`<button class="chip ${this.type===e.id?"on":""}" @click=${()=>this.setAnd("type",e.id)}>${e.label}</button>`)}
        ${this.creator?r`<button class="chip on" title="Showing one creator's models" @click=${()=>this.setAnd("creator","")}>
              <span class="material-symbols-rounded" style="font-size:15px;">person</span> ${this.creator}
              <span class="material-symbols-rounded" style="font-size:15px;">close</span>
            </button>`:d}
      </div>
      ${this.error?r`<div class="err">${this.error}</div>`:d}
      <div class="grid">${this.items.map(e=>this.renderCard(e))}</div>
      ${this.loading?r`<div class="note">Searching Civitai…</div>`:this.items.length?this.cursor?r`<button class="more" @click=${()=>this.search(!1)}>Load more</button>`:d:r`<div class="note">No models matched. Try another search.</div>`}
    `}renderCard(e){var i,s;const t=(i=e.versions[0])==null?void 0:i.images[0];return r`
      <button class="card" @click=${()=>this.openDetail(e)}>
        ${t?r`<img src=${m.civitaiImageURL(t)} alt=${e.name} loading="lazy" />`:r`<div class="noimg"><span class="material-symbols-rounded" style="font-size:34px;">image</span></div>`}
        ${e.installed&&!this.video?r`<span class="badge ok"><span class="material-symbols-rounded" style="font-size:13px;">check</span> Installed</span>`:d}
        ${e.nsfw?r`<span class="badge right">18+</span>`:d}
        <div class="meta">
          <div class="name">${e.name}</div>
          <div class="sub">
            <span>${ms(e.type)}</span>
            ${(s=e.versions[0])!=null&&s.base?r`<span>${e.versions[0].base}</span>`:d}
            <span>⤓ ${vt(e.downloads)}</span>
          </div>
        </div>
      </button>
    `}renderDetail(e){var i;const t=this.currentVersion();return r`
      <div class="overlay" @click=${s=>{s.target===s.currentTarget&&this.closeDetail()}}>
        <div class="detail" role="dialog" aria-label=${e.name}>
          <div>
            ${this.shownImage?r`<img class="big" src=${m.civitaiImageURL(this.shownImage)} alt=${e.name}
                  @click=${()=>this.zoomed=this.shownImage} />`:r`<div class="big" style="display:grid; place-items:center;">
                  <span class="material-symbols-rounded" style="font-size:40px; color:var(--oppai-text-muted);">image</span>
                </div>`}
            ${t&&t.images.length>1?r`<div class="thumbs">
                  ${t.images.map(s=>r`<img src=${m.civitaiImageURL(s)} class=${s===this.shownImage?"on":""}
                      alt="Preview" loading="lazy" @click=${()=>this.shownImage=s} />`)}
                </div>`:d}
            ${(i=t==null?void 0:t.files)!=null&&i.length?r`<div class="vlabel">Files</div>
                  <div class="files">
                    ${t.files.map(s=>r`<div class="f">
                        <span>${s.name}</span>
                        <span>${Kt(s.sizeMB)}</span>
                        ${s.format?r`<span>${s.format}</span>`:d}
                        ${s.precision?r`<span>${s.precision}</span>`:d}
                        ${s.primary?r`<span class="material-symbols-rounded" title="Primary file" style="font-size:14px;">star</span>`:d}
                      </div>`)}
                  </div>`:d}
          </div>
          <div>
            <h3>${e.name}</h3>
            <div class="sub">
              <span>${ms(e.type)}</span>
              ${e.creator?r`<button class="creator" title="Show this creator's models" @click=${()=>{this.closeDetail(),this.setAnd("creator",e.creator??"")}}>
                    ${e.creatorImage?r`<img src=${m.civitaiImageURL(e.creatorImage)} alt="" />`:r`<span class="material-symbols-rounded" style="font-size:16px;">person</span>`}
                    ${e.creator}
                  </button>`:d}
              <span>⤓ ${vt(e.downloads)}</span>
              <span>♥ ${vt(e.likes)}</span>
              ${e.nsfw?r`<span>18+</span>`:d}
              <a class="ghost" style="padding:3px 8px; font-size:12px; text-decoration:none;" target="_blank" rel="noopener noreferrer"
                href=${`https://civitai.com/models/${e.id}${t?`?modelVersionId=${t.id}`:""}`}>
                <span class="material-symbols-rounded" style="font-size:14px;">open_in_new</span> civitai.com
              </a>
            </div>
            ${e.versions.length>1?r`<div class="vlabel">Version</div>
                  <div class="versions">
                    ${e.versions.map(s=>r`<button class="chip small ${s.id===this.versionId?"on":""}" @click=${()=>this.pickVersion(s)}>
                        ${s.installed&&!this.video?r`<span class="material-symbols-rounded" style="font-size:14px;">check</span>`:d}
                        ${s.name}<span style="opacity:.7;"> · ${s.base}</span>
                      </button>`)}
                  </div>`:t?r`<div class="vlabel">Version ${t.name} · ${t.base}${t.publishedAt?` · ${jr(t.publishedAt)}`:""}</div>`:d}
            ${t!=null&&t.trainedWords.length?r`<div class="vlabel">Trigger words</div>
                  <div class="words">
                    <span>${t.trainedWords.join(", ")}</span>
                    <button class="ghost" style="padding:3px 8px; font-size:12px; flex-shrink:0;" title="Copy the trigger words"
                      @click=${()=>{var s;return void((s=navigator.clipboard)==null?void 0:s.writeText(t.trainedWords.join(", ")))}}>
                      <span class="material-symbols-rounded" style="font-size:14px;">content_copy</span>
                    </button>
                  </div>`:d}
            ${e.tags.length?r`<div class="vlabel">Tags</div>
                  <div class="tags">
                    ${e.tags.slice(0,14).map(s=>r`<button class="chip small" @click=${()=>{this.closeDetail(),this.setAnd("category",s)}}>${s}</button>`)}
                  </div>`:d}
            ${this.detailLoading&&!e.description?r`<div class="note" style="padding:14px 0;">Loading the model page…</div>`:d}
            ${e.description?r`<div class="vlabel">About</div>
                  <div class="desc">${cs(e.description)}</div>`:d}
            ${t!=null&&t.description&&t.description!==e.description?r`<div class="vlabel">About this version</div>
                  <div class="desc">${cs(t.description)}</div>`:d}
            <div class="actions">
              ${t&&this.video?this.renderComfyInstall(e,t):t?t.installed?r`<button class="primary" disabled>
                      <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span> Installed in ${this.genName}
                    </button>`:this.canManage?r`<button class="primary" ?disabled=${this.installing||!t.downloadUrl} @click=${()=>this.install(t)}>
                        <span class="material-symbols-rounded" style="font-size:18px;">download</span>
                        Install to ${this.genName}${t.sizeMB?` (${Kt(t.sizeMB)})`:""}
                      </button>`:d:d}
              <button class="ghost" @click=${()=>this.toggleGallery()}>
                <span class="material-symbols-rounded" style="font-size:16px;">photo_library</span>
                ${this.galleryOpen?"Hide posted pictures":"Posted pictures & prompts"}
              </button>
            </div>
            ${this.galleryOpen?this.renderGallery():d}
            <div class="sub" style="margin-top:10px;">
              ${this.video?this.comfyPlace(e,t).dir?r`The server downloads into <code>${this.comfyPlace(e,t).dir}</code>, named so the high- and low-noise
                      halves read as a pair. Press <b>Refresh</b> under Settings → Image generation → Video to pick them.`:this.comfyPlace(e,t).problem||r`ComfyUI has no API that takes a download, so installing from here
                      needs the folder ComfyUI keeps ${this.comfyPlace(e,t).what} in set under Settings → Image generation →
                      Video.`:this.canManage?this.backend==="invokeai"?"InvokeAI downloads the file itself; the cover, description and trigger words follow once it is in.":"The server downloads the file into Automatic1111's models folder and asks it to rescan; the cover, description and trigger words follow as A1111's own sidecar files.":this.manageNote||"Automatic1111 has no API that takes a download, so installing from here needs its models folder mapped into the OppaiLib container."}
            </div>
          </div>
        </div>
      </div>
    `}comfyPlace(e,t){var n,l,p;const i=((n=t==null?void 0:t.files)==null?void 0:n.find(u=>u.downloadUrl===t.downloadUrl))??((l=t==null?void 0:t.files)==null?void 0:l.find(u=>u.primary)),s=Ia(e.type,(i==null?void 0:i.name)??""),a=s?Ur[s]:"files of this kind",o=s&&((p=this.comfyPlaces)==null?void 0:p[s]);return{dir:o?o.dir:"",problem:o?o.problem:"",what:a}}renderComfyInstall(e,t){if(!this.comfyPlace(e,t).dir)return d;const i=t.twin?e.versions.find(o=>o.id===t.twin):void 0,s=(t.sizeMB??0)+((i==null?void 0:i.sizeMB)??0),a=i?`Install the pair to ComfyUI — ${t.stage} and ${i.stage} noise`:t.stage?`Install the ${t.stage}-noise half to ComfyUI`:"Install to ComfyUI";return r`<button class="primary" ?disabled=${this.installing||!t.downloadUrl} @click=${()=>this.install(t)}>
      <span class="material-symbols-rounded" style="font-size:18px;">download</span>
      ${a}${s?` (${Kt(s)})`:""}
    </button>`}renderGallery(){return r`
      <div class="controls" style="margin-top:10px;">
        ${[["","Most reactions"],["newest","Newest"],["comments","Most comments"]].map(([e,t])=>r`<button class="chip small ${this.gallerySort===e?"on":""}"
            @click=${()=>{this.gallerySort=e,this.gallery=[],this.galleryCursor="",this.loadGallery(!0)}}>${t}</button>`)}
      </div>
      ${this.promptsNeedKey?r`<div class="sub" style="margin-top:8px;">
            Civitai only shares the prompts behind pictures with an API key — add yours under Settings → Image generation to see them here.
          </div>`:d}
      ${this.gallery.length?r`<div class="gal-grid">
            ${this.gallery.map(e=>r`<button title=${e.prompt?"Has a prompt":"No prompt kept"} @click=${()=>this.picked=e}>
                <img src=${m.civitaiImageURL(e.url)} alt="" loading="lazy" />
                ${e.prompt?r`<span class="has">prompt</span>`:d}
              </button>`)}
          </div>`:d}
      ${this.galleryLoading?r`<div class="note" style="padding:12px 0;">Loading pictures…</div>`:this.gallery.length?this.galleryCursor?r`<button class="more" style="margin-top:8px;" @click=${()=>this.loadGallery(!1)}>More pictures</button>`:d:r`<div class="note" style="padding:12px 0;">Nobody has posted a picture with this version.</div>`}
    `}renderPicked(e){const t=hs(e);return r`
      <div class="zoom ${t?"":"plain"}" @click=${i=>{i.target===i.currentTarget&&(this.picked=null)}}>
        <img src=${m.civitaiImageURL(e.url)} alt="" @click=${()=>this.picked=null} />
        ${t?r`<div class="pane">
              <div style="display:flex; align-items:center; gap:8px; justify-content:space-between;">
                <h4>Prompt${e.username?` · by ${e.username}`:""}</h4>
                <button class="ghost" style="padding:4px 8px;" @click=${()=>this.picked=null}>
                  <span class="material-symbols-rounded" style="font-size:16px;">close</span>
                </button>
              </div>
              <div class="p">${t.prompt}</div>
              ${t.negativePrompt?r`<h4>Negative</h4><div class="p">${t.negativePrompt}</div>`:d}
              <div class="kv">
                ${e.model?r`<span>Model</span><span>${e.model}</span>`:d}
                ${e.sampler?r`<span>Sampler</span><span>${e.sampler}${t.sampler?"":" (not in the studio's list)"}</span>`:d}
                ${t.steps?r`<span>Steps</span><span>${t.steps}</span>`:d}
                ${t.cfgScale?r`<span>CFG</span><span>${t.cfgScale}</span>`:d}
                ${t.seed?r`<span>Seed</span><span>${t.seed}</span>`:d}
                ${t.width?r`<span>Size</span><span>${t.width}×${t.height}</span>`:d}
              </div>
              <div class="actions" style="margin-top:4px;">
                <button class="primary" @click=${()=>this.usePrompt(e)}>
                  <span class="material-symbols-rounded" style="font-size:18px;">auto_awesome</span> Use in the studio
                </button>
                <button class="ghost" @click=${()=>this.copyPrompt(e)}>
                  <span class="material-symbols-rounded" style="font-size:16px;">content_copy</span> ${this.copied?"Copied":"Copy prompt"}
                </button>
              </div>
            </div>`:d}
      </div>
    `}renderAccount(){var i;if(this.meLoading)return r`<div class="note">Asking Civitai whose key this is…</div>`;if(!this.me)return r`<div class="note">
        ${this.meError||"No account to show."}
        <div style="margin-top:8px; font-size:12px;">
          Add your Civitai API key under Settings → Image generation and this page shows your models, posts, pictures and collections.
        </div>
      </div>`;const e=this.me,t=e.cover||((i=this.myImages[0])==null?void 0:i.url)||"";return r`
      <div class="banner">
        <div class="art">
          ${t?r`<img class="cover" src=${m.civitaiImageURL(t)} alt="" />`:d}
          <div class="fade"></div>
          <a class="ghost profile-link" style="text-decoration:none; background:rgba(0,0,0,.4);" target="_blank" rel="noopener noreferrer"
            href=${`https://civitai.com/user/${encodeURIComponent(e.username)}`}>
            <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span> Profile on civitai.com
          </a>
        </div>
        <div class="who">
          ${e.image?r`<img src=${m.civitaiImageURL(e.image)} alt="" />`:r`<div class="noface"><span class="material-symbols-rounded" style="font-size:44px;">account_circle</span></div>`}
          <div class="n">${e.username}</div>
        </div>
      </div>
      <div class="subtabs" role="tablist">
        ${[["models","Models"],["posts","Posts"],["images","Images"],["collections","Collections"]].map(([s,a])=>r`<button role="tab" aria-selected=${this.accountTab===s?"true":"false"}
            class=${this.accountTab===s?"on":""} @click=${()=>this.selectAccountTab(s)}>${a}</button>`)}
      </div>
      ${this.meError?r`<div class="err">${this.meError}</div>`:d}
      ${this.accountTab==="models"?this.renderMyModels():this.accountTab==="posts"?this.renderPosts():this.accountTab==="images"?this.renderMyImages():this.renderCollections()}
    `}renderMyModels(){return r`
      <div class="grid">${this.myModels.map(e=>this.renderCard(e))}</div>
      ${this.myModelsLoading?r`<div class="note">Loading models…</div>`:this.myModels.length?this.myModelsCursor?r`<button class="more" @click=${()=>this.loadMyModels(!1)}>More models</button>`:d:r`<div class="note">No models published.
              <div style="margin-top:6px; font-size:12px;">Uploading goes through civitai.com itself — the site has no public API for it.</div>
            </div>`}
    `}renderPosts(){if(this.openPost){const e=this.openPost;return r`
        <div class="controls">
          <button class="ghost" @click=${()=>this.openPost=null}>
            <span class="material-symbols-rounded" style="font-size:16px;">arrow_back</span> All posts
          </button>
          <span style="font-size:12px; color:var(--oppai-text-muted);">
            ${e.images.length} picture${e.images.length===1?"":"s"}${Vt(e)?` · ${Vt(e)}`:""}
          </span>
          ${e.id>0?r`<a class="ghost" style="margin-left:auto; text-decoration:none;" target="_blank" rel="noopener noreferrer" href=${`https://civitai.com/posts/${e.id}`}>
                <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span> civitai.com
              </a>`:d}
        </div>
        ${this.renderImageGrid(e.images)}
      `}return r`
      <div class="post-grid">
        ${this.posts.map(e=>r`<button class="post" @click=${()=>this.openPost=e}>
            ${e.images[0]?r`<img src=${m.civitaiImageURL(e.images[0].url)} alt="" loading="lazy" />`:d}
            ${e.images.length>1?r`<span class="badge right"><span class="material-symbols-rounded" style="font-size:13px;">photo_library</span> ${e.images.length}</span>`:d}
            <div class="pm"><span>${Vt(e)}</span>${e.images.some(t=>t.prompt)?r`<span>prompt</span>`:d}</div>
          </button>`)}
      </div>
      ${this.postsLoading?r`<div class="note">Loading posts…</div>`:this.posts.length?this.postsCursor?r`<button class="more" @click=${()=>this.loadPosts(!1)}>More posts</button>`:d:r`<div class="note">No posts.</div>`}
    `}renderMyImages(){return r`
      ${this.renderImageGrid(this.myImages)}
      ${this.galleryLoading?r`<div class="note" style="padding:12px 0;">Loading pictures…</div>`:this.myImages.length?this.myImagesCursor?r`<button class="more" @click=${()=>this.loadMyImages(!1)}>More pictures</button>`:d:r`<div class="note" style="padding:12px 0;">No posted pictures.</div>`}
    `}renderImageGrid(e){return e.length?r`<div class="gal-grid">
      ${e.map(t=>r`<button title=${t.prompt?"Has a prompt":"No prompt kept"} @click=${()=>this.picked=t}>
          <img src=${m.civitaiImageURL(t.url)} alt="" loading="lazy" />
          ${t.prompt?r`<span class="has">prompt</span>`:d}
        </button>`)}
    </div>`:d}renderCollections(){var e;if(this.openCollection){const t=this.openCollection;return r`
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
        ${t.description?r`<div class="sub" style="margin-bottom:8px;">${t.description}</div>`:d}
        ${this.renderImageGrid(this.collectionImages)}
        ${this.galleryLoading?r`<div class="note" style="padding:12px 0;">Loading pictures…</div>`:this.collectionImages.length?this.collectionImagesCursor?r`<button class="more" @click=${()=>this.openCollectionPictures(t,!1)}>More pictures</button>`:d:r`<div class="note" style="padding:12px 0;">Nothing the feed will show for this collection.</div>`}
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
            ${t.cover?r`<img src=${m.civitaiImageURL(t.cover)} alt="" loading="lazy" />`:r`<div class="noimg"><span class="material-symbols-rounded" style="font-size:26px;">collections_bookmark</span></div>`}
            <div style="min-width:0;">
              <div class="t">${t.name}${t.nsfw?r` <span style="font-weight:400; color:var(--oppai-text-muted);">18+</span>`:d}</div>
              <div class="d">${t.type} · ${t.count} item${t.count===1?"":"s"}${t.username?` · by ${t.username}`:""}</div>
            </div>
            <span class="material-symbols-rounded" style="font-size:18px; color:var(--oppai-text-muted);">${t.type==="Image"||t.type==="Post"?"chevron_right":"block"}</span>
          </button>`)}
      </div>
      ${this.collectionsLoading?r`<div class="note">Loading collections…</div>`:this.collections.length?this.collectionsCursor?r`<button class="more" @click=${()=>this.loadCollections(!1)}>More collections</button>`:d:r`<div class="note">No collections matched.</div>`}
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
        ${this.backend==="invokeai"?d:r`A1111 knows a file by a short hash until it has been read once, so a model may take a minute to match after it first appears.`}
      </p>
      ${this.syncNote?r`<div class="sync-note" style="color:var(--oppai-text);">${this.syncNote}</div>`:d}
      ${this.installedError?r`<div class="err">${this.installedError}</div>`:d}
      ${this.installedLoading&&!this.installed.length?r`<div class="note">Reading the studio's models and asking Civitai about the new ones…</div>`:d}
      <div class="rows">
        ${e.map(i=>this.renderInstalledRow(i))}
      </div>
      ${!this.installedLoading&&this.installed.length&&!e.length?r`<div class="note">Nothing here.</div>`:d}
    `}renderInstalledRow(e){const t=e.civitai,i=e.hasCover?e.type==="lora"?m.loraThumbURL(e.name):m.modelThumbURL(e.key):"",s=this.manageKey===e.key;return r`
      <div class="row">
        ${i?r`<img src=${i} alt="" loading="lazy" />`:r`<div class="noimg"><span class="material-symbols-rounded" style="font-size:26px;">deployed_code</span></div>`}
        <div style="min-width:0;">
          <div class="t">${e.name}</div>
          <div class="d">
            <span>${e.type}</span>
            ${e.base?r`<span>${e.base}</span>`:d}
            ${t?r`<span>· ${t.modelName}${t.versionName?` (${t.versionName})`:""}${t.creator?` by ${t.creator}`:""}</span>
                  ${t.updateAvailable?r`<span class="upd"><span class="material-symbols-rounded" style="font-size:14px;">new_releases</span> newer version</span>`:d}`:r`<span>· not found on Civitai by hash</span>`}
          </div>
          ${t!=null&&t.previews.length&&!s?r`<div class="previews">
                ${t.previews.slice(0,6).map(a=>r`<img src=${m.civitaiImageURL(a)} alt="" loading="lazy" @click=${()=>this.zoomed=a} />`)}
              </div>`:d}
          ${this.pinning===e.key?r`<div class="pin">
                <input type="text" placeholder="Civitai version id" .value=${this.pinVersion}
                  @input=${a=>this.pinVersion=a.target.value} />
                <button class="ghost" ?disabled=${!/^\d+$/.test(this.pinVersion.trim())} @click=${()=>this.sync(e,Number(this.pinVersion.trim()))}>Link</button>
                <button class="ghost" @click=${()=>this.pinning=""}>Cancel</button>
              </div>`:d}
        </div>
        <div class="rb">
          ${t?r`<button class="ghost" title="Open the model page" @click=${()=>this.openDetail(t.modelId)}>
                <span class="material-symbols-rounded" style="font-size:16px;">travel_explore</span> Page
              </button>`:d}
          ${t!=null&&t.updateAvailable&&this.canManage?r`<button class="ghost" title="Download the newest version and delete this one once it is in"
                ?disabled=${this.manageBusy} @click=${()=>this.updateModel(e)}>
                <span class="material-symbols-rounded" style="font-size:16px;">published_with_changes</span> Update
              </button>`:d}
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
          </button>`:d}
        </div>
        ${s&&t?this.renderManage(e):d}
      </div>
    `}renderManage(e){const t=e.civitai,i=this.managePage;if(!i)return r`<div class="manage"><div class="note" style="padding:8px 0;">Loading the model page…</div></div>`;const s=i.versions.find(n=>n.id===this.manageVersion)??i.versions[0],a=(s==null?void 0:s.id)===t.versionId,o=t.coverUrl||t.previews[0]||"";return r`
      <div class="manage">
        <div class="vlabel" style="margin-top:0;">Version</div>
        <div class="versions">
          ${i.versions.map(n=>r`<button class="chip small ${n.id===(s==null?void 0:s.id)?"on":""}" @click=${()=>this.manageVersion=n.id}>
              ${n.id===t.versionId?r`<span class="material-symbols-rounded" style="font-size:14px;">check</span>`:d}
              ${n.name}<span style="opacity:.7;"> · ${n.base}</span>
            </button>`)}
        </div>
        ${s&&!a?r`<div class="actions" style="margin-top:8px;">
              ${this.canManage?r`<button class="ghost" ?disabled=${this.manageBusy} title="Download this version and delete the current file once it is in"
                @click=${()=>this.updateModel(e,s.id)}>
                <span class="material-symbols-rounded" style="font-size:16px;">published_with_changes</span> Install ${s.name}, replacing the current file
              </button>`:d}
              <button class="ghost" ?disabled=${this.syncing===e.key} title="Keep the current file, but take this version's description, trigger words and pictures"
                @click=${()=>this.sync(e,s.id)}>
                <span class="material-symbols-rounded" style="font-size:16px;">link</span> Link to ${s.name} without downloading
              </button>
            </div>`:d}
        ${s!=null&&s.images.length?r`<div class="vlabel">Cover${a?"":` (from ${s.name})`}</div>
              <div class="covers">
                ${s.images.map(n=>r`<button class=${n===o?"on":""} title="Use as the cover" ?disabled=${this.manageBusy} @click=${()=>this.chooseCover(e,n)}>
                    <img src=${m.civitaiImageURL(n)} alt="" loading="lazy" />
                    ${n===o?r`<span class="tick"><span class="material-symbols-rounded" style="font-size:13px;">check</span></span>`:d}
                  </button>`)}
              </div>`:r`<div class="sub" style="margin-top:8px;">This version has no showcase pictures.</div>`}
      </div>
    `}};$.styles=[ue,Oe,re`
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
    `];k([z()],$.prototype,"backend",2);k([z({type:Boolean})],$.prototype,"canManage",2);k([z()],$.prototype,"manageNote",2);k([z()],$.prototype,"mode",2);k([c()],$.prototype,"tab",2);k([c()],$.prototype,"q",2);k([c()],$.prototype,"type",2);k([c()],$.prototype,"sort",2);k([c()],$.prototype,"period",2);k([c()],$.prototype,"base",2);k([c()],$.prototype,"category",2);k([c()],$.prototype,"creator",2);k([c()],$.prototype,"nsfw",2);k([c()],$.prototype,"categories",2);k([c()],$.prototype,"items",2);k([c()],$.prototype,"cursor",2);k([c()],$.prototype,"loading",2);k([c()],$.prototype,"error",2);k([c()],$.prototype,"detail",2);k([c()],$.prototype,"detailLoading",2);k([c()],$.prototype,"versionId",2);k([c()],$.prototype,"shownImage",2);k([c()],$.prototype,"zoomed",2);k([c()],$.prototype,"galleryOpen",2);k([c()],$.prototype,"gallery",2);k([c()],$.prototype,"galleryCursor",2);k([c()],$.prototype,"galleryLoading",2);k([c()],$.prototype,"gallerySort",2);k([c()],$.prototype,"picked",2);k([c()],$.prototype,"copied",2);k([c()],$.prototype,"promptsNeedKey",2);k([c()],$.prototype,"jobs",2);k([c()],$.prototype,"installing",2);k([c()],$.prototype,"jobsOpen",2);k([c()],$.prototype,"comfyPlaces",2);k([c()],$.prototype,"me",2);k([c()],$.prototype,"meError",2);k([c()],$.prototype,"meLoading",2);k([c()],$.prototype,"accountTab",2);k([c()],$.prototype,"myImages",2);k([c()],$.prototype,"myImagesCursor",2);k([c()],$.prototype,"myModels",2);k([c()],$.prototype,"myModelsCursor",2);k([c()],$.prototype,"myModelsLoading",2);k([c()],$.prototype,"posts",2);k([c()],$.prototype,"postsCursor",2);k([c()],$.prototype,"postsLoading",2);k([c()],$.prototype,"openPost",2);k([c()],$.prototype,"collections",2);k([c()],$.prototype,"collectionsCursor",2);k([c()],$.prototype,"collectionsLoading",2);k([c()],$.prototype,"collectionQuery",2);k([c()],$.prototype,"collectionSort",2);k([c()],$.prototype,"openCollection",2);k([c()],$.prototype,"collectionImages",2);k([c()],$.prototype,"collectionImagesCursor",2);k([c()],$.prototype,"installed",2);k([c()],$.prototype,"installedLoading",2);k([c()],$.prototype,"installedError",2);k([c()],$.prototype,"installedFilter",2);k([c()],$.prototype,"syncing",2);k([c()],$.prototype,"syncNote",2);k([c()],$.prototype,"pinning",2);k([c()],$.prototype,"pinVersion",2);k([c()],$.prototype,"manageKey",2);k([c()],$.prototype,"managePage",2);k([c()],$.prototype,"manageVersion",2);k([c()],$.prototype,"manageBusy",2);$=k([ge("oppai-civitai")],$);const Ur={diffusion_models:"Wan models",checkpoints:"all-in-one checkpoints",loras:"LoRAs",vae:"VAEs"};function ms(e){switch(e){case"Checkpoint":return"Checkpoint";case"LORA":return"LoRA";case"LoCon":return"LoCon";case"DoRA":return"DoRA";case"TextualInversion":return"Embedding";case"Controlnet":return"ControlNet";default:return e}}function vt(e){return e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e3?`${(e/1e3).toFixed(1)}k`:String(e)}function Kt(e){return e>=1024?`${(e/1024).toFixed(1)} GB`:`${e} MB`}function jr(e){const t=new Date(e);return Number.isNaN(t.getTime())?"":t.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}const qr={waiting:"Waiting for the GPU",receiving:"Receiving the pictures",loading:"Loading the checkpoint",caching:"Preparing the pictures",training:"Training",sampling:"Rendering a sample",saving:"Saving",done:"Finished — installing next",error:"Stopping",cancelled:"Stopping"},Wr={preparing:"Sending the pictures",queued:"Waiting for the GPU",training:"Training",installing:"Installing into the generator",done:"Ready to use",failed:"Failed",cancelled:"Cancelled"};function Yt(e){return e.status==="preparing"||e.status==="queued"||e.status==="training"||e.status==="installing"}function Gr(e){return e.status==="done"||e.status==="installing"?1:!e.total||e.total<=0||e.step===void 0?null:Math.max(0,Math.min(1,e.step/e.total))}function Hr(e){if(e.status==="failed")return e.error?`Failed: ${e.error}`:"Failed";if(e.status!=="training")return Wr[e.status]??e.status;const t=qr[e.phase??""]??"Training";if(e.phase!=="training"||!e.total)return t;const i=[`Step ${e.step??0} of ${e.total}`];return e.epoch&&e.epochs&&i.push(`epoch ${e.epoch}/${e.epochs}`),e.eta&&e.eta!=="?"&&e.eta!=="00:00"&&i.push(`${e.eta} left`),e.loss&&i.push(`loss ${e.loss.toFixed(3)}`),i.join(" · ")}function Vr(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"")}function Kr(e,t){const i=t.trim().toLowerCase();return e.some(s=>s.trim().toLowerCase()===i)?e.filter(s=>s.trim().toLowerCase()!==i):[...e,t.trim()]}const tt={captions:"tags",epochs:10,repeats:0,rank:0,alpha:0,resolution:0,learningRate:1e-4,textEncoderLr:0,optimizer:"AdamW8bit",noiseOffset:0,flip:!1},Yr=/\b(hair|bangs|ahoge|sidelocks|ponytail|twintails|braids?|bun|eyes|pupils|heterochromia|eyebrows|eyelashes|skin|skinned|freckles|mole|scar|breasts|ears|tail|horns|wings|halo|fangs?|lips|muscular|tan|tanlines|body)\b/i,Xr=/\b(style|medium|traditional|digital|painting|watercolor|watercolour|oil|acrylic|sketch|lineart|line art|ink|inking|monochrome|greyscale|grayscale|sepia|realistic|photorealistic|3d|cel|shading|flat color|flat colour|pixel art|retro|oekaki|pastel|limited palette|halftone|screentone|chibi|anime coloring|painterly|impasto|chromatic aberration|film grain|bokeh)\b/i,Zr=/\b(dress|shirt|blouse|skirt|shorts|pants|jeans|jacket|coat|hoodie|sweater|cardigan|vest|uniform|suit|armor|armour|kimono|yukata|apron|cape|cloak|robe|bodysuit|leotard|swimsuit|bikini|lingerie|bra|panties|thighhighs|pantyhose|stockings|socks|boots|shoes|heels|sandals|gloves|sleeves|collar|choker|necklace|earrings|ribbon|bow|hat|cap|helmet|headband|hairband|hair ornament|belt|tie|necktie|scarf|frills|lace|buttons|zipper|hood|mask|glasses|eyewear|bag|weapon|sword|staff)\b/i,Tt=[{id:"character",icon:"face",title:"A character or person",blurb:"One face and body, in whatever outfit or pose the prompt asks for.",examples:"Your OC, a game character, yourself",pictures:{min:8,ideal:[15,40]},tips:["Vary everything except who it is: outfits, poses, backgrounds, lighting.","Mix close-ups of the face with half- and full-body pictures.","Leave out pictures with other people in them, or crop them away first."],captionsWhy:"Each picture is captioned with its tags, minus her hair, eyes and build — so those go into the trigger word, and her clothes and pose stay up to the prompt.",settings:{...tt,textEncoderLr:5e-5},absorb:Yr},{id:"style",icon:"palette",title:"An art style",blurb:"A way of drawing or rendering, applied to anything you prompt.",examples:"An artist's look, a medium, a game's art",pictures:{min:20,ideal:[30,100]},tips:["Many different subjects drawn the same way — the style is what they share.","Avoid one character dominating the set, or the style comes with her face.","Skip pictures with text, watermarks or signatures where you can."],captionsWhy:"Each picture is captioned with what is in it, minus the tags about how it is drawn — so the subject stays promptable and the look goes into the trigger word.",settings:{...tt,epochs:12,flip:!0,noiseOffset:.05,textEncoderLr:5e-5},absorb:Xr},{id:"concept",icon:"directions_walk",title:"A pose or concept",blurb:"An action, a composition, an effect — on anyone.",examples:"A pose, a camera angle, a lighting effect",pictures:{min:10,ideal:[20,60]},tips:["The concept is the only thing every picture should have in common.","Use different characters, outfits and places so none of them sticks."],captionsWhy:"Each picture is captioned with its tags. Strike out the ones that describe the concept itself, so the trigger word comes to mean it.",settings:{...tt,flip:!0}},{id:"outfit",icon:"checkroom",title:"An outfit or object",blurb:"A piece of clothing or a thing, worn or held by anyone.",examples:"A uniform, a dress, a weapon, a prop",pictures:{min:10,ideal:[15,50]},tips:["Show it from several angles, on different people if you can.","Leave mirroring off if it has text, a logo or a one-sided detail."],captionsWhy:"Each picture is captioned with its tags, minus the parts of the outfit every picture shares — those go into the trigger word, everything else stays promptable.",settings:{...tt,flip:!0},absorb:Zr},{id:"custom",icon:"tune",title:"Something else",blurb:"The trainer's defaults, with every setting yours to change.",examples:"For when you know what you want",pictures:{min:5,ideal:[15,60]},tips:["Pictures that share what you want learnt, and differ in everything else."],captionsWhy:"Each picture is captioned with its tags. Strike out what the trigger word should stand for.",settings:{...tt}}];function Te(e){return Tt.find(t=>t.id===e)??Tt[Tt.length-1]}const ki=[{id:"quick",title:"Quick test",blurb:"About half as long — to see whether the set works",scale:.5},{id:"balanced",title:"Balanced",blurb:"The preset's own length",scale:1},{id:"thorough",title:"Thorough",blurb:"Half as long again, for a large or subtle set",scale:1.5}];function gs(e,t){var s;const i=((s=ki.find(a=>a.id===t))==null?void 0:s.scale)??1;return Math.max(2,Math.round(e.settings.epochs*i))}function Jr(e){return e<=0?10:Math.max(1,Math.min(Math.floor((200+Math.floor(e/2))/e),40))}function Qr(e,t,i=0){return e<=0?0:e*(i>0?i:Jr(e))*Math.max(1,t)}function en(e,t,i){if(!e.absorb||i<=0)return[];const s=Math.max(2,Math.ceil(i/2));return t.filter(a=>a.count>=Math.min(s,i)&&e.absorb.test(a.name.replace(/_/g," "))).map(a=>a.name)}function tn(e,t){const i=[],{min:s,ideal:a}=e.pictures,o=e.title.toLowerCase().replace(/^an? /,"");return t.count===0?[{level:"bad",text:"No pictures yet. Add some from the library, your computer or an X account."}]:(t.count<s?i.push({level:"bad",text:`${t.count} picture${t.count===1?"":"s"} is too few for ${o} — aim for ${a[0]}–${a[1]}, and at least ${s}.`}):t.count<a[0]?i.push({level:"warn",text:`${t.count} pictures will work, but ${a[0]}–${a[1]} train a steadier LoRA.`}):t.count>a[1]*3&&i.push({level:"warn",text:`${t.count} pictures is more than ${o} needs — it will train slower, not better. The best ${a[1]} or so are plenty.`}),t.captions==="tags"&&t.untagged>0&&i.push({level:"warn",text:`${t.untagged} picture${t.untagged===1?" has":"s have"} no tags, so ${t.untagged===1?"it":"they"} would be captioned with the trigger word alone. Tag them in the next step.`}),t.small>0&&i.push({level:"warn",text:`${t.small} picture${t.small===1?" is":"s are"} small for this checkpoint: ${t.small===1?"it is":"they are"} enlarged to train, which is softer than a larger original. Swap ${t.small===1?"it":"them"} for larger ones if you have them.`}),i.length===0&&i.push({level:"good",text:`${t.count} pictures — a good size for ${o}.`}),i)}function N(e){let t=e.trim();return/[a-z]/i.test(t)&&(t=t.replace(/_/g," ")),t.toLowerCase().split(/\s+/).filter(Boolean).join(" ")}function sn(e,t,i,s,a=[]){const o=e.trim(),n=o?[o]:[],l=new Set([N(o)]),p=new Set(a.map(N));for(const h of t){const g=N(h);p.has(g)&&!l.has(g)&&(l.add(g),n.push(h))}if(s==="trigger")return n.join(", ");const u=new Set(i.map(N));for(const h of t){const g=N(h);if(!(!g||l.has(g)||u.has(g))&&(l.add(g),n.push(h),n.length>40))break}return n.join(", ")}function Si(e){return/xl|pony|illustrious|noob/i.test(e??"")?768:448}function an(e,t){return e?Si(t)>448?e<12*1024:e<6*1024:!1}const on=[{keep:.66,label:"A bit less"},{keep:.5,label:"Half as often"},{keep:.25,label:"Rarely"}],rn=.5;function Ge(e,t){const i=N(t);return e.some(s=>N(s.tag)===i)}function fs(e,t){const i=N(t);return Ge(e,t)?e.filter(s=>N(s.tag)!==i):[...e,{tag:t,keep:rn}]}function nn(e,t,i){const s=N(t);return e.map(a=>N(a.tag)===s?{...a,keep:i}:a)}function ln(e){return e.map(t=>t.tag)}function bs(e){return`${Math.round(e*100)}%`}function pn(e,t){if(!e||t<=0)return"";if(e.pictures===0)return"No picture has this tag any more.";if(e.pictures>=t)return"Every picture has it, so there is nothing to show more often instead — it is named in the captions, but can't be made rarer. Add pictures without it.";const i=bs(e.before),s=bs(e.after);return s===i?`${e.pictures} of ${t} pictures (${i}) — too few repeats to shift; it is still named in their captions.`:`${e.pictures} of ${t} pictures (${i}) — trained as about ${s}, and named in their captions.`}function vs(e,t){const i=N(t);return i?e.filter(s=>!s.tags.some(a=>N(a.name)===i)).map(s=>s.id):[]}const Xt=256;function dn(e,t,i){let s=e>0?e:cn(t)?512:1024;return i&&s>768&&(s=768),Math.floor(s/64)*64}function cn(e){const t=e.toLowerCase();return/xl|pony|illustrious|noob/.test(t)?!1:/sd ?1|1\.5|sd15/.test(t)}function hn(e,t,i){if(e<=0||t<=0||i<=0)return{width:0,height:0};const s=Math.sqrt(i*i/(e*t)),a=Math.max(i*2,1024),o=p=>Math.min(Math.max(Math.floor(p/64)*64,Xt),a);let n=o(e*s),l=o(t*s);for(;n*l>i*i&&(n>Xt||l>Xt);)n>=l?n-=64:l-=64;return{width:n,height:l}}function un(e,t){let i=0;for(const s of e){if(!s.width||!s.height)continue;const a=hn(s.width,s.height,t);Math.max(a.width/s.width,a.height/s.height)>1.25&&i++}return i}const Mt=re`
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
`,pa=["ai_generated","ai-created","ai_assisted","stable_diffusion","novelai","midjourney"],mn=["animated","video"];function gn(e,t){const i=e.trim().split(/\s+/).filter(Boolean),s=new Set(i.map(o=>o.toLowerCase())),a=[...mn,...t?pa:[]].filter(o=>!s.has(o)&&!s.has(`-${o}`)).map(o=>`-${o}`);return[...i,...a].join(" ")}function fn(e,t){const i=new Set(pa);return e.filter(s=>!(s.kind==="video"||s.kind==="gif"||t&&(s.tags??[]).some(a=>i.has(a.toLowerCase()))))}var bn=Object.defineProperty,vn=Object.getOwnPropertyDescriptor,X=(e,t,i,s)=>{for(var a=s>1?void 0:s?vn(t,i):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(a=(s?n(t,i,a):n(a))||a);return s&&a&&bn(t,i,a),a};const xn=/^image\/(jpeg|png|webp|bmp)$/,yn=3;let G=class extends me{constructor(){super(...arguments),this.mode="upload",this.setId=0,this.setName="",this.files=[],this.dragging=!1,this.progress=null,this.user="",this.page=null,this.pictures=[],this.dropped=new Set,this.cursor="",this.loading=!1,this.reposts=!1,this.task=null,this.error="",this.tags="",this.noAI=!0,this.r34Sort="score",this.posts=[],this.r34Cursor="",this.r34Searched=""}disconnectedCallback(){super.disconnectedCallback();for(const e of this.files)URL.revokeObjectURL(e.url)}render(){return this.mode==="rule34"?this.renderRule34():this.mode==="upload"?this.renderUpload():this.renderX()}addFiles(e){if(!e)return;const t=new Set(this.files.map(a=>a.key)),i=[];let s=0;for(const a of Array.from(e)){if(!xn.test(a.type)){s++;continue}const o=`${a.name}:${a.size}:${a.lastModified}`;t.has(o)||(t.add(o),i.push({key:o,file:a,url:URL.createObjectURL(a),keep:!0}))}this.files=[...this.files,...i],this.error=s?`${s} file${s===1?" isn't a still picture":"s aren't still pictures"} (GIFs and videos can't be trained on) and ${s===1?"was":"were"} left out.`:""}toggleFile(e){this.files=this.files.map(t=>t.key===e?{...t,keep:!t.keep}:t)}setAllFiles(e){this.files=this.files.map(t=>({...t,keep:e}))}clearFiles(){for(const e of this.files)URL.revokeObjectURL(e.url);this.files=[],this.error=""}async target(){if(this.setId>0)return this.setId;const e=await m.trainSetCreate(this.setName.trim()||"Training set");return this.setId=e.id,e.id}async uploadKept(){const e=this.files.filter(t=>t.keep);if(!(!e.length||this.progress)){this.error="",this.progress={done:0,total:e.length,failed:0};try{const t=await this.target();let i=0,s="";const a=async()=>{for(;i<e.length;){const n=e[i++];try{await m.trainSetUpload(t,n.file),this.progress={...this.progress,done:this.progress.done+1}}catch(l){s=l.message,this.progress={...this.progress,failed:this.progress.failed+1}}}};if(await Promise.all(Array.from({length:Math.min(yn,e.length)},a)),!this.progress.done)throw new Error(s||"None of the pictures could be uploaded.");const o=this.progress.failed;this.clearFiles(),o&&(this.error=`${o} picture${o===1?"":"s"} couldn't be added (${s}).`),this.dispatchEvent(new CustomEvent("gathered",{detail:{setId:t}}))}catch(t){this.error=t.message}finally{this.progress=null}}}renderUpload(){const e=this.files.filter(t=>t.keep).length;return r`
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
      ${this.error?r`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>`:d}
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
            </div>`:d}
    `}get shown(){return this.reposts?this.pictures:this.pictures.filter(e=>!e.repost)}get kept(){return this.shown.filter(e=>!this.dropped.has(e.id))}async find(){const e=this.user.trim();if(!(!e||this.loading)){this.loading=!0,this.error="",this.page=null,this.pictures=[],this.dropped=new Set,this.cursor="";try{const t=await m.trainTwitter(e);this.page=t,this.pictures=t.pictures,this.cursor=t.cursor??"",t.pictures.length&&t.pictures.every(i=>i.repost)&&(this.reposts=!0),this.cursor&&await this.more(2)}catch(t){this.error=t.message}finally{this.loading=!1}}}async more(e=3){var i;if(!((i=this.page)!=null&&i.account)||!this.cursor)return;const t=this.page.account.screenName;this.loading=!0,this.error="";try{for(let s=0;s<e&&this.cursor;s++){const a=await m.trainTwitter(t,this.cursor),o=new Set(this.pictures.map(n=>n.id));this.pictures=[...this.pictures,...a.pictures.filter(n=>!o.has(n.id))],this.cursor=a.cursor??""}}catch(s){this.error=`${s.message}`}finally{this.loading=!1}}togglePicture(e){const t=new Set(this.dropped);t.has(e)?t.delete(e):t.add(e),this.dropped=t}async importKept(){var i,s;const e=this.kept;if(!e.length||this.task)return;const t=((s=(i=this.page)==null?void 0:i.account)==null?void 0:s.screenName)??"";this.error="";try{let a=await m.trainImport({items:e.map(o=>({url:o.url,source:o.tweetUrl,title:`@${t}${o.text?` — ${o.text.split(`
`)[0]}`:""}`})),setId:this.setId||void 0,setName:this.setName||`@${t}`});for(this.task=a;!a.finished;){if(await new Promise(o=>setTimeout(o,1e3)),!this.isConnected)return;a=await m.trainTask(a.id),this.task=a}if(a.error)throw new Error(a.error);a.failed&&(this.error=`${a.failed} picture${a.failed===1?"":"s"} couldn't be downloaded and ${a.failed===1?"was":"were"} skipped.`),this.setId=a.setId??this.setId,this.pictures=[],this.page=null,this.dispatchEvent(new CustomEvent("gathered",{detail:{setId:a.setId}}))}catch(a){this.error=a.message}finally{this.task=null}}renderX(){var a;const e=this.shown,t=this.kept.length,i=this.pictures.filter(o=>o.repost).length,s=(a=this.page)==null?void 0:a.account;return r`
      <form class="search" @submit=${o=>{o.preventDefault(),this.find()}}>
        <input type="text" placeholder="@artist, or a link to their profile" .value=${this.user}
          @input=${o=>this.user=o.target.value} />
        <button class="btn primary" type="submit" ?disabled=${!this.user.trim()||this.loading}>
          <span class="material-symbols-rounded">search</span> ${this.loading&&!this.pictures.length?"Looking…":"Find pictures"}
        </button>
      </form>
      <div class="note">Reads the account's Media tab through a public mirror — no X account needed. Only the pictures you keep are downloaded.</div>
      ${this.error?r`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>`:d}
      ${s?r`<div class="account">
            ${s.avatar?r`<img src=${m.proxyURL(s.avatar)} alt="" />`:d}
            <div class="who">${s.name}<small>@${s.screenName} · ${s.mediaCount.toLocaleString()} posts with media</small></div>
          </div>
          ${s.protected?r`<div class="banner info"><span class="material-symbols-rounded">lock</span>This account is protected, so its posts can't be seen from outside.</div>`:d}`:d}
      ${this.pictures.length?r`
            <div class="toolbar">
              <span class="count">${t} of ${e.length} kept</span>
              ${i?r`<label class="check" style="margin:0;"><input type="checkbox" .checked=${this.reposts}
                    @change=${o=>this.reposts=o.target.checked} />Show ${i} repost${i===1?"":"s"}</label>`:d}
              <button class="btn small ghost" @click=${()=>this.dropped=new Set}>Keep all</button>
              <button class="btn small ghost" @click=${()=>this.dropped=new Set(e.map(o=>o.id))}>Keep none</button>
            </div>
            <div class="picks">
              ${e.map(o=>{const n=!this.dropped.has(o.id),l=o.width&&o.height&&Math.min(o.width,o.height)<640;return r`<button class="pick ${n?"on":"off"}" title=${o.text??""} @click=${()=>this.togglePicture(o.id)}>
                  <img src=${m.proxyURL(o.thumb)} alt="" loading="lazy" />
                  <span class="mark"><span class="material-symbols-rounded">${n?"check":"close"}</span></span>
                  ${o.repost?r`<span class="badge">repost</span>`:l?r`<span class="badge">small</span>`:d}
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
            </div>`:s&&!this.loading&&!s.protected?r`<div class="empty"><span class="material-symbols-rounded">image</span>No pictures on this account's Media tab.</div>`:d}
    `}get keptPosts(){return this.posts.filter(e=>!this.dropped.has(e.id))}async searchRule34(){const e=this.tags.trim();!e||this.loading||(this.posts=[],this.dropped=new Set,this.r34Cursor="",this.r34Searched=gn(e,this.noAI),await this.moreRule34(2))}async moreRule34(e=2){const t=this.r34Searched;if(!(!t||this.loading)){this.loading=!0,this.error="";try{for(let i=0;i<e;i++){const s=await m.browseSource("rule34",{feed:"search",q:t,sort:this.r34Sort,cursor:this.r34Cursor||void 0});if(t!==this.r34Searched)return;const a=new Set(this.posts.map(o=>o.id));if(this.posts=[...this.posts,...fn(s.items,this.noAI).filter(o=>!a.has(o.id))],this.r34Cursor=s.cursor??"",!this.r34Cursor)break}this.posts.length||(this.error="Nothing on Rule34 matches those tags.")}catch(i){const s=i.message;this.error=/\b403\b|credentials/.test(s)?`Rule34 turned the search away (${s}). Add your Rule34 user id and API key under Settings → Import & scraping — searches then go through its API.`:s}finally{this.loading=!1}}}async importPosts(){const e=this.keptPosts;if(!(!e.length||this.task)){this.error="";try{let t=await m.trainImport({items:e.map(i=>({url:i.mediaUrl??"",source:i.pageUrl??"",title:i.title,post:i.mediaUrl?void 0:{source:"rule34",feed:i.feedId??`post:${i.id}`}})),setId:this.setId||void 0,setName:this.setName||`Rule34 · ${this.tags.trim()}`});for(this.task=t;!t.finished;){if(await new Promise(i=>setTimeout(i,1e3)),!this.isConnected)return;t=await m.trainTask(t.id),this.task=t}if(t.error)throw new Error(t.error);t.failed&&(this.error=`${t.failed} picture${t.failed===1?"":"s"} couldn't be downloaded and ${t.failed===1?"was":"were"} skipped.`),this.setId=t.setId??this.setId,this.posts=[],this.r34Searched="",this.dispatchEvent(new CustomEvent("gathered",{detail:{setId:t.setId}}))}catch(t){this.error=t.message}finally{this.task=null}}}renderRule34(){const e=this.keptPosts.length;return r`
      <form class="search" @submit=${t=>{t.preventDefault(),this.searchRule34()}}>
        <input type="text" placeholder="Tags: an artist, a character, a style — e.g. artist_name solo" .value=${this.tags}
          @input=${t=>this.tags=t.target.value} />
        <button class="btn primary" type="submit" ?disabled=${!this.tags.trim()||this.loading}>
          <span class="material-symbols-rounded">search</span> ${this.loading&&!this.posts.length?"Looking…":"Find pictures"}
        </button>
      </form>
      <div class="toolbar" style="margin-top:10px;">
        <label class="check" style="margin:0;"><input type="checkbox" .checked=${this.noAI}
          @change=${t=>this.noAI=t.target.checked} />Leave out AI pictures</label>
        <div class="seg small">
          <button class=${this.r34Sort==="score"?"on":""} @click=${()=>this.r34Sort="score"}>Top score</button>
          <button class=${this.r34Sort==="newest"?"on":""} @click=${()=>this.r34Sort="newest"}>Newest</button>
        </div>
      </div>
      <div class="note">Searches Rule34 with your tags${this.noAI?r`, leaving out <b>ai_generated</b> and the other AI tags — a LoRA trained on another model's pictures learns its mistakes`:d}.
        Videos and animations are left out. Only the pictures you keep are downloaded.</div>
      ${this.error?r`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>`:d}
      ${this.posts.length?r`
            <div class="toolbar">
              <span class="count">${e} of ${this.posts.length} kept</span>
              <button class="btn small ghost" @click=${()=>this.dropped=new Set}>Keep all</button>
              <button class="btn small ghost" @click=${()=>this.dropped=new Set(this.posts.map(t=>t.id))}>Keep none</button>
            </div>
            <div class="picks">
              ${this.posts.map(t=>{const i=!this.dropped.has(t.id),s=t.width&&t.height&&Math.min(t.width,t.height)<640;return r`<button class="pick ${i?"on":"off"}" title=${(t.tags??[]).slice(0,30).join(" ")}
                    @click=${()=>this.togglePicture(t.id)}>
                  <img src=${m.sourceStreamURL(t.thumbUrl)} alt="" loading="lazy" />
                  <span class="mark"><span class="material-symbols-rounded">${i?"check":"close"}</span></span>
                  ${s?r`<span class="badge">small</span>`:d}
                </button>`})}
            </div>
            ${this.r34Cursor?r`<div class="more"><button class="btn" ?disabled=${this.loading} @click=${()=>this.moreRule34()}>
                  <span class="material-symbols-rounded">${this.loading?"hourglass_top":"expand_more"}</span> ${this.loading?"Loading…":"Load more"}
                </button></div>`:r`<div class="note" style="text-align:center;">That's everything for those tags.</div>`}
            <div class="footer">
              ${this.task?r`<div class="what">Downloading ${this.task.done+this.task.failed} of ${this.task.total}…</div>
                    <div class="bar"><div style="width:${this.task.total?(this.task.done+this.task.failed)/this.task.total*100:0}%"></div></div>`:r`<div class="what">Kept pictures go into the training set <b>${this.setName||`Rule34 · ${this.tags.trim()}`}</b>, not your library.</div>
                    <button class="btn primary" ?disabled=${!e} @click=${()=>this.importPosts()}>
                      <span class="material-symbols-rounded">download</span> Keep ${e}
                    </button>`}
            </div>`:d}
    `}};G.styles=[ue,Mt,re`
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
    `];X([z()],G.prototype,"mode",2);X([z({type:Number})],G.prototype,"setId",2);X([z()],G.prototype,"setName",2);X([c()],G.prototype,"files",2);X([c()],G.prototype,"dragging",2);X([c()],G.prototype,"progress",2);X([c()],G.prototype,"user",2);X([c()],G.prototype,"page",2);X([c()],G.prototype,"pictures",2);X([c()],G.prototype,"dropped",2);X([c()],G.prototype,"cursor",2);X([c()],G.prototype,"loading",2);X([c()],G.prototype,"reposts",2);X([c()],G.prototype,"task",2);X([c()],G.prototype,"error",2);X([c()],G.prototype,"tags",2);X([c()],G.prototype,"noAI",2);X([c()],G.prototype,"r34Sort",2);X([c()],G.prototype,"posts",2);X([c()],G.prototype,"r34Cursor",2);X([c()],G.prototype,"r34Searched",2);G=X([ge("oppai-lora-gather")],G);const wn={tolerance:28,minGap:.008,minSide:.12,minInk:.12};function $n(e,t,i){const s=new Map,a=(n,l)=>{const p=(l*t+n)*4,u=e[p]>>4<<8|e[p+1]>>4<<4|e[p+2]>>4,h=s.get(u)??{n:0,r:0,g:0,b:0};h.n++,h.r+=e[p],h.g+=e[p+1],h.b+=e[p+2],s.set(u,h)};for(let n=0;n<t;n++)a(n,0),a(n,i-1);for(let n=1;n<i-1;n++)a(0,n),a(t-1,n);let o={n:0,r:255,g:255,b:255};for(const n of s.values())n.n>o.n&&(o=n);return o.n?[o.r/o.n,o.g/o.n,o.b/o.n]:[255,255,255]}function kn(e,t,i,s={}){const a={...wn,...s};if(t<4||i<4)return[{x:0,y:0,w:t,h:i}];const[o,n,l]=$n(e,t,i),p=new Uint8Array(t*i);for(let M=0,B=0;B<p.length;M+=4,B++){const D=Math.max(Math.abs(e[M]-o),Math.abs(e[M+1]-n),Math.abs(e[M+2]-l));p[B]=D>a.tolerance?1:0}const u=Math.min(t,i),h=Math.max(2,Math.round(u*a.minGap)),g=Math.max(8,Math.round(u*a.minSide)),w=(M,B)=>{let D=0;for(let Z=M.x,q=B*t+M.x;Z<M.x+M.w;Z++,q++)D+=p[q];return D},x=(M,B)=>{let D=0;for(let Z=M.y,q=M.y*t+B;Z<M.y+M.h;Z++,q+=t)D+=p[q];return D},y=(M,B)=>w(M,B)<=M.w*.004,T=(M,B)=>x(M,B)<=M.h*.004,P=M=>{let{x:B,y:D}=M,Z=M.x+M.w,q=M.y+M.h;for(;D<q&&y({x:B,w:Z-B},D);)D++;for(;q>D&&y({x:B,w:Z-B},q-1);)q--;for(;B<Z&&T({y:D,h:q-D},B);)B++;for(;Z>B&&T({y:D,h:q-D},Z-1);)Z--;return Z>B&&q>D?{x:B,y:D,w:Z-B,h:q-D}:null},L=(M,B,D)=>{const Z=[];let q=-1,ie=0;for(let ze=M;ze<B;ze++)D(ze)?(ie++,q>=0&&ie>=h&&(Z.push([q,ze-ie+1]),q=-1)):(q<0&&(q=ze),ie=0);return q>=0&&Z.push([q,B-ie]),Z},U=[],I=(M,B)=>{const D=P(M);if(D){if(B<16){const Z=L(D.y,D.y+D.h,ie=>y(D,ie));if(Z.length>1){for(const[ie,ze]of Z)I({x:D.x,y:ie,w:D.w,h:ze-ie},B+1);return}const q=L(D.x,D.x+D.w,ie=>T(D,ie));if(q.length>1){for(const[ie,ze]of q)I({x:ie,y:D.y,w:ze-ie,h:D.h},B+1);return}}U.push(D)}};I({x:0,y:0,w:t,h:i},0);const pe=M=>{let B=0;for(let D=M.y;D<M.y+M.h;D++)B+=w(M,D);return B/(M.w*M.h)},Ae=U.filter(M=>Math.min(M.w,M.h)>=g&&pe(M)>=a.minInk).map(M=>Sn(e,t,M));return Ae.length?Ae:[P({x:0,y:0,w:t,h:i})??{x:0,y:0,w:t,h:i}]}function Sn(e,t,i){const s=(h,g,w,x,y)=>{let T=(g*t+h)*4;const P=(x*t+w)*4,L=T+P*Math.floor(y/2),[U,I,pe]=[e[L],e[L+1],e[L+2]];let Ae=0;for(let xe=0;xe<y;xe++,T+=P)Math.max(Math.abs(e[T]-U),Math.abs(e[T+1]-I),Math.abs(e[T+2]-pe))<=40&&Ae++;return Ae>=y*.92};let{x:a,y:o}=i,n=i.x+i.w,l=i.y+i.h;const p=Math.max(1,Math.floor(i.h/20)),u=Math.max(1,Math.floor(i.w/20));for(let h=0;h<p&&o<l-1&&s(a,o,1,0,n-a);h++)o++;for(let h=0;h<p&&l-1>o&&s(a,l-1,1,0,n-a);h++)l--;for(let h=0;h<u&&a<n-1&&s(a,o,0,1,l-o);h++)a++;for(let h=0;h<u&&n-1>a&&s(n-1,o,0,1,l-o);h++)n--;return{x:a,y:o,w:n-a,h:l-o}}function Cn(e,t,i,s){const a=Math.max(0,Math.floor(e.x*t)),o=Math.max(0,Math.floor(e.y*t));return{x:a,y:o,w:Math.min(i-a,Math.ceil(e.w*t)),h:Math.min(s-o,Math.ceil(e.h*t))}}function zn(e,t,i,s,a,o,n=32){const l=(w,x)=>Math.max(0,Math.min(x,w)),p=l(Math.min(e,i),a),u=l(Math.max(e,i),a),h=l(Math.min(t,s),o),g=l(Math.max(t,s),o);return u-p<n||g-h<n?null:{x:Math.round(p),y:Math.round(h),w:Math.round(u-p),h:Math.round(g-h)}}const xs=[{id:"strict",label:"Only clear ones",conf:.5},{id:"normal",label:"Most",conf:.3},{id:"loose",label:"Everyone it can",conf:.15}],Tn=64;function Pn(e,t,i=.06){const[s,a,o,n]=e,l=(o-s)*i,p=(n-a)*i,u=Math.max(0,Math.floor(s-l)),h=Math.max(0,Math.floor(a-p)),g=Math.min(t.w,Math.ceil(o+l)),w=Math.min(t.h,Math.ceil(n+p));return{x:t.x+u,y:t.y+h,w:Math.max(1,g-u),h:Math.max(1,w-h)}}function Ln(e,t){return e.map(([i,s])=>[t.x+i,t.y+s])}function Mn(e,t){return e.filter(i=>{const[s,a,o,n]=i.box;return i.score>=t&&Math.min(o-s,n-a)>=Tn})}function In(e){return Math.max(2,Math.round(Math.max(e.w,e.h)*.006))}var Dn=Object.defineProperty,Rn=Object.getOwnPropertyDescriptor,J=(e,t,i,s)=>{for(var a=s>1?void 0:s?Rn(t,i):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(a=(s?n(t,i,a):n(a))||a);return s&&a&&Dn(t,i,a),a};const On=800,Zt=240,An=512,En=2;let K=class extends me{constructor(){super(...arguments),this.setId=0,this.setName="",this.canDetect=!1,this.trainerSet=!1,this.from="library",this.query="",this.found=[],this.searching=!1,this.comic=null,this.split=!0,this.cuts=[],this.reading=null,this.cutOut=!1,this.cropping=null,this.drag=null,this.progress=null,this.error="",this.finding=null,this.backdrop="white",this.sureness="normal",this.generation=0}disconnectedCallback(){super.disconnectedCallback(),this.generation++}async search(){if(this.searching)return;this.searching=!0,this.error="",this.found=[];const e=this.query.trim();try{if(this.from==="library"){const t=await m.listMedia({kind:"comic",q:e||void 0,limit:36});this.found=t.items.map(i=>({key:`lib:${i.id}`,title:i.title,thumb:m.thumbURL(i.id),source:`${i.title} (library)`,pages:async()=>{const s=await m.comicInfo(i.id);if(!s.readable)throw new Error(s.reason||"That comic can't be opened.");return Array.from({length:s.pages},(a,o)=>m.pageURL(i.id,o+1))}}))}else{const t=await m.browseSource("3hentai",e?{feed:"search",q:e}:{feed:"recent"});this.found=t.items.filter(i=>i.kind==="comic").map(i=>({key:`3h:${i.id}`,title:i.title,thumb:m.sourceStreamURL(i.thumbUrl),source:i.pageUrl||i.title,pages:async()=>(await m.sourcePages("3hentai",i.id)).pages.map(s=>m.sourceStreamURL(s))}))}this.found.length||(this.error=e?`No comics match “${e}”.`:"There are no comics to show.")}catch(t){this.error=t.message}finally{this.searching=!1}}async open(e){this.error="",this.cuts=[];try{const t=await e.pages();if(!t.length)throw new Error("That comic has no pages.");this.comic={title:e.title,source:e.source,pages:t},this.readPages()}catch(t){this.error=t.message}}close(){this.generation++,this.comic=null,this.cuts=[],this.reading=null,this.cutOut=!1}async readPages(){const e=this.comic;if(!e)return;const t=++this.generation;this.cuts=[],this.reading={done:0,total:e.pages.length};let i=0;for(let s=0;s<e.pages.length;s++){if(t!==this.generation)return;try{const a=await Ue(e.pages[s]);if(t!==this.generation)return;const o=this.split?_n(a):[{x:0,y:0,w:a.naturalWidth,h:a.naturalHeight}],n=o.length>1?"panel":"page";this.cuts=[...this.cuts,...o.map((l,p)=>({key:`${s}:${p}`,page:s,rect:l,thumb:Jt(a,l,Zt),keep:!0,kind:n}))]}catch{i++}this.reading={done:s+1,total:e.pages.length}}this.reading=null,i&&(this.error=`${i} page${i===1?"":"s"} couldn't be read and ${i===1?"is":"are"} left out.`)}setSplit(e){e!==this.split&&(this.split=e,this.readPages())}dropOrKeep(e){this.cuts=this.cuts.map(t=>t.key===e.key?{...t,keep:!t.keep}:t)}toggle(e){if(this.cutOut){this.startCrop(e);return}this.cuts=this.cuts.map(t=>t.key===e.key?{...t,keep:!t.keep}:t)}async startCrop(e){if(this.comic)try{const t=await Ue(this.comic.pages[e.page]),i=Math.min(1400,Math.max(e.rect.w,e.rect.h)),s=Jt(t,e.rect,i,"image/png");this.cropping={cut:e,url:s,made:[]}}catch(t){this.error=t.message}}stagePoint(e){const i=e.currentTarget.querySelector("img").getBoundingClientRect();return{x:e.clientX-i.left,y:e.clientY-i.top,w:i.width,h:i.height}}dragStart(e){const t=this.stagePoint(e);e.currentTarget.setPointerCapture(e.pointerId),this.drag={x0:t.x,y0:t.y,x1:t.x,y1:t.y}}dragMove(e){if(!this.drag)return;const t=this.stagePoint(e);this.drag={...this.drag,x1:t.x,y1:t.y}}dragEnd(e){const t=this.cropping,i=this.drag;if(this.drag=null,!t||!i)return;const{w:s,h:a}=this.stagePoint(e),o=t.cut.rect.w/s,n=t.cut.rect.h/a,l=zn(i.x0*o,i.y0*n,i.x1*o,i.y1*n,t.cut.rect.w,t.cut.rect.h,48);if(!l)return;const p={x:t.cut.rect.x+l.x,y:t.cut.rect.y+l.y,w:l.w,h:l.h};this.cropping={...t,made:[...t.made,p]}}async finishCrop(){const e=this.cropping;if(this.cropping=null,!(!e||!e.made.length||!this.comic))try{const t=await Ue(this.comic.pages[e.cut.page]),i=e.made.map((o,n)=>({key:`${e.cut.key}:c${Date.now()}${n}`,page:e.cut.page,rect:o,thumb:Jt(t,o,Zt),keep:!0,kind:"crop"})),s=this.cuts.findIndex(o=>o.key===e.cut.key),a=this.cuts.map(o=>o.key===e.cut.key?{...o,keep:!1}:o);a.splice(s+1,0,...i),this.cuts=a}catch(t){this.error=t.message}}async findPeople(){var n;const e=this.comic;if(!e||this.finding||this.reading)return;const t=this.cuts.filter(l=>l.keep&&(l.kind==="panel"||l.kind==="page"));if(!t.length)return;const i=((n=xs.find(l=>l.id===this.sureness))==null?void 0:n.conf)??.3,s=this.generation;this.error="",this.finding={done:0,total:t.length,found:0};const a=new Map;let o="";try{for(const l of t){try{let p=a.get(l.page);p||(p=await Ue(e.pages[l.page]),a.set(l.page,p));const u=await m.trainDetect(await $s(p,l.rect),i);if(s!==this.generation)return;const h=Mn(u.people,i).map((g,w)=>{const x=Pn(g.box,l.rect),y=Ln(g.outline,l.rect);return{key:`${l.key}:p${w}`,page:l.page,rect:x,outline:y,keep:!0,kind:"person",thumb:ws(p,x,y,null,Zt).toDataURL("image/png")}});if(h.length){const g=this.cuts.findIndex(x=>x.key===l.key),w=this.cuts.filter(x=>!x.key.startsWith(`${l.key}:p`)).map(x=>x.key===l.key?{...x,keep:!1}:x);w.splice(g+1,0,...h),this.cuts=w}this.finding={...this.finding,found:this.finding.found+h.length}}catch(p){if(o=p.message,/update|trainer/i.test(o)&&!this.finding.found)throw p}this.finding={...this.finding,done:this.finding.done+1}}this.finding.found||(this.error=o?`No one was found (${o}).`:"No one was found — try “Everyone it can”, or cut her out by hand.")}catch(l){this.error=l.message}finally{s===this.generation&&(this.finding=null)}}async target(){var t;if(this.setId>0)return this.setId;const e=await m.trainSetCreate(this.setName.trim()||((t=this.comic)==null?void 0:t.title)||"Training set");return this.setId=e.id,e.id}async uploadKept(){const e=this.comic,t=this.cuts.filter(s=>s.keep);if(!e||!t.length||this.progress)return;this.error="",this.progress={done:0,total:t.length,failed:0};let i="";try{const s=await this.target(),a=new Map;for(const u of t)a.set(u.page,[...a.get(u.page)??[],u]);const o=[...a.keys()];let n=0;const l=async()=>{var u;for(;n<o.length;){const h=o[n++],g=a.get(h);let w=null;try{w=await Ue(e.pages[h])}catch(x){i=x.message}for(const[x,y]of g.entries())try{if(!w)throw new Error(i||"page didn't load");const T=y.kind==="person"&&((u=y.outline)!=null&&u.length)?await Bn(ws(w,y.rect,y.outline,ys[this.backdrop],0)):await $s(w,y.rect),P=new File([T],`page${String(h+1).padStart(3,"0")}-${x+1}.png`,{type:"image/png"});await m.trainSetUpload(s,P),this.progress={...this.progress,done:this.progress.done+1}}catch(T){i=T.message,this.progress={...this.progress,failed:this.progress.failed+1}}}};if(await Promise.all(Array.from({length:Math.min(En,o.length)},l)),!this.progress.done)throw new Error(i||"None of the pictures could be added.");const p=this.progress.failed;this.close(),p&&(this.error=`${p} picture${p===1?"":"s"} couldn't be added (${i}).`),this.dispatchEvent(new CustomEvent("gathered",{detail:{setId:s}}))}catch(s){this.error=s.message}finally{this.progress=null}}render(){return r`
      ${this.comic?this.renderComic():this.renderFind()}
      ${this.error?r`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>`:d}
      ${this.cropping?this.renderCrop(this.cropping):d}
    `}renderFind(){return r`
      <div class="seg small">
        <button class=${this.from==="library"?"on":""} @click=${()=>{this.from="library",this.found=[]}}>
          <span class="material-symbols-rounded">photo_library</span> Your library</button>
        <button class=${this.from==="3hentai"?"on":""} @click=${()=>{this.from="3hentai",this.found=[]}}>
          <span class="material-symbols-rounded">auto_stories</span> 3hentai</button>
      </div>
      <form class="search" @submit=${e=>{e.preventDefault(),this.search()}}>
        <input type="search" .value=${this.query}
          placeholder=${this.from==="library"?"A comic's title, artist or tag (blank: the latest)":"Search 3hentai: an artist, a parody, a tag"}
          @input=${e=>this.query=e.target.value} />
        <button class="btn primary" type="submit" ?disabled=${this.searching}>
          <span class="material-symbols-rounded">search</span> ${this.searching?"Looking…":"Find"}
        </button>
      </form>
      <div class="note">Every page is cut into its panels, and each panel is a picture of its own, so the LoRA learns the
        drawing rather than the page. Pages with no gutters — covers, pin-ups, character sheets — stay whole.</div>
      ${this.found.length?r`<div class="comics">${this.found.map(e=>r`<button class="comic" title=${e.title} @click=${()=>this.open(e)}>
            <img src=${e.thumb} alt="" loading="lazy" /><span>${e.title}</span></button>`)}</div>`:d}
    `}renderComic(){const e=this.comic,t=this.cuts.filter(a=>a.keep).length,i=this.cuts.filter(a=>a.kind==="crop").length,s=this.cuts.filter(a=>a.kind==="person").length;return r`
      <div class="head">
        <button class="btn small ghost" @click=${()=>this.close()}><span class="material-symbols-rounded">arrow_back</span> Comics</button>
        <h4 title=${e.title}>${e.title} · ${e.pages.length} page${e.pages.length===1?"":"s"}</h4>
      </div>
      <div class="toolbar">
        <div class="seg small">
          <button class=${this.split?"on":""} @click=${()=>this.setSplit(!0)}>
            <span class="material-symbols-rounded">grid_view</span> Panels</button>
          <button class=${this.split?"":"on"} @click=${()=>this.setSplit(!1)}>
            <span class="material-symbols-rounded">image</span> Whole pages</button>
        </div>
        <button class="btn small ${this.cutOut?"tonal":""}" aria-pressed=${this.cutOut?"true":"false"}
          title="Click a panel to draw a box round the character you want"
          @click=${()=>this.cutOut=!this.cutOut}>
          <span class="material-symbols-rounded">person</span> Cut out${this.cutOut?": on":""}
        </button>
        ${this.canDetect?r`<button class="btn small" ?disabled=${!!this.finding||!!this.reading}
              title="Have the trainer find every person in the kept panels and cut each out alone"
              @click=${()=>this.findPeople()}>
              <span class="material-symbols-rounded">person_search</span> ${this.finding?`Finding… ${this.finding.done}/${this.finding.total}`:"Find people"}
            </button>
            <select class="small-select" aria-label="How sure" .value=${this.sureness}
              @change=${a=>this.sureness=a.target.value}>
              ${xs.map(a=>r`<option value=${a.id} ?selected=${a.id===this.sureness}>${a.label}</option>`)}
            </select>`:d}
        ${s||this.canDetect?r`<div class="seg small" role="group" aria-label="Background of a person cut out">
          ${["white","black"].map(a=>r`<button class=${this.backdrop===a?"on":""}
            aria-pressed=${this.backdrop===a?"true":"false"} @click=${()=>this.backdrop=a}>
            <span class="swatch ${a}"></span> ${a==="white"?"On white":"On black"}</button>`)}
        </div>`:d}
        <span class="count">${t} of ${this.cuts.length} kept${i?` · ${i} cut out`:""}${s?` · ${s} found`:""}</span>
        <button class="btn small ghost" @click=${()=>this.cuts=this.cuts.map(a=>({...a,keep:!0}))}>Keep all</button>
        <button class="btn small ghost" @click=${()=>this.cuts=this.cuts.map(a=>({...a,keep:!1}))}>Keep none</button>
      </div>
      <div class="note">${this.cutOut?"Click a panel, then drag a box round her — as many boxes as there are good ones. What you cut out is kept and the panel it came from is dropped.":this.canDetect?"Click a picture to drop it. Find people cuts everyone in the kept panels out on their own, on white or black — then drop the ones who aren't her. Training fits each to its size.":r`Click a picture to drop it: text-heavy panels, someone else, a close-up of nothing. For one character, turn on Cut out.${this.trainerSet?" Update the oppailib-trainer container and it can find the people for you.":""}`}</div>
      ${this.reading?r`<div class="toolbar"><span class="what">Reading page ${this.reading.done+1} of ${this.reading.total}…</span>
            <div class="bar" style="flex:1;"><div style="width:${this.reading.done/this.reading.total*100}%"></div></div></div>`:d}
      <div class="picks ${this.cutOut?"cutting":""}" style="margin-top:10px;">
        ${this.cuts.map(a=>r`<button class="pick ${a.keep?"on":"off"}"
            title=${`Page ${a.page+1} · ${a.rect.w}×${a.rect.h}`} @click=${()=>a.kind==="person"?this.dropOrKeep(a):this.toggle(a)}>
          <img src=${a.thumb} alt="" loading="lazy" style=${a.kind==="person"?`background:${ys[this.backdrop]}`:""} />
          <span class="mark"><span class="material-symbols-rounded">${a.keep?"check":"close"}</span></span>
          ${a.kind==="person"?r`<span class="badge">person</span>`:a.kind==="crop"?r`<span class="badge">cut out</span>`:Math.min(a.rect.w,a.rect.h)<An?r`<span class="badge">small</span>`:d}
        </button>`)}
      </div>
      ${this.cuts.length?r`<div class="footer">
            ${this.progress?r`<div class="what">Adding ${this.progress.done+this.progress.failed} of ${this.progress.total}…</div>
                  <div class="bar"><div style="width:${(this.progress.done+this.progress.failed)/this.progress.total*100}%"></div></div>`:r`<div class="what">Kept pictures go into the training set <b>${this.setName||e.title}</b>, not your library.
                    Leave the tagger's speech bubble and text tags in the captions: the LoRA then puts those on the tags, not on its trigger.</div>
                  <button class="btn primary" ?disabled=${!t||!!this.reading} @click=${()=>this.uploadKept()}>
                    <span class="material-symbols-rounded">upload</span> Add ${t} to the set
                  </button>`}
          </div>`:d}
    `}renderCrop(e){const t=this.drag,i=a=>({left:`${(a.x-e.cut.rect.x)/e.cut.rect.w*100}%`,top:`${(a.y-e.cut.rect.y)/e.cut.rect.h*100}%`,width:`${a.w/e.cut.rect.w*100}%`,height:`${a.h/e.cut.rect.h*100}%`}),s=a=>Object.entries(a).map(([o,n])=>`${o}:${n}`).join(";");return r`<div class="crop-veil" @keydown=${a=>a.key==="Escape"&&(this.cropping=null)}>
      <div class="crop-stage"
        @pointerdown=${a=>this.dragStart(a)}
        @pointermove=${a=>this.dragMove(a)}
        @pointerup=${a=>this.dragEnd(a)}
        @pointercancel=${()=>this.drag=null}>
        <img src=${e.url} alt="" draggable="false" />
        ${e.made.map(a=>r`<div class="box" style=${s(i(a))}></div>`)}
        ${t?r`<div class="box live" style=${s({left:`${Math.min(t.x0,t.x1)}px`,top:`${Math.min(t.y0,t.y1)}px`,width:`${Math.abs(t.x1-t.x0)}px`,height:`${Math.abs(t.y1-t.y0)}px`})}></div>`:d}
      </div>
      <div class="crop-bar">
        <span>Drag a box round her. ${e.made.length?`${e.made.length} cut out.`:""}</span>
        ${e.made.length?r`<button class="btn small" @click=${()=>this.cropping={...e,made:e.made.slice(0,-1)}}>
          <span class="material-symbols-rounded">undo</span> Undo</button>`:d}
        <button class="btn small" @click=${()=>this.cropping=null}>Cancel</button>
        <button class="btn small primary" ?disabled=${!e.made.length} @click=${()=>this.finishCrop()}>
          <span class="material-symbols-rounded">check</span> Keep ${e.made.length||""}</button>
      </div>
    </div>`}};K.styles=[ue,Mt,re`
      :host { display: block; }
      .search { display: flex; gap: 8px; margin-top: 10px; }
      .search input { flex: 1; }
      .comics { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 10px; margin-top: 12px; }
      .comic {
        border: 1px solid var(--oppai-border); border-radius: 12px; overflow: hidden; background: var(--oppai-surface-2);
        padding: 0; cursor: pointer; color: var(--oppai-text); font: inherit; text-align: left;
      }
      .comic:hover { border-color: var(--oppai-primary); }
      .comic img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block; background: var(--oppai-bg); }
      .comic span { display: block; font-size: 12px; padding: 6px 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 14px 0 10px; font-size: 13px; }
      .toolbar .count { font-weight: 600; margin-right: auto; }
      .head { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
      .head h4 { margin: 0; font-size: 14px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .picks.cutting .pick { cursor: crosshair; }
      .pick img { object-fit: contain; background: var(--oppai-bg); }
      .footer {
        position: sticky; bottom: 0; margin: 14px -18px -18px; padding: 12px 18px;
        background: color-mix(in srgb, var(--oppai-surface) 92%, transparent); backdrop-filter: blur(6px);
        border-top: 1px solid var(--oppai-border); border-radius: 0 0 16px 16px;
        display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      }
      .footer .bar { flex: 1; min-width: 120px; }
      .footer .what { font-size: 13px; color: var(--oppai-text-dim); flex: 1; min-width: 160px; }
      .crop-veil {
        position: fixed; inset: 0; z-index: 50; background: rgba(0, 0, 0, 0.78);
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 16px;
      }
      .crop-stage { position: relative; user-select: none; touch-action: none; cursor: crosshair; line-height: 0; }
      .crop-stage img { max-width: min(92vw, 1100px); max-height: calc(100vh - 150px); display: block; border-radius: 6px; }
      .box { position: absolute; border: 2px solid var(--oppai-primary); background: color-mix(in srgb, var(--oppai-primary) 18%, transparent); pointer-events: none; }
      .box.live { border-style: dashed; }
      .crop-bar { display: flex; gap: 10px; align-items: center; color: #fff; font-size: 13px; flex-wrap: wrap; justify-content: center; }
      .small-select { width: auto; min-height: 30px; padding: 4px 10px; font-size: 12px; border-radius: 999px; }
      .swatch { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--oppai-border-strong); display: inline-block; }
      .swatch.white { background: #fff; }
      .swatch.black { background: #000; }
      @media (max-width: 600px) { .footer { margin: 14px -14px -14px; padding: 10px 14px; } }
    `];J([z({type:Number})],K.prototype,"setId",2);J([z()],K.prototype,"setName",2);J([z({type:Boolean})],K.prototype,"canDetect",2);J([z({type:Boolean})],K.prototype,"trainerSet",2);J([c()],K.prototype,"from",2);J([c()],K.prototype,"query",2);J([c()],K.prototype,"found",2);J([c()],K.prototype,"searching",2);J([c()],K.prototype,"comic",2);J([c()],K.prototype,"split",2);J([c()],K.prototype,"cuts",2);J([c()],K.prototype,"reading",2);J([c()],K.prototype,"cutOut",2);J([c()],K.prototype,"cropping",2);J([c()],K.prototype,"drag",2);J([c()],K.prototype,"progress",2);J([c()],K.prototype,"error",2);J([c()],K.prototype,"finding",2);J([c()],K.prototype,"backdrop",2);J([c()],K.prototype,"sureness",2);K=J([ge("oppai-lora-comic")],K);function _n(e){const t=e.naturalWidth,i=e.naturalHeight,s=Math.max(1,Math.max(t,i)/On),a=Math.max(1,Math.round(t/s)),o=Math.max(1,Math.round(i/s)),n=document.createElement("canvas");n.width=a,n.height=o;const l=n.getContext("2d",{willReadFrequently:!0});l.drawImage(e,0,0,a,o);const p=l.getImageData(0,0,a,o).data;return kn(p,a,o).map(u=>Cn(u,t/a,t,i))}function Jt(e,t,i,s="image/jpeg"){const a=Math.min(1,i/Math.max(t.w,t.h)),o=document.createElement("canvas");return o.width=Math.max(1,Math.round(t.w*a)),o.height=Math.max(1,Math.round(t.h*a)),o.getContext("2d").drawImage(e,t.x,t.y,t.w,t.h,0,0,o.width,o.height),o.toDataURL(s,.85)}const ys={white:"#ffffff",black:"#000000"};function ws(e,t,i,s,a){const o=a>0?Math.min(1,a/Math.max(t.w,t.h)):1,n=Math.max(1,Math.round(t.w*o)),l=Math.max(1,Math.round(t.h*o)),p=document.createElement("canvas");p.width=n,p.height=l;const u=p.getContext("2d");if(u.drawImage(e,t.x,t.y,t.w,t.h,0,0,n,l),i.length>2){const w=new Path2D;i.forEach(([T,P],L)=>(L?w.lineTo:w.moveTo).call(w,(T-t.x)*o,(P-t.y)*o)),w.closePath();const x=document.createElement("canvas");x.width=n,x.height=l;const y=x.getContext("2d");y.filter="blur(1px)",y.fillStyle=y.strokeStyle="#000",y.lineJoin="round",y.lineWidth=In(t)*2*o,y.fill(w),y.stroke(w),u.globalCompositeOperation="destination-in",u.drawImage(x,0,0)}if(!s)return p;const h=document.createElement("canvas");h.width=n,h.height=l;const g=h.getContext("2d");return g.fillStyle=s,g.fillRect(0,0,n,l),g.drawImage(p,0,0),h}function Bn(e){return new Promise((t,i)=>e.toBlob(s=>s?t(s):i(new Error("couldn't encode the picture")),"image/png"))}function $s(e,t){const i=document.createElement("canvas");return i.width=t.w,i.height=t.h,i.getContext("2d").drawImage(e,t.x,t.y,t.w,t.h,0,0,t.w,t.h),new Promise((s,a)=>i.toBlob(o=>o?s(o):a(new Error("couldn't encode the picture")),"image/png"))}const da=4,Fn=4,Nn=/\{trigger\}/gi;function ks(e,t){const i=(t??"").trim();return e.toLowerCase().includes("{trigger}")?Un(e.replace(Nn,i)):!i||new RegExp(`(^|[\\s,(])${i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}($|[\\s,):])`,"i").test(e)?e.trim():e.trim()?`${i}, ${e.trim()}`:i}function Un(e){return e.replace(/\s*,\s*(,\s*)+/g,", ").replace(/^\s*,\s*|\s*,\s*$/g,"").replace(/\s{2,}/g," ").trim()}function Ss(e){const t=[];for(const i of e.split(/[\s,;]+/)){if(!i)continue;const s=Number(i);if(!Number.isFinite(s))continue;const a=Math.round(Math.max(-2,Math.min(2,s))*100)/100;if(a!==0&&!t.includes(a)&&t.push(a),t.length===5)break}return t.length?t:[1]}function jn(e,t){const i=Math.max(1,Math.min(da,Math.floor(t)||1));return Array.from({length:i},(s,a)=>e+a)}function Cs(e,t){const i=t.split(`
`).map(s=>s.trim()).filter(Boolean);return[e,...i].slice(0,Fn)}function qn(e,t,i){const s=[];for(let a=0;a<Math.max(1,i);a++)for(const o of t)for(const n of e){const l=[];i>1&&l.push(`Prompt ${a+1}`),t.length>1&&l.push(`Seed ${o}`),(e.length>1||!l.length)&&l.push(`Weight ${n}`),s.push({key:`p${a}s${o}w${n}`,weight:n,seed:o,prompt:a,label:l.join(" · ")})}return s}function Wn(e){const t=e.prompts.length?e.prompts:[""],i=qn(e.weights,e.seeds,t.length),s=e.weights[0],a=[];e.baseline&&a.push({lora:null,cells:i.map(o=>o.weight===s?{key:`base:${o.key}`,lora:null,weight:0,seed:o.seed,prompt:ks(t[o.prompt],""),checkpoint:e.checkpoint}:null)});for(const o of e.loras){const n=e.ownCheckpoint&&o.checkpoint?o.checkpoint:e.checkpoint,l=e.triggers===!1?"":o.trigger;a.push({lora:o,cells:i.map(p=>({key:`${o.name}:${p.key}`,lora:o,weight:p.weight,seed:p.seed,prompt:ks(t[p.prompt],l),checkpoint:n}))})}return{columns:i,rows:a}}function zs(e){return e.rows.reduce((t,i)=>t+i.cells.filter(Boolean).length,0)}function Gn(e,t,i){const s=Math.round(i/32),a=Math.round(i*.75),o=Math.round(i/6);return{width:a+e*(i+s)+s,height:o+t*(i+s)+s,label:a,header:o,gap:s,x:n=>a+s+n*(i+s),y:n=>o+s+n*(i+s)}}var Hn=Object.defineProperty,Vn=Object.getOwnPropertyDescriptor,E=(e,t,i,s)=>{for(var a=s>1?void 0:s?Vn(t,i):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(a=(s?n(t,i,a):n(a))||a);return s&&a&&Hn(t,i,a),a};const Kn={s:130,m:200,l:300},Yn="masterpiece, best quality, {trigger}, solo, looking at viewer, upper body",Xn="lowres, worst quality, bad anatomy, bad hands, watermark, text";function Ts(){return Math.floor(Math.random()*2**31)}let R=class extends me{constructor(){super(...arguments),this.models=[],this.loras=[],this.runs=[],this.checkpoint="",this.focusLora="",this.prompt=Yn,this.extraPrompts="",this.negative=Xn,this.seed=Ts(),this.seedCount=1,this.weightsText="0.6, 0.8, 1",this.triggers=!0,this.baseline=!0,this.ownCheckpoint=!0,this.base="",this.sampler="",this.steps=0,this.cfg=0,this.size="",this.clipSkip=0,this.more=!1,this.selected=new Set,this.picked=!1,this.showOthers=!1,this.filter="",this.plan=null,this.results=new Map,this.running=!1,this.error="",this.cellSize="m",this.open="",this.saved=new Set,this.covered="",this.exporting=!1,this.jobId="",this.stopped=!1,this.onKey=e=>{if(this.open){if(e.key==="ArrowLeft")this.stepOpen(-1);else if(e.key==="ArrowRight")this.stepOpen(1);else if(e.key==="Escape")this.open="";else return;e.preventDefault()}}}connectedCallback(){super.connectedCallback(),window.addEventListener("keydown",this.onKey)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("keydown",this.onKey),this.stop()}willUpdate(e){var t;if((e.has("checkpoint")||e.has("models"))&&!this.base&&(this.base=this.checkpoint||((t=this.models[0])==null?void 0:t.title)||""),(e.has("loras")||e.has("runs")||e.has("focusLora"))&&this.loras.length)if(this.picked)e.has("focusLora")&&this.focusLora&&this.loras.some(i=>i.name===this.focusLora)&&(this.selected=new Set([...this.selected,this.focusLora]));else{const i=this.trained().map(a=>a.lora.name).slice(0,6),s=this.focusLora&&this.loras.some(a=>a.name===this.focusLora)?[this.focusLora]:[];this.selected=new Set([...s,...i])}}trained(){const e=[],t=new Set;for(const i of this.runs){if(i.status!=="done")continue;const s=this.loras.find(a=>i.modelKey&&a.key===i.modelKey||a.name===i.name);s&&!t.has(s.name)&&(t.add(s.name),e.push({lora:s,run:i}))}return e}compareLora(e){var s,a,o;const t=(s=this.trained().find(n=>n.lora.name===e.name))==null?void 0:s.run,i=(a=t==null?void 0:t.request)==null?void 0:a.base;return{name:e.name,trigger:(t==null?void 0:t.trigger)||((o=e.triggerPhrases)==null?void 0:o[0])||"",checkpoint:i&&this.models.some(n=>n.title===i)?i:void 0}}toggle(e){this.picked=!0;const t=new Set(this.selected);t.has(e)?t.delete(e):t.add(e),this.selected=t}selectAll(e,t){this.picked=!0;const i=new Set(this.selected);for(const s of e)t?i.add(s):i.delete(s);this.selected=i}currentPlan(){const e=this.loras.filter(t=>this.selected.has(t.name)).map(t=>this.compareLora(t));return Wn({loras:e,weights:Ss(this.weightsText),seeds:jn(this.seed,this.seedCount),prompts:Cs(this.prompt,this.extraPrompts),baseline:this.baseline,checkpoint:this.base,ownCheckpoint:this.ownCheckpoint,triggers:this.triggers})}cells(e=this.plan){return((e==null?void 0:e.rows)??[]).flatMap(t=>t.cells.filter(i=>!!i))}setResult(e,t){const i=new Map(this.results);i.set(e,t),this.results=i}async run(){if(this.running)return;const e=this.currentPlan();zs(e)&&(this.plan=e,this.saved=new Set,this.results=new Map(this.cells(e).map(t=>[t.key,{state:"waiting"}])),await this.drawAll(this.cells(e)))}async retry(){if(this.running||!this.plan)return;const e=this.cells().filter(t=>{var i;return((i=this.results.get(t.key))==null?void 0:i.state)!=="done"});for(const t of e)this.setResult(t.key,{state:"waiting"});await this.drawAll(e)}async drawAll(e){this.error="",this.stopped=!1,this.running=!0;try{for(const t of e){if(this.stopped)return;await this.draw(t)}}finally{this.running=!1,this.jobId=""}}async draw(e){var i;this.setResult(e.key,{state:"drawing"}),this.jobId=`cmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;const t=wi.find(s=>s.hint===this.size);try{const a=(i=(await m.generate({jobId:this.jobId,prompt:e.prompt,negativePrompt:this.negative,checkpoint:e.checkpoint||void 0,sampler:this.sampler||void 0,steps:this.steps||void 0,cfgScale:this.cfg||void 0,width:t==null?void 0:t.w,height:t==null?void 0:t.h,clipSkip:this.clipSkip||void 0,seed:e.seed,count:1,loras:e.lora?[{name:e.lora.name,weight:e.weight}]:[],noGallery:!0})).images[0])==null?void 0:i.id;this.setResult(e.key,a?{state:"done",preview:a}:{state:"failed",error:"No picture came back"})}catch(s){const a=s.message;this.setResult(e.key,{state:"failed",error:this.stopped?"Stopped":a}),!this.stopped&&/not configured|unreachable|refused/i.test(a)&&(this.error=a,this.stopped=!0)}}stop(){this.stopped=!0,this.jobId&&m.cancelGenerate(this.jobId).catch(()=>{})}label(e){return e.lora?`${e.lora.name} at ${e.weight}`:"Without a LoRA"}doneCells(){return this.cells().filter(e=>{var t;return((t=this.results.get(e.key))==null?void 0:t.state)==="done"})}stepOpen(e){const t=this.doneCells(),i=t.findIndex(a=>a.key===this.open),s=t[i+e];s&&(this.open=s.key)}async keep(e){const t=this.results.get(e.key);if(!(!(t!=null&&t.preview)||this.saved.has(e.key)))try{await m.saveGenerated({id:t.preview,title:`${this.label(e)} · seed ${e.seed}`,tags:e.lora?["lora-comparison",e.lora.name]:["lora-comparison"]}),this.saved=new Set(this.saved).add(e.key)}catch(i){this.error=i.message}}async useAsCover(e){const t=this.results.get(e.key);if(!(!e.lora||!(t!=null&&t.preview)))try{await m.setLoraThumb({model:e.lora.name,previewId:t.preview}),this.covered=e.key,F(`Set as ${e.lora.name}'s cover.`,"success")}catch(i){this.error=i.message}}async downloadSheet(){var t;const e=this.plan;if(!(!e||this.exporting)){this.exporting=!0;try{const s=Gn(e.columns.length,e.rows.length,384),a=document.createElement("canvas");a.width=s.width,a.height=s.height;const o=a.getContext("2d");o.fillStyle="#16121a",o.fillRect(0,0,s.width,s.height),o.fillStyle="#e8e0ea",o.textBaseline="middle";const n=(h,g=600)=>`${g} ${h}px Roboto, system-ui, sans-serif`;o.font=n(Math.round(384/22)),o.textAlign="center",e.columns.forEach((h,g)=>o.fillText(h.label,s.x(g)+384/2,s.header/2+s.gap/2,384)),o.textAlign="left";const l=h=>new Promise((g,w)=>{const x=new Image;x.onload=()=>g(x),x.onerror=()=>w(new Error("a picture couldn't be read")),x.src=h});for(const[h,g]of e.rows.entries()){const w=s.y(h);o.fillStyle="#e8e0ea",o.font=n(Math.round(384/18)),o.fillText(g.lora?g.lora.name:"No LoRA",s.gap,w+384/2-384/28,s.label-s.gap*2),(t=g.lora)!=null&&t.trigger&&this.triggers&&(o.fillStyle="#a89cae",o.font=n(Math.round(384/24),400),o.fillText(g.lora.trigger,s.gap,w+384/2+384/22,s.label-s.gap*2));for(const[x,y]of g.cells.entries()){const T=y&&this.results.get(y.key);if(!(T!=null&&T.preview))continue;const P=await l(m.genPreviewURL(T.preview)),L=Math.min(P.naturalWidth,P.naturalHeight);o.drawImage(P,(P.naturalWidth-L)/2,(P.naturalHeight-L)/2,L,L,s.x(x),w,384,384)}}const p=await new Promise(h=>a.toBlob(h,"image/png"));if(!p)throw new Error("The sheet couldn't be made");const u=document.createElement("a");u.href=URL.createObjectURL(p),u.download=`lora-comparison-${this.seed}.png`,u.click(),setTimeout(()=>URL.revokeObjectURL(u.href),1e4)}catch(i){this.error=i.message}finally{this.exporting=!1}}}render(){return this.loras.length?r`<div class="layout">${this.renderSetup()}${this.renderSheet()}</div>${this.renderLightbox()}`:r`<div class="card empty"><span class="material-symbols-rounded">compare</span>
        No LoRAs installed yet. Once a run has finished, it can be compared here with the others.</div>`}renderLora(e,t){return r`<label class="lora">
      <input type="checkbox" .checked=${this.selected.has(e.name)} @change=${()=>this.toggle(e.name)} />
      <img src=${m.loraThumbURL(e.name)} alt="" loading="lazy" @error=${i=>i.target.style.opacity="0"} />
      <span class="nm">${e.alias||e.name}${t?r`<small>${t}</small>`:d}</span>
    </label>`}renderSetup(){const e=this.trained(),t=new Set(e.map(p=>p.lora.name)),i=this.filter.trim().toLowerCase(),s=this.loras.filter(p=>!t.has(p.name)&&(!i||p.name.toLowerCase().includes(i))),a=this.currentPlan(),o=zs(a),n=Ss(this.weightsText).length,l=Cs(this.prompt,this.extraPrompts).length;return r`<div class="side"><div class="card">
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
            <div class="loras" style="margin-top:6px;">${s.map(p=>this.renderLora(p,p.base??""))}</div>`:d}

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
            <button class="btn" title="Another seed" @click=${()=>this.seed=Ts()}><span class="material-symbols-rounded">casino</span></button>
          </div>
        </div>
      </div>
      <label class="field">Seeds per LoRA</label>
      <div class="seg small">
        ${Array.from({length:da},(p,u)=>u+1).map(p=>r`<button class=${this.seedCount===p?"on":""} @click=${()=>this.seedCount=p}>${p}</button>`)}
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
                  ${la.map(p=>r`<option value=${p.id} ?selected=${p.id===this.sampler}>${p.label}</option>`)}
                </select>
              </div>
              <div>
                <label class="field">Size</label>
                <select @change=${p=>this.size=p.target.value}>
                  <option value="" ?selected=${!this.size}>Generator's default</option>
                  ${wi.map(p=>r`<option value=${p.hint} ?selected=${p.hint===this.size}>${p.label} · ${p.hint}</option>`)}
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
            <div class="note">Left empty, each is the generator's (or the checkpoint's recommended) setting.</div>`:d}

      ${this.error?r`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>`:d}
      <div class="go">
        ${this.running?r`<button class="btn danger" @click=${()=>this.stop()}><span class="material-symbols-rounded">stop</span> Stop</button>`:r`<button class="btn primary" ?disabled=${!o||!this.prompt.trim()} @click=${()=>this.run()}>
              <span class="material-symbols-rounded">play_arrow</span> Make ${o} picture${o===1?"":"s"}
            </button>`}
        <span class="count">${this.selected.size} LoRA${this.selected.size===1?"":"s"} × ${n} weight${n===1?"":"s"}${this.seedCount>1?` × ${this.seedCount} seeds`:""}${l>1?` × ${l} prompts`:""}</span>
      </div>
    </div></div>`}renderSheet(){const e=this.plan;if(!e)return r`<div class="card empty"><span class="material-symbols-rounded">grid_view</span>
        Tick the LoRAs to compare and press <b>Make</b>.<br />The pictures appear here in a grid, a row per LoRA.</div>`;const t=[...this.results.values()],i=t.filter(o=>o.state==="done").length,s=t.filter(o=>o.state==="failed").length,a=[...new Set(e.columns.map(o=>o.seed))];return r`<div class="card">
      <div class="toolbar">
        <h3>${a.length>1?`Seeds ${a[0]}–${a[a.length-1]}`:`Seed ${a[0]}`}</h3>
        <span class="note" style="margin:0;">${this.running?`Drawing ${Math.min(i+s+1,this.results.size)} of ${this.results.size}…`:`${i} of ${this.results.size} drawn`}</span>
        <span class="spacer"></span>
        ${!this.running&&s?r`<button class="btn small" @click=${()=>this.retry()}><span class="material-symbols-rounded">refresh</span> Retry ${s}</button>`:d}
        <div class="seg small" title="Picture size">
          ${["s","m","l"].map(o=>r`<button class=${this.cellSize===o?"on":""} @click=${()=>this.cellSize=o}>${o.toUpperCase()}</button>`)}
        </div>
        <button class="btn small" ?disabled=${!i||this.running||this.exporting} @click=${()=>this.downloadSheet()}>
          <span class="material-symbols-rounded">download</span> ${this.exporting?"Making…":"Save sheet"}
        </button>
      </div>
      <div class="sheet" style="--cell:${Kn[this.cellSize]}px"><table>
        <thead><tr><th></th>${e.columns.map(o=>r`<th>${o.label}</th>`)}</tr></thead>
        <tbody>${e.rows.map(o=>{var n;return r`<tr>
          <th class="rowhead">
            <span class="nm">${o.lora?o.lora.name:"No LoRA"}</span>
            ${(n=o.lora)!=null&&n.trigger&&this.triggers?r`<small>${o.lora.trigger}</small>`:d}
          </th>
          ${o.cells.map(l=>r`<td>${l?this.renderCell(l):r`<div class="cell empty"></div>`}</td>`)}
        </tr>`})}</tbody>
      </table></div>
    </div>`}renderCell(e){const t=this.results.get(e.key)??{state:"waiting"};return t.state==="done"&&t.preview?r`<button class="cell done" title=${e.prompt} @click=${()=>this.open=e.key}>
        <img src=${m.genPreviewURL(t.preview)} alt=${this.label(e)} />
      </button>`:t.state==="drawing"?r`<div class="cell"><md-circular-progress indeterminate></md-circular-progress></div>`:t.state==="failed"?r`<div class="cell"><span class="err">${t.error??"Failed"}</span></div>`:r`<div class="cell"><span class="material-symbols-rounded">hourglass_empty</span></div>`}renderLightbox(){if(!this.open)return d;const e=this.doneCells(),t=e.findIndex(o=>o.key===this.open),i=e[t],s=i&&this.results.get(i.key);if(!i||!(s!=null&&s.preview))return d;const a=this.saved.has(i.key);return r`<div class="lightbox" @click=${o=>{o.target===o.currentTarget&&(this.open="")}}>
      <figure>
        <img src=${m.genPreviewURL(s.preview)} alt="" />
        ${t>0?r`<button class="nav prev" title="Previous (←)" @click=${()=>this.stepOpen(-1)}><span class="material-symbols-rounded">chevron_left</span></button>`:d}
        ${t<e.length-1?r`<button class="nav next" title="Next (→)" @click=${()=>this.stepOpen(1)}><span class="material-symbols-rounded">chevron_right</span></button>`:d}
        <figcaption>${this.label(i)} · seed ${i.seed}<small>${i.prompt}</small></figcaption>
        <div class="acts">
          <button class="btn tonal" ?disabled=${a} @click=${()=>this.keep(i)}>
            <span class="material-symbols-rounded">${a?"check":"save"}</span> ${a?"In library":"Save to library"}
          </button>
          ${i.lora?r`<button class="btn tonal" ?disabled=${this.covered===i.key} @click=${()=>this.useAsCover(i)}
            title=${`Make this ${i.lora.name}'s cover in the LoRA picker`}>
            <span class="material-symbols-rounded">${this.covered===i.key?"check":"photo_library"}</span>
            ${this.covered===i.key?"Its cover":"Use as cover"}
          </button>`:d}
          <button class="btn" @click=${()=>this.open=""}><span class="material-symbols-rounded">close</span> Close</button>
        </div>
      </figure>
    </div>`}};R.styles=[ue,Mt,re`
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
    `];E([z({attribute:!1})],R.prototype,"models",2);E([z({attribute:!1})],R.prototype,"loras",2);E([z({attribute:!1})],R.prototype,"runs",2);E([z()],R.prototype,"checkpoint",2);E([z()],R.prototype,"focusLora",2);E([c()],R.prototype,"prompt",2);E([c()],R.prototype,"extraPrompts",2);E([c()],R.prototype,"negative",2);E([c()],R.prototype,"seed",2);E([c()],R.prototype,"seedCount",2);E([c()],R.prototype,"weightsText",2);E([c()],R.prototype,"triggers",2);E([c()],R.prototype,"baseline",2);E([c()],R.prototype,"ownCheckpoint",2);E([c()],R.prototype,"base",2);E([c()],R.prototype,"sampler",2);E([c()],R.prototype,"steps",2);E([c()],R.prototype,"cfg",2);E([c()],R.prototype,"size",2);E([c()],R.prototype,"clipSkip",2);E([c()],R.prototype,"more",2);E([c()],R.prototype,"selected",2);E([c()],R.prototype,"picked",2);E([c()],R.prototype,"showOthers",2);E([c()],R.prototype,"filter",2);E([c()],R.prototype,"plan",2);E([c()],R.prototype,"results",2);E([c()],R.prototype,"running",2);E([c()],R.prototype,"error",2);E([c()],R.prototype,"cellSize",2);E([c()],R.prototype,"open",2);E([c()],R.prototype,"saved",2);E([c()],R.prototype,"covered",2);E([c()],R.prototype,"exporting",2);R=E([ge("oppai-lora-comparison")],R);var Zn=Object.defineProperty,Jn=Object.getOwnPropertyDescriptor,C=(e,t,i,s)=>{for(var a=s>1?void 0:s?Jn(t,i):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(a=(s?n(t,i,a):n(a))||a);return s&&a&&Zn(t,i,a),a};const Ps=[{n:1,title:"Kind",icon:"category"},{n:2,title:"Pictures",icon:"photo_library"},{n:3,title:"Tags",icon:"sell"},{n:4,title:"Train",icon:"model_training"}],Qn=[{id:"upload",title:"Upload",icon:"upload_file"},{id:"x",title:"An X account",icon:"public"},{id:"rule34",title:"Rule34",icon:"travel_explore"},{id:"comic",title:"A comic",icon:"auto_stories"},{id:"library",title:"From the library",icon:"photo_library"}],el=/^LoRA · /;let S=class extends me{constructor(){super(...arguments),this.models=[],this.loras=[],this.checkpoint="",this.tab="new",this.step=1,this.configured=!0,this.trainer=null,this.trainerError="",this.tagger=!1,this.runs=[],this.loaded=!1,this.preset="",this.effort="balanced",this.name="",this.trigger="",this.triggerTouched=!1,this.base="",this.sets=[],this.setId=0,this.addMode="upload",this.exclude=[],this.onlyTag="",this.collections=[],this.libKind="collection",this.libCollection=0,this.libTag="",this.libMove=!1,this.copying=!1,this.copyNote="",this.captions="tags",this.leaveOut=[],this.leaveOutTouched=!1,this.playDown=[],this.suggested=[],this.preview=null,this.previewing=!1,this.tagTask=null,this.tagNote="",this.editing=0,this.newTag="",this.advanced=!1,this.epochs=10,this.repeats=0,this.rank=0,this.alpha=0,this.resolution=0,this.learningRate=1e-4,this.textEncoderLr=0,this.optimizer="AdamW8bit",this.noiseOffset=0,this.lowVram=!1,this.lowVramTouched=!1,this.flip=!1,this.fit=!0,this.freeGpu=!0,this.samples=!0,this.starting=!1,this.error="",this.openLog=0,this.compareFocus="",this.timer=0,this.previewTimer=0,this.previewAbort=null,this.installed=new Set}connectedCallback(){super.connectedCallback(),this.refresh(),this.loadSets(),this.loadCollections()}willUpdate(e){var i;e.has("checkpoint")&&!this.base&&(this.base=this.checkpoint);const t=e;(t.has("base")||t.has("trainer"))&&!this.lowVramTouched&&(this.lowVram=an((i=this.trainer)==null?void 0:i.vramMB,this.baseFamily()))}disconnectedCallback(){var e;super.disconnectedCallback(),window.clearTimeout(this.timer),window.clearTimeout(this.previewTimer),(e=this.previewAbort)==null||e.abort()}async loadCollections(){var e;try{const t=await m.listCollections();this.collections=t.items,t.items.some(i=>i.id===this.libCollection)||this.pickLibCollection(((e=t.items[0])==null?void 0:e.id)??0)}catch{}}pickLibCollection(e){var t;this.libCollection=e,this.libMove=el.test(((t=this.collections.find(i=>i.id===e))==null?void 0:t.name)??"")}async loadSets(){try{this.sets=(await m.trainSets()).sets,this.setId&&!this.sets.some(e=>e.id===this.setId)&&this.useSet(0)}catch{}}matchSetToName(){if(this.setId)return;const e=this.name.trim().toLowerCase(),t=e&&this.sets.find(i=>i.name.toLowerCase()===e);t&&this.useSet(t.id)}useSet(e){e!==this.setId&&(this.setId=e,this.sourceChanged())}async refresh(){window.clearTimeout(this.timer);try{const t=await m.trainList();this.configured=t.configured,this.trainer=t.trainer??null,this.trainerError=t.trainerError??"",this.tagger=!!t.tagger,this.runs=t.trainings;for(const i of t.trainings)i.status==="done"&&!this.installed.has(i.id)&&(this.loaded&&i.finishedAt&&Date.now()/1e3-i.finishedAt<120&&this.dispatchEvent(new CustomEvent("trained",{detail:{name:i.name}})),this.installed.add(i.id))}catch(t){this.trainerError=t.message}finally{this.loaded=!0}if(!this.isConnected)return;const e=this.runs.some(Yt);this.timer=window.setTimeout(()=>void this.refresh(),e?3e3:2e4)}source(){return this.setId>0?{setId:this.setId,exclude:this.exclude}:null}thumb(e){return m.trainPictureURL(this.setId,e,!0)}sourceChanged(){this.exclude=[],this.leaveOutTouched=!1,this.leaveOut=[],this.playDown=[],this.suggested=[],this.preview=null,this.tagNote="",this.schedulePreview()}schedulePreview(e=0){window.clearTimeout(this.previewTimer),this.previewTimer=window.setTimeout(()=>void this.loadPreview(),e)}async loadPreview(){var i;const e=this.source();if(!e){this.preview=null;return}(i=this.previewAbort)==null||i.abort();const t=new AbortController;this.previewAbort=t,this.previewing=!0;try{const s=await m.trainPreview({source:e,trigger:this.trigger,captions:this.captions,leaveOut:this.leaveOut,playDown:this.playDown,repeats:this.repeats||void 0},t.signal);if(t.signal.aborted)return;this.preview=s,this.error="",this.leaveOutTouched||this.applySuggestions()}catch(s){if(t.signal.aborted)return;this.error=s.message,this.preview=null}finally{this.previewAbort===t&&(this.previewing=!1)}}applySuggestions(){const e=this.preview;!e||!this.preset||(this.suggested=en(Te(this.preset),e.commonTags,e.count).filter(t=>!Ge(this.playDown,t)),this.leaveOut=[...this.suggested])}dropPicture(e){if(this.exclude=[...this.exclude,e],this.preview){const t=this.preview.items.filter(i=>i.id!==e);this.preview={...this.preview,items:t,count:t.length}}this.editing===e&&(this.editing=0),this.schedulePreview(600)}keepOnly(e){const t=this.preview;if(!t)return;const i=new Set(vs(t.items,e));if(!i.size)return;this.exclude=[...this.exclude,...i];const s=t.items.filter(a=>!i.has(a.id));this.preview={...t,items:s,count:s.length},i.has(this.editing)&&(this.editing=0),this.schedulePreview(600)}bringBack(){this.exclude=[],this.schedulePreview()}caption(e){return sn(this.trigger,e.tags.map(t=>t.name),this.leaveOut,this.captions,ln(this.playDown))}smallCount(){var t;const e=Si(this.baseFamily());return(((t=this.preview)==null?void 0:t.items)??[]).filter(i=>i.width&&i.height&&Math.min(i.width,i.height)<e).length}baseFamily(){const e=this.models.find(t=>t.title===this.base);return`${(e==null?void 0:e.base)??""} ${(e==null?void 0:e.model_name)??""}`}async autotag(e){var i,s;const t=this.source();if(!(!t||this.tagTask)){this.tagNote="";try{const a=((i=this.preview)==null?void 0:i.untagged)??0;let o=await m.trainAutotag({source:t,redo:e});for(this.tagTask=o;!o.finished;){if(await new Promise(n=>setTimeout(n,1200)),!this.isConnected)return;o=await m.trainTask(o.id),this.tagTask=o}o.failed&&(this.tagNote=`The tagger couldn't read ${o.failed} picture${o.failed===1?"":"s"}.`),this.leaveOutTouched=!1,await this.loadPreview(),!e&&o.done&&(((s=this.preview)==null?void 0:s.untagged)??0)>=a&&(this.tagNote="The tagger looked at every picture but found nothing to caption them with — this install may only have the simple fallback tagger. Tag them by hand below, or caption with the trigger word alone.")}catch(a){this.tagNote=a.message}finally{this.tagTask=null}}}editedItem(e,t){this.preview&&(this.preview={...this.preview,items:this.preview.items.map(i=>i.id===e?{...i,tags:t}:i)})}async removeTag(e,t){this.editedItem(e.id,e.tags.filter(i=>i.name!==t));try{await m.trainPictureTags(this.setId,e.id,{removeTags:[t]})}catch(i){this.error=i.message,this.editedItem(e.id,e.tags)}}async addTag(e){const t=this.newTag.split(",").map(a=>a.trim()).filter(Boolean);if(!t.length)return;const i=new Set(e.tags.map(a=>N(a.name))),s=t.filter(a=>!i.has(N(a)));if(this.newTag="",!!s.length){this.editedItem(e.id,[...s.map(a=>({name:a.replace(/_/g," ").toLowerCase(),manual:!0})),...e.tags]);try{await m.trainPictureTags(this.setId,e.id,{addTags:s})}catch(a){this.error=a.message,this.editedItem(e.id,e.tags)}}}async deletePicture(e){var a;if(!confirm("Delete this picture from the training set? Dropping it only leaves it out of this LoRA; deleting removes it from the set."))return;const t=((a=this.preview)==null?void 0:a.items)??[],i=t.findIndex(o=>o.id===e.id),s=t[i+1]??t[i-1];try{if(await m.trainPictureDelete(this.setId,e.id),this.preview){const o=this.preview.items.filter(n=>n.id!==e.id);this.preview={...this.preview,items:o,count:o.length}}this.editing=s&&s.id!==e.id?s.id:0,this.schedulePreview(400),this.loadSets()}catch(o){this.error=o.message}}closeEditor(){this.editing=0,this.schedulePreview(200)}choosePreset(e){const t=Te(e);this.preset=e;const i=t.settings;this.captions=i.captions,this.epochs=gs(t,this.effort),this.repeats=i.repeats,this.rank=i.rank,this.alpha=i.alpha,this.resolution=i.resolution,this.learningRate=i.learningRate,this.textEncoderLr=i.textEncoderLr,this.optimizer=i.optimizer,this.noiseOffset=i.noiseOffset,this.flip=i.flip,e==="custom"&&(this.advanced=!0),this.leaveOutTouched||this.applySuggestions()}chooseEffort(e){this.effort=e,this.preset&&(this.epochs=gs(Te(this.preset),e))}stepReady(e){var t;switch(e){case 1:return!0;case 2:return!!this.preset&&!!this.name.trim();case 3:case 4:return this.stepReady(2)&&!!((t=this.preview)!=null&&t.count)}}goTo(e){var t;this.stepReady(e)&&(this.step=e,e>=2&&this.matchSetToName(),e>=2&&!this.preview&&this.setId&&this.schedulePreview(),(t=this.renderRoot.querySelector(".wrap"))==null||t.scrollIntoView({block:"start"}),this.scrollTop=0)}async start(){const e=this.source();if(this.starting||!e)return;this.starting=!0,this.error="";const t={name:this.name.trim(),trigger:this.trigger.trim(),base:this.base,source:e,captions:this.captions,leaveOut:this.leaveOut,playDown:this.playDown.length?this.playDown:void 0,preset:this.preset||void 0,epochs:this.epochs||void 0,repeats:this.repeats||void 0,rank:this.rank||void 0,alpha:this.alpha||void 0,resolution:this.resolution||void 0,learningRate:this.learningRate||void 0,textEncoderLr:this.textEncoderLr||void 0,optimizer:this.optimizer,noiseOffset:this.noiseOffset||void 0,lowVram:this.lowVram,noFit:this.fit?void 0:!0,flip:this.flip,freeGpu:this.freeGpu,samples:this.samples};try{await m.trainStart(t),await this.refresh(),this.tab="runs",this.step=1,this.preset="",this.name="",this.trigger="",this.triggerTouched=!1,this.setId=0,this.exclude=[],this.preview=null}catch(i){this.error=i.message}finally{this.starting=!1}}again(e){const t=e.request;t&&(this.preset=t.preset||"custom",this.name=t.name,this.trigger=t.trigger,this.triggerTouched=!0,this.models.some(i=>i.title===t.base)&&(this.base=t.base),this.setId=t.source.setId??0,this.exclude=t.source.setId?t.source.exclude??[]:[],t.source.setId||(this.addMode="library",t.source.collectionId?(this.libKind="collection",this.pickLibCollection(t.source.collectionId)):t.source.tag&&(this.libKind="tag",this.libTag=t.source.tag)),this.captions=t.captions??"tags",this.leaveOut=t.leaveOut??[],this.leaveOutTouched=!0,this.playDown=t.playDown??[],this.suggested=[],this.epochs=t.epochs??10,this.repeats=t.repeats??0,this.rank=t.rank??0,this.alpha=t.alpha??0,this.resolution=t.resolution??0,this.learningRate=t.learningRate??1e-4,this.textEncoderLr=t.textEncoderLr??0,this.optimizer=t.optimizer??"AdamW8bit",this.noiseOffset=t.noiseOffset??0,this.lowVram=!!t.lowVram,this.lowVramTouched=!0,this.fit=!t.noFit,this.flip=!!t.flip,this.freeGpu=t.freeGpu??!0,this.samples=t.samples??!0,this.preview=null,this.tab="new",this.loadPreview().then(()=>{var i;(i=this.preview)!=null&&i.count?this.step=4:this.step=2}),this.step=2)}async cancel(e){try{await m.trainCancel(e.id)}catch(t){this.error=t.message}await this.refresh()}async forget(e){try{await m.trainDelete(e.id),this.runs=this.runs.filter(t=>t.id!==e.id)}catch(t){this.error=t.message}}compare(e){const t=this.loras.find(i=>e.modelKey&&i.key===e.modelKey||i.name===e.name);this.compareFocus=(t==null?void 0:t.name)??"",this.tab="compare"}render(){const e=this.runs.filter(Yt).length;return r`
      <div class="wrap">
        <div class="topbar">
          <h2><span class="material-symbols-rounded">model_training</span> LoRA trainer</h2>
          ${this.renderTrainer()}
          <div class="tabs" role="tablist">
            <button class=${this.tab==="new"?"on":""} @click=${()=>this.tab="new"}>
              <span class="material-symbols-rounded">add</span> New LoRA
            </button>
            <button class=${this.tab==="runs"?"on":""} @click=${()=>this.tab="runs"}>
              <span class="material-symbols-rounded">history</span> Runs ${e?r`<span class="n">${e}</span>`:d}
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
      ${this.editing?this.renderEditor():d}
    `}renderTrainer(){if(!this.configured)return d;if(this.trainerError)return r`<span class="trainer" title=${this.trainerError}><span class="dot off"></span>Trainer unreachable</span>`;const e=this.trainer;if(!e)return d;const t=e.vramMB?` · ${Math.round(e.vramMB/1024)} GB`:"",i=e.busy?`training${e.queued?`, ${e.queued} waiting`:""}`:e.queued?`${e.queued} waiting`:"idle";return r`<span class="trainer"><span class="dot ${e.busy?"busy":""}"></span>${e.gpu||"Trainer"}${t} · ${i}</span>`}renderNotSetUp(){return r`<div class="card empty">
      <span class="material-symbols-rounded">model_training</span>
      LoRAs are trained by the OppaiLib trainer, a container of its own on the box with the GPU<br />
      (<code>ghcr.io/noneye-byte/oppailib-trainer</code>; setup is in <code>trainer/README.md</code>).<br />
      Once it is running, put its address and token under <strong>Settings → Image generation</strong>.
    </div>`}renderWizard(){const e=this.preview,t={1:this.preset?Te(this.preset).title:"What it learns",2:e?`${e.count} picture${e.count===1?"":"s"}`:"What it learns from",3:[this.captions==="trigger"?"Trigger word only":this.leaveOut.length?`${this.leaveOut.length} struck`:"Captions",this.playDown.length?`${this.playDown.length} played down`:""].filter(Boolean).join(" · "),4:"Checkpoint and length"};return r`
      <nav class="stepper">
        ${Ps.map(i=>r`<button class="${this.step===i.n?"on":""} ${this.step>i.n?"done":""}"
          ?disabled=${!this.stepReady(i.n)} @click=${()=>this.goTo(i.n)}>
          <span class="num">${this.step>i.n?r`<span class="material-symbols-rounded">check</span>`:i.n}</span>
          <span class="t">${i.title}<small>${t[i.n]}</small></span>
        </button>`)}
      </nav>
      ${this.trainerError?r`<div class="banner"><span class="material-symbols-rounded">warning</span>The trainer didn't answer: ${this.trainerError}</div>`:d}
      ${this.step===1?this.renderKind():this.step===2?this.renderPictures():this.step===3?this.renderTags():this.renderTrain()}
      ${this.error&&this.step!==4?r`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>`:d}
      ${this.renderNav()}
    `}renderNav(){var i;const e=this.step+1,t={1:this.preset?this.name.trim()?"":"Give it a name to go on":"Pick a kind to go on",2:this.previewing?"Looking at the set…":(i=this.preview)!=null&&i.count?"":"Add some pictures to go on",3:""};return r`<div class="navbar">
      ${this.step>1?r`<button class="btn" @click=${()=>this.goTo(this.step-1)}><span class="material-symbols-rounded">arrow_back</span> Back</button>`:d}
      <span class="spacer"></span>
      ${this.step<4?r`${t[this.step]?r`<span class="hint">${t[this.step]}</span>`:d}
            <button class="btn primary" ?disabled=${!this.stepReady(e)} @click=${()=>this.goTo(e)}>
              Next: ${Ps[this.step].title} <span class="material-symbols-rounded">arrow_forward</span>
            </button>`:d}
    </div>`}renderKind(){const e=this.preset?Te(this.preset):null;return r`
      <div class="card">
        <h3><span class="material-symbols-rounded">category</span> What should it learn?</h3>
        <p class="sub">Pick the closest. It sets everything technical for you — how the pictures are captioned, how long it trains — and all of it can be changed later.</p>
        <div class="presets">
          ${Tt.map(t=>r`<button class="preset ${this.preset===t.id?"on":""}" @click=${()=>this.choosePreset(t.id)}>
            <span class="ic"><span class="material-symbols-rounded">${t.icon}</span></span>
            <b>${t.title}</b>
            <span class="d">${t.blurb}</span>
            <span class="e">${t.examples} · ${t.pictures.ideal[0]}–${t.pictures.ideal[1]} pictures</span>
          </button>`)}
        </div>
        ${e?r`<div class="banner info" style="margin-top:14px;"><span class="material-symbols-rounded">info</span>
              <div><b>Good pictures for ${e.title.toLowerCase().replace(/^an? /,"")}</b><ul class="tips" style="margin-top:4px;">${e.tips.map(t=>r`<li>${t}</li>`)}</ul></div>
            </div>`:d}
      </div>
      ${e?r`<div class="card">
            <h3><span class="material-symbols-rounded">edit</span> Name it</h3>
            <p class="sub">The name is the file the generator lists it under. The trigger word is what you put in a prompt to call it up — one made-up word works best, so it means nothing to the checkpoint yet.</p>
            <div class="row">
              <div>
                <label class="field">Name</label>
                <input type="text" .value=${this.name} placeholder=${e.id==="style"?"ink_style":e.id==="character"?"my_character":"my_lora"}
                  @input=${t=>{this.name=t.target.value,this.triggerTouched||(this.trigger=Vr(this.name))}} />
              </div>
              <div>
                <label class="field">Trigger word</label>
                <input type="text" .value=${this.trigger} placeholder="mychar"
                  @input=${t=>{this.trigger=t.target.value,this.triggerTouched=!0}} />
              </div>
            </div>
          </div>`:d}
    `}async gathered(e){await this.loadSets(),e===this.setId?this.schedulePreview():this.useSet(e)}async copyFromLibrary(){if(this.copying)return;const e=this.libKind==="tag"?{tag:this.libTag.trim(),move:this.libMove}:{collectionId:this.libCollection,move:this.libMove};if(!("tag"in e&&!e.tag||"collectionId"in e&&!e.collectionId)){this.copying=!0,this.copyNote="";try{const t=this.setId||(await m.trainSetCreate(this.name.trim()||"Training set")).id,i=await m.trainSetFromLibrary(t,e);this.copyNote=i.added||i.moved?`${i.added} picture${i.added===1?"":"s"} added to the set${i.moved?`, ${i.moved} taken out of the library`:""}.`:"Those pictures are in the set already.",i.moved&&this.loadCollections(),await this.gathered(t)}catch(t){this.copyNote=t.message}finally{this.copying=!1}}}async deleteSet(){const e=this.sets.find(t=>t.id===this.setId);if(!(!e||!confirm(`Delete the training set “${e.name}” and its ${e.count} picture${e.count===1?"":"s"}? LoRAs already trained on it keep working.`)))try{await m.trainSetDelete(e.id),this.useSet(0),await this.loadSets()}catch(t){this.error=t.message}}renderPictures(){const e=this.preview,t=Te(this.preset||"custom"),i=e?tn(t,{count:e.count,untagged:e.untagged,small:this.smallCount(),captions:this.captions}):[],s=this.sets.find(o=>o.id===this.setId),a=this.name.trim()||"Training set";return r`
      <div class="card">
        <h3><span class="material-symbols-rounded">photo_library</span> The training set</h3>
        <p class="sub">A LoRA learns from a training set: pictures kept for it, apart from your library — they never show up in a grid or a search, and nothing tags them but you, here.</p>
        <div class="sets">
          <button class="settile ${this.setId===0?"on":""}" @click=${()=>this.useSet(0)}>
            <span class="cover"><span class="material-symbols-rounded">add_photo_alternate</span></span>
            <span class="t">New set<small>“${a}”</small></span>
          </button>
          ${this.sets.map(o=>r`<button class="settile ${o.id===this.setId?"on":""}" @click=${()=>this.useSet(o.id)}>
            <span class="cover">${o.coverId?r`<img src=${m.trainPictureURL(o.id,o.coverId,!0)} alt="" loading="lazy" />`:r`<span class="material-symbols-rounded">image</span>`}</span>
            <span class="t" title=${o.name}>${o.name}<small>${o.count} picture${o.count===1?"":"s"}</small></span>
          </button>`)}
        </div>
      </div>
      <div class="card">
        <h3><span class="material-symbols-rounded">add_photo_alternate</span> Add pictures${s?r` to “${s.name}”`:d}</h3>
        <div class="seg">
          ${Qn.map(o=>r`<button class=${this.addMode===o.id?"on":""} @click=${()=>this.addMode=o.id}>
            <span class="material-symbols-rounded">${o.icon}</span>${o.title}
          </button>`)}
        </div>
        <div style="margin-top:14px;">${this.renderAdd((s==null?void 0:s.name)??a)}</div>
      </div>
      ${this.setId&&(e||this.previewing)?r`<div class="card">
            <div class="sethead">
              <h4>${(s==null?void 0:s.name)??"The set"} ${e?r`· ${e.count} picture${e.count===1?"":"s"}${e.count>=e.limit?r` <span class="muted">(the first ${e.limit})</span>`:d}`:d}</h4>
              ${this.previewing?r`<md-circular-progress indeterminate style="--md-circular-progress-size:22px;"></md-circular-progress>`:d}
              ${this.exclude.length?r`<button class="btn small ghost" @click=${()=>this.bringBack()}><span class="material-symbols-rounded">undo</span> Bring back ${this.exclude.length} dropped</button>`:d}
              <button class="btn small ghost" title="Delete this set and its pictures" @click=${()=>this.deleteSet()}><span class="material-symbols-rounded">delete</span> Delete set</button>
            </div>
            <div class="advice">${i.map(o=>r`<div class="banner ${o.level==="good"?"good":o.level==="warn"?"info":""}">
              <span class="material-symbols-rounded">${o.level==="good"?"check_circle":o.level==="warn"?"info":"error"}</span>${o.text}</div>`)}</div>
            ${e!=null&&e.items.length?r`<div class="note">Drop anything that doesn't fit — blurry, cropped badly, or with someone else in it. A dropped picture stays in the set for the next LoRA.</div>
                  <div class="picks" style="margin-top:10px;">${e.items.map(o=>this.renderSetPicture(o))}</div>`:r`<div class="note">Nothing in this set yet — add pictures above.</div>`}
          </div>`:d}
    `}renderAdd(e){var t,i;switch(this.addMode){case"upload":return r`<oppai-lora-gather mode="upload" .setId=${this.setId} .setName=${e}
          @gathered=${s=>this.gathered(s.detail.setId)}></oppai-lora-gather>`;case"x":return r`<oppai-lora-gather mode="x" .setId=${this.setId} .setName=${this.setId||this.name.trim()?e:""}
          @gathered=${s=>this.gathered(s.detail.setId)}></oppai-lora-gather>`;case"rule34":return r`<oppai-lora-gather mode="rule34" .setId=${this.setId} .setName=${this.setId||this.name.trim()?e:""}
          @gathered=${s=>this.gathered(s.detail.setId)}></oppai-lora-gather>`;case"comic":return r`<oppai-lora-comic .setId=${this.setId} .setName=${this.setId||this.name.trim()?e:""}
          .canDetect=${!!((i=(t=this.trainer)==null?void 0:t.features)!=null&&i.includes("detect-people"))} .trainerSet=${!!this.trainer||!!this.trainerError}
          @gathered=${s=>this.gathered(s.detail.setId)}></oppai-lora-comic>`;case"library":{const s=this.libKind==="tag"?!!this.libTag.trim():!!this.libCollection;return r`
          <div class="seg small">
            <button class=${this.libKind==="collection"?"on":""} @click=${()=>this.libKind="collection"}>A collection</button>
            <button class=${this.libKind==="tag"?"on":""} @click=${()=>this.libKind="tag"}>Everything with a tag</button>
          </div>
          <div style="margin-top:10px;">
            ${this.libKind==="collection"?this.collections.length?r`<select @change=${a=>this.pickLibCollection(Number(a.target.value))}>
                    ${this.collections.map(a=>r`<option value=${String(a.id)} ?selected=${a.id===this.libCollection}>${a.name} (${a.count})</option>`)}
                  </select>`:r`<div class="note">Your library has no collections.</div>`:r`<input type="text" .value=${this.libTag} placeholder="A tag in your library: a character's name, an artist, a style…"
                  @input=${a=>this.libTag=a.target.value} />`}
          </div>
          <label class="check"><input type="checkbox" .checked=${this.libMove} @change=${a=>this.libMove=a.target.checked} />
            Take them out of the library once they're in the set</label>
          <div class="note">${this.libMove?"They move: the set keeps the pictures and their tags, and the library no longer lists them. For pictures that were only ever for this LoRA.":"They're copied with their tags; the library keeps its own. A copy costs no space — it's the same file."}</div>
          <div class="row" style="margin-top:10px;">
            <button class="btn primary" style="flex:none;" ?disabled=${!s||this.copying} @click=${()=>this.copyFromLibrary()}>
              <span class="material-symbols-rounded">${this.libMove?"drive_file_move":"content_copy"}</span>
              ${this.copying?"Working…":this.libMove?`Move into “${e}”`:`Copy into “${e}”`}
            </button>
          </div>
          ${this.copyNote?r`<div class="banner info"><span class="material-symbols-rounded">info</span>${this.copyNote}</div>`:d}`}}}renderSetPicture(e){const t=Si(this.baseFamily()),i=e.width&&e.height&&Math.min(e.width,e.height)<t;return r`<div class="pick on" style="outline-color:transparent;cursor:default;">
      <img src=${this.thumb(e.id)} alt="" loading="lazy" />
      <button class="drop" title="Drop from the set" @click=${()=>this.dropPicture(e.id)}><span class="material-symbols-rounded">close</span></button>
      ${i?r`<span class="badge">${e.width}×${e.height}</span>`:d}
    </div>`}renderKeepOnly(e){const t=this.onlyTag.trim()?vs(e.items,this.onlyTag).length:0;return r`<div class="card">
      <h3><span class="material-symbols-rounded">person</span> Keep only one character</h3>
      <p class="sub">Pictures from a comic or a tag search have everyone in them. Type her tag — as the tagger writes it,
        like <b>hatsune_miku</b> — and the pictures she isn't tagged in are dropped from this LoRA (they stay in the set).</p>
      <div class="row" style="align-items:center;">
        <input type="text" list="keep-only-tags" .value=${this.onlyTag} placeholder="Her tag"
          @input=${i=>this.onlyTag=i.target.value} />
        <datalist id="keep-only-tags">${e.commonTags.map(i=>r`<option value=${i.name}></option>`)}</datalist>
        <button class="btn" style="flex:none;" ?disabled=${!t||t===e.count}
          @click=${()=>this.keepOnly(this.onlyTag)}>
          <span class="material-symbols-rounded">close</span> Drop ${t||""} without it
        </button>
      </div>
      ${this.onlyTag.trim()&&t===e.count?r`<div class="note">No picture is tagged with that. Check the spelling against the tags above.</div>`:d}
    </div>`}renderTags(){const e=this.preview;if(!e)return d;const t=Te(this.preset||"custom"),i=this.tagTask;return r`
      <div class="two">
        <div class="card">
          <h3><span class="material-symbols-rounded">auto_awesome</span> Auto-tag</h3>
          <p class="sub">Every picture is captioned from its tags, so a picture with none teaches almost nothing. The tagger looks at each one and writes its tags onto the picture in the set.</p>
          ${this.tagger?i?r`<div class="note">Tagging ${i.done+i.failed} of ${i.total}…</div>
                  <div class="bar" style="margin-top:8px;"><div style="width:${i.total?(i.done+i.failed)/i.total*100:100}%"></div></div>`:r`<div class="banner ${e.untagged?"info":"good"}"><span class="material-symbols-rounded">${e.untagged?"info":"check_circle"}</span>
                    ${e.untagged?`${e.untagged} of ${e.count} picture${e.count===1?" has":"s have"} no tags yet.`:"Every picture has tags."}</div>
                  <div class="row" style="margin-top:10px;flex-wrap:wrap;">
                    ${e.untagged?r`<button class="btn primary" style="flex:none;" @click=${()=>this.autotag(!1)}><span class="material-symbols-rounded">auto_awesome</span> Tag ${e.untagged} picture${e.untagged===1?"":"s"}</button>`:d}
                    <button class="btn" style="flex:none;" @click=${()=>this.autotag(!0)}><span class="material-symbols-rounded">refresh</span> Re-tag all ${e.count}</button>
                  </div>
                  <div class="note">Re-tagging replaces what the tagger said before. Tags you typed yourself are kept.</div>`:r`<div class="banner info"><span class="material-symbols-rounded">info</span>The tagger is off. Turn on AI tagging under Settings → AI, or tag pictures by hand below${this.captions==="tags"?", or caption with the trigger word alone":""}.</div>`}
          ${this.tagNote?r`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.tagNote}</div>`:d}
        </div>
        <div class="card">
          <h3><span class="material-symbols-rounded">text_fields</span> Captions</h3>
          <div class="seg">
            <button class=${this.captions==="tags"?"on":""} @click=${()=>this.captions="tags"}>Trigger + tags</button>
            <button class=${this.captions==="trigger"?"on":""} @click=${()=>this.captions="trigger"}>Trigger only</button>
          </div>
          <div class="note">${this.captions==="trigger"?"Every picture is captioned with the trigger word alone, so everything the pictures share — and much of what they don't — goes into it. Simple, but less flexible.":t.captionsWhy}</div>
          ${e.items[0]?r`<div class="caption">${this.caption(e.items[0])}</div>`:d}
        </div>
      </div>
      ${this.captions==="tags"&&e.commonTags.length?r`<div class="card">
            <h3><span class="material-symbols-rounded">label_off</span> What the trigger word stands for</h3>
            <p class="sub">The tags these pictures share, with how many have each. A struck tag is left out of every caption, so the trigger word learns it instead — strike what should always come with the LoRA, keep what you want to be able to change with the prompt.</p>
            ${this.suggested.length&&!this.leaveOutTouched?r`<div class="banner info"><span class="material-symbols-rounded">auto_fix_high</span>
                  <div>Struck for you: <b>${this.suggested.join(", ")}</b>. Click a tag to change it.</div></div>`:d}
            <div class="chips" style="margin-top:8px;">${e.commonTags.map(s=>{const a=this.leaveOut.some(o=>N(o)===N(s.name));return r`<button class="chip ${a?"out":""}" @click=${()=>this.toggleLeaveOut(s.name)}>
                ${s.name} <b>${s.count}</b></button>`})}</div>
          </div>`:d}
      ${e.commonTags.length?this.renderPlayDown(e):d}
      ${e.count&&e.untagged<e.count?this.renderKeepOnly(e):d}
      <div class="card">
        <h3><span class="material-symbols-rounded">edit_note</span> Every picture</h3>
        <p class="sub">Each caption as it will be written. Click a picture to fix its tags or drop it from the set.</p>
        <div class="picks captions-grid">${e.items.map(s=>{const a=this.caption(s);return r`<button class="pick cap ${s.tags.length?"":"bare"}" @click=${()=>{this.editing=s.id,this.newTag=""}}>
            <img src=${this.thumb(s.id)} alt="" loading="lazy" />
            <span class="c">${s.tags.length||this.captions==="trigger"?a:"No tags"}</span>
          </button>`})}</div>
      </div>
    `}renderPlayDown(e){const t=e.commonTags.filter(i=>i.count<e.count||Ge(this.playDown,i.name)).slice(0,30);return r`<div class="card">
      <h3><span class="material-symbols-rounded">visibility_off</span> Show less often</h3>
      <p class="sub">A tag on more of these pictures than you want in the LoRA — glasses, a hat, one background — ends up in everything it draws. Pick it here and it is played down, not removed: it stays in the captions, so it still comes when you prompt for it, and the pictures with it are trained less often than the ones without, so it comes less when you don't.</p>
      <div class="chips">${t.map(i=>{const s=Ge(this.playDown,i.name);return r`<button class="chip ${s?"manual":""}" aria-pressed=${s?"true":"false"} @click=${()=>this.togglePlayDown(i.name)}>
          ${s?r`<span class="material-symbols-rounded">visibility_off</span>`:d}${i.name} <b>${i.count}</b></button>`})}</div>
      ${this.playDown.map(i=>{var s,a;return r`<div class="playdown">
        <div class="playdown-head">
          <b>${i.tag}</b>
          <div class="seg">${on.map(o=>r`<button class=${Math.abs(i.keep-o.keep)<.01?"on":""}
            @click=${()=>this.setPlayDown(nn(this.playDown,i.tag,o.keep))}>${o.label}</button>`)}</div>
          <button class="btn small ghost" title="Stop playing this down" @click=${()=>this.togglePlayDown(i.tag)}>
            <span class="material-symbols-rounded">close</span></button>
        </div>
        <div class="note">${this.previewing&&!((s=e.playDown)!=null&&s.some(o=>N(o.tag)===N(i.tag)))?"Working it out…":pn((a=e.playDown)==null?void 0:a.find(o=>N(o.tag)===N(i.tag)),e.count)}</div>
      </div>`})}
    </div>`}toggleLeaveOut(e){this.leaveOut=Kr(this.leaveOut,e),this.leaveOutTouched=!0,Ge(this.playDown,e)&&this.leaveOut.some(t=>N(t)===N(e))&&this.setPlayDown(fs(this.playDown,e))}togglePlayDown(e){const t=fs(this.playDown,e);Ge(t,e)&&this.leaveOut.some(i=>N(i)===N(e))&&(this.leaveOut=this.leaveOut.filter(i=>N(i)!==N(e)),this.leaveOutTouched=!0),this.setPlayDown(t)}setPlayDown(e){this.playDown=e,this.schedulePreview(350)}renderEditor(){var a;const e=((a=this.preview)==null?void 0:a.items)??[],t=e.findIndex(o=>o.id===this.editing),i=e[t];if(!i)return d;const s=o=>{const n=e[(t+o+e.length)%e.length];n&&(this.editing=n.id,this.newTag="")};return r`<div class="editor" @click=${o=>{o.target===o.currentTarget&&this.closeEditor()}}
      @keydown=${o=>{o.key==="Escape"&&this.closeEditor()}}>
      <div class="panel">
        <div class="pic"><img src=${m.trainPictureURL(this.setId,i.id)} alt="" /></div>
        <div class="side">
          <div class="head">
            <b>Picture ${t+1} of ${e.length}</b>
            <button class="btn small ghost" title="Previous" @click=${()=>s(-1)}><span class="material-symbols-rounded">chevron_left</span></button>
            <button class="btn small ghost" title="Next" @click=${()=>s(1)}><span class="material-symbols-rounded">chevron_right</span></button>
            <button class="btn small ghost" title="Close" @click=${()=>this.closeEditor()}><span class="material-symbols-rounded">close</span></button>
          </div>
          <label class="field">Tags <span class="muted" style="font-weight:400;">— outlined ones you typed; struck ones are left out of every caption</span></label>
          <div class="chips">
            ${i.tags.length?i.tags.map(o=>{const n=this.leaveOut.some(l=>N(l)===N(o.name));return r`<span class="chip ${o.manual?"manual":""} ${n?"out":""}">${o.name}
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
    </div>`}renderTrain(){var o,n;const e=this.preview,t=Te(this.preset||"custom"),i=Qr((e==null?void 0:e.count)??0,this.epochs,this.repeats),s=!!this.name.trim()&&!!this.base&&!this.starting&&!this.trainerError&&!!(e!=null&&e.count),a=(o=this.trainer)!=null&&o.vramMB?Math.round(this.trainer.vramMB/1024):0;return r`
      <div class="two">
        <div class="card">
          <h3><span class="material-symbols-rounded">deployed_code</span> Train against</h3>
          <p class="sub">A LoRA works on the family it was trained on: one trained on a Pony checkpoint suits Pony and its merges, not SD 1.5. Pick the checkpoint you'll generate with.</p>
          <select @change=${l=>this.base=l.target.value}>
            ${this.base?d:r`<option value="">Choose a checkpoint</option>`}
            ${this.models.map(l=>r`<option value=${l.title} ?selected=${l.title===this.base}>${l.model_name||l.title}${l.base?` · ${l.base}`:""}</option>`)}
          </select>

          <label class="field">How long</label>
          <div class="seg">
            ${ki.map(l=>r`<button class=${this.effort===l.id?"on":""} title=${l.blurb} @click=${()=>this.chooseEffort(l.id)}>${l.title}</button>`)}
          </div>
          <div class="note">${(n=ki.find(l=>l.id===this.effort))==null?void 0:n.blurb}.</div>

          <label class="check">
            <input type="checkbox" .checked=${this.freeGpu} @change=${l=>this.freeGpu=l.target.checked} />
            <span>Free the generator's GPU while training<small>Asks the generator to unload its checkpoint when training starts, and to load it again after. Leave on if they share a card.</small></span>
          </label>
          <label class="check">
            <input type="checkbox" .checked=${this.samples} @change=${l=>this.samples=l.target.checked} />
            <span>Render a sample at the end<small>A picture made with the new LoRA, which becomes its cover.</small></span>
          </label>
          ${(()=>{const l=dn(this.resolution,this.baseFamily(),this.lowVram),p=un((e==null?void 0:e.items)??[],l);return r`<label class="check">
              <input type="checkbox" .checked=${this.fit} @change=${u=>this.fit=u.target.checked} />
              <span>Fit every picture to the training size<small>Each is resized to fill ${l}×${l} in its own shape
                before it is sent${p?r` — <b>${p}</b> ${p===1?"is":"are"} smaller than that and will be enlarged
                with the generator's upscaler first`:""}. Off, small pictures train at their small size.</small></span>
            </label>`})()}
          <label class="check">
            <input type="checkbox" .checked=${this.lowVram} @change=${l=>{this.lowVram=l.target.checked,this.lowVramTouched=!0}} />
            <span>Low VRAM${a?` (the trainer's card has ${a} GB)`:""}<small>For a card under 12 GB with SDXL: trains at 768 and leaves the text encoder alone.</small></span>
          </label>
        </div>
        <div class="card">
          <h3><span class="material-symbols-rounded">steps</span> Summary</h3>
          <div class="summary">
            <div class="stat"><small>Kind</small><b>${t.title.replace(/^An? /,"").replace(/^./,l=>l.toUpperCase())}</b></div>
            <div class="stat"><small>Pictures</small><b>${(e==null?void 0:e.count)??0}</b></div>
            <div class="stat"><small>Trigger word</small><b>${this.trigger||"—"}</b></div>
            <div class="stat"><small>Training steps</small><b>≈ ${i.toLocaleString()}</b></div>
          </div>
          ${e!=null&&e.items[0]?r`<label class="field">A caption</label><div class="caption" style="margin:0;">${this.caption(e.items[0])}</div>`:d}
          <div class="note">${this.epochs} passes over the set (epochs), each picture shown ${this.repeats||(e?Math.max(1,Math.round(i/Math.max(1,e.count*this.epochs))):0)}× a pass.</div>
          <button class="btn ghost" style="margin-top:10px;" @click=${()=>this.advanced=!this.advanced}>
            <span class="material-symbols-rounded">${this.advanced?"expand_less":"tune"}</span> ${this.advanced?"Hide":"Show"} the settings
          </button>
          ${this.advanced?this.renderAdvanced():d}
        </div>
      </div>
      ${this.error?r`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>`:d}
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
      ${this.error?r`<div class="banner"><span class="material-symbols-rounded">warning</span>${this.error}</div>`:d}
      <div class="runs">${this.runs.map(e=>this.renderRun(e))}</div>`:r`<div class="card empty">
        <span class="material-symbols-rounded">history</span>No runs yet. Set one up under <b>New LoRA</b>; it carries on with this screen closed.
        <div style="margin-top:12px;"><button class="btn primary" @click=${()=>this.tab="new"}><span class="material-symbols-rounded">add</span> New LoRA</button></div>
      </div>`}renderRun(e){var o,n,l,p;const t=Gr(e),i=Yt(e),s=(o=e.samples)!=null&&o.length?[...e.samples].sort()[e.samples.length-1]:"",a=(n=e.request)!=null&&n.preset?Te(e.request.preset):null;return r`<div class="run">
      ${s?r`<img src=${m.trainSampleURL(e.id,s)} alt="Sample" />`:e.status==="done"?r`<div class="ph"><span class="material-symbols-rounded">${(a==null?void 0:a.icon)??"model_training"}</span>
              <img src=${m.loraThumbURL(e.name)} alt="" @error=${u=>u.target.remove()} /></div>`:r`<div class="ph"><span class="material-symbols-rounded">${(a==null?void 0:a.icon)??"model_training"}</span></div>`}
      <div class="body">
        <div class="run-head">
          <span class="name" title=${e.name}>${e.name}</span>
          <span class="spacer"></span>
          <span class="status ${e.status}">${e.status}</span>
        </div>
        <div class="line">${Hr(e)}</div>
        ${i?r`<div class="bar ${t===null?"unknown":""}"><div style=${t===null?"":`width:${(t*100).toFixed(1)}%`}></div></div>`:d}
        <div class="meta">
          ${a?r`<span>${a.title}</span>`:d}
          ${e.trigger?r`<span>Trigger <b>${e.trigger}</b></span>`:d}
          <span>${e.images} pictures</span>
          <span>${e.baseModel}${e.family?` (${e.family==="sdxl"?"SDXL":"SD 1.5"})`:""}</span>
          <span>${new Date(e.createdAt*1e3).toLocaleString()}</span>
        </div>
        ${e.status==="done"?r`<div class="note">Installed — pick it under LoRAs in the studio${e.trigger?r`, and put <b>${e.trigger}</b> in the prompt`:""}.</div>`:d}
        ${this.openLog===e.id&&((l=e.log)!=null&&l.length)?r`<pre class="log">${e.log.join(`
`)}</pre>`:d}
        <div class="run-actions">
          ${i&&e.status!=="installing"?r`<button class="btn small danger" @click=${()=>this.cancel(e)}><span class="material-symbols-rounded">stop</span> Stop</button>`:d}
          ${e.status==="done"?r`<button class="btn small tonal" @click=${()=>this.compare(e)}><span class="material-symbols-rounded">compare</span> Compare</button>`:d}
          ${(p=e.log)!=null&&p.length?r`<button class="btn small" @click=${()=>this.openLog=this.openLog===e.id?0:e.id}>
                <span class="material-symbols-rounded">terminal</span> ${this.openLog===e.id?"Hide log":"Log"}</button>`:d}
          ${!i&&e.request?r`<button class="btn small" @click=${()=>this.again(e)}><span class="material-symbols-rounded">replay</span> Train again</button>`:d}
          ${i?d:r`<button class="btn small ghost" @click=${()=>this.forget(e)}><span class="material-symbols-rounded">delete</span> Remove</button>`}
        </div>
      </div>
    </div>`}};S.styles=[ue,Oe,Mt,re`
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
      .playdown { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--oppai-border); }
      .playdown-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .playdown-head b { font-size: 14px; min-width: 80px; }
      .playdown .note { margin-top: 6px; }
      .editor form input { flex: 1; }
    `];C([z({attribute:!1})],S.prototype,"models",2);C([z({attribute:!1})],S.prototype,"loras",2);C([z()],S.prototype,"checkpoint",2);C([c()],S.prototype,"tab",2);C([c()],S.prototype,"step",2);C([c()],S.prototype,"configured",2);C([c()],S.prototype,"trainer",2);C([c()],S.prototype,"trainerError",2);C([c()],S.prototype,"tagger",2);C([c()],S.prototype,"runs",2);C([c()],S.prototype,"loaded",2);C([c()],S.prototype,"preset",2);C([c()],S.prototype,"effort",2);C([c()],S.prototype,"name",2);C([c()],S.prototype,"trigger",2);C([c()],S.prototype,"triggerTouched",2);C([c()],S.prototype,"base",2);C([c()],S.prototype,"sets",2);C([c()],S.prototype,"setId",2);C([c()],S.prototype,"addMode",2);C([c()],S.prototype,"exclude",2);C([c()],S.prototype,"onlyTag",2);C([c()],S.prototype,"collections",2);C([c()],S.prototype,"libKind",2);C([c()],S.prototype,"libCollection",2);C([c()],S.prototype,"libTag",2);C([c()],S.prototype,"libMove",2);C([c()],S.prototype,"copying",2);C([c()],S.prototype,"copyNote",2);C([c()],S.prototype,"captions",2);C([c()],S.prototype,"leaveOut",2);C([c()],S.prototype,"leaveOutTouched",2);C([c()],S.prototype,"playDown",2);C([c()],S.prototype,"suggested",2);C([c()],S.prototype,"preview",2);C([c()],S.prototype,"previewing",2);C([c()],S.prototype,"tagTask",2);C([c()],S.prototype,"tagNote",2);C([c()],S.prototype,"editing",2);C([c()],S.prototype,"newTag",2);C([c()],S.prototype,"advanced",2);C([c()],S.prototype,"epochs",2);C([c()],S.prototype,"repeats",2);C([c()],S.prototype,"rank",2);C([c()],S.prototype,"alpha",2);C([c()],S.prototype,"resolution",2);C([c()],S.prototype,"learningRate",2);C([c()],S.prototype,"textEncoderLr",2);C([c()],S.prototype,"optimizer",2);C([c()],S.prototype,"noiseOffset",2);C([c()],S.prototype,"lowVram",2);C([c()],S.prototype,"lowVramTouched",2);C([c()],S.prototype,"flip",2);C([c()],S.prototype,"fit",2);C([c()],S.prototype,"freeGpu",2);C([c()],S.prototype,"samples",2);C([c()],S.prototype,"starting",2);C([c()],S.prototype,"error",2);C([c()],S.prototype,"openLog",2);C([c()],S.prototype,"compareFocus",2);S=C([ge("oppai-lora-train")],S);const tl=new Set([",",`
`,"|","(",")","[","]","{","}"]);function Ls(e,t){return tl.has(e[t])?!(t>0&&e[t-1]==="\\"&&"()[]{}".includes(e[t])):!1}function il(e,t){t=Math.max(0,Math.min(t,e.length));const i=e.slice(0,t),s=/<lora:([^:>]*)$/i.exec(i);if(s){const g=s.index;let w=t;const x=e.indexOf(">",t),y=e.indexOf("<",t);return x>=0&&(y<0||x<y)&&(w=x+1),{start:g,end:w,query:s[1].trim(),mode:"lora"}}let a=t;for(;a>0&&!Ls(e,a-1);)a--;let o=t;for(;o<e.length&&!Ls(e,o);)o++;const n=e.slice(a,t),l=n.length-n.trimStart().length;if(a+=l,e.slice(a,t).includes(":")||/<[^>]*$/.test(e.slice(a,t)))return null;const p=e.slice(t,o).indexOf(":");for(p>=0&&(o=t+p);o>t&&/\s/.test(e[o-1]);)o--;const u=e.slice(a,t),h=/^__([^_]*(?:_[^_]+)*)_{0,2}$/.exec(u);if(u.startsWith("__")&&h){let g=o;const w=e.indexOf("__",a+2);return w>=0&&w+2<=o&&(g=w+2),{start:a,end:g,query:h[1],mode:"wildcard"}}return{start:a,end:o,query:sl(u).trim(),mode:"tag"}}function Ms(e){return e.replace(/([()[\]{}])/g,"\\$1")}function sl(e){return e.replace(/\\([()[\]{}])/g,"$1")}function Is(e,t,i){const s=e.slice(t.end);let a="";return t.mode!=="lora"&&s.trim()===""&&(a=", "),{text:e.slice(0,t.start)+i+a+s.replace(/^\s+$/,""),caret:t.start+i.length+a.length}}function al(e,t){const i=e.toLowerCase();return t?i===t?0:i.startsWith(t)?1:i.split(/[\s_\-.]+/).some(s=>s.startsWith(t))?2:i.includes(t)?3:-1:2}function Qt(e,t,i,s){return e.map(a=>({t:a,s:al(t(a),i)})).filter(a=>a.s>=0).sort((a,o)=>a.s-o.s||t(a.t).localeCompare(t(o.t))).slice(0,s).map(a=>a.t)}function ol(e,t,i=8){const s=e.query.toLowerCase();return e.mode==="lora"?Qt(t.loras,a=>a.alias||a.name,s,i).map(a=>({kind:"lora",label:a.alias||a.name,insert:`<lora:${a.name}:${rl(a.weight??1)}>`,detail:a.alias&&a.alias!==a.name?a.name:void 0})):e.mode==="wildcard"?Qt(t.wildcards,a=>a.name,s,i).map(a=>({kind:"wildcard",label:`__${a.name}__`,insert:`__${a.name}__`,detail:a.lines?`${a.lines} line${a.lines===1?"":"s"}`:void 0})):s.length<1?[]:Qt(t.triggers,a=>a,s,Math.min(3,i)).map(a=>({kind:"trigger",label:a,insert:a,detail:"trigger word"}))}function rl(e){return Number.isInteger(e)?String(e):String(Math.round(e*100)/100)}function nl(e,t,i=10){const s=new Set,a=[];for(const o of[...e,...t]){const n=o.insert.toLowerCase();if(!s.has(n)&&(s.add(n),a.push(o),a.length>=i))break}return a}function ll(e){return e?e>=1e6?`${(e/1e6).toFixed(1)}M`:e>=1e4?`${Math.round(e/1e3)}k`:e>=1e3?`${(e/1e3).toFixed(1)}k`:String(e):""}function pl(e,t,i){return t<=0?-1:e<0?i>0?0:t-1:(e+i+t)%t}function dl(e,t,i,s,a){const o=i.width>0?(e-i.left)/i.width*s:0,n=i.height>0?(t-i.top)/i.height*a:0;return{x:Math.max(0,Math.min(s,o)),y:Math.max(0,Math.min(a,n))}}function cl(e,t,i){return Math.max(2,Math.round(Math.min(t,i)*e))}function ei(e,t,i=2048){if(e<=0||t<=0)return{width:512,height:512};const s=Math.min(1,i/Math.max(e,t)),a=o=>Math.max(64,Math.floor(o*s/8)*8);return{width:a(e),height:a(t)}}function hl(e){const t=Math.floor(e.length/4);if(t===0)return 0;let i=0;for(let s=0;s<t;s++)e[s*4]>=128&&i++;return i/t}function ul(e){return e.some(t=>!t.erase&&t.points.length>0)}function ml(e,t,i){const s=Math.max(1,i/3),a=Math.hypot(t.x-e.x,t.y-e.y),o=Math.max(1,Math.ceil(a/s)),n=[];for(let l=1;l<=o;l++)n.push({x:e.x+(t.x-e.x)*l/o,y:e.y+(t.y-e.y)*l/o});return n}var gl=Object.defineProperty,fl=Object.getOwnPropertyDescriptor,le=(e,t,i,s)=>{for(var a=s>1?void 0:s?fl(t,i):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(a=(s?n(t,i,a):n(a))||a);return s&&a&&gl(t,i,a),a};const Ds=[{fraction:.025,label:"Fine"},{fraction:.06,label:"Medium"},{fraction:.12,label:"Broad"}];let te=class extends me{constructor(){super(...arguments),this.src="",this.name="",this.width=0,this.height=0,this.strokes=[],this.denoise=.6,this.erase=!1,this.brush=Ds[1].fraction,this.strength=.6,this.drawn=[],this.error="",this.ring=null,this.live=null,this.onKey=e=>{e.key==="Escape"?this.close():(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"&&(e.preventDefault(),this.undo())}}connectedCallback(){super.connectedCallback(),this.drawn=[...this.strokes],this.strength=this.denoise,window.addEventListener("keydown",this.onKey)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("keydown",this.onKey)}firstUpdated(){this.redraw()}size(){return cl(this.brush,this.width,this.height)}paint(e,t,i){e.lineCap="round",e.lineJoin="round";for(const s of t){if(!s.points.length)continue;e.globalCompositeOperation=s.erase&&!i?"destination-out":"source-over";const a=i?s.erase?"#000":"#fff":"#ff3d6e";if(e.strokeStyle=a,e.fillStyle=a,e.lineWidth=s.size,s.points.length===1){e.beginPath(),e.arc(s.points[0].x,s.points[0].y,s.size/2,0,Math.PI*2),e.fill();continue}e.beginPath(),e.moveTo(s.points[0].x,s.points[0].y);for(const o of s.points.slice(1))e.lineTo(o.x,o.y);e.stroke()}e.globalCompositeOperation="source-over"}redraw(){const e=this.canvas,t=e==null?void 0:e.getContext("2d");!e||!t||(t.clearRect(0,0,e.width,e.height),this.paint(t,this.live?[...this.drawn,this.live]:this.drawn,!1))}at(e){return dl(e.clientX,e.clientY,this.canvas.getBoundingClientRect(),this.width,this.height)}moveRing(e){const t=this.canvas.getBoundingClientRect();this.ring={x:e.clientX-t.left,y:e.clientY-t.top,d:this.size()/this.width*t.width}}down(e){e.button===0&&(this.canvas.setPointerCapture(e.pointerId),this.live={erase:this.erase,size:this.size(),points:[this.at(e)]},this.error="",this.redraw())}move(e){this.moveRing(e);const t=this.live;t&&(t.points.push(...ml(t.points[t.points.length-1],this.at(e),t.size)),this.redraw())}up(){this.live&&(this.drawn=[...this.drawn,this.live],this.live=null,this.redraw())}undo(){this.drawn=this.drawn.slice(0,-1),this.redraw()}clear(){this.drawn=[],this.redraw()}close(){this.dispatchEvent(new CustomEvent("close",{bubbles:!0,composed:!0}))}maskData(){const e=document.createElement("canvas");e.width=this.width,e.height=this.height;const t=e.getContext("2d");t.fillStyle="#000",t.fillRect(0,0,e.width,e.height),this.paint(t,this.drawn,!0);const i=hl(t.getImageData(0,0,e.width,e.height).data);return{url:e.toDataURL("image/png"),share:i}}apply(e){if(!ul(this.drawn)){this.error="Paint over the part to redo first.";return}const t=this.maskData();if(t.share===0){this.error="Everything painted was rubbed out again — paint over the part to redo.";return}this.dispatchEvent(new CustomEvent("apply",{detail:{strokes:this.drawn,mask:t.url,denoise:this.strength,generate:e},bubbles:!0,composed:!0}))}render(){const e=this.ring;return r`
      <div class="stage">
        <img src=${this.src} alt=${this.name} draggable="false" @load=${()=>this.redraw()} />
        <canvas width=${this.width} height=${this.height}
          @pointerdown=${t=>this.down(t)}
          @pointermove=${t=>this.move(t)}
          @pointerup=${()=>this.up()}
          @pointercancel=${()=>this.up()}
          @pointerleave=${()=>this.ring=null}></canvas>
        ${e?r`<div class="ring ${this.erase?"erase":""}"
          style=${`left:${e.x}px;top:${e.y}px;width:${e.d}px;height:${e.d}px;`}></div>`:null}
      </div>
      <div class="hint ${this.error?"err":""}">${this.error||"Paint over what to redo. The prompt below the canvas says what goes there; everything unpainted stays exactly as it is."}</div>
      <div class="bar">
        <div class="seg" role="group" aria-label="Tool">
          <button class=${this.erase?"":"on"} @click=${()=>this.erase=!1}>
            <span class="material-symbols-rounded">brush</span>Brush</button>
          <button class=${this.erase?"on":""} @click=${()=>this.erase=!0}>
            <span class="material-symbols-rounded">ink_eraser</span>Eraser</button>
        </div>
        <div class="seg" role="group" aria-label="Brush size">
          ${Ds.map(t=>r`<button class=${this.brush===t.fraction?"on":""} @click=${()=>this.brush=t.fraction}>${t.label}</button>`)}
        </div>
        <button class="btn" title="Undo (Ctrl+Z)" ?disabled=${!this.drawn.length} @click=${()=>this.undo()}>
          <span class="material-symbols-rounded">undo</span>Undo</button>
        <button class="btn" ?disabled=${!this.drawn.length} @click=${()=>this.clear()}>
          <span class="material-symbols-rounded">delete_sweep</span>Clear</button>
        <label class="strength" title="How far the painted part may change: low touches it up, high redraws it">
          Change
          <input type="range" min="0.2" max="1" step="0.05" .value=${String(this.strength)}
            @input=${t=>this.strength=Number(t.target.value)} />
          ${Math.round(this.strength*100)}%
        </label>
        <span class="spacer"></span>
        <button class="btn" @click=${()=>this.close()}>Cancel</button>
        <button class="btn" @click=${()=>this.apply(!1)}>
          <span class="material-symbols-rounded">check</span>Done</button>
        <button class="btn primary" @click=${()=>this.apply(!0)}>
          <span class="material-symbols-rounded">auto_awesome</span>Repaint</button>
      </div>
    `}};te.styles=[ue,re`
      :host {
        position: fixed; inset: 0; z-index: 30; background: var(--oppai-scrim, rgba(0, 0, 0, 0.72));
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 16px;
      }
      .stage { position: relative; display: inline-block; line-height: 0; touch-action: none; }
      .stage img {
        display: block; max-width: min(100%, calc(100vw - 32px)); max-height: calc(100vh - 210px);
        border-radius: 10px; user-select: none; -webkit-user-drag: none;
      }
      canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.55; cursor: none; border-radius: 10px; }
      .ring {
        position: absolute; border: 2px solid #fff; border-radius: 50%; pointer-events: none;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6); transform: translate(-50%, -50%);
      }
      .ring.erase { border-style: dashed; }
      .bar {
        background: var(--oppai-surface); color: var(--oppai-text); border-radius: 16px; padding: 10px 12px;
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center;
        max-width: min(980px, 100%); font-size: 13px;
      }
      .seg { display: inline-flex; background: var(--oppai-surface-2); border-radius: 999px; padding: 3px; gap: 2px; }
      .seg button {
        border: none; background: transparent; color: var(--oppai-text-dim); font: inherit; font-size: 12.5px;
        border-radius: 999px; padding: 5px 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
      }
      .seg button.on { background: var(--oppai-surface); color: var(--oppai-text); font-weight: 600; }
      .seg .material-symbols-rounded { font-size: 17px; }
      .btn {
        border: 1px solid var(--oppai-border-strong); background: transparent; color: var(--oppai-text);
        border-radius: 999px; font: inherit; font-size: 13px; padding: 6px 12px; cursor: pointer;
        display: inline-flex; align-items: center; gap: 5px;
      }
      .btn:disabled { opacity: 0.45; cursor: default; }
      .btn.primary { background: var(--oppai-primary); color: var(--oppai-on-primary, #fff); border-color: transparent; font-weight: 600; }
      .btn .material-symbols-rounded { font-size: 17px; }
      label.strength { display: inline-flex; align-items: center; gap: 6px; color: var(--oppai-text-dim); }
      label.strength input { width: 120px; }
      .spacer { flex: 1; }
      .hint { color: var(--oppai-text-dim); font-size: 12.5px; text-align: center; max-width: 720px; }
      .err { color: var(--oppai-error, #f2b8b5); }
    `];le([z()],te.prototype,"src",2);le([z()],te.prototype,"name",2);le([z({type:Number})],te.prototype,"width",2);le([z({type:Number})],te.prototype,"height",2);le([z({attribute:!1})],te.prototype,"strokes",2);le([z({type:Number})],te.prototype,"denoise",2);le([c()],te.prototype,"erase",2);le([c()],te.prototype,"brush",2);le([c()],te.prototype,"strength",2);le([c()],te.prototype,"drawn",2);le([c()],te.prototype,"error",2);le([c()],te.prototype,"ring",2);le([Pt("canvas")],te.prototype,"canvas",2);te=le([ge("oppai-paint-mask")],te);const Ci=4;function ti(){return{character:"",words:"",lora:"",loraWeight:.8,share:1}}function bl(e,t,i=[]){var l;const s=t.find(p=>p.id===e.character),a=[(s==null?void 0:s.prompt.trim())??"",e.words.trim()].filter(Boolean).join(", "),o=a.toLowerCase(),n=e.lora?(((l=i.find(p=>p.name===e.lora))==null?void 0:l.triggerPhrases)??[]).map(p=>p.trim()).filter(p=>p&&!o.includes(p.toLowerCase())):[];return[a,...n].filter(Boolean).join(", ")}function vl(e,t,i,s,a=[]){const o=i.slice(0,Ci).map(n=>({prompt:bl(n,s,a),loras:n.lora?[{name:n.lora,weight:n.loraWeight}]:void 0,share:n.share>0&&n.share!==1?n.share:void 0}));if(!(o.length<2))return{enabled:!0,rows:t||void 0,parts:o}}function xl(e,t){var s,a;const i=[];for(const o of e){const n=(a=(s=t.find(l=>l.id===o.character))==null?void 0:s.negativePrompt)==null?void 0:a.trim();n&&!i.includes(n)&&i.push(n)}return i}function Rs(e){const t=e.map(a=>a.share>0?a.share:1),i=t.reduce((a,o)=>a+o,0)||1;let s=0;return t.map(a=>{const o={start:s/i,size:a/i};return s+=a,o})}function yl(e){return((e==null?void 0:e.parts)??[]).map(t=>{var i,s,a,o;return{character:"",words:t.prompt,lora:((s=(i=t.loras)==null?void 0:i[0])==null?void 0:s.name)??"",loraWeight:((o=(a=t.loras)==null?void 0:a[0])==null?void 0:o.weight)??.8,share:t.share??1}})}function Di(e,t){const i=new Set(t.map(s=>s.lora).filter(Boolean));return Object.fromEntries(Object.entries(e).filter(([s])=>!i.has(s)))}function wl(e,t,i,s){const a=new Set(Object.keys(Di(t,i))),o=new Set(i.map(p=>p.lora).filter(Boolean)),n=new Set(s.filter(p=>a.has(p.name)).flatMap(p=>p.triggerPhrases??[])),l=new Set(s.filter(p=>o.has(p.name)).flatMap(p=>p.triggerPhrases??[]));return e.filter(p=>n.has(p)||!l.has(p))}function $l(e,t,i,s,a,o){const n=Math.max(1,t.length),l=e?s/n/Math.max(1,i):i/n/Math.max(1,s),p=new Set(Object.keys(Di(a,t))),u=o.filter(h=>p.has(h.name)&&h.categoryKey==="character").map(h=>h.name);return{narrow:n>1&&l<.45,everyone:u}}function kl(e,t,i,s){return e.map((a,o)=>o===t?{...a,lora:i,loraWeight:s&&s>0?s:.8}:a)}function Sl(e,t){return e.some(i=>i.lora===t)?e.map(i=>i.lora===t?{...i,lora:""}:i):e}const Cl=4096,Os=8192;function zl(e){return Math.round(e*100)/100}function ii(e,t,i){const s=i>1?i:2;return zl(Math.max(1,Math.min(s,4,Cl/Math.max(e,t,1))))}function As(e,t,i){const s=Math.min(i>1?i:2,4),a=Math.max(e,t);return a>0&&a*s>Os?Math.max(1,Os/a):s}function xt(e,t,i){return{width:Math.round(e*i),height:Math.round(t*i)}}function Es(e,t){return[...new Set([...e??[],...t??[]])]}var Tl=Object.defineProperty,Pl=Object.getOwnPropertyDescriptor,b=(e,t,i,s)=>{for(var a=s>1?void 0:s?Pl(t,i):t,o=e.length-1,n;o>=0;o--)(n=e[o])&&(a=(s?n(t,i,a):n(a))||a);return s&&a&&Tl(t,i,a),a};function _s(){const e=window;return e.SpeechRecognition??e.webkitSpeechRecognition??null}const it=[{id:"models",label:"Models",icon:"deployed_code"},{id:"loras",label:"LoRAs",icon:"style"},{id:"look",label:"Look",icon:"face"},{id:"wildcards",label:"Wildcards",icon:"category"},{id:"detailer",label:"ADetailer",icon:"face_retouching_natural"},{id:"settings",label:"Settings",icon:"tune"}],Ll=[{id:"outfit",label:"Outfit",icon:"checkroom"},{id:"look",label:"Look",icon:"photo_camera"},{id:"prompt",label:"Prompt",icon:"edit_note"},{id:"generator",label:"Generator",icon:"deployed_code"}],Bs=[{id:"image",label:"Image",icon:"image"},{id:"video",label:"Video",icon:"movie"},{id:"sprites",label:"Sprites",icon:"face_retouching_natural"}],V={history:[],queue:[]},zi=new Set;function Be(){for(const e of zi)e()}function Ml(e){return zi.add(e),()=>zi.delete(e)}const Il=[{keys:"Ctrl Enter",what:"Generate"},{keys:"Ctrl Shift Enter",what:"Add to the queue",mode:"image"},{keys:"← →",what:"Previous / next picture",mode:"image"},{keys:"C",what:"Compare with the next picture",mode:"image"},{keys:"S",what:"Save the picture on the stage",mode:"image"},{keys:"← → ↑ ↓",what:"Move around the board",mode:"sprites"},{keys:"Enter",what:"Generate the square, then the next",mode:"sprites"},{keys:"R",what:"Review the square's cutout",mode:"sprites"},{keys:"[",what:"Show or hide the inspector"},{keys:"]",what:"Show or hide the gallery / square panel"},{keys:"\\",what:"Focus: hide both panels"},{keys:"Alt 1 · 2 · 3",what:"Image · Video · Sprites"},{keys:"?",what:"This sheet"}],se=[{id:"neutral",label:"Neutral",face:"calm neutral expression, relaxed face, looking at viewer",pose:"both arms hanging naturally at her sides, relaxed hands"},{id:"happy",label:"Happy",face:"warm genuine smile, bright eyes, cheerful expression",pose:"hands loosely clasped behind her lower back, open cheerful posture"},{id:"mischievous",label:"Mischievous",face:"smirk, half-lidded eyes, teasing knowing expression",pose:"one hand resting on her hip, other arm relaxed at her side"},{id:"surprised",label:"Surprised",face:"surprised expression, wide eyes, slightly open mouth",pose:"hands open near her waist, elbows bent slightly in surprise"},{id:"thinking",label:"Thinking",face:"thoughtful expression, looking to the side",pose:"one fingertip resting at her chin, other arm folded gently across her waist"},{id:"shy",label:"Shy",face:"bashful shy expression, blushing cheeks, averted eyes, hesitant small smile",pose:"hands clasped low in front of her skirt, shoulders tucked slightly inward"},{id:"smug",label:"Smug",face:"self-satisfied smug expression, raised eyebrow, confident knowing smirk",pose:"one hand planted on her hip, other arm loose, confident stance"},{id:"sad",label:"Sad",face:"sad wistful expression, downcast eyes, slight frown, vulnerable face",pose:"arms hanging softly at her sides, shoulders slightly slumped"},{id:"annoyed",label:"Annoyed",face:"annoyed irritated expression, furrowed brows, impatient pout",pose:"arms crossed low beneath her chest, weight shifted impatiently"},{id:"sleepy",label:"Sleepy",face:"sleepy drowsy expression, heavy half-closed eyes, relaxed tired face",pose:"arms loose at her sides, languid slouched posture"},{id:"loving",label:"Loving",face:"tender loving expression, soft adoring eyes, affectionate gentle smile",pose:"hands gently clasped low over her abdomen, body leaning affectionately forward"},{id:"excited",label:"Excited",face:"excited thrilled expression, sparkling wide eyes, eager open smile",pose:"hands held eagerly near her hips, lively forward-leaning stance"}],ee=[{id:"typing",label:"Typing",heat:0,face:"focused expression, eyes on a screen, faint smile",pose:"sitting at a desk, both hands on a keyboard, leaning slightly toward the monitor"},{id:"reading",label:"Reading",heat:0,face:"absorbed expression, eyes lowered to the page",pose:"curled up holding an open book, one leg tucked under her"},{id:"gaming",label:"Gaming",heat:0,face:"intent expression, eyes wide on the screen, tongue at the corner of her mouth",pose:"sitting cross-legged holding a game controller in both hands"},{id:"lounging",label:"Lounging",heat:0,face:"relaxed expression, eyes half closed, easy smile",pose:"sprawled back across a sofa, arms loose, one knee raised"},{id:"drinking",label:"Drinking",heat:0,face:"contented expression, eyes closed over the rim",pose:"holding a steaming mug in both hands near her chest"},{id:"eating",label:"Eating",heat:0,face:"cheeks slightly full, pleased expression",pose:"holding food up to her mouth mid-bite, other hand cupped beneath it"},{id:"stretching",label:"Stretching",heat:0,face:"eyes shut, mouth open in a small yawn",pose:"arms stretched overhead, back arched, rising onto her toes"},{id:"napping",label:"Napping",heat:0,face:"sleeping, eyes closed, lips parted, peaceful",pose:"curled on her side asleep, hands tucked under her cheek"},{id:"dancing",label:"Dancing",heat:0,face:"eyes closed, delighted open smile",pose:"mid-step with hips turned, one arm raised loosely, hair in motion"},{id:"tidying",label:"Tidying",heat:0,face:"mildly absorbed expression, glancing at what she is holding",pose:"reaching to shelve something, weight on one foot"},{id:"drawing",label:"Drawing",heat:0,face:"concentrating, brow faintly furrowed, tongue between her teeth",pose:"hunched over a sketchbook, pencil in hand, other arm steadying the page"},{id:"waving",label:"Waving",heat:0,face:"bright welcoming smile, eyes on the viewer",pose:"one arm raised waving at the viewer, weight on one hip"},{id:"undressing",label:"Undressing",heat:2,intimate:!0,face:"half-lidded eyes, small knowing smile, watching the viewer",pose:"peeling clothing off one shoulder, other hand at her waistband"},{id:"teasing",label:"Teasing",heat:2,intimate:!0,face:"smirking, heavy-lidded eyes locked on the viewer",pose:"posing for the viewer, back arched, hands framing her hips"},{id:"touching",label:"Touching herself",heat:2,intimate:!0,face:"flushed, lips parted, eyes on the viewer",pose:"one hand pressed between her thighs over her clothes, other hand at her chest"},{id:"rubbing",label:"Rubbing",heat:3,intimate:!0,face:"deep blush, mouth open, eyes unfocused",pose:"reclining with one hand rubbing between her spread thighs"},{id:"fingering",label:"Fingering",heat:4,intimate:!0,face:"flushed, head tipped back, brow drawn, panting",pose:"lying back with her fingers inside herself, knees fallen open"},{id:"spread",label:"Spread",heat:4,intimate:!0,face:"flushed, watching the viewer, mouth open",pose:"lying back holding herself open with both hands, legs spread wide"},{id:"vibrator",label:"Vibrator",heat:3,intimate:!0,face:"eyes squeezed shut, mouth open, deep blush",pose:"holding a vibrator against herself, thighs tensed together"},{id:"dildo",label:"Dildo",heat:4,intimate:!0,face:"flushed, half-lidded, biting her lip",pose:"using a dildo on herself, one hand braced behind her"},{id:"riding",label:"Riding",heat:4,intimate:!0,face:"flushed, head thrown back, mouth open",pose:"straddling and riding a toy, hands braced on her thighs, back arched"},{id:"grinding",label:"Grinding",heat:3,intimate:!0,face:"flushed, eyes shut, teeth in her lip",pose:"straddling a pillow, hips rolling forward, hands gripping it"},{id:"climax",label:"Climax",heat:4,intimate:!0,face:"eyes rolled up, mouth wide open, whole face flushed",pose:"body arched taut mid-orgasm, toes curled, hands fisted"},{id:"afterglow",label:"Afterglow",heat:3,intimate:!0,face:"dazed exhausted smile, heavy-lidded eyes, deep blush",pose:"collapsed limp on her back, limbs loose, chest heaving"}],ne=[{label:"Calm",mood:"composed posture"},{label:"Warm",mood:"soft light blush, inviting posture, slight lean forward"},{label:"Flirty",mood:"flirty confident stance, visible blush"},{label:"Heated",mood:"heavy blush, sultry posture, parted lips, heavy-lidded eyes"},{label:"Peak",mood:"deep blush, flushed skin, breathless needy expression"}],Fe=se.length*ne.length,st=ee.length,ca={faces:se.length,tiers:ne.length,miscIds:ee.map(e=>e.id)};function Fs(e){return Da(e,ca)}function yt(e,t,i){return Ra(e,t,i,ca)}const Ns=[0,96,128];function Us(){const e=new Uint8Array(12);return crypto.getRandomValues(e),Array.from(e,t=>t.toString(16).padStart(2,"0")).join("")}let f=class extends me{constructor(){var e;super(...arguments),this.studio=!1,this.status=null,this.checkpoint="",this.vae="",this.templateId="",this.showBuiltInTemplates=!1,this.selectedLoras={},this.selectedTriggers=[],this.outfitOn=!1,this.outfitText="",this.outfitGear={...At},this.outfitFace=0,this.outfitMisc="",this.outfitMiscBatch=!1,this.outfitTier=0,this.outfitBackground="white",this.outfitUnderwearColor="black",this.outfitPubicHair=!1,this.outfitPubicHairColor="dark brown",this.outfitLockColors=!0,this.gearPromptOpen=null,this.outfitBatchRunning=!1,this.outfitExporting=!1,this.outfitProgress="",this.stopOutfitBatch=!1,this.loadouts=[],this.outfitLoadoutId="",this.loadoutBusy=!1,this.loadoutCoverVersion=0,this.wardrobes=[],this.outfitWardrobeId="",this.studioLoaded=!1,this.studioView="build",this.sheetTab="faces",this.sheetZoom=1,this.showSquarePrompt=!1,this.camera={..._i},this.cutout=null,this.cutoutTolerance=42,this.cutoutBusy=!1,this.cutoutError="",this.cutoutCanvas=null,this.session=null,this.cutoutTool="remove",this.cutoutFeather=Fi.feather,this.cutoutSpill=Fi.spill,this.cutoutZoom=1,this.cutoutContrast=!1,this.contiguous=!0,this.brushSize=24,this.showOriginal=!1,this.canUndo=!1,this.canRedo=!1,this.cutFraction=0,this.painting=!1,this.characters=[],this.selectedChars=[],this.charDraft=null,this.charBusy=!1,this.scanBusy=!1,this.poses=[],this.selectedPoses=[],this.poseDraft=null,this.poseBusy=!1,this.wildcards=[],this.wildcardDraft=null,this.wildcardBusy=!1,this.editMedia=0,this.editing=null,this.source=null,this.sourceDenoise=.55,this.paintOpen=!1,this.sourceStrokes=[],this.sourceMask="",this.sourceData="",this.speech="",this.listening=!1,this.optimizing=!1,this.prompt="",this.completions=[],this.completionIndex=-1,this.completionToken=null,this.completionField="prompt",this.completionSeq=0,this.completionTimer=0,this.startLayout=bt(),this.createTab=typeof matchMedia=="function"&&matchMedia("(max-width: 900px)").matches||!this.startLayout.inspector?"":((e=it.find(t=>t.id===this.startLayout.tab))==null?void 0:e.id)??"models",this.mode=this.startLayout.mode,this.sidePanel=this.startLayout.gallery,this.history=V.history,this.viewing=null,this.compareWith=null,this.compareSplit=50,this.queue=V.queue,this.queueOpen=!1,this.recentPrompts=br(),this.promptsOpen=!1,this.shortcutsOpen=!1,this.stageDrop=!1,this.spriteTab="outfit",this.spriteInspector=!0,this.boardFilter="all",this.focusView="cutout",this.flipping=!1,this.flipFace=-1,this.flipTimer=0,this.pickerFilter="",this.flatTitles=!1,this.negative="",this.showOptions=!1,this.width=512,this.height=768,this.steps=25,this.cfg=7,this.cfgRescale=0,this.clipSkip=0,this.seamlessX=!1,this.seamlessY=!1,this.vaePrecision="fp32",this.cpuNoise=!0,this.board="none",this.scheduler="",this.count=1,this.seed=-1,this.detailerEnabled=!1,this.detailerModel="face_yolov8n.pt",this.detailerPrompt="",this.detailerNegative="",this.detailerConfidence=.3,this.detailerDenoise=.4,this.detailerMaskBlur=4,this.detailerFaces=!0,this.detailerHands=!1,this.detailerCustom=[],this.regionsOn=!1,this.regionsRows=!1,this.regionPeople=[ti(),ti()],this.hiresEnabled=!1,this.hiresUpscaler="",this.hiresScale=1.5,this.hiresDenoise=.45,this.hiresSteps=0,this.upscaleUpscaler="",this.upscaleBy=2,this.generating=!1,this.jobId="",this.progress=null,this.progressTimer=0,this.progressSeen=0,this.shots=[],this.restoredNotice=!1,this.infoFor=null,this.draftRestored=!1,this.pendingScroll=0,this.error="",this.toast="",this.thumbVersion=0,this.failedThumbs=new Set,this.expandedShot=null,this.metaDraft=null,this.metaBusy=!1,this.metaTriggerText="",this.civitaiOpen=!1,this.civitaiMode="pictures",this.loraDrag="",this.loraOver=null,this.renamingLoras=null,this.restarting=!1,this.trainOpen=!1,this.recognition=null,this.onKey=t=>{if(!this.isConnected||t.defaultPrevented)return;const i=t.composedPath()[0],s=!!i&&(i.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(i.tagName));if(t.key==="Escape"){this.shortcutsOpen||this.queueOpen||this.promptsOpen?(this.shortcutsOpen=this.queueOpen=this.promptsOpen=!1,t.preventDefault()):this.compareWith&&!s&&(this.compareWith=null,t.preventDefault());return}if(s||t.ctrlKey||t.metaKey||this.charDraft||this.poseDraft||this.wildcardDraft||this.metaDraft||this.expandedShot||this.cutout||this.paintOpen||this.civitaiOpen||this.trainOpen||this.renamingLoras)return;if(t.altKey){const n=Bs[Number(t.key)-1];n&&(t.preventDefault(),this.switchMode(n.id));return}const a=this.currentMode;let o=!0;switch(t.key){case"?":this.shortcutsOpen=!this.shortcutsOpen;break;case"[":this.toggleInspector();break;case"]":this.sidePanel=!this.sidePanel;break;case"\\":this.toggleFocus();break;default:o=!1}if(!o&&a==="image")switch(o=!0,t.key){case"ArrowLeft":this.stepViewer(-1);break;case"ArrowRight":this.stepViewer(1);break;case"c":case"C":this.toggleCompare();break;case"s":case"S":{const n=this.viewedShot;n&&this.save(n);break}default:o=!1}if(!o&&a==="sprites"&&this.studioView==="build")switch(o=!0,t.key){case"ArrowLeft":case"ArrowRight":case"ArrowUp":case"ArrowDown":this.moveOnBoard(t.key);break;case"Enter":this.generating||this.generateOutfitAndNext();break;case"r":case"R":{const n=this.shotAt(this.outfitSlot().slot);n&&this.openCutout(this.previewURL(n),`seed-${n.seed}`,n.outfitFilename,n.id);break}default:o=!1}o&&t.preventDefault()},this.startFresh=()=>{wt(),this.prompt="",this.negative="",this.selectedLoras={},this.selectedTriggers=[],this.selectedChars=[],this.outfitOn=!1,this.outfitText="",this.outfitGear={...At},this.outfitFace=0,this.outfitTier=0,this.outfitBackground="white",this.outfitUnderwearColor="black",this.outfitPubicHair=!1,this.outfitPubicHairColor="dark brown",this.outfitLockColors=!0,this.outfitLoadoutId="",this.outfitWardrobeId="",this.outfitProgress="",this.shots=[],this.seed=-1,this.restoredNotice=!1}}connectedCallback(){super.connectedCallback(),this.restoreDraft(),this.loadStatus(),this.loadCharacters(),this.loadPoses(),this.loadWildcards(),this.studio&&this.enterStudio(),this.unwatchClips=sa(()=>this.requestUpdate()),this.unwatchKept=or(()=>{var e;return void((e=this.galleryPanel)==null?void 0:e.refresh())}),this.unsubscribeStore=Ml(()=>{this.history=V.history,this.queue=V.queue}),!V.history.length&&!this.studio&&this.shots.length&&(V.history=ls([],this.shots),this.history=V.history),window.addEventListener("keydown",this.onKey)}enterStudio(){this.outfitOn=!0,this.loadStudio()}disconnectedCallback(){var e,t,i;super.disconnectedCallback(),(e=this.unwatchClips)==null||e.call(this),(t=this.unwatchKept)==null||t.call(this),(i=this.unsubscribeStore)==null||i.call(this),window.removeEventListener("keydown",this.onKey),this.stopFlip(),this.stopOutfitBatch=!0,this.stopListening(),this.flushDraft()}get scrollHost(){let e=this;for(;e;){if(e instanceof HTMLElement&&e!==this){const i=getComputedStyle(e);if(/(auto|scroll|overlay)/.test(i.overflowY)&&e.scrollHeight>e.clientHeight+1)return e}if(e=e.parentNode??(e instanceof ShadowRoot?e.host:null),e===document.documentElement)break}return null}updated(e){var t;e.has("editMedia")&&this.editMedia>0&&((t=this.editing)==null?void 0:t.id)!==this.editMedia&&this.loadFromMedia(this.editMedia),this.pendingScroll&&this.scrollHost&&(this.scrollHost.scrollTop=this.pendingScroll,this.pendingScroll=0);for(const i of e.keys())if(f.DRAFT_FIELDS.has(String(i))){this.persistDraft();break}if(e.has("createTab")||e.has("mode")||e.has("sidePanel")){const i=bt();ps({inspector:this.studio?i.inspector:this.createTab!=="",tab:this.createTab||i.tab,gallery:this.sidePanel,mode:this.studio?i.mode:this.mode})}}get currentMode(){return this.studio?"sprites":this.mode}switchMode(e){if(e!==this.currentMode){if(e!=="sprites"&&!this.studio){this.mode=e;return}e!=="sprites"&&ps({...bt(),mode:e}),this.dispatchEvent(new CustomEvent("studio-mode",{detail:{section:e==="sprites"?"studio":"imagegen"},bubbles:!0,composed:!0}))}}toggleInspector(){var e;if(this.studio){this.spriteInspector=!this.spriteInspector;return}this.openCreateTab(this.createTab?this.createTab:((e=it.find(t=>t.id===bt().tab))==null?void 0:e.id)??"models",!0)}toggleFocus(){const e=this.sidePanel||(this.studio?this.spriteInspector:this.createTab!=="");this.sidePanel=!e,this.studio?this.spriteInspector=!e:e?this.createTab="":this.toggleInspector()}persistDraft(){this.draftTimer!==void 0&&clearTimeout(this.draftTimer),this.draftTimer=window.setTimeout(()=>{this.draftTimer=void 0,this.flushDraft()},600)}flushDraft(){var e;this.draftTimer!==void 0&&(clearTimeout(this.draftTimer),this.draftTimer=void 0),this.draftRestored&&Fa({prompt:this.prompt,negative:this.negative,checkpoint:this.checkpoint,vae:this.vae,templateId:this.templateId,scheduler:this.scheduler,width:this.width,height:this.height,steps:this.steps,cfg:this.cfg,cfgRescale:this.cfgRescale,clipSkip:this.clipSkip,seamlessX:this.seamlessX,seamlessY:this.seamlessY,vaePrecision:this.vaePrecision,cpuNoise:this.cpuNoise,count:this.count,seed:this.seed,board:this.board,selectedLoras:this.selectedLoras,selectedTriggers:this.selectedTriggers,selectedChars:this.selectedChars,selectedPoses:this.selectedPoses,outfitOn:this.outfitOn,outfitText:this.outfitText,outfitGear:this.outfitGear,outfitFace:this.outfitFace,outfitMisc:this.outfitMisc,outfitMiscBatch:this.outfitMiscBatch,outfitTier:this.outfitTier,outfitBackground:this.outfitBackground,outfitUnderwearColor:this.outfitUnderwearColor,outfitPubicHair:this.outfitPubicHair,outfitPubicHairColor:this.outfitPubicHairColor,outfitLockColors:this.outfitLockColors,outfitLoadoutId:this.outfitLoadoutId,outfitWardrobeId:this.outfitWardrobeId,camera:this.camera,detailerEnabled:this.detailerEnabled,detailerModel:this.detailerModel,detailerPrompt:this.detailerPrompt,detailerNegative:this.detailerNegative,detailerConfidence:this.detailerConfidence,detailerDenoise:this.detailerDenoise,detailerMaskBlur:this.detailerMaskBlur,detailerFaces:this.detailerFaces,detailerHands:this.detailerHands,detailerCustom:this.detailerCustom,regionsOn:this.regionsOn,regionsRows:this.regionsRows,regionPeople:this.regionPeople,hiresEnabled:this.hiresEnabled,hiresUpscaler:this.hiresUpscaler,hiresScale:this.hiresScale,hiresDenoise:this.hiresDenoise,hiresSteps:this.hiresSteps,upscaleUpscaler:this.upscaleUpscaler,upscaleBy:this.upscaleBy,showOptions:this.showOptions,shots:this.shots.map(t=>({id:t.id,seed:t.seed,saved:t.saved,info:t.info,outfitFilename:t.outfitFilename,outfitSlot:t.outfitSlot,outfitConfig:t.outfitConfig,cutoutReviewed:t.cutoutReviewed,previewVersion:t.previewVersion})),scrollTop:((e=this.scrollHost)==null?void 0:e.scrollTop)??0})}restoreDraft(){var t;const e=Na();if(this.draftRestored=!0,!!e){if(e.prompt!==void 0&&(this.prompt=e.prompt),e.negative!==void 0&&(this.negative=e.negative),e.checkpoint!==void 0&&(this.checkpoint=e.checkpoint),e.vae!==void 0&&(this.vae=e.vae),e.templateId!==void 0&&(this.templateId=e.templateId),e.scheduler!==void 0&&(this.scheduler=e.scheduler),e.width!==void 0&&(this.width=e.width),e.height!==void 0&&(this.height=e.height),e.steps!==void 0&&(this.steps=e.steps),e.cfg!==void 0&&(this.cfg=e.cfg),e.cfgRescale!==void 0&&(this.cfgRescale=e.cfgRescale),e.clipSkip!==void 0&&(this.clipSkip=e.clipSkip),e.seamlessX!==void 0&&(this.seamlessX=e.seamlessX),e.seamlessY!==void 0&&(this.seamlessY=e.seamlessY),e.vaePrecision!==void 0&&(this.vaePrecision=e.vaePrecision),e.cpuNoise!==void 0&&(this.cpuNoise=e.cpuNoise),e.count!==void 0&&(this.count=e.count),e.seed!==void 0&&(this.seed=e.seed),e.board!==void 0&&(this.board=e.board),e.selectedLoras&&(this.selectedLoras=e.selectedLoras),e.selectedTriggers&&(this.selectedTriggers=e.selectedTriggers),e.selectedChars&&(this.selectedChars=e.selectedChars),e.selectedPoses&&(this.selectedPoses=e.selectedPoses),e.outfitOn!==void 0&&(this.outfitOn=e.outfitOn),e.outfitText!==void 0&&(this.outfitText=e.outfitText),e.outfitGear!==void 0&&(this.outfitGear=Gi(e.outfitGear)),e.outfitFace!==void 0&&(this.outfitFace=Math.max(0,Math.min(se.length-1,Math.round(e.outfitFace)))),e.outfitMisc!==void 0&&(this.outfitMisc=ee.some(i=>i.id===e.outfitMisc)?e.outfitMisc:""),e.outfitMiscBatch!==void 0&&(this.outfitMiscBatch=e.outfitMiscBatch),e.outfitTier!==void 0&&(this.outfitTier=Math.max(0,Math.min(ne.length-1,Math.round(e.outfitTier)))),e.outfitBackground!==void 0&&(this.outfitBackground=e.outfitBackground),e.outfitUnderwearColor!==void 0&&(this.outfitUnderwearColor=e.outfitUnderwearColor),e.outfitPubicHair!==void 0&&(this.outfitPubicHair=e.outfitPubicHair),e.outfitPubicHairColor!==void 0&&(this.outfitPubicHairColor=e.outfitPubicHairColor),e.outfitLockColors!==void 0&&(this.outfitLockColors=e.outfitLockColors),e.outfitLoadoutId!==void 0&&(this.outfitLoadoutId=e.outfitLoadoutId),e.outfitWardrobeId!==void 0&&(this.outfitWardrobeId=e.outfitWardrobeId),e.camera&&(this.camera={..._i,...e.camera}),e.detailerEnabled!==void 0&&(this.detailerEnabled=e.detailerEnabled),e.detailerModel!==void 0&&(this.detailerModel=e.detailerModel),e.detailerPrompt!==void 0&&(this.detailerPrompt=e.detailerPrompt),e.detailerNegative!==void 0&&(this.detailerNegative=e.detailerNegative),e.detailerConfidence!==void 0&&(this.detailerConfidence=e.detailerConfidence),e.detailerDenoise!==void 0&&(this.detailerDenoise=e.detailerDenoise),e.detailerMaskBlur!==void 0&&(this.detailerMaskBlur=e.detailerMaskBlur),e.detailerFaces===void 0&&e.detailerHands===void 0){const i=ts(void 0,e.detailerModel);this.detailerFaces=i.faces,this.detailerHands=i.hands,this.detailerModel=i.faceModel}e.detailerFaces!==void 0&&(this.detailerFaces=e.detailerFaces),e.detailerHands!==void 0&&(this.detailerHands=e.detailerHands),e.detailerCustom&&(this.detailerCustom=e.detailerCustom),e.regionsOn!==void 0&&(this.regionsOn=e.regionsOn),e.regionsRows!==void 0&&(this.regionsRows=e.regionsRows),(t=e.regionPeople)!=null&&t.length&&(this.regionPeople=e.regionPeople),e.hiresEnabled!==void 0&&(this.hiresEnabled=e.hiresEnabled),e.hiresUpscaler!==void 0&&(this.hiresUpscaler=e.hiresUpscaler),e.hiresScale!==void 0&&(this.hiresScale=e.hiresScale),e.hiresDenoise!==void 0&&(this.hiresDenoise=e.hiresDenoise),e.hiresSteps!==void 0&&(this.hiresSteps=e.hiresSteps),e.upscaleUpscaler!==void 0&&(this.upscaleUpscaler=e.upscaleUpscaler),e.upscaleBy!==void 0&&(this.upscaleBy=e.upscaleBy),e.showOptions!==void 0&&(this.showOptions=e.showOptions),e.shots&&(this.shots=e.shots.map(i=>({...i}))),e.scrollTop&&(this.pendingScroll=e.scrollTop),this.restoredNotice=!0}}async loadStatus(){this.status=null,this.error="";try{const e=await m.imageGenStatus();this.status=e,!this.checkpoint&&e.models&&e.models.length&&this.pickModel(e.models[0])}catch(e){this.status={enabled:!0,reachable:!1,error:e.message}}}async refreshStatus(){try{this.status=await m.imageGenStatus()}catch{}}async loadCharacters(){try{const e=await m.characters();this.characters=e.characters;const t=new Set(e.characters.map(i=>i.id));this.selectedChars=this.selectedChars.filter(i=>t.has(i))}catch{}}async loadPoses(){try{const e=await m.poses();this.poses=e.poses;const t=new Set(e.poses.map(i=>i.id));this.selectedPoses=this.selectedPoses.filter(i=>t.has(i))}catch{}}async loadWildcards(){try{this.wildcards=(await m.wildcards()).wildcards}catch{}}async loadFromMedia(e){try{const t=await m.mediaGeneration(e),i=t.info;if(i&&typeof i.prompt=="string"&&Array.isArray(i.loras))this.reuseGenInfo({...i,loras:i.loras.filter(s=>s&&typeof s.name=="string")});else{const s={},a=(t.prompt||"").replace(/<lora:([^:>]+):([-\d.]+)>/g,(o,n,l)=>(s[n]=Number(l)||1,"")).replace(/\s{2,}/g," ").trim();this.prompt=a||t.title,this.selectedLoras=s,this.templateId="",this.selectedChars=[],this.selectedPoses=[],this.outfitOn=!1,this.showOptions=!0}this.editing={id:e,title:t.title,tags:t.tags??[]},this.showToast(`Editing “${t.title}” — generate, then save beside it or in its place.`)}catch(t){this.showToast(`Couldn't open that picture here: ${t.message}`)}}get editingLibby(){var e;return!!((e=this.editing)!=null&&e.tags.some(t=>t==="character:libby"||t==="libby"))}pickModel(e){var s,a;const t=(a=(((s=this.status)==null?void 0:s.models)??[]).find(o=>o.title===this.checkpoint))==null?void 0:a.defaults;this.checkpoint=e.title;const i=e.defaults;(t!=null&&t.positive||i!=null&&i.positive)&&(this.prompt=qi(this.prompt,t==null?void 0:t.positive,i==null?void 0:i.positive,"start")),(t!=null&&t.negative||i!=null&&i.negative)&&(this.negative=qi(this.negative,t==null?void 0:t.negative,i==null?void 0:i.negative,"end")),i&&(i.clipSkip&&(this.clipSkip=i.clipSkip),i.steps&&(this.steps=i.steps),i.cfgScale&&(this.cfg=i.cfgScale),i.cfgRescale!==void 0&&(this.cfgRescale=i.cfgRescale),i.scheduler&&(this.scheduler=i.scheduler),i.width&&(this.width=i.width),i.height&&(this.height=i.height),i.vae&&(this.vae=i.vae),this.vaePrecision="fp32")}get speechSupported(){return _s()!=null}toggleListening(){if(this.listening){this.stopListening();return}const e=_s();if(!e)return;const t=new e;t.lang=navigator.language||"en-US",t.continuous=!1,t.interimResults=!0,t.onresult=i=>{let s="";for(let a=0;a<i.results.length;a++)s+=i.results[a][0].transcript;this.speech=s},t.onerror=i=>{this.error=i.error==="not-allowed"?"Microphone permission was denied.":`Speech error: ${i.error}`,this.stopListening()},t.onend=()=>{this.listening=!1,this.speech.trim()&&this.optimize(this.speech)},this.recognition=t,this.listening=!0,this.error="";try{t.start()}catch{this.listening=!1}}stopListening(){if(this.listening=!1,this.recognition){try{this.recognition.stop()}catch{}this.recognition=null}}async optimize(e){this.optimizing=!0;try{const{prompt:t,negativePrompt:i}=await m.optimizePrompt(e);this.prompt=t,this.negative||(this.negative=i)}catch(t){this.error=t.message}finally{this.optimizing=!1}}equippedOutfitTerms(){var t;const e=((t=this.status)==null?void 0:t.backend)??"";return Se.flatMap(i=>{const s=Wi(i,this.pieceFor(i.key),e,this.outfitLockColors);return s?[s]:[]})}pieceFor(e){const t=this.outfitGear[e];return t.off?{color:"",item:""}:t.color.trim()||e!=="bra"&&e!=="panties"?t:{color:this.outfitUnderwearColor.trim()||"black",item:t.item}}outfitColorNegatives(){if(!this.outfitLockColors)return[];const e=new Set;for(const t of Se)for(const i of lo(t,this.pieceFor(t.key)))e.add(i);return[...e]}outfitExposurePrompt(e){const t=this.pieceFor("bra").color,i=this.pieceFor("panties").color,s=Pe(this.outfitGear.top),a=Pe(this.outfitGear.bottoms),o=Pe(this.outfitGear.bra),n=Pe(this.outfitGear.panties),l=[];return!s&&!a?l.push("no outer top or bottoms equipped"):e.clothes==="on"?l.push("equipped outer clothes fully on and properly worn"):e.clothes==="displaced"?l.push("equipped outer clothes loosened and partly displaced, clothing slipping or pulled aside"):l.push("equipped outer clothes removed or mostly off her body"),o?e.bra==="hidden"&&s&&e.clothes==="on"?l.push(`${t} bra completely covered, bra not showing`):e.bra==="off"?l.push(s&&e.clothes==="on"?"bra removed but breasts covered by the top":"bra removed, bare breasts and nipples visible"):l.push(`${t} bra clearly showing, top shifted enough to reveal it`):l.push(s&&e.clothes==="on"?"no bra equipped, breasts covered by the top":"no bra equipped, bare breasts and nipples visible"),n?e.panties==="hidden"&&a&&e.clothes==="on"?l.push(`${i} panties completely covered, panties not showing`):e.panties==="off"?l.push(a&&e.clothes==="on"?"panties removed but vulva covered by the bottoms":"panties removed, vulva visible"):l.push(`${i} panties clearly showing, bottoms shifted enough to reveal them`):l.push(a&&e.clothes==="on"?"no panties equipped, vulva covered by the bottoms":"no panties equipped, vulva visible"),l.join(", ")}outfitFragment(){if(!this.outfitOn)return{prompt:"",negative:""};const e=se[this.outfitFace],t=ee.find(u=>u.id===this.outfitMisc),i=t?t.heat:this.outfitTier,s=ne[i],a=po(i),o=this.outfitBackground==="black"?"perfectly solid pure black studio background, seamless black backdrop, background evenly lit with no texture":"perfectly solid pure white studio background, seamless white backdrop, background evenly lit with no texture",n=Pe(this.outfitGear.bottoms)&&a.clothes==="on",l=i===ne.length-1?this.outfitPubicHair?n?`${this.outfitPubicHairColor.trim()||"dark brown"} pubic hair present beneath the bottoms`:`${this.outfitPubicHairColor.trim()||"dark brown"} pubic hair visible`:"clean-shaven pubic area, no pubic hair":"";return{prompt:["solo, one person, single subject",Ha(this.camera.shot),t?t.face:e.face,t?t.pose:e.pose,s.mood,...this.equippedOutfitTerms(),this.outfitExposurePrompt(a),l,this.outfitText.trim(),o].filter(Boolean).join(", "),negative:["multiple people, two people, group, crowd, 2girls, 2boys, extra person, duplicate person",t?"":"arms raised, hands above head, arms behind head, hands in hair, both hands near face","detailed background, scenery, gradient background, patterned background, background shadows",this.outfitBackground==="black"?"white background":"black background",this.outfitPubicHair?"":"pubic hair",...this.outfitColorNegatives(),this.outfitLockColors?"recolored clothing, wrong clothing color, color bleed":""].filter(Boolean).join(", ")}}applyCameraFraming(){const{width:e,height:t}=Xa(this.camera,Za(this.width,this.height));this.width=e,this.height=t}editCamera(e){this.camera={...this.camera,...e},e.framing&&this.applyCameraFraming()}nextOutfitPose(){if(this.outfitMisc){const t=ee.findIndex(i=>i.id===this.outfitMisc)+1;this.outfitMisc=ee[t%ee.length].id;return}const e=this.outfitFace+1;if(e<se.length){this.outfitFace=e;return}this.outfitFace=0,this.outfitTier=(this.outfitTier+1)%ne.length}assemblePrompts(){var p,u,h,g,w;const e=this.outfitFragment(),t=this.regionsActive,i=t?wl(this.selectedTriggers,this.selectedLoras,this.regionPeople,((p=this.status)==null?void 0:p.loras)??[]):this.selectedTriggers,s=[this.prompt.trim(),...i,e.prompt],a=[this.negative.trim(),e.negative];for(const x of t?[]:this.selectedChars){const y=this.characters.find(T=>T.id===x);y&&(y.prompt.trim()&&s.push(y.prompt.trim()),(u=y.negativePrompt)!=null&&u.trim()&&a.push(y.negativePrompt.trim()))}if(!this.outfitOn)for(const x of this.selectedPoses){const y=this.poses.find(T=>T.id===x);y&&(y.prompt.trim()&&s.push(y.prompt.trim()),(h=y.negativePrompt)!=null&&h.trim()&&a.push(y.negativePrompt.trim()))}this.regionsActive&&a.push(...xl(this.regionPeople,this.characters)),a.push(so(a.join(", "),(((g=this.status)==null?void 0:g.loras)??[]).filter(x=>x.name in this.selectedLoras).map(x=>x.negative)));let o=s.filter(Boolean).join(", "),n=a.filter(Boolean).join(", ");const l=(((w=this.status)==null?void 0:w.templates)??[]).find(x=>x.id===this.templateId);return l&&(l.prompt.includes("{prompt}")?o=l.prompt.replaceAll("{prompt}",o):l.prompt.trim()&&(o=`${o}, ${l.prompt.trim()}`),l.negativePrompt.includes("{prompt}")?n=l.negativePrompt.replaceAll("{prompt}",n):l.negativePrompt.trim()&&(n=n?`${n}, ${l.negativePrompt.trim()}`:l.negativePrompt.trim())),{prompt:o,negative:n}}outfitSlot(e=this.outfitTier,t=this.outfitFace,i=this.outfitMisc){const s=ee.find(p=>p.id===i),a=s??se[t],o=s?0:e,n=s?{label:"Misc"}:ne[e];return{slot:{emotion:a.id,emotionLabel:a.label,tier:o,tierLabel:n.label,index:yt(o,t,s?s.id:"")},filename:eo(this.outfitText,n.label,a.id)}}shotAt(e){const t=be(e);return this.shots.find(i=>i.outfitSlot&&be(i.outfitSlot)===t)}staleShots(){return this.currentOutfitShots().filter(e=>!this.shotMatchesCurrentOutfit(e))}currentOutfitShots(){const e=new Map;for(const i of this.shots)i.outfitSlot&&e.set(be(i.outfitSlot),i);const t=[];for(let i=0;i<Fe+st;i++){const{tier:s,face:a,misc:o}=Fs(i),n=e.get(be(this.outfitSlot(s,a,o).slot));n&&t.push(n)}return t}outfitConfigKey(){const e=this.outfitPubicHair;return JSON.stringify({v:2,background:this.outfitBackground,underwear:this.outfitUnderwearColor.trim().toLowerCase()||"black",pubicHair:e,pubicHairColor:e?this.outfitPubicHairColor.trim().toLowerCase()||"dark brown":"",lockColors:this.outfitLockColors,gear:ho(this.outfitGear)})}shotMatchesCurrentOutfit(e){return e.outfitConfig?e.outfitConfig===this.outfitConfigKey():this.outfitBackground==="white"&&(this.outfitUnderwearColor.trim().toLowerCase()||"black")==="black"&&!this.outfitPubicHair&&Se.every(({key:t})=>this.outfitGear[t].item.trim()===At[t].item)}previewURL(e){if(e.wipOutfitId&&e.outfitSlot)return m.libbyOutfitWipImageURL(e.wipOutfitId,e.outfitSlot.emotion,e.outfitSlot.tier,e.previewVersion);const t=m.genPreviewURL(e.id);return e.previewVersion?`${t}?v=${e.previewVersion}`:t}async ensureWardrobe(){var i;if(this.outfitWardrobeId)return this.outfitWardrobeId;const e=this.outfitText.trim()||"Work in progress",t=await m.saveLibbyOutfit({name:e});return this.outfitWardrobeId=t.id,this.wardrobes=(await m.libbyOutfits()).outfits,(i=this.renderRoot.querySelector("oppai-outfit-wardrobe"))==null||i.refresh(),this.persistDraft(),this.showToast(`Keeping this outfit in a new wardrobe, “${t.name}”.`),t.id}async storeOutfitWip(e,t,i,s=!1){if(!e.outfitSlot)return"";try{const a=await fetch(t,{credentials:"same-origin"});if(!a.ok)throw new Error(`preview returned ${a.status}`);const o=await at(await a.blob());return await m.putLibbyOutfitWip(i,e.outfitSlot.emotion,e.outfitSlot.tier,{imageData:o,filename:e.outfitFilename,seed:e.seed,reviewed:s,config:e.outfitConfig,info:e.info,clothing:[...this.equippedOutfitTerms(),this.outfitText.trim()].filter(Boolean).join(", ")}),i}catch(a){return this.showToast(`Couldn't keep this square: ${a.message}`),""}}async loadWipBoard(e){if(!e)return;let t;try{t=(await m.libbyOutfitWip(e)).squares}catch{return}const i=t.map(a=>{const o=se.findIndex(u=>u.id===a.emotion),n=ee.some(u=>u.id===a.emotion)?a.emotion:"",l=n?0:Math.max(0,Math.min(ne.length-1,a.level)),p=this.outfitSlot(l,Math.max(0,o),n);return{id:`wip-${e}-${a.emotion}-${a.level}`,seed:a.seed??-1,saved:!1,info:a.info,outfitFilename:a.filename||p.filename,outfitSlot:p.slot,outfitConfig:a.config,cutoutReviewed:a.reviewed,previewVersion:a.updatedAt,wipOutfitId:e}}),s=new Set(i.map(a=>`${a.outfitSlot.emotion}:${a.outfitSlot.tier}`));this.shots=[...this.shots.filter(a=>a.outfitSlot?a.wipOutfitId&&a.wipOutfitId!==e?!1:!s.has(`${a.outfitSlot.emotion}:${a.outfitSlot.tier}`):!0),...i],this.persistDraft()}selectOutfitSlot(e){this.stopFlip();const{tier:t,face:i,misc:s}=Fs(e);this.outfitMisc=s,s?this.sheetTab="misc":(this.outfitTier=t,this.outfitFace=i,this.sheetTab="faces")}renderGenerating(e){const t=this.progress,i=(t==null?void 0:t.total)??0,s=t?Math.max(0,Math.min(1,t.percent)):0,a=t!=null&&t.cancelled?"Stopping…":i>0?`Step ${t.step} of ${i}`:e?"Invoking generation…":"Generating image…";return r`<div class="generating-overlay">
      <div class="generating-card ${t!=null&&t.image?"with-preview":""}">
        ${t!=null&&t.image?r`<img class="progress-preview" src=${t.image} alt="The picture so far" />`:d}
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
    </div>`}get detailerPasses(){return{faces:this.detailerFaces,faceModel:this.detailerModel,hands:this.detailerHands}}detailerParams(){var i,s;const e=Nt(this.detailerPasses),t=(s=(i=this.status)==null?void 0:i.detectors)!=null&&s.length?Ut(this.detailerCustom):[];return!e.length&&!t.length&&e.push(this.detailerModel),{enabled:!0,model:e[0],models:e,custom:t.length?t:void 0,prompt:this.detailerPrompt||void 0,negativePrompt:this.detailerNegative||void 0,confidence:this.detailerConfidence,denoise:this.detailerDenoise,maskBlur:this.detailerMaskBlur}}get detailerHasPasses(){var e,t;return Nt(this.detailerPasses).length>0||!!((t=(e=this.status)==null?void 0:e.detectors)!=null&&t.length)&&Ut(this.detailerCustom).length>0}get regionsActive(){var e;return!!((e=this.status)!=null&&e.regionsAvailable)&&this.regionsOn&&this.regionPeople.length>=2}get canUpscale(){var e,t,i;return((e=this.status)==null?void 0:e.backend)!=="invokeai"&&!!((i=(t=this.status)==null?void 0:t.upscalers)!=null&&i.length)}get hiresChoice(){var t,i;const e=Es((t=this.status)==null?void 0:t.latentUpscalers,(i=this.status)==null?void 0:i.upscalers);return e.includes(this.hiresUpscaler)?this.hiresUpscaler:e[0]??""}get upscaleChoice(){var t;const e=((t=this.status)==null?void 0:t.upscalers)??[];return e.includes(this.upscaleUpscaler)?this.upscaleUpscaler:e.find(i=>/esrgan/i.test(i))??e[0]??""}hiresParams(){if(!(!this.hiresEnabled||!this.canUpscale))return{enabled:!0,upscaler:this.hiresChoice||void 0,scale:ii(this.width,this.height,this.hiresScale),denoise:this.hiresDenoise,steps:this.hiresSteps||void 0}}async generateOne(e,t){return this.executeRun(await this.prepareRun(t),e)}async prepareRun(e){var n,l,p;const t=e??this.source;let{prompt:i,negative:s}=this.assemblePrompts();!i.trim()&&(t==null?void 0:t.mode)==="faces"&&(i="detailed face, best quality");const a=this.outfitOn?this.outfitSlot():void 0,o={prompt:i,negativePrompt:s||void 0,checkpoint:this.checkpoint||void 0,vae:this.vae||void 0,sampler:this.scheduler||void 0,steps:this.steps,width:this.width,height:this.height,cfgScale:this.cfg,cfgRescale:this.cfgRescale,clipSkip:this.clipSkip,seamlessX:this.seamlessX,seamlessY:this.seamlessY,vaePrecision:this.vaePrecision,cpuNoise:this.cpuNoise,board:this.board,count:this.outfitOn?1:this.count,seed:this.seed,loras:Object.entries(!t&&this.regionsActive?Di(this.selectedLoras,this.regionPeople):this.selectedLoras).map(([u,h])=>({name:u,weight:h})),detailer:(n=this.status)!=null&&n.detailerAvailable&&this.detailerEnabled&&this.detailerHasPasses?this.detailerParams():void 0,upscale:t?void 0:this.hiresParams(),regions:t||!this.regionsActive?void 0:vl(!0,this.regionsRows,this.regionPeople,this.characters,((l=this.status)==null?void 0:l.loras)??[])};return t&&(Object.assign(o,ei(t.width,t.height)),t.gallery?o.initGallery=t.gallery:o.initImage=await this.sourceDataURL(t),t.mode==="upscale"?(o.upscaleOnly=!0,o.count=1,o.detailer=void 0,o.upscale={enabled:!1,upscaler:this.upscaleChoice||void 0,scale:As(t.width,t.height,this.upscaleBy)}):t.mode==="faces"?(o.detailOnly=!0,o.count=1,o.detailer=this.detailerParams()):(o.denoise=this.sourceDenoise,t.mode==="inpaint"&&this.sourceMask&&(o.mask=this.sourceMask,o.maskBlur=8))),{params:o,from:t??null,outfit:a,outfitConfig:a?this.outfitConfigKey():void 0,extras:{triggers:[...this.selectedTriggers],characters:this.selectedChars.map(u=>{var h;return((h=this.characters.find(g=>g.id===u))==null?void 0:h.name)??""}).filter(Boolean),poses:this.outfitOn?[]:this.selectedPoses.map(u=>{var h;return((h=this.poses.find(g=>g.id===u))==null?void 0:h.name)??""}).filter(Boolean),outfit:this.outfitOn?this.outfitText.trim():"",controlImage:(p=this.cutout)==null?void 0:p.name,startedFrom:t?{name:t.name,mode:t.mode==="inpaint"&&!o.mask?"img2img":t.mode}:void 0}}}async executeRun(e,t){var u;const i={...e.params},s=e.outfit,a=s?this.shotAt(s.slot):void 0,o=performance.now();i.jobId=Us(),this.startProgressWatch(i.jobId,i.count??1);let n;try{n=await m.generate(i)}catch(h){n=await this.collectRun(i.jobId,h)}finally{this.stopProgressWatch()}n.rolled&&typeof n.positive=="string"&&(i.prompt=n.positive,i.negativePrompt=n.negative||void 0);const l=(performance.now()-o)/1e3,p=n.images.map(h=>{var g,w,x,y,T,P,L,U,I;return{...h,saved:!1,outfitFilename:s==null?void 0:s.filename,outfitSlot:s==null?void 0:s.slot,outfitConfig:e.outfitConfig,info:((g=e.from)==null?void 0:g.mode)==="upscale"&&e.from.info?Ea(e.from.info,{upscaler:((w=i.upscale)==null?void 0:w.upscaler)??"",scale:((x=i.upscale)==null?void 0:x.scale)??2,...xt(e.from.width,e.from.height,((y=i.upscale)==null?void 0:y.scale)??2),name:e.from.name,seconds:l}):Oa(i,{seed:h.seed,backend:((T=this.status)==null?void 0:T.backend)??"unknown",modelHash:(U=(L=(P=this.status)==null?void 0:P.models)==null?void 0:L.find(pe=>pe.title===i.checkpoint))==null?void 0:U.hash,loraHashes:Object.fromEntries((((I=this.status)==null?void 0:I.loras)??[]).filter(pe=>pe.hash).map(pe=>[pe.name,pe.hash])),...e.extras,seconds:l})}});if(t&&s){if(p.length)try{const g=await this.ensureWardrobe(),w=await this.storeOutfitWip(p[0],this.previewURL(p[0]),g);w&&(p[0].wipOutfitId=w,p[0].previewVersion=Date.now())}catch(g){this.showToast(`Couldn't keep this square: ${g.message}`)}a&&p.length&&!a.id.startsWith("wip-")&&await m.deleteGenPreview(a.id);const h=be(s.slot);this.shots=[...this.shots.filter(g=>!g.outfitSlot||be(g.outfitSlot)!==h),...p]}else this.shots=p,p.length&&!s&&(V.history=ls(V.history,p),Be(),this.viewing=p[0].id,this.recentPrompts=fr(this.recentPrompts,{prompt:e.params.prompt,negative:e.params.negativePrompt??"",at:Date.now()}),vr(this.recentPrompts));return(u=this.galleryPanel)==null||u.refresh(),p.length}async collectRun(e,t){if(!e||t.name==="AbortError")throw t;const i=Date.now()+15*6e4;for(;Date.now()<i;){let s;try{s=await m.genProgress(e,-1)}catch{throw t}if(s.done){if(s.result)return s.result;throw s.error?new Error(s.error):t}await new Promise(a=>setTimeout(a,2e3))}throw t}startProgressWatch(e,t){this.stopProgressWatch(),this.jobId=e,this.progress={index:0,step:0,total:0,percent:0,seq:0,done:!1,cancelled:!1},this.progressSeen=0;const i=async()=>{var s,a;if(this.jobId===e){try{const o=await m.genProgress(e,this.progressSeen);if(this.jobId!==e)return;const n=o.image??(o.seq===this.progressSeen?(s=this.progress)==null?void 0:s.image:void 0);if(this.progress={...o,image:n,total:o.total||((a=this.progress)==null?void 0:a.total)||0},this.progressSeen=o.seq,o.done)return}catch{}this.progressTimer=window.setTimeout(()=>void i(),1e3)}};this.progressTimer=window.setTimeout(()=>void i(),600)}stopProgressWatch(){window.clearTimeout(this.progressTimer),this.progressTimer=0,this.jobId="",this.progress=null}async cancelGeneration(){const e=this.jobId;if(e){this.progress&&(this.progress={...this.progress,cancelled:!0});try{await m.cancelGenerate(e)}catch(t){this.showToast(`Couldn't cancel: ${t.message}`)}}}async generate(){if(!(this.generating||!this.assemblePrompts().prompt.trim())){this.generating=!0,this.error="";try{await this.generateOne(this.outfitOn)}catch(e){/cancelled/i.test(e.message)?this.showToast("Generation cancelled."):this.error=e.message}finally{this.generating=!1,this.persistDraft()}this.drainQueue()}}async enqueue(){if(this.outfitOn||!this.assemblePrompts().prompt.trim())return;if(!this.generating){this.generate();return}let e;try{e=await this.prepareRun()}catch(i){this.showToast(i.message);return}const t=e.params.prompt.replace(/\s+/g," ").trim().slice(0,90);V.queue=[...V.queue,{id:Us(),label:t,prepared:e}],Be(),this.showToast(`Queued — ${V.queue.length} waiting`)}async drainQueue(){for(;V.queue.length&&!this.generating&&this.isConnected;){const[e,...t]=V.queue;V.queue=t,Be(),this.generating=!0,this.error="";try{await this.executeRun(e.prepared,!1)}catch(i){/cancelled/i.test(i.message)?this.showToast("Generation cancelled."):this.error=i.message,this.generating=!1;return}finally{this.generating=!1,this.persistDraft()}}}unqueue(e){V.queue=V.queue.filter(t=>t.id!==e),Be()}moveQueued(e,t){const i=V.queue.findIndex(s=>s.id===e);V.queue=gr(V.queue,i,i+t),Be()}async usePicture(e,t,i,s=!1,a,o){let n;try{n=await Ue(e)}catch(p){this.showToast(p.message);return}if(i==="upscale"&&!o&&a&&(o=await m.galleryImageMetadata(a).then(Gs).catch(()=>{})),i==="animate"){zt({url:e,name:t,width:n.naturalWidth,height:n.naturalHeight,gallery:a,objectURL:s}),this.switchMode("video");return}this.studio||(this.mode="image");const l={url:e,name:t,width:n.naturalWidth,height:n.naturalHeight,mode:i,objectURL:s,gallery:a,info:o};if(i==="faces"||i==="upscale"){this.runOnPicture(l,i);return}this.setSource(l),i==="inpaint"&&(this.paintOpen=!0)}setSource(e){var t;(t=this.source)!=null&&t.objectURL&&this.source.url!==(e==null?void 0:e.url)&&URL.revokeObjectURL(this.source.url),this.source=e,this.sourceStrokes=[],this.sourceMask="",this.sourceData="",this.paintOpen=!1}async sourceDataURL(e){var a;const t=e.url===((a=this.source)==null?void 0:a.url);if(t&&this.sourceData)return this.sourceData;const i=await fetch(e.url,{credentials:"same-origin"});if(!i.ok)throw new Error("Couldn't read the picture to start from — a result on the canvas expires after a while; pick it again.");const s=await at(await i.blob());return t&&(this.sourceData=s),s}onSourceFile(e){var s;const t=e.target,i=(s=t.files)==null?void 0:s[0];t.value="",i&&this.usePicture(URL.createObjectURL(i),i.name,"img2img",!0)}onPainted(e){this.sourceStrokes=e.strokes,this.sourceMask=e.mask,this.sourceDenoise=e.denoise,this.source&&(this.source={...this.source,mode:"inpaint"}),this.paintOpen=!1,e.generate&&this.generate()}closePainter(){this.paintOpen=!1,this.source&&!this.sourceMask&&(this.source={...this.source,mode:"img2img"})}async runOnPicture(e,t){if(!this.generating){this.generating=!0,this.error="";try{await this.generateOne(!1,{...e,mode:t})}catch(i){/cancelled/i.test(i.message)?this.showToast("Generation cancelled."):this.error=i.message}finally{this.generating=!1,this.persistDraft()}}}renderSourceBar(){var a,o;const e=this.source;if(!e)return d;const t=((a=this.status)==null?void 0:a.backend)!=="invokeai",i=e.mode==="inpaint"&&!!this.sourceMask,s=ei(e.width,e.height);return r`<div class="source-bar">
      <img src=${e.url} alt="" />
      <div class="source-copy">
        <span>${i?"Repainting the painted part of":"Starting from"} <strong>${e.name}</strong> · ${s.width}×${s.height}</span>
        <label class="source-strength" title=${i?"How far the painted part may change":"Low keeps the picture; high lets the prompt take over"}>
          Change
          <input type="range" min="0.05" max="1" step="0.05" .value=${String(this.sourceDenoise)}
            @input=${n=>this.sourceDenoise=Number(n.target.value)} />
          <b>${Math.round(this.sourceDenoise*100)}%</b>
        </label>
        <span class="source-hint">${i?"The prompt says what goes in the painted part; the rest stays exactly as it is.":"The prompt is applied to the whole picture."}</span>
      </div>
      <div class="source-acts">
        ${t?r`<button class="chip" title="Paint over a part to redo only that" @click=${()=>this.paintOpen=!0}>
          <span class="material-symbols-rounded" style="font-size:16px;">brush</span>${i?"Edit painting":"Paint a part"}</button>`:d}
        ${i?r`<button class="chip" title="Start from the whole picture again" @click=${()=>{this.sourceStrokes=[],this.sourceMask="",this.source={...e,mode:"img2img"}}}>Whole picture</button>`:d}
        ${t&&((o=this.status)!=null&&o.detailerAvailable)?r`<button class="chip" title="Redo it with ADetailer's passes, and nothing else"
          ?disabled=${this.generating} @click=${()=>void this.runOnPicture(e,"faces")}>
          <span class="material-symbols-rounded" style="font-size:16px;">face_retouching_natural</span>${Je(this.detailerPasses)}</button>`:d}
        ${this.canUpscale?(()=>{const n=xt(e.width,e.height,As(e.width,e.height,this.upscaleBy));return r`<button class="chip" title=${`Enlarge it to ${n.width}×${n.height} with ${this.upscaleChoice}, redrawing nothing`}
            ?disabled=${this.generating} @click=${()=>void this.runOnPicture(e,"upscale")}>
            <span class="material-symbols-rounded" style="font-size:16px;">open_in_full</span>Upscale ${this.upscaleBy}×</button>`})():d}
        <button class="chip" title="Draw from noise again" @click=${()=>this.setSource(null)}>
          <span class="material-symbols-rounded" style="font-size:16px;">close</span>Remove</button>
      </div>
    </div>`}async generateOutfitAndNext(){if(!(this.generating||!this.outfitOn||!this.assemblePrompts().prompt.trim())){this.generating=!0,this.error="";try{await this.generateOne(!0)&&this.nextOutfitPose()}catch(e){this.error=e.message}finally{this.generating=!1,this.persistDraft()}}}async generateAllOutfit(){if(this.generating||!this.outfitOn||!this.assemblePrompts().prompt.trim())return;this.generating=!0,this.outfitBatchRunning=!0,this.stopOutfitBatch=!1,this.error="";const e=Fe+(this.outfitMiscBatch?st:0);try{for(let i=0;i<e&&!this.stopOutfitBatch;i++){this.selectOutfitSlot(i);const{slot:s}=this.outfitSlot();this.shotAt(s)||(this.outfitProgress=`Generating ${i+1} of ${e} · ${s.tierLabel} · ${s.emotionLabel}`,await this.generateOne(!0),this.persistDraft())}const t=this.currentOutfitShots().length;this.outfitProgress=this.stopOutfitBatch?`Stopped with ${t} of ${e} ready.`:`Outfit complete · ${t} of ${e} ready.`}catch(t){this.error=t.message,this.outfitProgress=`Paused with ${this.currentOutfitShots().length} of ${e} ready. Run missing images to resume.`}finally{this.generating=!1,this.outfitBatchRunning=!1,this.persistDraft()}}async regenerateStale(){if(this.generating||!this.outfitOn||!this.assemblePrompts().prompt.trim())return;const e=this.staleShots();if(e.length){this.generating=!0,this.outfitBatchRunning=!0,this.stopOutfitBatch=!1,this.error="";try{for(let i=0;i<e.length&&!this.stopOutfitBatch;i++){const s=e[i].outfitSlot;this.selectOutfitSlot(s.index),this.outfitProgress=`Redoing ${i+1} of ${e.length} · ${s.tierLabel} · ${s.emotionLabel}`,await this.generateOne(!0),this.persistDraft()}const t=this.staleShots().length;this.outfitProgress=t?`Stopped with ${t} square${t===1?"":"s"} still on the old recipe.`:"Every square is on the current recipe."}catch(t){this.error=t.message}finally{this.generating=!1,this.outfitBatchRunning=!1,this.persistDraft()}}}cancelOutfitBatch(){this.stopOutfitBatch=!0,this.outfitProgress="Stopping after the current image…"}async copyGenInfo(e,t){if(!e.info){this.showToast("No generation data was recorded for this image.");return}const i=t==="json"?rt(e.info):Ne(e.info);await si(i)?this.showToast(t==="json"?"Full data copied as JSON":"Generation data copied"):this.showToast("Couldn't reach the clipboard — this needs HTTPS or a permission.")}reuseGenInfo(e){var s,a,o;const t=_a(e);if(this.prompt=t.prompt,this.negative=t.negativePrompt??"",this.checkpoint=t.checkpoint??"",this.vae=t.vae??"",this.scheduler=t.sampler??"",this.seed=t.seed??-1,this.steps=t.steps??25,this.cfg=t.cfgScale??7,this.cfgRescale=t.cfgRescale??0,this.clipSkip=t.clipSkip??0,this.width=t.width??512,this.height=t.height??768,this.seamlessX=!!t.seamlessX,this.seamlessY=!!t.seamlessY,this.vaePrecision=t.vaePrecision??"fp32",this.cpuNoise=t.cpuNoise!==!1,this.count=1,this.selectedLoras=Object.fromEntries((t.loras??[]).map(n=>[n.name,n.weight])),this.board=t.board??"none",this.detailerEnabled=!!((s=t.detailer)!=null&&s.enabled),t.detailer){const n=ts(t.detailer.models,t.detailer.model);this.detailerModel=n.faceModel,this.detailerFaces=n.faces,this.detailerHands=n.hands,this.detailerPrompt=t.detailer.prompt??"",this.detailerNegative=t.detailer.negativePrompt??"",this.detailerConfidence=t.detailer.confidence??.3,this.detailerDenoise=t.detailer.denoise??.4,this.detailerMaskBlur=t.detailer.maskBlur??4,this.detailerCustom=Go(t.detailer.custom)}const i=yl(t.regions);this.regionsOn=i.length>=2,this.regionsOn&&(this.regionPeople=i,this.regionsRows=!!((a=t.regions)!=null&&a.rows)),(o=t.upscale)!=null&&o.enabled&&(this.hiresEnabled=!0,t.upscale.upscaler&&(this.hiresUpscaler=t.upscale.upscaler),t.upscale.scale&&(this.hiresScale=t.upscale.scale),t.upscale.denoise&&(this.hiresDenoise=t.upscale.denoise),this.hiresSteps=t.upscale.steps??0),this.templateId="",this.selectedTriggers=[],this.selectedChars=[],this.selectedPoses=[],this.outfitOn=!1,this.showOptions=!0,this.showToast("Generation parameters loaded")}async exportShot(e){if(!e.info){this.showToast("No generation data was recorded for this image.");return}try{await Hs(this.previewURL(e),e.outfitFilename??`oppailib-seed-${e.seed}.png`,Ne(e.info),rt(e.info)),this.showToast("PNG exported with Civitai metadata")}catch(t){this.showToast(t.message)}}async exportOutfitZip(){const e=this.currentOutfitShots();if(!e.length||this.outfitExporting)return;const t=e.filter(a=>!a.cutoutReviewed);if(t.length){this.error=`Review the automatic background cutout for all ${t.length} remaining outfit image${t.length===1?"":"s"} before exporting.`;return}this.outfitExporting=!0;const i=[],s=[];try{for(let p=0;p<e.length;p++){const u=e[p];this.outfitProgress=`Preparing ${p+1} of ${e.length} for the outfit ZIP…`;try{const h=await fetch(this.previewURL(u),{credentials:"same-origin"});if(!h.ok)throw new Error(`preview returned ${h.status}`);let g=new Uint8Array(await h.arrayBuffer());u.info&&(g=ri(g,Ne(u.info),rt(u.info))),i.push({name:u.outfitFilename,data:g})}catch{s.push(u.outfitFilename??`seed-${u.seed}.png`)}}if(s.length){const p=new Set(s);this.shots=this.shots.filter(u=>!u.outfitFilename||!p.has(u.outfitFilename)),this.persistDraft()}if(!i.length)throw new Error("The generated previews expired. Generate the missing outfit images again.");const a={outfit:this.outfitText.trim(),loadout:this.outfitGear,expected:se.length*ne.length,exported:i.length,generationBackground:this.outfitBackground,colorsLocked:this.outfitLockColors,underwearColor:this.outfitUnderwearColor.trim()||"black",pubicHair:this.outfitPubicHair,pubicHairColor:this.outfitPubicHair?this.outfitPubicHairColor.trim()||"dark brown":void 0,backgroundRemoved:!0,cutoutReviewed:!0,images:e.filter(p=>!s.includes(p.outfitFilename??"")).map(p=>({file:p.outfitFilename,...p.outfitSlot}))};i.push({name:"outfit-manifest.json",data:new TextEncoder().encode(JSON.stringify(a,null,2))});const o=await wo(i),n=URL.createObjectURL(o),l=document.createElement("a");l.href=n,l.download=to(this.outfitText),l.click(),setTimeout(()=>URL.revokeObjectURL(n),0),this.outfitProgress=s.length?`Exported ${i.length-1} images; ${s.length} expired preview${s.length===1?"":"s"} need regenerating.`:`Exported ${i.length-1} correctly named outfit images in one ZIP.`,this.showToast(s.length?"Outfit ZIP exported with missing previews.":"Outfit ZIP exported.")}catch(a){this.error=a.message}finally{this.outfitExporting=!1}}openShotMenu(e,t){var i,s,a,o,n;t.preventDefault(),ye({x:t.clientX,y:t.clientY,title:`Seed ${e.seed}`,items:[{label:"Copy generation metadata",icon:"content_copy",run:()=>void this.copyGenInfo(e,"text")},{label:"Use same generation parameters",icon:"replay",disabled:!e.info,run:()=>{e.info&&this.reuseGenInfo(e.info)}},{label:"Export PNG for Civitai",icon:"download",disabled:!e.info,run:()=>void this.exportShot(e)},{label:"Start from this picture",icon:"add_photo_alternate",run:()=>void this.usePicture(this.previewURL(e),`seed ${e.seed}`,"img2img",!1,e.gallery)},...((i=this.status)==null?void 0:i.backend)!=="invokeai"?[{label:"Paint to fix",icon:"brush",run:()=>void this.usePicture(this.previewURL(e),`seed ${e.seed}`,"inpaint",!1,e.gallery)}]:[],...((s=this.status)==null?void 0:s.backend)!=="invokeai"&&((a=this.status)!=null&&a.detailerAvailable)?[{label:Je(this.detailerPasses),icon:"face_retouching_natural",disabled:this.generating,run:()=>void this.usePicture(this.previewURL(e),`seed ${e.seed}`,"faces",!1,e.gallery)}]:[],...this.canUpscale?[{label:`Upscale ${this.upscaleBy}×`,icon:"open_in_full",disabled:this.generating,run:()=>void this.usePicture(this.previewURL(e),`seed ${e.seed}`,"upscale",!1,e.gallery,e.info)}]:[],...(n=(o=this.status)==null?void 0:o.clips)!=null&&n.image?[{label:"Animate",icon:"animation",run:()=>void this.usePicture(this.previewURL(e),`seed ${e.seed}`,"animate",!1,e.gallery)}]:[],{label:"Use as a Libby background",icon:"wallpaper",run:()=>void this.useAsBackground(e)},{label:"Save as a pose…",icon:"accessibility_new",run:()=>this.poseFromShot(e)},{label:"Send in chat as Libby…",icon:"send",run:()=>void this.sendAsLibby(e)},...this.editing?[{label:`Replace “${this.editing.title}” in the library`,icon:"published_with_changes",run:()=>void this.replaceOriginal(e)}]:[]]})}poseFromShot(e){var t;this.poseDraft={name:"",prompt:((t=e.info)==null?void 0:t.prompt)??this.prompt,negativePrompt:"",previewId:e.id.startsWith("wip-")?void 0:e.id}}async sendAsLibby(e){const t=window.prompt("What does she say with it? (leave blank for just the picture)","");if(t!==null)try{const i=await this.saveShot(e,["libby"]),s=await m.libbySend({mediaId:i,text:t.trim()});this.showToast("She sent it — it's in her chat."),this.dispatchEvent(new CustomEvent("libby-sent",{bubbles:!0,composed:!0,detail:s}))}catch(i){this.showToast(`Couldn't send that: ${i.message}`)}}async replaceOriginal(e){const t=this.editing;if(t&&confirm(`Replace “${t.title}” with this picture? The original is deleted.`))try{const i=t.tags.filter(a=>a!=="ai-generated"),s=await this.saveShot(e,i,t.title);s!==t.id&&await m.deleteMedia(t.id),this.editing={...t,id:s},this.showToast(`Replaced “${t.title}”.`),this.dispatchEvent(new CustomEvent("imported",{bubbles:!0,composed:!0}))}catch(i){this.showToast(`Couldn't replace it: ${i.message}`)}}async saveShot(e,t=[],i){var o,n,l;const s=i??((((n=(o=e.info)==null?void 0:o.prompt)==null?void 0:n.trim())||this.prompt.trim()||this.outfitText.trim()).slice(0,80)||"Generated image"),a=await m.saveGenerated({id:e.id,title:s,tags:t,info:e.info});return this.shots=this.shots.map(p=>p.id===e.id?{...p,saved:!0,gallery:void 0}:p),V.history=mr(V.history,e.id,{saved:!0,gallery:void 0}),Be(),e.gallery&&((l=this.galleryPanel)==null||l.refresh()),this.dispatchEvent(new CustomEvent("imported",{bubbles:!0,composed:!0})),a.id}async exportOutfitSquare(e){const t=e.outfitFilename??`oppailib-seed-${e.seed}.png`;try{const i=await fetch(this.previewURL(e),{credentials:"same-origin"});if(!i.ok)throw new Error(`preview returned ${i.status}`);let s=new Uint8Array(await i.arrayBuffer());if(e.info)try{s=ri(s,Ne(e.info),rt(e.info))}catch{}const a=URL.createObjectURL(new Blob([s],{type:"image/png"})),o=document.createElement("a");o.href=a,o.download=t,o.click(),setTimeout(()=>URL.revokeObjectURL(a),0),this.showToast(e.cutoutReviewed?`Exported ${t}`:`Exported ${t} — its cutout hasn't been reviewed yet.`)}catch(i){this.showToast(`Couldn't export that square: ${i.message}`)}}async useAsBackground(e){var p,u,h;const t=((p=e.info)==null?void 0:p.prompt)??this.prompt,s=(t.split(/[,\n]/).map(g=>g.trim()).filter(Boolean).find(g=>/^[a-z][a-z ]{2,40}$/i.test(g)&&!/masterpiece|quality|detailed|resolution|score_/i.test(g))??"Generated room").replace(/\b\w/g,g=>g.toUpperCase()).slice(0,60),a=(u=window.prompt("Name this background",s))==null?void 0:u.trim();if(!a)return;const o=new Set(["masterpiece","best","quality","detailed","highly","ultra","high","resolution","the","and","with","very","background","scenery","score","absurdres"]),n=[...new Set(t.toLowerCase().match(/[a-z]{4,}/g)??[])].filter(g=>!o.has(g)).slice(0,8),l=window.prompt("Tags — what it is, comma separated (she reads these to pick a room)",n.join(", "));if(l!==null)try{const g=await fetch(this.previewURL(e),{credentials:"same-origin"});if(!g.ok)throw new Error(`preview returned ${g.status}`);const w=await at(await g.blob()),x=await m.saveLibbyBackground({name:a,tags:l.split(",").map(y=>y.trim()).filter(Boolean)});await m.setLibbyBackgroundImage(x.id,w),this.showToast(`Added “${a}” to the rooms Libby can be in.`),(h=this.renderRoot.querySelector("oppai-outfit-wardrobe"))==null||h.refresh()}catch(g){this.showToast(`Couldn't add that background: ${g.message}`)}}async save(e){if(!e.saved)try{await this.saveShot(e,this.editingLibby?["libby"]:[]),this.showToast("Saved to library")}catch(t){this.showToast(t.message)}}bumpThumbs(){this.thumbVersion++,this.failedThumbs=new Set}renderArt(e,t,i){return this.failedThumbs.has(e)?r`<div class="card-blank">
        <span class="material-symbols-rounded" style="font-size:34px;">${i}</span>
      </div>`:r`<img
      class="card-art"
      src=${e}
      alt=${t}
      loading="lazy"
      @error=${()=>{this.failedThumbs=new Set(this.failedThumbs).add(e)}}
    />`}async useAsModelThumb(e){if(!this.checkpoint){this.showToast("Pick a model first");return}try{await m.setModelThumb({model:this.checkpoint,previewId:e.id}),this.bumpThumbs(),this.showToast("Set as the model's cover")}catch(t){this.showToast(t.message)}}async openMetaEditor(e){this.metaBusy=!0;try{const t=await m.modelMeta(e);this.metaDraft=t,this.metaTriggerText=t.triggerPhrases.join(", ")}catch(t){this.showToast(t.message)}finally{this.metaBusy=!1}}setMetaDefaults(e){const t=this.metaDraft;t&&(this.metaDraft={...t,defaults:{...t.defaults??{},...e}})}async importCivitaiDefaults(){const e=this.metaDraft;if(!(!e||this.metaBusy)){this.metaBusy=!0;try{const{suggestion:t,keySet:i}=await m.civitaiSuggest({key:e.key}),s=this.metaDraft;if(!s)return;const a=ao(s.defaults??{},this.metaTriggerText,t,s.type==="lora");this.metaDraft={...s,defaults:a.defaults},this.metaTriggerText=a.triggerText;const o=a.applied.length?`Imported ${a.applied.join(", ")} — check them and Save`:"The Civitai page recommends nothing new";this.showToast(i?o:`${o}. A Civitai API key adds what the showcase pictures used.`)}catch(t){this.showToast(t.message)}finally{this.metaBusy=!1}}}async saveMeta(){const e=this.metaDraft;if(!(!e||this.metaBusy)){this.metaBusy=!0;try{await m.patchModelMeta({key:e.key,name:e.name,description:e.description??"",triggerPhrases:this.metaTriggerText.split(",").map(t=>t.trim()).filter(Boolean),defaults:e.defaults}),this.metaDraft=null,this.showToast("Model updated"),await this.loadStatus()}catch(t){this.showToast(t.message)}finally{this.metaBusy=!1}}}async deleteMetaModel(){const e=this.metaDraft;if(!e||this.metaBusy)return;const t=e.type==="lora"?"LoRA":"model";if(confirm(`Delete the ${t} “${e.name}” from InvokeAI? The file goes with it.`)){this.metaBusy=!0;try{if(await m.deleteModel(e.key),this.metaDraft=null,e.type==="lora"){const i={...this.selectedLoras};delete i[e.name],delete i[e.key],this.selectedLoras=i}else this.checkpoint===e.key&&(this.checkpoint="");this.showToast(`${t} deleted`),await this.loadStatus()}catch(i){this.showToast(i.message)}finally{this.metaBusy=!1}}}toggleLora(e){var i,s,a,o,n;const t={...this.selectedLoras};if(e in t){delete t[e];const l=new Set(((s=(((i=this.status)==null?void 0:i.loras)??[]).find(u=>u.name===e))==null?void 0:s.triggerPhrases)??[]),p=new Set((((a=this.status)==null?void 0:a.loras)??[]).filter(u=>u.name in t).flatMap(u=>u.triggerPhrases??[]));this.selectedTriggers=this.selectedTriggers.filter(u=>!l.has(u)||p.has(u))}else{const l=(n=(((o=this.status)==null?void 0:o.loras)??[]).find(p=>p.name===e))==null?void 0:n.weight;t[e]=l&&Number.isFinite(l)?l:1}this.selectedLoras=t}toggleTrigger(e){this.selectedTriggers=this.selectedTriggers.includes(e)?this.selectedTriggers.filter(t=>t!==e):[...this.selectedTriggers,e]}toggleCharacter(e){this.selectedChars=this.selectedChars.includes(e)?this.selectedChars.filter(t=>t!==e):[...this.selectedChars,e]}onCharThumbFile(e){var a;const t=e.target,i=(a=t.files)==null?void 0:a[0];if(t.value="",!i||!this.charDraft)return;const s=new FileReader;s.onload=()=>{this.charDraft&&(this.charDraft={...this.charDraft,imageData:String(s.result)})},s.readAsDataURL(i)}onCharScanFile(e){var a;const t=e.target,i=(a=t.files)==null?void 0:a[0];if(t.value="",!i||!this.charDraft||this.scanBusy)return;const s=new FileReader;s.onload=()=>void this.scanCharImage(String(s.result)),s.readAsDataURL(i)}async scanCharImage(e){if(!(!this.charDraft||this.scanBusy)){this.scanBusy=!0;try{const i=(await m.scanImage(e)).tags.filter(p=>p.category!=="rating").map(p=>p.tag.replace(/_/g," ").trim()).filter(Boolean),s=this.charDraft;if(!s)return;const a=s.prompt.trim(),o=new Set(a.split(",").map(p=>p.trim().toLowerCase()).filter(Boolean)),n=i.filter(p=>!o.has(p.toLowerCase()));if(!n.length){this.showToast("No new tags found");return}const l=a?`${a}, ${n.join(", ")}`:n.join(", ");this.charDraft={...s,prompt:l},this.showToast(`Added ${n.length} tag${n.length===1?"":"s"}`)}catch(t){this.showToast(t.message)}finally{this.scanBusy=!1}}}async saveCharacter(){const e=this.charDraft;if(!(!e||!e.name.trim()||this.charBusy)){this.charBusy=!0;try{await m.saveCharacter({id:e.id,name:e.name.trim(),prompt:e.prompt,negativePrompt:e.negativePrompt,imageData:e.imageData}),this.charDraft=null,this.bumpThumbs(),await this.loadCharacters(),this.showToast("Character saved")}catch(t){this.showToast(t.message)}finally{this.charBusy=!1}}}async deleteCharacter(){const e=this.charDraft;if(!(!(e!=null&&e.id)||this.charBusy)&&confirm(`Delete “${e.name}” from the character library?`)){this.charBusy=!0;try{await m.deleteCharacter(e.id);const t=nt("libraryDelete");F(t.message,"success",{emotion:t.emotion,intensity:t.intensity}),this.charDraft=null,await this.loadCharacters(),this.showToast("Character deleted")}catch(t){this.showToast(t.message)}finally{this.charBusy=!1}}}showToast(e){this.toast=e,setTimeout(()=>this.toast="",2600)}render(){var e,t;return r`<div class="wrap">
        ${this.restoredNotice?this.renderRestoredNotice():d}
        ${this.renderBody()}
      </div>
      ${this.charDraft?this.renderCharEditor(this.charDraft):d}
      ${this.poseDraft?this.renderPoseEditor(this.poseDraft):d}
      ${this.wildcardDraft?this.renderWildcardEditor(this.wildcardDraft):d}
      ${this.metaDraft?this.renderMetaEditor(this.metaDraft):d}
      ${this.expandedShot?this.renderLightbox(this.expandedShot):d}
      ${this.renderCutoutDialog()}
      ${this.trainOpen?r`<oppai-lora-train .models=${((e=this.status)==null?void 0:e.models)??[]} .loras=${((t=this.status)==null?void 0:t.loras)??[]} .checkpoint=${this.checkpoint}
            @close=${()=>this.trainOpen=!1}
            @trained=${i=>{this.showToast(`${i.detail.name} is trained and installed`),this.loadStatus()}}></oppai-lora-train>`:d}
      ${this.toast?r`<div class="toast">${this.toast}</div>`:d}`}renderRestoredNotice(){return r`
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
          </button>`:d}
          <button class="btn" @click=${()=>void this.exportShot(t)}>
            <span class="material-symbols-rounded" style="font-size:17px;">download</span> Export for Civitai
          </button>
          <button class="btn" @click=${()=>this.expandedShot=null}>
            <span class="material-symbols-rounded" style="font-size:17px;">close</span> Close
          </button>
        </div>
      </div>
    `}renderMetaEditor(e){var s,a,o,n;const t=e.defaults??{},i=e.type==="lora";return r`
      <div class="overlay" @click=${l=>{l.target===l.currentTarget&&(this.metaDraft=null)}}>
        <div class="dialog">
          <h3>Edit ${i?"LoRA":"model"} — saved on ${((s=this.status)==null?void 0:s.backend)==="invokeai"?"InvokeAI":"Automatic1111"}</h3>
          <div>
            <label class="field">Name</label>
            <!-- Automatic1111 names a model by its file, so the name is not edited there. -->
            <input type="text" .value=${e.name} ?readonly=${((a=this.status)==null?void 0:a.backend)!=="invokeai"}
              title=${((o=this.status)==null?void 0:o.backend)!=="invokeai"?"Automatic1111 names a model by its file":""}
              @input=${l=>this.metaDraft={...e,name:l.target.value}} />
          </div>
          <div>
            <label class="field">Description</label>
            <textarea .value=${e.description??""}
              @input=${l=>this.metaDraft={...e,description:l.target.value}}></textarea>
          </div>
          <div>
            <label class="field">Trigger phrases (comma-separated)</label>
            <input type="text" .value=${this.metaTriggerText} placeholder="my-style, detailed face"
              @input=${l=>this.metaTriggerText=l.target.value} />
          </div>
          ${i?r`<div class="meta-grid">
                <div class="full">
                  <label class="field">Recommended weight</label>
                  <input class="num" type="number" min="-2" max="2" step="0.05"
                    .value=${String(t.weight??"")} placeholder="1"
                    @input=${l=>this.setMetaDefaults({weight:Number(l.target.value)||0})} />
                </div>
                <div>
                  <label class="field">Works from</label>
                  <input class="num" type="number" min="-5" max="5" step="0.05" .value=${String(t.weightMin||"")}
                    @input=${l=>this.setMetaDefaults({weightMin:Number(l.target.value)||0})} />
                </div>
                <div>
                  <label class="field">to</label>
                  <input class="num" type="number" min="-5" max="5" step="0.05" .value=${String(t.weightMax||"")}
                    @input=${l=>this.setMetaDefaults({weightMax:Number(l.target.value)||0})} />
                </div>
                <div class="full">
                  <label class="field">Negative prompt while it's on</label>
                  <textarea rows="2" .value=${t.negative??""} placeholder="3d, realistic"
                    @input=${l=>this.setMetaDefaults({negative:l.target.value})}></textarea>
                </div>
              </div>`:r`
                <div>
                  <label class="field">Recommended positive (put at the front of the prompt)</label>
                  <textarea rows="2" .value=${t.positive??""} placeholder="masterpiece, best quality"
                    @input=${l=>this.setMetaDefaults({positive:l.target.value})}></textarea>
                </div>
                <div>
                  <label class="field">Recommended negative</label>
                  <textarea rows="2" .value=${t.negative??""} placeholder="lowres, worst quality"
                    @input=${l=>this.setMetaDefaults({negative:l.target.value})}></textarea>
                </div>
                <div class="meta-grid">
                  <div>
                    <label class="field">Steps</label>
                    <input class="num" type="number" min="1" max="80" .value=${String(t.steps??"")}
                      @input=${l=>this.setMetaDefaults({steps:Number(l.target.value)||0})} />
                  </div>
                  <div>
                    <label class="field">CFG scale</label>
                    <input class="num" type="number" min="1" max="30" step="0.5" .value=${String(t.cfgScale??"")}
                      @input=${l=>this.setMetaDefaults({cfgScale:Number(l.target.value)||0})} />
                  </div>
                  <div>
                    <label class="field">CFG rescale</label>
                    <input class="num" type="number" min="0" max="0.99" step="0.05"
                      .value=${String(t.cfgRescale??"")}
                      @input=${l=>this.setMetaDefaults({cfgRescale:Number(l.target.value)||0})} />
                  </div>
                  <div>
                    <label class="field">Width</label>
                    <input class="num" type="number" min="64" max="2048" step="8" .value=${String(t.width??"")}
                      @input=${l=>this.setMetaDefaults({width:Number(l.target.value)||0})} />
                  </div>
                  <div>
                    <label class="field">Height</label>
                    <input class="num" type="number" min="64" max="2048" step="8" .value=${String(t.height??"")}
                      @input=${l=>this.setMetaDefaults({height:Number(l.target.value)||0})} />
                  </div>
                  <div class="full">
                    <label class="field">Clip skip</label>
                    <input class="num" type="number" min="0" max="12" .value=${String(t.clipSkip||"")} placeholder="Model's own"
                      @input=${l=>this.setMetaDefaults({clipSkip:Number(l.target.value)||0})} />
                  </div>
                  <div class="full">
                    <label class="field">Scheduler</label>
                    <select class="num" .value=${t.scheduler??""}
                      @change=${l=>this.setMetaDefaults({scheduler:l.target.value})}>
                      <option value="">No preference</option>
                      ${["euler_a","euler","dpmpp_2m","dpmpp_2m_k","dpmpp_2m_sde_k","dpmpp_sde_k","unipc"].map(l=>r`<option value=${l} ?selected=${l===t.scheduler}>${l}</option>`)}
                    </select>
                  </div>
                  <div class="full">
                    <label class="field">Default VAE</label>
                    <select class="num" .value=${t.vae??""}
                      @change=${l=>this.setMetaDefaults({vae:l.target.value})}>
                      <option value="">Model's own</option>
                      ${(((n=this.status)==null?void 0:n.vaes)??[]).map(l=>r`<option value=${l.key} ?selected=${l.key===t.vae}>${l.name}</option>`)}
                    </select>
                  </div>
                  <div class="full">
                    <label class="field">VAE precision</label>
                    <select class="num" .value=${t.vaePrecision??""}
                      @change=${l=>this.setMetaDefaults({vaePrecision:l.target.value})}>
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
    `}renderBody(){var s,a;const e=this.status;if(e===null)return r`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`;if(!e.enabled)return r`<div class="empty">
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
      </div>`;const t=e.backend==="invokeai",i=e.gallery??(t?"invokeai":"oppailib");return r`
      <div class="studio mode-${this.currentMode}">
        ${this.renderStudioHeader(e,t)}
        ${this.studio?this.renderSprites(e,t):this.renderCreate(e,t,i)}
      </div>
      ${this.paintOpen&&this.source?r`<oppai-paint-mask .src=${this.source.url} .name=${this.source.name}
            .width=${this.source.width} .height=${this.source.height}
            .strokes=${this.sourceStrokes} .denoise=${Math.max(.2,this.sourceDenoise)}
            @apply=${o=>this.onPainted(o.detail)}
            @close=${()=>this.closePainter()}></oppai-paint-mask>`:d}
      ${this.civitaiOpen?r`<oppai-civitai backend=${((s=this.status)==null?void 0:s.backend)??"invokeai"} .mode=${this.civitaiMode} .canManage=${!!((a=this.status)!=null&&a.manageModels)}
            .manageNote=${Ot(this.status)}
            @close=${()=>this.onCivitaiClose()}
            @use-prompt=${o=>this.onCivitaiPrompt(o.detail)}></oppai-civitai>`:d}
      ${this.renamingLoras?r`<oppai-rename-dialog kind="lora" .names=${this.renamingLoras} .existing=${(e.loras??[]).map(o=>o.name)}
            @renamed=${o=>this.onLorasRenamed(o.detail.renamed)}
            @close=${()=>this.renamingLoras=null}></oppai-rename-dialog>`:d}
      ${this.shortcutsOpen?this.renderShortcuts():d}
    `}renderStudioHeader(e,t){var u,h,g,w;const i=this.currentMode,s=(e.models??[]).find(x=>x.title===this.checkpoint),a=s?`${m.modelThumbURL(s.title)}&v=${this.thumbVersion}`:"",o=bi(),n=this.studio?this.spriteInspector:this.createTab!=="",l=x=>x==="video"?o>0:x==="sprites"?this.studio&&this.generating:!this.studio&&this.generating,p=this.wardrobes.find(x=>x.id===this.outfitWardrobeId);return r`<header class="studio-head">
      <div class="mode-switch" role="tablist" aria-label="Studio">
        ${Bs.map((x,y)=>r`<button role="tab" class="mode ${i===x.id?"on":""}"
          aria-selected=${i===x.id?"true":"false"} title=${`${x.label} studio (Alt+${y+1})`}
          @click=${()=>this.switchMode(x.id)}>
          <span class="material-symbols-rounded">${x.icon}</span><span class="mode-label">${x.label}</span>
          ${x.id==="video"&&o?r`<span class="mode-badge" title=${`${o} clip${o===1?"":"s"} in the works`}>${o}</span>`:l(x.id)?r`<span class="mode-dot" title="Working"></span>`:d}
        </button>`)}
      </div>
      ${this.studio?r`<div class="sub-switch" role="tablist" aria-label="Sprites view">
        <button role="tab" class=${this.studioView==="build"?"on":""} aria-selected=${this.studioView==="build"?"true":"false"}
          @click=${()=>this.studioView="build"}>
          <span class="material-symbols-rounded">grid_view</span>Board${p?r`<span class="sub-note">${p.name}</span>`:d}
        </button>
        <button role="tab" class=${this.studioView==="wardrobe"?"on":""} aria-selected=${this.studioView==="wardrobe"?"true":"false"}
          @click=${()=>{var x;this.studioView="wardrobe",(x=this.renderRoot.querySelector("oppai-outfit-wardrobe"))==null||x.refresh()}}>
          <span class="material-symbols-rounded">styler</span>Wardrobe &amp; rooms
        </button>
      </div>`:d}
      <span class="head-spacer"></span>
      ${i==="video"?r`<span class="gen-pill static" title="Clips are made by ComfyUI"><span class="gen-icon"><span class="material-symbols-rounded">movie</span></span>
            <span class="gen-text"><span class="gen-kicker"><span class="status-dot ${(u=e.clips)!=null&&u.image||(h=e.clips)!=null&&h.text?"":"off"}"></span>ComfyUI</span>
            <span class="gen-name">${(g=e.clips)!=null&&g.image||(w=e.clips)!=null&&w.text?"Wan video":"Not set up"}</span></span></span>`:r`<button class="gen-pill" title=${(s==null?void 0:s.title)??"Choose a model"}
            @click=${()=>{this.studio?(this.spriteTab="generator",this.spriteInspector=!0):this.openCreateTab("models")}}>
            ${a&&!this.failedThumbs.has(a)?r`<img src=${a} alt="" @error=${()=>this.failedThumbs=new Set(this.failedThumbs).add(a)} />`:r`<span class="gen-icon"><span class="material-symbols-rounded">deployed_code</span></span>`}
            <span class="gen-text">
              <span class="gen-kicker"><span class="status-dot"></span>${t?"InvokeAI":"Automatic1111"}${s!=null&&s.base?r` · ${s.base}`:d}</span>
              <span class="gen-name">${(s==null?void 0:s.model_name)||this.checkpoint||"Choose a model"}</span>
            </span>
            <span class="material-symbols-rounded gen-caret">expand_more</span>
          </button>`}
      ${i==="image"?r`<button class="head-btn ${this.queue.length?"lit":""}" aria-expanded=${this.queueOpen?"true":"false"}
          title="Runs waiting their turn" @click=${()=>this.queueOpen=!this.queueOpen}>
          <span class="material-symbols-rounded">queue</span><span class="head-label">Queue</span>
          ${this.queue.length?r`<span class="head-count">${this.queue.length}</span>`:d}
        </button>`:d}
      ${e.civitai?r`<button class="head-btn" title=${i==="video"?"Find Wan models and LoRAs on Civitai":"Find models and LoRAs on Civitai"}
          @click=${()=>{this.civitaiMode=i==="video"?"video":"pictures",this.civitaiOpen=!0}}>
          <span class="material-symbols-rounded">travel_explore</span><span class="head-label">Civitai</span>
        </button>`:d}
      ${i!=="video"?r`<button class="head-btn" title="Train a LoRA on your own pictures" @click=${()=>this.trainOpen=!0}>
          <span class="material-symbols-rounded">model_training</span><span class="head-label">Train</span>
        </button>`:d}
      <span class="head-sep"></span>
      ${i!=="video"?r`<button class="head-icon ${n?"on":""}" aria-pressed=${n?"true":"false"}
          title=${this.studio?"The recipe ([)":"The inspector ([)"} @click=${()=>this.toggleInspector()}>
          <span class="material-symbols-rounded">${n?"left_panel_close":"left_panel_open"}</span>
        </button>`:d}
      <button class="head-icon ${this.sidePanel?"on":""}" aria-pressed=${this.sidePanel?"true":"false"}
        title=${this.studio?"The selected square (])":"The gallery (])"} @click=${()=>this.sidePanel=!this.sidePanel}>
        <span class="material-symbols-rounded">${this.sidePanel?"right_panel_close":"right_panel_open"}</span>
      </button>
      <button class="head-icon" title="Keyboard shortcuts (?)" @click=${()=>this.shortcutsOpen=!0}>
        <span class="material-symbols-rounded">keyboard</span>
      </button>
      ${this.queueOpen&&i==="image"?this.renderQueue():d}
    </header>`}renderQueue(){return r`<div class="pop queue-pop" role="dialog" aria-label="The queue">
      <div class="pop-head">
        <span class="material-symbols-rounded">queue</span>Queue
        <span class="pop-note">${this.generating?"Drawing now; these follow":"Nothing drawing"}</span>
        <button class="pop-x" aria-label="Close" @click=${()=>this.queueOpen=!1}><span class="material-symbols-rounded">close</span></button>
      </div>
      ${this.queue.length?r`<ol class="queue-list">${this.queue.map((e,t)=>r`<li>
            <span class="q-n">${t+1}</span>
            <span class="q-what" title=${e.prepared.params.prompt}>${e.label||"(no prompt)"}
              <small>${e.prepared.params.width}×${e.prepared.params.height} · ${e.prepared.params.count??1} picture${(e.prepared.params.count??1)===1?"":"s"}${e.prepared.from?` · from ${e.prepared.from.name}`:""}</small></span>
            <button class="q-btn" title="Sooner" aria-label="Move up" ?disabled=${t===0} @click=${()=>this.moveQueued(e.id,-1)}><span class="material-symbols-rounded">arrow_upward</span></button>
            <button class="q-btn" title="Later" aria-label="Move down" ?disabled=${t===this.queue.length-1} @click=${()=>this.moveQueued(e.id,1)}><span class="material-symbols-rounded">arrow_downward</span></button>
            <button class="q-btn" title="Take it out" aria-label="Remove" @click=${()=>this.unqueue(e.id)}><span class="material-symbols-rounded">close</span></button>
          </li>`)}</ol>`:r`<p class="pop-empty">While a picture draws, press <b>Queue</b> beside Generate (or Ctrl+Shift+Enter) and the form as it is goes in line.
            Change the prompt and queue again — each run keeps the settings it was queued with.</p>`}
    </div>`}renderShortcuts(){const e=this.currentMode;return r`<div class="overlay" @click=${t=>{t.target===t.currentTarget&&(this.shortcutsOpen=!1)}}>
      <div class="dialog shortcuts" role="dialog" aria-label="Keyboard shortcuts">
        <h3><span class="material-symbols-rounded">keyboard</span> Keyboard shortcuts</h3>
        <div class="keys">
          ${Il.filter(t=>!t.mode||t.mode===e).map(t=>r`<div class="key-row">
            <span class="key-caps">${t.keys.split(" ").map(i=>r`<kbd>${i}</kbd>`)}</span><span>${t.what}</span>
          </div>`)}
        </div>
        <div class="dialog-actions"><button class="btn" @click=${()=>this.shortcutsOpen=!1}>Close</button></div>
      </div>
    </div>`}renderCreate(e,t,i){var n,l;const s=this.createTab,a=this.mode==="video",o=!!i&&this.sidePanel;return r`<div class="workspace create">
      <div class="create-shell ${a?"video":"image"} ${s&&!a?"drawer-open":""} ${o?"with-gallery":""} ${this.loraDrag?"lora-dragging":""}">
        ${a?r`<oppai-video-studio .clips=${e.clips??{}} .board=${this.board}
              @use-frame=${p=>void this.usePicture(p.detail.url,p.detail.name,"img2img",!0)}
              @find-video-models=${()=>{this.civitaiMode="video",this.civitaiOpen=!0}}></oppai-video-studio>`:r`${this.renderCreateRail()}
            ${s?r`<div class="drawer-scrim" @click=${()=>this.createTab=""}></div>
                  <aside class="create-drawer" aria-label=${((n=it.find(p=>p.id===s))==null?void 0:n.label)??""}>
                    ${this.renderCreateDrawer(e,t)}
                  </aside>`:d}
            <section class="create-stage">
              ${this.renderRecipeStrip(e)}
              <div class="canvas-wrap">
                <div class="canvas-stage viewer-stage ${this.stageDrop?"drop":""}"
                  @dragover=${p=>this.onStageDragOver(p)} @dragleave=${p=>{p.target===p.currentTarget&&(this.stageDrop=!1)}}
                  @drop=${p=>this.onStageDrop(p)}>
                  ${this.renderViewer()}
                  ${this.restarting||this.error?r`<div class="banner">${this.restarting?"Restarting Automatic1111 — it takes a minute or two…":this.error}</div>`:d}
                  ${this.generating?this.renderGenerating(t):d}
                </div>
                ${this.loraDrag?this.renderLoraDrop():d}
              </div>
              ${this.renderSessionStrip()}
              <div class="prompt-dock">${this.renderPrompt()}</div>
            </section>`}
        ${i?r`<aside class="right create-gallery ${o?"":"stowed"}" aria-hidden=${o?"false":"true"}>
              <oppai-invoke-gallery workspace backend=${i}
                .startBoard=${this.board}
                .canPaint=${!t}
                .canFixFaces=${!t&&!!e.detailerAvailable}
                .fixLabel=${Je(this.detailerPasses)}
                .upscaleLabel=${this.canUpscale?`Upscale ${this.upscaleBy}×`:""}
                .canAnimate=${!!((l=e.clips)!=null&&l.image)}
                .canSetCovers=${t||!!e.manageModels}
                .loras=${(e.loras??[]).map(p=>p.name)}
                @covers-changed=${()=>this.bumpThumbs()}
                @use-picture=${p=>void this.usePicture(p.detail.url,p.detail.name,p.detail.mode,!1,p.detail.gallery)}
                @open-clip=${p=>{rr(p.detail,p.detail.upscale),this.switchMode("video")}}
                @boards-changed=${()=>this.loadStatus()}
                @board-changed=${p=>this.board=p.detail.board}
                @cut-out=${p=>void this.openCutout(p.detail.url,p.detail.name)}
                @reuse-generation=${p=>this.reuseGenInfo(p.detail)}
              ></oppai-invoke-gallery>
            </aside>`:d}
      </div>
    </div>`}onStageDragOver(e){var i;const t=((i=e.dataTransfer)==null?void 0:i.types)??[];!t.includes(je)&&!t.includes("Files")||(e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect=t.includes(je)?"move":"copy"),this.stageDrop=!0)}onStageDrop(e){var s,a,o;const t=(s=e.dataTransfer)==null?void 0:s.getData(je),i=(o=(a=e.dataTransfer)==null?void 0:a.files)==null?void 0:o[0];if(!(!t&&!i)){if(e.preventDefault(),this.stageDrop=!1,t){try{const n=JSON.parse(t)[0];n&&this.usePicture(m.galleryFullURL(n),n,"img2img",!1,n)}catch{}return}i!=null&&i.type.startsWith("image/")&&this.usePicture(URL.createObjectURL(i),i.name,"img2img",!0)}}openCreateTab(e,t=!1){const i=t&&this.createTab===e?"":e;i!==this.createTab&&(this.pickerFilter=""),this.createTab=i}renderCreateRail(){var t,i,s;const e={loras:Object.keys(this.selectedLoras).length,look:this.selectedChars.length+this.selectedPoses.length+(this.regionsActive?this.regionPeople.length:0),detailer:(t=this.status)!=null&&t.detailerAvailable&&this.detailerEnabled&&this.detailerHasPasses?Nt(this.detailerPasses).length+((s=(i=this.status)==null?void 0:i.detectors)!=null&&s.length?Ut(this.detailerCustom).length:0):0,settings:this.templateId?1:0};return r`<nav class="create-rail" aria-label="Generation setup">
      ${it.map(a=>r`<button class="rail-tab ${this.createTab===a.id?"on":""}"
          aria-pressed=${this.createTab===a.id?"true":"false"} title=${a.label}
          @click=${()=>this.openCreateTab(a.id,!0)}>
          <span class="material-symbols-rounded rail-icon">${a.icon}</span>
          <span class="rail-label">${a.label}</span>
          ${e[a.id]?r`<span class="rail-badge">${e[a.id]}</span>`:d}
        </button>`)}
    </nav>`}renderPickerSearch(e){return r`<label class="picker-search">
      <span class="material-symbols-rounded">search</span>
      <input type="search" .value=${this.pickerFilter} placeholder=${e} aria-label=${e}
        @input=${t=>this.pickerFilter=t.target.value} />
    </label>`}renderManageNote(e,t){const i=t?"":Ot(e);return i?r`<div class="manage-note">
      <span class="material-symbols-rounded">info</span>
      <span>${i}</span>
    </div>`:d}renderCreateDrawer(e,t){const i=this.createTab,s=it.find(o=>o.id===i);let a=d;switch(i){case"models":a=r`${this.renderPickerSearch("Search models")}
            ${this.renderModelSection(e.models??[])}
            ${this.renderManageNote(e,t)}`;break;case"loras":a=this.renderLoraSection(e.loras??[],e.loraError);break;case"look":a=r`<div class="pane-title">Characters</div>${this.renderCharacterSection()}
            <div class="pane-title">Poses</div>${this.renderPoseSection()}
            ${t?d:r`<div class="pane-title">People in parts of their own</div>${this.renderPeopleSection()}`}`;break;case"wildcards":a=this.renderWildcardSection();break;case"detailer":a=this.renderDetailerSection(t);break;case"settings":a=r`<div class="pane-title">Size</div><div class="pane">${this.renderPromptOptions()}</div>
            <div class="pane-title">Sampling</div>${this.renderSettingsSection(t,e.boards??[])}
            <div class="pane-title">VAE</div>${this.renderVaeSection(e.vaes??[])}
            <div class="pane-title">Saved prompt styles</div>${this.renderTemplateSection(e.templates??[])}
            ${this.renderGeneratorPane(e,t)}`;break}return r`
      <div class="drawer-head">
        <span class="material-symbols-rounded">${s.icon}</span>
        ${s.label}
        <span class="toolbar-spacer"></span>
        ${i==="loras"?r`<button class="drawer-action" title="Train a LoRA on your own pictures" @click=${()=>this.trainOpen=!0}>
              <span class="material-symbols-rounded">model_training</span>
            </button>`:d}
        ${i==="models"||i==="loras"?r`<button class="drawer-action" title="Find more on Civitai"
              @click=${()=>{this.civitaiMode="pictures",this.civitaiOpen=!0}}>
              <span class="material-symbols-rounded">travel_explore</span>
            </button>`:d}
        <button class="drawer-action" title="Close" aria-label="Close" @click=${()=>this.createTab=""}>
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
      <div class="drawer-scroll">${a}</div>
    `}renderRecipeStrip(e){const t=(e.loras??[]).filter(s=>s.name in this.selectedLoras),i=e.detailerAvailable&&this.detailerEnabled&&this.detailerHasPasses;return r`<div class="recipe">
      <div class="recipe-chips">
        ${t.map(s=>r`<span class="recipe-chip lora">
          <button class="recipe-chip-main" title="Change the weight in the LoRAs tab" @click=${()=>this.openCreateTab("loras")}>
            <span class="material-symbols-rounded">style</span>${s.alias||s.name}<b>${this.selectedLoras[s.name]}</b>
          </button>
          <button class="recipe-chip-x" title="Take this LoRA off" aria-label=${`Remove ${s.alias||s.name}`} @click=${()=>this.toggleLora(s.name)}>
            <span class="material-symbols-rounded">close</span>
          </button>
        </span>`)}
        ${this.regionsActive?this.regionPeople.map((s,a)=>s.lora?r`<span class="recipe-chip lora">
          <button class="recipe-chip-main" title=${`Person ${a+1}'s LoRA — change it under Look`} @click=${()=>this.openCreateTab("look")}>
            <span class="material-symbols-rounded">person</span>${a+1} · ${this.loraLabel(s.lora)}<b>${s.loraWeight}</b>
          </button>
          <button class="recipe-chip-x" title=${`Take this LoRA off person ${a+1}`} aria-label=${`Take ${this.loraLabel(s.lora)} off person ${a+1}`}
            @click=${()=>this.takeLoraOffPerson(a)}>
            <span class="material-symbols-rounded">close</span>
          </button>
        </span>`:d):d}
        ${t.length?d:r`<button class="recipe-chip add" @click=${()=>this.openCreateTab("loras")}>
          <span class="material-symbols-rounded">add</span>LoRA
        </button>`}
        <span class="recipe-sep"></span>
        <button class="recipe-chip" title="Output size" @click=${()=>this.openCreateTab("settings")}>
          <span class="material-symbols-rounded">aspect_ratio</span>${this.sizeLabel()}
        </button>
        <button class="recipe-chip" title="Sampling settings" @click=${()=>this.openCreateTab("settings")}>
          <span class="material-symbols-rounded">tune</span>${this.steps} steps · CFG ${this.cfg}
        </button>
        ${this.hiresEnabled&&this.canUpscale?r`<button class="recipe-chip on" title="Hires fix is on" @click=${()=>this.openCreateTab("settings")}>
          <span class="material-symbols-rounded">open_in_full</span>Hires ${this.hiresScale}×
        </button>`:d}
        ${i?r`<button class="recipe-chip on" title="ADetailer runs after each picture" @click=${()=>this.openCreateTab("detailer")}>
          <span class="material-symbols-rounded">face_retouching_natural</span>${Je(this.detailerPasses)}
        </button>`:d}
        <button class="recipe-chip ${this.seed>=0?"on":""}"
          title=${this.seed<0?"A new seed every time — click to keep the last picture's":"This seed is kept — click to go back to random"}
          @click=${()=>this.toggleSeedLock()}>
          <span class="material-symbols-rounded">${this.seed<0?"casino":"lock"}</span>${this.seed<0?"Random seed":this.seed}
        </button>
      </div>
    </div>`}loraLabel(e){var i;const t=(((i=this.status)==null?void 0:i.loras)??[]).find(s=>s.name===e);return(t==null?void 0:t.alias)||e}takeLoraOffPerson(e){this.regionPeople=this.regionPeople.map((t,i)=>i===e?{...t,lora:""}:t)}renderLoraDrop(){const e=this.loraLabel(this.loraDrag),t=this.regionsActive,s=(a=>({over:o=>this.loraDragOver(o,a),drop:o=>this.loraDrop(o,a)}))("all");return r`<div class="lora-drop" @dragover=${a=>{a.target===a.currentTarget&&(this.loraOver=null)}}
      @drop=${a=>{a.preventDefault(),this.loraDrag=""}}>
      <div class="drop-title"><span class="material-symbols-rounded">style</span><b>${e}</b>
        ${t?r`<span>— on a person, or on everyone</span>`:d}</div>
      ${t?r`${this.renderPeopleFrame(!0)}
            <div class="drop-all slim ${this.loraOver==="all"?"over":""}" @dragover=${s.over} @drop=${s.drop}>
              <span class="material-symbols-rounded">group</span>Everyone — in the prompt they all share</div>`:r`<div class="drop-all ${this.loraOver==="all"?"over":""}" @dragover=${s.over} @drop=${s.drop}>
            <span class="material-symbols-rounded">add_circle</span>${this.selectedLoras[this.loraDrag]!==void 0?"It's on already":"Drop to put it on"}</div>`}
    </div>`}renderPeopleFrame(e){const t=this.regionPeople,i=Rs(t),s=this.width/Math.max(1,this.height),a=e?`min(100%, ${Math.round(420*s)}px, calc((100cqh - 128px) * ${s.toFixed(4)}))`:`min(100%, ${Math.round(260*s)}px)`;return r`<div class="people-frame ${this.regionsRows?"rows":""}"
      style=${`width:${a};aspect-ratio:${this.width} / ${this.height};`}>
      ${t.map((o,n)=>r`<div class="drop-part ${this.loraOver===n?"over":""}" style=${`flex:${i[n].size} 1 0;`}
        @dragover=${l=>this.loraDragOver(l,n)} @drop=${l=>this.loraDrop(l,n)}>
        <span class="drop-n">${n+1}</span>
        ${o.lora?r`<span class="drop-lora" title=${o.lora}><span class="material-symbols-rounded">style</span><span class="nm">${this.loraLabel(o.lora)}</span>
              ${e?d:r`<button title=${`Take it off person ${n+1}`} aria-label=${`Take ${this.loraLabel(o.lora)} off person ${n+1}`}
                @click=${()=>this.takeLoraOffPerson(n)}><span class="material-symbols-rounded">close</span></button>`}</span>`:r`<span class="drop-empty">${e?`Person ${n+1}`:"Drop a LoRA here"}</span>`}
      </div>`)}
    </div>`}loraDragOver(e,t){var i;(i=e.dataTransfer)!=null&&i.types.includes(hi)&&(e.preventDefault(),e.stopPropagation(),e.dataTransfer.dropEffect="copy",this.loraOver!==t&&(this.loraOver=t))}loraDrop(e,t){var s;const i=((s=e.dataTransfer)==null?void 0:s.getData(hi))||this.loraDrag;i&&(e.preventDefault(),e.stopPropagation(),this.loraDrag="",this.loraOver=null,this.wearLora(i,t))}wearLora(e,t){var a,o;const i=this.loraLabel(e);if(t==="all"){const n=this.regionPeople.some(l=>l.lora===e);if(this.regionPeople=Sl(this.regionPeople,e),!(e in this.selectedLoras))this.toggleLora(e);else if(!n){this.showToast(`${i} is on already`);return}this.regionsActive&&this.showToast(`${i} is on everyone`);return}const s=(o=(((a=this.status)==null?void 0:a.loras)??[]).find(n=>n.name===e))==null?void 0:o.weight;this.regionPeople=kl(this.regionPeople,t,e,s),this.showToast(`${i} is on person ${t+1}`)}onLorasRenamed(e){var i;const t=Zs(e);if(t.size){if(this.selectedLoras=No(this.selectedLoras,t),this.regionPeople=this.regionPeople.map(s=>t.has(s.lora)?{...s,lora:t.get(s.lora)}:s),this.detailerCustom=this.detailerCustom.map(s=>({...s,lora:t.get(s.lora)??s.lora,prompt:gt(s.prompt,t)})),this.prompt=gt(this.prompt,t),this.negative=gt(this.negative,t),this.detailerPrompt=gt(this.detailerPrompt,t),(i=this.status)!=null&&i.loras){const s=new Map(e.map(a=>[a.oldName,a.newKey]));this.status={...this.status,loras:this.status.loras.map(a=>t.has(a.name)?{...a,name:t.get(a.name),key:s.get(a.name)??a.key}:a)}}this.showToast(e.length===1?`Renamed to ${e[0].newName}`:`Renamed ${e.length} LoRAs`),this.refreshStatus()}}renderGeneratorPane(e,t){return t?d:r`<div class="pane-title">Automatic1111</div>
      <div class="pane restart-pane">
        <span>${e.canRestart?"Restart it to read new detectors and extensions. It is back in a minute or two; a picture it is drawing is lost.":"To restart it from here, start Automatic1111 with --api-server-stop (in COMMANDLINE_ARGS, beside --api) once by hand."}</span>
        <button class="chip" ?disabled=${this.restarting} @click=${()=>void this.restartGenerator()}>
          <span class="material-symbols-rounded">restart_alt</span>${this.restarting?"Restarting…":"Restart"}
        </button>
      </div>`}async restartGenerator(){if(this.restarting||!confirm("Restart Automatic1111? It takes a minute or two, and a picture it is drawing now is lost."))return;this.restarting=!0;try{await m.restartGenerator()}catch(i){this.restarting=!1,this.showToast(i.message);return}const e=Date.now();let t=!1;for(;this.isConnected&&Date.now()-e<5*6e4;){await new Promise(i=>setTimeout(i,3e3));try{const i=await m.imageGenStatus();if(!i.reachable){t=!0;continue}if(t||Date.now()-e>45e3){this.status=i,this.restarting=!1,this.showToast("Automatic1111 is back");return}}catch{t=!0}}this.restarting=!1,this.showToast("Automatic1111 hasn't come back yet — look at it where it runs"),this.refreshStatus()}toggleSeedLock(){var t;if(this.seed>=0){this.seed=-1;return}const e=(t=this.shots[0])==null?void 0:t.seed;if(e===void 0||e<0){this.showToast("Generate a picture first — its seed is the one kept");return}this.seed=e}renderSprites(e,t){return this.studioView==="wardrobe"?r`<div class="workspace"><div class="studio-wardrobe">
        <oppai-outfit-wardrobe
          @edit-slot=${i=>void this.editWardrobeSlot(i.detail.outfitId,i.detail.slot,i.detail.level)}
          @build-outfit=${i=>{this.outfitWardrobeId=i.detail.outfitId,this.persistDraft(),this.studioView="build",this.loadWipBoard(i.detail.outfitId)}}
        ></oppai-outfit-wardrobe>
      </div></div>`:r`<div class="workspace">
      <div class="sprite-shell ${this.spriteInspector?"with-inspector":""} ${this.sidePanel?"with-focus":""}">
        ${this.spriteInspector?r`<aside class="sprite-inspector">
          <div class="ins-tabs" role="tablist" aria-label="The recipe">
            ${Ll.map(i=>r`<button role="tab" class=${this.spriteTab===i.id?"on":""}
              aria-selected=${this.spriteTab===i.id?"true":"false"} @click=${()=>this.spriteTab=i.id}>
              <span class="material-symbols-rounded">${i.icon}</span>${i.label}
            </button>`)}
          </div>
          <div class="panel-scroll ins-body">${this.renderSpriteTab(e,t)}</div>
        </aside>`:d}
        <section class="workbench">
          ${this.renderStudioToolbar()}
          <div class="canvas-stage sheet">
            ${this.renderStudioSheet()}
            ${this.error?r`<div class="banner">${this.error}</div>`:d}
          </div>
          ${this.generating?this.renderSheetProgress():d}
          ${this.renderBatchBar()}
        </section>
        ${this.sidePanel?r`<aside class="right studio-focus">${this.renderFocusPanel()}</aside>`:d}
      </div>
    </div>`}renderSpriteTab(e,t){this.flatTitles=!0;try{switch(this.spriteTab){case"outfit":return r`${this.renderDressSection()}${this.renderLoadoutSection()}`;case"look":return this.renderLookSection();case"prompt":return r`${this.renderPromptExtrasSection()}${this.renderCharacterSection()}${this.renderTemplateSection(e.templates??[])}`;case"generator":return r`${this.renderModelSection(e.models??[])}
            ${this.renderLoraSection(e.loras??[],e.loraError)}
            ${this.renderVaeSection(e.vaes??[])}
            ${this.renderSettingsSection(t,e.boards??[])}
            ${this.renderDetailerSection(t)}
            ${this.renderGeneratorPane(e,t)}`}}finally{this.flatTitles=!1}}renderSheetProgress(){const e=this.progress,t=e?Math.max(0,Math.min(1,e.percent)):0,{slot:i}=this.outfitSlot();return r`<div class="sheet-progress">
      ${e!=null&&e.image?r`<img src=${e.image} alt="" />`:r`<md-circular-progress indeterminate style="--md-circular-progress-size:22px;"></md-circular-progress>`}
      <span class="sp-text"><b>${i.tierLabel==="Misc"?i.emotionLabel:`${i.tierLabel} · ${i.emotionLabel}`}</b>
        ${e!=null&&e.cancelled?"Stopping…":e!=null&&e.total?`Step ${e.step} of ${e.total}`:"Starting…"}
        <span class="sp-bar"><span style=${`width:${Math.round(t*100)}%`}></span></span></span>
      <button class="icon-btn" title="Stop this square" aria-label="Stop" ?disabled=${e==null?void 0:e.cancelled} @click=${()=>void this.cancelGeneration()}>
        <span class="material-symbols-rounded">close</span></button>
    </div>`}sheetStates(){return(this.sheetTab==="misc"?ee.map(t=>this.outfitSlot(0,0,t.id).slot):ne.flatMap((t,i)=>se.map((s,a)=>this.outfitSlot(i,a,"").slot))).map(t=>this.squareStatus(this.shotAt(t)).tone)}renderStudioToolbar(){const e=this.currentOutfitShots(),t=e.filter(a=>{var o;return(((o=a.outfitSlot)==null?void 0:o.index)??0)<Fe}).length,i=e.length-t,s=yr(this.sheetStates());return r`<div class="canvas-toolbar studio-toolbar">
      <label class="wardrobe-pick" title="Every square is saved into this wardrobe as it is generated">
        <span class="material-symbols-rounded" style="font-size:16px;">inventory_2</span>
        <select ?disabled=${this.outfitBatchRunning}
          @change=${a=>{this.outfitWardrobeId=a.target.value,this.persistDraft(),this.loadWipBoard(this.outfitWardrobeId)}}>
          <!-- Selected per option rather than .value on the select: the list arrives
               after the first render, and a value that has not changed is not re-applied. -->
          <option value="" ?selected=${!this.outfitWardrobeId}>New wardrobe on first square</option>
          ${this.wardrobes.map(a=>r`<option value=${a.id} ?selected=${a.id===this.outfitWardrobeId}>${a.name}</option>`)}
        </select>
      </label>
      <button class="toolbar-clear" title="Start a new wardrobe" ?disabled=${this.outfitBatchRunning} @click=${()=>void this.createWardrobe()}>
        <span class="material-symbols-rounded" style="font-size:15px;">add</span>
      </button>
      <div class="sheet-tabs" role="tablist">
        <button class="sheet-tab ${this.sheetTab==="faces"?"on":""}" role="tab" @click=${()=>this.sheetTab="faces"}>
          Expressions <span class="sheet-tab-count">${t}/${Fe}</span>
        </button>
        <button class="sheet-tab ${this.sheetTab==="misc"?"on":""}" role="tab" @click=${()=>this.sheetTab="misc"}>
          Misc <span class="sheet-tab-count">${i}/${st}</span>
        </button>
      </div>
      <div class="board-filters" role="group" aria-label="Show">
        ${xr.map(a=>r`<button class="bf ${this.boardFilter===a.id?"on":""} bf-${a.id}"
          aria-pressed=${this.boardFilter===a.id?"true":"false"} ?disabled=${a.id!=="all"&&!s[a.id]}
          @click=${()=>this.boardFilter=this.boardFilter===a.id?"all":a.id}>
          ${a.id==="all"?d:r`<span class="bf-dot"></span>`}${a.label}${a.id==="all"?d:r`<b>${s[a.id]}</b>`}
        </button>`)}
      </div>
      <span class="toolbar-spacer"></span>
      <div class="zoom-tabs" title="Square size">
        ${Ns.map((a,o)=>r`<button class="zoom-tab ${this.sheetZoom===o?"on":""}"
          title=${["Fit the row to the screen","Medium squares","Large squares"][o]}
          @click=${()=>{this.sheetZoom=o,this.persistDraft()}}>${["Fit","M","L"][o]}</button>`)}
      </div>
    </div>`}renderStudioSheet(){if(!this.outfitOn)return r`<div class="canvas-empty">
        <span class="material-symbols-rounded">checkroom</span>
        <strong>Outfit terms are switched off</strong>
        <span>Turn them back on under Outfit to build a wardrobe.</span>
      </div>`;const e=Ns[this.sheetZoom],t=e?`--cell:${e}px`:"";return this.sheetTab==="misc"?this.renderMiscGrid(t):this.renderFaceMatrix(t,!e)}renderFaceMatrix(e,t){const i=be(this.outfitSlot().slot);return r`<div class="face-matrix ${t?"fit":""}" style=${e}>
      <div class="matrix-corner"></div>
      ${se.map((s,a)=>r`<div class="matrix-col-head ${a===this.outfitFace&&!this.outfitMisc?"on":""}" title=${s.face}>${s.label}</div>`)}
      ${ne.map((s,a)=>{const o=se.map((l,p)=>this.outfitSlot(a,p,"").slot),n=o.filter(l=>this.shotAt(l)).length;return r`
          <div class="matrix-row-head ${a===this.outfitTier&&!this.outfitMisc?"on":""}">
            <span class="row-heat">${[0,1,2,3,4].map(l=>r`<i class=${l<=a?"lit":""}></i>`)}</span>
            <span class="matrix-row-name">${s.label}</span>
            <span class="matrix-row-count">${n}/${o.length}</span>
            <span class="row-bar"><span style=${`width:${n/o.length*100}%`}></span></span>
          </div>
          ${o.map(l=>this.renderSheetCell(l,be(l)===i))}
        `})}
    </div>`}renderMiscGrid(e){const t=be(this.outfitSlot().slot),i=(s,a,o)=>r`
      <section class="sheet-tier misc">
        <header class="sheet-tier-head">
          <span class="material-symbols-rounded" style="font-size:15px;">interests</span>
          ${s}
          <span class="tier-count">${o.filter(n=>this.shotAt(this.outfitSlot(0,0,n.id).slot)).length}/${o.length} generated</span>
        </header>
        <p class="sheet-note">${a}</p>
        <div class="sheet-grid" style=${e}>
          ${o.map(n=>{const l=this.outfitSlot(0,0,n.id).slot;return this.renderSheetCell(l,be(l)===t)})}
        </div>
      </section>`;return r`<div class="outfit-sheet" style=${e}>
      ${i("Around the place","One picture per state, whatever the heat — a state with no square falls back to her expression. Typing is shown while she writes to you.",ee.filter(s=>!s.intimate))}
      ${i("With them","Drawn at their own heat. She can only put herself into these once a conversation has got there.",ee.filter(s=>s.intimate))}
    </div>`}renderSheetCell(e,t){const i=this.shotAt(e),s=this.squareStatus(i).tone,a=e.tier===0&&e.tierLabel==="Misc"?e.emotionLabel:`${e.tierLabel} · ${e.emotionLabel}`,o=!na(this.boardFilter,s);return r`<button
      class="sheet-cell ${t?"current":""} ${i?"":"empty"} ${o?"dim":""} st-${s}"
      title=${i?`${a}${s==="stale"?" — older recipe":s==="ready"?" — reviewed":" — needs a cutout review"}`:`${a} — not generated yet`}
      @click=${()=>this.selectOutfitSlot(e.index)}
      @dblclick=${()=>{this.selectOutfitSlot(e.index),this.generateOutfitAndNext()}}
    >
      ${i?r`<img class="art" src=${this.previewURL(i)} alt=${a} loading="lazy" />`:r`<span class="art-empty"><span class="material-symbols-rounded">add</span></span>`}
      <span class="cell-foot">
        <span class="cell-name">${e.emotionLabel}</span>
        ${i?r`<span class="cell-state ${s}"></span>`:d}
      </span>
    </button>`}squareStatus(e){return e?this.shotMatchesCurrentOutfit(e)?e.cutoutReviewed?{label:"Reviewed and filed — she can wear it",tone:"ready"}:{label:"Generated — the cutout needs a look",tone:"needs"}:{label:"Generated with an older recipe",tone:"stale"}:{label:"Not generated yet",tone:"none"}}moveOnBoard(e){if(this.stopFlip(),this.sheetTab==="misc"){const t=ee.findIndex(a=>a.id===this.outfitMisc),i=e==="ArrowLeft"||e==="ArrowUp"?-1:1,s=t<0?0:Math.min(ee.length-1,Math.max(0,t+i));this.selectOutfitSlot(yt(0,0,ee[s].id))}else{const t=this.outfitMisc?{face:this.outfitFace,tier:this.outfitTier}:wr(this.outfitFace,this.outfitTier,e,se.length,ne.length);this.selectOutfitSlot(yt(t.tier,t.face,""))}this.updateComplete.then(()=>{var t;return(t=this.renderRoot.querySelector(".sheet-cell.current"))==null?void 0:t.scrollIntoView({block:"nearest",inline:"nearest"})})}toggleFlip(){if(this.flipping){this.stopFlip();return}this.flipping=!0,this.flipFace=this.outfitFace,this.flipTimer=window.setInterval(()=>{const e=se.map((i,s)=>!!this.shotAt(this.outfitSlot(this.outfitTier,s,"").slot)),t=$r(e,this.flipFace);t<0?this.stopFlip():this.flipFace=t},450)}stopFlip(){window.clearInterval(this.flipTimer),this.flipTimer=0,this.flipping=!1,this.flipFace=-1}renderFocusPanel(){var x;const{slot:e}=this.outfitSlot(),t=this.shotAt(e),i=this.squareStatus(t),s=e.tierLabel==="Misc",a=s?ee.find(y=>y.id===e.emotion):void 0,o=s?void 0:se[this.outfitFace],{prompt:n,negative:l}=this.assemblePrompts(),p=this.generating,u=!p&&this.outfitOn&&!!n.trim(),h=this.flipping&&this.flipFace>=0?this.outfitSlot(this.outfitTier,this.flipFace,"").slot:void 0,g=h?this.shotAt(h):t,w=h??e;return r`
      <div class="focus-head">
        <div class="focus-title">
          <strong>${s?e.emotionLabel:`${e.tierLabel} · ${e.emotionLabel}`}</strong>
          <span class="focus-status ${i.tone}"><i></i>${i.label}</span>
        </div>
        <div class="seg small" role="group" aria-label="Show the square">
          <button class=${this.focusView==="cutout"?"on":""} aria-pressed=${this.focusView==="cutout"?"true":"false"}
            title="The cutout, on a checkerboard" @click=${()=>this.focusView="cutout"}>Cutout</button>
          <button class=${this.focusView==="scene"?"on":""} aria-pressed=${this.focusView==="scene"?"true":"false"}
            title="As she appears in chat, saying something in that mood" @click=${()=>this.focusView="scene"}>In chat</button>
        </div>
      </div>
      <div class="panel-scroll focus-scroll">
        <div class="focus-art ${this.focusView}">
          ${g?r`<img src=${this.previewURL(g)} alt=${w.emotionLabel} style="cursor:zoom-in" title="Expand"
                @click=${()=>this.expandedShot=g} @contextmenu=${y=>this.openShotMenu(g,y)} />`:r`<span class="focus-empty"><span class="material-symbols-rounded">add_photo_alternate</span>Nothing here yet</span>`}
          ${this.focusView==="scene"?r`<div class="scene-speech">${Sr(w.emotion,w.emotionLabel)}</div>`:d}
          ${s?d:r`<button class="flip-btn ${this.flipping?"on":""}" title="Play this tier's expressions one after another, to check they are one face"
            @click=${()=>this.toggleFlip()}>
            <span class="material-symbols-rounded">${this.flipping?"stop":"play_arrow"}</span>${this.flipping?w.emotionLabel:"Flip through"}
          </button>`}
        </div>
        ${s?d:this.renderHeatLadder()}
        <div class="focus-primary">
          <button class="btn primary" ?disabled=${!u} title="Enter" @click=${()=>void this.generateOutfitAndNext()}>
            <span class="material-symbols-rounded" style="font-size:17px;">${t?"refresh":"auto_awesome"}</span>
            ${t?"Redo, then next":"Generate, then next"}
          </button>
          <button class="btn" ?disabled=${!u} title=${t?"Redo this square and stay on it":"Generate this square and stay on it"}
            @click=${()=>void this.generate()}>
            <span class="material-symbols-rounded" style="font-size:17px;">${t?"replay":"add"}</span>
            ${t?"Redo":"Just this"}
          </button>
        </div>
        <div class="focus-tools">
          <button class="tool" ?disabled=${!t||p} title=${t!=null&&t.cutoutReviewed?"Adjust the cutout (R)":"Review the cutout (R)"}
            @click=${()=>{t&&this.openCutout(this.previewURL(t),`seed-${t.seed}`,t.outfitFilename,t.id)}}>
            <span class="material-symbols-rounded">background_replace</span><span>${t!=null&&t.cutoutReviewed?"Adjust":"Review"}</span>
          </button>
          <label class="tool ${p?"disabled":""}" title=${t?"Replace with a picture of your own":"Use a picture of your own for this square"}>
            <span class="material-symbols-rounded">upload</span><span>Own image</span>
            <input type="file" accept="image/*" style="display:none;" ?disabled=${p}
              @change=${y=>{var P;const T=y.target;this.uploadSquare((P=T.files)==null?void 0:P[0]),T.value=""}} />
          </label>
          <button class="tool" ?disabled=${!t||p} title="Just this square, as a PNG under its wardrobe filename"
            @click=${()=>{t&&this.exportOutfitSquare(t)}}>
            <span class="material-symbols-rounded">download</span><span>Export</span>
          </button>
          <button class="tool" ?disabled=${!(t!=null&&t.info)} title="Copy this square's generation data"
            @click=${()=>{t&&this.copyGenInfo(t,"text")}}>
            <span class="material-symbols-rounded">content_copy</span><span>Data</span>
          </button>
          ${this.outfitLoadoutId?r`<button class="tool" ?disabled=${!t||this.loadoutBusy} title="Use this square as the loadout's cover"
            @click=${()=>void this.setLoadoutCoverFromSelection()}>
            <span class="material-symbols-rounded">photo_camera</span><span>Cover</span>
          </button>`:d}
          <button class="tool danger" ?disabled=${!t||p} title="Delete this square"
            @click=${()=>{t&&this.deleteOutfitSquare(t)}}>
            <span class="material-symbols-rounded">delete</span><span>Delete</span>
          </button>
        </div>
        <div class="sec-note focus-desc">${a?`${a.face}; ${a.pose}.`:o?`${o.face}; ${o.pose}.`:d}</div>
        ${t?r`<div class="focus-meta">
          <span title="Seed"><span class="material-symbols-rounded" style="font-size:14px;">casino</span>${t.seed}</span>
          ${(x=t.info)!=null&&x.model?r`<span title="Model"><span class="material-symbols-rounded" style="font-size:14px;">deployed_code</span>${t.info.model}</span>`:d}
        </div>`:d}
        <button class="adv-toggle" @click=${()=>this.showSquarePrompt=!this.showSquarePrompt}>
          <span class="material-symbols-rounded" style="font-size:17px;">${this.showSquarePrompt?"expand_less":"code"}</span>
          ${this.showSquarePrompt?"Hide the prompt":"The prompt this square gets"}
        </button>
        ${this.showSquarePrompt?r`<div class="focus-prompt">
          <span class="focus-tag">Positive</span>
          <pre>${n}</pre>
          <span class="focus-tag negative">Negative</span>
          <pre>${l}</pre>
          <div class="sec-note">Exposure is rolled fresh for every generation, so the undress clauses change between takes.</div>
        </div>`:d}
      </div>
    `}renderHeatLadder(){return r`<div class="heat-ladder" role="group" aria-label="This expression up the heat tiers">
      ${ne.map((e,t)=>{const i=this.outfitSlot(t,this.outfitFace,"").slot,s=this.shotAt(i),a=t===this.outfitTier;return r`<button class="rung ${a?"on":""}" title=${`${e.label} · ${i.emotionLabel}`}
          @click=${()=>{this.stopFlip(),this.selectOutfitSlot(yt(t,this.outfitFace,""))}}>
          ${s?r`<img src=${this.previewURL(s)} alt="" loading="lazy" />`:r`<span class="rung-empty"></span>`}
          <span class="rung-label">${e.label}</span>
        </button>`})}
    </div>`}renderBatchBar(){const e=this.currentOutfitShots(),t=e.filter(w=>{var x;return(((x=w.outfitSlot)==null?void 0:x.index)??0)<Fe}).length,i=e.length-t,s=e.filter(w=>w.cutoutReviewed).length,a=this.staleShots().length,o=Fe+(this.outfitMiscBatch?st:0),n=t+(this.outfitMiscBatch?i:0),l=Math.max(0,o-n),p=!this.generating&&this.outfitOn&&!!this.assemblePrompts().prompt.trim(),u=2*Math.PI*17,h=o?Math.min(1,n/o):0,g=o?Math.min(1,s/o):0;return r`<div class="batch-bar">
      <div class="batch-ring" title=${`${n} of ${o} made, ${s} reviewed`}>
        <svg viewBox="0 0 40 40"><circle class="r-track" cx="20" cy="20" r="17" />
          <circle class="r-made" cx="20" cy="20" r="17" stroke-dasharray=${u} stroke-dashoffset=${u*(1-h)} />
          <circle class="r-done" cx="20" cy="20" r="17" stroke-dasharray=${u} stroke-dashoffset=${u*(1-g)} /></svg>
        <b>${Math.round(h*100)}<small>%</small></b>
      </div>
      <div class="batch-progress">
        <span class="batch-head">${n===o&&o?"The set is complete":`${l} square${l===1?"":"s"} to go`}</span>
        <span class="batch-count">${t}/${Fe} expressions · ${i}/${st} misc · ${s} reviewed${a?r` · <em>${a} on an older recipe</em>`:d}</span>
      </div>
      <label class="switch compact" title="Whether Generate missing also renders the Misc states">
        <input type="checkbox" .checked=${this.outfitMiscBatch} ?disabled=${this.outfitBatchRunning}
          @change=${w=>{this.outfitMiscBatch=w.target.checked,this.persistDraft()}} />
        Include Misc
      </label>
      ${this.outfitBatchRunning?r`<button class="btn" @click=${()=>this.cancelOutfitBatch()}>
            <span class="material-symbols-rounded" style="font-size:17px;">stop_circle</span>
            Stop after this one
          </button>`:r`<button class="btn primary" ?disabled=${!p||!l} @click=${()=>void this.generateAllOutfit()}>
            <span class="material-symbols-rounded" style="font-size:17px;">auto_awesome</span>
            Generate ${l} missing
          </button>
          ${a?r`<button class="btn" ?disabled=${!p} @click=${()=>void this.regenerateStale()}>
            <span class="material-symbols-rounded" style="font-size:17px;">history</span>
            Redo ${a} stale
          </button>`:d}`}
      <button class="btn" ?disabled=${this.generating||this.outfitExporting||!e.length||s!==e.length}
        title=${s!==e.length?"Review every cutout first":"Every square, correctly named, in one ZIP"}
        @click=${()=>void this.exportOutfitZip()}>
        <span class="material-symbols-rounded" style="font-size:17px;">folder_zip</span>
        ${this.outfitExporting?"Building ZIP…":"Export ZIP"}
      </button>
      ${this.outfitProgress?r`<span class="batch-note">${this.outfitProgress}</span>`:d}
    </div>`}async uploadSquare(e){if(!e||!e.type.startsWith("image/")||this.generating)return;const{slot:t,filename:i}=this.outfitSlot();try{const s=await new Promise((p,u)=>{const h=new FileReader;h.onload=()=>p(String(h.result)),h.onerror=()=>u(new Error("couldn't read that file")),h.readAsDataURL(e)}),a=await this.ensureWardrobe();await m.putLibbyOutfitWip(a,t.emotion,t.tier,{imageData:s,filename:i,seed:-1,reviewed:!1,config:this.outfitConfigKey()});const o=this.shotAt(t);o&&!o.id.startsWith("wip-")&&await m.deleteGenPreview(o.id).catch(()=>{});const n=be(t),l={id:`wip-${a}-${t.emotion}-${t.tier}`,seed:-1,saved:!1,outfitFilename:i,outfitSlot:t,outfitConfig:this.outfitConfigKey(),cutoutReviewed:!1,previewVersion:Date.now(),wipOutfitId:a};this.shots=[...this.shots.filter(p=>!p.outfitSlot||be(p.outfitSlot)!==n),l],this.persistDraft(),this.openCutout(this.previewURL(l),e.name,i,l.id)}catch(s){this.showToast(`Couldn't use that image: ${s.message}`)}}async editWardrobeSlot(e,t,i){const s=se.findIndex(p=>p.id===t),a=ee.some(p=>p.id===t)?t:"";if(s<0&&!a)return;this.outfitWardrobeId!==e&&(this.outfitWardrobeId=e,this.persistDraft(),await this.loadWipBoard(e)),this.outfitOn=!0;const{slot:o,filename:n}=this.outfitSlot(a?0:i,Math.max(0,s),a);this.selectOutfitSlot(o.index),this.studioView="build";let l=this.shotAt(o);if(!l)try{const p=await fetch(m.libbyEmotionURL(e,t,i,Date.now()),{credentials:"same-origin"});if(!p.ok)throw new Error(`the sprite returned ${p.status}`);const u=await at(await p.blob());await m.putLibbyOutfitWip(e,o.emotion,o.tier,{imageData:u,filename:n,seed:-1,reviewed:!0,config:this.outfitConfigKey()}),l={id:`wip-${e}-${o.emotion}-${o.tier}`,seed:-1,saved:!1,outfitFilename:n,outfitSlot:o,outfitConfig:this.outfitConfigKey(),cutoutReviewed:!0,previewVersion:Date.now(),wipOutfitId:e},this.shots=[...this.shots,l],this.persistDraft()}catch(p){this.showToast(`Couldn't open that sprite: ${p.message}`);return}this.openCutout(this.previewURL(l),t,l.outfitFilename,l.id)}renderDressSection(){const e=Se.filter(({key:i})=>Pe(this.outfitGear[i])).length,t=r`
      ${this.selectedChars.length>1?r`<div class="banner">
        ${this.selectedChars.length} characters are selected. Use one character for a
        reliable outfit set; the solo prompt will still discourage extra people.
      </div>`:d}
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
          <span class="equipped-count">${e}/${Se.length} worn</span>
          <button class="loadout-clear" ?disabled=${this.outfitBatchRunning||!e}
            @click=${()=>this.clearOutfitLoadout()}>Unequip all</button>
        </div>
        <div class="sec-note">Switch a piece off to keep it in the recipe without wearing it.</div>
        <div class="loadout-slots">
          ${Se.map(i=>this.renderGearSlot(i.key))}
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
      </div>`:d}
      ${this.renderCameraControls()}
      <div>
        <label class="field">Exposure by tier</label>
        <div class="sec-note">${ne.map((t,i)=>r`<div><strong>${t.label}:</strong> ${di[i].description}</div>`)}</div>
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
    `;return this.section("extras","Prompt extras",this.prompt.trim()||this.negative.trim()?"set":"none",e)}onCivitaiClose(){this.civitaiOpen=!1,this.loadStatus()}onCivitaiPrompt(e){this.prompt=e.prompt,this.negative=e.negativePrompt??"",e.sampler&&(this.scheduler=e.sampler),e.steps&&(this.steps=e.steps),e.cfgScale&&(this.cfg=e.cfgScale),e.seed&&(this.seed=e.seed),e.width&&e.height&&(this.width=e.width,this.height=e.height),this.templateId="",this.selectedTriggers=[],this.onCivitaiClose()}section(e,t,i,s){return this.flatTitles?r`<div class="pane-title">${t}<span class="pane-count">${i}</span></div><div class="pane sec-${e}">${s}</div>`:r`<div class="pane sec-${e}">${s}</div>`}renderModelSection(e){if(!e.length)return this.section("models","Models","0",r`<div class="sec-note">
          Connected, but the generator lists no checkpoints. Add a model to it and reload.
        </div>`);const t=this.pickerFilter.trim().toLowerCase(),i=t?e.filter(a=>`${a.model_name} ${a.title} ${a.base??""}`.toLowerCase().includes(t)):e,s=r`
      ${t&&!i.length?r`<div class="sec-note">No model matches “${this.pickerFilter}”.</div>`:d}
      <div class="cards">
        ${i.map(a=>{var l;const o=a.title===this.checkpoint,n=`${m.modelThumbURL(a.title)}&v=${this.thumbVersion}`;return r`
            <div class="card-wrap">
              <button class="card ${o?"on":""}" title=${a.title} @click=${()=>this.pickModel(a)}>
                ${this.renderArt(n,a.model_name,"texture")}
                <div class="card-name">${a.model_name}${a.base?r`<span class="row-sub">${a.base}</span>`:d}</div>
              </button>
              ${(l=this.status)!=null&&l.manageModels?r`<button class="card-edit left" title="Edit model settings" @click=${()=>this.openMetaEditor(a.title)}>
                <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
              </button>`:d}
            </div>
          `})}
      </div>
    `;return this.section("models","Models",String(e.length),s)}renderLoraSection(e,t){var a,o,n,l;const i=(((a=this.status)==null?void 0:a.models)??[]).find(p=>p.title===this.checkpoint),s=r`<oppai-lora-picker .loras=${e} .selected=${this.selectedLoras} .modelBase=${(i==null?void 0:i.base)??""}
      .thumbVersion=${this.thumbVersion} ?canEdit=${!!((o=this.status)!=null&&o.manageModels)} ?civitai=${!!((n=this.status)!=null&&n.civitai)}
      ?canRename=${!!((l=this.status)!=null&&l.canRename)}
      .people=${this.regionsActive?this.regionPeople.map(p=>p.lora):[]}
      .error=${t??""}
      @lora-drag=${p=>{this.loraDrag=p.detail.name,this.loraOver=null}}
      @lora-person=${p=>this.wearLora(p.detail.name,p.detail.person)}
      @lora-rename=${p=>this.renamingLoras=p.detail.names}
      @lora-toggle=${p=>this.toggleLora(p.detail.name)}
      @lora-weight=${p=>this.selectedLoras={...this.selectedLoras,[p.detail.name]:p.detail.weight}}
      @lora-edit=${p=>this.openMetaEditor(p.detail.name)}
      @lora-file=${p=>void this.setLoraCategory(p.detail.names,p.detail.category)}
      @loras-sorted=${p=>this.applyCivitaiSort(p.detail.results)}
    ></oppai-lora-picker>`;return this.section("loras","LoRAs",String(Object.keys(this.selectedLoras).length||e.length),s)}async setLoraCategory(e,t){var s;const i=this.status;if(!(!i||!e.length)){this.status={...i,loras:Ki(i.loras??[],e,t)};try{if(await m.loraCategoryAssign(t,e),e.length>1){const a=((s=Ce.find(o=>o.key===t))==null?void 0:s.label)??"Unsorted";this.showToast(`Filed ${e.length} LoRAs under ${a}`)}}catch(a){this.status=i,this.showToast(a.message)}}}applyCivitaiSort(e){var i;let t=((i=this.status)==null?void 0:i.loras)??[];for(const[s,a]of Oo(e))t=Ki(t,a,s);this.status&&(this.status={...this.status,loras:t})}renderVaeSection(e){const t=e.length?r`
          <div class="rows">
            <button class="row-pick ${this.vae===""?"on":""}" @click=${()=>this.vae=""}>
              Model default
            </button>
            ${e.map(i=>r`<button
                class="row-pick ${this.vae===i.key?"on":""}"
                @click=${()=>this.vae=this.vae===i.key?"":i.key}
              >
                ${i.name}
                ${i.base?r`<span class="row-sub">${i.base}</span>`:d}
              </button>`)}
          </div>
        `:r`<div class="sec-note">The generator lists no standalone VAEs; the model's own is used.</div>`;return this.section("vaes","VAEs",this.vae?"1 picked":"default",t)}renderSettingsSection(e,t){var s;const i=r`
      <div class="settings">
        <div class="full">
          <label class="field">Scheduler</label>
          <select
            class="num"
            .value=${this.scheduler}
            @change=${a=>this.scheduler=a.target.value}
          >
            ${la.map(a=>r`<option value=${a.id} ?selected=${a.id===this.scheduler}>${a.label}</option>`)}
          </select>
        </div>
        <div>
          <label class="field">Steps</label>
          <input class="num" type="number" min="1" max="80" .value=${String(this.steps)}
            @input=${a=>this.steps=Ee(a.target.value,1,80,25)} />
        </div>
        <div>
          <label class="field">CFG scale</label>
          <input class="num" type="number" min="1" max="30" step="0.5" .value=${String(this.cfg)}
            @input=${a=>this.cfg=We(a.target.value,1,30,7)} />
        </div>
        ${e?r`
          <div>
            <label class="field">CFG rescale</label>
            <input class="num" type="number" min="0" max="0.99" step="0.05" .value=${String(this.cfgRescale)}
              @input=${a=>this.cfgRescale=We(a.target.value,0,.99,0)} />
          </div>
          <div>
            <label class="field">CLIP skip</label>
            <input class="num" type="number" min="0" max="12" .value=${String(this.clipSkip)}
              @input=${a=>this.clipSkip=Ee(a.target.value,0,12,0)} />
          </div>
        `:d}
        <div>
          <label class="field">Count</label>
          <input class="num" type="number" min="1" max="8" .value=${String(this.count)}
            @input=${a=>this.count=Ee(a.target.value,1,8,1)} />
        </div>
        <div>
          <label class="field">Seed (-1 random)</label>
          <input class="num" type="number" .value=${String(this.seed)}
            @input=${a=>this.seed=Ee(a.target.value,-1,2147483648,-1)} />
        </div>
        ${e?r`
          <!-- Which gallery a generation lands in is no longer a second setting here:
               it follows whichever gallery the Invoke gallery panel has open, so the
               place you're looking at is the place new images appear. -->
          <div class="full" style="font-size:12px; color:var(--oppai-text-muted);">
            Generations are added to <b>${((s=t.find(a=>a.id===this.board))==null?void 0:s.name)??"the open gallery"}</b> —
            switch galleries in the Invoke gallery panel.
          </div>
          <label class="switch-row"><input type="checkbox" .checked=${this.cpuNoise}
            @change=${a=>this.cpuNoise=a.target.checked} /> CPU noise</label>
          <label class="switch-row"><input type="checkbox" .checked=${this.seamlessX}
            @change=${a=>this.seamlessX=a.target.checked} /> Seamless X</label>
          <label class="switch-row"><input type="checkbox" .checked=${this.seamlessY}
            @change=${a=>this.seamlessY=a.target.checked} /> Seamless Y</label>
        `:d}
        ${this.canUpscale?this.renderUpscaleSettings():d}
      </div>
    `;return this.section("settings","Model settings",`${this.steps} steps`,i)}renderDetailerSection(e){const t=this.status,i=r`<oppai-detailer-panel .value=${this.detailerValue} ?invoke=${e} ?available=${!!(t!=null&&t.detailerAvailable)}
      .detectors=${(t==null?void 0:t.detectors)??[]} .loras=${(t==null?void 0:t.loras)??[]} ?civitai=${!!(t!=null&&t.civitai)} ?canInstall=${!!(t!=null&&t.manageModels)}
      .manageNote=${Ot(t)} ?canRename=${!!(t!=null&&t.canRename)} ?restarting=${this.restarting}
      @restart-generator=${()=>void this.restartGenerator()}
      @detailer-change=${a=>this.onDetailerChange(a.detail)}
      @detectors-changed=${()=>void this.refreshStatus()}></oppai-detailer-panel>`,s=(t==null?void 0:t.detailerAvailable)&&this.detailerEnabled&&this.detailerHasPasses;return this.section("detailer","ADetailer",s?"on":"off",i)}get detailerValue(){return{enabled:this.detailerEnabled,faces:this.detailerFaces,faceModel:this.detailerModel,hands:this.detailerHands,prompt:this.detailerPrompt,negative:this.detailerNegative,confidence:this.detailerConfidence,denoise:this.detailerDenoise,maskBlur:this.detailerMaskBlur,custom:this.detailerCustom}}onDetailerChange(e){e.enabled!==void 0&&(this.detailerEnabled=e.enabled),e.faces!==void 0&&(this.detailerFaces=e.faces),e.faceModel!==void 0&&(this.detailerModel=e.faceModel),e.hands!==void 0&&(this.detailerHands=e.hands),e.prompt!==void 0&&(this.detailerPrompt=e.prompt),e.negative!==void 0&&(this.detailerNegative=e.negative),e.confidence!==void 0&&(this.detailerConfidence=e.confidence),e.denoise!==void 0&&(this.detailerDenoise=e.denoise),e.maskBlur!==void 0&&(this.detailerMaskBlur=e.maskBlur),e.custom!==void 0&&(this.detailerCustom=e.custom)}renderPeopleSection(){var e;return(e=this.status)!=null&&e.regionsAvailable?r`<div class="sec-note">Pick how many people under the prompt, beside the picture count — each then
      gets a character, words and a LoRA of their own there.</div>`:r`<div class="manage-note">
        <span class="material-symbols-rounded">group</span>
        <span>To draw two or more people with a character LoRA each, without their faces blending into one, install
          the Regional Prompter extension in Automatic1111 — Extensions → Available → Regional Prompter — and restart it.
          Each person then gets a part of the picture of their own.</span>
      </div>`}renderPeopleCount(){const e=this.regionsActive?this.regionPeople.length:1;return r`<div class="count-seg people-seg" role="group" aria-label="People in the picture"
      title="People in the picture — two or more each get a part of their own, with their own character and LoRA">
      <span class="material-symbols-rounded" aria-hidden="true">group</span>
      ${Array.from({length:Ci},(t,i)=>i+1).map(t=>r`<button class=${e===t?"on":""} aria-pressed=${e===t?"true":"false"}
        @click=${()=>this.setPeopleCount(t)}>${t}</button>`)}
    </div>
    <!-- On a phone the four buttons pushed Generate off the bar: one that steps
         through them instead. -->
    <button class="people-cycle ${e>1?"on":""}" title="People in the picture — tap for more"
      aria-label=${`${e} ${e===1?"person":"people"} in the picture`}
      @click=${()=>this.setPeopleCount(e>=Ci?1:e+1)}>
      <span class="material-symbols-rounded">group</span>${e}
    </button>`}setPeopleCount(e){var i;if(e<2){this.regionsOn=!1;return}if(!((i=this.status)!=null&&i.regionsAvailable)){this.showToast("Two or more people need the Regional Prompter extension in Automatic1111 — Extensions → Available → Regional Prompter, then restart it");return}const t=this.regionPeople.slice(0,e);for(;t.length<e;)t.push(ti());this.regionPeople=t,this.regionsOn=!0}renderPeopleStrip(){var o;if(!this.regionsActive)return d;const e=this.characters,t=((o=this.status)==null?void 0:o.loras)??[],i=this.regionPeople,s=(n,l)=>this.regionPeople=this.regionPeople.map((p,u)=>u===n?{...p,...l}:p),a=Rs(i);return r`<div class="people-strip">
      <div class="people-head">
        <div class="people-layout ${this.regionsRows?"rows":""}" aria-hidden="true">
          ${a.map((n,l)=>r`<span style="flex:${n.size}">${l+1}</span>`)}
        </div>
        <div class="chips">
          <button class="chip small ${this.regionsRows?"":"on"}" aria-pressed=${this.regionsRows?"false":"true"}
            @click=${()=>this.regionsRows=!1}>Side by side</button>
          <button class="chip small ${this.regionsRows?"on":""}" aria-pressed=${this.regionsRows?"true":"false"}
            @click=${()=>this.regionsRows=!0}>Stacked</button>
        </div>
        <span class="people-hint">The prompt is what they share — say how many (2girls) and where.
          ${this.regionsRows?"":"The face pass redoes each face with its person's words and LoRA, left to right."}</span>
      </div>
      ${this.renderPeopleAdvice()}
      <div class="people-grid" style="--people:${i.length}">
        ${i.map((n,l)=>r`<div class="pass-card">
          <div class="pass-row">
            <b class="person-n">${l+1}</b>
            <select class="num" aria-label="Character for person ${l+1}"
              @change=${p=>s(l,{character:p.target.value})}>
              <option value="" ?selected=${!n.character}>No saved character</option>
              ${e.map(p=>r`<option value=${p.id} ?selected=${p.id===n.character}>${p.name}</option>`)}
            </select>
            <button class="pass-remove" title="Remove person ${l+1}" aria-label="Remove person ${l+1}"
              @click=${()=>{const p=this.regionPeople.filter((u,h)=>h!==l);p.length<2?this.regionsOn=!1:this.regionPeople=p}}>
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <textarea class="num person-words" rows="2" .value=${n.words} placeholder="Their words: hair, clothes, what they're doing"
            aria-label="Words for person ${l+1}"
            @input=${p=>s(l,{words:p.target.value})}></textarea>
          <div class="pass-row">
            <select class="num" aria-label="LoRA for person ${l+1}"
              @change=${p=>s(l,{lora:p.target.value})}>
              <option value="" ?selected=${!n.lora}>No LoRA</option>
              ${t.map(p=>r`<option value=${p.name} ?selected=${p.name===n.lora}>${p.alias||p.name}</option>`)}
            </select>
            ${n.lora?r`<input class="lora-weight" type="number" min="-2" max="2" step="0.05" title="LoRA weight"
              aria-label="LoRA weight" .value=${String(n.loraWeight)}
              @input=${p=>s(l,{loraWeight:We(p.target.value,-2,2,.8)})} />`:d}
            <input class="lora-weight share" type="number" min="0.5" max="4" step="0.5"
              title=${this.regionsRows?"How tall their part is beside the others":"How wide their part is beside the others"}
              aria-label="Size of their part" .value=${String(n.share)}
              @input=${p=>s(l,{share:We(p.target.value,.5,4,1)})} />
          </div>
        </div>`)}
      </div>
    </div>`}renderPeopleAdvice(){var a;const e=((a=this.status)==null?void 0:a.loras)??[],t=$l(this.regionsRows,this.regionPeople,this.width,this.height,this.selectedLoras,e),i=this.selectedChars.map(o=>{var n;return(n=this.characters.find(l=>l.id===o))==null?void 0:n.name}).filter(Boolean);if(!t.narrow&&!t.everyone.length&&!i.length)return d;const s=o=>{var n;return((n=e.find(l=>l.name===o))==null?void 0:n.alias)||o};return r`<div class="people-advice">
      ${t.narrow?r`<div class="advice-row">
        <span class="material-symbols-rounded">aspect_ratio</span>
        <span>${this.regionsRows?`Stacked in a ${this.width}×${this.height} picture, each person is a thin band — they come out squashed.`:`Side by side in a ${this.width}×${this.height} picture, each person gets a strip ${Math.round(this.width/this.regionPeople.length)} pixels wide — too thin to draw a figure.`}</span>
        <button class="chip small" @click=${()=>{const o=this.width;this.width=this.height,this.height=o}}>
          ${this.regionsRows?"Make it tall":"Make it wide"}</button>
      </div>`:d}
      ${t.everyone.map(o=>r`<div class="advice-row">
        <span class="material-symbols-rounded">group_off</span>
        <span><b>${s(o)}</b> is a character LoRA in the recipe, so it is put on everyone. Put it on one person instead.</span>
        <button class="chip small" @click=${()=>this.toggleLora(o)}>Take it off the recipe</button>
      </div>`)}
      ${i.length?r`<div class="advice-row">
        <span class="material-symbols-rounded">person_off</span>
        <span>${i.join(", ")} ${i.length===1?"is":"are"} picked in Look, which sits out while people have parts of
          their own — pick a character for each person here instead.</span>
      </div>`:d}
    </div>`}renderUpscaleSettings(){var o,n,l;const e=Es((o=this.status)==null?void 0:o.latentUpscalers,(n=this.status)==null?void 0:n.upscalers),t=this.hiresChoice,i=ii(this.width,this.height,this.hiresScale),s=xt(this.width,this.height,i),a=this.upscaleChoice;return r`
      <label class="switch-row full"><input type="checkbox" .checked=${this.hiresEnabled}
        @change=${p=>this.hiresEnabled=p.target.checked} />
        Hires fix — draw it again bigger</label>
      ${this.hiresEnabled?r`
        <div class="full">
          <label class="field">Hires upscaler</label>
          <select class="num" @change=${p=>this.hiresUpscaler=p.target.value}>
            ${e.map(p=>r`<option value=${p} ?selected=${p===t}>${p}</option>`)}
          </select>
        </div>
        <div>
          <label class="field">Scale</label>
          <input class="num" type="number" min="1" max="4" step="0.25" .value=${String(this.hiresScale)}
            @input=${p=>this.hiresScale=We(p.target.value,1,4,1.5)} />
        </div>
        <div>
          <label class="field">Hires denoise</label>
          <input class="num" type="number" min="0.05" max="1" step="0.05" .value=${String(this.hiresDenoise)}
            @input=${p=>this.hiresDenoise=We(p.target.value,.05,1,.45)} />
        </div>
        <div>
          <label class="field">Hires steps (0 = same)</label>
          <input class="num" type="number" min="0" max="80" .value=${String(this.hiresSteps)}
            @input=${p=>this.hiresSteps=Ee(p.target.value,0,80,0)} />
        </div>
        <div class="full sec-note">Drawn at ${this.width}×${this.height}, then again at ${s.width}×${s.height}${i<this.hiresScale?" — as large as a hires fix goes":""}. Pictures started from another keep their size.</div>
      `:d}
      <div class="full">
        <label class="field">Upscale a finished picture with</label>
        <select class="num" @change=${p=>this.upscaleUpscaler=p.target.value}>
          ${(((l=this.status)==null?void 0:l.upscalers)??[]).map(p=>r`<option value=${p} ?selected=${p===a}>${p}</option>`)}
        </select>
      </div>
      <div>
        <label class="field">Upscale by</label>
        <select class="num" @change=${p=>this.upscaleBy=Number(p.target.value)}>
          ${[1.5,2,3,4].map(p=>r`<option value=${p} ?selected=${p===this.upscaleBy}>${p}×</option>`)}
        </select>
      </div>
      <div class="full sec-note">Upscale is on a picture's menu, in the gallery and over a picture you start from. It
        enlarges without redrawing, so nothing in the picture changes.</div>
    `}renderTemplateSection(e){var n;const t=e.filter(l=>l.builtIn).length,i=this.showBuiltInTemplates?e:e.filter(l=>!l.builtIn),s=i.length?r`
          <div class="rows">
            ${i.map(l=>r`<button
                class="row-pick ${this.templateId===l.id?"on":""}"
                title=${l.prompt}
                @click=${()=>this.templateId=this.templateId===l.id?"":l.id}
              >
                ${l.name}
                <span class="row-sub">${l.prompt}</span>
              </button>`)}
          </div>
        `:r`<div class="sec-note">
          ${e.length?"No templates you created. Built-in presets are hidden — turn them on below.":((n=this.status)==null?void 0:n.backend)==="invokeai"?"No style presets in InvokeAI yet; add some there and reload.":"No styles saved in Automatic1111 yet; save one from its Styles menu and reload."}
        </div>`,a=r`
      ${s}
      ${t?r`<button
            class="link-toggle"
            @click=${()=>this.showBuiltInTemplates=!this.showBuiltInTemplates}
          >
            ${this.showBuiltInTemplates?"Hide built-in presets":`Show built-in presets (${t})`}
          </button>`:d}
    `,o=e.find(l=>l.id===this.templateId);return this.section("templates","Styles",o?o.name:"none",a)}renderCharacterSection(){const e=r`
      ${this.characters.length?r`<div class="cards">
            ${this.characters.map(i=>{const s=this.selectedChars.includes(i.id),a=`${m.characterThumbURL(i.id)}?v=${this.thumbVersion}`;return r`
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
      </div>`:d}
      ${this.poses.length?r`<div class="cards">
            ${this.poses.map(i=>{const s=this.selectedPoses.includes(i.id),a=`${m.poseThumbURL(i.id)}?v=${this.thumbVersion}`;return r`
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
          </div>`:d}
      <button class="side-add" @click=${()=>this.wildcardDraft={name:"",text:""}}>
        <span class="material-symbols-rounded" style="font-size:17px;">add</span> New wildcard list
      </button>
    `;return this.section("wildcards","Wildcards",String(this.wildcards.length),e)}insertWildcard(e){const t=`__${e}__`,i=this.renderRoot.querySelector(".prompt-area"),s=i&&document.activeElement===i?i.selectionStart:this.prompt.length,a=this.prompt.slice(0,s).replace(/\s+$/,""),o=this.prompt.slice(s).replace(/^\s+/,""),n=a&&!a.endsWith(",")?`${a}, `:a,l=o?o.startsWith(",")?o:`, ${o}`:"";this.prompt=`${n}${t}${l}`}togglePose(e){this.selectedPoses=this.selectedPoses.includes(e)?this.selectedPoses.filter(t=>t!==e):[...this.selectedPoses,e]}onPoseThumbFile(e){var a;const t=e.target,i=(a=t.files)==null?void 0:a[0];if(t.value="",!i||!this.poseDraft)return;const s=new FileReader;s.onload=()=>{this.poseDraft&&(this.poseDraft={...this.poseDraft,imageData:String(s.result),previewId:void 0})},s.readAsDataURL(i)}async savePose(){const e=this.poseDraft;if(!(!e||!e.name.trim()||this.poseBusy)){this.poseBusy=!0;try{const t=await m.savePose({id:e.id,name:e.name.trim(),prompt:e.prompt,negativePrompt:e.negativePrompt,imageData:e.imageData,previewId:e.previewId});this.poseDraft=null,this.bumpThumbs(),await this.loadPoses(),e.id||(this.selectedPoses=[...this.selectedPoses,t.id]),this.showToast("Pose saved")}catch(t){this.showToast(t.message)}finally{this.poseBusy=!1}}}async deletePose(){const e=this.poseDraft;if(!(!(e!=null&&e.id)||this.poseBusy)&&confirm(`Delete “${e.name}” from the pose library?`)){this.poseBusy=!0;try{await m.deletePose(e.id),this.poseDraft=null,await this.loadPoses(),this.showToast("Pose deleted")}catch(t){this.showToast(t.message)}finally{this.poseBusy=!1}}}async saveWildcard(){const e=this.wildcardDraft;if(!(!e||!e.name.trim()||!e.text.trim()||this.wildcardBusy)){this.wildcardBusy=!0;try{await m.saveWildcard({id:e.id,name:e.name.trim(),text:e.text}),this.wildcardDraft=null,await this.loadWildcards(),this.showToast("Wildcard list saved")}catch(t){this.showToast(t.message)}finally{this.wildcardBusy=!1}}}async deleteWildcard(){const e=this.wildcardDraft;if(!(!(e!=null&&e.id)||this.wildcardBusy)&&confirm(`Delete the wildcard list “${e.name}”?`)){this.wildcardBusy=!0;try{await m.deleteWildcard(e.id),this.wildcardDraft=null,await this.loadWildcards(),this.showToast("Wildcard list deleted")}catch(t){this.showToast(t.message)}finally{this.wildcardBusy=!1}}}renderPoseEditor(e){var i;const t=e.imageData??(e.previewId?m.genPreviewURL(e.previewId):e.id&&((i=this.poses.find(s=>s.id===e.id))!=null&&i.hasThumb)?`${m.poseThumbURL(e.id)}?v=${this.thumbVersion}`:void 0);return r`
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
            ${e.id?r`<button class="btn danger" ?disabled=${this.poseBusy} @click=${()=>this.deletePose()}>Delete</button>`:d}
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
            ${e.id?r`<button class="btn danger" ?disabled=${this.wildcardBusy} @click=${()=>this.deleteWildcard()}>Delete</button>`:d}
            <button class="btn" @click=${()=>this.wildcardDraft=null}>Cancel</button>
            <button class="btn primary" ?disabled=${!e.name.trim()||!e.text.trim()||this.wildcardBusy} @click=${()=>this.saveWildcard()}>Save</button>
          </div>
        </div>
      </div>
    `}renderGearSlot(e){var p,u,h;const t=Se.find(g=>g.key===e),i=this.outfitGear[e],s=!!i.item.trim(),a=Pe(i),o=g=>{this.outfitGear={...this.outfitGear,[e]:{...i,...g}}},n=!!((p=i.prompt)!=null&&p.trim())||!!((u=i.noun)!=null&&u.trim()),l=this.gearPromptOpen===e;return r`<div class="gear-slot ${a?"filled":""} ${i.off?"off":""}" title=${t.hint}>
      <button class="gear-slot-icon material-symbols-rounded ${s?"":"inert"}" aria-hidden=${s?"false":"true"}
        title=${i.off?`Wear the ${t.label.toLowerCase()} again`:s?`Take the ${t.label.toLowerCase()} off without clearing it`:t.hint}
        ?disabled=${this.outfitBatchRunning||!s}
        @click=${()=>o({off:!i.off})}>${i.off?"visibility_off":t.icon}</button>
      <span class="gear-slot-name">${t.label}${i.off?" · off":""}</span>
      <button class="gear-slot-prompt ${n?"on":""} ${l?"open":""}"
        title=${`What the generator calls this slot — currently "${Pi(t,i)}"`}
        aria-label=${`Edit the prompt wording for ${t.label}`} aria-expanded=${l?"true":"false"}
        ?disabled=${this.outfitBatchRunning}
        @click=${()=>this.gearPromptOpen=l?null:e}>
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
      ${l?r`<div class="gear-prompt-edit">
        <label>Prompt word
          <input type="text" .value=${i.prompt??""} placeholder=${t.prompt}
            ?disabled=${this.outfitBatchRunning}
            aria-label=${`Prompt word for ${t.label}`}
            @input=${g=>o({prompt:g.target.value})} /></label>
        <label>Colour-lock noun
          <input type="text" .value=${i.noun??""} placeholder=${Lt(t,i)}
            ?disabled=${this.outfitBatchRunning}
            aria-label=${`Colour-lock noun for ${t.label}`}
            @input=${g=>o({noun:g.target.value})} /></label>
        <p class="gear-prompt-preview">
          ${a?r`Sends: <code>${Wi(t,i,((h=this.status)==null?void 0:h.backend)??"",this.outfitLockColors)}</code>`:r`Describe something in this slot to see the phrase it sends.`}
        </p>
        ${n?r`<button class="gear-prompt-reset" ?disabled=${this.outfitBatchRunning}
          @click=${()=>o({prompt:"",noun:""})}>Reset to "${t.prompt}"</button>`:d}
      </div>`:d}
    </div>`}clearOutfitLoadout(){this.outfitGear={...Ks}}renderLoadoutSection(){const e=this.loadouts.find(i=>i.id===this.outfitLoadoutId),t=r`
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
            ${i.hasThumb?r`<img class="cover" src=${m.libbyLoadoutThumbURL(i.id,this.loadoutCoverVersion)} alt="" />`:r`<span class="cover cover-empty material-symbols-rounded">checkroom</span>`}
            <span class="card-name">${i.name}</span>
          </button>
          ${i.id===this.outfitLoadoutId?r`<span class="worn-badge">Equipped</span>`:d}
          <button class="card-del" title=${`Delete ${i.name}`} aria-label=${`Delete ${i.name}`}
            ?disabled=${this.loadoutBusy} @click=${()=>void this.deleteLoadout(i)}>
            <span class="material-symbols-rounded" style="font-size:15px;">delete</span>
          </button>
        </div>`)}
        ${this.loadouts.length?d:r`<div class="sec-note">No saved loadouts yet.</div>`}
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
          </button>`:d}
      </div>
    `;return this.section("loadouts","Saved loadouts",String(this.loadouts.length),t)}renderCameraControls(){const e=Dt.shots.find(t=>t.id===this.camera.shot);return r`
      <div>
        <label class="field">Shot</label>
        <select class="num" .value=${this.camera.shot} ?disabled=${this.outfitBatchRunning}
          @change=${t=>this.editCamera({shot:t.target.value})}>
          ${Dt.shots.map(t=>r`<option value=${t.id}>${t.label}</option>`)}
        </select>
      </div>
      ${e!=null&&e.hint?r`<div class="sec-note">${e.hint}.</div>`:d}
    `}async openCutout(e,t,i,s){this.cutout={url:e,name:t,outputName:i,outfitShotId:s},this.cutoutError="",this.cutoutBusy=!0,this.showOriginal=!1,this.cutoutZoom=1,this.cutoutContrast=!1;try{const a=await Ue(e);this.session=new Qa(a),this.session.autoRemove(this.cutoutTolerance),this.cutoutTool="remove",await this.paintCutout()}catch(a){this.cutoutError=a.message}finally{this.cutoutBusy=!1}}async paintCutout(){const e=this.session;if(!e)return;this.cutoutCanvas=e.compose({feather:this.cutoutFeather,spill:this.cutoutSpill},this.showOriginal),this.cutFraction=e.cutFraction,this.canUndo=e.canUndo,this.canRedo=e.canRedo,await this.updateComplete;const t=this.cutoutHost;t&&this.cutoutCanvas&&(t.replaceChildren(this.cutoutCanvas),this.applyCutoutZoom())}applyCutoutZoom(){const e=this.cutoutCanvas,t=this.cutoutHost;if(!e||!t)return;const i=Math.max(1,t.clientWidth),s=Math.max(280,Math.min(window.innerHeight*.62,e.height)),o=Math.min(1,i/e.width,s/e.height)*this.cutoutZoom;e.style.width=`${Math.max(1,Math.round(e.width*o))}px`,e.style.height=`${Math.max(1,Math.round(e.height*o))}px`}setCutoutZoom(e){this.cutoutZoom=Math.max(.25,Math.min(4,e)),this.updateComplete.then(()=>this.applyCutoutZoom())}async autoCutout(){this.session&&(this.session.autoRemove(this.cutoutTolerance),await this.paintCutout())}cutoutPoint(e){const t=this.cutoutCanvas;if(!t)return null;const i=t.getBoundingClientRect();return!i.width||!i.height?null:{x:(e.clientX-i.left)/i.width*t.width,y:(e.clientY-i.top)/i.height*t.height}}async onCutoutPointerDown(e){var s,a;const t=this.session,i=this.cutoutPoint(e);if(!(!t||!i)&&!this.showOriginal){if(e.preventDefault(),this.cutoutTool==="remove"){t.removeAt(i.x,i.y,{tolerance:this.cutoutTolerance,contiguous:this.contiguous}),await this.paintCutout();return}t.beginStroke(),this.painting=!0,(a=(s=e.target).setPointerCapture)==null||a.call(s,e.pointerId),t.paint(i.x,i.y,this.brushSize,this.cutoutTool==="add"?"add":"subtract"),await this.paintCutout()}}async onCutoutPointerMove(e){if(!this.painting||!this.session)return;const t=this.cutoutPoint(e);t&&(this.session.paint(t.x,t.y,this.brushSize,this.cutoutTool==="add"?"add":"subtract"),await this.paintCutout())}onCutoutPointerUp(){this.painting=!1}async undoCutout(){var e;(e=this.session)!=null&&e.undo()&&await this.paintCutout()}async redoCutout(){var e;(e=this.session)!=null&&e.redo()&&await this.paintCutout()}async resetCutout(){var e;(e=this.session)==null||e.reset(),await this.paintCutout()}async toggleOriginal(e){this.showOriginal=e,await this.paintCutout()}async closeCutout(){await wa(this.renderRoot.querySelector(".cutout-dialog")),this.cutout=null,this.cutoutCanvas=null,this.cutoutError="",this.session=null,this.painting=!1,this.showOriginal=!1,this.cutoutZoom=1,this.cutoutContrast=!1}cutoutName(){var t,i;return(t=this.cutout)!=null&&t.outputName?this.cutout.outputName:`${(((i=this.cutout)==null?void 0:i.name)??"cutout").replace(/\.[a-z0-9]+$/i,"").slice(0,60)||"cutout"}-cutout.png`}exportCanvas(){return this.session?this.session.compose({feather:this.cutoutFeather,spill:this.cutoutSpill}):null}async downloadCutout(){const e=this.exportCanvas();if(e)try{const t=await ji(e),i=URL.createObjectURL(t),s=document.createElement("a");s.href=i,s.download=this.cutoutName(),s.click(),setTimeout(()=>URL.revokeObjectURL(i),0)}catch(t){this.cutoutError=t.message}}async saveCutout(){const e=this.exportCanvas();if(!(!e||this.cutoutBusy)){this.cutoutBusy=!0;try{const t=await ji(e),i=this.cutoutName();await m.upload(new File([t],i,{type:"image/png"}),i),this.dispatchEvent(new CustomEvent("imported",{detail:{count:1,kind:"image",title:i},bubbles:!0,composed:!0})),this.showToast("Cut-out saved to your library."),this.closeCutout()}catch(t){this.cutoutError=t.message}finally{this.cutoutBusy=!1}}}renderCutoutDialog(){if(!this.cutout)return d;const e=this.cutoutTool!=="remove",t=Math.round(this.cutFraction*100),i=!!this.cutout.outfitShotId;return r`
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

          ${this.cutoutError?r`<div class="banner">${this.cutoutError}</div>`:d}

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
    `}renderCharEditor(e){var i;const t=e.imageData??(e.id&&((i=this.characters.find(s=>s.id===e.id))!=null&&i.hasThumb)?`${m.characterThumbURL(e.id)}?v=${this.thumbVersion}`:void 0);return r`
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
                </button>`:d}
            <button class="btn" @click=${()=>this.charDraft=null}>Cancel</button>
            <button class="btn primary" ?disabled=${!e.name.trim()||this.charBusy} @click=${()=>this.saveCharacter()}>
              Save
            </button>
          </div>
        </div>
      </div>
    `}renderPrompt(){var i,s,a,o,n,l;const e=this.outfitOn?1:this.count,t=this.activeTriggerPhrases();return r`
      <div class="prompt-card composer">
        ${this.editing?r`<div class="editing-bar">
          <span class="material-symbols-rounded" style="font-size:17px;">brush</span>
          <span class="editing-copy">Editing <strong>${this.editing.title}</strong>${this.editingLibby?" — one of Libby's pictures":""}.
            Generate, then Save to keep it beside the original, or right-click a result to replace it.</span>
          <button class="chip" @click=${()=>this.editing=null}>Done</button>
        </div>`:d}
        ${this.renderSourceBar()}

        <div class="composer-fields">
          <div class="prompt-field positive">
            <textarea
              class="prompt-area"
              aria-label="Positive prompt"
              aria-autocomplete="list"
              .value=${this.prompt}
              placeholder="Describe what you want to create — tags complete as you type, and so do <lora: and __wildcards__"
              @input=${p=>{this.prompt=p.target.value,this.onPromptTyping("prompt")}}
              @click=${()=>this.onPromptTyping("prompt")}
              @keydown=${p=>this.onPromptKey(p,"prompt")}
              @blur=${()=>this.closeCompletionsSoon()}
            ></textarea>
            ${this.completionField==="prompt"?this.renderCompletions():d}
          </div>
          <div class="prompt-field negative">
            <span class="field-tag negative">Negative</span>
            <textarea
              class="negative-area"
              aria-label="Negative prompt"
              aria-autocomplete="list"
              .value=${this.negative}
              placeholder="What to leave out…"
              @input=${p=>{this.negative=p.target.value,this.onPromptTyping("negative")}}
              @click=${()=>this.onPromptTyping("negative")}
              @keydown=${p=>this.onPromptKey(p,"negative")}
              @blur=${()=>this.closeCompletionsSoon()}
            ></textarea>
            ${this.completionField==="negative"?this.renderCompletions():d}
          </div>
        </div>
        ${this.outfitOn?d:this.renderPeopleStrip()}

        ${t.length?r`<div class="trigger-row">
          <span class="trigger-label">Trigger words</span>
          ${t.map(p=>r`<button
            class="chip small ${this.selectedTriggers.includes(p)?"on":""}"
            title="Add or remove this LoRA trigger phrase"
            @click=${()=>this.toggleTrigger(p)}>${p}</button>`)}
        </div>`:d}

        ${this.promptsOpen?this.renderRecentPrompts():d}
        <div class="composer-bar">
          <button class="mic" title="Start from a picture on this computer" @click=${()=>{var p;return(p=this.sourceFile)==null?void 0:p.click()}}>
            <span class="material-symbols-rounded">add_photo_alternate</span>
          </button>
          <button class="mic ${this.promptsOpen?"on":""}" title="Recent prompts" aria-expanded=${this.promptsOpen?"true":"false"}
            @click=${()=>this.promptsOpen=!this.promptsOpen}>
            <span class="material-symbols-rounded">history</span>
          </button>
          <input class="source-file" type="file" accept="image/png,image/jpeg,image/webp" hidden
            @change=${p=>this.onSourceFile(p)} />
          ${this.speechSupported?r`<button
                class="mic ${this.listening?"live":""}"
                title=${this.listening?"Stop listening":"Speak your idea"}
                @click=${()=>this.toggleListening()}
              >
                <span class="material-symbols-rounded">${this.listening?"stop":"mic"}</span>
              </button>`:d}
          ${this.listening||this.optimizing?r`<span class="speech-hint">${this.listening?this.speech||"Listening…":"Turning that into a prompt…"}</span>`:r`<div class="count-seg" role="group" aria-label="Pictures per run" title=${this.outfitOn?"The outfit board makes one square at a time":"Pictures per run"}>
                ${[1,2,3,4].map(p=>r`<button class=${e===p?"on":""} ?disabled=${this.outfitOn}
                  aria-pressed=${e===p?"true":"false"} @click=${()=>this.count=p}>${p}</button>`)}
              </div>
              ${((i=this.status)==null?void 0:i.backend)==="invokeai"||this.outfitOn?d:this.renderPeopleCount()}
              <span class="prompt-summary">${e} picture${e===1?"":"s"} · ${this.sizeLabel()}</span>`}
          ${this.generating?r`<button class="generate cancel" type="button" ?disabled=${(s=this.progress)==null?void 0:s.cancelled} title="Stop this generation" @click=${()=>void this.cancelGeneration()}>
                <span class="material-symbols-rounded" style="font-size:19px;">close</span>
                ${(a=this.progress)!=null&&a.cancelled?"Stopping…":(o=this.progress)!=null&&o.total?`Cancel · ${this.progress.step}/${this.progress.total}`:"Cancel"}
              </button>`:r`<button class="generate" title="Generate (Ctrl+Enter)" ?disabled=${!this.assemblePrompts().prompt.trim()} @click=${()=>this.generate()}>
                <span class="material-symbols-rounded" style="font-size:20px;">auto_awesome</span>
                ${((n=this.source)==null?void 0:n.mode)==="inpaint"&&this.sourceMask?"Repaint":((l=this.status)==null?void 0:l.backend)==="invokeai"?"Invoke":"Generate"}
              </button>`}
          ${this.outfitOn?d:r`<button class="queue-btn ${this.generating?"hot":""}" title="Add to the queue (Ctrl+Shift+Enter) — it keeps these settings"
            ?disabled=${!this.assemblePrompts().prompt.trim()} @click=${()=>void this.enqueue()}>
            <span class="material-symbols-rounded">playlist_add</span><span class="queue-label">Queue</span>
            ${this.queue.length?r`<b>${this.queue.length}</b>`:d}
          </button>`}
        </div>
      </div>
    `}sizeLabel(){if(!this.source)return`${this.width}×${this.height}`;const e=ei(this.source.width,this.source.height);return`${e.width}×${e.height}, as the picture`}activeTriggerPhrases(){var e;return[...new Set((((e=this.status)==null?void 0:e.loras)??[]).filter(t=>t.name in this.selectedLoras).flatMap(t=>t.triggerPhrases??[]))]}renderCompletions(){return this.completions.length?r`<div class="complete" role="listbox" aria-label="Suggestions"
      @mousedown=${e=>e.preventDefault()}>
      ${this.completions.map((e,t)=>r`<button class="complete-row ${t===this.completionIndex?"on":""}"
          role="option" aria-selected=${t===this.completionIndex?"true":"false"}
          @mouseenter=${()=>this.completionIndex=t}
          @click=${()=>void this.acceptCompletion(t)}>
          <span class="complete-dot cat-${e.kind==="tag"?String(e.category??0):e.kind}"></span>
          <span class="complete-label">${e.label}</span>
          ${e.detail?r`<span class="complete-detail">${e.detail}</span>`:d}
          <span class="complete-count">${ll(e.count)}</span>
        </button>`)}
      <div class="complete-hint">↑ ↓ choose · Tab or Enter inserts · Esc closes</div>
    </div>`:d}async applyOutfitCutout(){var s;const e=this.exportCanvas(),t=(s=this.cutout)==null?void 0:s.outfitShotId,i=this.shots.find(a=>a.id===t);if(!(!e||!t||!i||this.cutoutBusy)){this.cutoutBusy=!0;try{const a=e.toDataURL("image/png"),o=i.wipOutfitId||await this.ensureWardrobe();if(await m.putLibbyOutfitWip(o,i.outfitSlot.emotion,i.outfitSlot.tier,{imageData:a,filename:i.outfitFilename,seed:i.seed,reviewed:!0,config:i.outfitConfig,info:i.info}),!t.startsWith("wip-"))try{await m.replaceGenPreview(t,a)}catch{}const n=Date.now();this.shots=this.shots.map(l=>l.id===t?{...l,cutoutReviewed:!0,previewVersion:n,wipOutfitId:o}:l),this.persistDraft(),this.showToast("Reviewed cutout applied to this outfit state."),this.closeCutout(),this.fileSpriteToWardrobe(t,e,o)}catch(a){this.cutoutError=a.message}finally{this.cutoutBusy=!1}}}async fileSpriteToWardrobe(e,t,i){var o,n,l;const s=i||this.outfitWardrobeId;if(!s)return;const a=(o=this.shots.find(p=>p.id===e))==null?void 0:o.outfitSlot;if(a)try{await m.setLibbyEmotion(s,a.emotion,t.toDataURL("image/png"),a.tier),this.wardrobes=await m.libbyOutfits().then(u=>u.outfits),(n=this.renderRoot.querySelector("oppai-outfit-wardrobe"))==null||n.refresh();const p=((l=this.wardrobes.find(u=>u.id===s))==null?void 0:l.name)??"the wardrobe";this.showToast(`Filed ${a.tierLabel} · ${a.emotionLabel} into ${p}.`)}catch(p){this.showToast(`Saved the cutout, but filing it failed: ${p.message}`)}}async loadStudio(){if(!this.studioLoaded){this.studioLoaded=!0;try{const[e,t]=await Promise.all([m.libbyLoadouts(),m.libbyOutfits()]);if(this.loadouts=e.loadouts,this.wardrobes=t.outfits,this.outfitWardrobeId&&!this.wardrobes.some(i=>i.id===this.outfitWardrobeId)&&(this.outfitWardrobeId=""),this.outfitLoadoutId&&!this.loadouts.some(i=>i.id===this.outfitLoadoutId)&&(this.outfitLoadoutId=""),!this.outfitWardrobeId){const i=[...this.wardrobes].sort((s,a)=>(a.wip??0)-(s.wip??0))[0];i!=null&&i.wip&&(this.outfitWardrobeId=i.id)}await this.loadWipBoard(this.outfitWardrobeId)}catch(e){this.showToast(`Couldn't load your saved outfits: ${e.message}`),this.studioLoaded=!1}}}loadoutBody(){return{version:1,gear:this.outfitGear,theme:this.outfitText.trim(),background:this.outfitBackground,underwearColor:this.outfitUnderwearColor,pubicHair:this.outfitPubicHair,pubicHairColor:this.outfitPubicHairColor,lockColors:this.outfitLockColors,shot:this.camera.shot}}applyLoadout(e){const t=e.loadout??{},i=(a,o)=>typeof t[a]=="string"?t[a]:o;this.outfitGear=Gi(t.gear),this.outfitText=i("theme",e.name),this.outfitBackground=t.background==="black"?"black":"white",this.outfitUnderwearColor=i("underwearColor",this.outfitUnderwearColor),this.outfitPubicHair=t.pubicHair===!0,this.outfitPubicHairColor=i("pubicHairColor",this.outfitPubicHairColor),this.outfitLockColors=t.lockColors!==!1;const s=i("shot","");s&&Dt.shots.some(a=>a.id===s)&&this.editCamera({shot:s}),this.outfitLoadoutId=e.id,this.outfitOn=!0,this.persistDraft(),this.showToast(`Equipped “${e.name}”.`)}async saveLoadout(e){var o;if(this.loadoutBusy)return;const t=this.outfitText.trim(),i=this.loadouts.find(n=>n.id===this.outfitLoadoutId),s=e?t:(i==null?void 0:i.name)??t,a=(o=window.prompt("Name this loadout",s||"New loadout"))==null?void 0:o.trim();if(a){this.loadoutBusy=!0;try{const n=await m.saveLibbyLoadout({id:e?void 0:this.outfitLoadoutId||void 0,name:a,loadout:this.loadoutBody()});this.outfitLoadoutId=n.id,this.loadouts=(await m.libbyLoadouts()).loadouts,this.persistDraft(),this.showToast(`Saved “${n.name}”.`)}catch(n){this.showToast(n.message)}finally{this.loadoutBusy=!1}}}async deleteLoadout(e){if(!(this.loadoutBusy||!window.confirm(`Delete the loadout “${e.name}”?`))){this.loadoutBusy=!0;try{await m.deleteLibbyLoadout(e.id),this.loadouts=this.loadouts.filter(t=>t.id!==e.id),this.outfitLoadoutId===e.id&&(this.outfitLoadoutId=""),this.showToast(`Deleted “${e.name}”.`)}catch(t){this.showToast(t.message)}finally{this.loadoutBusy=!1}}}async setLoadoutCoverFromSelection(){const e=this.loadouts.find(i=>i.id===this.outfitLoadoutId);if(!e||this.loadoutBusy)return;const t=this.shotAt(this.outfitSlot().slot)??this.currentOutfitShots()[0];if(!t){this.showToast("Generate a square first — its picture becomes the cover.");return}this.loadoutBusy=!0;try{const i=await fetch(this.previewURL(t),{credentials:"same-origin"});if(!i.ok)throw new Error(`preview returned ${i.status}`);const s=await at(await i.blob());await m.setLibbyLoadoutThumb(e.id,s),this.loadoutCoverVersion=Date.now(),this.loadouts=(await m.libbyLoadouts()).loadouts,this.showToast("Cover updated.")}catch(i){this.showToast(i.message)}finally{this.loadoutBusy=!1}}async createWardrobe(){var t;const e=(t=window.prompt("Name the wardrobe these sprites go into",this.outfitText.trim()||"New wardrobe"))==null?void 0:t.trim();if(e)try{const i=await m.saveLibbyOutfit({name:e});this.wardrobes=(await m.libbyOutfits()).outfits,this.outfitWardrobeId=i.id,this.persistDraft(),await this.loadWipBoard(i.id),this.showToast(`Squares will be kept in “${i.name}”.`)}catch(i){this.showToast(i.message)}}promptArea(e){return this.renderRoot.querySelector(e==="prompt"?".prompt-area":".negative-area")}onPromptTyping(e){var n;const t=this.promptArea(e);if(!t)return;const i=il(t.value,t.selectionStart??t.value.length),s=++this.completionSeq;if(window.clearTimeout(this.completionTimer),this.completionField=e,this.completionToken=i,!i){this.closeCompletions();return}const a={loras:(((n=this.status)==null?void 0:n.loras)??[]).map(l=>({name:l.name,alias:l.alias,weight:l.weight})),wildcards:this.wildcards.map(l=>({name:l.name,lines:l.entries.length})),triggers:e==="prompt"?this.activeTriggerPhrases():[]},o=ol(i,a);if(i.mode!=="tag"||i.query.length<2){this.showCompletions(o);return}o.length&&this.showCompletions(o),this.completionTimer=window.setTimeout(async()=>{try{const l=await m.booruTags(i.query,10);if(s!==this.completionSeq)return;const u=(l.items??l.suggestions.map(h=>({tag:h,category:0,count:0}))).map(h=>({kind:"tag",label:h.tag,insert:Ms(h.tag),category:h.category,count:h.count,detail:"alias"in h&&h.alias?`“${h.alias}”`:void 0}));!u.length&&l.correction&&u.push({kind:"tag",label:l.correction,insert:Ms(l.correction),detail:"did you mean"}),this.showCompletions(nl(o,u,10))}catch{s===this.completionSeq&&this.showCompletions(o)}},110)}showCompletions(e){const t=this.completionToken,i=this.promptArea(this.completionField),s=t&&i?i.value.slice(t.start,t.end).trim().toLowerCase():"";e.length===1&&e[0].insert.toLowerCase()===s&&(e=[]),this.completions=e,this.completionIndex=e.length?0:-1}closeCompletions(){this.completionSeq++,window.clearTimeout(this.completionTimer),this.completions=[],this.completionIndex=-1}closeCompletionsSoon(){window.setTimeout(()=>{this.renderRoot.activeElement!==this.promptArea(this.completionField)&&this.closeCompletions()},120)}onPromptKey(e,t){if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault(),this.closeCompletions(),e.shiftKey?this.enqueue():!this.generating&&this.assemblePrompts().prompt.trim()&&this.generate();return}if(!(!this.completions.length||this.completionField!==t))switch(e.key){case"ArrowDown":case"ArrowUp":e.preventDefault(),this.completionIndex=pl(this.completionIndex,this.completions.length,e.key==="ArrowDown"?1:-1);break;case"Tab":case"Enter":if(e.shiftKey||e.altKey||this.completionIndex<0)return;e.preventDefault(),this.acceptCompletion(this.completionIndex);break;case"Escape":e.preventDefault(),e.stopPropagation(),this.closeCompletions();break}}async acceptCompletion(e){var n;const t=this.completions[e],i=this.completionToken,s=this.completionField,a=this.promptArea(s);if(!t||!i||!a)return;let o=Is(a.value,i,t.insert);if(t.kind==="lora"){const l=((n=/^<lora:(.*):[^:]*>$/.exec(t.insert))==null?void 0:n[1])??"";o=Is(a.value,i,""),l&&!(l in this.selectedLoras)&&this.toggleLora(l),this.showToast(`${t.label} is on — its weight is in the recipe above`)}s==="prompt"?this.prompt=o.text:this.negative=o.text,this.closeCompletions(),await this.updateComplete,a.value=o.text,a.focus(),a.setSelectionRange(o.caret,o.caret)}renderPromptOptions(){return r`
      ${this.renderSizePreview()}
      <div>
        <label class="field">Resolution</label>
        <div class="chips">
          ${wi.map(e=>{const t=e.w===this.width&&e.h===this.height,i=14/Math.max(e.w,e.h),s={width:Math.round(e.w*i),height:Math.round(e.h*i)};return r`<button
              class="chip ${t?"on":""}"
              @click=${()=>{this.width=e.w,this.height=e.h}}
            ><span class="size-glyph" style="width:${s.width}px;height:${s.height}px"></span>${e.label}<span class="hint">${e.hint}</span></button>`})}
        </div>
      </div>
      <div class="custom-size">
        <div>
          <label class="field">Width</label>
          <input class="num" type="number" min="64" max="2048" step="8" .value=${String(this.width)}
            @input=${e=>this.width=Ee(e.target.value,64,2048,512)} />
        </div>
        <span class="material-symbols-rounded" style="margin-top:22px; color:var(--oppai-text-muted);">close</span>
        <div>
          <label class="field">Height</label>
          <input class="num" type="number" min="64" max="2048" step="8" .value=${String(this.height)}
            @input=${e=>this.height=Ee(e.target.value,64,2048,768)} />
        </div>
      </div>
    `}renderSizePreview(){const t=ds(this.width,this.height,132),{ratio:i,name:s}=Lr(this.width,this.height),a=this.canUpscale&&this.hiresEnabled&&!this.source?xt(this.width,this.height,ii(this.width,this.height,this.hiresScale)):null,o=a?ds(a.width,a.height,132):null,n=this.shots[0];return r`<div class="size-preview">
      <div class="size-stage" style="width:${132}px;height:${132}px">
        ${o?r`<span class="size-hires" style="width:${o.width}px;height:${o.height}px"
          title="After the hires fix: ${a.width}×${a.height}"></span>`:d}
        <span class="size-frame" style="width:${t.width}px;height:${t.height}px">
          ${n?r`<img src=${this.previewURL(n)} alt="" />`:d}
        </span>
      </div>
      <div class="size-facts">
        <b>${this.width} × ${this.height}</b>
        <span>${i}${s?r` · ${s}`:d}</span>
        <span>${Mr(this.width,this.height)}</span>
        ${a?r`<span class="size-hires-note">hires → ${a.width} × ${a.height}</span>`:d}
      </div>
    </div>`}renderGenInfo(e){const t=e.info;return t?r`
      <div class="geninfo">
        <pre class="geninfo-text">${Ne(t)}</pre>
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
      </div>`}clearWorkspace(){!this.history.length||!confirm("Clear this session's pictures off the stage? They stay in the gallery; unsaved ones are still there until the gallery is tidied.")||(this.shots=[],V.history=[],Be(),this.viewing=null,this.compareWith=null,this.expandedShot=null,this.infoFor=null,this.outfitProgress="",this.persistDraft())}async deleteOutfitSquare(e){const t=e.outfitSlot;if(t&&confirm(`Delete the ${t.tierLabel} · ${t.emotionLabel} square? It will need generating again.`))try{e.wipOutfitId&&await m.deleteLibbyOutfitWip(e.wipOutfitId,t.emotion,t.tier),e.id.startsWith("wip-")||await m.deleteGenPreview(e.id).catch(()=>{}),this.shots=this.shots.filter(i=>i.id!==e.id),this.persistDraft(),this.showToast(`Deleted ${t.tierLabel} · ${t.emotionLabel}.`)}catch(i){this.showToast(i.message)}}get viewedShot(){return this.history.find(e=>e.id===this.viewing)??this.history[0]}stepViewer(e){var t;this.viewing=Ht(this.history,((t=this.viewedShot)==null?void 0:t.id)??null,e),this.infoFor=null}toggleCompare(){if(this.compareWith){this.compareWith=null;return}const e=this.viewedShot;if(!e||this.history.length<2){this.showToast("Make another picture first — there is nothing to compare this one with");return}const t=Ht(this.history,e.id,1);this.compareWith=t&&t!==e.id?t:Ht(this.history,e.id,-1),this.compareSplit=50}pickFromStrip(e,t){var i;if(t.shiftKey||t.altKey){if(e.id===((i=this.viewedShot)==null?void 0:i.id))return;this.compareWith=this.compareWith===e.id?null:e.id,this.compareSplit=50;return}this.compareWith===e.id&&(this.compareWith=null),this.viewing=e.id,this.infoFor=null}renderViewer(){var o;const e=this.history;if(!e.length&&this.regionsActive)return r`<div class="people-empty">
        <span class="hint">${this.regionPeople.length} people, ${this.regionsRows?"stacked":"side by side"}. Drag a LoRA from the
          LoRAs tab onto a person to put it on them alone.</span>
        ${this.renderPeopleFrame(!1)}
      </div>`;const t=this.viewedShot;if(!t){const n=((o=this.status)==null?void 0:o.backend)==="invokeai"?"Invoke":"Generate";return r`<div class="canvas-empty welcome">
        <span class="welcome-glyph"><span class="material-symbols-rounded">auto_awesome</span></span>
        <strong>What are we making?</strong>
        <span>Write a prompt below and press ${n} — or Ctrl+Enter from the prompt.</span>
        <div class="welcome-tips">
          <span><span class="material-symbols-rounded">add_photo_alternate</span>Drop a gallery picture here to start from it</span>
          <span><span class="material-symbols-rounded">queue</span>Queue the next idea while one draws</span>
          <span><span class="material-symbols-rounded">compare</span>Compare two takes with C</span>
        </div>
        ${this.recentPrompts.length?r`<div class="welcome-recent">
          <span class="welcome-k">Pick up a recent prompt</span>
          ${this.recentPrompts.slice(0,3).map(l=>r`<button class="recent-line" title=${l.prompt} @click=${()=>this.useRecentPrompt(l)}>
            <span class="material-symbols-rounded">history</span><span>${l.prompt}</span></button>`)}
        </div>`:d}
      </div>`}const i=this.compareWith?e.find(n=>n.id===this.compareWith):void 0;if(i&&i.id!==t.id)return this.renderCompare(t,i);const s=e.indexOf(t),a=t.info;return r`<div class="viewer">
      <button class="view-nav prev" ?disabled=${s<=0} title="Newer (←)" aria-label="Newer picture" @click=${()=>this.stepViewer(-1)}>
        <span class="material-symbols-rounded">chevron_left</span></button>
      <figure class="view-frame">
        <img class="view-img" src=${this.previewURL(t)} alt="Generated image" title="Expand"
          @click=${()=>this.expandedShot=t} @contextmenu=${n=>this.openShotMenu(t,n)} />
        <figcaption class="view-cap">
          <span>${s+1} of ${e.length}</span>
          <span><span class="material-symbols-rounded">casino</span>${t.seed}</span>
          ${a?r`<span>${a.width}×${a.height}</span>`:d}
          ${a!=null&&a.seconds?r`<span>${a.seconds.toFixed(1)}s</span>`:d}
          ${t.saved?r`<span class="cap-saved"><span class="material-symbols-rounded">check</span>In the library</span>`:d}
        </figcaption>
      </figure>
      <button class="view-nav next" ?disabled=${s>=e.length-1} title="Older (→)" aria-label="Older picture" @click=${()=>this.stepViewer(1)}>
        <span class="material-symbols-rounded">chevron_right</span></button>
      ${this.renderViewBar(t)}
      ${this.infoFor===t.id?r`<div class="view-info">${this.renderGenInfo(t)}</div>`:d}
    </div>`}renderViewBar(e){var o,n,l,p,u;const t=((o=this.status)==null?void 0:o.backend)!=="invokeai",i=this.previewURL(e),s=`seed ${e.seed}`,a=(h,g,w,x=!1)=>r`<button class="vb ${x?"on":""}" title=${g} aria-label=${g} @click=${w}>
      <span class="material-symbols-rounded">${h}</span></button>`;return r`<div class="view-bar">
      <button class="vb save ${e.saved?"done":""}" ?disabled=${e.saved} title="Keep this picture in the library (S)" @click=${()=>void this.save(e)}>
        <span class="material-symbols-rounded">${e.saved?"check":"save"}</span>${e.saved?"Saved":"Save"}
      </button>
      <span class="vb-sep"></span>
      ${a("add_photo_alternate","Start the next picture from this one",()=>void this.usePicture(i,s,"img2img",!1,e.gallery))}
      ${t?a("brush","Paint over a part to redo it",()=>void this.usePicture(i,s,"inpaint",!1,e.gallery)):d}
      ${t&&((n=this.status)!=null&&n.detailerAvailable)?a("face_retouching_natural",Je(this.detailerPasses),()=>void this.usePicture(i,s,"faces",!1,e.gallery)):d}
      ${this.canUpscale?a("open_in_full",`Upscale ${this.upscaleBy}×`,()=>void this.usePicture(i,s,"upscale",!1,e.gallery,e.info)):d}
      ${(p=(l=this.status)==null?void 0:l.clips)!=null&&p.image?a("animation","Animate it in the Video studio",()=>void this.usePicture(i,s,"animate",!1,e.gallery)):d}
      ${a("background_replace","Cut the background out",()=>void this.openCutout(i,`seed-${e.seed}`))}
      <span class="vb-sep"></span>
      ${a("compare",this.compareWith?"Stop comparing (C)":"Compare with the picture beside it (C) — or Shift-click one in the strip",()=>this.toggleCompare(),!!this.compareWith)}
      ${a("data_object","Generation data",()=>this.infoFor=this.infoFor===e.id?null:e.id,this.infoFor===e.id)}
      ${a("download","Export a PNG with Civitai-compatible metadata",()=>void this.exportShot(e))}
      ${(u=this.status)!=null&&u.manageModels?a("photo_camera","Use as this model's cover",()=>void this.useAsModelThumb(e)):d}
      <button class="vb" title="More" aria-label="More" @click=${h=>{const g=h.currentTarget.getBoundingClientRect();this.openShotMenu(e,new MouseEvent("contextmenu",{clientX:g.left,clientY:g.top}))}}><span class="material-symbols-rounded">more_horiz</span></button>
    </div>`}renderCompare(e,t){const i=s=>{const n=s.currentTarget.querySelector(".cmp-b").getBoundingClientRect();this.compareSplit=Math.max(0,Math.min(100,(s.clientX-n.left)/n.width*100))};return r`<div class="viewer compare">
      <figure class="view-frame cmp-frame" style=${`--split:${this.compareSplit}%`}
        @pointerdown=${s=>{s.currentTarget.setPointerCapture(s.pointerId),i(s)}}
        @pointermove=${s=>{s.currentTarget.hasPointerCapture(s.pointerId)&&i(s)}}>
        <img class="view-img cmp-b" src=${this.previewURL(t)} alt="Compared picture" draggable="false" />
        <img class="view-img cmp-a" src=${this.previewURL(e)} alt="Picture on the stage" draggable="false" />
        <span class="cmp-line"><span class="cmp-knob"><span class="material-symbols-rounded">swap_horiz</span></span></span>
        <span class="cmp-tag left">A · ${e.seed}</span>
        <span class="cmp-tag right">B · ${t.seed}</span>
      </figure>
      <div class="view-bar">
        <span class="vb-note">Drag across the picture</span>
        <button class="vb" title="Swap the two" aria-label="Swap" @click=${()=>{this.viewing=t.id,this.compareWith=e.id}}>
          <span class="material-symbols-rounded">swap_horiz</span></button>
        <button class="vb save" @click=${()=>this.compareWith=null}><span class="material-symbols-rounded">close</span>Done</button>
      </div>
    </div>`}renderSessionStrip(){var i;if(!this.history.length&&!this.generating&&!this.queue.length)return d;const e=(i=this.viewedShot)==null?void 0:i.id,t=this.progress;return r`<div class="session-strip">
      <span class="strip-label">This session<b>${this.history.length}</b></span>
      <div class="strip-scroll" role="listbox" aria-label="Pictures this session">
        ${this.queue.length?r`<button class="strip-q" title="Runs waiting their turn" @click=${()=>this.queueOpen=!0}>
          <span class="material-symbols-rounded">queue</span>${this.queue.length}</button>`:d}
        ${this.generating?r`<div class="strip-live" title="Drawing now">
          ${t!=null&&t.image?r`<img src=${t.image} alt="" />`:d}
          <span>${t!=null&&t.total?`${Math.round(Math.max(0,Math.min(1,t.percent))*100)}%`:"…"}</span>
        </div>`:d}
        ${this.history.map(s=>{const a=this.previewURL(s);return r`<button class="strip-thumb ${s.id===e?"on":""} ${s.id===this.compareWith?"cmp":""}" role="option"
            aria-selected=${s.id===e?"true":"false"} title=${`Seed ${s.seed} — Shift-click to compare`}
            @click=${o=>this.pickFromStrip(s,o)}>
            ${this.failedThumbs.has(a)?r`<span class="strip-gone" title="This preview has expired — it is still in the gallery"><span class="material-symbols-rounded">hourglass_empty</span></span>`:r`<img src=${a} alt="" loading="lazy" @error=${()=>this.failedThumbs=new Set(this.failedThumbs).add(a)} />`}
            ${s.saved?r`<span class="strip-saved"><span class="material-symbols-rounded">check</span></span>`:d}
            ${s.id===this.compareWith?r`<span class="strip-b">B</span>`:d}
          </button>`})}
      </div>
      ${this.history.length?r`<button class="strip-clear" title="Clear the session off the stage" aria-label="Clear the session" @click=${()=>this.clearWorkspace()}>
        <span class="material-symbols-rounded">delete_sweep</span></button>`:d}
    </div>`}useRecentPrompt(e){this.prompt=e.prompt,this.negative=e.negative,this.templateId="",this.selectedTriggers=[],this.promptsOpen=!1,this.updateComplete.then(()=>{var t;return(t=this.renderRoot.querySelector(".prompt-area"))==null?void 0:t.focus()})}renderRecentPrompts(){return r`<div class="pop prompts-pop" role="dialog" aria-label="Recent prompts">
      <div class="pop-head">
        <span class="material-symbols-rounded">history</span>Recent prompts
        <span class="pop-note">On this device</span>
        <button class="pop-x" aria-label="Close" @click=${()=>this.promptsOpen=!1}><span class="material-symbols-rounded">close</span></button>
      </div>
      ${this.recentPrompts.length?r`<div class="recent-list">${this.recentPrompts.map(e=>r`<button class="recent-row" @click=${()=>this.useRecentPrompt(e)}>
            <span class="recent-text">${e.prompt}</span>
            ${e.negative?r`<span class="recent-neg">− ${e.negative}</span>`:d}
            <span class="recent-when">${new Date(e.at).toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
          </button>`)}</div>`:r`<p class="pop-empty">Every prompt you generate with is remembered here, so a good one edited into a bad one is a click away.</p>`}
    </div>`}};f.styles=[ue,Oe,re`
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
      /* The select fills the button invisibly, so a tap anywhere on it opens the menu. */
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
      .size-preview { display: flex; gap: 14px; align-items: center; margin-bottom: 12px; }
      .size-stage {
        position: relative; flex: none; display: grid; place-items: center; border-radius: 12px;
        background: repeating-conic-gradient(var(--oppai-surface-2) 0% 25%, transparent 0% 50%) 50% / 12px 12px;
      }
      .size-stage > span { grid-area: 1 / 1; box-sizing: border-box; border-radius: 4px; }
      .size-frame {
        position: relative; overflow: hidden; background: color-mix(in srgb, var(--oppai-primary) 22%, var(--oppai-surface));
        border: 2px solid var(--oppai-primary); transition: width 0.18s ease, height 0.18s ease;
      }
      .size-frame img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.85; }
      .size-hires { border: 1.5px dashed var(--oppai-text-dim); transition: width 0.18s ease, height 0.18s ease; }
      .size-facts { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--oppai-text-dim); min-width: 0; }
      .size-facts b { font-size: 15px; color: var(--oppai-text); font-variant-numeric: tabular-nums; }
      .size-hires-note { color: var(--oppai-text); }
      .size-glyph {
        display: inline-block; border: 1.5px solid currentColor; border-radius: 2px; margin-right: 6px;
        vertical-align: middle; box-sizing: border-box; opacity: 0.8;
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
      .source-bar {
        display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 8px 10px;
        border-radius: 12px; border: 1px solid var(--oppai-border-strong);
        background: color-mix(in srgb, var(--oppai-primary) 10%, var(--oppai-surface-2));
        font-size: 12.5px; color: var(--oppai-text-dim); flex-wrap: wrap;
      }
      .source-bar > img { width: 52px; height: 52px; object-fit: cover; border-radius: 8px; flex: none; }
      .source-copy { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 3px; }
      .source-copy strong { color: var(--oppai-text); overflow-wrap: anywhere; }
      .source-strength { display: inline-flex; align-items: center; gap: 6px; }
      .source-strength input { width: 140px; }
      .source-strength b { color: var(--oppai-text); font-weight: 600; min-width: 3ch; }
      .source-hint { font-size: 11.5px; }
      .source-acts { display: flex; gap: 6px; flex-wrap: wrap; }
      .source-acts .chip { display: inline-flex; align-items: center; gap: 4px; }

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

    `,Cr];f.DRAFT_FIELDS=new Set(["prompt","negative","checkpoint","vae","templateId","scheduler","width","height","steps","cfg","cfgRescale","clipSkip","seamlessX","seamlessY","vaePrecision","cpuNoise","count","seed","board","selectedLoras","selectedTriggers","selectedChars","selectedPoses","outfitOn","outfitText","outfitGear","outfitFace","outfitMisc","outfitMiscBatch","outfitTier","outfitBackground","outfitLockColors","outfitLoadoutId","outfitWardrobeId","sheetZoom","outfitUnderwearColor","outfitPubicHair","outfitPubicHairColor","camera","detailerEnabled","detailerModel","detailerPrompt","detailerNegative","detailerConfidence","detailerDenoise","detailerMaskBlur","detailerFaces","detailerHands","detailerCustom","regionsOn","regionsRows","regionPeople","hiresEnabled","hiresUpscaler","hiresScale","hiresDenoise","hiresSteps","upscaleUpscaler","upscaleBy","showOptions","shots"]);b([z({type:Boolean})],f.prototype,"studio",2);b([c()],f.prototype,"status",2);b([c()],f.prototype,"checkpoint",2);b([c()],f.prototype,"vae",2);b([c()],f.prototype,"templateId",2);b([c()],f.prototype,"showBuiltInTemplates",2);b([c()],f.prototype,"selectedLoras",2);b([c()],f.prototype,"selectedTriggers",2);b([c()],f.prototype,"outfitOn",2);b([c()],f.prototype,"outfitText",2);b([c()],f.prototype,"outfitGear",2);b([c()],f.prototype,"outfitFace",2);b([c()],f.prototype,"outfitMisc",2);b([c()],f.prototype,"outfitMiscBatch",2);b([c()],f.prototype,"outfitTier",2);b([c()],f.prototype,"outfitBackground",2);b([c()],f.prototype,"outfitUnderwearColor",2);b([c()],f.prototype,"outfitPubicHair",2);b([c()],f.prototype,"outfitPubicHairColor",2);b([c()],f.prototype,"outfitLockColors",2);b([c()],f.prototype,"gearPromptOpen",2);b([c()],f.prototype,"outfitBatchRunning",2);b([c()],f.prototype,"outfitExporting",2);b([c()],f.prototype,"outfitProgress",2);b([c()],f.prototype,"loadouts",2);b([c()],f.prototype,"outfitLoadoutId",2);b([c()],f.prototype,"loadoutBusy",2);b([c()],f.prototype,"loadoutCoverVersion",2);b([c()],f.prototype,"wardrobes",2);b([c()],f.prototype,"outfitWardrobeId",2);b([c()],f.prototype,"studioView",2);b([c()],f.prototype,"sheetTab",2);b([c()],f.prototype,"sheetZoom",2);b([c()],f.prototype,"showSquarePrompt",2);b([c()],f.prototype,"camera",2);b([c()],f.prototype,"cutout",2);b([c()],f.prototype,"cutoutTolerance",2);b([c()],f.prototype,"cutoutBusy",2);b([c()],f.prototype,"cutoutError",2);b([Pt(".cutout-canvas")],f.prototype,"cutoutHost",2);b([c()],f.prototype,"cutoutTool",2);b([c()],f.prototype,"cutoutFeather",2);b([c()],f.prototype,"cutoutSpill",2);b([c()],f.prototype,"cutoutZoom",2);b([c()],f.prototype,"cutoutContrast",2);b([c()],f.prototype,"contiguous",2);b([c()],f.prototype,"brushSize",2);b([c()],f.prototype,"showOriginal",2);b([c()],f.prototype,"canUndo",2);b([c()],f.prototype,"canRedo",2);b([c()],f.prototype,"cutFraction",2);b([c()],f.prototype,"characters",2);b([c()],f.prototype,"selectedChars",2);b([c()],f.prototype,"charDraft",2);b([c()],f.prototype,"charBusy",2);b([c()],f.prototype,"scanBusy",2);b([c()],f.prototype,"poses",2);b([c()],f.prototype,"selectedPoses",2);b([c()],f.prototype,"poseDraft",2);b([c()],f.prototype,"poseBusy",2);b([c()],f.prototype,"wildcards",2);b([c()],f.prototype,"wildcardDraft",2);b([c()],f.prototype,"wildcardBusy",2);b([z({type:Number})],f.prototype,"editMedia",2);b([c()],f.prototype,"editing",2);b([c()],f.prototype,"source",2);b([c()],f.prototype,"sourceDenoise",2);b([c()],f.prototype,"paintOpen",2);b([Pt("input.source-file")],f.prototype,"sourceFile",2);b([c()],f.prototype,"speech",2);b([c()],f.prototype,"listening",2);b([c()],f.prototype,"optimizing",2);b([c()],f.prototype,"prompt",2);b([c()],f.prototype,"completions",2);b([c()],f.prototype,"completionIndex",2);b([c()],f.prototype,"completionField",2);b([c()],f.prototype,"createTab",2);b([c()],f.prototype,"mode",2);b([c()],f.prototype,"sidePanel",2);b([c()],f.prototype,"history",2);b([c()],f.prototype,"viewing",2);b([c()],f.prototype,"compareWith",2);b([c()],f.prototype,"compareSplit",2);b([c()],f.prototype,"queue",2);b([c()],f.prototype,"queueOpen",2);b([c()],f.prototype,"recentPrompts",2);b([c()],f.prototype,"promptsOpen",2);b([c()],f.prototype,"shortcutsOpen",2);b([c()],f.prototype,"stageDrop",2);b([c()],f.prototype,"spriteTab",2);b([c()],f.prototype,"spriteInspector",2);b([c()],f.prototype,"boardFilter",2);b([c()],f.prototype,"focusView",2);b([c()],f.prototype,"flipping",2);b([c()],f.prototype,"flipFace",2);b([c()],f.prototype,"pickerFilter",2);b([c()],f.prototype,"negative",2);b([c()],f.prototype,"showOptions",2);b([c()],f.prototype,"width",2);b([c()],f.prototype,"height",2);b([c()],f.prototype,"steps",2);b([c()],f.prototype,"cfg",2);b([c()],f.prototype,"cfgRescale",2);b([c()],f.prototype,"clipSkip",2);b([c()],f.prototype,"seamlessX",2);b([c()],f.prototype,"seamlessY",2);b([c()],f.prototype,"vaePrecision",2);b([c()],f.prototype,"cpuNoise",2);b([c()],f.prototype,"board",2);b([c()],f.prototype,"scheduler",2);b([c()],f.prototype,"count",2);b([c()],f.prototype,"seed",2);b([c()],f.prototype,"detailerEnabled",2);b([c()],f.prototype,"detailerModel",2);b([c()],f.prototype,"detailerPrompt",2);b([c()],f.prototype,"detailerNegative",2);b([c()],f.prototype,"detailerConfidence",2);b([c()],f.prototype,"detailerDenoise",2);b([c()],f.prototype,"detailerMaskBlur",2);b([c()],f.prototype,"detailerFaces",2);b([c()],f.prototype,"detailerHands",2);b([c()],f.prototype,"detailerCustom",2);b([c()],f.prototype,"regionsOn",2);b([c()],f.prototype,"regionsRows",2);b([c()],f.prototype,"regionPeople",2);b([c()],f.prototype,"hiresEnabled",2);b([c()],f.prototype,"hiresUpscaler",2);b([c()],f.prototype,"hiresScale",2);b([c()],f.prototype,"hiresDenoise",2);b([c()],f.prototype,"hiresSteps",2);b([c()],f.prototype,"upscaleUpscaler",2);b([c()],f.prototype,"upscaleBy",2);b([c()],f.prototype,"generating",2);b([c()],f.prototype,"progress",2);b([c()],f.prototype,"shots",2);b([c()],f.prototype,"restoredNotice",2);b([c()],f.prototype,"infoFor",2);b([c()],f.prototype,"error",2);b([c()],f.prototype,"toast",2);b([c()],f.prototype,"thumbVersion",2);b([c()],f.prototype,"failedThumbs",2);b([c()],f.prototype,"expandedShot",2);b([c()],f.prototype,"metaDraft",2);b([c()],f.prototype,"metaBusy",2);b([c()],f.prototype,"metaTriggerText",2);b([c()],f.prototype,"civitaiOpen",2);b([c()],f.prototype,"civitaiMode",2);b([c()],f.prototype,"loraDrag",2);b([c()],f.prototype,"loraOver",2);b([c()],f.prototype,"renamingLoras",2);b([c()],f.prototype,"restarting",2);b([c()],f.prototype,"trainOpen",2);b([Pt("oppai-invoke-gallery")],f.prototype,"galleryPanel",2);f=b([ge("oppai-imagegen")],f);function at(e){return new Promise((t,i)=>{const s=new FileReader;s.onload=()=>t(String(s.result)),s.onerror=()=>i(new Error("couldn't read the image")),s.readAsDataURL(e)})}export{f as OppaiImageGen};
