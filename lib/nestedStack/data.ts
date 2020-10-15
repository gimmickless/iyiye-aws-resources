import { Table as DynamoDbTable, AttributeType } from '@aws-cdk/aws-dynamodb'
import {
  CfnDBCluster as RdsCfnDBCluster
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
  databaseCluster: RdsCfnDBCluster

  constructor(scope: Construct, id: string, props: DataNestedStackProps) {
    super(scope, id, props)

    this.databaseCluster = new RdsCfnDBCluster(this, 'RdsDatabase', {
      engine: 'aurora',
      engineMode: 'serverless',
      engineVersion: props.auroraFullVersion,
      dbClusterIdentifier: '',
      databaseName: '',
      deletionProtection: false,
      enableHttpEndpoint: true,
      backupRetentionPeriod: 7,
      scalingConfiguration: {
        autoPause: true,
        minCapacity: 1,
        maxCapacity: 2,
        secondsUntilAutoPause: 300
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
