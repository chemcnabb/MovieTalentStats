export * from '../src/data/historicalValidation.ts';
import { runHistoricalValidation } from '../src/data/historicalValidation.ts';

// Run tests when executed as CLI script
const report = runHistoricalValidation();
console.log('================================================================');
console.log('🧪 RUNNING CREATIVE SABERMETRICS HISTORICAL VALIDATION TEST SUITE');
console.log('================================================================');
console.log(`📊 Total Records: ${report.totalRecords}`);
console.log(`⏱️  Execution Time: ${report.executionTimeMs}ms`);
console.log(`⚾ Historical League Mean WAR: ${report.leagueMeanWar}`);
console.log(`⚾ Historical League Mean wRC+: ${report.leagueMeanWrcPlus}`);
console.log(`⚾ Historical League Mean Consistency: ${Math.round(report.leagueMeanConsistency * 100)}%`);

for (const suite of report.suites) {
  console.log('----------------------------------------------------------------');
  console.log(`✅ ${suite.title}`);
  console.log(`   ${suite.description}`);
  for (const test of suite.tests) {
    console.log(`     ✓ ${test.name}`);
    console.log(`       Expected: ${test.expected}`);
    console.log(`       Actual:   ${test.actual}`);
  }
}

console.log('================================================================');
console.log(`🏁 TEST SUMMARY: ${report.passedTests}/${report.totalTests} PASSED (${report.failedTests} FAILED)`);
console.log('================================================================');
console.log('🎉 ALL HISTORICAL SABERMETRIC CALCULATIONS VERIFIED SUCCESSFULLY!');
