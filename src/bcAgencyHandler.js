const SurveyProtectionService = require('./services/surveyProtectionService');

class BcAgencyHandler {
    constructor(page, userConfig) {
        this.page = page;
        this.userConfig = userConfig;
        this.surveyProtection = null;
    }

    async execute() {
        console.log('=== TẠO TÀI KHOẢN BC AGENCY (FLOW CHUẨN) === [bcAgencyHandler.js:8]');

        try {
            // 🛡️ Khởi động Survey Protection cho bcAgencyHandler
            console.log('🛡️ Khởi động Survey Protection cho BC Agency Handler...');
            this.surveyProtection = await SurveyProtectionService.createGlobalProtection(this.page);

            for (let loop = 1; loop <= 3; loop++) {
                console.log(`\n--- BẮT ĐẦU LẦN ${loop} --- [bcAgencyHandler.js:10]`);
                if (loop === 1) {
                    // Lần đầu: Click "Tạo mới"
                    console.log('Bước 1: Click "Tạo mới" [bcAgencyHandler.js:13]');
                    await this.clickElement("//button[normalize-space(text())='Tạo mới']");
                    console.log('✅ Đã click button Tạo mới [bcAgencyHandler.js:14]');
                    await this.delay(1500, 2500);
                } else {
                    // Lần 2, 3: Click Thêm tài khoản nhà quảng cáo, Tạo mới, Tiếp xác nhận
                    console.log('Bước 1: Chờ và click Thêm tài khoản nhà quảng cáo [bcAgencyHandler.js:19]');
                    await this.delay(10000, 16000);
                    await this.clickElement("//button[normalize-space(text())='Thêm tài khoản nhà quảng cáo']");
                    console.log('✅ Đã click Thêm tài khoản nhà quảng cáo [bcAgencyHandler.js:20]');
                    await this.delay(2000, 4000);
                    console.log('Bước 2: Click Tạo mới [bcAgencyHandler.js:22]');
                    await this.clickElement("//p[normalize-space(text())='Tạo mới']");
                    console.log('✅ Đã click Tạo mới [bcAgencyHandler.js:23]');
                    await this.delay(1000, 2000);
                    console.log('Bước 3: Click Tiếp xác nhận [bcAgencyHandler.js:25]');
                    await this.clickElement("//button[normalize-space(text())='Tiếp' and contains(@class, 'bc-okee-confirm-ok')]");
                    console.log('✅ Đã click Tiếp xác nhận [bcAgencyHandler.js:26]');
                    await this.delay(2000, 3000);
                }
                await this.createAgencyAccount(loop);
            }

        } catch (error) {
            console.error('Lỗi trong BC Agency Handler:', error.message);
            throw error;
        } finally {
            // 🛡️ Dừng Survey Protection
            if (this.surveyProtection) {
                this.surveyProtection.stopProtection();
                this.surveyProtection = null;
                console.log('✅ Đã dừng Survey Protection (BC Agency Handler)');
            }
        }
    }

