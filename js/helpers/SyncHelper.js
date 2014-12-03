var CategoryStore = require('../stores/CategoryStore');
var ProgressStore = require('../stores/ProgressStore');


LOCAL_MODE = false;
SERVER = "http://localhost:3000"

var start = function() {
  CategoryStore.sync();
  ProgressStore.sync();
}

module.exports = {
  start: start
};


//setInterval(syncDaemon, 10000);