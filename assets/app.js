// Manaal Water — shared front-end interactions

// Register the service worker so the site can be installed as an app
// ("Add to Home Screen"). Safe no-op if the browser doesn't support it.
if ('serviceWorker' in navigator) {

  window.addEventListener(
    'load',
    async () => {

      try {

        const registration =
          await navigator.serviceWorker.register(
            'service-worker.js'
          );

        // Check for a newer service worker
        // whenever the website is opened.
        registration.update();

      } catch (e) {

        console.warn(
          'Service worker registration failed',
          e
        );

      }

    }
  );

}


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
].map(p => ({
  ...p,
  photo: PRODUCT_PHOTOS[p.name] || DEFAULT_PRODUCT_PHOTO
}));


function parseProductsCSV(text) {

  const lines =
    text.trim().split(/\r?\n/);

  const headers =
    lines[0]
      .split(',')
      .map(h => h.trim());


  return lines
    .slice(1)
    .filter(l => l.trim().length)
    .map(line => {

      const cols =
        line.split(',');

      const row = {};

      headers.forEach(
        (h, i) => {
          row[h] =
            (cols[i] || '').trim();
        }
      );

      return row;

    });

}


async function fetchLiveProducts() {

  try {

    const res =
      await fetch(
        PRODUCTS_CSV_URL,
        { cache: 'no-store' }
      );


    if (!res.ok) {

      throw new Error(
        'Sheet fetch failed: ' +
        res.status
      );

    }


    const text =
      await res.text();


    const rows =
      parseProductsCSV(text);


    const products =
      rows
        .filter(
          r => r['Product Name']
        )
        .map(r => {

          const regular =
            parseFloat(
              r['Regular Price']
            ) || 0;


          const offerActive =
            (
              r['Offer Active (Yes/No)'] || ''
            )
              .trim()
              .toLowerCase()
              .startsWith('y');


          const offerRaw =
            parseFloat(
              r['Offer Price']
            );


          const offer =
            (
              offerActive &&
              !isNaN(offerRaw) &&
              offerRaw > 0
            )
              ? offerRaw
              : null;


          return {

            name:
              r['Product Name'],

            size:
              r['Size'],

            regular,

            offer,

            price:
              offer || regular,

            photo:
              PRODUCT_PHOTOS[
                r['Product Name']
              ] || DEFAULT_PRODUCT_PHOTO

          };

        });


    return products.length
      ? products
      : FALLBACK_PRODUCTS;


  } catch (e) {

    console.warn(
      'Could not load live prices, using last known prices instead.',
      e
    );

    return FALLBACK_PRODUCTS;

  }

}



