/** Copie un texte et affiche un retour sur le bouton. */
export function copyText(text, button, doneLabel = 'Copié') {
  const label = button.textContent;
  const ok = () => {
    button.textContent = doneLabel;
    setTimeout(() => { button.textContent = label; }, 1800);
  };
  const fallback = () => {
    const t = document.createElement('textarea');
    t.value = text;
    t.setAttribute('readonly', '');
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.append(t);
    t.select();
    try { if (document.execCommand('copy')) ok(); } catch { /* sélection laissée à l'utilisateur */ }
    t.remove();
  };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
  else fallback();
}
