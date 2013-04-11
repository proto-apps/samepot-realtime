/**
 * Redis subscriber plugin.
 */


/**
 * Module dependencies.
 */

var cluster = require('cluster');
var redis = require('redis');
var util = require('util');
var config = require('./lib/config');
var logger = require('./lib/logger');


/**
 * @param {Bowl} bowl .
 */
exports.included = function(bowl) {
  var conf = config.redis;

  var subscriber = redis.createClient(conf.pubsub.port, conf.pubsub.host);
  subscriber.select(conf.pubsub.db);
  subscriber.subscribe(conf.channels.activity);
  subscriber.on('message', send.bind(bowl));
};


/**
 * @param {string} channel .
 * @param {string} message .
 */
function send(channel, message) {
  var workers = [];
  for (var id in cluster.workers) {
    workers.push(cluster.workers[id]);
  }
  var selectIndex = Math.floor(Math.random() * this.config_.forks);
  var worker = workers[selectIndex];

  logger.debug(
      util.format('Worker[%d] is recieved: %d', worker.id, worker.process.pid));

  // Multibyte character is invalid in process
  var encoded = (new Buffer(message)).toString('base64');
  worker.send({channel: channel, message: encoded});
};
