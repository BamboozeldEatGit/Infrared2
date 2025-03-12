# Infrared Proxy Switcher

A proxy switcher that combines Doge Unblocker and Interstellar proxies into one interface.

## Features

- Automatic port detection and configuration
- Easy switching between proxies
- Health check endpoint
- Docker support
- Beautiful ASCII art interface

## Quick Start

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Run the application (this will setup and start the server):
```bash
npm run deploy
```

The server will be available at:
- Main interface: http://localhost:8081
- Doge Unblocker: http://localhost:8081/doge
- Interstellar: http://localhost:8081/interstellar

### Docker Deployment

1. Build the Docker image:
```bash
docker build -t infrared-proxy .
```

2. Run the container:
```bash
docker run -p 8081:8081 -p 8000:8000 -p 8080:8080 infrared-proxy
```

## Available Commands

- `npm run setup` - Setup the repositories and configuration
- `npm start` - Start the server
- `npm run deploy` - Run setup and start the server (recommended)

## Health Check

Access the health check endpoint at: http://localhost:8081/health

## Ports

- 8081: Main interface
- 8000: Doge Unblocker (default)
- 8080: Interstellar (default)

## Environment Variables

The application uses .env files for configuration, which are automatically created during setup:

### Doge Unblocker Configuration
- PORT: Default 8000
- BARE_SERVER: "/bare/"
- UV_DIR: "uv"
- CODEC_DIR: "codec"
- BARE_APIS: Multiple bare server endpoints

### Interstellar Configuration
- PORT: Default 8080

## License

This project is licensed under the MIT License. 