document.addEventListener(
  'DOMContentLoaded',
  () => {


    // --------------------------------------------------
    // HERO VIDEO
    // --------------------------------------------------

    const heroVideo =
      document.getElementById(
        'heroVideo'
      );

    const heroMuteToggle =
      document.getElementById(
        'heroMuteToggle'
      );


    if (
      heroVideo &&
      heroMuteToggle
    ) {

      heroMuteToggle
        .addEventListener(
          'click',
          () => {

            heroVideo.muted =
              !heroVideo.muted;


            heroMuteToggle.textContent =
              heroVideo.muted
                ? '🔇'
                : '🔊';


            if (!heroVideo.muted) {

              heroVideo
                .play()
                .catch(() => {});

            }

          }
        );

    }



    // --------------------------------------------------
    // MOBILE NAVIGATION
    // --------------------------------------------------

    const toggle =
      document.querySelector(
        '.nav-toggle'
      );

    const links =
      document.querySelector(
        '.nav-links'
      );


    if (
      toggle &&
      links
    ) {

      toggle.addEventListener(
        'click',
        () => {

          links.classList.toggle(
            'open'
          );


          toggle.setAttribute(
            'aria-expanded',
            links.classList.contains(
              'open'
            )
          );

        }
      );

    }



    // --------------------------------------------------
    // ACCOUNT PAGE TABS
    // --------------------------------------------------

    const tabButtons =
      document.querySelectorAll(
        '.tabbar button'
      );

    const tabPanels =
      document.querySelectorAll(
        '.tab-panel'
      );


    tabButtons.forEach(
      btn => {

        btn.addEventListener(
          'click',
          () => {

            tabButtons.forEach(
              b =>
                b.classList.remove(
                  'active'
                )
            );


            tabPanels.forEach(
              p =>
                p.style.display =
                  'none'
            );


            btn.classList.add(
              'active'
            );


            const panel =
              document.getElementById(
                btn.dataset.tab
              );


            if (panel) {

              panel.style.display =
                'block';

            }

          }
        );

      }
    );



    // --------------------------------------------------
    // AUTO-FILL LOGGED-IN CUSTOMER DETAILS
    // --------------------------------------------------

    try {

      const nameField =
        document.getElementById(
          'name'
        );


      if (
        nameField &&
        typeof auth !== 'undefined'
      ) {

        auth.onAuthStateChanged(
          async (user) => {

            if (!user) return;


            try {

              const doc =
                await db
                  .collection(
                    'customers'
                  )
                  .doc(user.uid)
                  .get();


              if (doc.exists) {

                const d =
                  doc.data();


                const phoneField =
                  document.getElementById(
                    'phone'
                  );


                const addressField =
                  document.getElementById(
                    'address'
                  );


                if (
                  nameField &&
                  !nameField.value
                ) {

                  nameField.value =
                    d.name || '';

                }


                if (
                  phoneField &&
                  !phoneField.value
                ) {

                  phoneField.value =
                    d.phone || '';

                }


                if (
                  addressField &&
                  !addressField.value
                ) {

                  addressField.value =
                    d.address || '';

                }

              }

            } catch (e) {

              console.warn(
                'Could not auto-fill from saved profile',
                e
              );

            }

          }
        );

      }

    } catch (e) {

      console.warn(
        'Account auto-fill unavailable (Firebase did not load):',
        e
      );

    }



    // --------------------------------------------------
    // ORDER FORM
    // --------------------------------------------------

    // --------------------------------------------------
// DELIVERY SCHEDULING
// --------------------------------------------------

const deliveryDateField =
  document.getElementById(
    'deliveryDate'
  );


const deliveryTimeField =
  document.getElementById(
    'deliveryTime'
  );


const deliveryInstructionsField =
  document.getElementById(
    'deliveryInstructions'
  );


function getPakistanDateInfo() {

  const formatter =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hourCycle: 'h23'
      }
    );


  const parts =
    formatter.formatToParts(
      new Date()
    );


  const values = {};


  parts.forEach(
    part => {

      if (
        part.type !== 'literal'
      ) {

        values[part.type] =
          part.value;

      }

    }
  );


  return {

    year:
      Number(values.year),

    month:
      Number(values.month),

    day:
      Number(values.day),

    hour:
      Number(values.hour)

  };

}


function formatDateForInput(
  year,
  month,
  day
) {

  return (
    String(year)
      .padStart(4, '0') +
    '-' +
    String(month)
      .padStart(2, '0') +
    '-' +
    String(day)
      .padStart(2, '0')
  );

}


function getEarliestDeliveryDate() {

  const pakistan =
    getPakistanDateInfo();


  /*
    Create the calendar date in UTC only
    for safe date arithmetic.
  */

  const date =
    new Date(
      Date.UTC(
        pakistan.year,
        pakistan.month - 1,
        pakistan.day
      )
    );


  /*
    Same-day delivery cutoff:
    after 3 PM Pakistan time,
    start from tomorrow.
  */

  if (
    pakistan.hour >= 15
  ) {

    date.setUTCDate(
      date.getUTCDate() + 1
    );

  }


  return formatDateForInput(

    date.getUTCFullYear(),

    date.getUTCMonth() + 1,

    date.getUTCDate()

  );

}


