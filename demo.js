/* Demoportalen. Oppsettet lagres i nettleseren (localStorage), ingenting sendes noe sted. */
(function () {
  'use strict';
  var KEY = 'vintra-demo-config';
  var VC = window.VintraChat, P = VC.presets, clone = VC.clone;
  var $ = function (id) { return document.getElementById(id); };
  var all = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.knowledge) && s.template) return s;
    } catch (e) {}
    return clone(P.eiendom);
  }

  var cfg = load();
  var frame = $('pframe'), portal = $('portal');
  var chat = VC.create(frame, cfg, { mode: 'inline' });
  var saveTimer;

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(KEY, JSON.stringify(cfg));
        $('saveStatus').textContent = 'Lagret lokalt kl. ' + new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        $('saveStatus').textContent = 'Kunne ikke lagre i nettleseren';
      }
    }, 300);
  }
  var designTimer;
  function changed() {
    chat.setConfig(cfg); renderSite(); renderCode(); save();
    clearTimeout(designTimer);
    designTimer = setTimeout(renderDesigns, 250);
  }
  function pressed(attr, val) { all('[' + attr + ']').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute(attr) === val)); }); }
  function slug(s) {
    return String(s || '').toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'din-bedrift';
  }

  /* ---------- Fyll skjemaet fra oppsettet ---------- */
  var TEXT = [
    ['cfg-company', 'company'], ['cfg-bot', 'botName'], ['cfg-sub', 'subtitle'], ['cfg-launchtext', 'launcherText'],
    ['cfg-greeting', 'greeting'], ['cfg-fallback', 'fallback'], ['cfg-handoffkw', 'handoffKeywords'], ['cfg-handoffmsg', 'handoffMessage']
  ];
  function fill() {
    TEXT.forEach(function (f) { $(f[0]).value = cfg[f[1]] || ''; });
    $('cfg-quick').value = (cfg.quickReplies || []).join('\n');
    $('cfg-radius').value = cfg.radius;
    $('cfg-radius-out').textContent = cfg.radius + ' px';
    $('cfg-color').value = cfg.color;
    $('cfg-color-val').textContent = cfg.color.toUpperCase();
    $('cfg-sources').checked = cfg.showSources !== false;
    $('cfg-brand').checked = cfg.showBranding !== false;
    pressed('data-color', cfg.color.toLowerCase());
    pressed('data-icon', cfg.icon);
    pressed('data-launcher', cfg.launcher);
    pressed('data-position', cfg.position);
    pressed('data-themeopt', cfg.theme);
    pressed('data-tone', cfg.tone);
    pressed('data-template', cfg.template);
    pressed('data-font', cfg.font || 'plex');
    $('launchTextCtl').hidden = cfg.launcher !== 'pill';
    renderKB();
    renderDesigns();
  }

  /* ---------- Ferdige design ---------- */
  function renderDesigns() {
    var grid = $('designGrid');
    var active = document.activeElement, focusId = active && active.getAttribute ? active.getAttribute('data-design') : null;
    grid.innerHTML = '';
    VC.designs.forEach(function (d) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'design-card';
      b.setAttribute('data-design', d.id);
      b.setAttribute('aria-pressed', String((cfg.style || 'classic') === d.id));
      var t = document.createElement('div'); t.className = 'design-thumb'; t.setAttribute('aria-hidden', 'true');
      VC.thumb(t, Object.assign({}, cfg, d.set), cfg.botName);
      var name = document.createElement('b');
      name.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>';
      name.appendChild(document.createTextNode(d.name));
      var desc = document.createElement('span'); desc.textContent = d.desc;
      b.appendChild(t); b.appendChild(name); b.appendChild(desc);
      b.addEventListener('click', function () {
        Object.assign(cfg, d.set);
        fill();
        changed();
      });
      grid.appendChild(b);
      if (focusId === d.id) b.focus();
    });
  }

  /* ---------- Kunnskapsbasen ---------- */
  function field(id, label, value, multiline, hint, onInput) {
    var w = document.createElement('div'); w.className = 'ctl';
    var l = document.createElement('label'); l.htmlFor = id; l.textContent = label;
    var inp = document.createElement(multiline ? 'textarea' : 'input');
    if (!multiline) inp.type = 'text';
    inp.id = id; inp.value = value || '';
    inp.addEventListener('input', function () { onInput(inp.value); });
    w.appendChild(l); w.appendChild(inp);
    if (hint) { var s = document.createElement('small'); s.textContent = hint; w.appendChild(s); }
    return w;
  }
  function renderKB(openIndex) {
    var box = $('kbList');
    box.innerHTML = '';
    cfg.knowledge.forEach(function (e, i) {
      var d = document.createElement('details'); d.className = 'kb-item';
      if (i === openIndex) d.open = true;
      var sum = document.createElement('summary');
      var t = document.createElement('span'); t.textContent = e.question || 'Nytt spørsmål';
      sum.appendChild(t);
      sum.insertAdjacentHTML('beforeend', '<svg class="ic" aria-hidden="true"><use href="#i-down"/></svg>');
      var body = document.createElement('div'); body.className = 'kb-body';
      body.appendChild(field('kb-' + i + '-q', 'Spørsmål', e.question, false, null, function (v) { e.question = v; t.textContent = v || 'Nytt spørsmål'; changed(); }));
      body.appendChild(field('kb-' + i + '-a', 'Svar', e.answer, true, null, function (v) { e.answer = v; changed(); }));
      body.appendChild(field('kb-' + i + '-k', 'Nøkkelord', e.keywords, false, 'Ord kunden kan bruke, skilt med komma.', function (v) { e.keywords = v; changed(); }));
      body.appendChild(field('kb-' + i + '-s', 'Kilde', e.source, false, 'Vises under svaret, for eksempel «Salgsoppgave, s. 4».', function (v) { e.source = v; changed(); }));
      var del = document.createElement('button'); del.type = 'button'; del.className = 'kb-del'; del.textContent = 'Slett dette svaret';
      del.addEventListener('click', function () { cfg.knowledge.splice(i, 1); renderKB(); changed(); });
      body.appendChild(del);
      d.appendChild(sum); d.appendChild(body);
      box.appendChild(d);
    });
    var n = cfg.knowledge.length;
    $('kbCount').textContent = n === 1 ? '1 svar' : n + ' svar';
  }

  /* ---------- Nettsiden i forhåndsvisningen ---------- */
  function renderSite() {
    var s = cfg.site || {}, name = cfg.company || 'Din bedrift', initial = name.trim().charAt(0).toUpperCase() || 'D';
    frame.style.setProperty('--c', cfg.color);
    frame.style.setProperty('--ci', VC.inkFor(cfg.color));
    $('psLogo').textContent = initial;
    $('psName').textContent = name;
    $('psHead').textContent = s.headline || 'Velkommen til ' + name;
    $('psText').textContent = s.text || '';
    $('psBtn').textContent = s.button || 'Ta kontakt';
    var img = $('psImg');
    if (s.image) { if (img.getAttribute('src') !== s.image) img.src = s.image; img.hidden = false; } else { img.hidden = true; img.removeAttribute('src'); }
    $('pUrl').textContent = slug(name) + '.no';
    $('wsName').textContent = 'Demo · ' + name;
    $('wsLogo').textContent = initial;
    $('wsLogo').style.background = cfg.color;
    $('wsLogo').style.color = VC.inkFor(cfg.color);
    var q = (cfg.quickReplies || [])[0];
    $('previewHint').textContent = q ? 'Prøv å skrive «' + q + '», eller «Kan jeg snakke med et menneske?»' : 'Skriv et spørsmål til chatboten for å teste den.';
  }

  function renderCode() {
    $('embedCode').textContent =
      '<!-- Vintra chat-widget (eksempelkode) -->\n' +
      '<script src="https://widget.vintranordic.com/v1.js"\n' +
      '  data-bot="' + slug(cfg.company) + '"\n' +
      '  data-color="' + cfg.color + '"\n' +
      '  data-position="' + (cfg.position === 'left' ? 'left' : 'right') + '"\n' +
      '  defer></script>';
  }

  function copy(text, btn) {
    var label = btn.querySelector('span'), old = label.textContent;
    var done = function (msg) { label.textContent = msg; setTimeout(function () { label.textContent = old; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done('Kopiert'); }, function () { selectCode(); done('Merk og kopier'); });
    } else { selectCode(); done('Merk og kopier'); }
  }
  function selectCode() {
    var r = document.createRange(); r.selectNodeContents($('embedCode'));
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  /* ---------- Hendelser ---------- */
  TEXT.forEach(function (f) { $(f[0]).addEventListener('input', function (e) { cfg[f[1]] = e.target.value; changed(); }); });
  $('cfg-quick').addEventListener('input', function (e) {
    cfg.quickReplies = e.target.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    changed();
  });
  $('cfg-radius').addEventListener('input', function (e) { cfg.radius = Number(e.target.value); $('cfg-radius-out').textContent = cfg.radius + ' px'; changed(); });
  $('cfg-color').addEventListener('input', function (e) {
    cfg.color = e.target.value; $('cfg-color-val').textContent = cfg.color.toUpperCase(); pressed('data-color', cfg.color.toLowerCase()); changed();
  });
  all('[data-color]').forEach(function (b) {
    b.addEventListener('click', function () {
      cfg.color = b.getAttribute('data-color'); $('cfg-color').value = cfg.color; $('cfg-color-val').textContent = cfg.color.toUpperCase();
      pressed('data-color', cfg.color); changed();
    });
  });
  [['data-icon', 'icon'], ['data-launcher', 'launcher'], ['data-position', 'position'], ['data-themeopt', 'theme'], ['data-tone', 'tone'], ['data-font', 'font']].forEach(function (pair) {
    all('[' + pair[0] + ']').forEach(function (b) {
      b.addEventListener('click', function () {
        cfg[pair[1]] = b.getAttribute(pair[0]);
        pressed(pair[0], cfg[pair[1]]);
        if (pair[1] === 'launcher') $('launchTextCtl').hidden = cfg.launcher !== 'pill';
        changed();
      });
    });
  });
  $('cfg-sources').addEventListener('change', function (e) { cfg.showSources = e.target.checked; changed(); });
  $('cfg-brand').addEventListener('change', function (e) { cfg.showBranding = e.target.checked; changed(); });

  function useTemplate(id) {
    cfg = clone(P[id] || P.eiendom);
    fill(); chat.setConfig(cfg); chat.reset(); chat.setOpen(true, true); renderSite(); renderCode(); save();
  }
  all('[data-template]').forEach(function (b) { b.addEventListener('click', function () { useTemplate(b.getAttribute('data-template')); }); });
  $('resetBtn').addEventListener('click', function () { useTemplate(cfg.template); });
  $('restartChat').addEventListener('click', function () { chat.reset(); chat.setOpen(true, true); });
  $('kbAdd').addEventListener('click', function () {
    cfg.knowledge.push({ question: '', answer: '', keywords: '', source: '' });
    renderKB(cfg.knowledge.length - 1); changed();
    var last = $('kbList').lastElementChild;
    if (last) last.querySelector('input').focus();
  });
  $('copyCode').addEventListener('click', function () { copy($('embedCode').textContent, $('copyCode')); });
  $('copyJson').addEventListener('click', function () { copy(JSON.stringify(cfg, null, 2), $('copyJson')); });

  all('[data-dev]').forEach(function (b) {
    b.addEventListener('click', function () { frame.setAttribute('data-device', b.getAttribute('data-dev')); pressed('data-dev', b.getAttribute('data-dev')); });
  });
  all('[data-v]').forEach(function (b) {
    b.addEventListener('click', function () { portal.setAttribute('data-view', b.getAttribute('data-v')); pressed('data-v', b.getAttribute('data-v')); });
  });

  /* Faner */
  var tabs = all('.stab');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (n) { e.preventDefault(); selectTab(n, true); }
    });
  });

  fill();
  renderSite();
  renderCode();
})();
