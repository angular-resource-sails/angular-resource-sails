var gulp = require('gulp');
var process = require('child_process');
var protractor = require("gulp-protractor").protractor;
var webdriver_update = require("gulp-protractor").webdriver_update;
var fs = require('fs');
var path = require('path');

var sailsProcess;

gulp.task('remove-local-sails-db', function (cb) {
	var dbLocation = path.join('example', '.tmp', 'localDiskDb.db');
	fs.unlink(dbLocation, function (err) {
		if (err) {
			console.log('no database file, no worries');
		} else {
			console.log('successfully deleted /tmp/hello');
		}
		cb();
	});
});

gulp.task('sails-lift', ['remove-local-sails-db'], function (cb) {
	sailsProcess = process.spawn('sails', ['lift'], {
		cwd: './example'
	});

	sailsProcess.stdout.on('data', function (data) {
		console.log(data.toString());

		// sails lifted, lets go
		if (data.toString().indexOf('Server lifted') > -1) {
			cb();
		}
	});

	sailsProcess.stderr.on('data', function (data) {
		console.log('e: ' + data);
	});
});

gulp.task('webdriver_update', webdriver_update);

gulp.task('protractor-read', ['sails-lift', 'webdriver_update'], function (cb) {
	runProtractor('read', cb);
});

gulp.task('protractor-write', ['sails-lift', 'webdriver_update'], function (cb) {
	runProtractor('write', cb);
});

gulp.task('protractor', ['protractor-read', 'protractor-write'], function () {
	sailsProcess.kill('SIGINT');
});

gulp.task('default', ['protractor']);

function runProtractor(suite, cb) {
	gulp.src(["./e2e/*.js"])
		.pipe(protractor({
			configFile: "protractor-ci.conf.js",
			args: ['--baseUrl', 'http://localhost:1337', '--suite', suite]
		}))
		.on('error', function (e) {
			sailsProcess.kill('SIGINT');
			cb(e);
		}).on('end', cb);
}