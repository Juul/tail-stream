var path = require('path');
var stream = require('stream');
var util = require('util');
var fs = require('fs');

function TailStream(filepath, opts) {
    TailStream.super_.call(this, opts);

    this.lastSize = null;
    this.bytesRead = 0;
    this.watching = false;
    this.path = path.resolve(filepath);
    this.buffer = new Buffer(16 * 1024);

    this.opts = {
        beginAt: 0,
        detectTruncate: true,
        onMove: 'follow', // or 'end' or 'exit' or 'stay'
        onTruncate: 'end', // or 'reset' to seek to beginning of file
        endOnError: false,
        useWatch: !!fs.watch,
        waitForCreate: false
    };

    var key;
    for(key in opts) {
        this.opts[key] = opts[key];
    }
    
    this._start = function() {
        this.firstRead = true;
        this.waitingForReappear = false;
        try {
            this.fd = fs.openSync(this.path, 'r');
            this.dataAvailable = true;
        } catch(e) {
            if(!opts.waitForCreate) throw e;
            this.fd = null;
            this.dataAvailable = false;
            this.waitForFileToReappear();
        }
    };

    this.getCurrentPath = function(filename) {
        if (filename && !fs.existsSync('/proc')) {
            return filename;
        }
        try {
            return fs.readlinkSync('/proc/self/fd/'+this.fd);
        } catch(e) {
            if(filename) return filename;
            return null;
        }
    };

    this.waitForFileToReappear = function() {
        // if we're using fs.watch, cancel it
        // since it follows moved files
        // we will switch to fs.watchFile
        // until a file re-appears at this.path
        if(this.opts.useWatch) {
            if(this.watcher && this.watcher.close) {
                this.watcher.close();
            }
            this.watcher = null;
        }
        if(this.fd !== null) fs.close(this.fd, function() {
            this.fd = null;
        });
        this.waitingForReappear = true;
        this.waitForMoreData(true);
    };

    this.fileReappeared = function() {
        try {
            this.fd = fs.openSync(this.path, 'r');
        } catch(e) {
            return;
        }
        this.waitingForReappear = false;
        // switch back to fs.watch if supported
        if(this.opts.useWatch) {
            fs.unwatchFile(this.path, this.watchFileCallback);
            this.watcher = null;
            this.waitForMoreData();
        }
        this.emit('replace');
        // reset size and bytes read since this is a new file
        this.lastSize = null;
        this.bytesRead = 0;
    };

    this.move = function(newpath) {
        var oldpath = this.path ? path.resolve(this.path) : null;
        if(this.opts.onMove == 'end') {
            this.path = newpath;
            this.emit('end'); return;
        } else if(this.opts.onMove == 'error') {
            this.path = newpath;
            this.error("File move detected"); return;
        } else if(this.opts.onMove == 'stay') {
            this.emit('move', oldpath, newpath);
            this.waitForFileToReappear();
        } else { // opts.onMove == 'follow
            this.path = newpath;
            this.emit('move', oldpath, newpath);
            // if we were using watchFile, unwatch old file location and watch new file location
            if(this.watcher === true) {
                fs.unwatchFile(oldpath, this.watchFileCallback);
                this.watcher = false;
                this.waitForMoreData();
            } 
        }
    };

    // if forceWatchFile is true,
    // then fs.watchFile is always used instead of fs.watch
    this.waitForMoreData = function(forceWatchFile) {
        if(this.watcher) {
            return;
        }
        if(this.opts.useWatch && !forceWatchFile) {
            this.watcher = fs.watch(this.path, {persistent: true}, function(event, filename) {
                if(event === 'change') {
                    this.dataAvailable = true;
                    this.read(0);
                } else if(event === 'rename') {
                    var newpath = this.getCurrentPath(filename);
                    this.move(newpath);
                }
            }.bind(this));
        } else {
            // On Mac OS X and Linux, watchFile doesn't report the (re)appearance of
            // the file. Watch the enclosing dir and then compare the filename of events
            this.watcher = fs.watch(path.dirname(this.path), {persistent: true}, function(event, filename) {
                if (filename && path.basename(this.path) === filename) {
                    this.fileReappeared();
                }
            }.bind(this));
            // On Mac OS X & Linux (Docker), currently results in ENOENT error
            // fs.watchFile(this.path, {persistent:true, inverval: 500}, this.watchFileCallback);
            // this.watcher = true;
        }
    };

    this.error = function(msg, code) {
        if(this.opts.endOnError) {
            this.end(code);
        } else {
            this.emit('error', msg);
        }
    };

    this.watchFileCallback = function(cur, prev) {
        // was the file moved or deleted?
        if(!cur.dev && !cur.ino) {
            if(this.waitingForReappear) {
                return;
            }
            // check if it was moved
            var newpath = this.getCurrentPath();
            if(!newpath) {
                this.error("File was deleted", 'EBADF');
                return;
            } else {
                this.move(newpath);
            }
        }
        if(this.waitingForReappear) { // file re-appeared
            this.fileReappeared();
        }
        if(cur.mtime.getTime() > prev.mtime.getTime()) {
            this.dataAvailable = true;
            this.read(0);
        }

    }.bind(this);

    this.end = function(errCode) {
        if(errCode != 'EBADF' && this.fd) { 
            fs.close(this.fd, function() {
                this.fd = null;
            });
			this.fd = null;
        }
        this.push(null);
        if(this.watcher === true) {
            fs.unwatchFile(this.path, this.watchFileCallback);
        } else if(this.watcher && this.watcher.close) {
            this.watcher.close();
        }
    };

    this._read = function(size) {

        if(!this.dataAvailable) {
            return this.push('');
        }

        if(!this.path) return this._readCont();

        if((this.opts.detectTruncate || (this.firstRead && (this.opts.beginAt == 'end')))) {
            // check for truncate
            fs.stat(this.path, this._readCont.bind(this));
        } else {
            this._readCont();
        }
    };

    this._readCont = function(err, stat) {
        if(err) {
            if(err.code == 'ENOENT') {
                if (this.opts.onMove !== 'follow') {
                    this.error("File deleted", err.code);
                }
            } else {
                this.error("Error during truncate detection: " + err, err.code);
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
        if(!this.fd) {
            return false;
        }
        fs.read(this.fd, this.buffer, 0, this.buffer.length, this.bytesRead, function(err, bytesRead, buffer) {
            if(err) {
                if(this.opts.endOnError) {
                    this.end(err.code);
                    return;
                } else {
                    this.waitForMoreData();
                    this.push('');
                    this.emit('error', err);
                }
            }

            if(bytesRead === 0) {
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

    this._start();
}

util.inherits(TailStream, stream.Readable);

module.exports = ts = {

    createReadStream: function(path, options) {
        return new TailStream(path, options);
    }
};
