/* ═══════════════════════════════════════════════════════════
   EARTHINFO SYSTEM — script.js  v2.0
   Lenis · GSAP · Three.js · Custom Cursor · All interactions
═══════════════════════════════════════════════════════════ */
'use strict';

/* ─── State ─── */
let lenis     = null;
let mouse     = { x: 0, y: 0, vx: 0, vy: 0 };
let cursorPos = { x: -200, y: -200 };
let isReady   = false;

/* ════════════════════════════════════════════════
   1. LOADER — bulletproof, never hangs
════════════════════════════════════════════════ */
(function initLoader() {
  const loader = document.getElementById('loader');
  const fill   = document.getElementById('loaderFill');
  const pct    = document.getElementById('loaderPct');
  const status = document.getElementById('loaderText');

  // If loader element is missing (e.g. cached old HTML), just boot immediately
  if (!loader) { document.body.style.overflow = ''; bootApp(); return; }

  const messages = ['Initializing systems…','Loading assets…','Preparing interface…','Almost there…','Welcome.'];
  let progress = 0, msgStep = 0, dismissed = false;

  document.body.style.overflow = 'hidden';

  // Cosmetic progress bar animation
  const tick = setInterval(() => {
    const remaining = 100 - progress;
    progress += remaining * 0.08 + Math.random() * 3;
    if (progress > 99) progress = 99;
    if (fill) fill.style.width = progress + '%';
    if (pct)  pct.textContent  = Math.floor(progress) + '%';
    const newMsg = Math.floor((progress / 100) * (messages.length - 1));
    if (newMsg !== msgStep && status) {
      msgStep = newMsg;
      status.style.opacity = '0';
      setTimeout(() => { if (status) { status.textContent = messages[msgStep]; status.style.opacity = '1'; } }, 180);
    }
  }, 45);

  // Core dismiss function — idempotent (safe to call multiple times)
  function dismissLoader() {
    if (dismissed) return;
    dismissed = true;
    clearInterval(tick);
    if (fill)   fill.style.width  = '100%';
    if (pct)    pct.textContent   = '100%';
    if (status) status.textContent = 'Welcome.';
    // Inline transition so we don't depend on .out class being in CSS
    loader.style.transition  = 'opacity 0.55s ease, visibility 0.55s';
    loader.style.opacity     = '0';
    loader.style.visibility  = 'hidden';
    document.body.style.overflow = '';
    setTimeout(() => { loader.style.display = 'none'; }, 700);
    if (!isReady) { isReady = true; bootApp(); }
  }

  // THREE safety timers — first one to fire wins
  // 1) Hard ceiling: dismiss after 2.8 s regardless of anything
  setTimeout(dismissLoader, 2800);

  // 2) If page is already fully loaded, dismiss after 1.4 s
  if (document.readyState === 'complete') {
    setTimeout(dismissLoader, 1400);
  } else {
    window.addEventListener('load', () => setTimeout(dismissLoader, 1400), { once: true });
  }

  // 3) Emergency fallback: if body scroll is still locked after 5 s, force-boot
  setTimeout(() => {
    if (!dismissed) {
      console.warn('[ES] Loader emergency fallback triggered');
      dismissLoader();
    }
  }, 5000);
})();


/* ════════════════════════════════════════════════
   2. BOOT — graceful degradation if CDN libs missing
════════════════════════════════════════════════ */
function bootApp() {
  initLenis();
  initThreeCanvas();
  initCursor();
  initGSAP();
  initNav();
  initMobileMenu();
  initScrollReveal();
  initStatCounters();
  initForm();
  initBadges();
  initMagneticButtons();
  initProcessLine();
  document.getElementById('year').textContent = new Date().getFullYear();
}


/* ════════════════════════════════════════════════
   3. LENIS SMOOTH SCROLL
════════════════════════════════════════════════ */
function initLenis() {
  if (typeof Lenis === 'undefined') {
    console.warn('[ES] Lenis not loaded — smooth scroll disabled');
    // Native smooth scroll as fallback
    document.documentElement.style.scrollBehavior = 'smooth';
    return;
  }
  lenis = new Lenis({
    duration: 1.3,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.85,
    touchMultiplier: 1.6,
    infinite: false,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // GSAP integration
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // Anchor clicks
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const hash = link.getAttribute('href');
      if (hash === '#' || hash === '') return;
      const target = document.querySelector(hash);
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target, { offset: -80, duration: 1.6 });
        closeMobile();
      }
    });
  });
}


