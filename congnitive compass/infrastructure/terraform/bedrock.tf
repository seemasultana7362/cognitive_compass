data "aws_bedrock_foundation_model" "nova_pro" {
  model_id = "amazon.nova-pro-v1:0"
}

resource "aws_bedrockagent_agent" "cc_supervisor_agent" {
  agent_name = "cc-supervisor-agent"
  foundation_model = "amazon.nova-pro-v1:0"
  agent_resource_role_arn = aws_iam_role.cc_bedrock_agent_role.arn

  instruction = "You are the Cognitive Compass supervisor agent. Orchestrate sub-agents to detect developer confusion and deliver proactive code explanations."

  idle_session_ttl_in_seconds = 600

  tags = {
    Name = "cc-supervisor-agent"
  }
}

resource "aws_bedrockagent_knowledge_base" "cc_knowledge_base" {
  name = "cc-knowledge-base"
  description = "Cognitive Compass knowledge base for vector search"
  role_arn = aws_iam_role.cc_bedrock_agent_role.arn

  knowledge_base_configuration {
    type = "VECTOR"
    vector_knowledge_base_configuration {
      embedding_model_arn = "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.titan-embed-text-v2:0"
    }
  }

  storage_configuration {
    type = "OPENSEARCH_SERVERLESS"
    opensearch_serverless_configuration {
      collection_arn = aws_opensearchserverless_collection.cc_knowledge.arn
      vector_index_name = "cc-knowledge-index"
      field_mapping {
        vector_field = "embedding"
        text_field = "content"
        metadata_field = "metadata"
      }
    }
  }
}

resource "aws_bedrockagent_agent_knowledge_base" "cc_kb_association" {
  agent_id = aws_bedrockagent_agent.cc_supervisor_agent.agent_id
  knowledge_base_id = aws_bedrockagent_knowledge_base.cc_knowledge_base.knowledge_base_id
  knowledge_base_state = "ENABLED"
}

resource "aws_bedrockagent_agent_alias" "cc_production_alias" {
  agent_id = aws_bedrockagent_agent.cc_supervisor_agent.agent_id
  agent_alias_name = "production"

  tags = {
    Name = "cc-supervisor-agent-production"
  }
}
