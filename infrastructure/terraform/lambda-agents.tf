data "archive_file" "cc_comprehension_placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder-comprehension.zip"
  source {
    content      = "exports.handler = async () => ({ statusCode: 200 });"
    filename     = "index.js"
  }
}

data "archive_file" "cc_cognitive_state_placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder-cognitive-state.zip"
  source {
    content      = "exports.handler = async () => ({ statusCode: 200 });"
    filename     = "index.js"
  }
}

data "archive_file" "cc_discovery_placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder-discovery.zip"
  source {
    content      = "exports.handler = async () => ({ statusCode: 200 });"
    filename     = "index.js"
  }
}

data "archive_file" "cc_knowledge_placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder-knowledge.zip"
  source {
    content      = "exports.handler = async () => ({ statusCode: 200 });"
    filename     = "index.js"
  }
}

data "archive_file" "cc_validation_placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder-validation.zip"
  source {
    content      = "exports.handler = async () => ({ statusCode: 200 });"
    filename     = "index.js"
  }
}

data "archive_file" "cc_telemetry_processor_placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder-telemetry-processor.zip"
  source {
    content      = "exports.handler = async () => ({ statusCode: 200 });"
    filename     = "index.js"
  }
}

data "archive_file" "cc_http_handler_placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder-http-handler.zip"
  source {
    content      = "exports.handler = async () => ({ statusCode: 200 });"
    filename     = "index.js"
  }
}

data "archive_file" "cc_websocket_handler_placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder-websocket-handler.zip"
  source {
    content      = "exports.handler = async () => ({ statusCode: 200 });"
    filename     = "index.js"
  }
}

resource "aws_kinesis_stream" "cc_telemetry_stream" {
  name             = "cc-telemetry-stream"
  shard_count      = 1

  tags = {
    Name = "cc-telemetry-stream"
  }
}

resource "aws_lambda_function" "cc_comprehension_agent" {
  function_name = "cc-comprehension-agent"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  memory_size   = 1024
  timeout       = 30
  reserved_concurrent_executions = 100

  role    = aws_iam_role.cc_comprehension_role.arn
  filename = data.archive_file.cc_comprehension_placeholder.output_path
  source_code_hash = data.archive_file.cc_comprehension_placeholder.output_base64sha256

  vpc_config {
    subnet_ids         = [aws_subnet.cc_private_1.id, aws_subnet.cc_private_2.id]
    security_group_ids = [aws_security_group.cc_lambda_sg.id]
  }

  environment {
    variables = {
      REGION           = var.aws_region
      NEPTUNE_ENDPOINT = aws_neptune_cluster.cc_neptune_cluster.endpoint
      OPENSEARCH_ENDPOINT = aws_opensearchserverless_collection.cc_knowledge.collection_endpoint
      TIMESTREAM_DATABASE = aws_timestreamwrite_database.cc_telemetry_db.database_name
      TIMESTREAM_TABLE = aws_timestreamwrite_table.cc_interaction_events.table_name
      BEDROCK_MODEL_ID = "amazon.nova-pro-v1:0"
    }
  }

  tags = {
    "cc-project" = "cognitive-compass"
    "cc-phase"    = "backend"
  }
}

resource "aws_lambda_function" "cc_cognitive_state_agent" {
  function_name = "cc-cognitive-state-agent"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  memory_size   = 1024
  timeout       = 30
  reserved_concurrent_executions = 100

  role    = aws_iam_role.cc_cognitive_state_role.arn
  filename = data.archive_file.cc_cognitive_state_placeholder.output_path
  source_code_hash = data.archive_file.cc_cognitive_state_placeholder.output_base64sha256

  vpc_config {
    subnet_ids         = [aws_subnet.cc_private_1.id, aws_subnet.cc_private_2.id]
    security_group_ids = [aws_security_group.cc_lambda_sg.id]
  }

  environment {
    variables = {
      REGION           = var.aws_region
      NEPTUNE_ENDPOINT = aws_neptune_cluster.cc_neptune_cluster.endpoint
      OPENSEARCH_ENDPOINT = aws_opensearchserverless_collection.cc_knowledge.collection_endpoint
      TIMESTREAM_DATABASE = aws_timestreamwrite_database.cc_telemetry_db.database_name
      TIMESTREAM_TABLE = aws_timestreamwrite_table.cc_interaction_events.table_name
      BEDROCK_MODEL_ID = "amazon.nova-pro-v1:0"
    }
  }

  tags = {
    "cc-project" = "cognitive-compass"
    "cc-phase"    = "backend"
  }
}

