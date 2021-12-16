import { Construct } from 'constructs'
import { NestedStack, NestedStackProps, aws_ec2 as ec2 } from 'aws-cdk-lib'

import { mySqlAccessorCidrIp, mySqlDefaultPort } from '../constants'

interface NetworkNestedStackProps extends NestedStackProps {}

export class NetworkNestedStack extends NestedStack {
  // Properties
  readonly vpc: ec2.Vpc
  readonly rdsSecurityGroup: ec2.SecurityGroup

  // Constructor
  constructor(scope: Construct, id: string, props: NetworkNestedStackProps) {
    super(scope, id, props)

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ingress',
          subnetType: ec2.SubnetType.PUBLIC
        },
        // {
        //   cidrMask: 24,
        //   name: 'application',
        //   subnetType: SubnetType.PRIVATE
        // },
        {
          cidrMask: 28,
          name: 'rds',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED
        }
      ]
    })

    this.rdsSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc: this.vpc,
      allowAllOutbound: true
    })

    this.rdsSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(mySqlAccessorCidrIp),
      ec2.Port.tcp(mySqlDefaultPort),
      'Redshift Ingress1'
    )
  }
}
