import { Construct } from 'constructs';
import { ShortEnvironments } from '../type/env';
import {
  aws_cloudfront_origins,
  aws_s3,
  CfnOutput,
  RemovalPolicy,
} from 'aws-cdk-lib';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';

interface Props {
  shortEnv: ShortEnvironments;
}
export class CloudFront extends Construct {
  private readonly webBucket: aws_s3.Bucket;
  private readonly distribution: Distribution;
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);
    this.webBucket = new aws_s3.Bucket(this, `${props.shortEnv}-web-bucket`, {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      versioned: true,
      encryption: aws_s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });

    this.distribution = new Distribution(
      this,
      `${props.shortEnv}-distribution`,
      {
        defaultRootObject: 'index.html',
        defaultBehavior: {
          origin: aws_cloudfront_origins.S3BucketOrigin.withOriginAccessControl(
            this.webBucket,
          ),
        },
      },
    );

    new CfnOutput(this, 'webUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
    });
    new CfnOutput(this, 'webBucketName', {
      value: this.webBucket.bucketName,
    });
  }
}
