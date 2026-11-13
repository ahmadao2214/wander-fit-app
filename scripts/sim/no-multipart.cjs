// Preload for `expo start --tunnel` (see scripts/sim/README.md).
//
// Expo Go asks Metro for the JS bundle as a multipart progress stream. Metro sends that stream
// uncompressed (about 19 MB for this app) and ngrok relays it at about 145 KB/s. Dropping
// `multipart/mixed` from bundle requests makes Metro send a plain gzipped response (about 2.6 MB)
// instead. Expo Go loads it the same way; it just stops showing a download percentage.
const http = require('http')

const emit = http.Server.prototype.emit
http.Server.prototype.emit = function (event, req, ...rest) {
  if (event === 'request' && req && typeof req.url === 'string' && req.url.includes('.bundle')) {
    const accept = req.headers.accept
    if (typeof accept === 'string' && accept.includes('multipart/mixed')) {
      req.headers.accept = accept.replace(/multipart\/mixed\s*,?\s*/g, '').trim() || '*/*'
    }
  }
  return emit.call(this, event, req, ...rest)
}
