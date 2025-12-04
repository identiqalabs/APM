import serverless from "serverless-http";
import app from "./server.js";

// Wrap existing Express app for AWS Lambda
export const handler = serverless(app);
