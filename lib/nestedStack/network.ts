import { Vpc, SubnetType, SecurityGroup } from '@aws-cdk/aws-ec2'
import { Construct, NestedStack, NestedStackProps } from '@aws-cdk/core'

interface NetworkNestedStackProps extends NestedStackProps {}

export class NetworkNestedStack extends NestedStack {
  // Properties
  readonly vpc: Vpc
  readonly rdsSecurityGroup: SecurityGroup

  // Constructor
  constructor(scope: Construct, id: string, props: NetworkNestedStackProps) {
    super(scope, id, props)

    this.vpc = new Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ingress',
          subnetType: SubnetType.PUBLIC
        },
        // {
        //   cidrMask: 24,
        //   name: 'application',
        //   subnetType: SubnetType.PRIVATE
        // },
        {
          cidrMask: 28,
          name: 'rds',
          subnetType: SubnetType.ISOLATED
        }
      ]
    })

    this.rdsSecurityGroup = new SecurityGroup(this, 'RdsSecurityGroup', {
      vpc: this.vpc,
      allowAllOutbound: true
    })
  }
}
