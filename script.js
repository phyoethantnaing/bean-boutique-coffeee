(function () {
  'use strict';

  /* Product catalogue and persistent cart data ------------------------ */

  const CART_KEY = 'beanBoutique.cart.v2';
  const WELCOME_KEY = 'beanBoutique.welcomeSeen';

  const products = {
    'house-blend': {
      id: 'house-blend',
      name: 'House Blend',
      type: 'Coffee',
      price: 14.5,
      image: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=600&q=82'
    },
    ethiopia: {
      id: 'ethiopia',
      name: 'Ethiopia Sunrise',
      type: 'Coffee',
      price: 17,
      image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=600&q=82'
    },
    colombia: {
      id: 'colombia',
      name: 'Colombia Velvet',
      type: 'Coffee',
      price: 16.5,
      image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=82'
    },
    decaf: {
      id: 'decaf',
      name: 'Night Owl Decaf',
      type: 'Coffee',
      price: 15,
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=82'
    },
    'french-press': {
      id: 'french-press',
      name: 'Classic French Press',
      type: 'Equipment',
      price: 34,
      image: 'https://images.unsplash.com/photo-1511081692775-05d0f180a065?auto=format&fit=crop&w=600&q=82'
    },
    'pour-over': {
      id: 'pour-over',
      name: 'Ceramic Pour Over Set',
      type: 'Equipment',
      price: 42,
      image: 'https://images.unsplash.com/photo-1545665225-b23b99e4d45e?auto=format&fit=crop&w=600&q=82'
    },
    grinder: {
      id: 'grinder',
      name: 'Hand Burr Grinder',
      type: 'Equipment',
      price: 48,
      image: 'https://images.unsplash.com/photo-1520176501380-9a174bf7c783?auto=format&fit=crop&w=600&q=82'
    },
    espresso: {
      id: 'espresso',
      name: 'Compact Espresso Machine',
      type: 'Equipment',
      price: 189,
      image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=82'
    }
  };

  const memoryStore = new Map();

  /* Resilient storage wrapper: the UI still works when storage is blocked. */
  const storage = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        return memoryStore.get(key) || null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        memoryStore.set(key, value);
      }
    }
  };

  const formatMoney = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  function createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.className) element.className = options.className;
    if (options.text !== undefined) element.textContent = options.text;
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([name, value]) => {
        element.setAttribute(name, value);
      });
    }

    return element;
  }

  /* Shopping cart ------------------------------------------------------ */

  function getCart() {
    try {
      const parsed = JSON.parse(storage.get(CART_KEY) || '[]');

      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((item) => item && products[item.id] && Number.isFinite(Number(item.quantity)))
        .map((item) => ({
          id: item.id,
          quantity: Math.min(99, Math.max(1, Math.floor(Number(item.quantity))))
        }));
    } catch (error) {
      return [];
    }
  }

  function saveCart(cart) {
    storage.set(CART_KEY, JSON.stringify(cart));
    updateCartCount(cart);
  }

  function updateCartCount(cart = getCart()) {
    const count = cart.reduce((total, item) => total + item.quantity, 0);

    document.querySelectorAll('[data-cart-count]').forEach((element) => {
      element.textContent = String(count);
      element.setAttribute('aria-label', `${count} item${count === 1 ? '' : 's'} in cart`);
    });
  }

  function showToast(message) {
    let region = document.querySelector('.toast-region');

    if (!region) {
      region = createElement('div', {
        className: 'toast-region',
        attributes: { 'aria-live': 'polite', 'aria-atomic': 'true' }
      });
      document.body.append(region);
    }

    const toast = createElement('div', {
      className: 'toast',
      text: message,
      attributes: { role: 'status' }
    });

    region.append(toast);
    window.setTimeout(() => toast.remove(), 3600);
  }

  function addToCart(productId) {
    const product = products[productId];
    if (!product) return;

    const cart = getCart();
    const existing = cart.find((item) => item.id === productId);

    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + 1);
    } else {
      cart.push({ id: productId, quantity: 1 });
    }

    saveCart(cart);
    renderCart();
    showToast(`${product.name} was added to your cart.`);
  }

  function changeQuantity(productId, change) {
    const cart = getCart();
    const item = cart.find((entry) => entry.id === productId);

    if (!item) return;

    item.quantity = Math.min(99, item.quantity + change);
    saveCart(cart.filter((entry) => entry.quantity > 0));
    renderCart();
  }

  function removeFromCart(productId) {
    const product = products[productId];
    saveCart(getCart().filter((item) => item.id !== productId));
    renderCart();

    if (product) showToast(`${product.name} was removed from your cart.`);
  }

  function setupCartButtons() {
    document.querySelectorAll('[data-add-to-cart]').forEach((button) => {
      button.addEventListener('click', () => addToCart(button.dataset.addToCart));
    });
  }

  function buildCartItem(item) {
    const product = products[item.id];
    const row = createElement('article', { className: 'cart-item' });
    const image = createElement('img', {
      attributes: {
        src: product.image,
        alt: '',
        width: '96',
        height: '96',
        loading: 'lazy'
      }
    });
    const details = createElement('div');
    const type = createElement('span', { className: 'badge', text: product.type });
    const title = createElement('h3', { text: product.name });
    const lineTotal = createElement('p', {
      className: 'price',
      text: formatMoney.format(product.price * item.quantity)
    });
    const controls = createElement('div', { className: 'cart-item-controls' });
    const quantity = createElement('div', {
      className: 'quantity-control',
      attributes: { 'aria-label': `Quantity for ${product.name}` }
    });
    const decrease = createElement('button', {
      text: '−',
      attributes: { type: 'button', 'aria-label': `Decrease ${product.name} quantity` }
    });
    const amount = createElement('output', {
      text: String(item.quantity),
      attributes: { 'aria-label': `Quantity ${item.quantity}` }
    });
    const increase = createElement('button', {
      text: '+',
      attributes: { type: 'button', 'aria-label': `Increase ${product.name} quantity` }
    });
    const remove = createElement('button', {
      className: 'text-button',
      text: 'Remove',
      attributes: { type: 'button', 'aria-label': `Remove ${product.name} from cart` }
    });

    decrease.addEventListener('click', () => changeQuantity(product.id, -1));
    increase.addEventListener('click', () => changeQuantity(product.id, 1));
    remove.addEventListener('click', () => removeFromCart(product.id));

    details.append(type, title, lineTotal);
    quantity.append(decrease, amount, increase);
    controls.append(quantity, remove);
    row.append(image, details, controls);

    return row;
  }

  function renderCart() {
    const root = document.querySelector('[data-cart-items]');
    const subtotalElement = document.querySelector('[data-cart-subtotal]');
    const totalElement = document.querySelector('[data-cart-total]');
    const checkoutButton = document.querySelector('[data-checkout]');

    if (!root || !subtotalElement || !totalElement) return;

    const cart = getCart();
    const subtotal = cart.reduce((total, item) => {
      return total + products[item.id].price * item.quantity;
    }, 0);

    root.replaceChildren();

    if (cart.length === 0) {
      const empty = createElement('div', { className: 'empty-state' });
      const icon = createElement('i', {
        className: 'icon icon--basket-shopping',
        attributes: { 'aria-hidden': 'true' }
      });
      const title = createElement('h2', { text: 'Your cart is ready for a fresh start.' });
      const copy = createElement('p', {
        className: 'muted',
        text: 'Explore our coffee or brewing gear and add something you love.'
      });
      const link = createElement('a', {
        className: 'btn btn--primary',
        text: 'Shop coffee',
        attributes: { href: 'coffee.html' }
      });

      empty.append(icon, title, copy, link);
      root.append(empty);
    } else {
      cart.forEach((item) => root.append(buildCartItem(item)));
    }

    subtotalElement.textContent = formatMoney.format(subtotal);
    totalElement.textContent = formatMoney.format(subtotal);
    if (checkoutButton) checkoutButton.disabled = cart.length === 0;
  }

  function setupNavigation() {
    const toggle = document.querySelector('[data-nav-toggle]');
    const nav = document.querySelector('[data-site-nav]');
    if (!toggle || !nav) return;

    const icon = toggle.querySelector('i');

    const setOpen = (isOpen) => {
      nav.classList.toggle('is-open', isOpen);
      // Keep page scrolling enabled so it cannot interfere with the sticky header.
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
      if (icon) icon.className = isOpen ? 'icon icon--xmark' : 'icon icon--bars';
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });

    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) setOpen(false);
    });
  }

  /* Featured content slideshow --------------------------------------- */

  function setupCarousel() {
    const carousel = document.querySelector('[data-carousel]');
    if (!carousel) return;

    const slides = Array.from(carousel.querySelectorAll('[data-carousel-slide]'));
    const previousButton = carousel.querySelector('[data-carousel-previous]');
    const nextButton = carousel.querySelector('[data-carousel-next]');
    const pauseButton = carousel.querySelector('[data-carousel-pause]');
    const dots = Array.from(carousel.querySelectorAll('[data-carousel-dot]'));
    const status = carousel.querySelector('[data-carousel-status]');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (slides.length < 2) return;

    let activeIndex = 0;
    let timer = null;
    let userPaused = reduceMotion;

    const showSlide = (nextIndex, announce = true) => {
      activeIndex = (nextIndex + slides.length) % slides.length;

      slides.forEach((slide, index) => {
        const isActive = index === activeIndex;
        slide.classList.toggle('is-active', isActive);
        slide.setAttribute('aria-hidden', String(!isActive));
      });

      dots.forEach((dot, index) => {
        const isActive = index === activeIndex;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-current', isActive ? 'true' : 'false');
      });

      if (status && announce) status.textContent = `Slide ${activeIndex + 1} of ${slides.length}`;
    };

    const stop = () => {
      window.clearInterval(timer);
      timer = null;
    };

    const start = () => {
      stop();
      if (!userPaused && !document.hidden) {
        timer = window.setInterval(() => showSlide(activeIndex + 1, false), 6000);
      }
    };

    const move = (change) => {
      showSlide(activeIndex + change);
      start();
    };

    previousButton?.addEventListener('click', () => move(-1));
    nextButton?.addEventListener('click', () => move(1));

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        showSlide(index);
        start();
      });
    });

    pauseButton?.addEventListener('click', () => {
      userPaused = !userPaused;
      pauseButton.setAttribute('aria-pressed', String(userPaused));
      pauseButton.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
      const icon = pauseButton.querySelector('i');
      if (icon) icon.className = userPaused ? 'icon icon--play' : 'icon icon--pause';
      userPaused ? stop() : start();
    });

    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', start);
    carousel.addEventListener('focusin', stop);
    carousel.addEventListener('focusout', start);
    document.addEventListener('visibilitychange', start);

    showSlide(0, false);
    start();
  }

  /* Catalogue search and animated suggestions ------------------------- */

  function setupProductFilters() {
    const search = document.querySelector('[data-product-search]');
    const cards = Array.from(document.querySelectorAll('[data-product-card]'));
    const buttons = Array.from(document.querySelectorAll('[data-filter]'));
    const status = document.querySelector('[data-results-status]');
    const hint = document.querySelector('[data-search-hint]');

    if (!cards.length || (!search && !buttons.length)) return;

    let activeFilter = 'all';

    const applyFilters = () => {
      const query = search ? search.value.trim().toLowerCase() : '';
      let count = 0;

      cards.forEach((card) => {
        const searchableText = `${card.dataset.search || ''} ${card.textContent}`.toLowerCase();
        const matchesSearch = !query || searchableText.includes(query);
        const matchesFilter = activeFilter === 'all' || card.dataset.category === activeFilter;
        const isMatch = matchesSearch && matchesFilter;

        card.hidden = !isMatch;
        if (isMatch) count += 1;
      });

      if (status) {
        status.textContent = `${count} product${count === 1 ? '' : 's'} shown`;
      }
    };

    search?.addEventListener('input', applyFilters);

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.filter;
        buttons.forEach((item) => {
          const isActive = item === button;
          item.classList.toggle('is-active', isActive);
          item.setAttribute('aria-pressed', String(isActive));
        });
        applyFilters();
      });
    });

    if (search && hint) {
      const phrases = ['Try “chocolate notes”', 'Try “pour over”', 'Try “medium roast”', 'Try “decaf”'];
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let phraseIndex = 0;
      let characterIndex = 0;
      let deleting = false;

      const animateSuggestion = () => {
        if (search.value || document.activeElement === search) {
          hint.textContent = '';
          window.setTimeout(animateSuggestion, 400);
          return;
        }

        const phrase = phrases[phraseIndex];
        characterIndex += deleting ? -1 : 1;
        hint.textContent = phrase.slice(0, Math.max(0, characterIndex));

        if (!deleting && characterIndex >= phrase.length) {
          deleting = true;
          window.setTimeout(animateSuggestion, 1000);
          return;
        }

        if (deleting && characterIndex <= 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
        }

        window.setTimeout(animateSuggestion, deleting ? 40 : 70);
      };

      if (reduceMotion) hint.textContent = phrases[0];
      else window.setTimeout(animateSuggestion, 450);
    }

    applyFilters();
  }

  /* Forms and front-end anti-spam behaviour --------------------------- */

  function setFormMessage(form, message, type = 'success') {
    const messageElement = form.querySelector('[data-form-message]');
    if (!messageElement) return;

    messageElement.textContent = message;
    messageElement.classList.toggle('is-success', type === 'success');
    messageElement.classList.toggle('is-error', type === 'error');
  }

  function setupNewsletterForms() {
    document.querySelectorAll('[data-newsletter-form]').forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;

        const email = new FormData(form).get('email');
        storage.set('beanBoutique.newsletterEmail', String(email));
        setFormMessage(form, 'Welcome to the list — use BREW10 on your first coffee order.');
        form.reset();
      });
    });
  }

  /* Use built-in browser sharing APIs, with a clipboard fallback. */
  function setupShareControls() {
    const shareButton = document.querySelector('[data-share-coffee]');
    const emailButton = document.querySelector('[data-share-email]');
    const status = document.querySelector('[data-share-status]');
    if (!shareButton || !status) return;

    const shareDetails = {
      title: 'Bean Boutique coffee collection',
      text: 'Take a look at the thoughtfully roasted coffees from Bean Boutique.',
      url: window.location.href
    };

    shareButton.addEventListener('click', async () => {
      if (navigator.share) {
        try {
          await navigator.share(shareDetails);
          status.textContent = 'Thanks for sharing the coffee collection.';
          return;
        } catch (error) {
          if (error.name === 'AbortError') return;
        }
      }

      try {
        await navigator.clipboard.writeText(shareDetails.url);
        status.textContent = 'The coffee collection link has been copied.';
      } catch (error) {
        const temporaryInput = document.createElement('textarea');
        temporaryInput.value = shareDetails.url;
        temporaryInput.setAttribute('readonly', '');
        temporaryInput.style.position = 'fixed';
        temporaryInput.style.opacity = '0';
        document.body.append(temporaryInput);
        temporaryInput.select();
        const wasCopied = document.execCommand('copy');
        temporaryInput.remove();
        status.textContent = wasCopied
          ? 'The coffee collection link has been copied.'
          : 'Copy this page address to share the coffee collection.';
      }
    });

    emailButton?.addEventListener('click', () => {
      const subject = encodeURIComponent(shareDetails.title);
      const body = encodeURIComponent(`${shareDetails.text} ${shareDetails.url}`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    });
  }

  function setupEventRegistration() {
    const form = document.querySelector('[data-event-form]');
    if (!form) return;

    const startedAt = Date.now();
    const eventSelect = form.querySelector('[name="event"]');

    document.querySelectorAll('[data-register-event]').forEach((button) => {
      button.addEventListener('click', () => {
        if (eventSelect) eventSelect.value = button.dataset.registerEvent;
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => form.querySelector('input')?.focus(), 450);
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const honeypot = form.querySelector('[name="company"]');
      if (honeypot?.value) return;

      if (Date.now() - startedAt < 1800) {
        setFormMessage(form, 'Please review your details, then submit again.', 'error');
        return;
      }

      if (!form.reportValidity()) return;

      const data = Object.fromEntries(new FormData(form).entries());
      const subject = encodeURIComponent(`Bean Boutique registration: ${data.event}`);
      const body = encodeURIComponent([
        `First name: ${data.firstName}`,
        `Last name: ${data.lastName}`,
        `Email: ${data.email}`,
        `Event: ${data.event}`,
        `Access needs or questions: ${data.message || 'None provided'}`
      ].join('\n'));

      setFormMessage(form, 'Your email application will open with the registration details ready to send.');
      window.location.href = `mailto:events@beanboutique.example?subject=${subject}&body=${body}`;
    });
  }

  function setupSubscriptionButtons() {
    document.querySelectorAll('[data-subscription]').forEach((button) => {
      button.addEventListener('click', () => {
        const plan = button.dataset.subscription;
        storage.set('beanBoutique.subscriptionInterest', plan);
        showToast(`${plan} selected. We’ll help you confirm the delivery details next.`);
      });
    });
  }

  function setupWelcomeModal() {
    const backdrop = document.querySelector('[data-welcome-modal]');
    if (!backdrop) return;

    try {
      if (window.sessionStorage.getItem(WELCOME_KEY)) return;
    } catch (error) {
      // Continue without session persistence when browser privacy settings block it.
    }

    const dialog = backdrop.querySelector('[role="dialog"]');
    const closeButton = backdrop.querySelector('[data-modal-close]');
    let previouslyFocused = null;

    const focusableSelector = 'button:not([disabled]), input:not([disabled]), a[href], select:not([disabled]), textarea:not([disabled])';

    const close = () => {
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      try {
        window.sessionStorage.setItem(WELCOME_KEY, 'true');
      } catch (error) {
        // Closing the modal must never fail because storage is unavailable.
      }
      previouslyFocused?.focus();
    };

    const open = () => {
      previouslyFocused = document.activeElement;
      backdrop.classList.add('is-open');
      backdrop.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      dialog.querySelector('input')?.focus();
    };

    closeButton?.addEventListener('click', close);
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) close();
    });

    document.addEventListener('keydown', (event) => {
      if (!backdrop.classList.contains('is-open')) return;

      if (event.key === 'Escape') {
        close();
        return;
      }

      if (event.key === 'Tab') {
        const focusable = Array.from(dialog.querySelectorAll(focusableSelector));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    window.setTimeout(open, 1000);
  }

  function setupCheckout() {
    document.querySelector('[data-checkout]')?.addEventListener('click', () => {
      showToast('Secure online checkout is not connected in this front-end demonstration.');
    });
  }

  function setupImageFallbacks() {
    document.querySelectorAll('img').forEach((image) => {
      image.addEventListener('error', () => {
        if (image.dataset.fallbackApplied) return;
        image.dataset.fallbackApplied = 'true';
        image.src = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80';
      });
    });
  }

  function setCurrentYear() {
    document.querySelectorAll('[data-year]').forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupCarousel();
    setupCartButtons();
    setupProductFilters();
    setupShareControls();
    setupNewsletterForms();
    setupEventRegistration();
    setupSubscriptionButtons();
    setupWelcomeModal();
    setupCheckout();
    setupImageFallbacks();
    updateCartCount();
    renderCart();
    setCurrentYear();
  });
}());
