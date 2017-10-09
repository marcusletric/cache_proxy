var https = require('https');
var http = require('http');
var fs = require('fs');
var proxyProcessorFactory = require('./proxyProcessorFactory');

var sslOptions = {
    key: fs.readFileSync('conf/ssl/local.gen7.talkdev.co.uk.key', 'utf8'),
    cert: fs.readFileSync('conf/ssl/local.gen7.talkdev.co.uk.crt', 'utf8'),
    ca: fs.readFileSync('conf/ssl/ca.crt', 'utf8'),
};

function proxyServer(config) {
    'use strict';
    var listenCallback = function () { return null;};

    this.proxyProcessor = proxyProcessorFactory.create(config);

    this.start = function () {
        //this.server = https.createServer(sslOptions, this.proxyProcessor.handler).listen(config.port, config.host, listenCallback);
        this.server = http.createServer(this.proxyProcessor.handler).listen(config.port, config.host, listenCallback);
    };

    this.setCallback = function (callback) {
        listenCallback = callback;
    };
}

module.exports = proxyServer;
