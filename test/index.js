
describe("zip", function() {
	require("@litejs/cli/snapshot.js")
	var createZip = require("..").createZip

	test("test uncompressed", function(assert, mock) {
		mock.swap(Date, "now", mock.fn(1514900750001))
		mock.swap(global, "CompressionStream", null)

		createZip(["file-a.txt", "õöü.txt"].map(dummyFile))
		.then(toUint)
		.then(function(zip) {
			assert.matchSnapshot("test/snap/uncompressed.zip", zip)
			//console.log("A", require("fs").readFileSync("test/snap/uncompressed.zip.snap", "hex"))
			//console.log("B", Buffer.from(zip).toString("hex"))
			assert.end()
		})
	})

	test("test compressed", function(assert, mock) {
		mock.swap(Date, "now", mock.fn(1514900750001))
		var files = ["ä.txt", "õ", "ö.txt"].map(dummyFile)
		files[1].time = Date.UTC(2001,1,22,1,2,4)
		createZip(files, function(err, blob) {
			toUint(blob).then(function(zip) {
				assert.matchSnapshot("test/snap/compressed.zip", zip)
				assert.end()
			})
		})
	})

	function dummyFile(name, i) {
		return { name: name, content: "File: " + name + "\nContent: äõöüSome stuff".repeat(i+1) }
	}
	function toUint(blob) {
		return blob.arrayBuffer()
		.then(function(arr) {
			return new Uint8Array(arr)
		})
	}
})

