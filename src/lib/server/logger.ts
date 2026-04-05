type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
	return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[LOG_LEVEL];
}

function formatMessage(level: LogLevel, tag: string, message: string): string {
	return `${new Date().toISOString()} [${level.toUpperCase()}] [${tag}] ${message}`;
}

function createLogger(tag: string) {
	return {
		debug(message: string, ...args: unknown[]) {
			if (shouldLog('debug')) console.debug(formatMessage('debug', tag, message), ...args);
		},
		error(message: string, ...args: unknown[]) {
			if (shouldLog('error')) console.error(formatMessage('error', tag, message), ...args);
		},
		info(message: string, ...args: unknown[]) {
			if (shouldLog('info')) console.info(formatMessage('info', tag, message), ...args);
		},
		warn(message: string, ...args: unknown[]) {
			if (shouldLog('warn')) console.warn(formatMessage('warn', tag, message), ...args);
		}
	};
}

export const logger = createLogger('app');
export function getLogger(tag: string) {
	return createLogger(tag);
}