    async createAgencyAccount(loop) {
        try {
            // 1. Chọn nơi đăng kí
            console.log('Bước 1: Chọn nơi đăng kí [bcAgencyHandler.js:36]');
            const countryToSelect = this.userConfig.companyCountry && this.userConfig.companyCountry.length > 0 ? this.userConfig.companyCountry : 'Việt Nam';
            await this.page.waitForSelector('input[placeholder*="nơi đăng kí"]', {
                visible: true,
                timeout: 15000
            });
            await this.page.click('input[placeholder*="nơi đăng kí"]');
            await this.delay(500, 800);

            await this.page.evaluate((country) => {
                const items = [...document.querySelectorAll('.vi-select-dropdown__item span')];
                const target = items.find(el => el.innerText.trim() === country);
                if (target) target.click();
            }, countryToSelect);
            console.log('✅ Đã chọn nơi đăng kí:', countryToSelect, '[bcAgencyHandler.js:49]');
            await this.delay(1000, 1500);

            // 2. Điền tên công ty
            console.log('Bước 2: Điền tên công ty [bcAgencyHandler.js:52]');
            const companyName = this.userConfig.companyName && this.userConfig.companyName.length > 0 ?
                this.userConfig.companyName :
                `Cty_${Math.random().toString(36).substring(2, 8)}`;
            await this.page.waitForSelector('input[placeholder="Tìm kiếm theo tên công ty"]', {
                visible: true,
                timeout: 10000
            });
            await this.page.click('input[placeholder="Tìm kiếm theo tên công ty"]');
            await this.page.keyboard.down('Control');
            await this.page.keyboard.press('KeyA');
            await this.page.keyboard.up('Control');
            await this.page.type('input[placeholder="Tìm kiếm theo tên công ty"]', companyName);
            console.log('✅ Đã điền tên công ty:', companyName, '[bcAgencyHandler.js:65]');
            await this.delay(700, 1200);

            // 3. Điền trang web công ty
            console.log('Bước 3: Điền website công ty [bcAgencyHandler.js:68]');
            const website = this.userConfig.companyWebsite && this.userConfig.companyWebsite.length > 0 ?
                this.userConfig.companyWebsite :
                `https://company${Math.floor(Math.random()*10000)}.com`;
            await this.page.waitForSelector('input[placeholder*="nhiều URL"]', {
                visible: true,
                timeout: 10000
            });
            await this.page.click('input[placeholder*="nhiều URL"]');
            await this.page.keyboard.down('Control');
            await this.page.keyboard.press('KeyA');
            await this.page.keyboard.up('Control');
            await this.page.type('input[placeholder*="nhiều URL"]', website);
            console.log('✅ Đã điền website công ty:', website, '[bcAgencyHandler.js:81]');
            // Trigger blur sau khi nhập website
            await this.page.evaluate(() => {
                const input = document.querySelector('input[placeholder*="nhiều URL"]');
                if (input) input.blur();
            });
            await this.delay(2500, 4500);

            // 4. Click Tiếp (bước 1)
            console.log('Bước 4: Click Tiếp (bước 1) [bcAgencyHandler.js:90]');
            await this.clickElement("(//button[span[normalize-space(text())='Tiếp']])[last()]");
            await this.delay(2500, 4500);
            console.log('✅ Đã click button Tiếp (bước 1, đúng XPath) [bcAgencyHandler.js:97]');
            await this.delay(2000, 3000);

            // 5. Chọn ngành
            console.log('Bước 5: Chọn ngành [bcAgencyHandler.js:99]');
            await this.page.waitForSelector('input[placeholder="Chọn một ngành"]', {
                visible: true,
                timeout: 15000
            });
            await this.page.click('input[placeholder="Chọn một ngành"]');
            await this.delay(500, 800);

            await this.page.evaluate(() => {
                // Click mở dropdown ngành
                const input = document.querySelector('input[placeholder*="ngành"]');
                if (!input) {
                    console.error('❌ Không tìm thấy ô ngành');
                    return;
                }
                input.click();
                setTimeout(() => {
                    const menu1 = document.querySelector('.vi-cascader-menu');
                    if (!menu1) {
                        console.error('❌ Không tìm thấy menu cấp 1');
                        return;
                    }
                    const item1 = [...menu1.querySelectorAll('li')].find(el => el.innerText.trim() === 'Thương mại điện tử');
                    if (!item1) {
                        console.error('❌ Không tìm thấy "Thương mại điện tử"');
                        return;
                    }
                    item1.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                    setTimeout(() => {
                        const menus = document.querySelectorAll('.vi-cascader-menu');
                        if (menus.length < 2) {
                            console.error('⏰ Timeout: Không thấy menu cấp 2');
                            return;
                        }
                        const menu2 = menus[1];
                        const item2 = [...menu2.querySelectorAll('li')].find(el => el.innerText.trim() === 'Thiết bị điện');
                        if (!item2) {
                            console.error('❌ Không tìm thấy "Thiết bị điện"');
                            return;
                        }
                        item2.click();
                        console.log('✅ Đã chọn Thương mại điện tử → Thiết bị điện');
                    }, 500);
                }, 300);
            });
            await this.delay(1000, 1500);

            // 6. Điền Tên tài khoản random
            console.log('Bước 6: Điền tên tài khoản quảng cáo [bcAgencyHandler.js:147]');
            const accountName = `Agency_${Math.random().toString(36).substring(2, 8)}`;
            await this.page.waitForSelector('input[placeholder="Nhập tên tài khoản quảng cáo"]', {
                visible: true,
                timeout: 10000
            });
            await this.page.click('input[placeholder="Nhập tên tài khoản quảng cáo"]');
            await this.page.keyboard.down('Control');
            await this.page.keyboard.press('KeyA');
            await this.page.keyboard.up('Control');
            await this.page.type('input[placeholder="Nhập tên tài khoản quảng cáo"]', accountName);
            console.log('✅ Đã điền tên tài khoản:', accountName, '[bcAgencyHandler.js:157]');
            await this.delay(700, 1200);

            // 7. Chọn Múi giờ (UTC+07:00 Hồ Chí Minh)
            console.log('Bước 7: Chọn múi giờ [bcAgencyHandler.js:161]');
            await this.page.waitForSelector('input[placeholder="Chọn múi giờ"]', {
                visible: true,
                timeout: 10000
            });
            await this.page.click('input[placeholder="Chọn múi giờ"]');
            await this.delay(700, 1200);

            await this.page.evaluate(() => {
                const listItems = [...document.querySelectorAll('.vi-select-dropdown__item span')];
                const target = listItems.find(el => el.innerText.includes('UTC+07:00') && el.innerText.includes('Hồ Chí Minh'));
                if (target) target.click();
            });
            console.log('✅ Đã chọn múi giờ Hồ Chí Minh [bcAgencyHandler.js:173]');
            await this.delay(1000, 1500);

            // 7.5. Chọn Bang/Tỉnh nếu đăng ký ở Hoa Kỳ (Mỹ)
            console.log('🔄 [bcAgencyHandler] Calling handleUSStateSelection...');
            console.log(`🔄 [bcAgencyHandler] Country selected: "${countryToSelect}"`);
            await this.handleUSStateSelection(countryToSelect);
            console.log('✅ [bcAgencyHandler] handleUSStateSelection completed');

            // 8. Điền địa chỉ đường phố (optional)
            console.log('Bước 8: Điền địa chỉ đường phố [bcAgencyHandler.js:177]');
            const street = `So ${Math.floor(Math.random()*1000)} Nguyen Van Linh`;
            const streetInputFilled = await this.fillInputIfExists(
                'input[placeholder="Nhập địa chỉ đường phố của bạn"]',
                street,
                'địa chỉ đường phố'
            );

            // 9. Điền postal code (optional)
            console.log('Bước 9: Điền postal code [bcAgencyHandler.js:191]');
            const postal = `${Math.floor(10000 + Math.random()*90000)}`;
            const postalInputFilled = await this.fillInputIfExists(
                'input[placeholder="Enter postal code"]',
                postal,
                'postal code'
            );

            // 10. Check và click button Tiếp nếu có (sau khi điền thông tin)
            console.log('Bước 10: Kiểm tra button Tiếp sau khi điền thông tin [bcAgencyHandler.js:202]');
            const nextButtonClicked = await this.clickElementIfExists(
                "(//button[span[normalize-space(text())='Tiếp']])[last()]",
                'button Tiếp sau bước 9'
            );

            if (nextButtonClicked) {
                await this.delay(5000, 10000);

                // 10.1. Kiểm tra và xử lý các input bổ sung sau khi click Tiếp
                console.log('Bước 10.1: Kiểm tra các input bổ sung sau khi click Tiếp [bcAgencyHandler.js:208]');

                // Kiểm tra input địa chỉ đường phố
                const additionalStreet = `So ${Math.floor(Math.random()*1000)} Le Loi Street`;
                const additionalStreetFilled = await this.fillInputIfExists(
                    '//input[@placeholder="Nhập địa chỉ đường phố của bạn"]',
                    additionalStreet,
                    'địa chỉ đường phố bổ sung',
                    true // sử dụng XPath
                );

                // Kiểm tra input postal code
                const additionalPostal = `${Math.floor(10000 + Math.random()*90000)}`;
                const additionalPostalFilled = await this.fillInputIfExists(
                    '//input[@placeholder="Enter postal code"]',
                    additionalPostal,
                    'postal code bổ sung',
                    true // sử dụng XPath
                );

                // Kiểm tra và click checkbox nếu có
                const checkboxClicked = await this.clickElementIfExists(
                    "//label[@class='vi-checkbox']",
                    'checkbox vi-checkbox'
                );

                // Kiểm tra button Tiếp tiếp theo
                const additionalNextButtonClicked = await this.clickElementIfExists(
                    "(//button[span[normalize-space(text())='Tiếp']])[last()]",
                    'button Tiếp bổ sung'
                );

                if (additionalNextButtonClicked) {
                    console.log('✅ Đã click button Tiếp bổ sung, chờ 5-10s trước khi gửi');
                    await this.delay(5000, 10000);
                }
            }

            // 11. Click Gửi (bước cuối)
            console.log('Bước 11: Click Gửi (bước cuối) [bcAgencyHandler.js:240]');
            await this.clickElement("(//div[@role='dialog_footer']//button[.//span[normalize-space(text())='Gửi']])[3]");
            console.log('✅ Đã click button Gửi (bước cuối) [bcAgencyHandler.js:241]');
            await this.delay(3000, 5000);

        } catch (error) {
            console.error('Lỗi khi tạo tài khoản BC agency:', error.message, '[bcAgencyHandler.js:245]');
            throw error;
        }
    }

