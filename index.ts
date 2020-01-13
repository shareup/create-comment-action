import { getInput, setOutput, setFailed } from '@actions/core'
import { context } from '@actions/github'
import { Octokit } from '@octokit/core'
import { OctokitResponse } from '@octokit/types'

interface PR {
  number: number
  state: string
}

const debug = isTrue(getInput('debug'))
const token = getInput('github_token', { required: true })

const sha = getInput('sha', { required: true })
const body = getInput('body', { required: true })
const repo = input('repo', context.repo.repo)
const owner = input('owner', context.repo.owner)
const alwaysSucceed = isTrue(input('always_succeed', 'false'))

let log = null

if (debug) {
  log = console
}

const client = new Octokit({ auth: token, log })

;(async () => {
  try {
    let response: OctokitResponse<any>
    const prs = await associatedPullRequests()

    if (prs.length > 0) {
      if (debug) {
        console.debug(`Commenting on PRs [${prs.map(pr => { return pr.number }).join(', ')}]`)
      }

      const results = await Promise.all(prs.map(async pr => {
        return await createIssueComment(pr.number)
      }))

      response = results[0]
    } else {
      response = await createCommitComment()
    }

    output('response', JSON.stringify(response))
  } catch (e) {
    if (alwaysSucceed) {
      if (debug) {
        console.error(`Silently failing to post comment with error ${e.stack}`)
      }
    } else {
      setFailed(`error: ${e.stack}`)
    }
  }
})()

async function associatedPullRequests (): Promise<PR[]> {
  // KNOWN ISSUE: this doesn't paginate, so it only will comment on the first page
  const resp = await client.request('GET /repos/:owner/:repo/commits/:commit_sha/pulls', {
    commit_sha: sha,
    owner,
    repo,
    mediaType: {
      previews: ['groot']
    }
  })

  if (resp.status !== 200) {
    return []
  } else {
    const prs = resp.data as PR[]
    return prs.filter(pr => { return pr.state !== 'closed' })
  }
}

async function createIssueComment (issue_number: number) {
  const resp = await client.request('POST /repos/:owner/:repo/issues/:issue_number/comments', {
    issue_number,
    owner,
    repo,
    body
  })

  checkResponse(resp)

  return resp.data
}

async function createCommitComment () {
  const resp = await client.request('POST /repos/:owner/:repo/commits/:commit_sha/comments', {
    commit_sha: sha,
    owner,
    repo,
    body
  })

  checkResponse(resp)

  return resp.data
}

function checkResponse (resp: OctokitResponse<any>) {
  if (resp.status !== 201 && resp.status !== 200) {
    console.error(`Creating deployment failed: ${resp.status} - ${resp.data.error}`)
    throw new Error('Failed to create the deployment')
  }
}

function input (name: string, defaultValue?: string): string | null {
  let value = getInput(name)

  if (!value || value === '') {
    value = defaultValue
  }

  if (debug) {
    console.debug('got input', name, value)
  }

  return value
}

function output (name: string, value: string) {
  if (debug) {
    console.debug('outputting', name, value)
  }

  setOutput(name, value)
}

function isTrue (value: boolean | string): boolean {
  return value === true || value === 'true'
}
