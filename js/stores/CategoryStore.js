var AppDispatcher = require('../dispatcher/AppDispatcher');
var EventEmitter = require('events').EventEmitter;
var CategoryConstants = require('../constants/CategoryConstants');
var utils = require('../helpers/Utils.js');
var merge = require('react/lib/merge');

var CHANGE_EVENT = 'change';

var _categories = {};
var _syncList = {};
var _length = 0;

function create(title, order) {
  var category = {
    id: utils.UUID(),
    title: title,
    order: order,
    system: false,
    orderby: {
      by: "title",
      type: "asc"
    },
    lastChange: Date.now(),
    lastSync: -1,
    lifecycle: "inited"
  };

  _categories[category.id] = category;
  _length++;

  return category.id;
}

function updateOrderby(id, by, type) {
  var orderby = {
    by: by,
    type: type
  }
  _categories[id].orderby = orderby;
}

function updateOrder(id, targetId) {
  var category = _categories[id],
      targetCategory = _categories[targetId];

  var tmp = category.order;
  category.order = targetCategory.order;
  targetCategory.order = tmp;
}

function destroy(id) {
  delete _categories[id];
  _length--;
}

var CategoryStore = merge(EventEmitter.prototype, {

  setCategories: function(categories) {
    _categories = categories;
  },

  getAll: function() {
    return _categories;
  },

  emitChange: function(id, action) {
    this.emit(CHANGE_EVENT);

    if (_syncList[id]) {
      if (_syncList[id].action === CategoryConstants.CATEGORY_CREATE) {
        if (action === CategoryConstants.CATEGORY_DESTROY) {
          delete _syncList[id];
        } else {
          return;
        }
      }
    } else {
      _syncList[id] = {
        action: action
      }
    }
  },

  /**
   * @param {function} callback
   */
  addChangeListener: function(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  /**
   * @param {function} callback
   */
  removeChangeListener: function(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  },

  sync: function() {
    for (var id in _syncList) {
      var action = _syncList[id].action;
      var category = _categories[id]

      switch(action) {
        case CategoryConstants.CATEGORY_CREATE:
          $.post( SERVER + "/categories/", category, function(data) {
            delete _syncList[id];
            console.log(data);
          });
          break;

        case CategoryConstants.CATEGORY_ORDERBY_UPDATE:
        case CategoryConstants.CATEGORY_ORDER_UPDATE:
          $.ajax({
            type: "PUT",
            url: SERVER + "/categories/" + id,
            data: category
          }).done(function( data ) {
            delete _syncList[id];
            console.log(data);
          });
          break;

        case CategoryConstants.CATEGORY_DESTROY:
          $.ajax({
            type: "DELETE",
            url: SERVER + "/categories/" + id
          }).done(function( data ) {
            delete _syncList[id];
            console.log(data);
          });
          break;

        default:
          return true;
      }
    }
  }

});

AppDispatcher.register(function(payload) {
  var action = payload.action;
  var title;

  switch(action.actionType) {
    case CategoryConstants.CATEGORY_CREATE:
      title = action.title.trim();
      if (title !== '') {
        action.id = create(title, action.order);
      }
      break;

    case CategoryConstants.CATEGORY_ORDERBY_UPDATE:
      updateOrderby(action.id, action.by, action.type);
      break;

    case CategoryConstants.CATEGORY_ORDER_UPDATE:
      updateOrder(action.id, action.targetId);
      // too hacky here.
      CategoryStore.emitChange(action.targetId, action.actionType);
      break;

    case CategoryConstants.CATEGORY_DESTROY:
      destroy(action.id);
      break;

    default:
      return true;
  }


  CategoryStore.emitChange(action.id, action.actionType);

  return true; // No errors.  Needed by promise in Dispatcher.
});


module.exports = CategoryStore;