const { randomDelay } = require('./utils');
const ViotpService = require('./services/codeSimService');
const BillingService = require('./services/billingService');
const AccountsListHandler = require('./accountsListHandler');
const SurveyProtectionService = require('./services/surveyProtectionService');

class PostSetup {
    constructor(page, userConfig) {
        this.page = page;
        this.userConfig = userConfig;
        this.viotpService = new ViotpService();
        this.billingService = new BillingService(page);
        this.requestId = null; // Lưu requestId từ Viotp
        this.bcType = null; // Lưu loại BC (Trả trước/Trả sau)
        this.isSendingOtp = false; // Flag để theo dõi trạng thái gửi OTP
    }

    async waitForTwoStepVerification() {
        console.log('Đang chờ trang two-step verification...');

        // Chờ URL chứa two-step-verification
        await this.page.waitForFunction(() => {
            return window.location.href.includes('two-step-verification');
        }, { timeout: 30000 });
        await this.page.waitForSelector('.two-sv-footer button', { timeout: 15000 });
        // Chờ thêm để đảm bảo trang load hoàn toàn
        await randomDelay(3000, 5000);
        // Debug: In ra thông tin các button
        const buttonInfo = await this.page.evaluate(() => {
            const buttons = document.querySelectorAll('.two-sv-footer button');
            const info = [];
            for (let i = 0; i < buttons.length; i++) {
                info.push({
                    index: i,
                    text: buttons[i].textContent.trim(),
                    className: buttons[i].className,
                    disabled: buttons[i].disabled,
                    visible: buttons[i].offsetParent !== null
                });
            }
            return info;
        });
        await randomDelay(2000, 3000);
    }
    async skipTwoStepVerification() {
        try {
            // Click button đầu tiên bằng XPath như user cung cấp
            const clickResult = await this.page.evaluate(() => {
                const btn = document.evaluate(
                    "//div[contains(@class, 'two-sv-footer')]//button[1]",
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                ).singleNodeValue;

                if (btn) {
                    const text = btn.textContent.trim();
                    const className = btn.className;
                    const disabled = btn.disabled;
                    const visible = btn.offsetParent !== null;

                    console.log(`Tìm thấy button: "${text}" (class: ${className}, disabled: ${disabled}, visible: ${visible})`);

                    btn.click();
                    return {
                        success: true,
                        text: text,
                        className: className,
                        disabled: disabled,
                        visible: visible
                    };
                }
                return { success: false, error: 'Không tìm thấy button đầu tiên' };
            });

            if (clickResult.success) {
                console.log(`Đã click button: "${clickResult.text}" (disabled: ${clickResult.disabled}, visible: ${clickResult.visible})`);

                // Chờ lâu hơn để button hoạt động
                await randomDelay(5000, 8000);

                // Chờ URL load xong (chuyển về trang chính)
                await this.page.waitForFunction(() => {
                    return !window.location.href.includes('two-step-verification');
                }, { timeout: 30000 });

                console.log('Đã thoát khỏi trang two-step verification, URL hiện tại:', await this.page.url());
            } else {
                throw new Error('Không thể click button: ' + clickResult.error);
            }
        } catch (error) {
            console.error('Lỗi khi bỏ qua two-step verification:', error.message);
        }
    }

