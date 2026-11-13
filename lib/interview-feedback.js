export const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Malayalam', 'Bangla', 'Marathi'];
export const PRODUCTS = ['Global Visa', 'Holidays', 'GCC Visa', 'Ticketing', 'Auxiliary'];
export const RATINGS = [
  ['1', '1 — Needs improvement'],
  ['2', '2 — Fair'],
  ['3', '3 — Good'],
  ['4', '4 — Very good'],
  ['5', '5 — Excellent'],
];
export const JOB_NEEDINESS = ['High', 'Medium', 'Low'];

export function emptyEvaluation(proposedDesignation = '') {
  return {
    proposedDesignation,
    languageRatings: {},
    communicationFluency: '',
    productKnowledge: {},
    otherProducts: '',
    priorB2BExperience: '',
    yearsPriorExperience: '',
    jobNeediness: '',
    attitudePersonality: '',
  };
}

export function validateEvaluation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const isText = (input, max) => typeof input === 'string' && input.length <= max;
  const isRating = (input) => input === '' || RATINGS.some(([option]) => option === input);
  const hasRatings = (input, fields) => input && typeof input === 'object' && !Array.isArray(input) &&
    fields.every((field) => isRating(input[field] ?? ''));
  const years = value.yearsPriorExperience;

  if (!isText(value.proposedDesignation, 200) ||
      !hasRatings(value.languageRatings, LANGUAGES) ||
      !isRating(value.communicationFluency) ||
      !hasRatings(value.productKnowledge, PRODUCTS) ||
      !isText(value.otherProducts, 200) ||
      !['', 'yes', 'no'].includes(value.priorB2BExperience) ||
      !isText(years, 5) || (years !== '' && (!/^\d{1,2}(\.\d)?$/.test(years) || Number(years) > 60)) ||
      (!JOB_NEEDINESS.includes(value.jobNeediness) && value.jobNeediness !== '') ||
      !isText(value.attitudePersonality, 1500)) return null;

  return {
    proposedDesignation: value.proposedDesignation.trim(),
    languageRatings: Object.fromEntries(LANGUAGES.map((language) => [language, value.languageRatings[language] ?? ''])),
    communicationFluency: value.communicationFluency,
    productKnowledge: Object.fromEntries(PRODUCTS.map((product) => [product, value.productKnowledge[product] ?? ''])),
    otherProducts: value.otherProducts.trim(),
    priorB2BExperience: value.priorB2BExperience,
    yearsPriorExperience: years,
    jobNeediness: value.jobNeediness,
    attitudePersonality: value.attitudePersonality.trim(),
  };
}
