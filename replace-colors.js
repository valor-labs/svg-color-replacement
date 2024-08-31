const fs = require('fs');
const path = require('path');
const yaml = require('yamljs');
const glob = require('glob');
const mkdirp = require('mkdirp');

// Load the grouped.yaml file
function loadGroupedColors() {
  if (!fs.existsSync('grouped.yaml')) {
    console.error('Error: grouped.yaml not found.');
    process.exit(1);
  }

  const groupedData = yaml.load('grouped.yaml');
  const colorMapping = {};

  groupedData.list.forEach(group => {
    group.similarColors.forEach(color => {
      if (!color.startsWith('url(')) {
        colorMapping[color.toLowerCase()] = group.newColor.toLowerCase();
      }
    });
  });

  return colorMapping;
}

// Replace colors in an SVG file
function replaceColorsInSvg(filePath, colorMapping) {
  let content = fs.readFileSync(filePath, 'utf8');

  for (const [oldColor, newColor] of Object.entries(colorMapping)) {
    const regex = new RegExp(oldColor.replace('#', '\\#'), 'gi');
    content = content.replace(regex, newColor);
  }

  return content;
}

// Process all SVG files in the input directory
function processSvgFiles(inputDir, outputDir, colorMapping) {
  const svgFiles = glob.sync(`${inputDir}/**/*.svg`);

  svgFiles.forEach(filePath => {
    const relativePath = path.relative(inputDir, filePath);
    const outputPath = path.join(outputDir, relativePath);
    const outputDirPath = path.dirname(outputPath);

    // Create directories if they don't exist
    mkdirp.sync(outputDirPath);

    // Replace colors in the SVG file
    const updatedContent = replaceColorsInSvg(filePath, colorMapping);

    // Write the updated SVG to the output directory
    fs.writeFileSync(outputPath, updatedContent, 'utf8');
    console.log(`Processed ${filePath} -> ${outputPath}`);
  });
}

// Main function
function main() {
  const inputDir = './input';
  const outputDir = './output';

  if (!fs.existsSync(inputDir)) {
    console.error('Error: Input directory does not exist.');
    process.exit(1);
  }

  const colorMapping = loadGroupedColors();
  processSvgFiles(inputDir, outputDir, colorMapping);
}

main();
