describe('sailsResource', function() {

    var service, socket;

    beforeEach(function() {
        module('sailsResource');
        inject(function(sailsResource, mockSocket) {
            socket = mockSocket;
            service = sailsResource('widget',
                {
                    'update': { method: 'PUT' },
                    'transformUpdate': { method: 'PUT', transformRequest: function(request) {
                        request.data = 'transformed request';
                        return JSON.stringify(request);
                    }},
                    'transformRetrieve': { method: 'GET', transformResponse: function(response) {
                        response.data = 'transformed response';
                        return response;
                    }}
                },
                {socket: socket});
        });
    });

    afterEach(function() {
        socket.flush();
    });

    it('requires a model name', inject(function(sailsResource) {
        // invalid
        expect(function() {
            sailsResource();
        }).toThrow();
        expect(function() {
            sailsResource('');
        }).toThrow();

        // valid inputs
        expect(function() {
            sailsResource('widget');
        }).not.toThrow();
    }));

    it('should use a given transformRequest', function() {
        var item = service.get({id: 1});
        socket.flush();
        item.$transformUpdate();
        expect(item.data).toBeDefined();
        expect(item.data).toEqual('transformed request');
    });

    it('should use a given transformResponse', function() {
        var item = service.transformRetrieve({id: 1});
        socket.flush();
        expect(item.data).toBeDefined();
        expect(item.data).toEqual('transformed response');
    });

    describe('queries', function() {

        var items;
        beforeEach(function() {
            items = service.query();
        });

        it('should return an empty array of Resources immediately', function() {
            expect(items).toBeDefined();
            expect(items.length).toEqual(0);
        });

        it('should update to a populated Resource array asynchronously', function() {
            socket.flush();
            expect(items.length).toEqual(socket.itemCount());
        });

        it('should use callbacks for success', function() {
            var successHandler = jasmine.createSpy('successHandler');
            var errorHandler = jasmine.createSpy('errorHandler');

            items = service.query(null, successHandler, errorHandler);
            socket.flush();
            expect(successHandler).toHaveBeenCalled();
            expect(errorHandler).not.toHaveBeenCalled();

            // is there ever an error scenario for queries?
        });
    });

    describe('gets', function() {

        var item;
        beforeEach(function() {
            item = service.get({id:1});
        });

        it('should return an empty Resource immediately', function() {
            expect(item).toBeDefined();
            expect(item.data).toBeUndefined();
        });

        it('should update to a populated Resource asynchronously', function() {
            socket.flush();
            expect(item.id).toEqual(1);
            expect(item.data).toEqual('abc');
        });

        it('should use callbacks for success and error', function() {
            var successHandler = jasmine.createSpy('successHandler');
            var errorHandler = jasmine.createSpy('errorHandler');

            item = service.get({id:2}, successHandler, errorHandler);
            socket.flush();
            expect(successHandler).toHaveBeenCalled();
            expect(errorHandler).not.toHaveBeenCalled();

            item = service.get({id:999}, successHandler, errorHandler);
            socket.flush();
            expect(errorHandler).toHaveBeenCalled();
        });
    });

    describe('Resource', function() {

        it('should have custom actions', function() {
            var item = service.get({id:1});
            expect(item.$update).toBeDefined();
        });

        describe('create', function() {

            var item, originalCount;
            beforeEach(function() {
                item = new service();
                originalCount = socket.itemCount();
                socket.flush();
            });

            it('should create a new item asynchronously', function() {
                item.$save();
                expect(item.id).toBeUndefined();
                expect(socket.itemCount()).toEqual(originalCount);

                socket.flush();
                expect(item.id).toEqual(socket.itemCount());
                expect(socket.itemCount()).toEqual(originalCount+1);
            });

            it('should not send $ properties', function() {
                item.$save();
                socket.flush();

                var items = socket.items();
                expect(items[items.length-1].$save).toBeUndefined();
            });

            it('should use callbacks for success', function() {
                var successHandler = jasmine.createSpy('successHandler');
                var errorHandler = jasmine.createSpy('errorHandler');

                item.$save({}, successHandler, errorHandler);
                socket.flush();
                expect(successHandler).toHaveBeenCalled();
                expect(errorHandler).not.toHaveBeenCalled();
            });

            it('should use callbacks for error', function() {
                var successHandler = jasmine.createSpy('successHandler');
                var errorHandler = jasmine.createSpy('errorHandler');

                item.unique = '4aa';
                item.$save({}, successHandler, errorHandler);
                socket.flush();
                expect(successHandler).not.toHaveBeenCalled();
                expect(errorHandler).toHaveBeenCalled();
            });
        });

        describe('updates', function() {

            var item;
            beforeEach(function() {
                item = service.get({id:1});
                socket.flush();
            });

            it('should change the item asynchronously', function() {

                expect(item.lastUpdate).toBeUndefined();

                item.data = 'zzz';
                item.$save();

                socket.flush();
                expect(item.lastUpdate).toBeDefined();
            });

            it('should not send $ properties', function() {
                item.$save();
                socket.flush();
                expect(socket.items()[0].$save).toBeUndefined();
            });

            it('should work with custom methods', function() {
                item.data = 'zyz';
                item.$update();
                socket.flush();
                expect(item.lastUpdate).toBeDefined();
            });

            it('should use callbacks for success and error', function() {
                var successHandler = jasmine.createSpy('successHandler');
                var errorHandler = jasmine.createSpy('errorHandler');

                item.$save({}, successHandler, errorHandler);
                socket.flush();
                expect(successHandler).toHaveBeenCalled();
                expect(errorHandler).not.toHaveBeenCalled();

                item.id = 999;
                item.$save({}, successHandler, errorHandler);
                socket.flush();
                expect(errorHandler).toHaveBeenCalled();
            });
        });

        describe('deletes', function() {

            var item, originalCount;
            beforeEach(function() {
                item = service.get({id:1});
                originalCount = socket.itemCount();
                socket.flush();
            });

            it('should remove the item asynchronously', function() {
                item.$delete();
                expect(socket.itemCount()).toEqual(originalCount);
                socket.flush();
                expect(socket.itemCount()).toEqual(originalCount-1);
            });

            it('should remove the item from all arrays', function() {
                var list = service.query();
                socket.flush();

                item = list[0];
                originalCount = list.length;
                expect(item.id).toBeDefined();

                item.$delete();
                socket.flush();
                expect(list.length).toEqual(originalCount-1);
                expect(list[0].id).not.toEqual(item.id);
            });

            it('should use callbacks for success and error', function() {
                var successHandler = jasmine.createSpy('successHandler');
                var errorHandler = jasmine.createSpy('errorHandler');

                item.$delete({}, successHandler, errorHandler);
                socket.flush();
                expect(successHandler).toHaveBeenCalled();
                expect(errorHandler).not.toHaveBeenCalled();

                item.$delete({}, successHandler, errorHandler);
                socket.flush();
                expect(errorHandler).toHaveBeenCalled();
            });
        });
    });

});
