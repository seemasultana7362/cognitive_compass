resource "aws_timestreamwrite_database" "cc_telemetry_db" {
  database_name = "cognitive-telemetry"

  tags = {
    Name = "cc-telemetry-db"
  }
}

resource "aws_timestreamwrite_table" "cc_interaction_events" {
  database_name = aws_timestreamwrite_database.cc_telemetry_db.database_name
  table_name    = "interaction-events"

  retention_properties {
    memory_store_retention_period_in_hours = 24
    magnetic_store_retention_period_in_days = 365
  }

  tags = {
    Name = "cc-interaction-events"
  }
}
