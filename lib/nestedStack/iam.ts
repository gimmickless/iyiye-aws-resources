import {
  Construct,
  CfnOutput,
  NestedStack,
  NestedStackProps
} from '@aws-cdk/core'

export class IamNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props?: NestedStackProps) {
    super(scope, id, props)

    // TODO: Create roles

    //TODO: Add Outputs
    new CfnOutput(this, '', {
      value: ''
    })
  }
}
