/**
 * @file pdf_export.js
 * @summary Task → PDF utilities for Debriefing boards.
 * @description
 * Provides functions to open a print-ready popup with task HTML (user chooses "Save as PDF"),
 * plus an optional board‑wide export via html2pdf. Includes helpers to read CSS variables
 * from the host app and generate a self-contained CSS block for the PDF document.
 *
 * Exports:
 *  - {@link exportDebriefingTaskPdf}: open a new tab with app-like styling and trigger print
 *  - {@link downloadDebriefingPdf}: download an aggregated PDF for the whole board (html2pdf)
 */

/* ---------- Task PDF in new tab / print ---------- */

/**
 * Options for {@link exportDebriefingTaskPdf}.
 * @typedef {Object} ExportOptions
 * @property {boolean} [logo=true] - Whether to render the MM Flow logo in the PDF view.
 * @property {"top-left"|"top-right"|"bottom-left"|"bottom-right"} [logoPos="top-left"]
 *   Position of the logo within the page.
 */

/**
 * Opens a new tab containing the task HTML with app-like styling; the user can then
 * choose "Save as PDF" in the browser print dialog.
 *
 * - Copies selected CSS variables from the host app (via {@link readCssVars})
 * - Generates a self-contained CSS sheet (via {@link getPdfCss})
 * - Injects task HTML and (optionally) the MM Flow logo, and triggers `window.print()`
 *
 * @param {string} taskHtml - The stored HTML of the task description to render.
 * @param {string} [baseTitle='debriefing'] - Base filename / heading (no extension).
 * @param {ExportOptions} [opts] - Additional rendering options.
 * @returns {Promise<void>} Resolves after the print tab is written and print is triggered.
 */
// --- REPLACE: exportDebriefingTaskPdf ---
// --- REPLACE: exportDebriefingTaskPdf ---
export async function exportDebriefingTaskPdf(taskHtml, baseTitle = 'debriefing', opts = {}) {
    const options = { logo: true, logoPos: 'top-left', ...opts };

    // Pull selected CSS variables from the app (fallbacks will be applied)
    const vars = readCssVars([
        '--bg-color','--bg-color-dark','--bg-color-light',
        '--font_white_color','--font-prime-color',
        '--btn-prime-color','--btn-prime-font-color',
        '--card-bg-color','--card-border-color'
    ]);

    // Pass whether a logo is shown and where → padding will adapt accordingly
    const css = getPdfCss(vars, { logoPos: options.logoPos, hasLogo: !!options.logo });

    const titleText = baseTitle || 'debriefing';
    const fileBase  = sanitizeFilename(titleText) + '_' + new Date().toISOString().slice(0,10);

    const w = window.open('', '_blank');
    if (!w) { alert('Popup blocked – please allow popups.'); return; }

    w.document.open();
    w.document.write(`<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(fileBase)}</title>
  <base href="${location.href}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${css}</style>
</head>
<body>
  <header class="pdf-header">
    <h1 class="pdf-title">${escapeHtml(titleText)}</h1>
  </header>

  <main class="pdf-content">
    ${taskHtml || ''}
  </main>

  ${options.logo ? `<img class="pdf-logo ${options.logoPos}" src="../../assets/icons/mm-flow-logo-dark.svg" alt="MM Flow – Strategic Assortment">` : ''}

  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 50));
  </script>
</body>
</html>`);
    w.document.close();
}

/* ---------- Optional: board-wide PDF export (existing) ---------- */

/**
 * Aggregates the current board into a single PDF using html2pdf (client-side).
 * Requires `window.currentBoard` and loads `html2pdf` on demand if absent.
 *
 * @returns {Promise<void>} Resolves after the PDF has been generated and downloaded.
 */
export async function downloadDebriefingPdf() {
    if (!window.currentBoard) { alert('Board data missing'); return; }
    if (!window.html2pdf)      await loadHtml2Pdf();

    const pdfHtml = buildPdfTemplate(window.currentBoard);

    const holder = document.createElement('div');
    holder.style.cssText = `
        position:fixed; top:0; left:0; width:210mm;
        background:#fff; z-index:-1; pointer-events:none;
    `;
    holder.innerHTML = pdfHtml;
    document.body.appendChild(holder);

    await html2pdf().set({
        margin:10,
        filename:`debriefing_${new Date().toISOString().slice(0,10)}.pdf`,
        html2canvas:{
            scale:2,
            useCORS:true,
            imageTimeout:0,
            ignoreElements:el =>
                el.tagName==='IMG' && el.src.includes('download.svg')
        },
        jsPDF:{ unit:'mm', format:'a4', orientation:'portrait' }
    }).from(holder).save();

    document.body.removeChild(holder);
}

/* ======================= Helpers ======================= */

