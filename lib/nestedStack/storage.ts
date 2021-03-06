import { Bucket, HttpMethods } from '@aws-cdk/aws-s3'
import {
  Construct,
  NestedStack,
  NestedStackProps,
  RemovalPolicy
} from '@aws-cdk/core'

interface StorageNestedStackProps extends NestedStackProps {
  userFilesBucketName: string
  metaFilesBucketName: string
}

export class StorageNestedStack extends NestedStack {
  // Properties
  readonly metaFilesBucket: Bucket
  readonly userFilesBucket: Bucket

  // Constructor
  constructor(scope: Construct, id: string, props: StorageNestedStackProps) {
    super(scope, id, props)

    //

    this.metaFilesBucket = new Bucket(this, 'MetaFilesBucket', {
      bucketName: props.metaFilesBucketName,
      publicReadAccess: true,
      removalPolicy: RemovalPolicy.RETAIN,
      cors: [
        {
          allowedOrigins: ['*'],
          allowedMethods: [HttpMethods.GET]
        }
      ]
    })

    this.userFilesBucket = new Bucket(this, 'UserFilesBucket', {
      bucketName: props.userFilesBucketName,
      removalPolicy: RemovalPolicy.RETAIN,
      versioned: true,
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
