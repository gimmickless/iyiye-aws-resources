import { Construct } from 'constructs'
import { NestedStack, NestedStackProps, RemovalPolicy, aws_s3 as s3 } from 'aws-cdk-lib'

interface StorageNestedStackProps extends NestedStackProps {
  userFilesBucketName: string
  metaFilesBucketName: string
}

export class StorageNestedStack extends NestedStack {
  // Properties
  readonly metaFilesBucket: s3.Bucket
  readonly userFilesBucket: s3.Bucket

  // Constructor
  constructor(scope: Construct, id: string, props: StorageNestedStackProps) {
    super(scope, id, props)

    //

    this.metaFilesBucket = new s3.Bucket(this, 'MetaFilesBucket', {
      bucketName: props.metaFilesBucketName,
      publicReadAccess: true,
      removalPolicy: RemovalPolicy.RETAIN,
      cors: [
        {
          allowedOrigins: ['*'],
          allowedMethods: [s3.HttpMethods.GET]
        }
      ]
    })

    this.userFilesBucket = new s3.Bucket(this, 'UserFilesBucket', {
      bucketName: props.userFilesBucketName,
      removalPolicy: RemovalPolicy.RETAIN,
      versioned: true,
      cors: [
        {
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          allowedMethods: [
            s3.HttpMethods.HEAD,
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
            s3.HttpMethods.DELETE
          ],
          maxAge: 3000,
          exposedHeaders: ['x-amz-server-side-encryption', 'x-amz-request-id', 'x-amz-id-2', 'ETag']
        }
      ]
    })
  }
}
