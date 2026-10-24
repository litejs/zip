export type ZipDeflate = (input: Uint8Array) => Uint8Array

export type ZipCallback = (err: any, zip: Uint8Array) => void

export interface ZipFile {
	name: string
	content: string | Uint8Array | ArrayBuffer | ArrayBufferView
	time?: number | Date | null
}

export interface ZipOptions {
	comment?: string
	deflate?: ZipDeflate
}

export function createZip(files: ZipFile[], opts: ZipOptions & { deflate: ZipDeflate }, callback: ZipCallback): void
export function createZip(files: ZipFile[], opts: ZipOptions & { deflate: ZipDeflate }): Uint8Array
export function createZip(files: ZipFile[], callback: ZipCallback): void
export function createZip(files: ZipFile[], opts: ZipOptions, callback: ZipCallback): void
export function createZip(files: ZipFile[], opts?: ZipOptions): Promise<Uint8Array>

declare const zip: {
	createZip: typeof createZip
}

export default zip
