import { aws_iam as iam } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class ApplicationDiscoveryUser extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new iam.User(this, 'ApplicationDiscoveryUser', {
      userName: 'ApplicationDiscoveryUser',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AWSApplicationDiscoveryAgentAccess',
        ),
      ],
    });
  }
}
