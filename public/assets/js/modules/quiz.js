/** Quiz « Quel OKU pour ta journée ? » : trois questions, une recommandation, ajout direct au panier. */
import { QUESTIONS, WHY, PROFILE_TIP } from '../data/quiz.js';
import { COFFEES, coffeePrice, coffeeSku } from '../data/catalog.js';
import { esc, reducedMotion } from '../lib/dom.js';
import { fcfa } from '../lib/format.js';
import { cart } from './cart.js';
import { toast } from './toast.js';

export function initQuiz() {
  const box = document.getElementById('quizbox');
  if (!box) return;
  let step = 0;
  let score = {};
  let profile = 'tout';

  const bar = () => `<div class="qbar" aria-hidden="true">${QUESTIONS.map((_, i) => `<i class="${i < step ? 'on' : ''}"></i>`).join('')}</div>`;

  function question() {
    const q = QUESTIONS[step];
    box.innerHTML = `${bar()}<div class="qstep"><span class="n">Question ${step + 1} sur ${QUESTIONS.length}</span><h3>${esc(q.q)}</h3>
      <div class="qopts">${q.options.map((o, i) => `<button type="button" data-i="${i}">${esc(o.label)}</button>`).join('')}</div></div>`;
    box.querySelectorAll('.qopts button').forEach((b) => {
      b.addEventListener('click', () => {
        const o = q.options[Number(b.dataset.i)];
        for (const [k, v] of Object.entries(o.score)) score[k] = (score[k] || 0) + v;
        if (o.profile) profile = o.profile;
        step += 1;
        requestAnimationFrame(() => box.querySelector(`.qbar i:nth-child(${step})`)?.classList.add('on'));
        setTimeout(() => (step < QUESTIONS.length ? question() : result()), reducedMotion() ? 0 : 260);
      });
    });
  }

  function result() {
    const best = ['sommet', 'insomnie', 'manengouba'].sort((a, b) => (score[b] || 0) - (score[a] || 0))[0];
    const c = COFFEES.find((x) => x.id === best);
    box.innerHTML = `${bar()}<div class="qres">
      <div class="ph"><img src="${c.img}" alt="Sac OKU ${esc(c.name)}"></div>
      <div><span class="eyebrow">Ton café</span><h3 style="margin:8px 0 12px">${esc(c.name)}</h3>
        <p class="why">${esc(WHY[best])}</p><p class="more" style="margin-top:10px">${esc(PROFILE_TIP[profile])}</p>
        <div class="row"><button type="button" class="btn" data-q-add>Ajouter 250 g · ${fcfa(coffeePrice(250))}</button>
        <button type="button" class="link" data-q-again>Recommencer</button></div></div></div>`;
    box.querySelector('[data-q-add]').addEventListener('click', () => {
      cart.add(coffeeSku(c.id, 250), 'En grains');
      toast(`${c.name} · 250 g ajouté au panier`);
    });
    box.querySelector('[data-q-again]').addEventListener('click', () => {
      step = 0; score = {}; profile = 'tout';
      question();
    });
  }

  question();
}
