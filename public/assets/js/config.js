/**
 * Réglages du site — à compléter avant la mise en ligne.
 */
export const CONFIG = {
  /** Hotline affichée partout sur le site. Laisser vide tant que le numéro n'est pas attribué. */
  hotline: {
    number: '', // ex. '+237 6 XX XX XX XX'
    hours: '', // ex. 'Tous les jours, de 7 h à 21 h'
  },

  /** Adresse e-mail du service client (affichée dans les pages légales et la confirmation). */
  supportEmail: '', // ex. 'bonjour@votre-domaine.cm'

  /** API de commande. Vide = même domaine que le site (serveur Node fourni dans /server). */
  apiBase: '',

  /**
   * Mode démonstration : aucune requête au serveur, la commande s'arrête à l'écran de confirmation.
   * Laisser à false en production.
   */
  demo: false,

  /** Ouverture du lot 001 (heure de Douala, UTC+1). */
  launchAt: '2026-12-01T05:00:00+01:00',

  /** Clé de stockage du panier dans le navigateur. */
  cartKey: 'oku-cart',
};
