const fs = require('fs');
const yaml = require('yamljs');
const tinycolor = require('tinycolor2');

// Convert a color to an RGB array
function rgbToLab(rgb) {
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  const fx = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
  const fy = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
  const fz = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116);

  const lab_l = (116 * fy) - 16;
  const lab_a = 500 * (fx - fy);
  const lab_b = 200 * (fy - fz);

  return [lab_l, lab_a, lab_b];
}

// Convert an RGB array back to a hex color
function rgbArrayToHex(rgbArray) {
  return tinycolor({ r: rgbArray[0], g: rgbArray[1], b: rgbArray[2] }).toHexString();
}

// Calculate the CIEDE2000 color difference
function calculateCIEDE2000(color1, color2) {
  const lab1 = rgbToLab(color1);
  const lab2 = rgbToLab(color2);

  const deltaL = lab1[0] - lab2[0];
  const lAvg = (lab1[0] + lab2[0]) / 2;

  const c1 = Math.sqrt(Math.pow(lab1[1], 2) + Math.pow(lab1[2], 2));
  const c2 = Math.sqrt(Math.pow(lab2[1], 2) + Math.pow(lab2[2], 2));
  const cAvg = (c1 + c2) / 2;

  const deltaC = c1 - c2;

  const a1Prime = lab1[1] + lab1[1] / 2 * (1 - Math.sqrt(Math.pow(cAvg, 7) / (Math.pow(cAvg, 7) + Math.pow(25, 7))));
  const a2Prime = lab2[1] + lab2[1] / 2 * (1 - Math.sqrt(Math.pow(cAvg, 7) / (Math.pow(cAvg, 7) + Math.pow(25, 7))));

  const c1Prime = Math.sqrt(Math.pow(a1Prime, 2) + Math.pow(lab1[2], 2));
  const c2Prime = Math.sqrt(Math.pow(a2Prime, 2) + Math.pow(lab2[2], 2));
  const cPrimeAvg = (c1Prime + c2Prime) / 2;

  const deltaCPrime = c1Prime - c2Prime;

  let h1Prime = Math.atan2(lab1[2], a1Prime);
  if (h1Prime < 0) h1Prime += 2 * Math.PI;

  let h2Prime = Math.atan2(lab2[2], a2Prime);
  if (h2Prime < 0) h2Prime += 2 * Math.PI;

  let deltaHPrime = h2Prime - h1Prime;
  if (Math.abs(deltaHPrime) > Math.PI) {
    if (h2Prime <= h1Prime) deltaHPrime += 2 * Math.PI;
    else deltaHPrime -= 2 * Math.PI;
  }

  deltaHPrime = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(deltaHPrime / 2);

  const hPrimeAvg = (Math.abs(h1Prime - h2Prime) > Math.PI) ? (h1Prime + h2Prime + 2 * Math.PI) / 2 : (h1Prime + h2Prime) / 2;

  const t = 1 - 0.17 * Math.cos(hPrimeAvg - Math.PI / 6) + 0.24 * Math.cos(2 * hPrimeAvg) + 0.32 * Math.cos(3 * hPrimeAvg + Math.PI / 30) - 0.20 * Math.cos(4 * hPrimeAvg - 63 * Math.PI / 180);

  const deltaTheta = 30 * Math.exp(-Math.pow((hPrimeAvg - 275 * Math.PI / 180) / (25 * Math.PI / 180), 2));
  const rc = 2 * Math.sqrt(Math.pow(cPrimeAvg, 7) / (Math.pow(cPrimeAvg, 7) + Math.pow(25, 7)));
  const sl = 1 + ((0.015 * Math.pow(lAvg - 50, 2)) / Math.sqrt(20 + Math.pow(lAvg - 50, 2)));
  const sc = 1 + 0.045 * cPrimeAvg;
  const sh = 1 + 0.015 * cPrimeAvg * t;

  const rt = -Math.sin(2 * deltaTheta) * rc;

  const deltaE = Math.sqrt(Math.pow(deltaL / sl, 2) + Math.pow(deltaCPrime / sc, 2) + Math.pow(deltaHPrime / sh, 2) + rt * (deltaCPrime / sc) * (deltaHPrime / sh));

  return deltaE;
}

// K-means++ Initialization using CIEDE2000
function kMeansPlusPlusInitialization(colors, k) {
  const centroids = [];
  centroids.push(colors[Math.floor(Math.random() * colors.length)]);

  for (let i = 1; i < k; i++) {
    const distances = colors.map(color => {
      const closestCentroidDistance = Math.min(
        ...centroids.map(centroid => calculateCIEDE2000(color, centroid))
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

// Perform k-means clustering with k-means++ initialization using CIEDE2000
function kMeans(colors, k, maxIterations = 100) {
  let centroids = kMeansPlusPlusInitialization(colors, k);

  centroids = [...new Set(centroids.map(c => JSON.stringify(c)))].map(c => JSON.parse(c));

  if (centroids.length < k) {
    throw new Error(`Failed to initialize ${k} unique centroids. Only ${centroids.length} unique centroids found.`);
  }

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

// Find the closest centroid for a given color using CIEDE2000
function findClosestCentroid(color, centroids) {
  let minDistance = Infinity;
  let closestCentroidIndex = -1;

  centroids.forEach((centroid, index) => {
    const distance = calculateCIEDE2000(color, centroid);
    if (distance < minDistance && distance !== 0) {
      minDistance = distance;
      closestCentroidIndex = index;
    }
  });

  // Fallback to a random centroid if no valid one is found
  if (closestCentroidIndex === -1) {
    console.warn("No valid centroid found, falling back to a random centroid.");
    closestCentroidIndex = Math.floor(Math.random() * centroids.length);
  }

  return closestCentroidIndex;
}

// Load summary.yaml and perform grouping
if (!fs.existsSync('summary.yaml')) {
  console.error('Error: summary.yaml not found. Please run the summary command first.');
  process.exit(1);
}

const summary = yaml.load('summary.yaml');
const uniqueColors = summary.summary.unique_colors.map(color => tinycolor(color).toRgb());

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
console.log('Grouping by k-means with CIEDE2000 saved to grouped.yaml.');
