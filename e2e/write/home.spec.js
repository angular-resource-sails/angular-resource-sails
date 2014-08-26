var Homepage = function() {
	this.get = function() {
		browser.get('http://localhost:1337');
	};

	this.simples = element.all(by.repeater('simple in home.simpleTypes track by simple.id'));

	this.email = element(by.model('home.simpleForm.email'));
	this.twoRadio = element.all(by.model('home.simpleForm.oneTwoOrThree')).get(1);
	this.manyThings = element(by.model('home.simpleForm.manyThings'));
	this.submit = element(by.css('button[type=submit]'));
};


describe('homepage', function() {

	var home = new Homepage();
	home.get();

	it('simple list should be empty', function() {
		expect(home.simples.count()).toEqual(0);
	});

	it('can add new simple type', function () {
		home.email.sendKeys('Jason.More@gmail.com');
		home.twoRadio.click();
		home.manyThings.click();
		home.submit.click();

		expect(home.simples.count()).toEqual(1);
	});
});