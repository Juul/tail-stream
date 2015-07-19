
var assert  = require('assert');
var fs      = require('fs');
var path    = require('path');

var filePath = path.resolve('test', 'tmp', 'truncate');

fs.truncate(filePath, 0, function (err) {
	if (err) {
		console.error('test/fileTruncate -> fs.truncate got error');
	 	console.error(err);
	 	return;
	}
	// console.log('fileTruncate -> fs.truncate: ' + filePath);
});