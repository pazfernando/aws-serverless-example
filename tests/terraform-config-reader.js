/**
 * Helper module to read Terraform configuration values
 */

const { execSync } = require('child_process');
const path = require('path');

/**
 * Reads Terraform variables from the dev environment
 * @returns {Object} Terraform configuration values
 */
function getTerraformConfig() {
  const envPath = path.join(__dirname, '..', 'stateful');
  
  try {
    // Try to get values from terraform.tfvars or use defaults from variables.tf
    const result = execSync('terraform console', {
      cwd: envPath,
      encoding: 'utf-8',
      input: `
var.project_name
var.region
`,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const lines = result.trim().split('\n').filter(line => line.trim());
    
    return {
      project_name: lines[0]?.replace(/"/g, '') || 'fp-aws-serverless-sample-1',
      region: lines[1]?.replace(/"/g, '') || 'us-east-1'
    };
  } catch (error) {
    // Fallback to default values if terraform console fails
    console.warn('Warning: Could not read Terraform config, using defaults');
    return {
      project_name: 'fp-aws-serverless-sample-1',
      region: 'us-east-1'
    };
  }
}

/**
 * Reads Terraform outputs from the dev environment
 * @returns {Object} Terraform outputs
 */
function getTerraformOutputs() {
  const statefulPath = path.join(__dirname, '..', 'stateful');
  const statelessPath = path.join(__dirname, '..', 'stateless');

  let stateful = {};
  let stateless = {};

  try {
    const statefulOut = execSync('terraform output -json', {
      cwd: statefulPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    stateful = JSON.parse(statefulOut);
  } catch (error) {
    console.warn(`Warning: Could not read stateful outputs: ${error.message}`);
  }

  try {
    const statelessOut = execSync('terraform output -json', {
      cwd: statelessPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    stateless = JSON.parse(statelessOut);
  } catch (error) {
    console.warn(`Warning: Could not read stateless outputs: ${error.message}`);
  }

  // Merge with stateless taking precedence for overlapping keys
  return { ...stateful, ...stateless };
}

module.exports = {
  getTerraformConfig,
  getTerraformOutputs
};
