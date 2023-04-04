import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import * as github from '@actions/github'
import {expect, test} from '@jest/globals'
import {
  bumpVersion,
  filterAndSortVersions,
  getOctokitClient,
  getVersionsFromReleases,
  getVersionsFromTags,
  Version
} from '../src/main'

const VERSIONS = [
  {name: '0.0.1'},
  {name: '1.0.0'},
  {name: '1.0.0'},
  {name: '1.1.0'},
  {name: '0.0.22'},
  {name: '0.1.0'},
  {name: '1.1.1'},
  {name: '1.2.0'},
  {name: '2.0.1'},
  {name: '2.0.0'},
  {name: '3.1.0-dev.123.abcdfg'},
  {name: '3.1.0-dev.124.abcdfg'},
  {name: '3.0.0-dev.123.abcdfg'},
  {name: 'test-2.0.1'},
  {name: 'test-2.0.0'},
  {name: 'test-nonsemver'},
  {name: 'test-nonsemver-again'}
]

class MockOctokitClient {
  async paginate() {
    return VERSIONS
  }
}
Object.defineProperty(github, 'getOctokit', {
  value: jest.fn().mockReturnValue(new MockOctokitClient())
})

test('test getOctokitClient', async () => {
  const client = await getOctokitClient('mock_token')
  return expect(client).not.toBeNull()
})

test('test getVersionsFromTags', async () => {
  const client = await getOctokitClient('mock_token')
  const versions = await getVersionsFromTags(client)
  expect(versions).toHaveLength(17)
  expect(versions[0].raw).toBe('0.0.1')
})

test('test getVersionsFromReleases', async () => {
  const client = await getOctokitClient('mock_token')
  const versions = await getVersionsFromReleases(client)
  expect(versions).toHaveLength(17)
  expect(versions[0].raw).toBe('0.0.1')
})

test('test filterAndSortVersions no-prefix|include-prereleases', async () => {
  const res = filterAndSortVersions(
    VERSIONS.map(version => new Version(version.name)),
    '',
    true
  )
  expect(res).toHaveLength(15)
  expect(res[0].raw).toBe('3.1.0-dev.123.abcdfg')
  expect(res[res.length - 1].raw).toBe('0.0.1')
})

test('test filterAndSortVersions no-prefix|exclude-prereleases', async () => {
  const res = filterAndSortVersions(
    VERSIONS.map(version => new Version(version.name)),
    '',
    false
  )
  expect(res).toHaveLength(15)
  expect(res[0].raw).toBe('3.1.0-dev.123.abcdfg')
  expect(res[res.length - 1].raw).toBe('0.0.1')
  expect(res).toContainEqual(new Version('test-2.0.1'))
})

test('test filterAndSortVersions no-prefix|exclude-prereleases', async () => {
  const res = filterAndSortVersions(
    VERSIONS.map(version => new Version(version.name)),
    '',
    false
  )
  expect(res).toHaveLength(15)
  expect(res[0].raw).toBe('3.1.0-dev.123.abcdfg')
  expect(res[res.length - 1].raw).toBe('0.0.1')
  expect(res).toContainEqual(new Version('test-2.0.1'))
})

test('test filterAndSortVersions prefix', async () => {
  const res = filterAndSortVersions(
    VERSIONS.map(version => new Version(version.name)),
    'test',
    false
  )
  expect(res).toHaveLength(2)
  expect(res[0].raw).toBe('test-2.0.1')
  expect(res[res.length - 1].raw).toBe('test-2.0.0')
})

test('test bumpVersion', () => {
  const currentVersion = new Version('0.0.1')
  const nextVersion = bumpVersion(currentVersion, 'minor')
  expect(currentVersion.semver.raw).toBe('0.0.1')
  expect(nextVersion.semver.raw).toBe('0.1.0')
})
