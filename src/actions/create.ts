import * as chalk from 'chalk';
import axios from 'axios';
import * as path from 'path';
import * as inquirer from 'inquirer';
import * as consolidate from 'consolidate';
import * as downloadGitRepoOrigin from 'zdex-downloadgitrepo';
import * as ncpOrigin from 'ncp';
import * as fs from 'fs';
import * as child_process from 'child_process';
import * as Metalsmith from 'metalsmith';
import { promisify } from 'util';
import { waitLoading } from '../utils/waitLoading';
import { Command } from 'commander/typings/index.d';
import gitConf from '../config/gitee';

const { getReposUrl, getTagsUrl, orgName, cliName } = gitConf;

const downloadGitRepo = promisify(downloadGitRepoOrigin); // 转换为支持promise的
const ncp = promisify(ncpOrigin);
const exec = promisify(child_process.exec);
const render: any = promisify(consolidate.ejs.render);

/**
 * 获取所有模板
 */
const fetchRepos = async () => {
  const { data } = await axios.get(getReposUrl);
  return data;
};

/**
 * 获取模板所有的tags
 * @param repo 
 * @returns 
 */
const fetchRepoTags = async (repo: string) => {
  console.log('getTagsUrl(repo)', getTagsUrl(repo));

  const { data } = await axios.get(getTagsUrl(repo));
  return data;
};

/**
 * 选择模板
 * @returns 模板名称
 */
async function chooseRepo() {
  const repos = await waitLoading(fetchRepos, 'getting template...')();
  const reposChoise = repos.map((item: any) => item.name);
  const { repo } = await inquirer.prompt({
    name: 'repo',
    type: 'list',
    message: 'please choices a template to create project',
    choices: reposChoise.filter((name: string) => name.indexOf(cliName) === -1),
  });

  return repo;
}

/**
 * 选择模板的版本号
 * @param repo 
 */
async function chooseRepoTag(repo: string) {
  let tags = await waitLoading(fetchRepoTags, 'getting tags...')(repo);
  console.log('tags----------', tags);

  tags = tags.map((item: any) => item.name + ': ' + item.message);
  const { tag } = await inquirer.prompt({
    name: 'tag',
    type: 'list',
    message: 'please choices a tags to create project',
    choices: tags,
  });
  return tag;
}


/**
 * 下载模板
 * @param params 
 */
async function downloadRepo(repo: string, tag: string) {
  const api = tag ? `gitee:${orgName}/${repo}#${tag}` : `${orgName}/${repo}`;
  const downloadDirectory = `${process.env[process.platform === 'darwin' ? 'HOME' : 'USERPROFILE']}/.template`;
  let dest = `${downloadDirectory}/${repo}`;
  if (fs.existsSync(dest)) { // 如果之前下载过，则删除后重新下载
    await waitLoading(exec, 'deletting old files...')(`rm -rf ${dest}`);
  }
  await waitLoading(downloadGitRepo, 'downloading template...')(api, dest, {
    clone: true,
  });
  return dest;
}

module.exports = async (program: Command, projectName: string) => {
  if (!projectName) {
    program.outputHelp();
    console.error(chalk.red('Missing required argument <project-name>.'));
    return;
  }

  const projectPath = path.resolve(projectName);
  // 判断项目文件夹是存在，如果存在需要删除，如果不存在才下载
  if (fs.existsSync(projectPath)) {
    const { confirm } = await inquirer.prompt({
      name: 'confirm',
      type: 'confirm',
      message: 'file is exists. Do you want to delete the previous folder？',
    });
    if (!confirm) {
      return;
    }
    await waitLoading(exec, 'deletting old files...')(`rm -rf ${projectPath}`);
  }

  const repo = await chooseRepo(); // 选择模板
  const tag = await chooseRepoTag(repo); // 选择版本
  const dest = await downloadRepo(repo, tag);

  /**
  * 模板中需要配置的参数放在模板根目录下的ask.js文件中
  * 如果不需要用户配置，则模板中不需要有这个文件
  */
  if (!fs.existsSync(path.join(dest, 'ask.js'))) {
    await ncp(dest, projectPath);
    return;
  }

  await new Promise((resolve, reject) => {
    Metalsmith(__dirname)
      .source(dest)
      .destination(projectPath)
      .use(async (files, metalsmith, done: any) => {
        const args = require(path.join(dest, 'ask.js')); // 获取用户要填写的参数
        const obj = await inquirer.prompt(args); // 让用户填写信息
        const meta = metalsmith.metadata(); // 用户填写完后 传入下一个use
        Object.assign(meta, obj, {
          projectName,
        });
        done();
      })
      .use(async (files, metalsmith, done: any) => {
        const data = metalsmith.metadata();
        Object.keys(files).forEach(async (file) => {
          if (file.includes('js') || file.includes('json')) {
            let content = files[file].contents.toString();
            if (content.includes('<%=')) {
              content = await render(content, data);
              files[file].contents = content;
            }
          }
        });
        done();
      }).build(e => {
        if (e) {
          reject();
        } else {
          resolve(true);
        }
      });
  });
};
