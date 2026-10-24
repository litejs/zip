

import zip, { createZip, ZipDeflate, ZipFile } from "../zip"
import { lsZip, catZip, unzip, ZipEntry, ZipRead } from "../unzip"

const files: ZipFile[] = [
	{ name: "a.txt", content: "Some content" },
	{ name: "b.bin", content: new Uint8Array([1, 2, 3]), time: Date.UTC(2024, 0, 1) },
	{ name: "epoch.txt", content: new Uint8Array(0), time: 0 },
	{ name: "nullable.txt", content: "x", time: null },
]

createZip(files) satisfies Promise<Uint8Array>

createZip(files, { comment: "Zip comment" }, (err, buffer) => {
	if (err) return
	buffer satisfies Uint8Array
})

createZip(files, (err, buffer) => {
	if (err) return
	buffer satisfies Uint8Array
})

const customDeflate: ZipDeflate = input => input.subarray(0)
zip.createZip(files, { deflate: customDeflate }) satisfies Uint8Array

const read: ZipRead = (start, end) => new Uint8Array(0).subarray(start, end)
lsZip(read, { tail: 1024 }).then((list: ZipEntry[]) => catZip(read, list[0], { inflate: input => input })) satisfies Promise<Uint8Array>
unzip(new Uint8Array(0)).then(list => list[0].content) satisfies Promise<Uint8Array>
lsZip(new ArrayBuffer(0)).then(list => catZip(new Uint8Array(0), list[0])) satisfies Promise<Uint8Array>
unzip(read, { inflate: input => input }) satisfies Promise<ZipEntry[]>
catZip(read, { name: "", comment: "", time: new Date(), method: 8, crc: 0, len: 0, size: 0, offset: 0, headerLen: 30 }, { inflate: async input => input }) satisfies Promise<Uint8Array>
