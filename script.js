/* ============================================================
   SAHIL APAGE — PORTFOLIO SCRIPTS
   ============================================================ */

(function () {
  'use strict';

  // ---- Navbar scroll state ----
  const navbar = document.getElementById('navbar');
  let lastScroll = 0;

  function handleNavbarScroll() {
    const scrollY = window.scrollY;
    if (scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    lastScroll = scrollY;
  }

  // ---- Mobile menu toggle ----
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  navToggle.addEventListener('click', function () {
    navToggle.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });

  // Close mobile menu on link click
  mobileMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navToggle.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // ---- Active nav link ----
  const sections = document.querySelectorAll('.section, .hero');
  const navLinks = document.querySelectorAll('[data-nav]');

  function updateActiveNav() {
    let current = '';
    sections.forEach(function (section) {
      const top = section.offsetTop - 120;
      if (window.scrollY >= top) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(function (link) {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  }

  // ---- Scroll reveal ----
  const revealElements = document.querySelectorAll('[data-reveal]');

  function revealOnScroll() {
    const windowHeight = window.innerHeight;
    revealElements.forEach(function (el) {
      const rect = el.getBoundingClientRect();
      const revealPoint = windowHeight * 0.88;
      if (rect.top < revealPoint) {
        el.classList.add('revealed');
      }
    });
  }

  // ---- Parallax on visual break images ----
  const parallaxImages = document.querySelectorAll('.parallax-img');

  function updateParallax() {
    parallaxImages.forEach(function (img) {
      const rect = img.parentElement.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      if (rect.top < windowHeight && rect.bottom > 0) {
        const progress = (windowHeight - rect.top) / (windowHeight + rect.height);
        const offset = (progress - 0.5) * 60; // max +-30px
        img.style.transform = 'translateY(' + offset + 'px) scale(1.08)';
      }
    });
  }

  // ---- Unified scroll handler ----
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        handleNavbarScroll();
        updateActiveNav();
        revealOnScroll();
        updateParallax();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // ---- Hero reveal on load ----
  window.addEventListener('DOMContentLoaded', function () {
    // Initial reveal check
    revealOnScroll();

    // Hero lines reveal with delay
    setTimeout(function () {
      document.querySelectorAll('.hero-line').forEach(function (el) {
        el.classList.add('revealed');
      });
    }, 200);
  });

  // Also run on load in case DOMContentLoaded already fired
  window.addEventListener('load', function () {
    revealOnScroll();
    updateParallax();
  });
})();
