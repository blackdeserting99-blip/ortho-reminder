const fs = require('fs');
const path = process.argv[2];
const s = fs.readFileSync(path, 'utf8');
const stack = [];
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (ch === '{') stack.push(i);
  if (ch === '}') {
    if (stack.length) stack.pop();
    else console.log('extra closing brace at', i);
  }
}
if (stack.length) {
  console.log('unmatched opens count', stack.length);
  const pos = stack[stack.length - 1];
  const before = s.slice(Math.max(0, pos - 200), pos + 200);
  const linesBefore = s.slice(0, pos).split(/\r?\n/).length;
  console.log('last unmatched open at index', pos, 'approx line', linesBefore);
  console.log('context:\n', before);
} else console.log('all matched');