/* ════════════════════════════════════════════════
   4. THREE.JS HERO CANVAS
════════════════════════════════════════════════ */
function initThreeCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || typeof THREE === 'undefined') {
    console.warn('[ES] Three.js not loaded — 3D background disabled');
    return;
  }

  const W = () => canvas.clientWidth;
  const H = () => canvas.clientHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.setSize(W(), H());
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, W() / H(), 0.1, 1000);
  camera.position.set(0, 0, 6);

  /* ── Particles ── */
  const N = window.innerWidth < 768 ? 600 : 1400;
  const positions  = new Float32Array(N * 3);
  const colors     = new Float32Array(N * 3);
  const sizes      = new Float32Array(N);
  const velocities = new Float32Array(N * 3);

  const C1 = new THREE.Color(0xC9A84C); // gold
  const C2 = new THREE.Color(0xffffff); // white
  const C3 = new THREE.Color(0x6490FF); // blue accent

  for (let i = 0; i < N; i++) {
    const i3 = i * 3;
    // Distribute in a wider volume
    positions[i3]   = (Math.random() - 0.5) * 22;
    positions[i3+1] = (Math.random() - 0.5) * 14;
    positions[i3+2] = (Math.random() - 0.5) * 10;

    // Color mix: 70% gold, 20% white, 10% blue
    const r = Math.random();
    const c = r < 0.70 ? C1 : r < 0.90 ? C2 : C3;
    const bright = 0.4 + Math.random() * 0.6;
    colors[i3]   = c.r * bright;
    colors[i3+1] = c.g * bright;
    colors[i3+2] = c.b * bright;

    sizes[i] = Math.random() * 2.5 + 0.5;

    velocities[i3]   = (Math.random() - 0.5) * 0.0018;
    velocities[i3+1] = (Math.random() - 0.5) * 0.0009 - 0.0002;
    velocities[i3+2] = (Math.random() - 0.5) * 0.0008;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    size: 0.045, sizeAttenuation: true,
    vertexColors: true, transparent: true,
    opacity: 0.75, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(geo, mat);
  scene.add(particles);

  /* ── Wireframe Icosahedron ── */
  const icoGeo = new THREE.IcosahedronGeometry(2.4, 1);
  const icoMat = new THREE.MeshBasicMaterial({
    color: 0xC9A84C, wireframe: true,
    transparent: true, opacity: 0.05,
  });
  const ico = new THREE.Mesh(icoGeo, icoMat);
  ico.position.set(4, -0.5, -3);
  scene.add(ico);

  /* ── Ring ── */
  const ringGeo = new THREE.TorusGeometry(1.6, 0.005, 2, 90);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xE8C96D, transparent: true, opacity: 0.18 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(-4, 1.2, -2);
  ring.rotation.x = 0.8;
  scene.add(ring);

  /* ── Small torus ── */
  const ring2Geo = new THREE.TorusGeometry(0.9, 0.004, 2, 60);
  const ring2Mat = new THREE.MeshBasicMaterial({ color: 0xC9A84C, transparent: true, opacity: 0.12 });
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  ring2.position.set(3.5, 2, -1.5);
  ring2.rotation.y = 0.5;
  scene.add(ring2);

  /* ── Resize ── */
  const onResize = () => {
    renderer.setSize(W(), H());
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', onResize);

  /* ── Mouse ── */
  const localMouse = { x: 0, y: 0 };
  window.addEventListener('mousemove', e => {
    localMouse.x = (e.clientX / window.innerWidth  - 0.5) * 0.5;
    localMouse.y = (e.clientY / window.innerHeight - 0.5) * 0.5;
  });

  /* ── Animate ── */
  let t = 0;
  const camTarget = { x: 0, y: 0 };

  function animate() {
    requestAnimationFrame(animate);
    t += 0.0006;

    // Drift particles
    const pos = geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      pos[i3]   += velocities[i3];
      pos[i3+1] += velocities[i3+1];
      pos[i3+2] += velocities[i3+2];
      if (pos[i3+1] < -7)  pos[i3+1] =  7;
      if (pos[i3]   < -11) pos[i3]   =  11;
      if (pos[i3]   >  11) pos[i3]   = -11;
    }
    geo.attributes.position.needsUpdate = true;

    particles.rotation.y = t * 0.04 + localMouse.x * 0.35;
    particles.rotation.x = localMouse.y * 0.18;

    ico.rotation.y += 0.0025;
    ico.rotation.x += 0.0012;

    ring.rotation.z  += 0.005;
    ring.rotation.y   = t * 0.4;

    ring2.rotation.x += 0.004;
    ring2.rotation.z += 0.003;

    // Smooth camera follow mouse
    camTarget.x += (localMouse.x * 0.6 - camTarget.x) * 0.04;
    camTarget.y += (-localMouse.y * 0.4 - camTarget.y) * 0.04;
    camera.position.x = camTarget.x;
    camera.position.y = camTarget.y;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();
}


/* ════════════════════════════════════════════════
   5. CUSTOM CURSOR
════════════════════════════════════════════════ */
function initCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor || window.innerWidth < 768) return;

  let cx = -200, cy = -200;  // actual cursor pos
  let fx = -200, fy = -200;  // follower pos

  document.addEventListener('mousemove', e => {
    cx = e.clientX; cy = e.clientY;
    cursor.style.left = cx + 'px';
    cursor.style.top  = cy + 'px';
  });

  document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
  document.addEventListener('mouseup',   () => cursor.classList.remove('clicking'));

  // Hover detection
  const hoverTargets = 'a, button, .service-card, .project-card, .proj-card, .about-card, .badge, .testi-card, .tech-domain, .founder-social-btn, .founder-img-frame, .pf-btn, input, textarea, select';
  document.querySelectorAll(hoverTargets).forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
  });
}


