import { join } from 'path'
import { Construct } from 'constructs'
import {
  NestedStack,
  NestedStackProps,
  aws_cognito as cognito,
  aws_lambda as lambda,
  aws_rds as rds,
  aws_secretsmanager as secretsmanager,
  aws_dynamodb as dynamodb,
  aws_opensearchservice as opensearch
} from 'aws-cdk-lib'
import * as appsync from '@aws-cdk/aws-appsync-alpha'
import { notifDbInAppNotificationsTableName } from '../constants'
import { selectNotifDbInAppNotifications } from '../generic-queries'

interface AppsyncNestedStackProps extends NestedStackProps {
  appsyncApiName: string
  cognitoUserPoolId: string
  lambda: {
    userFuncArn: string
  }
  rds: {
    dbCluster: rds.IServerlessCluster
    dbCredentialsSecretStore: secretsmanager.ISecret
    notificationDbName: string
  }
  dynamodb: {
    kitCategories: dynamodb.ITable
    kits: dynamodb.ITable
  }
  opensearch: {
    domain: opensearch.IDomain
  }
}

const rdsListResponseMappingTemplate = `
#if($ctx.error)
  $utils.error($ctx.error.message, $ctx.error.type)
#end
$utils.toJson($utils.rds.toJsonObject($ctx.result)[0])
`

const rdsGetSingleItemResponseMappingTemplate = `
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

// Returns the result of seconds statement which is a Select for create/updates
const rdsMutationResponseMappingTemplate = `
#if($ctx.error)
  $utils.error($ctx.error.message, $ctx.error.type)
#end
$utils.toJson($utils.rds.toJsonObject($ctx.result)[1][0])
`

export class AppsyncNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props: AppsyncNestedStackProps) {
    super(scope, id, props)

    const graphqlApi = new appsync.GraphqlApi(this, 'AppsyncApi', {
      name: props.appsyncApiName,
      schema: appsync.Schema.fromAsset(join(__dirname, 'schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: cognito.UserPool.fromUserPoolId(this, 'AppsyncAuthUserPool', props.cognitoUserPoolId)
          }
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.IAM
          }
        ]
      },
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ERROR
      }
    })

    // Data Sources
    const userFuncDS = new appsync.LambdaDataSource(this, 'UserFunc', {
      api: graphqlApi,
      name: 'userFuncDS',
      lambdaFunction: lambda.Function.fromFunctionArn(this, 'AppsyncUserFunc', props.lambda.userFuncArn)
    })
    const kitCatgDS = graphqlApi.addDynamoDbDataSource('KitCatgDS', props.dynamodb.kitCategories)
    const kitDS = graphqlApi.addDynamoDbDataSource('KitDS', props.dynamodb.kits)
    const kitSearchDS = graphqlApi.addElasticsearchDataSource('KitSearchDS', props.opensearch.domain)

    const notificationRdsDS = graphqlApi.addRdsDataSource(
      'NotificationRds',
      props.rds.dbCluster,
      props.rds.dbCredentialsSecretStore,
      props.rds.notificationDbName
    )

    // Resolvers
    userFuncDS.createResolver({
      typeName: 'Query',
      fieldName: 'userBasicInfo'
    })

    kitCatgDS.createResolver({
      typeName: 'Query',
      fieldName: 'kitCategoryList',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList()
    })

    // Notification Resolvers
    notificationRdsDS.createResolver({
      typeName: 'Query',
      fieldName: 'inAppNotificationList',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
      #set ($statement = "
        ${selectNotifDbInAppNotifications}
        Where receiver_username=:USERNAME
        Order By created_time Desc Limit :LIMIT Offset :OFFSET
      ")
      {
        "version": "2018-05-29",
        "statements": [
          $util.toJson($statement)
        ],
        "variableMap": {
          ":USERNAME": $util.toJson($ctx.args.username),
          ":LIMIT": $util.defaultIfNull(\${ctx.args.limit}, 10),
          ":OFFSET": $util.defaultIfNull(\${ctx.args.offset}, 0),
        }
      }`),
      responseMappingTemplate: appsync.MappingTemplate.fromString(rdsListResponseMappingTemplate)
    })
    notificationRdsDS.createResolver({
      typeName: 'Mutation',
      fieldName: 'createInAppNotification',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
      #set($insertStatement="
        Insert Into ${notifDbInAppNotificationsTableName}
        (type, receiver_username, body) Values
        (:TYPE, :USERNAME, :BODY)
      ")
      #set($selectStatement="
        ${selectNotifDbInAppNotifications}
        Where type=:TYPE
          And receiver_username=:USERNAME
          And body=:BODY
        Order By created_time Desc Limit 1
      ")
      {
        "version": "2018-05-29",
        "statements": [
          $util.toJson($insertStatement),
          $util.toJson($selectStatement)
        ],
        "variableMap": {
          ":TYPE": $util.toJson($ctx.args.input.type),
          ":USERNAME": $util.toJson($ctx.args.input.receiverUsername),
          ":BODY": $util.toJson($ctx.args.input.body)
        }
      }`),
      responseMappingTemplate: appsync.MappingTemplate.fromString(rdsMutationResponseMappingTemplate)
    })
    notificationRdsDS.createResolver({
      typeName: 'Mutation',
      fieldName: 'updateInAppNotificationsForUserAsRead',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
      #set($updateStatement="
        Update ${notifDbInAppNotificationsTableName}
        Set is_read=true
        Where receiver_username:USERNAME
      ")
      #set($selectStatement="
        ${selectNotifDbInAppNotifications}
        Where receiver_username=:USERNAME
        Order By last_updated_time Desc Limit 1
      ")
      {
        "version": "2018-05-29",
        "statements": [
          $util.toJson($updateStatement),
          $util.toJson($selectStatement)
        ],
        "variableMap": {
          ":USERNAME": $util.toJson($ctx.args.input.receiverUsername)
        }
      }`),
      responseMappingTemplate: appsync.MappingTemplate.fromString(rdsMutationResponseMappingTemplate)
    })
  }
}
