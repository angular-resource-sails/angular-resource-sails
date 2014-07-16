describe('sailsResource', function() {

    var service, socket;

    beforeEach(function() {
        module('sailsResource');
        inject(function(sailsResource, mockSocket) {
            socket = mockSocket;
            service = sailsResource({
                model: 'widget',
                socket: socket
            });
        });
    });

    afterEach(function() {
        socket.flush();
    });

    it('requires a model name', inject(function(sailsResource) {
        expect(function() {
            sailsResource();
        }).toThrow();
        expect(function() {
            sailsResource('');
        }).toThrow();
        expect(function() {
            sailsResource({model: null});
        }).toThrow();
    }));

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
    });

    describe('gets', function() {

        var item;
        beforeEach(function() {
            item = service.get(1);
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
    });

    describe('Resource', function() {

        describe('create/post', function() {

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
        });

        describe('updates', function() {

            var item;
            beforeEach(function() {
                item = service.get(1);
                socket.flush();
            });

            it('should change the item asynchronously', function() {

                expect(item.lastUpdate).toBeUndefined();

                item.data = 'zzz';
                item.$save();

                socket.flush();
                expect(item.lastUpdate).toBeDefined();
            });
        });

        describe('deletes', function() {

            var item, originalCount;
            beforeEach(function() {
                item = service.get(1);
                originalCount = socket.itemCount();
                socket.flush();
            });

            it('should clear the item asynchronously', function() {
                item.$delete();
                expect(item.id).toBeDefined();
                expect(socket.itemCount()).toEqual(originalCount);

                socket.flush();
                expect(item.id).toBeUndefined();
            });
        });
    });

});
