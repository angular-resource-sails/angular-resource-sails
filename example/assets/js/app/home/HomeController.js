app.controller('HomeController', function ($rootScope, sailsResource) {
	var self = this;

	var simple = sailsResource('Simple');

	this.created = 0;
	this.updated = 0;
	this.destroyed = 0;
	this.simpleForm = new simple();
//	this.simpleForm.perfectDate = new Date(2010, 11, 28, 14, 57);
	load();

	this.add = function () {
		self.simpleForm.$save();
		self.simpleForm = new simple();
		load();
	};

	this.cancel = function () {
		self.simpleForm = new simple();
	};

	this.deleteSimple = function (simple) {
		simple.$delete(function() {
			load();
		});
	};

	this.editSimple = function (simple) {
		simple.$editing = true;
	};

	this.saveSimple = function (simple) {
		simple.$save();
		simple.$editing = false;
	};

	function load() {
		self.simpleTypes = simple.query();
	}

	$rootScope.$on('$sailsResourceCreated', function() {
		self.created++;
	});
	$rootScope.$on('$sailsResourceUpdated', function() {
		self.updated++;
	});
	$rootScope.$on('$sailsResourceDestroyed', function() {
		self.destroyed++;
	});
});