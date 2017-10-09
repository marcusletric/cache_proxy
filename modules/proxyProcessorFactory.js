var url = require('url');
var http = require('http');
var https = require('https');
var querystring = require('querystring');
var FileProcessorFactory = require('./FileProcessorFactory');

function ProxyProcessorFactory() {
    'use strict';
    this.create = function (config) {
        function ProxyProcessor() {
            var logger = FileProcessorFactory.create(config);
            //var logger = null;


            this.finishStream = function () {
                logger.close();
            };

            this.handler = function (req, res) {
                var reqBody = '';

                if (req.method.toLowerCase() === 'post') {
                    req.on('data', function (chunk) {
                        reqBody += chunk;
                    });

                    req.on('end', function () {
                        req.body = reqBody;
                        makeProxyReq(req, res, config, logger);
                    });
                } else if (req.method.toLowerCase() === 'get') {
                    makeProxyReq(req, res, config, logger);
                }
            };
        }
        return new ProxyProcessor();
    };

    function makeProxyReq(req, res, config, logger) {
        if (config.mode === 'write') {
            var reqOpts = buildReqOptions(req, config);
            var logObj = {
                timestamp: (new Date().getTime()),
                method: req.method,
                url: req.url,
                body: req.body
            };
            //console.log(reqOpts.method + ' ' + reqOpts.hostname + reqOpts.path);
            //console.log("REQUEST: " + JSON.stringify(reqOpts, null, 2) + "\n");

            var proxyReq = https.request(reqOpts, function (proxyRes) {
                var data;
                proxyRes.on('data', function (d) {
                    if(!data) {
                        data = Buffer.from(d);
                    } else {
                        data = Buffer.concat([data, d]);
                    }
                    //console.log(d);
                });
                proxyRes.on('end', function () {
                    logObj.statusCode = proxyRes.statusCode;
                    logObj.headers = proxyRes.headers;
                    logObj.response = data;
                    logObj.rspTime = new Date().getTime() - logObj.timestamp;
                    //console.log(JSON.stringify(logObj, null, 2) + "\n");
                    logger.writeReqBlock(JSON.stringify(logObj));
                    res.writeHead(proxyRes.statusCode, createRspHeaders(proxyRes.headers, config));
                    res.end(data);
                });
            });

            proxyReq.on('error', function (e) {
                console.error(e);
            });
            if (reqOpts.method.toLowerCase() === 'post') {
                proxyReq.write(reqOpts.body);
            }
            proxyReq.end();
        } else if (config.mode === 'read') {
            var logEntry = logger.getEntry(req);
            if (!logEntry) {
                res.writeHead(500, {});
                res.end('Offline proxy data error');
            } else {
                res.writeHead(logEntry.statusCode, createRspHeaders(logEntry.headers, config));
                res.end(Buffer.from(logEntry.response));
            }
        }
    }

    function buildReqOptions(origReq, config) {
        var proxiedPath = url.parse(origReq.url, true).path;
        var skipHeaders = [];

        var newConf = {
            hostname: config.target,
            path: proxiedPath,
            method: origReq.method,
            port: config.proxiedPort,
            rejectUnauthorized: false,
        };

        var origHeaders = Object.keys(origReq.headers);
        if (origHeaders.length > 0) {
            newConf.headers = {};
        }

        origHeaders.forEach(function (key) {
            var normKey = key.toLowerCase();
            if (skipHeaders.indexOf(normKey) < 0) {
                newConf.headers[normKey] = origReq.headers[key];
            }
        });

        if (origReq.method.toLowerCase() === 'post') {
            newConf.body = origReq.body;
            newConf.headers['content-type'] = 'application/x-www-form-urlencoded';
            newConf.headers['content-length'] = Buffer.byteLength(origReq.body);
        }

        newConf.headers['host'] = url.parse(config.target, true).host;
        //newConf.headers['accept'] = '*/*';

        return newConf;
    }

    function createRspHeaders(origHeaders, config) {
        var keys = Object.keys(origHeaders);
        var newHeaders = {};

        for (var i = 0; i < keys.length; i++) {
            if (keys[i].indexOf('access-control') < 0) {
                newHeaders[keys[i]] = origHeaders[keys[i]];
            }
        }

        newHeaders['x-frame-options'] = 'ALLOW-FROM *.talkdev.co.uk';
        newHeaders['access-control-allow-credentials'] = 'true';
        newHeaders['access-control-allow-origin'] = url.format({
            host: config.host,
            protocol: config.protocol,
        }) + ':9000';

        return newHeaders;
    }
}
module.exports = new ProxyProcessorFactory();
