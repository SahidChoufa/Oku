/** Carte d'origine : la légende met en évidence les repères du café choisi. */
export function initOriginMap() {
  const map = document.querySelector('.map');
  const legend = document.getElementById('legend');
  if (!map || !legend) return;
  const buttons = [...legend.querySelectorAll('button')];
  const pins = [...map.querySelectorAll('.pt')];

  const focus = (btn) => {
    const keys = btn.dataset.k.split(',');
    buttons.forEach((b) => {
      b.classList.toggle('on', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
    map.classList.add('focus');
    pins.forEach((p) => p.classList.toggle('on', keys.includes(p.dataset.k)));
  };
  const reset = () => {
    map.classList.remove('focus');
    pins.forEach((p) => p.classList.remove('on'));
    buttons.forEach((b) => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
  };

  buttons.forEach((b) => {
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => focus(b));
    b.addEventListener('mouseenter', () => focus(b));
    b.addEventListener('focus', () => focus(b));
  });
  legend.addEventListener('mouseleave', () => {
    if (matchMedia('(hover: hover)').matches) reset();
  });
}
