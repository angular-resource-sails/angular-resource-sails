(function(angular) {
    angular.module('sailsResource', [])
        .factory('sailsResource', ['$rootScope', '$window', function ($rootScope, $window) {

            var $resourceMinErr = angular.$$minErr('$resource');

            return function (options) {

                if((typeof options == 'string' && options.length == 0) || !options.model || options.model.length == 0) {
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
                function Resource(id, item) {
                    this.id = id; // required
                    this.$resolved = false;
                    if (item) {
                        angular.copy(item, this); // copy all properties if we're wrapping
                    }
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
                                var item = new Resource(responseItem.id, responseItem);
                                item.$resolved = true;
                                list.push(item); // update list
                            });
                        });
                    });
                    return list;
                };

                // Retrieve individual instance of model
                Resource.get = function (id) {

                    var item = itemCache[+id] || new Resource(+id); // empty item for now
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

                        if (!this.id) { // A new model, use POST
                            socket.post('/' + model, this, function(response) {
                                $rootScope.$apply(function () {
                                    angular.copy(response, self);
                                });
                            });
                        }
                        else { // An existing model, use PUT
                            socket.put('/' + model + '/' + this.id, this, function (response) {
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
                socket.on(model, function (message) {
                    if (message.verb == 'updated') {
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
                    }
                    else if (message.verb == 'created') {
                        itemCache[+message.id] = message.data;
                        angular.forEach(listCache, function(list, key) {
                            Resource.query(JSON.parse(key)); // retrieve queries again
                        });
                    }
                    else if (message.verb == 'destroyed') {
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
                    }
                });

                return Resource;
            };
        }]);

})(window.angular);