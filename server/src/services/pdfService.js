import PDFDocument from 'pdfkit';

/**
 * Format paise into Indian Rupees string (e.g. ₹50,000.00)
 */
const formatINR = (paise = 0) => {
  const rupees = (Number(paise) || 0) / 100;
  return 'Rs. ' + rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Generates an invoice PDF as a Buffer using PDFKit
 */
export const generateInvoicePDF = (invoice, user) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 45, size: 'A4' });
      const buffers = [];

      doc.on('data', (data) => buffers.push(data));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const client = invoice.clientId || {};
      const business = user?.business || {};

      // ─── Header: Brand & TAX INVOICE title ─────────────────────────────────
      doc
        .fillColor('#4338ca') // Indigo
        .fontSize(22)
        .font('Helvetica-Bold')
        .text(business.name || user?.name || 'ChasePay Freelancer', 45, 45);

      doc
        .fillColor('#64748b')
        .fontSize(9)
        .font('Helvetica')
        .text('GST TAX INVOICE', 45, 72, { characterSpacing: 1 });

      // Invoice metadata on the right
      doc
        .fillColor('#0f172a')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(invoice.invoiceNumber, 360, 45, { align: 'right' });

      doc
        .fillColor('#64748b')
        .fontSize(9)
        .font('Helvetica')
        .text(`Issue Date: ${formatDate(invoice.issueDate)}`, 360, 62, { align: 'right' })
        .text(`Due Date: ${formatDate(invoice.dueDate)}`, 360, 75, { align: 'right' })
        .text(`Status: ${invoice.status.toUpperCase()}`, 360, 88, { align: 'right' });

      // Divider line
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .moveTo(45, 110)
        .lineTo(550, 110)
        .stroke();

      // ─── Two-column address block ──────────────────────────────────────────
      // Left: Billed By (Freelancer)
      doc
        .fillColor('#94a3b8')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('BILLED BY:', 45, 125);

      doc
        .fillColor('#0f172a')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(business.name || user?.name || 'Freelancer', 45, 137);

      let currentY = 150;
      doc.font('Helvetica').fontSize(9).fillColor('#475569');

      if (business.address) {
        doc.text(business.address, 45, currentY, { width: 220 });
        currentY += 24;
      }
      if (business.gstin) {
        doc.text(`GSTIN: ${business.gstin}`, 45, currentY);
        currentY += 12;
      }
      if (business.upiId) {
        doc.text(`UPI ID: ${business.upiId}`, 45, currentY);
        currentY += 12;
      }

      // Right: Billed To (Client)
      doc
        .fillColor('#94a3b8')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('BILLED TO:', 320, 125);

      doc
        .fillColor('#0f172a')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(client.name || 'Client', 320, 137);

      let clientY = 150;
      doc.font('Helvetica').fontSize(9).fillColor('#475569');

      if (client.email) {
        doc.text(client.email, 320, clientY);
        clientY += 12;
      }
      if (client.phone) {
        doc.text(client.phone, 320, clientY);
        clientY += 12;
      }
      if (client.address) {
        doc.text(client.address, 320, clientY, { width: 220 });
        clientY += 24;
      }
      if (client.gstin) {
        doc.text(`Client GSTIN: ${client.gstin}`, 320, clientY);
        clientY += 12;
      }

      // ─── Table Header ──────────────────────────────────────────────────────
      const tableTop = Math.max(currentY, clientY) + 20;

      doc
        .rect(45, tableTop, 505, 22)
        .fillColor('#f8fafc')
        .fill();

      doc
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .rect(45, tableTop, 505, 22)
        .stroke();

      doc
        .fillColor('#475569')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('DESCRIPTION', 55, tableTop + 6)
        .text('QTY', 270, tableTop + 6, { width: 40, align: 'center' })
        .text('RATE', 320, tableTop + 6, { width: 70, align: 'right' })
        .text('GST', 400, tableTop + 6, { width: 50, align: 'right' })
        .text('TOTAL', 460, tableTop + 6, { width: 80, align: 'right' });

      // ─── Table Rows ────────────────────────────────────────────────────────
      let itemY = tableTop + 28;
      doc.font('Helvetica').fontSize(9).fillColor('#1e293b');

      invoice.items.forEach((item) => {
        const itemTotal = (item.amount || 0) + (item.gstAmount || 0);

        doc
          .font('Helvetica')
          .text(item.description, 55, itemY, { width: 210 })
          .text(String(item.qty), 270, itemY, { width: 40, align: 'center' })
          .text(formatINR(item.rate), 320, itemY, { width: 70, align: 'right' })
          .text(`${item.gstPercent}% (${formatINR(item.gstAmount)})`, 400, itemY, { width: 50, align: 'right' })
          .font('Helvetica-Bold')
          .text(formatINR(itemTotal), 460, itemY, { width: 80, align: 'right' });

        itemY += 24;

        // subtle separator
        doc
          .strokeColor('#f1f5f9')
          .lineWidth(0.5)
          .moveTo(45, itemY - 4)
          .lineTo(550, itemY - 4)
          .stroke();
      });

      // ─── Totals Section ────────────────────────────────────────────────────
      const totalsY = itemY + 15;

      // Notes block on left
      if (invoice.notes) {
        doc
          .fillColor('#94a3b8')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('NOTES / TERMS:', 45, totalsY);

        doc
          .fillColor('#475569')
          .fontSize(8)
          .font('Helvetica')
          .text(invoice.notes, 45, totalsY + 12, { width: 260 });
      }

      // Summary lines on right
      const summaryX = 350;
      doc.font('Helvetica').fontSize(9).fillColor('#64748b');

      doc.text('Subtotal:', summaryX, totalsY);
      doc.font('Helvetica-Bold').fillColor('#1e293b').text(formatINR(invoice.subtotal), 440, totalsY, { align: 'right', width: 100 });

      let currentSumY = totalsY + 15;

      if (invoice.discount > 0) {
        doc.font('Helvetica').fillColor('#16a34a').text('Discount:', summaryX, currentSumY);
        doc.font('Helvetica-Bold').text('-' + formatINR(invoice.discount), 440, currentSumY, { align: 'right', width: 100 });
        currentSumY += 15;
      }

      doc.font('Helvetica').fillColor('#64748b').text('GST Total:', summaryX, currentSumY);
      doc.font('Helvetica-Bold').fillColor('#1e293b').text(formatINR(invoice.taxTotal), 440, currentSumY, { align: 'right', width: 100 });
      currentSumY += 20;

      // Total Due Highlight Box
      doc
        .rect(340, currentSumY - 5, 210, 30)
        .fillColor('#eef2ff')
        .fill();

      doc
        .fillColor('#4338ca')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('GRAND TOTAL:', summaryX, currentSumY + 4);

      doc
        .fontSize(12)
        .text(formatINR(invoice.total), 440, currentSumY + 2, { align: 'right', width: 100 });

      // ─── Footer with Pay Link ──────────────────────────────────────────────
      const publicPayUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/i/${invoice.publicId}`;

      doc
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .moveTo(45, 740)
        .lineTo(550, 740)
        .stroke();

      doc
        .fillColor('#64748b')
        .fontSize(8)
        .font('Helvetica')
        .text('Pay online anytime via UPI, Cards, or NetBanking at:', 45, 750)
        .fillColor('#4f46e5')
        .font('Helvetica-Bold')
        .text(publicPayUrl, 45, 762, { link: publicPayUrl });

      doc
        .fillColor('#94a3b8')
        .fontSize(7)
        .font('Helvetica')
        .text('Generated securely with ChasePay - Invoicing for Indian Freelancers', 45, 785, { align: 'center', width: 505 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
