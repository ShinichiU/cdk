import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ShortEnvironments } from '../type/env';
import { Dns } from '../construct/dns';
import { WebApplication } from '../construct/web-application';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

interface Props extends cdk.StackProps {
  shortEnv: ShortEnvironments;
}
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const route53 = new Dns(this, 'Route53', {
      shortEnv: props.shortEnv,
    });
    const cloudfront = new WebApplication(this, 'CloudFront', {
      shortEnv: props.shortEnv,
      certificate: route53.certificate,
    });
    route53.addAliasRecord(
      new cdk.aws_route53_targets.CloudFrontTarget(cloudfront.distribution),
    );
  }
}
