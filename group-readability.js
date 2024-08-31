// group-readability.js
const fs = require('fs');
const yaml = require('yamljs');
const tinycolor = require('tinycolor2');

// Function to group colors by proximity using readability
function groupColorsByProximity(colors, proximity) {
  const groupedColors = [];
  const usedColors = new Set();

  colors.forEach(baseColor => {
    if (usedColors.has(baseColor)) return;

    const similarColors = [];
    const baseTinyColor = tinycolor(baseColor);

    colors.forEach(color => {
      if (baseColor === color || usedColors.has(color)) return;

      const distance = tinycolor.readability(baseTinyColor, tinycolor(color));
      if (distance >= proximity) {
        similarColors.push(color);
        usedColors.add(color);
      }
    });

    groupedColors.push({
      groupedColor: baseColor,
      similarColors: similarColors
    });

    usedColors.add(baseColor);
  });

  return groupedColors;
}

// Load summary.yaml and perform grouping
const proximity = 1.5; // Set your desired proximity value here

if (!fs.existsSync('summary.yaml')) {
  console.error('Error: summary.yaml not found. Please run the summary command first.');
  process.exit(1);
}

const summary = yaml.load('summary.yaml');
const uniqueColors = summary.summary.unique_colors;

const groupedColors = groupColorsByProximity(uniqueColors, proximity);

const groupedReport = {
  proximity: proximity,
  list: groupedColors,
};

const yamlContent = yaml.stringify(groupedReport, 4);
fs.writeFileSync('grouped.yaml', yamlContent, 'utf8');
console.log('Grouping by readability saved to grouped.yaml.');
