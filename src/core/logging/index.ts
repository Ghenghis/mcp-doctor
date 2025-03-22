import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs-extra';
import { app } from 'electron';
import * as electronLog from 'electron-log';

// Logger instance
let logger: winston.Logger;

/**
 * Initialize the logging system
 */
export function init(): winston.Logger {
  // Get log directory path
  const logDir = path.join(app.getPath('userData'), 'logs');
  
  // Ensure log directory exists
  fs.ensureDirSync(logDir);
  
  // Create winston logger instance
  logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: { service: 'mcp-doctor' },
    transports: [
      // Write to console
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
            return `${timestamp} [${service}] ${level}: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta) : ''
            }`;
          })
        ),
      }),
      // Write to log file
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
  });
  
  // Also log to electron-log for better integration with Electron
  electronLog.transports.file.resolvePath = () => path.join(logDir, 'electron.log');
  
  // Forward winston logs to electron-log
  logger.on('logging', (transport, level, message, meta) => {
    switch (level) {
      case 'error':
        electronLog.error(message, meta);
        break;
      case 'warn':
        electronLog.warn(message, meta);
        break;
      case 'info':
        electronLog.info(message, meta);
        break;
      case 'debug':
        electronLog.debug(message, meta);
        break;
      default:
        electronLog.log(message, meta);
    }
  });
  
  return logger;
}

/**
 * Get a logger for a specific module
 * @param module Module name
 */
export function getLogger(module: string): winston.Logger {
  if (!logger) {
    throw new Error('Logger not initialized. Call init() first.');
  }
  
  return logger.child({ module });
}

/**
 * Get all log files
 */
export async function getLogFiles(): Promise<string[]> {
  const logDir = path.join(app.getPath('userData'), 'logs');
  
  try {
    const files = await fs.readdir(logDir);
    return files.filter(file => file.endsWith('.log'))
      .map(file => path.join(logDir, file));
  } catch (error) {
    logger.error('Failed to read log directory', error);
    return [];
  }
}

/**
 * Read a log file
 * @param filePath Log file path
 */
export async function readLogFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    logger.error(`Failed to read log file: ${filePath}`, error);
    return '';
  }
}