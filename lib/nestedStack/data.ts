import { Construct } from 'constructs'
import {
  NestedStack,
  NestedStackProps,
  Duration,
  Tags,
  aws_ec2 as ec2,
  aws_dynamodb as dynamodb,
  aws_opensearchservice as opensearch,
  aws_rds as rds
} from 'aws-cdk-lib'
import { openSearchDataNodeInstanceType } from '../constants'

interface DataNestedStackProps extends NestedStackProps {
  kitCategoryTableName: string
  kitTableName: string
  searchDomainName: string
  searchVpc: ec2.IVpc
  rdsVpc: ec2.IVpc
  rdsVpcSecurityGroups: Array<ec2.SecurityGroup>
  rdsDbClusterIdentifier: string
}

export class DataNestedStack extends NestedStack {
  // Properties
  readonly kitCategoryTable: dynamodb.Table
  readonly kitTable: dynamodb.Table
  readonly searchDomain: opensearch.Domain
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
      writeCapacity: 1,
      stream: dynamodb.StreamViewType.NEW_IMAGE
    })
    Tags.of(this.kitCategoryTable).add('name', props.kitCategoryTableName)
    Tags.of(this.kitCategoryTable).add('environment', process.env.ENVIRONMENT ?? '')

    // OpenSearch
    this.searchDomain = new opensearch.Domain(this, 'KitSearchDomain', {
      domainName: props.searchDomainName,
      version: opensearch.EngineVersion.OPENSEARCH_1_0,
      capacity: {
        dataNodes: 1,
        dataNodeInstanceType: openSearchDataNodeInstanceType
      },
      enableVersionUpgrade: true,
      vpc: props.searchVpc,
      vpcSubnets: [{
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      }]
    })


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