resource "aws_lambda_function" "cc_discovery_agent" {
  function_name = "cc-discovery-agent"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  memory_size   = 1024
  timeout       = 30
  reserved_concurrent_executions = 100

  role    = aws_iam_role.cc_discovery_role.arn
  filename = data.archive_file.cc_discovery_placeholder.output_path
  source_code_hash = data.archive_file.cc_discovery_placeholder.output_base64sha256

  vpc_config {
    subnet_ids         = [aws_subnet.cc_private_1.id, aws_subnet.cc_private_2.id]
    security_group_ids = [aws_security_group.cc_lambda_sg.id]
  }

  environment {
    variables = {
      REGION           = var.aws_region
      NEPTUNE_ENDPOINT = aws_neptune_cluster.cc_neptune_cluster.endpoint
      OPENSEARCH_ENDPOINT = aws_opensearchserverless_collection.cc_knowledge.collection_endpoint
      TIMESTREAM_DATABASE = aws_timestreamwrite_database.cc_telemetry_db.database_name
      TIMESTREAM_TABLE = aws_timestreamwrite_table.cc_interaction_events.table_name
      BEDROCK_MODEL_ID = "amazon.nova-pro-v1:0"
    }
  }

  tags = {
    "cc-project" = "cognitive-compass"
    "cc-phase"    = "backend"
  }
}

resource "aws_lambda_function" "cc_knowledge_agent" {
  function_name = "cc-knowledge-agent"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  memory_size   = 1024
  timeout       = 30
  reserved_concurrent_executions = 100

  role    = aws_iam_role.cc_knowledge_role.arn
  filename = data.archive_file.cc_knowledge_placeholder.output_path
  source_code_hash = data.archive_file.cc_knowledge_placeholder.output_base64sha256

  vpc_config {
    subnet_ids         = [aws_subnet.cc_private_1.id, aws_subnet.cc_private_2.id]
    security_group_ids = [aws_security_group.cc_lambda_sg.id]
  }

  environment {
    variables = {
      REGION           = var.aws_region
      NEPTUNE_ENDPOINT = aws_neptune_cluster.cc_neptune_cluster.endpoint
      OPENSEARCH_ENDPOINT = aws_opensearchserverless_collection.cc_knowledge.collection_endpoint
      TIMESTREAM_DATABASE = aws_timestreamwrite_database.cc_telemetry_db.database_name
      TIMESTREAM_TABLE = aws_timestreamwrite_table.cc_interaction_events.table_name
      BEDROCK_MODEL_ID = "amazon.nova-pro-v1:0"
    }
  }

  tags = {
    "cc-project" = "cognitive-compass"
    "cc-phase"   = "backend"
  }
}

resource "aws_lambda_function" "cc_validation_agent" {
  function_name = "cc-validation-agent"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  memory_size   = 1024
  timeout       = 30
  reserved_concurrent_executions = 100

  role    = aws_iam_role.cc_validation_role.arn
  filename = data.archive_file.cc_validation_placeholder.output_path
  source_code_hash = data.archive_file.cc_validation_placeholder.output_base64sha256

  vpc_config {
    subnet_ids         = [aws_subnet.cc_private_1.id, aws_subnet.cc_private_2.id]
    security_group_ids = [aws_security_group.cc_lambda_sg.id]
  }

  environment {
    variables = {
      REGION           = var.aws_region
      NEPTUNE_ENDPOINT = aws_neptune_cluster.cc_neptune_cluster.endpoint
      OPENSEARCH_ENDPOINT = aws_opensearchserverless_collection.cc_knowledge.collection_endpoint
      TIMESTREAM_DATABASE = aws_timestreamwrite_database.cc_telemetry_db.database_name
      TIMESTREAM_TABLE = aws_timestreamwrite_table.cc_interaction_events.table_name
      BEDROCK_MODEL_ID = "amazon.nova-pro-v1:0"
    }
  }

  tags = {
    "cc-project" = "cognitive-compass"
    "cc-phase"    = "backend"
  }
}

