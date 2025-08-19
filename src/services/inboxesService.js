const axios = require('axios');
const ConfigService = require('./configService');

class InboxesService {
    constructor() {
        this.configService = new ConfigService();
        this.loadConfig();
    }

    loadConfig() {
        const config = this.configService.getServiceConfig('inboxes');
        if (config) {
            this.apiKey = config.apiKey || 'b7826d4496msh74147643d4d0fd2p160263jsn0a19523eae86';
            this.hostname = config.hostname || 'inboxes-com.p.rapidapi.com';
            this.baseUrl = `https://${this.hostname}`;
        } else {
            this.apiKey = 'b7826d4496msh74147643d4d0fd2p160263jsn0a19523eae86';
            this.hostname = 'inboxes-com.p.rapidapi.com';
            this.baseUrl = `https://${this.hostname}`;
        }
    }

    // Reload config khi có thay đổi
    reloadConfig() {
        this.loadConfig();
    }

    // Create new inbox
    async createInbox() {
        try {
            const response = await axios.post(`${this.baseUrl}/inboxes`, {}, {
                headers: {
                    'x-rapidapi-key': this.apiKey,
                    'x-rapidapi-host': this.hostname,
                    'Content-Type': 'application/json'
                }
            });

            return {
                success: true,
                inbox: response.data.inbox,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: (error.response && error.response.data) || error.message
            };
        }
    }

    // Get messages from specific inbox
    async getMessages(inboxEmail) {
        if (!inboxEmail) {
            return {
                success: false,
                error: 'Inbox email is required'
            };
        }

        try {
            const response = await axios.get(`${this.baseUrl}/inboxes/${inboxEmail}`, {
                headers: {
                    'x-rapidapi-key': this.apiKey,
                    'x-rapidapi-host': this.hostname
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

    // Get specific message by UID
    async getMessageById(inboxEmail, messageUid) {
        if (!inboxEmail || !messageUid) {
            return {
                success: false,
                error: 'Inbox email and message UID are required'
            };
        }

        try {
            const response = await axios.get(`${this.baseUrl}/inboxes/${inboxEmail}/${messageUid}`, {
                headers: {
                    'x-rapidapi-key': this.apiKey,
                    'x-rapidapi-host': this.hostname
                }
            });

            return {
                success: true,
                message: response.data,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: (error.response && error.response.data) || error.message
            };
        }
    }

    // Delete specific message by UID
    async deleteMessage(inboxEmail, messageUid) {
        if (!inboxEmail || !messageUid) {
            return {
                success: false,
                error: 'Inbox email and message UID are required'
            };
        }

        try {
            const response = await axios.delete(`${this.baseUrl}/inboxes/${inboxEmail}/${messageUid}`, {
                headers: {
                    'x-rapidapi-key': this.apiKey,
                    'x-rapidapi-host': this.hostname
                }
            });

            return {
                success: true,
                message: 'Message deleted successfully',
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: (error.response && error.response.data) || error.message
            };
        }
    }

    // Get message content/body
    async getMessageContent(inboxEmail, messageUid) {
        if (!inboxEmail || !messageUid) {
            return {
                success: false,
                error: 'Inbox email and message UID are required'
            };
        }

        try {
            const response = await axios.get(`${this.baseUrl}/inboxes/${inboxEmail}/${messageUid}/html`, {
                headers: {
                    'x-rapidapi-key': this.apiKey,
                    'x-rapidapi-host': this.hostname
                }
            });

            return {
                success: true,
                content: response.data,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: (error.response && error.response.data) || error.message
            };
        }
    }

    // Get specific message by UID (API đúng là /messages/{uid})
    async getMessageByUid(messageUid) {
        if (!messageUid) {
            return {
                success: false,
                error: 'Message UID is required'
            };
        }
        try {
            const response = await axios.get(`${this.baseUrl}/messages/${messageUid}`, {
                headers: {
                    'x-rapidapi-key': this.apiKey,
                    'x-rapidapi-host': this.hostname
                }
            });
            return {
                success: true,
                message: response.data,
                data: response.data
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
        return this.configService.isServiceEnabled('inboxes');
    }
}

module.exports = InboxesService;