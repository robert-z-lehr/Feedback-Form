// Import the Express.js library for creating the server application.
const express = require('express');

// Import the Nodemailer library for sending emails.
const nodemailer = require('nodemailer');

// Import necessary components from the AWS SDK for Secrets Manager.
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

// Import the CORS middleware to enable Cross-Origin Resource Sharing (CORS).
const cors = require('cors');

// Create an Express.js application.
const app = express();

// Define the port number for the server to listen on.
const port = 3000;

// AWS Secrets Manager configuration
const secretName = "FeedbackForm-GitHub"; // Replace with your secret name
const awsRegion = "us-east-1"; // Replace with your AWS region

const secretsManagerClient = new SecretsManagerClient({
  region: awsRegion
});

let transporter;

// Function to fetch secrets from AWS Secrets Manager
async function fetchSecrets() {
  try {
    const response = await secretsManagerClient.send(
      new GetSecretValueCommand({
        SecretId: secretName,
        VersionStage: "AWSCURRENT"
      })
    );

    // Parse the secret string as JSON
    return JSON.parse(response.SecretString);
  } catch (error) {
    throw error;
  }
}

// Fetch secrets and set up the Nodemailer transporter
fetchSecrets()
  .then(secret => {
    const senderEmail = secret["my email"];
    const appPassword = secret["feedback form app password"];

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: senderEmail,
        pass: appPassword
      }
    });
  })
  .catch(console.error);

// Middleware setup
app.use(express.json()); // Parse JSON request bodies
app.use(express.static('public')); // Serve static files from the 'public' directory
app.use(cors()); // Enable CORS for cross-origin requests

// Route to handle sending emails
app.post('/sendEmail', async (req, res) => {
  const { type, body } = req.body;
  const subject = `GitHub Feedback Form - ${type}`;

  const mailOptions = {
    from: transporter.options.auth.user,
    to: transporter.options.auth.user,
    subject: subject,
    text: body
  };

  try {
    // Send the email using Nodemailer
    await transporter.sendMail(mailOptions);
    res.status(200).send('Email sent successfully');
  } catch (error) {
    console.log(error); // Log the error for debugging purposes
    res.status(500).send('Internal Server Error'); // Respond with a 500 status for server errors
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
