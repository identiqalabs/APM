// lambda.js
import serverless from "serverless-http";
import app from "./server.js";

console.log("Lambda module loaded");

export const handler = serverless(app, {
  request: (req, event, context) => {
    console.log("Incoming event:", event);
  },
});
