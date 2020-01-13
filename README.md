# GitHub action to create a commit comment either on open PRs that contain the commit or on the commit itself if there are none

## Usage

```yml
name: yo
on:
  push:

jobs:
  yo:
    runs-on: ubuntu-latest
    steps:
      - name: post a comment
        uses: shareup/create-comment-action@master
        with:
          body: "Yo, whatup?"
```

## Outputs

* `response`
