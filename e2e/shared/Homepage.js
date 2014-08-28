var Homepage = function () {
	var self = this;

	browser.get('/');

	this.simpleTypes = function () {
		return element.all(by.repeater('simple in home.simpleTypes'));
	};

	this.simpleForm = {
		emailInput: function () {
			return element(by.model('home.simpleForm.email'))
		},
		twoRadio: function () {
			return element.all(by.model('home.simpleForm.oneTwoOrThree')).get(1)
		},
		manyThingsTwo: function () {
			return element(by.model('home.simpleForm.manyThings'))
		},
		submit: function () {
			return element(by.css('button[type=submit]'))
		}
	};

  function newSimple() {
		return self.simpleTypes().first();
	}

	this.simple = {
		edit: function () {
			return newSimple().element(by.css('.btn[ng-click="home.editSimple(simple)"]'));
		},

		emailLabel:function() {
			return newSimple().element(by.css('span[ng-bind="simple.email"]'));
		},

		emailInput:function() {
			return newSimple().element(by.model('simple.email'));
		},

		oneTwoOrThreeLabel:function() {
			return newSimple().element(by.binding('simple.oneTwoOrThree'));
		},

		oneTwoOrThreeDropdown:function() {
			return newSimple().element(by.css('select[ng-model="simple.oneTwoOrThree"]'));
		},

		dropdownOptionThree:function() {
			return self.simple
				.oneTwoOrThreeDropdown()
				.element(by.cssContainingText('option', 'three'));
		},

		save: function(){
			return newSimple().element(by.css('.btn[ng-click="home.saveSimple(simple)"]'));
		}
	};
};

module.exports = exports = Homepage;



