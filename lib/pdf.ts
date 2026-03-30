import jsPDF from 'jspdf';

export function downloadLetterPdf(title: string, content: string) {
  const doc = new jsPDF();
  const lines = doc.splitTextToSize(content, 180);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 15, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(lines, 15, 32);

  doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
