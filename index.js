/**
 * Endpoint script.
 * @author yo_waka
 */

var Bowl = require('bowl');

var bowl = new Bowl({
  exec: './lib/server.js',
  forks: require('os').cpus().length,
  watch: [],
  plugins: ['subscribe.js'],
  pidfile: "./bowl.pid",
  logdir: "logs"
});

bowl.run(function(err) {});
