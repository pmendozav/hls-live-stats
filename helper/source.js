const axios = require("axios");
const path = require('path');
const { parse } = require('url');
var m3u8Parser = require('m3u8-parser');

const { simpleParser } = require('./helper');

class Source {
    constructor(url, info, logger, rawData) {
        this.id = url;
        this.url = url;
        this.errorsCount = 0;
        this.isDead = false;
        this.stats = {
            startDate: new Date(),
            adMarkers: info.adMarkers || 0,
            adsDuration: info.adsDuration || 0,
            contentDuration: info.contentDuration || 0,
        };
        // this.parser = new m3u8Parser.Parser();

        this.logger = logger;

        this.start(rawData, info.contentDuration || 10);
    }

    start(rawData, defaultTimer) {
        const lambda = () => {
            axios.get(this.url)
            .then(resp => {
                const variantUrl = this.getVariantUrl(resp.data);
                axios.get(variantUrl)
                .then(resp => {
                    this.errorsCount = 0;
                    const { info } = simpleParser(resp.data, '', '');
                    this.stats.adMarkers += info.adMarkers;
                    this.stats.adsDuration += info.adsDuration;
                    this.stats.contentDuration += info.contentDuration;
                    setTimeout(lambda, info.contentDuration * 1000);
                })
            })
            .catch(() => {
                this.errorsCount++;
                if (this.errorsCount < 5) {
                    setTimeout(lambda, 5000);
                } else if (this.errorsCount < 8) {
                    this.errorInfo = `waiting for manifests (${this.errorsCount} attempts)`;
                    setTimeout(lambda, 10 * 60 * 1000);
                } else {
                    const msg = `url is dead from ${new Date()}`;
                    logger.error(msg)
                    this.errorInfo = msg;
                    this.isDead = true;
                }
            })
        }

        if (rawData) {
            const variantUrl = this.getVariantUrl(rawData);
            axios.get(variantUrl)
                .then(resp => {
                    const { info } = simpleParser(resp.data);
                    this.stats = {
                        ...this.stats,
                        ...info
                    }
                    
                    setTimeout(lambda, (info.contentDuration || defaultTimer) * 1000)
                })
        } else {
            setTimeout(lambda, defaultTimer * 1000)
        }
    }

    getVariantUrl(rawData) {
        const parser = new m3u8Parser.Parser();
        parser.push(rawData);
        parser.end();

        let url;
        var uri = parser.manifest.playlists[0].uri;;
        
        const match = (/^(https:\/\/|http:\/\/)(.*)?$/).exec(uri);
        if (match) {
            url = uri;
        } else {
            let o = parse(this.url);
            let newPath;
            if (uri[0] === '/') {
                newPath = uri;
            } else {
                const basePath = o.pathname;
                newPath = path.normalize(basePath + '/../' + uri)
            }

            url = o.protocol + '//' + o.hostname + newPath;
        }

        return url;
    }

    report() {
        return this.stats;
    }
}

module.exports = Source;