    async navigateToAccounts() {
        try {
            const currentUrl = await this.page.url();
            const urlMatch = currentUrl.match(/org_id=(\d+)/);
            if (!urlMatch) {
                throw new Error('Không tìm thấy org_id trong URL: ' + currentUrl);
            }
            const orgId = urlMatch[1];
            const accountsUrl = `https://business.tiktok.com/manage/accounts/adv?org_id=${orgId}&show-adv-guide=yes&overviewfrom=bc_registration`;
            await this.page.goto(accountsUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            await randomDelay(2000, 3000);
        } catch (error) {
            console.error('Lỗi khi chuyển đến trang Accounts:', error.message);
        }
    }

    async waitForAccountsPageLoad() {
        try {
            await this.page.waitForFunction(() => {
                return document.readyState === 'complete';
            }, { timeout: 30000 });
            await randomDelay(3000, 5000);

            // F5 trang để làm sạch cache và dữ liệu
            console.log('🔄 Đang refresh trang để làm sạch cache và dữ liệu...');
            await this.page.reload();
            await randomDelay(5000, 8000); // Chờ trang load lại

            console.log('✅ Đã refresh trang thành công');

            const pageInfo = await this.page.evaluate(() => {
                const inputs = document.querySelectorAll('input');
                const buttons = document.querySelectorAll('button');
                const selects = document.querySelectorAll('select');

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

                const selectInfo = Array.from(selects).map((select, index) => ({
                    index,
                    className: select.className,
                    id: select.id,
                    name: select.name
                }));

                return {
                    inputs: inputInfo,
                    buttons: buttonInfo,
                    selects: selectInfo,
                    url: window.location.href
                };
            });
        } catch (error) {
            console.error('Lỗi khi chờ trang Accounts load:', error.message);
        }
    }

    async selectIndustry() {
        try {
            const industryInput = await this.page.waitForSelector('input[placeholder="Chọn một ngành"]', { timeout: 10000 });
            if (!industryInput) {
                throw new Error('Không tìm thấy input chọn ngành');
            }
            await industryInput.click();
            await randomDelay(2000, 3000);

            const waitAndClick = async(text, timeout = 10000) => {
                const step = 200;
                let elapsed = 0;

                while (elapsed < timeout) {
                    try {
                        const elements = await this.page.$$('.bc-okee-cascader-item-label');

                        for (const element of elements) {
                            const elementText = await element.evaluate(el => el.innerText.trim());
                            if (elementText === text) {
                                await element.click();
                                console.log(`Đã click vào: ${text}`);
                                return;
                            }
                        }

                        // Nếu không tìm thấy, chờ thêm
                        await new Promise(resolve => setTimeout(resolve, step));
                        elapsed += step;

                    } catch (error) {
                        console.log(`Lỗi khi tìm ${text}:`, error.message);
                        await new Promise(resolve => setTimeout(resolve, step));
                        elapsed += step;
                    }
                }

                throw new Error(`Không tìm thấy option: ${text} sau ${timeout}ms`);
            };

            // Chọn "Dịch vụ"
            await waitAndClick("Dịch vụ");
            await randomDelay(2000, 3000);

            // Chọn "Xuất bản"
            await waitAndClick("Xuất bản");
            await randomDelay(2000, 3000);

            console.log('✅ Đã chọn ngành: Dịch vụ → Xuất bản');

        } catch (error) {
            console.error('Lỗi khi chọn ngành:', error.message);
            try {
                await this.page.evaluate(async() => {
                    const waitAndClick = async(text, timeout = 5000) => {
                        const step = 100;
                        let elapsed = 0;
                        while (elapsed < timeout) {
                            const el = [...document.querySelectorAll('.bc-okee-cascader-item-label')]
                                .find(e => e.innerText.trim() === text);
                            if (el) {
                                el.click();
                                return;
                            }
                            await new Promise(r => setTimeout(r, step));
                            elapsed += step;
                        }
                        throw new Error(`Không tìm thấy: ${text}`);
                    };

                    const input = document.querySelector('input[placeholder="Chọn một ngành"]');
                    if (input) input.click();
                    await waitAndClick("Dịch vụ");
                    await waitAndClick("Xuất bản");
                    console.log("✅ Đã chọn ngành Dịch vụ → Xuất bản");
                });

                console.log('Đã thử phương pháp fallback cho chọn ngành');
            } catch (fallbackError) {
                console.error('Phương pháp fallback cũng thất bại:', fallbackError.message);
            }
        }
    }

    async fillResponsiblePerson() {
        try {
            console.log('Đang điền tên người chịu trách nhiệm...');

            // Tìm input tên
            const nameInput = await this.page.waitForSelector('input[placeholder*="Tên người chịu trách nhiệm"]', { timeout: 5000 });
            if (!nameInput) {
                throw new Error('Không tìm thấy input tên');
            }

            // Điền tên ngẫu nhiên
            const randomName = `Nguyen Van ${Math.random().toString(36).substring(7)}`;
            await nameInput.type(randomName);
            console.log(`✅ Đã điền tên: ${randomName}`);
            await randomDelay(1000, 2000);

        } catch (error) {
            console.error('Lỗi khi điền tên:', error.message);
        }
    }

    async selectPhoneCountryCode() {
        console.log('Đang chọn mã quốc gia +84...');

        try {
            // Click vào dropdown mã quốc gia
            await this.page.click('.area-code-box');
            await randomDelay(2000, 3000);

            // Chọn +84 (Việt Nam)
            await this.page.click('li[data-value="+84"]');
            console.log('✅ Đã chọn mã quốc gia +84');
            await randomDelay(2000, 3000);

        } catch (error) {
            console.error('Lỗi khi chọn mã quốc gia:', error.message);

            // Fallback: Thử với XPath
            try {
                console.log('Thử phương pháp fallback...');
                await this.page.evaluate(() => {
                    const dropdown = document.querySelector('.area-code-box');
                    if (dropdown) dropdown.click();
                });
                await randomDelay(2000, 3000);

                await this.page.evaluate(() => {
                    const option = document.querySelector('li[data-value="+84"]');
                    if (option) option.click();
                });
                console.log('✅ Đã chọn mã quốc gia +84 (fallback)');
            } catch (fallbackError) {
                console.error('Fallback cũng thất bại:', fallbackError.message);
            }
        }
    }

    async fillPhoneNumber() {
        console.log('Đang lấy và điền số điện thoại...');
        try {
            // Lấy số điện thoại từ Viotp
            const phoneData = await this.viotpService.getPhoneNumber();
            console.log('Phone data từ Viotp:', phoneData);

            if (!phoneData || !phoneData.phone) {
                throw new Error('Không lấy được số điện thoại từ Viotp');
            }

            const phoneNumber = phoneData.phone;
            this.requestId = phoneData.requestId; // Lưu requestId để sử dụng sau

            console.log(`✅ Đã lấy số điện thoại: ${phoneNumber}`);
            console.log(`✅ Đã lưu requestId: ${this.requestId}`);
            console.log(`✅ Kiểm tra requestId trong instance: ${this.requestId}`);

            // Tìm input số điện thoại
            const phoneInput = await this.page.waitForSelector('input[type="tel"]', { timeout: 10000 });
            if (!phoneInput) {
                throw new Error('Không tìm thấy input số điện thoại');
            }

            console.log('✅ Tìm thấy input số điện thoại');

            // Clear input trước khi nhập
            await phoneInput.click();
            await randomDelay(500, 1000);

            await phoneInput.evaluate((el) => {
                el.value = '';
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });
            await randomDelay(1000, 2000);

            // Nhập số điện thoại từng ký tự
            console.log('Đang nhập số điện thoại từng ký tự...');
            for (let i = 0; i < phoneNumber.length; i++) {
                await phoneInput.type(phoneNumber[i], { delay: 0 });
                await phoneInput.evaluate((el) => {
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                });
                await randomDelay(200, 400);
            }

            // Trigger final events
            await phoneInput.evaluate((el) => {
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
            });

            console.log(`✅ Đã điền số điện thoại: ${phoneNumber}`);

            // Verify số điện thoại đã được nhập đúng
            const currentValue = await phoneInput.evaluate(el => el.value);
            console.log('Số điện thoại trong input:', currentValue);

            if (currentValue !== phoneNumber) {
                console.log('❌ Số điện thoại chưa đúng, nhập lại...');
                await phoneInput.evaluate((el) => {
                    el.value = '';
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                });
                await randomDelay(1000, 2000);

                await phoneInput.type(phoneNumber, { delay: 100 });
                await phoneInput.evaluate((el) => {
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    el.dispatchEvent(new Event('blur', { bubbles: true }));
                });
            }

            console.log('✅ Hoàn thành điền số điện thoại');
            await randomDelay(2000, 3000);
        } catch (error) {
            console.error('Lỗi khi điền số điện thoại:', error.message);
            throw error;
        }
    }

    // Thêm method mới để verify số điện thoại trước khi gửi
    async verifyPhoneNumberBeforeSend() {
        console.log('Đang verify số điện thoại trước khi gửi OTP...');

        try {
            const phoneInput = await this.page.waitForSelector('input[type="tel"]', { timeout: 5000 });
            if (!phoneInput) {
                console.log('Không tìm thấy input số điện thoại để verify');
                return false;
            }

            // Kiểm tra input.value phía client
            const clientValue = await phoneInput.evaluate(el => el.value);
            console.log(`Số điện thoại hiện tại (client): ${clientValue}`);

            // Kiểm tra xem số điện thoại có hợp lệ không
            if (!clientValue || clientValue.length < 9) {
                console.log('❌ Số điện thoại không hợp lệ, cần nhập lại');
                return false;
            }

            // Kiểm tra format số điện thoại (chỉ chứa số)
            const phoneRegex = /^\d+$/;
            if (!phoneRegex.test(clientValue)) {
                console.log('❌ Số điện thoại chứa ký tự không hợp lệ');
                return false;
            }

            // Kiểm tra xem input có đang focus không
            const isFocused = await phoneInput.evaluate(el => el === document.activeElement);
            if (isFocused) {
                console.log('⚠️ Input đang focus, blur để trigger validation');
                await phoneInput.evaluate(el => el.blur());
                await randomDelay(1000, 2000);
            }

            // Thêm delay để đảm bảo form đã được validate
            await randomDelay(2000, 3000);

            // Kiểm tra xem có lỗi validation nào không
            const validationState = await this.page.evaluate(() => {
                const errorElements = document.querySelectorAll('.error, .validate_error, [class*="error"]');
                const successElements = document.querySelectorAll('.success, [class*="success"]');

                return {
                    hasError: errorElements.length > 0,
                    hasSuccess: successElements.length > 0,
                    errorTexts: Array.from(errorElements).map(el => el.textContent.trim()),
                    successTexts: Array.from(successElements).map(el => el.textContent.trim())
                };
            });

            if (validationState.hasError) {
                console.log('❌ Có lỗi validation:', validationState.errorTexts);
                return false;
            }

            if (validationState.hasSuccess) {
                console.log('✅ Có thông báo thành công:', validationState.successTexts);
            }

            // Kiểm tra trạng thái button Gửi
            const sendButtonState = await this.checkButtonState('Gửi');
            if (sendButtonState) {
                if (sendButtonState.disabled) {
                    console.log('❌ Button Gửi đang bị disabled');
                    return false;
                }
                console.log('✅ Button Gửi sẵn sàng');
            }

            console.log('✅ Số điện thoại đã được verify thành công');
            return true;

        } catch (error) {
            console.error('Lỗi khi verify số điện thoại:', error.message);
            return false;
        }
    }

    async clickSendButton() {
            console.log('Đang tìm và click button Gửi...');

            try {
                // Tìm button Gửi bằng nhiều cách
                const clicked = await this.page.evaluate(() => {
                    const selectors = [
                        '//button[normalize-space(text())="Gửi"]',
                        '//button[contains(text(),"Gửi")]',
                        '//button[contains(@class, "bc-okee-btn") and contains(text(), "Gửi")]',
                        '//button[contains(@class, "bc-okee-btn-type-primary")]',
                        '//button[contains(@class, "style_loading_btn")]'
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
                                console.log(`Tìm thấy button Gửi: "${btn.textContent.trim()}"`);
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
                    console.log('✅ Đã click button Gửi');
                    await randomDelay(3000, 5000);
                    return true;
                }

                // Fallback: Tìm tất cả button và click button cuối cùng
                const allButtons = await this.page.$$('button');
                for (let i = allButtons.length - 1; i >= 0; i--) {
                    const button = allButtons[i];
                    const text = await button.evaluate(el => el.textContent.trim());
                    const isVisible = await button.evaluate(el => el.offsetParent !== null);
                    const isEnabled = await button.evaluate(el => !el.disabled);

                    if (text === 'Gửi' && isVisible && isEnabled) {
                        await button.click();
                        console.log('✅ Đã click button Gửi (fallback)');
                        await randomDelay(3000, 5000);
                        return true;
                    }
                }

                throw new Error('Không tìm thấy button Gửi');

            } catch (error) {
                console.error('Lỗi khi click button Gửi:', error.message);
                return false;
            }
        }
        // Phương pháp 1: Click button Xác nhận OTP (được sửa)
    async clickConfirmOtpButton() {
        console.log('Đang tìm và click button Xác nhận OTP...');

        // Thêm delay trước khi click (như người thật)
        console.log('Chờ một chút trước khi click Xác nhận như người thật...');
        await randomDelay(2000, 4000);

        try {
            // Method 1: Thử với XPath trong evaluate và click luôn
            const clicked = await this.page.evaluate(() => {
                // Tìm button với nhiều cách khác nhau
                const selectors = [
                    '//button[normalize-space(text())="Xác nhận"]',
                    '//button[contains(text(),"Xác nhận")]',
                    '//button[contains(@class,"confirm") or contains(@class,"primary")]//span[text()="Xác nhận"]/parent::button',
                    '//button[span[text()="Xác nhận"]]'
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
                            console.log(`Tìm thấy button Xác nhận với XPath: ${xpath}`);
                            console.log(`Button text: "${btn.textContent.trim()}"`);
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
                console.log('✅ Đã click button Xác nhận bằng XPath');
                await randomDelay(3000, 5000);
                return true;
            }

            // Method 2: Thử với CSS selector
            const confirmSelectors = [
                'button:contains("Xác nhận")',
                'button[class*="confirm"]',
                'button[class*="primary"]',
                '.bc-okee-btn-type-primary',
                'button.bc-okee-btn:last-child'
            ];

            for (const selector of confirmSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 2000 });
                    const button = await this.page.$(selector);
                    if (button) {
                        const isVisible = await button.evaluate(el => el.offsetParent !== null);
                        const isEnabled = await button.evaluate(el => !el.disabled);
                        const text = await button.evaluate(el => el.textContent.trim());

                        if (isVisible && isEnabled && text.includes('Xác nhận')) {
                            await button.click();
                            console.log(`✅ Đã click button Xác nhận với selector: ${selector}`);
                            await randomDelay(3000, 5000);
                            return true;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            // Method 3: Tìm tất cả button và filter theo text
            const allButtons = await this.page.$$('button');
            for (const button of allButtons) {
                const text = await button.evaluate(el => el.textContent.trim());
                const isVisible = await button.evaluate(el => el.offsetParent !== null);
                const isEnabled = await button.evaluate(el => !el.disabled);

                if (text === 'Xác nhận' && isVisible && isEnabled) {
                    await button.click();
                    console.log('✅ Đã click button Xác nhận bằng cách duyệt tất cả button');
                    await randomDelay(3000, 5000);
                    return true;
                }
            }

            throw new Error('Không tìm thấy button Xác nhận có thể click được');

        } catch (error) {
            console.error('Lỗi khi click button Xác nhận:', error.message);

            // Debug: In ra thông tin tất cả button
            await this.debugAllButtons();
            return false;
        }
    }

    // Phương pháp 2: Click button Hủy (được sửa)
    async clickCancelButton() {
        console.log('Đang tìm và click button Hủy...');

        try {
            // Method 1: Thử với XPath trong evaluate và click luôn
            const clicked = await this.page.evaluate(() => {
                const selectors = [
                    '//button[normalize-space(text())="Hủy"]',
                    '//button[contains(text(),"Hủy")]',
                    '//button[contains(@class,"cancel") or contains(@class,"secondary")]//span[text()="Hủy"]/parent::button',
                    '//button[span[text()="Hủy"]]'
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
                            console.log(`Tìm thấy button Hủy với XPath: ${xpath}`);
                            console.log(`Button text: "${btn.textContent.trim()}"`);
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
                console.log('✅ Đã click button Hủy bằng XPath');
                await randomDelay(2000, 3000);
                return true;
            }

            // Method 2: Thử với CSS selector
            const cancelSelectors = [
                'button:contains("Hủy")',
                'button[class*="cancel"]',
                'button[class*="secondary"]',
                '.bc-okee-btn-type-secondary',
                'button.bc-okee-btn:first-child'
            ];

            for (const selector of cancelSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 2000 });
                    const button = await this.page.$(selector);
                    if (button) {
                        const isVisible = await button.evaluate(el => el.offsetParent !== null);
                        const isEnabled = await button.evaluate(el => !el.disabled);
                        const text = await button.evaluate(el => el.textContent.trim());

                        if (isVisible && isEnabled && text.includes('Hủy')) {
                            await button.click();
                            console.log(`✅ Đã click button Hủy với selector: ${selector}`);
                            await randomDelay(2000, 3000);
                            return true;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            // Method 3: Tìm tất cả button và filter theo text
            const allButtons = await this.page.$$('button');
            for (const button of allButtons) {
                const text = await button.evaluate(el => el.textContent.trim());
                const isVisible = await button.evaluate(el => el.offsetParent !== null);
                const isEnabled = await button.evaluate(el => !el.disabled);

                if (text === 'Hủy' && isVisible && isEnabled) {
                    await button.click();
                    console.log('✅ Đã click button Hủy bằng cách duyệt tất cả button');
                    await randomDelay(2000, 3000);
                    return true;
                }
            }

            throw new Error('Không tìm thấy button Hủy có thể click được');

        } catch (error) {
            console.error('Lỗi khi click button Hủy:', error.message);

            // Debug: In ra thông tin tất cả button
            await this.debugAllButtons();
            return false;
        }
    }

    // Helper method: Debug tất cả button
    async debugAllButtons() {
        console.log('=== DEBUG: Thông tin tất cả button trên trang ===');

        const buttonInfo = await this.page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            const info = [];

            for (let i = 0; i < buttons.length; i++) {
                const btn = buttons[i];
                info.push({
                    index: i,
                    text: btn.textContent.trim(),
                    innerHTML: btn.innerHTML,
                    className: btn.className,
                    disabled: btn.disabled,
                    visible: btn.offsetParent !== null,
                    style: {
                        display: window.getComputedStyle(btn).display,
                        visibility: window.getComputedStyle(btn).visibility,
                        opacity: window.getComputedStyle(btn).opacity
                    }
                });
            }

            return info;
        });

        console.log('Thông tin tất cả button:', JSON.stringify(buttonInfo, null, 2));
    }

    // Method để detect và handle lỗi "Số điện thoại không khớp"
    async handlePhoneMismatchError() {
        console.log('Đang kiểm tra lỗi "Số điện thoại không khớp"...');

        try {
            // Kiểm tra xem có thông báo lỗi về số điện thoại không khớp không
            const hasMismatchError = await this.page.evaluate(() => {
                const errorTexts = [
                    'Số điện thoại bạn đang muốn xác minh không khớp với số điện thoại bạn gửi trước đó',
                    'Phone number mismatch',
                    'Số điện thoại không khớp',
                    'Phone verification failed'
                ];

                const allText = document.body.innerText;
                return errorTexts.some(text => allText.includes(text));
            });

            if (hasMismatchError) {
                console.log('❌ Phát hiện lỗi "Số điện thoại không khớp"');

                // Thêm delay để đảm bảo trang đã load xong
                await randomDelay(2000, 4000);

                // Thử tìm và click button "Hủy" hoặc "Thử lại"
                const cancelSuccess = await this.clickCancelButton();
                if (cancelSuccess) {
                    console.log('✅ Đã hủy và sẵn sàng thử lại với số mới');
                    return true;
                }

                // Nếu không click được button Hủy, thử refresh trang
                console.log('Không thể click button Hủy, thử refresh trang...');
                await this.page.reload();
                await randomDelay(3000, 5000);
                return true;
            }

            return false;

        } catch (error) {
            console.error('Lỗi khi kiểm tra lỗi số điện thoại:', error.message);
            return false;
        }
    }

    // Method cải thiện để chờ và xử lý OTP
    async waitForOtpAndFill() {
        console.log('Đang chờ và điền OTP...');
        try {
            console.log(`🔍 Bắt đầu xử lý OTP với requestId: ${this.requestId}`);

            // Kiểm tra lỗi số điện thoại không khớp
            const hasMismatchError = await this.handlePhoneMismatchError();
            if (hasMismatchError) {
                console.log('❌ Phát hiện lỗi số điện thoại không khớp');
                return false;
            }

            // Chờ input OTP xuất hiện
            const otpInput = await this.page.waitForSelector('input[placeholder*="mã xác minh"], input[placeholder*="OTP"], input[maxlength="6"][type="text"]', {
                timeout: 15000,
                visible: true
            });

            if (!otpInput) {
                console.log('Không tìm thấy input OTP, có thể không cần OTP');
                return true;
            }

            console.log('✅ Tìm thấy input OTP');

            // Chờ và lấy OTP từ Viotp
            console.log(`Đang chờ OTP từ Viotp cho requestId: ${this.requestId}...`);
            let otpData = null;
            let attempts = 0;
            const maxAttempts = 15;

            while (!otpData && attempts < maxAttempts) {
                try {
                    await randomDelay(3000, 5000);
                    if (this.requestId) {
                        console.log(`Thử lấy OTP với requestId: ${this.requestId}`);
                        otpData = await this.viotpService.getOtpByRequestId(this.requestId);
                        console.log('Kết quả OTP:', otpData);
                    } else {
                        console.log('❌ Không có requestId để lấy OTP');
                        break;
                    }
                    attempts++;

                    if (!otpData) {
                        console.log(`Lần thử ${attempts}/${maxAttempts}: Chưa có OTP, chờ thêm...`);
                    }
                } catch (error) {
                    console.log(`Lần thử ${attempts}/${maxAttempts}: Lỗi khi lấy OTP: ${error.message}`);
                    attempts++;
                }
            }

            if (otpData && otpData.code) {
                console.log(`✅ Đã nhận OTP: ${otpData.code}`);

                // Nhập OTP
                console.log('Đang nhập OTP...');
                await otpInput.click();
                await randomDelay(1000, 2000);
                await otpInput.evaluate(el => el.value = '');
                await randomDelay(1000, 2000);

                // Nhập OTP từng ký tự
                for (let i = 0; i < otpData.code.length; i++) {
                    await otpInput.type(otpData.code[i], { delay: 0 });
                    await randomDelay(200, 500);
                }

                console.log(`✅ Đã điền OTP: ${otpData.code}`);
                await randomDelay(2000, 3000);

                // Click button Xác nhận
                const confirmSuccess = await this.clickConfirmOtpButton();

                if (confirmSuccess) {
                    console.log('✅ OTP đã được xác nhận thành công!');
                    // Tiếp tục xử lý billing info
                    await randomDelay(2000, 3000);

                    this.bcType = await this.billingService.handleBillingInfo();
                    console.log(`✅ Hoàn thành quy trình với BC loại: ${this.bcType}`);
                    return true;
                } else {
                    console.log('❌ Không thể click button Xác nhận');
                    return false;
                }
            } else {
                console.log('❌ Không nhận được OTP sau thời gian chờ');
                return false;
            }
        } catch (error) {
            console.error('Lỗi khi xử lý OTP:', error.message);
            return false;
        }
    }

    // Thêm method mới để kiểm tra trạng thái button trước khi click
    async checkButtonState(buttonText) {
        try {
            const buttonInfo = await this.page.evaluate((text) => {
                const buttons = document.querySelectorAll('button');
                for (const btn of buttons) {
                    if (btn.textContent.trim() === text) {
                        return {
                            found: true,
                            disabled: btn.disabled,
                            visible: btn.offsetParent !== null,
                            className: btn.className,
                            text: btn.textContent.trim()
                        };
                    }
                }
                return { found: false };
            }, buttonText);

            if (buttonInfo.found) {
                console.log(`Button "${buttonText}": disabled=${buttonInfo.disabled}, visible=${buttonInfo.visible}`);
                return buttonInfo;
            }
            return null;
        } catch (error) {
            console.error('Lỗi khi kiểm tra trạng thái button:', error.message);
            return null;
        }
    }

    // Thêm method mới để kiểm tra trạng thái form hoàn chỉnh
    async checkFormValidationState() {
        console.log('Đang kiểm tra trạng thái validation của form...');

        try {
            const formState = await this.page.evaluate(() => {
                // Kiểm tra tất cả input fields
                const inputs = document.querySelectorAll('input, select');
                const inputStates = Array.from(inputs).map(input => ({
                    type: input.type,
                    placeholder: input.placeholder,
                    value: input.value,
                    hasValue: input.value && input.value.trim().length > 0,
                    hasError: input.classList.contains('error') || input.closest('.error'),
                    hasSuccess: input.classList.contains('success') || input.closest('.success'),
                    disabled: input.disabled,
                    required: input.required
                }));

                // Kiểm tra error messages
                const errorElements = document.querySelectorAll('.error, .validate_error, [class*="error"]');
                const errorMessages = Array.from(errorElements).map(el => el.textContent.trim());

                // Kiểm tra success messages
                const successElements = document.querySelectorAll('.success, [class*="success"]');
                const successMessages = Array.from(successElements).map(el => el.textContent.trim());

                // Kiểm tra button states
                const buttons = document.querySelectorAll('button');
                const buttonStates = Array.from(buttons).map(btn => ({
                    text: btn.textContent.trim(),
                    disabled: btn.disabled,
                    visible: btn.offsetParent !== null,
                    className: btn.className
                }));

                return {
                    inputs: inputStates,
                    errors: errorMessages,
                    successes: successMessages,
                    buttons: buttonStates,
                    hasErrors: errorMessages.length > 0,
                    hasSuccesses: successMessages.length > 0
                };
            });

            console.log('📋 Trạng thái form:');
            console.log('- Inputs:', formState.inputs.length);
            console.log('- Errors:', formState.errors);
            console.log('- Successes:', formState.successes);
            console.log('- Buttons:', formState.buttons.length);

            // Kiểm tra xem có lỗi nào không
            if (formState.hasErrors) {
                console.log('❌ Form có lỗi validation:', formState.errors);
                return false;
            }

            // Kiểm tra xem tất cả required fields đã được điền chưa
            const requiredInputs = formState.inputs.filter(input => input.required);
            const filledRequiredInputs = requiredInputs.filter(input => input.hasValue);

            if (requiredInputs.length > 0 && filledRequiredInputs.length !== requiredInputs.length) {
                console.log('❌ Chưa điền đầy đủ required fields');
                return false;
            }

            // Kiểm tra button Gửi có sẵn sàng không
            const sendButton = formState.buttons.find(btn => btn.text.includes('Gửi'));
            if (sendButton && sendButton.disabled) {
                console.log('❌ Button Gửi đang bị disabled');
                return false;
            }

            console.log('✅ Form validation hoàn tất');
            return true;

        } catch (error) {
            console.error('Lỗi khi kiểm tra form validation:', error.message);
            return false;
        }
    }

    // Thêm method để đợi form validation hoàn tất
    async waitForFormValidation() {
        console.log('Đang đợi form validation hoàn tất...');

        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            attempts++;

            const isValid = await this.checkFormValidationState();
            if (isValid) {
                console.log('✅ Form validation đã hoàn tất');
                return true;
            }

            console.log(`Lần thử ${attempts}/${maxAttempts}: Form chưa valid, chờ thêm...`);
            await randomDelay(2000, 4000);
        }

        console.log('❌ Form validation không hoàn tất sau thời gian chờ');
        return false;
    }

    // Method chuyển đến trang danh sách accounts
    async navigateToAccountsList() {
        console.log('Đang chờ trang load hoàn tất...');

        // Chờ 10-15 giây để trang load hết
        await randomDelay(10000, 15000);

        console.log('Đang chuyển đến trang danh sách accounts...');

        try {
            // Lấy org_id từ URL hiện tại
            const currentUrl = await this.page.url();
            const urlMatch = currentUrl.match(/org_id=(\d+)/);

            if (!urlMatch) {
                throw new Error('Không tìm thấy org_id trong URL hiện tại: ' + currentUrl);
            }

            const orgId = urlMatch[1];
            console.log('Tìm thấy org_id cho accounts list:', orgId);

            // Tạo URL mới với các tham số cần thiết
            const accountsListUrl = `https://business.tiktok.com/manage/accounts/adv?org_id=${orgId}&detail_adv=0&filters=3,1,2,4,5&selectAccountType=1`;
            console.log('Chuyển đến URL accounts list:', accountsListUrl);

            // Chuyển đến trang accounts list
            await this.page.goto(accountsListUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            console.log('✅ Đã chuyển đến trang danh sách accounts thành công');

            // Chờ trang load xong
            await randomDelay(3000, 5000);

            // Trả về org_id để sử dụng trong file mới
            return orgId;

        } catch (error) {
            console.error('Lỗi khi chuyển đến trang danh sách accounts:', error.message);
            throw error;
        }
    }

    // Method xử lý trang danh sách accounts với file mới
    async handleAccountsList(orgId) {
        console.log('Đang khởi tạo AccountsListHandler...');

        try {
            // Tạo instance của AccountsListHandler
            const accountsListHandler = new AccountsListHandler(this.page, this.userConfig);

            // Thực thi logic xử lý accounts list
            await accountsListHandler.execute();

            console.log('✅ Đã hoàn thành xử lý accounts list');

        } catch (error) {
            console.error('Lỗi khi xử lý accounts list:', error.message);
            throw error;
        }
    }

    // Helper method: Kiểm tra URL có phải survey không
    isSurveyUrl(url) {
        // Chỉ check phần đầu cố định, params sau sẽ thay đổi
        return url.includes('web-sg.tiktok.com/survey');
    }

    // Method mới: Xử lý survey redirect
    async handleSurveyRedirect() {
        console.log('🔍 Kiểm tra survey redirect...');

        try {
            // Monitor URL changes và new tabs
            const checkRedirect = async() => {
                const currentUrl = await this.page.url();
                console.log('Current URL:', currentUrl);

                // Kiểm tra redirect sang survey  
                if (this.isSurveyUrl(currentUrl)) {
                    console.log('🚨 Phát hiện redirect sang survey URL:', currentUrl);

                    // Quay về trang trước đó
                    await this.page.goBack();
                    await randomDelay(2000, 3000);

                    console.log('✅ Đã quay về trang trước survey');
                    return true;
                }

                return false;
            };

            // Kiểm tra redirect trong 10 giây
            let redirectHandled = false;
            let attempts = 0;
            const maxAttempts = 20; // 20 x 500ms = 10 seconds

            while (!redirectHandled && attempts < maxAttempts) {
                redirectHandled = await checkRedirect();
                if (!redirectHandled) {
                    await randomDelay(500, 500);
                    attempts++;
                }
            }

            return redirectHandled;

        } catch (error) {
            console.error('❌ Lỗi khi xử lý survey redirect:', error.message);
            return false;
        }
    }

    // Method mới: Continuous monitoring cho survey redirect
    async continuousMonitorSurvey() {
        console.log('🔄 Bắt đầu monitor survey redirect liên tục...');

        // Lưu URL hiện tại để có thể quay về
        let lastValidUrl = await this.page.url();

        const monitorInterval = setInterval(async() => {
            try {
                const currentUrl = await this.page.url();

                // Cập nhật lastValidUrl nếu không phải survey
                if (!this.isSurveyUrl(currentUrl) && currentUrl.includes('business.tiktok.com')) {
                    lastValidUrl = currentUrl;
                }

                // Kiểm tra survey redirect trên tab hiện tại
                if (this.isSurveyUrl(currentUrl)) {
                    console.log('🚨 Phát hiện survey redirect (monitor):', currentUrl);
                    console.log('📋 Survey URL detected:', currentUrl.substring(0, 100) + '...');

                    try {
                        // Thử quay về trang trước trước
                        await this.page.goBack();
                        await randomDelay(1000, 2000);

                        const backUrl = await this.page.url();
                        console.log('✅ Đã go back, URL hiện tại:', backUrl);

                        // Nếu vẫn ở survey page, navigate về lastValidUrl
                        if (this.isSurveyUrl(backUrl)) {
                            console.log('⚠️ Vẫn ở survey page, navigate về URL hợp lệ:', lastValidUrl);
                            await this.page.goto(lastValidUrl, {
                                waitUntil: 'networkidle2',
                                timeout: 15000
                            });
                            await randomDelay(2000, 3000);
                        }
                    } catch (navError) {
                        console.log('❌ Lỗi navigation, thử fallback:', navError.message);

                        // Fallback: navigate về business center
                        const businessUrl = 'https://business.tiktok.com/';
                        await this.page.goto(businessUrl, {
                            waitUntil: 'networkidle2',
                            timeout: 15000
                        });
                        await randomDelay(2000, 3000);
                    }
                }

                // Kiểm tra và đóng new tabs có survey
                const browser = this.page.browser();
                const pages = await browser.pages();

                for (const page of pages) {
                    if (page !== this.page) {
                        try {
                            const pageUrl = await page.url();
                            if (this.isSurveyUrl(pageUrl)) {
                                console.log('🚨 Phát hiện survey trong tab mới:', pageUrl.substring(0, 80) + '...');
                                await page.close();
                                console.log('✅ Đã đóng tab survey');
                            }
                        } catch (error) {
                            // Ignore error khi check/close tabs
                            console.log('⚠️ Không thể xử lý tab:', error.message);
                        }
                    }
                }

                // Monitor popup/modal có survey không
                try {
                    const hasSurveyModal = await this.page.evaluate(() => {
                        // Tìm modal/popup có chứa survey link
                        const modals = document.querySelectorAll('[role="dialog"], .modal, .popup, [class*="modal"], [class*="popup"]');
                        for (const modal of modals) {
                            const modalContent = modal.textContent || modal.innerHTML;
                            if (modalContent.includes('web-sg.tiktok.com/survey')) {
                                return true;
                            }
                        }
                        return false;
                    });

                    if (hasSurveyModal) {
                        console.log('🚨 Phát hiện survey modal, đóng modal...');

                        // Thử đóng modal bằng ESC hoặc close button
                        await this.page.keyboard.press('Escape');
                        await randomDelay(500, 1000);

                        // Hoặc click button đóng nếu có
                        await this.page.evaluate(() => {
                            const closeButtons = document.querySelectorAll('[aria-label="close"], [aria-label="Close"], .close, .modal-close, [title="Close"]');
                            for (const btn of closeButtons) {
                                if (btn.offsetParent !== null) {
                                    btn.click();
                                    break;
                                }
                            }
                        });

                        console.log('✅ Đã đóng survey modal');
                    }
                } catch (modalError) {
                    // Ignore modal handling errors
                }

            } catch (error) {
                console.log('⚠️ Lỗi monitor survey:', error.message);
            }
        }, 800); // Check mỗi 0.8 giây để phản ứng nhanh hơn

        // Lưu interval để có thể clear later
        this.surveyMonitorInterval = monitorInterval;

        console.log('✅ Survey monitoring đã được khởi động (check mỗi 0.8s)');
        return monitorInterval;
    }

    // Method để stop monitoring
    stopSurveyMonitoring() {
        if (this.surveyMonitorInterval) {
            clearInterval(this.surveyMonitorInterval);
            this.surveyMonitorInterval = null;
            console.log('⏹️ Đã dừng survey monitoring');
        }
    }

    // Method mới: Prevent survey links (Enhanced)
    async preventSurveyLinks() {
        console.log('🔒 Đang setup prevent survey links nâng cao...');

        try {
            await this.page.evaluate(() => {
                // Override window.open để block survey
                const originalOpen = window.open;
                window.open = function(url, target, features) {
                    const isSurvey = url && url.includes('web-sg.tiktok.com/survey');

                    if (isSurvey) {
                        console.log('🚨 Blocked survey popup via window.open:', url);
                        return null;
                    }

                    return originalOpen.call(window, url, target, features);
                };

                // Override location change methods
                const originalAssign = window.location.assign;
                const originalReplace = window.location.replace;

                window.location.assign = function(url) {
                    if (url && url.includes('web-sg.tiktok.com/survey')) {
                        console.log('🚨 Blocked survey via location.assign:', url);
                        return;
                    }
                    return originalAssign.call(window.location, url);
                };

                window.location.replace = function(url) {
                    if (url && url.includes('web-sg.tiktok.com/survey')) {
                        console.log('🚨 Blocked survey via location.replace:', url);
                        return;
                    }
                    return originalReplace.call(window.location, url);
                };

                // Block survey links clicks (enhanced)
                document.addEventListener('click', function(event) {
                    const target = event.target;

                    // Check for direct href
                    let href = target.href;

                    // Check parent elements for href
                    if (!href) {
                        const parentA = target.closest('a');
                        if (parentA) href = parentA.href;
                    }

                    // Check for data attributes that might contain survey links
                    const dataUrl = target.getAttribute('data-url') || target.getAttribute('data-href');
                    if (dataUrl && dataUrl.includes('web-sg.tiktok.com/survey')) {
                        console.log('🚨 Blocked survey link via data attribute:', dataUrl);
                        event.preventDefault();
                        event.stopPropagation();
                        return false;
                    }

                    if (href && href.includes('web-sg.tiktok.com/survey')) {
                        console.log('🚨 Blocked survey link click:', href);
                        event.preventDefault();
                        event.stopPropagation();
                        return false;
                    }
                }, true);

                // Monitor for dynamically added survey links
                const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeType === 1) { // Element node
                                // Check the node itself
                                if (node.href && node.href.includes('web-sg.tiktok.com/survey')) {
                                    console.log('🚨 Removed dynamically added survey link:', node.href);
                                    node.remove();
                                }

                                // Check children
                                const surveyLinks = node.querySelectorAll && node.querySelectorAll('a[href*="web-sg.tiktok.com/survey"]');
                                if (surveyLinks) {
                                    surveyLinks.forEach(function(link) {
                                        console.log('🚨 Removed dynamically added survey link (child):', link.href);
                                        link.remove();
                                    });
                                }
                            }
                        });
                    });
                });

                observer.observe(document, {
                    childList: true,
                    subtree: true
                });

                // Store observer for cleanup
                window.__surveyLinkObserver = observer;

                console.log('✅ Enhanced survey prevention setup complete');
            });

            // Also setup page-level navigation blocking
            await this.page.evaluateOnNewDocument(() => {
                // This runs on every page load/navigation
                const originalOpen = window.open;
                window.open = function(url, target, features) {
                    if (url && url.includes('web-sg.tiktok.com/survey')) {
                        console.log('🚨 Blocked survey popup on new document:', url);
                        return null;
                    }
                    return originalOpen.call(window, url, target, features);
                };
            });

            console.log('✅ Đã setup prevent survey links nâng cao');

        } catch (error) {
            console.error('❌ Lỗi setup prevent survey links:', error.message);
        }
    }

