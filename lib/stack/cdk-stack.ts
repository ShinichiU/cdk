import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Pipeline } from '../construct/pipeline';
import { CdkCi } from '../construct/ci';
import { GithubCredentials } from '../construct/github';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new Pipeline(this, 'CdkPipeline');
    const credentials = new GithubCredentials(this, 'GithubCredentials');
    const ci = new CdkCi(this, 'CdkCi');
    ci.node.addDependency(credentials);
  }
}
