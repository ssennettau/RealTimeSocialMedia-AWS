# RealTimeSocialMedia-AWS-backend

This is the CDK stack to deploy the backend for the lab. This API that generates mock social media content.

The Lambda Function is triggered by a HTTP API. Flat files contain pre-generated mock content, including posts and usernames which are combined with a recent timestamp, returning an array of recent posts.

```json
{
    "id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "dateTime": {
        "epochTime": 1704067200000,
        "year": "2024",
        "month": "01",
        "day": "01",
        "hour": "00",
        "minute": "00",
        "second": "00",
        "millisecond": "000"
    },
    "message": "@BigShinyCorp is the bees knees in pretend megacorporations. Absolutely tippy-top spot-on! 1000/10 would post again",
    "author": "@TestPoster1337",
    "lang": "en"
}
```

The scripts used to create the mock content are included in the `./dist/generate/` folder. Eventually I might refactor these into their own Lambda Functions with state machine, but presently they're run independently locally.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
