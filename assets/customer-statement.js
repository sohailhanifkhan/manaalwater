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

    let customers =
      [];


    function money(value) {

      return (
        'Rs. ' +
        Number(
          value || 0
        ).toLocaleString(
          'en-PK'
        )
      );

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
          Number(parts[0]),
          Number(parts[1]) - 1,
          1
        );

      return date.toLocaleDateString(
        'en-GB',
        {
          month:
            'long',
          year:
            'numeric'
        }
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


      const customer =
        customers.find(
          item =>
            item.id === customerId
        );


      loadBtn.disabled =
        true;

      loadBtn.textContent =
        'Loading...';

      message.style.display =
        'block';

      message.textContent =
        'Loading customer deliveries...';

      view.style.display =
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
              createdDate.getFullYear() +
              '-' +
              String(
                createdDate.getMonth() + 1
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
                data.status || ''
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
          (a, b) =>
            a.createdDate -
            b.createdDate
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
                ? order.items.reduce(
                    (
                      sum,
                      item
                    ) =>
                      sum +
                      Number(
                        item.qty || 0
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
                        `${item.qty || 0} × ${item.name || 'Item'}` +
                        (
                          item.description
                            ? ` — ${item.description}`
                            : ''
                        )
                    )
                    .join(
                      '<br>'
                    )
                : '';


            const orderSubtotal =
              Number(
                order.subtotalAmount ||
                0
              );

            const orderBalance =
              Number(
                order.previousBalanceAmount ||
                0
              );

            const orderDiscount =
              Number(
                order.discountAmount ||
                0
              );

            const orderDeliveryFee =
              Number(
                order.deliveryFee ||
                0
              );

            const orderTotal =
              Number(
                order.totalAmount ||
                0
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


        document
          .getElementById(
            'statementNumber'
          )
          .textContent =
            `MS-${customerId}-${billingMonth}`;


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
            customer
              ? customer.name
              : customerId;


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


    setCurrentMonth();


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

          statementApp.style.display =
            'block';

          loadCustomers();

        } else {

          loginGate.innerHTML =
            'Owner access required. <a href="owner-dashboard.html">Open Owner Dashboard</a>';

        }

      }
    );

  }
);
