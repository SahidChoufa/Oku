/** Compte à rebours jusqu'à l'ouverture du lot (tous les blocs [data-count] de la page). */
import { CONFIG } from '../config.js';
import { replay } from '../lib/dom.js';
import { pad2 } from '../lib/format.js';

export function initCountdown() {
  const boxes = [...document.querySelectorAll('[data-count]')];
  if (!boxes.length) return;
  const target = new Date(CONFIG.launchAt).getTime();
  const tick = () => {
    const ms = Math.max(0, target - Date.now());
    const v = {
      d: Math.floor(ms / 864e5),
      h: Math.floor(ms / 36e5) % 24,
      m: Math.floor(ms / 6e4) % 60,
      s: Math.floor(ms / 1e3) % 60,
    };
    for (const box of boxes) {
      for (const k of Object.keys(v)) {
        const el = box.querySelector(`[data-u="${k}"]`);
        const t = pad2(v[k]);
        if (el && el.textContent !== t) {
          el.textContent = t;
          replay(el, 'tick');
        }
      }
      if (ms === 0) box.querySelector('[data-open]')?.removeAttribute('hidden');
    }
  };
  tick();
  setInterval(tick, 1000);
}
