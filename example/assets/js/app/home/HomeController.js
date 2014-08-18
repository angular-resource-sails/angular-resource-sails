app.controller('HomeController', function (sailsResource) {
	var self = this;

	var simple = sailsResource('Simple');

	this.simpleForm = {};
	load();

	this.addClassicNgResource = function () {
		var newSimple = new simple(this.simpleForm);
		newSimple.$save();

		this.simpleForm = {};
	};

	this.addJproWay = function () {
		var newSimple = new simple();
		angular.copy(this.simpleForm, newSimple);
		newSimple.$save();
		load();
	};

	this.deleteSimple = function (simple, index) {
		simple.$delete();
		load();
	};

	function load() {
		self.simpleTypes = simple.query();
	}
});