#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { SpotlitCdkStack } from '../lib/stack';
import { CertStack } from '../lib/cert-stack';

const app = new cdk.App();

new CertStack(app, 'CertStack');

// certArn is read from the CertStack CloudFormation output in CI and
// passed via --context certArn=<arn>. See deploy.yml.
const certArn = app.node.tryGetContext('certArn') as string | undefined ?? '';

new SpotlitCdkStack(app, 'SpotlitCdkStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  certificateArn: certArn,
});
