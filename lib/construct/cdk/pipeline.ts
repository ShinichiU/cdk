import { Construct } from 'constructs';
import { CfnConnection } from 'aws-cdk-lib/aws-codeconnections';
import { aws_codepipeline as pipeline, pipelines } from 'aws-cdk-lib';
import { AppStage } from './pipeline-stage';
import { Config } from '../../parameters/root';

export class CdkPipeline extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const codePipeline = new pipeline.Pipeline(this, 'cdk-pipeline-pipeline', {
      crossAccountKeys: true,
      pipelineType: pipeline.PipelineType.V2,
      restartExecutionOnUpdate: false,
    });

    const connection = new CfnConnection(this, 'cdk-pipeline-connection', {
      connectionName: 'cdk-pipeline-connection',
      providerType: 'GitHub',
    });

    const cdkPipeline = new pipelines.CodePipeline(this, 'cdk-pipeline', {
      codePipeline: codePipeline,
      selfMutation: true,
      synth: new pipelines.ShellStep('Synth', {
        input: pipelines.CodePipelineSource.connection(
          `${Config.github.owner}/${Config.github.cdk.repo}`,
          Config.github.cdk.branch,
          {
            connectionArn: connection.attrConnectionArn,
            triggerOnPush: true,
          },
        ),
        commands: [
          'npm i -g pnpm',
          'pnpm i --frozen-lockfile',
          'pnpm build',
          'pnpm cdk synth',
        ],
      }),
    });
    const devWave = cdkPipeline.addWave('dev');
    const dev = new AppStage(this, 'dev', {
      shortEnv: 'dev',
      env: {
        account: Config.aws.dev.accountId,
        region: process.env.CDK_DEFAULT_REGION,
      },
    });
    devWave.addStage(dev);

    const prdWave = cdkPipeline.addWave('prd', {
      pre: [new pipelines.ManualApprovalStep('Approve')],
    });
    const prd = new AppStage(this, 'prd', {
      shortEnv: 'prd',
      env: {
        account: Config.aws.prd.accountId,
        region: process.env.CDK_DEFAULT_REGION,
      },
    });
    prdWave.addStage(prd);
  }
}
