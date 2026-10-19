/** Affichage des erreurs de saisie, champ par champ (.f.bad + message .err lié par aria-describedby). */

export function markField(input, bad, message) {
  if (!input) return !bad;
  const f = input.closest('.f, .check');
  if (!f) return !bad;
  f.classList.toggle('bad', Boolean(bad));
  input.setAttribute('aria-invalid', bad ? 'true' : 'false');
  const err = f.querySelector('.err');
  if (err) {
    if (!err.id) err.id = `${input.id}-err`;
    if (message) err.textContent = message;
    input.setAttribute('aria-describedby', err.id);
  }
  return !bad;
}

export function clearFieldErrors(root) {
  root.querySelectorAll('.bad').forEach((f) => f.classList.remove('bad'));
  root.querySelectorAll('[aria-invalid="true"]').forEach((i) => i.setAttribute('aria-invalid', 'false'));
}

/** Retire l'erreur d'un champ dès que la personne le corrige. */
export function liveClear(root) {
  root.addEventListener('input', (e) => {
    const f = e.target.closest('.f.bad, .check.bad');
    if (f) f.classList.remove('bad');
  });
  root.addEventListener('change', (e) => {
    const f = e.target.closest('.f.bad, .check.bad');
    if (f) f.classList.remove('bad');
  });
}
