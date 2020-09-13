import {
  Construct,
  CfnOutput,
  NestedStack,
  NestedStackProps
} from '@aws-cdk/core'

export class PipelineNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props?: NestedStackProps) {
    super(scope, id, props)

    // TODO: Create pipelines

    //TODO: Add Outputs
    new CfnOutput(this, '', {
      value: ''
    })
  }
}
