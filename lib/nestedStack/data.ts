import { Table as DynamoDbTable, AttributeType } from '@aws-cdk/aws-dynamodb'
import { IVpc, SecurityGroup, SelectedSubnets } from '@aws-cdk/aws-ec2'
import {
  ServerlessCluster as RdsDBCluster,
  Credentials,
  DatabaseSecret,
  DatabaseClusterEngine
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
  rdsSubnets: SelectedSubnets
  rdsVpcSecurityGroups: Array<SecurityGroup>
  rdsDbClusterIdentifier: string
  rdsDatabaseName: string
  shoppingCartTable: string
}

export class DataNestedStack extends NestedStack {
  // Properties
  // productTable: DynamoDbTable
  readonly dbSecret: DatabaseSecret
  readonly shoppingCartTable: DynamoDbTable
  readonly databaseCluster: RdsDBCluster

  constructor(scope: Construct, id: string, props: DataNestedStackProps) {
    super(scope, id, props)

    this.dbSecret = new DatabaseSecret(this, 'AuroraSecret', {
      username: 'root'
    })

    this.databaseCluster = new RdsDBCluster(this, 'RdsDatabase', {
      engine: DatabaseClusterEngine.AURORA,
      vpc: props.rdsVpc,
      clusterIdentifier: props.rdsDbClusterIdentifier,
      defaultDatabaseName: props.rdsDatabaseName,
      deletionProtection: false,
      enableDataApi: true,
      backupRetention: Duration.days(7),
      credentials: Credentials.fromSecret(this.dbSecret),
      securityGroups: props.rdsVpcSecurityGroups,
      vpcSubnets: props.rdsSubnets,
      scaling: {
        autoPause: Duration.minutes(5),
        minCapacity: 1,
        maxCapacity: 2
      }
    })

    // Shopping Cart (DynamoDB)
    this.shoppingCartTable = new DynamoDbTable(this, 'ShoppingCartTable', {
      tableName: props.shoppingCartTable,
      partitionKey: { name: 'id', type: AttributeType.STRING },
      readCapacity: 1,
      writeCapacity: 1
    })

    //TODO: Add Global Secondary Indexes to DynamoDB tables
    Tags.of(this.shoppingCartTable).add('name', props.shoppingCartTable)
    // this.shoppingCartTable.addGlobalSecondaryIndex({})
  }
}
