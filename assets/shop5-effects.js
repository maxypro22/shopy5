/* ==========================================================================
   SHOP FIVE — Modern effects layer
   Scroll reveals, glass header, pointer-tracked card glow, hero parallax,
   back-to-top. Progressive enhancement: page is fully usable without JS.
   ========================================================================== */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  docEl.classList.add('sf-js');

  /* ------------------------------------------------------------------
     1. Glass header on scroll
     ------------------------------------------------------------------ */
  var scrolled = false;

  function onScrollHeader() {
    var shouldBe = window.scrollY > 24;
    if (shouldBe !== scrolled) {
      scrolled = shouldBe;
      docEl.classList.toggle('sf-scrolled', scrolled);
    }
  }

  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  /* ------------------------------------------------------------------
     2. Scroll-reveal (IntersectionObserver, staggered siblings)
     ------------------------------------------------------------------ */
  var REVEAL_TARGETS = [
    '.section__header',
    '.product-item',
    '.collection-item',
    '.text-with-icons__item',
    '.image-with-text__image-container',
    '.image-with-text__text-container',
    '.footer__block-item',
    '.article-item',
    '.promotion-block',
    '.rich-text .container > *'
  ].join(',');

  function setupReveals(root) {
    if (reducedMotion || !('IntersectionObserver' in window)) return;

    var scope = root || document;
    var nodes = Array.prototype.slice.call(scope.querySelectorAll(REVEAL_TARGETS));
    if (scope.nodeType === 1 && scope.matches && scope.matches(REVEAL_TARGETS)) nodes.unshift(scope);
    if (!nodes.length) return;

    // Group siblings so each row/lane staggers from 0 instead of growing forever
    var groups = new Map();

    nodes.forEach(function (el) {
      if (el.classList.contains('sf-reveal')) return;

      // Skip elements inside carousels managed by Flickity to avoid layout fights
      if (el.closest('.flickity-slider')) return;

      var parent = el.parentElement || document.body;
      var index = groups.get(parent) || 0;
      groups.set(parent, index + 1);

      el.classList.add('sf-reveal');
      if (el.matches('.product-item, .collection-item')) el.classList.add('sf-reveal--scale');
      el.style.setProperty('--sf-d', Math.min(index, 8));

      revealObserver.observe(el);
    });
  }

  var revealObserver;

  if (!reducedMotion && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          el.classList.add('sf-in');
          revealObserver.unobserve(el);

          // Once the entrance finishes, drop the reveal classes entirely so the
          // stagger transition-delay no longer slows down hover transitions.
          var delay = (parseInt(el.style.getPropertyValue('--sf-d'), 10) || 0) * 70;
          setTimeout(function () {
            el.classList.remove('sf-reveal', 'sf-reveal--scale', 'sf-in');
            el.style.removeProperty('--sf-d');
          }, 750 + delay);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    setupReveals(document);

    // Re-scan when Shopify section editor or AJAX (infinite scroll, quick view) injects content
    document.addEventListener('shopify:section:load', function (e) { setupReveals(e.target); });

    var mo = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        for (var j = 0; j < mutations[i].addedNodes.length; j++) {
          var node = mutations[i].addedNodes[j];
          if (node.nodeType === 1) setupReveals(node);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ------------------------------------------------------------------
     3. Pointer-tracked glow on product cards (desktop only)
     ------------------------------------------------------------------ */
  if (!reducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var glowFrame = null;

    document.addEventListener('pointermove', function (event) {
      var card = event.target.closest && event.target.closest('.product-item');
      if (!card) return;

      if (glowFrame) cancelAnimationFrame(glowFrame);
      glowFrame = requestAnimationFrame(function () {
        var rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((event.clientX - rect.left) / rect.width * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((event.clientY - rect.top) / rect.height * 100).toFixed(1) + '%');
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     4. Soft parallax on slideshow / hero images
     ------------------------------------------------------------------ */
  if (!reducedMotion) {
    var parallaxItems = [];
    var parallaxFrame = null;

    function collectParallax() {
      parallaxItems = Array.prototype.slice.call(
        document.querySelectorAll('.slideshow__image, .image-with-text-overlay img')
      );
    }

    function onScrollParallax() {
      if (!parallaxItems.length || parallaxFrame) return;
      parallaxFrame = requestAnimationFrame(function () {
        parallaxFrame = null;
        var vh = window.innerHeight;
        parallaxItems.forEach(function (img) {
          var rect = img.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > vh) return;
          var progress = (rect.top + rect.height / 2 - vh / 2) / vh; // -0.5 .. 0.5-ish
          img.style.transform = 'translateY(' + (progress * -22).toFixed(2) + 'px) scale(1.06)';
        });
      });
    }

    collectParallax();
    if (parallaxItems.length) {
      window.addEventListener('scroll', onScrollParallax, { passive: true });
      window.addEventListener('resize', collectParallax);
      onScrollParallax();
    }
  }

  /* ------------------------------------------------------------------
     5. Dark / light mode toggle (class set pre-paint by theme.liquid)
     ------------------------------------------------------------------ */
  function syncThemeToggles() {
    var dark = docEl.classList.contains('sf-dark');
    var toggles = document.querySelectorAll('[data-sf-theme-toggle]');
    for (var i = 0; i < toggles.length; i++) toggles[i].setAttribute('aria-pressed', String(dark));
  }

  document.addEventListener('click', function (event) {
    var toggle = event.target.closest && event.target.closest('[data-sf-theme-toggle]');
    if (!toggle) return;

    var dark = !docEl.classList.contains('sf-dark');
    docEl.classList.toggle('sf-dark', dark);
    try { localStorage.setItem('sf-theme', dark ? 'dark' : 'light'); } catch (e) { /* private mode */ }
    syncThemeToggles();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncThemeToggles);
  } else {
    syncThemeToggles();
  }

  /* ------------------------------------------------------------------
     6. Back-to-top button
     ------------------------------------------------------------------ */
  var topButton = document.createElement('button');
  topButton.type = 'button';
  topButton.className = 'sf-top-button';
  topButton.setAttribute('aria-label', docEl.lang === 'ar' ? 'العودة إلى الأعلى' : 'Back to top');
  topButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(topButton);

  topButton.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  });

  window.addEventListener('scroll', function () {
    topButton.classList.toggle('sf-visible', window.scrollY > window.innerHeight * 1.2);
  }, { passive: true });
})();
