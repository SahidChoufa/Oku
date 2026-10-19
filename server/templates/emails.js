/** Modèles d'e-mails (texte + HTML simple). */

const NB = ' ';
const fcfa = (n) => Math.round(n).toLocaleString('fr-FR').replace(/[  \s]/g, NB) + NB + 'FCFA';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function lines(order) {
  return order.lines.map((l) => `${l.qty} × ${l.name}${l.grind ? ` · ${l.grind}` : ''} : ${fcfa(l.total)}`);
}

function htmlWrap(title, paragraphs, order) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f4ede2;font-family:Arial,Helvetica,sans-serif;color:#1a130e">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px">
    <p style="font-family:Georgia,serif;font-size:26px;letter-spacing:6px;margin:0 0 18px">OKU</p>
    <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 14px">${esc(title)}</h1>
    ${paragraphs.map((p) => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px">${p}</p>`).join('')}
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
      ${order.lines.map((l) => `<tr><td style="padding:6px 0;border-bottom:1px solid #e0d6c6">${l.qty} × ${esc(l.name)}${l.grind ? ` · ${esc(l.grind)}` : ''}</td><td style="padding:6px 0;border-bottom:1px solid #e0d6c6;text-align:right">${fcfa(l.total)}</td></tr>`).join('')}
      <tr><td style="padding:8px 0;font-weight:bold">Total</td><td style="padding:8px 0;text-align:right;font-weight:bold">${fcfa(order.total)}</td></tr>
    </table>
    <p style="font-size:13px;color:#6b5a49;margin:0">Livraison : ${esc(order.delivery.district)}, ${esc(order.delivery.city)}<br>${esc(order.delivery.address)}</p>
  </div></body></html>`;
}

export function customerEmail(order, kind) {
  const first = order.customer.name.split(' ')[0];
  if (kind === 'paid') {
    const subject = `Paiement reçu · commande ${order.ref}`;
    const intro = [`Merci ${first}, ton paiement de ${fcfa(order.total)} est confirmé.`, `Ta commande ${order.ref} part en préparation. Le livreur t'appellera au ${order.customer.phone} avant de passer.`];
    return { subject, text: [...intro, '', ...lines(order)].join('\n'), html: htmlWrap('Paiement confirmé', intro.map(esc), order) };
  }
  const subject = `Commande ${order.ref} enregistrée`;
  const intro = [`Merci ${first}, ta commande ${order.ref} est enregistrée.`, `Tu paieras ${fcfa(order.total)} en espèces au livreur. Il t'appellera au ${order.customer.phone} avant de passer.`];
  return { subject, text: [...intro, '', ...lines(order)].join('\n'), html: htmlWrap('Commande enregistrée', intro.map(esc), order) };
}

export function shopEmail(order, kind) {
  const subject = `${kind === 'paid' ? 'Payée' : 'À la livraison'} · ${order.ref} · ${fcfa(order.total)}`;
  const text = [
    `Commande ${order.ref} (${kind === 'paid' ? 'payée avec K-PAY' : 'paiement à la livraison'})`,
    `${order.customer.name} · ${order.customer.phone} · ${order.customer.email}`,
    `${order.delivery.district}, ${order.delivery.city} · ${order.delivery.address}`,
    order.delivery.notes ? `Instructions : ${order.delivery.notes}` : '',
    '',
    ...lines(order),
    `Total : ${fcfa(order.total)}`,
  ].filter((l) => l !== null).join('\n');
  return { subject, text };
}
