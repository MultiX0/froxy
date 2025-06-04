const crypto = require('crypto');


// Generate UUID from URL
function generateUUIDFromURL(url) {
  const hash = crypto.createHash('sha256').update(url).digest();
  
  // Format as UUID v4 (8-4-4-4-12 format)
  return [
    hash.subarray(0, 4).toString('hex'),
    hash.subarray(4, 6).toString('hex'),
    hash.subarray(6, 8).toString('hex'),
    hash.subarray(8, 10).toString('hex'),
    hash.subarray(10, 16).toString('hex')
  ].join('-');
}

module.exports = {
  generateUUIDFromURL,
}