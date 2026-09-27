# Personal Finance Management Portal

This version is a clean, database-driven project. It contains no sample personal financial records.

## 1. Use the NEW database

Your old `personalfinance` database is not used by this project.

The project uses:

`finance_portal`

The included `database.sql` deliberately resets **only** `finance_portal` and creates a clean schema. It does not touch `personalfinance`.

## 2. Run the SQL

Open MySQL Workbench and open:

`database.sql`

Execute the whole file.

It creates:

- Users
- Accounts
- Categories
- Transactions
- Budgets
- SavingsGoals
- Bills
- Investments
- Assets
- Liabilities

There are no sample accounts, transactions, budgets, goals, bills, investments, assets or liabilities.

Only basic transaction categories are created because the transaction form needs category choices.

## 3. Add your own user

After executing the SQL, run this in MySQL Workbench:

```sql
USE finance_portal;

INSERT INTO Users (full_name, email)
VALUES ('YOUR NAME', 'YOUR EMAIL');
```

Replace `YOUR NAME` and `YOUR EMAIL` with your own values.

Then check:

```sql
SELECT * FROM Users;
```

## 4. Configure the Node connection

In this project folder create a file named exactly:

`.env`

Copy this into it:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=finance_portal
PORT=3000
```

Change only `YOUR_MYSQL_PASSWORD` to your local MySQL root password.

Do not change `DB_NAME`; it must be `finance_portal`.

## 5. Install packages

Open the project folder in VS Code, then Terminal > New Terminal:

```bash
npm install
```

## 6. Start

```bash
npm start
```

Open:

http://localhost:3000

Do not open `index.html` by double-clicking it. The site needs the Node/Express server to reach MySQL.

## 7. How the clean app works

- Accounts are created from the Accounts page.
- The transaction Account dropdown is populated only from the Accounts table.
- Transactions update the selected account balance.
- Deleting a transaction reverses its balance effect.
- Budgets are entered by the user and spending is calculated from transactions.
- Savings on the dashboard is calculated as current-month income minus current-month expenses.
- Goals, bills and investments are entered by the user.
- Net worth is calculated from accounts + investments + other assets - liabilities.
- Reports are calculated from stored transactions.
- The Finance Assistant answers using stored finance data.
- Settings are loaded from and saved to the Users table.

## 8. If MySQL says port 3000 is already in use

If you see `EADDRINUSE`, either use the already-running server at http://localhost:3000 or stop the old Node process before running `npm start` again.
