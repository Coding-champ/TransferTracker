#!/usr/bin/env node

/**
 * cleanup-migration.js - Post-migration cleanup script
 * Removes old hooks, updates imports, and cleans up migration infrastructure
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Starting migration cleanup...');

const projectRoot = path.join(__dirname, '../..');
const srcPath = path.join(projectRoot, 'src');

// Migration configurations to clean up
const migrations = [
  {
    name: 'FilterPanel',
    oldHook: 'useNetworkData',
    newHook: 'useOptimizedNetwork',
    files: [
      'components/FilterPanel/index.tsx',
      'components/FilterPanel/hooks/useFilteredData.ts'
    ]
  },
  {
    name: 'NetworkVisualization', 
    oldHook: 'useNetworkData',
    newHook: 'useOptimizedNetwork',
    files: [
      'components/Visualizations/NetworkVisualization/index.tsx'
    ]
  },
  {
    name: 'TransferDashboard',
    oldHook: 'useTransferData',
    newHook: 'useOptimizedCache',
    files: [
      'components/TransferDashboard.tsx'
    ]
  }
];

/**
 * Check if migration is complete for a component
 */
function isMigrationComplete(migrationName) {
  try {
    const { migrationConfig } = require('../hooks/migration/migrationConfig.ts');
    const config = migrationConfig.getComponentConfig(migrationName);
    
    if (!config) return false;
    
    // Check if migration has been running successfully for at least 7 days
    const migrationDuration = Date.now() - (config.metadata?.startTime || Date.now());
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    return migrationDuration > sevenDays && config.enabled;
  } catch (error) {
    console.warn(`Could not check migration status for ${migrationName}:`, error.message);
    return false;
  }
}

/**
 * Update import statements in a file
 */
function updateImports(filePath, oldHook, newHook) {
  try {
    const fullPath = path.join(srcPath, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let updated = false;

    // Update import statements
    const importRegex = new RegExp(`import\\s*{([^}]*)}\\s*from\\s*['"][^'"]*hooks[^'"]*['"]`, 'g');
    content = content.replace(importRegex, (match, imports) => {
      if (imports.includes(oldHook)) {
        updated = true;
        return match.replace(oldHook, newHook);
      }
      return match;
    });

    // Update hook usage
    const hookUsageRegex = new RegExp(`\\b${oldHook}\\b`, 'g');
    if (hookUsageRegex.test(content)) {
      content = content.replace(hookUsageRegex, newHook);
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Updated imports in ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Remove migration infrastructure files
 */
function removeMigrationInfrastructure() {
  const migrationFiles = [
    'hooks/migration/useGradualMigration.ts',
    'hooks/migration/useMigrationCompare.ts',
    'hooks/migration/migrationConfig.ts'
  ];

  const removedFiles = [];

  migrationFiles.forEach(file => {
    const fullPath = path.join(srcPath, file);
    
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        removedFiles.push(file);
        console.log(`🗑️  Removed migration file: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error removing ${file}:`, error.message);
    }
  });

  // Remove migration directory if empty
  const migrationDir = path.join(srcPath, 'hooks/migration');
  try {
    if (fs.existsSync(migrationDir) && fs.readdirSync(migrationDir).length === 0) {
      fs.rmdirSync(migrationDir);
      console.log('🗑️  Removed empty migration directory');
    }
  } catch (error) {
    console.error('❌ Error removing migration directory:', error.message);
  }

  return removedFiles;
}

/**
 * Update package.json to remove migration-related scripts
 */
function updatePackageJson() {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  try {
    if (!fs.existsSync(packageJsonPath)) {
      console.warn('⚠️  package.json not found');
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    let updated = false;

    // Remove migration-related scripts
    if (packageJson.scripts) {
      const migrationScripts = [
        'migration:status',
        'migration:rollback',
        'migration:cleanup'
      ];

      migrationScripts.forEach(script => {
        if (packageJson.scripts[script]) {
          delete packageJson.scripts[script];
          updated = true;
          console.log(`🗑️  Removed script: ${script}`);
        }
      });
    }

    if (updated) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
      console.log('✅ Updated package.json');
    }

    return updated;
  } catch (error) {
    console.error('❌ Error updating package.json:', error.message);
    return false;
  }
}

/**
 * Generate cleanup report
 */
function generateCleanupReport(results) {
  const reportPath = path.join(projectRoot, 'migration-cleanup-report.json');
  
  const report = {
    timestamp: new Date().toISOString(),
    migrations: results,
    summary: {
      totalMigrations: results.length,
      completedMigrations: results.filter(r => r.completed).length,
      updatedFiles: results.reduce((count, r) => count + r.updatedFiles.length, 0),
      warnings: results.reduce((count, r) => count + r.warnings.length, 0)
    }
  };

  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`📊 Cleanup report generated: ${reportPath}`);
  } catch (error) {
    console.error('❌ Error generating cleanup report:', error.message);
  }

  return report;
}

/**
 * Main cleanup function
 */
async function runCleanup() {
  console.log('🔍 Checking migration status...\n');

  const results = [];

  for (const migration of migrations) {
    console.log(`\n📋 Processing migration: ${migration.name}`);
    
    const result = {
      name: migration.name,
      completed: false,
      updatedFiles: [],
      warnings: [],
      errors: []
    };

    // Check if migration is complete
    const isComplete = isMigrationComplete(migration.name);
    
    if (!isComplete) {
      result.warnings.push('Migration not yet complete or stable');
      console.warn(`⚠️  Migration for ${migration.name} is not yet complete`);
      results.push(result);
      continue;
    }

    result.completed = true;
    console.log(`✅ Migration for ${migration.name} is complete`);

    // Update files
    for (const file of migration.files) {
      const updated = updateImports(file, migration.oldHook, migration.newHook);
      if (updated) {
        result.updatedFiles.push(file);
      }
    }

    results.push(result);
  }

  // Check if all migrations are complete
  const allComplete = results.every(r => r.completed);

  if (allComplete) {
    console.log('\n🎉 All migrations complete! Cleaning up infrastructure...');
    
    // Remove migration infrastructure
    const removedFiles = removeMigrationInfrastructure();
    
    // Update package.json
    updatePackageJson();
    
    console.log('\n✨ Migration cleanup complete!');
  } else {
    console.log('\n⏳ Some migrations are still in progress. Cleanup will be postponed.');
  }

  // Generate report
  const report = generateCleanupReport(results);
  
  // Print summary
  console.log('\n📊 Cleanup Summary:');
  console.log(`   Total migrations: ${report.summary.totalMigrations}`);
  console.log(`   Completed: ${report.summary.completedMigrations}`);
  console.log(`   Updated files: ${report.summary.updatedFiles}`);
  console.log(`   Warnings: ${report.summary.warnings}`);

  if (report.summary.warnings > 0) {
    console.log('\n⚠️  See cleanup report for warnings and details.');
  }

  return report;
}

// Run cleanup if called directly
if (require.main === module) {
  runCleanup()
    .then(report => {
      process.exit(report.summary.warnings > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Cleanup failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  runCleanup,
  isMigrationComplete,
  updateImports,
  removeMigrationInfrastructure
};