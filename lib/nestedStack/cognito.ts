import { NestedStack, NestedStackProps } from '@aws-cdk/aws-cloudformation'
import { AccountRecovery, Mfa, UserPool } from '@aws-cdk/aws-cognito'
import {Construct } from '@aws-cdk/core'

export class CognitoNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props?: NestedStackProps) {
    super(scope, id, props)

    // The code that defines your stack goes here
    const userPool = new UserPool(this, 'IyiyeUserPool', {
      userPoolName: props?.parameters?.userPoolName,
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      autoVerify: {
        email: true
      },
      mfa: Mfa.OFF,
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireSymbols: true,
        requireUppercase: true
      },
      signInAliases: {
        email: true,
        username: true
      },
      standardAttributes: {
        address: { required: true, mutable: true },
        birthdate: { required: true },
        email: { required: true },
        givenName: { required: true },
        familyName: { required: true },
        locale: {mutable: true}
      }
    })

    userPool.addClient('IyiyeUserPoolClient', {
      userPoolClientName: props?.parameters?.userPoolClientName,
      generateSecret: false
    })
  }
}
