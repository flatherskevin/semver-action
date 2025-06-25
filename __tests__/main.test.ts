import * as github from '@actions/github'
import {expect, test} from '@jest/globals'
import {
  bumpVersion,
  detectIncrementFromText,
  determineIncrementLevel,
  filterAndSortVersions,
  getIncrementFromLatestCommit,
  getIncrementFromPR,
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

test('test detectIncrementFromText with major', () => {
  const result = detectIncrementFromText('feat: add new feature [major]')
  expect(result).toBe('major')
})

test('test detectIncrementFromText with minor', () => {
  const result = detectIncrementFromText('feat: add new feature [minor]')
  expect(result).toBe('minor')
})

test('test detectIncrementFromText with patch', () => {
  const result = detectIncrementFromText('fix: bug fix [patch]')
  expect(result).toBe('patch')
})

test('test detectIncrementFromText with prerelease', () => {
  const result = detectIncrementFromText('feat: add new feature [prerelease]')
  expect(result).toBe('prerelease')
})

test('test detectIncrementFromText case insensitive', () => {
  const result = detectIncrementFromText('feat: add new feature [MAJOR]')
  expect(result).toBe('major')
})

test('test detectIncrementFromText no increment', () => {
  const result = detectIncrementFromText('feat: add new feature')
  expect(result).toBeNull()
})

test('test detectIncrementFromText undefined', () => {
  const result = detectIncrementFromText(undefined)
  expect(result).toBeNull()
})

test('test getIncrementFromPR with increment', async () => {
  const mockContext = {
    payload: {
      pull_request: {
        title: 'feat: add new feature [minor]'
      }
    }
  }
  Object.defineProperty(github, 'context', {
    value: mockContext
  })

  const client = await getOctokitClient('mock_token')
  const result = await getIncrementFromPR()
  expect(result).toBe('minor')
})

test('test getIncrementFromPR without increment', async () => {
  const mockContext = {
    payload: {
      pull_request: {
        title: 'feat: add new feature'
      }
    }
  }
  Object.defineProperty(github, 'context', {
    value: mockContext
  })

  const client = await getOctokitClient('mock_token')
  const result = await getIncrementFromPR()
  expect(result).toBeNull()
})

test('test getIncrementFromLatestCommit with increment', async () => {
  const mockContext = {
    payload: {
      head_commit: {
        message: 'fix: bug fix [patch]'
      }
    }
  }
  Object.defineProperty(github, 'context', {
    value: mockContext
  })

  const client = await getOctokitClient('mock_token')
  const result = await getIncrementFromLatestCommit()
  expect(result).toBe('patch')
})

test('test getIncrementFromLatestCommit without increment', async () => {
  const mockContext = {
    payload: {
      head_commit: {
        message: 'fix: bug fix'
      }
    }
  }
  Object.defineProperty(github, 'context', {
    value: mockContext
  })

  const client = await getOctokitClient('mock_token')
  const result = await getIncrementFromLatestCommit()
  expect(result).toBeNull()
})

test('test determineIncrementLevel with explicit level', async () => {
  const client = await getOctokitClient('mock_token')
  const result = await determineIncrementLevel('major')
  expect(result).toBe('major')
})

test('test determineIncrementLevel auto with PR increment', async () => {
  const mockContext = {
    payload: {
      pull_request: {
        title: 'feat: add new feature [minor]'
      }
    }
  }
  Object.defineProperty(github, 'context', {
    value: mockContext
  })

  const client = await getOctokitClient('mock_token')
  const result = await determineIncrementLevel('auto')
  expect(result).toBe('minor')
})

test('test determineIncrementLevel auto with commit increment', async () => {
  const mockContext = {
    payload: {
      head_commit: {
        message: 'fix: bug fix [patch]'
      }
    }
  }
  Object.defineProperty(github, 'context', {
    value: mockContext
  })

  const client = await getOctokitClient('mock_token')
  const result = await determineIncrementLevel('auto')
  expect(result).toBe('patch')
})

test('test determineIncrementLevel auto with no increment found', async () => {
  const mockContext = {
    payload: {}
  }
  Object.defineProperty(github, 'context', {
    value: mockContext
  })

  const client = await getOctokitClient('mock_token')
  const result = await determineIncrementLevel('auto')
  expect(result).toBe('patch')
})
