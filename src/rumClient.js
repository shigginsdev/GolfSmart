// src/rumClient.js
import { AwsRum } from 'aws-rum-web';

const config = {
  sessionSampleRate: 1,
  endpoint: "https://dataplane.rum.us-east-2.amazonaws.com",
  telemetries: ["performance", "errors", "http", "resource"],
  allowCookies: true,
  enableXRay: false,
  signing: false,
};

export const APPLICATION_ID   = '491787bd-e832-45b0-a85d-23d55fa84b26';
export const APPLICATION_VERSION = '1.0.0';
export const APPLICATION_REGION  = 'us-east-2';

export const awsRum = new AwsRum(
  APPLICATION_ID,
  APPLICATION_VERSION,
  APPLICATION_REGION,
  config
);

// optional global hook
window.onerror = (msg, src, line, col, err) => {
  awsRum.recordError(err || new Error(msg));
};
