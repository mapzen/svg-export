# Export Tool for Vector Tiles to SVG

⚠️ Mapzen is not currently supporting this code. ⚠️

We may not be able to answer questions about `svg-export`. If you’re looking for an active project with SVG exporting functionality for Mapzen Vector Tiles, please check out https://github.com/hanbyul-here/svg-exporter for an excellent alternative.

----

This is a tool for taking vector tile data and exporting it to an SVG file. 

Live demo is available here: http://mapzen.github.io/svg-export/

## Installation

Clone the repo, and then start a local webserver to view the map tiles
```
python -m SimpleHTTPServer
```

## Usage

You can zoom and pan the map, as well as using the search bar to center the map on a location.

Beneath the search box is a list of layers that are available in the map data. Please note, not all layers might contain data for your current map view. You can toggle layers on and off.

Once a layer is loaded on the page, a list of feature types will appear beneath the layer name. You can toggle those options as well. The point of these feature types is to minimize the amount of map data that you will be saving to your SVG file.

## Export

Once you have finished tweaking your map, click the export button on top to download an SVG file. Two important things are going on here:

1. The SVG file reorganizes the page's data and groups it by layer and feature type, instead of by map tile. This will group all features of the same type in one `<g>`, thus making it easier to style and manipulate in other programs (such as Adobe Illustrator)

2. The SVG file is inlining all CSS styles, such that the file you open in a graphical editing program will match the same styles as on screen. It even takes care of inline CSS styles, such as live-edits to the page via a web inspector.

## To Do

Possible futures for this tool include
* GUI editing for colors and line-widths
* Selectable areas for export, instead of the entire page
