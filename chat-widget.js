/* Vintra chat-widget, demoversjon.
   Alt kjører lokalt i nettleseren. Ingen meldinger sendes til noen server.
   Svar finnes med enkel ordmatching mot spørsmålene og nøkkelordene i kunnskapsbasen.
   Bruk: VintraChat.create(element, oppsett, { mode: 'floating' | 'inline' }) */
(function (global) {
  'use strict';

  /* ---------- Tekstbehandling ---------- */
  var STOP = new Set(('og i jeg det at en et den til er som på de med han av ikke der så var meg seg men har om vi min mitt ha ' +
    'hadde hun nå over da ved fra du ut sin dem oss opp man kan hans hvor eller hva skal selv her alle vil bli ble blitt kunne inn ' +
    'når være kom noen noe ville dere deres kun ja etter ned skulle denne for deg si sine sitt mot å hvorfor dette disse uten ' +
    'hvordan ingen din ditt blir samme hvilken hvilke vår hver hvem hvis både bare enn fordi før mange også slik vært siden hei ' +
    'hallo takk lurer gjerne kanskje litt mye får få fått gjør gjøre vet vite nok sånn eg kva korleis kor ein eit me no').split(' '));
  var SUFFIX = ['endes', 'ende', 'ene', 'ane', 'ingen', 'inger', 'ing', 'heten', 'het', 'ers', 'er', 'en', 'et', 'a', 'e', 's'];

  function words(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9æøåäöüé]+/g, ' ').trim().split(' ').filter(Boolean); }
  function stem(w) {
    for (var i = 0; i < SUFFIX.length; i++) {
      var s = SUFFIX[i];
      if (w.length - s.length >= 4 && w.slice(-s.length) === s) return w.slice(0, -s.length);
    }
    return w;
  }
  function terms(s) { return words(s).filter(function (w) { return w.length > 1 && !STOP.has(w); }).map(stem); }
  function list(v) {
    var arr = Array.isArray(v) ? v : String(v || '').split(/[,\n]/);
    return arr.map(function (x) { return String(x).trim(); }).filter(Boolean);
  }

  function score(query, entry) {
    var qText = ' ' + words(query).join(' ') + ' ', q = terms(query), s = 0;
    list(entry.keywords).forEach(function (k) {
      var kw = words(k).join(' ');
      if (!kw) return;
      var ks = words(k).map(stem).join(' ');
      if (qText.indexOf(' ' + kw) > -1) s += 3;
      else if (ks.length >= 5 && qText.indexOf(ks) > -1) s += 2.5;
    });
    var qt = terms(entry.question), at = terms(entry.answer);
    q.forEach(function (t) {
      if (qt.indexOf(t) > -1) s += 2;
      else if (t.length >= 5 && qt.some(function (x) { return x.length >= 5 && (x.indexOf(t) === 0 || t.indexOf(x) === 0); })) s += 1.5;
      if (at.indexOf(t) > -1) s += 0.5;
    });
    return s;
  }
  function findAnswer(query, kb) {
    var w = words(query).join(' '), best = null, top = 0;
    for (var i = 0; i < (kb || []).length; i++) {
      var e = kb[i];
      if (!e || !e.answer) continue;
      if (e.question && words(e.question).join(' ') === w) return e;
      var sc = score(query, e);
      if (sc > top) { top = sc; best = e; }
    }
    return top >= 2.5 ? best : null;
  }
  function hasAny(query, keywords) {
    var qText = ' ' + words(query).join(' ') + ' ';
    return list(keywords).some(function (k) { var kw = words(k).join(' '); return kw && qText.indexOf(' ' + kw) > -1; });
  }

  var TONES = {
    vennlig: { hello: 'Hei! Hva lurer du på?', thanks: 'Så hyggelig! Bare si fra hvis det er noe mer.', openers: ['', 'Godt spørsmål! ', '', 'Klart! '] },
    profesjonell: { hello: 'Hei, hva kan jeg hjelpe deg med?', thanks: 'Bare hyggelig. Kan jeg hjelpe deg med noe annet?', openers: [''] },
    kort: { hello: 'Hei! Hva lurer du på?', thanks: 'Bare hyggelig.', openers: [''] }
  };

  function respond(cfg, text, turn) {
    var tone = TONES[cfg.tone] || TONES.vennlig, w = words(text);
    if (cfg.handoffKeywords && hasAny(text, cfg.handoffKeywords)) {
      return { text: cfg.handoffMessage || 'Jeg setter deg i kontakt med en av oss.', handoff: true };
    }
    var hit = findAnswer(text, cfg.knowledge);
    if (hit) {
      var ans = hit.answer;
      if (cfg.tone === 'kort') { var m = ans.match(/^[\s\S]*?[.!?](\s|$)/); if (m) ans = m[0].trim(); }
      return { text: tone.openers[turn % tone.openers.length] + ans, source: hit.source, link: hit.link };
    }
    if (w.length <= 3 && w.some(function (x) { return ['hei', 'hallo', 'heisann', 'hey', 'morn', 'god'].indexOf(x) > -1; })) return { text: tone.hello };
    if (w.indexOf('takk') > -1 || w.indexOf('tusen') > -1) return { text: tone.thanks };
    return { text: cfg.fallback || 'Det vet jeg dessverre ikke. Vil du snakke med et menneske?', fallback: true };
  }

  /* ---------- Hjelpere ---------- */
  var ICONS = {
    chat: '<path d="M4 5h16v11H9.5L4 20z"/>',
    sparkle: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    house: '<path d="M4 10.8 12 4l8 6.8V20h-5.5v-5.5h-5V20H4z"/>',
    shield: '<path d="M12 3l7 3v5.2c0 4.4-3 8.1-7 9.8-4-1.7-7-5.4-7-9.8V6z"/>',
    bag: '<path d="M5.5 8h13l-1 12h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    person: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1-3.6 3.8-5.6 7-5.6s6 2 7 5.6"/>',
    send: '<path d="M4 12 20 4l-6 16-2.5-6.5z"/><path d="M11.5 13.5 20 4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4v4h4"/>',
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>'
  };
  function svg(name, size) {
    var s = size || 20;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || ICONS.chat) + '</svg>';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inkFor(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#FFFFFF';
    var n = parseInt(m[1], 16);
    var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    var L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return 1.05 / (L + 0.05) >= 4.5 ? '#FFFFFF' : '#0E1B2C';
  }
  function make(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ---------- Widgeten ---------- */
  function Chat(host, config, opts) {
    this.opts = opts || {};
    this.mode = this.opts.mode === 'inline' ? 'inline' : 'floating';
    this.config = config;
    this.isOpen = this.mode === 'inline' || !!this.opts.open;
    this.turn = 0; this.userCount = 0; this.timers = []; this.busy = false;
    this.build(host);
    this.apply();
    this.reset();
    this.setOpen(this.isOpen, true);
  }

  Chat.prototype.build = function (host) {
    var self = this, r = make('div', 'vc-root vc-' + this.mode);
    r.innerHTML =
      '<section class="vc-panel" role="dialog">' +
        '<header class="vc-head">' +
          '<span class="vc-avatar"></span>' +
          '<div class="vc-title"><b class="vc-name"></b><small><i class="vc-dot"></i><span class="vc-sub"></span></small></div>' +
          '<button type="button" class="vc-icon-btn vc-restart" aria-label="Start samtalen på nytt" title="Start på nytt">' + svg('reset', 18) + '</button>' +
          '<button type="button" class="vc-icon-btn vc-close" aria-label="Lukk chatten" title="Lukk">' + svg('close', 18) + '</button>' +
        '</header>' +
        '<div class="vc-log" role="log" aria-live="polite"></div>' +
        '<div class="vc-quick"></div>' +
        '<form class="vc-form" autocomplete="off">' +
          '<input class="vc-input" type="text" maxlength="300" aria-label="Skriv en melding" placeholder="Skriv en melding …">' +
          '<button class="vc-send" type="submit" aria-label="Send melding">' + svg('send', 18) + '</button>' +
        '</form>' +
        '<p class="vc-brand">Drevet av Vintra</p>' +
      '</section>' +
      '<button type="button" class="vc-launcher"></button>';
    host.appendChild(r);
    this.root = r;
    var q = function (s) { return r.querySelector(s); };
    this.panel = q('.vc-panel'); this.log = q('.vc-log'); this.quick = q('.vc-quick');
    this.form = q('.vc-form'); this.input = q('.vc-input'); this.launcher = q('.vc-launcher');
    this.avatar = q('.vc-avatar'); this.nameEl = q('.vc-name'); this.subEl = q('.vc-sub'); this.brand = q('.vc-brand');
    this.launcher.addEventListener('click', function () { self.setOpen(!self.isOpen); });
    q('.vc-close').addEventListener('click', function () { self.setOpen(false); self.launcher.focus(); });
    q('.vc-restart').addEventListener('click', function () { self.reset(); self.input.focus(); });
    this.form.addEventListener('submit', function (e) { e.preventDefault(); self.send(self.input.value); });
    r.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && self.isOpen && self.mode === 'floating') { self.setOpen(false); self.launcher.focus(); }
    });
  };

  function rootClass(c, mode, open) {
    return 'vc-root vc-' + mode + ' vc-style-' + (c.style || 'classic') + ' vc-font-' + (c.font || 'plex') +
      (c.position === 'left' ? ' vc-left' : '') + (c.theme === 'dark' ? ' vc-dark' : '') + (open ? ' vc-open' : '');
  }
  function setVars(el, c) {
    el.style.setProperty('--vc-accent', c.color || '#1F4ED8');
    el.style.setProperty('--vc-accent-ink', inkFor(c.color || '#1F4ED8'));
    el.style.setProperty('--vc-radius', (c.radius == null ? 16 : c.radius) + 'px');
  }

  Chat.prototype.apply = function () {
    var c = this.config, r = this.root;
    setVars(r, c);
    r.className = rootClass(c, this.mode, this.isOpen);
    this.log.querySelectorAll('.vc-mini-av').forEach(function (a) { a.innerHTML = svg(c.icon, 15); });
    this.avatar.innerHTML = svg(c.icon, 20);
    this.nameEl.textContent = c.botName || 'Assistent';
    this.subEl.textContent = c.subtitle || '';
    this.brand.hidden = c.showBranding === false;
    this.panel.setAttribute('aria-label', 'Chat med ' + (c.botName || 'assistenten'));
    this.renderLauncher();
  };

  Chat.prototype.renderLauncher = function () {
    var c = this.config, pill = c.launcher === 'pill', open = this.isOpen;
    this.launcher.className = 'vc-launcher ' + (pill && !open ? 'vc-pill' : 'vc-round');
    this.launcher.innerHTML = open ? svg('close', 22) : svg(c.icon, 24) + (pill ? '<span>' + esc(c.launcherText || 'Spør oss') + '</span>' : '');
    this.launcher.setAttribute('aria-label', open ? 'Lukk chatten' : 'Åpne chat med ' + (c.botName || 'assistenten'));
    this.launcher.setAttribute('aria-expanded', String(open));
  };

  Chat.prototype.setOpen = function (open, silent) {
    this.isOpen = open;
    this.panel.hidden = !open;
    this.root.classList.toggle('vc-open', open);
    this.renderLauncher();
    if (open && !silent) this.input.focus();
    if (open) this.scroll();
  };

  Chat.prototype.reset = function () {
    this.timers.forEach(clearTimeout); this.timers = [];
    this.busy = false; this.log.innerHTML = ''; this.turn = 0; this.userCount = 0;
    this.bot({ text: this.config.greeting || 'Hei! Hva kan jeg hjelpe deg med?' });
    this.renderQuick();
  };

  Chat.prototype.renderQuick = function () {
    var self = this;
    this.quick.innerHTML = '';
    var items = this.userCount === 0 ? list(this.config.quickReplies).slice(0, 4) : [];
    items.forEach(function (t) {
      var b = make('button', 'vc-chip', t);
      b.type = 'button';
      b.addEventListener('click', function () { self.send(t); });
      self.quick.appendChild(b);
    });
    this.quick.hidden = !items.length;
  };

  Chat.prototype.send = function (text) {
    var self = this;
    text = String(text || '').trim();
    if (!text || this.busy) return;
    this.input.value = '';
    this.userCount++;
    this.msg('user', text);
    this.renderQuick();
    var reply = respond(this.config, text, this.turn++);
    var typing = this.typing();
    this.busy = true;
    this.timers.push(setTimeout(function () {
      typing.remove();
      self.busy = false;
      self.bot(reply);
    }, 450 + Math.min(reply.text.length * 9, 900)));
  };

  Chat.prototype.msg = function (who, text) {
    var row = make('div', 'vc-row vc-' + who), b = make('div', 'vc-bubble', text);
    if (who === 'bot') { var av = make('span', 'vc-mini-av'); av.setAttribute('aria-hidden', 'true'); av.innerHTML = svg(this.config.icon, 15); row.appendChild(av); }
    row.appendChild(b);
    this.log.appendChild(row);
    this.scroll();
    return row;
  };

  Chat.prototype.bot = function (reply) {
    var self = this, c = this.config, row = this.msg('bot', reply.text), bubble = row.querySelector('.vc-bubble');
    if (reply.source && c.showSources !== false) {
      var s = make('span', 'vc-source');
      s.innerHTML = svg('doc', 12);
      s.appendChild(document.createTextNode(reply.source));
      bubble.appendChild(s);
    }
    if (reply.link || reply.fallback || reply.handoff) {
      var box = make('div', 'vc-actions');
      if (reply.link && reply.link.href) {
        var a = make('a', 'vc-action', reply.link.label || 'Les mer');
        a.href = reply.link.href;
        box.appendChild(a);
      }
      if (reply.fallback) {
        var y = make('button', 'vc-action', 'Ja, sett meg i kontakt');
        y.type = 'button';
        y.addEventListener('click', function () { y.disabled = true; self.handoff(); });
        box.appendChild(y);
      }
      row.appendChild(box);
      if (reply.handoff) this.handoffBlock(box);
    }
    this.scroll();
  };

  Chat.prototype.handoff = function () {
    this.bot({ text: this.config.handoffMessage || 'Jeg setter deg i kontakt med en av oss.', handoff: true });
  };

  Chat.prototype.handoffBlock = function (box) {
    var self = this, h = this.config.handoff || { type: 'form' };
    if (h.type === 'links') {
      (h.links || []).forEach(function (l) {
        var a = make('a', 'vc-action', l.label);
        a.href = l.href;
        box.appendChild(a);
      });
      return;
    }
    var f = make('form', 'vc-handoff');
    f.noValidate = false;
    f.innerHTML = '<label>Navn<input name="n" required autocomplete="name"></label>' +
      '<label>E-post<input name="e" type="email" required autocomplete="email"></label>' +
      '<button type="submit" class="vc-action vc-primary">Send til kundeservice</button>';
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); return; }
      var name = f.elements.n.value.trim().split(/\s+/)[0];
      f.remove();
      self.bot({ text: 'Takk, ' + name + '! Saken er sendt videre med hele samtalen, og du får svar på e-post. (Dette er en demo, så ingenting er faktisk sendt.)' });
    });
    box.appendChild(f);
    this.scroll();
  };

  Chat.prototype.typing = function () {
    var row = make('div', 'vc-row vc-bot');
    row.innerHTML = '<div class="vc-bubble vc-typing" role="img" aria-label="Skriver"><i></i><i></i><i></i></div>';
    this.log.appendChild(row);
    this.scroll();
    return row;
  };

  Chat.prototype.scroll = function () {
    var l = this.log;
    requestAnimationFrame(function () { l.scrollTop = l.scrollHeight; });
  };

  Chat.prototype.setConfig = function (cfg) {
    this.config = cfg;
    this.apply();
    if (this.userCount === 0) this.reset();
  };

  /* ---------- Ferdige oppsett ---------- */
  var BOOK = { label: 'Book gratis konsultasjon', href: 'index.html#kontakt' };
  var PRESETS = {
    vintra: {
      template: 'vintra', company: 'Vintra', botName: 'Vintra-assistenten', subtitle: 'Svarer med en gang',
      color: '#1F4ED8', theme: 'light', position: 'right', radius: 16, icon: 'chat', launcher: 'pill', launcherText: 'Spør Vintra',
      style: 'classic', font: 'plex', tone: 'vennlig', showSources: true, showBranding: false,
      greeting: 'Hei! Jeg er Vintra-assistenten. Spør meg om hvordan vi jobber, hva det koster eller hvordan vi tar vare på dataene deres.',
      quickReplies: ['Hva koster det?', 'Hvor lagres dataene?', 'Book gratis konsultasjon', 'Hvem står bak Vintra?'],
      fallback: 'Det har jeg ikke noe godt svar på ennå. Vil du snakke med en av oss i stedet?',
      handoffKeywords: 'menneske, snakke med, ringe meg, ring meg, kontakte meg, klage',
      handoffMessage: 'Klart! Du når oss på telefon, eller du kan booke en gratis konsultasjon.',
      handoff: { type: 'links', links: [BOOK, { label: 'Ring +47 41 76 12 52', href: 'tel:+4741761252' }] },
      knowledge: [
        { question: 'Hva er Vintra?', answer: 'Vintra lager AI-assistenter for kundeservice. Assistenten svarer kundene deres døgnet rundt med innhold dere har godkjent, og sender saker videre til riktig person når det trengs.', keywords: 'vintra, hva gjør dere, hva er, tjeneste, produkt, chatbot, assistent', source: 'Forsiden' },
        { question: 'Hva koster det?', answer: 'Den første konsultasjonen er gratis. Vil dere gå videre, starter vi med en pilot på seks uker til fast pris. Prisen for drift avhenger av hvor mange samtaler dere har.', keywords: 'pris, priser, koster, koste, kostnad, betale, billig, dyr, abonnement', source: 'Avtaler og priser', link: BOOK },
        { question: 'Book gratis konsultasjon', answer: 'Fyll ut skjemaet nederst på forsiden, så tar vi kontakt innen én arbeidsdag. Konsultasjonen tar 30 minutter, digitalt eller hos dere.', keywords: 'konsultasjon, møte, booke, book, bestille møte, gratis', source: 'Kontakt', link: BOOK },
        { question: 'Hvor lagres dataene?', answer: 'Data lagres og behandles i EU/EØS. Vi inngår databehandleravtale etter GDPR, og dere får full oversikt over underleverandører.', keywords: 'data, lagres, lagring, gdpr, personvern, eøs, sikkerhet, databehandleravtale, sikker', source: 'Sikkerhet og personvern', link: { label: 'Les om sikkerhet', href: 'index.html#sikkerhet' } },
        { question: 'Hvilken AI bruker dere?', answer: 'Vi bruker Google Gemini via betalt API. Samtalene deres brukes ikke til å trene modellen, og assistenten svarer bare fra kilder dere har godkjent.', keywords: 'ai, kunstig intelligens, modell, språkmodell, gemini, google, chatgpt, openai, gpt', source: 'Spørsmål og svar' },
        { question: 'Hvor lang tid tar det å komme i gang?', answer: 'Fra første møte til produksjon tar det normalt ti uker: kartlegging, pilot i én kanal, integrasjon og så drift.', keywords: 'lang tid, uker, oppstart, komme i gang, implementering, innføring, starte', source: 'Innføring' },
        { question: 'Passer dette for eiendomsmeglere?', answer: 'Ja. Assistenten kan svare på spørsmål om visninger, salgsoppgave, felleskostnader og budrunder, og sende interessenter videre til riktig megler.', keywords: 'eiendom, megler, eiendomsmegler, bolig, borettslag, visning, leilighet, sameie', source: 'Bransjer' },
        { question: 'Kan dere koble til systemene våre?', answer: 'Ja. Vintra kobles til saksbehandling og CRM via API og webhooks, og støtter single sign-on.', keywords: 'integrasjon, integrere, koble, system, crm, api, webhook, sso, saksbehandling', source: 'Plattformen' },
        { question: 'Hvem står bak Vintra?', answer: 'Vintra eies og drives av tre utviklere: Oscar, Martin og Kaktus. Ja, Kaktus er en kaktus. Hils på hele gjengen på Om oss-siden.', keywords: 'hvem, står bak, eier, eiere, team, ansatte, oscar, martin, kaktus, gründer', source: 'Om oss', link: { label: 'Møt teamet', href: 'om-oss.html' } },
        { question: 'Hvordan kontakter jeg dere?', answer: 'Ring oss på +47 41 76 12 52 eller send e-post til salg@vintranordic.com. Vi svarer innen én arbeidsdag.', keywords: 'kontakt, kontakte, telefon, ring, telefonnummer, epost, e-post, mail', source: 'Kontakt' },
        { question: 'Kan jeg teste chatboten selv?', answer: 'Ja! I demoportalen kan du endre farger, navn og innhold, og se chatboten oppdatere seg mens du jobber.', keywords: 'teste, test, prøve, demo, portal, tilpasse, endre, design, utseende', source: 'Demoportalen', link: { label: 'Åpne demoportalen', href: 'demo.html' } },
        { question: 'Hva skjer når assistenten ikke vet svaret?', answer: 'Da sier den fra, og tilbyr å sette kunden i kontakt med et menneske. Spørsmålet havner i innsikten, så dere kan fylle hullet.', keywords: 'vet ikke, ikke vet, feil svar, usikker, finner ikke', source: 'Spørsmål og svar' }
      ]
    },
    eiendom: {
      template: 'eiendom', company: 'Eksempel Eiendom', botName: 'Meglerassistenten', subtitle: 'Svarer vanligvis med en gang',
      color: '#0F5A4A', theme: 'light', position: 'right', radius: 18, icon: 'house', launcher: 'pill', launcherText: 'Spør megleren',
      style: 'classic', font: 'plex', tone: 'vennlig', showSources: true, showBranding: true,
      greeting: 'Hei! Jeg kan svare på spørsmål om Storgata 12, visninger og budrunder. Hva lurer du på?',
      quickReplies: ['Når er neste visning?', 'Hva er felleskostnadene?', 'Hvordan legger jeg inn bud?'],
      fallback: 'Det står ikke i salgsoppgaven. Vil du at megleren tar kontakt med deg?',
      handoffKeywords: 'menneske, snakke med, ringe meg, ring meg, kontakte meg, klage',
      handoffMessage: 'Jeg sender beskjed til megleren. Legg igjen navn og e-post, så tar hun kontakt i dag.',
      handoff: { type: 'form' },
      site: { headline: 'Storgata 12, Oslo', text: 'Lys treroms med vestvendt balkong. Prisantydning 4 950 000 kr. Fellesvisning søndag kl. 13–14.', button: 'Meld deg på visning', image: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=900&h=680&q=75' },
      knowledge: [
        { question: 'Når er neste visning?', answer: 'Neste fellesvisning er søndag kl. 13–14. Du kan melde deg på i annonsen, eller her i chatten.', keywords: 'visning, vise, se boligen, påmelding, fellesvisning, privatvisning', source: 'Visningsplan' },
        { question: 'Hva er felleskostnadene?', answer: 'Felleskostnadene er 4 850 kr per måned, inkludert fyring og TV.', keywords: 'felleskostnad, felleskostnader, fellesutgifter, månedlig, husleie', source: 'Salgsoppgave, s. 4' },
        { question: 'Hvordan legger jeg inn bud?', answer: 'Du legger inn bud digitalt med BankID via lenken i annonsen. Megleren bekrefter alle bud på SMS.', keywords: 'bud, budrunde, by, legge inn bud, gi bud, bankid', source: 'Budreglement' },
        { question: 'Hvor mye fellesgjeld er det?', answer: 'Andel fellesgjeld er 412 000 kr. Den står i salgsoppgaven på side 4.', keywords: 'fellesgjeld, gjeld, lån, andel', source: 'Salgsoppgave, s. 4' },
        { question: 'Hva er prisantydningen?', answer: 'Prisantydningen er 4 950 000 kr. Totalpris med omkostninger og fellesgjeld er 5 487 300 kr.', keywords: 'pris, prisantydning, koster, totalpris, omkostninger', source: 'Salgsoppgave, s. 2' },
        { question: 'Når er overtakelse?', answer: 'Overtakelse er etter avtale, normalt to til tre måneder etter at budet er akseptert.', keywords: 'overtakelse, flytte inn, innflytting, overta', source: 'Salgsoppgave, s. 6' },
        { question: 'Hvor stor er leiligheten?', answer: 'Leiligheten er 74 m² (BRA) med to soverom og vestvendt balkong.', keywords: 'størrelse, stor, kvadrat, kvm, m2, soverom, rom, balkong', source: 'Salgsoppgave, s. 3' },
        { question: 'Er det parkering?', answer: 'Ja, leiligheten har egen plass i felles garasjeanlegg. Lading for elbil kan bestilles.', keywords: 'parkering, parkere, bil, garasje, elbil, lading', source: 'Salgsoppgave, s. 5' }
      ]
    },
    forsikring: {
      template: 'forsikring', company: 'Eksempel Forsikring', botName: 'Kundeassistenten', subtitle: 'Svarer døgnet rundt',
      color: '#1F4ED8', theme: 'light', position: 'right', radius: 6, icon: 'shield', launcher: 'round', launcherText: 'Spør oss',
      style: 'pro', font: 'plex', tone: 'profesjonell', showSources: true, showBranding: true,
      greeting: 'Hei! Jeg kan hjelpe deg med forsikringene dine, skademelding og faktura.',
      quickReplies: ['Dekker innbo sykkel som blir stjålet?', 'Når blir erstatningen utbetalt?', 'Gjelder reiseforsikringen i USA?'],
      fallback: 'Det finner jeg ikke i vilkårene. Vil du at en rådgiver kontakter deg?',
      handoffKeywords: 'menneske, snakke med, rådgiver, si opp, oppsigelse, klage',
      handoffMessage: 'Jeg sender saken til en rådgiver. Legg igjen navn og e-post, så hører du fra oss i dag.',
      handoff: { type: 'form' },
      site: { headline: 'Trygghet for alt du eier', text: 'Innbo, bil, reise og hus. Få svar om dekning og skade når det passer deg.', button: 'Se forsikringer', image: 'https://images.unsplash.com/photo-1610155180808-ad21f319ff9d?auto=format&fit=crop&w=900&h=680&q=75' },
      knowledge: [
        { question: 'Dekker innbo sykkel som blir stjålet?', answer: 'Ja. Sykkel er dekket ved tyveri fra låst bod eller sykkelrom. Egenandelen står i forsikringsbeviset ditt.', keywords: 'sykkel, tyveri, stjålet, bod, innbo', source: 'Vilkår innbo, pkt. 3.4' },
        { question: 'Når blir erstatningen utbetalt?', answer: 'Erstatningen utbetales normalt innen fem virkedager etter at saken er godkjent.', keywords: 'erstatning, utbetalt, utbetaling, penger, oppgjør', source: 'Skadeoppgjør, pkt. 2.1' },
        { question: 'Kan jeg endre betalingsdato?', answer: 'Ja. Du endrer betalingsdato under Mine avtaler på Min side. Endringen gjelder fra neste faktura.', keywords: 'betalingsdato, forfall, faktura, betale, trekk', source: 'Hjelpesenter: Faktura' },
        { question: 'Gjelder reiseforsikringen i USA?', answer: 'Ja. Reiseforsikringen gjelder i hele verden, også i USA, for reiser på inntil 60 dager.', keywords: 'reise, reiseforsikring, utlandet, usa, ferie', source: 'Vilkår reise, pkt. 1.2' },
        { question: 'Hvordan melder jeg skade?', answer: 'Du melder skade på Min side eller i appen. Ved akutte skader kan du ringe skadevakten hele døgnet.', keywords: 'melde skade, skademelding, skade, vannskade, uhell, innbrudd', source: 'Hjelpesenter: Skade' }
      ]
    },
    butikk: {
      template: 'butikk', company: 'Eksempel Butikk', botName: 'Butikkassistenten', subtitle: 'Svarer med en gang',
      color: '#B4471C', theme: 'light', position: 'right', radius: 22, icon: 'bag', launcher: 'pill', launcherText: 'Trenger du hjelp?',
      style: 'soft', font: 'rounded', tone: 'vennlig', showSources: false, showBranding: true,
      greeting: 'Hei! Jeg kan svare på spørsmål om levering, retur og ordrer.',
      quickReplies: ['Når kommer pakken?', 'Hvordan returnerer jeg?', 'Kan jeg bytte størrelse?'],
      fallback: 'Det er jeg ikke sikker på. Vil du at kundeservice tar kontakt?',
      handoffKeywords: 'menneske, snakke med, kundeservice ringe, klage, reklamasjon',
      handoffMessage: 'Jeg sender saken til kundeservice. Legg igjen navn og e-post, så svarer vi i løpet av dagen.',
      handoff: { type: 'form' },
      site: { headline: 'Nye jakker for vinteren', text: 'Fri frakt over 499 kr og 30 dagers åpent kjøp.', button: 'Handle nå', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&h=680&q=75' },
      knowledge: [
        { question: 'Når kommer pakken?', answer: 'Vi sender innen én virkedag. Levering tar normalt to til fire virkedager, og frakten er gratis over 499 kr.', keywords: 'levering, levere, frakt, sending, leveringstid, kommer pakken, pakke', source: 'Levering og frakt' },
        { question: 'Hvordan returnerer jeg?', answer: 'Du har 30 dagers åpent kjøp. Returlappen ligger i pakken, eller du kan lage en ny under Mine ordre.', keywords: 'retur, returnere, sende tilbake, angre, åpent kjøp', source: 'Retur og bytte' },
        { question: 'Kan jeg bytte størrelse?', answer: 'Ja, bytte er gratis. Velg «Bytt» under Mine ordre, så sender vi ny vare så snart vi får den gamle.', keywords: 'bytte, størrelse, for liten, for stor, passer ikke', source: 'Retur og bytte' },
        { question: 'Hvor er pakken min?', answer: 'Du får sporingslenke på SMS og e-post når pakken er sendt. Du finner den også under Mine ordre.', keywords: 'spore, sporing, hvor er, ordre, bestilling, ordrenummer', source: 'Mine ordre' },
        { question: 'Hvordan kan jeg betale?', answer: 'Du kan betale med kort, faktura eller delbetaling i kassen.', keywords: 'betale, betaling, faktura, delbetaling, kort, kasse', source: 'Betaling' },
        { question: 'Når har kundeservice åpent?', answer: 'Kundeservice har åpent hverdager 08–16. Chatten svarer hele døgnet.', keywords: 'åpningstid, åpningstider, kundeservice, åpent, stenger', source: 'Kontakt oss' }
      ]
    },
    tom: {
      template: 'tom', company: 'Din bedrift', botName: 'Assistenten', subtitle: 'Svarer med en gang',
      color: '#111827', theme: 'light', position: 'right', radius: 12, icon: 'chat', launcher: 'round', launcherText: 'Spør oss',
      style: 'minimal', font: 'system', tone: 'vennlig', showSources: true, showBranding: true,
      greeting: 'Hei! Hva kan jeg hjelpe deg med?',
      quickReplies: ['Hva er åpningstidene?'],
      fallback: 'Det vet jeg dessverre ikke ennå. Vil du at noen tar kontakt med deg?',
      handoffKeywords: 'menneske, snakke med, klage',
      handoffMessage: 'Jeg sender beskjed videre. Legg igjen navn og e-post, så tar vi kontakt.',
      handoff: { type: 'form' },
      site: { headline: 'Din bedrift på nett', text: 'Skriv inn firmanavnet ditt og legg til egne spørsmål og svar til venstre.', button: 'Ta kontakt', image: '' },
      knowledge: [
        { question: 'Hva er åpningstidene?', answer: 'Vi har åpent hverdager fra 09 til 16.', keywords: 'åpningstid, åpningstider, åpent, stenger, åpner', source: 'Kontaktsiden' }
      ]
    }
  };

  /* ---------- Ferdige design (utseende uten å endre innholdet) ---------- */
  var DESIGNS = [
    { id: 'classic', name: 'Klassisk', desc: 'Farget topp og tydelige bobler.', set: { style: 'classic', color: '#1f4ed8', radius: 16, theme: 'light', launcher: 'pill', font: 'plex' } },
    { id: 'minimal', name: 'Minimal', desc: 'Hvit og luftig, farge bare der det trengs.', set: { style: 'minimal', color: '#111827', radius: 12, theme: 'light', launcher: 'round', font: 'system' } },
    { id: 'soft', name: 'Vennlig', desc: 'Runde former og avatar ved hvert svar.', set: { style: 'soft', color: '#6d28d9', radius: 24, theme: 'light', launcher: 'pill', font: 'rounded' } },
    { id: 'glass', name: 'Moderne', desc: 'Fargeovergang og glasseffekt.', set: { style: 'glass', color: '#0e7490', radius: 22, theme: 'light', launcher: 'pill', font: 'plex' } },
    { id: 'pro', name: 'Bedrift', desc: 'Stramt og nøkternt, for bank og forsikring.', set: { style: 'pro', color: '#1f4ed8', radius: 4, theme: 'light', launcher: 'round', font: 'plex' } },
    { id: 'side', name: 'Sidepanel', desc: 'Åpner seg i full høyde langs kanten.', set: { style: 'side', color: '#0f5a4a', radius: 16, theme: 'light', launcher: 'pill', font: 'plex' } },
    { id: 'compact', name: 'Kompakt', desc: 'Liten og diskré, tar lite plass.', set: { style: 'compact', color: '#b4471c', radius: 10, theme: 'light', launcher: 'round', font: 'system' } },
    { id: 'night', name: 'Natt', desc: 'Mørk med lysende detaljer.', set: { style: 'night', color: '#22d3a6', radius: 18, theme: 'dark', launcher: 'round', font: 'plex' } }
  ];

  /* Statisk miniatyr av chatboten, brukt i designvelgeren */
  function thumb(host, c, name) {
    var r = make('div', rootClass(c, 'thumb', true));
    setVars(r, c);
    var av = svg(c.icon || 'chat', 15);
    r.innerHTML =
      '<div class="vc-panel">' +
        '<div class="vc-head"><span class="vc-avatar">' + svg(c.icon || 'chat', 20) + '</span>' +
        '<div class="vc-title"><b>' + esc(name || c.botName || 'Assistenten') + '</b><small><i class="vc-dot"></i><span>Svarer med en gang</span></small></div></div>' +
        '<div class="vc-log">' +
          '<div class="vc-row vc-bot"><span class="vc-mini-av">' + av + '</span><div class="vc-bubble">Hei! Hva kan jeg hjelpe deg med?</div></div>' +
          '<div class="vc-row vc-user"><div class="vc-bubble">Når er neste visning?</div></div>' +
          '<div class="vc-row vc-bot"><span class="vc-mini-av">' + av + '</span><div class="vc-bubble">Søndag kl. 13–14.</div></div>' +
        '</div>' +
        '<div class="vc-form"><span class="vc-input">Skriv en melding …</span><span class="vc-send">' + svg('send', 18) + '</span></div>' +
      '</div>';
    host.innerHTML = '';
    host.appendChild(r);
    return r;
  }

  global.VintraChat = {
    create: function (host, config, opts) { return new Chat(host, config, opts); },
    designs: DESIGNS,
    thumb: thumb,
    presets: PRESETS,
    clone: function (o) { return JSON.parse(JSON.stringify(o)); },
    inkFor: inkFor,
    svg: svg,
    respond: respond
  };
})(window);
