import {
  BuildSpec,
  ComputeType,
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
import { Bucket, BucketAccessControl } from '@aws-cdk/aws-s3'
import {
  Construct,
  Duration,
  NestedStack,
  NestedStackProps,
  RemovalPolicy,
  SecretValue
} from '@aws-cdk/core'

interface PipelineNestedStackProps extends NestedStackProps {
  userFunctionName: string
  cognitoUserPoolId: string
  artifactStoreBucketName: string
  githubFunctionReposOwnerName: string
  userFunctionRepoName: string
  rdsDbClusterArn: string
  rdsDbCredentialsSecretArn: string
}

export class PipelineNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props: PipelineNestedStackProps) {
    super(scope, id, props)

    const pipelineArtifactStoreBucket = new Bucket(
      this,
      'PipelineArtifactStoreBucket',
      {
        bucketName: props.artifactStoreBucketName,
        accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
        removalPolicy: RemovalPolicy.RETAIN,
        versioned: true
      }
    )

    // default pipeline
    const defaultPipelineProjectProps: PipelineProjectProps = {
      buildSpec: BuildSpec.fromSourceFilename('buildspec.yml'),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_4_0,
        computeType: ComputeType.SMALL,
        environmentVariables: {
          LAMBDA_ARTIFACT_STORE_BUCKET: {
            value: props.artifactStoreBucketName
          }
        }
      },
      timeout: Duration.minutes(10)
    }

    // Pipeline Projects
    const userFunctionPipelineBuildProject = new PipelineProject(
      this,
      'UserFunctionPipelineBuildProject',
      defaultPipelineProjectProps
    )

    // Artifacts
    const userFunctionSourceOutput = new Artifact('CUSrc')
    const userFunctionBuildOutput = new Artifact('CUBld')

    // Pipelines
    new Pipeline(this, 'UserFunctionPipeline', {
      pipelineName: `${process.env.APPLICATION}-user-function-pl`,
      crossAccountKeys: false,
      artifactBucket: pipelineArtifactStoreBucket,
      restartExecutionOnUpdate: true,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new GitHubSourceAction({
              actionName: 'FetchSource',
              owner: props.githubFunctionReposOwnerName,
              repo: props.userFunctionRepoName,
              oauthToken: SecretValue.secretsManager(
                process.env.GITHUB_TOKEN_SECRET_ID ?? '',
                {
                  jsonField: 'token'
                }
              ),
              trigger: GitHubTrigger.WEBHOOK,
              output: userFunctionSourceOutput
            })
          ]
        },
        {
          stageName: 'Build',
          actions: [
            new CodeBuildAction({
              actionName: 'BuildFunction',
              input: userFunctionSourceOutput,
              outputs: [userFunctionBuildOutput],
              project: userFunctionPipelineBuildProject
            })
          ]
        },
        {
          stageName: 'Deploy',
          actions: [
            new CloudFormationCreateUpdateStackAction({
              actionName: 'DeployFunction',
              stackName: `${process.env.APPLICATION}-user-function-stack`,
              adminPermissions: true,
              templatePath: userFunctionBuildOutput.atPath(
                'output-template.yml'
              ),
              parameterOverrides: {
                FunctionName: props.userFunctionName,
                CognitoUserPoolId: props.cognitoUserPoolId,
                Environment: process.env.ENVIRONMENT as string,
                Application: process.env.APPLICATION as string
              },
              extraInputs: [userFunctionBuildOutput],
              replaceOnFailure: true
            })
          ]
        }
      ]
    })
  }
}
