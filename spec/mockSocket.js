angular.module("sailsResource").factory("mockSocket", function() {

    return {
        on: function(message, callback){

        },
        get: function(url, callback) {
            setTimeout(function() {
                if(url == "/widget") { // query
                    callback([{ id: 1 },{ id: 2 },{ id: 3 }]);
                }
                else { // get
                    callback({ id: 1 });
                }
            }, 500);
        },
        post: function(url, callback) {

        },
        put: function(url, callback) {

        },
        delete: function(url, callback) {

        }
    };
});