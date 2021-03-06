import { join } from 'path'
import { Construct, NestedStack, NestedStackProps } from '@aws-cdk/core'
import {
  GraphqlApi,
  AuthorizationType,
  Schema,
  FieldLogLevel,
  MappingTemplate
} from '@aws-cdk/aws-appsync'
import { UserPool } from '@aws-cdk/aws-cognito'
import { Function } from '@aws-cdk/aws-lambda'
import { IServerlessCluster } from '@aws-cdk/aws-rds'
import { ISecret } from '@aws-cdk/aws-secretsmanager'
import { notifDbInAppNotificationsTableName } from '../constants'
import { selectNotifDbInAppNotifications } from '../generic-queries'

interface AppsyncNestedStackProps extends NestedStackProps {
  appsyncApiName: string
  cognitoUserPoolId: string
  lambda: {
    userFuncArn: string
  }
  rds: {
    dbCluster: IServerlessCluster
    dbCredentialsSecretStore: ISecret
    notificationDbName: string
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

    const graphQlApi = new GraphqlApi(this, 'AppsyncApi', {
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

    // Data Sources
    const userFuncDS = graphQlApi.addLambdaDataSource(
      'UserFunc',
      Function.fromFunctionArn(
        this,
        'AppsyncUserFunc',
        props.lambda.userFuncArn
      )
    )

    const notificationRdsDS = graphQlApi.addRdsDataSource(
      'NotificationRds',
      props.rds.dbCluster,
      props.rds.dbCredentialsSecretStore,
      props.rds.notificationDbName
    )

    // Resolvers
    userFuncDS.createResolver({
      typeName: 'Query',
      fieldName: 'getUserBasicInfo'
    })

    notificationRdsDS.createResolver({
      typeName: 'Query',
      fieldName: 'listInAppNotificationsForUser',
      requestMappingTemplate: MappingTemplate.fromString(`
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
      responseMappingTemplate: MappingTemplate.fromString(
        rdsListResponseMappingTemplate
      )
    })
    notificationRdsDS.createResolver({
      typeName: 'Mutation',
      fieldName: 'createInAppNotification',
      requestMappingTemplate: MappingTemplate.fromString(`
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
      responseMappingTemplate: MappingTemplate.fromString(
        rdsMutationResponseMappingTemplate
      )
    })
    notificationRdsDS.createResolver({
      typeName: 'Mutation',
      fieldName: 'updateInAppNotificationsForUserAsRead',
      requestMappingTemplate: MappingTemplate.fromString(`
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
      responseMappingTemplate: MappingTemplate.fromString(
        rdsMutationResponseMappingTemplate
      )
    })
  }
}
