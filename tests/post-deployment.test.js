#!/usr/bin/env node

/**
 * Post-Deployment Tests
 * Validates deployed AWS resources and their functionality
 */

const { execSync } = require('child_process');
const axios = require('axios');
const { getTerraformConfig, getTerraformOutputs } = require('./terraform-config-reader');

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


async function testApiEndpoint(apiEndpoint) {
  log('\nTest 1: Testing API Gateway health endpoint...', colors.yellow);
  try {
    const response = await axios.get(`${apiEndpoint}/health`, {
      timeout: 10000
    });
    
    if (response.status === 200 && response.data.status === 'ok') {
      log('✓ API Gateway health check passed', colors.green);
      console.log(`  Status: ${response.status}`);
      console.log(`  Response: ${JSON.stringify(response.data)}`);
      return true;
    } else {
      log('✗ API Gateway health check failed', colors.red);
      console.log(`  Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    log('✗ API Gateway health check failed', colors.red);
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

async function testApiCrudOperations(apiEndpoint) {
  log('\nTest 2: Testing API CRUD operations...', colors.yellow);
  try {
    // Create a visit
    const testId = `test-${Date.now()}`;
    const createResponse = await axios.post(`${apiEndpoint}/visit`, {
      id: testId
    }, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (createResponse.status !== 200) {
      log('✗ Failed to create visit', colors.red);
      return false;
    }
    
    console.log(`  ✓ Created visit with ID: ${testId}`);
    
    // Retrieve the visit
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for consistency
    const getResponse = await axios.get(`${apiEndpoint}/visit/${testId}`, {
      timeout: 10000
    });
    
    if (getResponse.status === 200 && getResponse.data.id === testId) {
      log('✓ API CRUD operations passed', colors.green);
      console.log(`  ✓ Retrieved visit: ${JSON.stringify(getResponse.data)}`);
      return true;
    } else {
      log('✗ Failed to retrieve visit', colors.red);
      return false;
    }
  } catch (error) {
    log('✗ API CRUD operations failed', colors.red);
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

async function testCloudFrontDistribution(cloudfrontDomain) {
  log('\nTest 3: Testing CloudFront distribution...', colors.yellow);
  try {
    const response = await axios.get(`https://${cloudfrontDomain}`, {
      timeout: 15000,
      validateStatus: (status) => status < 500 // Accept 404/403 as valid (empty bucket)
    });
    
    if (response.status < 500) {
      log('✓ CloudFront distribution is accessible', colors.green);
      console.log(`  Status: ${response.status}`);
      console.log(`  Domain: ${cloudfrontDomain}`);
      return true;
    } else {
      log('✗ CloudFront distribution returned server error', colors.red);
      console.log(`  Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    log('✗ CloudFront distribution check failed', colors.red);
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

async function testAwsResources(outputs, region) {
  log('\nTest 4: Verifying AWS resources exist...', colors.yellow);
  
  const siteBucket = outputs.site_bucket?.value;
  const dynamoTable = outputs.dynamodb_table?.value;
  
  let allExist = true;
  
  // Check S3 bucket
  if (siteBucket) {
    const s3Check = runCommand(`aws s3api head-bucket --bucket ${siteBucket} --region ${region}`, __dirname);
    if (s3Check.success) {
      console.log(`  ✓ S3 bucket exists: ${siteBucket}`);
    } else {
      console.log(`  ✗ S3 bucket not found: ${siteBucket}`);
      allExist = false;
    }
  }
  
  // Check DynamoDB table
  if (dynamoTable) {
    const dynamoCheck = runCommand(`aws dynamodb describe-table --table-name ${dynamoTable} --region ${region}`, __dirname);
    if (dynamoCheck.success) {
      console.log(`  ✓ DynamoDB table exists: ${dynamoTable}`);
    } else {
      console.log(`  ✗ DynamoDB table not found: ${dynamoTable}`);
      allExist = false;
    }
  }
  
  if (allExist) {
    log('✓ All AWS resources verified', colors.green);
    return true;
  } else {
    log('✗ Some AWS resources are missing', colors.red);
    return false;
  }
}

async function testLambdaFunction(region, projectName) {
  log('\nTest 5: Checking Lambda function...', colors.yellow);
  
  const lambdaCheck = runCommand(
    `aws lambda list-functions --region ${region} --output json`,
    __dirname
  );
  
  if (lambdaCheck.success) {
    const functions = JSON.parse(lambdaCheck.output);
    const crudFunction = functions.Functions.find(f => f.FunctionName.includes('crud-visit'));
    
    if (crudFunction) {
      log('✓ Lambda function found', colors.green);
      console.log(`  Function: ${crudFunction.FunctionName}`);
      console.log(`  Runtime: ${crudFunction.Runtime}`);
      return true;
    }
  }
  
  log('✗ Lambda function not found', colors.red);
  return false;
}

async function testApiGateway(region, projectName) {
  log('\nTest 6: Checking API Gateway...', colors.yellow);
  
  const apiCheck = runCommand(
    `aws apigatewayv2 get-apis --region ${region} --output json`,
    __dirname
  );
  
  if (apiCheck.success) {
    const apis = JSON.parse(apiCheck.output);
    const projectApi = apis.Items?.find(api => api.Name.includes(projectName) || api.Name.includes('api'));
    
    if (projectApi) {
      log('✓ API Gateway found', colors.green);
      console.log(`  API: ${projectApi.Name}`);
      console.log(`  Protocol: ${projectApi.ProtocolType}`);
      return true;
    }
  }
  
  log('✗ API Gateway not found', colors.red);
  return false;
}

async function runTests() {
  log('\n========================================', colors.blue);
  log('  POST-DEPLOYMENT INFRASTRUCTURE TESTS', colors.blue);
  log('========================================\n', colors.blue);

  let passed = 0;
  let failed = 0;

  try {
    // Load Terraform configuration
    log('Loading Terraform configuration...', colors.yellow);
    const tfConfig = getTerraformConfig();
    log('✓ Configuration loaded', colors.green);
    console.log(`  Project: ${tfConfig.project_name}`);
    console.log(`  Region: ${tfConfig.region}`);
    console.log('');

    // Get Terraform outputs
    log('Fetching Terraform outputs...', colors.yellow);
    const outputs = getTerraformOutputs();
    const apiEndpoint = outputs.api_endpoint?.value;
    const cloudfrontDomain = outputs.cloudfront_domain?.value;
    
    log('✓ Terraform outputs retrieved', colors.green);
    console.log(`  API Endpoint: ${apiEndpoint}`);
    console.log(`  CloudFront Domain: ${cloudfrontDomain}`);

    // Test API health endpoint
    if (await testApiEndpoint(apiEndpoint)) {
      passed++;
    } else {
      failed++;
    }

    // Test API CRUD operations
    if (await testApiCrudOperations(apiEndpoint)) {
      passed++;
    } else {
      failed++;
    }

    // Test CloudFront distribution
    if (await testCloudFrontDistribution(cloudfrontDomain)) {
      passed++;
    } else {
      failed++;
    }

    // Test AWS resources
    if (await testAwsResources(outputs, tfConfig.region)) {
      passed++;
    } else {
      failed++;
    }

    // Test Lambda function
    if (await testLambdaFunction(tfConfig.region, tfConfig.project_name)) {
      passed++;
    } else {
      failed++;
    }

    // Test API Gateway
    if (await testApiGateway(tfConfig.region, tfConfig.project_name)) {
      passed++;
    } else {
      failed++;
    }

  } catch (error) {
    log(`\nError during tests: ${error.message}`, colors.red);
    failed++;
  }

  // Summary
  log('\n========================================', colors.blue);
  log('  TEST SUMMARY', colors.blue);
  log('========================================', colors.blue);
  log(`Passed: ${passed}`, colors.green);
  log(`Failed: ${failed}`, colors.red);
  log(`Total:  ${passed + failed}`, colors.blue);
  
  if (failed > 0) {
    log('\n⚠ Some post-deployment tests failed.', colors.red);
    process.exit(1);
  } else {
    log('\n✓ All post-deployment tests passed!', colors.green);
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  log(`\nUnexpected error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
