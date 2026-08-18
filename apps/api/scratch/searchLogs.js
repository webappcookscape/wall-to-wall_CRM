import fs from 'fs';
import readline from 'readline';

async function searchLogs() {
  const logPath = 'C:\\Users\\elakk\\.gemini\\antigravity\\brain\\30a90864-3b17-4bfe-95fe-05f8b599715c\\.system_generated\\logs\\transcript.jsonl';
  if (!fs.existsSync(logPath)) {
    console.error('Log file does not exist at ' + logPath);
    return;
  }

  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('--- Search Results ---');
  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      // We look for user messages or plan contents containing "role" or "responsibility" or "CRE" or "DM"
      if (obj.type === 'USER_INPUT' && obj.content) {
        if (obj.content.toLowerCase().includes('role') || obj.content.toLowerCase().includes('responsibility')) {
          console.log(`[USER MESSAGE] Step ${obj.step_index}: ${obj.content}\n`);
        }
      }
      if (obj.type === 'PLANNER_RESPONSE' && obj.content) {
        if (obj.content.includes('#') && (obj.content.toLowerCase().includes('role') || obj.content.toLowerCase().includes('responsibility'))) {
          // Print short header snippet of the planner response
          console.log(`[PLANNER RESPONSE] Step ${obj.step_index}:\n${obj.content.substring(0, 500)}...\n`);
        }
      }
    } catch (e) {
      // Ignored
    }
  }
}

searchLogs();
