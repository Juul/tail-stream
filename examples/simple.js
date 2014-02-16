#!/usr/bin/env node

var ts = require('../index.js');

var tstream = ts.createReadStream('foo', {
    detectTruncate: true,
    onTruncate: 'end', // or 'reset' to seek to beginning of file
    endOnError: true

});

tstream.on('data', function(data) {
    console.log("got data: " + data);
});

tstream.on('eof', function() {
    console.log("reached end of file");
});

tstream.on('truncate', function(newsize, oldsize) {
    console.log("file truncated from: " + oldsize + " to " + newsize);
});

tstream.on('end', function() {
    console.log("ended");
});

tstream.on('error', function(err) {
    console.log("error: " + err); 
});