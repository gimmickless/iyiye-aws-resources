// import '../env'
import { Construct } from 'constructs'
import { Stack, StackProps } from 'aws-cdk-lib'
import { NetworkNestedStack } from './nestedStack/network'
import { CognitoNestedStack } from './nestedStack/cognito'
import { DataNestedStack } from './nestedStack/data'
import { PipelineNestedStack } from './nestedStack/pipeline'
import { StorageNestedStack } from './nestedStack/storage'
import { AppsyncNestedStack } from './nestedStack/appsync'

const appNamingPrefix = 'iyiye'
const userFuncName = `${appNamingPrefix}-${process.env.ENVIRONMENT}-user`
const kitQueryFuncName = `${appNamingPrefix}-${process.env.ENVIRONMENT}-kit-query`
const rdsDatabaseNames = {
  notification: 'notif',
  portfolio: 'portf',
  userInteractions: 'uintr',
  warehouse: 'whs',
  order: 'order',
  delivery: 'deliv'
}
export class IyiyeNativeCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const storageStack = new StorageNestedStack(this, 'StorageNestedStack', {
      metaFilesBucketName: `${appNamingPrefix}-meta-files`,
      userFilesBucketName: `${appNamingPrefix}-user-files`
    })

    const cognitoStack = new CognitoNestedStack(this, 'CognitoNestedStack', {
      userPoolName: `${appNamingPrefix}-${process.env.ENVIRONMENT}-up`,
      userPoolClientName: `${appNamingPrefix}-${process.env.ENVIRONMENT}-up-cl`,
      userPoolNativeClientName: `${appNamingPrefix}-${process.env.ENVIRONMENT}-up-ncl`,
      defaultUserPoolGroupName: 'default-ug',
      adminUserPoolGroupName: 'admin-ug',
      identityPoolName: `${appNamingPrefix}-${process.env.ENVIRONMENT}-ip`,
      userFilesBucketArn: storageStack.userFilesBucket.bucketArn
    })

    const networkStack = new NetworkNestedStack(this, 'NetworkNestedStack', {})

    const dataStack = new DataNestedStack(this, 'DataNestedStack', {
      rdsVpc: networkStack.vpc,
      rdsVpcSecurityGroups: [networkStack.rdsSecurityGroup],
      rdsDbClusterIdentifier: `${process.env.ENVIRONMENT}-${appNamingPrefix}-rds-cluster`,
      kitCategoryTableName: `${process.env.ENVIRONMENT}.${appNamingPrefix}.kit_category`,
      kitTableName: `${process.env.ENVIRONMENT}.${appNamingPrefix}.kit`
    })

    new PipelineNestedStack(this, 'PipelineNestedStack', {
      lambda: {
        userFuncName: userFuncName,
        kitQueryFuncName: kitQueryFuncName
      },
      cognitoUserPoolId: cognitoStack.userPool.userPoolId,
      github: {
        functionReposOwnerName: 'gimmickless',
        userFunctionRepoName: 'user-function',
        kitQueryFunctionRepoName: 'kit-query-function'
      },
      rds: {
        dbClusterArn: `arn:aws:rds:${this.region}:${this.account}:cluster:${dataStack.databaseCluster.clusterArn}`,
        dbCredentialsSecretArn: dataStack.dbSecret.secretArn
      },
      artifactStoreBucketName: `${appNamingPrefix}-pipeline-artifacts`
    })

    new AppsyncNestedStack(this, 'AppsyncNestedStack', {
      appsyncApiName: `${appNamingPrefix}-${process.env.ENVIRONMENT}-appsync-api`,
      cognitoUserPoolId: cognitoStack.userPool.userPoolId,
      lambda: {
        userFuncArn: `arn:aws:lambda:${this.region}:${this.account}:function:${userFuncName}`,
        kitQueryFuncArn: `arn:aws:lambda:${this.region}:${this.account}:function:${kitQueryFuncName}`
      },
      rds: {
        dbCluster: dataStack.databaseCluster,
        dbCredentialsSecretStore: dataStack.dbSecret,
        notificationDbName: rdsDatabaseNames.notification,
        portfolioDbName: rdsDatabaseNames.portfolio
      }
    })
  }
}
