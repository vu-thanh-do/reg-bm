const { randomDelay } = require('./utils');
const SurveyProtectionService = require('./services/surveyProtectionService');

class BcHandler {
    constructor(page, userConfig) {
        this.page = page;
        this.userConfig = userConfig;
        this.surveyProtection = null;
    }

    async execute() {
        console.log('=== TẠO TÀI KHOẢN BC THƯỜNG (QUY TRÌNH CHUẨN) === [bcHandler.js:10]');

        try {
            // 🛡️ Khởi động Survey Protection cho bcHandler
            console.log('🛡️ Khởi động Survey Protection cho BC Handler...');
            this.surveyProtection = await SurveyProtectionService.createGlobalProtection(this.page);

            // Lượt 1: chỉ "Tạo mới" và điền form
            console.log('BẮT ĐẦU LƯỢT 1 [bcHandler.js:11]');
            await this.createBcAccountFirst();
            // Lượt 2 và 3: "Thêm tài khoản nhà quảng cáo" rồi điền form
            for (let loop = 2; loop <= 3; loop++) {
                console.log(`\n--- BẮT ĐẦU LẦN ${loop} --- [bcHandler.js:15]`);
                await this.createBcAccountLoop(loop);
            }

        } catch (error) {
            console.error('Lỗi trong BC Handler:', error.message);
            throw error;
        } finally {
            // 🛡️ Dừng Survey Protection
            if (this.surveyProtection) {
                this.surveyProtection.stopProtection();
                this.surveyProtection = null;
                console.log('✅ Đã dừng Survey Protection (BC Handler)');
            }
        }
    }

    // Lượt đầu tiên: chỉ click "Tạo mới" và điền form
    async createBcAccountFirst() {
        try {
            console.log('Bước 1: Click "Tạo mới" [bcHandler.js:24]');
            await this.clickButtonByText('Tạo mới', 'bc-okee-btn');
            await randomDelay(2000, 4000);

            console.log('Bước 2: Click "Tiếp" (button lớn) [bcHandler.js:28]');
            await this.clickButtonByText('Tiếp', 'bc-okee-btn-size-lg');
            await randomDelay(3000, 5000);

            console.log('Bước 3: Chờ popup form, điền tên tài khoản và chọn múi giờ [bcHandler.js:32]');
            await this.page.waitForSelector('input[placeholder="Nhập tên tài khoản quảng cáo"]', { timeout: 15000 });
            await randomDelay(1000, 2000);
            const accountName = this.userConfig.accountName || `BC_${Math.random().toString(36).substring(2, 8)}_1`;
            await this.page.type('input[placeholder="Nhập tên tài khoản quảng cáo"]', accountName);
            console.log('✅ Đã điền tên tài khoản:', accountName, '[bcHandler.js:36]');
            await randomDelay(500, 1000);

            console.log('Bước 4: Chọn múi giờ [bcHandler.js:40]');
            await this.page.click('input[placeholder="Chọn múi giờ"]');
            await randomDelay(700, 1200);
            await this.page.evaluate(() => {
                const listItems = [...document.querySelectorAll('.vi-select-dropdown__item span')];
                const target = listItems.find(el => el.innerText.includes('UTC+07:00') && el.innerText.includes('Hồ Chí Minh'));
                if (target) target.click();
            });
            console.log('✅ Đã chọn múi giờ Hồ Chí Minh [bcHandler.js:47]');
            await randomDelay(1000, 2000);

            console.log('Bước 5: Click "Tiếp" (form popup) [bcHandler.js:51]');
            await this.clickButtonByText('Tiếp', 'vi-button--primary');
            console.log('✅ Đã click "Tiếp" (form popup) [bcHandler.js:52]');
            await randomDelay(15000, 20000);


            // lỗi ở đây
            // Bổ sung: Click vào checkbox trước khi click "Tiếp" lần 2
            console.log('Bổ sung: Click vào checkbox [bcHandler.js:55.1]');
            await this.page.evaluate(() => {
                const xpath = "(//label[@role='checkbox' and contains(@class, 'vi-checkbox')])[1]";
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                const checkbox = result.singleNodeValue;
                if (checkbox && checkbox.offsetParent !== null) {
                    checkbox.click();
                }
            });

            console.log('Bước 6: Click "Tiếp" lần 2 [bcHandler.js:56]');
            await this.clickButtonByText('Tiếp', 'vi-button--primary');
            console.log('✅ Đã click "Tiếp" lần 2 [bcHandler.js:57]');
            await randomDelay(15000, 20000);

            console.log('Bước 7: Click "Gửi" [bcHandler.js:61]');
            await this.clickButtonByText('Gửi', 'vi-button--primary');
            console.log('✅ Đã click "Gửi" [bcHandler.js:62]');
            await randomDelay(20000, 22000);
        } catch (error) {
            console.error('Lỗi khi tạo tài khoản BC thường (lượt 1):', error.message, '[bcHandler.js:65]');
            // KHÔNG đóng browser ở đây
            throw error;
        }
    }

