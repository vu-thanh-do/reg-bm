const axios = require('axios');
const ConfigService = require('./configService');

class Hunght1890Service {
    constructor() {
        this.configService = new ConfigService();
        this.loadConfig();
        this.baseUrl = 'https://hunght1890.com';
    }

    loadConfig() {
            const config = this.configService.getServiceConfig('hunght1890');
            if (config) {
                this.apiKey = config.apiKey || '';
                this.enabled = config.enabled !== false;
            } else {
                this.apiKey = '';
                this.enabled = true;
            }
        }
        // Reload config khi có thay đổi
    reloadConfig() {
            this.loadConfig();
        }
        // Tạo email ngẫu nhiên
    generateRandomEmail() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let email = '';
        for (let i = 0; i < 15; i++) {
            email += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return email + '@hunght1890.com';
    }

    // Tạo email mới (alias cho generateRandomEmail)
    async createEmail() {
        const email = this.generateRandomEmail();
        return {
            success: true,
            email: email,
            data: { email: email }
        };
    }

    // Lấy danh sách message từ email
    async getMessages(email) {
        if (!email) {
            return {
                success: false,
                error: 'Email is required'
            };
        }

        try {
            const response = await axios.get(`${this.baseUrl}/${email}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return {
                success: true,
                messages: Array.isArray(response.data) ? response.data : [],
                totalMessages: Array.isArray(response.data) ? response.data.length : 0,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: (error.response && error.response.data) || error.message
            };
        }
    }

    // Lấy message theo UID (nếu cần)
    async getMessageByUid(email, messageUid) {
        if (!email || !messageUid) {
            return {
                success: false,
                error: 'Email and message UID are required'
            };
        }

        try {
            const response = await axios.get(`${this.baseUrl}/${email}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const messages = Array.isArray(response.data) ? response.data : [];
            const message = messages.find(m => m.uid === messageUid || m.timestamp === messageUid);

            if (!message) {
                return {
                    success: false,
                    error: 'Message not found'
                };
            }

            return {
                success: true,
                message: message,
                data: message
            };
        } catch (error) {
            return {
                success: false,
                error: (error.response && error.response.data) || error.message
            };
        }
    }

    // Check if service is enabled
    isEnabled() {
        return this.enabled;
    }
}

module.exports = Hunght1890Service;