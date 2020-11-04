import { join } from 'path'
import { Construct, NestedStack, NestedStackProps } from '@aws-cdk/core'
import {
  GraphqlApi,
  AuthorizationType,
  Schema,
  FieldLogLevel,
  MappingTemplate,
  CfnDataSource,
  CfnResolver
} from '@aws-cdk/aws-appsync'
import { UserPool } from '@aws-cdk/aws-cognito'
import { Function } from '@aws-cdk/aws-lambda'

interface AppsyncNestedStackProps extends NestedStackProps {
  appsyncApiName: string
  cognitoUserPoolId: string
  getCognitoUserFunctionArn: string
  rdsDbName: string
  rdsDbClusterArn: string
  rdsDbCredentialsSecretArn: string
  rdsDbIngredientTableName: string
  rdsDbKitTableName: string
  rdsDbKitIngredientTableName: string
}

const rdsListResponseMappingTemplate = `
#if($ctx.error)
  $utils.error($ctx.error.message, $ctx.error.type)
#end
$utils.toJson($utils.rds.toJsonObject($ctx.result)[0])
`

const rdsFirstSingleItemMappingTemplate = `
#if($ctx.error)
  $utils.error($ctx.error.message, $ctx.error.type)
#end
#set($output = $utils.rds.toJsonObject($ctx.result)[0])
#if ($output.isEmpty())
  null
#else 
  $utils.toJson($output[0])
#end
`

// const lambdaContextArgsRequestMappingTemplate = `
// {
//   "version" : "2018-05-29",
//   "operation": "Invoke",
//   "payload": $util.toJson($ctx.args)
// }
// `

const lambdaSourceAuthorUsernameAsUsernameRequestMappingTemplate = `
{
  "version" : "2018-05-29",
  "operation": "Invoke",
  "payload": {
    "username": $util.toJson($ctx.source.authorUsername)
  }
}
`

const lambdaRawResponseMappingTemplate = `$util.toJson($ctx.result)`

const rdsKitTableDefaultOrderColumn = 'lastUpdateTime'

export class AppsyncNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props: AppsyncNestedStackProps) {
    super(scope, id, props)

    //
    const api = new GraphqlApi(this, 'AppsyncApi', {
      name: props.appsyncApiName,
      schema: Schema.fromAsset(join(__dirname, 'schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: UserPool.fromUserPoolId(
              this,
              'AppsyncAuthUserPool',
              props.cognitoUserPoolId
            )
          }
        }
      },
      logConfig: {
        fieldLogLevel: FieldLogLevel.ERROR
      }
    })

    // Add Data Sources
    const getCognitoUserFunctionDS = api.addLambdaDataSource(
      'GetCognitoUserFunctionDataSource',
      Function.fromFunctionArn(
        this,
        'AppsyncGetCognitoUserFunction',
        props.getCognitoUserFunctionArn
      )
    )

    /*
     * TODO: Add as api.addRelationalDataSource instead...
     * ... when https://github.com/gimmickless/iyiye-aws-resources/issues/7 is resolved
     */
    const rdsDS = new CfnDataSource(this, 'RdsDataSource', {
      apiId: api.apiId,
      name: 'rds',
      type: 'RELATIONAL_DATABASE',
      relationalDatabaseConfig: {
        relationalDatabaseSourceType: 'RDS_HTTP_ENDPOINT',
        rdsHttpEndpointConfig: {
          awsRegion: this.region,
          awsSecretStoreArn: props.rdsDbCredentialsSecretArn,
          dbClusterIdentifier: props.rdsDbClusterArn,
          databaseName: props.rdsDbName
        }
      }
    })

    // Function Resolvers
    getCognitoUserFunctionDS.createResolver({
      typeName: 'Query',
      fieldName: 'getUserByUsername',
      requestMappingTemplate: MappingTemplate.lambdaRequest(
        "$util.toJson($ctx.args)"
      ),
      responseMappingTemplate: MappingTemplate.lambdaResult()
    })

    // RDS Cfn Resolvers (Query)
    new CfnResolver(this, 'ListKitsResolver', {
      apiId: api.apiId,
      typeName: 'Query',
      fieldName: 'listKits',
      dataSourceName: rdsDS.name,
      requestMappingTemplate: `
      #set ($statement = "
      Select * From
        ${props.rdsDbKitTableName}
      Where (:approved Is NULL Or approved=:approved)
        And (:cuisineCountryCode='' Or cuisineCountryCode=:cuisineCountryCode)
        And (:diets='' Or diets=:diets)
        And (:priceUpperLimit=0 Or price<:priceUpperLimit)
        And (:calorieUpperLimit=0 Or calorie<:calorieUpperLimit)
        And (:prepTimeUpperLimit=0 Or prepTime<:prepTimeUpperLimit)
      Order By :orderColumn :sqlOrderDirection Limit :limit Offset :offset
      ")

      {
        "version": "2018-05-29",
        "statements": [
          $util.toJson($statement)
        ],
        "variableMap": {
          ":approved": $util.defaultIfNull(\${ctx.args.approved}, null),
          ":limit": $util.defaultIfNull(\${ctx.args.limit}, 10),
          ":offset": $util.defaultIfNull(\${ctx.args.offset}, 0),
          ":orderColumn": $util.defaultIfNullOrEmpty(\${ctx.args.orderColumn}, '${rdsKitTableDefaultOrderColumn}'),
          ":sqlOrderDirection": $util.defaultIfNullOrEmpty(\${ctx.args.sqlOrderDirection}, 'ASC'),
          ":cuisineCountryCode": "$util.defaultIfNullOrEmpty(\${ctx.args.cuisineCountryCode}, '')",
          ":diets": "$util.defaultIfNullOrEmpty(\${ctx.args.diets}, '')",
          ":priceUpperLimit": "$util.defaultIfNull(\${ctx.args.priceUpperLimit}, 0)",
          ":calorieUpperLimit": "$util.defaultIfNull(\${ctx.args.calorieUpperLimit}, 0)",
          ":prepTimeUpperLimit": "$util.defaultIfNull(\${ctx.args.prepTimeUpperLimit}, 0)"
        }
      }
      `,
      responseMappingTemplate: rdsListResponseMappingTemplate
    })

    // RDS Cfn Resolvers (Source)
    new CfnResolver(this, 'AuthorOfKitResolver', {
      apiId: api.apiId,
      typeName: 'Kit',
      fieldName: 'author',
      dataSourceName: getCognitoUserFunctionDS.name,
      requestMappingTemplate: lambdaSourceAuthorUsernameAsUsernameRequestMappingTemplate,
      responseMappingTemplate: lambdaRawResponseMappingTemplate
    })
  }
}
