// =========================================================
// Manaal Water — Owner Invoice
// =========================================================

document.addEventListener(
  'DOMContentLoaded',
  () => {


    const OWNER_EMAIL =
      'manaalwater@gmail.com';


    const invoiceMessage =
      document.getElementById(
        'invoiceMessage'
      );

    const invoicePaper =
      document.getElementById(
        'invoicePaper'
      );

    const printInvoiceBtn =
      document.getElementById(
        'printInvoiceBtn'
      );


    // -----------------------------------------------------
    // HELPERS
    // -----------------------------------------------------

    function escapeHtml(value) {

      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    }


    function money(value) {

      const number =
        Number(value || 0);

      return (
        'Rs. ' +
        number.toLocaleString(
          'en-PK',
          {
            maximumFractionDigits:2
          }
        )
      );

    }


    function orderTotal(order) {

      if (
        typeof order.totalAmount ===
          'number' &&
        Number.isFinite(
          order.totalAmount
        )
      ) {

        return order.totalAmount;

      }


      const parsed =
        Number(
          String(
            order.total || ''
          ).replace(
            /[^0-9.]/g,
            ''
          )
        );


      return Number.isFinite(parsed)
        ? parsed
        : 0;

    }


    function formatDate(date) {

      if (!date) {
        return '—';
      }


      try {

        return date.toLocaleString(
          'en-PK',
          {
            day:'2-digit',
            month:'short',
            year:'numeric',
            hour:'2-digit',
            minute:'2-digit'
          }
        );

      } catch (error) {

        return '—';

      }

    }


    function formatDeliveryDate(
      dateString
    ) {

      if (!dateString) {
        return '';
      }


      try {

        const parts =
          String(dateString)
            .split('-');


        if (parts.length !== 3) {
          return dateString;
        }


        const date =
          new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
          );


        return date.toLocaleDateString(
          'en-PK',
          {
            day:'2-digit',
            month:'short',
            year:'numeric'
          }
        );

      } catch (error) {

        return dateString;

      }

    }


    function setText(
      id,
      value
    ) {

      const element =
        document.getElementById(id);

      if (element) {
        element.textContent = value;
      }

    }


    // -----------------------------------------------------
    // RENDER INVOICE
    // -----------------------------------------------------

    function renderInvoice(
      order,
      documentId
    ) {


      const createdDate =
        order.createdAt &&
        order.createdAt.toDate

          ? order.createdAt.toDate()

          : null;


      const orderNo =
        order.orderNumber ||
        documentId;


      /*
       * Invoice number is deterministic.
       * The same order always gets
       * the same invoice number.
       */

      const invoiceNo =
        'INV-' + orderNo;


      setText(
        'invoiceNumber',
        invoiceNo
      );


      setText(
        'invoiceOrderNo',
        orderNo
      );


      setText(
        'invoiceDate',
        formatDate(createdDate)
      );


      setText(
        'invoicePayment',
        order.payMethod || '—'
      );


      setText(
        'invoiceStatus',
        order.status || 'Pending'
      );


      setText(
        'invoiceCustomer',
        order.name ||
        'Customer'
      );


      // ---------------------------------------------------
      // CUSTOMER DETAILS
      // ---------------------------------------------------

      const customerDetails = [];

      if (order.phone) {

        customerDetails.push(
          escapeHtml(order.phone)
        );

      }


      if (order.address) {

        customerDetails.push(
          escapeHtml(order.address)
        );

      }


      if (order.area) {

        customerDetails.push(
          escapeHtml(order.area)
        );

      }


      document
        .getElementById(
          'invoiceCustomerDetails'
        )
        .innerHTML =
          customerDetails.join('<br>') ||
          '—';


      // ---------------------------------------------------
      // DELIVERY
      // ---------------------------------------------------

      const deliveryParts = [];


      if (order.deliveryDate) {

        deliveryParts.push(
          formatDeliveryDate(
            order.deliveryDate
          )
        );

      }


      if (order.deliveryTime) {

        deliveryParts.push(
          order.deliveryTime
        );

      }


      setText(
        'invoiceDelivery',
        deliveryParts.length
          ? deliveryParts.join(' · ')
          : 'Not scheduled'
      );


      // ---------------------------------------------------
      // ITEMS
      // ---------------------------------------------------

      const invoiceItems =
        document.getElementById(
          'invoiceItems'
        );


      let items =
        Array.isArray(order.items)
          ? order.items
          : [];


      /*
       * Compatibility with old orders.
       */

      if (
        !items.length &&
        order.productName
      ) {

        const qty =
          Number(order.qty || 1);


        const total =
          orderTotal(order);


        items = [
          {
            name:
              order.productName,

            qty,

            unitPrice:
              qty
                ? total / qty
                : total,

            lineTotal:
              total
          }
        ];

      }


      invoiceItems.innerHTML =
        items.map(
          item => {


            const qty =
              Number(
                item.qty || 0
              );


            const unitPrice =
              Number(
                item.unitPrice || 0
              );


            const lineTotal =
              Number(
                item.lineTotal ??
                (
                  qty *
                  unitPrice
                )
              );


            return `

              <tr>

                <td>
                  ${escapeHtml(
                    item.name ||
                    'Item'
                  )}
                </td>

                <td>
                  ${qty}
                </td>

                <td>
                  ${money(unitPrice)}
                </td>

                <td>
                  ${money(lineTotal)}
                </td>

              </tr>

            `;

          }

        ).join('');


      // ---------------------------------------------------
      // FINANCIALS
      // ---------------------------------------------------

      const calculatedSubtotal =
        items.reduce(
          (sum, item) => {

            return (
              sum +
              Number(
                item.lineTotal ||
                0
              )
            );

          },
          0
        );


      const subtotal =
        typeof order.subtotalAmount ===
          'number'

          ? order.subtotalAmount

          : calculatedSubtotal;


      const discount =
        typeof order.discountAmount ===
          'number'

          ? order.discountAmount

          : 0;


      const deliveryFee =
        typeof order.deliveryFee ===
          'number'

          ? order.deliveryFee

          : 0;


      const total =
        orderTotal(order);


      setText(
        'invoiceSubtotal',
        money(subtotal)
      );


      setText(
        'invoiceTotal',
        money(total)
      );


      // DISCOUNT

      const discountRow =
        document.getElementById(
          'invoiceDiscountRow'
        );


      if (
        discountRow &&
        discount > 0
      ) {

        discountRow.style.display =
          'flex';

        setText(
          'invoiceDiscount',
          '- ' + money(discount)
        );

      }


      // DELIVERY FEE

      const deliveryFeeRow =
        document.getElementById(
          'invoiceDeliveryFeeRow'
        );


      if (
        deliveryFeeRow &&
        deliveryFee > 0
      ) {

        deliveryFeeRow.style.display =
          'flex';

        setText(
          'invoiceDeliveryFee',
          money(deliveryFee)
        );

      }


      // ---------------------------------------------------
      // DELIVERY INSTRUCTIONS
      // ---------------------------------------------------

      const notes =
        document.getElementById(
          'invoiceNotes'
        );


      const notesText =
        document.getElementById(
          'invoiceNotesText'
        );


      if (
        order.deliveryInstructions &&
        notes &&
        notesText
      ) {

        notes.style.display =
          'block';

        notesText.textContent =
          order.deliveryInstructions;

      }


      // ---------------------------------------------------
      // SHOW INVOICE
      // ---------------------------------------------------

      invoiceMessage.style.display =
        'none';


      invoicePaper.style.display =
        'block';


      printInvoiceBtn.style.display =
        'inline-flex';


      document.title =
        `${invoiceNo} | Manaal Water`;

    }


    // -----------------------------------------------------
    // LOAD ORDER
    // -----------------------------------------------------

    async function loadInvoice() {


      const params =
        new URLSearchParams(
          window.location.search
        );


      const documentId =
        params.get('id');


      if (!documentId) {

        invoiceMessage.textContent =
          'Invoice could not be opened because the order ID is missing.';

        return;

      }


      try {

        const doc =
          await db.collection('orders')
            .doc(documentId)
            .get();


        if (!doc.exists) {

          invoiceMessage.textContent =
            'This order could not be found.';

          return;

        }


        renderInvoice(
          doc.data(),
          doc.id
        );


      } catch (error) {

        console.error(
          'Could not load invoice:',
          error
        );


        invoiceMessage.textContent =
          'Could not load this invoice. Please check your connection or permissions.';

      }

    }


    // -----------------------------------------------------
    // AUTH SECURITY
    // -----------------------------------------------------

    auth.onAuthStateChanged(
      async user => {


        if (
          user &&
          user.email &&
          user.email
            .toLowerCase() ===
            OWNER_EMAIL
        ) {

          await loadInvoice();

          return;

        }


        if (user) {

          try {

            await auth.signOut();

          } catch (error) {

            console.error(
              'Sign out failed:',
              error
            );

          }

        }


        window.location.replace(
          'account.html'
        );

      }
    );


    // -----------------------------------------------------
    // PRINT
    // -----------------------------------------------------

    if (printInvoiceBtn) {

      printInvoiceBtn
        .addEventListener(
          'click',
          () => {

            window.print();

          }
        );

    }


  }
);
