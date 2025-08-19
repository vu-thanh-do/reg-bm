// Utility functions for TikTok registration

function randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
}

async function typeHumanLike(page, selector, text) {
    await page.click(selector);
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');

    for (let char of text) {
        await page.keyboard.type(char);
        await randomDelay(50, 150);
    }
}

function generateRandomCompanyName() {
    const prefixes = ['ABCDXYZ', 'XYZ', 'Global', 'Tech', 'Digital', 'Innovation', 'Future', 'Smart', 'Elite', 'Premium'];
    const suffixes = ['Corp', 'Ltd', 'Company', 'Group', 'Solutions', 'Systems', 'Technologies', 'Enterprises', 'Partners', 'International'];

    // Chọn ngẫu nhiên 2 prefix để tăng độ dài
    const prefix1 = prefixes[Math.floor(Math.random() * prefixes.length)];
    const prefix2 = prefixes[Math.floor(Math.random() * prefixes.length)];

    // Chọn ngẫu nhiên 2 suffix để tăng độ dài
    const suffix1 = suffixes[Math.floor(Math.random() * suffixes.length)];
    const suffix2 = suffixes[Math.floor(Math.random() * suffixes.length)];

    return `${prefix1}${prefix2} ${suffix1}${suffix2}`;
}


module.exports = {
    randomDelay,
    typeHumanLike,
    generateRandomCompanyName
};