    // Lượt 2, 3: bắt đầu từ "Thêm tài khoản nhà quảng cáo"
    async createBcAccountLoop(loop) {
        try {
            console.log(`Bước 1: Click "Thêm tài khoản nhà quảng cáo" [bcHandler.js:74]`);
            await this.clickButtonByText('Thêm tài khoản nhà quảng cáo', 'bc-okee-btn');
            await randomDelay(15000, 20000);

            console.log('Bước 2: Chờ popup, click <p> có text "Tạo mới" [bcHandler.js:78]');
            await this.page.evaluate(() => {
                const p = Array.from(document.querySelectorAll('p.text-14.font-medium.text-neutral-highOnSurface')).find(e => e.textContent.trim() === 'Tạo mới');
                if (p) p.click();
            });
            console.log('✅ Đã click <p> Tạo mới trong popup [bcHandler.js:82]');
            await randomDelay(2000, 4000);

            console.log('Bước 3: Click "Tiếp" (button lớn) [bcHandler.js:86]');
            await this.clickButtonByText('Tiếp', 'bc-okee-btn-size-lg');
            await randomDelay(3000, 5000);

            console.log('Bước 4: Chờ popup form, điền tên tài khoản và chọn múi giờ [bcHandler.js:90]');
            await this.page.waitForSelector('input[placeholder="Nhập tên tài khoản quảng cáo"]', { timeout: 15000 });
            await randomDelay(1000, 2000);
            const accountName = this.userConfig.accountName || `BC_${Math.random().toString(36).substring(2, 8)}_${loop}`;
            await this.page.type('input[placeholder="Nhập tên tài khoản quảng cáo"]', accountName);
            console.log('✅ Đã điền tên tài khoản:', accountName, `[bcHandler.js:94]`);
            await randomDelay(500, 1000);

            console.log('Bước 5: Chọn múi giờ [bcHandler.js:98]');
            await this.page.click('input[placeholder="Chọn múi giờ"]');
            await randomDelay(700, 1200);
            await this.page.evaluate(() => {
                const listItems = [...document.querySelectorAll('.vi-select-dropdown__item span')];
                const target = listItems.find(el => el.innerText.includes('UTC+07:00') && el.innerText.includes('Hồ Chí Minh'));
                if (target) target.click();
            });
            console.log('✅ Đã chọn múi giờ Hồ Chí Minh [bcHandler.js:105]');
            await randomDelay(1000, 2000);

            console.log('Bước 6: Click "Tiếp" (form popup) [bcHandler.js:109]');
            await this.clickButtonByText('Tiếp', 'vi-button--primary');
            console.log('✅ Đã click "Tiếp" (form popup) [bcHandler.js:110]');
            await randomDelay(5000, 7000);
            // 
            console.log('Bổ sung: Click vào checkbox [bcHandler.js:127]');
            await this.page.evaluate(() => {
                const xpath = "(//label[@role='checkbox' and contains(@class, 'vi-checkbox')])[1]";
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                const checkbox = result.singleNodeValue;
                if (checkbox && checkbox.offsetParent !== null) {
                    checkbox.click();
                }
            });
            console.log('Bước 7: Click "Tiếp" lần 2 [bcHandler.js:114]');
            await this.clickButtonByText('Tiếp', 'vi-button--primary');
            console.log('✅ Đã click "Tiếp" lần 2 [bcHandler.js:115]');
            await randomDelay(15000, 20000);

            console.log('Bước 8: Click "Gửi" [bcHandler.js:119]');
            await this.clickButtonByText('Gửi', 'vi-button--primary');
            console.log('✅ Đã click "Gửi" [bcHandler.js:120]');
            await randomDelay(20000, 22000);
        } catch (error) {
            console.error(`Lỗi khi tạo tài khoản BC thường (lượt ${loop}):`, error.message, '[bcHandler.js:123]');
            // KHÔNG đóng browser ở đây
            throw error;
        }
    }

    // Helper: Click button theo text và class
    async clickButtonByText(text, classPart) {
        if (text.trim() === 'Tiếp' && classPart === 'vi-button--primary') {
            // Dùng evaluate để click button cuối cùng có span text 'Tiếp'
            const clicked = await this.page.evaluate(() => {
                const xpath = "(//button[span[normalize-space(text())='Tiếp']])[last()]";
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                const button = result.singleNodeValue;
                if (button && !button.disabled && button.offsetParent !== null) {
                    button.click();
                    return true;
                }
                return false;
            });
            if (clicked) {
                console.log(`✅ Đã click button (XPath): ${text}`);
            } else {
                throw new Error("Không tìm thấy button 'Tiếp' (XPath)");
            }
        } else {
            await this.page.evaluate((btnText, classPart) => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b => b.textContent.trim() === btnText && b.className.includes(classPart));
                if (btn && !btn.disabled && btn.offsetParent !== null) btn.click();
            }, text, classPart);
            console.log(`✅ Đã click button: ${text}`);
        }
    }

    // Helper: Click popup text (ví dụ <p> hoặc <span> có text)
    async clickPopupText(text) {
        await this.page.evaluate((targetText) => {
            const el = Array.from(document.querySelectorAll('p, span, div')).find(e => e.textContent.trim() === targetText);
            if (el) el.click();
        }, text);
        console.log(`✅ Đã click popup text: ${text}`);
    }
}

module.exports = BcHandler;