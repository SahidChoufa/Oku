/**
 * Accès au stockage du navigateur sans jamais planter :
 * navigation privée, stockage bloqué ou plein → on continue sans mémoriser.
 */

export function readJSON(key, fallback, area = 'local') {
  try {
    const s = (area === 'session' ? sessionStorage : localStorage).getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value, area = 'local') {
  try {
    (area === 'session' ? sessionStorage : localStorage).setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : le panier reste en mémoire pour cette visite */
  }
}

export function remove(key, area = 'local') {
  try {
    (area === 'session' ? sessionStorage : localStorage).removeItem(key);
  } catch {
    /* rien à faire */
  }
}
