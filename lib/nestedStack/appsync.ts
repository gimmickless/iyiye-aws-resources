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
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult()
    })

    // Cfn Resolvers (for RDS)
    new CfnResolver(this, 'ListKitsResolver', {
      apiId: api.apiId,
      typeName: 'Query',
      fieldName: 'listKits',
      dataSourceName: rdsDS.name,
      requestMappingTemplate: `
      {
        "version": "2018-05-29",
        "statements": [
          "Select * from ${props.rdsDbKitTableName} Where (:contentId='' Or contentId=:contentId) And (:contentType='' Or contentType=:contentType) Order By time Desc Limit :limit Offset :offset"
        ],
        "variableMap": {
          ":limit": $util.defaultIfNull(\${ctx.args.limit}, 10),
          ":offset": $util.defaultIfNull(\${ctx.args.offset}, 0),
          ":contentId": "$util.defaultIfNullOrEmpty($ctx.args.contentId, '')",
          ":contentType": "$util.defaultIfNullOrEmpty($ctx.args.contentType, '')"
        }
      }
      `,
      responseMappingTemplate: rdsListResponseMappingTemplate
    })
  }
}
