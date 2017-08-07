var childProcess = require('child_process');

module.exports = function (grunt) {
    'use strict';
    grunt.registerTask('stubgen', 'Task for generating stubs', function () {
        var done = this.async();

        var serverTask = childProcess.spawn(
            'node',
            ['stubgen.js', 'src=../cache/', 'dest=../../src/stubs/'],
            {
                cwd: './cache_proxy/modules',
            }
        );
        /*serverTask.stdout.on('data', function (data) {
            console.log(data.toString('UTF-8'));
        });

        serverTask.stderr.on('data', function (data) {
            console.log(data.toString('UTF-8'));
        });*/
        serverTask.on('exit', function () {
            done();
        });
    });
};
