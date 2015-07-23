
var assert  = require('assert');
var fs      = require('fs');
var path    = require('path');

var filePath = path.resolve('test', 'tmp', 'new'); // cross platform happy
var newLine  = 'The rain in spain falls mainly on the plain\n';

fs.writeFile(filePath, newLine, function (err) {
    assert.ifError(err);
    // console.log('fileCreate -> fs.writeFile ' + filePath);
});
