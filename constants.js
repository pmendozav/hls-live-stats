const ENVIRONMENT = "prod"; process.env.ENVIRONMENT;
// const DEFAULT_PORT = parseInt(process.env.DEFAULT_PORT);
const LOGS_TO_FILE = true; //process.env.LOGS_TO_FILE === 'true';
const SOURCES = {

}

const TYPES_ALLOWED = ['.m3u8', '.ts', '.vtt'];
// const EOF = '\n';

module.exports = {
    // DEFAULT_PORT,
    LOGS_TO_FILE,
    SOURCES,
    ENVIRONMENT,
    TYPES_ALLOWED,
    // EOF
};