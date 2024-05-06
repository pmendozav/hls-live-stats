const axios = require("axios");
const path = require('path');
const util = require('util');
var m3u8Parser = require('m3u8-parser');
const fs = require('fs');
const { parse } = require('url');
const exec = util.promisify(require('child_process').exec);

const masterManifestUri = process.argv[1] || process.env.MASTER_MANIFEST_URI;


const getVariantUrl = async masterUri => {
    const resp = await axios.get(masterUri);

    const parser = new m3u8Parser.Parser();
    parser.push(resp.data);
    parser.end();

    let url;
    const uri = parser.manifest.playlists[0].uri;

    const match = (/^(https:\/\/|http:\/\/)(.*)?$/).exec(uri);
    if (match) {
        url = uri;
    } else {
        let o = parse(masterUri);
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

// uri: string
// refUrl: type URL
const getUrl = (uri, refUrl) => {
    let url = '';
    let regex = /^(https:\/\/|http:\/\/)(.*)?$/;
    if (regex.exec(uri)) {
        url = uri;
    } else {
        let basePath;
        if (uri.startsWith('/')) {
            basePath = refUrl.hostname;
        } else {
            basePath = path.dirname(refUrl.hostname + refUrl.pathname);
        }
        url = `https://${path.join(basePath, uri)}`
    }

    return url;
}

// variantUrl: type URL
const segmentHasCC = async (segmentUri, variantUrl) => {
    const url = getUrl(segmentUri, variantUrl);

    const segmentResp = await axios.get(url, {
        responseType: 'arraybuffer'
    })

    const now = Date.now();
    const tsFname = `/tmp/${now}.ts`;
    const ccFname = `/tmp/${now}.srt`;

    fs.writeFileSync(tsFname, Buffer.from(segmentResp.data));

    const ccCmd = `ffmpeg -f lavfi -i "movie=${tsFname}[out0+subcc]" -map s "${ccFname}" && cat ${ccFname}`;
    const ccStr = await exec(ccCmd);
    return ccStr.indexOf('-->') > -1;
}

// masterUrl: type URL
const getLastSegmentUrl = async (url) => {
    const urlObj = new URL(url);
    const resp = await axios.get(url);

    const parser = new m3u8Parser.Parser();
    parser.push(resp.data);
    parser.end();

    // for (const s of parser.manifest.segments) {
    //     s.uri = getUrl(s.uri, urlObj);
    // }

    let duration = 0;
    let lastSegmentUrl = '';
    const lastIndex = parser.manifest.segments.length - 1;
    if (lastIndex >= 0 && parser.manifest.segments && parser.manifest.segments[lastIndex] && parser.manifest.segments[lastIndex].uri) {
        duration = parser.manifest.segments[lastIndex].duration;
        lastSegmentUrl = parser.manifest.segments[lastIndex].uri;
    }

    return {
        url: getUrl(lastSegmentUrl, urlObj),
        duration
    };
}

const getPlaylistManifest = async masterUrl => {
    // const url = getUrl(variantUri, masterUrl);

    const resp = await axios.get(masterUrl);

    const parser = new m3u8Parser.Parser();
    parser.push(resp.data);
    parser.end();

    const uri = parser.manifest.playlists[0].uri;

    return getUrl(uri, new URL(masterUrl));
}

const donwloadSegment = async url => {
    const response = await axios.get(url, {
        responseType: 'arraybuffer'
    })

    const now = Date.now();

    fs.writeFileSync(`/tmp/${now}.ts`, Buffer.from(response.data));

    return now;
}

const checCC = async id => {
    const tsFname = `/tmp/${id}.ts`;
    const ccFname = `/tmp/${id}.srt`;

    const ccCmd = `ffmpeg -f lavfi -i "movie=${tsFname}[out0+subcc]" -map s "${ccFname}" && cat ${ccFname}`;
    const result = await exec(ccCmd)
        .then((result) => result.stdout)
        .catch(err => err.message);

    return result.indexOf('-->') > -1;
}

const processPlaylistManifest = async plManifestUrl => {
    // const plManifestUrl = await getPlaylistManifest(masterUrl);

    const { url: lastSegmentUrl, duration } = await getLastSegmentUrl(plManifestUrl);

    console.log(`processing segment ${lastSegmentUrl}`);
    const fname = await donwloadSegment(lastSegmentUrl);
    const hasCC = await checCC(fname);
    
    if (hasCC) {
        mCcInBand.timeWithCC += duration;
    } else {
        mCcInBand.timeWithoutCC += duration;
    }
    
    setTimeout(() => {
        processPlaylistManifest(plManifestUrl)
    }, duration * 1000);
}

const time = process.argv[2] || process.env.TIME;
const masterUrl = process.argv[3] || process.env.DATA_SOURCE;
const timeout = time * 1000;

console.log('pavelx', masterUrl, time)

let mCcInBand = {
    timeWithCC: 0,
    timeWithoutCC: 0,
}

setTimeout(() => {
    console.log(`
    ------------------------------------
    ------------------------------------
    Total time = ${time}s
    time with CC = ${mCcInBand.timeWithCC}s
    time without CC = ${mCcInBand.timeWithoutCC}s
    `)

    process.exit(0);
}, timeout);


(async () => {
    processPlaylistManifest(await getPlaylistManifest(masterUrl))
})()