/* ════════════════════════════════════════════════
   6. GSAP ANIMATIONS
════════════════════════════════════════════════ */
function initGSAP() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('[ES] GSAP not loaded — scroll animations disabled');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // Parallax on hero content
  const heroContent = document.getElementById('heroContent');
  if (heroContent) {
    gsap.to(heroContent, {
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
      },
      y: 120,
      opacity: 0.2,
    });
  }

  // Float cards parallax
  document.querySelectorAll('.float-card').forEach((card, i) => {
    const dir = i % 2 === 0 ? -1 : 1;
    gsap.to(card, {
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 1.5 },
      y: dir * 80,
      opacity: 0,
    });
  });

  // Section title split word animation via GSAP
  document.querySelectorAll('.section-title:not(.centered)').forEach(title => {
    gsap.from(title, {
      scrollTrigger: { trigger: title, start: 'top 88%', toggleActions: 'play none none none' },
      y: 30, opacity: 0, duration: 1, ease: 'power3.out',
    });
  });

  // Process step icons pulse on entry
  document.querySelectorAll('.process-step').forEach((step, i) => {
    gsap.from(step.querySelector('.ps-icon'), {
      scrollTrigger: { trigger: step, start: 'top 80%' },
      scale: 0.5, opacity: 0, duration: 0.7, delay: i * 0.1,
      ease: 'back.out(1.7)',
    });
  });

  // ── Service cards: staggered entrance with GSAP ──
  // Cards use class .gsap-service-card so GSAP owns the animation
  // (they no longer need the CSS .reveal class)
  const serviceCards = gsap.utils.toArray('.gsap-service-card');
  if (serviceCards.length) {
    gsap.set(serviceCards, { opacity: 0, y: 60, scale: 0.95 });
    ScrollTrigger.batch(serviceCards, {
      start: 'top 88%',
      onEnter: batch => {
        gsap.to(batch, {
          opacity: 1, y: 0, scale: 1,
          duration: 0.85,
          stagger: 0.09,
          ease: 'power3.out',
        });
      },
      once: true,
    });
  }

  // ── Founder section GSAP ──
  const founderSection = document.getElementById('founder');
  if (founderSection) {
    // Image wrapper: scale + fade in from left
    const imgWrapper = founderSection.querySelector('.founder-img-wrapper');
    if (imgWrapper) {
      gsap.from(imgWrapper, {
        scrollTrigger: { trigger: founderSection, start: 'top 75%', toggleActions: 'play none none none' },
        x: -80, opacity: 0, scale: 0.88,
        duration: 1.1, ease: 'power3.out',
      });
    }

    // Rings: spin into existence
    const rings = founderSection.querySelectorAll('.founder-img-ring');
    gsap.from(rings, {
      scrollTrigger: { trigger: founderSection, start: 'top 75%' },
      scale: 0.6, opacity: 0, duration: 1.4, stagger: 0.15,
      ease: 'back.out(1.4)',
    });

    // Bio column: staggered children
    const bioItems = founderSection.querySelectorAll(
      '.founder-eyebrow, .founder-name, .founder-title-pill, .founder-desc, .founder-highlights, .founder-social'
    );
    gsap.from(bioItems, {
      scrollTrigger: { trigger: founderSection, start: 'top 75%' },
      x: 50, opacity: 0, duration: 0.8,
      stagger: 0.1, ease: 'power3.out',
    });

    // Founder badge pop
    const badge = founderSection.querySelector('.founder-badge');
    if (badge) {
      gsap.from(badge, {
        scrollTrigger: { trigger: founderSection, start: 'top 65%' },
        scale: 0, opacity: 0, duration: 0.6, delay: 0.8,
        ease: 'back.out(2)',
      });
    }
  }

  // Testimonial cards
  gsap.utils.toArray('.testi-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 88%' },
      y: 50, opacity: 0, duration: 0.9, delay: i * 0.12,
      ease: 'power3.out',
    });
  });

  // ── Project cards: staggered GSAP entrance ──
  const projCards = gsap.utils.toArray('.gsap-proj-card');
  if (projCards.length) {
    gsap.set(projCards, { opacity: 0, y: 72, scale: 0.94 });
    ScrollTrigger.batch(projCards, {
      start: 'top 88%',
      onEnter: batch => {
        gsap.to(batch, {
          opacity: 1, y: 0, scale: 1,
          duration: 0.9,
          stagger: 0.1,
          ease: 'power3.out',
        });
      },
      once: true,
    });
  }

  // Badges stagger
  document.querySelectorAll('.tech-domain').forEach(domain => {
    gsap.from(domain.querySelectorAll('.badge'), {
      scrollTrigger: { trigger: domain, start: 'top 80%' },
      scale: 0.8, opacity: 0, duration: 0.5,
      stagger: 0.04, ease: 'power2.out',
    });
  });

  // Footer CTA entrance
  const footerCta = document.querySelector('.footer-cta');
  if (footerCta) {
    gsap.from(footerCta, {
      scrollTrigger: { trigger: footerCta, start: 'top 85%' },
      y: 40, opacity: 0, duration: 1, ease: 'power3.out',
    });
  }
}


