/**
 * UX Test Runner Script
 * 
 * This script helps automate the setup for UX testing by creating
 * test environments with various configurations and simulating
 * common error states for user testing.
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Configuration
const TEST_DATA_DIR = path.join(__dirname, 'test-data');
const RESULTS_DIR = path.join(__dirname, 'results');
const SCENARIOS = [
  'clean-install',
  'missing-node',
  'config-error',
  'permission-error',
  'network-error'
];

/**
 * Main function to run the test setup
 */
async function runSetup() {
  console.log('Setting up UX test environments...');
  
  // Create directories
  await fs.ensureDir(TEST_DATA_DIR);
  await fs.ensureDir(RESULTS_DIR);
  
  // Setup each test scenario
  for (const scenario of SCENARIOS) {
    console.log(`Setting up scenario: ${scenario}`);
    await setupScenario(scenario);
  }
  
  // Generate test session IDs
  generateSessionIds(10);
  
  console.log('UX test setup complete!');
  console.log(`Test data directory: ${TEST_DATA_DIR}`);
  console.log(`Results directory: ${RESULTS_DIR}`);
}

/**
 * Setup a specific test scenario
 * @param {string} scenario The scenario name
 */
async function setupScenario(scenario) {
  const scenarioDir = path.join(TEST_DATA_DIR, scenario);
  await fs.ensureDir(scenarioDir);
  
  // Copy base configuration
  await fs.copy(path.join(__dirname, 'templates', 'base-config.json'), path.join(scenarioDir, 'config.json'));
  
  // Setup specific scenario
  switch (scenario) {
    case 'clean-install':
      // Nothing to modify for clean install
      break;
      
    case 'missing-node':
      // Create mock PATH with missing node
      await createMockedPath(scenarioDir, ['npm', 'python']);
      break;
      
    case 'config-error':
      // Create a broken config file
      await createBrokenConfig(scenarioDir);
      break;
      
    case 'permission-error':
      // Create a file with restricted permissions
      await createPermissionIssue(scenarioDir);
      break;
      
    case 'network-error':
      // Setup network error simulation
      await setupNetworkErrorSimulation(scenarioDir);
      break;
  }
  
  // Create scenario instructions
  await createInstructions(scenario, scenarioDir);
}

/**
 * Create a mocked PATH with missing commands
 * @param {string} dir Directory to create mock
 * @param {string[]} includedCommands Commands to include
 */
async function createMockedPath(dir, includedCommands) {
  const mockBinDir = path.join(dir, 'bin');
  await fs.ensureDir(mockBinDir);
  
  // Create mock executables
  for (const cmd of includedCommands) {
    const mockCmd = path.join(mockBinDir, cmd + (os.platform() === 'win32' ? '.exe' : ''));
    await fs.writeFile(mockCmd, '#!/bin/sh\necho "Mock command"\n');
    await fs.chmod(mockCmd, 0o755);
  }
  
  // Create PATH setup script
  const scriptExt = os.platform() === 'win32' ? 'bat' : 'sh';
  const scriptPath = path.join(dir, `setup-path.${scriptExt}`);
  
  if (os.platform() === 'win32') {
    await fs.writeFile(scriptPath, `@echo off\nSET PATH=${mockBinDir};%PATH%\n`);
  } else {
    await fs.writeFile(scriptPath, `#!/bin/sh\nexport PATH="${mockBinDir}:$PATH"\n`);
    await fs.chmod(scriptPath, 0o755);
  }
}

/**
 * Create a broken configuration file
 * @param {string} dir Directory to create broken config
 */
async function createBrokenConfig(dir) {
  const configPath = path.join(dir, 'config.json');
  
  // Read existing config
  const config = await fs.readJson(configPath);
  
  // Break the config by adding an unclosed object
  const configStr = JSON.stringify(config, null, 2);
  const brokenConfig = configStr.substring(0, configStr.length - 2) + ',\n  "unclosed": {\n}';
  
  // Write broken config
  await fs.writeFile(configPath, brokenConfig);
}

/**
 * Create a permission issue
 * @param {string} dir Directory to create permission issue
 */
async function createPermissionIssue(dir) {
  const restrictedFile = path.join(dir, 'restricted.json');
  
  // Create a file
  await fs.writeFile(restrictedFile, JSON.stringify({ restricted: true }));
  
  // Make it read-only
  if (os.platform() === 'win32') {
    execSync(`attrib +r "${restrictedFile}"`);
  } else {
    await fs.chmod(restrictedFile, 0o444);
  }
}

/**
 * Setup network error simulation
 * @param {string} dir Directory to setup network error
 */
