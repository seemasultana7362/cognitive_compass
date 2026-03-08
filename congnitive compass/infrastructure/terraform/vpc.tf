data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "cc_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "cc-vpc"
  }
}

resource "aws_subnet" "cc_private_1" {
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = false
  vpc_id                   = aws_vpc.cc_vpc.id

  tags = {
    Name = "cc-private-1"
  }
}

resource "aws_subnet" "cc_private_2" {
  cidr_block              = "10.0.2.0/24"
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = false
  vpc_id                   = aws_vpc.cc_vpc.id

  tags = {
    Name = "cc-private-2"
  }
}

resource "aws_subnet" "cc_public_1" {
  cidr_block              = "10.0.101.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
  vpc_id                   = aws_vpc.cc_vpc.id

  tags = {
    Name = "cc-public-1"
  }
}

resource "aws_subnet" "cc_public_2" {
  cidr_block              = "10.0.102.0/24"
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true
  vpc_id                   = aws_vpc.cc_vpc.id

  tags = {
    Name = "cc-public-2"
  }
}

resource "aws_internet_gateway" "cc_igw" {
  vpc_id = aws_vpc.cc_vpc.id

  tags = {
    Name = "cc-igw"
  }
}

resource "aws_eip" "cc_nat_eip" {
  domain = "vpc"

  tags = {
    Name = "cc-nat-eip"
  }
}

resource "aws_nat_gateway" "cc_nat_gw" {
  allocation_id = aws_eip.cc_nat_eip.id
  subnet_id     = aws_subnet.cc_public_1.id
  depends_on    = [aws_internet_gateway.cc_igw]

  tags = {
    Name = "cc-nat-gw"
  }
}

resource "aws_route_table" "cc_public_rt" {
  vpc_id = aws_vpc.cc_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.cc_igw.id
  }

  tags = {
    Name = "cc-public-rt"
  }
}

resource "aws_route_table_association" "cc_public_1_assoc" {
  subnet_id      = aws_subnet.cc_public_1.id
  route_table_id = aws_route_table.cc_public_rt.id
}

resource "aws_route_table_association" "cc_public_2_assoc" {
  subnet_id      = aws_subnet.cc_public_2.id
  route_table_id = aws_route_table.cc_public_rt.id
}

resource "aws_route_table" "cc_private_rt" {
  vpc_id = aws_vpc.cc_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.cc_nat_gw.id
  }

  tags = {
    Name = "cc-private-rt"
  }
}

resource "aws_route_table_association" "cc_private_1_assoc" {
  subnet_id      = aws_subnet.cc_private_1.id
  route_table_id = aws_route_table.cc_private_rt.id
}

resource "aws_route_table_association" "cc_private_2_assoc" {
  subnet_id      = aws_subnet.cc_private_2.id
  route_table_id = aws_route_table.cc_private_rt.id
}

resource "aws_security_group" "cc_lambda_sg" {
  name        = "cc-lambda-sg"
  description = "Security group for Lambda functions"
  vpc_id      = aws_vpc.cc_vpc.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "cc-lambda-sg"
  }
}

resource "aws_security_group" "cc_neptune_sg" {
  name        = "cc-neptune-sg"
  description = "Security group for Neptune cluster"
  vpc_id      = aws_vpc.cc_vpc.id

  ingress {
    from_port       = 8182
    to_port         = 8182
    protocol        = "tcp"
    security_groups = [aws_security_group.cc_lambda_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.0.0.0/16"]
  }

  tags = {
    Name = "cc-neptune-sg"
  }
}

resource "aws_security_group" "cc_opensearch_sg" {
  name        = "cc-opensearch-sg"
  description = "Security group for OpenSearch Serverless"
  vpc_id      = aws_vpc.cc_vpc.id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.cc_lambda_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.0.0.0/16"]
  }

  tags = {
    Name = "cc-opensearch-sg"
  }
}
