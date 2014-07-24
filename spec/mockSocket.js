angular.module('sailsResource').factory('mockSocket', function() {

    var widgets = [
        { id: 1, data: 'abc' },{ id: 2, data: 'def' },{ id: 3, data: 'hij', unique: '4aa' }
    ];
    var queue = [];
    var subscribers = [];

    function getWidget(id) {
        var found;
        angular.forEach(widgets, function(widget) {
            if(widget.id == id) found = widget;
        });
        return found;
    }
    function findUnique(value) {
        if(!value) return;

        var found;
        angular.forEach(widgets, function(widget) {
            if(widget.unique == value) found = widget;
        });
        return found;
    }

    return {
        on: function(message, callback){
            subscribers.push(callback);
        },
        get: function(url, callback) {
            queue.push(function() {
                if(url.indexOf('/widget/') == -1) { // query
                    callback(angular.copy(widgets, []));
                }
                else { // get
                    var id = /\/[^\/]+\/(\d+)/.exec(url)[1];
                    var widget = getWidget(id);
                    if(!widget) {
                        callback({ status: 404, errors: ['Widget with id ' + id + ' could not be found']});
                    }
                    else {
                        callback(angular.copy(getWidget(id), {}));
                    }
                }
            });
        },
        post: function(url, data, callback) {

            var unique = findUnique(data.unique);
            if(!unique) {
                var updated = angular.copy(data, {});
                updated.id = widgets.length+1;
                updated.lastUpdate = new Date();
            }

            queue.push(function() {

                if(unique) {
                    callback({ status: 409, errors: ['Widget with unique ' + data.unique + ' already exists']});
                }
                else {
                    widgets.push(updated);
                    callback(updated);

                    var message = { model: 'widget', verb: 'create', id: updated.id, data: updated };
                    angular.forEach(subscribers, function(sub) {
                        sub(message);
                    });
                }
            });
        },
        put: function(url, data, callback) {
            var updated = angular.copy(data, {});
            updated.lastUpdate = new Date();

            queue.push(function() {
                var widget = getWidget(updated.id);
                if(!widget) {
                    callback({ status: 404, errors: ['Widget with id ' + updated.id + ' could not be found']});
                }
                else {
                    angular.copy(updated, widget);
                    callback(updated);

                    var message = { model: 'widget', verb: 'update', id: updated.id, data: updated };
                    angular.forEach(subscribers, function (sub) {
                        sub(message);
                    });
                }
            });
        },
        delete: function(url, callback) {
            var id = /\/[^\/]+\/(\d+)/.exec(url)[1];

            queue.push(function() {

                var foundIndex = null;
                angular.forEach(widgets, function(widget, index) {
                    if(widget.id == +id) {
                        foundIndex = index;
                    }
                });

                if(foundIndex == null) {
                    callback({ status: 404, errors: ['Widget with id ' + id + ' could not be found']});
                }
                else {
                    widgets.splice(foundIndex, 1);
                    callback({});
                    var message = { model: 'widget', verb: 'destroy', id: id };
                    angular.forEach(subscribers, function(sub) {
                        sub(message);
                    });
                }
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
        items: function() {
            return widgets;
        },
        itemCount: function() {
            return widgets.length;
        }
    };
});