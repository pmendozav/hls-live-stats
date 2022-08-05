const exec = require('child_process').exec;

const timeout = process.argv[2];
const fname = `${process.argv[3]}.json`;
const url = process.argv[4];
exec(`mediastreamvalidator -t ${timeout} -O ${fname} \"${url}\"`);
