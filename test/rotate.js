
var assert   = require('assert');
var child    = require('child_process');
var fs       = require('fs');
var path     = require('path');

var ts       = require('../index.js');
var tmpDir   = path.resolve('test','tmp');
var newLine  = 'The rain in spain falls mainly on the plain\n';

describe('tail-stream', function () {

    context('file is rotated', function () {

        it('detects rotation', function (done) {

            var oldPath = path.resolve(tmpDir, 'rotate');
            var childOpts = { env: {
                    TEST_OLD_PATH: oldPath,
                    TEST_NEW_PATH: path.resolve(tmpDir, 'rotate.1'),
                } };

            fs.writeFile(oldPath, newLine, function (err) {
                assert.ifError(err);

                var childDone = false;

                var tstream = ts.createReadStream(oldPath, {
                    beginAt: 'end',
                    onMove: 'follow',
                    endOnError: false,
                });

                tstream.on('error', function(err) {
                    console.error(err);
                    assert.ifError(err);
                });

                tstream.on('data', function(data) {
                    assert.ok(!data);
                });

                tstream.on('move', function(before, after) {

                    assert.equal(oldPath, before);

                    if (after !== null && !/\//.test(after)) {
                        // fully qualify the name
                        after = path.resolve(tmpDir, after);
                    }
                    assert.equal(childOpts.env.TEST_NEW_PATH, after);
                    done();
                });

                // move in a separate process, so this one gets the watch event
                var cp = child.fork('./test/helpers/fileRename.js', childOpts);
                cp.on('message', function (msg) {
                    // example of waiting for child to finish
                    // console.log(msg);
                });
            });
        });

        it('detects rotation concurrently', function (done) {

            var oldPath = path.resolve(tmpDir, 'rotate2');
            var childOpts = { env: {
                    TEST_OLD_PATH: oldPath,
                    TEST_NEW_PATH: path.resolve(tmpDir, 'rotate2.1'),
                } };
            var childDone = false;

            fs.writeFile(oldPath, newLine, function (err) {
                assert.ifError(err);

                var tstream = ts.createReadStream(oldPath, {
                    beginAt: 'end',
                    onMove: 'follow',    // default
                    endOnError: false,
                });

                tstream.on('error', function(err) {
                    console.error(err);
                    assert.ifError(err);
                });

                tstream.on('data', function(data) {
                    assert.ok(!data);
                });

                tstream.on('move', function(before, after) {

                    assert.equal(oldPath, before);

                    if (after !== null && !/\//.test(after)) {
                        // fully qualify the name
                        after = path.resolve(tmpDir, after);
                    }
                    assert.equal(childOpts.env.TEST_NEW_PATH, after);
                    done();
                });

                // rename in a separate process, so this one gets the watch event
                child.fork('./test/helpers/fileRename.js', childOpts);
            });
        });
    });

    context('onMove', function () {

        it('follow, emits append to new file after rotation', function (done) {

            var rolledPath = path.resolve(tmpDir, 'rotateFollow');
            var childOpts = { env: {
                TEST_FILE_PATH: rolledPath,
                TEST_OLD_PATH: rolledPath,
                TEST_NEW_PATH: path.resolve(tmpDir, 'rotateFollow.1'),
                } };

            fs.writeFile(rolledPath, newLine, function (err) {
                assert.ifError(err);

                var tstream = ts.createReadStream(rolledPath, {
                    beginAt: 'end',
                    onMove: 'follow',
                    endOnError: false,
                });

                tstream.on('error', function(err) {
                    console.error(err);
                    assert.ifError(err);
                });

                tstream.on('data', function(data) {
                    // console.log(data.toString());
                    assert.equal(newLine, data);
                    done();
                });

                tstream.on('move', function(before, after) {

                    assert.equal(rolledPath, before);

                    if (after !== null && !/\//.test(after)) {
                        // fully qualify the name
                        after = path.resolve(tmpDir, after);
                    }
                    assert.equal(childOpts.env.TEST_NEW_PATH, after);

                    child.fork('./test/helpers/fileAppend.js', { env: {
                        TEST_FILE_PATH: childOpts.env.TEST_NEW_PATH,
                        TEST_LOG_LINE: newLine,
                        } }
                    );
                });

                // move in a separate process, so this one gets the watch event
                child.fork('./test/helpers/fileRename.js', childOpts);
            });
        });

        it('stay, emits append to old file after rotation', function (done) {

            var rolledPath = path.resolve(tmpDir, 'rotateStay');
            var childOpts = { env: {
                TEST_OLD_PATH: rolledPath,
                TEST_NEW_PATH: path.resolve(tmpDir, 'rotateStay.1'),
                } };

            fs.writeFile(rolledPath, newLine, function (err) {
                assert.ifError(err);

                var tstream = ts.createReadStream(rolledPath, {
                    beginAt: 'end',
                    onMove: 'stay',
                    endOnError: false,
                    useWatch: true,
                });

                tstream.on('error', function(err) {
                    console.error(err);
                    assert.ifError(err);
                });

                tstream.on('eof', function() {
                    // console.log('Reached end of file.');
                });

                tstream.on('data', function(data) {
                    // console.log(data.toString());
                    assert.equal(newLine, data);
                    done();
                });

                tstream.on('replace', function() {
                    // console.log('the file was replaced!');
                });

                tstream.on('move', function(before, after) {
                    assert.equal(rolledPath, before);

                    if (after !== null && !/\//.test(after)) {
                        // fully qualify the name
                        after = path.resolve(tmpDir, after);
                    }
                    assert.equal(childOpts.env.TEST_NEW_PATH, after);

                    var cp = child.fork('./test/helpers/fileAppend.js', { env: {
                        TEST_FILE_PATH: childOpts.env.TEST_OLD_PATH,
                        TEST_LOG_LINE: newLine,
                        } }
                    );
                    cp.on('message', function (msg) {
                        // console.log(msg);
                    });
                });

                // move in a separate process, so this one gets the watch event
                child.fork('./test/helpers/fileRename.js', childOpts);
            });
        });
    });
});
