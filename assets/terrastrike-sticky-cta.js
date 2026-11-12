/**
 * <terrastrike-sticky-cta> — reveals the fixed bottom checkout bar once the page
 * has been scrolled past a threshold, and hides it again at the top.
 *
 * Reads data-threshold (px).
 *
 * This theme does NOT always scroll the window: base.css gives `.page-wrapper`
 * `height: 100dvh; overflow-y: auto` above 990px, so on desktop the scrolling
 * happens inside that element and `window.scrollY` stays 0. We therefore find the
 * nearest scrollable ancestor, listen to it *and* the window, and take whichever
 * reports the larger offset. The scroller is re-detected on resize because it
 * changes at that 990px breakpoint.
 */
class TerraStrikeStickyCta extends HTMLElement {
  connectedCallback() {
    this.threshold = parseInt(this.dataset.threshold, 10);
    if (Number.isNaN(this.threshold)) this.threshold = 300;

    this.ticking = false;
    this.targets = [];
    this.onScroll = this.onScroll.bind(this);
    this.onResize = this.onResize.bind(this);

    this.attach();
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  disconnectedCallback() {
    this.detach();
    window.removeEventListener('resize', this.onResize);
  }

  /** Nearest ancestor that actually scrolls, or null when the window does. */
  findScroller() {
    let el = this.parentElement;
    while (el && el !== document.body && el !== document.documentElement) {
      const overflowY = getComputedStyle(el).overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  attach() {
    this.detach();

    this.targets = [window];
    const scroller = this.findScroller();
    if (scroller) this.targets.push(scroller);

    this.targets.forEach((target) => {
      target.addEventListener('scroll', this.onScroll, { passive: true });
    });

    this.update();
  }

  detach() {
    this.targets.forEach((target) => target.removeEventListener('scroll', this.onScroll));
    this.targets = [];
  }

  onResize() {
    // The scroll container swaps at the theme's 990px breakpoint.
    this.attach();
  }

  onScroll() {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this.update();
      this.ticking = false;
    });
  }

  scrollOffset() {
    let offset = window.scrollY || document.documentElement.scrollTop || 0;
    this.targets.forEach((target) => {
      if (target !== window) offset = Math.max(offset, target.scrollTop);
    });
    return offset;
  }

  update() {
    this.classList.toggle('is-visible', this.scrollOffset() > this.threshold);
  }
}

if (!customElements.get('terrastrike-sticky-cta')) {
  customElements.define('terrastrike-sticky-cta', TerraStrikeStickyCta);
}
