export default {
  orgName: 'cjj-cli',
  cliName: 'cjj-cli',
  getReposUrl: 'https://gitee.com/api/v5/orgs/cjj-cli/repos',
  getTagsUrl: (repo: string) => `https://gitee.com/api/v5/repos/cjj-cli/${repo}/tags`
}
