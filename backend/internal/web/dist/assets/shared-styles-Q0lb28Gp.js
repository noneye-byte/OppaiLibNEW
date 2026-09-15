import{a as $,b as p,i as x,_ as a,t as k,N as l,u as _,aA as S,az as ct,A as d,aB as wt,aC as ht,aD as pt,aE as C,aF as Ct,aG as I,aH as $t}from"./index-CsG9DGtL.js";import{a as Tt,e as T}from"./query-__j_ZMY6.js";/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function N(i){return(t,e)=>{const{slot:r,selector:o}=i??{},n="slot"+(r?`[name=${r}]`:":not([name])");return Tt(t,e,{get(){var f;const s=(f=this.renderRoot)==null?void 0:f.querySelector(n),h=(s==null?void 0:s.assignedElements(i))??[];return o===void 0?h:h.filter(v=>v.matches(o))}})}}/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */class At extends ${connectedCallback(){super.connectedCallback(),this.setAttribute("aria-hidden","true")}render(){return p`<span class="shadow"></span>`}}/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Et=x`:host,.shadow,.shadow::before,.shadow::after{border-radius:inherit;inset:0;position:absolute;transition-duration:inherit;transition-property:inherit;transition-timing-function:inherit}:host{display:flex;pointer-events:none;transition-property:box-shadow,opacity}.shadow::before,.shadow::after{content:"";transition-property:box-shadow,opacity;--_level: var(--md-elevation-level, 0);--_shadow-color: var(--md-elevation-shadow-color, var(--md-sys-color-shadow, #000))}.shadow::before{box-shadow:0px calc(1px*(clamp(0,var(--_level),1) + clamp(0,var(--_level) - 3,1) + 2*clamp(0,var(--_level) - 4,1))) calc(1px*(2*clamp(0,var(--_level),1) + clamp(0,var(--_level) - 2,1) + clamp(0,var(--_level) - 4,1))) 0px var(--_shadow-color);opacity:.3}.shadow::after{box-shadow:0px calc(1px*(clamp(0,var(--_level),1) + clamp(0,var(--_level) - 1,1) + 2*clamp(0,var(--_level) - 2,3))) calc(1px*(3*clamp(0,var(--_level),2) + 2*clamp(0,var(--_level) - 2,3))) calc(1px*(clamp(0,var(--_level),4) + 2*clamp(0,var(--_level) - 4,1))) var(--_shadow-color);opacity:.15}
`;/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */let H=class extends At{};H.styles=[Et];H=a([k("md-elevation")],H);/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const ut=Symbol("attachableController");let P;P=new MutationObserver(i=>{var t;for(const e of i)(t=e.target[ut])==null||t.hostConnected()});class ft{get htmlFor(){return this.host.getAttribute("for")}set htmlFor(t){t===null?this.host.removeAttribute("for"):this.host.setAttribute("for",t)}get control(){return this.host.hasAttribute("for")?!this.htmlFor||!this.host.isConnected?null:this.host.getRootNode().querySelector(`#${this.htmlFor}`):this.currentControl||this.host.parentElement}set control(t){t?this.attach(t):this.detach()}constructor(t,e){this.host=t,this.onControlChange=e,this.currentControl=null,t.addController(this),t[ut]=this,P==null||P.observe(t,{attributeFilter:["for"]})}attach(t){t!==this.currentControl&&(this.setCurrentControl(t),this.host.removeAttribute("for"))}detach(){this.setCurrentControl(null),this.host.setAttribute("for","")}hostConnected(){this.setCurrentControl(this.control)}hostDisconnected(){this.setCurrentControl(null)}setCurrentControl(t){this.onControlChange(this.currentControl,t),this.currentControl=t}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const It=["focusin","focusout","pointerdown"];class tt extends ${constructor(){super(...arguments),this.visible=!1,this.inward=!1,this.attachableController=new ft(this,this.onControlChange.bind(this))}get htmlFor(){return this.attachableController.htmlFor}set htmlFor(t){this.attachableController.htmlFor=t}get control(){return this.attachableController.control}set control(t){this.attachableController.control=t}attach(t){this.attachableController.attach(t)}detach(){this.attachableController.detach()}connectedCallback(){super.connectedCallback(),this.setAttribute("aria-hidden","true")}handleEvent(t){var e;if(!t[ot]){switch(t.type){default:return;case"focusin":this.visible=((e=this.control)==null?void 0:e.matches(":focus-visible"))??!1;break;case"focusout":case"pointerdown":this.visible=!1;break}t[ot]=!0}}onControlChange(t,e){for(const r of It)t==null||t.removeEventListener(r,this),e==null||e.addEventListener(r,this)}update(t){t.has("visible")&&this.dispatchEvent(new Event("visibility-changed")),super.update(t)}}a([l({type:Boolean,reflect:!0})],tt.prototype,"visible",void 0);a([l({type:Boolean,reflect:!0})],tt.prototype,"inward",void 0);const ot=Symbol("handledByFocusRing");/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const St=x`:host{animation-delay:0s,calc(var(--md-focus-ring-duration, 600ms)*.25);animation-duration:calc(var(--md-focus-ring-duration, 600ms)*.25),calc(var(--md-focus-ring-duration, 600ms)*.75);animation-timing-function:cubic-bezier(0.2, 0, 0, 1);box-sizing:border-box;color:var(--md-focus-ring-color, var(--md-sys-color-secondary, #625b71));display:none;pointer-events:none;position:absolute}:host([visible]){display:flex}:host(:not([inward])){animation-name:outward-grow,outward-shrink;border-end-end-radius:calc(var(--md-focus-ring-shape-end-end, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) + var(--md-focus-ring-outward-offset, 2px));border-end-start-radius:calc(var(--md-focus-ring-shape-end-start, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) + var(--md-focus-ring-outward-offset, 2px));border-start-end-radius:calc(var(--md-focus-ring-shape-start-end, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) + var(--md-focus-ring-outward-offset, 2px));border-start-start-radius:calc(var(--md-focus-ring-shape-start-start, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) + var(--md-focus-ring-outward-offset, 2px));inset:calc(-1*var(--md-focus-ring-outward-offset, 2px));outline:var(--md-focus-ring-width, 3px) solid currentColor}:host([inward]){animation-name:inward-grow,inward-shrink;border-end-end-radius:calc(var(--md-focus-ring-shape-end-end, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) - var(--md-focus-ring-inward-offset, 0px));border-end-start-radius:calc(var(--md-focus-ring-shape-end-start, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) - var(--md-focus-ring-inward-offset, 0px));border-start-end-radius:calc(var(--md-focus-ring-shape-start-end, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) - var(--md-focus-ring-inward-offset, 0px));border-start-start-radius:calc(var(--md-focus-ring-shape-start-start, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) - var(--md-focus-ring-inward-offset, 0px));border:var(--md-focus-ring-width, 3px) solid currentColor;inset:var(--md-focus-ring-inward-offset, 0px)}@keyframes outward-grow{from{outline-width:0}to{outline-width:var(--md-focus-ring-active-width, 8px)}}@keyframes outward-shrink{from{outline-width:var(--md-focus-ring-active-width, 8px)}}@keyframes inward-grow{from{border-width:0}to{border-width:var(--md-focus-ring-active-width, 8px)}}@keyframes inward-shrink{from{border-width:var(--md-focus-ring-active-width, 8px)}}@media(prefers-reduced-motion){:host{animation:none}}
`;/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */let Y=class extends tt{};Y.styles=[St];Y=a([k("md-focus-ring")],Y);/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const vt={STANDARD:"cubic-bezier(0.2, 0, 0, 1)",EMPHASIZED:"cubic-bezier(.3,0,0,1)",EMPHASIZED_ACCELERATE:"cubic-bezier(.3,0,.8,.15)"};/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const kt=450,at=225,Lt=.2,zt=10,Ot=75,Rt=.35,Dt="::after",Ft="forwards";var m;(function(i){i[i.INACTIVE=0]="INACTIVE",i[i.TOUCH_DELAY=1]="TOUCH_DELAY",i[i.HOLDING=2]="HOLDING",i[i.WAITING_FOR_CLICK=3]="WAITING_FOR_CLICK"})(m||(m={}));const Mt=["click","contextmenu","pointercancel","pointerdown","pointerenter","pointerleave","pointerup"],Pt=150,B=window.matchMedia("(forced-colors: active)");class L extends ${constructor(){super(...arguments),this.disabled=!1,this.hovered=!1,this.pressed=!1,this.rippleSize="",this.rippleScale="",this.initialSize=0,this.state=m.INACTIVE,this.attachableController=new ft(this,this.onControlChange.bind(this))}get htmlFor(){return this.attachableController.htmlFor}set htmlFor(t){this.attachableController.htmlFor=t}get control(){return this.attachableController.control}set control(t){this.attachableController.control=t}attach(t){this.attachableController.attach(t)}detach(){this.attachableController.detach()}connectedCallback(){super.connectedCallback(),this.setAttribute("aria-hidden","true")}render(){const t={hovered:this.hovered,pressed:this.pressed};return p`<div class="surface ${S(t)}"></div>`}update(t){t.has("disabled")&&this.disabled&&(this.hovered=!1,this.pressed=!1),super.update(t)}handlePointerenter(t){this.shouldReactToEvent(t)&&(this.hovered=!0)}handlePointerleave(t){this.shouldReactToEvent(t)&&(this.hovered=!1,this.state!==m.INACTIVE&&this.endPressAnimation())}handlePointerup(t){if(this.shouldReactToEvent(t)){if(this.state===m.HOLDING){this.state=m.WAITING_FOR_CLICK;return}if(this.state===m.TOUCH_DELAY){this.state=m.WAITING_FOR_CLICK,this.startPressAnimation(this.rippleStartEvent);return}}}async handlePointerdown(t){if(this.shouldReactToEvent(t)){if(this.rippleStartEvent=t,!this.isTouch(t)){this.state=m.WAITING_FOR_CLICK,this.startPressAnimation(t);return}this.state=m.TOUCH_DELAY,await new Promise(e=>{setTimeout(e,Pt)}),this.state===m.TOUCH_DELAY&&(this.state=m.HOLDING,this.startPressAnimation(t))}}handleClick(){if(!this.disabled){if(this.state===m.WAITING_FOR_CLICK){this.endPressAnimation();return}this.state===m.INACTIVE&&(this.startPressAnimation(),this.endPressAnimation())}}handlePointercancel(t){this.shouldReactToEvent(t)&&this.endPressAnimation()}handleContextmenu(){this.disabled||this.endPressAnimation()}determineRippleSize(){const{height:t,width:e}=this.getBoundingClientRect(),r=Math.max(t,e),o=Math.max(Rt*r,Ot),n=this.currentCSSZoom??1,s=Math.floor(r*Lt/n),f=Math.sqrt(e**2+t**2)+zt;this.initialSize=s;const v=(f+o)/s;this.rippleScale=`${v/n}`,this.rippleSize=`${s}px`}getNormalizedPointerEventCoords(t){const{scrollX:e,scrollY:r}=window,{left:o,top:n}=this.getBoundingClientRect(),s=e+o,h=r+n,{pageX:f,pageY:v}=t,w=this.currentCSSZoom??1;return{x:(f-s)/w,y:(v-h)/w}}getTranslationCoordinates(t){const{height:e,width:r}=this.getBoundingClientRect(),o=this.currentCSSZoom??1,n={x:(r/o-this.initialSize)/2,y:(e/o-this.initialSize)/2};let s;return t instanceof PointerEvent?s=this.getNormalizedPointerEventCoords(t):s={x:r/o/2,y:e/o/2},s={x:s.x-this.initialSize/2,y:s.y-this.initialSize/2},{startPoint:s,endPoint:n}}startPressAnimation(t){var s;if(!this.mdRoot)return;this.pressed=!0,(s=this.growAnimation)==null||s.cancel(),this.determineRippleSize();const{startPoint:e,endPoint:r}=this.getTranslationCoordinates(t),o=`${e.x}px, ${e.y}px`,n=`${r.x}px, ${r.y}px`;this.growAnimation=this.mdRoot.animate({top:[0,0],left:[0,0],height:[this.rippleSize,this.rippleSize],width:[this.rippleSize,this.rippleSize],transform:[`translate(${o}) scale(1)`,`translate(${n}) scale(${this.rippleScale})`]},{pseudoElement:Dt,duration:kt,easing:vt.STANDARD,fill:Ft})}async endPressAnimation(){this.rippleStartEvent=void 0,this.state=m.INACTIVE;const t=this.growAnimation;let e=1/0;if(typeof(t==null?void 0:t.currentTime)=="number"?e=t.currentTime:t!=null&&t.currentTime&&(e=t.currentTime.to("ms").value),e>=at){this.pressed=!1;return}await new Promise(r=>{setTimeout(r,at-e)}),this.growAnimation===t&&(this.pressed=!1)}shouldReactToEvent(t){if(this.disabled||!t.isPrimary||this.rippleStartEvent&&this.rippleStartEvent.pointerId!==t.pointerId)return!1;if(t.type==="pointerenter"||t.type==="pointerleave")return!this.isTouch(t);const e=t.buttons===1;return this.isTouch(t)||e}isTouch({pointerType:t}){return t==="touch"}async handleEvent(t){if(!(B!=null&&B.matches))switch(t.type){case"click":this.handleClick();break;case"contextmenu":this.handleContextmenu();break;case"pointercancel":this.handlePointercancel(t);break;case"pointerdown":await this.handlePointerdown(t);break;case"pointerenter":this.handlePointerenter(t);break;case"pointerleave":this.handlePointerleave(t);break;case"pointerup":this.handlePointerup(t);break}}onControlChange(t,e){for(const r of Mt)t==null||t.removeEventListener(r,this),e==null||e.addEventListener(r,this)}}a([l({type:Boolean,reflect:!0})],L.prototype,"disabled",void 0);a([_()],L.prototype,"hovered",void 0);a([_()],L.prototype,"pressed",void 0);a([T(".surface")],L.prototype,"mdRoot",void 0);/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Vt=x`:host{display:flex;margin:auto;pointer-events:none}:host([disabled]){display:none}@media(forced-colors: active){:host{display:none}}:host,.surface{border-radius:inherit;position:absolute;inset:0;overflow:hidden}.surface{-webkit-tap-highlight-color:rgba(0,0,0,0)}.surface::before,.surface::after{content:"";opacity:0;position:absolute}.surface::before{background-color:var(--md-ripple-hover-color, var(--md-sys-color-on-surface, #1d1b20));inset:0;transition:opacity 15ms linear,background-color 15ms linear}.surface::after{background:radial-gradient(closest-side, var(--md-ripple-pressed-color, var(--md-sys-color-on-surface, #1d1b20)) max(100% - 70px, 65%), transparent 100%);transform-origin:center center;transition:opacity 375ms linear}.hovered::before{background-color:var(--md-ripple-hover-color, var(--md-sys-color-on-surface, #1d1b20));opacity:var(--md-ripple-hover-opacity, 0.08)}.pressed::after{opacity:var(--md-ripple-pressed-opacity, 0.12);transition-duration:105ms}
`;/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */let W=class extends L{};W.styles=[Vt];W=a([k("md-ripple")],W);/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const g=Symbol("internals"),q=Symbol("privateInternals");function bt(i){class t extends i{get[g](){return this[q]||(this[q]=this.attachInternals()),this[q]}}return t}/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */function Nt(i){i.addInitializer(t=>{const e=t;e.addEventListener("click",async r=>{const{type:o,[g]:n}=e,{form:s}=n;if(!(!s||o==="button")&&(await new Promise(h=>{setTimeout(h)}),!r.defaultPrevented)){if(o==="reset"){s.reset();return}s.addEventListener("submit",h=>{Object.defineProperty(h,"submitter",{configurable:!0,enumerable:!0,get:()=>e})},{capture:!0,once:!0}),n.setFormValue(e.value),s.requestSubmit()}})})}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */function Bt(i){const t=new MouseEvent("click",{bubbles:!0});return i.dispatchEvent(t),t}function qt(i){return i.currentTarget!==i.target||i.composedPath()[0]!==i.target||i.target.disabled?!1:!Ut(i)}function Ut(i){const t=K;return t&&(i.preventDefault(),i.stopImmediatePropagation()),Gt(),t}let K=!1;async function Gt(){K=!0,await null,K=!1}/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Ht=ct(bt($));class b extends Ht{get name(){return this.getAttribute("name")??""}set name(t){this.setAttribute("name",t)}get form(){return this[g].form}constructor(){super(),this.disabled=!1,this.softDisabled=!1,this.href="",this.download="",this.target="",this.trailingIcon=!1,this.hasIcon=!1,this.type="submit",this.value="",this.addEventListener("click",this.handleClick.bind(this))}focus(){var t;(t=this.buttonElement)==null||t.focus()}blur(){var t;(t=this.buttonElement)==null||t.blur()}render(){var o;const t=this.disabled||this.softDisabled,e=this.href?this.renderLink():this.renderButton(),r=this.href?"link":"button";return p`
      ${(o=this.renderElevationOrOutline)==null?void 0:o.call(this)}
      <div class="background"></div>
      <md-focus-ring part="focus-ring" for=${r}></md-focus-ring>
      <md-ripple
        part="ripple"
        for=${r}
        ?disabled="${t}"></md-ripple>
      ${e}
    `}renderButton(){const{ariaLabel:t,ariaHasPopup:e,ariaExpanded:r}=this;return p`<button
      id="button"
      class="button"
      ?disabled=${this.disabled}
      aria-disabled=${this.softDisabled||d}
      aria-label="${t||d}"
      aria-haspopup="${e||d}"
      aria-expanded="${r||d}">
      ${this.renderContent()}
    </button>`}renderLink(){const{ariaLabel:t,ariaHasPopup:e,ariaExpanded:r}=this;return p`<a
      id="link"
      class="button"
      aria-label="${t||d}"
      aria-haspopup="${e||d}"
      aria-expanded="${r||d}"
      aria-disabled=${this.disabled||this.softDisabled||d}
      tabindex="${this.disabled&&!this.softDisabled?-1:d}"
      href=${this.href}
      download=${this.download||d}
      target=${this.target||d}
      >${this.renderContent()}
    </a>`}renderContent(){const t=p`<slot
      name="icon"
      @slotchange="${this.handleSlotChange}"></slot>`;return p`
      <span class="touch"></span>
      ${this.trailingIcon?d:t}
      <span class="label"><slot></slot></span>
      ${this.trailingIcon?t:d}
    `}handleClick(t){if(this.softDisabled||this.disabled&&this.href){t.stopImmediatePropagation(),t.preventDefault();return}!qt(t)||!this.buttonElement||(this.focus(),Bt(this.buttonElement))}handleSlotChange(){this.hasIcon=this.assignedIcons.length>0}}Nt(b);b.formAssociated=!0;b.shadowRootOptions={mode:"open",delegatesFocus:!0};a([l({type:Boolean,reflect:!0})],b.prototype,"disabled",void 0);a([l({type:Boolean,attribute:"soft-disabled",reflect:!0})],b.prototype,"softDisabled",void 0);a([l()],b.prototype,"href",void 0);a([l()],b.prototype,"download",void 0);a([l()],b.prototype,"target",void 0);a([l({type:Boolean,attribute:"trailing-icon",reflect:!0})],b.prototype,"trailingIcon",void 0);a([l({type:Boolean,attribute:"has-icon",reflect:!0})],b.prototype,"hasIcon",void 0);a([l()],b.prototype,"type",void 0);a([l({reflect:!0})],b.prototype,"value",void 0);a([T(".button")],b.prototype,"buttonElement",void 0);a([N({slot:"icon",flatten:!0})],b.prototype,"assignedIcons",void 0);/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */class Yt extends b{renderElevationOrOutline(){return p`<md-elevation part="elevation"></md-elevation>`}}/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Wt=x`:host{--_container-color: var(--md-filled-button-container-color, var(--md-sys-color-primary, #6750a4));--_container-elevation: var(--md-filled-button-container-elevation, 0);--_container-height: var(--md-filled-button-container-height, 40px);--_container-shadow-color: var(--md-filled-button-container-shadow-color, var(--md-sys-color-shadow, #000));--_disabled-container-color: var(--md-filled-button-disabled-container-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-container-elevation: var(--md-filled-button-disabled-container-elevation, 0);--_disabled-container-opacity: var(--md-filled-button-disabled-container-opacity, 0.12);--_disabled-label-text-color: var(--md-filled-button-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-filled-button-disabled-label-text-opacity, 0.38);--_focus-container-elevation: var(--md-filled-button-focus-container-elevation, 0);--_focus-label-text-color: var(--md-filled-button-focus-label-text-color, var(--md-sys-color-on-primary, #fff));--_hover-container-elevation: var(--md-filled-button-hover-container-elevation, 1);--_hover-label-text-color: var(--md-filled-button-hover-label-text-color, var(--md-sys-color-on-primary, #fff));--_hover-state-layer-color: var(--md-filled-button-hover-state-layer-color, var(--md-sys-color-on-primary, #fff));--_hover-state-layer-opacity: var(--md-filled-button-hover-state-layer-opacity, 0.08);--_label-text-color: var(--md-filled-button-label-text-color, var(--md-sys-color-on-primary, #fff));--_label-text-font: var(--md-filled-button-label-text-font, var(--md-sys-typescale-label-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-filled-button-label-text-line-height, var(--md-sys-typescale-label-large-line-height, 1.25rem));--_label-text-size: var(--md-filled-button-label-text-size, var(--md-sys-typescale-label-large-size, 0.875rem));--_label-text-weight: var(--md-filled-button-label-text-weight, var(--md-sys-typescale-label-large-weight, var(--md-ref-typeface-weight-medium, 500)));--_pressed-container-elevation: var(--md-filled-button-pressed-container-elevation, 0);--_pressed-label-text-color: var(--md-filled-button-pressed-label-text-color, var(--md-sys-color-on-primary, #fff));--_pressed-state-layer-color: var(--md-filled-button-pressed-state-layer-color, var(--md-sys-color-on-primary, #fff));--_pressed-state-layer-opacity: var(--md-filled-button-pressed-state-layer-opacity, 0.12);--_disabled-icon-color: var(--md-filled-button-disabled-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-icon-opacity: var(--md-filled-button-disabled-icon-opacity, 0.38);--_focus-icon-color: var(--md-filled-button-focus-icon-color, var(--md-sys-color-on-primary, #fff));--_hover-icon-color: var(--md-filled-button-hover-icon-color, var(--md-sys-color-on-primary, #fff));--_icon-color: var(--md-filled-button-icon-color, var(--md-sys-color-on-primary, #fff));--_icon-size: var(--md-filled-button-icon-size, 18px);--_pressed-icon-color: var(--md-filled-button-pressed-icon-color, var(--md-sys-color-on-primary, #fff));--_container-shape-start-start: var(--md-filled-button-container-shape-start-start, var(--md-filled-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-start-end: var(--md-filled-button-container-shape-start-end, var(--md-filled-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-end-end: var(--md-filled-button-container-shape-end-end, var(--md-filled-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-end-start: var(--md-filled-button-container-shape-end-start, var(--md-filled-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_leading-space: var(--md-filled-button-leading-space, 24px);--_trailing-space: var(--md-filled-button-trailing-space, 24px);--_with-leading-icon-leading-space: var(--md-filled-button-with-leading-icon-leading-space, 16px);--_with-leading-icon-trailing-space: var(--md-filled-button-with-leading-icon-trailing-space, 24px);--_with-trailing-icon-leading-space: var(--md-filled-button-with-trailing-icon-leading-space, 24px);--_with-trailing-icon-trailing-space: var(--md-filled-button-with-trailing-icon-trailing-space, 16px)}
`;/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Kt=x`md-elevation{transition-duration:280ms}:host(:is([disabled],[soft-disabled])) md-elevation{transition:none}md-elevation{--md-elevation-level: var(--_container-elevation);--md-elevation-shadow-color: var(--_container-shadow-color)}:host(:focus-within) md-elevation{--md-elevation-level: var(--_focus-container-elevation)}:host(:hover) md-elevation{--md-elevation-level: var(--_hover-container-elevation)}:host(:active) md-elevation{--md-elevation-level: var(--_pressed-container-elevation)}:host(:is([disabled],[soft-disabled])) md-elevation{--md-elevation-level: var(--_disabled-container-elevation)}
`;/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const mt=x`:host{border-start-start-radius:var(--_container-shape-start-start);border-start-end-radius:var(--_container-shape-start-end);border-end-start-radius:var(--_container-shape-end-start);border-end-end-radius:var(--_container-shape-end-end);box-sizing:border-box;cursor:pointer;display:inline-flex;gap:8px;min-height:var(--_container-height);outline:none;padding-block:calc((var(--_container-height) - max(var(--_label-text-line-height),var(--_icon-size)))/2);padding-inline-start:var(--_leading-space);padding-inline-end:var(--_trailing-space);place-content:center;place-items:center;position:relative;font-family:var(--_label-text-font);font-size:var(--_label-text-size);line-height:var(--_label-text-line-height);font-weight:var(--_label-text-weight);text-overflow:ellipsis;text-wrap:nowrap;user-select:none;-webkit-tap-highlight-color:rgba(0,0,0,0);vertical-align:top;--md-ripple-hover-color: var(--_hover-state-layer-color);--md-ripple-pressed-color: var(--_pressed-state-layer-color);--md-ripple-hover-opacity: var(--_hover-state-layer-opacity);--md-ripple-pressed-opacity: var(--_pressed-state-layer-opacity)}md-focus-ring{--md-focus-ring-shape-start-start: var(--_container-shape-start-start);--md-focus-ring-shape-start-end: var(--_container-shape-start-end);--md-focus-ring-shape-end-end: var(--_container-shape-end-end);--md-focus-ring-shape-end-start: var(--_container-shape-end-start)}:host(:is([disabled],[soft-disabled])){cursor:default;pointer-events:none}.button{border-radius:inherit;cursor:inherit;display:inline-flex;align-items:center;justify-content:center;border:none;outline:none;-webkit-appearance:none;vertical-align:middle;background:rgba(0,0,0,0);text-decoration:none;min-width:calc(64px - var(--_leading-space) - var(--_trailing-space));width:100%;z-index:0;height:100%;font:inherit;color:var(--_label-text-color);padding:0;gap:inherit;text-transform:inherit}.button::-moz-focus-inner{padding:0;border:0}:host(:hover) .button{color:var(--_hover-label-text-color)}:host(:focus-within) .button{color:var(--_focus-label-text-color)}:host(:active) .button{color:var(--_pressed-label-text-color)}.background{background:var(--_container-color);border-radius:inherit;inset:0;position:absolute}.label{overflow:hidden}:is(.button,.label,.label slot),.label ::slotted(*){text-overflow:inherit}:host(:is([disabled],[soft-disabled])) .label{color:var(--_disabled-label-text-color);opacity:var(--_disabled-label-text-opacity)}:host(:is([disabled],[soft-disabled])) .background{background:var(--_disabled-container-color);opacity:var(--_disabled-container-opacity)}@media(forced-colors: active){.background{border:1px solid CanvasText}:host(:is([disabled],[soft-disabled])){--_disabled-icon-color: GrayText;--_disabled-icon-opacity: 1;--_disabled-container-opacity: 1;--_disabled-label-text-color: GrayText;--_disabled-label-text-opacity: 1}}:host([has-icon]:not([trailing-icon])){padding-inline-start:var(--_with-leading-icon-leading-space);padding-inline-end:var(--_with-leading-icon-trailing-space)}:host([has-icon][trailing-icon]){padding-inline-start:var(--_with-trailing-icon-leading-space);padding-inline-end:var(--_with-trailing-icon-trailing-space)}::slotted([slot=icon]){display:inline-flex;position:relative;writing-mode:horizontal-tb;fill:currentColor;flex-shrink:0;color:var(--_icon-color);font-size:var(--_icon-size);inline-size:var(--_icon-size);block-size:var(--_icon-size)}:host(:hover) ::slotted([slot=icon]){color:var(--_hover-icon-color)}:host(:focus-within) ::slotted([slot=icon]){color:var(--_focus-icon-color)}:host(:active) ::slotted([slot=icon]){color:var(--_pressed-icon-color)}:host(:is([disabled],[soft-disabled])) ::slotted([slot=icon]){color:var(--_disabled-icon-color);opacity:var(--_disabled-icon-opacity)}.touch{position:absolute;top:50%;height:48px;left:0;right:0;transform:translateY(-50%)}:host([touch-target=wrapper]){margin:max(0px,(48px - var(--_container-height))/2) 0}:host([touch-target=none]) .touch{display:none}
`;/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */let j=class extends Yt{};j.styles=[mt,Kt,Wt];j=a([k("md-filled-button")],j);/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */class jt extends b{}/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Zt=x`:host{--_container-height: var(--md-text-button-container-height, 40px);--_disabled-label-text-color: var(--md-text-button-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-text-button-disabled-label-text-opacity, 0.38);--_focus-label-text-color: var(--md-text-button-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_hover-label-text-color: var(--md-text-button-hover-label-text-color, var(--md-sys-color-primary, #6750a4));--_hover-state-layer-color: var(--md-text-button-hover-state-layer-color, var(--md-sys-color-primary, #6750a4));--_hover-state-layer-opacity: var(--md-text-button-hover-state-layer-opacity, 0.08);--_label-text-color: var(--md-text-button-label-text-color, var(--md-sys-color-primary, #6750a4));--_label-text-font: var(--md-text-button-label-text-font, var(--md-sys-typescale-label-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-text-button-label-text-line-height, var(--md-sys-typescale-label-large-line-height, 1.25rem));--_label-text-size: var(--md-text-button-label-text-size, var(--md-sys-typescale-label-large-size, 0.875rem));--_label-text-weight: var(--md-text-button-label-text-weight, var(--md-sys-typescale-label-large-weight, var(--md-ref-typeface-weight-medium, 500)));--_pressed-label-text-color: var(--md-text-button-pressed-label-text-color, var(--md-sys-color-primary, #6750a4));--_pressed-state-layer-color: var(--md-text-button-pressed-state-layer-color, var(--md-sys-color-primary, #6750a4));--_pressed-state-layer-opacity: var(--md-text-button-pressed-state-layer-opacity, 0.12);--_disabled-icon-color: var(--md-text-button-disabled-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-icon-opacity: var(--md-text-button-disabled-icon-opacity, 0.38);--_focus-icon-color: var(--md-text-button-focus-icon-color, var(--md-sys-color-primary, #6750a4));--_hover-icon-color: var(--md-text-button-hover-icon-color, var(--md-sys-color-primary, #6750a4));--_icon-color: var(--md-text-button-icon-color, var(--md-sys-color-primary, #6750a4));--_icon-size: var(--md-text-button-icon-size, 18px);--_pressed-icon-color: var(--md-text-button-pressed-icon-color, var(--md-sys-color-primary, #6750a4));--_container-shape-start-start: var(--md-text-button-container-shape-start-start, var(--md-text-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-start-end: var(--md-text-button-container-shape-start-end, var(--md-text-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-end-end: var(--md-text-button-container-shape-end-end, var(--md-text-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-end-start: var(--md-text-button-container-shape-end-start, var(--md-text-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_leading-space: var(--md-text-button-leading-space, 12px);--_trailing-space: var(--md-text-button-trailing-space, 12px);--_with-leading-icon-leading-space: var(--md-text-button-with-leading-icon-leading-space, 12px);--_with-leading-icon-trailing-space: var(--md-text-button-with-leading-icon-trailing-space, 16px);--_with-trailing-icon-leading-space: var(--md-text-button-with-trailing-icon-leading-space, 16px);--_with-trailing-icon-trailing-space: var(--md-text-button-with-trailing-icon-trailing-space, 12px);--_container-color: none;--_disabled-container-color: none;--_disabled-container-opacity: 0}
`;/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */let Z=class extends jt{};Z.styles=[mt,Zt];Z=a([k("md-text-button")],Z);/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */class u extends ${constructor(){super(...arguments),this.disabled=!1,this.error=!1,this.focused=!1,this.label="",this.noAsterisk=!1,this.populated=!1,this.required=!1,this.resizable=!1,this.supportingText="",this.errorText="",this.count=-1,this.max=-1,this.hasStart=!1,this.hasEnd=!1,this.isAnimating=!1,this.refreshErrorAlert=!1,this.disableTransitions=!1}get counterText(){const t=this.count??-1,e=this.max??-1;return t<0||e<=0?"":`${t} / ${e}`}get supportingOrErrorText(){return this.error&&this.errorText?this.errorText:this.supportingText}reannounceError(){this.refreshErrorAlert=!0}update(t){t.has("disabled")&&t.get("disabled")!==void 0&&(this.disableTransitions=!0),this.disabled&&this.focused&&(t.set("focused",!0),this.focused=!1),this.animateLabelIfNeeded({wasFocused:t.get("focused"),wasPopulated:t.get("populated")}),super.update(t)}render(){var n,s,h,f;const t=this.renderLabel(!0),e=this.renderLabel(!1),r=(n=this.renderOutline)==null?void 0:n.call(this,t),o={disabled:this.disabled,"disable-transitions":this.disableTransitions,error:this.error&&!this.disabled,focused:this.focused,"with-start":this.hasStart,"with-end":this.hasEnd,populated:this.populated,resizable:this.resizable,required:this.required,"no-label":!this.label};return p`
      <div class="field ${S(o)}">
        <div class="container-overflow">
          ${(s=this.renderBackground)==null?void 0:s.call(this)}
          <slot name="container"></slot>
          ${(h=this.renderStateLayer)==null?void 0:h.call(this)} ${(f=this.renderIndicator)==null?void 0:f.call(this)} ${r}
          <div class="container">
            <div class="start">
              <slot name="start"></slot>
            </div>
            <div class="middle">
              <div class="label-wrapper">
                ${e} ${r?d:t}
              </div>
              <div class="content">
                <slot></slot>
              </div>
            </div>
            <div class="end">
              <slot name="end"></slot>
            </div>
          </div>
        </div>
        ${this.renderSupportingText()}
      </div>
    `}updated(t){(t.has("supportingText")||t.has("errorText")||t.has("count")||t.has("max"))&&this.updateSlottedAriaDescribedBy(),this.refreshErrorAlert&&requestAnimationFrame(()=>{this.refreshErrorAlert=!1}),this.disableTransitions&&requestAnimationFrame(()=>{this.disableTransitions=!1})}renderSupportingText(){const{supportingOrErrorText:t,counterText:e}=this;if(!t&&!e)return d;const r=p`<span>${t}</span>`,o=e?p`<span class="counter">${e}</span>`:d,s=this.error&&this.errorText&&!this.refreshErrorAlert?"alert":d;return p`
      <div class="supporting-text" role=${s}>${r}${o}</div>
      <slot
        name="aria-describedby"
        @slotchange=${this.updateSlottedAriaDescribedBy}></slot>
    `}updateSlottedAriaDescribedBy(){for(const t of this.slottedAriaDescribedBy)wt(p`${this.supportingOrErrorText} ${this.counterText}`,t),t.setAttribute("hidden","")}renderLabel(t){if(!this.label)return d;let e;t?e=this.focused||this.populated||this.isAnimating:e=!this.focused&&!this.populated&&!this.isAnimating;const r={hidden:!e,floating:t,resting:!t},o=`${this.label}${this.required&&!this.noAsterisk?"*":""}`;return p`
      <span class="label ${S(r)}" aria-hidden=${!e}
        >${o}</span
      >
    `}animateLabelIfNeeded({wasFocused:t,wasPopulated:e}){var n,s,h;if(!this.label)return;t??(t=this.focused),e??(e=this.populated);const r=t||e,o=this.focused||this.populated;r!==o&&(this.isAnimating=!0,(n=this.labelAnimation)==null||n.cancel(),this.labelAnimation=(s=this.floatingLabelEl)==null?void 0:s.animate(this.getLabelKeyframes(),{duration:150,easing:vt.STANDARD}),(h=this.labelAnimation)==null||h.addEventListener("finish",()=>{this.isAnimating=!1}))}getLabelKeyframes(){const{floatingLabelEl:t,restingLabelEl:e}=this;if(!t||!e)return[];const{x:r,y:o,height:n}=t.getBoundingClientRect(),{x:s,y:h,height:f}=e.getBoundingClientRect(),v=t.scrollWidth,w=e.scrollWidth,A=w/v,xt=s-r,_t=h-o+Math.round((f-n*A)/2),et=`translateX(${xt}px) translateY(${_t}px) scale(${A})`,rt="translateX(0) translateY(0) scale(1)",it=e.clientWidth,z=w>it?`${it/A}px`:"";return this.focused||this.populated?[{transform:et,width:z},{transform:rt,width:z}]:[{transform:rt,width:z},{transform:et,width:z}]}getSurfacePositionClientRect(){return this.containerEl.getBoundingClientRect()}}a([l({type:Boolean})],u.prototype,"disabled",void 0);a([l({type:Boolean})],u.prototype,"error",void 0);a([l({type:Boolean})],u.prototype,"focused",void 0);a([l()],u.prototype,"label",void 0);a([l({type:Boolean,attribute:"no-asterisk"})],u.prototype,"noAsterisk",void 0);a([l({type:Boolean})],u.prototype,"populated",void 0);a([l({type:Boolean})],u.prototype,"required",void 0);a([l({type:Boolean})],u.prototype,"resizable",void 0);a([l({attribute:"supporting-text"})],u.prototype,"supportingText",void 0);a([l({attribute:"error-text"})],u.prototype,"errorText",void 0);a([l({type:Number})],u.prototype,"count",void 0);a([l({type:Number})],u.prototype,"max",void 0);a([l({type:Boolean,attribute:"has-start"})],u.prototype,"hasStart",void 0);a([l({type:Boolean,attribute:"has-end"})],u.prototype,"hasEnd",void 0);a([N({slot:"aria-describedby"})],u.prototype,"slottedAriaDescribedBy",void 0);a([_()],u.prototype,"isAnimating",void 0);a([_()],u.prototype,"refreshErrorAlert",void 0);a([_()],u.prototype,"disableTransitions",void 0);a([T(".label.floating")],u.prototype,"floatingLabelEl",void 0);a([T(".label.resting")],u.prototype,"restingLabelEl",void 0);a([T(".container")],u.prototype,"containerEl",void 0);/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const xe=x`:host{display:inline-flex;resize:both}.field{display:flex;flex:1;flex-direction:column;writing-mode:horizontal-tb;max-width:100%}.container-overflow{border-start-start-radius:var(--_container-shape-start-start);border-start-end-radius:var(--_container-shape-start-end);border-end-end-radius:var(--_container-shape-end-end);border-end-start-radius:var(--_container-shape-end-start);display:flex;height:100%;position:relative}.container{align-items:center;border-radius:inherit;display:flex;flex:1;max-height:100%;min-height:100%;min-width:min-content;position:relative}.field,.container-overflow{resize:inherit}.resizable:not(.disabled) .container{resize:inherit;overflow:hidden}.disabled{pointer-events:none}slot[name=container]{border-radius:inherit}slot[name=container]::slotted(*){border-radius:inherit;inset:0;pointer-events:none;position:absolute}@layer styles{.start,.middle,.end{display:flex;box-sizing:border-box;height:100%;position:relative}.start{color:var(--_leading-content-color)}.end{color:var(--_trailing-content-color)}.start,.end{align-items:center;justify-content:center}.with-start .start{margin-inline:var(--_with-leading-content-leading-space) var(--_content-space)}.with-end .end{margin-inline:var(--_content-space) var(--_with-trailing-content-trailing-space)}.middle{align-items:stretch;align-self:baseline;flex:1}.content{color:var(--_content-color);display:flex;flex:1;opacity:0;transition:opacity 83ms cubic-bezier(0.2, 0, 0, 1)}.no-label .content,.focused .content,.populated .content{opacity:1;transition-delay:67ms}:is(.disabled,.disable-transitions) .content{transition:none}.content ::slotted(*){all:unset;color:currentColor;font-family:var(--_content-font);font-size:var(--_content-size);line-height:var(--_content-line-height);font-weight:var(--_content-weight);width:100%;overflow-wrap:revert;white-space:revert}.content ::slotted(:not(textarea)){padding-top:var(--_top-space);padding-bottom:var(--_bottom-space)}.content ::slotted(textarea){margin-top:var(--_top-space);margin-bottom:var(--_bottom-space)}:hover .content{color:var(--_hover-content-color)}:hover .start{color:var(--_hover-leading-content-color)}:hover .end{color:var(--_hover-trailing-content-color)}.focused .content{color:var(--_focus-content-color)}.focused .start{color:var(--_focus-leading-content-color)}.focused .end{color:var(--_focus-trailing-content-color)}.disabled .content{color:var(--_disabled-content-color)}.disabled.no-label .content,.disabled.focused .content,.disabled.populated .content{opacity:var(--_disabled-content-opacity)}.disabled .start{color:var(--_disabled-leading-content-color);opacity:var(--_disabled-leading-content-opacity)}.disabled .end{color:var(--_disabled-trailing-content-color);opacity:var(--_disabled-trailing-content-opacity)}.error .content{color:var(--_error-content-color)}.error .start{color:var(--_error-leading-content-color)}.error .end{color:var(--_error-trailing-content-color)}.error:hover .content{color:var(--_error-hover-content-color)}.error:hover .start{color:var(--_error-hover-leading-content-color)}.error:hover .end{color:var(--_error-hover-trailing-content-color)}.error.focused .content{color:var(--_error-focus-content-color)}.error.focused .start{color:var(--_error-focus-leading-content-color)}.error.focused .end{color:var(--_error-focus-trailing-content-color)}}@layer hcm{@media(forced-colors: active){.disabled :is(.start,.content,.end){color:GrayText;opacity:1}}}@layer styles{.label{box-sizing:border-box;color:var(--_label-text-color);overflow:hidden;max-width:100%;text-overflow:ellipsis;white-space:nowrap;z-index:1;font-family:var(--_label-text-font);font-size:var(--_label-text-size);line-height:var(--_label-text-line-height);font-weight:var(--_label-text-weight);width:min-content}.label-wrapper{inset:0;pointer-events:none;position:absolute}.label.resting{position:absolute;top:var(--_top-space)}.label.floating{font-size:var(--_label-text-populated-size);line-height:var(--_label-text-populated-line-height);transform-origin:top left}.label.hidden{opacity:0}.no-label .label{display:none}.label-wrapper{inset:0;position:absolute;text-align:initial}:hover .label{color:var(--_hover-label-text-color)}.focused .label{color:var(--_focus-label-text-color)}.disabled .label{color:var(--_disabled-label-text-color)}.disabled .label:not(.hidden){opacity:var(--_disabled-label-text-opacity)}.error .label{color:var(--_error-label-text-color)}.error:hover .label{color:var(--_error-hover-label-text-color)}.error.focused .label{color:var(--_error-focus-label-text-color)}}@layer hcm{@media(forced-colors: active){.disabled .label:not(.hidden){color:GrayText;opacity:1}}}@layer styles{.supporting-text{color:var(--_supporting-text-color);display:flex;font-family:var(--_supporting-text-font);font-size:var(--_supporting-text-size);line-height:var(--_supporting-text-line-height);font-weight:var(--_supporting-text-weight);gap:16px;justify-content:space-between;padding-inline-start:var(--_supporting-text-leading-space);padding-inline-end:var(--_supporting-text-trailing-space);padding-top:var(--_supporting-text-top-space)}.supporting-text :nth-child(2){flex-shrink:0}:hover .supporting-text{color:var(--_hover-supporting-text-color)}.focus .supporting-text{color:var(--_focus-supporting-text-color)}.disabled .supporting-text{color:var(--_disabled-supporting-text-color);opacity:var(--_disabled-supporting-text-opacity)}.error .supporting-text{color:var(--_error-supporting-text-color)}.error:hover .supporting-text{color:var(--_error-hover-supporting-text-color)}.error.focus .supporting-text{color:var(--_error-focus-supporting-text-color)}}@layer hcm{@media(forced-colors: active){.disabled .supporting-text{color:GrayText;opacity:1}}}
`;/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const gt=Symbol.for(""),Xt=i=>{if((i==null?void 0:i.r)===gt)return i==null?void 0:i._$litStatic$},_e=(i,...t)=>({_$litStatic$:t.reduce((e,r,o)=>e+(n=>{if(n._$litStatic$!==void 0)return n._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${n}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`)})(r)+i[o+1],i[0]),r:gt}),st=new Map,Jt=i=>(t,...e)=>{const r=e.length;let o,n;const s=[],h=[];let f,v=0,w=!1;for(;v<r;){for(f=t[v];v<r&&(n=e[v],(o=Xt(n))!==void 0);)f+=o+t[++v],w=!0;v!==r&&h.push(n),s.push(f),v++}if(v===r&&s.push(t[r]),w){const A=s.join("$$lit$$");(t=st.get(A))===void 0&&(s.raw=s,st.set(A,t=s)),e=h}return i(t,...e)},Qt=Jt(p);/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const nt=ht(class extends pt{constructor(i){if(super(i),i.type!==C.PROPERTY&&i.type!==C.ATTRIBUTE&&i.type!==C.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!Ct(i))throw Error("`live` bindings can only contain a single expression")}render(i){return i}update(i,[t]){if(t===I||t===d)return t;const e=i.element,r=i.name;if(i.type===C.PROPERTY){if(t===e[r])return I}else if(i.type===C.BOOLEAN_ATTRIBUTE){if(!!t===e.hasAttribute(r))return I}else if(i.type===C.ATTRIBUTE&&e.getAttribute(r)===t+"")return I;return $t(i),t}});/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const yt="important",te=" !"+yt,lt=ht(class extends pt{constructor(i){var t;if(super(i),i.type!==C.ATTRIBUTE||i.name!=="style"||((t=i.strings)==null?void 0:t.length)>2)throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.")}render(i){return Object.keys(i).reduce((t,e)=>{const r=i[e];return r==null?t:t+`${e=e.includes("-")?e:e.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g,"-$&").toLowerCase()}:${r};`},"")}update(i,[t]){const{style:e}=i.element;if(this.ft===void 0)return this.ft=new Set(Object.keys(t)),this.render(t);for(const r of this.ft)t[r]==null&&(this.ft.delete(r),r.includes("-")?e.removeProperty(r):e[r]=null);for(const r in t){const o=t[r];if(o!=null){this.ft.add(r);const n=typeof o=="string"&&o.endsWith(te);r.includes("-")||n?e.setProperty(r,n?o.slice(0,-11):o,n?yt:""):e[r]=o}}return I}});/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const ee={fromAttribute(i){return i??""},toAttribute(i){return i||null}};/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */function re(i,t){t.bubbles&&(!i.shadowRoot||t.composed)&&t.stopPropagation();const e=Reflect.construct(t.constructor,[t.type,t]),r=i.dispatchEvent(e);return r||t.preventDefault(),r}/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const X=Symbol("createValidator"),J=Symbol("getValidityAnchor"),U=Symbol("privateValidator"),y=Symbol("privateSyncValidity"),O=Symbol("privateCustomValidationMessage");function ie(i){var t;class e extends i{constructor(){super(...arguments),this[t]=""}get validity(){return this[y](),this[g].validity}get validationMessage(){return this[y](),this[g].validationMessage}get willValidate(){return this[y](),this[g].willValidate}checkValidity(){return this[y](),this[g].checkValidity()}reportValidity(){return this[y](),this[g].reportValidity()}setCustomValidity(o){this[O]=o,this[y]()}requestUpdate(o,n,s){super.requestUpdate(o,n,s),this[y]()}firstUpdated(o){super.firstUpdated(o),this[y]()}[(t=O,y)](){this[U]||(this[U]=this[X]());const{validity:o,validationMessage:n}=this[U].getValidity(),s=!!this[O],h=this[O]||n;this[g].setValidity({...o,customError:s},h,this[J]()??void 0)}[X](){throw new Error("Implement [createValidator]")}[J](){throw new Error("Implement [getValidityAnchor]")}}return e}/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const V=Symbol("getFormValue"),dt=Symbol("getFormState");function oe(i){class t extends i{get form(){return this[g].form}get labels(){return this[g].labels}get name(){return this.getAttribute("name")??""}set name(r){this.setAttribute("name",r)}get disabled(){return this.hasAttribute("disabled")}set disabled(r){this.toggleAttribute("disabled",r)}attributeChangedCallback(r,o,n){if(r==="name"||r==="disabled"){const s=r==="disabled"?o!==null:o;this.requestUpdate(r,s);return}super.attributeChangedCallback(r,o,n)}requestUpdate(r,o,n){super.requestUpdate(r,o,n),this[g].setFormValue(this[V](),this[dt]())}[V](){throw new Error("Implement [getFormValue]")}[dt](){return this[V]()}formDisabledCallback(r){this.disabled=r}}return t.formAssociated=!0,a([l({noAccessor:!0})],t.prototype,"name",null),a([l({type:Boolean,noAccessor:!0})],t.prototype,"disabled",null),t}/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Q=Symbol("onReportValidity"),R=Symbol("privateCleanupFormListeners"),D=Symbol("privateDoNotReportInvalid"),F=Symbol("privateIsSelfReportingValidity"),M=Symbol("privateCallOnReportValidity");function ae(i){var t,e,r;class o extends i{constructor(...s){super(...s),this[t]=new AbortController,this[e]=!1,this[r]=!1,this.addEventListener("invalid",h=>{this[D]||!h.isTrusted||this.addEventListener("invalid",()=>{this[M](h)},{once:!0})},{capture:!0})}checkValidity(){this[D]=!0;const s=super.checkValidity();return this[D]=!1,s}reportValidity(){this[F]=!0;const s=super.reportValidity();return s&&this[M](null),this[F]=!1,s}[(t=R,e=D,r=F,M)](s){const h=s==null?void 0:s.defaultPrevented;h||(this[Q](s),!(!h&&(s==null?void 0:s.defaultPrevented)))||(this[F]||le(this[g].form,this))&&this.focus()}[Q](s){throw new Error("Implement [onReportValidity]")}formAssociatedCallback(s){super.formAssociatedCallback&&super.formAssociatedCallback(s),this[R].abort(),s&&(this[R]=new AbortController,se(this,s,()=>{this[M](null)},this[R].signal))}}return o}function se(i,t,e,r){const o=ne(t);let n=!1,s,h=!1;o.addEventListener("before",()=>{h=!0,s=new AbortController,n=!1,i.addEventListener("invalid",()=>{n=!0},{signal:s.signal})},{signal:r}),o.addEventListener("after",()=>{h=!1,s==null||s.abort(),!n&&e()},{signal:r}),t.addEventListener("submit",()=>{h||e()},{signal:r})}const G=new WeakMap;function ne(i){if(!G.has(i)){const t=new EventTarget;G.set(i,t);for(const e of["reportValidity","requestSubmit"]){const r=i[e];i[e]=function(){t.dispatchEvent(new Event("before"));const o=Reflect.apply(r,this,arguments);return t.dispatchEvent(new Event("after")),o}}}return G.get(i)}function le(i,t){if(!i)return!0;let e;for(const r of i.elements)if(r.matches(":invalid")){e=r;break}return e===t}/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */class de{constructor(t){this.getCurrentState=t,this.currentValidity={validity:{},validationMessage:""}}getValidity(){const t=this.getCurrentState();if(!(!this.prevState||!this.equals(this.prevState,t)))return this.currentValidity;const{validity:r,validationMessage:o}=this.computeValidity(t);return this.prevState=this.copy(t),this.currentValidity={validationMessage:o,validity:{badInput:r.badInput,customError:r.customError,patternMismatch:r.patternMismatch,rangeOverflow:r.rangeOverflow,rangeUnderflow:r.rangeUnderflow,stepMismatch:r.stepMismatch,tooLong:r.tooLong,tooShort:r.tooShort,typeMismatch:r.typeMismatch,valueMissing:r.valueMissing}},this.currentValidity}}/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */class ce extends de{computeValidity({state:t,renderedControl:e}){let r=e;E(t)&&!r?(r=this.inputControl||document.createElement("input"),this.inputControl=r):r||(r=this.textAreaControl||document.createElement("textarea"),this.textAreaControl=r);const o=E(t)?r:null;if(o&&(o.type=t.type),r.value!==t.value&&(r.value=t.value),r.required=t.required,o){const n=t;n.pattern?o.pattern=n.pattern:o.removeAttribute("pattern"),n.min?o.min=n.min:o.removeAttribute("min"),n.max?o.max=n.max:o.removeAttribute("max"),n.step?o.step=n.step:o.removeAttribute("step")}return(t.minLength??-1)>-1?r.setAttribute("minlength",String(t.minLength)):r.removeAttribute("minlength"),(t.maxLength??-1)>-1?r.setAttribute("maxlength",String(t.maxLength)):r.removeAttribute("maxlength"),{validity:r.validity,validationMessage:r.validationMessage}}equals({state:t},{state:e}){const r=t.type===e.type&&t.value===e.value&&t.required===e.required&&t.minLength===e.minLength&&t.maxLength===e.maxLength;return!E(t)||!E(e)?r:r&&t.pattern===e.pattern&&t.min===e.min&&t.max===e.max&&t.step===e.step}copy({state:t}){return{state:E(t)?this.copyInput(t):this.copyTextArea(t),renderedControl:null}}copyInput(t){const{type:e,pattern:r,min:o,max:n,step:s}=t;return{...this.copySharedState(t),type:e,pattern:r,min:o,max:n,step:s}}copyTextArea(t){return{...this.copySharedState(t),type:t.type}}copySharedState({value:t,required:e,minLength:r,maxLength:o}){return{value:t,required:e,minLength:r,maxLength:o}}}function E(i){return i.type!=="textarea"}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const he=ct(ae(ie(oe(bt($)))));class c extends he{constructor(){super(...arguments),this.error=!1,this.errorText="",this.label="",this.noAsterisk=!1,this.required=!1,this.value="",this.prefixText="",this.suffixText="",this.hasLeadingIcon=!1,this.hasTrailingIcon=!1,this.supportingText="",this.textDirection="",this.rows=2,this.cols=20,this.inputMode="",this.max="",this.maxLength=-1,this.min="",this.minLength=-1,this.noSpinner=!1,this.pattern="",this.placeholder="",this.readOnly=!1,this.multiple=!1,this.step="",this.type="text",this.autocomplete="",this.dirty=!1,this.focused=!1,this.nativeError=!1,this.nativeErrorText=""}get selectionDirection(){return this.getInputOrTextarea().selectionDirection}set selectionDirection(t){this.getInputOrTextarea().selectionDirection=t}get selectionEnd(){return this.getInputOrTextarea().selectionEnd}set selectionEnd(t){this.getInputOrTextarea().selectionEnd=t}get selectionStart(){return this.getInputOrTextarea().selectionStart}set selectionStart(t){this.getInputOrTextarea().selectionStart=t}get valueAsNumber(){const t=this.getInput();return t?t.valueAsNumber:NaN}set valueAsNumber(t){const e=this.getInput();e&&(e.valueAsNumber=t,this.value=e.value)}get valueAsDate(){const t=this.getInput();return t?t.valueAsDate:null}set valueAsDate(t){const e=this.getInput();e&&(e.valueAsDate=t,this.value=e.value)}get hasError(){return this.error||this.nativeError}select(){this.getInputOrTextarea().select()}setRangeText(...t){this.getInputOrTextarea().setRangeText(...t),this.value=this.getInputOrTextarea().value}setSelectionRange(t,e,r){this.getInputOrTextarea().setSelectionRange(t,e,r)}showPicker(){const t=this.getInput();t&&t.showPicker()}stepDown(t){const e=this.getInput();e&&(e.stepDown(t),this.value=e.value)}stepUp(t){const e=this.getInput();e&&(e.stepUp(t),this.value=e.value)}reset(){this.dirty=!1,this.value=this.getAttribute("value")??"",this.nativeError=!1,this.nativeErrorText=""}attributeChangedCallback(t,e,r){t==="value"&&this.dirty||super.attributeChangedCallback(t,e,r)}render(){const t={disabled:this.disabled,error:!this.disabled&&this.hasError,textarea:this.type==="textarea","no-spinner":this.noSpinner};return p`
      <span class="text-field ${S(t)}">
        ${this.renderField()}
      </span>
    `}updated(t){const e=this.getInputOrTextarea().value;this.value!==e&&(this.value=e)}renderField(){return Qt`<${this.fieldTag}
      class="field"
      count=${this.value.length}
      ?disabled=${this.disabled}
      ?error=${this.hasError}
      error-text=${this.getErrorText()}
      ?focused=${this.focused}
      ?has-end=${this.hasTrailingIcon}
      ?has-start=${this.hasLeadingIcon}
      label=${this.label}
      ?no-asterisk=${this.noAsterisk}
      max=${this.maxLength}
      ?populated=${!!this.value}
      ?required=${this.required}
      ?resizable=${this.type==="textarea"}
      supporting-text=${this.supportingText}
    >
      ${this.renderLeadingIcon()}
      ${this.renderInputOrTextarea()}
      ${this.renderTrailingIcon()}
      <div id="description" slot="aria-describedby"></div>
      <slot name="container" slot="container"></slot>
    </${this.fieldTag}>`}renderLeadingIcon(){return p`
      <span class="icon leading" slot="start">
        <slot name="leading-icon" @slotchange=${this.handleIconChange}></slot>
      </span>
    `}renderTrailingIcon(){return p`
      <span class="icon trailing" slot="end">
        <slot name="trailing-icon" @slotchange=${this.handleIconChange}></slot>
      </span>
    `}renderInputOrTextarea(){const t={direction:this.textDirection},e=this.ariaLabel||this.label||d,r=this.autocomplete,o=(this.maxLength??-1)>-1,n=(this.minLength??-1)>-1;if(this.type==="textarea")return p`
        <textarea
          class="input"
          style=${lt(t)}
          aria-describedby="description"
          aria-invalid=${this.hasError}
          aria-label=${e}
          autocomplete=${r||d}
          name=${this.name||d}
          ?disabled=${this.disabled}
          maxlength=${o?this.maxLength:d}
          minlength=${n?this.minLength:d}
          placeholder=${this.placeholder||d}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          rows=${this.rows}
          cols=${this.cols}
          .value=${nt(this.value)}
          @change=${this.redispatchEvent}
          @focus=${this.handleFocusChange}
          @blur=${this.handleFocusChange}
          @input=${this.handleInput}
          @select=${this.redispatchEvent}></textarea>
      `;const s=this.renderPrefix(),h=this.renderSuffix(),f=this.inputMode;return p`
      <div class="input-wrapper">
        ${s}
        <input
          class="input"
          style=${lt(t)}
          aria-describedby="description"
          aria-invalid=${this.hasError}
          aria-label=${e}
          autocomplete=${r||d}
          name=${this.name||d}
          ?disabled=${this.disabled}
          inputmode=${f||d}
          max=${this.max||d}
          maxlength=${o?this.maxLength:d}
          min=${this.min||d}
          minlength=${n?this.minLength:d}
          pattern=${this.pattern||d}
          placeholder=${this.placeholder||d}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          ?multiple=${this.multiple}
          step=${this.step||d}
          type=${this.type}
          .value=${nt(this.value)}
          @change=${this.redispatchEvent}
          @focus=${this.handleFocusChange}
          @blur=${this.handleFocusChange}
          @input=${this.handleInput}
          @select=${this.redispatchEvent} />
        ${h}
      </div>
    `}renderPrefix(){return this.renderAffix(this.prefixText,!1)}renderSuffix(){return this.renderAffix(this.suffixText,!0)}renderAffix(t,e){return t?p`<span class="${S({suffix:e,prefix:!e})}">${t}</span>`:d}getErrorText(){return this.error?this.errorText:this.nativeErrorText}handleFocusChange(){var t;this.focused=((t=this.inputOrTextarea)==null?void 0:t.matches(":focus"))??!1}handleInput(t){this.dirty=!0,this.value=t.target.value}redispatchEvent(t){re(this,t)}getInputOrTextarea(){return this.inputOrTextarea||(this.connectedCallback(),this.scheduleUpdate()),this.isUpdatePending&&this.scheduleUpdate(),this.inputOrTextarea}getInput(){return this.type==="textarea"?null:this.getInputOrTextarea()}handleIconChange(){this.hasLeadingIcon=this.leadingIcons.length>0,this.hasTrailingIcon=this.trailingIcons.length>0}[V](){return this.value}formResetCallback(){this.reset()}formStateRestoreCallback(t){this.value=t}focus(){this.getInputOrTextarea().focus()}[X](){return new ce(()=>({state:this,renderedControl:this.inputOrTextarea}))}[J](){return this.inputOrTextarea}[Q](t){var r;t==null||t.preventDefault();const e=this.getErrorText();this.nativeError=!!t,this.nativeErrorText=this.validationMessage,e===this.getErrorText()&&((r=this.field)==null||r.reannounceError())}}c.shadowRootOptions={...$.shadowRootOptions,delegatesFocus:!0};a([l({type:Boolean,reflect:!0})],c.prototype,"error",void 0);a([l({attribute:"error-text"})],c.prototype,"errorText",void 0);a([l()],c.prototype,"label",void 0);a([l({type:Boolean,attribute:"no-asterisk"})],c.prototype,"noAsterisk",void 0);a([l({type:Boolean,reflect:!0})],c.prototype,"required",void 0);a([l()],c.prototype,"value",void 0);a([l({attribute:"prefix-text"})],c.prototype,"prefixText",void 0);a([l({attribute:"suffix-text"})],c.prototype,"suffixText",void 0);a([l({type:Boolean,attribute:"has-leading-icon"})],c.prototype,"hasLeadingIcon",void 0);a([l({type:Boolean,attribute:"has-trailing-icon"})],c.prototype,"hasTrailingIcon",void 0);a([l({attribute:"supporting-text"})],c.prototype,"supportingText",void 0);a([l({attribute:"text-direction"})],c.prototype,"textDirection",void 0);a([l({type:Number})],c.prototype,"rows",void 0);a([l({type:Number})],c.prototype,"cols",void 0);a([l({reflect:!0})],c.prototype,"inputMode",void 0);a([l()],c.prototype,"max",void 0);a([l({type:Number})],c.prototype,"maxLength",void 0);a([l()],c.prototype,"min",void 0);a([l({type:Number})],c.prototype,"minLength",void 0);a([l({type:Boolean,attribute:"no-spinner"})],c.prototype,"noSpinner",void 0);a([l()],c.prototype,"pattern",void 0);a([l({reflect:!0,converter:ee})],c.prototype,"placeholder",void 0);a([l({type:Boolean,reflect:!0})],c.prototype,"readOnly",void 0);a([l({type:Boolean,reflect:!0})],c.prototype,"multiple",void 0);a([l()],c.prototype,"step",void 0);a([l({reflect:!0})],c.prototype,"type",void 0);a([l({reflect:!0})],c.prototype,"autocomplete",void 0);a([_()],c.prototype,"dirty",void 0);a([_()],c.prototype,"focused",void 0);a([_()],c.prototype,"nativeError",void 0);a([_()],c.prototype,"nativeErrorText",void 0);a([T(".input")],c.prototype,"inputOrTextarea",void 0);a([T(".field")],c.prototype,"field",void 0);a([N({slot:"leading-icon"})],c.prototype,"leadingIcons",void 0);a([N({slot:"trailing-icon"})],c.prototype,"trailingIcons",void 0);/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const we=x`:host{display:inline-flex;outline:none;resize:both;text-align:start;-webkit-tap-highlight-color:rgba(0,0,0,0)}.text-field,.field{width:100%}.text-field{display:inline-flex}.field{cursor:text}.disabled .field{cursor:default}.text-field,.textarea .field{resize:inherit}slot[name=container]{border-radius:inherit}.icon{color:currentColor;display:flex;align-items:center;justify-content:center;fill:currentColor;position:relative}.icon ::slotted(*){display:flex;position:absolute}[has-start] .icon.leading{font-size:var(--_leading-icon-size);height:var(--_leading-icon-size);width:var(--_leading-icon-size)}[has-end] .icon.trailing{font-size:var(--_trailing-icon-size);height:var(--_trailing-icon-size);width:var(--_trailing-icon-size)}.input-wrapper{display:flex}.input-wrapper>*{all:inherit;padding:0}.input{caret-color:var(--_caret-color);overflow-x:hidden;text-align:inherit}.input::placeholder{color:currentColor;opacity:1}.input::-webkit-calendar-picker-indicator{display:none}.input::-webkit-search-decoration,.input::-webkit-search-cancel-button{display:none}@media(forced-colors: active){.input{background:none}}.no-spinner .input::-webkit-inner-spin-button,.no-spinner .input::-webkit-outer-spin-button{display:none}.no-spinner .input[type=number]{-moz-appearance:textfield}:focus-within .input{caret-color:var(--_focus-caret-color)}.error:focus-within .input{caret-color:var(--_error-focus-caret-color)}.text-field:not(.disabled) .prefix{color:var(--_input-text-prefix-color)}.text-field:not(.disabled) .suffix{color:var(--_input-text-suffix-color)}.text-field:not(.disabled) .input::placeholder{color:var(--_input-text-placeholder-color)}.prefix,.suffix{text-wrap:nowrap;width:min-content}.prefix{padding-inline-end:var(--_input-text-prefix-trailing-space)}.suffix{padding-inline-start:var(--_input-text-suffix-leading-space)}
`;export{vt as E,u as F,c as T,we as a,_e as i,re as r,xe as s};