    /**
     * Điền input nếu element tồn tại và hiển thị
     * @param {string} selector - CSS selector hoặc XPath
     * @param {string} value - Giá trị cần điền
     * @param {string} fieldName - Tên field để log
     * @param {boolean} isXPath - true nếu selector là XPath
     * @returns {Promise<boolean>} - true nếu đã điền thành công
     */
    async fillInputIfExists(selector, value, fieldName, isXPath = false) {
        try {
            let element;

            if (isXPath) {
                // Sử dụng XPath
                const elementExists = await this.page.evaluate((xpath) => {
                    const result = document.evaluate(
                        xpath,
                        document,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    );
                    const element = result.singleNodeValue;

                    if (!element) return false;

                    // Kiểm tra element có hiển thị không
                    const style = window.getComputedStyle(element);
                    return (
                        element.offsetParent !== null &&
                        style.visibility !== 'hidden' &&
                        style.display !== 'none' &&
                        style.opacity !== '0'
                    );
                }, selector);

                if (!elementExists) {
                    console.log(`⚠️ Không tìm thấy ô ${fieldName}, bỏ qua bước này`);
                    return false;
                }

                // Điền thông tin bằng XPath
                await this.page.evaluate((xpath, value) => {
                    const result = document.evaluate(
                        xpath,
                        document,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    );
                    const element = result.singleNodeValue;

                    if (element) {
                        element.focus();
                        element.select();
                        element.value = value;
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, selector, value);

            } else {
                // Sử dụng CSS selector
                element = await this.page.$(selector);
                if (!element) {
                    console.log(`⚠️ Không tìm thấy ô ${fieldName}, bỏ qua bước này`);
                    return false;
                }

                const isVisible = await this.page.evaluate(el => {
                    if (!el || !(el instanceof HTMLElement)) return false;
                    const style = window.getComputedStyle(el);
                    return (
                        el.offsetParent !== null &&
                        style.visibility !== 'hidden' &&
                        style.display !== 'none' &&
                        style.opacity !== '0'
                    );
                }, element);

                if (!isVisible) {
                    console.log(`⚠️ Ô ${fieldName} không hiển thị, bỏ qua bước này`);
                    return false;
                }

                // Điền thông tin
                await element.click({ delay: 100 });
                await this.page.keyboard.down('Control');
                await this.page.keyboard.press('KeyA');
                await this.page.keyboard.up('Control');
                await element.type(value);
            }

            console.log(`✅ Đã điền ${fieldName}:`, value);
            await this.delay(700, 1200);
            return true;

        } catch (error) {
            console.log(`⚠️ Không thể điền ${fieldName}, bỏ qua bước này:`, error.message);
            return false;
        }
    }

    /**
     * Click element nếu tồn tại và hiển thị
     * @param {string} xpath - XPath của element
     * @param {string} elementName - Tên element để log
     * @returns {Promise<boolean>} - true nếu click thành công
     */
    async clickElementIfExists(xpath, elementName) {
        try {
            // Sử dụng page.evaluate để kiểm tra element
            const elementExists = await this.page.evaluate((xpath) => {
                const result = document.evaluate(
                    xpath,
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                );
                const element = result.singleNodeValue;

                if (!element) return false;

                // Kiểm tra element có hiển thị không
                const style = window.getComputedStyle(element);
                return (
                    element.offsetParent !== null &&
                    style.visibility !== 'hidden' &&
                    style.display !== 'none' &&
                    style.opacity !== '0'
                );
            }, xpath);

            if (!elementExists) {
                console.log(`⚠️ Không tìm thấy ${elementName}, tiếp tục các bước tiếp theo`);
                return false;
            }

            // Click element
            await this.clickElement(xpath);
            console.log(`✅ Đã click ${elementName}`);
            return true;

        } catch (error) {
            console.log(`⚠️ Không thể click ${elementName}, bỏ qua:`, error.message);
            return false;
        }
    }

    /**
     * Click element với XPath (phiên bản cải tiến)
     * @param {string} xpath - XPath của element
     */
    async clickElement(xpath) {
        try {
            // Đợi element xuất hiện và hiển thị
            await this.page.waitForFunction(
                (xpath) => {
                    const result = document.evaluate(
                        xpath,
                        document,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    );
                    const element = result.singleNodeValue;
                    if (!element) return false;

                    const style = window.getComputedStyle(element);
                    return (
                        element.offsetParent !== null &&
                        style.visibility !== 'hidden' &&
                        style.display !== 'none' &&
                        style.opacity !== '0'
                    );
                }, {
                    timeout: 10000,
                    polling: 'raf' // Request animation frame polling for better performance
                },
                xpath
            );

            // Click element
            const clicked = await this.page.evaluate((xpath) => {
                const result = document.evaluate(
                    xpath,
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                );
                const element = result.singleNodeValue;

                if (!element) return false;

                // Scroll element vào view
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'center'
                });

                // Thử các cách click khác nhau
                try {
                    // Cách 1: Click trực tiếp
                    element.click();
                    return true;
                } catch (e1) {
                    try {
                        // Cách 2: Dispatch MouseEvent
                        element.dispatchEvent(new MouseEvent('click', {
                            view: window,
                            bubbles: true,
                            cancelable: true,
                            button: 0
                        }));
                        return true;
                    } catch (e2) {
                        try {
                            // Cách 3: Focus và trigger
                            element.focus();
                            element.dispatchEvent(new Event('click', { bubbles: true }));
                            return true;
                        } catch (e3) {
                            console.error('Tất cả các cách click đều thất bại:', e1.message, e2.message, e3.message);
                            return false;
                        }
                    }
                }
            }, xpath);

            if (!clicked) {
                throw new Error(`❌ Không thể click element với XPath: ${xpath}`);
            }

            // Delay nhỏ sau khi click
            await this.delay(200, 500);

        } catch (error) {
            console.error('❌ Lỗi khi click element:', error.message);
            throw new Error(`❌ Lỗi khi click element: ${error.message}`);
        }
    }

