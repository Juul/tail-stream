var assert  = require('assert');
var fs      = require('fs');

var filePath = process.env.TEST_FILE_PATH;
var newLine  = process.env.TEST_LOG_LINE ||
	           'you forget to set TEST_LOG_LINE\n';

fs.appendFile(filePath, newLine, function (err) {
    assert.ifError(err);

    process.send('fileAppend -> fs.appendFile: ' + filePath);
});
