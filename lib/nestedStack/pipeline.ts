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
  userFunctionName: string
  cognitoUserPoolId: string
  githubOauthTokenSecretArn: string
  artifactStoreBucketName: string
  githubFunctionReposOwnerName: string
  userFunctionRepoName: string
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
    const userFunctionPipelineBuildProject = new PipelineProject(
      this,
      'UserFunctionPipelineBuildProject',
      defaultPipelineProjectProps
    )

    // // Artifacts
    // const userFunctionSourceOutput = new Artifact('CUSrc')
    // const userFunctionBuildOutput = new Artifact('CUBld')

    // // Pipelines
    // new Pipeline(this, 'UserFunctionPipeline', {
    //   stages: [
    //     {
    //       stageName: 'Source',
    //       actions: [
    //         new GitHubSourceAction({
    //           actionName: 'FetchSource',
    //           owner: props.githubFunctionReposOwnerName,
    //           repo: props.userFunctionRepoName,
    //           oauthToken: SecretValue.secretsManager(
    //             props.githubOauthTokenSecretArn,
    //             {
    //               jsonField: 'token'
    //             }
    //           ),
    //           trigger: GitHubTrigger.WEBHOOK,
    //           output: userFunctionSourceOutput
    //         })
    //       ]
    //     },
    //     {
    //       stageName: 'Build',
    //       actions: [
    //         new CodeBuildAction({
    //           actionName: 'BuildFunction',
    //           input: userFunctionSourceOutput,
    //           outputs: [userFunctionBuildOutput],
    //           project: userFunctionPipelineBuildProject
    //         })
    //       ]
    //     },
    //     {
    //       stageName: 'Deploy',
    //       actions: [
    //         new CloudFormationCreateUpdateStackAction({
    //           actionName: 'DeployFunction',
    //           stackName: 'UserFunctionStack',
    //           adminPermissions: true,
    //           templatePath: userFunctionBuildOutput.atPath(
    //             'output-template.yml'
    //           ),
    //           parameterOverrides: {
    //             FunctionName: props.userFunctionName,
    //             CognitoUserPoolId: props.cognitoUserPoolId,
    //             Environment: process.env.ENVIRONMENT as string,
    //             Application: process.env.APPLICATION as string
    //           },
    //           extraInputs: [userFunctionBuildOutput]
    //         })
    //       ]
    //     }
    //   ]
    // })
  }
}
