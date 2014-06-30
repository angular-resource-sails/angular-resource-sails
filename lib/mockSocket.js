
(function() {
    window.io = {
        connect: function() {
            return {
                on: function(message, callback){

                },
                get: function(url, callback) {
                    if(url == "/widgets") { // query
                        callback([
                            {
                                id: 1
                            },
                            {
                                id: 2
                            },
                            {
                                id: 3
                            }
                        ])
                    }
                    else { // get
                        callback({
                            id: 1
                        });
                    }
                },
                post: function(url, callback) {

                },
                put: function(url, callback) {

                },
                delete: function(url, callback) {

                }
            };
        }
    };
})();