const express = require('express');
const nodemailer = require('nodemailer');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const cors = require('cors');

const app = express();
const port = 3000;

const secret_name = "FeedbackForm-GitHub";
const region = "us-east-1";

const client = new SecretsManagerClient({
  region: region
});

let transporter;

async function fetchSecrets() {
  let response;
  try {
    response = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT"
      })
    );
  } catch (error) {
    throw error;
  }
  return JSON.parse(response.SecretString);
}

fetchSecrets().then(secret => {
  const senderEmail = secret["my email"];
  const appPassword = secret["feedback form app password"];
  
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: senderEmail,
      pass: appPassword
    }
  });
}).catch(console.error);

app.use(express.json());
app.use(express.static('public'));
app.use(cors());

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
    res.status(200).send('Email sent successfully');
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
