/* ==========================================================================
   Hollow Motion — scroll reveals, parallax, magnetic buttons, header state.
   Markup is never rewritten: elements are tagged with data attributes only,
   so sections keep their existing structure, content and layout.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;

  var reducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animationsOff =
    document.body && document.body.getAttribute('data-disable-animations') === 'true';

  if (reducedMotion || animationsOff) return;

  var supportsIO = 'IntersectionObserver' in window;

  /* ------------------------------------------------------------------
     Configuration
     ------------------------------------------------------------------ */

  // Regions that must never be reveal-animated: they are fixed, sticky,
  // overlaid, or already animated by the theme.
  var EXCLUDED_REGIONS = [
    '.site-header',
    '.header-wrapper',
    '.header-sticky-wrapper',
    '.announcement-bar',
    '.hollow-announcement',
    '.hollow-subnav',
    '.hollow-collection-nav',
    '.drawer',
    '.modal',
    '#CartDrawer',
    '.hollow-sticky-atc',
    '.hollow-luck',
    '.product-single__sticky',
    '.predictive-search',
    '.shopify-payment-button',
    '.hollow-offers',
    '[data-hm-skip]'
  ].join(',');

  // Selector -> reveal type. Evaluated in order; the first match wins.
  var GROUPS = [
    {
      type: 'card',
      selector: [
        '.hollow-advantage__item',
        '.hollow-banners__item',
        '.hollow-reviews__card',
        '.hollow-trust__item',
        '.hollow-wins__item',
        '.hollow-benefits__item',
        '.hollow-activity__card',
        '.hollow-about__means-item',
        '.hollow-intro__feature',
        '[class*="scroll-card-"]:not([class*="scroll-card-image-"]):not([class*="scroll-card-content-"])',
        '[class*="feature-item-"]'
      ].join(',')
    },
    {
      type: 'mask',
      selector: 'h1, h2, .h1, .h2, .section-header__title, [class*="feature-main-heading-"]'
    },
    {
      type: 'up',
      selector: 'h3, h4, .h3, .h4, .section-header__subtitle'
    },
    {
      type: 'img',
      selector: [
        '.hollow-highlights__media',
        '.hollow-about__fiber-media',
        '.hollow-intro__activity-media',
        '[class*="scroll-card-image-"]'
      ].join(',')
    },
    {
      type: 'up',
      selector: 'p, .rte, .hollow-check-list, blockquote, .collapsibles-wrapper'
    },
    {
      type: 'up',
      selector: '.btn, .hollow-btn, .hollow-btn--dark, .hollow-hero__cta'
    }
  ];

  // Deliberately narrow: only the large hero art drifts, plus anything a
  // section opts into by hand. Parallax and the hover zoom cannot share an
  // element because both drive the same transform.
  var PARALLAX_SELECTOR = '.hollow-hero__media, [data-hm-parallax-target]';

  var MAGNETIC_SELECTOR = '.hollow-hero__cta, .hollow-btn--dark';

  var STAGGER_STEP = 80;
  var STAGGER_MAX = 400;
  var PARALLAX_STRENGTH = 46;
  var MAGNET_STRENGTH = 0.28;
  var MAGNET_MAX = 7;

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  function isExcluded(el) {
    return !!el.closest(EXCLUDED_REGIONS);
  }

  function alreadyTagged(el) {
    // Skip nested tagging so a card animates as one unit.
    return el.hasAttribute('data-hm') || !!el.parentElement.closest('[data-hm]');
  }

  function setStagger(el, index) {
    var delay = Math.min(index * STAGGER_STEP, STAGGER_MAX);
    if (delay > 0) el.style.setProperty('--hm-d', delay + 'ms');
  }

  /* ------------------------------------------------------------------
     Reveal observer
     ------------------------------------------------------------------ */

  var revealObserver = supportsIO
    ? new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            reveal(entry.target);
            revealObserver.unobserve(entry.target);
          });
        },
        // threshold 0 rather than a fraction: an element taller than the
        // viewport can never reach a percentage threshold and would stay hidden.
        { threshold: 0, rootMargin: '0px 0px -8% 0px' }
      )
    : null;

  function reveal(el) {
    requestAnimationFrame(function () {
      el.classList.add('hm-in');
    });
  }

  function register(el) {
    if (revealObserver) {
      revealObserver.observe(el);
    } else {
      el.classList.add('hm-in');
    }
  }

  /* ------------------------------------------------------------------
     Tagging
     ------------------------------------------------------------------ */

  function tagProductCards(scope) {
    toArray(scope.querySelectorAll('.grid-product:not([data-hm])')).forEach(function (card) {
      if (!card.querySelector('.grid-product__content')) return;
      if (card.closest('.drawer, .modal, #CartDrawer')) return;

      var siblings = toArray(card.parentElement.children);
      card.setAttribute('data-hm', 'prod');
      setStagger(card, siblings.indexOf(card) % 4);
      register(card);
    });
  }

  function tagGroup(scope, group) {
    var counters = new WeakMap();

    toArray(scope.querySelectorAll(group.selector)).forEach(function (el) {
      if (!el.parentElement) return;
      if (el.hasAttribute('data-aos')) return;
      if (isExcluded(el)) return;
      if (alreadyTagged(el)) return;
      if (!el.offsetParent && el.offsetHeight === 0) return;

      var parent = el.parentElement;
      var index = counters.get(parent) || 0;
      counters.set(parent, index + 1);

      el.setAttribute('data-hm', group.type);
      setStagger(el, index);
      register(el);
    });
  }

  function tagParallax(scope) {
    toArray(scope.querySelectorAll(PARALLAX_SELECTOR)).forEach(function (el) {
      if (el.hasAttribute('data-hm-parallax')) return;
      if (el.hasAttribute('data-hm')) return;
      if (!el.querySelector('img')) return;
      el.setAttribute('data-hm-parallax', '');
      parallaxItems.push(el);
    });
  }

  function tagMagnetic(scope) {
    toArray(scope.querySelectorAll(MAGNETIC_SELECTOR)).forEach(function (el) {
      if (el.hasAttribute('data-hm-magnetic')) return;
      el.setAttribute('data-hm-magnetic', '');
      bindMagnet(el);
    });
  }

  function tagAll(scope) {
    var target = scope || document;
    tagProductCards(target);
    GROUPS.forEach(function (group) {
      tagGroup(target, group);
    });
    tagParallax(target);
    tagMagnetic(target);
  }

  /* ------------------------------------------------------------------
     Hero: reveal the first section immediately, in sequence
     ------------------------------------------------------------------ */

  function playHero() {
    var main = document.querySelector('#MainContent') || document.body;
    var firstSection = main.querySelector('.shopify-section');
    if (!firstSection) return;

    var items = toArray(firstSection.querySelectorAll('[data-hm]'));
    if (!items.length) return;

    items.forEach(function (el, index) {
      if (revealObserver) revealObserver.unobserve(el);
      el.style.setProperty('--hm-d', Math.min(index * 110, 660) + 'ms');
    });

    requestAnimationFrame(function () {
      items.forEach(function (el) {
        el.classList.add('hm-in');
      });
    });
  }

  /* ------------------------------------------------------------------
     Parallax
     ------------------------------------------------------------------ */

  var parallaxItems = [];
  var scrollQueued = false;

  function updateParallax() {
    var viewportHeight = window.innerHeight;

    parallaxItems.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > viewportHeight + 200) return;

      // -1 (below the fold) .. 1 (above the fold)
      var progress = (rect.top + rect.height / 2 - viewportHeight / 2) / (viewportHeight / 2 + rect.height / 2);
      progress = Math.max(-1, Math.min(1, progress));
      el.style.setProperty('--hm-py', (progress * PARALLAX_STRENGTH).toFixed(2) + 'px');
    });
  }

  function onScroll() {
    root.classList.toggle('hm-scrolled', window.scrollY > 40);

    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(function () {
      updateParallax();
      scrollQueued = false;
    });
  }

  /* ------------------------------------------------------------------
     Magnetic buttons
     ------------------------------------------------------------------ */

  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function bindMagnet(el) {
    if (!finePointer) return;

    el.addEventListener('pointermove', function (evt) {
      var rect = el.getBoundingClientRect();
      var x = (evt.clientX - rect.left - rect.width / 2) * MAGNET_STRENGTH;
      var y = (evt.clientY - rect.top - rect.height / 2) * MAGNET_STRENGTH;

      el.classList.add('hm-magnet-active');
      el.style.setProperty('--hm-mx', Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, x)).toFixed(1) + 'px');
      el.style.setProperty('--hm-my', Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, y)).toFixed(1) + 'px');
    });

    el.addEventListener('pointerleave', function () {
      el.classList.remove('hm-magnet-active');
      el.style.setProperty('--hm-mx', '0px');
      el.style.setProperty('--hm-my', '0px');
    });
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */

  function start() {
    root.classList.add('hm-ready');

    tagAll(document);
    playHero();
    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateParallax);

    // Theme editor + AJAX-injected content (quick shop, load more, filters).
    document.addEventListener('shopify:section:load', function () {
      tagAll(document);
    });

    var rescan = null;
    var contentObserver = new MutationObserver(function () {
      clearTimeout(rescan);
      rescan = setTimeout(function () {
        tagAll(document);
      }, 250);
    });

    var main = document.querySelector('#MainContent');
    if (main) contentObserver.observe(main, { childList: true, subtree: true });

    // Failsafe: nothing should ever stay invisible.
    setTimeout(function () {
      toArray(document.querySelectorAll('[data-hm]:not(.hm-in)')).forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) el.classList.add('hm-in');
      });
    }, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
