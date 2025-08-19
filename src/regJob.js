const urlConfig = require('../config/config.js');
const { getBrowserConfig, setupRealUserPage } = require('./index.js');
const puppeteer = require('puppeteer-extra');
const BCSetup = require('./bcSetup');

// Hàm lấy OTP từ mail.tm
async function getOtpFromMailTm(email, password, proxy) {
    const MailTmService = require('./services/mailTmService');
    const mailService = new MailTmService(proxy);

    // Đăng nhập lấy token
    const login = await mailService.loginMailTm(email, password);
    if (!login.success) {
        throw new Error('Login mail.tm thất bại: ' + JSON.stringify(login.error));
    }

    // Lấy danh sách mail, lặp lại nếu chưa có
    let messages = [];
    for (let i = 0; i < 10; i++) {
        const msgRes = await mailService.getMailTm();
        if (msgRes.success && msgRes.messages.length > 0) {
            messages = msgRes.messages;
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!messages.length) {
        throw new Error('Không tìm thấy mail xác thực TikTok!');
    }

    // Tìm message mới nhất có subject bắt đầu bằng TikTok
    const tiktokMsg = messages.find(m => m.subject && m.subject.startsWith('TikTok'));
    if (!tiktokMsg) {
        throw new Error('Không tìm thấy mail TikTok!');
    }

    // Lấy chi tiết message
    const detail = await mailService.getMessageById(tiktokMsg.id);
    if (!detail.success) {
        throw new Error('Lấy chi tiết mail thất bại: ' + JSON.stringify(detail.error));
    }

    // Parse code từ text
    const text = detail.message.text || '';
    const codeMatch = text.match(/\b[A-Z0-9]{6}\b/);
    if (!codeMatch) {
        throw new Error('Không tìm thấy mã OTP trong mail!');
    }

    return codeMatch[0];
}

// Hàm lấy OTP từ inboxes.com
async function getOtpFromInboxes(email) {
    const InboxesService = require('./services/inboxesService');
    const mailService = new InboxesService();

    // Lấy danh sách message, lặp lại nếu chưa có
    let messages = [];
    for (let i = 0; i < 10; i++) {
        const msgRes = await mailService.getMessages(email);
        if (msgRes.success && msgRes.messages.length > 0) {
            messages = msgRes.messages;
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!messages.length) {
        throw new Error('Không tìm thấy mail xác thực TikTok!');
    }

    // Tìm message mới nhất có subject chứa TikTok
    const tiktokMsg = messages.find(m => m.subject && m.subject.includes('TikTok'));
    if (!tiktokMsg) {
        throw new Error('Không tìm thấy mail TikTok!');
    }

    // Lấy chi tiết message đúng API
    const detail = await mailService.getMessageByUid(tiktokMsg.uid);
    if (!detail.success) {
        throw new Error('Lấy chi tiết mail thất bại: ' + JSON.stringify(detail.error));
    }

    // Parse code từ text
    const text = detail.message.text || '';
    const codeMatch = text.match(/\b[A-Z0-9]{6}\b/);
    if (!codeMatch) {
        throw new Error('Không tìm thấy mã OTP trong mail!');
    }

    return codeMatch[0];
}

// Hàm lấy OTP từ hunght1890.com
async function getOtpFromHunght1890(email) {
    const Hunght1890Service = require('./services/hunght1890Service');
    const mailService = new Hunght1890Service();

    // Lấy danh sách message, lặp lại nếu chưa có
    let messages = [];
    for (let i = 0; i < 10; i++) {
        const msgRes = await mailService.getMessages(email);
        if (msgRes.success && msgRes.messages.length > 0) {
            messages = msgRes.messages;
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!messages.length) {
        throw new Error('Không tìm thấy mail xác thực TikTok!');
    }

    // Tìm message mới nhất có subject chứa TikTok
    const tiktokMsg = messages.find(m => m.subject && m.subject.includes('TikTok'));
    if (!tiktokMsg) {
        throw new Error('Không tìm thấy mail TikTok!');
    }

    // Parse code từ body (response format của hunght1890)
    const body = tiktokMsg.body || '';
    const codeMatch = body.match(/\b[A-Z0-9]{6}\b/);
    if (!codeMatch) {
        throw new Error('Không tìm thấy mã OTP trong mail!');
    }

    return codeMatch[0];
}

// Hàm delay ngẫu nhiên để tránh detection
function randomDelay(min = 100, max = 300) {
    return new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)));
}

