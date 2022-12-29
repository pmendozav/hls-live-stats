const exec = require('child_process').exec;

const cmd = `hlsreport ${process.argv[2]} -o ${process.argv[2]}.html`;

console.log(`CMD=${cmd}`);
exec(`hlsreport ${process.argv[2]} -o ${process.argv[2]}.html`);