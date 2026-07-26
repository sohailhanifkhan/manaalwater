// Manaal Water — shared front-end interactions

// ---- Live product catalog (reads from the owner's Google Sheet) ----
// Prices, sizes and offers are fully controlled from that Sheet — nothing
// here needs to change when a price or offer changes. Photos are matched
// by product name and kept in /assets since they rarely change.
const PRODUCTS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSIQofz8thc7QhRML9YgtN7X8LxRLDTDbDLZctT3l2ApI-pvECqRExfL3d38w-JFMseQBCXD_d9SGkx/pub?gid=0&single=true&output=csv';

const PRODUCT_PHOTOS = {
  '19 Liter Water Bottle New': 'assets/product-19l-new.jpg',
  '19 Liter Water Bottle Refilling': 'assets/product-19l-refill.jpg',
  '500 ml water bottle pack': 'assets/product-500ml.jpg',
  '1500 ml water bottle pack': 'assets/product-1500ml.jpg'
};
const DEFAULT_PRODUCT_PHOTO = 'assets/bottle.jpg';

// Used only if the live Sheet can't be reached (offline editing, network issue, etc.)
const FALLBACK_PRODUCTS = [
  { name: '19 Liter Water Bottle Refilling', size: '19 L', regular: 220, offer: null, price: 220 },
  { name: '19 Liter Water Bottle New', size: '19 L', regular: 1850, offer: null, price: 1850 },
  { name: '500 ml water bottle pack', size: '0.5 L', regular: 249, offer: null, price: 249 },
  { name: '1500 ml water bottle pack', size: '1.5 L', regular: 249, offer: null, price: 249 }
].map(p => ({ ...p, photo: PRODUCT_PHOTOS[p.name] || DEFAULT_PRODUCT_PHOTO }));

function parseProductsCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1)
    .filter(l => l.trim().length)
    .map(line => {
      const cols = line.split(',');
      const row = {};
      headers.forEach((h, i) => { row[h] = (cols[i] || '').trim(); });
      return row;
    });
}

