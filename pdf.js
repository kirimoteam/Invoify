/* ============================================
   Invoify - PDF Export Module
   Handles PDF generation using jsPDF + html2canvas
   ============================================ */

/**
 * Generate and download invoice as PDF
 * Uses html2canvas to capture the preview and jsPDF to create PDF
 */
async function generatePDF() {
  try {
    // Show loading state
    const exportBtn = document.getElementById('export-pdf');
    const originalText = exportBtn.textContent;
    exportBtn.textContent = '⏳ Generating PDF...';
    exportBtn.disabled = true;

    // Get the preview element
    const previewElement = document.getElementById('invoice-preview');
    
    if (!previewElement) {
      throw new Error('Preview element not found');
    }

    // Use html2canvas to capture the preview as an image
    const canvas = await html2canvas(previewElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // Create jsPDF instance (A4 size)
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Get PDF dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calculate image dimensions (with margins)
    const margin = 10;
    const maxWidth = pageWidth - 2 * margin;
    const imgHeight = (canvas.height * maxWidth) / canvas.width;

    // Add image to PDF
    const imgData = canvas.toDataURL('image/png');
    let yPosition = margin;

    // Add first page
    pdf.addImage(imgData, 'PNG', margin, yPosition, maxWidth, imgHeight);

    // Handle multiple pages if invoice is too long
    let remainingHeight = imgHeight - (pageHeight - 2 * margin);
    let pageNum = 1;

    while (remainingHeight > 0) {
      pdf.addPage();
      pageNum++;
      yPosition = -remainingHeight + margin;
      pdf.addImage(imgData, 'PNG', margin, yPosition, maxWidth, imgHeight);
      remainingHeight -= pageHeight - 2 * margin;
    }

    // Generate filename
    const invoiceNumber = document.getElementById('invoice-number').value || 'invoice';
    const today = new Date().toISOString().split('T')[0];
    const filename = `${invoiceNumber}_${today}.pdf`;

    // Save PDF
    pdf.save(filename);

    // Restore button state
    exportBtn.textContent = originalText;
    exportBtn.disabled = false;

    // Show success message
    console.log(`✅ PDF exported successfully: ${filename}`);
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    alert(`Error generating PDF: ${error.message}`);

    // Restore button state
    const exportBtn = document.getElementById('export-pdf');
    exportBtn.textContent = '📥 Export PDF';
    exportBtn.disabled = false;
  }
}

// ============================================
// Alternative: Print to PDF (Browser Print Dialog)
// ============================================

/**
 * Open browser print dialog for user to save as PDF
 * This is an alternative to programmatic PDF generation
 */
function printInvoice() {
  try {
    // Hide form and buttons during print
    const mainSection = document.querySelector('section');
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');

    if (mainSection) mainSection.style.display = 'none';
    if (header) header.style.display = 'none';
    if (footer) footer.style.display = 'none';

    // Trigger print dialog
    window.print();

    // Restore display after print dialog closes
    setTimeout(() => {
      if (mainSection) mainSection.style.display = 'block';
      if (header) header.style.display = 'block';
      if (footer) footer.style.display = 'block';
    }, 500);
  } catch (error) {
    console.error('❌ Error printing invoice:', error);
  }
}

// ============================================
// Utility: Add Print Button (Optional)
// ============================================

/**
 * Creates a print button in the header for alternative printing
 * Uncomment to enable
 */
function addPrintButton() {
  const header = document.querySelector('header');
  if (!header) return;

  const printBtn = document.createElement('button');
  printBtn.textContent = '🖨️ Print';
  printBtn.className = 'px-3 py-1 rounded text-white bg-accent hover:brightness-95';
  printBtn.addEventListener('click', printInvoice);

  const buttonContainer = header.querySelector('div:last-child');
  if (buttonContainer) {
    buttonContainer.insertBefore(printBtn, buttonContainer.firstChild);
  }
}

// Optional: Uncomment to add print button on load
// document.addEventListener('DOMContentLoaded', addPrintButton);

// ============================================
// Export Functions
// ============================================

// Make functions available globally
window.generatePDF = generatePDF;
window.printInvoice = printInvoice;
window.addPrintButton = addPrintButton;
