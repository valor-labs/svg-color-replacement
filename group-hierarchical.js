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

// Perform hierarchical clustering
function hierarchicalClustering(colors) {
  const clusters = colors.map(color => [color]);

  while (clusters.length > 1) {
    let minDistance = Infinity;
    let closestPair = [0, 1];

    // Find the closest pair of clusters
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const distance = calculateDistanceBetweenClusters(clusters[i], clusters[j]);
        if (distance < minDistance) {
          minDistance = distance;
          closestPair = [i, j];
        }
      }
    }

    // Merge the closest pair
    const [i, j] = closestPair;
    const mergedCluster = clusters[i].concat(clusters[j]);
    clusters.splice(j, 1);
    clusters.splice(i, 1, mergedCluster);
  }

  return clusters[0];
}

// Calculate the distance between two clusters (using average linkage)
function calculateDistanceBetweenClusters(cluster1, cluster2) {
  let totalDistance = 0;

  cluster1.forEach(color1 => {
    cluster2.forEach(color2 => {
      totalDistance += calculateDistance(color1, color2);
    });
  });

  return totalDistance / (cluster1.length * cluster2.length);
}

// Flatten the hierarchy to get the final clusters
function flattenClusters(hierarchy, targetClusterCount) {
  const clusters = [...hierarchy];

  while (clusters.length > targetClusterCount) {
    let minDistance = Infinity;
    let closestPair = [0, 1];

    // Find the closest pair of clusters
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const distance = calculateDistanceBetweenClusters(clusters[i], clusters[j]);
        if (distance < minDistance) {
          minDistance = distance;
          closestPair = [i, j];
        }
      }
    }

    // Merge the closest pair
    const [i, j] = closestPair;
    const mergedCluster = clusters[i].concat(clusters[j]);
    clusters.splice(j, 1);
    clusters.splice(i, 1, mergedCluster);
  }

  return clusters;
}

// Load summary.yaml and perform hierarchical clustering
if (!fs.existsSync('summary.yaml')) {
  console.error('Error: summary.yaml not found. Please run the summary command first.');
  process.exit(1);
}

const summary = yaml.load('summary.yaml');
const uniqueColors = summary.summary.unique_colors.map(colorToRGBArray);

const targetClusterCount = 15; // Adjust this as needed

// Perform hierarchical clustering and flatten the result
const hierarchy = hierarchicalClustering(uniqueColors);
const finalClusters = flattenClusters([hierarchy], targetClusterCount);

// Convert clusters back to hex format and pick a representative color for each cluster
const groupedColors = finalClusters.map(cluster => ({
  groupedColor: rgbArrayToHex(cluster[Math.floor(Math.random() * cluster.length)]), // Pick a random color as representative
  similarColors: cluster.map(rgbArrayToHex),
}));

const groupedReport = {
  groups: targetClusterCount,
  list: groupedColors,
};

const yamlContent = yaml.stringify(groupedReport, 4);
fs.writeFileSync('grouped.yaml', yamlContent, 'utf8');
console.log('Grouping by hierarchical clustering saved to grouped.yaml.');