    /**
     * Xử lý chọn Bang/Tỉnh nếu đăng ký ở Hoa Kỳ
     * @param {string} selectedCountry - Quốc gia đã chọn
     */
    async handleUSStateSelection(selectedCountry) {
        console.log('\n🇺🇸 ==> ENTERING handleUSStateSelection()');
        console.log(`🇺🇸 ==> selectedCountry: "${selectedCountry}"`);

        try {
            // Kiểm tra xem có phải Hoa Kỳ không (hỗ trợ nhiều cách viết)
            console.log('🔍 Checking if country is USA...');
            const isUSA = this.isUSACountry(selectedCountry);
            console.log(`🔍 isUSACountry result: ${isUSA}`);

            if (!isUSA) {
                console.log('⚠️ Không phải Hoa Kỳ, bỏ qua chọn bang/tỉnh');
                console.log('🇺🇸 ==> EXITING handleUSStateSelection() - NOT USA');
                return;
            }

            console.log('🇺🇸 Đã chọn Hoa Kỳ, cần chọn bang/tỉnh...');

            // Đợi form render và tìm administrative-district-item
            await this.delay(2000, 3000);

            // Kiểm tra xem có field chọn bang/tỉnh không
            const hasStateField = await this.page.evaluate(() => {
                // Tìm element theo nhiều cách khác nhau để robust
                const stateSelectors = [
                    '.administrative-district-item .vi-input--suffix',
                    '.administrative-district-item .vi-select',
                    '[class*="administrative-district"] .vi-input--suffix',
                    'input[placeholder*="tỉnh"]',
                    'input[placeholder*="tiểu bang"]',
                    'input[placeholder*="Chọn tỉnh"]',
                    'input[placeholder*="bang/tỉnh"]'
                ];

                for (const selector of stateSelectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        // Kiểm tra element có hiển thị không
                        const style = window.getComputedStyle(element);
                        const isVisible = (
                            element.offsetParent !== null &&
                            style.visibility !== 'hidden' &&
                            style.display !== 'none' &&
                            style.opacity !== '0'
                        );
                        if (isVisible) {
                            console.log('✅ Tìm thấy field bang/tỉnh:', selector);
                            return { found: true, selector };
                        }
                    }
                }
                return { found: false };
            });

            if (!hasStateField.found) {
                console.log('⚠️ Không tìm thấy field chọn bang/tỉnh, có thể chưa render hoặc không cần thiết');
                return;
            }

            console.log('✅ Tìm thấy field bang/tỉnh, bắt đầu chọn...');

            // Mở dropdown và chọn Texas (fix cứng theo yêu cầu user)
            const selectedState = await this.page.evaluate(() => {
                console.log('🖱️ Mở dropdown bang/tỉnh...');

                // Debug: kiểm tra element trước khi click
                const dropdownElement = document.querySelector('.administrative-district-item .vi-input--suffix');
                console.log('🔍 Dropdown element found:', !!dropdownElement);

                if (dropdownElement) {
                    // Log thông tin về element
                    const parentText = dropdownElement.closest('.administrative-district-item').textContent;
                    console.log('📋 Parent element text:', parentText.trim().substring(0, 100));

                    // Mở dropdown
                    dropdownElement.click();
                    console.log('✅ Đã click mở dropdown');
                } else {
                    console.log('❌ Không tìm thấy dropdown element');
                }

                // Đợi dropdown render và chọn Texas
                return new Promise((resolve) => {
                    setTimeout(() => {
                        console.log('🔍 Tìm Texas trong options...');
                        const option = Array.from(document.querySelectorAll('.vi-select-dropdown__item'))
                            .find(el => el.textContent.trim() === 'Texas');

                        if (option) {
                            console.log('🎯 Tìm thấy Texas, đang click...');
                            option.click();
                            console.log('✅ Đã chọn Texas thành công');
                            resolve('Texas');
                        } else {
                            console.log('❌ Không tìm thấy Texas trong options');
                            const allOptions = Array.from(document.querySelectorAll('.vi-select-dropdown__item'))
                                .map(el => `"${el.textContent.trim()}"`);
                            console.log('📋 Các options có sẵn:', allOptions.slice(0, 10));
                            resolve(null);
                        }
                    }, 300);
                });
            });

            await this.delay(1000, 1500);

            if (selectedState) {
                console.log(`✅ Đã chọn bang: "${selectedState}"`);
                console.log('✅ Hoàn thành chọn bang/tỉnh cho Hoa Kỳ');
                console.log('🇺🇸 ==> EXITING handleUSStateSelection() - SUCCESS');
            } else {
                console.log('⚠️ Không thể chọn bang/tỉnh, nhưng sẽ tiếp tục');
                console.log('🇺🇸 ==> EXITING handleUSStateSelection() - PARTIAL SUCCESS');
            }

        } catch (error) {
            console.log('⚠️ Lỗi khi xử lý chọn bang/tỉnh:', error.message);
            console.log('⚠️ Tiếp tục với các bước tiếp theo...');
            console.log('🇺🇸 ==> EXITING handleUSStateSelection() - ERROR');
        }
    }

    /**
     * Kiểm tra xem quốc gia có phải Hoa Kỳ không
     * @param {string} country - Tên quốc gia
     * @returns {boolean}
     */
    isUSACountry(country) {
        console.log(`🔍 [isUSACountry] Input: "${country}"`);

        if (!country || typeof country !== 'string') {
            console.log('🔍 [isUSACountry] Invalid input - not a string');
            return false;
        }

        const countryLower = country.toLowerCase().trim();
        console.log(`🔍 [isUSACountry] Normalized: "${countryLower}"`);

        // Danh sách các cách viết Hoa Kỳ trong tiếng Việt và tiếng Anh
        const usaVariants = [
            'hoa kỳ',
            'hoa kì',
            'mỹ',
            'united states',
            'usa',
            'us',
            'america',
            'united states of america',
            'nước mỹ',
            'mỹ quốc'
        ];

        const result = usaVariants.some(variant => {
            const match = countryLower.includes(variant) || variant.includes(countryLower);
            if (match) {
                console.log(`🔍 [isUSACountry] Matched variant: "${variant}"`);
            }
            return match;
        });

        console.log(`🔍 [isUSACountry] Final result: ${result}`);
        return result;
    }

    /**
     * Delay ngẫu nhiên
     * @param {number} min - Thời gian tối thiểu (ms)
     * @param {number} max - Thời gian tối đa (ms)
     */
    async delay(min, max) {
        const ms = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = BcAgencyHandler;