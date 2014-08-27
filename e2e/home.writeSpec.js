var Homepage = require('./shared/Homepage');


describe('homepage write >', function () {

	var home = new Homepage();
	home.get();

//	browser.wait(function(){
//		return home.headerExists();
//	},10000);

	it('simple list should be empty', function () {
		expect(home.simpleTypes.count()).toEqual(0);
	});

	it('can add new simple type', function () {
		home.simpleForm.email.sendKeys('Jason.More@gmail.com');
		home.simpleForm.twoRadio.click();
		home.simpleForm.manyThingsTwo.click();
		home.simpleForm.submit.click();

		expect(home.simpleTypes.count()).toEqual(1);
	});
});