import { Construct, Stack, StackProps } from '@aws-cdk/core'
import { AppsyncNestedStack } from './nestedStack/appsync'
import { CognitoNestedStack } from './nestedStack/cognito'
import { DataNestedStack } from './nestedStack/data'
import { IamNestedStack } from './nestedStack/iam'
import { PipelineNestedStack } from './nestedStack/pipeline'
import { StorageNestedStack } from './nestedStack/storage'

export class IyiyeNativeCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // Nested stacks
    const iamStack = new IamNestedStack(this, 'IamNestedStack', {})

    const dataStack = new DataNestedStack(this, 'DataNestedStack', {})

    const storageStack = new StorageNestedStack(
      this,
      'StorageNestedStack',
      {
        metaFilesBucketName: 'iyiye-meta-files',
        userFilesBucketName: 'iyiye-user-files'
      }
    )

    const pipelineStack = new PipelineNestedStack(
      this,
      'PipelineNestedStack',
      {}
    )

    const cognitoStack = new CognitoNestedStack(
      this,
      'CognitoNestedStack',
      {
        userPoolName: 'iyiye-up',
        userPoolClientName: 'iyiye-up-cl',
        defaultUserPoolGroupName: 'iyiye-default-ug',
        adminUserPoolGroupName: 'iyiye-admin-ug',
        identityPoolName: 'iyiye-ip',
        userFilesBucketArn: storageStack.userFilesBucket.bucketArn
      }
    )

    const appsyncStack = new AppsyncNestedStack(
      this,
      'AppsyncNestedStack',
      {}
    )
  }
}
