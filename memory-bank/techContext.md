# Technical Context: Dive AI Agent

## Technology Stack

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **State Management**: Jotai
- **Routing**: React Router
- **Styling**: SCSS with CSS Modules
- **UI Components**: Custom components with some Radix UI primitives
- **Markdown Rendering**: React Markdown with plugins for GFM, math, and syntax highlighting
- **Code Editing**: CodeMirror
- **Internationalization**: i18next

### Backend
- **Runtime**: Node.js
- **Framework**: Express for services
- **Database**: SQLite with Drizzle ORM
- **API Clients**: Axios for HTTP requests
- **LLM Integrations**:
  - Anthropic SDK
  - OpenAI SDK
  - Ollama SDK
  - LangChain for unified interfaces

### Desktop Application
- **Framework**: Electron
- **IPC**: Electron's built-in IPC for main/renderer communication
- **Auto-updates**: electron-updater

### Build Tools
- **Bundler**: Vite
- **Package Manager**: npm
- **Testing**: Jest, Vitest, Playwright
- **Linting**: ESLint
- **Patching**: patch-package for dependency modifications

### MCP Implementation
- **Protocol**: Model Context Protocol (MCP)
- **SDK**: @modelcontextprotocol/sdk
- **Inspector**: @modelcontextprotocol/inspector for debugging

## Development Environment

### Requirements
- Node.js LTS or newer
- npm (comes with Node.js)
- Git for version control

### Setup Process
1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run dev:electron` to start the development server

### Build Process
1. Run `npm run build:electron` to build the application
2. Run `npm run package` to create distributable packages

### Cross-Platform Building
- For Windows builds on macOS/Linux:
  1. Run `npm run download:windows-bin` to download Windows binaries
  2. Run `./scripts/docker/build-win.sh` to build using Docker

## Technical Constraints

### Electron Constraints
- Security considerations for IPC communication
- Performance considerations for renderer process
- Platform-specific behaviors to handle

### LLM Provider Constraints
- Different capabilities across LLM providers
- Rate limits and token limitations
- Varying support for function calling and tool use

### MCP Constraints
- Protocol versioning and compatibility
- Security considerations for external tool access
- Performance overhead of protocol implementation

### Cross-Platform Constraints
- File system path differences
- UI rendering differences
- Package distribution differences

## Dependencies

### Core Dependencies
- **@anthropic-ai/sdk**: Anthropic Claude API client
- **@langchain/core**, **@langchain/openai**, etc.: LangChain integration for various LLMs
- **@modelcontextprotocol/sdk**: MCP implementation
- **@uiw/react-codemirror**: Code editor component
- **axios**: HTTP client
- **better-sqlite3**: SQLite database driver
- **drizzle-orm**: ORM for database operations
- **electron-log**: Logging for Electron
- **electron-updater**: Auto-update functionality
- **express**: Web server for services
- **jotai**: State management
- **react**, **react-dom**: UI framework
- **react-router-dom**: Routing
- **zod**: Schema validation

### Development Dependencies
- **@vitejs/plugin-react**: React plugin for Vite
- **electron**: Electron framework
- **electron-builder**: Packaging and distribution
- **eslint**: Linting
- **typescript**: Type checking
- **vite**: Build tool
- **vitest**: Testing framework

## Configuration Files
- **package.json**: Project metadata and scripts
- **tsconfig.json**: TypeScript configuration
- **vite.config.ts**: Vite configuration for web
- **vite.config.electron.ts**: Vite configuration for Electron
- **vite.config.service.ts**: Vite configuration for services
- **electron-builder.json**: Electron packaging configuration
- **drizzle.config.ts**: Database ORM configuration

## Development Workflow
1. Make changes to the codebase
2. Run development server to test changes
3. Write tests for new functionality
4. Build and package for distribution
5. Release new versions with auto-update support

## Deployment Process
1. Build the application for all target platforms
2. Package the application using electron-builder
3. Sign the packages (especially important for macOS)
4. Distribute through GitHub releases
5. Auto-update mechanism handles updates for users

## Performance Considerations
- Efficient state management to prevent unnecessary re-renders
- Careful handling of LLM responses and streaming
- Optimized database queries for conversation history
- Efficient IPC communication between main and renderer processes
