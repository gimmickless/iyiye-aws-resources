import {
  Construct,
  CfnOutput,
  NestedStack,
  NestedStackProps
} from '@aws-cdk/core'

export class CognitoNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props?: NestedStackProps) {
    super(scope, id, props)

    // TODO: Create buckets

    //TODO: Add Outputs
    new CfnOutput(this, 'IyiyeStorageUserFilesBucketArn', {
      value: ''
    })
  }
}
