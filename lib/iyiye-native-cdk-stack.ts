import { Construct, Stack, StackProps } from '@aws-cdk/core'
import { CognitoNestedStack } from './nestedStack/cognito'

export class CognitoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // The code that defines your stack goes here
    new CognitoNestedStack(scope, 'IyiyeCognitoNestedStack', {
      parameters: {
        userPoolName: 'iyiye-up'
      }
    })
  }
}
