import{M as gt,i as mt,u as d,a as ft,Q as ue,e as u,m as I,R as Nt,A as c,b as o,S as ge,l as it,t as bt,q as Rt,B as me,T as Tt,U as fe,V as be,W as ve,X as ye,Y as xe,O as we,N as ae}from"./index-DufD-B2G.js";import{e as oe}from"./query-__j_ZMY6.js";function re(t){return t.faces*t.tiers}function $e(t,e){const i=re(e);if(t>=i){const a=Math.min(t-i,e.miscIds.length-1);return{tier:0,face:0,misc:e.miscIds[Math.max(0,a)]??""}}const s=Math.max(0,Math.min(t,i-1));return{tier:Math.floor(s/e.faces),face:s%e.faces,misc:""}}function ke(t,e,i,s){const a=i?s.miscIds.indexOf(i):-1;return a>=0?re(s)+a:e+t*s.faces}function _(t){return`${t.emotion}:${t.tier}`}function q(t,e,i,s){if(t.trim()==="")return s;const a=Number(t);return Number.isFinite(a)?Math.min(i,Math.max(e,Math.round(a))):s}function ot(t,e,i,s){if(t.trim()==="")return s;const a=Number(t);return Number.isFinite(a)?Math.min(i,Math.max(e,a)):s}function Se(t,e){var i,s;return{prompt:t.prompt,negativePrompt:t.negativePrompt??"",model:t.checkpoint??"",modelHash:e.modelHash||void 0,vae:t.vae??"",vaePrecision:t.vaePrecision??"fp32",sampler:t.sampler??"",seed:e.seed,steps:t.steps??0,cfgScale:t.cfgScale??0,cfgRescale:t.cfgRescale??0,clipSkip:t.clipSkip??0,width:t.width??0,height:t.height??0,seamlessX:!!t.seamlessX,seamlessY:!!t.seamlessY,cpuNoise:t.cpuNoise!==!1,loras:(t.loras??[]).map(a=>{var r;return{name:a.name,weight:a.weight,hash:((r=e.loraHashes)==null?void 0:r[a.name])||void 0}}),triggers:e.triggers??[],characters:e.characters??[],poses:(i=e.poses)!=null&&i.length?e.poses:void 0,outfit:e.outfit||void 0,controlImage:e.controlImage||void 0,refiner:(s=t.detailer)!=null&&s.enabled?{model:t.detailer.model??"",prompt:t.detailer.prompt??"",negativePrompt:t.detailer.negativePrompt??"",confidence:t.detailer.confidence??0,denoise:t.detailer.denoise??0,maskBlur:t.detailer.maskBlur??0}:void 0,board:t.board&&t.board!=="none"?t.board:void 0,backend:e.backend,seconds:e.seconds,at:Date.now()}}function V(t){const e=t.loras.filter(n=>!t.prompt.includes(`<lora:${n.name}:`)).map(n=>`<lora:${n.name}:${n.weight}>`).join(" "),s=[[t.prompt,e].filter(Boolean).join(" ")];t.negativePrompt&&s.push(`Negative prompt: ${t.negativePrompt}`);const a=[`Steps: ${t.steps}`,`Sampler: ${t.sampler||"default"}`,`CFG scale: ${t.cfgScale}`,`Seed: ${t.seed}`,`Size: ${t.width}x${t.height}`];t.model&&a.push(`Model: ${t.model}`),t.modelHash&&a.push(`Model hash: ${t.modelHash}`),t.vae&&a.push(`VAE: ${t.vae}`),t.clipSkip>0&&a.push(`Clip skip: ${t.clipSkip}`),t.cfgRescale>0&&a.push(`CFG Rescale: ${t.cfgRescale}`);const r=t.loras.filter(n=>n.hash);return r.length&&a.push(`Lora hashes: "${r.map(n=>`${n.name}: ${n.hash}`).join(", ")}"`),(t.seamlessX||t.seamlessY)&&a.push(`Seamless: ${[t.seamlessX?"x":"",t.seamlessY?"y":""].filter(Boolean).join("+")}`),t.vaePrecision&&a.push(`VAE precision: ${t.vaePrecision}`),t.cpuNoise||a.push("Noise device: gpu"),t.refiner&&(a.push(`ADetailer model: ${t.refiner.model}`),a.push(`ADetailer confidence: ${t.refiner.confidence}`),a.push(`ADetailer denoising strength: ${t.refiner.denoise}`),a.push(`ADetailer mask blur: ${t.refiner.maskBlur}`),t.refiner.prompt&&a.push(`ADetailer prompt: ${t.refiner.prompt}`),t.refiner.negativePrompt&&a.push(`ADetailer negative prompt: ${t.refiner.negativePrompt}`)),t.triggers.length&&a.push(`Trigger phrases: ${t.triggers.join(" ")}`),t.characters.length&&a.push(`Characters: ${t.characters.join(", ")}`),t.controlImage&&a.push(`Control image: ${t.controlImage}`),t.board&&a.push(`Board: ${t.board}`),a.push(`Backend: ${t.backend}`),t.seconds!==void 0&&a.push(`Generation time: ${t.seconds.toFixed(1)}s`),s.push(a.join(", ")),s.join(`
`)}function et(t){return JSON.stringify(t,null,2)}function Ce(t){return{prompt:t.prompt,negativePrompt:t.negativePrompt??"",model:t.model??"",modelHash:t.modelHash||void 0,vae:t.vae??"",vaePrecision:"fp32",sampler:t.sampler??"",seed:t.seed,steps:t.steps,cfgScale:t.cfgScale,cfgRescale:t.cfgRescale,clipSkip:t.clipSkip,width:t.width,height:t.height,seamlessX:t.seamlessX,seamlessY:t.seamlessY,cpuNoise:t.cpuNoise,loras:t.loras??[],triggers:[],characters:[],backend:t.backend||"invokeai",at:Date.now()}}function Te(t){return{prompt:t.prompt,negativePrompt:t.negativePrompt||void 0,checkpoint:t.model||void 0,vae:t.vae||void 0,sampler:t.sampler||void 0,seed:t.seed,steps:t.steps,cfgScale:t.cfgScale,cfgRescale:t.cfgRescale,clipSkip:t.clipSkip,width:t.width,height:t.height,seamlessX:t.seamlessX,seamlessY:t.seamlessY,vaePrecision:t.vaePrecision==="fp16"?"fp16":"fp32",cpuNoise:t.cpuNoise,count:1,loras:t.loras.map(({name:e,weight:i})=>({name:e,weight:i})),detailer:t.refiner?{enabled:!0,...t.refiner}:void 0,board:t.board}}async function ne(t){var e;try{if((e=navigator.clipboard)!=null&&e.writeText)return await navigator.clipboard.writeText(t),!0}catch{}try{const i=document.createElement("textarea");i.value=t,i.setAttribute("readonly",""),i.style.position="fixed",i.style.top="-1000px",document.body.appendChild(i),i.select();const s=document.execCommand("copy");return document.body.removeChild(i),s}catch{return!1}}const _t="oppai_gen_draft",zt=1,ze=720*60*60*1e3;function Pe(t){try{const e={...t,version:zt,at:Date.now()};localStorage.setItem(_t,JSON.stringify(e))}catch{}}function Ie(){let t=null;try{t=localStorage.getItem(_t)}catch{return null}if(!t)return null;let e;try{e=JSON.parse(t)}catch{return pt(),null}if(!e||typeof e!="object")return null;const i=e;if(i.version!==zt)return pt(),null;const s=typeof i.at=="number"?i.at:0;if(!s||Date.now()-s>ze)return pt(),null;const a={version:zt,at:s},r=p=>{const h=i[p];typeof h=="string"&&(a[p]=h)},n=p=>{const h=i[p];typeof h=="boolean"&&(a[p]=h)},l=p=>{const h=i[p];typeof h=="number"&&Number.isFinite(h)&&(a[p]=h)};if(["prompt","negative","checkpoint","vae","templateId","scheduler","board","outfitText","outfitMisc","outfitUnderwearColor","outfitPubicHairColor","outfitLoadoutId","outfitWardrobeId","detailerModel","detailerPrompt","detailerNegative"].forEach(r),["width","height","steps","cfg","cfgRescale","clipSkip","count","seed","outfitFace","outfitTier","detailerConfidence","detailerDenoise","detailerMaskBlur","scrollTop"].forEach(l),["seamlessX","seamlessY","cpuNoise","outfitOn","outfitCutout","outfitPubicHair","outfitLockColors","outfitMiscBatch","detailerEnabled","showOptions"].forEach(n),(i.vaePrecision==="fp16"||i.vaePrecision==="fp32")&&(a.vaePrecision=i.vaePrecision),(i.outfitBackground==="black"||i.outfitBackground==="white")&&(a.outfitBackground=i.outfitBackground),i.camera&&typeof i.camera=="object"&&!Array.isArray(i.camera)){const p={};for(const[h,f]of Object.entries(i.camera))(typeof f=="string"||typeof f=="boolean")&&(p[h]=f);Object.keys(p).length&&(a.camera=p)}return Me(i.selectedLoras)&&(a.selectedLoras=i.selectedLoras),Be(i.open)&&(a.open=i.open),xt(i.selectedTriggers)&&(a.selectedTriggers=i.selectedTriggers),xt(i.selectedChars)&&(a.selectedChars=i.selectedChars),xt(i.selectedPoses)&&(a.selectedPoses=i.selectedPoses),Le(i.outfitGear)&&(a.outfitGear=i.outfitGear),Array.isArray(i.shots)&&(a.shots=i.shots.filter(p=>!!p&&typeof p=="object"&&typeof p.id=="string"&&typeof p.seed=="number").map(p=>({id:p.id,seed:p.seed,saved:!!p.saved,info:p.info,...typeof p.outfitFilename=="string"?{outfitFilename:p.outfitFilename}:{},...De(p.outfitSlot)?{outfitSlot:p.outfitSlot}:{},...typeof p.outfitConfig=="string"?{outfitConfig:p.outfitConfig}:{},...typeof p.cutoutReviewed=="boolean"?{cutoutReviewed:p.cutoutReviewed}:{},...typeof p.wipOutfitId=="string"?{wipOutfitId:p.wipOutfitId}:{},...typeof p.previewVersion=="number"&&Number.isFinite(p.previewVersion)?{previewVersion:p.previewVersion}:{},...typeof p.workspaceX=="number"&&Number.isFinite(p.workspaceX)?{workspaceX:Math.max(0,p.workspaceX)}:{},...typeof p.workspaceY=="number"&&Number.isFinite(p.workspaceY)?{workspaceY:Math.max(0,p.workspaceY)}:{}}))),a}function Le(t){return!!t&&typeof t=="object"&&!Array.isArray(t)}function De(t){if(!t||typeof t!="object"||Array.isArray(t))return!1;const e=t;return typeof e.emotion=="string"&&typeof e.emotionLabel=="string"&&typeof e.tier=="number"&&Number.isInteger(e.tier)&&typeof e.tierLabel=="string"&&typeof e.index=="number"&&Number.isInteger(e.index)}function pt(){try{localStorage.removeItem(_t)}catch{}}function xt(t){return Array.isArray(t)&&t.every(e=>typeof e=="string")}function Me(t){return!!t&&typeof t=="object"&&!Array.isArray(t)&&Object.values(t).every(e=>typeof e=="number"&&Number.isFinite(e))}function Be(t){return!!t&&typeof t=="object"&&!Array.isArray(t)&&Object.values(t).every(e=>typeof e=="boolean")}const K=new Uint8Array([137,80,78,71,13,10,26,10]),Pt=new TextEncoder;function Oe(t,e){return(t[e]<<24|t[e+1]<<16|t[e+2]<<8|t[e+3])>>>0}function Ut(t,e,i){t[e]=i>>>24&255,t[e+1]=i>>>16&255,t[e+2]=i>>>8&255,t[e+3]=i&255}let rt;function Ee(t){if(!rt){rt=new Uint32Array(256);for(let i=0;i<256;i++){let s=i;for(let a=0;a<8;a++)s=s&1?3988292384^s>>>1:s>>>1;rt[i]=s>>>0}}let e=4294967295;for(const i of t)e=rt[(e^i)&255]^e>>>8;return(e^4294967295)>>>0}function Ft(t,e){const i=Pt.encode(t),s=new Uint8Array(12+e.length);Ut(s,0,e.length),s.set(i,4),s.set(e,8);const a=new Uint8Array(i.length+e.length);return a.set(i),a.set(e,i.length),Ut(s,s.length-4,Ee(a)),s}function jt(t,e){const i=[...e].every(n=>(n.codePointAt(0)??256)<=255),s=Pt.encode(t);if(i){const n=Uint8Array.from([...e],p=>p.codePointAt(0)??0),l=new Uint8Array(s.length+1+n.length);return l.set(s),l.set(n,s.length+1),Ft("tEXt",l)}const a=Pt.encode(e),r=new Uint8Array(s.length+5+a.length);return r.set(s),r.set(a,s.length+5),Ft("iTXt",r)}function It(t,e,i){const s=t instanceof Uint8Array?t:new Uint8Array(t);if(s.length<20||!K.every((w,$)=>s[$]===w))throw new Error("The generated image is not a PNG.");let a=K.length,r=-1;const n=[];for(;a+12<=s.length;){const w=Oe(s,a),$=a+12+w;if($>s.length)throw new Error("The PNG is truncated.");const z=String.fromCharCode(...s.subarray(a+4,a+8));if(z==="IEND"){r=a;break}const S=s.subarray(a+8,a+8+w),C=S.indexOf(0),P=C<0?"":String.fromCharCode(...S.subarray(0,C));(z==="tEXt"||z==="iTXt")&&(P==="parameters"||P==="oppailib")||n.push(s.subarray(a,$)),a=$}if(r<0)throw new Error("The PNG has no IEND chunk.");const l=[jt("parameters",e)];i&&l.push(jt("oppailib",i));const p=n.reduce((w,$)=>w+$.length,0),h=l.reduce((w,$)=>w+$.length,0),f=s.subarray(r),b=new Uint8Array(K.length+p+h+f.length);b.set(K);let x=K.length;for(const w of n)b.set(w,x),x+=w.length;for(const w of l)b.set(w,x),x+=w.length;return b.set(f,x),b}async function le(t,e,i,s){const a=await fetch(t,{credentials:"same-origin"});if(!a.ok)throw new Error(`Couldn't export image (${a.status}).`);const n=It(await a.arrayBuffer(),i,s).slice().buffer,l=URL.createObjectURL(new Blob([n],{type:"image/png"}));try{const p=document.createElement("a");p.href=l,p.download=e.toLowerCase().endsWith(".png")?e:`${e}.png`,p.click()}finally{setTimeout(()=>URL.revokeObjectURL(l),0)}}const Gt={shot:"full-body",angle:"eye",view:"front",framing:"portrait",lens:"none",lockIdentity:!0},st={"extreme-closeup":{label:"Extreme close-up",hint:"Eyes and mouth fill the frame",prompt:"extreme close-up, face filling the frame, macro detail on the eyes",not:["full body","wide shot","long shot","cowboy shot","upper body"]},closeup:{label:"Close-up",hint:"The face, little else",prompt:"close-up portrait, face and hair fill the frame",not:["full body","wide shot","long shot","cowboy shot"]},"head-shoulders":{label:"Head and shoulders",hint:"The classic portrait crop",prompt:"head and shoulders portrait, shoulders visible at the frame edge",not:["full body","wide shot","long shot","waist visible"]},bust:{label:"Bust shot",hint:"Head to upper chest",prompt:"bust shot, framed from the chest up",not:["full body","wide shot","long shot","legs","feet"]},"waist-up":{label:"Waist-up",hint:"Head to waist, hands usable",prompt:"waist-up shot, upper body, cropped at the waist",not:["full body","long shot","legs","feet","knees"]},"three-quarter":{label:"Three-quarter body",hint:"Head to mid-thigh",prompt:"three-quarter body shot, cowboy shot, cropped at mid-thigh",not:["extreme close-up","feet","shoes"]},"full-body":{label:"Full body",hint:"Head to feet, whole figure",prompt:"full body shot, entire figure in frame, head to feet visible",not:["close-up","cropped legs","out of frame","cropped head"]}};function Re(t){return st[t].prompt}const Lt={eye:{label:"Eye level",prompt:"eye level perspective, natural straight-on viewpoint",not:[]},low:{label:"Low angle",prompt:"low angle shot, viewed from below, looking upward",not:["from above","high angle","distorted proportions","giant"]},high:{label:"High angle",prompt:"high angle shot, viewed from above, looking downward",not:["from below","low angle","distorted proportions"]}},Dt={front:{label:"Front",prompt:"front view, facing viewer",not:["from behind","back view"]},"three-quarter":{label:"Three-quarter",prompt:"three-quarter view, body turned at a slight angle",not:["from behind"]},side:{label:"Side",prompt:"side view, profile, from the side",not:["front view","facing viewer"]},rear:{label:"Rear",prompt:"from behind, back view, facing away from viewer",not:["front view","facing viewer","looking at viewer","face visible"]}},Mt={none:{label:"Unspecified",prompt:""},"wide-24":{label:"24mm wide",prompt:"24mm wide angle lens, deep focus"},"normal-50":{label:"50mm normal",prompt:"50mm lens, natural perspective"},"portrait-85":{label:"85mm portrait",prompt:"85mm portrait lens, shallow depth of field, blurred background"},"tele-135":{label:"135mm telephoto",prompt:"135mm telephoto lens, compressed perspective, bokeh"}},_e="consistent character design, same face, consistent facial features, consistent body proportions, anatomically consistent",Ae="inconsistent face, different person, face morphing, deformed proportions, distorted anatomy, extra limbs, malformed hands, changed body type, altered hairstyle",Ne="camera, camera body, camera lens, photography equipment, tripod, photographer, studio equipment, boom microphone",de={portrait:{sd:[512,768],xl:[832,1216]},landscape:{sd:[768,512],xl:[1216,832]},square:{sd:[512,512],xl:[1024,1024]}};function Ue(t,e="sd"){const i=st[t.shot],s=Lt[t.angle],a=Dt[t.view],r=Mt[t.lens],n=Wt([...t.lockIdentity?[_e]:[],i.prompt,a.prompt,s.prompt,r.prompt]),l=Wt([...t.lockIdentity?[Ae]:[],Ne,...i.not,...a.not,...s.not]),[p,h]=de[t.framing][e];return{prompt:n,negative:l,width:p,height:h}}function Wt(t){const e=new Set,i=[];for(const s of t)for(const a of s.split(",")){const r=a.trim();if(!r)continue;const n=r.toLowerCase();e.has(n)||(e.add(n),i.push(r))}return i.join(", ")}function Fe(t,e){return t*e>=800*800?"xl":"sd"}const wt={shots:Object.keys(st).map(t=>({id:t,label:st[t].label,hint:st[t].hint})),angles:Object.keys(Lt).map(t=>({id:t,label:Lt[t].label})),views:Object.keys(Dt).map(t=>({id:t,label:Dt[t].label})),lenses:Object.keys(Mt).map(t=>({id:t,label:Mt[t].label})),framings:Object.keys(de).map(t=>({id:t,label:t==="portrait"?"Portrait":t==="landscape"?"Landscape":"Square"}))},qt={feather:2,spill:.5},W=255,F=0,je=20;class Ge{constructor(e){if(this.undoStack=[],this.redoStack=[],"data"in e)this.width=e.width,this.height=e.height,this.source={data:e.data,width:e.width,height:e.height};else{this.width="naturalWidth"in e?e.naturalWidth:e.width,this.height="naturalHeight"in e?e.naturalHeight:e.height;const i=document.createElement("canvas");i.width=this.width,i.height=this.height;const s=i.getContext("2d",{willReadFrequently:!0});if(!s)throw new Error("This browser wouldn't give us a canvas to work on.");s.drawImage(e,0,0),this.source=s.getImageData(0,0,this.width,this.height)}this.mask=new Uint8Array(this.width*this.height).fill(W),this.key=Vt(this.source.data,this.width,this.height)}get canUndo(){return this.undoStack.length>0}get canRedo(){return this.redoStack.length>0}get cutFraction(){let e=0;for(let i=0;i<this.mask.length;i++)this.mask[i]===F&&e++;return e/this.mask.length}checkpoint(){this.undoStack.push(this.mask.slice()),this.undoStack.length>je&&this.undoStack.shift(),this.redoStack=[]}undo(){const e=this.undoStack.pop();return e?(this.redoStack.push(this.mask),this.mask=e,!0):!1}redo(){const e=this.redoStack.pop();return e?(this.undoStack.push(this.mask),this.mask=e,!0):!1}reset(){this.checkpoint(),this.mask.fill(W)}autoRemove(e){this.checkpoint(),this.mask.fill(W),this.key=Vt(this.source.data,this.width,this.height);const i=[];for(let s=0;s<this.width;s++)i.push(s,s+(this.height-1)*this.width);for(let s=0;s<this.height;s++)i.push(s*this.width,this.width-1+s*this.width);this.flood(i,this.key,e),this.removeEnclosedBackdrop(e)}removeEnclosedBackdrop(e){const i=this.source.data,s=new Uint8Array(this.mask.length),[a,r,n]=this.key,l=Math.max(1,e),p=Ht(a,r,n),h=Math.max(a,r,n)-Math.min(a,r,n)<28,f=Math.max(16,Math.floor(this.mask.length*.08));for(let b=0;b<this.mask.length;b++){if(s[b]||this.mask[b]===F||Z(i,b*4,a,r,n)>l)continue;const x=[],w=new Set,$=[b];for(s[b]=1;$.length;){const P=$.pop();x.push(P);const k=P%this.width,Y=(P-k)/this.width,at=[k>0?P-1:-1,k<this.width-1?P+1:-1,Y>0?P-this.width:-1,Y<this.height-1?P+this.width:-1];for(const N of at)N<0||this.mask[N]===F||(Z(i,N*4,a,r,n)<=l?s[N]||(s[N]=1,$.push(N)):w.add(N))}if(!w.size||x.length>f)continue;let z=0,S=0;for(const P of w){const k=P*4;z+=Ht(i[k],i[k+1],i[k+2]),S+=Z(i,k,a,r,n)}if(z/=w.size,S/=w.size,h&&p>=200?p-z>=110:h&&p<=55?z-p>=110:S>=Math.max(90,l*2.25))for(const P of x)this.mask[P]=F}}removeAt(e,i,s){const a=ct(Math.round(e),0,this.width-1),r=ct(Math.round(i),0,this.height-1),n=(r*this.width+a)*4,l=[this.source.data[n],this.source.data[n+1],this.source.data[n+2]];if(this.checkpoint(),this.key=l,s.contiguous){this.flood([r*this.width+a],l,s.tolerance);return}const p=Math.max(1,s.tolerance);for(let h=0;h<this.mask.length;h++)this.mask[h]!==F&&Z(this.source.data,h*4,l[0],l[1],l[2])<=p&&(this.mask[h]=F)}paint(e,i,s,a){const r=a==="add"?W:F,n=Math.max(1,Math.round(s)),l=Math.round(e),p=Math.round(i),h=n*n,f=Math.max(0,l-n),b=Math.min(this.width-1,l+n),x=Math.max(0,p-n),w=Math.min(this.height-1,p+n);for(let $=x;$<=w;$++){const z=$-p;for(let S=f;S<=b;S++){const C=S-l;C*C+z*z>h||(this.mask[$*this.width+S]=r)}}}beginStroke(){this.checkpoint()}compose(e,i=!1){const s=document.createElement("canvas");s.width=this.width,s.height=this.height;const a=s.getContext("2d");if(!a)return s;const r=this.composePixels(e,i);return a.putImageData(new ImageData(r.data,r.width,r.height),0,0),s}composePixels(e,i=!1){const s={data:new Uint8ClampedArray(this.source.data),width:this.width,height:this.height};if(i)return s;const a=this.featheredAlpha(Math.max(0,Math.round(e.feather))),r=ct(e.spill,0,1),[n,l,p]=this.key;for(let h=0;h<a.length;h++){const f=h*4,b=a[h];if(s.data[f+3]=b,b===0||b===W||r===0)continue;const x=r*(1-b/W);s.data[f]=$t(s.data[f],n,x),s.data[f+1]=$t(s.data[f+1],l,x),s.data[f+2]=$t(s.data[f+2],p,x)}return s}featheredAlpha(e){const i=new Uint8Array(this.mask.length);if(e<=0)return i.set(this.mask),i;const s=1e6,a=new Float32Array(this.mask.length);for(let l=0;l<this.mask.length;l++)a[l]=this.mask[l]===F?0:s;const r=this.width,n=this.height;for(let l=0;l<n;l++)for(let p=0;p<r;p++){const h=l*r+p;let f=a[h];p>0&&(f=Math.min(f,a[h-1]+1)),l>0&&(f=Math.min(f,a[h-r]+1)),p>0&&l>0&&(f=Math.min(f,a[h-r-1]+1.414)),p<r-1&&l>0&&(f=Math.min(f,a[h-r+1]+1.414)),a[h]=f}for(let l=n-1;l>=0;l--)for(let p=r-1;p>=0;p--){const h=l*r+p;let f=a[h];p<r-1&&(f=Math.min(f,a[h+1]+1)),l<n-1&&(f=Math.min(f,a[h+r]+1)),p<r-1&&l<n-1&&(f=Math.min(f,a[h+r+1]+1.414)),p>0&&l<n-1&&(f=Math.min(f,a[h+r-1]+1.414)),a[h]=f}for(let l=0;l<i.length;l++){if(this.mask[l]===F){i[l]=0;continue}const p=a[l];i[l]=p>=e?W:Math.round(p/e*W)}return i}flood(e,i,s){const a=Math.max(1,s),r=this.source.data,n=new Uint8Array(this.mask.length),l=e.slice(),[p,h,f]=i;for(;l.length;){const b=l.pop();if(n[b]||(n[b]=1,Z(r,b*4,p,h,f)>a))continue;this.mask[b]=F;const x=b%this.width,w=(b-x)/this.width;x>0&&l.push(b-1),x<this.width-1&&l.push(b+1),w>0&&l.push(b-this.width),w<this.height-1&&l.push(b+this.width)}}}function Z(t,e,i,s,a){const r=t[e]-i,n=t[e+1]-s,l=t[e+2]-a;return Math.sqrt(r*r+n*n+l*l)}function Ht(t,e,i){return t*.2126+e*.7152+i*.0722}function Vt(t,e,i){const s=[0,(e-1)*4,(i-1)*e*4,((i-1)*e+(e-1))*4];let a=0,r=0,n=0;for(const l of s)a+=t[l],r+=t[l+1],n+=t[l+2];return[a/4,r/4,n/4]}function $t(t,e,i){return ct(Math.round(t+(t-e)*i),0,255)}function ct(t,e,i){return Math.min(i,Math.max(e,t))}function We(t){return new Promise((e,i)=>{const s=new Image;s.crossOrigin="anonymous",s.onload=()=>e(s),s.onerror=()=>i(new Error("Couldn't load that image.")),s.src=t})}function Yt(t){return new Promise((e,i)=>{t.toBlob(s=>s?e(s):i(new Error("Couldn't encode the PNG.")),"image/png")})}function ht(t,e,i=48){return t.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,i).replace(/-+$/g,"")||e}function qe(t,e,i){return`${ht(t,"outfit")}-${ht(e,"calm",20)}-${ht(i,"neutral",24)}.png`}function He(t){return`${ht(t,"outfit")}-wardrobe.zip`}const j=[{key:"head",label:"Head",hint:"Hats, glasses, etc.",prompt:"head item",noun:"headwear",icon:"face"},{key:"top",label:"Top",hint:"Shirt, dress, jacket…",prompt:"top",noun:"top",icon:"apparel"},{key:"bottoms",label:"Bottoms",hint:"Skirt, shorts, pants…",prompt:"bottoms",noun:"bottoms",icon:"styler"},{key:"shoes",label:"Shoes",hint:"Boots, heels, socks…",prompt:"footwear",noun:"footwear",icon:"steps"},{key:"panties",label:"Panties",hint:"Style and material",prompt:"panties",noun:"panties",icon:"apparel"},{key:"bra",label:"Bra",hint:"Style and material",prompt:"bra",noun:"bra",icon:"apparel"},{key:"hand1",label:"Hand 1",hint:"Held or worn item",prompt:"left-hand item",noun:"glove",icon:"front_hand"},{key:"hand2",label:"Hand 2",hint:"Held or worn item",prompt:"right-hand item",noun:"glove",icon:"back_hand"},{key:"extra1",label:"Extra 1",hint:"Accessory or layer",prompt:"extra accessory",noun:"accessory",icon:"diamond"},{key:"extra2",label:"Extra 2",hint:"Accessory or layer",prompt:"second extra accessory",noun:"accessory",icon:"diamond"}];function G(t){return!!t.item.trim()&&!t.off}const kt={head:{color:"",item:""},top:{color:"cream white",item:"fitted top"},bottoms:{color:"charcoal",item:"pleated skirt"},shoes:{color:"black",item:"ankle boots"},panties:{color:"black",item:"lace panties"},bra:{color:"black",item:"lace bra"},hand1:{color:"",item:""},hand2:{color:"",item:""},extra1:{color:"",item:""},extra2:{color:"",item:""}},pe=Object.fromEntries(j.map(({key:t})=>[t,{color:"",item:""}])),ce=[{name:"red",words:["red","crimson","scarlet","ruby","burgundy","maroon","wine"]},{name:"pink",words:["pink","rose","blush","magenta","fuchsia","salmon"]},{name:"orange",words:["orange","peach","apricot","coral","amber","rust"]},{name:"yellow",words:["yellow","gold","golden","mustard","lemon","blonde"]},{name:"green",words:["green","emerald","olive","mint","jade","teal","sage"]},{name:"blue",words:["blue","navy","azure","cobalt","indigo","denim","cyan","turquoise"]},{name:"purple",words:["purple","violet","lavender","lilac","plum","mauve"]},{name:"brown",words:["brown","tan","beige","chocolate","caramel","khaki","bronze","copper"]},{name:"white",words:["white","cream","ivory","pearl","off-white"]},{name:"black",words:["black","charcoal","onyx","jet"]},{name:"grey",words:["grey","gray","silver","slate","ash","steel"]}];function Ve(t){const e=t.toLowerCase();return ce.filter(({words:i})=>i.some(s=>new RegExp(`\\b${s}\\b`).test(e))).map(({name:i})=>i)}function Ye(t,e,i){if(!t.trim())return"";const s=e.toFixed(2).replace(/0+$/,"").replace(/\.$/,"");return i==="a1111"?`(${t}:${s})`:i==="invokeai"?`(${t})${s}`:t}const Xe=1.25;function Xt(t,e,i,s){const a=e.item.trim();if(!a||e.off)return"";const r=At(t,e),n=vt(t,e),l=e.color.trim();if(!l)return`${r}: ${a}`;const p=`${l} ${a}`;return s?`${r}: ${Ye(p,Xe,i)}, ${l} ${n}`:`${r}: ${p}`}function At(t,e){var i;return((i=e.prompt)==null?void 0:i.trim())||t.prompt}function vt(t,e){var i,s;return((i=e.noun)==null?void 0:i.trim())||((s=e.prompt)==null?void 0:s.trim())||t.noun}function Ke(t,e){const i=e.color.trim();if(!G(e)||!i)return[];const s=new Set(Ve(i));if(!s.size)return[];const a=vt(t,e);return ce.filter(({name:r})=>!s.has(r)).map(({name:r})=>`${r} ${a}`)}const Bt=[{description:"Clothes on; bra and panties hidden.",clothes:[["on",100]],bra:[["hidden",100]],panties:[["hidden",100]]},{description:"Usually covered, with an occasional underwear glimpse.",clothes:[["on",88],["displaced",12]],bra:[["hidden",88],["showing",12]],panties:[["hidden",94],["showing",6]]},{description:"Mixed neat, slipped, and rare clothes-off results.",clothes:[["on",58],["displaced",34],["off",8]],bra:[["hidden",52],["showing",38],["off",10]],panties:[["hidden",60],["showing",33],["off",7]]},{description:"Strong variation: clothes and underwear may be on, showing, or off.",clothes:[["on",28],["displaced",44],["off",28]],bra:[["hidden",22],["showing",46],["off",32]],panties:[["hidden",30],["showing",45],["off",25]]},{description:"Maximum variation, weighted toward displaced or removed clothing.",clothes:[["on",14],["displaced",28],["off",58]],bra:[["hidden",10],["showing",27],["off",63]],panties:[["hidden",14],["showing",31],["off",55]]}];function St(t,e){const i=Math.max(0,Math.min(.999999,e()))*100;let s=0;for(const[a,r]of t)if(s+=r,i<s)return a;return t[t.length-1][0]}function Ze(t,e=Math.random){const i=Bt[Math.max(0,Math.min(Bt.length-1,Math.round(t)))],s=St(i.clothes,e);let a=St(i.bra,e),r=St(i.panties,e);return s==="off"&&(a==="hidden"&&(a="showing"),r==="hidden"&&(r="showing")),{clothes:s,bra:a,panties:r}}function Je(t){if(!t||typeof t!="object"||Array.isArray(t))return!1;const e=t;return typeof e.color=="string"&&typeof e.item=="string"}function Kt(t){if(!t||typeof t!="object"||Array.isArray(t))return{...pe};const e=t;return Object.fromEntries(j.map(({key:i})=>{var a,r;const s=e[i];return typeof s=="string"?[i,{color:"",item:s}]:Je(s)?[i,{color:s.color,item:s.item,...s.off?{off:!0}:{},...(a=s.prompt)!=null&&a.trim()?{prompt:s.prompt.trim()}:{},...(r=s.noun)!=null&&r.trim()?{noun:s.noun.trim()}:{}}]:[i,{color:"",item:""}]}))}function Qe(t){return JSON.stringify(Object.fromEntries(j.map(e=>{const i=t[e.key];return[e.key,G(i)?`${i.color.trim().toLowerCase()}|${i.item.trim().toLowerCase()}|${At(e,i).toLowerCase()}|${vt(e,i).toLowerCase()}`:"|"]})))}var ti=Object.defineProperty,ei=Object.getOwnPropertyDescriptor,E=(t,e,i,s)=>{for(var a=s>1?void 0:s?ei(e,i):e,r=t.length-1,n;r>=0;r--)(n=t[r])&&(a=(s?n(e,i,a):n(a))||a);return s&&a&&ti(e,i,a),a};const Ot=[{id:"neutral",label:"Neutral",hint:"Login screen and error popups"},{id:"happy",label:"Happy",hint:"Chat · Sweet mode"},{id:"mischievous",label:"Mischievous",hint:"Chat · Playful mode"},{id:"surprised",label:"Surprised",hint:"Chat · Bold mode"},{id:"thinking",label:"Thinking",hint:"Chat · Roleplay mode"},{id:"shy",label:"Shy",hint:"Bashful, flustered, caught out",borrows:"Surprised"},{id:"smug",label:"Smug",hint:"Proud of herself, vindicated",borrows:"Mischievous"},{id:"sad",label:"Sad",hint:"Hurt, wistful, let down",borrows:"Thinking"},{id:"annoyed",label:"Annoyed",hint:"Irritated, pouty, impatient",borrows:"Thinking"},{id:"sleepy",label:"Sleepy",hint:"Tired, dozy, winding down",borrows:"Neutral"},{id:"loving",label:"Loving",hint:"Tender, adoring, soft on you",borrows:"Happy"},{id:"excited",label:"Excited",hint:"Thrilled, eager, buzzing",borrows:"Happy"}],ut=["Calm","Warm","Flirty","Heated","Peak"],ii=Ot.length*ut.length,J=(t,e)=>`${t}:${e}`;let L=class extends ft{constructor(){super(...arguments),this.outfits=[],this.activities=[],this.backgrounds=[],this.defaultBackground="",this.backgroundDraft=null,this.backgroundBusy=!1,this.backgroundVersion=0,this.wornOutfit=ue(),this.outfitDraft=null,this.outfitBusy=!1,this.outfitError="",this.outfitCoverVersion=0}connectedCallback(){super.connectedCallback(),this.loadOutfits()}async refresh(){await this.loadOutfits()}async loadBackgrounds(){try{const t=await u.libbyBackgrounds();this.backgrounds=t.backgrounds,this.defaultBackground=t.default??""}catch{}}async setDefaultBackground(t){try{const e=await u.setLibbyDefaultBackground(t);this.defaultBackground=e.default,I(t?"That's where she'll be unless a conversation moves her.":"No default room — the plain stage until she moves.","success")}catch(e){I(e.message||"Couldn't set the default background.","error")}}async loadOutfits(){this.loadBackgrounds();try{const t=await u.libbyOutfits();this.outfits=t.outfits,this.activities=t.activities??[],this.outfitError="",this.wornOutfit&&!t.outfits.some(e=>e.id===this.wornOutfit)&&(this.wornOutfit="",Nt(""))}catch(t){this.outfitError=t.message||"Couldn't load your wardrobes."}}render(){return o`
      <div class="wardrobe-intro">
        An outfit swaps Libby's artwork: one sprite per expression, per heat tier —
        ${ii} in all for a complete wardrobe — plus one picture for each of the
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
          <img class="cover" src=${ge("happy",1)} alt="Default Libby" />
          ${this.wornOutfit===""?o`<span class="worn-badge">Wearing</span>`:c}
          <div class="card-body">
            <div class="card-name">Default Libby</div>
            <div class="card-meta">Bundled artwork</div>
          </div>
        </button>
        ${this.outfits.map(t=>this.renderOutfitCard(t))}
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
    `}renderBackgrounds(){const t=this.backgroundDraft;return o`
      <div class="scene-head"><h3>Backgrounds</h3><span class="wardrobe-intro" style="margin:0">Rooms for the video call. Tag them so she can choose where she is; mark one as the default and every conversation starts there. A generated picture can become one from its right-click menu.</span></div>
      <div class="scene-cards">
        ${this.backgrounds.map(e=>o`<button class="scene-card" title="Edit ${e.name}" @click=${()=>this.openBackgroundEditor(e)}>
          ${e.hasImage?o`<img class="cover" src=${u.libbyBackgroundURL(e.id,this.backgroundVersion)} alt=${e.name} loading="lazy" />`:o`<div class="cover-empty">No picture yet</div>`}
          ${e.id===this.defaultBackground?o`<span class="default-badge">Default</span>`:c}
          <div class="card-body"><div class="card-name">${e.name}</div><div class="card-meta">${e.tags.length?e.tags.join(", "):"No tags — she can only pick it by name"}</div></div>
        </button>`)}
        <button class="scene-card" title="Add a background" @click=${()=>this.backgroundDraft={name:"",tags:""}}>
          <div class="cover-empty"><span><span class="material-symbols-rounded" style="font-size:26px; display:block;">add</span>New background</span></div>
          <div class="card-body"><div class="card-name">New background</div><div class="card-meta">A room, a bed, a balcony…</div></div>
        </button>
      </div>
      ${t?o`<div class="scene-editor">
        <label class="drop"
          @dragover=${e=>{e.preventDefault(),e.currentTarget.classList.add("dragover")}}
          @dragleave=${e=>e.currentTarget.classList.remove("dragover")}
          @drop=${e=>{var i,s;e.preventDefault(),e.currentTarget.classList.remove("dragover"),this.stageBackground((s=(i=e.dataTransfer)==null?void 0:i.files)==null?void 0:s[0])}}>
          ${t.image?o`<img src=${t.image} alt="" />`:t.id&&t.hasImage?o`<img src=${u.libbyBackgroundURL(t.id,this.backgroundVersion)} alt="" />`:o`<span>Drop a picture here<br />or click to browse<br /><small>Landscape works best</small></span>`}
          <input type="file" accept="image/*" style="display:none;" @change=${e=>{var s;const i=e.target;this.stageBackground((s=i.files)==null?void 0:s[0]),i.value=""}} />
        </label>
        <div class="scene-fields">
          <label>Name<input .value=${t.name} placeholder="Bedroom" maxlength="60" @input=${e=>this.backgroundDraft={...t,name:e.target.value}} /></label>
          <label>Tags — what it is, comma separated<input .value=${t.tags} placeholder="bedroom, night, lamp, cosy" @input=${e=>this.backgroundDraft={...t,tags:e.target.value}} /></label>
          <span class="wardrobe-intro" style="margin:0">She reads the name and the tags when deciding where to be: "going to bed" finds a room tagged bed, "somewhere darker" one tagged night.</span>
        </div>
        <div class="scene-actions">
          <button class="outfit-btn on" ?disabled=${this.backgroundBusy||!t.name.trim()} @click=${()=>void this.saveBackground()}>${t.id?"Save":"Add background"}</button>
          <button class="outfit-btn" ?disabled=${this.backgroundBusy} @click=${()=>this.backgroundDraft=null}>Cancel</button>
          ${t.id&&t.hasImage?o`<button class="outfit-btn ${t.id===this.defaultBackground?"on":""}" ?disabled=${this.backgroundBusy}
            title="Where she is when a conversation has not moved her"
            @click=${()=>void this.setDefaultBackground(t.id===this.defaultBackground?"":t.id)}>
            ${t.id===this.defaultBackground?"Default room ✓":"Make this the default"}
          </button>`:c}
          ${t.id?o`<button class="outfit-btn danger" ?disabled=${this.backgroundBusy} @click=${()=>void this.deleteBackground()}>Delete</button>`:c}
        </div>
      </div>`:c}
    `}openBackgroundEditor(t){this.backgroundDraft={id:t.id,name:t.name,tags:t.tags.join(", "),hasImage:t.hasImage}}stageBackground(t){if(!t||!this.backgroundDraft)return;const e=new FileReader;e.onload=()=>{this.backgroundDraft&&(this.backgroundDraft={...this.backgroundDraft,image:String(e.result)})},e.readAsDataURL(t)}async saveBackground(){const t=this.backgroundDraft;if(!(!t||!t.name.trim())){this.backgroundBusy=!0;try{const e=await u.saveLibbyBackground({id:t.id,name:t.name.trim(),tags:t.tags.split(",").map(i=>i.trim()).filter(Boolean)});t.image&&await u.setLibbyBackgroundImage(e.id,t.image),this.backgroundVersion++,this.backgroundDraft=null,await this.loadBackgrounds(),!t.image&&!t.hasImage&&I("Saved — add a picture and she can go there.","success")}catch(e){I(e.message||"Couldn't save that background.","error")}finally{this.backgroundBusy=!1}}}async deleteBackground(){const t=this.backgroundDraft;if(!(!(t!=null&&t.id)||!confirm(`Delete "${t.name}"?`))){this.backgroundBusy=!0;try{await u.deleteLibbyBackground(t.id),this.backgroundDraft=null,await this.loadBackgrounds()}catch(e){I(e.message||"Couldn't delete that background.","error")}finally{this.backgroundBusy=!1}}}wearOutfit(t){this.wornOutfit=t,Nt(t)}openOutfitEditor(t){const e=[];if(t.emotionLevels)for(const[i,s]of Object.entries(t.emotionLevels))for(const a of s)e.push(J(i,a));else for(const i of t.emotions)e.push(J(i,0));for(const[i,s]of Object.entries(t.activityLevels??{}))for(const a of s)e.push(J(i,a));this.outfitDraft={id:t.id,name:t.name,existing:e,staged:{},removed:[],level:0,hasCover:t.hasThumb!==!1}}isActivity(t){return this.activities.some(e=>e.id===t)}toggleRemove(t){const e=this.outfitDraft;if(!e)return;const i=e.removed.includes(t)?e.removed.filter(a=>a!==t):[...e.removed,t],s={...e.staged};e.removed.includes(t)||delete s[t],this.outfitDraft={...e,removed:i,staged:s}}renderSlot(t,e,i,s){const a=this.isActivity(e)?0:t.level,r=J(e,a),n=t.staged[r],l=t.removed.includes(r),p=!n&&t.id&&t.existing.includes(r)?u.libbyEmotionURL(t.id,e,a,this.outfitCoverVersion):"";return o`
      <label
        class="slot ${l?"removed":""}"
        @dragover=${h=>{h.preventDefault(),h.currentTarget.classList.add("dragover")}}
        @dragleave=${h=>h.currentTarget.classList.remove("dragover")}
        @drop=${h=>{var f,b;h.preventDefault(),h.currentTarget.classList.remove("dragover"),this.stageEmotion(e,(b=(f=h.dataTransfer)==null?void 0:f.files)==null?void 0:b[0])}}
      >
        ${n?o`<img src=${n} alt=${i} />`:p?o`<img src=${p} alt=${i} />`:o`<div class="drop-hint">Drop an image here<br />or click to browse</div>`}
        ${p||n?o`<span class="slot-actions">
          ${p&&t.id?o`<button type="button" class="slot-act" title="Edit this sprite in the studio — adjust the cutout, redo it, or replace it"
            @click=${h=>{h.preventDefault(),h.stopPropagation(),this.requestEdit(t.id,e,a)}}>
            <span class="material-symbols-rounded" style="font-size:16px;">edit</span></button>`:c}
          <button type="button" class="slot-act danger" title=${l?"Keep this sprite after all":n?"Discard the dropped picture":"Remove this sprite on save"}
            @click=${h=>{h.preventDefault(),h.stopPropagation(),n?this.unstage(r):this.toggleRemove(r)}}>
            <span class="material-symbols-rounded" style="font-size:16px;">${l?"undo":"delete"}</span></button>
        </span>`:c}
        <div class="slot-label">${i}${l?" — removing":""}</div>
        <div class="slot-hint">${s}</div>
        <input
          type="file"
          accept="image/*"
          style="display:none;"
          @change=${h=>{var b;const f=h.target;this.stageEmotion(e,(b=f.files)==null?void 0:b[0]),f.value=""}}
        />
      </label>
    `}renderCoverPicker(t){const e=t.cover||(t.id&&t.hasCover?u.libbyOutfitThumbURL(t.id,this.outfitCoverVersion):"");return o`<div class="cover-picker">
      ${e?o`<img src=${e} alt="Outfit cover" />`:o`<div class="cover-blank">No cover</div>`}
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
          ${t.cover||t.hasCover?o`<button class="outfit-btn" @click=${()=>this.clearCover()}>Use outfit art</button>`:c}
        </div>
      </div>
    </div>`}stageCover(t){if(!t||!t.type.startsWith("image/")||!this.outfitDraft)return;const e=new FileReader;e.onload=()=>{this.outfitDraft&&(this.outfitDraft={...this.outfitDraft,cover:String(e.result)})},e.readAsDataURL(t)}async clearCover(){const t=this.outfitDraft;if(t&&(this.outfitDraft={...t,cover:void 0,hasCover:!1},!!t.id))try{await u.clearLibbyOutfitThumb(t.id),this.outfitCoverVersion=Date.now(),await this.loadOutfits()}catch(e){this.outfitError=e.message}}stageEmotion(t,e){if(!e||!e.type.startsWith("image/")||!this.outfitDraft)return;const i=J(t,this.isActivity(t)?0:this.outfitDraft.level),s=new FileReader;s.onload=()=>{this.outfitDraft&&(this.outfitDraft={...this.outfitDraft,staged:{...this.outfitDraft.staged,[i]:String(s.result)},removed:this.outfitDraft.removed.filter(a=>a!==i)})},s.readAsDataURL(e)}unstage(t){const e=this.outfitDraft;if(!e)return;const i={...e.staged};delete i[t],this.outfitDraft={...e,staged:i}}requestEdit(t,e,i){this.outfitDraft=null,this.dispatchEvent(new CustomEvent("edit-slot",{detail:{outfitId:t,slot:e,level:i},bubbles:!0,composed:!0}))}async saveOutfit(){const t=this.outfitDraft;if(!(!t||!t.name.trim()||this.outfitBusy)){this.outfitBusy=!0;try{const e=await u.saveLibbyOutfit({id:t.id,name:t.name.trim()});for(const i of t.removed){const[s,a]=i.split(":");await u.deleteLibbyEmotion(e.id,s,Number(a)).catch(()=>{})}for(const[i,s]of Object.entries(t.staged)){const[a,r]=i.split(":");await u.setLibbyEmotion(e.id,a,s,Number(r))}this.outfitCoverVersion=Date.now(),t.cover&&(await u.setLibbyOutfitThumb(e.id,t.cover),this.outfitCoverVersion=Date.now()),this.outfitDraft=null,await this.loadOutfits()}catch(e){this.outfitError=e.message}finally{this.outfitBusy=!1}}}async deleteOutfit(){var s;const t=this.outfitDraft;if(!(t!=null&&t.id)||this.outfitBusy)return;const e=((s=this.outfits.find(a=>a.id===t.id))==null?void 0:s.wip)??0,i=e?`

This also deletes ${e} generated square${e===1?"":"s"} the outfit studio is holding for it.`:"";if(confirm(`Delete the “${t.name}” outfit?${i}`)){this.outfitBusy=!0;try{await u.deleteLibbyOutfit(t.id);const a=it("libraryDelete");I(a.message,"success",{emotion:a.emotion,intensity:a.intensity}),this.wornOutfit===t.id&&this.wearOutfit(""),this.outfitDraft=null,await this.loadOutfits()}catch(a){this.outfitError=a.message}finally{this.outfitBusy=!1}}}renderOutfitCard(t){const e=this.wornOutfit===t.id,i=t.slots??t.emotions.length;return o`<button
      class="outfit-card ${e?"on":""}"
      @click=${()=>this.wearOutfit(e?"":t.id)}
      title=${e?`Take off “${t.name}”`:`Wear “${t.name}”`}
    >
      ${t.hasThumb===!1?o`<div class="cover-empty">No art yet</div>`:o`<img
            class="cover"
            src=${u.libbyOutfitThumbURL(t.id,this.outfitCoverVersion)}
            alt=${t.name}
            loading="lazy"
            @error=${s=>{s.target.replaceWith(Object.assign(document.createElement("div"),{className:"cover-empty",textContent:"No art yet"}))}}
          />`}
      ${e?o`<span class="worn-badge">Wearing</span>`:c}
      <span
        class="card-build"
        role="button"
        tabindex="0"
        title=${`Open “${t.name}” on the board to generate or fix its squares`}
        @click=${s=>{s.stopPropagation(),this.requestBuild(t.id)}}
        @keydown=${s=>{s.key!=="Enter"&&s.key!==" "||(s.preventDefault(),s.stopPropagation(),this.requestBuild(t.id))}}
      >Build</span>
      <span
        class="card-edit"
        role="button"
        tabindex="0"
        title=${`Edit “${t.name}”`}
        @click=${s=>{s.stopPropagation(),this.openOutfitEditor(t)}}
        @keydown=${s=>{s.key!=="Enter"&&s.key!==" "||(s.preventDefault(),s.stopPropagation(),this.openOutfitEditor(t))}}
      >Edit</span>
      <div class="card-body">
        <div class="card-name">${t.name}</div>
        <div class="card-meta">
          ${t.emotions.length}/${Ot.length} emotions${i>t.emotions.length?o` · ${i} images`:c}${t.activitySlots?o` · ${t.activitySlots} misc`:c}
          <!-- Unfinished squares are the reason a wardrobe with no sprites is not an
               empty wardrobe: they are hours of generation the studio is holding. -->
          ${t.wip?o`<br />${t.wip} in progress`:c}
        </div>
      </div>
    </button>`}requestBuild(t){this.dispatchEvent(new CustomEvent("build-outfit",{detail:{outfitId:t},bubbles:!0,composed:!0}))}renderOutfitEditor(t){return o`
      <div class="outfit-overlay" @click=${e=>{e.target===e.currentTarget&&(this.outfitDraft=null)}}>
        <div class="outfit-dialog">
          <h3>${t.id?"Edit outfit":"New outfit"}</h3>
          <input
            type="text"
            placeholder="Outfit name (Summer dress, Maid, …)"
            .value=${t.name}
            @input=${e=>this.outfitDraft={...t,name:e.target.value}}
          />
          <div class="tier-tabs">
            ${ut.map((e,i)=>o`<button
                class="tier-tab ${t.level===i?"on":""}"
                @click=${()=>this.outfitDraft={...t,level:i}}
                title="Shown as the horniness meter reaches this tier"
              >${e}</button>`)}
          </div>
          <p class="tier-note">
            ${t.level===0?"Baseline art — worn when the meter is low, and the fallback for any tier you leave empty.":`Shown as Libby’s horniness meter climbs into the “${ut[t.level]}” range.`}
          </p>
          ${this.renderCoverPicker(t)}
          <div class="slots">
            ${Ot.map(e=>this.renderSlot(t,e.id,e.label,e.borrows?`${e.hint} · Optional, borrows ${e.borrows}`:e.hint))}
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
              ${this.activities.map(e=>this.renderSlot(t,e.id,e.auto?`${e.label} — while she writes`:e.label,e.auto?"Shown with a speech bubble while a reply is on its way; she never picks it herself":e.minIntensity>1?`${e.says} · from tier ${ut[e.minIntensity-1]}`:e.says))}
            </div>
          `:c}
          <div class="outfit-actions">
            ${t.id?o`<button class="outfit-btn danger" ?disabled=${this.outfitBusy} @click=${()=>this.deleteOutfit()}>
                  Delete outfit
                </button>`:c}
            <button class="outfit-btn" @click=${()=>this.outfitDraft=null}>Cancel</button>
            <button
              class="btn-primary"
              ?disabled=${!t.name.trim()||this.outfitBusy}
              @click=${()=>this.saveOutfit()}
            >
              ${this.outfitBusy?"Saving…":"Save outfit"}
            </button>
          </div>
        </div>
      </div>
    `}};L.styles=[gt,mt`
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
  `];E([d()],L.prototype,"outfits",2);E([d()],L.prototype,"activities",2);E([d()],L.prototype,"backgrounds",2);E([d()],L.prototype,"defaultBackground",2);E([d()],L.prototype,"backgroundDraft",2);E([d()],L.prototype,"backgroundBusy",2);E([d()],L.prototype,"backgroundVersion",2);E([d()],L.prototype,"wornOutfit",2);E([d()],L.prototype,"outfitDraft",2);E([d()],L.prototype,"outfitBusy",2);E([d()],L.prototype,"outfitError",2);E([d()],L.prototype,"outfitCoverVersion",2);L=E([bt("oppai-outfit-wardrobe")],L);const si=new TextEncoder;function T(t,e,i){t.setUint16(e,i,!0)}function B(t,e,i){t.setUint32(e,i>>>0,!0)}let nt;function ai(t){if(!nt){nt=new Uint32Array(256);for(let i=0;i<256;i++){let s=i;for(let a=0;a<8;a++)s=s&1?3988292384^s>>>1:s>>>1;nt[i]=s>>>0}}let e=4294967295;for(const i of t)e=nt[(e^i)&255]^e>>>8;return(e^4294967295)>>>0}function oi(t){return{date:Math.min(2107,Math.max(1980,t.getFullYear()))-1980<<9|t.getMonth()+1<<5|t.getDate(),time:t.getHours()<<11|t.getMinutes()<<5|Math.floor(t.getSeconds()/2)}}function ri(t){return t.buffer instanceof ArrayBuffer?t.byteOffset===0&&t.byteLength===t.buffer.byteLength?t.buffer:t.buffer.slice(t.byteOffset,t.byteOffset+t.byteLength):t.slice().buffer}async function ni(t){return t instanceof Uint8Array?t:t instanceof ArrayBuffer?new Uint8Array(t):new Uint8Array(await t.arrayBuffer())}async function li(t,e=new Date){if(t.length>65535)throw new Error("Too many files for one ZIP archive.");const i=oi(e),s=[],a=[];let r=0;for(const b of t){const x=b.name.replaceAll("\\","_").replaceAll("/","_")||"file",w=si.encode(x),$=await ni(b.data);if(w.length>65535||$.length>4294967295)throw new Error(`File is too large for ZIP: ${x}`);const z=ai($),S=new Uint8Array(30+w.length),C=new DataView(S.buffer);B(C,0,67324752),T(C,4,20),T(C,6,2048),T(C,8,0),T(C,10,i.time),T(C,12,i.date),B(C,14,z),B(C,18,$.length),B(C,22,$.length),T(C,26,w.length),T(C,28,0),S.set(w,30),s.push({header:S,data:$});const P=new Uint8Array(46+w.length),k=new DataView(P.buffer);B(k,0,33639248),T(k,4,20),T(k,6,20),T(k,8,2048),T(k,10,0),T(k,12,i.time),T(k,14,i.date),B(k,16,z),B(k,20,$.length),B(k,24,$.length),T(k,28,w.length),T(k,30,0),T(k,32,0),T(k,34,0),T(k,36,0),B(k,38,0),B(k,42,r),P.set(w,46),a.push(P),r+=S.length+$.length}const n=a.reduce((b,x)=>b+x.length,0),l=new Uint8Array(22),p=new DataView(l.buffer);B(p,0,101010256),T(p,4,0),T(p,6,0),T(p,8,t.length),T(p,10,t.length),B(p,12,n),B(p,16,r),T(p,20,0);const f=[...s.flatMap(b=>[b.header,b.data]),...a,l].map(ri);return new Blob(f,{type:"application/zip"})}var di=Object.defineProperty,pi=Object.getOwnPropertyDescriptor,R=(t,e,i,s)=>{for(var a=s>1?void 0:s?pi(e,i):e,r=t.length-1,n;r>=0;r--)(n=t[r])&&(a=(s?n(e,i,a):n(a))||a);return s&&a&&di(e,i,a),a};const ci=40;let D=class extends ft{constructor(){super(...arguments),this.boards=[],this.board="none",this.items=[],this.total=0,this.loading=!1,this.error="",this.expanded=null,this.busy=!1,this.newBoard="",this.savedNames=new Set,this.selecting=!1,this.selected=new Set,this.metadata=new Map}connectedCallback(){super.connectedCallback(),me(this,"generation gallery"),this.refresh()}get selectedBoard(){return this.board}announceBoard(){this.dispatchEvent(new CustomEvent("board-changed",{detail:{board:this.board},bubbles:!0,composed:!0}))}async refresh(){this.error="";try{const t=await u.galleryBoards();this.boards=t.boards,!this.boards.some(e=>e.id===this.board)&&this.boards.length&&(this.board=this.boards[0].id),this.announceBoard()}catch(t){this.error=t.message;return}await this.loadPage(!0)}async loadPage(t){if(!this.loading){this.loading=!0;try{const e=t?0:this.items.length,i=await u.galleryImages(this.board,e,ci);this.items=t?i.items:[...this.items,...i.items],this.total=i.total}catch(e){this.error=e.message}finally{this.loading=!1}}}pickBoard(t){this.board!==t&&(this.board=t,this.items=[],this.announceBoard(),this.loadPage(!0))}async createBoard(){const t=this.newBoard.trim();if(!(!t||this.busy)){this.busy=!0,this.error="";try{const e=await u.createGalleryBoard(t);this.newBoard="",await this.refresh(),this.pickBoard(e.id),this.dispatchEvent(new CustomEvent("boards-changed",{bubbles:!0,composed:!0}))}catch(e){this.error=e.message}finally{this.busy=!1}}}async deleteBoard(){const t=this.boards.find(e=>e.id===this.board);if(!(!t||t.id==="none"||this.busy)&&confirm(`Delete the “${t.name}” gallery? Its images move back to Uncategorized.`)){this.busy=!0,this.error="";try{await u.deleteGalleryBoard(t.id);const e=it("galleryDelete");I(e.message,"success",{emotion:e.emotion,intensity:e.intensity}),this.board="none",this.items=[],await this.refresh(),this.dispatchEvent(new CustomEvent("boards-changed",{bubbles:!0,composed:!0}))}catch(e){this.error=e.message}finally{this.busy=!1}}}async deleteImage(t){var e;if(!this.busy){this.busy=!0;try{await u.deleteGalleryImage(t.name);const i=it("galleryDelete");I(i.message,"success",{emotion:i.emotion,intensity:i.intensity}),this.items=this.items.filter(s=>s.name!==t.name),this.total=Math.max(0,this.total-1),this.boards=this.boards.map(s=>s.id===this.board?{...s,count:Math.max(0,s.count-1)}:s),((e=this.expanded)==null?void 0:e.name)===t.name&&(this.expanded=null)}catch(i){this.error=i.message}finally{this.busy=!1}}}async saveToLibrary(t){if(!(this.busy||this.savedNames.has(t.name))){this.busy=!0;try{await u.saveGalleryImage({name:t.name}),this.savedNames=new Set(this.savedNames).add(t.name),this.dispatchEvent(new CustomEvent("imported",{detail:{count:1,kind:"image",title:t.name},bubbles:!0,composed:!0}))}catch(e){this.error=e.message}finally{this.busy=!1}}}async openShareMenu(t,e,i){let s=[];try{s=(await u.chatWorkspace()).characters??[]}catch(a){I(a.message||"Couldn't load your chat characters.","error");return}if(!s.length){I("No chat characters yet — add one in Chat first.","error");return}Tt({x:e,y:i,title:"Show this to",items:s.map(a=>({label:a.name,icon:"person",run:()=>void this.share(t,a)}))})}async imageInfo(t){const e=this.metadata.get(t.name);if(e)return e;const i=Ce(await u.galleryImageMetadata(t.name));return this.metadata.set(t.name,i),i}openImageMenu(t,e){e.preventDefault(),Tt({x:e.clientX,y:e.clientY,title:t.name,items:[{label:"Copy generation metadata",icon:"content_copy",run:()=>void this.copyMetadata(t)},{label:"Use same generation parameters",icon:"replay",run:()=>void this.reuseMetadata(t)},{label:"Export PNG for Civitai",icon:"download",run:()=>void this.exportImage(t)},{label:"Send to chat",icon:"forum",run:()=>void this.openShareMenu(t,e.clientX,e.clientY)}]})}async copyMetadata(t){try{if(!await ne(V(await this.imageInfo(t))))throw new Error("Clipboard permission was denied.");I("Generation metadata copied.","success")}catch(e){I(e.message||"Couldn't copy generation metadata.","error")}}async reuseMetadata(t){try{const e=await this.imageInfo(t);this.dispatchEvent(new CustomEvent("reuse-generation",{detail:e,bubbles:!0,composed:!0}))}catch(e){I(e.message||"Couldn't load generation metadata.","error")}}async exportImage(t){try{const e=await this.imageInfo(t),i=t.name.replace(/\.[a-z0-9]+$/i,"")||"generated-image";await le(u.galleryFullURL(t.name),`${i}-civitai.png`,V(e),et(e)),I("PNG exported with Civitai metadata.","success")}catch(e){I(e.message||"Couldn't export that image.","error")}}async share(t,e){try{await fe(u.galleryFullURL(t.name),e.id,t.name),this.expanded=null,this.dispatchEvent(new CustomEvent("open-chat",{bubbles:!0,composed:!0}))}catch(i){I(i.message||`Couldn't share with ${e.name}.`,"error")}}toggleSelecting(){this.selecting=!this.selecting,this.selecting||(this.selected=new Set)}toggleSelected(t){const e=new Set(this.selected);e.has(t)?e.delete(t):e.add(t),this.selected=e}async deleteSelected(){const t=[...this.selected];if(!(!t.length||this.busy)){this.busy=!0;try{await u.deleteGalleryImages(t);const e=it("galleryDelete",{count:t.length});I(e.message,"success",{emotion:e.emotion,intensity:e.intensity});const i=this.selected;this.items=this.items.filter(s=>!i.has(s.name)),this.total=Math.max(0,this.total-t.length),this.boards=this.boards.map(s=>s.id===this.board?{...s,count:Math.max(0,s.count-t.length)}:s),this.selected=new Set,this.selecting=!1}catch(e){this.error=e.message}finally{this.busy=!1}}}async addSelectedToBoard(t){const e=[...this.selected];if(!(!e.length||!t||t===this.board||this.busy)){this.busy=!0;try{await u.addGalleryImagesToBoard(t,e);const i=this.selected;this.items=this.items.filter(s=>!i.has(s.name)),this.total=Math.max(0,this.total-e.length),this.selected=new Set,this.selecting=!1,await this.refresh()}catch(i){this.error=i.message}finally{this.busy=!1}}}render(){const t=this.boards.find(e=>e.id===this.board);return o`
      <div class="panel">
        <div class="head">
          <span class="material-symbols-rounded" style="font-size:18px;">photo_library</span>
          Invoke gallery
          <span class="count">${t?`${this.total||t.count} images`:""}</span>
          ${this.items.length?o`<button class="sel-toggle ${this.selecting?"on":""}"
                @click=${()=>this.toggleSelecting()}>
                ${this.selecting?"Done":"Select"}
              </button>`:c}
        </div>
        ${this.selecting?o`<div class="sel-bar">
              <span class="sel-count">${this.selected.size} selected</span>
              <select class="sel-move" aria-label="Move to gallery" .value=${""}
                ?disabled=${this.busy||!this.selected.size}
                @change=${e=>{const i=e.target;this.addSelectedToBoard(i.value),i.value=""}}>
                <option value="">Add to gallery…</option>
                ${this.boards.filter(e=>e.id!==this.board).map(e=>o`<option value=${e.id}>${e.name}</option>`)}
              </select>
              <button class="sel-del" ?disabled=${this.busy||!this.selected.size}
                @click=${()=>this.deleteSelected()}>
                <span class="material-symbols-rounded" style="font-size:15px; vertical-align:-3px;">delete</span>
                Delete
              </button>
            </div>`:c}
        ${this.boards.length?o`
              <select class="board-select" aria-label="Gallery" .value=${this.board}
                @change=${e=>this.pickBoard(e.target.value)}>
                ${this.boards.map(e=>o`<option value=${e.id}>${e.name}${e.count?` · ${e.count}`:""}</option>`)}
              </select>
              ${this.boards.length<=6?o`<div class="boards">
                ${this.boards.map(e=>o`<button class="board ${e.id===this.board?"on":""}"
                    @click=${()=>this.pickBoard(e.id)}>${e.name}${e.count?` · ${e.count}`:""}</button>`)}
              </div>`:c}
              ${this.board!=="none"?o`<button class="board-del" ?disabled=${this.busy}
                    title="Delete this gallery (its images move to Uncategorized)"
                    @click=${()=>this.deleteBoard()}>
                    <span class="material-symbols-rounded" style="font-size:15px; vertical-align:-3px;">delete</span>
                    Delete gallery
                  </button>`:c}
            `:c}
        <div class="note">New generations are filed into ${(t==null?void 0:t.name)??"this gallery"}.</div>
        <div class="new-board">
          <input maxlength="300" placeholder="New Invoke gallery" .value=${this.newBoard}
            @input=${e=>this.newBoard=e.target.value}
            @keydown=${e=>{e.key==="Enter"&&this.createBoard()}} />
          <button ?disabled=${this.busy||!this.newBoard.trim()} @click=${()=>this.createBoard()}>Create</button>
        </div>
        ${this.error?o`<div class="err">${this.error}</div>`:c}
        ${this.items.length?o`<div class="grid">
              ${this.items.map(e=>{const i=this.selected.has(e.name);return o`
                  <button
                    class="tile ${this.selecting?"selectable":""} ${i?"picked":""}"
                    title=${e.name}
                    @contextmenu=${s=>{this.selecting||(s.preventDefault(),this.openImageMenu(e,s))}}
                    @click=${()=>this.selecting?this.toggleSelected(e.name):this.expanded=e}
                  >
                    <img src=${u.galleryThumbURL(e.name)} alt="Generated image" loading="lazy" />
                    ${this.selecting?o`<span class="check">
                          <span class="material-symbols-rounded" style="font-size:15px;">
                            ${i?"check_circle":"radio_button_unchecked"}
                          </span>
                        </span>`:o`<span
                          class="del"
                          role="button"
                          title="Delete from InvokeAI"
                          @click=${s=>{s.stopPropagation(),this.deleteImage(e)}}
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
    `}renderExpanded(t){const e=this.savedNames.has(t.name);return o`
      <div class="overlay" @click=${i=>{i.target===i.currentTarget&&(this.expanded=null)}}>
        <img src=${u.galleryFullURL(t.name)} alt="Generated image"
          @contextmenu=${i=>this.openImageMenu(t,i)} />
        <div class="overlay-actions">
          <button class="obtn primary" ?disabled=${this.busy||e} @click=${()=>this.saveToLibrary(t)}>
            <span class="material-symbols-rounded" style="font-size:17px;">${e?"check":"save"}</span>
            ${e?"In library":"Save to library"}
          </button>
          <button class="obtn" ?disabled=${this.busy}
            @click=${i=>void this.openShareMenu(t,i.clientX,i.clientY)}>
            <span class="material-symbols-rounded" style="font-size:17px;">forum</span> Send to chat
          </button>
          <button class="obtn" @click=${()=>this.dispatchEvent(new CustomEvent("cut-out",{detail:{url:u.galleryFullURL(t.name),name:t.name},bubbles:!0,composed:!0}))}>
            <span class="material-symbols-rounded" style="font-size:17px;">background_replace</span> Cut out
          </button>
          <button class="obtn" ?disabled=${this.busy} @click=${()=>void this.exportImage(t)}>
            <span class="material-symbols-rounded" style="font-size:17px;">download</span> Export for Civitai
          </button>
          <button class="obtn danger" ?disabled=${this.busy} @click=${()=>this.deleteImage(t)}>
            <span class="material-symbols-rounded" style="font-size:17px;">delete</span> Delete
          </button>
          <button class="obtn" @click=${()=>this.expanded=null}>
            <span class="material-symbols-rounded" style="font-size:17px;">close</span> Close
          </button>
        </div>
      </div>
    `}};D.styles=[gt,Rt,mt`
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
    `];R([d()],D.prototype,"boards",2);R([d()],D.prototype,"board",2);R([d()],D.prototype,"items",2);R([d()],D.prototype,"total",2);R([d()],D.prototype,"loading",2);R([d()],D.prototype,"error",2);R([d()],D.prototype,"expanded",2);R([d()],D.prototype,"busy",2);R([d()],D.prototype,"newBoard",2);R([d()],D.prototype,"savedNames",2);R([d()],D.prototype,"selecting",2);R([d()],D.prototype,"selected",2);D=R([bt("oppai-invoke-gallery")],D);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Et extends be{constructor(e){if(super(e),this.it=c,e.type!==ve.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(e){if(e===c||e==null)return this._t=void 0,this.it=e;if(e===ye)return e;if(typeof e!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(e===this.it)return this._t;this.it=e;const i=[e];return i.raw=i,this._t={_$litType$:this.constructor.resultType,strings:i,values:[]}}}Et.directiveName="unsafeHTML",Et.resultType=1;const Zt=xe(Et);function hi(t,e){if(t.length===0)return e.slice();const i=t.slice(),s=new Set(t.map(a=>a.id));for(const a of e){if(!s.has(a.id)){s.add(a.id),i.push(a);continue}const r=i[i.length-1];if(r.id===a.id){const n=new Set(r.images.map(l=>l.id));i[i.length-1]={...r,images:[...r.images,...a.images.filter(l=>!n.has(l.id))]}}}return i}function Ct(t){var s;const e=t.createdAt??((s=t.images[0])==null?void 0:s.createdAt)??"";if(!e)return"";const i=new Date(e);return Number.isNaN(i.getTime())?"":i.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}const Q={"euler a":"euler_a",euler:"euler","euler karras":"euler_k",lms:"lms","lms karras":"lms_k",heun:"heun","heun karras":"heun_k",dpm2:"kdpm_2","dpm2 karras":"kdpm_2_k","dpm2 a":"kdpm_2_a","dpm2 a karras":"kdpm_2_a_k","dpm++ 2s a":"dpmpp_2s","dpm++ 2s a karras":"dpmpp_2s_k","dpm++ 2m":"dpmpp_2m","dpm++ 2m karras":"dpmpp_2m_k","dpm++ 2m sde":"dpmpp_2m_sde","dpm++ 2m sde karras":"dpmpp_2m_sde_k","dpm++ 3m sde":"dpmpp_3m","dpm++ 3m sde karras":"dpmpp_3m_k","dpm++ sde":"dpmpp_sde","dpm++ sde karras":"dpmpp_sde_k",ddim:"ddim",ddpm:"ddpm",deis:"deis",unipc:"unipc",lcm:"lcm",pndm:"pndm",tcd:"tcd"};function ui(t){if(!t)return"";const e=t.trim().toLowerCase().replace(/\s+/g," ");if(Q[e])return Q[e];if(Object.values(Q).includes(e))return e;const i=e.split(" ");for(let s=i.length-1;s>=1;s--){const a=i.slice(0,s).join(" ");if(Q[a])return Q[a]}return""}function gi(t){const e=/^\s*(\d{2,5})\s*[x×]\s*(\d{2,5})\s*$/i.exec(t??"");if(!e)return null;const i=Number(e[1]),s=Number(e[2]);return i>=64&&s>=64?[i,s]:null}function Jt(t){var r;const e=(t.prompt??"").trim();if(!e)return null;const i={prompt:e};(r=t.negativePrompt)!=null&&r.trim()&&(i.negativePrompt=t.negativePrompt.trim());const s=ui(t.sampler);s&&(i.sampler=s),t.steps&&t.steps>0&&t.steps<=150&&(i.steps=Math.round(t.steps)),t.cfgScale&&t.cfgScale>0&&t.cfgScale<=30&&(i.cfgScale=t.cfgScale),t.seed&&t.seed>0&&(i.seed=t.seed);const a=gi(t.size)??(t.width>=64&&t.height>=64?[t.width,t.height]:null);return a&&([i.width,i.height]=a),i}var mi=Object.defineProperty,fi=Object.getOwnPropertyDescriptor,y=(t,e,i,s)=>{for(var a=s>1?void 0:s?fi(e,i):e,r=t.length-1,n;r>=0;r--)(n=t[r])&&(a=(s?n(e,i,a):n(a))||a);return s&&a&&mi(e,i,a),a};const bi=[{id:"",label:"All"},{id:"checkpoint",label:"Checkpoints"},{id:"lora",label:"LoRAs"},{id:"embedding",label:"Embeddings"},{id:"vae",label:"VAEs"},{id:"controlnet",label:"ControlNet"},{id:"upscaler",label:"Upscalers"}],vi=[{id:"",label:"Most downloaded"},{id:"rated",label:"Highest rated"},{id:"liked",label:"Most liked"},{id:"newest",label:"Newest"},{id:"collected",label:"Most collected"},{id:"discussed",label:"Most discussed"},{id:"images",label:"Most images"}],yi=[{id:"",label:"All time"},{id:"year",label:"This year"},{id:"month",label:"This month"},{id:"week",label:"This week"},{id:"day",label:"Today"}],xi=["SD 1.5","SD 2.1","SDXL 1.0","Pony","Illustrious","NoobAI","Flux.1 D","Flux.1 S","SD 3.5","Kolors","Hunyuan 1","Wan Video"];let v=class extends ft{constructor(){super(...arguments),this.tab="browse",this.q="",this.type="",this.sort="",this.period="",this.base="",this.category="",this.creator="",this.nsfw=!0,this.categories=[],this.items=[],this.cursor="",this.loading=!1,this.error="",this.detail=null,this.detailLoading=!1,this.versionId=0,this.shownImage="",this.zoomed="",this.galleryOpen=!1,this.gallery=[],this.galleryCursor="",this.galleryLoading=!1,this.gallerySort="",this.picked=null,this.copied=!1,this.promptsNeedKey=!1,this.jobs=[],this.installing=!1,this.jobsOpen=!1,this.me=null,this.meError="",this.meLoading=!1,this.accountTab="models",this.myImages=[],this.myImagesCursor="",this.myModels=[],this.myModelsCursor="",this.myModelsLoading=!1,this.posts=[],this.postsCursor="",this.postsLoading=!1,this.openPost=null,this.collections=[],this.collectionsCursor="",this.collectionsLoading=!1,this.collectionQuery="",this.collectionSort="newest",this.openCollection=null,this.collectionImages=[],this.collectionImagesCursor="",this.installed=[],this.installedLoading=!1,this.installedError="",this.installedFilter="all",this.syncing="",this.syncNote="",this.pinning="",this.pinVersion="",this.manageKey="",this.managePage=null,this.manageVersion=0,this.manageBusy=!1}connectedCallback(){super.connectedCallback(),this.search(!0),this.loadCategories(),this.pollJobs(),this.jobTimer=window.setInterval(()=>void this.pollJobs(),5e3)}disconnectedCallback(){super.disconnectedCallback(),this.jobTimer&&clearInterval(this.jobTimer)}async loadCategories(){try{this.categories=(await u.civitaiCategories()).categories}catch{this.categories=[]}}async pollJobs(){try{const e=(await u.civitaiInstalls()).jobs.filter(s=>s.status!=="cancelled").slice(0,5),i=e.some(s=>s.status==="completed")&&!this.jobs.some(s=>s.status==="completed");this.jobs=e,i&&this.tab==="installed"&&this.loadInstalled(!1)}catch{}}async search(t){if(!this.loading){this.loading=!0,this.error="";try{const e=await u.civitaiSearch({q:this.q||void 0,type:this.type||void 0,category:this.category||void 0,sort:this.sort||void 0,period:this.period||void 0,base:this.base||void 0,creator:this.creator||void 0,nsfw:this.nsfw,cursor:t?void 0:this.cursor||void 0});this.items=t?e.items:[...this.items,...e.items],this.cursor=e.nextCursor??""}catch(e){this.error=e.message}finally{this.loading=!1}}}setAnd(t,e){switch(t){case"type":this.type=e;break;case"sort":this.sort=e;break;case"period":this.period=e;break;case"base":this.base=e;break;case"category":this.category=e;break;case"creator":this.creator=e;break}this.tab="browse",this.search(!0)}async openDetail(t){const e=typeof t=="number"?t:t.id;if(typeof t!="number"){this.detail=t;const i=t.versions[0];this.versionId=(i==null?void 0:i.id)??0,this.shownImage=(i==null?void 0:i.images[0])??""}else this.detail=null;this.galleryOpen=!1,this.gallery=[],this.galleryCursor="",this.detailLoading=!0;try{const i=await u.civitaiModel(e);this.detail=i;const s=i.versions.find(a=>a.id===this.versionId)??i.versions[0];this.versionId=(s==null?void 0:s.id)??0,this.shownImage=(s==null?void 0:s.images[0])??this.shownImage}catch(i){this.error=i.message,this.detail||(this.detail=null)}finally{this.detailLoading=!1}}closeDetail(){this.detail=null,this.galleryOpen=!1,this.picked=null}currentVersion(){var t;return(t=this.detail)==null?void 0:t.versions.find(e=>e.id===this.versionId)}pickVersion(t){this.versionId=t.id,this.shownImage=t.images[0]??"",this.galleryOpen&&(this.gallery=[],this.galleryCursor="",this.loadGallery(!0))}async install(t){if(!(this.installing||!t.downloadUrl||!this.detail)){this.installing=!0,this.error="";try{await u.civitaiInstall(t.downloadUrl,{modelId:this.detail.id,versionId:t.id}),await this.pollJobs()}catch(e){this.error=e.message}finally{this.installing=!1}}}async loadGallery(t,e){if(!this.galleryLoading){this.galleryLoading=!0;try{const i=await u.civitaiImages({versionId:e?void 0:this.versionId||void 0,username:e,sort:this.gallerySort||void 0,nsfw:this.nsfw,cursor:t?void 0:this.galleryCursor||void 0});e?(this.myImages=t?i.items:[...this.myImages,...i.items],this.myImagesCursor=i.nextCursor??""):(this.gallery=t?i.items:[...this.gallery,...i.items],this.galleryCursor=i.nextCursor??"",this.promptsNeedKey=i.items.length>0&&i.withPrompts===0&&!i.keySet)}catch(i){this.error=i.message}finally{this.galleryLoading=!1}}}toggleGallery(){this.galleryOpen=!this.galleryOpen,this.galleryOpen&&this.gallery.length===0&&this.loadGallery(!0)}usePrompt(t){const e=Jt(t);e&&(this.dispatchEvent(new CustomEvent("use-prompt",{detail:e,bubbles:!0,composed:!0})),this.picked=null,this.zoomed="")}async copyPrompt(t){try{await navigator.clipboard.writeText(t.prompt??""),this.copied=!0,setTimeout(()=>this.copied=!1,1500)}catch{}}async loadMe(){if(!this.meLoading){if(this.me){this.loadAccountTab(!1);return}this.meLoading=!0,this.meError="";try{this.me=await u.civitaiMe(),this.myImages=[],this.myImagesCursor="",this.loadMyImages(!0).then(()=>this.loadAccountTab(!1))}catch(t){this.meError=t.message}finally{this.meLoading=!1}}}selectAccountTab(t){this.accountTab=t,this.openPost=null,this.openCollection=null,this.loadAccountTab(!1)}loadAccountTab(t){if(!this.me)return Promise.resolve();switch(this.accountTab){case"models":return t||this.myModels.length===0?this.loadMyModels(!t):Promise.resolve();case"posts":return t||this.posts.length===0?this.loadPosts(!t):Promise.resolve();case"images":return t||this.myImages.length===0?this.loadMyImages(!t):Promise.resolve();case"collections":return t||this.collections.length===0?this.loadCollections(!t):Promise.resolve()}}async loadMyImages(t){if(!(!this.me||this.galleryLoading)){this.galleryLoading=!0;try{const e=await u.civitaiImages({username:this.me.username,sort:"newest",nsfw:this.nsfw,cursor:t?void 0:this.myImagesCursor||void 0});this.myImages=t?e.items:[...this.myImages,...e.items],this.myImagesCursor=e.nextCursor??""}catch(e){this.meError=e.message}finally{this.galleryLoading=!1}}}async loadMyModels(t){if(!(!this.me||this.myModelsLoading)){this.myModelsLoading=!0;try{const e=await u.civitaiSearch({creator:this.me.username,sort:"newest",nsfw:this.nsfw,cursor:t?void 0:this.myModelsCursor||void 0});this.myModels=t?e.items:[...this.myModels,...e.items],this.myModelsCursor=e.nextCursor??""}catch(e){this.meError=e.message}finally{this.myModelsLoading=!1}}}async loadPosts(t){if(!(!this.me||this.postsLoading)){this.postsLoading=!0;try{const e=await u.civitaiPosts({username:this.me.username,nsfw:this.nsfw,cursor:t?void 0:this.postsCursor||void 0});this.posts=t?e.items:hi(this.posts,e.items),this.postsCursor=e.nextCursor??""}catch(e){this.meError=e.message}finally{this.postsLoading=!1}}}async loadCollections(t){if(!this.collectionsLoading){this.collectionsLoading=!0;try{const e=await u.civitaiCollections({q:this.collectionQuery||void 0,sort:this.collectionSort,cursor:t?void 0:this.collectionsCursor||void 0});this.collections=t?e.items:[...this.collections,...e.items],this.collectionsCursor=e.nextCursor??""}catch(e){this.meError=e.message}finally{this.collectionsLoading=!1}}}async openCollectionPictures(t,e){if(!this.galleryLoading){e&&(this.openCollection=t,this.collectionImages=[],this.collectionImagesCursor=""),this.galleryLoading=!0;try{const i=await u.civitaiImages({collectionId:t.id,sort:"newest",nsfw:this.nsfw,cursor:e?void 0:this.collectionImagesCursor||void 0});this.collectionImages=e?i.items:[...this.collectionImages,...i.items],this.collectionImagesCursor=i.nextCursor??""}catch(i){this.meError=i.message}finally{this.galleryLoading=!1}}}async loadInstalled(t){if(!this.installedLoading){this.installedLoading=!0,this.installedError="";try{this.installed=(await u.civitaiInstalled(t)).models}catch(e){this.installedError=e.message}finally{this.installedLoading=!1}}}async sync(t,e){if(!this.syncing){this.syncing=t.key,this.syncNote="";try{const i=await u.civitaiSync(t.key,e),s="modelId"in i&&i.modelId;this.syncNote=s?`${t.name}: cover, description and trigger words set from “${i.modelName}”.`:`${t.name}: Civitai does not know this file. Paste a version id to link it by hand.`,this.pinning="",this.pinVersion="",await this.loadInstalled(!1)}catch(i){this.syncNote=`${t.name}: ${i.message}`}finally{this.syncing=""}}}async manage(t){if(this.manageKey===t.key){this.manageKey="",this.managePage=null;return}const e=t.civitai;if(e){this.manageKey=t.key,this.managePage=null,this.manageVersion=e.versionId;try{const i=await u.civitaiModel(e.modelId);this.manageKey===t.key&&(this.managePage=i)}catch(i){this.syncNote=`${t.name}: ${i.message}`}}}async chooseCover(t,e){if(!this.manageBusy){this.manageBusy=!0;try{await u.civitaiCover(t.key,e),this.syncNote=`${t.name}: cover set.`,await this.loadInstalled(!1)}catch(i){this.syncNote=`${t.name}: ${i.message}`}finally{this.manageBusy=!1}}}async updateModel(t,e){var a;if(this.manageBusy)return;const i=(a=this.managePage)==null?void 0:a.versions.find(r=>{var n;return r.id===(e??((n=t.civitai)==null?void 0:n.latestVersionId))}),s=i?`version ${i.name}`:"the newest version";if(confirm(`Update “${t.name}” to ${s}? InvokeAI downloads it, then the current file is deleted.`)){this.manageBusy=!0;try{await u.civitaiUpdate(t.key,e),this.syncNote=`${t.name}: downloading ${s}; the current file goes once it is in.`,this.manageKey="",this.managePage=null,await this.pollJobs()}catch(r){this.syncNote=`${t.name}: ${r.message}`}finally{this.manageBusy=!1}}}async deleteInstalled(t){if(!this.manageBusy&&confirm(`Delete “${t.name}” from InvokeAI? The file goes with it.`)){this.manageBusy=!0;try{await u.deleteModel(t.key),this.syncNote=`${t.name}: deleted.`,this.manageKey===t.key&&(this.manageKey="",this.managePage=null),this.installed=this.installed.filter(e=>e.key!==t.key)}catch(e){this.syncNote=`${t.name}: ${e.message}`}finally{this.manageBusy=!1}}}selectTab(t){this.tab=t,this.closeDetail(),t==="account"&&this.loadMe(),t==="installed"&&this.installed.length===0&&this.loadInstalled(!1)}jobLabel(t){return t.status==="downloading"&&t.totalBytes?`downloading ${Math.round((t.bytes??0)/t.totalBytes*100)}%`:t.status}render(){return o`
      <div class="wrap">
        <div class="topbar">
          <h2><span class="material-symbols-rounded">travel_explore</span> Civitai</h2>
          <div class="tabs" role="tablist">
            ${["browse","account","installed"].map(t=>o`<button role="tab" aria-selected=${this.tab===t?"true":"false"}
                class=${this.tab===t?"on":""} @click=${()=>this.selectTab(t)}>
                ${t==="browse"?"Browse":t==="account"?"My account":"Installed"}
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
              ${this.jobs.map(t=>o`<div class="job">
                  <span class="material-symbols-rounded" style="font-size:15px;">download</span>
                  <span class="st ${t.status}">${this.jobLabel(t)}</span>
                  <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.error||t.source}</span>
                </div>`)}
            </div>`:c}
        ${this.tab==="browse"?this.renderBrowse():this.tab==="account"?this.renderAccount():this.renderInstalled()}
      </div>
      ${this.detail?this.renderDetail(this.detail):c}
      ${this.picked?this.renderPicked(this.picked):this.zoomed?o`<div class="zoom plain" @click=${()=>this.zoomed=""}>
            <img src=${u.civitaiImageURL(this.zoomed)} alt="Preview" />
          </div>`:c}
    `}renderJobsChip(){const t=this.jobs.filter(s=>s.status==="downloading"||s.status==="running"||s.status==="waiting"),e=this.jobs.some(s=>s.status==="error"),i=t.length?t.length===1?this.jobLabel(t[0]):`${t.length} downloading`:`${this.jobs.length} download${this.jobs.length===1?"":"s"}`;return o`<button class="chip small jobs-chip ${this.jobsOpen?"on":""}"
      title=${this.jobsOpen?"Hide the install log":"Show the install log"} aria-expanded=${this.jobsOpen?"true":"false"}
      @click=${()=>this.jobsOpen=!this.jobsOpen}>
      <span class="material-symbols-rounded" style="font-size:15px;">${e?"error":"download"}</span> ${i}
      ${t.length?o`<span class="dot"></span>`:c}
    </button>`}renderBrowse(){return o`
      <div class="controls">
        <input
          type="search"
          placeholder="Search models…"
          .value=${this.q}
          @input=${t=>this.q=t.target.value}
          @keydown=${t=>{t.key==="Enter"&&this.search(!0)}}
        />
        <select aria-label="Sort" .value=${this.sort} @change=${t=>this.setAnd("sort",t.target.value)}>
          ${vi.map(t=>o`<option value=${t.id} ?selected=${t.id===this.sort}>${t.label}</option>`)}
        </select>
        <select aria-label="Period" .value=${this.period} @change=${t=>this.setAnd("period",t.target.value)}>
          ${yi.map(t=>o`<option value=${t.id} ?selected=${t.id===this.period}>${t.label}</option>`)}
        </select>
        <select aria-label="Base model" .value=${this.base} @change=${t=>this.setAnd("base",t.target.value)}>
          <option value="">Any base model</option>
          ${xi.map(t=>o`<option value=${t} ?selected=${t===this.base}>${t}</option>`)}
        </select>
        <select aria-label="Category" .value=${this.category} @change=${t=>this.setAnd("category",t.target.value)}>
          <option value="">All categories</option>
          ${this.categories.map(t=>o`<option value=${t.name} ?selected=${t.name===this.category}>${t.name} (${lt(t.count)})</option>`)}
        </select>
        <button class="chip ${this.nsfw?"on":""}" title="Show adult models" aria-pressed=${this.nsfw?"true":"false"}
          @click=${()=>{this.nsfw=!this.nsfw,this.search(!0)}}>
          <span class="material-symbols-rounded" style="font-size:15px;">explicit</span> NSFW
        </button>
      </div>
      <div class="controls">
        ${bi.map(t=>o`<button class="chip ${this.type===t.id?"on":""}" @click=${()=>this.setAnd("type",t.id)}>${t.label}</button>`)}
        ${this.creator?o`<button class="chip on" title="Showing one creator's models" @click=${()=>this.setAnd("creator","")}>
              <span class="material-symbols-rounded" style="font-size:15px;">person</span> ${this.creator}
              <span class="material-symbols-rounded" style="font-size:15px;">close</span>
            </button>`:c}
      </div>
      ${this.error?o`<div class="err">${this.error}</div>`:c}
      <div class="grid">${this.items.map(t=>this.renderCard(t))}</div>
      ${this.loading?o`<div class="note">Searching Civitai…</div>`:this.items.length?this.cursor?o`<button class="more" @click=${()=>this.search(!1)}>Load more</button>`:c:o`<div class="note">No models matched. Try another search.</div>`}
    `}renderCard(t){var i,s;const e=(i=t.versions[0])==null?void 0:i.images[0];return o`
      <button class="card" @click=${()=>this.openDetail(t)}>
        ${e?o`<img src=${u.civitaiImageURL(e)} alt=${t.name} loading="lazy" />`:o`<div class="noimg"><span class="material-symbols-rounded" style="font-size:34px;">image</span></div>`}
        ${t.installed?o`<span class="badge ok"><span class="material-symbols-rounded" style="font-size:13px;">check</span> Installed</span>`:c}
        ${t.nsfw?o`<span class="badge right">18+</span>`:c}
        <div class="meta">
          <div class="name">${t.name}</div>
          <div class="sub">
            <span>${Qt(t.type)}</span>
            ${(s=t.versions[0])!=null&&s.base?o`<span>${t.versions[0].base}</span>`:c}
            <span>⤓ ${lt(t.downloads)}</span>
          </div>
        </div>
      </button>
    `}renderDetail(t){var i;const e=this.currentVersion();return o`
      <div class="overlay" @click=${s=>{s.target===s.currentTarget&&this.closeDetail()}}>
        <div class="detail" role="dialog" aria-label=${t.name}>
          <div>
            ${this.shownImage?o`<img class="big" src=${u.civitaiImageURL(this.shownImage)} alt=${t.name}
                  @click=${()=>this.zoomed=this.shownImage} />`:o`<div class="big" style="display:grid; place-items:center;">
                  <span class="material-symbols-rounded" style="font-size:40px; color:var(--oppai-text-muted);">image</span>
                </div>`}
            ${e&&e.images.length>1?o`<div class="thumbs">
                  ${e.images.map(s=>o`<img src=${u.civitaiImageURL(s)} class=${s===this.shownImage?"on":""}
                      alt="Preview" loading="lazy" @click=${()=>this.shownImage=s} />`)}
                </div>`:c}
            ${(i=e==null?void 0:e.files)!=null&&i.length?o`<div class="vlabel">Files</div>
                  <div class="files">
                    ${e.files.map(s=>o`<div class="f">
                        <span>${s.name}</span>
                        <span>${te(s.sizeMB)}</span>
                        ${s.format?o`<span>${s.format}</span>`:c}
                        ${s.precision?o`<span>${s.precision}</span>`:c}
                        ${s.primary?o`<span class="material-symbols-rounded" title="Primary file" style="font-size:14px;">star</span>`:c}
                      </div>`)}
                  </div>`:c}
          </div>
          <div>
            <h3>${t.name}</h3>
            <div class="sub">
              <span>${Qt(t.type)}</span>
              ${t.creator?o`<button class="creator" title="Show this creator's models" @click=${()=>{this.closeDetail(),this.setAnd("creator",t.creator??"")}}>
                    ${t.creatorImage?o`<img src=${u.civitaiImageURL(t.creatorImage)} alt="" />`:o`<span class="material-symbols-rounded" style="font-size:16px;">person</span>`}
                    ${t.creator}
                  </button>`:c}
              <span>⤓ ${lt(t.downloads)}</span>
              <span>♥ ${lt(t.likes)}</span>
              ${t.nsfw?o`<span>18+</span>`:c}
              <a class="ghost" style="padding:3px 8px; font-size:12px; text-decoration:none;" target="_blank" rel="noopener noreferrer"
                href=${`https://civitai.com/models/${t.id}${e?`?modelVersionId=${e.id}`:""}`}>
                <span class="material-symbols-rounded" style="font-size:14px;">open_in_new</span> civitai.com
              </a>
            </div>
            ${t.versions.length>1?o`<div class="vlabel">Version</div>
                  <div class="versions">
                    ${t.versions.map(s=>o`<button class="chip small ${s.id===this.versionId?"on":""}" @click=${()=>this.pickVersion(s)}>
                        ${s.installed?o`<span class="material-symbols-rounded" style="font-size:14px;">check</span>`:c}
                        ${s.name}<span style="opacity:.7;"> · ${s.base}</span>
                      </button>`)}
                  </div>`:e?o`<div class="vlabel">Version ${e.name} · ${e.base}${e.publishedAt?` · ${wi(e.publishedAt)}`:""}</div>`:c}
            ${e!=null&&e.trainedWords.length?o`<div class="vlabel">Trigger words</div>
                  <div class="words">
                    <span>${e.trainedWords.join(", ")}</span>
                    <button class="ghost" style="padding:3px 8px; font-size:12px; flex-shrink:0;" title="Copy the trigger words"
                      @click=${()=>{var s;return void((s=navigator.clipboard)==null?void 0:s.writeText(e.trainedWords.join(", ")))}}>
                      <span class="material-symbols-rounded" style="font-size:14px;">content_copy</span>
                    </button>
                  </div>`:c}
            ${t.tags.length?o`<div class="vlabel">Tags</div>
                  <div class="tags">
                    ${t.tags.slice(0,14).map(s=>o`<button class="chip small" @click=${()=>{this.closeDetail(),this.setAnd("category",s)}}>${s}</button>`)}
                  </div>`:c}
            ${this.detailLoading&&!t.description?o`<div class="note" style="padding:14px 0;">Loading the model page…</div>`:c}
            ${t.description?o`<div class="vlabel">About</div>
                  <div class="desc">${Zt(t.description)}</div>`:c}
            ${e!=null&&e.description&&e.description!==t.description?o`<div class="vlabel">About this version</div>
                  <div class="desc">${Zt(e.description)}</div>`:c}
            <div class="actions">
              ${e?e.installed?o`<button class="primary" disabled>
                      <span class="material-symbols-rounded" style="font-size:18px;">check_circle</span> Installed in InvokeAI
                    </button>`:o`<button class="primary" ?disabled=${this.installing||!e.downloadUrl} @click=${()=>this.install(e)}>
                      <span class="material-symbols-rounded" style="font-size:18px;">download</span>
                      Install to InvokeAI${e.sizeMB?` (${te(e.sizeMB)})`:""}
                    </button>`:c}
              <button class="ghost" @click=${()=>this.toggleGallery()}>
                <span class="material-symbols-rounded" style="font-size:16px;">photo_library</span>
                ${this.galleryOpen?"Hide posted pictures":"Posted pictures & prompts"}
              </button>
            </div>
            ${this.galleryOpen?this.renderGallery():c}
            <div class="sub" style="margin-top:10px;">
              InvokeAI downloads the file itself; the cover, description and trigger words follow once it is in.
            </div>
          </div>
        </div>
      </div>
    `}renderGallery(){return o`
      <div class="controls" style="margin-top:10px;">
        ${[["","Most reactions"],["newest","Newest"],["comments","Most comments"]].map(([t,e])=>o`<button class="chip small ${this.gallerySort===t?"on":""}"
            @click=${()=>{this.gallerySort=t,this.gallery=[],this.galleryCursor="",this.loadGallery(!0)}}>${e}</button>`)}
      </div>
      ${this.promptsNeedKey?o`<div class="sub" style="margin-top:8px;">
            Civitai only shares the prompts behind pictures with an API key — add yours under Settings → Image generation to see them here.
          </div>`:c}
      ${this.gallery.length?o`<div class="gal-grid">
            ${this.gallery.map(t=>o`<button title=${t.prompt?"Has a prompt":"No prompt kept"} @click=${()=>this.picked=t}>
                <img src=${u.civitaiImageURL(t.url)} alt="" loading="lazy" />
                ${t.prompt?o`<span class="has">prompt</span>`:c}
              </button>`)}
          </div>`:c}
      ${this.galleryLoading?o`<div class="note" style="padding:12px 0;">Loading pictures…</div>`:this.gallery.length?this.galleryCursor?o`<button class="more" style="margin-top:8px;" @click=${()=>this.loadGallery(!1)}>More pictures</button>`:c:o`<div class="note" style="padding:12px 0;">Nobody has posted a picture with this version.</div>`}
    `}renderPicked(t){const e=Jt(t);return o`
      <div class="zoom ${e?"":"plain"}" @click=${i=>{i.target===i.currentTarget&&(this.picked=null)}}>
        <img src=${u.civitaiImageURL(t.url)} alt="" @click=${()=>this.picked=null} />
        ${e?o`<div class="pane">
              <div style="display:flex; align-items:center; gap:8px; justify-content:space-between;">
                <h4>Prompt${t.username?` · by ${t.username}`:""}</h4>
                <button class="ghost" style="padding:4px 8px;" @click=${()=>this.picked=null}>
                  <span class="material-symbols-rounded" style="font-size:16px;">close</span>
                </button>
              </div>
              <div class="p">${e.prompt}</div>
              ${e.negativePrompt?o`<h4>Negative</h4><div class="p">${e.negativePrompt}</div>`:c}
              <div class="kv">
                ${t.model?o`<span>Model</span><span>${t.model}</span>`:c}
                ${t.sampler?o`<span>Sampler</span><span>${t.sampler}${e.sampler?"":" (not in InvokeAI)"}</span>`:c}
                ${e.steps?o`<span>Steps</span><span>${e.steps}</span>`:c}
                ${e.cfgScale?o`<span>CFG</span><span>${e.cfgScale}</span>`:c}
                ${e.seed?o`<span>Seed</span><span>${e.seed}</span>`:c}
                ${e.width?o`<span>Size</span><span>${e.width}×${e.height}</span>`:c}
              </div>
              <div class="actions" style="margin-top:4px;">
                <button class="primary" @click=${()=>this.usePrompt(t)}>
                  <span class="material-symbols-rounded" style="font-size:18px;">auto_awesome</span> Use in the studio
                </button>
                <button class="ghost" @click=${()=>this.copyPrompt(t)}>
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
      </div>`;const t=this.me,e=t.cover||((i=this.myImages[0])==null?void 0:i.url)||"";return o`
      <div class="banner">
        <div class="art">
          ${e?o`<img class="cover" src=${u.civitaiImageURL(e)} alt="" />`:c}
          <div class="fade"></div>
          <a class="ghost profile-link" style="text-decoration:none; background:rgba(0,0,0,.4);" target="_blank" rel="noopener noreferrer"
            href=${`https://civitai.com/user/${encodeURIComponent(t.username)}`}>
            <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span> Profile on civitai.com
          </a>
        </div>
        <div class="who">
          ${t.image?o`<img src=${u.civitaiImageURL(t.image)} alt="" />`:o`<div class="noface"><span class="material-symbols-rounded" style="font-size:44px;">account_circle</span></div>`}
          <div class="n">${t.username}</div>
        </div>
      </div>
      <div class="subtabs" role="tablist">
        ${[["models","Models"],["posts","Posts"],["images","Images"],["collections","Collections"]].map(([s,a])=>o`<button role="tab" aria-selected=${this.accountTab===s?"true":"false"}
            class=${this.accountTab===s?"on":""} @click=${()=>this.selectAccountTab(s)}>${a}</button>`)}
      </div>
      ${this.meError?o`<div class="err">${this.meError}</div>`:c}
      ${this.accountTab==="models"?this.renderMyModels():this.accountTab==="posts"?this.renderPosts():this.accountTab==="images"?this.renderMyImages():this.renderCollections()}
    `}renderMyModels(){return o`
      <div class="grid">${this.myModels.map(t=>this.renderCard(t))}</div>
      ${this.myModelsLoading?o`<div class="note">Loading models…</div>`:this.myModels.length?this.myModelsCursor?o`<button class="more" @click=${()=>this.loadMyModels(!1)}>More models</button>`:c:o`<div class="note">No models published.
              <div style="margin-top:6px; font-size:12px;">Uploading goes through civitai.com itself — the site has no public API for it.</div>
            </div>`}
    `}renderPosts(){if(this.openPost){const t=this.openPost;return o`
        <div class="controls">
          <button class="ghost" @click=${()=>this.openPost=null}>
            <span class="material-symbols-rounded" style="font-size:16px;">arrow_back</span> All posts
          </button>
          <span style="font-size:12px; color:var(--oppai-text-muted);">
            ${t.images.length} picture${t.images.length===1?"":"s"}${Ct(t)?` · ${Ct(t)}`:""}
          </span>
          ${t.id>0?o`<a class="ghost" style="margin-left:auto; text-decoration:none;" target="_blank" rel="noopener noreferrer" href=${`https://civitai.com/posts/${t.id}`}>
                <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span> civitai.com
              </a>`:c}
        </div>
        ${this.renderImageGrid(t.images)}
      `}return o`
      <div class="post-grid">
        ${this.posts.map(t=>o`<button class="post" @click=${()=>this.openPost=t}>
            ${t.images[0]?o`<img src=${u.civitaiImageURL(t.images[0].url)} alt="" loading="lazy" />`:c}
            ${t.images.length>1?o`<span class="badge right"><span class="material-symbols-rounded" style="font-size:13px;">photo_library</span> ${t.images.length}</span>`:c}
            <div class="pm"><span>${Ct(t)}</span>${t.images.some(e=>e.prompt)?o`<span>prompt</span>`:c}</div>
          </button>`)}
      </div>
      ${this.postsLoading?o`<div class="note">Loading posts…</div>`:this.posts.length?this.postsCursor?o`<button class="more" @click=${()=>this.loadPosts(!1)}>More posts</button>`:c:o`<div class="note">No posts.</div>`}
    `}renderMyImages(){return o`
      ${this.renderImageGrid(this.myImages)}
      ${this.galleryLoading?o`<div class="note" style="padding:12px 0;">Loading pictures…</div>`:this.myImages.length?this.myImagesCursor?o`<button class="more" @click=${()=>this.loadMyImages(!1)}>More pictures</button>`:c:o`<div class="note" style="padding:12px 0;">No posted pictures.</div>`}
    `}renderImageGrid(t){return t.length?o`<div class="gal-grid">
      ${t.map(e=>o`<button title=${e.prompt?"Has a prompt":"No prompt kept"} @click=${()=>this.picked=e}>
          <img src=${u.civitaiImageURL(e.url)} alt="" loading="lazy" />
          ${e.prompt?o`<span class="has">prompt</span>`:c}
        </button>`)}
    </div>`:c}renderCollections(){var t;if(this.openCollection){const e=this.openCollection;return o`
        <div class="controls">
          <button class="ghost" @click=${()=>this.openCollection=null}>
            <span class="material-symbols-rounded" style="font-size:16px;">arrow_back</span> Collections
          </button>
          <span style="font-size:13px; font-weight:600;">${e.name}</span>
          <span style="font-size:12px; color:var(--oppai-text-muted);">${e.username?`by ${e.username} · `:""}${e.count} item${e.count===1?"":"s"}</span>
          <a class="ghost" style="margin-left:auto; text-decoration:none;" target="_blank" rel="noopener noreferrer" href=${`https://civitai.com/collections/${e.id}`}>
            <span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span> civitai.com
          </a>
        </div>
        ${e.description?o`<div class="sub" style="margin-bottom:8px;">${e.description}</div>`:c}
        ${this.renderImageGrid(this.collectionImages)}
        ${this.galleryLoading?o`<div class="note" style="padding:12px 0;">Loading pictures…</div>`:this.collectionImages.length?this.collectionImagesCursor?o`<button class="more" @click=${()=>this.openCollectionPictures(e,!1)}>More pictures</button>`:c:o`<div class="note" style="padding:12px 0;">Nothing the feed will show for this collection.</div>`}
      `}return o`
      <div class="controls">
        <input type="search" placeholder="Search public collections…" .value=${this.collectionQuery}
          @input=${e=>this.collectionQuery=e.target.value}
          @keydown=${e=>{e.key==="Enter"&&this.loadCollections(!0)}} />
        ${[["newest","Newest"],["followers","Most followed"]].map(([e,i])=>o`<button class="chip ${this.collectionSort===e?"on":""}"
            @click=${()=>{this.collectionSort=e,this.loadCollections(!0)}}>${i}</button>`)}
        <button class="ghost" @click=${()=>this.loadCollections(!0)}>
          <span class="material-symbols-rounded" style="font-size:16px;">search</span> Search
        </button>
      </div>
      <div class="sub" style="margin-bottom:10px;">
        Civitai's public API lists collections by name only, never by owner — your own are on
        <a style="color:var(--oppai-primary-bright);" target="_blank" rel="noopener noreferrer"
          href=${`https://civitai.com/user/${encodeURIComponent(((t=this.me)==null?void 0:t.username)??"")}/collections`}>civitai.com</a>.
        Image and post collections open here; model collections the API will not list.
      </div>
      <div class="rows">
        ${this.collections.map(e=>o`<button class="coll" ?disabled=${e.type!=="Image"&&e.type!=="Post"} @click=${()=>this.openCollectionPictures(e,!0)}>
            ${e.cover?o`<img src=${u.civitaiImageURL(e.cover)} alt="" loading="lazy" />`:o`<div class="noimg"><span class="material-symbols-rounded" style="font-size:26px;">collections_bookmark</span></div>`}
            <div style="min-width:0;">
              <div class="t">${e.name}${e.nsfw?o` <span style="font-weight:400; color:var(--oppai-text-muted);">18+</span>`:c}</div>
              <div class="d">${e.type} · ${e.count} item${e.count===1?"":"s"}${e.username?` · by ${e.username}`:""}</div>
            </div>
            <span class="material-symbols-rounded" style="font-size:18px; color:var(--oppai-text-muted);">${e.type==="Image"||e.type==="Post"?"chevron_right":"block"}</span>
          </button>`)}
      </div>
      ${this.collectionsLoading?o`<div class="note">Loading collections…</div>`:this.collections.length?this.collectionsCursor?o`<button class="more" @click=${()=>this.loadCollections(!1)}>More collections</button>`:c:o`<div class="note">No collections matched.</div>`}
    `}renderInstalled(){const t=this.installed.filter(i=>{var s;switch(this.installedFilter){case"linked":return!!i.civitai;case"unlinked":return!i.civitai;case"updates":return!!((s=i.civitai)!=null&&s.updateAvailable);default:return!0}}),e=this.installed.filter(i=>{var s;return(s=i.civitai)==null?void 0:s.updateAvailable}).length;return o`
      <div class="controls">
        ${[["all","All"],["linked","On Civitai"],["unlinked","Not matched"],["updates",`Updates${e?` (${e})`:""}`]].map(([i,s])=>o`<button class="chip ${this.installedFilter===i?"on":""}" @click=${()=>this.installedFilter=i}>${s}</button>`)}
        <button class="ghost" style="margin-left:auto;" ?disabled=${this.installedLoading} @click=${()=>this.loadInstalled(!0)}>
          <span class="material-symbols-rounded" style="font-size:16px;">refresh</span> Check Civitai again
        </button>
      </div>
      <p class="sync-note">
        InvokeAI's models matched to Civitai by file hash. “Fetch from Civitai” writes the catalogue's cover, description
        and trigger words onto the InvokeAI record — the same dressing an install from here gets.
      </p>
      ${this.syncNote?o`<div class="sync-note" style="color:var(--oppai-text);">${this.syncNote}</div>`:c}
      ${this.installedError?o`<div class="err">${this.installedError}</div>`:c}
      ${this.installedLoading&&!this.installed.length?o`<div class="note">Reading the studio's models and asking Civitai about the new ones…</div>`:c}
      <div class="rows">
        ${t.map(i=>this.renderInstalledRow(i))}
      </div>
      ${!this.installedLoading&&this.installed.length&&!t.length?o`<div class="note">Nothing here.</div>`:c}
    `}renderInstalledRow(t){const e=t.civitai,i=t.hasCover?t.type==="lora"?u.loraThumbURL(t.name):u.modelThumbURL(t.key):"",s=this.manageKey===t.key;return o`
      <div class="row">
        ${i?o`<img src=${i} alt="" loading="lazy" />`:o`<div class="noimg"><span class="material-symbols-rounded" style="font-size:26px;">deployed_code</span></div>`}
        <div style="min-width:0;">
          <div class="t">${t.name}</div>
          <div class="d">
            <span>${t.type}</span>
            ${t.base?o`<span>${t.base}</span>`:c}
            ${e?o`<span>· ${e.modelName}${e.versionName?` (${e.versionName})`:""}${e.creator?` by ${e.creator}`:""}</span>
                  ${e.updateAvailable?o`<span class="upd"><span class="material-symbols-rounded" style="font-size:14px;">new_releases</span> newer version</span>`:c}`:o`<span>· not found on Civitai by hash</span>`}
          </div>
          ${e!=null&&e.previews.length&&!s?o`<div class="previews">
                ${e.previews.slice(0,6).map(a=>o`<img src=${u.civitaiImageURL(a)} alt="" loading="lazy" @click=${()=>this.zoomed=a} />`)}
              </div>`:c}
          ${this.pinning===t.key?o`<div class="pin">
                <input type="text" placeholder="Civitai version id" .value=${this.pinVersion}
                  @input=${a=>this.pinVersion=a.target.value} />
                <button class="ghost" ?disabled=${!/^\d+$/.test(this.pinVersion.trim())} @click=${()=>this.sync(t,Number(this.pinVersion.trim()))}>Link</button>
                <button class="ghost" @click=${()=>this.pinning=""}>Cancel</button>
              </div>`:c}
        </div>
        <div class="rb">
          ${e?o`<button class="ghost" title="Open the model page" @click=${()=>this.openDetail(e.modelId)}>
                <span class="material-symbols-rounded" style="font-size:16px;">travel_explore</span> Page
              </button>`:c}
          ${e!=null&&e.updateAvailable?o`<button class="ghost" title="Download the newest version and delete this one once it is in"
                ?disabled=${this.manageBusy} @click=${()=>this.updateModel(t)}>
                <span class="material-symbols-rounded" style="font-size:16px;">published_with_changes</span> Update
              </button>`:c}
          <button class="ghost" ?disabled=${this.syncing===t.key} title="Write the cover, description and trigger words from Civitai onto this model"
            @click=${()=>this.sync(t)}>
            <span class="material-symbols-rounded" style="font-size:16px;">${this.syncing===t.key?"downloading":"sync"}</span>
            ${e?"Fetch again":"Fetch from Civitai"}
          </button>
          ${e?o`<button class="ghost ${s?"on":""}" title="Choose the version and the cover picture" aria-expanded=${s?"true":"false"}
                @click=${()=>this.manage(t)}>
                <span class="material-symbols-rounded" style="font-size:16px;">tune</span> ${s?"Close":"Version & cover"}
              </button>`:o`<button class="ghost" title="Link by a version id from the site" @click=${()=>{this.pinning=t.key,this.pinVersion=""}}>
                <span class="material-symbols-rounded" style="font-size:16px;">link</span>
              </button>`}
          <button class="ghost danger" title="Delete from InvokeAI, file included" ?disabled=${this.manageBusy} @click=${()=>this.deleteInstalled(t)}>
            <span class="material-symbols-rounded" style="font-size:16px;">delete</span>
          </button>
        </div>
        ${s&&e?this.renderManage(t):c}
      </div>
    `}renderManage(t){const e=t.civitai,i=this.managePage;if(!i)return o`<div class="manage"><div class="note" style="padding:8px 0;">Loading the model page…</div></div>`;const s=i.versions.find(n=>n.id===this.manageVersion)??i.versions[0],a=(s==null?void 0:s.id)===e.versionId,r=e.coverUrl||e.previews[0]||"";return o`
      <div class="manage">
        <div class="vlabel" style="margin-top:0;">Version</div>
        <div class="versions">
          ${i.versions.map(n=>o`<button class="chip small ${n.id===(s==null?void 0:s.id)?"on":""}" @click=${()=>this.manageVersion=n.id}>
              ${n.id===e.versionId?o`<span class="material-symbols-rounded" style="font-size:14px;">check</span>`:c}
              ${n.name}<span style="opacity:.7;"> · ${n.base}</span>
            </button>`)}
        </div>
        ${s&&!a?o`<div class="actions" style="margin-top:8px;">
              <button class="ghost" ?disabled=${this.manageBusy} title="Download this version into InvokeAI and delete the current file once it is in"
                @click=${()=>this.updateModel(t,s.id)}>
                <span class="material-symbols-rounded" style="font-size:16px;">published_with_changes</span> Install ${s.name}, replacing the current file
              </button>
              <button class="ghost" ?disabled=${this.syncing===t.key} title="Keep the current file, but take this version's description, trigger words and pictures"
                @click=${()=>this.sync(t,s.id)}>
                <span class="material-symbols-rounded" style="font-size:16px;">link</span> Link to ${s.name} without downloading
              </button>
            </div>`:c}
        ${s!=null&&s.images.length?o`<div class="vlabel">Cover${a?"":` (from ${s.name})`}</div>
              <div class="covers">
                ${s.images.map(n=>o`<button class=${n===r?"on":""} title="Use as the cover" ?disabled=${this.manageBusy} @click=${()=>this.chooseCover(t,n)}>
                    <img src=${u.civitaiImageURL(n)} alt="" loading="lazy" />
                    ${n===r?o`<span class="tick"><span class="material-symbols-rounded" style="font-size:13px;">check</span></span>`:c}
                  </button>`)}
              </div>`:o`<div class="sub" style="margin-top:8px;">This version has no showcase pictures.</div>`}
      </div>
    `}};v.styles=[gt,Rt,mt`
      :host {
        position: fixed;
        inset: 0;
        z-index: 65;
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
    `];y([d()],v.prototype,"tab",2);y([d()],v.prototype,"q",2);y([d()],v.prototype,"type",2);y([d()],v.prototype,"sort",2);y([d()],v.prototype,"period",2);y([d()],v.prototype,"base",2);y([d()],v.prototype,"category",2);y([d()],v.prototype,"creator",2);y([d()],v.prototype,"nsfw",2);y([d()],v.prototype,"categories",2);y([d()],v.prototype,"items",2);y([d()],v.prototype,"cursor",2);y([d()],v.prototype,"loading",2);y([d()],v.prototype,"error",2);y([d()],v.prototype,"detail",2);y([d()],v.prototype,"detailLoading",2);y([d()],v.prototype,"versionId",2);y([d()],v.prototype,"shownImage",2);y([d()],v.prototype,"zoomed",2);y([d()],v.prototype,"galleryOpen",2);y([d()],v.prototype,"gallery",2);y([d()],v.prototype,"galleryCursor",2);y([d()],v.prototype,"galleryLoading",2);y([d()],v.prototype,"gallerySort",2);y([d()],v.prototype,"picked",2);y([d()],v.prototype,"copied",2);y([d()],v.prototype,"promptsNeedKey",2);y([d()],v.prototype,"jobs",2);y([d()],v.prototype,"installing",2);y([d()],v.prototype,"jobsOpen",2);y([d()],v.prototype,"me",2);y([d()],v.prototype,"meError",2);y([d()],v.prototype,"meLoading",2);y([d()],v.prototype,"accountTab",2);y([d()],v.prototype,"myImages",2);y([d()],v.prototype,"myImagesCursor",2);y([d()],v.prototype,"myModels",2);y([d()],v.prototype,"myModelsCursor",2);y([d()],v.prototype,"myModelsLoading",2);y([d()],v.prototype,"posts",2);y([d()],v.prototype,"postsCursor",2);y([d()],v.prototype,"postsLoading",2);y([d()],v.prototype,"openPost",2);y([d()],v.prototype,"collections",2);y([d()],v.prototype,"collectionsCursor",2);y([d()],v.prototype,"collectionsLoading",2);y([d()],v.prototype,"collectionQuery",2);y([d()],v.prototype,"collectionSort",2);y([d()],v.prototype,"openCollection",2);y([d()],v.prototype,"collectionImages",2);y([d()],v.prototype,"collectionImagesCursor",2);y([d()],v.prototype,"installed",2);y([d()],v.prototype,"installedLoading",2);y([d()],v.prototype,"installedError",2);y([d()],v.prototype,"installedFilter",2);y([d()],v.prototype,"syncing",2);y([d()],v.prototype,"syncNote",2);y([d()],v.prototype,"pinning",2);y([d()],v.prototype,"pinVersion",2);y([d()],v.prototype,"manageKey",2);y([d()],v.prototype,"managePage",2);y([d()],v.prototype,"manageVersion",2);y([d()],v.prototype,"manageBusy",2);v=y([bt("oppai-civitai")],v);function Qt(t){switch(t){case"Checkpoint":return"Checkpoint";case"LORA":return"LoRA";case"LoCon":return"LoCon";case"DoRA":return"DoRA";case"TextualInversion":return"Embedding";case"Controlnet":return"ControlNet";default:return t}}function lt(t){return t>=1e6?`${(t/1e6).toFixed(1)}M`:t>=1e3?`${(t/1e3).toFixed(1)}k`:String(t)}function te(t){return t>=1024?`${(t/1024).toFixed(1)} GB`:`${t} MB`}function wi(t){const e=new Date(t);return Number.isNaN(e.getTime())?"":e.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}var $i=Object.defineProperty,ki=Object.getOwnPropertyDescriptor,m=(t,e,i,s)=>{for(var a=s>1?void 0:s?ki(e,i):e,r=t.length-1,n;r>=0;r--)(n=t[r])&&(a=(s?n(e,i,a):n(a))||a);return s&&a&&$i(e,i,a),a};function ee(){const t=window;return t.SpeechRecognition??t.webkitSpeechRecognition??null}const Si=[{label:"Portrait",hint:"512×768",w:512,h:768},{label:"Square",hint:"512×512",w:512,h:512},{label:"Landscape",hint:"768×512",w:768,h:512},{label:"Tall",hint:"640×960",w:640,h:960},{label:"XL Portrait",hint:"832×1216",w:832,h:1216},{label:"XL Square",hint:"1024×1024",w:1024,h:1024},{label:"XL Landscape",hint:"1216×832",w:1216,h:832}],Ci=[{id:"",label:"Default (Euler a)"},...[["ddim","DDIM"],["ddpm","DDPM"],["deis","DEIS"],["deis_k","DEIS Karras"],["dpmpp_2s","DPM++ 2S"],["dpmpp_2s_k","DPM++ 2S Karras"],["dpmpp_2m","DPM++ 2M"],["dpmpp_2m_k","DPM++ 2M Karras"],["dpmpp_2m_sde","DPM++ 2M SDE"],["dpmpp_2m_sde_k","DPM++ 2M SDE Karras"],["dpmpp_3m","DPM++ 3M"],["dpmpp_3m_k","DPM++ 3M Karras"],["dpmpp_sde","DPM++ SDE"],["dpmpp_sde_k","DPM++ SDE Karras"],["er_sde","ER-SDE"],["euler","Euler"],["euler_k","Euler Karras"],["euler_a","Euler Ancestral"],["heun","Heun"],["heun_k","Heun Karras"],["kdpm_2","KDPM 2"],["kdpm_2_k","KDPM 2 Karras"],["kdpm_2_a","KDPM 2 Ancestral"],["kdpm_2_a_k","KDPM 2 Ancestral Karras"],["lcm","LCM"],["lms","LMS"],["lms_k","LMS Karras"],["pndm","PNDM"],["tcd","TCD"],["unipc","UniPC"],["unipc_k","UniPC Karras"]].map(([t,e])=>({id:t,label:e}))],M=[{id:"neutral",label:"Neutral",face:"calm neutral expression, relaxed face, looking at viewer",pose:"both arms hanging naturally at her sides, relaxed hands"},{id:"happy",label:"Happy",face:"warm genuine smile, bright eyes, cheerful expression",pose:"hands loosely clasped behind her lower back, open cheerful posture"},{id:"mischievous",label:"Mischievous",face:"smirk, half-lidded eyes, teasing knowing expression",pose:"one hand resting on her hip, other arm relaxed at her side"},{id:"surprised",label:"Surprised",face:"surprised expression, wide eyes, slightly open mouth",pose:"hands open near her waist, elbows bent slightly in surprise"},{id:"thinking",label:"Thinking",face:"thoughtful expression, looking to the side",pose:"one fingertip resting at her chin, other arm folded gently across her waist"},{id:"shy",label:"Shy",face:"bashful shy expression, blushing cheeks, averted eyes, hesitant small smile",pose:"hands clasped low in front of her skirt, shoulders tucked slightly inward"},{id:"smug",label:"Smug",face:"self-satisfied smug expression, raised eyebrow, confident knowing smirk",pose:"one hand planted on her hip, other arm loose, confident stance"},{id:"sad",label:"Sad",face:"sad wistful expression, downcast eyes, slight frown, vulnerable face",pose:"arms hanging softly at her sides, shoulders slightly slumped"},{id:"annoyed",label:"Annoyed",face:"annoyed irritated expression, furrowed brows, impatient pout",pose:"arms crossed low beneath her chest, weight shifted impatiently"},{id:"sleepy",label:"Sleepy",face:"sleepy drowsy expression, heavy half-closed eyes, relaxed tired face",pose:"arms loose at her sides, languid slouched posture"},{id:"loving",label:"Loving",face:"tender loving expression, soft adoring eyes, affectionate gentle smile",pose:"hands gently clasped low over her abdomen, body leaning affectionately forward"},{id:"excited",label:"Excited",face:"excited thrilled expression, sparkling wide eyes, eager open smile",pose:"hands held eagerly near her hips, lively forward-leaning stance"}],O=[{id:"typing",label:"Typing",heat:0,face:"focused expression, eyes on a screen, faint smile",pose:"sitting at a desk, both hands on a keyboard, leaning slightly toward the monitor"},{id:"reading",label:"Reading",heat:0,face:"absorbed expression, eyes lowered to the page",pose:"curled up holding an open book, one leg tucked under her"},{id:"gaming",label:"Gaming",heat:0,face:"intent expression, eyes wide on the screen, tongue at the corner of her mouth",pose:"sitting cross-legged holding a game controller in both hands"},{id:"lounging",label:"Lounging",heat:0,face:"relaxed expression, eyes half closed, easy smile",pose:"sprawled back across a sofa, arms loose, one knee raised"},{id:"drinking",label:"Drinking",heat:0,face:"contented expression, eyes closed over the rim",pose:"holding a steaming mug in both hands near her chest"},{id:"eating",label:"Eating",heat:0,face:"cheeks slightly full, pleased expression",pose:"holding food up to her mouth mid-bite, other hand cupped beneath it"},{id:"stretching",label:"Stretching",heat:0,face:"eyes shut, mouth open in a small yawn",pose:"arms stretched overhead, back arched, rising onto her toes"},{id:"napping",label:"Napping",heat:0,face:"sleeping, eyes closed, lips parted, peaceful",pose:"curled on her side asleep, hands tucked under her cheek"},{id:"dancing",label:"Dancing",heat:0,face:"eyes closed, delighted open smile",pose:"mid-step with hips turned, one arm raised loosely, hair in motion"},{id:"tidying",label:"Tidying",heat:0,face:"mildly absorbed expression, glancing at what she is holding",pose:"reaching to shelve something, weight on one foot"},{id:"drawing",label:"Drawing",heat:0,face:"concentrating, brow faintly furrowed, tongue between her teeth",pose:"hunched over a sketchbook, pencil in hand, other arm steadying the page"},{id:"waving",label:"Waving",heat:0,face:"bright welcoming smile, eyes on the viewer",pose:"one arm raised waving at the viewer, weight on one hip"},{id:"undressing",label:"Undressing",heat:2,intimate:!0,face:"half-lidded eyes, small knowing smile, watching the viewer",pose:"peeling clothing off one shoulder, other hand at her waistband"},{id:"teasing",label:"Teasing",heat:2,intimate:!0,face:"smirking, heavy-lidded eyes locked on the viewer",pose:"posing for the viewer, back arched, hands framing her hips"},{id:"touching",label:"Touching herself",heat:2,intimate:!0,face:"flushed, lips parted, eyes on the viewer",pose:"one hand pressed between her thighs over her clothes, other hand at her chest"},{id:"rubbing",label:"Rubbing",heat:3,intimate:!0,face:"deep blush, mouth open, eyes unfocused",pose:"reclining with one hand rubbing between her spread thighs"},{id:"fingering",label:"Fingering",heat:4,intimate:!0,face:"flushed, head tipped back, brow drawn, panting",pose:"lying back with her fingers inside herself, knees fallen open"},{id:"spread",label:"Spread",heat:4,intimate:!0,face:"flushed, watching the viewer, mouth open",pose:"lying back holding herself open with both hands, legs spread wide"},{id:"vibrator",label:"Vibrator",heat:3,intimate:!0,face:"eyes squeezed shut, mouth open, deep blush",pose:"holding a vibrator against herself, thighs tensed together"},{id:"dildo",label:"Dildo",heat:4,intimate:!0,face:"flushed, half-lidded, biting her lip",pose:"using a dildo on herself, one hand braced behind her"},{id:"riding",label:"Riding",heat:4,intimate:!0,face:"flushed, head thrown back, mouth open",pose:"straddling and riding a toy, hands braced on her thighs, back arched"},{id:"grinding",label:"Grinding",heat:3,intimate:!0,face:"flushed, eyes shut, teeth in her lip",pose:"straddling a pillow, hips rolling forward, hands gripping it"},{id:"climax",label:"Climax",heat:4,intimate:!0,face:"eyes rolled up, mouth wide open, whole face flushed",pose:"body arched taut mid-orgasm, toes curled, hands fisted"},{id:"afterglow",label:"Afterglow",heat:3,intimate:!0,face:"dazed exhausted smile, heavy-lidded eyes, deep blush",pose:"collapsed limp on her back, limbs loose, chest heaving"}],A=[{label:"Calm",mood:"composed posture"},{label:"Warm",mood:"soft light blush, inviting posture, slight lean forward"},{label:"Flirty",mood:"flirty confident stance, visible blush"},{label:"Heated",mood:"heavy blush, sultry posture, parted lips, heavy-lidded eyes"},{label:"Peak",mood:"deep blush, flushed skin, breathless needy expression"}],H=M.length*A.length,tt=O.length,he={faces:M.length,tiers:A.length,miscIds:O.map(t=>t.id)};function ie(t){return $e(t,he)}function Ti(t,e,i){return ke(t,e,i,he)}const se=[0,96,128];function zi(){const t=new Uint8Array(12);return crypto.getRandomValues(t),Array.from(t,e=>e.toString(16).padStart(2,"0")).join("")}let g=class extends ft{constructor(){super(...arguments),this.studio=!1,this.status=null,this.checkpoint="",this.vae="",this.templateId="",this.showBuiltInTemplates=!1,this.selectedLoras={},this.selectedTriggers=[],this.loraPage=0,this.outfitOn=!1,this.outfitText="",this.outfitGear={...kt},this.outfitFace=0,this.outfitMisc="",this.outfitMiscBatch=!1,this.outfitTier=0,this.outfitBackground="white",this.outfitUnderwearColor="black",this.outfitPubicHair=!1,this.outfitPubicHairColor="dark brown",this.outfitLockColors=!0,this.gearPromptOpen=null,this.outfitBatchRunning=!1,this.outfitExporting=!1,this.outfitProgress="",this.stopOutfitBatch=!1,this.loadouts=[],this.outfitLoadoutId="",this.loadoutBusy=!1,this.loadoutCoverVersion=0,this.wardrobes=[],this.outfitWardrobeId="",this.studioLoaded=!1,this.studioView="build",this.sheetTab="faces",this.sheetZoom=1,this.showSquarePrompt=!1,this.camera={...Gt},this.cutout=null,this.cutoutTolerance=42,this.cutoutBusy=!1,this.cutoutError="",this.cutoutCanvas=null,this.session=null,this.cutoutTool="remove",this.cutoutFeather=qt.feather,this.cutoutSpill=qt.spill,this.cutoutZoom=1,this.cutoutContrast=!1,this.contiguous=!0,this.brushSize=24,this.showOriginal=!1,this.canUndo=!1,this.canRedo=!1,this.cutFraction=0,this.painting=!1,this.characters=[],this.selectedChars=[],this.charDraft=null,this.charBusy=!1,this.scanBusy=!1,this.poses=[],this.selectedPoses=[],this.poseDraft=null,this.poseBusy=!1,this.wildcards=[],this.wildcardDraft=null,this.wildcardBusy=!1,this.editMedia=0,this.editing=null,this.open={models:!0,settings:!0},this.speech="",this.listening=!1,this.optimizing=!1,this.prompt="",this.tagSuggestions=[],this.tagCorrection="",this.negative="",this.showOptions=!1,this.width=512,this.height=768,this.steps=25,this.cfg=7,this.cfgRescale=0,this.clipSkip=0,this.seamlessX=!1,this.seamlessY=!1,this.vaePrecision="fp32",this.cpuNoise=!0,this.board="none",this.scheduler="",this.count=1,this.seed=-1,this.detailerEnabled=!1,this.detailerModel="face_yolov8n.pt",this.detailerPrompt="",this.detailerNegative="",this.detailerConfidence=.3,this.detailerDenoise=.4,this.detailerMaskBlur=4,this.generating=!1,this.jobId="",this.progress=null,this.progressTimer=0,this.progressSeen=0,this.shots=[],this.activeNodeId=null,this.draggingNode=null,this.restoredNotice=!1,this.infoFor=null,this.draftRestored=!1,this.pendingScroll=0,this.error="",this.toast="",this.thumbVersion=0,this.failedThumbs=new Set,this.expandedShot=null,this.metaDraft=null,this.metaBusy=!1,this.metaTriggerText="",this.civitaiOpen=!1,this.recognition=null,this.startFresh=()=>{pt(),this.prompt="",this.negative="",this.selectedLoras={},this.selectedTriggers=[],this.selectedChars=[],this.outfitOn=!1,this.outfitText="",this.outfitGear={...kt},this.outfitFace=0,this.outfitTier=0,this.outfitBackground="white",this.outfitUnderwearColor="black",this.outfitPubicHair=!1,this.outfitPubicHairColor="dark brown",this.outfitLockColors=!0,this.outfitLoadoutId="",this.outfitWardrobeId="",this.outfitProgress="",this.shots=[],this.activeNodeId=null,this.seed=-1,this.restoredNotice=!1}}connectedCallback(){super.connectedCallback(),this.restoreDraft(),this.loadStatus(),this.loadCharacters(),this.loadPoses(),this.loadWildcards(),this.studio&&this.enterStudio()}enterStudio(){this.outfitOn=!0,this.open={...this.open,outfit:!0,loadouts:!0,models:!1,settings:!1},this.loadStudio()}disconnectedCallback(){super.disconnectedCallback(),this.stopOutfitBatch=!0,this.stopListening(),this.flushDraft()}get scrollHost(){let t=this;for(;t;){if(t instanceof HTMLElement&&t!==this){const i=getComputedStyle(t);if(/(auto|scroll|overlay)/.test(i.overflowY)&&t.scrollHeight>t.clientHeight+1)return t}if(t=t.parentNode??(t instanceof ShadowRoot?t.host:null),t===document.documentElement)break}return null}updated(t){var e;t.has("editMedia")&&this.editMedia>0&&((e=this.editing)==null?void 0:e.id)!==this.editMedia&&this.loadFromMedia(this.editMedia),this.pendingScroll&&this.scrollHost&&(this.scrollHost.scrollTop=this.pendingScroll,this.pendingScroll=0);for(const i of t.keys())if(g.DRAFT_FIELDS.has(String(i))){this.persistDraft();break}}persistDraft(){this.draftTimer!==void 0&&clearTimeout(this.draftTimer),this.draftTimer=window.setTimeout(()=>{this.draftTimer=void 0,this.flushDraft()},600)}flushDraft(){var t;this.draftTimer!==void 0&&(clearTimeout(this.draftTimer),this.draftTimer=void 0),this.draftRestored&&Pe({prompt:this.prompt,negative:this.negative,checkpoint:this.checkpoint,vae:this.vae,templateId:this.templateId,scheduler:this.scheduler,width:this.width,height:this.height,steps:this.steps,cfg:this.cfg,cfgRescale:this.cfgRescale,clipSkip:this.clipSkip,seamlessX:this.seamlessX,seamlessY:this.seamlessY,vaePrecision:this.vaePrecision,cpuNoise:this.cpuNoise,count:this.count,seed:this.seed,board:this.board,selectedLoras:this.selectedLoras,selectedTriggers:this.selectedTriggers,selectedChars:this.selectedChars,selectedPoses:this.selectedPoses,outfitOn:this.outfitOn,outfitText:this.outfitText,outfitGear:this.outfitGear,outfitFace:this.outfitFace,outfitMisc:this.outfitMisc,outfitMiscBatch:this.outfitMiscBatch,outfitTier:this.outfitTier,outfitBackground:this.outfitBackground,outfitUnderwearColor:this.outfitUnderwearColor,outfitPubicHair:this.outfitPubicHair,outfitPubicHairColor:this.outfitPubicHairColor,outfitLockColors:this.outfitLockColors,outfitLoadoutId:this.outfitLoadoutId,outfitWardrobeId:this.outfitWardrobeId,camera:this.camera,detailerEnabled:this.detailerEnabled,detailerModel:this.detailerModel,detailerPrompt:this.detailerPrompt,detailerNegative:this.detailerNegative,detailerConfidence:this.detailerConfidence,detailerDenoise:this.detailerDenoise,detailerMaskBlur:this.detailerMaskBlur,open:this.open,showOptions:this.showOptions,shots:this.shots.map(e=>({id:e.id,seed:e.seed,saved:e.saved,info:e.info,outfitFilename:e.outfitFilename,outfitSlot:e.outfitSlot,outfitConfig:e.outfitConfig,cutoutReviewed:e.cutoutReviewed,previewVersion:e.previewVersion,workspaceX:e.workspaceX,workspaceY:e.workspaceY})),scrollTop:((t=this.scrollHost)==null?void 0:t.scrollTop)??0})}restoreDraft(){const t=Ie();this.draftRestored=!0,t&&(t.prompt!==void 0&&(this.prompt=t.prompt),t.negative!==void 0&&(this.negative=t.negative),t.checkpoint!==void 0&&(this.checkpoint=t.checkpoint),t.vae!==void 0&&(this.vae=t.vae),t.templateId!==void 0&&(this.templateId=t.templateId),t.scheduler!==void 0&&(this.scheduler=t.scheduler),t.width!==void 0&&(this.width=t.width),t.height!==void 0&&(this.height=t.height),t.steps!==void 0&&(this.steps=t.steps),t.cfg!==void 0&&(this.cfg=t.cfg),t.cfgRescale!==void 0&&(this.cfgRescale=t.cfgRescale),t.clipSkip!==void 0&&(this.clipSkip=t.clipSkip),t.seamlessX!==void 0&&(this.seamlessX=t.seamlessX),t.seamlessY!==void 0&&(this.seamlessY=t.seamlessY),t.vaePrecision!==void 0&&(this.vaePrecision=t.vaePrecision),t.cpuNoise!==void 0&&(this.cpuNoise=t.cpuNoise),t.count!==void 0&&(this.count=t.count),t.seed!==void 0&&(this.seed=t.seed),t.board!==void 0&&(this.board=t.board),t.selectedLoras&&(this.selectedLoras=t.selectedLoras),t.selectedTriggers&&(this.selectedTriggers=t.selectedTriggers),t.selectedChars&&(this.selectedChars=t.selectedChars),t.selectedPoses&&(this.selectedPoses=t.selectedPoses),t.outfitOn!==void 0&&(this.outfitOn=t.outfitOn),t.outfitText!==void 0&&(this.outfitText=t.outfitText),t.outfitGear!==void 0&&(this.outfitGear=Kt(t.outfitGear)),t.outfitFace!==void 0&&(this.outfitFace=Math.max(0,Math.min(M.length-1,Math.round(t.outfitFace)))),t.outfitMisc!==void 0&&(this.outfitMisc=O.some(e=>e.id===t.outfitMisc)?t.outfitMisc:""),t.outfitMiscBatch!==void 0&&(this.outfitMiscBatch=t.outfitMiscBatch),t.outfitTier!==void 0&&(this.outfitTier=Math.max(0,Math.min(A.length-1,Math.round(t.outfitTier)))),t.outfitBackground!==void 0&&(this.outfitBackground=t.outfitBackground),t.outfitUnderwearColor!==void 0&&(this.outfitUnderwearColor=t.outfitUnderwearColor),t.outfitPubicHair!==void 0&&(this.outfitPubicHair=t.outfitPubicHair),t.outfitPubicHairColor!==void 0&&(this.outfitPubicHairColor=t.outfitPubicHairColor),t.outfitLockColors!==void 0&&(this.outfitLockColors=t.outfitLockColors),t.outfitLoadoutId!==void 0&&(this.outfitLoadoutId=t.outfitLoadoutId),t.outfitWardrobeId!==void 0&&(this.outfitWardrobeId=t.outfitWardrobeId),t.camera&&(this.camera={...Gt,...t.camera}),t.detailerEnabled!==void 0&&(this.detailerEnabled=t.detailerEnabled),t.detailerModel!==void 0&&(this.detailerModel=t.detailerModel),t.detailerPrompt!==void 0&&(this.detailerPrompt=t.detailerPrompt),t.detailerNegative!==void 0&&(this.detailerNegative=t.detailerNegative),t.detailerConfidence!==void 0&&(this.detailerConfidence=t.detailerConfidence),t.detailerDenoise!==void 0&&(this.detailerDenoise=t.detailerDenoise),t.detailerMaskBlur!==void 0&&(this.detailerMaskBlur=t.detailerMaskBlur),t.open&&(this.open=t.open),t.showOptions!==void 0&&(this.showOptions=t.showOptions),t.shots&&(this.shots=t.shots.map(e=>({...e}))),t.scrollTop&&(this.pendingScroll=t.scrollTop),this.restoredNotice=!0)}async loadStatus(){this.status=null,this.error="";try{const t=await u.imageGenStatus();this.status=t,!this.checkpoint&&t.models&&t.models.length&&this.pickModel(t.models[0])}catch(t){this.status={enabled:!0,reachable:!1,error:t.message}}}async loadCharacters(){try{const t=await u.characters();this.characters=t.characters;const e=new Set(t.characters.map(i=>i.id));this.selectedChars=this.selectedChars.filter(i=>e.has(i))}catch{}}async loadPoses(){try{const t=await u.poses();this.poses=t.poses;const e=new Set(t.poses.map(i=>i.id));this.selectedPoses=this.selectedPoses.filter(i=>e.has(i))}catch{}}async loadWildcards(){try{this.wildcards=(await u.wildcards()).wildcards}catch{}}async loadFromMedia(t){try{const e=await u.mediaGeneration(t),i=e.info;if(i&&typeof i.prompt=="string"&&Array.isArray(i.loras))this.reuseGenInfo({...i,loras:i.loras.filter(s=>s&&typeof s.name=="string")});else{const s={},a=(e.prompt||"").replace(/<lora:([^:>]+):([-\d.]+)>/g,(r,n,l)=>(s[n]=Number(l)||1,"")).replace(/\s{2,}/g," ").trim();this.prompt=a||e.title,this.selectedLoras=s,this.templateId="",this.selectedChars=[],this.selectedPoses=[],this.outfitOn=!1,this.showOptions=!0}this.editing={id:t,title:e.title,tags:e.tags??[]},this.showToast(`Editing “${e.title}” — generate, then save beside it or in its place.`)}catch(e){this.showToast(`Couldn't open that picture here: ${e.message}`)}}get editingLibby(){var t;return!!((t=this.editing)!=null&&t.tags.some(e=>e==="character:libby"||e==="libby"))}pickModel(t){this.checkpoint=t.title;const e=t.defaults;e&&(e.steps&&(this.steps=e.steps),e.cfgScale&&(this.cfg=e.cfgScale),e.cfgRescale!==void 0&&(this.cfgRescale=e.cfgRescale),e.scheduler&&(this.scheduler=e.scheduler),e.width&&(this.width=e.width),e.height&&(this.height=e.height),e.vae&&(this.vae=e.vae),this.vaePrecision="fp32")}get speechSupported(){return ee()!=null}toggleListening(){if(this.listening){this.stopListening();return}const t=ee();if(!t)return;const e=new t;e.lang=navigator.language||"en-US",e.continuous=!1,e.interimResults=!0,e.onresult=i=>{let s="";for(let a=0;a<i.results.length;a++)s+=i.results[a][0].transcript;this.speech=s},e.onerror=i=>{this.error=i.error==="not-allowed"?"Microphone permission was denied.":`Speech error: ${i.error}`,this.stopListening()},e.onend=()=>{this.listening=!1,this.speech.trim()&&this.optimize(this.speech)},this.recognition=e,this.listening=!0,this.error="";try{e.start()}catch{this.listening=!1}}stopListening(){if(this.listening=!1,this.recognition){try{this.recognition.stop()}catch{}this.recognition=null}}async optimize(t){this.optimizing=!0;try{const{prompt:e,negativePrompt:i}=await u.optimizePrompt(t);this.prompt=e,this.negative||(this.negative=i)}catch(e){this.error=e.message}finally{this.optimizing=!1}}equippedOutfitTerms(){var e;const t=((e=this.status)==null?void 0:e.backend)??"";return j.flatMap(i=>{const s=Xt(i,this.pieceFor(i.key),t,this.outfitLockColors);return s?[s]:[]})}pieceFor(t){const e=this.outfitGear[t];return e.off?{color:"",item:""}:e.color.trim()||t!=="bra"&&t!=="panties"?e:{color:this.outfitUnderwearColor.trim()||"black",item:e.item}}outfitColorNegatives(){if(!this.outfitLockColors)return[];const t=new Set;for(const e of j)for(const i of Ke(e,this.pieceFor(e.key)))t.add(i);return[...t]}outfitExposurePrompt(t){const e=this.pieceFor("bra").color,i=this.pieceFor("panties").color,s=G(this.outfitGear.top),a=G(this.outfitGear.bottoms),r=G(this.outfitGear.bra),n=G(this.outfitGear.panties),l=[];return!s&&!a?l.push("no outer top or bottoms equipped"):t.clothes==="on"?l.push("equipped outer clothes fully on and properly worn"):t.clothes==="displaced"?l.push("equipped outer clothes loosened and partly displaced, clothing slipping or pulled aside"):l.push("equipped outer clothes removed or mostly off her body"),r?t.bra==="hidden"&&s&&t.clothes==="on"?l.push(`${e} bra completely covered, bra not showing`):t.bra==="off"?l.push(s&&t.clothes==="on"?"bra removed but breasts covered by the top":"bra removed, bare breasts and nipples visible"):l.push(`${e} bra clearly showing, top shifted enough to reveal it`):l.push(s&&t.clothes==="on"?"no bra equipped, breasts covered by the top":"no bra equipped, bare breasts and nipples visible"),n?t.panties==="hidden"&&a&&t.clothes==="on"?l.push(`${i} panties completely covered, panties not showing`):t.panties==="off"?l.push(a&&t.clothes==="on"?"panties removed but vulva covered by the bottoms":"panties removed, vulva visible"):l.push(`${i} panties clearly showing, bottoms shifted enough to reveal them`):l.push(a&&t.clothes==="on"?"no panties equipped, vulva covered by the bottoms":"no panties equipped, vulva visible"),l.join(", ")}outfitFragment(){if(!this.outfitOn)return{prompt:"",negative:""};const t=M[this.outfitFace],e=O.find(h=>h.id===this.outfitMisc),i=e?e.heat:this.outfitTier,s=A[i],a=Ze(i),r=this.outfitBackground==="black"?"perfectly solid pure black studio background, seamless black backdrop, background evenly lit with no texture":"perfectly solid pure white studio background, seamless white backdrop, background evenly lit with no texture",n=G(this.outfitGear.bottoms)&&a.clothes==="on",l=i===A.length-1?this.outfitPubicHair?n?`${this.outfitPubicHairColor.trim()||"dark brown"} pubic hair present beneath the bottoms`:`${this.outfitPubicHairColor.trim()||"dark brown"} pubic hair visible`:"clean-shaven pubic area, no pubic hair":"";return{prompt:["solo, one person, single subject",Re(this.camera.shot),e?e.face:t.face,e?e.pose:t.pose,s.mood,...this.equippedOutfitTerms(),this.outfitExposurePrompt(a),l,this.outfitText.trim(),r].filter(Boolean).join(", "),negative:["multiple people, two people, group, crowd, 2girls, 2boys, extra person, duplicate person",e?"":"arms raised, hands above head, arms behind head, hands in hair, both hands near face","detailed background, scenery, gradient background, patterned background, background shadows",this.outfitBackground==="black"?"white background":"black background",this.outfitPubicHair?"":"pubic hair",...this.outfitColorNegatives(),this.outfitLockColors?"recolored clothing, wrong clothing color, color bleed":""].filter(Boolean).join(", ")}}applyCameraFraming(){const{width:t,height:e}=Ue(this.camera,Fe(this.width,this.height));this.width=t,this.height=e}editCamera(t){this.camera={...this.camera,...t},t.framing&&this.applyCameraFraming()}nextOutfitPose(){if(this.outfitMisc){const e=O.findIndex(i=>i.id===this.outfitMisc)+1;this.outfitMisc=O[e%O.length].id;return}const t=this.outfitFace+1;if(t<M.length){this.outfitFace=t;return}this.outfitFace=0,this.outfitTier=(this.outfitTier+1)%A.length}assemblePrompts(){var n,l,p;const t=this.outfitFragment(),e=[this.prompt.trim(),...this.selectedTriggers,t.prompt],i=[this.negative.trim(),t.negative];for(const h of this.selectedChars){const f=this.characters.find(b=>b.id===h);f&&(f.prompt.trim()&&e.push(f.prompt.trim()),(n=f.negativePrompt)!=null&&n.trim()&&i.push(f.negativePrompt.trim()))}if(!this.outfitOn)for(const h of this.selectedPoses){const f=this.poses.find(b=>b.id===h);f&&(f.prompt.trim()&&e.push(f.prompt.trim()),(l=f.negativePrompt)!=null&&l.trim()&&i.push(f.negativePrompt.trim()))}let s=e.filter(Boolean).join(", "),a=i.filter(Boolean).join(", ");const r=(((p=this.status)==null?void 0:p.templates)??[]).find(h=>h.id===this.templateId);return r&&(r.prompt.includes("{prompt}")?s=r.prompt.replaceAll("{prompt}",s):r.prompt.trim()&&(s=`${s}, ${r.prompt.trim()}`),r.negativePrompt.includes("{prompt}")?a=r.negativePrompt.replaceAll("{prompt}",a):r.negativePrompt.trim()&&(a=a?`${a}, ${r.negativePrompt.trim()}`:r.negativePrompt.trim())),{prompt:s,negative:a}}outfitSlot(t=this.outfitTier,e=this.outfitFace,i=this.outfitMisc){const s=O.find(p=>p.id===i),a=s??M[e],r=s?0:t,n=s?{label:"Misc"}:A[t];return{slot:{emotion:a.id,emotionLabel:a.label,tier:r,tierLabel:n.label,index:Ti(r,e,s?s.id:"")},filename:qe(this.outfitText,n.label,a.id)}}shotAt(t){const e=_(t);return this.shots.find(i=>i.outfitSlot&&_(i.outfitSlot)===e)}staleShots(){return this.currentOutfitShots().filter(t=>!this.shotMatchesCurrentOutfit(t))}currentOutfitShots(){const t=new Map;for(const i of this.shots)i.outfitSlot&&t.set(_(i.outfitSlot),i);const e=[];for(let i=0;i<H+tt;i++){const{tier:s,face:a,misc:r}=ie(i),n=t.get(_(this.outfitSlot(s,a,r).slot));n&&e.push(n)}return e}outfitConfigKey(){const t=this.outfitPubicHair;return JSON.stringify({v:2,background:this.outfitBackground,underwear:this.outfitUnderwearColor.trim().toLowerCase()||"black",pubicHair:t,pubicHairColor:t?this.outfitPubicHairColor.trim().toLowerCase()||"dark brown":"",lockColors:this.outfitLockColors,gear:Qe(this.outfitGear)})}shotMatchesCurrentOutfit(t){return t.outfitConfig?t.outfitConfig===this.outfitConfigKey():this.outfitBackground==="white"&&(this.outfitUnderwearColor.trim().toLowerCase()||"black")==="black"&&!this.outfitPubicHair&&j.every(({key:e})=>this.outfitGear[e].item.trim()===kt[e].item)}previewURL(t){if(t.wipOutfitId&&t.outfitSlot)return u.libbyOutfitWipImageURL(t.wipOutfitId,t.outfitSlot.emotion,t.outfitSlot.tier,t.previewVersion);const e=u.genPreviewURL(t.id);return t.previewVersion?`${e}?v=${t.previewVersion}`:e}async ensureWardrobe(){var i;if(this.outfitWardrobeId)return this.outfitWardrobeId;const t=this.outfitText.trim()||"Work in progress",e=await u.saveLibbyOutfit({name:t});return this.outfitWardrobeId=e.id,this.wardrobes=(await u.libbyOutfits()).outfits,(i=this.renderRoot.querySelector("oppai-outfit-wardrobe"))==null||i.refresh(),this.persistDraft(),this.showToast(`Keeping this outfit in a new wardrobe, “${e.name}”.`),e.id}async storeOutfitWip(t,e,i,s=!1){if(!t.outfitSlot)return"";try{const a=await fetch(e,{credentials:"same-origin"});if(!a.ok)throw new Error(`preview returned ${a.status}`);const r=await dt(await a.blob());return await u.putLibbyOutfitWip(i,t.outfitSlot.emotion,t.outfitSlot.tier,{imageData:r,filename:t.outfitFilename,seed:t.seed,reviewed:s,config:t.outfitConfig,info:t.info,clothing:[...this.equippedOutfitTerms(),this.outfitText.trim()].filter(Boolean).join(", ")}),i}catch(a){return this.showToast(`Couldn't keep this square: ${a.message}`),""}}async loadWipBoard(t){if(!t)return;let e;try{e=(await u.libbyOutfitWip(t)).squares}catch{return}const i=e.map(a=>{const r=M.findIndex(h=>h.id===a.emotion),n=O.some(h=>h.id===a.emotion)?a.emotion:"",l=n?0:Math.max(0,Math.min(A.length-1,a.level)),p=this.outfitSlot(l,Math.max(0,r),n);return{id:`wip-${t}-${a.emotion}-${a.level}`,seed:a.seed??-1,saved:!1,info:a.info,outfitFilename:a.filename||p.filename,outfitSlot:p.slot,outfitConfig:a.config,cutoutReviewed:a.reviewed,previewVersion:a.updatedAt,wipOutfitId:t}}),s=new Set(i.map(a=>`${a.outfitSlot.emotion}:${a.outfitSlot.tier}`));this.shots=[...this.shots.filter(a=>a.outfitSlot?a.wipOutfitId&&a.wipOutfitId!==t?!1:!s.has(`${a.outfitSlot.emotion}:${a.outfitSlot.tier}`):!0),...i],this.persistDraft()}defaultNodePosition(t){return{workspaceX:18+t%4*282,workspaceY:18+Math.floor(t/4)*430}}selectOutfitSlot(t){const{tier:e,face:i,misc:s}=ie(t);this.outfitMisc=s,s?this.sheetTab="misc":(this.outfitTier=e,this.outfitFace=i,this.sheetTab="faces")}renderGenerating(t){const e=this.progress,i=(e==null?void 0:e.total)??0,s=e?Math.max(0,Math.min(1,e.percent)):0,a=e!=null&&e.cancelled?"Stopping…":i>0?`Step ${e.step} of ${i}`:t?"Invoking generation…":"Generating image…";return o`<div class="generating-overlay">
      <div class="generating-card ${e!=null&&e.image?"with-preview":""}">
        ${e!=null&&e.image?o`<img class="progress-preview" src=${e.image} alt="The picture so far" />`:c}
        <div class="progress-row">
          <md-circular-progress indeterminate style="--md-circular-progress-size:22px;"></md-circular-progress>
          <span class="progress-label">${a}</span>
          <button class="progress-cancel" type="button" ?disabled=${e==null?void 0:e.cancelled} title="Stop this generation" @click=${()=>void this.cancelGeneration()}>
            <span class="material-symbols-rounded" style="font-size:18px;">close</span>Cancel
          </button>
        </div>
        <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(s*100)}>
          <span style=${`width:${Math.round(s*100)}%`}></span>
        </div>
      </div>
    </div>`}async generateOne(t){var w,$;const{prompt:e,negative:i}=this.assemblePrompts(),s=this.outfitText.trim(),a=this.outfitOn?this.outfitSlot():void 0,r=a?this.outfitConfigKey():void 0,n=a?this.shotAt(a.slot):void 0,l=n?this.nodePosition(n,this.shots.indexOf(n)):void 0,p=performance.now(),h={prompt:e,negativePrompt:i||void 0,checkpoint:this.checkpoint||void 0,vae:this.vae||void 0,sampler:this.scheduler||void 0,steps:this.steps,width:this.width,height:this.height,cfgScale:this.cfg,cfgRescale:this.cfgRescale,clipSkip:this.clipSkip,seamlessX:this.seamlessX,seamlessY:this.seamlessY,vaePrecision:this.vaePrecision,cpuNoise:this.cpuNoise,board:this.board,count:this.outfitOn?1:this.count,seed:this.seed,loras:Object.entries(this.selectedLoras).map(([z,S])=>({name:z,weight:S})),detailer:(w=this.status)!=null&&w.detailerAvailable&&this.detailerEnabled?{enabled:!0,model:this.detailerModel,prompt:this.detailerPrompt||void 0,negativePrompt:this.detailerNegative||void 0,confidence:this.detailerConfidence,denoise:this.detailerDenoise,maskBlur:this.detailerMaskBlur}:void 0};h.jobId=zi(),this.startProgressWatch(h.jobId,h.count??1);let f;try{f=await u.generate(h)}finally{this.stopProgressWatch()}f.rolled&&typeof f.positive=="string"&&(h.prompt=f.positive,h.negativePrompt=f.negative||void 0);const b=(performance.now()-p)/1e3,x=f.images.map((z,S)=>{var C,P,k,Y,at,N;return{...z,saved:!1,outfitFilename:a==null?void 0:a.filename,outfitSlot:a==null?void 0:a.slot,outfitConfig:r,...l&&a?{workspaceX:l.x,workspaceY:l.y}:this.defaultNodePosition((t?this.shots.length:0)+S),info:Se(h,{seed:z.seed,backend:((C=this.status)==null?void 0:C.backend)??"unknown",modelHash:(Y=(k=(P=this.status)==null?void 0:P.models)==null?void 0:k.find(U=>U.title===h.checkpoint))==null?void 0:Y.hash,loraHashes:Object.fromEntries((((at=this.status)==null?void 0:at.loras)??[]).filter(U=>U.hash).map(U=>[U.name,U.hash])),triggers:this.selectedTriggers,characters:this.selectedChars.map(U=>{var X;return((X=this.characters.find(yt=>yt.id===U))==null?void 0:X.name)??""}).filter(Boolean),poses:this.outfitOn?[]:this.selectedPoses.map(U=>{var X;return((X=this.poses.find(yt=>yt.id===U))==null?void 0:X.name)??""}).filter(Boolean),outfit:this.outfitOn?s:"",controlImage:(N=this.cutout)==null?void 0:N.name,seconds:b})}});if(t&&a){if(x.length)try{const S=await this.ensureWardrobe(),C=await this.storeOutfitWip(x[0],this.previewURL(x[0]),S);C&&(x[0].wipOutfitId=C,x[0].previewVersion=Date.now())}catch(S){this.showToast(`Couldn't keep this square: ${S.message}`)}n&&x.length&&!n.id.startsWith("wip-")&&await u.deleteGenPreview(n.id);const z=_(a.slot);this.shots=[...this.shots.filter(S=>!S.outfitSlot||_(S.outfitSlot)!==z),...x]}else this.shots=x;return($=this.galleryPanel)==null||$.refresh(),x.length}startProgressWatch(t,e){this.stopProgressWatch(),this.jobId=t,this.progress={index:0,step:0,total:0,percent:0,seq:0,done:!1,cancelled:!1},this.progressSeen=0;const i=async()=>{var s,a;if(this.jobId===t){try{const r=await u.genProgress(t,this.progressSeen);if(this.jobId!==t)return;const n=r.image??(r.seq===this.progressSeen?(s=this.progress)==null?void 0:s.image:void 0);if(this.progress={...r,image:n,total:r.total||((a=this.progress)==null?void 0:a.total)||0},this.progressSeen=r.seq,r.done)return}catch{}this.progressTimer=window.setTimeout(()=>void i(),1e3)}};this.progressTimer=window.setTimeout(()=>void i(),600)}stopProgressWatch(){window.clearTimeout(this.progressTimer),this.progressTimer=0,this.jobId="",this.progress=null}async cancelGeneration(){const t=this.jobId;if(t){this.progress&&(this.progress={...this.progress,cancelled:!0});try{await u.cancelGenerate(t)}catch(e){this.showToast(`Couldn't cancel: ${e.message}`)}}}async generate(){if(!(this.generating||!this.assemblePrompts().prompt.trim())){this.generating=!0,this.error="";try{await this.generateOne(this.outfitOn)}catch(t){/cancelled/i.test(t.message)?this.showToast("Generation cancelled."):this.error=t.message}finally{this.generating=!1,this.persistDraft()}}}async generateOutfitAndNext(){if(!(this.generating||!this.outfitOn||!this.assemblePrompts().prompt.trim())){this.generating=!0,this.error="";try{await this.generateOne(!0)&&this.nextOutfitPose()}catch(t){this.error=t.message}finally{this.generating=!1,this.persistDraft()}}}async generateAllOutfit(){if(this.generating||!this.outfitOn||!this.assemblePrompts().prompt.trim())return;this.generating=!0,this.outfitBatchRunning=!0,this.stopOutfitBatch=!1,this.error="";const t=H+(this.outfitMiscBatch?tt:0);try{for(let i=0;i<t&&!this.stopOutfitBatch;i++){this.selectOutfitSlot(i);const{slot:s}=this.outfitSlot();this.shotAt(s)||(this.outfitProgress=`Generating ${i+1} of ${t} · ${s.tierLabel} · ${s.emotionLabel}`,await this.generateOne(!0),this.persistDraft())}const e=this.currentOutfitShots().length;this.outfitProgress=this.stopOutfitBatch?`Stopped with ${e} of ${t} ready.`:`Outfit complete · ${e} of ${t} ready.`}catch(e){this.error=e.message,this.outfitProgress=`Paused with ${this.currentOutfitShots().length} of ${t} ready. Run missing images to resume.`}finally{this.generating=!1,this.outfitBatchRunning=!1,this.persistDraft()}}async regenerateStale(){if(this.generating||!this.outfitOn||!this.assemblePrompts().prompt.trim())return;const t=this.staleShots();if(t.length){this.generating=!0,this.outfitBatchRunning=!0,this.stopOutfitBatch=!1,this.error="";try{for(let i=0;i<t.length&&!this.stopOutfitBatch;i++){const s=t[i].outfitSlot;this.selectOutfitSlot(s.index),this.outfitProgress=`Redoing ${i+1} of ${t.length} · ${s.tierLabel} · ${s.emotionLabel}`,await this.generateOne(!0),this.persistDraft()}const e=this.staleShots().length;this.outfitProgress=e?`Stopped with ${e} square${e===1?"":"s"} still on the old recipe.`:"Every square is on the current recipe."}catch(e){this.error=e.message}finally{this.generating=!1,this.outfitBatchRunning=!1,this.persistDraft()}}}cancelOutfitBatch(){this.stopOutfitBatch=!0,this.outfitProgress="Stopping after the current image…"}async copyGenInfo(t,e){if(!t.info){this.showToast("No generation data was recorded for this image.");return}const i=e==="json"?et(t.info):V(t.info);await ne(i)?this.showToast(e==="json"?"Full data copied as JSON":"Generation data copied"):this.showToast("Couldn't reach the clipboard — this needs HTTPS or a permission.")}reuseGenInfo(t){var i;const e=Te(t);this.prompt=e.prompt,this.negative=e.negativePrompt??"",this.checkpoint=e.checkpoint??"",this.vae=e.vae??"",this.scheduler=e.sampler??"",this.seed=e.seed??-1,this.steps=e.steps??25,this.cfg=e.cfgScale??7,this.cfgRescale=e.cfgRescale??0,this.clipSkip=e.clipSkip??0,this.width=e.width??512,this.height=e.height??768,this.seamlessX=!!e.seamlessX,this.seamlessY=!!e.seamlessY,this.vaePrecision=e.vaePrecision??"fp32",this.cpuNoise=e.cpuNoise!==!1,this.count=1,this.selectedLoras=Object.fromEntries((e.loras??[]).map(s=>[s.name,s.weight])),this.board=e.board??"none",this.detailerEnabled=!!((i=e.detailer)!=null&&i.enabled),e.detailer&&(this.detailerModel=e.detailer.model??"face_yolov8n.pt",this.detailerPrompt=e.detailer.prompt??"",this.detailerNegative=e.detailer.negativePrompt??"",this.detailerConfidence=e.detailer.confidence??.3,this.detailerDenoise=e.detailer.denoise??.4,this.detailerMaskBlur=e.detailer.maskBlur??4),this.templateId="",this.selectedTriggers=[],this.selectedChars=[],this.selectedPoses=[],this.outfitOn=!1,this.showOptions=!0,this.showToast("Generation parameters loaded")}async exportShot(t){if(!t.info){this.showToast("No generation data was recorded for this image.");return}try{await le(this.previewURL(t),t.outfitFilename??`oppailib-seed-${t.seed}.png`,V(t.info),et(t.info)),this.showToast("PNG exported with Civitai metadata")}catch(e){this.showToast(e.message)}}async exportOutfitZip(){const t=this.currentOutfitShots();if(!t.length||this.outfitExporting)return;const e=t.filter(a=>!a.cutoutReviewed);if(e.length){this.error=`Review the automatic background cutout for all ${e.length} remaining outfit image${e.length===1?"":"s"} before exporting.`;return}this.outfitExporting=!0;const i=[],s=[];try{for(let p=0;p<t.length;p++){const h=t[p];this.outfitProgress=`Preparing ${p+1} of ${t.length} for the outfit ZIP…`;try{const f=await fetch(this.previewURL(h),{credentials:"same-origin"});if(!f.ok)throw new Error(`preview returned ${f.status}`);let b=new Uint8Array(await f.arrayBuffer());h.info&&(b=It(b,V(h.info),et(h.info))),i.push({name:h.outfitFilename,data:b})}catch{s.push(h.outfitFilename??`seed-${h.seed}.png`)}}if(s.length){const p=new Set(s);this.shots=this.shots.filter(h=>!h.outfitFilename||!p.has(h.outfitFilename)),this.persistDraft()}if(!i.length)throw new Error("The generated previews expired. Generate the missing outfit images again.");const a={outfit:this.outfitText.trim(),loadout:this.outfitGear,expected:M.length*A.length,exported:i.length,generationBackground:this.outfitBackground,colorsLocked:this.outfitLockColors,underwearColor:this.outfitUnderwearColor.trim()||"black",pubicHair:this.outfitPubicHair,pubicHairColor:this.outfitPubicHair?this.outfitPubicHairColor.trim()||"dark brown":void 0,backgroundRemoved:!0,cutoutReviewed:!0,images:t.filter(p=>!s.includes(p.outfitFilename??"")).map(p=>({file:p.outfitFilename,...p.outfitSlot}))};i.push({name:"outfit-manifest.json",data:new TextEncoder().encode(JSON.stringify(a,null,2))});const r=await li(i),n=URL.createObjectURL(r),l=document.createElement("a");l.href=n,l.download=He(this.outfitText),l.click(),setTimeout(()=>URL.revokeObjectURL(n),0),this.outfitProgress=s.length?`Exported ${i.length-1} images; ${s.length} expired preview${s.length===1?"":"s"} need regenerating.`:`Exported ${i.length-1} correctly named outfit images in one ZIP.`,this.showToast(s.length?"Outfit ZIP exported with missing previews.":"Outfit ZIP exported.")}catch(a){this.error=a.message}finally{this.outfitExporting=!1}}openShotMenu(t,e){e.preventDefault(),Tt({x:e.clientX,y:e.clientY,title:`Seed ${t.seed}`,items:[{label:"Copy generation metadata",icon:"content_copy",run:()=>void this.copyGenInfo(t,"text")},{label:"Use same generation parameters",icon:"replay",disabled:!t.info,run:()=>{t.info&&this.reuseGenInfo(t.info)}},{label:"Export PNG for Civitai",icon:"download",disabled:!t.info,run:()=>void this.exportShot(t)},{label:"Use as a Libby background",icon:"wallpaper",run:()=>void this.useAsBackground(t)},{label:"Save as a pose…",icon:"accessibility_new",run:()=>this.poseFromShot(t)},{label:"Send in chat as Libby…",icon:"send",run:()=>void this.sendAsLibby(t)},...this.editing?[{label:`Replace “${this.editing.title}” in the library`,icon:"published_with_changes",run:()=>void this.replaceOriginal(t)}]:[]]})}poseFromShot(t){var e;this.poseDraft={name:"",prompt:((e=t.info)==null?void 0:e.prompt)??this.prompt,negativePrompt:"",previewId:t.id.startsWith("wip-")?void 0:t.id}}async sendAsLibby(t){const e=window.prompt("What does she say with it? (leave blank for just the picture)","");if(e!==null)try{const i=await this.saveShot(t,["libby"]),s=await u.libbySend({mediaId:i,text:e.trim()});this.showToast("She sent it — it's in her chat."),this.dispatchEvent(new CustomEvent("libby-sent",{bubbles:!0,composed:!0,detail:s}))}catch(i){this.showToast(`Couldn't send that: ${i.message}`)}}async replaceOriginal(t){const e=this.editing;if(e&&confirm(`Replace “${e.title}” with this picture? The original is deleted.`))try{const i=e.tags.filter(a=>a!=="ai-generated"),s=await this.saveShot(t,i,e.title);s!==e.id&&await u.deleteMedia(e.id),this.editing={...e,id:s},this.showToast(`Replaced “${e.title}”.`),this.dispatchEvent(new CustomEvent("imported",{bubbles:!0,composed:!0}))}catch(i){this.showToast(`Couldn't replace it: ${i.message}`)}}async saveShot(t,e=[],i){var r,n;const s=i??((((n=(r=t.info)==null?void 0:r.prompt)==null?void 0:n.trim())||this.prompt.trim()||this.outfitText.trim()).slice(0,80)||"Generated image"),a=await u.saveGenerated({id:t.id,title:s,tags:e,info:t.info});return this.shots=this.shots.map(l=>l.id===t.id?{...l,saved:!0}:l),this.dispatchEvent(new CustomEvent("imported",{bubbles:!0,composed:!0})),a.id}async exportOutfitSquare(t){const e=t.outfitFilename??`oppailib-seed-${t.seed}.png`;try{const i=await fetch(this.previewURL(t),{credentials:"same-origin"});if(!i.ok)throw new Error(`preview returned ${i.status}`);let s=new Uint8Array(await i.arrayBuffer());if(t.info)try{s=It(s,V(t.info),et(t.info))}catch{}const a=URL.createObjectURL(new Blob([s],{type:"image/png"})),r=document.createElement("a");r.href=a,r.download=e,r.click(),setTimeout(()=>URL.revokeObjectURL(a),0),this.showToast(t.cutoutReviewed?`Exported ${e}`:`Exported ${e} — its cutout hasn't been reviewed yet.`)}catch(i){this.showToast(`Couldn't export that square: ${i.message}`)}}async useAsBackground(t){var p,h,f;const e=((p=t.info)==null?void 0:p.prompt)??this.prompt,s=(e.split(/[,\n]/).map(b=>b.trim()).filter(Boolean).find(b=>/^[a-z][a-z ]{2,40}$/i.test(b)&&!/masterpiece|quality|detailed|resolution|score_/i.test(b))??"Generated room").replace(/\b\w/g,b=>b.toUpperCase()).slice(0,60),a=(h=window.prompt("Name this background",s))==null?void 0:h.trim();if(!a)return;const r=new Set(["masterpiece","best","quality","detailed","highly","ultra","high","resolution","the","and","with","very","background","scenery","score","absurdres"]),n=[...new Set(e.toLowerCase().match(/[a-z]{4,}/g)??[])].filter(b=>!r.has(b)).slice(0,8),l=window.prompt("Tags — what it is, comma separated (she reads these to pick a room)",n.join(", "));if(l!==null)try{const b=await fetch(this.previewURL(t),{credentials:"same-origin"});if(!b.ok)throw new Error(`preview returned ${b.status}`);const x=await dt(await b.blob()),w=await u.saveLibbyBackground({name:a,tags:l.split(",").map($=>$.trim()).filter(Boolean)});await u.setLibbyBackgroundImage(w.id,x),this.showToast(`Added “${a}” to the rooms Libby can be in.`),(f=this.renderRoot.querySelector("oppai-outfit-wardrobe"))==null||f.refresh()}catch(b){this.showToast(`Couldn't add that background: ${b.message}`)}}async save(t){if(!t.saved)try{await this.saveShot(t,this.editingLibby?["libby"]:[]),this.showToast("Saved to library")}catch(e){this.showToast(e.message)}}bumpThumbs(){this.thumbVersion++,this.failedThumbs=new Set}renderArt(t,e,i){return this.failedThumbs.has(t)?o`<div class="card-blank">
        <span class="material-symbols-rounded" style="font-size:34px;">${i}</span>
      </div>`:o`<img
      class="card-art"
      src=${t}
      alt=${e}
      loading="lazy"
      @error=${()=>{this.failedThumbs=new Set(this.failedThumbs).add(t)}}
    />`}async useAsModelThumb(t){if(!this.checkpoint){this.showToast("Pick a model first");return}try{await u.setModelThumb({model:this.checkpoint,previewId:t.id}),this.bumpThumbs(),this.showToast("Model preview synced to InvokeAI")}catch(e){this.showToast(e.message)}}async openMetaEditor(t){this.metaBusy=!0;try{const e=await u.modelMeta(t);this.metaDraft=e,this.metaTriggerText=e.triggerPhrases.join(", ")}catch(e){this.showToast(e.message)}finally{this.metaBusy=!1}}setMetaDefaults(t){const e=this.metaDraft;e&&(this.metaDraft={...e,defaults:{...e.defaults??{},...t}})}async saveMeta(){const t=this.metaDraft;if(!(!t||this.metaBusy)){this.metaBusy=!0;try{await u.patchModelMeta({key:t.key,name:t.name,description:t.description??"",triggerPhrases:this.metaTriggerText.split(",").map(e=>e.trim()).filter(Boolean),defaults:t.defaults}),this.metaDraft=null,this.showToast("Model updated"),await this.loadStatus()}catch(e){this.showToast(e.message)}finally{this.metaBusy=!1}}}async deleteMetaModel(){const t=this.metaDraft;if(!t||this.metaBusy)return;const e=t.type==="lora"?"LoRA":"model";if(confirm(`Delete the ${e} “${t.name}” from InvokeAI? The file goes with it.`)){this.metaBusy=!0;try{if(await u.deleteModel(t.key),this.metaDraft=null,t.type==="lora"){const i={...this.selectedLoras};delete i[t.name],delete i[t.key],this.selectedLoras=i}else this.checkpoint===t.key&&(this.checkpoint="");this.showToast(`${e} deleted`),await this.loadStatus()}catch(i){this.showToast(i.message)}finally{this.metaBusy=!1}}}toggleLora(t){var i,s,a,r,n;const e={...this.selectedLoras};if(t in e){delete e[t];const l=new Set(((s=(((i=this.status)==null?void 0:i.loras)??[]).find(h=>h.name===t))==null?void 0:s.triggerPhrases)??[]),p=new Set((((a=this.status)==null?void 0:a.loras)??[]).filter(h=>h.name in e).flatMap(h=>h.triggerPhrases??[]));this.selectedTriggers=this.selectedTriggers.filter(h=>!l.has(h)||p.has(h))}else{const l=(n=(((r=this.status)==null?void 0:r.loras)??[]).find(p=>p.name===t))==null?void 0:n.weight;e[t]=l&&Number.isFinite(l)?l:1}this.selectedLoras=e}toggleTrigger(t){this.selectedTriggers=this.selectedTriggers.includes(t)?this.selectedTriggers.filter(e=>e!==t):[...this.selectedTriggers,t]}toggleCharacter(t){this.selectedChars=this.selectedChars.includes(t)?this.selectedChars.filter(e=>e!==t):[...this.selectedChars,t]}toggleSection(t){this.open={...this.open,[t]:!this.open[t]}}onCharThumbFile(t){var a;const e=t.target,i=(a=e.files)==null?void 0:a[0];if(e.value="",!i||!this.charDraft)return;const s=new FileReader;s.onload=()=>{this.charDraft&&(this.charDraft={...this.charDraft,imageData:String(s.result)})},s.readAsDataURL(i)}onCharScanFile(t){var a;const e=t.target,i=(a=e.files)==null?void 0:a[0];if(e.value="",!i||!this.charDraft||this.scanBusy)return;const s=new FileReader;s.onload=()=>void this.scanCharImage(String(s.result)),s.readAsDataURL(i)}async scanCharImage(t){if(!(!this.charDraft||this.scanBusy)){this.scanBusy=!0;try{const i=(await u.scanImage(t)).tags.filter(p=>p.category!=="rating").map(p=>p.tag.replace(/_/g," ").trim()).filter(Boolean),s=this.charDraft;if(!s)return;const a=s.prompt.trim(),r=new Set(a.split(",").map(p=>p.trim().toLowerCase()).filter(Boolean)),n=i.filter(p=>!r.has(p.toLowerCase()));if(!n.length){this.showToast("No new tags found");return}const l=a?`${a}, ${n.join(", ")}`:n.join(", ");this.charDraft={...s,prompt:l},this.showToast(`Added ${n.length} tag${n.length===1?"":"s"}`)}catch(e){this.showToast(e.message)}finally{this.scanBusy=!1}}}async saveCharacter(){const t=this.charDraft;if(!(!t||!t.name.trim()||this.charBusy)){this.charBusy=!0;try{await u.saveCharacter({id:t.id,name:t.name.trim(),prompt:t.prompt,negativePrompt:t.negativePrompt,imageData:t.imageData}),this.charDraft=null,this.bumpThumbs(),await this.loadCharacters(),this.showToast("Character saved")}catch(e){this.showToast(e.message)}finally{this.charBusy=!1}}}async deleteCharacter(){const t=this.charDraft;if(!(!(t!=null&&t.id)||this.charBusy)&&confirm(`Delete “${t.name}” from the character library?`)){this.charBusy=!0;try{await u.deleteCharacter(t.id);const e=it("libraryDelete");I(e.message,"success",{emotion:e.emotion,intensity:e.intensity}),this.charDraft=null,await this.loadCharacters(),this.showToast("Character deleted")}catch(e){this.showToast(e.message)}finally{this.charBusy=!1}}}showToast(t){this.toast=t,setTimeout(()=>this.toast="",2600)}render(){return o`<div class="wrap">
        ${this.restoredNotice?this.renderRestoredNotice():c}
        ${this.renderBody()}
      </div>
      ${this.charDraft?this.renderCharEditor(this.charDraft):c}
      ${this.poseDraft?this.renderPoseEditor(this.poseDraft):c}
      ${this.wildcardDraft?this.renderWildcardEditor(this.wildcardDraft):c}
      ${this.metaDraft?this.renderMetaEditor(this.metaDraft):c}
      ${this.expandedShot?this.renderLightbox(this.expandedShot):c}
      ${this.renderCutoutDialog()}
      ${this.toast?o`<div class="toast">${this.toast}</div>`:c}`}renderRestoredNotice(){return o`
      <div class="restored">
        <span class="material-symbols-rounded" style="font-size:18px;">history</span>
        <span class="grow">Picked up where you left off.</span>
        <button class="act" @click=${()=>this.restoredNotice=!1}>Keep it</button>
        <button class="act" @click=${this.startFresh}>Start fresh</button>
      </div>
    `}renderLightbox(t){var a;const e=this.shots.find(r=>r.id===t.id)??t,i=!e.id.startsWith("wip-"),s="This square was restored from the wardrobe — regenerate it to save it elsewhere.";return o`
      <div class="lightbox" @click=${r=>{r.target===r.currentTarget&&(this.expandedShot=null)}}>
        <img src=${this.previewURL(e)} alt="Generated image"
          @contextmenu=${r=>this.openShotMenu(e,r)} />
        <div class="row">
          <button class="btn primary" ?disabled=${e.saved||!i}
            title=${i?"Keep this image in the library":s}
            @click=${()=>this.save(e)}>
            <span class="material-symbols-rounded" style="font-size:17px;">${e.saved?"check":"save"}</span>
            ${e.saved?"Saved":"Save to library"}
          </button>
          ${((a=this.status)==null?void 0:a.backend)==="invokeai"?o`<button class="btn" ?disabled=${!i}
            title=${i?"Set as this model's preview in InvokeAI":s}
            @click=${()=>this.useAsModelThumb(e)}>
            <span class="material-symbols-rounded" style="font-size:17px;">photo_camera</span> Sync model preview
          </button>`:c}
          <button class="btn" @click=${()=>void this.exportShot(e)}>
            <span class="material-symbols-rounded" style="font-size:17px;">download</span> Export for Civitai
          </button>
          <button class="btn" @click=${()=>this.expandedShot=null}>
            <span class="material-symbols-rounded" style="font-size:17px;">close</span> Close
          </button>
        </div>
      </div>
    `}renderMetaEditor(t){var s;const e=t.defaults??{},i=t.type==="lora";return o`
      <div class="overlay" @click=${a=>{a.target===a.currentTarget&&(this.metaDraft=null)}}>
        <div class="dialog">
          <h3>Edit ${i?"LoRA":"model"} — synced with InvokeAI</h3>
          <div>
            <label class="field">Name</label>
            <input type="text" .value=${t.name}
              @input=${a=>this.metaDraft={...t,name:a.target.value}} />
          </div>
          <div>
            <label class="field">Description</label>
            <textarea .value=${t.description??""}
              @input=${a=>this.metaDraft={...t,description:a.target.value}}></textarea>
          </div>
          <div>
            <label class="field">Trigger phrases (comma-separated)</label>
            <input type="text" .value=${this.metaTriggerText} placeholder="my-style, detailed face"
              @input=${a=>this.metaTriggerText=a.target.value} />
          </div>
          ${i?o`<div>
                <label class="field">Recommended weight</label>
                <input class="num" type="number" min="-2" max="2" step="0.05"
                  .value=${String(e.weight??"")} placeholder="1"
                  @input=${a=>this.setMetaDefaults({weight:Number(a.target.value)||0})} />
              </div>`:o`
                <div class="meta-grid">
                  <div>
                    <label class="field">Steps</label>
                    <input class="num" type="number" min="1" max="80" .value=${String(e.steps??"")}
                      @input=${a=>this.setMetaDefaults({steps:Number(a.target.value)||0})} />
                  </div>
                  <div>
                    <label class="field">CFG scale</label>
                    <input class="num" type="number" min="1" max="30" step="0.5" .value=${String(e.cfgScale??"")}
                      @input=${a=>this.setMetaDefaults({cfgScale:Number(a.target.value)||0})} />
                  </div>
                  <div>
                    <label class="field">CFG rescale</label>
                    <input class="num" type="number" min="0" max="0.99" step="0.05"
                      .value=${String(e.cfgRescale??"")}
                      @input=${a=>this.setMetaDefaults({cfgRescale:Number(a.target.value)||0})} />
                  </div>
                  <div>
                    <label class="field">Width</label>
                    <input class="num" type="number" min="64" max="2048" step="8" .value=${String(e.width??"")}
                      @input=${a=>this.setMetaDefaults({width:Number(a.target.value)||0})} />
                  </div>
                  <div>
                    <label class="field">Height</label>
                    <input class="num" type="number" min="64" max="2048" step="8" .value=${String(e.height??"")}
                      @input=${a=>this.setMetaDefaults({height:Number(a.target.value)||0})} />
                  </div>
                  <div class="full">
                    <label class="field">Scheduler</label>
                    <select class="num" .value=${e.scheduler??""}
                      @change=${a=>this.setMetaDefaults({scheduler:a.target.value})}>
                      <option value="">No preference</option>
                      ${["euler_a","euler","dpmpp_2m","dpmpp_2m_k","dpmpp_2m_sde_k","dpmpp_sde_k","unipc"].map(a=>o`<option value=${a} ?selected=${a===e.scheduler}>${a}</option>`)}
                    </select>
                  </div>
                  <div class="full">
                    <label class="field">Default VAE</label>
                    <select class="num" .value=${e.vae??""}
                      @change=${a=>this.setMetaDefaults({vae:a.target.value})}>
                      <option value="">Model's own</option>
                      ${(((s=this.status)==null?void 0:s.vaes)??[]).map(a=>o`<option value=${a.key} ?selected=${a.key===e.vae}>${a.name}</option>`)}
                    </select>
                  </div>
                  <div class="full">
                    <label class="field">VAE precision</label>
                    <select class="num" .value=${e.vaePrecision??""}
                      @change=${a=>this.setMetaDefaults({vaePrecision:a.target.value})}>
                      <option value="">No preference</option>
                      <option value="fp32">fp32</option>
                      <option value="fp16">fp16</option>
                    </select>
                  </div>
                </div>
              `}
          <div class="dialog-actions">
            <button class="btn danger" ?disabled=${this.metaBusy} title="Remove from InvokeAI, file included"
              @click=${()=>this.deleteMetaModel()}>Delete</button>
            <button class="btn" @click=${()=>this.metaDraft=null}>Cancel</button>
            <button class="btn primary" ?disabled=${this.metaBusy||!t.name.trim()} @click=${()=>this.saveMeta()}>
              Save
            </button>
          </div>
        </div>
      </div>
    `}renderBody(){const t=this.status;if(t===null)return o`<div class="empty"><md-circular-progress indeterminate></md-circular-progress></div>`;if(!t.enabled)return o`<div class="empty">
        <span class="material-symbols-rounded">auto_awesome</span>
        <div style="font-size:15px; margin-bottom:6px;">Image generation isn't set up yet.</div>
        <div style="font-size:13px;">
          Add the URL of your local InvokeAI or Automatic1111 / SD.Next server under
          <strong>Settings → Image generation</strong>, then come back here.
        </div>
      </div>`;if(!t.reachable)return o`<div class="empty">
        <span class="material-symbols-rounded">cloud_off</span>
        <div style="font-size:15px; margin-bottom:6px;">Can't reach the image generator.</div>
        <div style="font-size:13px; margin-bottom:14px;">${t.error??"It didn't answer."}</div>
        <button class="chip" @click=${()=>this.loadStatus()}>Retry</button>
      </div>`;const e=t.backend==="invokeai",i=(t.models??[]).find(a=>a.title===this.checkpoint),s=(i==null?void 0:i.model_name)||this.checkpoint||"Choose a model";return this.studio?this.renderStudio(t,e,s):o`
      <div class="workspace">
        <div class="workspace-bar">
          <div class="workspace-tab">
            <span class="material-symbols-rounded" style="font-size:18px;">auto_awesome</span>
            Generate
          </div>
          <div class="workspace-context">
            <div class="backend-pill" title="Connected generation backend">
              <span class="status-dot"></span>
              ${e?"InvokeAI":"A1111 / SD.Next"}
            </div>
            <div class="model-pill" title=${s}>
              <span class="material-symbols-rounded" style="font-size:15px;">deployed_code</span>
              <span>${s}</span>
            </div>
            ${e?o`<button class="ghost" @click=${()=>this.civitaiOpen=!0}>
              <span class="material-symbols-rounded" style="font-size:17px;">travel_explore</span>
              <span>Browse Civitai</span>
            </button>`:c}
          </div>
        </div>
        <div class="layout ${e?"":"no-gallery"}">
          <aside class="side">
            <div class="panel-heading">
              <span class="material-symbols-rounded" style="font-size:16px;">tune</span>
              Generation setup
            </div>
            <div class="panel-scroll">
              ${this.renderModelSection(t.models??[])}
              ${this.renderLoraSection(t.loras??[],t.loraError)}
              ${this.renderVaeSection(t.vaes??[])}
              ${this.renderSettingsSection(e,t.boards??[])}
              ${this.renderTemplateSection(t.templates??[])}
              ${this.renderCharacterSection()}
              ${this.renderPoseSection()}
              ${this.renderWildcardSection()}
            </div>
          </aside>
          <section class="workbench">${this.renderCanvasToolbar()}
            <div class="canvas-stage">
              ${this.renderResults()}
              ${this.error?o`<div class="banner">${this.error}</div>`:c}
              ${this.generating?this.renderGenerating(e):c}
            </div>
            <div class="prompt-dock">${this.renderPrompt()}</div>
          </section>
          ${e?o`<aside class="right">
                <oppai-invoke-gallery workspace
                  @boards-changed=${()=>this.loadStatus()}
                  @board-changed=${a=>this.board=a.detail.board}
                  @cut-out=${a=>void this.openCutout(a.detail.url,a.detail.name)}
                  @reuse-generation=${a=>this.reuseGenInfo(a.detail)}
                ></oppai-invoke-gallery>
              </aside>`:c}
        </div>
      </div>
      ${this.civitaiOpen?o`<oppai-civitai @close=${()=>this.onCivitaiClose()}
            @use-prompt=${a=>this.onCivitaiPrompt(a.detail)}></oppai-civitai>`:c}
    `}renderCanvasToolbar(){return o`<div class="canvas-toolbar">
      <span class="canvas-name">Generation canvas</span>
      <span class="toolbar-spacer"></span>
      ${this.shots.length?o`<button class="toolbar-clear" @click=${()=>this.clearWorkspace()}>
        <span class="material-symbols-rounded" style="font-size:15px;">delete_sweep</span>
        Clear workspace
      </button>`:c}
      <span class="toolbar-stat" title="Output size">
        <span class="material-symbols-rounded" style="font-size:14px;">aspect_ratio</span>
        ${this.width} × ${this.height}
      </span>
      <span class="toolbar-stat" title="Seed">
        <span class="material-symbols-rounded" style="font-size:14px;">casino</span>
        ${this.seed<0?"Random":this.seed}
      </span>
    </div>`}renderStudio(t,e,i){const s=this.wardrobes.find(a=>a.id===this.outfitWardrobeId);return o`
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
              Build${s?o` <span class="studio-view-sub">· ${s.name}</span>`:c}
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
              ${e?"InvokeAI":"A1111 / SD.Next"}
            </div>
            <div class="model-pill" title=${i}>
              <span class="material-symbols-rounded" style="font-size:15px;">deployed_code</span>
              <span>${i}</span>
            </div>
          </div>
        </div>
        ${this.studioView==="wardrobe"?o`<div class="studio-wardrobe">
              <oppai-outfit-wardrobe
                @edit-slot=${a=>void this.editWardrobeSlot(a.detail.outfitId,a.detail.slot,a.detail.level)}
                @build-outfit=${a=>{this.outfitWardrobeId=a.detail.outfitId,this.persistDraft(),this.studioView="build",this.loadWipBoard(a.detail.outfitId)}}
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
                  ${this.renderModelSection(t.models??[])}
                  ${this.renderLoraSection(t.loras??[],t.loraError)}
                  ${this.renderVaeSection(t.vaes??[])}
                  ${this.renderSettingsSection(e,t.boards??[])}
                  ${this.renderTemplateSection(t.templates??[])}
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
    `}renderStudioToolbar(){const t=this.currentOutfitShots(),e=t.filter(s=>{var a;return(((a=s.outfitSlot)==null?void 0:a.index)??0)<H}).length,i=t.length-e;return o`<div class="canvas-toolbar studio-toolbar">
      <label class="wardrobe-pick" title="Every square is saved into this wardrobe as it is generated">
        <span class="material-symbols-rounded" style="font-size:16px;">inventory_2</span>
        <select ?disabled=${this.outfitBatchRunning}
          @change=${s=>{this.outfitWardrobeId=s.target.value,this.persistDraft(),this.loadWipBoard(this.outfitWardrobeId)}}>
          <!-- Selected per option rather than .value on the select: the list arrives
               after the first render, and a value that has not changed is not re-applied. -->
          <option value="" ?selected=${!this.outfitWardrobeId}>New wardrobe on first square</option>
          ${this.wardrobes.map(s=>o`<option value=${s.id} ?selected=${s.id===this.outfitWardrobeId}>${s.name}</option>`)}
        </select>
      </label>
      <button class="toolbar-clear" title="Start a new wardrobe" ?disabled=${this.outfitBatchRunning} @click=${()=>void this.createWardrobe()}>
        <span class="material-symbols-rounded" style="font-size:15px;">add</span>
      </button>
      <div class="sheet-tabs" role="tablist">
        <button class="sheet-tab ${this.sheetTab==="faces"?"on":""}" role="tab" @click=${()=>this.sheetTab="faces"}>
          Expressions <span class="sheet-tab-count">${e}/${H}</span>
        </button>
        <button class="sheet-tab ${this.sheetTab==="misc"?"on":""}" role="tab" @click=${()=>this.sheetTab="misc"}>
          Misc <span class="sheet-tab-count">${i}/${tt}</span>
        </button>
      </div>
      <span class="toolbar-spacer"></span>
      <div class="zoom-tabs" title="Square size">
        ${se.map((s,a)=>o`<button class="zoom-tab ${this.sheetZoom===a?"on":""}"
          title=${["Fit the row to the screen","Medium squares","Large squares"][a]}
          @click=${()=>{this.sheetZoom=a,this.persistDraft()}}>${["Fit","M","L"][a]}</button>`)}
      </div>
    </div>`}renderStudioSheet(){if(!this.outfitOn)return o`<div class="canvas-empty">
        <span class="material-symbols-rounded">checkroom</span>
        <strong>Outfit terms are switched off</strong>
        <span>Turn them back on in the recipe to build a wardrobe.</span>
      </div>`;const t=se[this.sheetZoom],e=t?`--cell:${t}px`:"";return this.sheetTab==="misc"?this.renderMiscGrid(e):this.renderFaceMatrix(e,!t)}renderFaceMatrix(t,e){const i=_(this.outfitSlot().slot);return o`<div class="face-matrix ${e?"fit":""}" style=${t}>
      <div class="matrix-corner"></div>
      ${M.map(s=>o`<div class="matrix-col-head" title=${s.face}>${s.label}</div>`)}
      ${A.map((s,a)=>{const r=M.map((l,p)=>this.outfitSlot(a,p,"").slot),n=r.filter(l=>this.shotAt(l)).length;return o`
          <div class="matrix-row-head">
            <span class="material-symbols-rounded" style="font-size:14px;">local_fire_department</span>
            <span class="matrix-row-name">${s.label}</span>
            <span class="matrix-row-count">${n}/${r.length}</span>
          </div>
          ${r.map(l=>this.renderSheetCell(l,_(l)===i,this.sheetTab==="faces"&&!this.outfitMisc))}
        `})}
    </div>`}renderMiscGrid(t){const e=_(this.outfitSlot().slot),i=(s,a,r)=>o`
      <section class="sheet-tier misc">
        <header class="sheet-tier-head">
          <span class="material-symbols-rounded" style="font-size:15px;">interests</span>
          ${s}
          <span class="tier-count">${r.filter(n=>this.shotAt(this.outfitSlot(0,0,n.id).slot)).length}/${r.length} generated</span>
        </header>
        <p class="sheet-note">${a}</p>
        <div class="sheet-grid" style=${t}>
          ${r.map(n=>{const l=this.outfitSlot(0,0,n.id).slot;return this.renderSheetCell(l,_(l)===e,!!this.outfitMisc)})}
        </div>
      </section>`;return o`<div class="outfit-sheet" style=${t}>
      ${i("Around the place","One picture per state, whatever the heat — a state with no square falls back to her expression. Typing is shown while she writes to you.",O.filter(s=>!s.intimate))}
      ${i("With them","Drawn at their own heat. She can only put herself into these once a conversation has got there.",O.filter(s=>s.intimate))}
    </div>`}renderSheetCell(t,e,i){const s=this.shotAt(t),a=s?!this.shotMatchesCurrentOutfit(s):!1,r=t.tier===0&&t.tierLabel==="Misc"?t.emotionLabel:`${t.tierLabel} · ${t.emotionLabel}`;return o`<button
      class="sheet-cell ${e?"current":""} ${s?"":"empty"}"
      title=${s?`${r}${a?" — older recipe":s.cutoutReviewed?" — reviewed":" — needs a cutout review"}`:`${r} — not generated yet`}
      @click=${()=>this.selectOutfitSlot(t.index)}
      @dblclick=${()=>{this.selectOutfitSlot(t.index),this.generateOutfitAndNext()}}
    >
      ${s?o`<img class="art" src=${this.previewURL(s)} alt=${r} loading="lazy" />`:o`<span class="art-empty"><span class="material-symbols-rounded">add_photo_alternate</span></span>`}
      <span class="cell-foot">
        <span class="cell-name">${t.tierLabel==="Misc",t.emotionLabel}</span>
        ${s?o`<span class="cell-state ${a?"stale":s.cutoutReviewed?"ready":"needs"}"></span>`:c}
      </span>
    </button>`}squareStatus(t){return t?this.shotMatchesCurrentOutfit(t)?t.cutoutReviewed?{label:"Reviewed and filed — she can wear it",tone:"ready"}:{label:"Generated — the cutout needs a look",tone:"needs"}:{label:"Generated with an older recipe",tone:"stale"}:{label:"Not generated yet",tone:"none"}}renderFocusPanel(){var h;const{slot:t}=this.outfitSlot(),e=this.shotAt(t),i=this.squareStatus(e),s=t.tierLabel==="Misc",a=s?O.find(f=>f.id===t.emotion):void 0,r=s?void 0:M[this.outfitFace],{prompt:n,negative:l}=this.assemblePrompts(),p=this.generating;return o`
      <div class="panel-heading">
        <span class="material-symbols-rounded" style="font-size:16px;">crop_square</span>
        Selected square
      </div>
      <div class="panel-scroll focus-scroll">
        <div class="focus-art">
          ${e?o`<img src=${this.previewURL(e)} alt=${t.emotionLabel} style="cursor:zoom-in" title="Expand"
                @click=${()=>this.expandedShot=e} @contextmenu=${f=>this.openShotMenu(e,f)} />`:o`<span class="focus-empty"><span class="material-symbols-rounded">add_photo_alternate</span>Nothing here yet</span>`}
        </div>
        <div class="focus-title">
          <strong>${s?t.emotionLabel:`${t.tierLabel} · ${t.emotionLabel}`}</strong>
          <span class="focus-status ${i.tone}">${i.label}</span>
        </div>
        <div class="sec-note">${a?`${a.face}; ${a.pose}.`:r?`${r.face}; ${r.pose}.`:c}</div>
        <div class="focus-actions">
          <button class="btn primary" ?disabled=${p||!this.outfitOn||!n.trim()} @click=${()=>void this.generateOutfitAndNext()}>
            <span class="material-symbols-rounded" style="font-size:17px;">${e?"refresh":"auto_awesome"}</span>
            ${e?"Redo, then next":"Generate, then next"}
          </button>
          <button class="btn" ?disabled=${p||!this.outfitOn||!n.trim()} @click=${()=>void this.generate()}>
            <span class="material-symbols-rounded" style="font-size:17px;">${e?"replay":"add"}</span>
            ${e?"Redo, stay here":"Generate this one"}
          </button>
          <button class="btn" ?disabled=${!e||p}
            @click=${()=>{e&&this.openCutout(this.previewURL(e),`seed-${e.seed}`,e.outfitFilename,e.id)}}>
            <span class="material-symbols-rounded" style="font-size:17px;">background_replace</span>
            ${e!=null&&e.cutoutReviewed?"Adjust the cutout":"Review the cutout"}
          </button>
          <label class="btn ${p?"disabled":""}" title="Use a picture of your own for this square">
            <span class="material-symbols-rounded" style="font-size:17px;">upload</span>
            ${e?"Replace with my own image":"Use my own image"}
            <input type="file" accept="image/*" style="display:none;" ?disabled=${p}
              @change=${f=>{var x;const b=f.target;this.uploadSquare((x=b.files)==null?void 0:x[0]),b.value=""}} />
          </label>
          <button class="btn" ?disabled=${!e||p} title="Just this square, as a PNG under its wardrobe filename"
            @click=${()=>{e&&this.exportOutfitSquare(e)}}>
            <span class="material-symbols-rounded" style="font-size:17px;">download</span>
            Export this square
          </button>
          <button class="btn danger" ?disabled=${!e||p} @click=${()=>{e&&this.deleteOutfitSquare(e)}}>
            <span class="material-symbols-rounded" style="font-size:17px;">delete</span>
            Delete this square
          </button>
        </div>
        ${e?o`<div class="focus-meta">
          <span title="Seed"><span class="material-symbols-rounded" style="font-size:14px;">casino</span>${e.seed}</span>
          ${(h=e.info)!=null&&h.model?o`<span title="Model"><span class="material-symbols-rounded" style="font-size:14px;">deployed_code</span>${e.info.model}</span>`:c}
          <button class="link-btn" ?disabled=${!e.info} @click=${()=>void this.copyGenInfo(e,"text")}>Copy generation data</button>
          ${this.outfitLoadoutId?o`<button class="link-btn" ?disabled=${this.loadoutBusy} @click=${()=>void this.setLoadoutCoverFromSelection()}>Use as loadout cover</button>`:c}
        </div>`:c}
        <button class="adv-toggle" @click=${()=>this.showSquarePrompt=!this.showSquarePrompt}>
          <span class="material-symbols-rounded" style="font-size:17px;">${this.showSquarePrompt?"expand_less":"code"}</span>
          ${this.showSquarePrompt?"Hide the prompt":"The prompt this square gets"}
        </button>
        ${this.showSquarePrompt?o`<div class="focus-prompt">
          <span class="focus-tag">Positive</span>
          <pre>${n}</pre>
          <span class="focus-tag negative">Negative</span>
          <pre>${l}</pre>
          <div class="sec-note">Exposure is rolled fresh for every generation, so the undress clauses change between takes.</div>
        </div>`:c}
      </div>
    `}renderBatchBar(){const t=this.currentOutfitShots(),e=t.filter(h=>{var f;return(((f=h.outfitSlot)==null?void 0:f.index)??0)<H}).length,i=t.length-e,s=t.filter(h=>h.cutoutReviewed).length,a=this.staleShots().length,r=H+(this.outfitMiscBatch?tt:0),n=e+(this.outfitMiscBatch?i:0),l=Math.max(0,r-n),p=!this.generating&&this.outfitOn&&!!this.assemblePrompts().prompt.trim();return o`<div class="batch-bar">
      <div class="batch-progress" title=${`${s} of ${t.length} generated squares reviewed`}>
        <div class="batch-track">
          <div class="batch-fill reviewed" style=${`width:${r?Math.min(100,s/r*100):0}%`}></div>
          <div class="batch-fill made" style=${`width:${r?Math.min(100,n/r*100):0}%`}></div>
        </div>
        <span class="batch-count">${e}/${H} expressions · ${i}/${tt} misc · ${s} reviewed${a?o` · <em>${a} on an older recipe</em>`:c}</span>
      </div>
      <label class="switch compact" title="Whether Generate missing also renders the Misc states">
        <input type="checkbox" .checked=${this.outfitMiscBatch} ?disabled=${this.outfitBatchRunning}
          @change=${h=>{this.outfitMiscBatch=h.target.checked,this.persistDraft()}} />
        Include Misc
      </label>
      ${this.outfitBatchRunning?o`<button class="btn" @click=${()=>this.cancelOutfitBatch()}>
            <span class="material-symbols-rounded" style="font-size:17px;">stop_circle</span>
            Stop after this one
          </button>`:o`<button class="btn primary" ?disabled=${!p||!l} @click=${()=>void this.generateAllOutfit()}>
            <span class="material-symbols-rounded" style="font-size:17px;">auto_awesome</span>
            Generate ${l} missing
          </button>
          ${a?o`<button class="btn" ?disabled=${!p} @click=${()=>void this.regenerateStale()}>
            <span class="material-symbols-rounded" style="font-size:17px;">history</span>
            Redo ${a} stale
          </button>`:c}`}
      <button class="btn" ?disabled=${this.generating||this.outfitExporting||!t.length||s!==t.length}
        title=${s!==t.length?"Review every cutout first":"Every square, correctly named, in one ZIP"}
        @click=${()=>void this.exportOutfitZip()}>
        <span class="material-symbols-rounded" style="font-size:17px;">folder_zip</span>
        ${this.outfitExporting?"Building ZIP…":"Export ZIP"}
      </button>
      ${this.outfitProgress?o`<span class="batch-note">${this.outfitProgress}</span>`:c}
    </div>`}async uploadSquare(t){if(!t||!t.type.startsWith("image/")||this.generating)return;const{slot:e,filename:i}=this.outfitSlot();try{const s=await new Promise((p,h)=>{const f=new FileReader;f.onload=()=>p(String(f.result)),f.onerror=()=>h(new Error("couldn't read that file")),f.readAsDataURL(t)}),a=await this.ensureWardrobe();await u.putLibbyOutfitWip(a,e.emotion,e.tier,{imageData:s,filename:i,seed:-1,reviewed:!1,config:this.outfitConfigKey()});const r=this.shotAt(e);r&&!r.id.startsWith("wip-")&&await u.deleteGenPreview(r.id).catch(()=>{});const n=_(e),l={id:`wip-${a}-${e.emotion}-${e.tier}`,seed:-1,saved:!1,outfitFilename:i,outfitSlot:e,outfitConfig:this.outfitConfigKey(),cutoutReviewed:!1,previewVersion:Date.now(),wipOutfitId:a};this.shots=[...this.shots.filter(p=>!p.outfitSlot||_(p.outfitSlot)!==n),l],this.persistDraft(),this.openCutout(this.previewURL(l),t.name,i,l.id)}catch(s){this.showToast(`Couldn't use that image: ${s.message}`)}}async editWardrobeSlot(t,e,i){const s=M.findIndex(p=>p.id===e),a=O.some(p=>p.id===e)?e:"";if(s<0&&!a)return;this.outfitWardrobeId!==t&&(this.outfitWardrobeId=t,this.persistDraft(),await this.loadWipBoard(t)),this.outfitOn=!0;const{slot:r,filename:n}=this.outfitSlot(a?0:i,Math.max(0,s),a);this.selectOutfitSlot(r.index),this.studioView="build";let l=this.shotAt(r);if(!l)try{const p=await fetch(u.libbyEmotionURL(t,e,i,Date.now()),{credentials:"same-origin"});if(!p.ok)throw new Error(`the sprite returned ${p.status}`);const h=await dt(await p.blob());await u.putLibbyOutfitWip(t,r.emotion,r.tier,{imageData:h,filename:n,seed:-1,reviewed:!0,config:this.outfitConfigKey()}),l={id:`wip-${t}-${r.emotion}-${r.tier}`,seed:-1,saved:!1,outfitFilename:n,outfitSlot:r,outfitConfig:this.outfitConfigKey(),cutoutReviewed:!0,previewVersion:Date.now(),wipOutfitId:t},this.shots=[...this.shots,l],this.persistDraft()}catch(p){this.showToast(`Couldn't open that sprite: ${p.message}`);return}this.openCutout(this.previewURL(l),e,l.outfitFilename,l.id)}renderDressSection(){const t=j.filter(({key:i})=>G(this.outfitGear[i])).length,e=o`
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
          <span class="equipped-count">${t}/${j.length} worn</span>
          <button class="loadout-clear" ?disabled=${this.outfitBatchRunning||!t}
            @click=${()=>this.clearOutfitLoadout()}>Unequip all</button>
        </div>
        <div class="sec-note">Switch a piece off to keep it in the recipe without wearing it.</div>
        <div class="loadout-slots">
          ${j.map(i=>this.renderGearSlot(i.key))}
        </div>
      </div>
    `;return this.section("outfit","Clothes",`${t} worn`,e)}renderLookSection(){const t=o`
      <div>
        <label class="field">Solid generation background</label>
        <div class="chips">
          ${["white","black"].map(e=>o`<button
            class="chip ${this.outfitBackground===e?"on":""}"
            ?disabled=${this.outfitBatchRunning}
            @click=${()=>this.outfitBackground=e}>
            ${e==="white"?"White":"Black"}
          </button>`)}
        </div>
        <div class="sec-note">Pick whichever contrasts most with her hair and clothes — it is what the cutout removes.</div>
      </div>
      <div>
        <label class="field">Default underwear colour</label>
        <input class="num" type="text" .value=${this.outfitUnderwearColor}
          ?disabled=${this.outfitBatchRunning} placeholder="black, red, pale pink…"
          @input=${e=>this.outfitUnderwearColor=e.target.value} />
        <div class="sec-note">Used for the bra and panties when those slots have no colour of their own.</div>
      </div>
      <label class="switch">
        <input type="checkbox" .checked=${this.outfitLockColors} ?disabled=${this.outfitBatchRunning}
          @change=${e=>this.outfitLockColors=e.target.checked} />
        Lock equipped colours
      </label>
      <div class="sec-note">Weights each colour and names every colour the garment is <em>not</em> in the negative. Leave on unless a piece is meant to be multicoloured.</div>
      <label class="switch">
        <input type="checkbox" .checked=${this.outfitPubicHair} ?disabled=${this.outfitBatchRunning}
          @change=${e=>this.outfitPubicHair=e.target.checked} />
        Pubic hair at Peak
      </label>
      ${this.outfitPubicHair?o`<div>
        <label class="field">Pubic hair colour</label>
        <input class="num" type="text" .value=${this.outfitPubicHairColor}
          ?disabled=${this.outfitBatchRunning} placeholder="dark brown, blonde…"
          @input=${e=>this.outfitPubicHairColor=e.target.value} />
      </div>`:c}
      ${this.renderCameraControls()}
      <div>
        <label class="field">Exposure by tier</label>
        <div class="sec-note">${A.map((e,i)=>o`<div><strong>${e.label}:</strong> ${Bt[i].description}</div>`)}</div>
      </div>
    `;return this.section("look","Look & framing",this.outfitBackground,t)}renderPromptExtrasSection(){const t=o`
      <div class="sec-note">Added to every square alongside the recipe: quality tags, a style, the character's name.</div>
      <div>
        <label class="field">Extra positive</label>
        <textarea class="num extras" rows="3" .value=${this.prompt} placeholder="masterpiece, best quality, …"
          @input=${e=>this.prompt=e.target.value}></textarea>
      </div>
      <div>
        <label class="field">Extra negative</label>
        <textarea class="num extras" rows="2" .value=${this.negative} placeholder="lowres, bad anatomy, …"
          @input=${e=>this.negative=e.target.value}></textarea>
      </div>
    `;return this.section("extras","Prompt extras",this.prompt.trim()||this.negative.trim()?"set":"none",t)}onCivitaiClose(){this.civitaiOpen=!1,this.loadStatus()}onCivitaiPrompt(t){this.prompt=t.prompt,this.negative=t.negativePrompt??"",t.sampler&&(this.scheduler=t.sampler),t.steps&&(this.steps=t.steps),t.cfgScale&&(this.cfg=t.cfgScale),t.seed&&(this.seed=t.seed),t.width&&t.height&&(this.width=t.width,this.height=t.height),this.templateId="",this.selectedTriggers=[],this.onCivitaiClose()}section(t,e,i,s){const a=!!this.open[t];return o`
      <div class="sec sec-${t}">
        <button class="sec-head" @click=${()=>this.toggleSection(t)}>
          <span class="material-symbols-rounded sec-chevron ${a?"open":""}" style="font-size:18px;"
            >chevron_right</span
          >
          ${e}
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
    `}renderModelSection(t){if(!t.length)return this.section("models","Models","0",o`<div class="sec-note">
          Connected, but the generator lists no checkpoints. Add a model to it and reload.
        </div>`);const e=o`
      <div class="cards">
        ${t.map(i=>{const s=i.title===this.checkpoint,a=`${u.modelThumbURL(i.title)}&v=${this.thumbVersion}`;return o`
            <div class="card-wrap">
              <button class="card ${s?"on":""}" title=${i.title} @click=${()=>this.pickModel(i)}>
                ${this.renderArt(a,i.model_name,"texture")}
                <div class="card-name">${i.model_name}${i.base?o`<span class="row-sub">${i.base}</span>`:c}</div>
              </button>
              <button class="card-edit left" title="Edit model settings" @click=${()=>this.openMetaEditor(i.title)}>
                <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
              </button>
            </div>
          `})}
      </div>
    `;return this.section("models","Models",String(t.length),e)}renderLoraSection(t,e){if(!t.length)return this.section("loras","LoRAs","0",o`<div class="sec-note">
          ${e?`LoRAs aren't available from this generator: ${e}`:"No LoRAs installed."}
        </div>`);const i=Math.ceil(t.length/6),s=Math.min(this.loraPage,i-1),a=t.slice(s*6,s*6+6),r=o`
      <div class="cards">
        ${a.map(n=>{const l=n.name in this.selectedLoras,p=`${u.loraThumbURL(n.name)}&v=${this.thumbVersion}`;return o`
            <div class="card-wrap">
              <button class="card ${l?"on":""}" title=${n.name} @click=${()=>this.toggleLora(n.name)}>
                ${this.renderArt(p,n.alias||n.name,"style")}
                <div class="card-name">${n.alias||n.name}</div>
              </button>
              <button class="card-edit left" title="Edit LoRA settings" @click=${()=>this.openMetaEditor(n.name)}>
                <span class="material-symbols-rounded" style="font-size:15px;">edit</span>
              </button>
              ${l?o`<input class="lora-weight" type="number" min="-2" max="2" step="0.05"
                aria-label=${`${n.alias||n.name} weight`}
                .value=${String(this.selectedLoras[n.name])}
                @input=${h=>{const f=Number(h.target.value);this.selectedLoras={...this.selectedLoras,[n.name]:Number.isFinite(f)?Math.max(-2,Math.min(2,f)):1}}} />`:c}
            </div>
          `})}
      </div>
      ${i>1?o`<div class="pager">
        <button ?disabled=${s===0} @click=${()=>this.loraPage=s-1}>Previous</button>
        <span>${s+1} / ${i}</span>
        <button ?disabled=${s>=i-1} @click=${()=>this.loraPage=s+1}>Next</button>
      </div>`:c}
    `;return this.section("loras","LoRAs",String(Object.keys(this.selectedLoras).length||t.length),r)}renderVaeSection(t){const e=t.length?o`
          <div class="rows">
            <button class="row-pick ${this.vae===""?"on":""}" @click=${()=>this.vae=""}>
              Model default
            </button>
            ${t.map(i=>o`<button
                class="row-pick ${this.vae===i.key?"on":""}"
                @click=${()=>this.vae=this.vae===i.key?"":i.key}
              >
                ${i.name}
                ${i.base?o`<span class="row-sub">${i.base}</span>`:c}
              </button>`)}
          </div>
        `:o`<div class="sec-note">The generator lists no standalone VAEs; the model's own is used.</div>`;return this.section("vaes","VAEs",this.vae?"1 picked":"default",e)}renderSettingsSection(t,e){var s,a;const i=o`
      <div class="settings">
        <div class="full">
          <label class="field">Scheduler</label>
          <select
            class="num"
            .value=${this.scheduler}
            @change=${r=>this.scheduler=r.target.value}
          >
            ${Ci.map(r=>o`<option value=${r.id} ?selected=${r.id===this.scheduler}>${r.label}</option>`)}
          </select>
        </div>
        <div>
          <label class="field">Steps</label>
          <input class="num" type="number" min="1" max="80" .value=${String(this.steps)}
            @input=${r=>this.steps=q(r.target.value,1,80,25)} />
        </div>
        <div>
          <label class="field">CFG scale</label>
          <input class="num" type="number" min="1" max="30" step="0.5" .value=${String(this.cfg)}
            @input=${r=>this.cfg=ot(r.target.value,1,30,7)} />
        </div>
        ${t?o`
          <div>
            <label class="field">CFG rescale</label>
            <input class="num" type="number" min="0" max="0.99" step="0.05" .value=${String(this.cfgRescale)}
              @input=${r=>this.cfgRescale=ot(r.target.value,0,.99,0)} />
          </div>
          <div>
            <label class="field">CLIP skip</label>
            <input class="num" type="number" min="0" max="12" .value=${String(this.clipSkip)}
              @input=${r=>this.clipSkip=q(r.target.value,0,12,0)} />
          </div>
        `:c}
        <div>
          <label class="field">Count</label>
          <input class="num" type="number" min="1" max="8" .value=${String(this.count)}
            @input=${r=>this.count=q(r.target.value,1,8,1)} />
        </div>
        <div>
          <label class="field">Seed (-1 random)</label>
          <input class="num" type="number" .value=${String(this.seed)}
            @input=${r=>this.seed=q(r.target.value,-1,2147483648,-1)} />
        </div>
        ${t?o`
          <!-- Which gallery a generation lands in is no longer a second setting here:
               it follows whichever gallery the Invoke gallery panel has open, so the
               place you're looking at is the place new images appear. -->
          <div class="full" style="font-size:12px; color:var(--oppai-text-muted);">
            Generations are added to <b>${((s=e.find(r=>r.id===this.board))==null?void 0:s.name)??"the open gallery"}</b> —
            switch galleries in the Invoke gallery panel.
          </div>
          <label class="switch-row"><input type="checkbox" .checked=${this.cpuNoise}
            @change=${r=>this.cpuNoise=r.target.checked} /> CPU noise</label>
          <label class="switch-row"><input type="checkbox" .checked=${this.seamlessX}
            @change=${r=>this.seamlessX=r.target.checked} /> Seamless X</label>
          <label class="switch-row"><input type="checkbox" .checked=${this.seamlessY}
            @change=${r=>this.seamlessY=r.target.checked} /> Seamless Y</label>
        `:c}
        ${(a=this.status)!=null&&a.detailerAvailable?o`
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
                @input=${r=>this.detailerConfidence=ot(r.target.value,.05,1,.3)} />
            </div>
            <div>
              <label class="field">Denoise</label>
              <input class="num" type="number" min="0.05" max="1" step="0.05" .value=${String(this.detailerDenoise)}
                @input=${r=>this.detailerDenoise=ot(r.target.value,.05,1,.4)} />
            </div>
            <div>
              <label class="field">Mask blur</label>
              <input class="num" type="number" min="0" max="64" .value=${String(this.detailerMaskBlur)}
                @input=${r=>this.detailerMaskBlur=q(r.target.value,0,64,4)} />
            </div>
          `:c}
        `:c}
      </div>
    `;return this.section("settings","Model settings",`${this.steps} steps`,i)}renderTemplateSection(t){const e=t.filter(n=>n.builtIn).length,i=this.showBuiltInTemplates?t:t.filter(n=>!n.builtIn),s=i.length?o`
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
          ${t.length?"No templates you created. Built-in presets are hidden — turn them on below.":"No templates on the generator. In InvokeAI they're called style presets; add some there and reload."}
        </div>`,a=o`
      ${s}
      ${e?o`<button
            class="link-toggle"
            @click=${()=>this.showBuiltInTemplates=!this.showBuiltInTemplates}
          >
            ${this.showBuiltInTemplates?"Hide built-in presets":`Show built-in presets (${e})`}
          </button>`:c}
    `,r=t.find(n=>n.id===this.templateId);return this.section("templates","Invoke templates",r?r.name:"none",a)}renderCharacterSection(){const t=o`
      ${this.characters.length?o`<div class="cards">
            ${this.characters.map(i=>{const s=this.selectedChars.includes(i.id),a=`${u.characterThumbURL(i.id)}?v=${this.thumbVersion}`;return o`
                <div class="card-wrap">
                  <button class="card ${s?"on":""}" title=${i.prompt} @click=${()=>this.toggleCharacter(i.id)}>
                    ${i.hasThumb?this.renderArt(a,i.name,"person"):o`<div class="card-blank">
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
    `,e=this.selectedChars.length;return this.section("characters","Characters",e?`${e} picked`:String(this.characters.length),t)}renderPoseSection(){const t=o`
      ${this.outfitOn?o`<div class="sec-note">
        The outfit board sets a pose per square, so picked poses sit out while it is on.
      </div>`:c}
      ${this.poses.length?o`<div class="cards">
            ${this.poses.map(i=>{const s=this.selectedPoses.includes(i.id),a=`${u.poseThumbURL(i.id)}?v=${this.thumbVersion}`;return o`
                <div class="card-wrap">
                  <button class="card ${s?"on":""}" title=${i.prompt} @click=${()=>this.togglePose(i.id)}>
                    ${i.hasThumb?this.renderArt(a,i.name,"accessibility_new"):o`<div class="card-blank">
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
    `,e=this.selectedPoses.length;return this.section("poses","Poses",e?`${e} picked`:String(this.poses.length),t)}renderWildcardSection(){const t=o`
      <div class="sec-note">
        Write <code>__name__</code> in a prompt to draw a random line from that list on
        every generate, or <code>{red|blue|green}</code> to pick one of a few words in
        place. Click a list to insert it.
      </div>
      ${this.wildcards.length?o`<div class="wildcard-chips">
            ${this.wildcards.map(e=>o`
              <span class="wildcard-chip">
                <button class="wildcard-name" title=${`${e.entries.length} line${e.entries.length===1?"":"s"} — insert __${e.name}__`}
                  @click=${()=>this.insertWildcard(e.name)}>__${e.name}__</button>
                ${e.readOnly?o`<span class="wildcard-ro" title="A .txt file in the server's wildcards folder — edit the file to change it">
                      <span class="material-symbols-rounded" style="font-size:14px;">lock</span></span>`:o`<button class="wildcard-edit" title="Edit ${e.name}"
                      @click=${()=>this.wildcardDraft={id:e.id,name:e.name,text:e.entries.join(`
`)}}>
                      <span class="material-symbols-rounded" style="font-size:14px;">edit</span></button>`}
              </span>`)}
          </div>`:c}
      <button class="side-add" @click=${()=>this.wildcardDraft={name:"",text:""}}>
        <span class="material-symbols-rounded" style="font-size:17px;">add</span> New wildcard list
      </button>
    `;return this.section("wildcards","Wildcards",String(this.wildcards.length),t)}insertWildcard(t){const e=`__${t}__`,i=this.renderRoot.querySelector(".prompt-area"),s=i&&document.activeElement===i?i.selectionStart:this.prompt.length,a=this.prompt.slice(0,s).replace(/\s+$/,""),r=this.prompt.slice(s).replace(/^\s+/,""),n=a&&!a.endsWith(",")?`${a}, `:a,l=r?r.startsWith(",")?r:`, ${r}`:"";this.prompt=`${n}${e}${l}`}togglePose(t){this.selectedPoses=this.selectedPoses.includes(t)?this.selectedPoses.filter(e=>e!==t):[...this.selectedPoses,t]}onPoseThumbFile(t){var a;const e=t.target,i=(a=e.files)==null?void 0:a[0];if(e.value="",!i||!this.poseDraft)return;const s=new FileReader;s.onload=()=>{this.poseDraft&&(this.poseDraft={...this.poseDraft,imageData:String(s.result),previewId:void 0})},s.readAsDataURL(i)}async savePose(){const t=this.poseDraft;if(!(!t||!t.name.trim()||this.poseBusy)){this.poseBusy=!0;try{const e=await u.savePose({id:t.id,name:t.name.trim(),prompt:t.prompt,negativePrompt:t.negativePrompt,imageData:t.imageData,previewId:t.previewId});this.poseDraft=null,this.bumpThumbs(),await this.loadPoses(),t.id||(this.selectedPoses=[...this.selectedPoses,e.id]),this.showToast("Pose saved")}catch(e){this.showToast(e.message)}finally{this.poseBusy=!1}}}async deletePose(){const t=this.poseDraft;if(!(!(t!=null&&t.id)||this.poseBusy)&&confirm(`Delete “${t.name}” from the pose library?`)){this.poseBusy=!0;try{await u.deletePose(t.id),this.poseDraft=null,await this.loadPoses(),this.showToast("Pose deleted")}catch(e){this.showToast(e.message)}finally{this.poseBusy=!1}}}async saveWildcard(){const t=this.wildcardDraft;if(!(!t||!t.name.trim()||!t.text.trim()||this.wildcardBusy)){this.wildcardBusy=!0;try{await u.saveWildcard({id:t.id,name:t.name.trim(),text:t.text}),this.wildcardDraft=null,await this.loadWildcards(),this.showToast("Wildcard list saved")}catch(e){this.showToast(e.message)}finally{this.wildcardBusy=!1}}}async deleteWildcard(){const t=this.wildcardDraft;if(!(!(t!=null&&t.id)||this.wildcardBusy)&&confirm(`Delete the wildcard list “${t.name}”?`)){this.wildcardBusy=!0;try{await u.deleteWildcard(t.id),this.wildcardDraft=null,await this.loadWildcards(),this.showToast("Wildcard list deleted")}catch(e){this.showToast(e.message)}finally{this.wildcardBusy=!1}}}renderPoseEditor(t){var i;const e=t.imageData??(t.previewId?u.genPreviewURL(t.previewId):t.id&&((i=this.poses.find(s=>s.id===t.id))!=null&&i.hasThumb)?`${u.poseThumbURL(t.id)}?v=${this.thumbVersion}`:void 0);return o`
      <div class="overlay" @click=${s=>{s.target===s.currentTarget&&(this.poseDraft=null)}}>
        <div class="dialog">
          <h3>${t.id?"Edit pose":"New pose"}</h3>
          <div>
            <label class="field">Name</label>
            <input type="text" .value=${t.name} placeholder="Sitting with a mug"
              @input=${s=>this.poseDraft={...t,name:s.target.value}} />
          </div>
          <div>
            <label class="field">Prompt fragment</label>
            <textarea .value=${t.prompt} placeholder="sitting cross-legged, holding a steaming mug in both hands, …"
              @input=${s=>this.poseDraft={...t,prompt:s.target.value}}></textarea>
          </div>
          <div>
            <label class="field">Negative fragment (optional)</label>
            <textarea .value=${t.negativePrompt} placeholder="standing, …"
              @input=${s=>this.poseDraft={...t,negativePrompt:s.target.value}}></textarea>
          </div>
          <div class="dialog-thumb">
            ${e?o`<img src=${e} alt="Thumbnail" />`:o`<div class="card-blank" style="width:72px; height:96px; aspect-ratio:auto; border-radius:10px;">
                  <span class="material-symbols-rounded">accessibility_new</span>
                </div>`}
            <label class="btn">
              Choose thumbnail…
              <input class="hidden-file" type="file" accept="image/*" @change=${s=>this.onPoseThumbFile(s)} />
            </label>
          </div>
          <div class="dialog-actions">
            ${t.id?o`<button class="btn danger" ?disabled=${this.poseBusy} @click=${()=>this.deletePose()}>Delete</button>`:c}
            <button class="btn" @click=${()=>this.poseDraft=null}>Cancel</button>
            <button class="btn primary" ?disabled=${!t.name.trim()||this.poseBusy} @click=${()=>this.savePose()}>Save</button>
          </div>
        </div>
      </div>
    `}renderWildcardEditor(t){const e=t.text.split(`
`).map(i=>i.trim()).filter(i=>i&&!i.startsWith("#")).length;return o`
      <div class="overlay" @click=${i=>{i.target===i.currentTarget&&(this.wildcardDraft=null)}}>
        <div class="dialog">
          <h3>${t.id?"Edit wildcard list":"New wildcard list"}</h3>
          <div>
            <label class="field">Name — used as <code>__name__</code></label>
            <input type="text" .value=${t.name} placeholder="hair_colour" ?disabled=${!!t.id}
              @input=${i=>this.wildcardDraft={...t,name:i.target.value}} />
          </div>
          <div>
            <label class="field">One line per option${e?` — ${e}`:""}</label>
            <textarea class="wildcard-text" .value=${t.text} placeholder="red hair&#10;blue hair&#10;silver hair, {braid|ponytail}"
              @input=${i=>this.wildcardDraft={...t,text:i.target.value}}></textarea>
            <div class="sec-note">A line can itself hold <code>{a|b}</code> choices or another <code>__list__</code>. Lines starting with # are ignored.</div>
          </div>
          <div class="dialog-actions">
            ${t.id?o`<button class="btn danger" ?disabled=${this.wildcardBusy} @click=${()=>this.deleteWildcard()}>Delete</button>`:c}
            <button class="btn" @click=${()=>this.wildcardDraft=null}>Cancel</button>
            <button class="btn primary" ?disabled=${!t.name.trim()||!t.text.trim()||this.wildcardBusy} @click=${()=>this.saveWildcard()}>Save</button>
          </div>
        </div>
      </div>
    `}renderGearSlot(t){var p,h,f;const e=j.find(b=>b.key===t),i=this.outfitGear[t],s=!!i.item.trim(),a=G(i),r=b=>{this.outfitGear={...this.outfitGear,[t]:{...i,...b}}},n=!!((p=i.prompt)!=null&&p.trim())||!!((h=i.noun)!=null&&h.trim()),l=this.gearPromptOpen===t;return o`<div class="gear-slot ${a?"filled":""} ${i.off?"off":""}" title=${e.hint}>
      <button class="gear-slot-icon material-symbols-rounded ${s?"":"inert"}" aria-hidden=${s?"false":"true"}
        title=${i.off?`Wear the ${e.label.toLowerCase()} again`:s?`Take the ${e.label.toLowerCase()} off without clearing it`:e.hint}
        ?disabled=${this.outfitBatchRunning||!s}
        @click=${()=>r({off:!i.off})}>${i.off?"visibility_off":e.icon}</button>
      <span class="gear-slot-name">${e.label}${i.off?" · off":""}</span>
      <button class="gear-slot-prompt ${n?"on":""} ${l?"open":""}"
        title=${`What the generator calls this slot — currently "${At(e,i)}"`}
        aria-label=${`Edit the prompt wording for ${e.label}`} aria-expanded=${l?"true":"false"}
        ?disabled=${this.outfitBatchRunning}
        @click=${()=>this.gearPromptOpen=l?null:t}>
        <span class="material-symbols-rounded">text_fields</span></button>
      <div class="gear-slot-fields">
        <input class="gear-color" type="text" .value=${i.color}
          ?disabled=${this.outfitBatchRunning}
          aria-label=${`${e.label} colour`} placeholder="colour"
          @input=${b=>r({color:b.target.value})} />
        <input class="gear-item" type="text" .value=${i.item}
          ?disabled=${this.outfitBatchRunning}
          aria-label=${`${e.label}: ${e.hint}`} placeholder=${e.hint}
          @input=${b=>r({item:b.target.value})} />
      </div>
      ${l?o`<div class="gear-prompt-edit">
        <label>Prompt word
          <input type="text" .value=${i.prompt??""} placeholder=${e.prompt}
            ?disabled=${this.outfitBatchRunning}
            aria-label=${`Prompt word for ${e.label}`}
            @input=${b=>r({prompt:b.target.value})} /></label>
        <label>Colour-lock noun
          <input type="text" .value=${i.noun??""} placeholder=${vt(e,i)}
            ?disabled=${this.outfitBatchRunning}
            aria-label=${`Colour-lock noun for ${e.label}`}
            @input=${b=>r({noun:b.target.value})} /></label>
        <p class="gear-prompt-preview">
          ${a?o`Sends: <code>${Xt(e,i,((f=this.status)==null?void 0:f.backend)??"",this.outfitLockColors)}</code>`:o`Describe something in this slot to see the phrase it sends.`}
        </p>
        ${n?o`<button class="gear-prompt-reset" ?disabled=${this.outfitBatchRunning}
          @click=${()=>r({prompt:"",noun:""})}>Reset to "${e.prompt}"</button>`:c}
      </div>`:c}
    </div>`}clearOutfitLoadout(){this.outfitGear={...pe}}renderLoadoutSection(){const t=this.loadouts.find(i=>i.id===this.outfitLoadoutId),e=o`
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
          ${t?`Save over “${t.name}”`:"Save this loadout"}
        </button>
        ${t?o`
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
    `;return this.section("loadouts","Saved loadouts",String(this.loadouts.length),e)}renderCameraControls(){const t=wt.shots.find(e=>e.id===this.camera.shot);return o`
      <div>
        <label class="field">Shot</label>
        <select class="num" .value=${this.camera.shot} ?disabled=${this.outfitBatchRunning}
          @change=${e=>this.editCamera({shot:e.target.value})}>
          ${wt.shots.map(e=>o`<option value=${e.id}>${e.label}</option>`)}
        </select>
      </div>
      ${t!=null&&t.hint?o`<div class="sec-note">${t.hint}.</div>`:c}
    `}async openCutout(t,e,i,s){this.cutout={url:t,name:e,outputName:i,outfitShotId:s},this.cutoutError="",this.cutoutBusy=!0,this.showOriginal=!1,this.cutoutZoom=1,this.cutoutContrast=!1;try{const a=await We(t);this.session=new Ge(a),this.session.autoRemove(this.cutoutTolerance),this.cutoutTool="remove",await this.paintCutout()}catch(a){this.cutoutError=a.message}finally{this.cutoutBusy=!1}}async paintCutout(){const t=this.session;if(!t)return;this.cutoutCanvas=t.compose({feather:this.cutoutFeather,spill:this.cutoutSpill},this.showOriginal),this.cutFraction=t.cutFraction,this.canUndo=t.canUndo,this.canRedo=t.canRedo,await this.updateComplete;const e=this.cutoutHost;e&&this.cutoutCanvas&&(e.replaceChildren(this.cutoutCanvas),this.applyCutoutZoom())}applyCutoutZoom(){const t=this.cutoutCanvas,e=this.cutoutHost;if(!t||!e)return;const i=Math.max(1,e.clientWidth),s=Math.max(280,Math.min(window.innerHeight*.62,t.height)),r=Math.min(1,i/t.width,s/t.height)*this.cutoutZoom;t.style.width=`${Math.max(1,Math.round(t.width*r))}px`,t.style.height=`${Math.max(1,Math.round(t.height*r))}px`}setCutoutZoom(t){this.cutoutZoom=Math.max(.25,Math.min(4,t)),this.updateComplete.then(()=>this.applyCutoutZoom())}async autoCutout(){this.session&&(this.session.autoRemove(this.cutoutTolerance),await this.paintCutout())}cutoutPoint(t){const e=this.cutoutCanvas;if(!e)return null;const i=e.getBoundingClientRect();return!i.width||!i.height?null:{x:(t.clientX-i.left)/i.width*e.width,y:(t.clientY-i.top)/i.height*e.height}}async onCutoutPointerDown(t){var s,a;const e=this.session,i=this.cutoutPoint(t);if(!(!e||!i)&&!this.showOriginal){if(t.preventDefault(),this.cutoutTool==="remove"){e.removeAt(i.x,i.y,{tolerance:this.cutoutTolerance,contiguous:this.contiguous}),await this.paintCutout();return}e.beginStroke(),this.painting=!0,(a=(s=t.target).setPointerCapture)==null||a.call(s,t.pointerId),e.paint(i.x,i.y,this.brushSize,this.cutoutTool==="add"?"add":"subtract"),await this.paintCutout()}}async onCutoutPointerMove(t){if(!this.painting||!this.session)return;const e=this.cutoutPoint(t);e&&(this.session.paint(e.x,e.y,this.brushSize,this.cutoutTool==="add"?"add":"subtract"),await this.paintCutout())}onCutoutPointerUp(){this.painting=!1}async undoCutout(){var t;(t=this.session)!=null&&t.undo()&&await this.paintCutout()}async redoCutout(){var t;(t=this.session)!=null&&t.redo()&&await this.paintCutout()}async resetCutout(){var t;(t=this.session)==null||t.reset(),await this.paintCutout()}async toggleOriginal(t){this.showOriginal=t,await this.paintCutout()}async closeCutout(){await we(this.renderRoot.querySelector(".cutout-dialog")),this.cutout=null,this.cutoutCanvas=null,this.cutoutError="",this.session=null,this.painting=!1,this.showOriginal=!1,this.cutoutZoom=1,this.cutoutContrast=!1}cutoutName(){var e,i;return(e=this.cutout)!=null&&e.outputName?this.cutout.outputName:`${(((i=this.cutout)==null?void 0:i.name)??"cutout").replace(/\.[a-z0-9]+$/i,"").slice(0,60)||"cutout"}-cutout.png`}exportCanvas(){return this.session?this.session.compose({feather:this.cutoutFeather,spill:this.cutoutSpill}):null}async downloadCutout(){const t=this.exportCanvas();if(t)try{const e=await Yt(t),i=URL.createObjectURL(e),s=document.createElement("a");s.href=i,s.download=this.cutoutName(),s.click(),setTimeout(()=>URL.revokeObjectURL(i),0)}catch(e){this.cutoutError=e.message}}async saveCutout(){const t=this.exportCanvas();if(!(!t||this.cutoutBusy)){this.cutoutBusy=!0;try{const e=await Yt(t),i=this.cutoutName();await u.upload(new File([e],i,{type:"image/png"}),i),this.dispatchEvent(new CustomEvent("imported",{detail:{count:1,kind:"image",title:i},bubbles:!0,composed:!0})),this.showToast("Cut-out saved to your library."),this.closeCutout()}catch(e){this.cutoutError=e.message}finally{this.cutoutBusy=!1}}}renderCutoutDialog(){if(!this.cutout)return c;const t=this.cutoutTool!=="remove",e=Math.round(this.cutFraction*100),i=!!this.cutout.outfitShotId;return o`
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
            class="cutout-canvas ${t?"brushing":"picking"} ${this.showOriginal?"before":""} ${this.cutoutContrast?"contrast":""}"
            @pointerdown=${s=>void this.onCutoutPointerDown(s)}
            @pointermove=${s=>void this.onCutoutPointerMove(s)}
            @pointerup=${()=>this.onCutoutPointerUp()}
            @pointercancel=${()=>this.onCutoutPointerUp()}
          ></div>

          ${this.cutoutError?o`<div class="banner">${this.cutoutError}</div>`:c}

          <div class="cut-row">
            <span class="cut-stat">
              ${this.showOriginal?"Showing the original":`${e}% removed`}
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
            ${[["remove","colorize","Remove colour"],["subtract","ink_eraser","Erase"],["add","brush","Restore"]].map(([s,a,r])=>o`<button
                class="btn ${this.cutoutTool===s?"primary":""}"
                @click=${()=>this.cutoutTool=s}
              >
                <span class="material-symbols-rounded" style="font-size:17px;">${a}</span>
                ${r}
              </button>`)}
          </div>

          ${t?o`<div>
                <label class="field">Brush size · ${this.brushSize} px</label>
                <input type="range" min="4" max="160" step="2" .value=${String(this.brushSize)}
                  @input=${s=>this.brushSize=Number(s.target.value)} />
              </div>`:o`
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
    `}renderCharEditor(t){var i;const e=t.imageData??(t.id&&((i=this.characters.find(s=>s.id===t.id))!=null&&i.hasThumb)?`${u.characterThumbURL(t.id)}?v=${this.thumbVersion}`:void 0);return o`
      <div class="overlay" @click=${s=>{s.target===s.currentTarget&&(this.charDraft=null)}}>
        <div class="dialog">
          <h3>${t.id?"Edit character":"New character"}</h3>
          <div>
            <label class="field">Name</label>
            <input type="text" .value=${t.name} placeholder="Rin"
              @input=${s=>this.charDraft={...t,name:s.target.value}} />
          </div>
          <div>
            <label class="field">Prompt fragment</label>
            <textarea .value=${t.prompt} placeholder="1girl, red hair, green eyes, …"
              @input=${s=>this.charDraft={...t,prompt:s.target.value}}></textarea>
          </div>
          <div>
            <label class="field">Negative fragment (optional)</label>
            <textarea .value=${t.negativePrompt} placeholder="blonde, …"
              @input=${s=>this.charDraft={...t,negativePrompt:s.target.value}}></textarea>
          </div>
          <div class="dialog-thumb">
            ${e?o`<img src=${e} alt="Thumbnail" />`:o`<div class="card-blank" style="width:72px; height:96px; aspect-ratio:auto; border-radius:10px;">
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
            ${t.id?o`<button class="btn danger" ?disabled=${this.charBusy} @click=${()=>this.deleteCharacter()}>
                  Delete
                </button>`:c}
            <button class="btn" @click=${()=>this.charDraft=null}>Cancel</button>
            <button class="btn primary" ?disabled=${!t.name.trim()||this.charBusy} @click=${()=>this.saveCharacter()}>
              Save
            </button>
          </div>
        </div>
      </div>
    `}renderPrompt(){var i,s,a,r,n;const t=this.outfitOn?1:this.count,e=[...new Set((((i=this.status)==null?void 0:i.loras)??[]).filter(l=>l.name in this.selectedLoras).flatMap(l=>l.triggerPhrases??[]))];return o`
      <div class="prompt-card">
        ${this.editing?o`<div class="editing-bar">
          <span class="material-symbols-rounded" style="font-size:17px;">brush</span>
          <span class="editing-copy">Editing <strong>${this.editing.title}</strong>${this.editingLibby?" — one of Libby's pictures":""}.
            Generate, then Save to keep it beside the original, or right-click a result to replace it.</span>
          <button class="chip" @click=${()=>this.editing=null}>Done</button>
        </div>`:c}
        <div class="prompt-head">
          <span class="prompt-title">Prompt</span>
          <span class="toolbar-spacer"></span>
          <div class="speech-row">
            <div class="speech-hint">
              ${this.listening?this.speech||"Listening…":this.optimizing?"Turning that into a prompt…":this.speechSupported?"Voice prompt":"Voice unavailable"}
            </div>
            ${this.speechSupported?o`<button
                  class="mic ${this.listening?"live":""}"
                  title=${this.listening?"Stop listening":"Speak your idea"}
                  @click=${()=>this.toggleListening()}
                >
                  <span class="material-symbols-rounded">${this.listening?"stop":"mic"}</span>
                </button>`:c}
          </div>
        </div>

        <div class="prompt-grid">
          <div class="prompt-field">
            <span class="field-tag">Positive</span>
            <textarea
              class="prompt-area"
              aria-label="Positive prompt"
              .value=${this.prompt}
              placeholder="Describe what you want to create…"
              @input=${l=>{this.prompt=l.target.value,this.updateTagSuggestions()}}
            ></textarea>
          </div>
          <div class="prompt-field">
            <span class="field-tag negative">Negative</span>
            <textarea
              aria-label="Negative prompt"
              .value=${this.negative}
              placeholder="What should be excluded…"
              @input=${l=>this.negative=l.target.value}
            ></textarea>
          </div>
        </div>

        ${this.tagCorrection?o`<div class="sec-note">Did you mean
          <button class="chip" @click=${()=>this.applySuggestedTag(this.tagCorrection)}>${this.tagCorrection}</button>?
        </div>`:c}
        ${this.tagSuggestions.length?o`<div class="chips">
          ${this.tagSuggestions.map(l=>o`<button class="chip" @click=${()=>this.applySuggestedTag(l)}>${l}</button>`)}
        </div>`:c}
        ${e.length?o`<div class="chips">
          ${e.map(l=>o`<button
            class="chip ${this.selectedTriggers.includes(l)?"on":""}"
            title="Add or remove LoRA trigger phrase"
            @click=${()=>this.toggleTrigger(l)}>${l}</button>`)}
        </div>`:c}

        ${this.showOptions?o`<div class="prompt-options">${this.renderPromptOptions()}</div>`:c}

        <div class="prompt-footer">
          <button class="adv-toggle" @click=${()=>this.showOptions=!this.showOptions}>
            <span class="material-symbols-rounded" style="font-size:17px;">${this.showOptions?"expand_less":"tune"}</span>
            ${this.showOptions?"Hide size":"Size"}
          </button>
          <span class="prompt-summary">${this.steps} steps · CFG ${this.cfg} · ${t} image${t===1?"":"s"}</span>
          ${this.generating?o`<button class="generate cancel" type="button" ?disabled=${(s=this.progress)==null?void 0:s.cancelled} title="Stop this generation" @click=${()=>void this.cancelGeneration()}>
                <span class="material-symbols-rounded" style="font-size:19px;">close</span>
                ${(a=this.progress)!=null&&a.cancelled?"Stopping…":(r=this.progress)!=null&&r.total?`Cancel · ${this.progress.step}/${this.progress.total}`:"Cancel"}
              </button>`:o`<button class="generate" ?disabled=${!this.assemblePrompts().prompt.trim()} @click=${()=>this.generate()}>
                <span class="material-symbols-rounded" style="font-size:19px;">auto_awesome</span>
                ${((n=this.status)==null?void 0:n.backend)==="invokeai"?"Invoke":"Generate"}
              </button>`}
        </div>
      </div>
    `}async applyOutfitCutout(){var s;const t=this.exportCanvas(),e=(s=this.cutout)==null?void 0:s.outfitShotId,i=this.shots.find(a=>a.id===e);if(!(!t||!e||!i||this.cutoutBusy)){this.cutoutBusy=!0;try{const a=t.toDataURL("image/png"),r=i.wipOutfitId||await this.ensureWardrobe();if(await u.putLibbyOutfitWip(r,i.outfitSlot.emotion,i.outfitSlot.tier,{imageData:a,filename:i.outfitFilename,seed:i.seed,reviewed:!0,config:i.outfitConfig,info:i.info}),!e.startsWith("wip-"))try{await u.replaceGenPreview(e,a)}catch{}const n=Date.now();this.shots=this.shots.map(l=>l.id===e?{...l,cutoutReviewed:!0,previewVersion:n,wipOutfitId:r}:l),this.persistDraft(),this.showToast("Reviewed cutout applied to this outfit state."),this.closeCutout(),this.fileSpriteToWardrobe(e,t,r)}catch(a){this.cutoutError=a.message}finally{this.cutoutBusy=!1}}}async fileSpriteToWardrobe(t,e,i){var r,n,l;const s=i||this.outfitWardrobeId;if(!s)return;const a=(r=this.shots.find(p=>p.id===t))==null?void 0:r.outfitSlot;if(a)try{await u.setLibbyEmotion(s,a.emotion,e.toDataURL("image/png"),a.tier),this.wardrobes=await u.libbyOutfits().then(h=>h.outfits),(n=this.renderRoot.querySelector("oppai-outfit-wardrobe"))==null||n.refresh();const p=((l=this.wardrobes.find(h=>h.id===s))==null?void 0:l.name)??"the wardrobe";this.showToast(`Filed ${a.tierLabel} · ${a.emotionLabel} into ${p}.`)}catch(p){this.showToast(`Saved the cutout, but filing it failed: ${p.message}`)}}async loadStudio(){if(!this.studioLoaded){this.studioLoaded=!0;try{const[t,e]=await Promise.all([u.libbyLoadouts(),u.libbyOutfits()]);if(this.loadouts=t.loadouts,this.wardrobes=e.outfits,this.outfitWardrobeId&&!this.wardrobes.some(i=>i.id===this.outfitWardrobeId)&&(this.outfitWardrobeId=""),this.outfitLoadoutId&&!this.loadouts.some(i=>i.id===this.outfitLoadoutId)&&(this.outfitLoadoutId=""),!this.outfitWardrobeId){const i=[...this.wardrobes].sort((s,a)=>(a.wip??0)-(s.wip??0))[0];i!=null&&i.wip&&(this.outfitWardrobeId=i.id)}await this.loadWipBoard(this.outfitWardrobeId)}catch(t){this.showToast(`Couldn't load your saved outfits: ${t.message}`),this.studioLoaded=!1}}}loadoutBody(){return{version:1,gear:this.outfitGear,theme:this.outfitText.trim(),background:this.outfitBackground,underwearColor:this.outfitUnderwearColor,pubicHair:this.outfitPubicHair,pubicHairColor:this.outfitPubicHairColor,lockColors:this.outfitLockColors,shot:this.camera.shot}}applyLoadout(t){const e=t.loadout??{},i=(a,r)=>typeof e[a]=="string"?e[a]:r;this.outfitGear=Kt(e.gear),this.outfitText=i("theme",t.name),this.outfitBackground=e.background==="black"?"black":"white",this.outfitUnderwearColor=i("underwearColor",this.outfitUnderwearColor),this.outfitPubicHair=e.pubicHair===!0,this.outfitPubicHairColor=i("pubicHairColor",this.outfitPubicHairColor),this.outfitLockColors=e.lockColors!==!1;const s=i("shot","");s&&wt.shots.some(a=>a.id===s)&&this.editCamera({shot:s}),this.outfitLoadoutId=t.id,this.outfitOn=!0,this.persistDraft(),this.showToast(`Equipped “${t.name}”.`)}async saveLoadout(t){var r;if(this.loadoutBusy)return;const e=this.outfitText.trim(),i=this.loadouts.find(n=>n.id===this.outfitLoadoutId),s=t?e:(i==null?void 0:i.name)??e,a=(r=window.prompt("Name this loadout",s||"New loadout"))==null?void 0:r.trim();if(a){this.loadoutBusy=!0;try{const n=await u.saveLibbyLoadout({id:t?void 0:this.outfitLoadoutId||void 0,name:a,loadout:this.loadoutBody()});this.outfitLoadoutId=n.id,this.loadouts=(await u.libbyLoadouts()).loadouts,this.persistDraft(),this.showToast(`Saved “${n.name}”.`)}catch(n){this.showToast(n.message)}finally{this.loadoutBusy=!1}}}async deleteLoadout(t){if(!(this.loadoutBusy||!window.confirm(`Delete the loadout “${t.name}”?`))){this.loadoutBusy=!0;try{await u.deleteLibbyLoadout(t.id),this.loadouts=this.loadouts.filter(e=>e.id!==t.id),this.outfitLoadoutId===t.id&&(this.outfitLoadoutId=""),this.showToast(`Deleted “${t.name}”.`)}catch(e){this.showToast(e.message)}finally{this.loadoutBusy=!1}}}async setLoadoutCoverFromSelection(){const t=this.loadouts.find(i=>i.id===this.outfitLoadoutId);if(!t||this.loadoutBusy)return;const e=this.shotAt(this.outfitSlot().slot)??this.currentOutfitShots()[0];if(!e){this.showToast("Generate a square first — its picture becomes the cover.");return}this.loadoutBusy=!0;try{const i=await fetch(this.previewURL(e),{credentials:"same-origin"});if(!i.ok)throw new Error(`preview returned ${i.status}`);const s=await dt(await i.blob());await u.setLibbyLoadoutThumb(t.id,s),this.loadoutCoverVersion=Date.now(),this.loadouts=(await u.libbyLoadouts()).loadouts,this.showToast("Cover updated.")}catch(i){this.showToast(i.message)}finally{this.loadoutBusy=!1}}async createWardrobe(){var e;const t=(e=window.prompt("Name the wardrobe these sprites go into",this.outfitText.trim()||"New wardrobe"))==null?void 0:e.trim();if(t)try{const i=await u.saveLibbyOutfit({name:t});this.wardrobes=(await u.libbyOutfits()).outfits,this.outfitWardrobeId=i.id,this.persistDraft(),await this.loadWipBoard(i.id),this.showToast(`Squares will be kept in “${i.name}”.`)}catch(i){this.showToast(i.message)}}async updateTagSuggestions(){var e;const t=((e=this.prompt.split(",").at(-1))==null?void 0:e.trim())??"";if(t.length<2){this.tagSuggestions=[],this.tagCorrection="";return}try{const i=await u.booruTags(t);this.tagSuggestions=i.suggestions,this.tagCorrection=i.correction??""}catch{this.tagSuggestions=[],this.tagCorrection=""}}applySuggestedTag(t){const e=this.prompt.split(",");e[e.length-1]=` ${t}`,this.prompt=e.join(",").trimStart()+", ",this.tagSuggestions=[],this.tagCorrection=""}renderPromptOptions(){return o`
      <div>
        <label class="field">Resolution</label>
        <div class="chips">
          ${Si.map(t=>{const e=t.w===this.width&&t.h===this.height;return o`<button
              class="chip ${e?"on":""}"
              @click=${()=>{this.width=t.w,this.height=t.h}}
            >${t.label}<span class="hint">${t.hint}</span></button>`})}
        </div>
      </div>
      <div class="custom-size">
        <div>
          <label class="field">Width</label>
          <input class="num" type="number" min="64" max="2048" step="8" .value=${String(this.width)}
            @input=${t=>this.width=q(t.target.value,64,2048,512)} />
        </div>
        <span class="material-symbols-rounded" style="margin-top:22px; color:var(--oppai-text-muted);">close</span>
        <div>
          <label class="field">Height</label>
          <input class="num" type="number" min="64" max="2048" step="8" .value=${String(this.height)}
            @input=${t=>this.height=q(t.target.value,64,2048,768)} />
        </div>
      </div>
    `}renderGenInfo(t){const e=t.info;return e?o`
      <div class="geninfo">
        <pre class="geninfo-text">${V(e)}</pre>
        <div class="geninfo-row">
          <button class="act primary" @click=${()=>void this.copyGenInfo(t,"text")}>
            <span class="material-symbols-rounded" style="font-size:16px;">content_copy</span>
            Copy parameters
          </button>
          <button class="act" title="Everything, including the fields A1111's format has no room for"
            @click=${()=>void this.copyGenInfo(t,"json")}>
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
      </div>`}nodePosition(t,e){const i=this.defaultNodePosition(e);return{x:t.workspaceX??i.workspaceX,y:t.workspaceY??i.workspaceY}}beginNodeDrag(t,e,i){var a,r;if(i.button!==0)return;i.preventDefault();const s=this.nodePosition(t,e);this.activeNodeId=t.id,this.draggingNode={id:t.id,pointerId:i.pointerId,clientX:i.clientX,clientY:i.clientY,x:s.x,y:s.y},(r=(a=i.currentTarget).setPointerCapture)==null||r.call(a,i.pointerId)}moveNode(t){const e=this.draggingNode;if(!e||e.pointerId!==t.pointerId)return;t.preventDefault();const i=Math.max(0,Math.round(e.x+t.clientX-e.clientX)),s=Math.max(0,Math.round(e.y+t.clientY-e.clientY));this.shots=this.shots.map(a=>a.id===e.id?{...a,workspaceX:i,workspaceY:s}:a)}endNodeDrag(t){!this.draggingNode||this.draggingNode.pointerId!==t.pointerId||(this.draggingNode=null,this.persistDraft())}clearWorkspace(){!this.shots.length||!confirm("Clear every generated image from this workspace? Unsaved previews will no longer be shown.")||(this.shots=[],this.expandedShot=null,this.infoFor=null,this.activeNodeId=null,this.outfitProgress="",this.persistDraft())}async deleteOutfitSquare(t){const e=t.outfitSlot;if(e&&confirm(`Delete the ${e.tierLabel} · ${e.emotionLabel} square? It will need generating again.`))try{t.wipOutfitId&&await u.deleteLibbyOutfitWip(t.wipOutfitId,e.emotion,e.tier),t.id.startsWith("wip-")||await u.deleteGenPreview(t.id).catch(()=>{}),this.shots=this.shots.filter(i=>i.id!==t.id),this.persistDraft(),this.showToast(`Deleted ${e.tierLabel} · ${e.emotionLabel}.`)}catch(i){this.showToast(i.message)}}renderResults(){if(!this.shots.length)return o`<div class="canvas-empty">
        <span class="material-symbols-rounded">image</span>
        <strong>Your generation canvas</strong>
        <span>Choose a model and write a prompt. New images appear here while the full history stays in the gallery.</span>
      </div>`;const t=this.shots.map((s,a)=>this.nodePosition(s,a)),e=Math.max(600,...t.map(s=>s.x+290)),i=Math.max(480,...t.map(s=>s.y+450));return o`
      <div class="results" style=${`width:${e}px;height:${i}px;`}>
        ${this.shots.map((s,a)=>{var n;const r=t[a];return o`
            <div class="shot ${this.activeNodeId===s.id?"active":""}"
              style=${`left:${r.x}px;top:${r.y}px;`}>
              <div class="node-handle"
                title="Drag to move this image"
                @pointerdown=${l=>this.beginNodeDrag(s,a,l)}
                @pointermove=${l=>this.moveNode(l)}
                @pointerup=${l=>this.endNodeDrag(l)}
                @pointercancel=${l=>this.endNodeDrag(l)}>
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
                @contextmenu=${l=>this.openShotMenu(s,l)}
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
                ${((n=this.status)==null?void 0:n.backend)==="invokeai"?o`<button class="act"
                  title="Set as this model's preview in InvokeAI" @click=${()=>this.useAsModelThumb(s)}>
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
    `}};g.styles=[gt,Rt,mt`
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
        grid-template-columns: 92px repeat(${M.length}, var(--cell, 88px));
        gap: 6px;
        align-items: stretch;
        width: max-content;
        min-width: 100%;
      }
      .face-matrix.fit { grid-template-columns: 92px repeat(${M.length}, minmax(0, 1fr)); width: 100%; min-width: 0; }
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
    `];g.DRAFT_FIELDS=new Set(["prompt","negative","checkpoint","vae","templateId","scheduler","width","height","steps","cfg","cfgRescale","clipSkip","seamlessX","seamlessY","vaePrecision","cpuNoise","count","seed","board","selectedLoras","selectedTriggers","selectedChars","selectedPoses","outfitOn","outfitText","outfitGear","outfitFace","outfitMisc","outfitMiscBatch","outfitTier","outfitBackground","outfitLockColors","outfitLoadoutId","outfitWardrobeId","sheetZoom","outfitUnderwearColor","outfitPubicHair","outfitPubicHairColor","camera","detailerEnabled","detailerModel","detailerPrompt","detailerNegative","detailerConfidence","detailerDenoise","detailerMaskBlur","open","showOptions","shots"]);m([ae({type:Boolean})],g.prototype,"studio",2);m([d()],g.prototype,"status",2);m([d()],g.prototype,"checkpoint",2);m([d()],g.prototype,"vae",2);m([d()],g.prototype,"templateId",2);m([d()],g.prototype,"showBuiltInTemplates",2);m([d()],g.prototype,"selectedLoras",2);m([d()],g.prototype,"selectedTriggers",2);m([d()],g.prototype,"loraPage",2);m([d()],g.prototype,"outfitOn",2);m([d()],g.prototype,"outfitText",2);m([d()],g.prototype,"outfitGear",2);m([d()],g.prototype,"outfitFace",2);m([d()],g.prototype,"outfitMisc",2);m([d()],g.prototype,"outfitMiscBatch",2);m([d()],g.prototype,"outfitTier",2);m([d()],g.prototype,"outfitBackground",2);m([d()],g.prototype,"outfitUnderwearColor",2);m([d()],g.prototype,"outfitPubicHair",2);m([d()],g.prototype,"outfitPubicHairColor",2);m([d()],g.prototype,"outfitLockColors",2);m([d()],g.prototype,"gearPromptOpen",2);m([d()],g.prototype,"outfitBatchRunning",2);m([d()],g.prototype,"outfitExporting",2);m([d()],g.prototype,"outfitProgress",2);m([d()],g.prototype,"loadouts",2);m([d()],g.prototype,"outfitLoadoutId",2);m([d()],g.prototype,"loadoutBusy",2);m([d()],g.prototype,"loadoutCoverVersion",2);m([d()],g.prototype,"wardrobes",2);m([d()],g.prototype,"outfitWardrobeId",2);m([d()],g.prototype,"studioView",2);m([d()],g.prototype,"sheetTab",2);m([d()],g.prototype,"sheetZoom",2);m([d()],g.prototype,"showSquarePrompt",2);m([d()],g.prototype,"camera",2);m([d()],g.prototype,"cutout",2);m([d()],g.prototype,"cutoutTolerance",2);m([d()],g.prototype,"cutoutBusy",2);m([d()],g.prototype,"cutoutError",2);m([oe(".cutout-canvas")],g.prototype,"cutoutHost",2);m([d()],g.prototype,"cutoutTool",2);m([d()],g.prototype,"cutoutFeather",2);m([d()],g.prototype,"cutoutSpill",2);m([d()],g.prototype,"cutoutZoom",2);m([d()],g.prototype,"cutoutContrast",2);m([d()],g.prototype,"contiguous",2);m([d()],g.prototype,"brushSize",2);m([d()],g.prototype,"showOriginal",2);m([d()],g.prototype,"canUndo",2);m([d()],g.prototype,"canRedo",2);m([d()],g.prototype,"cutFraction",2);m([d()],g.prototype,"characters",2);m([d()],g.prototype,"selectedChars",2);m([d()],g.prototype,"charDraft",2);m([d()],g.prototype,"charBusy",2);m([d()],g.prototype,"scanBusy",2);m([d()],g.prototype,"poses",2);m([d()],g.prototype,"selectedPoses",2);m([d()],g.prototype,"poseDraft",2);m([d()],g.prototype,"poseBusy",2);m([d()],g.prototype,"wildcards",2);m([d()],g.prototype,"wildcardDraft",2);m([d()],g.prototype,"wildcardBusy",2);m([ae({type:Number})],g.prototype,"editMedia",2);m([d()],g.prototype,"editing",2);m([d()],g.prototype,"open",2);m([d()],g.prototype,"speech",2);m([d()],g.prototype,"listening",2);m([d()],g.prototype,"optimizing",2);m([d()],g.prototype,"prompt",2);m([d()],g.prototype,"tagSuggestions",2);m([d()],g.prototype,"tagCorrection",2);m([d()],g.prototype,"negative",2);m([d()],g.prototype,"showOptions",2);m([d()],g.prototype,"width",2);m([d()],g.prototype,"height",2);m([d()],g.prototype,"steps",2);m([d()],g.prototype,"cfg",2);m([d()],g.prototype,"cfgRescale",2);m([d()],g.prototype,"clipSkip",2);m([d()],g.prototype,"seamlessX",2);m([d()],g.prototype,"seamlessY",2);m([d()],g.prototype,"vaePrecision",2);m([d()],g.prototype,"cpuNoise",2);m([d()],g.prototype,"board",2);m([d()],g.prototype,"scheduler",2);m([d()],g.prototype,"count",2);m([d()],g.prototype,"seed",2);m([d()],g.prototype,"detailerEnabled",2);m([d()],g.prototype,"detailerModel",2);m([d()],g.prototype,"detailerPrompt",2);m([d()],g.prototype,"detailerNegative",2);m([d()],g.prototype,"detailerConfidence",2);m([d()],g.prototype,"detailerDenoise",2);m([d()],g.prototype,"detailerMaskBlur",2);m([d()],g.prototype,"generating",2);m([d()],g.prototype,"progress",2);m([d()],g.prototype,"shots",2);m([d()],g.prototype,"activeNodeId",2);m([d()],g.prototype,"restoredNotice",2);m([d()],g.prototype,"infoFor",2);m([d()],g.prototype,"error",2);m([d()],g.prototype,"toast",2);m([d()],g.prototype,"thumbVersion",2);m([d()],g.prototype,"failedThumbs",2);m([d()],g.prototype,"expandedShot",2);m([d()],g.prototype,"metaDraft",2);m([d()],g.prototype,"metaBusy",2);m([d()],g.prototype,"metaTriggerText",2);m([d()],g.prototype,"civitaiOpen",2);m([oe("oppai-invoke-gallery")],g.prototype,"galleryPanel",2);g=m([bt("oppai-imagegen")],g);function dt(t){return new Promise((e,i)=>{const s=new FileReader;s.onload=()=>e(String(s.result)),s.onerror=()=>i(new Error("couldn't read the image")),s.readAsDataURL(t)})}export{g as OppaiImageGen};
