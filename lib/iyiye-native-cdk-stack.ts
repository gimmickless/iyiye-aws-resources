import { Construct, Stack, StackProps } from '@aws-cdk/core'
import { AppsyncNestedStack } from './nestedStack/appsync'
import { CognitoNestedStack } from './nestedStack/cognito'
import { DataNestedStack } from './nestedStack/data'
import { IamNestedStack } from './nestedStack/iam'
import { PipelineNestedStack } from './nestedStack/pipeline'
import { StorageNestedStack } from './nestedStack/storage'

export class CognitoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // Nested stacks
    const iamStack = new IamNestedStack(scope, 'IyiyeIamNestedStack', {
      parameters: {}
    })

    const dataStack = new DataNestedStack(scope, 'IyiyeDataNestedStack', {
      parameters: {}
    })

    const storageStack = new StorageNestedStack(
      scope,
      'IyiyeStorageNestedStack',
      {
        parameters: {
          userFielsBucketName: 'iyiye-up'
        }
      }
    )

    const pipelineStack = new PipelineNestedStack(
      scope,
      'IyiyePipelineNestedStack',
      {
        parameters: {}
      }
    )

    const cognitoStack = new CognitoNestedStack(
      scope,
      'IyiyeCognitoNestedStack',
      {
        parameters: {
          userPoolName: 'iyiye-up',
          userPoolClientName: 'iyiye-up-cl',
          defaultUserPoolGroupName: 'iyiye-default-ug',
          adminUserPoolGroupName: 'iyiye-admin-ug'
        }
      }
    )

    const appsyncStack = new AppsyncNestedStack(
      scope,
      'IyiyeAppsyncNestedStack',
      {
        parameters: {}
      }
    )
  }
}
