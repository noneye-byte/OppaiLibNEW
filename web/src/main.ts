// Entry point: register Material 3 components, inject global M3 tokens, and
// pull in the app components (each self-registers as a custom element).
import "@material/web/button/filled-button.js";
import "@material/web/button/text-button.js";
import "@material/web/button/outlined-button.js";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/textfield/filled-text-field.js";
import "@material/web/textfield/outlined-text-field.js";
import "@material/web/progress/circular-progress.js";
import "@material/web/dialog/dialog.js";
import "@material/web/chips/chip-set.js";
import "@material/web/chips/assist-chip.js";
import "@material/web/chips/filter-chip.js";
import "@material/web/fab/fab.js";
import "@material/web/icon/icon.js";
import "@material/web/list/list.js";
import "@material/web/list/list-item.js";
import "@material/web/tabs/tabs.js";
import "@material/web/tabs/primary-tab.js";
import { styles as typescaleStyles } from "@material/web/typography/md-typescale-styles.js";

import { globalStyles, applyTheme, loadTheme, watchSystemTheme } from "./theme.js";
import "./app.js";

// Global M3 tokens + typography.
const style = document.createElement("style");
style.textContent = globalStyles;
document.head.appendChild(style);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, typescaleStyles.styleSheet!];

// Apply the saved theme before first paint so there's no flash of the wrong one.
applyTheme(loadTheme());
watchSystemTheme();
