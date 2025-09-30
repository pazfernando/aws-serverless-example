variable "project_name" {
  type = string
}

variable "function_name" {
  type = string
}

variable "runtime" {
  type    = string
  default = "nodejs20.x"
}

variable "handler" {
  type    = string
  default = "index.handler"
}

variable "timeout" {
  type    = number
  default = 10
}

variable "memory_size" {
  type    = number
  default = 256
}

variable "source_dir" {
  type = string
}

variable "environment" {
  type    = map(string)
  default = {}
}

variable "dynamodb_table_arn" {
  type    = string
  default = null
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "enable_dynamodb_access" {
  type    = bool
  default = false
}
