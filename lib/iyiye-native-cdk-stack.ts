// import '../env'
import { Construct, Stack, StackProps } from '@aws-cdk/core'
import { NetworkNestedStack } from './nestedStack/network'
import { CognitoNestedStack } from './nestedStack/cognito'
import { DataNestedStack } from './nestedStack/data'
import { PipelineNestedStack } from './nestedStack/pipeline'
import { StorageNestedStack } from './nestedStack/storage'
import { AppsyncNestedStack } from './nestedStack/appsync'

const applicationNamingPrefix = 'iyiye'
const userFuncName = `${applicationNamingPrefix}-${process.env.ENVIRONMENT}-user`
const rdsDatabaseNames = {
  notification: 'notif'
}
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

    new PipelineNestedStack(this, 'PipelineNestedStack', {
      lambda: {
        userFuncName: userFuncName
      },
      cognitoUserPoolId: cognitoStack.userPool.userPoolId,
      github: {
        functionReposOwnerName: 'gimmickless',
        userFunctionRepoName: 'user-function'
      },
      rds: {
        dbClusterArn: `arn:aws:rds:${this.region}:${this.account}:cluster:${dataStack.databaseCluster.clusterArn}`,
        dbCredentialsSecretArn: dataStack.dbSecret.secretArn
      },
      artifactStoreBucketName: `${applicationNamingPrefix}-pipeline-artifacts`
    })

    new AppsyncNestedStack(this, 'AppsyncNestedStack', {
      appsyncApiName: `${applicationNamingPrefix}-${process.env.ENVIRONMENT}-appsync-api`,
      cognitoUserPoolId: cognitoStack.userPool.userPoolId,
      lambda: {
        userFuncArn: `arn:aws:lambda:${this.region}:${this.account}:function:${userFuncName}`
      },
      rds: {
        dbCluster: dataStack.databaseCluster,
        dbCredentialsSecretStore: dataStack.dbSecret,
        notificationDbName: rdsDatabaseNames.notification
      }
    })
  }
}
