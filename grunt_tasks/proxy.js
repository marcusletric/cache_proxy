var childProcess = require('child_process');

module.exports = function (grunt) {
    'use strict';
    var serverTask = null;
    grunt.registerTask('proxy', 'Task for running proxy server', function (arg1) {
        var done = this.async();

        if (arg1 === 'start') {
            serverTask = childProcess.spawn(
                'node',
                ['server.js', '--websocket-driver=5999'],
                {
                    cwd: './cache_proxy',
                }
            );

            serverTask.stdout.on('data', function (data) {
                if (data.toString('UTF-8') === 'proxy ws driver started\n') {
                    done();
                }
            });

            serverTask.stderr.on('data', function (data) {
                console.log(data.toString('UTF-8'));
                done();
            });
        } else if (arg1 === 'stop' && serverTask) {
            serverTask.kill('SIGINT');
            done();
        }
        process.on('exit', function () {
            serverTask.kill('SIGINT');
        });
    });

    grunt.registerTask('proxyRemoteStart', 'Task for starting proxy server', function (arg1) {
        var ProxyDriver = require('../modules/wsDriver');
        var proxyRemote = new ProxyDriver('127.0.0.1', '5999');
        proxyRemote.connect().then(function () {
            return proxyRemote.startProxies({
                path: './cache/tmp/',
                mode: arg1 && arg1 === 'read' ? 'read' : 'write',
                queryMatch: true,
            });
        });
    });
};
