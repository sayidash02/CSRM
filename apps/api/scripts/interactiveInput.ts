import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

type RawInput = typeof stdin & { setRawMode?: (enabled: boolean) => void };
const rawInput = stdin as RawInput;

export async function ask(question: string): Promise<string> {
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    return (await readline.question(question)).trim();
  } finally {
    readline.close();
  }
}

export function askSecret(question: string): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY || !rawInput.setRawMode) {
    throw new Error('Command harus dijalankan dari terminal interaktif server');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error?: Error) => {
      rawInput.setRawMode?.(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk: Buffer) => {
      for (const character of chunk.toString('utf8')) {
        if (character === '\u0003') {
          finish(new Error('Operasi dibatalkan'));
          return;
        }
        if (character === '\r' || character === '\n') {
          finish();
          return;
        }
        if (character === '\u0008' || character === '\u007f') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            stdout.write('\b \b');
          }
          continue;
        }
        value += character;
        stdout.write('*');
      }
    };

    stdout.write(question);
    rawInput.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}
