import {
  BuildSpec,
  LinuxBuildImage,
  PipelineProject,
  PipelineProjectProps
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
  githubOauthTokenSecretArn: string
  artifactStoreBucketName: string
  githubFunctionReposOwnerName: string
  getCognitoUserFunctionRepoName: string
  rdsDbName: string
  rdsDbClusterArn: string
  rdsDbCredentialsSecretArn: string
}

export class PipelineNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props: PipelineNestedStackProps) {
    super(scope, id, props)

    // default pipeline
    const defaultPipelineProjectProps: PipelineProjectProps = {
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

    // Pipeline Projects
    const getCognitoUserFunctionPipelineBuildProject = new PipelineProject(
      this,
      'GetCognitoUserFunctionPipelineBuildProject',
      defaultPipelineProjectProps
    )

    // Artifacts
    const getCognitoUserFunctionSourceOutput = new Artifact('CUSrc')
    const getCognitoUserFunctionBuildOutput = new Artifact('CUBld')

    // Pipelines
    new Pipeline(this, 'GetCognitoUserFunctionPipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [
            new GitHubSourceAction({
              actionName: 'FetchSource',
              owner: props.githubFunctionReposOwnerName,
              repo: props.getCognitoUserFunctionRepoName,
              oauthToken: SecretValue.secretsManager(
                props.githubOauthTokenSecretArn,
                {
                  jsonField: 'token'
                }
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
