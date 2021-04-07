import { Table as DynamoDbTable, AttributeType } from '@aws-cdk/aws-dynamodb'
import { IVpc, SecurityGroup, SubnetType } from '@aws-cdk/aws-ec2'
import {
  ServerlessCluster as RdsDBCluster,
  Credentials,
  DatabaseSecret,
  DatabaseClusterEngine,
  AuroraEngineVersion
} from '@aws-cdk/aws-rds'
import {
  Construct,
  Duration,
  NestedStack,
  NestedStackProps,
  Tags
} from '@aws-cdk/core'

interface DataNestedStackProps extends NestedStackProps {
  rdsVpc: IVpc
  rdsVpcSecurityGroups: Array<SecurityGroup>
  rdsDbClusterIdentifier: string
  categoryTableName: string
}

export class DataNestedStack extends NestedStack {
  // Properties
  readonly kitCategoryTable: DynamoDbTable
  readonly dbSecret: DatabaseSecret
  readonly shoppingCartTable: DynamoDbTable
  readonly databaseCluster: RdsDBCluster

  constructor(scope: Construct, id: string, props: DataNestedStackProps) {
    super(scope, id, props)

    // DynamoDB
    this.kitCategoryTable = new DynamoDbTable(this, 'KitCategoryTable', {
      tableName: props.categoryTableName,
      partitionKey: { name: 'name', type: AttributeType.STRING },
      readCapacity: 1,
      writeCapacity: 1
    })
    Tags.of(this.kitCategoryTable).add('name', props.categoryTableName)
    Tags.of(this.kitCategoryTable).add(
      'environment',
      process.env.ENVIRONMENT ?? ''
    )

    // RDS
    this.dbSecret = new DatabaseSecret(this, 'AuroraSecret', {
      username: 'root'
    })

    this.databaseCluster = new RdsDBCluster(this, 'RdsDatabase', {
      engine: DatabaseClusterEngine.aurora({
        version: AuroraEngineVersion.VER_10A
      }),
      vpc: props.rdsVpc,
      clusterIdentifier: props.rdsDbClusterIdentifier,
      deletionProtection: false,
      enableDataApi: true,
      backupRetention: Duration.days(7),
      credentials: Credentials.fromSecret(this.dbSecret),
      securityGroups: props.rdsVpcSecurityGroups,
      vpcSubnets: props.rdsVpc.selectSubnets({
        subnetType: SubnetType.PRIVATE
      }),
      scaling: {
        autoPause: Duration.minutes(5),
        minCapacity: 1,
        maxCapacity: 2
      }
    })
  }
}
