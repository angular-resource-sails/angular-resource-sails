angular.module('sailsResource').factory('mockSocket', function() {

    var widgets = [
        { id: 1, data: 'abc' },{ id: 2, data: 'def' },{ id: 3, data: 'hij' }
    ];
    var queue = [];
    var subscribers = {};

    return {
        on: function(model, callback){
            if(!subscribers[model]) subscribers[model] = [];
            subscribers[model].push(callback);
        },
        get: function(url, callback) {
            queue.push(function() {
                if(url == '/widget') { // query
                    callback(angular.copy(widgets, []));
                }
                else { // get
                    var id = /\/[^\/]+\/(\d+)/.exec(url)[1];
                    callback(angular.copy(widgets[id-1], {}));
                }
            });
        },
        post: function(url, data, callback) {
            var updated = angular.copy(data, {});
            updated.id = widgets.length+1;
            updated.lastUpdate = new Date();

            queue.push(function() {
                widgets.push(updated);
                callback(updated);

                var message = { verb: 'created', id: updated.id, data: updated };
                angular.forEach(subscribers['widget'], function(sub) {
                    sub(message);
                });

            });
        },
        put: function(url, data, callback) {
            var updated = angular.copy(data, {});
            updated.lastUpdate = new Date();

            queue.push(function() {
                widgets[updated.id-1] = updated;
                callback(updated);

                var message = { verb: 'updated', id: updated.id, data: updated };
                angular.forEach(subscribers['widget'], function(sub) {
                    sub(message);
                });

            });
        },
        delete: function(url, callback) {
            var id = /\/[^\/]+\/(\d+)/.exec(url)[1];

            queue.push(function() {
                widgets.splice(id, 1);
                callback({});

                var message = { verb: 'destroyed', id: id };
                angular.forEach(subscribers['widget'], function(sub) {
                    sub(message);
                });
            });
        },

        // testing functions, not on a real socket
        flush: function() {
            while(queue.length) {
                queue.pop()(); // pop and execute
            }
        },
        queueCount: function() {
            return queue.length;
        },
        itemCount: function() {
            return widgets.length;
        }
    };
});