import { readFileSync, writeFile } from "fs";
import { TranslateClient, TranslateTextCommand, TooManyRequestsException } from '@aws-sdk/client-translate';
import { fromSSO } from '@aws-sdk/credential-provider-sso';

const postsStore = JSON.parse(
  readFileSync("./posts_flat.json", "utf-8")
);

const client = new TranslateClient({ region: "us-east-1", credentials: fromSSO({ profile: "sandbox" }) });

async function translatePostContents(postContents: string, langCode: string) {
  const input = {
    SourceLanguageCode: "en",
    TargetLanguageCode: langCode,
    Text: postContents,
  };
  const command = new TranslateTextCommand(input);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await client.send(command);

      return {
        originalText: postContents,
        langCode: langCode,
        translatedText: response.TranslatedText,
      };
    } catch (e: any) {
      if (e instanceof TooManyRequestsException) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}> Throttled by AWS API, retrying in ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(`Unexcepted Exception Occurred: ${e}`);
        throw e;
      }
    }
  }

  throw new Error('Failed to translate post contents after maximum attempts');
}

async function writeTranslatedPostsFile(users: Object, fileName: string) {
  writeFile(fileName, JSON.stringify(users), (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
  });
}

async function main() {
  const targetLanguage = "pa";
  const postSample = 250;

  let translatedPosts = [];

  for (let i = 0; i < postSample; i++) {
    const randomPostIndex = Math.floor(Math.random() * postsStore.length);
    const post = postsStore[randomPostIndex];

    const translation = await translatePostContents(post, targetLanguage);

    translatedPosts.push(translation.translatedText);
  }

  await writeTranslatedPostsFile(translatedPosts, `./${targetLanguage}_translated_posts.json`);
}

main();