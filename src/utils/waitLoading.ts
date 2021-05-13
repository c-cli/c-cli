import * as ora from 'ora';

export const waitLoading = (fn: Function, message?: string) => async (...args: any) => {
  const spinner = ora(message || 'loading start').start();
  const res = await fn(...args);
  spinner.succeed('success');
  return res;
};
