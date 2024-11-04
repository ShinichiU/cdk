import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import {
  CodePipeline,
  CodePipelineSource,
  ManualApprovalStep,
  ShellStep,
} from 'aws-cdk-lib/pipelines';
import { CfnConnection } from 'aws-cdk-lib/aws-codeconnections';
import { Stage, StageProps } from 'aws-cdk-lib';
import { ShortEnvironments } from '../type/env';
import { AppStack } from '../stack/app-stack';

export class Pipeline extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const codePipeline = new codepipeline.Pipeline(
      this,
      'cdk-pipeline-pipeline',
      {
        crossAccountKeys: true,
        pipelineType: codepipeline.PipelineType.V2, // trigger機能はV1非対応
        restartExecutionOnUpdate: false,
      },
    );

    const connection = new CfnConnection(this, 'cdk-pipeline-connection', {
      connectionName: 'cdk-pipeline-connection',
      providerType: 'GitHub',
    });

    const cdkPipeline = new CodePipeline(this, 'cdk-pipeline', {
      codePipeline: codePipeline,
      selfMutation: true,
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection('ShinichiU/cdk', 'main', {
          connectionArn: connection.attrConnectionArn,
          triggerOnPush: true,
        }),
        installCommands: ['npm install -g aws-cdk'],
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
    });

    const prdWave = cdkPipeline.addWave('prd', {
      pre: [new ManualApprovalStep('Approve')],
    });
    const prd = new AppStage(this, 'prd', {
      shortEnv: 'prd',
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
    });
    prdWave.addStage(prd);
  }
}

interface IStageProps extends StageProps {
  shortEnv: ShortEnvironments;
}

class AppStage extends Stage {
  constructor(scope: Construct, id: string, props: IStageProps) {
    super(scope, id, props);

    new AppStack(this, 'AppStack', {
      shortEnv: props.shortEnv,
    });
  }
}
