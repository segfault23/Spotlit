import { env } from 'process';
import { Stack, StackProps, CfnOutput, Fn } from 'aws-cdk-lib';
import { ICertificate, Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export class CertStack extends Stack {
  public readonly certificate: ICertificate;
  public readonly webAcl: CfnWebACL;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, {
      ...props,
      env: {
        account: env.CDK_DEFAULT_ACCOUNT,
        region: 'us-east-1',
      },
    });

    const zone = new HostedZone(this, 'SpotlitZone', {
      zoneName: 'spotlit.online',
    });

    const cert = new Certificate(this, 'SpotlitCert', {
      domainName: 'spotlit.online',
      subjectAlternativeNames: ['www.spotlit.online'],
      validation: CertificateValidation.fromDns(zone),
    });

    this.certificate = cert;

    this.webAcl = new CfnWebACL(this, 'SpotlitWebACL', {
      defaultAction: { allow: {} },
      scope: 'CLOUDFRONT',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'SpotlitWebACL',
        sampledRequestsEnabled: true,
      },
      rules: [],
    });

    new CfnOutput(this, 'CertificateArn', {
      value: cert.certificateArn,
    });

    new CfnOutput(this, 'WebAclArn', {
      value: this.webAcl.attrArn,
    });

    new CfnOutput(this, 'NameServers', {
      value: Fn.join(', ', zone.hostedZoneNameServers!),
    });
  }
}
