terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  backend "s3" {
    # PLACEHOLDER: Replace with actual S3 bucket name
    bucket = "cc-terraform-state"
    # PLACEHOLDER: Replace with actual key path
    key    = "infrastructure/terraform.tfstate"
    # PLACEHOLDER: Replace with actual region
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      project     = var.project_name
      environment = var.environment
    }
  }
}
