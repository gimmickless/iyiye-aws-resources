import '../env'
import { Construct, Stack, StackProps } from '@aws-cdk/core'
import { Secret } from '@aws-cdk/aws-secretsmanager'
import { AppsyncNestedStack } from './nestedStack/appsync'
import { CognitoNestedStack } from './nestedStack/cognito'
import { DataNestedStack } from './nestedStack/data'
import { PipelineNestedStack } from './nestedStack/pipeline'
import { StorageNestedStack } from './nestedStack/storage'
import { auroraMajorVersion , auroraFullVersion} from './constants'

export class IyiyeNativeCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // Secrets Manager
    const githubOauthTokenSecret = new Secret(this, 'GithubOauthTokenSecret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          token: process.env.GH_OAUTH_TOKEN_SECRET
        })
      }
    })

    // Nested stacks
    const dataStack = new DataNestedStack(this, 'DataNestedStack', {
      auroraMajorVersion,
      auroraFullVersion,
      shoppingCartTable: `iyiye_${process.env.ENVIRONMENT}_shopping_cart`
    })

    const storageStack = new StorageNestedStack(
      this,
      'StorageNestedStack',
      {
        pipelineArtifactStoreBucketName: 'iyiye-pipeline-articat-store',
        metaFilesBucketName: 'iyiye-meta-files',
        userFilesBucketName: 'iyiye-user-files'
      }
    )

    const cognitoStack = new CognitoNestedStack(this, 'CognitoNestedStack', {
      userPoolName: 'iyiye-up',
      userPoolClientName: 'iyiye-up-cl',
      defaultUserPoolGroupName: 'iyiye-default-ug',
      adminUserPoolGroupName: 'iyiye-admin-ug',
      identityPoolName: 'iyiye-ip',
      userFilesBucketArn: storageStack.userFilesBucket.bucketArn
    })

    // TODO: Add Oauth Token Secret ARN
    const pipelineStack = new PipelineNestedStack(this, 'PipelineNestedStack', {
      getCognitoUserFunctionName: `iyiye-${process.env.ENVIRONMENT}-get-cognito-user`,
      cognitoUserPoolId: cognitoStack.userPool.userPoolId,
      getCognitoUserFunctionRepoOwnerName: 'gimmickless',
      getCognitoUserFunctionRepoName: 'get-cognito-user-function',
      githubOauthTokenSecretArn: githubOauthTokenSecret.secretArn,
      artifactStoreBucketName:
        storageStack.pipelineArtifactStoreBucket.bucketName
    })

    

    const appsyncStack = new AppsyncNestedStack(this, 'AppsyncNestedStack', {
      appsyncApiName: 'iyiye-prod-appsync-api',
      cognitoUserPoolId: cognitoStack.userPool.userPoolId,
      getCognitoUserFunctionArn: `arn:aws:lambda:${this.region}:${this.account}:function:iyiye-${process.env.ENVIRONMENT}-get-cognito-user`
    })
  }
}
