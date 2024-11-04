import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkStack } from '../lib/stack/cdk-stack';
import { AppStack } from '../lib/stack/app-stack';

test(`Matches the snapshot rootStack`, () => {
  const app = new cdk.App();
  expect(
    Template.fromStack(
      new CdkStack(app, 'RootStack', {
        env: {
          account: '700359865376',
          region: 'us-east-1',
        },
      }),
    ).toJSON(),
  ).toMatchSnapshot();
});

test(`Matches the snapshot appStack`, () => {
  const app = new cdk.App();
  expect(
    Template.fromStack(
      new AppStack(app, 'AppStack', {
        env: {
          account: '992382384155',
          region: 'us-east-1',
        },
        shortEnv: 'prd',
      }),
    ).toJSON(),
  ).toMatchSnapshot();
});
