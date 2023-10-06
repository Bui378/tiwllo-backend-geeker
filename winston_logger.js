const { createLogger, format, transports } = require('winston');
  
  const consoleFormat = format.combine(
    format.colorize(),
    format.timestamp(),
    format.align(),
    format.printf((info) => {
      return `${info.timestamp} - ${info.level}:  [${info.label}]: ${
        info.message
      } ${JSON.stringify(info.metadata)}`;
    })
  );

  const logger = function(moduleName) {
    if (moduleName === null || moduleName.trim() === '') {
      moduleName = 'unknown_module'
    }
    return createLogger(
      {
            //defaultMeta: { service: "some-random-service" },
            format:format.combine(
                format.timestamp(),
                format.label({ label: moduleName }),
                format.metadata({ fillExcept: ["message", "level", "timestamp", "label"] }),
                format.printf((info) => {
                    return `${info.timestamp} - ${info.level}:  [${info.label}]: ${
                      info.message
                    } ${JSON.stringify(info.metadata)}`;
                  })
            ),
            transports: [
                new transports.Console({
                    level: "debug", 
                    colorize: true,
                    format: consoleFormat
                }),
                new transports.File({
                    filename: 'newrelic_agent.log',
                    colorize: true,
                }),
            ],
      });
  }
module.exports = logger;