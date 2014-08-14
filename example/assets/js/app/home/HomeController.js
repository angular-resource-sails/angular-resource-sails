app.controller('HomeController', function (sailsResource) {
  var simple = sailsResource('Simple');

  this.simpleForm = {};

  this.simpleTypes = simple.query();

  this.addClassicNgResource = function () {
    var newSimple = new simple(this.simpleForm);
    newSimple.$save();

    this.simpleForm = {};
  };

  this.addJproWay = function(){
    var newSimple = new simple();
    angular.copy(this.simpleForm, newSimple);
    newSimple.$save();
  };
});