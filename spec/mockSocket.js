angular.module('sailsResource').factory('mockSocket', function() {

    var widgets = [
        { id: 1 },{ id: 2 },{ id: 3 },{ id: 4 },{ id: 5 }
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
                    callback(widgets[0]);
                }
            }, 250);
        },
        post: function(url, data, callback) {
            setTimeout(function() {
                var updated = angular.copy(data, {});
                updated.id = 5;
                updated.lastUpdate = new Date();
                callback(updated);
            }, 250)
        },
        put: function(url, data, callback) {
            setTimeout(function() {
                var updated = angular.copy(data, {});
                updated.id = widgets.length;
                updated.lastUpdate = new Date();
                widgets.push(updated);
                callback(updated);
            }, 250)
        },
        delete: function(url, callback) {

        },

        // testing functions, not on a real socket
        itemCount: function() {
            return widgets.length;
        }
    };
});