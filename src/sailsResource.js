(function(angular) {

    var $resourceMinErr = angular.$$minErr('$resource');

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

    /**
     * Test if an input is an integer.
     */
    function isInt(input) {
        return !isNaN(input) && parseInt(Number(input)) == input;
    }

    var forEach = angular.forEach,
        extend = angular.extend,
        copy = angular.copy,
        isFunction = angular.isFunction;

    angular.module('sailsResource', [])
        .factory('sailsResource', ['$rootScope', '$window', function ($rootScope, $window) {

            var DEFAULT_ACTIONS = {
                'get':    {method:'GET'},
                'save':   {method:'POST'},
                'query':  {method:'GET', isArray:true},
                'remove': {method:'DELETE'},
                'delete': {method:'DELETE'}
            };

            return function (model, actions, options) {

                if(typeof model != 'string' || model.length == 0) {
                    throw $resourceMinErr('badargs', 'Model name is required');
                }

                actions = extend({}, DEFAULT_ACTIONS, actions);

                var origin, socket;
                if(typeof options == 'object') {
                    origin = options.origin || $window.location.origin;
                    socket = options.socket || $window.io.connect(origin);
                }
                else {
                    origin = $window.location.origin;
                    socket = $window.io.connect(origin);
                }
                var cache = {};

                // Resource constructor
                function Resource(value) {
                    shallowClearAndCopy(value || {}, this)
                }

                forEach(actions, function(action, name) {
                    if(action.method == 'GET') {
                        if (action.isArray) {
                            // Retrieve list of models
                            Resource[name] = function (params) {
                                var key = JSON.stringify(params || {});
                                var list = cache[key] || [];
                                cache[key] = list;

                                // TODO doing a get here no matter what, does that make sense?
                                socket.get('/' + model, function (response) {
                                    $rootScope.$apply(function () {
                                        while (list.length) list.pop();
                                        forEach(response, function (responseItem) {
                                            var item = new Resource(responseItem);
                                            item.$resolved = true;
                                            list.push(item); // update list
                                        });
                                    });
                                });
                                return list;
                            };
                        }
                        else {
                            // Retrieve individual instance of model
                            Resource[name] = function (params, success, error) {
                                var item = cache[+params.id] || new Resource({ id: +params.id }); // empty item for now
                                cache[+params.id] = item;

                                // TODO doing a get here no matter what, does that make sense?
                                socket.get('/' + model + '/' + params.id, function (response) {
                                    if(response.errors && isFunction(error)) {
                                        error(response);
                                    }
                                    else {
                                        $rootScope.$apply(function () {
                                            copy(response, item); // update item
                                            item.$resolved = true;
                                        });
                                        if(isFunction(success)) {
                                            success(response);
                                        }
                                    }
                                });
                                return item;
                            };
                        }
                    }
                    // Non-GET methods apply to instances of Resource and are added to the prototype with $ prefix
                    else if(action.method == 'POST' || action.method == 'PUT') {
                        // Update individual instance of model
                        Resource.prototype['$' + name ] = function(params, success, error) {
                            var self = this;
                            var data = shallowClearAndCopy(this, {}); // prevents prototype functions being sent

                            // when Resource has id use PUT, otherwise use POST
                            var url = this.id ? '/' + model + '/' + this.id : '/' + model;
                            var method = this.id ? 'put' : 'post';

                            socket[method](url, data, function(response) {
                                if(response.errors && isFunction(error)) {
                                    error(response);
                                }
                                else {
                                    $rootScope.$apply(function () {
                                        copy(response, self);
                                    });
                                    if(isFunction(success)) {
                                        success(response);
                                    }
                                }
                            });
                        };
                    }
                    else if(action.method == 'DELETE') {
                        // Delete individual instance of model
                        Resource.prototype['$' + name] = function(params, success, error) {
                            var self = this;
                            socket.delete('/' + model + '/' + this.id, function (response) {
                                if(response.errors && isFunction(error)) {
                                    error(response);
                                }
                                else if(isFunction(success)) {
                                    success(response)
                                }
                                // leave local instance unmodified
                            });
                        };
                    }
                });

                // subscribe to changes
                socket.on('message', function (message) {
                    if(message.model != model) return;

                    switch(message.verb) {
                        case 'update':
                            // update this item in all known lists
                            forEach(cache, function(cacheItem, key) {
                                if(isInt(key) && key == +message.id) { // an id key
                                    $rootScope.$apply(function () {
                                        copy(message.data, cacheItem);
                                    });
                                }
                                else {
                                    forEach(cacheItem, function(item) {
                                        if(item.id == +message.id) {
                                            $rootScope.$apply(function() {
                                                copy(message.data, item);
                                            });
                                        }
                                    });
                                }
                            });
                            break;
                        case 'create':
                            cache[+message.id] = message.data;
                            forEach(cache, function(cacheItem, key) {
                                if(!isInt(key)) { // a non id key
                                    Resource.query(JSON.parse(key)); // retrieve queries again
                                }
                            });
                            break;
                        case 'destroy':
                            delete cache[+message.id];
                            // remove this item in all known lists
                            forEach(cache, function(cacheItem, key) {
                                if(!isInt(key)) {
                                    var foundIndex = null;
                                    forEach(cacheItem, function(item, index) {
                                        if(item.id == +message.id) {
                                            foundIndex = index;
                                        }
                                    });
                                    if(foundIndex != null) {
                                        cacheItem.splice(foundIndex, 1);
                                    }
                                }
                            });
                            break;
                    }
                });

                return Resource;
            };
        }]);
})(window.angular);