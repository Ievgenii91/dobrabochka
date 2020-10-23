const axios = require('axios');
const moment = require('moment');
const nconf = require('nconf');

const NP_API = nconf.get('NP_API_GET_INVOICES');
const headers = {
    'Content-Type': 'application/json'
};

class NovaPoshta {

    async getInvoices(from, to) {
        const apiKey = process.env.NP_API_KEY
        const methodProperties = {
            GetFullList: 1
        };

        if(from && to) {
            methodProperties.DateTimeFrom = moment(from).format('DD.MM.YYYY');
            methodProperties.DateTimeTo = moment(to).format('DD.MM.YYYY');
        }

        return axios({
            url: NP_API,
            method: 'post',
            data: {
                modelName: 'InternetDocument',
                calledMethod: 'getDocumentList',
                apiKey,
                methodProperties
            },
            headers
        });
    }

    async getInvoicesForToday(from = new Date(), to = new Date()) {
        return this.getInvoices(from, to)
    }
}

module.exports = new NovaPoshta();
