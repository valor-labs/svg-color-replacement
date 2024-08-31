const fs = require('fs');
const yaml = require('yamljs');

function generateHtml(groupedData, outputFile) {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Color Grouping Visualization</title>
    <style>
        body { padding: 2rem;}
        #color-groups { display: flex; gap: 1rem; }
        #color-groups ul { margin-top: 2rem; }
        ul { list-style-type: none; padding: 0; }
        li { margin-bottom: 10px; }
        div { padding: 10px; color: white; font-family: Arial, sans-serif; width: 100px; margin-bottom: 1rem; text-shadow: 0px 0px 3px rgba(0, 0, 0, 1); }
    </style>
</head>
<body>
    <h1>Color Grouping Visualization</h1>
    <ul id="color-groups"></ul>

    <script>
        const groupedData = ${JSON.stringify(groupedData, null, 4)};
        
        function createColorDiv(color) {
            const div = document.createElement('div');
            div.style.backgroundColor = color;
            div.textContent = color;
            return div;
        }

        function renderGroupedColors(data) {
            const ul = document.getElementById('color-groups');

            data.forEach(group => {
                const li = document.createElement('li');
                const mainColorDiv = createColorDiv(group.groupedColor);
                const newColorDiv = createColorDiv(group.newColor);
                li.appendChild(mainColorDiv);
                li.appendChild(newColorDiv);

                const subUl = document.createElement('ul');
                group.similarColors.forEach(similarColor => {
                    const subLi = document.createElement('li');
                    const similarColorDiv = createColorDiv(similarColor);
                    subLi.appendChild(similarColorDiv);
                    subUl.appendChild(subLi);
                });

                li.appendChild(subUl);
                ul.appendChild(li);
            });
        }

        renderGroupedColors(groupedData.list);
    </script>
</body>
</html>
  `;

  fs.writeFileSync(outputFile, htmlContent, 'utf8');
  console.log(`HTML file generated at ${outputFile}`);
}

// Load grouped.yaml and generate HTML
const groupedYamlPath = 'grouped.yaml';
const outputHtmlPath = 'grouped.html';

if (!fs.existsSync(groupedYamlPath)) {
  console.error('Error: grouped.yaml not found. Please run the group command first.');
  process.exit(1);
}

const groupedData = yaml.load(groupedYamlPath);
generateHtml(groupedData, outputHtmlPath);
