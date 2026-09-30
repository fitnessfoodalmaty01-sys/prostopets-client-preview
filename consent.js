(() => {
  const STORAGE_KEY = 'prostopets-consent-v2';
  const CONSENT_VERSION = 2;

  const readConsent = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.version !== CONSENT_VERSION) return null;
      return {
        essential: true,
        analytics: saved.analytics === true,
        advertising: saved.advertising === true,
        updatedAt: saved.updatedAt || null,
        version: CONSENT_VERSION
      };
    } catch {
      return null;
    }
  };

  const activateDeferredScripts = (category) => {
    document.querySelectorAll(`script[type="text/plain"][data-consent-category="${category}"]`).forEach((source) => {
      if (source.dataset.consentActivated === 'true') return;
      const script = document.createElement('script');
      Array.from(source.attributes).forEach((attribute) => {
        if (['type', 'data-consent-category', 'data-consent-activated'].includes(attribute.name)) return;
        script.setAttribute(attribute.name, attribute.value);
      });
      script.textContent = source.textContent;
      source.dataset.consentActivated = 'true';
      source.after(script);
    });
  };

  const applyConsent = (consent) => {
    const normalized = consent || {
      essential: true,
      analytics: false,
      advertising: false,
      updatedAt: null,
      version: CONSENT_VERSION
    };

    window.PROSTOPETS_CONSENT = Object.freeze(normalized);
    document.documentElement.dataset.consentAnalytics = normalized.analytics ? 'granted' : 'denied';
    document.documentElement.dataset.consentAdvertising = normalized.advertising ? 'granted' : 'denied';

    if (normalized.analytics) activateDeferredScripts('analytics');
    if (normalized.advertising) activateDeferredScripts('advertising');

    window.gtag?.('consent', 'update', {
      analytics_storage: normalized.analytics ? 'granted' : 'denied',
      ad_storage: normalized.advertising ? 'granted' : 'denied',
      ad_user_data: normalized.advertising ? 'granted' : 'denied',
      ad_personalization: normalized.advertising ? 'granted' : 'denied'
    });

    window.dispatchEvent(new CustomEvent('prostopets:consent', { detail: normalized }));
  };

  const saveConsent = (accepted) => {
    const consent = {
      essential: true,
      analytics: Boolean(accepted),
      advertising: Boolean(accepted),
      updatedAt: new Date().toISOString(),
      version: CONSENT_VERSION
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    applyConsent(consent);
  };

  const buildPanel = () => {
    const panel = document.createElement('aside');
    panel.className = 'consent-panel';
    panel.setAttribute('aria-label', 'Согласие на использование cookie');
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = `
      <div class="consent-panel__inner consent-panel__inner--simple">
        <div class="consent-panel__copy">
          <span class="consent-panel__eyebrow">Cookie и конфиденциальность</span>
          <h2>Разрешите нам использовать cookie</h2>
          <p>Они помогают сайту работать корректно и делают наши предложения полезнее.</p>
          <label class="consent-agreement">
            <input type="checkbox" data-consent-agreement>
            <span>Я согласен с <a href="privacy.html">Политикой конфиденциальности</a>, а также с <a href="personal-data.html">обработкой и передачей персональных данных</a>.</span>
          </label>
        </div>
        <div class="consent-panel__actions consent-panel__actions--simple">
          <button type="button" class="consent-panel__button consent-panel__button--primary" data-consent-accept disabled>Принять cookie</button>
        </div>
      </div>`;
    document.body.append(panel);
    return panel;
  };

  const init = () => {
    const existing = readConsent();
    applyConsent(existing);

    const panel = buildPanel();
    const agreement = panel.querySelector('[data-consent-agreement]');
    const acceptButton = panel.querySelector('[data-consent-accept]');

    const showPanel = () => {
      const current = readConsent();
      agreement.checked = current?.analytics === true && current?.advertising === true;
      acceptButton.disabled = !agreement.checked;
      panel.classList.add('is-visible');
      window.setTimeout(() => agreement.focus(), 20);
    };

    const hidePanel = () => panel.classList.remove('is-visible');

    agreement.addEventListener('change', () => {
      acceptButton.disabled = !agreement.checked;
    });

    acceptButton.addEventListener('click', () => {
      if (!agreement.checked) {
        agreement.focus();
        return;
      }
      saveConsent(true);
      hidePanel();
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-open-consent]')) return;
      event.preventDefault();
      showPanel();
    });

    if (!existing) showPanel();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();