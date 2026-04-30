declare module 'adm-zip' {
  class AdmZip {
    constructor(buffer?: Buffer | string)
    getEntries(): AdmZipEntry[]
    getData(): Buffer
    getEntry(name: string): AdmZipEntry | undefined
  }

  class AdmZipEntry {
    entryName: string
    getData(): Buffer
    header: { compressedSize: number; size: number }
  }

  export default AdmZip
}