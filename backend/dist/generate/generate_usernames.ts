import { writeFile } from 'fs';
import { BedrockRuntime, InvokeModelCommand, ThrottlingException } from '@aws-sdk/client-bedrock-runtime';
import { fromSSO } from '@aws-sdk/credential-provider-sso';

const client = new BedrockRuntime({ region: "us-east-1", credentials: fromSSO({ profile: "sandbox" }) });

async function generateUsername() {
  const prompt = "Create a single Twitter username based either on a persons name with numbers, or a personal online alias. Only respond with the username itself.";

  const input = {
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      temperature: 1.0,
      top_p: 1,
      top_k: 500,
      max_tokens: 128,
      anthropic_version: "bedrock-2023-05-31",
    }),
    modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
    accept: "application/json",
    contentType: "application/json",
  };

  const command = new InvokeModelCommand(input);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await client.send(command);

      let decoder = new TextDecoder("utf-8");
      let decodedResponseBody = decoder.decode(response.body);

      const responseBody = JSON.parse(decodedResponseBody);
      const responseOutput = responseBody.content[0].text.replaceAll('"', '');

      return await {
        username: responseOutput,
      };
    } catch (e: any) {
      if (e instanceof ThrottlingException) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}> Throttled by AWS API, retrying in ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(`Unexcepted Exception Occurred: ${e}`);
        throw e;
      }
    }
  }

  throw new Error('Failed to generate post after maximum attempts');
}

async function writeUsernamesFile(users: Object, fileName: string = './usernames.json') {
  writeFile(fileName, JSON.stringify(users), (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
  });
}

async function main() {
  const usernameTarget = 250;

  let usernames: string[] = [];

  for (let i = 0; i < usernameTarget; i++) {
    const username = await generateUsername();
    usernames.push(username?.username);

    if (i % 5 == 0)
      console.info(`${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}> Username ${i} of ${usernameTarget} generated`);
  }

  await writeUsernamesFile(usernames);
}

main();