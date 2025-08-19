const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { executablePath } = require('puppeteer');

// Sử dụng stealth plugin với cấu hình mặc định (nhẹ)
puppeteer.use(StealthPlugin());

// Cấu hình nhẹ cho máy yếu
const getBrowserConfig = () => {
    return {
        headless: false, // true khi chạy production
        executablePath: executablePath(),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1280,720',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=VizDisplayCompositor',
            '--disable-extensions-except',
            '--disable-plugins-discovery',
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--lang=vi-VN',
            '--accept-lang=vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
        ],
        defaultViewport: null,
        ignoreDefaultArgs: [
            '--enable-automation',
            '--enable-blink-features=AutomationControlled'
        ],
        ignoreHTTPSErrors: true
    };
};

// Thiết lập page cơ bản, không fake hardware nặng
const setupRealUserPage = async(page) => {
    await page.setViewport({
        width: 1280,
        height: 720,
        deviceScaleFactor: 1,
        hasTouch: false,
        isLandscape: true,
        isMobile: false
    });
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'max-age=0'
    });
};

module.exports = {
    getBrowserConfig,
    setupRealUserPage
};