const log4js = require('log4js');
const APP = require('../constants');

const useDebugLevel = false; // APP.ENVIRONMENT === 'debug';
const log2file = true; // APP.LOGS_TO_FILE;

log4js.configure({
    appenders: { 
        console: { 
            type: 'console' 
        },
        app: { 
            type: (log2file) ? 'file' : 'console', 
            filename: '/var/log/haystack/hsproxy.log',
        }
    },
    categories: { 
        default: { 
            appenders: ['console'], 
            level: (useDebugLevel) ? 'debug' : 'info' 
        },
        app: { 
            appenders: ['app'], 
            level: (useDebugLevel) ? 'debug' : 'info' 
        }
    }
});

module.exports = {
    log4js
};