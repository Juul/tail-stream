# About #

Tail stream has one function: ts.createReadStream which is like fs.createReadStream, but does not stop reading the file when end of file is reached. Instead, it watches the file using fs.watch if available or fs.watchFile otherwise, and streams data as the file grows. The 'end' event is never emitted.

# Addition events #

## eof ##

'eof' is emitted whenever the end of file is encountered.

## truncate ##

'truncate' is emitted whenever the filesize is changed to less than the previous file size. It sends along the new size and previous size as arguments.

# Example #

```
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
```
# Known bugs #

The 'eof' events are emitted before the 'data' event that should preceed them.

# License #

License is [GPLv3](http://www.gnu.org/licenses/gpl-3.0.html).

