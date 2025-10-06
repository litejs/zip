

/* globals Blob, Promise, Response */

;((exports, unescape, encodeURIComponent, Uint8Array) => {

	// Attach createZip to `window` in non-module context
	exports.createZip = (files, opts, next) => {
		if (typeof opts == "function") {
			next = opts
			opts = {}
		}
		var i = 256, j, k, offset = 0
		, crcTable = []
		, cd = ""
		, out = []
		, outLen = 0
		, CompressionStream = (exports.window || global).CompressionStream
		, now = Date.now()
		, push = arr => {
			out.push(arr)
			outLen += arr.length
		}
		, dosDate = date => date.getSeconds() >> 1 | date.getMinutes() << 5 | date.getHours() << 11 | date.getDate() << 16 | (date.getMonth() + 1) << 21 | (date.getFullYear() - 1980) << 25
		, le16 = n => String.fromCharCode(n & 0xff, (n >>> 8) & 0xff)
		, le32 = n => le16(n) + le16(n >>> 16)
		, toUint = str => {
			for (var pos = str.length, arr = new Uint8Array(pos); pos--; arr[pos] = str.charCodeAt(pos));
			return arr
		}
		, compress = (uint, len, cb) => {
			if (opts && opts.deflate) {
				var compressed = opts.deflate(uint)
				cb(len > compressed.length ? compressed : uint)
			} else if (CompressionStream) {
				new Response(
					new Blob([uint]).stream().pipeThrough(new CompressionStream("deflate"))
				).arrayBuffer().then(arr => {
					cb(len > arr.byteLength - 6 ? new Uint8Array(arr).subarray(2, -4) : uint)
				})
			} else cb(uint)
		}
		, add = resolve => {
			k = files[i++]
			if (!k) {
				k = files.length
				name = unescape(encodeURIComponent(opts && opts.comment || ""))
				push(toUint(cd + "PK\5\6" + le32(0) + le32((k<<16) + k) + le32(cd.length) + le32(offset) + le16(name.length) + name))
				file = new Uint8Array(outLen)
				for (i = 0, offset = 0; (j = out[i++]); offset += j.length) file.set(j, offset);
				return resolve(file)
			}
			var fileLen
			, name = unescape(encodeURIComponent(k.name))
			, nameLen = name.length
			, file = k.content
			, crc = -1

			if (typeof file === "string") file = toUint(unescape(encodeURIComponent(file)))
			fileLen = file.length

			for (j = 0; j < fileLen; ) {
				crc = (crc >>> 8) ^ crcTable[(crc ^ file[j++]) & 0xff]
			}
			compress(file, fileLen, (compressed, method) => {
				method = file === compressed ? "\0\0" : "\10\0"
				method = le32(20 | 1<<27) + method + le32(dosDate(new Date(k.time || now))) + le32(-1^crc >>> 0) + le32(compressed.length) + le32(fileLen) + le32(nameLen)
				push(toUint("PK\3\4" + method + name))
				push(compressed)
				cd += "PK\1\2\0\24" + method + "\0\0" + le32(0) + le32(32) + le32(offset) + name
				offset += 30 + compressed.length + nameLen
				add(resolve)
			})
		}

		for (; i; crcTable[i] = k) {
			k = --i
			for (j = 8; j--; ) k = 0xedb88320 * (1&k) ^ k >>> 1
		}

		if (!next) return new Promise(add)
		add(next.bind(next, null))
	}

// this is `exports` in module and `window` in browser
})(this, unescape, encodeURIComponent, Uint8Array) // jshint ignore:line

