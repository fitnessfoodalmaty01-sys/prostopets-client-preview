const header = document.querySelector('.header');
const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.querySelector('.mobile-menu');

const analyticsId = document.documentElement.dataset.analyticsId?.trim();
let analyticsLoaded = false;

const loadAnalytics = () => {
  const analyticsAllowed = window.PROSTOPETS_CONSENT?.analytics === true;
  const validAnalyticsId = analyticsId && /^G-[A-Z0-9]+$/i.test(analyticsId);

  if (analyticsLoaded || !analyticsAllowed || !validAnalyticsId) return;

  analyticsLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });
  window.gtag('js', new Date());
  window.gtag('config', analyticsId, {
    anonymize_ip: true,
    allow_google_signals: false
  });

  const analyticsScript = document.createElement('script');
  analyticsScript.async = true;
  analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`;
  document.head.append(analyticsScript);
};

loadAnalytics();
window.addEventListener('prostopets:consent', (event) => {
  if (event.detail?.analytics === true) loadAnalytics();
});

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href*="kaspi.kz"]');
  if (!link) return;

  const detail = {
    label: link.getAttribute('aria-label') || link.textContent.trim(),
    url: link.href
  };

  window.dispatchEvent(new CustomEvent('prostopets:kaspi-click', { detail }));
  window.gtag?.('event', 'kaspi_click', detail);
});

const setHeaderState = () => header.classList.toggle('scrolled', window.scrollY > 12);
setHeaderState();
window.addEventListener('scroll', setHeaderState, { passive: true });

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  mobileMenu.classList.toggle('open', open);
  document.body.classList.toggle('menu-open', open);
});

mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Открыть меню');
  mobileMenu.classList.remove('open');
  document.body.classList.remove('menu-open');
}));
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || menuButton?.getAttribute('aria-expanded') !== 'true') return;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Открыть меню');
  mobileMenu?.classList.remove('open');
  document.body.classList.remove('menu-open');
  menuButton.focus();
});

document.querySelectorAll('.heart').forEach((button) => {
  button.addEventListener('click', () => {
    const active = button.classList.toggle('active');
    button.textContent = active ? '♥' : '♡';
    button.setAttribute('aria-pressed', String(active));
  });
});

document.querySelectorAll('.accordion details').forEach((detail) => {
  detail.addEventListener('toggle', () => {
    if (!detail.open) return;
    document.querySelectorAll('.accordion details').forEach((other) => {
      if (other !== detail) other.open = false;
    });
  });
});

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px' });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

// Компактный автоматический слайдер полного каталога Kaspi
const catalogSlider = document.querySelector('[data-catalog-slider]');
const sourceProducts = Array.isArray(window.PROSTOPETS_PRODUCTS) ? window.PROSTOPETS_PRODUCTS : [];
const catalogProducts = [...new Map(sourceProducts.map((product) => [product.url, product])).values()];
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (catalogSlider && catalogProducts.length) {
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (symbol) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[symbol]);
  const shuffleProducts = (items) => {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    return shuffled;
  };
  const visibleCount = () => window.innerWidth <= 640 ? 1 : window.innerWidth <= 980 ? 2 : 3;
  let deck = shuffleProducts(catalogProducts);
  let cursor = 0;
  let renderedCount = visibleCount();
  let isPaused = false;

  const takeProducts = (count) => {
    const selected = [];
    while (selected.length < count) {
      if (cursor >= deck.length) {
        deck = shuffleProducts(catalogProducts);
        cursor = 0;
      }
      selected.push(deck[cursor]);
      cursor += 1;
    }
    return selected;
  };

  const productCard = (product) => {
    const rating = Number(product.rating) > 0 ? `★ ${Number(product.rating).toFixed(1).replace('.0', '')}` : 'Новинка';
    return `<article class="product-card product-card--catalog"><div class="product-card__top"><span class="badge">${escapeHtml(product.brand)}</span><span class="product-card__rating">${rating}</span></div><div class="product-card__art"><img class="product-photo product-photo--catalog" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" loading="lazy" decoding="async"></div><div class="product-card__info"><div><p>${escapeHtml(product.title)}</p><span>${escapeHtml(product.price)} · Kaspi Магазин</span></div><a href="${escapeHtml(product.url)}" target="_self" aria-label="Открыть ${escapeHtml(product.title)} в Kaspi">Купить</a></div></article>`;
  };

  const renderProducts = () => {
    catalogSlider.innerHTML = takeProducts(renderedCount).map(productCard).join('');
  };
  const rotateProducts = () => {
    if (isPaused || document.hidden) return;
    catalogSlider.classList.add('is-switching');
    window.setTimeout(() => {
      renderProducts();
      catalogSlider.classList.remove('is-switching');
    }, 280);
  };

  const setPaused = (paused) => {
    isPaused = paused;
    catalogSlider.classList.toggle('is-paused', paused);
  };

  renderProducts();
  if (!prefersReducedMotion.matches) window.setInterval(rotateProducts, 7000);
  catalogSlider.addEventListener('mouseenter', () => setPaused(true));
  catalogSlider.addEventListener('mouseleave', () => setPaused(false));
  catalogSlider.addEventListener('focusin', () => setPaused(true));
  catalogSlider.addEventListener('focusout', (event) => {
    if (!catalogSlider.contains(event.relatedTarget)) setPaused(false);
  });
  catalogSlider.addEventListener('touchstart', () => setPaused(true), { passive: true });
  catalogSlider.addEventListener('touchend', () => window.setTimeout(() => setPaused(false), 4500), { passive: true });
  catalogSlider.addEventListener('error', (event) => {
    const image = event.target.closest?.('img');
    if (!image || image.dataset.fallbackApplied) return;
    image.dataset.fallbackApplied = 'true';
    image.src = 'assets/logos/prostopets-icon.svg';
    image.classList.add('product-photo--fallback');
  }, true);
  window.addEventListener('resize', () => {
    const nextCount = visibleCount();
    if (nextCount === renderedCount) return;
    renderedCount = nextCount;
    renderProducts();
  });
}
// Автоматический слайдер полного ассортимента собственного бренда PROSTOPETS
const brandSlider = document.querySelector('[data-brand-slider]');
const ownBrandProducts = catalogProducts.filter((product) => String(product.brand).toLowerCase() === 'prostopets');
if (brandSlider && ownBrandProducts.length) {
  const escapeBrandHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (symbol) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[symbol]);
  const brandVisibleCount = () => window.innerWidth <= 640 ? 1 : window.innerWidth <= 980 ? 2 : 3;
  let brandCursor = 0;
  let brandRenderedCount = brandVisibleCount();
  let brandPaused = false;

  const brandCard = (product) => {
    const rating = Number(product.rating) > 0 ? `★ ${Number(product.rating).toFixed(1).replace('.0', '')}` : 'Новинка';
    return `<article class="product-card product-card--catalog product-card--own-brand"><div class="product-card__top"><span class="badge">PROSTOPETS</span><span class="product-card__rating">${rating}</span></div><div class="product-card__art"><img class="product-photo product-photo--catalog" src="${escapeBrandHtml(product.image)}" alt="${escapeBrandHtml(product.title)}" loading="lazy" decoding="async"></div><div class="product-card__info"><div><p>${escapeBrandHtml(product.title)}</p><span>${escapeBrandHtml(product.price)} · Kaspi Магазин</span></div><a href="${escapeBrandHtml(product.url)}" target="_self" aria-label="Открыть ${escapeBrandHtml(product.title)} в Kaspi">Купить</a></div></article>`;
  };

  const renderBrandProducts = () => {
    const selected = Array.from({ length: brandRenderedCount }, (_, index) => ownBrandProducts[(brandCursor + index) % ownBrandProducts.length]);
    brandSlider.innerHTML = selected.map(brandCard).join('');
  };
  const rotateBrandProducts = () => {
    if (brandPaused || document.hidden) return;
    brandSlider.classList.add('is-switching');
    window.setTimeout(() => {
      brandCursor = (brandCursor + brandRenderedCount) % ownBrandProducts.length;
      renderBrandProducts();
      brandSlider.classList.remove('is-switching');
    }, 280);
  };
  const setBrandPaused = (paused) => {
    brandPaused = paused;
    brandSlider.classList.toggle('is-paused', paused);
  };

  renderBrandProducts();
  if (!prefersReducedMotion.matches) window.setInterval(rotateBrandProducts, 6500);
  brandSlider.addEventListener('mouseenter', () => setBrandPaused(true));
  brandSlider.addEventListener('mouseleave', () => setBrandPaused(false));
  brandSlider.addEventListener('focusin', () => setBrandPaused(true));
  brandSlider.addEventListener('focusout', (event) => {
    if (!brandSlider.contains(event.relatedTarget)) setBrandPaused(false);
  });
  brandSlider.addEventListener('touchstart', () => setBrandPaused(true), { passive: true });
  brandSlider.addEventListener('touchend', () => window.setTimeout(() => setBrandPaused(false), 4500), { passive: true });
  brandSlider.addEventListener('error', (event) => {
    const image = event.target.closest?.('img');
    if (!image || image.dataset.fallbackApplied) return;
    image.dataset.fallbackApplied = 'true';
    image.src = 'assets/logos/prostopets-icon.svg';
    image.classList.add('product-photo--fallback');
  }, true);
  window.addEventListener('resize', () => {
    const nextCount = brandVisibleCount();
    if (nextCount === brandRenderedCount) return;
    brandRenderedCount = nextCount;
    renderBrandProducts();
  });
}
document.querySelectorAll('img[data-fallback-src]').forEach((image) => {
  image.addEventListener('error', () => {
    const fallback = image.dataset.fallbackSrc;
    if (!fallback || image.dataset.fallbackApplied) return;
    image.dataset.fallbackApplied = 'true';
    image.src = fallback;
  });
});

