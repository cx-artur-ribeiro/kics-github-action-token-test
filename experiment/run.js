// Experiment: can a GITHUB_TOKEN update a KICS comment authored by a different identity?
const github = require('@actions/github')
const { postPRComment } = require('../src/commenter')

const [owner, repoName] = process.env.GITHUB_REPOSITORY.split('/')
const repo = { owner, repo: repoName }
const prNumber = Number(process.env.PR_NUMBER)
const octokit = github.getOctokit(process.env.GITHUB_TOKEN)
const results = {
    kics_version: 'experiment', severity_counters: {}, total_counter: 0, files_scanned: 0, files_parsed: 0,
    files_failed_to_scan: 0, queries_total: 0, queries_failed_to_execute: 0, start: 0, end: 0,
}

async function snapshot(label) {
    const comments = await octokit.paginate(octokit.rest.issues.listComments, { ...repo, issue_number: prNumber, per_page: 100 })
    console.log(`--- ${label}: ${comments.length} comment(s)`)
    for (const c of comments) console.log(`id=${c.id} author=${c.user.login} type=${c.user.type} kics=${c.body.startsWith('![kics-logo](')} body=${JSON.stringify(c.body.slice(0, 60))}`)
    return comments
}

async function main() {
    await snapshot('before')
    try {
        await postPRComment(results, repo, prNumber, octokit, false, [])
        console.log('postPRComment: OK')
    } catch (e) {
        console.log(`postPRComment: FAILED status=${e.status} message=${e.message}`)
        process.exitCode = 1
    }
    const after = await snapshot('after')
    const kics = after.filter((c) => c.body.startsWith('![kics-logo]('))
    console.log(`RESULT kics_comments=${kics.length} updated=${kics.some((c) => c.body.includes('experiment'))}`)
}
main()
