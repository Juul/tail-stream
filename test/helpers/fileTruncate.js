var assert  = require('assert');
var fs      = require('fs');
var path    = require('path');

var filePath = process.env.TEST_FILE_PATH;

fs.truncate(filePath, 0, function (err) {
	if (err) {
		console.error('test/fileTruncate -> fs.truncate got error');
	 	console.error(err);
	 	return;
	}

    process.send('fileTruncate -> fs.truncate: ' + filePath);
});
