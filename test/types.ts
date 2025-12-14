

import zip, { createZip, ZipDeflate, ZipFile } from "../types/zip"

const files: ZipFile[] = [
	{ name: "a.txt", content: "Some content" },
	{ name: "b.bin", content: new Uint8Array([1, 2, 3]), time: Date.UTC(2024, 0, 1) },
	{ name: "epoch.txt", content: new Uint8Array(0), time: 0 },
	{ name: "nullable.txt", content: "x", time: null },
]

const promiseZip: Promise<Uint8Array> = createZip(files)

createZip(files, { comment: "Zip comment" }, (err, buffer) => {
	if (err) return
	buffer.byteLength
})

createZip(files, (err, buffer) => {
	if (err) return
	buffer.byteLength
})

const customDeflate: ZipDeflate = input => input.subarray(0)
const syncZip: Uint8Array = zip.createZip(files, { deflate: customDeflate })
syncZip.byteLength

async function consume() {
	const asyncZip = await promiseZip
	asyncZip.byteLength
}

consume()
