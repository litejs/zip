export type ZipBytes = Uint8Array | ArrayBuffer

export type ZipRead = (start: number, end?: number) => ZipBytes | Promise<ZipBytes>

export type ZipInflate = (input: Uint8Array, entry: ZipEntry) => ZipBytes | Promise<ZipBytes>

export interface ZipEntry {
	name: string
	comment: string
	time: Date
	method: number
	crc: number
	len: number
	size: number
	offset: number
	headerLen: number
}

export function lsZip(src: ZipBytes | ZipRead, opts?: { tail?: number }): Promise<ZipEntry[]>
export function catZip(src: ZipBytes | ZipRead, entry: ZipEntry, opts?: { inflate?: ZipInflate }): Promise<Uint8Array>
export function unzip(src: ZipBytes | ZipRead, opts?: { tail?: number, inflate?: ZipInflate }): Promise<(ZipEntry & { content: Uint8Array })[]>
