
var assert  = require('assert');
var fs      = require('fs');
var path    = require('path');

var oldPath = path.resolve('test', 'tmp', 'old');
var newPath = path.resolve('test', 'tmp', 'new');

fs.rename(oldPath, newPath, function (err) {
    assert.ifError(err);
    // console.log('fileRename -> fs.rename: ' + oldPath + ' -> ' + newPath);
});
