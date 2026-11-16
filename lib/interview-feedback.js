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
export const FORM_QUESTION_TYPES = ['short_text', 'long_text', 'rating', 'dropdown', 'yes_no'];

export function normalizeFeedbackQuestions(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 40) return null;
  const keys = new Set();
  const questions = [];

  for (const question of value) {
    if (!question || typeof question !== 'object' || Array.isArray(question)) return null;
    const id = typeof question.id === 'string' ? question.id.trim() : '';
    const label = typeof question.label === 'string' ? question.label.trim() : '';
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || keys.has(id) || label.length < 1 || label.length > 160) return null;
    if (!FORM_QUESTION_TYPES.includes(question.type) || typeof question.required !== 'boolean') return null;
    keys.add(id);

    const normalized = { id, label, type: question.type, required: question.required };
    if (question.type === 'dropdown') {
      if (!Array.isArray(question.options) || question.options.length < 1 || question.options.length > 20) return null;
      const options = question.options.map((option) => typeof option === 'string' ? option.trim() : '');
      if (options.some((option) => !option || option.length > 100) || new Set(options).size !== options.length) return null;
      normalized.options = options;
    }
    questions.push(normalized);
  }

  return questions;
}

export function validateCustomEvaluation(value, questions) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(questions)) return null;
  const questionIds = new Set(questions.map((question) => question.id));
  if (Object.keys(value).some((key) => !questionIds.has(key))) return null;

  const answers = {};
  for (const question of questions) {
    const answer = value[question.id] ?? '';
    if (typeof answer !== 'string' || answer.length > 2000) return null;
    const trimmed = answer.trim();
    if (question.required && !trimmed) return null;

    if (trimmed) {
      if (question.type === 'rating' && !['1', '2', '3', '4', '5'].includes(trimmed)) return null;
      if (question.type === 'yes_no' && !['yes', 'no'].includes(trimmed)) return null;
      if (question.type === 'dropdown' && !question.options.includes(trimmed)) return null;
    }
    answers[question.id] = trimmed;
  }
  return answers;
}

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
  const isRating = (input) => input === 'none' || RATINGS.some(([option]) => option === input);
  const hasRatings = (input, fields) => input && typeof input === 'object' && !Array.isArray(input) &&
    fields.every((field) => isRating(input[field] ?? ''));
  const years = value.yearsPriorExperience;

  if (!isText(value.proposedDesignation, 200) || !value.proposedDesignation.trim() ||
      !hasRatings(value.languageRatings, LANGUAGES) ||
      !isRating(value.communicationFluency) ||
      !hasRatings(value.productKnowledge, PRODUCTS) ||
      !isText(value.otherProducts, 200) || !value.otherProducts.trim() ||
      !['none', 'yes', 'no'].includes(value.priorB2BExperience) ||
      !isText(years, 5) || !/^\d{1,2}(\.\d)?$/.test(years) || Number(years) > 60 ||
      (!JOB_NEEDINESS.includes(value.jobNeediness) && value.jobNeediness !== 'none') ||
      !isText(value.attitudePersonality, 1500) || !value.attitudePersonality.trim()) return null;

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
