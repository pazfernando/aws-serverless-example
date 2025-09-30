variable "project_name" {
  type = string
}

variable "name" {
  type = string
}

variable "comment" {
  type    = string
  default = null
}

variable "default_root_object" {
  type    = string
  default = "index.html"
}

variable "s3_bucket_regional_domain_name" {
  type = string
}

variable "logging_bucket_domain_name" {
  type = string
}

variable "price_class" {
  type    = string
  default = "PriceClass_100"
}

variable "cache_policy_id" {
  type    = string
  default = null
}

variable "tags" {
  type    = map(string)
  default = {}
}
