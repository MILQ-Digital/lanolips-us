class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.cartLoaded = false;
    this.loadingPromise = null;

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');
    if (!cartLink) return;

    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    cartLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(cartLink);
    });
    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if (this.dataset.lazy === 'true' && !this.cartLoaded) {
      this.loadCartContents().then(() => this.openDrawer(triggeredBy));
      return;
    }
    this.openDrawer(triggeredBy);
  }

  openDrawer(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);

    const cartDrawer = this.querySelector('#CartDrawer');
    if (cartDrawer) cartDrawer.setAttribute('aria-hidden', 'false');

    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);

    setTimeout(() => {
      this.classList.add('animate', 'active');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.classList.remove('active');

    const cartDrawer = this.querySelector('#CartDrawer');
    if (cartDrawer) cartDrawer.setAttribute('aria-hidden', 'true');

    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  setLoadingState(isLoading) {
    const loadingEl = this.querySelector('.cart-drawer__loading');
    if (!loadingEl) return;

    loadingEl.hidden = !isLoading;
    loadingEl.classList.toggle('visually-hidden', !isLoading);
  }

  loadCartContents(force = false) {
    if (this.cartLoaded && !force) return Promise.resolve();
    if (this.loadingPromise && !force) return this.loadingPromise;

    this.setLoadingState(true);

    this.loadingPromise = fetch(`${routes.cart_url}?section_id=cart-drawer`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const sourceDrawer = html.querySelector('cart-drawer');
        if (!sourceDrawer) return;

        const drawerInner = this.querySelector('.drawer__inner');
        const sourceInner = sourceDrawer.querySelector('.drawer__inner');
        if (drawerInner && sourceInner) {
          drawerInner.innerHTML = sourceInner.innerHTML;
        }

        this.classList.toggle('is-empty', sourceDrawer.classList.contains('is-empty'));
        this.markCartLoaded();
        this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        this.setLoadingState(false);
        this.loadingPromise = null;
      });

    return this.loadingPromise;
  }

  markCartLoaded() {
    this.cartLoaded = true;
    this.removeAttribute('data-lazy');
    this.initCartDrawerExtras();
  }

  initCartDrawerExtras() {
    if (typeof removeCartUpsellIfFlagged === 'function') {
      removeCartUpsellIfFlagged();
    }

    this.querySelectorAll('.cart-upsell .form').forEach((form) => {
      if (form.dataset.upsellBound) return;
      form.dataset.upsellBound = 'true';
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        fetch('/cart/add.js', { method: 'POST', body: formData })
          .then((response) => response.json())
          .then(() => this.loadCartContents(true))
          .catch((error) => console.error('Error adding to cart:', error));
      });
    });

    this.querySelectorAll('.cart-upsell .quick-add__submit > span').forEach((span) => {
      if (span.textContent.trim() === 'Add To Bag') {
        span.textContent = 'Add';
      }
    });

    const container = this.querySelector('#Slider-Upsell');
    if (!container || container.dataset.sliderBound) return;
    container.dataset.sliderBound = 'true';

    let isMouseDown = false;
    let startX;
    let scrollLeft;
    const smoothScrollAmount = 2;

    container.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      container.classList.add('cursor-grabbing');
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    });

    container.addEventListener('mouseleave', () => {
      isMouseDown = false;
      container.classList.remove('cursor-grabbing');
      container.classList.add('cursor-grab');
    });

    container.addEventListener('mouseup', () => {
      isMouseDown = false;
      container.classList.remove('cursor-grabbing');
      container.classList.add('cursor-grab');
    });

    container.addEventListener('mousemove', (e) => {
      if (!isMouseDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * smoothScrollAmount;
      container.scrollLeft = scrollLeft - walk;
    });

    container.addEventListener('touchstart', (e) => {
      isMouseDown = true;
      container.classList.add('cursor-grabbing');
      startX = e.touches[0].pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    });

    container.addEventListener('touchend', () => {
      isMouseDown = false;
      container.classList.remove('cursor-grabbing');
      container.classList.add('cursor-grab');
    });

    container.addEventListener('touchmove', (e) => {
      if (!isMouseDown) return;
      e.preventDefault();
      const x = e.touches[0].pageX - container.offsetLeft;
      const walk = (x - startX) * smoothScrollAmount;
      container.scrollLeft = scrollLeft - walk;
    });
  }

  renderContents(parsedState) {
    this.querySelector('.drawer__inner')?.classList.contains('is-empty') &&
      this.querySelector('.drawer__inner').classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      if (!sectionElement) return;
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });

    this.markCartLoaded();

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      this.openDrawer();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);
