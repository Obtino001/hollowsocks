(function () {
  function pad(value) {
    return String(Math.max(0, value)).padStart(2, '0');
  }

  function tickCountdown(root) {
    var configured = Date.parse(root.getAttribute('data-end') || '');
    if (!configured) return;

    function render() {
      var now = Date.now();
      var end = configured;
      // Keep timer looking like Hollow (under 24h) when sale end is far away
      if (end - now > 86400000) {
        var eod = new Date();
        eod.setHours(23, 59, 59, 999);
        end = eod.getTime();
      }
      var diff = Math.max(0, end - now);
      var hours = Math.floor(diff / 3600000);
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
      syncStickyHeaderHeight();
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  function syncStickyHeaderHeight() {
    var stuck = document.querySelector('.site-header--stuck') || document.querySelector('.site-header');
    if (!stuck) return;
    var h = Math.ceil(stuck.getBoundingClientRect().height);
    if (h > 0) {
      document.documentElement.style.setProperty('--header-height', h + 'px');
    }
  }

  function initStickyAtc() {
    var bar = document.querySelector('[data-hollow-sticky-atc]');
    if (!bar) return;
    var mainBtn =
      document.querySelector('.product-single__form [data-add-to-cart]') ||
      document.querySelector('[data-add-to-cart]');
    if (!mainBtn) return;
    var stickyBtn = bar.querySelector('[data-hollow-sticky-atc-btn]');

    function setVisible(on) {
      if (on) {
        bar.hidden = false;
        bar.removeAttribute('hidden');
        bar.classList.add('is-visible');
        bar.setAttribute('aria-hidden', 'false');
        document.body.classList.add('hollow-sticky-atc-open');
      } else {
        bar.classList.remove('is-visible');
        bar.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('hollow-sticky-atc-open');
        window.setTimeout(function () {
          if (!bar.classList.contains('is-visible')) {
            bar.hidden = true;
          }
        }, 280);
      }
    }

    function check() {
      var rect = mainBtn.getBoundingClientRect();
      setVisible(rect.bottom < 0);
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          var entry = entries[0];
          if (!entry) return;
          setVisible(entry.boundingClientRect.bottom < 0 || (!entry.isIntersecting && entry.boundingClientRect.top < 0));
        },
        { threshold: [0, 1], rootMargin: '0px' }
      );
      observer.observe(mainBtn);
    }

    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    check();

    if (stickyBtn) {
      stickyBtn.addEventListener('click', function () {
        if (stickyBtn.disabled) return;
        if (typeof mainBtn.click === 'function') {
          mainBtn.click();
        }
      });
    }

    var priceEl = bar.querySelector('[data-hollow-sticky-price]');
    var labelEl = bar.querySelector('[data-hollow-sticky-label]');
    var variantEl = bar.querySelector('[data-hollow-sticky-variant]');

    function syncVariant(variant) {
      if (!stickyBtn) return;
      var available = !!(variant && variant.available);

      stickyBtn.disabled = !available;

      if (labelEl) {
        labelEl.textContent = available
          ? stickyBtn.getAttribute('data-label')
          : stickyBtn.getAttribute('data-sold-out-label');
      }

      if (priceEl) {
        if (available && window.theme && theme.Currency) {
          priceEl.innerHTML = theme.Currency.formatMoney(variant.price, theme.settings.moneyFormat);
        } else {
          priceEl.textContent = '';
        }
      }

      if (variantEl) {
        var title = variant && variant.title ? variant.title.replace(/ \/ /g, ', ') : '';
        variantEl.textContent = title && title !== 'Default Title' ? '(' + title + ')' : '';
      }
    }

    document.addEventListener('variant:change', function (evt) {
      if (evt.detail) syncVariant(evt.detail.variant);
    });
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

  function initHollowQuickAdd() {
    document.addEventListener(
      'click',
      function (evt) {
        var btn = evt.target && evt.target.closest ? evt.target.closest('[data-hollow-quick-add]') : null;
        if (!btn || btn.disabled || btn.classList.contains('is-loading')) return;

        evt.preventDefault();
        evt.stopPropagation();

        var variantId = btn.getAttribute('data-variant-id');
        if (!variantId) return;

        var addUrl =
          (window.theme && theme.routes && theme.routes.cartAdd) ||
          (window.routes && window.routes.cart_add_url) ||
          '/cart/add.js';

        btn.classList.add('is-loading');

        fetch(addUrl, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({ id: Number(variantId), quantity: 1 })
        })
          .then(function (response) {
            return response.json().then(function (data) {
              return { ok: response.ok, data: data };
            });
          })
          .then(function (result) {
            btn.classList.remove('is-loading');
            if (!result.ok || result.data.status === 422) return;

            var cartType = (window.theme && theme.settings && theme.settings.cartType) || 'drawer';
            if (cartType === 'page') {
              window.location = (window.theme && theme.routes && theme.routes.cartPage) || '/cart';
              return;
            }

            document.dispatchEvent(
              new CustomEvent('ajaxProduct:added', {
                detail: { product: result.data, addToCartBtn: btn }
              })
            );
          })
          .catch(function () {
            btn.classList.remove('is-loading');
          });
      },
      true
    );
  }

  initHollowQuickAdd();

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-hollow-countdown]').forEach(tickCountdown);
    stickyAnnouncement();
    syncStickyHeaderHeight();
    window.addEventListener('scroll', syncStickyHeaderHeight, { passive: true });
    window.addEventListener('resize', syncStickyHeaderHeight);
    initOffers();
    initStickyAtc();
    initHollowPdpVariants();
    initLuck();
    duplicateMarquee();
    initHollowCartDrawer();
  });
})();
