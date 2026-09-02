// Manaal Water — Owner Dashboard logic
// Only the OWNER_EMAIL account (set in firebase-init.js) can see this page's data.

document.addEventListener('DOMContentLoaded', () => {

  const dashLoginView = document.getElementById('dashLoginView');
  const dashMainView = document.getElementById('dashMainView');
  const dashError = document.getElementById('dashError');
  const ordersList = document.getElementById('ordersList');
  const orderCount = document.getElementById('orderCount');

  const statToday = document.getElementById('statToday');
  const statPending = document.getElementById('statPending');
  const statProgress = document.getElementById('statProgress');
  const statDelivered = document.getElementById('statDelivered');
  const statRevenue = document.getElementById('statRevenue');

  const orderSearch = document.getElementById('orderSearch');
  const statusFilter = document.getElementById('statusFilter');

  const manualOrderBtn = document.getElementById('manualOrderBtn');
  const manualOrderPanel = document.getElementById('manualOrderPanel');
  const manualOrderForm = document.getElementById('manualOrderForm');
  const manualOrderCancel = document.getElementById('manualOrderCancel');
  const manualOrderItems = document.getElementById('manualOrderItems');
  const addManualItemBtn = document.getElementById('addManualItemBtn');
  const manualOrderMessage = document.getElementById('manualOrderMessage');
  const manualSubtotalPreview = document.getElementById('manualSubtotalPreview');
  const manualTotalPreview = document.getElementById('manualTotalPreview');
  const statManual = document.getElementById('statManual');
  const manualCustomerSelect = document.getElementById('manualCustomerSelect');
  const manualBillingType = document.getElementById('manualBillingType');

  let unsubscribe = null;
  let allOrders = [];
  let manualCustomers = [];

  const PRODUCT_SHEET_CSV =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSIQofz8thc7QhRML9YgtN7X8LxRLDTDbDLZctT3l2ApI-pvECqRExfL3d38w-JFMseQBCXD_d9SGkx/pub?gid=0&single=true&output=csv';


  // --------------------------------------------------
  // GOOGLE SHEETS SALES REGISTER SYNC
  // Firestore remains the main database.
  // --------------------------------------------------

  const SALES_SYNC_WEB_APP_URL =
    'https://script.google.com/macros/s/AKfycbyUfljON8xGW84CO26VI5n67AsIu62VfoEGtA7RFiXaubN1lnBuH4QMWtxRXSU5EYUz/exec';


  async function syncOrderToSalesSheet(
    firestoreId,
    orderData
  ) {

    if (
      !firestoreId ||
      !orderData
    ) {
      return;
    }


    try {

      let orderDate =
        new Date().toISOString();


      if (
        orderData.createdDate
        instanceof Date
      ) {

        orderDate =
          orderData.createdDate
            .toISOString();

      } else if (
        orderData.createdAt &&
        typeof orderData.createdAt.toDate ===
          'function'
      ) {

        orderDate =
          orderData.createdAt
            .toDate()
            .toISOString();

      }


      const payload = {
        ...orderData,

        firestoreId,

        orderDate,

        invoiceNumber:
          orderData.invoiceNumber ||
          (
            orderData.orderNumber
              ? 'INV-' +
                orderData.orderNumber
              : ''
          )
      };


      await fetch(
        SALES_SYNC_WEB_APP_URL,
        {
          method:
            'POST',

          mode:
            'no-cors',

          keepalive:
            true,

          headers: {
            'Content-Type':
              'text/plain;charset=utf-8'
          },

          body:
            JSON.stringify(payload)
        }
      );


    } catch (error) {

      // Spreadsheet sync must never block dashboard operations.
      console.warn(
        'Google Sheet sales sync failed:',
        error
      );

    }

  }


  // --------------------------------------------------
  // PERMANENT CUSTOMERS
  // Dynamic list from the Customers tab.
  // No fixed customer-count limit.
  // --------------------------------------------------

  function populateManualCustomerSelect() {

    if (!manualCustomerSelect) {
      return;
    }

    const previousValue =
      manualCustomerSelect.value;

    manualCustomerSelect.innerHTML =
      '<option value="">-- New / Walk-in Customer --</option>';

    manualCustomers
      .slice()
      .sort(
        (a, b) =>
          String(a.name || '')
            .localeCompare(
              String(b.name || '')
            )
      )
      .forEach(
        customer => {

          const option =
            document.createElement(
              'option'
            );

          option.value =
            customer.id || '';

          option.textContent =
            customer.id
              ? `${customer.name} — ${customer.id}`
              : customer.name;

          manualCustomerSelect
            .appendChild(
              option
            );

        }
      );

    if (
      previousValue &&
      manualCustomers.some(
        customer =>
          customer.id ===
          previousValue
      )
    ) {

      manualCustomerSelect.value =
        previousValue;

    }

  }


  function loadPermanentCustomers() {

    if (!manualCustomerSelect) {
      return Promise.resolve([]);
    }

    manualCustomerSelect.disabled =
      true;

    manualCustomerSelect.innerHTML =
      '<option value="">Loading customers...</option>';

    return new Promise(
      resolve => {

        const callbackName =
          'manaalCustomers_' +
          Date.now() +
          '_' +
          Math.random()
            .toString(36)
            .slice(2);

        let script = null;

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

              manualCustomers =
                [];

              manualCustomerSelect.disabled =
                false;

              manualCustomerSelect.innerHTML =
                '<option value="">-- New / Walk-in Customer --</option>';

              console.warn(
                'Permanent customer list timed out. Manual entry is still available.'
              );

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

            if (
              response &&
              response.success &&
              Array.isArray(
                response.customers
              )
            ) {

              manualCustomers =
                response.customers;

            } else {

              manualCustomers =
                [];

              console.warn(
                'Could not load permanent customers:',
                response &&
                response.error
                  ? response.error
                  : 'Unknown response'
              );

            }

            populateManualCustomerSelect();

            manualCustomerSelect.disabled =
              false;

            cleanup();

            resolve(
              manualCustomers
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

            manualCustomers =
              [];

            manualCustomerSelect.disabled =
              false;

            manualCustomerSelect.innerHTML =
              '<option value="">-- New / Walk-in Customer --</option>';

            console.warn(
              'Could not load permanent customer list. Manual entry remains available.'
            );

            resolve([]);

          };

        document.head
          .appendChild(
            script
          );

      }
    );

  }


  function selectedPermanentCustomer() {

    if (
      !manualCustomerSelect ||
      !manualCustomerSelect.value
    ) {

      return null;

    }

    return (
      manualCustomers.find(
        customer =>
          customer.id ===
          manualCustomerSelect.value
      ) ||
      null
    );

  }


  if (manualCustomerSelect) {

    manualCustomerSelect.addEventListener(
      'change',
      () => {

        const customer =
          selectedPermanentCustomer();

        const customerNameInput =
          document.getElementById(
            'manualCustomerName'
          );

        const paymentStatusInput =
          document.getElementById(
            'manualPaymentStatus'
          );

        const customerAddressInput =
          document.getElementById(
            'manualCustomerAddress'
          );

        const customerAreaInput =
          document.getElementById(
            'manualCustomerArea'
          );

        if (!customer) {

          if (customerNameInput) {
            customerNameInput.value =
              '';
            customerNameInput.focus();
          }

          if (customerAddressInput) {
            customerAddressInput.value =
              '';
          }

          if (customerAreaInput) {
            customerAreaInput.value =
              '';
          }

          if (manualBillingType) {
            manualBillingType.value =
              'Immediate Payment';
          }

          if (paymentStatusInput) {
            paymentStatusInput.value =
              'Unpaid';
          }

          return;

        }

        if (customerNameInput) {

          customerNameInput.value =
            customer.name || '';

        }

        if (customerAddressInput) {

          customerAddressInput.value =
            customer.address || '';

        }

        if (customerAreaInput) {

          customerAreaInput.value =
            customer.area || '';

        }

        if (manualBillingType) {
          manualBillingType.value =
            'Monthly Account';
        }

        if (paymentStatusInput) {
          paymentStatusInput.value =
            'Monthly Account';
        }

      }
    );

  }


  if (manualBillingType) {

    manualBillingType.addEventListener(
      'change',
      () => {

        const paymentStatusInput =
          document.getElementById(
            'manualPaymentStatus'
          );

        if (!paymentStatusInput) {
          return;
        }

        paymentStatusInput.value =
          manualBillingType.value ===
            'Monthly Account'
            ? 'Monthly Account'
            : 'Unpaid';

      }
    );

  }


  const MANUAL_FALLBACK_PRODUCTS = [
    { name: '19 Liter Water Bottle Refilling', price: 220 },
    { name: '19 Liter Water Bottle New', price: 1850 },
    { name: '500 ml water bottle pack', price: 249 },
    { name: '1500 ml water bottle pack', price: 249 },
    { name: 'Water Dispenser', price: 0 }
  ];

  let manualProducts = [...MANUAL_FALLBACK_PRODUCTS];


  function showError(msg) {
    dashError.textContent = msg;
    dashError.style.display = 'flex';
  }


  // --------------------------------------------------
  // OWNER LOGIN
  // Multiple approved owners + persistent login
  // --------------------------------------------------

  const OWNER_EMAILS = [
    'manaalwater@gmail.com',

    // ADD OWNER 2 EMAIL HERE
    // 'owner2@gmail.com',

    // ADD OWNER 3 EMAIL HERE
    // 'owner3@gmail.com'
  ];


  function isApprovedOwner(user) {

    if (!user || !user.email) {
      return false;
    }

    const email =
      String(user.email)
        .trim()
        .toLowerCase();

    return OWNER_EMAILS.some(
      ownerEmail =>
        String(ownerEmail)
          .trim()
          .toLowerCase() === email
    );

  }


  // Explicitly keep owner signed in on this browser/device.
  auth.setPersistence(
    firebase.auth.Auth.Persistence.LOCAL
  ).catch(error => {

    console.warn(
      'Could not enable persistent login:',
      error
    );

  });


  document
    .getElementById('dashLoginForm')
    .addEventListener('submit', async (e) => {

      e.preventDefault();

      dashError.style.display = 'none';

      const email =
        document
          .getElementById('dashEmail')
          .value
          .trim();

      const pass =
        document
          .getElementById('dashPass')
          .value;

      const loginButton =
        e.currentTarget.querySelector(
          'button[type="submit"]'
        );

      if (loginButton) {

        loginButton.disabled = true;
        loginButton.textContent = 'Signing in...';

      }


      try {

        await auth.setPersistence(
          firebase.auth.Auth.Persistence.LOCAL
        );

        const credential =
          await auth.signInWithEmailAndPassword(
            email,
            pass
          );


        if (!isApprovedOwner(credential.user)) {

          await auth.signOut();

          showError(
            'This account is not authorized to view the dashboard.'
          );

        }

      } catch (err) {

        console.error(
          'Owner login failed:',
          err
        );

        showError(
          'Incorrect email or password.'
        );

      } finally {

        if (loginButton) {

          loginButton.disabled = false;
          loginButton.textContent = 'Log in';

        }

      }

    });


  // --------------------------------------------------
  // OWNER LOGOUT
  // --------------------------------------------------

  document
    .getElementById('dashLogoutBtn')
    .addEventListener('click', async () => {

      try {

        await auth.signOut();

      } catch (error) {

        console.error(
          'Logout failed:',
          error
        );

      }

    });


  // --------------------------------------------------
  // AUTH STATE
  // Automatically opens dashboard if owner is
  // already signed in on this device.
  // --------------------------------------------------

  auth.onAuthStateChanged(async (user) => {

    if (isApprovedOwner(user)) {

      dashError.style.display = 'none';

      dashLoginView.style.display = 'none';
      dashMainView.style.display = 'block';

      listenForOrders();

      return;

    }


    dashLoginView.style.display = 'block';
    dashMainView.style.display = 'none';


    if (user) {

      try {

        await auth.signOut();

      } catch (error) {

        console.error(
          'Unauthorized logout failed:',
          error
        );

      }

      showError(
        'This account is not authorized to view the dashboard.'
      );

    }


    if (unsubscribe) {

      unsubscribe();

      unsubscribe = null;

    }

  });


  // --------------------------------------------------
  // OWNER MANUAL ORDER
  // --------------------------------------------------

  function parseCsvLine(line) {

    const values = [];
    let current = '';
    let quoted = false;

    for (let i = 0; i < line.length; i++) {

      const ch = line[i];

      if (ch === '"') {

        if (
          quoted &&
          line[i + 1] === '"'
        ) {

          current += '"';
          i++;

        } else {

          quoted = !quoted;

        }

      } else if (
        ch === ',' &&
        !quoted
      ) {

        values.push(current.trim());
        current = '';

      } else {

        current += ch;

      }

    }

    values.push(current.trim());

    return values;

  }


  async function loadManualProducts() {

    try {

      const response =
        await fetch(
          PRODUCT_SHEET_CSV,
          { cache: 'no-store' }
        );

      if (!response.ok) {
        throw new Error('Could not load live product prices.');
      }

      const text =
        await response.text();

      const rows =
        text
          .split(/\r?\n/)
          .filter(Boolean)
          .map(parseCsvLine);

      if (rows.length < 2) {
        return;
      }

      const headers =
        rows[0]
          .map(h =>
            String(h || '')
              .trim()
              .toLowerCase()
          );

      const nameIndex =
        headers.findIndex(h =>
          h.includes('product') ||
          h === 'name'
        );

      const priceIndex =
        headers.findIndex(h =>
          h.includes('price')
        );

      if (
        nameIndex < 0 ||
        priceIndex < 0
      ) {
        return;
      }

      const parsed =
        rows
          .slice(1)
          .map(row => {

            const name =
              String(
                row[nameIndex] || ''
              ).trim();

            const price =
              Number(
                String(
                  row[priceIndex] || ''
                ).replace(
                  /[^0-9.]/g,
                  ''
                )
              );

            return {
              name,
              price
            };

          })
          .filter(item =>
            item.name &&
            Number.isFinite(item.price) &&
            item.price >= 0
          );

      if (parsed.length) {

        manualProducts = parsed;

        if (
          !manualProducts.some(
            product =>
              product.name.toLowerCase() ===
              'water dispenser'
          )
        ) {

          manualProducts.push({
            name: 'Water Dispenser',
            price: 0
          });

        }

      }

    } catch (error) {

      console.warn(
        'Manual order live prices unavailable. Using fallback prices.',
        error
      );

    }

  }


  function manualProductOptions(
    selectedName = ''
  ) {

    const selected =
      String(selectedName || '');

    return manualProducts
      .map(product => {

        const safeName =
          escapeDashboardHtml(
            product.name
          );

        const isSelected =
          product.name === selected
            ? ' selected'
            : '';

        return (
          `<option value="${safeName}" data-price="${product.price}"${isSelected}>` +
          `${safeName}` +
          `</option>`
        );

      })
      .join('');

  }


  function addManualItem(
    item = null
  ) {

    if (!manualOrderItems) return;

    const row =
      document.createElement('div');

    row.className =
      'manual-item-row';

    const initialName =
      item && item.name
        ? item.name
        : (
            manualProducts[0]
              ? manualProducts[0].name
              : ''
          );

    const matchedProduct =
      manualProducts.find(
        product =>
          product.name === initialName
      );

    const initialPrice =
      item &&
      Number.isFinite(
        Number(item.unitPrice)
      )
        ? Number(item.unitPrice)
        : (
            matchedProduct
              ? matchedProduct.price
              : 0
          );

    const initialQty =
      item &&
      Number(item.qty) > 0
        ? Number(item.qty)
        : 1;

    const initialDescription =
      item && item.description
        ? String(item.description)
        : '';

    row.innerHTML = `

      <div class="manual-item-product">
        <label>Product</label>
        <select class="manual-item-name">
          ${manualProductOptions(initialName)}
        </select>
      </div>

      <div>
        <label>Qty</label>
        <input
          class="manual-item-qty"
          type="number"
          min="1"
          step="1"
          value="${initialQty}"
          required
        >
      </div>

      <div>
        <label>Unit Price (Rs.)</label>
        <input
          class="manual-item-price"
          type="number"
          min="0"
          step="1"
          value="${initialPrice}"
          required
        >
      </div>

      <div class="manual-item-line-total">
        <label>Line Total</label>
        <strong>Rs. 0</strong>
      </div>

      <button
        type="button"
        class="manual-item-remove"
        aria-label="Remove item"
        title="Remove item">
        ×
      </button>

      <div class="manual-item-description-wrap">
        <label>Item description / note</label>
        <input
          class="manual-item-description"
          type="text"
          value="${escapeDashboardHtml(initialDescription)}"
          placeholder="Optional short description"
        >
      </div>

      <div
        class="manual-dispenser-options"
        style="display:none;">

        <div>
          <label>Water dispenser sale type</label>
          <select class="manual-dispenser-type">
            <option value="New">New dispenser</option>
            <option value="Installment">Installment</option>
          </select>
        </div>

        <div class="manual-installment-number-wrap" style="display:none;">
          <label>Installment number</label>
          <input
            class="manual-installment-number"
            type="number"
            min="1"
            step="1"
            placeholder="e.g. 2"
          >
        </div>

      </div>

    `;

    manualOrderItems.appendChild(row);

    const productSelect =
      row.querySelector('.manual-item-name');

    const qtyInput =
      row.querySelector('.manual-item-qty');

    const priceInput =
      row.querySelector('.manual-item-price');

    const removeBtn =
      row.querySelector('.manual-item-remove');

    const dispenserOptions =
      row.querySelector('.manual-dispenser-options');

    const dispenserType =
      row.querySelector('.manual-dispenser-type');

    const installmentWrap =
      row.querySelector('.manual-installment-number-wrap');

    const installmentInput =
      row.querySelector('.manual-installment-number');


    function updateDispenserFields() {

      const isDispenser =
        productSelect.value
          .toLowerCase() ===
        'water dispenser';

      dispenserOptions.style.display =
        isDispenser
          ? 'grid'
          : 'none';

      installmentWrap.style.display =
        (
          isDispenser &&
          dispenserType.value ===
            'Installment'
        )
          ? 'block'
          : 'none';

      if (!isDispenser) {
        installmentInput.value = '';
      }

    }


    productSelect.addEventListener(
      'change',
      () => {

        const selectedOption =
          productSelect.options[
            productSelect.selectedIndex
          ];

        const price =
          Number(
            selectedOption.dataset.price || 0
          );

        if (Number.isFinite(price)) {
          priceInput.value = price;
        }

        updateDispenserFields();
        updateManualOrderTotals();

      }
    );

    dispenserType.addEventListener(
      'change',
      updateDispenserFields
    );

    qtyInput.addEventListener(
      'input',
      updateManualOrderTotals
    );

    priceInput.addEventListener(
      'input',
      updateManualOrderTotals
    );

    removeBtn.addEventListener(
      'click',
      () => {

        const rows =
          manualOrderItems.querySelectorAll(
            '.manual-item-row'
          );

        if (rows.length <= 1) {

          alert(
            'A manual order must contain at least one item.'
          );

          return;

        }

        row.remove();
        updateManualOrderTotals();

      }
    );

    updateDispenserFields();
    updateManualOrderTotals();

  }


  function collectManualItems() {

    if (!manualOrderItems) return [];

    return Array
      .from(
        manualOrderItems.querySelectorAll(
          '.manual-item-row'
        )
      )
      .map(row => {

        const name =
          row.querySelector(
            '.manual-item-name'
          ).value;

        const qty =
          Math.max(
            1,
            Number(
              row.querySelector(
                '.manual-item-qty'
              ).value
            ) || 1
          );

        const unitPrice =
          Math.max(
            0,
            Number(
              row.querySelector(
                '.manual-item-price'
              ).value
            ) || 0
          );

        const descriptionInput =
          row.querySelector(
            '.manual-item-description'
          );

        let description =
          descriptionInput
            ? descriptionInput.value.trim()
            : '';

        let dispenserType = '';
        let installmentNumber = '';

        if (
          name.toLowerCase() ===
          'water dispenser'
        ) {

          dispenserType =
            row.querySelector(
              '.manual-dispenser-type'
            ).value;

          installmentNumber =
            row.querySelector(
              '.manual-installment-number'
            ).value.trim();

          const autoDescription =
            dispenserType === 'Installment'
              ? (
                  installmentNumber
                    ? `Installment - No. ${installmentNumber}`
                    : 'Installment'
                )
              : 'New dispenser';

          description =
            description
              ? `${autoDescription} · ${description}`
              : autoDescription;

        }

        return {
          name,
          description,
          dispenserType,
          installmentNumber,
          qty,
          unitPrice,
          lineTotal:
            qty * unitPrice
        };

      });

  }


  function manualAmounts() {

    const items =
      collectManualItems();

    const subtotalAmount =
      items.reduce(
        (sum, item) =>
          sum + item.lineTotal,
        0
      );

    const discountAmount =
      Math.max(
        0,
        Number(
          document.getElementById(
            'manualDiscount'
          )?.value || 0
        )
      );

    const deliveryFee =
      Math.max(
        0,
        Number(
          document.getElementById(
            'manualDeliveryFee'
          )?.value || 0
        )
      );

    const previousBalanceAmount =
      Math.max(
        0,
        Number(
          document.getElementById(
            'manualPreviousBalanceAmount'
          )?.value || 0
        )
      );

    const totalAmount =
      Math.max(
        0,
        subtotalAmount -
        discountAmount +
        deliveryFee +
        previousBalanceAmount
      );

    return {
      items,
      subtotalAmount,
      discountAmount,
      deliveryFee,
      previousBalanceAmount,
      totalAmount
    };

  }


  function updateManualOrderTotals() {

    const amounts =
      manualAmounts();

    if (manualSubtotalPreview) {

      manualSubtotalPreview.textContent =
        `Rs. ${amounts.subtotalAmount.toLocaleString('en-PK')}`;

    }

    const previousBalancePreview =
      document.getElementById(
        'manualPreviousBalancePreview'
      );

    if (previousBalancePreview) {

      previousBalancePreview.textContent =
        `Rs. ${amounts.previousBalanceAmount.toLocaleString('en-PK')}`;

    }

    if (manualTotalPreview) {

      manualTotalPreview.textContent =
        `Rs. ${amounts.totalAmount.toLocaleString('en-PK')}`;

    }

    if (manualOrderItems) {

      manualOrderItems
        .querySelectorAll(
          '.manual-item-row'
        )
        .forEach(row => {

          const qty =
            Number(
              row.querySelector(
                '.manual-item-qty'
              ).value || 0
            );

          const price =
            Number(
              row.querySelector(
                '.manual-item-price'
              ).value || 0
            );

          const strong =
            row.querySelector(
              '.manual-item-line-total strong'
            );

          if (strong) {

            strong.textContent =
              `Rs. ${(qty * price).toLocaleString('en-PK')}`;

          }

        });

    }

  }


  function manualOrderNumber() {

    const now =
      new Date();

    const yy =
      String(
        now.getFullYear()
      ).slice(-2);

    const mm =
      String(
        now.getMonth() + 1
      ).padStart(2, '0');

    const dd =
      String(
        now.getDate()
      ).padStart(2, '0');

    const hh =
      String(
        now.getHours()
      ).padStart(2, '0');

    const mi =
      String(
        now.getMinutes()
      ).padStart(2, '0');

    const ss =
      String(
        now.getSeconds()
      ).padStart(2, '0');

    return (
      `MW-${yy}${mm}${dd}-${hh}${mi}${ss}`
    );

  }


  function resetManualOrderForm() {

    if (!manualOrderForm) {
      return;
    }

    manualOrderForm.reset();

    if (manualCustomerSelect) {
      manualCustomerSelect.value = '';
    }

    if (manualBillingType) {
      manualBillingType.value =
        'Immediate Payment';
    }

    if (manualOrderItems) {

      manualOrderItems.innerHTML =
        '';

      addManualItem();

    }

    const deliveryDateInput =
      document.getElementById(
        'manualDeliveryDate'
      );

    if (deliveryDateInput) {

      const now =
        new Date();

      const yyyy =
        now.getFullYear();

      const mm =
        String(
          now.getMonth() + 1
        ).padStart(2, '0');

      const dd =
        String(
          now.getDate()
        ).padStart(2, '0');

      deliveryDateInput.value =
        `${yyyy}-${mm}-${dd}`;

    }

    const paymentStatusInput =
      document.getElementById(
        'manualPaymentStatus'
      );

    if (paymentStatusInput) {

      paymentStatusInput.value =
        'Unpaid';

    }

    const orderStatusInput =
      document.getElementById(
        'manualOrderStatus'
      );

    if (orderStatusInput) {

      orderStatusInput.value =
        'Pending';

    }

    if (manualOrderMessage) {

      manualOrderMessage.style.display =
        'none';

      manualOrderMessage.textContent =
        '';

    }

    updateManualOrderTotals();

  }


  function showManualOrderPanel() {

    if (!manualOrderPanel) {
      return;
    }

    resetManualOrderForm();

    loadPermanentCustomers();

    manualOrderPanel.style.display =
      'block';

    manualOrderPanel.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

  }


  function hideManualOrderPanel() {

    if (manualOrderPanel) {

      manualOrderPanel.style.display =
        'none';

    }

  }


  if (manualOrderBtn) {

    manualOrderBtn.addEventListener(
      'click',
      showManualOrderPanel
    );

  }


  if (manualOrderCancel) {

    manualOrderCancel.addEventListener(
      'click',
      hideManualOrderPanel
    );

  }


  if (addManualItemBtn) {

    addManualItemBtn.addEventListener(
      'click',
      () => addManualItem()
    );

  }


  [
    'manualDiscount',
    'manualDeliveryFee',
    'manualPreviousBalanceAmount'
  ].forEach(id => {

    const input =
      document.getElementById(id);

    if (input) {

      input.addEventListener(
        'input',
        updateManualOrderTotals
      );

    }

  });


  if (manualOrderForm) {

    manualOrderForm.addEventListener(
      'submit',
      async (event) => {

        event.preventDefault();

        const submitBtn =
          manualOrderForm
            .querySelector(
              'button[type="submit"]'
            );

        if (submitBtn) {

          submitBtn.disabled =
            true;

          submitBtn.textContent =
            'Saving order...';

        }

        if (manualOrderMessage) {

          manualOrderMessage.style.display =
            'none';

        }

        try {

          const customerName =
            document.getElementById(
              'manualCustomerName'
            ).value.trim();

          const phone =
            document.getElementById(
              'manualCustomerPhone'
            ).value.trim();

          const address =
            document.getElementById(
              'manualCustomerAddress'
            ).value.trim();

          const area =
            document.getElementById(
              'manualCustomerArea'
            ).value.trim();

          const billingType =
            document.getElementById(
              'manualBillingType'
            ).value;

          const payMethod =
            document.getElementById(
              'manualPayMethod'
            ).value;

          const paymentStatus =
            document.getElementById(
              'manualPaymentStatus'
            ).value;

          const status =
            document.getElementById(
              'manualOrderStatus'
            ).value;

          const deliveryDate =
            document.getElementById(
              'manualDeliveryDate'
            ).value;

          if (!deliveryDate) {

            throw new Error(
              'Billing / delivery date is required.'
            );

          }

          const deliveryTime =
            document.getElementById(
              'manualDeliveryTime'
            ).value;

          const deliveryInstructions =
            document.getElementById(
              'manualDeliveryInstructions'
            ).value.trim();

          const previousBalanceDescription =
            document.getElementById(
              'manualPreviousBalanceDescription'
            ).value.trim();

          const amounts =
            manualAmounts();

          if (!customerName) {

            throw new Error(
              'Customer name is required.'
            );

          }

          if (!amounts.items.length) {

            throw new Error(
              'Please add at least one product.'
            );

          }

          
          const permanentCustomer =
            selectedPermanentCustomer();

          const customerId =
            permanentCustomer
              ? permanentCustomer.id
              : null;

          const customerRegisteredName =
            permanentCustomer
              ? permanentCustomer.name
              : null;

          const orderNumber =
            manualOrderNumber();

          const orderData = {

            orderNumber,

            customerId,

            customerRegisteredName,

            billingType,

            name:
              customerName,

            phone,
            address,
            area,

            items:
              amounts.items,

            subtotalAmount:
              amounts.subtotalAmount,

            discountAmount:
              amounts.discountAmount,

            deliveryFee:
              amounts.deliveryFee,

            previousBalanceDescription,
            previousBalanceAmount:
              amounts.previousBalanceAmount,

            totalAmount:
              amounts.totalAmount,

            total:
              `Rs. ${amounts.totalAmount.toLocaleString('en-PK')}`,

            promoCode:
              '',

            discountPercent:
              0,

            payMethod,
            paymentStatus,

            status,

            deliveryDate,
            deliveryTime,
            deliveryInstructions,

            mapsLink:
              '',

            uid:
              null,

            orderSource:
              'Owner Manual',

            createdBy:
              'owner',

            createdByEmail:
              auth.currentUser &&
              auth.currentUser.email
                ? auth.currentUser.email
                : 'manaalwater@gmail.com',

            createdAt:
              firebase.firestore.FieldValue.serverTimestamp(),

            paymentUpdatedAt:
              paymentStatus === 'Paid'
                ? firebase.firestore.FieldValue.serverTimestamp()
                : null

          };


          const docRef =
            await db.collection(
              'orders'
            ).add(orderData);


          await syncOrderToSalesSheet(
            docRef.id,
            orderData
          );


          if (manualOrderMessage) {

            manualOrderMessage.textContent =
              `Manual order ${orderNumber} saved successfully.`;

            manualOrderMessage.className =
              'manual-order-message success';

            manualOrderMessage.style.display =
              'block';

          }


          setTimeout(
            () => {

              hideManualOrderPanel();

              window.open(
                `invoice.html?id=${encodeURIComponent(docRef.id)}`,
                '_blank',
                'noopener'
              );

            },
            700
          );


        } catch (error) {

          console.error(
            'Could not save manual order:',
            error
          );

          if (manualOrderMessage) {

            manualOrderMessage.textContent =
              error.message ||
              'Could not save the manual order.';

            manualOrderMessage.className =
              'manual-order-message error';

            manualOrderMessage.style.display =
              'block';

          }

        } finally {

          if (submitBtn) {

            submitBtn.disabled =
              false;

            submitBtn.textContent =
              'Save Manual Order';

          }

        }

      }
    );

  }


  loadManualProducts()
    .then(() => {

      if (
        manualOrderItems &&
        !manualOrderItems.children.length
      ) {

        addManualItem();

      }

    });


  loadPermanentCustomers();

  // --------------------------------------------------
  // MONEY HELPER
  // --------------------------------------------------

    // --------------------------------------------------
  // CUSTOMER CONTACT HELPERS
  // --------------------------------------------------

  function cleanPhone(phone) {

    return String(phone || '')
      .replace(/[^\d+]/g, '');

  }


  function phoneForWhatsApp(phone) {

    let cleaned =
      cleanPhone(phone)
        .replace(/\+/g, '');


    // Pakistan local number:
    // 03465080415 → 923465080415

    if (
      cleaned.startsWith('0') &&
      cleaned.length >= 10
    ) {

      cleaned =
        '92' + cleaned.slice(1);

    }


    return cleaned;

  }


  function buildReceiptMessage(o) {

    const orderNo =
      o.orderNumber || o.id || '—';

    const itemsText =
      Array.isArray(o.items) && o.items.length

        ? o.items
            .map(item => {
              const qty = Number(item.qty || 0);
              const name = item.name || 'Item';
              const amount =
                Number(
                  item.lineTotal ??
                  (
                    Number(item.unitPrice || 0) *
                    qty
                  )
                );

              return (
                `• ${qty} × ${name}` +
                (
                  amount
                    ? ` — Rs. ${amount.toLocaleString('en-PK')}`
                    : ''
                )
              );
            })
            .join('\n')

        : `${o.qty || 1} × ${o.productName || 'Item'}`;


    const subtotal =
      typeof o.subtotalAmount === 'number'
        ? o.subtotalAmount
        : 0;

    const discount =
      typeof o.discountAmount === 'number'
        ? o.discountAmount
        : 0;

    const deliveryFee =
      typeof o.deliveryFee === 'number'
        ? o.deliveryFee
        : 0;

    const previousBalanceAmount =
      typeof o.previousBalanceAmount === 'number'
        ? o.previousBalanceAmount
        : 0;

    const total =
      amountFromOrder(o);

    const paymentStatus =
      o.paymentStatus || 'Unpaid';

    const deliveryParts = [];

    if (o.deliveryDate) {
      deliveryParts.push(
        formatDeliveryDate(o.deliveryDate)
      );
    }

    if (o.deliveryTime) {
      deliveryParts.push(o.deliveryTime);
    }


    const lines = [
      '💧 *MANAAL WATER*',
      paymentStatus === 'Paid'
        ? '🧾 *PAYMENT RECEIPT*'
        : '🧾 *INVOICE*',
      '',
      `*Order No:* ${orderNo}`,
      `*Customer:* ${o.name || 'Customer'}`,
      '',
      '*Order Items*',
      itemsText,
      ''
    ];


    if (subtotal > 0) {
      lines.push(
        `*Subtotal:* Rs. ${subtotal.toLocaleString('en-PK')}`
      );
    }

    if (discount > 0) {
      lines.push(
        `*Discount:* - Rs. ${discount.toLocaleString('en-PK')}`
      );
    }

    if (deliveryFee > 0) {
      lines.push(
        `*Delivery Fee:* Rs. ${deliveryFee.toLocaleString('en-PK')}`
      );
    }

    if (previousBalanceAmount > 0) {
      lines.push(
        `*${o.previousBalanceDescription || 'Previous Balance'}:* Rs. ${previousBalanceAmount.toLocaleString('en-PK')}`
      );
    }

    lines.push(
      `*Total:* Rs. ${total.toLocaleString('en-PK')}`,
      `*Payment Method:* ${o.payMethod || '—'}`,
      `*Payment Status:* ${paymentStatus}`,
      `*Order Status:* ${o.status || 'Pending'}`
    );


    if (deliveryParts.length) {
      lines.push(
        `*Delivery:* ${deliveryParts.join(' · ')}`
      );
    }


    if (
      String(o.payMethod || '')
        .toLowerCase()
        .includes('bank')
    ) {

      lines.push(
        '',
        '🏦 *Bank Transfer Details*',
        'Faysal Bank Limited',
        'IBAN: PK32FAYS3019355000004293'
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
  function amountFromOrder(o) {

    if (
      typeof o.totalAmount === 'number' &&
      Number.isFinite(o.totalAmount)
    ) {

      return o.totalAmount;

    }

    const parsed = Number(
      String(o.total || '').replace(/[^0-9.]/g, '')
    );

    return Number.isFinite(parsed) ? parsed : 0;

  }


  // --------------------------------------------------
  // DATE HELPER
  // --------------------------------------------------

  function isToday(date) {

    if (
      !(date instanceof Date) ||
      Number.isNaN(date.getTime())
    ) {

      return false;

    }

    const now = new Date();

    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );

  }


  // --------------------------------------------------
  // DASHBOARD SUMMARY
  // --------------------------------------------------

  // --------------------------------------------------
// DELIVERY SCHEDULE HELPERS
// --------------------------------------------------

function formatDeliveryDate(dateString) {

  if (!dateString) {
    return 'Not scheduled';
  }


  try {

    const parts =
      String(dateString)
        .split('-');


    if (parts.length !== 3) {
      return dateString;
    }


    const year =
      Number(parts[0]);

    const month =
      Number(parts[1]);

    const day =
      Number(parts[2]);


    const date =
      new Date(
        year,
        month - 1,
        day
      );


    return date.toLocaleDateString(
      'en-PK',
      {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );


  } catch (e) {

    return dateString;

  }

}



function isDeliveryToday(dateString) {

  if (!dateString) {
    return false;
  }


  try {

    const now =
      new Date();


    const year =
      now.getFullYear();


    const month =
      String(
        now.getMonth() + 1
      ).padStart(2, '0');


    const day =
      String(
        now.getDate()
      ).padStart(2, '0');


    const today =
      `${year}-${month}-${day}`;


    return dateString === today;


  } catch (e) {

    return false;

  }

}



function escapeDashboardHtml(value) {

  return String(
    value ?? ''
  )
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

}
  function updateSummary() {

    const todayOrders = allOrders.filter(
      o => isToday(o.createdDate)
    );

    const inProgressStatuses = [
      'Confirmed',
      'Preparing',
      'Out for Delivery'
    ];


    statToday.textContent = todayOrders.length;


    if (statManual) {

      statManual.textContent =
        todayOrders.filter(
          o =>
            o.orderSource ===
            'Owner Manual'
        ).length;

    }


    statPending.textContent = allOrders.filter(
      o => (o.status || 'Pending') === 'Pending'
    ).length;


    statProgress.textContent = allOrders.filter(
      o => inProgressStatuses.includes(o.status)
    ).length;


    statDelivered.textContent = allOrders.filter(
      o => o.status === 'Delivered'
    ).length;


    const todayRevenue = todayOrders
      .filter(o => o.status === 'Delivered')
      .reduce(
        (sum, o) => sum + amountFromOrder(o),
        0
      );


    statRevenue.textContent =
      `Rs. ${todayRevenue.toLocaleString(
        undefined,
        { maximumFractionDigits: 2 }
      )}`;

  }


  // --------------------------------------------------
  // DISPLAY / FILTER ORDERS
  // --------------------------------------------------

  function renderOrders() {

    const search =
      (orderSearch.value || '')
        .trim()
        .toLowerCase();


    const selectedStatus =
      statusFilter.value;


    const filtered = allOrders.filter(o => {

      const status =
        o.status || 'Pending';


      const matchesStatus =
        selectedStatus === 'All' ||
        status === selectedStatus;


      const haystack = [

  o.orderNumber,
  o.name,
  o.phone,
  o.address,
  o.area,
  o.deliveryDate,
  o.deliveryTime,
  o.deliveryInstructions,
  o.orderSource

]
  .filter(Boolean)
  .join(' ')
  .toLowerCase();

      const matchesSearch =
        !search ||
        haystack.includes(search);


      return (
        matchesStatus &&
        matchesSearch
      );

    });


    orderCount.textContent =
      `${filtered.length} of ${allOrders.length} order${allOrders.length === 1 ? '' : 's'}`;


    if (!filtered.length) {

      ordersList.innerHTML =
        '<div class="empty-state">No orders match this search or filter.</div>';

      return;

    }


    ordersList.innerHTML =
      filtered.map(o => {

        const id = o.id;

        const status =
          o.status || 'Pending';

        const statusClass =
          status.replace(/\s+/g, '-');

        const paymentStatus =
          o.paymentStatus || 'Unpaid';

        const paymentStatusClass =
          paymentStatus === 'Paid'
            ? 'paid'
            : 'unpaid';


        const time =
          o.createdDate
            ? o.createdDate.toLocaleString()
            : 'Just now';


        const mapsHtml =
          o.mapsLink

            ? `<a class="maps-link"
                 href="${o.mapsLink}"
                 target="_blank"
                 rel="noopener">
                 📍 View location
               </a>`

            : `<span
                 class="maps-link"
                 style="color:var(--ink-soft);">
                 📍 Location not shared
               </span>`;
        const rawPhone =
          o.phone || '';


        const callPhone =
          cleanPhone(rawPhone);


        const whatsappPhone =
          phoneForWhatsApp(rawPhone);


        const whatsappMessage =
          encodeURIComponent(
            `Hello ${o.name || 'Customer'}, this is Manaal Water regarding your order ${o.orderNumber || id}.`
          );


        const whatsappHtml =
          whatsappPhone

            ? `<a
                 class="action-link action-whatsapp"
                 href="https://wa.me/${whatsappPhone}?text=${whatsappMessage}"
                 target="_blank"
                 rel="noopener">
                 💬 WhatsApp
               </a>`

            : '';




        const receiptMessage =
          encodeURIComponent(
            buildReceiptMessage(o)
          );


        const whatsappReceiptHtml =
          whatsappPhone

            ? `<a
                 class="action-link action-whatsapp"
                 href="https://wa.me/${whatsappPhone}?text=${receiptMessage}"
                 target="_blank"
                 rel="noopener">
                 🧾 WhatsApp ${paymentStatus === 'Paid' ? 'Receipt' : 'Invoice'}
               </a>`

            : '';

        const callHtml =
          callPhone

            ? `<a
                 class="action-link"
                 href="tel:${callPhone}">
                 📞 Call
               </a>`

            : '';


        const mapButtonHtml =
          o.mapsLink

            ? `<a
                 class="action-link action-map"
                 href="${o.mapsLink}"
                 target="_blank"
                 rel="noopener">
                 📍 Open Map
               </a>`

            : '';

        let itemsHtml;


        if (
          Array.isArray(o.items) &&
          o.items.length
        ) {

          itemsHtml =
            o.items
              .map(it =>
                `${it.qty} × ${it.name}` +
                `${it.description ? ` — ${escapeDashboardHtml(it.description)}` : ''}` +
                ` (Rs. ${(it.lineTotal || 0).toLocaleString()})`
              )
              .join('<br>');

        } else {

          itemsHtml =
            `${o.qty || '-'} × ${o.productName || 'Item'}`;

        }


        const title =
          Array.isArray(o.items) &&
          o.items.length === 1

            ? `${o.name || 'Unnamed customer'} — ${o.items[0].name}`

            : Array.isArray(o.items) &&
              o.items.length > 1

              ? `${o.name || 'Unnamed customer'} — ${o.items.length} items`

              : `${o.name || 'Unnamed customer'} — ${o.productName || ''}`;


        return `

          <div class="order-card" data-id="${id}">

            <div class="order-top">

              <div>

                <h4>${title}</h4>

                <div class="order-time">
                  ${time}
                </div>

                <div class="order-detail">
                  <strong>Order No:</strong>
                  ${o.orderNumber || id}
                </div>

              </div>


              <div class="order-top-badges">

                ${
                  o.orderSource === 'Owner Manual'
                    ? `
                        <span class="source-pill source-manual">
                          OWNER MANUAL
                        </span>
                      `
                    : `
                        <span class="source-pill source-web">
                          WEBSITE
                        </span>
                      `
                }

                <span class="status-pill status-${statusClass}">
                  ${status}
                </span>

              </div>

            </div>


                        <div class="order-body">

              <div class="order-section">

                <div class="order-detail">

                  <strong>Items:</strong><br>

                  ${itemsHtml}

                </div>


                <div class="delivery-schedule-box">

  <div class="delivery-schedule-head">

    <div class="delivery-schedule-title">
      🚚 Delivery Schedule
    </div>

    ${
      isDeliveryToday(o.deliveryDate)
        ? `
          <span class="delivery-today">
            TODAY
          </span>
        `
        : ''
    }

  </div>


  ${
    o.deliveryDate || o.deliveryTime

      ? `

        <div class="delivery-date">
          ${
            escapeDashboardHtml(
              formatDeliveryDate(
                o.deliveryDate
              )
            )
          }
        </div>


        <div class="delivery-time">
          ${
            o.deliveryTime

              ? '⏰ ' +
                escapeDashboardHtml(
                  o.deliveryTime
                )

              : 'Time not selected'
          }
        </div>

      `

      : `

        <div class="delivery-unscheduled">
          No delivery schedule was selected
          for this order.
        </div>

      `
  }


  ${
    o.deliveryInstructions

      ? `

        <div class="delivery-instructions">

          <div class="delivery-instructions-label">
            📝 Rider Note
          </div>

          <div class="delivery-instructions-text">
            ${
              escapeDashboardHtml(
                o.deliveryInstructions
              )
            }
          </div>

        </div>

      `

      : ''
  }

</div>
                <div class="order-finance">

                  <div class="order-detail">
                    <strong>Payment:</strong>
                    ${o.payMethod || '-'}
                  </div>

                  <div class="order-detail" style="margin-top:7px;">
                    <strong>Payment Status:</strong>
                    <span
                      class="payment-status-badge payment-${paymentStatusClass}">
                      ${paymentStatus}
                    </span>
                  </div>

                  <div class="order-total-big">
                    ${o.total || 'Rs. 0'}
                  </div>

                </div>

              </div>


              <div class="order-side">

                <div class="order-side-title">
                  Customer & Delivery
                </div>


                <div class="order-detail">

                  <strong>Customer:</strong>
                  ${o.name || '-'}

                </div>


                <div class="order-detail">

                  <strong>Phone:</strong>
                  ${o.phone || '-'}

                </div>


                <div class="order-detail">

                  <strong>Address:</strong>
                  ${o.address || '-'}

                </div>


                <div class="order-detail">

                  <strong>Area:</strong>
                  ${o.area || '-'}

                </div>


                <div class="order-detail">
                  ${mapsHtml}
                </div>


                <div class="customer-actions">

                  ${whatsappHtml}

                  ${whatsappReceiptHtml}

                  ${callHtml}

                  ${mapButtonHtml}

                </div>

              </div>

            </div>

            <div class="order-actions">

              <a
                href="invoice.html?id=${encodeURIComponent(id)}"
                class="btn btn-outline btn-sm"
                target="_blank"
                rel="noopener">
                🧾 Invoice
              </a>

              ${
                (
                  o.billingType === 'Monthly Account' ||
                  paymentStatus === 'Monthly Account'
                )

                  ? `<a
                       href="customer-statement.html"
                       class="btn btn-outline btn-sm">
                       Monthly Account Settlement
                     </a>`

                  : paymentStatus === 'Paid'

                    ? `<button
                         type="button"
                         class="btn btn-outline btn-sm set-payment-status"
                         data-id="${id}"
                         data-payment-status="Unpaid">
                         Mark Unpaid
                       </button>`

                    : `<button
                         type="button"
                         class="btn btn-primary btn-sm set-payment-status"
                         data-id="${id}"
                         data-payment-status="Paid">
                         ✓ Mark Paid
                       </button>`
              }

              ${
                status === 'Pending'
                  ? `<button
                       class="btn btn-primary btn-sm set-status"
                       data-id="${id}"
                       data-status="Confirmed">
                       Confirm Order
                     </button>`
                  : ''
              }


              ${
                status === 'Confirmed'
                  ? `<button
                       class="btn btn-primary btn-sm set-status"
                       data-id="${id}"
                       data-status="Preparing">
                       Start Preparing
                     </button>`
                  : ''
              }


              ${
                status === 'Preparing'
                  ? `<button
                       class="btn btn-primary btn-sm set-status"
                       data-id="${id}"
                       data-status="Out for Delivery">
                       Out for Delivery
                     </button>`
                  : ''
              }


              ${
                status === 'Out for Delivery'
                  ? `<button
                       class="btn btn-primary btn-sm set-status"
                       data-id="${id}"
                       data-status="Delivered">
                       Mark Delivered
                     </button>`
                  : ''
              }


              ${
                status === 'Delivered'
                  ? `<button
                       class="btn btn-outline btn-sm set-status"
                       data-id="${id}"
                       data-status="Pending">
                       Reset to Pending
                     </button>`
                  : ''
              }

            </div>

            </div>

          </div>

        `;

      }).join('');


    ordersList
      .querySelectorAll('.set-status')
      .forEach(btn => {

        btn.addEventListener(
          'click',
          () => updateStatus(
            btn.dataset.id,
            btn.dataset.status
          )
        );

      });


    ordersList
      .querySelectorAll('.set-payment-status')
      .forEach(btn => {

        btn.addEventListener(
          'click',
          () => updatePaymentStatus(
            btn.dataset.id,
            btn.dataset.paymentStatus
          )
        );

      });

  }


  // --------------------------------------------------
  // FIRESTORE LIVE ORDERS
  // --------------------------------------------------

  function listenForOrders() {

    if (unsubscribe) {
      unsubscribe();
    }


    unsubscribe =
      db.collection('orders')

        .orderBy(
          'createdAt',
          'desc'
        )

        .limit(100)

        .onSnapshot(

          (snapshot) => {


            allOrders =
              snapshot.docs.map(docSnap => {

                const data =
                  docSnap.data();

                return {

                  id: docSnap.id,

                  ...data,

                  createdDate:
                    data.createdAt &&
                    data.createdAt.toDate

                      ? data.createdAt.toDate()

                      : null

                };

              });


            updateSummary();

            renderOrders();

          },


          (error) => {

            console.error(
              'Order listener failed:',
              error
            );

            ordersList.innerHTML =
              '<div class="empty-state">Could not load orders. Please check your connection and Firebase permissions.</div>';

          }

        );

  }


  // --------------------------------------------------
  // SEARCH + FILTER
  // --------------------------------------------------

  orderSearch.addEventListener(
    'input',
    renderOrders
  );


  statusFilter.addEventListener(
    'change',
    renderOrders
  );


  // --------------------------------------------------
  // UPDATE STATUS
  // --------------------------------------------------

  async function updateStatus(
    id,
    status
  ) {

    try {

      await db.collection(
        'orders'
      )
        .doc(id)
        .update({
          status
        });


      const currentOrder =
        allOrders.find(
          order =>
            order.id === id
        );


      if (currentOrder) {

        await syncOrderToSalesSheet(
          id,
          {
            ...currentOrder,
            status
          }
        );

      }


    } catch (e) {

      alert(
        'Could not update: ' +
        e.message
      );

    }

  }


  // --------------------------------------------------
  // UPDATE PAYMENT STATUS
  // --------------------------------------------------

  async function updatePaymentStatus(
    id,
    paymentStatus
  ) {

    try {

      await db.collection(
        'orders'
      )
        .doc(id)
        .update({
          paymentStatus,
          paymentUpdatedAt:
            firebase.firestore.FieldValue.serverTimestamp()
        });


      const currentOrder =
        allOrders.find(
          order =>
            order.id === id
        );


      if (currentOrder) {

        await syncOrderToSalesSheet(
          id,
          {
            ...currentOrder,
            paymentStatus
          }
        );

      }


    } catch (e) {

      alert(
        'Could not update payment status: ' +
        e.message
      );

    }

  }


});
