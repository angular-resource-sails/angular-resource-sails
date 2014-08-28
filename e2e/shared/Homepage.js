var Homepage = function () {
	var self = this;

	this.get = function () {
		browser.get('/');
//		browser.wait(function(){
//			return element.all(by.css('h1')).count();
//		},10000);
//		browser.sleep(10000);
	};

	this.simpleTypes = element.all(by.repeater('simple in home.simpleTypes track by simple.id'));

	this.simpleForm = {
		email: element(by.model('home.simpleForm.email')),
		twoRadio: element.all(by.model('home.simpleForm.oneTwoOrThree')).get(1),
		manyThingsTwo: element(by.model('home.simpleForm.manyThings')),
		submit: element(by.css('button[type=submit]'))
	};
};

module.exports = exports = Homepage;