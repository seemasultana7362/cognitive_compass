resource "aws_apigatewayv2_api" "cc_http_api" {
  name        = "cc-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
  }
}

resource "aws_apigatewayv2_integration" "cc_http_lambda_integration" {
  api_id = aws_apigatewayv2_api.cc_http_api.id

  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.cc_http_handler.invoke_arn
}

resource "aws_apigatewayv2_route" "cc_http_explain" {
  api_id = aws_apigatewayv2_api.cc_http_api.id
  route_key = "POST /explain"
  target = "integrations/${aws_apigatewayv2_integration.cc_http_lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "cc_http_sessions" {
  api_id = aws_apigatewayv2_api.cc_http_api.id
  route_key = "GET /sessions/{sessionId}"
  target = "integrations/${aws_apigatewayv2_integration.cc_http_lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "cc_http_health" {
  api_id = aws_apigatewayv2_api.cc_http_api.id
  route_key = "GET /health"
  target = "integrations/${aws_apigatewayv2_integration.cc_http_lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "cc_http_default_stage" {
  api_id = aws_apigatewayv2_api.cc_http_api.id
  name = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_api" "cc_websocket_api" {
  name = "cc-websocket-api"
  protocol_type = "WEBSOCKET"
  route_selection_expression = "$request.body.type"
}

resource "aws_apigatewayv2_integration" "cc_ws_lambda_integration" {
  api_id = aws_apigatewayv2_api.cc_websocket_api.id

  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.cc_websocket_handler.invoke_arn
}

resource "aws_apigatewayv2_route" "cc_ws_connect" {
  api_id = aws_apigatewayv2_api.cc_websocket_api.id
  route_key = "$connect"
  target = "integrations/${aws_apigatewayv2_integration.cc_ws_lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "cc_ws_disconnect" {
  api_id = aws_apigatewayv2_api.cc_websocket_api.id
  route_key = "$disconnect"
  target = "integrations/${aws_apigatewayv2_integration.cc_ws_lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "cc_ws_default" {
  api_id = aws_apigatewayv2_api.cc_websocket_api.id
  route_key = "$default"
  target = "integrations/${aws_apigatewayv2_integration.cc_ws_lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "cc_ws_production_stage" {
  api_id = aws_apigatewayv2_api.cc_websocket_api.id
  name = "production"
  auto_deploy = true
}

resource "aws_lambda_permission" "cc_http_api_permission" {
  statement_id = "AllowExecutionFromHTTPAPI"
  action = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cc_http_handler.function_name
  principal = "apigateway.amazonaws.com"
  source_arn = "${aws_apigatewayv2_api.cc_http_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "cc_ws_api_permission" {
  statement_id = "AllowExecutionFromWebSocketAPI"
  action = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cc_websocket_handler.function_name
  principal = "apigateway.amazonaws.com"
  source_arn = "${aws_apigatewayv2_api.cc_websocket_api.execution_arn}/*/*"
}
