import * as core from '@actions/core'
import * as github from '@actions/github'
import {GitHub} from '@actions/github/lib/utils'
import * as semver from 'semver'

export class Version {
  raw: string
  semver: semver.SemVer
  constructor(raw: string) {
    this.raw = raw
    this.semver = semver.coerce(raw) ?? new semver.SemVer('0.0.0')
  }
}

export class Repository {
  name: string
  owner: string
  constructor() {
    const tmp: string[] = process.env.GITHUB_REPOSITORY?.split('/') ?? []
    this.owner = tmp?.[0] ?? ''
    this.name = tmp?.[1] ?? ''
  }
}

export type SourceType = 'tags' | 'releases'

export async function getOctokitClient(
  githubToken: string
): Promise<InstanceType<typeof GitHub>> {
  return github.getOctokit(githubToken)
}

export async function getVersionsFromTags(
  octokit: InstanceType<typeof GitHub>
): Promise<Version[]> {
  const repo = new Repository()
  const res =
    (await octokit.paginate(`GET /repos/${repo.owner}/${repo.name}/tags`)) ?? []
  return res.map((data: any) => new Version(data.name))
}

export async function getVersionsFromReleases(
  octokit: InstanceType<typeof GitHub>
): Promise<Version[]> {
  const repo = new Repository()
  const res =
    (await octokit.paginate(
      `GET /repos/${repo.owner}/${repo.name}/releases`
    )) ?? []
  return res.map((data: any) => new Version(data.name))
}

export function filterAndSortVersions(
  versions: Version[],
  prefix: string,
  includePrereleases: boolean
): Version[] {
  return versions
    .filter(version => {
      let check = semver.coerce(version.raw) != null
      if (
        !includePrereleases &&
        (version.semver.build.length || version.semver.prerelease.length)
      ) {
        check = false
      }
      check = check && version.raw.startsWith(prefix) ? true : false
      if (!check) {
        core.debug(`filtering out ${version.raw}`)
      }
      return check
    })
    .sort((x, y) => {
      return semver.compare(y.semver, x.semver)
    })
}

export function bumpVersion(
  version: Version,
  incrementLevel: semver.ReleaseType
): Version {
  const tmp = new Version(version.semver.raw)
  return new Version(tmp.semver.inc(incrementLevel).raw)
}

export async function run(): Promise<void> {
  try {
    const githubToken: string = core.getInput('token')
    const prefix = core.getInput('prefix')
    const source: SourceType = core.getInput('source') as SourceType
    const incrementLevel: semver.ReleaseType = core.getInput(
      'incrementLevel'
    ) as semver.ReleaseType
    const includePrereleases: boolean =
      core.getInput('includePrereleases') === 'true'
    const octokit = await getOctokitClient(githubToken)
    core.debug('client created')
    let allVersions: Version[] = []
    if (source === 'tags') {
      core.debug('coercing with tags')
      allVersions = await getVersionsFromTags(octokit)
    } else if (source === 'releases') {
      core.debug('coercing with releases')
      allVersions = await getVersionsFromReleases(octokit)
    } else {
      throw Error(`${source} is not a valid value for "source"`)
    }
    core.debug(`filtering and sorting ${allVersions.length} versions`)
    const filteredAndSortedVersions: Version[] = filterAndSortVersions(
      allVersions,
      prefix,
      includePrereleases
    )
    const currentVersion =
      filteredAndSortedVersions?.[0] ?? new Version('0.0.0')
    core.debug(`${currentVersion.semver.raw} bumping to next version`)
    const nextVersion = bumpVersion(currentVersion, incrementLevel)
    core.setOutput('currentVersion', currentVersion.semver.raw)
    core.setOutput('nextVersion', nextVersion.semver.raw)
    core.debug(
      `${currentVersion.semver.raw} bumped to ${nextVersion.semver.raw}`
    )
  } catch (error) {
    if (error instanceof Error) {
      core.debug(error.stack ?? error.message)
      core.setFailed(error)
    }
  }
}

run()
