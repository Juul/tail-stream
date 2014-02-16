# About #

tail-stream has one function: ts.createReadStream which is like fs.createReadStream, but does not stop reading the file when end of file is reached. Instead, it watches the file using fs.watch if available or fs.watchFile otherwise, and streams data as the file grows. 

If fs.watch is available, then it is used. If not, then fs.watchFile is used.

# Options #

* beginAt: Where to begin reading. Can be an offset in number of bytes or 'end' (default: 0).
* endOnError: If set to true, stream will end if an error occurs (default: true).
* detectTruncate: Perform truncate detections (default: true)
* onTruncate: What to do truncate is detected. Set to 'end' to end the stream, or 'reset' to seek to the beginning of the file and resume reading (default: 'end').

# Events #

## error ##

If opts.endOnError is set, then error events are only emitted if a handler has been registered for error events.

## eof ##

eof events are emitted whenever the end of file is encountered. eof events can be emitted multiple times if someone is writing to the file slower than it is being read.

## truncate ##

truncate events are emitted whenever the filesize is changed to less than the previous file size. It sends along the new size and previous size as arguments.

truncate events are only emitted if opts.detectTruncate is set.

## end ##

The 'end' event is only emitted if an error is encountered and opts.endOnError is set, or if the file is truncated and opts.onTruncate is set to 'end'.

# Example #

```
var ts = require('tail-stream');

var tstream = ts.createReadStream('foo', {
    beginAt: 0,
    detectTruncate: true,
    onTruncate: 'end',
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
```

# FAQ

## What happens if the file is deleted? ##

If endOnError is set, then the stream ends and if an event listener is registered for the error event, an error event is emitted.

If endOnError is not set, then an error event is emittted, whether or not a handler is registered.

## What happens if the file is moved/renamed ##

If fs.watch is not available, then this is detected as a file deletion.

If fs.watch _is_ available and truncate detection is enabled, then errors occur (and the stream is closed if endOnError is set).

If fs.watch is available and truncate detection is _disabled_ then moving the file will not disrupt the stream.

# License #

License is [GPLv3](http://www.gnu.org/licenses/gpl-3.0.html).

