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
    local: {
      accountId: '533570606590',
    },
  },
  slack: {
    workspaceId: 'T3MDL6F5H',
    costAlert: {
      channelId: 'C0804LX0T1B',
    },
  },
  alert: {
    costAmount: 10,
  },
};
