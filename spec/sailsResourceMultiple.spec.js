describe('multiple sailsResources', function() {

    var service1, service2, socket;

    beforeEach(function() {
        module('sailsResource');
        inject(function(sailsResource, mockSocket) {
            socket = mockSocket;
            service1 = sailsResource({
                model: 'widget',
                socket: socket
            });

            service2 = sailsResource({
                model: 'widget',
                socket: socket
            });
        });
    });

    var item1, item2;
    beforeEach(function() {
        item1 = service1.get(1);
        item2 = service2.get(1);
    });

    it('should have the same initial data', function(done) {
        setTimeout(function() {
            expect(item1).toEqual(item2);
            done();
        }, 200);
    });

    describe('update', function() {
        beforeEach(function() {
            item1.data = 'zzz';
            item1.$save();
        });

        it('should send updates to all services', function(done) {
            setTimeout(function() {
                expect(item2).toEqual(item1);
                done();
            }, 200);
        });
    });

    /*describe('create', function() {

        var newItem;
        beforeEach(function() {
            newItem = new service1();
            newItem.data = 'zzz';
            newItem.$save();
        });

        it('should send create to all services', function(done) {
            setTimeout(function() {
                var foundItem = service2.get(newItem.id);
                done();
            }, 200);
        });
    });*/

});
