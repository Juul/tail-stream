var assert  = require('assert');
var fs      = require('fs');
var path    = require('path');

var oldPath = process.env.TEST_OLD_PATH || path.resolve('test', 'tmp', 'old');
var newPath = process.env.TEST_NEW_PATH || path.resolve('test', 'tmp', 'new');

fs.rename(oldPath, newPath, function (err) {
    assert.ifError(err);
    process.send('fileRename -> fs.rename: \n\t' + oldPath + ' -> \n\t' + newPath);
});
