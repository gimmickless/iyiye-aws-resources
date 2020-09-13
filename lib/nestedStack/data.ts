import {
  Construct,
  CfnOutput,
  NestedStack,
  NestedStackProps
} from '@aws-cdk/core'

export class DataNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props?: NestedStackProps) {
    super(scope, id, props)

    // TODO: Create databases

    //TODO: Add Outputs
    new CfnOutput(this, '', {
      value: ''
    })
  }
}
