/**
 * Generates and downloads a PDF file from an HTML string.
 *
 * This function uses the html2pdf.js library to convert a given HTML string into
 * a PDF document. If html2pdf.js is not already loaded, it is dynamically imported
 * from a CDN. The generated PDF file is named using the provided base name plus
 * the current date in `YYYY-MM-DD` format.
 *
 * @async
 * @function taskHtmlToPdf
 * @param {string} htmlString - The HTML content to be converted into PDF.
 * @param {string} filenameBase - The base name for the PDF file (without extension).
 * @returns {Promise<void>} Resolves when the PDF is generated and saved.
 *
 * @example
 * await taskHtmlToPdf('<h1>Hello World</h1>', 'document');
 * // -> Downloads "document_2025-08-15.pdf"
 */
export async function taskHtmlToPdf(htmlString, filenameBase) {
    if (!window.html2pdf) {
        await import('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
    }

    const holder = document.createElement('div');
    holder.innerHTML = htmlString;
    holder.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(holder);

    await html2pdf().set({
        margin: 10,
        filename: `${filenameBase}_${new Date().toISOString().slice(0, 10)}.pdf`,
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        html2canvas: { scale: 2, useCORS: true }
    }).from(holder).save();

    document.body.removeChild(holder);
}