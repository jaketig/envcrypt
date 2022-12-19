const { Transform } = require('stream');

class MetaAppender extends Transform {
  constructor(iv, opts) {
    super(opts);
    this.iv = iv;
    this.appended = false;
  }

  _transform(chunk, encoding, cb) {
    if (!this.appended) {
      const meta = Buffer.concat([
        Buffer.from(`# DO NOT EDIT MANUALLY\n# Encrypted .env file\n# see https://github.com/jaketig/envcrypt\n`, "utf-8"),
        this.iv
      ]);
      this.push(meta);
      this.appended = true;
    }
    this.push(chunk);
    cb();
  }
}

module.exports = MetaAppender