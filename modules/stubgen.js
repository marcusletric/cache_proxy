var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var readdirp = require('readdirp');
var destination = '../stubs/';
var source = '../cache/';

for (var i = 2; i < process.argv.length; i++) {
    var option = process.argv[i];
    var splitted = option.split('=');
    var key = splitted[0];
    var value = (splitted.length > 1 ? splitted[1] : null);

    switch (key) {
        case 'dest':
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
                destination = value;
            } else {
                console.log('Destination path not specified or not valid, using ' + destination);
            }
            break;

        case 'src':
            if (value && value.length > 0 && fs.existsSync(value)) {
                source = value;
            } else {
                console.log('Source path not specified or not valid, using ' + source);
            }
            break;

        default:
            break;
    }
}

readdirp(
    { root: source, fileFilter: '*.json' },
    function (fileInfo) {
        'use strict';
        processFile(source + fileInfo.path);
    },
    function (err, res) {
        'use strict';
        return null;
    }
);

function processFile(filePath) {
    'use strict';
    var log = JSON.parse(fs.readFileSync(filePath, { encoding: 'UTF-8' }));

    try {
        if (!fs.lstatSync(path).isDirectory()) {
            fs.mkdirSync(path);
        }
    } catch (e) {
        if (e.code === 'ENOENT') {
            fs.mkdirSync(path);
        }
    }


    log.forEach(function (logEntry) {
        var featureName = filePath.replace(source, '').split('/')[0];
        var servicePath = logEntry.url.split('?')[0].split('/');
        var serviceName = servicePath.pop();
        var stubPath = destination + featureName + servicePath.join('/');
        var stubFilePath = stubPath + '/' + serviceName + '.json';

        try {
            if (!fs.lstatSync(stubPath).isDirectory()) {
                mkdirp.sync(stubPath, { fs: fs });
            }
        } catch (e) {
            if (e.code === 'ENOENT') {
                mkdirp.sync(stubPath, { fs: fs });
            }
        }

        fs.writeFileSync(stubFilePath, JSON.stringify(JSON.parse(logEntry.response), null, 4));
    });
}
