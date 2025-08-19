const { randomDelay, typeHumanLike, generateRandomCompanyName } = require('./utils');
const PostSetup = require('./postSetup');
const SurveyProtectionService = require('./services/surveyProtectionService');

class BCSetup {
    constructor(page, userConfig) {
        this.page = page;
        this.userConfig = userConfig;
        this.surveyProtection = null;
    }

    async detectLanguage() {
        const isVietnamese = await this.page.evaluate(() => {
            const bodyText = document.body.textContent || '';
            return bodyText.includes('Tên công ty') || bodyText.includes('Quốc gia/Khu vực');
        });

        console.log('Ngôn ngữ trang:', isVietnamese ? 'Tiếng Việt' : 'Tiếng Anh');
        return isVietnamese;
    }

    // Improved selector strategy with multiple fallbacks
    getElementSelectors(isVietnamese) {
        return {
            country: {
                primary: isVietnamese ?
                    'input[placeholder*="Chọn địa điểm đăng ký doanh nghiệp"]' : 'input[placeholder*="Select where your business is registered"]',
                fallbacks: [
                    'input[placeholder*="business is registered"]',
                    'input[placeholder*="đăng ký doanh nghiệp"]',
                    'input[class*="bc-okee-input"][readonly]',
                    '.bc-okee-select-input input',
                    'input[type="text"][readonly]'
                ],
                xpath: [
                    '//input[contains(@placeholder, "business is registered")]',
                    '//input[contains(@placeholder, "đăng ký doanh nghiệp")]',
                    '//input[contains(@class, "bc-okee-input") and @readonly]'
                ]
            },
            company: {
                primary: isVietnamese ?
                    'input[placeholder*="Nhập tên pháp lý đầy đủ của doanh nghiệp"]' : 'input[placeholder*="Enter the full legal name of your business"]',
                fallbacks: [
                    'input[placeholder*="legal name"]',
                    'input[placeholder*="company name"]',
                    'input[placeholder*="business name"]',
                    'input[placeholder*="tên pháp lý"]',
                    'input[placeholder*="tên công ty"]',
                    'input[class*="bc-okee-input"]:not([readonly])',
                    'input[type="text"]:not([readonly])'
                ],
                xpath: [
                    '//input[contains(@placeholder, "legal name")]',
                    '//input[contains(@placeholder, "tên pháp lý")]',
                    '//input[contains(@placeholder, "company name") or contains(@placeholder, "business name")]',
                    '//input[contains(@class, "bc-okee-input") and not(@readonly)]'
                ]
            }
        };
    }

    // Universal element finder with multiple strategies
    async findElement(elementConfig, description) {
        console.log(`Đang tìm element: ${description}...`);

        // Strategy 1: Try primary selector
        try {
            await this.page.waitForSelector(elementConfig.primary, { timeout: 3000 });
            console.log(`✓ Tìm thấy ${description} bằng primary selector`);
            return { type: 'css', selector: elementConfig.primary };
        } catch (error) {
            console.log(`× Primary selector thất bại cho ${description}`);
        }

        // Strategy 2: Try fallback selectors
        for (let i = 0; i < elementConfig.fallbacks.length; i++) {
            try {
                const selector = elementConfig.fallbacks[i];
                await this.page.waitForSelector(selector, { timeout: 2000 });
                console.log(`✓ Tìm thấy ${description} bằng fallback selector #${i + 1}: ${selector}`);
                return { type: 'css', selector };
            } catch (error) {
                console.log(`× Fallback selector #${i + 1} thất bại cho ${description}`);
            }
        }

        // Strategy 3: Try XPath selectors
        for (let i = 0; i < elementConfig.xpath.length; i++) {
            try {
                const xpath = elementConfig.xpath[i];
                const element = await this.page.waitForXPath(xpath, { timeout: 2000 });
                if (element) {
                    console.log(`✓ Tìm thấy ${description} bằng XPath #${i + 1}: ${xpath}`);
                    return { type: 'xpath', selector: xpath, element };
                }
            } catch (error) {
                console.log(`× XPath #${i + 1} thất bại cho ${description}`);
            }
        }

        // Strategy 4: Last resort - find by visual inspection
        try {
            const element = await this.findElementByInspection(description);
            if (element) {
                console.log(`✓ Tìm thấy ${description} bằng visual inspection`);
                return element;
            }
        } catch (error) {
            console.log(`× Visual inspection thất bại cho ${description}`);
        }

        throw new Error(`Không thể tìm thấy element: ${description}`);
    }

