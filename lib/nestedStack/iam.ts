import { Role } from '@aws-cdk/aws-iam'
import {
  Construct,
  NestedStack,
  NestedStackProps
} from '@aws-cdk/core'

interface IamNestedStackProps extends NestedStackProps {
  // userPoolName: string
  // userPoolClientName: string
  // defaultUserPoolGroupName: string
  // adminUserPoolGroupName: string
  // identityPoolName: string
}

export class IamNestedStack extends NestedStack {
  // Properties
  lambdaManagerCloudFormationRole: Role
  codeBuildRole: Role
  codePipelineRole: Role
  appSyncLogRole: Role
  appSyncResourceDynamoDbRole: Role
  appSyncResourceRdsRole: Role
  appSyncResourceLambdaRole: Role

  // Constructor
  constructor(scope: Construct, id: string, props?: IamNestedStackProps) {
    super(scope, id, props)

    // TODO: Create roles
  }
}
