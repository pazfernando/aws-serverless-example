#!/usr/bin/env node

/**
 * Pre-Deployment Tests
 * Validates Terraform configuration before deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getTerraformConfig } = require('./terraform-config-reader');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, cwd) {
  try {
    const output = execSync(command, { 
      cwd, 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    return { success: true, output };
  } catch (error) {
    return { 
      success: false, 
      output: error.stdout || error.stderr || error.message 
    };
  }
}

async function runTests() {
  log('\n========================================', colors.blue);
  log('  PRE-DEPLOYMENT INFRASTRUCTURE TESTS', colors.blue);
  log('========================================\n', colors.blue);

  const projectRoot = path.join(__dirname, '..');
  const statefulPath = path.join(projectRoot, 'stateful');
  const statelessPath = path.join(projectRoot, 'stateless');
  
  // Load Terraform configuration
  log('Loading Terraform configuration...', colors.yellow);
  const tfConfig = getTerraformConfig();
  log('✓ Configuration loaded', colors.green);
  console.log(`  Project: ${tfConfig.project_name}`);
  console.log(`  Region: ${tfConfig.region}`);
  console.log('');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Check Terraform is installed
  log('Test 1: Checking Terraform installation...', colors.yellow);
  const tfVersion = runCommand('terraform version', projectRoot);
  if (tfVersion.success) {
    log('✓ Terraform is installed', colors.green);
    console.log(`  Version: ${tfVersion.output.split('\n')[0]}`);
    passed++;
  } else {
    log('✗ Terraform is not installed', colors.red);
    failed++;
  }

  // Test 2: Check AWS CLI is configured
  log('\nTest 2: Checking AWS CLI configuration...', colors.yellow);
  const awsCheck = runCommand(`aws sts get-caller-identity --region ${tfConfig.region}`, projectRoot);
  console.log(awsCheck.output);
  if (awsCheck.success) {
    log('✓ AWS CLI is configured', colors.green);
    const identity = JSON.parse(awsCheck.output);
    console.log(`  Account: ${identity.Account}`);
    console.log(`  User/Role: ${identity.Arn}`);
    passed++;
  } else {
    log('✗ AWS CLI is not configured properly', colors.red);
    failed++;
  }

  // Test 3: Check required files exist
  log('\nTest 3: Checking required Terraform files...', colors.yellow);
  const requiredFiles = [
    'stateful/main.tf',
    'stateful/providers.tf',
    'stateful/variables.tf',
    'stateful/outputs.tf',
    'stateless/main.tf',
    'stateless/providers.tf',
    'stateless/variables.tf',
    'stateless/outputs.tf',
    'functions/crud-visit/index.js'
  ];
  
  let filesExist = true;
  requiredFiles.forEach(file => {
    const filePath = path.join(projectRoot, file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✓ ${file}`);
    } else {
      console.log(`  ✗ ${file} ${colors.red}(missing)${colors.reset}`);
      filesExist = false;
    }
  });
  
  if (filesExist) {
    log('✓ All required files exist', colors.green);
    passed++;
  } else {
    log('✗ Some required files are missing', colors.red);
    failed++;
  }

  // Test 4: Validate Terraform configuration
  log('\nTest 4: Validating Terraform configuration...', colors.yellow);
  
  // Validate stateful (skip backend initialization)
  const tfInitStateful = runCommand('terraform init -backend=false -reconfigure', statefulPath);
  const tfInitStateless = runCommand('terraform init -backend=false -reconfigure', statelessPath);
  
  let configValid = true;
  if (tfInitStateful.success && tfInitStateless.success) {
    const tfValidateStateful = runCommand('terraform validate', statefulPath);
    const tfValidateStateless = runCommand('terraform validate', statelessPath);
    
    if (tfValidateStateful.success && tfValidateStateless.success) {
      log('✓ Terraform configuration is valid (stateful & stateless)', colors.green);
      passed++;
    } else {
      log('✗ Terraform configuration has errors', colors.red);
      if (!tfValidateStateful.success) console.log('Stateful:', tfValidateStateful.output);
      if (!tfValidateStateless.success) console.log('Stateless:', tfValidateStateless.output);
      failed++;
      configValid = false;
    }
  } else {
    log('✗ Failed to initialize Terraform', colors.red);
    if (!tfInitStateful.success) console.log('Stateful:', tfInitStateful.output);
    if (!tfInitStateless.success) console.log('Stateless:', tfInitStateless.output);
    failed++;
    configValid = false;
  }

  // Test 5: Check Lambda function syntax
  log('\nTest 5: Checking Lambda function syntax...', colors.yellow);
  const lambdaPath = path.join(projectRoot, 'functions/crud-visit/index.js');
  try {
    require(lambdaPath);
    log('✓ Lambda function has valid syntax', colors.green);
    passed++;
  } catch (error) {
    log('✗ Lambda function has syntax errors', colors.red);
    console.log(`  Error: ${error.message}`);
    failed++;
  }

  // Test 6: Terraform format check
  log('\nTest 6: Checking Terraform formatting...', colors.yellow);
  const tfFmt = runCommand('terraform fmt -check -recursive', projectRoot);
  if (tfFmt.success && tfFmt.output.trim() === '') {
    log('✓ Terraform files are properly formatted', colors.green);
    passed++;
  } else {
    log('⚠ Some Terraform files need formatting', colors.yellow);
    if (tfFmt.output.trim()) {
      console.log('  Files that need formatting:');
      console.log(tfFmt.output);
    }
    passed++; // This is a warning, not a failure
  }

  // Summary
  log('\n========================================', colors.blue);
  log('  TEST SUMMARY', colors.blue);
  log('========================================', colors.blue);
  log(`Passed: ${passed}`, colors.green);
  log(`Failed: ${failed}`, colors.red);
  log(`Total:  ${passed + failed}`, colors.blue);
  
  if (failed > 0) {
    log('\n⚠ Pre-deployment tests failed. Fix issues before deploying.', colors.red);
    process.exit(1);
  } else {
    log('\n✓ All pre-deployment tests passed! Ready to deploy.', colors.green);
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  log(`\nUnexpected error: ${error.message}`, colors.red);
  process.exit(1);
});
