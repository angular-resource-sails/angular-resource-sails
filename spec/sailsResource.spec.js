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

    describe('queries', function() {

        var items;
        beforeEach(function() {
            items = service.query();
        });

        it('should return an empty array of Resources immediately', function() {
            expect(items).toBeDefined();
            expect(items.length).toBe(0);
        });

        it('should update to a populated Resource array asynchronously', function(done) {
            setTimeout(function() {
                expect(items.length).toBe(socket.itemCount());
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
                expect(item.id).toBe(1);
                expect(item.data).toBe('abc');
                done();
            }, 750);
        });
    });

    describe('Resource', function() {

        describe('create/post', function() {

            var item;
            beforeEach(function() {
                item = new service();
            }, 500);

            it('should save a new item', function(done) {
                item.$save();
                setTimeout(function() {
                    expect(item.id).toEqual(socket.itemCount());
                    done();
                }, 500);
            });
        });

        describe('updates', function() {

            var item;
            beforeEach(function() {
                item = service.get(1);
            }, 500);

            it('should change the value asynchronously', function(done) {
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

            it('should clear the item', function(done) {
                item.$delete();
                setTimeout(function() {
                    expect(item.id).toBeUndefined();
                    done();
                }, 500);
            });
        });
    });

});
