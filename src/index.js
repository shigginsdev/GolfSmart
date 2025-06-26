import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { AwsRum } from 'aws-rum-web';

try {
  const config = {
    sessionSampleRate: 1 ,
    endpoint: "https://dataplane.rum.us-east-2.amazonaws.com" ,
    telemetries: ["performance","errors","http", "resource"] ,
    allowCookies: true ,
    enableXRay: false ,
    signing: false // If you have a public resource policy and wish to send unsigned requests please set this to false
  };

  

  const APPLICATION_ID = '491787bd-e832-45b0-a85d-23d55fa84b26';
  const APPLICATION_VERSION = '1.0.0';
  const APPLICATION_REGION = 'us-east-2';

  const awsRum = new AwsRum(
    APPLICATION_ID,
    APPLICATION_VERSION,
    APPLICATION_REGION,
    config
  );
} catch (error) {
  // Ignore errors thrown during CloudWatch RUM web client initialization
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
