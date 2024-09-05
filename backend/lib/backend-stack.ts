import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const createFunction = new lambdaNodejs.NodejsFunction(this, "CreateFunction", {
      entry: "dist/create/create_poststream.ts",
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      bundling: {
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string) {
            return []
          },
          beforeInstall(inputDir: string, outputDir: string) {
            return []
          },
          afterBundling(inputDir: string, outputDir: string) {
            return [
              `cp ${inputDir}/dist/create/*.json ${outputDir}`,
            ]
          }
        }
      }
    });

    const api = new apigwv2.HttpApi(this, "SocialMediaAPI");

    api.addRoutes({
      path: "/posts",
      methods: [apigwv2.HttpMethod.GET],
      integration: new apigwv2Integrations.HttpLambdaIntegration("PostsIntegration", createFunction)
    });

    new cdk.CfnOutput(this, "APIPath", { value: api.apiEndpoint });
  }
}
