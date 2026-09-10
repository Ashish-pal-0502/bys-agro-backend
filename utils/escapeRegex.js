const escapeRegex = (str = "") =>
  String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = escapeRegex;
