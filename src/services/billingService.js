const { randomDelay } = require('../utils');

class BillingService {
    constructor(page) {
        this.page = page;
        this.bcType = null; // Lưu loại BC (Trả trước/Trả sau)
    }

    async handleBillingInfo() {
        console.log('Chuyển sang trang billing info...');

        try {
            // Lấy org_id từ URL hiện tại
            const currentUrl = await this.page.url();
            const urlMatch = currentUrl.match(/org_id=(\d+)/);
            if (!urlMatch) {
                throw new Error('Không tìm thấy org_id trong URL hiện tại: ' + currentUrl);
            }

            const orgId = urlMatch[1];
            console.log('Tìm thấy org_id cho billing:', orgId);

            // Chuyển đến trang billing info với org_id động
            const billingUrl = `https://business.tiktok.com/manage/add-billing-info?org_id=${orgId}&show-adv-guide=yes&overviewfrom=bc_registration`;
            await this.page.goto(billingUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            console.log('Đã chuyển đến trang billing info');
            await randomDelay(3000, 5000);

            // Kiểm tra loại BC (trả trước hay trả sau)
            const vatInput = await this.page.$('input[placeholder="VAT"]');
            this.bcType = vatInput ? 'Trả trước' : 'Trả sau';
            console.log(`Loại Business Center: ${this.bcType}`);

            // Điền thông tin địa chỉ doanh nghiệp
            await this.fillBusinessAddress();

            // Click button Gửi
            await this.submitBillingForm();

            return this.bcType; // Trả về loại BC để sử dụng sau này

        } catch (error) {
            console.error('Lỗi khi xử lý trang billing info:', error.message);
            throw error;
        }
    }

    async fillBusinessAddress() {
        console.log('Đang điền thông tin địa chỉ doanh nghiệp...');

        try {
            // 1. Chọn Bang/tỉnh ngẫu nhiên (random state/province)
            console.log('Đang chọn Bang/tỉnh ngẫu nhiên...');
            try {
                // Tìm và click vào dropdown Bang/tỉnh
                const stateSelectors = [
                    'input[placeholder="Vui lòng chọn"]',
                    '.vi-select input[readonly]',
                    'input[readonly="readonly"]'
                ];

                let stateInput = null;
                for (const selector of stateSelectors) {
                    try {
                        stateInput = await this.page.waitForSelector(selector, { timeout: 3000 });
                        if (stateInput) {
                            console.log(`Tìm thấy dropdown Bang/tỉnh với selector: ${selector}`);
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }

                if (stateInput) {
                    // Click để mở dropdown
                    await stateInput.click();
                    await randomDelay(1000, 2000);

                    // Chọn ngẫu nhiên một bang/tỉnh bất kỳ
                    const selectedState = await this.page.evaluate(() => {
                        const options = document.querySelectorAll('.vi-select-dropdown__item');
                        if (options.length > 0) {
                            const random = options[Math.floor(Math.random() * options.length)];
                            const stateName = random.textContent.trim();
                            random.click();
                            return stateName;
                        }
                        return null;
                    });

                    if (selectedState) {
                        console.log('✅ Đã chọn Bang/tỉnh ngẫu nhiên:', selectedState);
                        await randomDelay(2000, 3000);
                    } else {
                        console.log('❌ Không tìm thấy options Bang/tỉnh nào');
                    }
                }
            } catch (e) {
                console.log('Không thể chọn Bang/tỉnh:', e.message);
            }

            // 2. Chọn Thành phố ngẫu nhiên - chỉ hiện sau khi chọn Bang
            console.log('Đang chọn Thành phố ngẫu nhiên...');
            try {
                // Tìm dropdown Thành phố thứ 2 (sau khi đã chọn Bang)
                const citySelectors = [
                    '.ac-info__select-group .vi-select:nth-child(2) input[readonly]',
                    '.vi-select input[readonly]:nth-of-type(2)',
                    'input[readonly="readonly"]'
                ];

                let cityInput = null;
                for (const selector of citySelectors) {
                    try {
                        const inputs = await this.page.$$(selector);
                        if (inputs.length >= 2) {
                            cityInput = inputs[1]; // Lấy input thứ 2
                            console.log(`Tìm thấy dropdown Thành phố với selector: ${selector}`);
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }

                if (cityInput) {
                    // Click để mở dropdown
                    await cityInput.click();
                    await randomDelay(1000, 2000);

                    // Chọn ngẫu nhiên một thành phố bất kỳ
                    const selectedCity = await this.page.evaluate(() => {
                        const items = document.querySelectorAll('.vi-select-dropdown__item');
                        if (items.length > 0) {
                            const random = items[Math.floor(Math.random() * items.length)];
                            const cityName = random.textContent.trim();
                            random.click();
                            return cityName;
                        }
                        return null;
                    });

                    if (selectedCity) {
                        console.log('✅ Đã chọn Thành phố ngẫu nhiên:', selectedCity);
                        await randomDelay(2000, 3000);
                    } else {
                        console.log('❌ Không tìm thấy options Thành phố nào');
                    }
                } else {
                    console.log('⚠️ Không tìm thấy dropdown Thành phố, có thể không cần thiết cho quốc gia này');
                }
            } catch (e) {
                console.log('Không thể chọn Thành phố:', e.message);
            }

            // 3. Điền Tên đường (fix cứng)
            console.log('Đang điền Tên đường...');
            try {
                const streetInput = await this.page.waitForSelector('input[placeholder="Tên đường"]', { timeout: 5000 });
                if (streetInput) {
                    await streetInput.type('123 Main Street', { delay: 100 });
                    console.log('✅ Đã điền Tên đường: 123 Main Street');
                    await randomDelay(1000, 2000);
                }
            } catch (e) {
                console.log('Không tìm thấy field Tên đường:', e.message);
            }

            // 4. Điền Mã bưu chính (fix cứng)
            console.log('Đang điền Mã bưu chính...');
            try {
                const postCodeInput = await this.page.waitForSelector('input[placeholder="Mã bưu chính"]', { timeout: 5000 });
                if (postCodeInput) {
                    await postCodeInput.type('10001', { delay: 100 });
                    console.log('✅ Đã điền Mã bưu chính: 10001');
                    await randomDelay(1000, 2000);
                }
            } catch (e) {
                console.log('Không tìm thấy field Mã bưu chính:', e.message);
            }

            // 5. Bỏ qua VAT (không cần điền)
            console.log('Bỏ qua field VAT (không bắt buộc)');

            console.log('✅ Hoàn thành điền thông tin địa chỉ doanh nghiệp');

        } catch (error) {
            console.error('Lỗi khi điền thông tin địa chỉ:', error.message);
            // Không throw error để tiếp tục xử lý
        }
    }

    async submitBillingForm() {
        console.log('Đang submit form billing...');

        try {
            // Method 1: Thử với CSS selector cụ thể
            try {
                const submitButton = await this.page.waitForSelector('button.vi-button.vi-byted-button.page-submit-btn.vi-button--primary', { timeout: 5000 });
                if (submitButton) {
                    await submitButton.click();
                    console.log('✅ Đã click button Gửi bằng CSS selector');
                    await randomDelay(3000, 5000);
                    console.log('✅ Form billing đã được submit thành công!');
                    return;
                }
            } catch (e) {
                console.log('Không tìm thấy button bằng CSS selector, thử method khác...');
            }

            // Method 2: Tìm tất cả button và filter theo text
            const allButtons = await this.page.$$('button');
            for (const button of allButtons) {
                const text = await button.evaluate(el => el.textContent.trim());
                const isVisible = await button.evaluate(el => el.offsetParent !== null);
                const isEnabled = await button.evaluate(el => !el.disabled);

                if (text === 'Gửi' && isVisible && isEnabled) {
                    await button.click();
                    console.log('✅ Đã click button Gửi bằng cách duyệt tất cả button');
                    await randomDelay(3000, 5000);
                    console.log('✅ Form billing đã được submit thành công!');
                    return;
                }
            }

            // Method 3: Sử dụng page.evaluate với XPath
            const clicked = await this.page.evaluate(() => {
                const selectors = [
                    '//button[normalize-space(text())="Gửi"]',
                    '//button[contains(text(),"Gửi")]',
                    '//button[contains(@class,"submit") or contains(@class,"primary")]'
                ];

                for (const xpath of selectors) {
                    try {
                        const btn = document.evaluate(
                            xpath,
                            document,
                            null,
                            XPathResult.FIRST_ORDERED_NODE_TYPE,
                            null
                        ).singleNodeValue;

                        if (btn && !btn.disabled && btn.offsetParent !== null) {
                            console.log(`Tìm thấy button Gửi với XPath: ${xpath}`);
                            btn.click();
                            return true;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                return false;
            });

            if (clicked) {
                console.log('✅ Đã click button Gửi bằng XPath');
                await randomDelay(3000, 5000);
                console.log('✅ Form billing đã được submit thành công!');
                return;
            }

            throw new Error('Không tìm thấy button Gửi có thể click được');

        } catch (error) {
            console.error('Lỗi khi submit form billing:', error.message);
            throw error;
        }
    }

    // Getter để lấy loại BC
    getBcType() {
        return this.bcType;
    }
}

module.exports = BillingService;