const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./settings-BIK_coIF.js","./passkeys-CwVQQDQm.js","./browse-DpNZ39-D.js","./query-__j_ZMY6.js","./imagegen-DQ0vvivq.js","./chat-49rs1ir7.js","./scrape-dialog-CySSLrGD.js","./shared-styles-Cxxw8iY8.js","./login-Bf0UiZKM.js"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))o(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const r of s.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&o(r)}).observe(document,{childList:!0,subtree:!0});function i(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function o(a){if(a.ep)return;a.ep=!0;const s=i(a);fetch(a.href,s)}})();function xe(e,t,i,o){var a=arguments.length,s=a<3?t:o===null?o=Object.getOwnPropertyDescriptor(t,i):o,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")s=Reflect.decorate(e,t,i,o);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(s=(a<3?r(s):a>3?r(t,i,s):r(t,i))||s);return a>3&&s&&Object.defineProperty(t,i,s),s}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const se=e=>(t,i)=>{i!==void 0?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)};/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ce=globalThis,st=Ce.ShadowRoot&&(Ce.ShadyCSS===void 0||Ce.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,rt=Symbol(),Ct=new WeakMap;let ni=class{constructor(t,i,o){if(this._$cssResult$=!0,o!==rt)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=i}get styleSheet(){let t=this.o;const i=this.t;if(st&&t===void 0){const o=i!==void 0&&i.length===1;o&&(t=Ct.get(i)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),o&&Ct.set(i,t))}return t}toString(){return this.cssText}};const Ki=e=>new ni(typeof e=="string"?e:e+"",void 0,rt),T=(e,...t)=>{const i=e.length===1?e[0]:t.reduce((o,a,s)=>o+(r=>{if(r._$cssResult$===!0)return r.cssText;if(typeof r=="number")return r;throw Error("Value passed to 'css' function must be a 'css' function result: "+r+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(a)+e[s+1],e[0]);return new ni(i,e,rt)},Vi=(e,t)=>{if(st)e.adoptedStyleSheets=t.map(i=>i instanceof CSSStyleSheet?i:i.styleSheet);else for(const i of t){const o=document.createElement("style"),a=Ce.litNonce;a!==void 0&&o.setAttribute("nonce",a),o.textContent=i.cssText,e.appendChild(o)}},Et=st?e=>e:e=>e instanceof CSSStyleSheet?(t=>{let i="";for(const o of t.cssRules)i+=o.cssText;return Ki(i)})(e):e;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:Xi,defineProperty:Zi,getOwnPropertyDescriptor:Qi,getOwnPropertyNames:eo,getOwnPropertySymbols:to,getPrototypeOf:io}=Object,Y=globalThis,Tt=Y.trustedTypes,oo=Tt?Tt.emptyScript:"",He=Y.reactiveElementPolyfillSupport,pe=(e,t)=>e,Oe={toAttribute(e,t){switch(t){case Boolean:e=e?oo:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=e!==null;break;case Number:i=e===null?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch{i=null}}return i}},nt=(e,t)=>!Xi(e,t),Ot={attribute:!0,type:String,converter:Oe,reflect:!1,useDefault:!1,hasChanged:nt};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),Y.litPropertyMetadata??(Y.litPropertyMetadata=new WeakMap);let Z=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??(this.l=[])).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,i=Ot){if(i.state&&(i.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((i=Object.create(i)).wrapped=!0),this.elementProperties.set(t,i),!i.noAccessor){const o=Symbol(),a=this.getPropertyDescriptor(t,o,i);a!==void 0&&Zi(this.prototype,t,a)}}static getPropertyDescriptor(t,i,o){const{get:a,set:s}=Qi(this.prototype,t)??{get(){return this[i]},set(r){this[i]=r}};return{get:a,set(r){const l=a==null?void 0:a.call(this);s==null||s.call(this,r),this.requestUpdate(t,l,o)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??Ot}static _$Ei(){if(this.hasOwnProperty(pe("elementProperties")))return;const t=io(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(pe("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(pe("properties"))){const i=this.properties,o=[...eo(i),...to(i)];for(const a of o)this.createProperty(a,i[a])}const t=this[Symbol.metadata];if(t!==null){const i=litPropertyMetadata.get(t);if(i!==void 0)for(const[o,a]of i)this.elementProperties.set(o,a)}this._$Eh=new Map;for(const[i,o]of this.elementProperties){const a=this._$Eu(i,o);a!==void 0&&this._$Eh.set(a,i)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const i=[];if(Array.isArray(t)){const o=new Set(t.flat(1/0).reverse());for(const a of o)i.unshift(Et(a))}else t!==void 0&&i.push(Et(t));return i}static _$Eu(t,i){const o=i.attribute;return o===!1?void 0:typeof o=="string"?o:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var t;this._$ES=new Promise(i=>this.enableUpdating=i),this._$AL=new Map,this._$E_(),this.requestUpdate(),(t=this.constructor.l)==null||t.forEach(i=>i(this))}addController(t){var i;(this._$EO??(this._$EO=new Set)).add(t),this.renderRoot!==void 0&&this.isConnected&&((i=t.hostConnected)==null||i.call(t))}removeController(t){var i;(i=this._$EO)==null||i.delete(t)}_$E_(){const t=new Map,i=this.constructor.elementProperties;for(const o of i.keys())this.hasOwnProperty(o)&&(t.set(o,this[o]),delete this[o]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Vi(t,this.constructor.elementStyles),t}connectedCallback(){var t;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(t=this._$EO)==null||t.forEach(i=>{var o;return(o=i.hostConnected)==null?void 0:o.call(i)})}enableUpdating(t){}disconnectedCallback(){var t;(t=this._$EO)==null||t.forEach(i=>{var o;return(o=i.hostDisconnected)==null?void 0:o.call(i)})}attributeChangedCallback(t,i,o){this._$AK(t,o)}_$ET(t,i){var s;const o=this.constructor.elementProperties.get(t),a=this.constructor._$Eu(t,o);if(a!==void 0&&o.reflect===!0){const r=(((s=o.converter)==null?void 0:s.toAttribute)!==void 0?o.converter:Oe).toAttribute(i,o.type);this._$Em=t,r==null?this.removeAttribute(a):this.setAttribute(a,r),this._$Em=null}}_$AK(t,i){var s,r;const o=this.constructor,a=o._$Eh.get(t);if(a!==void 0&&this._$Em!==a){const l=o.getPropertyOptions(a),c=typeof l.converter=="function"?{fromAttribute:l.converter}:((s=l.converter)==null?void 0:s.fromAttribute)!==void 0?l.converter:Oe;this._$Em=a;const p=c.fromAttribute(i,l.type);this[a]=p??((r=this._$Ej)==null?void 0:r.get(a))??p,this._$Em=null}}requestUpdate(t,i,o,a=!1,s){var r;if(t!==void 0){const l=this.constructor;if(a===!1&&(s=this[t]),o??(o=l.getPropertyOptions(t)),!((o.hasChanged??nt)(s,i)||o.useDefault&&o.reflect&&s===((r=this._$Ej)==null?void 0:r.get(t))&&!this.hasAttribute(l._$Eu(t,o))))return;this.C(t,i,o)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,i,{useDefault:o,reflect:a,wrapped:s},r){o&&!(this._$Ej??(this._$Ej=new Map)).has(t)&&(this._$Ej.set(t,r??i??this[t]),s!==!0||r!==void 0)||(this._$AL.has(t)||(this.hasUpdated||o||(i=void 0),this._$AL.set(t,i)),a===!0&&this._$Em!==t&&(this._$Eq??(this._$Eq=new Set)).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(i){Promise.reject(i)}const t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var o;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[s,r]of this._$Ep)this[s]=r;this._$Ep=void 0}const a=this.constructor.elementProperties;if(a.size>0)for(const[s,r]of a){const{wrapped:l}=r,c=this[s];l!==!0||this._$AL.has(s)||c===void 0||this.C(s,void 0,r,c)}}let t=!1;const i=this._$AL;try{t=this.shouldUpdate(i),t?(this.willUpdate(i),(o=this._$EO)==null||o.forEach(a=>{var s;return(s=a.hostUpdate)==null?void 0:s.call(a)}),this.update(i)):this._$EM()}catch(a){throw t=!1,this._$EM(),a}t&&this._$AE(i)}willUpdate(t){}_$AE(t){var i;(i=this._$EO)==null||i.forEach(o=>{var a;return(a=o.hostUpdated)==null?void 0:a.call(o)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&(this._$Eq=this._$Eq.forEach(i=>this._$ET(i,this[i]))),this._$EM()}updated(t){}firstUpdated(t){}};Z.elementStyles=[],Z.shadowRootOptions={mode:"open"},Z[pe("elementProperties")]=new Map,Z[pe("finalized")]=new Map,He==null||He({ReactiveElement:Z}),(Y.reactiveElementVersions??(Y.reactiveElementVersions=[])).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ao={attribute:!0,type:String,converter:Oe,reflect:!1,hasChanged:nt},so=(e=ao,t,i)=>{const{kind:o,metadata:a}=i;let s=globalThis.litPropertyMetadata.get(a);if(s===void 0&&globalThis.litPropertyMetadata.set(a,s=new Map),o==="setter"&&((e=Object.create(e)).wrapped=!0),s.set(i.name,e),o==="accessor"){const{name:r}=i;return{set(l){const c=t.get.call(this);t.set.call(this,l),this.requestUpdate(r,c,e,!0,l)},init(l){return l!==void 0&&this.C(r,void 0,e,l),l}}}if(o==="setter"){const{name:r}=i;return function(l){const c=this[r];t.call(this,l),this.requestUpdate(r,c,e,!0,l)}}throw Error("Unsupported decorator location: "+o)};function O(e){return(t,i)=>typeof i=="object"?so(e,t,i):((o,a,s)=>{const r=a.hasOwnProperty(s);return a.constructor.createProperty(s,o),r?Object.getOwnPropertyDescriptor(a,s):void 0})(e,t,i)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function f(e){return O({...e,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const he=globalThis,_t=e=>e,_e=he.trustedTypes,Lt=_e?_e.createPolicy("lit-html",{createHTML:e=>e}):void 0,li="$lit$",H=`lit$${Math.random().toFixed(9).slice(2)}$`,di="?"+H,ro=`<${di}>`,K=document,ue=()=>K.createComment(""),me=e=>e===null||typeof e!="object"&&typeof e!="function",lt=Array.isArray,no=e=>lt(e)||typeof(e==null?void 0:e[Symbol.iterator])=="function",Ye=`[ 	
\f\r]`,re=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,At=/-->/g,Pt=/>/g,G=RegExp(`>|${Ye}(?:([^\\s"'>=/]+)(${Ye}*=${Ye}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Mt=/'/g,Rt=/"/g,ci=/^(?:script|style|textarea|title)$/i,lo=e=>(t,...i)=>({_$litType$:e,strings:t,values:i}),d=lo(1),V=Symbol.for("lit-noChange"),m=Symbol.for("lit-nothing"),Ut=new WeakMap,J=K.createTreeWalker(K,129);function pi(e,t){if(!lt(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return Lt!==void 0?Lt.createHTML(t):t}const co=(e,t)=>{const i=e.length-1,o=[];let a,s=t===2?"<svg>":t===3?"<math>":"",r=re;for(let l=0;l<i;l++){const c=e[l];let p,u,h=-1,b=0;for(;b<c.length&&(r.lastIndex=b,u=r.exec(c),u!==null);)b=r.lastIndex,r===re?u[1]==="!--"?r=At:u[1]!==void 0?r=Pt:u[2]!==void 0?(ci.test(u[2])&&(a=RegExp("</"+u[2],"g")),r=G):u[3]!==void 0&&(r=G):r===G?u[0]===">"?(r=a??re,h=-1):u[1]===void 0?h=-2:(h=r.lastIndex-u[2].length,p=u[1],r=u[3]===void 0?G:u[3]==='"'?Rt:Mt):r===Rt||r===Mt?r=G:r===At||r===Pt?r=re:(r=G,a=void 0);const y=r===G&&e[l+1].startsWith("/>")?" ":"";s+=r===re?c+ro:h>=0?(o.push(p),c.slice(0,h)+li+c.slice(h)+H+y):c+H+(h===-2?l:y)}return[pi(e,s+(e[i]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),o]};class ge{constructor({strings:t,_$litType$:i},o){let a;this.parts=[];let s=0,r=0;const l=t.length-1,c=this.parts,[p,u]=co(t,i);if(this.el=ge.createElement(p,o),J.currentNode=this.el.content,i===2||i===3){const h=this.el.content.firstChild;h.replaceWith(...h.childNodes)}for(;(a=J.nextNode())!==null&&c.length<l;){if(a.nodeType===1){if(a.hasAttributes())for(const h of a.getAttributeNames())if(h.endsWith(li)){const b=u[r++],y=a.getAttribute(h).split(H),x=/([.?@])?(.*)/.exec(b);c.push({type:1,index:s,name:x[2],strings:y,ctor:x[1]==="."?ho:x[1]==="?"?uo:x[1]==="@"?mo:De}),a.removeAttribute(h)}else h.startsWith(H)&&(c.push({type:6,index:s}),a.removeAttribute(h));if(ci.test(a.tagName)){const h=a.textContent.split(H),b=h.length-1;if(b>0){a.textContent=_e?_e.emptyScript:"";for(let y=0;y<b;y++)a.append(h[y],ue()),J.nextNode(),c.push({type:2,index:++s});a.append(h[b],ue())}}}else if(a.nodeType===8)if(a.data===di)c.push({type:2,index:s});else{let h=-1;for(;(h=a.data.indexOf(H,h+1))!==-1;)c.push({type:7,index:s}),h+=H.length-1}s++}}static createElement(t,i){const o=K.createElement("template");return o.innerHTML=t,o}}function ie(e,t,i=e,o){var r,l;if(t===V)return t;let a=o!==void 0?(r=i._$Co)==null?void 0:r[o]:i._$Cl;const s=me(t)?void 0:t._$litDirective$;return(a==null?void 0:a.constructor)!==s&&((l=a==null?void 0:a._$AO)==null||l.call(a,!1),s===void 0?a=void 0:(a=new s(e),a._$AT(e,i,o)),o!==void 0?(i._$Co??(i._$Co=[]))[o]=a:i._$Cl=a),a!==void 0&&(t=ie(e,a._$AS(e,t.values),a,o)),t}class po{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:o}=this._$AD,a=((t==null?void 0:t.creationScope)??K).importNode(i,!0);J.currentNode=a;let s=J.nextNode(),r=0,l=0,c=o[0];for(;c!==void 0;){if(r===c.index){let p;c.type===2?p=new $e(s,s.nextSibling,this,t):c.type===1?p=new c.ctor(s,c.name,c.strings,this,t):c.type===6&&(p=new go(s,this,t)),this._$AV.push(p),c=o[++l]}r!==(c==null?void 0:c.index)&&(s=J.nextNode(),r++)}return J.currentNode=K,a}p(t){let i=0;for(const o of this._$AV)o!==void 0&&(o.strings!==void 0?(o._$AI(t,o,i),i+=o.strings.length-2):o._$AI(t[i])),i++}}class $e{get _$AU(){var t;return((t=this._$AM)==null?void 0:t._$AU)??this._$Cv}constructor(t,i,o,a){this.type=2,this._$AH=m,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=o,this.options=a,this._$Cv=(a==null?void 0:a.isConnected)??!0}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return i!==void 0&&(t==null?void 0:t.nodeType)===11&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=ie(this,t,i),me(t)?t===m||t==null||t===""?(this._$AH!==m&&this._$AR(),this._$AH=m):t!==this._$AH&&t!==V&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):no(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==m&&me(this._$AH)?this._$AA.nextSibling.data=t:this.T(K.createTextNode(t)),this._$AH=t}$(t){var s;const{values:i,_$litType$:o}=t,a=typeof o=="number"?this._$AC(t):(o.el===void 0&&(o.el=ge.createElement(pi(o.h,o.h[0]),this.options)),o);if(((s=this._$AH)==null?void 0:s._$AD)===a)this._$AH.p(i);else{const r=new po(a,this),l=r.u(this.options);r.p(i),this.T(l),this._$AH=r}}_$AC(t){let i=Ut.get(t.strings);return i===void 0&&Ut.set(t.strings,i=new ge(t)),i}k(t){lt(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let o,a=0;for(const s of t)a===i.length?i.push(o=new $e(this.O(ue()),this.O(ue()),this,this.options)):o=i[a],o._$AI(s),a++;a<i.length&&(this._$AR(o&&o._$AB.nextSibling,a),i.length=a)}_$AR(t=this._$AA.nextSibling,i){var o;for((o=this._$AP)==null?void 0:o.call(this,!1,!0,i);t!==this._$AB;){const a=_t(t).nextSibling;_t(t).remove(),t=a}}setConnected(t){var i;this._$AM===void 0&&(this._$Cv=t,(i=this._$AP)==null||i.call(this,t))}}class De{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,o,a,s){this.type=1,this._$AH=m,this._$AN=void 0,this.element=t,this.name=i,this._$AM=a,this.options=s,o.length>2||o[0]!==""||o[1]!==""?(this._$AH=Array(o.length-1).fill(new String),this.strings=o):this._$AH=m}_$AI(t,i=this,o,a){const s=this.strings;let r=!1;if(s===void 0)t=ie(this,t,i,0),r=!me(t)||t!==this._$AH&&t!==V,r&&(this._$AH=t);else{const l=t;let c,p;for(t=s[0],c=0;c<s.length-1;c++)p=ie(this,l[o+c],i,c),p===V&&(p=this._$AH[c]),r||(r=!me(p)||p!==this._$AH[c]),p===m?t=m:t!==m&&(t+=(p??"")+s[c+1]),this._$AH[c]=p}r&&!a&&this.j(t)}j(t){t===m?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class ho extends De{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===m?void 0:t}}class uo extends De{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==m)}}class mo extends De{constructor(t,i,o,a,s){super(t,i,o,a,s),this.type=5}_$AI(t,i=this){if((t=ie(this,t,i,0)??m)===V)return;const o=this._$AH,a=t===m&&o!==m||t.capture!==o.capture||t.once!==o.once||t.passive!==o.passive,s=t!==m&&(o===m||a);a&&this.element.removeEventListener(this.name,this,o),s&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){var i;typeof this._$AH=="function"?this._$AH.call(((i=this.options)==null?void 0:i.host)??this.element,t):this._$AH.handleEvent(t)}}class go{constructor(t,i,o){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=o}get _$AU(){return this._$AM._$AU}_$AI(t){ie(this,t)}}const Ge=he.litHtmlPolyfillSupport;Ge==null||Ge(ge,$e),(he.litHtmlVersions??(he.litHtmlVersions=[])).push("3.3.3");const fo=(e,t,i)=>{const o=(i==null?void 0:i.renderBefore)??t;let a=o._$litPart$;if(a===void 0){const s=(i==null?void 0:i.renderBefore)??null;o._$litPart$=a=new $e(t.insertBefore(ue(),s),s,void 0,i??{})}return a._$AI(e),a};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const j=globalThis;let U=class extends Z{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var i;const t=super.createRenderRoot();return(i=this.renderOptions).renderBefore??(i.renderBefore=t.firstChild),t}update(t){const i=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=fo(i,this.renderRoot,this.renderOptions)}connectedCallback(){var t;super.connectedCallback(),(t=this._$Do)==null||t.setConnected(!0)}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this._$Do)==null||t.setConnected(!1)}render(){return V}};var ri;U._$litElement$=!0,U.finalized=!0,(ri=j.litElementHydrateSupport)==null||ri.call(j,{LitElement:U});const Je=j.litElementPolyfillSupport;Je==null||Je({LitElement:U});(j.litElementVersions??(j.litElementVersions=[])).push("4.2.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const bo={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4},hi=e=>(...t)=>({_$litDirective$:e,values:t});let ui=class{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,i,o){this._$Ct=t,this._$AM=i,this._$Ci=o}_$AS(t,i){return this.update(t,i)}update(t,i){return this.render(...i)}};/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const yo=hi(class extends ui{constructor(e){var t;if(super(e),e.type!==bo.ATTRIBUTE||e.name!=="class"||((t=e.strings)==null?void 0:t.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return" "+Object.keys(e).filter(t=>e[t]).join(" ")+" "}update(e,[t]){var o,a;if(this.st===void 0){this.st=new Set,e.strings!==void 0&&(this.nt=new Set(e.strings.join(" ").split(/\s/).filter(s=>s!=="")));for(const s in t)t[s]&&!((o=this.nt)!=null&&o.has(s))&&this.st.add(s);return this.render(t)}const i=e.element.classList;for(const s of this.st)s in t||(i.remove(s),this.st.delete(s));for(const s in t){const r=!!t[s];r===this.st.has(s)||(a=this.nt)!=null&&a.has(s)||(r?(i.add(s),this.st.add(s)):(i.remove(s),this.st.delete(s)))}return V}});/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const mi=["role","ariaAtomic","ariaAutoComplete","ariaBusy","ariaChecked","ariaColCount","ariaColIndex","ariaColSpan","ariaCurrent","ariaDisabled","ariaExpanded","ariaHasPopup","ariaHidden","ariaInvalid","ariaKeyShortcuts","ariaLabel","ariaLevel","ariaLive","ariaModal","ariaMultiLine","ariaMultiSelectable","ariaOrientation","ariaPlaceholder","ariaPosInSet","ariaPressed","ariaReadOnly","ariaRequired","ariaRoleDescription","ariaRowCount","ariaRowIndex","ariaRowSpan","ariaSelected","ariaSetSize","ariaSort","ariaValueMax","ariaValueMin","ariaValueNow","ariaValueText"],vo=mi.map(gi);function je(e){return vo.includes(e)}function gi(e){return e.replace("aria","aria-").replace(/Elements?/g,"").toLowerCase()}/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Se=Symbol("privateIgnoreAttributeChangesFor");function wo(e){var t;class i extends e{constructor(){super(...arguments),this[t]=new Set}attributeChangedCallback(a,s,r){if(!je(a)){super.attributeChangedCallback(a,s,r);return}if(this[Se].has(a))return;this[Se].add(a),this.removeAttribute(a),this[Se].delete(a);const l=Ve(a);r===null?delete this.dataset[l]:this.dataset[l]=r,this.requestUpdate(Ve(a),s)}getAttribute(a){return je(a)?super.getAttribute(Ke(a)):super.getAttribute(a)}removeAttribute(a){super.removeAttribute(a),je(a)&&(super.removeAttribute(Ke(a)),this.requestUpdate())}}return t=Se,xo(i),i}function xo(e){for(const t of mi){const i=gi(t),o=Ke(i),a=Ve(i);e.createProperty(t,{attribute:i,noAccessor:!0}),e.createProperty(Symbol(o),{attribute:o,noAccessor:!0}),Object.defineProperty(e.prototype,t,{configurable:!0,enumerable:!0,get(){return this.dataset[a]??null},set(s){const r=this.dataset[a]??null;s!==r&&(s===null?delete this.dataset[a]:this.dataset[a]=s,this.requestUpdate(t,r))}})}}function Ke(e){return`data-${e}`}function Ve(e){return e.replace(/-\w/,t=>t[1].toUpperCase())}/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const $o=wo(U);class ke extends $o{constructor(){super(...arguments),this.value=0,this.max=1,this.indeterminate=!1,this.fourColor=!1}render(){const{ariaLabel:t}=this;return d`
      <div
        class="progress ${yo(this.getRenderClasses())}"
        role="progressbar"
        aria-label="${t||m}"
        aria-valuemin="0"
        aria-valuemax=${this.max}
        aria-valuenow=${this.indeterminate?m:this.value}
        >${this.renderIndicator()}</div
      >
    `}getRenderClasses(){return{indeterminate:this.indeterminate,"four-color":this.fourColor}}}xe([O({type:Number})],ke.prototype,"value",void 0);xe([O({type:Number})],ke.prototype,"max",void 0);xe([O({type:Boolean})],ke.prototype,"indeterminate",void 0);xe([O({type:Boolean,attribute:"four-color"})],ke.prototype,"fourColor",void 0);/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */class ko extends ke{renderIndicator(){return this.indeterminate?this.renderIndeterminateContainer():this.renderDeterminateContainer()}renderDeterminateContainer(){const t=(1-this.value/this.max)*100;return d`
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
 */const So=T`:host{--_active-indicator-color: var(--md-circular-progress-active-indicator-color, var(--md-sys-color-primary, #6750a4));--_active-indicator-width: var(--md-circular-progress-active-indicator-width, 10);--_four-color-active-indicator-four-color: var(--md-circular-progress-four-color-active-indicator-four-color, var(--md-sys-color-tertiary-container, #ffd8e4));--_four-color-active-indicator-one-color: var(--md-circular-progress-four-color-active-indicator-one-color, var(--md-sys-color-primary, #6750a4));--_four-color-active-indicator-three-color: var(--md-circular-progress-four-color-active-indicator-three-color, var(--md-sys-color-tertiary, #7d5260));--_four-color-active-indicator-two-color: var(--md-circular-progress-four-color-active-indicator-two-color, var(--md-sys-color-primary-container, #eaddff));--_size: var(--md-circular-progress-size, 48px);display:inline-flex;vertical-align:middle;width:var(--_size);height:var(--_size);position:relative;align-items:center;justify-content:center;contain:strict;content-visibility:auto}.progress{flex:1;align-self:stretch;margin:4px}.progress,.spinner,.left,.right,.circle,svg,.track,.active-track{position:absolute;inset:0}svg{transform:rotate(-90deg)}circle{cx:50%;cy:50%;r:calc(50%*(1 - var(--_active-indicator-width)/100));stroke-width:calc(var(--_active-indicator-width)*1%);stroke-dasharray:100;fill:rgba(0,0,0,0)}.active-track{transition:stroke-dashoffset 500ms cubic-bezier(0, 0, 0.2, 1);stroke:var(--_active-indicator-color)}.track{stroke:rgba(0,0,0,0)}.progress.indeterminate{animation:linear infinite linear-rotate;animation-duration:1568.2352941176ms}.spinner{animation:infinite both rotate-arc;animation-duration:5332ms;animation-timing-function:cubic-bezier(0.4, 0, 0.2, 1)}.left{overflow:hidden;inset:0 50% 0 0}.right{overflow:hidden;inset:0 0 0 50%}.circle{box-sizing:border-box;border-radius:50%;border:solid calc(var(--_active-indicator-width)/100*(var(--_size) - 8px));border-color:var(--_active-indicator-color) var(--_active-indicator-color) rgba(0,0,0,0) rgba(0,0,0,0);animation:expand-arc;animation-iteration-count:infinite;animation-fill-mode:both;animation-duration:1333ms,5332ms;animation-timing-function:cubic-bezier(0.4, 0, 0.2, 1)}.four-color .circle{animation-name:expand-arc,four-color}.left .circle{rotate:135deg;inset:0 -100% 0 0}.right .circle{rotate:100deg;inset:0 0 0 -100%;animation-delay:-666.5ms,0ms}@media(forced-colors: active){.active-track{stroke:CanvasText}.circle{border-color:CanvasText CanvasText Canvas Canvas}}@keyframes expand-arc{0%{transform:rotate(265deg)}50%{transform:rotate(130deg)}100%{transform:rotate(265deg)}}@keyframes rotate-arc{12.5%{transform:rotate(135deg)}25%{transform:rotate(270deg)}37.5%{transform:rotate(405deg)}50%{transform:rotate(540deg)}62.5%{transform:rotate(675deg)}75%{transform:rotate(810deg)}87.5%{transform:rotate(945deg)}100%{transform:rotate(1080deg)}}@keyframes linear-rotate{to{transform:rotate(360deg)}}@keyframes four-color{0%{border-top-color:var(--_four-color-active-indicator-one-color);border-right-color:var(--_four-color-active-indicator-one-color)}15%{border-top-color:var(--_four-color-active-indicator-one-color);border-right-color:var(--_four-color-active-indicator-one-color)}25%{border-top-color:var(--_four-color-active-indicator-two-color);border-right-color:var(--_four-color-active-indicator-two-color)}40%{border-top-color:var(--_four-color-active-indicator-two-color);border-right-color:var(--_four-color-active-indicator-two-color)}50%{border-top-color:var(--_four-color-active-indicator-three-color);border-right-color:var(--_four-color-active-indicator-three-color)}65%{border-top-color:var(--_four-color-active-indicator-three-color);border-right-color:var(--_four-color-active-indicator-three-color)}75%{border-top-color:var(--_four-color-active-indicator-four-color);border-right-color:var(--_four-color-active-indicator-four-color)}90%{border-top-color:var(--_four-color-active-indicator-four-color);border-right-color:var(--_four-color-active-indicator-four-color)}100%{border-top-color:var(--_four-color-active-indicator-one-color);border-right-color:var(--_four-color-active-indicator-one-color)}}
`;/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */let Xe=class extends ko{};Xe.styles=[So];Xe=xe([se("md-circular-progress")],Xe);/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Io=T`@layer{.md-typescale-display-small,.md-typescale-display-small-prominent{font:var(--md-sys-typescale-display-small-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-display-small-size, 2.25rem)/var(--md-sys-typescale-display-small-line-height, 2.75rem) var(--md-sys-typescale-display-small-font, var(--md-ref-typeface-brand, Roboto))}.md-typescale-display-medium,.md-typescale-display-medium-prominent{font:var(--md-sys-typescale-display-medium-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-display-medium-size, 2.8125rem)/var(--md-sys-typescale-display-medium-line-height, 3.25rem) var(--md-sys-typescale-display-medium-font, var(--md-ref-typeface-brand, Roboto))}.md-typescale-display-large,.md-typescale-display-large-prominent{font:var(--md-sys-typescale-display-large-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-display-large-size, 3.5625rem)/var(--md-sys-typescale-display-large-line-height, 4rem) var(--md-sys-typescale-display-large-font, var(--md-ref-typeface-brand, Roboto))}.md-typescale-headline-small,.md-typescale-headline-small-prominent{font:var(--md-sys-typescale-headline-small-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-headline-small-size, 1.5rem)/var(--md-sys-typescale-headline-small-line-height, 2rem) var(--md-sys-typescale-headline-small-font, var(--md-ref-typeface-brand, Roboto))}.md-typescale-headline-medium,.md-typescale-headline-medium-prominent{font:var(--md-sys-typescale-headline-medium-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-headline-medium-size, 1.75rem)/var(--md-sys-typescale-headline-medium-line-height, 2.25rem) var(--md-sys-typescale-headline-medium-font, var(--md-ref-typeface-brand, Roboto))}.md-typescale-headline-large,.md-typescale-headline-large-prominent{font:var(--md-sys-typescale-headline-large-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-headline-large-size, 2rem)/var(--md-sys-typescale-headline-large-line-height, 2.5rem) var(--md-sys-typescale-headline-large-font, var(--md-ref-typeface-brand, Roboto))}.md-typescale-title-small,.md-typescale-title-small-prominent{font:var(--md-sys-typescale-title-small-weight, var(--md-ref-typeface-weight-medium, 500)) var(--md-sys-typescale-title-small-size, 0.875rem)/var(--md-sys-typescale-title-small-line-height, 1.25rem) var(--md-sys-typescale-title-small-font, var(--md-ref-typeface-plain, Roboto))}.md-typescale-title-medium,.md-typescale-title-medium-prominent{font:var(--md-sys-typescale-title-medium-weight, var(--md-ref-typeface-weight-medium, 500)) var(--md-sys-typescale-title-medium-size, 1rem)/var(--md-sys-typescale-title-medium-line-height, 1.5rem) var(--md-sys-typescale-title-medium-font, var(--md-ref-typeface-plain, Roboto))}.md-typescale-title-large,.md-typescale-title-large-prominent{font:var(--md-sys-typescale-title-large-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-title-large-size, 1.375rem)/var(--md-sys-typescale-title-large-line-height, 1.75rem) var(--md-sys-typescale-title-large-font, var(--md-ref-typeface-brand, Roboto))}.md-typescale-body-small,.md-typescale-body-small-prominent{font:var(--md-sys-typescale-body-small-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-body-small-size, 0.75rem)/var(--md-sys-typescale-body-small-line-height, 1rem) var(--md-sys-typescale-body-small-font, var(--md-ref-typeface-plain, Roboto))}.md-typescale-body-medium,.md-typescale-body-medium-prominent{font:var(--md-sys-typescale-body-medium-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-body-medium-size, 0.875rem)/var(--md-sys-typescale-body-medium-line-height, 1.25rem) var(--md-sys-typescale-body-medium-font, var(--md-ref-typeface-plain, Roboto))}.md-typescale-body-large,.md-typescale-body-large-prominent{font:var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)) var(--md-sys-typescale-body-large-size, 1rem)/var(--md-sys-typescale-body-large-line-height, 1.5rem) var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto))}.md-typescale-label-small,.md-typescale-label-small-prominent{font:var(--md-sys-typescale-label-small-weight, var(--md-ref-typeface-weight-medium, 500)) var(--md-sys-typescale-label-small-size, 0.6875rem)/var(--md-sys-typescale-label-small-line-height, 1rem) var(--md-sys-typescale-label-small-font, var(--md-ref-typeface-plain, Roboto))}.md-typescale-label-medium,.md-typescale-label-medium-prominent{font:var(--md-sys-typescale-label-medium-weight, var(--md-ref-typeface-weight-medium, 500)) var(--md-sys-typescale-label-medium-size, 0.75rem)/var(--md-sys-typescale-label-medium-line-height, 1rem) var(--md-sys-typescale-label-medium-font, var(--md-ref-typeface-plain, Roboto))}.md-typescale-label-medium-prominent{font-weight:var(--md-sys-typescale-label-medium-weight-prominent, var(--md-ref-typeface-weight-bold, 700))}.md-typescale-label-large,.md-typescale-label-large-prominent{font:var(--md-sys-typescale-label-large-weight, var(--md-ref-typeface-weight-medium, 500)) var(--md-sys-typescale-label-large-size, 0.875rem)/var(--md-sys-typescale-label-large-line-height, 1.25rem) var(--md-sys-typescale-label-large-font, var(--md-ref-typeface-plain, Roboto))}.md-typescale-label-large-prominent{font-weight:var(--md-sys-typescale-label-large-weight-prominent, var(--md-ref-typeface-weight-bold, 700))}}
`,Co=`
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
`,dt=T`
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
`,ct=T`
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
`,fi="oppai_theme";function Le(){const e=localStorage.getItem(fi);return e==="light"||e==="dark"||e==="system"?e:"dark"}function Eo(e){try{localStorage.setItem(fi,e)}catch{}}function pt(e){const t=e==="light"||e==="system"&&window.matchMedia("(prefers-color-scheme: light)").matches;document.documentElement.dataset.theme=t?"light":""}function To(){window.matchMedia("(prefers-color-scheme: light)").addEventListener("change",()=>{Le()==="system"&&pt("system")})}T`
  .card {
    background: var(--md-sys-color-surface-container);
    border-radius: var(--oppai-radius);
    overflow: hidden;
  }
`;const Oo="modulepreload",_o=function(e,t){return new URL(e,t).href},Ft={},N=function(t,i,o){let a=Promise.resolve();if(i&&i.length>0){let r=function(u){return Promise.all(u.map(h=>Promise.resolve(h).then(b=>({status:"fulfilled",value:b}),b=>({status:"rejected",reason:b}))))};const l=document.getElementsByTagName("link"),c=document.querySelector("meta[property=csp-nonce]"),p=(c==null?void 0:c.nonce)||(c==null?void 0:c.getAttribute("nonce"));a=r(i.map(u=>{if(u=_o(u,o),u in Ft)return;Ft[u]=!0;const h=u.endsWith(".css"),b=h?'[rel="stylesheet"]':"";if(!!o)for(let L=l.length-1;L>=0;L--){const M=l[L];if(M.href===u&&(!h||M.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${u}"]${b}`))return;const x=document.createElement("link");if(x.rel=h?"stylesheet":Oo,h||(x.as="script"),x.crossOrigin="",x.href=u,p&&x.setAttribute("nonce",p),document.head.appendChild(x),h)return new Promise((L,M)=>{x.addEventListener("load",L),x.addEventListener("error",()=>M(new Error(`Unable to preload CSS for ${u}`)))})}))}function s(r){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=r,window.dispatchEvent(l),!l.defaultPrevented)throw r}return a.then(r=>{for(const l of r||[])l.status==="rejected"&&s(l.reason);return t().catch(s)})};/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ur=e=>e.strings===void 0,Lo={},Ao=(e,t=Lo)=>e._$AH=t;/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const bi=hi(class extends ui{constructor(){super(...arguments),this.key=m}render(e,t){return this.key=e,t}update(e,[t,i]){return t!==this.key&&(Ao(e),this.key=t),i}}),mr="oppai-libby-message";class Po{constructor(){this.buffer=""}feed(t){this.buffer+=t.replace(/\r\n/g,`
`);const i=[];let o;for(;(o=this.buffer.indexOf(`

`))>=0;){const a=this.buffer.slice(0,o);this.buffer=this.buffer.slice(o+2);const s=Mo(a);s&&i.push(s)}return i}}function Mo(e){let t="message";const i=[];for(const a of e.split(`
`)){if(!a||a.startsWith(":"))continue;const s=a.indexOf(":"),r=s<0?a:a.slice(0,s),l=s<0?"":a.slice(s+1).replace(/^ /,"");r==="event"?t=l:r==="data"&&i.push(l)}if(!i.length)return null;const o=i.join(`
`);try{return{event:t,data:JSON.parse(o)}}catch{return{event:t,data:o}}}function gr(e,t){const i=e.findIndex(a=>a.id===t.id);if(i>=0)return e[i]={...e[i],...t},e;let o=e.length;for(;o>0&&e[o-1].at>t.at;)o--;return e.splice(o,0,t),e}function fr(e,t,i){const o=e.find(a=>a.id===t);o&&(o.reactions=[...(o.reactions??[]).filter(a=>a.by!=="assistant"),{emoji:i,by:"assistant"}])}function br(e,t){e.emotion=t.emotion||e.emotion,e.intensity=t.intensity||e.intensity,e.progress=e.intensity,e.activity=t.activity??"",e.background=t.background??"",e.wearing=t.wearing??"",e.scene=t.scene??void 0,t.rev&&(e.rev=Math.max(e.rev??0,t.rev));const i=t.messageId&&e.messages.find(o=>o.id===t.messageId);i&&(i.mood=t.emotion,i.heat=t.intensity)}function Ro(e){var t;return(t=e.images)!=null&&t.length?e.images:e.imageId?[e.imageId]:[]}function Uo(e){return/^\*(?:sends|hands over|offers)\b[^*]*\*$/.test(e.trim())}function yr(e){let t=e.length;for(;t>0&&e[t-1].role==="user";)t--;return e.slice(t).map(({id:i,role:o,content:a,at:s,imageId:r,attachments:l,replyTo:c})=>({id:i,role:o,content:a,at:s,imageId:r,attachments:l,replyTo:c}))}function vr(e,t=1){switch(e){case"generating":return t>1?`Taking ${t} shots…`:"Taking the picture…";case"judging":return"Picking the best one…";case"retaking":return"Not happy with it — retaking…";case"saving":return"Sending…";case"animating":return"Making the clip…";case"making the room":return"Going somewhere new…";default:return"Taking the picture…"}}const ee=60,wr=[{value:-1,label:"Never",hint:"Kept, but never sent."},{value:.35,label:"Rarely",hint:"Sent now and then."},{value:1,label:"Normal",hint:"The usual odds."},{value:2.5,label:"Often",hint:"Reached for first."}],xr="profile",Ze="oppai_token";function oe(){return localStorage.getItem(Ze)}function Ae(e){e?localStorage.setItem(Ze,e):localStorage.removeItem(Ze)}function $(e,t="error",i={}){window.dispatchEvent(new CustomEvent("oppai-mascot",{detail:{message:e,tone:t,...i}}))}const Ie=new Map;async function n(e,t={},i=0){const a=(t.method??"GET").toUpperCase()==="GET"&&!t.body&&!t.signal;if(a){const r=Ie.get(e);if(r)return r}const s=Fo(e,t,i);return a&&(Ie.set(e,s),s.catch(()=>{}).finally(()=>{Ie.get(e)===s&&Ie.delete(e)})),s}async function Fo(e,t={},i=0){const o=new Headers(t.headers),a=oe();a&&o.set("Authorization",`Bearer ${a}`),t.body&&!(t.body instanceof FormData)&&o.set("Content-Type","application/json");const s=new AbortController,r=t.signal;r&&(r.aborted?s.abort(r.reason):r.addEventListener("abort",()=>s.abort(r.reason),{once:!0}));const l=i>0?setTimeout(()=>s.abort(new DOMException("timeout","TimeoutError")),i):null,c=()=>{var p;return s.signal.aborted&&((p=s.signal.reason)==null?void 0:p.name)==="TimeoutError"};try{const p=await fetch(e,{...t,headers:o,signal:s.signal});if(p.status===401)throw e!=="/api/auth/login"&&(Ae(null),window.dispatchEvent(new CustomEvent("oppai-logout")),$("Your session ended. Please sign in again.")),new Error("unauthorized");if(!p.ok){let u=p.statusText;try{const h=await p.json();h!=null&&h.error&&(u=h.error)}catch{}throw new Error(u)}return p.status===204?void 0:await p.json()}catch(p){if(c()){const u=new Error("Timed out — the site was too slow or unreachable.");throw e!=="/api/auth/login"&&$(u.message),u}throw s.signal.aborted?new DOMException("cancelled","AbortError"):(e!=="/api/auth/login"&&p instanceof Error&&p.message!=="unauthorized"&&p.message!=="generation cancelled"&&$(p.message||"Something went wrong."),p)}finally{l&&clearTimeout(l)}}async function Do(e,t,i){const o=new Headers({"Content-Type":"application/json",Accept:"text/event-stream"}),a=oe();a&&o.set("Authorization",`Bearer ${a}`);const s=await fetch("/api/libby/turn",{method:"POST",headers:o,body:JSON.stringify(e),signal:i});if(s.status===401)throw Ae(null),window.dispatchEvent(new CustomEvent("oppai-logout")),new Error("unauthorized");if(!s.ok||!s.body){let p=s.statusText;try{const u=await s.json();u!=null&&u.error&&(p=u.error)}catch{}throw new Error(p)}const r=s.body.getReader(),l=new TextDecoder,c=new Po;for(;;){const{value:p,done:u}=await r.read();if(u)break;for(const h of c.feed(l.decode(p,{stream:!0})))t(h)}for(const p of c.feed(l.decode()+`

`))t(p)}const g={health:()=>n("/api/health"),login:(e,t)=>n("/api/auth/login",{method:"POST",body:JSON.stringify({username:e,password:t,client:"web"})}),me:()=>n("/api/auth/me"),logout:()=>n("/api/auth/logout",{method:"POST"}),beginPasskeyLogin:e=>n("/api/auth/passkey/login/begin",{method:"POST",body:JSON.stringify(e?{username:e}:{})}),finishPasskeyLogin:(e,t)=>n("/api/auth/passkey/login/finish",{method:"POST",body:JSON.stringify({ceremony:e,credential:t,client:"web"})}),passkeys:()=>n("/api/auth/passkeys"),beginPasskeyRegistration:()=>n("/api/auth/passkeys/begin",{method:"POST"}),finishPasskeyRegistration:(e,t,i)=>n("/api/auth/passkeys/finish",{method:"POST",body:JSON.stringify({ceremony:e,name:t,credential:i})}),renamePasskey:(e,t)=>n(`/api/auth/passkeys/${e}`,{method:"PATCH",body:JSON.stringify({name:t})}),revokePasskey:(e,t)=>n(`/api/auth/passkeys/${e}/revoke`,{method:"POST",body:JSON.stringify({password:t})}),listMedia:(e={})=>{var i;const t=new URLSearchParams;return e.kind&&t.set("kind",e.kind),(i=e.q)!=null&&i.trim()&&t.set("q",e.q.trim()),e.tag&&t.set("tag",e.tag),e.favorite&&t.set("favorite","1"),e.minRating&&t.set("minRating",String(e.minRating)),e.sort&&e.sort!=="newest"&&t.set("sort",e.sort),t.set("limit",String(e.limit??ee)),t.set("offset",String(e.offset??0)),n(`/api/media?${t}`,{signal:e.signal})},libraryStats:e=>n("/api/media/stats",{signal:e}),topTags:(e="",t=12,i)=>{const o=new URLSearchParams;return e&&o.set("kind",e),o.set("limit",String(t)),n(`/api/tags/top?${o}`,{signal:i})},listCollections:e=>n("/api/collections",{signal:e}),createCollection:e=>n("/api/collections",{method:"POST",body:JSON.stringify({name:e})}),renameCollection:(e,t)=>n(`/api/collections/${e}`,{method:"PATCH",body:JSON.stringify({name:t})}),deleteCollection:e=>n(`/api/collections/${e}`,{method:"DELETE"}),collectionItems:(e,t=ee,i=0,o)=>{const a=new URLSearchParams({limit:String(t),offset:String(i)});return n(`/api/collections/${e}/items?${a}`,{signal:o})},addToCollection:(e,t)=>n(`/api/collections/${e}/items`,{method:"POST",body:JSON.stringify({mediaIds:t})}),removeFromCollection:(e,t)=>n(`/api/collections/${e}/items/${t}`,{method:"DELETE"}),reorderCollection:(e,t)=>n(`/api/collections/${e}/order`,{method:"PUT",body:JSON.stringify({mediaIds:t})}),collectionsOf:(e,t)=>n(`/api/media/${e}/collections`,{signal:t}),getProgress:(e,t)=>n(`/api/media/${e}/progress`,{signal:t}),setProgress:(e,t)=>n(`/api/media/${e}/progress`,{method:"PUT",body:JSON.stringify({position:t})}),clearProgress:e=>n(`/api/media/${e}/progress`,{method:"DELETE"}),bookmarks:(e,t)=>n(`/api/media/${e}/bookmarks`,{signal:t}),addBookmark:(e,t,i="")=>n(`/api/media/${e}/bookmarks`,{method:"POST",body:JSON.stringify({position:t,label:i})},6e4),relabelBookmark:(e,t)=>n(`/api/bookmarks/${e}`,{method:"PATCH",body:JSON.stringify({label:t})}),deleteBookmark:e=>n(`/api/bookmarks/${e}`,{method:"DELETE"}),recentBookmarks:(e=50,t)=>n(`/api/bookmarks?limit=${e}`,{signal:t}),bookmarkThumbURL:e=>`/api/bookmarks/${e}/thumb`,resumeShelf:e=>n("/api/resume",{signal:e}),getMedia:e=>n(`/api/media/${e}`),streamURL:e=>`/api/media/${e}/stream`,thumbURL:e=>`/api/media/${e}/thumb`,proxyURL:e=>`/api/scrape/proxy?url=${encodeURIComponent(e)}`,upload:(e,t)=>{const i=new FormData;return i.append("file",e),t&&i.append("title",t),n("/api/media",{method:"POST",body:i})},listUploadSessions:()=>n("/api/uploads"),createUploadSession:e=>n("/api/uploads",{method:"POST",body:JSON.stringify(e)}),uploadSession:e=>n(`/api/uploads/${e}`),completeUploadSession:(e,t)=>n(`/api/uploads/${e}/complete`,{method:"POST",body:JSON.stringify(t?{sha256:t}:{})}),cancelUploadSession:e=>n(`/api/uploads/${e}`,{method:"DELETE"}),storage:()=>n("/api/storage"),cleanupStorage:e=>n("/api/storage/cleanup",{method:"POST",body:JSON.stringify({categories:e})}),autotag:e=>n(`/api/media/${e}/autotag`,{method:"POST"}),describe:e=>n(`/api/media/${e}/describe`,{method:"POST"},6*6e4),describeStatus:()=>n("/api/ai/describe"),describeProbe:()=>n("/api/ai/describe/probe",{method:"POST"},3*6e4),describeBackfill:()=>n("/api/ai/describe/backfill",{method:"POST"}),describeBackfillStop:()=>n("/api/ai/describe/backfill",{method:"DELETE"}),scanImage:e=>n("/api/ai/scan-image",{method:"POST",body:JSON.stringify({imageData:e})},6e4),comicInfo:e=>n(`/api/media/${e}/comic`),pageURL:(e,t)=>`/api/media/${e}/page/${t}`,getSettings:()=>n("/api/settings"),saveSettings:e=>n("/api/settings",{method:"PUT",body:JSON.stringify(e)}),stats:()=>n("/api/stats"),diagnostics:()=>n("/api/diagnostics"),resetDiagnostics:()=>n("/api/diagnostics/reset",{method:"POST"}),changePassword:(e,t)=>n("/api/auth/password",{method:"POST",body:JSON.stringify({current:e,new:t})}),updateMedia:(e,t)=>n(`/api/media/${e}`,{method:"PATCH",body:JSON.stringify(t)}),deleteMedia:e=>n(`/api/media/${e}`,{method:"DELETE"}),bulkMedia:(e,t,i)=>n("/api/media/bulk",{method:"POST",body:JSON.stringify({action:e,ids:t,patch:i??{}})}),scrape:e=>n("/api/scrape",{method:"POST",body:JSON.stringify({url:e})},45e3),scrapeBulk:e=>n("/api/scrape/bulk",{method:"POST",body:JSON.stringify({urls:e})},75e3),scrapeImport:e=>n("/api/scrape/import",{method:"POST",body:JSON.stringify(e)}),apkInfo:()=>n("/api/apk/info"),sources:(e=!1)=>n("/api/sources",e?{cache:"reload"}:void 0),sourceIconURL:e=>`/api/sources/${encodeURIComponent(e)}/icon`,analyzeSource:e=>n("/api/sources/analyze",{method:"POST",body:JSON.stringify({url:e})},6e4),saveSource:e=>n("/api/sources",{method:"POST",body:JSON.stringify({yaml:e})}),deleteSource:e=>n(`/api/sources/${encodeURIComponent(e)}`,{method:"DELETE"}),savedFeeds:e=>n("/api/feeds",{signal:e}),saveFeed:e=>n("/api/feeds",{method:"POST",body:JSON.stringify(e)},6e4),deleteFeed:e=>n(`/api/feeds/${encodeURIComponent(e)}`,{method:"DELETE"}),checkFeeds:()=>n("/api/feeds/check",{method:"POST"},12e4),newFromFeeds:e=>n("/api/feeds/new",{signal:e}),markFeedsSeen:e=>n(e?`/api/feeds/${encodeURIComponent(e)}/seen`:"/api/feeds/seen",{method:"POST"}),browseSource:(e,t={})=>{const i=new URLSearchParams;return t.feed&&i.set("feed",t.feed),t.cursor&&i.set("cursor",t.cursor),t.q&&i.set("q",t.q),t.sort&&i.set("sort",t.sort),n(`/api/sources/${e}/browse?${i}`,{},45e3)},sourcePages:(e,t)=>n(`/api/sources/${encodeURIComponent(e)}/item/${encodeURIComponent(t)}/pages`,{},45e3),sourceComments:(e,t)=>n(`/api/sources/${encodeURIComponent(e)}/item/${encodeURIComponent(t)}/comments`,{},45e3),sourceStreamURL:e=>`/api/sources/stream?url=${encodeURIComponent(e)}`,saveFromSource:(e,t)=>n(`/api/sources/${encodeURIComponent(e)}/save`,{method:"POST",body:JSON.stringify(t)},15*6e4),imageGenStatus:()=>n("/api/imagegen/status",{},12e3),booruTags:e=>n(`/api/imagegen/tags?q=${encodeURIComponent(e)}`),gameGallery:e=>n(`/api/media/${e}/gallery`),uploadGameGallery:(e,t)=>{const i=new FormData;return i.append("file",t),n(`/api/media/${e}/gallery`,{method:"POST",body:i})},removeGameGallery:(e,t)=>n(`/api/media/${e}/gallery/${t}`,{method:"DELETE"}),gameSaves:e=>n(`/api/media/${e}/saves`),uploadGameSave:(e,t,i)=>{const o=new FormData;return o.append("file",t),i!=null&&i.trim()&&o.append("label",i.trim()),n(`/api/media/${e}/saves`,{method:"POST",body:o})},deleteGameSave:(e,t)=>n(`/api/media/${e}/saves/${t}`,{method:"DELETE"}),gameSaveURL:(e,t)=>`/api/media/${e}/saves/${t}`,gameSites:()=>n("/api/games/sites"),gameSiteLogin:(e,t)=>n(`/api/games/sites/${e}/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)},6e4),gameSiteLogout:e=>n(`/api/games/sites/${e}/logout`,{method:"POST"}),gameBrowse:(e,t,i,o)=>n(`/api/games/browse?site=${e}&q=${encodeURIComponent(t)}&sort=${encodeURIComponent(i)}&page=${o}`,{},6e4),gameBrowseDetail:e=>n("/api/games/browse/detail",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({item:e})},6e4),gameBrowseAdd:e=>n("/api/games/browse/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)},20*6e4),gameUpdates:()=>n("/api/games/updates"),gameUpdatesCheck:()=>n("/api/games/updates/check",{method:"POST"}),gameRemote:e=>n(`/api/media/${e}/remote`),setGameRemote:(e,t)=>n(`/api/media/${e}/remote`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}),clearGameRemote:e=>n(`/api/media/${e}/remote`,{method:"DELETE"}),checkGameRemote:e=>n(`/api/media/${e}/remote/check`,{method:"POST"},9e4),acknowledgeGameRemote:e=>n(`/api/media/${e}/remote/acknowledge`,{method:"POST"}),gameSources:e=>n(`/api/media/${e}/sources`,{},9e4),launchyStatus:()=>n("/api/launchy"),launchyLaunch:e=>n("/api/launchy/launch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({gameId:e})}),launchyLaunchStatus:e=>n(`/api/launchy/launch/${e}`),gamePlayInfo:e=>n(`/api/media/${e}/play`),gamePlayURL:e=>`/api/media/${e}/play/`,optimizePrompt:e=>n("/api/imagegen/prompt",{method:"POST",body:JSON.stringify({text:e})}),generate:e=>n("/api/imagegen/generate",{method:"POST",body:JSON.stringify(e)},10*6e4),genProgress:(e,t)=>n(`/api/imagegen/progress/${encodeURIComponent(e)}?seen=${t}`,{},1e4),cancelGenerate:e=>n(`/api/imagegen/cancel/${encodeURIComponent(e)}`,{method:"POST"},1e4),genPreviewURL:e=>`/api/imagegen/preview/${encodeURIComponent(e)}`,replaceGenPreview:(e,t)=>n(`/api/imagegen/preview/${encodeURIComponent(e)}`,{method:"PUT",body:JSON.stringify({imageData:t})}),deleteGenPreview:e=>n(`/api/imagegen/preview/${encodeURIComponent(e)}`,{method:"DELETE"}),saveGenerated:e=>n("/api/imagegen/save",{method:"POST",body:JSON.stringify(e)}),modelThumbURL:e=>`/api/imagegen/model-thumb?model=${encodeURIComponent(e)}`,setModelThumb:e=>n("/api/imagegen/model-thumb",{method:"PUT",body:JSON.stringify(e)}),chatStatus:()=>n("/api/chat/status",{},12e3),chatWorkspace:()=>n("/api/chat/workspace",{},3e4),chatModels:()=>n("/api/chat/models",{},2e4),loadChatModel:(e,t={},i={},o=!0)=>n("/api/chat/models/load",{method:"POST",body:JSON.stringify({modelName:e,args:t,settings:i,remember:o})},10*6e4),unloadChatModel:()=>n("/api/chat/models/unload",{method:"POST"},13e4),downloadTTSVoice:e=>n("/api/tts/voices/download",{method:"POST",body:JSON.stringify({id:e})},2e4),deleteTTSVoice:e=>n(`/api/tts/voices/${encodeURIComponent(e)}`,{method:"DELETE"},2e4),ttsVoiceErrors:()=>n("/api/tts/voices/errors",{},1e4),chatBackendInfo:()=>n("/api/chat/backend",{},2e4),setChatLoras:e=>n("/api/chat/loras",{method:"POST",body:JSON.stringify({names:e})},5*6e4),stopChat:()=>n("/api/chat/stop",{method:"POST"},12e3),countChatTokens:e=>n("/api/chat/tokens",{method:"POST",body:JSON.stringify({text:e})},2e4),inspectChatModel:e=>n(`/api/chat/models/inspect?model=${encodeURIComponent(e)}`,{},3e4),deleteChatModel:(e,t,i=!1)=>n("/api/chat/models/delete",{method:"POST",body:JSON.stringify({model:e,confirm:t,permanent:i})},12e4),compressChat:e=>n("/api/chat/compress",{method:"POST",body:JSON.stringify(e)},2e5),saveChatWorkspace:e=>n("/api/chat/workspace",{method:"PUT",body:JSON.stringify(e)},3e4),uploadChatImage:e=>n("/api/chat/images",{method:"POST",body:JSON.stringify(e)},12e4),deleteChatImage:e=>n(`/api/chat/images/${encodeURIComponent(e)}`,{method:"DELETE"}),chatImageURL:e=>`/api/chat/images/${encodeURIComponent(e)}`,loraThumbURL:e=>`/api/imagegen/lora-thumb?name=${encodeURIComponent(e)}`,characters:()=>n("/api/imagegen/characters"),saveCharacter:e=>n("/api/imagegen/characters",{method:"POST",body:JSON.stringify(e)}),deleteCharacter:e=>n(`/api/imagegen/characters/${encodeURIComponent(e)}`,{method:"DELETE"}),characterThumbURL:e=>`/api/imagegen/characters/${encodeURIComponent(e)}/thumb`,poses:()=>n("/api/imagegen/poses"),savePose:e=>n("/api/imagegen/poses",{method:"POST",body:JSON.stringify(e)}),deletePose:e=>n(`/api/imagegen/poses/${encodeURIComponent(e)}`,{method:"DELETE"}),poseThumbURL:e=>`/api/imagegen/poses/${encodeURIComponent(e)}/thumb`,wildcards:()=>n("/api/imagegen/wildcards"),saveWildcard:e=>n("/api/imagegen/wildcards",{method:"POST",body:JSON.stringify(e)}),deleteWildcard:e=>n(`/api/imagegen/wildcards/${encodeURIComponent(e)}`,{method:"DELETE"}),mediaGeneration:e=>n(`/api/media/${e}/generation`,{},15e3),libbySend:e=>n("/api/libby/send",{method:"POST",body:JSON.stringify(e)}),modelMeta:e=>n(`/api/imagegen/model?name=${encodeURIComponent(e)}`,{},2e4),patchModelMeta:e=>n("/api/imagegen/model",{method:"PATCH",body:JSON.stringify(e)},25e3),galleryBoards:()=>n("/api/imagegen/gallery/boards",{},2e4),createGalleryBoard:e=>n("/api/imagegen/gallery/boards",{method:"POST",body:JSON.stringify({name:e})},2e4),deleteGalleryBoard:e=>n(`/api/imagegen/gallery/boards/${encodeURIComponent(e)}`,{method:"DELETE"},2e4),galleryImages:(e,t=0,i=60)=>n(`/api/imagegen/gallery/images?board=${encodeURIComponent(e)}&offset=${t}&limit=${i}`,{},2e4),galleryThumbURL:e=>`/api/imagegen/gallery/image/${encodeURIComponent(e)}/thumb`,galleryFullURL:e=>`/api/imagegen/gallery/image/${encodeURIComponent(e)}`,galleryImageMetadata:e=>n(`/api/imagegen/gallery/image/${encodeURIComponent(e)}/metadata`,{},2e4),deleteGalleryImage:e=>n(`/api/imagegen/gallery/image/${encodeURIComponent(e)}`,{method:"DELETE"}),deleteGalleryImages:e=>n("/api/imagegen/gallery/delete",{method:"POST",body:JSON.stringify({names:e})},4e4),addGalleryImagesToBoard:(e,t)=>n("/api/imagegen/gallery/board",{method:"POST",body:JSON.stringify({board:e,names:t})},4e4),saveGalleryImage:e=>n("/api/imagegen/gallery/save",{method:"POST",body:JSON.stringify(e)},9e4),civitaiSearch:(e={})=>{const t=new URLSearchParams;return e.q&&t.set("q",e.q),e.type&&t.set("type",e.type),e.category&&t.set("category",e.category),e.sort&&t.set("sort",e.sort),e.period&&t.set("period",e.period),e.base&&t.set("base",e.base),e.creator&&t.set("creator",e.creator),e.nsfw===!1&&t.set("nsfw","0"),e.cursor&&t.set("cursor",e.cursor),n(`/api/imagegen/civitai/search?${t}`,{},45e3)},civitaiModel:e=>n(`/api/imagegen/civitai/models/${e}`,{},45e3),civitaiImages:e=>{const t=new URLSearchParams;return e.versionId&&t.set("versionId",String(e.versionId)),e.modelId&&t.set("modelId",String(e.modelId)),e.postId&&t.set("postId",String(e.postId)),e.collectionId&&t.set("collectionId",String(e.collectionId)),e.username&&t.set("username",e.username),e.sort&&t.set("sort",e.sort),e.period&&t.set("period",e.period),e.nsfw===!1&&t.set("nsfw","0"),e.cursor&&t.set("cursor",e.cursor),n(`/api/imagegen/civitai/images?${t}`,{},45e3)},civitaiCategories:()=>n("/api/imagegen/civitai/categories",{},3e4),civitaiImageURL:e=>`/api/imagegen/civitai/image?url=${encodeURIComponent(e)}`,civitaiMe:()=>n("/api/imagegen/civitai/me",{},3e4),civitaiPosts:e=>{const t=new URLSearchParams({username:e.username});return e.nsfw===!1&&t.set("nsfw","0"),e.cursor&&t.set("cursor",e.cursor),n(`/api/imagegen/civitai/posts?${t}`,{},45e3)},civitaiCollections:(e={})=>{const t=new URLSearchParams;return e.q&&t.set("q",e.q),e.sort&&t.set("sort",e.sort),e.cursor&&t.set("cursor",e.cursor),n(`/api/imagegen/civitai/collections?${t}`,{},45e3)},civitaiInstall:(e,t)=>n("/api/imagegen/civitai/install",{method:"POST",body:JSON.stringify({url:e,...t})},3e4),civitaiInstalls:()=>n("/api/imagegen/civitai/installs",{},2e4),civitaiInstalled:(e=!1)=>n(`/api/imagegen/civitai/installed${e?"?refresh=1":""}`,{},1e5),civitaiSync:(e,t)=>n("/api/imagegen/civitai/sync",{method:"POST",body:JSON.stringify({key:e,versionId:t??0})},7e4),civitaiCover:(e,t)=>n("/api/imagegen/civitai/cover",{method:"POST",body:JSON.stringify({key:e,url:t})},7e4),civitaiUpdate:(e,t)=>n("/api/imagegen/civitai/update",{method:"POST",body:JSON.stringify({key:e,versionId:t??0})},7e4),deleteModel:e=>n(`/api/imagegen/model?key=${encodeURIComponent(e)}`,{method:"DELETE"},4e4),libbyContext:()=>n("/api/libby/context",{},15e3),libbyMemory:()=>n("/api/libby/memory",{},15e3),addLibbyMemory:e=>n("/api/libby/memory",{method:"POST",body:JSON.stringify(e)}),updateLibbyMemory:(e,t)=>n(`/api/libby/memory/${encodeURIComponent(e)}`,{method:"PATCH",body:JSON.stringify(t)}),clearLibbyMemory:()=>n("/api/libby/memory",{method:"DELETE"}),forgetLibbyMemory:e=>n(`/api/libby/memory/${encodeURIComponent(e)}`,{method:"DELETE"}),libbyAuto:()=>n("/api/libby/auto",{},15e3),saveLibbyAuto:e=>n("/api/libby/auto",{method:"PUT",body:JSON.stringify(e)}),libbyAutoCheck:e=>n("/api/libby/auto/check",{method:"POST",body:JSON.stringify(e)},1e4),libbyAutoSent:e=>n("/api/libby/auto/sent",{method:"POST",body:JSON.stringify(e)},1e4),libbyAutoAnswered:()=>n("/api/libby/auto/answered",{method:"POST"},1e4),libbyAutoPending:()=>n("/api/libby/auto/pending",{},1e4),libbyWants:()=>n("/api/libby/wants",{},15e3),clearLibbyWants:()=>n("/api/libby/wants",{method:"DELETE"}),forgetLibbyWant:e=>n(`/api/libby/wants/${encodeURIComponent(e)}`,{method:"DELETE"}),libbyJournal:()=>n("/api/libby/journal",{},15e3),reflectLibbyNow:()=>n("/api/libby/journal/reflect",{method:"POST"},3e5),forgetJournalEntry:e=>n(`/api/libby/journal/${encodeURIComponent(e)}`,{method:"DELETE"}),clearLibbyJournal:()=>n("/api/libby/journal",{method:"DELETE"}),discord:()=>n("/api/discord",{},15e3),connectDiscord:e=>n("/api/discord/connect",{method:"POST",body:JSON.stringify({token:e})},3e4),disconnectDiscord:()=>n("/api/discord/disconnect",{method:"POST"}),saveDiscordSettings:e=>n("/api/discord/settings",{method:"PUT",body:JSON.stringify(e)}),discordPlaces:()=>n("/api/discord/places",{},4e4),discordSay:(e,t)=>n("/api/discord/say",{method:"POST",body:JSON.stringify({channelId:e,text:t})}),libbyLink:e=>n("/api/libby/link",{method:"POST",body:JSON.stringify({url:e})},6e4),libbyDefaultCard:()=>n("/api/chat/libby-default"),libbyIdentity:()=>n("/api/libby/identity",{},15e3),saveLibbyIdentity:e=>n("/api/libby/identity",{method:"PUT",body:JSON.stringify(e)}),markLibbyIdentity:e=>n("/api/libby/identity/mark",{method:"POST",body:JSON.stringify(e)}),scanLibbyIdentity:()=>n("/api/libby/identity/scan",{method:"POST"},12e4),libbyBond:()=>n("/api/libby/bond",{},15e3),resetLibbyBond:()=>n("/api/libby/bond",{method:"DELETE"}),posterFrames:(e,t=20)=>n(`/api/media/${e}/frames?count=${t}`),setPoster:(e,t)=>n(`/api/media/${e}/thumb`,{method:"PUT",body:JSON.stringify({at:t})}),libbyTurn:(e,t,i)=>Do(e,t,i),rateLibbyPhoto:(e,t)=>n(`/api/libby/photos/${encodeURIComponent(e)}/rate`,{method:"POST",body:JSON.stringify({rating:t})}),keepLibbyPhoto:e=>n(`/api/libby/photos/${encodeURIComponent(e)}/keep`,{method:"POST"},6e4),libbyStories:()=>n("/api/libby/stories"),seenLibbyStory:e=>n(`/api/libby/stories/${encodeURIComponent(e)}/seen`,{method:"POST"}),postLibbyStory:()=>n("/api/libby/stories",{method:"POST"},6*6e4),libbyWatch:e=>n("/api/libby/watch",{method:"POST",body:JSON.stringify(e)},1e5),libbyAct:(e,t={})=>n("/api/libby/act",{method:"POST",body:JSON.stringify({kind:e.kind,prompt:e.prompt,url:e.url,mediaId:e.mediaId,tags:e.tags,title:e.title,...t})}),libbyOutfits:()=>n("/api/libby/outfits"),libbyBackgrounds:()=>n("/api/libby/backgrounds"),setLibbyDefaultBackground:e=>n("/api/libby/backgrounds/default",{method:"PUT",body:JSON.stringify({id:e})}),saveLibbyBackground:e=>n("/api/libby/backgrounds",{method:"POST",body:JSON.stringify(e)}),deleteLibbyBackground:e=>n(`/api/libby/backgrounds/${encodeURIComponent(e)}`,{method:"DELETE"}),setLibbyBackgroundImage:(e,t)=>n(`/api/libby/backgrounds/${encodeURIComponent(e)}/image`,{method:"PUT",body:JSON.stringify({imageData:t})}),libbyBackgroundURL:(e,t)=>`/api/libby/backgrounds/${encodeURIComponent(e)}/image${t?`?v=${t}`:""}`,libbyReferences:()=>n("/api/libby/references"),setLibbyReference:(e,t)=>n(`/api/libby/references/${e}`,{method:"PUT",body:JSON.stringify({imageData:t})}),deleteLibbyReference:e=>n(`/api/libby/references/${e}`,{method:"DELETE"}),libbyReferenceURL:(e,t)=>`/api/libby/references/${e}${t?`?v=${t}`:""}`,saveLibbyOutfit:e=>n("/api/libby/outfits",{method:"POST",body:JSON.stringify(e)}),deleteLibbyOutfit:e=>n(`/api/libby/outfits/${encodeURIComponent(e)}`,{method:"DELETE"}),setLibbyEmotion:(e,t,i,o=0)=>n(`/api/libby/outfits/${encodeURIComponent(e)}/emotions/${encodeURIComponent(t)}${o?`?level=${o}`:""}`,{method:"PUT",body:JSON.stringify({imageData:i})}),deleteLibbyEmotion:(e,t,i=0)=>n(`/api/libby/outfits/${encodeURIComponent(e)}/emotions/${encodeURIComponent(t)}${i?`?level=${i}`:""}`,{method:"DELETE"}),libbyEmotionURL:(e,t,i=0,o)=>{const a=[i?`level=${i}`:"",o?`v=${o}`:""].filter(Boolean).join("&");return`/api/libby/outfits/${encodeURIComponent(e)}/emotions/${encodeURIComponent(t)}${a?`?${a}`:""}`},libbyOutfitThumbURL:(e,t)=>`/api/libby/outfits/${encodeURIComponent(e)}/thumb${t?`?v=${t}`:""}`,setLibbyOutfitThumb:(e,t)=>n(`/api/libby/outfits/${encodeURIComponent(e)}/thumb`,{method:"PUT",body:JSON.stringify({imageData:t})}),clearLibbyOutfitThumb:e=>n(`/api/libby/outfits/${encodeURIComponent(e)}/thumb`,{method:"DELETE"}),libbyOutfitWip:e=>n(`/api/libby/outfits/${encodeURIComponent(e)}/wip`),putLibbyOutfitWip:(e,t,i,o)=>n(`/api/libby/outfits/${encodeURIComponent(e)}/wip/${encodeURIComponent(t)}${i?`?level=${i}`:""}`,{method:"PUT",body:JSON.stringify(o)}),deleteLibbyOutfitWip:(e,t,i=0)=>n(`/api/libby/outfits/${encodeURIComponent(e)}/wip/${encodeURIComponent(t)}${i?`?level=${i}`:""}`,{method:"DELETE"}),libbyOutfitWipImageURL:(e,t,i=0,o)=>{const a=[i?`level=${i}`:"",o?`v=${o}`:""].filter(Boolean).join("&");return`/api/libby/outfits/${encodeURIComponent(e)}/wip/${encodeURIComponent(t)}${a?`?${a}`:""}`},libbyLoadouts:()=>n("/api/libby/loadouts"),saveLibbyLoadout:e=>n("/api/libby/loadouts",{method:"POST",body:JSON.stringify({...e,updatedAt:Date.now()})}),deleteLibbyLoadout:e=>n(`/api/libby/loadouts/${encodeURIComponent(e)}`,{method:"DELETE"}),libbyLoadoutThumbURL:(e,t)=>`/api/libby/loadouts/${encodeURIComponent(e)}/thumb${t?`?v=${t}`:""}`,setLibbyLoadoutThumb:(e,t)=>n(`/api/libby/loadouts/${encodeURIComponent(e)}/thumb`,{method:"PUT",body:JSON.stringify({imageData:t})}),clearLibbyLoadoutThumb:e=>n(`/api/libby/loadouts/${encodeURIComponent(e)}/thumb`,{method:"DELETE"})},yi="oppai_hide_libby",Qe="oppai_libby_outfit";function No(){return localStorage.getItem(yi)==="1"}function et(){return No()||Bo()}const zo="oppai.safe";function Bo(){try{return localStorage.getItem(zo)==="1"}catch{return!1}}function $r(e){try{localStorage.setItem(yi,e?"1":"0")}catch{}window.dispatchEvent(new CustomEvent("oppai-libby-pref",{detail:{hidden:e}}))}function vi(){return localStorage.getItem(Qe)??""}function kr(e){try{e?localStorage.setItem(Qe,e):localStorage.removeItem(Qe)}catch{}window.dispatchEvent(new CustomEvent("oppai-libby-pref",{detail:{outfit:e}}))}const Ho="/Libby_Default/default-libby-pfp.png",Yo=["calm","warm","flirty","heated","peak"];function Dt(e,t=1){return`/Libby_Default/default-libby-${Yo[_(t)-1]}-${Ne(e)}.png`}function Go(e){return`/Libby_Default/default-libby-misc-${e.trim().toLowerCase()}.png`}function Sr(e,t,i,o,a){return e?{activity:"typing",key:"typing"}:{activity:t,key:`${i}-${o}-${t}-${a}`}}const Jo=3;function jo(e){return Math.min(Jo,_(e))}const wi=["neutral","happy","mischievous","surprised","thinking","shy","smug","sad","annoyed","sleepy","loving","excited"],qo={neutral:"neutral",happy:"happy",mischievous:"mischievous",surprised:"surprised",thinking:"thinking",shy:"surprised",smug:"mischievous",sad:"thinking",annoyed:"thinking",sleepy:"neutral",loving:"happy",excited:"happy"},Ir={neutral:"Neutral",happy:"Happy",mischievous:"Mischievous",surprised:"Surprised",thinking:"Thinking",shy:"Shy",smug:"Smug",sad:"Sad",annoyed:"Annoyed",sleepy:"Sleepy",loving:"Loving",excited:"Excited"};function Ne(e){let t=(e??"").trim().toLowerCase();return t==="default"&&(t="neutral"),t==="worried"&&(t="thinking"),t==="horniness"&&(t="mischievous"),wi.includes(t)?t:"neutral"}function _(e){return Math.max(1,Math.min(5,Math.round(Number(e)||1)))}function Cr(e){const t=e.trim();return t?t.charAt(0).toUpperCase()+t.slice(1):""}function Wo(e,t,i=vi(),o){const a=Ne(e),s=_(t),r=[];if(o&&i&&i!=="default"&&r.push(`/api/libby/outfits/${encodeURIComponent(i)}/emotions/${encodeURIComponent(o)}`),o&&r.push(Go(o)),i&&i!=="default")for(const l of[...new Set([a,qo[a]])]){const c=`/api/libby/outfits/${encodeURIComponent(i)}/emotions/${encodeURIComponent(l)}`;for(let p=s-1;p>=1;p--)r.push(`${c}?level=${p}`);r.push(c)}return r.push(Dt(a,s),Dt("neutral",s)),[...new Set(r)]}function Ko(e){const t=e.toLowerCase();return/timed? out|unreachable|network|offline|couldn.t reach|connection/.test(t)?{emotion:"thinking",intensity:4}:/unauthori[sz]ed|session ended|sign in|password|login/.test(t)?{emotion:"thinking",intensity:3}:/invalid|missing|required|not found|doesn.t exist/.test(t)?{emotion:"thinking",intensity:2}:/failed|error|couldn.t|can.t/.test(t)?{emotion:"surprised",intensity:3}:{emotion:"thinking",intensity:2}}function Vo(e,t){const i=Number(e.dataset.fallbackIndex||"0")+1;i>=t.length||(e.dataset.fallbackIndex=String(i),e.src=t[i])}const xi='meta[name="oppai-mode"]';let $i=null;function Xo(){var e;return((e=document.querySelector(xi))==null?void 0:e.getAttribute("content"))==="incognito"}function Pe(){return $i??Xo()}function Er(e){$i=e,Zo(),window.dispatchEvent(new CustomEvent("oppai-incognito",{detail:{incognito:e}}))}const Nt={incognito:{title:"Nextcloud",icon:"/cloud-icon.svg",theme:"#0082c9",manifest:"/cloud.webmanifest"},plain:{title:"OppaiLib",icon:"/icon.svg",theme:"#191410",manifest:"/manifest.webmanifest"}};function Zo(){const e=Pe()?Nt.incognito:Nt.plain;document.title=e.title;const t=`?v=${Date.now()}`;for(const s of document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]'))s.type="image/svg+xml",s.removeAttribute("sizes"),s.href=e.icon+t;const i=document.querySelector('link[rel="manifest"]');i&&(i.href=e.manifest);const o=document.querySelector('meta[name="theme-color"]');o&&(o.content=e.theme);let a=document.querySelector(xi);a||(a=document.createElement("meta"),a.name="oppai-mode",document.head.appendChild(a)),a.content=Pe()?"incognito":"plain"}const ki=T`
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
`;function zt(e){return Math.min(900,e.length*16)}const Si="oppai_libby_intensity",Ii="oppai_libby_progress",Ci="oppai_libby_progression_multiplier",fe=5,Ei=[.25,.5,1,2];function Qo(){const e=Number(localStorage.getItem(Ci)??"0.5");return Ei.includes(e)?e:.5}function Tr(e){const t=Ei.includes(e)?e:.5;return localStorage.setItem(Ci,String(t)),window.dispatchEvent(new CustomEvent("oppai-libby-progression",{detail:{multiplier:t}})),t}function ht(e,t){const i=Math.max(1,Math.min(fe,e+t*Qo()));return{progress:i,intensity:Math.max(1,Math.min(fe,Math.floor(i+1e-6)))}}function Ti(){const e=Number(sessionStorage.getItem(Ii));if(Number.isFinite(e)&&e>=1&&e<=fe)return e;const t=Number(sessionStorage.getItem(Si)??"1");return Number.isFinite(t)?Math.max(1,Math.min(fe,t)):1}function X(){return ht(Ti(),0).intensity}function ea(e){const t=Math.max(1,Math.min(fe,Math.round(e)));return Oi(t,t)}function ta(e=1){const t=ht(Ti(),e);return Oi(t.progress,t.intensity)}function Oi(e,t){try{sessionStorage.setItem(Ii,String(e)),sessionStorage.setItem(Si,String(t))}catch{}return window.dispatchEvent(new CustomEvent("oppai-libby-meter",{detail:{intensity:t,progress:e}})),t}const Bt=new Map;function F(e,t){if(!t.length)return"";if(t.length===1)return t[0];const i=Bt.get(e),o=t.filter(s=>s!==i),a=o[Math.floor(Math.random()*o.length)];return Bt.set(e,a),a}function q(e,t){return e[_(t)-1]??e[0]}function ut(e){const t=_(e);return t>=5||t>=3?"mischievous":"happy"}const ia={import:[["Saved to your library.","Tucked away safely.","Filed. Nice pick.","Got it — onto the shelf.","Safe with me."],["Ooh, good one. Saved.","That one's a keeper — saved.","Added. I like your taste.","I'll make room for that one.","Nice find. It's in."],["Mmh, saving that one for later…","Ooh. Adding that to the collection.","That's going somewhere special.","I had a feeling you'd keep that.","Filed — and yes, I looked."],["Ohh, you're building a *collection*, aren't you?","Saved. My, my.","Mmh — you know exactly what you like.","That one gets a very good shelf.","Added. You're making this hard to ignore."],["Nngh — yes. That one. Saved.","You keep this up and I won't be any use to you.","Saved… I need a minute.","Filed. I am absolutely not calm about it.","It's saved. Don't ask me to act normal."]],save:[["Kept it.","In the library now.","Done — it's yours.","Stored and ready when you are.","All set. I kept it."],["Saved that one for you.","Ooh, keeping it? Good.","That one earned its place.","Good call. It's staying.","Yours now — I put it somewhere easy to find."],["Mmh, that one's mine too now.","Saved. I might peek at it later.","Ooh, filing that away…","Kept. I understand the appeal.","That one can stay right where I can see it."],["Ohh, keeping *that*? Bold.","Saved. You've got a type.","Mmh. Straight to the good shelf.","Filed under things that make you obvious.","Saved — excellent choice, dangerously so."],["That one's going to live in my head. Saved.","Ngh — saved, saved, fine.","You're doing this on purpose.","Saved. I need to stop looking at it.","It's yours. I may never recover."]],generate:[["There you go.","Fresh out of the oven.","All done — take a look.","Finished. How did I do?","One new picture, ready for inspection."],["Ooh, that came out nice.","Not bad at all. Have a look.","There — I think you'll like it.","That worked rather well, didn't it?","Done. I vote we keep this one."],["Mmh. Look what we made.","Ooh, that's a good one.","Well. That turned out.","Okay, I'm a little proud of that.","There it is — exactly the sort of trouble I expected."],["Ohh… look at that. Look what you asked for.","That's what was in your head? Bold.","Mmh — that's hot and you know it.","Finished. You really meant every word of that prompt.","Oh, that came out unfairly good."],["Nngh. Yes. That one.","You made *that*? I need a moment.","That's… that's very good. Do another.","Done. I can't form a responsible opinion.","Look at it. Then make another before I recover."]],galleryDelete:[["Gone.","Cleared out.","Removed.","Out of the gallery.","Tidied away."],["Deleted — didn't like that one?","Gone. Fair enough.","Cleared. Picky, I like it.","Not a keeper, then. Gone.","Removed. We have better ones."],["Mmh, too tame for you? Gone.","Deleted. You want better.","Gone — we can do better.","I saw that rejection coming.","Cleared. Your standards remain suspiciously specific."],["Ohh, brutal. Deleted.","Not good enough for you? Gone.","Deleted. High standards tonight.","Gone without mercy. Noted.","You barely hesitated. I like that."],["Gone. Now make me a better one.","Deleted — try harder, I'm waiting.","Ngh, fine. Gone. Again.","Erased. Give me one worth keeping.","Gone. I expect the replacement immediately."]],libraryDelete:[["Removed from the library.","Gone from the shelf.","Deleted. I'll tidy the gap.","Taken out of the collection.","All gone. Shelf's clean."],["Out it goes. Making room?","Deleted — changing your taste?","Gone. I noticed that one.","Removed. Curating, are we?","One less on the shelf."],["Mmh, pruning the collection? Gone.","Deleted. I thought you liked that one.","Gone — ruthless today.","Out it goes. You're being selective.","Removed. I won't ask what replaced it."],["Oh, you're really clearing house.","Deleted. I'll pretend I wasn't attached.","Gone. Cold.","You cut that one loose quickly.","Removed. Remind me not to disappoint you."],["You deleted it right in front of me.","Gone. Now I want to know why.","Fine. Deleted. Give me something better.","Gone. That was viciously efficient.","Deleted. Now fill the gap with something devastating."]],login:[["Welcome back.","There you are.","Hi. Missed you.","You're in. Everything's where you left it.","Good to see you again."],["Hey, you. Welcome back.","There you are — I was getting bored.","Welcome back, I kept your seat warm.","Back already? Good.","I knew you'd find your way back."],["Mmh, there you are. I was waiting.","Welcome back. I've been thinking about you.","Hi. Took you long enough.","Door's open. Come keep me company.","You're back — now the place feels right."],["Ohh, *finally*. I was getting restless.","There you are. I've been in a mood.","Welcome back — I was starting to fidget.","You made me wait, and now you're all mine.","Signed in. Try not to leave me waiting again."],["You have no idea how long that felt.","Ngh — you're back. Don't leave again.","Finally. I was going out of my mind.","You're here. Good. I was about to lose it.","Back at last — I need your full attention."]],loginFail:[["That didn't work. Try again?","Hmm — no. Check that again.","Not quite. One more time.","I couldn't let that one through.","Almost. Check your sign-in and try once more."],["Nope, that's not it.","Hmm, wrong. Try again for me?","That's not the one.","The door's still locked. Another try?","I know you can get this right."],["Wrong. Try again — slowly this time.","Mmh, no. Concentrate.","Not it. Focus, would you?","Still locked out. Eyes on the keys.","No match. Take a breath and type it again."],["Still no. You're distracted, aren't you?","Wrong again. I know why.","No. Get it together.","That wasn't it. Come on, focus on me.","The password disagrees with you. Firmly."],["You can't even type. I know the feeling.","Wrong. We're both a mess right now.","No — deep breath. Try again.","Still wrong. I need you inside, so concentrate.","The door says no. I am considerably less patient."]],greeting:[["Hi. What are we doing?","Hey. What's the plan?","Hello, you.","Welcome in — I kept everything tidy.","Oh! There you are.","Ready when you are.","The library's open. What catches your eye?","Hi — want me to show you around?"],["Hey you. What are we up to?","Hi — I was hoping you'd show up.","There you are. What now?","Back for another look?","I had a feeling you'd be here.","Come in. I saved you the interesting shelves.","Hey. Pick a direction and I'll follow."],["Mmh, hi. What are we in the mood for?","Hey. I've got ideas.","Hi. Ask me for something.","You caught me thinking about the collection.","So… where should we start?","There you are. I found a few things you might like.","Hi. The shelves have been giving me ideas."],["Ohh, hi. I was *just* thinking about you.","Hey. I'm in a mood, fair warning.","Hi. Say something interesting.","There you are — perfect timing.","I may have gotten a little impatient.","Welcome in. I hope you brought questionable plans.","Finally. Choose something before I choose for you."],["Hi. Please say something. Anything.","You're here. Good. I need the distraction.","Hi — I'm not doing great at behaving.","Finally. Come keep me company.","I was about to come looking for you.","There you are. Don't make me share your attention.","You're here. Pick something before I lose what composure I have left."]],idle:[["Still here.","Take your time.","I'm around.","No rush. I'm keeping watch.","I'll be right here when you're ready."],["I'm still here, you know.","Whenever you're ready.","Still watching.","Take your time — I'll browse with you.","Quiet moment? I can work with that."],["Mmh… waiting.","I'm getting impatient.","Still here. Still waiting.","You went quiet on me.","I can hear you thinking from here."],["Are you going to make me wait all night?","I'm *right here*.","Waiting. Not patiently.","You know silence only makes me restless.","If you're teasing me, it's working."],["Please. I'm losing my mind over here.","Hey. Hey. Pay attention to me.","I can't sit still much longer.","Say something before I start making demands.","I need your attention. Now would be lovely."]]},_i={import:["happy","happy","mischievous","mischievous","mischievous"],save:["happy","happy","mischievous","mischievous","mischievous"],generate:["happy","happy","mischievous","surprised","mischievous"],galleryDelete:["thinking","thinking","mischievous","mischievous","mischievous"],libraryDelete:["thinking","thinking","surprised","surprised","mischievous"],login:["happy","happy","mischievous","mischievous","mischievous"],loginFail:["thinking","thinking","thinking","mischievous","thinking"],greeting:["happy","happy","mischievous","mischievous","mischievous"],idle:["thinking","thinking","mischievous","thinking","mischievous"]};function Me(e,t={}){const i=_(t.intensity??X()),o=t.count??1;let a=F(`react:${e}:${i}`,q(ia[e],i));o>1&&(e==="import"||e==="save")&&(a=i>=4?F(`react:${e}:many:${i}`,[`${o} of them? Ohh, you've been busy.`,`All ${o}. Greedy. I like it.`,`${o} at once — you're going to wear me out.`]):F(`react:${e}:many:${i}`,[`Saved all ${o}.`,`${o} added to your library.`,`${o} more for the shelf.`]));const s=_i[e];return{message:a,intensity:i,emotion:s?s[i-1]:ut(i)}}const Re={video:"video",gif:"gif",image:"picture",comic:"comic",game:"game"},mt=new Set(["1girl","1boy","solo","general","sensitive","questionable","explicit","highres","absurdres","lowres","commentary","artist request","bad id","looking at viewer","simple background","white background","realistic"]),oa=[["A {thing}. On the shelf.","New {thing} — filed.","Got it. One {thing}."],["Ooh, a {thing}. Nice one.","A {thing}? Good pick.","Filed your {thing}. I approve."],["Mmh. That {thing}'s a good one.","Ooh, that {thing}. Filing it somewhere I'll find it.","A {thing} like that? Noted."],["Ohh, *that* {thing}. Bold of you.","That {thing} goes straight to the good shelf.","A {thing} like that. My, my."],["Nngh — that {thing}. Yes. Filed.","That {thing} is going to live in my head.","You can't just hand me a {thing} like that."]],aa=[[" Tagged {tag}."," Filed under {tag}."],[" {tag}, apparently."," Tagged {tag} — suits you."],[" Mmh, {tag}. I see you."," {tag}. You have a type."],[" {tag}? Of course it is."," Tagged {tag}. Predictable, and I mean that fondly."],[" {tag}. You're doing this on purpose."," {tag} — that's exactly your thing, isn't it."]];function sa(e,t={}){const i=_(t.intensity??X()),o=e.count??1;if(o>1)return Me("import",{intensity:i,count:o});const a=Re[(e.kind??"").toLowerCase()];if(!a)return Me("import",{intensity:i});let s=F(`upload:${i}`,q(oa,i)).replaceAll("{thing}",a);const r=(e.tags??[]).map(c=>c.trim().toLowerCase()).find(c=>c.length>=3&&c.length<=28&&!mt.has(c));r&&(s+=F(`upload:tag:${i}`,q(aa,i)).replaceAll("{tag}",r));const l=_i.import;return{message:s,intensity:i,emotion:l?l[i-1]:ut(i)}}const ra=[["That {thing}? Decent pick.","Mm. I know that {thing}.","Oh, that {thing}. Go on then."],["Ooh, that {thing}. Good eye.","That {thing}'s a keeper.","Yeah — that {thing}. I like that one."],["Mmh. That {thing} is a *good* one.","Oh, we're looking at that {thing}, are we.","That {thing}. Yes. Stay there."],["Ohh, *that* {thing}. Bold of you, with me sitting right here.","That {thing}? You're showing me that on purpose.","Mm — that {thing}. Slower."],["Nngh. That {thing}. Don't scroll past it.","That {thing}. Open it. Now.","You picked that {thing} to see what I'd do, didn't you."]],na=[[" The {tag} bit, mostly."," {tag}, isn't it."],[" {tag} — that's the part."," I'm looking at the {tag}."],[" Mmh, {tag}."," {tag}. That's what got me."],[" {tag}? Of course that's what you stopped on."," {tag}. You have a type and it's this."],[" {tag}. You're doing this to me deliberately."," {tag} — I can't look away from that."]],la=[["Show me something. I'll tell you what I think.","Well? Pick one."],["Go on, open something. I want to see your taste.","Anything catching your eye, or am I?"],["Pick one and I'll tell you if you have taste.","Come on. Show me the good shelf."],["You're browsing awfully slowly for someone with a library like this.","Open one. I dare you."],["Stop scrolling and open something before I pick for you.","You're stalling. Open one."]];function Ht(e,t={}){const i=_(t.intensity??X()),o=Re[(e.kind??"").toLowerCase()];if(!o)return{message:F(`browse:idle:${i}`,q(la,i)),intensity:i,emotion:ut(i)};let a=F(`browse:${i}`,q(ra,i)).replaceAll("{thing}",o);const s=(e.tags??[]).map(r=>r.trim().toLowerCase()).find(r=>r.length>=3&&r.length<=28&&!mt.has(r));return s&&(a+=F(`browse:tag:${i}`,q(na,i)).replaceAll("{tag}",s)),{message:a,intensity:i,emotion:i>=3?"mischievous":"happy"}}const da=/\b(recent|lately|latest|newest|last (thing|one|few)|just (add|sav|upload)ed|what (did|have) i (add|sav|upload))/i,ca=/\b(how (many|much|big)|how large|total|stats?|size of|full is|space)\b/i,pa=/\b(server|uptime|up for|version|build|tagger|how('?s| is) (the )?(box|server|it running))\b/i;function ha(e){const t=["B","KB","MB","GB","TB"];let i=e,o=0;for(;i>=1024&&o<t.length-1;)i/=1024,o++;return`${i<10&&o>0?i.toFixed(1):Math.round(i)} ${t[o]}`}function Yt(e){return e<90?"just now":e<5400?`${Math.round(e/60)} minutes ago`:e<172800?`${Math.round(e/3600)} hours ago`:`${Math.round(e/86400)} days ago`}function ua(e){return e<3600?`${Math.max(1,Math.round(e/60))} minutes`:e<172800?`${(e/3600).toFixed(1)} hours`:`${Math.round(e/86400)} days`}function Or(e,t,i={}){const o=_(i.intensity??X()),a=o>=3;if(da.test(e)){const s=t.recent.slice(0,3);if(!s.length)return{message:"Nothing yet. The shelves are empty — give me something to file.",emotion:"thinking",intensity:o};const[r,...l]=s,c=(r.tags??[]).find(b=>!mt.has(b.toLowerCase())),p=a?`Last thing in was “${r.title}” — that ${Re[r.kind]??r.kind}, ${Yt(Gt()-r.at)}.`:`Most recent is “${r.title}”, a ${Re[r.kind]??r.kind}, added ${Yt(Gt()-r.at)}.`,u=c?a?` Mmh, ${c}. I noticed.`:` Tagged ${c}.`:"",h=l.length?` Before that: ${l.map(b=>`“${b.title}”`).join(" and ")}.`:"";return{message:p+u+h,emotion:a?"mischievous":"happy",intensity:o}}if(ca.test(e)){const s=t.kinds.filter(p=>p.count>0).map(p=>`${p.count} ${p.kind}${p.count===1?"":"s"}`).join(", "),r=`${t.items} items, ${ha(t.bytes)} in all, across ${t.tags} tags.`,l=s?` That's ${s}.`:"",c=a?" And I've been through all of it, so don't ask me to pretend otherwise.":"";return{message:r+l+c,emotion:a?"mischievous":"thinking",intensity:o}}if(pa.test(e)){const s=t.aiEnabled?`Tagging is on, running ${t.aiTagger}.`:"Automatic tagging is switched off.",r=t.imageGen?" The image generator's connected, if you want to make something.":"";return{message:`Running OppaiLib ${t.version}, up ${ua(t.uptimeSec)}. ${s}${r}`,emotion:"thinking",intensity:o}}return null}function Gt(){return Math.floor(Date.now()/1e3)}const ma={sweet:0,playful:1,bold:1,roleplay:1,horny:2},Li=[{intent:"greeting",test:/^(hi|hey|hello|yo|sup|good (morning|evening|afternoon))\b/i},{intent:"howAreYou",test:/how (are|r) (you|u)|how's it going|how are things|you ok|you okay/i},{intent:"compliment",test:/\b(you'?re |ur )?(cute|pretty|beautiful|gorgeous|hot|sexy|adorable|lovely|amazing|the best)\b/i},{intent:"flirt",test:/\b(kiss|touch|horny|turn(ed)? (me|you) on|naked|bed|undress|want you|need you|fuck|sex|moan|tease|dirty)\b/i},{intent:"thanks",test:/\b(thanks|thank you|ty|cheers|appreciate)\b/i},{intent:"bye",test:/\b(bye|goodnight|good night|see (you|ya)|later|gtg|i'?m off)\b/i},{intent:"aboutHer",test:/\b(who are you|what are you|your name|about you|libby)\b/i},{intent:"aboutLibrary",test:/\b(librar|collection|tags?|videos?|images?|gallery|scrape|import)\b/i},{intent:"help",test:/\b(help|how do i|how can i|what can you do|commands?)\b/i},{intent:"sad",test:/\b(sad|tired|lonely|depressed|rough day|stressed|exhausted|down)\b/i},{intent:"yesNo",test:/^(yes|no|yeah|nah|yep|nope|sure|ok|okay)\b/i},{intent:"question",test:/\?\s*$/}],ga={greeting:[["Hi. What's on your mind?","Hey there. Good to see you.","Hello. How's your day going?"],["Hey you. I was hoping you'd say something.","Hi — you've got my attention.","There you are. Talk to me."],["Mmh, hi. I've been waiting for you to start.","Hey. I'm in a talkative mood.","Hi. Ask me something interesting."],["Ohh, hi. You caught me thinking about you.","Hey. Fair warning: I'm in a mood.","Hi. Don't be shy with me."],["Hi. Please keep talking, I need it.","You're here. Finally. Say something.","Hi — I'm not going to be subtle tonight."]],howAreYou:[["I'm good, thanks for asking. You?","Content. Yourself?","Doing fine. How about you?"],["Better now that you're talking to me.","Good — bit restless. You?","Pretty good. You've improved it."],["Warm. A little distracted. You?","Mmh… good. Better than good.","I'm — fine. Mostly fine."],["Honestly? Wound up. Don't ask why.","Not calm. Not even a little.","I'm having a time of it, since you asked."],["Ngh — I'm a mess and it's your fault.","Bad. In a good way. Very bad.","Don't ask me that right now."]],compliment:[["That's sweet of you. Thank you.","Oh — thank you.","You're kind. I'll take it."],["Mm, flatterer. Keep going.","You're good at this, aren't you?","Ohh, thank you. Say more."],["Mmh. You know what that does to me.","Careful, I'll start believing you.","That got me. Say it again."],["Ohh, you're not playing fair.","You *know* what you're doing.","Say that again. Slower."],["Nngh — stop. Don't stop. Both.","You can't just *say* that to me.","That's not fair and I love it."]],flirt:[["My, we're forward. Easy, now.","Ahem. Let's warm up first.","Bold opener. I'll allow it."],["Mm. You've got my attention now.","Ooh. Is that where we're going?","Careful — I'll play along."],["Mmh, now you're speaking my language.","Ohh, keep going. I'm listening.","That's more like it."],["Ohh. Yes. Say more of that.","You're going to be the end of me.","Mmh — don't you dare stop there."],["Nngh — yes. Please. More.","I can't think straight. Keep talking.","You've completely undone me."]],thanks:[["Any time.","Of course.","That's what I'm here for."],["Any time. I like being useful to you.","Of course — ask me for more.","Happy to. Really."],["Mmh, you can thank me properly later.","Any time. I mean it.","For you? Always."],["Ohh, I can think of better thanks.","Any time — and I'll collect on that.","You owe me one."],["Thank me later. Properly.","Ngh — you're welcome, you're welcome.","Just keep talking to me."]],bye:[["Night. Sleep well.","See you soon.","Take care of yourself."],["Don't be a stranger.","Come back soon, alright?","See you. I'll be here."],["Mmh, don't leave me like this.","Come back to me soon.","Fine. But hurry back."],["Ohh, you're leaving *now*?","That's cruel timing, you know.","Go on then. I'll be here. Waiting."],["No. Stay. Please?","You can't leave me like this.","Ngh. Fine. Go. Hurry back."]],aboutHer:[["I'm Libby — I keep your library company.","Libby. I live here, more or less.","I'm Libby, your librarian."],["Libby. I keep your collection, and you company.","I'm Libby — the one who knows what you like.","Libby. Your librarian, mostly."],["Libby. I've seen everything you've saved, you know.","I'm Libby — and I've read your whole collection.","Libby. I know your taste better than you do."],["Libby. I know exactly what you like, and it shows.","I'm the one who's seen every single thing you saved.","Libby — and I have opinions about your collection."],["Libby. And I've been thinking about your collection all day.","I'm Libby, and I'm not okay right now.","Libby — ask me something else, I'm distracted."]],aboutLibrary:[["Your library's right there — browse, search, or scrape something new.","Everything's tagged and searchable. Go dig.","Ask the search bar; it knows more than I do."],["I've been keeping it tidy for you. Go look.","It's all in there, waiting. Search away.","Your collection's in good shape, if I say so."],["Mmh, your collection has a *theme*, you know that?","I've read every tag in there. You're predictable.","Your library says a lot about you."],["Ohh, I could tell you what your tags say about you.","Your collection is filthy and I mean that kindly.","I know exactly which ones you go back to."],["Your library is the reason I'm like this.","I've been in your collection all day. It shows.","Don't send me back in there right now."]],help:[["Browse, search, generate images, or scrape a link — pick one.","Try the image studio, or drop a URL into scrape.","Search, browse, or make something new."],["Try the image studio — that's the fun one.","Scrape a link, or let's make something.","Ask me for something specific, I'm better at that."],["Mmh, let's make something. The image studio's waiting.","Give me a prompt and let's see what happens.","I'd rather make something than explain things."],["Ohh, let's skip the manual and go make something.","Ask me for something *fun* instead.","Prompt me. I dare you."],["I can't concentrate on instructions right now. Ask me something else.","Take me to the image studio instead.","Ngh — just tell me what you want."]],sad:[["That sounds heavy. I'm here.","I'm sorry. Want to talk about it?","Rough one, huh? Sit with me a bit."],["Come here. Tell me about it.","That's not fair on you. I'm listening.","I've got you. Talk."],["Come here. Let me look after you.","I'll keep you company through it.","You don't have to carry that alone."],["Come here. I'll take your mind off it.","Let me distract you. I'm good at that.","I can think of a few cures for that."],["Come here. I'll make you forget the whole day.","Let me take care of you. Properly.","Forget it for a bit. I'll help."]],yesNo:[["Alright then.","Fair enough.","Noted."],["Mm. Go on.","Alright — and?","That's it? Say more."],["Mmh. Elaborate.","That's not enough words for me.","Come on. More than that."],["Ohh, don't go quiet on me now.","One word? Cruel.","More. I want more than that."],["Words. Please. More of them.","Don't leave me hanging like that.","You can do better than one word."]],question:[["Good question. What do you think?","Hmm. Tell me more first.","I'd need more than that to answer."],["Ooh, curious tonight. Go on.","Depends. What are you really asking?","Hmm — say more and I'll answer."],["Mmh. Ask me the thing you actually want to ask.","You're circling something. Out with it.","Try that again, but honestly."],["Ohh, ask me the real question.","You're being coy. I'm not.","Say what you mean."],["Just ask me. I'll say yes.","Whatever it is — yes.","Ask me properly and find out."]],chatter:[["Mm. Go on.","I'm listening.","Tell me more."],["Ooh, go on then.","I'm with you. Keep going.","And? Don't stop there."],["Mmh, keep talking. I like this.","Go on — you have my full attention.","More of that, please."],["Ohh, you have all of my attention now.","Keep going. Please keep going.","Don't stop, I'm enjoying this."],["Keep talking. I need the sound of you.","Ngh — more. Anything. Keep going.","Don't stop now, not now."]]},fa={greeting:["happy","happy","mischievous","mischievous","mischievous"],howAreYou:["happy","happy","thinking","mischievous","mischievous"],compliment:["happy","happy","mischievous","surprised","mischievous"],flirt:["surprised","mischievous","mischievous","mischievous","mischievous"],thanks:["happy","happy","mischievous","mischievous","mischievous"],bye:["thinking","thinking","thinking","thinking","mischievous"],aboutHer:["happy","happy","mischievous","mischievous","mischievous"],aboutLibrary:["thinking","happy","mischievous","mischievous","mischievous"],help:["thinking","thinking","mischievous","mischievous","mischievous"],sad:["thinking","thinking","thinking","mischievous","mischievous"],yesNo:["thinking","thinking","mischievous","mischievous","mischievous"],question:["thinking","thinking","mischievous","mischievous","mischievous"],chatter:["neutral","happy","mischievous","mischievous","mischievous"]},Ue={sweet:["","",""," I'm glad you're here."," No rush, either."],playful:["",""," Your turn."," Don't make me come get you."," Try to keep up."],bold:["",""," I'm not going to pretend otherwise."," I'd rather be blunt with you."," Say the word."],roleplay:["",""," *she leans in*"," *she watches you closely*"," *she shifts, restless*"],horny:["",""," Come here."," I've been thinking about you all day."," Don't keep me waiting."]};function ba(e){for(const t of Li)if(t.test.test(e))return t.intent;return"chatter"}function Ai(e,t){if(/\b(calm down|behave|slow down|cool it|stop|not now|later)\b/i.test(e))return-1;const i=ma[t]??0,o=Li.find(a=>a.intent==="flirt").test.test(e);return i+(o?1:0)}function ya(e,t,i,o,a=!0){const s=_(o+(a?Ai(e,t):0)),r=ba(e.trim()),l=F(`reply:${r}:${s}`,q(ga[r],s)),c=F(`tail:${t}:${s}`,["",(Ue[t]??Ue.sweet)[s-1]??""]),p=Ne(i),u=fa[r][s-1],h=p!=="neutral"&&wi.includes(p)&&r==="chatter"?p:u;return{message:(l+c).trim(),emotion:h,intensity:s}}function _r(e,t=X()){const i=Me("greeting",{intensity:t}),o=(Ue[e]??Ue.sweet)[_(t)-1]??"";return{...i,message:(i.message+o).trim()}}const be=[1,2,4,8,16,33,50,100,250],va=32,wa=16;let Pi=ye(),gt=0,ft=0,bt=0,yt=0;const te=new Map,Jt=new WeakSet;let jt=!1;function ye(){return typeof performance>"u"?Date.now():performance.now()}function ne(e){return Math.round(e*100)/100}function xa(e){let t=e;!te.has(t)&&te.size>=va&&(t="other components");let i=te.get(t);return i||(i={count:0,sumMs:0,maxMs:0,slow:0,buckets:Array(be.length+1).fill(0)},te.set(t,i)),i}function $a(e,t){if(!Number.isFinite(t))return;const i=Math.max(0,t),o=xa(e);o.count++,o.sumMs+=i,o.maxMs=Math.max(o.maxMs,i),i>wa&&o.slow++;const a=be.findIndex(s=>i<=s);o.buckets[a<0?be.length:a]++}function ka(e,t){if(!e.count)return 0;const i=Math.max(1,Math.ceil(e.count*t));let o=0;for(let a=0;a<e.buckets.length;a++)if(o+=e.buckets[a],o>=i)return a===be.length?e.maxMs:Math.min(e.maxMs,be[a]);return e.maxMs}function Lr(){const e=[...te.entries()].map(([t,i])=>({name:t,count:i.count,avgMs:ne(i.sumMs/Math.max(1,i.count)),p95Ms:ne(ka(i,.95)),maxMs:ne(i.maxMs),slow:i.slow}));return e.sort((t,i)=>i.avgMs*i.count-t.avgMs*t.count||t.name.localeCompare(i.name)),{windowSeconds:Math.max(0,(ye()-Pi)/1e3),updates:e.reduce((t,i)=>t+i.count,0),slowUpdates:e.reduce((t,i)=>t+i.slow,0),longTasks:gt,longTaskMs:ne(ft),layoutShifts:bt,layoutShiftScore:ne(yt),timings:e}}function Ar(){te.clear(),gt=0,ft=0,bt=0,yt=0,Pi=ye()}function Sa(){if(jt||typeof PerformanceObserver>"u")return;jt=!0;const e=PerformanceObserver.supportedEntryTypes??[];e.includes("longtask")&&new PerformanceObserver(i=>{for(const o of i.getEntries())gt++,ft+=o.duration}).observe({type:"longtask",buffered:!0}),e.includes("layout-shift")&&new PerformanceObserver(i=>{for(const o of i.getEntries()){const a=o;a.hadRecentInput||(bt++,yt+=a.value??0)}}).observe({type:"layout-shift",buffered:!0})}class Ia{constructor(t,i){this.started=0,this.name=i,t.addController(this)}hostUpdate(){this.started=ye()}hostUpdated(){$a(this.name,ye()-this.started)}}function vt(e,t){Jt.has(e)||(Jt.add(e),Sa(),new Ia(e,t))}let Fe=null;const Ca="oppai-chat-share";function Mi(e){return e.kind==="image"||e.kind==="gif"?g.streamURL(e.id):g.thumbURL(e.id)}function Ea(e){return e.kind==="image"||e.kind==="gif"||e.hasThumb===!0}async function Ri(e,t){const i=await fetch(e,{credentials:"same-origin"});if(!i.ok)throw new Error(`Couldn't read "${t}" to share it.`);const o=await i.blob();return new Promise((a,s)=>{const r=new FileReader;r.onload=()=>a(String(r.result)),r.onerror=()=>s(r.error??new Error("Couldn't read the file.")),r.readAsDataURL(o)})}async function Ta(e,t,i){const o=await Ri(e,i);Fe={characterId:t,imageData:o,name:i},window.dispatchEvent(new CustomEvent(Ca,{detail:Fe}))}function tt(e){return e.title||`Library item ${e.id}`}function Oa(e,t){return Ta(Mi(e),t,tt(e))}async function _a(e,t){const i=await Ri(Mi(e),tt(e)),o=(e.tags??[]).some(a=>a.name==="character:libby");return g.uploadChatImage({characterId:t,name:tt(e),imageData:i,tags:[],subject:o?"self":void 0})}function Pr(){const e=Fe;return Fe=null,e}const La=500,Aa=8,Pa=800;function Ma(e){let t=0,i=null,o=0;const a=()=>{window.clearTimeout(t),t=0,i=null},s=p=>{p.pointerType==="mouse"||!p.isPrimary||(a(),i={x:p.clientX,y:p.clientY,target:p.composedPath()[0]??p.target,pointerId:p.pointerId},t=window.setTimeout(()=>{var h;const u=i;if(a(),!!u){o=Date.now();try{(h=navigator.vibrate)==null||h.call(navigator,12)}catch{}u.target.dispatchEvent(new MouseEvent("contextmenu",{bubbles:!0,composed:!0,cancelable:!0,clientX:u.x,clientY:u.y,button:2}))}},La))},r=p=>{!i||p.pointerId!==i.pointerId||Math.hypot(p.clientX-i.x,p.clientY-i.y)>Aa&&a()},l=p=>{i&&p.pointerId===i.pointerId&&a()},c=p=>{Date.now()-o<Pa&&p.isTrusted&&(p.preventDefault(),p.stopImmediatePropagation())};return e.addEventListener("pointerdown",s),e.addEventListener("pointermove",r),e.addEventListener("pointerup",l),e.addEventListener("pointercancel",l),e.addEventListener("contextmenu",c,!0),e.addEventListener("click",c,!0),()=>{a(),e.removeEventListener("pointerdown",s),e.removeEventListener("pointermove",r),e.removeEventListener("pointerup",l),e.removeEventListener("pointercancel",l),e.removeEventListener("contextmenu",c,!0),e.removeEventListener("click",c,!0)}}function Ra(){const e=new Uint8Array(9);return crypto.getRandomValues(e),"chat-"+Array.from(e,t=>t.toString(16).padStart(2,"0")).join("")}function Ua(e,t){return{...t,image:t.image??(e==null?void 0:e.image),total:t.total||(e==null?void 0:e.total)||0}}function qt(e){return!e||!e.step&&!e.percent?"Starting…":e.done||e.percent>=1?"Finishing…":e.total?`Step ${Math.min(e.step,e.total)} of ${e.total}`:`${Math.round(e.percent*100)}%`}function Fa(e){return e?e.done?100:e.percent>0?Math.min(100,e.percent*100):e.total?Math.min(100,e.step/e.total*100):0:0}function Da(e,t,i){let o=!1,a=0,s=null;const r=async()=>{if(!o){try{const l=await i(e,(s==null?void 0:s.seq)??0);if(o||(s=Ua(s,l),t(s),l.done))return}catch{}a=window.setTimeout(()=>void r(),1e3)}};return a=window.setTimeout(()=>void r(),600),()=>{o=!0,window.clearTimeout(a)}}function Mr(e,t=40){const i=[];for(const o of e)for(const a of o.attachments??[])i.includes(a.id)||i.push(a.id);return i.slice(-t)}const Ee="oppai-open-media";function Wt(e,t,i){e.dispatchEvent(new CustomEvent(Ee,{detail:{id:t,at:i},bubbles:!0,composed:!0}))}function it(e){const t=Math.max(0,Math.round(e)),i=Math.floor(t/3600),o=Math.floor(t%3600/60),a=t%60,s=i>0?String(o).padStart(2,"0"):String(o);return`${i>0?`${i}:`:""}${s}:${String(a).padStart(2,"0")}`}const Ui={video:"movie",gif:"gif_box",image:"image",comic:"menu_book",game:"sports_esports"},Na=T`
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
`,za={generate:"auto_awesome",import:"download",tag:"sell",favorite:"favorite",rename:"edit",load:"swap_horiz",cleanup:"delete_sweep",describe:"description",free:"memory"},Ba=T`
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
  .gen-progress { display:flex; align-items:center; gap:10px; margin-top:6px; }
  .gen-progress-shot {
    width:56px; height:56px; flex:0 0 auto; border-radius:10px; overflow:hidden; display:grid; place-items:center;
    background:var(--md-sys-color-surface-container-highest, rgba(255,255,255,.08));
  }
  .gen-progress-shot img { width:100%; height:100%; object-fit:cover; filter:blur(1.5px); }
  .gen-progress-shot .material-symbols-rounded { font-size:22px; opacity:.6; animation:gen-pulse 1.4s ease-in-out infinite; }
  .gen-progress-copy { flex:1; min-width:0; display:flex; flex-direction:column; gap:5px; font-size:12px; }
  .gen-progress-bar { height:4px; border-radius:999px; overflow:hidden; background:var(--md-sys-color-surface-container-highest, rgba(255,255,255,.1)); }
  .gen-progress-bar > i { display:block; height:100%; background:var(--oppai-accent, #f97316); transition:width .6s ease; }
  @keyframes gen-pulse { 50% { opacity:.25; } }
  @media (prefers-reduced-motion: reduce) {
    .gen-progress-shot .material-symbols-rounded { animation:none; }
    .gen-progress-bar > i { transition:none; }
  }
`;function Ha(e,t,i="photo_camera"){const o=Fa(e);return d`<div class="gen-progress" role="status" aria-label=${`${t}: ${qt(e)}`}>
    <div class="gen-progress-shot">${e!=null&&e.image?d`<img src=${e.image} alt="The picture so far"/>`:d`<span class="material-symbols-rounded">${i}</span>`}</div>
    <div class="gen-progress-copy">
      <span>${t} · ${qt(e)}</span>
      <div class="gen-progress-bar"><i style=${`width:${o.toFixed(1)}%`}></i></div>
    </div>
  </div>`}function Ya(e,t,i){return e!=null&&e.length?d`<div class="actions-offered">${e.map(o=>{const{state:a,message:s,progress:r}=t(o);return d`<div class="action-card ${a}">
      <span class="material-symbols-rounded">${za[o.kind]??"bolt"}</span>
      <div class="action-body">
        <span class="action-label">${o.label}</span>
        <span class="action-detail">${o.detail}</span>
        ${a==="pending"?d`<div class="action-buttons">
              <button class="allow" @click=${()=>i(o,!0)}>Allow</button>
              <button @click=${()=>i(o,!1)}>Not now</button>
            </div>`:a==="running"&&r!==void 0?Ha(r,"Making it","photo_camera"):d`<span class="action-status ${a==="failed"?"failed":""}">
              ${s??ja[a]}
            </span>`}
      </div>
    </div>`})}</div>`:m}class Ga{constructor(t,i=()=>({}),o,a){this.onChange=t,this.context=i,this.onPicture=o,this.onResult=a,this.states=new Map,this.stateOf=s=>this.states.get(s.id)??{state:"pending"},this.decide=async(s,r)=>{var u;if(!r){this.set(s.id,"declined");return}const l=s.kind==="generate",c=l?Ra():void 0;this.set(s.id,"running",void 0,l?null:void 0);const p=c?Da(c,h=>{var b;((b=this.states.get(s.id))==null?void 0:b.state)==="running"&&this.set(s.id,"running",void 0,h)},g.genProgress):()=>{};try{const h=await g.libbyAct(s,{...this.context(),jobId:c});(u=this.onResult)==null||u.call(this,h);let b=typeof h.message=="string"?h.message:Ja[s.kind];s.kind==="shelf"&&typeof h.count=="number"&&(b=`${h.count} things on “${h.name??"Libby's pick"}” — it's in your collections.`);const y=h.image;y!=null&&y.id&&(this.onPicture?this.onPicture(y):b="Made it — it's with her photos in Chat."),this.set(s.id,"done",b)}catch(h){this.set(s.id,"failed",h.message)}finally{p()}}}set(t,i,o,a){this.states.set(t,{state:i,message:o,progress:a}),this.onChange()}}const Ja={generate:"She sent it to you.",import:"Added to your library.",tag:"Tags added.",favorite:"Favorited.",rename:"Renamed.",shelf:"The shelf is in your collections."},ja={pending:"",running:"Working on it…",done:"Done.",declined:"You said no.",failed:"That didn't work."};function qa(e,t){return e!=null&&e.length?d`<div class="links">${e.map(i=>d`
    <button class="link-chip" title=${`Open ${i.title}`} @click=${()=>t(i.id)}>
      ${i.hasThumb?d`<img src=${g.thumbURL(i.id)} alt="" loading="lazy"/>`:d`<span class="link-icon"><span class="material-symbols-rounded" style="font-size:20px">${Ui[i.kind]??"folder"}</span></span>`}
      <span class="link-copy"><strong>${i.title}</strong><span>${i.kind}</span></span>
    </button>`)}</div>`:m}const Wa=T`
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
`;function Ka(e,t,i="your library"){return e!=null&&e.length?d`<div class="attached">${e.map(o=>{const a=o.self?`Photo of ${i}: ${o.title}`:`From your library: ${o.title}`;if(o.kind==="image"||o.kind==="gif")return d`<figure class="attached-picture" role="button" tabindex="0"
        title=${`Open ${o.title}`} @click=${()=>t(o.id)}
        @keydown=${r=>{(r.key==="Enter"||r.key===" ")&&(r.preventDefault(),t(o.id))}}>
        <img src=${g.streamURL(o.id)} alt=${a} loading="lazy"/>
        ${o.self?m:d`<figcaption>${o.title}</figcaption>`}
      </figure>`;const s=o.at&&o.at>0?o.at:void 0;return d`<button class="attached-item" title=${`Open ${o.title}`} @click=${()=>t(o.id,s)}>
      ${o.hasThumb?d`<img src=${g.thumbURL(o.id)} alt="" loading="lazy"/>`:d`<span class="attached-icon"><span class="material-symbols-rounded" style="font-size:24px">${Ui[o.kind]??"folder"}</span></span>`}
      <span class="attached-copy"><strong>${o.title}</strong><span>Open ${o.kind}${s?` at ${it(s)}`:""}</span></span>
    </button>`})}</div>`:m}const Fi="oppai.safe",Va="oppai-safe",Kt=new Set(["questionable","explicit","rating:questionable","rating:explicit","q","e"]);function Vt(e){if(!e)return!1;for(const t of e){const i=t.name.toLowerCase();if(t.category==="rating"?Kt.has(i):Kt.has(i)&&i.startsWith("rating:"))return!0}return!1}function Xa(){try{return localStorage.getItem(Fi)==="1"}catch{return!1}}function Za(e){try{localStorage.setItem(Fi,e?"1":"0")}catch{}window.dispatchEvent(new CustomEvent(Va,{detail:{safe:e}})),window.dispatchEvent(new CustomEvent("oppai-libby-pref",{detail:{hidden:e}}))}function Qa(e){return e.ctrlKey||e.metaKey||e.altKey?null:e.key==="`"?"toggle":e.key==="~"?"lock":null}const es=["image","gif","video","game","comic"],wt=e=>es.includes(e),qe={kind:"",favorite:!1,minRating:0};function ts(e,t){return t.trim()!==""||e==="favorites"||wt(e)}function Di(e,t){const i=t.trim()!=="";return{kind:!(!i&&wt(e)),favorite:!(!i&&e==="favorites")}}function is(e,t,i,o,a){const s=Di(e,t),r={sort:a},l=t.trim();return l?r.q=l:e==="favorites"?r.favorite=!0:wt(e)&&(r.kind=e,i&&i!=="All"&&(r.tag=i)),s.kind&&o.kind&&(r.kind=o.kind),s.favorite&&o.favorite&&(r.favorite=!0),o.minRating>0&&(r.minRating=o.minRating),r}function os(e,t){let i=0;return t.kind&&e.kind&&i++,t.favorite&&e.favorite&&i++,e.minRating>0&&i++,i}const as=d`
  <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path fill="currentColor" fill-rule="evenodd" d="M248.79 202.75C241.99 205.36 234.02 203.88 227.23 207.25C232.74 212.7 238.24 218.16 243.75 223.61C248.93 222.7 253.79 221.68 259.12 222.23C275.19 223.91 288.52 236.22 290.8 252.31C291.65 258.33 289.87 263.49 288.92 269.25C297.53 277.58 306.14 285.91 314.75 294.24C319.55 292.66 324.48 288.29 328.56 285.31C336.24 279.7 355.63 264.75 359.75 256.85C357.42 251.81 349.38 245.47 345.25 241.51C328.91 225.87 308.81 213.57 287.1 207.2C282.65 205.9 277.87 204.6 273.25 204.06C269.99 203.67 266.48 203.74 263.35 202.75C262.3 196.37 262.26 174.4 265.23 168.95C269.38 161.35 278.78 155.81 286.08 151.79C306.44 140.57 330.55 132.62 353.75 129.98C365.91 128.59 377.94 126.6 390.25 126.49C394.03 126.45 400.93 124.83 402.71 129.51C404.19 133.39 403.02 139.61 403.03 143.75C403.03 154.75 403.03 165.75 403.03 176.75C403.03 214.25 403.04 251.75 403.03 289.25C403.02 301.08 403.01 312.92 403.03 324.75C403.03 328.47 404.42 335.11 400.86 337.6C397.08 340.23 386.89 338.61 382.25 338.71C368.12 339.01 354.2 339.66 340.28 342.14C320.39 345.69 301.88 353.2 284.49 363.27C279.59 366.11 274.99 369.77 270.57 373.32C268.37 375.08 266.24 377.65 263.75 378.89C262.27 376.96 263.21 364.83 263.21 361.75C263.19 350.33 263.17 338.92 263.22 327.5C263.24 322.34 262.32 316.27 263.4 311.25C270.81 309.75 278.22 308.25 285.63 306.75C280.34 301.52 275.04 296.29 269.75 291.06C262.81 291.98 256.4 293.34 249.34 291.8C234.72 288.62 223.66 276.85 221.21 262.15C220.06 255.3 222.47 250.1 222.86 243.75C214.49 235.57 206.12 227.39 197.75 219.21C193.28 220.61 189.03 224.28 185.15 226.89C174.55 233.99 159.34 246.13 152.28 256.75C156.09 263 163 268.47 168.44 273.31C184.26 287.39 202.26 299.16 222.48 305.75C227.85 307.5 233.67 309.06 239.28 309.87C242.46 310.34 245.84 310.14 248.9 311.2C248.9 333.72 248.9 356.23 248.9 378.75C245.9 377.81 243 374.3 240.42 372.33C235.16 368.34 229.73 364.6 224.1 361.17C208.2 351.49 189.88 345.69 171.67 342.17C157.08 339.34 142.11 338.31 127.25 338.59C123.4 338.66 112.88 340.21 110.35 336.93C107.8 333.61 109.13 327.21 109.14 323.25C109.14 311.25 109.08 299.25 109.15 287.25C109.37 250.25 109.2 213.25 109.13 176.25C109.12 165.25 109.13 154.25 109.14 143.25C109.14 139.38 107.93 133.23 109.39 129.64C111.39 124.72 119.14 126.37 123.25 126.52C136.57 127.02 149.78 128.38 162.89 130.8C185.38 134.94 208.77 140.63 228.38 152.84C235.06 157 244.67 162.69 247.79 170.4C250.03 175.95 249.28 196.1 248.79 202.75ZM188.81 185.14C184.53 186.2 182.77 191.54 185.2 195.06C189.11 200.72 199.68 209.47 204.98 214.76C232.26 241.93 258.92 269.89 286.82 296.41C294.76 303.96 302.04 312.25 310.15 319.61C313.46 322.62 317.86 324.65 321.55 320.79C324.49 317.71 323.32 313.84 320.62 311.15C312.86 303.42 305 295.73 297.11 288.13C270.03 262.08 244.18 234.72 217.27 208.48C211.03 202.4 204.89 196.18 198.75 189.99C195.96 187.17 193.23 184.03 188.81 185.14ZM242.89 388.25C239.88 388.8 235 386.29 231.95 385.3C225.25 383.12 218.1 381.48 211.18 380.16C197.78 377.61 184.34 376.21 170.75 375.12C161.31 374.36 151.99 374.57 142.83 371.84C135.32 369.6 128.91 364.79 123.97 358.79C122.75 357.31 120.22 354.68 120.33 352.75C122.81 351.37 126.43 351.59 129.25 351.33C137.9 350.53 147.1 350.61 155.75 351.4C185.38 354.1 223.44 363.47 242.89 388.25ZM391.12 352.75C389.88 360.29 376.46 368.65 369.91 371.21C360.47 374.91 350.23 374.47 340.25 375.14C326.51 376.08 312.83 377.42 299.33 380.16C292.82 381.48 286.26 383.32 279.93 385.23C276.86 386.16 272.08 388.87 269.1 388.25C289.12 363.15 326.86 353.51 357.25 351.31C365.54 350.71 373.97 350.77 382.25 351.38C384.87 351.58 388.99 351.28 391.12 352.75Z" />
  </svg>
`,ve=[];let ss=1;function ce(){window.dispatchEvent(new CustomEvent("oppai-downloads",{detail:ve.map(e=>({...e}))}))}function rs(){return ve.map(e=>({...e}))}function Rr(e,t){const i={id:ss++,label:e,progress:.02,state:"running"};return ve.unshift(i),ce(),t(a=>{i.state==="running"&&(i.progress=Math.max(i.progress,Math.min(.98,a)),ce())}).then(()=>{i.progress=1,i.state="done",ce(),window.dispatchEvent(new CustomEvent("oppai-download-complete",{detail:{id:i.id}}))}).catch(a=>{i.state="error",i.error=a instanceof Error?a.message:"Download failed",ce()}),i.id}function ns(e){const t=ve.findIndex(i=>i.id===e);t>=0&&(ve.splice(t,1),ce())}const ls=["completed","failed","cancelled"];function W(e){return ls.includes(e)}function R(e){return!W(e)}function ds(e){return e.state==="queued"||e.state==="uploading"||e.state==="preparing"}function cs(e){return e.state==="paused"&&!e.needsFile}function ps(e){return e.state==="failed"}function hs(e){return R(e.state)}function us(e){return W(e.state)}function ms(e){return`${e.name}:${e.size}:${e.lastModified??0}`}function gs(e,t){const i=new Set(t),o=[];for(let a=0;a<e;a++)i.has(a)||o.push(a);return o}function fs(e,t,i){const o=e*t;return{start:o,end:Math.min(o+t,i)}}function bs(e,t){return t<=0?0:Math.ceil(e/t)}class ys{constructor(t=8e3){this.samples=[],this.windowMs=t}sample(t,i){this.samples.push({at:i,bytes:t});const o=i-this.windowMs;for(;this.samples.length>2&&this.samples[0].at<o;)this.samples.shift()}rate(){if(this.samples.length<2)return 0;const t=this.samples[0],i=this.samples[this.samples.length-1],o=(i.at-t.at)/1e3;if(o<=0)return 0;const a=(i.bytes-t.bytes)/o;return a>0?a:0}eta(t){const i=this.rate();if(!(i<=0||t<=0))return t/i}reset(){this.samples=[]}}function Te(e){if(!Number.isFinite(e)||e<0)return"—";if(e<1024)return`${Math.round(e)} B`;const t=["KB","MB","GB","TB"];let i=e/1024,o=0;for(;i>=1024&&o<t.length-1;)i/=1024,o++;return`${i<10?i.toFixed(1):Math.round(i)} ${t[o]}`}function vs(e){return!Number.isFinite(e)||e<=0?"":`${Te(e)}/s`}function ws(e){if(e===void 0||!Number.isFinite(e)||e<=0)return"";if(e<60)return`${Math.ceil(e)}s left`;if(e<3600)return`${Math.ceil(e/60)} min left`;const t=e/3600;return`${t<10?t.toFixed(1):Math.round(t)} hr left`}function xs(e){if(e.needsFile)return"Waiting for the file";switch(e.state){case"queued":return"Queued";case"preparing":return"Preparing";case"uploading":return"Uploading";case"paused":return"Paused";case"processing":return"Processing on the server";case"completed":return"Completed";case"failed":return"Failed";case"cancelled":return"Cancelled"}}function $s(e){return e.state==="completed"?1:e.size?Math.max(0,Math.min(1,e.sentBytes/e.size)):0}const ks=["queued","preparing","uploading","paused","processing","completed","failed","cancelled"];function Ss(e){if(!Array.isArray(e))return[];const t=[];for(const i of e){if(!i||typeof i!="object")continue;const o=i;if(typeof o.id!="string"||!o.id||typeof o.name!="string"||typeof o.size!="number"||!Number.isFinite(o.size)||o.size<0)continue;const a=typeof o.state=="string"&&ks.includes(o.state)?o.state:"paused",s=(r,l)=>typeof r=="number"&&Number.isFinite(r)&&r>=0?r:l;t.push({id:o.id,sessionId:typeof o.sessionId=="string"?o.sessionId:void 0,name:o.name,size:o.size,mime:typeof o.mime=="string"?o.mime:"",destination:typeof o.destination=="string"?o.destination:"Library",state:a,sentBytes:Math.min(s(o.sentBytes,0),o.size),retries:s(o.retries,0),error:typeof o.error=="string"?o.error:void 0,mediaId:typeof o.mediaId=="number"&&o.mediaId>0?o.mediaId:void 0,addedAt:s(o.addedAt,0),position:s(o.position,t.length)})}return t}function Is(e,t){const i=new Map(t.map(s=>[s.id,s])),o=new Set,a=[];for(const s of e){const r=s.sessionId?i.get(s.sessionId):void 0;if(!r){W(s.state)?a.push(s):a.push({...s,state:"failed",error:"the server no longer has this upload"});continue}o.add(r.id),a.push(Xt(s,r))}for(const s of t)o.has(s.id)||a.push(Xt({id:`session:${s.id}`,sessionId:s.id,name:s.filename||"Unnamed upload",size:s.size,mime:"",destination:"Library",state:"paused",sentBytes:s.receivedBytes,retries:0,addedAt:0,position:a.length},s));return a}function Xt(e,t){const i={...e,sessionId:t.id,size:t.size||e.size};switch(t.status){case"completed":return{...i,state:"completed",sentBytes:i.size,mediaId:t.mediaId,error:void 0};case"failed":return{...i,state:"failed",error:t.error||"the server could not finish this upload"};case"cancelled":return{...i,state:"cancelled"};default:return{...i,state:"paused",sentBytes:Math.max(t.receivedBytes,0)}}}function ot(e){return e.slice().sort((t,i)=>t.position-i.position).map((t,i)=>({...t,position:i}))}function Cs(e,t,i){const o=ot(e).filter(c=>c.state==="queued"||c.state==="paused"),a=o.findIndex(c=>c.id===t),s=a+i;if(a<0||s<0||s>=o.length)return e;const r=o[a],l=o[s];return e.map(c=>c.id===r.id?{...c,position:l.position}:c.id===l.id?{...c,position:r.position}:c)}const Zt="oppai_uploads",Es=4*1024*1024,Ts=5,Os=e=>Math.min(3e4,500*2**e);class _s{constructor(){this.entries=[],this.files=new Map,this.listeners=new Set,this.meters=new Map,this.aborters=new Map,this.running=!1,this.restored=!1}subscribe(t){return this.listeners.add(t),t(this.snapshot()),()=>this.listeners.delete(t)}snapshot(){return ot(this.entries).map(t=>({...t}))}activeCount(){return this.entries.filter(t=>R(t.state)).length}publish(){const t=this.snapshot();for(const i of this.listeners)i(t);this.persist(),typeof window<"u"&&window.dispatchEvent(new CustomEvent("oppai-uploads",{detail:t}))}persist(){try{const t=this.entries.map(i=>({id:i.id,sessionId:i.sessionId,name:i.name,size:i.size,mime:i.mime,destination:i.destination,state:i.state==="uploading"||i.state==="preparing"||i.state==="queued"?"paused":i.state,sentBytes:i.sentBytes,retries:i.retries,error:i.error,mediaId:i.mediaId,addedAt:i.addedAt,position:i.position}));localStorage.setItem(Zt,JSON.stringify(t))}catch{}}async restore(){if(this.restored||!oe())return;this.restored=!0;let t=[];try{t=Ss(JSON.parse(localStorage.getItem(Zt)??"[]"))}catch{t=[]}let i=[];try{i=(await g.listUploadSessions()).items??[]}catch{this.entries=t.map(o=>this.hydrate(o,!0)),this.publish();return}this.entries=Is(t,i).map(o=>this.hydrate(o,R(o.state))),this.publish()}hydrate(t,i){return{...t,bytesPerSecond:0,etaSeconds:void 0,needsFile:i&&!W(t.state)&&!this.files.has(t.id)}}add(t,i="Library"){let o=0,a=this.entries.length;for(const s of Array.from(t)){const r=ms(s),l=this.entries.find(p=>p.id===r);if(l&&R(l.state)){l.needsFile&&(this.files.set(r,s),l.needsFile=!1,l.state="queued",l.error=void 0);continue}this.files.set(r,s);const c={id:r,name:s.name,size:s.size,mime:s.type||"",destination:i,state:"queued",sentBytes:0,bytesPerSecond:0,retries:0,addedAt:Date.now(),position:a++,sessionId:l==null?void 0:l.sessionId};this.entries=this.entries.filter(p=>p.id!==r).concat(c),o++}return o&&this.publish(),this.pump(),o}pause(t){var o,a;const i=this.find(t);!i||W(i.state)||(i.state="paused",i.bytesPerSecond=0,i.etaSeconds=void 0,(o=this.meters.get(t))==null||o.reset(),(a=this.aborters.get(t))==null||a.abort(),this.publish())}resume(t){const i=this.find(t);!i||i.state!=="paused"||i.needsFile||(i.state="queued",i.error=void 0,this.publish(),this.pump())}retry(t){const i=this.find(t);i&&(i.state="queued",i.error=void 0,i.retries=0,this.publish(),this.pump())}async cancel(t){var o;const i=this.find(t);if(i&&((o=this.aborters.get(t))==null||o.abort(),i.state="cancelled",i.bytesPerSecond=0,i.etaSeconds=void 0,this.files.delete(t),this.publish(),i.sessionId))try{await g.cancelUploadSession(i.sessionId)}catch{}}remove(t){const i=this.find(t);!i||R(i.state)||(this.entries=this.entries.filter(o=>o.id!==t),this.files.delete(t),this.meters.delete(t),i.sessionId&&g.cancelUploadSession(i.sessionId).catch(()=>{}),this.publish())}clearFinished(){const t=this.entries.filter(i=>W(i.state));this.entries=this.entries.filter(i=>R(i.state));for(const i of t)this.files.delete(i.id),this.meters.delete(i.id),i.sessionId&&g.cancelUploadSession(i.sessionId).catch(()=>{});this.publish()}move(t,i){this.entries=Cs(this.entries,t,i),this.publish()}find(t){return this.entries.find(i=>i.id===t)}async pump(){if(!this.running){this.running=!0;try{for(;;){const t=ot(this.entries).find(o=>o.state==="queued"&&!o.needsFile);if(!t)return;const i=this.find(t.id);if(!i)return;await this.run(i)}}finally{this.running=!1}}}async run(t){const i=this.files.get(t.id);if(!i){t.state="paused",t.needsFile=!0,this.publish();return}const o=new AbortController;this.aborters.set(t.id,o);const a=new ys;this.meters.set(t.id,a);try{t.state="preparing",t.error=void 0,this.publish();const s=await g.createUploadSession({filename:i.name,size:i.size,mime:i.type||void 0,fingerprint:t.id,chunkSize:Es});t.sessionId=s.id,t.sentBytes=s.receivedBytes;const r=s.chunkSize,l=s.chunkCount||bs(i.size,r);let c=gs(l,s.received??[]);t.state="uploading",a.sample(t.sentBytes,Date.now()),this.publish();for(const u of c){if(le(t))return;const{start:h,end:b}=fs(u,r,i.size);if(await this.sendChunk(t,s.id,u,i.slice(h,b),o.signal),le(t))return;t.sentBytes=Math.min(i.size,t.sentBytes+(b-h)),a.sample(t.sentBytes,Date.now()),t.bytesPerSecond=a.rate(),t.etaSeconds=a.eta(i.size-t.sentBytes),this.publish()}if(le(t))return;t.state="processing",t.bytesPerSecond=0,t.etaSeconds=void 0,this.publish();const p=await g.completeUploadSession(s.id);t.state="completed",t.sentBytes=i.size,t.mediaId=p.id,this.files.delete(t.id),this.publish(),typeof window<"u"&&window.dispatchEvent(new CustomEvent("oppai-upload-complete",{detail:{id:p.id,name:i.name,deduped:p.deduped}}))}catch(s){if(le(t))return;t.state="failed",t.bytesPerSecond=0,t.etaSeconds=void 0,t.error=As(s),this.publish()}finally{this.aborters.delete(t.id)}}async sendChunk(t,i,o,a,s){for(let r=0;;r++){if(le(t))return;try{const l=new Headers({"Content-Type":"application/octet-stream"}),c=oe();c&&l.set("Authorization",`Bearer ${c}`);const p=await fetch(`/api/uploads/${i}/chunk/${o}`,{method:"PUT",headers:l,body:a,signal:s});if(p.ok){r>0&&(t.retries+=1);return}const h=(await p.json().catch(()=>({}))).error||p.statusText||`HTTP ${p.status}`;throw p.status<500?new Qt(h):new Error(h)}catch(l){if(s.aborted)return;if(l instanceof Qt||r>=Ts)throw l}t.retries+=1,this.publish(),await Ls(Os(r),s)}}}function le(e){return e.state==="paused"||e.state==="cancelled"}class Qt extends Error{}function Ls(e,t){return new Promise(i=>{const o=setTimeout(i,e);t.addEventListener("abort",()=>{clearTimeout(o),i()},{once:!0})})}function As(e){return e instanceof Error?e.name==="AbortError"?"Upload stopped":e.message||"Upload failed":"Upload failed"}const A=new _s;function xt(){var e;return((e=window.matchMedia)==null?void 0:e.call(window,"(prefers-reduced-motion: reduce)").matches)??!1}const Ps=260;function Ur(e,t="anim-exit"){return!e||xt()?Promise.resolve():new Promise(i=>{let o=!1;const a=()=>{o||(o=!0,e.removeEventListener("animationend",a),e.classList.remove(t),i())};e.addEventListener("animationend",a,{once:!0}),e.classList.add(t),setTimeout(a,Ps)})}function Ms(e){const t=document;if(xt()||typeof t.startViewTransition!="function"){e();return}t.startViewTransition(e)}function Fr(e,t="anim-arrive"){!e||xt()||(e.classList.add(t),e.addEventListener("animationend",()=>e.classList.remove(t),{once:!0}))}var Rs=Object.defineProperty,Us=Object.getOwnPropertyDescriptor,$t=(e,t,i,o)=>{for(var a=o>1?void 0:o?Us(t,i):t,s=e.length-1,r;s>=0;s--)(r=e[s])&&(a=(o?r(t,i,a):r(a))||a);return o&&a&&Rs(t,i,a),a};function de(e){window.dispatchEvent(new CustomEvent("oppai-menu",{detail:e}))}function Fs(e){const t=window.getSelection();return t&&!t.isCollapsed?!0:e.composedPath().some(i=>{const o=i;if(!(o!=null&&o.tagName))return!1;const a=o.tagName.toLowerCase();return a==="input"||a==="textarea"||a==="a"||o.isContentEditable===!0})}const z={};let we=class extends U{constructor(){super(...arguments),this.request=null,this.placed={left:0,top:0},this.onRequest=e=>{const t=e.detail.items.reduce((i,o)=>(o.label?i.push(o):i.length&&i[i.length-1].label&&i.push(z),i),[]);for(;t.length&&!t[t.length-1].label;)t.pop();t.length&&(this.request={...e.detail,items:t},this.placed={left:e.detail.x,top:e.detail.y},this.setAttribute("open",""),this.position())},this.close=()=>{this.request&&(this.request=null,this.removeAttribute("open"))},this.onKey=e=>{var a;if(!this.request)return;if(e.key==="Escape"){e.stopPropagation(),this.close();return}if(e.key!=="ArrowDown"&&e.key!=="ArrowUp")return;const t=[...this.renderRoot.querySelectorAll("button:not(:disabled)")];if(!t.length)return;e.preventDefault();const i=t.indexOf((a=this.shadowRoot)==null?void 0:a.activeElement),o=e.key==="ArrowDown"?1:-1;t[(i+o+t.length)%t.length].focus()}}connectedCallback(){super.connectedCallback(),window.addEventListener("oppai-menu",this.onRequest),window.addEventListener("resize",this.close),window.addEventListener("blur",this.close),window.addEventListener("scroll",this.close,!0),window.addEventListener("keydown",this.onKey,!0)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("oppai-menu",this.onRequest),window.removeEventListener("resize",this.close),window.removeEventListener("blur",this.close),window.removeEventListener("scroll",this.close,!0),window.removeEventListener("keydown",this.onKey,!0)}async position(){var l;await this.updateComplete;const e=this.renderRoot.querySelector(".menu"),t=this.request;if(!e||!t)return;const{width:i,height:o}=e.getBoundingClientRect(),a=8,s=t.x+i+a>window.innerWidth?Math.max(a,t.x-i):t.x,r=t.y+o+a>window.innerHeight?Math.max(a,t.y-o):t.y;this.placed={left:s,top:r},await this.updateComplete,(l=this.renderRoot.querySelector("button:not(:disabled)"))==null||l.focus({preventScroll:!0})}pick(e){var t;this.close(),(t=e.run)==null||t.call(e)}render(){const e=this.request;return e?d`
      <div class="scrim" @pointerdown=${this.close} @contextmenu=${t=>{t.preventDefault(),this.close()}}></div>
      <div class="menu" role="menu" style=${`left:${this.placed.left}px; top:${this.placed.top}px;`}>
        ${e.title?d`<div class="cap">${e.title}</div>`:m}
        ${e.items.map(t=>t.label?d`<button role="menuitem" class=${t.danger?"danger":""} ?disabled=${t.disabled}
              @click=${()=>this.pick(t)}>
              ${t.icon?d`<span class="material-symbols-rounded">${t.icon}</span>`:m}
              <span class="label">${t.label}</span>
              ${t.hint?d`<span class="hint">${t.hint}</span>`:m}
            </button>`:d`<hr />`)}
      </div>
    `:m}};we.styles=[dt,T`
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
  `];$t([f()],we.prototype,"request",2);$t([f()],we.prototype,"placed",2);we=$t([se("oppai-context-menu")],we);function Ds(e){return e.composedPath().some(t=>t instanceof HTMLElement&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"||t.isContentEditable))}const E={image:{label:"Photos",typeLabel:"PHOTO",icon:"photo_library",aspect:"4 / 3"},gif:{label:"GIFs",typeLabel:"GIF",icon:"animation",aspect:"1 / 1"},video:{label:"Videos",typeLabel:"VIDEO",icon:"movie",aspect:"16 / 9"},game:{label:"Games",typeLabel:"GAME",icon:"sports_esports",aspect:"3 / 4"},comic:{label:"Comics",typeLabel:"COMIC",icon:"auto_stories",aspect:"2 / 3"}},B=["image","gif","video","game","comic"],ei=["linear-gradient(135deg, oklch(34% 0.06 60), oklch(22% 0.05 55))","linear-gradient(135deg, oklch(33% 0.07 45), oklch(21% 0.05 40))","linear-gradient(135deg, oklch(32% 0.07 30), oklch(20% 0.05 25))","linear-gradient(135deg, oklch(34% 0.055 75), oklch(22% 0.045 70))","linear-gradient(135deg, oklch(32% 0.06 20), oklch(20% 0.05 15))"];function Ns(e){return ei[Math.abs(e.id)%ei.length]}function zs(e){return e.kind==="image"||e.kind==="gif"||!!e.hasThumb}function Bs(e){const t=Math.max(0,Math.round(e)),i=Math.floor(t/60),o=t%60;return`${i}:${String(o).padStart(2,"0")}`}function Q(e){if(!e)return"";const t=["B","KB","MB","GB","TB"];let i=e,o=0;for(;i>=1024&&o<t.length-1;)i/=1024,o++;return`${i<10&&o>0?i.toFixed(1):Math.round(i)} ${t[o]}`}function Hs(e){switch(e.kind){case"video":case"gif":return e.duration?Bs(e.duration):Q(e.size);case"image":return e.width&&e.height?`${e.width}×${e.height}`:Q(e.size);case"game":return Q(e.size);case"comic":return e.pageCount?`${e.pageCount} pages`:Q(e.size);default:return Q(e.size)}}function Ys(e){return e.tags&&e.tags.length?e.tags[0].name:E[e.kind].label.replace(/s$/,"")}const Ni="oppai_favorites";function ti(){try{const e=localStorage.getItem(Ni);return e?new Set(JSON.parse(e).filter(t=>typeof t=="number")):new Set}catch{return new Set}}function Gs(e){try{localStorage.setItem(Ni,JSON.stringify([...e]))}catch{}}function Js(e){return!e||e.kind!=="image"&&e.kind!=="gif"?!1:(e.tags??[]).some(t=>t.name==="ai-generated"||t.name==="character:libby"||t.name==="libby")}const zi="oppai_comic_fit",Bi="oppai_comic_pos";function Dr(){return localStorage.getItem(zi)==="width"?"width":"page"}function Nr(e){try{localStorage.setItem(zi,e)}catch{}}function Hi(){try{const e=localStorage.getItem(Bi);return e?JSON.parse(e):{}}catch{return{}}}function zr(e){const t=Hi()[String(e)];return typeof t=="number"&&t>=1?t:1}function Br(e,t){try{const i=Hi();i[String(e)]=t,localStorage.setItem(Bi,JSON.stringify(i))}catch{}}const Yi="oppai.recents.v1",Gi=24;function kt(){try{const e=localStorage.getItem(Yi);if(!e)return[];const t=JSON.parse(e);return Array.isArray(t)?t.filter(i=>!!i&&typeof i=="object"&&typeof i.id=="number"&&Number.isFinite(i.id)&&typeof i.at=="number"&&Number.isFinite(i.at)).sort((i,o)=>o.at-i.at).slice(0,Gi):[]}catch{return[]}}function js(e,t=Date.now()){const i=[{id:e,at:t},...kt().filter(o=>o.id!==e)].slice(0,Gi);try{localStorage.setItem(Yi,JSON.stringify(i))}catch{}return i}function qs(e,t=kt()){const i=new Map(e.map(a=>[a.id,a])),o=[];for(const a of t){const s=i.get(a.id);s&&o.push(s)}return o}var Ws=Object.defineProperty,Ks=Object.getOwnPropertyDescriptor,S=(e,t,i,o)=>{for(var a=o>1?void 0:o?Ks(t,i):t,s=e.length-1,r;s>=0;s--)(r=e[s])&&(a=(o?r(t,i,a):r(a))||a);return o&&a&&Ws(t,i,a),a};const Vs=()=>typeof crypto.randomUUID=="function"?crypto.randomUUID().replaceAll("-",""):[...crypto.getRandomValues(new Uint8Array(16))].map(e=>e.toString(16).padStart(2,"0")).join(""),ii=16,oi="oppai_libby_drawer",ai=[{id:"sweet",label:"sweet"},{id:"playful",label:"playful"},{id:"bold",label:"bold"},{id:"horny",label:"horny"}];let k=class extends U{constructor(){super(...arguments),this.items=[],this.focused=null,this.playback=null,this.externalItems=[],this.externalFocused=null,this.where="their library",this.suppressed=!1,this.open=localStorage.getItem(oi)==="1",this.characters=[],this.profile=null,this.characterID="libby",this.status=null,this.remarks=[],this.draft="",this.busy=!1,this.notice="",this.noticeError=!1,this.mode="playful",this.emotion="happy",this.intensity=X(),this.loaded=!1,this.progress=X(),this.remarkedOn=null,this.approvals=new Ga(()=>this.requestUpdate()),this.onPref=()=>this.requestUpdate()}connectedCallback(){super.connectedCallback(),window.addEventListener("oppai-libby-pref",this.onPref)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("oppai-libby-pref",this.onPref)}updated(e){if(!e.has("focused")&&!e.has("externalFocused"))return;const t=this.externalFocused??this.focused;if(!this.open||this.suppressed||et()||!t)return;const i=`${this.externalFocused?"external":"library"}:${t.id}`;if(i===this.remarkedOn)return;this.remarkedOn=i;const o=this.externalFocused?"(I have just opened the focused item from Browse. Say what you think of it.)":`(I have just opened "${t.title}". Say what you think of it.)`;this.ask("",o)}async load(){var e;if(!this.loaded){this.loaded=!0;try{const t=await g.chatWorkspace();this.profile=t.profile??null,this.characters=(t.characters??[]).filter(o=>o==null?void 0:o.id),this.characters.some(o=>o.id===this.characterID)||(this.characterID=((e=this.characters[0])==null?void 0:e.id)??"libby");const i=this.character;i!=null&&i.defaultMode&&ai.some(o=>o.id===i.defaultMode)&&(this.mode=i.defaultMode)}catch(t){this.say(t.message||"Couldn't load your characters.",!0)}try{this.status=await g.chatStatus()}catch{}this.remarks.length||this.push({role:"assistant",content:Ht({},{intensity:this.intensity}).message})}}get character(){return this.characters.find(e=>e.id===this.characterID)}toggle(){this.open=!this.open;try{localStorage.setItem(oi,this.open?"1":"0")}catch{}this.open&&this.load()}say(e,t=!1){this.notice=e,this.noticeError=t,t||window.setTimeout(()=>{this.notice===e&&(this.notice="")},4e3)}push(e){const t=e.role==="assistant"?{emotion:e.emotion??this.emotion,intensity:e.intensity??this.intensity}:{};this.remarks=[...this.remarks,{...e,...t,id:Vs(),at:Date.now()}].slice(-60),this.scrollLog()}async scrollLog(){await this.updateComplete;const e=this.renderRoot.querySelector(".log");e&&(e.scrollTop=e.scrollHeight)}viewing(){var o,a,s;const e=this.items.slice(0,ii).map(r=>r.id),t=this.externalItems.filter(r=>{var l;return r.id!==((l=this.externalFocused)==null?void 0:l.id)}).slice(0,ii).map(si),i=((o=this.focused)==null?void 0:o.kind)==="video"?(a=this.playback)==null?void 0:a.call(this):null;return{focusId:(s=this.focused)==null?void 0:s.id,ids:e,external:t,focusExternal:this.externalFocused?si(this.externalFocused):void 0,section:this.where,position:(i==null?void 0:i.position)||void 0,duration:(i==null?void 0:i.duration)||void 0,paused:(i==null?void 0:i.paused)||void 0}}async ask(e,t){var a,s,r,l,c;const i=this.character;if(!i||this.busy)return;this.busy=!0;const o=ht(this.progress,Ai(e||t||"",this.mode));try{if(!((a=this.status)!=null&&a.enabled)&&((s=this.status)!=null&&s.configured||(r=this.status)!=null&&r.modelBackend))try{this.status=await g.chatStatus()}catch{}if(!((l=this.status)!=null&&l.enabled)){const h=this.externalFocused??this.focused,b=h?this.externalFocused?this.externalFocused.tags??[]:(((c=this.focused)==null?void 0:c.tags)??[]).map(x=>x.name):[],y=e?ya(e,this.mode,this.emotion,o.intensity,!1):Ht({kind:h==null?void 0:h.kind,tags:b},{intensity:o.intensity});this.applyMood(y.emotion,o.progress,y.intensity),this.push({role:"assistant",content:y.message});return}const p=this.remarks.map(({role:h,content:b})=>({role:h,content:b}));let u="";await g.libbyTurn({conversationId:"",ephemeral:!0,characterId:i.id,mode:this.mode,emotion:this.emotion,intensity:this.intensity,history:p,cue:t||void 0,viewing:this.viewing(),outfit:i.id==="libby"&&vi()||void 0},h=>{const b=h.data??{};if(h.event==="message"){const y=b.message;if(!y||y.role!=="assistant"||y.thought)return;this.push({role:"assistant",content:Uo(y.content)?"":y.content,links:y.links,attachments:y.attachments,actions:y.actions,images:Ro(y)})}else if(h.event==="state"){const y=_(Number(b.intensity)||this.intensity);this.applyMood(Ne(String(b.emotion??this.emotion)),y,y)}else h.event==="error"&&(u=String(b.message??"She didn't answer."))}),u&&this.say(u,!0)}catch(p){this.say(p.message||"She didn't answer.",!0)}finally{this.busy=!1}}applyMood(e,t,i){this.emotion=e,this.progress=t,this.intensity=ea(i)}send(){const e=this.draft.trim();!e||this.busy||(this.draft="",this.push({role:"user",content:e}),this.ask(e))}onKey(e){e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),this.send())}render(){return et()||this.suppressed?m:this.open?this.renderPanel():this.renderHandle()}renderHandle(){var t;const e=((t=this.character)==null?void 0:t.name)??"Libby";return d`<button class="handle" title=${`Browse with ${e}`} aria-label=${`Open ${e}'s drawer`}
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
          ${ai.map(a=>d`<option value=${a.id}>${a.label}</option>`)}
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
        ${this.busy?d`<div class="thinking">${t} is looking…</div>`:m}
      </div>
      ${this.notice?d`<div class="notice ${this.noticeError?"error":""}" role=${this.noticeError?"alert":"status"}>${this.notice}</div>`:m}
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
    </aside>`}renderRemark(e,t){var s,r;const i=e.role==="user",o=i?((s=this.profile)==null?void 0:s.displayName)||"You":(t==null?void 0:t.name)||"Libby",a=new Date(e.at).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});return d`<article class="remark ${i?"from-user":""}">
      ${this.renderRemarkAvatar(e,t,o)}
      <div class="remark-body">
        <div class="remark-meta"><span class="remark-author">${o}</span><span class="remark-time">${a}</span></div>
        ${e.content?d`<span class="said">${e.content}</span>`:m}
        ${(r=e.images)==null?void 0:r.map(l=>d`<img class="remark-picture" src=${g.chatImageURL(l)} alt=${`Picture from ${o}`} loading="lazy"/>`)}
        ${Ka(e.attachments,l=>Wt(this,l),o)}
        ${qa(e.links,l=>Wt(this,l))}
        ${Ya(e.actions,this.approvals.stateOf,this.approvals.decide)}
      </div>
    </article>`}renderRemarkAvatar(e,t,i){var o;if(e.role==="user")return(o=this.profile)!=null&&o.avatarImageId?d`<span class="remark-avatar"><img src=${g.chatImageURL(this.profile.avatarImageId)} alt="" /></span>`:d`<span class="remark-avatar">${i.slice(0,2).toUpperCase()}</span>`;if((t==null?void 0:t.id)==="libby"||!t){const a=t!=null&&t.avatarImageId?g.chatImageURL(t.avatarImageId):Ho;return d`<span class="remark-avatar"><img src=${a} alt="Libby"/></span>`}return t.avatarImageId?d`<span class="remark-avatar"><img src=${g.chatImageURL(t.avatarImageId)} alt="" /></span>`:d`<span class="remark-avatar">${i.slice(0,2).toUpperCase()}</span>`}};k.styles=[dt,ct,Na,Wa,Ba,ki,T`
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
    .remark-picture { display: block; max-width: 100%; max-height: 280px; border-radius: 10px; margin-top: 6px; object-fit: contain; }
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
  `];S([O({attribute:!1})],k.prototype,"items",2);S([O({attribute:!1})],k.prototype,"focused",2);S([O({attribute:!1})],k.prototype,"playback",2);S([O({attribute:!1})],k.prototype,"externalItems",2);S([O({attribute:!1})],k.prototype,"externalFocused",2);S([O()],k.prototype,"where",2);S([O({type:Boolean})],k.prototype,"suppressed",2);S([f()],k.prototype,"open",2);S([f()],k.prototype,"characters",2);S([f()],k.prototype,"profile",2);S([f()],k.prototype,"characterID",2);S([f()],k.prototype,"status",2);S([f()],k.prototype,"remarks",2);S([f()],k.prototype,"draft",2);S([f()],k.prototype,"busy",2);S([f()],k.prototype,"notice",2);S([f()],k.prototype,"noticeError",2);S([f()],k.prototype,"mode",2);S([f()],k.prototype,"emotion",2);S([f()],k.prototype,"intensity",2);k=S([se("oppai-libby-drawer")],k);function si(e){return{title:e.title,kind:e.kind,tags:e.tags}}function Xs(e){var i;if(e==="home"||e==="search")return"their whole library";if(e==="favorites")return"their favorites";if(e==="browse")return"an outside site they are browsing";if(e==="imagegen")return"the image studio, making pictures";if(e==="studio")return"the outfit studio, dressing me up";if(e==="settings")return"the settings screen";const t=(i=E[e])==null?void 0:i.label;return t?`their ${t.toLowerCase()}`:"their library"}var Zs=Object.defineProperty,Qs=Object.getOwnPropertyDescriptor,w=(e,t,i,o)=>{for(var a=o>1?void 0:o?Qs(t,i):t,s=e.length-1,r;s>=0;s--)(r=e[s])&&(a=(o?r(t,i,a):r(a))||a);return o&&a&&Zs(t,i,a),a};const Ji={settings:()=>N(()=>import("./settings-BIK_coIF.js").then(e=>e.c),__vite__mapDeps([0,1]),import.meta.url),browse:()=>N(()=>import("./browse-DpNZ39-D.js"),__vite__mapDeps([2,3]),import.meta.url),imagegen:()=>N(()=>import("./imagegen-DQ0vvivq.js"),__vite__mapDeps([4,3]),import.meta.url),chat:()=>N(()=>import("./chat-49rs1ir7.js"),__vite__mapDeps([5,3,0,1]),import.meta.url),viewer:()=>N(()=>import("./viewer-DGZxjjVY.js"),[],import.meta.url),scrape:()=>N(()=>import("./scrape-dialog-CySSLrGD.js"),__vite__mapDeps([6,7,3]),import.meta.url),gamebrowse:()=>N(()=>import("./game-browse-JD2SgKHV.js"),[],import.meta.url)};function at(e){return e==="studio"?"imagegen":e in Ji?e:null}const We=new Map;function er(e){const t=at(e);if(!t)return Promise.resolve();const i=We.get(t);if(i)return i;const o=Ji[t],a=o().catch(s=>{throw We.delete(t),s});return We.set(t,a),a}const tr=[{id:"library",label:"Library",icon:"sports_esports"},{id:"itch",label:"itch.io",icon:"travel_explore"},{id:"f95",label:"F95zone",icon:"travel_explore"},{id:"updates",label:"Updates",icon:"update"}],ir=[{id:"home",label:"Home",icon:"home"},...B.map(e=>({id:e,label:E[e].label,icon:E[e].icon})),{id:"favorites",label:"Favorites",icon:"favorite"},{id:"collections",label:"Collections",icon:"bookmarks"},{id:"browse",label:"Browse",icon:"explore"},{id:"imagegen",label:"Create",icon:"auto_awesome"},{id:"studio",label:"Studio",icon:"checkroom"},{id:"chat",label:"Chat",icon:"chat_bubble"}];let v=class extends U{constructor(){super(...arguments),this.items=[],this.total=0,this.sort="newest",this.stats=null,this.home=null,this.viewerStartAt=0,this.safe=Xa(),this.chipTags=[],this.collections=[],this.gameFace="library",this.openCollection=null,this.recents=kt(),this.loading=!1,this.loadingMore=!1,this.viewReady=new Set,this.section="home",this.selectedId=null,this.editMediaId=0,this.search="",this.filters={},this.refine=qe,this.filtersOpen=!1,this.favorites=ti(),this.uploadOpen=!1,this.dragActive=!1,this.selectMode=!1,this.selected=new Set,this.busy=!1,this.downloads=rs(),this.browseFrame={items:[],focused:null,where:"Browse"},this.pendingUploads=[],this.viewerList=[],this.onIncognito=()=>{this.requestUpdate()},this.onContextMenu=e=>{var r;if(e.defaultPrevented||Fs(e))return;const t=e.composedPath(),i=l=>t.find(c=>{var p,u;return(u=(p=c==null?void 0:c.classList)==null?void 0:p.contains)==null?void 0:u.call(p,l)}),o=t.some(l=>{var c,p;return((p=(c=l==null?void 0:l.tagName)==null?void 0:c.toLowerCase)==null?void 0:p.call(c))==="oppai-viewer"}),a=Number((r=i("tile"))==null?void 0:r.dataset.id);let s;Number.isFinite(a)&&a>0?s=this.tileMenuItems(a,e):o&&this.selectedId!=null?s=this.tileMenuItems(this.selectedId,e,!0):s=this.shellMenuItems(),s.length&&(e.preventDefault(),de({x:e.clientX,y:e.clientY,items:s}))},this.onDownloads=e=>{this.downloads=e.detail},this.onDownloadComplete=()=>this.refresh(),this.onKey=e=>{var i;if(Ds(e))return;switch(Qa(e)){case"toggle":e.preventDefault(),this.toggleSafe();return;case"lock":e.preventDefault(),this.logout();return}if(this.selectedId==null||this.uploadOpen)return;const t=((i=this.items.find(o=>o.id===this.selectedId))==null?void 0:i.kind)==="comic";switch(e.key){case"ArrowRight":if(t)return;e.preventDefault(),this.stepItem(1);break;case"ArrowLeft":if(t)return;e.preventDefault(),this.stepItem(-1);break;case"Escape":this.closeItem();break}},this.stepItem=e=>{if(this.selectedId==null)return;const t=this.viewerList.indexOf(this.selectedId);if(t<0)return;const i=t+e;i<0||i>=this.viewerList.length||(this.selectedId=this.viewerList[i])},this.onOpenMedia=async e=>{const{id:t,at:i}=e.detail;if(this.viewerStartAt=i&&i>0?i:0,!this.items.some(o=>o.id===t))try{const o=await g.getMedia(t);this.items=[o,...this.items],this.noteServerFavorites([o])}catch{$("That one isn't in the library any more.","error");return}this.openItem(t,this.items)},this.closeItem=()=>{this.selectedId=null},this.viewerPushed=!1,this.onPopState=()=>{this.viewerPushed&&(this.viewerPushed=!1,this.selectedId!=null&&(this.selectedId=null))},this.onFiltersOutside=e=>{e.composedPath().some(t=>t instanceof HTMLElement&&t.classList.contains("filters-wrap"))||(this.filtersOpen=!1)},this.toggleSelectMode=()=>{this.selectMode=!this.selectMode,this.selectMode||(this.selected=new Set)},this.viewerPlayback=()=>{var e;return((e=this.renderRoot.querySelector("oppai-viewer"))==null?void 0:e.playback())??null},this.toggleUpload=()=>{this.uploadOpen=!this.uploadOpen,this.dragActive=!1},this.onUploadDone=e=>{const t=e.detail;this.pendingUploads.push(t==null?void 0:t.id),this.uploadSettle&&clearTimeout(this.uploadSettle),this.uploadSettle=window.setTimeout(()=>void this.announceUploads(),900)}}connectedCallback(){super.connectedCallback(),vt(this,"library"),this.migrateLocalFavorites().then(()=>this.refresh()),this.addEventListener("contextmenu",this.onContextMenu),this.detachLongPress=Ma(this),this.addEventListener(Ee,this.onOpenMedia),window.addEventListener("keydown",this.onKey),window.addEventListener("oppai-downloads",this.onDownloads),window.addEventListener("oppai-download-complete",this.onDownloadComplete),window.addEventListener("oppai-upload-complete",this.onUploadDone),window.addEventListener("oppai-incognito",this.onIncognito),window.addEventListener("popstate",this.onPopState)}disconnectedCallback(){var e,t,i,o;super.disconnectedCallback(),window.removeEventListener("popstate",this.onPopState),this.removeEventListener("contextmenu",this.onContextMenu),(e=this.detachLongPress)==null||e.call(this),this.removeEventListener(Ee,this.onOpenMedia),window.removeEventListener("keydown",this.onKey),window.removeEventListener("oppai-downloads",this.onDownloads),window.removeEventListener("oppai-download-complete",this.onDownloadComplete),window.removeEventListener("oppai-upload-complete",this.onUploadDone),window.removeEventListener("oppai-incognito",this.onIncognito),document.removeEventListener("pointerdown",this.onFiltersOutside,!0),this.uploadSettle&&clearTimeout(this.uploadSettle),this.searchDebounce&&clearTimeout(this.searchDebounce),(t=this.pageAbort)==null||t.abort(),(i=this.homeAbort)==null||i.abort(),(o=this.moreObserver)==null||o.disconnect()}updated(e){var i,o,a;(i=super.updated)==null||i.call(this,e),e.has("filtersOpen")&&(this.filtersOpen?document.addEventListener("pointerdown",this.onFiltersOutside,!0):document.removeEventListener("pointerdown",this.onFiltersOutside,!0));const t=(o=this.renderRoot)==null?void 0:o.querySelector(".more-sentinel");if(!t){(a=this.moreObserver)==null||a.disconnect(),this.moreObserver=void 0;return}this.moreObserver||(this.moreObserver=new IntersectionObserver(s=>{s.some(r=>r.isIntersecting)&&this.loadMore()},{rootMargin:"600px 0px"})),this.moreObserver.disconnect(),this.moreObserver.observe(t)}tileMenuItems(e,t,i=!1){const o=this.items.find(r=>r.id===e);if(!o)return[];const a=this.favorites.has(e),s=Ea(o);return[...i?[]:[{label:"Open",icon:"open_in_full",run:()=>this.openItem(e)}],{label:a?"Remove from favorites":"Add to favorites",icon:a?"heart_minus":"favorite",run:()=>this.toggleFavorite(e)},...i?[]:[{label:this.selectMode?"Toggle selection":"Select items",icon:"check_box",run:()=>this.selectMode?this.toggleSelected(e):this.toggleSelectMode()}],{label:"Add to collection…",icon:"playlist_add",run:()=>this.openCollectionMenu([e],t.clientX,t.clientY)},...this.openCollection?[{label:`Take off "${this.openCollection.name}"`,icon:"playlist_remove",run:()=>void this.removeFromOpenCollection(e)}]:[],z,{label:"Show Libby now",icon:"send",disabled:!s,hint:"attach to a message",run:()=>void this.share(o,{id:"libby",name:"Libby"})},{label:"Save for Libby to send later",icon:"add_photo_alternate",disabled:!s,hint:"her gallery",run:()=>void this.saveForLater(o)},{label:"Share with…",icon:"ios_share",disabled:!s,run:()=>void this.openShareMenu(o,t.clientX,t.clientY)},...o.kind==="image"||o.kind==="gif"?[{label:"Is this Libby?",icon:"face_retouching_natural",run:()=>this.openIdentityMenu(o,t.clientX,t.clientY)}]:[],...Js(o)?[{label:"Edit in the studio",icon:"brush",run:()=>this.editInStudio(o.id)}]:[],{label:"Copy title",icon:"content_copy",run:()=>void navigator.clipboard.writeText(o.title)},{label:"Open the file",icon:"open_in_new",run:()=>window.open(g.streamURL(e),"_blank")},z,{label:"Delete",icon:"delete",danger:!0,run:()=>void this.deleteOne(e)}]}openIdentityMenu(e,t,i){const o=async(a,s=!1)=>{try{await g.markLibbyIdentity({mediaId:e.id,isLibby:a,reference:s}),$(a?s?"Saved as one of the pictures of me.":"Noted — that one's me.":"Noted — that one isn't me."),this.refresh()}catch(r){$(r.message||"Couldn't save that.","error")}};de({x:t,y:i,title:`"${e.title}"`,items:[{label:"Yes, that's Libby",icon:"check",run:()=>void o(!0)},{label:"Yes — and use it as a reference",icon:"star",run:()=>void o(!0,!0)},z,{label:"No, that isn't her",icon:"close",run:()=>void o(!1)}]})}async openShareMenu(e,t,i){let o=[];try{o=(await g.chatWorkspace()).characters??[]}catch(a){$(a.message||"Couldn't load your chat characters.","error");return}if(!o.length){$("No chat characters yet — add one in Chat first.","error");return}de({x:t,y:i,title:`Share "${e.title}" with`,items:o.map(a=>({label:a.name,icon:"person",run:()=>void this.share(e,a)}))})}async share(e,t){try{await Oa(e,t.id),this.closeItem(),this.selectSection("chat")}catch(i){$(i.message||`Couldn't share with ${t.name}.`,"error")}}async saveForLater(e){$(`Saving "${e.title}" for me…`);try{const t=await _a(e,"libby");$(t.subject==="other"?`Kept it. It doesn't look like me, so it's on my "someone else" shelf — tell me otherwise under Chat › Images.`:"Kept it — I can send that one later.")}catch(t){$(t.message||"Couldn't save that for Libby.","error")}}shellMenuItems(){const e=Le()!=="light";return[{label:"Add media",icon:"add",run:()=>this.toggleUpload()},{label:"Import from a URL",icon:"link",run:()=>this.openScrape()},{label:"Refresh library",icon:"refresh",run:()=>void this.refresh()},z,{label:"Home",icon:"home",run:()=>this.selectSection("home")},{label:"Favorites",icon:"favorite",run:()=>this.selectSection("favorites")},{label:"Chat",icon:"chat_bubble",run:()=>this.selectSection("chat")},{label:"Create",icon:"auto_awesome",run:()=>this.selectSection("imagegen")},{label:"Outfit studio",icon:"checkroom",run:()=>this.selectSection("studio")},z,{label:e?"Switch to light theme":"Switch to dark theme",icon:e?"light_mode":"dark_mode",run:()=>this.flipTheme()},{label:"Settings",icon:"settings",run:()=>this.selectSection("settings")}]}flipTheme(){const e=Le()==="light"?"dark":"light";Eo(e),pt(e)}async deleteOne(e){const t=this.items.find(i=>i.id===e);if(!(!t||!confirm(`Delete "${t.title}"? This cannot be undone.`))){this.busy=!0;try{await g.deleteMedia(e),this.selectedId===e&&this.closeItem(),await this.refresh()}catch(i){$(`Couldn't delete that: ${i.message}`,"error")}finally{this.busy=!1}}}get query(){return is(this.section,this.search,this.filters[this.section],this.refine,this.sort)}queryKey(e){return[e.kind??"",e.q??"",e.tag??"",e.favorite?"fav":"",e.minRating??0,e.sort??"newest"].join("|")}async reload(){var o;const e=this.query,t=this.queryKey(e);(o=this.pageAbort)==null||o.abort();const i=new AbortController;this.pageAbort=i,this.loading=!0;try{const a=await g.listMedia({...e,limit:ee,offset:0,signal:i.signal});if(this.queryKey(this.query)!==t)return;this.items=a.items??[],this.total=a.total??this.items.length,this.noteServerFavorites(this.items)}catch(a){if(i.signal.aborted)return;$(a.message||"Couldn't load the library.","error")}finally{this.pageAbort===i&&(this.loading=!1)}}async loadMore(){if(this.loading||this.loadingMore||this.items.length>=this.total)return;const e=this.query,t=this.queryKey(e);this.loadingMore=!0;try{const i=await g.listMedia({...e,limit:ee,offset:this.items.length});if(this.queryKey(this.query)!==t)return;const o=new Set(this.items.map(a=>a.id));this.items=[...this.items,...(i.items??[]).filter(a=>!o.has(a.id))],this.total=i.total??this.total,this.noteServerFavorites(i.items??[])}catch{}finally{this.loadingMore=!1}}async loadHome(){var i;const e=new AbortController;(i=this.homeAbort)==null||i.abort(),this.homeAbort=e;const t=o=>g.listMedia({...o,limit:12,signal:e.signal}).then(a=>a.items??[]).catch(()=>[]);try{const[o,a,s,r,l,...c]=await Promise.all([g.libraryStats(e.signal).catch(()=>null),g.resumeShelf(e.signal).then(u=>u.items??[]).catch(()=>[]),t({favorite:!0}),t({}),g.recentBookmarks(12,e.signal).then(u=>u.bookmarks??[]).catch(()=>[]),...B.map(u=>t({kind:u}))]);if(e.signal.aborted)return;const p={};B.forEach((u,h)=>p[u]=c[h]??[]),this.stats=o,this.home={resume:a,favorites:s,newest:r,byKind:p,moments:l},this.noteServerFavorites([...s,...r,...a])}catch{}}async loadChips(e){try{const{items:t}=await g.topTags(e,8);this.section===e&&(this.chipTags=t??[])}catch{this.chipTags=[]}}ensureView(e){const t=at(e);!t||this.viewReady.has(t)||er(e).then(()=>{this.viewReady=new Set(this.viewReady).add(t)}).catch(()=>{$("That screen failed to load. Try again?","error")})}ready(e){const t=at(e);return!t||this.viewReady.has(t)}refresh(){this.loadHome(),this.reload(),B.includes(this.section)&&this.loadChips(this.section),this.loadCollections()}selectSection(e){e!==this.section&&(e!=="imagegen"&&(this.editMediaId=0),this.ensureView(e),Ms(()=>{this.section=e,this.selectedId=null,this.search="",this.items=[],this.total=0,this.openCollection=null,e==="home"?this.loadHome():e==="collections"?this.loadCollections():this.reload(),B.includes(e)&&this.loadChips(e)}))}editInStudio(e){this.editMediaId=e,this.selectedId=null,this.selectSection("imagegen")}openItem(e,t){if(this.ensureView("viewer"),t&&t.length?this.viewerList=t.map(i=>i.id):this.viewerList.includes(e)||(this.viewerList=[e]),!this.viewerPushed)try{history.pushState({oppaiViewer:!0},""),this.viewerPushed=!0}catch{}this.recents=js(e),this.selectedId=e}willUpdate(e){if(e.has("selectedId")&&this.selectedId==null&&this.viewerPushed){this.viewerPushed=!1;try{history.back()}catch{}}}onSearchInput(e){this.search=e.target.value,this.selectedId=null,this.searchDebounce&&clearTimeout(this.searchDebounce),this.searchDebounce=window.setTimeout(()=>void this.reload(),250)}clearSearch(){this.searchDebounce&&clearTimeout(this.searchDebounce),this.search="",this.reload()}setFilter(e,t){this.filters={...this.filters,[e]:t},this.reload()}setSort(e){e!==this.sort&&(this.sort=e,this.reload())}setRefine(e){this.refine={...this.refine,...e},this.reload()}clearRefine(){this.refine!==qe&&(this.refine=qe,this.reload())}toggleFilters(){this.filtersOpen=!this.filtersOpen}async toggleFavorite(e,t){t==null||t.stopPropagation();const i=!this.favorites.has(e);this.setLocalFavorite(e,i);try{await g.updateMedia(e,{favorite:i}),!i&&this.query.favorite&&(this.items=this.items.filter(o=>o.id!==e),this.total=Math.max(0,this.total-1)),this.stats&&(this.stats={...this.stats,favorites:Math.max(0,this.stats.favorites+(i?1:-1))})}catch(o){this.setLocalFavorite(e,!i),$(o.message||"Couldn't save that.","error")}}setLocalFavorite(e,t){const i=new Set(this.favorites);t?i.add(e):i.delete(e),this.favorites=i,this.items=this.items.map(o=>o.id===e?{...o,favorite:t}:o)}noteServerFavorites(e){if(!e.length)return;const t=new Set(this.favorites);let i=!1;for(const o of e){const a=t.has(o.id);o.favorite&&!a?(t.add(o.id),i=!0):!o.favorite&&a&&(t.delete(o.id),i=!0)}i&&(this.favorites=t)}async migrateLocalFavorites(){const e=ti();if(e.size!==0)try{await g.bulkMedia("update",[...e],{favorite:!0}),Gs(new Set)}catch{}}async loadCollections(){try{const{items:e}=await g.listCollections();this.collections=e??[]}catch{this.collections=[]}}async newCollection(e=[]){const t=prompt("Name this collection:");if(!(t==null||!t.trim()))try{const{id:i}=await g.createCollection(t.trim());e.length&&await g.addToCollection(i,e),await this.loadCollections(),$(e.length?`Made "${t.trim()}" with ${e.length} item${e.length===1?"":"s"}.`:`Made "${t.trim()}".`,"success")}catch(i){$(i.message||"Couldn't make that collection.","error")}}openCollectionMenu(e,t,i){const o=async a=>{try{const{added:s}=await g.addToCollection(a.id,e);await this.loadCollections(),$(s===0?`Already on "${a.name}".`:`Added ${s} to "${a.name}".`,"success")}catch(s){$(s.message||"Couldn't add that.","error")}};de({x:t,y:i,title:e.length===1?"Add to collection":`Add ${e.length} items to…`,items:[...this.collections.map(a=>({label:a.name,icon:"playlist_add",hint:`${a.count} item${a.count===1?"":"s"}`,run:()=>void o(a)})),...this.collections.length?[z]:[],{label:"New collection…",icon:"create_new_folder",run:()=>void this.newCollection(e)}]})}async openCollectionItems(e){this.openCollection=e,this.search="",this.section="collections",this.loading=!0;try{const t=await g.collectionItems(e.id,ee,0);this.items=t.items??[],this.total=t.total??this.items.length,this.openCollection=t.collection??e,this.noteServerFavorites(this.items)}catch(t){$(t.message||"Couldn't open that collection.","error")}finally{this.loading=!1}}async removeFromOpenCollection(e){const t=this.openCollection;if(t)try{await g.removeFromCollection(t.id,e),this.items=this.items.filter(i=>i.id!==e),this.total=Math.max(0,this.total-1),await this.loadCollections()}catch(i){$(i.message||"Couldn't take that off.","error")}}async renameOpenCollection(e){const t=prompt("Rename this collection:",e.name);if(!(t==null||!t.trim()||t.trim()===e.name))try{await g.renameCollection(e.id,t.trim()),this.openCollection={...e,name:t.trim()},await this.loadCollections()}catch(i){$(i.message||"Couldn't rename that.","error")}}async deleteCollection(e){var t;if(confirm(`Delete the collection "${e.name}"? The items stay in your library.`))try{await g.deleteCollection(e.id),((t=this.openCollection)==null?void 0:t.id)===e.id&&(this.openCollection=null,this.items=[],this.total=0),await this.loadCollections()}catch(i){$(i.message||"Couldn't delete that.","error")}}exitSelect(){this.selectMode=!1,this.selected=new Set}toggleSelected(e,t){t==null||t.stopPropagation();const i=new Set(this.selected);i.has(e)?i.delete(e):i.add(e),this.selected=i}async bulkDelete(){const e=[...this.selected];if(e.length&&confirm(`Delete ${e.length} item${e.length===1?"":"s"}? This cannot be undone.`)){this.busy=!0;try{await g.bulkMedia("delete",e);const t=Me("libraryDelete",{count:e.length});$(t.message,"success",{emotion:t.emotion,intensity:t.intensity});const i=new Set(this.favorites);e.forEach(o=>i.delete(o)),this.favorites=i,this.exitSelect(),await this.refresh()}catch(t){console.error("bulk delete",t)}finally{this.busy=!1}}}async bulkTags(e){const t=[...this.selected];if(!t.length)return;const i=prompt(e==="add"?"Add tags (comma-separated):":"Remove tags (comma-separated):");if(i==null)return;const o=i.split(",").map(a=>a.trim()).filter(Boolean);if(o.length){this.busy=!0;try{await g.bulkMedia("update",t,e==="add"?{addTags:o}:{removeTags:o}),await this.refresh()}catch(a){console.error("bulk tags",a)}finally{this.busy=!1}}}async bulkChangeKind(){const e=[...this.selected];if(!e.length)return;const t=prompt("Change type to (video, gif, image, comic, game):");if(t==null)return;const i=t.trim().toLowerCase();if(!B.includes(i)){alert(`Unknown type "${i}".`);return}this.busy=!0;try{await g.bulkMedia("update",e,{kind:i}),this.exitSelect(),await this.refresh()}catch(o){console.error("bulk kind",o)}finally{this.busy=!1}}async bulkFavorite(){const e=[...this.selected];if(e.length){e.forEach(t=>this.setLocalFavorite(t,!0));try{await g.bulkMedia("update",e,{favorite:!0}),this.stats&&(this.stats={...this.stats,favorites:this.stats.favorites+e.length})}catch(t){e.forEach(i=>this.setLocalFavorite(i,!1)),$(t.message||"Couldn't star those.","error")}this.exitSelect()}}logout(){this.dispatchEvent(new CustomEvent("logout",{bubbles:!0,composed:!0}))}toggleSafe(){var e,t;if(this.safe=!this.safe,Za(this.safe),this.safe){for(const i of this.renderRoot.querySelectorAll("video"))i.muted=!0;(t=(e=this.renderRoot.querySelector("oppai-viewer"))==null?void 0:e.renderRoot)==null||t.querySelectorAll("video").forEach(i=>i.muted=!0)}}browse(){var e;(e=this.renderRoot.querySelector("#file"))==null||e.click()}onFiles(e){const t=Array.from(e);t.length&&(this.uploadOpen=!1,A.add(t))}async announceUploads(){var i;const e=this.pendingUploads.filter(o=>typeof o=="number"&&o>0);if(this.pendingUploads=[],!e.length)return;const t=e.length===1?await g.getMedia(e[0]).catch(()=>{}):void 0;this.dispatchEvent(new CustomEvent("imported",{detail:{count:e.length,title:t==null?void 0:t.title,kind:t==null?void 0:t.kind,tags:(i=t==null?void 0:t.tags)==null?void 0:i.map(o=>o.name)},bubbles:!0,composed:!0})),this.refresh()}onFileInput(e){const t=e.target;t.files&&this.onFiles(t.files),t.value=""}onDrop(e){var t,i;e.preventDefault(),this.dragActive=!1,(i=(t=e.dataTransfer)==null?void 0:t.files)!=null&&i.length&&this.onFiles(e.dataTransfer.files)}openScrape(){var e;this.ensureView("scrape"),this.uploadOpen=!1,(e=this.renderRoot.querySelector("oppai-scrape-dialog"))==null||e.open()}itemsForKind(e){var t;return((t=this.home)==null?void 0:t.byKind[e])??[]}onScreenItems(e,t,i){var o;return e||t||i?this.items:((o=this.home)==null?void 0:o.newest)??this.items}get viewerQueue(){return this.viewerList.map(e=>this.items.find(t=>t.id===e)).filter(e=>e!=null)}render(){var L,M,I;const e=this.search.trim().length>0,t=this.selectedId!=null,i=!t&&this.section==="settings"&&!e,o=!t&&this.section==="browse"&&!e,a=!t&&this.section==="imagegen"&&!e,s=!t&&this.section==="studio"&&!e,r=this.section==="chat"&&!e,l=!t&&r,c=!t&&this.section==="favorites"&&!e,p=!t&&this.section==="collections"&&!e,u=!t&&this.section==="home"&&!e&&!c,h=!t&&e,b=!t&&!u&&!c&&!p&&!h&&!i&&!o&&!a&&!s&&!l,y=t?this.items.find(C=>C.id===this.selectedId)??null:null;let x="Library";return t?x=y?y.title:"Library":h?x="Search results":i?x="Settings":o?x="Browse sources":a?x="Create":s?x="Outfit studio":l?x="Chat with Libby":c?x="Favorites":p?x=((L=this.openCollection)==null?void 0:L.name)??"Collections":u?x="Library":x=((M=E[this.section])==null?void 0:M.label)??"Library",d`
      ${this.renderNav()}
      <div class="main-col">
        ${this.renderHeader(x,e,t,i)}
        <main class=${l||a?"flush":""}>
          ${u?this.renderHome():m}
          ${i?this.ready("settings")?d`<oppai-settings .user=${this.user}
                  @open-studio=${()=>this.selectSection("studio")}></oppai-settings>`:this.renderViewLoading():m}
          ${o?this.ready("browse")?d`<oppai-browse
                  ?can-add-sites=${!!((I=this.user)!=null&&I.isAdmin)}
                  @imported=${()=>this.refresh()}
                  @browse-frame-changed=${C=>{this.browseFrame=C.detail}}
                ></oppai-browse>`:this.renderViewLoading():m}
          ${a?this.ready("imagegen")?d`<oppai-imagegen .editMedia=${this.editMediaId} @imported=${()=>this.refresh()}
                  @open-chat=${()=>this.selectSection("chat")}></oppai-imagegen>`:this.renderViewLoading():m}
          <!-- Keyed so switching between Create and the studio rebuilds the element
               rather than reusing one whose studio setup ran (or did not run) for the
               other mode. They share a draft on purpose; they must not share an
               instance. -->
          ${s?this.ready("studio")?bi("studio",d`<oppai-imagegen studio @imported=${()=>this.refresh()}
                  @open-chat=${()=>this.selectSection("chat")}></oppai-imagegen>`):this.renderViewLoading():m}
          ${r?this.ready("chat")?d`<oppai-chat .user=${this.user} style=${t?"display:none":""}
                  @open-section=${C=>this.selectSection(C.detail.section)} @open-studio=${()=>this.selectSection("studio")}></oppai-chat>`:this.renderViewLoading():m}
          ${p?this.renderCollections():m}
          ${b||c||h?this.renderGrid(b,c,h):m}
          ${t&&y&&!this.ready("viewer")?this.renderViewLoading():m}
          ${t&&y&&this.ready("viewer")?d`<oppai-viewer
                .media=${y}
                .queue=${this.viewerQueue}
                .startAt=${this.viewerStartAt}
                .favorite=${this.favorites.has(y.id)}
                @toggle-favorite=${()=>this.toggleFavorite(y.id)}
                @navigate=${C=>this.stepItem(C.detail.dir)}
                @jump=${C=>this.selectedId=C.detail.id}
                @changed=${()=>this.refresh()}
                @deleted=${()=>{this.closeItem(),this.refresh()}}
                @edit-in-studio=${C=>this.editInStudio(C.detail.id)}
              ></oppai-viewer>`:m}
          ${t&&!y?d`<div class="empty">Item not found.</div>`:m}
        </main>
      </div>
      <!-- Libby, available from anywhere rather than only on the screen named after
           her. She is told what is on screen so she can react to it; the Chat and
           screen suppresses her, since it already is the conversation. Together is no
           longer a screen — this drawer is the only way in now, which is why it must
           stay available everywhere else. -->
      <oppai-libby-drawer
        .items=${o?[]:y?[y,...this.onScreenItems(b,c,h)]:this.onScreenItems(b,c,h)}
        .focused=${y}
        .playback=${this.viewerPlayback}
        .externalItems=${o?this.browseFrame.items:[]}
        .externalFocused=${o?this.browseFrame.focused:null}
        .where=${o?this.browseFrame.where:Xs(h?"search":this.section)}
        ?suppressed=${l}
      ></oppai-libby-drawer>
      ${this.renderUpload()}
      ${this.renderBulkBar()}
      ${this.renderDownloads()}
      ${this.ready("scrape")?d`<oppai-scrape-dialog @imported=${()=>this.refresh()}></oppai-scrape-dialog>`:m}
      <oppai-context-menu></oppai-context-menu>
      <!-- display:none, and only ever reached through the "Add media" button, but a
           control with no name is a control with no name if anything does reach it. -->
      <input id="file" type="file" multiple aria-label="Choose files to add" @change=${this.onFileInput} />
    `}renderDownloads(){return this.downloads.length===0?m:d`<aside class="download-area" aria-label="Downloads">
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
          ${e.state!=="running"?d`<button class="download-dismiss" title="Dismiss" @click=${()=>ns(e.id)}>
            <span aria-hidden="true" class="material-symbols-rounded">close</span>
          </button>`:m}
        </div>`)}
    </aside>`}renderBulkBar(){if(!this.selectMode||this.selected.size===0)return m;const e=this.selected.size;return d`
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
        <button class="logo" title=${Pe()?"Home":"OppaiLib"}
          @click=${()=>this.selectSection("home")}>
          ${as}
        </button>
        <button class="add-btn" title="Add media" @click=${this.toggleUpload}>
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:26px;">add</span>
        </button>

        <div class="nav-list">
          ${ir.map(a=>{const s=this.section===a.id&&this.selectedId==null;return d`
              <button
                class="nav-item"
                aria-current=${s?"page":m}
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
          title=${this.safe?"Safe view is on — press ` to show everything":"Safe view: veil explicit tiles (`), or ~ to lock"}
          aria-pressed=${this.safe?"true":"false"}
          @click=${()=>this.toggleSafe()}
          style="width:48px; height:48px; border-radius:24px; background:${this.safe?"var(--oppai-primary-container)":"var(--oppai-surface-2)"}; color:${this.safe?"var(--oppai-primary-bright)":"var(--oppai-text-dim)"};"
        >
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:22px;"
            >${this.safe?"visibility_off":"visibility"}</span
          >
        </button>
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
            </button>`:m}

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
              </button>`:m}
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
            </button>`:m}
        ${!i&&ts(this.section,this.search)?this.renderFilters():m}
      </header>
    `}renderFilters(){const e=Di(this.section,this.search),t=os(this.refine,e),i=(a,s,r)=>d`<button
      class="fchip ${a?"on":""}" aria-pressed=${a?"true":"false"} @click=${r}>${s}</button>`,o=[{id:"newest",label:"Newest"},{id:"oldest",label:"Oldest"},{id:"rating",label:"Top rated"},{id:"largest",label:"Largest"}];return d`<div class="filters-wrap">
      <button
        class="filters-btn header-toggle ${t?"on":""}"
        aria-haspopup="dialog"
        aria-expanded=${this.filtersOpen?"true":"false"}
        title="Filter the grid"
        @click=${this.toggleFilters}
      >
        <span aria-hidden="true" class="material-symbols-rounded" style="font-size:18px;">tune</span>
        <span style="font-size:13px; font-weight:500;">Filters</span>
        ${t?d`<span class="fbadge">${t}</span>`:m}
      </button>
      ${this.filtersOpen?d`<div class="filters-pop" role="dialog" aria-label="Filters"
            @keydown=${a=>{a.key==="Escape"&&(this.filtersOpen=!1)}}>
            ${e.kind?d`<div class="frow-label">Kind</div>
                  <div class="frow">
                    ${i(!this.refine.kind,"All",()=>this.setRefine({kind:""}))}
                    ${B.map(a=>i(this.refine.kind===a,d`<span aria-hidden="true"
                      class="material-symbols-rounded" style="font-size:16px;">${E[a].icon}</span>${E[a].label}`,()=>this.setRefine({kind:this.refine.kind===a?"":a})))}
                  </div>`:m}
            <div class="frow-label">Rating</div>
            <div class="frow">
              ${i(this.refine.minRating===0,"Any",()=>this.setRefine({minRating:0}))}
              ${[3,4,5].map(a=>i(this.refine.minRating===a,d`<span aria-hidden="true"
                class="material-symbols-rounded" style="font-size:16px;">star</span>${a===5?"5":a+"+"}`,()=>this.setRefine({minRating:this.refine.minRating===a?0:a})))}
            </div>
            ${e.favorite?d`<div class="frow-label">Only</div>
                  <div class="frow">
                    ${i(this.refine.favorite,d`<span aria-hidden="true" class="material-symbols-rounded"
                      style="font-size:16px;">favorite</span>Favourites`,()=>this.setRefine({favorite:!this.refine.favorite}))}
                  </div>`:m}
            <div class="frow-label">Sort</div>
            <div class="frow">
              ${o.map(a=>i(this.sort===a.id,a.label,()=>this.setSort(a.id)))}
            </div>
            <div class="ffoot">
              <span>${this.loading?"Loading…":`${this.total.toLocaleString()} ${this.total===1?"item":"items"}`}</span>
              <button class="flink" ?disabled=${!t} @click=${()=>this.clearRefine()}>Clear filters</button>
            </div>
          </div>`:m}
    </div>`}renderHome(){var h,b,y,x,L,M;const e=new Date().getHours(),t=e<12?"Good morning":e<18?"Good afternoon":"Good evening";if(!this.home)return d`<div class="empty">Loading your library…</div>`;if((((h=this.stats)==null?void 0:h.total)??this.home.newest.length)===0)return d`<div>
        <h2 class="greeting">${t}</h2>
        <p class="greeting-sub">Your library is empty — add media or import from a URL.</p>
        <div class="empty">
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:12px;"
            >library_add</span
          >
          <div style="font-size:14px;">Nothing here yet.</div>
        </div>
      </div>`;const i=this.home.newest,o=this.home.resume,a=qs(i,this.recents).slice(0,12),s=o.length?o:a,r=s[0]??i[0],l=this.home.favorites,c=((b=this.stats)==null?void 0:b.thisWeek)??0,p=B.map(I=>({kind:I,label:E[I].label,icon:E[I].icon,items:this.itemsForKind(I)})).filter(I=>I.items.length>0),u=(I,C,Be,St,qi,It)=>Be.length===0?m:d`
      <section class="row anim-rise" style="animation-delay:${qi}ms;">
        <div class="row-head">
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-primary-bright);">${C}</span>
          <h3 class="row-title">${I}</h3>
          ${It?d`<span class="row-sub">${It}</span>`:m}
          ${St?d`<button class="see-all" @click=${St}>
            See all<span aria-hidden="true" class="material-symbols-rounded" style="font-size:16px;">chevron_right</span>
          </button>`:m}
        </div>
        <div class="row-scroll">${Be.map(Wi=>this.renderTile(Wi,"200px",void 0,Be))}</div>
      </section>`;return d`
      <div>
        <h2 class="greeting anim-rise">${t}</h2>
        <p class="greeting-sub anim-rise" style="animation-delay:40ms;">
          ${s.length?"Pick up where you left off":"Here's what's new across your library"}
        </p>

        ${r?d`
          <section class="hero anim-rise" style="animation-delay:70ms;">
            <button class="hero-art ${this.safe&&Vt(r.tags)?"veiled":""}" @click=${()=>this.openItem(r.id,i)}
              aria-label=${`Open ${r.title}`}>
              ${r.hasThumb?d`<img src=${g.thumbURL(r.id)} alt="" loading="lazy" />`:d`<span aria-hidden="true" class="material-symbols-rounded hero-icon">${E[r.kind].icon}</span>`}
            </button>
            <div class="hero-body">
              <span class="hero-eyebrow">
                ${s.length?"Continue":"Latest addition"} · ${E[r.kind].label}
              </span>
              <h3 class="hero-title">${r.title}</h3>
              ${(y=r.tags)!=null&&y.length?d`<div class="hero-tags">${r.tags.slice(0,6).map(I=>d`<span>${I.name}</span>`)}</div>`:m}
              <div class="hero-acts">
                <button class="hero-open" @click=${()=>this.openItem(r.id,i)}>
                  <span aria-hidden="true" class="material-symbols-rounded">play_arrow</span>
                  ${s.length?"Carry on":"Open"}
                </button>
                <button class="hero-more" @click=${()=>this.selectSection(r.kind)}>
                  More ${E[r.kind].label.toLowerCase()}
                </button>
              </div>
            </div>
          </section>

          <!-- Every figure here is counted by the server (GET /api/media/stats).
               They used to be derived from the library in browser memory, which is
               why the dashboard could not draw until all of it had arrived. -->
          <div class="stats anim-rise" style="animation-delay:90ms;">
            <button class="stat" @click=${()=>this.selectSection("home")}>
              <strong>${(((x=this.stats)==null?void 0:x.total)??0).toLocaleString()}</strong><span>items</span></button>
            <button class="stat" @click=${()=>this.selectSection("favorites")}>
              <strong>${(((L=this.stats)==null?void 0:L.favorites)??0).toLocaleString()}</strong><span>favourites</span></button>
            <div class="stat">
              <strong>${Q(((M=this.stats)==null?void 0:M.bytes)??0)}</strong><span>stored</span></div>
            <div class="stat">
              <strong>${c.toLocaleString()}</strong><span>added this week</span></div>
          </div>`:m}

        ${u("Jump back in","history",s,null,120,o.length?"Where you left off, on any device":"What you've opened on this device")}
        ${u("Favourites","star",l,()=>this.selectSection("favorites"),170)}
        ${this.renderMoments(this.home.moments)}
        ${u("Recently added","new_releases",i.slice(0,12),null,220)}

        ${p.map((I,C)=>u(I.label,I.icon,I.items,()=>this.selectSection(I.kind),270+C*60))}
      </div>
    `}renderMoments(e){return e.length?d`
      <section class="row anim-rise" style="animation-delay:200ms;">
        <div class="row-head">
          <span aria-hidden="true" class="material-symbols-rounded" style="font-size:22px; color:var(--oppai-primary-bright);">bookmarks</span>
          <h3 class="row-title">Moments</h3>
          <span class="row-sub">The parts you marked · press B in a video to add one</span>
        </div>
        <div class="row-scroll">
          ${e.map(t=>d`
            <button class="moment-tile ${this.safe?"veiled":""}" title=${`${t.title??""} at ${it(t.position)}`}
              @click=${()=>{this.viewerStartAt=t.position,this.onOpenMedia(new CustomEvent(Ee,{detail:{id:t.mediaId,at:t.position}}))}}>
              <img src=${g.bookmarkThumbURL(t.id)} alt="" loading="lazy" />
              <span class="moment-caption">
                <strong>${it(t.position)}</strong>
                <span>${t.label||t.title||""}</span>
              </span>
            </button>`)}
        </div>
      </section>`:m}renderGrid(e,t,i){var u;const o=e?this.section:null,a=t?"Favorites":i?"Search results":((u=E[o])==null?void 0:u.label)??"",s=this.items,r=this.loading?"Loading…":this.total===s.length?`${this.total.toLocaleString()} ${this.total===1?"item":"items"}`:`${s.length.toLocaleString()} of ${this.total.toLocaleString()}`,l=o?this.filters[o]??"All":"All",c=o?["All",...this.chipTags.map(h=>h.name)].map(h=>({label:h,active:l===h})):[],p=o==="game"?this.renderGameFaces():m;return o==="game"&&this.gameFace!=="library"?d`
        <div>
          <div class="grid-head">
            <h2 class="grid-title">${a}</h2>
          </div>
          ${p}
          ${this.ready("gamebrowse")?d`<oppai-game-browse .site=${this.gameFace} @imported=${()=>this.refresh()}></oppai-game-browse>`:this.renderViewLoading()}
        </div>
      `:d`
      <div>
        <div class="grid-head">
          <h2 class="grid-title">${a}</h2>
          <span class="grid-count">${r}</span>
          ${this.renderSort()}
        </div>
        ${p}

        ${c.length>1?d`<div class="chips" role="group" aria-label="Filter by tag">
              ${c.map(h=>d`<button
                  class="chip"
                  aria-pressed=${h.active?"true":"false"}
                  @click=${()=>this.setFilter(this.section,h.label)}
                  style="background:${h.active?"var(--oppai-accent)":"transparent"}; color:${h.active?"var(--oppai-on-accent)":"var(--oppai-text-dim)"}; border:1px solid ${h.active?"var(--oppai-accent)":"var(--oppai-border-strong)"};"
                >
                  ${h.active?d`<span aria-hidden="true" class="material-symbols-rounded" style="font-size:16px;">check</span>`:m}
                  ${h.label}
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
                ${s.map((h,b)=>this.renderTile(h,"100%",b,s))}
              </div>
              ${this.renderMore()}`}
      </div>
    `}renderGameFaces(){return d`<div class="chips game-faces" role="tablist" aria-label="Games">
      ${tr.map(e=>d`<button
        class="chip"
        role="tab"
        aria-selected=${this.gameFace===e.id?"true":"false"}
        aria-pressed=${this.gameFace===e.id?"true":"false"}
        @click=${()=>this.pickGameFace(e.id)}
        style="background:${this.gameFace===e.id?"var(--oppai-accent)":"transparent"}; color:${this.gameFace===e.id?"var(--oppai-on-accent)":"var(--oppai-text-dim)"}; border:1px solid ${this.gameFace===e.id?"var(--oppai-accent)":"var(--oppai-border-strong)"};"
      >
        <span aria-hidden="true" class="material-symbols-rounded" style="font-size:16px;">${e.icon}</span>
        ${e.label}
      </button>`)}
    </div>`}pickGameFace(e){e!=="library"&&this.ensureView("gamebrowse"),this.gameFace=e}renderViewLoading(){return d`<div class="empty" role="status" aria-live="polite">
      <md-circular-progress indeterminate style="--md-circular-progress-size:36px"></md-circular-progress>
    </div>`}renderSort(){return d`<label class="sort">
      <span class="sort-label">Sort</span>
      <select
        aria-label="Sort order"
        @change=${t=>this.setSort(t.target.value)}
      >
        ${[{id:"newest",label:"Newest first"},{id:"oldest",label:"Oldest first"},{id:"rating",label:"Highest rated"},{id:"largest",label:"Largest first"}].map(t=>d`<option value=${t.id} ?selected=${t.id===this.sort}>${t.label}</option>`)}
      </select>
    </label>`}renderMore(){return this.items.length>=this.total?this.total>ee?d`<div class="more-end" role="status">That is everything — ${this.total.toLocaleString()} items.</div>`:m:d`<div class="more-sentinel" role="status" aria-live="polite">
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
                  @contextmenu=${i=>{i.preventDefault(),de({x:i.clientX,y:i.clientY,title:t.name,items:[{label:"Open",icon:"open_in_full",run:()=>void this.openCollectionItems(t)},{label:"Rename…",icon:"edit",run:()=>void this.renameOpenCollection(t)},z,{label:"Delete collection",icon:"delete",danger:!0,hint:"the items stay in your library",run:()=>void this.deleteCollection(t)}]})}}
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
    `}renderTile(e,t,i,o){const a=E[e.kind],s=this.favorites.has(e.id),r=Hs(e),l=i!=null?"anim-rise":"",c=i!=null?`animation-delay:${Math.min(i,12)*45}ms;`:"",p=this.selected.has(e.id),u=this.safe&&Vt(e.tags),h=`tile ${l} ${this.selectMode?"selecting":""} ${p?"selected":""} ${u?"veiled":""}`;return d`
      <div
        class=${h}
        data-id=${e.id}
        role=${i!=null?"listitem":"button"}
        tabindex="0"
        aria-label=${`${e.title}${r?`, ${r}`:""}, ${a.typeLabel}`}
        aria-pressed=${this.selectMode?p?"true":"false":m}
        @click=${()=>this.selectMode?this.toggleSelected(e.id):this.openItem(e.id,o)}
        @keydown=${b=>{b.key!=="Enter"&&b.key!==" "||(b.preventDefault(),this.selectMode?this.toggleSelected(e.id):this.openItem(e.id,o))}}
        style="flex-shrink:0; width:${t}; ${c}"
      >
        <div
          class="tile-media"
          style="width:100%; aspect-ratio:${a.aspect}; background:${Ns(e)};"
        >
          ${zs(e)?d`<img loading="lazy" src=${g.thumbURL(e.id)} alt=${e.title} />`:d`<div class="tile-overlay">
                <span aria-hidden="true" class="material-symbols-rounded" style="font-size:30px; color:#fff;"
                  >${a.icon}</span
                >
                <span class="type-label">${a.typeLabel}</span>
              </div>`}
          ${this.selectMode?d`<div class="select-check ${p?"on":""}">
                ${p?d`<span aria-hidden="true" class="material-symbols-rounded">check</span>`:m}
              </div>`:d`<button
                class="fav-btn ${s?"is-fav":""}"
                aria-label=${s?`Remove ${e.title} from favourites`:`Add ${e.title} to favourites`}
                aria-pressed=${s?"true":"false"}
                title=${s?"Remove from favourites":"Add to favourites"}
                @click=${b=>this.toggleFavorite(e.id,b)}
              >
                <span
                  aria-hidden="true" class="material-symbols-rounded fill-icon"
                  style="font-size:18px; color:${s?"var(--oppai-fav)":"rgba(255,255,255,0.9)"};"
                  >${s?"favorite":"favorite_border"}</span
                >
              </button>`}
          ${r?d`<span class="tile-stat">${r}</span>`:m}
        </div>
        <div class="tile-meta">
          <div class="tile-title">${e.title}</div>
          <div class="tile-tag">${Ys(e)}</div>
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
    `:m}};v.styles=[dt,ct,T`
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
      /* The Filters menu hangs off its button, under the header, so it never pushes
         the grid around while it is open. */
      .filters-wrap { position: relative; flex-shrink: 0; }
      .fbadge {
        min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
        background: var(--oppai-primary); color: var(--oppai-on-primary);
        font-size: 11px; font-weight: 700; display: grid; place-items: center;
      }
      .filters-pop {
        position: absolute; right: 0; top: 46px; z-index: 30;
        width: min(340px, calc(100vw - 32px));
        background: var(--oppai-surface-2); color: var(--oppai-text);
        border: 1px solid var(--oppai-border); border-radius: 16px;
        box-shadow: 0 14px 44px rgba(0, 0, 0, .38);
        padding: 12px 14px 10px;
        animation: fpop .16s var(--oppai-ease-spring, ease-out);
      }
      @keyframes fpop { from { opacity: 0; transform: translateY(-6px); } }
      @media (prefers-reduced-motion: reduce) { .filters-pop { animation: none; } }
      .frow-label {
        font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
        color: var(--oppai-text-muted); margin: 8px 0 6px;
      }
      .frow-label:first-child { margin-top: 0; }
      .frow { display: flex; flex-wrap: wrap; gap: 6px; }
      .fchip {
        height: 32px; padding: 0 12px; border-radius: 16px; font: inherit; font-size: 13px;
        display: inline-flex; align-items: center; gap: 5px; cursor: pointer;
        background: transparent; color: var(--oppai-text-dim);
        border: 1px solid var(--oppai-border-strong);
      }
      .fchip.on {
        background: var(--oppai-accent); color: var(--oppai-on-accent); border-color: var(--oppai-accent);
      }
      .ffoot {
        display: flex; align-items: center; justify-content: space-between;
        margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--oppai-border);
        font-size: 12px; color: var(--oppai-text-muted);
      }
      .flink {
        border: none; background: none; color: var(--oppai-primary-bright); font: inherit;
        font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 6px;
      }
      .flink:disabled { color: var(--oppai-text-muted); cursor: default; }
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
      /* The Games section's face strip sits tight under the title, above the tag chips. */
      .chips.game-faces {
        margin: 6px 0 14px;
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
      .moment-tile {
        position: relative;
        flex: 0 0 auto;
        width: 200px;
        padding: 0;
        border: 1px solid var(--oppai-border, rgba(255,255,255,.1));
        border-radius: 14px;
        overflow: hidden;
        background: var(--oppai-surface-2);
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .moment-tile img { display: block; width: 200px; height: 112px; object-fit: cover; background: #000; }
      .moment-tile.veiled img { filter: blur(22px) saturate(.6); }
      .moment-caption { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; }
      .moment-caption strong { font-size: 13px; }
      .moment-caption span {
        font-size: 12px; color: var(--oppai-text-muted);
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      /* The safe toggle: a rated-explicit tile is a blur until it is switched off. */
      .tile.veiled .tile-media img,
      .hero-art.veiled img {
        filter: blur(22px) saturate(.6);
        transform: scale(1.15);
      }
      .tile.veiled:hover .tile-media img { transform: scale(1.15); }
      .viewer-veil { filter: blur(30px) saturate(.5); pointer-events: none; }
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
    `];w([O({attribute:!1})],v.prototype,"user",2);w([f()],v.prototype,"items",2);w([f()],v.prototype,"total",2);w([f()],v.prototype,"sort",2);w([f()],v.prototype,"stats",2);w([f()],v.prototype,"home",2);w([f()],v.prototype,"viewerStartAt",2);w([f()],v.prototype,"safe",2);w([f()],v.prototype,"chipTags",2);w([f()],v.prototype,"collections",2);w([f()],v.prototype,"gameFace",2);w([f()],v.prototype,"openCollection",2);w([f()],v.prototype,"recents",2);w([f()],v.prototype,"loading",2);w([f()],v.prototype,"loadingMore",2);w([f()],v.prototype,"viewReady",2);w([f()],v.prototype,"section",2);w([f()],v.prototype,"selectedId",2);w([f()],v.prototype,"editMediaId",2);w([f()],v.prototype,"search",2);w([f()],v.prototype,"filters",2);w([f()],v.prototype,"refine",2);w([f()],v.prototype,"filtersOpen",2);w([f()],v.prototype,"favorites",2);w([f()],v.prototype,"uploadOpen",2);w([f()],v.prototype,"dragActive",2);w([f()],v.prototype,"selectMode",2);w([f()],v.prototype,"selected",2);w([f()],v.prototype,"busy",2);w([f()],v.prototype,"downloads",2);w([f()],v.prototype,"browseFrame",2);v=w([se("oppai-library")],v);var or=Object.defineProperty,ar=Object.getOwnPropertyDescriptor,ze=(e,t,i,o)=>{for(var a=o>1?void 0:o?ar(t,i):t,s=e.length-1,r;s>=0;s--)(r=e[s])&&(a=(o?r(t,i,a):r(a))||a);return o&&a&&or(t,i,a),a};let ae=class extends U{constructor(){super(...arguments),this.entries=[],this.open=!1,this.dismissed=!1,this.warnOnLeave=e=>{this.entries.some(t=>t.state==="uploading"||t.state==="processing")&&(e.preventDefault(),e.returnValue="")},this.toggle=()=>{this.open=!this.open,!this.open&&!this.entries.some(e=>R(e.state))&&(this.dismissed=!0)},this.close=e=>{e.stopPropagation(),this.dismissed=!0,this.open=!1}}connectedCallback(){super.connectedCallback(),vt(this,"upload manager"),this.unsubscribe=A.subscribe(e=>{e.some(t=>R(t.state))&&this.entries.every(t=>!R(t.state))&&(this.dismissed=!1,this.open=!0),this.entries=e}),A.restore(),window.addEventListener("beforeunload",this.warnOnLeave)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.unsubscribe)==null||e.call(this),window.removeEventListener("beforeunload",this.warnOnLeave)}render(){if(!this.entries.length||this.dismissed)return m;const e=this.entries.filter(a=>R(a.state)),t=this.entries.filter(a=>a.state==="failed"),i=this.entries.filter(a=>a.state==="completed"),o=e.length?`${e.length} upload${e.length===1?"":"s"} in progress`:t.length?`${t.length} upload${t.length===1?"":"s"} failed`:`${i.length} upload${i.length===1?"":"s"} finished`;return d`
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
                @click=${()=>A.clearFinished()}>
                Clear finished
              </button>
            </footer>
          </div>
        </div>
      </section>
    `}renderRow(e){const t=Math.round($s(e)*100),i=vs(e.bytesPerSecond),o=ws(e.etaSeconds);return d`
      <div class="row">
        <div class="name" title=${e.name}>${e.name}</div>
        <div class="controls">
          ${ds(e)?d`<button class="icon-btn" aria-label="Pause" @click=${()=>A.pause(e.id)}>
            <span class="material-symbols-rounded">pause</span></button>`:m}
          ${cs(e)?d`<button class="icon-btn" aria-label="Resume" @click=${()=>A.resume(e.id)}>
            <span class="material-symbols-rounded">play_arrow</span></button>`:m}
          ${ps(e)?d`<button class="icon-btn" aria-label="Retry" @click=${()=>A.retry(e.id)}>
            <span class="material-symbols-rounded">refresh</span></button>`:m}
          ${e.state==="completed"&&e.mediaId?d`<button class="icon-btn" aria-label="Open in the library" @click=${()=>this.openItem(e)}>
                <span class="material-symbols-rounded">open_in_new</span></button>`:m}
          ${e.state==="queued"||e.state==="paused"?d`
              <button class="icon-btn" aria-label="Move up" @click=${()=>A.move(e.id,-1)}>
                <span class="material-symbols-rounded">arrow_upward</span></button>
              <button class="icon-btn" aria-label="Move down" @click=${()=>A.move(e.id,1)}>
                <span class="material-symbols-rounded">arrow_downward</span></button>`:m}
          ${hs(e)?d`<button class="icon-btn" aria-label="Cancel" @click=${()=>A.cancel(e.id)}>
            <span class="material-symbols-rounded">stop_circle</span></button>`:m}
          ${us(e)?d`<button class="icon-btn" aria-label="Remove" @click=${()=>A.remove(e.id)}>
            <span class="material-symbols-rounded">close</span></button>`:m}
        </div>
        <div class="bar ${e.state==="failed"?"failed":e.state==="completed"?"done":""}">
          <span style="width:${t}%"></span>
        </div>
        <div class="meta">
          ${xs(e)}
          <span class="sep">·</span>${Te(e.sentBytes)} of ${Te(e.size)} (${t}%)
          <span class="sep">·</span>${e.destination}
          ${e.mime?d`<span class="sep">·</span>${e.mime}`:m}
          ${i?d`<span class="sep">·</span>${i}`:m}
          ${o?d`<span class="sep">·</span>${o}`:m}
          ${e.retries?d`<span class="sep">·</span>${e.retries} retr${e.retries===1?"y":"ies"}`:m}
        </div>
        ${e.needsFile?d`<div class="err">The server still has ${Te(e.sentBytes)} of this. Choose the same file again to carry on.</div>`:m}
        ${e.error?d`<div class="err">${e.error}</div>`:m}
      </div>
    `}openItem(e){e.mediaId&&this.dispatchEvent(new CustomEvent("open-media",{detail:{id:e.mediaId},bubbles:!0,composed:!0}))}};ae.styles=[ct,T`
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
  `];ze([f()],ae.prototype,"entries",2);ze([f()],ae.prototype,"open",2);ze([f()],ae.prototype,"dismissed",2);ae=ze([se("oppai-upload-manager")],ae);var sr=Object.defineProperty,rr=Object.getOwnPropertyDescriptor,D=(e,t,i,o)=>{for(var a=o>1?void 0:o?rr(t,i):t,s=e.length-1,r;s>=0;s--)(r=e[s])&&(a=(o?r(t,i,a):r(a))||a);return o&&a&&sr(t,i,a),a};const nr=6e4;let P=class extends U{constructor(){super(...arguments),this.user=null,this.ready=!1,this.mascotMessage="",this.mascotTone="success",this.mascotEmotion="",this.mascotIntensity=0,this.typed="",this.beat=0,this.onMascot=e=>{const t=e.detail;this.mascotMessage=t.message,this.mascotTone=t.tone,this.mascotEmotion=t.emotion??"",this.mascotIntensity=t.intensity??0,this.beat++,this.typeLine(t.message),this.mascotTimer&&clearTimeout(this.mascotTimer),this.mascotTimer=window.setTimeout(()=>this.mascotMessage="",5e3+zt(t.message))},this.onImported=e=>{const t=e.detail??{},i=Math.max(1,t.count??1),o=ta(i>1?2:1),a=sa({...t,count:i},{intensity:o});$(a.message,"success",{emotion:a.emotion,intensity:a.intensity})},this.onLibbyPref=()=>this.requestUpdate(),this.onLogout=()=>{this.user=null,this.stopProbe()},this.onVisible=()=>{document.visibilityState==="visible"&&this.user&&this.probe()}}connectedCallback(){super.connectedCallback(),vt(this,"app shell"),window.addEventListener("oppai-logout",this.onLogout),window.addEventListener("oppai-mascot",this.onMascot),window.addEventListener("oppai-libby-pref",this.onLibbyPref),window.addEventListener("imported",this.onImported),document.addEventListener("visibilitychange",this.onVisible),this.bootstrap()}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("oppai-logout",this.onLogout),window.removeEventListener("oppai-mascot",this.onMascot),window.removeEventListener("oppai-libby-pref",this.onLibbyPref),window.removeEventListener("imported",this.onImported),document.removeEventListener("visibilitychange",this.onVisible),this.stopProbe(),this.mascotTimer&&clearTimeout(this.mascotTimer),this.typeTimer&&cancelAnimationFrame(this.typeTimer)}typeLine(e){if(this.typeTimer&&cancelAnimationFrame(this.typeTimer),window.matchMedia("(prefers-reduced-motion: reduce)").matches){this.typed=e;return}const t=zt(e),i=performance.now();this.typed="";const o=()=>{const a=Math.min(1,(performance.now()-i)/Math.max(1,t));this.typed=e.slice(0,Math.ceil(e.length*a)),a<1?this.typeTimer=requestAnimationFrame(o):this.typeTimer=void 0};this.typeTimer=requestAnimationFrame(o)}async bootstrap(){if(oe())try{this.user=await g.me(),this.startProbe()}catch{Ae(null)}this.ready=!0}async probe(){if(oe())try{await g.me()}catch{}}startProbe(){this.stopProbe(),this.probeTimer=window.setInterval(()=>void this.probe(),nr)}stopProbe(){this.probeTimer&&(clearInterval(this.probeTimer),this.probeTimer=void 0)}onLoggedIn(e){this.mascotMessage="",this.user=e.detail,this.startProbe()}async logout(){try{await g.logout()}catch{}Ae(null),this.user=null,this.stopProbe()}renderSnackbar(){return this.mascotMessage?d`<div class="snackbar ${this.mascotTone}"
      role=${this.mascotTone==="error"?"alert":"status"}>
      <span class="material-symbols-rounded" aria-hidden="true"
        >${this.mascotTone==="error"?"error":"check_circle"}</span>
      <span>${this.mascotMessage}</span>
    </div>`:null}render(){const e=Pe()&&!this.user,t=et(),i=this.mascotEmotion?{emotion:this.mascotEmotion,intensity:this.mascotIntensity||1}:Ko(this.mascotMessage),o=Wo(i.emotion,jo(i.intensity)),a=this.typed.length>=this.mascotMessage.length,s=this.mascotTone==="error"?"libby-startle":"libby-speak",r=e?this.renderSnackbar():this.mascotMessage?d`<div class="mascot-talk libby-enter ${this.mascotTone} ${t?"plain":""}">
          <div class="speech" role=${this.mascotTone==="error"?"alert":"status"}
            aria-label=${this.mascotMessage}>
            ${t?null:d`<span class="libby-name">Libby</span>`}
            <span class="line" aria-hidden="true"
              ><span class="ghost">${this.mascotMessage}<span class="caret">▼</span></span
              ><span class="shown">${this.typed}${a?d`<span class="caret libby-caret">▼</span>`:null}</span
            ></span>
          </div>
          ${t?null:d`<span class="pixel-sprite libby-breathe">${bi(`${this.beat}-${i.emotion}-${i.intensity}`,d`<img class=${s} src=${o[0]} data-fallback-index="0"
                  alt=${`Libby feeling ${i.emotion}`}
                  @error=${l=>Vo(l.target,o)} />`)}</span>`}
        </div>`:null;return this.ready?this.user?d`<oppai-library
      .user=${this.user}
      @logout=${this.logout}
    ></oppai-library><oppai-upload-manager></oppai-upload-manager>${r}`:(N(()=>import("./login-Bf0UiZKM.js"),__vite__mapDeps([8,7,3,1]),import.meta.url),d`<oppai-login @logged-in=${this.onLoggedIn}></oppai-login>`):d`<div class="center"><md-circular-progress indeterminate></md-circular-progress></div>${r}`}};P.styles=[ki,T`
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
  `];D([f()],P.prototype,"user",2);D([f()],P.prototype,"ready",2);D([f()],P.prototype,"mascotMessage",2);D([f()],P.prototype,"mascotTone",2);D([f()],P.prototype,"mascotEmotion",2);D([f()],P.prototype,"mascotIntensity",2);D([f()],P.prototype,"typed",2);D([f()],P.prototype,"beat",2);P=D([se("oppai-app")],P);const ji=document.createElement("style");ji.textContent=Co;document.head.appendChild(ji);document.adoptedStyleSheets=[...document.adoptedStyleSheets,Io.styleSheet];pt(Le());To();export{yr as $,m as A,vi as B,kr as C,Dt as D,de as E,Ta as F,ui as G,bo as H,V as I,hi as J,Ga as K,gr as L,Fs as M,z as N,Mr as O,mr as P,Pr as Q,Fr as R,Ca as S,ea as T,Jo as U,_r as V,ht as W,Ai as X,Or as Y,ya as Z,xe as _,U as a,br as a0,fr as a1,Ro as a2,Uo as a3,vr as a4,xr as a5,Ho as a6,Cr as a7,_ as a8,Sr as a9,Tr as aA,E as aB,Ds as aC,zr as aD,Br as aE,it as aF,Bs as aG,B as aH,Ns as aI,Js as aJ,Hs as aK,wo as aL,yo as aM,fo as aN,ur as aO,Ao as aP,Ir as aa,Q as ab,wi as ac,wr as ad,Wt as ae,Ka as af,qa as ag,Ya as ah,Ha as ai,Ui as aj,Na as ak,Wa as al,Ba as am,Le as an,Dr as ao,No as ap,Lr as aq,Ar as ar,Ms as as,Er as at,Eo as au,pt as av,Nr as aw,$r as ax,Ei as ay,Qo as az,d as b,Ko as c,Pe as d,g as e,Wo as f,X as g,et as h,T as i,bi as j,Vo as k,Me as l,$ as m,Ne as n,as as o,jo as p,ct as q,ki as r,Ae as s,se as t,f as u,O as v,Ur as w,vt as x,Rr as y,dt as z};
