# iyiye-aws-resources

The infrastructure code for AWS resources

## CDK

The `cdk.json` file tells the CDK Toolkit how to execute your app.

### Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

## Apology

### Schema per Service

Although the basic way is to separate databases, having one instance and sparing **distinct schemas** to services (AppSync models here) is also [an option](https://microservices.io/patterns/data/database-per-service.html). However, as MySQL [does not support](https://stackoverflow.com/a/11618350/4636715) classical way of schemas, we create databases as Chris Richardson primarily proposes.
