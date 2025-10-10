
describe("zip", function() {
	require("@litejs/cli/snapshot.js")
	var zlib = require("zlib")
	var createZip = require("..").createZip

	test("test uncompressed", function(assert, mock) {
		mock.swap(global, "CompressionStream", null)

		createZip(["file-a.txt", "õöü.txt"].map(dummyFile))
		.then(function(zip) {
			assert.matchSnapshot("test/snap/uncompressed.zip", zip)
			//console.log("A", require("fs").readFileSync("test/snap/uncompressed.zip.snap", "hex"))
			//console.log("B", Buffer.from(zip).toString("hex"))
			assert.end()
		})
	})

	test("test compressed", typeof CompressionStream !== "undefined" && typeof Response !== "undefined" && function(assert, mock) {
		mock.swap(Date, "now", mock.fn(1514900760000))
		var files = ["ä.txt", "õ", "ö.txt"].map(dummyFile)
		files[0].time = null
		files[1].time = Date.UTC(2001,1,22,1,2,4)
		createZip(files, function(err, zip) {
			assert.matchSnapshot("test/snap/compressed.zip", zip)
			assert.end()
		})
	})

	// Older zlib is producing different binary
	test("test zlib", parseInt(process.versions.node) >= 20 && function(assert, mock) {
		mock.swap(Date, "now", mock.fn(1514900760000))
		var files = [
			"abcdefghijklmnopqrstuvõäöü4€!@#$.txt",
			"\n",
			"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.txt",
		].map(dummyFile)
		files[0].time = null
		files[1].time = Date.UTC(2001,1,22,1,2,4)
		var zip = createZip(files, {
			comment: "Some comment for a file",
			deflate: zlib.deflateRawSync,
		})
		assert.matchSnapshot("test/snap/sync.zip", zip)
		assert.end()
	})

	function dummyFile(name, i) {
		return { name: name, content: "File: " + name + "\nContent: äõöüSome stuff".repeat(i+1), time: 1514900750001 }
	}
})

