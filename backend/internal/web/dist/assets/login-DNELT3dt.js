import{F as z,s as $,T,i as _,a as M}from"./shared-styles-CrWH9_9A.js";import{b as o,i as g,_ as w,t as y,a as I,g as k,c as S,n as E,m as f,d as p,A as v,e as F,s as L,l as m,f as P,h as R,j as C,k as j,o as V,p as A,q as O,r as q,u as a}from"./index-DufD-B2G.js";import{e as B}from"./query-__j_ZMY6.js";import{l as D,p as K,a as N}from"./passkeys-DfaAP0nx.js";/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */class G extends z{renderBackground(){return o` <div class="background"></div> `}renderStateLayer(){return o` <div class="state-layer"></div> `}renderIndicator(){return o`<div class="active-indicator"></div>`}}/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const H=g`@layer styles{:host{--_active-indicator-color: var(--md-filled-field-active-indicator-color, var(--md-sys-color-on-surface-variant, #49454f));--_active-indicator-height: var(--md-filled-field-active-indicator-height, 1px);--_bottom-space: var(--md-filled-field-bottom-space, 16px);--_container-color: var(--md-filled-field-container-color, var(--md-sys-color-surface-container-highest, #e6e0e9));--_content-color: var(--md-filled-field-content-color, var(--md-sys-color-on-surface, #1d1b20));--_content-font: var(--md-filled-field-content-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_content-line-height: var(--md-filled-field-content-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_content-size: var(--md-filled-field-content-size, var(--md-sys-typescale-body-large-size, 1rem));--_content-space: var(--md-filled-field-content-space, 16px);--_content-weight: var(--md-filled-field-content-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_disabled-active-indicator-color: var(--md-filled-field-disabled-active-indicator-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-active-indicator-height: var(--md-filled-field-disabled-active-indicator-height, 1px);--_disabled-active-indicator-opacity: var(--md-filled-field-disabled-active-indicator-opacity, 0.38);--_disabled-container-color: var(--md-filled-field-disabled-container-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-container-opacity: var(--md-filled-field-disabled-container-opacity, 0.04);--_disabled-content-color: var(--md-filled-field-disabled-content-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-content-opacity: var(--md-filled-field-disabled-content-opacity, 0.38);--_disabled-label-text-color: var(--md-filled-field-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-filled-field-disabled-label-text-opacity, 0.38);--_disabled-leading-content-color: var(--md-filled-field-disabled-leading-content-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-leading-content-opacity: var(--md-filled-field-disabled-leading-content-opacity, 0.38);--_disabled-supporting-text-color: var(--md-filled-field-disabled-supporting-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-supporting-text-opacity: var(--md-filled-field-disabled-supporting-text-opacity, 0.38);--_disabled-trailing-content-color: var(--md-filled-field-disabled-trailing-content-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-trailing-content-opacity: var(--md-filled-field-disabled-trailing-content-opacity, 0.38);--_error-active-indicator-color: var(--md-filled-field-error-active-indicator-color, var(--md-sys-color-error, #b3261e));--_error-content-color: var(--md-filled-field-error-content-color, var(--md-sys-color-on-surface, #1d1b20));--_error-focus-active-indicator-color: var(--md-filled-field-error-focus-active-indicator-color, var(--md-sys-color-error, #b3261e));--_error-focus-content-color: var(--md-filled-field-error-focus-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-focus-label-text-color: var(--md-filled-field-error-focus-label-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-leading-content-color: var(--md-filled-field-error-focus-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-focus-supporting-text-color: var(--md-filled-field-error-focus-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-trailing-content-color: var(--md-filled-field-error-focus-trailing-content-color, var(--md-sys-color-error, #b3261e));--_error-hover-active-indicator-color: var(--md-filled-field-error-hover-active-indicator-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-content-color: var(--md-filled-field-error-hover-content-color, var(--md-sys-color-on-surface, #1d1b20));--_error-hover-label-text-color: var(--md-filled-field-error-hover-label-text-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-leading-content-color: var(--md-filled-field-error-hover-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-hover-state-layer-color: var(--md-filled-field-error-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--_error-hover-state-layer-opacity: var(--md-filled-field-error-hover-state-layer-opacity, 0.08);--_error-hover-supporting-text-color: var(--md-filled-field-error-hover-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-hover-trailing-content-color: var(--md-filled-field-error-hover-trailing-content-color, var(--md-sys-color-on-error-container, #410e0b));--_error-label-text-color: var(--md-filled-field-error-label-text-color, var(--md-sys-color-error, #b3261e));--_error-leading-content-color: var(--md-filled-field-error-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-supporting-text-color: var(--md-filled-field-error-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-trailing-content-color: var(--md-filled-field-error-trailing-content-color, var(--md-sys-color-error, #b3261e));--_focus-active-indicator-color: var(--md-filled-field-focus-active-indicator-color, var(--md-sys-color-primary, #6750a4));--_focus-active-indicator-height: var(--md-filled-field-focus-active-indicator-height, 3px);--_focus-content-color: var(--md-filled-field-focus-content-color, var(--md-sys-color-on-surface, #1d1b20));--_focus-label-text-color: var(--md-filled-field-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_focus-leading-content-color: var(--md-filled-field-focus-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-supporting-text-color: var(--md-filled-field-focus-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-trailing-content-color: var(--md-filled-field-focus-trailing-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-active-indicator-color: var(--md-filled-field-hover-active-indicator-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-active-indicator-height: var(--md-filled-field-hover-active-indicator-height, 1px);--_hover-content-color: var(--md-filled-field-hover-content-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-label-text-color: var(--md-filled-field-hover-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-leading-content-color: var(--md-filled-field-hover-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-state-layer-color: var(--md-filled-field-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-state-layer-opacity: var(--md-filled-field-hover-state-layer-opacity, 0.08);--_hover-supporting-text-color: var(--md-filled-field-hover-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-trailing-content-color: var(--md-filled-field-hover-trailing-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_label-text-color: var(--md-filled-field-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_label-text-font: var(--md-filled-field-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-filled-field-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_label-text-populated-line-height: var(--md-filled-field-label-text-populated-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_label-text-populated-size: var(--md-filled-field-label-text-populated-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_label-text-size: var(--md-filled-field-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_label-text-weight: var(--md-filled-field-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_leading-content-color: var(--md-filled-field-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_leading-space: var(--md-filled-field-leading-space, 16px);--_supporting-text-color: var(--md-filled-field-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_supporting-text-font: var(--md-filled-field-supporting-text-font, var(--md-sys-typescale-body-small-font, var(--md-ref-typeface-plain, Roboto)));--_supporting-text-leading-space: var(--md-filled-field-supporting-text-leading-space, 16px);--_supporting-text-line-height: var(--md-filled-field-supporting-text-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_supporting-text-size: var(--md-filled-field-supporting-text-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_supporting-text-top-space: var(--md-filled-field-supporting-text-top-space, 4px);--_supporting-text-trailing-space: var(--md-filled-field-supporting-text-trailing-space, 16px);--_supporting-text-weight: var(--md-filled-field-supporting-text-weight, var(--md-sys-typescale-body-small-weight, var(--md-ref-typeface-weight-regular, 400)));--_top-space: var(--md-filled-field-top-space, 16px);--_trailing-content-color: var(--md-filled-field-trailing-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_trailing-space: var(--md-filled-field-trailing-space, 16px);--_with-label-bottom-space: var(--md-filled-field-with-label-bottom-space, 8px);--_with-label-top-space: var(--md-filled-field-with-label-top-space, 8px);--_with-leading-content-leading-space: var(--md-filled-field-with-leading-content-leading-space, 12px);--_with-trailing-content-trailing-space: var(--md-filled-field-with-trailing-content-trailing-space, 12px);--_container-shape-start-start: var(--md-filled-field-container-shape-start-start, var(--md-filled-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-start-end: var(--md-filled-field-container-shape-start-end, var(--md-filled-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-end-end: var(--md-filled-field-container-shape-end-end, var(--md-filled-field-container-shape, var(--md-sys-shape-corner-none, 0px)));--_container-shape-end-start: var(--md-filled-field-container-shape-end-start, var(--md-filled-field-container-shape, var(--md-sys-shape-corner-none, 0px)))}.background,.state-layer{border-radius:inherit;inset:0;pointer-events:none;position:absolute}.background{background:var(--_container-color)}.state-layer{visibility:hidden}.field:not(.disabled):hover .state-layer{visibility:visible}.label.floating{position:absolute;top:var(--_with-label-top-space)}.field:not(.with-start) .label-wrapper{margin-inline-start:var(--_leading-space)}.field:not(.with-end) .label-wrapper{margin-inline-end:var(--_trailing-space)}.active-indicator{inset:auto 0 0 0;pointer-events:none;position:absolute;width:100%;z-index:1}.active-indicator::before,.active-indicator::after{border-bottom:var(--_active-indicator-height) solid var(--_active-indicator-color);inset:auto 0 0 0;content:"";position:absolute;width:100%}.active-indicator::after{opacity:0;transition:opacity 150ms cubic-bezier(0.2, 0, 0, 1)}.focused .active-indicator::after{opacity:1}.field:not(.with-start) .content ::slotted(*){padding-inline-start:var(--_leading-space)}.field:not(.with-end) .content ::slotted(*){padding-inline-end:var(--_trailing-space)}.field:not(.no-label) .content ::slotted(:not(textarea)){padding-bottom:var(--_with-label-bottom-space);padding-top:calc(var(--_with-label-top-space) + var(--_label-text-populated-line-height))}.field:not(.no-label) .content ::slotted(textarea){margin-bottom:var(--_with-label-bottom-space);margin-top:calc(var(--_with-label-top-space) + var(--_label-text-populated-line-height))}:hover .active-indicator::before{border-bottom-color:var(--_hover-active-indicator-color);border-bottom-width:var(--_hover-active-indicator-height)}.active-indicator::after{border-bottom-color:var(--_focus-active-indicator-color);border-bottom-width:var(--_focus-active-indicator-height)}:hover .state-layer{background:var(--_hover-state-layer-color);opacity:var(--_hover-state-layer-opacity)}.disabled .active-indicator::before{border-bottom-color:var(--_disabled-active-indicator-color);border-bottom-width:var(--_disabled-active-indicator-height);opacity:var(--_disabled-active-indicator-opacity)}.disabled .background{background:var(--_disabled-container-color);opacity:var(--_disabled-container-opacity)}.error .active-indicator::before{border-bottom-color:var(--_error-active-indicator-color)}.error:hover .active-indicator::before{border-bottom-color:var(--_error-hover-active-indicator-color)}.error:hover .state-layer{background:var(--_error-hover-state-layer-color);opacity:var(--_error-hover-state-layer-opacity)}.error .active-indicator::after{border-bottom-color:var(--_error-focus-active-indicator-color)}.resizable .container{bottom:var(--_focus-active-indicator-height);clip-path:inset(var(--_focus-active-indicator-height) 0 0 0)}.resizable .container>*{top:var(--_focus-active-indicator-height)}}@layer hcm{@media(forced-colors: active){.disabled .active-indicator::before{border-color:GrayText;opacity:1}}}
`;/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */let h=class extends G{};h.styles=[$,H];h=w([y("md-filled-field")],h);/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Y=g`:host{--_active-indicator-color: var(--md-filled-text-field-active-indicator-color, var(--md-sys-color-on-surface-variant, #49454f));--_active-indicator-height: var(--md-filled-text-field-active-indicator-height, 1px);--_caret-color: var(--md-filled-text-field-caret-color, var(--md-sys-color-primary, #6750a4));--_container-color: var(--md-filled-text-field-container-color, var(--md-sys-color-surface-container-highest, #e6e0e9));--_disabled-active-indicator-color: var(--md-filled-text-field-disabled-active-indicator-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-active-indicator-height: var(--md-filled-text-field-disabled-active-indicator-height, 1px);--_disabled-active-indicator-opacity: var(--md-filled-text-field-disabled-active-indicator-opacity, 0.38);--_disabled-container-color: var(--md-filled-text-field-disabled-container-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-container-opacity: var(--md-filled-text-field-disabled-container-opacity, 0.04);--_disabled-input-text-color: var(--md-filled-text-field-disabled-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-input-text-opacity: var(--md-filled-text-field-disabled-input-text-opacity, 0.38);--_disabled-label-text-color: var(--md-filled-text-field-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-filled-text-field-disabled-label-text-opacity, 0.38);--_disabled-leading-icon-color: var(--md-filled-text-field-disabled-leading-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-leading-icon-opacity: var(--md-filled-text-field-disabled-leading-icon-opacity, 0.38);--_disabled-supporting-text-color: var(--md-filled-text-field-disabled-supporting-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-supporting-text-opacity: var(--md-filled-text-field-disabled-supporting-text-opacity, 0.38);--_disabled-trailing-icon-color: var(--md-filled-text-field-disabled-trailing-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-trailing-icon-opacity: var(--md-filled-text-field-disabled-trailing-icon-opacity, 0.38);--_error-active-indicator-color: var(--md-filled-text-field-error-active-indicator-color, var(--md-sys-color-error, #b3261e));--_error-focus-active-indicator-color: var(--md-filled-text-field-error-focus-active-indicator-color, var(--md-sys-color-error, #b3261e));--_error-focus-caret-color: var(--md-filled-text-field-error-focus-caret-color, var(--md-sys-color-error, #b3261e));--_error-focus-input-text-color: var(--md-filled-text-field-error-focus-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_error-focus-label-text-color: var(--md-filled-text-field-error-focus-label-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-leading-icon-color: var(--md-filled-text-field-error-focus-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-focus-supporting-text-color: var(--md-filled-text-field-error-focus-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-trailing-icon-color: var(--md-filled-text-field-error-focus-trailing-icon-color, var(--md-sys-color-error, #b3261e));--_error-hover-active-indicator-color: var(--md-filled-text-field-error-hover-active-indicator-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-input-text-color: var(--md-filled-text-field-error-hover-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_error-hover-label-text-color: var(--md-filled-text-field-error-hover-label-text-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-leading-icon-color: var(--md-filled-text-field-error-hover-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-hover-state-layer-color: var(--md-filled-text-field-error-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--_error-hover-state-layer-opacity: var(--md-filled-text-field-error-hover-state-layer-opacity, 0.08);--_error-hover-supporting-text-color: var(--md-filled-text-field-error-hover-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-hover-trailing-icon-color: var(--md-filled-text-field-error-hover-trailing-icon-color, var(--md-sys-color-on-error-container, #410e0b));--_error-input-text-color: var(--md-filled-text-field-error-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_error-label-text-color: var(--md-filled-text-field-error-label-text-color, var(--md-sys-color-error, #b3261e));--_error-leading-icon-color: var(--md-filled-text-field-error-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-supporting-text-color: var(--md-filled-text-field-error-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-trailing-icon-color: var(--md-filled-text-field-error-trailing-icon-color, var(--md-sys-color-error, #b3261e));--_focus-active-indicator-color: var(--md-filled-text-field-focus-active-indicator-color, var(--md-sys-color-primary, #6750a4));--_focus-active-indicator-height: var(--md-filled-text-field-focus-active-indicator-height, 3px);--_focus-input-text-color: var(--md-filled-text-field-focus-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_focus-label-text-color: var(--md-filled-text-field-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_focus-leading-icon-color: var(--md-filled-text-field-focus-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-supporting-text-color: var(--md-filled-text-field-focus-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-trailing-icon-color: var(--md-filled-text-field-focus-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-active-indicator-color: var(--md-filled-text-field-hover-active-indicator-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-active-indicator-height: var(--md-filled-text-field-hover-active-indicator-height, 1px);--_hover-input-text-color: var(--md-filled-text-field-hover-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-label-text-color: var(--md-filled-text-field-hover-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-leading-icon-color: var(--md-filled-text-field-hover-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-state-layer-color: var(--md-filled-text-field-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-state-layer-opacity: var(--md-filled-text-field-hover-state-layer-opacity, 0.08);--_hover-supporting-text-color: var(--md-filled-text-field-hover-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-trailing-icon-color: var(--md-filled-text-field-hover-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-color: var(--md-filled-text-field-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_input-text-font: var(--md-filled-text-field-input-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_input-text-line-height: var(--md-filled-text-field-input-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_input-text-placeholder-color: var(--md-filled-text-field-input-text-placeholder-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-prefix-color: var(--md-filled-text-field-input-text-prefix-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-size: var(--md-filled-text-field-input-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_input-text-suffix-color: var(--md-filled-text-field-input-text-suffix-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-weight: var(--md-filled-text-field-input-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_label-text-color: var(--md-filled-text-field-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_label-text-font: var(--md-filled-text-field-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-filled-text-field-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_label-text-populated-line-height: var(--md-filled-text-field-label-text-populated-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_label-text-populated-size: var(--md-filled-text-field-label-text-populated-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_label-text-size: var(--md-filled-text-field-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_label-text-weight: var(--md-filled-text-field-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_leading-icon-color: var(--md-filled-text-field-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_leading-icon-size: var(--md-filled-text-field-leading-icon-size, 24px);--_supporting-text-color: var(--md-filled-text-field-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_supporting-text-font: var(--md-filled-text-field-supporting-text-font, var(--md-sys-typescale-body-small-font, var(--md-ref-typeface-plain, Roboto)));--_supporting-text-line-height: var(--md-filled-text-field-supporting-text-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_supporting-text-size: var(--md-filled-text-field-supporting-text-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_supporting-text-weight: var(--md-filled-text-field-supporting-text-weight, var(--md-sys-typescale-body-small-weight, var(--md-ref-typeface-weight-regular, 400)));--_trailing-icon-color: var(--md-filled-text-field-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_trailing-icon-size: var(--md-filled-text-field-trailing-icon-size, 24px);--_container-shape-start-start: var(--md-filled-text-field-container-shape-start-start, var(--md-filled-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-start-end: var(--md-filled-text-field-container-shape-start-end, var(--md-filled-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-end-end: var(--md-filled-text-field-container-shape-end-end, var(--md-filled-text-field-container-shape, var(--md-sys-shape-corner-none, 0px)));--_container-shape-end-start: var(--md-filled-text-field-container-shape-end-start, var(--md-filled-text-field-container-shape, var(--md-sys-shape-corner-none, 0px)));--_icon-input-space: var(--md-filled-text-field-icon-input-space, 16px);--_leading-space: var(--md-filled-text-field-leading-space, 16px);--_trailing-space: var(--md-filled-text-field-trailing-space, 16px);--_top-space: var(--md-filled-text-field-top-space, 16px);--_bottom-space: var(--md-filled-text-field-bottom-space, 16px);--_input-text-prefix-trailing-space: var(--md-filled-text-field-input-text-prefix-trailing-space, 2px);--_input-text-suffix-leading-space: var(--md-filled-text-field-input-text-suffix-leading-space, 2px);--_with-label-top-space: var(--md-filled-text-field-with-label-top-space, 8px);--_with-label-bottom-space: var(--md-filled-text-field-with-label-bottom-space, 8px);--_focus-caret-color: var(--md-filled-text-field-focus-caret-color, var(--md-sys-color-primary, #6750a4));--_with-leading-icon-leading-space: var(--md-filled-text-field-with-leading-icon-leading-space, 12px);--_with-trailing-icon-trailing-space: var(--md-filled-text-field-with-trailing-icon-trailing-space, 12px);--md-filled-field-active-indicator-color: var(--_active-indicator-color);--md-filled-field-active-indicator-height: var(--_active-indicator-height);--md-filled-field-bottom-space: var(--_bottom-space);--md-filled-field-container-color: var(--_container-color);--md-filled-field-container-shape-end-end: var(--_container-shape-end-end);--md-filled-field-container-shape-end-start: var(--_container-shape-end-start);--md-filled-field-container-shape-start-end: var(--_container-shape-start-end);--md-filled-field-container-shape-start-start: var(--_container-shape-start-start);--md-filled-field-content-color: var(--_input-text-color);--md-filled-field-content-font: var(--_input-text-font);--md-filled-field-content-line-height: var(--_input-text-line-height);--md-filled-field-content-size: var(--_input-text-size);--md-filled-field-content-space: var(--_icon-input-space);--md-filled-field-content-weight: var(--_input-text-weight);--md-filled-field-disabled-active-indicator-color: var(--_disabled-active-indicator-color);--md-filled-field-disabled-active-indicator-height: var(--_disabled-active-indicator-height);--md-filled-field-disabled-active-indicator-opacity: var(--_disabled-active-indicator-opacity);--md-filled-field-disabled-container-color: var(--_disabled-container-color);--md-filled-field-disabled-container-opacity: var(--_disabled-container-opacity);--md-filled-field-disabled-content-color: var(--_disabled-input-text-color);--md-filled-field-disabled-content-opacity: var(--_disabled-input-text-opacity);--md-filled-field-disabled-label-text-color: var(--_disabled-label-text-color);--md-filled-field-disabled-label-text-opacity: var(--_disabled-label-text-opacity);--md-filled-field-disabled-leading-content-color: var(--_disabled-leading-icon-color);--md-filled-field-disabled-leading-content-opacity: var(--_disabled-leading-icon-opacity);--md-filled-field-disabled-supporting-text-color: var(--_disabled-supporting-text-color);--md-filled-field-disabled-supporting-text-opacity: var(--_disabled-supporting-text-opacity);--md-filled-field-disabled-trailing-content-color: var(--_disabled-trailing-icon-color);--md-filled-field-disabled-trailing-content-opacity: var(--_disabled-trailing-icon-opacity);--md-filled-field-error-active-indicator-color: var(--_error-active-indicator-color);--md-filled-field-error-content-color: var(--_error-input-text-color);--md-filled-field-error-focus-active-indicator-color: var(--_error-focus-active-indicator-color);--md-filled-field-error-focus-content-color: var(--_error-focus-input-text-color);--md-filled-field-error-focus-label-text-color: var(--_error-focus-label-text-color);--md-filled-field-error-focus-leading-content-color: var(--_error-focus-leading-icon-color);--md-filled-field-error-focus-supporting-text-color: var(--_error-focus-supporting-text-color);--md-filled-field-error-focus-trailing-content-color: var(--_error-focus-trailing-icon-color);--md-filled-field-error-hover-active-indicator-color: var(--_error-hover-active-indicator-color);--md-filled-field-error-hover-content-color: var(--_error-hover-input-text-color);--md-filled-field-error-hover-label-text-color: var(--_error-hover-label-text-color);--md-filled-field-error-hover-leading-content-color: var(--_error-hover-leading-icon-color);--md-filled-field-error-hover-state-layer-color: var(--_error-hover-state-layer-color);--md-filled-field-error-hover-state-layer-opacity: var(--_error-hover-state-layer-opacity);--md-filled-field-error-hover-supporting-text-color: var(--_error-hover-supporting-text-color);--md-filled-field-error-hover-trailing-content-color: var(--_error-hover-trailing-icon-color);--md-filled-field-error-label-text-color: var(--_error-label-text-color);--md-filled-field-error-leading-content-color: var(--_error-leading-icon-color);--md-filled-field-error-supporting-text-color: var(--_error-supporting-text-color);--md-filled-field-error-trailing-content-color: var(--_error-trailing-icon-color);--md-filled-field-focus-active-indicator-color: var(--_focus-active-indicator-color);--md-filled-field-focus-active-indicator-height: var(--_focus-active-indicator-height);--md-filled-field-focus-content-color: var(--_focus-input-text-color);--md-filled-field-focus-label-text-color: var(--_focus-label-text-color);--md-filled-field-focus-leading-content-color: var(--_focus-leading-icon-color);--md-filled-field-focus-supporting-text-color: var(--_focus-supporting-text-color);--md-filled-field-focus-trailing-content-color: var(--_focus-trailing-icon-color);--md-filled-field-hover-active-indicator-color: var(--_hover-active-indicator-color);--md-filled-field-hover-active-indicator-height: var(--_hover-active-indicator-height);--md-filled-field-hover-content-color: var(--_hover-input-text-color);--md-filled-field-hover-label-text-color: var(--_hover-label-text-color);--md-filled-field-hover-leading-content-color: var(--_hover-leading-icon-color);--md-filled-field-hover-state-layer-color: var(--_hover-state-layer-color);--md-filled-field-hover-state-layer-opacity: var(--_hover-state-layer-opacity);--md-filled-field-hover-supporting-text-color: var(--_hover-supporting-text-color);--md-filled-field-hover-trailing-content-color: var(--_hover-trailing-icon-color);--md-filled-field-label-text-color: var(--_label-text-color);--md-filled-field-label-text-font: var(--_label-text-font);--md-filled-field-label-text-line-height: var(--_label-text-line-height);--md-filled-field-label-text-populated-line-height: var(--_label-text-populated-line-height);--md-filled-field-label-text-populated-size: var(--_label-text-populated-size);--md-filled-field-label-text-size: var(--_label-text-size);--md-filled-field-label-text-weight: var(--_label-text-weight);--md-filled-field-leading-content-color: var(--_leading-icon-color);--md-filled-field-leading-space: var(--_leading-space);--md-filled-field-supporting-text-color: var(--_supporting-text-color);--md-filled-field-supporting-text-font: var(--_supporting-text-font);--md-filled-field-supporting-text-line-height: var(--_supporting-text-line-height);--md-filled-field-supporting-text-size: var(--_supporting-text-size);--md-filled-field-supporting-text-weight: var(--_supporting-text-weight);--md-filled-field-top-space: var(--_top-space);--md-filled-field-trailing-content-color: var(--_trailing-icon-color);--md-filled-field-trailing-space: var(--_trailing-space);--md-filled-field-with-label-bottom-space: var(--_with-label-bottom-space);--md-filled-field-with-label-top-space: var(--_with-label-top-space);--md-filled-field-with-leading-content-leading-space: var(--_with-leading-icon-leading-space);--md-filled-field-with-trailing-content-trailing-space: var(--_with-trailing-icon-trailing-space)}
`;/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */class U extends T{constructor(){super(...arguments),this.fieldTag=_`md-filled-field`}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */let b=class extends U{constructor(){super(...arguments),this.fieldTag=_`md-filled-field`}};b.styles=[M,Y];b=w([y("md-filled-text-field")],b);var W=Object.defineProperty,X=Object.getOwnPropertyDescriptor,l=(e,r,d,c)=>{for(var t=c>1?void 0:c?X(r,d):r,s=e.length-1,n;s>=0;s--)(n=e[s])&&(t=(c?n(r,d,t):n(t))||t);return c&&t&&W(r,d,t),t};const u=A,J=m("greeting",{intensity:u(k())}),x=["happy","neutral","thinking","mischievous","surprised"];let i=class extends I{constructor(){super(...arguments),this.error="",this.busy=!1,this.libbyMessage=J.message,this.libbyTone="success",this.libbyEmotion=x[Math.floor(Math.random()*x.length)],this.libbyIntensity=u(k()),this.cloudPasswordVisible=!1,this.passkeyReady=!1,this.onLibby=e=>{this.libbyMessage=e.detail.message,this.libbyTone=e.detail.tone;const r=e.detail.tone==="error"?S(e.detail.message):{emotion:"happy",intensity:1};this.libbyEmotion=E(e.detail.emotion??r.emotion),this.libbyIntensity=u(e.detail.intensity??r.intensity),this.libbyTimer&&clearTimeout(this.libbyTimer),this.libbyTimer=window.setTimeout(()=>{this.libbyMessage=""},5e3)},this.onKeydown=e=>{e.key==="Enter"&&!this.busy&&(e.preventDefault(),this.form.requestSubmit())},this.passkeySignIn=async()=>{if(!this.busy){this.error="",this.busy=!0;try{const e=await D();this.welcome(e.user.username),this.dispatchEvent(new CustomEvent("logged-in",{detail:e.user,bubbles:!0,composed:!0}))}catch(e){const r=K(e);r&&(this.error=r,f(r))}finally{this.busy=!1}}}}connectedCallback(){super.connectedCallback(),this.classList.toggle("cloud",p()),window.addEventListener("oppai-mascot",this.onLibby),this.libbyTimer=window.setTimeout(()=>this.libbyMessage="",5e3),this.passkeyReady=N()&&window.isSecureContext}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("oppai-mascot",this.onLibby),this.libbyTimer&&clearTimeout(this.libbyTimer)}renderCloudLogin(){return o`
      <div class="cloud-login">
        <!-- The familiar three-ring cloud mark from the supplied reference. It is
             vector so it stays crisp on a large monitor and on a phone alike. -->
        <svg class="cloud-mark" viewBox="0 0 220 90" aria-label="Nextcloud">
          <g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="110" cy="45" r="34" stroke-width="17" />
            <circle cx="42" cy="50" r="20" stroke-width="14" />
            <circle cx="178" cy="50" r="20" stroke-width="14" />
            <path d="M62 50h13M145 50h13" stroke-width="14" />
          </g>
        </svg>
        <form class="cloud-card" @submit=${this.submit} @keydown=${this.onKeydown}>
          <h1 class="cloud-word">Log in to Nextcloud</h1>
          ${this.error?o`<div class="cloud-err" role="alert">${this.error}</div>`:v}
          <label class="cloud-field">
            <span>Account name or email</span>
            <input name="username" type="text" autocomplete="username"
              autofocus required aria-label="Account name or email" />
          </label>
          <label class="cloud-field">
            <span>Password</span>
            <span class="cloud-input">
              <input name="password" type=${this.cloudPasswordVisible?"text":"password"}
                autocomplete="current-password" required aria-label="Password" />
              <button class="cloud-password" type="button"
                title=${this.cloudPasswordVisible?"Hide password":"Show password"}
                aria-label=${this.cloudPasswordVisible?"Hide password":"Show password"}
                @click=${()=>this.cloudPasswordVisible=!this.cloudPasswordVisible}>
                <span class="material-symbols-rounded" aria-hidden="true"
                  >${this.cloudPasswordVisible?"visibility_off":"visibility"}</span>
              </button>
            </span>
          </label>
          <button class="cloud-submit" type="submit" ?disabled=${this.busy}>
            ${this.busy?"Logging in…":o`<span class="material-symbols-rounded" aria-hidden="true">arrow_forward</span>
                  <span>Log in</span>`}
          </button>
          <!-- Present because every such page has one, and its absence is a tell.
               It says the true thing a self-hosted instance's does say. -->
          <button class="cloud-link" type="button"
            @click=${()=>this.error="Contact your administrator to reset your password."}>
            Forgot password?
          </button>
          ${this.passkeyReady?o`<button class="cloud-link" type="button" ?disabled=${this.busy} @click=${this.passkeySignIn}>
                Log in with a device
              </button>`:v}
        </form>
        <div class="cloud-foot"><strong>Nextcloud</strong> – a safe home for all your data</div>
      </div>
    `}async submit(e){if(e.preventDefault(),this.busy)return;this.error="",this.busy=!0;const r=e.target,d=r.elements.namedItem("username").value,c=r.elements.namedItem("password").value;try{const t=await F.login(d,c);L(t.token),this.welcome(t.user.username),this.dispatchEvent(new CustomEvent("logged-in",{detail:t.user,bubbles:!0,composed:!0}))}catch(t){const s=t.message||"login failed";if(this.error=s==="unauthorized"?"Wrong account name or password.":s,p())return;if(s==="unauthorized"){const n=m("loginFail");f(n.message,"error",{emotion:n.emotion,intensity:n.intensity})}else f(this.error)}finally{this.busy=!1}}welcome(e){if(p())return;const r=m("login");f(`${r.message.replace(/\.$/,"")}, ${e}.`,"success",{emotion:r.emotion,intensity:r.intensity})}render(){if(p())return this.renderCloudLogin();const e=P(this.libbyEmotion,this.libbyIntensity),r=R()?null:o`<div class="libby ${this.libbyMessage?"talking":""} ${this.libbyTone}">
          ${this.libbyMessage?o`<div class="libby-speech libby-enter" role=${this.libbyTone==="error"?"alert":"status"}>
            <span class="libby-name">LIBBY</span>${this.libbyMessage}
          </div>`:null}
          <!-- Keyed on the pose and on the line she is saying, so she rocks into a
               new one and a mood change replaces the element — which is what
               restarts the artwork fallback chain for the new pose. -->
          <span class="libby-figure libby-breathe">${C(`${this.libbyEmotion}-${this.libbyIntensity}-${this.libbyMessage}`,o`<img
            class=${this.libbyTone==="error"?"libby-startle":"libby-speak"}
            src=${e[0]} data-fallback-index="0" alt=${`Libby feeling ${this.libbyEmotion}`}
            @error=${d=>j(d.target,e)} />`)}</span>
        </div>`;return o`
      ${r}
      <form class="card" @submit=${this.submit} @keydown=${this.onKeydown}>
        <span class="logo">${V}</span>
        <h1 class="brand">OppaiLib</h1>
        <p class="tagline">Your private media library</p>
        <md-filled-text-field label="Username" name="username" autofocus required></md-filled-text-field>
        <md-filled-text-field label="Password" name="password" type="password" required>
        </md-filled-text-field>
        <div class="err">${this.error}</div>
        <md-filled-button type="submit" ?disabled=${this.busy}>
          ${this.busy?"Signing in…":"Sign in"}
        </md-filled-button>
        ${this.passkeyReady?o`
              <div class="or">or</div>
              <!-- type="button": inside a form, a bare button submits, which would fire
                   the password path with empty fields. -->
              <md-text-button type="button" ?disabled=${this.busy} @click=${this.passkeySignIn}>
                <span class="material-symbols-rounded" slot="icon" style="font-size:18px;">passkey</span>
                Use a passkey
              </md-text-button>
            `:v}
      </form>
    `}};i.styles=[O,q,g`
      :host {
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 1rem;
        position: relative;
        overflow: hidden;
        background:
          radial-gradient(1200px 600px at 50% -10%, color-mix(in srgb, var(--md-sys-color-primary) 14%, transparent), transparent 70%),
          var(--md-sys-color-background);
      }

      /* The mascot is anchored to the bottom edge and bleeds off it — she has no legs,
         so any gap under her reads as a cut-off. She sits behind the card and must
         never swallow a click meant for the form. */
      .libby {
        position: absolute;
        right: 0;
        bottom: 0;
        width: min(48vw, 540px);
        height: min(82vh, 720px);
        pointer-events: none;
        user-select: none;
      }
      /* Three layers, and they have to stay three. The outer .libby owns the
         positioning — including the translateX that centres her on narrow screens —
         so no animation may touch its transform. The figure breathes, the image
         inside it reacts to a line; splitting them is also what keeps a reaction
         from cancelling the idle loop, since one element runs one animation. */
      .libby-figure {
        display: block;
        height: 100%;
        width: 100%;
        transform-origin: 50% 100%;
      }
      .libby img {
        display: block;
        height: 100%;
        width: 100%;
        object-fit: contain;
        object-position: right bottom;
        /* Motion pivots at her feet: she is anchored to the bottom edge, so scaling
           or rocking about the centre would lift her off it. */
        transform-origin: 50% 100%;
      }
      .libby.error img { filter: saturate(.82); }
      /* Clear of the sign-in card, not behind it. At 72%/12% the bubble's left half
         sat under the card — the card is position:relative and therefore paints
         over her — so most of what she said was invisible. Above and to the right
         of the card is empty space at every width this breakpoint covers, and the
         z-index makes the overlap harmless if a longer line does reach the card. */
      .libby-speech {
        position: absolute;
        right: 30%;
        top: -2%;
        z-index: 2;
        width: min(260px, 42vw);
        padding: 11px 14px;
        border-radius: 18px 18px 4px 18px;
        background: var(--md-sys-color-surface-container-high);
        color: var(--md-sys-color-on-surface);
        border: 1px solid var(--md-sys-color-primary);
        box-shadow: 0 8px 28px rgba(0,0,0,.3);
        font: 500 14px/1.4 Roboto, system-ui, sans-serif;
      }
      .libby.error .libby-speech { border-color: var(--md-sys-color-error); }
      .libby-name { display: block; color: var(--md-sys-color-primary); font-size: 11px; font-weight: 700; }
      @media (max-width: 900px) {
        .libby {
          right: 50%;
          transform: translateX(50%);
          width: min(88vw, 390px);
          height: min(42vh, 360px);
          opacity: 0.78;
        }
        .libby-speech { right: 58%; top: -8%; }
      }

      .card {
        position: relative;
        background: var(--md-sys-color-surface-container);
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 28px;
        padding: 2.25rem 2rem;
        width: min(380px, 100%);
        display: flex;
        flex-direction: column;
        gap: 1rem;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
        animation: oppai-scale-in 0.42s var(--oppai-ease-spring) both;
      }
      /* Above the mascot, and pulled up off the bottom edge she occupies. */
      @media (max-width: 900px) {
        .card { margin-bottom: 22vh; }
      }
      h1 {
        margin: 0 0 0.25rem;
        text-align: center;
        letter-spacing: 0.5px;
        font-weight: 600;
      }
      .brand { text-align: center; color: var(--md-sys-color-primary); }
      /* The mark takes its colour from here, which is what makes it themeable. */
      .logo {
        display: block;
        width: 84px;
        height: 84px;
        margin: 0 auto;
        color: var(--md-sys-color-primary);
      }
      .logo svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      .tagline {
        text-align: center;
        margin: 0 0 0.5rem;
        font-size: 0.85rem;
        color: var(--md-sys-color-on-surface-variant);
      }
      md-filled-text-field { width: 100%; }
      md-filled-button { --md-filled-button-container-shape: 14px; }
      .err {
        color: var(--md-sys-color-error);
        font-size: 0.85rem;
        min-height: 1.2em;
        text-align: center;
      }
      /* Separates the two ways in without implying one is the real one — password stays
         the fallback and the recovery path, so neither is demoted visually. */
      .or {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--md-sys-color-on-surface-variant);
      }
      .or::before,
      .or::after {
        content: "";
        flex: 1;
        height: 1px;
        background: var(--md-sys-color-outline-variant);
      }

      /* ── Incognito sign-in ────────────────────────────────────────────────
         The disguise, and the only screen it has to be convincing on: this is
         what someone who opens the bookmark sees, and all they see unless they
         have the password.

         It is written as its own block rather than as overrides of the card
         above because almost nothing carries over. The app's sign-in is a
         Material card on a dark warm background with a mascot leaning into it;
         this is a flat blue field, a centred wordmark, two stacked rounded
         inputs and a full-width button. Trying to reach one from the other with
         a class or two would leave the tells that give a skin away — a radius
         that is 28px where it should be 8, a stray elevation shadow. */
      :host(.cloud) {
        isolation: isolate;
        padding: clamp(20px, 4vh, 44px) 18px;
        background: linear-gradient(180deg, #0788c9 0%, #0a8dcc 56%, #25a8e5 100%);
        color: #222;
        font-family: "Noto Sans", "Open Sans", Roboto, system-ui, sans-serif;
      }
      /* Soft, layered cloud banks built from gradients keep the disguise self-contained
         and responsive while matching the supplied sky reference. */
      :host(.cloud)::before,
      :host(.cloud)::after {
        content: "";
        position: absolute;
        z-index: -1;
        pointer-events: none;
      }
      :host(.cloud)::before {
        left: -8vw;
        right: -8vw;
        bottom: -18vh;
        height: 56vh;
        opacity: .96;
        background:
          radial-gradient(ellipse 15% 38% at 3% 57%, #e7f7ff 0 67%, transparent 69%),
          radial-gradient(ellipse 17% 46% at 18% 48%, #f6fcff 0 65%, transparent 67%),
          radial-gradient(ellipse 20% 58% at 33% 58%, #eaf8ff 0 66%, transparent 68%),
          radial-gradient(ellipse 18% 48% at 49% 50%, #f8fdff 0 66%, transparent 68%),
          radial-gradient(ellipse 22% 54% at 67% 59%, #e7f6fe 0 66%, transparent 68%),
          radial-gradient(ellipse 18% 49% at 84% 50%, #f6fcff 0 66%, transparent 68%),
          radial-gradient(ellipse 16% 40% at 98% 57%, #e9f8ff 0 67%, transparent 69%),
          linear-gradient(180deg, transparent 0 45%, #e9f8ff 67%, #d6f0fc 100%);
        filter: drop-shadow(0 -8px 16px rgba(255, 255, 255, .24));
      }
      :host(.cloud)::after {
        left: -10vw;
        right: -10vw;
        bottom: 21vh;
        height: 25vh;
        opacity: .56;
        background:
          radial-gradient(ellipse 16% 48% at 8% 80%, #e8f7ff 0 68%, transparent 70%),
          radial-gradient(ellipse 13% 44% at 26% 90%, #f6fcff 0 68%, transparent 70%),
          radial-gradient(ellipse 18% 48% at 78% 91%, #f4fbff 0 68%, transparent 70%),
          radial-gradient(ellipse 15% 45% at 96% 80%, #e7f7ff 0 68%, transparent 70%);
        filter: blur(2px);
      }
      .cloud-login {
        width: min(416px, 100%);
        min-height: calc(100vh - clamp(40px, 8vh, 88px));
        min-height: calc(100dvh - clamp(40px, 8vh, 88px));
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 1;
      }
      .cloud-mark {
        display: block;
        width: min(216px, 54vw);
        height: auto;
        margin: 0 auto clamp(22px, 4vh, 38px);
        filter: drop-shadow(0 2px 3px rgba(0, 72, 111, .22));
      }
      .cloud-card {
        width: 100%;
        box-sizing: border-box;
        padding: 24px 20px 20px;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 15px;
        border-radius: 12px;
        background: rgba(255, 255, 255, .98);
        color: #202124;
        box-shadow: 0 6px 20px rgba(0, 52, 81, .28), 0 1px 3px rgba(0, 0, 0, .22);
        animation: oppai-scale-in .3s ease-out both;
      }
      .cloud-word {
        margin: 0 0 14px;
        text-align: center;
        font-size: 25px;
        line-height: 1.25;
        font-weight: 700;
        letter-spacing: -.25px;
      }
      .cloud-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        color: #262626;
        font-size: 16px;
        line-height: 1.35;
      }
      .cloud-input {
        position: relative;
      }
      .cloud-card input {
        width: 100%;
        box-sizing: border-box;
        height: 46px;
        padding: 0 13px;
        border: 2px solid #d7d7d7;
        border-radius: 11px;
        background: #fff;
        color: #222;
        font: inherit;
        font-size: 16px;
        outline: none;
        transition: border-color .15s ease, box-shadow .15s ease;
      }
      .cloud-card input:hover { border-color: #b7b7b7; }
      .cloud-card input:focus {
        border-color: #0082c9;
        box-shadow: 0 0 0 2px rgba(0, 130, 201, .18);
      }
      .cloud-input input { padding-right: 46px; }
      .cloud-password {
        position: absolute;
        top: 50%;
        right: 5px;
        width: 38px;
        height: 38px;
        transform: translateY(-50%);
        display: grid;
        place-items: center;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: #303030;
        cursor: pointer;
      }
      .cloud-password:hover { background: #f0f0f0; }
      .cloud-login .material-symbols-rounded {
        font-family: "Material Symbols Rounded";
        font-weight: normal;
        font-style: normal;
        line-height: 1;
        letter-spacing: normal;
        text-transform: none;
        white-space: nowrap;
        direction: ltr;
        font-feature-settings: "liga";
      }
      .cloud-password .material-symbols-rounded { font-size: 21px; }
      .cloud-card button.cloud-submit {
        height: 54px;
        margin-top: 5px;
        border: 0;
        border-radius: 28px;
        background: #006fa8;
        color: #fff;
        font: inherit;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 14px;
        transition: background .15s ease, transform .12s ease, box-shadow .15s ease;
      }
      .cloud-card button.cloud-submit:hover:not(:disabled) {
        background: #005f91;
        box-shadow: 0 3px 9px rgba(0, 79, 121, .28);
      }
      .cloud-card button.cloud-submit:active:not(:disabled) { transform: scale(.985); }
      .cloud-card button.cloud-submit:disabled { opacity: .68; cursor: default; }
      .cloud-submit .material-symbols-rounded { font-size: 23px; }
      .cloud-link {
        margin: 0 auto;
        border: 0;
        background: none;
        padding: 4px 8px;
        color: #202124;
        font: inherit;
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
      }
      .cloud-link:hover { text-decoration: underline; }
      .cloud-link:disabled { opacity: .55; cursor: default; }
      .cloud-err {
        padding: 10px 12px;
        border-radius: 8px;
        background: #fde7e7;
        border: 1px solid #e8aaaa;
        color: #8a1f1f;
        font-size: 13px;
        text-align: center;
      }
      .cloud-foot {
        margin-top: auto;
        padding-top: clamp(24px, 6vh, 54px);
        text-align: center;
        color: #151515;
        font-size: 15px;
        line-height: 1.6;
        text-shadow: 0 1px 1px rgba(255, 255, 255, .9);
      }
      .cloud-foot strong { font-weight: 700; }
      @media (max-height: 760px) {
        .cloud-login { justify-content: flex-start; }
        .cloud-mark { width: 150px; margin-bottom: 18px; }
        .cloud-card { padding-top: 19px; gap: 11px; }
        .cloud-word { margin-bottom: 8px; }
        .cloud-foot { padding-top: 20px; }
      }
    `];l([a()],i.prototype,"error",2);l([a()],i.prototype,"busy",2);l([a()],i.prototype,"libbyMessage",2);l([a()],i.prototype,"libbyTone",2);l([a()],i.prototype,"libbyEmotion",2);l([a()],i.prototype,"libbyIntensity",2);l([a()],i.prototype,"cloudPasswordVisible",2);l([a()],i.prototype,"passkeyReady",2);l([B("form")],i.prototype,"form",2);i=l([y("oppai-login")],i);export{i as OppaiLogin};
