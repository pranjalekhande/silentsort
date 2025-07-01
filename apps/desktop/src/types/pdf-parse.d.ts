declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }

  interface PDFOptions {
    normalizeWhitespace?: boolean;
    disableCombineTextItems?: boolean;
    disableFilenameDetection?: boolean;
    useSystemFonts?: boolean;
    max?: number;
  }

  function pdfParse(
    dataBuffer: Buffer,
    options?: PDFOptions
  ): Promise<PDFData>;

  export = pdfParse;
} 