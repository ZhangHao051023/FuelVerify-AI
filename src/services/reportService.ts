import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PetrolRecord, Zone } from '../types';
import { format } from 'date-fns';

export const generatePDFReport = (records: PetrolRecord[], zone: Zone) => {
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = format(now, 'yyyy-MM-dd HH:mm');

  // Title
  doc.setFontSize(20);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text('FuelVerify AI - Verification Report', 14, 22);

  // Meta info
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Generated on: ${dateStr}`, 14, 30);
  doc.text(`Region: ${zone}`, 14, 35);

  // Stats
  const totalSpent = records.reduce((acc, r) => acc + r.amount, 0);
  const totalLiters = records.reduce((acc, r) => acc + r.liters, 0);
  const verifiedCount = records.filter(r => r.status === 'verified').length;
  const flaggedCount = records.filter(r => r.status === 'flagged').length;

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('Summary Statistics', 14, 45);
  
  autoTable(doc, {
    startY: 50,
    head: [['Metric', 'Value']],
    body: [
      ['Total Spent', `RM ${totalSpent.toFixed(2)}`],
      ['Total Liters', `${totalLiters.toFixed(2)} L`],
      ['Verified Records', verifiedCount.toString()],
      ['Flagged Records', flaggedCount.toString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
  });

  // Detailed Records
  doc.text('Detailed Verification Log', 14, (doc as any).lastAutoTable.finalY + 15);

  const tableData = records.map(r => [
    format(new Date(r.date), 'yyyy-MM-dd'),
    r.stationName,
    r.type,
    `${r.liters.toFixed(2)} L`,
    `RM ${r.amount.toFixed(2)}`,
    r.status.toUpperCase(),
    r.verificationNotes?.join('; ') || 'N/A'
  ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [['Date', 'Station', 'Type', 'Liters', 'Amount', 'Status', 'AI Notes']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] },
    columnStyles: {
      6: { cellWidth: 50 }, // AI Notes column
    },
    styles: { fontSize: 8 },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(
      `Page ${i} of ${pageCount} - FuelVerify AI - Pre-verification for government submissions`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc;
};

export const downloadReport = (records: PetrolRecord[], zone: Zone) => {
  const doc = generatePDFReport(records, zone);
  doc.save(`FuelVerify_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
};
