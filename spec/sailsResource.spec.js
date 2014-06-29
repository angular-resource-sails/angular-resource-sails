describe("sailsResource", function() {

    var service, socket;

    beforeEach(function() {
        module("sailsResource");
        /*inject(function(sailsResource, _$rootScope_, _$window_) {
            socket = _$window_.io.connect();
            service = sailsResource({
                model: "widget",
                socket: socket
            });
        });*/
    });

    it("should query for a list of items", function() {

    });

});
