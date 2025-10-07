// otel-init.js
'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { awsEc2Detector, awsEksDetector, awsLambdaDetector } = require('@opentelemetry/resource-detector-aws');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { AWSXRayPropagator } = require('@opentelemetry/propagator-aws-xray');
const { diag, DiagConsoleLogger, DiagLogLevel, propagation } = require('@opentelemetry/api');
const { AwsInstrumentation } = require('@opentelemetry/instrumentation-aws-sdk');

// Evita doble inicialización si el wrapper requiere el archivo más de una vez
if (globalThis.__OTEL_INIT__) {
  return;
}
globalThis.__OTEL_INIT__ = true;

// (opcional) logs de diagnóstico
if (process.env.OTEL_DIAG_LOG_LEVEL === 'DEBUG') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

// (opcional) shutdown “limpio” cuando el proceso termine (no crítico en Lambda)
process.on('beforeExit', async () => {
  try { await Promise.resolve(sdk.shutdown?.()); } catch (e) { /* noop */ }
});
