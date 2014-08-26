var gulp = require('gulp');
var protractor = require("gulp-protractor").protractor;

// Start a standalone server
var webdriver_standalone = require("gulp-protractor").webdriver_standalone;

// Download and update the selenium driver
var webdriver_update = require("gulp-protractor").webdriver_update;

// Downloads the selenium webdriver
gulp.task('webdriver_update', webdriver_update);

// Start the standalone selenium server
// NOTE: This is not needed if you reference the
// seleniumServerJar in your protractor.conf.js
gulp.task('webdriver_standalone', webdriver_standalone);

gulp.task('protractor-read', ['webdriver_update'], function (cb) {
	runProtractor('read', cb);
});

gulp.task('protractor-write', ['webdriver_update'], function (cb) {
	runProtractor('write', cb);
});

gulp.task('protractor', ['protractor-read','protractor-write']);

gulp.task('default', function() {
	// place code for your default task here
});

function runProtractor(suite, cb){
	gulp.src(["./e2e/*.js"]).pipe(protractor({
		configFile: "protractor.conf.js",
		args: ['--baseUrl', 'http://localhost:1337', '--suite', suite]
	})).on('error', function(e) {
		cb(e);
	}).on('end', cb);
}