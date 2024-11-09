import {
  BuildSpec,
  EventAction,
  FilterGroup,
  Project,
  Source,
} from 'aws-cdk-lib/aws-codebuild';
import { Construct } from 'constructs';
import { Config } from '../parameters/root';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';

export class CdkCi extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const config = Config;
    const source = Source.gitHub({
      owner: config.github.owner,
      repo: config.github.cdk.repo,
      webhookFilters: [
        FilterGroup.inEventOf(EventAction.PULL_REQUEST_CREATED),
        FilterGroup.inEventOf(EventAction.PULL_REQUEST_UPDATED),
        FilterGroup.inEventOf(EventAction.PULL_REQUEST_REOPENED),
        FilterGroup.inEventOf(EventAction.PUSH).andBranchIs(
          config.github.cdk.branch,
        ),
      ],
    });
    const logGroup = new LogGroup(this, 'cdk-ci-log', {
      logGroupName: '/cdk/ci',
      retention: RetentionDays.ONE_WEEK,
    });
    logGroup.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const nCommand = 'n exec "$NODE_VERSION"';
    new Project(this, 'cdkCIProject', {
      source,
      badge: true,
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'echo n version is $(n -V)',
              'n "$NODE_VERSION"',
              `${nCommand} npm ci`,
            ],
          },
          build: {
            commands: [
              `${nCommand} npm run format-check`,
              `${nCommand} npm run lint-check`,
              `${nCommand} npm run test`,
            ],
          },
        },
      }),
      environmentVariables: {
        TZ: {
          value: 'Asia/Tokyo',
        },
        NODE_VERSION: {
          value: '22',
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
