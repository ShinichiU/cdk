import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import {
  CodePipeline,
  CodePipelineSource,
  ManualApprovalStep,
  ShellStep,
} from 'aws-cdk-lib/pipelines';
import { CfnConnection } from 'aws-cdk-lib/aws-codeconnections';
import { AppStage } from './pipeline/stage';

export class Pipeline extends Construct {
  readonly prdAccountId: string = '992382384155';
  readonly devAccountId: string = '533570606590';
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const codePipeline = new codepipeline.Pipeline(
      this,
      'cdk-pipeline-pipeline',
      {
        crossAccountKeys: true,
        pipelineType: codepipeline.PipelineType.V2,
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
        commands: ['npm ci', 'npm run build', 'npm run cdk synth'],
      }),
    });
    const devWave = cdkPipeline.addWave('dev');
    const dev = new AppStage(this, 'dev', {
      shortEnv: 'dev',
      env: {
        account: this.devAccountId,
        region: process.env.CDK_DEFAULT_REGION,
      },
    });
    devWave.addStage(dev);

    const prdWave = cdkPipeline.addWave('prd', {
      pre: [new ManualApprovalStep('Approve')],
    });
    const prd = new AppStage(this, 'prd', {
      shortEnv: 'prd',
      env: {
        account: this.prdAccountId,
        region: process.env.CDK_DEFAULT_REGION,
      },
    });
    prdWave.addStage(prd);
  }
}
