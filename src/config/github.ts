export default {
  orgName: 'cjj-cli',
  cliName: 'cjj-cli',
  getReposUrl: 'https://api.github.com/orgs/cjj-cli/repos',
  getTagsUrl: (repo: string) => `https://api.github.com/repos/cjj-cli/${repo}/tags`
}