    // Visual inspection fallback
    async findElementByInspection(description) {
        if (description.includes('company') || description.includes('công ty')) {
            // Look for editable input fields that are not readonly
            const result = await this.page.evaluate(() => {
                const inputs = document.querySelectorAll('input[type="text"]:not([readonly])');
                for (let input of inputs) {
                    const placeholder = input.placeholder.toLowerCase();
                    if (placeholder.includes('name') || placeholder.includes('tên') ||
                        placeholder.includes('company') || placeholder.includes('công ty') ||
                        placeholder.includes('business') || placeholder.includes('doanh nghiệp')) {
                        return input;
                    }
                }
                // If no specific match, return the first editable text input
                return inputs[0] || null;
            });

            if (result) {
                return { type: 'element', element: result };
            }
        }

        if (description.includes('country') || description.includes('quốc gia')) {
            // Look for readonly input fields (typically dropdowns)
            const result = await this.page.evaluate(() => {
                const inputs = document.querySelectorAll('input[type="text"][readonly]');
                for (let input of inputs) {
                    const placeholder = input.placeholder.toLowerCase();
                    if (placeholder.includes('country') || placeholder.includes('quốc gia') ||
                        placeholder.includes('registered') || placeholder.includes('đăng ký')) {
                        return input;
                    }
                }
                return inputs[0] || null;
            });

            if (result) {
                return { type: 'element', element: result };
            }
        }

        return null;
    }

