/** Appels à l'API de commande (serveur /server). */
import { CONFIG } from '../config.js';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api(path, { method = 'GET', body, timeout = 20000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${CONFIG.apiBase}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.message || 'Le serveur a refusé la demande.', res.status, data);
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Connexion impossible. Vérifie ta connexion internet et réessaie.', 0, null);
  } finally {
    clearTimeout(timer);
  }
}
