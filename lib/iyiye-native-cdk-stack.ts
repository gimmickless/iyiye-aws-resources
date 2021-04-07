import '../env'
import { Construct, Stack, StackProps } from '@aws-cdk/core'
import { SubnetType } from '@aws-cdk/aws-ec2'
import { Secret } from '@aws-cdk/aws-secretsmanager'
import { NetworkNestedStack } from './nestedStack/network'
import { AppsyncNestedStack } from './nestedStack/appsync'
import { CognitoNestedStack } from './nestedStack/cognito'
import { DataNestedStack } from './nestedStack/data'
import { PipelineNestedStack } from './nestedStack/pipeline'
import { StorageNestedStack } from './nestedStack/storage'

const applicationNamingPrefix = 'iyiye'

export class IyiyeNativeCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const rdsDatabaseName = `${applicationNamingPrefix}_${process.env.ENVIRONMENT}_db`
    const rdsDbIngredientTableName = 'Ingredients'
    const rdsDbKitTableName = 'Kits'
    const rdsDbOrderTableName = 'Orders'
    const rdsDbKitIngredientTableName = 'KitIngredients'
    const rdsDbOrderKitTableName = 'OrderKits'

    // // Secrets Manager
    // const githubOauthTokenSecret = new Secret(this, 'GithubOauthTokenSecret', {
    //   generateSecretString: {
    //     generateStringKey: `${applicationNamingPrefix}/${process.env.ENVIRONMENT}/FunctionGithubOauthTokenSecret`,
    //     secretStringTemplate: JSON.stringify({
    //       token: process.env.GH_OAUTH_TOKEN_SECRET
    //     })
    //   }
    // })

    // Nested stacks

    const storageStack = new StorageNestedStack(this, 'StorageNestedStack', {
      pipelineArtifactStoreBucketName: `${applicationNamingPrefix}-pipeline-artifact-store`,
      metaFilesBucketName: `${applicationNamingPrefix}-meta-files`,
      userFilesBucketName: `${applicationNamingPrefix}-user-files`
    })

    const cognitoStack = new CognitoNestedStack(this, 'CognitoNestedStack', {
      userPoolName: `${applicationNamingPrefix}-${process.env.ENVIRONMENT}-up`,
      userPoolClientName: `${applicationNamingPrefix}-${process.env.ENVIRONMENT}-up-cl`,
      defaultUserPoolGroupName: 'default-ug',
      adminUserPoolGroupName: 'admin-ug',
      identityPoolName: `${applicationNamingPrefix}-${process.env.ENVIRONMENT}-ip`,
      userFilesBucketArn: storageStack.userFilesBucket.bucketArn
    })

    const networkStack = new NetworkNestedStack(this, 'NetworkNestedStack', {})

    const dataStack = new DataNestedStack(this, 'DataNestedStack', {
      rdsVpc: networkStack.vpc,
      rdsVpcSecurityGroups: [networkStack.rdsSecurityGroup],
      rdsDbClusterIdentifier: `${applicationNamingPrefix}-rds-cluster-1`,
      rdsDatabaseName,
      categoryTableName: `${process.env.ENVIRONMENT}.${applicationNamingPrefix}.kit_category`
    })

    // // TODO: Add Oauth Token Secret ARN
    // new PipelineNestedStack(this, 'PipelineNestedStack', {
    //   getCognitoUserFunctionName: `${applicationNamingPrefix}-${process.env.ENVIRONMENT}-get-cognito-user`,
    //   rdsBootstrapFunctionName: `${applicationNamingPrefix}-${process.env.ENVIRONMENT}-rds-bootstrap`,
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
    //   appsyncApiName: '${applicationNamingPrefix}-prod-appsync-api',
    //   cognitoUserPoolId: cognitoStack.userPool.userPoolId,
    //   getCognitoUserFunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${applicationNamingPrefix}-${process.env.ENVIRONMENT}-get-cognito-user`,
    //   rdsDbName: rdsDatabaseName,
    //   rdsDbClusterArn: `arn:aws:rds:${this.region}:${this.account}:cluster:${dataStack.databaseCluster.clusterArn}`,
    //   rdsDbCredentialsSecretArn: dataStack.dbSecret.secretArn,
    //   rdsDbIngredientTableName,
    //   rdsDbKitTableName,
    //   rdsDbKitIngredientTableName
    // })
  }
}
