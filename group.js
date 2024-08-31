

const { execSync } = require('child_process');

const approach = process.argv[2];

if (!approach) {
  console.error('Error: Please specify a grouping approach.');
  console.log('Usage: node report.js [kmeans|kmeansplusplus|readability]');
  process.exit(1);
}

const scriptMap = {
  kmeans: 'group-kmeans.js',
  kmeansplusplus: 'group-kmeansplusplus.js',
  readability: 'group-readability.js',
};

if (!scriptMap[approach]) {
  console.error(`Error: Unknown approach '${approach}'.`);
  console.log('Valid approaches are: kmeans, kmeansplusplus, readability');
  process.exit(1);
}

const scriptToRun = scriptMap[approach];
console.log(`Running grouping with the '${approach}' approach...`);

try {
  execSync(`node ${scriptToRun}`, { stdio: 'inherit' });
  console.log('Grouping completed.');
} catch (error) {
  console.error('An error occurred while running the grouping script:', error.message);
}
