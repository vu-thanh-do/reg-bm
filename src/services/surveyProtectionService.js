const { randomDelay } = require('../utils');

class SurveyProtectionService {
    constructor(page) {
        this.page = page;
        this.surveyMonitorInterval = null;
        this.lastValidUrl = null;
        this.isActive = false;
    }

    // Helper method: Kiểm tra URL có phải survey không
    isSurveyUrl(url) {
        return url && url.includes('web-sg.tiktok.com/survey');
    }

    // Khởi động protection cho một page
    async startProtection() {
        if (this.isActive) {
            console.log('⚠️ Survey protection đã được khởi động');
            return;
        }

        console.log('🛡️ Khởi động Global Survey Protection...');
        this.isActive = true;

        // Lưu URL hợp lệ ban đầu
        try {
            this.lastValidUrl = await this.page.url();
        } catch (error) {
            this.lastValidUrl = 'https://business.tiktok.com/';
        }

        // Setup prevention layer
        await this.setupPreventionLayer();

        // Start continuous monitoring
        await this.startContinuousMonitoring();

        console.log('✅ Global Survey Protection đã được khởi động');
    }

    // Dừng protection
    stopProtection() {
        if (!this.isActive) {
            return;
        }

        console.log('⏹️ Dừng Global Survey Protection...');

        if (this.surveyMonitorInterval) {
            clearInterval(this.surveyMonitorInterval);
            this.surveyMonitorInterval = null;
        }

        // Cleanup page-level hooks nếu cần
        try {
            this.page.evaluate(() => {
                if (window.__surveyLinkObserver) {
                    window.__surveyLinkObserver.disconnect();
                    delete window.__surveyLinkObserver;
                }
            });
        } catch (error) {
            // Ignore cleanup errors
        }

        this.isActive = false;
        console.log('✅ Đã dừng Global Survey Protection');
    }

