import { Construct } from 'constructs'
import { NestedStack, NestedStackProps, aws_cognito as cognito, aws_iam as iam } from 'aws-cdk-lib'
import { awsCognitoCustomAttributeMaxLength } from '../constants'

interface CognitoNestedStackProps extends NestedStackProps {
  userPoolName: string
  userPoolClientName: string
  userPoolNativeClientName: string
  defaultUserPoolGroupName: string
  adminUserPoolGroupName: string
  identityPoolName: string
  userFilesBucketArn: string
}

export class CognitoNestedStack extends NestedStack {
  // Properties
  readonly userPool: cognito.UserPool

  // Constructor
  constructor(scope: Construct, id: string, props: CognitoNestedStackProps) {
    super(scope, id, props)

    // User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: props.userPoolName,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      autoVerify: {
        email: true
      },
      mfa: cognito.Mfa.OFF,
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireSymbols: true,
        requireUppercase: true
      },
      selfSignUpEnabled: true,
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
        theme: new cognito.StringAttribute({ mutable: true, maxLen: 8 }),
        bio: new cognito.StringAttribute({ mutable: true }),
        contactable: new cognito.StringAttribute({ mutable: true, maxLen: 5 }), // BooleanAttribute is not supported with Amplify
        identityId: new cognito.StringAttribute({ mutable: true }),
        address1: new cognito.StringAttribute({
          mutable: true,
          maxLen: awsCognitoCustomAttributeMaxLength
        }),
        address2: new cognito.StringAttribute({
          mutable: true,
          maxLen: awsCognitoCustomAttributeMaxLength
        }),
        address3: new cognito.StringAttribute({
          mutable: true,
          maxLen: awsCognitoCustomAttributeMaxLength
        }),
        address4: new cognito.StringAttribute({
          mutable: true,
          maxLen: awsCognitoCustomAttributeMaxLength
        }),
        address5: new cognito.StringAttribute({
          mutable: true,
          maxLen: awsCognitoCustomAttributeMaxLength
        })
      }
    })

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPoolClientName: props.userPoolClientName,
      generateSecret: false,
      userPool: this.userPool
    })

    const userPoolNativeClient = new cognito.UserPoolClient(this, 'UserPoolNativeClient', {
      userPoolClientName: props.userPoolNativeClientName,
      generateSecret: true,
      userPool: this.userPool
    })

    // User Groups
    const defaultUserGroupRole = new iam.Role(this, 'DefaultUserGroupRole', {
      assumedBy: new iam.WebIdentityPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': this.userPool.userPoolId
        }
      }),
      managedPolicies: [
        iam.ManagedPolicy.fromManagedPolicyArn(
          this,
          'DefaultUserGroupRoleAppSyncPolicy',
          'arn:aws:iam::aws:policy/AWSAppSyncInvokeFullAccess'
        )
      ]
    })

    const adminUserGroupRole = new iam.Role(this, 'AdminUserGroupRole', {
      assumedBy: new iam.WebIdentityPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': this.userPool.userPoolId
        }
      }),
      managedPolicies: [
        iam.ManagedPolicy.fromManagedPolicyArn(
          this,
          'AdminUserGroupRoleAppSyncPolicy',
          'arn:aws:iam::aws:policy/AWSAppSyncInvokeFullAccess'
        )
      ]
    })

    new cognito.CfnUserPoolGroup(this, 'DefaultUserGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: props.defaultUserPoolGroupName,
      roleArn: defaultUserGroupRole.roleArn
    })

    new cognito.CfnUserPoolGroup(this, 'AdminUserGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: props.adminUserPoolGroupName,
      roleArn: adminUserGroupRole.roleArn
    })

    // Identity Pools
    const identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: props.identityPoolName,
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName
        },
        {
          clientId: userPoolNativeClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName
        }
      ]
    })

    const unauthIdentityPoolRole = new iam.Role(this, 'UnauthIdentityPoolRole', {
      assumedBy: new iam.WebIdentityPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': identityPool.ref
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'unauthenticated'
        }
      }),
      inlinePolicies: {
        iyiyeUnauthIdentityPoolRolePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetObject'],
              resources: [`${props.userFilesBucketArn}/protected/*`]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:PutObject'],
              resources: [`${props.userFilesBucketArn}/uploads/*`]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:ListBucket'],
              resources: [`${props.userFilesBucketArn}`],
              conditions: {
                StringLike: {
                  's3:prefix': ['public/', 'public/*', 'protected/', 'protected/*']
                }
              }
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
              resources: [`${props.userFilesBucketArn}/public/*`]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['appsync:GraphQL'],
              resources: [`arn:aws:appsync:${this.region}:*:apis/*`]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.DENY,
              actions: ['appsync:GraphQL'],
              resources: [`arn:aws:appsync:${this.region}:*:apis/*/types/Mutation/*`]
            })
          ]
        })
      }
    })

    const authIdentityPoolRole = new iam.Role(this, 'AuthIdentityPoolRole', {
      assumedBy: new iam.WebIdentityPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': identityPool.ref
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'authenticated'
        }
      }),
      inlinePolicies: {
        iyiyeAuthIdentityPoolRolePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['lambda:InvokeFunction'],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetObject'],
              resources: [`${props.userFilesBucketArn}/protected/*`]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:PutObject'],
              resources: [`${props.userFilesBucketArn}/uploads/*`, `${props.userFilesBucketArn}/protected/*`]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
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
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
              resources: [
                `${props.userFilesBucketArn}/public/*`,
                props.userFilesBucketArn + '/protected/${cognito-identity.amazonaws.com:sub}/*',
                props.userFilesBucketArn + '/private/${cognito-identity.amazonaws.com:sub}/*'
              ]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['appsync:GraphQL'],
              resources: [`arn:aws:appsync:${this.region}:*:apis/*`]
            })
          ]
        })
      }
    })

    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        unauthenticated: unauthIdentityPoolRole.roleArn,
        authenticated: authIdentityPoolRole.roleArn
      }
    })
  }
}
