'use strict';

/**
 * email-sender Lambda
 * -------------------
 * Triggered by the SQS email queue. Each SQS message body is a JSON
 * email job; this function sends it through Amazon SES.
 *
 * Expected message body (JSON):
 *   {
 *     "to": "user@example.com" | ["a@x.com","b@y.com"],
 *     "subject": "Welcome",
 *     "html": "<h1>Hi</h1>",          // optional
 *     "text": "Hi",                   // optional (fallback)
 *     "from": "no-reply@domain.com",  // optional, overrides SES_FROM_EMAIL
 *     "replyTo": "support@domain.com" // optional
 *   }
 *
 * Uses partial batch failure: only messages that fail are returned to the
 * queue (and eventually the DLQ), successful ones are deleted.
 *
 * @aws-sdk/client-ses is bundled in the nodejs20.x runtime — no deps to ship.
 */

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: process.env.SES_REGION || process.env.AWS_REGION });
const DEFAULT_FROM = process.env.SES_FROM_EMAIL;

function toAddressList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function sendOne(job) {
  const to = toAddressList(job.to);
  if (to.length === 0) throw new Error('email job missing "to"');
  if (!job.subject) throw new Error('email job missing "subject"');
  if (!job.html && !job.text) throw new Error('email job needs "html" or "text"');

  const from = job.from || DEFAULT_FROM;
  if (!from) throw new Error('no From address (set SES_FROM_EMAIL or job.from)');

  const body = {};
  if (job.html) body.Html = { Data: job.html, Charset: 'UTF-8' };
  if (job.text) body.Text = { Data: job.text, Charset: 'UTF-8' };

  const command = new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: to },
    ReplyToAddresses: job.replyTo ? toAddressList(job.replyTo) : undefined,
    Message: {
      Subject: { Data: job.subject, Charset: 'UTF-8' },
      Body: body,
    },
  });

  const res = await ses.send(command);
  return res.MessageId;
}

exports.handler = async (event) => {
  const records = event.Records || [];
  const batchItemFailures = [];

  for (const record of records) {
    try {
      const job = JSON.parse(record.body);
      const messageId = await sendOne(job);
      console.log(`sent messageId=${messageId} to=${JSON.stringify(job.to)}`);
    } catch (err) {
      // Returning the messageId keeps it in the queue for retry / DLQ.
      console.error(`failed sqsMessageId=${record.messageId}: ${err.message}`);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
