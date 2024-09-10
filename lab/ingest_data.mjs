import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";

const client = new SFNClient({});
const stateMachineArn = "<<< StateMachineArnHere >>>";

export async function handler(event, context) {
  try {
    // Loop through each record in the Kinesis event
    for (const record of event.Records) {
      // Kinesis data is base64 encoded, so we need to decode it
      const payload = Buffer.from(record.kinesis.data, 'base64').toString('utf-8');

      // Log the decoded data (optional, for debugging purposes)
      console.log(`Decoded record data: ${payload}`);

      // Start the Step Functions execution
      await client.send(new StartExecutionCommand({
        stateMachineArn: stateMachineArn,
        input: payload,
      }));
    }

    return true;
  } catch (error) {
    // Error Trigger
    console.error('Error processing records and starting Step Functions', error);
    throw new Error('Error processing records and starting Step Functions');
  }
};
