// route-debugger.js - Save this in your backend directory
const express = require('express');
const path = require('path');
const fs = require('fs');

console.log('🔍 Debugging route files...\n');

// Get all route files
const routesDir = './routes';
if (!fs.existsSync(routesDir)) {
  console.log('❌ Routes directory not found');
  process.exit(1);
}

const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));
console.log('📁 Found route files:', routeFiles);

// Test each route file individually
for (const file of routeFiles) {
  console.log(`\n🧪 Testing ${file}...`);
  
  try {
    // Create a fresh Express app for each test
    const testApp = express();
    
    // Try to load the route file
    const routePath = `./routes/${file}`;
    const router = require(routePath);
    
    // Try to use the router
    testApp.use('/test', router);
    
    console.log(`✅ ${file} loaded successfully`);
    
    // Clear the require cache to test the next file fresh
    delete require.cache[require.resolve(routePath)];
    
  } catch (error) {
    console.log(`❌ ${file} has an error:`);
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('Missing parameter name')) {
      console.log(`   🎯 This is likely the problematic route file!`);
      console.log(`   💡 Look for routes with incomplete parameters like '/:' or '/:'`);
    }
    
    // Don't exit, continue testing other files
  }
}

console.log('\n🔍 Route debugging complete!');
console.log('💡 Check the problematic file(s) for malformed routes.');

// Additional check for common route patterns
console.log('\n🔎 Scanning for common route issues...');

for (const file of routeFiles) {
  const filePath = path.join(routesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Look for suspicious patterns
  const suspiciousPatterns = [
    /router\.(get|post|put|delete|patch)\s*\(\s*['"`][^'"`]*\/:\s*['"`]/g,  // routes ending with /:
    /router\.(get|post|put|delete|patch)\s*\(\s*['"`][^'"`]*\/:\w*\/\s*['"`]/g,  // routes with incomplete params
  ];
  
  suspiciousPatterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`⚠️  Suspicious pattern found in ${file}:`);
      matches.forEach(match => {
        console.log(`   ${match}`);
      });
    }
  });
}

console.log('\n✅ Pattern scan complete!');