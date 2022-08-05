const util = require('util');
const _exec = util.promisify(require('child_process').exec);
// const spawn = util.promisify(require('child_process').spawn);
const spawn = require('child_process').spawn;
const { fork } = require('child_process');
const fs = require('fs');
const path = require('path');

const pause = timeout => {
    return new Promise((resolve, reject) => {
        _resolve = resolve;
        _reject = reject;

        setTimeout(() => resolve(), timeout);
    });
}

async function run(sources, target, timeout) {
    try {
        // kill any process in port 3000
        result = await _exec('kill -9 $(lsof -ti:3000)');
    } catch (e) {
    }

    try {
        // create target folder
        result = await _exec(`mkdir ${target}`);
    } catch (e) {
    }

    // start server
    spawn('node', ['/Users/haystack/Documents/scripts/hls-live-stats/server.js'], {detached: true, stdio: [ 'ignore']});

    await pause(1000);

    // register sources
    for (source of sources) {
        let url = source[1];
        url = url.replace('http://', '');
        url = url.replace('https://', '');
        
        let command = `curl -s "http://localhost:3000/${url}"`;
        await _exec(command);
    }

    setInterval(async () => {
        let command = `curl -s "http://localhost:3000/stats" > ${target}/stats.json`;
        await _exec(command);
    }, 1000)

    let count = 0;
    let reportResults = '';
    for (source of sources) {
        let id = source[0];
        let url = source[1];
        url = url.replace('http://', 'https://');

        const child = fork('scripts/mediastreamvalidator.js', [timeout, `${target}/${id}`, url]);
    
        child.on("close", function (code) {
            fork('scripts/hlsreport.js', [`${target}/${id}.json`]);
            reportResults += `${target}/${id}.json.html, `;
            count++;
            if (count === sources.length) {
                console.log(`all the result are located on ${target}\n- hls reports: ${reportResults}\n- server logs: ${target}/stats.json [http://localhost:3000/stats]`)
                process.exit(1);
            }
        });
    }
}

const dataSource = process.argv[2];
const target = process.argv[3];
const time = process.argv[4];

const filepath = path.resolve(__dirname, dataSource);
(async () => {
    const data = await fs.promises.readFile(filepath, 'utf8');
    let sources = [];
    for (const line of data.split('\n')) {
        sources.push(line.split(' '));
    }

    run(sources, target, time);
})();
