import { Construct } from 'constructs';
import { ShortEnvironments } from '../type/env';
import {
  aws_cloudfront_origins,
  aws_s3,
  CfnOutput,
  RemovalPolicy,
} from 'aws-cdk-lib';
import {
  Distribution,
  Function,
  FunctionAssociation,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { getConfig } from '../parameters/config';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import path = require('path');

interface Props {
  shortEnv: ShortEnvironments;
  certificate: ICertificate;
}
export class CloudFront extends Construct {
  private readonly webBucket: aws_s3.Bucket;
  public readonly distribution: Distribution;
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

    const functionAssociations: FunctionAssociation[] = [
      {
        eventType: FunctionEventType.VIEWER_RESPONSE,
        function: new Function(this, `${props.shortEnv}-security-function`, {
          runtime: FunctionRuntime.JS_2_0,
          code: FunctionCode.fromFile({
            filePath: path.join(
              __dirname,
              '../../lambda/cloudfront/functions/security/src/index.js',
            ),
          }),
        }),
      },
    ];

    if (props.shortEnv !== 'prd') {
      // prd 以外は Basic 認証を設定
      functionAssociations.push({
        eventType: FunctionEventType.VIEWER_REQUEST,
        function: new Function(this, `${props.shortEnv}-basic-auth-function`, {
          runtime: FunctionRuntime.JS_2_0,
          code: FunctionCode.fromFile({
            filePath: path.join(
              __dirname,
              '../../lambda/cloudfront/functions/basic/src/index.js',
            ),
          }),
        }),
      });
    }

    const domain = getConfig(props.shortEnv).domain;
    this.distribution = new Distribution(
      this,
      `${props.shortEnv}-distribution`,
      {
        defaultRootObject: 'index.html',
        defaultBehavior: {
          origin: aws_cloudfront_origins.S3BucketOrigin.withOriginAccessControl(
            this.webBucket,
          ),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations,
        },
        domainNames: [domain],
        certificate: props.certificate,
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
