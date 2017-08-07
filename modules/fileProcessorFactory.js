var fs = require('fs');
var mkdirp = require('mkdirp');
var common = require('../common/common');

function FileProcessorFactory() {
    'use strict';
    this.create = function (config) {
        return new FileProcessor(config);
    };
}

function FileProcessor(config) {
    'use strict';
    var now = new Date();
    var filePath;
    var writeStream;
    var writeNum = 0;
    var logEntriesMap = {};

    if (typeof config.file === 'string') {
        filePath = config.path + config.file;
    } else {
        filePath = config.path + config.target + '.json';
    }

    if (config.mode === 'write') {
        createFile();
    } else {
        preprocessLog();
    }

    this.getEntry = function (req) {
        // console.log(url);

        var nextResponse, hash;

        if (config.queryMatch) {
            hash = common.stringHash(req.url + req.body);
            if (typeof logEntriesMap[hash] === 'undefined') {
                console.log('Url not mapped with query specified: ' + req.url);
                console.log(req.body);
                return null;
            }
            nextResponse = logEntriesMap[hash];
        } else {
            hash = common.stringHash(req.url);
            if (typeof logEntriesMap[hash] === 'undefined') {
                console.log('Url not mapped: ' + req.url);
                return null;
            }
            var responseList = logEntriesMap[hash];
            if (responseList.length === 1) {
                if (responseList[0].ranOut) {
                    console.warn(req.url + ' ran out, responding with the last response');
                }
                nextResponse = responseList[0];
                responseList[0].ranOut = true;
            } else {
                nextResponse = responseList.shift();
            }
        }


        return nextResponse;
    };

    this.close = function () {
        if (writeStream) {
            writeStream.end('\n]');
            writeStream = null;
        }
    };

    this.createNewFile = function () {
        if (config.mode !== 'write') {
            return;
        }
        if (writeStream) {
            writeStream.end(']');
            writeStream = null;
            writeNum = 0;
        }
        createFile();

        if (writeStream) {
            writeStream.write('[');
        }
    };

    this.writeReqBlock = function (text) {
        if (config.mode !== 'write') {
            return;
        }
        if (writeStream) {
            if (writeNum > 0) {
                writeStream.write(',\n');
            } else {
                writeNum++;
            }
            writeStream.write(text);
        } else {
            console.log('No file to write');
        }
    };

    function createFile() {
        var pathStat;
        try {
            pathStat = fs.lstatSync(config.path);
        } catch (e) {
            pathStat = null;
        }

        if (!pathStat || !pathStat.isDirectory()) {
            mkdirp.sync(config.path, { fs: fs });
            console.log('creating path ' + config.path);
        }
        writeStream = fs.createWriteStream(filePath);
        writeStream.write('[\n');
    }

    function preprocessLog() {
        // TODO: improve memory usage with line by line processing
        var log = JSON.parse(fs.readFileSync(filePath, { encoding: 'UTF-8' }));
        var hash;

        log.forEach(function (logEntry) {
            // console.log(logEntry.url);
            if (config.queryMatch) {
                hash = common.stringHash(logEntry.url + logEntry.body);
                if (typeof logEntriesMap[hash] === 'undefined') {
                    logEntriesMap[hash] = logEntry;
                }
            } else {
                hash = common.stringHash(logEntry.url);
                if (typeof logEntriesMap[hash] === 'undefined') {
                    logEntriesMap[hash] = [];
                }
                logEntriesMap[hash].push(logEntry);
            }
        });

    }
}

module.exports = new FileProcessorFactory();
