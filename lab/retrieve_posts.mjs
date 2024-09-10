import { KinesisClient, PutRecordsCommand } from '@aws-sdk/client-kinesis';

const kinesisClient = new KinesisClient({ region: 'us-east-1' });

export async function handler(event, context) {
  const kinesisDataStreamName = "social-stream"
  const externalApiPath = "https://social.api.ssennett.net/posts";

  try {
    // Getting the posts from the external API
    const externalApiResponse = await fetch(externalApiPath);
    const data = await externalApiResponse.json();

    // Building a list of the posts for Kinesis
    const records = [];
    data.forEach(post => {
      records.push({
        Data: JSON.stringify(post),
        PartitionKey: 'posts'
      });
    });

    // Sending them to the Kinesis Data Stream
    const command = kinesisClient.send(new PutRecordsCommand({
      StreamName: kinesisDataStreamName,
      Records: records
    }));

    return command;
  } catch (error) {
    console.log(error);
    return error;
  }
}