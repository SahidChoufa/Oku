/** Point d'entrée de la page d'accueil (boutique). */
import { initTicker } from './modules/ticker.js';
import { initHeader } from './modules/header.js';
import { initHotline } from './modules/hotline.js';
import { initCountdown } from './modules/countdown.js';
import { initProducts } from './modules/products.js';
import { initQuiz } from './modules/quiz.js';
import { initOriginMap } from './modules/origin-map.js';
import { initCheckout } from './modules/checkout.js';
import { initWaitlist } from './modules/waitlist.js';
import { initReveal } from './modules/reveal.js';
import { liveClear } from './modules/forms.js';

initTicker();
initHeader();
initHotline();
initCountdown();
initProducts();
initQuiz();
initOriginMap();
initCheckout();
initWaitlist();
liveClear(document.getElementById('wl'));
initReveal();
