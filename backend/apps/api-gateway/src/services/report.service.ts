import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');

function removeAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

@Injectable()
export class ReportService {
  generateRevenuePdf(reportData: any, branchInfo: any, creatorName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        doc.on('data', chunk => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', err => reject(err));

        const primaryColor = '#1A365D'; // Dark Blue
        const secondaryColor = '#2B6CB0'; // Medium Blue
        const textColor = '#2D3748'; // Charcoal
        const lightGray = '#F7FAFC';

        // Title Header
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(22).text('BAO CAO DOANH THU', 50, 50);
        doc.fontSize(10).fillColor(secondaryColor).text('REVENUE REPORT', 50, 75);
        doc.moveDown(2);

        // Branch & Metadata Info
        const branchName = removeAccents(branchInfo ? branchInfo.name : `Chi nhanh: ${reportData.branchId}`);
        const branchAddr = removeAccents(branchInfo ? branchInfo.address : '');
        const branchContact = removeAccents(branchInfo ? branchInfo.contact : '');
        const safeCreatorName = removeAccents(creatorName);

        const startMetaY = doc.y;
        
        // Left Column: Branch Info
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text('CHI NHANH (BRANCH)', 50, startMetaY);
        doc.fillColor(textColor).font('Helvetica').fontSize(10);
        doc.text(`Ten (Name): ${branchName}`, 50, startMetaY + 18, { width: 240 });
        if (branchAddr) {
          doc.text(`Dia chi (Addr): ${branchAddr}`, 50, startMetaY + 33, { width: 240 });
        }
        if (branchContact) {
          doc.text(`Lien he (Tel): ${branchContact}`, 50, startMetaY + 58, { width: 240 });
        }

        // Right Column: Report Metadata
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text('THONG TIN BAO CAO (METADATA)', 310, startMetaY);
        doc.fillColor(textColor).font('Helvetica').fontSize(10);
        doc.text(`Ky bao cao (Period): ${reportData.period.toUpperCase()}`, 310, startMetaY + 18);
        doc.text(`Thoi gian (Date Range): ${new Date(reportData.startDate).toLocaleDateString('vi-VN')} - ${new Date(reportData.endDate).toLocaleDateString('vi-VN')}`, 310, startMetaY + 33);
        doc.text(`Nguoi tao (Creator): ${safeCreatorName}`, 310, startMetaY + 48);
        doc.text(`Ngay tao (Created At): ${new Date().toLocaleString('vi-VN')}`, 310, startMetaY + 63);

        // Set doc.y
        doc.y = startMetaY + 95;

        // Separator Line
        doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, doc.y).lineTo(560, doc.y).stroke();
        doc.moveDown(1.5);

        // Aggregation Stats Cards
        const summary = reportData.summary;
        const startCardsY = doc.y;
        const cardHeight = 60;
        const cardWidth = 150;
        const gap = 15;

        // Card 1: Gross Revenue
        doc.rect(50, startCardsY, cardWidth, cardHeight).fill('#F7FAFC');
        doc.rect(50, startCardsY, 4, cardHeight).fill('#3182CE'); // Left accent stripe (Blue)
        doc.fillColor('#718096').font('Helvetica-Bold').fontSize(8).text('TONG DOANH THU (GROSS)', 60, startCardsY + 12);
        doc.fillColor('#2B6CB0').font('Helvetica-Bold').fontSize(12).text(`${summary.totalGrossRevenue.toLocaleString('vi-VN')} VND`, 60, startCardsY + 30);

        // Card 2: Returns / Refunds
        doc.rect(50 + cardWidth + gap, startCardsY, cardWidth, cardHeight).fill('#F7FAFC');
        doc.rect(50 + cardWidth + gap, startCardsY, 4, cardHeight).fill('#E53E3E'); // Left accent stripe (Red)
        doc.fillColor('#718096').font('Helvetica-Bold').fontSize(8).text('GIA TRI TRA HANG (RETURNS)', 50 + cardWidth + gap + 10, startCardsY + 12);
        doc.fillColor('#C53030').font('Helvetica-Bold').fontSize(12).text(`${summary.totalReturnedAmount.toLocaleString('vi-VN')} VND`, 50 + cardWidth + gap + 10, startCardsY + 30);

        // Card 3: Net Revenue
        doc.rect(50 + (cardWidth + gap) * 2, startCardsY, cardWidth + 15, cardHeight).fill('#F7FAFC');
        doc.rect(50 + (cardWidth + gap) * 2, startCardsY, 4, cardHeight).fill('#38A169'); // Left accent stripe (Green)
        doc.fillColor('#718096').font('Helvetica-Bold').fontSize(8).text('DOANH THU THUC TE (NET)', 50 + (cardWidth + gap) * 2 + 10, startCardsY + 12);
        doc.fillColor('#2F855A').font('Helvetica-Bold').fontSize(12).text(`${summary.netRevenue.toLocaleString('vi-VN')} VND`, 50 + (cardWidth + gap) * 2 + 10, startCardsY + 30);

        doc.y = startCardsY + cardHeight + 25;

        // Payment breakdown grid
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text('PHUONG THUC THANH TOAN (PAYMENT METHODS)', 50, doc.y);
        doc.moveDown(0.5);

        const startPayY = doc.y;
        const payCardWidth = 150;
        const payCardHeight = 45;

        const cash = summary.paymentMethodBreakdown.CASH || { count: 0, amount: 0 };
        const card = summary.paymentMethodBreakdown.CARD || { count: 0, amount: 0 };
        const qr = summary.paymentMethodBreakdown.QR_PAY || { count: 0, amount: 0 };

        // CASH column
        doc.rect(50, startPayY, payCardWidth, payCardHeight).fill('#EDF2F7');
        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(8).text('TIEN MAT (CASH)', 60, startPayY + 10);
        doc.font('Helvetica').fontSize(9).text(`${cash.amount.toLocaleString('vi-VN')} VND`, 60, startPayY + 20);
        doc.fontSize(8).fillColor('#718096').text(`${cash.count} don hang`, 60, startPayY + 30);

        // CARD column
        doc.rect(50 + payCardWidth + gap, startPayY, payCardWidth, payCardHeight).fill('#EDF2F7');
        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(8).text('THE NGAN HANG (CARD)', 50 + payCardWidth + gap + 10, startPayY + 10);
        doc.font('Helvetica').fontSize(9).text(`${card.amount.toLocaleString('vi-VN')} VND`, 50 + payCardWidth + gap + 10, startPayY + 20);
        doc.fontSize(8).fillColor('#718096').text(`${card.count} don hang`, 50 + payCardWidth + gap + 10, startPayY + 30);

        // QR_PAY column
        doc.rect(50 + (payCardWidth + gap) * 2, startPayY, payCardWidth + 15, payCardHeight).fill('#EDF2F7');
        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(8).text('QR PAY (PAYOS)', 50 + (payCardWidth + gap) * 2 + 10, startPayY + 10);
        doc.font('Helvetica').fontSize(9).text(`${qr.amount.toLocaleString('vi-VN')} VND`, 50 + (payCardWidth + gap) * 2 + 10, startPayY + 20);
        doc.fontSize(8).fillColor('#718096').text(`${qr.count} don hang`, 50 + (payCardWidth + gap) * 2 + 10, startPayY + 30);

        doc.y = startPayY + payCardHeight + 25;

        // Detailed table
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text('DANH SACH CHI TIET DON HANG (DETAILED ORDERS LIST)', 50, doc.y);
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const tableHeaderHeight = 22;

        // Header Background
        doc.rect(50, tableTop, 510, tableHeaderHeight).fill(primaryColor);

        // Header Labels
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
        doc.text('MA DON (CODE)', 55, tableTop + 6, { width: 80 });
        doc.text('KHACH HANG', 140, tableTop + 6, { width: 120 });
        doc.text('LOAI', 270, tableTop + 6, { width: 60 });
        doc.text('PTTT', 340, tableTop + 6, { width: 60 });
        doc.text('NGAY TAO', 410, tableTop + 6, { width: 65 });
        doc.text('TRI GIA (NET)', 480, tableTop + 6, { width: 75, align: 'right' });

        let currentY = tableTop + tableHeaderHeight;
        doc.font('Helvetica').fontSize(8);
        doc.fillColor(textColor);

        let isAlternating = false;

        (reportData.orders || []).forEach((order: any) => {
          if (currentY > 680) {
            doc.addPage();
            currentY = 50;
            
            // Draw Table Header on New Page
            doc.rect(50, currentY, 510, tableHeaderHeight).fill(primaryColor);
            doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
            doc.text('MA DON (CODE)', 55, currentY + 6, { width: 80 });
            doc.text('KHACH HANG', 140, currentY + 6, { width: 120 });
            doc.text('LOAI', 270, currentY + 6, { width: 60 });
            doc.text('PTTT', 340, currentY + 6, { width: 60 });
            doc.text('NGAY TAO', 410, currentY + 6, { width: 65 });
            doc.text('TRI GIA (NET)', 480, currentY + 6, { width: 75, align: 'right' });
            
            currentY += tableHeaderHeight;
            doc.font('Helvetica').fontSize(8);
            doc.fillColor(textColor);
          }

          // Row Background (Zebra Striping)
          if (isAlternating) {
            doc.rect(50, currentY, 510, 18).fill('#F7FAFC');
          }
          isAlternating = !isAlternating;

          doc.fillColor(textColor);
          const oDate = new Date(order.createdAt).toLocaleDateString('vi-VN');
          const codeStr = String(order.orderCode || order.orderId.slice(-8));
          
          doc.text(codeStr, 55, currentY + 5, { width: 80 });
          doc.text(removeAccents(order.patientName || 'Khach le'), 140, currentY + 5, { width: 120, lineBreak: false });
          doc.text(order.type || 'RETAIL', 270, currentY + 5, { width: 60 });
          doc.text(order.paymentMethod || 'CASH', 340, currentY + 5, { width: 60 });
          doc.text(oDate, 410, currentY + 5, { width: 65 });
          doc.text(`${order.net.toLocaleString('vi-VN')} VND`, 480, currentY + 5, { width: 75, align: 'right' });

          // Row line separator
          doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(50, currentY + 18).lineTo(560, currentY + 18).stroke();

          currentY += 18;
        });

        // Draw Grand Total Row
        if (currentY > 680) {
          doc.addPage();
          currentY = 50;
        }
        doc.rect(50, currentY, 510, 20).fill('#EDF2F7');
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9);
        doc.text('TONG CONG (GRAND TOTAL)', 55, currentY + 6, { width: 250 });
        doc.text(`${summary.netRevenue.toLocaleString('vi-VN')} VND`, 480, currentY + 6, { width: 75, align: 'right' });
        doc.strokeColor(secondaryColor).lineWidth(1.5).moveTo(50, currentY).lineTo(560, currentY).stroke();
        doc.strokeColor(secondaryColor).lineWidth(1.5).moveTo(50, currentY + 20).lineTo(560, currentY + 20).stroke();

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  generateProfitPdf(reportData: any, branchInfo: any, creatorName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        doc.on('data', chunk => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', err => reject(err));

        const primaryColor = '#1A365D'; // Dark Blue
        const secondaryColor = '#2B6CB0'; // Medium Blue
        const textColor = '#2D3748'; // Charcoal
        const lightGray = '#F7FAFC';

        // Title Header
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(22).text('BAO CAO LOI NHUAN', 50, 50);
        doc.fontSize(10).fillColor(secondaryColor).text('PROFIT REPORT (FEFO-BASED)', 50, 75);
        doc.moveDown(2);

        // Branch & Metadata Info
        const branchName = removeAccents(branchInfo ? branchInfo.name : `Chi nhanh: ${reportData.branchId}`);
        const branchAddr = removeAccents(branchInfo ? branchInfo.address : '');
        const branchContact = removeAccents(branchInfo ? branchInfo.contact : '');
        const safeCreatorName = removeAccents(creatorName);

        const startMetaY = doc.y;
        
        // Left Column: Branch Info
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text('CHI NHANH (BRANCH)', 50, startMetaY);
        doc.fillColor(textColor).font('Helvetica').fontSize(10);
        doc.text(`Ten (Name): ${branchName}`, 50, startMetaY + 18, { width: 240 });
        if (branchAddr) {
          doc.text(`Dia chi (Addr): ${branchAddr}`, 50, startMetaY + 33, { width: 240 });
        }
        if (branchContact) {
          doc.text(`Lien he (Tel): ${branchContact}`, 50, startMetaY + 58, { width: 240 });
        }

        // Right Column: Report Metadata
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text('THONG TIN BAO CAO (METADATA)', 310, startMetaY);
        doc.fillColor(textColor).font('Helvetica').fontSize(10);
        doc.text(`Ky bao cao (Period): ${reportData.period.toUpperCase()}`, 310, startMetaY + 18);
        doc.text(`Thoi gian (Date Range): ${new Date(reportData.startDate).toLocaleDateString('vi-VN')} - ${new Date(reportData.endDate).toLocaleDateString('vi-VN')}`, 310, startMetaY + 33);
        doc.text(`Nguoi tao (Creator): ${safeCreatorName}`, 310, startMetaY + 48);
        doc.text(`Ngay tao (Created At): ${new Date().toLocaleString('vi-VN')}`, 310, startMetaY + 63);

        doc.y = startMetaY + 95;

        // Separator Line
        doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, doc.y).lineTo(560, doc.y).stroke();
        doc.moveDown(1.5);

        // Aggregation Stats Cards (4 Cards)
        const summary = reportData.summary;
        const startCardsY = doc.y;
        const cardHeight = 60;
        const cardWidth = 110;
        const gap = 15;

        // Card 1: Net Revenue
        doc.rect(50, startCardsY, cardWidth, cardHeight).fill('#F7FAFC');
        doc.rect(50, startCardsY, 4, cardHeight).fill('#3182CE'); // Blue
        doc.fillColor('#718096').font('Helvetica-Bold').fontSize(7).text('DOANH THU (NET)', 58, startCardsY + 12);
        doc.fillColor('#2B6CB0').font('Helvetica-Bold').fontSize(9).text(`${summary.netRevenue.toLocaleString('vi-VN')} VND`, 58, startCardsY + 30);

        // Card 2: COGS
        doc.rect(50 + cardWidth + gap, startCardsY, cardWidth, cardHeight).fill('#F7FAFC');
        doc.rect(50 + cardWidth + gap, startCardsY, 4, cardHeight).fill('#DD6B20'); // Orange
        doc.fillColor('#718096').font('Helvetica-Bold').fontSize(7).text('GIA VON (COGS)', 50 + cardWidth + gap + 8, startCardsY + 12);
        doc.fillColor('#C05621').font('Helvetica-Bold').fontSize(9).text(`${(summary.totalCogs || 0).toLocaleString('vi-VN')} VND`, 50 + cardWidth + gap + 8, startCardsY + 30);

        // Card 3: Gross Profit
        doc.rect(50 + (cardWidth + gap) * 2, startCardsY, cardWidth, cardHeight).fill('#F7FAFC');
        doc.rect(50 + (cardWidth + gap) * 2, startCardsY, 4, cardHeight).fill('#38A169'); // Green
        doc.fillColor('#718096').font('Helvetica-Bold').fontSize(7).text('LOI NHUAN GOP', 50 + (cardWidth + gap) * 2 + 8, startCardsY + 12);
        doc.fillColor('#2F855A').font('Helvetica-Bold').fontSize(9).text(`${(summary.totalProfit || 0).toLocaleString('vi-VN')} VND`, 50 + (cardWidth + gap) * 2 + 8, startCardsY + 30);

        // Card 4: Profit Margin
        doc.rect(50 + (cardWidth + gap) * 3, startCardsY, cardWidth + 10, cardHeight).fill('#F7FAFC');
        doc.rect(50 + (cardWidth + gap) * 3, startCardsY, 4, cardHeight).fill('#805AD5'); // Purple
        doc.fillColor('#718096').font('Helvetica-Bold').fontSize(7).text('BIEN LOI NHUAN', 50 + (cardWidth + gap) * 3 + 8, startCardsY + 12);
        doc.fillColor('#6B46C1').font('Helvetica-Bold').fontSize(10).text(`${summary.profitMargin}%`, 50 + (cardWidth + gap) * 3 + 8, startCardsY + 30);

        doc.y = startCardsY + cardHeight + 25;

        // Payment breakdown grid
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text('PHUONG THUC THANH TOAN (PAYMENT METHODS)', 50, doc.y);
        doc.moveDown(0.5);

        const startPayY = doc.y;
        const payCardWidth = 150;
        const payCardHeight = 45;

        const cash = summary.paymentMethodBreakdown.CASH || { count: 0, amount: 0 };
        const card = summary.paymentMethodBreakdown.CARD || { count: 0, amount: 0 };
        const qr = summary.paymentMethodBreakdown.QR_PAY || { count: 0, amount: 0 };

        // CASH column
        doc.rect(50, startPayY, payCardWidth, payCardHeight).fill('#EDF2F7');
        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(8).text('TIEN MAT (CASH)', 60, startPayY + 10);
        doc.font('Helvetica').fontSize(9).text(`${cash.amount.toLocaleString('vi-VN')} VND`, 60, startPayY + 20);

        // CARD column
        doc.rect(50 + payCardWidth + gap, startPayY, payCardWidth, payCardHeight).fill('#EDF2F7');
        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(8).text('THE NGAN HANG (CARD)', 50 + payCardWidth + gap + 10, startPayY + 10);
        doc.font('Helvetica').fontSize(9).text(`${card.amount.toLocaleString('vi-VN')} VND`, 50 + payCardWidth + gap + 10, startPayY + 20);

        // QR_PAY column
        doc.rect(50 + (payCardWidth + gap) * 2, startPayY, payCardWidth + 15, payCardHeight).fill('#EDF2F7');
        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(8).text('QR PAY (PAYOS)', 50 + (payCardWidth + gap) * 2 + 10, startPayY + 10);
        doc.font('Helvetica').fontSize(9).text(`${qr.amount.toLocaleString('vi-VN')} VND`, 50 + (payCardWidth + gap) * 2 + 10, startPayY + 20);

        doc.y = startPayY + payCardHeight + 25;

        // Detailed table
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text('DANH SACH DON HANG & LOI NHUAN GOP (ORDERS PROFIT LIST)', 50, doc.y);
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const tableHeaderHeight = 22;

        // Header Background
        doc.rect(50, tableTop, 510, tableHeaderHeight).fill(primaryColor);

        // Header Labels
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
        doc.text('MA DON', 55, tableTop + 6, { width: 70 });
        doc.text('KHACH HANG', 130, tableTop + 6, { width: 90 });
        doc.text('DOANH THU', 230, tableTop + 6, { width: 75, align: 'right' });
        doc.text('GIA VON', 315, tableTop + 6, { width: 70, align: 'right' });
        doc.text('LOI NHUAN', 395, tableTop + 6, { width: 80, align: 'right' });
        doc.text('TYSUT', 485, tableTop + 6, { width: 70, align: 'right' });

        let currentY = tableTop + tableHeaderHeight;
        doc.font('Helvetica').fontSize(8);
        doc.fillColor(textColor);

        let isAlternating = false;

        (reportData.orders || []).forEach((order: any) => {
          if (currentY > 680) {
            doc.addPage();
            currentY = 50;
            
            // Draw Table Header on New Page
            doc.rect(50, currentY, 510, tableHeaderHeight).fill(primaryColor);
            doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
            doc.text('MA DON', 55, currentY + 6, { width: 70 });
            doc.text('KHACH HANG', 130, currentY + 6, { width: 90 });
            doc.text('DOANH THU', 230, currentY + 6, { width: 75, align: 'right' });
            doc.text('GIA VON', 315, currentY + 6, { width: 70, align: 'right' });
            doc.text('LOI NHUAN', 395, currentY + 6, { width: 80, align: 'right' });
            doc.text('TYSUT', 485, currentY + 6, { width: 70, align: 'right' });
            
            currentY += tableHeaderHeight;
            doc.font('Helvetica').fontSize(8);
            doc.fillColor(textColor);
          }

          // Row Background (Zebra Striping)
          if (isAlternating) {
            doc.rect(50, currentY, 510, 18).fill('#F7FAFC');
          }
          isAlternating = !isAlternating;

          doc.fillColor(textColor);
          const codeStr = String(order.orderCode || order.orderId.slice(-8));
          const orderMargin = order.net > 0 ? ((order.profit / order.net) * 100).toFixed(1) : '0.0';
          
          doc.text(codeStr, 55, currentY + 5, { width: 70 });
          doc.text(removeAccents(order.patientName || 'Khach le'), 130, currentY + 5, { width: 90, lineBreak: false });
          doc.text(`${order.net.toLocaleString('vi-VN')}`, 230, currentY + 5, { width: 75, align: 'right' });
          doc.text(`${(order.cogs || 0).toLocaleString('vi-VN')}`, 315, currentY + 5, { width: 70, align: 'right' });
          doc.text(`${(order.profit || 0).toLocaleString('vi-VN')}`, 395, currentY + 5, { width: 80, align: 'right' });
          doc.text(`${orderMargin}%`, 485, currentY + 5, { width: 70, align: 'right' });

          // Row line separator
          doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(50, currentY + 18).lineTo(560, currentY + 18).stroke();

          currentY += 18;
        });

        // Draw Grand Total Row
        if (currentY > 680) {
          doc.addPage();
          currentY = 50;
        }
        doc.rect(50, currentY, 510, 20).fill('#EDF2F7');
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9);
        doc.text('TONG CONG (GRAND TOTAL)', 55, currentY + 6, { width: 160 });
        doc.text(`${summary.netRevenue.toLocaleString('vi-VN')}`, 230, currentY + 6, { width: 75, align: 'right' });
        doc.text(`${summary.totalCogs.toLocaleString('vi-VN')}`, 315, currentY + 6, { width: 70, align: 'right' });
        doc.text(`${summary.totalProfit.toLocaleString('vi-VN')}`, 395, currentY + 6, { width: 80, align: 'right' });
        doc.text(`${summary.profitMargin}%`, 485, currentY + 6, { width: 70, align: 'right' });

        doc.strokeColor(secondaryColor).lineWidth(1.5).moveTo(50, currentY).lineTo(560, currentY).stroke();
        doc.strokeColor(secondaryColor).lineWidth(1.5).moveTo(50, currentY + 20).lineTo(560, currentY + 20).stroke();

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