    // Setup prevention layer (chặn từ đầu)
    async setupPreventionLayer() {
        console.log('🔒 Setup prevention layer...');

        try {
            // Setup cho page hiện tại
            await this.page.evaluate(() => {
                // Override window.open
                const originalOpen = window.open;
                window.open = function(url, target, features) {
                    if (url && url.includes('web-sg.tiktok.com/survey')) {
                        console.log('🚨 Blocked survey popup via window.open:', url);
                        return null;
                    }
                    return originalOpen.call(window, url, target, features);
                };

                // Override location methods
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

                // Enhanced click blocking
                document.addEventListener('click', function(event) {
                    const target = event.target;
                    let href = target.href;

                    if (!href) {
                        const parentA = target.closest('a');
                        if (parentA) href = parentA.href;
                    }

                    const dataUrl = target.getAttribute('data-url') || target.getAttribute('data-href');

                    if ((href && href.includes('web-sg.tiktok.com/survey')) ||
                        (dataUrl && dataUrl.includes('web-sg.tiktok.com/survey'))) {
                        console.log('🚨 Blocked survey link click:', href || dataUrl);
                        event.preventDefault();
                        event.stopPropagation();
                        return false;
                    }
                }, true);

                // Monitor dynamic content
                const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeType === 1) {
                                // Check node itself
                                if (node.href && node.href.includes('web-sg.tiktok.com/survey')) {
                                    console.log('🚨 Removed dynamic survey link:', node.href);
                                    node.remove();
                                }

                                // Check children
                                const surveyLinks = node.querySelectorAll && node.querySelectorAll('a[href*="web-sg.tiktok.com/survey"]');
                                if (surveyLinks) {
                                    surveyLinks.forEach(function(link) {
                                        console.log('🚨 Removed dynamic survey link (child):', link.href);
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

                window.__surveyLinkObserver = observer;
                console.log('✅ Prevention layer setup complete');
            });

            // Setup cho mọi page load mới
            await this.page.evaluateOnNewDocument(() => {
                // Auto-setup cho mọi trang mới
                const originalOpen = window.open;
                window.open = function(url, target, features) {
                    if (url && url.includes('web-sg.tiktok.com/survey')) {
                        console.log('🚨 Blocked survey popup on new document:', url);
                        return null;
                    }
                    return originalOpen.call(window, url, target, features);
                };

                // Mark page as protected
                window.__surveyProtected = true;
            });

            console.log('✅ Prevention layer setup thành công');

        } catch (error) {
            console.error('❌ Lỗi setup prevention layer:', error.message);
        }
    }

    // Continuous monitoring
    async startContinuousMonitoring() {
        console.log('🔄 Bắt đầu continuous monitoring...');

        this.surveyMonitorInterval = setInterval(async() => {
            try {
                await this.performMonitoringCheck();
            } catch (error) {
                console.log('⚠️ Lỗi monitoring check:', error.message);
            }
        }, 800); // Check mỗi 0.8 giây

        console.log('✅ Continuous monitoring đã được khởi động');
    }

    // Thực hiện monitoring check
    async performMonitoringCheck() {
        try {
            const currentUrl = await this.page.url();

            // Update lastValidUrl nếu hợp lệ
            if (!this.isSurveyUrl(currentUrl) && currentUrl.includes('business.tiktok.com')) {
                this.lastValidUrl = currentUrl;
            }

            // Check survey redirect trên tab hiện tại
            if (this.isSurveyUrl(currentUrl)) {
                console.log('🚨 Survey detected (Global Protection):', currentUrl);
                await this.handleSurveyRedirect(currentUrl);
            }

            // Check new tabs
            await this.checkAndCloseNewSurveyTabs();

            // Check modals/popups
            await this.checkAndCloseSurveyModals();

        } catch (error) {
            // Ignore minor errors để không làm gián đoạn automation
        }
    }

    // Xử lý survey redirect
    async handleSurveyRedirect(surveyUrl) {
        console.log('🚨 Xử lý survey redirect:', surveyUrl.substring(0, 100) + '...');

        try {
            // Thử go back trước
            await this.page.goBack();
            await randomDelay(1000, 2000);

            const backUrl = await this.page.url();

            // Nếu vẫn ở survey, navigate về lastValidUrl
            if (this.isSurveyUrl(backUrl)) {
                console.log('⚠️ Vẫn ở survey, navigate về URL hợp lệ:', this.lastValidUrl);
                await this.page.goto(this.lastValidUrl, {
                    waitUntil: 'networkidle2',
                    timeout: 15000
                });
                await randomDelay(2000, 3000);
            }

            console.log('✅ Đã xử lý survey redirect');

        } catch (navError) {
            console.log('❌ Lỗi xử lý survey redirect, fallback:', navError.message);

            // Fallback: về business center
            try {
                await this.page.goto('https://business.tiktok.com/', {
                    waitUntil: 'networkidle2',
                    timeout: 15000
                });
                await randomDelay(2000, 3000);
            } catch (fallbackError) {
                console.log('❌ Fallback cũng thất bại:', fallbackError.message);
            }
        }
    }

    // Check và đóng new survey tabs
    async checkAndCloseNewSurveyTabs() {
        try {
            const browser = this.page.browser();
            const pages = await browser.pages();

            for (const page of pages) {
                if (page !== this.page) {
                    try {
                        const pageUrl = await page.url();
                        if (this.isSurveyUrl(pageUrl)) {
                            console.log('🚨 Đóng survey tab:', pageUrl.substring(0, 80) + '...');
                            await page.close();
                            console.log('✅ Đã đóng survey tab');
                        }
                    } catch (error) {
                        // Ignore errors khi xử lý tabs
                    }
                }
            }
        } catch (error) {
            // Ignore browser access errors
        }
    }

    // Check và đóng survey modals
    async checkAndCloseSurveyModals() {
        try {
            const hasSurveyModal = await this.page.evaluate(() => {
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
                console.log('🚨 Survey modal detected, đóng modal...');

                // Thử đóng bằng ESC
                await this.page.keyboard.press('Escape');
                await randomDelay(500, 1000);

                // Click close buttons
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
    }

    // Public method để các class khác có thể gọi
    async protectPage(page) {
        if (page !== this.page) {
            // Tạo instance mới cho page khác
            const protection = new SurveyProtectionService(page);
            await protection.startProtection();
            return protection;
        }

        if (!this.isActive) {
            await this.startProtection();
        }

        return this;
    }

    // Static method để tạo global protection
    static async createGlobalProtection(page) {
        const protection = new SurveyProtectionService(page);
        await protection.startProtection();
        return protection;
    }
}

module.exports = SurveyProtectionService;