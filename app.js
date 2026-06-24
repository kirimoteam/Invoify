/* ============================================
   Invoify - Main Application Logic
   Handles form interactions, calculations, and live preview updates
   ============================================ */

// ============================================
// State Management
// ============================================

const app = {
  items: [],
  itemIdCounter: 0,

  // Initialize the app
  init() {
    this.setupEventListeners();
    this.setDefaultDates();
    this.generateInvoiceNumber();
    this.addDefaultLineItem();
    this.loadFromLocalStorage();
    this.updatePreview();
  },

  // ============================================
  // Event Listeners Setup
  // ============================================

  setupEventListeners() {
    // Form inputs - update preview on change
    document.getElementById('invoice-number').addEventListener('change', () => this.updatePreview());
    document.getElementById('issue-date').addEventListener('change', () => this.updatePreview());
    document.getElementById('due-date').addEventListener('change', () => this.updatePreview());
    document.getElementById('from-name').addEventListener('input', () => this.updatePreview());
    document.getElementById('from-email').addEventListener('input', () => this.updatePreview());
    document.getElementById('from-address').addEventListener('input', () => this.updatePreview());
    document.getElementById('to-name').addEventListener('input', () => this.updatePreview());
    document.getElementById('to-email').addEventListener('input', () => this.updatePreview());
    document.getElementById('to-address').addEventListener('input', () => this.updatePreview());
    document.getElementById('currency').addEventListener('change', () => this.updatePreview());
    document.getElementById('tax-percent').addEventListener('input', () => this.updatePreview());
    document.getElementById('notes').addEventListener('input', () => this.updatePreview());

    // Line items
    document.getElementById('add-line').addEventListener('click', () => this.addLineItem());

    // Save/Load buttons
    document.getElementById('save-json').addEventListener('click', () => this.saveToJSON());
    document.getElementById('load-json-input').addEventListener('change', (e) => this.loadFromJSON(e));

    // Export PDF
    document.getElementById('export-pdf').addEventListener('click', () => this.exportToPDF());
  },

  // ============================================
  // Date Management
  // ============================================

  setDefaultDates() {
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30); // Default: 30 days from today

    document.getElementById('issue-date').valueAsDate = today;
    document.getElementById('due-date').valueAsDate = dueDate;
  },

  generateInvoiceNumber() {
    // Generate invoice number: INV-YYYYMM-0001
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const num = String(Date.now() % 10000).padStart(4, '0');
    const invoiceNumber = `INV-${year}${month}${day}-${num}`;
    document.getElementById('invoice-number').value = invoiceNumber;
  },

  // ============================================
  // Line Items Management
  // ============================================

  addLineItem() {
    const itemId = this.itemIdCounter++;
    this.items.push({
      id: itemId,
      description: '',
      qty: 1,
      unitPrice: 0,
    });
    this.renderLineItems();
    this.updatePreview();
  },

  addDefaultLineItem() {
    // Add one empty line item on startup
    this.addLineItem();
  },

  removeLineItem(itemId) {
    this.items = this.items.filter(item => item.id !== itemId);
    this.renderLineItems();
    this.updatePreview();
  },

  renderLineItems() {
    const container = document.getElementById('items-table');
    container.innerHTML = '';

    this.items.forEach(item => {
      const row = document.createElement('tr');
      row.id = `item-${item.id}`;
      row.innerHTML = `
        <td>
          <textarea 
            class="item-description w-full rounded border-gray-200 p-2 resize-none" 
            rows="2"
            data-item-id="${item.id}"
            placeholder="Item description"
          >${item.description}</textarea>
        </td>
        <td>
          <input 
            type="number" 
            class="item-qty w-full rounded border-gray-200 p-2 text-right" 
            data-item-id="${item.id}"
            min="0"
            step="0.01"
            value="${item.qty}"
            placeholder="Qty"
          />
        </td>
        <td>
          <input 
            type="number" 
            class="item-unit-price w-full rounded border-gray-200 p-2 text-right" 
            data-item-id="${item.id}"
            min="0"
            step="0.01"
            value="${item.unitPrice}"
            placeholder="Price"
          />
        </td>
        <td>
          <div class="text-right font-semibold">
            ${this.formatCurrency(item.qty * item.unitPrice)}
          </div>
        </td>
        <td class="text-center">
          <button 
            class="remove-item px-2 py-1 text-red-600 hover:bg-red-50 rounded" 
            data-item-id="${item.id}"
            type="button"
          >
            ✕
          </button>
        </td>
      `;
      container.appendChild(row);
    });

    // Attach event listeners to newly created elements
    document.querySelectorAll('.item-description').forEach(el => {
      el.addEventListener('input', (e) => {
        const itemId = parseInt(e.target.dataset.itemId);
        const item = this.items.find(i => i.id === itemId);
        if (item) item.description = e.target.value;
        this.updatePreview();
      });
    });

    document.querySelectorAll('.item-qty').forEach(el => {
      el.addEventListener('input', (e) => {
        const itemId = parseInt(e.target.dataset.itemId);
        const item = this.items.find(i => i.id === itemId);
        if (item) item.qty = parseFloat(e.target.value) || 0;
        this.renderLineItems();
        this.updatePreview();
      });
    });

    document.querySelectorAll('.item-unit-price').forEach(el => {
      el.addEventListener('input', (e) => {
        const itemId = parseInt(e.target.dataset.itemId);
        const item = this.items.find(i => i.id === itemId);
        if (item) item.unitPrice = parseFloat(e.target.value) || 0;
        this.renderLineItems();
        this.updatePreview();
      });
    });

    document.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = parseInt(e.target.dataset.itemId);
        this.removeLineItem(itemId);
      });
    });
  },

  // ============================================
  // Calculations
  // ============================================

  calculateSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  },

  calculateTax() {
    const taxPercent = parseFloat(document.getElementById('tax-percent').value) || 0;
    const subtotal = this.calculateSubtotal();
    return (subtotal * taxPercent) / 100;
  },

  calculateTotal() {
    return this.calculateSubtotal() + this.calculateTax();
  },

  // ============================================
  // Currency Formatting
  // ============================================

  formatCurrency(amount) {
    const currency = document.getElementById('currency').value;
    const locales = {
      IDR: 'id-ID',
      USD: 'en-US',
      EUR: 'de-DE',
    };
    const locale = locales[currency] || 'en-US';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    }).format(amount);
  },

  // ============================================
  // Live Preview Update
  // ============================================

  updatePreview() {
    // Invoice header
    document.getElementById('preview-invoice-number').textContent = `#${document.getElementById('invoice-number').value}`;
    
    const issueDate = document.getElementById('issue-date').value;
    document.getElementById('preview-issue-date').textContent = `Issue: ${issueDate ? new Date(issueDate).toLocaleDateString() : '--'}`;
    
    const dueDate = document.getElementById('due-date').value;
    document.getElementById('preview-due-date').textContent = `Due: ${dueDate ? new Date(dueDate).toLocaleDateString() : '--'}`;

    // From section
    document.getElementById('preview-from-name').textContent = document.getElementById('from-name').value || 'Sender';
    document.getElementById('preview-from-email').textContent = document.getElementById('from-email').value || 'email';
    document.getElementById('preview-from-address').textContent = document.getElementById('from-address').value || 'address';

    // To section
    document.getElementById('preview-to-name').textContent = document.getElementById('to-name').value || 'Client';
    document.getElementById('preview-to-email').textContent = document.getElementById('to-email').value || 'email';
    document.getElementById('preview-to-address').textContent = document.getElementById('to-address').value || 'address';

    // Line items preview
    const previewItems = document.getElementById('preview-items');
    previewItems.innerHTML = '';
    this.items.forEach(item => {
      const subtotal = item.qty * item.unitPrice;
      const row = `
        <tr>
          <td>${item.description || '(no description)'}</td>
          <td class="text-right">${item.qty}</td>
          <td class="text-right">${this.formatCurrency(item.unitPrice)}</td>
          <td class="text-right font-semibold">${this.formatCurrency(subtotal)}</td>
        </tr>
      `;
      previewItems.innerHTML += row;
    });

    // Totals
    document.getElementById('preview-subtotal').textContent = this.formatCurrency(this.calculateSubtotal());
    document.getElementById('preview-tax').textContent = this.formatCurrency(this.calculateTax());
    document.getElementById('preview-total').textContent = this.formatCurrency(this.calculateTotal());

    // Notes
    document.getElementById('preview-notes').textContent = document.getElementById('notes').value || 'Notes / Terms';

    // Auto-save to localStorage
    this.saveToLocalStorage();
  },

  // ============================================
  // LocalStorage Management
  // ============================================

  saveToLocalStorage() {
    const data = {
      invoiceNumber: document.getElementById('invoice-number').value,
      issueDate: document.getElementById('issue-date').value,
      dueDate: document.getElementById('due-date').value,
      fromName: document.getElementById('from-name').value,
      fromEmail: document.getElementById('from-email').value,
      fromAddress: document.getElementById('from-address').value,
      toName: document.getElementById('to-name').value,
      toEmail: document.getElementById('to-email').value,
      toAddress: document.getElementById('to-address').value,
      currency: document.getElementById('currency').value,
      taxPercent: document.getElementById('tax-percent').value,
      notes: document.getElementById('notes').value,
      items: this.items,
    };
    localStorage.setItem('invoify-data', JSON.stringify(data));
  },

  loadFromLocalStorage() {
    const saved = localStorage.getItem('invoify-data');
    if (!saved) return;

    try {
      const data = JSON.parse(saved);
      document.getElementById('invoice-number').value = data.invoiceNumber || '';
      document.getElementById('issue-date').value = data.issueDate || '';
      document.getElementById('due-date').value = data.dueDate || '';
      document.getElementById('from-name').value = data.fromName || '';
      document.getElementById('from-email').value = data.fromEmail || '';
      document.getElementById('from-address').value = data.fromAddress || '';
      document.getElementById('to-name').value = data.toName || '';
      document.getElementById('to-email').value = data.toEmail || '';
      document.getElementById('to-address').value = data.toAddress || '';
      document.getElementById('currency').value = data.currency || 'IDR';
      document.getElementById('tax-percent').value = data.taxPercent || '0';
      document.getElementById('notes').value = data.notes || '';

      // Restore items
      if (data.items && data.items.length > 0) {
        this.items = data.items;
        this.itemIdCounter = Math.max(...data.items.map(i => i.id)) + 1;
        this.renderLineItems();
      }
    } catch (e) {
      console.error('Error loading from localStorage:', e);
    }
  },

  // ============================================
  // JSON Export/Import
  // ============================================

  saveToJSON() {
    const data = {
      invoiceNumber: document.getElementById('invoice-number').value,
      issueDate: document.getElementById('issue-date').value,
      dueDate: document.getElementById('due-date').value,
      fromName: document.getElementById('from-name').value,
      fromEmail: document.getElementById('from-email').value,
      fromAddress: document.getElementById('from-address').value,
      toName: document.getElementById('to-name').value,
      toEmail: document.getElementById('to-email').value,
      toAddress: document.getElementById('to-address').value,
      currency: document.getElementById('currency').value,
      taxPercent: document.getElementById('tax-percent').value,
      notes: document.getElementById('notes').value,
      items: this.items,
      exportedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoify-${data.invoiceNumber}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  loadFromJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        document.getElementById('invoice-number').value = data.invoiceNumber || '';
        document.getElementById('issue-date').value = data.issueDate || '';
        document.getElementById('due-date').value = data.dueDate || '';
        document.getElementById('from-name').value = data.fromName || '';
        document.getElementById('from-email').value = data.fromEmail || '';
        document.getElementById('from-address').value = data.fromAddress || '';
        document.getElementById('to-name').value = data.toName || '';
        document.getElementById('to-email').value = data.toEmail || '';
        document.getElementById('to-address').value = data.toAddress || '';
        document.getElementById('currency').value = data.currency || 'IDR';
        document.getElementById('tax-percent').value = data.taxPercent || '0';
        document.getElementById('notes').value = data.notes || '';

        // Restore items
        if (data.items && data.items.length > 0) {
          this.items = data.items;
          this.itemIdCounter = Math.max(...data.items.map(i => i.id)) + 1;
          this.renderLineItems();
        }

        this.updatePreview();
        alert('✅ Invoice data loaded successfully!');
      } catch (error) {
        alert('❌ Error loading JSON file:', error);
      }
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
  },

  // ============================================
  // PDF Export
  // ============================================

  exportToPDF() {
    // This is handled by pdf.js
    window.generatePDF();
  },
};

// ============================================
// Initialize App on DOM Ready
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
