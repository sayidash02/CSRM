export interface ISharePointClient {
  /**
   * Mengunggah file ke SharePoint secara chunked (Upload Session).
   * @param path Direktori tujuan (contoh: "0. Testing/2026/Agustus/Week 1")
   * @param fileName Nama file (sudah disanitasi)
   * @param fileBuffer Buffer file
   * @param fileSize Ukuran file dalam bytes
   * @returns URL web/dokumen di SharePoint
   */
  uploadFile(path: string, fileName: string, fileBuffer: Buffer, fileSize: number): Promise<string>;
}
