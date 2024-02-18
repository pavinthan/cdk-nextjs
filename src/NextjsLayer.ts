import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Architecture, Code, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface NextjsLayerOverrides {
  readonly llrtTag?: string;
  readonly codeLocation?: string;
}

export type EnvironmentVars = Record<string, string>;

export interface NextjsLayerProps {
  /**
   * Override props for every construct.
   */
  readonly overrides?: NextjsLayerOverrides;
}

/**
 * Build a lambda function from a NextJS application to handle server-side rendering, API routes, and image optimization.
 */
export class NextjsLayer extends Construct {
  layerVersion: LayerVersion;

  private props: NextjsLayerProps;

  private codeLocation: string;

  constructor(scope: Construct, id: string, props: NextjsLayerProps) {
    super(scope, id);

    this.props = props;

    this.codeLocation = this.downloadLayerCode();

    this.layerVersion = this.createLayerVersion();
  }

  private downloadLayerCode() {
    const name = 'llrt-lambda-arm64.zip';
    const tag = this.props.overrides?.llrtTag || 'v0.1.7-beta';
    const location = this.props.overrides?.codeLocation || resolve(__dirname);

    const nameWithTag = `${tag}-${name}`;
    const path = join(location, nameWithTag);

    if (!existsSync(path)) {
      const url = `https://github.com/awslabs/llrt/releases/download/${tag}/llrt-lambda-arm64.zip`;
      execSync(`wget -q ${url} -O ${nameWithTag}`, { cwd: location });
    }

    return path;
  }

  private createLayerVersion() {
    const layerVersion = new LayerVersion(this, 'LayerVersion', {
      compatibleRuntimes: [Runtime.PROVIDED_AL2023],
      compatibleArchitectures: [Architecture.ARM_64],
      code: Code.fromAsset(this.codeLocation),
    });

    return layerVersion;
  }
}
