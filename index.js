

!function(exports, unescape, encodeURIComponent) {
	exports.createZip = createZip

	function le32(n) {
		return String.fromCharCode.call(null, n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff)
	}

	function createZip(files) {
		var i = 256, j, k, header, offset = 0
		, crcTable = []
		, entries = ""
		, cd = ""

		for (; i--; crcTable[i] = k) {
			k = i
			for (j = 8; j--; ) k = (k & 1) ? 0xedb88320 ^ (k >>> 1) : (k >>> 1)
		}

		for (i = 0; k = files[i++]; offset += 30 + fileLen + nameLen) {
			var name = unescape(encodeURIComponent(k.name))
			, body = unescape(encodeURIComponent(k.content))
			, fileLen = body.length
			, nameLen = name.length
			, crc = -1

			for (j = 0; j < fileLen; ) {
				crc = (crc >>> 8) ^ crcTable[(crc ^ body.charCodeAt(j++)) & 0xff]
			}

			header = "\24\0" + le32(0) + le32(0) + le32(-1^crc >>> 0) + le32(fileLen) + le32(fileLen) + le32(nameLen)
			entries += "PK\3\4" + header + name + body
			cd += "PK" + le32(513) + header + "\0\0" + le32(0) + le32(32) + le32(offset) + name
		}
		k = files.length
		entries += cd + le32(0x06054b50) + le32(0) + le32((k<<16) + k) + le32(cd.length) + le32(offset) + "\0\0"

		for (i = entries.length, k = new Uint8Array(i); i--; k[i] = entries.charCodeAt(i));
		return k
		// return new Blob([], { type: "application/zip" })
	}
}(this, unescape, encodeURIComponent)

