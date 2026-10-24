
/* globals Blob, DecompressionStream */

;((exports, Uint8Array) => {
	var j, k
	, i = 256
	, crcTable = []
	, fail = msg => { throw Error(msg) }
	, readRange = async (read, start, end, buf) => (
		// Response longer than requested is whole file (server ignoring Range)
		buf = typeof read == "function" ? await read(start, end) : read,
		buf = buf instanceof Uint8Array ? buf : new Uint8Array(buf),
		buf.length > end - start ? buf.subarray(start) : buf
	)
	, u16 = (buf, pos) => buf[pos] | buf[pos + 1] << 8
	, u32 = (buf, pos) => (u16(buf, pos) | u16(buf, pos + 2) << 16) >>> 0
	, lsZip = exports.lsZip = async (read, opts) => {
		var count, cdSize, cdOffset, utf8, nameLen, end, date, exact, pos
		, buf = await readRange(read, -(opts && opts.tail || 65557))
		, out = []
		, get16 = off => u16(buf, pos + off)
		, get32 = off => u32(buf, pos + off)
		, getStr = (off, len) => (
			len = String.fromCharCode(...buf.subarray(off += pos, off + len)), utf8 ? decodeURIComponent(escape(len)) : len
		)
		// Zip64 set all ones for a field that does not fit
		, u32z = (fromPos, max = 0xffffffff) => (fromPos = (get32(fromPos) & max) >>> 0) == max ? fail("Zip64 unsupported") : fromPos

		// Ignore signature inside a comment
		EOCD: for (exact = 2; exact--; ) for (pos = buf.length - 22; pos >= 0 && pos >= buf.length - 65557; pos--) {
			if (get32(0) == 0x06054b50 && buf.length - pos - 22 - get16(20) >>> 0 <= !exact * 65535) break EOCD
		}
		if (exact < 0) fail("No EOCD")

		count = u32z(10, 0xffff)
		cdSize = u32z(12)
		cdOffset = u32z(16)

		// Zip64 locator before EOCD means CD futher away
		if (count && (get32(-20) == 0x07064b50 || (pos -= cdSize, get32(0)) != 0x02014b50)) {
			buf = await readRange(read, cdOffset, cdOffset + cdSize)
			pos = 0
		}

		for (; count--; pos = end + get16(32)) {
			if (get32(0) != 0x02014b50) fail("Bad CD")
			utf8 = get16(8) & 2048
			nameLen = get16(28)
			end = pos + 46 + nameLen + get16(30)
			date = get32(12)
			out.push({
				name: getStr(46, nameLen),
				comment: getStr(end - pos, get16(32)),
				time: new Date((date >>> 25) + 1980, (date >>> 21 & 15) - 1, date >>> 16 & 31, date >>> 11 & 31, date >>> 5 & 63, (date & 31) * 2),
				method: get16(10),
				crc: get32(16),
				len: u32z(20),
				size: u32z(24),
				offset: u32z(42),
				headerLen: end - pos - 16
			})
		}
		return out
	}
	, catZip = exports.catZip = async (read, entry, opts) => {
		var reader, chunk
		, { offset, headerLen, len, method, crc, size } = entry
		// Local extra field is often longer than the central one, a margin saves a second read
		, buf = await readRange(read, offset, offset + headerLen + len + 64)
		, pos = (
			u32(buf, 0) != 0x04034b50 ? fail("Bad header") :
			buf[6] & 1 ? fail("Encryption unsupported") :
			30 + u16(buf, 26) + u16(buf, 28)
		)
		, sum = -1

		if (buf.length < pos + len) buf = await readRange(read, offset, offset + pos + len)
		buf = buf.subarray(pos, pos + len)

		if (method == 8) {
			if (opts && opts.inflate) buf = await opts.inflate(buf, entry)
			else try {
				// gzip trailer is little-endian CRC+size from CD
				reader = new Blob([
					Uint8Array.of(31, 139, 8, 0, 0, 0, 0, 0, 0, 0),
					buf,
					new Uint8Array(8).map((n, i) => (i < 4 ? crc : size) >>> i * 8)
				]).stream().pipeThrough(new DecompressionStream("gzip")).getReader()
				for (buf = new Uint8Array(size), pos = 0; (chunk = (await reader.read()).value); pos += chunk.length) {
					// Zip bomb throws on set outside buf range
					buf.set(chunk, pos)
				}
				// CRC validated by DecompressionStream
				return buf
			} catch (e) {
				fail("Bad data")
			}
		} else if (method) fail("Method " + method + " unsupported")

		// Copy to release reader buffer
		buf = new Uint8Array(buf)

		for (pos = 0; pos < buf.length; ) {
			sum = (sum >>> 8) ^ crcTable[(sum ^ buf[pos++]) & 0xff]
		}
		if (buf.length != size || ~sum >>> 0 != crc) fail("Bad data")
		return buf
	}

	for (; i; crcTable[i] = k) {
		k = --i
		for (j = 8; j--; ) k = 0xedb88320 * (1&k) ^ k >>> 1
	}

	exports.unzip = async (src, opts) => {
		var entry
		, list = await lsZip(src, opts)
		for (entry of list) entry.content = await catZip(src, entry, opts)
		return list
	}

// this is `exports` in module and `window` in browser
})(this, Uint8Array) // jshint ignore:line

