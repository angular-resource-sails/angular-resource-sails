(function (angular) {

var forEach = angular.forEach,
	extend = angular.extend,
	copy = angular.copy,
	isArray = angular.isArray,
	isFunction = angular.isFunction;

angular.module('sailsResource', []).factory('sailsResource', ['$rootScope', '$window', '$log', resourceFactory]);

function resourceFactory($rootScope, $window, $log) {

	var DEFAULT_ACTIONS = {
		'get': {method: 'GET'},
		'save': {method: 'POST'},
		'query': {method: 'GET', isArray: true},
		'remove': {method: 'DELETE'},
		'delete': {method: 'DELETE'}
	};

	return function (model, actions, options) {

		if (typeof model != 'string' || model.length == 0) {
			throw 'Model name is required';
		}

		model = model.toLowerCase(); // sails always sends models lowercase
		actions = extend({}, DEFAULT_ACTIONS, actions);

		var origin, socket;
		if (typeof options == 'object') {
			origin = options.origin || $window.location.origin;
			socket = options.socket || $window.io.connect(origin);
		}
		else {
			options = {};
			origin = $window.location.origin;
			socket = $window.io.connect(origin);
		}
		var cache = {};

		// Resource constructor
		function Resource(value) {
			shallowClearAndCopy(value || {}, this);
		}

		function handleRequest(item, action, params, success, error) {

			if (isFunction(params)) {
				error = success;
				success = params;
				params = {};
			}

			if (action.method == 'GET') {
				var key = action.isArray ? JSON.stringify(params || {}) : +params.id; // cache key is query-string for lists, id for items
				item = action.isArray ? cache[key] || [] : cache[+params.id] || new Resource({ id: +params.id }); // pull out of cache if available, otherwise create new instance

				if (item.$resolved) {
					return item; // resolved item was found, return without doing a call to server, note: this will always refetch for arrays
				}

				cache[key] = item; // store blank item in cache
				return retrieveResource(item, action, params, success, error);
			}
			else if (action.method == 'POST' || action.method == 'PUT') { // Update individual instance of model
				createOrUpdateResource(item, action, params, success, error, action);
			}
			else if (action.method == 'DELETE') { // Delete individual instance of model
				deleteResource(item, action, params, success, error, action);
			}
		}

		function handleResponse(response, action, success, error, delegate) {
			$rootScope.$apply(function () {
				if (response.error && isFunction(error)) {
					error(response);
				}
				else if (response.error) {
					$log.error(response);
				}
				else {
					if (isFunction(action.transformResponse)) response = action.transformResponse(response);
					if (isFunction(delegate)) delegate(response);
					if (isFunction(success)) success(response);
				}
			});
		}

		function retrieveResource(item, action, params, success, error) {
			var url = '/' + model + (params && params.id ? '/' + params.id : '') + createQueryString(params);
			socket.get(url, function (response) {
				handleResponse(response, action, success, error, function (data) {
					if (isArray(item)) { // empty the list and update with returned data
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
		}

		function createOrUpdateResource(item, action, params, success, error) {
			// prep data
			var transformedData;
			if (isFunction(action.transformRequest)) {
				transformedData = JSON.parse(action.transformRequest(item));
			}
			var data = shallowClearAndCopy(transformedData || item, {}); // prevents prototype functions being sent

			var url = '/' + model + (data.id ? '/' + data.id : '') + createQueryString(params);
			var method = item.id ? 'put' : 'post'; // when Resource has id use PUT, otherwise use POST
			socket[method](url, data, function (response) {
				handleResponse(response, action, success, error, function (data) {
					copy(data, item);
				});
			});
		}

		function deleteResource(item, action, params, success, error) {
			var url = '/' + model + '/' + item.id + createQueryString(params);
			socket.delete(url, function (response) {
				handleResponse(response, action, success, error);
				// leaves local instance unmodified
			});
		}

		function socketUpdateResource(message) {
			forEach(cache, function (cacheItem, key) {
				if (isInt(key) && key == +message.id) { // an id key
					copy(message.data, cacheItem);
				}
				else {
					forEach(cacheItem, function (item) {
						if (item.id == +message.id) {
							copy(message.data, item);
						}
					});
				}
			});
		}

		function socketCreateResource(message) {
			cache[+message.id] = new Resource(message.data);
			// when a new item is created we have no way of knowing if it belongs in a cached list,
			// this necessitates doing a server fetch on all known lists
			// TODO does this make sense?
			forEach(cache, function (cacheItem, key) {
				if (!isInt(key)) { // a non id key
					retrieveResource(cacheItem, {}, JSON.parse(key));
				}
			});
		}

		function socketDeleteResource(message) {
			delete cache[+message.id];
			// remove this item in all known lists
			forEach(cache, function (cacheItem, key) {
				if (!isInt(key)) {
					var foundIndex = null;
					forEach(cacheItem, function (item, index) {
						if (item.id == +message.id) {
							foundIndex = index;
						}
					});
					if (foundIndex != null) {
						cacheItem.splice(foundIndex, 1);
					}
				}
			});
		}

		// Add each action to the Resource or its prototype
		forEach(actions, function (action, name) {
			// instance methods added to prototype with $ prefix
			var isInstanceMethod = /^(POST|PUT|PATCH|DELETE)$/i.test(action.method);
			var addTo = isInstanceMethod ? Resource.prototype : Resource;
			var actionName = isInstanceMethod ? '$' + name : name;

			addTo[actionName] = function (params, success, error) {
				return handleRequest(this, action, params, success, error);
			};
		});

		// Subscribe to changes
		socket.on(model, function (message) {
			if (options.verbose) {
				$log.log('sailsResource received \'' + model + '\' message: ', message);
			}
			$rootScope.$apply(function () {
				switch (message.verb) {
					case 'updated':
						socketUpdateResource(message);
						break;
					case 'created':
						socketCreateResource(message);
						break;
					case 'destroyed':
						socketDeleteResource(message);
						break;
				}
			})
		});

		return Resource;
	};
}

/**
 * Create a shallow copy of an object and clear other fields from the destination.
 * Taken from ngResource source.
 * https://code.angularjs.org/1.2.20/angular-resource.js
 */
function shallowClearAndCopy(src, dst) {
	dst = dst || {};

	angular.forEach(dst, function (value, key) {
		delete dst[key];
	});

	for (var key in src) {
		if (src.hasOwnProperty(key) && key.charAt(0) !== '$') {
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
	if (params) {
		qs.push('?');
		forEach(params, function (value, key) {
			if (key == 'id') return;
			qs.push(key + '=' + value);
			qs.push('&');
		});
		qs.pop(); // remove last &
	}
	return qs.join('');
}

})(window.angular);