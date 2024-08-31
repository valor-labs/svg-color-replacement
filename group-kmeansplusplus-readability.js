const fs = require('fs');
const yaml = require('yamljs');
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

// Calculate the distance between two colors using tinycolor.readability
function calculateDistance(color1, color2) {
  const color1Hex = tinycolor({ r: color1[0], g: color1[1], b: color1[2] }).toHexString();
  const color2Hex = tinycolor({ r: color2[0], g: color2[1], b: color2[2] }).toHexString();
  // readability gives a higher value for greater contrast, so we use the inverse
  return 1 / tinycolor.readability(color1Hex, color2Hex);
}

// K-means++ Initialization with readability-based distance
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
function kMeans(colors, k, maxIterations = 1000) {
  let centroids = kMeansPlusPlusInitialization(colors, k);
  let oldCentroids;
  let clusters = new Array(k).fill().map(() => []);
  let iterations = 0;

  while (JSON.stringify(centroids) !== JSON.stringify(oldCentroids) && iterations < maxIterations) {
    oldCentroids = JSON.parse(JSON.stringify(centroids));
    clusters = new Array(k).fill().map(() => []);
    
    colors.forEach(color => {
      const closestCentroidIndex = findClosestCentroid(color, centroids);
      clusters[closestCentroidIndex].push(color);
    });

    centroids = clusters.map(cluster => {
      const clusterLength = cluster.length;
      if (clusterLength === 0) return [0, 0, 0];

      const sum = cluster.reduce(
        (acc, color) => [acc[0] + color[0], acc[1] + color[1], acc[2] + color[2]],
        [0, 0, 0]
      );

      return [Math.round(sum[0] / clusterLength), Math.round(sum[1] / clusterLength), Math.round(sum[2] / clusterLength)];
    });

    iterations++;
  }

  return { centroids, clusters };
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

// Load summary.yaml and perform grouping
if (!fs.existsSync('summary.yaml')) {
  console.error('Error: summary.yaml not found. Please run the summary command first.');
  process.exit(1);
}

const summary = yaml.load('summary.yaml');
const uniqueColors = summary.summary.unique_colors.map(colorToRGBArray);

const numberOfGroups = 10; // You can adjust this as needed
const { centroids, clusters } = kMeans(uniqueColors, numberOfGroups);

const groupedColors = centroids.map((centroid, index) => ({
  groupedColor: rgbArrayToHex(centroid),
  similarColors: clusters[index].map(rgbArrayToHex),
}));

const groupedReport = {
  groups: numberOfGroups,
  list: groupedColors,
};

const yamlContent = yaml.stringify(groupedReport, 4);
fs.writeFileSync('grouped.yaml', yamlContent, 'utf8');
console.log('Grouping by k-means++ with readability saved to grouped.yaml.');
