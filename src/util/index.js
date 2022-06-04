function logger(from, message) {
    console.log(`[${new Date().toISOString()}] ${from}: ${message}`);
}

module.exports = {
    logger
};