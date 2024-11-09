import { IRootConfig } from './config';

export const Config: IRootConfig = {
  github: {
    owner: 'ShinichiU',
    cdk: {
      repo: 'cdk',
      branch: 'main',
    },
  },
  aws: {
    prd: {
      accountId: '992382384155',
    },
    dev: {
      accountId: '533570606590',
    },
  },
};