/* ════════════════════════════════════════════════
   7. SCROLL REVEAL (IntersectionObserver)
════════════════════════════════════════════════ */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -56px 0px' });
  els.forEach(el => obs.observe(el));
}


/* ════════════════════════════════════════════════
   8. STAT COUNTERS
════════════════════════════════════════════════ */
function initStatCounters() {
  const nums = document.querySelectorAll('.stat-num');
  const obs  = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el  = entry.target;
      const end = parseInt(el.dataset.val, 10);
      const dur = 1800;
      const fps = 1000 / 60;
      const inc = end / (dur / fps);
      let   cur = 0;
      const iv  = setInterval(() => {
        cur += inc;
        if (cur >= end) { cur = end; clearInterval(iv); }
        el.textContent = Math.floor(cur);
      }, fps);
      obs.unobserve(el);
    });
  }, { threshold: 0.6 });
  nums.forEach(el => obs.observe(el));
}


/* ════════════════════════════════════════════════
   9. NAV — scroll effects + active section
════════════════════════════════════════════════ */
function initNav() {
  const nav      = document.getElementById('nav');
  const progress = document.getElementById('navProgress');
  const backTop  = document.getElementById('backTop');
  const links    = document.querySelectorAll('.nav-links a');
  const sections = document.querySelectorAll('section[id]');

  const onScroll = () => {
    const scrollY    = window.scrollY;
    const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPct  = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;

    nav.classList.toggle('scrolled', scrollY > 40);
    if (progress) progress.style.width = scrollPct + '%';
    if (backTop)  backTop.classList.toggle('visible', scrollY > 700);

    // Active nav link
    let current = '';
    sections.forEach(sec => {
      if (scrollY >= sec.offsetTop - 120) current = sec.id;
    });
    links.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Back to top
  if (backTop) {
    backTop.addEventListener('click', () => {
      if (lenis) lenis.scrollTo(0, { duration: 1.8 });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}


/* ════════════════════════════════════════════════
   10. MOBILE MENU
════════════════════════════════════════════════ */
function initMobileMenu() {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('navMobile');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    // Prevent body scroll when menu open
    document.body.style.overflow = open ? 'hidden' : '';
  });
}
function closeMobile() {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('navMobile');
  if (!btn || !menu) return;
  menu.classList.remove('open');
  btn.classList.remove('open');
  btn.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}


/* ════════════════════════════════════════════════
   11. CONTACT FORM
════════════════════════════════════════════════ */
function initForm() {
  const form    = document.getElementById('contactForm');
  const btn     = document.getElementById('submitBtn');
  const success = document.getElementById('formSuccess');
  if (!form || !btn || !success) return;

  // Floating label effect
  form.querySelectorAll('.input-wrap input, .input-wrap textarea, .input-wrap select').forEach(field => {
    field.addEventListener('focus', () => {
      field.parentElement.classList.add('focused');
    });
    field.addEventListener('blur', () => {
      field.parentElement.classList.remove('focused');
      if (field.value) field.parentElement.classList.add('filled');
      else field.parentElement.classList.remove('filled');
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();

    // Validation
    let valid = true;
    form.querySelectorAll('[required]').forEach(field => {
      const empty = !field.value.trim();
      field.style.borderColor = empty ? '#e05252' : '';
      if (empty) {
        valid = false;
        field.addEventListener('input', () => { field.style.borderColor = ''; }, { once: true });
      }
    });
    if (!valid) {
      // Shake animation
      form.style.animation = 'shake 0.4s ease';
      form.addEventListener('animationend', () => form.style.animation = '', { once: true });
      return;
    }

    // Loading state
    const textEl = btn.querySelector('.btn-text-content');
    const loadEl = btn.querySelector('.btn-loading');
    textEl.style.display = 'none';
    loadEl.style.display = 'inline-flex';
    btn.disabled = true;
    btn.style.opacity = '0.8';

    // Simulate send (replace with real API call)
    setTimeout(() => {
      textEl.style.display = '';
      loadEl.style.display = 'none';
      btn.disabled = false;
      btn.style.opacity = '';
      form.reset();
      form.querySelectorAll('.input-wrap').forEach(w => w.classList.remove('filled'));
      success.style.display = 'flex';
      success.style.animation = 'fadeSlideUp 0.5s ease forwards';
      setTimeout(() => {
        success.style.animation = 'fadeOut 0.5s ease forwards';
        success.addEventListener('animationend', () => success.style.display = 'none', { once: true });
      }, 5000);
    }, 2000);
  });
}

// Add shake/fadeOut keyframes dynamically
const styleTag = document.createElement('style');
styleTag.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-5px); }
    80% { transform: translateX(5px); }
  }
  @keyframes fadeOut {
    to { opacity: 0; transform: translateY(-8px); }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .loader-status { transition: opacity 0.3s; }
`;
document.head.appendChild(styleTag);


/* ════════════════════════════════════════════════
   12. BADGE HOVER STAGGER (micro-interaction)
════════════════════════════════════════════════ */
function initBadges() {
  document.querySelectorAll('.tech-domain').forEach(domain => {
    const badges = domain.querySelectorAll('.badge');

    domain.addEventListener('mouseenter', () => {
      badges.forEach((b, i) => {
        b.style.transitionDelay = (i * 25) + 'ms';
      });
    });
    domain.addEventListener('mouseleave', () => {
      badges.forEach(b => {
        b.style.transitionDelay = '';
      });
    });
  });
}


/* ════════════════════════════════════════════════
   13. MAGNETIC BUTTONS
════════════════════════════════════════════════ */
function initMagneticButtons() {
  if (window.innerWidth < 768) return;

  document.querySelectorAll('.btn-primary, .btn-ghost, .btn-nav, .social-btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x    = e.clientX - rect.left - rect.width  / 2;
      const y    = e.clientY - rect.top  - rect.height / 2;
      const pull = btn.classList.contains('social-btn') ? 0.3 : 0.18;
      btn.style.transform = `translate(${x * pull}px, ${y * pull * 1.5}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}


/* ════════════════════════════════════════════════
   14. PROCESS LINE ANIMATION
════════════════════════════════════════════════ */
function initProcessLine() {
  const line = document.getElementById('processLineFill');
  if (!line) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        line.style.width = '100%';
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  const connector = document.querySelector('.process-connector');
  if (connector) obs.observe(connector.parentElement);
}


/* ════════════════════════════════════════════════
   15. HERO PARALLAX ON SCROLL (CSS supplement)
════════════════════════════════════════════════ */
(function initHeroParallax() {
  const hero  = document.getElementById('hero');
  const orbs  = document.querySelectorAll('.orb');
  let   rafId = null;

  const update = () => {
    const y = window.scrollY;
    if (y < window.innerHeight * 1.5) {
      orbs.forEach((orb, i) => {
        const speed = (i + 1) * 0.15;
        orb.style.transform = `translateY(${y * speed}px)`;
      });
    }
    rafId = null;
  };

  window.addEventListener('scroll', () => {
    if (!rafId) rafId = requestAnimationFrame(update);
  }, { passive: true });
})();


/* ════════════════════════════════════════════════
   16. SERVICE CARD TILT (3D on hover)
════════════════════════════════════════════════ */
(function initCardTilt() {
  if (window.innerWidth < 768) return;

  document.querySelectorAll('.service-card, .about-card, .testi-card, .founder-img-wrapper').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect  = card.getBoundingClientRect();
      const cx    = rect.left + rect.width  / 2;
      const cy    = rect.top  + rect.height / 2;
      const dx    = (e.clientX - cx) / (rect.width  / 2);
      const dy    = (e.clientY - cy) / (rect.height / 2);
      const tiltX = dy * -5;
      const tiltY = dx *  5;
      card.style.transform = `translateY(-10px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      card.style.transformStyle = 'preserve-3d';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();

/* ════════════════════════════════════════════════
   PROJECT FILTER TABS
════════════════════════════════════════════════ */
(function initProjectFilters() {
  const filterBtns = document.querySelectorAll('.pf-btn');
  const cards      = document.querySelectorAll('.gsap-proj-card');
  if (!filterBtns.length || !cards.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;

      cards.forEach((card, i) => {
        const cat   = card.dataset.cat || 'all';
        const match = filter === 'all' || cat === filter;

        if (match) {
          // Animate back in
          card.style.display = '';
          if (typeof gsap !== 'undefined') {
            gsap.fromTo(card,
              { opacity: 0, y: 30, scale: 0.94 },
              { opacity: 1, y: 0, scale: 1, duration: 0.55, delay: i * 0.06, ease: 'power3.out' }
            );
          } else {
            card.style.opacity = '1';
            card.style.transform = '';
          }
        } else {
          // Animate out then hide
          if (typeof gsap !== 'undefined') {
            gsap.to(card, {
              opacity: 0, y: -20, scale: 0.94,
              duration: 0.3, ease: 'power2.in',
              onComplete: () => { card.style.display = 'none'; }
            });
          } else {
            card.style.display = 'none';
          }
        }
      });
    });
  });
})();