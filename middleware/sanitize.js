// Strips Mongo operator keys ($ne, $gt, ...) and dotted keys from user input
// so req.body/req.query/req.params objects can't be used to inject query operators.
// Written by hand instead of using express-mongo-sanitize: that package reassigns
// req.query wholesale, which throws on Express 5 (req.query is a read-only getter there).

const isPlainObject = (val) =>
  Object.prototype.toString.call(val) === "[object Object]";

const sanitizeInPlace = (obj) => {
  if (Array.isArray(obj)) {
    obj.forEach(sanitizeInPlace);
    return obj;
  }
  if (!isPlainObject(obj)) return obj;

  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
      continue;
    }
    sanitizeInPlace(obj[key]);
  }
  return obj;
};

const sanitizeRequest = (req, res, next) => {
  sanitizeInPlace(req.body);
  sanitizeInPlace(req.params);
  // req.query is a getter in Express 5; mutate its own keys instead of reassigning it.
  sanitizeInPlace(req.query);
  next();
};

module.exports = sanitizeRequest;
