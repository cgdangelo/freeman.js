var gulp    = require('gulp'),
    coffee  = require('gulp-coffee'),
    lint    = require('gulp-coffeelint'),
    plumber = require('gulp-plumber'),
    rename  = require('gulp-rename'),
    uglify  = require('gulp-uglify'),
    watch   = require('gulp-watch');

gulp.task('scripts', function() {
  gulp.src('freeman.coffee').
  pipe(watch()).
  pipe(plumber()).
  pipe(lint()).
  pipe(coffee()).
  pipe(gulp.dest('./')).
  pipe(uglify()).
  pipe(rename('freeman.min.js')).
  pipe(gulp.dest('./'));
});

gulp.task('default', ['scripts']);
