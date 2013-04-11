/**
 * @fileoverview Stream events.
 * @author yo_waka
 */

/**
 * @enum {string}
 */
var StreamEvents = {
  CONNECTION: 'connection',
  CONNECTED: 'connected',
  DISCONNECT: 'disconnect',
  ENTER: 'enter',
  ENTERED: 'entered',
  LEAVE: 'leave',
  LEFT: 'left',
  ACTIVITY: 'activity',
  ERROR: 'error'
};

//
module.exports = StreamEvents;
