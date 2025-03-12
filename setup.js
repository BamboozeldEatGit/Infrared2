const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const net = require('net');

// Function to execute command with timeout
async function execWithTimeout(command, options, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Command timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        try {
            const result = execSync(command, options);
            clearTimeout(timeout);
            resolve(result);
        } catch (error) {
            clearTimeout(timeout);
            reject(error);
        }
    });
}

// Function to check if a port is in use
async function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true);
            } else {
                resolve(false);
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(false);
        });
        server.listen(port);
    });
}

// Function to get next available port
async function getAvailablePort(startPort) {
    let port = startPort;
    while (await isPortInUse(port)) {
        port++;
    }
    return port;
}

// Verify Node.js installation
function verifyNodeInstallation() {
    try {
        const version = execSync('node --version', { stdio: 'pipe' }).toString().trim();
        console.log(`\x1b[32m✓ Node.js ${version} detected\x1b[0m`);
        return true;
    } catch (error) {
        console.error('\x1b[31m✗ Node.js is not installed or not in PATH\x1b[0m');
        return false;
    }
}

async function killProcessesOnPort(port) {
    try {
        if (process.platform === 'win32') {
            await execWithTimeout(`powershell -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force"`, { stdio: 'ignore' }, 5000);
            try {
                const output = execSync(`netstat -ano | findstr :${port}`, { stdio: 'pipe' }).toString();
                const pid = output.split(/\s+/)[5];
                if (pid) {
                    await execWithTimeout(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }, 5000);
                }
            } catch (e) {} // Ignore if no process found
        } else {
            await execWithTimeout(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' }, 5000);
        }
    } catch (e) {
        // Ignore errors if no process is running on that port
    }
}

// Simple cleanup function
async function cleanup() {
    const reposPath = path.join(process.cwd(), 'repos');
    console.log('Cleaning up old repos directory...');
    try {
        if (process.platform === 'win32') {
            try {
                console.log('Removing repos directory...');
                execSync(`rmdir /s /q "${reposPath}"`, { stdio: 'ignore' });
                console.log('Repos directory removed');
            } catch (e) {
                console.log('No repos directory to remove');
            }
        } else {
            await fs.rm(reposPath, { recursive: true, force: true });
        }
    } catch (error) {
        console.log('Cleanup error (can be ignored):', error.message);
    }
}

async function setupRepo(git, repoUrl, localPath, name) {
    console.log(`\nSetting up ${name}...`);
    try {
        // Clone the repository
        console.log(`Cloning ${name} from ${repoUrl} to ${localPath}...`);
        await git.clone(repoUrl, localPath, ['--depth', '1']);
        
        // Verify clone was successful
        const packageJsonPath = path.join(localPath, 'package.json');
        try {
            await fs.access(packageJsonPath);
            console.log(`\x1b[32m✓ ${name} cloned successfully\x1b[0m`);
        } catch (err) {
            throw new Error(`Failed to clone ${name} repository - package.json not found`);
        }

        // Install dependencies
        console.log(`Installing dependencies for ${name}...`);
        execSync('npm install', {
            cwd: localPath,
            stdio: 'inherit'
        });

        console.log(`\x1b[32m✓ ${name} setup completed!\x1b[0m`);
        return true;
    } catch (error) {
        console.error(`\x1b[31m✗ Error setting up ${name}:`, error.message, '\x1b[0m');
        console.error('Full error:', error);
        return false;
    }
}

async function setupRepos() {
    // Verify Node.js installation first
    if (!verifyNodeInstallation()) {
        process.exit(1);
    }

    console.log('\x1b[31m');
    console.log(`
██╗███╗   ██╗███████╗██████╗  █████╗ ██████╗ ███████╗██████╗ 
██║████╗  ██║██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗
██║██╔██╗ ██║█████╗  ██████╔╝███████║██████╔╝█████╗  ██║  ██║
██║██║╚██╗██║██╔══╝  ██╔══██╗██╔══██║██╔══██╗██╔══╝  ██║  ██║
██║██║ ╚████║██║     ██║  ██║██║  ██║██║  ██║███████╗██████╔╝
╚═╝╚═╝  ╚═══╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═════╝ 
`);
    console.log('\x1b[0m');

    // Clean up and create repos directory
    await cleanup();
    console.log('Creating fresh repos directory...');
    await fs.mkdir('repos', { recursive: true });
    console.log('\x1b[32m✓ Created fresh repos directory\x1b[0m');

    const git = simpleGit();
    let success = true;

    // Setup Doge Unblocker
    const dogePath = path.join(process.cwd(), 'repos', 'doge');
    success = success && await setupRepo(git, 'https://github.com/DogeNetwork/v4.git', dogePath, 'Doge Unblocker');
    
    if (success) {
        console.log('Creating Doge Unblocker directories...');
        // Create necessary directories for Doge
        const dogeDirs = ['static', 'public', 'uv', 'codec'];
        for (const dir of dogeDirs) {
            await fs.mkdir(path.join(dogePath, dir), { recursive: true });
        }

        // Create Doge .env file
        console.log('Creating Doge Unblocker .env file...');
        const dogeEnv = `
PORT=3000
BARE_SERVER="/bare/"
UV_DIR="uv"
CODEC_DIR="codec"
BARE_APIS="https://uv.holyubofficial.net/bare1/,https://uv.holyubofficial.net/bare2/,https://uv.holyubofficial.net/bare3/"
`.trim();
        await fs.writeFile(path.join(dogePath, '.env'), dogeEnv);
        console.log('\x1b[32m✓ Doge Unblocker configuration created\x1b[0m');
    }

    // Setup Interstellar
    const interstellarPath = path.join(process.cwd(), 'repos', 'interstellar');
    success = success && await setupRepo(git, 'https://github.com/UseInterstellar/Interstellar.git', interstellarPath, 'Interstellar');
    
    if (success) {
        console.log('Creating Interstellar .env file...');
        // Create Interstellar .env file
        const interstellarEnv = `PORT=3001`.trim();
        await fs.writeFile(path.join(interstellarPath, '.env'), interstellarEnv);
        console.log('\x1b[32m✓ Interstellar configuration created\x1b[0m');
    }

    // Save port configuration
    console.log('Saving port configuration...');
    const portConfig = {
        dogePort: 3000,
        interstellarPort: 3001,
        timestamp: new Date().toISOString()
    };
    await fs.writeFile('port-config.json', JSON.stringify(portConfig, null, 2));

    if (success) {
        console.log('\n\x1b[32m✓ All repositories set up successfully!\x1b[0m');
        console.log(`\x1b[32m✓ Doge Unblocker configured for port 3000\x1b[0m`);
        console.log(`\x1b[32m✓ Interstellar configured for port 3001\x1b[0m`);
    } else {
        console.error('\n\x1b[31m✗ Some repositories failed to set up properly. Please check the errors above and try again.\x1b[0m');
        process.exit(1);
    }
}

// Add global timeout
const GLOBAL_TIMEOUT = 300000; // 5 minutes
console.log('Starting setup process...');
const setupPromise = setupRepos();
const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Setup timed out after 5 minutes')), GLOBAL_TIMEOUT);
});

Promise.race([setupPromise, timeoutPromise])
    .catch(error => {
        console.error('\x1b[31m✗ Setup failed:', error.message, '\x1b[0m');
        console.error('Full error:', error);
        process.exit(1);
    }); 