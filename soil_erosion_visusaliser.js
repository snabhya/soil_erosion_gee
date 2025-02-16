// Define visualization parameters

//Important//

//Please import the output from the process_subbasins.py script as subbasinErosion variable.

var style = ["490eff", "12f4ff", "12ff50", "e5ff12", "ff4812"];
var visParams = {
  min: 0,
  max: 7401.47, // Adjust based on your erosion range
  palette: style,
};

// Convert FeatureCollection to an Image
var erosionImage = subbasinErosion.reduceToImage({
  properties: ["Soil_Erosion"],
  reducer: ee.Reducer.mean(),
});

var className2 = ee.List([
  "Slight (<10)",
  "Moderate (10-20)",
  "High (20-30)",
  "Very high (30-40)",
  "Severe (>40)",
]);

// Add the layer to the map
Map.centerObject(subbasinErosion, 6);
Map.addLayer(erosionImage, visParams, "Soil Erosion");

var legend = ui.Panel({
  style: {
    position: "bottom-left",
    padding: "8px 15px",
  },
});

var legendTitle = ui.Label({
  value: "Soil Loss (t/hac/year)",
  style: {
    fontWeight: "bold",
    fontSize: "18px",
    margin: "0 0 4px 0",
    padding: "0",
  },
});

legend.add(legendTitle);

var makeRow = function (color, name) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: "#" + color,
      // Use padding to give the box height and width.
      padding: "8px",
      margin: "0 0 4px 0",
    },
  });

  var description = ui.Label({
    value: name,
    style: { margin: "0 0 4px 6px" },
  });

  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow("horizontal"),
  });
};

var palette = style;

var names = [
  "Slight (<10)",
  "Moderate (10-20)",
  "High (20-30)",
  "Very high (30-40)",
  "Severe (>40)",
];

// Add color and and names
for (var i = 0; i < 5; i++) {
  legend.add(makeRow(palette[i], names[i]));
}

Map.add(legend);
