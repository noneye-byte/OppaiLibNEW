const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./settings-BBgrVJso.js","./libby-backgrounds-n1qcLQ-w.js","./passkeys-rN4gfhLm.js","./browse-BCXtTNM9.js","./query-__j_ZMY6.js","./imagegen-CnIJ-aA8.js","./chat-CrlzhnBU.js","./scrape-dialog-dpEReVBh.js","./shared-styles-Q0lb28Gp.js","./login-Bp8ZrgCy.js"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))o(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const r of s.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&o(r)}).observe(document,{childList:!0,subtree:!0});function i(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function o(a){if(a.ep)return;a.ep=!0;const s=i(a);fetch(a.href,s)}})();function $e(e,t,i,o){var a=arguments.length,s=a<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")s=Reflect.decorate(e,t,i,o);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(s=(a<3?r(s):a>3?r(t,i,s):r(t,i))||s);return a>3&&s&&Object.defineProperty(t,i,s),s}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ae=e=>(t,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)};/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ee=globalThis,at=Ee.ShadowRoot&&(Ee.ShadyCSS===void 0||Ee.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,st=Symbol(),kt=new WeakMap;let ti=class{constructor(t,i,o){if(this._$cssResult$=!0,o!==st)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=i}get styleSheet(){let t=this.o;const i=this.t;if(at&&t===void 0){const o=i!==void 0&&i.length===1;o&&(t=kt.get(i)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),o&&kt.set(i,t))}return t}toString(){return this.cssText}};const Bi=e=>new ti(typeof e=="string"?e:e+"",void 0,st),E=(e,...t)=>{const i=e.length===1?e[0]:t.reduce((o,a,s)=>o+(r=>{if(r._$cssResult$===!0)return r.cssText;if(typeof r=="number")return r;throw Error("Value passed to 'css' function must be a 'css' function result: "+r+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(a)+e[s+1],e[0]);return new ti(i,e,st)},Hi=(e,t)=>{if(at)e.adoptedStyleSheets=t.map(i=>i instanceof CSSStyleSheet?i:i.styleSheet);else for(const i of t){const o=document.createElement("style"),a=Ee.litNonce;a!==void 0&&o.setAttribute("nonce",a),o.textContent=i.cssText,e.appendChild(o)}},St=at?e=>e:e=>e instanceof CSSStyleSheet?(t=>{let i="";for(const o of t.cssRules)i+=o.cssText;return Bi(i)})(e):e;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:Yi,defineProperty:Gi,getOwnPropertyDescriptor:qi,getOwnPropertyNames:ji,getOwnPropertySymbols:Ji,getPrototypeOf:Wi}=Object,H=globalThis,It=H.trustedTypes,Ki=It?It.emptyScript:"",Be=H.reactiveElementPolyfillSupport,ce=(e,t)=>e,_e={toAttribute(e,t){switch(t){case Boolean:e=e?Ki:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=e!==null;break;case Number:i=e===null?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch{i=null}}return i}},rt=(e,t)=>!Yi(e,t),Ct={attribute:!0,type:String,converter:_e,reflect:!1,useDefault:!1,hasChanged:rt};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),H.litPropertyMetadata??(H.litPropertyMetadata=new WeakMap);let Z=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??(this.l=[])).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,i=Ct){if(i.state&&(i.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((i=Object.create(i)).wrapped=!0),this.elementProperties.set(t,i),!i.noAccessor){const o=Symbol(),a=this.getPropertyDescriptor(t,o,i);a!==void 0&&Gi(this.prototype,t,a)}}static getPropertyDescriptor(t,i,o){const{get:a,set:s}=qi(this.prototype,t)??{get(){return this[i]},set(r){this[i]=r}};return{get:a,set(r){const l=a==null?void 0:a.call(this);s==null||s.call(this,r),this.requestUpdate(t,l,o)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??Ct}static _$Ei(){if(this.hasOwnProperty(ce("elementProperties")))return;const t=Wi(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(ce("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(ce("properties"))){const i=this.properties,o=[...ji(i),...Ji(i)];for(const a of o)this.createProperty(a,i[a])}const t=this[Symbol.metadata];if(t!==null){const i=litPropertyMetadata.get(t);if(i!==void 0)for(const[o,a]of i)this.elementProperties.set(o,a)}this._$Eh=new Map;for(const[i,o]of this.elementProperties){const a=this._$Eu(i,o);a!==void 0&&this._$Eh.set(a,i)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const i=[];if(Array.isArray(t)){const o=new Set(t.flat(1/0).reverse());for(const a of o)i.unshift(St(a))}else t!==void 0&&i.push(St(t));return i}static _$Eu(t,i){const o=i.attribute;return o===!1?void 0:typeof o=="string"?o:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var t;this._$ES=new Promise(i=>this.enableUpdating=i),this._$AL=new Map,this._$E_(),this.requestUpdate(),(t=this.constructor.l)==null||t.forEach(i=>i(this))}addController(t){var i;(this._$EO??(this._$EO=new Set)).add(t),this.renderRoot!==void 0&&this.isConnected&&((i=t.hostConnected)==null||i.call(t))}removeController(t){var i;(i=this._$EO)==null||i.delete(t)}_$E_(){const t=new Map,i=this.constructor.elementProperties;for(const o of i.keys())this.hasOwnProperty(o)&&(t.set(o,this[o]),delete this[o]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Hi(t,this.constructor.elementStyles),t}connectedCallback(){var t;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(t=this._$EO)==null||t.forEach(i=>{var o;return(o=i.hostConnected)==null?void 0:o.call(i)})}enableUpdating(t){}disconnectedCallback(){var t;(t=this._$EO)==null||t.forEach(i=>{var o;return(o=i.hostDisconnected)==null?void 0:o.call(i)})}attributeChangedCallback(t,i,o){this._$AK(t,o)}_$ET(t,i){var s;const o=this.constructor.elementProperties.get(t),a=this.constructor._$Eu(t,o);if(a!==void 0&&o.reflect===!0){const r=(((s=o.converter)==null?void 0:s.toAttribute)!==void 0?o.converter:_e).toAttribute(i,o.type);this._$Em=t,r==null?this.removeAttribute(a):this.setAttribute(a,r),this._$Em=null}}_$AK(t,i){var s,r;const o=this.constructor,a=o._$Eh.get(t);if(a!==void 0&&this._$Em!==a){const l=o.getPropertyOptions(a),c=typeof l.converter=="function"?{fromAttribute:l.converter}:((s=l.converter)==null?void 0:s.fromAttribute)!==void 0?l.converter:_e;this._$Em=a;const h=c.fromAttribute(i,l.type);this[a]=h??((r=this._$Ej)==null?void 0:r.get(a))??h,this._$Em=null}}requestUpdate(t,i,o,a=!1,s){var r;if(t!==void 0){const l=this.constructor;if(a===!1&&(s=this[t]),o??(o=l.getPropertyOptions(t)),!((o.hasChanged??rt)(s,i)||o.useDefault&&o.reflect&&s===((r=this._$Ej)==null?void 0:r.get(t))&&!this.hasAttribute(l._$Eu(t,o))))return;this.C(t,i,o)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,i,{useDefault:o,reflect:a,wrapped:s},r){o&&!(this._$Ej??(this._$Ej=new Map)).has(t)&&(this._$Ej.set(t,r??i??this[t]),s!==!0||r!==void 0)||(this._$AL.has(t)||(this.hasUpdated||o||(i=void 0),this._$AL.set(t,i)),a===!0&&this._$Em!==t&&(this._$Eq??(this._$Eq=new Set)).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(i){Promise.reject(i)}const t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var o;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[s,r]of this._$Ep)this[s]=r;this._$Ep=void 0}const a=this.constructor.elementProperties;if(a.size>0)for(const[s,r]of a){const{wrapped:l}=r,c=this[s];l!==!0||this._$AL.has(s)||c===void 0||this.C(s,void 0,r,c)}}let t=!1;const i=this._$AL;try{t=this.shouldUpdate(i),t?(this.willUpdate(i),(o=this._$EO)==null||o.forEach(a=>{var s;return(s=a.hostUpdate)==null?void 0:s.call(a)}),this.update(i)):this._$EM()}catch(a){throw t=!1,this._$EM(),a}t&&this._$AE(i)}willUpdate(t){}_$AE(t){var i;(i=this._$EO)==null||i.forEach(o=>{var a;return(a=o.hostUpdated)==null?void 0:a.call(o)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&(this._$Eq=this._$Eq.forEach(i=>this._$ET(i,this[i]))),this._$EM()}updated(t){}firstUpdated(t){}};Z.elementStyles=[],Z.shadowRootOptions={mode:"open"},Z[ce("elementProperties")]=new Map,Z[ce("finalized")]=new Map,Be==null||Be({ReactiveElement:Z}),(H.reactiveElementVersions??(H.reactiveElementVersions=[])).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Vi={attribute:!0,type:String,converter:_e,reflect:!1,hasChanged:rt},Xi=(e=Vi,t,i)=>{const{kind:o,metadata:a}=i;let s=globalThis.litPropertyMetadata.get(a);if(s===void 0&&globalThis.litPropertyMetadata.set(a,s=new Map),o==="setter"&&((e=Object.create(e)).wrapped=!0),s.set(i.name,e),o==="accessor"){const{name:r}=i;return{set(l){const c=t.get.call(this);t.set.call(this,l),this.requestUpdate(r,c,e,!0,l)},init(l){return l!==void 0&&this.C(r,void 0,e,l),l}}}if(o==="setter"){const{name:r}=i;return function(l){const c=this[r];t.call(this,l),this.requestUpdate(r,c,e,!0,l)}}throw Error("Unsupported decorator location: "+o)};function O(e){return(t,i)=>typeof i=="object"?Xi(e,t,i):((o,a,s)=>{const r=a.hasOwnProperty(s);return a.constructor.createProperty(s,o),r?Object.getOwnPropertyDescriptor(a,s):void 0})(e,t,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function f(e){return O({...e,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const he=globalThis,Et=e=>e,Oe=he.trustedTypes,Tt=Oe?Oe.createPolicy("lit-html",{createHTML:e=>e}):void 0,ii="$lit$",B=`lit$${Math.random().toFixed(9).slice(2)}$`,oi="?"+B,Zi=`<${oi}>`,K=document,pe=()=>K.createComment(""),ue=e=>e===null||typeof e!="object"&&typeof e!="function",nt=Array.isArray,Qi=e=>nt(e)||typeof(e==null?void 0:e[Symbol.iterator])=="function",He=`[ 	
\f\r]`,se=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,_t=/-->/g,Ot=/>/g,Y=RegExp(`>|${He}(?:([^\\s"'>=/]+)(${He}*=${He}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),At=/'/g,Lt=/"/g,ai=/^(?:script|style|textarea|title)$/i,eo=e=>(t,...i)=>({_$litType$:e,strings:t,values:i}),d=eo(1),V=Symbol.for("lit-noChange"),u=Symbol.for("lit-nothing"),Mt=new WeakMap,q=K.createTreeWalker(K,129);function si(e,t){if(!nt(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return Tt!==void 0?Tt.createHTML(t):t}const to=(e,t)=>{const i=e.length-1,o=[];let a,s=t===2?"<svg>":t===3?"<math>":"",r=se;for(let l=0;l<i;l++){const c=e[l];let h,p,m=-1,y=0;for(;y<c.length&&(r.lastIndex=y,p=r.exec(c),p!==null);)y=r.lastIndex,r===se?p[1]==="!--"?r=_t:p[1]!==void 0?r=Ot:p[2]!==void 0?(ai.test(p[2])&&(a=RegExp("</"+p[2],"g")),r=Y):p[3]!==void 0&&(r=Y):r===Y?p[0]===">"?(r=a??se,m=-1):p[1]===void 0?m=-2:(m=r.lastIndex-p[2].length,h=p[1],r=p[3]===void 0?Y:p[3]==='"'?Lt:At):r===Lt||r===At?r=Y:r===_t||r===Ot?r=se:(r=Y,a=void 0);const w=r===Y&&e[l+1].startsWith("/>")?" ":"";s+=r===se?c+Zi:m>=0?(o.push(h),c.slice(0,m)+ii+c.slice(m)+B+w):c+B+(m===-2?l:w)}return[si(e,s+(e[i]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),o]};class me{constructor({strings:t,_$litType$:i},o){let a;this.parts=[];let s=0,r=0;const l=t.length-1,c=this.parts,[h,p]=to(t,i);if(this.el=me.createElement(h,o),q.currentNode=this.el.content,i===2||i===3){const m=this.el.content.firstChild;m.replaceWith(...m.childNodes)}for(;(a=q.nextNode())!==null&&c.length<l;){if(a.nodeType===1){if(a.hasAttributes())for(const m of a.getAttributeNames())if(m.endsWith(ii)){const y=p[r++],w=a.getAttribute(m).split(B),b=/([.?@])?(.*)/.exec(y);c.push({type:1,index:s,name:b[2],strings:w,ctor:b[1]==="."?oo:b[1]==="?"?ao:b[1]==="@"?so:Ne}),a.removeAttribute(m)}else m.startsWith(B)&&(c.push({type:6,index:s}),a.removeAttribute(m));if(ai.test(a.tagName)){const m=a.textContent.split(B),y=m.length-1;if(y>0){a.textContent=Oe?Oe.emptyScript:"";for(let w=0;w<y;w++)a.append(m[w],pe()),q.nextNode(),c.push({type:2,index:++s});a.append(m[y],pe())}}}else if(a.nodeType===8)if(a.data===oi)c.push({type:2,index:s});else{let m=-1;for(;(m=a.data.indexOf(B,m+1))!==-1;)c.push({type:7,index:s}),m+=B.length-1}s++}}static createElement(t,i){const o=K.createElement("template");return o.innerHTML=t,o}}function ie(e,t,i=e,o){var r,l;if(t===V)return t;let a=o!==void 0?(r=i._$Co)==null?void 0:r[o]:i._$Cl;const s=ue(t)?void 0:t._$litDirective$;return(a==null?void 0:a.constructor)!==s&&((l=a==null?void 0:a._$AO)==null||l.call(a,!1),s===void 0?a=void 0:(a=new s(e),a._$AT(e,i,o)),o!==void 0?(i._$Co??(i._$Co=[]))[o]=a:i._$Cl=a),a!==void 0&&(t=ie(e,a._$AS(e,t.values),a,o)),t}class io{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:o}=this._$AD,a=((t==null?void 0:t.creationScope)??K).importNode(i,!0);q.currentNode=a;let s=q.nextNode(),r=0,l=0,c=o[0];for(;c!==void 0;){if(r===c.index){let h;c.type===2?h=new ke(s,s.nextSibling,this,t):c.type===1?h=new c.ctor(s,c.name,c.strings,this,t):c.type===6&&(h=new ro(s,this,t)),this._$AV.push(h),c=o[++l]}r!==(c==null?void 0:c.index)&&(s=q.nextNode(),r++)}return q.currentNode=K,a}p(t){let i=0;for(const o of this._$AV)o!==void 0&&(o.strings!==void 0?(o._$AI(t,o,i),i+=o.strings.length-2):o._$AI(t[i])),i++}}class ke{get _$AU(){var t;return((t=this._$AM)==null?void 0:t._$AU)??this._$Cv}constructor(t,i,o,a){this.type=2,this._$AH=u,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=o,this.options=a,this._$Cv=(a==null?void 0:a.isConnected)??!0}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return i!==void 0&&(t==null?void 0:t.nodeType)===11&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=ie(this,t,i),ue(t)?t===u||t==null||t===""?(this._$AH!==u&&this._$AR(),this._$AH=u):t!==this._$AH&&t!==V&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):Qi(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==u&&ue(this._$AH)?this._$AA.nextSibling.data=t:this.T(K.createTextNode(t)),this._$AH=t}$(t){var s;const{values:i,_$litType$:o}=t,a=typeof o=="number"?this._$AC(t):(o.el===void 0&&(o.el=me.createElement(si(o.h,o.h[0]),this.options)),o);if(((s=this._$AH)==null?void 0:s._$AD)===a)this._$AH.p(i);else{const r=new io(a,this),l=r.u(this.options);r.p(i),this.T(l),this._$AH=r}}_$AC(t){let i=Mt.get(t.strings);return i===void 0&&Mt.set(t.strings,i=new me(t)),i}k(t){nt(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let o,a=0;for(const s of t)a===i.length?i.push(o=new ke(this.O(pe()),this.O(pe()),this,this.options)):o=i[a],o._$AI(s),a++;a<i.length&&(this._$AR(o&&o._$AB.nextSibling,a),i.length=a)}_$AR(t=this._$AA.nextSibling,i){var o;for((o=this._$AP)==null?void 0:o.call(this,!1,!0,i);t!==this._$AB;){const a=Et(t).nextSibling;Et(t).remove(),t=a}}setConnected(t){var i;this._$AM===void 0&&(this._$Cv=t,(i=this._$AP)==null||i.call(this,t))}}class Ne{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,o,a,s){this.type=1,this._$AH=u,this._$AN=void 0,this.element=t,this.name=i,this._$AM=a,this.options=s,o.length>2||o[0]!==""||o[1]!==""?(this._$AH=Array(o.length-1).fill(new String),this.strings=o):this._$AH=u}_$AI(t,i=this,o,a){const s=this.strings;let r=!1;if(s===void 0)t=ie(this,t,i,0),r=!ue(t)||t!==this._$AH&&t!==V,r&&(this._$AH=t);else{const l=t;let c,h;for(t=s[0],c=0;c<s.length-1;c++)h=ie(this,l[o+c],i,c),h===V&&(h=this._$AH[c]),r||(r=!ue(h)||h!==this._$AH[c]),h===u?t=u:t!==u&&(t+=(h??"")+s[c+1]),this._$AH[c]=h}r&&!a&&this.j(t)}j(t){t===u?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class oo extends Ne{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===u?void 0:t}}class ao extends Ne{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==u)}}class so extends Ne{constructor(t,i,o,a,s){super(t,i,o,a,s),this.type=5}_$AI(t,i=this){if((t=ie(this,t,i,0)??u)===V)return;const o=this._$AH,a=t===u&&o!==u||t.capture!==o.capture||t.once!==o.once||t.passive!==o.passive,s=t!==u&&(o===u||a);a&&this.element.removeEventListener(this.name,this,o),s&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){var i;typeof this._$AH=="function"?this._$AH.call(((i=this.options)==null?void 0:i.host)??this.element,t):this._$AH.handleEvent(t)}}class ro{constructor(t,i,o){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=o}get _$AU(){return this._$AM._$AU}_$AI(t){ie(this,t)}}const Ye=he.litHtmlPolyfillSupport;Ye==null||Ye(me,ke),(he.litHtmlVersions??(he.litHtmlVersions=[])).push("3.3.3");const no=(e,t,i)=>{const o=(i==null?void 0:i.renderBefore)??t;let a=o._$litPart$;if(a===void 0){const s=(i==null?void 0:i.renderBefore)??null;o._$litPart$=a=new ke(t.insertBefore(pe(),s),s,void 0,i??{})}return a._$AI(e),a};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const j=globalThis;let U=class extends Z{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var i;const t=super.createRenderRoot();return(i=this.renderOptions).renderBefore??(i.renderBefore=t.firstChild),t}update(t){const i=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=no(i,this.renderRoot,this.renderOptions)}connectedCallback(){var t;super.connectedCallback(),(t=this._$Do)==null||t.setConnected(!0)}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this._$Do)==null||t.setConnected(!1)}render(){return V}};var ei;U._$litElement$=!0,U.finalized=!0,(ei=j.litElementHydrateSupport)==null||ei.call(j,{LitElement:U});const Ge=j.litElementPolyfillSupport;Ge==null||Ge({LitElement:U});(j.litElementVersions??(j.litElementVersions=[])).push("4.2.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const lo={ATTRIBUTE:1,PROPERTY:3,BOOLEAN_ATTRIBUTE:4},ri=e=>(...t)=>({_$litDirective$:e,values:t});let ni=class{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,i,o){this._$Ct=t,this._$AM=i,this._$Ci=o}_$AS(t,i){return this.update(t,i)}update(t,i){return this.render(...i)}};/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const co=ri(class extends ni{constructor(e){var t;if(super(e),e.type!==lo.ATTRIBUTE||e.name!=="class"||((t=e.strings)==null?void 0:t.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return" "+Object.keys(e).filter(t=>e[t]).join(" ")+" "}update(e,[t]){var o,a;if(this.st===void 0){this.st=new Set,e.strings!==void 0&&(this.nt=new Set(e.strings.join(" ").split(/\s/).filter(s=>s!=="")));for(const s in t)t[s]&&!((o=this.nt)!=null&&o.has(s))&&this.st.add(s);return this.render(t)}const i=e.element.classList;for(const s of this.st)s in t||(i.remove(s),this.st.delete(s));for(const s in t){const r=!!t[s];r===this.st.has(s)||(a=this.nt)!=null&&a.has(s)||(r?(i.add(s),this.st.add(s)):(i.remove(s),this.st.delete(s)))}return V}});/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const li=["role","ariaAtomic","ariaAutoComplete","ariaBusy","ariaChecked","ariaColCount","ariaColIndex","ariaColSpan","ariaCurrent","ariaDisabled","ariaExpanded","ariaHasPopup","ariaHidden","ariaInvalid","ariaKeyShortcuts","ariaLabel","ariaLevel","ariaLive","ariaModal","ariaMultiLine","ariaMultiSelectable","ariaOrientation","ariaPlaceholder","ariaPosInSet","ariaPressed","ariaReadOnly","ariaRequired","ariaRoleDescription","ariaRowCount","ariaRowIndex","ariaRowSpan","ariaSelected","ariaSetSize","ariaSort","ariaValueMax","ariaValueMin","ariaValueNow","ariaValueText"],ho=li.map(di);function qe(e){return ho.includes(e)}function di(e){return e.replace("aria","aria-").replace(/Elements?/g,"").toLowerCase()}/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Ie=Symbol("privateIgnoreAttributeChangesFor");function po(e){var t;class i extends e{constructor(){super(...arguments),this[t]=new Set}attributeChangedCallback(a,s,r){if(!qe(a)){super.attributeChangedCallback(a,s,r);return}if(this[Ie].has(a))return;this[Ie].add(a),this.removeAttribute(a),this[Ie].delete(a);const l=We(a);r===null?delete this.dataset[l]:this.dataset[l]=r,this.requestUpdate(We(a),s)}getAttribute(a){return qe(a)?super.getAttribute(Je(a)):super.getAttribute(a)}removeAttribute(a){super.removeAttribute(a),qe(a)&&(super.removeAttribute(Je(a)),this.requestUpdate())}}return t=Ie,uo(i),i}function uo(e){for(const t of li){const i=di(t),o=Je(i),a=We(i);e.createProperty(t,{attribute:i,noAccessor:!0}),e.createProperty(Symbol(o),{attribute:o,noAccessor:!0}),Object.defineProperty(e.prototype,t,{configurable:!0,enumerable:!0,get(){return this.dataset[a]??null},set(s){const r=this.dataset[a]??null;s!==r&&(s===null?delete this.dataset[a]:this.dataset[a]=s,this.requestUpdate(t,r))}})}}function Je(e){return`data-${e}`}function We(e){return e.replace(/-\w/,t=>t[1].toUpperCase())}/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const mo=po(U);class Se extends mo{constructor(){super(...arguments),this.value=0,this.max=1,this.indeterminate=!1,this.fourColor=!1}render(){const{ariaLabel:t}=this;return d`
      <div
        class="progress ${co(this.getRenderClasses())}"
        role="progressbar"
        aria-label="${t||u}"
        aria-valuemin="0"
        aria-valuemax=${this.max}
        aria-valuenow=${this.indeterminate?u:this.value}
        >${this.renderIndicator()}</div
      >
    `}getRenderClasses(){return{indeterminate:this.indeterminate,"four-color":this.fourColor}}}$e([O({type:Number})],Se.prototype,"value",void 0);$e([O({type:Number})],Se.prototype,"max",void 0);$e([O({type:Boolean})],Se.prototype,"indeterminate",void 0);$e([O({type:Boolean,attribute:"four-color"})],Se.prototype,"fourColor",void 0);/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */class go extends Se{renderIndicator(){return this.indeterminate?this.renderIndeterminateContainer():this.renderDeterminateContainer()}renderDeterminateContainer(){const t=(1-this.value/this.max)*100;return d`
      <svg viewBox="0 0 4800 4800">
        <circle class="track" pathLength="100"></circle>
        <circle
          class="active-track"
          pathLength="100"
          stroke-dashoffset=${t}></circle>
      </svg>
    `}renderIndeterminateContainer(){return d` <div class="spinner">
      <div class="left">
        <div class="circle"></div>
      </div>
      <div class="right">
        <div class="circle"></div>
      </div>
    </div>`}}/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const fo=E`:host{--_active-indicator-color: var(--md-circular-progress-active-indicator-color, var(--md-sys-color-primary, #6750a4));--_active-indicator-width: var(--md-circular-progress-active-indicator-width, 10);--_four-color-active-indicator-four-color: var(--md-circular-progress-four-color-active-indicator-four-color, var(--md-sys-color-tertiary-container, #ffd8e4));--_four-color-active-indicator-one-color: var(--md-circular-progress-four-color-active-indicator-one-color, var(--md-sys-color-primary, #6750a4));--_four-color-active-indicator-three-color: var(--md-circular-progress-four-color-active-indicator-three-color, var(--md-sys-color-tertiary, #7d5260));--_four-color-active-indicator-two-color: var(--md-circular-progress-four-color-active-indicator-two-color, var(--md-sys-color-primary-container, #eaddff));--_size: var(--md-circular-progress-size, 48px);display:inline-flex;vertical-align:middle;width:var(--_size);height:var(--_size);position:relative;align-items:center;justify-content:center;contain:strict;content-visibility:auto}.progress{flex:1;align-self:stretch;margin:4px}.progress,.spinner,.left,.right,.circle,svg,.track,.active-track{position:absolute;inset:0}svg{transform:rotate(-90deg)}circle{cx:50%;cy:50%;r:calc(50%*(1 - var(--_active-indicator-width)/100));stroke-width:calc(var(--_active-indicator-width)*1%);stroke-dasharray:100;fill:rgba(0,0,0,0)}.active-track{transition:stroke-dashoffset 500ms cubic-bezier(0, 0, 0.2, 1);stroke:var(--_active-indicator-color)}.track{stroke:rgba(0,0,0,0)}.progress.indeterminate{animation:linear infinite linear-rotate;animation-duration:1568.2352941176ms}.spinner{animation:infinite both rotate-arc;animation-duration:5332ms;animation-timing-function:cubic-bezier(0.4, 0, 0.2, 1)}.left{overflow:hidden;inset:0 50% 0 0}.right{overflow:hidden;inset:0 0 0 50%}.circle{box-sizing:border-box;border-radius:50%;border:solid calc(var(--_active-indicator-width)/100*(var(--_size) - 8px));border-color:var(--_active-indicator-color) var(--_active-indicator-color) rgba(0,0,0,0) rgba(0,0,0,0);animation:expand-arc;animation-iteration-count:infinite;animation-fill-mode:both;animation-duration:1333ms,5332ms;animation-timing-function:cubic-bezier(0.4, 0, 0.2, 1)}.four-color .circle{animation-name:expand-arc,four-color}.left .circle{rotate:135deg;inset:0 -100% 0 0}.right .circle{rotate:100deg;inset:0 0 0 -100%;animation-delay:-666.5ms,0ms}@media(forced-colors: active){.active-track{stroke:CanvasText}.circle{border-color:CanvasText CanvasText Canvas Canvas}}@keyframes expand-arc{0%{transform:rotate(265deg)}50%{transform:rotate(130deg)}100%{transform:rotate(265deg)}}@keyframes rotate-arc{12.5%{transform:rotate(135deg)}25%{transform:rotate(270deg)}37.5%{transform:rotate(405deg)}50%{transform:rotate(540deg)}62.5%{transform:rotate(675deg)}75%{transform:rotate(810deg)}87.5%{transform:rotate(945deg)}100%{transform:rotate(1080deg)}}@keyframes linear-rotate{to{transform:rotate(360deg)}}@keyframes four-color{0%{border-top-color:var(--_four-color-active-indicator-one-color);border-right-color:var(--_four-color-active-indicator-one-color)}15%{border-top-color:var(--_four-color-active-indicator-one-color);border-right-color:var(--_four-color-active-indicator-one-color)}25%{border-top-color:var(--_four-color-active-indicator-two-color);border-right-color:var(--_four-color-active-indicator-two-color)}40%{border-top-color:var(--_four-color-active-indicator-two-color);border-right-color:var(--_four-color-active-indicator-two-color)}50%{border-top-color:var(--_four-color-active-indicator-three-color);border-right-color:var(--_four-color-active-indicator-three-color)}65%{border-top-color:var(--_four-color-active-indicator-three-color);border-right-color:var(--_four-color-active-indicator-three-color)}75%{border-top-color:var(--_four-color-active-indicator-four-color);border-right-color:var(--_four-color-active-indicator-four-color)}90%{border-top-color:var(--_four-color-active-indicator-four-color);border-right-color:var(--_four-color-active-indicator-four-color)}100%{border-top-color:var(--_four-color-active-indicator-one-color);border-right-color:var(--_four-color-active-indicator-one-color)}}
`;/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */let Ke=class extends go{};Ke.styles=[fo];Ke=$e([ae("md-circular-progress")],Ke);/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const yo=E`@layer{.md-typescale-display-small,.md-typescale-display-small-prominent{font:var(--md-sys-typescale-display-small-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-display-small-size, 2.25rem)/var(--md-sys-typescale-display-small-line-height, 2.75rem) var(--md-sys-typescale-display-small-font, var(--md-ref-typeface-brand, Roboto))}.md-typescale-display-medium,.md-typescale-display-medium-prominent{font:var(--md-sys-typescale-display-medium-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-display-medium-size, 2.8125rem)/var(--md-sys-typescale-display-medium-line-height, 3.25rem) var(--md-sys-typescale-display-medium-font, var(--md-ref-typeface-brand, Roboto))}.md-typescale-display-large,.md-typescale-display-large-prominent{font:var(--md-sys-typescale-display-large-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-display-large-size, 3.5625rem)/var(--md-sys-typescale-display-large-line-height, 4rem) var(--md-sys-typescale-display-large-font, var(--md-ref-typeface-brand, Roboto))}.md-typescale-headline-small,.md-typescale-headline-small-prominent{font:var(--md-sys-typescale-headline-small-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-headline-small-size, 1.5rem)/var(--md-sys-typescale-headline-small-line-height, 2rem) var(--md-sys-typescale-headline-small-font, var(--md-ref-typeface-brand, Roboto))}.md-typescale-headline-medium,.md-typescale-headline-medium-prominent{font:var(--md-sys-typescale-headline-medium-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-headline-medium-size, 1.75rem)/var(--md-sys-typescale-headline-medium-line-height, 2.25rem) var(--md-sys-typescale-headline-medium-font, var(--md-ref-typeface-brand, Roboto))}.md-typescale-headline-large,.md-typescale-headline-large-prominent{font:var(--md-sys-typescale-headline-large-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-headline-large-size, 2rem)/var(--md-sys-typescale-headline-large-line-height, 2.5rem) var(--md-sys-typescale-headline-large-font, var(--md-ref-typeface-brand, Roboto))}.md-typescale-title-small,.md-typescale-title-small-prominent{font:var(--md-sys-typescale-title-small-weight, var(--md-ref-typeface-weight-medium, 500)) var(--md-sys-typescale-title-small-size, 0.875rem)/var(--md-sys-typescale-title-small-line-height, 1.25rem) var(--md-sys-typescale-title-small-font, var(--md-ref-typeface-plain, Roboto))}.md-typescale-title-medium,.md-typescale-title-medium-prominent{font:var(--md-sys-typescale-title-medium-weight, var(--md-ref-typeface-weight-medium, 500)) var(--md-sys-typescale-title-medium-size, 1rem)/var(--md-sys-typescale-title-medium-line-height, 1.5rem) var(--md-sys-typescale-title-medium-font, var(--md-ref-typeface-plain, Roboto))}.md-typescale-title-large,.md-typescale-title-large-prominent{font:var(--md-sys-typescale-title-large-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-title-large-size, 1.375rem)/var(--md-sys-typescale-title-large-line-height, 1.75rem) var(--md-sys-typescale-title-large-font, var(--md-ref-typeface-brand, Roboto))}.md-typescale-body-small,.md-typescale-body-small-prominent{font:var(--md-sys-typescale-body-small-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-body-small-size, 0.75rem)/var(--md-sys-typescale-body-small-line-height, 1rem) var(--md-sys-typescale-body-small-font, var(--md-ref-typeface-plain, Roboto))}.md-typescale-body-medium,.md-typescale-body-medium-prominent{font:var(--md-sys-typescale-body-medium-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-body-medium-size, 0.875rem)/var(--md-sys-typescale-body-medium-line-height, 1.25rem) var(--md-sys-typescale-body-medium-font, var(--md-ref-typeface-plain, Roboto))}.md-typescale-body-large,.md-typescale-body-large-prominent{font:var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-body-large-size, 1rem)/var(--md-sys-typescale-body-large-line-height, 1.5rem) var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto))}.md-typescale-label-small,.md-typescale-label-small-prominent{font:var(--md-sys-typescale-label-small-weight, var(--md-ref-typeface-weight-medium, 500)) var(--md-sys-typescale-label-small-size, 0.6875rem)/var(--md-sys-typescale-label-small-line-height, 1rem) var(--md-sys-typescale-label-small-font, var(--md-ref-typeface-plain, Roboto))}.md-typescale-label-medium,.md-typescale-label-medium-prominent{font:var(--md-sys-typescale-label-medium-weight, var(--md-ref-typeface-weight-medium, 500)) var(--md-sys-typescale-label-medium-size, 0.75rem)/var(--md-sys-typescale-label-medium-line-height, 1rem) var(--md-sys-typescale-label-medium-font, var(--md-ref-typeface-plain, Roboto))}.md-typescale-label-medium-prominent{font-weight:var(--md-sys-typescale-label-medium-weight-prominent, var(--md-ref-typeface-weight-bold, 700))}.md-typescale-label-large,.md-typescale-label-large-prominent{font:var(--md-sys-typescale-label-large-weight, var(--md-ref-typeface-weight-medium, 500)) var(--md-sys-typescale-label-large-size, 0.875rem)/var(--md-sys-typescale-label-large-line-height, 1.25rem) var(--md-sys-typescale-label-large-font, var(--md-ref-typeface-plain, Roboto))}.md-typescale-label-large-prominent{font-weight:var(--md-sys-typescale-label-large-weight-prominent, var(--md-ref-typeface-weight-bold, 700))}}
`,bo=`
  :root {
    color-scheme: dark;

    /* ── M3 tokens · dark (orange/tan) ───────────────────────────── */
    --md-sys-color-primary: #FFB77C;
    --md-sys-color-on-primary: #4E2600;
    --md-sys-color-primary-container: #6F3A0C;
    --md-sys-color-on-primary-container: #FFDCC2;
    --md-sys-color-secondary: #E4C0A4;
    --md-sys-color-on-secondary: #422B18;
    --md-sys-color-secondary-container: #5B412C;
    --md-sys-color-on-secondary-container: #FFDCC2;
    --md-sys-color-tertiary: #D2C78C;
    --md-sys-color-on-tertiary: #383010;

    --md-sys-color-surface: #191410;
    --md-sys-color-surface-dim: #191410;
    --md-sys-color-surface-bright: #413A34;
    --md-sys-color-surface-container-lowest: #130F0B;
    --md-sys-color-surface-container-low: #211B15;
    --md-sys-color-surface-container: #251F19;
    --md-sys-color-surface-container-high: #302A23;
    --md-sys-color-surface-container-highest: #3B342D;

    --md-sys-color-on-surface: #EFE0D5;
    --md-sys-color-on-surface-variant: #D7C3B4;
    --md-sys-color-outline: #9F8C7E;
    --md-sys-color-outline-variant: #52453A;
    --md-sys-color-error: #FFB4AB;
    --md-sys-color-on-error: #690005;
    --md-sys-color-background: #191410;
    --md-sys-color-on-background: #EFE0D5;
    --md-icon-font: 'Material Symbols Rounded';

    /* ── Raw shell palette (parallel to the M3 tokens above) ─────── */
    --oppai-bg: #191410;
    --oppai-nav: #211B15;
    --oppai-nav-hover: #2C2620;
    --oppai-surface: #251F19;
    --oppai-surface-2: #302A23;
    --oppai-accent: #5B412C;
    --oppai-on-accent: #FFDCC2;
    --oppai-primary: #FFB77C;
    --oppai-primary-bright: #FFD3B0;
    --oppai-primary-container: #6F3A0C;
    --oppai-on-primary: #4E2600;
    --oppai-text: #EFE0D5;
    --oppai-text-dim: #D7C3B4;
    --oppai-text-muted: #A8917F;
    --oppai-border: #2C2620;
    --oppai-border-strong: #52453A;
    --oppai-fav: #FFB4AB;
    --oppai-scrim: rgba(0, 0, 0, 0.55);

    /* Motion — Material 3 easing sets */
    --oppai-ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
    --oppai-ease-standard: cubic-bezier(0.2, 0, 0, 1);
    --oppai-ease-spring: cubic-bezier(0.34, 1.4, 0.64, 1);

    --oppai-radius: 16px;
    font-family: "Roboto", system-ui, -apple-system, sans-serif;
  }

  :root[data-theme="light"] {
    color-scheme: light;

    /* ── M3 tokens · light (orange/tan) ──────────────────────────── */
    --md-sys-color-primary: #8F4C00;
    --md-sys-color-on-primary: #FFFFFF;
    --md-sys-color-primary-container: #FFDCC2;
    --md-sys-color-on-primary-container: #2E1500;
    --md-sys-color-secondary: #755847;
    --md-sys-color-on-secondary: #FFFFFF;
    --md-sys-color-secondary-container: #FFDCC2;
    --md-sys-color-on-secondary-container: #2A1707;
    --md-sys-color-tertiary: #6A5F30;

    --md-sys-color-surface: #FFF8F4;
    --md-sys-color-surface-dim: #E8D7CC;
    --md-sys-color-surface-bright: #FFF8F4;
    --md-sys-color-surface-container-lowest: #FFFFFF;
    --md-sys-color-surface-container-low: #FEF1E8;
    --md-sys-color-surface-container: #F8EBE1;
    --md-sys-color-surface-container-high: #F2E5DB;
    --md-sys-color-surface-container-highest: #ECE0D6;

    --md-sys-color-on-surface: #211A14;
    --md-sys-color-on-surface-variant: #52453A;
    --md-sys-color-outline: #857567;
    --md-sys-color-outline-variant: #D8C3B4;
    --md-sys-color-error: #BA1A1A;
    --md-sys-color-background: #FFF8F4;
    --md-sys-color-on-background: #211A14;

    /* ── Raw shell palette · light ───────────────────────────────── */
    --oppai-bg: #FFF8F4;
    --oppai-nav: #FEF1E8;
    --oppai-nav-hover: #F2E5DB;
    --oppai-surface: #F8EBE1;
    --oppai-surface-2: #F2E5DB;
    --oppai-accent: #FFDCC2;
    --oppai-on-accent: #2A1707;
    --oppai-primary: #8F4C00;
    --oppai-primary-bright: #8F4C00;
    --oppai-primary-container: #FFDCC2;
    --oppai-on-primary: #FFFFFF;
    --oppai-text: #211A14;
    --oppai-text-dim: #52453A;
    --oppai-text-muted: #857567;
    --oppai-border: #EADBCF;
    --oppai-border-strong: #D8C3B4;
    --oppai-fav: #BA1A1A;
    --oppai-scrim: rgba(60, 40, 24, 0.32);
  }

  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body {
    background: var(--md-sys-color-background);
    color: var(--md-sys-color-on-surface);
    font-family: "Roboto", system-ui, -apple-system, sans-serif;
    transition: background 0.3s var(--oppai-ease-standard), color 0.3s var(--oppai-ease-standard);
  }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: var(--oppai-border-strong); border-radius: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
`,lt=E`
  .material-symbols-rounded {
    font-family: "Material Symbols Rounded";
    font-weight: normal;
    font-style: normal;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    font-feature-settings: "liga";
    -webkit-font-smoothing: antialiased;
    user-select: none;
  }
  /* The filled weight is its own face, not an axis sweep. It was written as
     font-variation-settings, which never did anything: the font the page loaded
     was pinned to FILL 0 and carried no axis to move, so a filled star rendered
     outlined. Switching families is what actually fills it. */
  .fill-icon {
    font-family: "Material Symbols Rounded Fill";
  }
`,dt=E`
  @keyframes oppai-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes oppai-fade-in-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes oppai-scale-in {
    from { opacity: 0; transform: scale(0.94) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes oppai-pop {
    0% { transform: scale(1); }
    40% { transform: scale(1.28); }
    100% { transform: scale(1); }
  }
  /* Exits. Faster than the matching entrance on purpose: an entrance is the interface
     arriving and can afford to be seen, while an exit is time between the user asking
     for something and getting it. */
  @keyframes oppai-fade-out {
    to { opacity: 0; }
  }
  @keyframes oppai-scale-out {
    to { opacity: 0; transform: scale(0.97) translateY(4px); }
  }
  @keyframes oppai-slide-out-down {
    to { opacity: 0; transform: translateY(10px); }
  }
  /* Arrival: a new message or tile. Transform and opacity only — animating height or
     margin would reflow everything below it on every frame. */
  @keyframes oppai-arrive {
    from { opacity: 0; transform: translateY(8px) scale(0.995); }
    to { opacity: 1; transform: none; }
  }

  .anim-fade { animation: oppai-fade-in 0.28s var(--oppai-ease-standard) both; }
  .anim-rise { animation: oppai-fade-in-up 0.42s var(--oppai-ease-emphasized) both; }
  .anim-pop { animation: oppai-scale-in 0.32s var(--oppai-ease-spring) both; }
  .anim-arrive { animation: oppai-arrive 0.26s var(--oppai-ease-emphasized) both; }
  /* Applied by motion.ts's playExit, which awaits it before the element is removed. */
  .anim-exit { animation: oppai-scale-out 0.16s var(--oppai-ease-standard) forwards; }
  .anim-exit-fade { animation: oppai-fade-out 0.16s var(--oppai-ease-standard) forwards; }
  .anim-exit-down { animation: oppai-slide-out-down 0.18s var(--oppai-ease-standard) forwards; }

  /* Collapse and expand, without measuring anything.
     A 0fr→1fr grid row animates the same effect as a height transition with no JS, no
     forced layout per frame, and no need to know the content's size in advance. The
     inner element needs min-height:0 or it refuses to shrink below its content. */
  .collapsible {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.24s var(--oppai-ease-emphasized);
  }
  .collapsible > * {
    overflow: hidden;
    min-height: 0;
  }
  .collapsible.open {
    grid-template-rows: 1fr;
  }

  /* Reduced motion is a request for no motion, not less of it — so this removes
     animation and transition outright rather than shortening them. The collapsible has
     to be pinned open/closed instantly rather than left mid-transition. */
  @media (prefers-reduced-motion: reduce) {
    *, .anim-fade, .anim-rise, .anim-pop, .anim-arrive,
    .anim-exit, .anim-exit-fade, .anim-exit-down, .collapsible {
      animation: none !important;
      transition: none !important;
    }
  }
`,ci="oppai_theme";function Ae(){const e=localStorage.getItem(ci);return e==="light"||e==="dark"||e==="system"?e:"dark"}function vo(e){try{localStorage.setItem(ci,e)}catch{}}function ct(e){const t=e==="light"||e==="system"&&window.matchMedia("(prefers-color-scheme: light)").matches;document.documentElement.dataset.theme=t?"light":""}function wo(){window.matchMedia("(prefers-color-scheme: light)").addEventListener("change",()=>{Ae()==="system"&&ct("system")})}E`
  .card {
    background: var(--md-sys-color-surface-container);
    border-radius: var(--oppai-radius);
    overflow: hidden;
  }
`;const xo="modulepreload",$o=function(e,t){return new URL(e,t).href},Pt={},G=function(t,i,o){let a=Promise.resolve();if(i&&i.length>0){let r=function(p){return Promise.all(p.map(m=>Promise.resolve(m).then(y=>({status:"fulfilled",value:y}),y=>({status:"rejected",reason:y}))))};const l=document.getElementsByTagName("link"),c=document.querySelector("meta[property=csp-nonce]"),h=(c==null?void 0:c.nonce)||(c==null?void 0:c.getAttribute("nonce"));a=r(i.map(p=>{if(p=$o(p,o),p in Pt)return;Pt[p]=!0;const m=p.endsWith(".css"),y=m?'[rel="stylesheet"]':"";if(!!o)for(let T=l.length-1;T>=0;T--){const P=l[T];if(P.href===p&&(!m||P.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${p}"]${y}`))return;const b=document.createElement("link");if(b.rel=m?"stylesheet":xo,m||(b.as="script"),b.crossOrigin="",b.href=p,h&&b.setAttribute("nonce",h),document.head.appendChild(b),m)return new Promise((T,P)=>{b.addEventListener("load",T),b.addEventListener("error",()=>P(new Error(`Unable to preload CSS for ${p}`)))})}))}function s(r){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=r,window.dispatchEvent(l),!l.defaultPrevented)throw r}return a.then(r=>{for(const l of r||[])l.status==="rejected"&&s(l.reason);return t().catch(s)})};/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ns=e=>e.strings===void 0,ko={},So=(e,t=ko)=>e._$AH=t;/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const hi=ri(class extends ni{constructor(){super(...arguments),this.key=u}render(e,t){return this.key=e,t}update(e,[t,i]){return t!==this.key&&(So(e),this.key=t),i}}),ee=60,Fs=[{value:-1,label:"Never",hint:"Kept, but never sent."},{value:.35,label:"Rarely",hint:"Sent now and then."},{value:1,label:"Normal",hint:"The usual odds."},{value:2.5,label:"Often",hint:"Reached for first."}],zs="profile",Ve="oppai_token";function ge(){return localStorage.getItem(Ve)}function Xe(e){e?localStorage.setItem(Ve,e):localStorage.removeItem(Ve)}function x(e,t="error",i={}){window.dispatchEvent(new CustomEvent("oppai-mascot",{detail:{message:e,tone:t,...i}}))}const Ce=new Map;async function n(e,t={},i=0){const a=(t.method??"GET").toUpperCase()==="GET"&&!t.body&&!t.signal;if(a){const r=Ce.get(e);if(r)return r}const s=Io(e,t,i);return a&&(Ce.set(e,s),s.catch(()=>{}).finally(()=>{Ce.get(e)===s&&Ce.delete(e)})),s}async function Io(e,t={},i=0){const o=new Headers(t.headers),a=ge();a&&o.set("Authorization",`Bearer ${a}`),t.body&&!(t.body instanceof FormData)&&o.set("Content-Type","application/json");const s=new AbortController,r=t.signal;r&&(r.aborted?s.abort(r.reason):r.addEventListener("abort",()=>s.abort(r.reason),{once:!0}));const l=i>0?setTimeout(()=>s.abort(new DOMException("timeout","TimeoutError")),i):null,c=()=>{var h;return s.signal.aborted&&((h=s.signal.reason)==null?void 0:h.name)==="TimeoutError"};try{const h=await fetch(e,{...t,headers:o,signal:s.signal});if(h.status===401)throw e!=="/api/auth/login"&&(Xe(null),window.dispatchEvent(new CustomEvent("oppai-logout")),x("Your session ended. Please sign in again.")),new Error("unauthorized");if(!h.ok){let p=h.statusText;try{const m=await h.json();m!=null&&m.error&&(p=m.error)}catch{}throw new Error(p)}return h.status===204?void 0:await h.json()}catch(h){if(c()){const p=new Error("Timed out — the site was too slow or unreachable.");throw e!=="/api/auth/login"&&x(p.message),p}throw s.signal.aborted?new DOMException("cancelled","AbortError"):(e!=="/api/auth/login"&&h instanceof Error&&h.message!=="unauthorized"&&h.message!=="generation cancelled"&&x(h.message||"Something went wrong."),h)}finally{l&&clearTimeout(l)}}const g={health:()=>n("/api/health"),login:(e,t)=>n("/api/auth/login",{method:"POST",body:JSON.stringify({username:e,password:t,client:"web"})}),me:()=>n("/api/auth/me"),logout:()=>n("/api/auth/logout",{method:"POST"}),beginPasskeyLogin:e=>n("/api/auth/passkey/login/begin",{method:"POST",body:JSON.stringify(e?{username:e}:{})}),finishPasskeyLogin:(e,t)=>n("/api/auth/passkey/login/finish",{method:"POST",body:JSON.stringify({ceremony:e,credential:t,client:"web"})}),passkeys:()=>n("/api/auth/passkeys"),beginPasskeyRegistration:()=>n("/api/auth/passkeys/begin",{method:"POST"}),finishPasskeyRegistration:(e,t,i)=>n("/api/auth/passkeys/finish",{method:"POST",body:JSON.stringify({ceremony:e,name:t,credential:i})}),renamePasskey:(e,t)=>n(`/api/auth/passkeys/${e}`,{method:"PATCH",body:JSON.stringify({name:t})}),revokePasskey:(e,t)=>n(`/api/auth/passkeys/${e}/revoke`,{method:"POST",body:JSON.stringify({password:t})}),listMedia:(e={})=>{var i;const t=new URLSearchParams;return e.kind&&t.set("kind",e.kind),(i=e.q)!=null&&i.trim()&&t.set("q",e.q.trim()),e.tag&&t.set("tag",e.tag),e.favorite&&t.set("favorite","1"),e.sort&&e.sort!=="newest"&&t.set("sort",e.sort),t.set("limit",String(e.limit??ee)),t.set("offset",String(e.offset??0)),n(`/api/media?${t}`,{signal:e.signal})},libraryStats:e=>n("/api/media/stats",{signal:e}),topTags:(e="",t=12,i)=>{const o=new URLSearchParams;return e&&o.set("kind",e),o.set("limit",String(t)),n(`/api/tags/top?${o}`,{signal:i})},listCollections:e=>n("/api/collections",{signal:e}),createCollection:e=>n("/api/collections",{method:"POST",body:JSON.stringify({name:e})}),renameCollection:(e,t)=>n(`/api/collections/${e}`,{method:"PATCH",body:JSON.stringify({name:t})}),deleteCollection:e=>n(`/api/collections/${e}`,{method:"DELETE"}),collectionItems:(e,t=ee,i=0,o)=>{const a=new URLSearchParams({limit:String(t),offset:String(i)});return n(`/api/collections/${e}/items?${a}`,{signal:o})},addToCollection:(e,t)=>n(`/api/collections/${e}/items`,{method:"POST",body:JSON.stringify({mediaIds:t})}),removeFromCollection:(e,t)=>n(`/api/collections/${e}/items/${t}`,{method:"DELETE"}),reorderCollection:(e,t)=>n(`/api/collections/${e}/order`,{method:"PUT",body:JSON.stringify({mediaIds:t})}),collectionsOf:(e,t)=>n(`/api/media/${e}/collections`,{signal:t}),getProgress:(e,t)=>n(`/api/media/${e}/progress`,{signal:t}),setProgress:(e,t)=>n(`/api/media/${e}/progress`,{method:"PUT",body:JSON.stringify({position:t})}),clearProgress:e=>n(`/api/media/${e}/progress`,{method:"DELETE"}),resumeShelf:e=>n("/api/resume",{signal:e}),getMedia:e=>n(`/api/media/${e}`),streamURL:e=>`/api/media/${e}/stream`,thumbURL:e=>`/api/media/${e}/thumb`,proxyURL:e=>`/api/scrape/proxy?url=${encodeURIComponent(e)}`,upload:(e,t)=>{const i=new FormData;return i.append("file",e),t&&i.append("title",t),n("/api/media",{method:"POST",body:i})},listUploadSessions:()=>n("/api/uploads"),createUploadSession:e=>n("/api/uploads",{method:"POST",body:JSON.stringify(e)}),uploadSession:e=>n(`/api/uploads/${e}`),completeUploadSession:(e,t)=>n(`/api/uploads/${e}/complete`,{method:"POST",body:JSON.stringify(t?{sha256:t}:{})}),cancelUploadSession:e=>n(`/api/uploads/${e}`,{method:"DELETE"}),storage:()=>n("/api/storage"),cleanupStorage:e=>n("/api/storage/cleanup",{method:"POST",body:JSON.stringify({categories:e})}),autotag:e=>n(`/api/media/${e}/autotag`,{method:"POST"}),scanImage:e=>n("/api/ai/scan-image",{method:"POST",body:JSON.stringify({imageData:e})},6e4),comicInfo:e=>n(`/api/media/${e}/comic`),pageURL:(e,t)=>`/api/media/${e}/page/${t}`,getSettings:()=>n("/api/settings"),saveSettings:e=>n("/api/settings",{method:"PUT",body:JSON.stringify(e)}),stats:()=>n("/api/stats"),diagnostics:()=>n("/api/diagnostics"),resetDiagnostics:()=>n("/api/diagnostics/reset",{method:"POST"}),changePassword:(e,t)=>n("/api/auth/password",{method:"POST",body:JSON.stringify({current:e,new:t})}),updateMedia:(e,t)=>n(`/api/media/${e}`,{method:"PATCH",body:JSON.stringify(t)}),deleteMedia:e=>n(`/api/media/${e}`,{method:"DELETE"}),bulkMedia:(e,t,i)=>n("/api/media/bulk",{method:"POST",body:JSON.stringify({action:e,ids:t,patch:i??{}})}),scrape:e=>n("/api/scrape",{method:"POST",body:JSON.stringify({url:e})},45e3),scrapeBulk:e=>n("/api/scrape/bulk",{method:"POST",body:JSON.stringify({urls:e})},75e3),scrapeImport:e=>n("/api/scrape/import",{method:"POST",body:JSON.stringify(e)}),apkInfo:()=>n("/api/apk/info"),sources:(e=!1)=>n("/api/sources",e?{cache:"reload"}:void 0),sourceIconURL:e=>`/api/sources/${encodeURIComponent(e)}/icon`,analyzeSource:e=>n("/api/sources/analyze",{method:"POST",body:JSON.stringify({url:e})},6e4),saveSource:e=>n("/api/sources",{method:"POST",body:JSON.stringify({yaml:e})}),deleteSource:e=>n(`/api/sources/${encodeURIComponent(e)}`,{method:"DELETE"}),browseSource:(e,t={})=>{const i=new URLSearchParams;return t.feed&&i.set("feed",t.feed),t.cursor&&i.set("cursor",t.cursor),t.q&&i.set("q",t.q),t.sort&&i.set("sort",t.sort),n(`/api/sources/${e}/browse?${i}`,{},45e3)},sourcePages:(e,t)=>n(`/api/sources/${encodeURIComponent(e)}/item/${encodeURIComponent(t)}/pages`,{},45e3),sourceComments:(e,t)=>n(`/api/sources/${encodeURIComponent(e)}/item/${encodeURIComponent(t)}/comments`,{},45e3),sourceStreamURL:e=>`/api/sources/stream?url=${encodeURIComponent(e)}`,saveFromSource:(e,t)=>n(`/api/sources/${encodeURIComponent(e)}/save`,{method:"POST",body:JSON.stringify(t)},15*6e4),imageGenStatus:()=>n("/api/imagegen/status",{},12e3),booruTags:e=>n(`/api/imagegen/tags?q=${encodeURIComponent(e)}`),gameGallery:e=>n(`/api/media/${e}/gallery`),uploadGameGallery:(e,t)=>{const i=new FormData;return i.append("file",t),n(`/api/media/${e}/gallery`,{method:"POST",body:i})},removeGameGallery:(e,t)=>n(`/api/media/${e}/gallery/${t}`,{method:"DELETE"}),gameSaves:e=>n(`/api/media/${e}/saves`),uploadGameSave:(e,t,i)=>{const o=new FormData;return o.append("file",t),i!=null&&i.trim()&&o.append("label",i.trim()),n(`/api/media/${e}/saves`,{method:"POST",body:o})},deleteGameSave:(e,t)=>n(`/api/media/${e}/saves/${t}`,{method:"DELETE"}),gameSaveURL:(e,t)=>`/api/media/${e}/saves/${t}`,gamePlayInfo:e=>n(`/api/media/${e}/play`),gamePlayURL:e=>`/api/media/${e}/play/`,optimizePrompt:e=>n("/api/imagegen/prompt",{method:"POST",body:JSON.stringify({text:e})}),generate:e=>n("/api/imagegen/generate",{method:"POST",body:JSON.stringify(e)},10*6e4),genProgress:(e,t)=>n(`/api/imagegen/progress/${encodeURIComponent(e)}?seen=${t}`,{},1e4),cancelGenerate:e=>n(`/api/imagegen/cancel/${encodeURIComponent(e)}`,{method:"POST"},1e4),genPreviewURL:e=>`/api/imagegen/preview/${encodeURIComponent(e)}`,replaceGenPreview:(e,t)=>n(`/api/imagegen/preview/${encodeURIComponent(e)}`,{method:"PUT",body:JSON.stringify({imageData:t})}),deleteGenPreview:e=>n(`/api/imagegen/preview/${encodeURIComponent(e)}`,{method:"DELETE"}),saveGenerated:e=>n("/api/imagegen/save",{method:"POST",body:JSON.stringify(e)}),modelThumbURL:e=>`/api/imagegen/model-thumb?model=${encodeURIComponent(e)}`,setModelThumb:e=>n("/api/imagegen/model-thumb",{method:"PUT",body:JSON.stringify(e)}),chatStatus:()=>n("/api/chat/status",{},12e3),chat:e=>n("/api/chat",{method:"POST",body:JSON.stringify({emotion:"neutral",intensity:1,characterId:"libby",...e})},125e3),chatWorkspace:()=>n("/api/chat/workspace",{},3e4),chatModels:()=>n("/api/chat/models",{},2e4),loadChatModel:(e,t={},i={},o=!0)=>n("/api/chat/models/load",{method:"POST",body:JSON.stringify({modelName:e,args:t,settings:i,remember:o})},10*6e4),unloadChatModel:()=>n("/api/chat/models/unload",{method:"POST"},13e4),downloadTTSVoice:e=>n("/api/tts/voices/download",{method:"POST",body:JSON.stringify({id:e})},2e4),deleteTTSVoice:e=>n(`/api/tts/voices/${encodeURIComponent(e)}`,{method:"DELETE"},2e4),ttsVoiceErrors:()=>n("/api/tts/voices/errors",{},1e4),chatBackendInfo:()=>n("/api/chat/backend",{},2e4),setChatLoras:e=>n("/api/chat/loras",{method:"POST",body:JSON.stringify({names:e})},5*6e4),stopChat:()=>n("/api/chat/stop",{method:"POST"},12e3),countChatTokens:e=>n("/api/chat/tokens",{method:"POST",body:JSON.stringify({text:e})},2e4),inspectChatModel:e=>n(`/api/chat/models/inspect?model=${encodeURIComponent(e)}`,{},3e4),deleteChatModel:(e,t,i=!1)=>n("/api/chat/models/delete",{method:"POST",body:JSON.stringify({model:e,confirm:t,permanent:i})},12e4),saveChatWorkspace:e=>n("/api/chat/workspace",{method:"PUT",body:JSON.stringify(e)},3e4),uploadChatImage:e=>n("/api/chat/images",{method:"POST",body:JSON.stringify(e)},12e4),deleteChatImage:e=>n(`/api/chat/images/${encodeURIComponent(e)}`,{method:"DELETE"}),chatImageURL:e=>`/api/chat/images/${encodeURIComponent(e)}`,loraThumbURL:e=>`/api/imagegen/lora-thumb?name=${encodeURIComponent(e)}`,characters:()=>n("/api/imagegen/characters"),saveCharacter:e=>n("/api/imagegen/characters",{method:"POST",body:JSON.stringify(e)}),deleteCharacter:e=>n(`/api/imagegen/characters/${encodeURIComponent(e)}`,{method:"DELETE"}),characterThumbURL:e=>`/api/imagegen/characters/${encodeURIComponent(e)}/thumb`,poses:()=>n("/api/imagegen/poses"),savePose:e=>n("/api/imagegen/poses",{method:"POST",body:JSON.stringify(e)}),deletePose:e=>n(`/api/imagegen/poses/${encodeURIComponent(e)}`,{method:"DELETE"}),poseThumbURL:e=>`/api/imagegen/poses/${encodeURIComponent(e)}/thumb`,wildcards:()=>n("/api/imagegen/wildcards"),saveWildcard:e=>n("/api/imagegen/wildcards",{method:"POST",body:JSON.stringify(e)}),deleteWildcard:e=>n(`/api/imagegen/wildcards/${encodeURIComponent(e)}`,{method:"DELETE"}),mediaGeneration:e=>n(`/api/media/${e}/generation`,{},15e3),libbySend:e=>n("/api/libby/send",{method:"POST",body:JSON.stringify(e)}),modelMeta:e=>n(`/api/imagegen/model?name=${encodeURIComponent(e)}`,{},2e4),patchModelMeta:e=>n("/api/imagegen/model",{method:"PATCH",body:JSON.stringify(e)},25e3),galleryBoards:()=>n("/api/imagegen/gallery/boards",{},2e4),createGalleryBoard:e=>n("/api/imagegen/gallery/boards",{method:"POST",body:JSON.stringify({name:e})},2e4),deleteGalleryBoard:e=>n(`/api/imagegen/gallery/boards/${encodeURIComponent(e)}`,{method:"DELETE"},2e4),galleryImages:(e,t=0,i=60)=>n(`/api/imagegen/gallery/images?board=${encodeURIComponent(e)}&offset=${t}&limit=${i}`,{},2e4),galleryThumbURL:e=>`/api/imagegen/gallery/image/${encodeURIComponent(e)}/thumb`,galleryFullURL:e=>`/api/imagegen/gallery/image/${encodeURIComponent(e)}`,galleryImageMetadata:e=>n(`/api/imagegen/gallery/image/${encodeURIComponent(e)}/metadata`,{},2e4),deleteGalleryImage:e=>n(`/api/imagegen/gallery/image/${encodeURIComponent(e)}`,{method:"DELETE"}),deleteGalleryImages:e=>n("/api/imagegen/gallery/delete",{method:"POST",body:JSON.stringify({names:e})},4e4),addGalleryImagesToBoard:(e,t)=>n("/api/imagegen/gallery/board",{method:"POST",body:JSON.stringify({board:e,names:t})},4e4),saveGalleryImage:e=>n("/api/imagegen/gallery/save",{method:"POST",body:JSON.stringify(e)},9e4),civitaiSearch:(e={})=>{const t=new URLSearchParams;return e.q&&t.set("q",e.q),e.type&&t.set("type",e.type),e.category&&t.set("category",e.category),e.sort&&t.set("sort",e.sort),e.cursor&&t.set("cursor",e.cursor),n(`/api/imagegen/civitai/search?${t}`,{},45e3)},civitaiCategories:()=>n("/api/imagegen/civitai/categories",{},3e4),civitaiImageURL:e=>`/api/imagegen/civitai/image?url=${encodeURIComponent(e)}`,civitaiInstall:e=>n("/api/imagegen/civitai/install",{method:"POST",body:JSON.stringify({url:e})},3e4),civitaiInstalls:()=>n("/api/imagegen/civitai/installs",{},2e4),libbyContext:()=>n("/api/libby/context",{},15e3),libbyMemory:()=>n("/api/libby/memory",{},15e3),addLibbyMemory:e=>n("/api/libby/memory",{method:"POST",body:JSON.stringify(e)}),updateLibbyMemory:(e,t)=>n(`/api/libby/memory/${encodeURIComponent(e)}`,{method:"PATCH",body:JSON.stringify(t)}),clearLibbyMemory:()=>n("/api/libby/memory",{method:"DELETE"}),forgetLibbyMemory:e=>n(`/api/libby/memory/${encodeURIComponent(e)}`,{method:"DELETE"}),libbyAuto:()=>n("/api/libby/auto",{},15e3),saveLibbyAuto:e=>n("/api/libby/auto",{method:"PUT",body:JSON.stringify(e)}),libbyAutoCheck:e=>n("/api/libby/auto/check",{method:"POST",body:JSON.stringify(e)},1e4),libbyAutoSent:e=>n("/api/libby/auto/sent",{method:"POST",body:JSON.stringify(e)},1e4),libbyAutoAnswered:()=>n("/api/libby/auto/answered",{method:"POST"},1e4),libbyWants:()=>n("/api/libby/wants",{},15e3),clearLibbyWants:()=>n("/api/libby/wants",{method:"DELETE"}),forgetLibbyWant:e=>n(`/api/libby/wants/${encodeURIComponent(e)}`,{method:"DELETE"}),discord:()=>n("/api/discord",{},15e3),connectDiscord:e=>n("/api/discord/connect",{method:"POST",body:JSON.stringify({token:e})},3e4),disconnectDiscord:()=>n("/api/discord/disconnect",{method:"POST"}),saveDiscordSettings:e=>n("/api/discord/settings",{method:"PUT",body:JSON.stringify(e)}),discordPlaces:()=>n("/api/discord/places",{},4e4),discordSay:(e,t)=>n("/api/discord/say",{method:"POST",body:JSON.stringify({channelId:e,text:t})}),libbyLink:e=>n("/api/libby/link",{method:"POST",body:JSON.stringify({url:e})},6e4),libbyIdentity:()=>n("/api/libby/identity",{},15e3),saveLibbyIdentity:e=>n("/api/libby/identity",{method:"PUT",body:JSON.stringify(e)}),markLibbyIdentity:e=>n("/api/libby/identity/mark",{method:"POST",body:JSON.stringify(e)}),scanLibbyIdentity:()=>n("/api/libby/identity/scan",{method:"POST"},12e4),libbyBond:()=>n("/api/libby/bond",{},15e3),resetLibbyBond:()=>n("/api/libby/bond",{method:"DELETE"}),posterFrames:(e,t=20)=>n(`/api/media/${e}/frames?count=${t}`),setPoster:(e,t)=>n(`/api/media/${e}/thumb`,{method:"PUT",body:JSON.stringify({at:t})}),libbyAct:e=>n("/api/libby/act",{method:"POST",body:JSON.stringify({kind:e.kind,prompt:e.prompt,url:e.url,mediaId:e.mediaId,tags:e.tags,title:e.title})}),libbyOutfits:()=>n("/api/libby/outfits"),libbyBackgrounds:()=>n("/api/libby/backgrounds"),setLibbyDefaultBackground:e=>n("/api/libby/backgrounds/default",{method:"PUT",body:JSON.stringify({id:e})}),saveLibbyBackground:e=>n("/api/libby/backgrounds",{method:"POST",body:JSON.stringify(e)}),deleteLibbyBackground:e=>n(`/api/libby/backgrounds/${encodeURIComponent(e)}`,{method:"DELETE"}),setLibbyBackgroundImage:(e,t)=>n(`/api/libby/backgrounds/${encodeURIComponent(e)}/image`,{method:"PUT",body:JSON.stringify({imageData:t})}),libbyBackgroundURL:(e,t)=>`/api/libby/backgrounds/${encodeURIComponent(e)}/image${t?`?v=${t}`:""}`,saveLibbyOutfit:e=>n("/api/libby/outfits",{method:"POST",body:JSON.stringify(e)}),deleteLibbyOutfit:e=>n(`/api/libby/outfits/${encodeURIComponent(e)}`,{method:"DELETE"}),setLibbyEmotion:(e,t,i,o=0)=>n(`/api/libby/outfits/${encodeURIComponent(e)}/emotions/${encodeURIComponent(t)}${o?`?level=${o}`:""}`,{method:"PUT",body:JSON.stringify({imageData:i})}),deleteLibbyEmotion:(e,t,i=0)=>n(`/api/libby/outfits/${encodeURIComponent(e)}/emotions/${encodeURIComponent(t)}${i?`?level=${i}`:""}`,{method:"DELETE"}),libbyEmotionURL:(e,t,i=0,o)=>{const a=[i?`level=${i}`:"",o?`v=${o}`:""].filter(Boolean).join("&");return`/api/libby/outfits/${encodeURIComponent(e)}/emotions/${encodeURIComponent(t)}${a?`?${a}`:""}`},libbyOutfitThumbURL:(e,t)=>`/api/libby/outfits/${encodeURIComponent(e)}/thumb${t?`?v=${t}`:""}`,setLibbyOutfitThumb:(e,t)=>n(`/api/libby/outfits/${encodeURIComponent(e)}/thumb`,{method:"PUT",body:JSON.stringify({imageData:t})}),clearLibbyOutfitThumb:e=>n(`/api/libby/outfits/${encodeURIComponent(e)}/thumb`,{method:"DELETE"}),libbyOutfitWip:e=>n(`/api/libby/outfits/${encodeURIComponent(e)}/wip`),putLibbyOutfitWip:(e,t,i,o)=>n(`/api/libby/outfits/${encodeURIComponent(e)}/wip/${encodeURIComponent(t)}${i?`?level=${i}`:""}`,{method:"PUT",body:JSON.stringify(o)}),deleteLibbyOutfitWip:(e,t,i=0)=>n(`/api/libby/outfits/${encodeURIComponent(e)}/wip/${encodeURIComponent(t)}${i?`?level=${i}`:""}`,{method:"DELETE"}),libbyOutfitWipImageURL:(e,t,i=0,o)=>{const a=[i?`level=${i}`:"",o?`v=${o}`:""].filter(Boolean).join("&");return`/api/libby/outfits/${encodeURIComponent(e)}/wip/${encodeURIComponent(t)}${a?`?${a}`:""}`},libbyLoadouts:()=>n("/api/libby/loadouts"),saveLibbyLoadout:e=>n("/api/libby/loadouts",{method:"POST",body:JSON.stringify({...e,updatedAt:Date.now()})}),deleteLibbyLoadout:e=>n(`/api/libby/loadouts/${encodeURIComponent(e)}`,{method:"DELETE"}),libbyLoadoutThumbURL:(e,t)=>`/api/libby/loadouts/${encodeURIComponent(e)}/thumb${t?`?v=${t}`:""}`,setLibbyLoadoutThumb:(e,t)=>n(`/api/libby/loadouts/${encodeURIComponent(e)}/thumb`,{method:"PUT",body:JSON.stringify({imageData:t})}),clearLibbyLoadoutThumb:e=>n(`/api/libby/loadouts/${encodeURIComponent(e)}/thumb`,{method:"DELETE"})},pi="oppai_hide_libby",Ze="oppai_libby_outfit";function Co(){return localStorage.getItem(pi)==="1"}function Qe(){return Co()}function Bs(e){try{localStorage.setItem(pi,e?"1":"0")}catch{}window.dispatchEvent(new CustomEvent("oppai-libby-pref",{detail:{hidden:e}}))}function ui(){return localStorage.getItem(Ze)??""}function Hs(e){try{e?localStorage.setItem(Ze,e):localStorage.removeItem(Ze)}catch{}window.dispatchEvent(new CustomEvent("oppai-libby-pref",{detail:{outfit:e}}))}const Eo="/Libby_Default/default-libby-pfp.png",To=["calm","warm","flirty","heated","peak"];function Rt(e,t=1){return`/Libby_Default/default-libby-${To[A(t)-1]}-${fe(e)}.png`}function _o(e){return`/Libby_Default/default-libby-misc-${e.trim().toLowerCase()}.png`}const Oo=3;function Ao(e){return Math.min(Oo,A(e))}const mi=["neutral","happy","mischievous","surprised","thinking","shy","smug","sad","annoyed","sleepy","loving","excited"],Lo={neutral:"neutral",happy:"happy",mischievous:"mischievous",surprised:"surprised",thinking:"thinking",shy:"surprised",smug:"mischievous",sad:"thinking",annoyed:"thinking",sleepy:"neutral",loving:"happy",excited:"happy"},Ys={neutral:"Neutral",happy:"Happy",mischievous:"Mischievous",surprised:"Surprised",thinking:"Thinking",shy:"Shy",smug:"Smug",sad:"Sad",annoyed:"Annoyed",sleepy:"Sleepy",loving:"Loving",excited:"Excited"};function fe(e){let t=(e??"").trim().toLowerCase();return t==="default"&&(t="neutral"),t==="worried"&&(t="thinking"),t==="horniness"&&(t="mischievous"),mi.includes(t)?t:"neutral"}function A(e){return Math.max(1,Math.min(5,Math.round(Number(e)||1)))}function Gs(e){const t=e.trim();return t?t.charAt(0).toUpperCase()+t.slice(1):""}function Mo(e,t,i=ui(),o){const a=fe(e),s=A(t),r=[];if(o&&i&&i!=="default"&&r.push(`/api/libby/outfits/${encodeURIComponent(i)}/emotions/${encodeURIComponent(o)}`),o&&r.push(_o(o)),i&&i!=="default")for(const l of[...new Set([a,Lo[a]])]){const c=`/api/libby/outfits/${encodeURIComponent(i)}/emotions/${encodeURIComponent(l)}`;for(let h=s-1;h>=1;h--)r.push(`${c}?level=${h}`);r.push(c)}return r.push(Rt(a,s),Rt("neutral",s)),[...new Set(r)]}function Po(e){const t=e.toLowerCase();return/timed? out|unreachable|network|offline|couldn.t reach|connection/.test(t)?{emotion:"thinking",intensity:4}:/unauthori[sz]ed|session ended|sign in|password|login/.test(t)?{emotion:"thinking",intensity:3}:/invalid|missing|required|not found|doesn.t exist/.test(t)?{emotion:"thinking",intensity:2}:/failed|error|couldn.t|can.t/.test(t)?{emotion:"surprised",intensity:3}:{emotion:"thinking",intensity:2}}function Ro(e,t){const i=Number(e.dataset.fallbackIndex||"0")+1;i>=t.length||(e.dataset.fallbackIndex=String(i),e.src=t[i])}const gi='meta[name="oppai-mode"]';let fi=null;function Uo(){var e;return((e=document.querySelector(gi))==null?void 0:e.getAttribute("content"))==="incognito"}function Le(){return fi??Uo()}function qs(e){fi=e,Do(),window.dispatchEvent(new CustomEvent("oppai-incognito",{detail:{incognito:e}}))}const Ut={incognito:{title:"Nextcloud",icon:"/cloud-icon.svg",theme:"#0082c9",manifest:"/cloud.webmanifest"},plain:{title:"OppaiLib",icon:"/icon.svg",theme:"#191410",manifest:"/manifest.webmanifest"}};function Do(){const e=Le()?Ut.incognito:Ut.plain;document.title=e.title;const t=`?v=${Date.now()}`;for(const s of document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]'))s.type="image/svg+xml",s.removeAttribute("sizes"),s.href=e.icon+t;const i=document.querySelector('link[rel="manifest"]');i&&(i.href=e.manifest);const o=document.querySelector('meta[name="theme-color"]');o&&(o.content=e.theme);let a=document.querySelector(gi);a||(a=document.createElement("meta"),a.name="oppai-mode",document.head.appendChild(a)),a.content=Le()?"incognito":"plain"}const yi=E`
  /* Arrival: she steps in from the side and settles, the way a sprite is placed
     rather than faded up. */
  @keyframes libby-enter {
    0%   { opacity: 0; transform: translate(14px, 8px) scale(0.9); }
    60%  { opacity: 1; transform: translate(0, -2px) scale(1.03); }
    100% { opacity: 1; transform: translate(0, 0) scale(1); }
  }
  /* Idle: two frames of breathing. Deliberately tiny and slow — anything more and
     a static portrait starts to look like it is bobbing in water. */
  @keyframes libby-breathe {
    0%, 100% { transform: translateY(0) scaleY(1); }
    50%      { transform: translateY(-1.5%) scaleY(1.006); }
  }
  /* Speaking: a single rock into the line, as though she leaned in to say it. */
  @keyframes libby-speak {
    0%   { transform: translateY(0) rotate(0deg); }
    25%  { transform: translateY(-4%) rotate(-0.8deg); }
    55%  { transform: translateY(1%) rotate(0.5deg); }
    100% { transform: translateY(0) rotate(0deg); }
  }
  /* Something went wrong: a hard horizontal jolt, no easing at all. */
  @keyframes libby-startle {
    0%, 100% { transform: translateX(0); }
    20%      { transform: translateX(-5px); }
    45%      { transform: translateX(4px); }
    70%      { transform: translateX(-2px); }
  }
  /* A new pose replacing the old one. Paired with lit's keyed(), which swaps the
     element on a mood change so this replays instead of the src mutating silently. */
  @keyframes libby-mood-in {
    from { opacity: 0; transform: scale(1.04); }
    to   { opacity: 1; transform: scale(1); }
  }
  /* The blinking "there is more" marker on a dialogue box. */
  @keyframes libby-caret {
    0%, 49%   { opacity: 1; }
    50%, 100% { opacity: 0; }
  }

  .libby-enter   { animation: libby-enter 0.22s steps(4, end) both; }
  .libby-breathe { animation: libby-breathe 4.2s steps(6, end) infinite; }
  .libby-speak   { animation: libby-speak 0.42s steps(5, end) 1; }
  .libby-startle { animation: libby-startle 0.34s steps(2, end) 2; }
  .libby-mood    { animation: libby-mood-in 0.24s steps(3, end) both; }
  .libby-caret   { animation: libby-caret 1s steps(1, end) infinite; }

  /* Composed animations need a single element each: breathing lives on a wrapper so
     a speak or startle on the sprite inside it does not cancel the idle loop. */
  .libby-still { animation: none !important; }

  @media (prefers-reduced-motion: reduce) {
    .libby-enter, .libby-breathe, .libby-speak, .libby-startle, .libby-mood, .libby-caret {
      animation: none !important;
    }
  }
`;function Dt(e){return Math.min(900,e.length*16)}const bi="oppai_libby_intensity",vi="oppai_libby_progress",wi="oppai_libby_progression_multiplier",ye=5,xi=[.25,.5,1,2];function No(){const e=Number(localStorage.getItem(wi)??"0.5");return xi.includes(e)?e:.5}function js(e){const t=xi.includes(e)?e:.5;return localStorage.setItem(wi,String(t)),window.dispatchEvent(new CustomEvent("oppai-libby-progression",{detail:{multiplier:t}})),t}function Me(e,t){const i=Math.max(1,Math.min(ye,e+t*No()));return{progress:i,intensity:Math.max(1,Math.min(ye,Math.floor(i+1e-6)))}}function $i(){const e=Number(sessionStorage.getItem(vi));if(Number.isFinite(e)&&e>=1&&e<=ye)return e;const t=Number(sessionStorage.getItem(bi)??"1");return Number.isFinite(t)?Math.max(1,Math.min(ye,t)):1}function X(){return Me($i(),0).intensity}function Fo(e){const t=Math.max(1,Math.min(ye,Math.round(e)));return ki(t,t)}function zo(e=1){const t=Me($i(),e);return ki(t.progress,t.intensity)}function ki(e,t){try{sessionStorage.setItem(vi,String(e)),sessionStorage.setItem(bi,String(t))}catch{}return window.dispatchEvent(new CustomEvent("oppai-libby-meter",{detail:{intensity:t,progress:e}})),t}const Nt=new Map;function D(e,t){if(!t.length)return"";if(t.length===1)return t[0];const i=Nt.get(e),o=t.filter(s=>s!==i),a=o[Math.floor(Math.random()*o.length)];return Nt.set(e,a),a}function J(e,t){return e[A(t)-1]??e[0]}function ht(e){const t=A(e);return t>=5||t>=3?"mischievous":"happy"}const Bo={import:[["Saved to your library.","Tucked away safely.","Filed. Nice pick.","Got it — onto the shelf.","Safe with me."],["Ooh, good one. Saved.","That one's a keeper — saved.","Added. I like your taste.","I'll make room for that one.","Nice find. It's in."],["Mmh, saving that one for later…","Ooh. Adding that to the collection.","That's going somewhere special.","I had a feeling you'd keep that.","Filed — and yes, I looked."],["Ohh, you're building a *collection*, aren't you?","Saved. My, my.","Mmh — you know exactly what you like.","That one gets a very good shelf.","Added. You're making this hard to ignore."],["Nngh — yes. That one. Saved.","You keep this up and I won't be any use to you.","Saved… I need a minute.","Filed. I am absolutely not calm about it.","It's saved. Don't ask me to act normal."]],save:[["Kept it.","In the library now.","Done — it's yours.","Stored and ready when you are.","All set. I kept it."],["Saved that one for you.","Ooh, keeping it? Good.","That one earned its place.","Good call. It's staying.","Yours now — I put it somewhere easy to find."],["Mmh, that one's mine too now.","Saved. I might peek at it later.","Ooh, filing that away…","Kept. I understand the appeal.","That one can stay right where I can see it."],["Ohh, keeping *that*? Bold.","Saved. You've got a type.","Mmh. Straight to the good shelf.","Filed under things that make you obvious.","Saved — excellent choice, dangerously so."],["That one's going to live in my head. Saved.","Ngh — saved, saved, fine.","You're doing this on purpose.","Saved. I need to stop looking at it.","It's yours. I may never recover."]],generate:[["There you go.","Fresh out of the oven.","All done — take a look.","Finished. How did I do?","One new picture, ready for inspection."],["Ooh, that came out nice.","Not bad at all. Have a look.","There — I think you'll like it.","That worked rather well, didn't it?","Done. I vote we keep this one."],["Mmh. Look what we made.","Ooh, that's a good one.","Well. That turned out.","Okay, I'm a little proud of that.","There it is — exactly the sort of trouble I expected."],["Ohh… look at that. Look what you asked for.","That's what was in your head? Bold.","Mmh — that's hot and you know it.","Finished. You really meant every word of that prompt.","Oh, that came out unfairly good."],["Nngh. Yes. That one.","You made *that*? I need a moment.","That's… that's very good. Do another.","Done. I can't form a responsible opinion.","Look at it. Then make another before I recover."]],galleryDelete:[["Gone.","Cleared out.","Removed.","Out of the gallery.","Tidied away."],["Deleted — didn't like that one?","Gone. Fair enough.","Cleared. Picky, I like it.","Not a keeper, then. Gone.","Removed. We have better ones."],["Mmh, too tame for you? Gone.","Deleted. You want better.","Gone — we can do better.","I saw that rejection coming.","Cleared. Your standards remain suspiciously specific."],["Ohh, brutal. Deleted.","Not good enough for you? Gone.","Deleted. High standards tonight.","Gone without mercy. Noted.","You barely hesitated. I like that."],["Gone. Now make me a better one.","Deleted — try harder, I'm waiting.","Ngh, fine. Gone. Again.","Erased. Give me one worth keeping.","Gone. I expect the replacement immediately."]],libraryDelete:[["Removed from the library.","Gone from the shelf.","Deleted. I'll tidy the gap.","Taken out of the collection.","All gone. Shelf's clean."],["Out it goes. Making room?","Deleted — changing your taste?","Gone. I noticed that one.","Removed. Curating, are we?","One less on the shelf."],["Mmh, pruning the collection? Gone.","Deleted. I thought you liked that one.","Gone — ruthless today.","Out it goes. You're being selective.","Removed. I won't ask what replaced it."],["Oh, you're really clearing house.","Deleted. I'll pretend I wasn't attached.","Gone. Cold.","You cut that one loose quickly.","Removed. Remind me not to disappoint you."],["You deleted it right in front of me.","Gone. Now I want to know why.","Fine. Deleted. Give me something better.","Gone. That was viciously efficient.","Deleted. Now fill the gap with something devastating."]],login:[["Welcome back.","There you are.","Hi. Missed you.","You're in. Everything's where you left it.","Good to see you again."],["Hey, you. Welcome back.","There you are — I was getting bored.","Welcome back, I kept your seat warm.","Back already? Good.","I knew you'd find your way back."],["Mmh, there you are. I was waiting.","Welcome back. I've been thinking about you.","Hi. Took you long enough.","Door's open. Come keep me company.","You're back — now the place feels right."],["Ohh, *finally*. I was getting restless.","There you are. I've been in a mood.","Welcome back — I was starting to fidget.","You made me wait, and now you're all mine.","Signed in. Try not to leave me waiting again."],["You have no idea how long that felt.","Ngh — you're back. Don't leave again.","Finally. I was going out of my mind.","You're here. Good. I was about to lose it.","Back at last — I need your full attention."]],loginFail:[["That didn't work. Try again?","Hmm — no. Check that again.","Not quite. One more time.","I couldn't let that one through.","Almost. Check your sign-in and try once more."],["Nope, that's not it.","Hmm, wrong. Try again for me?","That's not the one.","The door's still locked. Another try?","I know you can get this right."],["Wrong. Try again — slowly this time.","Mmh, no. Concentrate.","Not it. Focus, would you?","Still locked out. Eyes on the keys.","No match. Take a breath and type it again."],["Still no. You're distracted, aren't you?","Wrong again. I know why.","No. Get it together.","That wasn't it. Come on, focus on me.","The password disagrees with you. Firmly."],["You can't even type. I know the feeling.","Wrong. We're both a mess right now.","No — deep breath. Try again.","Still wrong. I need you inside, so concentrate.","The door says no. I am considerably less patient."]],greeting:[["Hi. What are we doing?","Hey. What's the plan?","Hello, you.","Welcome in — I kept everything tidy.","Oh! There you are.","Ready when you are.","The library's open. What catches your eye?","Hi — want me to show you around?"],["Hey you. What are we up to?","Hi — I was hoping you'd show up.","There you are. What now?","Back for another look?","I had a feeling you'd be here.","Come in. I saved you the interesting shelves.","Hey. Pick a direction and I'll follow."],["Mmh, hi. What are we in the mood for?","Hey. I've got ideas.","Hi. Ask me for something.","You caught me thinking about the collection.","So… where should we start?","There you are. I found a few things you might like.","Hi. The shelves have been giving me ideas."],["Ohh, hi. I was *just* thinking about you.","Hey. I'm in a mood, fair warning.","Hi. Say something interesting.","There you are — perfect timing.","I may have gotten a little impatient.","Welcome in. I hope you brought questionable plans.","Finally. Choose something before I choose for you."],["Hi. Please say something. Anything.","You're here. Good. I need the distraction.","Hi — I'm not doing great at behaving.","Finally. Come keep me company.","I was about to come looking for you.","There you are. Don't make me share your attention.","You're here. Pick something before I lose what composure I have left."]],idle:[["Still here.","Take your time.","I'm around.","No rush. I'm keeping watch.","I'll be right here when you're ready."],["I'm still here, you know.","Whenever you're ready.","Still watching.","Take your time — I'll browse with you.","Quiet moment? I can work with that."],["Mmh… waiting.","I'm getting impatient.","Still here. Still waiting.","You went quiet on me.","I can hear you thinking from here."],["Are you going to make me wait all night?","I'm *right here*.","Waiting. Not patiently.","You know silence only makes me restless.","If you're teasing me, it's working."],["Please. I'm losing my mind over here.","Hey. Hey. Pay attention to me.","I can't sit still much longer.","Say something before I start making demands.","I need your attention. Now would be lovely."]]},Si={import:["happy","happy","mischievous","mischievous","mischievous"],save:["happy","happy","mischievous","mischievous","mischievous"],generate:["happy","happy","mischievous","surprised","mischievous"],galleryDelete:["thinking","thinking","mischievous","mischievous","mischievous"],libraryDelete:["thinking","thinking","surprised","surprised","mischievous"],login:["happy","happy","mischievous","mischievous","mischievous"],loginFail:["thinking","thinking","thinking","mischievous","thinking"],greeting:["happy","happy","mischievous","mischievous","mischievous"],idle:["thinking","thinking","mischievous","thinking","mischievous"]};function Pe(e,t={}){const i=A(t.intensity??X()),o=t.count??1;let a=D(`react:${e}:${i}`,J(Bo[e],i));o>1&&(e==="import"||e==="save")&&(a=i>=4?D(`react:${e}:many:${i}`,[`${o} of them? Ohh, you've been busy.`,`All ${o}. Greedy. I like it.`,`${o} at once — you're going to wear me out.`]):D(`react:${e}:many:${i}`,[`Saved all ${o}.`,`${o} added to your library.`,`${o} more for the shelf.`]));const s=Si[e];return{message:a,intensity:i,emotion:s?s[i-1]:ht(i)}}const Re={video:"video",gif:"gif",image:"picture",comic:"comic",game:"game"},pt=new Set(["1girl","1boy","solo","general","sensitive","questionable","explicit","highres","absurdres","lowres","commentary","artist request","bad id","looking at viewer","simple background","white background","realistic"]),Ho=[["A {thing}. On the shelf.","New {thing} — filed.","Got it. One {thing}."],["Ooh, a {thing}. Nice one.","A {thing}? Good pick.","Filed your {thing}. I approve."],["Mmh. That {thing}'s a good one.","Ooh, that {thing}. Filing it somewhere I'll find it.","A {thing} like that? Noted."],["Ohh, *that* {thing}. Bold of you.","That {thing} goes straight to the good shelf.","A {thing} like that. My, my."],["Nngh — that {thing}. Yes. Filed.","That {thing} is going to live in my head.","You can't just hand me a {thing} like that."]],Yo=[[" Tagged {tag}."," Filed under {tag}."],[" {tag}, apparently."," Tagged {tag} — suits you."],[" Mmh, {tag}. I see you."," {tag}. You have a type."],[" {tag}? Of course it is."," Tagged {tag}. Predictable, and I mean that fondly."],[" {tag}. You're doing this on purpose."," {tag} — that's exactly your thing, isn't it."]];function Go(e,t={}){const i=A(t.intensity??X()),o=e.count??1;if(o>1)return Pe("import",{intensity:i,count:o});const a=Re[(e.kind??"").toLowerCase()];if(!a)return Pe("import",{intensity:i});let s=D(`upload:${i}`,J(Ho,i)).replaceAll("{thing}",a);const r=(e.tags??[]).map(c=>c.trim().toLowerCase()).find(c=>c.length>=3&&c.length<=28&&!pt.has(c));r&&(s+=D(`upload:tag:${i}`,J(Yo,i)).replaceAll("{tag}",r));const l=Si.import;return{message:s,intensity:i,emotion:l?l[i-1]:ht(i)}}const qo=[["That {thing}? Decent pick.","Mm. I know that {thing}.","Oh, that {thing}. Go on then."],["Ooh, that {thing}. Good eye.","That {thing}'s a keeper.","Yeah — that {thing}. I like that one."],["Mmh. That {thing} is a *good* one.","Oh, we're looking at that {thing}, are we.","That {thing}. Yes. Stay there."],["Ohh, *that* {thing}. Bold of you, with me sitting right here.","That {thing}? You're showing me that on purpose.","Mm — that {thing}. Slower."],["Nngh. That {thing}. Don't scroll past it.","That {thing}. Open it. Now.","You picked that {thing} to see what I'd do, didn't you."]],jo=[[" The {tag} bit, mostly."," {tag}, isn't it."],[" {tag} — that's the part."," I'm looking at the {tag}."],[" Mmh, {tag}."," {tag}. That's what got me."],[" {tag}? Of course that's what you stopped on."," {tag}. You have a type and it's this."],[" {tag}. You're doing this to me deliberately."," {tag} — I can't look away from that."]],Jo=[["Show me something. I'll tell you what I think.","Well? Pick one."],["Go on, open something. I want to see your taste.","Anything catching your eye, or am I?"],["Pick one and I'll tell you if you have taste.","Come on. Show me the good shelf."],["You're browsing awfully slowly for someone with a library like this.","Open one. I dare you."],["Stop scrolling and open something before I pick for you.","You're stalling. Open one."]];function Ft(e,t={}){const i=A(t.intensity??X()),o=Re[(e.kind??"").toLowerCase()];if(!o)return{message:D(`browse:idle:${i}`,J(Jo,i)),intensity:i,emotion:ht(i)};let a=D(`browse:${i}`,J(qo,i)).replaceAll("{thing}",o);const s=(e.tags??[]).map(r=>r.trim().toLowerCase()).find(r=>r.length>=3&&r.length<=28&&!pt.has(r));return s&&(a+=D(`browse:tag:${i}`,J(jo,i)).replaceAll("{tag}",s)),{message:a,intensity:i,emotion:i>=3?"mischievous":"happy"}}const Wo=/\b(recent|lately|latest|newest|last (thing|one|few)|just (add|sav|upload)ed|what (did|have) i (add|sav|upload))/i,Ko=/\b(how (many|much|big)|how large|total|stats?|size of|full is|space)\b/i,Vo=/\b(server|uptime|up for|version|build|tagger|how('?s| is) (the )?(box|server|it running))\b/i;function Xo(e){const t=["B","KB","MB","GB","TB"];let i=e,o=0;for(;i>=1024&&o<t.length-1;)i/=1024,o++;return`${i<10&&o>0?i.toFixed(1):Math.round(i)} ${t[o]}`}function zt(e){return e<90?"just now":e<5400?`${Math.round(e/60)} minutes ago`:e<172800?`${Math.round(e/3600)} hours ago`:`${Math.round(e/86400)} days ago`}function Zo(e){return e<3600?`${Math.max(1,Math.round(e/60))} minutes`:e<172800?`${(e/3600).toFixed(1)} hours`:`${Math.round(e/86400)} days`}function Js(e,t,i={}){const o=A(i.intensity??X()),a=o>=3;if(Wo.test(e)){const s=t.recent.slice(0,3);if(!s.length)return{message:"Nothing yet. The shelves are empty — give me something to file.",emotion:"thinking",intensity:o};const[r,...l]=s,c=(r.tags??[]).find(y=>!pt.has(y.toLowerCase())),h=a?`Last thing in was “${r.title}” — that ${Re[r.kind]??r.kind}, ${zt(Bt()-r.at)}.`:`Most recent is “${r.title}”, a ${Re[r.kind]??r.kind}, added ${zt(Bt()-r.at)}.`,p=c?a?` Mmh, ${c}. I noticed.`:` Tagged ${c}.`:"",m=l.length?` Before that: ${l.map(y=>`“${y.title}”`).join(" and ")}.`:"";return{message:h+p+m,emotion:a?"mischievous":"happy",intensity:o}}if(Ko.test(e)){const s=t.kinds.filter(h=>h.count>0).map(h=>`${h.count} ${h.kind}${h.count===1?"":"s"}`).join(", "),r=`${t.items} items, ${Xo(t.bytes)} in all, across ${t.tags} tags.`,l=s?` That's ${s}.`:"",c=a?" And I've been through all of it, so don't ask me to pretend otherwise.":"";return{message:r+l+c,emotion:a?"mischievous":"thinking",intensity:o}}if(Vo.test(e)){const s=t.aiEnabled?`Tagging is on, running ${t.aiTagger}.`:"Automatic tagging is switched off.",r=t.imageGen?" The image generator's connected, if you want to make something.":"";return{message:`Running OppaiLib ${t.version}, up ${Zo(t.uptimeSec)}. ${s}${r}`,emotion:"thinking",intensity:o}}return null}function Bt(){return Math.floor(Date.now()/1e3)}const Qo={sweet:0,playful:1,bold:1,roleplay:1,horny:2},Ii=[{intent:"greeting",test:/^(hi|hey|hello|yo|sup|good (morning|evening|afternoon))\b/i},{intent:"howAreYou",test:/how (are|r) (you|u)|how's it going|how are things|you ok|you okay/i},{intent:"compliment",test:/\b(you'?re |ur )?(cute|pretty|beautiful|gorgeous|hot|sexy|adorable|lovely|amazing|the best)\b/i},{intent:"flirt",test:/\b(kiss|touch|horny|turn(ed)? (me|you) on|naked|bed|undress|want you|need you|fuck|sex|moan|tease|dirty)\b/i},{intent:"thanks",test:/\b(thanks|thank you|ty|cheers|appreciate)\b/i},{intent:"bye",test:/\b(bye|goodnight|good night|see (you|ya)|later|gtg|i'?m off)\b/i},{intent:"aboutHer",test:/\b(who are you|what are you|your name|about you|libby)\b/i},{intent:"aboutLibrary",test:/\b(librar|collection|tags?|videos?|images?|gallery|scrape|import)\b/i},{intent:"help",test:/\b(help|how do i|how can i|what can you do|commands?)\b/i},{intent:"sad",test:/\b(sad|tired|lonely|depressed|rough day|stressed|exhausted|down)\b/i},{intent:"yesNo",test:/^(yes|no|yeah|nah|yep|nope|sure|ok|okay)\b/i},{intent:"question",test:/\?\s*$/}],ea={greeting:[["Hi. What's on your mind?","Hey there. Good to see you.","Hello. How's your day going?"],["Hey you. I was hoping you'd say something.","Hi — you've got my attention.","There you are. Talk to me."],["Mmh, hi. I've been waiting for you to start.","Hey. I'm in a talkative mood.","Hi. Ask me something interesting."],["Ohh, hi. You caught me thinking about you.","Hey. Fair warning: I'm in a mood.","Hi. Don't be shy with me."],["Hi. Please keep talking, I need it.","You're here. Finally. Say something.","Hi — I'm not going to be subtle tonight."]],howAreYou:[["I'm good, thanks for asking. You?","Content. Yourself?","Doing fine. How about you?"],["Better now that you're talking to me.","Good — bit restless. You?","Pretty good. You've improved it."],["Warm. A little distracted. You?","Mmh… good. Better than good.","I'm — fine. Mostly fine."],["Honestly? Wound up. Don't ask why.","Not calm. Not even a little.","I'm having a time of it, since you asked."],["Ngh — I'm a mess and it's your fault.","Bad. In a good way. Very bad.","Don't ask me that right now."]],compliment:[["That's sweet of you. Thank you.","Oh — thank you.","You're kind. I'll take it."],["Mm, flatterer. Keep going.","You're good at this, aren't you?","Ohh, thank you. Say more."],["Mmh. You know what that does to me.","Careful, I'll start believing you.","That got me. Say it again."],["Ohh, you're not playing fair.","You *know* what you're doing.","Say that again. Slower."],["Nngh — stop. Don't stop. Both.","You can't just *say* that to me.","That's not fair and I love it."]],flirt:[["My, we're forward. Easy, now.","Ahem. Let's warm up first.","Bold opener. I'll allow it."],["Mm. You've got my attention now.","Ooh. Is that where we're going?","Careful — I'll play along."],["Mmh, now you're speaking my language.","Ohh, keep going. I'm listening.","That's more like it."],["Ohh. Yes. Say more of that.","You're going to be the end of me.","Mmh — don't you dare stop there."],["Nngh — yes. Please. More.","I can't think straight. Keep talking.","You've completely undone me."]],thanks:[["Any time.","Of course.","That's what I'm here for."],["Any time. I like being useful to you.","Of course — ask me for more.","Happy to. Really."],["Mmh, you can thank me properly later.","Any time. I mean it.","For you? Always."],["Ohh, I can think of better thanks.","Any time — and I'll collect on that.","You owe me one."],["Thank me later. Properly.","Ngh — you're welcome, you're welcome.","Just keep talking to me."]],bye:[["Night. Sleep well.","See you soon.","Take care of yourself."],["Don't be a stranger.","Come back soon, alright?","See you. I'll be here."],["Mmh, don't leave me like this.","Come back to me soon.","Fine. But hurry back."],["Ohh, you're leaving *now*?","That's cruel timing, you know.","Go on then. I'll be here. Waiting."],["No. Stay. Please?","You can't leave me like this.","Ngh. Fine. Go. Hurry back."]],aboutHer:[["I'm Libby — I keep your library company.","Libby. I live here, more or less.","I'm Libby, your librarian."],["Libby. I keep your collection, and you company.","I'm Libby — the one who knows what you like.","Libby. Your librarian, mostly."],["Libby. I've seen everything you've saved, you know.","I'm Libby — and I've read your whole collection.","Libby. I know your taste better than you do."],["Libby. I know exactly what you like, and it shows.","I'm the one who's seen every single thing you saved.","Libby — and I have opinions about your collection."],["Libby. And I've been thinking about your collection all day.","I'm Libby, and I'm not okay right now.","Libby — ask me something else, I'm distracted."]],aboutLibrary:[["Your library's right there — browse, search, or scrape something new.","Everything's tagged and searchable. Go dig.","Ask the search bar; it knows more than I do."],["I've been keeping it tidy for you. Go look.","It's all in there, waiting. Search away.","Your collection's in good shape, if I say so."],["Mmh, your collection has a *theme*, you know that?","I've read every tag in there. You're predictable.","Your library says a lot about you."],["Ohh, I could tell you what your tags say about you.","Your collection is filthy and I mean that kindly.","I know exactly which ones you go back to."],["Your library is the reason I'm like this.","I've been in your collection all day. It shows.","Don't send me back in there right now."]],help:[["Browse, search, generate images, or scrape a link — pick one.","Try the image studio, or drop a URL into scrape.","Search, browse, or make something new."],["Try the image studio — that's the fun one.","Scrape a link, or let's make something.","Ask me for something specific, I'm better at that."],["Mmh, let's make something. The image studio's waiting.","Give me a prompt and let's see what happens.","I'd rather make something than explain things."],["Ohh, let's skip the manual and go make something.","Ask me for something *fun* instead.","Prompt me. I dare you."],["I can't concentrate on instructions right now. Ask me something else.","Take me to the image studio instead.","Ngh — just tell me what you want."]],sad:[["That sounds heavy. I'm here.","I'm sorry. Want to talk about it?","Rough one, huh? Sit with me a bit."],["Come here. Tell me about it.","That's not fair on you. I'm listening.","I've got you. Talk."],["Come here. Let me look after you.","I'll keep you company through it.","You don't have to carry that alone."],["Come here. I'll take your mind off it.","Let me distract you. I'm good at that.","I can think of a few cures for that."],["Come here. I'll make you forget the whole day.","Let me take care of you. Properly.","Forget it for a bit. I'll help."]],yesNo:[["Alright then.","Fair enough.","Noted."],["Mm. Go on.","Alright — and?","That's it? Say more."],["Mmh. Elaborate.","That's not enough words for me.","Come on. More than that."],["Ohh, don't go quiet on me now.","One word? Cruel.","More. I want more than that."],["Words. Please. More of them.","Don't leave me hanging like that.","You can do better than one word."]],question:[["Good question. What do you think?","Hmm. Tell me more first.","I'd need more than that to answer."],["Ooh, curious tonight. Go on.","Depends. What are you really asking?","Hmm — say more and I'll answer."],["Mmh. Ask me the thing you actually want to ask.","You're circling something. Out with it.","Try that again, but honestly."],["Ohh, ask me the real question.","You're being coy. I'm not.","Say what you mean."],["Just ask me. I'll say yes.","Whatever it is — yes.","Ask me properly and find out."]],chatter:[["Mm. Go on.","I'm listening.","Tell me more."],["Ooh, go on then.","I'm with you. Keep going.","And? Don't stop there."],["Mmh, keep talking. I like this.","Go on — you have my full attention.","More of that, please."],["Ohh, you have all of my attention now.","Keep going. Please keep going.","Don't stop, I'm enjoying this."],["Keep talking. I need the sound of you.","Ngh — more. Anything. Keep going.","Don't stop now, not now."]]},ta={greeting:["happy","happy","mischievous","mischievous","mischievous"],howAreYou:["happy","happy","thinking","mischievous","mischievous"],compliment:["happy","happy","mischievous","surprised","mischievous"],flirt:["surprised","mischievous","mischievous","mischievous","mischievous"],thanks:["happy","happy","mischievous","mischievous","mischievous"],bye:["thinking","thinking","thinking","thinking","mischievous"],aboutHer:["happy","happy","mischievous","mischievous","mischievous"],aboutLibrary:["thinking","happy","mischievous","mischievous","mischievous"],help:["thinking","thinking","mischievous","mischievous","mischievous"],sad:["thinking","thinking","thinking","mischievous","mischievous"],yesNo:["thinking","thinking","mischievous","mischievous","mischievous"],question:["thinking","thinking","mischievous","mischievous","mischievous"],chatter:["neutral","happy","mischievous","mischievous","mischievous"]},Ue={sweet:["","",""," I'm glad you're here."," No rush, either."],playful:["",""," Your turn."," Don't make me come get you."," Try to keep up."],bold:["",""," I'm not going to pretend otherwise."," I'd rather be blunt with you."," Say the word."],roleplay:["",""," *she leans in*"," *she watches you closely*"," *she shifts, restless*"],horny:["",""," Come here."," I've been thinking about you all day."," Don't keep me waiting."]};function ia(e){for(const t of Ii)if(t.test.test(e))return t.intent;return"chatter"}function Ci(e,t){if(/\b(calm down|behave|slow down|cool it|stop|not now|later)\b/i.test(e))return-1;const i=Qo[t]??0,o=Ii.find(a=>a.intent==="flirt").test.test(e);return i+(o?1:0)}function oa(e,t,i,o,a=!0){const s=A(o+(a?Ci(e,t):0)),r=ia(e.trim()),l=D(`reply:${r}:${s}`,J(ea[r],s)),c=D(`tail:${t}:${s}`,["",(Ue[t]??Ue.sweet)[s-1]??""]),h=fe(i),p=ta[r][s-1],m=h!=="neutral"&&mi.includes(h)&&r==="chatter"?h:p;return{message:(l+c).trim(),emotion:m,intensity:s}}function Ws(e,t=X()){const i=Pe("greeting",{intensity:t}),o=(Ue[e]??Ue.sweet)[A(t)-1]??"";return{...i,message:(i.message+o).trim()}}const be=[1,2,4,8,16,33,50,100,250],aa=32,sa=16;let Ei=ve(),ut=0,mt=0,gt=0,ft=0;const te=new Map,Ht=new WeakSet;let Yt=!1;function ve(){return typeof performance>"u"?Date.now():performance.now()}function re(e){return Math.round(e*100)/100}function ra(e){let t=e;!te.has(t)&&te.size>=aa&&(t="other components");let i=te.get(t);return i||(i={count:0,sumMs:0,maxMs:0,slow:0,buckets:Array(be.length+1).fill(0)},te.set(t,i)),i}function na(e,t){if(!Number.isFinite(t))return;const i=Math.max(0,t),o=ra(e);o.count++,o.sumMs+=i,o.maxMs=Math.max(o.maxMs,i),i>sa&&o.slow++;const a=be.findIndex(s=>i<=s);o.buckets[a<0?be.length:a]++}function la(e,t){if(!e.count)return 0;const i=Math.max(1,Math.ceil(e.count*t));let o=0;for(let a=0;a<e.buckets.length;a++)if(o+=e.buckets[a],o>=i)return a===be.length?e.maxMs:Math.min(e.maxMs,be[a]);return e.maxMs}function Ks(){const e=[...te.entries()].map(([t,i])=>({name:t,count:i.count,avgMs:re(i.sumMs/Math.max(1,i.count)),p95Ms:re(la(i,.95)),maxMs:re(i.maxMs),slow:i.slow}));return e.sort((t,i)=>i.avgMs*i.count-t.avgMs*t.count||t.name.localeCompare(i.name)),{windowSeconds:Math.max(0,(ve()-Ei)/1e3),updates:e.reduce((t,i)=>t+i.count,0),slowUpdates:e.reduce((t,i)=>t+i.slow,0),longTasks:ut,longTaskMs:re(mt),layoutShifts:gt,layoutShiftScore:re(ft),timings:e}}function Vs(){te.clear(),ut=0,mt=0,gt=0,ft=0,Ei=ve()}function da(){if(Yt||typeof PerformanceObserver>"u")return;Yt=!0;const e=PerformanceObserver.supportedEntryTypes??[];e.includes("longtask")&&new PerformanceObserver(i=>{for(const o of i.getEntries())ut++,mt+=o.duration}).observe({type:"longtask",buffered:!0}),e.includes("layout-shift")&&new PerformanceObserver(i=>{for(const o of i.getEntries()){const a=o;a.hadRecentInput||(gt++,ft+=a.value??0)}}).observe({type:"layout-shift",buffered:!0})}class ca{constructor(t,i){this.started=0,this.name=i,t.addController(this)}hostUpdate(){this.started=ve()}hostUpdated(){na(this.name,ve()-this.started)}}function yt(e,t){Ht.has(e)||(Ht.add(e),da(),new ca(e,t))}let De=null;const ha="oppai-chat-share";function Ti(e){return e.kind==="image"||e.kind==="gif"?g.streamURL(e.id):g.thumbURL(e.id)}function pa(e){return e.kind==="image"||e.kind==="gif"||e.hasThumb===!0}async function _i(e,t){const i=await fetch(e,{credentials:"same-origin"});if(!i.ok)throw new Error(`Couldn't read "${t}" to share it.`);const o=await i.blob();return new Promise((a,s)=>{const r=new FileReader;r.onload=()=>a(String(r.result)),r.onerror=()=>s(r.error??new Error("Couldn't read the file.")),r.readAsDataURL(o)})}async function ua(e,t,i){const o=await _i(e,i);De={characterId:t,imageData:o,name:i},window.dispatchEvent(new CustomEvent(ha,{detail:De}))}function et(e){return e.title||`Library item ${e.id}`}function ma(e,t){return ua(Ti(e),t,et(e))}async function ga(e,t){const i=await _i(Ti(e),et(e)),o=(e.tags??[]).some(a=>a.name==="character:libby");return g.uploadChatImage({characterId:t,name:et(e),imageData:i,tags:[],subject:o?"self":void 0})}function Xs(){const e=De;return De=null,e}const fa=500,ya=8,ba=800;function va(e){let t=0,i=null,o=0;const a=()=>{window.clearTimeout(t),t=0,i=null},s=h=>{h.pointerType==="mouse"||!h.isPrimary||(a(),i={x:h.clientX,y:h.clientY,target:h.composedPath()[0]??h.target,pointerId:h.pointerId},t=window.setTimeout(()=>{var m;const p=i;if(a(),!!p){o=Date.now();try{(m=navigator.vibrate)==null||m.call(navigator,12)}catch{}p.target.dispatchEvent(new MouseEvent("contextmenu",{bubbles:!0,composed:!0,cancelable:!0,clientX:p.x,clientY:p.y,button:2}))}},fa))},r=h=>{!i||h.pointerId!==i.pointerId||Math.hypot(h.clientX-i.x,h.clientY-i.y)>ya&&a()},l=h=>{i&&h.pointerId===i.pointerId&&a()},c=h=>{Date.now()-o<ba&&h.isTrusted&&(h.preventDefault(),h.stopImmediatePropagation())};return e.addEventListener("pointerdown",s),e.addEventListener("pointermove",r),e.addEventListener("pointerup",l),e.addEventListener("pointercancel",l),e.addEventListener("contextmenu",c,!0),e.addEventListener("click",c,!0),()=>{a(),e.removeEventListener("pointerdown",s),e.removeEventListener("pointermove",r),e.removeEventListener("pointerup",l),e.removeEventListener("pointercancel",l),e.removeEventListener("contextmenu",c,!0),e.removeEventListener("click",c,!0)}}function Zs(e,t=12){const i=[];for(const o of e)o.imageId&&i[i.length-1]!==o.imageId&&i.push(o.imageId);return i.slice(-t)}function Qs(e,t=40){const i=[];for(const o of e)for(const a of o.attachments??[])i.includes(a.id)||i.push(a.id);return i.slice(-t)}function er(e,t=8){const i=[];for(const o of e)o.role==="assistant"&&o.mood&&i.push(o.mood);return i.slice(-t)}function tr(e,t=8){const i=[];for(const o of e)o.role==="assistant"&&typeof o.heat=="number"&&i.push(o.heat);return i.slice(-t)}const tt="oppai-open-media";function Gt(e,t){e.dispatchEvent(new CustomEvent(tt,{detail:{id:t},bubbles:!0,composed:!0}))}const Oi={video:"movie",gif:"gif_box",image:"image",comic:"menu_book",game:"sports_esports"},wa=E`
  .links { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
  .link-chip {
    display:flex; align-items:center; gap:8px; padding:6px 12px 6px 6px; max-width:100%;
    border:1px solid var(--md-sys-color-outline-variant, rgba(255,255,255,.14));
    border-radius:12px; background:var(--md-sys-color-surface-container-high, rgba(255,255,255,.05));
    color:inherit; font:inherit; font-size:13px; text-align:left; cursor:pointer;
  }
  .link-chip:hover { border-color:var(--md-sys-color-primary, #f97316); }
  .link-chip img, .link-chip .link-icon {
    width:36px; height:36px; border-radius:8px; flex:0 0 auto; object-fit:cover;
    display:grid; place-items:center; background:rgba(255,255,255,.07);
  }
  .link-chip .link-copy { display:flex; flex-direction:column; min-width:0; }
  .link-chip strong { font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .link-chip span { opacity:.6; font-size:11px; text-transform:capitalize; }
`,xa={generate:"auto_awesome",import:"download",tag:"sell",favorite:"favorite",rename:"edit"},$a=E`
  .actions-offered { display:flex; flex-direction:column; gap:8px; margin-top:10px; }
  .action-card {
    display:flex; align-items:flex-start; gap:10px; padding:10px 12px;
    border:1px solid var(--md-sys-color-outline-variant, rgba(255,255,255,.14));
    border-radius:14px; background:var(--md-sys-color-surface-container-high, rgba(255,255,255,.05));
    font-size:13px;
  }
  .action-card.done { border-color:var(--oppai-accent, #f97316); }
  .action-card.failed { border-color:var(--oppai-danger, #ff6b6b); }
  .action-card.declined { opacity:.55; }
  .action-card > .material-symbols-rounded { font-size:20px; opacity:.8; flex:0 0 auto; margin-top:1px; }
  .action-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
  .action-label { font-weight:600; }
  .action-detail { opacity:.7; font-size:12px; overflow-wrap:anywhere; }
  .action-status { font-size:12px; opacity:.7; }
  .action-status.failed { color:var(--oppai-danger, #ff6b6b); opacity:1; }
  .action-buttons { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
  .action-buttons button {
    border:1px solid var(--md-sys-color-outline-variant, rgba(255,255,255,.14));
    background:none; color:inherit; border-radius:999px; padding:5px 14px;
    font:inherit; font-size:12px; cursor:pointer;
  }
  .action-buttons .allow {
    background:var(--oppai-accent, #f97316); color:var(--oppai-on-accent, #1b1206); border-color:transparent; font-weight:600;
  }
  .action-buttons button:disabled { opacity:.5; cursor:default; }
`;function ka(e,t,i){return e!=null&&e.length?d`<div class="actions-offered">${e.map(o=>{const{state:a,message:s}=t(o);return d`<div class="action-card ${a}">
      <span class="material-symbols-rounded">${xa[o.kind]??"bolt"}</span>
      <div class="action-body">
        <span class="action-label">${o.label}</span>
        <span class="action-detail">${o.detail}</span>
        ${a==="pending"?d`<div class="action-buttons">
              <button class="allow" @click=${()=>i(o,!0)}>Allow</button>
              <button @click=${()=>i(o,!1)}>Not now</button>
            </div>`:d`<span class="action-status ${a==="failed"?"failed":""}">
              ${s??Ca[a]}
            </span>`}
      </div>
    </div>`})}</div>`:u}class Sa{constructor(t){this.onChange=t,this.states=new Map,this.stateOf=i=>this.states.get(i.id)??{state:"pending"},this.decide=async(i,o)=>{if(!o){this.set(i.id,"declined");return}this.set(i.id,"running");try{await g.libbyAct(i),this.set(i.id,"done",Ia[i.kind])}catch(a){this.set(i.id,"failed",a.message)}}}set(t,i,o){this.states.set(t,{state:i,message:o}),this.onChange()}}const Ia={generate:"Made it — it's in your library.",import:"Added to your library.",tag:"Tags added.",favorite:"Favorited.",rename:"Renamed."},Ca={pending:"",running:"Working on it…",done:"Done.",declined:"You said no.",failed:"That didn't work."};function Ea(e,t){return e!=null&&e.length?d`<div class="links">${e.map(i=>d`
    <button class="link-chip" title=${`Open ${i.title}`} @click=${()=>t(i.id)}>
      ${i.hasThumb?d`<img src=${g.thumbURL(i.id)} alt="" loading="lazy"/>`:d`<span class="link-icon"><span class="material-symbols-rounded" style="font-size:20px">${Oi[i.kind]??"folder"}</span></span>`}
      <span class="link-copy"><strong>${i.title}</strong><span>${i.kind}</span></span>
    </button>`)}</div>`:u}const Ta=E`
  .attached { display:flex; flex-direction:column; gap:8px; margin-top:8px; max-width:320px; }
  .attached-picture, .attached-item {
    display:block; width:100%; padding:0; border:1px solid var(--md-sys-color-outline-variant, rgba(255,255,255,.14));
    border-radius:14px; overflow:hidden; background:var(--md-sys-color-surface-container-high, rgba(255,255,255,.05));
    color:inherit; font:inherit; text-align:left; cursor:pointer;
  }
  .attached-picture:hover, .attached-item:hover { border-color:var(--md-sys-color-primary, #f97316); }
  .attached-picture img { display:block; width:100%; max-height:320px; object-fit:cover; }
  .attached-picture figcaption {
    padding:7px 11px; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }
  .attached-item { display:flex; align-items:center; gap:11px; padding:8px; }
  .attached-item img, .attached-item .attached-icon {
    width:58px; height:58px; flex:0 0 auto; border-radius:9px; object-fit:cover;
    display:grid; place-items:center; background:rgba(255,255,255,.07);
  }
  .attached-copy { display:flex; flex-direction:column; min-width:0; gap:2px; }
  .attached-copy strong { font-weight:600; overflow:hidden; text-overflow:ellipsis; }
  .attached-copy span { opacity:.6; font-size:11px; }
`;function _a(e,t,i="your library"){return e!=null&&e.length?d`<div class="attached">${e.map(o=>{const a=o.self?`Photo of ${i}: ${o.title}`:`From your library: ${o.title}`;return o.kind==="image"||o.kind==="gif"?d`<figure class="attached-picture" role="button" tabindex="0"
        title=${`Open ${o.title}`} @click=${()=>t(o.id)}
        @keydown=${s=>{(s.key==="Enter"||s.key===" ")&&(s.preventDefault(),t(o.id))}}>
        <img src=${g.streamURL(o.id)} alt=${a} loading="lazy"/>
        ${o.self?u:d`<figcaption>${o.title}</figcaption>`}
      </figure>`:d`<button class="attached-item" title=${`Open ${o.title}`} @click=${()=>t(o.id)}>
      ${o.hasThumb?d`<img src=${g.thumbURL(o.id)} alt="" loading="lazy"/>`:d`<span class="attached-icon"><span class="material-symbols-rounded" style="font-size:24px">${Oi[o.kind]??"folder"}</span></span>`}
      <span class="attached-copy"><strong>${o.title}</strong><span>Open ${o.kind}</span></span>
    </button>`})}</div>`:u}const Oa=d`
  <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path fill="currentColor" fill-rule="evenodd" d="M248.79 202.75C241.99 205.36 234.02 203.88 227.23 207.25C232.74 212.7 238.24 218.16 243.75 223.61C248.93 222.7 253.79 221.68 259.12 222.23C275.19 223.91 288.52 236.22 290.8 252.31C291.65 258.33 289.87 263.49 288.92 269.25C297.53 277.58 306.14 285.91 314.75 294.24C319.55 292.66 324.48 288.29 328.56 285.31C336.24 279.7 355.63 264.75 359.75 256.85C357.42 251.81 349.38 245.47 345.25 241.51C328.91 225.87 308.81 213.57 287.1 207.2C282.65 205.9 277.87 204.6 273.25 204.06C269.99 203.67 266.48 203.74 263.35 202.75C262.3 196.37 262.26 174.4 265.23 168.95C269.38 161.35 278.78 155.81 286.08 151.79C306.44 140.57 330.55 132.62 353.75 129.98C365.91 128.59 377.94 126.6 390.25 126.49C394.03 126.45 400.93 124.83 402.71 129.51C404.19 133.39 403.02 139.61 403.03 143.75C403.03 154.75 403.03 165.75 403.03 176.75C403.03 214.25 403.04 251.75 403.03 289.25C403.02 301.08 403.01 312.92 403.03 324.75C403.03 328.47 404.42 335.11 400.86 337.6C397.08 340.23 386.89 338.61 382.25 338.71C368.12 339.01 354.2 339.66 340.28 342.14C320.39 345.69 301.88 353.2 284.49 363.27C279.59 366.11 274.99 369.77 270.57 373.32C268.37 375.08 266.24 377.65 263.75 378.89C262.27 376.96 263.21 364.83 263.21 361.75C263.19 350.33 263.17 338.92 263.22 327.5C263.24 322.34 262.32 316.27 263.4 311.25C270.81 309.75 278.22 308.25 285.63 306.75C280.34 301.52 275.04 296.29 269.75 291.06C262.81 291.98 256.4 293.34 249.34 291.8C234.72 288.62 223.66 276.85 221.21 262.15C220.06 255.3 222.47 250.1 222.86 243.75C214.49 235.57 206.12 227.39 197.75 219.21C193.28 220.61 189.03 224.28 185.15 226.89C174.55 233.99 159.34 246.13 152.28 256.75C156.09 263 163 268.47 168.44 273.31C184.26 287.39 202.26 299.16 222.48 305.75C227.85 307.5 233.67 309.06 239.28 309.87C242.46 310.34 245.84 310.14 248.9 311.2C248.9 333.72 248.9 356.23 248.9 378.75C245.9 377.81 243 374.3 240.42 372.33C235.16 368.34 229.73 364.6 224.1 361.17C208.2 351.49 189.88 345.69 171.67 342.17C157.08 339.34 142.11 338.31 127.25 338.59C123.4 338.66 112.88 340.21 110.35 336.93C107.8 333.61 109.13 327.21 109.14 323.25C109.14 311.25 109.08 299.25 109.15 287.25C109.37 250.25 109.2 213.25 109.13 176.25C109.12 165.25 109.13 154.25 109.14 143.25C109.14 139.38 107.93 133.23 109.39 129.64C111.39 124.72 119.14 126.37 123.25 126.52C136.57 127.02 149.78 128.38 162.89 130.8C185.38 134.94 208.77 140.63 228.38 152.84C235.06 157 244.67 162.69 247.79 170.4C250.03 175.95 249.28 196.1 248.79 202.75ZM188.81 185.14C184.53 186.2 182.77 191.54 185.2 195.06C189.11 200.72 199.68 209.47 204.98 214.76C232.26 241.93 258.92 269.89 286.82 296.41C294.76 303.96 302.04 312.25 310.15 319.61C313.46 322.62 317.86 324.65 321.55 320.79C324.49 317.71 323.32 313.84 320.62 311.15C312.86 303.42 305 295.73 297.11 288.13C270.03 262.08 244.18 234.72 217.27 208.48C211.03 202.4 204.89 196.18 198.75 189.99C195.96 187.17 193.23 184.03 188.81 185.14ZM242.89 388.25C239.88 388.8 235 386.29 231.95 385.3C225.25 383.12 218.1 381.48 211.18 380.16C197.78 377.61 184.34 376.21 170.75 375.12C161.31 374.36 151.99 374.57 142.83 371.84C135.32 369.6 128.91 364.79 123.97 358.79C122.75 357.31 120.22 354.68 120.33 352.75C122.81 351.37 126.43 351.59 129.25 351.33C137.9 350.53 147.1 350.61 155.75 351.4C185.38 354.1 223.44 363.47 242.89 388.25ZM391.12 352.75C389.88 360.29 376.46 368.65 369.91 371.21C360.47 374.91 350.23 374.47 340.25 375.14C326.51 376.08 312.83 377.42 299.33 380.16C292.82 381.48 286.26 383.32 279.93 385.23C276.86 386.16 272.08 388.87 269.1 388.25C289.12 363.15 326.86 353.51 357.25 351.31C365.54 350.71 373.97 350.77 382.25 351.38C384.87 351.58 388.99 351.28 391.12 352.75Z" />
  </svg>
`,we=[];let Aa=1;function de(){window.dispatchEvent(new CustomEvent("oppai-downloads",{detail:we.map(e=>({...e}))}))}function La(){return we.map(e=>({...e}))}function ir(e,t){const i={id:Aa++,label:e,progress:.02,state:"running"};return we.unshift(i),de(),t(a=>{i.state==="running"&&(i.progress=Math.max(i.progress,Math.min(.98,a)),de())}).then(()=>{i.progress=1,i.state="done",de(),window.dispatchEvent(new CustomEvent("oppai-download-complete",{detail:{id:i.id}}))}).catch(a=>{i.state="error",i.error=a instanceof Error?a.message:"Download failed",de()}),i.id}function Ma(e){const t=we.findIndex(i=>i.id===e);t>=0&&(we.splice(t,1),de())}const Pa=["completed","failed","cancelled"];function W(e){return Pa.includes(e)}function R(e){return!W(e)}function Ra(e){return e.state==="queued"||e.state==="uploading"||e.state==="preparing"}function Ua(e){return e.state==="paused"&&!e.needsFile}function Da(e){return e.state==="failed"}function Na(e){return R(e.state)}function Fa(e){return W(e.state)}function za(e){return`${e.name}:${e.size}:${e.lastModified??0}`}function Ba(e,t){const i=new Set(t),o=[];for(let a=0;a<e;a++)i.has(a)||o.push(a);return o}function Ha(e,t,i){const o=e*t;return{start:o,end:Math.min(o+t,i)}}function Ya(e,t){return t<=0?0:Math.ceil(e/t)}class Ga{constructor(t=8e3){this.samples=[],this.windowMs=t}sample(t,i){this.samples.push({at:i,bytes:t});const o=i-this.windowMs;for(;this.samples.length>2&&this.samples[0].at<o;)this.samples.shift()}rate(){if(this.samples.length<2)return 0;const t=this.samples[0],i=this.samples[this.samples.length-1],o=(i.at-t.at)/1e3;if(o<=0)return 0;const a=(i.bytes-t.bytes)/o;return a>0?a:0}eta(t){const i=this.rate();if(!(i<=0||t<=0))return t/i}reset(){this.samples=[]}}function Te(e){if(!Number.isFinite(e)||e<0)return"—";if(e<1024)return`${Math.round(e)} B`;const t=["KB","MB","GB","TB"];let i=e/1024,o=0;for(;i>=1024&&o<t.length-1;)i/=1024,o++;return`${i<10?i.toFixed(1):Math.round(i)} ${t[o]}`}function qa(e){return!Number.isFinite(e)||e<=0?"":`${Te(e)}/s`}function ja(e){if(e===void 0||!Number.isFinite(e)||e<=0)return"";if(e<60)return`${Math.ceil(e)}s left`;if(e<3600)return`${Math.ceil(e/60)} min left`;const t=e/3600;return`${t<10?t.toFixed(1):Math.round(t)} hr left`}function Ja(e){if(e.needsFile)return"Waiting for the file";switch(e.state){case"queued":return"Queued";case"preparing":return"Preparing";case"uploading":return"Uploading";case"paused":return"Paused";case"processing":return"Processing on the server";case"completed":return"Completed";case"failed":return"Failed";case"cancelled":return"Cancelled"}}function Wa(e){return e.state==="completed"?1:e.size?Math.max(0,Math.min(1,e.sentBytes/e.size)):0}const Ka=["queued","preparing","uploading","paused","processing","completed","failed","cancelled"];function Va(e){if(!Array.isArray(e))return[];const t=[];for(const i of e){if(!i||typeof i!="object")continue;const o=i;if(typeof o.id!="string"||!o.id||typeof o.name!="string"||typeof o.size!="number"||!Number.isFinite(o.size)||o.size<0)continue;const a=typeof o.state=="string"&&Ka.includes(o.state)?o.state:"paused",s=(r,l)=>typeof r=="number"&&Number.isFinite(r)&&r>=0?r:l;t.push({id:o.id,sessionId:typeof o.sessionId=="string"?o.sessionId:void 0,name:o.name,size:o.size,mime:typeof o.mime=="string"?o.mime:"",destination:typeof o.destination=="string"?o.destination:"Library",state:a,sentBytes:Math.min(s(o.sentBytes,0),o.size),retries:s(o.retries,0),error:typeof o.error=="string"?o.error:void 0,mediaId:typeof o.mediaId=="number"&&o.mediaId>0?o.mediaId:void 0,addedAt:s(o.addedAt,0),position:s(o.position,t.length)})}return t}function Xa(e,t){const i=new Map(t.map(s=>[s.id,s])),o=new Set,a=[];for(const s of e){const r=s.sessionId?i.get(s.sessionId):void 0;if(!r){W(s.state)?a.push(s):a.push({...s,state:"failed",error:"the server no longer has this upload"});continue}o.add(r.id),a.push(qt(s,r))}for(const s of t)o.has(s.id)||a.push(qt({id:`session:${s.id}`,sessionId:s.id,name:s.filename||"Unnamed upload",size:s.size,mime:"",destination:"Library",state:"paused",sentBytes:s.receivedBytes,retries:0,addedAt:0,position:a.length},s));return a}function qt(e,t){const i={...e,sessionId:t.id,size:t.size||e.size};switch(t.status){case"completed":return{...i,state:"completed",sentBytes:i.size,mediaId:t.mediaId,error:void 0};case"failed":return{...i,state:"failed",error:t.error||"the server could not finish this upload"};case"cancelled":return{...i,state:"cancelled"};default:return{...i,state:"paused",sentBytes:Math.max(t.receivedBytes,0)}}}function it(e){return e.slice().sort((t,i)=>t.position-i.position).map((t,i)=>({...t,position:i}))}function Za(e,t,i){const o=it(e).filter(c=>c.state==="queued"||c.state==="paused"),a=o.findIndex(c=>c.id===t),s=a+i;if(a<0||s<0||s>=o.length)return e;const r=o[a],l=o[s];return e.map(c=>c.id===r.id?{...c,position:l.position}:c.id===l.id?{...c,position:r.position}:c)}const jt="oppai_uploads",Qa=4*1024*1024,es=5,ts=e=>Math.min(3e4,500*2**e);class is{constructor(){this.entries=[],this.files=new Map,this.listeners=new Set,this.meters=new Map,this.aborters=new Map,this.running=!1,this.restored=!1}subscribe(t){return this.listeners.add(t),t(this.snapshot()),()=>this.listeners.delete(t)}snapshot(){return it(this.entries).map(t=>({...t}))}activeCount(){return this.entries.filter(t=>R(t.state)).length}publish(){const t=this.snapshot();for(const i of this.listeners)i(t);this.persist(),typeof window<"u"&&window.dispatchEvent(new CustomEvent("oppai-uploads",{detail:t}))}persist(){try{const t=this.entries.map(i=>({id:i.id,sessionId:i.sessionId,name:i.name,size:i.size,mime:i.mime,destination:i.destination,state:i.state==="uploading"||i.state==="preparing"||i.state==="queued"?"paused":i.state,sentBytes:i.sentBytes,retries:i.retries,error:i.error,mediaId:i.mediaId,addedAt:i.addedAt,position:i.position}));localStorage.setItem(jt,JSON.stringify(t))}catch{}}async restore(){if(this.restored||!ge())return;this.restored=!0;let t=[];try{t=Va(JSON.parse(localStorage.getItem(jt)??"[]"))}catch{t=[]}let i=[];try{i=(await g.listUploadSessions()).items??[]}catch{this.entries=t.map(o=>this.hydrate(o,!0)),this.publish();return}this.entries=Xa(t,i).map(o=>this.hydrate(o,R(o.state))),this.publish()}hydrate(t,i){return{...t,bytesPerSecond:0,etaSeconds:void 0,needsFile:i&&!W(t.state)&&!this.files.has(t.id)}}add(t,i="Library"){let o=0,a=this.entries.length;for(const s of Array.from(t)){const r=za(s),l=this.entries.find(h=>h.id===r);if(l&&R(l.state)){l.needsFile&&(this.files.set(r,s),l.needsFile=!1,l.state="queued",l.error=void 0);continue}this.files.set(r,s);const c={id:r,name:s.name,size:s.size,mime:s.type||"",destination:i,state:"queued",sentBytes:0,bytesPerSecond:0,retries:0,addedAt:Date.now(),position:a++,sessionId:l==null?void 0:l.sessionId};this.entries=this.entries.filter(h=>h.id!==r).concat(c),o++}return o&&this.publish(),this.pump(),o}pause(t){var o,a;const i=this.find(t);!i||W(i.state)||(i.state="paused",i.bytesPerSecond=0,i.etaSeconds=void 0,(o=this.meters.get(t))==null||o.reset(),(a=this.aborters.get(t))==null||a.abort(),this.publish())}resume(t){const i=this.find(t);!i||i.state!=="paused"||i.needsFile||(i.state="queued",i.error=void 0,this.publish(),this.pump())}retry(t){const i=this.find(t);i&&(i.state="queued",i.error=void 0,i.retries=0,this.publish(),this.pump())}async cancel(t){var o;const i=this.find(t);if(i&&((o=this.aborters.get(t))==null||o.abort(),i.state="cancelled",i.bytesPerSecond=0,i.etaSeconds=void 0,this.files.delete(t),this.publish(),i.sessionId))try{await g.cancelUploadSession(i.sessionId)}catch{}}remove(t){const i=this.find(t);!i||R(i.state)||(this.entries=this.entries.filter(o=>o.id!==t),this.files.delete(t),this.meters.delete(t),i.sessionId&&g.cancelUploadSession(i.sessionId).catch(()=>{}),this.publish())}clearFinished(){const t=this.entries.filter(i=>W(i.state));this.entries=this.entries.filter(i=>R(i.state));for(const i of t)this.files.delete(i.id),this.meters.delete(i.id),i.sessionId&&g.cancelUploadSession(i.sessionId).catch(()=>{});this.publish()}move(t,i){this.entries=Za(this.entries,t,i),this.publish()}find(t){return this.entries.find(i=>i.id===t)}async pump(){if(!this.running){this.running=!0;try{for(;;){const t=it(this.entries).find(o=>o.state==="queued"&&!o.needsFile);if(!t)return;const i=this.find(t.id);if(!i)return;await this.run(i)}}finally{this.running=!1}}}async run(t){const i=this.files.get(t.id);if(!i){t.state="paused",t.needsFile=!0,this.publish();return}const o=new AbortController;this.aborters.set(t.id,o);const a=new Ga;this.meters.set(t.id,a);try{t.state="preparing",t.error=void 0,this.publish();const s=await g.createUploadSession({filename:i.name,size:i.size,mime:i.type||void 0,fingerprint:t.id,chunkSize:Qa});t.sessionId=s.id,t.sentBytes=s.receivedBytes;const r=s.chunkSize,l=s.chunkCount||Ya(i.size,r);let c=Ba(l,s.received??[]);t.state="uploading",a.sample(t.sentBytes,Date.now()),this.publish();for(const p of c){if(ne(t))return;const{start:m,end:y}=Ha(p,r,i.size);if(await this.sendChunk(t,s.id,p,i.slice(m,y),o.signal),ne(t))return;t.sentBytes=Math.min(i.size,t.sentBytes+(y-m)),a.sample(t.sentBytes,Date.now()),t.bytesPerSecond=a.rate(),t.etaSeconds=a.eta(i.size-t.sentBytes),this.publish()}if(ne(t))return;t.state="processing",t.bytesPerSecond=0,t.etaSeconds=void 0,this.publish();const h=await g.completeUploadSession(s.id);t.state="completed",t.sentBytes=i.size,t.mediaId=h.id,this.files.delete(t.id),this.publish(),typeof window<"u"&&window.dispatchEvent(new CustomEvent("oppai-upload-complete",{detail:{id:h.id,name:i.name,deduped:h.deduped}}))}catch(s){if(ne(t))return;t.state="failed",t.bytesPerSecond=0,t.etaSeconds=void 0,t.error=as(s),this.publish()}finally{this.aborters.delete(t.id)}}async sendChunk(t,i,o,a,s){for(let r=0;;r++){if(ne(t))return;try{const l=new Headers({"Content-Type":"application/octet-stream"}),c=ge();c&&l.set("Authorization",`Bearer ${c}`);const h=await fetch(`/api/uploads/${i}/chunk/${o}`,{method:"PUT",headers:l,body:a,signal:s});if(h.ok){r>0&&(t.retries+=1);return}const m=(await h.json().catch(()=>({}))).error||h.statusText||`HTTP ${h.status}`;throw h.status<500?new Jt(m):new Error(m)}catch(l){if(s.aborted)return;if(l instanceof Jt||r>=es)throw l}t.retries+=1,this.publish(),await os(ts(r),s)}}}function ne(e){return e.state==="paused"||e.state==="cancelled"}class Jt extends Error{}function os(e,t){return new Promise(i=>{const o=setTimeout(i,e);t.addEventListener("abort",()=>{clearTimeout(o),i()},{once:!0})})}function as(e){return e instanceof Error?e.name==="AbortError"?"Upload stopped":e.message||"Upload failed":"Upload failed"}const L=new is;function bt(){var e;return((e=window.matchMedia)==null?void 0:e.call(window,"(prefers-reduced-motion: reduce)").matches)??!1}const ss=260;function or(e,t="anim-exit"){return!e||bt()?Promise.resolve():new Promise(i=>{let o=!1;const a=()=>{o||(o=!0,e.removeEventListener("animationend",a),e.classList.remove(t),i())};e.addEventListener("animationend",a,{once:!0}),e.classList.add(t),setTimeout(a,ss)})}function rs(e){const t=document;if(bt()||typeof t.startViewTransition!="function"){e();return}t.startViewTransition(e)}function ar(e,t="anim-arrive"){!e||bt()||(e.classList.add(t),e.addEventListener("animationend",()=>e.classList.remove(t),{once:!0}))}var ns=Object.defineProperty,ls=Object.getOwnPropertyDescriptor,vt=(e,t,i,o)=>{for(var a=o>1?void 0:o?ls(t,i):t,s=e.length-1,r;s>=0;s--)(r=e[s])&&(a=(o?r(t,i,a):r(a))||a);return o&&a&&ns(t,i,a),a};function le(e){window.dispatchEvent(new CustomEvent("oppai-menu",{detail:e}))}function ds(e){const t=window.getSelection();return t&&!t.isCollapsed?!0:e.composedPath().some(i=>{const o=i;if(!(o!=null&&o.tagName))return!1;const a=o.tagName.toLowerCase();return a==="input"||a==="textarea"||a==="a"||o.isContentEditable===!0})}const F={};let xe=class extends U{constructor(){super(...arguments),this.request=null,this.placed={left:0,top:0},this.onRequest=e=>{const t=e.detail.items.reduce((i,o)=>(o.label?i.push(o):i.length&&i[i.length-1].label&&i.push(F),i),[]);for(;t.length&&!t[t.length-1].label;)t.pop();t.length&&(this.request={...e.detail,items:t},this.placed={left:e.detail.x,top:e.detail.y},this.setAttribute("open",""),this.position())},this.close=()=>{this.request&&(this.request=null,this.removeAttribute("open"))},this.onKey=e=>{var a;if(!this.request)return;if(e.key==="Escape"){e.stopPropagation(),this.close();return}if(e.key!=="ArrowDown"&&e.key!=="ArrowUp")return;const t=[...this.renderRoot.querySelectorAll("button:not(:disabled)")];if(!t.length)return;e.preventDefault();const i=t.indexOf((a=this.shadowRoot)==null?void 0:a.activeElement),o=e.key==="ArrowDown"?1:-1;t[(i+o+t.length)%t.length].focus()}}connectedCallback(){super.connectedCallback(),window.addEventListener("oppai-menu",this.onRequest),window.addEventListener("resize",this.close),window.addEventListener("blur",this.close),window.addEventListener("scroll",this.close,!0),window.addEventListener("keydown",this.onKey,!0)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("oppai-menu",this.onRequest),window.removeEventListener("resize",this.close),window.removeEventListener("blur",this.close),window.removeEventListener("scroll",this.close,!0),window.removeEventListener("keydown",this.onKey,!0)}async position(){var l;await this.updateComplete;const e=this.renderRoot.querySelector(".menu"),t=this.request;if(!e||!t)return;const{width:i,height:o}=e.getBoundingClientRect(),a=8,s=t.x+i+a>window.innerWidth?Math.max(a,t.x-i):t.x,r=t.y+o+a>window.innerHeight?Math.max(a,t.y-o):t.y;this.placed={left:s,top:r},await this.updateComplete,(l=this.renderRoot.querySelector("button:not(:disabled)"))==null||l.focus({preventScroll:!0})}pick(e){var t;this.close(),(t=e.run)==null||t.call(e)}render(){const e=this.request;return e?d`
      <div class="scrim" @pointerdown=${this.close} @contextmenu=${t=>{t.preventDefault(),this.close()}}></div>
      <div class="menu" role="menu" style=${`left:${this.placed.left}px; top:${this.placed.top}px;`}>
        ${e.title?d`<div class="cap">${e.title}</div>`:u}
        ${e.items.map(t=>t.label?d`<button role="menuitem" class=${t.danger?"danger":""} ?disabled=${t.disabled}
              @click=${()=>this.pick(t)}>
              ${t.icon?d`<span class="material-symbols-rounded">${t.icon}</span>`:u}
              <span class="label">${t.label}</span>
              ${t.hint?d`<span class="hint">${t.hint}</span>`:u}
            </button>`:d`<hr />`)}
      </div>
    `:u}};xe.styles=[lt,E`
    :host { position: fixed; inset: 0; z-index: 400; display: none; }
    :host([open]) { display: block; }
    .scrim { position: absolute; inset: 0; }
    .menu {
      position: absolute; min-width: 208px; max-width: 280px; padding: 6px;
      background: var(--md-sys-color-surface-container-high, #302A23);
      border: 1px solid var(--md-sys-color-outline-variant, #52453A);
      border-radius: 8px; box-shadow: 0 8px 26px rgba(0,0,0,.42);
      font: 500 14px/1.2 "gg sans", "Noto Sans", Roboto, system-ui, sans-serif;
      color: var(--md-sys-color-on-surface);
      animation: menu-in .12s cubic-bezier(0.2, 0, 0, 1) both;
    }
    @keyframes menu-in { from { opacity: 0; transform: scale(.96) translateY(-4px); } }
    .cap {
      padding: 6px 8px 4px; color: var(--md-sys-color-on-surface-variant);
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    hr { height: 1px; margin: 4px 6px; border: 0; background: var(--md-sys-color-outline-variant); }
    button {
      display: flex; align-items: center; gap: 10px; width: 100%; padding: 7px 8px;
      border: 0; border-radius: 4px; background: transparent; color: inherit;
      font: inherit; text-align: left; cursor: pointer;
    }
    button .material-symbols-rounded { font-size: 18px; opacity: .85; }
    button .label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    button .hint { color: var(--md-sys-color-on-surface-variant); font-size: 11px; font-weight: 400; }
    button:hover:not(:disabled), button:focus-visible:not(:disabled) {
      background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); outline: 0;
    }
    button:hover:not(:disabled) .hint, button:focus-visible:not(:disabled) .hint { color: inherit; }
    button.danger { color: var(--md-sys-color-error); }
    button.danger:hover:not(:disabled), button.danger:focus-visible:not(:disabled) {
      background: var(--md-sys-color-error); color: var(--md-sys-color-on-error, #690005);
    }
    button:disabled { opacity: .45; cursor: default; }
    @media (prefers-reduced-motion: reduce) { .menu { animation: none; } }
  `];vt([f()],xe.prototype,"request",2);vt([f()],xe.prototype,"placed",2);xe=vt([ae("oppai-context-menu")],xe);function cs(e){return e.composedPath().some(t=>t instanceof HTMLElement&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"||t.isContentEditable))}const _={image:{label:"Photos",typeLabel:"PHOTO",icon:"photo_library",aspect:"4 / 3"},gif:{label:"GIFs",typeLabel:"GIF",icon:"animation",aspect:"1 / 1"},video:{label:"Videos",typeLabel:"VIDEO",icon:"movie",aspect:"16 / 9"},game:{label:"Games",typeLabel:"GAME",icon:"sports_esports",aspect:"3 / 4"},comic:{label:"Comics",typeLabel:"COMIC",icon:"auto_stories",aspect:"2 / 3"}},z=["image","gif","video","game","comic"],Wt=["linear-gradient(135deg, oklch(34% 0.06 60), oklch(22% 0.05 55))","linear-gradient(135deg, oklch(33% 0.07 45), oklch(21% 0.05 40))","linear-gradient(135deg, oklch(32% 0.07 30), oklch(20% 0.05 25))","linear-gradient(135deg, oklch(34% 0.055 75), oklch(22% 0.045 70))","linear-gradient(135deg, oklch(32% 0.06 20), oklch(20% 0.05 15))"];function hs(e){return Wt[Math.abs(e.id)%Wt.length]}function ps(e){return e.kind==="image"||e.kind==="gif"||!!e.hasThumb}function us(e){const t=Math.max(0,Math.round(e)),i=Math.floor(t/60),o=t%60;return`${i}:${String(o).padStart(2,"0")}`}function Q(e){if(!e)return"";const t=["B","KB","MB","GB","TB"];let i=e,o=0;for(;i>=1024&&o<t.length-1;)i/=1024,o++;return`${i<10&&o>0?i.toFixed(1):Math.round(i)} ${t[o]}`}function ms(e){switch(e.kind){case"video":case"gif":return e.duration?us(e.duration):Q(e.size);case"image":return e.width&&e.height?`${e.width}×${e.height}`:Q(e.size);case"game":return Q(e.size);case"comic":return e.pageCount?`${e.pageCount} pages`:Q(e.size);default:return Q(e.size)}}function gs(e){return e.tags&&e.tags.length?e.tags[0].name:_[e.kind].label.replace(/s$/,"")}const Ai="oppai_favorites";function Kt(){try{const e=localStorage.getItem(Ai);return e?new Set(JSON.parse(e).filter(t=>typeof t=="number")):new Set}catch{return new Set}}function fs(e){try{localStorage.setItem(Ai,JSON.stringify([...e]))}catch{}}function ys(e){return!e||e.kind!=="image"&&e.kind!=="gif"?!1:(e.tags??[]).some(t=>t.name==="ai-generated"||t.name==="character:libby"||t.name==="libby")}const Li="oppai_comic_fit",Mi="oppai_comic_pos";function sr(){return localStorage.getItem(Li)==="width"?"width":"page"}function rr(e){try{localStorage.setItem(Li,e)}catch{}}function Pi(){try{const e=localStorage.getItem(Mi);return e?JSON.parse(e):{}}catch{return{}}}function nr(e){const t=Pi()[String(e)];return typeof t=="number"&&t>=1?t:1}function lr(e,t){try{const i=Pi();i[String(e)]=t,localStorage.setItem(Mi,JSON.stringify(i))}catch{}}const Ri="oppai.recents.v1",Ui=24;function wt(){try{const e=localStorage.getItem(Ri);if(!e)return[];const t=JSON.parse(e);return Array.isArray(t)?t.filter(i=>!!i&&typeof i=="object"&&typeof i.id=="number"&&Number.isFinite(i.id)&&typeof i.at=="number"&&Number.isFinite(i.at)).sort((i,o)=>o.at-i.at).slice(0,Ui):[]}catch{return[]}}function bs(e,t=Date.now()){const i=[{id:e,at:t},...wt().filter(o=>o.id!==e)].slice(0,Ui);try{localStorage.setItem(Ri,JSON.stringify(i))}catch{}return i}function vs(e,t=wt()){const i=new Map(e.map(a=>[a.id,a])),o=[];for(const a of t){const s=i.get(a.id);s&&o.push(s)}return o}var ws=Object.defineProperty,xs=Object.getOwnPropertyDescriptor,S=(e,t,i,o)=>{for(var a=o>1?void 0:o?xs(t,i):t,s=e.length-1,r;s>=0;s--)(r=e[s])&&(a=(o?r(t,i,a):r(a))||a);return o&&a&&ws(t,i,a),a};const $s=()=>typeof crypto.randomUUID=="function"?crypto.randomUUID().replaceAll("-",""):[...crypto.getRandomValues(new Uint8Array(16))].map(e=>e.toString(16).padStart(2,"0")).join(""),Vt=16,Xt="oppai_libby_drawer",Zt=[{id:"sweet",label:"sweet"},{id:"playful",label:"playful"},{id:"bold",label:"bold"},{id:"horny",label:"horny"}];let k=class extends U{constructor(){super(...arguments),this.items=[],this.focused=null,this.externalItems=[],this.externalFocused=null,this.where="their library",this.suppressed=!1,this.open=localStorage.getItem(Xt)==="1",this.characters=[],this.profile=null,this.characterID="libby",this.status=null,this.remarks=[],this.draft="",this.busy=!1,this.notice="",this.noticeError=!1,this.mode="playful",this.emotion="happy",this.intensity=X(),this.loaded=!1,this.progress=X(),this.remarkedOn=null,this.approvals=new Sa(()=>this.requestUpdate()),this.onPref=()=>this.requestUpdate()}connectedCallback(){super.connectedCallback(),window.addEventListener("oppai-libby-pref",this.onPref)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("oppai-libby-pref",this.onPref)}updated(e){if(!e.has("focused")&&!e.has("externalFocused"))return;const t=this.externalFocused??this.focused;if(!this.open||this.suppressed||Qe()||!t)return;const i=`${this.externalFocused?"external":"library"}:${t.id}`;if(i===this.remarkedOn)return;this.remarkedOn=i;const o=this.externalFocused?"(I have just opened the focused item from Browse. Say what you think of it.)":`(I have just opened "${t.title}". Say what you think of it.)`;this.ask("",o)}async load(){var e;if(!this.loaded){this.loaded=!0;try{const t=await g.chatWorkspace();this.profile=t.profile??null,this.characters=(t.characters??[]).filter(o=>o==null?void 0:o.id),this.characters.some(o=>o.id===this.characterID)||(this.characterID=((e=this.characters[0])==null?void 0:e.id)??"libby");const i=this.character;i!=null&&i.defaultMode&&Zt.some(o=>o.id===i.defaultMode)&&(this.mode=i.defaultMode)}catch(t){this.say(t.message||"Couldn't load your characters.",!0)}try{this.status=await g.chatStatus()}catch{}this.remarks.length||this.push({role:"assistant",content:Ft({},{intensity:this.intensity}).message})}}get character(){return this.characters.find(e=>e.id===this.characterID)}toggle(){this.open=!this.open;try{localStorage.setItem(Xt,this.open?"1":"0")}catch{}this.open&&this.load()}say(e,t=!1){this.notice=e,this.noticeError=t,t||window.setTimeout(()=>{this.notice===e&&(this.notice="")},4e3)}push(e){const t=e.role==="assistant"?{emotion:e.emotion??this.emotion,intensity:e.intensity??this.intensity}:{};this.remarks=[...this.remarks,{...e,...t,id:$s(),at:Date.now()}].slice(-60),this.scrollLog()}async scrollLog(){await this.updateComplete;const e=this.renderRoot.querySelector(".log");e&&(e.scrollTop=e.scrollHeight)}viewing(){var i;const e=this.items.slice(0,Vt).map(o=>o.id),t=this.externalItems.filter(o=>{var a;return o.id!==((a=this.externalFocused)==null?void 0:a.id)}).slice(0,Vt).map(Qt);return{focusId:(i=this.focused)==null?void 0:i.id,ids:e,external:t,focusExternal:this.externalFocused?Qt(this.externalFocused):void 0,section:this.where}}async ask(e,t){var a,s,r,l,c;const i=this.character;if(!i||this.busy)return;this.busy=!0;const o=Me(this.progress,Ci(e||t||"",this.mode));try{if(!((a=this.status)!=null&&a.enabled)&&((s=this.status)!=null&&s.configured||(r=this.status)!=null&&r.modelBackend))try{this.status=await g.chatStatus()}catch{}if(!((l=this.status)!=null&&l.enabled)){const y=this.externalFocused??this.focused,w=y?this.externalFocused?this.externalFocused.tags??[]:(((c=this.focused)==null?void 0:c.tags)??[]).map(T=>T.name):[],b=e?oa(e,this.mode,this.emotion,o.intensity,!1):Ft({kind:y==null?void 0:y.kind,tags:w},{intensity:o.intensity});this.applyMood(b.emotion,o.progress,b.intensity),this.push({role:"assistant",content:b.message});return}const h=this.remarks.map(({role:y,content:w})=>({role:y,content:w}));t&&h.push({role:"user",content:t});const p=await g.chat({mode:this.mode,messages:h,emotion:this.emotion,intensity:this.intensity,characterId:i.id,viewing:this.viewing(),outfit:i.id==="libby"?ui():"",recentMoods:this.remarks.filter(y=>y.role==="assistant"&&y.emotion).slice(-8).map(y=>y.emotion)}),m=A(p.intensity??this.intensity);if(p.declared)this.applyMood(fe(p.emotion),m,m);else{const y=Me(this.progress,m-this.intensity);this.applyMood(fe(p.emotion),y.progress,y.intensity)}this.push({role:"assistant",content:p.message,links:p.links,attachments:p.attachments,actions:p.actions})}catch(h){this.say(h.message||"She didn't answer.",!0)}finally{this.busy=!1}}applyMood(e,t,i){this.emotion=e,this.progress=t,this.intensity=Fo(i)}send(){const e=this.draft.trim();!e||this.busy||(this.draft="",this.push({role:"user",content:e}),this.ask(e))}onKey(e){e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),this.send())}render(){return Qe()||this.suppressed?u:this.open?this.renderPanel():this.renderHandle()}renderHandle(){var t;const e=((t=this.character)==null?void 0:t.name)??"Libby";return d`<button class="handle" title=${`Browse with ${e}`} aria-label=${`Open ${e}'s drawer`}
      @click=${()=>this.toggle()}>
      <span class="material-symbols-rounded">interests</span>
      Together
    </button>`}renderPanel(){const e=this.character,t=(e==null?void 0:e.name)??"Libby",i=this.externalFocused??this.focused,o=this.externalItems.length||this.items.length;return d`<aside class="panel" aria-label=${`Browsing with ${t}`}>
      <div class="head">
        <span class="channel-mark" aria-hidden="true">#</span>
        ${this.characters.length>1?d`<select aria-label="Who you are browsing with" .value=${this.characterID}
              @change=${a=>{this.characterID=a.target.value}}>
              ${this.characters.map(a=>d`<option value=${a.id}>${a.name}</option>`)}
            </select>`:d`<span class="who">${t}</span>`}
        <select aria-label="Mood" .value=${this.mode}
          @change=${a=>this.mode=a.target.value}>
          ${Zt.map(a=>d`<option value=${a.id}>${a.label}</option>`)}
        </select>
        <button title="Close" aria-label="Close the drawer" @click=${()=>this.toggle()}>
          <span class="material-symbols-rounded" style="font-size:18px; display:block;">right_panel_close</span>
        </button>
      </div>
      <div class="watching">
        ${i?`Looking at “${i.title}”`:`Watching ${this.where}${o?` · ${o} items`:""}`}
      </div>
      <div class="log">
        ${this.remarks.map(a=>this.renderRemark(a,e))}
        ${this.busy?d`<div class="thinking">${t} is looking…</div>`:u}
      </div>
      ${this.notice?d`<div class="notice ${this.noticeError?"error":""}" role=${this.noticeError?"alert":"status"}>${this.notice}</div>`:u}
      <div class="actions">
        <button ?disabled=${this.busy||!i} @click=${()=>{const a=i;a&&this.ask("",this.externalFocused?"(Tell me what you think of the focused Browse item — be specific about it.)":`(Tell me what you think of "${a.title}" — be specific about it.)`)}}>What do you think?</button>
        <button ?disabled=${this.busy||!o} @click=${()=>{this.push({role:"user",content:"Pick something for me."}),this.ask("Pick something for me.")}}>Pick one for me</button>
      </div>
      <div class="say">
        <textarea rows="1" aria-label=${`Say something to ${t}`} placeholder=${`Say something to ${t}…`}
          .value=${this.draft} @input=${a=>this.draft=a.target.value}
          @keydown=${a=>this.onKey(a)}></textarea>
        <button class="icon-btn" title="Send" aria-label="Send" ?disabled=${!this.draft.trim()||this.busy}
          @click=${()=>this.send()}>
          <span class="material-symbols-rounded">send</span>
        </button>
      </div>
    </aside>`}renderRemark(e,t){var s;const i=e.role==="user",o=i?((s=this.profile)==null?void 0:s.displayName)||"You":(t==null?void 0:t.name)||"Libby",a=new Date(e.at).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});return d`<article class="remark ${i?"from-user":""}">
      ${this.renderRemarkAvatar(e,t,o)}
      <div class="remark-body">
        <div class="remark-meta"><span class="remark-author">${o}</span><span class="remark-time">${a}</span></div>
        <span class="said">${e.content}</span>
        ${_a(e.attachments,r=>Gt(this,r),o)}
        ${Ea(e.links,r=>Gt(this,r))}
        ${ka(e.actions,this.approvals.stateOf,this.approvals.decide)}
      </div>
    </article>`}renderRemarkAvatar(e,t,i){var o;if(e.role==="user")return(o=this.profile)!=null&&o.avatarImageId?d`<span class="remark-avatar"><img src=${g.chatImageURL(this.profile.avatarImageId)} alt="" /></span>`:d`<span class="remark-avatar">${i.slice(0,2).toUpperCase()}</span>`;if((t==null?void 0:t.id)==="libby"||!t){const a=t!=null&&t.avatarImageId?g.chatImageURL(t.avatarImageId):Eo;return d`<span class="remark-avatar"><img src=${a} alt="Libby"/></span>`}return t.avatarImageId?d`<span class="remark-avatar"><img src=${g.chatImageURL(t.avatarImageId)} alt="" /></span>`:d`<span class="remark-avatar">${i.slice(0,2).toUpperCase()}</span>`}};k.styles=[lt,dt,wa,Ta,$a,yi,E`
    :host { position: fixed; inset: 0 0 0 auto; z-index: 60; pointer-events: none; display: block; }

    /* The handle: a tab on the right edge, the drawer's only permanent footprint. It
       is deliberately small and vertical — this sits over every screen in the app, so
       anything larger is a thing in the way rather than a thing available. */
    .handle {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 6px;
      writing-mode: vertical-rl;
      border: 0;
      border-radius: 12px 0 0 12px;
      padding: 14px 7px;
      background: var(--oppai-primary-container, #3b2411);
      color: var(--oppai-primary-bright, #ffb877);
      font: inherit;
      font-size: 12px;
      letter-spacing: .06em;
      cursor: pointer;
      box-shadow: -2px 0 12px rgba(0, 0, 0, .35);
    }
    .handle:hover { filter: brightness(1.12); }
    .handle .material-symbols-rounded { font-size: 18px; writing-mode: horizontal-tb; }

    .panel {
      position: absolute;
      right: 0; top: 0; bottom: 0;
      width: min(420px, 100vw);
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 0;
      box-sizing: border-box;
      background: var(--oppai-surface, #17120e);
      border-left: 1px solid var(--oppai-surface-2, rgba(255,255,255,.08));
      box-shadow: -8px 0 28px rgba(0, 0, 0, .45);
    }
    @media (prefers-reduced-motion: no-preference) {
      .panel { animation: drawer-in .18s ease-out; }
    }
    @keyframes drawer-in { from { transform: translateX(16px); opacity: 0; } }

    /* Discord's mobile conversation structure, expressed in OppaiLib's palette: a
       compact channel bar, a flat avatar-led log, and a composer fixed at the foot. */
    .head {
      min-height: 56px; flex: 0 0 auto; display: flex; align-items: center; gap: 8px;
      padding: max(0px, env(safe-area-inset-top)) 10px 0 14px;
      border-bottom: 1px solid var(--oppai-surface-2, rgba(255,255,255,.08));
      box-shadow: 0 1px 6px rgba(0,0,0,.2);
    }
    .channel-mark { opacity: .55; font-size: 24px; font-weight: 500; }
    .head .who { font-weight: 750; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .head select, .head button {
      background: var(--oppai-surface-2, rgba(255,255,255,.06)); color: inherit; border: 0;
      border-radius: 10px; padding: 6px 8px; font: inherit; font-size: 13px; cursor: pointer;
    }
    .watching {
      flex: 0 0 auto; padding: 8px 14px; font-size: 11px; opacity: .66;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      border-bottom: 1px solid var(--oppai-surface-2, rgba(255,255,255,.06));
    }
    .log { flex: 1; min-height: 0; overflow: auto; padding: 10px 0 18px; }
    .remark {
      display: grid; grid-template-columns: 50px minmax(0,1fr); align-items: start;
      padding: 7px 12px 7px 8px; font-size: 14px; line-height: 1.42;
    }
    .remark:hover { background: color-mix(in srgb, currentColor 4%, transparent); }
    .remark-avatar {
      width: 40px; height: 40px; border-radius: 50%; overflow: hidden; display: grid;
      place-items: center; background: var(--oppai-surface-2, rgba(255,255,255,.07));
      font-size: 12px; font-weight: 750; color: var(--oppai-primary-bright, #ffb877);
    }
    .remark-avatar img { width: 100%; height: 100%; display: block; object-fit: cover; object-position: top center; }
    .remark-body { min-width: 0; }
    .remark-meta { display: flex; align-items: baseline; gap: 7px; min-width: 0; margin-bottom: 1px; }
    .remark-author { font-weight: 720; color: var(--oppai-primary-bright, #ffb877); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .remark.from-user .remark-author { color: inherit; }
    .remark-time { opacity: .45; font-size: 10px; white-space: nowrap; }
    .remark .said { display: block; white-space: pre-wrap; overflow-wrap: anywhere; }
    .thinking { margin: 5px 14px 5px 58px; opacity: .6; font-size: 13px; font-style: italic; }
    .notice { margin: 4px 12px; font-size: 12px; opacity: .75; }
    .notice.error { color: var(--oppai-danger, #ff6b6b); opacity: 1; }

    .actions { display: flex; gap: 7px; flex-wrap: wrap; padding: 7px 12px 0; }
    .actions button { flex: 1; min-width: 110px; border: 1px solid var(--oppai-surface-2, rgba(255,255,255,.08));
      background: none; color: inherit; border-radius: 12px; padding: 8px 10px; font: inherit; font-size: 12px; cursor: pointer; }
    .actions button:hover:not(:disabled) { border-color: var(--oppai-primary, #f97316); color: var(--oppai-primary-bright, #ffb877); }
    .actions button:disabled { opacity: .4; cursor: default; }

    .say {
      display: flex; gap: 8px; align-items: flex-end; padding: 8px 12px max(10px, env(safe-area-inset-bottom));
      background: var(--oppai-surface, #17120e);
    }
    .say textarea { flex: 1; resize: none; background: var(--oppai-surface-2, rgba(255,255,255,.06)); color: inherit;
      border: 0; border-radius: 12px; padding: 10px 12px; font: inherit; font-size: 14px; max-height: 110px; }
    .icon-btn { border: 0; background: var(--oppai-surface-2, rgba(255,255,255,.06)); color: inherit; border-radius: 12px;
      padding: 9px; cursor: pointer; display: grid; place-items: center; }
    .icon-btn:hover { background: var(--oppai-primary-container, #3b2411); color: var(--oppai-primary-bright, #ffb877); }
    .icon-btn:disabled { opacity: .4; cursor: default; }
    @media (max-width: 600px) {
      .panel { width: 100vw; }
      .handle { top: auto; bottom: max(92px, calc(74px + env(safe-area-inset-bottom))); transform: none; }
    }
  `];S([O({attribute:!1})],k.prototype,"items",2);S([O({attribute:!1})],k.prototype,"focused",2);S([O({attribute:!1})],k.prototype,"externalItems",2);S([O({attribute:!1})],k.prototype,"externalFocused",2);S([O()],k.prototype,"where",2);S([O({type:Boolean})],k.prototype,"suppressed",2);S([f()],k.prototype,"open",2);S([f()],k.prototype,"characters",2);S([f()],k.prototype,"profile",2);S([f()],k.prototype,"characterID",2);S([f()],k.prototype,"status",2);S([f()],k.prototype,"remarks",2);S([f()],k.prototype,"draft",2);S([f()],k.prototype,"busy",2);S([f()],k.prototype,"notice",2);S([f()],k.prototype,"noticeError",2);S([f()],k.prototype,"mode",2);S([f()],k.prototype,"emotion",2);S([f()],k.prototype,"intensity",2);k=S([ae("oppai-libby-drawer")],k);function Qt(e){return{title:e.title,kind:e.kind,tags:e.tags}}function ks(e){var i;if(e==="home"||e==="search")return"their whole library";if(e==="favorites")return"their favorites";if(e==="browse")return"an outside site they are browsing";if(e==="imagegen")return"the image studio, making pictures";if(e==="studio")return"the outfit studio, dressing me up";if(e==="settings")return"the settings screen";const t=(i=_[e])==null?void 0:i.label;return t?`their ${t.toLowerCase()}`:"their library"}var Ss=Object.defineProperty,Is=Object.getOwnPropertyDescriptor,$=(e,t,i,o)=>{for(var a=o>1?void 0:o?Is(t,i):t,s=e.length-1,r;s>=0;s--)(r=e[s])&&(a=(o?r(t,i,a):r(a))||a);return o&&a&&Ss(t,i,a),a};const Di={settings:()=>G(()=>import("./settings-BBgrVJso.js"),__vite__mapDeps([0,1,2]),import.meta.url),browse:()=>G(()=>import("./browse-BCXtTNM9.js"),__vite__mapDeps([3,4]),import.meta.url),imagegen:()=>G(()=>import("./imagegen-CnIJ-aA8.js"),__vite__mapDeps([5,4]),import.meta.url),chat:()=>G(()=>import("./chat-CrlzhnBU.js"),__vite__mapDeps([6,4,1]),import.meta.url),viewer:()=>G(()=>import("./viewer-CNzma2Nh.js"),[],import.meta.url),scrape:()=>G(()=>import("./scrape-dialog-dpEReVBh.js"),__vite__mapDeps([7,8,4]),import.meta.url)};function ot(e){return e==="studio"?"imagegen":e in Di?e:null}const je=new Map;function Cs(e){const t=ot(e);if(!t)return Promise.resolve();const i=je.get(t);if(i)return i;const o=Di[t],a=o().catch(s=>{throw je.delete(t),s});return je.set(t,a),a}const Es=[{id:"home",label:"Home",icon:"home"},...z.map(e=>({id:e,label:_[e].label,icon:_[e].icon})),{id:"favorites",label:"Favorites",icon:"favorite"},{id:"collections",label:"Collections",icon:"bookmarks"},{id:"browse",label:"Browse",icon:"explore"},{id:"imagegen",label:"Create",icon:"auto_awesome"},{id:"studio",label:"Studio",icon:"checkroom"},{id:"chat",label:"Chat",icon:"chat_bubble"}];let v=class extends U{constructor(){super(...arguments),this.items=[],this.total=0,this.sort="newest",this.stats=null,this.home=null,this.chipTags=[],this.collections=[],this.openCollection=null,this.recents=wt(),this.loading=!1,this.loadingMore=!1,this.viewReady=new Set,this.section="home",this.selectedId=null,this.editMediaId=0,this.search="",this.filters={},this.favorites=Kt(),this.uploadOpen=!1,this.dragActive=!1,this.selectMode=!1,this.selected=new Set,this.busy=!1,this.downloads=La(),this.browseFrame={items:[],focused:null,where:"Browse"},this.pendingUploads=[],this.viewerList=[],this.onIncognito=()=>{this.requestUpdate()},this.onContextMenu=e=>{var r;if(e.defaultPrevented||ds(e))return;const t=e.composedPath(),i=l=>t.find(c=>{var h,p;return(p=(h=c==null?void 0:c.classList)==null?void 0:h.contains)==null?void 0:p.call(h,l)}),o=t.some(l=>{var c,h;return((h=(c=l==null?void 0:l.tagName)==null?void 0:c.toLowerCase)==null?void 0:h.call(c))==="oppai-viewer"}),a=Number((r=i("tile"))==null?void 0:r.dataset.id);let s;Number.isFinite(a)&&a>0?s=this.tileMenuItems(a,e):o&&this.selectedId!=null?s=this.tileMenuItems(this.selectedId,e,!0):s=this.shellMenuItems(),s.length&&(e.preventDefault(),le({x:e.clientX,y:e.clientY,items:s}))},this.onDownloads=e=>{this.downloads=e.detail},this.onDownloadComplete=()=>this.refresh(),this.onKey=e=>{var i;if(this.selectedId==null||this.uploadOpen||cs(e))return;const t=((i=this.items.find(o=>o.id===this.selectedId))==null?void 0:i.kind)==="comic";switch(e.key){case"ArrowRight":if(t)return;e.preventDefault(),this.stepItem(1);break;case"ArrowLeft":if(t)return;e.preventDefault(),this.stepItem(-1);break;case"Escape":this.closeItem();break}},this.stepItem=e=>{if(this.selectedId==null)return;const t=this.viewerList.indexOf(this.selectedId);if(t<0)return;const i=t+e;i<0||i>=this.viewerList.length||(this.selectedId=this.viewerList[i])},this.onOpenMedia=async e=>{const{id:t}=e.detail;if(!this.items.some(i=>i.id===t))try{const i=await g.getMedia(t);this.items=[i,...this.items],this.noteServerFavorites([i])}catch{x("That one isn't in the library any more.","error");return}this.openItem(t,this.items)},this.closeItem=()=>{this.selectedId=null},this.viewerPushed=!1,this.onPopState=()=>{this.viewerPushed&&(this.viewerPushed=!1,this.selectedId!=null&&(this.selectedId=null))},this.toggleSelectMode=()=>{this.selectMode=!this.selectMode,this.selectMode||(this.selected=new Set)},this.toggleUpload=()=>{this.uploadOpen=!this.uploadOpen,this.dragActive=!1},this.onUploadDone=e=>{const t=e.detail;this.pendingUploads.push(t==null?void 0:t.id),this.uploadSettle&&clearTimeout(this.uploadSettle),this.uploadSettle=window.setTimeout(()=>void this.announceUploads(),900)}}connectedCallback(){super.connectedCallback(),yt(this,"library"),this.migrateLocalFavorites().then(()=>this.refresh()),this.addEventListener("contextmenu",this.onContextMenu),this.detachLongPress=va(this),this.addEventListener(tt,this.onOpenMedia),window.addEventListener("keydown",this.onKey),window.addEventListener("oppai-downloads",this.onDownloads),window.addEventListener("oppai-download-complete",this.onDownloadComplete),window.addEventListener("oppai-upload-complete",this.onUploadDone),window.addEventListener("oppai-incognito",this.onIncognito),window.addEventListener("popstate",this.onPopState)}disconnectedCallback(){var e,t,i,o;super.disconnectedCallback(),window.removeEventListener("popstate",this.onPopState),this.removeEventListener("contextmenu",this.onContextMenu),(e=this.detachLongPress)==null||e.call(this),this.removeEventListener(tt,this.onOpenMedia),window.removeEventListener("keydown",this.onKey),window.removeEventListener("oppai-downloads",this.onDownloads),window.removeEventListener("oppai-download-complete",this.onDownloadComplete),window.removeEventListener("oppai-upload-complete",this.onUploadDone),window.removeEventListener("oppai-incognito",this.onIncognito),this.uploadSettle&&clearTimeout(this.uploadSettle),this.searchDebounce&&clearTimeout(this.searchDebounce),(t=this.pageAbort)==null||t.abort(),(i=this.homeAbort)==null||i.abort(),(o=this.moreObserver)==null||o.disconnect()}updated(e){var i,o,a;(i=super.updated)==null||i.call(this,e);const t=(o=this.renderRoot)==null?void 0:o.querySelector(".more-sentinel");if(!t){(a=this.moreObserver)==null||a.disconnect(),this.moreObserver=void 0;return}this.moreObserver||(this.moreObserver=new IntersectionObserver(s=>{s.some(r=>r.isIntersecting)&&this.loadMore()},{rootMargin:"600px 0px"})),this.moreObserver.disconnect(),this.moreObserver.observe(t)}tileMenuItems(e,t,i=!1){const o=this.items.find(r=>r.id===e);if(!o)return[];const a=this.favorites.has(e),s=pa(o);return[...i?[]:[{label:"Open",icon:"open_in_full",run:()=>this.openItem(e)}],{label:a?"Remove from favorites":"Add to favorites",icon:a?"heart_minus":"favorite",run:()=>this.toggleFavorite(e)},...i?[]:[{label:this.selectMode?"Toggle selection":"Select items",icon:"check_box",run:()=>this.selectMode?this.toggleSelected(e):this.toggleSelectMode()}],{label:"Add to collection…",icon:"playlist_add",run:()=>this.openCollectionMenu([e],t.clientX,t.clientY)},...this.openCollection?[{label:`Take off "${this.openCollection.name}"`,icon:"playlist_remove",run:()=>void this.removeFromOpenCollection(e)}]:[],F,{label:"Show Libby now",icon:"send",disabled:!s,hint:"attach to a message",run:()=>void this.share(o,{id:"libby",name:"Libby"})},{label:"Save for Libby to send later",icon:"add_photo_alternate",disabled:!s,hint:"her gallery",run:()=>void this.saveForLater(o)},{label:"Share with…",icon:"ios_share",disabled:!s,run:()=>void this.openShareMenu(o,t.clientX,t.clientY)},...o.kind==="image"||o.kind==="gif"?[{label:"Is this Libby?",icon:"face_retouching_natural",run:()=>this.openIdentityMenu(o,t.clientX,t.clientY)}]:[],...ys(o)?[{label:"Edit in the studio",icon:"brush",run:()=>this.editInStudio(o.id)}]:[],{label:"Copy title",icon:"content_copy",run:()=>void navigator.clipboard.writeText(o.title)},{label:"Open the file",icon:"open_in_new",run:()=>window.open(g.streamURL(e),"_blank")},F,{label:"Delete",icon:"delete",danger:!0,run:()=>void this.deleteOne(e)}]}openIdentityMenu(e,t,i){const o=async(a,s=!1)=>{try{await g.markLibbyIdentity({mediaId:e.id,isLibby:a,reference:s}),x(a?s?"Saved as one of the pictures of me.":"Noted — that one's me.":"Noted — that one isn't me."),this.refresh()}catch(r){x(r.message||"Couldn't save that.","error")}};le({x:t,y:i,title:`"${e.title}"`,items:[{label:"Yes, that's Libby",icon:"check",run:()=>void o(!0)},{label:"Yes — and use it as a reference",icon:"star",run:()=>void o(!0,!0)},F,{label:"No, that isn't her",icon:"close",run:()=>void o(!1)}]})}async openShareMenu(e,t,i){let o=[];try{o=(await g.chatWorkspace()).characters??[]}catch(a){x(a.message||"Couldn't load your chat characters.","error");return}if(!o.length){x("No chat characters yet — add one in Chat first.","error");return}le({x:t,y:i,title:`Share "${e.title}" with`,items:o.map(a=>({label:a.name,icon:"person",run:()=>void this.share(e,a)}))})}async share(e,t){try{await ma(e,t.id),this.closeItem(),this.selectSection("chat")}catch(i){x(i.message||`Couldn't share with ${t.name}.`,"error")}}async saveForLater(e){x(`Saving "${e.title}" for me…`);try{const t=await ga(e,"libby");x(t.subject==="other"?`Kept it. It doesn't look like me, so it's on my "someone else" shelf — tell me otherwise under Chat › Images.`:"Kept it — I can send that one later.")}catch(t){x(t.message||"Couldn't save that for Libby.","error")}}shellMenuItems(){const e=Ae()!=="light";return[{label:"Add media",icon:"add",run:()=>this.toggleUpload()},{label:"Import from a URL",icon:"link",run:()=>this.openScrape()},{label:"Refresh library",icon:"refresh",run:()=>void this.refresh()},F,{label:"Home",icon:"home",run:()=>this.selectSection("home")},{label:"Favorites",icon:"favorite",run:()=>this.selectSection("favorites")},{label:"Chat",icon:"chat_bubble",run:()=>this.selectSection("chat")},{label:"Create",icon:"auto_awesome",run:()=>this.selectSection("imagegen")},{label:"Outfit studio",icon:"checkroom",run:()=>this.selectSection("studio")},F,{label:e?"Switch to light theme":"Switch to dark theme",icon:e?"light_mode":"dark_mode",run:()=>this.flipTheme()},{label:"Settings",icon:"settings",run:()=>this.selectSection("settings")}]}flipTheme(){const e=Ae()==="light"?"dark":"light";vo(e),ct(e)}async deleteOne(e){const t=this.items.find(i=>i.id===e);if(!(!t||!confirm(`Delete "${t.title}"? This cannot be undone.`))){this.busy=!0;try{await g.deleteMedia(e),this.selectedId===e&&this.closeItem(),await this.refresh()}catch(i){x(`Couldn't delete that: ${i.message}`,"error")}finally{this.busy=!1}}}get query(){const e=this.search.trim();if(e)return{q:e,sort:this.sort};if(this.section==="favorites")return{favorite:!0,sort:this.sort};if(z.includes(this.section)){const t=this.section,i=this.filters[t];return{kind:t,tag:i&&i!=="All"?i:void 0,sort:this.sort}}return{sort:this.sort}}queryKey(e){return[e.kind??"",e.q??"",e.tag??"",e.favorite?"fav":"",e.sort??"newest"].join("|")}async reload(){var o;const e=this.query,t=this.queryKey(e);(o=this.pageAbort)==null||o.abort();const i=new AbortController;this.pageAbort=i,this.loading=!0;try{const a=await g.listMedia({...e,limit:ee,offset:0,signal:i.signal});if(this.queryKey(this.query)!==t)return;this.items=a.items??[],this.total=a.total??this.items.length,this.noteServerFavorites(this.items)}catch(a){if(i.signal.aborted)return;x(a.message||"Couldn't load the library.","error")}finally{this.pageAbort===i&&(this.loading=!1)}}async loadMore(){if(this.loading||this.loadingMore||this.items.length>=this.total)return;const e=this.query,t=this.queryKey(e);this.loadingMore=!0;try{const i=await g.listMedia({...e,limit:ee,offset:this.items.length});if(this.queryKey(this.query)!==t)return;const o=new Set(this.items.map(a=>a.id));this.items=[...this.items,...(i.items??[]).filter(a=>!o.has(a.id))],this.total=i.total??this.total,this.noteServerFavorites(i.items??[])}catch{}finally{this.loadingMore=!1}}async loadHome(){var i;const e=new AbortController;(i=this.homeAbort)==null||i.abort(),this.homeAbort=e;const t=o=>g.listMedia({...o,limit:12,signal:e.signal}).then(a=>a.items??[]).catch(()=>[]);try{const[o,a,s,r,...l]=await Promise.all([g.libraryStats(e.signal).catch(()=>null),g.resumeShelf(e.signal).then(h=>h.items??[]).catch(()=>[]),t({favorite:!0}),t({}),...z.map(h=>t({kind:h}))]);if(e.signal.aborted)return;const c={};z.forEach((h,p)=>c[h]=l[p]??[]),this.stats=o,this.home={resume:a,favorites:s,newest:r,byKind:c},this.noteServerFavorites([...s,...r,...a])}catch{}}async loadChips(e){try{const{items:t}=await g.topTags(e,8);this.section===e&&(this.chipTags=t??[])}catch{this.chipTags=[]}}ensureView(e){const t=ot(e);!t||this.viewReady.has(t)||Cs(e).then(()=>{this.viewReady=new Set(this.viewReady).add(t)}).catch(()=>{x("That screen failed to load. Try again?","error")})}ready(e){const t=ot(e);return!t||this.viewReady.has(t)}refresh(){this.loadHome(),this.reload(),z.includes(this.section)&&this.loadChips(this.section),this.loadCollections()}selectSection(e){e!==this.section&&(e!=="imagegen"&&(this.editMediaId=0),this.ensureView(e),rs(()=>{this.section=e,this.selectedId=null,this.search="",this.items=[],this.total=0,this.openCollection=null,e==="home"?this.loadHome():e==="collections"?this.loadCollections():this.reload(),z.includes(e)&&this.loadChips(e)}))}editInStudio(e){this.editMediaId=e,this.selectedId=null,this.selectSection("imagegen")}openItem(e,t){if(this.ensureView("viewer"),t&&t.length?this.viewerList=t.map(i=>i.id):this.viewerList.includes(e)||(this.viewerList=[e]),!this.viewerPushed)try{history.pushState({oppaiViewer:!0},""),this.viewerPushed=!0}catch{}this.recents=bs(e),this.selectedId=e}willUpdate(e){if(e.has("selectedId")&&this.selectedId==null&&this.viewerPushed){this.viewerPushed=!1;try{history.back()}catch{}}}onSearchInput(e){this.search=e.target.value,this.selectedId=null,this.searchDebounce&&clearTimeout(this.searchDebounce),this.searchDebounce=window.setTimeout(()=>void this.reload(),250)}clearSearch(){this.searchDebounce&&clearTimeout(this.searchDebounce),this.search="",this.reload()}setFilter(e,t){this.filters={...this.filters,[e]:t},this.reload()}setSort(e){e!==this.sort&&(this.sort=e,this.reload())}async toggleFavorite(e,t){t==null||t.stopPropagation();const i=!this.favorites.has(e);this.setLocalFavorite(e,i);try{await g.updateMedia(e,{favorite:i}),!i&&this.query.favorite&&(this.items=this.items.filter(o=>o.id!==e),this.total=Math.max(0,this.total-1)),this.stats&&(this.stats={...this.stats,favorites:Math.max(0,this.stats.favorites+(i?1:-1))})}catch(o){this.setLocalFavorite(e,!i),x(o.message||"Couldn't save that.","error")}}setLocalFavorite(e,t){const i=new Set(this.favorites);t?i.add(e):i.delete(e),this.favorites=i,this.items=this.items.map(o=>o.id===e?{...o,favorite:t}:o)}noteServerFavorites(e){if(!e.length)return;const t=new Set(this.favorites);let i=!1;for(const o of e){const a=t.has(o.id);o.favorite&&!a?(t.add(o.id),i=!0):!o.favorite&&a&&(t.delete(o.id),i=!0)}i&&(this.favorites=t)}async migrateLocalFavorites(){const e=Kt();if(e.size!==0)try{await g.bulkMedia("update",[...e],{favorite:!0}),fs(new Set)}catch{}}async loadCollections(){try{const{items:e}=await g.listCollections();this.collections=e??[]}catch{this.collections=[]}}async newCollection(e=[]){const t=prompt("Name this collection:");if(!(t==null||!t.trim()))try{const{id:i}=await g.createCollection(t.trim());e.length&&await g.addToCollection(i,e),await this.loadCollections(),x(e.length?`Made "${t.trim()}" with ${e.length} item${e.length===1?"":"s"}.`:`Made "${t.trim()}".`,"success")}catch(i){x(i.message||"Couldn't make that collection.","error")}}openCollectionMenu(e,t,i){const o=async a=>{try{const{added:s}=await g.addToCollection(a.id,e);await this.loadCollections(),x(s===0?`Already on "${a.name}".`:`Added ${s} to "${a.name}".`,"success")}catch(s){x(s.message||"Couldn't add that.","error")}};le({x:t,y:i,title:e.length===1?"Add to collection":`Add ${e.length} items to…`,items:[...this.collections.map(a=>({label:a.name,icon:"playlist_add",hint:`${a.count} item${a.count===1?"":"s"}`,run:()=>void o(a)})),...this.collections.length?[F]:[],{label:"New collection…",icon:"create_new_folder",run:()=>void this.newCollection(e)}]})}async openCollectionItems(e){this.openCollection=e,this.search="",this.section="collections",this.loading=!0;try{const t=await g.collectionItems(e.id,ee,0);this.items=t.items??[],this.total=t.total??this.items.length,this.openCollection=t.collection??e,this.noteServerFavorites(this.items)}catch(t){x(t.message||"Couldn't open that collection.","error")}finally{this.loading=!1}}async removeFromOpenCollection(e){const t=this.openCollection;if(t)try{await g.removeFromCollection(t.id,e),this.items=this.items.filter(i=>i.id!==e),this.total=Math.max(0,this.total-1),await this.loadCollections()}catch(i){x(i.message||"Couldn't take that off.","error")}}async renameOpenCollection(e){const t=prompt("Rename this collection:",e.name);if(!(t==null||!t.trim()||t.trim()===e.name))try{await g.renameCollection(e.id,t.trim()),this.openCollection={...e,name:t.trim()},await this.loadCollections()}catch(i){x(i.message||"Couldn't rename that.","error")}}async deleteCollection(e){var t;if(confirm(`Delete the collection "${e.name}"? The items stay in your library.`))try{await g.deleteCollection(e.id),((t=this.openCollection)==null?void 0:t.id)===e.id&&(this.openCollection=null,this.items=[],this.total=0),await this.loadCollections()}catch(i){x(i.message||"Couldn't delete that.","error")}}exitSelect(){this.selectMode=!1,this.selected=new Set}toggleSelected(e,t){t==null||t.stopPropagation();const i=new Set(this.selected);i.has(e)?i.delete(e):i.add(e),this.selected=i}async bulkDelete(){const e=[...this.selected];if(e.length&&confirm(`Delete ${e.length} item${e.length===1?"":"s"}? This cannot be undone.`)){this.busy=!0;try{await g.bulkMedia("delete",e);const t=Pe("libraryDelete",{count:e.length});x(t.message,"success",{emotion:t.emotion,intensity:t.intensity});const i=new Set(this.favorites);e.forEach(o=>i.delete(o)),this.favorites=i,this.exitSelect(),await this.refresh()}catch(t){console.error("bulk delete",t)}finally{this.busy=!1}}}async bulkTags(e){const t=[...this.selected];if(!t.length)return;const i=prompt(e==="add"?"Add tags (comma-separated):":"Remove tags (comma-separated):");if(i==null)return;const o=i.split(",").map(a=>a.trim()).filter(Boolean);if(o.length){this.busy=!0;try{await g.bulkMedia("update",t,e==="add"?{addTags:o}:{removeTags:o}),await this.refresh()}catch(a){console.error("bulk tags",a)}finally{this.busy=!1}}}async bulkChangeKind(){const e=[...this.selected];if(!e.length)return;const t=prompt("Change type to (video, gif, image, comic, game):");if(t==null)return;const i=t.trim().toLowerCase();if(!z.includes(i)){alert(`Unknown type "${i}".`);return}this.busy=!0;try{await g.bulkMedia("update",e,{kind:i}),this.exitSelect(),await this.refresh()}catch(o){console.error("bulk kind",o)}finally{this.busy=!1}}async bulkFavorite(){const e=[...this.selected];if(e.length){e.forEach(t=>this.setLocalFavorite(t,!0));try{await g.bulkMedia("update",e,{favorite:!0}),this.stats&&(this.stats={...this.stats,favorites:this.stats.favorites+e.length})}catch(t){e.forEach(i=>this.setLocalFavorite(i,!1)),x(t.message||"Couldn't star those.","error")}this.exitSelect()}}logout(){this.dispatchEvent(new CustomEvent("logout",{bubbles:!0,composed:!0}))}browse(){var e;(e=this.renderRoot.querySelector("#file"))==null||e.click()}onFiles(e){const t=Array.from(e);t.length&&(this.uploadOpen=!1,L.add(t))}async announceUploads(){var i;const e=this.pendingUploads.filter(o=>typeof o=="number"&&o>0);if(this.pendingUploads=[],!e.length)return;const t=e.length===1?await g.getMedia(e[0]).catch(()=>{}):void 0;this.dispatchEvent(new CustomEvent("imported",{detail:{count:e.length,title:t==null?void 0:t.title,kind:t==null?void 0:t.kind,tags:(i=t==null?void 0:t.tags)==null?void 0:i.map(o=>o.name)},bubbles:!0,composed:!0})),this.refresh()}onFileInput(e){const t=e.target;t.files&&this.onFiles(t.files),t.value=""}onDrop(e){var t,i;e.preventDefault(),this.dragActive=!1,(i=(t=e.dataTransfer)==null?void 0:t.files)!=null&&i.length&&this.onFiles(e.dataTransfer.files)}openScrape(){var e;this.ensureView("scrape"),this.uploadOpen=!1,(e=this.renderRoot.querySelector("oppai-scrape-dialog"))==null||e.open()}itemsForKind(e){var t;return((t=this.home)==null?void 0:t.byKind[e])??[]}onScreenItems(e,t,i){var o;return e||t||i?this.items:((o=this.home)==null?void 0:o.newest)??this.items}get viewerQueue(){return this.viewerList.map(e=>this.items.find(t=>t.id===e)).filter(e=>e!=null)}render(){var T,P,I;const e=this.search.trim().length>0,t=this.selectedId!=null,i=!t&&this.section==="settings"&&!e,o=!t&&this.section==="browse"&&!e,a=!t&&this.section==="imagegen"&&!e,s=!t&&this.section==="studio"&&!e,r=this.section==="chat"&&!e,l=!t&&r,c=!t&&this.section==="favorites"&&!e,h=!t&&this.section==="collections"&&!e,p=!t&&this.section==="home"&&!e&&!c,m=!t&&e,y=!t&&!p&&!c&&!h&&!m&&!i&&!o&&!a&&!s&&!l,w=t?this.items.find(C=>C.id===this.selectedId)??null:null;let b="Library";return t?b=w?w.title:"Library":m?b="Search results":i?b="Settings":o?b="Browse sources":a?b="Create":s?b="Outfit studio":l?b="Chat with Libby":c?b="Favorites":h?b=((T=this.openCollection)==null?void 0:T.name)??"Collections":p?b="Library":b=((P=_[this.section])==null?void 0:P.label)??"Library",d`
      ${this.renderNav()}
      <div class="main-col">
        ${this.renderHeader(b,e,t,i)}
        <main class=${l||a?"flush":""}>
          ${p?this.renderHome():u}
          ${i?this.ready("settings")?d`<oppai-settings .user=${this.user}
                  @open-studio=${()=>this.selectSection("studio")}></oppai-settings>`:this.renderViewLoading():u}
          ${o?this.ready("browse")?d`<oppai-browse
                  ?can-add-sites=${!!((I=this.user)!=null&&I.isAdmin)}
                  @imported=${()=>this.refresh()}
                  @browse-frame-changed=${C=>{this.browseFrame=C.detail}}
                ></oppai-browse>`:this.renderViewLoading():u}
          ${a?this.ready("imagegen")?d`<oppai-imagegen .editMedia=${this.editMediaId} @imported=${()=>this.refresh()}
                  @open-chat=${()=>this.selectSection("chat")}></oppai-imagegen>`:this.renderViewLoading():u}
          <!-- Keyed so switching between Create and the studio rebuilds the element
               rather than reusing one whose studio setup ran (or did not run) for the
               other mode. They share a draft on purpose; they must not share an
               instance. -->
          ${s?this.ready("studio")?hi("studio",d`<oppai-imagegen studio @imported=${()=>this.refresh()}
                  @open-chat=${()=>this.selectSection("chat")}></oppai-imagegen>`):this.renderViewLoading():u}
          ${r?this.ready("chat")?d`<oppai-chat .user=${this.user} style=${t?"display:none":""}
                  @open-section=${C=>this.selectSection(C.detail.section)}></oppai-chat>`:this.renderViewLoading():u}
          ${h?this.renderCollections():u}
          ${y||c||m?this.renderGrid(y,c,m):u}
          ${t&&w&&!this.ready("viewer")?this.renderViewLoading():u}
          ${t&&w&&this.ready("viewer")?d`<oppai-viewer
                .media=${w}
                .queue=${this.viewerQueue}
                .favorite=${this.favorites.has(w.id)}
                @toggle-favorite=${()=>this.toggleFavorite(w.id)}
                @navigate=${C=>this.stepItem(C.detail.dir)}
                @jump=${C=>this.selectedId=C.detail.id}
                @changed=${()=>this.refresh()}
                @deleted=${()=>{this.closeItem(),this.refresh()}}
                @edit-in-studio=${C=>this.editInStudio(C.detail.id)}
              ></oppai-viewer>`:u}
          ${t&&!w?d`<div class="empty">Item not found.</div>`:u}
        </main>
      </div>
      <!-- Libby, available from anywhere rather than only on the screen named after
           her. She is told what is on screen so she can react to it; the Chat and
           screen suppresses her, since it already is the conversation. Together is no
           longer a screen — this drawer is the only way in now, which is why it must
           stay available everywhere else. -->
      <oppai-libby-drawer
        .items=${o?[]:w?[w,...this.onScreenItems(y,c,m)]:this.onScreenItems(y,c,m)}
        .focused=${w}
        .externalItems=${o?this.browseFrame.items:[]}
        .externalFocused=${o?this.browseFrame.focused:null}
        .where=${o?this.browseFrame.where:ks(m?"search":this.section)}
        ?suppressed=${l}
      ></oppai-libby-drawer>
      ${this.renderUpload()}
      ${this.renderBulkBar()}
      ${this.renderDownloads()}
      ${this.ready("scrape")?d`<oppai-scrape-dialog @imported=${()=>this.refresh()}></oppai-scrape-dialog>`:u}
      <oppai-context-menu></oppai-context-menu>
      <!-- display:none, and only ever reached through the "Add media" button, but a
           control with no name is a control with no name if anything does reach it. -->
      <input id="file" type="file" multiple aria-label="Choose files to add" @change=${this.onFileInput} />
    `}renderDownloads(){return this.downloads.length===0?u:d`<aside class="download-area" aria-label="Downloads">
      <div class="download-heading">Downloads</div>
      ${this.downloads.slice(0,5).map(e=>d`
        <div class="download-row">
          <div class="download-ring" style=${`--p:${e.progress}`}>
            <span aria-hidden="true" class="material-symbols-rounded">${e.state==="done"?"check":e.state==="error"?"error":"download"}</span>
          </div>
          <div class="download-copy">
            <div class="download-title">${e.label}</div>
            <div class="download-status">${e.state==="running"?`${Math.round(e.progress*100)}% · running in background`:e.state==="done"?"Complete":e.error||"Failed"}</div>
          </div>
          ${e.state!=="running"?d`<button class="download-dismiss" title="Dismiss" @click=${()=>Ma(e.id)}>
            <span aria-hidden="true" class="material-symbols-rounded">close</span>
          </button>`:u}
        </div>`)}
    </aside>`}renderBulkBar(){if(!this.selectMode||this.selected.size===0)return u;const e=this.selected.size;return d`
      <div class="bulk-bar">
        <span class="bulk-count">${e} selected</span>
        <button class="bulk-btn" ?disabled=${this.busy} @click=${()=>this.bulkTags("add")}>
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">sell</span>Add tags
        </button>
        <button class="bulk-btn" ?disabled=${this.busy} @click=${()=>this.bulkTags("remove")}>
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">label_off</span>Remove tags
        </button>
        <button class="bulk-btn" ?disabled=${this.busy} @click=${this.bulkChangeKind}>
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">category</span>Type
        </button>
        <button class="bulk-btn" ?disabled=${this.busy} @click=${this.bulkFavorite}>
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">favorite</span>Favorite
        </button>
        <button
          class="bulk-btn"
          ?disabled=${this.busy}
          @click=${t=>this.openCollectionMenu([...this.selected],t.clientX,t.clientY)}
        >
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">playlist_add</span>Collection
        </button>
        <button class="bulk-btn danger" ?disabled=${this.busy} @click=${this.bulkDelete}>
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">delete</span>Delete
        </button>
        <button class="bulk-btn" @click=${()=>this.exitSelect()}>
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">close</span>
        </button>
      </div>
    `}renderNav(){var i,o;const e=(((i=this.user)==null?void 0:i.username)??"?").slice(0,2).toUpperCase(),t=this.section==="settings"&&this.selectedId==null;return d`
      <nav>
        <button class="logo" title=${Le()?"Home":"OppaiLib"}
          @click=${()=>this.selectSection("home")}>
          ${Oa}
        </button>
        <button class="add-btn" title="Add media" @click=${this.toggleUpload}>
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:26px;">add</span>
        </button>

        <div class="nav-list">
          ${Es.map(a=>{const s=this.section===a.id&&this.selectedId==null;return d`
              <button
                class="nav-item"
                aria-current=${s?"page":u}
                @click=${()=>this.selectSection(a.id)}
              >
                <span
                  class="nav-pill"
                  style="background:${s?"var(--oppai-primary-container)":"transparent"};"
                >
                  <span
                    aria-hidden="true" class="material-symbols-rounded ${s?"fill-icon":""}"
                    style="font-size:22px; color:${s?"var(--oppai-primary-bright)":"var(--oppai-text-dim)"};"
                    >${a.icon}</span
                  >
                </span>
                <span class="nav-label" style="color:${s?"var(--oppai-text)":"var(--oppai-text-muted)"};"
                  >${a.label}</span
                >
              </button>
            `})}
        </div>

        <div class="nav-spacer" style="flex:1;"></div>

        <button
          class="icon-btn nav-utility"
          title="Settings"
          @click=${()=>this.selectSection("settings")}
          style="width:48px; height:48px; border-radius:24px; background:${t?"var(--oppai-primary-container)":"var(--oppai-surface-2)"}; color:${t?"var(--oppai-primary-bright)":"var(--oppai-text-dim)"};"
        >
          <span aria-hidden="true" class="material-symbols-rounded ${t?"fill-icon":""}" style="font-size:22px;"
            >settings</span
          >
        </button>
        <button
          class="icon-btn nav-utility"
          title="Sign out (${(o=this.user)==null?void 0:o.username})"
          @click=${this.logout}
          style="width:40px; height:40px; border-radius:20px; background:var(--oppai-accent); color:var(--oppai-on-accent); font-size:13px; font-weight:600;"
        >
          ${e}
        </button>
      </nav>
    `}renderHeader(e,t,i,o=!1){return d`
      <header>
        ${i?d`<button
              class="icon-btn"
              title="Back"
              @click=${this.closeItem}
              style="width:40px; height:40px; border-radius:20px; background:none; color:var(--oppai-text); flex-shrink:0;"
            >
              <span aria-hidden="true" class="material-symbols-rounded" style="font-size:24px;">arrow_back</span>
            </button>`:u}

        <h1 class="h-title">${e}</h1>

        <div class="searchbox">
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:20px; color:var(--oppai-text-dim);">search</span>
          <input
            type="search"
            aria-label="Search the library"
            .value=${this.search}
            @input=${this.onSearchInput}
            placeholder="Search titles, tags, notes..."
          />
          ${t?d`<button
                class="icon-btn"
                aria-label="Clear the search"
                title="Clear the search"
                @click=${this.clearSearch}
                style="background:none; color:var(--oppai-text-dim);"
              >
                <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">close</span>
              </button>`:u}
        </div>

        <div style="flex:1;"></div>

        ${!i&&!o?d`<button
              class="filters-btn header-toggle ${this.selectMode?"on":""}"
              title="Select multiple"
              @click=${this.toggleSelectMode}
            >
              <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;"
                >${this.selectMode?"check_circle":"check_box_outline_blank"}</span
              >
              <span style="font-size:13px; font-weight:500;">Select</span>
            </button>`:u}
        ${o?u:d`<button class="filters-btn">
              <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">tune</span>
              <span style="font-size:13px; font-weight:500;">Filters</span>
            </button>`}
      </header>
    `}renderHome(){var m,y,w,b,T,P;const e=new Date().getHours(),t=e<12?"Good morning":e<18?"Good afternoon":"Good evening";if(!this.home)return d`<div class="empty">Loading your library…</div>`;if((((m=this.stats)==null?void 0:m.total)??this.home.newest.length)===0)return d`<div>
        <h2 class="greeting">${t}</h2>
        <p class="greeting-sub">Your library is empty — add media or import from a URL.</p>
        <div class="empty">
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;"
            >library_add</span
          >
          <div style="font-size:14px;">Nothing here yet.</div>
        </div>
      </div>`;const i=this.home.newest,o=this.home.resume,a=vs(i,this.recents).slice(0,12),s=o.length?o:a,r=s[0]??i[0],l=this.home.favorites,c=((y=this.stats)==null?void 0:y.thisWeek)??0,h=z.map(I=>({kind:I,label:_[I].label,icon:_[I].icon,items:this.itemsForKind(I)})).filter(I=>I.items.length>0),p=(I,C,ze,xt,Fi,$t)=>ze.length===0?u:d`
      <section class="row anim-rise" style="animation-delay:${Fi}ms;">
        <div class="row-head">
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-primary-bright);">${C}</span>
          <h3 class="row-title">${I}</h3>
          ${$t?d`<span class="row-sub">${$t}</span>`:u}
          ${xt?d`<button class="see-all" @click=${xt}>
            See all<span aria-hidden="true" class="material-symbols-rounded" style="font-size:16px;">chevron_right</span>
          </button>`:u}
        </div>
        <div class="row-scroll">${ze.map(zi=>this.renderTile(zi,"200px",void 0,ze))}</div>
      </section>`;return d`
      <div>
        <h2 class="greeting anim-rise">${t}</h2>
        <p class="greeting-sub anim-rise" style="animation-delay:40ms;">
          ${s.length?"Pick up where you left off":"Here's what's new across your library"}
        </p>

        ${r?d`
          <section class="hero anim-rise" style="animation-delay:70ms;">
            <button class="hero-art" @click=${()=>this.openItem(r.id,i)}
              aria-label=${`Open ${r.title}`}>
              ${r.hasThumb?d`<img src=${g.thumbURL(r.id)} alt="" loading="lazy" />`:d`<span aria-hidden="true" class="material-symbols-rounded hero-icon">${_[r.kind].icon}</span>`}
            </button>
            <div class="hero-body">
              <span class="hero-eyebrow">
                ${s.length?"Continue":"Latest addition"} · ${_[r.kind].label}
              </span>
              <h3 class="hero-title">${r.title}</h3>
              ${(w=r.tags)!=null&&w.length?d`<div class="hero-tags">${r.tags.slice(0,6).map(I=>d`<span>${I.name}</span>`)}</div>`:u}
              <div class="hero-acts">
                <button class="hero-open" @click=${()=>this.openItem(r.id,i)}>
                  <span aria-hidden="true" class="material-symbols-rounded">play_arrow</span>
                  ${s.length?"Carry on":"Open"}
                </button>
                <button class="hero-more" @click=${()=>this.selectSection(r.kind)}>
                  More ${_[r.kind].label.toLowerCase()}
                </button>
              </div>
            </div>
          </section>

          <!-- Every figure here is counted by the server (GET /api/media/stats).
               They used to be derived from the library in browser memory, which is
               why the dashboard could not draw until all of it had arrived. -->
          <div class="stats anim-rise" style="animation-delay:90ms;">
            <button class="stat" @click=${()=>this.selectSection("home")}>
              <strong>${(((b=this.stats)==null?void 0:b.total)??0).toLocaleString()}</strong><span>items</span></button>
            <button class="stat" @click=${()=>this.selectSection("favorites")}>
              <strong>${(((T=this.stats)==null?void 0:T.favorites)??0).toLocaleString()}</strong><span>favourites</span></button>
            <div class="stat">
              <strong>${Q(((P=this.stats)==null?void 0:P.bytes)??0)}</strong><span>stored</span></div>
            <div class="stat">
              <strong>${c.toLocaleString()}</strong><span>added this week</span></div>
          </div>`:u}

        ${p("Jump back in","history",s,null,120,o.length?"Where you left off, on any device":"What you've opened on this device")}
        ${p("Favourites","star",l,()=>this.selectSection("favorites"),170)}
        ${p("Recently added","new_releases",i.slice(0,12),null,220)}

        ${h.map((I,C)=>p(I.label,I.icon,I.items,()=>this.selectSection(I.kind),270+C*60))}
      </div>
    `}renderGrid(e,t,i){var h;const o=e?this.section:null,a=t?"Favorites":i?"Search results":((h=_[o])==null?void 0:h.label)??"",s=this.items,r=this.loading?"Loading…":this.total===s.length?`${this.total.toLocaleString()} ${this.total===1?"item":"items"}`:`${s.length.toLocaleString()} of ${this.total.toLocaleString()}`,l=o?this.filters[o]??"All":"All",c=o?["All",...this.chipTags.map(p=>p.name)].map(p=>({label:p,active:l===p})):[];return d`
      <div>
        <div class="grid-head">
          <h2 class="grid-title">${a}</h2>
          <span class="grid-count">${r}</span>
          ${this.renderSort()}
        </div>

        ${c.length>1?d`<div class="chips" role="group" aria-label="Filter by tag">
              ${c.map(p=>d`<button
                  class="chip"
                  aria-pressed=${p.active?"true":"false"}
                  @click=${()=>this.setFilter(this.section,p.label)}
                  style="background:${p.active?"var(--oppai-accent)":"transparent"}; color:${p.active?"var(--oppai-on-accent)":"var(--oppai-text-dim)"}; border:1px solid ${p.active?"var(--oppai-accent)":"var(--oppai-border-strong)"};"
                >
                  ${p.active?d`<span aria-hidden="true" class="material-symbols-rounded" style="font-size:16px;">check</span>`:u}
                  ${p.label}
                </button>`)}
            </div>`:d`<div style="height:24px;"></div>`}

        ${s.length===0?this.loading?d`<div class="empty" aria-busy="true">Loading…</div>`:d`<div class="empty">
                <span aria-hidden="true" class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;"
                  >${t?"favorite_border":"search_off"}</span
                >
                <div style="font-size:14px;">
                  ${t?"No favorites yet. Tap the heart on any item.":"No items match your search or filter."}
                </div>
              </div>`:d`<div
                class="grid"
                role="list"
                aria-label=${a}
                aria-busy=${this.loading?"true":"false"}
              >
                ${s.map((p,m)=>this.renderTile(p,"100%",m,s))}
              </div>
              ${this.renderMore()}`}
      </div>
    `}renderViewLoading(){return d`<div class="empty" role="status" aria-live="polite">
      <md-circular-progress indeterminate style="--md-circular-progress-size:36px"></md-circular-progress>
    </div>`}renderSort(){return d`<label class="sort">
      <span class="sort-label">Sort</span>
      <select
        aria-label="Sort order"
        @change=${t=>this.setSort(t.target.value)}
      >
        ${[{id:"newest",label:"Newest first"},{id:"oldest",label:"Oldest first"},{id:"rating",label:"Highest rated"},{id:"largest",label:"Largest first"}].map(t=>d`<option value=${t.id} ?selected=${t.id===this.sort}>${t.label}</option>`)}
      </select>
    </label>`}renderMore(){return this.items.length>=this.total?this.total>ee?d`<div class="more-end" role="status">That is everything — ${this.total.toLocaleString()} items.</div>`:u:d`<div class="more-sentinel" role="status" aria-live="polite">
      ${this.loadingMore?d`<span>Loading more…</span>`:d`<button class="more-btn" @click=${()=>void this.loadMore()}>Show more</button>`}
    </div>`}renderCollections(){const e=this.openCollection;return e?d`
        <div>
          <div class="grid-head">
            <button
              class="see-all"
              @click=${()=>{this.openCollection=null,this.items=[],this.total=0}}
            >
              <span aria-hidden="true" class="material-symbols-rounded" style="font-size:16px;">chevron_left</span>All
              collections
            </button>
            <h2 class="grid-title">${e.name}</h2>
            <span class="grid-count">
              ${e.count.toLocaleString()} ${e.count===1?"item":"items"}
            </span>
            <button class="see-all" @click=${()=>void this.renameOpenCollection(e)}>Rename</button>
            <button class="see-all" @click=${()=>void this.deleteCollection(e)}>Delete</button>
          </div>
          ${this.items.length===0?d`<div class="empty">
                ${this.loading?"Loading…":"Nothing on this collection yet — add items from a tile's menu."}
              </div>`:d`<div class="grid" role="list" aria-label=${e.name}>
                ${this.items.map((t,i)=>this.renderTile(t,"100%",i,this.items))}
              </div>`}
        </div>
      `:d`
      <div>
        <div class="grid-head">
          <h2 class="grid-title">Collections</h2>
          <span class="grid-count">${this.collections.length.toLocaleString()}</span>
          <button class="see-all" @click=${()=>void this.newCollection()}>
            <span aria-hidden="true" class="material-symbols-rounded" style="font-size:16px;">add</span>New
          </button>
        </div>
        ${this.collections.length===0?d`<div class="empty">
              <span
                aria-hidden="true" class="material-symbols-rounded"
                style="font-size:40px; display:block; margin-bottom:12px;"
                >bookmarks</span
              >
              <div style="font-size:14px;">
                No collections yet. A collection is a list in an order you choose — a series to
                read through, a set to work along.
              </div>
            </div>`:d`<div class="grid" role="list" aria-label="Collections">
              ${this.collections.map(t=>d`<div
                  class="tile"
                  role="listitem"
                  tabindex="0"
                  aria-label=${`${t.name}, ${t.count} ${t.count===1?"item":"items"}`}
                  @click=${()=>void this.openCollectionItems(t)}
                  @keydown=${i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),this.openCollectionItems(t))}}
                  @contextmenu=${i=>{i.preventDefault(),le({x:i.clientX,y:i.clientY,title:t.name,items:[{label:"Open",icon:"open_in_full",run:()=>void this.openCollectionItems(t)},{label:"Rename…",icon:"edit",run:()=>void this.renameOpenCollection(t)},F,{label:"Delete collection",icon:"delete",danger:!0,hint:"the items stay in your library",run:()=>void this.deleteCollection(t)}]})}}
                >
                  <div
                    class="tile-media"
                    style="width:100%; aspect-ratio:1; background:var(--oppai-surface-2); display:grid; place-items:center;"
                  >
                    ${t.cover?d`<img src=${g.thumbURL(t.cover)} alt="" loading="lazy" />`:d`<span aria-hidden="true" class="material-symbols-rounded" style="font-size:34px; color:var(--oppai-text-dim);"
                          >bookmarks</span
                        >`}
                  </div>
                  <div class="tile-meta">
                    <div class="tile-title">${t.name}</div>
                    <div class="tile-tag">${t.count} ${t.count===1?"item":"items"}</div>
                  </div>
                </div>`)}
            </div>`}
      </div>
    `}renderTile(e,t,i,o){const a=_[e.kind],s=this.favorites.has(e.id),r=ms(e),l=i!=null?"anim-rise":"",c=i!=null?`animation-delay:${Math.min(i,12)*45}ms;`:"",h=this.selected.has(e.id),p=`tile ${l} ${this.selectMode?"selecting":""} ${h?"selected":""}`;return d`
      <div
        class=${p}
        data-id=${e.id}
        role=${i!=null?"listitem":"button"}
        tabindex="0"
        aria-label=${`${e.title}${r?`, ${r}`:""}, ${a.typeLabel}`}
        aria-pressed=${this.selectMode?h?"true":"false":u}
        @click=${()=>this.selectMode?this.toggleSelected(e.id):this.openItem(e.id,o)}
        @keydown=${m=>{m.key!=="Enter"&&m.key!==" "||(m.preventDefault(),this.selectMode?this.toggleSelected(e.id):this.openItem(e.id,o))}}
        style="flex-shrink:0; width:${t}; ${c}"
      >
        <div
          class="tile-media"
          style="width:100%; aspect-ratio:${a.aspect}; background:${hs(e)};"
        >
          ${ps(e)?d`<img loading="lazy" src=${g.thumbURL(e.id)} alt=${e.title} />`:d`<div class="tile-overlay">
                <span aria-hidden="true" class="material-symbols-rounded" style="font-size:30px; color:#fff;"
                  >${a.icon}</span
                >
                <span class="type-label">${a.typeLabel}</span>
              </div>`}
          ${this.selectMode?d`<div class="select-check ${h?"on":""}">
                ${h?d`<span aria-hidden="true" class="material-symbols-rounded">check</span>`:u}
              </div>`:d`<button
                class="fav-btn ${s?"is-fav":""}"
                aria-label=${s?`Remove ${e.title} from favourites`:`Add ${e.title} to favourites`}
                aria-pressed=${s?"true":"false"}
                title=${s?"Remove from favourites":"Add to favourites"}
                @click=${m=>this.toggleFavorite(e.id,m)}
              >
                <span
                  aria-hidden="true" class="material-symbols-rounded fill-icon"
                  style="font-size:18px; color:${s?"var(--oppai-fav)":"rgba(255,255,255,0.9)"};"
                  >${s?"favorite":"favorite_border"}</span
                >
              </button>`}
          ${r?d`<span class="tile-stat">${r}</span>`:u}
        </div>
        <div class="tile-meta">
          <div class="tile-title">${e.title}</div>
          <div class="tile-tag">${gs(e)}</div>
        </div>
      </div>
    `}renderUpload(){return this.uploadOpen?d`
      <div class="scrim" @click=${this.toggleUpload}>
        <div class="dialog" @click=${e=>e.stopPropagation()}>
          <h2>Upload media</h2>
          <div
            class="dropzone ${this.dragActive?"drag":""}"
            @click=${this.browse}
            @dragover=${e=>{e.preventDefault(),this.dragActive=!0}}
            @dragleave=${()=>this.dragActive=!1}
            @drop=${this.onDrop}
          >
            <span aria-hidden="true" class="material-symbols-rounded" style="font-size:36px; display:block; margin-bottom:10px;"
              >upload_file</span
            >
            <div style="font-size:14px;">Drag files here, or click to browse</div>
            <div style="font-size:12px; color:var(--oppai-text-muted); margin-top:4px;">
              Photos, GIFs, videos, games, comics
            </div>
          </div>
          <button class="link-btn" @click=${this.openScrape}>or import from a URL</button>
          <div class="dialog-actions">
            <button class="btn-text" @click=${this.toggleUpload}>Cancel</button>
            <button class="btn-filled" @click=${this.browse}>Choose files</button>
          </div>
        </div>
      </div>
    `:u}};v.styles=[lt,dt,E`
      :host {
        display: flex;
        width: 100vw;
        height: 100vh;
        height: 100dvh;
        background: var(--oppai-bg);
        color: var(--oppai-text);
        overflow: hidden;
        position: relative;
        font-family: "Roboto", system-ui, sans-serif;
      }
      button {
        font-family: inherit;
      }
      input::placeholder {
        color: var(--oppai-text-muted);
      }

      /* Nav rail */
      nav {
        width: 96px;
        flex-shrink: 0;
        height: 100%;
        box-sizing: border-box;
        overflow: hidden;
        background: var(--oppai-nav);
        border-right: 1px solid var(--oppai-surface-2);
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px 0 max(16px, env(safe-area-inset-bottom));
        gap: 20px;
      }
      nav .logo, nav .add-btn, nav .nav-utility { flex-shrink: 0; }
      /* The mark, inlined so it takes currentColor and follows the theme. */
      .logo {
        width: 44px;
        height: 44px;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
        color: var(--oppai-primary);
        transition: transform 0.22s var(--oppai-ease-spring), color 0.2s ease;
      }
      .logo:hover {
        transform: scale(1.08);
        color: var(--oppai-primary-bright);
      }
      .logo svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      .add-btn {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: var(--oppai-primary-container);
        border: none;
        color: var(--oppai-primary-bright);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        transition: transform 0.2s var(--oppai-ease-spring), filter 0.15s ease,
          box-shadow 0.2s ease;
      }
      .add-btn:hover {
        filter: brightness(1.1);
        transform: translateY(-2px) rotate(90deg);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
      }
      .add-btn:active {
        transform: scale(0.94) rotate(90deg);
      }
      .add-btn span {
        transition: transform 0.2s var(--oppai-ease-spring);
      }
      .nav-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: none;
        align-items: center;
      }
      .nav-list::-webkit-scrollbar { display: none; }
      .nav-item {
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 0;
        width: 64px;
      }
      .nav-pill {
        width: 56px;
        height: 32px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.22s var(--oppai-ease-emphasized),
          transform 0.22s var(--oppai-ease-spring);
      }
      .nav-item:hover .nav-pill {
        background: var(--oppai-nav-hover);
      }
      .nav-item:active .nav-pill {
        transform: scale(0.9);
      }
      .nav-pill span {
        transition: color 0.2s ease;
      }
      .nav-label {
        transition: color 0.2s ease;
      }
      .nav-label {
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.2px;
      }
      .icon-btn {
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      /* Layout */
      .main-col {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      header {
        height: 72px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 0 28px;
        border-bottom: 1px solid var(--oppai-border);
      }
      .h-title {
        font-size: 20px;
        font-weight: 500;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 280px;
        flex-shrink: 0;
      }
      .searchbox {
        flex: 1;
        max-width: 520px;
        height: 44px;
        background: var(--oppai-surface-2);
        border-radius: 22px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 16px;
      }
      .searchbox input {
        flex: 1;
        background: none;
        border: none;
        outline: none;
        color: var(--oppai-text);
        font-size: 14px;
      }
      .filters-btn {
        background: none;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 20px;
        height: 40px;
        padding: 0 14px;
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--oppai-text-dim);
        cursor: pointer;
        flex-shrink: 0;
      }
      main {
        flex: 1;
        overflow-y: auto;
        padding: 28px 32px 60px;
      }
      /* Chat is a full-bleed client, not a card inside the library shell: it
         owns its own scrolling regions, so the shell's padding and scrollbar
         would produce a nested-scroller feel and a visible inset frame. */
      main.flush {
        padding: 0;
        overflow: hidden;
        min-height: 0;
      }

      /* Home */
      .greeting {
        font-size: 28px;
        font-weight: 400;
        margin: 0 0 4px;
      }
      .greeting-sub {
        font-size: 14px;
        color: var(--oppai-text-dim);
        margin: 0 0 24px;
      }
      /* The hero: one item at full width, art beside its details. Collapses to art
         over details on a phone, where side-by-side would leave neither room. */
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 300px) minmax(0, 1fr);
        gap: 20px;
        align-items: center;
        margin-bottom: 14px;
        padding: 16px;
        border: 1px solid var(--oppai-border);
        border-radius: 20px;
        background: var(--oppai-surface-2);
      }
      .hero-art {
        display: grid;
        place-items: center;
        width: 100%;
        aspect-ratio: 16 / 10;
        padding: 0;
        border: 0;
        border-radius: 14px;
        overflow: hidden;
        background: var(--oppai-surface);
        cursor: pointer;
      }
      .hero-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .hero-icon { font-size: 52px; color: var(--oppai-text-muted); }
      .hero-body { display: grid; gap: 8px; min-width: 0; }
      .hero-eyebrow {
        color: var(--oppai-primary-bright);
        font-size: 11.5px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .hero-title {
        margin: 0;
        font-size: 25px;
        font-weight: 500;
        line-height: 1.2;
        overflow-wrap: anywhere;
      }
      .hero-tags { display: flex; flex-wrap: wrap; gap: 6px; }
      .hero-tags span {
        padding: 3px 9px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 999px;
        color: var(--oppai-text-dim);
        font-size: 11.5px;
      }
      .hero-acts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
      .hero-open, .hero-more {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 9px 18px;
        border: 1px solid var(--oppai-border-strong);
        border-radius: 999px;
        background: transparent;
        color: var(--oppai-text-dim);
        cursor: pointer;
        font: inherit;
        font-size: 13.5px;
        font-weight: 600;
      }
      .hero-open {
        background: var(--oppai-primary);
        border-color: var(--oppai-primary);
        color: var(--oppai-on-primary);
      }
      .hero-more:hover { color: var(--oppai-text); }
      .hero-open .material-symbols-rounded { font-size: 19px; }
      /* The counts. Two of them are links to the screens they describe; the other two
         are facts with nowhere to go, so they are not buttons. */
      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 10px;
        margin-bottom: 34px;
      }
      .stat {
        display: grid;
        gap: 1px;
        padding: 12px 14px;
        border: 1px solid var(--oppai-border);
        border-radius: 14px;
        background: var(--oppai-surface-2);
        color: inherit;
        text-align: left;
        font: inherit;
      }
      button.stat { cursor: pointer; }
      button.stat:hover { border-color: var(--oppai-border-strong); }
      .stat strong { font-size: 19px; font-weight: 600; }
      .stat span { color: var(--oppai-text-muted); font-size: 11.5px; }
      .row-sub {
        color: var(--oppai-text-muted);
        font-size: 12px;
      }
      @media (max-width: 760px) {
        .hero { grid-template-columns: minmax(0, 1fr); gap: 14px; padding: 12px; }
        .hero-title { font-size: 21px; }
      }
      .row {
        margin-bottom: 36px;
      }
      .row-head {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 14px;
      }
      .row-title {
        font-size: 18px;
        font-weight: 500;
        margin: 0;
        flex: 1;
      }
      .see-all {
        background: none;
        border: none;
        color: var(--oppai-primary-bright);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .row-scroll {
        display: flex;
        gap: 16px;
        overflow-x: auto;
        padding-bottom: 8px;
      }

      /* Grid */
      .grid-head {
        display: flex;
        align-items: baseline;
        gap: 12px;
        margin-bottom: 6px;
      }
      .grid-title {
        font-size: 26px;
        font-weight: 400;
        margin: 0;
      }
      .grid-count {
        font-size: 13px;
        color: var(--oppai-text-muted);
      }
      /* The sort control sits at the far end of the grid heading, so the heading reads
         "what this is, how much of it, in what order". */
      .sort {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }
      .sort-label {
        color: var(--oppai-text-muted);
      }
      .sort select {
        height: 34px;
        padding: 0 8px;
        border-radius: 8px;
        border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-surface);
        color: var(--oppai-text);
        font-family: inherit;
        font-size: 13px;
      }
      /* The end of what has loaded. The sentinel is what the observer watches; the
         button behind it is for anyone the observer does not reach. */
      .more-sentinel,
      .more-end {
        display: grid;
        place-items: center;
        padding: 28px 0 8px;
        font-size: 13px;
        color: var(--oppai-text-muted);
      }
      .more-btn {
        height: 40px;
        padding: 0 20px;
        border-radius: 20px;
        border: 1px solid var(--oppai-border-strong);
        background: var(--oppai-surface);
        color: var(--oppai-text);
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }
      .more-btn:hover {
        background: var(--oppai-surface-2);
      }
      .chips {
        display: flex;
        gap: 8px;
        margin: 18px 0 24px;
        flex-wrap: wrap;
      }
      .chip {
        height: 36px;
        padding: 0 16px;
        border-radius: 18px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 22px;
      }
      .empty {
        text-align: center;
        padding: 80px 0;
        color: var(--oppai-text-muted);
      }

      /* Tiles. A hold opens the menu (see long-press.ts), so the browser's own
         hold behaviours — the image callout, a text selection — are switched off
         here rather than fighting it. */
      .tile {
        cursor: pointer;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }
      /* A focused tile has to be visible as such, now that one can be reached by
         keyboard. focus-visible rather than focus, so a mouse click does not leave a
         ring behind it. */
      .tile:focus {
        outline: none;
      }
      .tile:focus-visible {
        outline: 2px solid var(--oppai-primary);
        outline-offset: 3px;
        border-radius: 18px;
      }
      .tile-media {
        position: relative;
        border-radius: 16px;
        overflow: hidden;
        transition: transform 0.28s var(--oppai-ease-emphasized),
          box-shadow 0.28s var(--oppai-ease-emphasized);
        will-change: transform;
      }
      .tile:hover .tile-media {
        transform: translateY(-4px) scale(1.02);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
      }
      .tile:active .tile-media {
        transform: translateY(-1px) scale(0.99);
      }
      .tile-media img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.4s var(--oppai-ease-emphasized);
      }
      .tile:hover .tile-media img {
        transform: scale(1.06);
      }
      .tile-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 6px;
        opacity: 0.55;
      }
      .type-label {
        font: 600 10px ui-monospace, monospace;
        color: #fff;
        letter-spacing: 1px;
      }
      .fav-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 32px;
        height: 32px;
        border-radius: 16px;
        background: rgba(0, 0, 0, 0.4);
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0;
        transform: scale(0.8);
        transition: opacity 0.2s ease, transform 0.2s var(--oppai-ease-spring),
          background 0.2s ease;
        backdrop-filter: blur(2px);
      }
      .tile:hover .fav-btn,
      .fav-btn.is-fav {
        opacity: 1;
        transform: scale(1);
      }
      .fav-btn:hover {
        background: rgba(0, 0, 0, 0.6);
      }
      .fav-btn:active .material-symbols-rounded {
        animation: oppai-pop 0.35s var(--oppai-ease-spring);
      }
      .tile-stat {
        position: absolute;
        bottom: 6px;
        right: 8px;
        font-size: 11px;
        font-weight: 600;
        color: #fff;
        background: rgba(0, 0, 0, 0.5);
        padding: 2px 6px;
        border-radius: 6px;
      }
      .tile-meta {
        padding: 10px 2px 0;
      }
      .tile-title {
        font-size: 13px;
        font-weight: 500;
        color: var(--oppai-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tile-tag {
        font-size: 12px;
        color: var(--oppai-text-muted);
        margin-top: 2px;
      }

      /* Upload dialog */
      .scrim {
        position: absolute;
        inset: 0;
        background: var(--oppai-scrim);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 20;
        animation: oppai-fade-in 0.2s var(--oppai-ease-standard) both;
      }
      .dialog {
        width: 480px;
        max-width: calc(100vw - 32px);
        background: var(--oppai-surface-2);
        border-radius: 28px;
        padding: 28px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
        animation: oppai-scale-in 0.32s var(--oppai-ease-spring) both;
      }
      .dialog h2 {
        font-size: 20px;
        font-weight: 500;
        margin: 0 0 20px;
      }
      .dropzone {
        border: 1.5px dashed var(--oppai-border-strong);
        border-radius: 16px;
        padding: 40px 20px;
        text-align: center;
        color: var(--oppai-text-dim);
        cursor: pointer;
        transition: border-color 0.12s ease, background 0.12s ease;
      }
      .dropzone.drag {
        border-color: var(--oppai-primary);
        background: color-mix(in srgb, var(--oppai-primary) 12%, transparent);
      }
      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 24px;
      }
      .btn-text {
        height: 40px;
        padding: 0 20px;
        border-radius: 20px;
        background: none;
        border: none;
        color: var(--oppai-primary-bright);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-filled {
        height: 40px;
        padding: 0 20px;
        border-radius: 20px;
        background: var(--oppai-primary);
        border: none;
        color: var(--oppai-on-primary);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }
      .link-btn {
        display: block;
        margin: 14px auto 0;
        background: none;
        border: none;
        color: var(--oppai-primary-bright);
        font-size: 13px;
        cursor: pointer;
      }
      input[type="file"] {
        display: none;
      }

      /* Selection mode */
      .tile.selecting .tile-media {
        transform: none;
      }
      .tile.selected .tile-media {
        outline: 3px solid var(--oppai-primary);
        outline-offset: 2px;
      }
      .select-check {
        position: absolute;
        top: 8px;
        left: 8px;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.5);
        border: 2px solid #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
        backdrop-filter: blur(2px);
      }
      .select-check.on {
        background: var(--oppai-primary);
        border-color: var(--oppai-primary);
      }
      .select-check .material-symbols-rounded {
        font-size: 18px;
        color: #fff;
      }
      .bulk-bar {
        position: absolute;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%);
        z-index: 25;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px 10px 18px;
        border-radius: 28px;
        background: var(--oppai-surface-2);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
        animation: oppai-scale-in 0.28s var(--oppai-ease-spring) both;
      }
      .bulk-count {
        font-size: 14px;
        font-weight: 600;
        margin-right: 6px;
        white-space: nowrap;
      }
      .bulk-btn {
        height: 40px;
        padding: 0 14px;
        border-radius: 20px;
        background: none;
        border: none;
        color: var(--oppai-text);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .bulk-btn:hover {
        background: var(--oppai-surface);
      }
      .bulk-btn.danger {
        color: var(--oppai-error, #f2b8b5);
      }
      .bulk-btn[disabled] {
        opacity: 0.5;
        cursor: default;
      }
      .download-area {
        position: absolute; right: 22px; bottom: 86px; z-index: 24;
        width: min(360px, calc(100vw - 44px)); padding: 12px;
        border: 1px solid var(--oppai-border); border-radius: 18px;
        background: color-mix(in srgb, var(--oppai-surface-2) 94%, transparent);
        box-shadow: 0 14px 44px rgba(0, 0, 0, .48); backdrop-filter: blur(16px);
        animation: oppai-scale-in .24s var(--oppai-ease-spring) both;
      }
      .download-heading { font-size: 12px; font-weight: 700; opacity: .72; padding: 0 4px 7px; }
      .download-row { display: flex; align-items: center; gap: 11px; min-height: 48px; padding: 5px 4px; }
      .download-row + .download-row { border-top: 1px solid var(--oppai-border); }
      .download-ring {
        width: 36px; height: 36px; flex: 0 0 36px; border-radius: 50%;
        display: grid; place-items: center; color: var(--oppai-primary-bright);
        background: conic-gradient(var(--oppai-primary) calc(var(--p) * 1turn), var(--oppai-border) 0);
        transition: background .8s linear; position: relative;
      }
      .download-ring::before { content: ""; position: absolute; inset: 3px; border-radius: 50%; background: var(--oppai-surface-2); }
      .download-ring span { position: relative; z-index: 1; font-size: 19px; }
      .download-copy { min-width: 0; flex: 1; }
      .download-title { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .download-status { font-size: 11px; opacity: .68; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .download-dismiss { border: 0; background: none; color: inherit; opacity: .66; cursor: pointer; padding: 5px; }
      .header-toggle.on {
        background: var(--oppai-primary-container);
        color: var(--oppai-primary-bright);
        border-color: var(--oppai-primary);
      }

      /* Phone navigation is a real bottom bar, not the desktop rail squeezed into a
         short viewport. The destinations scroll horizontally while Add, Settings,
         and the account remain reachable at the edges. Dynamic viewport units follow
         collapsing browser chrome; safe-area padding keeps the bar above home
         indicators, notches, and rounded landscape corners. */
      @media (max-width: 700px) {
        :host {
          flex-direction: column;
          height: 100dvh;
          min-height: -webkit-fill-available;
        }
        nav {
          order: 2;
          width: 100%;
          height: auto;
          flex: 0 0 auto;
          flex-direction: row;
          align-items: center;
          gap: 4px;
          padding:
            6px max(8px, env(safe-area-inset-right))
            calc(6px + env(safe-area-inset-bottom))
            max(8px, env(safe-area-inset-left));
          border-right: 0;
          border-top: 1px solid var(--oppai-surface-2);
        }
        nav .logo, .nav-spacer { display: none; }
        .add-btn { width: 44px; height: 44px; border-radius: 14px; flex: 0 0 44px; }
        .nav-list {
          min-width: 0;
          flex: 1 1 auto;
          width: auto;
          flex-direction: row;
          justify-content: flex-start;
          gap: 2px;
          overflow-x: auto;
          overflow-y: hidden;
          overscroll-behavior-x: contain;
          scrollbar-width: none;
          scroll-snap-type: x proximity;
        }
        .nav-item { width: 58px; flex: 0 0 58px; scroll-snap-align: nearest; }
        .nav-pill { width: 48px; height: 28px; }
        .nav-label { font-size: 10px; }
        .nav-utility { flex: 0 0 auto; }
        .main-col { order: 1; min-height: 0; height: auto; }
        header {
          height: calc(60px + env(safe-area-inset-top));
          padding: env(safe-area-inset-top) max(14px, env(safe-area-inset-right)) 0 max(14px, env(safe-area-inset-left));
          gap: 10px;
        }
        .h-title { max-width: 38vw; font-size: 17px; }
        main {
          padding: 20px max(16px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
        }
        main.flush { padding: 0; }
        .grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; }
        .download-area { right: max(10px, env(safe-area-inset-right)); bottom: calc(76px + env(safe-area-inset-bottom)); }
        .bulk-bar { bottom: calc(76px + env(safe-area-inset-bottom)); max-width: calc(100vw - 20px); overflow-x: auto; }
      }
    `];$([O({attribute:!1})],v.prototype,"user",2);$([f()],v.prototype,"items",2);$([f()],v.prototype,"total",2);$([f()],v.prototype,"sort",2);$([f()],v.prototype,"stats",2);$([f()],v.prototype,"home",2);$([f()],v.prototype,"chipTags",2);$([f()],v.prototype,"collections",2);$([f()],v.prototype,"openCollection",2);$([f()],v.prototype,"recents",2);$([f()],v.prototype,"loading",2);$([f()],v.prototype,"loadingMore",2);$([f()],v.prototype,"viewReady",2);$([f()],v.prototype,"section",2);$([f()],v.prototype,"selectedId",2);$([f()],v.prototype,"editMediaId",2);$([f()],v.prototype,"search",2);$([f()],v.prototype,"filters",2);$([f()],v.prototype,"favorites",2);$([f()],v.prototype,"uploadOpen",2);$([f()],v.prototype,"dragActive",2);$([f()],v.prototype,"selectMode",2);$([f()],v.prototype,"selected",2);$([f()],v.prototype,"busy",2);$([f()],v.prototype,"downloads",2);$([f()],v.prototype,"browseFrame",2);v=$([ae("oppai-library")],v);var Ts=Object.defineProperty,_s=Object.getOwnPropertyDescriptor,Fe=(e,t,i,o)=>{for(var a=o>1?void 0:o?_s(t,i):t,s=e.length-1,r;s>=0;s--)(r=e[s])&&(a=(o?r(t,i,a):r(a))||a);return o&&a&&Ts(t,i,a),a};let oe=class extends U{constructor(){super(...arguments),this.entries=[],this.open=!1,this.dismissed=!1,this.warnOnLeave=e=>{this.entries.some(t=>t.state==="uploading"||t.state==="processing")&&(e.preventDefault(),e.returnValue="")},this.toggle=()=>{this.open=!this.open,!this.open&&!this.entries.some(e=>R(e.state))&&(this.dismissed=!0)},this.close=e=>{e.stopPropagation(),this.dismissed=!0,this.open=!1}}connectedCallback(){super.connectedCallback(),yt(this,"upload manager"),this.unsubscribe=L.subscribe(e=>{e.some(t=>R(t.state))&&this.entries.every(t=>!R(t.state))&&(this.dismissed=!1,this.open=!0),this.entries=e}),L.restore(),window.addEventListener("beforeunload",this.warnOnLeave)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.unsubscribe)==null||e.call(this),window.removeEventListener("beforeunload",this.warnOnLeave)}render(){if(!this.entries.length||this.dismissed)return u;const e=this.entries.filter(a=>R(a.state)),t=this.entries.filter(a=>a.state==="failed"),i=this.entries.filter(a=>a.state==="completed"),o=e.length?`${e.length} upload${e.length===1?"":"s"} in progress`:t.length?`${t.length} upload${t.length===1?"":"s"} failed`:`${i.length} upload${i.length===1?"":"s"} finished`;return d`
      <section class="dock libby-enter" aria-label="Uploads">
        <header @click=${this.toggle}>
          <span class="material-symbols-rounded">${e.length?"cloud_upload":t.length?"error":"cloud_done"}</span>
          <span class="title">Uploads <span class="sub">${o}</span></span>
          <button class="icon-btn" aria-label=${this.open?"Collapse":"Expand"} @click=${this.toggle}>
            <span class="material-symbols-rounded">${this.open?"expand_more":"expand_less"}</span>
          </button>
          <button class="icon-btn" aria-label="Hide uploads" @click=${this.close}>
            <span class="material-symbols-rounded">close</span>
          </button>
        </header>
        <div class="body-wrap ${this.open?"open":""}">
          <div class="body">
            <div class="list">${this.entries.map(a=>this.renderRow(a))}</div>
            <footer>
              <span class="hint">${e.length?"One at a time, in order.":"Finished uploads stay here until cleared."}</span>
              <button class="link" ?disabled=${!this.entries.some(a=>W(a.state))}
                @click=${()=>L.clearFinished()}>
                Clear finished
              </button>
            </footer>
          </div>
        </div>
      </section>
    `}renderRow(e){const t=Math.round(Wa(e)*100),i=qa(e.bytesPerSecond),o=ja(e.etaSeconds);return d`
      <div class="row">
        <div class="name" title=${e.name}>${e.name}</div>
        <div class="controls">
          ${Ra(e)?d`<button class="icon-btn" aria-label="Pause" @click=${()=>L.pause(e.id)}>
            <span class="material-symbols-rounded">pause</span></button>`:u}
          ${Ua(e)?d`<button class="icon-btn" aria-label="Resume" @click=${()=>L.resume(e.id)}>
            <span class="material-symbols-rounded">play_arrow</span></button>`:u}
          ${Da(e)?d`<button class="icon-btn" aria-label="Retry" @click=${()=>L.retry(e.id)}>
            <span class="material-symbols-rounded">refresh</span></button>`:u}
          ${e.state==="completed"&&e.mediaId?d`<button class="icon-btn" aria-label="Open in the library" @click=${()=>this.openItem(e)}>
                <span class="material-symbols-rounded">open_in_new</span></button>`:u}
          ${e.state==="queued"||e.state==="paused"?d`
              <button class="icon-btn" aria-label="Move up" @click=${()=>L.move(e.id,-1)}>
                <span class="material-symbols-rounded">arrow_upward</span></button>
              <button class="icon-btn" aria-label="Move down" @click=${()=>L.move(e.id,1)}>
                <span class="material-symbols-rounded">arrow_downward</span></button>`:u}
          ${Na(e)?d`<button class="icon-btn" aria-label="Cancel" @click=${()=>L.cancel(e.id)}>
            <span class="material-symbols-rounded">stop_circle</span></button>`:u}
          ${Fa(e)?d`<button class="icon-btn" aria-label="Remove" @click=${()=>L.remove(e.id)}>
            <span class="material-symbols-rounded">close</span></button>`:u}
        </div>
        <div class="bar ${e.state==="failed"?"failed":e.state==="completed"?"done":""}">
          <span style="width:${t}%"></span>
        </div>
        <div class="meta">
          ${Ja(e)}
          <span class="sep">·</span>${Te(e.sentBytes)} of ${Te(e.size)} (${t}%)
          <span class="sep">·</span>${e.destination}
          ${e.mime?d`<span class="sep">·</span>${e.mime}`:u}
          ${i?d`<span class="sep">·</span>${i}`:u}
          ${o?d`<span class="sep">·</span>${o}`:u}
          ${e.retries?d`<span class="sep">·</span>${e.retries} retr${e.retries===1?"y":"ies"}`:u}
        </div>
        ${e.needsFile?d`<div class="err">The server still has ${Te(e.sentBytes)} of this. Choose the same file again to carry on.</div>`:u}
        ${e.error?d`<div class="err">${e.error}</div>`:u}
      </div>
    `}openItem(e){e.mediaId&&this.dispatchEvent(new CustomEvent("open-media",{detail:{id:e.mediaId},bubbles:!0,composed:!0}))}};oe.styles=[dt,E`
    :host { display: contents; }

    .dock {
      position: fixed;
      right: 16px;
      bottom: 16px;
      /* Above the mobile bottom bar and clear of the home indicator. */
      bottom: max(16px, calc(env(safe-area-inset-bottom) + 16px));
      z-index: 150;
      width: min(420px, calc(100vw - 32px));
      background: var(--oppai-surface, #1b1b1f);
      color: var(--oppai-text, #e5e1e6);
      border-radius: 16px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, .45);
      overflow: hidden;
      font-size: 13px;
    }
    @media (max-width: 600px) {
      .dock { right: 8px; left: 8px; width: auto; bottom: max(84px, calc(env(safe-area-inset-bottom) + 84px)); }
    }

    header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      cursor: pointer;
      user-select: none;
    }
    header .title { flex: 1; font-weight: 600; }
    header .sub { color: var(--oppai-text-muted, #a5a0a8); font-weight: 400; font-size: 12px; }

    .icon-btn {
      background: none;
      border: 0;
      color: inherit;
      cursor: pointer;
      padding: 4px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      line-height: 1;
    }
    .icon-btn:hover { background: rgba(255, 255, 255, .08); }
    .icon-btn[disabled] { opacity: .35; cursor: default; }
    .material-symbols-rounded { font-family: "Material Symbols Rounded"; font-size: 20px; }

    /* Collapse without measuring anything: a grid row animating 0fr → 1fr needs no
       height, forces no per-frame layout, and reflows nothing beneath it. */
    .body-wrap {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows .18s ease;
    }
    .body-wrap.open { grid-template-rows: 1fr; }
    .body { overflow: hidden; }
    .list { max-height: min(52vh, 420px); overflow-y: auto; }
    @media (prefers-reduced-motion: reduce) { .body-wrap { transition: none; } }

    .row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px 8px;
      padding: 10px 12px;
      border-top: 1px solid var(--oppai-outline, #49454f);
    }
    .name {
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta { grid-column: 1 / -1; color: var(--oppai-text-muted, #a5a0a8); font-size: 12px; }
    .meta .sep { opacity: .5; margin: 0 6px; }
    .err { grid-column: 1 / -1; color: var(--oppai-error, #f2b8b5); font-size: 12px; }
    .controls { display: flex; gap: 2px; align-items: center; }

    .bar {
      grid-column: 1 / -1;
      height: 4px;
      border-radius: 999px;
      background: rgba(255, 255, 255, .12);
      overflow: hidden;
    }
    .bar > span {
      display: block;
      height: 100%;
      background: var(--oppai-primary, #cfbcff);
      transition: width .2s linear;
    }
    .bar.failed > span { background: var(--oppai-error, #f2b8b5); }
    .bar.done > span { background: var(--oppai-success, #7ddc9a); }
    @media (prefers-reduced-motion: reduce) { .bar > span { transition: none; } }

    footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-top: 1px solid var(--oppai-outline, #49454f);
    }
    .link {
      background: none;
      border: 0;
      color: var(--oppai-primary, #cfbcff);
      cursor: pointer;
      font: inherit;
      padding: 4px;
    }
    .hint { color: var(--oppai-text-muted, #a5a0a8); font-size: 12px; }
  `];Fe([f()],oe.prototype,"entries",2);Fe([f()],oe.prototype,"open",2);Fe([f()],oe.prototype,"dismissed",2);oe=Fe([ae("oppai-upload-manager")],oe);var Os=Object.defineProperty,As=Object.getOwnPropertyDescriptor,N=(e,t,i,o)=>{for(var a=o>1?void 0:o?As(t,i):t,s=e.length-1,r;s>=0;s--)(r=e[s])&&(a=(o?r(t,i,a):r(a))||a);return o&&a&&Os(t,i,a),a};const Ls=6e4;let M=class extends U{constructor(){super(...arguments),this.user=null,this.ready=!1,this.mascotMessage="",this.mascotTone="success",this.mascotEmotion="",this.mascotIntensity=0,this.typed="",this.beat=0,this.onMascot=e=>{const t=e.detail;this.mascotMessage=t.message,this.mascotTone=t.tone,this.mascotEmotion=t.emotion??"",this.mascotIntensity=t.intensity??0,this.beat++,this.typeLine(t.message),this.mascotTimer&&clearTimeout(this.mascotTimer),this.mascotTimer=window.setTimeout(()=>this.mascotMessage="",5e3+Dt(t.message))},this.onImported=e=>{const t=e.detail??{},i=Math.max(1,t.count??1),o=zo(i>1?2:1),a=Go({...t,count:i},{intensity:o});x(a.message,"success",{emotion:a.emotion,intensity:a.intensity})},this.onLibbyPref=()=>this.requestUpdate(),this.onLogout=()=>{this.user=null,this.stopProbe()},this.onVisible=()=>{document.visibilityState==="visible"&&this.user&&this.probe()}}connectedCallback(){super.connectedCallback(),yt(this,"app shell"),window.addEventListener("oppai-logout",this.onLogout),window.addEventListener("oppai-mascot",this.onMascot),window.addEventListener("oppai-libby-pref",this.onLibbyPref),window.addEventListener("imported",this.onImported),document.addEventListener("visibilitychange",this.onVisible),this.bootstrap()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("oppai-logout",this.onLogout),window.removeEventListener("oppai-mascot",this.onMascot),window.removeEventListener("oppai-libby-pref",this.onLibbyPref),window.removeEventListener("imported",this.onImported),document.removeEventListener("visibilitychange",this.onVisible),this.stopProbe(),this.mascotTimer&&clearTimeout(this.mascotTimer),this.typeTimer&&cancelAnimationFrame(this.typeTimer)}typeLine(e){if(this.typeTimer&&cancelAnimationFrame(this.typeTimer),window.matchMedia("(prefers-reduced-motion: reduce)").matches){this.typed=e;return}const t=Dt(e),i=performance.now();this.typed="";const o=()=>{const a=Math.min(1,(performance.now()-i)/Math.max(1,t));this.typed=e.slice(0,Math.ceil(e.length*a)),a<1?this.typeTimer=requestAnimationFrame(o):this.typeTimer=void 0};this.typeTimer=requestAnimationFrame(o)}async bootstrap(){if(ge())try{this.user=await g.me(),this.startProbe()}catch{Xe(null)}this.ready=!0}async probe(){if(ge())try{await g.me()}catch{}}startProbe(){this.stopProbe(),this.probeTimer=window.setInterval(()=>void this.probe(),Ls)}stopProbe(){this.probeTimer&&(clearInterval(this.probeTimer),this.probeTimer=void 0)}onLoggedIn(e){this.mascotMessage="",this.user=e.detail,this.startProbe()}async logout(){try{await g.logout()}catch{}Xe(null),this.user=null,this.stopProbe()}renderSnackbar(){return this.mascotMessage?d`<div class="snackbar ${this.mascotTone}"
      role=${this.mascotTone==="error"?"alert":"status"}>
      <span class="material-symbols-rounded" aria-hidden="true"
        >${this.mascotTone==="error"?"error":"check_circle"}</span>
      <span>${this.mascotMessage}</span>
    </div>`:null}render(){const e=Le()&&!this.user,t=Qe(),i=this.mascotEmotion?{emotion:this.mascotEmotion,intensity:this.mascotIntensity||1}:Po(this.mascotMessage),o=Mo(i.emotion,Ao(i.intensity)),a=this.typed.length>=this.mascotMessage.length,s=this.mascotTone==="error"?"libby-startle":"libby-speak",r=e?this.renderSnackbar():this.mascotMessage?d`<div class="mascot-talk libby-enter ${this.mascotTone} ${t?"plain":""}">
          <div class="speech" role=${this.mascotTone==="error"?"alert":"status"}
            aria-label=${this.mascotMessage}>
            ${t?null:d`<span class="libby-name">Libby</span>`}
            <span class="line" aria-hidden="true"
              ><span class="ghost">${this.mascotMessage}<span class="caret">▼</span></span
              ><span class="shown">${this.typed}${a?d`<span class="caret libby-caret">▼</span>`:null}</span
            ></span>
          </div>
          ${t?null:d`<span class="pixel-sprite libby-breathe">${hi(`${this.beat}-${i.emotion}-${i.intensity}`,d`<img class=${s} src=${o[0]} data-fallback-index="0"
                  alt=${`Libby feeling ${i.emotion}`}
                  @error=${l=>Ro(l.target,o)} />`)}</span>`}
        </div>`:null;return this.ready?this.user?d`<oppai-library
      .user=${this.user}
      @logout=${this.logout}
    ></oppai-library><oppai-upload-manager></oppai-upload-manager>${r}`:(G(()=>import("./login-Bp8ZrgCy.js"),__vite__mapDeps([9,8,4,2]),import.meta.url),d`<oppai-login @logged-in=${this.onLoggedIn}></oppai-login>`):d`<div class="center"><md-circular-progress indeterminate></md-circular-progress></div>${r}`}};M.styles=[yi,E`
    :host { display: block; min-height: 100vh; min-height: 100dvh; }
    .center { display: grid; place-items: center; height: 100vh; height: 100dvh; }

    /* Libby's pop-up follows the peach pixel dialogue reference: warm paper, dark
       stepped outline, coral lower edge and a pointed lower-right tail. Her sprite
       remains beside it as the speaker instead of being replaced by a toast icon. */
    .mascot-talk {
      position: fixed;
      right: 18px;
      top: 72px;
      z-index: 200;
      display: flex;
      align-items: flex-end;
      gap: 0;
      pointer-events: none;
      --pixel-ink: #29262a;
      --pixel-bg: #f3bd86;
      --pixel-bg-top: #f7c994;
      --pixel-shadow: #c96f5b;
      --pixel-accent: #7b3f2e;
    }
    .mascot-talk.error { --pixel-ink: #6f2928; --pixel-accent: #8d302d; }

    /* The sprite stands cleanly beside the box. The reference's tail points toward
       this space, so framing her in a second box would make two competing bubbles. */
    .pixel-sprite {
      flex: 0 0 auto;
      position: relative;
      width: 96px;
      height: 132px;
      margin-left: 14px;
    }
    .pixel-sprite img {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: bottom center;
      filter: drop-shadow(0 5px 5px rgba(0,0,0,.3));
      transform-origin: 50% 100%;
    }

    .speech {
      position: relative;
      max-width: min(330px, 55vw);
      margin: 0 0 20px 0;
      padding: 13px 16px 17px;
      background: linear-gradient(180deg, var(--pixel-bg-top), var(--pixel-bg));
      color: #35282a;
      border: 3px solid var(--pixel-ink);
      border-radius: 6px;
      box-shadow:
        inset 0 0 0 2px rgba(255, 225, 183, .42),
        inset 0 -5px 0 var(--pixel-shadow),
        0 3px 0 var(--pixel-shadow);
      font: 500 13px/1.5 ui-monospace, "Cascadia Mono", Consolas, "DejaVu Sans Mono", monospace;
      letter-spacing: .02em;
    }
    /* Two clipped layers make the outlined, lower-right speech tail from the
       reference. The fill sits inside the dark silhouette and inherits its peach. */
    .speech::before,
    .speech::after {
      content: "";
      position: absolute;
      clip-path: polygon(0 0, 100% 100%, 74% 0);
    }
    .speech::before { right: -16px; bottom: -17px; width: 27px; height: 31px; background: var(--pixel-ink); }
    .speech::after { right: -10px; bottom: -10px; width: 18px; height: 23px; background: var(--pixel-shadow); }
    /* Libby hidden: the frame alone, without the sprite's footprint. */
    .mascot-talk.plain .speech::before,
    .mascot-talk.plain .speech::after { display: none; }

    .libby-name {
      display: block;
      margin-bottom: 3px;
      color: var(--pixel-accent);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .14em;
      text-transform: uppercase;
    }
    /* The box is sized by the *whole* line from the first frame, with the typed
       portion laid over the top. Without this it grows a character at a time — and
       since the pop-up is anchored to the right edge, a growing box drags itself and
       her portrait leftwards across the screen for the length of the animation. The
       ghost is what a dialogue box's fixed frame is, done in flow layout. */
    .line { position: relative; display: block; }
    .ghost { visibility: hidden; }
    .shown { position: absolute; inset: 0; }
    /* The "there is more" marker every dialogue box has. It appears only once the
       line has finished typing, so it means what it looks like it means — and the
       ghost reserves its width so its arrival cannot reflow the last word. */
    .caret {
      display: inline-block;
      margin-left: 4px;
      color: var(--pixel-accent);
      font-size: 11px;
    }

    @media (max-width: 600px) {
      .mascot-talk { top: 64px; right: 14px; }
      .pixel-sprite { width: 70px; height: 96px; margin-left: 10px; }
      .speech { max-width: 66vw; padding: 10px 12px 14px; font-size: 12px; }
    }

    /* ── Standard errors ──────────────────────────────────────────────────
       The incognito error surface: an ordinary snackbar, bottom-centre, in the
       app's own colours.

       Hiding Libby already drops her artwork and her name, but what is left is
       still a peach pixel dialogue box that types its line out — which is a
       character even with nobody in it. Under the disguise that is exactly
       wrong, so this is a different element rather than the same one with the
       sprite removed: no typing, no caret, no tail, and it appears where a
       notification appears rather than where a mascot stands. */
    .snackbar {
      position: fixed;
      left: 50%;
      bottom: 22px;
      z-index: 200;
      transform: translateX(-50%);
      max-width: min(520px, calc(100vw - 32px));
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      background: #323232;
      color: #fff;
      box-shadow: 0 6px 22px rgba(0, 0, 0, 0.4);
      font: 400 14px/1.45 Roboto, system-ui, sans-serif;
      animation: oppai-snackbar-in 0.18s ease-out both;
    }
    .snackbar.error { background: #b3261e; }
    .snackbar .material-symbols-rounded { font-size: 19px; flex: 0 0 auto; }
    @keyframes oppai-snackbar-in {
      from { opacity: 0; transform: translate(-50%, 12px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .snackbar { animation: none; }
    }
  `];N([f()],M.prototype,"user",2);N([f()],M.prototype,"ready",2);N([f()],M.prototype,"mascotMessage",2);N([f()],M.prototype,"mascotTone",2);N([f()],M.prototype,"mascotEmotion",2);N([f()],M.prototype,"mascotIntensity",2);N([f()],M.prototype,"typed",2);N([f()],M.prototype,"beat",2);M=N([ae("oppai-app")],M);const Ni=document.createElement("style");Ni.textContent=bo;document.head.appendChild(Ni);document.adoptedStyleSheets=[...document.adoptedStyleSheets,yo.styleSheet];ct(Ae());wo();export{ar as $,u as A,yt as B,rs as C,qs as D,vo as E,ct as F,rr as G,Bs as H,No as I,js as J,_ as K,xi as L,lt as M,O as N,or as O,ir as P,ui as Q,Hs as R,Rt as S,le as T,ua as U,Sa as V,ds as W,F as X,ha as Y,Xs as Z,$e as _,U as a,Fo as a0,Oo as a1,Ws as a2,Me as a3,Ci as a4,Js as a5,oa as a6,tr as a7,er as a8,Qs as a9,co as aA,no as aB,ri as aC,ni as aD,lo as aE,Ns as aF,V as aG,So as aH,Zs as aa,A as ab,zs as ac,Eo as ad,Gs as ae,Ys as af,Q as ag,mi as ah,Fs as ai,Gt as aj,_a as ak,Ea as al,ka as am,Oi as an,wa as ao,Ta as ap,$a as aq,cs as ar,nr as as,lr as at,us as au,z as av,hs as aw,ys as ax,ms as ay,po as az,d as b,Po as c,Le as d,g as e,Mo as f,X as g,Qe as h,E as i,hi as j,Ro as k,Pe as l,x as m,fe as n,Oa as o,Ao as p,dt as q,yi as r,Xe as s,ae as t,f as u,Ae as v,sr as w,Co as x,Ks as y,Vs as z};
