/* Vintra for virksomheter: felles skript for alle sider. */
(function () {
  var $ = function (id) { return document.getElementById(id); };

  /* Samtykke til informasjonskapsler. Valget huskes i nettleseren. */
  var cookie = $('cookie');
  if (cookie) {
    var stored = null;
    try { stored = localStorage.getItem('vintra-cookie-choice'); } catch (e) {}
    if (!stored) cookie.hidden = false;
    cookie.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        try { localStorage.setItem('vintra-cookie-choice', b.getAttribute('data-choice')); } catch (e) {}
        cookie.hidden = true;
      });
    });
  }

  /* Demoskjema. NB: ikke koblet til noe ennå, viser bare en kvittering. */
  var form = $('demoForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      $('successName').textContent = $('f-first').value.trim();
      form.hidden = true;
      if (form.previousElementSibling) form.previousElementSibling.hidden = true;
      $('formSuccess').hidden = false;
    });
  }

  /* Bunnmeny på mobil: marker seksjonen som er på skjermen (bare forsiden). */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tabbar [data-section]'));
  if (tabs.length && 'IntersectionObserver' in window) {
    var setActive = function (id) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-section') === id;
        t.classList.toggle('is-active', on);
        if (on) t.setAttribute('aria-current', 'location'); else t.removeAttribute('aria-current');
      });
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    tabs.forEach(function (t) {
      var s = document.getElementById(t.getAttribute('data-section'));
      if (s) io.observe(s);
    });
  }
})();
