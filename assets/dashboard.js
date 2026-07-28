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
          const time = o.createdAt && o.createdAt.toDate ? o.createdAt.toDate().toLocaleString() : 'Just now';
          const mapsHtml = o.mapsLink
            ? `<a class="maps-link" href="${o.mapsLink}" target="_blank" rel="noopener">📍 View location</a>`
            : `<span class="maps-link" style="color:var(--ink-soft);">📍 Location not shared</span>`;
          return `
            <div class="order-card" data-id="${id}">
              <div class="order-top">
                <div>
                  <h4>${o.name || 'Unnamed customer'} — ${o.productName || ''}</h4>
                  <div class="order-time">${time}</div>
                </div>
                <span class="status-pill status-${status}">${status}</span>
              </div>
              <div class="order-detail"><strong>Phone:</strong> ${o.phone || '-'}</div>
              <div class="order-detail"><strong>Address:</strong> ${o.address || '-'} ${o.area ? '(' + o.area + ')' : ''}</div>
              <div class="order-detail"><strong>Qty:</strong> ${o.qty || '-'} &nbsp; <strong>Total:</strong> ${o.total || '-'} &nbsp; <strong>Payment:</strong> ${o.payMethod || '-'}</div>
              <div class="order-detail">${mapsHtml}</div>
              <div class="order-actions">
                ${status !== 'Delivered' ? `<button class="btn btn-primary btn-sm mark-delivered" data-id="${id}">Mark Delivered</button>` : ''}
                ${status === 'Delivered' ? `<button class="btn btn-outline btn-sm mark-pending" data-id="${id}">Mark Pending</button>` : ''}
              </div>
            </div>`;
        }).join('');

        ordersList.querySelectorAll('.mark-delivered').forEach(btn => {
          btn.addEventListener('click', () => updateStatus(btn.dataset.id, 'Delivered'));
        });
        ordersList.querySelectorAll('.mark-pending').forEach(btn => {
          btn.addEventListener('click', () => updateStatus(btn.dataset.id, 'Pending'));
        });
      }, (err) => {
        ordersList.innerHTML = `<div class="empty-state">Could not load orders: ${err.message}</div>`;
      });
  }

  function updateStatus(id, status) {
    db.collection('orders').doc(id).update({ status }).catch(e => alert('Could not update: ' + e.message));
  }

});
