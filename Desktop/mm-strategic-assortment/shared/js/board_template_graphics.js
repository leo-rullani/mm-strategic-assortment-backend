/* ----------------------------------------------------------------- - */
/*  Graphics report – HTML snippet                                   */
/*  ▸ is injected into currentTask.description when a task is created via board.js */
/*    if the board has been recognized as a graphics report.    */
/* ------------------------------------------------------------------ */
(function () {

    /* ---------- help selects ------------------------------------ */
    const yesNoSelect = `
        <select class="rapport_select">
            <option value="" selected>-</option>
            <option>Ja</option>
            <option>Nein</option>
        </select>`;

    const goodBadSelect = `
        <select class="rapport_select">
            <option value="" selected>-</option>
            <option>Gut</option>
            <option>Schlecht</option>
        </select>`;

    const deliverySelect = `
        <select class="rapport_select">
            <option value="" selected>-</option>
            <option>vollst. / pünktlich</option>
            <option>vollst. / spät</option>
            <option>unvollst. / pünktlich</option>
            <option>unvollst. / spät</option>
        </select>`;

    const designerSelect = `
        <select class="rapport_select">
            <option value="" selected>-</option>
            <option>Leo Rullani</option>
            <option>Mike Gsteiger</option>
            <option>Robine Appenzeller</option>
            <option>Ophelia Maier</option>
        </select>`;

    /* ------------------------------------------------------------------ */
    /*  Haupt‑HTML                                                       */
    /* ------------------------------------------------------------------ */
    const GRAPHICS_RAPPORT_FORM_HTML = /*html*/`
<table class="rapport_tbl">
  <thead>
    <tr><th colspan="3"><h2>GFX‑RAPPORT</h2></th></tr>
  </thead>
  <tbody>
    <!-- Grunddaten -------------------------------------------------- -->
    <tr><td>Spiel</td>
        <td contenteditable="true" data-placeholder="WIN – YB"></td></tr>

    <tr><td>Datum</td>
        <td style="display:flex;align-items:center;gap:6px">
            <!-- ► gelbes Icon + Click öffnet Date‑Picker                -->
            <img src="../../assets/icons/calendar_month.svg"
                 alt="Kalender"
                 style="height:20px;width:20px;cursor:pointer"
                 onclick="this.nextElementSibling.showPicker()">
            <!-- ► native Icon wird via CSS ausgeblendet                -->
            <input type="date"
                   class="rapport_date_input"
                   style="flex:1">
        </td>
    </tr>

    <tr><td>Grafiker/in</td><td>${designerSelect}</td></tr>

    <tr><td>Regie</td>
        <td>
          <select class="rapport_select">
            <option value="" selected>-</option>
            <option>A</option>
            <option>B</option>
          </select>
        </td></tr>

    <!-- 1. Kommunikation -------------------------------------------- -->
    <tr class="rapport_section"><th colspan="2">1.&nbsp;Kommunikation</th></tr>
    <tr><td>AL</td><td>${goodBadSelect}</td></tr>
    <tr><td>VAR / 4.OS</td><td>${goodBadSelect}</td></tr>
    <tr><td>MCR / Tech.</td><td>${goodBadSelect}</td></tr>
    <tr><td>Regie</td><td>${goodBadSelect}</td></tr>

    <!-- 2. Infos vor Kickoff ---------------------------------------- -->
    <tr class="rapport_section"><th colspan="2">2.&nbsp;Infos vor Kickoff</th></tr>
    <tr><td>Opta‑Daten</td><td>${deliverySelect}</td></tr>
    <tr><td>Matchblatt</td><td>${deliverySelect}</td></tr>
    <tr><td>Form./Taktik</td><td>${deliverySelect}</td></tr>

    <!-- 3. Vortest --------------------------------------------------- -->
    <tr class="rapport_section"><th colspan="2">3.&nbsp;Grafik‑Vortest</th></tr>
    <tr><td>Grafiktest OK?</td><td>${yesNoSelect}</td></tr>

    <!-- 4. Matchgrafiken -------------------------------------------- -->
    <tr class="rapport_section"><th colspan="2">4.&nbsp;Matchgrafiken</th></tr>
    <tr>
      <td><img class="icon-goal" src="../../assets/icons/soccerball2.png" alt=""> Tore H</td>
      <td contenteditable="true" data-placeholder="#16 1:1"></td>
    </tr>
    <tr>
      <td><img class="icon-yc" src="../../assets/icons/yellow-card.png" alt=""> Gelb H</td>
      <td contenteditable="true" data-placeholder="-"></td>
    </tr>
    <tr>
      <td><img class="icon-rc" src="../../assets/icons/red-card.png" alt=""> Rot H</td>
      <td contenteditable="true" data-placeholder="-"></td>
    </tr>
    <tr>
      <td><img class="icon-goal" src="../../assets/icons/soccerball2.png" alt=""> Tore G</td>
      <td contenteditable="true" data-placeholder="#6 0:1"></td>
    </tr>
    <tr>
      <td><img class="icon-yc" src="../../assets/icons/yellow-card.png" alt=""> Gelb G</td>
      <td contenteditable="true" data-placeholder="-"></td>
    </tr>
    <tr>
      <td><img class="icon-rc" src="../../assets/icons/red-card.png" alt=""> Rot G</td>
      <td contenteditable="true" data-placeholder="-"></td>
    </tr>

    <!-- 5. PlayerPics ----------------------------------------------- -->
    <tr class="rapport_section"><th colspan="2">5.&nbsp;PlayerPics</th></tr>
    <tr><td>Heim vollständig?</td><td>${yesNoSelect}</td></tr>
    <tr><td>Gast vollständig?</td><td>${yesNoSelect}</td></tr>

    <!-- 6. Probleme -------------------------------------------------- -->
    <tr class="rapport_section"><th colspan="2">6.&nbsp;Probleme</th></tr>
    <tr><td colspan="2">
        <textarea class="rapport_textarea"
                  placeholder="Details und sonstige Auffälligkeiten…"
                  style="width:100%;min-height:80px;"></textarea>
    </td></tr>

    <!-- 7. Diskrepanzen --------------------------------------------- -->
    <tr class="rapport_section"><th colspan="2">7.&nbsp;Aufstellungs‑Diskrepanzen</th></tr>
    <tr><td>Abweichungen?</td><td>${yesNoSelect}</td></tr>
    <tr><td colspan="2">
        <textarea class="rapport_textarea"
                  placeholder="sfl.ch 4‑3‑3; Blue on‑air 4‑4‑2"
                  style="width:100%;min-height:60px;"></textarea>
    </td></tr>
  </tbody>
</table>`;

    /* -------------------------------------------------------------- */
    /*  global provision                           */
    /* -------------------------------------------------------------- */
    if (typeof window !== 'undefined') {
        window.GRAPHICS_RAPPORT_FORM_HTML = GRAPHICS_RAPPORT_FORM_HTML;
    }
})();

