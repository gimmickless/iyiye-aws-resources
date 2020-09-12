import { NestedStack, NestedStackProps } from '@aws-cdk/aws-cloudformation'
import { Mfa, UserPool } from '@aws-cdk/aws-cognito'
import {Construct } from '@aws-cdk/core'

export class CognitoNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props?: NestedStackProps) {
    super(scope, id, props)

    // The code that defines your stack goes here
    new UserPool(this, 'IyiyeUserPool', {
      userPoolName: props?.parameters?.userPoolName,
      mfa: Mfa.OFF,
      autoVerify: {
        email: true
      }
    })
  }
}
