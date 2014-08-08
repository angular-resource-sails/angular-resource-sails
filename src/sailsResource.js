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

    /**
     * Test if an input is an integer.
     */
    function isInt(input) {
        return !isNaN(input) && parseInt(Number(input)) == input;
    }

    /**
     * Create a query-string out of a set of parameters.
     */
    function createQueryString(params) {
        var qs = [];
        if(params) {
            qs.push('?');
            forEach(params, function (value, key) {
                if(key == 'id') return;
                qs.push(key + '=' + value);
                qs.push('&');
            });
            qs.pop(); // remove last &
        }
        return qs.join('');
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
                    throw 'Model name is required';
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

                    function handleResponse(response, success, error, delegate) {
                        $rootScope.$apply(function() {
                            if (response.errors && isFunction(error)) {
                                error(response);
                            }
                            else {
                                if (isFunction(action.transformResponse)) response = action.transformResponse(response);
                                if (isFunction(delegate)) delegate(response);
                                if (isFunction(success)) success();
                            }
                        });
                    }

                    if (action.method == 'GET') {

                        // GET actions go on the service itself
                        Resource[name] = function (params, success, error) {

                            var url = '/' + model + (params && params.id ? '/' + params.id : '') + createQueryString(params),
                            // cache key is query-string for lists, id for items
                                key = action.isArray ? JSON.stringify(params || {}) : +params.id,
                            // pull out of cache if available, otherwise create new instance
                                item = action.isArray ? cache[key] || [] : cache[+params.id] || new Resource({ id: +params.id })

                            cache[key] = item; // store in cache

                            // TODO doing a get here no matter what, does that make sense?
                            socket.get(url, function (response) {
                                handleResponse(response, success, error, function (data) {
                                    if(action.isArray) { // empty the list and update with returned data
                                        while (item.length) item.pop();
                                        forEach(data, function (responseItem) {
                                            responseItem = new Resource(responseItem);
                                            responseItem.$resolved = true;
                                            item.push(responseItem); // update list
                                        });
                                    }
                                    else {
                                        copy(data, item); // update item
                                        item.$resolved = true;
                                    }
                                });
                            });
                            return item;
                        };
                    }
                    // Non-GET methods apply to instances of Resource and are added to the prototype with $ prefix
                    else if(action.method == 'POST' || action.method == 'PUT') {
                        // Update individual instance of model
                        Resource.prototype['$' + name ] = function(params, success, error) {
                            var self = this;

                            // prep data
                            var transformedData;
                            if(isFunction(action.transformRequest)) {
                                transformedData = JSON.parse(action.transformRequest(this));
                            }
                            var data = shallowClearAndCopy(transformedData || this, {}); // prevents prototype functions being sent

                            // when Resource has id use PUT, otherwise use POST
                            var url = this.id ? '/' + model + '/' + this.id : '/' + model;
                            var method = this.id ? 'put' : 'post';

                            socket[method](url, data, function(response) {
                                handleResponse(response, success, error, function(data) {
                                    copy(data, self);
                                });
                            });
                        };
                    }
                    else if(action.method == 'DELETE') {
                        // Delete individual instance of model
                        Resource.prototype['$' + name] = function(params, success, error) {
                            var url = '/' + model + '/' + this.id;
                            socket.delete(url, function (response) {
                                handleResponse(response, success, error);
                                // leaves local instance unmodified
                            });
                        };
                    }
                });

                // subscribe to changes
                socket.on(model, function (message) {
                    if(options.verbose) {
                        console.log('sailsResource received \'' + model + '\' message: ', message);
                    }

                    switch(message.verb) {
                        case 'updated':
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
                        case 'created':
                            cache[+message.id] = message.data;
                            // when a new item is created we have no way of knowing if it belongs in a cached list,
                            // this necessitates doing a server fetch on all known lists
                            // TODO does this make sense?
                            forEach(cache, function(cacheItem, key) {
                                if(!isInt(key)) { // a non id key
                                    Resource.query(JSON.parse(key)); // retrieve queries again
                                }
                            });
                            break;
                        case 'destroyed':
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