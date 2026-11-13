/* Omnicreatine homepage sections — carousels, tabs, review list, videos, featured product. */
(function () {
  if (window.__ocLoaded) return;
  window.__ocLoaded = true;

  function define(name, cls) {
    if (!customElements.get(name)) customElements.define(name, cls);
  }

  /* Horizontal scroll carousel with dot indicator + prev/next */
  class LmCarousel extends HTMLElement {
    connectedCallback() {
      this.list = this.querySelector('.hscroll');
      if (!this.list) return;
      this.dots = Array.from(this.querySelectorAll('.dots .d i'));
      this.querySelectorAll('[data-dir]').forEach((b) =>
        b.addEventListener('click', () => this.go(this.index() + Number(b.dataset.dir)))
      );
      this.list.addEventListener(
        'scroll',
        () => {
          cancelAnimationFrame(this._raf);
          this._raf = requestAnimationFrame(() => this.sync());
        },
        { passive: true }
      );
      this.onBlockSelect = (e) => {
        if (!this.contains(e.target)) return;
        const i = this.items().indexOf(e.target.closest('.hscroll > *'));
        if (i > -1) this.go(i);
      };
      document.addEventListener('shopify:block:select', this.onBlockSelect);
      const start = parseInt(this.dataset.start || '1', 10) - 1;
      requestAnimationFrame(() => {
        if (start > 0) this.go(start, 'auto');
        this.sync();
      });
    }
    disconnectedCallback() {
      document.removeEventListener('shopify:block:select', this.onBlockSelect);
    }
    items() {
      return Array.from(this.list.children);
    }
    index() {
      const l = this.list;
      const c = l.scrollLeft + l.clientWidth / 2;
      let best = 0;
      let bd = Infinity;
      this.items().forEach((el, i) => {
        const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - c);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      return best;
    }
    go(i, behavior) {
      const it = this.items();
      if (!it.length) return;
      i = Math.max(0, Math.min(it.length - 1, i));
      const el = it[i];
      this.list.scrollTo({
        left: el.offsetLeft + el.offsetWidth / 2 - this.list.clientWidth / 2,
        behavior: behavior || 'smooth',
      });
    }
    sync() {
      const i = this.index();
      this.dots.forEach((d, j) => d.classList.toggle('on', j === i));
    }
  }
  define('lm-carousel', LmCarousel);

  /* Benefit tabs */
  class LmTabs extends HTMLElement {
    connectedCallback() {
      this.tabs = Array.from(this.querySelectorAll('[role="tab"]'));
      this.panels = Array.from(this.querySelectorAll('[role="tabpanel"]'));
      this.tabs.forEach((t, i) => t.addEventListener('click', () => this.select(i)));
      this.onBlockSelect = (e) => {
        if (!this.contains(e.target)) return;
        const i = this.tabs.indexOf(e.target.closest('[role="tab"]'));
        if (i > -1) this.select(i);
      };
      document.addEventListener('shopify:block:select', this.onBlockSelect);
    }
    disconnectedCallback() {
      document.removeEventListener('shopify:block:select', this.onBlockSelect);
    }
    select(i) {
      this.tabs.forEach((t, j) => {
        t.classList.toggle('on', i === j);
        t.setAttribute('aria-selected', i === j ? 'true' : 'false');
      });
      this.panels.forEach((p, j) => (p.hidden = i !== j));
    }
  }
  define('lm-tabs', LmTabs);

  /* "See more reviews" */
  class LmReviews extends HTMLElement {
    connectedCallback() {
      const sort = this.querySelector('[data-sort]');
      if (sort) sort.addEventListener('change', () => this.sort(sort.value));
      const btn = this.querySelector('[data-more]');
      if (!btn) return;
      const step = parseInt(this.dataset.step || '4', 10);
      btn.addEventListener('click', () => {
        const hidden = Array.from(this.querySelectorAll('.ri[hidden]'));
        hidden.slice(0, step).forEach((r) => (r.hidden = false));
        if (hidden.length <= step) btn.closest('.more').hidden = true;
      });
    }
  }
  LmReviews.prototype.sort = function (mode) {
    const list = this.querySelector('.rlist');
    if (!list) return;
    const items = Array.from(list.querySelectorAll('.ri'));
    const shown = items.filter((r) => !r.hidden).length;
    const idx = (r) => Number(r.dataset.i);
    const rate = (r) => Number(r.dataset.rating);
    const cmp = {
      latest: (a, b) => idx(a) - idx(b),
      oldest: (a, b) => idx(b) - idx(a),
      high: (a, b) => rate(b) - rate(a) || idx(a) - idx(b),
      low: (a, b) => rate(a) - rate(b) || idx(a) - idx(b),
    }[mode];
    if (!cmp) return;
    items.sort(cmp).forEach((r, i) => {
      r.hidden = i >= shown;
      list.appendChild(r);
    });
  };
  define('lm-reviews', LmReviews);

  /* UGC video card (the element itself is the .vc card) */
  class LmVideo extends HTMLElement {
    connectedCallback() {
      const card = this;
      const btn = this.querySelector('.play');
      const video = this.querySelector('video');
      if (!btn || !video) return;
      btn.addEventListener('click', () => {
        document.querySelectorAll('lm-video video').forEach((v) => {
          if (v !== video) v.pause();
        });
        card.classList.add('playing');
        video.controls = true;
        video.play();
      });
    }
  }
  define('lm-video', LmVideo);

  /* Featured product: flavor (option 1), packs (quantity + optional selling plan), gallery */
  class LmProduct extends HTMLElement {
    connectedCallback() {
      const json = this.querySelector('script[data-lm-json]');
      if (!json) return;
      this.d = JSON.parse(json.textContent);
      this.form = this.querySelector('form');
      this.idInput = this.form.querySelector('[name="id"]');
      this.qtyInput = this.form.querySelector('[name="quantity"]');
      this.planInput = this.form.querySelector('[name="selling_plan"]');
      this.mainImg = this.querySelector('[data-main-img]');
      this.flavors = Array.from(this.querySelectorAll('.fo[data-value]'));
      this.packs = Array.from(this.querySelectorAll('.pk[data-qty]'));
      this.thumbs = Array.from(this.querySelectorAll('.thumb[data-src]'));
      const onFlavor = this.flavors.find((f) => f.classList.contains('on'));
      this.flavor = onFlavor ? onFlavor.dataset.value : this.d.variants[0].option1;
      this.pack = Math.max(0, this.packs.findIndex((p) => p.classList.contains('on')));

      this.flavors.forEach((f) =>
        f.addEventListener('click', () => {
          this.flavor = f.dataset.value;
          this.update(true);
        })
      );
      this.packs.forEach((p, i) =>
        p.addEventListener('click', () => {
          this.pack = i;
          this.update(false);
        })
      );
      this.thumbs.forEach((t) =>
        t.addEventListener('click', () => {
          this.thumbs.forEach((x) => x.classList.toggle('on', x === t));
          this.setMain(t.dataset.src);
        })
      );
      this.querySelectorAll('[data-media-dir]').forEach((b) =>
        b.addEventListener('click', () => {
          if (!this.thumbs.length) return;
          let i = this.thumbs.findIndex((t) => t.classList.contains('on'));
          i = (i + Number(b.dataset.mediaDir) + this.thumbs.length) % this.thumbs.length;
          const t = this.thumbs[i];
          t.click();
          const row = t.parentElement;
          row.scrollTo({ left: t.offsetLeft - (row.clientWidth - t.offsetWidth) / 2, behavior: 'smooth' });
        })
      );
      const otp = this.querySelector('[data-otp]');
      if (otp)
        otp.addEventListener('click', (e) => {
          e.preventDefault();
          if (!this.variant().available) return;
          this.qtyInput.value = 1;
          this.planInput.disabled = true;
          this.add(otp);
        });
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.add(this.form.querySelector('.buy'));
      });
      this.update(false);
    }
    /* Add via AJAX and open Dawn's cart drawer; plain submit when there is no drawer or "Go to checkout" is set */
    add(trigger) {
      const cart = document.querySelector('cart-drawer');
      const restore = () => this.update(false);
      if (!cart || this.form.querySelector('[name="return_to"]') || !window.fetch) {
        this.form.submit();
        return;
      }
      if (this.busy) return;
      this.busy = true;
      const buy = this.form.querySelector('.buy');
      buy.disabled = true;
      const fd = new FormData(this.form);
      fd.append('sections', cart.getSectionsToRender().map((s) => s.id));
      fd.append('sections_url', window.location.pathname);
      cart.setActiveElement(trigger || document.activeElement);
      fetch((window.routes && window.routes.cart_add_url) || '/cart/add', {
        method: 'POST',
        headers: { Accept: 'application/javascript', 'X-Requested-With': 'XMLHttpRequest' },
        body: fd,
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.status) {
            (buy.querySelector('[data-buy-text]') || buy).textContent = res.description || res.message || buy.dataset.soldout;
            setTimeout(restore, 3000);
            return;
          }
          if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined')
            publish(PUB_SUB_EVENTS.cartUpdate, { source: 'product-form', productVariantId: fd.get('id'), cartData: res });
          cart.classList.remove('is-empty');
          cart.renderContents(res);
          restore();
        })
        .catch(() => this.form.submit())
        .finally(() => {
          this.busy = false;
          buy.disabled = !this.variant().available;
        });
    }
    variant() {
      const vs = this.d.variants;
      return (
        vs.find((v) => v.option1 === this.flavor && v.available) ||
        vs.find((v) => v.option1 === this.flavor) ||
        vs[0]
      );
    }
    money(cents) {
      const f = this.d.moneyFormat || '${{amount}}';
      const m = f.match(/\{\{\s*(\w+)\s*\}\}/);
      const fmt = (n, dec, th, ds) => {
        const parts = (n / 100).toFixed(dec).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, th);
        return parts[1] ? parts[0] + ds + parts[1] : parts[0];
      };
      let v;
      switch (m ? m[1] : 'amount') {
        case 'amount_no_decimals':
          v = fmt(cents, 0, ',', '.');
          break;
        case 'amount_with_comma_separator':
          v = fmt(cents, 2, '.', ',');
          break;
        case 'amount_no_decimals_with_comma_separator':
          v = fmt(cents, 0, '.', ',');
          break;
        case 'amount_with_apostrophe_separator':
          v = fmt(cents, 2, "'", '.');
          break;
        default:
          v = fmt(cents, 2, ',', '.');
      }
      return f.replace(/\{\{\s*\w+\s*\}\}/, v);
    }
    setMain(src) {
      if (!this.mainImg || !src) return;
      this.mainImg.removeAttribute('srcset');
      this.mainImg.src = src;
    }
    calc(v, el) {
      const qty = parseInt(el.dataset.qty, 10) || 1;
      const plan = el.dataset.plan || '';
      const days = parseInt(el.dataset.days, 10) || 30;
      const hasPlan = plan && v.plans && v.plans[plan] != null;
      const unit = hasPlan ? v.plans[plan] : v.price;
      const free = parseInt(el.dataset.free, 10) || 0;
      const total = unit * Math.max(1, qty - free);
      const cmp = (v.compare > v.price ? v.compare : v.price) * qty;
      return { qty, plan: hasPlan ? plan : '', total, cmp, perDay: Math.round(total / (days * qty)) };
    }
    update(flavorChanged) {
      const v = this.variant();
      this.idInput.value = v.id;
      this.flavors.forEach((f) => {
        const on = f.dataset.value === this.flavor;
        f.classList.toggle('on', on);
        f.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      this.querySelectorAll('[data-flavor-name]').forEach((el) => (el.textContent = this.flavor));
      this.packs.forEach((el, i) => {
        const on = i === this.pack;
        el.classList.toggle('on', on);
        el.setAttribute('aria-pressed', on ? 'true' : 'false');
        const c = this.calc(v, el);
        const q = (s) => el.querySelector(s);
        if (q('[data-perday]')) q('[data-perday]').textContent = this.money(c.perDay) + ' ' + (el.dataset.perdayLabel || '');
        if (q('[data-total]')) q('[data-total]').textContent = this.money(c.total);
        if (q('[data-compare]')) {
          q('[data-compare]').textContent = this.money(c.cmp);
          q('[data-compare]').hidden = c.cmp <= c.total;
        }
        const off = q('[data-off]');
        if (off && !el.dataset.offText) {
          const pct = c.cmp > 0 ? Math.round(((c.cmp - c.total) / c.cmp) * 100) : 0;
          off.textContent = pct + (el.dataset.offSuffix || '% Off');
          off.style.visibility = pct > 0 ? '' : 'hidden';
        }
        if (on) {
          this.qtyInput.value = c.qty;
          this.planInput.value = c.plan;
          this.planInput.disabled = !c.plan;
        }
      });
      const otpPrice = this.querySelector('[data-otp-price]');
      if (otpPrice) otpPrice.textContent = this.money(v.price);
      const otp = this.querySelector('[data-otp]');
      if (otp) otp.setAttribute('aria-disabled', v.available ? 'false' : 'true');
      const buy = this.querySelector('.buy');
      if (buy) {
        buy.disabled = !v.available;
        (buy.querySelector('[data-buy-text]') || buy).textContent = v.available ? buy.dataset.label : buy.dataset.soldout;
      }
      if (flavorChanged && v.image) {
        this.setMain(v.image);
        this.thumbs.forEach((t) => t.classList.toggle('on', t.dataset.mediaId === String(v.mediaId)));
      }
    }
  }
  define('lm-product', LmProduct);
})();
