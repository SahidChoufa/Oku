/**
 * Catalogue OKU — source unique des produits et des prix.
 * Ce module est partagé par le navigateur (affichage, panier) ET par le serveur
 * (calcul du montant réellement facturé). Le serveur ne fait jamais confiance
 * aux prix envoyés par le navigateur : il recalcule tout à partir de ce fichier.
 */

/** Prix du café, identique pour les trois références. */
export const PRICE_PER_KG = 15000; // FCFA

export const SIZES = [
  { grams: 250, label: '250 g' },
  { grams: 500, label: '500 g' },
  { grams: 1000, label: '1 kg' },
];

export const GRINDS = ['En grains', 'Mouture espresso', 'Mouture filtre', 'Mouture presse'];

export const COFFEES = [
  {
    id: 'sommet',
    name: 'Sommet',
    tag: 'Assemblage maison',
    notes: 'CACAO NOIR · ÉPICES · AGRUMES',
    desc: "Torréfaction moyenne-foncée, beaucoup de corps, une finale de cacao. Il tient très bien avec du lait.",
    origin: "Arabica des hauts plateaux de l'Ouest",
    img: 'assets/img/pack_sommet.webp',
  },
  {
    id: 'insomnie',
    name: 'Insomnie',
    tag: 'Le plus caféiné',
    notes: 'NOISETTE GRILLÉE · MÉLASSE',
    desc: "Arabica de l'Ouest coupé de robusta du Moungo. À boire en espresso, de préférence avant 16 h.",
    origin: "Arabica de l'Ouest et robusta du Moungo",
    img: 'assets/img/pack_insomnie.webp',
  },
  {
    id: 'manengouba',
    name: 'Manengouba',
    tag: 'Arabica lavé',
    notes: 'FRUITS ROUGES · MIEL · JASMIN',
    desc: "Récolté sur les pentes du mont Manengouba. Acidité vive. Il se boit sans sucre, en filtre ou à la presse.",
    origin: 'Arabica lavé du mont Manengouba',
    img: 'assets/img/pack_manengouba.webp',
  },
];

/**
 * Matériel : prix de vente TTC en FCFA.
 * Calculés à partir du prix d'achat + 40 % de marge, arrondis à 500 FCFA.
 * Le prix d'achat n'est volontairement pas publié dans ce fichier (il est lisible par tous les visiteurs).
 */
export const MACHINES = [
  { id: 'moka', name: 'Moka OKU', tag: 'Gaz ou électrique', price: 14000, img: 'assets/img/mach_moka.webp',
    desc: "Cafetière italienne six tasses en aluminium. Elle marche aussi sur le gaz quand il y a délestage." },
  { id: 'presse', name: 'Presse Sommet', tag: '1 litre', price: 21000, img: 'assets/img/mach_presse.webp',
    desc: "Presse française en verre, armature en acier. Quatre minutes d'infusion, puis on presse." },
  { id: 'moulin', name: 'Moulin Conquête', tag: 'Meules coniques', price: 70000, img: 'assets/img/mach_moulin.webp',
    desc: "30 réglages, de l'espresso à la presse. Le café moulu juste avant garde ses arômes." },
  { id: 'espresso', name: 'Espresso Impérial', tag: '15 bars', price: 210000, img: 'assets/img/mach_espresso.webp',
    desc: "Pompe 15 bars et buse vapeur. De quoi servir six personnes en réunion sans sortir le soluble." },
];

/** Livraison : villes desservies et frais (0 = incluse dans le prix). */
export const DELIVERY = {
  cities: ['Douala', 'Yaoundé', 'Bafoussam'],
  fee: { Douala: 0, 'Yaoundé': 0, Bafoussam: 0 },
};

export const MAX_QTY_PER_LINE = 20;

export function coffeePrice(grams) {
  return Math.round((PRICE_PER_KG * grams) / 1000);
}

export function weightLabel(grams) {
  return grams >= 1000 ? `${grams / 1000} kg` : `${grams} g`;
}

/** Référence article : « sommet-250 », « moka »… */
export function coffeeSku(id, grams) {
  return `${id}-${grams}`;
}

/** Retrouve un article à partir de sa référence. Renvoie null si elle n'existe pas. */
export function resolveSku(sku) {
  const machine = MACHINES.find((m) => m.id === sku);
  if (machine) {
    return { sku, kind: 'machine', name: machine.name, unitPrice: machine.price, img: machine.img };
  }
  const m = /^([a-z]+)-(\d+)$/.exec(String(sku));
  if (!m) return null;
  const coffee = COFFEES.find((c) => c.id === m[1]);
  const size = SIZES.find((s) => s.grams === Number(m[2]));
  if (!coffee || !size) return null;
  return {
    sku,
    kind: 'coffee',
    name: `${coffee.name} · ${size.label}`,
    unitPrice: coffeePrice(size.grams),
    img: coffee.img,
  };
}

export function deliveryFee(city) {
  return DELIVERY.fee[city] ?? 0;
}

/**
 * Calcule un panier à partir de lignes { sku, qty, grind }.
 * Renvoie { lines, subtotal, delivery, total, errors }.
 */
export function priceCart(items, city) {
  const errors = [];
  const lines = [];
  for (const raw of Array.isArray(items) ? items : []) {
    const ref = resolveSku(raw && raw.sku);
    const qty = Number(raw && raw.qty);
    if (!ref) { errors.push(`Article inconnu : ${raw && raw.sku}`); continue; }
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) { errors.push(`Quantité invalide pour ${ref.name}`); continue; }
    let grind = '';
    if (ref.kind === 'coffee') {
      grind = GRINDS.includes(raw.grind) ? raw.grind : GRINDS[0];
    }
    lines.push({ sku: ref.sku, name: ref.name, kind: ref.kind, grind, qty, unitPrice: ref.unitPrice, total: ref.unitPrice * qty });
  }
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const delivery = lines.length ? deliveryFee(city) : 0;
  return { lines, subtotal, delivery, total: subtotal + delivery, errors };
}
