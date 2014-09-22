app.controller('HomeController', function ($rootScope, sailsResource) {
	var self = this;
	var simple = sailsResource('Simple');

	this.created = 0;
	this.updated = 0;
	this.destroyed = 0;
	this.simpleForm = new simple();
	this.simpleTypes = simple.query();

	this.add = function () {
		self.simpleForm.$save(function(newItem) {
			self.simpleTypes.push(newItem);
		});
		self.simpleForm = new simple();
	};
	this.cancel = function () {
		self.simpleForm = new simple();
	};
	this.deleteSimple = function (simple) {
		simple.$delete();
	};
	this.editSimple = function (simple) {
		simple.$editing = true;
	};
	this.saveSimple = function (simple) {
		simple.$save();
		simple.$editing = false;
	};

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