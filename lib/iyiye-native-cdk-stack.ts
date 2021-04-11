// import '../env'
import { Construct, Stack, StackProps } from '@aws-cdk/core'
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

    const storageStack = new StorageNestedStack(this, 'StorageNestedStack', {
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
      rdsDbClusterIdentifier: `${process.env.ENVIRONMENT}-${applicationNamingPrefix}-rds-cluster-1`,
      categoryTableName: `${process.env.ENVIRONMENT}.${applicationNamingPrefix}.kit_category`
    })

    // TODO: Add Oauth Token Secret ARN
    new PipelineNestedStack(this, 'PipelineNestedStack', {
      userFunctionName: `${applicationNamingPrefix}-${process.env.ENVIRONMENT}-user`,
      cognitoUserPoolId: cognitoStack.userPool.userPoolId,
      githubFunctionReposOwnerName: 'gimmickless',
      userFunctionRepoName: 'user-function',
      rdsDbClusterArn: `arn:aws:rds:${this.region}:${this.account}:cluster:${dataStack.databaseCluster.clusterArn}`,
      rdsDbCredentialsSecretArn: dataStack.dbSecret.secretArn,
      artifactStoreBucketName: `${applicationNamingPrefix}-pipeline-artifacts`
    })

    // new AppsyncNestedStack(this, 'AppsyncNestedStack', {
    //   appsyncApiName: `${applicationNamingPrefix}-${process.env.ENVIRONMENT}-appsync-api`,
    //   cognitoUserPoolId: cognitoStack.userPool.userPoolId,
    //   getCognitoUserFunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:${applicationNamingPrefix}-${process.env.ENVIRONMENT}-get-cognito-user`,
    //   rdsDbCluster: dataStack.databaseCluster,
    //   rdsDbCredentialsSecretStore: dataStack.dbSecret
    // })
  }
}
