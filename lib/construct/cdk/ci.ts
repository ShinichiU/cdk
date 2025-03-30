import { Construct } from 'constructs';
import { Config } from '../../parameters/root';
import {
  Duration,
  RemovalPolicy,
  aws_codebuild as codebuild,
} from 'aws-cdk-lib';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';

export class CdkCi extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const source = codebuild.Source.gitHub({
      owner: Config.github.owner,
      repo: Config.github.cdk.repo,
      webhookFilters: [
        codebuild.FilterGroup.inEventOf(
          codebuild.EventAction.PULL_REQUEST_CREATED,
        ),
        codebuild.FilterGroup.inEventOf(
          codebuild.EventAction.PULL_REQUEST_UPDATED,
        ),
        codebuild.FilterGroup.inEventOf(
          codebuild.EventAction.PULL_REQUEST_REOPENED,
        ),
        codebuild.FilterGroup.inEventOf(codebuild.EventAction.PUSH).andBranchIs(
          Config.github.cdk.branch,
        ),
      ],
    });
    const logGroup = new LogGroup(this, 'cdk-ci-log', {
      logGroupName: '/cdk/ci',
      retention: RetentionDays.ONE_WEEK,
    });
    logGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);

    new codebuild.Project(this, 'cdkCIProject', {
      source,
      badge: true,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'echo n version is $(n -V)',
              'n "$NODE_VERSION"',
              'npm i -g pnpm',
              'pnpm i --frozen-lockfile',
            ],
          },
          build: {
            commands: [
              'node -v',
              'pnpm format-check',
              'pnpm lint-check',
              'pnpm test',
            ],
          },
        },
      }),
      environmentVariables: {
        TZ: {
          value: 'Asia/Tokyo',
        },
        NODE_VERSION: {
          value: Config.meta.node.version,
        },
      },
      timeout: Duration.minutes(30),
      queuedTimeout: Duration.hours(1),
      logging: {
        cloudWatch: {
          logGroup,
          enabled: true,
        },
      },
    });
  }
}
