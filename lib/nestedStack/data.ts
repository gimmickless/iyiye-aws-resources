import { Construct } from 'constructs'
import {
  NestedStack,
  NestedStackProps,
  Duration,
  Tags,
  aws_ec2 as ec2,
  aws_dynamodb as dynamodb,
  aws_rds as rds
} from 'aws-cdk-lib'

interface DataNestedStackProps extends NestedStackProps {
  kitCategoryTableName: string
  kitTableName: string
  rdsVpc: ec2.IVpc
  rdsVpcSecurityGroups: Array<ec2.SecurityGroup>
  rdsDbClusterIdentifier: string
}

export class DataNestedStack extends NestedStack {
  // Properties
  readonly kitCategoryTable: dynamodb.Table
  readonly kitTable: dynamodb.Table
  readonly dbSecret: rds.DatabaseSecret
  readonly shoppingCartTable: dynamodb.Table
  readonly databaseCluster: rds.ServerlessCluster

  constructor(scope: Construct, id: string, props: DataNestedStackProps) {
    super(scope, id, props)

    // DynamoDB
    this.kitCategoryTable = new dynamodb.Table(this, 'KitCategoryTable', {
      tableName: props.kitCategoryTableName,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      readCapacity: 1,
      writeCapacity: 1
    })
    Tags.of(this.kitCategoryTable).add('name', props.kitCategoryTableName)
    Tags.of(this.kitCategoryTable).add('environment', process.env.ENVIRONMENT ?? '')

    this.kitTable = new dynamodb.Table(this, 'KitTable', {
      tableName: props.kitTableName,
      partitionKey: { name: 'name', type: dynamodb.AttributeType.STRING },
      readCapacity: 1,
      writeCapacity: 1
    })
    Tags.of(this.kitCategoryTable).add('name', props.kitCategoryTableName)
    Tags.of(this.kitCategoryTable).add('environment', process.env.ENVIRONMENT ?? '')

    // RDS
    this.dbSecret = new rds.DatabaseSecret(this, 'AuroraRdsSecret', {
      username: 'root',
      secretName: `${process.env.APPLICATION}/AuroraRdsSecret`
    })

    this.databaseCluster = new rds.ServerlessCluster(this, 'RdsDatabase', {
      engine: rds.DatabaseClusterEngine.aurora({
        version: rds.AuroraEngineVersion.VER_10A
      }),
      vpc: props.rdsVpc,
      clusterIdentifier: props.rdsDbClusterIdentifier,
      deletionProtection: false,
      enableDataApi: true,
      backupRetention: Duration.days(7),
      credentials: rds.Credentials.fromSecret(this.dbSecret),
      securityGroups: props.rdsVpcSecurityGroups,
      vpcSubnets: props.rdsVpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      }),
      scaling: {
        autoPause: Duration.minutes(5),
        minCapacity: 1,
        maxCapacity: 2
      }
    })
  }
}
