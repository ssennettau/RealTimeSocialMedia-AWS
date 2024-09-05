import { readFileSync } from 'fs';

const postsStore = JSON.parse(
  readFileSync("./posts_all.json", "utf-8")
);

const usernamesStore = JSON.parse(
  readFileSync("./usernames.json", "utf-8")
)

type PostResponse = {
  created_at: number;
  id: string,
  message: string;
  author: string;
  lang: string;
}

function getRandomPost(langCode: string = "en"): PostResponse {
  const postContents = postsStore[langCode][Math.floor(Math.random() * postsStore[langCode].length)];
  const postUsername = usernamesStore[Math.floor(Math.random() * usernamesStore.length)];
  const postTimestamp = new Date(Date.now() - Math.random() * 60000);

  return {
    id: crypto.randomUUID(),
    created_at: postTimestamp.getTime(),
    message: postContents,
    author: postUsername,
    lang: langCode,
  };
}

function getPostStream(count: number = 20) {
  const posts: PostResponse[] = [];
  for (let i = 0; i < count; i++) {
    const langWeights = {
      "en": 0.75,
      "fr": 0.1,
      "es": 0.1,
      "pa": 0.05,
    };

    const langCode = Math.random() < langWeights["en"]
      ? "en"
      : Math.random() < langWeights["fr"]
        ? "fr"
        : Math.random() < langWeights["es"]
          ? "es"
          : "pa";

    const post = getRandomPost(langCode);

    posts.push(post);
  }

  posts.sort((a, b) => a.created_at - b.created_at);

  return posts;
}

export async function handler(event: any, context: any) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      getPostStream(20)
    ),
  };
}

//console.log(getPostStream(10));