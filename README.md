# iyiye-aws-resources

The infrastructure code for AWS resources

## CDK

The `cdk.json` file tells the CDK Toolkit how to execute your app.

### Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## Apology

### Aurora vs DynamoDb

#### Products

Especially for keeping the products data, initially I headed for DynamoDB as:

* The product data is not transaction-critical,

* Cloudformation DynamoDB creation is more straightforward (Aurora table creations require an extra function),

* It is easier to reuse AppSync resolver queries with DynamoDB

But as I started implementation, I noticed my data is pretty structured and I'll need filtering/sorting on many columns.
So, even if DyanmoDB is more fun for a hobby project, I converted my Product data to a AuroraDB (alongside with additional tables for Ingredients, Cousines, ProductIngredients, ProductCousines etc) since filtering and sorting requires a separate secondary index which costs RCU/WRUs.

#### Shopping Cart

It is DynamoDB.

#### CheckedOut Orders

It is Relational (Aurora).
