output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.cc_vpc.id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = [aws_subnet.cc_private_1.id, aws_subnet.cc_private_2.id]
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = [aws_subnet.cc_public_1.id, aws_subnet.cc_public_2.id]
}

output "neptune_cluster_endpoint" {
  description = "Endpoint for the Neptune cluster"
  value       = aws_neptune_cluster.cc_neptune_cluster.endpoint
}

output "neptune_reader_endpoint" {
  description = "Reader endpoint for the Neptune cluster"
  value       = aws_neptune_cluster.cc_neptune_cluster.reader_endpoint
}

output "neptune_port" {
  description = "Port for the Neptune cluster"
  value       = aws_neptune_cluster.cc_neptune_cluster.port
}

output "opensearch_collection_endpoint" {
  description = "Endpoint for the OpenSearch collection"
  value       = aws_opensearchserverless_collection.cc_knowledge.collection_endpoint
}

output "opensearch_collection_arn" {
  description = "ARN for the OpenSearch collection"
  value       = aws_opensearchserverless_collection.cc_knowledge.arn
}

output "timestream_database_arn" {
  description = "ARN of the Timestream database"
  value       = aws_timestreamwrite_database.cc_telemetry_db.arn
}

output "timestream_table_arn" {
  description = "ARN of the Timestream table"
  value       = aws_timestreamwrite_table.cc_interaction_events.arn
}

output "http_api_endpoint" {
  description = "Endpoint for the HTTP API"
  value       = aws_apigatewayv2_api.cc_http_api.api_endpoint
}

output "websocket_api_endpoint" {
  description = "Endpoint for the WebSocket API"
  value       = "${aws_apigatewayv2_api.cc_websocket_api.api_endpoint}/${aws_apigatewayv2_stage.cc_ws_production_stage.name}"
}

output "kinesis_stream_arn" {
  description = "ARN of the Kinesis stream"
  value       = aws_kinesis_stream.cc_telemetry_stream.arn
}

output "comprehension_agent_arn" {
  description = "ARN of the comprehension Lambda function"
  value       = aws_lambda_function.cc_comprehension_agent.arn
}

output "cognitive_state_agent_arn" {
  description = "ARN of the cognitive state Lambda function"
  value       = aws_lambda_function.cc_cognitive_state_agent.arn
}

output "discovery_agent_arn" {
  description = "ARN of the discovery Lambda function"
  value       = aws_lambda_function.cc_discovery_agent.arn
}

output "knowledge_agent_arn" {
  description = "ARN of the knowledge Lambda function"
  value       = aws_lambda_function.cc_knowledge_agent.arn
}

output "validation_agent_arn" {
  description = "ARN of the validation Lambda function"
  value       = aws_lambda_function.cc_validation_agent.arn
}

output "telemetry_processor_arn" {
  description = "ARN of the telemetry processor Lambda function"
  value       = aws_lambda_function.cc_telemetry_processor_agent.arn
}

output "bedrock_agent_id" {
  description = "ID of the Bedrock agent"
  value       = aws_bedrockagent_agent.cc_supervisor_agent.agent_id
}

output "bedrock_agent_alias_id" {
  description = "ID of the Bedrock agent alias"
  value       = aws_bedrockagent_agent_alias.cc_production_alias.agent_alias_id
}
