import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkStack } from '../lib/stack/cdk-stack';

test(`Matches the snapshot stack`, () => {
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
