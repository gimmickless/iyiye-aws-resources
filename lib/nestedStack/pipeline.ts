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
import { defaultGitHubBranch } from '../constants'

interface PipelineNestedStackProps extends NestedStackProps {
  lambda: {
    userFuncName: string
  }
  cognitoUserPoolId: string
  github: {
    functionReposOwnerName: string
    userFunctionRepoName: string
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
      projectName: `${process.env.APPLICATION}-user-func-bp`,
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
    const userFuncPipelineBuildProject = new PipelineProject(
      this,
      'UserFuncPipelineBuildProject',
      defaultPipelineProjectProps
    )

    // Artifacts
    const userFuncSourceOutput = new Artifact('CUSrc')
    const userFuncBuildOutput = new Artifact('CUBld')

    // Pipelines
    new Pipeline(this, 'UserFuncPipeline', {
      pipelineName: `${process.env.APPLICATION}-user-func-pl`,
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
              stackName: `${process.env.APPLICATION}-user-func-stack`,
              adminPermissions: true,
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
  }
}
