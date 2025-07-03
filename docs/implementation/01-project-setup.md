# Milestone 1.1: Project Setup

## Objective
Initialize the Google MCP Server project with TypeScript configuration, dependencies, and basic project structure.

## Prerequisites
- Node.js 18+ installed
- npm 8+ installed
- Basic understanding of TypeScript and MCP protocol

## 🧑‍💻 HUMAN REQUIRED STEPS

### 1. Initial Project Directory
You need to manually create the project directory and navigate to it:
```bash
mkdir google-mcp-server
cd google-mcp-server
```

### 2. Environment Variables Setup
After Cline creates the `.env.example` file, you'll need to:
1. Copy `.env.example` to `.env`
2. For now, just verify the basic development settings are correct
3. Google OAuth credentials will be added later in milestone 04
4. Advanced configuration options will be uncommented as features are implemented

## 🤖 CLINE EXECUTABLE STEPS

### 1. Initialize NPM Project
```bash
npm init -y
```

### 2. Install Core Dependencies
```bash
# Core MCP dependencies
npm install @modelcontextprotocol/sdk

# Google API dependencies
npm install googleapis google-auth-library

# Utility dependencies
npm install dotenv zod

# Development dependencies
npm install -D typescript @types/node ts-node nodemon
npm install -D @types/jest jest ts-jest
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### 3. TypeScript Configuration
Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 4. Package.json Scripts
Update `package.json` scripts section:
```json
{
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "dev": "nodemon --exec ts-node src/index.ts",
    "start": "node dist/index.js",
    "type-check": "tsc --noEmit",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "clean": "rm -rf dist"
  }
}
```

### 5. Minimal Project Directory Structure
Create only the essential files and folders needed for basic MCP server functionality:

```
google-mcp-server/
├── src/
│   ├── index.ts              # Main entry point
│   └── server.ts             # Basic MCP server implementation
├── .env.example              # Environment variables template
├── .gitignore               # Git ignore rules
├── README.md                # Project documentation
├── package.json             # NPM configuration
├── tsconfig.json            # TypeScript configuration
├── .eslintrc.js             # ESLint configuration
└── jest.config.js           # Jest configuration
```

**Note**: Additional folders and files will be created incrementally in subsequent implementation phases:
- **Phase 1 (Files 02-03)**: Add `types/` and basic `utils/` folders
- **Phase 2 (Files 04-06)**: Add `auth/` folder for OAuth implementation  
- **Phase 3 (Files 07+)**: Add service-specific folders (`services/`, `tools/`) as each Google API is implemented

This approach ensures each implementation step adds only what's immediately needed.

## Incremental Development Strategy

### Why Minimal Setup?
This project follows an incremental development approach where:

1. **Step 1 (Current)**: Basic MCP server foundation with TypeScript tooling
2. **Step 2-3**: Add MCP protocol implementation and core server architecture
3. **Step 4-6**: Add OAuth authentication when Google APIs are needed
4. **Step 7+**: Add each Google service (Calendar, Gmail, Drive) one at a time

### Benefits of This Approach:
- **Focused Development**: Each step has clear, achievable goals
- **Early Testing**: Can validate each component before building the next
- **Reduced Complexity**: Avoid overwhelming directory structures upfront
- **Easier Debugging**: Smaller increments make issues easier to isolate
- **Flexible Architecture**: Can adapt design based on learnings from each step

### What Gets Added When:
- **Now**: Core project structure and TypeScript configuration
- **Files 02-03**: `src/types/` for MCP types, basic `src/utils/` for errors
- **Files 04-06**: `src/auth/` folder and OAuth implementation
- **File 07**: `src/services/calendar.ts` and `src/tools/calendar/` folder
- **File 10**: `src/services/gmail.ts` and `src/tools/gmail/` folder
- **File 13**: `src/services/drive.ts` and `src/tools/drive/` folder
- **Files 16-17**: Additional services (Docs, Sheets) as needed

### 6. Environment Configuration
Create `.env.example` with minimal configuration for basic MCP server:
```env
# Development Configuration
NODE_ENV=development
MCP_LOG_LEVEL=INFO

# Google OAuth Configuration (will be used in Phase 2)
# GOOGLE_CLIENT_ID=your_google_client_id_here
# GOOGLE_CLIENT_SECRET=your_google_client_secret_here
# GOOGLE_REDIRECT_URI=http://localhost:8080/auth/callback

# Advanced Configuration (will be used in later phases)
# MCP_CACHE_ENABLED=true
# MCP_ENCRYPTION_KEY=your_encryption_key_here
```

### 7. Git Configuration
Create `.gitignore`:
```gitignore
# Dependencies
node_modules/
npm-debug.log*

# Build outputs
dist/
*.tsbuildinfo

# Environment files
.env
.env.local
.env.production

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Credentials and tokens
tokens/
credentials/
*.json.bak
```

### 8. ESLint Configuration
Create `.eslintrc.js`:
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
  },
  env: {
    node: true,
    es2022: true,
  },
};
```

### 9. Jest Configuration
Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
```

## Testing Criteria
- [ ] Project initializes without errors
- [ ] TypeScript compiles successfully (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Test runner executes (`npm test`)
- [ ] Development server can start (`npm run dev`)

## Deliverables
- Complete project structure with all configuration files
- Working TypeScript compilation
- Functional development environment
- Basic testing infrastructure

## Next Steps
This setup enables:
- **File 02**: MCP protocol implementation
- **File 03**: Server foundation and tool registration
- All subsequent development with proper TypeScript support

## Estimated Time
1-2 hours for complete setup and configuration.
