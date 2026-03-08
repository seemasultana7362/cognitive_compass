locals {
  nova_pro_model_arn = "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.nova-pro-v1:0"
  titan_embed_arn    = "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.titan-embed-text-v2:0"
}

data "aws_iam_policy_document" "lambda_trust_policy" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

data "aws_iam_policy_document" "bedrock_trust_policy" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["bedrock.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "cc_comprehension_role" {
  name               = "cc-comprehension-agent-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust_policy.json
}

resource "aws_iam_policy" "cc_comprehension_policy" {
  name = "cc-comprehension-agent-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "bedrock:InvokeModel"
        Resource = local.nova_pro_model_arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cc_comprehension_vpc_attachment" {
  role       = aws_iam_role.cc_comprehension_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "cc_comprehension_policy_attachment" {
  role       = aws_iam_role.cc_comprehension_role.name
  policy_arn = aws_iam_policy.cc_comprehension_policy.arn
}

resource "aws_iam_role" "cc_cognitive_state_role" {
  name               = "cc-cognitive-state-agent-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust_policy.json
}

resource "aws_iam_policy" "cc_cognitive_state_policy" {
  name = "cc-cognitive-state-agent-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "bedrock:InvokeModel"
        Resource = local.nova_pro_model_arn
      },
      {
        Effect = "Allow"
        Action = ["timestream:WriteRecords", "timestream:DescribeTable"]
        Resource = aws_timestreamwrite_table.cc_interaction_events.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cc_cognitive_state_vpc_attachment" {
  role       = aws_iam_role.cc_cognitive_state_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "cc_cognitive_state_policy_attachment" {
  role       = aws_iam_role.cc_cognitive_state_role.name
  policy_arn = aws_iam_policy.cc_cognitive_state_policy.arn
}

resource "aws_iam_role" "cc_discovery_role" {
  name               = "cc-discovery-agent-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust_policy.json
}

resource "aws_iam_policy" "cc_discovery_policy" {
  name = "cc-discovery-agent-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["neptune-db:ReadDataViaQuery", "neptune-db:WriteDataViaQuery"]
        Resource = "arn:aws:neptune-db:${var.aws_region}:${var.aws_account_id}:${aws_neptune_cluster.cc_neptune_cluster.cluster_resource_id}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cc_discovery_vpc_attachment" {
  role       = aws_iam_role.cc_discovery_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "cc_discovery_policy_attachment" {
  role       = aws_iam_role.cc_discovery_role.name
  policy_arn = aws_iam_policy.cc_discovery_policy.arn
}

resource "aws_iam_role" "cc_knowledge_role" {
  name               = "cc-knowledge-agent-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust_policy.json
}

resource "aws_iam_policy" "cc_knowledge_policy" {
  name = "cc-knowledge-agent-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "aoss:APIAccessAll"
        Resource = aws_opensearchserverless_collection.cc_knowledge.arn
      },
      {
        Effect = "Allow"
        Action = "bedrock:InvokeModel"
        Resource = local.titan_embed_arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cc_knowledge_vpc_attachment" {
  role       = aws_iam_role.cc_knowledge_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "cc_knowledge_policy_attachment" {
  role       = aws_iam_role.cc_knowledge_role.name
  policy_arn = aws_iam_policy.cc_knowledge_policy.arn
}

resource "aws_iam_role" "cc_validation_role" {
  name               = "cc-validation-agent-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust_policy.json
}

resource "aws_iam_policy" "cc_validation_policy" {
  name = "cc-validation-agent-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "bedrock:InvokeModel"
        Resource = local.nova_pro_model_arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cc_validation_vpc_attachment" {
  role       = aws_iam_role.cc_validation_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "cc_validation_policy_attachment" {
  role       = aws_iam_role.cc_validation_role.name
  policy_arn = aws_iam_policy.cc_validation_policy.arn
}

resource "aws_iam_role" "cc_telemetry_processor_role" {
  name               = "cc-telemetry-processor-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust_policy.json
}

resource "aws_iam_policy" "cc_telemetry_processor_policy" {
  name = "cc-telemetry-processor-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["kinesis:GetRecords", "kinesis:GetShardIterator", "kinesis:ListShards", "kinesis:DescribeStream"]
        Resource = aws_kinesis_stream.cc_telemetry_stream.arn
      },
      {
        Effect = "Allow"
        Action = "timestream:WriteRecords"
        Resource = aws_timestreamwrite_table.cc_interaction_events.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cc_telemetry_processor_vpc_attachment" {
  role       = aws_iam_role.cc_telemetry_processor_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "cc_telemetry_processor_policy_attachment" {
  role       = aws_iam_role.cc_telemetry_processor_role.name
  policy_arn = aws_iam_policy.cc_telemetry_processor_policy.arn
}

resource "aws_iam_role" "cc_bedrock_agent_role" {
  name               = "cc-bedrock-agent-role"
  assume_role_policy = data.aws_iam_policy_document.bedrock_trust_policy.json
}

resource "aws_iam_policy" "cc_bedrock_agent_policy" {
  name = "cc-bedrock-agent-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["bedrock:InvokeAgent", "bedrock:InvokeModel"]
        Resource = [
          local.nova_pro_model_arn,
          local.titan_embed_arn
        ]
      },
      {
        Effect = "Allow"
        Action = "aoss:APIAccessAll"
        Resource = aws_opensearchserverless_collection.cc_knowledge.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cc_bedrock_agent_policy_attachment" {
  role       = aws_iam_role.cc_bedrock_agent_role.name
  policy_arn = aws_iam_policy.cc_bedrock_agent_policy.arn
}

output "comprehension_agent_role_arn" {
  description = "ARN of the comprehension agent IAM role"
  value       = aws_iam_role.cc_comprehension_role.arn
}

output "cognitive_state_agent_role_arn" {
  description = "ARN of the cognitive state agent IAM role"
  value       = aws_iam_role.cc_cognitive_state_role.arn
}

output "discovery_agent_role_arn" {
  description = "ARN of the discovery agent IAM role"
  value       = aws_iam_role.cc_discovery_role.arn
}

output "knowledge_agent_role_arn" {
  description = "ARN of the knowledge agent IAM role"
  value       = aws_iam_role.cc_knowledge_role.arn
}

output "validation_agent_role_arn" {
  description = "ARN of the validation agent IAM role"
  value       = aws_iam_role.cc_validation_role.arn
}

output "telemetry_processor_role_arn" {
  description = "ARN of the telemetry processor IAM role"
  value       = aws_iam_role.cc_telemetry_processor_role.arn
}

output "bedrock_agent_role_arn" {
  description = "ARN of the Bedrock agent IAM role"
  value       = aws_iam_role.cc_bedrock_agent_role.arn
}
