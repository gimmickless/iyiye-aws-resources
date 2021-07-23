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
import { LogGroup } from '@aws-cdk/aws-logs'
import { Bucket, BucketAccessControl } from '@aws-cdk/aws-s3'
import {
  CfnCapabilities,
  Construct,
  Duration,
  NestedStack,
  NestedStackProps,
  RemovalPolicy,
  SecretValue
} from '@aws-cdk/core'
import { defaultGitHubBranch } from '../constants'

interface PipelineNestedStackProps extends NestedStackProps {
  lambda: {
    userFuncName: string
    kitQueryFuncName: string
  }
  cognitoUserPoolId: string
  github: {
    functionReposOwnerName: string
    userFunctionRepoName: string
    kitQueryFunctionRepoName: string
  }
  artifactStoreBucketName: string
  rds: {
    dbClusterArn: string
    dbCredentialsSecretArn: string
  }
}

export class PipelineNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props: PipelineNestedStackProps) {
    super(scope, id, props)

    const userFuncPipelineBuildProjectLogGroup = new LogGroup(
      this,
      `UserFuncPipelineBuildProjectLogGroup`
    )
    const kitQueryFuncPipelineBuildProjectLogGroup = new LogGroup(
      this,
      `KitQueryFuncPipelineBuildProjectLogGroup`
    )

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
        buildImage: LinuxBuildImage.STANDARD_5_0,
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
    const userFuncPipelineBuildProject = new PipelineProject(
      this,
      'UserFuncPipelineBuildProject',
      {
        ...defaultPipelineProjectProps,
        projectName: `${process.env.APPLICATION}-user-fn-bp`,
        logging: {
          cloudWatch: {
            logGroup: userFuncPipelineBuildProjectLogGroup
          }
        }
      }
    )
    const kitQueryFuncPipelineBuildProject = new PipelineProject(
      this,
      'KitQueryFuncPipelineBuildProject',
      {
        ...defaultPipelineProjectProps,
        projectName: `${process.env.APPLICATION}-kit-query-fn-bp`,
        logging: {
          cloudWatch: {
            logGroup: kitQueryFuncPipelineBuildProjectLogGroup
          }
        }
      }
    )

    // Artifacts
    const userFuncSourceOutput = new Artifact('CUSrc')
    const userFuncBuildOutput = new Artifact('CUBld')
    const kitQueryFuncSourceOutput = new Artifact('KQSrc')
    const kitQueryFuncBuildOutput = new Artifact('KQBld')

    // Pipelines
    new Pipeline(this, 'UserFuncPipeline', {
      pipelineName: `${process.env.APPLICATION}-user-fn-pl`,
      crossAccountKeys: false,
      artifactBucket: pipelineArtifactStoreBucket,
      restartExecutionOnUpdate: true,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new GitHubSourceAction({
              actionName: 'FetchSource',
              owner: props.github.functionReposOwnerName,
              repo: props.github.userFunctionRepoName,
              branch: defaultGitHubBranch,
              oauthToken: SecretValue.secretsManager(
                process.env.GITHUB_TOKEN_SECRET_ID ?? '',
                {
                  jsonField: 'token'
                }
              ),
              trigger: GitHubTrigger.WEBHOOK,
              output: userFuncSourceOutput
            })
          ]
        },
        {
          stageName: 'Build',
          actions: [
            new CodeBuildAction({
              actionName: 'BuildFunction',
              input: userFuncSourceOutput,
              outputs: [userFuncBuildOutput],
              project: userFuncPipelineBuildProject
            })
          ]
        },
        {
          stageName: 'Deploy',
          actions: [
            new CloudFormationCreateUpdateStackAction({
              actionName: 'DeployFunction',
              stackName: `${process.env.APPLICATION}-user-fn-stack`,
              adminPermissions: true,
              cfnCapabilities: [
                CfnCapabilities.AUTO_EXPAND,
                CfnCapabilities.NAMED_IAM
              ],
              templatePath: userFuncBuildOutput.atPath('output-template.yml'),
              parameterOverrides: {
                FunctionName: props.lambda.userFuncName,
                CognitoUserPoolId: props.cognitoUserPoolId,
                Environment: process.env.ENVIRONMENT as string,
                Application: process.env.APPLICATION as string
              },
              extraInputs: [userFuncBuildOutput],
              replaceOnFailure: true
            })
          ]
        }
      ]
    })
    new Pipeline(this, 'KitQueryFuncPipeline', {
      pipelineName: `${process.env.APPLICATION}-kit-query-fn-pl`,
      crossAccountKeys: false,
      artifactBucket: pipelineArtifactStoreBucket,
      restartExecutionOnUpdate: true,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new GitHubSourceAction({
              actionName: 'FetchSource',
              owner: props.github.functionReposOwnerName,
              repo: props.github.kitQueryFunctionRepoName,
              branch: defaultGitHubBranch,
              oauthToken: SecretValue.secretsManager(
                process.env.GITHUB_TOKEN_SECRET_ID ?? '',
                {
                  jsonField: 'token'
                }
              ),
              trigger: GitHubTrigger.WEBHOOK,
              output: kitQueryFuncSourceOutput
            })
          ]
        },
        {
          stageName: 'Build',
          actions: [
            new CodeBuildAction({
              actionName: 'BuildFunction',
              input: kitQueryFuncSourceOutput,
              outputs: [kitQueryFuncBuildOutput],
              project: kitQueryFuncPipelineBuildProject
            })
          ]
        },
        {
          stageName: 'Deploy',
          actions: [
            new CloudFormationCreateUpdateStackAction({
              actionName: 'DeployFunction',
              stackName: `${process.env.APPLICATION}-kit-query-fn-stack`,
              adminPermissions: true,
              cfnCapabilities: [
                CfnCapabilities.AUTO_EXPAND,
                CfnCapabilities.NAMED_IAM
              ],
              templatePath: kitQueryFuncBuildOutput.atPath(
                'output-template.yml'
              ),
              parameterOverrides: {
                FunctionName: props.lambda.kitQueryFuncName,
                Environment: process.env.ENVIRONMENT as string,
                Application: process.env.APPLICATION as string
              },
              extraInputs: [kitQueryFuncBuildOutput],
              replaceOnFailure: true
            })
          ]
        }
      ]
    })
  }
}
