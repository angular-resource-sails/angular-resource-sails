var Homepage = function () {
	this.get = function () {
		browser.get('/');
	};

	this.simpleTypes = element.all(by.repeater('simple in home.simpleTypes track by simple.id'));

	this.simpleForm = {
		email: element(by.model('home.simpleForm.email')),
		twoRadio: element.all(by.model('home.simpleForm.oneTwoOrThree')).get(1),
		manyThingsTwo: element(by.model('home.simpleForm.manyThings')),
		submit: element(by.css('button[type=submit]'))
	};


};


describe('homepage read', function () {

	var home = new Homepage();
	home.get();

	it('gets add notification', function () {
		browser.wait(function(){
			return home.simpleTypes.count();
		},8000);

		expect(home.simpleTypes.count()).toEqual(1);
	});

//	it('can add new simple type', function () {
//		home.simpleForm.email.sendKeys('Jason.More@gmail.com');
//		home.simpleForm.twoRadio.click();
//		home.simpleForm.manyThingsTwo.click();
//		home.simpleForm.submit.click();
//
//		expect(home.simpleTypes.count()).toEqual(1);
//	});
});