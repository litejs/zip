

import zip, { createZip, ZipDeflate, ZipFile } from "../types/zip"

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
