/////////////////////////////
// Dear end user:
// if you try to run `protractor`, its not really going to work
// please use `gulp protractor` to run the protractor tests
// Thanks! Jason
/////////////////////////////

exports.config = {
	chromeOnly: true,
	specs: ['e2e/**/*.js'],
	baseUrl: 'http://localhost:1337',
	suites: {
		write: ['e2e/shared/**.js','e2e/**.writeSpec.js'],
		read: ['e2e/shared/**.js','e2e/**.readSpec.js']
	}
};