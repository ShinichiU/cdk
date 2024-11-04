import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ShortEnvironments } from '../type/env';
import { Route53 } from '../construct/route53';
import { CloudFront } from '../construct/cloudfront';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

interface Props extends cdk.StackProps {
  shortEnv: ShortEnvironments;
}
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    new Route53(this, 'Route53', {
      shortEnv: props.shortEnv,
    });
    new CloudFront(this, 'CloudFront', {
      shortEnv: props.shortEnv,
    });
  }
}
