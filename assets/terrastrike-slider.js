/**
 * <terrastrike-slider> — the product image slider used by
 * snippets/terrastrike-product-gallery.liquid.
 *
 * Expects the markup that snippet renders: a .ts-slider__track holding
 * .ts-slider__slide children, prev/next .ts-slider__arrow buttons, and an
 * optional .ts-thumbs strip of .ts-thumb buttons in the same order.
 */
class TerraStrikeSlider extends HTMLElement {
  connectedCallback() {
    this.track = this.querySelector('.ts-slider__track');
    this.slides = Array.from(this.querySelectorAll('.ts-slider__slide'));
    this.thumbs = Array.from(this.querySelectorAll('.ts-thumb'));
    if (!this.track || this.slides.length === 0) return;

    this.index = 0;

    this.querySelector('.ts-slider__arrow.prev')?.addEventListener('click', () => this.step(-1));
    this.querySelector('.ts-slider__arrow.next')?.addEventListener('click', () => this.step(1));

    this.thumbs.forEach((thumb, i) => {
      thumb.addEventListener('click', () => this.goTo(i));
    });

    // Swipe on touch devices.
    let startX = null;
    this.addEventListener(
      'touchstart',
      (event) => {
        startX = event.changedTouches[0].clientX;
      },
      { passive: true }
    );
    this.addEventListener(
      'touchend',
      (event) => {
        if (startX === null) return;
        const delta = event.changedTouches[0].clientX - startX;
        if (Math.abs(delta) > 40) this.step(delta < 0 ? 1 : -1);
        startX = null;
      },
      { passive: true }
    );

    // Arrow keys once the slider has focus.
    this.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') this.step(-1);
      if (event.key === 'ArrowRight') this.step(1);
    });

    this.render();
  }

  step(direction) {
    this.goTo(this.index + direction);
  }

  goTo(index) {
    const count = this.slides.length;
    // Wrap around so the arrows never dead-end.
    this.index = ((index % count) + count) % count;
    this.render();
  }

  render() {
    this.track.style.transform = `translateX(-${this.index * 100}%)`;

    this.slides.forEach((slide, i) => {
      slide.setAttribute('aria-hidden', i === this.index ? 'false' : 'true');
    });

    this.thumbs.forEach((thumb, i) => {
      const active = i === this.index;
      thumb.classList.toggle('is-active', active);
      thumb.setAttribute('aria-current', active ? 'true' : 'false');
    });
  }
}

if (!customElements.get('terrastrike-slider')) {
  customElements.define('terrastrike-slider', TerraStrikeSlider);
}
