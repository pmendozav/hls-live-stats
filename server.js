var express = require('express');
const path = require('path');
const { parse } = require('url');
const axios = require("axios");
const bodyParser = require('body-parser')

const { simpleParser } = require('./helper/helper');
const logHelper = require('./helper/logs');
const Source = require('./helper/source');

var app = express();

express.static.mime.define({ 'video/mp2t': ['ts'] });

const TYPES_ALLOWED = ['.m3u8', '.ts', '.vtt'];

app.use(bodyParser.text({ type: 'text/plain' }));

var port = process.env.PORT || 3000;
let logger = logHelper.log4js.getLogger('app');
let sourcesInfo = {};

app.all('/*', function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Origin, Authorization, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range, Content-Length, Content-Type, Access-Control-Allow-Origin, Date');
  }

  next();
});

app.post('/*', function (req, res) {
  const { info } = simpleParser((typeof req.body === 'string') ? req.body : '', '', '');
  res.status(200).send({info});
})

app.get('/stats/:id', function (req, res) {
  const key = `https://${req.params.id}`;
  
  let resp = JSON.parse(JSON.stringify(sourcesInfo[key] || {}));
  
  delete resp['logger'];
  delete resp['id'];

  const stats = resp.stats;
  const adsRatio = Math.floor(100 * ((stats.contentDuration > 0) ? (stats.adsDuration / stats.contentDuration) : 0));

  resp.stats.AdsDescription = `${adsRatio}% (${stats.adMarkers} markers found in ${stats.contentDuration} seconds)`
  
  res.status(200).json(resp);
})

app.get('/stats', function (req, res) {
  // Object.keys(sourcesInfo).map(k => {
  //   if (sourcesInfo[k].isDead) delete sourcesInfo[k];
  // })
  res.status(200).json(sourcesInfo);
})

app.get('/raw/*', (req, res) => {
  let originalUrl = req.originalUrl.substr(5); //
  if (!originalUrl) {
    res.status(404).send('Not found')
    return;
  }

  axios.get('https://' + originalUrl)
  .then(resp => {
    const contentType = resp.headers['content-type'] || 'text/plain';
    res.set('Content-Type', contentType);
    res.send(resp.data)
  })
  .catch(() => {
    res.status(404).send('Not found')
  })
})

app.get('/*', function (req, res) {
  let originalUrl = req.originalUrl;
  if (originalUrl[0] === '/') originalUrl = originalUrl.substr(1);

  if (!originalUrl) {
    logger.error(`[1]: ${originalUrl} is not a valid url`)
    res.status(404).send(`${originalUrl} is not a valid url`);
    return;
  }

  originalUrl = 'https://' + originalUrl;
  const originalUrlObj = parse(originalUrl);

  const ext = path.extname(originalUrlObj.pathname);
  // TODO: add supported caption formats
  if (!ext || !TYPES_ALLOWED.includes(ext)) {
    logger.error(`[2]: ${originalUrl} is not a valid file`);
    res.status(404).send('${originalUrl} is not a valid file');
    return;
  }

  switch (ext) {
    case '.m3u8':
      sendM3U8(res, originalUrl, originalUrlObj.hostname, path.dirname(originalUrlObj.pathname));
      break;
    case '.ts':
      sendTS(res, originalUrl);
      break;
    default:
      sendAny(res, originalUrl);
      break;
  }
});

const sendAny = (res, url) => {
  axios.get(url).then(resp => {
    const contentType = resp.headers['content-type'] || 'text/plain';
    res.set('Content-Type', contentType);
    res.send(resp.data)
  })
    .catch(err => {
      logger.error(`error on ${url}: ${err}`)
      res.status(404).send(`GET ANY: ${url} was not found`);
    })
}

const sendM3U8 = (res, url, host, pathname) => {
  axios.get(url)
    .then(resp => {
      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      const { data, info, isMaster } = simpleParser(resp.data, host, pathname);

      if (!sourcesInfo[url] && isMaster) {
        sourcesInfo[url] = new Source(url, info, logger, resp.data);
      }

      res.send(data)
    })
    .catch(err => {
      logger.error(`error on ${url}: ${err}`)
      res.status(404).send(`GET M3U8 (${url}): ${err}`);
    })
}

const sendTS = (res, url) => {
  axios.get(url, { responseType: 'stream' })
    .then(resp => {
      const data = resp.data;
      const length = resp.headers['content-length'];
      const contentType = resp.headers['content-type'] || 'video/MP2T';

      // TODO: handle partial requests?
      res.set('Content-Length', parseInt(length));
      res.set('Content-Type', contentType);
      data.pipe(res);
    })
    .catch(err => {
      logger.error(`error on (${url}): ${err}`)
      res.status(404).send(`GET TS: ${url} was not found`);
    })
}

app.listen(port, () => {
  logger.info('Initializing..');

  setInterval(function() {
    // Object.keys(sourcesInfo).map(k => {
    //   if (sourcesInfo[k].isDead) delete sourcesInfo[k];
    // })
    
    logger.info(`sourcesInfo=${JSON.stringify(sourcesInfo)}`);
  }, 10 * 60 * 1000)
});
module.exports = app;
