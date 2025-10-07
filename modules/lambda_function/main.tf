locals {
  build_dir = "${path.module}/.build/${var.function_name}"
  src_dir_abs = abspath(var.source_dir)
}

resource "null_resource" "npm_install" {
  triggers = {
    src_hash = sha256(join("", [
      for f in fileset(local.src_dir_abs, "**/*") : filesha256("${local.src_dir_abs}/${f}")
    ]))
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-lc"]
    command = <<-EOT
      set -euo pipefail
      rm -rf "${local.build_dir}"
      mkdir -p "${local.build_dir}"
      rsync -a --exclude node_modules --exclude .git "${local.src_dir_abs}/" "${local.build_dir}/"
      if [ -f "${local.build_dir}/package-lock.json" ]; then
        (cd "${local.build_dir}" && npm ci --omit=dev)
      elif [ -f "${local.build_dir}/package.json" ]; then
        (cd "${local.build_dir}" && npm install --omit=dev)
      fi
    EOT
  }
}

data "archive_file" "package" {
  type        = "zip"
  source_dir  = local.build_dir
  output_path = "${path.module}/.build/${var.function_name}.zip"
  depends_on  = [null_resource.npm_install]
}

resource "aws_iam_role" "lambda_role" {
  name               = "${var.project_name}-${var.function_name}-role"
  assume_role_policy = data.aws_iam_policy_document.assume_lambda.json
  tags               = var.tags
}

data "aws_iam_policy_document" "assume_lambda" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.project_name}-${var.function_name}"
  retention_in_days = 1
  tags              = var.tags
}

resource "aws_iam_role_policy" "lambda_basic" {
  name   = "${var.project_name}-${var.function_name}-basic"
  role   = aws_iam_role.lambda_role.id
  policy = data.aws_iam_policy_document.lambda_basic.json
}

data "aws_iam_policy_document" "lambda_basic" {
  statement {
    actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["*"]
  }
  statement {
    actions   = ["xray:PutTraceSegments", "xray:PutTelemetryRecords", "xray:BatchGetTraces"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "dynamodb_access" {
  count  = var.enable_dynamodb_access ? 1 : 0
  name   = "${var.project_name}-${var.function_name}-dynamodb"
  role   = aws_iam_role.lambda_role.id
  policy = data.aws_iam_policy_document.dynamodb_access.json
}

data "aws_iam_policy_document" "dynamodb_access" {
  statement {
    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan"
    ]
    resources = [var.dynamodb_table_arn]
  }
}

resource "aws_lambda_function" "this" {
  function_name = "${var.project_name}-${var.function_name}"
  role          = aws_iam_role.lambda_role.arn
  handler       = var.handler
  runtime       = var.runtime
  timeout       = var.timeout
  memory_size   = var.memory_size

  filename         = data.archive_file.package.output_path
  source_code_hash = data.archive_file.package.output_base64sha256

  environment {
    variables = var.environment
  }

  tracing_config {
    mode = "Active"
  }

  layers = var.layers

  tags = var.tags
}
