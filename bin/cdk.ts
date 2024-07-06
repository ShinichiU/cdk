#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkStack } from "../lib/stack/cdk-stack";

const app = new cdk.App();
new CdkStack(app, "CdkStack", {
  env: { account: "700359865376", region: "us-east-1" },
});
app.synth();