async function setupNetworkErrorSimulation(dir) {
  const networkErrorConfig = {
    simulateNetworkError: true,
    targetUrls: [
      'https://api.anthropic.com',
      'https://update.mcpdoctor.app'
    ]
  };
  
  await fs.writeJson(path.join(dir, 'network-error.json'), networkErrorConfig);
}

/**
 * Create instructions for a scenario
 * @param {string} scenario Scenario name
 * @param {string} dir Directory to create instructions
 */
async function createInstructions(scenario, dir) {
  const instructions = {
    'clean-install': 'Standard installation with no issues. Observe normal operation.',
    'missing-node': 'Simulates missing Node.js. Use the setup-path script before testing.',
    'config-error': 'Contains a broken config.json file with syntax errors.',
    'permission-error': 'Contains a file with restricted permissions.',
    'network-error': 'Simulates network connectivity issues.'
  };
  
  const instructionText = `
# Test Scenario: ${scenario}

## Description
${instructions[scenario]}

## Test Steps
1. Setup this environment using the provided script (if applicable)
2. Run MCP Doctor in this environment
3. Observe behavior and record results in the UX Test Form
4. Attempt to resolve the issue using MCP Doctor's interface
5. Record the steps taken and overall experience

## Expected Behavior
${getExpectedBehavior(scenario)}

## Success Criteria
- User understands the issue
- User can navigate to appropriate repair options
- User feels confident in the solution process
- Issue is resolved (or user understands why it cannot be resolved)
`;
  
  await fs.writeFile(path.join(dir, 'INSTRUCTIONS.md'), instructionText);
}

/**
 * Get expected behavior for a scenario
 * @param {string} scenario Scenario name
 * @returns {string} Expected behavior description
 */
function getExpectedBehavior(scenario) {
  const behaviors = {
    'clean-install': 'MCP Doctor should start normally, detect installed MCP clients, and show green status indicators for all systems.',
    'missing-node': 'MCP Doctor should detect missing Node.js, show an error indicator, and suggest installing Node.js with a download link or automatic fix option.',
    'config-error': 'MCP Doctor should detect the broken configuration file, show a warning, and offer to repair the syntax automatically.',
    'permission-error': 'MCP Doctor should detect the permission issue, show a permission error, and provide instructions to fix permissions or request elevated privileges.',
    'network-error': 'MCP Doctor should handle network failures gracefully, show appropriate error messages, and provide offline functionality where possible.'
  };
  
  return behaviors[scenario] || 'Behavior undefined for this scenario.';
}

/**
 * Generate test session IDs
 * @param {number} count Number of session IDs to generate
 */
function generateSessionIds(count) {
  console.log(`Generating ${count} test session IDs...`);
  
  const ids = [];
  for (let i = 1; i <= count; i++) {
    const id = `UX-TEST-${String(i).padStart(3, '0')}`;
    ids.push(id);
    
    // Create session directory
    const sessionDir = path.join(RESULTS_DIR, id);
    fs.ensureDirSync(sessionDir);
    
    // Copy feedback form
    fs.copySync(
      path.join(__dirname, 'UXTestForm.md'),
      path.join(sessionDir, 'feedback-form.md')
    );
    
    // Create session info
    const sessionInfo = {
      id,
      date: new Date().toISOString(),
      completed: false,
      scenario: null,
      notes: ''
    };
    
    fs.writeJsonSync(path.join(sessionDir, 'session-info.json'), sessionInfo, { spaces: 2 });
  }
  
  // Write session ID list
  fs.writeJsonSync(path.join(RESULTS_DIR, 'sessions.json'), { sessions: ids }, { spaces: 2 });
  console.log(`Generated session IDs: ${ids.join(', ')}`);
}

/**
 * Create base configuration files
 */
async function createBaseConfig() {
  const templateDir = path.join(__dirname, 'templates');
  await fs.ensureDir(templateDir);
  
  // Create base configuration
  const baseConfig = {
    version: '1.0.0',
    logLevel: 'info',
    checkForUpdates: true,
    autoStartOnLogin: true,
    monitoring: {
      interval: 300000, // 5 minutes
      notifications: true
    },
    backup: {
      enabled: true,
      maxBackups: 5
    },
    ai: {
      enabled: true,
      model: 'claude-3-7-sonnet-20250219'
    }
  };
  
  await fs.writeJson(path.join(templateDir, 'base-config.json'), baseConfig, { spaces: 2 });
}

/**
 * Entry point
 */
async function main() {
  try {
    await createBaseConfig();
    await runSetup();
  } catch (error) {
    console.error('Error setting up UX tests:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  runSetup,
  createBaseConfig,
  generateSessionIds
};
