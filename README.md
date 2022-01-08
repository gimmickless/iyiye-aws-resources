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

## Prerequisities

### Create GitHub Secrets Manager outside CDK

By design, CDK [does not support](https://github.com/aws/aws-cdk/issues/5810#issuecomment-672736662) creating secrets with a certain value. Thus, adding a GitHub Oauth Token as a secret in CDK is not possible.

To create it

1. In AWS CLI, run the follows (only change `{the_token_goes_here}`, as the other fields are used with their values in the code )

   ```
   aws secretsmanager create-secret --name iyiye/GithubOauthTokenSecret \
   --description "GitHub Oauth Token for iyiye repos" \
   --secret-string {"token":"{the_token_goes_here}"}
   ```

2. Add/update the `GITHUB_TOKEN_SECRET_ID` value in `.env` file.

### Local Development

TBD

## Database behind AppSync: DynamoDB vs Aurora

I chose DynamoDB since:

- It is easy with the VTLs

However, DynamoDb sucks in the following ways:

- No support for unique indexes.

## MySQL Database Queries

Show schemas and tables:

```sql
SHOW SCHEMAS; -- synonym: SHOW DATABASES;
SHOW TABLES FROM notif;
SHOW TABLES FROM portf;
SHOW TABLES FROM uintr;
SHOW TABLES FROM whs;
SHOW TABLES FROM order;
SHOW TABLES FROM deliv;
```

Show table contents:

```sql
SELECT * FROM notif.in_app_notification;
SELECT * From portf.kit_category;
SELECT * From portf.kit;
```

## Apology

### Database per Service

Although the basic way is to separate databases, having one instance and sparing **distinct schemas** to services (AppSync models here) is also [an option](https://microservices.io/patterns/data/database-per-service.html). However, as MySQL [does not support](https://stackoverflow.com/a/11618350/4636715) classical way of schemas, we create databases as Chris Richardson primarily proposes.

Although one service may address more than one function (or none), we considered domains as follows and created databases for each. See the [DDL](bootstrap/prod-iyiye-rds-cluster.ddl.sql). DynamoDB tables are out of scope.

## See Also

- [List of Foods](https://en.wikipedia.org/wiki/Lists_of_foods)

- [Choosing a good DynamoDB primary key](https://aws.amazon.com/premiumsupport/knowledge-center/primary-key-dynamodb-table/)

- [AWS CDK V2 API Reference](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-construct-library.html)

- [AWS OpenSearch - Load Streaming Data from DynamoDB](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/integrations.html#integrations-dynamodb)
