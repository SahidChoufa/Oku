/**
 * Règles de validation partagées entre le navigateur et le serveur.
 */

/** Numéro camerounais à 9 chiffres (6XX XX XX XX ou 2XX XX XX XX), avec ou sans +237. Renvoie le format +237 6 XX XX XX XX, ou null. */
export function normalizePhone(value) {
  let d = String(value ?? '').replace(/\D/g, '');
  if (d.startsWith('00237')) d = d.slice(5);
  else if (d.startsWith('237') && d.length === 12) d = d.slice(3);
  if (d.length !== 9 || !/^[26]/.test(d)) return null;
  return `+237 ${d[0]} ${d.slice(1, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
}

/** Version compacte pour les API (237XXXXXXXXX). */
export function phoneDigits(normalized) {
  return String(normalized ?? '').replace(/\D/g, '');
}

export function isEmail(value) {
  const v = String(value ?? '').trim();
  return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/** Texte libre nettoyé : espaces normalisés, caractères de contrôle retirés, longueur bornée. */
export function cleanText(value, max = 300) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Vérifie les coordonnées de commande. Renvoie { ok, value, errors } où errors est
 * un objet { champ: message } prêt à afficher.
 */
export function validateCheckout(input, cities) {
  const errors = {};
  const customer = input?.customer ?? {};
  const delivery = input?.delivery ?? {};
  const name = cleanText(customer.name, 120);
  const email = cleanText(customer.email, 254).toLowerCase();
  const phone = normalizePhone(customer.phone);
  const city = cleanText(delivery.city, 60);
  const district = cleanText(delivery.district, 120);
  const address = cleanText(delivery.address, 400);
  const notes = cleanText(delivery.notes, 300);

  if (name.length < 3) errors.name = 'Indique ton nom complet.';
  if (!isEmail(email)) errors.email = 'Adresse e-mail invalide, par exemple nom@exemple.com.';
  if (!phone) errors.phone = 'Numéro camerounais à 9 chiffres, par exemple 6XX XX XX XX.';
  if (!cities.includes(city)) errors.city = 'Choisis ta ville.';
  if (district.length < 2) errors.district = 'Indique ton quartier.';
  if (address.length < 6) errors.address = 'Donne une adresse ou un point de repère pour le livreur.';
  if (input?.acceptTerms !== true) errors.terms = 'Accepte les conditions de vente pour continuer.';
  const payment = input?.payment === 'cod' ? 'cod' : 'kpay';

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { customer: { name, email, phone }, delivery: { city, district, address, notes }, payment },
  };
}
