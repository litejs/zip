
import { createZip } from "../zip.js"

describe("Run as ESM module", () => {
	it("should have function createZip", assert => {
		assert.type(createZip, "function")
		assert.end()
	})
})

