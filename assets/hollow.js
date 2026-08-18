(function () {
  function pad(value) {
    return String(Math.max(0, value)).padStart(2, '0');
  }

  function tickCountdown(root) {
    var end = Date.parse(root.getAttribute('data-end') || '');
    if (!end) return;

    function render() {
      var diff = Math.max(0, end - Date.now());
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
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-hollow-countdown]').forEach(tickCountdown);
    stickyAnnouncement();
  });
})();
