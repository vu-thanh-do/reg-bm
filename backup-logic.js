/**
 * Backup Logic - Lưu thông tin account vào file .txt để backup
 * Chạy: node backup-logic.js hoặc được gọi từ main.js
 */

const fs = require('fs');
const path = require('path');

class BackupLogic {
    constructor(backupDir = './backups') {
        this.backupDir = backupDir;
        this.ensureBackupDirectory();
    }

    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
            console.log('✅ Đã tạo thư mục backup:', this.backupDir);
        }
    }

    /**
     * Lưu account thành công hoàn chỉnh vào file backup .txt
     * @param {Object} accountData - Dữ liệu account (chỉ khi bcProcessCompleted = true)
     * @returns {Promise<boolean>} - true nếu lưu thành công
     */
    async saveSuccessfulAccount(accountData) {
        try {
            // Chỉ lưu khi thực sự thành công hoàn chỉnh
            if (accountData.status !== 'Success' || !accountData.bcProcessCompleted) {
                console.log('⚠️ Bỏ qua backup - account chưa hoàn thành:', accountData.status);
                return false;
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup_${timestamp}.txt`;
            const filePath = path.join(this.backupDir, filename);

            // Format dữ liệu để lưu
            const backupContent = this.formatAccountData(accountData);

            // Lưu vào file .txt
            fs.writeFileSync(filePath, backupContent, 'utf8');

            console.log('✅ Đã backup account thành công vào:', filePath);

            // Cũng append vào file tổng hợp
            await this.appendToMasterBackup(accountData);

            return true;

        } catch (error) {
            console.error('❌ Lỗi khi backup account:', error.message);
            return false;
        }
    }

    /**
     * Append vào file backup tổng hợp
     * @param {Object} accountData - Dữ liệu account
     */
    async appendToMasterBackup(accountData) {
        try {
            const masterFile = path.join(this.backupDir, 'all_accounts_backup.txt');
            const content = this.formatAccountDataOneLine(accountData) + '\n';

            // Append vào file master
            fs.appendFileSync(masterFile, content, 'utf8');

            console.log('✅ Đã append vào file backup tổng hợp');

        } catch (error) {
            console.error('❌ Lỗi khi append vào master backup:', error.message);
        }
    }

    /**
     * Format dữ liệu account thành nội dung file .txt chi tiết
     * @param {Object} data - Dữ liệu account
     * @returns {string} - Nội dung đã format
     */
    formatAccountData(data) {
        const timestamp = new Date().toLocaleString('vi-VN');

        return `
=== BACKUP ACCOUNT TIKTOK BUSINESS CENTER (HOÀN THÀNH) ===
Thời gian: ${timestamp}
Status: ${data.status}
BC Process Completed: ${data.bcProcessCompleted ? 'YES' : 'NO'}
Message: ${data.message}

=== THÔNG TIN ĐĂNG KÝ ===
Email: ${data.email || 'N/A'}
Password: ${data.password || 'N/A'}
Phone: ${data.phone || 'N/A'}
Company Name: ${data.companyName || 'N/A'}
Company Website: ${data.companyWebsite || 'N/A'}

=== THÔNG TIN BC TYPE ===
Account Type (User chọn): ${data.accountType || 'N/A'}
Billing Type (Auto detect): ${data.billingType || 'N/A'}
BC Type (Combined): ${data.bcType || 'N/A'}

=== THÔNG TIN KỸ THUẬT ===
Thread ID: ${data.threadId || 'N/A'}
Proxy: ${data.proxy || 'N/A'}
User Agent: ${data.userAgent || 'N/A'}
Execution Time: ${data.executionTime || 'N/A'}

=== LOG CHI TIẾT ===
${data.detailLog || 'Không có log chi tiết'}

=== KẾT THÚC BACKUP ===
        `.trim();
    }

    /**
     * Format dữ liệu account thành 1 dòng cho file tổng hợp
     * @param {Object} data - Dữ liệu account
     * @returns {string} - Dữ liệu 1 dòng
     */
    formatAccountDataOneLine(data) {
        const timestamp = new Date().toISOString();
        return `${timestamp}|${data.status}|${data.bcProcessCompleted ? 'YES' : 'NO'}|${data.email}|${data.password}|${data.phone}|${data.companyName}|${data.accountType || 'N/A'}|${data.billingType || 'N/A'}|${data.bcType}|${data.message}`;
    }

    /**
     * Đọc tất cả backup accounts
     * @returns {Array} - Danh sách accounts từ backup
     */
    readAllBackupAccounts() {
        try {
            const masterFile = path.join(this.backupDir, 'all_accounts_backup.txt');

            if (!fs.existsSync(masterFile)) {
                console.log('⚠️ Chưa có file backup nào');
                return [];
            }

            const content = fs.readFileSync(masterFile, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());

            return lines.map(line => {
                const parts = line.split('|');
                // Handle both old format (8 parts) and new format (10 parts)
                if (parts.length >= 10) {
                    return {
                        timestamp: parts[0],
                        status: parts[1],
                        bcProcessCompleted: parts[2] === 'YES',
                        email: parts[3],
                        password: parts[4],
                        phone: parts[5],
                        companyName: parts[6],
                        accountType: parts[7],
                        billingType: parts[8],
                        bcType: parts[9],
                        message: parts[10]
                    };
                } else {
                    // Fallback to old format
                    return {
                        timestamp: parts[0],
                        status: parts[1],
                        bcProcessCompleted: parts[2] === 'YES',
                        email: parts[3],
                        password: parts[4],
                        phone: parts[5],
                        companyName: parts[6],
                        accountType: 'N/A',
                        billingType: 'N/A',
                        bcType: parts[7],
                        message: parts[8]
                    };
                }
            });

        } catch (error) {
            console.error('❌ Lỗi khi đọc backup:', error.message);
            return [];
        }
    }

    /**
     * Thống kê backup
     * @returns {Object} - Thống kê
     */
    getBackupStats() {
        const accounts = this.readAllBackupAccounts();

        const completedAccounts = accounts.filter(acc => acc.status === 'Success' && acc.bcProcessCompleted);

        const stats = {
            total: accounts.length,
            completed: completedAccounts.length,
            successful: accounts.filter(acc => acc.status === 'Success').length,
            failed: accounts.filter(acc => acc.status !== 'Success').length,
            byAccountType: {},
            byBillingType: {},
            byBcType: {}
        };

        // Thống kê theo Account Type (chỉ tính completed)
        completedAccounts.forEach(acc => {
            if (acc.accountType && acc.accountType !== 'N/A') {
                stats.byAccountType[acc.accountType] = (stats.byAccountType[acc.accountType] || 0) + 1;
            }
        });

        // Thống kê theo Billing Type (chỉ tính completed)
        completedAccounts.forEach(acc => {
            if (acc.billingType && acc.billingType !== 'N/A') {
                stats.byBillingType[acc.billingType] = (stats.byBillingType[acc.billingType] || 0) + 1;
            }
        });

        // Thống kê theo BC Type Combined (chỉ tính completed)
        completedAccounts.forEach(acc => {
            if (acc.bcType) {
                stats.byBcType[acc.bcType] = (stats.byBcType[acc.bcType] || 0) + 1;
            }
        });

        return stats;
    }

    /**
     * Export backup ra Excel (nếu cần)
     * @param {string} excelPath - Đường dẫn file Excel
     */
    exportToExcel(excelPath) {
        try {
            const accounts = this.readAllBackupAccounts();

            if (accounts.length === 0) {
                console.log('⚠️ Không có dữ liệu backup để export');
                return false;
            }

            // Sử dụng XLSX như logic cũ nhưng an toàn hơn
            const XLSX = require('xlsx');
            const ws = XLSX.utils.json_to_sheet(accounts);
            const wb = XLSX.utils.book_new();
            wb.Sheets['Backup_Accounts'] = ws;
            wb.SheetNames = ['Backup_Accounts'];

            XLSX.writeFile(wb, excelPath);
            console.log('✅ Đã export backup ra Excel:', excelPath);
            return true;

        } catch (error) {
            console.error('❌ Lỗi khi export ra Excel:', error.message);
            return false;
        }
    }
}

module.exports = BackupLogic;

// Test nếu chạy trực tiếp
if (require.main === module) {
    const backup = new BackupLogic();

    // Test data
    const testAccount = {
        status: 'Success',
        email: 'test@example.com',
        password: 'test123',
        phone: '0901234567',
        companyName: 'Test Company',
        bcType: 'Agency',
        message: 'Đăng ký thành công!',
        threadId: 1,
        executionTime: '2 minutes'
    };

    backup.saveSuccessfulAccount(testAccount);
    console.log('Stats:', backup.getBackupStats());
}