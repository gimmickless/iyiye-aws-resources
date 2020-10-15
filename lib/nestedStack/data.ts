import { Table as DynamoDbTable, AttributeType } from '@aws-cdk/aws-dynamodb'
import {
  DatabaseCluster as RdsDatabaseCluster,
  DatabaseClusterEngine as RdsDatabaseClusterEngine,
  AuroraEngineVersion
} from '@aws-cdk/aws-rds'
import {
  Construct,
  NestedStack,
  NestedStackProps,
  Tags
} from '@aws-cdk/core'

interface DataNestedStackProps extends NestedStackProps {
  auroraMajorVersion: string,
  auroraFullVersion: string,
  shoppingCartTable: string
}

export class DataNestedStack extends NestedStack {
  // Properties
  // productTable: DynamoDbTable
  shoppingCartTable: DynamoDbTable
  databaseCluster: RdsDatabaseCluster

  constructor(scope: Construct, id: string, props: DataNestedStackProps) {
    super(scope, id, props)

    const databaseCluster = new RdsDatabaseCluster(this, 'RdsDatabase', {
      engine: RdsDatabaseClusterEngine.aurora({
        version: {
          auroraMajorVersion: props.auroraMajorVersion,
          auroraFullVersion: props.auroraFullVersion
        }
      }),
      instanceProps: {},
      clusterIdentifier: "",
      defaultDatabaseName: "",
      deletionProtection: false
    })

    // Products (DynamoDB)
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
