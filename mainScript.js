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

const getResults = async (debug = true) => {
    const cmd = `curl -s "http://localhost:3000/stats" > ${target}/stats.json`;
    if (debug) console.log(`\t>>${new Date()}: CMD=${cmd}`)
    let command = `curl -s "http://localhost:3000/stats" > ${target}/stats.json`;
    await _exec(command);
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
    try {
        let hsScriptsPath = await _exec(`echo $HS_SCRIPTS`);
        hsScriptsPath = hsScriptsPath.stdout.replace(/[\n\t\r]/g,"");
        const serverPath = `${hsScriptsPath}/hls-live-stats/server.js`
        spawn('node', [serverPath], {detached: true, stdio: [ 'ignore']});
    } catch (e) {
        console.log(e);
    }

    await pause(1000);

    // register sources
    for (source of sources) {
        let url = source[1];
        if (!url) continue;

        url = url.replace('http://', '');
        url = url.replace('https://', '');
        
        let command = `curl -s "http://localhost:3000/${url}"`;
        await _exec(command);
    }

    setInterval(getResults, 1000)

    let count = 0;
    let reportResults = '';
    for (source of sources) {
        let id = source[0];
        let url = source[1];
        if (!url) continue;
        
        url = url.replace('http://', 'https://');

        const child = fork(path.resolve(__dirname, 'scripts/mediastreamvalidator.js'), [timeout, `${target}/${id}`, url]);
    
        child.on("close", async function (code) {
            fork(path.resolve(__dirname, 'scripts/hlsreport.js'), [`${target}/${id}.json`]);
            reportResults += `${target}/${id}.json.html, `;
            count++;
            if (count === sources.length) {
                console.log(`${new Date()}: all the result are located on ${target}\n- hls reports: ${reportResults}\n- server logs: ${target}/stats.json [http://localhost:3000/stats]`)

                await getResults(false);
                console.log(`${new Date()}: CMD=process.exit(1)`);
                process.exit(1);
            }
        });
    }
}

const dataSource = process.argv[2];
const target = process.argv[3];
const time = process.argv[4];

const filepath = dataSource;
(async () => {
    const data = await fs.promises.readFile(filepath, 'utf8');
    let sources = [];
    for (const line of data.split('\n')) {
        sources.push(line.split(' '));
    }

    run(sources, target, time);
})();
