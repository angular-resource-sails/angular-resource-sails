describe('sailsResource', function() {

    var service;

    beforeEach(function() {
        module('sailsResource');
        inject(function(sailsResource, mockSocket) {
            service = sailsResource({
                model: 'widget',
                socket: mockSocket
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
                expect(items.length).toBe(3);
                done();
            }, 750);
        });
    });

    describe('gets', function() {

        var item;
        beforeEach(function() {
            item = service.get();
        });

        it('should return an empty Resource immediately', function() {
            expect(item).toBeDefined();
            expect(item.id).toBeUndefined();
        });

        it('should update to a populated Resource asynchronously', function(done) {
            setTimeout(function() {
                expect(item.id).toBe(1);
                done();
            }, 750);
        });
    });

    describe('Resource', function() {
        describe('saves', function() {

            var item;
            beforeEach(function() {
                item = service.get();
            }, 500);

            it('should change the value asynchronously', function(done) {
                item.value = 'abc';
                item.$save();
                setTimeout(function() {
                    expect(item.lastUpdate).toBeDefined();
                    done();
                }, 500);
            });
        });
    });

});
