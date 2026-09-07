import { fileURLToPath } from 'node:url';
import { createUpdater } from './update-core.mjs';

const args = process.argv.slice(2);
const validArgs = new Set(['--check', '--json', '--help']);
if (args.some((argument) => !validArgs.has(argument))) {
  console.error('Usage: node scripts/update.mjs [--check] [--json]');
  process.exitCode = 1;
} else if (args.includes('--help')) {
  console.log(
    'Check the official IC Atlas main branch: npm run update:check\nUpdate source and dependencies: npm run update\nAfter an update, rebuild and restart your local server.',
  );
} else {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const controller = new AbortController();
  const updater = createUpdater({ root, signal: controller.signal });
  const json = args.includes('--json');
  let interruptedExitCode;
  const interrupt = (signal) => {
    if (interruptedExitCode) return;
    interruptedExitCode = signal === 'SIGINT' ? 130 : 143;
    controller.abort();
  };
  const onInterrupt = () => interrupt('SIGINT');
  const onTerminate = () => interrupt('SIGTERM');
  // Keep the handlers until the updater has stopped its process tree and released
  // its lock. Repeated signals must not exit between those cleanup steps.
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onTerminate);
  let state;
  try {
    state = args.includes('--check')
      ? await updater.check()
      : await updater.apply({
          onProgress: ({ message }) => {
            if (!json) console.log(message);
          },
        });
  } catch (error) {
    state = {
      status: 'error',
      reason: interruptedExitCode ? 'cancelled' : 'update-failed',
      message: interruptedExitCode
        ? 'The operation was cancelled. Review the checkout before retrying.'
        : 'The updater could not finish. Review the checkout before retrying.',
    };
    if (!json) console.error(error.message);
  } finally {
    process.removeListener('SIGINT', onInterrupt);
    process.removeListener('SIGTERM', onTerminate);
  }
  if (json) console.log(JSON.stringify(state, null, 2));
  else {
    console.log(state.message);
    if (state.current) console.log(`Current: ${state.current.slice(0, 12)}`);
    if (state.latest) console.log(`Latest:  ${state.latest.slice(0, 12)}`);
    if (state.status === 'update-available')
      console.log('Run npm run update to install this update.');
    if (state.recoveryCommands)
      console.log(`Recovery: ${state.recoveryCommands.join(' && ')}`);
  }
  process.exitCode =
    interruptedExitCode ??
    (['blocked', 'error', 'manual'].includes(state.status) ? 1 : 0);
}
