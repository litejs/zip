
[1]: https://badgen.net/coveralls/c/github/litejs/zip
[2]: https://coveralls.io/r/litejs/zip
[3]: https://badgen.net/packagephobia/install/@litejs/zip
[4]: https://packagephobia.now.sh/result?p=@litejs/zip
[5]: https://badgen.net/badge/icon/Buy%20Me%20A%20Tea/orange?icon=kofi&label
[6]: https://www.buymeacoffee.com/lauriro


LiteJS Zip &ndash; [![Coverage][1]][2] [![Size][3]][4] [![Buy Me A Tea][5]][6]
==========

Lightweight (~1.3KB) ZIP file creator for Browser and Node.js. No dependencies.  
Uses the CompressionStream API if available; otherwise uses provided deflater or creates an uncompressed ZIP.


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

Unzip
-----

unzip(src [, options])

 - src: `Uint8Array`, `ArrayBuffer` or `read` function
 - options: lsZip and catZip options

Reads all entries to memory, use lsZip and catZip for individual files.

lsZip(src [, options]) and catZip(src, entry [, options])

 - src: zip bytes or `read` function
 - read: `(start, end) => bytes` with `Uint8Array.subarray` semantics, negative `start` counts from the end.
   Returns the requested bytes or the whole file as `Uint8Array` or `ArrayBuffer`, or a Promise of one.
 - options: `{ tail: 65557 }` for lsZip, bytes read from the end to find the central directory.
   `{ inflate: (data, entry) => bytes }` for catZip, otherwise DecompressionStream is used.
   Limit the output to `entry.size` against zip bombs, DecompressionStream is limited already.

Zip64 is read when 32-bit fields hold real values (under 4 GB / 65534 entries).

```javascript
const { lsZip, catZip, unzip } = require("@litejs/zip/unzip.js")

// Blob or File in browser
const read = (start, end) => file.slice(start, end).arrayBuffer()

// HTTP Range request, read single file from zip on remote server
// Cross-origin need Range in Access-Control-Allow-Headers.
const read = (start, end) => fetch(url, {
    headers: { Range: "bytes=" + (start < 0 ? start : start + "-" + (end - 1)) }
}).then(res => res.arrayBuffer())

// File system
const fd = fs.openSync("file.zip"), size = fs.fstatSync(fd).size
const read = (start, end = size) => {
    if (start < 0) start = Math.max(0, size + start)
    const buf = new Uint8Array(end - start)
    fs.readSync(fd, buf, { position: start })
    return buf
}

const list = await lsZip(read)
const firstFile = await catZip(read, list[0])

// Whole zip at once, edit and zip again
const files = await unzip(zipUint8Array, {
    inflate: (data, entry) => zlib.inflateRawSync(data, { maxOutputLength: entry.size })
})
const newZip = await createZip(files.filter(file => !file.name.endsWith(".log")))
```


## Contributing

Follow [Coding Style Guide](https://github.com/litejs/litejs/wiki/Style-Guide),
run tests `npm install; npm test`.


> Copyright (c) 2023-2026 Lauri Rooden &lt;lauri@rooden.ee&gt;  
[MIT License](https://litejs.com/MIT-LICENSE.txt) |
[GitHub repo](https://github.com/litejs/zip) |
[npm package](https://npmjs.org/package/@litejs/zip) |
[Buy Me A Tea][6]


