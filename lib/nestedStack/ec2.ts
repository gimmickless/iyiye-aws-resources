import { Vpc, SubnetType, SecurityGroup } from '@aws-cdk/aws-ec2'
import {
  Construct,
  NestedStack,
  NestedStackProps
} from '@aws-cdk/core'

interface Ec2NestedStackProps extends NestedStackProps {
  
}

export class Ec2NestedStack extends NestedStack {
  // Properties
  vpc: Vpc
  rdsSecurityGroup: SecurityGroup

  // Constructor
  constructor(scope: Construct, id: string, props: Ec2NestedStackProps) {
    super(scope, id, props)

    //

    this.vpc = new Vpc(this, 'Vpc', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ingress',
          subnetType: SubnetType.PUBLIC
        },
        {
          cidrMask: 24,
          name: 'application',
          subnetType: SubnetType.PRIVATE
        },
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
