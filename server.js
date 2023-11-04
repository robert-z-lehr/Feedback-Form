// Import Dependencies
const express = require('express');
const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const cors = require('cors');
require('dotenv').config(); // Load environment variables from .env file

// Add winston for logging
const winston = require('winston');

// Configure winston to log error messages
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});

// Specify domain where client is hosted
app.use(cors({
  origin: 'https://your-github-pages-domain.com' // Replace this with your GitHub Pages URL
}));


// Create Express Application
const app = express();

// Define Port Number
const port = process.env.PORT || 3000;

// AWS Configuration
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1'
});

// AWS Secrets Manager Configuration
const secretName = "FeedbackForm-GitHub"; // Replace with your secret name
const awsRegion = "us-east-1"; // Replace with your AWS region
const secretsManagerClient = new SecretsManagerClient({
  region: awsRegion
});

// Nodemailer Transporter
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
    console.error('Error fetching secrets:', error);
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
  .catch(error => {
    console.error('Error setting up transporter:', error);
    throw error;
  });

// Middleware Setup
app.use(express.json()); // Parse JSON request bodies
app.use(express.static('public')); // Serve static files from the 'public' directory
app.use(cors()); // Enable CORS for cross-origin requests

// Route to Handle Sending Emails
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
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
    res.status(200).send('Email sent successfully');
  } catch (error) {
    logger.error('Error sending email:', error); // Log the error using winston
    res.status(500).send('We encountered an error while sending your email, please try again later.');
  }
});

// Start the Express Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
