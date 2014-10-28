var Homepage = require('./shared/Homepage');

describe('homepage write >', function () {

	var home = new Homepage();

	it('simple list should be empty', function () {
		expect(home.simpleTypes().count()).toEqual(0);
	});

	it('does not find nonexistent items', function() {
		home.simpleForm.searchInput().sendKeys('Jason.More@gmail.com');
		home.simpleForm.searchSubmit().click();
		expect(home.simpleForm.found().getText()).toEqual('');
	});

	it('can add new simple type', function () {
		home.simpleForm.emailInput().sendKeys('Jason.More@gmail.com');
		home.simpleForm.twoRadio().click();
		home.simpleForm.manyThingsTwo().click();
		home.simpleForm.submit().click();

		expect(home.simpleTypes().count()).toEqual(1);
        expect(home.clientCount.getText()).toEqual('1');
		expect(home.serverCount.getText()).toEqual('1');
	});

	it('can find existing items', function() {
		home.simpleForm.searchInput().sendKeys('Jason.More@gmail.com');
		home.simpleForm.searchSubmit().click();
		expect(home.simpleForm.found().getText()).toContain('Jason.More@gmail.com');
	});

	it('can update new item', function(){
		home.simple.edit().click();

		home.simple.emailInput().clear();
		home.simple.emailInput().sendKeys('foo@bar.com');

		home.simple.oneTwoOrThreeDropdown().click();
		home.simple.dropdownOptionThree().click();

		home.simple.save().click();

		// need expect so this test runs and triggers for the readSpec test
		expect(home.simple.emailLabel().getText()).toEqual('foo@bar.com');
		expect(home.simple.oneTwoOrThreeLabel().getText()).toEqual('three');
        expect(home.clientCount.getText()).toEqual('1');
		expect(home.serverCount.getText()).toEqual('1');
	});

	it('can delete an item', function() {
		home.simple.delete().click();
		expect(home.simpleTypes().count()).toEqual(0);
        expect(home.clientCount.getText()).toEqual('0');
		expect(home.serverCount.getText()).toEqual('0');
	});

    it('uncached count does not change', function() {
        expect(home.startingCount.getText()).toEqual('0');
    });

	it('receives broadcast messages', function() {
		expect(home.created.getText()).toEqual('1');
		expect(home.updated.getText()).toEqual('1');
		expect(home.destroyed.getText()).toEqual('1');
	});
});