declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: Record<string, any>;
    jsPDF?: Record<string, any>;
    pagebreak?: Record<string, any>;
  }

  interface Html2Pdf {
    from(source: string | HTMLElement): Html2Pdf;
    set(options: Html2PdfOptions): Html2Pdf;
    save(): Promise<void>;
    output(type: string, options?: any): Promise<any>;
    toPdf(): Html2Pdf;
    toContainer(): Html2Pdf;
    toCanvas(): Html2Pdf;
    toImg(): Html2Pdf;
  }

  function html2pdf(): Html2Pdf;
  function html2pdf(element: HTMLElement | string, options?: Html2PdfOptions): Html2Pdf;

  export = html2pdf;
}