/**
 * Reads the given CSS custom properties from `:root` and returns a name→value map.
 * Missing variables are filled with sensible defaults for the PDF theme.
 *
 * @param {string[]} names - CSS variable names to read (e.g., ["--bg-color"]).
 * @returns {Record<string,string>} Map of variable names to computed values (trimmed).
 */
function readCssVars(names){
    const cs = getComputedStyle(document.documentElement);
    const out = {};
    names.forEach(n => {
        out[n] = (cs.getPropertyValue(n) || '').trim();
    });
    // Fallbacks
    out['--bg-color']            ||= '#F4F4F6';
    out['--bg-color-dark']       ||= '#171717';
    out['--bg-color-light']      ||= '#28282B';
    out['--font_white_color']    ||= '#171717';
    out['--font-prime-color']    ||= '#DF0000';
    out['--btn-prime-color']     ||= '#DF0000';
    out['--btn-prime-font-color']||= '#FFFFFF';
    out['--card-bg-color']       ||= '#FFFFFF';
    out['--card-border-color']   ||= '#DEDFE3';
    return out;
}

/**
 * Generates the CSS string used inside the print popup for styling.
 * Adjusts top padding based on logo presence and position.
 *
 * @param {Record<string,string>} vars - Name→value map of theme variables (from {@link readCssVars}).
 * @param {{logoPos?: "top-left"|"top-right"|"bottom-left"|"bottom-right", hasLogo?: boolean}} [options]
 *   Position of the logo and whether it should be rendered.
 * @returns {string} A full CSS stylesheet to embed in the generated HTML.
 */
// --- REPLACE: getPdfCss ---
// --- DROP‑IN REPLACEMENT ---
// --- REPLACE THIS FUNCTION IN pdf_export.js ---
// 1) CSS generator (logo small in a corner, print-safe)
// --- REPLACE: getPdfCss ---
function getPdfCss(vars, { logoPos = 'top-left', hasLogo = true } = {}) {
    // Compute logo position
    const isTop     = hasLogo && /top/.test(logoPos);
    const posTop    = isTop                                 ? '10mm' : 'auto';
    const posBottom = hasLogo && /bottom/.test(logoPos)     ? '10mm' : 'auto';
    const posLeft   = hasLogo && /left/.test(logoPos)       ? '12mm' : 'auto';
    const posRight  = hasLogo && /right/.test(logoPos)      ? '12mm' : 'auto';

    // Spacing around the logo & header
    const logoSize      = '44mm';  // visible logo width
    const extraGap      = '12mm';  // extra space below the logo
    const defaultTopPad = '14mm';  // header padding without logo
    const headerPadTop  = isTop ? `calc(${posTop} + ${logoSize} + ${extraGap})` : defaultTopPad;

    return `
:root{
  --bg:${vars['--bg-color'] || '#F4F4F6'};
  --bg-dark:${vars['--bg-color-dark'] || '#171717'};
  --bg-light:${vars['--bg-color-light'] || '#28282B'};
  --text:${vars['--font_white_color'] || '#171717'};
  --prime:${vars['--font-prime-color'] || '#DF0000'};
  --btn:${vars['--btn-prime-color'] || '#DF0000'};
  --btn-text:${vars['--btn-prime-font-color'] || '#FFFFFF'};
  --card:${vars['--card-bg-color'] || '#FFFFFF'};
  --border:${vars['--card-border-color'] || '#DEDFE3'};
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font-family: Mulish, Arial, Helvetica, sans-serif;line-height:1.35;font-size:12pt}

/* Header padding adapts to logo height + gap */
.pdf-header{display:flex;align-items:center;justify-content:space-between;padding:${headerPadTop} 14mm 0 14mm}
.pdf-title{margin:0;color:var(--prime);font-size:18pt}
.pdf-content{padding:8mm 14mm 14mm 14mm}

/* Tables */
table{width:100%;border-collapse:collapse;margin:6mm 0}
thead th{background:var(--bg-dark);color:var(--text)}
th,td{border:1px solid var(--border);padding:3mm;text-align:left;vertical-align:top}
tr:nth-child(even) td{background:rgba(0,0,0,0.025)}

/* Logo */
.pdf-logo{
  position:absolute;
  top:${posTop}; bottom:${posBottom}; left:${posLeft}; right:${posRight};
  width:${logoSize}; height:auto; opacity:.95;
}

@media print{ th,td{border-color:#666} }
`;
}

/**
 * Sanitizes a string for use as a file name: strips reserved characters,
 * collapses whitespace to underscores, and limits length.
 *
 * @param {string} name - Raw file name without extension.
 * @returns {string} A sanitized, filesystem-safe file name (no extension).
 */
