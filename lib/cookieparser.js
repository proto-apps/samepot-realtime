/**
 * @fileoverview Simple cookie parser.
 * @author yo_waka
 */

/**
 * @param {Object} handShake .
 * @return {Object} .
 */
exports.parse = function(handShake) {
  var hash = {};
  var cookie = handShake.headers.cookie;
  if (cookie && cookie !== '') {
    // parse cookie
    var arr = handShake.headers.cookie.split('; ');
    arr.forEach(function(item) {
      var a = item.split('=');
      if (a.length > 1) {
        hash[a[0]] = a[1];
      }
    });
  }
  return hash;
};
