(function (angular) {

	var forEach = angular.forEach,
		copy = angular.copy,
		extend = angular.extend,
		isObject = angular.isObject,
		isArray = angular.isArray,
		isString = angular.isString,
		isFunction = angular.isFunction,
		isDefined = angular.isDefined;

	angular.module('sailsResource', []).provider('sailsResource', function () {

		var DEFAULT_CONFIGURATION = {
			// Set a route prefix, such as '/api'
			prefix: '',
			// When verbose, socket updates go to the console
			verbose: false,
			// Set a specific websocket
			socket: null,
			// Set a specific origin
			origin: null,
			// Set resource primary key
			primaryKey: 'id',

			//Set associations of the model
			associations: {}
		};

		this.configuration = {};

		this.$get = ['$rootScope', '$window', '$log', '$q', '$injector', function ($rootScope, $window, $log, $q, $injector) {
			var config = extend({}, DEFAULT_CONFIGURATION, this.configuration);
			return resourceFactory($rootScope, $window, $log, $q, $injector, config);
		}];
	});

	function resourceFactory($rootScope, $window, $log, $q, $injector, config) {

		var DEFAULT_ACTIONS = {
			'get': {method: 'GET'},
			'save': {method: 'POST'},
			'query': {method: 'GET', isArray: true},
			'association': {
				method: 'GET',
				isArray: true,
				url: ":model/:modelId/:association",
				isAssociation: true
			},
			'removeAssociation': {
				method: 'DELETE',
				path: ":association/:associatedId",
				isAssociation: true
			},
			'addAssociation': {
				method: 'POST',
				path: ":association/:associatedId",
				isAssociation: true
			},
			'remove': {method: 'DELETE'},
			'delete': {method: 'DELETE'}
		};

		var MESSAGES = {
			// Resource
			created: '$sailsResourceCreated',
			updated: '$sailsResourceUpdated',
			destroyed: '$sailsResourceDestroyed',
			messaged: '$sailsResourceMessaged',
			addedTo: '$sailsResourceAddedTo',
			removedFrom: '$sailsResourceRemovedFrom',


			// Socket
			connected: '$sailsConnected',
			disconnected: '$sailsDisconnected',
			reconnected: '$sailsReconnected',
			reconnecting: '$sailsReconnecting',
			socketError: '$sailsSocketError'
		};

		function ResourceWrapper(model, actions, options) {

			var context = this;

			this.model = model;
			this.actions = actions;
			this.options = options;

			if (typeof context.model != 'string' || context.model.length == 0) {
				throw 'Model name is required';
			}

			this.model = context.model.toLowerCase(); // Sails always sends models lowercase
			this.actions = extend({}, DEFAULT_ACTIONS, context.actions);
			this.options = extend({}, config, context.options);

			// Ensure prefix starts with forward slash
			if (context.options.prefix && context.options.prefix.charAt(0) != '/') {
				context.options.prefix = '/' + context.options.prefix;
			}

			// Create our socket instance based on options

			var socket;
			if (context.options.socket) { // Was given to us
				socket = context.options.socket;
			}
			else if (context.options.origin) { // A custom origin
				socket = $window.io.sails.connect(context.options.origin);
			}
			else { // Default: use base socket
				socket = $window.io.socket;
			}

			// Setup socket default messages

			socket.on('connect', function () {
				$rootScope.$apply(function () {
					$rootScope.$broadcast(MESSAGES.connected);
				});
			});

			socket.on('disconnect', function () {
				$rootScope.$apply(function () {
					$rootScope.$broadcast(MESSAGES.disconnected);
				});
			});

			socket.on('reconnect', function () {
				$rootScope.$apply(function () {
					$rootScope.$broadcast(MESSAGES.reconnected);
				});
			});

			socket.on('reconnecting', function (timeDisconnected, reconnectCount) {
				$rootScope.$apply(function () {
					$rootScope.$broadcast(MESSAGES.reconnecting, {
						timeDisconnected: timeDisconnected,
						reconnectCount: reconnectCount
					});
				});
			});

			socket.on('error', function (error) {
				$rootScope.$apply(function () {
					$rootScope.$broadcast(MESSAGES.socketError, error);
				});
			});

			// Disconnect socket when window unloads
			$window.onbeforeunload = function () {
				if (socket) {
					socket.disconnect();
				}
			};

			// Caching
			this.cache = {};
			// TODO implement cache clearing?

			this.removeFromCache = function (id) {
				delete context.cache[id];
				// remove this item in all known lists
				forEach(context.cache, function (cacheItem) {
					if (isArray(cacheItem)) {
						var foundIndex = null;
						forEach(cacheItem, function (item, index) {
							if (item[context.options.primaryKey] == id) {
								foundIndex = index;
							}
						});
						if (foundIndex != null) {
							cacheItem.splice(foundIndex, 1);
						}
					}
				});
			}

			// Resource constructor
			function Resource(value) {
				copy(value || {}, this);
			}

			this.mergeParams = function (params, actionParams) {
				return extend({}, actionParams || {}, params || {});
			}

			// Handle a request
			// Does a small amount of preparation of data and directs to the appropriate request handler
			this.handleRequest = function (item, params, action, success, error) {

				// When params is a function, it's actually a callback and no params were provided
				if (isFunction(params)) {
					error = success;
					success = params;
					params = {};
				}


				var instanceParams,
					actionParams = action && typeof action.params === 'object' ? action.params : {};
				if (action.method == 'GET') {

					instanceParams = context.mergeParams(params, actionParams);

					// Do not cache if:
					// 1) action is set to cache=false (the default is true) OR
					// 2) action uses a custom url (Sails only sends updates to ids) OR
					// 3) the resource is an individual item without an id (Sails only sends updates to ids)

					if (!action.cache || (action.url && !action.isAssociation) || (!action.isArray && (!instanceParams || !instanceParams[context.options.primaryKey]))) { // uncached

						item = action.isArray ? [] : new Resource();
					}
					else {
						// cache key is 1) stringified params for lists or 2) id for individual items
						var key = action.isArray ? JSON.stringify(instanceParams || {}) : instanceParams[context.options.primaryKey];
						// pull out of cache if available, otherwise create new instance
						item = context.cache[key] || (action.isArray ? []
								// Set key on object using options.primaryKey
								: (function () {
								var tmp = {};
								tmp[context.options.primaryKey] = key;
								return new Resource(tmp)
							})());

						this.cache[key] = item; // store item in cache
					}


					return context.retrieveResource(item, instanceParams, action, success, error);
				}
				else {
					// When we have no item, params is assumed to be the item data
					if (!item) {
						item = new Resource(params);
						params = {};
					}

					instanceParams = context.mergeParams(params, actionParams);

					if (action.method == 'POST' || action.method == 'PUT') { // Update individual instance of model
						return context.createOrUpdateResource(item, instanceParams, action, success, error);
					}
					else if (action.method == 'DELETE') { // Delete individual instance of model
						return context.deleteResource(item, instanceParams, action, success, error);
					}
				}
			}

			// Handle a response
			this.handleResponse = function (item, data, action, deferred, delegate) {
				action = action || {};
				$rootScope.$apply(function () {
					item.$resolved = true;

					if (data && (data.error || data.statusCode > 400)) {
						$log.error(data);
						deferred.reject(data || data, item, data);
					}
					else if (!isArray(item) && isArray(data) && data.length != 1) {
						// This scenario occurs when GET is done without an id and Sails returns an array. Since the cached
						// item is not an array, only one item should be found or an error is thrown.
						var errorMessage = (data.length ? 'Multiple' : 'No') +
							' items found while performing GET on a singular \'' + context.model + '\' Resource; did you mean to do a query?';

						$log.error(errorMessage);
						deferred.reject(errorMessage, item, data);
					}
					else {
						// converting single array to single item
						if (!isArray(item) && isArray(data)) data = data[0];

						if (isArray(action.transformResponse)) {
							forEach(action.transformResponse, function (transformResponse) {
								if (isFunction(transformResponse)) {
									data = transformResponse(data);
								}
							})
						}
						if (isFunction(action.transformResponse)) data = action.transformResponse(data);
						if (isFunction(delegate)) delegate(data);

						// 1) Internally resolve with both item and header getter
						// for pass'em to explicit success handler
						// 2) In attachPromise() cut off header getter, so that
						// implicit success handlers receive only item
						deferred.resolve({
							item: item,
							getHeaderFn: function (name) {
								return jwr && jwr.headers && jwr.headers[name];
							}
						});
					}
				});
			}

			this.attachPromise = function (item, success, error) {
				var deferred = $q.defer();
				item.$promise = deferred.promise.then(function (result) {
					// Like in ngResource explicit success handler
					// (passed directly as an argument of action call)
					// receives two arguments:
					// 1) item and 2) header getter function.
					(success || angular.noop)(result.item, result.getHeaderFn);

					// Implicit success handlers (bound via Promise API, .then())
					// receive only item argument
					return $q.when(result.item);
				});
				item.$promise.catch(error);
				item.$resolved = false;
				return deferred;
			}

			this.resolveAssociations = function (responseItem, params, action) {
				forEach(context.options.associations, function (association, attr) {
					if (action.isAssociation && action.isArray) {
						if(params.model != attr) {
							context.resolveAssociation(responseItem, attr, association);
						}
					}
					else {
						context.resolveAssociation(responseItem, attr, association);
					}
				});
			};

			this.resolveAssociation = function (responseItem, attr, association) {
				if (isDefined(responseItem[attr])) {
					var associateParams = {};
					if (isArray(responseItem[attr])) {
						var object = {
							model: context.model,
							modelId: responseItem[context.options.primaryKey],
							association: attr
						};

						if (responseItem[attr].$resolved) {
							responseItem[attr].$refresh();
						}
						else {
							responseItem[attr] = $injector.get(association.model).association(object);

						}
					}
					else {
						if (isObject(responseItem[attr])) {
							associateParams[association.primaryKey] = responseItem[attr][association.primaryKey];
						}
						else if (isString(responseItem[attr])) {
							associateParams[association.primaryKey] = responseItem[attr];
						}
						responseItem[attr] = $injector.get(association.model).get(associateParams);
					}
				}
			};

			this.clearAssociations = function (data) {
				forEach(context.options.associations, function (association, attr) {
					if (isDefined(data[attr])) {
						if (isArray(data[attr])) {
							delete data[attr];
						}
						else if (isObject(data[attr])) {
							if (isDefined(data[attr][association.primaryKey])) {
								data[attr] = data[attr][association.primaryKey];
							}
						}
					}
				});

				return data;
			}

			// Request handler function for GETs
			this.retrieveResource = function (item, params, action, success, error) {
				var deferred = context.attachPromise(item, success, error);

				var url = buildUrl(context.model, params ? params[context.options.primaryKey] : null, action, params, context.options);
				item.$retrieveUrl = url;
				item.$refresh = function () {
					context.retrieveResource(item, params, action);
				};

				if (context.options.verbose) {
					$log.info('sailsResource calling GET ' + url);
				}

				socket.get(url, function (response) {
					context.handleResponse(item, response, action, deferred, function (data) {
						if (isArray(item)) { // empty the list and update with returned data
							while (item.length) item.pop();
							forEach(data, function (responseItem) {
								responseItem = new Resource(responseItem);
								responseItem.$resolved = true;

								context.resolveAssociations(responseItem, params, action);

								item.push(responseItem); // update list
							});
						}
						else {
							extend(item, data); // update item

							context.resolveAssociations(item, params, action);

							// If item is not in the cache based on its id, add it now
							if (!context.cache[item[context.options.primaryKey]]) {
								context.cache[item[context.options.primaryKey]] = item;
							}
						}

					});
				});

				return item;
			};

			// Request handler function for PUTs and POSTs
			this.createOrUpdateResource = function (item, params, action, success, error) {
				var deferred = context.attachPromise(item, success, error);

				// prep data
				var transformedData;
				if (isFunction(action.transformRequest)) {
					var tmp = action.transformRequest(item);
					transformedData = typeof tmp === 'object' ? tmp : JSON.parse(tmp);
				}

				// prevents prototype functions being sent
				var data = copyAndClear(transformedData || item, {});

				data = context.clearAssociations(data);


				var url = buildUrl(context.model, data[context.options.primaryKey], action, params, context.options);

				// when Resource has id use PUT, otherwise use POST
				var method = "";
				if (item[context.options.primaryKey] && !action.isAssociation) {
					method = "put";
				}
				else {
					method = "post";
				}

				if (context.options.verbose) {
					$log.info('sailsResource calling ' + method.toUpperCase() + ' ' + url);
				}

				socket[method](url, data, function (response) {
					context.handleResponse(item, response, action, deferred, function (data) {
						if (action.isAssociation) {
						}
						else {
							extend(item, data);

							if (method == "post") {
								context.resolveAssociations(item, params, action);
							}

							var message = {
								model: context.model,
								data: item
							};
							message[context.options.primaryKey] = item[context.options.primaryKey];

							if (method === 'put') {
								// Update cache
								context.socketUpdateResource(message);
								// Emit event
								$rootScope.$broadcast(MESSAGES.updated, message);
							} else {
								// Update cache
								context.socketCreateResource(message);
								// Emit event
								$rootScope.$broadcast(MESSAGES.created, message);
							}
						}
					});
				});

				return item.$promise;
			}

			// Request handler function for DELETEs
			this.deleteResource = function (item, params, action, success, error) {
				var deferred = context.attachPromise(item, success, error);
				var url = buildUrl(context.model, item[context.options.primaryKey], action, params, context.options);

				if (context.options.verbose) {
					$log.info('sailsResource calling DELETE ' + url);
				}

				socket.delete(url, function (response) {
					context.handleResponse(item, response, action, deferred, function () {
						if (!action.isAssociation) {
							context.removeFromCache(item[context.options.primaryKey]);
							var tmp = {model: context.model};
							tmp[context.options.primaryKey] = item[context.options.primaryKey];
							$rootScope.$broadcast(MESSAGES.destroyed, tmp);
							// leave local instance unmodified
						}
						else {
							forEach(item[params.association], function (associationItem, keyRemoved) {
								if (associationItem[context.options.associations[params.association].primaryKey] == params.associatedId) {
									item[params.association].splice(keyRemoved, 1);
								}
							});
						}
					});
				});

				return item.$promise;
			}

			this.socketAddedToResource = function (model, message) {
				var url = context.options.prefix + "/" + context.model + "/" + message[context.options.primaryKey] + "/" + message.attribute + "/" + message.addedId;
				var association = context.options.associations[message.attribute];

				forEach(context.cache, function (cacheItem, key) {
					if (isArray(cacheItem)) {
						forEach(cacheItem, function (item) {
							if (item[context.options.primaryKey] == message[context.options.primaryKey]) {
								if (!isDefined(association)) {
									socket.get(url, function (response) {
										$rootScope.$apply(function () {
											if (isArray(item[message.attribute])) {
												item[message.attribute].push(response[0]);
											}
											else {
												item[message.attribute] = response;
											}
										});
									});
								}
								else {
									context.resolveAssociation(item, message.attribute, association);
								}
							}
						});
					}
					else if (key == message[context.options.primaryKey]) {
						if (!isDefined(association)) {
							socket.get(url, function (response) {
								$rootScope.$apply(function () {

									if (isArray(cacheItem[message.attribute])) {
										cacheItem[message.attribute].push(response[0]);
									}
									else {
										cacheItem[message.attribute] = response;
									}
								});
							});
						}
						else {
							context.resolveAssociation(cacheItem, message.attribute, association);
						}
					}
				});
			}

			this.socketRemovedFromResource = function (message) {
				var association = context.options.associations[message.attribute];
				forEach(context.cache, function (cacheItem, key) {
					if (isArray(cacheItem)) {
						forEach(cacheItem, function (item) {
							if (item[context.options.primaryKey] == message[context.options.primaryKey]) {
								if (!isDefined(association)) {
									forEach(item[message.attribute], function (itemRemoved, keyRemoved) {
										if (itemRemoved[context.options.primaryKey] == message.removedId) {
											item[message.attribute].splice(keyRemoved, 1);
										}
									})
								}
								else {
									context.resolveAssociation(item, message.attribute, association);
								}
							}
						});
					}
					else if (key == message[context.options.primaryKey]) {
						forEach(cacheItem[message.attribute], function (itemRemoved, keyRemoved) {
							if (!isDefined(association)) {
								if (itemRemoved[context.options.primaryKey] == message.removedId) {
									cacheItem[message.attribute].splice(keyRemoved, 1);
								}
							}
							else {
								context.resolveAssociation(cacheItem, message.attribute, association);
							}
						})
					}
				});
			}

			this.socketUpdateResource = function (message) {
				forEach(context.cache, function (cacheItem, key) {
					if (isArray(cacheItem)) {
						forEach(cacheItem, function (item) {
							if (item[context.options.primaryKey] == message[context.options.primaryKey]) {
								if (needsPopulate(message.data, item)) { // go to server for updated data
									var tmp = {};
									tmp[context.options.primaryKey] = item[context.options.primaryKey];
									context.retrieveResource(item, tmp);
								}
								else {
									extend(item, message.data);
								}
							}
						});
					}
					else if (key == message[context.options.primaryKey]) {
						if (needsPopulate(message.data, cacheItem)) { // go to server for updated data
							var tmp = {};
							tmp[context.options.primaryKey] = cacheItem[context.options.primaryKey];
							context.retrieveResource(cacheItem, tmp);
						}
						else {
							extend(cacheItem, message.data);
						}
					}
				});

			}

			this.socketCreateResource = function (message) {
				context.cache[message[context.options.primaryKey]] = new Resource(message.data);
				// when a new item is created we have no way of knowing if it belongs in a cached list,
				// this necessitates doing a server fetch on all known lists
				// TODO does this make sense?
				forEach(context.cache, function (cacheItem, key) {
					if (isArray(cacheItem)) {
						var object = JSON.parse(key);

						if (!object.model && !object.modelId && !object.association) {
							context.retrieveResource(cacheItem, object);
						}
					}
				});
			}

			this.socketDeleteResource = function (message) {
				context.removeFromCache(message[context.options.primaryKey]);
			};

			// Add each action to the Resource and/or its prototype
			forEach(context.actions, function (action, name) {
				// fill in default action options
				action = extend({}, {cache: true, isArray: false}, action);

				function actionMethod(params, success, error) {
					var self = this;
					if (action.fetchAfterReconnect) {
						// let angular-resource-sails refetch important data after
						// a server disconnect then reconnect happens
						socket.on('reconnect', function () {
							context.handleRequest(isObject(self) ? self : null, params, action, success, error);
						});
					}

					return context.handleRequest(isObject(this) ? this : null, params, action, success, error);
				}

				if (/^(POST|PUT|PATCH|DELETE)$/i.test(action.method)) {
					// Add to instance methods to prototype with $ prefix, GET methods not included
					Resource.prototype['$' + name] = actionMethod;
				}

				// All method types added to service without $ prefix
				Resource[name] = actionMethod;
			});

			// Handy function for converting a Resource into plain JSON data
			Resource.prototype.toJSON = function () {
				var data = extend({}, this);
				delete data.$promise;
				delete data.$resolved;
				return data;
			};

			// Subscribe to changes
			socket.on(context.model, function (message) {
				if (context.options.verbose) {
					$log.info('sailsResource received \'' + context.model + '\' message: ', message);
				}
				var messageName = null;
				$rootScope.$apply(function () {
					switch (message.verb) {
						case 'updated':
							context.socketUpdateResource(message);
							messageName = MESSAGES.updated;
							break;
						case 'created':
							context.socketCreateResource(message);
							messageName = MESSAGES.created;
							break;
						case 'destroyed':
							context.socketDeleteResource(message);
							messageName = MESSAGES.destroyed;
							break;
						case 'messaged':
							messageName = MESSAGES.messaged;
							break;
						case 'addedTo' :
							context.socketAddedToResource(context.model, message);
							messageName = MESSAGES.addedTo;
							break;
						case 'removedFrom' :
							context.socketRemovedFromResource(message);
							messageName = MESSAGES.removedFrom;
							break;
					}
					$rootScope.$broadcast(messageName, extend({model: context.model}, message));
				});
			});

			return Resource;
		}

		return function (model, actions, options) {
			return new ResourceWrapper(model, actions, options);
		};
	}

	/**
	 * As of Sails 0.10.4 models with associations will not be populated in socket update data. This function detects
	 * this scenario, i.e. the dst[key] (current value) is an object, but the src[key] (updated value) is an id.
	 * Ideally this function will stop returning true if/when Sails addresses this issue as both dst and src will
	 * contain an object.
	 */
	function needsPopulate(src, dst) {
		for (var key in src) {
			if (src.hasOwnProperty(key) && isObject(dst[key]) && !isObject(src[key])) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Deep copies and removes view properties
	 */
	function copyAndClear(src, dst) {
		dst = dst || (isArray(src) ? [] : {});

		forEach(dst, function (value, key) {
			delete dst[key];
		});

		for (var key in src) {
			if (src.hasOwnProperty(key) && key.charAt(0) !== '$') {
				var prop = src[key];
				dst[key] = isObject(prop) ? copyAndClear(prop) : prop;
			}
		}

		return dst;
	}

	/**
	 * Builds a sails URL!
	 */
	function buildUrl(model, id, action, params, options) {
		var url = [];
		var urlParams = {};

		if (isArray(id)) {
			id = null;
		}

		if (action && action.url) {
			var actionUrl = action.url;
			// Look for :params in url and replace with params we have
			var matches = action.url.match(/(:\w+)/g);
			if (matches) {
				forEach(matches, function (match) {
					var paramName = match.replace(':', '');
					if (paramName === options.primaryKey) {
						actionUrl = actionUrl.replace(match, id);
					} else {
						urlParams[paramName] = true;
						actionUrl = actionUrl.replace(match, params[paramName]);
					}
				});
			}
			url.push(options.prefix);
			url.push("/");
			url.push(actionUrl);
		}
		else if (action && action.path) {
			var actionUrl = action.path;
			var originalUrl = [];
			originalUrl.push(options.prefix);
			originalUrl.push('/');
			originalUrl.push(model);
			if (id) originalUrl.push('/' + id);
			if (originalUrl.path) {
				originalUrl.push('/');
				originalUrl.push(action.path);
			}

			originalUrl = originalUrl.join('');

			var matches = action.path.match(/(:\w+)/g);
			if (matches) {
				forEach(matches, function (match) {
					var paramName = match.replace(':', '');
					if (paramName === options.primaryKey) {
						actionUrl = actionUrl.replace(match, id);
					} else {
						urlParams[paramName] = true;
						actionUrl = actionUrl.replace(match, params[paramName]);
					}
				});
			}
			url.push(originalUrl);
			url.push("/");
			url.push(actionUrl);
		}
		else {
			url.push(options.prefix);
			url.push('/');
			url.push(model);
			if (id) url.push('/' + id);

		}

		var queryParams = {};
		angular.forEach(params, function (value, key) {
			if (!urlParams[key]) {
				queryParams[key] = value;
			}
		});

		url.push(createQueryString(queryParams, options));
		return url.join('');
	}

	/**
	 * Create a query-string out of a set of parameters, similar to way AngularJS does (as of 1.3.15)
	 * @see https://github.com/angular/angular.js/commit/6c8464ad14dd308349f632245c1a064c9aae242a#diff-748e0a1e1a7db3458d5f95d59d7e16c9L1142
	 */
	function createQueryString(params) {
		if (!params) {
			return '';
		}

		var parts = [];
		Object.keys(params).sort().forEach(function (key) {
			var value = params[key];
			if (key === 'id') {
				return;
			}
			if (value === null || value === undefined) {
				return;
			}
			if (!Array.isArray(value)) {
				value = [value];
			}
			value.forEach(function (v) {
				if (angular.isObject(v)) {
					v = angular.isDate(v) ? v.toISOString() : angular.toJson(v);
				}
				parts.push(key + '=' + v);
			});
		});
		return parts.length ? '?' + parts.join('&') : '';
	}


})(window.angular);
