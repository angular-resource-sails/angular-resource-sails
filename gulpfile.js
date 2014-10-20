var gulp = require('gulp');
var spawn = require('child_process').spawn;
var protractor = require("gulp-protractor").protractor;
var webdriver_update = require("gulp-protractor").webdriver_update;
var fs = require('fs');
var path = require('path');
//var process = require('process');

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
	var sails = (process.platform === "win32" ? "sails.cmd" : "sails");
	sailsProcess = spawn(sails, ['lift'], {cwd: './example'});

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

// for some reason gulp has a hard time closing when using protractor
// this helps force it
gulp.doneCallback = function (err) {
	process.exit(err ? 1 : 0);
};

function runProtractor(suite, cb) {

	var configFile = "protractor.conf.js";

	if (process.env.ci) {
		configFile = "protractor-ci.conf.js";
	}

	gulp.src(["./e2e/*.js"])
		.pipe(protractor({
			configFile: configFile,
			args: ['--baseUrl', 'http://localhost:1337', '--suite', suite]
		}))
		.on('error', function (e) {
			sailsProcess.kill('SIGINT');
			cb(e);
		}).on('end', cb);
}

