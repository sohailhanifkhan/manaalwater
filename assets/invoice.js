// =========================================================
// Manaal Water — Owner Invoice
// =========================================================

document.addEventListener('DOMContentLoaded', () => {

  const OWNER = 'manaalwater@gmail.com';
  const BANK_NAME = 'Faysal Bank Limited';
  const BANK_IBAN = 'PK32FAYS3019355000004293';

  const invoiceMessage = document.getElementById('invoiceMessage');
  const invoicePaper = document.getElementById('invoicePaper');
  const printInvoiceBtn = document.getElementById('printInvoiceBtn');
  const whatsappInvoiceBtn = document.getElementById('whatsappInvoiceBtn');

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(value) {
    const number = Number(value || 0);
    return 'Rs. ' + number.toLocaleString('en-PK', {
      maximumFractionDigits: 2
    });
  }

  function orderTotal(order) {
    if (
      typeof order.totalAmount === 'number' &&
      Number.isFinite(order.totalAmount)
    ) {
      return order.totalAmount;
    }

    const parsed = Number(
      String(order.total || '').replace(/[^0-9.]/g, '')
    );

    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatCreatedDate(order) {
    try {
      if (
        order.createdAt &&
        typeof order.createdAt.toDate === 'function'
      ) {
        return order.createdAt.toDate().toLocaleString('en-PK', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (e) {}

    return '—';
  }

  function formatDeliveryDate(value) {
    if (!value) return '';

    try {
      const parts = String(value).split('-');

      if (parts.length !== 3) return value;

      return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
      ).toLocaleDateString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

    } catch (e) {
      return value;
    }
  }

  function phoneForWhatsApp(phone) {
    let cleaned = String(phone || '')
      .replace(/[^\d+]/g, '')
      .replace(/\+/g, '');

    if (
      cleaned.startsWith('0') &&
      cleaned.length >= 10
    ) {
      cleaned = '92' + cleaned.slice(1);
    }

    return cleaned;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function buildShareMessage(order, documentId) {

    const orderNo = order.orderNumber || documentId;
    const paymentStatus = order.paymentStatus || 'Unpaid';

    const items = Array.isArray(order.items)
      ? order.items
      : [];

    const itemLines = items.length
      ? items.map(item => {
          const qty = Number(item.qty || 0);
          const amount = Number(
            item.lineTotal ??
            (qty * Number(item.unitPrice || 0))
          );

          return (
            `• ${qty} × ${item.name || 'Item'}` +
            (item.description ? ` (${item.description})` : '') +
            ` — ${money(amount)}`
          );
        }).join('\n')
      : 'Order item details unavailable';

    const lines = [
      '💧 *MANAAL WATER*',
      paymentStatus === 'Paid'
        ? '🧾 *PAYMENT RECEIPT*'
        : '🧾 *INVOICE*',
      '',
      `*Order No:* ${orderNo}`,
      `*Customer:* ${order.name || 'Customer'}`,
      '',
      '*Order Items*',
      itemLines,
      ''
    ];

    if (typeof order.subtotalAmount === 'number') {
      lines.push(`*Subtotal:* ${money(order.subtotalAmount)}`);
    }

    if (
      typeof order.discountAmount === 'number' &&
      order.discountAmount > 0
    ) {
      lines.push(`*Discount:* - ${money(order.discountAmount)}`);
    }

    if (
      typeof order.deliveryFee === 'number' &&
      order.deliveryFee > 0
    ) {
      lines.push(`*Delivery Fee:* ${money(order.deliveryFee)}`);
    }

    if (
      typeof order.previousBalanceAmount === 'number' &&
      order.previousBalanceAmount > 0
    ) {
      lines.push(
        `*${order.previousBalanceDescription || 'Previous Balance'}:* ` +
        money(order.previousBalanceAmount)
      );
    }

    lines.push(
      `*Total:* ${money(orderTotal(order))}`,
      `*Payment Method:* ${order.payMethod || '—'}`,
      `*Payment Status:* ${paymentStatus}`,
      `*Order Status:* ${order.status || 'Pending'}`
    );

    const deliveryParts = [];

    if (order.deliveryDate) {
      deliveryParts.push(formatDeliveryDate(order.deliveryDate));
    }

    if (order.deliveryTime) {
      deliveryParts.push(order.deliveryTime);
    }

    if (deliveryParts.length) {
      lines.push(`*Delivery:* ${deliveryParts.join(' · ')}`);
    }

    if (
      String(order.payMethod || '')
        .toLowerCase()
        .includes('bank')
    ) {
      lines.push(
        '',
        '🏦 *Bank Transfer Details*',
        BANK_NAME,
        `IBAN: ${BANK_IBAN}`
      );
    }

    lines.push(
      '',
      paymentStatus === 'Paid'
        ? '✅ Payment received. Thank you for choosing Manaal Water.'
        : 'Thank you for choosing Manaal Water.',
      '',
      '📞 +92 344 8845274',
      'Pure water. Delivered with trust.'
    );

    return lines.join('\n');
  }

  function renderInvoice(order, documentId) {

    const orderNo = order.orderNumber || documentId;
    const invoiceNo = 'INV-' + orderNo;

    setText('invoiceNumber', invoiceNo);
    setText('invoiceOrderNo', orderNo);
    setText('invoiceDate', formatCreatedDate(order));
    setText('invoicePayment', order.payMethod || '—');
    setText('invoiceStatus', order.status || 'Pending');
    setText('invoiceCustomer', order.name || 'Customer');

    const paymentStatus = order.paymentStatus || 'Unpaid';
    const paymentStatusEl = document.getElementById('invoicePaymentStatus');

    if (paymentStatusEl) {
      paymentStatusEl.textContent = paymentStatus;
      paymentStatusEl.className =
        'invoice-payment-badge ' +
        (
          paymentStatus === 'Paid'
            ? 'invoice-payment-paid'
            : 'invoice-payment-unpaid'
        );
    }

    const customerDetails = [];

    if (order.phone) customerDetails.push(escapeHtml(order.phone));
    if (order.address) customerDetails.push(escapeHtml(order.address));
    if (order.area) customerDetails.push(escapeHtml(order.area));

    const customerDetailsEl =
      document.getElementById('invoiceCustomerDetails');

    if (customerDetailsEl) {
      customerDetailsEl.innerHTML =
        customerDetails.join('<br>') || '—';
    }

    const deliveryParts = [];

    if (order.deliveryDate) {
      deliveryParts.push(formatDeliveryDate(order.deliveryDate));
    }

    if (order.deliveryTime) {
      deliveryParts.push(order.deliveryTime);
    }

    setText(
      'invoiceDelivery',
      deliveryParts.length
        ? deliveryParts.join(' · ')
        : 'Not scheduled'
    );

    let items = Array.isArray(order.items)
      ? order.items
      : [];

    if (!items.length && order.productName) {
      const qty = Number(order.qty || 1);
      const total = orderTotal(order);

      items = [{
        name: order.productName,
        description: '',
        qty,
        unitPrice: qty ? total / qty : total,
        lineTotal: total
      }];
    }

    const itemsEl = document.getElementById('invoiceItems');

    if (itemsEl) {
      itemsEl.innerHTML = items.length
        ? items.map(item => {
            const qty = Number(item.qty || 0);
            const unitPrice = Number(item.unitPrice || 0);
            const lineTotal = Number(
              item.lineTotal ?? (qty * unitPrice)
            );

            return `
              <tr>
                <td>
                  <strong>${escapeHtml(item.name || 'Item')}</strong>
                  ${
                    item.description
                      ? `
                          <div style="margin-top:4px; font-size:.74rem; color:#4C5C70; line-height:1.45;">
                            ${escapeHtml(item.description)}
                          </div>
                        `
                      : ''
                  }
                </td>
                <td>${qty}</td>
                <td>${money(unitPrice)}</td>
                <td>${money(lineTotal)}</td>
              </tr>
            `;
          }).join('')
        : `
            <tr>
              <td colspan="4">Order item details are unavailable.</td>
            </tr>
          `;
    }

    const calculatedSubtotal = items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.lineTotal ??
          (
            Number(item.qty || 0) *
            Number(item.unitPrice || 0)
          )
        ),
      0
    );

    const subtotal =
      typeof order.subtotalAmount === 'number'
        ? order.subtotalAmount
        : calculatedSubtotal;

    const discount =
      typeof order.discountAmount === 'number'
        ? order.discountAmount
        : 0;

    const deliveryFee =
      typeof order.deliveryFee === 'number'
        ? order.deliveryFee
        : 0;

    const previousBalance =
      typeof order.previousBalanceAmount === 'number'
        ? order.previousBalanceAmount
        : 0;

    setText('invoiceSubtotal', money(subtotal));
    setText('invoiceTotal', money(orderTotal(order)));

    const discountRow = document.getElementById('invoiceDiscountRow');

    if (discountRow) {
      discountRow.style.display = discount > 0 ? 'flex' : 'none';
      if (discount > 0) {
        setText('invoiceDiscount', '- ' + money(discount));
      }
    }

    const deliveryFeeRow =
      document.getElementById('invoiceDeliveryFeeRow');

    if (deliveryFeeRow) {
      deliveryFeeRow.style.display =
        deliveryFee > 0 ? 'flex' : 'none';

      if (deliveryFee > 0) {
        setText('invoiceDeliveryFee', money(deliveryFee));
      }
    }

    const balanceRow =
      document.getElementById('invoicePreviousBalanceRow');

    if (balanceRow) {
      balanceRow.style.display =
        previousBalance > 0 ? 'flex' : 'none';

      if (previousBalance > 0) {
        setText(
          'invoicePreviousBalanceLabel',
          order.previousBalanceDescription || 'Previous Balance'
        );

        setText(
          'invoicePreviousBalance',
          money(previousBalance)
        );
      }
    }

    const invoiceBank =
      document.getElementById('invoiceBank');

    if (invoiceBank) {
      invoiceBank.style.display =
        String(order.payMethod || '')
          .toLowerCase()
          .includes('bank')
            ? 'block'
            : 'none';
    }

    const notes = document.getElementById('invoiceNotes');
    const notesText = document.getElementById('invoiceNotesText');

    if (
      order.deliveryInstructions &&
      notes &&
      notesText
    ) {
      notes.style.display = 'block';
      notesText.textContent = order.deliveryInstructions;
    } else if (notes) {
      notes.style.display = 'none';
    }

    const whatsappPhone =
      phoneForWhatsApp(order.phone);

    if (
      whatsappInvoiceBtn &&
      whatsappPhone
    ) {
      whatsappInvoiceBtn.href =
        `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
          buildShareMessage(order, documentId)
        )}`;

      whatsappInvoiceBtn.textContent =
        paymentStatus === 'Paid'
          ? '💬 WhatsApp Receipt'
          : '💬 WhatsApp Invoice';

      whatsappInvoiceBtn.style.display = 'inline-flex';

    } else if (whatsappInvoiceBtn) {
      whatsappInvoiceBtn.style.display = 'none';
    }

    if (invoiceMessage) invoiceMessage.style.display = 'none';
    if (invoicePaper) invoicePaper.style.display = 'block';
    if (printInvoiceBtn) printInvoiceBtn.style.display = 'inline-flex';

    document.title = `${invoiceNo} | Manaal Water`;
  }

  async function loadInvoice() {

    const params = new URLSearchParams(window.location.search);
    const documentId = params.get('id');

    if (!documentId) {
      invoiceMessage.textContent =
        'Invoice could not be opened because the order ID is missing.';
      return;
    }

    try {
      const doc = await db.collection('orders')
        .doc(documentId)
        .get();

      if (!doc.exists) {
        invoiceMessage.textContent =
          'This order could not be found.';
        return;
      }

      renderInvoice(doc.data(), doc.id);

    } catch (error) {
      console.error('Could not load invoice:', error);

      invoiceMessage.textContent =
        'Could not load this invoice. Please check your connection or permissions.';
    }
  }

  auth.onAuthStateChanged(async user => {

    const email =
      user && user.email
        ? user.email.trim().toLowerCase()
        : '';

    if (user && email === OWNER) {
      await loadInvoice();
      return;
    }

    if (user) {
      try {
        await auth.signOut();
      } catch (e) {}
    }

    window.location.replace('account.html');
  });

  if (printInvoiceBtn) {
    printInvoiceBtn.addEventListener(
      'click',
      () => window.print()
    );
  }

});
