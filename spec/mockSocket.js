angular.module('sailsResource').factory('mockSocket', function() {

    var widgets = [
        { id: 1, data: 'abc' },{ id: 2, data: 'def' },{ id: 3, data: 'hij' }
    ];

    return {
        on: function(message, callback){
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
            }, 250);
        },
        post: function(url, data, callback) {
            setTimeout(function() {
                var updated = angular.copy(data, {});
                widgets.push(updated);
                updated.id = widgets.length;
                updated.lastUpdate = new Date();
                callback(updated);
            }, 250)
        },
        put: function(url, data, callback) {
            setTimeout(function() {
                var updated = angular.copy(data, {});
                updated.id = widgets.length;
                updated.lastUpdate = new Date();
                callback(updated);
            }, 250)
        },
        delete: function(url, callback) {
            setTimeout(function() {
                var id = /\/[^\/]+\/(\d+)/.exec(url)[1];
                widgets.splice(id, 1);
                callback({});
            }, 250)
        },

        // testing functions, not on a real socket
        itemCount: function() {
            return widgets.length;
        }
    };
});