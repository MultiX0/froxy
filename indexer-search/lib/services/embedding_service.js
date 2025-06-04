const axios = require('axios');

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://embedding-service:5050';
async function embed(text) {
    try {
        const body = { text };
        const res = await axios.post(EMBEDDING_SERVICE_URL,body);
        if (res.status >= 200 && res.status <= 300) {
            return res.data.embedding;
        }

        throw `embed endpoint failed at status: ${res.status}`;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

module.exports = {
    embed
}