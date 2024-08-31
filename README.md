
# SVG Color Grouping and Replacement Tool

This project provides a set of tools to analyze, group, and replace colors in SVG files. It allows you to standardize the color palette across multiple SVG files by grouping similar colors and replacing them with a chosen representative color.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
  - [Analyzing SVG Files](#analyzing-svg-files)
  - [Generating a Summary of Unique Colors](#generating-a-summary-of-unique-colors)
  - [Grouping Colors](#grouping-colors)
  - [Replacing Colors in SVG Files](#replacing-colors-in-svg-files)
  - [Generating a Visualization](#generating-a-visualization)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

## Overview

This tool is designed to help us manage and standardize the colors used in SVG files. By analyzing the colors, grouping similar colors, and replacing them with a consistent palette, you can maintain visual consistency across your SVG assets.

## Installation

To get started, clone this repository and install the necessary dependencies:

```bash
git clone https://github.com/valor-labs/svg-color-replacement.git
cd svg-color-replacement
npm install
```

## Usage

### Analyzing SVG Files

To analyze the SVG files and extract all color information, run the `analyze` command:

```bash
node report.js analyze --dir ./input
```

This will scan all SVG files in the specified directory (`./input` by default) and generate a `list.yaml` file containing all detected colors.

### Generating a Summary of Unique Colors

To generate a summary of all unique colors found during the analysis, run the `summary` command:

```bash
node report.js summary
```

This will create a `summary.yaml` file with a list of all unique colors.

### Grouping Colors

You can group the colors using one of the provided approaches. The `group.js` script allows you to select the approach:

```bash
node group.js [algorithm]
```

- **kmeans**: 'group-kmeans.js', Basic k-means clustering.
- **kmeanspp**: 'group-kmeansplusplus.js', K-means clustering with improved centroid initialization.
- **readability**: 'group-readability.js', Groups colors based on their perceived readability difference.
- **kmeanspp-readability**: 'group-kmeansplusplus-readability.js',
- **outlier**: 'group-outlier-detection.js',
- **hierarchical**: 'group-hierarchical.js',
- **kmeans-c2k**: 'group-kmeans-ciede2000.js',
- **kmeans-lab**: 'group-kmeans-cielab.js', <<<<<<< The best way, which worked for me. It's k-means clustering in CIELAB color space.

The grouped colors will be saved in `grouped.yaml`.


### Generating a Visualization

To visualize the color grouping, you can generate an HTML file:

```bash
node generateHtml.js
```

This will produce a `grouped.html` file that displays the grouped colors and their corresponding similar colors.

### Selecting the color replacement

You need to manually open `grouped.yaml` and add `newColor` for each group next to `groupedColor`'s with color that replaces all other colors in the group.

### Replacing Colors in SVG Files

To replace the colors in the SVG files with the grouped colors, run the `replace-colors.js` script:

```bash
node replace-colors.js
```

This script will walk through all SVG files in the `./input` directory, replace the colors according to the `grouped.yaml` file, and save the modified files to the `./output` directory, preserving the original folder structure.

## Scripts

- **report.js**: Handles the analysis and summary of colors in SVG files.
- **group.js**: Dispatches the appropriate color grouping script based on the chosen approach.
- **group-kmeans.js**: Performs k-means clustering in CIELAB space.
- **group-kmeansplusplus.js**: Performs k-means++ clustering with better centroid initialization.
- **group-readability.js**: Groups colors based on their readability difference.
- **replace-colors.js**: Replaces colors in SVG files based on the grouped colors.
- **generateHtml.js**: Generates an HTML file to visualize the grouped colors.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue if you have any suggestions or improvements.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
