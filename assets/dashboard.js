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

  let unsubscribe = null;
  let allOrders = [];


  function showError(msg) {
    dashError.textContent = msg;
    dashError.style.display = 'flex';
  }


  // --------------------------------------------------
  // OWNER LOGIN
  // --------------------------------------------------

  document.getElementById('dashLoginForm').addEventListener('submit', async (e) => {

    e.preventDefault();

    dashError.style.display = 'none';

    const email = document.getElementById('dashEmail').value.trim();
    const pass = document.getElementById('dashPass').value;

    try {

      await auth.signInWithEmailAndPassword(email, pass);

    } catch (err) {

      showError('Incorrect email or password.');

    }

  });


  document.getElementById('dashLogoutBtn')
    .addEventListener('click', () => auth.signOut());


  // --------------------------------------------------
  // AUTH STATE
  // --------------------------------------------------

  auth.onAuthStateChanged((user) => {

    if (user && user.email === OWNER_EMAIL) {

      dashLoginView.style.display = 'none';
      dashMainView.style.display = 'block';

      listenForOrders();

    } else {

      dashLoginView.style.display = 'block';
      dashMainView.style.display = 'none';

      if (user && user.email !== OWNER_EMAIL) {

        auth.signOut();

        showError(
          'This account is not authorized to view the dashboard.'
        );

      }

      if (unsubscribe) {

        unsubscribe();
        unsubscribe = null;

      }

    }

  });


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
  o.deliveryInstructions

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
                `${it.qty} × ${it.name} (Rs. ${(it.lineTotal || 0).toLocaleString()})`
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


              <span class="status-pill status-${statusClass}">
                ${status}
              </span>

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

                  ${callHtml}

                  ${mapButtonHtml}

                </div>

              </div>

            </div>

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

  function updateStatus(id, status) {

    db.collection('orders')
      .doc(id)
      .update({ status })
      .catch(e =>
        alert(
          'Could not update: ' +
          e.message
        )
      );

  }

});
