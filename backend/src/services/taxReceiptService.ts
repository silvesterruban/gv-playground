// backend/src/services/taxReceiptService.ts - FIXED VERSION
import { s3Service } from './aws/s3Service';
import PDFDocument from 'pdfkit';

export class TaxReceiptService {
  // Generate PDF receipt
  static async generateReceiptPdf(receiptData: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        // Collect PDF data
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('TAX-DEDUCTIBLE DONATION RECEIPT', { align: 'center' });
        doc.moveDown();

        // Nonprofit info
        doc.fontSize(14).text('GradVillage', { align: 'center' });
        doc.fontSize(10).text('501(c)(3) Tax-Exempt Organization', { align: 'center' });
        doc.text(`EIN: ${process.env.NONPROFIT_EIN || 'XX-XXXXXXX'}`, { align: 'center' });
        doc.moveDown(2);

        // Receipt details
        doc.fontSize(12);
        doc.text(`Receipt Number: ${receiptData.receiptNumber}`);
        doc.text(`Date: ${new Date(receiptData.receiptDate).toLocaleDateString()}`);
        doc.text(`Tax Year: ${receiptData.taxYear}`);
        doc.moveDown();

        // Donor info
        doc.text('Donor Information:');
        doc.text(`Name: ${receiptData.donorName}`);
        if (receiptData.donorAddress) {
          const addr = typeof receiptData.donorAddress === 'string'
            ? JSON.parse(receiptData.donorAddress)
            : receiptData.donorAddress;
          if (addr.street) {
            doc.text(`Address: ${addr.street}`);
            doc.text(`${addr.city}, ${addr.state} ${addr.zipCode}`);
          }
        }
        doc.moveDown();

        // Donation details
        doc.text('Donation Details:');
        doc.text(`Amount: $${Number(receiptData.donationAmount).toFixed(2)}`);
        doc.text(`Date of Gift: ${new Date(receiptData.donationDate).toLocaleDateString()}`);
        doc.text(`Description: ${receiptData.donationDescription}`);
        doc.moveDown();

        // Legal text
        doc.fontSize(10);
        doc.text('This receipt acknowledges that you made a charitable contribution. No goods or services were provided in exchange for this contribution. Please keep this receipt for your tax records.');

        doc.moveDown();
        doc.text('This organization is recognized as tax-exempt under Section 501(c)(3) of the Internal Revenue Code. Contributions are deductible to the full extent allowed by law.');

        // Finalize PDF
        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  // Upload receipt to S3 with proper filename
  static async uploadReceiptToS3(pdfBuffer: Buffer, receiptNumber: string): Promise<string> {
    try {
      const fileName = `${receiptNumber}.pdf`;

      console.log('🔍 Debug: Uploading PDF to S3');
      console.log('🔍 Debug: Filename:', fileName);
      console.log('🔍 Debug: PDF Buffer size:', pdfBuffer.length, 'bytes');

      // Use your existing s3Service interface
      const uploadResult = await s3Service.uploadFile(
        pdfBuffer,
        fileName,
        'application/pdf',
        'tax-receipts'  // folder parameter
      );

      console.log('✅ Debug: PDF uploaded successfully:', uploadResult.url);
      return uploadResult.url;

    } catch (error) {
      console.error('❌ Error uploading tax receipt to S3:', error);
      throw error;
    }
  }

  // Generate receipt and upload
  static async generateAndUploadReceipt(receiptData: any): Promise<string> {
    const pdfBuffer = await this.generateReceiptPdf(receiptData);
    const uploadUrl = await this.uploadReceiptToS3(pdfBuffer, receiptData.receiptNumber);
    return uploadUrl;
  }
}