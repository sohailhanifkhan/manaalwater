document.addEventListener(
  'DOMContentLoaded',
  () => {

    const SALES_SYNC_WEB_APP_URL =
      'https://script.google.com/macros/s/AKfycbyUfljON8xGW84CO26VI5n67AsIu62VfoEGtA7RFiXaubN1lnBuH4QMWtxRXSU5EYUz/exec';


    const loginGate =
      document.getElementById(
        'loginGate'
      );

    const statementApp =
      document.getElementById(
        'statementApp'
      );

    const customerSelect =
      document.getElementById(
        'statementCustomer'
      );

    const monthInput =
      document.getElementById(
        'statementMonth'
      );

    const loadBtn =
      document.getElementById(
        'loadStatementBtn'
      );

    const printBtn =
      document.getElementById(
        'printStatementBtn'
      );

    const message =
      document.getElementById(
        'statementMessage'
      );

    const view =
      document.getElementById(
        'statementView'
      );

    const settlementPanel =
      document.getElementById(
        'settlementPanel'
      );

    const paymentAmount =
      document.getElementById(
        'paymentAmount'
      );

    const paymentMethod =
      document.getElementById(
        'paymentMethod'
      );

    const paymentDate =
      document.getElementById(
        'paymentDate'
      );

    const paymentBankCheque =
      document.getElementById(
        'paymentBankCheque'
      );

    const paymentReference =
      document.getElementById(
        'paymentReference'
      );

    const paymentNotes =
      document.getElementById(
        'paymentNotes'
      );

    const recordPaymentBtn =
      document.getElementById(
        'recordPaymentBtn'
      );


    let customers =
      [];

    let currentCustomer =
      null;

    let currentBillingMonth =
      '';

    let currentOrders =
      [];

    let currentPayments =
      [];

    let currentStatementAmount =
      0;


    function money(value) {

      return (
        'Rs. ' +
        Number(
          value || 0
        ).toLocaleString(
          'en-PK',
          {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          }
        )
      );

    }


    function numeric(value) {

      const number =
        Number(
          value || 0
        );

      return Number.isFinite(
        number
      )
        ? number
        : 0;

    }


    function safeDate(order) {

      try {

        if (
          order.createdAt &&
          typeof order.createdAt.toDate ===
            'function'
        ) {

          return order.createdAt.toDate();

        }


        if (
          order.createdDate instanceof Date
        ) {

          return order.createdDate;

        }


        return null;

      } catch (error) {

        return null;

      }

    }


    function escapeHtml(value) {

      return String(
        value || ''
      )
        .replace(
          /&/g,
          '&amp;'
        )
        .replace(
          /</g,
          '&lt;'
        )
        .replace(
          />/g,
          '&gt;'
        )
        .replace(
          /"/g,
          '&quot;'
        )
        .replace(
          /'/g,
          '&#039;'
        );

    }


    function monthLabel(value) {

      if (!value) {
        return '';
      }


      const parts =
        value.split('-');


      const date =
        new Date(
          Number(
            parts[0]
          ),
          Number(
            parts[1]
          ) - 1,
          1
        );


      return date
        .toLocaleDateString(
          'en-GB',
          {
            month:
              'long',
            year:
              'numeric'
          }
        );

    }


    function statementId() {

      if (
        !currentCustomer ||
        !currentBillingMonth
      ) {

        return '';

      }


      return (
        'MS-' +
        currentCustomer.id +
        '-' +
        currentBillingMonth
      );

    }


    function setToday() {

      const now =
        new Date();


      paymentDate.value =
        now.getFullYear() +
        '-' +
        String(
          now.getMonth() + 1
        ).padStart(
          2,
          '0'
        ) +
        '-' +
        String(
          now.getDate()
        ).padStart(
          2,
          '0'
        );

    }


    function setCurrentMonth() {

      const now =
        new Date();


      monthInput.value =
        now.getFullYear() +
        '-' +
        String(
          now.getMonth() + 1
        ).padStart(
          2,
          '0'
        );

    }


    function totalReceived() {

      return currentPayments
        .reduce(
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

    }


    function outstandingAmount() {

      return Math.max(
        currentStatementAmount -
        totalReceived(),
        0
      );

    }


    function accountStatus() {

      const received =
        totalReceived();


      if (
        currentStatementAmount > 0 &&
        received >=
          currentStatementAmount
      ) {

        return 'Settled';

      }


      if (received > 0) {

        return 'Partially Paid';

      }


      return 'Open';

    }


    function statusCssClass(
      status
    ) {

      if (
        status ===
        'Settled'
      ) {

        return 'status-settled';

      }


      if (
        status ===
        'Partially Paid'
      ) {

        return 'status-partial';

      }


      return 'status-open';

    }


    function mergePaymentsFromOrders(
      orders
    ) {

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
                !payment ||
                !payment.paymentId
              ) {

                return;

              }


              map.set(
                payment.paymentId,
                payment
              );

            }
          );

        }
      );


      return Array.from(
        map.values()
      ).sort(
        (
          a,
          b
        ) => {

          const aDate =
            new Date(
              a.paymentDate ||
              a.recordedAt ||
              0
            ).getTime();

          const bDate =
            new Date(
              b.paymentDate ||
              b.recordedAt ||
              0
            ).getTime();


          return (
            aDate -
            bDate
          );

        }
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
            'manaalStatementCustomers_' +
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


    function renderPaymentHistory() {

      const empty =
        document.getElementById(
          'paymentHistoryEmpty'
        );

      const table =
        document.getElementById(
          'paymentHistoryTable'
        );

      const rows =
        document.getElementById(
          'paymentRows'
        );


      rows.innerHTML =
        '';


      if (
        !currentPayments.length
      ) {

        empty.style.display =
          'block';

        table.style.display =
          'none';

        return;

      }


      empty.style.display =
        'none';

      table.style.display =
        'block';


      currentPayments.forEach(
        payment => {

          const tr =
            document.createElement(
              'tr'
            );


          tr.innerHTML =
            '<td>' +
            escapeHtml(
              payment.paymentDate ||
              ''
            ) +
            '</td>' +

            '<td>' +
            escapeHtml(
              payment.paymentMethod ||
              ''
            ) +
            '</td>' +

            '<td>' +
            escapeHtml(
              payment.bankOrCheque ||
              ''
            ) +
            '</td>' +

            '<td>' +
            escapeHtml(
              payment.referenceNumber ||
              ''
            ) +
            '</td>' +

            '<td>' +
            escapeHtml(
              payment.notes ||
              ''
            ) +
            '</td>' +

            '<td class="money"><strong>' +
            money(
              payment.amount
            ) +
            '</strong></td>';


          rows.appendChild(
            tr
          );

        }
      );

    }


    function renderSettlementSummary() {

      const received =
        totalReceived();

      const outstanding =
        outstandingAmount();

      const status =
        accountStatus();


      document
        .getElementById(
          'statementReceived'
        )
        .textContent =
          money(
            received
          );


      document
        .getElementById(
          'statementOutstanding'
        )
        .textContent =
          money(
            outstanding
          );


      const statusElement =
        document.getElementById(
          'statementStatus'
        );


      statusElement.textContent =
        status.toUpperCase();


      statusElement.className =
        'status-pill ' +
        statusCssClass(
          status
        );


      if (
        currentOrders.length &&
        outstanding > 0
      ) {

        paymentAmount.max =
          String(
            outstanding
          );

        paymentAmount.placeholder =
          'Outstanding: ' +
          money(
            outstanding
          );

        recordPaymentBtn.disabled =
          false;

        recordPaymentBtn.textContent =
          'Record Payment';

      } else if (
        currentOrders.length &&
        outstanding <= 0
      ) {

        paymentAmount.value =
          '';

        paymentAmount.placeholder =
          'Account settled';

        recordPaymentBtn.disabled =
          true;

        recordPaymentBtn.textContent =
          'Account Settled';

      } else {

        recordPaymentBtn.disabled =
          true;

      }


      renderPaymentHistory();

    }


    async function generateStatement() {

      const customerId =
        customerSelect.value;

      const billingMonth =
        monthInput.value;


      if (!customerId) {

        alert(
          'Please select a permanent customer.'
        );

        return;

      }


      if (!billingMonth) {

        alert(
          'Please select a billing month.'
        );

        return;

      }


      currentCustomer =
        customers.find(
          item =>
            item.id ===
            customerId
        ) ||
        {
          id:
            customerId,
          name:
            customerId
        };


      currentBillingMonth =
        billingMonth;


      loadBtn.disabled =
        true;

      loadBtn.textContent =
        'Loading...';


      message.style.display =
        'block';

      message.textContent =
        'Loading customer deliveries and payment history...';


      view.style.display =
        'none';

      settlementPanel.style.display =
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
              customerId
            )
            .get();


        const orders =
          [];


        snapshot.forEach(
          doc => {

            const data =
              doc.data();


            const createdDate =
              safeDate(
                data
              );


            if (!createdDate) {
              return;
            }


            const orderMonth =
              createdDate
                .getFullYear() +
              '-' +
              String(
                createdDate
                  .getMonth() + 1
              ).padStart(
                2,
                '0'
              );


            if (
              orderMonth !==
              billingMonth
            ) {

              return;

            }


            if (
              String(
                data.status ||
                ''
              ) !==
              'Delivered'
            ) {

              return;

            }


            if (
              data.billingType &&
              data.billingType !==
                'Monthly Account'
            ) {

              return;

            }


            orders.push({
              id:
                doc.id,
              ...data,
              createdDate
            });

          }
        );


        orders.sort(
          (
            a,
            b
          ) =>
            a.createdDate -
            b.createdDate
        );


        currentOrders =
          orders;


        currentPayments =
          mergePaymentsFromOrders(
            orders
          );


        const rows =
          document.getElementById(
            'statementRows'
          );


        rows.innerHTML =
          '';


        let subtotal =
          0;

        let previousBalance =
          0;

        let discount =
          0;

        let deliveryFee =
          0;

        let total =
          0;


        orders.forEach(
          order => {

            const qty =
              Array.isArray(
                order.items
              )
                ? order.items
                    .reduce(
                      (
                        sum,
                        item
                      ) =>
                        sum +
                        numeric(
                          item.qty
                        ),
                      0
                    )
                : 0;


            const products =
              Array.isArray(
                order.items
              )
                ? order.items
                    .map(
                      item =>
                        escapeHtml(
                          `${item.qty || 0} × ${item.name || 'Item'}`
                        ) +
                        (
                          item.description
                            ? ' — ' +
                              escapeHtml(
                                item.description
                              )
                            : ''
                        )
                    )
                    .join(
                      '<br>'
                    )
                : '';


            const orderSubtotal =
              numeric(
                order.subtotalAmount
              );

            const orderBalance =
              numeric(
                order.previousBalanceAmount
              );

            const orderDiscount =
              numeric(
                order.discountAmount
              );

            const orderDeliveryFee =
              numeric(
                order.deliveryFee
              );

            const orderTotal =
              numeric(
                order.totalAmount
              );


            subtotal +=
              orderSubtotal;

            previousBalance +=
              orderBalance;

            discount +=
              orderDiscount;

            deliveryFee +=
              orderDeliveryFee;

            total +=
              orderTotal;


            const tr =
              document.createElement(
                'tr'
              );


            tr.innerHTML =
              '<td>' +
              escapeHtml(
                order.createdDate
                  .toLocaleDateString(
                    'en-GB'
                  )
              ) +
              '</td>' +

              '<td>' +
              escapeHtml(
                order.orderNumber ||
                order.id
              ) +
              '</td>' +

              '<td>' +
              products +
              '</td>' +

              '<td>' +
              qty +
              '</td>' +

              '<td class="money">' +
              money(
                orderSubtotal
              ) +
              '</td>' +

              '<td class="money">' +
              money(
                orderBalance
              ) +
              '</td>' +

              '<td class="money"><strong>' +
              money(
                orderTotal
              ) +
              '</strong></td>';


            rows.appendChild(
              tr
            );

          }
        );


        currentStatementAmount =
          total;


        document
          .getElementById(
            'statementNumber'
          )
          .textContent =
            statementId();


        document
          .getElementById(
            'statementPeriod'
          )
          .textContent =
            monthLabel(
              billingMonth
            );


        document
          .getElementById(
            'statementCustomerName'
          )
          .textContent =
            currentCustomer.name;


        document
          .getElementById(
            'statementCustomerId'
          )
          .textContent =
            customerId;


        document
          .getElementById(
            'statementOrderCount'
          )
          .textContent =
            orders.length;


        document
          .getElementById(
            'statementSubtotal'
          )
          .textContent =
            money(
              subtotal
            );


        document
          .getElementById(
            'statementPreviousBalance'
          )
          .textContent =
            money(
              previousBalance
            );


        document
          .getElementById(
            'statementDiscount'
          )
          .textContent =
            money(
              discount
            );


        document
          .getElementById(
            'statementDeliveryFee'
          )
          .textContent =
            money(
              deliveryFee
            );


        document
          .getElementById(
            'statementTotal'
          )
          .textContent =
            money(
              total
            );


        view.style.display =
          'block';

        settlementPanel.style.display =
          orders.length
            ? 'block'
            : 'none';


        renderSettlementSummary();


        if (
          orders.length
        ) {

          message.style.display =
            'none';

        } else {

          message.style.display =
            'block';

          message.textContent =
            'No Delivered Monthly Account orders were found for this customer in the selected month.';

        }


      } catch (error) {

        console.error(
          error
        );


        message.style.display =
          'block';

        message.textContent =
          'Could not generate statement: ' +
          (
            error.message ||
            'Unknown error'
          );


      } finally {

        loadBtn.disabled =
          false;

        loadBtn.textContent =
          'Generate Statement';

      }

    }


    function newPaymentId() {

      return (
        'PAY-' +
        Date.now() +
        '-' +
        Math.random()
          .toString(36)
          .slice(
            2,
            8
          )
          .toUpperCase()
      );

    }


    async function syncOrderToSalesSheet(
      order,
      updates
    ) {

      const merged = {
        ...order,
        ...updates,
        firestoreId:
          order.id,
        orderDate:
          order.createdDate
            ? order.createdDate
                .toISOString()
            : new Date()
                .toISOString(),
        invoiceNumber:
          order.invoiceNumber ||
          (
            order.orderNumber
              ? 'INV-' +
                order.orderNumber
              : ''
          )
      };


      try {

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
              JSON.stringify(
                merged
              )
          }
        );

      } catch (error) {

        console.warn(
          'Order Sales Register sync failed:',
          error
        );

      }

    }


    async function syncPaymentToGoogleSheet(
      payment,
      receivedAfter,
      outstandingAfter,
      statusAfter
    ) {

      const payload = {

        syncType:
          'monthlyPayment',

        paymentId:
          payment.paymentId,

        statementId:
          statementId(),

        customerId:
          currentCustomer.id,

        customerName:
          currentCustomer.name,

        billingMonth:
          currentBillingMonth,

        paymentDate:
          payment.paymentDate,

        paymentMethod:
          payment.paymentMethod,

        bankOrCheque:
          payment.bankOrCheque,

        referenceNumber:
          payment.referenceNumber,

        amount:
          payment.amount,

        notes:
          payment.notes,

        statementAmount:
          currentStatementAmount,

        totalReceived:
          receivedAfter,

        outstanding:
          outstandingAfter,

        status:
          statusAfter,

        recordedAt:
          payment.recordedAt

      };


      try {

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
              JSON.stringify(
                payload
              )
          }
        );

      } catch (error) {

        console.warn(
          'Monthly payment Google Sheet sync failed:',
          error
        );

      }

    }


    async function recordPayment() {

      if (
        !currentOrders.length ||
        !currentCustomer ||
        !currentBillingMonth
      ) {

        alert(
          'Generate a monthly statement first.'
        );

        return;

      }


      const amount =
        numeric(
          paymentAmount.value
        );


      const outstandingBefore =
        outstandingAmount();


      if (
        amount <= 0
      ) {

        alert(
          'Please enter the amount received.'
        );

        return;

      }


      if (
        amount >
        outstandingBefore +
        0.001
      ) {

        alert(
          'The payment cannot be more than the current outstanding amount of ' +
          money(
            outstandingBefore
          ) +
          '.'
        );

        return;

      }


      if (
        !paymentDate.value
      ) {

        alert(
          'Please enter the payment date.'
        );

        return;

      }


      if (
        !confirm(
          'Record payment of ' +
          money(
            amount
          ) +
          ' against ' +
          currentCustomer.name +
          ' for ' +
          monthLabel(
            currentBillingMonth
          ) +
          '?'
        )
      ) {

        return;

      }


      const payment = {

        paymentId:
          newPaymentId(),

        paymentDate:
          paymentDate.value,

        paymentMethod:
          paymentMethod.value,

        bankOrCheque:
          paymentBankCheque.value
            .trim(),

        referenceNumber:
          paymentReference.value
            .trim(),

        amount,

        notes:
          paymentNotes.value
            .trim(),

        recordedAt:
          new Date()
            .toISOString(),

        recordedBy:
          auth.currentUser &&
          auth.currentUser.email
            ? auth.currentUser.email
            : 'owner'

      };


      const updatedPayments = [
        ...currentPayments,
        payment
      ];


      const receivedAfter =
        updatedPayments
          .reduce(
            (
              sum,
              item
            ) =>
              sum +
              numeric(
                item.amount
              ),
            0
          );


      const outstandingAfter =
        Math.max(
          currentStatementAmount -
          receivedAfter,
          0
        );


      const statusAfter =
        receivedAfter >=
          currentStatementAmount
          ? 'Settled'
          : 'Partially Paid';


      const orderPaymentStatus =
        statusAfter ===
          'Settled'
          ? 'Paid'
          : 'Monthly Account';


      recordPaymentBtn.disabled =
        true;

      recordPaymentBtn.textContent =
        'Recording...';


      try {

        const batch =
          db.batch();


        currentOrders.forEach(
          order => {

            const ref =
              db
                .collection(
                  'orders'
                )
                .doc(
                  order.id
                );


            batch.update(
              ref,
              {

                monthlyStatementId:
                  statementId(),

                monthlyStatementMonth:
                  currentBillingMonth,

                monthlyStatementAmount:
                  currentStatementAmount,

                monthlyPayments:
                  updatedPayments,

                monthlyStatementReceived:
                  receivedAfter,

                monthlyStatementOutstanding:
                  outstandingAfter,

                monthlyStatementStatus:
                  statusAfter,

                monthlyStatementUpdatedAt:
                  firebase.firestore.FieldValue.serverTimestamp(),

                paymentStatus:
                  orderPaymentStatus,

                paymentUpdatedAt:
                  firebase.firestore.FieldValue.serverTimestamp()

              }
            );

          }
        );


        await batch.commit();


        currentPayments =
          updatedPayments;


        currentOrders =
          currentOrders.map(
            order => ({
              ...order,

              monthlyStatementId:
                statementId(),

              monthlyStatementMonth:
                currentBillingMonth,

              monthlyStatementAmount:
                currentStatementAmount,

              monthlyPayments:
                updatedPayments,

              monthlyStatementReceived:
                receivedAfter,

              monthlyStatementOutstanding:
                outstandingAfter,

              monthlyStatementStatus:
                statusAfter,

              paymentStatus:
                orderPaymentStatus
            })
          );


        renderSettlementSummary();


        await Promise.all(
          currentOrders.map(
            order =>
              syncOrderToSalesSheet(
                order,
                {
                  paymentStatus:
                    orderPaymentStatus,
                  monthlyStatementId:
                    statementId(),
                  monthlyStatementStatus:
                    statusAfter
                }
              )
          )
        );


        await syncPaymentToGoogleSheet(
          payment,
          receivedAfter,
          outstandingAfter,
          statusAfter
        );


        paymentAmount.value =
          '';

        paymentBankCheque.value =
          '';

        paymentReference.value =
          '';

        paymentNotes.value =
          '';


        alert(
          statusAfter ===
            'Settled'
            ? 'Payment recorded. This monthly account is now SETTLED.'
            : 'Payment recorded successfully. The account remains PARTIALLY PAID.'
        );


      } catch (error) {

        console.error(
          error
        );


        alert(
          'Could not record payment: ' +
          (
            error.message ||
            'Unknown error'
          )
        );


        renderSettlementSummary();

      }

    }


    if (loadBtn) {

      loadBtn.addEventListener(
        'click',
        generateStatement
      );

    }


    if (printBtn) {

      printBtn.addEventListener(
        'click',
        () => {

          if (
            view.style.display ===
            'none'
          ) {

            alert(
              'Generate a statement first.'
            );

            return;

          }


          window.print();

        }
      );

    }


    if (recordPaymentBtn) {

      recordPaymentBtn.addEventListener(
        'click',
        recordPayment
      );

    }


    setCurrentMonth();

    setToday();


    const urlParams =
      new URLSearchParams(
        window.location.search
      );

    const requestedCustomer =
      urlParams.get(
        'customer'
      );

    const requestedMonth =
      urlParams.get(
        'month'
      );


    if (requestedMonth) {
      monthInput.value =
        requestedMonth;
    }


    auth.onAuthStateChanged(
      user => {

        if (
          user &&
          String(
            user.email ||
            ''
          ).toLowerCase() ===
          String(
            OWNER_EMAIL ||
            ''
          ).toLowerCase()
        ) {

          loginGate.style.display =
            'none';

          statementApp.style.display =
            'block';

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
            'Owner access required. <a href="owner-dashboard.html">Open Owner Dashboard</a>';

        }

      }
    );

  }
);
