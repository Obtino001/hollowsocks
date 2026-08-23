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

  function initHollowPdpVariants() {
    document.querySelectorAll('.hollow-variant--size').forEach(function (wrap) {
      var selected = wrap.querySelector('[data-hollow-size-selected]');
      var range = wrap.querySelector('[data-hollow-size-range]');
      wrap.querySelectorAll('input[data-variant-input]').forEach(function (input) {
        input.addEventListener('change', function () {
          if (!input.checked) return;
          var label = wrap.querySelector('label[for="' + input.id + '"]');
          if (!label) return;
          if (selected) selected.textContent = (label.getAttribute('data-size-key') || input.value || '').toUpperCase();
          if (range) {
            var next = label.getAttribute('data-size-range') || '';
            range.textContent = next;
            range.style.display = next ? '' : 'none';
          }
        });
      });
    });

    document.querySelectorAll('.hollow-variant--fit').forEach(function (wrap) {
      var selected = wrap.querySelector('[data-hollow-fit-selected]');
      wrap.querySelectorAll('input[data-variant-input]').forEach(function (input) {
        input.addEventListener('change', function () {
          if (!input.checked || !selected) return;
          selected.textContent = (input.value || '').toUpperCase();
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

  function updateHollowCartUI(count) {
    var n = typeof count === 'number' ? count : 0;
    document.querySelectorAll('[data-hollow-cart-count]').forEach(function (el) {
      el.textContent = String(n);
    });
    document.querySelectorAll('[data-hollow-subtotal-label]').forEach(function (el) {
      el.textContent = n === 1 ? '1 ITEM' : n + ' ITEMS';
    });

    var progress = document.querySelector('[data-hollow-cart-progress]');
    if (!progress) return;

    var threshold = Number(progress.getAttribute('data-threshold') || 2);
    var free = Number(progress.getAttribute('data-free') || 2);
    var remaining = Math.max(0, threshold - n);
    var msgEl = progress.querySelector('[data-hollow-progress-message]');
    var bar = progress.querySelector('[data-hollow-progress-bar]');
    var incomplete = progress.getAttribute('data-msg-incomplete') || '';
    var complete = progress.getAttribute('data-msg-complete') || '';

    if (msgEl) {
      if (n >= threshold) {
        msgEl.textContent = complete;
      } else {
        msgEl.textContent = incomplete
          .replace('[remaining]', String(remaining))
          .replace('[free]', String(free));
      }
    }

    if (bar) {
      var pct = 0;
      if (n >= threshold) pct = 100;
      else if (n <= 0) pct = 0;
      else if (n === 1) pct = 33;
      else pct = Math.min(99, Math.round((n / threshold) * 100));
      bar.style.width = pct + '%';
      progress.classList.toggle('is-complete', n >= threshold);
    }

    progress.querySelectorAll('.hollow-cart-progress__step').forEach(function (step) {
      var stepNum = Number(step.getAttribute('data-step') || 0);
      var active = false;
      if (stepNum === 1) active = n >= 1;
      else if (stepNum === 2) active = n >= 2;
      else active = n >= threshold;
      step.classList.toggle('is-active', active);

      var label = step.querySelector('[data-step-label]');
      if (label && stepNum === 1) label.textContent = n >= 1 ? 'IN CART' : 'PAIR 1';
      if (label && stepNum === 2) label.textContent = n >= 2 ? 'IN CART' : 'ADD 1';
    });

    progress.setAttribute('data-count', String(n));
  }

  function initHollowCartDrawer() {
    document.addEventListener('cart:updated', function (evt) {
      var cart = evt && evt.detail && evt.detail.cart;
      if (cart && typeof cart.item_count !== 'undefined') {
        updateHollowCartUI(cart.item_count);
      }
    });

    document.addEventListener('cart:build', function () {
      window.setTimeout(function () {
        var items = document.querySelector('#CartDrawerForm [data-products] .cart__items');
        if (items && items.dataset.count) {
          updateHollowCartUI(parseInt(items.dataset.count, 10) || 0);
        }
      }, 50);
    });

    var form = document.getElementById('CartDrawerForm');
    if (!form) return;
    var observer = new MutationObserver(function () {
      var items = form.querySelector('[data-products] .cart__items');
      if (items && items.dataset.count) {
        updateHollowCartUI(parseInt(items.dataset.count, 10) || 0);
      }
    });
    var products = form.querySelector('[data-products]');
    if (products) {
      observer.observe(products, { childList: true, subtree: true });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-hollow-countdown]').forEach(tickCountdown);
    stickyAnnouncement();
    initOffers();
    initHollowPdpVariants();
    initLuck();
    duplicateMarquee();
    initHollowCartDrawer();
  });
})();
