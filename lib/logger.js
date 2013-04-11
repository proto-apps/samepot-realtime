/**
 * @fileoverview Logger with winston.
 * @author yo_waka
 */

/**
 * Required modules.
 */
var winston = require('winston');

/**
 * Constants
 */
var Config = {
  FILE: './logs/samepot-ws.log',
  EXCEPTION_FILE: './logs/samepot-ws-exception.log',
  MAXSIZE: 104857600
};

//
module.exports = (function() {

  var instance = null;

  function initialize(logLevel) {
    var logger = new (winston.Logger)({
      transports: [
        new winston.transports.Console({
          level: logLevel,
          colorize: true,
          timestamp: true
        }),
        new winston.transports.File({
          level: logLevel,
          filename: Config.FILE,
          timestamp: true,
          json: false,
          maxsize: Config.MAXSIZE,
          maxFiles: 3
        })
      ],
      exitOnError: false,
      exceptionHandlers: [
        new winston.transports.File({
          filename: Config.EXCEPTION_FILE,
          timestamp: true,
          json: false,
          maxsize: Config.MAXSIZE,
          maxFiles: 3
        })
      ]
    });
    logger.setLevels(winston.config.syslog.levels);

    // If production env, remove console logger
    if (process.env.NODE_ENV === 'production') {
      logger.remove(winston.transports.Console);
    }

    return logger;
  }

  function getInstance() {
    if (!instance) {
      var level = (process.env.NODE_ENV === 'production') ? 'warning' : 'debug';
      instance = initialize(level);
    }
    return instance;
  }

  return {
    debug: function(message) {
      getInstance().debug(message);
    },
    info: function(message) {
      getInstance().info(message);
    },
    notice: function(message) {
      getInstance().notice(message);
    },
    warn: function(message) {
      getInstance().warning(message);
    },
    error: function(message) {
      getInstance().error(message);
    }
  };
})();
