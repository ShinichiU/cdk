import { Construct } from 'constructs';
import { ShortEnvironments } from '../type/env';
import {
  aws_cloudfront_origins as origins,
  aws_s3 as s3,
  CfnOutput,
  Duration,
  RemovalPolicy,
  aws_cloudfront as cloudfront,
} from 'aws-cdk-lib';
import { getConfig } from '../parameters/config';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import * as path from 'path';
interface Props {
  shortEnv: ShortEnvironments;
  certificate: ICertificate;
}
export class WebApplication extends Construct {
  private readonly webBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);
    this.webBucket = new s3.Bucket(this, `${props.shortEnv}-web-bucket`, {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });

    const functionAssociations: cloudfront.FunctionAssociation[] | undefined =
      props.shortEnv !== 'prd'
        ? [
            {
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
              function: new cloudfront.Function(
                this,
                `${props.shortEnv}-basic-auth-function`,
                {
                  runtime: cloudfront.FunctionRuntime.JS_2_0,
                  code: cloudfront.FunctionCode.fromFile({
                    filePath: path.join(
                      __dirname,
                      '../../lambda/cloudfront/functions/basic/src/index.js',
                    ),
                  }),
                },
              ),
            },
          ]
        : undefined;

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      `${props.shortEnv}-response-headers`,
      {
        securityHeadersBehavior: {
          referrerPolicy: {
            referrerPolicy:
              cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
          contentTypeOptions: {
            override: true,
          },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.SAMEORIGIN,
            override: true,
          },
          strictTransportSecurity: {
            // 2 years.
            accessControlMaxAge: Duration.days(365 * 2),
            includeSubdomains: true,
            preload: true,
            override: true,
          },
          xssProtection: {
            protection: true,
            modeBlock: true,
            override: true,
          },
        },
      },
    );

    const domain = getConfig(props.shortEnv).domain;
    this.distribution = new cloudfront.Distribution(
      this,
      `${props.shortEnv}-distribution`,
      {
        defaultRootObject: 'index.html',
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(
            this.webBucket,
          ),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations,
          responseHeadersPolicy,
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