    async execute() {
        console.log('=== BẮT ĐẦU POST SETUP ===');

        try {
            // 1. Chờ và xử lý two-step verification
            await this.waitForTwoStepVerification();
            await this.skipTwoStepVerification();

            // Ép chuyển giao diện sang tiếng Việt sau khi xong 2FA
            await this.page.evaluate(() => {
                // Set localStorage
                localStorage.setItem('selected_lang', 'vi');
                localStorage.setItem('__Garfish__react__business_suite_lang', 'vi-VN');
                // Set cookie
                document.cookie = 'lang_type=vi; path=/; domain=' + location.hostname + ';';
                // Reload
                location.reload();
            });
            // Chờ reload hoàn tất
            await this.page.waitForFunction(() => document.readyState === 'complete', { timeout: 20000 });
            await randomDelay(2000, 3000);

            // 2. Chuyển đến trang Accounts
            await this.navigateToAccounts();
            await this.waitForAccountsPageLoad();

            // 🛡️ Khởi động Global Survey Protection (thay thế local logic)
            console.log('🛡️ Khởi động Global Survey Protection cho PostSetup...');
            this.surveyProtection = await SurveyProtectionService.createGlobalProtection(this.page);

            // 3. Điền form thông tin
            await this.selectIndustry();

            // Kiểm tra survey redirect sau khi chọn ngành
            await this.handleSurveyRedirect();
            await randomDelay(1000, 2000);

            await this.fillResponsiblePerson();
            await this.selectPhoneCountryCode();
            await this.fillPhoneNumber();

            // 4. Verify và gửi OTP
            console.log('🔄 Verify số điện thoại...');
            await randomDelay(2000, 3000);

            const phoneInput = await this.page.waitForSelector('input[type="tel"]', { timeout: 5000 });
            const phoneValue = await phoneInput.evaluate(el => el.value);
            console.log(`Số điện thoại hiện tại: ${phoneValue}`);

            if (!phoneValue || phoneValue.length < 9) {
                throw new Error('Số điện thoại không hợp lệ');
            }

            console.log('✅ Số điện thoại hợp lệ, sẵn sàng gửi OTP');
            await randomDelay(2000, 3000);

            // 5. Click button Gửi
            const sendSuccess = await this.clickSendButton();
            if (!sendSuccess) {
                throw new Error('Không thể click button Gửi');
            }

            // 6. Chờ và xử lý OTP
            const otpResult = await this.waitForOtpAndFill();
            if (!otpResult) {
                console.log('❌ Xử lý OTP thất bại, dừng quy trình');
                this.stopSurveyMonitoring();
                return { bcProcessCompleted: false };
            }
            await randomDelay(2000, 3000);

            // 7. Chuyển đến trang danh sách accounts
            const orgId = await this.navigateToAccountsList();
            await this.handleAccountsList(orgId);

            // 🛡️ Dừng Global Survey Protection
            if (this.surveyProtection) {
                this.surveyProtection.stopProtection();
                this.surveyProtection = null;
            }

            console.log('=== HOÀN THÀNH POST SETUP ===');

            return {
                bcProcessCompleted: true,
                accountType: this.userConfig.accountType || 'bc', // BC type user chọn
                billingType: this.bcType || 'Unknown', // Billing type tự detect
                bcType: `${this.userConfig.accountType || 'bc'}_${this.bcType || 'Unknown'}` // Combined type
            };

        } catch (error) {
            console.error('Lỗi trong PostSetup:', error.message);

            // 🛡️ Dừng Global Survey Protection khi có lỗi
            if (this.surveyProtection) {
                this.surveyProtection.stopProtection();
                this.surveyProtection = null;
            }

            throw error;
        }
    }
}

module.exports = PostSetup;