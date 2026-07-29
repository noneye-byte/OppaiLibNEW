// App-wide right-click menu.
//
// One <oppai-context-menu> lives in the shell and every view asks it to open by
// firing an `oppai-menu` event. Views therefore never own menu markup, dismissal,
// or keyboard handling — they describe the items and the shell renders them.
//
// Native menus are deliberately left alone over text inputs and over a live text
// selection: that is where the browser's own Cut/Copy/Paste is the only way to
// reach the clipboard, and replacing it would take a capability away.

import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { iconStyles } from "./theme.js";

export interface MenuItem {
  /** Omit for a separator. */
  label?: string;
  icon?: string;
  /** Right-aligned hint, e.g. a shortcut. */
  hint?: string;
  danger?: boolean;
  disabled?: boolean;
  run?: () => void;
}

export interface MenuRequest {
  x: number;
  y: number;
  items: MenuItem[];
  /** Shown as a small uppercase caption above the items. */
  title?: string;
}

/** Opens the shell menu. Safe to call from any shadow root — the event is composed. */
export function openMenu(request: MenuRequest): void {
  window.dispatchEvent(new CustomEvent<MenuRequest>("oppai-menu", { detail: request }));
}

/**
 * True when the browser's own menu should win: text fields and links need Paste,
 * Undo, and "Open in new tab", none of which an app menu can offer.
 */
export function nativeMenuWanted(event: MouseEvent): boolean {
  // A live selection means the user is after Copy, which only the native menu has.
  // No selection object at all is not a selection — don't read it as one.
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) return true;
  return event.composedPath().some((node) => {
    const el = node as HTMLElement;
    if (!el?.tagName) return false;
    const tag = el.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "a" || el.isContentEditable === true;
  });
}

/** A separator, for building item lists readably. */
export const menuDivider: MenuItem = {};

@customElement("oppai-context-menu")
export class OppaiContextMenu extends LitElement {
  @state() private request: MenuRequest | null = null;
  /** Placed after the first paint, once the menu's real size is known. */
  @state() private placed = { left: 0, top: 0 };

  static styles = [iconStyles, css`
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
  `];

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("oppai-menu", this.onRequest as EventListener);
    window.addEventListener("resize", this.close);
    window.addEventListener("blur", this.close);
    // Capture phase: a scroll anywhere, including inside a shadow root, invalidates
    // the anchor point the menu was positioned against.
    window.addEventListener("scroll", this.close, true);
    window.addEventListener("keydown", this.onKey, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("oppai-menu", this.onRequest as EventListener);
    window.removeEventListener("resize", this.close);
    window.removeEventListener("blur", this.close);
    window.removeEventListener("scroll", this.close, true);
    window.removeEventListener("keydown", this.onKey, true);
  }

  private onRequest = (event: CustomEvent<MenuRequest>) => {
    // Callers build item lists conditionally, so a section that renders to nothing
    // leaves its separator behind. Drop leading, trailing, and doubled ones here
    // rather than making every caller assemble a tidy list.
    const items = event.detail.items.reduce<MenuItem[]>((kept, item) => {
      if (item.label) kept.push(item);
      else if (kept.length && kept[kept.length - 1].label) kept.push(menuDivider);
      return kept;
    }, []);
    while (items.length && !items[items.length - 1].label) items.pop();
    if (!items.length) return;
    this.request = { ...event.detail, items };
    // Off-screen for one frame so the flip-into-view maths below measures the real
    // menu rather than guessing at its height.
    this.placed = { left: event.detail.x, top: event.detail.y };
    this.setAttribute("open", "");
    void this.position();
  };

  private async position() {
    await this.updateComplete;
    const menu = this.renderRoot.querySelector(".menu") as HTMLElement | null;
    const request = this.request;
    if (!menu || !request) return;
    const { width, height } = menu.getBoundingClientRect();
    const pad = 8;
    // Flip rather than clamp when the menu would overhang: a menu pinned to the
    // edge covers the thing that was right-clicked.
    const left = request.x + width + pad > window.innerWidth
      ? Math.max(pad, request.x - width)
      : request.x;
    const top = request.y + height + pad > window.innerHeight
      ? Math.max(pad, request.y - height)
      : request.y;
    this.placed = { left, top };
    await this.updateComplete;
    // preventScroll matters: focusing inside a scroll container would scroll it, and
    // the scroll listener above reads that as "the anchor moved" and closes the menu
    // the instant it opens.
    (this.renderRoot.querySelector("button:not(:disabled)") as HTMLElement | null)?.focus({ preventScroll: true });
  }

  private close = () => {
    if (!this.request) return;
    this.request = null;
    this.removeAttribute("open");
  };

  private onKey = (event: KeyboardEvent) => {
    if (!this.request) return;
    if (event.key === "Escape") { event.stopPropagation(); this.close(); return; }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const buttons = [...this.renderRoot.querySelectorAll("button:not(:disabled)")] as HTMLElement[];
    if (!buttons.length) return;
    event.preventDefault();
    const at = buttons.indexOf(this.shadowRoot?.activeElement as HTMLElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    buttons[(at + step + buttons.length) % buttons.length].focus();
  };

  private pick(item: MenuItem) {
    this.close();
    item.run?.();
  }

  render() {
    const request = this.request;
    if (!request) return nothing;
    return html`
      <div class="scrim" @pointerdown=${this.close} @contextmenu=${(e: Event) => { e.preventDefault(); this.close(); }}></div>
      <div class="menu" role="menu" style=${`left:${this.placed.left}px; top:${this.placed.top}px;`}>
        ${request.title ? html`<div class="cap">${request.title}</div>` : nothing}
        ${request.items.map((item) => item.label
          ? html`<button role="menuitem" class=${item.danger ? "danger" : ""} ?disabled=${item.disabled}
              @click=${() => this.pick(item)}>
              ${item.icon ? html`<span class="material-symbols-rounded">${item.icon}</span>` : nothing}
              <span class="label">${item.label}</span>
              ${item.hint ? html`<span class="hint">${item.hint}</span>` : nothing}
            </button>`
          : html`<hr />`)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { "oppai-context-menu": OppaiContextMenu; }
}
