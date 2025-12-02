const fs = require('fs');
const path = require('path');

function generatePackageJson() {
    const backendDir = __dirname;
    console.log('🔍 Analyzing Backend for Dependencies...');
    console.log('=' .repeat(50));

    // Common dependencies and their detection patterns
    const dependencyPatterns = {
        // Web Framework
        'express': ['require(\'express\')', 'from \'express\'', 'createApplication', 'app.get', 'app.post'],
        
        // Database
        'mysql': ['require(\'mysql\')', 'createConnection', 'mysql.createPool'],
        'mysql2': ['require(\'mysql2\')'],
        'mongodb': ['require(\'mongodb\')', 'MongoClient'],
        'mongoose': ['require(\'mongoose\')', 'mongoose.connect'],
        
        // File Uploads
        'multer': ['require(\'multer\')', 'multer(', 'diskStorage'],
        
        // Environment Variables
        'dotenv': ['require(\'dotenv\')', 'config()', 'process.env'],
        
        // CORS
        'cors': ['require(\'cors\')', 'cors()'],
        
        // Body Parsing
        'body-parser': ['require(\'body-parser\')', 'bodyParser.json', 'bodyParser.urlencoded'],
        
        // Security
        'bcrypt': ['require(\'bcrypt\')', 'bcrypt.hash', 'bcrypt.compare'],
        'bcryptjs': ['require(\'bcryptjs\')'],
        'jsonwebtoken': ['require(\'jsonwebtoken\')', 'jwt.sign', 'jwt.verify'],
        
        // File Processing
        'xlsx': ['require(\'xlsx\')', 'XLSX.readFile', 'XLSX.utils'],
        'exceljs': ['require(\'exceljs\')'],
        
        // Utilities
        'path': ['require(\'path\')', 'path.join', 'path.resolve'],
        'fs': ['require(\'fs\')', 'fs.readFile', 'fs.writeFile'],
        'crypto': ['require(\'crypto\')', 'crypto.createHash']
    };

    const detectedDependencies = new Set();
    const detectedDevDependencies = new Set();

    // Scan all JavaScript files
    function scanFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            Object.entries(dependencyPatterns).forEach(([pkg, patterns]) => {
                patterns.forEach(pattern => {
                    if (content.includes(pattern)) {
                        detectedDependencies.add(pkg);
                        console.log(`✅ Found ${pkg} in ${path.basename(filePath)}`);
                    }
                });
            });

            // Check for specific patterns that might indicate dev dependencies
            if (content.includes('console.log') || content.includes('console.error')) {
                detectedDevDependencies.add('nodemon');
            }

        } catch (error) {
            console.log(`❌ Error reading ${filePath}: ${error.message}`);
        }
    }

    // Recursively scan all .js files
    function scanDirectory(dir) {
        const items = fs.readdirSync(dir);
        
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && item !== 'node_modules' && item !== '.git') {
                scanDirectory(fullPath);
            } else if (stat.isFile() && path.extname(item) === '.js') {
                scanFile(fullPath);
            }
        });
    }

    // Start scanning
    scanDirectory(backendDir);

    // Default dependencies for common backend projects
    const defaultDependencies = [
        'express', 'cors', 'dotenv', 'body-parser'
    ];

    // Add defaults if we detected any dependencies (meaning it's a Node.js project)
    if (detectedDependencies.size > 0) {
        defaultDependencies.forEach(dep => {
            if (!detectedDependencies.has(dep)) {
                detectedDependencies.add(dep);
                console.log(`📦 Adding default dependency: ${dep}`);
            }
        });
    }

    // Create package.json content
    const packageJson = {
        name: "nishad-transport-backend",
        version: "1.0.0",
        description: "Backend for NISHAD M.P. TRANSPORT INDORE - Transport Management System",
        main: "mainServer.js",
        scripts: {
            "start": "node mainServer.js",
            "dev": "nodemon mainServer.js",
            "test": "echo \"Error: no test specified\" && exit 1"
        },
        keywords: ["transport", "management", "backend", "express"],
        author: "Aabhas Mishra",
        license: "ISC",
        dependencies: {},
        devDependencies: {
            "nodemon": "^3.0.1"
        }
    };

    // Add detected dependencies with recommended versions
    const recommendedVersions = {
        'express': '^4.18.2',
        'mysql': '^2.18.1',
        'mysql2': '^3.6.0',
        'mongodb': '^5.7.0',
        'mongoose': '^7.5.0',
        'multer': '^1.4.5',
        'dotenv': '^16.3.1',
        'cors': '^2.8.5',
        'body-parser': '^1.20.2',
        'bcrypt': '^5.1.0',
        'bcryptjs': '^2.4.3',
        'jsonwebtoken': '^9.0.2',
        'xlsx': '^0.18.5',
        'exceljs': '^4.3.0',
        'path': '^0.12.7',
        'fs': '0.0.1-security',
        'crypto': '1.0.1'
    };

    detectedDependencies.forEach(dep => {
        if (recommendedVersions[dep]) {
            packageJson.dependencies[dep] = recommendedVersions[dep];
        } else {
            packageJson.dependencies[dep] = "^1.0.0"; // Default version
        }
    });

    // Write package.json
    const packageJsonPath = path.join(backendDir, 'package.json');
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    console.log('\n🎉 GENERATED package.json:');
    console.log('=' .repeat(50));
    console.log(JSON.stringify(packageJson, null, 2));
    console.log('=' .repeat(50));

    // Generate installation instructions
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Install dependencies:');
    console.log('   npm install');
    console.log('\n2. Start your server:');
    console.log('   npm start');
    console.log('\n3. For development with auto-restart:');
    console.log('   npm run dev');
    
    // Check for .env file
    if (!fs.existsSync(path.join(backendDir, '.env'))) {
        console.log('\n📝 Create a .env file with your environment variables!');
    }

    return packageJson;
}

// Run the generator
generatePackageJson();