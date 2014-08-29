var Homepage = require('./shared/Homepage');

describe('homepage read >', function () {

	var home = new Homepage();

	it('gets add notification', function () {
		browser.wait(function () {
			return home.simpleTypes().count();
		});

		expect(home.simpleTypes().count()).toEqual(1);
	});

	it('sees emailInput update to foo@bar.com', function () {
		browser.wait(function () {
			return home.simple.emailLabel().getText().then(function (value) {
				return value === "foo@bar.com";
			});
		});

		expect(home.simple.emailLabel().getText()).toEqual('foo@bar.com');
		expect(home.simple.oneTwoOrThreeLabel().getText()).toEqual('three');
	});
});