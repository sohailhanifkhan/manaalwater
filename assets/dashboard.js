// Manaal Water — Owner Dashboard logic
// Only the OWNER_EMAIL account (set in firebase-init.js) can see this page's data.
// Firestore security rules (set separately in the Firebase console) are what
// actually enforce this — this client-side check just controls the UI.

document.addEventListener('DOMContentLoaded', () => {

  const dashLoginView = document.getElementById('dashLoginView');
  const dashMainView = document.getElementById('dashMainView');
  const dashError = document.getElementById('dashError');
  const ordersList = document.getElementById('ordersList');
  const orderCount = document.getElementById('orderCount');

  function showError(msg) {
    dashError.textContent = msg;
    dashError.style.display = 'flex';
  }

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

  document.getElementById('dashLogoutBtn').addEventListener('click', () => auth.signOut());

  let unsubscribe = null;

  auth.onAuthStateChanged((user) => {
    if (user && user.email === OWNER_EMAIL) {
      dashLoginView.style.display = 'none';
      dashMainView.style.display = 'block';
      listenForOrders();
    } else {
      dashLoginView.style.display = 'block';
      dashMainView.style.display = 'none';
      if (user && user.email !== OWNER_EMAIL) {
        // Someone logged in with a non-owner account by mistake — sign them back out
        auth.signOut();
        showError('This account is not authorized to view the dashboard.');
      }
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    }
  });

  function listenForOrders() {
    if (unsubscribe) unsubscribe();
    unsubscribe = db.collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .onSnapshot((snapshot) => {
        if (snapshot.empty) {
          ordersList.innerHTML = '<div class="empty-state">No orders yet — they\'ll show up here the moment someone orders.</div>';
          orderCount.textContent = '';
          return;
        }
        orderCount.textContent = `${snapshot.size} order${snapshot.size === 1 ? '' : 's'}`;
        ordersList.innerHTML = snapshot.docs.map(docSnap => {
          const o = docSnap.data();
          const id = docSnap.id;
          const status = o.status || 'Pending';
          const statusClass = status.replace(/\s+/g, '-');
          const time = o.createdAt && o.createdAt.toDate ? o.createdAt.toDate().toLocaleString() : 'Just now';
          const mapsHtml = o.mapsLink
            ? `<a class="maps-link" href="${o.mapsLink}" target="_blank" rel="noopener">📍 View location</a>`
            : `<span class="maps-link" style="color:var(--ink-soft);">📍 Location not shared</span>`;
          // New orders have an `items` array (multi-product cart).
          // Older test orders may still have single productName/qty fields — support both.
          let itemsHtml;
          if (Array.isArray(o.items) && o.items.length) {
            itemsHtml = o.items.map(it => `${it.qty} × ${it.name} (Rs. ${(it.lineTotal || 0).toLocaleString()})`).join('<br>');
          } else {
            itemsHtml = `${o.qty || '-'} × ${o.productName || 'Item'}`;
          }
          const title = Array.isArray(o.items) && o.items.length === 1
            ? `${o.name || 'Unnamed customer'} — ${o.items[0].name}`
            : Array.isArray(o.items) && o.items.length > 1
              ? `${o.name || 'Unnamed customer'} — ${o.items.length} items`
              : `${o.name || 'Unnamed customer'} — ${o.productName || ''}`;
          return `
            <div class="order-card" data-id="${id}">
              <div class="order-top">
                <div>
                  <h4>${title}</h4>
                  <div class="order-time">${time}</div>
                  <div class="order-detail"><strong>Order No:</strong> ${o.orderNumber || id}</div>
                </div>
                <span class="status-pill status-${statusClass}">${status}</span>
              </div>
              <div class="order-detail"><strong>Phone:</strong> ${o.phone || '-'}</div>
              <div class="order-detail"><strong>Address:</strong> ${o.address || '-'} ${o.area ? '(' + o.area + ')' : ''}</div>
              <div class="order-detail"><strong>Items:</strong><br>${itemsHtml}</div>
              <div class="order-detail"><strong>Total:</strong> ${o.total || '-'} &nbsp; <strong>Payment:</strong> ${o.payMethod || '-'}</div>
              <div class="order-detail">${mapsHtml}</div>
              <div class="order-actions">
              ${status === 'Pending' ? `<button class="btn btn-primary btn-sm set-status" data-id="${id}" data-status="Confirmed">Confirm Order</button>` : ''}
              ${status === 'Confirmed' ? `<button class="btn btn-primary btn-sm set-status" data-id="${id}" data-status="Preparing">Start Preparing</button>` : ''}
              ${status === 'Preparing' ? `<button class="btn btn-primary btn-sm set-status" data-id="${id}" data-status="Out for Delivery">Out for Delivery</button>` : ''}
              ${status === 'Out for Delivery' ? `<button class="btn btn-primary btn-sm set-status" data-id="${id}" data-status="Delivered">Mark Delivered</button>` : ''}
              ${status === 'Delivered' ? `<button class="btn btn-outline btn-sm set-status" data-id="${id}" data-status="Pending">Reset to Pending</button>` : ''}
            </div>
            </div>`;
               }).join('');

        ordersList.querySelectorAll('.set-status').forEach(btn => {
          btn.addEventListener('click', () => {
            updateStatus(btn.dataset.id, btn.dataset.status);
          });
        });

      }, (error) => {
        console.error('Order listener failed:', error);
        ordersList.innerHTML = '<div class="empty-state">Could not load orders. Please check your connection and Firebase permissions.</div>';
      });
  }

  function updateStatus(id, status) {
    db.collection('orders').doc(id).update({ status }).catch(e => alert('Could not update: ' + e.message));
  }

});
