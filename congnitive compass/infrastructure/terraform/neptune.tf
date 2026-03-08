resource "aws_neptune_subnet_group" "cc_neptune_subnet_group" {
  name       = "cc-neptune-subnet-group"
  subnet_ids = [aws_subnet.cc_private_1.id, aws_subnet.cc_private_2.id]

  tags = {
    Name = "cc-neptune-subnet-group"
  }
}

resource "aws_neptune_cluster_parameter_group" "cc_neptune_params" {
  family = "neptune1.3"
  name   = "cc-neptune-params"

  tags = {
    Name = "cc-neptune-params"
  }
}

resource "aws_neptune_cluster" "cc_neptune_cluster" {
  cluster_identifier                  = "cc-neptune-cluster"
  engine                              = "neptune"
  engine_version                      = "1.3.0.0"
  vpc_security_group_ids              = [aws_security_group.cc_neptune_sg.id]
  neptune_subnet_group_name           = aws_neptune_subnet_group.cc_neptune_subnet_group.name
  neptune_cluster_parameter_group_name = aws_neptune_cluster_parameter_group.cc_neptune_params.name
  skip_final_snapshot                 = true
  iam_database_authentication_enabled = true
  deletion_protection                 = false
  apply_immediately                   = true

  tags = {
    Name = "cc-neptune-cluster"
  }
}

resource "aws_neptune_cluster_instance" "cc_neptune_instance" {
  count            = 1
  cluster_identifier = aws_neptune_cluster.cc_neptune_cluster.id
  instance_class   = "db.t3.medium"
  engine           = "neptune"
  apply_immediately = true
  identifier       = "cc-neptune-instance-${count.index}"

  tags = {
    Name = "cc-neptune-instance"
  }
}
