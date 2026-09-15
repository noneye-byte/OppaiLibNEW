// Entry point: inject the global M3 tokens and pull in the app shell (each component
// self-registers as a custom element).
//
// Only the component this file's own screen needs is registered here. There were
// eighteen, for the whole app, in the bundle everyone downloads before anything
// renders — and ten of them (the tab bar, the list, the FAB, the chip set, the icon
// button…) were used nowhere in the app at all. Each screen now imports what it
// renders, so a definition arrives with the view that needs it: see login.ts and
// scrape-dialog.ts.
import "@material/web/progress/circular-progress.js"; // app.ts's loading state
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