function sanitizeFilename(name){
    return (name || '')
        .replace(/[\\/:*?"<>|]+/g,'-')
        .replace(/\s+/g,'_')
        .slice(0,120);
}

/**
 * Escapes HTML special characters in a string.
 *
 * @param {string} [s=''] - Raw string to escape.
 * @returns {string} Escaped HTML-safe string.
 */
function escapeHtml(s=''){
    return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* --- Existing board export (status-grouped tables) --- */

/**
 * Builds a full HTML document string for a print tab (logo in the corner, title under it)
 * and injects the provided content HTML unchanged.
 *
 * @param {string} contentHtml - Raw HTML for the task/body content.
 * @param {string} titleText - Title to display at the top and in `<title>`.
 * @returns {string} Complete HTML document as a string.
 */
function buildTaskPdfHtml(contentHtml, titleText) {
  // Absolute logo URL so it loads reliably in about:blank
  const logoUrl = new URL('../../assets/icons/mm-flow-logo-dark.svg', window.location.href).href;

  return `
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${titleText ? String(titleText).replace(/</g,'&lt;') : 'PDF'}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<style>
  /* Base */
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #171717;
    font-family: Arial, Helvetica, sans-serif;
    line-height: 1.4;
  }

  /* Fixed MM Flow logo (top-left) */
  #bbm-logo {
    position: fixed;
    top: 12mm;
    left: 12mm;
    height: 14mm;      /* ~ 50px on A4 */
    width: auto;
    z-index: 9999;
    pointer-events: none;
  }

  /* Page / container */
  .page {
    /* A4 width with inner margin; centered in the browser tab */
    width: 210mm;
    margin: 0 auto;
    padding: 30mm 15mm 20mm 15mm; /* enough top space: 30mm due to logo */
    box-sizing: border-box;
  }

  /* Title (spacing below logo) */
  .doc-title {
    margin: 0 0 10mm 0;     /* extra space below the title */
    padding-top: 8mm;        /* more room below the fixed logo */
    font-size: 18pt;
    font-weight: 700;
    text-align: center;
    color: #171717;
  }

  /* Optional: mild table/content defaults, in case contentHtml includes tables */
  .page table {
    width: 100%;
    border-collapse: collapse;
  }
  .page th, .page td {
    border: 0.2mm solid #DEDFE3;
    padding: 2mm;
    vertical-align: top;
  }

  /* Print: keep the same rules */
  @media print {
    #bbm-logo {
      position: fixed;
      top: 12mm;
      left: 12mm;
      height: 14mm;
    }
    .page {
      width: auto;           /* printing engine uses page format */
      margin: 0;
      padding: 30mm 15mm 20mm 15mm;
    }
  }
</style>
</head>
<body>
  <!-- Fixed logo (top-left) -->
  <img id="bbm-logo" src="${logoUrl}" alt="MM Flow – Strategic Assortment">

  <!-- Page container -->
  <main class="page">
    <h1 class="doc-title">${titleText ? String(titleText).replace(/</g,'&lt;') : ''}</h1>

    <!-- Your task HTML, unchanged -->
    <div class="content">
      ${contentHtml || ''}
    </div>
  </main>
</body>
</html>`;
}

/**
 * Minimal task shape for board tabular export.
 * @typedef {Object} ExportTask
 * @property {string} [title]
 * @property {{ fullname?: string }} [assignee]
 * @property {{ fullname?: string }} [reviewer]
 * @property {string} [priority]
 * @property {string} [due_date]
 */

/**
 * Renders a status section (heading + table) for a list of tasks.
 *
 * @param {string} status - Status name (e.g., "to-do", "in-progress").
 * @param {ExportTask[]} tasks - Tasks belonging to the given status.
 * @returns {string} HTML string for the status block (empty string if no tasks).
 */
function renderStatusTable(status, tasks) {
    if (!tasks.length) return '';
    const rows = tasks.map(t => `
        <tr>
            <td>${escapeHtml(t.title || '')}</td>
            <td>${escapeHtml(t.assignee?.fullname ?? '—')}</td>
            <td>${escapeHtml(t.reviewer?.fullname ?? '—')}</td>
            <td>${escapeHtml(t.priority || '')}</td>
            <td>${escapeHtml(t.due_date ?? '—')}</td>
        </tr>`).join('');
    return `
      <h2>${escapeHtml(status.replace('-', ' ').toUpperCase())}</h2>
      <table>
        <thead>
          <tr><th>Task</th><th>Assignee</th><th>Reviewer</th><th>Prio</th><th>Due</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
}

/**
 * Dynamically loads the html2pdf bundle (via CDN) if not already available.
 * Exposes `window.html2pdf`.
 *
 * @returns {Promise<void>} Resolves once the script has been loaded.
 */
async function loadHtml2Pdf() {
    return new Promise(res => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        s.onload = res;
        document.head.appendChild(s);
    });
}
