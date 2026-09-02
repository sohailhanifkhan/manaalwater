document.addEventListener('DOMContentLoaded', () => {

  const SALES_SYNC_WEB_APP_URL =
    'https://script.google.com/macros/s/AKfycbyUfljON8xGW84CO26VI5n67AsIu62VfoEGtA7RFiXaubN1lnBuH4QMWtxRXSU5EYUz/exec';

  const loginGate = document.getElementById('loginGate');
  const statementApp = document.getElementById('statementApp');
  const customerSelect = document.getElementById('statementCustomer');
  const monthInput = document.getElementById('statementMonth');
  const loadBtn = document.getElementById('loadStatementBtn');
  const printBtn = document.getElementById('printStatementBtn');
  const message = document.getElementById('statementMessage');
  const view = document.getElementById('statementView');
  const settlementPanel = document.getElementById('settlementPanel');

  const paymentAmount = document.getElementById('paymentAmount');
  const paymentMethod = document.getElementById('paymentMethod');
  const paymentDate = document.getElementById('paymentDate');
  const paymentBankCheque = document.getElementById('paymentBankCheque');
  const paymentReference = document.getElementById('paymentReference');
  const paymentNotes = document.getElementById('paymentNotes');
  const recordPaymentBtn = document.getElementById('recordPaymentBtn');

  let customers = [];
  let currentCustomer = null;
  let currentBillingMonth = '';
  let allCustomerOrders = [];
  let monthGroups = [];
  let currentGroup = null;
  let carryForwardGroups = [];
  let currentInvoiceTransactions = [];


  function numeric(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  }


  function money(value) {
    return Number(value || 0).toLocaleString(
      'en-PK',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    ) + ' Rs.';
  }


  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }


  function safeCreatedDate(data) {
    if (
      data.createdAt &&
      typeof data.createdAt.toDate === 'function'
    ) {
      return data.createdAt.toDate();
    }

    if (data.createdDate instanceof Date) {
      return data.createdDate;
    }

    return null;
  }


  function monthValue(date) {
    return (
      date.getFullYear() +
      '-' +
      String(date.getMonth() + 1).padStart(2, '0')
    );
  }


  function monthLabel(value) {
    if (!value) return '';

    const [year, month] = value.split('-').map(Number);

    return new Date(year, month - 1, 1)
      .toLocaleDateString(
        'en-GB',
        {
          month: 'long',
          year: 'numeric'
        }
      );
  }


  function setCurrentMonth() {
    const now = new Date();
    monthInput.value = monthValue(now);
  }


  function setToday() {
    const now = new Date();

    paymentDate.value =
      now.getFullYear() +
      '-' +
      String(now.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(now.getDate()).padStart(2, '0');
  }


  function invoiceNumber() {
    if (!currentCustomer || !currentBillingMonth) {
      return '';
    }

    const [year, month] = currentBillingMonth.split('-');

    return (
      'INV/' +
      year +
      '/' +
      month +
      '/' +
      currentCustomer.id
    );
  }


  function formatInvoiceDate(date) {
    return (
      String(date.getMonth() + 1).padStart(2, '0') +
      '/' +
      String(date.getDate()).padStart(2, '0') +
      '/' +
      date.getFullYear()
    );
  }


  function groupPayments(group) {
    const map = new Map();

    group.orders.forEach(order => {
      const payments =
        Array.isArray(order.monthlyPayments)
          ? order.monthlyPayments
          : [];

      payments.forEach(payment => {
        if (!payment || !payment.paymentId) return;

        if (!map.has(payment.paymentId)) {
          map.set(payment.paymentId, payment);
        }
      });
    });

    return Array.from(map.values());
  }


  function groupReceived(group) {
    return groupPayments(group)
      .reduce(
        (sum, payment) =>
          sum + numeric(payment.amount),
        0
      );
  }


  function groupOutstanding(group) {
    return Math.max(
      numeric(group.statementAmount) -
      groupReceived(group),
      0
    );
  }


  function groupStatus(group) {
    const amount = numeric(group.statementAmount);
    const received = groupReceived(group);

    if (amount > 0 && received >= amount) {
      return 'Settled';
    }

    if (received > 0) {
      return 'Partially Paid';
    }

    return 'Open';
  }


  function buildMonthGroups(orders) {
    const map = new Map();

    orders.forEach(order => {
      const createdDate = safeCreatedDate(order);

      if (!createdDate) return;
      if (String(order.status || '') !== 'Delivered') return;

      if (
        order.billingType &&
        order.billingType !== 'Monthly Account'
      ) {
        return;
      }

      const month = monthValue(createdDate);

      if (!map.has(month)) {
        map.set(month, {
          month,
          orders: [],
          statementAmount: 0
        });
      }

      const group = map.get(month);
      group.orders.push({
        ...order,
        createdDate
      });
      group.statementAmount += numeric(order.totalAmount);
    });

    return Array.from(map.values())
      .sort((a, b) => a.month.localeCompare(b.month));
  }


  function carryForwardOutstanding() {
    return carryForwardGroups
      .reduce(
        (sum, group) =>
          sum + groupOutstanding(group),
        0
      );
  }


  function currentMonthReceived() {
    return currentGroup
      ? groupReceived(currentGroup)
      : 0;
  }


  function totalDueBeforeNewPayment() {
    const currentOutstanding =
      currentGroup
        ? groupOutstanding(currentGroup)
        : 0;

    return (
      carryForwardOutstanding() +
      currentOutstanding
    );
  }


  function overallStatus() {
    const due = totalDueBeforeNewPayment();

    if (due <= 0 && currentGroup) {
      return 'Settled';
    }

    const anyReceived =
      monthGroups
        .filter(group => group.month <= currentBillingMonth)
        .some(group => groupReceived(group) > 0);

    return anyReceived
      ? 'Partially Paid'
      : 'Open';
  }


  function statusClass(status) {
    if (status === 'Settled') return 'status-settled';
    if (status === 'Partially Paid') return 'status-partial';
    return 'status-open';
  }


  function aggregateCurrentProducts(group) {
    const map = new Map();

    if (!group) return [];

    group.orders.forEach(order => {
      const items = Array.isArray(order.items)
        ? order.items
        : [];

      items.forEach(item => {
        const name = item.name || 'Item';
        const description = item.description || '';
        const unitPrice = numeric(item.unitPrice);
        const key = [name, description, unitPrice].join('|');

        if (!map.has(key)) {
          map.set(key, {
            name,
            description,
            qty: 0,
            unitPrice,
            amount: 0
          });
        }

        const row = map.get(key);
        row.qty += numeric(item.qty);
        row.amount += numeric(
          item.lineTotal ||
          (numeric(item.qty) * unitPrice)
        );
      });
    });

    return Array.from(map.values());
  }


  function numberToWordsPKR(value) {
    let n = Math.round(numeric(value));

    if (n === 0) return 'Zero Rupee';

    const ones = [
      '', 'One', 'Two', 'Three', 'Four', 'Five',
      'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
      'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen',
      'Nineteen'
    ];

    const tens = [
      '', '', 'Twenty', 'Thirty', 'Forty',
      'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
    ];

    function underHundred(num) {
      if (num < 20) return ones[num];

      return (
        tens[Math.floor(num / 10)] +
        (num % 10 ? ' ' + ones[num % 10] : '')
      );
    }

    function underThousand(num) {
      const hundred = Math.floor(num / 100);
      const rest = num % 100;

      return (
        (hundred ? ones[hundred] + ' Hundred' : '') +
        (hundred && rest ? ' ' : '') +
        (rest ? underHundred(rest) : '')
      );
    }

    const parts = [];

    const crore = Math.floor(n / 10000000);
    if (crore) {
      parts.push(
        numberToWordsSimple(crore) + ' Crore'
      );
      n %= 10000000;
    }

    const lakh = Math.floor(n / 100000);
    if (lakh) {
      parts.push(
        numberToWordsSimple(lakh) + ' Lakh'
      );
      n %= 100000;
    }

    const thousand = Math.floor(n / 1000);
    if (thousand) {
      parts.push(
        numberToWordsSimple(thousand) + ' Thousand'
      );
      n %= 1000;
    }

    if (n) {
      parts.push(underThousand(n));
    }

    return parts.join(' ') + ' Rupee';

    function numberToWordsSimple(num) {
      if (num < 100) return underHundred(num);
      return underThousand(num);
    }
  }


  function loadCustomers() {
    customerSelect.disabled = true;
    customerSelect.innerHTML =
      '<option value="">Loading customers...</option>';

    return new Promise(resolve => {
      const callbackName =
        'manaalInvoiceCustomers_' +
        Date.now() +
        '_' +
        Math.random().toString(36).slice(2);

      let script = null;

      const cleanup = () => {
        try {
          delete window[callbackName];
        } catch (e) {}

        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };

      const timer = setTimeout(() => {
        cleanup();
        customerSelect.disabled = false;
        customerSelect.innerHTML =
          '<option value="">Could not load customers</option>';
        resolve([]);
      }, 12000);

      window[callbackName] = response => {
        clearTimeout(timer);

        customers =
          response &&
          response.success &&
          Array.isArray(response.customers)
            ? response.customers
            : [];

        customerSelect.innerHTML =
          '<option value="">-- Select Customer --</option>';

        customers.forEach(customer => {
          const option = document.createElement('option');
          option.value = customer.id;
          option.textContent =
            `${customer.name} — ${customer.id}`;
          customerSelect.appendChild(option);
        });

        customerSelect.disabled = false;
        cleanup();
        resolve(customers);
      };

      script = document.createElement('script');

      script.src =
        SALES_SYNC_WEB_APP_URL +
        '?action=customers' +
        '&callback=' +
        encodeURIComponent(callbackName) +
        '&_=' +
        Date.now();

      script.async = true;

      script.onerror = () => {
        clearTimeout(timer);
        cleanup();
        customerSelect.disabled = false;
        customerSelect.innerHTML =
          '<option value="">Could not load customers</option>';
        resolve([]);
      };

      document.head.appendChild(script);
    });
  }


  function collectTransactionsForInvoice() {
    const txMap = new Map();

    const relevantGroups = [
      ...carryForwardGroups,
      ...(currentGroup ? [currentGroup] : [])
    ];

    relevantGroups.forEach(group => {
      groupPayments(group).forEach(payment => {
        const parentId =
          payment.parentPaymentId ||
          payment.paymentId;

        if (!txMap.has(parentId)) {
          txMap.set(parentId, {
            parentPaymentId: parentId,
            paymentDate: payment.paymentDate || '',
            paymentMethod: payment.paymentMethod || '',
            bankOrCheque: payment.bankOrCheque || '',
            referenceNumber: payment.referenceNumber || '',
            notes: payment.notes || '',
            amount:
              numeric(
                payment.transactionAmount ||
                payment.amount
              )
          });
        }
      });
    });

    return Array.from(txMap.values())
      .sort(
        (a, b) =>
          new Date(a.paymentDate || 0) -
          new Date(b.paymentDate || 0)
      );
  }


  function renderPaymentHistory() {
    const empty =
      document.getElementById('paymentHistoryEmpty');
    const table =
      document.getElementById('paymentHistoryTable');
    const rows =
      document.getElementById('paymentRows');

    currentInvoiceTransactions =
      collectTransactionsForInvoice();

    rows.innerHTML = '';

    if (!currentInvoiceTransactions.length) {
      empty.style.display = 'block';
      table.style.display = 'none';
      return;
    }

    empty.style.display = 'none';
    table.style.display = 'block';

    currentInvoiceTransactions.forEach(payment => {
      const tr = document.createElement('tr');

      tr.innerHTML =
        '<td>' + escapeHtml(payment.paymentDate) + '</td>' +
        '<td>' + escapeHtml(payment.paymentMethod) + '</td>' +
        '<td>' + escapeHtml(payment.bankOrCheque) + '</td>' +
        '<td>' + escapeHtml(payment.referenceNumber) + '</td>' +
        '<td>' + escapeHtml(payment.notes) + '</td>' +
        '<td class="money"><strong>' +
        money(payment.amount) +
        '</strong></td>';

      rows.appendChild(tr);
    });
  }


  function renderInvoice() {
    const rows = document.getElementById('statementRows');
    rows.innerHTML = '';

    const currentProducts =
      aggregateCurrentProducts(currentGroup);

    currentProducts.forEach(item => {
      const tr = document.createElement('tr');

      const description =
        item.name +
        (
          item.description
            ? '<span class="balance-sub">' +
              escapeHtml(item.description) +
              '</span>'
            : ''
        );

      tr.innerHTML =
        '<td>' + description + '</td>' +
        '<td class="qty">' +
        numeric(item.qty).toFixed(2) +
        '</td>' +
        '<td class="unit">' +
        numeric(item.unitPrice).toLocaleString(
          'en-PK',
          {minimumFractionDigits:2,maximumFractionDigits:2}
        ) +
        '</td>' +
        '<td class="tax"></td>' +
        '<td class="amt">' +
        money(item.amount) +
        '</td>';

      rows.appendChild(tr);
    });

    carryForwardGroups.forEach(group => {
      const outstanding = groupOutstanding(group);

      if (outstanding <= 0) return;

      const tr = document.createElement('tr');
      tr.className = 'balance-row';

      tr.innerHTML =
        '<td>Balance' +
        '<span class="balance-sub">Pending Month of ' +
        escapeHtml(monthLabel(group.month)) +
        '</span></td>' +
        '<td class="qty"></td>' +
        '<td class="unit"></td>' +
        '<td class="tax"></td>' +
        '<td class="amt">' +
        money(outstanding) +
        '</td>';

      rows.appendChild(tr);
    });

    if (!currentProducts.length) {
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td colspan="5" style="text-align:center;padding:18px;">' +
        'No Delivered Monthly Account orders in this billing month.' +
        '</td>';
      rows.appendChild(tr);
    }

    const currentCharges =
      currentGroup
        ? numeric(currentGroup.statementAmount)
        : 0;

    const previousBalance =
      carryForwardOutstanding();

    const relevantReceived =
      (currentGroup ? groupReceived(currentGroup) : 0);

    const outstanding =
      totalDueBeforeNewPayment();

    const status = overallStatus();

    const statementNo = invoiceNumber();

    document.getElementById('statementNumber').textContent =
      statementNo;

    document.getElementById('paymentCommunication').textContent =
      statementNo;

    document.getElementById('invoiceCustomerName').textContent =
      currentCustomer.name;

    const latestOrder =
      currentGroup && currentGroup.orders.length
        ? currentGroup.orders[currentGroup.orders.length - 1]
        : allCustomerOrders
            .filter(order => safeCreatedDate(order))
            .sort(
              (a, b) =>
                safeCreatedDate(b) - safeCreatedDate(a)
            )[0];

    const addressParts = [];

    if (latestOrder) {
      if (latestOrder.address) {
        addressParts.push(latestOrder.address);
      }
      if (
        latestOrder.area &&
        !addressParts.includes(latestOrder.area)
      ) {
        addressParts.push(latestOrder.area);
      }
    }

    document.getElementById('invoiceCustomerAddress').textContent =
      addressParts.length
        ? addressParts.join(' / ')
        : currentCustomer.id;

    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 2);

    document.getElementById('invoiceDate').textContent =
      formatInvoiceDate(invoiceDate);

    document.getElementById('dueDate').textContent =
      formatInvoiceDate(dueDate);

    document.getElementById('currentMonthAmount').textContent =
      money(currentCharges);

    document.getElementById('previousBalanceAmount').textContent =
      money(previousBalance);

    document.getElementById('previousBalanceSummaryRow').style.display =
      previousBalance > 0 ? 'flex' : 'none';

    document.getElementById('totalReceived').textContent =
      money(relevantReceived);

    document.getElementById('totalOutstanding').textContent =
      money(outstanding);

    document.getElementById('amountInWords').textContent =
      numberToWordsPKR(outstanding);

    const statusEl =
      document.getElementById('statementStatus');

    statusEl.textContent = status.toUpperCase();
    statusEl.className =
      'status-pill ' + statusClass(status);

    view.style.display = 'block';

    settlementPanel.style.display =
      (
        currentGroup ||
        previousBalance > 0
      )
        ? 'block'
        : 'none';

    paymentAmount.max = String(outstanding);
    paymentAmount.placeholder =
      outstanding > 0
        ? 'Outstanding: Rs. ' +
          outstanding.toLocaleString('en-PK')
        : 'Account settled';

    recordPaymentBtn.disabled =
      outstanding <= 0;

    recordPaymentBtn.textContent =
      outstanding <= 0
        ? 'Account Settled'
        : 'Record Payment';

    renderPaymentHistory();
  }


  async function generateStatement() {
    const customerId = customerSelect.value;
    const billingMonth = monthInput.value;

    if (!customerId) {
      alert('Please select a permanent customer.');
      return;
    }

    if (!billingMonth) {
      alert('Please select a billing month.');
      return;
    }

    currentCustomer =
      customers.find(item => item.id === customerId) ||
      {id: customerId, name: customerId};

    currentBillingMonth = billingMonth;

    loadBtn.disabled = true;
    loadBtn.textContent = 'Loading...';

    message.style.display = 'block';
    message.textContent =
      'Loading customer monthly history and previous balances...';

    view.style.display = 'none';
    settlementPanel.style.display = 'none';

    try {
      const snapshot =
        await db.collection('orders')
          .where('customerId', '==', customerId)
          .get();

      allCustomerOrders =
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

      monthGroups =
        buildMonthGroups(allCustomerOrders);

      currentGroup =
        monthGroups.find(
          group =>
            group.month ===
            currentBillingMonth
        ) || null;

      carryForwardGroups =
        monthGroups.filter(
          group =>
            group.month <
              currentBillingMonth &&
            groupOutstanding(group) > 0
        );

      renderInvoice();

      message.style.display = 'none';

      if (!currentGroup && !carryForwardGroups.length) {
        message.style.display = 'block';
        message.textContent =
          'No Delivered Monthly Account orders or previous outstanding balance were found for this customer.';
      }

    } catch (error) {
      console.error(error);

      message.style.display = 'block';
      message.textContent =
        'Could not generate invoice: ' +
        (error.message || 'Unknown error');

    } finally {
      loadBtn.disabled = false;
      loadBtn.textContent = 'Generate Invoice';
    }
  }


  function newPaymentId() {
    return (
      'PAY-' +
      Date.now() +
      '-' +
      Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()
    );
  }


  function paymentAllocationId(parentId, month) {
    return (
      parentId +
      '-' +
      month.replace('-', '')
    );
  }


  async function syncOrderToSalesSheet(order, updates) {
    const createdDate = safeCreatedDate(order);

    const merged = {
      ...order,
      ...updates,
      firestoreId: order.id,
      orderDate:
        createdDate
          ? createdDate.toISOString()
          : new Date().toISOString(),
      invoiceNumber:
        order.invoiceNumber ||
        (
          order.orderNumber
            ? 'INV-' + order.orderNumber
            : ''
        )
    };

    try {
      await fetch(
        SALES_SYNC_WEB_APP_URL,
        {
          method: 'POST',
          mode: 'no-cors',
          keepalive: true,
          headers: {
            'Content-Type':
              'text/plain;charset=utf-8'
          },
          body: JSON.stringify(merged)
        }
      );
    } catch (error) {
      console.warn(
        'Sales Register sync failed:',
        error
      );
    }
  }


  async function syncPaymentToGoogleSheet(
    payment,
    statementAmount,
    receivedAfter,
    outstandingAfter,
    statusAfter
  ) {
    const payload = {
      syncType: 'monthlyPayment',
      paymentId: payment.parentPaymentId,
      statementId: invoiceNumber(),
      customerId: currentCustomer.id,
      customerName: currentCustomer.name,
      billingMonth: currentBillingMonth,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      bankOrCheque: payment.bankOrCheque,
      referenceNumber: payment.referenceNumber,
      amount: payment.transactionAmount,
      notes: payment.notes,
      statementAmount,
      totalReceived: receivedAfter,
      outstanding: outstandingAfter,
      status: statusAfter,
      recordedAt: payment.recordedAt
    };

    try {
      await fetch(
        SALES_SYNC_WEB_APP_URL,
        {
          method: 'POST',
          mode: 'no-cors',
          keepalive: true,
          headers: {
            'Content-Type':
              'text/plain;charset=utf-8'
          },
          body: JSON.stringify(payload)
        }
      );
    } catch (error) {
      console.warn(
        'Monthly payment Sheet sync failed:',
        error
      );
    }
  }


  async function recordPayment() {
    if (!currentCustomer || !currentBillingMonth) {
      alert('Generate an invoice first.');
      return;
    }

    const amount = numeric(paymentAmount.value);
    const dueBefore = totalDueBeforeNewPayment();

    if (amount <= 0) {
      alert('Please enter the amount received.');
      return;
    }

    if (amount > dueBefore + 0.001) {
      alert(
        'The payment cannot be more than the current outstanding amount of Rs. ' +
        dueBefore.toLocaleString('en-PK') +
        '.'
      );
      return;
    }

    if (!paymentDate.value) {
      alert('Please enter the payment date.');
      return;
    }

    if (
      !confirm(
        'Record payment of Rs. ' +
        amount.toLocaleString('en-PK') +
        ' against ' +
        currentCustomer.name +
        '?'
      )
    ) {
      return;
    }

    const parentPaymentId = newPaymentId();

    const transactionBase = {
      parentPaymentId,
      transactionAmount: amount,
      paymentDate: paymentDate.value,
      paymentMethod: paymentMethod.value,
      bankOrCheque:
        paymentBankCheque.value.trim(),
      referenceNumber:
        paymentReference.value.trim(),
      notes:
        paymentNotes.value.trim(),
      recordedAt:
        new Date().toISOString(),
      recordedBy:
        auth.currentUser &&
        auth.currentUser.email
          ? auth.currentUser.email
          : 'owner'
    };

    const allocationGroups = [
      ...carryForwardGroups,
      ...(currentGroup ? [currentGroup] : [])
    ].sort(
      (a, b) =>
        a.month.localeCompare(b.month)
    );

    let remaining = amount;
    const allocations = [];

    allocationGroups.forEach(group => {
      if (remaining <= 0) return;

      const outstanding =
        groupOutstanding(group);

      if (outstanding <= 0) return;

      const allocationAmount =
        Math.min(
          outstanding,
          remaining
        );

      allocations.push({
        group,
        allocation: {
          ...transactionBase,
          paymentId:
            paymentAllocationId(
              parentPaymentId,
              group.month
            ),
          allocationMonth:
            group.month,
          amount:
            allocationAmount
        }
      });

      remaining -= allocationAmount;
    });

    recordPaymentBtn.disabled = true;
    recordPaymentBtn.textContent = 'Recording...';

    try {
      const batch = db.batch();
      const touchedOrders = [];

      allocations.forEach(({group, allocation}) => {
        const existingPayments =
          groupPayments(group);

        const updatedPayments = [
          ...existingPayments,
          allocation
        ];

        const receivedAfter =
          updatedPayments.reduce(
            (sum, item) =>
              sum + numeric(item.amount),
            0
          );

        const outstandingAfter =
          Math.max(
            group.statementAmount -
            receivedAfter,
            0
          );

        const statusAfter =
          outstandingAfter <= 0
            ? 'Settled'
            : receivedAfter > 0
              ? 'Partially Paid'
              : 'Open';

        const paymentStatusAfter =
          statusAfter === 'Settled'
            ? 'Paid'
            : 'Monthly Account';

        group.orders.forEach(order => {
          const ref =
            db.collection('orders')
              .doc(order.id);

          batch.update(
            ref,
            {
              monthlyStatementId:
                'MS-' +
                currentCustomer.id +
                '-' +
                group.month,

              monthlyStatementMonth:
                group.month,

              monthlyStatementAmount:
                group.statementAmount,

              monthlyPayments:
                updatedPayments,

              monthlyStatementReceived:
                receivedAfter,

              monthlyStatementOutstanding:
                outstandingAfter,

              monthlyStatementStatus:
                statusAfter,

              monthlyStatementUpdatedAt:
                firebase.firestore.FieldValue
                  .serverTimestamp(),

              paymentStatus:
                paymentStatusAfter,

              paymentUpdatedAt:
                firebase.firestore.FieldValue
                  .serverTimestamp()
            }
          );

          touchedOrders.push({
            order,
            updates: {
              monthlyStatementId:
                'MS-' +
                currentCustomer.id +
                '-' +
                group.month,
              monthlyStatementMonth:
                group.month,
              monthlyStatementAmount:
                group.statementAmount,
              monthlyPayments:
                updatedPayments,
              monthlyStatementReceived:
                receivedAfter,
              monthlyStatementOutstanding:
                outstandingAfter,
              monthlyStatementStatus:
                statusAfter,
              paymentStatus:
                paymentStatusAfter
            }
          });
        });
      });

      await batch.commit();

      await Promise.all(
        touchedOrders.map(item =>
          syncOrderToSalesSheet(
            item.order,
            item.updates
          )
        )
      );

      const statementAmountBeforePayment =
        dueBefore;

      const outstandingAfter =
        Math.max(
          dueBefore - amount,
          0
        );

      const statusAfter =
        outstandingAfter <= 0
          ? 'Settled'
          : 'Partially Paid';

      await syncPaymentToGoogleSheet(
        transactionBase,
        statementAmountBeforePayment,
        amount,
        outstandingAfter,
        statusAfter
      );

      paymentAmount.value = '';
      paymentBankCheque.value = '';
      paymentReference.value = '';
      paymentNotes.value = '';

      await generateStatement();

      alert(
        statusAfter === 'Settled'
          ? 'Payment recorded. The carried balance and current account are now settled.'
          : 'Payment recorded successfully. The oldest outstanding balance was settled first.'
      );

    } catch (error) {
      console.error(error);

      alert(
        'Could not record payment: ' +
        (error.message || 'Unknown error')
      );

      recordPaymentBtn.disabled = false;
      recordPaymentBtn.textContent = 'Record Payment';
    }
  }


  loadBtn.addEventListener(
    'click',
    generateStatement
  );

  printBtn.addEventListener(
    'click',
    () => {
      if (view.style.display === 'none') {
        alert('Generate an invoice first.');
        return;
      }

      window.print();
    }
  );

  recordPaymentBtn.addEventListener(
    'click',
    recordPayment
  );

  setCurrentMonth();
  setToday();

  const urlParams =
    new URLSearchParams(
      window.location.search
    );

  const requestedCustomer =
    urlParams.get('customer');

  const requestedMonth =
    urlParams.get('month');

  if (requestedMonth) {
    monthInput.value =
      requestedMonth;
  }

  auth.onAuthStateChanged(user => {
    if (
      user &&
      String(user.email || '').toLowerCase() ===
      String(OWNER_EMAIL || '').toLowerCase()
    ) {
      loginGate.style.display = 'none';
      statementApp.style.display = 'block';

      loadCustomers()
        .then(() => {
          if (
            requestedCustomer &&
            customers.some(
              customer =>
                customer.id ===
                requestedCustomer
            )
          ) {
            customerSelect.value =
              requestedCustomer;

            generateStatement();
          }
        });

    } else {
      loginGate.innerHTML =
        'Owner access required. ' +
        '<a href="owner-dashboard.html">' +
        'Open Owner Dashboard</a>';
    }
  });

});
