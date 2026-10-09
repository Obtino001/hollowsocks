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
    if (window.matchMedia('(max-width: 768px)').matches) return;
    document.querySelectorAll('[data-hollow-marquee] .hollow-social__row').forEach(function (row) {
      if (row.dataset.cloned === 'true') return;
      Array.from(row.children).forEach(function (item) {
        var clone = item.cloneNode(true);
        clone.setAttribute('data-hollow-marquee-clone', '');
        clone.setAttribute('aria-hidden', 'true');
        clone.setAttribute('tabindex', '-1');
        clone.removeAttribute('data-shopify-editor-block');
        row.appendChild(clone);
      });
      row.dataset.cloned = 'true';
    });
  }

  function updateHollowCartUI(count, bundleCount, bundleTotal, bundleDiscount) {
    var n = typeof count === 'number' ? count : 0;
    document.querySelectorAll('[data-hollow-cart-count]').forEach(function (el) {
      el.textContent = String(n);
    });
    document.querySelectorAll('[data-hollow-subtotal-label]').forEach(function (el) {
      el.textContent = n === 1 ? '1 ITEM' : n + ' ITEMS';
    });
    if (!Number.isFinite(bundleCount)) return;
    var eligible = bundleCount;

    var progress = document.querySelector('[data-hollow-cart-progress]');
    if (!progress) return;

    var msgEl = progress.querySelector('[data-hollow-progress-message]');

    if (msgEl) {
      if (eligible === 0) msgEl.textContent = 'Add 2 pairs to unlock your special offer.';
      else if (eligible === 1) msgEl.textContent = 'Add 1 more pair to unlock your special offer.';
      else if (eligible === 2) msgEl.textContent = 'Choose your 2 extra pairs!';
      else if (eligible === 3) msgEl.textContent = 'Add 1 more pair to complete your 4-pair bundle.';
      else if (eligible === 4 && bundleTotal === 59900) msgEl.textContent = '4-pair bundle active: 599 kr.';
      else if (eligible === 5) msgEl.textContent = 'Add 1 more pair for the 6-pair offer.';
      else if (eligible === 6 && bundleTotal === 89900) msgEl.textContent = '6-pair bundle active: 899 kr.';
      else msgEl.textContent = 'See your discount and subtotal below.';
    }

    var action = progress.querySelector('[data-hollow-choose-extras]');
    if (action) action.hidden = eligible !== 2 && eligible !== 3;

    var bar = progress.querySelector('[data-hollow-progress-bar]');
    if (bar) {
      var pct = 0;
      if (eligible >= 4) pct = 100;
      else if (eligible <= 0) pct = 0;
      else pct = Math.round((eligible / 4) * 100);
      bar.style.width = pct + '%';
      progress.classList.toggle('is-complete', eligible >= 4 && bundleDiscount >= 59700);
    }

    progress.querySelectorAll('[data-step]').forEach(function (step) {
      var stepNumber = parseInt(step.getAttribute('data-step'), 10) || 0;
      step.classList.toggle('is-active', eligible >= stepNumber);

      var label = step.querySelector('[data-step-label]');
      if (label) {
        if (stepNumber >= 3) label.textContent = eligible >= 4 && bundleDiscount >= 59700 ? 'FREE' : 'PAIR ' + stepNumber;
        else label.textContent = eligible >= stepNumber ? 'IN CART' : 'PAIR ' + stepNumber;
      }
    });

    progress.setAttribute('data-count', String(eligible));
  }

  function initHollowMixMatch() {
    var dialog = document.querySelector('[data-hollow-mix-dialog]');
    var progress = document.querySelector('[data-hollow-cart-progress]');
    if (!dialog || !progress || !dialog.showModal) return null;

    var cards = Array.from(dialog.querySelectorAll('[data-hollow-mix-product]'));
    var closeButton = dialog.querySelector('[data-hollow-mix-close]');
    var description = dialog.querySelector('[data-hollow-mix-description]');
    var progressText = dialog.querySelector('[data-hollow-mix-progress]');
    var summary = dialog.querySelector('[data-hollow-mix-summary]');
    var confirmButton = dialog.querySelector('[data-hollow-mix-confirm]');
    var errorText = dialog.querySelector('[data-hollow-mix-error]');
    var emptyText = dialog.querySelector('[data-hollow-mix-empty]');
    var selected = new Map();
    var current = Number(progress.dataset.count) || 0;
    var target = 4;
    var busy = false;
    var returnFocus = null;
    var handoffToCart = false;

    emptyText.hidden = cards.length > 0;

    function selectedCount() {
      var total = 0;
      selected.forEach(function (item) { total += item.quantity; });
      return total;
    }

    function missingCount() {
      return Math.max(0, target - current);
    }

    function variantFor(card) {
      var input = card.querySelector('[data-hollow-mix-variant]');
      if (!input || !input.value) return null;
      var label = input.tagName === 'SELECT' ? input.options[input.selectedIndex].textContent.trim() : '';
      return { id: input.value, title: card.dataset.productTitle, label: label };
    }

    function showError(message) {
      errorText.textContent = message || '';
      errorText.hidden = !message;
    }

    function render() {
      var needed = missingCount();
      var chosen = selectedCount();
      progressText.textContent = chosen + ' / ' + needed;
      summary.textContent = chosen
        ? Array.from(selected.values()).map(function (item) {
          return item.title + (item.label && item.label !== 'Default Title' ? ' · ' + item.label : '') + ' ×' + item.quantity;
        }).join(', ')
        : 'Choose your designs';
      confirmButton.textContent = target === 4 && needed === 2 ? 'ADD MY 2 EXTRA PAIRS' : 'ADD MY ' + needed + ' PAIRS';
      confirmButton.disabled = busy || needed === 0 || chosen !== needed || cards.length === 0;
      confirmButton.classList.toggle('btn--loading', busy);

      cards.forEach(function (card) {
        var variant = variantFor(card);
        var quantity = variant && selected.has(variant.id) ? selected.get(variant.id).quantity : 0;
        card.querySelector('[data-hollow-mix-quantity]').textContent = String(quantity);
        card.classList.toggle('is-selected', quantity > 0);
        card.querySelector('[data-hollow-mix-minus]').disabled = busy || quantity === 0;
        card.querySelector('[data-hollow-mix-plus]').disabled = busy || chosen >= needed || !variant;
        card.querySelector('[data-hollow-mix-variant]').disabled = busy;
      });
    }

    function open(bundleTarget, trigger) {
      if (busy || dialog.open) return;
      target = bundleTarget;
      current = Number(progress.dataset.count) || 0;
      if (current >= target) {
        document.dispatchEvent(new CustomEvent('cart:open'));
        return;
      }
      selected.clear();
      showError('');
      returnFocus = trigger || document.activeElement;
      description.textContent = target === 4 && current === 2
        ? "You've unlocked 2 extra pairs! Choose your designs."
        : 'Choose ' + missingCount() + ' ' + (missingCount() === 1 ? 'pair' : 'pairs') + ' to complete your ' + target + '-pair bundle.';
      render();
      var drawer = document.getElementById('CartDrawer');
      if (drawer && drawer.classList.contains('drawer--is-open')) {
        document.dispatchEvent(new CustomEvent('cart:close'));
      }
      dialog.showModal();
      document.documentElement.classList.add('hollow-mix-open');
      closeButton.focus();
      window.setTimeout(function () { if (dialog.open) closeButton.focus(); }, 550);
    }

    function sync(eligibleCount) {
      if (!Number.isFinite(eligibleCount)) return;
      current = eligibleCount;
      if (dialog.open) {
        if (current >= target) dialog.close();
        else render();
      }
    }

    cards.forEach(function (card) {
      card.querySelector('[data-hollow-mix-variant]').addEventListener('change', render);
      ['plus', 'minus'].forEach(function (direction) {
        card.querySelector('[data-hollow-mix-' + direction + ']').addEventListener('click', function () {
          if (busy) return;
          var variant = variantFor(card);
          if (!variant) return;
          var item = selected.get(variant.id);
          var quantity = item ? item.quantity : 0;
          if (direction === 'plus' && selectedCount() < missingCount()) quantity += 1;
          else if (direction === 'minus' && quantity > 0) quantity -= 1;
          else return;
          if (quantity === 0) selected.delete(variant.id);
          else selected.set(variant.id, { quantity: quantity, title: variant.title, label: variant.label });
          showError('');
          render();
        });
      });
    });

    closeButton.addEventListener('click', function () { if (!busy) dialog.close(); });
    dialog.addEventListener('click', function (event) { if (event.target === dialog && !busy) dialog.close(); });
    dialog.addEventListener('cancel', function (event) { if (busy) event.preventDefault(); });
    dialog.addEventListener('close', function () {
      document.documentElement.classList.remove('hollow-mix-open');
      if (!handoffToCart && returnFocus && returnFocus.isConnected && returnFocus.offsetParent !== null) returnFocus.focus();
      handoffToCart = false;
    });

    confirmButton.addEventListener('click', function () {
      var needed = missingCount();
      if (busy || needed === 0 || selectedCount() !== needed) return;
      var itemsToAdd = Array.from(selected.entries()).map(function (entry) {
        return { id: Number(entry[0]), quantity: entry[1].quantity };
      });
      var addAttempted = false;
      busy = true;
      showError('');
      render();

      theme.cart.getCartProductMarkup()
        .then(function (markup) {
          var container = document.createElement('div');
          container.innerHTML = markup;
          var items = container.querySelector('.cart__items');
          if (!items || !items.hasAttribute('data-bundle-count')) throw new Error('Could not check your cart. Please try again.');
          var latestCount = Number(items.dataset.bundleCount);
          if (!Number.isFinite(latestCount)) throw new Error('Could not check your cart. Please try again.');
          if (latestCount !== current || target - latestCount !== selectedCount()) {
            current = latestCount;
            throw new Error('Your cart changed. Please review your selection.');
          }
          addAttempted = true;
          return fetch(theme.routes.cartAdd, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ items: itemsToAdd })
          }).then(function (response) {
            return response.json().then(function (result) {
              if (!response.ok || result.status === 422) {
                throw new Error(typeof result.description === 'string' ? result.description : result.message || 'Some designs are unavailable. Please choose again.');
              }
              return result;
            });
          });
        })
        .then(function (result) {
          handoffToCart = true;
          dialog.close();
          document.dispatchEvent(new CustomEvent('ajaxProduct:added', {
            detail: { product: result, addToCartBtn: confirmButton }
          }));
        })
        .catch(function (error) {
          showError(error.message || 'Could not add your pairs. Please try again.');
          if (addAttempted) document.dispatchEvent(new CustomEvent('cart:build'));
        })
        .finally(function () {
          busy = false;
          if (dialog.open) render();
        });
    });

    return { open: open, sync: sync, isOpen: function () { return dialog.open; } };
  }

  function initHollowBundleOffers(mixMatch) {
    document.querySelectorAll('[data-hollow-offers]').forEach(function (offers) {
      if (offers.dataset.bundleReady === 'true') return;
      var form = offers.parentElement.querySelector('.product-single__form');
      if (!form) return;
      offers.dataset.bundleReady = 'true';
      var target = 1;

      offers.querySelectorAll('[data-bundle-quantity]').forEach(function (card) {
        card.addEventListener('click', function () {
          target = Number(card.getAttribute('data-bundle-quantity')) || 1;
          offers.querySelectorAll('[data-bundle-quantity]').forEach(function (option) {
            var active = option === card;
            option.classList.toggle('is-selected', active);
            option.setAttribute('aria-pressed', String(active));
          });
          if (target > 1 && mixMatch) mixMatch.open(target, card);
        });
      });

      form.addEventListener('submit', function (event) {
        if (target === 1) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (mixMatch) mixMatch.open(target, form.querySelector('[data-add-to-cart]'));
      }, true);
    });
  }

  function initHollowCartDrawer(mixMatch) {
    var form = document.getElementById('CartDrawerForm');
    if (!form) return;
    var products = form.querySelector('[data-products]');
    var progress = form.querySelector('[data-hollow-cart-progress]');
    if (!products || !progress) return;
    var previousCount = Number(progress.dataset.count) || 0;
    var action = progress.querySelector('[data-hollow-choose-extras]');
    if (action && mixMatch) action.addEventListener('click', function () { mixMatch.open(4, action); });

    function syncFromMarkup() {
      var items = products.querySelector('.cart__items');
      if (!items) return;
      var eligible = Number(items.dataset.bundleCount);
      if (!Number.isFinite(eligible)) return;
      updateHollowCartUI(Number(items.dataset.count) || 0, eligible, Number(items.dataset.bundleTotal), Number(items.dataset.bundleDiscount));
      if (mixMatch) {
        mixMatch.sync(eligible);
        if (previousCount < 2 && eligible === 2 && !mixMatch.isOpen()) mixMatch.open(4, document.activeElement);
      }
      previousCount = eligible;
    }

    new MutationObserver(syncFromMarkup).observe(products, { childList: true });
    syncFromMarkup();
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
    initStickyAtc();
    initHollowPdpVariants();
    var mixMatch = initHollowMixMatch();
    initHollowBundleOffers(mixMatch);
    document.addEventListener('shopify:section:load', function () { initHollowBundleOffers(mixMatch); });
    initLuck();
    duplicateMarquee();
    window.addEventListener('resize', duplicateMarquee);
    document.addEventListener('shopify:section:load', duplicateMarquee);
    initHollowCartDrawer(mixMatch);
  });
})();
