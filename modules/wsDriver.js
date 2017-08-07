var ws = require('nodejs-websocket');
var fs = require('fs');
var extend = require('util')._extend;
var Q = require('q');

function wsDriver(host, port) {
    'use strict';
    var listener = null;
    var self = this;
    var connection;


    this.connect = function () {
        var connDeferred = Q.defer();
        connection = ws.connect('ws://' + host + ':' + port + '/');
        connection.on('connect', function () {
            connDeferred.resolve(true);
        });
        return connDeferred.promise;
    };

    this.disconnect = function () {
        connection.close();
    };

    this.startProxies = function (config) {
        var srvDeferred = Q.defer();
        if (listener) {
            connection.removeListener('text', listener);
        }

        connection.send(JSON.stringify({
            command: 'startProxies',
            config: extend(
                JSON.parse(
                    fs.readFileSync(
                        './cache_proxy/currentProxies.json',
                        { encoding: 'UTF-8' }
                    )
                ),
                config),
        }));

        listener = function (str) {
            if (str === 'started') {
                srvDeferred.resolve(true);
            }
        };
        connection.on('text', listener);
        return srvDeferred.promise;
    };

    this.stopProxies = function () {
        var srvDeferred = Q.defer();
        if (listener) {
            connection.removeListener('text', listener);
        }

        connection.send(JSON.stringify({
            command: 'stopProxies',
        }));

        listener = function (str) {
            if (str === 'stopped') {
                srvDeferred.resolve(true);
            }
        };
        connection.on('text', listener);
        return srvDeferred.promise;
    };
}

module.exports = wsDriver;
