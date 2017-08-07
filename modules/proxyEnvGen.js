var fs = require('fs');
var url = require('url');

function proxyEnvGen(origEnv, proxyConfig) {
    'use strict';
    var newEnv = JSON.parse(JSON.stringify(origEnv));
    var proxyMap = {};
    var urlRegex = new RegExp(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/);
    var portToUrlMap = {};

    rewriteUrls(newEnv);

    function createProxyUrl(origUrl) {

        if (proxyMap[origUrl]) {
            return proxyMap[origUrl];
        }

        var urlObj = url.parse(origUrl);
        var port = 3000 + Object.keys(proxyMap).length;

        var proxiedUrl = urlObj.protocol + '//' + proxyConfig.host + ':' + port + urlObj.path;
        proxyMap[origUrl] = proxiedUrl;
        portToUrlMap[port] = {
            'host': urlObj.host,
            'file': urlObj.host + '.json',
        };
        return proxiedUrl;
    }

    function rewriteUrls(obj) {
        var keys = Object.keys(obj);
        for (var i = 0; i < keys.length; i++) {
            if (obj[keys[i]] && typeof obj[keys[i]] === 'object') {
                rewriteUrls(obj[keys[i]]);
            } else if (typeof obj[keys[i]] === 'string') {
                if (obj[keys[i]].match(urlRegex)) {
                    obj[keys[i]] = createProxyUrl(obj[keys[i]]);
                }
            }
        }

    }

    proxyConfig.portToUrlMap = portToUrlMap;
    fs.writeFileSync('cache_proxy/currentProxies.json', JSON.stringify(proxyConfig, null, 4));
    return newEnv;
}

module.exports = proxyEnvGen;
