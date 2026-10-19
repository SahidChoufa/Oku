/**
 * Apparition au défilement : le contenu est toujours visible,
 * seul un léger décalage vertical est rattrapé quand l'élément entre à l'écran.
 */
import { reducedMotion } from '../lib/dom.js';

export function initReveal(selector = '.stat, .stp, .legend button, .faq details, .card') {
  const els = [...document.querySelectorAll(selector)];
  els.forEach((el) => el.classList.add('pre'));
  if (reducedMotion() || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  els.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    io.observe(el);
  });
}
