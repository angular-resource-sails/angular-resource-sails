var Homepage = require('./shared/Homepage');


describe('homepage write >', function () {

	var home = new Homepage();

	it('simple list should be empty', function () {
		expect(home.simpleTypes().count()).toEqual(0);
	});

	it('can add new simple type', function () {
		home.simpleForm.emailInput().sendKeys('Jason.More@gmail.com');
		home.simpleForm.twoRadio().click();
		home.simpleForm.manyThingsTwo().click();
		home.simpleForm.submit().click();

		expect(home.simpleTypes().count()).toEqual(1);
	});

	it('can update new item', function(){
		home.simple.edit().click();

		home.simple.emailInput().clear();
		home.simple.emailInput().sendKeys('foo@bar.com');

		home.simple.oneTwoOrThreeDropdown().click();
		home.simple.dropdownOptionThree().click();

		home.simple.save().click();

		// need expect so this test runs and triggers for the readSpec test
		expect(1).toEqual(1);
	});
});