// Hàm type text với delay ngẫu nhiên
async function humanLikeType(page, text, minDelay = 50, maxDelay = 150) {
    for (const char of text) {
        await page.keyboard.type(char);
        await randomDelay(minDelay, maxDelay);
    }
}

async function runRegisterJob(userConfig) {
    let result = { email: '', password: '', status: '', message: '' };
    let email = '';
    let password = 'dokunna668@';
    let browser = null;

    // Parse proxy nếu có
    let proxyConfig = null;
    if (userConfig.proxy) {
        const parts = userConfig.proxy.split(':');
        if (parts.length === 4) {
            proxyConfig = {
                host: parts[0],
                port: parts[1],
                username: parts[2],
                password: parts[3]
            };
        } else if (parts.length === 2) {
            proxyConfig = {
                host: parts[0],
                port: parts[1]
            };
        }
    }

    try {
        // 1. Tạo email
        console.log('Đang tạo email...');
        if (userConfig.mailService === 'mail.tm') {
            const MailTmService = require('./services/mailTmService');
            const mailService = new MailTmService(userConfig.proxy);
            const reg = await mailService.registerMailTm(password);
            if (!reg.success) {
                throw new Error('Tạo email mail.tm thất bại: ' + JSON.stringify(reg.error));
            }
            email = reg.email;
        } else if (userConfig.mailService === 'inboxes.com') {
            const InboxesService = require('./services/inboxesService');
            const mailService = new InboxesService();
            const reg = await mailService.createInbox();
            if (!reg.success) {
                throw new Error('Tạo email inboxes.com thất bại: ' + JSON.stringify(reg.error));
            }
            email = reg.inbox;
        } else if (userConfig.mailService === 'hunght189.com') {
            const Hunght1890Service = require('./services/hunght1890Service');
            const mailService = new Hunght1890Service();
            const reg = await mailService.createEmail();
            if (!reg.success) {
                throw new Error('Tạo email hunght189.com thất bại: ' + JSON.stringify(reg.error));
            }
            email = reg.email;
        } else if (userConfig.mailService === 'tmailor.com') {
            const TmailorService = require('./services/tmailorService');
            const mailService = new TmailorService();
            const reg = await mailService.createEmail();
            if (!reg.success) {
                throw new Error('Tạo email tmailor.com thất bại: ' + JSON.stringify(reg.error));
            }
            email = reg.email;
        } else {
            throw new Error('Mail service không hợp lệ');
        }

        result.email = email;
        result.password = password;
        console.log('Tạo email thành công:', email);

        // 2. Khởi tạo browser
        console.log('Đang khởi tạo browser...');
        let urlRegister = urlConfig.urlRegister;
        let browserConfig = getBrowserConfig();

        if (proxyConfig) {
            browserConfig.args = browserConfig.args || [];
            browserConfig.args.push(`--proxy-server=http://${proxyConfig.host}:${proxyConfig.port}`);
        }

        browser = await puppeteer.launch(browserConfig);
        const page = await browser.newPage();

        if (proxyConfig && proxyConfig.username && proxyConfig.password) {
            await page.authenticate({
                username: proxyConfig.username,
                password: proxyConfig.password
            });
        }

        await setupRealUserPage(page);
        console.log('Browser khởi tạo thành công');

        // 3. Truy cập trang đăng ký
        console.log('Đang truy cập trang đăng ký...');
        await page.goto(urlRegister, { waitUntil: 'networkidle2', timeout: 60000 });

        // 4. Nhập email
        console.log('Đang nhập email...');
        await page.waitForSelector('input[name="email"]', { timeout: 30000 });
        const emailInput = await page.$('input[name="email"]');
        await emailInput.focus();
        await humanLikeType(page, email, 80, 120);

        // 5. Nhập password
        console.log('Đang nhập password...');
        await page.waitForSelector('input[name="password"]', { timeout: 30000 });
        const passInput = await page.$('input[name="password"]');
        await passInput.focus();
        await humanLikeType(page, password, 80, 120);

        // 6. Click checkbox điều khoản
        console.log('Đang click checkbox...');
        await page.waitForSelector('#TikTokAds_Register-aggrement-guidline', { timeout: 15000 });
        const checkbox = await page.$('#TikTokAds_Register-aggrement-guidline');
        await checkbox.click();
        await randomDelay(300, 600);

        // 7. Click nút đăng ký
        console.log('Đang click nút đăng ký...');
        await page.waitForSelector('#TikTokAds_Register-register-button', { timeout: 15000 });
        const regBtn = await page.$('#TikTokAds_Register-register-button');
        await regBtn.click();
        await randomDelay(2000, 3000);

        // 8. Xử lý captcha
        console.log('Đang xử lý captcha...');
        await page.waitForSelector('img[draggable="false"]', { timeout: 20000 });
        const captchaImg = await page.$('img[draggable="false"]');

        // Lấy thông tin captcha
        const { imgBase64, width, height } = await page.evaluate(img => {
            let base64 = '';
            if (img.src.startsWith('data:image')) {
                base64 = img.src.replace(/^data:image\/[^;]+;base64,/, '');
            } else {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                base64 = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
            }
            return {
                imgBase64: base64,
                width: img.naturalWidth,
                height: img.naturalHeight
            };
        }, captchaImg);

        // 9. Giải captcha
        console.log('Đang giải captcha...');
        const OmoCaptchaService = require('./services/omoCaptchaService');
        const omo = new OmoCaptchaService();
        const taskId = await omo.createCaptchaTaskFromBase64(imgBase64, width, height);
        const solution = await omo.getTaskResult(taskId);
        const { pointA, pointB } = solution;

        // 10. Click vào vị trí captcha
        await page.evaluate(({ x1, y1, x2, y2 }) => {
            function triggerMouseEvent(node, x, y) {
                const rect = node.getBoundingClientRect();
                const clientX = rect.left + x * rect.width / node.naturalWidth;
                const clientY = rect.top + y * rect.height / node.naturalHeight;

                ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                    node.dispatchEvent(new MouseEvent(eventType, {
                        bubbles: true,
                        clientX,
                        clientY
                    }));
                });
            }

            const img = document.querySelector('img[draggable="false"]');
            if (img) {
                triggerMouseEvent(img, x1, y1);
                triggerMouseEvent(img, x2, y2);
            }
        }, { x1: pointA.x, y1: pointA.y, x2: pointB.x, y2: pointB.y });

        // 11. Click Confirm
        console.log('Đang click Confirm...');
        await page.waitForSelector('div.TUXButton-label', { timeout: 10000 });
        const confirmBtn = await page.evaluateHandle(() => {
            const buttons = [...document.querySelectorAll('div.TUXButton-label')];
            return buttons.find(btn => btn.textContent.trim() === 'Confirm');
        });

        if (confirmBtn) {
            await confirmBtn.click();
        }

        // 12. Chờ form OTP
        console.log('Đang chờ form OTP...');
        await page.waitForSelector('#ac-sendcode-separate-input input[type="text"]', { timeout: 30000 });

        // 13. Lấy OTP
        console.log('Đang lấy OTP...');
        let otpCode = '';
        if (userConfig.mailService === 'mail.tm') {
            otpCode = await getOtpFromMailTm(email, password, userConfig.proxy);
        } else if (userConfig.mailService === 'inboxes.com') {
            otpCode = await getOtpFromInboxes(email);
        } else if (userConfig.mailService === 'hunght189.com') {
            otpCode = await getOtpFromHunght1890(email);
        } else {
            throw new Error('Chỉ hỗ trợ auto OTP cho mail.tm, inboxes.com và hunght189.com!');
        }

        console.log('OTP nhận được:', otpCode);

        // 14. Nhập OTP
        console.log('Đang nhập OTP...');
        const otpInputs = await page.$$('#ac-sendcode-separate-input input[type="text"]');
        for (let i = 0; i < otpCode.length && i < otpInputs.length; i++) {
            await otpInputs[i].focus();
            await page.keyboard.type(otpCode[i]);
            await randomDelay(100, 200);
        }

        // Chờ sau khi nhập OTP
        await randomDelay(5000, 10000);

        // 15. Setup Business Center
        console.log('Đang setup Business Center...');
        try {
            // Chuyển sang trang Business Center
            await page.goto('https://business.tiktok.com/select?source=BC_home&attr_source=BC_home', {
                waitUntil: 'networkidle2',
                timeout: 60000
            });

            await randomDelay(3000);

            await page.goto('https://business.tiktok.com/self-serve-bc/registration?attr_source=BC_home&pagetype=normal&source=BC_home&others=no_new_flow', {
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            await page.evaluate(() => {
                // Set localStorage
                localStorage.setItem('selected_lang', 'vi');
                localStorage.setItem('__Garfish__react__business_suite_lang', 'vi-VN');
                // Set cookie
                document.cookie = 'lang_type=vi; path=/; domain=' + location.hostname + ';';

                // XÓA mọi handler beforeunload để reload không bị hỏi
                window.onbeforeunload = null;
                window.addEventListener('beforeunload', function(e) {
                    e.stopImmediatePropagation();
                }, true);

                // Reload
                location.reload();
            });
            await randomDelay(2000, 3000);

            // 16. Setup Business Center
            console.log('Bắt đầu setup Business Center...');
            const bcSetup = new BCSetup(page, userConfig);
            const bcResult = await bcSetup.setup();

            // Chờ hoàn thành
            await randomDelay(5000);

            // Chỉ set Success khi hoàn thành toàn bộ quy trình BC Handler
            if (bcResult && bcResult.bcProcessCompleted) {
                result.status = 'Success';
                result.message = 'Đăng ký thành công Business Center hoàn chỉnh!';
                result.bcProcessCompleted = true;
                result.accountType = bcResult.accountType;
                result.billingType = bcResult.billingType;
                result.bcType = bcResult.bcType;
                console.log('✅ Đăng ký hoàn chỉnh BC thành công!');
                console.log(`📊 Account Type: ${result.accountType}, Billing Type: ${result.billingType}`);
            } else {
                result.status = 'BC Setup Partial';
                result.message = 'BC Setup hoàn tất nhưng chưa hoàn thành bcHandler/bcAgencyHandler';
                result.bcProcessCompleted = false;
                result.accountType = bcResult ? bcResult.accountType : userConfig.accountType;
                result.billingType = 'Unknown';
                result.bcType = 'Partial';
                console.log('⚠️ BC Setup chỉ hoàn tất một phần');
            }

        } catch (bcError) {
            result.status = 'BC Setup Error';
            result.message = 'Lỗi setup BC: ' + bcError.message;
            console.log('Lỗi setup BC:', bcError.message);
            console.log('Giữ Chrome mở để kiểm tra...');
        }

    } catch (err) {
        result.status = 'Error';
        result.message = err.message;
        console.log('Lỗi:', err.message);
    } finally {
        if (browser) {
            await browser.close().catch(() => {});
        }
    }
    return result;
}



module.exports = { runRegisterJob };