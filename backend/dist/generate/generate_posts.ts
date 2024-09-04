import { readFileSync, writeFile } from 'fs';
import { BedrockRuntimeClient, InvokeModelCommand, ThrottlingException } from "@aws-sdk/client-bedrock-runtime";
import { fromSSO } from "@aws-sdk/credential-provider-sso";

const promptList = JSON.parse(
  readFileSync("./prompt_list.json", "utf-8")
);

const client = new BedrockRuntimeClient({ region: "us-east-1", credentials: fromSSO({ profile: "sandbox" }) });

type SentimentArrays = {
  positive: string[];
  neutral: string[];
  negative: string[];
};

type Post = {
  sentimentCategory: keyof SentimentArrays;
  postContents: string;
};

function determinePrompt(positiveWeight: number = 1, neutralWeight: number = 1, negativeWeight: number = 1) {
  const weights = [positiveWeight, neutralWeight, negativeWeight];
  const sentiments = Object.keys(promptList.sentimentPrompts) as Array<keyof SentimentArrays>;

  let weightedSentiments: number[] = [];

  for (let x = 0; x < sentiments.length; x++) {
    for (let y = 0; y < weights[x]; y++) {
      weightedSentiments.push(x);
    }
  }

  const sentimentIndex = Math.floor(Math.random() * weightedSentiments.length);
  const sentimentCategory = sentiments[weightedSentiments[sentimentIndex]];

  const promptIndex = Math.floor(Math.random() * promptList.sentimentPrompts[sentimentCategory].length);
  const promptContents = promptList.sentimentPrompts[sentimentCategory][promptIndex];

  return {
    sentimentCategory,
    promptIndex,
    promptContents,
  };
}

async function generatePost(promptAppend: string) {
  const prompt = `${promptList.prefix} ${promptAppend}`

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
        }
      ],
      temperature: 1.0,
      top_p: 1,
      top_k: 500,
      max_tokens: 256,
      anthropic_version: "bedrock-2023-05-31",
    }),
    modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    accept: "application/json",
    contentType: "application/json",
  };

  const command = new InvokeModelCommand(input);

  // Attempt to send command. If invoking to many requests, backoff
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await client.send(command);

      let decoder = new TextDecoder("utf-8");
      let decodedResponseBody = decoder.decode(response.body);

      const responseBody = JSON.parse(decodedResponseBody);
      const responseOutput = responseBody.content[0].text.replaceAll('"', '');

      return await {
        prompt,
        response: responseOutput,
        inputTokens: responseBody.usage.input_tokens,
        outputTokens: responseBody.usage.output_tokens,
        cost: {
          haiku:
            (responseBody.usage.input_tokens / 1000) * 0.00025 +
            (responseBody.usage.output_tokens / 1000) * 0.00125
        },
      };
    } catch (e: any) {
      if (e instanceof ThrottlingException) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}> Throttled by AWS API, retrying in ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(`Unexcepted Exception Occured: ${e}`);
        throw e;
      }
    }
  }

  throw new Error('Failed to generate post after maximum attempts');
}

function categorisePosts(posts: Post[]): SentimentArrays {
  let categorisedPosts: SentimentArrays = {
    positive: [],
    neutral: [],
    negative: [],
  };

  for (let post of posts) {
    // Add post to the appropriate array based on sentiment (Typescript)
    categorisedPosts[post.sentimentCategory].push(post.postContents);
  }

  return categorisedPosts;
}

async function writePostsFile(posts: Object, fileName: string = '.\posts.json') {
  writeFile(fileName, JSON.stringify(posts), (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
  });
}

async function main() {
  const postTarget = 2500;

  let posts: Post[] = [];
  let totalCost: number = 0;

  for (let i = 0; i < postTarget; i++) {
    const prompt = determinePrompt(1, 3, 1);
    const post = await generatePost(prompt.promptContents);

    totalCost += post.cost.haiku;

    //console.log(post);
    posts.push({
      sentimentCategory: prompt.sentimentCategory,
      postContents: post.response,
    });

    if (i % 5 == 0)
      console.info(`${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}> Post ${i} of ${postTarget} generated ($${totalCost})`);
  }

  const finalPosts = categorisePosts(posts);
  await writePostsFile(finalPosts, './posts.json');

  console.log(`Final Cost: $${totalCost}`);
}


main();