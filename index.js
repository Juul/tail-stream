var stream = require('stream');
var util = require('util');
var fs = require('fs');


function TailStream(path, opts) {
    TailStream.super_.call(this, opts);

    this.path = path;
    this.opts = opts;
    this.src = null;
    this.lastSize = null;
    this.bytesRead = 0;
    this.watching = false;

    this.waitForMoreData = function() {
        if(this.watching) {
            return;
        }
        if(fs.watch) {
            fs.watch(this.path, {persistent: true}, function(event, filename) {
                if(event == 'change') {
                    this.src = null;
                    this.read(0);
                }
            }.bind(this));
        } else {
            fs.watchFile(this.path, {persistent:true, inverval: 500}, function(cur, prev) {
                if(cur.mtime.getTime() > prev.mtime.getTime()) {
                    this.src = null;
                    this.read(0);
                }

            }.bind(this));

        }
        this.watching = true;
    };

    this._read = function(size) {

        if(!this.src) {
            
            // check for truncate
            var start = this.bytesRead;
            var stat = fs.statSync(this.path);
            if(!this.lastSize) {
                this.lastSize = stat.size;
                start = 0;
            } else {
                if(stat.size < this.lastSize) {
                    this.emit('truncate', stat.size, this.lastSize);
                    return this.push('');
                }
            }
            this.lastSize = stat.size;

            // don't do anything if there is nothing to read
            if(stat.size == this.bytesRead) {
                return this.push('');
            }

            this.src = fs.createReadStream(this.path, {
                start: start
            });

            this.src.on('readable', function() {
                this.read(0);
            }.bind(this));

            this.src.on('end', function() {
                this.src.destroy();
                this.waitForMoreData();
                this.push('');
                this.emit('eof');
            }.bind(this));

            this.src.on('error', function(err) {
                this.src.destroy();
                this.emit('error', err);
            }.bind(this));
        }
        var data = this.src.read(size);
        if(data) {
            this.bytesRead += data.length;
            this.push(data);
        } else {
            this.push('');
        }
    };
}

util.inherits(TailStream, stream.Readable);

module.exports = ts = {

    createReadStream: function(path, options) {
        return new TailStream(path, options);
    }

};