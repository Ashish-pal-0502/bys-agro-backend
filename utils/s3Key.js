// Extracts the S3 object key from a full https://bucket.s3.region.amazonaws.com/path/to/file.jpg URL.
// Using the URL's pathname (not string-splitting on "/") so nested "folder" keys survive intact.
const s3KeyFromUrl = (url) => decodeURIComponent(new URL(url).pathname.replace(/^\/+/, ""));

module.exports = s3KeyFromUrl;
