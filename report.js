const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('yamljs');
const { JSDOM } = require('jsdom');

// Function to extract colors from a single SVG file
function extractColorsFromSvg(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const dom = new JSDOM(content);
  const document = dom.window.document;
  const colorReport = [];
  const uniqueColors = new Set();

  // Find all elements with color-related properties
  const elements = document.querySelectorAll('[fill], [stroke], [stop-color], [flood-color], [lighting-color], [color]');
  elements.forEach(element => {
    const tag = element.tagName.toLowerCase();
    const colorProps = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'color'];
    const colors = [];

    colorProps.forEach(prop => {
      const value = element.getAttribute(prop);
      if (value) {
        colors.push({ prop, value });
        uniqueColors.add(value);
      }
    });

    if (colors.length > 0) {
      colorReport.push({
        tag: tag,
        colors: colors
      });
    }
  });

  return colorReport.length > 0 ? { filename: filePath, colors: colorReport, uniqueColors: Array.from(uniqueColors) } : null;
}

// Function to find all SVG files in specified directories
function findSvgFiles(directories) {
  const svgFiles = [];
  directories.forEach(dir => {
    svgFiles.push(...glob.sync(`${dir}/**/*.svg`));
  });
  return svgFiles;
}

// Main function to generate the YAML report
function generateYamlReport(directories, outputPath) {
  const svgFiles = findSvgFiles(directories);
  const report = {
    list: [],
    summary: {
      unique_colors: []
    }
  };

  const globalUniqueColors = new Set();

  svgFiles.forEach(filePath => {
    const colorsReport = extractColorsFromSvg(filePath);
    if (colorsReport) {
      report.list.push({
        filename: colorsReport.filename,
        colors: colorsReport.colors
      });
      colorsReport.uniqueColors.forEach(color => globalUniqueColors.add(color));
    }
  });

  report.summary.unique_colors = Array.from(globalUniqueColors);

  // Convert report to YAML and save to file
  const yamlContent = yaml.stringify(report, 4);
  fs.writeFileSync(outputPath, yamlContent, 'utf8');
  console.log(`YAML report generated at ${outputPath}`);
}

// Example usage
const directoriesToSearch = ['working']; // Replace with your directories
const outputPath = 'output.yaml'; // Replace with your desired output file path

generateYamlReport(directoriesToSearch, outputPath);
