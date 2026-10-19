# OKU · boutique en ligne

Boutique de café de spécialité camerounais : catalogue, quiz « Trouver mon café », panier, commande avec
livraison à Douala, Yaoundé et Bafoussam, paiement Orange Money / MTN MoMo via **K-PAY**, liste prioritaire
du lot 001, hotline, pages légales.

- **Site** : HTML + CSS + JavaScript en modules natifs, sans framework ni étape de compilation.
- **Serveur** : Node.js (Express) pour les commandes, le paiement K-PAY, les webhooks et les e-mails.

## Démarrer

```bash
npm install
cp .env.example .env      # puis compléter le fichier
npm start                 # http://localhost:3000
npm test                  # tests des prix, de la validation et des signatures K-PAY
```

Node.js 20.12 ou plus récent est requis.

### Tester le paiement sans argent réel

```bash
# dans .env : décommenter le bloc « Tests en local avec le faux K-PAY »
npm run mock:kpay         # faux K-PAY sur http://localhost:4010
npm start                 # dans un second terminal
```

La page de paiement simulée propose « succès », « échec » et « annuler ». Elle renvoie vers le site
avec un retour signé et envoie le webhook signé, exactement comme K-PAY.

## Structure

```
public/                         site servi tel quel
├── index.html                  boutique (une page)
├── paiement.html               retour après paiement K-PAY
├── mentions-legales.html
├── confidentialite.html        politique de confidentialité
├── conditions-de-vente.html
├── 404.html, robots.txt, favicon.svg
├── .well-known/
│   └── kpay-verification.txt   vérification du domaine K-PAY
└── assets/
    ├── css/
    │   ├── main.css            entrée de la boutique (importe les modules ci-dessous)
    │   ├── pages.css           entrée des pages secondaires
    │   ├── fonts.css, tokens.css, base.css, checkout.css
    │   ├── components/         buttons, forms, header, footer, toast, countdown, product-card
    │   ├── sections/           hero, facts, quiz, origin, story, waitlist, hotline, faq
    │   └── pages/legal.css
    ├── js/
    │   ├── config.js           ← hotline, e-mail, date d'ouverture, mode démo
    │   ├── main.js             entrée de la boutique
    │   ├── data/catalog.js     ← produits et prix (partagé avec le serveur)
    │   ├── data/quiz.js        questions du quiz
    │   ├── lib/                validate (partagé avec le serveur), api, dom, format, storage, clipboard
    │   ├── modules/            cart, checkout, products, quiz, origin-map, countdown, hotline,
    │   │                       waitlist, forms, header, ticker, toast, reveal
    │   └── pages/              legal.js, payment.js
    ├── img/                    photos des produits (WebP)
    └── fonts/                  polices auto-hébergées (WOFF2)
server/
├── index.js                    démarrage
├── app.js                      routes et fichiers statiques
├── config.js                   lecture du .env
├── routes/                     orders, payments (retour + webhook), waitlist
├── lib/                        kpay, orders, store, mailer, notify, security
├── templates/emails.js         e-mails de confirmation
└── data/                       commandes et liste prioritaire (JSON, créés au premier lancement)
tools/mock-kpay.js              faux K-PAY pour les tests
tests/                          tests automatiques (node --test)
```

## À compléter avant la mise en ligne

1. **`public/assets/js/config.js`** : numéro et horaires de la hotline, e-mail du service client.
2. **`.env`** : `PUBLIC_URL`, clés K-PAY, SMTP pour les e-mails (facultatif).
3. **Pages légales** : chaque information à fournir est surlignée en doré et entre crochets
   (raison sociale, RCCM, NIU, siège, hébergeur, délais…). Pour les retrouver :
   `grep -n 'class="todo"' public/*.html`. Faites relire ces pages par un juriste.
4. **Prix et produits** : `public/assets/js/data/catalog.js`. Le café est à 15 000 FCFA le kilo ;
   le matériel est au prix d'achat + 40 % de marge, arrondi à 500 FCFA. Le prix d'achat n'est pas
   publié dans le code, car ce fichier est lisible par tous les visiteurs. Les frais de livraison
   par ville sont dans `DELIVERY.fee` (0 = livraison incluse).

## K-PAY

1. Créez une application dans le tableau de bord K-PAY et copiez la clé publique (`kpay_test_…` puis
   `kpay_live_…` après validation KYC) et la clé secrète dans `.env`.
2. Renseignez `KPAY_GATEWAY_SECRET` (signature du retour client) et `KPAY_WEBHOOK_SECRET`
   (signature des webhooks).
3. Dans les réglages de l'application K-PAY, indiquez l'URL de webhook :
   `https://votre-domaine.cm/api/kpay/webhook`.
4. Le fichier `public/.well-known/kpay-verification.txt` est servi à
   `https://votre-domaine.cm/.well-known/kpay-verification.txt` pour la vérification du domaine.

Une commande n'est marquée payée qu'après confirmation par K-PAY : webhook signé, ou interrogation
de `GET /api/v1/payments/:id` au retour du client. Le montant est toujours recalculé côté serveur
à partir du catalogue.

## Mise en ligne

Hébergez le dossier complet sur un service qui exécute Node.js (VPS, Render, Railway, hébergeur
cPanel avec Node…) :

```bash
npm install --omit=dev
NODE_ENV=production npm start
```

Placez le serveur derrière HTTPS (obligatoire pour le paiement) et gardez `TRUST_PROXY=1` derrière un
proxy. Sauvegardez régulièrement `server/data/`.

Pour un aperçu sans serveur (hébergement statique), passez `demo: true` dans `config.js` : les
commandes s'arrêtent alors à l'écran de confirmation, sans paiement.
