import { Bucket, HttpMethods } from '@aws-cdk/aws-s3'
import {
  Construct,
  NestedStack,
  NestedStackProps
} from '@aws-cdk/core'

interface StorageNestedStackProps extends NestedStackProps {
  userFilesBucketName: string
  metaFilesBucketName: string
}

export class StorageNestedStack extends NestedStack {
  // Properties
  metaFilesBucket: Bucket
  userFilesBucket: Bucket

  // Constructor
  constructor(scope: Construct, id: string, props?: StorageNestedStackProps) {
    super(scope, id, props)

    //
    this.metaFilesBucket = new Bucket(this, 'IyiyeMetaFilesBucket', {
      bucketName: props?.metaFilesBucketName,
      publicReadAccess: true,
      cors: [
        {
          allowedOrigins: ['*'],
          allowedMethods: [HttpMethods.GET]
        }
      ]
    })

    this.userFilesBucket = new Bucket(this, 'IyiyeUserFilesBucket', {
      bucketName: props?.userFilesBucketName,
      cors: [
        {
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          allowedMethods: [
            HttpMethods.HEAD,
            HttpMethods.GET,
            HttpMethods.POST,
            HttpMethods.PUT,
            HttpMethods.DELETE
          ],
          maxAge: 3000,
          exposedHeaders: [
            'x-amz-server-side-encryption',
            'x-amz-request-id',
            'x-amz-id-2',
            'ETag'
          ]
        }
      ]
    })
  }
}
