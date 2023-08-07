
describe("zip", function() {
	require("@litejs/cli/snapshot.js")
	var createZip = require("..").createZip

	test("test", function(assert) {
		var zip = createZip(["test1.txt", "test2.txt", "test3.txt"].map(dummyFile))
		assert.matchSnapshot("test/snap/a", zip)
		assert.end()
	})

	function dummyFile(name) {
		return { name: name, content: "File: " + name + "\nContent: Some stuff" }
	}
})

