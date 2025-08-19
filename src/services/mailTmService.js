const axios = require('axios');
const ConfigService = require('./configService');
const { HttpsProxyAgent } = require('https-proxy-agent');

class MailTmService {
    constructor(proxy) {
        this.configService = new ConfigService();
        this.loadConfig();
        this.token = null;
        this.proxy = proxy;
        this.axiosConfig = {};
        if (proxy) {
            // proxy: ip:port:user:pass hoặc ip:port
            const parts = proxy.split(':');
            let proxyUrl = '';
            if (parts.length === 4) {
                proxyUrl = `http://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`;
            } else if (parts.length === 2) {
                proxyUrl = `http://${parts[0]}:${parts[1]}`;
            }
            if (proxyUrl) {
                this.axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
                this.axiosConfig.proxy = false;
            }
        }
    }

    loadConfig() {
        const config = this.configService.getServiceConfig('mailTm');
        if (config) {
            this.baseUrl = config.baseUrl || 'https://api.mail.tm';
            this.apiKey = config.apiKey || '';
        } else {
            this.baseUrl = 'https://api.mail.tm';
            this.apiKey = '';
        }
    }

    // Reload config khi có thay đổi
    reloadConfig() {
        this.loadConfig();
    }

    // Generate random email with mechanicspedia.com domain
    generateRandomEmail() {
        const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        return `${randomString}@powerscrews.com`;
    }

    // Register new account with random email
    async registerMailTm(password = 'dokunna668@') {
        const email = this.generateRandomEmail();

        try {
            const response = await axios.post(`${this.baseUrl}/accounts`, {
                address: email,
                password: password
            }, {
                headers: {
                    'accept': 'application/ld+json',
                    'Content-Type': 'application/ld+json'
                },
                ...this.axiosConfig
            });
            console.log(response.data)
            return {
                success: true,
                email: email,
                password: password,
                account: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: (error.response && error.response.data) || error.message
            };
        }
    }

    // Login and get token
    async loginMailTm(email, password) {
        try {
            const response = await axios.post(`${this.baseUrl}/token`, {
                address: email,
                password: password
            }, {
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                ...this.axiosConfig
            });

            this.token = response.data.token;
            return {
                success: true,
                token: response.data.token,
                accountId: response.data.id,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: (error.response && error.response.data) || error.message
            };
        }
    }

    // Get messages list (requires authentication)
    async getMailTm(page = 1) {
        if (!this.token) {
            return {
                success: false,
                error: 'No token available. Please login first.'
            };
        }

        try {
            const response = await axios.get(`${this.baseUrl}/messages?page=${page}`, {
                headers: {
                    'accept': 'application/ld+json',
                    'Authorization': `Bearer ${this.token}`
                },
                ...this.axiosConfig
            });

            return {
                success: true,
                messages: response.data['hydra:member'],
                totalItems: response.data['hydra:totalItems'],
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: (error.response && error.response.data) || error.message
            };
        }
    }

    // Get specific message by ID
    async getMessageById(messageId) {
        if (!this.token) {
            return {
                success: false,
                error: 'No token available. Please login first.'
            };
        }

        try {
            const response = await axios.get(`${this.baseUrl}/messages/${messageId}`, {
                headers: {
                    'accept': 'application/ld+json',
                    'Authorization': `Bearer ${this.token}`
                },
                ...this.axiosConfig
            });

            return {
                success: true,
                message: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: (error.response && error.response.data) || error.message
            };
        }
    }

    // Set token manually (useful for persistence)
    setToken(token) {
        this.token = token;
    }

    // Clear token (logout)
    clearToken() {
        this.token = null;
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.token !== null;
    }

    // Check if service is enabled
    isEnabled() {
        return this.configService.isServiceEnabled('mailTm');
    }
}

module.exports = MailTmService;