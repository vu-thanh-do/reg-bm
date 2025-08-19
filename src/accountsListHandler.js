const { randomDelay } = require('./utils');
const BcHandler = require('./bcHandler');
const BcAgencyHandler = require('./bcAgencyHandler');

class AccountsListHandler {
    constructor(page, userConfig) {
        this.page = page;
        this.userConfig = userConfig;
        this.orgId = null;
    }

    async execute() {
        console.log('=== BẮT ĐẦU XỬ LÝ ACCOUNTS LIST ===');

        try {
            // 1. Lấy org_id từ URL hiện tại
            await this.extractOrgId();

            // 2. Chờ trang load hoàn toàn
            await this.waitForPageLoad();

            // 3. Debug thông tin trang
            await this.debugPageInfo();

            // 4. Xử lý logic chính
            await this.handleAccountsList();

            console.log('=== HOÀN THÀNH XỬ LÝ ACCOUNTS LIST ===');

        } catch (error) {
            console.error('Lỗi trong AccountsListHandler:', error.message);
            throw error;
        }
    }

    async extractOrgId() {
        console.log('Đang lấy org_id từ URL...');

        try {
            const currentUrl = await this.page.url();
            const urlMatch = currentUrl.match(/org_id=(\d+)/);

            if (!urlMatch) {
                throw new Error('Không tìm thấy org_id trong URL: ' + currentUrl);
            }

            this.orgId = urlMatch[1];
            console.log('✅ Đã lấy org_id:', this.orgId);

        } catch (error) {
            console.error('Lỗi khi lấy org_id:', error.message);
            throw error;
        }
    }

    async waitForPageLoad() {
        console.log('Đang chờ trang load hoàn toàn...');

        try {
            // Chờ cho đến khi trang load hoàn toàn
            await this.page.waitForFunction(() => {
                return document.readyState === 'complete';
            }, { timeout: 30000 });

            // Chờ thêm để đảm bảo các element đã render
            await randomDelay(3000, 5000);

            console.log('✅ Trang đã load hoàn toàn');

        } catch (error) {
            console.error('Lỗi khi chờ trang load:', error.message);
            throw error;
        }
    }

    async debugPageInfo() {
        console.log('=== DEBUG: Thông tin trang Accounts List ===');

        try {
            const pageInfo = await this.page.evaluate(() => {
                const inputs = document.querySelectorAll('input');
                const buttons = document.querySelectorAll('button');
                const tables = document.querySelectorAll('table');
                const links = document.querySelectorAll('a');

                const inputInfo = Array.from(inputs).map((input, index) => ({
                    index,
                    type: input.type,
                    placeholder: input.placeholder,
                    className: input.className,
                    id: input.id,
                    name: input.name
                }));

                const buttonInfo = Array.from(buttons).map((button, index) => ({
                    index,
                    text: button.textContent.trim(),
                    className: button.className,
                    type: button.type
                }));

                const tableInfo = Array.from(tables).map((table, index) => ({
                    index,
                    className: table.className,
                    id: table.id,
                    rows: table.rows ? table.rows.length : 0
                }));

                const linkInfo = Array.from(links).map((link, index) => ({
                    index,
                    text: link.textContent.trim(),
                    href: link.href,
                    className: link.className
                }));

                return {
                    inputs: inputInfo,
                    buttons: buttonInfo,
                    tables: tableInfo,
                    links: linkInfo,
                    url: window.location.href,
                    title: document.title
                };
            });

            console.log('Thông tin trang:', JSON.stringify(pageInfo, null, 2));

        } catch (error) {
            console.error('Lỗi khi debug thông tin trang:', error.message);
        }
    }

    async handleAccountsList() {
        console.log('Đang xử lý danh sách accounts...');

        try {
            // Switch case theo loại tài khoản
            const accountType = this.userConfig.accountType || 'bc';
            switch (accountType) {
                case 'bc':
                    await new BcHandler(this.page, this.userConfig).execute();
                    break;
                case 'agency':
                    await new BcAgencyHandler(this.page, this.userConfig).execute();
                    break;
                default:
                    throw new Error('Loại tài khoản không hợp lệ: ' + accountType);
            }
        } catch (error) {
            console.error('Lỗi khi xử lý danh sách accounts:', error.message);
            throw error;
        }
    }

    // Getter để lấy org_id
    getOrgId() {
        return this.orgId;
    }
}

module.exports = AccountsListHandler;