resource "aws_opensearchserverless_security_policy" "cc_knowledge_encryption" {
  name = "cc-knowledge-enc"
  type = "encryption"

  policy = jsonencode({
    Rules = [
      {
        ResourceType = "collection"
        Resource = ["collection/cc-knowledge"]
      }
    ]
    AWSOwnedKey = true
  })
}

resource "aws_opensearchserverless_security_policy" "cc_knowledge_network" {
  name = "cc-knowledge-net"
  type = "network"

  policy = jsonencode({
    Rules = [
      {
        ResourceType = "collection"
        Resource = ["collection/cc-knowledge"]
      },
      {
        ResourceType = "dashboard"
        Resource = ["collection/cc-knowledge"]
      }
    ]
    AllowFromPublic = false
    SourceVPCEs = [aws_opensearchserverless_vpc_endpoint.cc_opensearch_vpc_endpoint.id]
  })
}

resource "aws_opensearchserverless_vpc_endpoint" "cc_opensearch_vpc_endpoint" {
  name       = "cc-opensearch-vpce"
  vpc_id     = aws_vpc.cc_vpc.id
  subnet_ids = [aws_subnet.cc_private_1.id]

  security_group_ids = [aws_security_group.cc_opensearch_sg.id]
}

resource "aws_opensearchserverless_collection" "cc_knowledge" {
  name        = "cc-knowledge"
  type        = "VECTORSEARCH"
  description = "Cognitive Compass knowledge vector store"

  depends_on = [
    aws_opensearchserverless_security_policy.cc_knowledge_encryption,
    aws_opensearchserverless_security_policy.cc_knowledge_network,
    aws_opensearchserverless_vpc_endpoint.cc_opensearch_vpc_endpoint
  ]
}

resource "aws_opensearchserverless_access_policy" "cc_knowledge_access" {
  name = "cc-knowledge-access"
  type = "data"

  policy = jsonencode({
    Rules = [
      {
        ResourceType = "collection"
        Resource = ["collection/cc-knowledge"]
      },
      {
        ResourceType = "index"
        Resource = ["index/cc-knowledge/*"]
      }
    ]
    Permissions = [
      "aoss:CreateCollectionItems",
      "aoss:DeleteCollectionItems",
      "aoss:UpdateCollectionItems",
      "aoss:DescribeCollectionItems",
      "aoss:CreateIndex",
      "aoss:DeleteIndex",
      "aoss:UpdateIndex",
      "aoss:DescribeIndex",
      "aoss:ReadDocument",
      "aoss:WriteDocument"
    ]
    Principal = [
      aws_iam_role.cc_bedrock_agent_role.arn
    ]
  })
}
