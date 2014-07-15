angular.module('sailsResource').factory('mockSocket', function() {

    var widgets = [
        { id: 1, data: 'abc' },{ id: 2, data: 'def' },{ id: 3, data: 'hij' }
    ];
    var subscribers = {};

    return {
        on: function(model, callback){
            if(!subscribers[model]) subscribers[model] = [];
            subscribers[model].push(callback);
        },
        get: function(url, callback) {
            setTimeout(function() {
                if(url == '/widget') { // query
                    callback(widgets);
                }
                else { // get
                    var id = /\/[^\/]+\/(\d+)/.exec(url)[1];
                    callback(widgets[id-1]);
                }
            }, 100);
        },
        post: function(url, data, callback) {
            var updated = angular.copy(data, {});
            updated.id = widgets.length+1;
            updated.lastUpdate = new Date();

            setTimeout(function() {
                widgets.push(updated);
                callback(updated);

                var message = { verb: 'created', id: updated.id, data: updated };
                angular.forEach(subscribers['widget'], function(sub) {
                    sub(message);
                });

            }, 100)
        },
        put: function(url, data, callback) {
            var updated = angular.copy(data, {});
            updated.lastUpdate = new Date();

            setTimeout(function() {
                widgets[updated.id-1] = updated;
                callback(updated);

                var message = { verb: 'updated', id: updated.id, data: updated };
                angular.forEach(subscribers['widget'], function(sub) {
                    sub(message);
                });

            }, 100)
        },
        delete: function(url, callback) {
            var id = /\/[^\/]+\/(\d+)/.exec(url)[1];

            setTimeout(function() {
                widgets.splice(id, 1);
                callback({});

                var message = { verb: 'destroyed', id: id };
                angular.forEach(subscribers['widget'], function(sub) {
                    sub(message);
                });
            }, 100)
        },

        // testing functions, not on a real socket
        itemCount: function() {
            return widgets.length;
        }
    };
});