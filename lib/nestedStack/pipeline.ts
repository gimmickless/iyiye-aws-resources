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

    const userFuncPipelineBuildProjectLogGroup = new logs.LogGroup(this, `UserFuncPipelineBuildProjectLogGroup`)
    const kitQueryFuncPipelineBuildProjectLogGroup = new logs.LogGroup(this, `KitQueryFuncPipelineBuildProjectLogGroup`)

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
    const kitQueryFuncPipelineBuildProject = new codebuild.PipelineProject(this, 'KitQueryFuncPipelineBuildProject', {
      ...defaultPipelineProjectProps,
      projectName: `${process.env.APPLICATION}-kit-query-fn-bp`,
      logging: {
        cloudWatch: {
          logGroup: kitQueryFuncPipelineBuildProjectLogGroup
        }
      }
    })

    // Artifacts
    const userFuncSourceOutput = new codepipeline.Artifact('CUSrc')
    const userFuncBuildOutput = new codepipeline.Artifact('CUBld')
    const kitQueryFuncSourceOutput = new codepipeline.Artifact('KQSrc')
    const kitQueryFuncBuildOutput = new codepipeline.Artifact('KQBld')

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
    new codepipeline.Pipeline(this, 'KitQueryFuncPipeline', {
      pipelineName: `${process.env.APPLICATION}-kit-query-fn-pl`,
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
              repo: props.github.kitQueryFunctionRepoName,
              branch: defaultGitHubBranch,
              oauthToken: SecretValue.secretsManager(process.env.GITHUB_TOKEN_SECRET_ID ?? '', {
                jsonField: 'token'
              }),
              trigger: codepipelineactions.GitHubTrigger.WEBHOOK,
              output: kitQueryFuncSourceOutput
            })
          ]
        },
        {
          stageName: 'Build',
          actions: [
            new codepipelineactions.CodeBuildAction({
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
            new codepipelineactions.CloudFormationCreateUpdateStackAction({
              actionName: 'DeployFunction',
              stackName: `${process.env.APPLICATION}-kit-query-fn-stack`,
              adminPermissions: true,
              cfnCapabilities: [CfnCapabilities.AUTO_EXPAND, CfnCapabilities.NAMED_IAM],
              templatePath: kitQueryFuncBuildOutput.atPath('output-template.yml'),
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
