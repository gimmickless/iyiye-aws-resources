import { Construct } from 'constructs'
import {
  NestedStack,
  NestedStackProps,
  RemovalPolicy,
  Duration,
  SecretValue,
  CfnCapabilities,
  aws_logs as logs,
  aws_s3 as s3,
  aws_codebuild as codebuild,
  aws_codepipeline as codepipeline,
  aws_codepipeline_actions as codepipelineactions
} from 'aws-cdk-lib'
import { defaultGitHubBranch } from '../constants'

interface PipelineNestedStackProps extends NestedStackProps {
  lambda: {
    userFuncName: string
    ddsToOpensearchFuncName: string
  }
  cognitoUserPoolId: string
  github: {
    functionReposOwnerName: string
    userFunctionRepoName: string
    ddsToOpensearchFunctionRepoName: string
  }
  artifactStoreBucketName: string
  opensearch: {
    host: string
    kitsIndex: string
  }
}

export class PipelineNestedStack extends NestedStack {
  constructor(scope: Construct, id: string, props: PipelineNestedStackProps) {
    super(scope, id, props)

    const userFuncPipelineBuildProjectLogGroup = new logs.LogGroup(this, `UserFuncPipelineBuildProjectLogGroup`)
    const ddsToOpensearchFuncPipelineBuildProjectLogGroup = new logs.LogGroup(this, `DdsToOpensearchFuncPipelineBuildProjectLogGroup`)

    const pipelineArtifactStoreBucket = new s3.Bucket(this, 'PipelineArtifactStoreBucket', {
      bucketName: props.artifactStoreBucketName,
      accessControl: s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      removalPolicy: RemovalPolicy.RETAIN,
      versioned: true
    })

    // default pipeline
    const defaultPipelineProjectProps: codebuild.PipelineProjectProps = {
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        computeType: codebuild.ComputeType.SMALL,
        environmentVariables: {
          LAMBDA_ARTIFACT_STORE_BUCKET: {
            value: props.artifactStoreBucketName
          }
        }
      },
      timeout: Duration.minutes(10)
    }

    // Pipeline Projects
    const userFuncPipelineBuildProject = new codebuild.PipelineProject(this, 'UserFuncPipelineBuildProject', {
      ...defaultPipelineProjectProps,
      projectName: `${process.env.APPLICATION}-user-fn-bp`,
      logging: {
        cloudWatch: {
          logGroup: userFuncPipelineBuildProjectLogGroup
        }
      }
    })
    const ddsToOpensearchFuncPipelineBuildProject = new codebuild.PipelineProject(this, 'DdsToOpensearchFuncPipelineBuildProject', {
      ...defaultPipelineProjectProps,
      projectName: `${process.env.APPLICATION}-dds-to-opensearch-fn-bp`,
      logging: {
        cloudWatch: {
          logGroup: ddsToOpensearchFuncPipelineBuildProjectLogGroup
        }
      }
    })

    // Artifacts
    const userFuncSourceOutput = new codepipeline.Artifact('CUSrc')
    const userFuncBuildOutput = new codepipeline.Artifact('CUBld')
    const ddsToOpensearchFuncSourceOutput = new codepipeline.Artifact('DOSrc')
    const ddsToOpensearchFuncBuildOutput = new codepipeline.Artifact('DOBld')

    // Pipelines
    new codepipeline.Pipeline(this, 'UserFuncPipeline', {
      pipelineName: `${process.env.APPLICATION}-user-fn-pl`,
      crossAccountKeys: false,
      artifactBucket: pipelineArtifactStoreBucket,
      restartExecutionOnUpdate: true,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipelineactions.GitHubSourceAction({
              actionName: 'FetchSource',
              owner: props.github.functionReposOwnerName,
              repo: props.github.userFunctionRepoName,
              branch: defaultGitHubBranch,
              oauthToken: SecretValue.secretsManager(process.env.GITHUB_TOKEN_SECRET_ID ?? '', {
                jsonField: 'token'
              }),
              trigger: codepipelineactions.GitHubTrigger.WEBHOOK,
              output: userFuncSourceOutput
            })
          ]
        },
        {
          stageName: 'Build',
          actions: [
            new codepipelineactions.CodeBuildAction({
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
            new codepipelineactions.CloudFormationCreateUpdateStackAction({
              actionName: 'DeployFunction',
              stackName: `${process.env.APPLICATION}-user-fn-stack`,
              adminPermissions: true,
              cfnCapabilities: [CfnCapabilities.AUTO_EXPAND, CfnCapabilities.NAMED_IAM],
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
    new codepipeline.Pipeline(this, 'DdsToOpensearchFuncPipeline', {
      pipelineName: `${process.env.APPLICATION}-dds-to-opensearch-fn-pl`,
      crossAccountKeys: false,
      artifactBucket: pipelineArtifactStoreBucket,
      restartExecutionOnUpdate: true,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipelineactions.GitHubSourceAction({
              actionName: 'FetchSource',
              owner: props.github.functionReposOwnerName,
              repo: props.github.ddsToOpensearchFunctionRepoName,
              branch: defaultGitHubBranch,
              oauthToken: SecretValue.secretsManager(process.env.GITHUB_TOKEN_SECRET_ID ?? '', {
                jsonField: 'token'
              }),
              trigger: codepipelineactions.GitHubTrigger.WEBHOOK,
              output: ddsToOpensearchFuncSourceOutput
            })
          ]
        },
        {
          stageName: 'Build',
          actions: [
            new codepipelineactions.CodeBuildAction({
              actionName: 'BuildFunction',
              input: ddsToOpensearchFuncSourceOutput,
              outputs: [ddsToOpensearchFuncBuildOutput],
              project: ddsToOpensearchFuncPipelineBuildProject
            })
          ]
        },
        {
          stageName: 'Deploy',
          actions: [
            new codepipelineactions.CloudFormationCreateUpdateStackAction({
              actionName: 'DeployFunction',
              stackName: `${process.env.APPLICATION}-dds-to-opensearch-fn-stack`,
              adminPermissions: true,
              cfnCapabilities: [CfnCapabilities.AUTO_EXPAND, CfnCapabilities.NAMED_IAM],
              templatePath: ddsToOpensearchFuncBuildOutput.atPath('output-template.yml'),
              parameterOverrides: {
                FunctionName: props.lambda.ddsToOpensearchFuncName,
                Region: this.region,
                SearchHost: props.opensearch.host,
                KitsIndex: props.opensearch.kitsIndex,
                Environment: process.env.ENVIRONMENT as string,
                Application: process.env.APPLICATION as string
              },
              extraInputs: [ddsToOpensearchFuncBuildOutput],
              replaceOnFailure: true
            })
          ]
        }
      ]
    })
  }
}
