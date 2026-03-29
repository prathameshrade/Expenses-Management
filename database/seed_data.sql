-- Sample Data for Expense Management System

USE expense_management;

-- Insert Sample Company
INSERT INTO companies (name, country, currency) VALUES
('TechCorp Inc', 'US', 'USD');

SET @company_id = LAST_INSERT_ID();

-- Insert Sample Users (passwords are hashed with bcrypt)
-- admin123, manager123, employee123

INSERT INTO users (email, name, hashed_password, role, company_id, is_active) VALUES
('admin@company.com', 'Admin User', '$2b$12$5YfqJJx8cVZxGqZlL9K4Ke3Ypjq.vBQGqF9E8X3dE3YqZqJzIYkhu', 'admin', @company_id, TRUE);

SET @admin_id = LAST_INSERT_ID();

INSERT INTO users (email, name, hashed_password, role, company_id, is_active) VALUES
('manager@company.com', 'Manager User', '$2b$12$5YfqJJx8cVZxGqZlL9K4Ke3Ypjq.vBQGqF9E8X3dE3YqZqJzIYkhu', 'manager', @company_id, TRUE);

SET @manager_id = LAST_INSERT_ID();

INSERT INTO users (email, name, hashed_password, role, company_id, manager_id, is_active) VALUES
('employee@company.com', 'Employee User', '$2b$12$5YfqJJx8cVZxGqZlL9K4Ke3Ypjq.vBQGqF9E8X3dE3YqZqJzIYkhu', 'employee', @company_id, @manager_id, TRUE),
('john@company.com', 'John Approver', '$2b$12$5YfqJJx8cVZxGqZlL9K4Ke3Ypjq.vBQGqF9E8X3dE3YqZqJzIYkhu', 'manager', @company_id, NULL, TRUE),
('mitchell@company.com', 'Mitchell Approver', '$2b$12$5YfqJJx8cVZxGqZlL9K4Ke3Ypjq.vBQGqF9E8X3dE3YqZqJzIYkhu', 'manager', @company_id, NULL, TRUE);

-- Insert Sample Expenses
INSERT INTO expenses (employee_id, company_id, amount, currency, amount_in_base_currency, category, description, expense_date, status) VALUES
(3, @company_id, 50.00, 'USD', 50.00, 'food', 'Restaurant bill for team lunch', DATE_SUB(NOW(), INTERVAL 5 DAY), 'draft'),
(3, @company_id, 150.00, 'USD', 150.00, 'travel', 'Uber to client meeting', DATE_SUB(NOW(), INTERVAL 3 DAY), 'submitted'),
(3, @company_id, 120.00, 'USD', 120.00, 'accommodation', 'Hotel for business trip', DATE_SUB(NOW(), INTERVAL 1 DAY), 'approved'),
(4, @company_id, 75.00, 'USD', 75.00, 'miscellaneous', 'Office supplies', DATE_SUB(NOW(), INTERVAL 2 DAY), 'submitted');

-- Insert Sample Approval Rules
INSERT INTO approval_rules (company_id, name, description, min_amount, max_amount, approvers, is_sequential, is_active) VALUES
(@company_id, 'Small Expenses', 'For expenses under $100', 0, 100, JSON_ARRAY(4), TRUE, TRUE),
(@company_id, 'Medium Expenses', 'For expenses between $100 and $500', 100, 500, JSON_ARRAY(4, 5), TRUE, TRUE),
(@company_id, 'Large Expenses', 'For expenses over $500', 500, NULL, JSON_ARRAY(2, 4, 5), FALSE, TRUE);

-- Insert Sample Approvals for submitted expense
SET @expense_id = (SELECT id FROM expenses WHERE status = 'submitted' LIMIT 1);

INSERT INTO approvals (expense_id, approver_id, approval_order, status) VALUES
(@expense_id, 4, 1, 'pending');

-- Insert Approval History
INSERT INTO approval_history (approval_id, action, comments) VALUES
(1, 'pending', 'Waiting for approval');

-- Verify data insertion
SELECT 'Companies' as table_name, COUNT(*) as count FROM companies
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'Approval Rules', COUNT(*) FROM approval_rules
UNION ALL
SELECT 'Approvals', COUNT(*) FROM approvals;