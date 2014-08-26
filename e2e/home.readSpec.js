var Homepage = require('./shared/Homepage');

describe('homepage read >', function () {

	var home = new Homepage();
	home.get();

	it('gets add notification', function () {
		browser.wait(function(){
			return home.simpleTypes.count();
		},8000);

		expect(home.simpleTypes.count()).toEqual(1);
	});
});