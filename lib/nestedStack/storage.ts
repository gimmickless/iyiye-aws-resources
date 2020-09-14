import {
  Construct,
  CfnOutput,
  NestedStack,
  NestedStackProps
} from '@aws-cdk/core'

interface StorageNestedStackProps extends NestedStackProps {
  userFielsBucketName: string
}

export class StorageNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props?: StorageNestedStackProps) {
    super(scope, id, props)

    // TODO: Create buckets

    //TODO: Add Outputs
    new CfnOutput(this, 'IyiyeStorageUserFilesBucketArn', {
      value: ''
    })
  }
}
