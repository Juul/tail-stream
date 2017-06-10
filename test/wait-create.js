var assert   = require('assert');
var child    = require('child_process');
var fs       = require('fs');
var path     = require('path');

var ts       = require('../index.js');
var tmpDir   = path.resolve('test','tmp');
var newLine  = 'The rain in spain falls mainly on the plain\n';

var filePath = path.resolve(tmpDir, 'wait-create');
var childOpts = { env: {
    TEST_FILE_PATH: filePath,
    TEST_LOG_LINE: newLine,
} };



describe('tail-stream', function () {

    context('wait for file creation', function () {

        before(function (done) {
            // create test/tmp, if not already
            fs.mkdir(tmpDir, function (err) {
                fs.unlink(filePath, function(err2) {
                    done();
                });
            });
        });

        it('fails without waitForCreate option', function (done) {
            assert.throws(
                function() {
                    ts.createReadStream(filePath);
                }
            );
            done();
        });
        
        it('detect append after file creation', function (done) {
            var tstream = ts.createReadStream(filePath, {
                waitForCreate: true
            });

            tstream.on('data', function (data) {
                assert.equal(data.toString(), newLine);
                done();
            });
            child.fork('./test/helpers/fileAppend.js', childOpts);
        });

        /*it('', function (done) {

            dataCount = 0;

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
            var cp = child.fork('./test/helpers/fileAppend.js', childOpts);
            cp.on('message', function (msg) {
                // console.log(msg);
                var cp2 = child.fork('./test/helpers/fileAppend.js', childOpts);
                cp2.on('message', function (msg) {
                    // console.log(msg);
                });
            });
        });*/
    });
});
