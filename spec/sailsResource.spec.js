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

        it('should update to a populated Resource array asynchronously', function(done) {
            setTimeout(function() {
                expect(items.length).toEqual(socket.itemCount());
                done();
            }, 750);
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

        it('should update to a populated Resource asynchronously', function(done) {
            setTimeout(function() {
                expect(item.id).toEqual(1);
                expect(item.data).toEqual('abc');
                done();
            }, 750);
        });
    });

    describe('Resource', function() {

        describe('create/post', function() {

            var item, originalCount;
            beforeEach(function() {
                item = new service();
                originalCount = socket.itemCount();
            }, 500);

            it('should create a new item asynchronously', function(done) {
                item.$save();
                expect(item.id).toBeUndefined();
                expect(socket.itemCount()).toEqual(originalCount);

                setTimeout(function() {
                    expect(item.id).toEqual(socket.itemCount());
                    expect(socket.itemCount()).toEqual(originalCount+1);
                    done();
                }, 500);
            });
        });

        describe('updates', function() {

            var item;
            beforeEach(function() {
                item = service.get(1);
            }, 500);

            it('should change the item asynchronously', function(done) {

                expect(item.lastUpdate).toBeUndefined();

                item.data = 'zzz';
                item.$save();

                setTimeout(function() {
                    expect(item.lastUpdate).toBeDefined();
                    done();
                }, 500);
            });
        });

        describe('deletes', function() {

            var item, originalCount;
            beforeEach(function() {
                item = service.get(1);
                originalCount = socket.itemCount();
            }, 500);

            it('should clear the item asynchronously', function(done) {
                item.$delete();
                expect(item.id).toBeDefined();
                expect(socket.itemCount()).toEqual(originalCount);
                setTimeout(function() {
                    expect(item.id).toBeUndefined();
                    done();
                }, 500);
            });
        });
    });

});
