import { join } from 'path'
import { Construct, NestedStack, NestedStackProps } from '@aws-cdk/core'
import {
  GraphqlApi,
  AuthorizationType,
  Schema,
  FieldLogLevel, MappingTemplate
} from '@aws-cdk/aws-appsync'
import { UserPool } from '@aws-cdk/aws-cognito'
import { Function } from '@aws-cdk/aws-lambda'

interface AppsyncNestedStackProps extends NestedStackProps {
  appsyncApiName: string
  cognitoUserPoolId: string
  getCognitoUserFunctionArn: string
}

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

    // Resolvers
    getCognitoUserFunctionDS.createResolver({
      typeName: 'Query',
      fieldName: 'getUserByUsername',
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult()
    })
  }
}
