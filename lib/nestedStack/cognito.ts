import { AccountRecovery, CfnIdentityPool, CfnUserPoolGroup, Mfa, UserPool, UserPoolClient } from '@aws-cdk/aws-cognito'
import { Effect, ManagedPolicy, PolicyDocument, PolicyStatement, Role, WebIdentityPrincipal } from '@aws-cdk/aws-iam'
import {
  Construct,
  CfnOutput,
  NestedStack,
  NestedStackProps
} from '@aws-cdk/core'

export class CognitoNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props?: NestedStackProps) {
    super(scope, id, props)

    // User Pool
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
        locale: { mutable: true }
      }
    })

    const userPoolClient = new UserPoolClient(this, 'IyiyeUserPoolClient', {
      userPoolClientName: props?.parameters?.userPoolClientName,
      generateSecret: false,
      userPool: userPool
    })

    // User Groups
    const defaultUserGroupRole = new Role(this, 'IyiyeDefaultUserGroupRole', {
      assumedBy: new WebIdentityPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': userPool.userPoolId
        }
      }),
      managedPolicies: [
        ManagedPolicy.fromManagedPolicyArn(
          this,
          'IyiyeDefaultUserGroupRoleAppSyncPolicy',
          'arn:aws:iam::aws:policy/AWSAppSyncInvokeFullAccess'
        )
      ]
    })

    const adminUserGroupRole = new Role(this, 'IyiyeAdminUserGroupRole', {
      assumedBy: new WebIdentityPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': userPool.userPoolId
        }
      }),
      managedPolicies: [
        ManagedPolicy.fromManagedPolicyArn(
          this,
          'IyiyeAdminUserGroupRoleAppSyncPolicy',
          'arn:aws:iam::aws:policy/AWSAppSyncInvokeFullAccess'
        )
      ]
    })

    const defaultUserGroup = new CfnUserPoolGroup(
      this,
      'IyiyeDefaultUserGroup',
      {
        userPoolId: userPool.userPoolId,
        groupName: props?.parameters?.defaultUserPoolGroupName,
        roleArn: defaultUserGroupRole.roleArn
      }
    )

    const adminUserGroup = new CfnUserPoolGroup(this, 'IyiyeAdminUserGroup', {
      userPoolId: userPool.userPoolId,
      groupName: props?.parameters?.adminUserPoolGroupName,
      roleArn: adminUserGroupRole.roleArn
    })

    // Identity Pools
    const identityPool = new CfnIdentityPool(this, 'IyiyeIdentityPool', {
      identityPoolName: props?.parameters?.identityPoolName,
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName
        }
      ]
    })

    //TODO: Create Storage Stack (to use )
    //TODO: Add/Complete CognitoAuthorizedRole, CognitoUnauthorizedRole, IdentityPoolRoleAttachment
    const unauthIdentityPoolRole = new Role(this, 'IyiyeAdminUserGroupRole', {
      assumedBy: new WebIdentityPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': userPool.userPoolId
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'unauthenticated'
        }
      }),
      inlinePolicies: {
        iyiyeUnauthIdentityPoolRolePolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3:GetObject'],
              resources: []
            })
          ]
        })
      }
    })

    //TODO: Add Outputs
    new CfnOutput(this, 'IyiyeCognitoNestedStackOutput', {
      value: ''
    })
  }
}
