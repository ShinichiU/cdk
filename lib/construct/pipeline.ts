import { Construct } from "constructs";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
} from "aws-cdk-lib/pipelines";
import { CfnConnection } from "aws-cdk-lib/aws-codeconnections";

export class Pipeline extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const codePipeline = new codepipeline.Pipeline(
      this,
      "cdk-pipeline-pipeline",
      {
        crossAccountKeys: true,
        pipelineType: codepipeline.PipelineType.V2, // trigger機能はV1非対応
        restartExecutionOnUpdate: false,
      },
    );

    const connection = new CfnConnection(this, "cdk-pipeline-connection", {
      connectionName: "cdk-pipeline-connection",
      providerType: "GitHub",
    });

    new CodePipeline(this, "cdk-pipeline", {
      codePipeline: codePipeline,
      selfMutation: true,
      synth: new ShellStep("Synth", {
        input: CodePipelineSource.connection("ShinichiU/cdk", "main", {
          connectionArn: connection.attrConnectionArn,
          triggerOnPush: true,
        }),
        installCommands: ["npm install -g aws-cdk"],
        commands: [
          "npm ci",
          "npx prettier --check './{bin,lib,src,test}/**/*.{ts,tsx}'",
          "npx eslint './{bin,lib,src,test}/**/*.{ts,tsx}' --max-warnings=0",
          "npm run test",
          "npm run build",
          "npx cdk synth",
        ],
      }),
    });
  }
}
