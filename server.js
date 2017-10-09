var fs = require('fs');
var mkdirp = require('mkdirp');
var ws = require('nodejs-websocket');
var ProxyServer = require('./modules/proxyServer');
var extend = require('util')._extend;

var servers = [];
var webSocketPort = false;
var webSocketConn = null;

// Default configuration for proxies
var proxyConfig = JSON.parse(fs.readFileSync('./config_default.json', { encoding: 'UTF-8' }));

for (var i = 2; i < process.argv.length; i++) {
    var option = process.argv[i];
    var splitted = option.split('=');
    var key = splitted[0];
    var value = (splitted.length > 1 ? splitted[1] : null);

    switch (key) {
        case 'read':
            if (value && value.length > 0 && fs.lstatSync(value).isDirectory()) {
                proxyConfig.path = value;
            } else {
                console.log('Path not specified or not valid, using ' + proxyConfig.path);
            }
            if (proxyConfig.mode === 'write') {
                console.log('Only one mode is supported at the same time.');
                process.exit();
            } else {
                proxyConfig.mode = 'read';
            }
            break;

        case 'write':
            var stat, isDirectory;

            try {
                stat = fs.lstatSync(value);
            } catch (e) {
                if (e.code === 'ENOENT') {
                    mkdirp.sync(value);
                    stat = fs.lstatSync(value);
                }
            }

            isDirectory = stat && stat.isDirectory();

            if (value && value.length > 0 && isDirectory) {
                proxyConfig.path = value;
            } else {
                console.log('Path not specified or not valid, using ' + proxyConfig.path);
            }
            if (proxyConfig.mode === 'read') {
                console.log('Only one mode is supported at the same time.');
                process.exit();
            } else {
                proxyConfig.mode = 'write';
            }
            break;

        case 'config':
            if (value && value.length > 0 && fs.existsSync(value)) {
                proxyConfig = JSON.parse(fs.readFileSync(value, { encoding: 'UTF-8' }));
            } else {
                console.log('Empty path for configuration');
                process.exit();
            }
            break;

        case '--websocket-driver':
            if (value && value.length > 0) {
                webSocketPort = value;
            } else {
                webSocketPort = false;
            }
            break;

        case '--query-match':
            if (value && value.length > 0) {
                proxyConfig.queryMatch = value === 'true';
            } else {
                proxyConfig.queryMatch = false;
            }
            break;

        case '--emulate-delay':
            if (value && value.length > 0) {
                proxyConfig.emulateRspTime = value === 'true';
                console.log('Response time emulation is not implemented yet!');
            } else {
                proxyConfig.emulateRspTime = false;
            }
            break;

        default:
            break;
    }
}

if (!proxyConfig.mode && !webSocketPort) {
    proxyConfig.mode = 'write';
    console.log('No mode specified, entering write mode on path ' + proxyConfig.path + '\n');
}

if (!proxyConfig.portToUrlMap && !webSocketPort) {
    console.log('Proxy config not available, exiting.');
    process.exit();
}

if (!webSocketPort) {
    startProxies(proxyConfig);
} else {
    startWebSocketDriver();
}

function startWebSocketDriver() {
    'use strict';
    console.log('___ Starting proxy ws driver on ' + webSocketPort + '___\n');
    var server = ws.createServer({}, function (conn) {
        webSocketConn = conn;
        conn.on('text', function (str) {
            var message = JSON.parse(str);
            switch (message.command) {
                case 'startProxies':
                    startProxies(message.config, function () {
                        conn.send('started');
                    });
                    break;

                case 'stopProxies':
                    stopProxies();
                    conn.send('stopped');
                    break;
                default:

            }
            return true;
        });
        conn.on('close', function (code, reason) {
            console.log('Connection closed');
        });
    }).listen(webSocketPort, function () {
        console.log('proxy ws driver started');
    });
}

function startProxies(config, callback) {
    'use strict';
    console.log('_______ Starting proxies _______');
    var numStarted = 0;
    var serversStarted = [];

    for (var port in config.portToUrlMap) {
        if (typeof port === 'string') {
            var serverConf = extend({
                port: port,
                proxiedPort: config.portToUrlMap[port].port,
                target: config.portToUrlMap[port].host,
                file: config.portToUrlMap[port].file,
            }, config);
            delete(serverConf.portToUrlMap);

            var serverInstance = new ProxyServer(serverConf);
            serverInstance.setCallback(servingStarted);
            serverInstance.start();
            serversStarted.push(serverInstance);
            console.log(config.portToUrlMap[serverConf.port].host + ':' + serverConf.proxiedPort + '\nproxied to:\n' + serverConf.host + ':' + serverConf.port + '\n________________________________\n');
        }
    }

    servers.push(serversStarted);

    function servingStarted() {
        numStarted++;
        if (numStarted === Object.keys(config.portToUrlMap).length) {
            if (callback) {
                callback();
            }
        }
    }
}

function stopProxies() {
    'use strict';
    servers.forEach(function (serverInstances) {
        serverInstances.forEach(function (proxyServer) {
            proxyServer.proxyProcessor.finishStream();
            proxyServer.server.close();
        });
    });

    servers.length = 0;
}

process.stdin.resume();

function exitHandler(options, err) {
    'use strict';
    if (err) console.log(err.stack);
    if (options.exit) {
        stopProxies();
        console.log('\nBye!');
        process.exit();
    }
}

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
