import { Mfa, UserPool } from '@aws-cdk/aws-cognito'
import * as cdk from '@aws-cdk/core'
import * as config from '../config'

export class IyiyeNativeCdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // The code that defines your stack goes here
    new UserPool(this, 'IyiyeUserPool', {
      userPoolName: config.cognitoUserPoolName,
      mfa: Mfa.OFF,
      autoVerify: {
        email: true
      }
    })
  }
}
