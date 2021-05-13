#!/usr/bin/env node
import { program } from 'commander';
import * as path from 'path';

/**
 * 定义命令
 */
const actions = {
  create: { // 创建项目
    alias: 'c',
    description: 'create a project',
    examples: [
      'c-cli create <project-name>'
    ],
  },
};


type actionsType = 'create';

/**
 * 添加命令，给命令绑定对应的操作
 * 命令对应的操作写在actions文件夹的单独文件中，文件名和命令名称一致
 */
Object.keys(actions).forEach((actionName: actionsType) => {
  const { description, alias } = actions[actionName];
  program
    .command(actionName)
    .alias(alias)
    .description(description)
    .action(() => {
      require(path.resolve(__dirname, './actions', `${actionName}.js`))(program, process.argv[3]);
    });
});

/**
 * 在帮助信息中添加示例信息
 */
program.on('--help', () => {
  console.log('\nExample:');
  Object.keys(actions).forEach((actionName: actionsType) => {
    const { examples = [] } = actions[actionName];
    examples.forEach(example => {
      console.log(' ', example);
    });
  });
});

program.version('1.0.0').parse(process.argv);
