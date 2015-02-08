var _ = require('lodash');
var Flummox = {};

var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    _.extend(child, parent, staticProps);

    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;
    if (protoProps) _.extend(child.prototype, protoProps);
    child.__super__ = parent.prototype;
    return child;
}

/* Event emitting
 *
 *
 */
var Emitter = Flummox.Emitter = {
    allListeners: function() {
        if (!this.listeners) {
            this.listeners = [];
        }

        return this.listeners;
    },

    clearListeners: function() {
        while (this.listeners.length) {
            this.listeners.pop();
        }
    },

    getListeners: function(type) {
        return this.allListeners().filter(function(defn) {
            return defn.type === type;
        });
    },

    emit: function(type) {
        var args = _.toArray(arguments).slice(1);
        this.getListeners(type).forEach(function(defn) {
            defn.callback.apply(defn.context || defn.callback, args);
        });
    },

    on: function(type, callback, context) {
        this.allListeners().push({
            type: type,
            callback: callback,
            context: context
        });
    },

    once: function(type, callback, context) {
        var self = this;

        var wrap = function wrap() {
            callback.apply(this, arguments);
            self.off(type, wrap);
        };

        this.on(type, wrap, context);
    },

    off: function(type, callback) {
        var listeners = this.allListeners();
        var i = listeners.length;

        if (!type) {
            this.clearListeners();
            return;
        }

        while (i--) {
            var defn = listeners[i];

            if (defn.type !== type) {
                continue;
            }

            if (!callback || defn.callback === callback) {
                listeners.splice(i, 1);
            }
        }
    }
}

/*
 * Collection
 *
 */

var Store = Flummox.Store = function(options) {
    this.options = options;
    this.data = [];
    this.initialize.apply(this, arguments);
}

_.extend(Store.prototype, Emitter, {
    initialize: function(){
        this.on('refresh', this.sync.bind(this));
    },

    url: function(){
        return _.result(this.options, 'url') || '';
    },

    sync: function(options) {
        return new Promise(function(fulfill, reject) {
            if(this.url == null) {
                return fulfill();
            }

            var request = new XMLHttpRequest();
            request.open('GET', this.url, true);
            request.onload = function() {
                if(request.status >= 200 && request.status < 400) {
                    var data = JSON.parse(request.responseText);
                    this.data = data;
                    this.emit('reload', data);
                    fulfill();
                    this.postSync();
                } else {
                    // We reached our target server, but it returned an error
                }
            }.bind(this);

            request.onerror = function() {
                // There was a connection error of some sort
            }.bind(this);

            request.send();

        }.bind(this));
    },

    postSync: function() {
    }
});

var Dispatcher = Flummox.Dispatcher = function() {
    this.callbacks = [];
};

Dispatcher.prototype = {
    getCallbacks: function(action) {
        var callbacks = this.callbacks.filter(function(d) {
            return d.callback != null;
        }).map(function(defn) {
            return defn.callback;
        });
        return callbacks;
    },

    dispatch: function(action) {
        var args = _.toArray(arguments).slice(1);
        return Promise.all(
            this.getCallbacks(action).map(function(callback) {
                return callback({actionType: action,
                                   callback: callback,
                                       args: args});
            })
        );
    },

    register: function(callback) {
        this.callbacks.push({
            callback: callback
        });
    }
};


Emitter.extend = Store.extend = Dispatcher.extend = extend;

module.exports = Flummox;


