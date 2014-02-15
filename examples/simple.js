#!/usr/bin/env node

var ts = require('tail-stream');

var tstream = ts.createReadStream('foo');

tstream.on('data', function(data) {
    console.log("got data: " + data);
});

tstream.on('eog', function() {
    console.log("reached end of file");
});

tstream.on('truncate', function(newsize, oldsize) {
    console.log("file truncated from: " + oldsize + " to " + newsize);
});
