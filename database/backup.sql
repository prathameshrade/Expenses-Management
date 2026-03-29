-- Backup Script for Expense Management Database
-- Usage: mysql -u root -p < backup.sql > expense_management_backup_$(date +%Y%m%d_%H%M%S).sql

-- Export with mysqldump:
-- mysqldump -u root -p --all-databases > backup_all_$(date +%Y%m%d_%H%M%S).sql
-- mysqldump -u root -p expense_management > expense_backup_$(date +%Y%m%d_%H%M%S).sql

-- Backup command (run from terminal):
-- mysqldump -u root -p expense_management --single-transaction --quick --lock-tables=false > backup_$(date +%Y%m%d_%H%M%S).sql

-- Restore command:
-- mysql -u root -p expense_management < backup_$(date +%Y%m%d_%H%M%S).sql

-- Check backup integrity:
-- mysqlcheck -u root -p --all-databases

-- View backup size:
-- du -sh backup_*.sql