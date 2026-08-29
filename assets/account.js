// Manaal Water — Customer Account
// Firebase Auth + profile + personal order history + reorder

document.addEventListener('DOMContentLoaded', () => {

  const loggedOutView = document.getElementById('loggedOutView');
  const loggedInView = document.getElementById('loggedInView');
  const authError = document.getElementById('authError');
  const pageHeading = document.getElementById('pageHeading');
  const pageSub = document.getElementById('pageSub');

  const historySection = document.getElementById('orderHistorySection');
  const historyList = document.getElementById('orderHistoryList');
  const historyCount = document.getElementById('historyCount');

  const accountStats = document.getElementById('accountStats');
  const accTotalOrders = document.getElementById('accTotalOrders');
  const accDelivered = document.getElementById('accDelivered');
  const accSpent = document.getElementById('accSpent');

  let customerOrders = [];


  function showError(message) {

    if (!authError) return;

    authError.textContent = message;
    authError.style.display = 'flex';

  }


  function clearError() {

    if (!authError) return;

    authError.style.display = 'none';

  }


  function friendlyError(err) {

    const code =
      err && err.code
        ? err.code
        : '';

    if (code.includes('email-already-in-use'))
      return 'That email already has an account — try logging in instead.';

    if (code.includes('invalid-email'))
      return 'Please enter a valid email address.';

    if (code.includes('weak-password'))
      return 'Password should be at least 6 characters.';

    if (
      code.includes('user-not-found') ||
      code.includes('wrong-password') ||
      code.includes('invalid-credential')
    )
      return 'Incorrect email or password.';

    return 'Something went wrong — please try again.';

  }


  // --------------------------------------------------
  // SIGN UP
  // --------------------------------------------------

  const signupForm =
    document.getElementById('signupForm');

  if (signupForm) {

    signupForm.addEventListener(
      'submit',
      async (e) => {

        e.preventDefault();

        clearError();

        const name =
          document.getElementById('suName').value.trim();

        const phone =
          document.getElementById('suPhone').value.trim();

        const email =
          document.getElementById('suEmail').value.trim();

        const address =
          document.getElementById('suAddress').value.trim();

        const pass =
          document.getElementById('suPass').value;

        const payMethod =
          document.getElementById('suPay').value;

        try {

          const cred =
            await auth.createUserWithEmailAndPassword(
              email,
              pass
            );

          await db.collection('customers')
            .doc(cred.user.uid)
            .set({

              name,
              phone,
              address,
              payMethod,
              email,

              createdAt:
                firebase.firestore.FieldValue.serverTimestamp()

            });

        } catch (err) {

          showError(
            friendlyError(err)
          );

        }

      }
    );

  }


  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------

  const loginForm =
    document.getElementById('loginForm');

  if (loginForm) {

    loginForm.addEventListener(
      'submit',
      async (e) => {

        e.preventDefault();

        clearError();

        const email =
          document.getElementById('loginEmail').value.trim();

        const pass =
          document.getElementById('loginPass').value;

        try {

          await auth.signInWithEmailAndPassword(
            email,
            pass
          );

        } catch (err) {

          showError(
            friendlyError(err)
          );

        }

      }
    );

  }


  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const logoutBtn =
    document.getElementById('logoutBtn');

  if (logoutBtn) {

    logoutBtn.addEventListener(
      'click',
      () => auth.signOut()
    );

  }


  // --------------------------------------------------
  // MONEY
  // --------------------------------------------------

  function orderAmount(order) {

    if (
      typeof order.totalAmount === 'number' &&
      Number.isFinite(order.totalAmount)
    ) {

      return order.totalAmount;

    }

    const amount =
      Number(
        String(order.total || '')
          .replace(/[^0-9.]/g, '')
      );

    return Number.isFinite(amount)
      ? amount
      : 0;

  }


  // --------------------------------------------------
  // ORDER HISTORY
  // --------------------------------------------------

  async function loadOrderHistory(user) {

    if (
      !historySection ||
      !historyList
    ) return;


    historySection.style.display = 'block';

    historyList.innerHTML =
      '<div class="summary-box">Loading your orders...</div>';


    try {

      // Security rules only allow the signed-in user
      // to read documents where uid matches their UID.
      //
      // We deliberately sort in the browser so this
      // does not require a Firestore composite index.

      const snapshot =
        await db.collection('orders')
          .where('uid', '==', user.uid)
          .limit(50)
          .get();


      customerOrders =
        snapshot.docs.map(doc => {

          const data =
            doc.data();

          return {

            id: doc.id,

            ...data,

            createdDate:
              data.createdAt &&
              data.createdAt.toDate

                ? data.createdAt.toDate()

                : null

          };

        });


      customerOrders.sort(
        (a, b) => {

          const aTime =
            a.createdDate
              ? a.createdDate.getTime()
              : 0;

          const bTime =
            b.createdDate
              ? b.createdDate.getTime()
              : 0;

          return bTime - aTime;

        }
      );


      renderOrderHistory();

    } catch (err) {

      console.error(
        'Could not load customer order history:',
        err
      );

      historyList.innerHTML =
        '<div class="summary-box">Your order history could not be loaded. Please try again shortly.</div>';

    }

  }


  function renderOrderHistory() {

    const totalOrders =
      customerOrders.length;


    const deliveredOrders =
      customerOrders.filter(
        order => order.status === 'Delivered'
      );


    const totalSpent =
      deliveredOrders.reduce(
        (sum, order) =>
          sum + orderAmount(order),
        0
      );


    if (accountStats) {
      accountStats.style.display = 'block';
    }


    if (accTotalOrders) {
      accTotalOrders.textContent =
        totalOrders;
    }


    if (accDelivered) {
      accDelivered.textContent =
        deliveredOrders.length;
    }


    if (accSpent) {
      accSpent.textContent =
        `Rs. ${totalSpent.toLocaleString()}`;
    }


    if (historyCount) {

      historyCount.textContent =
        `${totalOrders} order${totalOrders === 1 ? '' : 's'}`;

    }


    if (!customerOrders.length) {

      historyList.innerHTML = `
        <div class="summary-box" style="text-align:center; padding:30px;">
          <strong>No account orders yet</strong>
          <p style="margin:8px 0 18px; color:var(--ink-soft);">
            Orders placed while you are logged in will appear here.
          </p>
          <a href="order.html" class="btn btn-primary btn-sm">
            Place your first account order
          </a>
        </div>
      `;

      return;

    }


    historyList.innerHTML =
      customerOrders.map(
        (order, index) => {

          const status =
            order.status || 'Pending';

          const statusClass =
            status.replace(/\s+/g, '-');


          const date =
            order.createdDate

              ? order.createdDate.toLocaleString()

              : 'Date unavailable';


          const items =
            Array.isArray(order.items)

              ? order.items.map(
                  item =>
                    `${item.qty || 0} × ${item.name || 'Item'}`
                ).join('<br>')

              : 'Order details unavailable';


          return `

            <div class="history-card">

              <div class="history-top">

                <div>

                  <div class="history-order-no">
                    ${order.orderNumber || order.id}
                  </div>

                  <div class="history-date">
                    ${date}
                  </div>

                </div>


                <span class="history-status ${statusClass}">
                  ${status}
                </span>

              </div>


              <div class="history-items">
                ${items}
              </div>


              <div class="history-bottom">

                <div>

                  <div class="history-total">
                    ${order.total || `Rs. ${orderAmount(order).toLocaleString()}`}
                  </div>

                  <div style="font-size:.72rem; color:var(--ink-soft); margin-top:3px;">
                    ${order.payMethod || ''}
                  </div>

                </div>


                <button
                  type="button"
                  class="btn btn-outline btn-sm reorder-history-btn"
                  data-order-index="${index}">
                  Order Again
                </button>

              </div>

            </div>

          `;

        }

      ).join('');


    historyList
      .querySelectorAll('.reorder-history-btn')
      .forEach(button => {

        button.addEventListener(
          'click',
          () => {

            const index =
              Number(
                button.dataset.orderIndex
              );

            const order =
              customerOrders[index];

            if (!order) return;


            localStorage.setItem(
              'manaalReorder',
              JSON.stringify({

                items:
                  Array.isArray(order.items)
                    ? order.items
                    : [],

                area:
                  order.area || '',

                payMethod:
                  order.payMethod || ''

              })
            );


            window.location.href =
              'order.html?reorder=1';

          }

        );

      });

  }


  // --------------------------------------------------
  // AUTH STATE
  // --------------------------------------------------

  auth.onAuthStateChanged(
    async (user) => {

      if (
        !loggedOutView ||
        !loggedInView
      ) return;


      if (user) {

        loggedOutView.style.display = 'none';
        loggedInView.style.display = 'block';

        if (pageHeading) {
          pageHeading.textContent =
            'Welcome back';
        }

        if (pageSub) {
          pageSub.textContent =
            'Your account, orders and saved details in one place.';
        }


        try {

          const doc =
            await db.collection('customers')
              .doc(user.uid)
              .get();


          if (doc.exists) {

            const d =
              doc.data();


            document.getElementById('welcomeName')
              .textContent =
                `Welcome back, ${d.name || ''}!`;


            document.getElementById('profName')
              .textContent =
                d.name || '—';


            document.getElementById('profPhone')
              .textContent =
                d.phone || '—';


            document.getElementById('profAddress')
              .textContent =
                d.address || '—';


            document.getElementById('profPay')
              .textContent =
                d.payMethod || '—';

          }

        } catch (e) {

          console.warn(
            'Could not load profile',
            e
          );

        }


        await loadOrderHistory(user);


      } else {

        loggedOutView.style.display = 'block';
        loggedInView.style.display = 'none';

        if (historySection) {
          historySection.style.display = 'none';
        }

        if (accountStats) {
          accountStats.style.display = 'none';
        }

        customerOrders = [];


        if (pageHeading) {
          pageHeading.textContent =
            'Log in or create your account';
        }

        if (pageSub) {
          pageSub.textContent =
            'Save your address once, then reorder your usual bottles in a couple of taps.';
        }

      }

    }
  );

});
