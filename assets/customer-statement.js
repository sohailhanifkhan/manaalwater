document.addEventListener('DOMContentLoaded', () => {

  const SALES_SYNC_WEB_APP_URL =
    'https://script.google.com/macros/s/AKfycbyUfljON8xGW84CO26VI5n67AsIu62VfoEGtA7RFiXaubN1lnBuH4QMWtxRXSU5EYUz/exec';

  const $ = id => document.getElementById(id);

  const loginGate = $('loginGate');
  const statementApp = $('statementApp');
  const customerSelect = $('statementCustomer');
  const monthInput = $('statementMonth');
  const issueDateInput = $('invoiceIssueDateInput');
  const dueDateInput = $('invoiceDueDateInput');
  const generateBtn = $('generateBtn');
  const saveBtn = $('saveMonthlyInvoiceBtn');
  const printBtn = $('printStatementBtn');
  const message = $('statementMessage');
  const view = $('statementView');
  const settlementCard = $('settlementCard');

  const paymentAmount = $('paymentAmount');
  const paymentMethod = $('paymentMethod');
  const paymentDate = $('paymentDate');
  const paymentBankCheque = $('paymentBankCheque');
  const paymentReference = $('paymentReference');
  const paymentNotes = $('paymentNotes');
  const recordPaymentBtn = $('recordPaymentBtn');

  let customers = [];
  let currentCustomer = null;
  let currentBillingMonth = '';
  let allCustomerOrders = [];
  let groups = [];
  let currentGroup = null;
  let previousPendingGroups = [];
  let currentMode = 'monthly';


  function numeric(v) {
    const n = Number(v || 0);
    return Number.isFinite(n) ? n : 0;
  }


  function money(v) {
    return Number(v || 0).toLocaleString(
      'en-PK',
      {minimumFractionDigits:2, maximumFractionDigits:2}
    ) + ' Rs.';
  }


  function escapeHtml(v) {
    return String(v || '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }


  function safeDate(order) {
    if (order.createdAt && typeof order.createdAt.toDate === 'function') {
      return order.createdAt.toDate();
    }
    return null;
  }


  function monthValue(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth()+1).padStart(2,'0');
  }


  function monthLabel(value) {
    if (!value) return '';
    const [y,m] = value.split('-').map(Number);
    return new Date(y,m-1,1).toLocaleDateString(
      'en-GB',
      {month:'long',year:'numeric'}
    );
  }


  function prettyDate(value) {
    if (!value) return '—';
    const [y,m,d] = String(value).split('-').map(Number);
    return String(m).padStart(2,'0') + '/' +
      String(d).padStart(2,'0') + '/' + y;
  }


  function setDefaults() {
    const now = new Date();
    monthInput.value = monthValue(now);

    const today =
      now.getFullYear() + '-' +
      String(now.getMonth()+1).padStart(2,'0') + '-' +
      String(now.getDate()).padStart(2,'0');

    issueDateInput.value = today;
    paymentDate.value = today;

    const due = new Date(now);
    due.setDate(due.getDate()+2);

    dueDateInput.value =
      due.getFullYear() + '-' +
      String(due.getMonth()+1).padStart(2,'0') + '-' +
      String(due.getDate()).padStart(2,'0');
  }


  function paymentsForGroup(group) {
    const map = new Map();

    group.orders.forEach(order => {
      (Array.isArray(order.monthlyPayments) ? order.monthlyPayments : [])
        .forEach(p => {
          if (p && p.paymentId && !map.has(p.paymentId)) {
            map.set(p.paymentId,p);
          }
        });
    });

    return Array.from(map.values());
  }


  function receivedForGroup(group) {
    return paymentsForGroup(group)
      .reduce((s,p) => s + numeric(p.amount), 0);
  }


  function amountForGroup(group) {
    if (group.savedInvoice && numeric(group.savedInvoice.invoiceAmount) > 0) {
      return numeric(group.savedInvoice.invoiceAmount);
    }
    return numeric(group.liveAmount);
  }


  function outstandingForGroup(group) {
    return Math.max(
      amountForGroup(group) - receivedForGroup(group),
      0
    );
  }


  function statusForGroup(group) {
    const amount = amountForGroup(group);
    const received = receivedForGroup(group);
    if (amount > 0 && received >= amount) return 'Settled';
    if (received > 0) return 'Partially Paid';
    return 'Open';
  }


  function groupOrders(orders) {
    const map = new Map();

    orders.forEach(order => {
      const created = safeDate(order);
      if (!created) return;
      if (String(order.status || '') !== 'Delivered') return;

      if (
        order.billingType &&
        order.billingType !== 'Monthly Account'
      ) return;

      const month = monthValue(created);

      if (!map.has(month)) {
        map.set(month,{
          month,
          orders:[],
          liveAmount:0,
          savedInvoice:null
        });
      }

      const group = map.get(month);
      group.orders.push({...order,createdDate:created});
      group.liveAmount += numeric(order.totalAmount);

      if (
        !group.savedInvoice &&
        order.monthlyInvoiceRecord &&
        order.monthlyInvoiceRecord.billingMonth === month
      ) {
        group.savedInvoice = order.monthlyInvoiceRecord;
      }
    });

    return Array.from(map.values())
      .sort((a,b) => a.month.localeCompare(b.month));
  }


  function aggregateProducts(group) {
    if (!group) return [];

    if (
      group.savedInvoice &&
      Array.isArray(group.savedInvoice.itemsSnapshot) &&
      group.savedInvoice.itemsSnapshot.length
    ) {
      return group.savedInvoice.itemsSnapshot;
    }

    const map = new Map();

    group.orders.forEach(order => {
      (Array.isArray(order.items) ? order.items : [])
        .forEach(item => {
          const key = [
            item.name || 'Item',
            item.description || '',
            numeric(item.unitPrice)
          ].join('|');

          if (!map.has(key)) {
            map.set(key,{
              name:item.name || 'Item',
              description:item.description || '',
              qty:0,
              unitPrice:numeric(item.unitPrice),
              amount:0
            });
          }

          const row = map.get(key);
          row.qty += numeric(item.qty);
          row.amount += numeric(
            item.lineTotal ||
            numeric(item.qty) * numeric(item.unitPrice)
          );
        });
    });

    return Array.from(map.values());
  }


  function manualBalanceRowsFromCurrentGroup() {
    if (!currentGroup) return [];

    return currentGroup.orders
      .filter(order => numeric(order.previousBalanceAmount) > 0)
      .map(order => ({
        description:
          order.previousBalanceDescription ||
          'Previous Balance',
        amount:numeric(order.previousBalanceAmount)
      }));
  }


  function previousPendingTotal() {
    if (currentMode !== 'final') return 0;

    return previousPendingGroups
      .reduce(
        (sum,g) => sum + outstandingForGroup(g),
        0
      );
  }


  function currentOutstanding() {
    return currentGroup
      ? outstandingForGroup(currentGroup)
      : 0;
  }


  function invoiceDueTotal() {
    if (currentMode === 'monthly') {
      return currentOutstanding();
    }

    return previousPendingTotal() + currentOutstanding();
  }


  function invoiceNumber() {
    if (!currentCustomer || !currentBillingMonth) return '';

    const [year,month] = currentBillingMonth.split('-');
    const prefix = currentMode === 'final' ? 'BILL' : 'INV';

    return `${prefix}/${year}/${month}/${currentCustomer.id}`;
  }


  function numberToWordsPKR(value) {
    let n = Math.round(numeric(value));
    if (n === 0) return 'Zero Rupee';

    const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

    const under100 = x => x < 20 ? ones[x] : tens[Math.floor(x/10)] + (x%10 ? ' '+ones[x%10] : '');
    const under1000 = x => {
      const h=Math.floor(x/100), r=x%100;
      return (h ? ones[h]+' Hundred' : '') + (h&&r ? ' ' : '') + (r ? under100(r) : '');
    };
    const simple = x => x < 100 ? under100(x) : under1000(x);

    const parts=[];
    const crore=Math.floor(n/10000000);
    if(crore){parts.push(simple(crore)+' Crore');n%=10000000;}
    const lakh=Math.floor(n/100000);
    if(lakh){parts.push(simple(lakh)+' Lakh');n%=100000;}
    const thousand=Math.floor(n/1000);
    if(thousand){parts.push(simple(thousand)+' Thousand');n%=1000;}
    if(n) parts.push(under1000(n));

    return parts.join(' ') + ' Rupee';
  }


  function loadCustomers() {
    customerSelect.disabled = true;
    customerSelect.innerHTML =
      '<option value="">Loading customers...</option>';

    return new Promise(resolve => {
      const cb =
        'manaalBillingCustomers_' +
        Date.now() + '_' +
        Math.random().toString(36).slice(2);

      let script;

      const cleanup = () => {
        try { delete window[cb]; } catch(e){}
        if (script && script.parentNode) script.parentNode.removeChild(script);
      };

      const timer = setTimeout(() => {
        cleanup();
        customerSelect.disabled = false;
        customerSelect.innerHTML =
          '<option value="">Could not load customers</option>';
        resolve([]);
      },12000);

      window[cb] = response => {
        clearTimeout(timer);

        customers =
          response &&
          response.success &&
          Array.isArray(response.customers)
            ? response.customers
            : [];

        customerSelect.innerHTML =
          '<option value="">-- Select Customer --</option>';

        customers.forEach(c => {
          const o=document.createElement('option');
          o.value=c.id;
          o.textContent=`${c.name} — ${c.id}`;
          customerSelect.appendChild(o);
        });

        customerSelect.disabled=false;
        cleanup();
        resolve(customers);
      };

      script=document.createElement('script');
      script.src =
        SALES_SYNC_WEB_APP_URL +
        '?action=customers&callback=' +
        encodeURIComponent(cb) +
        '&_=' + Date.now();
      script.async=true;
      script.onerror=()=>{
        clearTimeout(timer);
        cleanup();
        customerSelect.disabled=false;
        customerSelect.innerHTML =
          '<option value="">Could not load customers</option>';
        resolve([]);
      };
      document.head.appendChild(script);
    });
  }


  function renderInvoice() {
    const rows = $('statementRows');
    rows.innerHTML='';

    const currentProducts = aggregateProducts(currentGroup);

    currentProducts.forEach(item => {
      const tr=document.createElement('tr');
      tr.innerHTML =
        '<td><span class="billing-month-line">' +
        escapeHtml(monthLabel(currentBillingMonth)) +
        '</span><br>' +
        escapeHtml(item.name || 'Item') +
        (item.description
          ? '<span class="balance-sub">'+escapeHtml(item.description)+'</span>'
          : '') +
        '</td>' +
        '<td class="qty">'+numeric(item.qty).toFixed(2)+'</td>' +
        '<td class="unit">'+numeric(item.unitPrice).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2})+'</td>' +
        '<td class="tax"></td>' +
        '<td class="amt">'+money(item.amount)+'</td>';
      rows.appendChild(tr);
    });

    if (currentMode === 'final') {
      previousPendingGroups.forEach(group => {
        const due = outstandingForGroup(group);
        if (due <= 0) return;

        const tr=document.createElement('tr');
        tr.innerHTML =
          '<td><strong>Balance</strong>' +
          '<span class="balance-sub">Pending Month of ' +
          escapeHtml(monthLabel(group.month)) +
          '</span></td>' +
          '<td class="qty"></td><td class="unit"></td><td class="tax"></td>' +
          '<td class="amt">'+money(due)+'</td>';
        rows.appendChild(tr);
      });

      manualBalanceRowsFromCurrentGroup().forEach(balance => {
        const tr=document.createElement('tr');
        tr.innerHTML =
          '<td><strong>Balance</strong>' +
          '<span class="balance-sub">' +
          escapeHtml(balance.description) +
          '</span></td>' +
          '<td class="qty"></td><td class="unit"></td><td class="tax"></td>' +
          '<td class="amt">'+money(balance.amount)+'</td>';
        rows.appendChild(tr);
      });
    }

    if (!currentProducts.length) {
      const tr=document.createElement('tr');
      tr.innerHTML =
        '<td colspan="5" style="text-align:center;padding:18px;">' +
        'No Delivered Monthly Account orders found for ' +
        escapeHtml(monthLabel(currentBillingMonth)) +
        '.</td>';
      rows.appendChild(tr);
    }

    const currentCharge =
      currentGroup ? amountForGroup(currentGroup) : 0;

    const previousPending = previousPendingTotal();

    const currentReceived =
      currentGroup ? receivedForGroup(currentGroup) : 0;

    const totalDue = invoiceDueTotal();

    const status =
      totalDue <= 0 && currentGroup
        ? 'Settled'
        : (
            currentReceived > 0 ||
            previousPendingGroups.some(g => receivedForGroup(g) > 0)
          )
          ? 'Partially Paid'
          : 'Open';

    $('statementNumber').textContent=invoiceNumber();
    $('paymentCommunication').textContent=invoiceNumber();
    $('invoiceCustomerName').textContent=currentCustomer.name;

    const latest =
      (currentGroup && currentGroup.orders.length
        ? [...currentGroup.orders].sort((a,b)=>b.createdDate-a.createdDate)[0]
        : [...allCustomerOrders]
            .filter(o=>safeDate(o))
            .sort((a,b)=>safeDate(b)-safeDate(a))[0]);

    const addr=[];
    if(latest){
      if(latest.address) addr.push(latest.address);
      if(latest.area && !addr.includes(latest.area)) addr.push(latest.area);
    }
    $('invoiceCustomerAddress').textContent =
      addr.length ? addr.join(' / ') : currentCustomer.id;

    $('invoiceDate').textContent=prettyDate(issueDateInput.value);
    $('dueDate').textContent=prettyDate(dueDateInput.value);
    $('currentMonthAmount').textContent=money(currentCharge);
    $('previousBalanceAmount').textContent=money(previousPending);
    $('previousBalanceSummaryRow').style.display =
      currentMode === 'final' && previousPending > 0 ? 'flex' : 'none';
    $('totalReceived').textContent=money(currentReceived);
    $('totalOutstanding').textContent=money(totalDue);
    $('amountInWords').textContent=numberToWordsPKR(totalDue);

    const statusEl=$('statementStatus');
    statusEl.textContent=status.toUpperCase();
    statusEl.className='status-pill ' +
      (status==='Settled' ? 'status-settled' : status==='Partially Paid' ? 'status-partial' : 'status-open');

    view.style.display='block';
    settlementCard.style.display =
      (currentMode === 'final' && totalDue > 0) ? 'block' : 'none';

    paymentAmount.max=String(totalDue);
    paymentAmount.placeholder='Outstanding: Rs. '+totalDue.toLocaleString('en-PK');
    recordPaymentBtn.disabled=totalDue<=0;

    renderPaymentHistory();
  }


  function renderPaymentHistory() {
    const map=new Map();

    const included =
      currentMode === 'final'
        ? [...previousPendingGroups, ...(currentGroup ? [currentGroup] : [])]
        : (currentGroup ? [currentGroup] : []);

    included.forEach(group => {
      paymentsForGroup(group).forEach(p => {
        const parent=p.parentPaymentId || p.paymentId;
        if(!map.has(parent)){
          map.set(parent,{
            paymentDate:p.paymentDate || '',
            paymentMethod:p.paymentMethod || '',
            bankOrCheque:p.bankOrCheque || '',
            referenceNumber:p.referenceNumber || '',
            notes:p.notes || '',
            amount:numeric(p.transactionAmount || p.amount)
          });
        }
      });
    });

    const tx=Array.from(map.values()).sort(
      (a,b)=>new Date(a.paymentDate||0)-new Date(b.paymentDate||0)
    );

    const empty=$('paymentHistoryEmpty');
    const table=$('paymentHistoryTable');
    const tbody=$('paymentRows');
    tbody.innerHTML='';

    if(!tx.length){
      empty.style.display='block';
      table.style.display='none';
      return;
    }

    empty.style.display='none';
    table.style.display='block';

    tx.forEach(p=>{
      const tr=document.createElement('tr');
      tr.innerHTML =
        '<td>'+escapeHtml(p.paymentDate)+'</td>' +
        '<td>'+escapeHtml(p.paymentMethod)+'</td>' +
        '<td>'+escapeHtml(p.bankOrCheque)+'</td>' +
        '<td>'+escapeHtml(p.referenceNumber)+'</td>' +
        '<td>'+escapeHtml(p.notes)+'</td>' +
        '<td class="money"><strong>'+money(p.amount)+'</strong></td>';
      tbody.appendChild(tr);
    });
  }


  async function loadCustomerHistory() {
    const customerId=customerSelect.value;
    const billingMonth=monthInput.value;

    if(!customerId){
      alert('Please select a permanent customer.');
      return false;
    }
    if(!billingMonth){
      alert('Please select the billing / delivery month.');
      return false;
    }
    if(!issueDateInput.value){
      alert('Please select the invoice issue date.');
      return false;
    }
    if(!dueDateInput.value){
      alert('Please select the due date.');
      return false;
    }

    currentCustomer =
      customers.find(c=>c.id===customerId) ||
      {id:customerId,name:customerId};

    currentBillingMonth=billingMonth;

    const snapshot=
      await db.collection('orders')
        .where('customerId','==',customerId)
        .get();

    allCustomerOrders=snapshot.docs.map(doc=>({
      id:doc.id,
      ...doc.data()
    }));

    groups=groupOrders(allCustomerOrders);

    currentGroup=
      groups.find(g=>g.month===billingMonth) || null;

    previousPendingGroups=
      groups.filter(g=>
        g.month < billingMonth &&
        outstandingForGroup(g) > 0
      );

    return true;
  }


  async function generateInvoice() {
    currentMode =
      document.querySelector('input[name="invoiceMode"]:checked').value;

    generateBtn.disabled=true;
    generateBtn.textContent='Loading...';
    message.style.display='block';
    message.textContent='Loading customer billing history...';

    try{
      const ok=await loadCustomerHistory();
      if(!ok) return;

      renderInvoice();

      message.style.display =
        currentGroup ? 'none' : 'block';

      if(!currentGroup){
        message.textContent =
          'There is no Delivered Monthly Account order for the selected billing month. You may choose another month.';
      }
    }catch(error){
      console.error(error);
      message.style.display='block';
      message.textContent =
        'Could not generate invoice: ' +
        (error.message || 'Unknown error');
    }finally{
      generateBtn.disabled=false;
      generateBtn.textContent='Generate Invoice';
    }
  }


  async function saveMonthlyInvoice() {
    currentMode='monthly';
    document.querySelector('input[name="invoiceMode"][value="monthly"]').checked=true;

    try{
      const ok=await loadCustomerHistory();
      if(!ok) return;

      if(!currentGroup || !currentGroup.orders.length){
        alert('No Delivered Monthly Account orders were found for this billing month.');
        return;
      }

      const itemsSnapshot=aggregateProducts(currentGroup);
      const invoiceAmount=numeric(currentGroup.liveAmount);

      const record={
        invoiceType:'Monthly Invoice',
        invoiceNumber:
          'INV/' +
          currentBillingMonth.split('-')[0] + '/' +
          currentBillingMonth.split('-')[1] + '/' +
          currentCustomer.id,
        billingMonth:currentBillingMonth,
        issueDate:issueDateInput.value,
        dueDate:dueDateInput.value,
        customerId:currentCustomer.id,
        customerName:currentCustomer.name,
        invoiceAmount,
        itemsSnapshot,
        frozenAt:new Date().toISOString(),
        frozenBy:
          auth.currentUser && auth.currentUser.email
            ? auth.currentUser.email
            : 'owner'
      };

      if(
        !confirm(
          'Save / freeze the ' +
          monthLabel(currentBillingMonth) +
          ' monthly invoice for ' +
          currentCustomer.name +
          ' at Rs. ' +
          invoiceAmount.toLocaleString('en-PK') +
          '?'
        )
      ) return;

      saveBtn.disabled=true;
      saveBtn.textContent='Saving...';

      const batch=db.batch();

      currentGroup.orders.forEach(order=>{
        batch.update(
          db.collection('orders').doc(order.id),
          {
            monthlyInvoiceRecord:record,
            monthlyInvoiceNumber:record.invoiceNumber,
            monthlyInvoiceIssueDate:record.issueDate,
            monthlyInvoiceDueDate:record.dueDate,
            monthlyInvoiceFrozenAt:
              firebase.firestore.FieldValue.serverTimestamp()
          }
        );
      });

      await batch.commit();

      currentGroup.savedInvoice=record;

      renderInvoice();

      alert(
        monthLabel(currentBillingMonth) +
        ' monthly invoice saved successfully. You can now create another month invoice for the same customer.'
      );

    }catch(error){
      console.error(error);
      alert(
        'Could not save monthly invoice: ' +
        (error.message || 'Unknown error')
      );
    }finally{
      saveBtn.disabled=false;
      saveBtn.textContent='Save / Freeze Monthly Invoice';
    }
  }


  function newPaymentId(){
    return 'PAY-'+Date.now()+'-'+Math.random().toString(36).slice(2,8).toUpperCase();
  }


  async function recordPayment(){
    if(currentMode!=='final'){
      alert('Payments for carried balances should be recorded from the Final Billing Invoice.');
      return;
    }

    const due=invoiceDueTotal();
    const amount=numeric(paymentAmount.value);

    if(amount<=0){
      alert('Please enter the amount received.');
      return;
    }
    if(amount>due+0.001){
      alert('Payment cannot be more than the Total Due of Rs. '+due.toLocaleString('en-PK')+'.');
      return;
    }
    if(!paymentDate.value){
      alert('Please select the payment date.');
      return;
    }

    if(!confirm('Record payment of Rs. '+amount.toLocaleString('en-PK')+'?')) return;

    const parentPaymentId=newPaymentId();
    const base={
      parentPaymentId,
      transactionAmount:amount,
      paymentDate:paymentDate.value,
      paymentMethod:paymentMethod.value,
      bankOrCheque:paymentBankCheque.value.trim(),
      referenceNumber:paymentReference.value.trim(),
      notes:paymentNotes.value.trim(),
      recordedAt:new Date().toISOString(),
      recordedBy:
        auth.currentUser && auth.currentUser.email
          ? auth.currentUser.email
          : 'owner'
    };

    const allocationGroups=[
      ...previousPendingGroups,
      ...(currentGroup ? [currentGroup] : [])
    ].sort((a,b)=>a.month.localeCompare(b.month));

    let remaining=amount;
    const batch=db.batch();

    allocationGroups.forEach(group=>{
      if(remaining<=0) return;

      const outstanding=outstandingForGroup(group);
      if(outstanding<=0) return;

      const allocated=Math.min(outstanding,remaining);
      const payment={
        ...base,
        paymentId:parentPaymentId+'-'+group.month.replace('-',''),
        allocationMonth:group.month,
        amount:allocated
      };

      const updated=[
        ...paymentsForGroup(group),
        payment
      ];

      const receivedAfter=updated.reduce((s,p)=>s+numeric(p.amount),0);
      const statementAmount=amountForGroup(group);
      const outstandingAfter=Math.max(statementAmount-receivedAfter,0);
      const statusAfter=
        outstandingAfter<=0
          ? 'Settled'
          : 'Partially Paid';

      group.orders.forEach(order=>{
        batch.update(
          db.collection('orders').doc(order.id),
          {
            monthlyPayments:updated,
            monthlyStatementAmount:statementAmount,
            monthlyStatementReceived:receivedAfter,
            monthlyStatementOutstanding:outstandingAfter,
            monthlyStatementStatus:statusAfter,
            monthlyStatementMonth:group.month,
            paymentStatus:
              statusAfter==='Settled' ? 'Paid' : 'Monthly Account',
            paymentUpdatedAt:
              firebase.firestore.FieldValue.serverTimestamp()
          }
        );
      });

      remaining-=allocated;
    });

    try{
      recordPaymentBtn.disabled=true;
      recordPaymentBtn.textContent='Recording...';

      await batch.commit();

      paymentAmount.value='';
      paymentBankCheque.value='';
      paymentReference.value='';
      paymentNotes.value='';

      await generateInvoice();

      alert('Payment recorded. The oldest pending month was settled first.');

    }catch(error){
      console.error(error);
      alert('Could not record payment: '+(error.message||'Unknown error'));
    }finally{
      recordPaymentBtn.disabled=false;
      recordPaymentBtn.textContent='Record Payment';
    }
  }


  generateBtn.addEventListener('click',generateInvoice);
  saveBtn.addEventListener('click',saveMonthlyInvoice);
  printBtn.addEventListener('click',()=>{
    if(view.style.display==='none'){
      alert('Generate an invoice first.');
      return;
    }
    window.print();
  });
  recordPaymentBtn.addEventListener('click',recordPayment);

  document
    .querySelectorAll('input[name="invoiceMode"]')
    .forEach(radio=>{
      radio.addEventListener('change',()=>{
        currentMode=radio.value;
        if(view.style.display!=='none' && currentCustomer){
          generateInvoice();
        }
      });
    });

  setDefaults();

  const params=new URLSearchParams(window.location.search);
  const requestedCustomer=params.get('customer');
  const requestedMonth=params.get('month');

  if(requestedMonth) monthInput.value=requestedMonth;

  auth.onAuthStateChanged(user=>{
    if(
      user &&
      String(user.email||'').toLowerCase() ===
      String(OWNER_EMAIL||'').toLowerCase()
    ){
      loginGate.style.display='none';
      statementApp.style.display='block';

      loadCustomers().then(()=>{
        if(
          requestedCustomer &&
          customers.some(c=>c.id===requestedCustomer)
        ){
          customerSelect.value=requestedCustomer;
        }
      });
    }else{
      loginGate.innerHTML =
        'Owner access required. <a href="owner-dashboard.html">Open Owner Dashboard</a>';
    }
  });

});
