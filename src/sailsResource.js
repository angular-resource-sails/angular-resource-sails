(function (angular) {

var forEach = angular.forEach,
	extend = angular.extend,
	copy = angular.copy,
	isObject = angular.isObject,
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

	var DEFAULT_OPTIONS = {
		// Sails lets you set a prefix, such as '/api'
		prefix: '',

		// When verbose, socket updates go to the console
		verbose: false,

		// Set a specific websocket, used for testing
		socket: null,

		// Set a specific origin, used for testing
		origin: null
	};

	var MESSAGES = {
		create: '$sailsResourceCreated',
		update: '$sailsResourceUpdated',
		destroy: '$sailsResourceDestroyed'
	};

	return function (model, actions, options) {

		if (typeof model != 'string' || model.length == 0) {
			throw 'Model name is required';
		}

		model = model.toLowerCase(); // sails always sends models lowercase
		actions = extend({}, DEFAULT_ACTIONS, actions);
		options = extend({}, DEFAULT_OPTIONS, options);

		// Ensure prefix starts with forward slash
		if(options.prefix && options.prefix.charAt(0) != '/') {
			options.prefix = '/' + options.prefix;
		}
		var origin = options.origin || $window.location.origin;
		var socket = options.socket || $window.io.connect(origin);

		// Caching
		var cache = {};
		// TODO implement cache clearing?

		// Resource constructor
		function Resource(value) {
			shallowClearAndCopy(value || {}, this);
		}

		function handleRequest(item, params, action, success, error) {

			if (isFunction(params)) {
				error = success;
				success = params;
				params = {};
			}

			if (action.method == 'GET') {
				var key = action.isArray ? JSON.stringify(params || {}) : params.id; // cache key is params for lists, id for items
				item = action.isArray ? cache[key] || [] : cache[params.id] || new Resource({ id: params.id }); // pull out of cache if available, otherwise create new instance

				if (item.$resolved) {
					return item; // resolved item was found, return without doing a call to server, note: this will always refetch for arrays
				}

				cache[key] = item; // store blank item in cache
				return retrieveResource(item, params, action, success, error);
			}
			else if (action.method == 'POST' || action.method == 'PUT') { // Update individual instance of model
				createOrUpdateResource(item, params, action, success, error);
			}
			else if (action.method == 'DELETE') { // Delete individual instance of model
				deleteResource(item, params, action, success, error);
			}
		}

		function handleResponse(response, action, success, error, delegate) {
			action = action || {};
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

		function retrieveResource(item, params, action, success, error) {
			var url = options.prefix + '/' + model + (params && params.id ? '/' + params.id : '') + createQueryString(params);
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

		function createOrUpdateResource(item, params, action, success, error) {
			// prep data
			var transformedData;
			if (isFunction(action.transformRequest)) {
				transformedData = JSON.parse(action.transformRequest(item));
			}
			var data = shallowClearAndCopy(transformedData || item, {}); // prevents prototype functions being sent
			var url = options.prefix + '/' + model + (data.id ? '/' + data.id : '') + createQueryString(params);
			var method = item.id ? 'put' : 'post'; // when Resource has id use PUT, otherwise use POST
			socket[method](url, data, function (response) {
				handleResponse(response, action, success, error, function (data) {
					copy(data, item);
					$rootScope.$broadcast(item.id ? MESSAGES.update : MESSAGES.create, {model: model, id: data.id, data: data});
				});
			});
		}

		function deleteResource(item, params, action, success, error) {
			var url = options.prefix + '/' + model + '/' + item.id + createQueryString(params);
			socket.delete(url, function (response) {
				handleResponse(response, action, success, error, function() {
					$rootScope.$broadcast(MESSAGES.destroy, {model: model, id: item.id});
					// leave local instance unmodified
				});
			});
		}

		function socketUpdateResource(message) {
			forEach(cache, function (cacheItem, key) {
				if (isArray(cacheItem)) {
					forEach(cacheItem, function (item) {
						if (item.id == message.id) {
							if(needsPopulate(message.data, item)) { // go to server for updated data
								retrieveResource(item, {id: item.id});
							}
							else {
								copy(message.data, item);
							}
						}
					});
				}
				else if(key == message.id){
					if(needsPopulate(message.data, cacheItem)) { // go to server for updated data
						retrieveResource(cacheItem, {id: cacheItem.id});
					}
					else {
						copy(message.data, cacheItem);
					}
				}
			});
		}

		function socketCreateResource(message) {
			cache[message.id] = new Resource(message.data);
			// when a new item is created we have no way of knowing if it belongs in a cached list,
			// this necessitates doing a server fetch on all known lists
			// TODO does this make sense?
			forEach(cache, function (cacheItem, key) {
				if (isArray(cacheItem)) {
					retrieveResource(cacheItem, JSON.parse(key));
				}
			});
		}

		function socketDeleteResource(message) {
			delete cache[message.id];
			// remove this item in all known lists
			forEach(cache, function (cacheItem) {
				if (isArray(cacheItem)) {
					var foundIndex = null;
					forEach(cacheItem, function (item, index) {
						if (item.id == message.id) {
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
				return handleRequest(this, params, action, success, error);
			};
		});

		// Subscribe to changes
		socket.on(model, function (message) {
			if (options.verbose) {
				$log.log('sailsResource received \'' + model + '\' message: ', message);
			}
			var messageName = null;
			$rootScope.$apply(function () {
				switch (message.verb) {
					case 'updated':
						socketUpdateResource(message);
						messageName = MESSAGES.update;
						break;
					case 'created':
						socketCreateResource(message);
						messageName = MESSAGES.create;
						break;
					case 'destroyed':
						socketDeleteResource(message);
						messageName = MESSAGES.destroy;
						break;
				}
			});
			$rootScope.$broadcast(messageName, extend({model: model}, message));
		});

		return Resource;
	};
}

/**
 * As of Sails 0.10.4 models with associations will not be populated in socket update data. This function detects
 * this scenario, i.e. the dst[key] (current value) is an object, but the src[key] (updated value) is an id.
 * Ideally this function will stop returning true if/when Sails addresses this issue as both dst and src will
 * contain an object.
 */
function needsPopulate(src, dst) {
	for(var key in src) {
		if(src.hasOwnProperty(key) && isObject(dst[key]) && !isObject(src[key])) {
			return true;
		}
	}
	return false;
}

/**
 * Create a shallow copy of an object and clear other fields from the destination.
 * Taken from ngResource source.
 * https://code.angularjs.org/1.2.20/angular-resource.js
 */
function shallowClearAndCopy(src, dst) {
	dst = dst || {};

	forEach(dst, function (value, key) {
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