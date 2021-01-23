import '../env'
import { Construct, Stack, StackProps } from '@aws-cdk/core'
import { SubnetType } from '@aws-cdk/aws-ec2'
import { Secret } from '@aws-cdk/aws-secretsmanager'
import { Ec2NestedStack } from './nestedStack/ec2'
import { AppsyncNestedStack } from './nestedStack/appsync'
import { CognitoNestedStack } from './nestedStack/cognito'
import { DataNestedStack } from './nestedStack/data'
import { PipelineNestedStack } from './nestedStack/pipeline'
import { StorageNestedStack } from './nestedStack/storage'

export class IyiyeNativeCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const rdsDatabaseName = `iyiye_${process.env.ENVIRONMENT}_db`
    const rdsDbIngredientTableName = 'Ingredients'
    const rdsDbKitTableName = 'Kits'
    const rdsDbOrderTableName = 'Orders'
    const rdsDbKitIngredientTableName = 'KitIngredients'
    const rdsDbOrderKitTableName = 'OrderKits'

    // // Secrets Manager
    // const githubOauthTokenSecret = new Secret(this, 'GithubOauthTokenSecret', {
    //   generateSecretString: {
    //     generateStringKey: `iyiye/${process.env.ENVIRONMENT}/FunctionGithubOauthTokenSecret`,
    //     secretStringTemplate: JSON.stringify({
    //       token: process.env.GH_OAUTH_TOKEN_SECRET
    //     })
    //   }
    // })

    // Nested stacks

    const storageStack = new StorageNestedStack(this, 'StorageNestedStack', {
      pipelineArtifactStoreBucketName: 'iyiye-pipeline-artifact-store',
      metaFilesBucketName: 'iyiye-meta-files',
      userFilesBucketName: 'iyiye-user-files'
    })

    const cognitoStack = new CognitoNestedStack(this, 'CognitoNestedStack', {
      userPoolName: 'iyiye-up',
      userPoolClientName: 'iyiye-up-cl',
      defaultUserPoolGroupName: 'iyiye-default-ug',
      adminUserPoolGroupName: 'iyiye-admin-ug',
      identityPoolName: 'iyiye-ip',
      userFilesBucketArn: storageStack.userFilesBucket.bucketArn
    })

    // const ec2Stack = new Ec2NestedStack(this, 'Ec2NestedStack', {})

    // const dataStack = new DataNestedStack(this, 'DataNestedStack', {
    //   rdsVpc: ec2Stack.vpc,
    //   rdsSubnets: ec2Stack.vpc.selectSubnets({
    //     subnetType: SubnetType.PRIVATE
    //   }),
    //   rdsVpcSecurityGroups: [ec2Stack.rdsSecurityGroup],
    //   rdsDbClusterIdentifier: 'iyiye-rds-cluster-1',
    //   rdsDatabaseName,
    //   shoppingCartTable: `iyiye_${process.env.ENVIRONMENT}_shopping_cart`
    // })

    // // TODO: Add Oauth Token Secret ARN
    // new PipelineNestedStack(this, 'PipelineNestedStack', {
    //   getCognitoUserFunctionName: `iyiye-${process.env.ENVIRONMENT}-get-cognito-user`,
    //   rdsBootstrapFunctionName: `iyiye-${process.env.ENVIRONMENT}-rds-bootstrap`,
    //   cognitoUserPoolId: cognitoStack.userPool.userPoolId,
    //   githubOauthTokenSecretArn: githubOauthTokenSecret.secretArn,
    //   artifactStoreBucketName:
    //     storageStack.pipelineArtifactStoreBucket.bucketName,
    //   githubFunctionReposOwnerName: 'gimmickless',
    //   getCognitoUserFunctionRepoName: 'get-cognito-user-function',
    //   rdsBootstrapFunctionRepoName: 'rds-bootstrap-function',
    //   rdsDbName: rdsDatabaseName,
    //   rdsDbClusterArn: `arn:aws:rds:${this.region}:${this.account}:cluster:${dataStack.databaseCluster.clusterArn}`,
    //   rdsDbCredentialsSecretArn: dataStack.dbSecret.secretArn,
    //   rdsDbIngredientTableName,
    //   rdsDbKitTableName,
    //   rdsDbKitIngredientTableName,
    //   rdsDbOrderTableName,
    //   rdsDbOrderKitTableName
    // })

    // new AppsyncNestedStack(this, 'AppsyncNestedStack', {
    //   appsyncApiName: 'iyiye-prod-appsync-api',
    //   cognitoUserPoolId: cognitoStack.userPool.userPoolId,
    //   getCognitoUserFunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:iyiye-${process.env.ENVIRONMENT}-get-cognito-user`,
    //   rdsDbName: rdsDatabaseName,
    //   rdsDbClusterArn: `arn:aws:rds:${this.region}:${this.account}:cluster:${dataStack.databaseCluster.clusterArn}`,
    //   rdsDbCredentialsSecretArn: dataStack.dbSecret.secretArn,
    //   rdsDbIngredientTableName,
    //   rdsDbKitTableName,
    //   rdsDbKitIngredientTableName
    // })
  }
}