if (
  deliveryDateField
) {

  const earliestDate =
    getEarliestDeliveryDate();


  deliveryDateField.min =
    earliestDate;


  if (
    !deliveryDateField.value
  ) {

    deliveryDateField.value =
      earliestDate;

  }

}
    const productGrid =
      document.getElementById(
        'productGrid'
      );


    const deliveryFee =
      0;


    const totalEl =
      document.getElementById(
        'total'
      );


    const summaryItemsEl =
      document.getElementById(
        'summaryItems'
      );


    const discountRow =
      document.getElementById(
        'discountRow'
      );


    const discountAmountEl =
      document.getElementById(
        'discountAmount'
      );


    const discountLabelEl =
      document.getElementById(
        'discountLabel'
      );


    let liveProducts = [];

    let cartQty = [];


    const PROMO_CODES = {
      'FRESH10': 10
    };


    let appliedPromo = null;



    function cartLines() {

      return liveProducts

        .map(
          (p, i) => ({
            product: p,
            qty: cartQty[i] || 0
          })
        )

        .filter(
          line =>
            line.qty > 0
        );

    }



    function cartSubtotal() {

      return cartLines()
        .reduce(
          (
            sum,
            { product, qty }
          ) =>
            sum +
            product.price * qty,
          0
        );

    }



    function updateSummary() {

      if (!summaryItemsEl) return;


      const lines =
        cartLines();


      if (!lines.length) {

        summaryItemsEl.innerHTML =
          '<p style="font-size:.85rem; color:var(--ink-soft); margin:0;">No items added yet.</p>';


        if (totalEl) {

          totalEl.textContent =
            'Rs. 0';

        }


        if (discountRow) {

          discountRow.style.display =
            'none';

        }


        return;

      }


      let subtotal = 0;


      summaryItemsEl.innerHTML =
        lines
          .map(
            ({ product, qty }) => {

              const lineTotal =
                product.price * qty;


              subtotal +=
                lineTotal;


              return `
                <div class="summary-row">
                  <span>
                    ${qty} × ${product.name} (${product.size})
                  </span>
                  <span>
                    Rs. ${lineTotal.toLocaleString()}
                  </span>
                </div>
              `;

            }
          )
          .join('');


      let discountValue =
        0;


      if (appliedPromo) {

        discountValue =
          Math.round(
            subtotal *
            (
              appliedPromo.percent /
              100
            )
          );


        if (
          discountRow &&
          discountAmountEl &&
          discountLabelEl
        ) {

          discountLabelEl.textContent =
            appliedPromo.code;


          discountAmountEl.textContent =
            '− Rs. ' +
            discountValue.toLocaleString();


          discountRow.style.display =
            'flex';

        }

      } else if (
        discountRow
      ) {

        discountRow.style.display =
          'none';

      }


      const grandTotal =
        subtotal +
        deliveryFee -
        discountValue;


      if (totalEl) {

        totalEl.textContent =
          'Rs. ' +
          grandTotal.toLocaleString();

      }

    }



    // --------------------------------------------------
    // PROMO CODE
    // --------------------------------------------------

    const promoInput =
      document.getElementById(
        'promoCode'
      );


    const applyPromoBtn =
      document.getElementById(
        'applyPromoBtn'
      );


    const promoMessage =
      document.getElementById(
        'promoMessage'
      );


    if (applyPromoBtn) {

      applyPromoBtn.addEventListener(
        'click',
        () => {

          const code =
            (
              promoInput.value || ''
            )
              .trim()
              .toUpperCase();


          if (!code) {

            promoMessage.textContent =
              '';

            return;

          }


          if (
            PROMO_CODES[code]
          ) {

            appliedPromo = {

              code,

              percent:
                PROMO_CODES[code]

            };


            promoMessage.textContent =
              `✓ ${PROMO_CODES[code]}% discount applied!`;


            promoMessage.style.color =
              '#0a8a76';

          } else {

            appliedPromo =
              null;


            promoMessage.textContent =
              'That code isn\'t valid.';


            promoMessage.style.color =
              '#a33';

          }


          updateSummary();

        }
      );

    }



    // --------------------------------------------------
    // PRODUCT GRID
    // --------------------------------------------------

    function renderProductGrid() {

      if (!productGrid) return;


      productGrid.innerHTML =
        liveProducts
          .map(
            (p, i) => {

              const priceHtml =
                p.offer

                  ? `
                    <span class="strike">
                      Rs. ${p.regular.toLocaleString()}
                    </span>
                    Rs. ${p.offer.toLocaleString()}
                    <span class="offer-tag">
                      OFFER
                    </span>
                  `

                  : `
                    Rs. ${p.price.toLocaleString()}
                  `;


              const qty =
                cartQty[i] || 0;


              return `

                <div
                  class="product-option${qty > 0 ? ' has-qty' : ''}"
                  data-index="${i}"
                >

                  <img
                    src="${p.photo}"
                    alt="${p.name}"
                  >

                  <div class="p-info">

                    <strong>
                      ${p.name}
                    </strong>

                    <span class="p-size">
                      ${p.size}
                    </span>

                  </div>


                  <div class="p-right">

                    <div class="p-price">
                      ${priceHtml}
                    </div>


                    <div class="cart-stepper">

                      <button
                        type="button"
                        class="cart-step"
                        data-index="${i}"
                        data-step="-1"
                        aria-label="Remove one">
                        −
                      </button>


                      <span
                        class="cart-qty"
                        data-index="${i}">
                        ${qty}
                      </span>


                      <button
                        type="button"
                        class="cart-step"
                        data-index="${i}"
                        data-step="1"
                        aria-label="Add one">
                        +
                      </button>

                    </div>

                  </div>

                </div>

              `;

            }
          )
          .join('');


      productGrid
        .querySelectorAll(
          '.cart-step'
        )
        .forEach(
          btn => {

            btn.addEventListener(
              'click',
              () => {

                const i =
                  parseInt(
                    btn.dataset.index,
                    10
                  );


                const step =
                  parseInt(
                    btn.dataset.step,
                    10
                  );


                cartQty[i] =
                  Math.max(
                    0,
                    (
                      cartQty[i] || 0
                    ) + step
                  );


                renderProductGrid();

                updateSummary();

              }
            );

          }
        );

    }



    // --------------------------------------------------
    // LOAD PRODUCTS + RESTORE REORDER + SAVED ADDRESS
    // --------------------------------------------------

    if (productGrid) {

      fetchLiveProducts()
        .then(
          products => {


            liveProducts =
              products;


            cartQty =
              new Array(
                products.length
              )
                .fill(0);


            let restoredReorder =
              false;



            // ------------------------------------------
            // RESTORE PREVIOUS ORDER
            // ------------------------------------------

            try {

              const reorderRaw =
                localStorage.getItem(
                  'manaalReorder'
                );


              if (reorderRaw) {

                const reorderData =
                  JSON.parse(
                    reorderRaw
                  );


                if (
                  reorderData &&
                  Array.isArray(
                    reorderData.items
                  )
                ) {

                  reorderData.items
                    .forEach(
                      savedItem => {


                        const savedName =
                          String(
                            savedItem.name ||
                            ''
                          )
                            .toLowerCase();


                        const productIndex =
                          products.findIndex(
                            product =>

                              savedName.startsWith(
                                String(
                                  product.name ||
                                  ''
                                )
                                  .toLowerCase()
                              )

                          );


                        if (
                          productIndex >= 0
                        ) {

                          cartQty[
                            productIndex
                          ] =
                            Math.max(
                              0,
                              Number(
                                savedItem.qty
                              ) || 0
                            );


                          restoredReorder =
                            true;

                        }

                      }
                    );

                }


                const areaField =
                  document.getElementById(
                    'area'
                  );


                if (
                  areaField &&
                  reorderData.area
                ) {

                  areaField.value =
                    reorderData.area;

                }


                const deliveryTimeField =
  document.getElementById(
    'deliveryTime'
  );


if (
  deliveryTimeField &&
  reorderData.deliveryTime
) {

  deliveryTimeField.value =
    reorderData.deliveryTime;

}


const deliveryInstructionsField =
  document.getElementById(
    'deliveryInstructions'
  );


if (
  deliveryInstructionsField &&
  reorderData.deliveryInstructions
) {

  deliveryInstructionsField.value =
    reorderData.deliveryInstructions;

}
              }

            } catch (e) {

              console.warn(
                'Could not restore previous order',
                e
              );

            }



            // ------------------------------------------
            // STEP 9H
            // RESTORE SAVED DELIVERY ADDRESS
            // ------------------------------------------

            try {

              const savedAddressRaw =
                localStorage.getItem(
                  'manaalSelectedAddress'
                );


              if (
                savedAddressRaw
              ) {

                const savedAddress =
                  JSON.parse(
                    savedAddressRaw
                  );


                const addressField =
                  document.getElementById(
                    'address'
                  );


                const areaField =
                  document.getElementById(
                    'area'
                  );


                if (
                  addressField &&
                  savedAddress.address
                ) {

                  addressField.value =
                    savedAddress.address;

                }


                if (
                  areaField &&
                  savedAddress.area
                ) {

                  areaField.value =
                    savedAddress.area;

                }


                localStorage.removeItem(
                  'manaalSelectedAddress'
                );

              }

            } catch (e) {

              console.warn(
                'Could not restore saved address',
                e
              );

            }



            // ------------------------------------------
            // NORMAL CHECKOUT DEFAULT
            // ------------------------------------------

            if (
              !restoredReorder
            ) {

              const refillIndex =
                products.findIndex(
                  p =>
                    /refill/i.test(
                      p.name
                    )
                );


              cartQty[
                refillIndex >= 0
                  ? refillIndex
                  : 0
              ] = 1;

            }


            renderProductGrid();

            updateSummary();


          }
        );

    }



    // --------------------------------------------------
    // HOMEPAGE LIVE PRODUCT CARDS
    // --------------------------------------------------

    const homeProductGrid =
      document.getElementById(
        'homeProductGrid'
      );


    const heroRefillPrice =
      document.getElementById(
        'heroRefillPrice'
      );


    if (
      homeProductGrid ||
      heroRefillPrice
    ) {

      fetchLiveProducts()
        .then(
          products => {


            if (
              homeProductGrid
            ) {

              return `

  <article class="home-product-card modern-product-card">

    <div class="product-image-zone">

      ${
        p.offer
          ? `
            <span class="product-offer-badge">
              SPECIAL OFFER
            </span>
          `
          : `
            <span class="product-clean-badge">
              MANAAL WATER
            </span>
          `
      }


      <img
        src="${p.photo}"
        alt="${p.name}"
      >


      <div class="product-image-glow"></div>

    </div>


    <div class="product-card-body">


      <div class="product-card-heading">

        <div>

          <span class="product-size-pill">
            ${p.size}
          </span>

          <h3>
            ${p.name}
          </h3>

        </div>

      </div>


      <div class="modern-price-row">

        <div>

          <span class="price-caption">
            Today's price
          </span>

          <div class="price-row">
            ${priceHtml}
          </div>

        </div>


        <span class="product-availability">
          ● Available
        </span>

      </div>


      <div class="product-card-benefits">

        <span>
          ✓ Fresh
        </span>

        <span>
          ✓ Sealed
        </span>

        <span>
          ✓ Delivered
        </span>

      </div>


      <a
        href="order.html"
        class="btn btn-primary btn-block product-order-button"
      >
        Order Now →

      </a>


    </div>

  </article>

`;
            }


            if (
              heroRefillPrice
            ) {

              const refill =
                products.find(
                  p =>
                    /refill/i.test(
                      p.name
                    )
                ) ||
                products[0];


              if (refill) {

                heroRefillPrice.textContent =
                  `Rs. ${refill.price.toLocaleString()}`;

              }

            }

          }
        );

    }



    // --------------------------------------------------
    // PAYMENT METHOD DETAILS
    // --------------------------------------------------

    const payRadios =
      document.querySelectorAll(
        'input[name="payMethod"]'
      );


    const payDetails =
      document.querySelectorAll(
        '.pay-detail'
      );


    function showPayDetail() {

      const selected =
        document.querySelector(
          'input[name="payMethod"]:checked'
        );


      payDetails.forEach(
        d =>
          d.style.display =
            'none'
      );


      if (selected) {

        const el =
          document.getElementById(
            'detail-' +
            selected.value
          );


        if (el) {

          el.style.display =
            'block';

        }

      }

    }


    payRadios.forEach(
      r =>
        r.addEventListener(
          'change',
          showPayDetail
        )
    );


    showPayDetail();



    // --------------------------------------------------
    // ORDER FORM + WHATSAPP
    // --------------------------------------------------

    const OWNER_WHATSAPP =
      '923448845274';


    const orderForm =
      document.getElementById(
        'orderForm'
      );


    const orderConfirm =
      document.getElementById(
        'orderConfirm'
      );


    const placeOrderBtn =
      document.getElementById(
        'placeOrderBtn'
      );



    function buildOrderMessage(
      mapsLink,
      orderNumber
    ) {

      const name =
        document.getElementById(
          'name'
        )?.value.trim() || '-';


      const phone =
        document.getElementById(
          'phone'
        )?.value.trim() || '-';


      const address =
        document.getElementById(
          'address'
        )?.value.trim() || '-';


      const area =
        document.getElementById(
          'area'
        )?.value || '-';
      const deliveryDate =
  document.getElementById(
    'deliveryDate'
  )?.value || '-';


const deliveryTime =
  document.getElementById(
    'deliveryTime'
  )?.value || '-';


const deliveryInstructions =
  document.getElementById(
    'deliveryInstructions'
  )?.value.trim() || 'None';


      const total =
        document.getElementById(
          'total'
        )?.textContent || '-';


      const lines =
        cartLines();


      const itemsText =
        lines.length

          ? lines
              .map(
                (
                  { product, qty }
                ) =>
                  `  • ${qty} × ${product.name} (${product.size}) — Rs. ${(product.price * qty).toLocaleString()}`
              )
              .join('\n')

          : '  • (no items selected)';


      const payMethod =
        document.querySelector(
          'input[name="payMethod"]:checked'
        );


      const payLabel =
        payMethod

          ? payMethod
              .closest(
                '.pay-option'
              )
              .querySelector(
                'strong'
              )
              .textContent

          : '-';



      let msg =
        `*MANAAL WATER — NEW ORDER* 💧\n\n`;


      msg +=
        `*Order No:* ${orderNumber}\n\n`;


      msg +=
        `*Name:* ${name}\n`;


      msg +=
        `*Phone:* ${phone}\n`;


      msg +=
        `*Address:* ${address}\n`;


      msg +=
        `*Area:* ${area}\n`;
      msg +=
  `*Preferred Delivery Date:* ${deliveryDate}\n`;


msg +=
  `*Preferred Delivery Time:* ${deliveryTime}\n`;


msg +=
  `*Delivery Instructions:* ${deliveryInstructions}\n`;


      msg +=
        `*Items:*\n${itemsText}\n`;


      if (
        appliedPromo
      ) {

        msg +=
          `*Promo Code:* ${appliedPromo.code} (${appliedPromo.percent}% off)\n`;

      }


      msg +=
        `*Total:* ${total}\n`;


      msg +=
        `*Payment Method:* ${payLabel}\n`;


      if (
        mapsLink
      ) {

        msg +=
          `*Live Location:* ${mapsLink}\n`;

      } else {

        msg +=
          `*Live Location:* Not shared — please deliver to the address above\n`;

      }


      return msg;

    }



    function saveOrderToFirestore(
      mapsLink,
      orderNumber
    ) {

      // Best-effort save — WhatsApp ordering
      // should still work if Firebase is unavailable.

      if (
        typeof db ===
        'undefined'
      ) return;


      try {

        const lines =
          cartLines();


        const subtotalAmount =
          lines.reduce(
            (
              sum,
              { product, qty }
            ) =>
              sum +
              (
                product.price *
                qty
              ),
            0
          );


        const discountPercent =
          appliedPromo
            ? appliedPromo.percent
            : 0;


        const discountAmount =
          Math.round(
            (
              subtotalAmount *
              discountPercent /
              100
            ) *
            100
          ) / 100;


        const deliveryFee =
          0;


        const totalAmount =
          Math.max(
            0,
            subtotalAmount -
            discountAmount +
            deliveryFee
          );


        db.collection(
          'orders'
        )
          .add({

            orderNumber:
              orderNumber,


            uid:
              (
                typeof auth !==
                  'undefined' &&
                auth.currentUser
              )
                ? auth.currentUser.uid
                : null,


            name:
              document
                .getElementById(
                  'name'
                )
                ?.value
                .trim() || '',


            phone:
              document
                .getElementById(
                  'phone'
                )
                ?.value
                .trim() || '',


            address:
              document
                .getElementById(
                  'address'
                )
                ?.value
                .trim() || '',


            area:
              document
                .getElementById(
                  'area'
                )
                ?.value || '',
            deliveryDate:
  document.getElementById(
    'deliveryDate'
  )?.value || '',


deliveryTime:
  document.getElementById(
    'deliveryTime'
  )?.value || '',


deliveryInstructions:
  document.getElementById(
    'deliveryInstructions'
  )?.value.trim() || '',


            items:
              lines.map(
                (
                  {
                    product,
                    qty
                  }
                ) => ({

                  name:
                    `${product.name} (${product.size})`,

                  qty,

                  unitPrice:
                    product.price,

                  lineTotal:
                    product.price *
                    qty

                })
              ),


            total:
              document
                .getElementById(
                  'total'
                )
                ?.textContent || '',


            subtotalAmount:
              subtotalAmount,


            discountAmount:
              discountAmount,


            deliveryFee:
              deliveryFee,


            totalAmount:
              totalAmount,


            promoCode:
              appliedPromo
                ? appliedPromo.code
                : null,


            discountPercent:
              discountPercent,


            payMethod:
              (
                document.querySelector(
                  'input[name="payMethod"]:checked'
                )
                  ?.closest(
                    '.pay-option'
                  )
                  ?.querySelector(
                    'strong'
                  )
                  ?.textContent
              ) || '',


            mapsLink:
              mapsLink || null,


            status:
              'Pending',


            createdAt:
              firebase
                .firestore
                .FieldValue
                .serverTimestamp()

          })
          .catch(
            e =>
              console.warn(
                'Order save to Firestore failed (WhatsApp order still sent):',
                e
              )
          );


      } catch (e) {

        console.warn(
          'Order save to Firestore failed (WhatsApp order still sent):',
          e
        );

      }

    }



    function sendToWhatsApp(
      mapsLink
    ) {

      const now =
        new Date();


      const pad2 =
        n =>
          String(n)
            .padStart(
              2,
              '0'
            );


      const orderNumber =
        'MW-' +

        String(
          now.getFullYear()
        )
          .slice(-2) +

        pad2(
          now.getMonth() + 1
        ) +

        pad2(
          now.getDate()
        ) +

        '-' +

        pad2(
          now.getHours()
        ) +

        pad2(
          now.getMinutes()
        ) +

        pad2(
          now.getSeconds()
        );


      saveOrderToFirestore(
        mapsLink,
        orderNumber
      );


      const message =
        buildOrderMessage(
          mapsLink,
          orderNumber
        );


      const url =
        `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(message)}`;


      window.location.href =
        url;


      if (orderForm) {

        orderForm.style.display =
          'none';

      }


      if (
        orderConfirm
      ) {

        orderConfirm.style.display =
          'block';

      }


      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });


      if (
        placeOrderBtn
      ) {

        placeOrderBtn.disabled =
          false;


        placeOrderBtn.textContent =
          'Place Order';

      }

    }



    if (
      orderForm
    ) {

      orderForm.addEventListener(
        'submit',
        e => {

          e.preventDefault();


          if (
            cartLines().length ===
            0
          ) {

            alert(
              'Please add at least one item using the + button before placing your order.'
            );

            return;

          }


          if (
            placeOrderBtn
          ) {

            placeOrderBtn.disabled =
              true;


            placeOrderBtn.textContent =
              'Getting your location…';

          }


          if (
            'geolocation' in
            navigator
          ) {

            navigator.geolocation
              .getCurrentPosition(

                pos => {

                  const mapsLink =
                    `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;


                  sendToWhatsApp(
                    mapsLink
                  );

                },


                () => {

                  sendToWhatsApp(
                    null
                  );

                },


                {
                  timeout: 6000
                }

              );

          } else {

            sendToWhatsApp(
              null
            );

          }

        }
      );

    }



    // --------------------------------------------------
    // ACCOUNT DEMO FORM SUPPORT
    // --------------------------------------------------

    const acctForms =
      document.querySelectorAll(
        '.demo-form'
      );


    acctForms.forEach(
      f => {

        f.addEventListener(
          'submit',
          e => {

            e.preventDefault();


            const note =
              f.querySelector(
                '.form-note'
              );


            if (note) {

              note.style.display =
                'block';

            }

          }
        );

      }
    );



    // --------------------------------------------------
    // HERO BUBBLES
    // --------------------------------------------------

    const bubbleField =
      document.querySelector(
        '.bubbles'
      );


    if (
      bubbleField
    ) {

      const count =
        window.innerWidth < 700
          ? 10
          : 18;


      for (
        let i = 0;
        i < count;
        i++
      ) {

        const b =
          document.createElement(
            'div'
          );


        b.className =
          'bubble';


        const size =
          6 +
          Math.random() *
          18;


        b.style.width =
          size + 'px';


        b.style.height =
          size + 'px';


        b.style.left =
          Math.random() *
          100 +
          '%';


        b.style.animationDuration =
          (
            6 +
            Math.random() *
            8
          ) +
          's';


        b.style.animationDelay =
          (
            Math.random() *
            8
          ) +
          's';


        bubbleField.appendChild(
          b
        );

      }

    }



    // --------------------------------------------------
    // SCROLL REVEAL
    // --------------------------------------------------

    const revealEls =
      document.querySelectorAll(
        '.reveal'
      );


    if (
      'IntersectionObserver'
        in window &&
      revealEls.length
    ) {

      const io =
        new IntersectionObserver(
          entries => {

            entries.forEach(
              entry => {

                if (
                  entry.isIntersecting
                ) {

                  entry.target
                    .classList
                    .add(
                      'in-view'
                    );


                  io.unobserve(
                    entry.target
                  );

                }

              }
            );

          },
          {
            threshold: 0.15
          }
        );


      revealEls.forEach(
        el =>
          io.observe(
            el
          )
      );


    } else {

      revealEls.forEach(
        el =>
          el.classList.add(
            'in-view'
          )
      );

    }



    // --------------------------------------------------
    // ANIMATED COUNTERS
    // --------------------------------------------------

    document
      .querySelectorAll(
        '[data-count-to]'
      )
      .forEach(
        el => {

          const target =
            parseInt(
              el.dataset.countTo,
              10
            );


          const suffix =
            el.dataset.suffix ||
            '';


          let started =
            false;


          const run =
            () => {

              if (started) return;


              started =
                true;


              const duration =
                1200;


              const startTime =
                performance.now();


              function tick(now) {

                const progress =
                  Math.min(
                    1,
                    (
                      now -
                      startTime
                    ) /
                    duration
                  );


                const eased =
                  1 -
                  Math.pow(
                    1 -
                    progress,
                    3
                  );


                el.textContent =
                  Math.round(
                    eased *
                    target
                  )
                    .toLocaleString() +
                  suffix;


                if (
                  progress < 1
                ) {

                  requestAnimationFrame(
                    tick
                  );

                }

              }


              requestAnimationFrame(
                tick
              );

            };


          if (
            'IntersectionObserver'
              in window
          ) {

            const obs =
              new IntersectionObserver(
                entries => {

                  entries.forEach(
                    e => {

                      if (
                        e.isIntersecting
                      ) {

                        run();

                        obs.unobserve(
                          e.target
                        );

                      }

                    }
                  );

                },
                {
                  threshold: 0.4
                }
              );


            obs.observe(
              el
            );


          } else {

            run();

          }

        }
      );


  }
);