async function fetchLiveProducts() {
  try {
    const res = await fetch(PRODUCTS_CSV_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Sheet fetch failed: ' + res.status);
    const text = await res.text();
    const rows = parseProductsCSV(text);
    const products = rows
      .filter(r => r['Product Name'])
      .map(r => {
        const regular = parseFloat(r['Regular Price']) || 0;
        const offerActive = (r['Offer Active (Yes/No)'] || '').trim().toLowerCase().startsWith('y');
        const offerRaw = parseFloat(r['Offer Price']);
        const offer = (offerActive && !isNaN(offerRaw) && offerRaw > 0) ? offerRaw : null;
        return {
          name: r['Product Name'],
          size: r['Size'],
          regular,
          offer,
          price: offer || regular,
          photo: PRODUCT_PHOTOS[r['Product Name']] || DEFAULT_PRODUCT_PHOTO
        };
      });
    return products.length ? products : FALLBACK_PRODUCTS;
  } catch (e) {
    console.warn('Could not load live prices, using last known prices instead.', e);
    return FALLBACK_PRODUCTS;
  }
}

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

  // Order form — product picker + quantity + payment method live summary
  const productGrid = document.getElementById('productGrid');
  const qtyInput = document.getElementById('qty');
  const deliveryFee = 0; // free delivery within service area
  const subtotalEl = document.getElementById('subtotal');
  const totalEl = document.getElementById('total');
  const qtyLabel = document.getElementById('qtyLabel');
  const summaryProductName = document.getElementById('summaryProductName');
  const selectedProductLabel = document.getElementById('selectedProductLabel');
  const unitPriceLabel = document.getElementById('unitPriceLabel');

  let liveProducts = [];
  let selectedProductIndex = 0;

  function currentProduct() {
    return liveProducts[selectedProductIndex] || null;
  }

  function updateSummary() {
    if (!qtyInput) return;
    const product = currentProduct();
    if (!product) return;
    const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));
    qtyInput.value = qty;
    const subtotal = qty * product.price;
    if (subtotalEl) subtotalEl.textContent = subtotal.toLocaleString() + ' Rs.';
    if (totalEl) totalEl.textContent = (subtotal + deliveryFee).toLocaleString() + ' Rs.';
    if (qtyLabel) qtyLabel.textContent = qty;
    if (summaryProductName) summaryProductName.textContent = `${product.name} (${product.size})`;
    if (selectedProductLabel) selectedProductLabel.textContent = `— ${product.name}`;
    if (unitPriceLabel) unitPriceLabel.textContent = `× Rs. ${product.price.toLocaleString()} each`;
  }

  function renderProductGrid() {
    if (!productGrid) return;
    productGrid.innerHTML = liveProducts.map((p, i) => {
      const priceHtml = p.offer
        ? `<span class="strike">Rs. ${p.regular.toLocaleString()}</span>Rs. ${p.offer.toLocaleString()}<span class="offer-tag">OFFER</span>`
        : `Rs. ${p.price.toLocaleString()}`;
      return `
        <label class="product-option">
          <input type="radio" name="productChoice" value="${i}" ${i === selectedProductIndex ? 'checked' : ''}>
          <img src="${p.photo}" alt="${p.name}">
          <div class="p-info">
            <strong>${p.name}</strong>
            <span class="p-size">${p.size}</span>
          </div>
          <div class="p-price">${priceHtml}</div>
        </label>`;
    }).join('');

    productGrid.querySelectorAll('input[name="productChoice"]').forEach(input => {
      input.addEventListener('change', (e) => {
        selectedProductIndex = parseInt(e.target.value, 10);
        updateSummary();
      });
    });
  }

  if (productGrid) {
    fetchLiveProducts().then(products => {
      liveProducts = products;
      // Default to the first "Refilling" product if one exists — that's the everyday reorder item
      const refillIndex = products.findIndex(p => /refill/i.test(p.name));
      selectedProductIndex = refillIndex >= 0 ? refillIndex : 0;
      renderProductGrid();
      updateSummary();
    });
  }

  // Homepage — live product cards (independent of the order page)
  const homeProductGrid = document.getElementById('homeProductGrid');
  const heroRefillPrice = document.getElementById('heroRefillPrice');
  if (homeProductGrid || heroRefillPrice) {
    fetchLiveProducts().then(products => {
      if (homeProductGrid) {
        homeProductGrid.innerHTML = products.map(p => {
          const priceHtml = p.offer
            ? `<span class="strike">Rs. ${p.regular.toLocaleString()}</span><span class="price">Rs. ${p.offer.toLocaleString()}</span><span class="offer-tag">OFFER</span>`
            : `<span class="price">Rs. ${p.price.toLocaleString()}</span>`;
          return `
            <div class="card home-product-card">
              <img src="${p.photo}" alt="${p.name}">
              <h3>${p.name}</h3>
              <span class="p-size-tag">${p.size}</span>
              <div class="price-row">${priceHtml}</div>
              <a href="order.html" class="btn btn-outline btn-block mt-lg">Order this</a>
            </div>`;
        }).join('');
      }
      if (heroRefillPrice) {
        const refill = products.find(p => /refill/i.test(p.name)) || products[0];
        if (refill) heroRefillPrice.textContent = `Rs. ${refill.price.toLocaleString()}`;
      }
    });
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

  // Order form submit — builds the order into a WhatsApp message
  // with the customer's live location, then opens WhatsApp to send it.
  const OWNER_WHATSAPP = '923448845274';
  const orderForm = document.getElementById('orderForm');
  const orderConfirm = document.getElementById('orderConfirm');
  const placeOrderBtn = document.getElementById('placeOrderBtn');

  function buildOrderMessage(mapsLink) {
    const name = document.getElementById('name')?.value.trim() || '-';
    const phone = document.getElementById('phone')?.value.trim() || '-';
    const address = document.getElementById('address')?.value.trim() || '-';
    const area = document.getElementById('area')?.value || '-';
    const qty = document.getElementById('qty')?.value || '1';
    const total = document.getElementById('total')?.textContent || '-';
    const product = currentProduct();
    const productLabel = product ? `${product.name} (${product.size})` : 'Manaal Water bottle';
    const payMethod = document.querySelector('input[name="payMethod"]:checked');
    const payLabel = payMethod ? payMethod.closest('.pay-option').querySelector('strong').textContent : '-';

    let msg = `*New Order — Manaal Water* 💧\n\n`;
    msg += `*Name:* ${name}\n`;
    msg += `*Phone:* ${phone}\n`;
    msg += `*Address:* ${address}\n`;
    msg += `*Area:* ${area}\n`;
    msg += `*Product:* ${productLabel}\n`;
    msg += `*Quantity:* ${qty}\n`;
    msg += `*Total:* ${total}\n`;
    msg += `*Payment Method:* ${payLabel}\n`;
    if (mapsLink) {
      msg += `*Live Location:* ${mapsLink}\n`;
    } else {
      msg += `*Live Location:* Not shared — please deliver to the address above\n`;
    }
    return msg;
  }

  function sendToWhatsApp(mapsLink) {
    const message = buildOrderMessage(mapsLink);
    const url = `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    orderForm.style.display = 'none';
    if (orderConfirm) orderConfirm.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (placeOrderBtn) {
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = 'Place Order';
    }
  }

  if (orderForm) {
    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (placeOrderBtn) {
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = 'Getting your location…';
      }
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const mapsLink = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
            sendToWhatsApp(mapsLink);
          },
          () => {
            // Location denied or unavailable — still send the order using the typed address
            sendToWhatsApp(null);
          },
          { timeout: 6000 }
        );
      } else {
        sendToWhatsApp(null);
      }
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
