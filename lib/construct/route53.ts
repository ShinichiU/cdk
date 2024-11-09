import { Construct } from 'constructs';
import { ShortEnvironments } from '../type/env';
import {
  aws_iam as iam,
  CfnResource,
  RemovalPolicy,
  Stack,
  aws_route53 as route53,
} from 'aws-cdk-lib';
import {
  Certificate,
  CertificateValidation,
  ICertificate,
} from 'aws-cdk-lib/aws-certificatemanager';
import { getConfig } from '../parameters/config';
import { encryptSha256 } from '../util/encrypt';
import { Key, KeySpec, KeyUsage } from 'aws-cdk-lib/aws-kms';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

interface Props {
  shortEnv: ShortEnvironments;
}

export class Route53 extends Construct {
  private readonly hostedZone: route53.IHostedZone;
  public readonly certificate: ICertificate;
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);
    const domain = getConfig(props.shortEnv).domain;

    // Route53の設定
    this.hostedZone = new route53.HostedZone(this, 'hosted-zone', {
      zoneName: domain,
    });
    this.hostedZone.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const dnssecKeyAlias = 'nuts-choco-com-dnssec-key';
    // DNSSEC 署名用 KMS キーを作成
    const key = new Key(this, 'dnssec-key', {
      enableKeyRotation: false,
      removalPolicy: RemovalPolicy.DESTROY,
      alias: dnssecKeyAlias,
      keySpec: KeySpec.ECC_NIST_P256,
      keyUsage: KeyUsage.SIGN_VERIFY,
    });
    key.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new iam.ServicePrincipal('dnssec-route53.amazonaws.com')],
        actions: ['kms:DescribeKey', 'kms:GetPublicKey', 'kms:Sign'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'aws:SourceAccount': Stack.of(this).account,
          },
        },
      }),
    );
    key.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new iam.ServicePrincipal('dnssec-route53.amazonaws.com')],
        actions: ['kms:CreateGrant'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'aws:SourceAccount': Stack.of(this).account,
          },
          Bool: {
            'kms:GrantIsForAWSResource': true,
          },
        },
      }),
    );
    // KSK(鍵署名鍵) for dnssec
    const keySigningKey = new route53.CfnKeySigningKey(this, 'dnssec-ksk', {
      hostedZoneId: this.hostedZone.hostedZoneId,
      keyManagementServiceArn: key.keyArn,
      name: `${props.shortEnv}KeyNutsChocoCom`,
      status: 'ACTIVE',
    });
    keySigningKey.addDependency(key.node.defaultChild as CfnResource);
    // associate the KSK
    const dnssec = new route53.CfnDNSSEC(this, 'dnssec', {
      hostedZoneId: this.hostedZone.hostedZoneId,
    });
    dnssec.addDependency(keySigningKey);

    if (props.shortEnv === 'prd') {
      // Google Workspace の MX レコードを設定
      new route53.MxRecord(this, 'gws-mx-records', {
        zone: this.hostedZone,
        values: [
          {
            priority: 10,
            hostName: 'aspmx.l.google.com',
          },
          {
            priority: 20,
            hostName: 'alt1.aspmx.l.google.com',
          },
          {
            priority: 30,
            hostName: 'alt2.aspmx.l.google.com',
          },
          {
            priority: 40,
            hostName: 'aspmx2.googlemail.com',
          },
          {
            priority: 50,
            hostName: 'aspmx3.googlemail.com',
          },
          {
            priority: 60,
            hostName: 'aspmx4.googlemail.com',
          },
          {
            priority: 70,
            hostName: 'aspmx5.googlemail.com',
          },
        ],
      });
      // GWS DKIM レコードを設定
      const googleDomainKey =
        'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDKcX1KcA+yJJ5ryBDjhFp2XXaDTX9fqNHGIsKg87T9+QppJILyQDdUmxKVxpR8KBNKiN+yCy/t8/dzOsBG9e9AQvmn9bqKCu5EjbbGK01NTON4lIBt3mjMgwdCXYy1eSAioXCIjELyjBY35Hbs0b91aCogx0Y+hGp1F8QyTw0c2wIDAQAB';
      new route53.TxtRecord(this, 'gws-dkim-txt', {
        zone: this.hostedZone,
        recordName: 'google._domainkey',
        values: [googleDomainKey],
      });
      // sendgrid CNAME レコードを設定
      new route53.CnameRecord(this, 'sendgrid-cname-records', {
        zone: this.hostedZone,
        recordName: '9232917',
        domainName: 'sendgrid.net',
      });
      new route53.CnameRecord(this, 'sendgrid-cname-records-em', {
        zone: this.hostedZone,
        recordName: 'em9501',
        domainName: 'u9232917.wl168.sendgrid.net',
      });
      new route53.CnameRecord(this, 'sendgrid-cname-records-url', {
        zone: this.hostedZone,
        recordName: 'url9631',
        domainName: 'sendgrid.net',
      });
      // Sendgrid DKiM レコードを設定 - 2レコード
      new route53.CnameRecord(this, 'sendgrid-dkim-txt-1', {
        zone: this.hostedZone,
        recordName: 's1._domainkey',
        domainName: 's1.domainkey.u9232917.wl168.sendgrid.net',
      });
      new route53.CnameRecord(this, 'sendgrid-dkim-txt-2', {
        zone: this.hostedZone,
        recordName: 's2._domainkey',
        domainName: 's2.domainkey.u9232917.wl168.sendgrid.net',
      });

      // Google Workspace, Sendgrid の TXT レコードを設定
      new route53.TxtRecord(this, 'gws-sendgrid-records', {
        zone: this.hostedZone,
        values: ['v=spf1 include:_spf.google.com include:sendgrid.net ~all'],
      });
      // _dmarc record を設定
      new route53.TxtRecord(this, 'dmarc-records', {
        zone: this.hostedZone,
        recordName: '_dmarc',
        values: [
          // 認証されていないメールを拒否する
          'v=DMARC1; p=reject; rua=mailto:dmarc-report@nuts-choco.com; ruf=mailto:dmarc-report@nuts-choco.com',
        ],
      });

      // dev.nuts-choco.com の NS レコードを設定
      new route53.NsRecord(this, 'dev-ns-records', {
        zone: this.hostedZone,
        recordName: 'dev',
        values: [
          'ns-897.awsdns-48.net',
          'ns-303.awsdns-37.com',
          'ns-1522.awsdns-62.org',
          'ns-1659.awsdns-15.co.uk',
        ],
      });
      // dev.nuts-choco.com の DS レコードを設定
      new route53.DsRecord(this, 'dev-ds-records', {
        zone: this.hostedZone,
        recordName: 'dev',
        values: [
          '38063 13 2 9A43C3F7FAA9210106693EAB213E30E5CE8C00203EBEF2E7389B735C65796A91',
        ],
      });
    }

    this.certificate = new Certificate(this, 'certificate', {
      domainName: domain,
      subjectAlternativeNames: [`*.${domain}`],
      validation: CertificateValidation.fromDns(this.hostedZone),
    });
  }

  addAliasRecord(target: route53.IAliasRecordTarget, hostName?: string) {
    new route53.ARecord(this, `alias-record-${encryptSha256(hostName ?? '')}`, {
      zone: this.hostedZone,
      target: route53.RecordTarget.fromAlias(target),
      recordName: hostName,
    });
  }
}
