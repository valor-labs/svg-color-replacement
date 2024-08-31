const fs = require('fs');
const yaml = require('yamljs');
const colorConvert = require('color-convert');

// Convert a hex color to an LAB array
function hexToLAB(hex) {
  const rgb = colorConvert.hex.rgb(hex);
  return colorConvert.rgb.lab(rgb);
}

// Convert an LAB array back to a hex color
function labToHex(lab) {
  const rgb = colorConvert.lab.rgb(lab);
  return colorConvert.rgb.hex(rgb);
}

// Calculate the distance between two LAB colors
function calculateDistance(lab1, lab2) {
  return Math.sqrt(
    Math.pow(lab1[0] - lab2[0], 2) +
    Math.pow(lab1[1] - lab2[1], 2) +
    Math.pow(lab1[2] - lab2[2], 2)
  );
}

// Perform k-means clustering in LAB space
function groupColorsByKMeansLAB(colors, numberOfGroups) {
  const labColors = colors.map(hexToLAB);

  // Initialize centroids by randomly selecting colors
  let centroids = labColors.slice(0, numberOfGroups);

  let clusters = new Array(numberOfGroups).fill().map(() => []);
  let oldCentroids;
  
  while (JSON.stringify(centroids) !== JSON.stringify(oldCentroids)) {
    oldCentroids = JSON.parse(JSON.stringify(centroids));

    // Clear previous clusters
    clusters = new Array(numberOfGroups).fill().map(() => []);
    
    // Assign each color to the nearest centroid
    labColors.forEach((color, index) => {
      let minDistance = Infinity;
      let clusterIndex = -1;

      centroids.forEach((centroid, i) => {
        const distance = calculateDistance(color, centroid);
        if (distance < minDistance) {
          minDistance = distance;
          clusterIndex = i;
        }
      });

      clusters[clusterIndex].push(index);
    });

    // Recalculate centroids
    centroids = clusters.map(cluster => {
      if (cluster.length === 0) return oldCentroids[clusters.indexOf(cluster)];

      const sum = cluster.reduce(
        (acc, colorIndex) => {
          const color = labColors[colorIndex];
          return [acc[0] + color[0], acc[1] + color[1], acc[2] + color[2]];
        },
        [0, 0, 0]
      );

      return [sum[0] / cluster.length, sum[1] / cluster.length, sum[2] / cluster.length];
    });
  }

  // Create grouped colors report
  const groupedColors = centroids.map((centroid, index) => {
    const groupedColor = `#${labToHex(centroid)}`;
    const similarColors = clusters[index].map(colorIndex => colors[colorIndex]);

    return {
      groupedColor: groupedColor,
      similarColors: similarColors
    };
  });

  return groupedColors;
}

// Load summary.yaml and perform grouping
const numberOfGroups = 6; // Set your desired number of groups here

if (!fs.existsSync('summary.yaml')) {
  console.error('Error: summary.yaml not found. Please run the summary command first.');
  process.exit(1);
}

const summary = yaml.load('summary.yaml');
const uniqueColors = summary.summary.unique_colors;

const groupedColors = groupColorsByKMeansLAB(uniqueColors, numberOfGroups);

const groupedReport = {
  groups: numberOfGroups,
  list: groupedColors,
};

const yamlContent = yaml.stringify(groupedReport, 4);
fs.writeFileSync('grouped.yaml', yamlContent, 'utf8');
console.log(`Grouping by k-means in CIELAB space saved to grouped.yaml.`);
