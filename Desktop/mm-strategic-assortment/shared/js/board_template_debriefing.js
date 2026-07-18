/*  shared/js/board_template_debriefing.js
 *  Debriefing‑Formular (Editor + PDF)
 */
window.DEBRIEFING_FORM_HTML = `
<style>
  /* Basis‑Layout – übernimmt die Farb‑Variablen deiner App */
  table        { width:100%; border-collapse:collapse; font-size:12pt; }
  th, td       { border:1px solid #fff; padding:4px 6px; text-align:left; vertical-align:top;
                 white-space:normal; word-break:break-word; }          /* Zeilenumbruch */
  thead tr th  { background:var(--font-prime-color); font-weight:700; text-align:left; width: 27mm;color: var(--bg-color)}
  h2,h3        { margin:8mm 0 4mm 0; }

  /* gelber Callout unten */
  .yellowNote  {
      background:var(--font-prime-color);
      font-weight:700;
      font-size:14pt;
      padding:6mm 0;
      text-align:center;
      color: var(--bg-color);
  }

  /* kleiner Hinweis‑Text */
  .autoSaveNote{
      margin-top:8mm;
      font-style:italic;
      color:var(--font_sec_color);
  }
</style>

<h2>Debriefing Fussball</h2>

<!-- ► Grund‑Daten --------------------------------------------------------- -->
<table>
  <tr><th>Spiel</th>             <td contenteditable="true"></td></tr>
  <tr><th>Runde</th>             <td contenteditable="true"></td></tr>
  <tr><th>Datum</th>             <td contenteditable="true"></td></tr>
  <tr><th>Wagen</th>             <td contenteditable="true"></td></tr>
  <tr><th>Projektleitung BBM</th><td contenteditable="true"></td></tr>
  <tr><th>Regie</th>             <td contenteditable="true"></td></tr>
  <tr><th>Produzent</th>         <td contenteditable="true"></td></tr>
  <tr><th>AL</th>                <td contenteditable="true"></td></tr>
  <tr><th>Tech. Leiter</th>      <td contenteditable="true"></td></tr>
  <tr><th>Ton</th>               <td contenteditable="true"></td></tr>
  <tr><th>Grafik</th>            <td contenteditable="true"></td></tr>
  <tr><th>VAR RA</th>            <td contenteditable="true"></td></tr>
</table>


<!-- ► Produktions‑Technik -------------------------------------------------- -->
<h3>Produktions‑Technik</h3>
<table>
  <thead><tr>
    <th>Produktions<br>‑Technik</th>
    <th style="width:21mm"></th>
    <th>Grund</th>
  </tr></thead>
  <tr>
    <td>Probleme<br>RW</td>
    <td style="text-align:center"><input type="checkbox"> Nicht OK</td>
    <td contenteditable="true"></td>
  </tr>
  <tr>
    <td>Probleme<br>Nimbra</td>
    <td style="text-align:center"><input type="checkbox"> Nicht OK</td>
    <td contenteditable="true"></td>
  </tr>
  <tr><td>Notiz</td><td colspan="2" contenteditable="true"></td></tr>
</table>


<!-- ► Multi --------------------------------------------------------------- -->
<h3>Multi</h3>
<table>
  <tr>
    <th>Produktionsablauf</th>
    <td style="text-align:center"><input type="checkbox"> Nicht OK</td>
  </tr>
  <tr>
    <th>Grafik</th>
    <td style="text-align:center"><input type="checkbox"> Nicht OK</td>
  </tr>
  <tr><td>Notiz</td><td contenteditable="true"></td></tr>
</table>


<!-- ► Interview‑Kameras ---------------------------------------------------- -->
<h3>Interview Kameras</h3>
<table>
<thead><tr>
  <th style="width:28mm">Interview<br>Kam.</th>
  <th style="width:16mm">Multi</th>
  <th style="width:18mm">unilat/<br>LiveU</th>
  <th>Notiz</th>
</tr></thead>
<tbody>
  <tr><td>blue D</td><td style="text-align:center"><input type="checkbox"></td><td style="text-align:center"><input type="checkbox"></td><td contenteditable="true"></td></tr>
  <tr><td>blue F</td><td style="text-align:center"><input type="checkbox"></td><td style="text-align:center"><input type="checkbox"></td><td></td></tr>
  <tr><td>SRF</td>   <td style="text-align:center"><input type="checkbox"></td><td style="text-align:center"><input type="checkbox"></td><td></td></tr>
  <tr><td>RTS</td>   <td style="text-align:center"><input type="checkbox"></td><td style="text-align:center"><input type="checkbox"></td><td></td></tr>
  <tr><td>RSI</td>   <td style="text-align:center"><input type="checkbox"></td><td style="text-align:center"><input type="checkbox"></td><td></td></tr>

  <tr><td>Inhouse<br>TV</td>     <td colspan="2" style="text-align:center"><input type="checkbox"> nicht OK</td><td></td></tr>
  <tr><td>Pos.<br>Komms</td>     <td colspan="2" style="text-align:center"><input type="checkbox"> nicht OK</td><td></td></tr>
  <tr><td>Koop.<br>blue</td>     <td colspan="2" style="text-align:center"><input type="checkbox"> nicht OK</td><td></td></tr>

  <tr><td>Notiz</td><td colspan="3" contenteditable="true"></td></tr>
</tbody>
</table>


<!-- ► Leitungen / Signal --------------------------------------------------- -->
<h3>Leitungen / Signal</h3>
<table>
  <tr>
    <th>Glasfaser Orion/SRG</th>
    <td style="text-align:center"><input type="checkbox"> Nicht OK</td>
  </tr>
  <tr>
    <th>Glasfaser Starnet/blue</th>
    <td style="text-align:center"><input type="checkbox"> Nicht OK</td>
  </tr>
  <tr><td>Notiz</td><td contenteditable="true"></td></tr>
</table>


<!-- ► Mitschnitte ---------------------------------------------------------- -->
<h3>Mitschnitte</h3>
<table>
  <thead><tr><th style="width:40mm"></th><th>Anzahl</th><th>Notiz</th></tr></thead>
  <tr><td>Sonstige<br>Mitschnitte</td><td contenteditable="true">-</td><td contenteditable="true"></td></tr>
  <tr><td>Notiz</td><td colspan="2" contenteditable="true"></td></tr>
</table>

<p class="yellowNote">
  BITTE BIS SPÄTESTENS 24:00 UHR AM SPIELTAG<br>
  AUF SHAREPOINT PRODSERV.CH ABLEGEN
</p>

<p class="autoSaveNote">
  Änderungen werden beim Verlassen eines Feldes automatisch gespeichert (Autosave).
</p>
`;