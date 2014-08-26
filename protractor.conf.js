exports.config = {
	chromeOnly: true,
	specs: ['e2e/**/*.js'],
	baseUrl: 'http://localhost:1337',
	suites: {
		write: 'e2e/**.writeSpec.js',
		read: 'e2e/**.readSpec.js'
	}
};