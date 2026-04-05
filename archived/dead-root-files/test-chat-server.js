#!/usr/bin/env node

// Test script for OpenRouter chat server
import http from 'http';

const testData = {
  message: 'Hello! Can you introduce yourself briefly?',
  model: 'openrouter:arcee-ai/trinity-large-preview:free'
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing OpenRouter chat server...');
console.log('Sending message:', testData.message);
console.log('Using model:', testData.model);
console.log('---');

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);

  res.setEncoding('utf8');
  let buffer = '';

  res.on('data', (chunk) => {
    buffer += chunk;

    // Parse SSE data
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          if (data.type === 'content') {
            process.stdout.write(data.content);
          } else if (data.type === 'done') {
            console.log('\n---');
            console.log('Stream completed!');
            console.log('Full response:', data.content);
          } else if (data.type === 'error') {
            console.log('\n---');
            console.log('Error:', data.error);
          }
        } catch (e) {
          console.log('Failed to parse:', line);
        }
      }
    }
  });

  res.on('end', () => {
    console.log('\nNo more data in response.');
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

// Write data to request body
req.write(postData);
req.end();
