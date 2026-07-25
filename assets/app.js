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

  // Rising bubbles in hero
  const bubbleField = document.querySelector('.bubbles');
  if (bubbleField) {
    const count = window.innerWidth < 700 ? 10 : 18;
    for (let i = 0; i < count; i++) {
      const b = document.createElement('div');
      b.className = 'bubble';
      const size = 6 + Math.random() * 18;
      b.style.width = size + 'px';
      b.style.height = size + 'px';
      b.style.left = Math.random() * 100 + '%';
      b.style.animationDuration = (6 + Math.random() * 8) + 's';
      b.style.animationDelay = (Math.random() * 8) + 's';
      bubbleField.appendChild(b);
    }
  }

  // Scroll-reveal animations
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in-view'));
  }

  // Animated number counters (e.g. "500+ bottles delivered")
  document.querySelectorAll('[data-count-to]').forEach(el => {
    const target = parseInt(el.dataset.countTo, 10);
    const suffix = el.dataset.suffix || '';
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      const duration = 1200;
      const startTime = performance.now();
      function tick(now) {
        const progress = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target).toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    };
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { run(); obs.unobserve(e.target); } });
      }, { threshold: 0.4 });
      obs.observe(el);
    } else {
      run();
    }
  });

});
