# fp-aws-serverless-sample-1 – Terraform

This Terraform project provisions a serverless web app architecture:

- S3 bucket for static assets (private)
- CloudFront distribution (OAC) in front of S3
- API Gateway HTTP API integrated with Lambda
- Lambda function `crud-visit`
- DynamoDB table `visits`
- Optional bootstrap stack for remote state (S3 + DynamoDB lock)

## Structure

```
├── global/
│   └── bootstrap_state/          # Remote state backend (S3 + DynamoDB)
├── stateful/                      # Persistent data layer
│   ├── main.tf                    # S3, CloudFront, DynamoDB
│   ├── outputs.tf
│   ├── variables.tf
│   ├── providers.tf
│   ├── backend.tf
│   ├── environments/
│   │   ├── dev.tfvars
│   │   ├── dev.tfvars.example
│   │   ├── prod.tfvars.example
│   └── README.md
├── stateless/                     # Ephemeral compute layer
│   ├── main.tf                    # Lambda, API Gateway
│   ├── outputs.tf
│   ├── variables.tf
│   ├── providers.tf
│   ├── backend.tf
│   ├── environments/
│   │   ├── dev.tfvars
│   │   ├── dev.tfvars.example
│   │   ├── prod.tfvars.example
│   └── README.md
├── modules/                       # Reusable Terraform modules
│   ├── s3_static_site/
│   ├── cloudfront_distribution/
│   ├── api_gateway_http/
│   ├── lambda_function/
│   └── dynamodb_table/
├── functions/
│   └── crud-visit/index.js
└── tests/
    ├── pre-deployment.test.js
    ├── post-deployment.test.js
    └── README.md
```

## Testing

El proyecto incluye pruebas automatizadas de infraestructura para validar el entorno antes y después del despliegue.

### Pruebas Pre-Despliegue

Validan que el entorno esté listo:
- Terraform instalado y configurado
- AWS CLI con credenciales válidas
- Archivos requeridos presentes
- Validación de configuración Terraform
- Sintaxis de funciones Lambda

```bash
cd tests
./run-pre-tests.sh
```

### Pruebas Post-Despliegue

Validan que los recursos estén funcionales:
- API Gateway health check
- Operaciones CRUD (crear/leer en DynamoDB)
- CloudFront distribution accesible
- Recursos AWS desplegados correctamente
- Lambda function operativa

```bash
cd tests
./run-post-tests.sh
```

Ver `tests/README.md` para documentación completa.

## Assumptions

- Region: us-east-1
- Remote state: S3 with DynamoDB state locking (use `global/bootstrap_state` to create it)
- CloudFront with OAC, custom error responses to serve `/index.html` on 403/404
- API Gateway: HTTP API (v2)
- Lambda: Node.js 20.x, 256 MB, 10s timeout, X-Ray enabled
- DynamoDB: On-demand billing, PK `id` (string), PITR enabled, SSE default
- CloudWatch logs retention: 1 day

## Usage

### 1) Bootstrap remote state (one-time setup)

```bash
cd global/bootstrap_state
terraform init
terraform apply -auto-approve
```

Record the `state_bucket` and `lock_table` outputs, then update the backend configuration in both `stateful/backend.tf` and `stateless/backend.tf`.

### 2) Deploy stateful layer

```bash
cd ../../stateful
cp environments/dev.tfvars.example environments/dev.tfvars
# Edit environments/dev.tfvars if needed

terraform init
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

This deploys: S3, CloudFront, DynamoDB (persistent data storage).

### 3) Deploy stateless layer

```bash
cd ../stateless
cp environments/dev.tfvars.example environments/dev.tfvars
# Update remote_state_bucket in dev.tfvars with bootstrap output

terraform init
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

This deploys: Lambda, API Gateway (ephemeral compute).

### 4) Run post-deployment tests

```bash
cd ../tests
./run-post-tests.sh
```

Validates all resources are functional.

### 5) Teardown (destroying infrastructure)

To destroy the infrastructure, follow the **reverse order** of deployment:

#### Step 1: Destroy stateless layer

```bash
cd stateless
terraform destroy -var-file=environments/dev.tfvars -auto-approve
```

This removes: Lambda, API Gateway.

#### Step 2: Destroy stateful layer

```bash
cd ../stateful
terraform destroy -var-file=environments/dev.tfvars -auto-approve
```

This removes: S3, CloudFront, DynamoDB.

#### Step 3: Destroy bootstrap state (optional)

⚠️ **Important**: The S3 bucket may contain Terraform state files. If you encounter the error:

```
Error: deleting S3 Bucket: BucketNotEmpty: The bucket you tried to delete is not empty
```

**Option A: Empty bucket manually (recommended)**
```bash
aws s3 rm s3://fp-aws-serverless-sample-1-tf-state --recursive
cd global/bootstrap_state
terraform destroy -auto-approve
```

**Option B: Enable force_destroy**

1. Edit `global/bootstrap_state/main.tf` and change `force_destroy = false` to `force_destroy = true` in the S3 bucket resource
2. Apply the change:
   ```bash
   cd global/bootstrap_state
   terraform apply -auto-approve
   terraform destroy -auto-approve
   ```

> **Note**: `force_destroy = true` allows Terraform to delete the S3 bucket even if it contains objects. Use with caution in production environments.

## Variables

- `project_name`: Prefix for resources, default `fp-aws-serverless-sample-1`
- `region`: AWS region, default `us-east-1`
- `tags`: Map of tags applied to resources
- `cors_allow_origins`: List of allowed origins for API CORS (default ["*"])

## Notes

- The S3 bucket is private and only accessible via CloudFront (OAC). A bucket policy is created in the environment to grant CloudFront access using the distribution ARN.
- CloudFront returns `/index.html` for SPA deep links on 403/404 responses from S3.
- The Lambda code is packaged from `functions/crud-visit/index.js` using the `archive_file` data source.
