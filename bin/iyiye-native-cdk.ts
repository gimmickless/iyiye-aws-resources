#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { IyiyeNativeCdkStack } from '../lib/iyiye-native-cdk-stack';

const app = new cdk.App();
new IyiyeNativeCdkStack(app, 'IyiyeNativeCdkStack');
