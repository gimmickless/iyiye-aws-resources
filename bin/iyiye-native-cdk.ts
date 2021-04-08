#!/usr/bin/env node
import '../env'
import 'source-map-support/register'
import { App, Tags } from '@aws-cdk/core'
import { IyiyeNativeCdkStack } from '../lib/iyiye-native-cdk-stack'

const app = new App()
const theStack = new IyiyeNativeCdkStack(app, 'IyiyeNativeCdkStack', {
  env: {
    region: process.env.CDK_DEFAULT_REGION
  }
})

// Add a tag to all constructs in the stack
Tags.of(theStack).add('environment', process.env.ENVIRONMENT as string)
Tags.of(theStack).add('application', process.env.APPLICATION as string)