/* ------------------------------------------------------------------
   Graphics board – Extras: Button "Kits" + Overlays (Grid → Team)
   Persistenz: KV‑API (/api/kv/<key>/) mit Fallback auf localStorage
------------------------------------------------------------------ */
(function () {
  const PAIRS_KEY  = 'bbm.kitPairs.v2';
  const KV_URL     = `/api/kv/${encodeURIComponent(PAIRS_KEY)}/`;
  const ICON_BASE  = '../../assets/icons/';
  const LEAGUE_LOGO = ICON_BASE + 'brack_super_league.svg.png';

  // In‑Memory Cache + Debounce für PUT
  let pairsCache = null;
  let saveTimer  = 0;

  const CLUBS = [
    { id: 'fcb',      name: 'FC Basel 1893',            file: 'fcb.png' },
    { id: 'fcluzern', name: 'FC Luzern',                file: 'fcluzern.svg.png' },
    { id: 'gcz',      name: 'Grasshopper Club Zürich',  file: 'gcz.png' },
    { id: 'ls',       name: 'FC Lausanne‑Sport',        file: 'ls.png' },
    { id: 'fclugano', name: 'FC Lugano',                file: 'fclugano.svg.png' },
    { id: 'sfc',      name: 'Servette FC',              file: 'sfc.png' },
    { id: 'fcwin',    name: 'FC Winterthur',            file: 'fcwin.svg.png' },
    { id: 'fcz',      name: 'FC Zürich',                file: 'fcz.png' },
    { id: 'fcsg',     name: 'FC St. Gallen 1879',       file: 'fcsg.svg.png' },
    { id: 'fcthun',   name: 'FC Thun',                  file: 'fcthun.svg' },
    { id: 'fcsion',   name: 'FC Sion',                  file: 'fcsion.svg' },
    { id: 'yb',       name: 'BSC Young Boys',           file: 'yb.svg.png' },
  ];

  const CLUB_COLORS = {
    fcb:      '#ff0000',
    fcluzern: '#1e467d',
    gcz:      '#005791',
    ls:       '#00248b',
    fclugano: '#000000',
    sfc:      '#66202f',
    fcwin:    '#d21217',
    fcz:      '#002855',
    fcsg:     '#007c3e',
    fcthun:   '#ed272d',
    fcsion:   '#ed2424',
    yb:       '#ffdd00',
  };
  const HOVER_COLORS = { ...CLUB_COLORS };

  /* ========== Styles ========== */
  function injectKitsStyle() {
    if (document.getElementById('gfx-kits-style')) return;
    const css = `
      #gfx-kits-overlay{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);}
      #gfx-kits-overlay.show{display:flex;}
      .gfx-kits-sheet{width:min(1080px,92vw);max-height:90vh;overflow:auto;background:#0f1525;color:#e5e7eb;border-radius:12px;box-shadow:0 18px 64px rgba(0,0,0,.55);padding:18px 18px 22px;}
      .gfx-kits-head{display:flex;align-items:center;gap:12px;margin-bottom:12px}
      .gfx-kits-head img{height:32px}
      .gfx-kits-title{font-size:18px;font-weight:700;color:var(--font_sec_color)}
      .gfx-kits-close{margin-left:auto;border:0;background:#1f2937;color:#e5e7eb;border-radius:8px;padding:6px 10px;cursor:pointer}

      .gfx-kits-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
      .gfx-kits-tile{background:#0b1020;border:1px solid #1f2a44;border-radius:10px;padding:14px;text-align:center;display:grid;gap:8px;cursor:pointer;
                     transition:transform .15s ease, background-color .15s ease, color .15s ease, border-color .15s ease, box-shadow .15s ease}
      .gfx-kits-crest{height:64px;width:64px;object-fit:contain;display:block;margin:0 auto;transition:transform .15s ease, filter .15s ease}
      .gfx-kits-name{font-size:13px;opacity:.9}
      .gfx-kits-tile:hover{transform:translateY(-2px) scale(1.02); background:var(--hover-bg, #101a33); color:var(--hover-fg, #e5e7eb); border-color:rgba(255,255,255,.25);
                           box-shadow:0 10px 28px rgba(0,0,0,.35)}

      .gfx-kits-table{width:100%;border-collapse:collapse}
      .gfx-kits-table th,.gfx-kits-table td{border:1px solid #233152;padding:8px 10px;text-align:left;font-size:13px}
      .gfx-kits-table th{background:#111a2f}
      .gfx-kits-hex{width:120px;text-align:center;font-family:monospace;border:1px solid #2b3852;border-radius:6px;padding:6px;background:#0a0f1e;color:#e5e7eb}
      .gfx-kits-font{width:92px;text-align:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;border:1px solid #2b3852;border-radius:20px;
                     padding:6px 10px;cursor:pointer;background:#111a2f;color:#e5e7eb;transition:transform .12s ease, filter .12s ease}
      .gfx-kits-font:hover{transform:translateY(-1px); filter:brightness(1.05)}
      .gfx-kits-teamhead{display:flex;align-items:center;gap:10px;margin:4px 0 10px}
      .gfx-kits-teamhead img{height:28px;width:28px;object-fit:contain}
      .gfx-kits-back{margin-left:auto;border:0;background:#1f2937;color:#e5e7eb;border-radius:8px;padding:6px 10px;cursor:pointer}

      @media (max-width:900px){.gfx-kits-grid{grid-template-columns:repeat(2,1fr)}}
      @media (max-width:560px){.gfx-kits-grid{grid-template-columns:1fr}}
    `;
    const tag = document.createElement('style');
    tag.id = 'gfx-kits-style';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  /* ========== Persistenz: KV‑API mit Fallback ========== */
  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[-./\\^$*+?()[\]{}|]/g, '\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  async function loadPairs() {
    // 1) Versuche vom Server
    try {
      const resp = await fetch(KV_URL, { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        const val = (data && typeof data.value === 'object' && data.value) || {};
        pairsCache = val;
        try { localStorage.setItem(PAIRS_KEY, JSON.stringify(val)); } catch {}
        return pairsCache;
      }
    } catch (e) {
      console.warn('[Kits] KV load failed, using localStorage fallback:', e);
    }
    // 2) Fallback localStorage
    try {
      pairsCache = JSON.parse(localStorage.getItem(PAIRS_KEY)) || {};
    } catch { pairsCache = {}; }
    return pairsCache;
  }
  function getPairsSync() {
    if (pairsCache) return pairsCache;
    try {
      pairsCache = JSON.parse(localStorage.getItem(PAIRS_KEY)) || {};
    } catch { pairsCache = {}; }
    return pairsCache;
  }
  function savePairs(obj, { debounce = true } = {}) {
    pairsCache = obj || {};
    try { localStorage.setItem(PAIRS_KEY, JSON.stringify(pairsCache)); } catch {}
    if (debounce) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(putPairs, 400);
    } else {
      void putPairs();
    }
  }
  async function putPairs() {
    const csrf = getCookie('csrftoken');
    try {
      const resp = await fetch(KV_URL, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'X-CSRFToken': csrf } : {})
        },
        body: JSON.stringify({ value: pairsCache })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } catch (e) {
      console.warn('[Kits] KV save failed (keine Session/CSRF oder offline). Daten bleiben lokal.', e);
    }
  }
  function pairKey(homeId, awayId) { return `${homeId}|${awayId}`; }

  /* ========== Utilities ========== */
  function normalizeHex(v) {
    if (!v) return '';
    let s = v.trim().replace(/^#/,'');
    if (/^[0-9a-f]{3}$/i.test(s)) s = s.split('').map(ch=>ch+ch).join('');
    if (!/^[0-9a-f]{6}$/i.test(s)) return '';
    return '#'+s.toLowerCase();
  }
  function bestTextColor(hex) {
    if (!hex) return '#e5e7eb';
    const h = hex.replace('#','');
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    const toLin = v => (v<=10) ? v/3294 : Math.pow((v/255 + 0.055)/1.055, 2.4);
    const L = 0.2126*toLin(r) + 0.7152*toLin(g) + 0.0722*toLin(b);
    const white = 1.05/(L+0.05), black = (L+0.05)/0.05;
    return white>black ? '#FFFFFF' : '#000000';
  }
  function inverse(hex) { return hex === '#000000' ? '#FFFFFF' : '#000000'; }

  function setFontPill(pill, hexColor, manual=false) {
    const val = (hexColor || '#FFFFFF').toUpperCase();
    pill.dataset.val = val;
    pill.dataset.manual = manual ? '1' : '0';
    pill.textContent = (val === '#000000') ? 'Black' : 'White';
    pill.style.background = val;
    pill.style.color = inverse(val);
  }
  function toggleFontPill(pill) {
    const next = (pill.dataset.val === '#000000') ? '#FFFFFF' : '#000000';
    setFontPill(pill, next, true);
    persistRowValue(pill.closest('tr'));
  }
  function applyInputPreview(input, relatedPill) {
    const hex = normalizeHex(input.value);
    if (!hex) { input.style.background=''; input.style.color=''; return; }
    input.style.background = hex;
    input.style.color = bestTextColor(hex);
    if (relatedPill && relatedPill.dataset.manual !== '1') {
      const rec = bestTextColor(hex);
      setFontPill(relatedPill, rec, false);
    }
  }

  /* ========== Overlay & Grid ========== */
  function ensureOverlay() {
    injectKitsStyle();
    let ov = document.getElementById('gfx-kits-overlay');
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = 'gfx-kits-overlay';
    ov.innerHTML = `
      <div class="gfx-kits-sheet" role="dialog" aria-modal="true" aria-label="Kits">
        <div class="gfx-kits-head">
          <img src="${LEAGUE_LOGO}" alt="Brack Super League">
          <div class="gfx-kits-title">Jersey overview Brack Super League season 2025/2026</div>
          <button class="gfx-kits-close" type="button" aria-label="Close">✕</button>
        </div>
        <div id="gfx-kits-body"></div>
      </div>`;
    document.body.appendChild(ov);
    ov.querySelector('.gfx-kits-close').addEventListener('click', closeOverlay);
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) closeOverlay(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ov.classList.contains('show')) closeOverlay(); });
    return ov;
  }
  function openOverlay()  { ensureOverlay().classList.add('show'); }
  function closeOverlay() { const ov = document.getElementById('gfx-kits-overlay'); if (ov) ov.classList.remove('show'); }

  function showGrid() {
    const body = ensureOverlay().querySelector('#gfx-kits-body');
    body.innerHTML = `<div class="gfx-kits-grid"></div>`;
    const grid = body.firstElementChild;

    CLUBS.forEach(c => {
      const tile = document.createElement('div');
      tile.className = 'gfx-kits-tile';
      const bg = HOVER_COLORS[c.id];
      if (bg) {
        const fg = bestTextColor(normalizeHex(bg));
        tile.style.setProperty('--hover-bg', bg);
        tile.style.setProperty('--hover-fg', fg);
      }
      tile.setAttribute('data-club', c.id);
      tile.innerHTML = `
        <img class="gfx-kits-crest" src="${ICON_BASE + c.file}" alt="${c.name}">
        <div class="gfx-kits-name">${c.name}</div>`;
      tile.addEventListener('click', () => showTeam(c.id));
      grid.appendChild(tile);
    });
    openOverlay();
  }

  /* ========== Team‑Ansicht ========== */
  async function showTeam(homeId) {
    // Stelle sicher, dass Paare geladen sind (Server → Fallback)
    const pairs = await loadPairs();

    const body = ensureOverlay().querySelector('#gfx-kits-body');
    const homeClub = CLUBS.find(c => c.id === homeId);

    body.innerHTML = `
      <div class="gfx-kits-teamhead">
        <img src="${ICON_BASE + homeClub.file}" alt="${homeClub.name}">
        <strong>${homeClub.name}</strong>
        <button class="gfx-kits-back" type="button">Back</button>
      </div>
      <table class="gfx-kits-table">
        <thead>
          <tr>
            <th style="width:27%">Home Club</th>
            <th style="width:13%">Shirt</th>
            <th style="width:10%">Font</th>
            <th style="width:27%">Away Club</th>
            <th style="width:13%">Shirt</th>
            <th style="width:10%">Font</th>
          </tr>
        </thead>
        <tbody id="gfx-kits-rows"></tbody>
      </table>
    `;
    body.querySelector('.gfx-kits-back').addEventListener('click', showGrid);

    const tbody = body.querySelector('#gfx-kits-rows');

    CLUBS.filter(c => c.id !== homeId).forEach(awayClub => {
      const key = pairKey(homeId, awayClub.id);
      const val = pairs[key] || {};
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${homeClub.name}</td>
        <td><input class="gfx-kits-hex" data-home="${homeId}" data-away="${awayClub.id}" data-side="home" placeholder="#000000" value="${val.home || ''}"></td>
        <td><button class="gfx-kits-font" data-home="${homeId}" data-away="${awayClub.id}" data-side="home">Font</button></td>
        <td>${awayClub.name}</td>
        <td><input class="gfx-kits-hex" data-home="${homeId}" data-away="${awayClub.id}" data-side="away" placeholder="#FFFFFF" value="${val.away || ''}"></td>
        <td><button class="gfx-kits-font" data-home="${homeId}" data-away="${awayClub.id}" data-side="away">Font</button></td>
      `;
      tbody.appendChild(tr);

      const homeInput = tr.querySelector('input.gfx-kits-hex[data-side="home"]');
      const awayInput = tr.querySelector('input.gfx-kits-hex[data-side="away"]');
      const homePill  = tr.querySelector('button.gfx-kits-font[data-side="home"]');
      const awayPill  = tr.querySelector('button.gfx-kits-font[data-side="away"]');

      // Club-Zellen einfärben
      const homeCell = tr.children[0];
      const awayCell = tr.children[3];
      const homeClubColor = CLUB_COLORS[homeId] || '#0b1020';
      const awayClubColor = CLUB_COLORS[awayClub.id] || '#0b1020';
      homeCell.style.background = homeClubColor;
      homeCell.style.color = (homeId === 'yb') ? '#000000' : '#FFFFFF';
      homeCell.style.fontWeight = '600';
      awayCell.style.background = awayClubColor;
      awayCell.style.color = (awayClub.id === 'yb') ? '#000000' : '#FFFFFF';
      awayCell.style.fontWeight = '600';

      // Schriftfarbe-Regel: immer Weiß, außer YB = Schwarz
      setFontPill(homePill, (homeId === 'yb') ? '#000000' : '#FFFFFF', true);
      setFontPill(awayPill, (awayClub.id === 'yb') ? '#000000' : '#FFFFFF', true);

      // Preview
      applyInputPreview(homeInput, homePill);
      applyInputPreview(awayInput, awayPill);

      // Toggle Font
      homePill.addEventListener('click', () => { toggleFontPill(homePill); });
      awayPill.addEventListener('click', () => { toggleFontPill(awayPill); });
    });

    // Live‑Preview & Persist
    tbody.addEventListener('input', (e) => {
      if (!e.target.classList.contains('gfx-kits-hex')) return;
      const pill = e.target.closest('tr').querySelector(`.gfx-kits-font[data-side="${e.target.dataset.side}"]`);
      applyInputPreview(e.target, pill);
    });
    tbody.addEventListener('blur', (e) => {
      if (!e.target.classList.contains('gfx-kits-hex')) return;
      const tr = e.target.closest('tr');
      persistRowValue(tr);
    }, true);

    openOverlay();
  }

  function persistRowValue(tr) {
    const h  = tr.querySelector('.gfx-kits-hex[data-side="home"]');
    const a  = tr.querySelector('.gfx-kits-hex[data-side="away"]');
    const hp = tr.querySelector('.gfx-kits-font[data-side="home"]');
    const ap = tr.querySelector('.gfx-kits-font[data-side="away"]');

    const homeId = h.dataset.home, awayId = h.dataset.away;
    const key = pairKey(homeId, awayId);

    const state = { ...getPairsSync() };
    state[key] = {
      home: normalizeHex(h.value) || '',
      away: normalizeHex(a.value) || '',
      homeFont: hp.dataset.val || '',
      awayFont: ap.dataset.val || '',
      homeFontManual: hp.dataset.manual === '1',
      awayFontManual: ap.dataset.manual === '1'
    };
    savePairs(state, { debounce: true });
  }

  /* ========== Button neben "GFX‑Manual" ========== */
  function attachKitsButton() {
    if (document.querySelector('.gfx-kits-btn')) return;
    const manualBtn = Array.from(document.querySelectorAll('button,a'))
      .find(el => /gfx.?manual/i.test((el.textContent || '').trim()));
    if (!manualBtn) return;

    const kitsBtn = document.createElement(manualBtn.tagName === 'A' ? 'a' : 'button');
    if (manualBtn.tagName !== 'A') kitsBtn.type = 'button';
    kitsBtn.textContent = 'Kits';
    if (manualBtn.className) kitsBtn.className = manualBtn.className + ' gfx-kits-btn';
    kitsBtn.addEventListener('click', showGrid);
    manualBtn.insertAdjacentElement('afterend', kitsBtn);
  }

  document.addEventListener('DOMContentLoaded', attachKitsButton);

  // Optional expose
  if (typeof window !== 'undefined') {
    window.showGfxKitsGrid = showGrid;
    window.showGfxKitsTeam = showTeam;
  }
})();

/* ------------------------------------------------------------------
   Graphics board – Overlay "Staff & Player Pics"
   (mit Server-Persistenz über /api/kv/bbm.staff.v1/)
------------------------------------------------------------------ */
(function () {
  const ICON_BASE   = '../../assets/icons/';
  const LEAGUE_LOGO = ICON_BASE + 'brack_super_league.svg.png';
  const DELETE_ICON = ICON_BASE + 'delete.svg';
  const STATE_KEY   = 'bbm.staff.v1'; // lokaler Cache + Server-Key

  const CLUBS = [
    { id: 'fcb',      name: 'FC Basel 1893',            file: 'fcb.png',          color: '#ff0000' },
    { id: 'fcluzern', name: 'FC Luzern',                file: 'fcluzern.svg.png', color: '#1e467d' },
    { id: 'gcz',      name: 'Grasshopper Club Zürich',  file: 'gcz.png',          color: '#005791' },
    { id: 'ls',       name: 'FC Lausanne‑Sport',        file: 'ls.png',           color: '#00248b' },
    { id: 'fclugano', name: 'FC Lugano',                file: 'fclugano.svg.png', color: '#000000' },
    { id: 'sfc',      name: 'Servette FC',              file: 'sfc.png',          color: '#66202f' },
    { id: 'fcwin',    name: 'FC Winterthur',            file: 'fcwin.svg.png',    color: '#d21217' },
    { id: 'fcz',      name: 'FC Zürich',                file: 'fcz.png',          color: '#002855' },
    { id: 'fcsg',     name: 'FC St. Gallen 1879',       file: 'fcsg.svg.png',     color: '#007c3e' },
    { id: 'fcthun',   name: 'FC Thun',                  file: 'fcthun.svg',       color: '#ed272d' },
    { id: 'fcsion',   name: 'FC Sion',                  file: 'fcsion.svg',       color: '#ed2424' },
    { id: 'yb',       name: 'BSC Young Boys',           file: 'yb.svg.png',       color: '#ffdd00' },
  ];

  /* ===================== Utils ===================== */
  function normHex(v){ if(!v) return ''; let s=String(v).trim().replace(/^#/, ''); if(/^[0-9a-f]{3}$/i.test(s)) s=s.split('').map(ch=>ch+ch).join(''); return /^[0-9a-f]{6}$/i.test(s) ? '#'+s.toLowerCase() : ''; }
  function bestTextColor(hex){
    const h = (hex||'#000').replace('#',''); const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    const toLin = v => (v<=10) ? v/3294 : Math.pow((v/255 + 0.055)/1.055, 2.4);
    const L = 0.2126*toLin(r) + 0.7152*toLin(g) + 0.0722*toLin(b);
    return (1.05/(L+0.05) > (L+0.05)/0.05) ? '#FFFFFF' : '#000000';
  }
  function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function asInt(v){ const n = parseInt(String(v).trim(),10); return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY; }

  /* ===================== Server‑Persistenz (KV) ===================== */
  const API_KV_URL = (key) => `/api/kv/${encodeURIComponent(key)}/`;
  const _kvTimers = Object.create(null);

  function getCsrfToken() {
    const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  async function syncStaffFromServer() {
    try {
      const resp = await fetch(API_KV_URL(STATE_KEY), { credentials: 'include' });
      if (!resp.ok) return loadState();
      const data = await resp.json();
      if (data && data.value && typeof data.value === 'object') {
        localStorage.setItem(STATE_KEY, JSON.stringify(data.value));
        return data.value;
      }
    } catch (_) {}
    return loadState();
  }

  function kvSaveDebounced(key, value, wait = 400) {
    localStorage.setItem(key, JSON.stringify(value));
    if (_kvTimers[key]) window.clearTimeout(_kvTimers[key]);
    _kvTimers[key] = window.setTimeout(async () => {
      try {
        await fetch(API_KV_URL(key), {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          body: JSON.stringify({ value }),
        });
      } catch (_) {/* retry on next edit */}
    }, wait);
  }

  /* ===================== Styles/Overlay ===================== */
  function injectStaffStyle() {
    if (document.getElementById('gfx-staff-style')) return;
    const css = `
      #gfx-staff-overlay{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);}
      #gfx-staff-overlay.show{display:flex;}
      .gfx-staff-sheet{width:min(1120px,96vw);max-height:96vh;overflow:auto;background:#0f1525;color:#e5e7eb;border-radius:12px;box-shadow:0 18px 64px rgba(0,0,0,.55);padding:18px 18px 22px;}
      .gfx-staff-head{display:flex;align-items:center;gap:12px;margin-bottom:12px}
      .gfx-staff-head img{height:32px}
      .gfx-staff-title{font-size:18px;font-weight:700;color:var(--font_sec_color)}
      .gfx-staff-tools{display:flex;gap:8px;margin-left:12px}
      .gfx-staff-btn{border:0;border-radius:8px;background:#1f2937;color:#e5e7eb;padding:6px 10px;cursor:pointer}
      .gfx-staff-btn:hover{filter:brightness(1.05)}
      .gfx-staff-back{margin-left:auto;border:0;background:#1f2937;color:#e5e7eb;border-radius:8px;padding:6px 10px;cursor:pointer}
      .club-badge{border-radius:6px;padding:3px 8px;font-weight:600;margin-left:8px}
      .yb-dark{color:#000}
      .gfx-staff-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
      .gfx-staff-tile{background:#0b1020;border:1px solid #1f2a44;border-radius:10px;padding:14px;text-align:center;display:grid;gap:8px;cursor:pointer;transition:transform .15s ease, background-color .15s ease, color .15s ease, border-color .15s ease, box-shadow .15s ease}
      .gfx-staff-crest{height:64px;width:64px;object-fit:contain;display:block;margin:0 auto;transition:transform .15s ease, filter .15s ease}
      .gfx-staff-name{font-size:13px;opacity:.9}
      .gfx-staff-tile:hover{transform:translateY(-2px) scale(1.02); background:var(--hover-bg, #101a33); color:var(--hover-fg, #e5e7eb); border-color:rgba(255,255,255,.25); box-shadow:0 10px 28px rgba(0,0,0,.35)}
      .gfx-staff-table{width:100%;border-collapse:collapse;table-layout:fixed}
      .gfx-staff-table th,.gfx-staff-table td{border:1px solid #233152;padding:8px 10px;text-align:left;font-size:13px;vertical-align:middle}
      .gfx-staff-table th{background:#111a2f;position:sticky;top:0;z-index:1}
      .col-num{width:88px;text-align:center;font-weight:700}
      .col-first{width:24%}
      .col-last{width:26%}
      .col-onair{width:30%}
      .col-portrait{width:8%; text-align:center}
      .col-delete{width:8%; text-align:center}
      .p-onair-input,.p-txt{width:100%;border:1px solid #2b3852;border-radius:6px;padding:8px 10px;background:#0a0f1e;color:#e5e7eb;font-size:14px}
      .inp-num{font-size:14px;text-align:center}
      .portrait-wrap{display:flex;align-items:center;justify-content:center}
      .chk-yellow{appearance:none;position:relative;width:20px;height:20px;border-radius:4px;border:1px solid #b38f00;background:#ffdd00;cursor:pointer;display:inline-block;transition:filter .15s ease, transform .1s ease}
      .chk-yellow:hover{filter:brightness(1.05)}
      .chk-yellow:active{transform:scale(0.96)}
      .chk-yellow::after{content:'\\2713'; position:absolute; inset:0; display:grid; place-items:center; color:#111; font-size:15px; font-weight:900; transform:scale(0); transition:transform .12s ease}
      .chk-yellow:checked::after{transform:scale(1)}
      .btn-del{height:20px;width:20px;cursor:pointer;opacity:.9;transition:transform .12s ease, filter .15s ease}
      .btn-del:hover{transform:scale(1.06); filter:brightness(1.1)}
      @media (max-width:900px){.gfx-staff-grid{grid-template-columns:repeat(2,1fr)}}
      @media (max-width:560px){.gfx-staff-grid{grid-template-columns:1fr}}
    `;
    const tag = document.createElement('style');
    tag.id = 'gfx-staff-style';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  function ensureOverlay() {
    injectStaffStyle();
    let ov = document.getElementById('gfx-staff-overlay');
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = 'gfx-staff-overlay';
    ov.innerHTML = `
      <div class="gfx-staff-sheet" role="dialog" aria-modal="true" aria-label="Staff & Player Pics">
        <div class="gfx-staff-head">
          <img src="${LEAGUE_LOGO}" alt="Swiss Super League" style="height:32px;width:auto;">
          <div class="gfx-staff-title">Staff & Player Pics – Swiss Super League</div>
          <div class="gfx-staff-tools"></div>
          <button class="gfx-staff-back" type="button" aria-label="Close">Back</button>
        </div>
        <div id="gfx-staff-body"></div>
      </div>`;
    document.body.appendChild(ov);
    ov.querySelector('.gfx-staff-back').addEventListener('click', closeOverlay);
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) closeOverlay(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ov.classList.contains('show')) closeOverlay(); });
    return ov;
  }
  function openOverlay()  { ensureOverlay().classList.add('show'); }
  function closeOverlay() { const ov = document.getElementById('gfx-staff-overlay'); if (ov) ov.classList.remove('show'); }

  /* ===================== Persistenz (Cache + Helfer) ===================== */
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STATE_KEY)) || {};
      s.players = s.players || {}; // "<club>:<pid>" → { onAirName, portrait }
      s.manual  = s.manual  || {}; // clubId → [manuelle Spieler]
      s.hidden  = s.hidden  || {}; // clubId → [ausgeblendete Basis-IDs]
      return s;
    } catch { return { players:{}, manual:{}, hidden:{} }; }
  }
  function saveState(s) { kvSaveDebounced(STATE_KEY, s); }
  function pKey(clubId, playerId) { return `${clubId}:${playerId}`; }
  function getManual(clubId){ const s=loadState(); return Array.isArray(s.manual[clubId]) ? s.manual[clubId] : []; }
  function setManual(clubId, arr){ const s=loadState(); s.manual[clubId]=arr; saveState(s); }
  function getHidden(clubId){ const s=loadState(); return Array.isArray(s.hidden[clubId]) ? s.hidden[clubId] : []; }
  function setHidden(clubId, arr){ const s=loadState(); s.hidden[clubId]=arr; saveState(s); }

  /* ===================== Grid (Team-Auswahl) ===================== */
  function showGrid() {
    const body = ensureOverlay().querySelector('#gfx-staff-body');
    body.innerHTML = `<div class="gfx-staff-grid"></div>`;
    const grid = body.firstElementChild;

    CLUBS.forEach(c => {
      const tile = document.createElement('div');
      tile.className = 'gfx-staff-tile';
      const bg = normHex(c.color);
      if (bg) {
        tile.style.setProperty('--hover-bg', bg);
        tile.style.setProperty('--hover-fg', bestTextColor(bg));
      }
      tile.setAttribute('data-club', c.id);
      tile.innerHTML = `
        <img class="gfx-staff-crest" src="${ICON_BASE + c.file}" alt="${c.name}">
        <div class="gfx-staff-name">${c.name}</div>`;
      tile.addEventListener('click', () => showTeam(c.id));
      grid.appendChild(tile);
    });
    openOverlay();
  }

  /* ===================== Team-Ansicht ===================== */
  async function showTeam(clubId) {
    // Vor dem Rendern: State vom Server holen (falls möglich)
    await syncStaffFromServer();

    const club = CLUBS.find(c => c.id === clubId);
    const body = ensureOverlay().querySelector('#gfx-staff-body');

    const clubFg = (clubId === 'yb') ? '#000000' : '#FFFFFF';
    const clubBg = club.color;

    body.innerHTML = `
      <div class="gfx-staff-teamhead" style="display:flex;align-items:center;gap:10px;margin:4px 0 14px">
        <img src="${ICON_BASE + club.file}" alt="${club.name}" style="height:28px;width:28px;object-fit:contain;">
        <strong>${club.name}</strong>
        <span class="club-badge ${clubId==='yb'?'yb-dark':''}" style="background:${clubBg};color:${clubFg}">Staff</span>
      </div>
      <table class="gfx-staff-table" id="gfx-staff-table">
        <colgroup>
          <col class="col-num"><col class="col-first"><col class="col-last"><col class="col-onair"><col class="col-portrait"><col class="col-delete">
        </colgroup>
        <thead>
          <tr>
            <th>#</th>
            <th>First name</th>
            <th>Last name</th>
            <th>On‑Air</th>
            <th>Portrait</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>`;

    // Toolbar
    const tools = ensureOverlay().querySelector('.gfx-staff-tools');
    tools.innerHTML = '';
    const btnAdd  = document.createElement('button');
    btnAdd.className = 'gfx-staff-btn';  btnAdd.textContent = '＋ Row';
    const btnSort = document.createElement('button');
    btnSort.className = 'gfx-staff-btn'; btnSort.textContent = '# ↑ Sort';
    tools.appendChild(btnAdd); tools.appendChild(btnSort);

    const tbody = body.querySelector('tbody');
    const st = loadState();

    // 1) Base (API/Stub)
    let basePlayers = await fetchStaff(clubId);
    // 2) Hidden filter
    const hidden = new Set(getHidden(clubId));
    basePlayers = basePlayers.filter(p => !hidden.has(p.id));
    // 3) Manual
    const manualPlayers = getManual(clubId);

    // Render
    basePlayers.forEach(pl => appendRow(tbody, clubId, pl, /*isManual*/false, st));
    manualPlayers.forEach(pl => appendRow(tbody, clubId, pl, /*isManual*/true,  st));

    // Add row
    btnAdd.addEventListener('click', () => {
      const man = getManual(clubId);
      const id = `manual-${Date.now()}`;
      const pl = { id, number:'', last_name:'', first_name:'', on_air_name:'', portrait_present:false };
      man.push(pl); setManual(clubId, man);
      appendRow(tbody, clubId, pl, true, loadState());
    });

    // Sort
    btnSort.addEventListener('click', () => {
      sortByNumberAsc(tbody);
      persistManualOrderFromDOM(tbody, clubId);
    });

    // Delegation: edits + delete
    tbody.addEventListener('input',  (e) => handleEdit(e, clubId));
    tbody.addEventListener('change', (e) => handleEdit(e, clubId));
    tbody.addEventListener('click',  (e) => {
      const btn = e.target.closest('.btn-del');
      if (!btn) return;
      const tr = btn.closest('tr'); if (!tr) return;
      const isManual = tr.dataset.manual === '1';
      const pid = tr.dataset.id;
      if (!pid) return;

      if (isManual) {
        const man = getManual(clubId).filter(x => x.id !== pid);
        setManual(clubId, man);
      } else {
        const h = new Set(getHidden(clubId)); h.add(pid); setHidden(clubId, Array.from(h));
      }
      tr.remove();
    });

    openOverlay();
  }

  function appendRow(tbody, clubId, pl, isManual, st) {
    const key = pKey(clubId, pl.id);
    const saved = (st.players && st.players[key]) || {};
    const onAir = isManual ? (pl.on_air_name || '') : (saved.onAirName ?? pl.on_air_name ?? '');
    const portrait = isManual ? !!pl.portrait_present : ((typeof saved.portrait === 'boolean') ? saved.portrait : !!pl.portrait_present);

    const tr = document.createElement('tr');
    tr.dataset.id = pl.id;
    tr.dataset.manual = isManual ? '1' : '0';

    tr.innerHTML = isManual ? `
      <td class="col-num">
        <input class="p-txt inp-num" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="" value="${escapeHtml(pl.number||'')}" />
      </td>
      <td class="col-first"><input class="p-txt inp-first" type="text" value="${escapeHtml(pl.first_name||'')}"></td>
      <td class="col-last"><input class="p-txt inp-last"  type="text" value="${escapeHtml(pl.last_name||'')}"></td>
      <td class="col-onair"><input class="p-onair-input"   type="text" value="${escapeHtml(onAir)}" data-club="${clubId}" data-pid="${pl.id}"></td>
      <td class="col-portrait">
        <div class="portrait-wrap">
          <input class="chk-yellow" type="checkbox" ${portrait ? 'checked' : ''} data-club="${clubId}" data-pid="${pl.id}">
        </div>
      </td>
      <td class="col-delete">
        <img class="btn-del" src="${DELETE_ICON}" alt="Delete row" title="Delete row">
      </td>
    ` : `
      <td class="col-num">${escapeHtml(pl.number ?? '')}</td>
      <td class="col-first">${escapeHtml(pl.first_name ?? '')}</td>
      <td class="col-last">${escapeHtml(pl.last_name ?? '')}</td>
      <td class="col-onair"><input class="p-onair-input" type="text" value="${escapeHtml(onAir)}" data-club="${clubId}" data-pid="${pl.id}"></td>
      <td class="col-portrait">
        <div class="portrait-wrap">
          <input class="chk-yellow" type="checkbox" ${portrait ? 'checked' : ''} data-club="${clubId}" data-pid="${pl.id}">
        </div>
      </td>
      <td class="col-delete">
        <img class="btn-del" src="${DELETE_ICON}" alt="Delete row" title="Delete row">
      </td>
    `;

    tbody.appendChild(tr);
  }

  function handleEdit(e, clubId) {
    const el = e.target;
    const tr = el.closest('tr'); if (!tr) return;
    const isManual = tr.dataset.manual === '1';
    const pid = tr.dataset.id; if (!pid) return;

    if (isManual) {
      const man = getManual(clubId);
      const idx = man.findIndex(x => x.id === pid);
      if (idx !== -1) {
        man[idx].number = tr.querySelector('.inp-num')?.value || '';
        man[idx].first_name = tr.querySelector('.inp-first')?.value || '';
        man[idx].last_name = tr.querySelector('.inp-last')?.value || '';
        man[idx].on_air_name = tr.querySelector('.p-onair-input')?.value || '';
        man[idx].portrait_present = !!tr.querySelector('.chk-yellow')?.checked;
        setManual(clubId, man); // → debounced PUT
      }
    } else {
      const s = loadState();
      const key = pKey(clubId, pid);
      s.players[key] = s.players[key] || {};
      if (el.classList.contains('p-onair-input')) s.players[key].onAirName = el.value.trim();
      if (el.classList.contains('chk-yellow'))     s.players[key].portrait  = el.checked;
      saveState(s); // → debounced PUT
    }
  }

  function sortByNumberAsc(tbody) {
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a,b) => {
      const aNumEl = a.querySelector('.inp-num') || a.querySelector('.col-num');
      const bNumEl = b.querySelector('.inp-num') || b.querySelector('.col-num');
      const aVal = a.querySelector('.inp-num') ? aNumEl.value : aNumEl.textContent;
      const bVal = b.querySelector('.inp-num') ? bNumEl.value : bNumEl.textContent;
      return asInt(aVal) - asInt(bVal);
    });
    rows.forEach(r => tbody.appendChild(r));
  }

  function persistManualOrderFromDOM(tbody, clubId) {
    const rows = Array.from(tbody.querySelectorAll('tr[data-manual="1"]'));
    const newOrder = rows.map(tr => ({
      id: tr.dataset.id,
      number: tr.querySelector('.inp-num')?.value || '',
      first_name: tr.querySelector('.inp-first')?.value || '',
      last_name: tr.querySelector('.inp-last')?.value || '',
      on_air_name: tr.querySelector('.p-onair-input')?.value || '',
      portrait_present: !!tr.querySelector('.chk-yellow')?.checked
    }));
    setManual(clubId, newOrder); // → debounced PUT
  }

  /* ---------- Data loader (API / Stub) ---------- */
  async function fetchStaff(clubId) {
    try {
      const resp = await fetch(`/api/roster?club=${encodeURIComponent(clubId)}`, { credentials: 'include' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (Array.isArray(json?.players)) return json.players;
    } catch (e) {
      return []; // Stub: keine Basisdaten → nur manuell
    }
  }

  /* ---------- Button-Injektion (robust) ---------- */

  // kleine Styles für FAB-Fallback:
  (function injectFabStyle(){
    if (document.getElementById('gfx-roster-fab-style')) return;
    const s = document.createElement('style');
    s.id = 'gfx-roster-fab-style';
    s.textContent = `
      .gfx-roster-fab{
        position:fixed; right:16px; bottom:16px; z-index:1001;
        border:0; border-radius:10px; padding:10px 12px;
        background:#1f2937; color:#e5e7eb; cursor:pointer;
        box-shadow:0 6px 20px rgba(0,0,0,.35)
      }
      .gfx-roster-fab:hover{ filter:brightness(1.05) }
    `;
    document.head.appendChild(s);
  })();

  function normalizeLabel(s){
    return (s || '')
      .toLowerCase()
      .replace(/\s+/g,'')
      .replace(/[\u00A0\u202F\-–—_/.,:;]+/g,''); // NBSP, Dash, etc.
  }

  function findManualButton() {
    const nodes = document.querySelectorAll('button,a,[role="button"]');
    for (const el of nodes) {
      const label = normalizeLabel(el.textContent);
      const aria  = normalizeLabel(el.getAttribute('aria-label'));
      const href  = (el.getAttribute('href') || '').toLowerCase();
      if (label.includes('gfxmanual') || label.includes('graphicsmanual')) return el;
      if (aria.includes('gfxmanual')  || aria.includes('graphicsmanual'))  return el;
      if (/manual/.test(href) && /(gfx|graphic)/.test(href)) return el;
    }
    return null;
  }

  function injectRosterButton() {
    if (document.querySelector('.gfx-roster-btn')) return true;
    const manualBtn = findManualButton();
    if (!manualBtn) return false;

    // Erzeuge Button (bewusst immer <button>, damit kein Navigieren)
    const rosterBtn = document.createElement('button');
    rosterBtn.type = 'button';
    rosterBtn.textContent = 'Staff & Player Pics';
    // Klassen übernehmen – aber "hidden" entfernen, damit sichtbar:
    if (manualBtn.className) {
      rosterBtn.className = manualBtn.className.replace(/\bhidden\b/g, '').trim();
    }
    rosterBtn.classList.add('gfx-roster-btn');
    rosterBtn.style.display = '';   // sichtbar erzwingen
    rosterBtn.style.visibility = '';
    rosterBtn.addEventListener('click', (e) => { e.preventDefault(); showGrid(); });

    manualBtn.insertAdjacentElement('afterend', rosterBtn);
    return true;
  }

  function injectFabFallback() {
    if (document.querySelector('.gfx-roster-btn') || document.querySelector('.gfx-roster-fab')) return;
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'gfx-roster-fab';
    fab.textContent = 'Staff & Player Pics';
    fab.addEventListener('click', (e) => { e.preventDefault(); showGrid(); });
    document.body.appendChild(fab);
  }

  function setupButtonInjection() {
    // 1) Sofortiger Versuch
    if (injectRosterButton()) return;

    // 2) Beobachte DOM-Änderungen (SPA/late render)
    const obs = new MutationObserver(() => {
      if (injectRosterButton()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // 3) Fallback-FAB nach kurzer Zeit, falls nichts gefunden
    setTimeout(injectFabFallback, 1500);
  }

  document.addEventListener('DOMContentLoaded', setupButtonInjection);

  // Expose für schnelle Debug-Tests in der Konsole:
  if (typeof window !== 'undefined') {
    window.showGfxRosterGrid = showGrid;
    window.showGfxRosterTeam = showTeam;
    window.__forceRosterBtn = setupButtonInjection;
  }
})();