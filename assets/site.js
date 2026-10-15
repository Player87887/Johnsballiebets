/* ═══════════════════════════════════════════════════════════════════════════
   John's Ballie Bets — gedeeld script voor alle pagina's
   ─────────────────────────────────────────────────────────────────────────
   Eén regel in elke pagina, vlak voor </body>:
       <script src="../assets/site.js" defer></script>      (radar/, picks/, beheer/, historie/)
       <script src="assets/site.js" defer></script>          (de homepage)

   Wat het doet:
     1. Favicon + app-icoon (logo) op elke pagina.
     2. Het logo links in de navigatiebalk (de balk met Value Radar · Picks · …).
     3. Serverstatus rechts in die balk: ● online / ⏸ gepauzeerd / ● offline.
        Bron: server.json op de branch 'status' van de repo. De server zet daar
        elke 10 minuten een 'heartbeat' neer (scripts/server_status.py).
        Staat er een element met id="jb-status" op de pagina, dan komt de
        status (ook) daar, in het groot.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Repo voor het statusbestand. Op <naam>.github.io/<repo>/ wordt hij uit de
  // URL afgeleid; op een eigen domein geldt deze standaard.
  var REPO_STANDAARD = 'Player87887/Johnsballiebets';
  var STATUS_BRANCH = 'status';
  var STATUS_BESTAND = 'server.json';
  var VERVERS_SEC = 60;
  var ONLINE_MIN = 25;      // heartbeat jonger dan dit (of 2,5× het interval) = online

  // ── basis-URL van de site, afgeleid uit waar dit script staat ────────────
  var script = document.currentScript || document.querySelector('script[src*="assets/site.js"]');
  var BASIS = script ? script.src.replace(/assets\/site\.js(\?.*)?$/, '') : '../';
  var asset = function (n) { return BASIS + 'assets/' + n; };

  function repo() {
    var host = location.hostname, delen = location.pathname.split('/').filter(Boolean);
    if (/\.github\.io$/.test(host) && delen.length) return host.split('.')[0] + '/' + delen[0];
    return REPO_STANDAARD;
  }

  // ── 1. favicon + app-icoon ────────────────────────────────────────────────
  function link(rel, href, extra) {
    if (document.querySelector('link[rel="' + rel + '"]')) return;
    var l = document.createElement('link');
    l.rel = rel; l.href = href;
    Object.keys(extra || {}).forEach(function (k) { l.setAttribute(k, extra[k]); });
    document.head.appendChild(l);
  }
  link('icon', asset('favicon-64.png'), { type: 'image/png', sizes: '64x64' });
  link('apple-touch-icon', asset('apple-touch-icon.png'));
  if (!document.querySelector('meta[name="theme-color"]')) {
    var m = document.createElement('meta'); m.name = 'theme-color'; m.content = '#0e1116';
    document.head.appendChild(m);
  }

  // ── stijl voor logo en status (los van de stijl van de pagina zelf) ───────
  var css = document.createElement('style');
  css.textContent = [
    '.jb-navlogo{display:inline-flex!important;align-items:center;gap:9px;color:#e6edf3!important;}',
    '.jb-navlogo img{width:28px;height:28px;border-radius:50%;display:block;box-shadow:0 0 0 1px #29313c;}',
    '.jb-navlogo span{font-size:13.5px;font-weight:800;letter-spacing:-.2px;}',
    '.jb-pill{margin-left:auto;display:inline-flex;align-items:center;gap:7px;font-family:"SF Mono","JetBrains Mono",ui-monospace,Menlo,monospace;',
    ' font-size:11px;color:#8b96a5;padding:4px 10px;border:1px solid #29313c;border-radius:20px;white-space:nowrap;cursor:default;background:#0e1116;}',
    '.jb-pill i{width:7px;height:7px;border-radius:50%;background:#5b6675;display:inline-block;flex:none;}',
    '.jb-pill.online{color:#29e0a0;border-color:rgba(41,224,160,.35);} .jb-pill.online i{background:#29e0a0;box-shadow:0 0 0 3px rgba(41,224,160,.18);animation:jbpuls 2.4s ease-in-out infinite;}',
    '.jb-pill.pauze{color:#f0a24b;border-color:rgba(240,162,75,.4);} .jb-pill.pauze i{background:#f0a24b;}',
    '.jb-pill.offline{color:#e0556b;border-color:rgba(224,85,107,.4);} .jb-pill.offline i{background:#e0556b;}',
    '@keyframes jbpuls{50%{box-shadow:0 0 0 5px rgba(41,224,160,.05);}}',
    '@media (prefers-reduced-motion:reduce){.jb-pill.online i{animation:none;}}',
    '.jb-statuskaart .jb-pill{margin-left:0;font-size:12px;padding:6px 12px;}',
    '.jb-statuskaart .jb-detail{font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:11.5px;color:#5b6675;margin-top:8px;}',
    '@media (max-width:640px){.jb-pill .jb-lang{display:none;}}'
  ].join('\n');
  document.head.appendChild(css);

  // ── 2. logo in de navigatiebalk ──────────────────────────────────────────
  var NAV = null;
  function navBalk() {
    var links = document.querySelectorAll('nav a[href$="radar/"], nav a[href$="picks/"]');
    for (var i = 0; i < links.length; i++) {
      var nav = links[i].closest('nav');
      if (nav) return nav;
    }
    return null;
  }
  function logoInNav() {
    NAV = navBalk();
    if (!NAV) return;
    var rij = NAV.querySelector('div') || NAV;
    var thuis = rij.querySelector('a[href="../"], a[href="./"], a[href="/"], a[href="../index.html"]');
    if (thuis && !thuis.classList.contains('jb-navlogo')) {
      thuis.classList.add('jb-navlogo');
      thuis.innerHTML = '<img src="' + asset('mark.png') + '" alt="" width="28" height="28"><span>John\'s</span>';
      thuis.setAttribute('aria-label', "John's Ballie Bets — home");
    }
  }

  // ── 3. serverstatus ──────────────────────────────────────────────────────
  var STATUS = null;
  function geleden(iso) {
    var t = Date.parse(iso); if (isNaN(t)) return '—';
    var s = (Date.now() - t) / 1000;
    if (s < 90) return 'zojuist';
    if (s < 3600) return Math.round(s / 60) + ' min geleden';
    if (s < 172800) return (s / 3600).toFixed(1).replace('.', ',') + ' uur geleden';
    return Math.round(s / 86400) + ' dagen geleden';
  }
  function tijd(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString('nl-NL', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function beoordeel(s) {
    if (!s || !s.heartbeat) return { soort: 'onbekend', kort: 'status onbekend', lang: 'Nog geen status van de server ontvangen.' };
    var leeftijdMin = (Date.now() - Date.parse(s.heartbeat)) / 60000;
    var grens = Math.max(ONLINE_MIN, (s.interval_min || 10) * 2.5);
    if (s.status === 'gestopt') return { soort: 'offline', kort: 'server offline', lang: 'Server is gestopt (' + geleden(s.heartbeat) + ').' };
    if (leeftijdMin > grens) return { soort: 'offline', kort: 'server offline', lang: 'Laatste teken van leven ' + geleden(s.heartbeat) + '.' };
    var lang = 'Laatste heartbeat ' + geleden(s.heartbeat) + '.';
    if (s.bezig) lang += ' Bezig: ' + (s.bezig.ronde || s.bezig.stap) + '.';
    if (s.radar_bijgewerkt) lang += ' Radar bijgewerkt ' + geleden(s.radar_bijgewerkt) + '.';
    if (s.status === 'gepauzeerd') {
      return { soort: 'pauze', kort: 'server gepauzeerd', lang: 'Gepauzeerd' + (s.pauze_tot ? ' tot ' + tijd(s.pauze_tot) : '') + '. ' + lang };
    }
    return { soort: 'online', kort: 'server online', lang: lang };
  }

  function pillHTML(b, metBezig) {
    var extra = (metBezig && STATUS && STATUS.bezig && b.soort === 'online')
      ? ' <span class="jb-lang">· ' + (STATUS.bezig.ronde || 'bezig') + '…</span>' : '';
    var cls = b.soort === 'onbekend' ? '' : b.soort;
    return '<span class="jb-pill ' + cls + '" title="' + b.lang.replace(/"/g, '&quot;') + '" role="status"><i></i>' + b.kort + extra + '</span>';
  }

  function teken() {
    var b = beoordeel(STATUS);
    if (NAV) {
      var rij = NAV.querySelector('div') || NAV;
      var oud = rij.querySelector('.jb-pill');
      var tmp = document.createElement('div'); tmp.innerHTML = pillHTML(b, false);
      if (oud) oud.replaceWith(tmp.firstChild); else rij.appendChild(tmp.firstChild);
    }
    var groot = document.getElementById('jb-status');
    if (groot) {
      groot.classList.add('jb-statuskaart');
      groot.innerHTML = pillHTML(b, true) + '<div class="jb-detail">' + b.lang + '</div>';
    }
    document.dispatchEvent(new CustomEvent('jb-status', { detail: { status: STATUS, oordeel: b } }));
  }

  async function haal(url, opties) {
    try {
      var r = await fetch(url, Object.assign({ cache: 'no-store' }, opties || {}));
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }

  var laatsteApi = 0;
  async function ververs() {
    var r = repo();
    var s = await haal('https://raw.githubusercontent.com/' + r + '/' + STATUS_BRANCH + '/' + STATUS_BESTAND + '?t=' + Date.now());
    // raw.githubusercontent cachet tot ± 5 min. Lijkt de server offline, dan
    // nog één keer vers via de API vragen voordat we 'offline' tonen.
    // Max. 1× per 5 min: de API staat bezoekers zonder token 60 vragen per uur toe.
    if ((!s || beoordeel(s).soort === 'offline') && Date.now() - laatsteApi > 300000) {
      laatsteApi = Date.now();
      var api = await haal('https://api.github.com/repos/' + r + '/contents/' + STATUS_BESTAND + '?ref=' + STATUS_BRANCH,
                           { headers: { Accept: 'application/vnd.github.raw' } });
      if (api && (!s || Date.parse(api.heartbeat) > Date.parse(s.heartbeat))) s = api;
    }
    if (s) STATUS = s;
    teken();
  }

  function start() {
    logoInNav();
    teken();
    ververs();
    setInterval(ververs, VERVERS_SEC * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) ververs(); });
  }

  window.JBB = { asset: asset, status: function () { return STATUS; }, beoordeel: beoordeel, ververs: ververs };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
