import { Construct } from 'constructs';
import {
  aws_chatbot as chatbot,
  aws_sns as sns,
  aws_iam as iam,
  aws_budgets as budgets,
  aws_ce as ce,
  Stack,
} from 'aws-cdk-lib';
import { Config } from '../parameters/root';
import { ITopic } from 'aws-cdk-lib/aws-sns';

export class CostAlertNotify extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const topic = new sns.Topic(this, 'BillingAlarmTopic');
    topic.grantPublish(new iam.ServicePrincipal('chatbot.amazonaws.com'));
    topic.grantPublish(new iam.ServicePrincipal('costalerts.amazonaws.com'));
    topic.grantPublish(new iam.ServicePrincipal('budgets.amazonaws.com'));
    new chatbot.SlackChannelConfiguration(this, 'SlackChannel', {
      loggingLevel: chatbot.LoggingLevel.ERROR,
      notificationTopics: [topic],
      slackChannelConfigurationName: 'CostAlertsChannel',
      slackChannelId: Config.slack.costAlert.channelId,
      slackWorkspaceId: Config.slack.workspaceId,
    });
    this.addBudgetAlarm(topic);
    this.addCostExplorerAlarm(topic);
  }

  private addBudgetAlarm(topic: ITopic) {
    const subscribers: budgets.CfnBudget.SubscriberProperty[] = [
      {
        subscriptionType: 'SNS',
        address: topic.topicArn,
      },
    ];
    new budgets.CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetLimit: {
          amount: Config.alert.costAmount,
          unit: 'USD',
        },
        costTypes: {
          includeDiscount: true,
          includeTax: true,
          includeSupport: true,
          useBlended: false,
        },
        budgetName: 'MonthlyBudget',
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
      },
      notificationsWithSubscribers: [
        {
          notification: {
            comparisonOperator: 'GREATER_THAN',
            notificationType: 'ACTUAL',
            threshold: 90,
            thresholdType: 'PERCENTAGE',
          },
          subscribers,
        },
        {
          notification: {
            comparisonOperator: 'GREATER_THAN',
            notificationType: 'FORECASTED', // 予測値
            threshold: 100,
            thresholdType: 'PERCENTAGE',
          },
          subscribers,
        },
      ],
    });
  }

  private addCostExplorerAlarm(topic: ITopic) {
    const anomalyMonitor = new ce.CfnAnomalyMonitor(this, 'AnomalyMonitor', {
      monitorName: 'CostAnomalyMonitor',
      monitorType: 'CUSTOM',
      monitorSpecification: JSON.stringify({
        Dimensions: {
          key: 'LINKED_ACCOUNT',
          values: [
            Stack.of(this).account,
            Config.aws.prd.accountId,
            Config.aws.dev.accountId,
          ],
        },
      }),
    });
    const subscribers: ce.CfnAnomalySubscription.SubscriberProperty[] = [
      {
        address: topic.topicArn,
        type: 'SNS',
      },
    ];
    /**
     * 個々のアラート (即時)
     * 条件：最小USD金額(固定金額しきい値) 5ドルを超えた場合
     */
    new ce.CfnAnomalySubscription(this, 'CostAnomalySubscriptionImmediate', {
      frequency: 'IMMEDIATE',
      monitorArnList: [anomalyMonitor.attrMonitorArn],
      subscribers,
      subscriptionName: 'AlertSubscription-Immediate',
      thresholdExpression: JSON.stringify({
        Dimensions: {
          Key: 'ANOMALY_TOTAL_IMPACT_ABSOLUTE',
          MatchOptions: ['GREATER_THAN_OR_EQUAL'],
          Values: ['5'],
        },
      }),
    });
    /**
     * 日次の要約
     * 条件：最小USD金額(固定金額しきい値) 5ドルを超え
     * かつ 予測支出として特定された金額の25%を超えた場合
     */
    new ce.CfnAnomalySubscription(this, 'CostAnomalySubscriptionDaily', {
      frequency: 'DAILY',
      monitorArnList: [anomalyMonitor.attrMonitorArn],
      subscribers,
      subscriptionName: 'AlertSubscription-Daily',
      thresholdExpression: JSON.stringify({
        And: [
          {
            Dimensions: {
              Key: 'ANOMALY_TOTAL_IMPACT_PERCENTAGE',
              MatchOptions: ['GREATER_THAN_OR_EQUAL'],
              Values: ['2'],
            },
          },
          {
            Dimensions: {
              Key: 'ANOMALY_TOTAL_IMPACT_ABSOLUTE',
              MatchOptions: ['GREATER_THAN_OR_EQUAL'],
              Values: ['3'],
            },
          },
        ],
      }),
    });
  }
}
