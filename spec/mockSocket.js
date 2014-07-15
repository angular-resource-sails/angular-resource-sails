angular.module('sailsResource').factory('mockSocket', function() {

    return {
        on: function(message, callback){

        },
        get: function(url, callback) {
            setTimeout(function() {
                if(url == '/widget') { // query
                    callback([{ id: 1 },{ id: 2 },{ id: 3 }]);
                }
                else { // get
                    callback({ id: 1 });
                }
            }, 250);
        },
        post: function(url, callback) {

        },
        put: function(url, data, callback) {
            setTimeout(function() {
                var updated = angular.copy(data, {});
                updated.lastUpdate = new Date();
                callback(updated);
            }, 250)
        },
        delete: function(url, callback) {

        }
    };
});