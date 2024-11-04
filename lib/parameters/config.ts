import { ShortEnvironments } from '../type/env';
import { Config as PrdConfig } from './prd';
import { Config as DevConfig } from './dev';
import { Config as LocalConfig } from './local';

export interface IConfig {
  domain: string;
}

export const getConfig = (shortEnv: ShortEnvironments): IConfig => {
  if (shortEnv === 'prd') {
    return PrdConfig;
  }
  if (shortEnv === 'dev') {
    return DevConfig;
  }
  if (shortEnv === 'local') {
    return LocalConfig;
  }

  throw new Error('Invalid shortEnv');
};
