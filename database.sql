-- ============================================================
-- PERSONAL FINANCE PORTAL - CLEAN DATABASE
-- ============================================================
-- IMPORTANT:
-- This resets ONLY the finance_portal database.
-- It does NOT touch your old personalfinance database.
-- There are NO sample accounts, transactions, budgets, goals,
-- bills, investments, assets or liabilities inserted here.
-- ============================================================

DROP DATABASE IF EXISTS finance_portal;
CREATE DATABASE finance_portal;
USE finance_portal;

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE Users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    default_currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    theme VARCHAR(20) NOT NULL DEFAULT 'Light',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ACCOUNTS
-- ============================================================

CREATE TABLE Accounts (
    account_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_accounts_user (user_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- CATEGORIES
-- These are system choices needed by the transaction form.
-- They are NOT personal/sample financial records.
-- ============================================================

CREATE TABLE Categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL,
    category_type ENUM('Income','Expense') NOT NULL,
    UNIQUE KEY uq_category (category_name, category_type)
);

INSERT INTO Categories (category_name, category_type) VALUES
('Salary', 'Income'),
('Food', 'Expense'),
('Transport', 'Expense'),
('Shopping', 'Expense'),
('Bills', 'Expense'),
('Entertainment', 'Expense'),
('Healthcare', 'Expense'),
('Education', 'Expense'),
('Travel', 'Expense'),
('Other', 'Expense');

-- ============================================================
-- TRANSACTIONS
-- ============================================================

CREATE TABLE Transactions (
    transaction_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    category_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    transaction_type ENUM('Income','Expense') NOT NULL,
    description VARCHAR(255),
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_transactions_user (user_id),
    INDEX idx_transactions_account (account_id),
    INDEX idx_transactions_category (category_id),
    INDEX idx_transactions_date (transaction_date),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES Accounts(account_id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE RESTRICT
);

-- ============================================================
-- BUDGETS
-- ============================================================

CREATE TABLE Budgets (
    budget_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    budget_amount DECIMAL(15,2) NOT NULL,
    budget_month DATE NOT NULL,
    INDEX idx_budgets_user (user_id),
    INDEX idx_budgets_month (budget_month),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE CASCADE
);

-- ============================================================
-- SAVINGS GOALS
-- ============================================================

CREATE TABLE SavingsGoals (
    goal_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    goal_name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    target_date DATE NULL,
    INDEX idx_goals_user (user_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- BILLS / SUBSCRIPTIONS
-- ============================================================

CREATE TABLE Bills (
    bill_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    bill_name VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE NOT NULL,
    frequency VARCHAR(30) NOT NULL DEFAULT 'Monthly',
    bill_type VARCHAR(50) NOT NULL DEFAULT 'Bill',
    active TINYINT(1) NOT NULL DEFAULT 1,
    INDEX idx_bills_user (user_id),
    INDEX idx_bills_due (due_date),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- INVESTMENTS
-- ============================================================

CREATE TABLE Investments (
    investment_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    investment_name VARCHAR(100) NOT NULL,
    investment_type VARCHAR(50) NOT NULL,
    invested_amount DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) NOT NULL,
    investment_date DATE NULL,
    INDEX idx_investments_user (user_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- OTHER ASSETS
-- ============================================================

CREATE TABLE Assets (
    asset_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    asset_name VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    INDEX idx_assets_user (user_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- LIABILITIES
-- ============================================================

CREATE TABLE Liabilities (
    liability_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    liability_name VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    INDEX idx_liabilities_user (user_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- STOP HERE after executing the schema.
-- Then add YOUR OWN user using the template below.
-- Replace the two placeholders with your own details.
-- ============================================================

-- INSERT INTO Users (full_name, email)
-- VALUES ('YOUR NAME', 'YOUR EMAIL');

-- Check the clean database:
-- SELECT * FROM Users;
-- SELECT * FROM Accounts;
-- SELECT * FROM Transactions;
-- SELECT * FROM Budgets;
-- SELECT * FROM SavingsGoals;
-- SELECT * FROM Bills;
-- SELECT * FROM Investments;
-- SELECT * FROM Assets;
-- SELECT * FROM Liabilities;
