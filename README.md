# MCP Doctor

![License](https://img.shields.io/github/license/Ghenghis/mcp-doctor)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Build Status](https://img.shields.io/github/workflow/status/Ghenghis/mcp-doctor/CI)

**MCP Doctor** is a zero-configuration automated repair system for Model Context Protocol (MCP) servers. It automatically detects, diagnoses, and fixes issues with MCP servers for Claude Desktop, Windsurf Editor, Cursor, and other MCP clients.

## 🚀 Features

- **Zero-Configuration Automation**: Install and forget - works out of the box
- **Intelligent Problem Solving**: AI-powered diagnostics and repairs for complex issues
- **Self-Healing System**: Automatically detects and fixes issues before they cause failures
- **Simple User Interface**: Plain language status and notifications anyone can understand
- **Cross-Platform Support**: Works on Windows, macOS, and Linux (with WSL support)
- **Secure Backup System**: Automatic backups and rollback protection
- **Background Monitoring**: Continuous health checks with minimal resource usage

## 📋 Requirements

- Windows 10/11, macOS 10.15+, or Linux with WSL
- One or more MCP clients installed (Claude Desktop, Windsurf Editor, etc.)
- Node.js 16+ (automatically installed if missing)

## 🔧 Installation

### One-Click Installer (Coming Soon)

Download the appropriate installer for your platform from the [latest release](https://github.com/Ghenghis/mcp-doctor/releases/latest):

- **Windows**: `MCP-Doctor-Setup-x.x.x.exe`
- **macOS**: `MCP-Doctor-x.x.x.dmg`
- **Linux**: `mcp-doctor_x.x.x_amd64.deb` / `mcp-doctor-x.x.x.rpm`

Run the installer and follow the on-screen instructions. MCP Doctor will automatically start working in the background.

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/Ghenghis/mcp-doctor.git

# Navigate to the project directory
cd mcp-doctor

# Install dependencies
npm install

# Build the project
npm run build

# Start MCP Doctor
npm start
```

## 📊 How It Works

1. **Auto-Detection**: Automatically finds MCP clients and their servers
2. **Diagnostics**: Continuously monitors server health and configuration
3. **Smart Repair**: Automatically fixes common issues without user intervention
4. **AI-Powered Analysis**: Uses Claude API to solve complex issues
5. **Learning**: Improves over time by learning from successful repairs

### Common Issues Fixed Automatically

MCP Doctor can automatically detect and fix these common issues:

- Missing commands in PATH (node, npm, python, etc.)
- Configuration syntax errors
- Permission issues
- Module not found errors
- Server startup failures

## 💡 Usage

MCP Doctor runs silently in the background, automatically monitoring and fixing issues with your MCP servers. A system tray icon provides status at a glance:

- **Green**: All systems operational
- **Yellow**: Minor issues detected - auto-repair in progress
- **Red**: Major issues detected - may require user attention
- **Purple**: Critical issues detected - immediate attention required

Click the system tray icon to open the status dashboard for more details.

### Auto-Repair All

Right-click the system tray icon and select "Auto-Repair All" to automatically fix all issues with all detected MCP servers.

### Manual Repair

Open the dashboard to see detailed status and manually trigger repairs for specific servers.

## 🛠️ Development

### Getting Started

```bash
# Clone the repository
git clone https://github.com/Ghenghis/mcp-doctor.git

# Navigate to the project directory
cd mcp-doctor

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Project Structure

```
mcp-doctor/
├── src/                # Source code
│   ├── app/            # Application management
│   ├── core/           # Core functionality
│   │   ├── backup/     # Backup management
│   │   ├── config/     # Configuration handling
│   │   ├── diagnostics/ # Diagnostic tools
│   │   └── logging/    # Logging system
│   ├── services/       # Application services
│   ├── types/          # TypeScript type definitions
│   └── index.ts        # Application entry point
├── dist/               # Compiled output
├── assets/             # Application assets
│   └── icons/          # Application icons
├── docs/               # Documentation
└── ...
```

### Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue to report bugs or request features.

Before submitting a pull request, please make sure your code follows our coding standards and includes appropriate tests.

## 📃 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgements

- [Anthropic](https://www.anthropic.com/) for Claude and the Model Context Protocol
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- All MCP server developers who have contributed to the ecosystem