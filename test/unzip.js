
require("@litejs/cli/test.js")

describe("unzip", function() {
	var zlib = require("zlib")
	, createZip = require("..").createZip
	, lib = require("../unzip.js")
	, lsZip = lib.lsZip
	, catZip = lib.catZip
	, unzip = lib.unzip
	, files = [
		{ name: "a.txt", content: "Some content", time: new Date(2024, 0, 2, 3, 4, 6) },
		{ name: "dir/õäöü.txt", content: "õäöü".repeat(20), time: new Date(2001, 1, 22, 1, 2, 4) },
		{ name: "empty.txt", content: "" },
	]

	function reader(buf, calls) {
		return function(start, end) {
			if (calls) calls.push([start, end])
			return Promise.resolve(buf.slice(start, end).buffer)
		}
	}

	function put(buf, pos, len, val) {
		for (; len--; val >>>= 8) buf[pos++] = val & 255
	}

	function cdPos(buf) {
		var pos = buf.length - 22
		return buf[pos + 16] | buf[pos + 17] << 8 | buf[pos + 18] << 16 | buf[pos + 19] << 24
	}

	function localExtra(buf, len) {
		var pos = cdPos(buf)
		buf = new Uint8Array(Buffer.concat([buf.subarray(0, 28), Buffer.from([len, 0]), buf.subarray(30, 35), Buffer.alloc(len), buf.subarray(35)]))
		put(buf, buf.length - 6, 4, pos + len)
		return buf
	}

	function expectErr(assert, promise, re) {
		return promise.then(function() {
			assert.ok(0, "Expected " + re)
		}, function(err) {
			assert.ok(re.test(err.name + ": " + err.message), err.name + ": " + err.message)
		})
	}

	test("list and read {0}", [
		["stored", null],
		["deflated", { deflate: zlib.deflateRawSync, comment: "Zip comment" }],
	], function(name, opts, assert) {
		var buf = createZip(files, Object.assign({ deflate: function(arr) { return arr } }, opts))
		, calls = []
		, read = reader(buf, calls)

		lsZip(read).then(function(list) {
			assert.equal(calls, [[-65557, undefined]])
			assert.equal(list.length, 3)
			assert.equal(list[0].name, "a.txt")
			assert.equal(list[1].name, "dir/õäöü.txt")
			assert.equal(list[0].comment, "")
			assert.equal(+list[0].time, +files[0].time)
			assert.equal(+list[1].time, +files[1].time)
			return Promise.all(list.map(function(entry) {
				return catZip(read, entry, { inflate: zlib.inflateRawSync })
			}))
		})
		.then(function(arr) {
			assert.equal(arr.map(function(arr) { return Buffer.from(arr).toString() }), files.map(function(file) { return file.content }))
			assert.ok(arr.every(function(arr) { return arr.buffer.byteLength == arr.length }), "content has own buffer")
			assert.end()
		}, assert.end)
	})

	test("read with gzip DecompressionStream", typeof DecompressionStream !== "undefined" && function(assert, mock) {
		var Orig = DecompressionStream
		, read = reader(createZip(files, { deflate: zlib.deflateRawSync }))
		// Big-endian host
		mock.swap(global, "Uint32Array", function(arr) {
			return Uint8Array.from(arr.flatMap(function(n) { return [n >>> 24, n >>> 16, n >>> 8, n] }))
		})
		mock.swap(global, "DecompressionStream", function(format) {
			if (format != "gzip") throw Error("Unsupported " + format)
			return new Orig(format)
		})
		lsZip(read).then(function(list) {
			assert.equal(list[1].method, 8)
			return Promise.all([
				catZip(read, list[1]),
				expectErr(assert, catZip(read, Object.assign({}, list[1], { crc: 1 })), /^Error: Bad data$/),
			])
		})
		.then(function(arr) {
			assert.equal(Buffer.from(arr[0]).toString(), files[1].content)
			assert.end()
		}, assert.end)
	})

	test("read central directory outside of tail", function(assert) {
		var buf = createZip(files, { deflate: zlib.deflateRawSync })
		, calls = []
		, pos = cdPos(buf)
		lsZip(reader(buf, calls), { tail: 30 }).then(function(list) {
			assert.equal(calls, [[-30, undefined], [pos, buf.length - 22]])
			assert.equal(list.length, 3)
			assert.end()
		}, assert.end)
	})

	test("read latin1 names and longer local extra", function(assert, mock) {
		var read
		, calls = []
		, buf = createZip([{ name: "a.txt", content: "x" }], { deflate: function(arr) { return arr } })
		, pos = cdPos(buf)
		buf[pos + 9] = 0
		buf[pos + 46] = 0xe4
		buf = localExtra(buf, 4)
		read = reader(buf, calls)
		mock.swap(global, "Blob", undefined)
		lsZip(read).then(function(list) {
			assert.equal(list[0].name, "ä.txt")
			calls.length = 0
			return catZip(read, list[0])
		})
		.then(function(arr) {
			assert.equal(Buffer.from(arr).toString(), "x")
			assert.equal(calls, [[0, 100]])
			assert.end()
		}, assert.end)
	})

	test("read local extra longer than margin from a reader returning the whole file after the tail", function(assert) {
		var calls = []
		, buf = localExtra(createZip([{ name: "a.txt", content: "x" }], { deflate: function(arr) { return arr } }), 100)
		, read = function(start, end) {
			calls.push([start, end])
			return calls.length > 2 ? buf : buf.slice(start, end)
		}
		lsZip(read).then(function(list) {
			return catZip(read, list[0])
		})
		.then(function(arr) {
			assert.equal(Buffer.from(arr).toString(), "x")
			assert.equal(calls.slice(1), [[0, 100], [0, 136]])
			assert.end()
		}, assert.end)
	})

	test("read from a reader returning the whole file {0}", [
		["always", false],
		["after the tail", true],
	], function(name, exactTail, assert) {
		var calls = []
		, buf = createZip(files, { deflate: zlib.deflateRawSync })
		, read = function(start, end) {
			calls.push([start, end])
			return exactTail && start < 0 ? buf.slice(start) : buf
		}
		lsZip(read, { tail: 30 }).then(function(list) {
			assert.equal(calls, exactTail ? [[-30, undefined], [cdPos(buf), buf.length - 22]] : [[-30, undefined]])
			calls.length = 0
			return Promise.all(list.map(function(entry) {
				return catZip(read, entry, { inflate: zlib.inflateRawSync })
			}))
		})
		.then(function(arr) {
			assert.equal(arr.map(function(arr) { return Buffer.from(arr).toString() }), files.map(function(file) { return file.content }))
			assert.equal(calls.length, 3)
			assert.end()
		}, assert.end)
	})

	test("read zip64 records between central directory and EOCD", function(assert) {
		var buf = createZip(files, { deflate: zlib.deflateRawSync })
		, calls = []
		, pos = cdPos(buf)
		, zip64 = new Uint8Array(76)
		put(zip64, 0, 4, 0x06064b50)
		buf = new Uint8Array(Buffer.concat([buf.subarray(0, -22), zip64, buf.subarray(-22)]))
		lsZip(reader(buf, calls)).then(function(list) {
			assert.equal(calls, [[-65557, undefined], [pos, buf.length - 22 - 76]])
			assert.equal(list.length, 3)
			assert.end()
		}, assert.end)
	})

	test("read zip64 records when a central entry ends at the tail position", function(assert) {
		var buf = createZip([{ name: "x".repeat(30), content: "a" }].concat(files), { deflate: zlib.deflateRawSync })
		, calls = []
		, zip64 = new Uint8Array(76)
		put(zip64, 0, 4, 0x06064b50)
		put(zip64, 56, 4, 0x07064b50)
		buf = new Uint8Array(Buffer.concat([buf.subarray(0, -22), zip64, buf.subarray(-22)]))
		lsZip(reader(buf, calls)).then(function(list) {
			assert.equal(calls.length, 2)
			assert.equal(list.length, 4)
			assert.end()
		}, assert.end)
	})

	test("list empty zip with one read", function(assert) {
		var calls = []
		lsZip(reader(createZip([], { deflate: zlib.deflateRawSync }), calls)).then(function(list) {
			assert.equal(list, [])
			assert.equal(calls.length, 1)
			assert.end()
		}, assert.end)
	})

	test("list zip with a long comment", function(assert) {
		var calls = []
		, buf = createZip(files, { deflate: zlib.deflateRawSync, comment: "x".repeat(10000) })
		lsZip(reader(buf, calls)).then(function(list) {
			assert.equal(calls, [[-65557, undefined]])
			assert.equal(list.length, 3)
			assert.end()
		}, assert.end)
	})

	test("list zip with bytes after it", function(assert) {
		var buf = createZip(files, { deflate: zlib.deflateRawSync, comment: "Zip comment" })
		lsZip(reader(new Uint8Array(Buffer.concat([buf, Buffer.alloc(5)])))).then(function(list) {
			assert.equal(list.length, 3)
			assert.end()
		}, assert.end)
	})

	test("ignore EOCD in a zip comment {0}", [
		["with a small comment length", "PK\x05\x06" + "\0".repeat(16) + "\x02\0ab"],
		["of an empty zip", "PK\x05\x06" + "\0".repeat(18)],
	], function(name, comment, assert) {
		var buf = createZip(files, { deflate: zlib.deflateRawSync, comment: comment + " and more" })
		lsZip(reader(buf)).then(function(list) {
			assert.equal(list.length, 3)
			assert.end()
		}, assert.end)
	})

	test("ignore EOCD signature in a zip comment", function(assert) {
		var buf = createZip(files, { deflate: zlib.deflateRawSync, comment: "PK\x05\x06 in a comment long enough to be scanned" })
		lsZip(reader(buf)).then(function(list) {
			assert.equal(list.length, 3)
			assert.end()
		}, assert.end)
	})

	test("stop inflating past the declared size", typeof DecompressionStream !== "undefined" && function(assert, mock) {
		var Orig = DecompressionStream
		, seen = 0
		, big = 20e6
		, buf = createZip([{ name: "bomb.bin", content: new Uint8Array(big) }], { deflate: zlib.deflateRawSync })
		, pos = cdPos(buf)
		, read = reader(buf)
		, args = []
		put(buf, pos + 24, 4, 10)
		mock.swap(global, "DecompressionStream", function(format) {
			var stream = new Orig(format)
			return {
				writable: stream.writable,
				readable: stream.readable.pipeThrough(new TransformStream({
					transform: function(chunk, ctrl) {
						seen += chunk.length
						ctrl.enqueue(chunk)
					}
				}))
			}
		})
		lsZip(read).then(function(list) {
			return Promise.all([
				expectErr(assert, catZip(read, list[0]), /Bad data/),
				expectErr(assert, catZip(read, list[0], { inflate: function(arr, entry) {
					args.push(entry)
					return zlib.inflateRawSync(arr, { maxOutputLength: entry.size })
				} }), /maxOutputLength|buffer/i),
			]).then(function() {
				assert.ok(seen < big / 10, "inflated " + seen)
				assert.equal(args, [list[0]])
			})
		})
		.then(function() {
			assert.end()
		}, assert.end)
	})

	test("read with async inflate", function(assert) {
		var read = reader(createZip(files, { deflate: zlib.deflateRawSync }))
		lsZip(read).then(function(list) {
			return catZip(read, list[1], { inflate: function(arr) { return Promise.resolve(zlib.inflateRawSync(arr)) } })
		})
		.then(function(arr) {
			assert.equal(Buffer.from(arr).toString(), files[1].content)
			assert.end()
		}, assert.end)
	})

	test("read in a context without node globals", typeof DecompressionStream !== "undefined" && function(assert) {
		var vm = require("vm")
		, ctx = { Blob: Blob, DecompressionStream: DecompressionStream, Response: Response }
		, read = reader(createZip(files, { deflate: zlib.deflateRawSync }))
		vm.runInNewContext(require("fs").readFileSync(require.resolve("../unzip.js"), "utf8"), ctx)
		ctx.lsZip(read).then(function(list) {
			return ctx.catZip(read, list[1])
		})
		.then(function(arr) {
			assert.equal(Buffer.from(arr).toString(), files[1].content)
			assert.end()
		}, assert.end)
	})

	test("list and read {0}", [
		["Uint8Array", function(buf) { return buf }],
		["ArrayBuffer", function(buf) { return buf.buffer }],
	], function(name, toSrc, assert) {
		var src = toSrc(createZip(files, { deflate: zlib.deflateRawSync }))
		lsZip(src).then(function(list) {
			assert.equal(list.length, 3)
			return catZip(src, list[1], { inflate: zlib.inflateRawSync })
		})
		.then(function(arr) {
			assert.equal(Buffer.from(arr).toString(), files[1].content)
			assert.end()
		}, assert.end)
	})

	test("unzip {0} and zip again", [
		["Uint8Array", function(buf) { return buf }],
		["ArrayBuffer", function(buf) { return buf.buffer }],
		["Buffer", function(buf) { return Buffer.from(buf) }],
		["read function", reader],
	], function(name, toSrc, assert) {
		var opts = { deflate: zlib.deflateRawSync, inflate: zlib.inflateRawSync }
		, buf = createZip(files, opts)
		, src = toSrc(buf)
		unzip(src, opts).then(function(list) {
			assert.equal(
				list.map(function(file) { return Buffer.from(file.content).toString() }),
				files.map(function(file) { return file.content })
			)
			assert.equal(createZip(list, opts), buf)
			assert.ok(list.every(function(file) { return file.content.buffer !== (src.buffer || src) }), "content is a copy")
			assert.end()
		}, assert.end)
	})

	test("throw on invalid zip", function(assert) {
		var buf = createZip(files, { deflate: zlib.deflateRawSync })
		, pos = cdPos(buf)
		, mod = function(fn) {
			var copy = buf.slice()
			fn(copy)
			return reader(copy)
		}
		, read = reader(buf)

		lsZip(read).then(function(list) {
			return Promise.all([
				expectErr(assert, lsZip(reader(new Uint8Array(30))), /No EOCD/),
				expectErr(assert, lsZip(function() { return Buffer.concat([createZip([], { deflate: zlib.deflateRawSync }), Buffer.alloc(65536)]) }), /No EOCD/),
				expectErr(assert, lsZip(mod(function(b) { put(b, b.length - 12, 2, 0xffff) })), /Zip64 unsupported/),
				expectErr(assert, lsZip(mod(function(b) { put(b, b.length - 10, 4, 0xffffffff) })), /Zip64 unsupported/),
				expectErr(assert, lsZip(mod(function(b) { put(b, pos + 20, 4, 0xffffffff) })), /Zip64 unsupported/),
				expectErr(assert, lsZip(mod(function(b) { b[pos] = 0 })), /Bad CD/),
				expectErr(assert, catZip(mod(function(b) { b[0] = 0 }), list[0]), /Bad header/),
				expectErr(assert, catZip(mod(function(b) { b[6] |= 1 }), list[0]), /Encryption unsupported/),
				expectErr(assert, catZip(read, Object.assign({}, list[0], { method: 99 })), /Method 99 unsupported/),
				expectErr(assert, catZip(read, Object.assign({}, list[0], { crc: 1 })), /Bad data/),
				expectErr(assert, catZip(read, Object.assign({}, list[0], { size: 1 })), /Bad data/),
			])
		})
		.then(function() {
			assert.end()
		}, assert.end)
	})
})

