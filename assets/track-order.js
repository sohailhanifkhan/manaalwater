document.addEventListener(
  'DOMContentLoaded',
  () => {


    const loginRequired =
      document.getElementById(
        'loginRequired'
      );


    const trackingArea =
      document.getElementById(
        'trackingArea'
      );


    const trackingOrderNumber =
      document.getElementById(
        'trackingOrderNumber'
      );


    const trackOrderBtn =
      document.getElementById(
        'trackOrderBtn'
      );


    const trackingMessage =
      document.getElementById(
        'trackingMessage'
      );


    const trackingResult =
      document.getElementById(
        'trackingResult'
      );


    const trackingOrderNo =
      document.getElementById(
        'trackingOrderNo'
      );


    const trackingOrderDate =
      document.getElementById(
        'trackingOrderDate'
      );


    const trackingStatus =
      document.getElementById(
        'trackingStatus'
      );


    const trackingProgress =
      document.getElementById(
        'trackingProgress'
      );


    const trackingAddress =
      document.getElementById(
        'trackingAddress'
      );


    const trackingPayment =
      document.getElementById(
        'trackingPayment'
      );
    const trackingDeliverySchedule =
  document.getElementById(
    'trackingDeliverySchedule'
  );


const trackingDeliveryInstructions =
  document.getElementById(
    'trackingDeliveryInstructions'
  );


    const trackingItems =
      document.getElementById(
        'trackingItems'
      );


    const trackingTotal =
      document.getElementById(
        'trackingTotal'
      );


    let currentUser =
      null;


    let liveOrderListener =
      null;



    const ORDER_STAGES = [

      {
        name: 'Pending',
        title: 'Order received',
        text: 'Your Manaal Water order has been received.'
      },

      {
        name: 'Confirmed',
        title: 'Order confirmed',
        text: 'Your order has been confirmed by our team.'
      },

      {
        name: 'Preparing',
        title: 'Preparing order',
        text: 'Your water order is being prepared for dispatch.'
      },

      {
        name: 'Out for Delivery',
        title: 'Out for delivery',
        text: 'Your order is on the way to your delivery address.'
      },

      {
        name: 'Delivered',
        title: 'Delivered',
        text: 'Your Manaal Water order has been delivered.'
      }

    ];



    // --------------------------------------------------
    // HELPERS
    // --------------------------------------------------

    function escapeHtml(value) {

      return String(
        value ?? ''
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



    function showMessage(
      message,
      type = 'normal'
    ) {

      if (!trackingMessage) return;


      trackingMessage.textContent =
        message;


      trackingMessage.style.display =
        'block';


      if (
        type === 'error'
      ) {

        trackingMessage.style.color =
          '#a33';

      } else if (
        type === 'success'
      ) {

        trackingMessage.style.color =
          '#0a8a76';

      } else {

        trackingMessage.style.color =
          'var(--ink-soft)';

      }

    }



    function hideMessage() {

      if (
        trackingMessage
      ) {

        trackingMessage.style.display =
          'none';

      }

    }



    function orderAmount(order) {

      if (
        typeof order.totalAmount ===
        'number'
      ) {

        return order.totalAmount;

      }


      const parsed =
        Number(
          String(
            order.total || ''
          )
            .replace(
              /[^\d.]/g,
              ''
            )
        );


      return Number.isFinite(
        parsed
      )
        ? parsed
        : 0;

    }



    function formatDate(
      timestamp
    ) {

      if (!timestamp) {

        return 'Date unavailable';

      }


      try {

        const date =
          typeof timestamp.toDate ===
          'function'
            ? timestamp.toDate()
            : new Date(timestamp);


        return date.toLocaleString(
          'en-PK',
          {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }
        );


      } catch (e) {

        return 'Date unavailable';

      }

    }



    // --------------------------------------------------
    // STATUS TIMELINE
    // --------------------------------------------------

    function renderProgress(
      status
    ) {

      const currentIndex =
        ORDER_STAGES.findIndex(
          stage =>
            stage.name === status
        );


      const activeIndex =
        currentIndex >= 0
          ? currentIndex
          : 0;


      trackingProgress.innerHTML =
        ORDER_STAGES
          .map(
            (stage, index) => {


              let stepClass =
                'tracking-step';


              let icon =
                index + 1;


              if (
                index < activeIndex
              ) {

                stepClass +=
                  ' completed';

                icon =
                  '✓';

              } else if (
                index === activeIndex
              ) {

                stepClass +=
                  ' current';

              }


              if (
                status === 'Delivered' &&
                index === activeIndex
              ) {

                stepClass =
                  'tracking-step completed';

                icon =
                  '✓';

              }


              return `

                <div class="${stepClass}">

                  <div class="tracking-step-icon">
                    ${icon}
                  </div>

                  <div>

                    <div class="tracking-step-title">
                      ${escapeHtml(stage.title)}
                    </div>

                    <div class="tracking-step-text">
                      ${escapeHtml(stage.text)}
                    </div>

                  </div>

                </div>

              `;

            }
          )
          .join('');

    }



    // --------------------------------------------------
    // RENDER ORDER
    // --------------------------------------------------

    function renderOrder(
      order
    ) {

      if (!order) return;


      const status =
        order.status ||
        'Pending';


      const statusClass =
        status.replace(
          /\s+/g,
          '-'
        );


      trackingResult.style.display =
        'block';


      trackingOrderNo.textContent =
        order.orderNumber ||
        'Order';


      trackingOrderDate.textContent =
        formatDate(
          order.createdAt
        );


      trackingStatus.textContent =
        status;


      trackingStatus.className =
        'tracking-status-badge ' +
        'status-' +
        statusClass;


      renderProgress(
        status
      );


      const addressParts = [

        order.address || '',

        order.area || ''

      ]
        .filter(Boolean);


      trackingAddress.textContent =
        addressParts.length
          ? addressParts.join(', ')
          : '—';


      trackingPayment.textContent =
        order.payMethod ||
        '—';
      if (
  trackingDeliverySchedule
) {

  const scheduleParts = [];


  if (
    order.deliveryDate
  ) {

    try {

      const parts =
        String(
          order.deliveryDate
        ).split('-');


      const date =
        new Date(
          Number(parts[0]),
          Number(parts[1]) - 1,
          Number(parts[2])
        );


      scheduleParts.push(
        date.toLocaleDateString(
          'en-PK',
          {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }
        )
      );


    } catch (e) {

      scheduleParts.push(
        order.deliveryDate
      );

    }

  }


  if (
    order.deliveryTime
  ) {

    scheduleParts.push(
      order.deliveryTime
    );

  }


  trackingDeliverySchedule.textContent =
    scheduleParts.length

      ? scheduleParts.join(' · ')

      : 'Not scheduled';

}


if (
  trackingDeliveryInstructions
) {

  trackingDeliveryInstructions.textContent =
    order.deliveryInstructions ||
    'No special instructions';

}



      const items =
        Array.isArray(
          order.items
        )
          ? order.items
          : [];


      if (
        !items.length
      ) {

        trackingItems.innerHTML =
          `
            <div
              style="
                font-size:.82rem;
                color:var(--ink-soft);
              "
            >
              No item details available.
            </div>
          `;

      } else {

        trackingItems.innerHTML =
          items
            .map(
              item => {


                const qty =
                  Number(
                    item.qty
                  ) || 0;


                const lineTotal =
                  typeof item.lineTotal ===
                  'number'
                    ? item.lineTotal
                    : (
                        Number(
                          item.unitPrice
                        ) || 0
                      ) * qty;


                return `

                  <div class="tracking-item-row">

                    <span>
                      ${escapeHtml(qty)}
                      ×
                      ${escapeHtml(item.name || 'Item')}
                    </span>

                    <strong>
                      Rs.
                      ${Number(lineTotal).toLocaleString()}
                    </strong>

                  </div>

                `;

              }
            )
            .join('');

      }


      trackingTotal.textContent =
        'Rs. ' +
        orderAmount(
          order
        ).toLocaleString();

    }



    // --------------------------------------------------
    // LIVE ORDER LISTENER
    // --------------------------------------------------

    function listenToOrder(
      documentId
    ) {

      if (
        liveOrderListener
      ) {

        liveOrderListener();

        liveOrderListener =
          null;

      }


      liveOrderListener =
        db.collection(
          'orders'
        )
          .doc(documentId)
          .onSnapshot(

            doc => {

              if (!doc.exists) {

                showMessage(
                  'This order is no longer available.',
                  'error'
                );

                trackingResult.style.display =
                  'none';

                return;

              }


              renderOrder({
                id: doc.id,
                ...doc.data()
              });


              showMessage(
                'Live order status connected.',
                'success'
              );

            },


            error => {

              console.error(
                'Order live tracking failed',
                error
              );


              showMessage(
                'Could not refresh the live order status.',
                'error'
              );

            }

          );

    }



    // --------------------------------------------------
    // FIND CUSTOMER ORDER
    // --------------------------------------------------

    async function trackOrder() {

      if (
        !currentUser
      ) {

        showMessage(
          'Please sign in first.',
          'error'
        );

        return;

      }


      const enteredOrder =
        String(
          trackingOrderNumber.value ||
          ''
        )
          .trim()
          .toUpperCase();


      if (
        !enteredOrder
      ) {

        showMessage(
          'Please enter your order number.',
          'error'
        );

        return;

      }


      trackOrderBtn.disabled =
        true;


      trackOrderBtn.textContent =
        'Checking…';


      trackingResult.style.display =
        'none';


      showMessage(
        'Searching your orders…'
      );


      try {

        const snapshot =
          await db.collection(
            'orders'
          )
            .where(
              'uid',
              '==',
              currentUser.uid
            )
            .limit(50)
            .get();


        const matchedDoc =
          snapshot.docs.find(
            doc => {

              const data =
                doc.data();


              return String(
                data.orderNumber ||
                ''
              )
                .trim()
                .toUpperCase() ===
                enteredOrder;

            }
          );


        if (
          !matchedDoc
        ) {

          showMessage(
            'Order not found in this account. Please check the order number.',
            'error'
          );

          return;

        }


        const order =
          {
            id:
              matchedDoc.id,

            ...matchedDoc.data()
          };


        renderOrder(
          order
        );


        listenToOrder(
          matchedDoc.id
        );


      } catch (error) {

        console.error(
          'Could not track order',
          error
        );


        showMessage(
          'Could not load your order right now. Please try again.',
          'error'
        );


      } finally {

        trackOrderBtn.disabled =
          false;


        trackOrderBtn.textContent =
          'Track Order';

      }

    }



    // --------------------------------------------------
    // BUTTON + ENTER KEY
    // --------------------------------------------------

    if (
      trackOrderBtn
    ) {

      trackOrderBtn.addEventListener(
        'click',
        trackOrder
      );

    }


    if (
      trackingOrderNumber
    ) {

      trackingOrderNumber
        .addEventListener(
          'keydown',
          event => {

            if (
              event.key ===
              'Enter'
            ) {

              event.preventDefault();

              trackOrder();

            }

          }
        );

    }



    // --------------------------------------------------
    // AUTH STATE
    // --------------------------------------------------

    auth.onAuthStateChanged(
      user => {


        currentUser =
          user || null;


        if (user) {

          loginRequired.style.display =
            'none';


          trackingArea.style.display =
            'block';


          hideMessage();


          // If customer came here with an
          // order number in the URL:
          // track-order.html?order=MW-xxxx

          const params =
            new URLSearchParams(
              window.location.search
            );


          const orderFromUrl =
            params.get(
              'order'
            );


          if (
            orderFromUrl
          ) {

            trackingOrderNumber.value =
              orderFromUrl;

            trackOrder();

          }


        } else {

          trackingArea.style.display =
            'none';


          trackingResult.style.display =
            'none';


          loginRequired.style.display =
            'block';


          if (
            liveOrderListener
          ) {

            liveOrderListener();

            liveOrderListener =
              null;

          }

        }

      }
    );


  }
);
