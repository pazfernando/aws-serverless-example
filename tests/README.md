# Infrastructure Tests

Este directorio contiene pruebas automatizadas para validar la infraestructura antes y después del despliegue.

## Estructura

```
tests/
├── package.json              # Dependencias para las pruebas
├── pre-deployment.test.js    # Pruebas pre-despliegue
├── post-deployment.test.js   # Pruebas post-despliegue
├── run-pre-tests.sh          # Script para ejecutar pruebas pre-despliegue
├── run-post-tests.sh         # Script para ejecutar pruebas post-despliegue
└── README.md                 # Esta documentación
```

## Pruebas Pre-Despliegue

Validan que el entorno esté listo para el despliegue:

1. **Terraform instalado** - Verifica la instalación de Terraform
2. **AWS CLI configurado** - Valida credenciales AWS
3. **Archivos requeridos** - Confirma existencia de archivos necesarios
4. **Validación Terraform** - Ejecuta `terraform validate`
5. **Sintaxis Lambda** - Verifica sintaxis de funciones Lambda
6. **Formato Terraform** - Revisa formato del código

### Ejecutar

```bash
# Opción 1: Usar el script shell
cd tests
chmod +x run-pre-tests.sh
./run-pre-tests.sh

# Opción 2: Ejecutar directamente con npm
cd tests
npm install
npm run test:pre
```

## Pruebas Post-Despliegue

Validan que los recursos estén desplegados y funcionales:

1. **API Gateway Health** - Prueba el endpoint `/health`
2. **Operaciones CRUD** - Crea y recupera un registro en DynamoDB
3. **CloudFront Distribution** - Verifica accesibilidad del CDN
4. **Recursos AWS** - Confirma existencia de S3 y DynamoDB
5. **Lambda Function** - Verifica la función Lambda
6. **API Gateway** - Confirma configuración del API

### Ejecutar

```bash
# Opción 1: Usar el script shell
cd tests
chmod +x run-post-tests.sh
./run-post-tests.sh

# Opción 2: Ejecutar directamente con npm
cd tests
npm install
npm run test:post
```

## Flujo de Trabajo Recomendado

### 1. Antes del Despliegue

```bash
# Ejecutar pruebas pre-despliegue
cd tests
./run-pre-tests.sh
```

Si todas las pruebas pasan, proceder con el despliegue:

```bash
# Deploy stateful layer
cd ../stateful
terraform init
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars

# Deploy stateless layer
cd ../stateless
terraform init
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

### 2. Después del Despliegue

```bash
# Ejecutar pruebas post-despliegue
cd tests
./run-post-tests.sh
```

### 3. Pipeline Completo

Puedes combinar ambas pruebas en un pipeline:

```bash
#!/bin/bash
set -e

# Pre-deployment tests
cd tests
./run-pre-tests.sh

# Deploy stateful layer
cd ../stateful
terraform apply -var-file=environments/dev.tfvars -auto-approve

# Deploy stateless layer
cd ../stateless
terraform apply -var-file=environments/dev.tfvars -auto-approve

# Post-deployment tests
cd ../tests
./run-post-tests.sh
```

## Requisitos

- **Node.js** 18+ (para ejecutar los scripts de prueba)
- **Terraform** (para validación pre-despliegue)
- **AWS CLI** configurado con credenciales válidas
- **npm** (para instalar dependencias)

## Dependencias

Las pruebas usan los siguientes paquetes:

- `@aws-sdk/client-cloudfront` - Cliente CloudFront
- `@aws-sdk/client-dynamodb` - Cliente DynamoDB
- `@aws-sdk/client-lambda` - Cliente Lambda
- `@aws-sdk/client-apigatewayv2` - Cliente API Gateway v2
- `axios` - Cliente HTTP para pruebas de endpoints

## Interpretación de Resultados

### Código de Salida

- `0` - Todas las pruebas pasaron ✓
- `1` - Algunas pruebas fallaron ✗

### Ejemplo de Salida Exitosa

```
========================================
  PRE-DEPLOYMENT INFRASTRUCTURE TESTS
========================================

Test 1: Checking Terraform installation...
✓ Terraform is installed
  Version: Terraform v1.6.0

Test 2: Checking AWS CLI configuration...
✓ AWS CLI is configured
  Account: 123456789012

...

========================================
  TEST SUMMARY
========================================
Passed: 6
Failed: 0
Total:  6

✓ All pre-deployment tests passed! Ready to deploy.
```

## Personalización

Puedes modificar los scripts de prueba para:

- Agregar más validaciones específicas
- Cambiar timeouts de API
- Personalizar mensajes de salida
- Integrar con sistemas de CI/CD

## Integración CI/CD

Ejemplo para GitHub Actions:

```yaml
- name: Run Pre-Deployment Tests
  run: |
    cd tests
    npm install
    npm run test:pre

- name: Deploy Infrastructure
  run: |
    cd stateful
    terraform apply -var-file=environments/dev.tfvars -auto-approve
    cd ../stateless
    terraform apply -var-file=environments/dev.tfvars -auto-approve

- name: Run Post-Deployment Tests
  run: |
    cd tests
    npm run test:post
```
