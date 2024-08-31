#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('yamljs');
const { JSDOM } = require('jsdom');
const commander = require('commander');

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


  
  
  const tinycolor = require('tinycolor2');

  // Convert a color to an RGB array
  function colorToRGBArray(color) {
    const tc = tinycolor(color);
    const rgb = tc.toRgb();
    return [rgb.r, rgb.g, rgb.b];
  }
  
  // Convert an RGB array back to a hex color
  function rgbArrayToHex(rgbArray) {
    return tinycolor({ r: rgbArray[0], g: rgbArray[1], b: rgbArray[2] }).toHexString();
  }
  
  // Calculate the distance between two RGB colors
  function calculateDistance(color1, color2) {
    const [r1, g1, b1] = color1;
    const [r2, g2, b2] = color2;
    return Math.sqrt(
      Math.pow(r2 - r1, 2) +
      Math.pow(g2 - g1, 2) +
      Math.pow(b2 - b1, 2)
    );
  }
  
  // Find the closest centroid for a given color
  function findClosestCentroid(color, centroids) {
    let minDistance = Infinity;
    let closestCentroidIndex = -1;
  
    centroids.forEach((centroid, index) => {
      const distance = calculateDistance(color, centroid);
      if (distance < minDistance) {
        minDistance = distance;
        closestCentroidIndex = index;
      }
    });
  
    return closestCentroidIndex;
  }

  // Function to select initial centroids using k-means++ method
function kMeansPlusPlusInitialization(colors, k) {
  const centroids = [];
  // Step 1: Choose the first centroid randomly
  centroids.push(colors[Math.floor(Math.random() * colors.length)]);

  // Step 2: Choose subsequent centroids based on a probability proportional to the distance from the closest centroid
  for (let i = 1; i < k; i++) {
    const distances = colors.map(color => {
      const closestCentroidDistance = Math.min(
        ...centroids.map(centroid => calculateDistance(color, centroid))
      );
      return closestCentroidDistance;
    });

    const totalDistance = distances.reduce((sum, d) => sum + d, 0);
    const probabilities = distances.map(d => d / totalDistance);

    let cumulativeProbability = 0;
    const rand = Math.random();
    for (let j = 0; j < colors.length; j++) {
      cumulativeProbability += probabilities[j];
      if (rand < cumulativeProbability) {
        centroids.push(colors[j]);
        break;
      }
    }
  }

  return centroids;
}
  
// Perform k-means clustering with k-means++ initialization
function kMeans(colors, k) {
  // Initialize centroids using k-means++
  let centroids = kMeansPlusPlusInitialization(colors, k);

  let oldCentroids;
  let clusters = new Array(k).fill().map(() => []);

  while (JSON.stringify(centroids) !== JSON.stringify(oldCentroids)) {
    oldCentroids = JSON.parse(JSON.stringify(centroids));

    // Step 2: Assign each color to the nearest centroid
    clusters = new Array(k).fill().map(() => []);
    colors.forEach(color => {
      const closestCentroidIndex = findClosestCentroid(color, centroids);
      clusters[closestCentroidIndex].push(color);
    });

    // Step 3: Recalculate the centroids
    centroids = clusters.map(cluster => {
      const clusterLength = cluster.length;
      if (clusterLength === 0) return [0, 0, 0];

      const sum = cluster.reduce(
        (acc, color) => [acc[0] + color[0], acc[1] + color[1], acc[2] + color[2]],
        [0, 0, 0]
      );

      return [Math.round(sum[0] / clusterLength), Math.round(sum[1] / clusterLength), Math.round(sum[2] / clusterLength)];
    });
  }

  return { centroids, clusters };
}
  
  // Function to group colors by proximity using k-means clustering
  function groupColorsByProximity(colors, numberOfGroups) {
    const colorData = colors.map(color => colorToRGBArray(color));
    const { centroids, clusters } = kMeans(colorData, numberOfGroups);
    const groupedColors = [];
  
    centroids.forEach((centroid, index) => {
      const groupedColor = rgbArrayToHex(centroid);
      const similarColors = clusters[index].map(rgbArrayToHex);
  
      groupedColors.push({
        groupedColor: groupedColor,
        similarColors: similarColors
      });
    });
  
    return groupedColors;
  }
  
  // Command: group
  program
    .command('group')
    .description('Group colors based on proximity and reduce to a specified number of groups')
    .option('--groups <number>', 'Number of color groups', parseInt)
    .action((options) => {
      const numberOfGroups = options.groups || 10;
  
      if (!fs.existsSync('summary.yaml')) {
        console.error('Error: summary.yaml not found. Please run the summary command first.');
        process.exit(1);
      }
  
      const summary = yaml.load('summary.yaml');
      const uniqueColors = summary.summary.unique_colors;
  
      const groupedColors = groupColorsByProximity(uniqueColors, numberOfGroups);
  
      const groupedReport = {
        groups: numberOfGroups,
        list: groupedColors
      };
  
      const yamlContent = yaml.stringify(groupedReport, 4);
      fs.writeFileSync('grouped.yaml', yamlContent, 'utf8');
      console.log(`Colors grouped into ${numberOfGroups} groups and saved to grouped.yaml.`);
    });
  




program.parse(process.argv);
