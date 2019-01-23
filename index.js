var fs = require('fs');
var args = require('minimist')(process.argv.slice(2), {
    default: {
        e: false
    },
});
var jsdom = require("jsdom");
var {JSDOM} = jsdom;
const PATH = {
    src: "./svg",
    data: "./data",
    output: "./output"
}


// Loading source SVG

var source = fs.readFileSync(PATH.src + '/' + args.s, 'utf8');
var dom = new JSDOM(source);
var doc = dom.window.document;
var svgName = (args.s).replace('.svg', '');

// Data extraction from SVG to JSON

if (args.e) {
    console.log('Extracting data from ' + args.s + ' ...');
    var svgData = new Object();

    // Extracting gradients

    var allGradients = doc.querySelectorAll("linearGradient");
    var gradients = new Object();

    for (i = 0; i < allGradients.length; i++) {
        var stops = new Array();
        var j = 1;
        var allStops = allGradients[i].querySelectorAll("stop");
        while (j < (allStops.length + 1)) {
            var gradient = allGradients[i].querySelector("stop:nth-child(" + j + ")").getAttribute("stop-color");
            stops.push(gradient);
            j++;
        }
        gradients[allGradients[i].id] = stops;
    }

    if (Object.keys(gradients).length > 0) {
        svgData["gradients"] = gradients;
    }


    // Extracting colors


    var colors = new Object();
    var colorsList = new Array();

    const colorAttributes = ["fill", "stroke"];

    for (k = 0; k < colorAttributes.length; k++) {

        var allColors = doc.querySelectorAll("[" + colorAttributes[k] + "]");

        for (i = 0; i < allColors.length; i++) {
            var currColor = allColors[i].getAttribute(colorAttributes[k]);
            if (!colorsList.includes(currColor) && !currColor.includes("url")) {
                colorsList.push(currColor);
            }
        }

    }
    colorsList.sort();
    for (i = 0; i < colorsList.length; i++) {
        colors[colorsList[i]] = colorsList[i];
    }

    if (Object.keys(colors).length > 0) {
        svgData["colors"] = colors;
    }



    // Extracting fonts

    var allFonts = doc.querySelectorAll("[font-family]");
    var fonts = new Object();
    var fontsList = new Array();

    for (i = 0; i < allFonts.length; i++) {
        var currFont = allFonts[i].getAttribute("font-family");
        if (!fontsList.includes(currFont)) {
            fontsList.push(currFont);
        }
    }
    fontsList.sort();
    for (i = 0; i < fontsList.length; i++) {   
        fonts[fontsList[i]] = fontsList[i];
    }

    if (Object.keys(fonts).length > 0) {
        svgData["fonts"] = fonts;
    }


    // Extracting text

    var allText = doc.querySelectorAll("text");
    var text = new Object();
    var bug = 0;
    for (i = 0; i < allText.length; i++) {
        var lines = new Array();
        var j = 1;
        var tspan = allText[i].querySelectorAll("tspan");
        while (j < (tspan.length + 1)) {
            var line = allText[i].querySelector("tspan:nth-child(" + j + ")").textContent;
            lines.push(line);
            j++;
        }
      
        // Fix for missing IDs
      
        if (allText[i].id == "") {
          bug++;
          allText[i].id = "missing-id-" + bug;
        }
      
        text[allText[i].id] = lines;
    }
    if (Object.keys(text).length > 0) {
        svgData["text"] = text;
    }

    if (!fs.existsSync(PATH.data)){
        fs.mkdirSync(PATH.data);
    }
  
    if (bug > 0) {
      fs.writeFile(PATH.src + "/" + svgName + ".svg", '<?xml version="1.0" encoding="UTF-8"?>' + "\n" +  dom.window.document.querySelector("body").innerHTML, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("Source file was replaced, fixed " + bug + " missing IDs.");
      });
    }
  
  
    fs.writeFile(PATH.data + '/' + svgName + ".json", JSON.stringify(svgData, null, 4), function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("Data extraction was successful!");
    });

    return;
}



// Replacing with JSON data

console.log('Replacing data of ' + args.s + ' ...');

var file = fs.readFileSync('data/' + svgName + '.json', 'utf8');
var data = JSON.parse(file);

// Replacing colors

var cl = Object.keys(data.colors);
 
for (i = 0; i < cl.length; i++) {
    var fill = 'fill="' + cl[i] + '"';
    var stroke = 'stroke="' + cl[i] + '"';
    source = source.split(fill).join('fill="' + data.colors[cl[i]] + '"');
    source = source.split(stroke).join('stroke="' + data.colors[cl[i]] + '"');
}

// Replacing fonts

var fl = Object.keys(data.fonts);
 
for (i = 0; i < fl.length; i++) {
    var fontOld = 'font-family="' + fl[i] + '"'
    var fontNew = 'font-family="' + data.fonts[fl[i]] + '"'
    source = source.split(fontOld).join(fontNew);
}

var dom = new JSDOM(source);
var doc = dom.window.document;

// Replacing gradients

var tl = Object.keys(data.gradients);

for (i = 0; i < tl.length; i++) {
    var id = tl[i];
    var value = data.gradients[id];
    var j = 0;
    while (j < value.length) {
        j++;
        var selector = "linearGradient[id='" + id + "'] stop:nth-child(" + j + ")";
        doc.querySelector(selector).setAttribute('stop-color', value[j - 1]);
    }
}

// Replacing text

var tl = Object.keys(data.text);

for (i = 0; i < tl.length; i++) {
    var id = tl[i];
    var value = data.text[id];
    var j = 0;
    while (j < value.length) {
        j++; 
        var selector = "text[id='" + id + "'] tspan:nth-child(" + j + ")";
        doc.querySelector(selector).textContent = value[j - 1];
    }
}





// Writing to file

if (!fs.existsSync(PATH.output)){
    fs.mkdirSync(PATH.output);
}

fs.writeFile(PATH.output + "/" + svgName + "-new.svg", '<?xml version="1.0" encoding="UTF-8"?>' + "\n" + dom.window.document.querySelector("body").innerHTML, function (err) {
    if (err) {
        return console.log(err);
    }
    console.log("The file was saved!");
});