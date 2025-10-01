

/* globals Blob, Promise, Response */

!((exports, unescape, encodeURIComponent, Uint8Array) => {

	// Attach createZip to `window` in non-module context
	exports.createZip = (files, next) => {
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
		, le32 = n => String.fromCharCode(n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff)
		, toUint = str => {
			for (var pos = str.length, arr = new Uint8Array(pos); pos--; arr[pos] = str.charCodeAt(pos));
			return arr
		}
		, compress = (uint, cb) => {
			if (CompressionStream) {
				new Response(
					new Blob([uint]).stream().pipeThrough(new CompressionStream("deflate"))
				).arrayBuffer().then(arr => {
					if (uint.length > arr.byteLength - 6) cb(new Uint8Array(arr).subarray(2, -4), "\10\0")
					else cb(uint, "\0\0")
				})
			} else cb(uint, "\0\0")
		}
		, add = resolve => {
			k = files[i++]
			if (!k) {
				k = files.length
				push(toUint(cd + "PK\5\6" + le32(0) + le32((k<<16) + k) + le32(cd.length) + le32(offset) + "\0\0"))
				file = new Uint8Array(outLen)
				for (i = 0, offset = 0; (j = out[i++]); offset += j.length) file.set(j, offset);
				return resolve(file)
			}
			var rawSize
			, name = unescape(encodeURIComponent(k.name))
			, file = k.content
			, nameLen = name.length
			, crc = -1

			if (typeof file === "string") file = toUint(unescape(encodeURIComponent(file)))
			rawSize = file.length

			for (j = 0; j < rawSize; ) {
				crc = (crc >>> 8) ^ crcTable[(crc ^ file[j++]) & 0xff]
			}
			compress(file, (compressed, method) => {
				method = le32(20 | 1<<27) + method + le32(dosDate(new Date(k.time || now))) + le32(-1^crc >>> 0) + le32(compressed.length) + le32(rawSize) + le32(nameLen)
				push(toUint("PK\3\4" + method + name))
				push(compressed)
				cd += "PK\1\2\0\24" + method + "\0\0" + le32(0) + le32(32) + le32(offset) + name
				offset += 30 + compressed.length + nameLen
				add(resolve)
			})
		}

		for (; i; crcTable[i] = k) {
			k = --i
			for (j = 8; j--; ) k = (k & 1) ? 0xedb88320 ^ (k >>> 1) : (k >>> 1)
		}

		if (!next) return new Promise(add)
		add(next.bind(next, null))
	}

// this is `exports` in module and `window` in browser
})(this, unescape, encodeURIComponent, Uint8Array) // jshint ignore:line

