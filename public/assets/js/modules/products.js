/** Cartes produits : cafés (poids + mouture) et matériel. */
import { COFFEES, MACHINES, SIZES, GRINDS, coffeePrice, coffeeSku, weightLabel } from '../data/catalog.js';
import { fromHTML, esc } from '../lib/dom.js';
import { fcfa } from '../lib/format.js';
import { cart } from './cart.js';
import { toast } from './toast.js';

function coffeeCard(c) {
  let grams = SIZES[0].grams;
  const sid = `g-${c.id}`;
  const el = fromHTML(`
    <article class="card">
      <div class="ph"><img src="${c.img}" alt="Sac OKU ${esc(c.name)}" loading="lazy" width="800" height="1000"><span class="tag">${esc(c.tag)}</span></div>
      <div class="bd">
        <h3>${esc(c.name)}</h3>
        <span class="notes">${esc(c.notes)}</span>
        <p>${esc(c.desc)}</p>
        <div class="opt">
          <div class="seg" role="group" aria-label="Poids">
            ${SIZES.map((s) => `<button type="button" aria-pressed="${s.grams === grams}" data-g="${s.grams}">${s.label}</button>`).join('')}
          </div>
          <div class="sel"><label class="sr" for="${sid}">Mouture</label><select id="${sid}">${GRINDS.map((g) => `<option>${g}</option>`).join('')}</select></div>
        </div>
        <div class="buy"><span class="price"></span><button type="button" class="add">Ajouter</button></div>
      </div>
    </article>`);
  const price = el.querySelector('.price');
  const update = () => {
    price.innerHTML = `${fcfa(coffeePrice(grams))}<small>${weightLabel(grams)} · 15 000 FCFA le kilo</small>`;
  };
  el.querySelectorAll('.seg button').forEach((b) => {
    b.addEventListener('click', () => {
      grams = Number(b.dataset.g);
      el.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      update();
    });
  });
  el.querySelector('.add').addEventListener('click', () => {
    const grind = el.querySelector('select').value;
    cart.add(coffeeSku(c.id, grams), grind);
    toast(`${c.name} · ${weightLabel(grams)} ajouté au panier`);
  });
  update();
  return el;
}

function machineCard(m) {
  const el = fromHTML(`
    <article class="card">
      <div class="ph"><img src="${m.img}" alt="${esc(m.name)}" loading="lazy" width="800" height="1000"><span class="tag">${esc(m.tag)}</span></div>
      <div class="bd">
        <h3>${esc(m.name)}</h3>
        <p>${esc(m.desc)}</p>
        <div class="buy"><span class="price">${fcfa(m.price)}</span><button type="button" class="add">Ajouter</button></div>
      </div>
    </article>`);
  el.querySelector('.add').addEventListener('click', () => {
    cart.add(m.id);
    toast(`${m.name} ajouté au panier`);
  });
  return el;
}

export function initProducts() {
  const coffees = document.getElementById('cafes');
  const machines = document.getElementById('mat');
  coffees?.replaceChildren(...COFFEES.map(coffeeCard));
  machines?.replaceChildren(...MACHINES.map(machineCard));
}
