const exec = require('child_process').exec;
exec(`hlsreport ${process.argv[2]} -o ${process.argv[2]}.html`);