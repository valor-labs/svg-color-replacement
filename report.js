#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('yamljs');
const { JSDOM } = require('jsdom');
const commander = require('commander');
const tinycolor = require('tinycolor2');

const program = new commander.Command();

function extractColorsFromSvg(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const dom = new JSDOM(content);
  const document = dom.window.document;
  const colorReport = [];

  const elements = document.querySelectorAll('[fill], [stroke], [stop-color], [flood-color], [lighting-color], [color]');
  elements.forEach(element => {
    const tag = element.tagName.toLowerCase();
    const colorProps = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'color'];
    const colors = [];

    colorProps.forEach(prop => {
      const value = element.getAttribute(prop);
      if (value) {
        colors.push({ prop, value });
      }
    });

    if (colors.length > 0) {
      colorReport.push({
        tag: tag,
        colors: colors
      });
    }
  });

  return colorReport.length > 0 ? { filename: filePath, colors: colorReport } : null;
}

function findSvgFiles(directory) {
  return glob.sync(`${directory}/**/*.svg`);
}

// Command: analyze
program
  .command('analyze')
  .description('Collect colors from SVG files and generate a list.yaml report.')
  .option('--dir <directory>', 'Directory to search for SVG files')
  .action((options) => {
    const directory = options.dir || '.';
    const svgFiles = findSvgFiles(directory);
    const report = {
      list: []
    };

    svgFiles.forEach(filePath => {
      const colorsReport = extractColorsFromSvg(filePath);
      if (colorsReport) {
        report.list.push(colorsReport);
      }
    });

    const yamlContent = yaml.stringify(report, 4);
    fs.writeFileSync('list.yaml', yamlContent, 'utf8');
    console.log('Colors analyzed and list.yaml generated.');
  });

// Command: summary
program
  .command('summary')
  .description('Generate a summary of unique colors from list.yaml')
  .action(() => {
    if (!fs.existsSync('list.yaml')) {
      console.error('Error: list.yaml not found. Please run the analyze command first.');
      process.exit(1);
    }

    const report = yaml.load('list.yaml');
    const globalUniqueColors = new Set();

    report.list.forEach(fileReport => {
      fileReport.colors.forEach(colorGroup => {
        colorGroup.colors.forEach(color => {
          globalUniqueColors.add(color.value);
        });
      });
    });

    const summary = {
      summary: {
        unique_colors: Array.from(globalUniqueColors)
      }
    };

    const yamlContent = yaml.stringify(summary, 4);
    fs.writeFileSync('summary.yaml', yamlContent, 'utf8');
    console.log('Summary generated and saved to summary.yaml.');
  });


  
// Function to group colors by proximity
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

// Command: group
program
  .command('group')
  .description('Group colors based on proximity')
  .option('--proximity <value>', 'Proximity value for grouping', parseFloat)
  .action((options) => {
    const proximity = options.proximity || 1.0;

    if (!fs.existsSync('summary.yaml')) {
      console.error('Error: summary.yaml not found. Please run the summary command first.');
      process.exit(1);
    }

    const summary = yaml.load('summary.yaml');
    const uniqueColors = summary.summary.unique_colors;

    const groupedColors = groupColorsByProximity(uniqueColors, proximity);

    const groupedReport = {
      proximity: {
        value: proximity,
        list: groupedColors
      }
    };

    const yamlContent = yaml.stringify(groupedReport, 4);
    fs.writeFileSync('grouped.yaml', yamlContent, 'utf8');
    console.log('Colors grouped by proximity and saved to grouped.yaml.');
  });

program.parse(process.argv);
