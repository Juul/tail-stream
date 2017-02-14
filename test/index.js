
var assert   = require('assert');
var child    = require('child_process');
var fs       = require('fs');
var path     = require('path');

var ts       = require('../index.js');
var tmpDir   = path.resolve('test','tmp');
var newLine  = 'The rain in spain falls mainly on the plain\n';

/*
before(function (done) {
    // create test/tmp, if not already
    fs.mkdir(tmpDir, function (err) {
        // assert.ifError(err);
        done();
    });
});

after(function (done) {
    // clean up our tmp files
    fs.readdir(tmpDir, function (err, files) {
        if (err) console.error(err);
        if (files) {
            files.forEach(function (file) {
                fs.unlinkSync(path.resolve(tmpDir, file));
            });
        }
        done();
    });
});
*/

describe.skip('tail-stream all events', function () {
    it('has all events', function (done) {

        var filePath = path.resolve(tmpDir, 'changeMe');
        var childOpts = { env: { TEST_FILE_PATH: filePath } };

        fs.writeFile(filePath, newLine, function (err) {
            assert.ifError(err);

            var tstream = ts.createReadStream(filePath, {
                onMove: 'follow',
                detectTruncate: true,
                onTruncate: 'end', // or 'reset' to seek to beginning of file
                endOnError: false,
                // useWatch: true,
            });

            tstream.on('data', function(data) {
                console.log(data.toString());
            });

            tstream.on('move', function(oldpath, newpath) {
                console.log(arguments);
            });

            tstream.on('eof', function() {
                console.log('Reached end of file.');
            });

            tstream.on('truncate', function(newsize, oldsize) {
                console.log('File truncated from: ' + oldsize + ' to ' +
                    newsize + ' bytes');
                done();
            });

            tstream.on('end', function() {
                console.log('Ended');
            });

            tstream.on('error', function(err) {
                console.log('Error: ' + err);
            });

            // in a separate process, so this one gets the watch event
            // child.fork('./test/helpers/file_____.js', childOpts);
        });
    });
});
