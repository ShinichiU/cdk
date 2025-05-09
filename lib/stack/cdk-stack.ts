import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CdkPipeline } from '../construct/cdk/pipeline';
import { CdkCi } from '../construct/cdk/ci';
import { GithubCredentials } from '../construct/github';
import { CostAlertNotify } from '../construct/cost-alert-notify';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new CdkPipeline(this, 'CdkPipeline');
    const credentials = new GithubCredentials(this, 'GithubCredentials');
    const ci = new CdkCi(this, 'CdkCi');
    ci.node.addDependency(credentials);
    new CostAlertNotify(this, 'CostAlertNotify');
  }
}
