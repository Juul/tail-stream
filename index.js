var stream = require('stream');
var util = require('util');
var fs = require('fs');

function TailStream(path, opts) {
    TailStream.super_.call(this, opts);

    this.lastSize = null;
    this.bytesRead = 0;
    this.watching = false;
    this.path = path;
    this.buffer = Buffer(16 * 1024);

    this.opts = {
        beginAt: 0,
        detectTruncate: true,
        onTruncate: 'end', // or 'reset' to seek to beginning of file
        endOnError: true
    };

    var key;
    for(key in opts) {
        this.opts[key] = opts[key];
    }

    this.fd = fs.openSync(path, 'r');
    this.dataAvailable = true;
    this.firstRead = true;

    this.waitForMoreData = function() {
        if(this.watcher) {
            return;
        }
        if(fs.watch) {
            this.watcher = fs.watch(this.path, {persistent: true}, function(event, filename) {
                if(event == 'change') {
                    this.dataAvailable = true;
                    this.read(0);
                }
            }.bind(this));
        } else {
            fs.watchFile(this.path, {persistent:true, inverval: 500}, this.watchFileCallback);
            this.watcher = true;
        }
    };

    this.watchFileCallback = function(cur, prev) {
        // was the file deleted?
        if(!cur.dev && !cur.ino) {
            if(this.opts.endOnError) {
                this.end('EBADF');
                if(this.listeners('error').length > 0) {
                    this.emit('error', "File was deleted");
                }
            } else {
                this.emit('error', "File was deleted");
            }
            return;
        }
        if(cur.mtime.getTime() > prev.mtime.getTime()) {
            this.dataAvailable = true;
            this.read(0);
        }
        
    }.bind(this);

    this.end = function(errCode) {
        if(errCode != 'EBADF') {
            fs.close(this.fd);
        }
        this.push(null);
        if(this.watcher === true) {
            fs.unwatchFile(this.path, this.watchFileCallback);
        } else {
            this.watcher.close();
        }
    };

    this._read = function(size) {

        if(!this.dataAvailable) {
            return this.push('');
        }
            
        if(this.opts.detectTruncate || (this.firstRead && (this.opts.beginAt == 'end'))) {
            // check for truncate
            fs.stat(this.path, this._readCont.bind(this));
        } else {
            this._readCont();
        }
    };
    
    this._readCont = function(err, stat) {
        if(err) {
            if(this.opts.endOnError) {
                this.end(err.code);
                if(this.listeners('error').length > 0) {
                    this.emit('error', "Error during truncate detection: " + err);
                }
            } else {
                this.emit('error', "Error during truncate detection: " + err);
            }
            stat = null;
        }

        if(stat) {

            // seek to end of file
            if(this.firstRead && (this.opts.beginAt == 'end')) {
                this.bytesRead = stat.size;
                this.dataAvailable = false;
                this.waitForMoreData();
                this.push('');
                this.firstRead = false;
                return;
            } 

            // truncate detection
            if(!this.lastSize) {
                this.lastSize = stat.size;
            } else {
                if(stat.size < this.lastSize) {
                    this.emit('truncate', stat.size, this.lastSize);
                    if(this.opts.onTruncate == 'reset') {
                        this.bytesRead = 0;
                    } else {
                        this.end();
                        return;
                    }
                }
            }
            this.lastSize = stat.size;
        }

        // seek to desired start position
        if(this.firstRead) {
            if(parseInt(this.opts.beginAt) > 0) {
                this.bytesRead = parseInt(this.opts.beginAt);
            }
            this.firstRead = false;
        }

        fs.read(this.fd, this.buffer, 0, this.buffer.length, this.bytesRead, function(err, bytesRead, buffer) {
            if(err) {
                if(this.opts.endOnError) {
                    this.end(err.code);
                    if(this.listeners('error').length > 0) {
                        this.emit('error', err);
                    }
                    return;
                } else {
                    this.waitForMoreData();
                    this.push('');
                    this.emit('error', err);
                }
            }

            if(bytesRead == 0) {
                this.dataAvailable = false;
                this.waitForMoreData();
                this.push('');
                this.emit('eof');
                return;
            }

            this.bytesRead += bytesRead;
            this.push(this.buffer.slice(0, bytesRead));

        }.bind(this));
    };
}

util.inherits(TailStream, stream.Readable);

module.exports = ts = {

    createReadStream: function(path, options) {
        return new TailStream(path, options);
    }

};