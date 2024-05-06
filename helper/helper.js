const path = require('path');
const CONSTANTS = require('../constants');

const replaceAll = (string, search, replace) => string.split(search).join(replace);

const parseRelativePath = (host, originRelativePath, refRelativePath) => {
    if (refRelativePath[0] === '/') {
        /**
         * host = http://host.com
         * originPath = /x/y/z
         * relativePath = /a/b/playlist.m3u8
         * -> result = http://host.com/a/b/playlist.m3u8
         */
        return host + refRelativePath;
    } else {
        /**
         * host = http://host.com
         * originPath = /x/y/z
         * relativePath1 = a/b/playlist.m3u8
         * relativePath2 = ../../a/b/playlist.m3u8
         * -> result1 = http://host.com/x/y/z/a/b/playlist.m3u8
         * -> result2 = http://host.com/x/a/b/playlist.m3u8
         */
        const chunks = refRelativePath.split('../');
        const newPath = path.normalize(originRelativePath + Array(chunks.length - 1).fill('../').join(''));

        return host + path.join(newPath, chunks[chunks.length - 1])
    }
}

const findPathIndex = (str, refIndex, forward = true) => {
    const refChars = ['\"', ',', ' ', '\r\n', '\n'];

    if (forward) {
        for (let i = refIndex; i<str.length; i++) {
            if (refChars.includes(str[i])) {
                return i - 1;
            }
        }
    }
    else {
        for (let i = refIndex; i>=0; i--) {
            if (refChars.includes(str[i])) {
                return i + 1;
            }
        }
    }

    return (forward) ? str.length : 0;
}

const detectFileTypeIndex = (str) => {
    const arr = CONSTANTS.TYPES_ALLOWED;

    for (let i = 0; i < arr.length; i++) {
        const pos = str.indexOf(arr[i]);
        if (pos >= 0) return pos;
    }

    return -1;
}

const detectEOF = data => (data.includes('\r\n')) ? '\r\n' : '\n';

const simpleParser = (data, host, originPath) => {
    const EOF = detectEOF(data);
    let lines = data.split(EOF);
    let contentDuration = 0;
    let firstSegmentDuration = 0;
    let adsDuration = 0;
    let adMarkers = 0;
    let adFlag = 0;
    let adCounter = 0;
    let lastAdFixedDuration = 0;
    let match;
    let isMaster = true;
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        match = (/^#EXT-X-CUE-OUT-CONT:?(.*)?$/).exec(line);
        if (match) {
            /**
             * #EXTM3U
             * #EXT-X-VERSION:3
             * #EXT-X-TARGETDURATION:10
             * #EXT-X-MEDIA-SEQUENCE:160274711
             * #EXT-X-CUE-OUT-CONT:ElapsedTime=110,Duration=120
             * #EXTINF:9.843,
             * #EXT-X-CUE-IN
             * ...
             */
            if (adFlag === 0) adFlag = 2;
            continue;
        }
        
        match = (/^#EXT-X-CUE-OUT:?(.*)?$/).exec(line);
        if (match) {
            adMarkers++;
            adCounter = 0;
            if (match[1]) {
                const chunks = match[1].split('=');
                lastAdFixedDuration = parseFloat((chunks.length > 1) ? chunks[1] : chunks[0]);
                adsDuration += lastAdFixedDuration;
                adFlag = 1;
            } else {
                adFlag = 2;
            }

            continue;
        }

        match = (/^#EXT-X-CUE-IN:?(.*)?$/).exec(line);
        if (match) {
            if (adFlag === 2) adsDuration += adCounter;
            adCounter = 0;
            adFlag = 0;
            continue;
        }

        match = (/^#EXTINF:?([0-9\.]*)?,?(.*)?$/).exec(line);
        if (match) {
            isMaster = false;
            const d = parseFloat(match[1]);
            if (firstSegmentDuration === 0) firstSegmentDuration = d;
            contentDuration += d;
            if (adFlag > 0) adCounter += d;
            continue;
        }

        // avoid other tags
        if (line && line[0] === '#') continue;

        let iStart = 0, iEnd = 0;

        const iRef = detectFileTypeIndex(line);
        if (iRef === -1) continue;

        iStart = findPathIndex(line, iRef, false);
        iEnd = findPathIndex(line, iRef, true);

        const refUri = line.substr(iStart, iEnd - iStart + 1);
        const pos = (refUri.indexOf('https://') === 0) ? 8 : (refUri.indexOf('http://') === 0) ? 7 : -1;
        const newUri = (pos > 0) ? (refUri.substr(pos)) : parseRelativePath(host, originPath, refUri);

        lines[i] = line.substr(0, iStart) + '/' + newUri + line.substr(iEnd + 1);
    }

    if (adFlag == 1) {
        adsDuration -= lastAdFixedDuration - adCounter;
    } else if (adFlag == 2) {
        adsDuration += adCounter;
    }

    return {
        isMaster,
        data: lines.join('\n'), // '\n' is used instead of EOF to prevent issues
        info: {
            adsDuration,
            adMarkers,
            contentDuration,
            firstSegmentDuration
        }
    };
}

module.exports = {
    replaceAll,
    simpleParser
};