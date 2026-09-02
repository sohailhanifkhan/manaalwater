document.addEventListener('DOMContentLoaded', () => {

  const SALES_SYNC_WEB_APP_URL =
    'https://script.google.com/macros/s/AKfycbyUfljON8xGW84CO26VI5n67AsIu62VfoEGtA7RFiXaubN1lnBuH4QMWtxRXSU5EYUz/exec';

  const $ = id =>
    document.getElementById(id);

  const loginGate = $('loginGate');
  const invoiceApp = $('invoiceApp');
  const customerSelect = $('customerSelect');
  const billingMonth = $('billingMonth');
  const dueDate = $('dueDate');
  const loadBtn = $('loadBtn');
  const generateBtn = $('generateBtn');
  const printBtn = $('printBtn');
  const message = $('message');
  const balancePicker = $('balancePicker');
  const balanceOptions = $('balanceOptions');
  const invoicePaper = $('invoicePaper');

  let customers = [];
  let selectedCustomer = null;
  let customerOrders = [];
  let currentMonthOrders = [];
  let previousBalanceGroups = [];


  function numeric(value) {

    const number =
      Number(value || 0);

    return Number.isFinite(number)
      ? number
      : 0;

  }


  function money(value) {

    return Number(value || 0)
      .toLocaleString(
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


  function createdDate(order) {

    if (
      order.createdAt &&
      typeof order.createdAt.toDate ===
        'function'
    ) {

      return order.createdAt.toDate();

    }

    return null;

  }


  function dateFromYmd(value) {

    if (!value) {
      return null;
    }

    const parts =
      String(value)
        .split('-')
        .map(Number);

    if (
      parts.length !== 3 ||
      !parts[0] ||
      !parts[1] ||
      !parts[2]
    ) {

      return null;

    }

    const date =
      new Date(
        parts[0],
        parts[1] - 1,
        parts[2]
      );

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;

  }


  // New manual orders use manualDeliveryDate as the billing date.
  // Older orders remain compatible by falling back to createdAt.
  function orderBillingDate(order) {

    return (
      dateFromYmd(
        order.deliveryDate
      ) ||
      createdDate(order)
    );

  }


  function monthValue(date) {

    return (
      date.getFullYear() +
      '-' +
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        '0'
      )
    );

  }


  function monthLabel(value) {

    if (!value) {
      return '';
    }

    const [
      year,
      month
    ] =
      String(value)
        .split('-')
        .map(Number);

    return new Date(
      year,
      month - 1,
      1
    ).toLocaleDateString(
      'en-GB',
      {
        month: 'long',
        year: 'numeric'
      }
    );

  }


  function dateLabel(date) {

    if (
      !(date instanceof Date) ||
      Number.isNaN(
        date.getTime()
      )
    ) {

      return '—';

    }

    return date.toLocaleDateString(
      'en-GB',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );

  }


  function inputDateLabel(value) {

    return dateLabel(
      dateFromYmd(value)
    );

  }


  function setDefaults() {

    const now =
      new Date();

    billingMonth.value =
      monthValue(now);

    const due =
      new Date(now);

    due.setDate(
      due.getDate() + 2
    );

    dueDate.value =
      due.getFullYear() +
      '-' +
      String(
        due.getMonth() + 1
      ).padStart(
        2,
        '0'
      ) +
      '-' +
      String(
        due.getDate()
      ).padStart(
        2,
        '0'
      );

  }


  function uniquePayments(orders) {

    const map =
      new Map();

    orders.forEach(
      order => {

        const payments =
          Array.isArray(
            order.monthlyPayments
          )
            ? order.monthlyPayments
            : [];

        payments.forEach(
          payment => {

            if (
              payment &&
              payment.paymentId &&
              !map.has(
                payment.paymentId
              )
            ) {

              map.set(
                payment.paymentId,
                payment
              );

            }

          }
        );

      }
    );

    return Array.from(
      map.values()
    );

  }


  function groupOutstanding(group) {

    const total =
      group.orders.reduce(
        (
          sum,
          order
        ) =>
          sum +
          numeric(
            order.totalAmount
          ),
        0
      );

    const received =
      uniquePayments(
        group.orders
      ).reduce(
        (
          sum,
          payment
        ) =>
          sum +
          numeric(
            payment.amount
          ),
        0
      );

    return Math.max(
      total - received,
      0
    );

  }


  function buildPreviousGroups() {

    const selectedMonth =
      billingMonth.value;

    const map =
      new Map();

    customerOrders.forEach(
      order => {

        const date =
          orderBillingDate(
            order
          );

        if (!date) {
          return;
        }

        if (
          String(
            order.status || ''
          ) !==
          'Delivered'
        ) {
          return;
        }

        if (
          order.billingType &&
          order.billingType !==
            'Monthly Account'
        ) {
          return;
        }

        const month =
          monthValue(date);

        // The selected billing month is always current,
        // never an outstanding month.
        if (
          month >=
          selectedMonth
        ) {
          return;
        }

        if (
          !map.has(month)
        ) {

          map.set(
            month,
            {
              month,
              orders: []
            }
          );

        }

        map
          .get(month)
          .orders
          .push(order);

      }
    );

    previousBalanceGroups =
      Array.from(
        map.values()
      )
        .map(
          group => ({
            ...group,
            outstanding:
              groupOutstanding(
                group
              )
          })
        )
        .filter(
          group =>
            group.outstanding > 0
        )
        .sort(
          (
            a,
            b
          ) =>
            a.month.localeCompare(
              b.month
            )
        );

  }


  function renderBalancePicker() {

    balanceOptions.innerHTML =
      '';

    if (
      !previousBalanceGroups.length
    ) {

      balancePicker.style.display =
        'none';

      return;

    }

    previousBalanceGroups.forEach(
      group => {

        const label =
          document.createElement(
            'label'
          );

        label.className =
          'balance-option';

        label.innerHTML =
          '<input type="checkbox" class="previous-balance-check" ' +
          'data-month="' +
          escapeHtml(
            group.month
          ) +
          '">' +
          '<span><strong>' +
          escapeHtml(
            monthLabel(
              group.month
            )
          ) +
          '</strong> — Outstanding ' +
          escapeHtml(
            money(
              group.outstanding
            )
          ) +
          '</span>';

        balanceOptions
          .appendChild(
            label
          );

      }
    );

    balancePicker.style.display =
      'block';

  }


  function selectedPreviousGroups() {

    const selectedMonths =
      Array.from(
        document.querySelectorAll(
          '.previous-balance-check:checked'
        )
      )
        .map(
          input =>
            input.dataset.month
        );

    return previousBalanceGroups
      .filter(
        group =>
          selectedMonths.includes(
            group.month
          )
      );

  }


  function loadCustomers() {

    customerSelect.disabled =
      true;

    customerSelect.innerHTML =
      '<option value="">Loading customers...</option>';

    return new Promise(
      resolve => {

        const callbackName =
          'manaalSimpleInvoiceCustomers_' +
          Date.now() +
          '_' +
          Math.random()
            .toString(36)
            .slice(2);

        let script =
          null;

        const cleanup =
          () => {

            try {
              delete window[
                callbackName
              ];
            } catch (error) {}

            if (
              script &&
              script.parentNode
            ) {

              script.parentNode
                .removeChild(
                  script
                );

            }

          };

        const timer =
          setTimeout(
            () => {

              cleanup();

              customerSelect.disabled =
                false;

              customerSelect.innerHTML =
                '<option value="">Could not load customers</option>';

              resolve([]);

            },
            12000
          );

        window[
          callbackName
        ] =
          response => {

            clearTimeout(
              timer
            );

            customers =
              response &&
              response.success &&
              Array.isArray(
                response.customers
              )
                ? response.customers
                : [];

            customerSelect.innerHTML =
              '<option value="">-- Select Customer --</option>';

            customers.forEach(
              customer => {

                const option =
                  document.createElement(
                    'option'
                  );

                option.value =
                  customer.id;

                option.textContent =
                  `${customer.name} — ${customer.id}`;

                customerSelect
                  .appendChild(
                    option
                  );

              }
            );

            customerSelect.disabled =
              false;

            cleanup();

            resolve(
              customers
            );

          };

        script =
          document.createElement(
            'script'
          );

        script.src =
          SALES_SYNC_WEB_APP_URL +
          '?action=customers' +
          '&callback=' +
          encodeURIComponent(
            callbackName
          ) +
          '&_=' +
          Date.now();

        script.async =
          true;

        script.onerror =
          () => {

            clearTimeout(
              timer
            );

            cleanup();

            customerSelect.disabled =
              false;

            customerSelect.innerHTML =
              '<option value="">Could not load customers</option>';

            resolve([]);

          };

        document.head
          .appendChild(
            script
          );

      }
    );

  }


  async function loadBilling() {

    if (
      !customerSelect.value
    ) {

      alert(
        'Please select a customer.'
      );

      return;

    }

    if (
      !billingMonth.value
    ) {

      alert(
        'Please select the billing month.'
      );

      return;

    }

    if (
      !dueDate.value
    ) {

      alert(
        'Please select the due date.'
      );

      return;

    }

    selectedCustomer =
      customers.find(
        customer =>
          customer.id ===
          customerSelect.value
      ) ||
      {
        id:
          customerSelect.value,
        name:
          customerSelect.value
      };

    loadBtn.disabled =
      true;

    loadBtn.textContent =
      'Loading...';

    message.style.display =
      'block';

    message.textContent =
      'Loading monthly orders and previous unpaid bills...';

    invoicePaper.style.display =
      'none';

    try {

      const snapshot =
        await db
          .collection(
            'orders'
          )
          .where(
            'customerId',
            '==',
            selectedCustomer.id
          )
          .get();

      customerOrders =
        snapshot.docs.map(
          doc => ({
            id:
              doc.id,
            ...doc.data()
          })
        );

      currentMonthOrders =
        customerOrders
          .filter(
            order => {

              const date =
                orderBillingDate(
                  order
                );

              if (
                !date ||
                monthValue(date) !==
                  billingMonth.value
              ) {
                return false;
              }

              if (
                String(
                  order.status || ''
                ) !==
                'Delivered'
              ) {
                return false;
              }

              if (
                order.billingType &&
                order.billingType !==
                  'Monthly Account'
              ) {
                return false;
              }

              return true;

            }
          )
          .sort(
            (
              a,
              b
            ) =>
              orderBillingDate(a) -
              orderBillingDate(b)
          );

      buildPreviousGroups();

      renderBalancePicker();

      if (
        !currentMonthOrders.length
      ) {

        message.textContent =
          'No Delivered Monthly Account orders were found for ' +
          monthLabel(
            billingMonth.value
          ) +
          '.';

        return;

      }

      message.textContent =
        previousBalanceGroups.length
          ? 'Billing loaded. All orders for this month will be combined into one invoice. Select any previous unpaid month(s) if required.'
          : 'Billing loaded. All orders for this month will be combined into one invoice. No previous unpaid monthly balance was found.';

    } catch (error) {

      console.error(
        error
      );

      message.textContent =
        'Could not load billing: ' +
        (
          error.message ||
          'Unknown error'
        );

    } finally {

      loadBtn.disabled =
        false;

      loadBtn.textContent =
        'Load Billing';

    }

  }


  function numberToWordsPKR(value) {

    let number =
      Math.round(
        numeric(value)
      );

    if (
      number === 0
    ) {
      return 'Zero Rupee';
    }

    const ones = [
      '',
      'One',
      'Two',
      'Three',
      'Four',
      'Five',
      'Six',
      'Seven',
      'Eight',
      'Nine',
      'Ten',
      'Eleven',
      'Twelve',
      'Thirteen',
      'Fourteen',
      'Fifteen',
      'Sixteen',
      'Seventeen',
      'Eighteen',
      'Nineteen'
    ];

    const tens = [
      '',
      '',
      'Twenty',
      'Thirty',
      'Forty',
      'Fifty',
      'Sixty',
      'Seventy',
      'Eighty',
      'Ninety'
    ];

    const under100 =
      value =>
        value < 20
          ? ones[value]
          : tens[
              Math.floor(
                value / 10
              )
            ] +
            (
              value % 10
                ? ' ' +
                  ones[
                    value % 10
                  ]
                : ''
            );

    const under1000 =
      value => {

        const hundred =
          Math.floor(
            value / 100
          );

        const rest =
          value % 100;

        return (
          (
            hundred
              ? ones[hundred] +
                ' Hundred'
              : ''
          ) +
          (
            hundred &&
            rest
              ? ' '
              : ''
          ) +
          (
            rest
              ? under100(
                  rest
                )
              : ''
          )
        );

      };

    const simple =
      value =>
        value < 100
          ? under100(value)
          : under1000(value);

    const parts =
      [];

    const crore =
      Math.floor(
        number /
        10000000
      );

    if (crore) {

      parts.push(
        simple(crore) +
        ' Crore'
      );

      number %=
        10000000;

    }

    const lakh =
      Math.floor(
        number /
        100000
      );

    if (lakh) {

      parts.push(
        simple(lakh) +
        ' Lakh'
      );

      number %=
        100000;

    }

    const thousand =
      Math.floor(
        number /
        1000
      );

    if (thousand) {

      parts.push(
        simple(thousand) +
        ' Thousand'
      );

      number %=
        1000;

    }

    if (number) {

      parts.push(
        under1000(
          number
        )
      );

    }

    return (
      parts.join(' ') +
      ' Rupee'
    );

  }


  function invoiceNumberValue() {

    const [
      year,
      month
    ] =
      billingMonth.value
        .split('-');

    return (
      'INV/' +
      year +
      '/' +
      month +
      '/' +
      selectedCustomer.id
    );

  }


  function currentMonthAmount() {

    return currentMonthOrders
      .reduce(
        (
          sum,
          order
        ) =>
          sum +
          numeric(
            order.totalAmount
          ),
        0
      );

  }


  // Combine all deliveries in the selected billing month into
  // one clean monthly invoice. Same product + description + rate
  // becomes a single line with combined quantity.
  function aggregatedCurrentItems() {

    const map =
      new Map();

    currentMonthOrders.forEach(
      order => {

        const items =
          Array.isArray(
            order.items
          )
            ? order.items
            : [];

        items.forEach(
          item => {

            const name =
              item.name ||
              'Item';

            const description =
              item.description ||
              '';

            const unitPrice =
              numeric(
                item.unitPrice
              );

            const key =
              [
                name,
                description,
                unitPrice
              ].join('|');

            if (
              !map.has(key)
            ) {

              map.set(
                key,
                {
                  name,
                  description,
                  unitPrice,
                  qty:
                    0,
                  amount:
                    0
                }
              );

            }

            const row =
              map.get(key);

            const qty =
              numeric(
                item.qty
              );

            row.qty +=
              qty;

            row.amount +=
              numeric(
                item.lineTotal ||
                (
                  qty *
                  unitPrice
                )
              );

          }
        );

      }
    );

    return Array.from(
      map.values()
    );

  }


  function renderCurrentOrderRows() {

    const tbody =
      $('invoiceRows');

    const items =
      aggregatedCurrentItems();

    items.forEach(
      item => {

        const tr =
          document.createElement(
            'tr'
          );

        tr.innerHTML =
          '<td>' +
          escapeHtml(
            item.name
          ) +
          (
            item.description
              ? '<span class="balance-sub">' +
                escapeHtml(
                  item.description
                ) +
                '</span>'
              : ''
          ) +
          '</td>' +

          '<td class="qty">' +
          numeric(
            item.qty
          ).toFixed(2) +
          '</td>' +

          '<td class="unit">' +
          numeric(
            item.unitPrice
          ).toLocaleString(
            'en-PK',
            {
              minimumFractionDigits:
                2,
              maximumFractionDigits:
                2
            }
          ) +
          '</td>' +

          '<td class="tax"></td>' +

          '<td class="amt">' +
          money(
            item.amount
          ) +
          '</td>';

        tbody.appendChild(
          tr
        );

      }
    );

  }


  function renderSelectedBalanceRows(groups) {

    const tbody =
      $('invoiceRows');

    groups.forEach(
      group => {

        const tr =
          document.createElement(
            'tr'
          );

        tr.innerHTML =
          '<td><strong>Balance</strong>' +
          '<span class="balance-sub">Pending / Outstanding Month of ' +
          escapeHtml(
            monthLabel(
              group.month
            )
          ) +
          '</span></td>' +

          '<td class="qty"></td>' +
          '<td class="unit"></td>' +
          '<td class="tax"></td>' +

          '<td class="amt">' +
          money(
            group.outstanding
          ) +
          '</td>';

        tbody.appendChild(
          tr
        );

      }
    );

  }


  function generateInvoice() {

    if (
      !selectedCustomer ||
      !currentMonthOrders.length
    ) {

      alert(
        'Please click Load Billing first.'
      );

      return;

    }

    const balances =
      selectedPreviousGroups();

    $('invoiceRows').innerHTML =
      '';

    renderCurrentOrderRows();

    renderSelectedBalanceRows(
      balances
    );

    const monthTotal =
      currentMonthAmount();

    const balanceTotal =
      balances.reduce(
        (
          sum,
          group
        ) =>
          sum +
          numeric(
            group.outstanding
          ),
        0
      );

    const grandTotal =
      monthTotal +
      balanceTotal;

    const sorted =
      [...currentMonthOrders]
        .filter(
          order =>
            orderBillingDate(
              order
            )
        )
        .sort(
          (
            a,
            b
          ) =>
            orderBillingDate(a) -
            orderBillingDate(b)
        );

    // Invoice date follows the latest manually selected
    // Billing / Delivery Date for this billing month.
    const invoiceDate =
      sorted.length
        ? orderBillingDate(
            sorted[
              sorted.length - 1
            ]
          )
        : null;

    const latestOrder =
      sorted.length
        ? sorted[
            sorted.length - 1
          ]
        : null;

    const addressParts =
      [];

    if (latestOrder) {

      if (
        latestOrder.address
      ) {

        addressParts.push(
          latestOrder.address
        );

      }

      if (
        latestOrder.area &&
        !addressParts.includes(
          latestOrder.area
        )
      ) {

        addressParts.push(
          latestOrder.area
        );

      }

    }

    const invoiceNo =
      invoiceNumberValue();

    $('customerName').textContent =
      selectedCustomer.name;

    $('customerAddress').textContent =
      addressParts.length
        ? addressParts.join(
            ' / '
          )
        : selectedCustomer.id;

    $('invoiceNumber').textContent =
      invoiceNo;

    $('paymentCommunication').textContent =
      invoiceNo;

    $('invoiceDateDisplay').textContent =
      dateLabel(
        invoiceDate
      );

    $('billingMonthDisplay').textContent =
      monthLabel(
        billingMonth.value
      );

    $('dueDateDisplay').textContent =
      inputDateLabel(
        dueDate.value
      );

    $('monthAmount').textContent =
      money(
        monthTotal
      );

    $('selectedBalanceAmount').textContent =
      money(
        balanceTotal
      );

    $('selectedBalanceRow').style.display =
      balanceTotal > 0
        ? 'flex'
        : 'none';

    $('invoiceTotal').textContent =
      money(
        grandTotal
      );

    $('amountInWords').textContent =
      numberToWordsPKR(
        grandTotal
      );

    invoicePaper.style.display =
      'block';

    message.style.display =
      'none';

  }


  loadBtn.addEventListener(
    'click',
    loadBilling
  );

  generateBtn.addEventListener(
    'click',
    generateInvoice
  );

  printBtn.addEventListener(
    'click',
    () => {

      if (
        invoicePaper.style.display ===
        'none'
      ) {

        alert(
          'Generate the invoice first.'
        );

        return;

      }

      window.print();

    }
  );

  customerSelect.addEventListener(
    'change',
    () => {

      selectedCustomer =
        null;

      currentMonthOrders =
        [];

      previousBalanceGroups =
        [];

      balancePicker.style.display =
        'none';

      invoicePaper.style.display =
        'none';

    }
  );

  billingMonth.addEventListener(
    'change',
    () => {

      currentMonthOrders =
        [];

      previousBalanceGroups =
        [];

      balancePicker.style.display =
        'none';

      invoicePaper.style.display =
        'none';

    }
  );

  setDefaults();

  auth.onAuthStateChanged(
    user => {

      if (
        user &&
        String(
          user.email || ''
        ).toLowerCase() ===
        String(
          OWNER_EMAIL || ''
        ).toLowerCase()
      ) {

        loginGate.style.display =
          'none';

        invoiceApp.style.display =
          'block';

        loadCustomers();

      } else {

        loginGate.innerHTML =
          'Owner access required. ' +
          '<a href="owner-dashboard.html">' +
          'Open Owner Dashboard</a>';

      }

    }
  );

});
