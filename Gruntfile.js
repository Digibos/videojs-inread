'use strict';

module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
    '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
    '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author %>;' +
    ' Licensed <%= pkg.license %> */\n',
    clean: {
      files: ['dist']
    },
    connect: {
      server: {
        options: {
          livereload: true,
          open: true,
          port: 9000,
          hostname: '*'
        }
      }
    },


    concat: {
      options: {
        banner: '<%= banner %>',
        stripBanners: true
      },
      dist: {
        files: [
          {
            src: [
              'lib/inread.js',
              //===VAST CORE ===//
              'lib/vast/core/vast-core-object.js',
              'lib/vast/xml/xml-parser.js',

              'lib/vast/component/ad-separator.js',
              'lib/vast/component/skip-ad-button.js',
              'lib/vast/component/mute-ad-button.js',

              'lib/vast/request/bucket.js',
              'lib/vast/request/tracker.js',
              'lib/vast/request/vast-xhr.js',
              'lib/vast/request/local-storage.js',
              'lib/vast/request/ad-call-module.js',

              'lib/vast/core/core.js',

              'lib/vast/model/trackable.js',
              'lib/vast/model/creative.js',
              'lib/vast/model/ad.js',
              'lib/vast/model/linear-creative.js',
              'lib/vast/model/non-linear-creative.js',
              'lib/vast/model/companion.js',
              'lib/vast/model/media-file.js',

              'lib/vast/core/main.js'
            ],
            dest: 'dist/<%= pkg.name %>.js'
          }
        ]
      }

    },
    uglify: {
      options: {
        banner: '<%= banner %>'
      },
      dist: {
        src: '<%= concat.dist.dest %>',
        dest: 'dist/<%= pkg.name %>.min.js'
      }
    },
    qunit: {
      files: 'test/**/*.html'
    },
    jshint: {
      gruntfile: {
        options: {
          node: true
        },
        src: 'Gruntfile.js'
      },
      src: {
        options: {
          jshintrc: '.jshintrc'
        },
        src: ['lib/**/*.js']
      },
      test: {
        options: {
          jshintrc: '.jshintrc'
        },
        src: ['test/**/*.js']
      }
    },
    watch: {
      options: {
        livereload: true
      },
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      demo: {
        files: 'demo/**/*.html',
        tasks: ['jshint:src', 'qunit']

      },
      src: {
        files: '<%= jshint.src.src %>',
        tasks: ['jshint:src', 'qunit','concat']
      },
      test: {
        files: '<%= jshint.test.src %>',
        tasks: ['jshint:test', 'qunit']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default',
    ['clean',
      'jshint',
      'concat',
      'uglify',
      'qunit']);

  grunt.registerTask('serve',
    ['connect', 'watch']);
};
