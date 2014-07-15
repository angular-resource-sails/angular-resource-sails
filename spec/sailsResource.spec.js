describe("sailsResource", function() {

    var service;

    beforeEach(function() {
        module("sailsResource");
        inject(function(sailsResource, mockSocket) {
            service = sailsResource({
                model: "widget",
                socket: mockSocket
            });
        });
    });

    describe("when querying", function() {

        var items;
        beforeEach(function() {
            items = service.query();
        });

        it("should return an empty array immediately", function() {
            expect(items).toBeDefined();
            expect(items.length).toBe(0);
        });

        it("should update to a populated array asynchronously", function(done) {
            setTimeout(function() {
                expect(items.length).toBe(3);
                done();
            }, 750);
        });
    });

    describe("when getting", function() {

        var item;
        beforeEach(function() {
            item = service.get();
        });

        it("should return an empty object immediately", function() {
            expect(item).toBeDefined();
            expect(item.id).toBeUndefined();
        });

        it("should update to a populated object asynchronously", function(done) {
            setTimeout(function() {
                expect(item.id).toBe(1);
                done();
            }, 750);
        });
    });

});
