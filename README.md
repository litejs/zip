
[1]: https://badgen.net/coveralls/c/github/litejs/zip
[2]: https://coveralls.io/r/litejs/zip
[3]: https://badgen.net/packagephobia/install/@litejs/zip
[4]: https://packagephobia.now.sh/result?p=@litejs/zip
[5]: https://badgen.net/badge/icon/Buy%20Me%20A%20Tea/orange?icon=kofi&label
[6]: https://www.buymeacoffee.com/lauriro


LiteJS Zip &ndash; [![Coverage][1]][2] [![Size][3]][4] [![Buy Me A Tea][5]][6]
==========

Lightweight (~1.3KB) ZIP file creator for Browser and Node.js. No dependencies.  
Uses the CompressionStream API when available; otherwise will generate uncompressed ZIP.


createZip(files [, options] [, callback])

 - files: Array of `{name, content[, time]}`
 - options: `{ deflate: deflateRawSync, comment: 'Comment for a file' }` (optional custom deflater makes ZIP creation synchronous)
 - callback: Optional `(err, zip)` callback

Returns a `Promise<Uint8Array>`, or invokes provided `callback`, or the ZIP synchronously when using a custom deflater.


Examples
--------

```javascript
const { createZip } = require("@litejs/zip")

// Async usage
const zipUint8Array = await createZip([
    { name: "file-a.txt", content: "Some content" },
    { name: "dir/file-b.txt", content: Uint8Array.from("012"), time: new Date(2020, 1, 21) },
])

// Callback style
createZip(files, { comment: "Some comment for a zip file" }, (err, zipUint8Array) => {
    // Handle ZIP file content
})

// With custom deflate runs synchronously
const zlib = require("zlib")
const zipInSync = createZip(files, { deflate: zlib.deflateRawSync })
```

## Contributing

Follow [Coding Style Guide](https://github.com/litejs/litejs/wiki/Style-Guide),
run tests `npm install; npm test`.


> Copyright (c) 2023-2025 Lauri Rooden &lt;lauri@rooden.ee&gt;  
[MIT License](https://litejs.com/MIT-LICENSE.txt) |
[GitHub repo](https://github.com/litejs/zip) |
[npm package](https://npmjs.org/package/@litejs/zip) |
[Buy Me A Tea][6]


