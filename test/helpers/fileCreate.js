var assert  = require('assert');
var fs      = require('fs');
var path    = require('path');

var filePath = process.env.TEST_FILE_PATH;
var newLine  = process.env.TEST_LOG_LINE ||
	'you forget to set TEST_LOG_LINE\n';

fs.writeFile(filePath, newLine, function (err) {
    assert.ifError(err);
    process.send('fileCreate -> fs.writeFile ' + filePath);
});
