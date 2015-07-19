
var assert   = require('assert');
var child    = require('child_process');
var fs       = require('fs');
var path     = require('path');

var ts       = require('../index.js');
var tmpDir   = path.resolve('test','tmp');
var newLine  = 'The rain in spain falls mainly on the plain\n';

describe('tail-stream', function () {

    context('file is truncated', function () {

        before(function (done) {
            fs.mkdir(tmpDir, function (err) {
                // console.log('before truncate, wrote 1 line');
                done();
            });
        });

        it('truncation is detected', function (done) {

            var truncPath = path.resolve(tmpDir, 'truncate');

            fs.writeFile(truncPath, newLine, function (err) {
                assert.ifError(err);

                var tstream = ts.createReadStream(truncPath, {
                    beginAt: 0,
                    detectTruncate: true,
                    endOnError: false,
                });

                tstream.on('error', function(err) {
                    assert.ifError(err);
                });

                tstream.on('data', function(data) {
                    // console.log(data.toString());
                    assert.equal(data.toString(), newLine);
                });

                tstream.on('truncate', function(newsize, oldsize) {
                    assert.equal(44, oldsize);
                    assert.equal(0, newsize);
                    done();
                });

                // do in a separate process, so this one gets the watch event
                var cp = child.fork('./test/helpers/fileTruncate.js', { env: {
                    TEST_FILE_PATH: truncPath,
                } });
                cp.on('message', function (msg) {
                    // console.log(msg);
                });
            });
        });

        it('write after truncation is read', function (done) {

            var truncPath = path.resolve(tmpDir, 'truncate');
            var childDone = false;

            fs.writeFile(truncPath, newLine, function (err) {
                assert.ifError(err);

                var tryDone = function () {
                    if (childDone) return done();
                    setTimeout(function () {
                        // console.log('not yet');
                        tryDone();
                    }, 10);
                };

                var tstream = ts.createReadStream(truncPath, {
                    beginAt: 0,
                    detectTruncate: true,
                    endOnError: false,
                });

                tstream.on('error', function(err) {
                    assert.ifError(err);
                });

                tstream.on('data', function(data) {
                    // console.log(data.toString());
                    assert.equal(data.toString(), newLine);
                    tryDone();
                });

                tstream.on('truncate', function(newsize, oldsize) {
                    assert.equal(44, oldsize);
                    assert.equal(0, newsize);

                    child.fork('./test/helpers/fileAppend.js', { env: {
                        TEST_FILE_PATH: truncPath,
                        TEST_LOG_LINE: newLine,
                    } })
                    .on('message', function (msg) {
                        // console.log(msg);
                        childDone = true;
                    });
                });

                // do in a separate process, so this one gets the watch event
                child.fork('./test/helpers/fileTruncate.js', { env: {
                    TEST_FILE_PATH: truncPath,
                } })
                .on('message', function (msg) {
                    // console.log(msg);
                });
            });
        });
    });
});
