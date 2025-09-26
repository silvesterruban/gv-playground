import { Router } from 'express';
import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { prisma } from '../config/prisma';

const router = Router();

// Generate receipt PDF
router.get('/:receiptNumber', async (req: Request, res: Response) => {
  try {
    const { receiptNumber } = req.params;

    // Try to find the tax receipt in database first
    let taxReceipt = await prisma.taxReceipt.findFirst({
      where: { receiptNumber },
      include: {
        donation: {
          include: {
            student: true
          }
        }
      }
    });

    // If not found in tax_receipts table, look for registration fee record by receipt_number
    if (!taxReceipt) {
      console.log(`Receipt ${receiptNumber} not found in tax_receipts table, looking for registration fee record`);
      
      const registrationFee = await prisma.registrationFee.findFirst({
        where: { receiptNumber: receiptNumber },
        include: {
          student: true
        }
      });

      if (registrationFee && registrationFee.student) {
        console.log(`Found registration fee record with student: ${registrationFee.student.firstName} ${registrationFee.student.lastName}`);
        
        // Create a receipt object with actual student data from registration fee
        taxReceipt = {
          receiptNumber,
          receiptDate: new Date(),
          taxYear: new Date().getFullYear().toString(),
          donorName: `${registrationFee.student.firstName} ${registrationFee.student.lastName}`,
          donorEmail: registrationFee.student.email,
          donorAddress: null,
          donationAmount: Number(registrationFee.amount),
          donationDate: registrationFee.processedAt || registrationFee.createdAt,
          donationDescription: 'Student registration fee payment for platform access and account setup',
          transactionId: registrationFee.paymentIntentId || `txn_${receiptNumber}`
        } as any;
      } else {
        console.log(`No registration fee record found for receipt ${receiptNumber}, generating basic receipt`);
        // Extract info from receipt number format: GV2025-XXXXXX-XXXX
        const year = receiptNumber.includes('2025') ? '2025' : new Date().getFullYear().toString();
        const amount = 25; // Default amount
        
        // Check if this looks like a donation receipt (GV-YYYY-XXXXXX format) vs registration fee
        const isDonationFormat = receiptNumber.includes('GV-') && receiptNumber.split('-').length === 3;
        
        if (isDonationFormat) {
          // Create a basic receipt object for donation
          taxReceipt = {
            receiptNumber,
            receiptDate: new Date(),
            taxYear: year,
            donorName: 'Donor',
            donorEmail: 'donor@gradvillage.com',
            donorAddress: null,
            donationAmount: amount,
            donationDate: new Date(),
            donationDescription: 'Educational support donation to help students achieve their academic goals',
            transactionId: `txn_${receiptNumber}`
          } as any;
        } else {
          // Create a basic receipt object for student registration
          taxReceipt = {
            receiptNumber,
            receiptDate: new Date(),
            taxYear: year,
            donorName: 'Student Registration',
            donorEmail: 'student@gradvillage.com',
            donorAddress: null,
            donationAmount: amount,
            donationDate: new Date(),
            donationDescription: 'Student registration fee payment for platform access and account setup',
            transactionId: `txn_${receiptNumber}`
          } as any;
        }
      }
    }

    // Determine if this is a donation or registration fee receipt
    const isDonationReceipt = taxReceipt.donationDescription && 
      !taxReceipt.donationDescription.includes('Student registration fee payment');
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="GradVillage_Receipt_${receiptNumber}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Header - Different titles based on receipt type
    if (isDonationReceipt) {
      doc.fontSize(20).text('TAX-DEDUCTIBLE DONATION RECEIPT', { align: 'center' });
    } else {
      doc.fontSize(20).text('STUDENT REGISTRATION FEE RECEIPT', { align: 'center' });
    }
    doc.moveDown();

    // Nonprofit info
    doc.fontSize(14).text('GradVillage', { align: 'center' });
    doc.fontSize(10).text('501(c)(3) Tax-Exempt Organization', { align: 'center' });
    doc.text(`EIN: ${process.env.NONPROFIT_EIN || 'XX-XXXXXXX'}`, { align: 'center' });
    doc.moveDown(2);

    // Receipt details
    doc.fontSize(12);
    doc.text(`Receipt Number: ${taxReceipt.receiptNumber}`);
    doc.text(`Date: ${new Date(taxReceipt.receiptDate).toLocaleDateString()}`);
    doc.text(`Tax Year: ${taxReceipt.taxYear}`);
    doc.moveDown();

    // Donor/Student info - Different labels based on receipt type
    if (isDonationReceipt) {
      doc.text('Donor Information:');
      doc.text(`Name: ${taxReceipt.donorName}`);
      doc.text(`Email: ${(taxReceipt as any).donorEmail || 'N/A'}`);
      if ((taxReceipt as any).donorAddress) {
        const addr = typeof (taxReceipt as any).donorAddress === 'string'
          ? JSON.parse((taxReceipt as any).donorAddress)
          : (taxReceipt as any).donorAddress;
        if (addr.street) {
          doc.text(`Address: ${addr.street}`);
          doc.text(`${addr.city}, ${addr.state} ${addr.zipCode}`);
        }
      }
    } else {
      doc.text('Student Information:');
      doc.text(`Name: ${taxReceipt.donorName}`);
      doc.text(`Email: ${(taxReceipt as any).donorEmail || 'N/A'}`);
      if ((taxReceipt as any).donorAddress) {
        const addr = typeof (taxReceipt as any).donorAddress === 'string'
          ? JSON.parse((taxReceipt as any).donorAddress)
          : (taxReceipt as any).donorAddress;
        if (addr.street) {
          doc.text(`Address: ${addr.street}`);
          doc.text(`${addr.city}, ${addr.state} ${addr.zipCode}`);
        }
      }
    }
    doc.moveDown();

    // Payment details - Different labels based on receipt type
    if (isDonationReceipt) {
      doc.text('Donation Details:');
      doc.text(`Amount: $${Number(taxReceipt.donationAmount).toFixed(2)}`);
      doc.text(`Date of Donation: ${new Date(taxReceipt.donationDate).toLocaleDateString()}`);
      doc.text(`Description: ${taxReceipt.donationDescription}`);
      doc.text(`Payment Method: Credit Card`);
      doc.text(`Transaction ID: ${(taxReceipt as any).transactionId || 'N/A'}`);
    } else {
      doc.text('Registration Fee Details:');
      doc.text(`Amount: $${Number(taxReceipt.donationAmount).toFixed(2)}`);
      doc.text(`Date of Payment: ${new Date(taxReceipt.donationDate).toLocaleDateString()}`);
      doc.text(`Description: ${taxReceipt.donationDescription}`);
      doc.text(`Payment Method: Credit Card`);
      doc.text(`Transaction ID: ${(taxReceipt as any).transactionId || 'N/A'}`);
    }
    doc.moveDown();

    // Important notice - Different messages based on receipt type
    if (isDonationReceipt) {
      doc.fontSize(10).text('This receipt confirms your tax-deductible donation to GradVillage.', { align: 'center' });
      doc.text('Your donation helps support students in their educational journey.', { align: 'center' });
      doc.text('Please retain this receipt for your tax records.', { align: 'center' });
    } else {
      doc.fontSize(10).text('This receipt confirms your student registration fee payment to GradVillage.', { align: 'center' });
      doc.text('Registration fees help support our platform infrastructure and student services.', { align: 'center' });
      doc.text('Please retain this receipt for your records.', { align: 'center' });
    }
    doc.moveDown();

    // Footer
    doc.fontSize(8).text('GradVillage - Making education accessible, one student at a time', { align: 'center' });
    doc.text('www.gradvillage.com | support@gradvillage.com', { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

export default router;