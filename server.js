const express=require('express');
const mysql=require('mysql2/promise');
const path=require('path');
require('dotenv').config();
const app=express();
app.use(express.json());
app.use(express.static(__dirname));
const pool=mysql.createPool({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,waitForConnections:true,connectionLimit:10,dateStrings:true});
const fail=(res,e)=>{console.error(e);res.status(500).json({error:e.code?`${e.code}: ${e.message}`:e.message});};
const uid=req=>Number(req.query.user_id??req.body.user_id);
app.get('/api/health',async(req,res)=>{try{const [[db]]=await pool.query('SELECT DATABASE() database_name');const [[u]]=await pool.query('SELECT COUNT(*) total FROM Users');const [[a]]=await pool.query('SELECT COUNT(*) total FROM Accounts');const [[t]]=await pool.query('SELECT COUNT(*) total FROM Transactions');res.json({ok:true,database:db.database_name,users:u.total,accounts:a.total,transactions:t.total});}catch(e){fail(res,e);}});
app.get('/api/users',async(req,res)=>{try{const [r]=await pool.query('SELECT user_id,full_name,email,default_currency,theme FROM Users ORDER BY user_id');res.json(r);}catch(e){fail(res,e);}});
app.post('/api/users', async (req, res) => {
  try {
    const name = String(req.body.full_name || '').trim();
    const email = String(req.body.email || '').trim();

    if (!name || !email) {
      return res.status(400).json({
        error: 'Enter full name and email.'
      });
    }

    const [r] = await pool.query(
      `INSERT INTO Users
       (full_name, email, default_currency, theme)
       VALUES (?, ?, ?, ?)`,
      [name, email, 'INR', 'light']
    );

    const [[user]] = await pool.query(
      `SELECT user_id, full_name, email, default_currency, theme
       FROM Users
       WHERE user_id = ?`,
      [r.insertId]
    );

    res.status(201).json(user);

  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        error: 'This email is already registered.'
      });
    }

    fail(res, e);
  }
});
app.get('/api/user/:id',async(req,res)=>{try{const [r]=await pool.query('SELECT user_id,full_name,email,default_currency,theme FROM Users WHERE user_id=?',[Number(req.params.id)]);if(!r.length)return res.status(404).json({error:'User not found.'});res.json(r[0]);}catch(e){fail(res,e);}});
app.put('/api/user/:id',async(req,res)=>{try{await pool.query('UPDATE Users SET full_name=?,email=?,default_currency=?,theme=? WHERE user_id=?',[String(req.body.full_name||'').trim(),String(req.body.email||'').trim(),String(req.body.default_currency||'INR'),String(req.body.theme||'Light'),Number(req.params.id)]);res.json({message:'Settings saved.'});}catch(e){fail(res,e);}});
app.get('/api/categories',async(req,res)=>{try{const [r]=await pool.query('SELECT category_id,category_name,category_type FROM Categories ORDER BY category_type,category_name');res.json(r);}catch(e){fail(res,e);}});
app.get('/api/accounts',async(req,res)=>{try{const [r]=await pool.query('SELECT account_id,account_name,account_type,balance FROM Accounts WHERE user_id=? ORDER BY account_name',[uid(req)]);res.json(r);}catch(e){fail(res,e);}});
app.post('/api/accounts',async(req,res)=>{try{const user=uid(req),name=String(req.body.account_name||'').trim(),type=String(req.body.account_type||'').trim(),balance=Number(req.body.balance);if(!user||!name||!type||!Number.isFinite(balance))return res.status(400).json({error:'Enter account name, type and valid balance.'});const [r]=await pool.query('INSERT INTO Accounts(user_id,account_name,account_type,balance) VALUES(?,?,?,?)',[user,name,type,balance]);res.status(201).json({id:r.insertId});}catch(e){fail(res,e);}});
app.put('/api/accounts/:id',async(req,res)=>{try{await pool.query('UPDATE Accounts SET account_name=?,account_type=?,balance=? WHERE account_id=? AND user_id=?',[String(req.body.account_name||'').trim(),String(req.body.account_type||'').trim(),Number(req.body.balance),Number(req.params.id),uid(req)]);res.json({message:'Account updated.'});}catch(e){fail(res,e);}});
app.delete('/api/accounts/:id',async(req,res)=>{try{const user=uid(req),id=Number(req.params.id);const [[x]]=await pool.query('SELECT COUNT(*) total FROM Transactions WHERE account_id=? AND user_id=?',[id,user]);if(Number(x.total))return res.status(400).json({error:'This account has transactions and cannot be deleted.'});await pool.query('DELETE FROM Accounts WHERE account_id=? AND user_id=?',[id,user]);res.json({message:'Account deleted.'});}catch(e){fail(res,e);}});
app.get('/api/transactions',async(req,res)=>{try{const [r]=await pool.query(`SELECT t.transaction_id,t.amount,t.transaction_type,t.description,t.transaction_date,DATE_FORMAT(t.transaction_date,'%d %b %Y') formatted_date,c.category_name,a.account_name FROM Transactions t LEFT JOIN Categories c ON t.category_id=c.category_id LEFT JOIN Accounts a ON t.account_id=a.account_id WHERE t.user_id=? ORDER BY t.transaction_date DESC,t.transaction_id DESC`,[uid(req)]);res.json(r);}catch(e){fail(res,e);}});
app.post('/api/transactions',async(req,res)=>{const c=await pool.getConnection();try{const user=uid(req),account=Number(req.body.account_id),category=Number(req.body.category_id),amount=Number(req.body.amount),type=String(req.body.transaction_type||''),date=req.body.transaction_date,desc=String(req.body.description||'').trim();if(!user||!account||!category||!Number.isFinite(amount)||amount<=0||!date||!['Income','Expense'].includes(type))return res.status(400).json({error:'Enter valid transaction details.'});const [[a]]=await c.query('SELECT account_id FROM Accounts WHERE account_id=? AND user_id=?',[account,user]);if(!a)return res.status(400).json({error:'Selected account was not found.'});const [[cat]]=await c.query('SELECT category_type FROM Categories WHERE category_id=?',[category]);if(!cat)return res.status(400).json({error:'Selected category was not found.'});if(cat.category_type!==type)return res.status(400).json({error:`Select an ${type} category.`});await c.beginTransaction();const [r]=await c.query('INSERT INTO Transactions(user_id,account_id,category_id,amount,transaction_type,description,transaction_date) VALUES(?,?,?,?,?,?,?)',[user,account,category,amount,type,desc||null,date]);await c.query('UPDATE Accounts SET balance=balance+? WHERE account_id=? AND user_id=?',[type==='Income'?amount:-amount,account,user]);await c.commit();res.status(201).json({id:r.insertId});}catch(e){await c.rollback();fail(res,e);}finally{c.release();}});
app.delete('/api/transactions/:id',async(req,res)=>{const c=await pool.getConnection();try{const user=uid(req),id=Number(req.params.id);const [[t]]=await c.query('SELECT account_id,amount,transaction_type FROM Transactions WHERE transaction_id=? AND user_id=?',[id,user]);if(!t)return res.status(404).json({error:'Transaction not found.'});await c.beginTransaction();await c.query('UPDATE Accounts SET balance=balance+? WHERE account_id=? AND user_id=?',[t.transaction_type==='Income'?-Number(t.amount):Number(t.amount),t.account_id,user]);await c.query('DELETE FROM Transactions WHERE transaction_id=? AND user_id=?',[id,user]);await c.commit();res.json({message:'Deleted.'});}catch(e){await c.rollback();fail(res,e);}finally{c.release();}});
app.get('/api/dashboard',async(req,res)=>{try{const user=uid(req);const [[b]]=await pool.query('SELECT COALESCE(SUM(balance),0) total FROM Accounts WHERE user_id=?',[user]);const [[i]]=await pool.query("SELECT COALESCE(SUM(amount),0) total FROM Transactions WHERE user_id=? AND transaction_type='Income' AND YEAR(transaction_date)=YEAR(CURDATE()) AND MONTH(transaction_date)=MONTH(CURDATE())",[user]);const [[x]]=await pool.query("SELECT COALESCE(SUM(amount),0) total FROM Transactions WHERE user_id=? AND transaction_type='Expense' AND YEAR(transaction_date)=YEAR(CURDATE()) AND MONTH(transaction_date)=MONTH(CURDATE())",[user]);const savings=Number(i.total)-Number(x.total);res.json({balance:Number(b.total),income:Number(i.total),expenses:Number(x.total),savings});}catch(e){fail(res,e);}});
app.get('/api/dashboard/monthly',async(req,res)=>{try{const [r]=await pool.query(`SELECT DATE_FORMAT(transaction_date,'%Y-%m') month,COALESCE(SUM(CASE WHEN transaction_type='Income' THEN amount ELSE 0 END),0) income,COALESCE(SUM(CASE WHEN transaction_type='Expense' THEN amount ELSE 0 END),0) expenses FROM Transactions WHERE user_id=? AND transaction_date>=DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'),INTERVAL 5 MONTH) GROUP BY month ORDER BY month`,[uid(req)]);res.json(r);}catch(e){fail(res,e);}});
app.get('/api/dashboard/categories',async(req,res)=>{try{const [r]=await pool.query(`SELECT c.category_name,COALESCE(SUM(t.amount),0) total FROM Transactions t JOIN Categories c ON t.category_id=c.category_id WHERE t.user_id=? AND t.transaction_type='Expense' AND YEAR(t.transaction_date)=YEAR(CURDATE()) AND MONTH(t.transaction_date)=MONTH(CURDATE()) GROUP BY c.category_id,c.category_name ORDER BY total DESC`,[uid(req)]);res.json(r);}catch(e){fail(res,e);}});
app.get('/api/budgets',async(req,res)=>{
  try{
    const [r]=await pool.query(`
      SELECT
        b.budget_id,
        b.category_id,
        b.amount,
        b.month_year,
        c.category_name,
        COALESCE((
          SELECT SUM(t.amount)
          FROM Transactions t
          WHERE t.user_id=b.user_id
            AND t.category_id=b.category_id
            AND t.transaction_type='Expense'
            AND DATE_FORMAT(t.transaction_date,'%Y-%m')=b.month_year
        ),0) AS spent
      FROM Budgets b
      JOIN Categories c ON b.category_id=c.category_id
      WHERE b.user_id=?
      ORDER BY b.month_year DESC,c.category_name
    `,[uid(req)]);

    res.json(r);
  }catch(e){
    fail(res,e);
  }
});
app.post('/api/budgets',async(req,res)=>{
  try{
    const [r]=await pool.query(
      'INSERT INTO Budgets(user_id,category_id,amount,month_year) VALUES(?,?,?,?)',
      [
        uid(req),
        Number(req.body.category_id),
        Number(req.body.amount),
        req.body.month_year
      ]
    );

    res.status(201).json({id:r.insertId});
  }catch(e){
    fail(res,e);
  }
});
app.delete('/api/budgets/:id',async(req,res)=>{try{await pool.query('DELETE FROM Budgets WHERE budget_id=? AND user_id=?',[Number(req.params.id),uid(req)]);res.json({message:'Deleted.'});}catch(e){fail(res,e);}});
app.get('/api/goals',async(req,res)=>{try{const [r]=await pool.query('SELECT * FROM SavingsGoals WHERE user_id=? ORDER BY target_date',[uid(req)]);res.json(r);}catch(e){fail(res,e);}});
app.post('/api/goals',async(req,res)=>{
  try{
    const [r]=await pool.query(
      'INSERT INTO SavingsGoals(user_id,goal_name,target_amount,saved_amount,target_date) VALUES(?,?,?,?,?)',
      [
        uid(req),
        String(req.body.goal_name||'').trim(),
        Number(req.body.target_amount),
        Number(req.body.saved_amount||0),
        req.body.target_date||null
      ]
    );

    res.status(201).json({id:r.insertId});
  }catch(e){
    fail(res,e);
  }
});
app.put('/api/goals/:id',async(req,res)=>{
  try{
    await pool.query(
      'UPDATE SavingsGoals SET goal_name=?,target_amount=?,saved_amount=?,target_date=? WHERE goal_id=? AND user_id=?',
      [
        String(req.body.goal_name||'').trim(),
        Number(req.body.target_amount),
        Number(req.body.saved_amount||0),
        req.body.target_date||null,
        Number(req.params.id),
        uid(req)
      ]
    );

    res.json({message:'Updated.'});
  }catch(e){
    fail(res,e);
  }
});
app.delete('/api/goals/:id',async(req,res)=>{try{await pool.query('DELETE FROM SavingsGoals WHERE goal_id=? AND user_id=?',[Number(req.params.id),uid(req)]);res.json({message:'Deleted.'});}catch(e){fail(res,e);}});
app.get('/api/bills',async(req,res)=>{
  try{
    const [r]=await pool.query(
      'SELECT * FROM Bills WHERE user_id=? ORDER BY due_date',
      [uid(req)]
    );

    res.json(r);
  }catch(e){
    fail(res,e);
  }
});
app.post('/api/bills',async(req,res)=>{
  try{
    const [r]=await pool.query(
      'INSERT INTO Bills(user_id,bill_name,amount,due_date,frequency,status) VALUES(?,?,?,?,?,?)',
      [
        uid(req),
        String(req.body.bill_name||'').trim(),
        Number(req.body.amount),
        req.body.due_date||null,
        String(req.body.frequency||'Monthly'),
        String(req.body.status||'Pending')
      ]
    );

    res.status(201).json({id:r.insertId});
  }catch(e){
    fail(res,e);
  }
});
app.put('/api/bills/:id',async(req,res)=>{
  try{
    await pool.query(
      'UPDATE Bills SET bill_name=?,amount=?,due_date=?,frequency=?,status=? WHERE bill_id=? AND user_id=?',
      [
        String(req.body.bill_name||'').trim(),
        Number(req.body.amount),
        req.body.due_date||null,
        String(req.body.frequency||'Monthly'),
        String(req.body.status||'Pending'),
        Number(req.params.id),
        uid(req)
      ]
    );

    res.json({message:'Updated.'});
  }catch(e){
    fail(res,e);
  }
});
app.delete('/api/bills/:id',async(req,res)=>{
  try{
    await pool.query(
      'DELETE FROM Bills WHERE bill_id=? AND user_id=?',
      [
        Number(req.params.id),
        uid(req)
      ]
    );

    res.json({message:'Deleted.'});
  }catch(e){
    fail(res,e);
  }
});
app.get('/api/investments',async(req,res)=>{try{const [r]=await pool.query('SELECT * FROM Investments WHERE user_id=? ORDER BY investment_date DESC',[uid(req)]);res.json(r);}catch(e){fail(res,e);}});
app.post('/api/investments',async(req,res)=>{try{const [r]=await pool.query('INSERT INTO Investments(user_id,investment_name,investment_type,invested_amount,current_value,investment_date) VALUES(?,?,?,?,?,?)',[uid(req),String(req.body.investment_name||'').trim(),String(req.body.investment_type||'').trim(),Number(req.body.invested_amount),Number(req.body.current_value),req.body.investment_date||null]);res.status(201).json({id:r.insertId});}catch(e){fail(res,e);}});
app.put('/api/investments/:id',async(req,res)=>{try{await pool.query('UPDATE Investments SET investment_name=?,investment_type=?,invested_amount=?,current_value=?,investment_date=? WHERE investment_id=? AND user_id=?',[String(req.body.investment_name||'').trim(),String(req.body.investment_type||'').trim(),Number(req.body.invested_amount),Number(req.body.current_value),req.body.investment_date||null,Number(req.params.id),uid(req)]);res.json({message:'Updated.'});}catch(e){fail(res,e);}});
app.delete('/api/investments/:id',async(req,res)=>{try{await pool.query('DELETE FROM Investments WHERE investment_id=? AND user_id=?',[Number(req.params.id),uid(req)]);res.json({message:'Deleted.'});}catch(e){fail(res,e);}});
app.get('/api/networth',async(req,res)=>{
  try{
    const user=uid(req);

    const [[a]]=await pool.query(
      'SELECT COALESCE(SUM(balance),0) total FROM Accounts WHERE user_id=?',
      [user]
    );

    const [[i]]=await pool.query(
      'SELECT COALESCE(SUM(current_value),0) total FROM Investments WHERE user_id=?',
      [user]
    );

    const [[o]]=await pool.query(
      'SELECT COALESCE(SUM(value),0) total FROM Assets WHERE user_id=?',
      [user]
    );

    const [[l]]=await pool.query(
      'SELECT COALESCE(SUM(amount),0) total FROM Liabilities WHERE user_id=?',
      [user]
    );

    res.json({
      bank:Number(a.total),
      investments:Number(i.total),
      otherAssets:Number(o.total),
      liabilities:Number(l.total),
      assets:
        Number(a.total)+
        Number(i.total)+
        Number(o.total),
      netWorth:
        Number(a.total)+
        Number(i.total)+
        Number(o.total)-
        Number(l.total)
    });

  }catch(e){
    fail(res,e);
  }
});
app.get('/api/reports',async(req,res)=>{try{const user=uid(req);const [monthly]=await pool.query(`SELECT DATE_FORMAT(transaction_date,'%Y-%m') month,COALESCE(SUM(CASE WHEN transaction_type='Income' THEN amount ELSE 0 END),0) income,COALESCE(SUM(CASE WHEN transaction_type='Expense' THEN amount ELSE 0 END),0) expenses FROM Transactions WHERE user_id=? GROUP BY month ORDER BY month DESC LIMIT 12`,[user]);const [categories]=await pool.query(`SELECT c.category_name,COALESCE(SUM(t.amount),0) total FROM Transactions t JOIN Categories c ON t.category_id=c.category_id WHERE t.user_id=? AND t.transaction_type='Expense' AND YEAR(t.transaction_date)=YEAR(CURDATE()) AND MONTH(t.transaction_date)=MONTH(CURDATE()) GROUP BY c.category_id,c.category_name ORDER BY total DESC`,[user]);res.json({monthly,categories});}catch(e){fail(res,e);}});
app.get('/api/assistant',async(req,res)=>{
  try{
    const user=uid(req);
    const q=String(req.query.q||'').toLowerCase();

    let answer='Ask about your spending, savings, budget, bills or investments.';

    if(q.includes('most')||q.includes('spend')){
      const [r]=await pool.query(`
        SELECT c.category_name,SUM(t.amount) total
        FROM Transactions t
        JOIN Categories c ON t.category_id=c.category_id
        WHERE t.user_id=?
          AND t.transaction_type='Expense'
          AND YEAR(t.transaction_date)=YEAR(CURDATE())
          AND MONTH(t.transaction_date)=MONTH(CURDATE())
        GROUP BY c.category_id,c.category_name
        ORDER BY total DESC
        LIMIT 1
      `,[user]);

      answer=r.length
        ? `Your largest expense category this month is ${r[0].category_name} at ${Number(r[0].total).toLocaleString('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0})}.`
        : 'There are no expenses recorded this month.';

    }else if(q.includes('save')){
      const [[r]]=await pool.query(`
        SELECT COALESCE(
          SUM(CASE WHEN transaction_type='Income' THEN amount ELSE -amount END),0
        ) total
        FROM Transactions
        WHERE user_id=?
          AND YEAR(transaction_date)=YEAR(CURDATE())
          AND MONTH(transaction_date)=MONTH(CURDATE())
      `,[user]);

      answer=`Your savings for this month are ${Number(r.total).toLocaleString('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0})}.`;

    }else if(q.includes('bill')){
      const [r]=await pool.query(`
        SELECT bill_name,amount,due_date
        FROM Bills
        WHERE user_id=?
          AND active=1
          AND due_date>=CURDATE()
        ORDER BY due_date
        LIMIT 5
      `,[user]);

      answer=r.length
        ? 'Upcoming bills: '+r.map(x=>
            `${x.bill_name} ${Number(x.amount).toLocaleString('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0})} due ${x.due_date}`
          ).join('; ')
        : 'No upcoming bills are recorded.';

    }else if(q.includes('budget')){
      const [r]=await pool.query(`
        SELECT
          c.category_name,
          b.amount,
          COALESCE((
            SELECT SUM(t.amount)
            FROM Transactions t
            WHERE t.user_id=b.user_id
              AND t.category_id=b.category_id
              AND t.transaction_type='Expense'
              AND DATE_FORMAT(t.transaction_date,'%Y-%m')=b.month_year
          ),0) spent
        FROM Budgets b
        JOIN Categories c ON b.category_id=c.category_id
        WHERE b.user_id=?
          AND b.month_year=DATE_FORMAT(CURDATE(),'%Y-%m')
      `,[user]);

      answer=r.length
        ? 'Current budgets: '+r.map(x=>
            `${x.category_name}: ${Number(x.spent).toLocaleString('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0})} of ${Number(x.amount).toLocaleString('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0})}`
          ).join('; ')
        : 'No budget has been created for this month.';
    }

    res.json({answer});

  }catch(e){
    fail(res,e);
  }
});
app.get('/api/assets',async(req,res)=>{try{const [r]=await pool.query('SELECT * FROM Assets WHERE user_id=? ORDER BY asset_id',[Number(req.query.user_id)]);res.json(r)}catch(e){fail(res,e)}});
app.post('/api/assets',async(req,res)=>{try{const [r]=await pool.query('INSERT INTO Assets(user_id,asset_name,amount) VALUES(?,?,?)',[Number(req.body.user_id),String(req.body.asset_name||'').trim(),Number(req.body.amount)]);res.status(201).json({id:r.insertId})}catch(e){fail(res,e)}});
app.get('/api/liabilities',async(req,res)=>{try{const [r]=await pool.query('SELECT * FROM Liabilities WHERE user_id=? ORDER BY liability_id',[Number(req.query.user_id)]);res.json(r)}catch(e){fail(res,e)}});
app.post('/api/liabilities',async(req,res)=>{try{const [r]=await pool.query('INSERT INTO Liabilities(user_id,liability_name,amount) VALUES(?,?,?)',[Number(req.body.user_id),String(req.body.liability_name||'').trim(),Number(req.body.amount)]);res.status(201).json({id:r.insertId})}catch(e){fail(res,e)}});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));
const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log(`Finance Portal running at http://localhost:${PORT}`));
