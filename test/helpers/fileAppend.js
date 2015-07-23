
var assert  = require('assert');
var fs      = require('fs');
var path    = require('path');

var filePath = path.resolve('test', 'tmp', 'append');
var newLine  = 'The rain in spain falls mainly on the plain\n';

fs.appendFile(filePath, newLine, function (err) {
    assert.ifError(err);
    // console.log('fileAppend -> fs.appendFile: ' + filePath);
});
