/** En-tête collant : bordure discrète dès que la page défile. */
export function initHeader() {
  const head = document.getElementById('top');
  if (!head) return;
  const update = () => head.classList.toggle('solid', scrollY > 10);
  addEventListener('scroll', update, { passive: true });
  update();
}
