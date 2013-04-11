/**
 * @fileoverview Samepot streaming server.
 * @author yo_waka
 */

/**
 * Required modules
 */
var socketIO = require('socket.io');
var redis = require('redis');
var http = require('http');
var util = require('util');

var RedisStore = require('./redisstore');
var logger = require('./logger');
var cookieParser = require('./cookieparser');
var StreamEvents = require('./streamevents');


/**
 * Exports the constructor.
 */

exports = module.exports = Server;


/**
 * @param {Object=} opt_config .
 * @constructor
 */
function Server(opt_config) {
  this.config_ = opt_config || require('./config');
};


/**
 * @type {Object}
 * @private
 */
Server.prototype.config_;


/**
 * @type {SocketIO}
 * @private
 */
Server.prototype.io_;


/**
 * @type {Redis}
 * @private
 */
Server.prototype.sessionClient_;


/**
 * start api.
 */
Server.prototype.start = function() {
  var config = this.config_;

  // output only errorlog in production
  var logLevel = (process.env.NODE_ENV === 'production') ? 1 : 3;
  this.io_ = socketIO.listen(config.socketio.port, {
    'log level': logLevel
  });

  this.sessionClient_ = redis.createClient(
      config.redis.session.port, config.redis.session.host);
  this.sessionClient_.select(config.redis.session.db);

  this.setup_();
};


/**
 * @private
 */
Server.prototype.setup_ = function() {
  this.setupIO_();
  this.setupIOHandlers_();
  this.setupProcessHandlers_();
};


/**
 * @private
 */
Server.prototype.setupIO_ = function() {
  var self = this;
  var io = self.io_;
  var config = self.config_;

  io.configure(function() {
    // performance up
    io.enable('browser client minification');
    io.enable('browser client etag');
    io.enable('browser client gzip');

    // enabled protocol
    io.set('transports', config.socketio.transports);

    // use redis store
    io.set('store', new RedisStore({
      redis: redis,
      redisPub: config.redis.store,
      redisSub: config.redis.store,
      redisClient: config.redis.store,
      db: config.redis.store.db
    }));

    // check authentication with app's login cookie.
    io.set('authorization', self.authorizeSession_.bind(self));
  });
};


/**
 * @param {Object} handshake .
 * @param {Function} callback .
 * @private
 */
Server.prototype.authorizeSession_ = function(handshake, callback) {
  var config = this.config_;

  // check to access from app host?
  var host = config.socketio.host;
  if (handshake.xdomain) {
    host += ':' + config.socketio.port;
  }
  if (host !== handshake.headers.host) {
    return callback('Do not allow access from other than app', false);
  }

  var cookie = cookieParser.parse(handshake);
  if (!cookie) {
    return callback('Cookie not found', false);
  }
  var sessionId = cookie[config.socketio.keys.session];
  if (!sessionId) {
    return callback('Login session not found', false);
  }
  if (config.redis.session.namespace) {
    sessionId = config.redis.session.namespace + ':' + sessionId;
  }

  this.sessionClient_.get(sessionId, function(err, value) {
    if (err) {
      logger.error('select: session client, failed');
      return callback(err, false);
    }
    // ok
    callback(null, true);
  });
};


/**
 * Set client socket event handlers.
 * @private
 */
Server.prototype.setupIOHandlers_ = function() {
  var self = this;

  this.io_.sockets.on(StreamEvents.CONNECTION, function(client) {
    client.emit(StreamEvents.CONNECTED);

    client.on(StreamEvents.ENTER, self.handleEnter_.bind(self, client));
    client.on(StreamEvents.LEAVE, self.handleLeave_.bind(self, client));
  });
};


/**
 * @param {SocketIO.Socket} client .
 * @param {Object} req .
 * @private
 */
Server.prototype.handleEnter_ = function(client, req) {
  var project = req.project || null;
  var user = req.user || null;

  if (project && user) {
    // send request at samepot application
    // whether user has project acl.
    var options = {
      host: this.config_.app.host,
      port: this.config_.app.port,
      path: util.format('/api/auth/%s/%s.json', project, user.id),
      method: 'GET',
      headers: {'content-type': 'application/json'}
    };

    http.get(options, function(res) {
      var data = '';
      res.on('data', function(chunk) {
        data += chunk;
      });
      res.on('end', function() {
        var authenticated = false;
        try {
          var json = JSON.parse(data);
          authenticated = json.result.check;
        } catch (e) {
          logger.error('Invalid json format');
        }
        if (authenticated) {
          client.set('project', project);
          client.set('user', user.name);
          client.join(project);
          client.emit(StreamEvents.ENTERED);

          logger.debug('Authenticated: ' + project + ', ' + user.name);
        } else {
          client.emit(StreamEvents.ERROR,
            new Error('No access capabitity for this group'));
        }
      });
    }).on('error', function(error) {
      logger.error("Enter failed: " + error.message);
      client.emit(StreamEvents.ERROR, new Error(error.message));
    });
  } else {
    logger.error("Enter failed: Invalid request parameters");
    client.emit(StreamEvents.ERROR, new Error('Invalid request parameters'));
  }
};


/**
 * Leave project room if entered.
 *
 * @param {SocketIO.Socket} client .
 * @private
 */
Server.prototype.handleLeave_ = function(client) {
  client.get('project', function(err, _project) {
    var project = _project;

    client.get('user', function(err, _user) {
      var user = _user;
      if (project && user) {
        client.leave(project);
        client.emit(StreamEvents.LEFT);

        logger.debug('Leaved: ' + project + ', ' + user);
      }
    });
  });
};


/**
 * @private
 */
Server.prototype.setupProcessHandlers_ = function() {
  var self = this;

  // Master's subscribe event
  process.on('message', function(arg) {
    if (!arg.channel || !arg.message) {
      return;
    }
    if (arg.channel == 'activity') {
      var decoded = (new Buffer(arg.message, 'base64')).toString();
      self.handleRecieved_(decoded);
    }
  });

  process.on('error', function(error) {
    self.stop();
    self.cleanup();

    //self.emit('error', new Error(error.message));
    new Error(error.message);
  });
};


/**
 * @param {string} message .
 * @private
 */
Server.prototype.handleRecieved_ = function(message) {
  var json = {};

  if (typeof message == 'string') {
    try {
      json = JSON.parse(message);
    } catch (e) {
      logger.error('Recieved invalid JSON format');
    }
  } else {
    json = message;
  }

  if (json.project) {
    var project = json.project.access_token;
    this.io_.sockets.to(project).emit(StreamEvents.ACTIVITY, message);

    logger.debug('Send to: ' + project);
  }
};


/**
 */
Server.prototype.stop = function() {
};


/**
 */
Server.prototype.cleanup = function() {
};


// Auto start
new Server().start();
