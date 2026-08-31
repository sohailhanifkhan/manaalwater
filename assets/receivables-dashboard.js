document.addEventListener('DOMContentLoaded', () => {
  const loginGate = document.getElementById('loginGate');
  const app = document.getElementById('app');
  const monthFilter = document.getElementById('monthFilter');
  const statusFilter = document.getElementById('statusFilter');
  const customerSearch = document.getElementById('customerSearch');
  const refreshBtn = document.getElementById('refreshBtn');
  const message = document.getElementById('message');
  const rows = document.getElementById('receivablesRows');
  let statements = [];

  function money(value) {
    return 'Rs. ' + Number(value || 0).toLocaleString('en-PK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function numeric(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function monthValue(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  }

  function safeCreatedDate(data) {
    if (data.createdAt && typeof data.createdAt.toDate === 'function') {
      return data.createdAt.toDate();
    }
    return null;
  }

  function statementEndDate(month) {
    const parts = month.split('-').map(Number);
    return new Date(parts[0], parts[1], 0, 23, 59, 59, 999);
  }

  function ageDays(month) {
    const diff = Date.now() - statementEndDate(month).getTime();
    return Math.max(0, Math.floor(diff / 86400000));
  }

  function statusClass(status) {
    if (status === 'Settled') return 'status-settled';
    if (status === 'Partially Paid') return 'status-partial';
    return 'status-open';
  }

  function statusFrom(statementAmount, received) {
    if (statementAmount > 0 && received >= statementAmount) return 'Settled';
    if (received > 0) return 'Partially Paid';
    return 'Open';
  }

  function aggregateOrders(orders) {
    const map = new Map();

    orders.forEach(order => {
      const customerId = order.customerId || '';
      const createdDate = safeCreatedDate(order);
      if (!customerId || !createdDate) return;
      if (String(order.status || '') !== 'Delivered') return;
      if (order.billingType && order.billingType !== 'Monthly Account') return;

      const month = monthValue(createdDate);
      const key = customerId + '|' + month;

      if (!map.has(key)) {
        map.set(key, {
          key,
          customerId,
          customerName: order.customerRegisteredName || order.name || customerId,
          month,
          statementAmount: 0,
          paymentsMap: new Map(),
          orderCount: 0
        });
      }

      const item = map.get(key);
      item.statementAmount += numeric(order.totalAmount);
      item.orderCount += 1;

      const payments = Array.isArray(order.monthlyPayments) ? order.monthlyPayments : [];
      payments.forEach(payment => {
        if (payment && payment.paymentId && !item.paymentsMap.has(payment.paymentId)) {
          item.paymentsMap.set(payment.paymentId, payment);
        }
      });
    });

    return Array.from(map.values()).map(item => {
      const payments = Array.from(item.paymentsMap.values());
      const received = payments.reduce((sum, payment) => sum + numeric(payment.amount), 0);
      const outstanding = Math.max(item.statementAmount - received, 0);
      return {
        ...item,
        payments,
        received,
        outstanding,
        status: statusFrom(item.statementAmount, received),
        ageDays: ageDays(item.month)
      };
    });
  }

  async function loadData() {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Loading...';
    message.style.display = 'block';
    message.textContent = 'Loading monthly account receivables...';

    try {
      let snapshot;
      try {
        snapshot = await db.collection('orders')
          .where('billingType', '==', 'Monthly Account')
          .get();
      } catch (firstError) {
        snapshot = await db.collection('orders').get();
      }

      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      statements = aggregateOrders(orders);
      message.style.display = 'none';
      render();
    } catch (error) {
      console.error(error);
      message.style.display = 'block';
      message.textContent = 'Could not load receivables: ' + (error.message || 'Unknown error');
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh';
    }
  }

  function filteredStatements() {
    const month = monthFilter.value;
    const status = statusFilter.value;
    const search = customerSearch.value.trim().toLowerCase();

    return statements.filter(item => {
      if (month && item.month !== month) return false;
      if (status && item.status !== status) return false;
      if (search) {
        const haystack = (item.customerName + ' ' + item.customerId).toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }

  function renderCards(items) {
    const receivable = items.reduce((sum, item) => sum + item.statementAmount, 0);
    const received = items.reduce((sum, item) => sum + item.received, 0);
    const outstanding = items.reduce((sum, item) => sum + item.outstanding, 0);
    const pct = receivable > 0 ? (received / receivable) * 100 : 0;

    document.getElementById('totalReceivable').textContent = money(receivable);
    document.getElementById('totalReceived').textContent = money(received);
    document.getElementById('totalOutstanding').textContent = money(outstanding);
    document.getElementById('collectionPercent').textContent = pct.toFixed(1) + '%';
    document.getElementById('openAccounts').textContent = items.filter(x => x.status === 'Open').length;
    document.getElementById('partialAccounts').textContent = items.filter(x => x.status === 'Partially Paid').length;
    document.getElementById('settledAccounts').textContent = items.filter(x => x.status === 'Settled').length;
    document.getElementById('statementCount').textContent = items.length;
  }

  function renderAging(items) {
    let a30 = 0, a60 = 0, a90 = 0, a90plus = 0;
    items.forEach(item => {
      if (item.outstanding <= 0) return;
      if (item.ageDays <= 30) a30 += item.outstanding;
      else if (item.ageDays <= 60) a60 += item.outstanding;
      else if (item.ageDays <= 90) a90 += item.outstanding;
      else a90plus += item.outstanding;
    });

    document.getElementById('aging30').textContent = money(a30);
    document.getElementById('aging60').textContent = money(a60);
    document.getElementById('aging90').textContent = money(a90);
    document.getElementById('aging90plus').textContent = money(a90plus);
  }

  function renderTable(items) {
    rows.innerHTML = '';
    if (!items.length) {
      rows.innerHTML = '<tr><td colspan="9" class="empty">No receivable records match the selected filters.</td></tr>';
      return;
    }

    [...items].sort((a,b) => b.outstanding - a.outstanding || a.customerName.localeCompare(b.customerName))
      .forEach(item => {
        const tr = document.createElement('tr');
        const actionUrl =
          'customer-statement.html?customer=' +
          encodeURIComponent(item.customerId) +
          '&month=' +
          encodeURIComponent(item.month);

        tr.innerHTML =
          '<td><strong>' + escapeHtml(item.customerName) + '</strong></td>' +
          '<td>' + escapeHtml(item.customerId) + '</td>' +
          '<td>' + escapeHtml(item.month) + '</td>' +
          '<td><span class="status-pill ' + statusClass(item.status) + '">' +
          escapeHtml(item.status.toUpperCase()) + '</span></td>' +
          '<td class="money">' + money(item.statementAmount) + '</td>' +
          '<td class="money">' + money(item.received) + '</td>' +
          '<td class="money"><strong>' + money(item.outstanding) + '</strong></td>' +
          '<td>' + item.ageDays + ' days</td>' +
          '<td><a class="btn btn-outline" style="display:inline-block;text-decoration:none;padding:7px 10px;" href="' +
          actionUrl + '">Open Account</a></td>';

        rows.appendChild(tr);
      });
  }

  function render() {
    const items = filteredStatements();
    renderCards(items);
    renderAging(items);
    renderTable(items);
  }

  monthFilter.value = monthValue(new Date());
  refreshBtn.addEventListener('click', loadData);
  monthFilter.addEventListener('change', render);
  statusFilter.addEventListener('change', render);
  customerSearch.addEventListener('input', render);

  auth.onAuthStateChanged(user => {
    if (
      user &&
      String(user.email || '').toLowerCase() === String(OWNER_EMAIL || '').toLowerCase()
    ) {
      loginGate.style.display = 'none';
      app.style.display = 'block';
      loadData();
    } else {
      loginGate.innerHTML =
        'Owner access required. <a href="owner-dashboard.html">Open Owner Dashboard</a>';
    }
  });
});