resource "aws_lambda_function" "cc_telemetry_processor_agent" {
  function_name = "cc-telemetry-processor-agent"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  memory_size   = 1024
  timeout       = 30
  reserved_concurrent_executions = 100

  role    = aws_iam_role.cc_telemetry_processor_role.arn
  filename = data.archive_file.cc_telemetry_processor_placeholder.output_path
  source_code_hash = data.archive_file.cc_telemetry_processor_placeholder.output_base64sha256

  vpc_config {
    subnet_ids         = [aws_subnet.cc_private_1.id, aws_subnet.cc_private_2.id]
    security_group_ids = [aws_security_group.cc_lambda_sg.id]
  }

  environment {
    variables = {
      REGION           = var.aws_region
      NEPTUNE_ENDPOINT = aws_neptune_cluster.cc_neptune_cluster.endpoint
      OPENSEARCH_ENDPOINT = aws_opensearchserverless_collection.cc_knowledge.collection_endpoint
      TIMESTREAM_DATABASE = aws_timestreamwrite_database.cc_telemetry_db.database_name
      TIMESTREAM_TABLE = aws_timestreamwrite_table.cc_interaction_events.table_name
      BEDROCK_MODEL_ID = "amazon.nova-pro-v1:0"
    }
  }

  tags = {
    "cc-project" = "cognitive-compass"
    "cc-phase"    = "backend"
  }
}

resource "aws_lambda_event_source_mapping" "cc_telemetry_kinesis_esm" {
  event_source_arn = aws_kinesis_stream.cc_telemetry_stream.arn
  function_name   = aws_lambda_function.cc_telemetry_processor_agent.arn
  starting_position = "LATEST"
  batch_size       = 100
  bisect_batch_on_function_error = true
}

resource "aws_lambda_function" "cc_http_handler" {
  function_name = "cc-http-handler"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  memory_size   = 1024
  timeout       = 30

  role    = aws_iam_role.cc_comprehension_role.arn
  filename = data.archive_file.cc_http_handler_placeholder.output_path
  source_code_hash = data.archive_file.cc_http_handler_placeholder.output_base64sha256

  vpc_config {
    subnet_ids         = [aws_subnet.cc_private_1.id, aws_subnet.cc_private_2.id]
    security_group_ids = [aws_security_group.cc_lambda_sg.id]
  }

  environment {
    variables = {
      REGION           = var.aws_region
      NEPTUNE_ENDPOINT = aws_neptune_cluster.cc_neptune_cluster.endpoint
      OPENSEARCH_ENDPOINT = aws_opensearchserverless_collection.cc_knowledge.collection_endpoint
      TIMESTREAM_DATABASE = aws_timestreamwrite_database.cc_telemetry_db.database_name
      TIMESTREAM_TABLE = aws_timestreamwrite_table.cc_interaction_events.table_name
      BEDROCK_MODEL_ID = "amazon.nova-pro-v1:0"
    }
  }

  tags = {
    "cc-project" = "cognitive-compass"
    "cc-phase"    = "backend"
  }
}

resource "aws_lambda_function" "cc_websocket_handler" {
  function_name = "cc-websocket-handler"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  memory_size   = 1024
  timeout       = 30

  role    = aws_iam_role.cc_comprehension_role.arn
  filename = data.archive_file.cc_websocket_handler_placeholder.output_path
  source_code_hash = data.archive_file.cc_websocket_handler_placeholder.output_base64sha256

  vpc_config {
    subnet_ids         = [aws_subnet.cc_private_1.id, aws_subnet.cc_private_2.id]
    security_group_ids = [aws_security_group.cc_lambda_sg.id]
  }

  environment {
    variables = {
      REGION           = var.aws_region
      NEPTUNE_ENDPOINT = aws_neptune_cluster.cc_neptune_cluster.endpoint
      OPENSEARCH_ENDPOINT = aws_opensearchserverless_collection.cc_knowledge.collection_endpoint
      TIMESTREAM_DATABASE = aws_timestreamwrite_database.cc_telemetry_db.database_name
      TIMESTREAM_TABLE = aws_timestreamwrite_table.cc_interaction_events.table_name
      BEDROCK_MODEL_ID = "amazon.nova-pro-v1:0"
    }
  }

  tags = {
    "cc-project" = "cognitive-compass"
    "cc-phase"    = "backend"
  }
}
