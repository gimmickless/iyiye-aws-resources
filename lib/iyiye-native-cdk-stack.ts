import { Construct, Stack, StackProps } from '@aws-cdk/core'
import { CognitoNestedStack } from './nestedStack/cognito'

export class CognitoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // The code that defines your stack goes here
    const storageStack = new CognitoNestedStack(
      scope,
      'IyiyeStorageNestedStack',
      {
        parameters: {
          userFielsBucketName: 'iyiye-up'
        }
      }
    )
    const cognitoStack = new CognitoNestedStack(scope, 'IyiyeCognitoNestedStack', {
      parameters: {
        userPoolName: 'iyiye-up',
        userPoolClientName: 'iyiye-up-cl',
        defaultUserPoolGroupName: 'iyiye-default-ug',
        adminUserPoolGroupName: 'iyiye-admin-ug'
      }
    })
  }
}
