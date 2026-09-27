let USER_ID=null,cats=[],accounts=[],transactions=[],currency='INR',users=[];
const titles={dashboard:['OVERVIEW','Dashboard'],transactions:['MONEY FLOW','Transactions'],accounts:['ACCOUNTS','Accounts'],budgets:['PLANNING','Budgets'],goals:['GOALS','Savings Goals'],bills:['RECURRING PAYMENTS','Bills & Subscriptions'],investments:['PORTFOLIO','Investments'],networth:['FINANCIAL POSITION','Net Worth'],reports:['ANALYTICS','Reports & Insights'],assistant:['ASSISTANCE','Finance Assistant'],settings:['ACCOUNT','Settings']};
const $=id=>document.getElementById(id);const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:0}).format(Number(n)||0);const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
async function api(url,opt={}){const r=await fetch(url,opt);let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.error||`Request failed (${r.status})`);return d}
function navInit(){

  const nav=$('nav');

  nav.innerHTML=Object.keys(titles)
    .filter(x=>x!=='settings')
    .map(p=>`
      <button class="nav-item" data-page="${p}">
        <span class="nav-icon">◈</span>
        <span>${titles[p][1]}</span>
      </button>
    `)
    .join('');

document.querySelectorAll('.nav-item').forEach(b=>{
  b.onclick=()=>{
    showPage(b.dataset.page);
  };
});
}
async function showPage(p){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));$(`page-${p}`).classList.add('active');document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page===p));$('eyebrow').textContent=titles[p][0];$('pageTitle').textContent=titles[p][1];window.scrollTo(0,0);const jobs={dashboard:loadDashboard,transactions:loadTransactions,accounts:loadAccounts,budgets:loadBudgets,goals:loadGoals,bills:loadBills,investments:loadInvestments,networth:loadNetworth,reports:loadReports};if(jobs[p])await jobs[p]()}
function applyTheme(theme){

  document.body.classList.toggle(
    'dark-theme',
    String(theme).toLowerCase()==='dark'
  );
}
async function loadUser(){

  const u=await api(`/api/user/${USER_ID}`);

  currency=u.default_currency||'INR';

  $('sideName').textContent=u.full_name||'User';

  $('avatar').textContent=
    (u.full_name||'?')
      .split(' ')
      .map(x=>x[0])
      .slice(0,2)
      .join('')
      .toUpperCase();

  $('profile').textContent=$('avatar').textContent;

  $('settingName').value=u.full_name||'';
  $('settingEmail').value=u.email||'';
  $('settingCurrency').value=currency;

  const theme=(u.theme||'light').toLowerCase();

  $('settingTheme').value=
    theme==='dark' ? 'Dark' : 'Light';

  applyTheme(theme);

  $('welcomeMessage').textContent=
    `Welcome, ${u.full_name||'User'}`;

  $('dashboardPeriod').textContent=
    new Date().toLocaleDateString('en-IN',{
      month:'long',
      year:'numeric'
    });
}
async function loadFormData(){
  [cats, accounts] = await Promise.all([
    api('/api/categories'),
    api(`/api/accounts?user_id=${USER_ID}`)
  ]);

  $('filterCategory').innerHTML =
    '<option value="All">All categories</option>' +
    cats.map(c =>
      `<option value="${esc(c.category_name)}">${esc(c.category_name)}</option>`
    ).join('');
}
async function loadDashboard(){const d=await api(`/api/dashboard?user_id=${USER_ID}`);$('dashBalance').textContent=money(d.balance);$('dashIncome').textContent=money(d.income);$('dashExpenses').textContent=money(d.expenses);$('dashSavings').textContent=money(d.savings);$('dashSavingsRate').textContent=`${d.income?Math.round(d.savings/d.income*100):0}% savings rate`;const [m,c,t,b]=await Promise.all([api(`/api/dashboard/monthly?user_id=${USER_ID}`),api(`/api/dashboard/categories?user_id=${USER_ID}`),api(`/api/transactions?user_id=${USER_ID}`),api(`/api/budgets?user_id=${USER_ID}`)]);renderChart(m);renderCategories(c);$('dashboardTransactions').innerHTML=t.slice(0,5).map(r=>`<tr><td>${esc(r.description||r.category_name)}</td><td>${esc(r.category_name||'-')}</td><td>${esc(r.formatted_date)}</td><td class="${r.transaction_type==='Income'?'positive':'negative'}">${r.transaction_type==='Income'?'+':'−'}${money(r.amount)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">No transactions yet.</td></tr>';const now=new Date();

const bt=b.filter(x=>{
  const [year,month]=String(x.month_year).split('-').map(Number);
  return year===now.getFullYear() && month===now.getMonth()+1;
});

const total=bt.reduce((s,x)=>s+Number(x.amount),0);
const spent=bt.reduce((s,x)=>s+Number(x.spent),0);$('dashboardBudget').innerHTML=bt.length?`<div class="budget-row"><div><b>${money(spent)} spent</b><b>${money(total)} budget</b></div><div class="progress"><i style="width:${total?Math.min(100,spent/total*100):0}%"></i></div><small>${total?Math.round(spent/total*100):0}% used</small></div>`:'<div class="empty">No budget created for this month.</div>';}
function renderChart(rows){const el=$('incomeExpenseChart');if(!rows.length){el.innerHTML='<div class="empty">No transaction data yet.</div>';return}const max=Math.max(...rows.flatMap(x=>[Number(x.income),Number(x.expenses)]),1);el.innerHTML=rows.map(x=>`<div class="bar-group"><div class="bar" style="height:${Number(x.income)/max*88}%" title="${x.month} — Income ${money(x.income)}""></div><div class="bar expense" style="height:${Number(x.expenses)/max*88}%" title="${x.month} — Expenses ${money(x.expenses)}""></div></div>`).join('');}
function renderCategories(rows){const total=rows.reduce((s,x)=>s+Number(x.total),0);$('categoryTotal').textContent=money(total);$('dashboardCategories').innerHTML=rows.length?rows.map(x=>`<div class="category-item"><span>${esc(x.category_name)}</span><b>${money(x.total)}</b></div>`).join(''):'<div class="empty">No expenses this month.</div>';}
async function loadTransactions(){transactions=await api(`/api/transactions?user_id=${USER_ID}`);renderTransactions(transactions);}
function renderTransactions(rows){$('transactionRows').innerHTML=rows.length?rows.map(r=>`<tr><td><b>${esc(r.description||r.category_name||'Transaction')}</b></td><td>${r.transaction_type}</td><td>${esc(r.category_name||'-')}</td><td>${esc(r.formatted_date)}</td><td>${esc(r.account_name||'-')}</td><td class="${r.transaction_type==='Income'?'positive':'negative'}">${r.transaction_type==='Income'?'+':'−'}${money(r.amount)}</td><td><button class="secondary" onclick="deleteTransaction(${r.transaction_id})">Delete</button></td></tr>`).join(''):'<tr><td colspan="7" class="empty">No transactions found.</td></tr>';}
function applyFilters(){const q=$('searchTransactions').value.toLowerCase(),type=$('filterType').value,cat=$('filterCategory').value;renderTransactions(transactions.filter(r=>(!q||`${r.description||''} ${r.category_name||''} ${r.account_name||''}`.toLowerCase().includes(q))&&(type==='All'||r.transaction_type===type)&&(cat==='All'||r.category_name===cat)));}
function clearFilters(){$('searchTransactions').value='';$('filterType').value='All';$('filterCategory').value='All';renderTransactions(transactions)}
async function deleteTransaction(id){if(!confirm('Delete this transaction?'))return;await api(`/api/transactions/${id}?user_id=${USER_ID}`,{method:'DELETE'});await Promise.all([loadTransactions(),loadDashboard(),loadAccounts()]);}
function openTransactionModal(){openModal('Add Transaction','Record income or an expense.',`<label>Transaction Type<select id="fType"><option>Expense</option><option>Income</option></select></label><label>Amount<input id="fAmount" type="number" min="0.01" step="0.01"></label><label>Category<select id="fCategory"></select></label><label>Description<input id="fDescription"></label><label>Date<input id="fDate" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Account<select id="fAccount"></select></label>` ,async()=>{const body={user_id:USER_ID,transaction_type:$('fType').value,amount:Number($('fAmount').value),category_id:Number($('fCategory').value),description:$('fDescription').value,transaction_date:$('fDate').value,account_id:Number($('fAccount').value)};await api('/api/transactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});closeModal();await Promise.all([loadDashboard(),loadTransactions(),loadAccounts()]);showPage('transactions')});populateTransactionFields();}
function populateTransactionFields(){const fill=()=>{$('fCategory').innerHTML=cats.filter(c=>c.category_type===$('fType').value).map(c=>`<option value="${c.category_id}">${esc(c.category_name)}</option>`).join('');$('fAccount').innerHTML='<option value="">Select account</option>'+accounts.map(a=>`<option value="${a.account_id}">${esc(a.account_name)} — ${money(a.balance)}</option>`).join('');};$('fType').onchange=fill;fill();}
async function loadAccounts(){accounts=await api(`/api/accounts?user_id=${USER_ID}`);$('accountsGrid').innerHTML=accounts.length?accounts.map(a=>`<div class="account-card"><small>${esc(a.account_type)}</small><h3>${esc(a.account_name)}</h3><div class="balance">${money(a.balance)}</div><div class="account-actions"><button class="secondary" onclick="editAccount(${a.account_id})">Edit</button><button class="secondary" onclick="deleteAccount(${a.account_id})">Delete</button></div></div>`).join(''):'<div class="empty">No accounts yet. Add your first account.</div>';}
function openUserModal(){
  openModal(
    'Add User',
    'Create a new account holder',
    `
    <label>Full Name
      <input id="uName" placeholder="Enter full name">
    </label>

    <label>Email
      <input id="uEmail" type="email" placeholder="Enter email">
    </label>
    `,
    async()=>{
      const name=$('uName').value.trim();
      const email=$('uEmail').value.trim();

      if(!name || !email){
        alert('Please enter name and email.');
        return;
      }

      const newUser=await api('/api/users',{
        method:'POST',
        headers:{
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          full_name:name,
          email:email
        })
      });

      closeModal();

      await setupUserSelector();

      $('userSelector').value=String(newUser.user_id);
      USER_ID=Number(newUser.user_id);

      await loadUser();
      await loadFormData();
      await loadDashboard();
    }
  );
}

async function setupUserSelector(){
  users=await api('/api/users');

  const selector=$('userSelector');

  selector.innerHTML=users.map(u=>
    `<option value="${u.user_id}">
      ${esc(u.full_name)}
    </option>`
  ).join('');

  selector.value=String(USER_ID);

  selector.onchange=async()=>{
    USER_ID=Number(selector.value);

    await loadUser();
    await loadFormData();

    const activePage=
      document.querySelector('.page.active')?.id?.replace('page-','')
      || 'dashboard';

    await showPage(activePage);
  };
}
function openAccountModal(){
  // your existing account modal code...
}
function openAccountModal(a=null){
  openModal(
    a ? 'Edit Account' : 'Add Account',
    'Manage your financial account',
    `
    <label>Account Name
      <input id="aName" value="${esc(a?.account_name||'')}" placeholder="e.g. Savings Account">
    </label>

    <label>Account Type
      <select id="aType">
        <option value="saving" ${a?.account_type==='saving'?'selected':''}>Saving</option>
        <option value="current" ${a?.account_type==='current'?'selected':''}>Current</option>
        <option value="upi" ${a?.account_type==='upi'?'selected':''}>UPI</option>
        <option value="cash" ${a?.account_type==='cash'?'selected':''}>Cash</option>
        <option value="other" ${a?.account_type==='other'?'selected':''}>Other</option>
      </select>
    </label>

    <label>Balance
      <input
        id="aBalance"
        type="number"
        min="0"
        step="0.01"
        value="${a?.balance??''}"
        placeholder="0"
      >
    </label>
    `,
    async()=>{
      const body={
        user_id:USER_ID,
        account_name:$('aName').value.trim(),
        account_type:$('aType').value,
        balance:Number($('aBalance').value||0)
      };

      if(!body.account_name){
        alert('Please enter an account name.');
        return;
      }

      await api(
        a ? `/api/accounts/${a.account_id}` : '/api/accounts',
        {
          method:a ? 'PUT' : 'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(body)
        }
      );

      closeModal();

      await loadAccounts();
      await loadFormData();
      await loadDashboard();
    }
  );
}
async function editAccount(id){openAccountModal(accounts.find(a=>a.account_id===id))}async function deleteAccount(id){if(!confirm('Delete this account?'))return;await api(`/api/accounts/${id}?user_id=${USER_ID}`,{method:'DELETE'});await loadAccounts();await loadFormData()}
async function loadBudgets(){
  const r=await api(`/api/budgets?user_id=${USER_ID}`);

  const total=r.reduce((s,x)=>s+Number(x.amount),0);
  const spent=r.reduce((s,x)=>s+Number(x.spent),0);

  $('budgetTotal').textContent=money(total);
  $('budgetSpent').textContent=money(spent);
  $('budgetRemaining').textContent=money(total-spent);
  $('budgetUsed').textContent=`${total?Math.round(spent/total*100):0}% used`;

  $('budgetMonth').textContent=
    new Date().toLocaleDateString('en-IN',{
      month:'long',
      year:'numeric'
    });

  $('budgetsList').innerHTML=r.length
    ? r.map(x=>`
      <div class="budget-row">
        <div>
          <b>${esc(x.category_name)}</b>
          <span>${money(x.spent)} spent of ${money(x.amount)}</span>
        </div>

        <strong>
          ${x.amount?Math.round(x.spent/x.amount*100):0}%
        </strong>

        <div class="progress">
          <i style="width:${x.amount?Math.min(100,x.spent/x.amount*100):0}%"></i>
        </div>

        <button class="secondary"
          onclick="deleteBudget(${x.budget_id})">
          Delete
        </button>
      </div>
    `).join('')
    : '<div class="empty">No budgets created.</div>';
}
function openBudgetModal(){
  openModal(
    'Create Budget',
    'Set a monthly spending limit',
    `<label>Category
      <select id="bCat">
        ${cats.filter(c=>c.category_type==='Expense')
          .map(c=>`<option value="${c.category_id}">${esc(c.category_name)}</option>`)
          .join('')}
      </select>
    </label>

    <label>Budget Amount
      <input id="bAmount" type="number" min="0.01" step="0.01">
    </label>

    <label>Month
      <input id="bMonth" type="month" value="${new Date().toISOString().slice(0,7)}">
    </label>`,

    async()=>{
      const amount=Number($('bAmount').value);
      const categoryId=Number($('bCat').value);
      const monthYear=$('bMonth').value;

      if(!categoryId || !amount || amount<=0 || !monthYear){
        alert('Please enter valid budget details.');
        return;
      }

      await api('/api/budgets',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          user_id:USER_ID,
          category_id:categoryId,
          amount:amount,
          month_year:monthYear
        })
      });

      closeModal();
      await loadBudgets();
      await loadDashboard();
    }
  );
}

async function deleteBudget(id){
  if(confirm('Delete this budget?')){
    await api(`/api/budgets/${id}?user_id=${USER_ID}`,{
      method:'DELETE'
    });
    await loadBudgets();
    await loadDashboard();
  }
}
async function loadGoals(){
  const r=await api(`/api/goals?user_id=${USER_ID}`);

  $('goalsGrid').innerHTML=r.length
    ? r.map(x=>{
        const p=x.target_amount
          ? Math.min(100,Number(x.saved_amount)/Number(x.target_amount)*100)
          : 0;

        return `
          <div class="goal panel">
            <div class="goal-icon">◎</div>
            <h3>${esc(x.goal_name)}</h3>
            <p>Target: ${money(x.target_amount)}</p>
            <strong>${money(x.saved_amount)}</strong>

            <div class="progress">
              <i style="width:${p}%"></i>
            </div>

            <small>
              ${Math.round(p)}% complete · ${x.target_date||'No target date'}
            </small>

            <div>
              <button class="secondary" onclick="editGoal(${x.goal_id})">Edit</button>
              <button class="secondary" onclick="deleteGoal(${x.goal_id})">Delete</button>
            </div>
          </div>
        `;
      }).join('')
    : '<div class="empty">No savings goals yet.</div>';

  window._goals=r;
}
function openGoalModal(g=null){
  openModal(
    g?'Edit Goal':'Add Goal',
    'Savings goal',
    `<label>Name
      <input id="gName" value="${esc(g?.goal_name||'')}">
    </label>

    <label>Target Amount
      <input id="gTarget" type="number" min="0.01" step="0.01" value="${g?.target_amount||''}">
    </label>

    <label>Saved Amount
      <input id="gCurrent" type="number" min="0" step="0.01" value="${g?.saved_amount||0}">
    </label>

    <label>Target Date
      <input id="gDate" type="date" value="${g?.target_date||''}">
    </label>`,

    async()=>{
      const body={
        user_id:USER_ID,
        goal_name:$('gName').value,
        target_amount:Number($('gTarget').value),
        saved_amount:Number($('gCurrent').value),
        target_date:$('gDate').value||null
      };

      await api(
        g?`/api/goals/${g.goal_id}`:'/api/goals',
        {
          method:g?'PUT':'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(body)
        }
      );

      closeModal();
      await loadGoals();
    }
  );
}

function editGoal(id){
  openGoalModal(window._goals.find(x=>x.goal_id===id));
}

async function deleteGoal(id){
  if(confirm('Delete this goal?')){
    await api(`/api/goals/${id}?user_id=${USER_ID}`,{
      method:'DELETE'
    });
    await loadGoals();
  }
}
async function loadBills(){const r=await api(`/api/bills?user_id=${USER_ID}`);const now=new Date(),week=new Date(Date.now()+7*864e5);$('billMonthly').textContent=money(r.filter(x=>String(x.frequency).toLowerCase()==='monthly').reduce((s,x)=>s+Number(x.amount),0));$('billCount').textContent=`${r.length} active`;$('billDue').textContent=money(r.filter(x=>new Date(x.due_date)>=now&&new Date(x.due_date)<=week).reduce((s,x)=>s+Number(x.amount),0));$('billSubscriptions').textContent=money(r.filter(x=>String(x.bill_type).toLowerCase().includes('sub')).reduce((s,x)=>s+Number(x.amount),0));$('billsList').innerHTML=r.length?r.map(x=>`<div class="bill"><div class="bill-icon">$</div><div><b>${esc(x.bill_name)}</b><span>${esc(x.frequency)} · Due ${esc(x.due_date)}</span></div><strong>${money(x.amount)}</strong><div><button class="secondary" onclick="editBill(${x.bill_id})">Edit</button><button class="secondary" onclick="deleteBill(${x.bill_id})">Delete</button></div></div>`).join(''):'<div class="empty">No recurring payments yet.</div>';window._bills=r;}
function openBillModal(b=null){openModal(b?'Edit Payment':'Add Recurring Payment','Recurring payment',`<label>Name<input id="blName" value="${esc(b?.bill_name||'')}"></label><label>Amount<input id="blAmount" type="number" value="${b?.amount||''}"></label><label>Due Date<input id="blDate" type="date" value="${b?.due_date||''}"></label><label>Frequency<input id="blFreq" value="${esc(b?.frequency||'Monthly')}"></label><label>Type<input id="blType" value="${esc(b?.bill_type||'Bill')}"></label>`,async()=>{const body={user_id:USER_ID,bill_name:$('blName').value,amount:Number($('blAmount').value),due_date:$('blDate').value,frequency:$('blFreq').value,bill_type:$('blType').value,active:1};await api(b?`/api/bills/${b.bill_id}`:'/api/bills',{method:b?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});closeModal();await loadBills()})}function editBill(id){openBillModal(window._bills.find(x=>x.bill_id===id))}async function deleteBill(id){if(confirm('Remove this recurring payment?')){await api(`/api/bills/${id}?user_id=${USER_ID}`,{method:'DELETE'});await loadBills()}}
async function loadInvestments(){const r=await api(`/api/investments?user_id=${USER_ID}`),invested=r.reduce((s,x)=>s+Number(x.invested_amount),0),value=r.reduce((s,x)=>s+Number(x.current_value),0),gain=value-invested;$('investedTotal').textContent=money(invested);$('investmentValue').textContent=money(value);$('investmentGain').textContent=(gain>=0?'+':'')+money(gain);$('investmentReturn').textContent=`${invested?(gain/invested*100).toFixed(1):0}%`;$('investmentCount').textContent=`${r.length} investments`;$('investmentsList').innerHTML=r.length?r.map(x=>{const g=Number(x.current_value)-Number(x.invested_amount);return `<tr><td><b>${esc(x.investment_name)}</b></td><td>${esc(x.investment_type)}</td><td>${money(x.invested_amount)}</td><td>${money(x.current_value)}</td><td class="${g>=0?'positive':'negative'}">${g>=0?'+':''}${money(g)}</td><td><button class="secondary" onclick="editInvestment(${x.investment_id})">Edit</button> <button class="secondary" onclick="deleteInvestment(${x.investment_id})">Delete</button></td></tr>`}).join(''):'<tr><td colspan="6" class="empty">No investments yet.</td></tr>';window._investments=r;}
function openInvestmentModal(x=null){openModal(x?'Edit Investment':'Add Investment','Investment details',`<label>Name<input id="iName" value="${esc(x?.investment_name||'')}"></label><label>Type<input id="iType" value="${esc(x?.investment_type||'')}"></label><label>Invested Amount<input id="iInvested" type="number" value="${x?.invested_amount||''}"></label><label>Current Value<input id="iValue" type="number" value="${x?.current_value||''}"></label><label>Date<input id="iDate" type="date" value="${x?.investment_date||''}"></label>`,async()=>{const body={user_id:USER_ID,investment_name:$('iName').value,investment_type:$('iType').value,invested_amount:Number($('iInvested').value),current_value:Number($('iValue').value),investment_date:$('iDate').value||null};await api(x?`/api/investments/${x.investment_id}`:'/api/investments',{method:x?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});closeModal();await loadInvestments()})}function editInvestment(id){openInvestmentModal(window._investments.find(x=>x.investment_id===id))}async function deleteInvestment(id){if(confirm('Delete this investment?')){await api(`/api/investments/${id}?user_id=${USER_ID}`,{method:'DELETE'});await loadInvestments()}}
async function loadNetworth(){const n=await api(`/api/networth?user_id=${USER_ID}`);$('netWorth').textContent=money(n.netWorth);$('assetsTotal').textContent=money(n.assets);$('liabilitiesTotal').textContent=money(n.liabilities);$('nwBank').textContent=money(n.bank);$('nwInvestments').textContent=money(n.investments);$('nwOther').textContent=money(n.otherAssets);const [as,li]=await Promise.all([api(`/api/assets?user_id=${USER_ID}`),api(`/api/liabilities?user_id=${USER_ID}`)]);$('liabilitiesList').innerHTML=li.length?li.map(x=>`<div class="asset-line"><span>${esc(x.liability_name)}</span><b>${money(x.amount)}</b></div>`).join(''):'<div class="empty">No liabilities recorded.</div>';window._assets=as;window._liabilities=li;}
async function saveSimple(type,name,amount){await api(`/api/${type}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:USER_ID,[type==='assets'?'asset_name':'liability_name']:name,amount:Number(amount)})});closeModal();await loadNetworth()}
function openAssetModal(){openModal('Add Asset','Other asset',`<label>Name<input id="sName"></label><label>Amount<input id="sAmount" type="number"></label>`,()=>saveSimple('assets',$('sName').value,$('sAmount').value))}function openLiabilityModal(){openModal('Add Liability','Liability',`<label>Name<input id="sName"></label><label>Amount<input id="sAmount" type="number"></label>`,()=>saveSimple('liabilities',$('sName').value,$('sAmount').value))}
async function loadReports(){const r=await api(`/api/reports?user_id=${USER_ID}`);$('reportMonthly').innerHTML=r.monthly.length?r.monthly.map(x=>{const save=Number(x.income)-Number(x.expenses);return `<div class="report-row"><div><span>${esc(x.month)}</span><b>${money(save)}</b></div><small>Income ${money(x.income)} · Expenses ${money(x.expenses)}</small><div class="report-track"><i style="width:${x.income?Math.min(100,Number(x.expenses)/Number(x.income)*100):0}%"></i></div></div>`}).join(''):'<div class="empty">No report data yet.</div>';const total=r.categories.reduce((s,x)=>s+Number(x.total),0);$('reportCategories').innerHTML=r.categories.length?r.categories.map(x=>`<div class="report-row"><div><span>${esc(x.category_name)}</span><b>${money(x.total)}</b></div><div class="report-track"><i style="width:${total?Number(x.total)/total*100:0}%"></i></div></div>`).join(''):'<div class="empty">No expenses recorded this month.</div>';const top=r.categories[0];$('insights').innerHTML=`<div class="insight">Largest current-month expense: <b>${top?esc(top.category_name):'None'}</b>${top?' at '+money(top.total):''}.</div><div class="insight">Total categories with spending this month: <b>${r.categories.length}</b>.</div>`;}
async function askAssistant(text){const input=$('assistantInput');const q=text||input.value.trim();if(!q)return;const chat=$('chat');chat.insertAdjacentHTML('beforeend',`<div class="msg user">${esc(q)}</div>`);input.value='';const r=await api(`/api/assistant?user_id=${USER_ID}&q=${encodeURIComponent(q)}`);chat.insertAdjacentHTML('beforeend',`<div class="msg bot">${esc(r.answer)}</div>`);chat.scrollTop=chat.scrollHeight;}
async function saveSettings(){

  const name = $('settingName').value.trim();
  const email = $('settingEmail').value.trim();
  const currencyValue = $('settingCurrency').value;
  const theme = $('settingTheme').value;

  const updatedUser = await api(`/api/user/${USER_ID}`, {
    method:'PUT',
    headers:{
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      full_name:name,
      email:email,
      default_currency:currencyValue,
      theme:theme.toLowerCase()
    })
  });

  currency = updatedUser.default_currency || 'INR';

  await setupUserSelector();

  await loadUser();
  await loadFormData();
  await loadDashboard();

  $('settingsMessage').textContent = 'Changes saved successfully.';
}
function openModal(title,sub,body,save){$('modalTitle').textContent=title;$('modalSubtitle').textContent=sub;$('modalBody').innerHTML=body;$('modal').classList.add('show');$('modalSave').onclick=async()=>{try{$('modalSave').disabled=true;await save()}catch(e){alert(e.message)}finally{$('modalSave').disabled=false}}}function closeModal(){$('modal').classList.remove('show')}
function focusSearch(){showPage('transactions').then(()=>$('searchTransactions').focus())}async function showBillsNotice(){await showPage('bills');}
async function boot(){
  try{
    navInit();

    // const h=await api('/api/health');

    // $('connectionStatus').textContent=
    //   `MySQL connected · ${h.accounts} accounts · ${h.transactions} transactions`;

    users=await api('/api/users');

    if(!users.length){
      throw Error('No users found.');
    }

    // Start with the first user
    USER_ID=users[0].user_id;

    await setupUserSelector();

    await loadUser();
    await loadFormData();
    await loadDashboard();

  }catch(e){
    $('connectionStatus').textContent=
      'Database error: '+e.message;

    console.error(e);
  }
}
// Asset/liability endpoints are intentionally added below to keep net-worth data fully database-driven.
// async function setupUserSelector(){
//   users=await api('/api/users');

//   const selector=$('userSelector');

//   selector.innerHTML=users.map(u=>
//     `<option value="${u.user_id}">
//       ${esc(u.full_name)}
//     </option>`
//   ).join('');

//   selector.value=String(USER_ID);

//   selector.onchange=async()=>{
//     USER_ID=Number(selector.value);

//     await loadUser();
//     await loadFormData();

//     const activePage=
//       document.querySelector('.page.active')?.id?.replace('page-','')
//       || 'dashboard';

//     await showPage(activePage);
//   };
// }

boot();
