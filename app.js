// Manaal Water — shared front-end interactions
// Note: this is a front-end prototype only. Nothing here persists data
// to a real database or processes a real payment — see the "Going live"
// guide delivered alongside this site for how to wire up a backend.

document.addEventListener('DOMContentLoaded', () => {

  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', links.classList.contains('open'));
    });
  }

  // Account page tabs (Login / Create account)
  const tabButtons = document.querySelectorAll('.tabbar button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.style.display = 'none');
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).style.display = 'block';
    });
  });

  // Order form — quantity + payment method live summary
  const qtyInput = document.getElementById('qty');
  const unitPrice = 180; // Rs. per 19L bottle refill (from current price list)
  const deliveryFee = 0; // free delivery within service area
  const subtotalEl = document.getElementById('subtotal');
  const totalEl = document.getElementById('total');
  const qtyLabel = document.getElementById('qtyLabel');

  function updateSummary() {
    if (!qtyInput) return;
    const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));
    qtyInput.value = qty;
    const subtotal = qty * unitPrice;
    if (subtotalEl) subtotalEl.textContent = subtotal.toLocaleString() + ' Rs.';
    if (totalEl) totalEl.textContent = (subtotal + deliveryFee).toLocaleString() + ' Rs.';
    if (qtyLabel) qtyLabel.textContent = qty;
  }
  if (qtyInput) {
    qtyInput.addEventListener('input', updateSummary);
    document.querySelectorAll('[data-qty-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.dataset.qtyStep, 10);
        qtyInput.value = Math.max(1, parseInt(qtyInput.value || '1', 10) + step);
        updateSummary();
      });
    });
    updateSummary();
  }

  // Payment method -> show relevant instructions block
  const payRadios = document.querySelectorAll('input[name="payMethod"]');
  const payDetails = document.querySelectorAll('.pay-detail');
  function showPayDetail() {
    const selected = document.querySelector('input[name="payMethod"]:checked');
    payDetails.forEach(d => d.style.display = 'none');
    if (selected) {
      const el = document.getElementById('detail-' + selected.value);
      if (el) el.style.display = 'block';
    }
  }
  payRadios.forEach(r => r.addEventListener('change', showPayDetail));
  showPayDetail();

  // Order form submit (demo only — no backend connected yet)
  const orderForm = document.getElementById('orderForm');
  const orderConfirm = document.getElementById('orderConfirm');
  if (orderForm) {
    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      orderForm.style.display = 'none';
      if (orderConfirm) orderConfirm.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Account form submit (demo only)
  const acctForms = document.querySelectorAll('.demo-form');
  acctForms.forEach(f => {
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const note = f.querySelector('.form-note');
      if (note) note.style.display = 'block';
    });
  });

});
