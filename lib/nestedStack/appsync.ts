import {
  Construct,
  NestedStack,
  NestedStackProps
} from '@aws-cdk/core'

export class AppsyncNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props?: NestedStackProps) {
    super(scope, id, props)

    // TODO: Create Appsync schemas
  }
}
