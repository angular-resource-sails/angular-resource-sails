
exports.config = {
	specs: ['e2e/**/*.js'],
	baseUrl: 'http://localhost:1337',
	suites: {
		write: ['e2e/shared/**.js','e2e/**.writeSpec.js'],
		read: ['e2e/shared/**.js','e2e/**.readSpec.js']
	},



	sauceUser: process.env.SAUCE_USERNAME,
	sauceKey: process.env.SAUCE_ACCESS_KEY,
	capabilities: {
		'browserName': 'chrome',
		'platform': 'Windows 7',
		'tunnel-identifier': process.env.TRAVIS_JOB_NUMBER,
		'build': process.env.TRAVIS_BUILD_NUMBER,
		'name': 'angular-resource-sails realtime integration'
	}

//	seleniumServerJar: './node_modules/protractor/selenium/selenium-server-standalone-2.42.2.jar'


};