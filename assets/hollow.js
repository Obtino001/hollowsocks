(function () {
  function pad(value) {
    return String(Math.max(0, value)).padStart(2, '0');
  }

  function tickCountdown(root) {
    var end = Date.parse(root.getAttribute('data-end') || '');
    if (!end) return;

    function render() {
      var diff = Math.max(0, end - Date.now());
      var hours = Math.min(99, Math.floor(diff / 3600000));
      var minutes = Math.floor((diff % 3600000) / 60000);
      var seconds = Math.floor((diff % 60000) / 1000);
      var hourEl = root.querySelector('[data-unit="hours"]');
      var minEl = root.querySelector('[data-unit="minutes"]');
      var secEl = root.querySelector('[data-unit="seconds"]');
      if (hourEl) hourEl.textContent = pad(hours);
      if (minEl) minEl.textContent = pad(minutes);
      if (secEl) secEl.textContent = pad(seconds);
    }

    render();
    window.setInterval(render, 1000);
  }

  function stickyAnnouncement() {
    var bar = document.querySelector('.hollow-announcement');
    if (!bar || bar.getAttribute('data-sticky') !== 'true') return;
    var isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile && bar.getAttribute('data-sticky-mobile') === 'false') return;
    var spacer = document.createElement('div');
    bar.insertAdjacentElement('afterend', spacer);
    var top = bar.getBoundingClientRect().top + window.scrollY;

    function update() {
      var sticky = window.scrollY >= top;
      var height = bar.offsetHeight;
      spacer.style.height = sticky ? height + 'px' : '0';
      bar.classList.toggle('announcement-bar--sticky', sticky);
      document.body.style.setProperty('--sticky-announcement-bar-height', sticky ? height + 'px' : '0px');
      document.body.classList.toggle('has-sticky-announcement-bar', sticky);
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  function initOffers() {
    document.querySelectorAll('[data-hollow-offers]').forEach(function (root) {
      var qty = root.querySelector('[data-hollow-qty]');
      root.querySelectorAll('input[type="radio"]').forEach(function (input) {
        input.addEventListener('change', function () {
          root.querySelectorAll('.hollow-offers__card').forEach(function (card) {
            card.classList.toggle('is-selected', card.contains(input) && input.checked);
          });
          if (qty) qty.value = input.getAttribute('data-qty') || '1';
        });
      });
    });
  }

  function initLuck() {
    var root = document.querySelector('[data-hollow-luck]');
    if (!root) return;
    if (window.Shopify && Shopify.designMode) return;
    var delay = Number(root.getAttribute('data-delay') || 1000);
    var winText = root.getAttribute('data-win') || 'You matched 3 — use code HOLLOW at checkout.';
    var loseText = root.getAttribute('data-lose') || 'No match this time. Shop the sale anyway.';

    if (window.sessionStorage.getItem('hollow-luck-dismissed') === '1') return;

    window.setTimeout(function () {
      root.hidden = false;
    }, delay);

    var prizes = ['15%', '15%', '15%', 'FREE'];
    for (var i = prizes.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = prizes[i];
      prizes[i] = prizes[j];
      prizes[j] = t;
    }

    var picks = [];
    var cards = root.querySelectorAll('[data-hollow-card]');
    var result = root.querySelector('[data-hollow-luck-result]');
    cards.forEach(function (card, index) {
      var front = card.querySelector('.hollow-luck__face--front');
      if (front) front.textContent = prizes[index];
      card.addEventListener('click', function () {
        if (card.classList.contains('is-flipped')) return;
        card.classList.add('is-flipped');
        picks.push(prizes[index]);
        if (picks.length >= 3 && result) {
          var counts = {};
          picks.forEach(function (p) { counts[p] = (counts[p] || 0) + 1; });
          var matched = Object.keys(counts).some(function (key) { return counts[key] >= 3; });
          result.hidden = false;
          result.textContent = matched ? winText : loseText;
        }
      });
    });

    var dismiss = root.querySelector('[data-hollow-luck-dismiss]');
    if (dismiss) {
      dismiss.addEventListener('click', function () {
        root.hidden = true;
        window.sessionStorage.setItem('hollow-luck-dismissed', '1');
      });
    }
  }

  function duplicateMarquee() {
    document.querySelectorAll('[data-hollow-marquee] .hollow-social__row').forEach(function (row) {
      if (row.dataset.cloned === 'true') return;
      row.innerHTML += row.innerHTML;
      row.dataset.cloned = 'true';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-hollow-countdown]').forEach(tickCountdown);
    stickyAnnouncement();
    initOffers();
    initLuck();
    duplicateMarquee();
  });
})();
