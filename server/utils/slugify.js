const normalize = value =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const slugify = (value, fallback = 'club') => {
  const base = normalize(value);
  return base.length > 0 ? base : normalize(fallback) || 'club';
};

module.exports = { slugify };
