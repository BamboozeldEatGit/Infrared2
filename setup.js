const simpleGit = require('simple-git');
const fs = require('fs-extra');
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
    console.log('Setting up repositories...');
    
    const reposDir = path.join(__dirname, 'repos');
    
    // Ensure repos directory exists and is empty
    await fs.ensureDir(reposDir);
    await fs.emptyDir(reposDir);
    
    // Clone Doge Unblocker
    console.log('Cloning Doge Unblocker...');
    const dogeDir = path.join(reposDir, 'doge');
    await simpleGit().clone('https://github.com/DogeNetwork/Doge-Unblocker.git', dogeDir);
    
    // Clone Interstellar
    console.log('Cloning Interstellar...');
    const interstellarDir = path.join(reposDir, 'interstellar');
    await simpleGit().clone('https://github.com/interstellarnetwork/interstellar.git', interstellarDir);
    
    // Create .env files
    console.log('Creating environment files...');
    
    // Doge Unblocker .env
    const dogeEnv = `
PORT=8000
BARE_SERVER="/bare/"
UV_DIR="uv"
CODEC_DIR="codec"
BARE_APIS="https://uv.holyubofficial.net/,https://int.holyubofficial.net/,https://holy.holyubofficial.net/,https://rammerhead.holyubofficial.net/,https://uv.raider.tk/,https://int.raider.tk/,https://holy.raider.tk/,https://rammerhead.raider.tk/"
    `.trim();
    
    await fs.writeFile(path.join(dogeDir, '.env'), dogeEnv);
    
    // Interstellar .env
    const interstellarEnv = `
PORT=8080
    `.trim();
    
    await fs.writeFile(path.join(interstellarDir, '.env'), interstellarEnv);
    
    // Install dependencies
    console.log('Installing dependencies...');
    
    // Save port configuration
    const portConfig = {
        doge: 8000,
        interstellar: 8080
    };
    
    await fs.writeJSON(path.join(__dirname, 'port-config.json'), portConfig);
    
    console.log('Setup completed successfully!');
}

setupRepos().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
}); 