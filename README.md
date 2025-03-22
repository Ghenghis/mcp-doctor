# MCP Doctor

![MCP Doctor Logo](docs/images/logo.png)

MCP Doctor is a comprehensive management and debugging tool for Model Context Protocol (MCP) servers. It provides a unified interface for managing multiple servers, automated installation and configuration, advanced debugging tools, and intelligent monitoring capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

## Features

### Unified Management Interface
- **Centralized Dashboard**: Manage all your MCP servers from a single interface
- **Profile Management**: Create, edit, and switch between server profiles
- **Configuration Comparison**: Visually compare settings between servers
- **Seamless Switching**: Switch between configurations without conflicts

### Automated Server Installation
- **Server Detection**: Automatically detect installed and available MCP servers
- **Auto Installation**: Install various MCP servers with minimal user input
- **Configuration Wizard**: Guided setup for new servers
- **Cross-Platform Support**: Works on Windows, macOS, and Linux

### Visual Debugging Tools
- **Network Traffic Analyzer**: Monitor and analyze MCP server network traffic in real-time
- **Performance Profiler**: Track CPU, memory, network, and disk usage with detailed visualization
- **Log Explorer**: Visualize and filter server logs
- **Request Inspector**: Analyze and debug MCP requests and responses

### Dynamic GUI Updates
- **Real-Time Updates**: UI automatically reflects configuration changes instantly
- **Live Configuration Preview**: See the effects of changes before applying them
- **Real-Time Statistics Dashboard**: Monitor server performance with auto-refreshing charts
- **Notification System**: Receive alerts about important events and state changes
- **Theme Switching**: Choose between light, dark, and neon themes to match your preferences

### Namespace Isolation
- **Conflict Prevention**: Each MCP server operates in its own namespace
- **Resource Allocation**: Control CPU, memory, and disk resources for each server
- **Environment Variables**: Isolated environment variables for each server

## Installation

MCP Doctor can be installed through various methods to suit your workflow.

### NPM Global Installation

```bash
npm install -g mcp-doctor
```

### Using npx

```bash
npx mcp-doctor
```

### Docker

```bash
docker pull ghenghis/mcp-doctor
docker run -p 3000:3000 ghenghis/mcp-doctor
```

### Direct Download

Download the appropriate installer for your platform:
- [Windows Installer (.exe)](https://github.com/Ghenghis/mcp-doctor/releases/latest/download/mcp-doctor-windows.exe)
- [macOS Installer (.pkg)](https://github.com/Ghenghis/mcp-doctor/releases/latest/download/mcp-doctor-macos.pkg)
- [Linux Installer (.deb)](https://github.com/Ghenghis/mcp-doctor/releases/latest/download/mcp-doctor-linux.deb)

## Quick Start

### Start MCP Doctor

```bash
mcp-doctor
```

### Using the Web Interface

Open your browser and navigate to:

```
http://localhost:3000
```

### Using the CLI

```bash
# List all available MCP servers
mcp-doctor list

# Install a specific MCP server
mcp-doctor install <server-name>

# Start monitoring a server
mcp-doctor monitor <server-name>

# Export server diagnostics
mcp-doctor export <server-name> --format=json
```

## Advanced Usage

### Creating Custom Server Profiles

```bash
mcp-doctor create-profile --name="Custom MCP" --port=8080 --memory=2048
```

### Batch Operations

```bash
# Update all servers
mcp-doctor update-all

# Export diagnostics for all servers
mcp-doctor export-all --format=json
```

### Configuration File

MCP Doctor uses a configuration file located at:
- Windows: `%APPDATA%/mcp-doctor/config.json`
- macOS: `~/Library/Application Support/mcp-doctor/config.json`
- Linux: `~/.config/mcp-doctor/config.json`

Example configuration:

```json
{
  "servers": [
    {
      "name": "Primary MCP",
      "port": 3001,
      "autoStart": true,
      "memoryLimit": 1024,
      "logLevel": "info"
    }
  ],
  "ui": {
    "theme": "dark",
    "refreshRate": 5000
  }
}
```

## Key Features In-Depth

### Dynamic Statistics Dashboard

The Real-Time Statistics Dashboard provides comprehensive monitoring of MCP server performance:

- **Live Metrics**: Monitor CPU, memory, network, and disk usage in real-time
- **Historical Trends**: View performance trends over time with interactive charts
- **Server Comparison**: Compare performance metrics across multiple servers
- **Alert Thresholds**: Configure thresholds for automatic alerts
- **Export Capabilities**: Export metrics as CSV or JSON for further analysis

### Live Configuration Preview

The Live Configuration Preview provides a powerful interface for editing server configurations:

- **Real-Time Validation**: Instantly validate changes for correctness
- **Side-by-Side Comparison**: See changes highlighted before applying them
- **JSON Preview**: View the underlying JSON configuration
- **Template Support**: Save configurations as templates for reuse
- **Import/Export**: Share configurations between servers or teams

### Advanced Notification System

The notification system keeps you informed about important events:

- **Priority Levels**: Color-coded by severity (info, success, warning, error)
- **Toast Notifications**: Non-intrusive notifications for real-time updates
- **Notification Center**: Persistent record of all notifications
- **Filtering Options**: Filter notifications by type, severity, or timestamp
- **Actionable Alerts**: Click to respond to or resolve issues

## API Reference

MCP Doctor provides a comprehensive REST API for integration with other tools:

```
# Get all servers
GET /api/servers

# Get server stats
GET /api/servers/:id/stats

# Create a new server profile
POST /api/servers

# Update server configuration
PUT /api/servers/:id
```

See the [API Documentation](docs/api/README.md) for more details.

## Development

### Prerequisites

- Node.js 16+
- npm 7+
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/Ghenghis/mcp-doctor.git
cd mcp-doctor

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Build

```bash
# Build for production
npm run build

# Build binaries for all platforms
npm run build:all
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and suggest features.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

MCP Doctor incorporates concepts and ideas from the following projects:
- [MetaMCP](https://github.com/example/metamcp) - Centralized MCP management
- [MCP Inspector](https://github.com/example/mcp-inspector) - MCP debugging tools
- [MCP Auto Install](https://github.com/example/mcp-auto-install) - Automated server installation

Special thanks to all contributors!

## Support

If you need help with MCP Doctor, please:
- Check the [FAQ](docs/faq.md)
- Join our [Discord community](https://discord.gg/mcp-doctor)
- File an [issue](https://github.com/Ghenghis/mcp-doctor/issues)
