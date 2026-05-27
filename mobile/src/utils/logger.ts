import {InteractionManager} from 'react-native';
import {logger as rnLogs, consoleTransport} from 'react-native-logs';

const config = {
  severity: __DEV__ ? 'debug' : 'warn',
  transport: consoleTransport,
  transportOptions: {
    colors: {
      debug: 'grey',
      info: 'blueBright',
      warn: 'yellowBright',
      error: 'redBright',
    } as const,
  },
  async: true,
  asyncFunc: InteractionManager.runAfterInteractions,
  printLevel: true,
  printDate: true,
  enabled: true,
};

const root = rnLogs.createLogger(config);

export function createLogger(tag: string) {
  return root.extend(tag);
}

export const appLogger = root;
