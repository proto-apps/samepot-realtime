/**
 * @fileoverview Server configurations.
 * @author yo_waka
 */

// Socket.IO configurations
var socketio = {
  host: 'localhost',
  port: 3333,
  transports: ['websocket', 'xhr-polling'],
  keys: {session: '_session_id'}
};

// Redis configurations
var redis = {
  session: {
    host: 'localhost',
    port: 6379,
    db: 6,
    namespace: '_samepot_sessions'
  },
  store: {
    host: 'localhost',
    port: 6379,
    db: 3
  },
  pubsub: {
    host: 'localhost',
    port: 6379,
    db: 0
  },
  channels: {activity: 'activity'}
};

// Rails app configuration
var app = {
  host: 'localhost',
  port: '3000'
};


// Expose
module.exports = {
  socketio: socketio,
  redis: redis,
  app: app
};
