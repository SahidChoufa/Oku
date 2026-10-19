/** Questions du quiz « Trouver mon café » et textes de résultat. */

export const QUESTIONS = [
  {
    q: 'À quelle heure commence ta journée ?',
    options: [
      { label: 'Avant 5 h', score: { insomnie: 2 } },
      { label: 'Entre 5 h et 7 h', score: { sommet: 1, insomnie: 1 } },
      { label: 'Après 7 h', score: { manengouba: 2 } },
    ],
  },
  {
    q: 'Tu le bois comment ?',
    options: [
      { label: 'Espresso, serré', score: { insomnie: 2, sommet: 1 } },
      { label: 'Avec du lait', score: { sommet: 3 } },
      { label: 'Noir, en filtre ou à la presse', score: { manengouba: 3 } },
    ],
  },
  {
    q: 'Tu te reconnais où ?',
    options: [
      { label: 'Sport', score: { sommet: 1, insomnie: 1 }, profile: 'sport' },
      { label: 'Études, concours', score: { insomnie: 2 }, profile: 'etudes' },
      { label: 'Bureau, réunions', score: { sommet: 2 }, profile: 'bureau' },
      { label: 'Un peu tout ça', score: { insomnie: 1, sommet: 1, manengouba: 1 }, profile: 'tout' },
    ],
  },
];

export const WHY = {
  sommet: 'Assez de corps pour tenir face au lait, assez rond pour la troisième tasse de la matinée.',
  insomnie: 'Le plus chargé en caféine de la gamme. Pour les révisions de nuit et les réveils à 4 h 45. À boire avant 16 h.',
  manengouba: 'Un arabica lavé et fruité, à boire noir. Pour ceux qui prennent quatre minutes pour la presse.',
};

export const PROFILE_TIP = {
  sport: "Pour le sport : un espresso avant la séance, un grand verre d'eau après.",
  etudes: "Pour les révisions : un thermos rempli à 21 h tient jusqu'à minuit.",
  bureau: 'Pour le bureau : le format 1 kg se partage bien en réunion, au même prix au kilo.',
  tout: 'Pour les journées à rallonge : prends le kilo, tu tiendras plus longtemps.',
};
