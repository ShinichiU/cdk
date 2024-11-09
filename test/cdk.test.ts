import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkStack } from '../lib/stack/cdk-stack';
import { AppStack } from '../lib/stack/app-stack';
import { ShortEnvironments } from '../lib/type/env';
import { Config } from '../lib/parameters/root';

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

(['prd', 'dev'] as ShortEnvironments[]).forEach((shortEnv) => {
  test(`Matches the snapshot appStack ${shortEnv}`, () => {
    const app = new cdk.App();
    expect(
      Template.fromStack(
        new AppStack(app, 'AppStack', {
          env: {
            account: Config.aws[shortEnv].accountId,
            region: 'us-east-1',
          },
          shortEnv,
        }),
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
