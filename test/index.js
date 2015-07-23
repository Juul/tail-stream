
var assert   = require('assert');
var child    = require('child_process');
var fs       = require('fs');
var path     = require('path');

var testdir  = path.resolve('test','tmp');
var newLine  = 'The rain in spain falls mainly on the plain\n';

before(function (done) {
    // create test/tmp, if not already
    fs.mkdir(testdir, function (err) {
        // assert.ifError(err);
        done();
    });
});

after(function (done) {
    // clean up our tmp files
    fs.readdir(testdir, function (err, files) {
        if (err) console.error(err);
        if (files) {
            files.forEach(function (file) {
                fs.unlinkSync(path.resolve('test','tmp', file));
            });            
        }
        done();
    });
});

describe('tail-stream', function () {

    context('file is appended', function () {

        var filePath = path.resolve('test', 'tmp', 'append');
        before(function (done) {
            fs.writeFile(filePath, newLine, function (err) {
                assert.ifError(err);
                done();
            });
        });

        it('detects appends', function (done) {
            
            dataCount = 0;
            var ts      = require('../index.js');
            var tstream = ts.createReadStream(filePath, {
                beginAt: 'end',
            });

            tstream.on('data', function(data) {
                dataCount++;
                assert.equal(data.toString(), newLine);
                if (dataCount === 2) done();
            });

            tstream.on('error', function(err) {
                assert.ifError(err);
            });

            // append in a separate process, so this one gets the watch event
            child.fork('./test/helpers/fileAppend.js');

            // if these are "too close" together, they can detect as a
            // single append, causing the data equal test to fail.
            setTimeout(function () {
                child.fork('./test/helpers/fileAppend.js');
            }, 10);
        });
    });

    context('file is rotated', function () {
        var oldPath = path.resolve('test', 'tmp', 'old');
        var newPath = path.resolve('test', 'tmp', 'new');

        before(function (done) {
            fs.writeFile(oldPath, newLine, function (err) {
                assert.ifError(err);
                done();
            });
        });

        it('detects rotation', function (done) {

            var ts      = require('../index.js');
            var tstream = ts.createReadStream(oldPath, {
                beginAt: 'end',
                onMove: 'follow',
                endOnError: false
            });

            tstream.on('data', function(data) {
                // console.log(data.toString());
                assert.ok(!data);
            });

            tstream.on('move', function(before, after) {
                assert.equal(oldPath, before);
                if (!/\//.test(after)) {
                    after = path.resolve('test', 'tmp', after);
                }
                assert.equal(newPath, after);
                done();
            });

            tstream.on('error', function(err) {
                assert.ifError(err);
            });

            // move in a separate process, so this one gets the watch event
            child.fork('./test/helpers/fileRename.js');
        });
    });

    context('file is truncated', function () {

        var truncPath = path.resolve('test', 'tmp', 'truncate');
        before(function (done) {
            fs.writeFile(truncPath, newLine, function (err) {
                assert.ifError(err);
                // console.log('before truncate, wrote 1 line');
                done();
            });
        });

        it('truncation is detected', function (done) {

            var ts      = require('../index.js');
            var tstream = ts.createReadStream(truncPath, {
                detectTruncate: true,
                endOnError: false,
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

            tstream.on('error', function(err) {
                assert.ifError(err);
            });

            // do in a separate process, so this one gets the watch event
            child.fork('./test/helpers/fileTruncate.js');
        });
    });
});

describe.skip('tail-stream all events', function () {
    it('has all events', function (done) {

        var filePath = path.resolve('test', 'tmp', 'changeMe');
        fs.writeFile(filePath, newLine, function (err) {
            assert.ifError(err);

            var ts      = require('../index.js');
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
                console.log("Reached end of file.");
            });

            tstream.on('truncate', function(newsize, oldsize) {
                console.log("File truncated from: " + oldsize + " to " + newsize + " bytes");
                done();
            });

            tstream.on('end', function() {
                console.log("Ended");
            });

            tstream.on('error', function(err) {
                console.log("Error: " + err); 
            });

            // in a separate process, so this one gets the watch event
            // child.fork('./test/helpers/fileTruncate.js');
        });
    });
});
