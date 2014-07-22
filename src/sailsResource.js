(function(angular) {

    /**
     * Create a shallow copy of an object and clear other fields from the destination.
     * Taken from ngResource source.
     * https://code.angularjs.org/1.2.20/angular-resource.js
     */
    function shallowClearAndCopy(src, dst) {
        dst = dst || {};

        angular.forEach(dst, function(value, key){
            delete dst[key];
        });

        for (var key in src) {
            if (src.hasOwnProperty(key) && !(key.charAt(0) === '$' && key.charAt(1) === '$')) {
                dst[key] = src[key];
            }
        }

        return dst;
    }

    angular.module('sailsResource', [])
        .factory('sailsResource', ['$rootScope', '$window', function ($rootScope, $window) {

            var $resourceMinErr = angular.$$minErr('$resource');

            return function (options) {

                if((typeof options == 'string' && options.length == 0) ||
                    (typeof options != 'string' && !options.model && options.model.length == 0)) {
                    throw $resourceMinErr('badargs', 'Model name is required');
                }

                // Options
                var model;
                if (typeof options == 'string') {
                    model = options;
                }
                else if (typeof options == 'object' && options.model) {
                    model = options.model;
                }

                var origin = options.origin || $window.location.origin;
                var socket = options.socket || $window.io.connect(origin);
                var itemCache = {};
                var listCache = {};

                // Resource constructor
                function Resource(value) {
                    shallowClearAndCopy(value || {}, this)
                }

                // Retrieve list of models
                Resource.query = function (params) {

                    var key = JSON.stringify(params || {});
                    var list = listCache[key] || [];
                    listCache[key] = list;

                    // TODO doing a get here no matter what, does that make sense?
                    socket.get('/' + model, function (response) {
                        $rootScope.$apply(function () {
                            while(list.length) list.pop();
                            angular.forEach(response, function (responseItem) {
                                var item = new Resource(responseItem);
                                item.$resolved = true;
                                list.push(item); // update list
                            });
                        });
                    });
                    return list;
                };

                // Retrieve individual instance of model
                Resource.get = function (id) {

                    var item = itemCache[+id] || new Resource({ id: +id }); // empty item for now
                    itemCache[+id] = item;

                    // TODO doing a get here no matter what, does that make sense?
                    socket.get('/' + model + '/' + id, function (response) {
                        $rootScope.$apply(function () {
                            angular.copy(response, item); // update item
                            item.$resolved = true;
                        });
                    });
                    return item;
                };

                Resource.prototype = {

                    // Update individual instance of model
                    $save: function () {
                        var self = this;
                        var data = shallowClearAndCopy(this, {}); // prevents prototype functions being sent

                        if (!this.id) { // A new model, use POST
                            socket.post('/' + model, data, function(response) {
                                $rootScope.$apply(function () {
                                    angular.copy(response, self);
                                });
                            });
                        }
                        else { // An existing model, use PUT
                            socket.put('/' + model + '/' + this.id, data, function (response) {
                                $rootScope.$apply(function () {
                                    angular.copy(response, self);
                                });
                            });
                        }
                    },

                    // Delete individual instance of model
                    $delete: function () {
                        var self = this;
                        socket.delete('/' + model + '/' + this.id, function (response) {
                            $rootScope.$apply(function() {
                                angular.copy(response, self);
                            });
                        });
                    }
                };

                // subscribe to changes
                socket.on('message', function (message) {
                    if(message.model != model) return;

                    switch(message.verb) {
                        case 'update':
                            var cachedItem = itemCache[+message.id];
                            if (cachedItem) {
                                $rootScope.$apply(function () {
                                    angular.copy(message.data, cachedItem);
                                });
                            }

                            // update this item in all known lists
                            angular.forEach(listCache, function(list) {
                                angular.forEach(list, function(item) {
                                    if(+item.id == +message.id) {
                                        $rootScope.$apply(function() {
                                            angular.copy(message.data, item);
                                        });
                                    }
                                });
                            });
                            break;
                        case 'create':
                            itemCache[+message.id] = message.data;
                            angular.forEach(listCache, function(list, key) {
                                Resource.query(JSON.parse(key)); // retrieve queries again
                            });
                            break;
                        case 'destroy':

                            delete itemCache[+message.id];

                            // remove this item in all known lists
                            angular.forEach(listCache, function(list) {
                                var foundIndex = null;
                                angular.forEach(list, function(item, index) {
                                    if(+item.id == +message.id) {
                                        foundIndex = index;
                                    }
                                });
                                if(foundIndex) {
                                    list.splice(foundIndex, 1);
                                }
                            });
                            break;
                    }
                });

                return Resource;
            };
        }]);

})(window.angular);