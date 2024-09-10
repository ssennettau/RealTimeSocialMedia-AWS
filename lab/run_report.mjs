import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const dynamoDbTableName = "social-sentiment-db";
const bedrockFoundationModel = "anthropic.claude-3-sonnet-20240229-v1:0";
const snsTopicArn = "<<< SnsTopicArnHere >>>";


export const handler = async (event) => {
  // Retrieve the posts
  const records = await getRecentRecords();

  // Split the posts into their sentiment categories
  const posts = categoriseRecords(records);

  // Summarise the feedback for each sentiment group
  const positiveFeedback = await summarisePosts(posts.positive);
  const negativeFeedback = await summarisePosts(posts.negative);

  // Consolidate our feedback into a summary
  const report = `
  Please see below the latest update of the reported sentiment for @BigShinyCorp
  
  Positive:
  ${positiveFeedback}

  Negative:
  ${negativeFeedback}`;

  // Send the report via SNS
  await sendNotification(report);

  return true;
};

async function getRecentRecords() {
  const dynamoDbClient = new DynamoDBClient({});

  console.log('Retrieving records from DynamoDB...');

  // Get the date details, and identify the range of records to retrieve
  const now = new Date(Date.now());

  const TODAY = now.toISOString().split('T')[0];
  const END_TIME = now.getTime();
  const START_TIME = END_TIME - 600000;

  // Prepare the request for DynamoDB
  const command = new QueryCommand({
    TableName: dynamoDbTableName,
    KeyConditionExpression: "CreationDate = :today AND EpochTimestamp BETWEEN :start_time AND :end_time",
    ExpressionAttributeValues: {
      ":today": { S: TODAY },
      ":start_time": { N: START_TIME.toString() },
      ":end_time": { N: END_TIME.toString() },
    },
  });

  try {
    // Attempt to return the records directly from DynamoDB
    const recentRecords = await dynamoDbClient.send(command);

    return recentRecords;
  } catch (error) {
    console.error('uh oh> ', error)
  }
}

function categoriseRecords(records) {
  console.log('Categorising records by sentiment...');

  let positive = [];
  let negative = [];

  // Filter the records, and add them to their respective categories
  positive.push(records.Items.filter((record) => {
    return record.Sentiment.S == "POSITIVE";
  }));
  negative.push(records.Items.filter((record) => {
    return record.Sentiment.S == "NEGATIVE";
  }));

  return { positive: positive[0], negative: negative[0] };
}

async function summarisePosts(posts) {
  const bedrockClient = new BedrockRuntimeClient({});

  console.log('Generating summary from Amazon Bedrock...');

  // Grab three examples of the posts (not randomised, and only a limited range)
  const examples = posts.slice(0, 3);

  // Construct the prompt to be sent to Claude
  let prompt = "Summarise the common themes in the following posts into a single paragraph. Do not explain the intention of the prompt.\n";
  examples.forEach((post, index) => {
    prompt += `\nPost ${index + 1}: ${post.Message.S}`;
  });

  try {
    // Send the summary request prompt to Claude using the Messages API
    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: bedrockFoundationModel,
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 256,
          temperature: 0.75,
          anthropic_version: "bedrock-2023-05-31",
        }),
      })
    );

    // Decode the response body from bytes to a string (it's a bit messy)
    let decoder = new TextDecoder("utf-8");
    let decodedResponseBody = decoder.decode(response.body);
    const responseBody = JSON.parse(decodedResponseBody);
    let summary = responseBody.content[0].text;
    summary = summary.substring(summary.lastIndexOf('\n') + 1);

    // Return the final summary
    return summary;
  } catch (error) {
    console.error('uh oh> ', error)
  }
}

async function sendNotification(summary) {
  const snsClient = new SNSClient({});

  try {
    // Send the notification via SNS
    console.log('Sending notification...');
    const response = await snsClient.send(
      new PublishCommand({
        TopicArn: snsTopicArn,
        Message: summary,
      })
    );

    console.log('Notification sent successfully> ', response);

    return true;
  } catch (error) {
    console.error('uh oh> ', error)
  }
}