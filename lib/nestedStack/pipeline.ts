import {
  BuildSpec,
  LinuxBuildImage,
  PipelineProject
} from '@aws-cdk/aws-codebuild'
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline'
import {
  CloudFormationCreateUpdateStackAction,
  CodeBuildAction,
  GitHubSourceAction,
  GitHubTrigger
} from '@aws-cdk/aws-codepipeline-actions'
import {
  Construct,
  Duration,
  NestedStack,
  NestedStackProps,
  SecretValue
} from '@aws-cdk/core'

interface PipelineNestedStackProps extends NestedStackProps {
  getCognitoUserFunctionName: string
  cognitoUserPoolId: string
  getCognitoUserFunctionRepoOwnerName: string
  getCognitoUserFunctionRepoName: string
  githubOauthTokenSecretArn: string
  artifactStoreBucketName: string
}

export class PipelineNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props: PipelineNestedStackProps) {
    super(scope, id, props)

    const getCognitoUserFunctionPipelineBuildProject = new PipelineProject(
      this,
      'GetCognitoUserFunctionPipelineBuildProject',
      {
        buildSpec: BuildSpec.fromSourceFilename('buildspec.yml'),
        environment: {
          buildImage: LinuxBuildImage.STANDARD_4_0
        },
        environmentVariables: {
          LAMBDA_ARTIFACT_STORE_BUCKET: {
            value: props.artifactStoreBucketName
          }
        },
        timeout: Duration.minutes(10)
      }
    )

    const getCognitoUserFunctionSourceOutput = new Artifact('CUSrc')
    const getCognitoUserFunctionBuildOutput = new Artifact('CUBld')

    new Pipeline(this, 'GetCognitoUserFunctionPipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [
            new GitHubSourceAction({
              actionName: 'FetchSource',
              owner: props.getCognitoUserFunctionRepoOwnerName,
              repo: props.getCognitoUserFunctionRepoName,
              oauthToken: SecretValue.secretsManager(
                props.githubOauthTokenSecretArn
              ),
              trigger: GitHubTrigger.WEBHOOK,
              output: getCognitoUserFunctionSourceOutput
            })
          ]
        },
        {
          stageName: 'Build',
          actions: [
            new CodeBuildAction({
              actionName: 'BuildFunction',
              input: getCognitoUserFunctionSourceOutput,
              outputs: [getCognitoUserFunctionBuildOutput],
              project: getCognitoUserFunctionPipelineBuildProject
            })
          ]
        },
        {
          stageName: 'Deploy',
          actions: [
            new CloudFormationCreateUpdateStackAction({
              actionName: 'DeployFunction',
              stackName: 'GetCognitoUserFunctionStack',
              adminPermissions: true,
              templatePath: getCognitoUserFunctionBuildOutput.atPath(
                'output-template.yml'
              ),
              parameterOverrides: {
                FunctionName: props.getCognitoUserFunctionName,
                CognitoUserPoolId: props.cognitoUserPoolId,
                Environment: process.env.ENVIRONMENT as string,
                Application: process.env.APPLICATION as string
              },
              extraInputs: [getCognitoUserFunctionBuildOutput]
            })
          ]
        }
      ]
    })
  }
}
