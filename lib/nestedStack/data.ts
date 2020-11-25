import { Table as DynamoDbTable, AttributeType } from '@aws-cdk/aws-dynamodb'
import {
  CfnDBCluster as RdsCfnDBCluster,
  CfnDBSubnetGroup,
  DatabaseSecret
} from '@aws-cdk/aws-rds'
import {
  Construct,
  NestedStack,
  NestedStackProps,
  Tags
} from '@aws-cdk/core'

interface DataNestedStackProps extends NestedStackProps {
  rdsSubnetIds: Array<string>
  rdsVpcSecurityGroupIds: Array<string>
  auroraMajorVersion?: string
  auroraFullVersion: string
  rdsDbClusterIdentifier: string
  rdsDatabaseName: string
  shoppingCartTable: string
}

export class DataNestedStack extends NestedStack {
  // Properties
  // productTable: DynamoDbTable
  readonly dbSecret: DatabaseSecret
  readonly shoppingCartTable: DynamoDbTable
  readonly databaseCluster: RdsCfnDBCluster

  constructor(scope: Construct, id: string, props: DataNestedStackProps) {
    super(scope, id, props)

    this.dbSecret = new DatabaseSecret(this, 'AuroraSecret', {
      username: 'root'
    })

    this.databaseCluster = new RdsCfnDBCluster(this, 'RdsDatabase', {
      dbClusterIdentifier: props.rdsDbClusterIdentifier,
      databaseName: props.rdsDatabaseName,
      engine: 'aurora',
      engineMode: 'serverless',
      engineVersion: props.auroraFullVersion,
      deletionProtection: false,
      enableHttpEndpoint: true,
      backupRetentionPeriod: 7,
      masterUsername: this.dbSecret.secretValueFromJson('username').toString(),
      masterUserPassword: this.dbSecret
        .secretValueFromJson('password')
        .toString(),
      vpcSecurityGroupIds: props.rdsVpcSecurityGroupIds,
      dbSubnetGroupName: new CfnDBSubnetGroup(this, 'RdsSubnetGroup', {
        dbSubnetGroupDescription: 'RdsSubnetGroup',
        subnetIds: props.rdsSubnetIds
      }).ref,
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
