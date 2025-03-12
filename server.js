const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const fsPromises = require('fs').promises;
const app = express();

// Store child processes and ports
let dogeProcess = null;
let interstellarProcess = null;
let dogePort = 8000;  // Default Doge port
let interstellarPort = 8080;  // Default Interstellar port

// Function to find npm and node executables
function findExecutables() {
    const isWin = process.platform === 'win32';
    const npmCmd = isWin ? 'npm.cmd' : 'npm';
    const nodeCmd = isWin ? 'node.exe' : 'node';
    
    // Common Node.js installation paths
    const commonPaths = [
        process.env.PATH,
        'C:\\Program Files\\nodejs',
        'C:\\Program Files (x86)\\nodejs',
        'C:\\nodejs',
        process.env.APPDATA + '\\npm',
        '/usr/local/bin',
        '/usr/bin'
    ].filter(Boolean);

    const searchPaths = commonPaths.join(path.delimiter).split(path.delimiter);
    
    for (const searchPath of searchPaths) {
        const npmPath = path.join(searchPath, npmCmd);
        const nodePath = path.join(searchPath, nodeCmd);
        
        if (fsPromises.access(npmPath) && fsPromises.access(nodePath)) {
            return { npmPath, nodePath };
        }
    }
    
    throw new Error('Could not find npm and node executables');
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

// ASCII art for "Infrared"
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

console.log('Starting proxies...');

// Function to extract port from console output
function extractPort(data) {
    const portMatch = data.toString().match(/port:?\s*(\d+)/i) || 
                     data.toString().match(/localhost:(\d+)/i);
    return portMatch ? parseInt(portMatch[1]) : null;
}

// Function to start both proxies
async function startProxies() {
    try {
        // Start Doge Unblocker
        const dogePath = path.join(__dirname, 'repos', 'doge');
        if (!fs.existsSync(dogePath)) {
            throw new Error('Doge Unblocker directory not found');
        }
        
        dogeProcess = spawn('npm', ['start'], {
            cwd: dogePath,
            shell: true
        });

        dogeProcess.stdout.on('data', (data) => {
            console.log(data.toString());
            const port = extractPort(data);
            if (port) {
                dogePort = port;
                console.log(`\x1b[32m✓ Detected Doge Unblocker port: ${dogePort}\x1b[0m`);
            }
        });

        dogeProcess.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        dogeProcess.on('error', (error) => {
            console.error('Error starting Doge Unblocker:', error);
        });

        // Start Interstellar
        const interstellarPath = path.join(__dirname, 'repos', 'interstellar');
        if (!fs.existsSync(interstellarPath)) {
            throw new Error('Interstellar directory not found');
        }

        interstellarProcess = spawn('npm', ['start'], {
            cwd: interstellarPath,
            shell: true
        });

        interstellarProcess.stdout.on('data', (data) => {
            console.log(data.toString());
            const port = extractPort(data);
            if (port) {
                interstellarPort = port;
                console.log(`\x1b[32m✓ Detected Interstellar port: ${interstellarPort}\x1b[0m`);
            }
        });

        interstellarProcess.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        interstellarProcess.on('error', (error) => {
            console.error('Error starting Interstellar:', error);
        });

        // Wait for proxies to start
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Verify both proxies are running
        if (!dogeProcess || dogeProcess.exitCode !== null) {
            throw new Error('Doge Unblocker failed to start');
        }
        if (!interstellarProcess || interstellarProcess.exitCode !== null) {
            throw new Error('Interstellar failed to start');
        }

        console.log('\x1b[32m✓ Both proxies started successfully\x1b[0m');
        console.log(`\x1b[32m✓ Doge Unblocker running on port ${dogePort}\x1b[0m`);
        console.log(`\x1b[32m✓ Interstellar running on port ${interstellarPort}\x1b[0m`);
    } catch (error) {
        console.error('Error starting proxies:', error.message);
        throw error;
    }
}

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Route for the main interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for Doge Unblocker
app.get('/doge', (req, res) => {
    if (!dogeProcess || dogeProcess.exitCode !== null) {
        res.status(500).send('Doge Unblocker is not running');
        return;
    }
    res.redirect(`http://localhost:${dogePort}`);
});

// Route for Interstellar
app.get('/interstellar', (req, res) => {
    if (!interstellarProcess || interstellarProcess.exitCode !== null) {
        res.status(500).send('Interstellar is not running');
        return;
    }
    res.redirect(`http://localhost:${interstellarPort}`);
});

// Health check endpoint
app.get('/health', (req, res) => {
    const health = {
        dogeRunning: dogeProcess && dogeProcess.exitCode === null,
        interstellarRunning: interstellarProcess && interstellarProcess.exitCode === null,
        dogePath: dogePort ? `http://localhost:${dogePort}` : null,
        interstellarPath: interstellarPort ? `http://localhost:${interstellarPort}` : null,
        timestamp: new Date().toISOString()
    };
    res.json(health);
});

// Start the server
async function startServer() {
    try {
        await startProxies();
        const port = 8081;
        app.listen(port, () => {
            console.log(`\x1b[32m✓ Server running on http://localhost:${port}\x1b[0m`);
            console.log('\x1b[32m✓ Available routes:\x1b[0m');
            console.log(`\x1b[32m  - Main interface: http://localhost:${port}\x1b[0m`);
            console.log(`\x1b[32m  - Doge Unblocker: http://localhost:${port}/doge -> http://localhost:${dogePort}\x1b[0m`);
            console.log(`\x1b[32m  - Interstellar: http://localhost:${port}/interstellar -> http://localhost:${interstellarPort}\x1b[0m`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    if (dogeProcess) dogeProcess.kill();
    if (interstellarProcess) interstellarProcess.kill();
    process.exit();
});

process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    if (dogeProcess) dogeProcess.kill();
    if (interstellarProcess) interstellarProcess.kill();
    process.exit();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    if (dogeProcess) dogeProcess.kill();
    if (interstellarProcess) interstellarProcess.kill();
    process.exit(1);
});

startServer(); 