import { Stage, StageProps } from 'aws-cdk-lib';
import { ShortEnvironments } from '../../type/env';
import { Construct } from 'constructs';
import { AppStack } from '../../stack/app-stack';

interface IStageProps extends StageProps {
  shortEnv: ShortEnvironments;
}

export class AppStage extends Stage {
  constructor(scope: Construct, id: string, props: IStageProps) {
    super(scope, id, props);

    new AppStack(this, 'AppStack', {
      shortEnv: props.shortEnv,
    });
  }
}
