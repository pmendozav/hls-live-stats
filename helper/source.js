const axios = require("axios");
const path = require('path');
const { parse } = require('url');
var m3u8Parser = require('m3u8-parser');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');

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

                    const _ = () => {
                        const { info } = simpleParser(resp.data, '', '');
                        this.stats.adMarkers += info.adMarkers;
                        this.stats.adsDuration += info.adsDuration;
                        this.stats.contentDuration += info.contentDuration;
                        setTimeout(lambda, info.contentDuration * 1000);
                    }

                    const parser = new m3u8Parser.Parser();
                    parser.push(resp.data);
                    parser.end();

                    if (this.hasCC()) return _();

                    // try to retrieve the first segment from the playlist manifest if this.stats.ccInBand is false or is not defined
                    let regex = /^(https:\/\/|http:\/\/)(.*)?$/;
                    let firstSegment = '';
                    const index = parser.manifest.segments.length - 1;
                    if (index >= 0 && parser.manifest.segments && parser.manifest.segments[index] && parser.manifest.segments[index].uri) {
                        firstSegment = parser.manifest.segments[index].uri;
                    }

                    let uri = '';
                    if (regex.exec(firstSegment)) {
                        uri = firstSegment;
                    } else {
                        const url = new URL(variantUrl);
                        const basePath = path.dirname(url.hostname + url.pathname);
                        uri = `https://${path.join(basePath, firstSegment)}`
                    }

                    if (!regex.exec(uri)) {
                        console.error(`WRONG URI=${uri} (used to retrieve CC)`);
                        return _();
                    }

                    // try to read CC from the first segment
                    axios.get(uri, {
                        responseType: 'arraybuffer'
                    })
                    .then(async response => {
                        const fname = '/tmp/test.ts';
                        fs.writeFileSync(fname, Buffer.from(response.data));
                        const result = await exec(`ccextractor -stdout ${fname}`)
                            .then((result) => result.stdout)
                            .catch(err => err.message);

                        // dummy way to detect CC
                        this.stats.ccInBand = result.indexOf('-->') > -1;
                        _();
                    })
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
            if (!this.hasCC()) this.stats.ccOutBand = this.checkExternalCC(rawData);
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

    checkExternalCC(data) {
        return data.split('\n').findIndex(s => s.indexOf('#EXT-X-MEDIA') >= 0 && s.indexOf('.m3u8') >= 0) >= 0;
    }

    hasCC() {
        return this.stats.ccInBand || this.stats.ccOutBand
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