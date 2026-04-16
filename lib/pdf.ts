import jsPDF from 'jspdf';

export function downloadLetterPdf(title: string, content: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  const marginRight = 20;
  const marginTop = 20;
  const marginBottom = 25;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const lineHeight = 7;
  const paragraphSpacing = 7;
  const headerBottomY = marginTop + 14;
  const contentStartY = headerBottomY + 12;

  const displayTitle = title
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const drawHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text(displayTitle, marginLeft, marginTop + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(today, pageWidth - marginRight, marginTop + 5, { align: 'right' });

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, headerBottomY - 2, pageWidth - marginRight, headerBottomY - 2);

    doc.setTextColor(0, 0, 0);
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - 12;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, footerY - 4, pageWidth - marginRight, footerY - 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${pageNum} / ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  };

  // Set body font before splitTextToSize so line-wrapping matches rendering
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);

  // Split on double newlines; build blocks with variable spacing and right-alignment for signature
  const rawParagraphs = content.split(/\n\n+/).map(p => p.replace(/\n/g, ' ').trim()).filter(p => p !== '');

  type Block = { isEmpty: true; spacing: number } | { isEmpty: false; lines: string[]; rightAlign: boolean };

  const blocks: Block[] = [];
  rawParagraphs.forEach((text, i) => {
    if (i > 0) {
      const extra = i === 1 || i === rawParagraphs.length - 1 ? paragraphSpacing + 5 : 0;
      blocks.push({ isEmpty: true, spacing: paragraphSpacing + extra });
    }
    blocks.push({
      isEmpty: false,
      lines: doc.splitTextToSize(text, contentWidth) as string[],
      rightAlign: i === rawParagraphs.length - 1,
    });
  });

  // Pre-compute total pages
  let totalPages = 1;
  let simulatedY = contentStartY;
  for (const block of blocks) {
    if (block.isEmpty) {
      simulatedY += block.spacing;
    } else {
      for (const _ of block.lines) {
        if (simulatedY + lineHeight > pageHeight - marginBottom) {
          totalPages++;
          simulatedY = contentStartY;
        }
        simulatedY += lineHeight;
      }
    }
  }

  // Render pages
  drawHeader();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  let currentPage = 1;
  let y = contentStartY;

  for (const block of blocks) {
    if (block.isEmpty) {
      y += block.spacing;
    } else {
      block.lines.forEach((line) => {
        if (y + lineHeight > pageHeight - marginBottom) {
          drawFooter(currentPage, totalPages);
          doc.addPage();
          currentPage++;
          drawHeader();
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(30, 30, 30);
          y = contentStartY;
        }
        if (block.rightAlign) {
          doc.text(line, pageWidth - marginRight - 5, y, { align: 'right' });
        } else {
          doc.text(line, marginLeft, y);
        }
        y += lineHeight;
      });
    }
  }

  drawFooter(currentPage, totalPages);

  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${dateSlug}.pdf`);
}
