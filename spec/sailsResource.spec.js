describe('sailsResource >', function () {
	beforeEach(module('sailsResource'));
	var service, socket;
	var item, successHandler, errorHandler, successPromise, errorPromise;

	beforeEach(inject(function (mockSocket, $window) {
		socket = mockSocket;
		$window.io = {
			connect: function () {
				return mockSocket;
			}
		};
	}));

	beforeEach(inject(function (sailsResource) {
		successHandler = jasmine.createSpy('successHandler');
		errorHandler = jasmine.createSpy('errorHandler');
		successPromise = jasmine.createSpy('successPromise');
		errorPromise = jasmine.createSpy('errorPromise');

		var actions = {
			'update': {method: 'PUT'},
			'transformUpdate': {
				method: 'PUT', transformRequest: function (request) {
					request.data = 'transformed request';
					return JSON.stringify(request);
				}
			},
			'transformRetrieve': {
				method: 'GET', transformResponse: function (response) {
					response.data = 'transformed response';
					return response;
				}
			},
			'nocache': {method: 'GET', isArray: true, cache: false}
		};

		var options = {
			verbose: true,
			prefix: '/api'
		};

		service = sailsResource('widget', actions, options)
	}));

	it('requires a model name', inject(function (sailsResource) {
		// invalid
		expect(function () {
			sailsResource();
		}).toThrow();

		expect(function () {
			sailsResource('');
		}).toThrow();

		// valid inputs
		expect(function () {
			sailsResource('widget');
		}).not.toThrow();
	}));

	describe('transforms >', function () {
		it('uses a given transformRequest', function () {
			var item = service.get({id: 1});
			socket.flush();
			item.$transformUpdate();
			expect(item.data).toBeDefined();
			expect(item.data).toEqual('transformed request');
		});

		it('uses a given transformResponse', function () {
			var item = service.transformRetrieve({id: 1});
			socket.flush();
			expect(item.data).toBeDefined();
			expect(item.data).toEqual('transformed response');
		});
	});

	describe('queries >', function () {
		var items;
		beforeEach(function () {
			items = service.query(successHandler, errorHandler);
		});

		it('returns an empty array of Resources immediately', function () {
			expect(items).toBeDefined();
			expect(items.length).toEqual(0);
		});

		it('has $promise', function () {
			expect(items.$promise).toBeDefined();
		});

		describe('data returned >', function () {
			beforeEach(function () {
				socket.flush();
			});

			it('updates to a populated Resource array asynchronously', function () {
				expect(items.length).toEqual(socket.itemCount());
			});

			it('used callbacks', function () {
				expect(successHandler).toHaveBeenCalled();
				expect(errorHandler).not.toHaveBeenCalled();
			});

			it('still has $promise', function () {
				expect(items.$promise).toBeDefined();
			});

			it('$resoved is true', function () {
				expect(items.$resolved).toBeTruthy();
			});
		});

		it('query works without callbacks', function () {
			items = service.query();
			socket.flush();
		});
	});

	describe('gets >', function () {
		describe('successfully >', function () {
			beforeEach(function () {
				item = service.get({id: 1}, successHandler, errorHandler);
				item.$promise.then(successPromise, errorPromise);
			});

			it('returns an empty Resource immediately', function () {
				expect(item).toBeDefined();
				expect(item.data).toBeUndefined();
			});

			it('has a $promise', function () {
				expect(item.$promise).toBeDefined();
			});

			describe('data returned >', function () {
				beforeEach(function () {
					socket.flush();
				});

				it('updates to a populated Resource asynchronously', function () {
					expect(item.id).toEqual(1);
					expect(item.data).toEqual('abc');
				});

				it('calls successHandler', function () {
					expect(successHandler).toHaveBeenCalled();
					expect(errorHandler).not.toHaveBeenCalled();
				});

				it('calls successPromise', function () {
					expect(successPromise).toHaveBeenCalled();
					expect(errorPromise).not.toHaveBeenCalled();
				});

				it('still has $promise', function () {
					expect(item.$promise).toBeDefined();
				});

				it('$resoved is true', function () {
					expect(item.$resolved).toBeTruthy();
				});
			});
		});

		describe('error >', function () {
			beforeEach(function () {
				item = service.get({id: 999}, successHandler, errorHandler);
				item.$promise.then(successPromise, errorPromise);
				socket.flush();
			});

			it('calls errorHandler', function () {
				expect(successHandler).not.toHaveBeenCalled();
				expect(errorHandler).toHaveBeenCalled();
			});

			it('calls errorPromise', function () {
				expect(successPromise).not.toHaveBeenCalled();
				expect(errorPromise).toHaveBeenCalled();
			});
		});

		it('works without callbacks', function () {
			item = service.get({id: 1});
			socket.flush();
			expect(item.id).toEqual(1);
			expect(item.data).toEqual('abc');
		});

		it('should retrieve items with string ids', function () {
			item = service.get({id: 'aguid'});
			socket.flush();
			expect(item).toBeDefined();
			expect(item.data).toEqual('klm');
		});
	});

	describe('Resource >', function () {

		it('has custom actions', function () {
			var item = service.get({id: 1});
			expect(item.$update).toBeDefined();
		});

		describe('create >', function () {
			var item, originalCount;
			beforeEach(function () {
				item = new service();
				originalCount = socket.itemCount();
				socket.flush();
				item.$save();
			});

			it('creates a new item asynchronously', function () {
				expect(item.id).toBeUndefined();
				expect(socket.itemCount()).toEqual(originalCount);

				socket.flush();
				expect(item.id).toEqual(socket.itemCount());
				expect(socket.itemCount()).toEqual(originalCount + 1);
			});

			it('dont send $ properties', function () {
				socket.flush();

				var items = socket.items();
				expect(items[items.length - 1].$save).toBeUndefined();
				expect(items[items.length - 1].$resolved).toBeUndefined();
			});

			it('used success callback', function () {
				item.$save(successHandler, errorHandler);
				socket.flush();
				expect(successHandler).toHaveBeenCalled();
				expect(errorHandler).not.toHaveBeenCalled();
			});

			it('used error callback', function () {
				item.unique = '4aa';
				item.$save(successHandler, errorHandler);
				socket.flush();
				expect(successHandler).not.toHaveBeenCalled();
				expect(errorHandler).toHaveBeenCalled();
			});

			it('does not cache when cache=false', function () {
				var items = service.nocache();
				socket.flush();
				expect(items).toBeDefined();
				expect(items.length).toEqual(originalCount);

				item.$save();
				socket.flush(); // with cache false the list should not be updated
				expect(items.length).toEqual(originalCount);
			});

			it('has $promise and $resolve', function () {
				socket.flush();
				expect(item.$promise).toBeDefined();
				expect(item.$resolved).toBeTruthy();
			});
		});

		describe('updates >', function () {

			var item;
			beforeEach(function () {
				item = service.get({id: 1});
				socket.flush();
			});

			it('changes the item asynchronously', function () {
				expect(item.lastUpdate).toBeUndefined();

				item.data = 'zzz';
				item.$save();

				socket.flush();
				expect(item.lastUpdate).toBeDefined();
			});

			it('does not send $ properties', function () {
				item.$save();
				socket.flush();
				expect(socket.items()[0].$save).toBeUndefined();
				expect(socket.items()[0].$resolved).toBeUndefined();
			});

			it('works with custom methods', function () {
				item.data = 'zyz';
				item.$update();
				socket.flush();
				expect(item.lastUpdate).toBeDefined();
			});

			it('use callbacks for success and error', function () {
				item.$save(successHandler, errorHandler);
				socket.flush();
				expect(successHandler).toHaveBeenCalled();
				expect(errorHandler).not.toHaveBeenCalled();

				item.id = 999;
				item.$save(successHandler, errorHandler);
				socket.flush();
				expect(errorHandler).toHaveBeenCalled();
			});
		});

		describe('deletes >', function () {
			var item, originalCount;
			beforeEach(function () {
				item = service.get({id: 1});
				originalCount = socket.itemCount();
				socket.flush();
			});

			it('should remove the item asynchronously', function () {
				item.$delete();
				expect(socket.itemCount()).toEqual(originalCount);
				socket.flush();
				expect(socket.itemCount()).toEqual(originalCount - 1);
			});

			it('should remove the item from all arrays', function () {
				var list = service.query();
				socket.flush();

				item = list[0];
				originalCount = list.length;
				expect(item.id).toBeDefined();

				item.$delete();
				socket.flush();
				expect(list.length).toEqual(originalCount - 1);
				expect(list[0].id).not.toEqual(item.id);
			});

			it('should use callbacks for success and error', function () {
				item.$delete(successHandler, errorHandler);
				socket.flush();
				expect(successHandler).toHaveBeenCalled();
				expect(errorHandler).not.toHaveBeenCalled();

				item.$delete(successHandler, errorHandler);
				socket.flush();
				expect(errorHandler).toHaveBeenCalled();
			});
		});
	});
});
