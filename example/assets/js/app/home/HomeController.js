app.controller('HomeController', function ($rootScope, sailsResource) {
  var self = this;
  var simple = sailsResource('Simple', {
    nocache: {method: 'GET', isArray: true, cache: false},
    count: {method: 'GET', url: '/simple/count'},
    notFound: {method: 'GET', url: '/whoa/there'}
  });

  this.simpleResource = simple;
  this.created = 0;
  this.updated = 0;
  this.destroyed = 0;
  this.simpleForm = new simple();
  this.simpleTypes = simple.query(function () {
    self.refreshServerCount();
  });
  simple.nocache(function (startingTypes) {
    self.startingCount = startingTypes.length;
  });

  this.add = function () {
    self.simpleForm.$save(function (newItem) {
      self.simpleTypes.push(newItem);
      self.refreshServerCount();
    });
    self.simpleForm = new simple();
  };
  this.refreshServerCount = function () {
    // Tests the custom URL functionality
    self.serverCount = simple.count();
  };

  this.cancel = function () {
    self.simpleForm = new simple();
  };
  this.deleteSimple = function (simple) {
    simple.$delete(function () {
      self.refreshServerCount();
    });
  };
  this.editSimple = function (simple) {
    simple.$editing = true;
  };
  this.saveSimple = function (simple) {
    simple.$save();
    simple.$editing = false;
  };
  this.findByEmail = function () {
    self.foundSimple = simple.get({email: self.searchEmail});
    self.searchEmail = '';
  };
  this.causeError = function () {
    simple.notFound(
      function (response) {
      },
      function (response) {
        self.error = response.statusCode;
      });
  };

  $rootScope.$on('$sailsResourceCreated', function () {
    self.created++;
  });
  $rootScope.$on('$sailsResourceUpdated', function () {
    self.updated++;
  });
  $rootScope.$on('$sailsResourceDestroyed', function () {
    self.destroyed++;
  });
});
