var gulp = require('gulp');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');

gulp.task('jshint', function() {
  // expr:true stops jshint from complaining about chai assertions that aren't function calls
  return gulp.src(['server.js', 'src/**/*.js', 'test/**/*.js'])
    .pipe(jshint({
        node: true,
        expr: true,
        globals: {
            Promise: true,
            describe: true,
            it: true,
            before: true,
            beforeEach: true,
            after: true,
            afterEach: true
        }
    }))
    .pipe(jshint.reporter(require("jshint-stylish")));
});

gulp.task('test', function() {
  return gulp.src('test/**/*.js')
    .pipe(mocha({reporter: 'spec'}));
});

gulp.task('default', ['jshint', 'test']);