    async selectAccountType() {
        console.log('Đang chọn loại account...');
        await this.page.waitForSelector('.style_bc_type_selector_wrapper__Ho0WQ', { timeout: 30000 });

        // Debug: Kiểm tra có bao nhiêu span option bằng XPath
        const spanCount = await this.page.evaluate(() => {
            const spans = document.evaluate(
                "//span[contains(@class, 'bc-okee-popper-trigger') and contains(@class, 'bc-okee-tooltip')]",
                document,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            );
            return spans.snapshotLength;
        });
        console.log('Số lượng span option tìm thấy:', spanCount);

        // Sử dụng XPath như user đã test thành công
        let targetIndex = 0; // Mặc định là option đầu tiên (BC thường)
        if (this.userConfig.accountType === 'agency') {
            targetIndex = 1; // Option thứ 2 (BC agency)
        }

        const clickResult = await this.page.evaluate((index) => {
            const span = document.evaluate(
                `(//span[contains(@class, 'bc-okee-popper-trigger') and contains(@class, 'bc-okee-tooltip')])[${index + 1}]`,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue;

            if (span) {
                const innerDiv = span.querySelector('div');
                if (innerDiv) {
                    innerDiv.click();
                    return { success: true, text: innerDiv.textContent };
                } else {
                    return { success: false, error: 'Không tìm thấy div bên trong span' };
                }
            } else {
                return { success: false, error: 'Không tìm thấy span option' };
            }
        }, targetIndex);

        console.log('Kết quả click:', clickResult);

        if (!clickResult.success) {
            throw new Error('Click option thất bại: ' + clickResult.error);
        }

        console.log('Đã chọn option:', clickResult.text);
        await randomDelay(2000, 3000);
    }

    async selectCountry(selectors) {
        console.log('Đang chọn quốc gia...');

        // Find country selector using improved method
        const countryElement = await this.findElement(selectors.country, 'country selector');

        // Click to open dropdown
        if (countryElement.type === 'xpath') {
            await countryElement.element.click();
        } else if (countryElement.type === 'element') {
            await countryElement.element.click();
        } else {
            await this.page.click(countryElement.selector);
        }

        // Alternative method using XPath for the trigger
        const clickResult = await this.page.evaluate(() => {
            let el = document.evaluate(
                `//span[contains(@class, 'bc-okee-popper-trigger') and contains(@class, 'bc-okee-popper-trigger-click') and contains(@class, 'bc-okee-select-input')]`,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue;

            if (el) {
                el.click();
                return { success: true };
            }
            return { success: false, error: 'Không tìm thấy trigger element' };
        });

        console.log('Kết quả click trigger:', clickResult);
        await randomDelay(1000, 2000);

        // Tìm và click option quốc gia trong popup
        const targetCountry = this.userConfig.country || 'Việt Nam';
        console.log('Đang tìm quốc gia:', targetCountry);

        // Map tên quốc gia từ tiếng Anh sang tiếng Việt
        const countryMapping = {
            'Argentina': 'Argentina',
            'Australia': 'Úc',
            'Austria': 'Áo',
            'Bahrain': 'Bahrain',
            'Belarus': 'Belarus',
            'Belgium': 'Bỉ',
            'Bolivia (Plurinational State of)': 'Bolivia (Nhà nước đa nguyên)',
            'Brazil': 'Brazil',
            'Bulgaria': 'Bulgaria',
            'Cambodia': 'Campuchia',
            'Canada': 'Canada',
            'Chile': 'Chile',
            'China Outbound': 'Ngoài lãnh thổ Trung Quốc',
            'Colombia': 'Colombia',
            'Costa Rica': 'Costa Rica',
            'Croatia': 'Croatia',
            'Czechia': 'Czechia',
            'Denmark': 'Đan Mạch',
            'Dominican Republic': 'Cộng hòa Dominica',
            'Ecuador': 'Ecuador',
            'Egypt': 'Ai Cập',
            'Estonia': 'Estonia',
            'Finland': 'Phần Lan',
            'France': 'Pháp',
            'Germany': 'Đức',
            'Greece': 'Hy Lạp',
            'Guatemala': 'Guatemala',
            'Hong Kong': 'Hồng Kông',
            'Hungary': 'Hungary',
            'India': 'Ấn Độ',
            'Indonesia': 'Indonesia',
            'Iraq': 'Iraq',
            'Ireland': 'Ireland',
            'Israel': 'Israel',
            'Italy': 'Ý',
            'Japan': 'Nhật Bản',
            'Jordan': 'Jordan',
            'Kazakhstan': 'Kazakhstan',
            'Korea': 'Hàn Quốc',
            'Kuwait': 'Kuwait',
            'Latvia': 'Latvia',
            'Lebanon': 'Lebanon',
            'Lithuania': 'Lithuania',
            'Malaysia': 'Malaysia',
            'Mexico': 'Mexico',
            'Morocco': 'Morocco',
            'Netherlands': 'Hà Lan',
            'New Zealand': 'New Zealand',
            'Norway': 'Na Uy',
            'Oman': 'Oman',
            'Pakistan': 'Pakistan',
            'Panama': 'Panama',
            'Peru': 'Peru',
            'Philippines': 'Philippines',
            'Poland': 'Ba Lan',
            'Portugal': 'Bồ Đào Nha',
            'Qatar': 'Qatar',
            'Romania': 'Romania',
            'Russia': 'Nga',
            'San Marino': 'San Marino',
            'Saudi Arabia': 'Ả Rập Xê Út',
            'Serbia': 'Serbia',
            'Singapore': 'Singapore',
            'Slovakia': 'Slovakia',
            'Slovenia': 'Slovenia',
            'South Africa': 'Nam Phi',
            'Spain': 'Tây Ban Nha',
            'Sri Lanka': 'Sri Lanka',
            'Sweden': 'Thụy Điển',
            'Switzerland': 'Thụy Sĩ',
            'Taiwan': 'Đài Loan',
            'Thailand': 'Thái Lan',
            'Turkey': 'Thổ Nhĩ Kỳ',
            'Ukraine': 'Ukraine',
            'United Arab Emirates': 'Các Tiểu Vương Quốc Ả Rập Thống Nhất',
            'United Kingdom': 'Vương quốc Anh',
            'United States': 'Hoa Kỳ',
            'Uruguay': 'Uruguay',
            'Vietnam': 'Việt Nam'
        };

        // Tìm tên tiếng Việt tương ứng
        const vietnameseCountryName = countryMapping[targetCountry] || targetCountry;
        console.log('Tên quốc gia tiếng Việt:', vietnameseCountryName);

        const countryOption = await this.page.evaluate((country) => {
            const options = document.querySelectorAll('.bc-okee-select-option');
            console.log('Số lượng options tìm thấy:', options.length);

            // Lấy danh sách tất cả quốc gia có sẵn để debug
            const allCountries = [];
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                const innerWrapper = option.querySelector('.bc-okee-list-item-inner-wrapper');
                const text = innerWrapper ? innerWrapper.textContent || '' : '';
                allCountries.push(text);
                console.log(`Option ${i}: "${text}"`);
            }
            console.log('Danh sách quốc gia có sẵn:', allCountries);

            // Tìm quốc gia chính xác (exact match hoặc contains)
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                const innerWrapper = option.querySelector('.bc-okee-list-item-inner-wrapper');
                const text = innerWrapper ? innerWrapper.textContent || '' : '';

                // Thử exact match trước
                if (text.trim() === country.trim()) {
                    console.log('Tìm thấy quốc gia (exact match), click vào container');
                    const container = option.querySelector('.bc-okee-list-item-container');
                    if (container) {
                        // Sử dụng dispatchEvent để tránh bôi đen text
                        const clickEvent = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        });
                        container.dispatchEvent(clickEvent);
                        return { success: true, text: text, matchType: 'exact' };
                    }
                }

                // Thử contains match
                if (text.includes(country) || country.includes(text)) {
                    console.log('Tìm thấy quốc gia (contains match), click vào container');
                    const container = option.querySelector('.bc-okee-list-item-container');
                    if (container) {
                        // Sử dụng dispatchEvent để tránh bôi đen text
                        const clickEvent = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        });
                        container.dispatchEvent(clickEvent);
                        return { success: true, text: text, matchType: 'contains' };
                    }
                }
            }
            return { success: false, error: `Không tìm thấy option ${country}`, allCountries: allCountries };
        }, vietnameseCountryName);

        console.log('Kết quả tìm quốc gia:', countryOption);

        if (!countryOption.success) {
            console.warn(`Không tìm thấy option ${vietnameseCountryName}, thử click option đầu tiên`);
            await this.page.click('.bc-okee-list-item-container:first-child');
        }

        // Chờ popup đóng
        await randomDelay(1000, 2000);
    }

    async selectTimezone() {
        console.log('Đang chọn múi giờ...');

        // Multiple strategies to find timezone selector
        const timezoneSelectors = [
            'input[placeholder*="timezone"]',
            'input[placeholder*="múi giờ"]',
            'select[name*="timezone"]',
            '.timezone-selector',
            '.bc-okee-select-input input'
        ];

        let timezoneTrigger = null;
        for (const selector of timezoneSelectors) {
            try {
                timezoneTrigger = await this.page.waitForSelector(selector, { timeout: 2000 });
                if (timezoneTrigger) {
                    console.log(`Tìm thấy timezone selector: ${selector}`);
                    break;
                }
            } catch (error) {
                continue;
            }
        }

        if (!timezoneTrigger) {
            throw new Error('Không tìm thấy timezone selector');
        }

        await timezoneTrigger.click();
        await randomDelay(1000, 2000);

        const targetTimezone = this.userConfig.timezone || 'UTC+07:00';
        console.log('Đang tìm múi giờ:', targetTimezone);

        const timezoneOption = await this.page.evaluate((timezone) => {
            const options = document.querySelectorAll('option, .bc-okee-select-option');
            console.log('Số lượng timezone options tìm thấy:', options.length);

            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                const text = option.textContent || '';
                console.log(`Timezone Option ${i}: "${text}"`);

                if (text.includes(timezone)) {
                    console.log('Tìm thấy múi giờ, click vào option');
                    option.click();
                    return { success: true, text: text };
                }
            }
            return { success: false, error: `Không tìm thấy timezone ${timezone}` };
        }, targetTimezone);

        console.log('Kết quả tìm múi giờ:', timezoneOption);

        if (!timezoneOption.success) {
            console.warn(`Không tìm thấy timezone ${targetTimezone}, thử click option đầu tiên`);
            await this.page.click('option:first-child, .bc-okee-select-option:first-child');
        }

        await randomDelay(1000, 2000);
    }

    async selectCurrency() {
        console.log('Đang chọn tiền tệ...');

        // Multiple strategies to find currency selector
        const currencySelectors = [
            'input[placeholder*="currency"]',
            'input[placeholder*="tiền tệ"]',
            'select[name*="currency"]',
            '.currency-selector',
            '.bc-okee-select-input input'
        ];

        let currencyTrigger = null;
        for (const selector of currencySelectors) {
            try {
                currencyTrigger = await this.page.waitForSelector(selector, { timeout: 2000 });
                if (currencyTrigger) {
                    console.log(`Tìm thấy currency selector: ${selector}`);
                    break;
                }
            } catch (error) {
                continue;
            }
        }

        if (!currencyTrigger) {
            throw new Error('Không tìm thấy currency selector');
        }

        await currencyTrigger.click();
        await randomDelay(1000, 2000);

        const targetCurrency = this.userConfig.currency || 'VND';
        console.log('Đang tìm tiền tệ:', targetCurrency);

        const currencyOption = await this.page.evaluate((currency) => {
            const options = document.querySelectorAll('option, .bc-okee-select-option');
            console.log('Số lượng currency options tìm thấy:', options.length);

            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                const text = option.textContent || '';
                console.log(`Currency Option ${i}: "${text}"`);

                if (text.includes(currency)) {
                    console.log('Tìm thấy tiền tệ, click vào option');
                    option.click();
                    return { success: true, text: text };
                }
            }
            return { success: false, error: `Không tìm thấy currency ${currency}` };
        }, targetCurrency);

        console.log('Kết quả tìm tiền tệ:', currencyOption);

        if (!currencyOption.success) {
            console.warn(`Không tìm thấy currency ${targetCurrency}, thử click option đầu tiên`);
            await this.page.click('option:first-child, .bc-okee-select-option:first-child');
        }

        await randomDelay(1000, 2000);
    }

    // Improved fillCompanyName with better element finding
    async fillCompanyName(selectors) {
        console.log('Đang điền tên công ty...');
        // Use the improved element finding method
        const companyElement = await this.findElement(selectors.company, 'company name input');
        // Click on the element based on its type
        if (companyElement.type === 'xpath') {
            await companyElement.element.click();
        } else if (companyElement.type === 'element') {
            await companyElement.element.click();
        } else {
            await this.page.click(companyElement.selector);
        }
        await randomDelay(500, 1000);
        const companyName = this.userConfig.companyName || generateRandomCompanyName();
        // Type the company name
        if (companyElement.type === 'xpath' || companyElement.type === 'element') {
            // For XPath or direct element, use page.type on the element
            await this.page.evaluate((element, name) => {
                element.value = '';
                element.focus();
            }, companyElement.element);
            await this.page.type('input:focus', companyName, { delay: 400 });
        } else {
            await typeHumanLike(this.page, companyElement.selector, companyName);
        }
        console.log('Đã điền tên công ty:', companyName);
        await randomDelay(1000, 2000);
    }

    async clickCreateButton() {
        console.log('Đang click nút Tạo...');

        // Multiple strategies to find the create button
        const buttonSelectors = [
            'button.bc-okee-btn span',
            'button[type="submit"]',
            'button:contains("Create")',
            'button:contains("Tạo")',
            '.bc-okee-btn',
            'button.primary',
            'button.submit-btn'
        ];

        let createButton = null;
        for (const selector of buttonSelectors) {
            try {
                createButton = await this.page.waitForSelector(selector, { timeout: 2000 });
                if (createButton) {
                    console.log(`Tìm thấy create button: ${selector}`);
                    break;
                }
            } catch (error) {
                continue;
            }
        }

        if (!createButton) {
            // Try XPath approach
            try {
                createButton = await this.page.waitForXPath('//button[contains(text(), "Create") or contains(text(), "Tạo")]', { timeout: 5000 });
                console.log('Tìm thấy create button bằng XPath');
            } catch (error) {
                throw new Error('Không tìm thấy nút Create/Tạo');
            }
        }

        await createButton.click();
        console.log('Đã click nút Tạo');
        await randomDelay(3000, 5000);
    }

    async setup() {
        try {
            // 🛡️ Khởi động Survey Protection cho bcSetup
            console.log('🛡️ Khởi động Survey Protection cho BC Setup...');
            this.surveyProtection = await SurveyProtectionService.createGlobalProtection(this.page);

            // Ép chuyển giao diện sang tiếng Việt trước khi nhập liệu, tránh popup reload
            await this.page.evaluate(() => {
                // Xóa beforeunload nếu có
                window.onbeforeunload = null;
                // Set localStorage
                localStorage.setItem('selected_lang', 'vi');
                localStorage.setItem('__Garfish__react__business_suite_lang', 'vi-VN');
                // Set cookie
                document.cookie = 'lang_type=vi; path=/; domain=' + location.hostname + ';';
            });
            // Reload lại trang bằng page.goto để tránh popup
            const url = await this.page.url();
            await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            await randomDelay(2000, 3000);

            console.log('Bắt đầu setup Business Center...');

            // 1. Chọn loại account
            await this.selectAccountType();

            // 2. Detect ngôn ngữ và lấy selectors cải tiến
            const isVietnamese = await this.detectLanguage();
            const selectors = this.getElementSelectors(isVietnamese);

            // 3. Điền form thông tin
            console.log('Đang điền thông tin Business Center...');

            // 3.1 Chọn quốc gia
            await this.selectCountry(selectors);

            // 3.2 Chọn múi giờ (nếu có)
            try {
                await this.selectTimezone();
            } catch (error) {
                console.log('Không tìm thấy dropdown múi giờ, bỏ qua...');
            }

            // 3.3 Chọn tiền tệ (nếu có)
            try {
                await this.selectCurrency();
            } catch (error) {
                console.log('Không tìm thấy dropdown tiền tệ, bỏ qua...');
            }

            // 3.4 Điền tên công ty với improved method
            await this.fillCompanyName(selectors);

            // 4. Click nút Tạo với improved method
            await this.clickCreateButton();

            // 5. Xử lý post setup (two-step verification và navigation)
            console.log('Bắt đầu xử lý post setup...');
            const postSetup = new PostSetup(this.page, this.userConfig);
            const postSetupResult = await postSetup.execute();

            console.log('Setup Business Center hoàn tất!');
            return {
                success: true,
                bcProcessCompleted: postSetupResult ? postSetupResult.bcProcessCompleted : false,
                accountType: postSetupResult ? postSetupResult.accountType : this.userConfig.accountType,
                billingType: postSetupResult ? postSetupResult.billingType : null,
                bcType: postSetupResult ? postSetupResult.bcType : null
            };

        } catch (error) {
            console.error('Lỗi trong quá trình setup BC:', error.message);

            // 🛡️ Dừng Survey Protection khi có lỗi
            if (this.surveyProtection) {
                this.surveyProtection.stopProtection();
                this.surveyProtection = null;
            }

            throw error;
        } finally {
            // 🛡️ Cleanup Survey Protection (vì PostSetup sẽ có protection riêng)
            if (this.surveyProtection) {
                this.surveyProtection.stopProtection();
                this.surveyProtection = null;
                console.log('✅ Đã chuyển Survey Protection sang PostSetup');
            }
        }
    }
}

module.exports = BCSetup;