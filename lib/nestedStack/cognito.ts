import {
  AccountRecovery,
  BooleanAttribute,
  CfnIdentityPool,
  CfnIdentityPoolRoleAttachment,
  CfnUserPoolGroup,
  Mfa,
  StringAttribute,
  UserPool,
  UserPoolClient
} from '@aws-cdk/aws-cognito'
import {
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  WebIdentityPrincipal
} from '@aws-cdk/aws-iam'
import { Construct, NestedStack, NestedStackProps } from '@aws-cdk/core'
import { awsCognitoCustomAttributeMaxLength } from '../constants'

interface CognitoNestedStackProps extends NestedStackProps {
  userPoolName: string
  userPoolClientName: string
  defaultUserPoolGroupName: string
  adminUserPoolGroupName: string
  identityPoolName: string
  userFilesBucketArn: string
}

export class CognitoNestedStack extends NestedStack {
  // Properties
  readonly userPool: UserPool

  // Constructor
  constructor(scope: Construct, id: string, props: CognitoNestedStackProps) {
    super(scope, id, props)

    // User Pool
    this.userPool = new UserPool(this, 'UserPool', {
      userPoolName: props.userPoolName,
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
        fullname: { required: true },
        email: { required: true, mutable: false },
        address: { required: false },
        birthdate: { required: true, mutable: false },
        phoneNumber: { required: false },
        profilePicture: { required: false },
        locale: { required: false },
        lastUpdateTime: { required: false }
      },
      customAttributes: {
        theme: new StringAttribute({ mutable: true, maxLen: 8 }),
        bio: new StringAttribute({ mutable: true }),
        contactable: new BooleanAttribute({ mutable: true }),
        address1: new StringAttribute({
          mutable: true,
          maxLen: awsCognitoCustomAttributeMaxLength
        }),
        address2: new StringAttribute({
          mutable: true,
          maxLen: awsCognitoCustomAttributeMaxLength
        }),
        address3: new StringAttribute({
          mutable: true,
          maxLen: awsCognitoCustomAttributeMaxLength
        }),
        address4: new StringAttribute({
          mutable: true,
          maxLen: awsCognitoCustomAttributeMaxLength
        }),
        address5: new StringAttribute({
          mutable: true,
          maxLen: awsCognitoCustomAttributeMaxLength
        })
      }
    })

    const userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
      userPoolClientName: props.userPoolClientName,
      generateSecret: false,
      userPool: this.userPool
    })

    // User Groups
    const defaultUserGroupRole = new Role(this, 'DefaultUserGroupRole', {
      assumedBy: new WebIdentityPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': this.userPool.userPoolId
        }
      }),
      managedPolicies: [
        ManagedPolicy.fromManagedPolicyArn(
          this,
          'DefaultUserGroupRoleAppSyncPolicy',
          'arn:aws:iam::aws:policy/AWSAppSyncInvokeFullAccess'
        )
      ]
    })

    const adminUserGroupRole = new Role(this, 'AdminUserGroupRole', {
      assumedBy: new WebIdentityPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': this.userPool.userPoolId
        }
      }),
      managedPolicies: [
        ManagedPolicy.fromManagedPolicyArn(
          this,
          'AdminUserGroupRoleAppSyncPolicy',
          'arn:aws:iam::aws:policy/AWSAppSyncInvokeFullAccess'
        )
      ]
    })

    new CfnUserPoolGroup(this, 'DefaultUserGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: props.defaultUserPoolGroupName,
      roleArn: defaultUserGroupRole.roleArn
    })

    new CfnUserPoolGroup(this, 'AdminUserGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: props.adminUserPoolGroupName,
      roleArn: adminUserGroupRole.roleArn
    })

    // Identity Pools
    const identityPool = new CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: props.identityPoolName,
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName
        }
      ]
    })

    //TODO: Add/Complete CognitoAuthorizedRole, CognitoUnauthorizedRole, IdentityPoolRoleAttachment
    const unauthIdentityPoolRole = new Role(this, 'UnauthIdentityPoolRole', {
      assumedBy: new WebIdentityPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': identityPool.ref
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
              resources: [`${props.userFilesBucketArn}/protected/*`]
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3:PutObject'],
              resources: [`${props.userFilesBucketArn}/uploads/*`]
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3:ListBucket'],
              resources: [`${props.userFilesBucketArn}`],
              conditions: {
                StringLike: {
                  's3:prefix': [
                    'public/',
                    'public/*',
                    'protected/',
                    'protected/*'
                  ]
                }
              }
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
              resources: [`${props.userFilesBucketArn}/public/*`]
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['appsync:GraphQL'],
              resources: [`arn:aws:appsync:${this.region}:*:apis/*`]
            }),
            new PolicyStatement({
              effect: Effect.DENY,
              actions: ['appsync:GraphQL'],
              resources: [
                `arn:aws:appsync:${this.region}:*:apis/*/types/Mutation/*`
              ]
            })
          ]
        })
      }
    })

    const authIdentityPoolRole = new Role(this, 'AuthIdentityPoolRole', {
      assumedBy: new WebIdentityPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': identityPool.ref
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'authenticated'
        }
      }),
      inlinePolicies: {
        iyiyeUnauthIdentityPoolRolePolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['lambda:InvokeFunction'],
              resources: ['*']
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3:GetObject'],
              resources: [`${props.userFilesBucketArn}/protected/*`]
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3:PutObject'],
              resources: [`${props.userFilesBucketArn}/uploads/*`]
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3:ListBucket'],
              resources: [`${props.userFilesBucketArn}`],
              conditions: {
                StringLike: {
                  's3:prefix': [
                    'public/',
                    'public/*',
                    'protected/',
                    'protected/*',
                    'private/${cognito-identity.amazonaws.com:sub}/',
                    'private/${cognito-identity.amazonaws.com:sub}/*'
                  ]
                }
              }
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
              resources: [
                `${props.userFilesBucketArn}/public/*`,
                props.userFilesBucketArn +
                  '/protected/${cognito-identity.amazonaws.com:sub}/*',
                props.userFilesBucketArn +
                  '/private/${cognito-identity.amazonaws.com:sub}/*'
              ]
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['appsync:GraphQL'],
              resources: [`arn:aws:appsync:${this.region}:*:apis/*`]
            })
          ]
        })
      }
    })

    new CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        unauthenticated: unauthIdentityPoolRole.roleArn,
        authenticated: authIdentityPoolRole.roleArn
      }
    })
  }
}
