import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * ReportGenerator - Utility for exporting data to PDF and Excel
 */
const ReportGenerator = {
  /**
   * Export to PDF
   * @param {Object} options 
   * @param {string} options.title - Report title
   * @param {string} options.filename - Output filename
   * @param {Array} options.columns - Table columns [{ title: 'Name', dataIndex: 'name' }]
   * @param {Array} options.data - Data array
   * @param {Object} options.metadata - Optional metadata (company, date, etc)
   */
  exportToPDF: ({ title, filename, columns, data, metadata = {} }) => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246); // Primary Blue
    doc.text('NEXUM ERP - Intelligence Report', 14, 22);
    
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(title, 14, 32);

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le : ${timestamp}`, 14, 40);
    if (metadata.company) doc.text(`Entreprise : ${metadata.company}`, 14, 45);
    if (metadata.user) doc.text(`Par : ${metadata.user}`, 14, 50);

    // Table
    const tableColumns = columns.map(col => col.title);
    const tableRows = data.map(item => 
      columns.map(col => {
        const val = item[col.dataIndex];
        return val !== undefined && val !== null ? val.toString() : '';
      })
    );

    doc.autoTable({
      startY: 55,
      head: [tableColumns],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { top: 55 },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} sur ${pageCount} - NEXUM ERP Confidential - https://nexum-erp.com`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`${filename || 'report'}_${Date.now()}.pdf`);
  },

  /**
   * Export to Excel
   * @param {Object} options 
   * @param {string} options.filename - Output filename
   * @param {Array} options.data - Data array
   */
  exportToExcel: ({ filename, data }) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    // Save file
    XLSX.writeFile(workbook, `${filename || 'export'}_${Date.now()}.xlsx`);
  }
};

export default ReportGenerator;
