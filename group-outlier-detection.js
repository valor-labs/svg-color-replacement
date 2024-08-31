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

// Calculate the Euclidean distance between two RGB colors
function calculateDistance(color1, color2) {
  const [r1, g1, b1] = color1;
  const [r2, g2, b2] = color2;
  return Math.sqrt(
    Math.pow(r2 - r1, 2) +
    Math.pow(g2 - g1, 2) +
    Math.pow(b2 - b1, 2)
  );
}

// K-means++ Initialization
function kMeansPlusPlusInitialization(colors, k) {
  const centroids = [];
  centroids.push(colors[Math.floor(Math.random() * colors.length)]);

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
function kMeans(colors, k, maxIterations = 10000) {
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

// Identify and handle outliers
function handleOutliers(colors, centroids, clusters, threshold) {
  const outliers = [];

  clusters.forEach((cluster, index) => {
    cluster.forEach(color => {
      const distance = calculateDistance(color, centroids[index]);
      if (distance > threshold) {
        outliers.push({ color, clusterIndex: index });
      }
    });
  });

  // Process outliers: Reassign them or put them in a separate cluster
  outliers.forEach(({ color, clusterIndex }) => {
    clusters[clusterIndex] = clusters[clusterIndex].filter(c => c !== color);
    const closestCentroidIndex = findClosestCentroid(color, centroids);
    if (calculateDistance(color, centroids[closestCentroidIndex]) <= threshold) {
      clusters[closestCentroidIndex].push(color);
    } else {
      clusters.push([color]);
    }
  });

  return clusters;
}

// Load summary.yaml and perform grouping
if (!fs.existsSync('summary.yaml')) {
  console.error('Error: summary.yaml not found. Please run the summary command first.');
  process.exit(1);
}

const summary = yaml.load('summary.yaml');
const uniqueColors = summary.summary.unique_colors.map(colorToRGBArray);

const numberOfGroups = 15; // You can adjust this as needed
const threshold = 150; // Define the threshold for identifying outliers

const { centroids, clusters } = kMeans(uniqueColors, numberOfGroups);

// Handle outliers in the clusters
const finalClusters = handleOutliers(uniqueColors, centroids, clusters, threshold);

const groupedColors = centroids.map((centroid, index) => ({
  groupedColor: rgbArrayToHex(centroid),
  similarColors: (finalClusters[index] || []).map(rgbArrayToHex),
}));

const groupedReport = {
  groups: numberOfGroups,
  list: groupedColors.filter(group => group.similarColors.length > 0),
};

const yamlContent = yaml.stringify(groupedReport, 4);
fs.writeFileSync('grouped.yaml', yamlContent, 'utf8');
console.log('Grouping with outlier detection saved to grouped.yaml.');
