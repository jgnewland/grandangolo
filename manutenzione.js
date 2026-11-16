/* Pagina di cortesia dell'edicola.
   true  = edicola chiusa per lavori (i lettori vedono manutenzione.html)
   false = edicola aperta normalmente
   Per vedere comunque l'edicola durante i lavori: edicola.grandangoloregionale.it/?anteprima=1 */
window.GG_MANUTENZIONE = true;
(function () {
  if (!window.GG_MANUTENZIONE) return;
  try {
    var q = location.search;
    if (/[?&]anteprima=1/.test(q)) { sessionStorage.setItem('gg_anteprima', '1'); return; }
    if (sessionStorage.getItem('gg_anteprima') === '1') return;
  } catch (e) {}
  location.replace('/manutenzione.html');
})();
