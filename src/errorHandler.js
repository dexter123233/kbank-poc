const createLogger = (category) => {
  const log = (level, message, meta = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      ...meta
    };
    console.log(JSON.stringify(logEntry));
  };

  return {
    error: (message, meta) => log('error', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    info: (message, meta) => log('info', message, meta),
    debug: (message, meta) => log('debug', message, meta)
  };
};

module.exports = { createLogger };
