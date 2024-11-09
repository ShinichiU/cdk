import {
  BuildSpec,
  EventAction,
  FilterGroup,
  LinuxBuildImage,
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
              'n exec "$NODE_VERSION" npm ci',
            ],
          },
          build: {
            commands: [
              'echo "== Doing prettier check"',
              'n exec "$NODE_VERSION" npx prettier --check "./{bin,lib,src,test}/**/*.{ts,tsx}"',
              'echo "== Doing eslint check"',
              'n exec "$NODE_VERSION" npx eslint "./{bin,lib,src,test}/**/*.{ts,tsx}" --max-warnings=0',
              'echo "== Doing test"',
              'n exec "$NODE_VERSION" npm run test',
            ],
          },
          post_build: {
            commands: ['npm run cdk synth'],
          },
        },
      }),
      environment: {
        buildImage: LinuxBuildImage.AMAZON_LINUX_2_5,
        privileged: true,
      },
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
